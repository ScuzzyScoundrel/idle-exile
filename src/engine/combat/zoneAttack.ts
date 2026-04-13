// ============================================================
// Zone Attack — per-mob attack timers + passive regen (non-skill ticks)
// Extracted from combat/tick.ts (Phase D3)
// ============================================================

import type { GameState, CombatTickResult, ResolvedStats, CombatPhase, ZoneDef } from '../../types';
import { resolveStats } from '../character';
import {
  rollZoneAttack,
  applyAbilityResists,
  calcLevelDamageMult,
  calcZoneAccuracy,
} from '../zones';
import {
  ZONE_ATTACK_INTERVAL,
  ZONE_DMG_BASE,
  ZONE_DMG_ILVL_SCALE,
  MAX_REGEN_CAP_RATIO,
  DEATH_STREAK_WINDOW,
  MOB_CRIT_CHANCE,
  MOB_CRIT_MULTIPLIER,
  INVASION_DIFFICULTY_MULT,
} from '../../data/balance';
import { spawnPack } from '../packs';
import { pickCurrentMob } from '../zones/helpers';
import { getMobTypeDef } from '../../data/mobTypes';
import { isZoneInvaded } from '../invasions';
import type { TempBuff } from '../../types';
import {
  tickDebuffDoT,
  calcEnemyDebuffMods,
  calcBleedTriggerDamage,
  calcFortifyDR,
  getFullEffect,
  mergeProcTempBuff,
  applyDebuffToList,
} from './helpers';
import type { CombatTickOutput } from './types';
import { noResult } from './types';
import { evaluateProcs } from '../combatHelpers';
import { createComboState, COMBO_STATE_CREATORS } from './combo';
import { getUnifiedSkillDef } from '../../data/skills';
import { getSkillGraphModifier } from '../unifiedSkills';
import { absorbDamage } from './minions';

/**
 * Apply zone per-hit attacks + passive regen during normal clearing.
 * Per-mob: each mob attacks independently, each has own debuffs/regen.
 * Called on non-skill ticks (GCD not ready) during clearing phase.
 * Returns merged patch + result instead of calling set().
 */
export function applyZoneDamage(
  state: GameState,
  dt: number,
  now: number,
  zone: ZoneDef,
): CombatTickOutput {
  if (state.combatPhase !== 'clearing') return { patch: {}, result: noResult };
  let playerHp = state.currentHp;
  let zoneAttackResult: CombatTickResult['zoneAttack'] = null;
  let helperBleedDmg = 0;
  let helperDotDamage = 0;
  const updatedMobs = state.packMobs.map(m => ({ ...m, debuffs: [...m.debuffs] }));
  const packSize = updatedMobs.length;
  // Per-mob damage scaling: divide per-mob zone damage by sqrt(packSize)
  const packDmgScale = packSize > 1 ? 1 / Math.sqrt(packSize) : 1;

  // --- Per-mob attack timers ---
  let currentDodgeEntropy = state.dodgeEntropy;
  let anyAttacked = false;
  let currentEs = state.currentEs;
  for (const mob of updatedMobs) {
    if (mob.nextAttackAt <= 0 || now < mob.nextAttackAt) continue;
    anyAttacked = true;
    const mobEnemyMods = calcEnemyDebuffMods(mob.debuffs);

    // Bleed trigger: mob attacked (hit or miss — mob still swung)
    const mobBleedDmg = calcBleedTriggerDamage(mob.debuffs, 1, resolveStats(state.character).incDoTDamage);
    if (mobBleedDmg > 0) {
      mob.hp = Math.max(0, mob.hp - mobBleedDmg);
      helperBleedDmg += mobBleedDmg;
    }

    // Rare mob attack speed multiplier (Frenzied)
    const mobRareAtkMult = mob.rare?.combinedAtkSpeedMult ?? 1;

    // Miss chance from debuffs (e.g. Blinded)
    if (Math.random() * 100 < mobEnemyMods.missChance) {
      if (!zoneAttackResult) zoneAttackResult = { damage: 0, isDodged: true, isBlocked: false };
      mob.nextAttackAt = now + ZONE_ATTACK_INTERVAL * mobEnemyMods.atkSpeedSlowMult * mobRareAtkMult * 1000;
    } else {
      const playerStats = resolveStats(state.character);
      const abilEff = getFullEffect(state, now, false);
      const defStats = applyAbilityResists(playerStats, abilEff);
      const buffedStats: ResolvedStats = abilEff.defenseMult
        ? { ...defStats, armor: defStats.armor * abilEff.defenseMult, evasion: defStats.evasion * abilEff.defenseMult }
        : defStats;

      const levelMult = calcLevelDamageMult(state.character.level, zone.iLvlMin);
      const zoneAccuracy = calcZoneAccuracy(zone.band, state.character.level, zone.iLvlMin);
      const isMobCrit = Math.random() < MOB_CRIT_CHANCE;
      const variance = isMobCrit ? MOB_CRIT_MULTIPLIER : (0.8 + Math.random() * 0.4);
      const mobRareDmgMult = mob.rare?.combinedDamageMult ?? 1;
      const rawDmg = (ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin) * levelMult * variance * mobRareDmgMult * packDmgScale;

      const roll = rollZoneAttack(rawDmg, mob.physRatio, zoneAccuracy, buffedStats, currentDodgeEntropy, mob.damageElement, zone.band);
      currentDodgeEntropy = roll.newDodgeEntropy;
      let mobZoneDmg = roll.damage * mobEnemyMods.damageMult;
      const helperZoneFortifyDR = calcFortifyDR(state.fortifyStacks, state.fortifyExpiresAt, state.fortifyDRPerStack, now, resolveStats(state.character).fortifyEffect);
      if (helperZoneFortifyDR > 0) mobZoneDmg *= (1 - helperZoneFortifyDR);
      if (playerStats.damageTakenReduction > 0) mobZoneDmg *= (1 - playerStats.damageTakenReduction / 100);
      if (currentEs > 0 && mobZoneDmg > 0) {
        const esAbsorbed = Math.min(currentEs, mobZoneDmg);
        currentEs -= esAbsorbed;
        mobZoneDmg -= esAbsorbed;
      }
      // Staff v2: minions absorb the hit before it reaches player HP.
      // Front-loaded — first alive minion takes full hit, overkill cascades.
      if (mobZoneDmg > 0 && state.activeMinions && state.activeMinions.length > 0) {
        const absorb = absorbDamage(state.activeMinions, mobZoneDmg);
        state.activeMinions = absorb.minions;
        mobZoneDmg = absorb.remainingDamage;
      }
      playerHp -= mobZoneDmg;
      // Report last attacking mob's roll as the zone attack result
      zoneAttackResult = roll;
      mob.nextAttackAt = now + ZONE_ATTACK_INTERVAL * mobEnemyMods.atkSpeedSlowMult * mobRareAtkMult * 1000;
    }
  }

  // Unique temp buffs from dodge/hit events
  let updatedTempBuffs = [...state.tempBuffs];
  const playerStatsForUnique = resolveStats(state.character);

  // Unique: dodgeGrantsAttackSpeedPercent — on dodge, stack attack speed buff (Windsworn Greaves)
  if (zoneAttackResult?.isDodged && playerStatsForUnique.dodgeGrantsAttackSpeedPercent > 0) {
    const dodgeBuff: TempBuff = {
      id: 'unique_dodge_atkspd',
      effect: { attackSpeedMult: 1 + playerStatsForUnique.dodgeGrantsAttackSpeedPercent / 100 },
      expiresAt: now + 3000,
      sourceSkillId: 'unique',
      stacks: 1,
      maxStacks: playerStatsForUnique.dodgeAttackSpeedMaxStacks || 3,
    };
    updatedTempBuffs = mergeProcTempBuff(updatedTempBuffs, dodgeBuff);
  }

  // Unique: onHitGainDamagePercent — when hit (not dodged/blocked), stack damage buff (Brambleback's Hide)
  if (zoneAttackResult && !zoneAttackResult.isDodged && zoneAttackResult.damage > 0 && playerStatsForUnique.onHitGainDamagePercent > 0) {
    const hitDmgBuff: TempBuff = {
      id: 'unique_onhit_damage',
      effect: { damageMult: 1 + playerStatsForUnique.onHitGainDamagePercent / 100 },
      expiresAt: now + 5000,
      sourceSkillId: 'unique',
      stacks: 1,
      maxStacks: playerStatsForUnique.onHitGainDamageMaxStacks || 5,
    };
    updatedTempBuffs = mergeProcTempBuff(updatedTempBuffs, hitDmgBuff);

    // Brambleback's Hide: lose 1% current Life per stack
    const hitDmgBuffEntry = updatedTempBuffs.find(b => b.id === 'unique_onhit_damage');
    if (hitDmgBuffEntry) {
      playerHp -= playerHp * 0.01 * hitDmgBuffEntry.stacks;
    }
  }

  // ES recharge AFTER all mobs have attacked (not per-mob)
  if (anyAttacked) {
    const zoneStats = resolveStats(state.character);
    if (zoneStats.esRecharge > 0) {
      currentEs = Math.min(zoneStats.energyShield, currentEs + zoneStats.esRecharge * dt);
    }
  }

  // Passive player regen per tick (only if any mob attacked — keeps original behavior)
  if (anyAttacked) {
    const maxLife = resolveStats(state.character).maxLife;
    const regenCap = maxLife * MAX_REGEN_CAP_RATIO;
    const regen = Math.min(resolveStats(state.character).lifeRegen * dt, regenCap);
    playerHp = Math.min(maxLife, playerHp + regen);

    if (playerHp <= 0) {
      const deathNow = now;
      const streakReset = deathNow - state.lastDeathTime > DEATH_STREAK_WINDOW * 1000;
      const newStreak = streakReset ? 0 : state.deathStreak + 1;
      return {
        patch: {
          currentHp: 0,
          currentEs: 0,
          dodgeEntropy: Math.floor(Math.random() * 100),
          packMobs: updatedMobs,
          combatPhase: 'zone_defeat' as CombatPhase,
          combatPhaseStartedAt: deathNow,
          deathStreak: newStreak,
          lastDeathTime: deathNow,
          tempBuffs: updatedTempBuffs,
        },
        result: { ...noResult, zoneAttack: zoneAttackResult, zoneDeath: true, bleedTriggerDamage: helperBleedDmg },
      };
    }
    // Fold currentHp + dodgeEntropy into patch
  }

  // --- Per-mob DoT and regen ---
  const zonePlayerStats = resolveStats(state.character);
  let helperPoisonCount: number | undefined;
  // Cache DoT-source graphMods for per-tick rawBehaviors
  const dotSrcMod: Record<string, ReturnType<typeof getSkillGraphModifier> | null | undefined> = {};
  const getDotSrcMod = (skillId: string) => {
    if (skillId in dotSrcMod) return dotSrcMod[skillId];
    const def = getUnifiedSkillDef(skillId);
    const prog = state.skillProgress?.[skillId];
    const m = def && prog ? getSkillGraphModifier(def, prog) : null;
    dotSrcMod[skillId] = m;
    return m;
  };
  for (const mobIdx of updatedMobs.keys()) {
    const mob = updatedMobs[mobIdx];
    if (mob.debuffs.length > 0) {
      const enemyMaxHp = mob.maxHp > 0 ? mob.maxHp : 1;
      const dot = tickDebuffDoT(mob.debuffs, dt, 1, zonePlayerStats.incDoTDamage, enemyMaxHp);
      const mobDamageTakenMult = mob.rare?.combinedDamageTakenMult ?? 1;
      let dotDmg = dot.damage * mobDamageTakenMult;
      // ── Per-tick rawBehaviors (Locust/Haunt/Toads) ──
      const locustDeb = mob.debuffs.find(d => d.debuffId === 'locust_swarm_dot');
      const hauntDeb = mob.debuffs.find(d => d.debuffId === 'haunt_dot');
      const toadsDeb = mob.debuffs.find(d => d.debuffId === 'toads_dot');
      const hexedDeb = mob.debuffs.find(d => d.debuffId === 'hexed');
      // Helper: safely read a number from scalar or any of several object keys.
      const numFrom = (v: any, ...keys: string[]): number => {
        if (typeof v === 'number' && isFinite(v)) return v;
        if (v && typeof v === 'object') {
          for (const k of keys) {
            const x = v[k];
            if (typeof x === 'number' && isFinite(x)) return x;
          }
        }
        return 0;
      };
      // Locust execute threshold — low-HP bonus damage
      if (locustDeb) {
        const lMod = getDotSrcMod(locustDeb.appliedBySkillId ?? 'staff_locust_swarm');
        const lrb = lMod?.rawBehaviors as Record<string, any> | undefined;
        if (lrb?.locustExecuteThreshold) {
          const cfg = lrb.locustExecuteThreshold;
          const hpPct = numFrom(cfg, 'hpPercent', 'threshold');
          const bonus = numFrom(cfg, 'damageBonus', 'bonus');
          if (hpPct > 0 && mob.hp / enemyMaxHp <= hpPct / 100) {
            dotDmg *= 1 + (bonus || 50) / 100;
          }
        }
        // Mini Pandemic — roll per tick; spread to adjacent (respects swarmTransferDamageBonus compound)
        const miniChance = numFrom(lrb?.miniPandemicChance, 'chance', 'percent');
        if (miniChance > 0 && Math.random() * 100 < miniChance * dt) {
          const adj = updatedMobs[mobIdx + 1] ?? updatedMobs[mobIdx - 1];
          const transfers = ((locustDeb as any)._swarmTransfers ?? 0);
          const maxHops = numFrom(lrb?.swarmTransferMaxHops, 'max') || 4;
          const hasChain = !!lrb?.swarmInfiniteChain || transfers < maxHops;
          if (adj && adj.hp > 0 && hasChain && !adj.debuffs.some(d => d.debuffId === 'locust_swarm_dot')) {
            const baseSnap = (locustDeb as any).snapshot ?? 0;
            const newTransfers = transfers + 1;
            const transferBonus = numFrom(lrb?.swarmTransferDamageBonus, 'perTransferPercent', 'percent');
            const compoundMult = 1 + (transferBonus / 100) * newTransfers;
            applyDebuffToList(adj.debuffs, 'locust_swarm_dot', 1, locustDeb.remainingDuration,
              locustDeb.appliedBySkillId ?? 'staff_locust_swarm', baseSnap * compoundMult);
            const newDeb = adj.debuffs.find(d => d.debuffId === 'locust_swarm_dot') as any;
            if (newDeb) newDeb._swarmTransfers = newTransfers;
          }
        }
        // Heal minions per locust tick
        const healPct = numFrom(lrb?.locustHealsMinionsPerTick, 'percent');
        if (healPct > 0 && state.activeMinions) {
          for (const m of state.activeMinions) {
            m.hp = Math.min(m.maxHp, m.hp + m.maxHp * (healPct / 100) * dt);
          }
        }
      }
      // Haunt chain damage compound
      if (hauntDeb) {
        const hMod = getDotSrcMod(hauntDeb.appliedBySkillId ?? 'staff_haunt');
        const hrb = hMod?.rawBehaviors as Record<string, any> | undefined;
        const chainPct = numFrom(hrb?.hauntChainDamageCompound, 'perTickPercent', 'percent');
        if (chainPct > 0) {
          const anyDeb = hauntDeb as any;
          anyDeb._chainCompoundTicks = (anyDeb._chainCompoundTicks ?? 0) + 1;
          dotDmg *= 1 + (chainPct / 100) * anyDeb._chainCompoundTicks;
        }
        if (hrb?.spiritConduit && state.activeMinions) {
          const perMinion = numFrom(hrb.spiritConduit, 'damagePerMinionPercent', 'percent');
          const selfPct = numFrom(hrb.spiritConduit, 'minionSelfDamagePercent', 'hpCost') || 1;
          const aliveMinions = state.activeMinions.filter(m => m.hp > 0);
          if (aliveMinions.length > 0 && perMinion > 0) {
            dotDmg *= 1 + (perMinion / 100) * aliveMinions.length;
            for (const m of aliveMinions) m.hp = Math.max(1, m.hp - m.maxHp * (selfPct / 100) * dt);
          }
        }
      }
      // Toads plague mark buildup
      if (toadsDeb) {
        const tMod = getDotSrcMod(toadsDeb.appliedBySkillId ?? 'staff_plague_of_toads');
        const trb = tMod?.rawBehaviors as Record<string, any> | undefined;
        if (trb?.plagueMarkBuildup) {
          const cfg = trb.plagueMarkBuildup;
          const perTick = numFrom(cfg, 'perTick') || 1;
          const maxStacks = numFrom(cfg, 'maxStacks') || 10;
          const detPct = numFrom(cfg, 'detonatePercent', 'detonationMultiplier', 'multiplier');
          const anyDeb = toadsDeb as any;
          anyDeb._plagueMarks = (anyDeb._plagueMarks ?? 0) + perTick * dt;
          if (anyDeb._plagueMarks >= maxStacks) {
            dotDmg += enemyMaxHp * (detPct / 100);
            anyDeb._plagueMarks = 0;
          }
        }
      }
      // Hex decay mark
      if (hexedDeb) {
        const xMod = getDotSrcMod(hexedDeb.appliedBySkillId ?? 'staff_hex');
        const xrb = xMod?.rawBehaviors as Record<string, any> | undefined;
        if (xrb?.hexedDecayMark) {
          const cfg = xrb.hexedDecayMark;
          const perSec = numFrom(cfg, 'perSecondPercent', 'perSec') || 1;
          const maxPct = numFrom(cfg, 'maxPercent', 'maxPct') || 30;
          const anyDeb = hexedDeb as any;
          anyDeb._decayMark = Math.min(maxPct, (anyDeb._decayMark ?? 0) + perSec * dt);
          dotDmg *= 1 + (anyDeb._decayMark || 0) / 100;
        }
      }
      // Final NaN guard
      if (!isFinite(dotDmg)) dotDmg = 0;
      helperDotDamage += dotDmg;
      mob.hp = Math.max(0, mob.hp - dotDmg);
      mob.debuffs = dot.updatedDebuffs;
      if (dot.poisonInstanceCount) helperPoisonCount = (helperPoisonCount ?? 0) + dot.poisonInstanceCount;
    }
    // Rare mob regen (Regenerating)
    const regenRate = mob.rare?.combinedRegenPerSec ?? 0;
    if (regenRate > 0 && mob.maxHp > 0) {
      mob.hp = Math.min(mob.maxHp, mob.hp + mob.maxHp * regenRate * dt);
    }
  }

  // Staff v2: DoT kills fire onKill procs for the DoT's source skill.
  // Enables Hive Spawn (Locust), Echoing Death / Hex Echo (Haunt/Hex), Pack Catalyst, etc.
  // for skills whose kills are mostly via DoT ticks rather than cast-hits.
  let newActiveMinions = state.activeMinions ? [...state.activeMinions] : [];
  let newComboStates = state.comboStates ? [...state.comboStates] : [];
  let dotKillProcDamage = 0;
  const dyingMobs = updatedMobs.filter(m => m.hp <= 0);
  if (dyingMobs.length > 0) {
    const killStats = resolveStats(state.character);
    for (const mob of dyingMobs) {
      const killingSkillIds = new Set<string>();
      for (const deb of mob.debuffs) {
        if (deb.appliedBySkillId) killingSkillIds.add(deb.appliedBySkillId);
      }
      for (const skillId of killingSkillIds) {
        const skillDef = getUnifiedSkillDef(skillId);
        const progress = state.skillProgress?.[skillId];
        if (!skillDef || !progress) continue;
        const graphMod = getSkillGraphModifier(skillDef, progress);
        const rb = graphMod?.rawBehaviors as Record<string, any> | undefined;
        if (graphMod?.skillProcs?.length) {
          const killCtx: any = {
            isHit: true, isCrit: false, skillId,
            effectiveMaxLife: killStats.maxLife,
            stats: killStats,
            weaponAvgDmg: 0,
            weaponSpellPower: killStats.spellPower ?? 0,
            damageMult: 1, now,
            lastProcTriggerAt: {},
          };
          const killPr = evaluateProcs(graphMod.skillProcs, 'onKill', killCtx);
          dotKillProcDamage += killPr.bonusDamage;
          if (killPr.newMinions.length > 0) newActiveMinions.push(...killPr.newMinions);
          for (const cs of killPr.newComboStates) {
            const creator = Object.values(COMBO_STATE_CREATORS).find(c => c.stateId === cs.stateId);
            const csEffect = creator?.effect ?? {};
            const csMaxStacks = creator?.maxStacks ?? 5;
            for (let i = 0; i < cs.stacks; i++) {
              newComboStates = createComboState(newComboStates, cs.stateId, skillId, csEffect, cs.duration, csMaxStacks);
            }
          }
        }
        if (!rb) continue;
        // hauntedDeathSpawnsSoulStack — killed while haunted → soul_stack
        if (rb.hauntedDeathSpawnsSoulStack && mob.debuffs.some(d => d.debuffId === 'haunted' || d.debuffId === 'haunt_dot')) {
          const stacks = (typeof rb.hauntedDeathSpawnsSoulStack === 'number' ? rb.hauntedDeathSpawnsSoulStack : 1);
          const creator = Object.values(COMBO_STATE_CREATORS).find(c => c.stateId === 'soul_stack');
          const csEffect = creator?.effect ?? {};
          const csMaxStacks = creator?.maxStacks ?? 5;
          for (let i = 0; i < stacks; i++) {
            newComboStates = createComboState(newComboStates, 'soul_stack', skillId, csEffect, creator?.duration ?? 8, csMaxStacks);
          }
        }
        // locustHexedKillSpawnsSoulStacks — killed with hexed + locust → soul_stacks
        if (rb.locustHexedKillSpawnsSoulStacks &&
            mob.debuffs.some(d => d.debuffId === 'hexed') &&
            mob.debuffs.some(d => d.debuffId === 'locust_swarm_dot')) {
          const stacks = (typeof rb.locustHexedKillSpawnsSoulStacks === 'number' ? rb.locustHexedKillSpawnsSoulStacks : 1);
          const creator = Object.values(COMBO_STATE_CREATORS).find(c => c.stateId === 'soul_stack');
          const csEffect = creator?.effect ?? {};
          const csMaxStacks = creator?.maxStacks ?? 5;
          for (let i = 0; i < stacks; i++) {
            newComboStates = createComboState(newComboStates, 'soul_stack', skillId, csEffect, creator?.duration ?? 8, csMaxStacks);
          }
        }
        // hexedDeathSpreadsHex — on hexed mob death, spread to pack
        if (rb.hexedDeathSpreadsHex && mob.debuffs.some(d => d.debuffId === 'hexed')) {
          const spreadCount = typeof rb.hexedDeathSpreadsHex === 'number' ? rb.hexedDeathSpreadsHex : 2;
          const targets = updatedMobs.filter(m => m.hp > 0).slice(0, spreadCount);
          for (const tgt of targets) {
            applyDebuffToList(tgt.debuffs, 'hexed', 1, 5, skillId);
          }
        }
        // soulHarvestKillSpreadDots — when SH kills, spread active DoTs to N mobs
        if (rb.soulHarvestKillSpreadDots && skillId === 'staff_soul_harvest') {
          const spreadCount = typeof rb.soulHarvestKillSpreadDots === 'number' ? rb.soulHarvestKillSpreadDots : 3;
          const targets = updatedMobs.filter(m => m.hp > 0).slice(0, spreadCount);
          for (const deb of mob.debuffs) {
            if (!['bleeding', 'poisoned', 'burning', 'frostbite', 'locust_swarm_dot', 'haunt_dot', 'toads_dot'].includes(deb.debuffId)) continue;
            for (const tgt of targets) {
              applyDebuffToList(tgt.debuffs, deb.debuffId, 1, deb.remainingDuration,
                deb.appliedBySkillId ?? skillId, (deb as any).snapshot ?? 0);
            }
          }
        }
        // soulHarvestKillRefundCdPercent — refund SH cooldown on kill
        if (rb.soulHarvestKillRefundCdPercent && skillId === 'staff_soul_harvest') {
          const pct = rb.soulHarvestKillRefundCdPercent as number;
          const timer = state.skillTimers?.find(t => t.skillId === 'staff_soul_harvest');
          if (timer?.cooldownUntil && timer.cooldownUntil > now) {
            const remaining = timer.cooldownUntil - now;
            timer.cooldownUntil = now + remaining * (1 - pct / 100);
          }
        }
        // bouncingSkullKillRefundsBounces — refund skill charge on BS kill (stand-in: reset CD partially)
        if (rb.bouncingSkullKillRefundsBounces && skillId === 'staff_bouncing_skull') {
          const pct = typeof rb.bouncingSkullKillRefundsBounces === 'number' ? rb.bouncingSkullKillRefundsBounces : 50;
          const timer = state.skillTimers?.find(t => t.skillId === 'staff_bouncing_skull');
          if (timer?.cooldownUntil && timer.cooldownUntil > now) {
            const remaining = timer.cooldownUntil - now;
            timer.cooldownUntil = now + remaining * (1 - pct / 100);
          }
        }
        // hauntDeathTriggersSoulHarvest — if haunted mob dies, apply SH damage pulse to adjacents
        if (rb.hauntDeathTriggersSoulHarvest && skillId === 'staff_haunt' &&
            mob.debuffs.some(d => d.debuffId === 'haunt_dot' || d.debuffId === 'haunted')) {
          const burst = (rb.hauntDeathTriggersSoulHarvest as number) * mob.maxHp / 100;
          for (const tgt of updatedMobs.filter(m => m.hp > 0).slice(0, 3)) {
            tgt.hp = Math.max(0, tgt.hp - burst);
          }
          dotKillProcDamage += burst;
        }
        // spiritResonance — per-kill ASPD stacker on the player buff
        if (rb.spiritResonance) {
          const tempBuffs = state.tempBuffs ?? [];
          const existing = tempBuffs.find((b: { id: string }) => b.id === 'spiritResonance') as any;
          if (existing) {
            existing.stacks = Math.min(10, (existing.stacks ?? 1) + 1);
            existing.duration = 6;
          } else {
            tempBuffs.push({ id: 'spiritResonance', effect: {}, duration: 6, stacks: 1, maxStacks: 10 } as any);
          }
        }
        // locustKillSpawnsPermMinion — on Locust kill, spawn a long-duration spirit
        if (rb.locustKillSpawnsPermMinion && skillId === 'staff_locust_swarm' &&
            mob.debuffs.some(d => d.debuffId === 'locust_swarm_dot')) {
          const cfg = rb.locustKillSpawnsPermMinion as { chance: number; duration: number };
          if (Math.random() * 100 < (cfg.chance ?? 100)) {
            // Append a fresh spirit_temp MinionState
            const spiritCfg = {
              id: `spirit_locust_${now}_${Math.floor(Math.random() * 1e6)}`,
              type: 'spirit_temp',
              hp: killStats.maxLife * 0.10,
              maxHp: killStats.maxLife * 0.10,
              damage: (killStats.spellPower ?? 0) * 0.25,
              attackInterval: 1.5,
              nextAttackAt: now + 500,
              expiresAt: now + (cfg.duration ?? 10) * 1000,
              element: 'cold' as const,
              sourceSkillId: 'staff_haunt',
            };
            newActiveMinions.push(spiritCfg);
          }
        }
      }
    }
  }

  // Remove mobs killed by DoT/bleed between skill ticks
  const dotKills = dyingMobs.length;
  let survivingMobs = updatedMobs.filter(m => m.hp > 0);

  // DoT wiped the entire pack — spawn a new encounter (mirrors tick.ts:1897)
  if (dotKills > 0 && survivingMobs.length === 0) {
    // Staff v2: capture surviving DoT debuffs from dying mobs BEFORE respawn so
    // they transfer to the next pack — keeps DoT builds feeling rewarding when
    // a Haunted/Plagued target dies too fast to enjoy its own DoT.
    // Only transfer actual DoT ailments (have dotType), not utility debuffs.
    const transferDebuffs = [];
    const seenDebuffIds = new Set<string>();
    for (const dying of dyingMobs) {
      for (const deb of dying.debuffs) {
        if (deb.remainingDuration <= 0) continue;
        const def = deb.debuffId ? null : null;  // checked below via import
        // Only transfer stackable-snapshot or instance-based DoTs
        const isDot = ['bleeding', 'poisoned', 'burning', 'frostbite'].includes(deb.debuffId);
        if (!isDot) continue;
        // One copy per debuff type (first-found wins to avoid doubling on mass-death)
        if (seenDebuffIds.has(deb.debuffId)) continue;
        seenDebuffIds.add(deb.debuffId);
        transferDebuffs.push({ ...deb });
        void def;
      }
    }

    const newMobTypeId = pickCurrentMob(zone.id, state.targetedMobId);
    const tickMobDef = newMobTypeId ? getMobTypeDef(newMobTypeId) : undefined;
    const hpMult = tickMobDef?.hpMultiplier ?? 1.0;
    const invHpMult = isZoneInvaded(state.invasionState, zone.id, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
    survivingMobs = spawnPack(zone, hpMult, invHpMult, now, tickMobDef?.damageElement, tickMobDef?.physRatio);

    // Apply captured DoTs to front mob of new pack (transfer-on-pack-wipe semantics,
    // similar to Locust's single-target transfer-on-kill but for between-pack continuity).
    if (transferDebuffs.length > 0 && survivingMobs.length > 0) {
      const target = survivingMobs[0];
      for (const deb of transferDebuffs) {
        target.debuffs.push({ ...deb });
      }
    }
  }

  return {
    patch: {
      packMobs: survivingMobs,
      currentHp: playerHp,
      currentEs: currentEs,
      dodgeEntropy: currentDodgeEntropy,
      tempBuffs: updatedTempBuffs,
      activeMinions: newActiveMinions,
      comboStates: newComboStates,
    },
    result: { ...noResult, zoneAttack: zoneAttackResult, bleedTriggerDamage: helperBleedDmg, dotDamage: helperDotDamage + dotKillProcDamage, poisonInstanceCount: helperPoisonCount, mobKills: dotKills },
  };
}

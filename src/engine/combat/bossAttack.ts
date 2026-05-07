// ============================================================
// Boss Attack — per-hit boss attacks + passive regen (non-skill ticks)
// Extracted from combat/tick.ts (Phase D2)
// ============================================================

import type { GameState, CombatTickResult, TempBuff } from '../../types';
import { resolveStats } from '../character';
import { rollZoneAttack, applyAbilityResists } from '../zones';
import { absorbDamage } from './minions';
import { ZONE_DEFS } from '../../data/zones';
import {
  BOSS_CRIT_CHANCE,
  BOSS_CRIT_MULTIPLIER,
  BOSS_MAX_DMG_RATIO,
} from '../../data/balance';
import {
  tickDebuffDoT,
  calcEnemyDebuffMods,
  calcBleedTriggerDamage,
  calcFortifyDR,
  getFullEffect,
  mergeProcTempBuff,
} from './helpers';
import {
  collectTalentEffects,
  collectAscendancyEffects,
  getDotCritByDebuffId,
  getPausedDebuffIds,
  dispatchProcOnHitTaken,
  dispatchProcOnBulwarkConsume,
  consumeBulwarkCharge,
} from '../classTalentDispatcher';
import type { CombatTickOutput } from './types';
import { noResult } from './types';

/**
 * Apply boss per-hit attacks + passive regen to player.
 * Called on non-skill ticks (GCD not ready) during boss_fight phase.
 * Returns merged patch + result instead of calling set().
 */
export function applyBossDamage(
  state: GameState,
  dtSec: number,
  now: number,
): CombatTickOutput {
  if (state.combatPhase === 'boss_fight' && state.bossState) {
    const bs = state.bossState;
    const bossStats = resolveStats(state.character);
    const abilEff = getFullEffect(state, now, false);
    const defStats = applyAbilityResists(bossStats, abilEff);
    // Phase F (2026-05-06): collect talentEffects once per call so
    // dotCrit + pauseDebuffIds + procOnHitTaken all fire on the boss
    // path. Was missing entirely from bossAttack.ts pre-2026-05-06.
    const bossTalentEffects = [
      ...collectTalentEffects(state.character.class, state.talentRanks ?? {}),
      ...collectAscendancyEffects(state.ascendancyId ?? null, state.ascendancyRanks ?? {}),
    ];
    // Phase F (2026-05-07): hoisted updatedTempBuffs above the
    // procOnHitTaken dispatch so grantBuff actions persist back to
    // the state patch returned at end of function. Was previously
    // declared inline at the boss-attack-due block (line 123) AFTER
    // dispatch — grantBuff fires went to a local copy that was never
    // written back.
    let updatedTempBuffs = [...(state.tempBuffs ?? [])];
    let playerHp = state.currentHp;
    let bossCurrentEs = state.currentEs;
    let bossAttackResult: CombatTickResult['bossAttack'] = null;
    let helperBleedDmg = 0;

    // Check if boss attack is due
    const helperEnemyMods = calcEnemyDebuffMods(state.activeDebuffs);
    let nextAttack = bs.bossNextAttackAt;
    let helperBossHp = bs.bossCurrentHp;
    if (now >= nextAttack) {
      // Bleed trigger: enemy attacked (hit or miss — boss still swung)
      helperBleedDmg = calcBleedTriggerDamage(state.activeDebuffs, 1, bossStats.incDoTDamage ?? 0);
      if (helperBleedDmg > 0) helperBossHp -= helperBleedDmg;

      // Miss chance from debuffs (e.g. Blinded)
      if (Math.random() * 100 < helperEnemyMods.missChance) {
        bossAttackResult = { damage: 0, isDodged: true, isBlocked: false, isCrit: false };
        nextAttack = now + bs.bossAttackInterval * helperEnemyMods.atkSpeedSlowMult * 1000;
      } else {
        // Boss damage smoothing: variance + crit
        const isBossCrit = Math.random() < BOSS_CRIT_CHANCE;
        const variance = 0.6 + Math.random() * 0.4; // 60%-100% normal
        const rawDmg = bs.bossDamagePerHit * (isBossCrit ? BOSS_CRIT_MULTIPLIER : variance);

        const bossZone = state.currentZoneId ? ZONE_DEFS.find(z => z.id === state.currentZoneId) : undefined;
        const roll = rollZoneAttack(rawDmg, bs.bossPhysRatio, bs.bossAccuracy, defStats, bs.dodgeEntropy, bs.bossDamageElement, bossZone?.band);
        bs.dodgeEntropy = roll.newDodgeEntropy;

        // Damage cap: never exceed BOSS_MAX_DMG_RATIO of maxHP per hit
        let cappedDmg = Math.min(roll.damage * helperEnemyMods.damageMult, bossStats.maxLife * BOSS_MAX_DMG_RATIO);
        // Fortify DR (use previous tick's state)
        const helperBossFortifyDR = calcFortifyDR(state.fortifyStacks, state.fortifyExpiresAt, state.fortifyDRPerStack, now, bossStats.fortifyEffect);
        if (helperBossFortifyDR > 0) cappedDmg *= (1 - helperBossFortifyDR);
        if (bossStats.damageTakenReduction > 0) cappedDmg *= (1 - bossStats.damageTakenReduction / 100);
        // ES absorbs boss damage before HP
        if (bossCurrentEs > 0 && cappedDmg > 0) {
          const esAbsorbed = Math.min(bossCurrentEs, cappedDmg);
          bossCurrentEs -= esAbsorbed;
          cappedDmg -= esAbsorbed;
        }
        // Staff v2: minions absorb boss hits between casts (front-loaded cascade).
        if (cappedDmg > 0 && state.activeMinions && state.activeMinions.length > 0) {
          const absorb = absorbDamage(state.activeMinions, cappedDmg);
          state.activeMinions = absorb.minions;
          cappedDmg = absorb.remainingDamage;
        }
        // Phase F: Bulwark consume BEFORE damage subtraction.
        let bossSubConsumeFired = false;
        if (!roll.isDodged && cappedDmg > 0) {
          const consumed = consumeBulwarkCharge(updatedTempBuffs, cappedDmg);
          cappedDmg = consumed.damage;
          bossSubConsumeFired = consumed.consumed;
        }
        playerHp -= cappedDmg;
        // Phase F: procOnHitTaken — fire defensive procs on boss
        // attacks landed via applyBossDamage. Suppressed on dodge;
        // block still fires. targetDebuffs = boss's debuff list so
        // applyTag goes on the boss, not the player.
        if (!roll.isDodged && bossTalentEffects.length > 0) {
          const hitTakenCtx = {
            targetDebuffs: state.activeDebuffs,
            life: { value: playerHp, max: bossStats.maxLife },
            sourceSkillId: '_hit_taken',
            tempBuffsRef: updatedTempBuffs,
            skillTimers: state.skillTimers,
          };
          dispatchProcOnHitTaken(bossTalentEffects, hitTakenCtx, isBossCrit);
          if (bossSubConsumeFired) {
            dispatchProcOnBulwarkConsume(bossTalentEffects, hitTakenCtx);
          }
        }
        bossAttackResult = { damage: cappedDmg, isDodged: roll.isDodged, isBlocked: roll.isBlocked, isCrit: isBossCrit };
        nextAttack = now + bs.bossAttackInterval * helperEnemyMods.atkSpeedSlowMult * 1000;
      }
    }

    // Unique temp buffs from dodge/hit events during boss fight.
    // Phase F (2026-05-07): no longer reset here — declared at top
    // of function so procOnHitTaken grantBuff persists into the
    // dodge/onHit merges below.

    // Unique: dodgeGrantsAttackSpeedPercent — on dodge, stack attack speed buff (Windsworn Greaves)
    if (bossAttackResult?.isDodged && bossStats.dodgeGrantsAttackSpeedPercent > 0) {
      const dodgeBuff: TempBuff = {
        id: 'unique_dodge_atkspd',
        effect: { attackSpeedMult: 1 + bossStats.dodgeGrantsAttackSpeedPercent / 100 },
        expiresAt: now + 3000,
        sourceSkillId: 'unique',
        stacks: 1,
        maxStacks: bossStats.dodgeAttackSpeedMaxStacks || 3,
      };
      updatedTempBuffs = mergeProcTempBuff(updatedTempBuffs, dodgeBuff);
    }

    // Unique: onHitGainDamagePercent — when hit, stack damage buff (Brambleback's Hide)
    if (bossAttackResult && !bossAttackResult.isDodged && bossAttackResult.damage > 0 && bossStats.onHitGainDamagePercent > 0) {
      const hitDmgBuff: TempBuff = {
        id: 'unique_onhit_damage',
        effect: { damageMult: 1 + bossStats.onHitGainDamagePercent / 100 },
        expiresAt: now + 5000,
        sourceSkillId: 'unique',
        stacks: 1,
        maxStacks: bossStats.onHitGainDamageMaxStacks || 5,
      };
      updatedTempBuffs = mergeProcTempBuff(updatedTempBuffs, hitDmgBuff);
      const hitDmgBuffEntry = updatedTempBuffs.find(b => b.id === 'unique_onhit_damage');
      if (hitDmgBuffEntry) {
        playerHp -= playerHp * 0.01 * hitDmgBuffEntry.stacks;
      }
    }

    // ES recharge per tick (AFTER attack resolution, not inside attack block)
    if (bossStats.esRecharge > 0) {
      bossCurrentEs = Math.min(bossStats.energyShield, bossCurrentEs + bossStats.esRecharge * dtSec);
    }

    // Passive regen per tick
    playerHp = Math.min(bossStats.maxLife, playerHp + bossStats.lifeRegen * dtSec);

    // Tick DoT damage every frame against boss (poison/burning)
    let helperDotDamage = 0;
    let helperPoisonCount: number | undefined;
    let updatedDebuffs = state.activeDebuffs;
    if (state.activeDebuffs.length > 0) {
      // Phase F: dotCrit + pauseDebuffIds now fire on the boss path too.
      const bossDotCritParams = {
        byDebuffId: getDotCritByDebuffId(bossTalentEffects),
        critMultiplier: bossStats.critMultiplier ?? 200,
      };
      const bossPauseDebuffIds = getPausedDebuffIds(bossTalentEffects, state.activeDebuffs);
      const dot = tickDebuffDoT(state.activeDebuffs, dtSec, 1, bossStats.incDoTDamage, bs.bossMaxHp, bossDotCritParams, bossPauseDebuffIds);
      helperDotDamage = dot.damage;
      helperPoisonCount = dot.poisonInstanceCount;
      helperBossHp -= dot.damage;
      updatedDebuffs = dot.updatedDebuffs;
    }

    if (playerHp <= 0) {
      return {
        patch: {
          currentHp: 0,
          currentEs: 0,
          dodgeEntropy: Math.floor(Math.random() * 100),
          bossState: { ...bs, bossNextAttackAt: nextAttack, bossCurrentHp: helperBossHp },
          activeDebuffs: updatedDebuffs,
          tempBuffs: updatedTempBuffs,
        },
        result: { ...noResult, bossOutcome: 'defeat', bossAttack: bossAttackResult, bleedTriggerDamage: helperBleedDmg, dotDamage: helperDotDamage, poisonInstanceCount: helperPoisonCount },
      };
    }

    return {
      patch: {
        currentHp: playerHp,
        currentEs: bossCurrentEs,
        bossState: { ...bs, bossNextAttackAt: nextAttack, bossCurrentHp: helperBossHp },
        activeDebuffs: updatedDebuffs,
        tempBuffs: updatedTempBuffs,
      },
      result: { ...noResult, bossOutcome: 'ongoing', bossAttack: bossAttackResult, bleedTriggerDamage: helperBleedDmg, dotDamage: helperDotDamage, poisonInstanceCount: helperPoisonCount },
    };
  }
  return { patch: {}, result: noResult };
}

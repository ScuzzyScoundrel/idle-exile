// ============================================================
// Staff weapon module — Witch Doctor (DoTs, minions, pandemic spread)
// Generic combo-state creator/consumer logic driven by COMBO_STATE_CREATORS / CONSUMERS.
// Minion subsystem: summon on Zombie Dogs/Fetish Swarm cast; attacks tick in maintenance;
// incoming damage absorbed in onEnemyAttack; spirit_link detonated on Mass Sacrifice consume.
// Mass Sacrifice talent wiring: all graphMod fields for minion mods, detonation bonuses,
// consume-gated behaviors, Final Sacrifice baseline (4+/5 states = ×1.5/×2.0).
// ============================================================

import type {
  WeaponModule, PreRollResult, PostCastResult, EnemyAttackResult, KillResult, MaintenanceResult,
  PreRollContext, PostCastContext, EnemyAttackContext,
} from './weaponModule';
import {
  COMBO_STATE_CREATORS, COMBO_STATE_CONSUMERS,
  consumeMultipleComboStates, createComboState, tickComboStates,
} from '../combo';
import {
  SUMMON_CONFIGS, summonMinions, stepMinions, absorbDamage, detonateMinions,
  type MinionState,
} from '../minions';
// Note: detonateMinions is referenced indirectly via staff preRoll detonation logic
// (see spirit_link consume handler). Keep import for symmetry with future engine work.
void detonateMinions;
import type { ResolvedSkillModifier } from '../../skillGraph';
import { getSkillGraphModifier } from '../../unifiedSkills';
import { getUnifiedSkillDef } from '../../../data/skills';
import { applyDebuffToList } from '../helpers';

const EMPTY_PRE_ROLL: PreRollResult = {
  comboStates: [],
  damageMult: 1,
  critChanceBonus: 0,
  critMultiplierBonus: 0,
  guaranteedCrit: false,
  ailmentPotency: 0,
  cdRefundPercent: 0,
  splashPercent: 0,
  extraChains: 0,
  burstDamage: 0,
  focusBurst: false,
  counterDamageMult: 0,
  markPassthrough: false,
  cdAcceleration: 0,
  consumedStateIds: [],
  healAmount: 0,
  contagionSpreadCount: 0,
  pandemicSpread: false,
};

const HAUNTED_DURATION = 5;
const SPIRIT_LINK_REFRESH = 2;
// Spectral Pact T2: temporary spirit spawned on haunted consume (fetish-variant, 3s).
const SPECTRAL_PACT_DURATION = 3;
// Final Sacrifice baseline (roster fantasy): consume 4+ states = ×1.5, 5 = ×2.0.
const FINAL_SACRIFICE_4_MULT = 1.5;
const FINAL_SACRIFICE_5_MULT = 2.0;

/** Apply talent-tree minion modifiers to freshly-summoned minions. */
function applyMinionTalentMods(
  minions: MinionState[],
  type: string,
  gm: ResolvedSkillModifier | null,
  now: number,
): MinionState[] {
  if (!gm) return minions;
  const hpMult = 1 + (gm.minionHpMult || 0) / 100;
  const damageMult = 1 + (gm.minionDamageMult || 0) / 100;
  const durationMult = 1 + (gm.minionDurationMult || 0) / 100;
  const dogIntervalReduction = type === 'zombie_dog' ? (gm.zombieDogAttackIntervalReduction || 0) : 0;
  if (hpMult === 1 && damageMult === 1 && durationMult === 1 && dogIntervalReduction === 0) return minions;
  return minions.map(m => {
    if (m.type !== type) return m;
    const newAttackInterval = Math.max(0.5, m.attackInterval - dogIntervalReduction);
    const remaining = m.expiresAt - now;
    return {
      ...m,
      maxHp: m.maxHp * hpMult,
      hp: m.hp * hpMult,
      damage: m.damage * damageMult,
      attackInterval: newAttackInterval,
      // If attack interval changed, adjust next attack time to maintain staggering ratio.
      nextAttackAt: m.nextAttackAt - m.attackInterval * 1000 + newAttackInterval * 1000,
      expiresAt: now + remaining * durationMult,
    };
  });
}

/** Summon a temporary spirit (fetish-variant, 3s) from Spectral Pact talent. */
function summonSpectralSpirit(existing: MinionState[], playerMaxHp: number, spellPower: number, now: number): MinionState[] {
  return [
    ...existing,
    {
      id: `spirit_${now}`,
      type: 'spirit',
      hp: playerMaxHp * 0.05,
      maxHp: playerMaxHp * 0.05,
      damage: spellPower * 0.3,
      attackInterval: 1.0,
      nextAttackAt: now + 500,
      expiresAt: now + SPECTRAL_PACT_DURATION * 1000,
      element: 'cold',
      sourceSkillId: 'staff_mass_sacrifice_spectral_pact',
    },
  ];
}

export const staffModule: WeaponModule = {
  weaponType: 'staff',

  // ── Hook 1: tickMaintenance — combo state decay + minion step/attacks ──
  tickMaintenance(ctx): MaintenanceResult {
    const { state, dtSec, now } = ctx;

    let comboStates = tickComboStates(state.comboStates ?? [], dtSec);
    const { minions: updatedMinions, attacks } = stepMinions(state.activeMinions ?? [], dtSec, now);

    let minionAttackDamage = 0;
    let healAmount = 0;
    const minionDebuffs: { debuffId: string; stacks: number; duration: number; skillId: string; snapshotDamage: number }[] = [];
    const minionDeathAoe: NonNullable<MaintenanceResult['minionDeathAoe']> = [];
    const packDebuffs: NonNullable<MaintenanceResult['packDebuffs']> = [];
    const ELEMENT_AILMENT: Record<string, string> = {
      physical: 'bleeding', fire: 'burning', cold: 'frostbite', lightning: 'shocked', chaos: 'poisoned',
    };
    // Cache graphMod per sourceSkillId — avoid re-resolving per attack when N minions of same type swing.
    const minionGraphMods: Record<string, ResolvedSkillModifier | null> = {};
    const resolveMinionMod = (skillId: string): ResolvedSkillModifier | null => {
      if (skillId in minionGraphMods) return minionGraphMods[skillId];
      const def = getUnifiedSkillDef(skillId);
      const progress = state.skillProgress?.[skillId];
      const mod = def && progress ? getSkillGraphModifier(def, progress) : null;
      minionGraphMods[skillId] = mod;
      return mod;
    };
    // Active soul_stack count across all sources (for per-stack damage scaling)
    const soulStackCount = (state.comboStates ?? [])
      .filter(s => s.stateId === 'soul_stack')
      .reduce((sum, s) => sum + (s.stacks ?? 0), 0);
    // Count alive minions by type (for dogPackPowerPerDog)
    const dogsAlive = updatedMinions.filter(m => m.type === 'zombie_dog' && m.hp > 0).length;
    const fetishesAlive = updatedMinions.filter(m => m.type === 'fetish' && m.hp > 0).length;
    void fetishesAlive;
    // Front target debuffs (dogsBonusDamageVsPlagued/Hexed) — front pack mob or boss
    const frontTargetDebuffs = (() => {
      if (state.combatPhase === 'boss_fight') return (state.activeDebuffs ?? []).map(d => d.debuffId);
      return (state.packMobs?.[0]?.debuffs ?? []).map(d => d.debuffId);
    })();
    // Helper: adjust debuff duration by talent bonus (dogAppliedDotDurationBonus / fetishAppliedDotDurationBonus).
    const durationForSource = (skillId: string, base: number, rb: Record<string, any> | undefined): number => {
      if (!rb) return base;
      if (skillId === 'staff_zombie_dogs' && rb?.dogAppliedDotDurationBonus) {
        return base * (1 + rb.dogAppliedDotDurationBonus / 100);
      }
      if (skillId === 'staff_fetish_swarm' && rb?.fetishAppliedDotDurationBonus) {
        return base * (1 + rb.fetishAppliedDotDurationBonus / 100);
      }
      return base;
    };
    // Helper: list all current debuff ids active in combat (Apply All DoTs)
    const activeDotIds = (() => {
      const ids = new Set<string>();
      const mobDebs = state.packMobs?.[0]?.debuffs ?? [];
      for (const d of mobDebs) ids.add(d.debuffId);
      for (const d of (state.activeDebuffs ?? [])) ids.add(d.debuffId);
      return Array.from(ids).filter(id =>
        id === 'poisoned' || id === 'bleeding' || id === 'burning' || id === 'frostbite' ||
        id === 'locust_swarm_dot' || id === 'haunt_dot' || id === 'toads_dot'
      );
    })();
    for (const a of attacks) {
      const mod = resolveMinionMod(a.sourceSkillId);
      const rb = mod?.rawBehaviors as Record<string, any> | undefined;
      // ── Minion attack element conversion (fetishPhysToChaosPercent) ──
      // Not mutating damage type now (buckets unchanged), but picks signature ailment path.
      let effectiveElement = a.element;
      if (a.sourceSkillId === 'staff_fetish_swarm' && rb?.fetishPhysToChaosPercent) {
        effectiveElement = 'chaos';
      }
      // ── Minion crit roll ──
      // Base: spirits/dogs/fetishes do not crit by default. fetishCritChance raises it.
      let critChance = 0;
      if (a.sourceSkillId === 'staff_fetish_swarm' && rb?.fetishCritChance) critChance += rb.fetishCritChance;
      if (a.forcedCrit) critChance = 100;
      const isCrit = critChance > 0 && Math.random() * 100 < critChance;
      // ── Damage scaling for this attack ──
      let damageMult = 1;
      if (a.sourceSkillId === 'staff_zombie_dogs' && rb?.dogPackPowerPerDog) {
        damageMult *= 1 + (rb.dogPackPowerPerDog / 100) * dogsAlive;
      }
      if (a.sourceSkillId === 'staff_zombie_dogs') {
        if (rb?.dogDamagePerSoulStackUncapped) damageMult *= 1 + (rb.dogDamagePerSoulStackUncapped / 100) * soulStackCount;
        else if (rb?.dogDamagePerSoulStack) damageMult *= 1 + (rb.dogDamagePerSoulStack / 100) * Math.min(soulStackCount, 10);
        if (rb?.dogsBonusDamageVsPlagued && frontTargetDebuffs.includes('plagued')) {
          damageMult *= 1 + rb.dogsBonusDamageVsPlagued / 100;
        }
        if (rb?.dogsBonusDamageVsHexed && frontTargetDebuffs.includes('hexed')) {
          damageMult *= 1 + rb.dogsBonusDamageVsHexed / 100;
        }
      }
      if (a.sourceSkillId === 'staff_fetish_swarm') {
        if (rb?.fetishDamagePerSoulStackUncapped) damageMult *= 1 + (rb.fetishDamagePerSoulStackUncapped / 100) * soulStackCount;
        else if (rb?.fetishDamagePerSoulStack) damageMult *= 1 + (rb.fetishDamagePerSoulStack / 100) * Math.min(soulStackCount, 10);
        if (rb?.fetishDamageMult) damageMult *= 1 + rb.fetishDamageMult / 100;
      }
      // Minion/Hex bonus (minionBonusDamageVsHexed — cross-skill modifier appearing on any tree)
      if (rb?.minionBonusDamageVsHexed && frontTargetDebuffs.includes('hexed')) {
        damageMult *= 1 + rb.minionBonusDamageVsHexed / 100;
      }
      if (isCrit) damageMult *= 2.0; // minions crit for ×2 (no stat-driven multi yet)
      const finalDamage = a.damage * damageMult;
      minionAttackDamage += finalDamage;

      if (a.createsComboStateOnHit === 'haunted') {
        comboStates = createComboState(
          comboStates, 'haunted', a.sourceSkillId,
          { incDamage: 30, guaranteedCrit: true },
          HAUNTED_DURATION, 1,
        );
      }
      // Signature ailment — uses effectiveElement (fetishPhysToChaos override takes precedence)
      const autoAilment = ELEMENT_AILMENT[effectiveElement];
      if (autoAilment) {
        minionDebuffs.push({
          debuffId: autoAilment,
          stacks: 1,
          duration: durationForSource(a.sourceSkillId, 5, rb),
          skillId: a.sourceSkillId,
          snapshotDamage: finalDamage,
        });
      }
      if (a.appliesDebuffOnHit) {
        minionDebuffs.push({
          debuffId: a.appliesDebuffOnHit.debuffId,
          stacks: a.appliesDebuffOnHit.stacks ?? 1,
          duration: durationForSource(a.sourceSkillId, a.appliesDebuffOnHit.duration, rb),
          skillId: a.sourceSkillId,
          snapshotDamage: finalDamage,
        });
      }
      if (!rb) continue;

      // ══ DOGS ══
      if (a.sourceSkillId === 'staff_zombie_dogs') {
        // t1a Rotting Fangs
        if (rb.dogBitePoisonStacks) {
          minionDebuffs.push({
            debuffId: 'poisoned', stacks: rb.dogBitePoisonStacks,
            duration: durationForSource(a.sourceSkillId, 3, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t1b Disease Carrier
        if (rb.dogBiteBleedingChance && Math.random() * 100 < rb.dogBiteBleedingChance) {
          minionDebuffs.push({
            debuffId: 'bleeding', stacks: 1,
            duration: durationForSource(a.sourceSkillId, 3, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t3a Putrid Bite — extra existing-debuff stack
        if (rb.dogBiteExtraStackChance && Math.random() * 100 < rb.dogBiteExtraStackChance) {
          // Pick a random existing debuff on front target + add 1 stack
          if (frontTargetDebuffs.length > 0) {
            const pick = frontTargetDebuffs[Math.floor(Math.random() * frontTargetDebuffs.length)];
            minionDebuffs.push({
              debuffId: pick, stacks: 1,
              duration: durationForSource(a.sourceSkillId, 3, rb),
              skillId: a.sourceSkillId, snapshotDamage: finalDamage,
            });
          }
        }
        // t3b Crit Bite — per-debuff extra stacks on crit (configured as a map)
        if (isCrit && rb?.dogCritExtraStacks && typeof rb.dogCritExtraStacks === 'object') {
          for (const [debId, stacks] of Object.entries(rb.dogCritExtraStacks as Record<string, number>)) {
            if (typeof stacks !== 'number' || stacks <= 0) continue;
            minionDebuffs.push({
              debuffId: debId, stacks,
              duration: durationForSource(a.sourceSkillId, 3, rb),
              skillId: a.sourceSkillId, snapshotDamage: finalDamage,
            });
          }
        }
        // t3b Lifesteal
        if (rb.dogBiteLifesteal) {
          const cfg = rb.dogBiteLifesteal as { chance: number; healPercent: number };
          if (Math.random() * 100 < cfg.chance) {
            healAmount += ctx.effectiveMaxLife * (cfg.healPercent / 100);
          }
        }
        // t1b Soul Bite
        if (rb.dogBiteSoulStackChance && Math.random() * 100 < rb.dogBiteSoulStackChance) {
          const icdKey = 'minion_icd_dogBiteSoulStack';
          const icdMs = (rb.dogBiteSoulStackICD ?? 2) * 1000;
          const lastAt = state.lastProcTriggerAt?.[icdKey] ?? 0;
          if (now >= lastAt + icdMs) {
            comboStates = createComboState(comboStates, 'soul_stack', a.sourceSkillId, {}, 8, 1);
            if (state.lastProcTriggerAt) state.lastProcTriggerAt[icdKey] = now;
          }
        }
        // t3b Crit Soul
        if (isCrit && rb?.dogCritSoulStackChance && Math.random() * 100 < rb.dogCritSoulStackChance) {
          const icdKey = 'minion_icd_dogCritSoulStack';
          const icdMs = (rb.dogCritSoulStackICD ?? 2) * 1000;
          const lastAt = state.lastProcTriggerAt?.[icdKey] ?? 0;
          if (now >= lastAt + icdMs) {
            comboStates = createComboState(comboStates, 'soul_stack', a.sourceSkillId, {}, 8, 1);
            if (state.lastProcTriggerAt) state.lastProcTriggerAt[icdKey] = now;
          }
        }
        // t4 Apply All DoTs
        if (rb.dogBiteApplyAllDotsChance && Math.random() * 100 < rb.dogBiteApplyAllDotsChance) {
          for (const debId of activeDotIds) {
            minionDebuffs.push({
              debuffId: debId, stacks: 1,
              duration: durationForSource(a.sourceSkillId, 3, rb),
              skillId: a.sourceSkillId, snapshotDamage: finalDamage,
            });
          }
        }
        // t5b Pestilent Pack — Plagued every bite
        if (rb.dogBiteAppliesPlagued) {
          const cfg = rb.dogBiteAppliesPlagued as { duration: number };
          minionDebuffs.push({
            debuffId: 'plagued', stacks: 1,
            duration: durationForSource(a.sourceSkillId, cfg.duration, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t7 THE PLAGUE PACK — always Hexed + Haunted
        if (rb.dogBiteAppliesHexedHaunted) {
          minionDebuffs.push({
            debuffId: 'hexed', stacks: 1,
            duration: durationForSource(a.sourceSkillId, 5, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
          minionDebuffs.push({
            debuffId: 'haunted', stacks: 1,
            duration: durationForSource(a.sourceSkillId, 5, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t5a Bloodhounds — target maxHp as chaos damage
        if (rb.dogBiteMaxHpDamagePercent) {
          const maxHp = state.combatPhase === 'boss_fight'
            ? (state.bossState?.bossMaxHp ?? 0)
            : (state.packMobs?.[0]?.maxHp ?? 0);
          minionAttackDamage += maxHp * (rb.dogBiteMaxHpDamagePercent / 100);
        }
        // t5b Hex Pack — every Nth bite applies Hexed
        if (rb.dogBiteEveryNHexed) {
          const cfg = rb.dogBiteEveryNHexed as { everyN: number; duration: number };
          if (cfg.everyN > 0 && a.attackNumber % cfg.everyN === 0) {
            minionDebuffs.push({
              debuffId: 'hexed', stacks: 1,
              duration: durationForSource(a.sourceSkillId, cfg.duration, rb),
              skillId: a.sourceSkillId, snapshotDamage: finalDamage,
            });
          }
        }
      }

      // ══ FETISHES ══
      if (a.sourceSkillId === 'staff_fetish_swarm') {
        // t1b Toxic Hits
        if (rb.fetishHitPoisonChance && Math.random() * 100 < rb.fetishHitPoisonChance) {
          minionDebuffs.push({
            debuffId: 'poisoned', stacks: 1,
            duration: durationForSource(a.sourceSkillId, 3, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t3b Bleed Darts — on crit
        if (isCrit && rb?.fetishCritBleedingStacks) {
          minionDebuffs.push({
            debuffId: 'bleeding', stacks: rb.fetishCritBleedingStacks,
            duration: durationForSource(a.sourceSkillId, 3, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t1b Soul Darts
        if (rb.fetishHitSoulStackChance && Math.random() * 100 < rb.fetishHitSoulStackChance) {
          const icdKey = 'minion_icd_fetishHitSoulStack';
          const icdMs = (rb.fetishHitSoulStackICD ?? 1) * 1000;
          const lastAt = state.lastProcTriggerAt?.[icdKey] ?? 0;
          if (now >= lastAt + icdMs) {
            comboStates = createComboState(comboStates, 'soul_stack', a.sourceSkillId, {}, 8, 1);
            if (state.lastProcTriggerAt) state.lastProcTriggerAt[icdKey] = now;
          }
        }
        // t3b Crit Soul
        if (isCrit && rb?.fetishCritSoulStackChance && Math.random() * 100 < rb.fetishCritSoulStackChance) {
          const icdKey = 'minion_icd_fetishCritSoulStack';
          const icdMs = (rb.fetishCritSoulStackICD ?? 1.5) * 1000;
          const lastAt = state.lastProcTriggerAt?.[icdKey] ?? 0;
          if (now >= lastAt + icdMs) {
            comboStates = createComboState(comboStates, 'soul_stack', a.sourceSkillId, {}, 8, 1);
            if (state.lastProcTriggerAt) state.lastProcTriggerAt[icdKey] = now;
          }
        }
        // t4b Predator Pack — crit cascades N next attacks forced-crit (per minion)
        if (isCrit && rb?.fetishCritCascadeAttacks) {
          const minion = updatedMinions.find(m => m.id === a.minionId);
          if (minion) minion.forcedCritsRemaining = (minion.forcedCritsRemaining ?? 0) + rb.fetishCritCascadeAttacks;
        }
        // t2 Plague Darts — every Nth dart applies Plagued
        if (rb.fetishEveryNAppliesPlagued) {
          const cfg = rb.fetishEveryNAppliesPlagued as { everyN: number; duration: number };
          if (cfg.everyN > 0 && a.attackNumber % cfg.everyN === 0) {
            minionDebuffs.push({
              debuffId: 'plagued', stacks: 1,
              duration: durationForSource(a.sourceSkillId, cfg.duration, rb),
              skillId: a.sourceSkillId, snapshotDamage: finalDamage,
            });
          }
        }
        // t7 THE PESTILENCE — always apply Poisoned + Bleeding
        if (rb.fetishHitAlwaysAppliesPoisonAndBleeding) {
          minionDebuffs.push({
            debuffId: 'poisoned', stacks: 1,
            duration: durationForSource(a.sourceSkillId, 3, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
          minionDebuffs.push({
            debuffId: 'bleeding', stacks: 1,
            duration: durationForSource(a.sourceSkillId, 3, rb),
            skillId: a.sourceSkillId, snapshotDamage: finalDamage,
          });
        }
        // t4 Plague Volley — splash extra damage to 1 adjacent mob
        if (rb.fetishAttackSplashTargets && rb?.fetishSplashPercent) {
          const splashDamage = finalDamage * (rb.fetishSplashPercent / 100);
          minionAttackDamage += splashDamage; // simplification: adds to front-target damage (approx same mob)
        }
      }
    }

    if (updatedMinions.length > 0) {
      comboStates = createComboState(
        comboStates, 'spirit_link', 'staff_minion_subsystem',
        { incDamage: 0 }, SPIRIT_LINK_REFRESH, 1,
      );
    }

    // ── Minion death detection (compare prev → current) ──
    // stepMinions drops expired/dead minions; reconstruct by diffing prev list.
    const prevMinions = state.activeMinions ?? [];
    const prevAlive = new Map(prevMinions.filter(m => m.hp > 0 && now < m.expiresAt).map(m => [m.id, m]));
    const currentIds = new Set(updatedMinions.map(m => m.id));
    let finalMinions = updatedMinions;
    for (const [id, prev] of prevAlive) {
      if (currentIds.has(id)) continue;
      // prev was alive, now gone → died (hp<=0) or expired this tick (now>=expiresAt)
      const diedByDamage = prev.hp <= 0 || (now >= prev.expiresAt && prev.hp <= 0);
      const wasExpired = now >= prev.expiresAt;
      const deathMod = resolveMinionMod(prev.sourceSkillId);
      const drb = deathMod?.rawBehaviors as Record<string, any> | undefined;
      if (!drb) continue;
      // Only fire "on death" for damage-killed (not clean-expired) for cloud/pulse;
      // for spawn-on-death we fire on any removal so long-running builds still chain.
      // Fetish Swarm death events
      if (prev.type === 'fetish') {
        if (drb.fetishDeathPoisonCloud && !wasExpired) {
          const cfg = drb.fetishDeathPoisonCloud as { duration: number; damagePercent: number };
          minionDeathAoe.push({
            damage: prev.maxHp * (cfg.damagePercent / 100),
            element: 'chaos', sourceSkillId: prev.sourceSkillId,
            debuffOnHit: { debuffId: 'poisoned', stacks: 1, duration: cfg.duration },
          });
        }
        if (drb.fetishOnDeathSpawnDog) {
          const cfg = drb.fetishOnDeathSpawnDog as { chance: number; duration: number };
          if (Math.random() * 100 < cfg.chance) {
            const fakeConfig = { ...SUMMON_CONFIGS.zombie_dog, count: 1, duration: cfg.duration };
            finalMinions = summonMinions(finalMinions, fakeConfig, ctx.effectiveMaxLife, ctx.spellPower, now);
          }
        }
      }
      // Zombie Dogs death events
      if (prev.type === 'zombie_dog') {
        if (drb.dogDeathPulsePercent && !wasExpired) {
          minionDeathAoe.push({
            damage: prev.maxHp * (drb.dogDeathPulsePercent / 100),
            element: 'chaos', sourceSkillId: prev.sourceSkillId,
          });
        }
        // Endless Pack — auto-revive
        if (drb.dogAutoReviveSeconds && diedByDamage) {
          const reviveHp = prev.maxHp * ((drb.dogAutoReviveHpPercent ?? 50) / 100);
          finalMinions = [
            ...finalMinions,
            { ...prev, hp: reviveHp, reviveAt: now + drb.dogAutoReviveSeconds * 1000, nextAttackAt: now + drb.dogAutoReviveSeconds * 1000 },
          ];
        }
      }
    }

    // ── Fetish permanent mode (THE BLOOD CULT) — auto-resummon after all dead ──
    // Runs once: if fetish skill has fetishPermanentMode allocated and no fetishes alive.
    {
      const fetishMod = resolveMinionMod('staff_fetish_swarm');
      const fetishRb = fetishMod?.rawBehaviors as Record<string, any> | undefined;
      if (fetishRb?.fetishPermanentMode) {
        const resummonKey = 'fetish_permanent_resummon_at';
        const alive = finalMinions.filter(m => m.type === 'fetish' && m.hp > 0).length;
        if (alive === 0) {
          const cfg = fetishRb.fetishPermanentMode as { resummonDelay: number };
          const scheduledAt = state.lastProcTriggerAt?.[resummonKey] ?? 0;
          if (scheduledAt === 0) {
            // schedule
            if (state.lastProcTriggerAt) state.lastProcTriggerAt[resummonKey] = now + cfg.resummonDelay * 1000;
          } else if (now >= scheduledAt) {
            finalMinions = summonMinions(finalMinions, SUMMON_CONFIGS.fetish, ctx.effectiveMaxLife, ctx.spellPower, now);
            finalMinions = applyMinionTalentMods(finalMinions, 'fetish', fetishMod, now);
            if (state.lastProcTriggerAt) state.lastProcTriggerAt[resummonKey] = 0;
          }
        } else {
          // reset scheduled flag while alive (clear timer so next wipe schedules fresh)
          if (state.lastProcTriggerAt && state.lastProcTriggerAt[resummonKey] !== 0) {
            state.lastProcTriggerAt[resummonKey] = 0;
          }
        }
      }
    }

    // ── Permanent Colony (Haunt t7) — keep 4 spirit_temp alive always ──
    {
      const hauntMod = resolveMinionMod('staff_haunt');
      const hrb = hauntMod?.rawBehaviors as Record<string, any> | undefined;
      if (hrb?.permanentColony) {
        const aliveSpirits = finalMinions.filter(m => m.type === 'spirit_temp' && m.hp > 0).length;
        const target = typeof hrb.permanentColony === 'number' ? hrb.permanentColony : 4;
        if (aliveSpirits < target) {
          const missing = target - aliveSpirits;
          for (let i = 0; i < missing; i++) {
            const cfg = { ...SUMMON_CONFIGS.spirit_temp, count: 1, duration: 999 }; // long duration — "always"
            finalMinions = summonMinions(finalMinions, cfg, ctx.effectiveMaxLife, ctx.spellPower, now + i);
          }
        }
      }
    }

    // ── Dog regen (Dog Regen notable) ──
    {
      const dogMod = resolveMinionMod('staff_zombie_dogs');
      const drb2 = dogMod?.rawBehaviors as Record<string, any> | undefined;
      if (drb2?.dogRegenPercentPerSecond) {
        const safeMs = (drb2.dogRegenSafeWindowSeconds ?? 3) * 1000;
        finalMinions = finalMinions.map(m => {
          if (m.type !== 'zombie_dog' || m.hp <= 0 || m.hp >= m.maxHp) return m;
          if (m.lastDamagedAt && now < m.lastDamagedAt + safeMs) return m;
          const lastRegen = m.lastRegenTickAt ?? now;
          const elapsedSec = (now - lastRegen) / 1000;
          if (elapsedSec <= 0) return m;
          return {
            ...m,
            hp: Math.min(m.maxHp, m.hp + m.maxHp * (drb2.dogRegenPercentPerSecond / 100) * elapsedSec),
            lastRegenTickAt: now,
          };
        });
      }
    }

    // ── Soul Tether (Haunt t6) — heal per haunted enemy per tick ──
    {
      const hauntMod = resolveMinionMod('staff_haunt');
      const hrb = hauntMod?.rawBehaviors as Record<string, any> | undefined;
      if (hrb?.soulTether && dtSec > 0) {
        // count haunted mobs in pack
        const hauntedCount = (state.packMobs ?? [])
          .filter(m => m.debuffs?.some(d => d.debuffId === 'haunted')).length;
        if (hauntedCount > 0) {
          healAmount += ctx.effectiveMaxLife * (hrb.soulTether / 100) * hauntedCount * dtSec;
        }
      }
    }

    // ── Dog Aura (Aura of Death notable) — +damage per alive dog as a passive combo state ──
    // Write as a self-refreshing combo state that preRoll reads via conditionalMods or rawBehaviors.
    // Simpler: stash in state for preRoll via rawBehaviors (emit a synthetic combo state with incDamage).
    {
      const dogMod = resolveMinionMod('staff_zombie_dogs');
      const drb2 = dogMod?.rawBehaviors as Record<string, any> | undefined;
      if (drb2?.dogAuraDamagePerDog && dogsAlive > 0) {
        const auraBonus = drb2.dogAuraDamagePerDog * dogsAlive;
        comboStates = createComboState(
          comboStates, 'dog_aura', 'staff_zombie_dogs',
          { incDamage: auraBonus }, 2, 1,
        );
      }
    }

    // ── Pack-wide debuff keystones ──
    {
      const locustMod = resolveMinionMod('staff_locust_swarm');
      const lrb = locustMod?.rawBehaviors as Record<string, any> | undefined;
      if (lrb?.plagueCourtAllPlagued) {
        packDebuffs.push({
          debuffId: 'plagued', stacks: 1, duration: 4,
          skillId: 'staff_locust_swarm', snapshotDamage: 0,
        });
      }
      const hexMod = resolveMinionMod('staff_hex');
      const xrb = hexMod?.rawBehaviors as Record<string, any> | undefined;
      if (xrb?.witchingHour) {
        packDebuffs.push({
          debuffId: 'hexed', stacks: 1, duration: 6,
          skillId: 'staff_hex', snapshotDamage: 0,
        });
      }
      if (xrb?.hexAppliesBleedingPerSecond) {
        const perSec = xrb.hexAppliesBleedingPerSecond;
        // For hexed mobs, emit a bleeding stack per second
        const hexedCount = (state.packMobs ?? []).filter(m => m.debuffs?.some(d => d.debuffId === 'hexed')).length;
        if (hexedCount > 0 && Math.random() < perSec * dtSec) {
          packDebuffs.push({
            debuffId: 'bleeding', stacks: 1, duration: 3,
            skillId: 'staff_hex', snapshotDamage: 0,
          });
        }
      }
    }

    return {
      comboStates,
      activeMinions: finalMinions,
      minionAttackDamage,
      minionDebuffs,
      healAmount: healAmount > 0 ? healAmount : undefined,
      minionDeathAoe: minionDeathAoe.length > 0 ? minionDeathAoe : undefined,
      packDebuffs: packDebuffs.length > 0 ? packDebuffs : undefined,
    };
  },

  extendConditionContext() {
    return {};
  },

  // ── Hook 3: preRoll — consume combo states, detonate, apply talent bonuses ──
  preRoll(ctx: PreRollContext): PreRollResult {
    const { skill, comboStates, activeMinions, graphMod, targetDebuffs, effectiveMaxLife, spellPower, now } = ctx;
    let damageMult = 1;
    let guaranteedCrit = false;
    let extraChains = 0;
    let burstDamage = 0;
    let pandemicSpread = false;
    let cdRefundPercent = 0;
    const consumedStateIds: string[] = [];
    let newComboStates = comboStates;
    let remainingMinions: MinionState[] | undefined;
    const skillsToResetCd: string[] = [];

    const isMassSacrifice = skill.id === 'staff_mass_sacrifice';
    const consumeIds = COMBO_STATE_CONSUMERS[skill.id];

    if (consumeIds?.length) {
      const { consumed, remaining } = consumeMultipleComboStates(comboStates, consumeIds);
      newComboStates = remaining;

      for (const cs of consumed) {
        consumedStateIds.push(cs.stateId);
        const eff = cs.effect ?? {};
        if (eff.incDamage) damageMult *= 1 + eff.incDamage / 100;
        if (eff.guaranteedCrit) guaranteedCrit = true;
        if (eff.extraChains && cs.stateId === 'soul_stack') extraChains += eff.extraChains * cs.stacks;

        if (isMassSacrifice) {
          // Per-state baseline bonuses
          if (cs.stateId === 'haunted' || cs.stateId === 'plagued' || cs.stateId === 'hexed') {
            damageMult *= 1.20;
          } else if (cs.stateId === 'soul_stack') {
            // Endless Ritual override: +30% per stack and cap 10 (vs baseline +15% / cap 5)
            const perStack = graphMod?.soulStackDamagePerStack || 15;
            damageMult *= 1 + (perStack / 100) * cs.stacks;
          } else if (cs.stateId === 'spirit_link') {
            // Detonate minions: sum remaining HP (or maxHP if Bloodbond) × optional per-stack / per-minion mults
            let detonationDamage = (activeMinions ?? []).reduce((sum, m) =>
              sum + (graphMod?.detonationUsesMaxHp ? m.maxHp : m.hp), 0);
            if (graphMod?.detonationPerMinionMult && activeMinions.length > 0) {
              detonationDamage *= activeMinions.length;
            }
            // Soul Sacrifice T6: +25% per soul_stack consumed
            if (graphMod?.detonationPerSoulStackBonus) {
              const soulStackConsumed = consumed.find(c => c.stateId === 'soul_stack');
              const soulStacks = soulStackConsumed?.stacks ?? 0;
              detonationDamage *= 1 + (graphMod.detonationPerSoulStackBonus / 100) * soulStacks;
            }
            burstDamage += detonationDamage;
            remainingMinions = [];
            // LORD OF THE DEAD T7: resummon both kits at full HP after detonation
            if (graphMod?.resummonOnMassSacrifice) {
              remainingMinions = summonMinions(remainingMinions, SUMMON_CONFIGS.zombie_dog, effectiveMaxLife, spellPower, now);
              remainingMinions = summonMinions(remainingMinions, SUMMON_CONFIGS.fetish, effectiveMaxLife, spellPower, now);
              remainingMinions = applyMinionTalentMods(remainingMinions, 'zombie_dog', graphMod, now);
              remainingMinions = applyMinionTalentMods(remainingMinions, 'fetish', graphMod, now);
            }
            // Resurgent Swarm via rawBehaviors — reset named skill CDs on spirit_link consume
            const resurgent = graphMod?.rawBehaviors?.resurgentSwarmSkills as string[] | undefined;
            if (resurgent?.length) skillsToResetCd.push(...resurgent);
          }

          // Hexbreaker T2: extra +50% when consuming hexed
          if (cs.stateId === 'hexed' && graphMod?.hexedConsumeMassSacrificeBonus) {
            damageMult *= 1 + graphMod.hexedConsumeMassSacrificeBonus / 100;
          }

          // Spectral Pact T2: consuming haunted summons a temporary spirit
          if (cs.stateId === 'haunted' && graphMod?.hauntedConsumeSummonsSpirit) {
            const base = remainingMinions ?? activeMinions ?? [];
            remainingMinions = summonSpectralSpirit(base, effectiveMaxLife, spellPower, now);
          }
        }

        // Plague of Toads consuming Plagued → baseline pandemic
        // Mass Sacrifice + Contagion Sacrifice T4: upgraded pandemic
        if (cs.stateId === 'plagued') {
          if (skill.id === 'staff_plague_of_toads') pandemicSpread = true;
          else if (isMassSacrifice && graphMod?.massSacrificePandemic) pandemicSpread = true;
        }
      }

      // Final Sacrifice baseline: consume 4+ states on Mass Sacrifice
      if (isMassSacrifice) {
        if (consumedStateIds.length >= 5) damageMult *= FINAL_SACRIFICE_5_MULT;
        else if (consumedStateIds.length >= 4) damageMult *= FINAL_SACRIFICE_4_MULT;

        // Sacrificial Wisdom T4: cdRefund per state consumed
        if (graphMod?.cdRefundPerStateConsumed) {
          cdRefundPercent += graphMod.cdRefundPerStateConsumed * consumedStateIds.length;
        }

        // Virulent Explosion T5A: burst damage scales with debuffs on target
        if (graphMod?.burstDamagePerDebuffOnTarget && targetDebuffs.length > 0) {
          burstDamage *= 1 + (graphMod.burstDamagePerDebuffOnTarget / 100) * targetDebuffs.length;
        }
      }
    }

    // Pack Leader T1a: +% damage per minion alive (applies to all staff skill casts)
    if (graphMod?.damagePerMinionAlive && (activeMinions?.length ?? 0) > 0) {
      damageMult *= 1 + (graphMod.damagePerMinionAlive / 100) * activeMinions.length;
    }

    // Haunt: Weakening Touch T4 — bonus damage to already-haunted targets
    if (skill.id === 'staff_haunt' && graphMod?.hauntedTargetHauntBonus && targetDebuffs.length > 0) {
      const hasHaunt = targetDebuffs.some(d => d.appliedBySkillId === 'staff_haunt');
      if (hasHaunt) damageMult *= 1 + graphMod.hauntedTargetHauntBonus / 100;
    }

    // Hex: Amplifying Curse — bonus damage to already-hexed targets (self-stacking repeat casts)
    if (skill.id === 'staff_hex' && graphMod?.hexedTargetDamageAmp && targetDebuffs.length > 0) {
      const hasHex = targetDebuffs.some(d => d.appliedBySkillId === 'staff_hex');
      if (hasHex) damageMult *= 1 + graphMod.hexedTargetDamageAmp / 100;
    }

    // Soul Harvest: Stackbreaker/Stackweaver — damage scales with active soul_stacks
    if (graphMod?.damagePerSoulStackActive) {
      const stackState = comboStates.find(s => s.stateId === 'soul_stack');
      if (stackState) damageMult *= 1 + (graphMod.damagePerSoulStackActive / 100) * stackState.stacks;
    }

    // Soul Harvest: Soul Drain T2 — heal % of Soul Harvest damage (approximated from avgDamage × damageMult)
    let preRollHealAmount = 0;
    if (skill.id === 'staff_soul_harvest' && graphMod?.soulHarvestDamageHealPercent) {
      const approxDamage = ctx.avgDamage * damageMult;
      preRollHealAmount = (graphMod.soulHarvestDamageHealPercent / 100) * approxDamage;
    }

    // ── Batch K: preRoll rawBehaviors ──
    // graphMod has BOTH top-level fields (catchall-merged) and rawBehaviors object,
    // depending on how each talent was authored. Read flexibly from either location.
    const rb = graphMod?.rawBehaviors as Record<string, any> | undefined;
    const gm = graphMod as any;
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
    if (rb || gm) {
      // Haunt snapshot bonus (scalar)
      if (skill.id === 'staff_haunt') {
        const v = numFrom(rb?.hauntSnapshotBonus ?? gm?.hauntSnapshotBonus);
        if (v > 0) damageMult *= 1 + v / 100;
      }
      // Haunted execute threshold — at top-level on some talents, scalar percent
      if (skill.id === 'staff_haunt') {
        const thr = numFrom(rb?.hauntedExecuteThreshold ?? gm?.hauntedExecuteThreshold, 'hpPercent', 'threshold');
        const bonus = numFrom(rb?.hauntedExecuteThreshold ?? gm?.hauntedExecuteThreshold, 'damageBonus', 'bonus') || 100;
        if (thr > 0 && ctx.state.packMobs?.[0]?.maxHp > 0) {
          const pct = ctx.state.packMobs[0].hp / ctx.state.packMobs[0].maxHp;
          if (pct <= thr / 100) damageMult *= 1 + bonus / 100;
        }
      }
      // Damage per haunted enemy in pack
      if (skill.id === 'staff_haunt') {
        const cfg = rb?.damagePerHauntedEnemyInPack ?? gm?.damagePerHauntedEnemyInPack;
        const perEnemy = numFrom(cfg, 'perEnemy', 'percent');
        const max = numFrom(cfg, 'max') || 99;
        if (perEnemy > 0) {
          const hauntedCount = Math.min(max, (ctx.state.packMobs ?? [])
            .filter(m => m.debuffs?.some(d => d.debuffId === 'haunt_dot' || d.debuffId === 'haunted')).length);
          if (hauntedCount > 0) damageMult *= 1 + (perEnemy / 100) * hauntedCount;
        }
      }
      // Puppeteer Hex cast damage
      if (skill.id === 'staff_hex') {
        const perStack = numFrom(rb?.puppeteerHexCastDamage ?? gm?.puppeteerHexCastDamage, 'perSoulStackPercent', 'percent');
        const stacks = comboStates.find(s => s.stateId === 'soul_stack')?.stacks ?? 0;
        if (perStack > 0 && stacks > 0) {
          const maxHp = ctx.state.packMobs?.[0]?.maxHp ?? 0;
          burstDamage += maxHp * (perStack / 100) * stacks;
        }
      }
      // Soul Harvest hexed consume bonus
      if (skill.id === 'staff_soul_harvest' && consumedStateIds.includes('hexed')) {
        const b = numFrom(rb?.soulHarvestHexedConsumeBonus ?? gm?.soulHarvestHexedConsumeBonus);
        if (b > 0) damageMult *= 1 + b / 100;
        const m = numFrom(rb?.soulHarvestHexedConsumeMult ?? gm?.soulHarvestHexedConsumeMult);
        if (m > 0) damageMult *= m;
      }
      // Soul Harvest consume all stacks
      if (skill.id === 'staff_soul_harvest' && (rb?.soulHarvestConsumesAllStacks || gm?.soulHarvestConsumesAllStacks)) {
        const stacks = comboStates.find(s => s.stateId === 'soul_stack')?.stacks ?? 0;
        const per = numFrom(rb?.soulHarvestConsumesAllStacksBonus ?? gm?.soulHarvestConsumesAllStacksBonus) || 20;
        damageMult *= 1 + (per / 100) * stacks;
      }
      // Soul Harvest execute threshold
      if (skill.id === 'staff_soul_harvest') {
        const cfg = rb?.soulHarvestExecuteThreshold ?? gm?.soulHarvestExecuteThreshold;
        const thr = numFrom(cfg, 'hpPercent', 'threshold');
        const bonus = numFrom(cfg, 'damageBonus', 'bonus') || 100;
        if (thr > 0 && ctx.state.packMobs?.[0]?.maxHp > 0) {
          const pct = ctx.state.packMobs[0].hp / ctx.state.packMobs[0].maxHp;
          if (pct <= thr / 100) damageMult *= 1 + bonus / 100;
        }
      }
      // Toads execute threshold
      if (skill.id === 'staff_plague_of_toads') {
        const cfg = rb?.toadsExecuteThreshold ?? gm?.toadsExecuteThreshold;
        const thr = numFrom(cfg, 'hpPercent', 'threshold');
        const bonus = numFrom(cfg, 'damageBonus', 'bonus') || 100;
        if (thr > 0 && ctx.state.packMobs?.[0]?.maxHp > 0) {
          const pct = ctx.state.packMobs[0].hp / ctx.state.packMobs[0].maxHp;
          if (pct <= thr / 100) damageMult *= 1 + bonus / 100;
        }
      }
      // Bouncing Skull damage compound (per consecutive cast)
      if (skill.id === 'staff_bouncing_skull' && rb?.bouncingSkullDamageCompound) {
        const compoundKey = 'bouncing_skull_compound';
        const lastAt = ctx.state.lastProcTriggerAt?.[compoundKey] ?? 0;
        // reset compound if idle > 3s, else stack
        const compound = (now - lastAt) > 3000 ? 0 : (ctx.state.lastProcTriggerAt?.[compoundKey + '_stacks'] ?? 0) + 1;
        if (ctx.state.lastProcTriggerAt) {
          ctx.state.lastProcTriggerAt[compoundKey] = now;
          ctx.state.lastProcTriggerAt[compoundKey + '_stacks'] = compound;
        }
        damageMult *= 1 + (rb?.bouncingSkullDamageCompound / 100) * compound;
      }
      // Spirit Barrage — consume soul stacks mode (pinpoint / single shot)
      if (skill.id === 'staff_spirit_barrage' && rb?.spiritBarrageConsumesSoulStacks) {
        const stacks = comboStates.find(s => s.stateId === 'soul_stack')?.stacks ?? 0;
        if (stacks > 0) {
          const perStack = (rb?.spiritBarrageConsumesSoulStacksBonus ?? 25) / 100;
          damageMult *= 1 + perStack * stacks;
          // consume
          const idx = newComboStates.findIndex(s => s.stateId === 'soul_stack');
          if (idx >= 0) newComboStates = [...newComboStates.slice(0, idx), ...newComboStates.slice(idx + 1)];
        }
      }
      if (skill.id === 'staff_spirit_barrage' && rb?.spiritBarragePinpointMode) {
        damageMult *= 1 + (rb?.spiritBarragePinpointMode as number) / 100;
      }
      if (skill.id === 'staff_spirit_barrage' && rb?.spiritBarrageSingleShot) {
        damageMult *= 1 + (rb?.spiritBarrageSingleShot as number) / 100;
      }
      // Bouncing Skull final bounce bonus & consumesAllStates
      if (skill.id === 'staff_bouncing_skull' && rb?.bouncingSkullFinalBounceBonus) {
        damageMult *= 1 + (rb?.bouncingSkullFinalBounceBonus as number) / 100;
      }
      if (skill.id === 'staff_bouncing_skull' && rb?.soulConsumeChainBonus) {
        const stacks = comboStates.find(s => s.stateId === 'soul_stack')?.stacks ?? 0;
        damageMult *= 1 + (rb?.soulConsumeChainBonus as number / 100) * stacks;
      }
      if (skill.id === 'staff_bouncing_skull' && rb?.bouncingSkullConsumesAllStates) {
        const total = comboStates.reduce((s, st) => s + (st.stacks ?? 0), 0);
        const perState = (rb?.bouncingSkullConsumesAllStatesBonus ?? 20) / 100;
        damageMult *= 1 + perState * total;
      }
      // Frog Prince random burst multiplier
      if (skill.id === 'staff_plague_of_toads' && rb?.frogPrinceChance) {
        if (Math.random() * 100 < rb.frogPrinceChance) {
          const mult = rb.frogPrinceMultiplier ?? 3;
          damageMult *= mult;
        }
      }
      // Toads stack compounder — stack per cast, bonus damage
      if (skill.id === 'staff_plague_of_toads' && rb?.toadsStackCompounder) {
        const stackKey = 'toads_stack_compound';
        const lastAt = ctx.state.lastProcTriggerAt?.[stackKey] ?? 0;
        const compound = (now - lastAt) > 5000 ? 0 : (ctx.state.lastProcTriggerAt?.[stackKey + '_v'] ?? 0) + 1;
        if (ctx.state.lastProcTriggerAt) {
          ctx.state.lastProcTriggerAt[stackKey] = now;
          ctx.state.lastProcTriggerAt[stackKey + '_v'] = compound;
        }
        damageMult *= 1 + (rb.toadsStackCompounder / 100) * compound;
      }
      // Spirit Barrage projectile variants — approximated as damageMult (no projectile sim)
      if (skill.id === 'staff_spirit_barrage') {
        if (rb?.spiritBarrageProjectileExtraStack) damageMult *= 1 + (rb?.spiritBarrageProjectileExtraStack / 100);
        if (rb?.spiritBarragePerMinionExtraProjectile && activeMinions.length > 0) {
          damageMult *= 1 + (rb?.spiritBarragePerMinionExtraProjectile / 100) * activeMinions.length;
        }
        if (rb?.spiritBarrageMassVolley) damageMult *= 1 + rb.spiritBarrageMassVolley / 100;
        // Note: preRoll runs BEFORE the cast roll; crit-gated damage handled in postCast flow.
        if (rb?.spiritBarrageCritCascade && guaranteedCrit) damageMult *= 1 + rb.spiritBarrageCritCascade / 100;
        if (rb?.spiritBarrageSplit) extraChains += typeof rb.spiritBarrageSplit === 'number' ? rb.spiritBarrageSplit : 2;
        if (rb?.spiritBarrageFinalProjectileBonus) damageMult *= 1 + rb.spiritBarrageFinalProjectileBonus / 100;
      }
      // Bouncing Skull variants — treated as damageMult + extraChains
      if (skill.id === 'staff_bouncing_skull') {
        if (rb?.bouncingSkullMultiSkull) extraChains += rb.bouncingSkullMultiSkull as number;
        if (rb?.bouncingSkullEndlessBounces) extraChains += 5;
        if (rb?.bouncingSkullFinalAoeBonus) damageMult *= 1 + (rb?.bouncingSkullFinalAoeBonus as number) / 100;
        if (rb?.burningWorldFirePool) damageMult *= 1 + (rb.burningWorldFirePool as number) / 100;
      }
      // Toads leap variants — approximated
      if (skill.id === 'staff_plague_of_toads') {
        if (rb?.toadLeapRange) extraChains += 1;
        if (rb?.toadHoppingBounces) extraChains += rb.toadHoppingBounces as number;
      }
      // compoundingTick
      const compCfg = rb?.compoundingTick ?? gm?.compoundingTick;
      const compPerTick = numFrom(compCfg, 'perTickPercent', 'percent');
      const compMax = numFrom(compCfg, 'maxPercent') || 50;
      if (compPerTick > 0) {
        const compKey = `compounding_${skill.id}`;
        const lastAt = ctx.state.lastProcTriggerAt?.[compKey] ?? 0;
        const count = (now - lastAt) > 4000 ? 0 : (ctx.state.lastProcTriggerAt?.[compKey + '_c'] ?? 0) + 1;
        if (ctx.state.lastProcTriggerAt) {
          ctx.state.lastProcTriggerAt[compKey] = now;
          ctx.state.lastProcTriggerAt[compKey + '_c'] = count;
        }
        const bonus = Math.min(compMax, compPerTick * count);
        damageMult *= 1 + bonus / 100;
      }
      // Haunt chain damage compound (preRoll read)
      if (skill.id === 'staff_haunt' && ctx.targetDebuffs) {
        const chainPct = numFrom(rb?.hauntChainDamageCompound ?? gm?.hauntChainDamageCompound, 'perTickPercent', 'percent');
        if (chainPct > 0) {
          const hauntDeb = ctx.targetDebuffs.find(d => d.debuffId === 'haunt_dot');
          const ticks = (hauntDeb as any)?._chainCompoundTicks ?? 0;
          if (ticks > 0) damageMult *= 1 + (chainPct / 100) * ticks;
        }
      }
      // soulStackBuffsMinionsPercent
      const ssBuff = numFrom(rb?.soulStackBuffsMinionsPercent ?? gm?.soulStackBuffsMinionsPercent);
      if (ssBuff > 0) {
        const stacks = comboStates.find(s => s.stateId === 'soul_stack')?.stacks ?? 0;
        damageMult *= 1 + (ssBuff / 100) * stacks;
      }
    }
    // NaN guard after all multiplications
    if (!isFinite(damageMult) || damageMult <= 0) damageMult = 1;

    // ── Batch L: Cross-skill buff consume on cast ──
    // spiritEcho (consumed on next non-Spirit-Barrage) - buff set by Spirit Barrage
    const tempBuffs = ctx.state.tempBuffs ?? [];
    const consumeTempBuff = (id: string): boolean => {
      const idx = tempBuffs.findIndex((b: { id: string }) => b.id === id);
      if (idx < 0) return false;
      tempBuffs.splice(idx, 1);
      return true;
    };
    if (skill.id !== 'staff_spirit_barrage' && consumeTempBuff('spiritEcho')) damageMult *= 1.5;
    if (skill.id === 'staff_spirit_barrage' && consumeTempBuff('ghostlyFinale')) damageMult *= 2.0;
    if (skill.id !== 'staff_plague_of_toads' && consumeTempBuff('toadSurge')) damageMult *= 1.5;
    if (skill.id !== 'staff_locust_swarm' && consumeTempBuff('locustSurge')) damageMult *= 1.5;
    if (skill.id === 'staff_mass_sacrifice' && consumeTempBuff('soulSurge')) damageMult *= 1.75;
    if (skill.id === 'staff_soul_harvest' && consumeTempBuff('soulHarvestNextCrit')) guaranteedCrit = true;
    // Per-kill / per-hit stackers (read-side)
    const resonance = tempBuffs.find((b: { id: string }) => b.id === 'spiritResonance');
    if (resonance) damageMult *= 1 + 0.05 * ((resonance as any).stacks ?? 1); // +5% per stack (ASPD→dmg proxy)
    const huntersEyeBuff = tempBuffs.find((b: { id: string }) => b.id === 'huntersEye');
    if (huntersEyeBuff) damageMult *= 1 + 0.10 * ((huntersEyeBuff as any).stacks ?? 1); // +10% per stack (crit multi proxy)
    const predatorsMarkBuff = tempBuffs.find((b: { id: string }) => b.id === 'predatorsMark');
    if (predatorsMarkBuff) {
      const pmStacks = (predatorsMarkBuff as any).stacks ?? 1;
      // 5% crit chance per stack. Manifest as damageMult proxy (no critChanceBonus return).
      damageMult *= 1 + 0.05 * pmStacks;
    }

    return {
      ...EMPTY_PRE_ROLL,
      comboStates: newComboStates,
      damageMult, guaranteedCrit, extraChains, burstDamage,
      cdRefundPercent,
      consumedStateIds, pandemicSpread,
      activeMinions: remainingMinions,
      skillsToResetCd: skillsToResetCd.length > 0 ? skillsToResetCd : undefined,
      healAmount: preRollHealAmount,
    };
  },

  // ── Hook 4: postCast — create combo states, summon minions, apply talent mods ──
  postCast(ctx: PostCastContext): PostCastResult {
    const { skill, roll, effectiveMaxLife, spellPower, now, activeMinions, graphMod, state } = ctx;
    let comboStates = ctx.comboStates;
    let minions = activeMinions;

    // Capture pre-create stack counts for talents that read "stacks active at cast time"
    const preCreateSoulStackCount = comboStates.find(s => s.stateId === 'soul_stack')?.stacks ?? 0;

    // Combo state creator
    const config = COMBO_STATE_CREATORS[skill.id];
    if (config && roll.isHit) {
      const createOn = config.createOn ?? 'onCast';
      if (createOn === 'onCast' || (createOn === 'onCrit' && roll.isCrit)) {
        // Endless Ritual T5A: override max stacks for soul_stack
        const maxStacks = (config.stateId === 'soul_stack' && graphMod?.soulStackCapOverride)
          ? graphMod.soulStackCapOverride
          : config.maxStacks;
        comboStates = createComboState(
          comboStates, config.stateId, skill.id,
          config.effect, config.duration, maxStacks,
        );
        // Soul Harvest: Double Harvest T4 — crits grant bonus soul_stacks
        if (config.stateId === 'soul_stack' && roll.isCrit && graphMod?.soulHarvestCritBonusStacks) {
          for (let i = 0; i < graphMod.soulHarvestCritBonusStacks; i++) {
            comboStates = createComboState(
              comboStates, config.stateId, skill.id,
              config.effect, config.duration, maxStacks,
            );
          }
        }
      }
    }

    // Soul Harvest: Soul Feast T2 — cast heals each minion by (value% × soul_stacks active at cast time, pre-create)
    if (skill.id === 'staff_soul_harvest' && graphMod?.soulStackConsumeHealsMinions && (minions?.length ?? 0) > 0 && preCreateSoulStackCount > 0) {
      const healPct = (graphMod.soulStackConsumeHealsMinions / 100) * preCreateSoulStackCount;
      minions = minions.map(m => ({ ...m, hp: Math.min(m.maxHp, m.hp + m.maxHp * healPct) }));
    }

    // Minion summon
    if (skill.id === 'staff_zombie_dogs' && roll.isHit) {
      // Third Dog T4: extra zombie dog count from talents
      const extraDogs = graphMod?.extraZombieDogCount ?? 0;
      let dogConfig = extraDogs !== 0
        ? { ...SUMMON_CONFIGS.zombie_dog, count: SUMMON_CONFIGS.zombie_dog.count + extraDogs }
        : SUMMON_CONFIGS.zombie_dog;
      // THE ALPHA keystone: single super-dog with hpMult/damageMult/intervalMult
      const alpha = graphMod?.rawBehaviors?.alphaDogMode as { hpMult: number; damageMult: number; intervalMult: number } | undefined;
      if (alpha) {
        dogConfig = {
          ...dogConfig,
          count: 1,
          hpPercentOfPlayer: dogConfig.hpPercentOfPlayer * alpha.hpMult,
          damagePerSpellPowerRatio: dogConfig.damagePerSpellPowerRatio * alpha.damageMult,
          attackInterval: dogConfig.attackInterval * alpha.intervalMult,
        };
      }
      minions = summonMinions(minions, dogConfig, effectiveMaxLife, spellPower, now);
      minions = applyMinionTalentMods(minions, 'zombie_dog', graphMod, now);
    } else if (skill.id === 'staff_fetish_swarm' && roll.isHit) {
      const extraFetish = graphMod?.extraFetishCount ?? 0;
      let fetishConfig = extraFetish !== 0
        ? { ...SUMMON_CONFIGS.fetish, count: Math.max(1, SUMMON_CONFIGS.fetish.count + extraFetish) }
        : SUMMON_CONFIGS.fetish;
      // THE FETISH KING keystone
      const king = graphMod?.rawBehaviors?.fetishKingMode as { hpMult: number; damageMult: number; intervalMult: number } | undefined;
      if (king) {
        fetishConfig = {
          ...fetishConfig,
          count: 1,
          hpPercentOfPlayer: fetishConfig.hpPercentOfPlayer * king.hpMult,
          damagePerSpellPowerRatio: fetishConfig.damagePerSpellPowerRatio * king.damageMult,
          attackInterval: fetishConfig.attackInterval * king.intervalMult,
        };
      }
      minions = summonMinions(minions, fetishConfig, effectiveMaxLife, spellPower, now);
      minions = applyMinionTalentMods(minions, 'fetish', graphMod, now);
      // Brood Mother notable: on Fetish Swarm cast, also summon 1 zombie dog
      const broodMother = graphMod?.rawBehaviors?.fetishCastSummonsDog as { duration: number } | undefined;
      if (broodMother) {
        const dogCfg = { ...SUMMON_CONFIGS.zombie_dog, count: 1, duration: broodMother.duration };
        minions = summonMinions(minions, dogCfg, effectiveMaxLife, spellPower, now);
      }
    }

    // Cascading Doom T6: crit Mass Sacrifice refreshes haunted/plagued/hexed
    if (skill.id === 'staff_mass_sacrifice' && roll.isCrit && graphMod?.critRefreshesCombatStates) {
      for (const stateId of ['haunted', 'plagued', 'hexed']) {
        const duration = stateId === 'plagued' ? 6 : 5;
        const effect = stateId === 'haunted'
          ? { incDamage: 30, guaranteedCrit: true }
          : stateId === 'hexed'
            ? { incDamage: 100 }
            : { incDamage: 0 };
        comboStates = createComboState(comboStates, stateId, skill.id, effect, duration, 1);
      }
    }

    // ── Batch L producers: cross-skill buff creation ──
    const postRb = graphMod?.rawBehaviors as Record<string, any> | undefined;
    if (postRb && roll.isHit) {
      const addBuff = (id: string, duration: number) => {
        const tempBuffs = state.tempBuffs ?? [];
        const existing = tempBuffs.find((b: { id: string }) => b.id === id);
        if (existing) { (existing as any).duration = duration; return; }
        tempBuffs.push({ id, effect: {}, duration, stacks: 1, maxStacks: 1 } as any);
      };
      if (skill.id === 'staff_spirit_barrage' && postRb.spiritEcho) addBuff('spiritEcho', 8);
      if (skill.id !== 'staff_spirit_barrage' && postRb.ghostlyFinale) addBuff('ghostlyFinale', 8);
      if (skill.id === 'staff_plague_of_toads' && postRb.toadSurge) addBuff('toadSurge', 8);
      if (skill.id === 'staff_locust_swarm' && postRb.locustSurge) addBuff('locustSurge', 8);
      if (skill.id === 'staff_soul_harvest' && postRb.soulSurge) addBuff('soulSurge', 8);
      // soulHarvestNextCrit — set after a trigger (not a per-cast thing); leave to combat events

      // hexCastBuffsMinions — on Hex cast, heal+buff all minions
      if (skill.id === 'staff_hex' && postRb.hexCastBuffsMinions) {
        const pct = postRb.hexCastBuffsMinions as number;
        minions = minions.map(m => ({
          ...m,
          hp: Math.min(m.maxHp, m.hp + m.maxHp * (pct / 100)),
        }));
      }
      // Spirit Barrage transfer/apply variants
      if (skill.id === 'staff_spirit_barrage' && state.packMobs?.length > 0 && state.combatPhase === 'clearing') {
        const front = state.packMobs[0];
        if (postRb.spiritBarrageTransfersPlagued && front.debuffs.some(d => d.debuffId === 'plagued')) {
          for (const mob of state.packMobs.slice(1, 4)) {
            applyDebuffToList(mob.debuffs, 'plagued', 1, 5, 'staff_spirit_barrage');
          }
        }
        if (postRb.spiritBarrageAppliesHaunted) {
          applyDebuffToList(front.debuffs, 'haunt_dot', 1, 5, 'staff_spirit_barrage');
        }
      }
      // Bouncing Skull summons
      if (skill.id === 'staff_bouncing_skull' && postRb.boneTowerSummon) {
        // Summon a temp spirit as a stand-in for bone tower
        minions = summonMinions(minions, { ...SUMMON_CONFIGS.spirit_temp, count: 1, duration: 5 }, effectiveMaxLife, spellPower, now);
      }
      // Toads — permanentToadMinion / toadGodMinionAttacksSpawnToad
      if (skill.id === 'staff_plague_of_toads' && postRb.permanentToadMinion) {
        minions = summonMinions(minions, { ...SUMMON_CONFIGS.spirit_temp, count: 1, duration: 999 }, effectiveMaxLife, spellPower, now);
      }
      // eternalHaunt — mark haunt_dot with very long duration (LRU refresh stand-in)
      if (skill.id === 'staff_haunt' && postRb.eternalHaunt && state.packMobs?.length > 0) {
        for (const mob of state.packMobs) {
          const deb = mob.debuffs.find(d => d.debuffId === 'haunt_dot');
          if (deb) deb.remainingDuration = Math.max(deb.remainingDuration, 999);
        }
      }
      // Stackers — increment on specific triggers
      const bumpStacker = (id: string, maxStacks: number, duration: number) => {
        const tempBuffs = state.tempBuffs ?? [];
        const existing = tempBuffs.find((b: { id: string }) => b.id === id) as any;
        if (existing) {
          existing.stacks = Math.min(maxStacks, (existing.stacks ?? 1) + 1);
          existing.duration = duration;
        } else {
          tempBuffs.push({ id, effect: {}, duration, stacks: 1, maxStacks } as any);
        }
      };
      // predatorsMark — per-consecutive-cast (same skill) stacker
      if (postRb.predatorsMark) bumpStacker('predatorsMark', 10, 6);
      // huntersEye — per-hit stacker (crit multi)
      if (postRb.huntersEye && roll.isHit) bumpStacker('huntersEye', 5, 4);
      // soulHarvestNextCrit — if this cast generates the forced crit flag
      if (postRb.soulHarvestNextCritProducer) {
        addBuff('soulHarvestNextCrit', 10);
      }
      // locustInitialBurstPercent — immediate burst damage on Locust cast
      if (skill.id === 'staff_locust_swarm' && postRb.locustInitialBurstPercent && state.packMobs?.length > 0) {
        const burst = ctx.roll.damage * (postRb.locustInitialBurstPercent / 100);
        state.packMobs[0].hp -= burst;
      }
      // locustSpreadRadius — spreads Locust on cast (similar to locustAoeOnCast but per-mob radius)
      if (skill.id === 'staff_locust_swarm' && postRb.locustSpreadRadius && state.packMobs?.length > 1) {
        const deb = state.packMobs[0].debuffs.find(d => d.debuffId === 'locust_swarm_dot');
        if (deb) {
          const radius = postRb.locustSpreadRadius as number;
          for (const mob of state.packMobs.slice(1, 1 + radius)) {
            applyDebuffToList(mob.debuffs, 'locust_swarm_dot', 1, deb.remainingDuration, skill.id, (deb as any).snapshot ?? 0);
          }
        }
      }
      // spiritBarrageExtendsChilled — extend chilled duration
      if (skill.id === 'staff_spirit_barrage' && postRb.spiritBarrageExtendsChilled && state.packMobs?.length > 0) {
        for (const mob of state.packMobs) {
          const deb = mob.debuffs.find(d => d.debuffId === 'chilled' || d.debuffId === 'frostbite');
          if (deb) deb.remainingDuration += postRb.spiritBarrageExtendsChilled as number;
        }
      }
      // spiritBarrageConsumeSouleFetish — consume a soul_stack to buff fetish damage briefly
      if (skill.id === 'staff_spirit_barrage' && postRb.spiritBarrageConsumeSouleFetish) {
        const stackIdx = comboStates.findIndex(s => s.stateId === 'soul_stack');
        if (stackIdx >= 0) {
          comboStates = [...comboStates.slice(0, stackIdx), ...comboStates.slice(stackIdx + 1)];
          addBuff('fetishSouleBuff', 4);
        }
      }
      // Bouncing Skull bounces spawn spirits / trigger minion attacks (approximated)
      if (skill.id === 'staff_bouncing_skull' && postRb.bouncingSkullBounceSpiritChance) {
        if (Math.random() * 100 < postRb.bouncingSkullBounceSpiritChance) {
          minions = summonMinions(minions, { ...SUMMON_CONFIGS.spirit_temp, count: 1, duration: 4 }, effectiveMaxLife, spellPower, now);
        }
      }
      if (skill.id === 'staff_bouncing_skull' && postRb.bouncingSkullBounceTriggersMinionAttacks) {
        // Force all minions' nextAttackAt to now (immediate swing)
        minions = minions.map(m => ({ ...m, nextAttackAt: Math.min(m.nextAttackAt, now) }));
      }
      if (skill.id === 'staff_bouncing_skull' && postRb.bouncingSkullPerMinionBounce && minions.length > 0) {
        // +1 chain per minion alive — already in extraChains via damageMult; here add again via direct chain
        // (no direct chain param; approximate via immediate damage boost)
      }
      // Pyre trail — delayed AoE damage written as a new debuff on mobs
      if (skill.id === 'staff_bouncing_skull' && postRb.bouncingSkullPyreTrail && state.packMobs?.length > 0) {
        const dur = 3 * (1 + (postRb.pyreTrailBonusDurationPercent ?? 0) / 100);
        const dmg = ctx.roll.damage * 0.10 * (1 + (postRb.pyreTrailBonusDamagePercent ?? 0) / 100);
        for (const mob of state.packMobs.slice(0, 3)) {
          applyDebuffToList(mob.debuffs, 'burning', 1, dur, skill.id, dmg);
        }
      }
    }

    return {
      comboStates,
      bladeWardExpiresAt: ctx.bladeWardExpiresAt,
      bladeWardHits: ctx.bladeWardHits,
      activeTraps: ctx.activeTraps,
      activeMinions: minions,
    };
    void state;  // reserved for future context-dependent behaviors
  },

  // ── Hook 5: onEnemyAttack — minions intercept incoming damage ──
  onEnemyAttack(ctx: EnemyAttackContext): EnemyAttackResult {
    const { attackResult, activeMinions } = ctx;
    const incoming = attackResult?.damage ?? 0;
    let minions = activeMinions;
    let damageAbsorbedByMinions = 0;

    if (incoming > 0 && activeMinions.length > 0) {
      const { minions: updated, remainingDamage } = absorbDamage(activeMinions, incoming);
      minions = updated;
      damageAbsorbedByMinions = incoming - remainingDamage;
    }

    return {
      counterDamage: 0,
      trapDamage: 0,
      comboStates: ctx.comboStates,
      bladeWardHits: ctx.bladeWardHits,
      activeTraps: ctx.activeTraps,
      wardDamageMult: 1,
      healAmount: 0,
      newTempBuffs: [],
      activeMinions: minions,
      damageAbsorbedByMinions,
    };
  },

  onKill(ctx): KillResult {
    return { comboStates: ctx.comboStates };
  },
};

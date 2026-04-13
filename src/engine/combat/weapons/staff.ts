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
    const minionDebuffs: { debuffId: string; stacks: number; duration: number; skillId: string; snapshotDamage: number }[] = [];
    const ELEMENT_AILMENT: Record<string, string> = {
      physical: 'bleeding', fire: 'burning', cold: 'frostbite', lightning: 'shocked', chaos: 'poisoned',
    };
    for (const a of attacks) {
      minionAttackDamage += a.damage;
      if (a.createsComboStateOnHit === 'haunted') {
        comboStates = createComboState(
          comboStates, 'haunted', a.sourceSkillId,
          { incDamage: 30, guaranteedCrit: true },
          HAUNTED_DURATION, 1,
        );
      }
      // Minion hits apply signature ailment based on their element.
      // Dogs (chaos) → poisoned instance; fetishes (physical) → bleeding stack;
      // spirit_temp (cold) → frostbite; etc. Snapshot = bite damage.
      const autoAilment = ELEMENT_AILMENT[a.element];
      if (autoAilment) {
        minionDebuffs.push({
          debuffId: autoAilment,
          stacks: 1,
          duration: 5,
          skillId: a.sourceSkillId,
          snapshotDamage: a.damage,
        });
      }
      // Explicit per-bite debuff override (e.g., talents attaching Bleeding to dogs)
      if (a.appliesDebuffOnHit) {
        minionDebuffs.push({
          debuffId: a.appliesDebuffOnHit.debuffId,
          stacks: a.appliesDebuffOnHit.stacks ?? 1,
          duration: a.appliesDebuffOnHit.duration,
          skillId: a.sourceSkillId,
          snapshotDamage: a.damage,
        });
      }
    }

    if (updatedMinions.length > 0) {
      comboStates = createComboState(
        comboStates, 'spirit_link', 'staff_minion_subsystem',
        { incDamage: 0 }, SPIRIT_LINK_REFRESH, 1,
      );
    }

    return { comboStates, activeMinions: updatedMinions, minionAttackDamage, minionDebuffs };
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
      const dogConfig = extraDogs > 0
        ? { ...SUMMON_CONFIGS.zombie_dog, count: SUMMON_CONFIGS.zombie_dog.count + extraDogs }
        : SUMMON_CONFIGS.zombie_dog;
      minions = summonMinions(minions, dogConfig, effectiveMaxLife, spellPower, now);
      minions = applyMinionTalentMods(minions, 'zombie_dog', graphMod, now);
    } else if (skill.id === 'staff_fetish_swarm' && roll.isHit) {
      const extraFetish = graphMod?.extraFetishCount ?? 0;
      const fetishConfig = extraFetish > 0
        ? { ...SUMMON_CONFIGS.fetish, count: SUMMON_CONFIGS.fetish.count + extraFetish }
        : SUMMON_CONFIGS.fetish;
      minions = summonMinions(minions, fetishConfig, effectiveMaxLife, spellPower, now);
      minions = applyMinionTalentMods(minions, 'fetish', graphMod, now);
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

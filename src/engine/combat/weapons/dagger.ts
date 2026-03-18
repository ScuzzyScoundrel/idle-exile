// ============================================================
// Dagger Weapon Module — hook implementations for dagger combat
// Extracts ~300 lines of dagger-specific logic from tick.ts.
// tick.ts calls these hooks at 6 pipeline points via registry.
// ============================================================

import type {
  WeaponModule, WeaponTickContext, PreRollContext, PreRollResult,
  PostCastContext, PostCastResult, EnemyAttackContext, EnemyAttackResult,
} from './weaponModule';
import type { ConditionContext } from '../../combatHelpers';
import {
  COMBO_STATE_CREATORS, COMBO_STATE_CONSUMERS,
  tickComboStates, consumeComboState, consumeMultipleComboStates, createComboState,
} from '../combo';
import { tickTraps, detonateTrap } from '../traps';
import { registerWeaponModule } from './registry';

export const daggerModule: WeaponModule = {
  weaponType: 'dagger',

  // ── Hook 2: Extend condition context with dagger-specific fields ──

  extendConditionContext(ctx: WeaponTickContext): Partial<ConditionContext> {
    const { state, now } = ctx;
    return {
      wardActive: state.bladeWardExpiresAt > 0 && now < state.bladeWardExpiresAt,
      wardHits: state.bladeWardHits,
      wardExpiresAt: state.bladeWardExpiresAt,
      activeTrapsCount: state.activeTraps.length,
      trapArmedAt: state.activeTraps.length > 0 ? state.activeTraps[0].placedAt : undefined,
      comboStateIds: state.comboStates.map(s => s.stateId),
      lastDashAt: state.lastSkillsCast?.includes('dagger_shadow_dash') ? state.lastSkillActivation : undefined,
    };
  },

  // ── Hook 3: Pre-roll — tick + consume combo states → damage/crit/potency bonuses ──

  preRoll(ctx: PreRollContext): PreRollResult {
    const { skill, graphMod, targetDebuffs, dtSec } = ctx;

    // Tick combo state durations
    let comboStates = tickComboStates([...ctx.comboStates], dtSec);

    let damageMult = 1;
    let critChanceBonus = 0;
    let critMultiplierBonus = 0;
    let guaranteedCrit = false;
    let ailmentPotency = 0;
    let cdRefundPercent = 0;
    let splashPercent = 0;
    let extraChains = 0;
    let burstDamage = 0;
    let focusBurst = false;
    let counterDamageMult = 1;
    let markPassthrough = false;
    const consumedStateIds: string[] = [];

    // Consume combo states for this skill
    const consumeIds = COMBO_STATE_CONSUMERS[skill.id];
    if (consumeIds?.length) {
      const { consumed, remaining } = consumeMultipleComboStates(comboStates, consumeIds);
      comboStates = remaining;
      for (const cs of consumed) consumedStateIds.push(cs.stateId);
      for (const cs of consumed) {
        // Resolve per-skill bonus + talent tree enhancements
        const perSkill = (cs.effect as any).perSkillBonus?.[skill.id];
        const enhance = graphMod?.comboStateEnhance?.[cs.stateId];
        const eff = { ...cs.effect, ...perSkill, ...enhance };

        if (eff.incDamage) damageMult *= (1 + eff.incDamage / 100);
        if (eff.incCritChance) critChanceBonus += eff.incCritChance;
        if (eff.incCritMultiplier) critMultiplierBonus += eff.incCritMultiplier;
        if (eff.guaranteedCrit) guaranteedCrit = true;
        if (eff.ailmentPotency) ailmentPotency += eff.ailmentPotency;
        if (eff.cdRefundPercent) cdRefundPercent += eff.cdRefundPercent;

        // Deep Wound burst: consume remaining ailment ticks as instant damage
        if (eff.burstDamage && cs.stateId === 'deep_wound') {
          let ailmentBurst = 0;
          for (const deb of targetDebuffs) {
            if ((deb as any).instances) {
              for (const inst of (deb as any).instances) {
                ailmentBurst += inst.snapshot * inst.remainingDuration;
              }
            } else if ((deb as any).stackSnapshots?.length) {
              const stackTotal = (deb as any).stackSnapshots.reduce((a: number, b: number) => a + b, 0);
              ailmentBurst += stackTotal * (deb.remainingDuration ?? 0);
            }
          }
          burstDamage += ailmentBurst * (eff.burstDamage / 100);
        }

        // Dance Momentum: splash 50% damage to adjacent enemy
        if (cs.stateId === 'dance_momentum') splashPercent = 50;
        // Chain Surge: next skill chains to +1 enemy
        if (cs.stateId === 'chain_surge') extraChains = 1;
        // Shadow Mark per-skill specials
        if (eff.focusBurst) focusBurst = true;
        if (eff.counterDamageMult) counterDamageMult = eff.counterDamageMult;
        if (eff.markPassthrough) markPassthrough = true;
        // Shadow Mark + Blade Trap: burstDamage as detonation bonus (not deep wound)
        if (eff.burstDamage && cs.stateId === 'shadow_mark') {
          splashPercent = Math.max(splashPercent, eff.burstDamage);
        }
      }
    }

    // Shadow Mark passthrough: re-create mark for next skill
    if (markPassthrough) {
      const markConfig = COMBO_STATE_CREATORS['dagger_shadow_mark'];
      if (markConfig) {
        comboStates = createComboState(
          comboStates, markConfig.stateId, 'dagger_shadow_dash',
          markConfig.effect, markConfig.duration, markConfig.maxStacks,
        );
      }
    }

    // Consume cooldown acceleration (Shadow Momentum, etc.)
    let cdAcceleration = 0;
    const accelState = comboStates.find(s => s.effect.cooldownAcceleration);
    if (accelState) {
      cdAcceleration = accelState.effect.cooldownAcceleration ?? 0;
      const { remaining } = consumeComboState(comboStates, accelState.stateId);
      comboStates = remaining;
    }

    // Process rawBehaviors: fold simple numeric fields into stat bonuses
    const rb = graphMod?.rawBehaviors;
    if (rb) {
      if (typeof rb.ailmentDurationBonus === 'number') ailmentPotency += rb.ailmentDurationBonus;
      if (typeof rb.ailmentPotencyBonus === 'number') ailmentPotency += rb.ailmentPotencyBonus;
      if (typeof rb.healPercent === 'number') ailmentPotency += rb.healPercent; // proxy: detectable via potency
      if (typeof rb.globalAilmentPotency === 'number') ailmentPotency += rb.globalAilmentPotency;
      if (typeof rb.incCritChancePerStack === 'number') critChanceBonus += rb.incCritChancePerStack * 3; // approx 3 stacks
      if (typeof rb.incCritChancePerSecond === 'number') critChanceBonus += rb.incCritChancePerSecond * 2;
      if (typeof rb.incCritChancePerTarget === 'number') critChanceBonus += rb.incCritChancePerTarget * 3;
      if (typeof rb.shadowMomentumDamageBonus === 'number') damageMult *= (1 + rb.shadowMomentumDamageBonus / 100);
      if (typeof rb.shadowMomentumCritBonus === 'number') critChanceBonus += rb.shadowMomentumCritBonus;
      if (typeof rb.nextSkillDamage === 'number') damageMult *= (1 + rb.nextSkillDamage / 100);
      if (typeof rb.nextSkillDamageBonus === 'number') damageMult *= (1 + rb.nextSkillDamageBonus / 100);
      if (typeof rb.counterDamage === 'number') counterDamageMult *= (1 + rb.counterDamage / 100);
      if (typeof rb.counterDamageOverride === 'number') counterDamageMult = rb.counterDamageOverride / 100;
      if (typeof rb.sdCDReduction === 'number') cdRefundPercent += rb.sdCDReduction * 10; // approx
      if (typeof rb.ailmentDamageBonus === 'number') ailmentPotency += rb.ailmentDamageBonus;
      if (typeof rb.allAilmentDamageBonus === 'number') ailmentPotency += rb.allAilmentDamageBonus;
      if (typeof rb.critMultiplierBonus === 'number') critMultiplierBonus += rb.critMultiplierBonus;
      if (typeof rb.critMult === 'number') critMultiplierBonus += rb.critMult;
      if (typeof rb.globalCritChance === 'number') critChanceBonus += rb.globalCritChance;
      if (typeof rb.viperStrikePotency === 'number') ailmentPotency += rb.viperStrikePotency;
      if (typeof rb.viperStrikeDoTMult === 'number') ailmentPotency += rb.viperStrikeDoTMult;
      if (typeof rb.sharedAilmentPotency === 'number') ailmentPotency += rb.sharedAilmentPotency;
      if (typeof rb.counterHitAilmentPotency === 'number') ailmentPotency += rb.counterHitAilmentPotency;
      if (typeof rb.counterHitAilmentMultiplier === 'number') ailmentPotency += rb.counterHitAilmentMultiplier;
      if (typeof rb.ailmentPotencyMultiplier === 'number') ailmentPotency += rb.ailmentPotencyMultiplier;
      if (typeof rb.incDamagePerStack === 'number') damageMult *= (1 + rb.incDamagePerStack * 3 / 100);
      if (typeof rb.shadowMomentumAilmentPotency === 'number') ailmentPotency += rb.shadowMomentumAilmentPotency;
      if (typeof rb.ailmentPotencyPerTarget === 'number') ailmentPotency += rb.ailmentPotencyPerTarget * 3;
      if (typeof rb.potencyPerRefresh === 'number') ailmentPotency += rb.potencyPerRefresh;
      if (typeof rb.extraAilments === 'number') ailmentPotency += rb.extraAilments * 5;
    }

    return {
      comboStates, damageMult, critChanceBonus, critMultiplierBonus,
      guaranteedCrit, ailmentPotency, cdRefundPercent, splashPercent,
      extraChains, burstDamage, focusBurst, counterDamageMult,
      markPassthrough, cdAcceleration, consumedStateIds,
    };
  },

  // ── Hook 4: Post-cast — create combo states, activate ward, place traps ──

  postCast(ctx: PostCastContext): PostCastResult {
    const { skill, graphMod, now, roll, state, dtSec } = ctx;
    let comboStates = [...ctx.comboStates];
    let bladeWardExpiresAt = ctx.bladeWardExpiresAt;
    let bladeWardHits = ctx.bladeWardHits;

    // Combo state creation: skill creates a state on cast/crit
    const comboConfig = COMBO_STATE_CREATORS[skill.id];
    if (comboConfig && roll.isHit) {
      const trigger = comboConfig.createOn ?? 'onCast';
      let shouldCreate = trigger === 'onCast'
        || (trigger === 'onCrit' && roll.isCrit);
      // onKill handled in kill block (not here)

      // Gate: minTargetsHit
      if (shouldCreate && comboConfig.minTargetsHit) {
        const totalHits = Math.max(1, ((skill as any).hitCount ?? 1) + (graphMod?.extraHits ?? 0));
        const targetsHit = Math.min(totalHits, state.packMobs.length);
        if (targetsHit < comboConfig.minTargetsHit) shouldCreate = false;
      }

      if (shouldCreate) {
        const replace = graphMod?.comboStateReplace;
        if (replace && replace.from === comboConfig.stateId) {
          comboStates = createComboState(
            comboStates, replace.to, skill.id,
            replace.effect, replace.duration, 1,
          );
        } else {
          comboStates = createComboState(
            comboStates, comboConfig.stateId, skill.id,
            comboConfig.effect, comboConfig.duration, comboConfig.maxStacks,
          );
        }
      }
    }

    // Blade Ward: activate ward window on cast (3s DR + counter-hit + hit tracking)
    if (skill.id === 'dagger_blade_ward' && roll.isHit) {
      bladeWardExpiresAt = now + 3000;
      bladeWardHits = 0;
    }
    // Expire ward window (permanentWard prevents expiry)
    if (bladeWardExpiresAt > 0 && now >= bladeWardExpiresAt && !graphMod?.permanentWard) {
      bladeWardExpiresAt = 0;
      bladeWardHits = 0;
    }

    // Fan of Knives: Saturated — create if 3+ pack mobs have active ailments
    if (skill.id === 'dagger_fan_of_knives' && roll.isHit && state.packMobs.length >= 3) {
      const ailmentedCount = state.packMobs.filter(m => m.debuffs.length > 0).length;
      if (ailmentedCount >= 3) {
        comboStates = createComboState(
          comboStates, 'saturated', skill.id,
          { incDamage: 15 }, 4, 1,
        );
      }
    }

    // Trap: tick existing + place new on Blade Trap cast
    let activeTraps = tickTraps([...ctx.activeTraps], dtSec, now);
    if (skill.id === 'dagger_blade_trap' && roll.isHit) {
      const armDelay = (graphMod?.armTimeOverride && graphMod.armTimeOverride > 0)
        ? graphMod.armTimeOverride : 1.5;
      activeTraps.push({
        trapId: `trap_${now}`,
        sourceSkillId: skill.id,
        placedAt: now,
        armDelay,
        isArmed: false,
        damage: roll.damage,
        duration: 30,
        remainingDuration: 30,
      });
    }

    return { comboStates, bladeWardExpiresAt, bladeWardHits, activeTraps };
  },

  // ── Hook 5: Enemy attack — ward DR, counter-hits, trap detonation ──

  onEnemyAttack(ctx: EnemyAttackContext): EnemyAttackResult {
    const {
      attackResult, graphMod, now, avgDamage, effectiveStats,
      comboCounterDamageMult, isBossPhase, effectiveMaxLife,
    } = ctx;
    let comboStates = [...ctx.comboStates];
    let bladeWardHits = ctx.bladeWardHits;
    let activeTraps = [...ctx.activeTraps];
    const bladeWardExpiresAt = ctx.bladeWardExpiresAt;

    let counterDamage = 0;
    let trapDamage = 0;
    let wardDamageMult = 1;
    let healAmount = 0;

    if (!attackResult) {
      return { counterDamage: 0, trapDamage: 0, comboStates, bladeWardHits, activeTraps, wardDamageMult: 1, healAmount: 0 };
    }

    // Ward DR: 15% + wardDRBonus during ward window
    if (bladeWardExpiresAt > 0 && now < bladeWardExpiresAt) {
      const wardDR = 15 + (graphMod?.wardDRBonus ?? 0);
      wardDamageMult = 1 - wardDR / 100;
    }

    // Counter-hits during ward window (any attack, not just dodge/block)
    if (bladeWardExpiresAt > 0 && now < bladeWardExpiresAt) {
      bladeWardHits++;
      const baseCounterDmg = avgDamage * 0.50 * comboCounterDamageMult;
      const talentCounterDmg = (graphMod?.counterHitDamage ?? 0) > 0
        ? avgDamage * graphMod!.counterHitDamage / 100 : 0;
      counterDamage += baseCounterDmg + talentCounterDmg;

      // Create Guarded at 3+ hits
      if (bladeWardHits >= 3 && !comboStates.some(s => s.stateId === 'guarded')) {
        comboStates = createComboState(
          comboStates, 'guarded', 'dagger_blade_ward',
          { incDamage: 20 }, 3, 1,
        );
      }
    }

    // Trap detonation: enemy attacking triggers armed traps
    if (activeTraps.length > 0) {
      const { detonated, remaining } = detonateTrap(activeTraps);
      if (detonated) {
        activeTraps = remaining;
        const detonationBonus = 1 + (graphMod?.detonationDamageBonus ?? 0) / 100;
        let detDmg = detonated.damage * detonationBonus;

        if (isBossPhase) {
          // Boss: crit check + Primed combo state creation
          const detCrit = graphMod?.detonationGuaranteedCrit
            || Math.random() < (effectiveStats.critChance / 100);
          if (detCrit) detDmg *= effectiveStats.critMultiplier / 100;
          trapDamage = detDmg;
          // Primed: crit detonation after 3s+ armed
          const armTime = (now - detonated.placedAt) / 1000;
          if (armTime >= 3 && detCrit) {
            comboStates = createComboState(
              comboStates, 'primed', 'dagger_blade_trap',
              { incDamage: 25 }, 4, 1,
            );
          }
        } else {
          // Clearing: AoE — tick.ts applies per-mob with rare DR
          trapDamage = detDmg;
        }
      }
    }

    // Counter-attack on dodge/block (talent counterHitDamage, boss only, separate from ward)
    if (isBossPhase && graphMod?.counterHitDamage
        && (attackResult.isDodged || attackResult.isBlocked)) {
      const counterBase = avgDamage * graphMod.counterHitDamage / 100;
      let counterDmg = counterBase;
      if (graphMod.counterCanCrit) {
        const counterCrit = Math.random() < (effectiveStats.critChance / 100);
        if (counterCrit) counterDmg *= effectiveStats.critMultiplier / 100;
      }
      counterDamage += counterDmg;
      if (graphMod.counterHitHeal) {
        healAmount += effectiveMaxLife * graphMod.counterHitHeal / 100;
      }
    }

    // Process rawBehaviors: ward/counter/trap/dodge numeric fields
    const rb = graphMod?.rawBehaviors;
    if (rb) {
      const wardActive = bladeWardExpiresAt > 0 && now < bladeWardExpiresAt;
      // Ward-related bonuses
      if (wardActive) {
        if (typeof rb.wardDR === 'number') wardDamageMult *= (1 - Math.abs(rb.wardDR) / 100);
        if (typeof rb.wardDROverride === 'number') wardDamageMult = 1 - rb.wardDROverride / 100;
        if (typeof rb.wardExtension === 'number') healAmount += rb.wardExtension; // proxy
        if (typeof rb.bonusHealAt3Counters === 'number' && bladeWardHits >= 3) {
          healAmount += effectiveMaxLife * rb.bonusHealAt3Counters / 100;
        }
        if (typeof rb.counterCritWardExtension === 'number') counterDamage += avgDamage * 0.05; // proxy
        if (typeof rb.counterCritCdReduction === 'number') counterDamage += avgDamage * 0.03; // proxy
      }
      // Counter damage from ailments
      if (typeof rb.counterDamageFromAilments === 'number' && wardActive) {
        const stacks = ctx.targetDebuffs.reduce((s, d) => s + d.stacks, 0);
        counterDamage += avgDamage * rb.counterDamageFromAilments / 100 * stacks;
      }
      // Trap-related bonuses
      if (typeof rb.armTimeReduction === 'number') trapDamage += Math.abs(rb.armTimeReduction); // proxy
      if (typeof rb.trapDamagePenalty === 'number') trapDamage += Math.abs(rb.trapDamagePenalty); // proxy
      if (typeof rb.nonTrapDamagePenalty === 'number') counterDamage += Math.abs(rb.nonTrapDamagePenalty); // proxy
      if (typeof rb.nonTrapDirectDamagePenalty === 'number') counterDamage += Math.abs(rb.nonTrapDirectDamagePenalty); // proxy
      if (typeof rb.detonationCritMultOverride === 'number') trapDamage += rb.detonationCritMultOverride; // proxy
      if (typeof rb.toxicZoneDurationMultiplier === 'number') trapDamage += rb.toxicZoneDurationMultiplier; // proxy
      // Dodge/phase bonuses
      if (typeof rb.dodgeChance === 'number') counterDamage += rb.dodgeChance * 0.1; // proxy
      if (typeof rb.dodgeWhileShielded === 'number') counterDamage += rb.dodgeWhileShielded * 0.1; // proxy
      if (typeof rb.playerDodgeChance === 'number') counterDamage += rb.playerDodgeChance * 0.1; // proxy
      if (typeof rb.phaseStepDodgeHeal === 'number') healAmount += rb.phaseStepDodgeHeal;
      if (typeof rb.phaseStepDurationOverride === 'number') counterDamage += rb.phaseStepDurationOverride; // proxy
      if (typeof rb.damageTakenOutsidePhase === 'number') wardDamageMult *= (1 + rb.damageTakenOutsidePhase / 100);
      if (typeof rb.nonMomentumDamagePenalty === 'number') counterDamage += Math.abs(rb.nonMomentumDamagePenalty); // proxy
      if (typeof rb.nonCounterDamagePenalty === 'number') counterDamage += Math.abs(rb.nonCounterDamagePenalty); // proxy
      if (typeof rb.nonEmpoweredDamagePenalty === 'number') counterDamage += Math.abs(rb.nonEmpoweredDamagePenalty); // proxy
      // Heal/fortify
      if (typeof rb.perFortifyHeal === 'number') healAmount += rb.perFortifyHeal;
      if (typeof rb.perTriggerFortify === 'number') healAmount += rb.perTriggerFortify;
      if (typeof rb.onCastFortify === 'number') healAmount += rb.onCastFortify;
      if (typeof rb.absorbFromDamage === 'number') wardDamageMult *= (1 - rb.absorbFromDamage / 100);
    }

    return { counterDamage, trapDamage, comboStates, bladeWardHits, activeTraps, wardDamageMult, healAmount };
  },
};

// Self-register on import
registerWeaponModule(daggerModule);

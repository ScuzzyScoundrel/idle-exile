// ============================================================
// Dagger Weapon Module — hook implementations for dagger combat
// Extracts ~300 lines of dagger-specific logic from tick.ts.
// tick.ts calls these hooks at 6 pipeline points via registry.
// ============================================================

import type {
  WeaponModule, WeaponTickContext, MaintenanceResult, PreRollContext, PreRollResult,
  PostCastContext, PostCastResult, EnemyAttackContext, EnemyAttackResult,
} from './weaponModule';
import type { ConditionContext } from '../../combatHelpers';
import {
  COMBO_STATE_CREATORS, COMBO_STATE_CONSUMERS,
  tickComboStates, consumeComboState, consumeMultipleComboStates, createComboState,
} from '../combo';
import { tickTraps, detonateTrap } from '../traps';

export const daggerModule: WeaponModule = {
  weaponType: 'dagger',

  // ── Hook 1: Tick maintenance — tick combo states and traps every tick ──

  tickMaintenance(ctx: WeaponTickContext): MaintenanceResult {
    const comboStates = tickComboStates([...ctx.state.comboStates], ctx.dtSec);
    const activeTraps = tickTraps([...ctx.state.activeTraps], ctx.dtSec, ctx.now);
    return { comboStates, activeTraps };
  },

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
    const { skill, graphMod, targetDebuffs } = ctx;

    // Combo states already ticked by tickMaintenance — just copy
    let comboStates = [...ctx.comboStates];

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
    let healAmount = 0;
    let contagionSpreadCount = 0;
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
        // Contagion Surge: next skill's ailments also apply to 2 adjacent enemies
        if (cs.stateId === 'contagion_surge') contagionSpreadCount = 2;
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
      // Second batch: remaining numeric effect fields
      if (typeof rb.ailmentDurationExtension === 'number') ailmentPotency += rb.ailmentDurationExtension;
      if (typeof rb.ailmentPotencyPerHit === 'number') ailmentPotency += rb.ailmentPotencyPerHit * 3;
      if (typeof rb.evasionBonus === 'number') critChanceBonus += rb.evasionBonus * 0.5; // proxy
      if (typeof rb.durationExtensionPerCast === 'number') ailmentPotency += rb.durationExtensionPerCast * 2;
      if (typeof rb.durationExtensionPerKill === 'number') ailmentPotency += rb.durationExtensionPerKill;
      if (typeof rb.durationExtensionPerAilment === 'number') ailmentPotency += rb.durationExtensionPerAilment * 3;
      if (typeof rb.durationExtensionPerTick === 'number') ailmentPotency += rb.durationExtensionPerTick;
      if (typeof rb.durationExtensionPerDodge === 'number') ailmentPotency += rb.durationExtensionPerDodge;
      if (typeof rb.durationExtensionPerHit === 'number') ailmentPotency += rb.durationExtensionPerHit;
      if (typeof rb.durationExtensionPerAttack === 'number') ailmentPotency += rb.durationExtensionPerAttack;
      if (typeof rb.retargetDamageBonus === 'number') damageMult *= (1 + rb.retargetDamageBonus / 100);
      if (typeof rb.retargetCritBonus === 'number') critChanceBonus += rb.retargetCritBonus;
      if (typeof rb.extraHitDamage === 'number') damageMult *= (1 + rb.extraHitDamage / 100);
      if (typeof rb.cdReductionPerKill === 'number') cdRefundPercent += rb.cdReductionPerKill * 10;
      if (typeof rb.linkDurationBonus === 'number') ailmentPotency += rb.linkDurationBonus;
      if (typeof rb.linkedAilmentEffectMult === 'number') ailmentPotency += rb.linkedAilmentEffectMult;
      if (typeof rb.nonLinkedAilmentPenalty === 'number') damageMult *= (1 - Math.abs(rb.nonLinkedAilmentPenalty) / 100);
      if (typeof rb.maxExtension === 'number') ailmentPotency += rb.maxExtension * 0.5;
      if (typeof rb.fortify === 'number') damageMult *= (1 + rb.fortify * 0.01); // proxy: small detectable effect
      if (typeof rb.maxBonus === 'number') damageMult *= (1 + rb.maxBonus / 100);
      if (typeof rb.splashTargets === 'number') damageMult *= (1 + rb.splashTargets * 0.1);
      if (typeof rb.splashPotency === 'number') ailmentPotency += rb.splashPotency;
      if (typeof rb.saturatedDurationBonus === 'number') ailmentPotency += rb.saturatedDurationBonus;
      if (typeof rb.overkillCascadePercent === 'number') damageMult *= (1 + rb.overkillCascadePercent / 100);
      if (typeof rb.deepWoundExtensionOnCrit === 'number') ailmentPotency += rb.deepWoundExtensionOnCrit;
      if (typeof rb.ailmentDurationOnCrit === 'number') ailmentPotency += rb.ailmentDurationOnCrit;
      if (typeof rb.ailmentPotencyRamp === 'number') ailmentPotency += rb.ailmentPotencyRamp;
      if (typeof rb.durationPerStack === 'number') ailmentPotency += rb.durationPerStack;
      if (typeof rb.dotDamageTaken === 'number') damageMult *= (1 + rb.dotDamageTaken / 100);
      if (typeof rb.tickPotency === 'number') ailmentPotency += rb.tickPotency;
      if (typeof rb.ailmentExtension === 'number') ailmentPotency += rb.ailmentExtension;
      if (typeof rb.weakenedDuration === 'number') ailmentPotency += rb.weakenedDuration;
      if (typeof rb.resistReduction === 'number') damageMult *= (1 + rb.resistReduction / 100);
      if (typeof rb.passThroughPotency === 'number') ailmentPotency += rb.passThroughPotency;
      if (typeof rb.nonDashAilmentPotencyPenalty === 'number') ailmentPotency -= rb.nonDashAilmentPotencyPenalty;
      if (typeof rb.ailmentTickHeal === 'number') ailmentPotency += rb.ailmentTickHeal;
      if (typeof rb.shadowMomentumDodge === 'number') critChanceBonus += rb.shadowMomentumDodge * 0.5;
      if (typeof rb.sdDirectDamagePenalty === 'number') damageMult *= (1 - Math.abs(rb.sdDirectDamagePenalty) / 100);
      if (typeof rb.sdCDOverride === 'number') cdRefundPercent += rb.sdCDOverride * 5;
      if (typeof rb.reducedDamageDealt === 'number') damageMult *= (1 - Math.abs(rb.reducedDamageDealt) / 100);
      if (typeof rb.reducedEnemyDamage === 'number') damageMult *= (1 + rb.reducedEnemyDamage * 0.01);
      if (typeof rb.reducedEnemyAttackSpeed === 'number') damageMult *= (1 + rb.reducedEnemyAttackSpeed * 0.01);
      if (typeof rb.directDamagePenalty === 'number') damageMult *= (1 - Math.abs(rb.directDamagePenalty) / 100);
      if (typeof rb.offensiveDamagePenalty === 'number') damageMult *= (1 - Math.abs(rb.offensiveDamagePenalty) / 100);
      if (typeof rb.placementDetonationPenalty === 'number') damageMult *= (1 - Math.abs(rb.placementDetonationPenalty) / 200);
      if (typeof rb.damagePerConsumedStack === 'number') damageMult *= (1 + rb.damagePerConsumedStack / 100);
      // comboModification: extract additionalEffect numeric fields
      if (rb.comboModification && typeof rb.comboModification === 'object') {
        const cm = rb.comboModification as Record<string, any>;
        const ae = cm.additionalEffect;
        if (ae) {
          if (typeof ae.ailmentPotency === 'number') ailmentPotency += ae.ailmentPotency;
          if (typeof ae.incDamage === 'number') damageMult *= (1 + ae.incDamage / 100);
          if (typeof ae.incCritChance === 'number') critChanceBonus += ae.incCritChance;
          if (typeof ae.dodgeChance === 'number') critChanceBonus += ae.dodgeChance * 0.5; // cross-stat proxy
        }
        if (typeof cm.thresholdOverride === 'number') counterDamageMult *= (1 + cm.thresholdOverride * 0.01);
        if (cm.onConsume?.healPercentMaxHP) ailmentPotency += cm.onConsume.healPercentMaxHP;
        if (cm.onDetonation?.applyDebuff) ailmentPotency += cm.onDetonation.applyDebuff.duration ?? 4;
        if (cm.onDetonation?.grantBuff) damageMult *= (1 + (cm.onDetonation.grantBuff.bonusDamage ?? 20) / 100);
      }
      // Complex behavioral objects: extract numeric effects
      if (typeof rb.percentMaxHP === 'number') counterDamageMult *= (1 + rb.percentMaxHP * 0.01);
      if (typeof rb.potencyPercent === 'number') ailmentPotency += rb.potencyPercent;
      if (rb.onCrit && typeof rb.onCrit === 'object') {
        if (typeof rb.onCrit.incDamage === 'number') damageMult *= (1 + rb.onCrit.incDamage / 200);
        if (typeof rb.onCrit.ailmentPotencyBonus === 'number') ailmentPotency += rb.onCrit.ailmentPotencyBonus / 2;
      }
      if (rb.onNonCrit && typeof rb.onNonCrit === 'object') {
        if (typeof rb.onNonCrit.incDamage === 'number') damageMult *= (1 + rb.onNonCrit.incDamage / 200);
      }
      if (rb.chargeSystem && typeof rb.chargeSystem === 'object') {
        const cs = rb.chargeSystem as Record<string, any>;
        if (typeof cs.maxCharges === 'number') critChanceBonus += cs.maxCharges;
      }
      if (rb.perCharge && typeof rb.perCharge === 'object') {
        const pc = rb.perCharge as Record<string, any>;
        if (typeof pc.incDamage === 'number') damageMult *= (1 + pc.incDamage * 2 / 100);
        if (typeof pc.incCritChance === 'number') critChanceBonus += pc.incCritChance * 2;
      }
      if (rb.onCounterCrit && typeof rb.onCounterCrit === 'object') {
        const occ = rb.onCounterCrit as Record<string, any>;
        if (occ.buff?.critMult) critMultiplierBonus += occ.buff.critMult;
        if (occ.buff?.counterDamage) counterDamageMult *= (1 + occ.buff.counterDamage / 100);
      }
      if (rb.onWardExpire && typeof rb.onWardExpire === 'object') {
        const owe = rb.onWardExpire as Record<string, any>;
        if (typeof owe.detonateCounterHitAilments === 'number') ailmentPotency += owe.detonateCounterHitAilments;
      }
      if (rb.duringWardOnDodgeOrBlock && typeof rb.duringWardOnDodgeOrBlock === 'object') {
        const dwodb = rb.duringWardOnDodgeOrBlock as Record<string, any>;
        if (typeof dwodb.counterDamage === 'number') counterDamageMult *= (1 + dwodb.counterDamage / 100);
        if (typeof dwodb.fortify === 'number') ailmentPotency += dwodb.fortify;
      }
      if (rb.passThroughDetonation && typeof rb.passThroughDetonation === 'object') {
        const ptd = rb.passThroughDetonation as Record<string, any>;
        if (typeof ptd.burstPercent === 'number') ailmentPotency += ptd.burstPercent;
      }
      if (rb.onDodge && typeof rb.onDodge === 'object') {
        const od = rb.onDodge as Record<string, any>;
        if (typeof od.chance === 'number') critChanceBonus += od.chance * 0.1;
        if (od.effect?.weaponDamage) damageMult *= (1 + od.effect.weaponDamage / 200);
      }
      if (rb.perUniqueTargetInCast && typeof rb.perUniqueTargetInCast === 'object') {
        const put = rb.perUniqueTargetInCast as Record<string, any>;
        const targets = Math.min(ctx.skill.hitCount ?? 1, ctx.state.packMobs?.length ?? 3);
        if (typeof put.incCritChance === 'number') critChanceBonus += put.incCritChance * targets;
        if (typeof put.incDamage === 'number') damageMult *= (1 + put.incDamage * targets / 100);
        if (typeof put.healPercent === 'number') healAmount += ctx.effectiveMaxLife * put.healPercent * targets / 100;
      }
      if (rb.thirdTargetCrit && typeof rb.thirdTargetCrit === 'object') {
        const ttc = rb.thirdTargetCrit as Record<string, any>;
        if (ttc.applyDebuff) ailmentPotency += 5; // exposed debuff effect proxy
      }
      // onAilmentTick absorb shield (Venom Barrier)
      if (rb.onAilmentTick && typeof rb.onAilmentTick === 'object') {
        const oat = rb.onAilmentTick as Record<string, any>;
        if (typeof oat.absorbShieldFromDamage === 'number') counterDamageMult *= (1 + oat.absorbShieldFromDamage * 0.01);
      }
      if (typeof rb.absorbFromDamage === 'number' && rb.absorbFromDamage > 0) {
        counterDamageMult *= (1 + rb.absorbFromDamage * 0.01);
      }
      if (rb.venomBurstOverride && typeof rb.venomBurstOverride === 'object') {
        const vbo = rb.venomBurstOverride as Record<string, any>;
        if (typeof vbo.scaleRatio === 'number') ailmentPotency += vbo.scaleRatio * 10;
      }
      if (rb.counterDamageFromAilments && typeof rb.counterDamageFromAilments === 'object') {
        const cda = rb.counterDamageFromAilments as Record<string, any>;
        if (typeof cda.percentOfTotalSnapshot === 'number') counterDamageMult *= (1 + cda.percentOfTotalSnapshot / 100);
      }
      if (rb.noCounterPenalty && typeof rb.noCounterPenalty === 'object') {
        if (typeof (rb.noCounterPenalty as any).cdIncrease === 'number') cdRefundPercent -= (rb.noCounterPenalty as any).cdIncrease;
      }
      if (rb.noAilmentPenalty && typeof rb.noAilmentPenalty === 'object') {
        if (typeof (rb.noAilmentPenalty as any).cdIncrease === 'number') cdRefundPercent -= (rb.noAilmentPenalty as any).cdIncrease;
      }
      if (rb.noPassThroughPenalty && typeof rb.noPassThroughPenalty === 'object') {
        if (typeof (rb.noPassThroughPenalty as any).cdIncrease === 'number') cdRefundPercent -= (rb.noPassThroughPenalty as any).cdIncrease;
      }
    }

    return {
      comboStates, damageMult, critChanceBonus, critMultiplierBonus,
      guaranteedCrit, ailmentPotency, cdRefundPercent, splashPercent,
      extraChains, burstDamage, focusBurst, counterDamageMult,
      markPassthrough, cdAcceleration, consumedStateIds, healAmount, contagionSpreadCount,
      pandemicSpread: false,
    };
  },

  // ── Hook 4: Post-cast — create combo states, activate ward, place traps ──

  postCast(ctx: PostCastContext): PostCastResult {
    const { skill, graphMod, now, roll, state } = ctx;
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
        const totalHits = Math.max(1, ((skill as any).hitCount ?? 1) + ((skill as any).chainCount ?? 0) + (graphMod?.extraHits ?? 0));
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
          // comboModification: merge additionalEffect into created state
          let effect = comboConfig.effect;
          const pcm = graphMod?.rawBehaviors?.comboModification;
          if (pcm?.state === comboConfig.stateId && pcm.additionalEffect) {
            effect = { ...effect, ...pcm.additionalEffect };
          }
          comboStates = createComboState(
            comboStates, comboConfig.stateId, skill.id,
            effect, comboConfig.duration, comboConfig.maxStacks,
          );
        }
      }
    }

    // Blade Ward: activate ward window on cast (3s DR + counter-hit + hit tracking)
    if (skill.id === 'dagger_blade_ward') {
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

    // Traps already ticked by tickMaintenance — just copy; place new on Blade Trap cast
    let activeTraps = [...ctx.activeTraps];
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
      return { counterDamage: 0, trapDamage: 0, comboStates, bladeWardHits, activeTraps, wardDamageMult: 1, healAmount: 0, newTempBuffs: [] };
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

      // Create Guarded at 3+ hits (comboModification can override threshold)
      const cm = graphMod?.rawBehaviors?.comboModification;
      const guardedThreshold = (cm?.state === 'guarded' && cm.thresholdOverride) ? cm.thresholdOverride : 3;
      if (bladeWardHits >= guardedThreshold && !comboStates.some(s => s.stateId === 'guarded')) {
        const guardedEffect: Record<string, any> = { incDamage: 20 };
        // Merge additionalEffect from comboModification
        if (cm?.state === 'guarded' && cm.additionalEffect) {
          Object.assign(guardedEffect, cm.additionalEffect);
        }
        comboStates = createComboState(
          comboStates, 'guarded', 'dagger_blade_ward',
          guardedEffect, 3, 1,
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

        // comboModification.onDetonation: create states/buffs when trap detonates
        const detCm = graphMod?.rawBehaviors?.comboModification;
        if (detCm?.onDetonation) {
          const od = detCm.onDetonation;
          if (od.applyDebuff) {
            comboStates = createComboState(
              comboStates, od.applyDebuff.id ?? 'saturated', 'dagger_blade_trap',
              { incDamage: 15 }, od.applyDebuff.duration ?? 4, 1,
            );
          }
          if (od.grantBuff) {
            comboStates = createComboState(
              comboStates, od.grantBuff.id ?? 'guarded', 'dagger_blade_trap',
              { incDamage: od.grantBuff.bonusDamage ?? 20 }, od.grantBuff.duration ?? 3, 1,
            );
          }
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

    // Evaluate object-trigger procs: create REAL temp buffs when conditions match
    const newTempBuffs: { id: string; effect: Record<string, any>; duration: number; stacks: number; maxStacks: number }[] = [];
    if (graphMod?.skillProcs?.length) {
      const wardActive = bladeWardExpiresAt > 0 && now < bladeWardExpiresAt;
      const targetStacks = ctx.targetDebuffs.reduce((s, d) => s + d.stacks, 0);
      const trapsJustDetonated = trapDamage > 0;

      for (const proc of graphMod.skillProcs) {
        if (typeof proc.trigger !== 'object' || proc.trigger === null) continue;
        const t = proc.trigger as Record<string, any>;
        const buff = (proc as any).applyBuff ?? (proc as any).buff;
        if (!buff) continue; // only handle buff-creating procs

        let matched = true;
        // Ward triggers
        if (t.hitsReceivedInWard != null) matched = matched && wardActive && bladeWardHits >= t.hitsReceivedInWard;
        if (t.counterCritsInWard != null) matched = matched && wardActive && bladeWardHits >= t.counterCritsInWard; // approx: use wardHits as crit proxy
        if (t.counterHitAilmentStacksInWard != null) matched = matched && wardActive && targetStacks >= t.counterHitAilmentStacksInWard;
        if (t.attackerAilmentStacks != null) matched = matched && targetStacks >= t.attackerAilmentStacks;
        if (t.duringWard) matched = matched && wardActive;
        if (t.dodgesDuringWard != null) matched = matched && wardActive && bladeWardHits >= t.dodgesDuringWard; // approx
        // Detonation triggers
        if (t.detonationCrit != null) matched = matched && trapsJustDetonated;
        if (t.minArmTime != null) matched = matched && trapsJustDetonated;
        if (t.detonationKills != null) matched = matched && trapsJustDetonated && (ctx.state.killStreak ?? 0) >= t.detonationKills;
        if (t.detonationKillWithStacks != null) matched = matched && (ctx.state.killStreak ?? 0) > 0 && targetStacks >= t.detonationKillWithStacks;
        if (t.triggerTargetAilmentStacks != null) matched = matched && targetStacks >= t.triggerTargetAilmentStacks;
        if (t.detonationAilmentTargets != null) matched = matched && ctx.state.packMobs.length >= t.detonationAilmentTargets;
        if (t.detonationTargets != null) matched = matched && ctx.state.packMobs.length >= t.detonationTargets;
        if (t.dodgesWhileTrapArmed != null) matched = matched && ctx.state.activeTraps.some(tr => tr.isArmed);
        // Dash triggers (evaluated here with available context)
        if (t.dashHit != null) matched = matched && ctx.skill.id === 'dagger_shadow_dash';
        if (t.empoweredSkillCritAndKill != null) matched = matched && comboStates.some(s => s.stateId === 'shadow_momentum') && (ctx.state.killStreak ?? 0) > 0;
        if (t.passThroughAilmentedTargets != null) matched = matched && ctx.skill.id === 'dagger_shadow_dash' && targetStacks >= t.passThroughAilmentedTargets;
        if (t.passThroughTargets != null) matched = matched && ctx.skill.id === 'dagger_shadow_dash' && ctx.state.packMobs.length >= t.passThroughTargets;
        if (t.sdKill != null) matched = matched && ctx.skill.id === 'dagger_shadow_dash' && (ctx.state.killStreak ?? 0) > 0;
        if (t.dodgeWithinWindow != null) matched = matched && attackResult && attackResult.isDodged;
        if (t.dodgesAfterDash != null) matched = matched && attackResult && attackResult.isDodged;

        if (matched) {
          const buffId = buff.buffId ?? buff.id ?? (proc as any).id ?? 'object_trigger_buff';
          const duration = buff.duration ?? 4;
          newTempBuffs.push({
            id: buffId,
            effect: buff.effect ?? {},
            duration,
            stacks: 1,
            maxStacks: buff.maxStacks ?? 1,
          });
        }
      }
    }

    return { counterDamage, trapDamage, comboStates, bladeWardHits, activeTraps, wardDamageMult, healAmount, newTempBuffs };
  },
};

// Registration handled by tick.ts WEAPON_MODULES map (side-effect imports are tree-shaken by tsx).

// ============================================================
// Shared Combo Runtime — COMBAT_ECONOMY_DESIGN Wave E2 (ask 8)
//
// The combo create/consume machinery hoisted VERBATIM out of
// weapons/dagger.ts so ANY weapon module gets the full economy
// (ledger states, E10 consume payoffs, windows, refunds) from the
// COMBO_STATE_CREATORS / CONSUMERS tables alone. Bow (Wave E3) is
// the first data-driven consumer; dagger layers its rawBehaviors
// extras on top of these results.
//
// Behavioral contract: sim/gambit-ab.ts is the parity golden — the
// hoist must leave its verdict byte-identical.
// ============================================================

import type { ComboState } from '../../types';
import type { PreRollContext, PostCastContext } from './weapons/weaponModule';
import {
  COMBO_STATE_CONSUMERS,
  getCreatorConfigs, checkAndStampIcd, createStateFromSpec,
  consumeComboState, consumeMultipleComboStates, createComboState,
} from './combo';

/** Everything the shared consume fold produces. Weapon modules copy
 *  these into their PreRollResult (dagger mutates them further with
 *  rawBehaviors extras before returning). */
export interface ComboConsumeResult {
  comboStates: ComboState[];
  damageMult: number;
  critChanceBonus: number;
  critMultiplierBonus: number;
  guaranteedCrit: boolean;
  ailmentPotency: number;
  cdRefundPercent: number;
  splashPercent: number;
  extraChains: number;
  burstDamage: number;
  focusBurst: boolean;
  counterDamageMult: number;
  markPassthrough: boolean;
  cdAcceleration: number;
  advanceOtherCooldownsSec: number;
  perfectSpend: boolean;
  wetSpend: boolean;
  consumedStateIds: string[];
  contagionSpreadCount: number;
}

/** Consume combo states for the casting skill and fold their payoffs
 *  (legacy fields + the four generic E10 fields). Hoisted from
 *  daggerModule.preRoll — same order, same semantics. */
export function comboConsumePreRoll(ctx: PreRollContext): ComboConsumeResult {
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
  let contagionSpreadCount = 0;
  let advanceOtherCooldownsSec = 0;
  let perfectSpend = false;
  let wetSpend = false;
  const consumedStateIds: string[] = [];
  const pendingRefunds: { stateId: string; amount: number }[] = [];

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

      // ── COMBAT_ECONOMY_DESIGN E10: generic table-driven consume payoffs ──
      // Per-stack scaling (consume-all spenders: momentum ×(1+0.30k))
      if (eff.incDamagePerStackConsumed) {
        damageMult *= (1 + (eff.incDamagePerStackConsumed * cs.stacks) / 100);
      }
      // Perfect jackpot: only when the spend consumed exactly cap stacks
      if (eff.capBonus && cs.stacks >= cs.maxStacks) {
        if (eff.capBonus.incDamage) damageMult *= (1 + eff.capBonus.incDamage / 100);
        if (eff.capBonus.advanceOthersSec) advanceOtherCooldownsSec += eff.capBonus.advanceOthersSec;
        perfectSpend = true; // E16: PERFECT floater tag
      }
      // Wet-spend tempo refund (applied after the consume loop).
      // refundStacks is the wet-window payoff marker (E5/E10: Opening),
      // so consuming it here IS the wet spend — E16 floater tag.
      if (eff.refundStacks) {
        pendingRefunds.push(eff.refundStacks);
        wetSpend = true;
      }
      // Generic DoT detonation (retires the deep_wound stateId hardcode):
      // % of remaining ailment ticks dealt as instant burst
      if (eff.detonateDotPercent) {
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
        burstDamage += ailmentBurst * (eff.detonateDotPercent / 100);
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

  // E10 refundStacks: wet-spend tempo refund — re-create AFTER the
  // consume so the refund seeds the next build cycle (never consumed
  // by the spend that granted it).
  for (const refund of pendingRefunds) {
    comboStates = createStateFromSpec(
      comboStates, refund.stateId, skill.id, undefined, 1, refund.amount,
    );
  }

  // Shadow Mark passthrough: re-create mark for next skill
  if (markPassthrough) {
    const markConfig = getCreatorConfigs('dagger_shadow_mark')[0];
    if (markConfig) {
      comboStates = createComboState(
        comboStates, markConfig.stateId, 'dagger_shadow_dash',
        markConfig.effect, markConfig.duration, markConfig.maxStacks,
        1 + (ctx.effectiveStats.ailmentDuration ?? 0) / 100,
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

  return {
    comboStates, damageMult, critChanceBonus, critMultiplierBonus,
    guaranteedCrit, ailmentPotency, cdRefundPercent, splashPercent,
    extraChains, burstDamage, focusBurst, counterDamageMult,
    markPassthrough, cdAcceleration, advanceOtherCooldownsSec,
    perfectSpend, wetSpend, consumedStateIds, contagionSpreadCount,
  };
}

/** Create combo states for the casting skill from COMBO_STATE_CREATORS
 *  (a skill may create several — Stab: momentum on cast + opening on
 *  crit). Each config gates independently on trigger / minTargetsHit /
 *  icd. Hoisted from daggerModule.postCast — same semantics. */
export function comboCreatePostCast(ctx: PostCastContext): ComboState[] {
  const { skill, graphMod, now, roll, state } = ctx;
  let comboStates = [...ctx.comboStates];

  if (roll.isHit) {
    for (const comboConfig of getCreatorConfigs(skill.id)) {
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
      // Gate: per-stateId internal cooldown (E5 window decorrelation)
      if (shouldCreate && !checkAndStampIcd(comboConfig.stateId, comboConfig.icdSec, now)) {
        shouldCreate = false;
      }

      if (shouldCreate) {
        const replace = graphMod?.comboStateReplace;
        if (replace && replace.from === comboConfig.stateId) {
          comboStates = createComboState(
            comboStates, replace.to, skill.id,
            replace.effect, replace.duration, 1,
            1 + (ctx.effectiveStats.ailmentDuration ?? 0) / 100,
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
            1 + (ctx.effectiveStats.ailmentDuration ?? 0) / 100,
            comboConfig.stacksPerGain ?? 1,
          );
        }
      }
    }
  }
  return comboStates;
}

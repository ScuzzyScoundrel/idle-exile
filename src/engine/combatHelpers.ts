// ============================================================
// Idle Exile — Combat Evaluation Helpers (Phase 2B-2)
// Pure functions for conditional modifiers, proc effects, and
// debuff interaction evaluation. No store dependency.
// ============================================================

import type {
  TriggerCondition, ConditionalModifier, SkillProcEffect,
  ActiveDebuff, TempBuff, ResolvedStats,
  ActiveSkillDef, ConversionSpec,
} from '../types';
import { BLOCK_DODGE_RECENCY_WINDOW } from '../data/balance';
import { getUnifiedSkillDef } from '../data/skills';
import { rollSkillCast } from './unifiedSkills';

// ─── Condition Evaluation ───

export interface ConditionContext {
  isHit: boolean;
  isCrit: boolean;
  phase: string;
  currentHp: number;
  effectiveMaxLife: number;
  consecutiveHits: number;
  activeDebuffs: ActiveDebuff[];
  lastBlockAt: number;
  lastDodgeAt: number;
  lastOverkillDamage: number;
  now: number;
  activeTempBuffIds?: string[];   // for whileBuffActive condition
  killStreak?: number;            // for afterCastWithoutKill condition
  // v2 context fields
  targetHpPercent?: number;       // target mob HP as 0-100
  fortifyStacks?: number;         // current fortify stacks
  packSize?: number;              // number of mobs in current pack
  wardActive?: boolean;           // blade ward window is active
  wardJustExpired?: boolean;      // blade ward expired this tick
  comboStateIds?: string[];       // active combo state IDs
  targetDebuffCount?: number;     // number of debuffs on target
  lastSkillId?: string;           // ID of skill that fired this tick
  lastDashAt?: number;            // timestamp of last shadow dash
  targetsHitLastCast?: number;    // number of targets hit by last cast
  skillTimers?: { skillId: string; cooldownUntil: number | null }[];
  // Sprint 1E: expanded context
  wardHits?: number;              // hits received during blade ward window
  lastSkillsCast?: string[];      // recent skill cast history
  activeTrapsCount?: number;      // number of placed traps
  wardExpiresAt?: number;         // blade ward expiry timestamp (ms)
  trapArmedAt?: number;           // timestamp when trap was armed (ms)
  totalTargetDebuffStacks?: number; // sum of all debuff stacks on target
}

export function evaluateCondition(
  condition: TriggerCondition,
  threshold: number | undefined,
  ctx: ConditionContext,
): boolean {
  switch (condition) {
    case 'onHit': return ctx.isHit;
    case 'onCrit': return ctx.isCrit;
    case 'onKill': return false;           // evaluated separately in death loop
    case 'onBlock': return ctx.now - ctx.lastBlockAt < BLOCK_DODGE_RECENCY_WINDOW;
    case 'onDodge': return ctx.now - ctx.lastDodgeAt < BLOCK_DODGE_RECENCY_WINDOW;
    case 'onDebuffApplied': return false;  // evaluated separately after debuff application
    case 'whileLowHp': return ctx.currentHp / ctx.effectiveMaxLife < (threshold ?? 0.35);
    case 'whileFullHp': return ctx.currentHp >= ctx.effectiveMaxLife;
    case 'whileDebuffActive': {
      if (threshold != null && threshold > 1) {
        const uniqueDebuffs = new Set(ctx.activeDebuffs.map(d => d.debuffId)).size;
        return uniqueDebuffs >= threshold;
      }
      return ctx.activeDebuffs.length > 0;
    }
    case 'afterConsecutiveHits': return ctx.consecutiveHits >= (threshold ?? 5);
    case 'onBossPhase': return ctx.phase === 'boss_fight';
    case 'onFirstHit': return ctx.consecutiveHits === 0 && ctx.isHit;
    case 'onOverkill': return ctx.lastOverkillDamage > 0;
    case 'whileBuffActive': return false; // evaluated in evaluateConditionalMods with buffId check
    case 'consumeBuff': return false;     // evaluated separately when buff is consumed
    case 'onCast': return true;           // always true during a cast evaluation
    case 'onCastComplete': return true;   // always true (single-tick casts)
    case 'afterCastWithoutKill': return (ctx.killStreak ?? 0) === 0;
    // v2 conditions
    case 'whileTargetBelowHp': return (ctx.targetHpPercent ?? 100) < (threshold ?? 50);
    case 'whileAboveHp': return (ctx.currentHp / ctx.effectiveMaxLife * 100) > (threshold ?? 80);
    case 'whileFortifyStacks': return (ctx.fortifyStacks ?? 0) >= (threshold ?? 1);
    case 'perFortifyStack': return (ctx.fortifyStacks ?? 0) >= 1;
    case 'perEnemyInPack': return (ctx.packSize ?? 1) >= (threshold ?? 1);
    case 'whileWardActive': return ctx.wardActive === true;
    case 'afterWardExpires': return ctx.wardJustExpired === true;
    case 'afterDash': return ctx.lastDashAt != null && ctx.now - ctx.lastDashAt < 3000;
    case 'afterDodge': return ctx.now - ctx.lastDodgeAt < BLOCK_DODGE_RECENCY_WINDOW;
    case 'afterDodgeOrBlock': return ctx.now - ctx.lastDodgeAt < BLOCK_DODGE_RECENCY_WINDOW || ctx.now - ctx.lastBlockAt < BLOCK_DODGE_RECENCY_WINDOW;
    case 'whileDeepWoundActive': return ctx.comboStateIds?.includes('deep_wound') ?? false;
    case 'whileTargetAilmentCount': return ctx.targetDebuffCount != null && ctx.targetDebuffCount >= (threshold ?? 1);
    case 'whileTargetSaturated': return ctx.comboStateIds?.includes('saturated') ?? false;
    case 'afterCastOnMultipleTargets': return (ctx.targetsHitLastCast ?? 1) >= (threshold ?? 2);
    case 'perTargetInLastCast': return (ctx.targetsHitLastCast ?? 1) >= 1;
    case 'whileSkillOnCooldown': return ctx.skillTimers?.some(t => t.cooldownUntil != null && t.cooldownUntil > ctx.now) ?? false;
    case 'afterDetonation': return false; // evaluated separately in trap detonation block
    case 'onDetonation': return false;    // evaluated separately in trap detonation block
    case 'previousSkillWas': {
      // Check if the previous skill in the cast history matches threshold (as string ID)
      const history = ctx.lastSkillsCast;
      if (!history || history.length < 2) return false;
      return history[history.length - 2] === String(threshold);
    }
    case 'lastSkillInCycle': {
      // True if this is the last skill in the rotation cycle (approximation: check if all other skills are on CD)
      const otherOnCd = ctx.skillTimers?.filter(t => t.skillId !== ctx.lastSkillId && t.cooldownUntil != null && t.cooldownUntil > ctx.now);
      return (otherOnCd?.length ?? 0) >= (threshold ?? 1);
    }
    case 'skillsCastSinceLast': return true; // approximate: assume active rotation
    case 'shadowMomentumActive': return ctx.comboStateIds?.includes('shadow_momentum') ?? false;
    case 'onDashCast': return ctx.lastSkillId === 'dagger_shadow_dash';
    case 'firstSkillInEncounter': return ctx.consecutiveHits === 0;
    case 'afterCast': return true; // always true during cast evaluation
    case 'targetHasActiveAilment': return (ctx.targetDebuffCount ?? 0) > 0;
    case 'whilePackSize': return (ctx.packSize ?? 1) >= (threshold ?? 1);
    case 'whileTargetsHit': return (ctx.targetsHitLastCast ?? 1) >= (threshold ?? 1);
    case 'perOwnAilmentOnTarget': return (ctx.targetDebuffCount ?? 0) >= 1;
    case 'perAilmentStackOnTarget': return (ctx.targetDebuffCount ?? 0) >= 1;
    // Sprint 1E: remaining conditions
    case 'perSecondOnCooldown': {
      // Scaling: true if any skill is on CD (value scales in CM evaluation)
      return ctx.skillTimers?.some(t => t.cooldownUntil != null && t.cooldownUntil > ctx.now) ?? false;
    }
    case 'perSecondRemainingOnWard': {
      if (!ctx.wardExpiresAt || ctx.now >= ctx.wardExpiresAt) return false;
      return (ctx.wardExpiresAt - ctx.now) / 1000 >= (threshold ?? 0);
    }
    case 'perSecondSinceArmed': {
      if (!ctx.trapArmedAt) return false;
      return (ctx.now - ctx.trapArmedAt) / 1000 >= (threshold ?? 0);
    }
    case 'perCounterHitInWard': return (ctx.wardHits ?? 0) >= (threshold ?? 1);
    case 'perHitReceivedDuringWard': return (ctx.wardHits ?? 0) >= (threshold ?? 1);
    case 'counterHitKillDuringWard': return ctx.wardActive === true && (ctx.killStreak ?? 0) > 0;
    case 'detonationKill': return false; // evaluated in trap detonation block
    case 'onFirstHitVsTarget': return ctx.consecutiveHits === 0 && ctx.isHit;
    case 'afterCastHitCount': return ctx.consecutiveHits >= (threshold ?? 1);
    case 'perOtherSkillOnCooldown': {
      const othersOnCd = ctx.skillTimers?.filter(t => t.skillId !== ctx.lastSkillId && t.cooldownUntil != null && t.cooldownUntil > ctx.now);
      return (othersOnCd?.length ?? 0) >= (threshold ?? 1);
    }
    case 'empoweredSkillKill': return false; // evaluated in kill block
    case 'afterTrapPlacement': return (ctx.activeTrapsCount ?? 0) > 0;
    case 'trapAilments': return (ctx.totalTargetDebuffStacks ?? 0) >= (threshold ?? 1);
    case 'sdAilments': return (ctx.totalTargetDebuffStacks ?? 0) >= (threshold ?? 1);
    case 'onAilmentApplied': return false;   // proc trigger, evaluated after ailment application
    case 'onAilmentExpire': return false;    // proc trigger, evaluated when debuff expires
    case 'onAilmentKill': return false;      // proc trigger, evaluated when DoT kills
    case 'onAilmentTick': return false;      // proc trigger, evaluated during DoT tick
    case 'onCounterHitAilment': return ctx.wardActive === true && (ctx.targetDebuffCount ?? 0) > 0;
    case 'onKillInCast': return false;       // proc trigger, Sprint 2A
    case 'onMultiKillInCast': return false;  // proc trigger, Sprint 2A
    case 'onTripleKillInCast': return false; // proc trigger, Sprint 2A
    case 'onLinkedTargetDeath': return false; // plague link, Sprint 4
    case 'onLinkedTargetsThreshold': return false; // plague link, Sprint 4
    case 'perUniqueTargetInLastCast': return (ctx.targetsHitLastCast ?? 1) >= (threshold ?? 1);
    case 'perOtherSkillAilmentOnTarget': return (ctx.targetDebuffCount ?? 0) >= (threshold ?? 1);
    case 'perViperStrikeAilmentGlobal': return (ctx.targetDebuffCount ?? 0) >= (threshold ?? 1);
    case 'afterAilmentConsumption': return false; // evaluated after ailment consume
    case 'ailmentAge': return true; // approximate: ailments are always aging
    case 'ailmentAgeScaling': return true; // approximate: scaling with ailment age
    case 'ailmentKillAfterFoK': return ctx.lastSkillId === 'dagger_fan_of_knives' && (ctx.killStreak ?? 0) > 0;
    case 'enemyAttacksAfterBeingHit': return true; // approximate: enemies attack after being hit
    case 'enemyAttacksSinceLast': return true; // approximate: enemies have attacked
    default: return false;
  }
}

// ─── Conditional Modifier Evaluation ───

export interface ConditionalModResult {
  incDamage: number;
  flatDamage: number;
  incCritChance: number;
  incCritMultiplier: number;
  incCastSpeed: number;
  damageMult: number;
  // Sprint 1D: expanded fields
  dodgeChance: number;
  damageReduction: number;
  ailmentPotency: number;
  leechPercent: number;
  cooldownReduction: number;
  ailmentDuration: number;
  ailmentDamageBonus: number;
  dotMultiplier: number;
  weaponMastery: number;
  evasionBonus: number;
  counterDamageMult: number;
  increasedDamageTaken: number;
}

const PRE_ROLL_CONDITIONS: Set<TriggerCondition> = new Set([
  'whileLowHp', 'whileFullHp', 'whileDebuffActive',
  'afterConsecutiveHits', 'onBossPhase', 'whileBuffActive',
  'afterCastWithoutKill',
  // v2 pre-roll conditions (state-based, affect the damage roll)
  'whileTargetBelowHp', 'whileAboveHp', 'whileFortifyStacks', 'perFortifyStack',
  'perEnemyInPack', 'whileWardActive', 'afterWardExpires', 'afterDash',
  'afterDodge', 'afterDodgeOrBlock', 'whileDeepWoundActive',
  'whileTargetAilmentCount', 'whileTargetSaturated',
  'afterCastOnMultipleTargets', 'perTargetInLastCast',
  'whileSkillOnCooldown', 'shadowMomentumActive', 'onDashCast',
  'firstSkillInEncounter', 'afterCast', 'targetHasActiveAilment',
  'whilePackSize', 'whileTargetsHit', 'skillsCastSinceLast',
  'perOwnAilmentOnTarget', 'perAilmentStackOnTarget',
]);

export function evaluateConditionalMods(
  mods: ConditionalModifier[],
  ctx: ConditionContext,
  timing: 'pre-roll' | 'post-roll',
): ConditionalModResult {
  const result: ConditionalModResult = {
    incDamage: 0, flatDamage: 0, incCritChance: 0,
    incCritMultiplier: 0, incCastSpeed: 0, damageMult: 1,
    dodgeChance: 0, damageReduction: 0, ailmentPotency: 0,
    leechPercent: 0, cooldownReduction: 0, ailmentDuration: 0,
    ailmentDamageBonus: 0, dotMultiplier: 0, weaponMastery: 0,
    evasionBonus: 0, counterDamageMult: 0, increasedDamageTaken: 0,
  };
  for (const cm of mods) {
    const isPre = PRE_ROLL_CONDITIONS.has(cm.condition);
    if (timing === 'pre-roll' && !isPre) continue;
    if (timing === 'post-roll' && isPre) continue;

    // Special handling for whileBuffActive: check buffId against active buffs
    if (cm.condition === 'whileBuffActive') {
      if (!cm.buffId || !ctx.activeTempBuffIds?.includes(cm.buffId)) continue;
    // Special handling for whileDebuffActive + debuffId: check specific debuff's stack count
    } else if (cm.condition === 'whileDebuffActive' && cm.debuffId) {
      const debuff = ctx.activeDebuffs.find(d => d.debuffId === cm.debuffId);
      if (!debuff || debuff.stacks < (cm.threshold ?? 1)) continue;
    } else {
      if (!evaluateCondition(cm.condition, cm.threshold, ctx)) continue;
    }
    const m = cm.modifier;
    if (m.incDamage) result.incDamage += m.incDamage;
    if (m.flatDamage) result.flatDamage += m.flatDamage;
    if (m.incCritChance) result.incCritChance += m.incCritChance;
    if (m.incCritMultiplier) result.incCritMultiplier += m.incCritMultiplier;
    if (m.incCastSpeed) result.incCastSpeed += m.incCastSpeed;
    if (m.abilityEffect?.damageMult) result.damageMult *= m.abilityEffect.damageMult;
    // Sprint 1D: expanded field extraction
    if (m.dodgeChance) result.dodgeChance += m.dodgeChance;
    if (m.dodgeChanceBonus) result.dodgeChance += m.dodgeChanceBonus;
    if (m.damageReduction) result.damageReduction += m.damageReduction;
    if (m.ailmentPotency) result.ailmentPotency += m.ailmentPotency;
    if (m.ailmentPotencyBonus) result.ailmentPotency += m.ailmentPotencyBonus;
    if (m.leechPercent) result.leechPercent += m.leechPercent;
    if (m.cooldownReduction) result.cooldownReduction += m.cooldownReduction;
    if (m.ailmentDuration) result.ailmentDuration += m.ailmentDuration;
    if (m.ailmentDurationBonus) result.ailmentDuration += m.ailmentDurationBonus;
    if (m.ailmentDamageBonus) result.ailmentDamageBonus += m.ailmentDamageBonus;
    if (m.dotMultiplier) result.dotMultiplier += m.dotMultiplier;
    if (m.weaponMastery) result.weaponMastery += m.weaponMastery;
    if (m.evasionBonus) result.evasionBonus += m.evasionBonus;
    if (m.counterDamageMult) result.counterDamageMult += m.counterDamageMult;
    if (m.increasedDamageTaken) result.increasedDamageTaken += m.increasedDamageTaken;
  }
  return result;
}

// ─── Proc Effect Evaluation ───

export interface ProcContext {
  isHit: boolean;
  isCrit: boolean;
  skillId: string;
  effectiveMaxLife: number;
  stats: ResolvedStats;
  weaponAvgDmg: number;
  weaponSpellPower: number;
  damageMult: number;
  now: number;
  lastProcTriggerAt?: Record<string, number>;  // for ICD tracking
  weaponConversion?: ConversionSpec;
  // conditionParam context fields (Sprint 1A)
  targetDebuffs?: ActiveDebuff[];
  targetHpPercent?: number;
  consecutiveHits?: number;
  lastDodgeAt?: number;
  packSize?: number;
  targetsHitThisCast?: number;
  killsThisCast?: number;
  critsThisCast?: number;
  comboStatesConsumedThisTick?: string[];
  lastSkillCastAt?: Record<string, number>;
  skillTimers?: { skillId: string; cooldownUntil: number | null }[];
  activeTempBuffIds?: string[];
  currentCharges?: number;
  ailmentedMobCount?: number;
}

export interface ProcResult {
  bonusDamage: number;
  healAmount: number;
  newTempBuffs: TempBuff[];
  newDebuffs: { debuffId: string; stacks: number; duration: number; skillId: string }[];
  cooldownResets: string[];
  gcdWasReset: boolean;                        // true if any proc had resetGcd
  procTriggeredAt: Record<string, number>;     // procId → timestamp for ICD tracking
  procsFired: string[];                        // IDs of procs that actually triggered
  // Sprint 1C: fortify from procs
  fortifyStacks: number;
  fortifyDuration: number;                     // seconds
  fortifyDRPerStack: number;                   // % damage reduction per stack
  // Sprint 3A: ailment detonation
  detonationDamage: number;                    // burst damage from detonating ailments
  consumeAilments: boolean;                    // if true, remove detonated ailments from target
  // Sprint 3B/3C: spread + misc
  spreadAilments: boolean;                     // spread ailments on kill
  spreadDurationRetain: number;                // 0-1, fraction of duration retained when spreading
  extendAllAilments: number;                   // seconds to extend all ailment durations
  applyComboState: { id: string; potencyMult: number } | null; // create a combo state
  escalation: { atKills: number; durationOverride: number; additionalEffect: Record<string, any> } | null;
}

/**
 * Check proc conditionParam gates against combat state.
 * Returns pass=false if any gate fails. Returns effectiveChance which may
 * differ from proc.chance if perConsecutiveHit scaling applies.
 */
function checkConditionParam(
  param: Record<string, any>,
  proc: SkillProcEffect,
  ctx: ProcContext,
): { pass: boolean; effectiveChance: number } {
  let effectiveChance = proc.chance;

  // perConsecutiveHit: scale chance with consecutive hits (+ optional maxChance cap)
  if (param.perConsecutiveHit != null) {
    const bonus = param.perConsecutiveHit * (ctx.consecutiveHits ?? 0);
    effectiveChance = Math.min(effectiveChance + bonus, param.maxChance ?? 1);
  }

  // minAilmentStacks: target needs N+ total ailment stacks
  if (param.minAilmentStacks != null) {
    const totalStacks = (ctx.targetDebuffs ?? []).reduce((sum, d) => sum + d.stacks, 0);
    if (totalStacks < param.minAilmentStacks) return { pass: false, effectiveChance };
  }

  // targetBelowHp: target HP% must be below threshold
  if (param.targetBelowHp != null) {
    if ((ctx.targetHpPercent ?? 100) >= param.targetBelowHp) return { pass: false, effectiveChance };
  }

  // anyTargetBelowHp: at least one target below HP% (approximated via front mob)
  if (param.anyTargetBelowHp != null) {
    if ((ctx.targetHpPercent ?? 100) >= param.anyTargetBelowHp) return { pass: false, effectiveChance };
  }

  // whileDebuffActive: target has specific debuff
  if (param.whileDebuffActive != null) {
    if (!(ctx.targetDebuffs ?? []).some(d => d.debuffId === param.whileDebuffActive))
      return { pass: false, effectiveChance };
  }

  // whileSkillReady: specific skill NOT on cooldown
  if (param.whileSkillReady != null) {
    const timer = ctx.skillTimers?.find(t => t.skillId === param.whileSkillReady);
    if (timer?.cooldownUntil != null && timer.cooldownUntil > ctx.now)
      return { pass: false, effectiveChance };
  }

  // whileSkillOnCooldown: specific skill IS on cooldown
  if (param.whileSkillOnCooldown != null) {
    const timer = ctx.skillTimers?.find(t => t.skillId === param.whileSkillOnCooldown);
    if (!timer?.cooldownUntil || timer.cooldownUntil <= ctx.now)
      return { pass: false, effectiveChance };
  }

  // whileBuffActive: player has specific buff
  if (param.whileBuffActive != null) {
    if (!(ctx.activeTempBuffIds ?? []).includes(param.whileBuffActive))
      return { pass: false, effectiveChance };
  }

  // minTargetsHit: skill hit enough targets
  if (param.minTargetsHit != null) {
    if ((ctx.targetsHitThisCast ?? 1) < param.minTargetsHit) return { pass: false, effectiveChance };
  }

  // uniqueTargets: hit N distinct targets (same as minTargetsHit for pack sim)
  if (param.uniqueTargets != null) {
    if ((ctx.targetsHitThisCast ?? 1) < param.uniqueTargets) return { pass: false, effectiveChance };
  }

  // dodgesInWindow: N dodges within time window (approximation: current + lastDodgeAt)
  if (param.dodgesInWindow != null) {
    const windowMs = (param.window ?? param.afterCastWindow ?? 4) * 1000;
    // If we're on an onDodge trigger, current dodge counts as 1
    // lastDodgeAt within window counts as a previous dodge
    const prevDodgeInWindow = ctx.lastDodgeAt != null && (ctx.now - ctx.lastDodgeAt) < windowMs;
    const dodgeCount = prevDodgeInWindow ? 2 : 1;
    if (dodgeCount < param.dodgesInWindow) return { pass: false, effectiveChance };
    // afterCastWindow + skillId: also check cast recency
    if (param.skillId && param.afterCastWindow) {
      const lastCast = ctx.lastSkillCastAt?.[param.skillId];
      if (!lastCast || (ctx.now - lastCast) > param.afterCastWindow * 1000)
        return { pass: false, effectiveChance };
    }
  }

  // minKills: kills this cast/tick
  if (param.minKills != null) {
    if ((ctx.killsThisCast ?? 0) < param.minKills) return { pass: false, effectiveChance };
  }

  // minCritsInCast: crits in current cast
  if (param.minCritsInCast != null) {
    if ((ctx.critsThisCast ?? (ctx.isCrit ? 1 : 0)) < param.minCritsInCast)
      return { pass: false, effectiveChance };
  }

  // consumesBothStates: both combo states consumed this tick
  if (param.consumesBothStates != null) {
    const required = param.consumesBothStates as string[];
    if (!required.every(s => (ctx.comboStatesConsumedThisTick ?? []).includes(s)))
      return { pass: false, effectiveChance };
  }

  // withinWindowAfterCast: time since last specific skill cast within window
  if (param.withinWindowAfterCast != null) {
    const skillId = param.skillId;
    const lastCast = skillId ? ctx.lastSkillCastAt?.[skillId] : undefined;
    if (!lastCast || (ctx.now - lastCast) > param.withinWindowAfterCast * 1000)
      return { pass: false, effectiveChance };
  }

  // minCharges: need N charges
  if (param.minCharges != null) {
    if ((ctx.currentCharges ?? 0) < param.minCharges) return { pass: false, effectiveChance };
  }

  // minAilmentedTargetsHit / minTargetsAilmented: targets with ailments
  if (param.minAilmentedTargetsHit != null) {
    if ((ctx.ailmentedMobCount ?? 0) < param.minAilmentedTargetsHit)
      return { pass: false, effectiveChance };
  }
  if (param.minTargetsAilmented != null) {
    if ((ctx.ailmentedMobCount ?? 0) < param.minTargetsAilmented)
      return { pass: false, effectiveChance };
  }

  // minViperStrikeAilments: target has N+ ailments from Viper Strike
  if (param.minViperStrikeAilments != null) {
    const vsDebuffs = (ctx.targetDebuffs ?? []).filter(d => d.appliedBySkillId === 'dagger_viper_strike');
    const totalStacks = vsDebuffs.reduce((sum, d) => sum + d.stacks, 0);
    if (totalStacks < param.minViperStrikeAilments) return { pass: false, effectiveChance };
  }

  // minEnemiesWithViperStrikeAilment: pack mobs with VS ailments (approximated via ailmentedMobCount)
  if (param.minEnemiesWithViperStrikeAilment != null) {
    if ((ctx.ailmentedMobCount ?? 0) < param.minEnemiesWithViperStrikeAilment)
      return { pass: false, effectiveChance };
  }

  // totalTicksOnTarget: approximate by checking if debuffs have been ticking
  if (param.totalTicksOnTarget != null) {
    // Approximation: count total remaining stacks as a proxy for accumulated ticks
    const totalStacks = (ctx.targetDebuffs ?? []).reduce((sum, d) => sum + d.stacks, 0);
    if (totalStacks < param.totalTicksOnTarget) return { pass: false, effectiveChance };
  }

  // linkedTargets: plague link system (Sprint 4 — approximate with pack size)
  if (param.linkedTargets != null) {
    if ((ctx.packSize ?? 1) < param.linkedTargets) return { pass: false, effectiveChance };
  }

  // sameTarget / persistsThroughOtherSkills / fromSelf / countUniqueAilments: flavor flags
  // sameTarget is already tracked by consecutive hit system
  // persistsThroughOtherSkills is already the default behavior
  // fromSelf + countUniqueAilments are handled in conditionalMods (1E)

  return { pass: true, effectiveChance };
}

export function evaluateProcs(
  procs: SkillProcEffect[],
  trigger: TriggerCondition,
  ctx: ProcContext,
): ProcResult {
  const result: ProcResult = {
    bonusDamage: 0, healAmount: 0,
    newTempBuffs: [], newDebuffs: [], cooldownResets: [],
    gcdWasReset: false,
    procTriggeredAt: {}, procsFired: [],
    fortifyStacks: 0, fortifyDuration: 0, fortifyDRPerStack: 0,
    detonationDamage: 0, consumeAilments: false,
    spreadAilments: false, spreadDurationRetain: 0.75,
    extendAllAilments: 0, applyComboState: null, escalation: null,
  };
  for (const proc of procs) {
    if (proc.trigger !== trigger) continue;

    // Internal cooldown check: skip if proc was triggered too recently
    if (proc.internalCooldown && ctx.lastProcTriggerAt) {
      const lastTrigger = ctx.lastProcTriggerAt[proc.id] ?? 0;
      if (ctx.now - lastTrigger < proc.internalCooldown * 1000) continue;
    }

    // conditionParam gate: check combat state requirements before rolling chance
    let effectiveChance = proc.chance;
    if (proc.conditionParam) {
      const cpCheck = checkConditionParam(proc.conditionParam, proc, ctx);
      if (!cpCheck.pass) continue;
      effectiveChance = cpCheck.effectiveChance;
    }

    if (Math.random() >= effectiveChance) continue;

    // Track when this proc triggered (for ICD)
    result.procTriggeredAt[proc.id] = ctx.now;
    result.procsFired.push(proc.id);

    if (proc.instantDamage) {
      let dmg = proc.instantDamage.flatDamage ?? 0;
      if (proc.instantDamage.scaleStat && proc.instantDamage.scaleRatio) {
        let statVal: number;
        if (proc.instantDamage.scaleStat === 'weaponDamage') {
          statVal = ctx.weaponAvgDmg;
        } else if (proc.instantDamage.scaleStat === 'debuffDamage') {
          statVal = ctx.weaponAvgDmg
            * (1 + (ctx.stats.incChaosDamage ?? 0) / 100)
            * (1 + (ctx.stats.dotMultiplier ?? 0) / 100);
        } else {
          const raw = ctx.stats[proc.instantDamage.scaleStat as keyof ResolvedStats];
          statVal = typeof raw === 'number' ? raw : 0;
        }
        dmg += statVal * proc.instantDamage.scaleRatio;
      }
      result.bonusDamage += dmg;
    }
    if (proc.healPercent) {
      result.healAmount += ctx.effectiveMaxLife * (proc.healPercent / 100);
    }
    if (proc.castSkill) {
      const procSkill = getUnifiedSkillDef(proc.castSkill);
      if (procSkill?.kind === 'active') {
        const procRoll = rollSkillCast(
          procSkill as ActiveSkillDef, ctx.stats,
          ctx.weaponAvgDmg, ctx.weaponSpellPower, ctx.damageMult,
          undefined, ctx.weaponConversion,
        );
        if (procRoll.isHit) result.bonusDamage += procRoll.damage;
      }
    }
    if (proc.bonusCast) {
      const currentSkill = getUnifiedSkillDef(ctx.skillId);
      if (currentSkill?.kind === 'active') {
        const bonusRoll = rollSkillCast(
          currentSkill as ActiveSkillDef, ctx.stats,
          ctx.weaponAvgDmg, ctx.weaponSpellPower, ctx.damageMult,
          undefined, ctx.weaponConversion,
        );
        if (bonusRoll.isHit) result.bonusDamage += bonusRoll.damage;
      }
    }
    // Sprint 2B: freeCast — fire a free cast of a referenced skill at specified damageMult
    if (proc.freeCast) {
      const freeSkill = getUnifiedSkillDef(proc.freeCast.skillId);
      if (freeSkill?.kind === 'active') {
        const freeMult = ctx.damageMult * (proc.freeCast.damageMult ?? 1);
        const freeRoll = rollSkillCast(
          freeSkill as ActiveSkillDef, ctx.stats,
          ctx.weaponAvgDmg, ctx.weaponSpellPower, freeMult,
          undefined, ctx.weaponConversion,
        );
        if (freeRoll.isHit) result.bonusDamage += freeRoll.damage;
      }
    }
    if (proc.applyBuff) {
      result.newTempBuffs.push({
        id: proc.applyBuff.buffId ?? proc.id,
        effect: proc.applyBuff.effect,
        expiresAt: ctx.now + proc.applyBuff.duration * 1000,
        sourceSkillId: ctx.skillId,
        stacks: 1,
        maxStacks: 1,
      });
    }
    if (proc.applyDebuff) {
      result.newDebuffs.push({
        debuffId: proc.applyDebuff.debuffId,
        stacks: proc.applyDebuff.stacks ?? 1,
        duration: proc.applyDebuff.duration,
        skillId: ctx.skillId,
      });
    }
    if (proc.resetCooldown) {
      // 'self' resolves to the skill that triggered the proc
      const resetTarget = proc.resetCooldown === 'self' ? ctx.skillId : proc.resetCooldown;
      result.cooldownResets.push(resetTarget);
      if (proc.resetGcd) result.gcdWasReset = true;
    }
    if (proc.fortifyOnProc) {
      result.fortifyStacks += proc.fortifyOnProc.stacks;
      result.fortifyDuration = Math.max(result.fortifyDuration, proc.fortifyOnProc.duration);
      result.fortifyDRPerStack = Math.max(result.fortifyDRPerStack, proc.fortifyOnProc.damageReduction);
    }
    // Sprint 3A: ailment detonation — sum remaining ailment damage as burst
    if (proc.detonateAilments || proc.explodeAilments || proc.consumeAllAilments) {
      const targetDebs = ctx.targetDebuffs ?? [];
      let ailmentTotal = 0;
      for (const deb of targetDebs) {
        if (deb.instances) {
          for (const inst of deb.instances) ailmentTotal += inst.snapshot * inst.remainingDuration;
        } else if (deb.stackSnapshots?.length) {
          ailmentTotal += deb.stackSnapshots.reduce((a, b) => a + b, 0) * (deb.remainingDuration ?? 0);
        }
      }
      if (proc.detonateAilments) {
        const pct = proc.detonateAilments.percent ?? (proc.detonateAilments.scaleRatio ? proc.detonateAilments.scaleRatio * 100 : 100);
        result.detonationDamage += ailmentTotal * (pct / 100);
      }
      if (proc.explodeAilments) {
        result.detonationDamage += ailmentTotal * (proc.explodeAilments.aoeScaleRatio ?? 0.5);
      }
      if (proc.consumeAllAilments) {
        result.detonationDamage += ailmentTotal;
        result.consumeAilments = true;
      }
    }
    // Sprint 3B: spreadAilments on kill
    if (proc.spreadAilments) {
      result.spreadAilments = true;
      result.spreadDurationRetain = proc.spreadAilments.durationRetain ?? 0.75;
    }
    // Sprint 3C: misc proc fields
    if (proc.extendAllAilments) {
      result.extendAllAilments += proc.extendAllAilments;
    }
    if (proc.applyComboState) {
      result.applyComboState = proc.applyComboState;
    }
    if (proc.escalation) {
      result.escalation = proc.escalation;
    }
  }
  return result;
}

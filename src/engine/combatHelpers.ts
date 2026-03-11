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
}

const PRE_ROLL_CONDITIONS: Set<TriggerCondition> = new Set([
  'whileLowHp', 'whileFullHp', 'whileDebuffActive',
  'afterConsecutiveHits', 'onBossPhase', 'whileBuffActive',
  'afterCastWithoutKill',
]);

export function evaluateConditionalMods(
  mods: ConditionalModifier[],
  ctx: ConditionContext,
  timing: 'pre-roll' | 'post-roll',
): ConditionalModResult {
  const result: ConditionalModResult = {
    incDamage: 0, flatDamage: 0, incCritChance: 0,
    incCritMultiplier: 0, incCastSpeed: 0, damageMult: 1,
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
  };
  for (const proc of procs) {
    if (proc.trigger !== trigger) continue;

    // Internal cooldown check: skip if proc was triggered too recently
    if (proc.internalCooldown && ctx.lastProcTriggerAt) {
      const lastTrigger = ctx.lastProcTriggerAt[proc.id] ?? 0;
      if (ctx.now - lastTrigger < proc.internalCooldown * 1000) continue;
    }

    if (Math.random() >= proc.chance) continue;

    // Track when this proc triggered (for ICD)
    result.procTriggeredAt[proc.id] = ctx.now;
    result.procsFired.push(proc.id);

    if (proc.instantDamage) {
      let dmg = proc.instantDamage.flatDamage;
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
    if (proc.applyBuff) {
      result.newTempBuffs.push({
        id: proc.id,
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
        stacks: proc.applyDebuff.stacks,
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
  }
  return result;
}

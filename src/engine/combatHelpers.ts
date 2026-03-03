// ============================================================
// Idle Exile — Combat Evaluation Helpers (Phase 2B-2)
// Pure functions for conditional modifiers, proc effects, and
// debuff interaction evaluation. No store dependency.
// ============================================================

import type {
  TriggerCondition, ConditionalModifier, SkillProcEffect,
  ActiveDebuff, TempBuff, ResolvedStats,
  ActiveSkillDef,
} from '../types';
import { BLOCK_DODGE_RECENCY_WINDOW } from '../data/balance';
import { getUnifiedSkillDef } from '../data/unifiedSkills';
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
    case 'whileDebuffActive': return ctx.activeDebuffs.length > 0;
    case 'afterConsecutiveHits': return ctx.consecutiveHits >= (threshold ?? 5);
    case 'onBossPhase': return ctx.phase === 'boss_fight';
    case 'onFirstHit': return ctx.consecutiveHits === 0 && ctx.isHit;
    case 'onOverkill': return ctx.lastOverkillDamage > 0;
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
  'afterConsecutiveHits', 'onBossPhase',
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
    if (!evaluateCondition(cm.condition, cm.threshold, ctx)) continue;
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
}

export interface ProcResult {
  bonusDamage: number;
  healAmount: number;
  newTempBuffs: TempBuff[];
  newDebuffs: { debuffId: string; stacks: number; duration: number; skillId: string }[];
  cooldownResets: string[];
}

export function evaluateProcs(
  procs: SkillProcEffect[],
  trigger: TriggerCondition,
  ctx: ProcContext,
): ProcResult {
  const result: ProcResult = {
    bonusDamage: 0, healAmount: 0,
    newTempBuffs: [], newDebuffs: [], cooldownResets: [],
  };
  for (const proc of procs) {
    if (proc.trigger !== trigger) continue;
    if (Math.random() >= proc.chance) continue;

    if (proc.instantDamage) {
      let dmg = proc.instantDamage.flatDamage;
      if (proc.instantDamage.scaleStat && proc.instantDamage.scaleRatio) {
        const statVal = ctx.stats[proc.instantDamage.scaleStat as keyof ResolvedStats];
        if (typeof statVal === 'number') dmg += statVal * proc.instantDamage.scaleRatio;
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
      result.cooldownResets.push(proc.resetCooldown);
    }
  }
  return result;
}

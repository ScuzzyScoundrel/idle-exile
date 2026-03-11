// ============================================================
// Effect Merging & Aggregation — merge and aggregate AbilityEffects
// Extracted from engine/unifiedSkills.ts (Phase B3)
// ============================================================

import type {
  AbilityEffect, AbilityProgress, AbilityTimerState, EquippedAbility,
  EquippedSkill, SkillProgress, SkillTimerState, TempBuff,
} from '../../types';
import { getAbilityDef, getUnifiedSkillDef } from '../../data/skills';
import { resolveAbilityEffect, resolveSkillEffect, mergeEffect } from './resolution';
import { isAbilityActive } from './timers';
import { resolveSkillGraphModifiers } from '../skillGraph';
import { resolveTalentModifiers } from '../talentTree';

// Re-export mergeEffect from resolution (canonical home) for backward compat
export { mergeEffect } from './resolution';

/**
 * Aggregate active TempBuff effects into a single AbilityEffect.
 * Stack-scales multiplicative fields: 1 + (mult - 1) * stacks.
 */
export function aggregateTempBuffEffects(tempBuffs: TempBuff[], now: number): AbilityEffect {
  let result: AbilityEffect = {};
  for (const buff of tempBuffs) {
    if (buff.expiresAt <= now) continue;
    const scaled: AbilityEffect = {
      damageMult: buff.effect.damageMult != null ? 1 + (buff.effect.damageMult - 1) * buff.stacks : undefined,
      attackSpeedMult: buff.effect.attackSpeedMult != null ? 1 + (buff.effect.attackSpeedMult - 1) * buff.stacks : undefined,
      defenseMult: buff.effect.defenseMult != null ? 1 + (buff.effect.defenseMult - 1) * buff.stacks : undefined,
      critChanceBonus: buff.effect.critChanceBonus != null ? buff.effect.critChanceBonus * buff.stacks : undefined,
      critMultiplierBonus: buff.effect.critMultiplierBonus != null ? buff.effect.critMultiplierBonus * buff.stacks : undefined,
    };
    result = mergeEffect(result, scaled);
  }
  return result;
}

/**
 * Aggregate all equipped ability effects into a single AbilityEffect.
 * In offlineMode, only passive abilities are included.
 */
export function aggregateAbilityEffects(
  equippedAbilities: (EquippedAbility | null)[],
  timers: AbilityTimerState[],
  abilityProgress: Record<string, AbilityProgress>,
  now: number,
  offlineMode: boolean,
): AbilityEffect {
  let result: AbilityEffect = {};

  for (const equipped of equippedAbilities) {
    if (!equipped) continue;
    const def = getAbilityDef(equipped.abilityId);
    if (!def) continue;

    const progress = abilityProgress[equipped.abilityId];

    if (def.kind === 'passive') {
      const effect = resolveAbilityEffect(def, progress);
      result = mergeEffect(result, effect);
    } else if (def.kind === 'proc') {
      const effect = resolveAbilityEffect(def, progress);
      result = mergeEffect(result, effect);
    } else if (def.kind === 'toggle') {
      const timer = timers.find(t => t.abilityId === equipped.abilityId);
      if (timer && timer.activatedAt !== null) {
        const effect = resolveAbilityEffect(def, progress);
        result = mergeEffect(result, effect);
      }
    } else if (def.kind === 'buff' && !offlineMode) {
      const timer = timers.find(t => t.abilityId === equipped.abilityId);
      if (timer && isAbilityActive(timer, def, progress, now)) {
        const effect = resolveAbilityEffect(def, progress);
        result = mergeEffect(result, effect);
      }
    }
  }

  return result;
}

/**
 * Aggregate all equipped skill bar effects into a single AbilityEffect.
 * In offlineMode, only passive skills contribute.
 */
export function aggregateSkillBarEffects(
  skillBar: (EquippedSkill | null)[],
  skillProgress: Record<string, SkillProgress>,
  skillTimers: SkillTimerState[],
  now: number,
  offlineMode: boolean,
): AbilityEffect {
  let result: AbilityEffect = {};

  for (const equipped of skillBar) {
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (!skill) continue;

    const progress = skillProgress[equipped.skillId];

    if (skill.kind === 'active') {
      continue;
    }

    if (skill.kind === 'passive' || skill.kind === 'proc') {
      const effect = resolveSkillEffect(skill, progress);
      result = mergeEffect(result, effect);
    } else if (skill.kind === 'toggle') {
      const timer = skillTimers.find(t => t.skillId === equipped.skillId);
      if (timer && timer.activatedAt !== null) {
        const effect = resolveSkillEffect(skill, progress);
        result = mergeEffect(result, effect);
      }
    } else if (skill.kind === 'buff' && !offlineMode) {
      const timer = skillTimers.find(t => t.skillId === equipped.skillId);
      if (timer) {
        const timerAsAbility = {
          abilityId: timer.skillId,
          activatedAt: timer.activatedAt,
          cooldownUntil: timer.cooldownUntil,
        };
        const abilityProgress: AbilityProgress | undefined = progress ? {
          abilityId: progress.skillId,
          xp: progress.xp,
          level: progress.level,
          allocatedNodes: progress.allocatedNodes,
        } : undefined;
        if (isAbilityActive(timerAsAbility, skill as any, abilityProgress, now)) {
          const effect = resolveSkillEffect(skill, progress);
          result = mergeEffect(result, effect);
        }
      }
    }
  }

  return result;
}

/**
 * Aggregate globalEffect from ALL equipped skills' graph trees.
 * These cross-skill effects (from keystones) buff ALL skills, not just their own tree.
 */
export function aggregateGraphGlobalEffects(
  skillBar: (EquippedSkill | null)[],
  skillProgress: Record<string, SkillProgress>,
): AbilityEffect {
  let result: AbilityEffect = {};
  for (const slot of skillBar) {
    if (!slot) continue;
    const def = getUnifiedSkillDef(slot.skillId);
    if (!def) continue;
    const progress = skillProgress[slot.skillId];
    if (!progress) continue;

    if (def.talentTree && progress.allocatedRanks) {
      const mod = resolveTalentModifiers(def.talentTree, progress.allocatedRanks);
      result = mergeEffect(result, mod.globalEffect);
      continue;
    }

    if (!def.skillGraph || progress.allocatedNodes.length === 0) continue;
    const mod = resolveSkillGraphModifiers(def.skillGraph, progress.allocatedNodes);
    result = mergeEffect(result, mod.globalEffect);
  }
  return result;
}

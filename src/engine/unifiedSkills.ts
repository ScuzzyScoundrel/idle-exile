// ============================================================
// Idle Exile — Unified Skill Engine (10F)
// Delegates to existing skill/ability engines based on SkillDef.kind.
// Old engine/abilities.ts and engine/skills.ts kept alive until 10J cleanup.
// ============================================================

import type {
  SkillDef, SkillProgress, SkillTimerState, EquippedSkill,
  AbilityEffect, AbilityProgress, ResolvedStats,
} from '../types';
import { calcSkillDamagePerCast, calcSkillDps } from './skills';
import {
  resolveAbilityEffect, mergeEffect, getEffectiveDuration,
  isAbilityActive,
} from './abilities';
import { getUnifiedSkillDef } from '../data/unifiedSkills';

// ─── DPS Calculation ───

/**
 * Calculate DPS for a unified skill.
 * Returns 0 for non-active skills (buffs, passives, etc.).
 */
export function calcUnifiedDps(
  skill: SkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  if (skill.kind !== 'active') return 0;

  // SkillDef matches ActiveSkillDef shape for active skills
  return calcSkillDps(skill, stats, weaponAvgDmg, weaponSpellPower);
}

/**
 * Calculate base damage per cast for a unified skill.
 * Returns 0 for non-active skills.
 */
export function calcUnifiedDamagePerCast(
  skill: SkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  if (skill.kind !== 'active') return 0;
  return calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower);
}

// ─── Effect Resolution ───

/**
 * Resolve the final AbilityEffect for a non-active skill (buff/passive/etc.).
 * Applies skill tree node bonuses from progress.
 * Returns empty effect for active skills.
 */
export function resolveSkillEffect(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): AbilityEffect {
  if (skill.kind === 'active') return {};
  if (!skill.effect) return {};

  // Convert SkillProgress → AbilityProgress shape for delegation
  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  // SkillDef has the same effect/skillTree fields as AbilityDef
  return resolveAbilityEffect(skill as any, abilityProgress);
}

// ─── Duration & Timer Helpers ───

/**
 * Get effective duration for a skill (base + tree bonuses).
 */
export function getSkillEffectiveDuration(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): number {
  if (!skill.duration) return 0;

  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  return getEffectiveDuration(skill as any, abilityProgress);
}

/**
 * Check if a skill's buff is currently active.
 */
export function isSkillActive(
  skill: SkillDef,
  timer: SkillTimerState,
  progress: SkillProgress | undefined,
  now: number,
): boolean {
  if (!timer.activatedAt) return false;
  const duration = getSkillEffectiveDuration(skill, progress);
  return now < timer.activatedAt + duration * 1000;
}

/**
 * Check if a skill is on cooldown.
 */
export function isSkillOnCooldown(timer: SkillTimerState, now: number): boolean {
  if (!timer.cooldownUntil) return false;
  return now < timer.cooldownUntil;
}

// ─── Aggregation ───

/**
 * Aggregate all equipped skill bar effects into a single AbilityEffect.
 * Replaces aggregateAbilityEffects for the unified system.
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
      // Active (damage) skills don't contribute to ability effects
      continue;
    }

    if (skill.kind === 'passive' || skill.kind === 'proc') {
      // Passives and procs always contribute
      const effect = resolveSkillEffect(skill, progress);
      result = mergeEffect(result, effect);
    } else if (skill.kind === 'toggle') {
      // Toggles contribute if timer shows active
      const timer = skillTimers.find(t => t.skillId === equipped.skillId);
      if (timer && timer.activatedAt !== null) {
        const effect = resolveSkillEffect(skill, progress);
        result = mergeEffect(result, effect);
      }
    } else if (skill.kind === 'buff' && !offlineMode) {
      // Buffs contribute only if active (not in offline)
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
    // instant/ultimate: NOT included in sustained aggregation
  }

  return result;
}

/**
 * Get the primary damage skill from a skill bar (first 'active' kind).
 */
export function getPrimaryDamageSkill(
  skillBar: (EquippedSkill | null)[],
): SkillDef | null {
  for (const equipped of skillBar) {
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (skill && skill.kind === 'active') return skill;
  }
  return null;
}

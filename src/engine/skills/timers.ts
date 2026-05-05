// ============================================================
// Skill Timers — duration, cooldown, buff checks, proc/bonus clears
// Phase 2 cleanup 2026-05-04: per-skill talent tree branches removed.
// Effective duration/cooldown now equals base value (Phase D class talents
// will reintroduce talent-driven scaling).
// ============================================================

import type {
  SkillDef, SkillProgress, SkillTimerState,
  AbilityEffect, AbilityProgress, AbilityDef, AbilityTimerState,
  ResolvedStats,
} from '../../types';
import { getAbilityDef } from '../../data/skills';
import { evaluateFormula } from './resolution';

// ─── Duration & Cooldown ───

/**
 * Get effective duration. Per-skill talent trees retired — base duration only.
 */
export function getEffectiveDuration(
  def: AbilityDef,
  _progress: AbilityProgress | undefined,
  _stats?: ResolvedStats,
): number {
  return def.duration ?? 0;
}

/**
 * Legacy: get effective duration using old mutator system.
 */
export function getEffectiveDurationLegacy(equipped: { abilityId: string; selectedMutatorId?: string | null }): number {
  const def = getAbilityDef(equipped.abilityId);
  if (!def || !def.duration) return 0;

  let bonus = 0;
  if (equipped.selectedMutatorId && def.mutators) {
    const mutator = def.mutators.find(m => m.id === equipped.selectedMutatorId);
    if (mutator?.durationBonus) bonus = mutator.durationBonus;
  }
  return def.duration + bonus;
}

/**
 * Get effective cooldown. Per-skill talent trees retired — base cooldown only.
 */
export function getEffectiveCooldown(
  def: AbilityDef,
  _progress: AbilityProgress | undefined,
): number {
  return def.cooldown ?? 0;
}

/**
 * Get effective duration for a skill.
 */
export function getSkillEffectiveDuration(
  skill: SkillDef,
  _progress: SkillProgress | undefined,
): number {
  return skill.duration ?? 0;
}

/**
 * Get effective cooldown for a skill (base + speed stat CDR).
 * Attack speed reduces Attack skill cooldowns; cast speed reduces Spell skill cooldowns.
 */
export function getSkillEffectiveCooldown(
  skill: SkillDef,
  _progress: SkillProgress | undefined,
  speedStat: number = 0,
): number {
  if (!skill.cooldown) return 0;

  let cooldown = skill.cooldown;
  if (speedStat > 0) {
    cooldown = cooldown / (1 + speedStat / 100);
  }
  return Math.max(1, cooldown);
}

/** Get the appropriate speed stat for a skill based on its tags. */
export function getSkillSpeedStat(skill: SkillDef, stats: { attackSpeed: number; castSpeed: number }): number {
  if (skill.tags.includes('Spell')) return stats.castSpeed;
  return stats.attackSpeed; // Attack and untagged default to attack speed
}

// ─── Timer Checks ───

/**
 * Check if an ability's buff is currently active.
 */
export function isAbilityActive(
  timer: AbilityTimerState,
  def: AbilityDef,
  progress: AbilityProgress | undefined,
  now: number,
): boolean {
  if (!timer.activatedAt) return false;
  const duration = getEffectiveDuration(def, progress);
  return now < timer.activatedAt + duration * 1000;
}

/**
 * Check if an ability is currently on cooldown.
 */
export function isAbilityOnCooldown(timer: AbilityTimerState, now: number): boolean {
  if (!timer.cooldownUntil) return false;
  return now < timer.cooldownUntil;
}

/**
 * Get remaining cooldown in seconds (0 if ready).
 */
export function getRemainingCooldown(timer: AbilityTimerState, now: number): number {
  if (!timer.cooldownUntil) return 0;
  return Math.max(0, (timer.cooldownUntil - now) / 1000);
}

/**
 * Get remaining buff duration in seconds (0 if inactive).
 */
export function getRemainingBuff(
  timer: AbilityTimerState,
  def: AbilityDef,
  progress: AbilityProgress | undefined,
  now: number,
): number {
  if (!timer.activatedAt) return 0;
  const duration = getEffectiveDuration(def, progress);
  return Math.max(0, (timer.activatedAt + duration * 1000 - now) / 1000);
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

// ─── Instant / Proc / Bonus Clears ───

/** Calculate bonus clears for instant/ultimate abilities. */
export function calcBonusClears(effect: AbilityEffect, stats: ResolvedStats): number {
  if (!effect.bonusClears) return 1;
  return evaluateFormula(effect.bonusClears, stats);
}

/** Check if proc triggers (random roll against procChance). */
export function rollProc(effect: AbilityEffect): boolean {
  if (!effect.procChance) return false;
  return Math.random() < effect.procChance;
}

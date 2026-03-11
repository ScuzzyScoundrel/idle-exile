// ============================================================
// Skill Timers — duration, cooldown, buff checks, proc/bonus clears
// Extracted from engine/unifiedSkills.ts (Phase B1)
// ============================================================

import type {
  SkillDef, SkillProgress, SkillTimerState,
  AbilityEffect, AbilityProgress, AbilityDef, AbilityTimerState,
  ResolvedStats,
} from '../../types';
import { getAbilityDef } from '../../data/skills';
import { resolveSkillGraphModifiers } from '../skillGraph';
import { getAllTreeNodes, evaluateFormula } from './resolution';

// ─── Duration & Cooldown ───

/**
 * Get effective duration (base + tree node bonuses).
 */
export function getEffectiveDuration(
  def: AbilityDef,
  progress: AbilityProgress | undefined,
  _stats?: ResolvedStats,
): number {
  if (!def.duration) return 0;
  let duration = def.duration;

  if (progress && def.skillTree) {
    const allNodes = getAllTreeNodes(def);
    for (const nodeId of progress.allocatedNodes) {
      const node = allNodes.find(n => n.id === nodeId);
      if (node?.durationBonus) duration += node.durationBonus;
    }
  }

  return duration;
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
 * Get effective cooldown (base - tree node reductions).
 */
export function getEffectiveCooldown(
  def: AbilityDef,
  progress: AbilityProgress | undefined,
): number {
  if (!def.cooldown) return 0;
  let cooldown = def.cooldown;

  if (progress && def.skillTree) {
    const allNodes = getAllTreeNodes(def);
    let totalReduction = 0;
    for (const nodeId of progress.allocatedNodes) {
      const node = allNodes.find(n => n.id === nodeId);
      if (node?.cooldownReduction) totalReduction += node.cooldownReduction;
    }
    cooldown *= (1 - totalReduction / 100);
  }

  return Math.max(1, cooldown);
}

/**
 * Get effective duration for a skill (base + tree bonuses).
 */
export function getSkillEffectiveDuration(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): number {
  if (!skill.duration) return 0;

  if (skill.skillGraph && progress) {
    const graphMod = resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
    return skill.duration + graphMod.durationBonus;
  }

  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  return getEffectiveDuration(skill as any, abilityProgress);
}

/**
 * Get effective cooldown for a skill (base + tree bonuses + ability haste).
 */
export function getSkillEffectiveCooldown(
  skill: SkillDef,
  progress: SkillProgress | undefined,
  abilityHaste: number = 0,
): number {
  if (!skill.cooldown) return 0;

  let cooldown: number;

  if (skill.skillGraph && progress) {
    const graphMod = resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
    cooldown = skill.cooldown * (1 - graphMod.cooldownReduction / 100);
  } else {
    const abilityProgress: AbilityProgress | undefined = progress ? {
      abilityId: progress.skillId,
      xp: progress.xp,
      level: progress.level,
      allocatedNodes: progress.allocatedNodes,
    } : undefined;
    cooldown = getEffectiveCooldown(skill as any, abilityProgress);
  }

  if (abilityHaste > 0) {
    cooldown = cooldown / (1 + abilityHaste / 100);
  }

  return Math.max(1, cooldown);
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

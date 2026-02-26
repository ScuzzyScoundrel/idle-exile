// ============================================================
// Idle Exile — Ability Engine
// Pure TS functions: resolve effects, aggregate, timers, skill trees, XP.
// No React, no side effects.
// ============================================================

import type {
  AbilityEffect, AbilityDef, AbilityProgress,
  EquippedAbility, AbilityTimerState, WeaponType,
  ResolvedStats, ScalingFormula, SkillTreeNode,
} from '../types';
import { ABILITY_SLOT_UNLOCKS } from '../types';
import { getAbilityDef } from '../data/abilities';

/** An empty/identity effect — multipliers at 1.0, bonuses at 0. */
const EMPTY_EFFECT: AbilityEffect = {};

// ─── Scaling Formulas ───

/** Evaluate a ScalingFormula against character stats. */
export function evaluateFormula(formula: ScalingFormula, stats: ResolvedStats): number {
  let result = formula.base;
  if (formula.scaling) {
    for (const term of formula.scaling) {
      result += Math.floor(stats[term.stat] / term.divisor);
    }
  }
  return Math.max(0, result);
}

// ─── Skill Tree Resolution ───

/** Get all nodes from a skill tree as a flat array. */
function getAllTreeNodes(def: AbilityDef): SkillTreeNode[] {
  if (!def.skillTree) return [];
  return def.skillTree.paths.flatMap(p => p.nodes);
}

/**
 * Resolve the final effect for an ability (base + allocated skill tree nodes).
 * Replaces old mutator-based resolution.
 */
export function resolveAbilityEffect(
  def: AbilityDef,
  progress: AbilityProgress | undefined,
): AbilityEffect {
  const baseEffect = { ...def.effect };
  if (!progress || !def.skillTree) return baseEffect;

  const allNodes = getAllTreeNodes(def);
  let merged = baseEffect;

  for (const nodeId of progress.allocatedNodes) {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) continue;

    if (node.isPathPayoff) {
      // Payoff nodes override rather than merge additively
      merged = { ...merged, ...node.effect };
    } else {
      merged = mergeEffect(merged, node.effect as AbilityEffect);
    }
  }

  return merged;
}

/**
 * Legacy: resolve effect using old mutator system (for backwards compat during migration).
 */
export function resolveAbilityEffectLegacy(equipped: EquippedAbility): AbilityEffect {
  const def = getAbilityDef(equipped.abilityId);
  if (!def) return EMPTY_EFFECT;

  if (!equipped.selectedMutatorId || !def.mutators) {
    return { ...def.effect };
  }

  const mutator = def.mutators.find(m => m.id === equipped.selectedMutatorId);
  if (!mutator) return { ...def.effect };

  return { ...def.effect, ...mutator.effectOverride };
}

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
export function getEffectiveDurationLegacy(equipped: EquippedAbility): number {
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

// ─── Instant / Proc / Bonus Clears ───

/** Calculate bonus clears for instant/ultimate abilities. */
export function calcBonusClears(effect: AbilityEffect, stats: ResolvedStats): number {
  if (!effect.bonusClears) return 1; // default: 1 bonus clear
  return evaluateFormula(effect.bonusClears, stats);
}

/** Check if proc triggers (random roll against procChance). */
export function rollProc(effect: AbilityEffect): boolean {
  if (!effect.procChance) return false;
  return Math.random() < effect.procChance;
}

// ─── Ability Slot Unlocks ───

/** Get number of unlocked ability slots for a character level. */
export function getUnlockedSlotCount(characterLevel: number): number {
  let count = 0;
  for (const unlockLevel of ABILITY_SLOT_UNLOCKS) {
    if (characterLevel >= unlockLevel) count++;
  }
  return count;
}

// ─── Ability XP ───

/** XP needed for next level: 100 * (level + 1). */
export function getAbilityXpForLevel(level: number): number {
  return 100 * (level + 1);
}

/** Add XP and return updated progress (handles level-ups). */
export function addAbilityXp(progress: AbilityProgress, xpGained: number): AbilityProgress {
  if (progress.level >= 10) return progress; // max level
  let { xp, level } = progress;
  xp += xpGained;

  while (level < 10) {
    const needed = getAbilityXpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
    } else {
      break;
    }
  }

  if (level >= 10) xp = 0; // cap at max

  return { ...progress, xp, level };
}

/** Get XP gained per clear: 10 + floor(zoneBand * 2). */
export function getAbilityXpPerClear(zoneBand: number): number {
  return 10 + Math.floor(zoneBand * 2);
}

// ─── Skill Tree Allocation ───

/** Can a tree node be allocated? */
export function canAllocateNode(
  def: AbilityDef,
  progress: AbilityProgress,
  nodeId: string,
): boolean {
  if (!def.skillTree) return false;

  // Already allocated?
  if (progress.allocatedNodes.includes(nodeId)) return false;

  // Has available points? (level = total points, minus already allocated)
  const availablePoints = progress.level - progress.allocatedNodes.length;
  if (availablePoints <= 0) return false;

  // Find the node
  const allNodes = getAllTreeNodes(def);
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return false;

  // Check prerequisite
  if (node.requiresNodeId && !progress.allocatedNodes.includes(node.requiresNodeId)) {
    return false;
  }

  return true;
}

/** Allocate a tree node (returns new progress). */
export function allocateNode(progress: AbilityProgress, nodeId: string): AbilityProgress {
  return {
    ...progress,
    allocatedNodes: [...progress.allocatedNodes, nodeId],
  };
}

/** Respec an ability (reset all nodes and XP to 0). */
export function respecAbility(progress: AbilityProgress): AbilityProgress {
  return {
    ...progress,
    xp: 0,
    level: 0,
    allocatedNodes: [],
  };
}

/** Get respec cost in gold: 50 * level^2. */
export function getRespecCost(progress: AbilityProgress): number {
  return 50 * progress.level * progress.level;
}

/** Create initial ability progress for a newly equipped ability. */
export function createAbilityProgress(abilityId: string): AbilityProgress {
  return {
    abilityId,
    xp: 0,
    level: 0,
    allocatedNodes: [],
  };
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

// ─── Effect Merging ───

/**
 * Merge two AbilityEffects together.
 * Multiplicative fields multiply, additive fields sum, booleans OR.
 */
export function mergeEffect(target: AbilityEffect, source: AbilityEffect): AbilityEffect {
  return {
    damageMult: (target.damageMult ?? 1) * (source.damageMult ?? 1),
    attackSpeedMult: (target.attackSpeedMult ?? 1) * (source.attackSpeedMult ?? 1),
    defenseMult: (target.defenseMult ?? 1) * (source.defenseMult ?? 1),
    clearSpeedMult: (target.clearSpeedMult ?? 1) * (source.clearSpeedMult ?? 1),
    critChanceBonus: (target.critChanceBonus ?? 0) + (source.critChanceBonus ?? 0),
    critMultiplierBonus: (target.critMultiplierBonus ?? 0) + (source.critMultiplierBonus ?? 0),
    xpMult: (target.xpMult ?? 1) * (source.xpMult ?? 1),
    itemDropMult: (target.itemDropMult ?? 1) * (source.itemDropMult ?? 1),
    materialDropMult: (target.materialDropMult ?? 1) * (source.materialDropMult ?? 1),
    resistBonus: (target.resistBonus ?? 0) + (source.resistBonus ?? 0),
    ignoreHazards: (target.ignoreHazards ?? false) || (source.ignoreHazards ?? false),
    doubleClears: (target.doubleClears ?? false) || (source.doubleClears ?? false),
  };
}

// ─── Aggregation ───

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
      // Passives always contribute
      const effect = resolveAbilityEffect(def, progress);
      result = mergeEffect(result, effect);
    } else if (def.kind === 'proc') {
      // Proc abilities are passive-like (their proc triggers separately)
      // Include base effect in aggregation
      const effect = resolveAbilityEffect(def, progress);
      result = mergeEffect(result, effect);
    } else if (def.kind === 'toggle') {
      // Toggle: include if timer shows active
      const timer = timers.find(t => t.abilityId === equipped.abilityId);
      if (timer && timer.activatedAt !== null) {
        const effect = resolveAbilityEffect(def, progress);
        result = mergeEffect(result, effect);
      }
    } else if (def.kind === 'buff' && !offlineMode) {
      // Buff abilities contribute only if buff is active (and not offline)
      const timer = timers.find(t => t.abilityId === equipped.abilityId);
      if (timer && isAbilityActive(timer, def, progress, now)) {
        const effect = resolveAbilityEffect(def, progress);
        result = mergeEffect(result, effect);
      }
    }
    // instant/ultimate: NOT included in sustained aggregation
  }

  return result;
}

// ─── Compatibility ───

/**
 * Get list of ability IDs that are incompatible with the given weapon type.
 */
export function getIncompatibleAbilities(
  equippedAbilities: (EquippedAbility | null)[],
  weaponType: WeaponType | null,
): string[] {
  if (!weaponType) return [];
  const incompatible: string[] = [];
  for (const equipped of equippedAbilities) {
    if (!equipped) continue;
    const def = getAbilityDef(equipped.abilityId);
    if (def && def.weaponType !== weaponType) {
      incompatible.push(equipped.abilityId);
    }
  }
  return incompatible;
}

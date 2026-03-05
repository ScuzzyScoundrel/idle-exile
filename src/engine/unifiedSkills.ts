// ============================================================
// Idle Exile — Unified Skill Engine (10J)
// All ability + skill engine functions inlined into a single module.
// No imports from engine/abilities.ts or engine/skills.ts.
// ============================================================

import type {
  SkillDef, SkillProgress, SkillTimerState, EquippedSkill,
  AbilityEffect, AbilityProgress, AbilityDef, AbilityTimerState, EquippedAbility,
  ResolvedStats, ScalingFormula, SkillTreeNode, WeaponType, ZoneDef, ActiveSkillDef,
  TempBuff, DamageResult, DamageBucket,
} from '../types';
import { ABILITY_SLOT_UNLOCKS } from '../types';
import { calcHitChance } from './character';
import { getUnifiedSkillDef, getAbilityDef, getSkillsForWeapon } from '../data/unifiedSkills';
import { POWER_DIVISOR, SKILL_MAX_LEVEL, BASE_GCD, GCD_FLOOR } from '../data/balance';
import { resolveSkillGraphModifiers, type ResolvedSkillModifier } from './skillGraph';
import { resolveDamageBuckets } from './damageBuckets';

// ─── Constants ───

/** An empty/identity effect — multipliers at 1.0, bonuses at 0. */
export const EMPTY_EFFECT: AbilityEffect = {};

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

// ─── Effect Resolution ───

/**
 * Get the resolved graph modifier for a skill, or null if no graph tree.
 */
export function getSkillGraphModifier(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): ResolvedSkillModifier | null {
  if (!skill.skillGraph || !progress) return null;
  return resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
}

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

  // Graph tree path: merge graph abilityEffect with base effect
  if (skill.skillGraph && progress) {
    const graphMod = resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
    return mergeEffect({ ...skill.effect }, graphMod.abilityEffect);
  }

  // Old tree path
  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  return resolveAbilityEffect(skill as any, abilityProgress);
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

/**
 * Get effective duration for a skill (base + tree bonuses).
 */
export function getSkillEffectiveDuration(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): number {
  if (!skill.duration) return 0;

  // Graph tree path
  if (skill.skillGraph && progress) {
    const graphMod = resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
    return skill.duration + graphMod.durationBonus;
  }

  // Old tree path
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
 * Ability haste uses LoL-style diminishing returns: cd / (1 + haste/100).
 */
export function getSkillEffectiveCooldown(
  skill: SkillDef,
  progress: SkillProgress | undefined,
  abilityHaste: number = 0,
): number {
  if (!skill.cooldown) return 0;

  let cooldown: number;

  // Graph tree path
  if (skill.skillGraph && progress) {
    const graphMod = resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
    cooldown = skill.cooldown * (1 - graphMod.cooldownReduction / 100);
  } else {
    // Old tree path
    const abilityProgress: AbilityProgress | undefined = progress ? {
      abilityId: progress.skillId,
      xp: progress.xp,
      level: progress.level,
      allocatedNodes: progress.allocatedNodes,
    } : undefined;
    cooldown = getEffectiveCooldown(skill as any, abilityProgress);
  }

  // Apply ability haste (diminishing returns: cd / (1 + haste/100))
  if (abilityHaste > 0) {
    cooldown = cooldown / (1 + abilityHaste / 100);
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

/**
 * Aggregate active TempBuff effects into a single AbilityEffect.
 * Stack-scales multiplicative fields: 1 + (mult - 1) * stacks (e.g. 1.1x at 3 stacks = 1.3x).
 * Additive fields simply multiply by stacks.
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

// ─── Graph Global Effects ───

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
    if (!def?.skillGraph) continue;
    const progress = skillProgress[slot.skillId];
    if (!progress || progress.allocatedNodes.length === 0) continue;
    const mod = resolveSkillGraphModifiers(def.skillGraph, progress.allocatedNodes);
    result = mergeEffect(result, mod.globalEffect);
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

/** XP needed for next level: quadratic curve — 100 * (level + 1) * (1 + level * 0.1). */
export function getAbilityXpForLevel(level: number): number {
  return Math.round(100 * (level + 1) * (1 + level * 0.1));
}

/** Add XP and return updated progress (handles level-ups). */
export function addAbilityXp(progress: AbilityProgress, xpGained: number): AbilityProgress {
  if (progress.level >= SKILL_MAX_LEVEL) return progress; // max level
  let { xp, level } = progress;
  xp += xpGained;

  while (level < SKILL_MAX_LEVEL) {
    const needed = getAbilityXpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
    } else {
      break;
    }
  }

  if (level >= SKILL_MAX_LEVEL) xp = 0; // cap at max

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

// ─── DPS Calculation ───

/**
 * Compute base damage per skill cast BEFORE hit/crit/speed multipliers.
 * = baseDmg (with flat additions) * incMult * hitCount
 * Shared by calcSkillDps (expected-value) and simulateCombatClear (per-hit).
 * Optional graphMod applies graph tree bonuses (flat damage, %inc, extra hits, conversion).
 */
export function calcSkillDamagePerCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  graphMod?: ResolvedSkillModifier,
): DamageResult {
  return resolveDamageBuckets(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod);
}

/**
 * Calculate DPS for an active skill given resolved character stats and weapon info.
 * Cooldown-aware: DPS = dmgPerCast / cycleTime where cycleTime = max(castInterval, effectiveCooldown).
 * Speed compresses cast time & GCD; ability haste compresses cooldowns. Orthogonal.
 *
 * @param skill - The active skill definition
 * @param stats - Fully resolved character stats (including abilityHaste)
 * @param weaponAvgDmg - Average physical damage of equipped weapon
 * @param weaponSpellPower - Base spell power of equipped weapon
 * @param graphMod - Optional skill graph modifier (for CDR, flat damage, etc.)
 * @param atkSpeedMult - Ability/class attack speed multiplier (default 1.0)
 */
export function calcSkillDps(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  graphMod?: ResolvedSkillModifier,
  atkSpeedMult: number = 1.0,
): number {
  const dmgResult = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod);
  const dmgPerCast = dmgResult.total;
  if (dmgPerCast <= 0) return 0;

  // --- Hit chance (both attacks and spells use accuracy) ---
  const hitChance = calcHitChance(stats.accuracy);

  // --- Crit multiplier (expected value), with graph bonuses ---
  const effectiveCritChance = Math.min(stats.critChance + (graphMod?.incCritChance ?? 0), 100);
  const effectiveCritMult = stats.critMultiplier + (graphMod?.incCritMultiplier ?? 0);
  const critMult = 1 + (effectiveCritChance / 100) * ((effectiveCritMult - 100) / 100);

  // --- Cast interval (speed-compressed, GCD-floored) ---
  const graphSpeedMult = graphMod?.incCastSpeed ? (1 + graphMod.incCastSpeed / 100) : 1;
  const castInterval = calcSkillCastInterval(skill, stats, atkSpeedMult * graphSpeedMult);

  // --- Effective cooldown (graph CDR + ability haste) ---
  let effectiveCooldown = 0;
  if (skill.cooldown > 0) {
    const graphCDR = graphMod?.cooldownReduction ?? 0;
    effectiveCooldown = skill.cooldown * (1 - graphCDR / 100);
    if (stats.abilityHaste > 0) {
      effectiveCooldown = effectiveCooldown / (1 + stats.abilityHaste / 100);
    }
    effectiveCooldown = Math.max(1, effectiveCooldown);
  }

  // --- Cycle time: the real bottleneck ---
  const cycleTime = Math.max(castInterval, effectiveCooldown);

  // --- Per-second DPS ---
  const effectiveDmgPerCast = dmgPerCast * hitChance * critMult;
  let dps = effectiveDmgPerCast / cycleTime;

  // --- DoT bonus: damage dealt over dotDuration, amortized over cycleTime ---
  if (skill.dotDuration && skill.dotDamagePercent) {
    const dotTotalDmg = effectiveDmgPerCast * skill.dotDamagePercent * skill.dotDuration;
    dps += dotTotalDmg / cycleTime;
  }

  return dps;
}

// ─── Combat Helpers ───

/**
 * Get the default (first unlocked) skill for a weapon type at a given player level.
 * Falls back to the first skill for that weapon regardless of level.
 */
export function getDefaultSkillForWeapon(weaponType: WeaponType, playerLevel: number = 1): ActiveSkillDef | null {
  const skills = getSkillsForWeapon(weaponType);
  if (skills.length === 0) return null;

  // Find the lowest-cooldown skill the player can use (prefer basic starter)
  const unlocked = skills.filter(s => s.levelRequired <= playerLevel);
  if (unlocked.length > 0) {
    // Sort by cooldown ascending — basic skills (lowest CD) first
    const sorted = [...unlocked].sort((a, b) => a.cooldown - b.cooldown);
    return sorted[0];
  }

  // Fallback: first skill for this weapon
  return skills[0];
}

/**
 * Calculate Mob HP for a zone (used in clear time formula).
 * mobHp = baseClearTime * POWER_DIVISOR
 * This is mathematically equivalent to the old formula:
 *   clearTime = baseClearTime / (charPower / POWER_DIVISOR)
 *            = (baseClearTime * POWER_DIVISOR) / charPower
 *            = mobHp / charPower
 */
export function calcMobHp(zone: ZoneDef, hpMultiplier: number = 1.0): number {
  return zone.baseClearTime * POWER_DIVISOR * hpMultiplier;
}

// ─── Real-Time Combat (10K-A) ───

/**
 * Calculate effective cast interval (seconds) for an active skill,
 * accounting for attack/cast speed, ability speed multiplier, and GCD floor.
 * Returns max(castTime/speed, BASE_GCD/speed, GCD_FLOOR).
 */
export function calcSkillCastInterval(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  atkSpeedMult: number,
): number {
  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  let speedMult = 1.0;
  if (isAttack) speedMult = (1 + stats.attackSpeed / 100) * atkSpeedMult;
  if (isSpell) speedMult = (1 + stats.castSpeed / 100) * atkSpeedMult;

  const effectiveCastTime = skill.castTime / speedMult;
  const effectiveGCD = BASE_GCD / speedMult;

  return Math.max(effectiveCastTime, effectiveGCD, GCD_FLOOR);
}

/**
 * Roll a single skill cast with hit/miss, crit, damage variance.
 * Reuses logic from simulateCombatClear per-hit rolls.
 * Optional graphMod applies graph tree bonuses (crit, flags).
 */
export function rollSkillCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  damageMult: number,
  graphMod?: ResolvedSkillModifier,
): { damage: number; isCrit: boolean; isHit: boolean; graphMod?: ResolvedSkillModifier; buckets?: DamageBucket[] } {
  const dmgResult = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod);
  const baseDmgPerCast = dmgResult.total * damageMult;
  if (baseDmgPerCast <= 0) return { damage: 0, isCrit: false, isHit: false };

  // Hit chance: both attacks and spells use accuracy formula
  const hitChance = calcHitChance(stats.accuracy);
  if (Math.random() > hitChance) return { damage: 0, isCrit: false, isHit: false };

  // Crit roll with graph modifier
  let effectiveCritChance = stats.critChance + (graphMod?.incCritChance ?? 0);
  const hasAlwaysCrit = graphMod?.flags.includes('alwaysCrit');
  const hasCannotCrit = graphMod?.flags.includes('cannotCrit');
  if (hasCannotCrit) effectiveCritChance = 0;
  if (hasAlwaysCrit) effectiveCritChance = 100;

  const critChance = Math.min(effectiveCritChance, 100) / 100;
  const isCrit = Math.random() < critChance;
  const critDmgMult = (stats.critMultiplier + (graphMod?.incCritMultiplier ?? 0)) / 100;

  // Damage with +/-10% variance
  const variance = 0.9 + Math.random() * 0.2;
  const scaleMult = variance * (isCrit ? critDmgMult : 1) * damageMult;
  const damage = dmgResult.total * scaleMult;

  // Scale each bucket by the same multiplier
  const scaledBuckets: DamageBucket[] = dmgResult.buckets.map(b => ({
    type: b.type,
    amount: b.amount * scaleMult,
  }));

  return { damage, isCrit, isHit: true, graphMod, buckets: scaledBuckets };
}

// ─── Unified Wrappers ───

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
  return calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower).total;
}

/**
 * Calculate total rotation DPS across all equipped active skills.
 * Each skill contributes its individual DPS (dmg/cycleTime), summed together.
 * This works because skills fire independently on staggered cooldowns.
 */
export function calcRotationDps(
  skillBar: (EquippedSkill | null)[],
  skillProgress: Record<string, SkillProgress>,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  atkSpeedMult: number = 1.0,
): number {
  let totalDps = 0;
  for (const equipped of skillBar) {
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (!skill || skill.kind !== 'active') continue;

    const progress = skillProgress[equipped.skillId];
    const graphMod = getSkillGraphModifier(skill, progress);
    totalDps += calcSkillDps(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod ?? undefined, atkSpeedMult);
  }
  return totalDps;
}

/**
 * Get the primary damage skill from a skill bar (first 'active' kind).
 * Used by offline DPS estimation (single-skill model).
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

/**
 * Get the next active skill ready to fire in the rotation.
 * Iterates slots 0→4 in priority order; returns first active skill off cooldown.
 * Returns { skill, slotIndex } or null if all active skills are on CD.
 */
export function getNextRotationSkill(
  skillBar: (EquippedSkill | null)[],
  skillTimers: SkillTimerState[],
  now: number,
): { skill: SkillDef; slotIndex: number } | null {
  for (let i = 0; i < skillBar.length; i++) {
    const equipped = skillBar[i];
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (!skill || skill.kind !== 'active') continue;

    // Check per-skill cooldown
    const timer = skillTimers.find(t => t.skillId === equipped.skillId);
    if (timer && timer.cooldownUntil != null && now < timer.cooldownUntil) {
      continue; // This skill is on cooldown
    }

    return { skill, slotIndex: i };
  }
  return null;
}

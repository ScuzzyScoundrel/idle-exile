// ============================================================
// Idle Exile — Unified Skill Engine (10J)
// All ability + skill engine functions inlined into a single module.
// No imports from engine/abilities.ts or engine/skills.ts.
// ============================================================

import type {
  SkillDef, SkillProgress, SkillTimerState, EquippedSkill,
  AbilityEffect, AbilityProgress, AbilityDef, AbilityTimerState, EquippedAbility,
  ResolvedStats, ScalingFormula, SkillTreeNode, WeaponType, ZoneDef, ActiveSkillDef,
} from '../types';
import { ABILITY_SLOT_UNLOCKS } from '../types';
import { calcHitChance } from './character';
import { getUnifiedSkillDef, getAbilityDef, getSkillsForWeapon } from '../data/unifiedSkills';
import { POWER_DIVISOR } from '../data/balance';

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

  // Convert SkillProgress -> AbilityProgress shape for delegation
  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  // SkillDef has the same effect/skillTree fields as AbilityDef
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

  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  return getEffectiveDuration(skill as any, abilityProgress);
}

/**
 * Get effective cooldown for a skill (base + tree bonuses).
 */
export function getSkillEffectiveCooldown(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): number {
  if (!skill.cooldown) return 0;

  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  return getEffectiveCooldown(skill as any, abilityProgress);
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

// ─── DPS Calculation ───

/**
 * Compute base damage per skill cast BEFORE hit/crit/speed multipliers.
 * = baseDmg (with flat additions) * incMult * hitCount
 * Shared by calcSkillDps (expected-value) and simulateCombatClear (per-hit).
 */
export function calcSkillDamagePerCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  // --- Step 1: Base damage ---
  let baseDmg = skill.baseDamage;

  if (isAttack) {
    baseDmg += weaponAvgDmg * skill.weaponDamagePercent;
    if (tags.includes('Physical')) baseDmg += stats.flatPhysDamage;
    if (tags.includes('Fire')) baseDmg += stats.flatAtkFireDamage;
    if (tags.includes('Cold')) baseDmg += stats.flatAtkColdDamage;
    if (tags.includes('Lightning')) baseDmg += stats.flatAtkLightningDamage;
    if (tags.includes('Chaos')) baseDmg += stats.flatAtkChaosDamage;
  }

  if (isSpell) {
    baseDmg += (weaponSpellPower + stats.spellPower) * skill.spellPowerRatio;
    if (tags.includes('Fire')) baseDmg += stats.flatSpellFireDamage;
    if (tags.includes('Cold')) baseDmg += stats.flatSpellColdDamage;
    if (tags.includes('Lightning')) baseDmg += stats.flatSpellLightningDamage;
    if (tags.includes('Chaos')) baseDmg += stats.flatSpellChaosDamage;
  }

  if (baseDmg <= 0) return 0;

  // --- Step 2: %increased (all ADDITIVE) ---
  let totalInc = 0;
  if (isAttack) totalInc += stats.incAttackDamage;
  if (isSpell) totalInc += stats.incSpellDamage;
  if (tags.includes('Physical')) totalInc += stats.incPhysDamage;
  if (tags.includes('Fire')) totalInc += stats.incFireDamage + stats.incElementalDamage;
  if (tags.includes('Cold')) totalInc += stats.incColdDamage + stats.incElementalDamage;
  if (tags.includes('Lightning')) totalInc += stats.incLightningDamage + stats.incElementalDamage;
  // Delivery tag scaling
  if (tags.includes('Melee'))      totalInc += stats.incMeleeDamage;
  if (tags.includes('Projectile')) totalInc += stats.incProjectileDamage;
  if (tags.includes('AoE'))        totalInc += stats.incAoEDamage;
  if (tags.includes('DoT'))        totalInc += stats.incDoTDamage;
  if (tags.includes('Channel'))    totalInc += stats.incChannelDamage;

  const incMult = 1 + totalInc / 100;

  // --- Hit count ---
  const hitCount = skill.hitCount ?? 1;

  return baseDmg * incMult * hitCount;
}

/**
 * Calculate DPS for an active skill given resolved character stats and weapon info.
 *
 * Uses PoE-style ADDITIVE %increased:
 *   totalInc = sum of all matching %inc stats
 *   multiplier = (1 + totalInc / 100)
 *
 * @param skill - The active skill definition
 * @param stats - Fully resolved character stats
 * @param weaponAvgDmg - Average physical damage of equipped weapon
 * @param weaponSpellPower - Base spell power of equipped weapon
 */
export function calcSkillDps(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  const dmgPerCast = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower);
  if (dmgPerCast <= 0) return 0;

  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  // --- Speed multiplier ---
  let speedMult = 1.0;
  if (isAttack) speedMult = 1 + stats.attackSpeed / 100;
  if (isSpell) speedMult = 1 + stats.castSpeed / 100;

  // --- Hit chance (Attack only; Spells always hit) ---
  const hitChance = isAttack ? calcHitChance(stats.accuracy) : 1.0;

  // --- Crit multiplier (expected value) ---
  const critMult = 1 + (stats.critChance / 100) * ((stats.critMultiplier - 100) / 100);

  // --- Per-second DPS ---
  const effectiveDmgPerCast = dmgPerCast * hitChance * critMult;
  let dps = (effectiveDmgPerCast / skill.castTime) * speedMult;

  // --- DoT bonus ---
  if (skill.dotDuration && skill.dotDamagePercent) {
    const dotDpsBonus = (effectiveDmgPerCast * skill.dotDamagePercent * skill.dotDuration) / skill.castTime * speedMult;
    dps += dotDpsBonus;
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

  // Find the highest-level skill the player can use (prefer basic spammable)
  const unlocked = skills.filter(s => s.levelRequired <= playerLevel && s.cooldown === 0);
  if (unlocked.length > 0) return unlocked[0]; // First = basic spammable

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
export function calcMobHp(zone: ZoneDef): number {
  return zone.baseClearTime * POWER_DIVISOR;
}

// ─── Real-Time Combat (10K-A) ───

/**
 * Calculate effective cast interval (seconds) for an active skill,
 * accounting for attack/cast speed and ability speed multiplier.
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

  return skill.castTime / speedMult;
}

/**
 * Roll a single skill cast with hit/miss, crit, damage variance.
 * Reuses logic from simulateCombatClear per-hit rolls.
 */
export function rollSkillCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  damageMult: number,
): { damage: number; isCrit: boolean; isHit: boolean } {
  const baseDmgPerCast = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower) * damageMult;
  if (baseDmgPerCast <= 0) return { damage: 0, isCrit: false, isHit: false };

  const tags = skill.tags;
  const isAttack = tags.includes('Attack');

  // Hit chance: attacks use accuracy formula, spells always hit
  const hitChance = isAttack ? stats.accuracy / (stats.accuracy + 500) : 1.0;
  if (Math.random() > hitChance) return { damage: 0, isCrit: false, isHit: false };

  // Crit roll
  const critChance = Math.min(stats.critChance, 100) / 100;
  const isCrit = Math.random() < critChance;
  const critDmgMult = stats.critMultiplier / 100;

  // Damage with +/-10% variance
  const variance = 0.9 + Math.random() * 0.2;
  const damage = baseDmgPerCast * variance * (isCrit ? critDmgMult : 1);

  return { damage, isCrit, isHit: true };
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
  return calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower);
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

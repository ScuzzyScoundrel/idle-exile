// ============================================================
// Skill Resolution — formula evaluation, tree resolution, effect resolution
// Extracted from engine/unifiedSkills.ts (Phase B2)
// ============================================================

import type {
  SkillDef, SkillProgress, EquippedAbility,
  AbilityEffect, AbilityProgress, AbilityDef,
  ResolvedStats, ScalingFormula, SkillTreeNode,
} from '../../types';
import { getAbilityDef } from '../../data/skills';
import { resolveSkillGraphModifiers, type ResolvedSkillModifier } from '../skillGraph';
export type { ResolvedSkillModifier } from '../skillGraph';
import { resolveTalentModifiers } from '../talentTree';
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

/** An empty/identity effect — multipliers at 1.0, bonuses at 0. */
export const EMPTY_EFFECT: AbilityEffect = {};

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

/** Get all nodes from a skill tree as a flat array. */
export function getAllTreeNodes(def: AbilityDef): SkillTreeNode[] {
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

/**
 * Get the resolved graph modifier for a skill, or null if no graph tree.
 */
export function getSkillGraphModifier(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): ResolvedSkillModifier | null {
  if (skill.talentTree && progress?.allocatedRanks) {
    return resolveTalentModifiers(skill.talentTree, progress.allocatedRanks);
  }
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

  if (skill.skillGraph && progress) {
    const graphMod = resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
    return mergeEffect({ ...skill.effect }, graphMod.abilityEffect);
  }

  const abilityProgress: AbilityProgress | undefined = progress ? {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  } : undefined;

  return resolveAbilityEffect(skill as any, abilityProgress);
}

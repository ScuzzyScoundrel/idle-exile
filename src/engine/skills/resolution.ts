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
 * When a talent tree exists, also merges the branch template (root/minor)
 * nodes from the old skill graph for each branch the player has invested in.
 */
export function getSkillGraphModifier(
  skill: SkillDef,
  progress: SkillProgress | undefined,
): ResolvedSkillModifier | null {
  if (skill.talentTree && progress?.allocatedRanks) {
    const talentMod = resolveTalentModifiers(skill.talentTree, progress.allocatedRanks);

    // Merge branch template nodes from old skill graph for invested branches
    if (skill.skillGraph) {
      const investedBranches = getInvestedBranchIndices(skill.talentTree, progress.allocatedRanks);
      if (investedBranches.size > 0) {
        const templateNodeIds = getBranchTemplateNodeIds(skill.skillGraph, investedBranches);
        if (templateNodeIds.length > 0) {
          const templateMod = resolveSkillGraphModifiers(skill.skillGraph, templateNodeIds);
          mergeResolvedModifiers(talentMod, templateMod);
        }
      }
    }

    return talentMod;
  }
  if (!skill.skillGraph || !progress) return null;
  return resolveSkillGraphModifiers(skill.skillGraph, progress.allocatedNodes);
}

/**
 * Find which branch indices (0, 1, 2) have at least one allocated talent rank.
 */
function getInvestedBranchIndices(
  tree: import('../../types').TalentTree,
  ranks: Record<string, number>,
): Set<number> {
  const invested = new Set<number>();
  for (let bi = 0; bi < tree.branches.length; bi++) {
    for (const node of tree.branches[bi].nodes) {
      if ((ranks[node.id] ?? 0) > 0) {
        invested.add(bi);
        break;
      }
    }
  }
  return invested;
}

/**
 * Get skill graph node IDs for branch template root/minor nodes.
 * Branch index 0 → b1_root/b1_m1, index 1 → b2_root/b2_m1, etc.
 */
function getBranchTemplateNodeIds(
  graph: import('../../types').SkillGraph,
  branchIndices: Set<number>,
): string[] {
  const ids: string[] = [];
  for (const bi of branchIndices) {
    const bNum = bi + 1; // branchIndex 0 → b1
    const rootSuffix = `_b${bNum}_root`;
    const minorSuffix = `_b${bNum}_m1`;
    for (const node of graph.nodes) {
      if (node.id.endsWith(rootSuffix) || node.id.endsWith(minorSuffix)) {
        ids.push(node.id);
      }
    }
  }
  return ids;
}

/**
 * Merge source resolved modifiers into target (mutates target).
 * Additive fields sum, arrays concat, debuffInteraction merges.
 */
function mergeResolvedModifiers(target: ResolvedSkillModifier, source: ResolvedSkillModifier): void {
  target.incDamage += source.incDamage;
  target.flatDamage += source.flatDamage;
  target.incCritChance += source.incCritChance;
  target.incCritMultiplier += source.incCritMultiplier;
  target.incCastSpeed += source.incCastSpeed;
  target.extraHits += source.extraHits;
  target.durationBonus += source.durationBonus;
  target.cooldownReduction += source.cooldownReduction;
  target.damageFromArmor += source.damageFromArmor;
  target.damageFromEvasion += source.damageFromEvasion;
  target.damageFromMaxLife += source.damageFromMaxLife;
  target.leechPercent += source.leechPercent;
  target.lifeOnHit += source.lifeOnHit;
  target.lifeOnKill += source.lifeOnKill;
  target.chainCount += source.chainCount;
  target.forkCount += source.forkCount;
  target.pierceCount += source.pierceCount;
  target.overkillDamage += source.overkillDamage;
  target.firePenetration += source.firePenetration;
  target.coldPenetration += source.coldPenetration;
  target.lightningPenetration += source.lightningPenetration;
  target.chaosPenetration += source.chaosPenetration;
  target.dotMultiplier += source.dotMultiplier;
  target.weaponMastery += source.weaponMastery;
  target.ailmentDuration += source.ailmentDuration;

  // Array fields
  target.debuffs.push(...source.debuffs);
  target.procs.push(...source.procs);
  target.flags.push(...source.flags);
  target.conditionalMods.push(...source.conditionalMods);
  target.skillProcs.push(...source.skillProcs);
  target.splitDamage.push(...source.splitDamage);

  // Debuff interaction: merge fields (talent tree takes priority for conflicts)
  if (source.debuffInteraction) {
    if (!target.debuffInteraction) {
      target.debuffInteraction = source.debuffInteraction;
    } else {
      target.debuffInteraction = {
        ...source.debuffInteraction,
        ...target.debuffInteraction,
        // Additive fields: sum where both exist
        debuffDurationBonus: (target.debuffInteraction.debuffDurationBonus ?? 0) +
          (source.debuffInteraction.debuffDurationBonus ?? 0) || undefined,
        debuffEffectBonus: (target.debuffInteraction.debuffEffectBonus ?? 0) +
          (source.debuffInteraction.debuffEffectBonus ?? 0) || undefined,
      };
    }
  }

  // AbilityEffect merge (mult × mult, add + add)
  target.abilityEffect = mergeEffect(target.abilityEffect, source.abilityEffect);
  target.globalEffect = mergeEffect(target.globalEffect, source.globalEffect);
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

// ============================================================
// Idle Exile — Talent Tree Engine (Skill Tree Overhaul v3.2)
// Pure functions for talent tree allocation & resolution.
// Follows same pattern as skillGraph.ts.
// ============================================================

import type {
  TalentTree, TalentNode, SkillModifier, AbilityEffect,
} from '../types';
import type { ResolvedSkillModifier } from './skillGraph';
import { EMPTY_GRAPH_MOD } from './skillGraph';
import { TALENT_TIER_GATES } from '../data/balance';

// ─── Helpers ───

/** Find a node in the tree by ID. */
function findNode(tree: TalentTree, nodeId: string): TalentNode | undefined {
  for (const branch of tree.branches) {
    const node = branch.nodes.find(n => n.id === nodeId);
    if (node) return node;
  }
  return undefined;
}

/** Total points allocated in a specific branch. */
export function getBranchPoints(
  tree: TalentTree,
  branchIndex: number,
  ranks: Record<string, number>,
): number {
  let total = 0;
  const branch = tree.branches[branchIndex];
  if (!branch) return 0;
  for (const node of branch.nodes) {
    total += ranks[node.id] ?? 0;
  }
  return total;
}

/** Total points allocated across all branches. */
export function getTotalAllocatedPoints(ranks: Record<string, number>): number {
  let total = 0;
  for (const r of Object.values(ranks)) {
    total += r;
  }
  return total;
}

// ─── Allocation ───

/**
 * Check if a talent node rank can be allocated.
 * 6 validation checks:
 * 1. Node exists in tree
 * 2. Current rank < maxRank
 * 3. Total allocated + 1 <= skillLevel (available points)
 * 4. Branch points >= tier gate
 * 5. If requiresNodeId: that node is at maxRank
 * 6. If exclusiveWith: no exclusive node has rank > 0
 */
export function canAllocateTalentRank(
  tree: TalentTree,
  ranks: Record<string, number>,
  nodeId: string,
  skillLevel: number,
): boolean {
  // 1. Node exists
  const node = findNode(tree, nodeId);
  if (!node) return false;

  // 2. Not at max rank
  const currentRank = ranks[nodeId] ?? 0;
  if (currentRank >= node.maxRank) return false;

  // 3. Available points
  const totalAllocated = getTotalAllocatedPoints(ranks);
  if (totalAllocated + 1 > skillLevel) return false;

  // 4. Tier gate (branch points must meet threshold)
  const branchPts = getBranchPoints(tree, node.branchIndex, ranks);
  const gateIndex = node.tier - 1;
  if (gateIndex >= 0 && gateIndex < TALENT_TIER_GATES.length) {
    if (branchPts < TALENT_TIER_GATES[gateIndex]) return false;
  }

  // 5. Prerequisite node
  if (node.requiresNodeId) {
    const reqNode = findNode(tree, node.requiresNodeId);
    if (!reqNode) return false;
    const reqRank = ranks[node.requiresNodeId] ?? 0;
    if (reqRank < reqNode.maxRank) return false;
  }

  // 6. Mutual exclusion (T5 keystone choices)
  if (node.exclusiveWith) {
    for (const exId of node.exclusiveWith) {
      if ((ranks[exId] ?? 0) > 0) return false;
    }
  }

  return true;
}

/** Allocate a rank to a talent node. Returns new ranks record. */
export function allocateTalentRank(
  ranks: Record<string, number>,
  nodeId: string,
): Record<string, number> {
  const newRanks = { ...ranks };
  newRanks[nodeId] = (newRanks[nodeId] ?? 0) + 1;
  return newRanks;
}

/** Respec all talent ranks. Returns empty record. */
export function respecTalentRanks(): Record<string, number> {
  return {};
}

/** Talent respec cost in gold: same formula as graph respec. */
export function getTalentRespecCost(skillLevel: number): number {
  return 50 * skillLevel * skillLevel;
}

// ─── Modifier Resolution ───

/**
 * Resolve all allocated talent node modifiers into a single ResolvedSkillModifier.
 *
 * Key rules:
 * - Behavior nodes (maxRank:2) with perRankModifiers: use perRankModifiers[currentRank]
 *   which REPLACES rank 1 (does NOT stack). This enables qualitative rank 2 changes.
 * - Fallback (no perRankModifiers): modifier fields * rank (additive scaling).
 * - Notables/keystones (maxRank:1): apply modifier directly.
 *
 * Merge logic cloned from resolveSkillGraphModifiers in skillGraph.ts.
 */
export function resolveTalentModifiers(
  tree: TalentTree,
  ranks: Record<string, number>,
): ResolvedSkillModifier {
  const result: ResolvedSkillModifier = {
    ...EMPTY_GRAPH_MOD,
    debuffs: [], procs: [], flags: [],
    conditionalMods: [], skillProcs: [], splitDamage: [], addTags: [], removeTags: [],
  };
  let abilEffect: AbilityEffect = {};
  let globalEff: AbilityEffect = {};

  for (const branch of tree.branches) {
    for (const node of branch.nodes) {
      const rank = ranks[node.id] ?? 0;
      if (rank === 0) continue;

      // Determine effective modifier for this node
      const m = getEffectiveModifier(node, rank);
      if (!m) continue;

      // --- Merge logic (mirrors resolveSkillGraphModifiers) ---

      // Additive stat sums
      if (m.incDamage) result.incDamage += m.incDamage;
      if (m.flatDamage) result.flatDamage += m.flatDamage;
      if (m.incCritChance) result.incCritChance += m.incCritChance;
      if (m.incCritMultiplier) result.incCritMultiplier += m.incCritMultiplier;
      if (m.incCastSpeed) result.incCastSpeed += m.incCastSpeed;
      if (m.extraHits) result.extraHits += m.extraHits;
      if (m.durationBonus) result.durationBonus += m.durationBonus;
      if (m.cooldownReduction) result.cooldownReduction += m.cooldownReduction;

      // AbilityEffect: mult*mult, add+add
      if (m.abilityEffect) {
        const ae = m.abilityEffect;
        abilEffect = {
          damageMult: (abilEffect.damageMult ?? 1) * (ae.damageMult ?? 1),
          attackSpeedMult: (abilEffect.attackSpeedMult ?? 1) * (ae.attackSpeedMult ?? 1),
          defenseMult: (abilEffect.defenseMult ?? 1) * (ae.defenseMult ?? 1),
          clearSpeedMult: (abilEffect.clearSpeedMult ?? 1) * (ae.clearSpeedMult ?? 1),
          xpMult: (abilEffect.xpMult ?? 1) * (ae.xpMult ?? 1),
          itemDropMult: (abilEffect.itemDropMult ?? 1) * (ae.itemDropMult ?? 1),
          materialDropMult: (abilEffect.materialDropMult ?? 1) * (ae.materialDropMult ?? 1),
          critChanceBonus: (abilEffect.critChanceBonus ?? 0) + (ae.critChanceBonus ?? 0),
          critMultiplierBonus: (abilEffect.critMultiplierBonus ?? 0) + (ae.critMultiplierBonus ?? 0),
          resistBonus: (abilEffect.resistBonus ?? 0) + (ae.resistBonus ?? 0),
          ignoreHazards: (abilEffect.ignoreHazards ?? false) || (ae.ignoreHazards ?? false),
          doubleClears: (abilEffect.doubleClears ?? false) || (ae.doubleClears ?? false),
        };
      }

      // GlobalEffect: same merge
      if (m.globalEffect) {
        const ge = m.globalEffect;
        globalEff = {
          damageMult: (globalEff.damageMult ?? 1) * (ge.damageMult ?? 1),
          attackSpeedMult: (globalEff.attackSpeedMult ?? 1) * (ge.attackSpeedMult ?? 1),
          defenseMult: (globalEff.defenseMult ?? 1) * (ge.defenseMult ?? 1),
          clearSpeedMult: (globalEff.clearSpeedMult ?? 1) * (ge.clearSpeedMult ?? 1),
          xpMult: (globalEff.xpMult ?? 1) * (ge.xpMult ?? 1),
          itemDropMult: (globalEff.itemDropMult ?? 1) * (ge.itemDropMult ?? 1),
          materialDropMult: (globalEff.materialDropMult ?? 1) * (ge.materialDropMult ?? 1),
          critChanceBonus: (globalEff.critChanceBonus ?? 0) + (ge.critChanceBonus ?? 0),
          critMultiplierBonus: (globalEff.critMultiplierBonus ?? 0) + (ge.critMultiplierBonus ?? 0),
          resistBonus: (globalEff.resistBonus ?? 0) + (ge.resistBonus ?? 0),
          ignoreHazards: (globalEff.ignoreHazards ?? false) || (ge.ignoreHazards ?? false),
          doubleClears: (globalEff.doubleClears ?? false) || (ge.doubleClears ?? false),
        };
      }

      // Conversion: same-target additive (cap 100%), different-target overrides
      if (m.convertElement) {
        if (result.convertElement && result.convertElement.to === m.convertElement.to) {
          result.convertElement = {
            ...result.convertElement,
            percent: Math.min(result.convertElement.percent + m.convertElement.percent, 100),
          };
        } else {
          result.convertElement = m.convertElement;
        }
      }
      if (m.convertToAoE) result.convertToAoE = true;

      // Collect debuffs and procs
      if (m.applyDebuff) result.debuffs.push(m.applyDebuff);
      if (m.procOnHit) result.procs.push(m.procOnHit);
      if (m.flags) result.flags.push(...m.flags);

      // Array collectors
      if (m.conditionalMods) result.conditionalMods.push(...m.conditionalMods);
      if (m.procs) result.skillProcs.push(...m.procs);
      if (m.splitDamage) result.splitDamage.push(...m.splitDamage);
      if (m.addTag) result.addTags.push(m.addTag);
      if (m.removeTag) result.removeTags.push(m.removeTag);

      // Additive scalars
      if (m.damageFromArmor) result.damageFromArmor += m.damageFromArmor;
      if (m.damageFromEvasion) result.damageFromEvasion += m.damageFromEvasion;
      if (m.damageFromMaxLife) result.damageFromMaxLife += m.damageFromMaxLife;
      if (m.leechPercent) result.leechPercent += m.leechPercent;
      if (m.lifeOnHit) result.lifeOnHit += m.lifeOnHit;
      if (m.lifeOnKill) result.lifeOnKill += m.lifeOnKill;
      if (m.chainCount) result.chainCount += m.chainCount;
      if (m.forkCount) result.forkCount += m.forkCount;
      if (m.pierceCount) result.pierceCount += m.pierceCount;
      if (m.overkillDamage) result.overkillDamage += m.overkillDamage;
      if (m.selfDamagePercent) result.selfDamagePercent += m.selfDamagePercent;
      if (m.reducedMaxLife) result.reducedMaxLife += m.reducedMaxLife;
      if (m.increasedDamageTaken) result.increasedDamageTaken += m.increasedDamageTaken;

      // Max-wins
      if (m.executeThreshold) result.executeThreshold = Math.max(result.executeThreshold, m.executeThreshold);

      // Boolean OR
      if (m.cannotLeech) result.cannotLeech = true;
      if (m.critsDoNoBonusDamage) result.critsDoNoBonusDamage = true;

      // Max-wins (numeric)
      if (m.critChanceCap) result.critChanceCap = Math.max(result.critChanceCap, m.critChanceCap);

      // Last-wins (complex objects)
      if (m.debuffInteraction) result.debuffInteraction = m.debuffInteraction;
      if (m.chargeConfig) result.chargeConfig = m.chargeConfig;
      if (m.fortifyOnHit) result.fortifyOnHit = m.fortifyOnHit;
      if (m.rampingDamage) result.rampingDamage = m.rampingDamage;
      if (m.berserk) result.berserk = m.berserk;
      if (m.executeOnly) result.executeOnly = m.executeOnly;
      if (m.castPriority) result.castPriority = m.castPriority;
    }
  }

  result.abilityEffect = abilEffect;
  result.globalEffect = globalEff;
  return result;
}

/**
 * Get the effective modifier for a talent node at a given rank.
 *
 * Behavior nodes (maxRank:2) with perRankModifiers:
 *   Use perRankModifiers[rank] directly — rank 2 REPLACES rank 1.
 *
 * Behavior nodes (maxRank:2) WITHOUT perRankModifiers:
 *   Scale modifier additively: field * rank.
 *
 * Notables/keystones (maxRank:1):
 *   Apply modifier directly.
 */
function getEffectiveModifier(node: TalentNode, rank: number): SkillModifier | null {
  if (rank === 0) return null;

  // If perRankModifiers exist and have a non-empty entry for this rank, use it directly
  if (node.perRankModifiers && node.perRankModifiers[rank]
      && Object.keys(node.perRankModifiers[rank]).length > 0) {
    return node.perRankModifiers[rank];
  }

  // For maxRank:1 nodes (notables, keystones) or rank 1 of any node
  if (node.maxRank === 1 || rank === 1) {
    return node.modifier;
  }

  // Fallback for maxRank:2 without perRankModifiers: scale numeric fields by rank
  return scaleModifier(node.modifier, rank);
}

/** Scale numeric fields in a modifier by a multiplier. Used for rank scaling. */
function scaleModifier(m: SkillModifier, multiplier: number): SkillModifier {
  const scaled: SkillModifier = { ...m };
  if (scaled.incDamage) scaled.incDamage *= multiplier;
  if (scaled.flatDamage) scaled.flatDamage *= multiplier;
  if (scaled.incCritChance) scaled.incCritChance *= multiplier;
  if (scaled.incCritMultiplier) scaled.incCritMultiplier *= multiplier;
  if (scaled.incCastSpeed) scaled.incCastSpeed *= multiplier;
  if (scaled.extraHits) scaled.extraHits *= multiplier;
  if (scaled.durationBonus) scaled.durationBonus *= multiplier;
  if (scaled.cooldownReduction) scaled.cooldownReduction *= multiplier;
  if (scaled.damageFromArmor) scaled.damageFromArmor *= multiplier;
  if (scaled.damageFromEvasion) scaled.damageFromEvasion *= multiplier;
  if (scaled.damageFromMaxLife) scaled.damageFromMaxLife *= multiplier;
  if (scaled.leechPercent) scaled.leechPercent *= multiplier;
  if (scaled.lifeOnHit) scaled.lifeOnHit *= multiplier;
  if (scaled.lifeOnKill) scaled.lifeOnKill *= multiplier;
  if (scaled.overkillDamage) scaled.overkillDamage *= multiplier;
  if (scaled.selfDamagePercent) scaled.selfDamagePercent *= multiplier;
  if (scaled.increasedDamageTaken) scaled.increasedDamageTaken *= multiplier;
  return scaled;
}

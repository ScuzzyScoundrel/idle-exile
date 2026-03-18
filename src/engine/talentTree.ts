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

// ─── Generic Modifier Merger ─────────────────────────────
// Reflection-based: discovers target fields from EMPTY_GRAPH_MOD and determines
// merge semantics from the empty value's type. New fields added to
// ResolvedSkillModifier auto-merge with ZERO hand-coding.

/** Non-zero source REPLACES target (last-wins override, where 0 = "not set"). */
const OVERRIDE_NUMERIC = new Set([
  'cooldownMultiplier', 'ailmentPotencyMult', 'ailmentEffectMult',
  'ailmentPotencyOverride', 'weaponDamageOverride', 'directDamageOverride',
  'executeScaling', 'secondCastDamageMult',
]);

/** Source takes the MAX of source and target. */
const MAX_WINS_NUMERIC = new Set([
  'executeThreshold', 'critChanceCap',
]);

/** Single-value source fields that push into differently-named target arrays. */
const SINGLE_TO_ARRAY: Record<string, string> = {
  applyDebuff: 'debuffs',
  procOnHit: 'procs',
  addTag: 'addTags',
  removeTag: 'removeTags',
};

/** Array source fields that spread into differently-named target arrays. */
const ARRAY_REMAP: Record<string, string> = {
  procs: 'skillProcs',
};

/** Fields handled with special logic outside the generic merge. */
const SPECIAL_FIELDS = new Set([
  'abilityEffect', 'globalEffect', 'convertElement', 'convertToAoE',
]);

/**
 * Auto-merge a SkillModifier into a ResolvedSkillModifier.
 * Semantics derived from EMPTY_GRAPH_MOD field types:
 *   number  → additive (unless OVERRIDE_NUMERIC or MAX_WINS_NUMERIC)
 *   boolean → OR
 *   array   → push/spread
 *   null    → last-wins (complex objects)
 *   object  → deep merge (Record fields like comboStateEnhance)
 */
function autoMergeModifier(result: ResolvedSkillModifier, m: SkillModifier): void {
  for (const [key, val] of Object.entries(m)) {
    if (val === undefined) continue;

    // Skip fields with special merge logic
    if (SPECIAL_FIELDS.has(key)) continue;

    // Single-to-array remappings (addTag→addTags, applyDebuff→debuffs, etc.)
    if (key in SINGLE_TO_ARRAY) {
      if (val != null) (result as any)[SINGLE_TO_ARRAY[key]].push(val);
      continue;
    }

    // Array remappings (procs→skillProcs)
    if (key in ARRAY_REMAP) {
      if (Array.isArray(val) && val.length > 0) (result as any)[ARRAY_REMAP[key]].push(...val);
      continue;
    }

    // Only merge fields that exist on the target type
    if (!(key in EMPTY_GRAPH_MOD)) continue;
    const emptyVal = (EMPTY_GRAPH_MOD as any)[key];

    // Number fields
    if (typeof emptyVal === 'number') {
      if (typeof val !== 'number' || val === 0) continue;
      if (OVERRIDE_NUMERIC.has(key)) (result as any)[key] = val;
      else if (MAX_WINS_NUMERIC.has(key)) (result as any)[key] = Math.max((result as any)[key], val);
      else (result as any)[key] += val;
      continue;
    }

    // Boolean fields → OR
    if (typeof emptyVal === 'boolean') {
      if (val) (result as any)[key] = true;
      continue;
    }

    // Array fields → spread
    if (Array.isArray(emptyVal)) {
      if (Array.isArray(val) && val.length > 0) (result as any)[key].push(...val);
      continue;
    }

    // Null fields → last-wins (complex objects)
    if (emptyVal === null) {
      if (val != null) (result as any)[key] = val;
      continue;
    }

    // Non-null object fields → deep merge (Record<string, ...>)
    if (typeof emptyVal === 'object' && typeof val === 'object' && val !== null) {
      for (const [subKey, subVal] of Object.entries(val)) {
        (result as any)[key][subKey] = { ...(result as any)[key]?.[subKey], ...(subVal as any) };
      }
      continue;
    }
  }
}

/** Merge two AbilityEffects: mult fields multiply, additive fields sum, boolean OR. */
function mergeAbilityEffect(base: AbilityEffect, src: Partial<AbilityEffect>): AbilityEffect {
  return {
    damageMult: (base.damageMult ?? 1) * (src.damageMult ?? 1),
    attackSpeedMult: (base.attackSpeedMult ?? 1) * (src.attackSpeedMult ?? 1),
    defenseMult: (base.defenseMult ?? 1) * (src.defenseMult ?? 1),
    clearSpeedMult: (base.clearSpeedMult ?? 1) * (src.clearSpeedMult ?? 1),
    xpMult: (base.xpMult ?? 1) * (src.xpMult ?? 1),
    itemDropMult: (base.itemDropMult ?? 1) * (src.itemDropMult ?? 1),
    materialDropMult: (base.materialDropMult ?? 1) * (src.materialDropMult ?? 1),
    critChanceBonus: (base.critChanceBonus ?? 0) + (src.critChanceBonus ?? 0),
    critMultiplierBonus: (base.critMultiplierBonus ?? 0) + (src.critMultiplierBonus ?? 0),
    resistBonus: (base.resistBonus ?? 0) + (src.resistBonus ?? 0),
    ignoreHazards: (base.ignoreHazards ?? false) || (src.ignoreHazards ?? false),
    doubleClears: (base.doubleClears ?? false) || (src.doubleClears ?? false),
  };
}

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
export function getTalentRespecCost(_skillLevel: number): number {
  return 0; // TODO: restore to 50 * _skillLevel * _skillLevel after testing
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

      // --- Generic merge: auto-discovers fields from EMPTY_GRAPH_MOD ---
      autoMergeModifier(result, m);

      // --- Special merges (can't be auto-detected) ---

      // AbilityEffect: mult*mult, add+add
      if (m.abilityEffect) {
        const ae = m.abilityEffect;
        abilEffect = mergeAbilityEffect(abilEffect, ae);
      }
      if (m.globalEffect) {
        globalEff = mergeAbilityEffect(globalEff, m.globalEffect);
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
 *   Inherit base modifier qualitative fields (conditionalMods, procs, etc.),
 *   then overlay perRankModifiers[rank] on top. Rank-specific numeric fields
 *   OVERRIDE the base, but qualitative fields from the base are preserved
 *   unless the rank override explicitly sets them.
 *
 * Behavior nodes (maxRank:2) WITHOUT perRankModifiers:
 *   Scale modifier additively: field * rank.
 *
 * Notables/keystones (maxRank:1):
 *   Apply modifier directly.
 */
function getEffectiveModifier(node: TalentNode, rank: number): SkillModifier | null {
  if (rank === 0) return null;

  // If perRankModifiers exist, overlay them on the base modifier so qualitative
  // fields (conditionalMods, procs, comboStateReplace, etc.) are inherited.
  if (node.perRankModifiers && node.perRankModifiers[rank]
      && Object.keys(node.perRankModifiers[rank]).length > 0) {
    return { ...node.modifier, ...node.perRankModifiers[rank] };
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
  if (scaled.firePenetration) scaled.firePenetration *= multiplier;
  if (scaled.coldPenetration) scaled.coldPenetration *= multiplier;
  if (scaled.lightningPenetration) scaled.lightningPenetration *= multiplier;
  if (scaled.chaosPenetration) scaled.chaosPenetration *= multiplier;
  if (scaled.dotMultiplier) scaled.dotMultiplier *= multiplier;
  if (scaled.weaponMastery) scaled.weaponMastery *= multiplier;
  if (scaled.ailmentDuration) scaled.ailmentDuration *= multiplier;
  // Dagger v2 fields
  if (scaled.cooldownIncrease) scaled.cooldownIncrease *= multiplier;
  if (scaled.ailmentPotency) scaled.ailmentPotency *= multiplier;
  return scaled;
}

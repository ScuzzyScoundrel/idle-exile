// ============================================================
// Class Talents — engine API (Phase D: multi-rank, 2026-05-05)
// ============================================================
//
// Save shape: `talentRanks: Record<string, number>` — node id → current
// rank. Each rank up to `node.ranks` (per JSON tree) costs 1 talent point.
//
// Phase C step 2 (2026-05-04): cutover to JSON class-tree registry. Engine
// reads from `src/data/classTrees/*.json` via the registry.
//
// Phase D (2026-05-05): multi-rank support — `talentAllocations: string[]`
// flat list replaced with `talentRanks: Record<string, number>`. Save
// migration v69 converts existing single-rank arrays to rank=1 records.
// Effect scaling lives in `engine/classTalentDispatcher.ts`
// (`scaleTalentEffectByRank`); this file only handles allocation rules.

import { CharacterClass, AbilityEffect, SkillTreeNode } from '../types';
import { findClassTreeNode, getClassTreeAllNodes, getClassTreePathNodes } from '../data/classTrees';

/** Sum of all rank values — total talent points spent. */
export function getTotalAllocatedRanks(ranks: Record<string, number>): number {
  let total = 0;
  for (const r of Object.values(ranks)) total += r;
  return total;
}

/**
 * Get all talent nodes for a class as a flat array — JSON-tree registry.
 * Returns the legacy SkillTreeNode shape for compatibility with existing
 * consumers; JSON ClassTreeNodeData fields are mapped to the legacy shape.
 */
export function getAllTalentNodes(charClass: CharacterClass): SkillTreeNode[] {
  const jsonNodes = getClassTreeAllNodes(charClass);
  return jsonNodes.map(n => ({
    id: n.id,
    name: n.name,
    description: n.description,
    tier: n.tier,
    effect: {} as AbilityEffect,           // legacy field — engine effects flow via getNodeEffects()
    effects: n.effects,                     // forward-compatible inline effects
    requiresNodeId: n.requiresNodeId,
    isPathPayoff: n.kind === 'capstone' || n.kind === 'capstone_supporting',
  }));
}

/**
 * Check if a talent node can have another rank allocated.
 *
 * Multi-rank rules (Phase D):
 *   1. Node must exist in the class tree.
 *   2. Current rank < node.ranks (max).
 *   3. At least 1 talent point available.
 *   4. If `requiresNodeId`: prerequisite must be at MAX rank (full investment
 *      gates the next node — encourages path commitment).
 */
export function canAllocateTalentNode(
  charClass: CharacterClass,
  ranks: Record<string, number>,
  nodeId: string,
  characterLevel: number,
): boolean {
  const node = findClassTreeNode(charClass, nodeId);
  if (!node) return false;

  // Rank cap
  const currentRank = ranks[nodeId] ?? 0;
  if (currentRank >= node.ranks) return false;

  // Points available
  if (getAvailableTalentPoints(characterLevel, getTotalAllocatedRanks(ranks)) <= 0) return false;

  // Tier gate (2026-07-12, owner report: any node was allocatable with
  // zero pathing — the trees have tier structure but NO authored
  // requiresNodeId edges). Until the talent-tree design pass authors
  // real edges, a tier-N node requires (N-1) x 2 points already spent
  // in the SAME path. Sims are unaffected (they set ranks directly).
  if ((node.tier ?? 1) > 1) {
    const pathNodes = getClassTreePathNodes(charClass, nodeId);
    if (pathNodes) {
      const spentInPath = pathNodes.reduce((a, pn) => a + (ranks[pn.id] ?? 0), 0);
      if (spentInPath < (node.tier - 1) * 2) return false;
    }
  }

  // Prerequisite at max rank
  if (node.requiresNodeId) {
    const prereqNode = findClassTreeNode(charClass, node.requiresNodeId);
    if (!prereqNode) return false;
    const prereqRank = ranks[node.requiresNodeId] ?? 0;
    if (prereqRank < prereqNode.ranks) return false;
  }

  return true;
}

/** Allocate one rank to a node — returns new ranks record (immutable). */
export function allocateTalentNode(
  ranks: Record<string, number>,
  nodeId: string,
): Record<string, number> {
  return { ...ranks, [nodeId]: (ranks[nodeId] ?? 0) + 1 };
}

/** Respec all talents — returns empty record. */
export function respecTalents(): Record<string, number> {
  return {};
}

/** Gold cost to respec talents. */
export function getTalentRespecCost(characterLevel: number): number {
  return 25 * characterLevel;
}

/** Available talent points = level - total ranks spent. */
export function getAvailableTalentPoints(characterLevel: number, totalRanks: number): number {
  return Math.max(0, characterLevel - totalRanks);
}

// ============================================================
// Ascendancy — engine API (Phase E, 2026-05-05)
// ============================================================
//
// Save shape:
//   • `ascendancyId: string | null` — chosen ascendancy id, or null
//     until the player picks at level 25.
//   • `ascendancyRanks: Record<string, number>` — node id → current
//     rank. Same shape pattern as `talentRanks` (Phase D).
//
// Per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §10:
//   • Unlock at level 25 (per §13 recommendation).
//   • Separate point pool from class talents — does NOT compete.
//   • Point earning: 1 ascendancy point per level past 24
//     (level 25 → 1pt, level 26 → 2pt, ..., level 60 → 36pt).
//     Cap doesn't matter past full investment.

import { findAscendancyNode } from '../data/ascendancies';

/** Sum of all rank values — total ascendancy points spent. */
export function getTotalAllocatedAscendancyRanks(ranks: Record<string, number>): number {
  let total = 0;
  for (const r of Object.values(ranks)) total += r;
  return total;
}

/** Available ascendancy points = max(0, level - 24) - total ranks spent.
 *  Returns 0 below level 25 (ascendancy locked). */
export function getAvailableAscendancyPoints(characterLevel: number, totalRanks: number): number {
  if (characterLevel < ASCENDANCY_UNLOCK_LEVEL) return 0;
  const earned = characterLevel - (ASCENDANCY_UNLOCK_LEVEL - 1);
  return Math.max(0, earned - totalRanks);
}

/** Level at which ascendancy choice unlocks (per §13 lock). */
export const ASCENDANCY_UNLOCK_LEVEL = 25;

/**
 * Check if an ascendancy node can have another rank allocated.
 *
 * Rules (parallel to canAllocateTalentNode):
 *   1. `ascendancyId` must be set (player has picked).
 *   2. Node must exist within the chosen tree.
 *   3. Current rank < node.ranks (max).
 *   4. At least 1 ascendancy point available.
 *   5. Character level >= ASCENDANCY_UNLOCK_LEVEL (gate).
 *   6. If `requiresNodeId`: prerequisite must be at MAX rank.
 */
export function canAllocateAscendancyNode(
  ascendancyId: string | null,
  ranks: Record<string, number>,
  nodeId: string,
  characterLevel: number,
): boolean {
  if (!ascendancyId) return false;
  if (characterLevel < ASCENDANCY_UNLOCK_LEVEL) return false;

  const node = findAscendancyNode(ascendancyId, nodeId);
  if (!node) return false;

  const currentRank = ranks[nodeId] ?? 0;
  if (currentRank >= node.ranks) return false;

  if (getAvailableAscendancyPoints(characterLevel, getTotalAllocatedAscendancyRanks(ranks)) <= 0) return false;

  if (node.requiresNodeId) {
    const prereqNode = findAscendancyNode(ascendancyId, node.requiresNodeId);
    if (!prereqNode) return false;
    const prereqRank = ranks[node.requiresNodeId] ?? 0;
    if (prereqRank < prereqNode.ranks) return false;
  }

  return true;
}

/** Allocate one rank to an ascendancy node — returns new ranks record (immutable). */
export function allocateAscendancyNode(
  ranks: Record<string, number>,
  nodeId: string,
): Record<string, number> {
  return { ...ranks, [nodeId]: (ranks[nodeId] ?? 0) + 1 };
}

/** Respec ascendancy ranks (does NOT clear ascendancyId — choice stays). */
export function respecAscendancy(): Record<string, number> {
  return {};
}

/** Gold cost to respec ascendancy. Higher than class-talent respec — earned commitment. */
export function getAscendancyRespecCost(characterLevel: number): number {
  return 100 * characterLevel;
}

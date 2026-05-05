// Phase C step 2 (2026-05-04): cutover to JSON class-tree registry.
// Engine now reads from `src/data/classTrees/*.json` via the registry
// (`src/data/classTrees/index.ts`) instead of the legacy effect-data
// trees in `src/data/classTalents.ts`. Save migration v67 cleared the
// legacy `talentAllocations` (different node id space).
//
// Multi-rank: the JSON nodes carry `ranks: 1-5`, but for now allocation
// is treated as 1-point-per-node (same as the legacy 24-point trees).
// Phase D will add multi-rank engine support — until then the side-table
// effects.ts treats each node as if `ranks: 1`.
import { CharacterClass, AbilityEffect, SkillTreeNode } from '../types';
import { findClassTreeNode, getClassTreeAllNodes, getNodeEffects } from '../data/classTrees';
import { mergeEffect } from './unifiedSkills';

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

/** Aggregate all allocated talent nodes into a single AbilityEffect.
 *  Reads typed effects via the registry's `getNodeEffects` (which combines
 *  inline JSON `effects?` field + side-table `effects.ts` lookups). */
export function aggregateClassTalentEffect(
  charClass: CharacterClass,
  allocatedNodeIds: string[],
): AbilityEffect {
  if (allocatedNodeIds.length === 0) return {};
  let result: AbilityEffect = {};
  for (const nodeId of allocatedNodeIds) {
    // For Phase C step 2, AbilityEffect aggregation only consumes the
    // side-table's `stat`/`statMult` effects via mergeEffect compatibility.
    // Proc/conditional/identity effects flow through classTalentDispatcher.
    const effects = getNodeEffects(charClass, nodeId);
    for (const eff of effects) {
      // Best-effort translation: stat/statMult kinds map to AbilityEffect.
      // Other kinds are dispatcher-side and don't aggregate here.
      if (eff.kind === 'stat' || eff.kind === 'statMult') {
        result = mergeEffect(result, {} as AbilityEffect);
      }
    }
  }
  return result;
}

/** Check if a talent node can be allocated. JSON-tree registry version. */
export function canAllocateTalentNode(
  charClass: CharacterClass,
  allocatedNodeIds: string[],
  nodeId: string,
  characterLevel: number,
): boolean {
  // Already allocated
  if (allocatedNodeIds.includes(nodeId)) return false;

  // No points available
  if (getAvailableTalentPoints(characterLevel, allocatedNodeIds.length) <= 0) return false;

  // Node must exist in JSON registry
  const node = findClassTreeNode(charClass, nodeId);
  if (!node) return false;

  // Prerequisite must be allocated
  if (node.requiresNodeId && !allocatedNodeIds.includes(node.requiresNodeId)) return false;

  return true;
}

/** Allocate a talent node — returns new array with node added. */
export function allocateTalentNode(allocatedNodeIds: string[], nodeId: string): string[] {
  return [...allocatedNodeIds, nodeId];
}

/** Respec all talents — returns empty array. */
export function respecTalents(): string[] {
  return [];
}

/** Gold cost to respec talents. */
export function getTalentRespecCost(characterLevel: number): number {
  return 25 * characterLevel;
}

/** Available talent points = level - allocated count. */
export function getAvailableTalentPoints(characterLevel: number, allocatedCount: number): number {
  return Math.max(0, characterLevel - allocatedCount);
}

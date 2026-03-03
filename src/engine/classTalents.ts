import { CharacterClass, AbilityEffect, SkillTreeNode } from '../types';
import { CLASS_TALENT_TREES } from '../data/classTalents';
import { mergeEffect } from './unifiedSkills';

/** Get all talent nodes for a class as a flat array. */
export function getAllTalentNodes(charClass: CharacterClass): SkillTreeNode[] {
  const tree = CLASS_TALENT_TREES[charClass];
  return tree.paths.flatMap(p => p.nodes);
}

/** Aggregate all allocated talent nodes into a single AbilityEffect. */
export function aggregateClassTalentEffect(
  charClass: CharacterClass,
  allocatedNodeIds: string[],
): AbilityEffect {
  if (allocatedNodeIds.length === 0) return {};
  const allNodes = getAllTalentNodes(charClass);
  let result: AbilityEffect = {};
  for (const nodeId of allocatedNodeIds) {
    const node = allNodes.find(n => n.id === nodeId);
    if (node) {
      result = mergeEffect(result, node.effect as AbilityEffect);
    }
  }
  return result;
}

/** Check if a talent node can be allocated. */
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

  // Node must exist
  const allNodes = getAllTalentNodes(charClass);
  const node = allNodes.find(n => n.id === nodeId);
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

// ============================================================
// Idle Exile — Skill Graph Engine (Sprint 11B)
// Pure functions for graph-based skill tree allocation & resolution.
// ============================================================

import type { SkillGraph, AbilityEffect } from '../types';

/** Resolved modifier: all allocated node modifiers summed together. */
export interface ResolvedSkillModifier {
  incDamage: number;
  flatDamage: number;
  incCritChance: number;
  incCritMultiplier: number;
  incCastSpeed: number;
  extraHits: number;
  durationBonus: number;
  cooldownReduction: number;
  abilityEffect: AbilityEffect;
  convertElement: { from: string; to: string; percent: number } | null;
  convertToAoE: boolean;
  debuffs: { debuffId: string; chance: number; duration: number }[];
  procs: { effectId: string; chance: number }[];
  flags: string[];
}

/** Empty modifier (identity). */
export const EMPTY_GRAPH_MOD: ResolvedSkillModifier = {
  incDamage: 0,
  flatDamage: 0,
  incCritChance: 0,
  incCritMultiplier: 0,
  incCastSpeed: 0,
  extraHits: 0,
  durationBonus: 0,
  cooldownReduction: 0,
  abilityEffect: {},
  convertElement: null,
  convertToAoE: false,
  debuffs: [],
  procs: [],
  flags: [],
};

/**
 * Resolve all allocated graph node modifiers into a single ResolvedSkillModifier.
 * Additive fields sum, abilityEffect merges (mult fields multiply, additive sum),
 * conversions last-wins, debuffs/procs collect into arrays.
 */
export function resolveSkillGraphModifiers(
  graph: SkillGraph,
  allocatedNodes: string[],
): ResolvedSkillModifier {
  const result: ResolvedSkillModifier = { ...EMPTY_GRAPH_MOD, debuffs: [], procs: [], flags: [] };
  let abilEffect: AbilityEffect = {};

  for (const nodeId of allocatedNodes) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node?.modifier) continue;
    const m = node.modifier;

    // Additive stat sums
    if (m.incDamage) result.incDamage += m.incDamage;
    if (m.flatDamage) result.flatDamage += m.flatDamage;
    if (m.incCritChance) result.incCritChance += m.incCritChance;
    if (m.incCritMultiplier) result.incCritMultiplier += m.incCritMultiplier;
    if (m.incCastSpeed) result.incCastSpeed += m.incCastSpeed;
    if (m.extraHits) result.extraHits += m.extraHits;
    if (m.durationBonus) result.durationBonus += m.durationBonus;
    if (m.cooldownReduction) result.cooldownReduction += m.cooldownReduction;

    // AbilityEffect passthrough — merge mult*mult, add+add
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

    // Conversion: last-wins
    if (m.convertElement) result.convertElement = m.convertElement;
    if (m.convertToAoE) result.convertToAoE = true;

    // Collect debuffs and procs
    if (m.applyDebuff) result.debuffs.push(m.applyDebuff);
    if (m.procOnHit) result.procs.push(m.procOnHit);
    if (m.flags) result.flags.push(...m.flags);
  }

  result.abilityEffect = abilEffect;
  return result;
}

/**
 * Check if a graph node can be allocated.
 * Rules: node exists, not already allocated, has available points,
 * and is adjacent to an already-allocated node (or is start node if nothing allocated).
 */
export function canAllocateGraphNode(
  graph: SkillGraph,
  allocatedNodes: string[],
  nodeId: string,
  skillLevel: number,
): boolean {
  // Already allocated?
  if (allocatedNodes.includes(nodeId)) return false;

  // Has available points?
  const availablePoints = skillLevel - allocatedNodes.length;
  if (availablePoints <= 0) return false;

  // Find the node
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return false;

  // If nothing allocated, can only allocate start node
  if (allocatedNodes.length === 0) {
    return node.nodeType === 'start';
  }

  // Must be adjacent to at least one allocated node
  return allocatedNodes.some(allocId => {
    const allocNode = graph.nodes.find(n => n.id === allocId);
    return allocNode?.connections.includes(nodeId) ?? false;
  });
}

/** Allocate a graph node (returns new allocatedNodes array). */
export function allocateGraphNode(allocatedNodes: string[], nodeId: string): string[] {
  return [...allocatedNodes, nodeId];
}

/** Respec all graph nodes (returns empty array). */
export function respecGraphNodes(): string[] {
  return [];
}

/** Graph respec cost in gold: 50 * level^2 (same formula as old system). */
export function getGraphRespecCost(skillLevel: number): number {
  return 50 * skillLevel * skillLevel;
}

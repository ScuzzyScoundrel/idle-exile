// ============================================================
// Idle Exile — Skill Graph Engine (Sprint 11B)
// Pure functions for graph-based skill tree allocation & resolution.
// ============================================================

import type { SkillGraph, AbilityEffect, ConditionalModifier, SkillProcEffect,
  DebuffInteraction, SkillChargeConfig, DamageTag } from '../types';

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
  globalEffect: AbilityEffect;
  convertElement: { from: string; to: string; percent: number } | null;
  convertToAoE: boolean;
  debuffs: { debuffId: string; chance: number; duration: number }[];
  procs: { effectId: string; chance: number }[];
  flags: string[];

  // Phase 1: expanded fields
  conditionalMods: ConditionalModifier[];
  skillProcs: SkillProcEffect[];
  debuffInteraction: DebuffInteraction | null;
  chargeConfig: SkillChargeConfig | null;
  damageFromArmor: number;
  damageFromEvasion: number;
  damageFromMaxLife: number;
  leechPercent: number;
  lifeOnHit: number;
  lifeOnKill: number;
  fortifyOnHit: { stacks: number; duration: number; damageReduction: number } | null;
  chainCount: number;
  forkCount: number;
  pierceCount: number;
  splitDamage: { element: string; percent: number }[];
  addTags: DamageTag[];
  removeTags: DamageTag[];
  rampingDamage: { perHit: number; maxStacks: number; decayAfter: number } | null;
  executeThreshold: number;
  overkillDamage: number;
  selfDamagePercent: number;
  cannotLeech: boolean;
  reducedMaxLife: number;
  increasedDamageTaken: number;
  berserk: { damageBonus: number; damageTakenIncrease: number; lifeThreshold: number } | null;

  // Talent tree: dagger-specific
  critsDoNoBonusDamage: boolean;
  critChanceCap: number;        // 0 = no cap
  executeOnly: { hpThreshold: number; bonusDamage: number } | null;
  castPriority: 'execute' | 'normal' | null;

  // Multiplicative offense stats (mirror gear stats on ResolvedStats)
  firePenetration: number;
  coldPenetration: number;
  lightningPenetration: number;
  chaosPenetration: number;
  dotMultiplier: number;
  weaponMastery: number;
  ailmentDuration: number;
  // Dagger v2: combo & element
  cooldownIncrease: number;
  ailmentPotency: number;
  comboStateCreation: { stateId: string; duration: number; maxStacks?: number } | null;
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
  globalEffect: {},
  convertElement: null,
  convertToAoE: false,
  debuffs: [],
  procs: [],
  flags: [],
  // Phase 1 defaults
  conditionalMods: [],
  skillProcs: [],
  debuffInteraction: null,
  chargeConfig: null,
  damageFromArmor: 0,
  damageFromEvasion: 0,
  damageFromMaxLife: 0,
  leechPercent: 0,
  lifeOnHit: 0,
  lifeOnKill: 0,
  fortifyOnHit: null,
  chainCount: 0,
  forkCount: 0,
  pierceCount: 0,
  splitDamage: [],
  addTags: [],
  removeTags: [],
  rampingDamage: null,
  executeThreshold: 0,
  overkillDamage: 0,
  selfDamagePercent: 0,
  cannotLeech: false,
  reducedMaxLife: 0,
  increasedDamageTaken: 0,
  berserk: null,
  // Talent tree defaults
  critsDoNoBonusDamage: false,
  critChanceCap: 0,
  executeOnly: null,
  castPriority: null,
  // Multiplicative offense stat defaults
  firePenetration: 0,
  coldPenetration: 0,
  lightningPenetration: 0,
  chaosPenetration: 0,
  dotMultiplier: 0,
  weaponMastery: 0,
  ailmentDuration: 0,
  // Dagger v2 defaults
  cooldownIncrease: 0,
  ailmentPotency: 0,
  comboStateCreation: null,
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
  const result: ResolvedSkillModifier = {
    ...EMPTY_GRAPH_MOD,
    debuffs: [], procs: [], flags: [],
    conditionalMods: [], skillProcs: [], splitDamage: [], addTags: [], removeTags: [],
  };
  let abilEffect: AbilityEffect = {};
  let globalEff: AbilityEffect = {};

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

    // GlobalEffect passthrough — same merge pattern as abilityEffect
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

    // Conversion: same-target additive (capped at 100%), different-target overrides
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

    // Phase 1: expanded field resolution
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

    // Multiplicative offense stats (additive sum)
    if (m.firePenetration) result.firePenetration += m.firePenetration;
    if (m.coldPenetration) result.coldPenetration += m.coldPenetration;
    if (m.lightningPenetration) result.lightningPenetration += m.lightningPenetration;
    if (m.chaosPenetration) result.chaosPenetration += m.chaosPenetration;
    if (m.dotMultiplier) result.dotMultiplier += m.dotMultiplier;
    if (m.weaponMastery) result.weaponMastery += m.weaponMastery;
    if (m.ailmentDuration) result.ailmentDuration += m.ailmentDuration;

    // Dagger v2: additive scalars
    if (m.cooldownIncrease) result.cooldownIncrease += m.cooldownIncrease;
    if (m.ailmentPotency) result.ailmentPotency += m.ailmentPotency;

    // Dagger v2: last-wins
    if (m.comboStateCreation) result.comboStateCreation = m.comboStateCreation;

    // Max-wins
    if (m.executeThreshold) result.executeThreshold = Math.max(result.executeThreshold, m.executeThreshold);

    // Boolean OR
    if (m.cannotLeech) result.cannotLeech = true;

    // Last-wins (complex objects)
    if (m.debuffInteraction) result.debuffInteraction = m.debuffInteraction;
    if (m.chargeConfig) result.chargeConfig = m.chargeConfig;
    if (m.fortifyOnHit) result.fortifyOnHit = m.fortifyOnHit;
    if (m.rampingDamage) result.rampingDamage = m.rampingDamage;
    if (m.berserk) result.berserk = m.berserk;

    // Talent tree: dagger-specific
    if (m.critsDoNoBonusDamage) result.critsDoNoBonusDamage = true;  // boolean OR
    if (m.critChanceCap) result.critChanceCap = Math.max(result.critChanceCap, m.critChanceCap);  // max-wins
    if (m.executeOnly) result.executeOnly = m.executeOnly;  // last-wins
    if (m.castPriority) result.castPriority = m.castPriority;  // last-wins
  }

  result.abilityEffect = abilEffect;
  result.globalEffect = globalEff;
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
  return 0; // TODO: restore to 50 * skillLevel * skillLevel after testing
}

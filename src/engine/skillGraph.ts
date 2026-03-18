// ============================================================
// Idle Exile — Skill Graph Engine (Sprint 11B)
// Pure functions for graph-based skill tree allocation & resolution.
// ============================================================

import type { SkillGraph, AbilityEffect, ConditionalModifier, SkillProcEffect,
  DebuffInteraction, SkillChargeConfig, DamageTag, ComboStateEffect } from '../types';

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
  allResist: number;
  // Dagger v2: combo & element
  cooldownIncrease: number;
  ailmentPotency: number;
  comboStateCreation: { stateId: string; duration: number; maxStacks?: number } | null;
  // v2: combo state modifications from talent trees
  comboStateEnhance: Record<string, Partial<ComboStateEffect>>;  // stateId → bonus effect merged on consume
  comboStateReplace: { from: string; to: string; effect: ComboStateEffect; duration: number } | null;
  // v2: counter-attack system (Blade Ward Ghost branch, etc.)
  counterHitDamage: number;     // % weapon damage for counter-hit (0 = no counter)
  counterCanCrit: boolean;
  counterHitHeal: number;       // % max HP healed per counter-hit
  // v2: trap system (Blade Trap)
  armTimeOverride: number;      // seconds (0 = use default 1.5)
  detonationDamageBonus: number; // % bonus detonation damage
  // Sprint 2C: keystone modifier fields
  // Additive
  globalIncDamage: number;                 // % global damage bonus (applies to damageMult)
  counterDamageMult: number;               // multiplier for counter-hit damage
  ailmentPotencyPerStack: number;          // % ailment potency per debuff stack
  deepWoundBurstBonus: number;             // flat % bonus to deep wound burst
  deepWoundBurstMult: number;              // multiplier for deep wound burst
  globalAilmentPenalty: number;            // % global ailment potency penalty
  globalAilmentPotencyPenalty: number;     // % ailment potency penalty
  singleTargetPenalty: number;             // % penalty for single-target skills
  nonAoePenalty: number;                   // % penalty for non-AoE skills
  lifeCostPerTrigger: number;              // flat life cost per proc trigger
  cooldownMultiplier: number;              // multiply effective cooldown (1 = neutral)
  ailmentPotencyMult: number;              // multiplicative ailment potency bonus
  // Boolean
  singleAilmentOnly: boolean;              // restrict to single ailment type
  ailmentsNeverExpire: boolean;            // ailments persist until death
  alwaysFire3Hits: boolean;                // force 3 hits regardless of targets
  targetAllEnemies: boolean;               // hit all pack enemies
  executeLocked: boolean;                  // restrict to execute threshold only
  doubleCast: boolean;                     // fire skill twice per cast
  // Last-wins
  ailmentEffectMult: number;               // override ailment effect multiplier (0 = no override)
  ailmentPotencyOverride: number;          // override base ailment potency (0 = no override)
  weaponDamageOverride: number;            // override weapon damage value (0 = no override)
  directDamageOverride: number;            // override direct hit damage (0 = no override)
  executeScaling: number;                  // % damage per % missing HP (0 = none)
  secondCastDamageMult: number;            // damage mult for double-cast second hit (0 = no override)
  // Sprint 4C: Blade Ward subsystem
  wardDRBonus: number;                       // % extra DR during ward window
  counterHitCritFloor: number;               // minimum crit chance for counter-hits (0 = no floor)
  permanentWard: boolean;                    // ward never expires
  counterAppliesAllAilments: boolean;        // counter-hits apply all ailment types
  counterHitDebuff: { id: string; duration: number; damageReduction: number } | null;
  guardedEnhancement: Record<string, any> | null; // enhanced guarded state bonuses
  // Sprint 4D: Blade Trap subsystem
  detonationGuaranteedCrit: boolean;         // trap detonation auto-crits
  detonationExtraAilments: number;           // extra ailment stacks on detonation
  detonationAilmentPotencyMultiplier: number; // multiply ailment potency on detonation
  trapCharges: number;                       // max concurrent traps (0 = default 1)
  // Sprint 4E: Shadow Dash subsystem
  passThroughAilment: { potencyPercent: number } | null;
  perPassThroughTarget: Record<string, any> | null;
  postCastDodgeWindow: { duration: number; dodgeChance: number } | null;
  shadowPhaseCounterDamage: number;          // % weapon damage on counter during shadow phase

  // Generic passthrough: collects ALL modifier fields not on this type.
  // Engine code reads specific keys (e.g., rawBehaviors.triggerCondition).
  // New weapon types add novel fields here with zero merge code needed.
  rawBehaviors: Record<string, any>;
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
  allResist: 0,
  // Dagger v2 defaults
  cooldownIncrease: 0,
  ailmentPotency: 0,
  comboStateCreation: null,
  comboStateEnhance: {},
  comboStateReplace: null,
  counterHitDamage: 0,
  counterCanCrit: false,
  counterHitHeal: 0,
  armTimeOverride: 0,
  detonationDamageBonus: 0,
  // Sprint 2C: keystone defaults
  globalIncDamage: 0,
  counterDamageMult: 0,
  ailmentPotencyPerStack: 0,
  deepWoundBurstBonus: 0,
  deepWoundBurstMult: 0,
  globalAilmentPenalty: 0,
  globalAilmentPotencyPenalty: 0,
  singleTargetPenalty: 0,
  nonAoePenalty: 0,
  lifeCostPerTrigger: 0,
  cooldownMultiplier: 0,
  ailmentPotencyMult: 0,
  singleAilmentOnly: false,
  ailmentsNeverExpire: false,
  alwaysFire3Hits: false,
  targetAllEnemies: false,
  executeLocked: false,
  doubleCast: false,
  ailmentEffectMult: 0,
  ailmentPotencyOverride: 0,
  weaponDamageOverride: 0,
  directDamageOverride: 0,
  executeScaling: 0,
  secondCastDamageMult: 0,
  // Sprint 4C-4E defaults
  wardDRBonus: 0,
  counterHitCritFloor: 0,
  permanentWard: false,
  counterAppliesAllAilments: false,
  counterHitDebuff: null,
  guardedEnhancement: null,
  detonationGuaranteedCrit: false,
  detonationExtraAilments: 0,
  detonationAilmentPotencyMultiplier: 0,
  trapCharges: 0,
  passThroughAilment: null,
  perPassThroughTarget: null,
  postCastDodgeWindow: null,
  shadowPhaseCounterDamage: 0,
  rawBehaviors: {},
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
    if (m.allResist) result.allResist += m.allResist;

    // Dagger v2: additive scalars
    if (m.cooldownIncrease) result.cooldownIncrease += m.cooldownIncrease;
    if (m.ailmentPotency) result.ailmentPotency += m.ailmentPotency;

    // Dagger v2: last-wins
    if (m.comboStateCreation) result.comboStateCreation = m.comboStateCreation;
    if (m.comboStateReplace) result.comboStateReplace = m.comboStateReplace as any;

    // Dagger v2: combo state enhance — deep merge per stateId
    if (m.comboStateEnhance) {
      const enh = m.comboStateEnhance as Record<string, Partial<ComboStateEffect>>;
      for (const [stateId, bonus] of Object.entries(enh)) {
        const existing = result.comboStateEnhance[stateId] ?? {};
        result.comboStateEnhance[stateId] = {
          ...existing,
          ...bonus,
          incDamage: (existing.incDamage ?? 0) + (bonus.incDamage ?? 0) || undefined,
          incCritChance: (existing.incCritChance ?? 0) + (bonus.incCritChance ?? 0) || undefined,
          incCritMultiplier: (existing.incCritMultiplier ?? 0) + (bonus.incCritMultiplier ?? 0) || undefined,
          ailmentPotency: (existing.ailmentPotency ?? 0) + (bonus.ailmentPotency ?? 0) || undefined,
        };
      }
    }

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

    // Trap system: last-wins / additive
    if (m.armTimeOverride) result.armTimeOverride = m.armTimeOverride;
    if (m.detonationDamageBonus) result.detonationDamageBonus += m.detonationDamageBonus;

    // Counter-attack: additive/OR
    if (m.counterHitDamage) result.counterHitDamage += m.counterHitDamage;
    if (m.counterCanCrit) result.counterCanCrit = true;
    if (m.counterHitHeal) result.counterHitHeal += m.counterHitHeal;

    // Talent tree: dagger-specific
    if (m.critsDoNoBonusDamage) result.critsDoNoBonusDamage = true;  // boolean OR
    if (m.critChanceCap) result.critChanceCap = Math.max(result.critChanceCap, m.critChanceCap);  // max-wins
    if (m.executeOnly) result.executeOnly = m.executeOnly;  // last-wins
    if (m.castPriority) result.castPriority = m.castPriority;  // last-wins

    // Sprint 2C: keystone fields
    // Additive
    if (m.globalIncDamage) result.globalIncDamage += m.globalIncDamage;
    if (m.counterDamageMult) result.counterDamageMult += m.counterDamageMult;
    if (m.ailmentPotencyPerStack) result.ailmentPotencyPerStack += m.ailmentPotencyPerStack;
    if (m.deepWoundBurstBonus) result.deepWoundBurstBonus += m.deepWoundBurstBonus;
    if (m.deepWoundBurstMult) result.deepWoundBurstMult += m.deepWoundBurstMult;
    if (m.globalAilmentPenalty) result.globalAilmentPenalty += m.globalAilmentPenalty;
    if (m.globalAilmentPotencyPenalty) result.globalAilmentPotencyPenalty += m.globalAilmentPotencyPenalty;
    if (m.singleTargetPenalty) result.singleTargetPenalty += m.singleTargetPenalty;
    if (m.nonAoePenalty) result.nonAoePenalty += m.nonAoePenalty;
    if (m.lifeCostPerTrigger) result.lifeCostPerTrigger += m.lifeCostPerTrigger;
    if (m.cooldownMultiplier) result.cooldownMultiplier = (result.cooldownMultiplier || 1) * m.cooldownMultiplier;
    if (m.ailmentPotencyMult) result.ailmentPotencyMult += m.ailmentPotencyMult;
    // Boolean OR
    if (m.singleAilmentOnly) result.singleAilmentOnly = true;
    if (m.ailmentsNeverExpire) result.ailmentsNeverExpire = true;
    if (m.alwaysFire3Hits) result.alwaysFire3Hits = true;
    if (m.targetAllEnemies) result.targetAllEnemies = true;
    if (m.executeLocked) result.executeLocked = true;
    if (m.doubleCast) result.doubleCast = true;
    // Last-wins
    if (m.ailmentEffectMult) result.ailmentEffectMult = m.ailmentEffectMult;
    if (m.ailmentPotencyOverride) result.ailmentPotencyOverride = m.ailmentPotencyOverride;
    if (m.weaponDamageOverride) result.weaponDamageOverride = m.weaponDamageOverride;
    if (m.directDamageOverride) result.directDamageOverride = m.directDamageOverride;
    if (m.executeScaling) result.executeScaling = m.executeScaling;
    if (m.secondCastDamageMult) result.secondCastDamageMult = m.secondCastDamageMult;
    // Sprint 4C: Blade Ward
    if (m.wardDRBonus) result.wardDRBonus += m.wardDRBonus;
    if (m.counterHitCritFloor) result.counterHitCritFloor = Math.max(result.counterHitCritFloor, m.counterHitCritFloor);
    if (m.permanentWard) result.permanentWard = true;
    if (m.counterAppliesAllAilments) result.counterAppliesAllAilments = true;
    if (m.counterHitDebuff) result.counterHitDebuff = m.counterHitDebuff;
    if (m.guardedEnhancement) result.guardedEnhancement = m.guardedEnhancement;
    // Sprint 4D: Blade Trap
    if (m.detonationGuaranteedCrit) result.detonationGuaranteedCrit = true;
    if (m.detonationExtraAilments) result.detonationExtraAilments += m.detonationExtraAilments;
    if (m.detonationAilmentPotencyMultiplier) result.detonationAilmentPotencyMultiplier = Math.max(result.detonationAilmentPotencyMultiplier, m.detonationAilmentPotencyMultiplier);
    if (m.trapCharges) result.trapCharges = Math.max(result.trapCharges, m.trapCharges);
    // Sprint 4E: Shadow Dash
    if (m.passThroughAilment) result.passThroughAilment = m.passThroughAilment;
    if (m.perPassThroughTarget) result.perPassThroughTarget = m.perPassThroughTarget;
    if (m.postCastDodgeWindow) result.postCastDodgeWindow = m.postCastDodgeWindow;
    if (m.shadowPhaseCounterDamage) result.shadowPhaseCounterDamage += m.shadowPhaseCounterDamage;
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
export function getGraphRespecCost(_skillLevel: number): number {
  return 0; // TODO: restore to 50 * _skillLevel * _skillLevel after testing
}

// ============================================================
// Idle Exile — Skill Modifier ABI
// Phase 2 cleanup 2026-05-04: per-skill graph resolver + allocation
// helpers retired (talent system moved to src/data/classTrees/).
// This file now hosts the ResolvedSkillModifier shape + identity
// constant — the contract between future class-talent resolution
// (Phase D) and the damage pipeline (damageBuckets / dps / weapons).
// ============================================================

import type { AbilityEffect, ConditionalModifier, SkillProcEffect,
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

  // Staff v2: on-kill passive (Grave Injustice)
  onKillCDR: number;                         // flat seconds reduced from all skill cooldowns per kill
  onKillHealPercent: number;                 // % max life healed per kill

  // Staff v2: Mass Sacrifice talent tree — numeric additives
  minionHpMult: number;                      // % bonus minion max HP (applied at summon)
  minionDurationMult: number;                // % bonus minion duration (applied at summon)
  minionDamageMult: number;                  // % bonus minion attack damage (applied at summon)
  damagePerMinionAlive: number;              // % damage bonus per active minion (tick damageMult)
  zombieDogAttackIntervalReduction: number;  // flat seconds subtracted from zombie_dog attackInterval
  detonationPerSoulStackBonus: number;       // % bonus detonation damage per soul_stack consumed by Mass Sacrifice
  burstDamagePerDebuffOnTarget: number;      // % burst damage bonus per debuff on front target
  cdRefundPerStateConsumed: number;          // % cooldown refunded per combo state consumed by this cast
  plaguedConsumePoisonStacks: number;        // poison stacks applied to all hit enemies when Mass Sacrifice consumes plagued
  hexedConsumeMassSacrificeBonus: number;    // extra % damage when Mass Sacrifice consumes hexed (stacks with baseline)
  soulStackDamagePerStack: number;           // override: per-stack damage % when soul_stack is consumed (0 = baseline 15%)
  soulStackCapOverride: number;              // override: max stack cap for soul_stack (0 = default 5)

  // Staff v2: Mass Sacrifice boolean flags
  massSacrificePandemic: boolean;            // Mass Sacrifice consuming plagued triggers pandemic spread
  pandemicFullDuration: boolean;             // pandemic preserves full remaining duration instead of snapshots
  detonationUsesMaxHp: boolean;              // detonation damage uses minion maxHp instead of current hp
  detonationPerMinionMult: boolean;          // detonation damage multiplied by number of minions detonated
  resummonOnMassSacrifice: boolean;          // after Mass Sacrifice detonation, resummon both dog + fetish swarms
  hauntedConsumeSummonsSpirit: boolean;      // consuming haunted on Mass Sacrifice summons a temporary spirit
  cannotMiss: boolean;                       // skill cannot miss (tick.ts skips hit roll)
  firstCastGuaranteedCrit: boolean;          // first cast per encounter is guaranteed crit
  resetAllCooldownsOnCast: boolean;          // resets all skill timers in postCast
  critRefreshesCombatStates: boolean;        // critical Mass Sacrifice refreshes haunted/plagued/hexed durations

  // Staff v2: Haunt talent tree
  hauntKillSpawnsMinion: boolean;            // Haunt kills summon a temporary spirit
  hauntIsAoe: boolean;                       // Haunt applies to all pack enemies on cast
  hauntChainDamageCompound: number;          // % compounding damage per chain hop (DEATH MARCH)
  hauntedTargetHauntBonus: number;           // % extra Haunt damage to already-haunted targets
  hauntedExecuteThreshold: number;           // % HP below which haunted targets die instantly (MIND PRISON)

  // Staff v2: Soul Harvest talent tree
  damagePerSoulStackActive: number;          // % damage bonus per active soul_stack (Stackbreaker / Stackweaver)
  soulHarvestCritBonusStacks: number;        // extra soul_stack applied on critical Soul Harvest cast (Double Harvest)
  soulStackConsumeHealsMinions: number;      // % max HP healed per minion, per soul_stack consumed (Soul Feast)
  soulHarvestDamageHealPercent: number;      // % of Soul Harvest damage returned as player heal (Soul Drain)

  // Staff v2: Zombie Dogs talent tree
  extraZombieDogCount: number;               // additional dogs summoned per Zombie Dogs cast (Third Dog)

  // Staff v2: Fetish Swarm / Hex talent trees
  extraFetishCount: number;                  // additional fetishes summoned per Fetish Swarm cast (Twin Fetish)
  hexedTargetDamageAmp: number;              // % extra Hex damage to already-hexed targets (Amplifying Curse)

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
  // Staff v2 defaults
  onKillCDR: 0,
  onKillHealPercent: 0,
  // Mass Sacrifice talent numeric defaults
  minionHpMult: 0,
  minionDurationMult: 0,
  minionDamageMult: 0,
  damagePerMinionAlive: 0,
  zombieDogAttackIntervalReduction: 0,
  detonationPerSoulStackBonus: 0,
  burstDamagePerDebuffOnTarget: 0,
  cdRefundPerStateConsumed: 0,
  plaguedConsumePoisonStacks: 0,
  hexedConsumeMassSacrificeBonus: 0,
  soulStackDamagePerStack: 0,
  soulStackCapOverride: 0,
  // Mass Sacrifice boolean defaults
  massSacrificePandemic: false,
  pandemicFullDuration: false,
  detonationUsesMaxHp: false,
  detonationPerMinionMult: false,
  resummonOnMassSacrifice: false,
  hauntedConsumeSummonsSpirit: false,
  cannotMiss: false,
  firstCastGuaranteedCrit: false,
  resetAllCooldownsOnCast: false,
  critRefreshesCombatStates: false,
  // Haunt talent defaults
  hauntKillSpawnsMinion: false,
  hauntIsAoe: false,
  hauntChainDamageCompound: 0,
  hauntedTargetHauntBonus: 0,
  hauntedExecuteThreshold: 0,
  // Soul Harvest talent defaults
  damagePerSoulStackActive: 0,
  soulHarvestCritBonusStacks: 0,
  soulStackConsumeHealsMinions: 0,
  soulHarvestDamageHealPercent: 0,
  // Zombie Dogs talent defaults
  extraZombieDogCount: 0,
  // Fetish Swarm / Hex talent defaults
  extraFetishCount: 0,
  hexedTargetDamageAmp: 0,
  rawBehaviors: {},
};

// ============================================================
// Skills — abilities, skill trees, talent trees, damage system
// ============================================================

import type { StatKey } from './stats';
import type { WeaponType } from './items';

// --- Abilities ---

export type AbilityKind = 'passive' | 'instant' | 'buff' | 'proc' | 'toggle' | 'ultimate';
export type IdleMode = 'combat' | 'gathering';

export interface AbilityEffect {
  // Multiplicative
  damageMult?: number;
  attackSpeedMult?: number;
  defenseMult?: number;
  clearSpeedMult?: number;
  xpMult?: number;
  itemDropMult?: number;
  materialDropMult?: number;
  // Additive
  critChanceBonus?: number;
  critMultiplierBonus?: number;
  resistBonus?: number;
  // Boolean flags
  ignoreHazards?: boolean;
  doubleClears?: boolean;
  // Stat-scaling (for instant/ultimate abilities)
  bonusClears?: ScalingFormula;
  durationFormula?: ScalingFormula;
  // Proc (for proc abilities)
  procChance?: number;              // 0-1, chance per clear
  procEffect?: Partial<AbilityEffect>;
  // DoT / lingering
  clearSpeedBuff?: number;          // +X% clear speed for dotDuration seconds
  dotDuration?: number;             // how long DoT/buff lingers after ability ends
  [key: string]: any;               // v2 forward compat
}

export interface ScalingTerm {
  stat: StatKey;
  divisor: number;
}

export interface ScalingFormula {
  base: number;
  scaling?: ScalingTerm[];
}

// --- Skill Tree ---

export interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  tier: number;                         // 1-4 (position in path)
  /** Legacy flat effect shape. Kept for existing per-skill trees.
   *  Class talent trees (Phase 4+) should prefer `effects` instead. */
  effect: Partial<AbilityEffect>;
  /** Phase 4 trigger-effect union. When present, engine dispatcher
   *  processes these; falls back to `effect` when absent. Allows
   *  class-identity nodes (procs, conditional scaling, summons)
   *  without polluting AbilityEffect. */
  effects?: TalentEffect[];
  durationBonus?: number;               // +X seconds to duration
  cooldownReduction?: number;           // -X% cooldown
  isPathPayoff?: boolean;               // true for the final node
  requiresNodeId?: string;              // must unlock this node first
}

// --- Phase 4: TalentEffect union ---
//
// Expresses class-identity mechanics on talent nodes beyond flat stat
// multipliers. Dispatched by the engine (sub-phase 5) in response to
// combat events (hit / kill / crit / tag-apply) or used as conditional
// modifiers (whileTag / perStack) in stat resolution.

/** Gameplay tags referenced by procOnTag triggers. Distinct from
 *  DamageTag — these describe skill-applied conditions / debuffs on
 *  targets (not damage channels). */
export type TalentTag =
  | 'hex' | 'curse' | 'mark' | 'poison' | 'bleed' | 'ignite' | 'chill'
  | 'shock' | 'frozen' | 'stun' | 'taunt';

export type TalentEffect =
  /** Flat stat add (e.g. +10% crit chance). */
  | { kind: 'stat'; stat: string; delta: number }
  /** Multiplicative stat mult (e.g. x1.15 attack speed). */
  | { kind: 'statMult'; stat: string; mult: number }
  /** Fires on applying a matching tag to a target. */
  | { kind: 'procOnTag'; tag: TalentTag; chance: number; action: TalentAction }
  /** Fires on killing with an optional damage-tag filter. */
  | { kind: 'procOnKill'; tag?: DamageTag; chance: number; action: TalentAction }
  /** Fires on any hit (or filtered by damage tag). */
  | { kind: 'procOnHit'; tag?: DamageTag; chance: number; action: TalentAction }
  /** Fires on crit. */
  | { kind: 'procOnCrit'; chance: number; action: TalentAction }
  /** Conditional modifier: while target has tag, multiply stat. */
  | { kind: 'whileTag'; tag: TalentTag; stat: string; mult: number }
  /** Per-stack modifier (e.g. +5% damage per poison stack, capped). */
  | { kind: 'perStack'; stack: string; stat: string; perStackDelta: number; cap?: number }
  /** Adds a damage tag to skills matching a source tag
   *  (e.g. all 'Curse' skills gain 'DoT' tag). */
  | { kind: 'grantTagOnSkill'; skillTag: DamageTag; addTag: DamageTag };

export type TalentAction =
  /** Summon a minion (temporary or permanent). */
  | { kind: 'summon'; minionType: string; count?: number; durationSec?: number }
  /** Apply a gameplay tag (poison stack, hex debuff). */
  | { kind: 'applyTag'; tag: TalentTag; stacks?: number; duration?: number }
  /** Trigger a skill by id (free cast). */
  | { kind: 'triggerSkill'; skillId: string }
  /** Heal self a flat amount. */
  | { kind: 'healSelf'; amount: number }
  /** Grant a buff by id. */
  | { kind: 'grantBuff'; buffId: string; duration: number };

export interface SkillTreePath {
  id: 'A' | 'B' | 'C';
  name: string;
  description: string;
  nodes: SkillTreeNode[];
}

export interface AbilitySkillTree {
  paths: [SkillTreePath, SkillTreePath, SkillTreePath];
  maxPoints: number;
}

// --- Ability Definitions ---

export interface MutatorDef {
  id: string;
  name: string;
  description: string;
  effectOverride: Partial<AbilityEffect>;
  durationBonus?: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  weaponType: WeaponType;
  kind: AbilityKind;
  icon: string;
  duration?: number;
  cooldown?: number;
  effect: AbilityEffect;
  skillTree?: AbilitySkillTree;
  mutators?: MutatorDef[];              // DEPRECATED — kept for migration
}

export interface EquippedAbility {
  abilityId: string;
  selectedMutatorId: string | null;     // DEPRECATED — kept for migration
}

export interface AbilityTimerState {
  abilityId: string;
  activatedAt: number | null;
  cooldownUntil: number | null;
}

// --- Ability Progress (XP + Skill Tree State) ---

export interface AbilityProgress {
  abilityId: string;
  xp: number;
  level: number;                        // 0-10
  allocatedNodes: string[];             // IDs of unlocked skill tree nodes
}

export const ABILITY_SLOT_UNLOCKS = [1, 5, 15] as const;

// --- Skill Graph Trees (Sprint 11B) ---

export type DamageElement = 'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Chaos' | 'matched';
export type SkillModifierFlag = 'pierce' | 'fork' | 'alwaysCrit' | 'cannotCrit' | 'lifeLeech' | 'ignoreResists';

// --- Damage Type System (Buckets + Conversion) ---

export type DamageType = 'physical' | 'cold' | 'lightning' | 'fire' | 'chaos';
export type AilmentType = 'bleed' | 'chill' | 'shock' | 'burn' | 'poison';

export interface DamageBucket {
  type: DamageType;
  amount: number;
}

export interface ConversionSpec {
  from: 'physical';
  to: DamageType;
  percent: number;  // 0-100
}

export interface DamageResult {
  total: number;
  buckets: DamageBucket[];
}

// --- Skill Tree Phase 1: Expanded Modifier Types ---

export type TriggerCondition =
  | 'onCrit' | 'onKill' | 'onBlock' | 'onDodge' | 'onHit'
  | 'onDebuffApplied' | 'whileLowHp' | 'whileFullHp'
  | 'whileDebuffActive' | 'afterConsecutiveHits'
  | 'onBossPhase' | 'onFirstHit' | 'onOverkill'
  | 'whileBuffActive' | 'consumeBuff'
  | 'onCast' | 'onCastComplete' | 'afterCastWithoutKill'
  // v2 talent tree conditions
  | 'afterAilmentConsumption' | 'afterCast' | 'afterCastHitCount'
  | 'afterCastOnMultipleTargets' | 'afterDash' | 'afterDetonation'
  | 'afterDodge' | 'afterDodgeOrBlock' | 'afterTrapPlacement' | 'afterWardExpires'
  | 'ailmentAge' | 'ailmentAgeScaling' | 'ailmentKillAfterFoK'
  | 'counterHitKillDuringWard' | 'detonationKill'
  | 'empoweredSkillKill' | 'enemyAttacksAfterBeingHit' | 'enemyAttacksSinceLast'
  | 'firstSkillInEncounter' | 'lastSkillInCycle'
  | 'onAilmentApplied' | 'onAilmentExpire' | 'onAilmentKill' | 'onAilmentTick'
  | 'onCounterHitAilment' | 'onDashCast' | 'onDetonation'
  | 'onFirstHitVsTarget' | 'onKillInCast'
  | 'onLinkedTargetDeath' | 'onLinkedTargetsThreshold'
  | 'onMultiKillInCast' | 'onTripleKillInCast'
  | 'perAilmentStackOnTarget' | 'perCounterHitInWard' | 'perEnemyInPack'
  | 'perFortifyStack' | 'perHitReceivedDuringWard'
  | 'perOtherSkillAilmentOnTarget' | 'perOtherSkillOnCooldown'
  | 'perOwnAilmentOnTarget' | 'perSecondOnCooldown'
  | 'perSecondRemainingOnWard' | 'perSecondSinceArmed'
  | 'perTargetInLastCast' | 'perUniqueTargetInLastCast'
  | 'perViperStrikeAilmentGlobal' | 'previousSkillWas'
  | 'sdAilments' | 'shadowMomentumActive' | 'skillsCastSinceLast'
  | 'targetHasActiveAilment' | 'trapAilments'
  | 'whileAboveHp' | 'whileDeepWoundActive' | 'whileFortifyStacks'
  | 'whilePackSize' | 'whileSkillOnCooldown'
  | 'whileTargetAilmentCount' | 'whileTargetBelowHp'
  | 'whileTargetLinked' | 'whileTargetSaturated' | 'whileTargetsHit'
  | 'whileViperStrikeAilmentCount' | 'whileWardActive'
  // Staff v2
  | 'whileMinionsAlive';

export interface ConditionalModifier {
  condition: TriggerCondition;
  threshold?: number;
  buffId?: string;              // for whileBuffActive / consumeBuff
  debuffId?: string;            // for whileDebuffActive — check specific debuff's stack count
  modifier: SkillModifier;
  [key: string]: any;           // v2 forward compat
}

export interface SkillProcEffect {
  id: string;
  chance: number;
  trigger: TriggerCondition;
  castSkill?: string;
  resetCooldown?: string;
  bonusCast?: boolean;
  applyBuff?: { buffId?: string; effect: AbilityEffect; duration: number; [key: string]: any };
  applyDebuff?: { debuffId: string; stacks?: number; duration: number; [key: string]: any };
  instantDamage?: { flatDamage?: number; element?: DamageElement; scaleStat?: string; scaleRatio?: number; [key: string]: any };
  healPercent?: number;
  internalCooldown?: number;    // seconds — prevents re-triggering within window
  resetGcd?: boolean;            // if true, also resets GCD (nextActiveSkillAt = now)
  [key: string]: any;            // v2 forward compat
}

export interface DebuffInteraction {
  bonusDamageVsDebuffed?: { debuffId: string; incDamage: number; consumeOnHit?: boolean };
  spreadDebuffOnKill?: { debuffIds: string[]; refreshDuration: number };
  debuffOnCrit?: { debuffId: string; stacks: number; duration: number };
  consumeDebuff?: { debuffId: string; damagePerStack: number; element: DamageElement };
  debuffDurationBonus?: number;
  debuffEffectBonus?: number;
}

export interface SkillChargeConfig {
  chargeId: string;
  maxCharges: number;
  gainOn: TriggerCondition;
  gainAmount: number;
  decayRate?: number;
  perChargeDamage?: number;
  perChargeCritChance?: number;
  perChargeCastSpeed?: number;
  spendAll?: {
    trigger: 'onCast' | 'onCrit';
    damagePerCharge: number;
    element: DamageElement;
    applyDebuff?: { debuffId: string; stacksPerCharge: number; duration: number };
  };
}

export interface SkillModifier {
  // v2 talent tree data — engine fields pending implementation
  [key: string]: any;  // eslint-disable-line @typescript-eslint/no-explicit-any

  // Additive stat bonuses (for damage pipeline)
  incDamage?: number;           // %increased damage (additive with gear)
  flatDamage?: number;          // flat bonus damage
  incCritChance?: number;       // +% crit chance
  incCritMultiplier?: number;   // +% crit multiplier
  incCastSpeed?: number;        // +% cast speed

  // Buff/passive effect passthrough
  abilityEffect?: Partial<AbilityEffect>;

  // Cross-skill: buffs ALL equipped skills, not just this skill's tree
  globalEffect?: Partial<AbilityEffect>;

  // Duration/cooldown
  durationBonus?: number;       // +X seconds to duration
  cooldownReduction?: number;   // -X% cooldown

  // Hit mechanics
  extraHits?: number;           // +N extra hits per cast

  // Mechanic-changing (keystones)
  convertElement?: { from: DamageElement; to: DamageElement; percent: number };
  convertToAoE?: boolean;       // single target → AoE
  applyDebuff?: { debuffId: string; chance: number; duration: number };
  procOnHit?: { effectId: string; chance: number };
  flags?: SkillModifierFlag[];

  // --- Phase 1: Conditional & proc ---
  conditionalMods?: ConditionalModifier[];
  procs?: SkillProcEffect[];
  debuffInteraction?: DebuffInteraction;
  chargeConfig?: SkillChargeConfig;

  // --- Phase 1: Defensive-offensive ---
  damageFromArmor?: number;       // % of armor added as flat damage
  damageFromEvasion?: number;     // % of evasion added as flat damage
  damageFromMaxLife?: number;     // % of max life added as flat damage
  leechPercent?: number;          // % of damage leeched as life
  lifeOnHit?: number;             // flat life gained per hit
  lifeOnKill?: number;            // flat life gained per kill
  fortifyOnHit?: { stacks: number; duration: number; damageReduction: number };

  // --- Phase 1: Conversion/transform ---
  chainCount?: number;            // number of chain bounces
  forkCount?: number;             // number of forks
  pierceCount?: number;           // number of pierces
  splitDamage?: { element: DamageElement; percent: number }[];
  addTag?: DamageTag;
  removeTag?: DamageTag;

  // --- Phase 1: Momentum ---
  rampingDamage?: { perHit: number; maxStacks: number; decayAfter: number };
  executeThreshold?: number;      // % HP threshold for execute bonus
  overkillDamage?: number;        // % of overkill carried to next target

  // --- Phase 1: Risk/reward ---
  selfDamagePercent?: number;     // % of max life dealt to self per cast
  cannotLeech?: boolean;
  reducedMaxLife?: number;        // % reduction to max life
  increasedDamageTaken?: number;  // % more damage taken
  berserk?: { damageBonus: number; damageTakenIncrease: number; lifeThreshold: number };

  // --- Talent tree: Dagger-specific ---
  critsDoNoBonusDamage?: boolean;       // crits still trigger procs, but no bonus damage
  critChanceCap?: number;               // clamp effective crit chance (0-1)
  executeOnly?: { hpThreshold: number; bonusDamage: number };  // skip if mob HP > threshold
  castPriority?: 'execute' | 'normal';  // execute = queue jump in rotation

  // --- Multiplicative offense stats (mirror gear stats on ResolvedStats) ---
  firePenetration?: number;             // % more fire damage (penetration)
  coldPenetration?: number;             // % more cold damage (penetration)
  lightningPenetration?: number;        // % more lightning damage (penetration)
  chaosPenetration?: number;            // % more chaos damage (penetration)
  dotMultiplier?: number;               // % more DoT damage
  weaponMastery?: number;               // % more total damage (weapon mastery)
  ailmentDuration?: number;             // % increased ailment/debuff duration

  // --- Dagger v2: Combo & Element ---
  castCondition?: { condition: TriggerCondition; threshold?: number };
  cooldownIncrease?: number;            // flat seconds added to base cooldown
  ailmentPotency?: number;              // % increase to ailment damage snapshot
  directDamageOverride?: number;        // override base damage for direct hit
  comboStateCreation?: { stateId: string; duration: number; maxStacks?: number };
}

export interface SkillGraphNode {
  id: string;
  name: string;
  description: string;
  nodeType: 'start' | 'minor' | 'notable' | 'keystone';
  tier: number;                 // 0-4 for UI rings (0=center)
  connections: string[];        // adjacent node IDs
  modifier?: SkillModifier;
}

export interface SkillGraph {
  skillId: string;
  nodes: SkillGraphNode[];
  maxPoints: number;            // 20
}

// --- Talent Tree (Skill Tree Overhaul v3.2) ---

export type TalentNodeType = 'behavior' | 'notable' | 'keystoneChoice' | 'keystone' | 'conditional' | 'support';

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  nodeType: TalentNodeType;
  maxRank: number;              // 1 or 2
  tier: number;                 // 1-7
  branchIndex: number;          // 0-2
  position: number;             // 0-2 within tier
  modifier: SkillModifier;
  perRankModifiers?: Record<number, SkillModifier>;
  exclusiveWith?: string[];     // T5 mutual exclusion
  requiresNodeId?: string;
  procPattern?: string;
  tensionWith?: string;
  antiSynergy?: string[];
  synergy?: string[];
}

export interface TalentBranch {
  id: string;
  name: string;
  description: string;
  nodes: TalentNode[];          // ~10 nodes per branch
}

export interface TalentTree {
  skillId: string;
  branches: [TalentBranch, TalentBranch, TalentBranch];
  maxPoints: number;            // 30
}

// --- Active Skills ---

/** Damage tags — determine which stats apply to a skill. */
export type DamageTag =
  // Source
  | 'Attack' | 'Spell'
  // Delivery
  | 'Melee' | 'Projectile' | 'AoE' | 'DoT' | 'Channel'
  // Role (dagger v2)
  | 'Chain' | 'Trap' | 'Movement' | 'Defensive' | 'Utility' | 'Heavy'
  // Role (staff v2 — witch doctor)
  | 'Minion' | 'Curse'
  // Element
  | 'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Chaos';

export interface ActiveSkillDef {
  id: string;
  name: string;
  description: string;
  weaponType: WeaponType;
  tags: DamageTag[];
  baseDamage: number;           // flat base damage from skill itself
  weaponDamagePercent: number;  // Attack skills: % of weapon phys damage added (1.0 = 100%)
  spellPowerRatio: number;      // Spell skills: % of spell power added (1.0 = 100%)
  castTime: number;             // seconds per use
  cooldown: number;             // seconds between uses (0 = spammable)
  levelRequired: number;        // character level to unlock
  icon: string;                 // emoji for now
  // Optional mechanics
  hitCount?: number;            // hits per use (default 1)
  chainCount?: number;          // chain bounces to additional targets
  dotDuration?: number;         // DoT seconds
  dotDamagePercent?: number;    // % of hit applied as DoT per second (0.3 = 30%)
  baseConversion?: ConversionSpec;  // elemental conversion of physical base damage
}

// --- Unified Skills (10F) ---

export type SkillKind = 'active' | 'passive' | 'buff' | 'instant' | 'proc' | 'toggle' | 'ultimate';

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  weaponType: WeaponType;
  kind: SkillKind;
  tags: DamageTag[];
  icon: string;
  levelRequired: number;
  // Damage fields (kind === 'active')
  baseDamage: number;
  weaponDamagePercent: number;
  spellPowerRatio: number;
  castTime: number;
  cooldown: number;
  hitCount?: number;
  chainCount?: number;              // chain bounces to additional targets
  dotDuration?: number;
  dotDamagePercent?: number;
  baseConversion?: ConversionSpec;  // elemental conversion of physical base damage
  // Buff/utility fields (non-active kinds)
  duration?: number;
  effect?: AbilityEffect;
  skillTree?: AbilitySkillTree;
  skillGraph?: SkillGraph;
  talentTree?: TalentTree;
  // Forward-compatible timing fields (Phase 6 engine consumes;
  // current engine ignores). See docs/design/CLASS_SYSTEM_PLAN.md §Combat.
  /** Delivery kind for Phase 6 engine. Undefined → infer from castTime. */
  skillKind?: 'instant' | 'cast' | 'channel' | 'auto';
  /** Tick interval for channel kinds (seconds). */
  channelTickInterval?: number;
  /** Post-cast stiffness (seconds). */
  recoveryTime?: number;
  /** Mana cost per cast (or per tick for channels). Undefined → 0. */
  manaCost?: number;
}

export interface EquippedSkill {
  skillId: string;
  autoCast: boolean;
}

export interface SkillProgress {
  skillId: string;
  xp: number;
  level: number;
  allocatedNodes: string[];
  allocatedRanks?: Record<string, number>;  // talent tree node ranks
  elementTransform?: DamageType;             // per-skill element override (Dagger v2)
}

export interface SkillTimerState {
  skillId: string;
  activatedAt: number | null;
  cooldownUntil: number | null;
}

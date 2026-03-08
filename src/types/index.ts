// ============================================================
// Idle Exile — Core Type Definitions
// ============================================================

// --- Affixes ---

export type AffixSlot = 'prefix' | 'suffix';
export type AffixCategory =
  | 'flat_phys_damage'
  | 'flat_atk_fire_damage'
  | 'flat_atk_cold_damage'
  | 'flat_atk_lightning_damage'
  | 'flat_atk_chaos_damage'
  | 'spell_power'
  | 'flat_spell_fire_damage'
  | 'flat_spell_cold_damage'
  | 'flat_spell_lightning_damage'
  | 'flat_spell_chaos_damage'
  | 'inc_phys_damage'
  | 'inc_spell_damage'
  | 'inc_attack_damage'
  | 'inc_elemental_damage'
  | 'inc_fire_damage'
  | 'inc_cold_damage'
  | 'inc_lightning_damage'
  | 'inc_chaos_damage'
  | 'inc_melee_damage'
  | 'inc_projectile_damage'
  | 'inc_aoe_damage'
  | 'inc_dot_damage'
  | 'inc_channel_damage'
  | 'attack_speed'
  | 'cast_speed'
  | 'accuracy'
  | 'crit_chance'
  | 'crit_multiplier'
  | 'ability_haste'
  | 'flat_max_life'
  | 'inc_max_life'
  | 'life_regen'
  | 'flat_armor'
  | 'flat_evasion'
  | 'block_chance'
  | 'fire_resist'
  | 'cold_resist'
  | 'lightning_resist'
  | 'chaos_resist'
  | 'movement_speed'
  | 'item_quantity'
  | 'item_rarity'
  | 'flat_energy_shield'
  | 'inc_energy_shield'
  | 'es_recharge';

export type AffixTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AffixDef {
  id: string;
  name: string;
  category: AffixCategory;
  slot: AffixSlot;
  stat: StatKey;
  allowedSlots: string[]; // slot group tags for slot-restricted rolling
  tiers: Record<AffixTier, { min: number; max: number }>;
  weight: number; // drop weight for rolling
  displayTemplate: string; // e.g. "+{value} Life" or "+{value}% Damage"
}

export interface Affix {
  defId: string;
  tier: AffixTier;
  value: number;
}

// --- Items ---

export type GearSlot =
  | 'mainhand' | 'offhand'
  | 'helmet' | 'neck' | 'shoulders' | 'cloak'
  | 'chest' | 'bracers' | 'gloves' | 'belt'
  | 'pants' | 'boots'
  | 'ring1' | 'ring2'
  | 'trinket1' | 'trinket2';
export type ArmorType = 'plate' | 'leather' | 'cloth';
export type WeaponType =
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'staff' | 'wand' | 'bow' | 'crossbow'
  | 'greatsword' | 'greataxe' | 'maul' | 'scepter' | 'gauntlet' | 'tome'
  | 'tool';
export type WeaponScalingType = 'attack' | 'spell' | 'hybrid';
export type OffhandType = 'shield' | 'focus' | 'quiver';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemBaseDef {
  id: string;
  name: string;
  slot: GearSlot;
  armorType?: ArmorType; // weapons don't have armor type
  weaponType?: WeaponType; // mainhand items only
  offhandType?: OffhandType; // offhand items only
  baseStats: Partial<Record<StatKey, number>>; // e.g. base armor, base damage
  baseDamageMin?: number; // attack weapon min hit
  baseDamageMax?: number; // attack weapon max hit
  baseSpellPower?: number; // spell weapon base SP
  iLvl: number;
}

export interface Item {
  id: string;
  baseId: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  iLvl: number;
  prefixes: Affix[];
  suffixes: Affix[];
  armorType?: ArmorType;
  weaponType?: WeaponType;
  offhandType?: OffhandType;
  baseStats: Partial<Record<StatKey, number>>;
  baseDamageMin?: number;
  baseDamageMax?: number;
  baseSpellPower?: number;
  isGatheringGear?: boolean;
  isProfessionGear?: boolean;
  isCrafted?: boolean;
  implicit?: Affix;          // corruption implicit from void invasions
  isCorrupted?: boolean;     // flagged for purple UI treatment
}

// --- Profession Gear ---

export interface ProfessionBonuses {
  gatherSpeed: number;        // % faster gathering
  gatherYield: number;        // % more materials
  instantGather: number;      // % chance to instant gather
  rareFind: number;           // % better rare mat rates
  craftSpeed: number;         // % faster crafting (future hook)
  materialSave: number;       // % chance to preserve mats (per-material roll)
  craftXp: number;            // % more crafting XP
  bonusIlvl: number;          // flat iLvl bonus on crafted gear
  criticalCraft: number;      // % chance for double output
  goldEfficiency: number;     // % gold cost reduction (capped 50%)
}

export const PROFESSION_GEAR_SLOTS: GearSlot[] = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots', 'mainhand'];

// --- Character ---

export type StatKey =
  // Attack
  | 'flatPhysDamage'
  | 'flatAtkFireDamage'
  | 'flatAtkColdDamage'
  | 'flatAtkLightningDamage'
  | 'flatAtkChaosDamage'
  | 'attackSpeed'
  | 'accuracy'
  | 'incPhysDamage'
  | 'incAttackDamage'
  // Spell
  | 'spellPower'
  | 'flatSpellFireDamage'
  | 'flatSpellColdDamage'
  | 'flatSpellLightningDamage'
  | 'flatSpellChaosDamage'
  | 'castSpeed'
  | 'incSpellDamage'
  // Shared Offensive
  | 'incElementalDamage'
  | 'incFireDamage'
  | 'incColdDamage'
  | 'incLightningDamage'
  | 'incChaosDamage'
  // Delivery
  | 'incMeleeDamage'
  | 'incProjectileDamage'
  | 'incAoEDamage'
  | 'incDoTDamage'
  | 'incChannelDamage'
  | 'critChance'
  | 'critMultiplier'
  | 'abilityHaste'
  // Defensive
  | 'maxLife'
  | 'incMaxLife'
  | 'lifeRegen'
  | 'armor'
  | 'evasion'
  | 'blockChance'
  | 'fireResist'
  | 'coldResist'
  | 'lightningResist'
  | 'chaosResist'
  // Energy Shield
  | 'energyShield'
  | 'incEnergyShield'
  | 'esRecharge'
  // Utility
  | 'movementSpeed'
  | 'itemQuantity'
  | 'itemRarity';

export type ResolvedStats = Record<StatKey, number>;

// --- Classes ---

export type CharacterClass = 'warrior' | 'mage' | 'ranger' | 'rogue';

export type ResourceType = 'rage' | 'arcane_charges' | 'tracking' | 'momentum';

export interface ClassDef {
  id: CharacterClass;
  name: string;
  description: string;
  baseStatBonuses: Partial<Record<StatKey, number>>;
  armorAffinity: ArmorType;
  // Resource mechanic config
  resourceType: ResourceType;
  resourceMax: number | null;        // null = uncapped (Rogue)
  resourcePerClear: number;
  resourceDecayRate: number;          // stacks lost per second (0 = no time decay)
  resourceDecayOnZoneSwitch: boolean;
  resourceDecayOnStop: boolean;
  resourceDecayOnGearSwap: boolean;
  resourceDescription: string;        // short player-facing summary
}

export interface ClassResourceState {
  type: ResourceType;
  stacks: number;
  lastZoneId: string | null;          // for Ranger same-zone tracking
}

export interface Character {
  name: string;
  class: CharacterClass;
  level: number;
  xp: number;
  xpToNext: number;
  equipment: Partial<Record<GearSlot, Item>>;
  stats: ResolvedStats;
}

// --- Zones ---

export type HazardType = 'fire' | 'cold' | 'lightning' | 'chaos';

export interface ZoneHazard {
  type: HazardType;
  threshold: number;
}

export type MobDropRarity = 'common' | 'uncommon' | 'rare';

export interface MobDrop {
  materialId: string;
  chance: number;        // 0-1 independent roll per clear
  minQty: number;
  maxQty: number;
  rarity: MobDropRarity; // for UI color coding
}

export interface MobTypeDef {
  id: string;              // globally unique, e.g. 'thicket_crawler'
  name: string;            // "Thicket Crawler"
  weight: number;          // spawn weight when farming whole zone
  drops: MobDrop[];        // 2-5 drops with independent roll chances
  hpMultiplier?: number;   // 0.8-1.2, defaults 1.0
  description?: string;    // flavor text
}

export interface ZoneDef {
  id: string;
  name: string;
  band: number;
  bandIndex: number;
  description: string;
  baseClearTime: number; // seconds at power parity
  iLvlMin: number;
  iLvlMax: number;
  recommendedLevel: number;
  materialDrops: string[];
  gatheringTypes: GatheringProfession[];
  hazards: ZoneHazard[];
  unlockRequirement?: string; // id of zone that must be accessible first
  mobName: string;
  bossName: string;
}

export interface IdleRunResult {
  items: Item[];
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  bagDrops: Record<string, number>;
  xpGained: number;
  goldGained: number;
  clearsCompleted: number;
  elapsed: number;
  autoSalvaged?: { itemsSalvaged: number; dustGained: number };
}

export interface OfflineProgressSummary {
  zoneId: string;
  zoneName: string;
  elapsedSeconds: number;
  clearsCompleted: number;
  items: Item[];
  autoSalvagedCount: number;
  autoSalvagedDust: number;
  autoSoldCount: number;
  autoSoldGold: number;
  goldGained: number;
  xpGained: number;
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  bagDrops: Record<string, number>;
  bestItem: Item | null;
}

// --- Combat ---

/** Result of simulating one combat clear with per-hit rolls. */
export interface CombatClearResult {
  clearTime: number;      // Simulated clear time in seconds
  totalCasts: number;     // Skill casts during clear
  hits: number;           // Successful hits
  crits: number;          // Critical hits (subset of hits)
  misses: number;         // Missed attacks (spells always hit -> 0)
  totalDamage: number;    // Total damage dealt to mob
  dotDamage: number;      // Damage from DoT ticks (subset of totalDamage)
}

/** Result of one real-time combat tick (10K-A, extended 10K-B1 for boss). */
export interface CombatTickResult {
  mobKills: number;
  skillFired: boolean;
  damageDealt: number;
  skillId: string | null;
  isCrit: boolean;
  isHit: boolean;
  bossOutcome?: 'ongoing' | 'victory' | 'defeat';
  zoneAttack?: { damage: number; isDodged: boolean; isBlocked: boolean } | null;
  bossAttack?: { damage: number; isDodged: boolean; isBlocked: boolean; isCrit: boolean } | null;
  zoneDeath?: boolean;
  dotDamage?: number;           // poison + burning DoT this tick
  bleedTriggerDamage?: number;  // bleed trigger damage this tick
  shatterDamage?: number;       // chilled shatter damage this tick
  procDamage?: number;           // proc bonus damage (for separate floater)
  procLabel?: string;            // human-readable proc name e.g. "Venom Burst"
  cooldownWasReset?: boolean;    // true if any skill CD was reset via proc this tick
  gcdWasReset?: boolean;         // true if any proc had resetGcd (free instant cast)
  didSpreadDebuffs?: boolean;    // true if debuffs were spread to new mob on kill
  packSize?: number;             // pack size of current encounter (for UI)
  encounterLootMult?: number;    // rare mob loot multiplier for this encounter
}

export type CombatPhase = 'clearing' | 'boss_fight' | 'boss_victory' | 'boss_defeat' | 'zone_defeat';

export interface BossState {
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  playerDps: number;           // damage to boss per second (kept for victory overlay stats)
  bossDps: number;             // effective boss DPS (computed from per-hit: dmg/interval, for UI display)
  bossDamagePerHit: number;    // base damage per boss attack
  bossAttackInterval: number;  // seconds between boss attacks
  bossNextAttackAt: number;    // timestamp of next boss attack (ms)
  bossAccuracy: number;        // boss accuracy for dodge calc
  bossPhysRatio: number;       // physical vs elemental split (0-1)
  startedAt: number;           // timestamp
}

// --- Currencies ---

export type CurrencyType =
  | 'augment'
  | 'chaos'
  | 'divine'
  | 'annul'
  | 'exalt'
  | 'greater_exalt'
  | 'perfect_exalt'
  | 'socket';

export interface CurrencyDef {
  id: CurrencyType;
  name: string;
  description: string;
  icon: string; // emoji for prototype
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// --- Crafting Result ---

export interface CraftResult {
  success: boolean;
  item: Item;
  message: string;
}

// --- Bag Upgrades ---

export interface BagUpgradeDef {
  id: string;
  name: string;
  capacity: number;       // slots this bag provides
  tier: number;
  description: string;
  goldCost: number;
  sellValue: number;       // gold received when selling a replaced bag
  salvageValue: number;    // salvage dust received when salvaging
}

// --- Set Bonuses ---

/** Slots that count toward armor-set bonuses. */
export const SET_SLOTS: GearSlot[] = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots'];

export type SetBonusThreshold = 2 | 4 | 6;

export interface SetBonusDef {
  armorType: ArmorType;
  name: string;
  thresholds: Record<SetBonusThreshold, Partial<Record<StatKey, number>>>;
}

export interface ActiveSetBonus {
  armorType: ArmorType;
  name: string;
  count: number;
  bonuses: { threshold: SetBonusThreshold; stats: Partial<Record<StatKey, number>> }[];
}

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
  effect: Partial<AbilityEffect>;
  durationBonus?: number;               // +X seconds to duration
  cooldownReduction?: number;           // -X% cooldown
  isPathPayoff?: boolean;               // true for the final node
  requiresNodeId?: string;              // must unlock this node first
}

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

export const ABILITY_SLOT_UNLOCKS = [1, 5, 12, 20] as const;

// --- Rare Materials ---

export type RareMaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RareMaterialDef {
  id: string;
  profession: GatheringProfession;
  rarity: RareMaterialRarity;
  name: string;
  icon: string;
  description: string;
}

// --- Gathering Professions ---

export type GatheringProfession = 'mining' | 'herbalism' | 'skinning' | 'logging' | 'fishing';

export interface GatheringSkillState { level: number; xp: number; }
export type GatheringSkills = Record<GatheringProfession, GatheringSkillState>;

export interface GatheringMilestone {
  level: number;
  type: 'yield_bonus' | 'rare_find' | 'double_gather' | 'mastery';
  value: number;
  description: string;
}

// --- Refinement ---

export type RefinementTrack = 'ore' | 'cloth' | 'leather' | 'wood' | 'herb' | 'fish';

export interface RefinementRecipeDef {
  id: string;
  track: RefinementTrack;
  tier: number;                     // 1-6
  rawMaterialId: string;
  rawAmount: number;
  previousRefinedId: string | null; // null for T1
  previousRefinedAmount: number;
  outputId: string;
  outputName: string;
  goldCost: number;
}

// --- Crafting Professions ---

export type CraftingProfession = 'weaponsmith' | 'armorer' | 'leatherworker' | 'tailor' | 'alchemist' | 'jeweler';

export interface CraftingSkillState { level: number; xp: number; }
export type CraftingSkills = Record<CraftingProfession, CraftingSkillState>;

export interface CraftingRecipeDef {
  id: string;
  profession: CraftingProfession;
  name: string;
  tier: number;                     // 1-6
  requiredLevel: number;
  materials: { materialId: string; amount: number }[];
  goldCost: number;
  outputBaseId: string;             // references ITEM_BASE_DEFS id
  outputILvl: number;
  outputMaterialId?: string;        // for recipes that produce materials (e.g. catalysts)
  isGatheringGear?: boolean;
  isProfessionGear?: boolean;
  catalystSlot?: boolean;           // true = recipe accepts an optional catalyst
  requiredCatalyst?: {              // for unique recipes that REQUIRE a specific rare mat
    rareMaterialId: string;
    amount: number;
  };
}

export interface CraftingMilestone {
  level: number;
  type: 'efficiency' | 'bonus_output' | 'quality_boost' | 'mastery' | 'pattern_bonus';
  value: number;
  description: string;
}

// --- Crafting Patterns ---

export type PatternSource = 'zone_drop' | 'boss_drop' | 'invasion_drop';

export interface CraftingPatternDef {
  id: string;
  name: string;
  description: string;
  band: number;                         // 1-3 for MVP
  profession: CraftingProfession;
  outputBaseId: string;                 // what item base it creates
  outputILvl: number;
  guaranteedAffixes: AffixCategory[];   // 1-2 guaranteed affix categories
  minRarity: Rarity;                    // minimum output rarity
  maxCharges: number;                   // base charges when found
  source: PatternSource;
  materialCostMult: number;             // 1.0 = same as normal recipe, 1.5 = 50% more
  xpMult: number;                       // 2.0 = double XP
}

export interface OwnedPattern {
  defId: string;
  charges: number;
  discoveredAt: number;
}

// --- Skill Graph Trees (Sprint 11B) ---

export type DamageElement = 'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Chaos';
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
  | 'onCast' | 'onCastComplete' | 'afterCastWithoutKill';

export interface ConditionalModifier {
  condition: TriggerCondition;
  threshold?: number;
  buffId?: string;              // for whileBuffActive / consumeBuff
  modifier: SkillModifier;
}

export interface SkillProcEffect {
  id: string;
  chance: number;
  trigger: TriggerCondition;
  castSkill?: string;
  resetCooldown?: string;
  bonusCast?: boolean;
  applyBuff?: { buffId?: string; effect: AbilityEffect; duration: number };
  applyDebuff?: { debuffId: string; stacks: number; duration: number };
  instantDamage?: { flatDamage: number; element: DamageElement; scaleStat?: string; scaleRatio?: number };
  healPercent?: number;
  internalCooldown?: number;    // seconds — prevents re-triggering within window
  resetGcd?: boolean;            // if true, also resets GCD (nextActiveSkillAt = now)
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

export type TalentNodeType = 'behavior' | 'notable' | 'keystoneChoice' | 'keystone';

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

export interface DebuffDef {
  id: string;
  name: string;
  description: string;
  stackable: boolean;
  maxStacks: number;
  dotType?: 'flat' | 'snapshot' | 'percentMaxHp'; // DoT calculation method
  effect: {
    incDamageTaken?: number;    // % more damage taken per stack
    dotDps?: number;            // damage per second per stack (legacy flat)
    reducedDamageDealt?: number;   // Weakened: % reduced damage dealt
    missChance?: number;           // Blinded: % chance to miss
    incCritDamageTaken?: number;   // Vulnerable: % increased crit damage taken
    reducedResists?: number;       // Cursed: flat resist reduction per stack
    reducedAttackSpeed?: number;   // Slowed: % reduced attack speed
    snapshotPercent?: number;      // % of hit damage as DoT per stack (bleed/poison)
    percentMaxHp?: number;         // % of enemy max HP as DPS (burning)
    incCritChanceTaken?: number;   // +crit chance on target per stack (shocked)
    shatterOverkillPercent?: number; // % of overkill dealt to next mob (chilled)
  };
}

export interface ActiveDebuff {
  debuffId: string;
  stacks: number;
  remainingDuration: number;    // seconds
  appliedBySkillId: string;
  stackSnapshots?: number[];    // hit damage that applied each stack (bleed/poison)
}

export interface TempBuff {
  id: string;
  effect: AbilityEffect;
  expiresAt: number;
  sourceSkillId: string;
  stacks: number;
  maxStacks: number;
}

// --- Active Skills ---

/** Damage tags — determine which stats apply to a skill. */
export type DamageTag =
  // Source
  | 'Attack' | 'Spell'
  // Delivery
  | 'Melee' | 'Projectile' | 'AoE' | 'DoT' | 'Channel'
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
  dotDuration?: number;
  dotDamagePercent?: number;
  baseConversion?: ConversionSpec;  // elemental conversion of physical base damage
  // Buff/utility fields (non-active kinds)
  duration?: number;
  effect?: AbilityEffect;
  skillTree?: AbilitySkillTree;
  skillGraph?: SkillGraph;
  talentTree?: TalentTree;
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
}

export interface SkillTimerState {
  skillId: string;
  activatedAt: number | null;
  cooldownUntil: number | null;
}

// --- Daily Quests ---

export type QuestObjectiveType = 'kill_mob' | 'clear_zone' | 'defeat_boss';

export interface QuestObjective {
  type: QuestObjectiveType;
  targetId: string;       // mobTypeId or zoneId
  targetName: string;
  required: number;
}

export interface QuestReward {
  gold?: number;
  xp?: number;
  materials?: Record<string, number>;
  currencies?: Partial<Record<CurrencyType, number>>;
}

export interface QuestDef {
  id: string;
  band: number;
  objective: QuestObjective;
  reward: QuestReward;
}

export interface QuestProgress {
  questId: string;
  current: number;
  claimed: boolean;
}

export interface DailyQuestState {
  questDate: string;  // 'YYYY-MM-DD' UTC
  quests: QuestDef[];
  progress: Record<string, QuestProgress>;
}

// --- Rare Mob Affixes ---

export type RareAffixId = 'mighty' | 'frenzied' | 'armored' | 'empowered' | 'regenerating';

export interface RareAffixDef {
  id: RareAffixId;
  name: string;
  description: string;
  hpMultiplier: number;
  damageMultiplier?: number;         // multiplies zone damage to player
  attackSpeedMultiplier?: number;    // multiplies zone attack interval (< 1 = faster)
  damageTakenMultiplier?: number;    // multiplies damage mob receives (< 1 = tankier)
  regenPerSec?: number;              // % of maxHP regen per second
  lootMultiplier: number;
  color: string;
}

export interface RareMobState {
  affixes: RareAffixId[];
  combinedHpMult: number;
  combinedLootMult: number;
  combinedDamageMult: number;        // to player
  combinedAtkSpeedMult: number;      // zone attack interval multiplier
  combinedDamageTakenMult: number;   // damage mob receives
  combinedRegenPerSec: number;       // flat regen rate (% of maxHP)
}

// --- Per-Mob Pack State ---

export interface MobInPack {
  hp: number;
  maxHp: number;
  debuffs: ActiveDebuff[];
  nextAttackAt: number;           // ms timestamp, each mob swings independently
  rare: RareMobState | null;      // null = normal mob
}

// --- Game State ---

export interface GameState {
  character: Character;
  inventory: Item[];
  currencies: Record<CurrencyType, number>;
  materials: Record<string, number>;
  gold: number;

  // Bag system
  bagSlots: string[];                    // exactly 5 bag def IDs
  bagStash: Record<string, number>;      // collected but unequipped bags

  // Idle state
  currentZoneId: string | null;
  idleStartTime: number | null; // timestamp when idle run started
  idleMode: IdleMode;

  // Gathering
  gatheringSkills: GatheringSkills;
  gatheringEquipment: Partial<Record<GearSlot, Item>>;
  selectedGatheringProfession: GatheringProfession | null;

  // Profession gear
  professionEquipment: Partial<Record<GearSlot, Item>>;

  // Crafting professions
  craftingSkills: CraftingSkills;

  // Crafting patterns
  ownedPatterns: OwnedPattern[];

  // Auto-salvage / auto-sell
  autoSalvageMinRarity: Rarity;
  autoDisposalAction: 'salvage' | 'sell';
  craftAutoSalvageMinRarity: Rarity;

  // Offline progression
  offlineProgress: OfflineProgressSummary | null;

  // Abilities (skill tree state — keyed by old ability IDs)
  abilityProgress: Record<string, AbilityProgress>;

  // Per-clear tracking (bug fix: replaces modulo-based progress)
  clearStartedAt: number;               // timestamp when current clear began
  currentClearTime: number;             // current clear duration in seconds

  // Combat (v15)
  currentHp: number;
  currentEs: number;  // energy shield pool (ephemeral, not persisted)
  combatPhase: CombatPhase;
  bossState: BossState | null;
  zoneClearCounts: Record<string, number>;  // persisted: clears per zone toward boss
  combatPhaseStartedAt: number | null;

  // Class resource
  classResource: ClassResourceState;
  classSelected: boolean;

  // Stats tracking
  totalKills: number;
  fastestClears: Record<string, number>;  // zoneId → fastest clear time in seconds

  // Unified skill bar (v25)
  skillBar: (EquippedSkill | null)[];         // 8 unified slots
  skillProgress: Record<string, SkillProgress>;
  skillTimers: SkillTimerState[];

  // Class talent tree (v28)
  talentAllocations: string[];

  // Skill graph debuffs (v29 — ephemeral, not persisted)
  activeDebuffs: ActiveDebuff[];

  // Skill tree Phase 1: ephemeral combat state (not persisted, reset on rehydrate)
  consecutiveHits: number;
  lastSkillsCast: string[];
  lastOverkillDamage: number;
  killStreak: number;
  lastCritAt: number;
  lastBlockAt: number;
  lastDodgeAt: number;
  tempBuffs: TempBuff[];
  skillCharges: Record<string, { current: number; max: number; chargeId: string }>;
  rampingStacks: number;
  rampingLastHitAt: number;
  fortifyStacks: number;
  fortifyExpiresAt: number;
  fortifyDRPerStack: number;  // copied from graphMod on hit, avoids graphMod lookup at damage sites

  // Talent tree: ephemeral combat state (not persisted, reset on rehydrate)
  lastHitMobTypeId: string | null;                    // for same-target consecutive hit tracking
  freeCastUntil: Record<string, number>;              // skillId → timestamp: free cast (no CD) until
  lastProcTriggerAt: Record<string, number>;          // procId → timestamp: internal cooldown tracking

  // Per-clear combat sim result (v25 — ephemeral, not persisted)
  lastClearResult: CombatClearResult | null;

  // Auto-cast GCD tracking (ephemeral)
  lastSkillActivation: number;

  // Real-time combat (10K-A — ephemeral, reset on rehydrate)
  nextActiveSkillAt: number;

  // Per-mob pack state (ephemeral, reset on rehydrate)
  packMobs: MobInPack[];              // each mob has own HP, debuffs, attack timer, affixes
  currentPackSize: number;            // convenience: total mobs in encounter (1 = single)

  // Mob types & targeted farming
  targetedMobId: string | null;
  currentMobTypeId: string | null;  // ephemeral: the mob currently being fought (random or targeted)
  mobKillCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalZoneClears: Record<string, number>;

  // Daily quests
  dailyQuests: DailyQuestState;

  // Craft log (ephemeral — not persisted, reset on rehydrate)
  craftLog: CraftLogEntry[];

  // Craft output buffer (persisted — staging area for crafted gear)
  craftOutputBuffer: Item[];

  // Zone mastery milestones
  zoneMasteryClaimed: Record<string, number>;  // zoneId → highest claimed threshold (0/25/100/500)

  // Void invasions
  invasionState: {
    activeInvasions: Record<number, { zoneId: string; startTime: number; endTime: number }>;
    bandCooldowns: Record<number, number>;  // band → timestamp when cooldown expires
  };

  // Tutorial
  tutorialStep: number;

  // Meta
  lastSaveTime: number;
}

export interface CraftLogEntry {
  id: string;
  timestamp: number;
  type: 'refine' | 'gear' | 'pattern';
  recipeName: string;
  count: number;
  xpGained: number;
  profession?: CraftingProfession;
  trackId?: string;             // refinement track for refine entries
  itemName?: string;
  itemRarity?: Rarity;
  wasSalvaged?: boolean;
  batchSalvaged?: number;
}

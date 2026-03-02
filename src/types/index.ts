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
  | 'item_rarity';

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
  | 'greatsword' | 'greataxe' | 'maul' | 'scepter' | 'gauntlet' | 'tome';
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
  isCrafted?: boolean;
}

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

export type CombatPhase = 'clearing' | 'boss_fight' | 'boss_victory' | 'boss_defeat' | 'zone_defeat';

export interface BossState {
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  playerDps: number;   // damage to boss per second
  bossDps: number;     // damage to player per second
  startedAt: number;   // timestamp
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
  catalystSlot?: boolean;           // true = recipe accepts an optional catalyst
  requiredCatalyst?: {              // for unique recipes that REQUIRE a specific rare mat
    rareMaterialId: string;
    amount: number;
  };
}

export interface CraftingMilestone {
  level: number;
  type: 'efficiency' | 'bonus_output' | 'quality_boost' | 'mastery';
  value: number;
  description: string;
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
  // Buff/utility fields (non-active kinds)
  duration?: number;
  effect?: AbilityEffect;
  skillTree?: AbilitySkillTree;
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
}

export interface SkillTimerState {
  skillId: string;
  activatedAt: number | null;
  cooldownUntil: number | null;
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

  // Crafting professions
  craftingSkills: CraftingSkills;

  // Auto-salvage / auto-sell
  autoSalvageMinRarity: Rarity;
  autoDisposalAction: 'salvage' | 'sell';
  craftAutoSalvageMinRarity: Rarity;

  // Offline progression
  offlineProgress: OfflineProgressSummary | null;

  // Abilities
  equippedAbilities: (EquippedAbility | null)[];
  abilityTimers: AbilityTimerState[];
  abilityProgress: Record<string, AbilityProgress>;

  // Per-clear tracking (bug fix: replaces modulo-based progress)
  clearStartedAt: number;               // timestamp when current clear began
  currentClearTime: number;             // current clear duration in seconds

  // Combat (v15)
  currentHp: number;
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

  // Active skills (v24)
  equippedSkills: (string | null)[];  // ActiveSkillDef IDs, 4 slots

  // Unified skill bar (v25)
  skillBar: (EquippedSkill | null)[];         // 8 unified slots
  skillProgress: Record<string, SkillProgress>;
  skillTimers: SkillTimerState[];

  // Per-clear combat sim result (v25 — ephemeral, not persisted)
  lastClearResult: CombatClearResult | null;

  // Tutorial
  tutorialStep: number;

  // Meta
  lastSaveTime: number;
}

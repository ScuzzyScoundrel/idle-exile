// ============================================================
// Idle Exile — Core Type Definitions
// ============================================================

// --- Affixes ---

export type AffixSlot = 'prefix' | 'suffix';
export type AffixCategory =
  | 'flat_damage'
  | 'percent_damage'
  | 'attack_speed'
  | 'crit_chance'
  | 'crit_damage'
  | 'flat_life'
  | 'percent_life'
  | 'flat_armor'
  | 'dodge_chance'
  | 'ability_haste'
  | 'fire_resist'
  | 'cold_resist'
  | 'lightning_resist'
  | 'poison_resist'
  | 'chaos_resist';

export type AffixTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AffixDef {
  id: string;
  name: string;
  category: AffixCategory;
  slot: AffixSlot;
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
export type WeaponType = 'sword' | 'axe' | 'mace' | 'dagger' | 'staff' | 'wand' | 'bow' | 'crossbow';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemBaseDef {
  id: string;
  name: string;
  slot: GearSlot;
  armorType?: ArmorType; // weapons don't have armor type
  weaponType?: WeaponType; // mainhand items only
  baseStats: Partial<Record<StatKey, number>>; // e.g. base armor, base damage
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
  baseStats: Partial<Record<StatKey, number>>;
  isGatheringGear?: boolean;
  isCrafted?: boolean;
}

// --- Character ---

export type StatKey =
  | 'damage'
  | 'attackSpeed'
  | 'critChance'
  | 'critDamage'
  | 'life'
  | 'armor'
  | 'dodgeChance'
  | 'abilityHaste'
  | 'fireResist'
  | 'coldResist'
  | 'lightningResist'
  | 'poisonResist'
  | 'chaosResist';

export type ResolvedStats = Record<StatKey, number>;

// --- Classes ---

export type CharacterClass = 'warrior';

export interface ClassDef {
  id: CharacterClass;
  name: string;
  description: string;
  baseStatBonuses: Partial<Record<StatKey, number>>;
  armorAffinity: ArmorType;
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

export type HazardType = 'fire' | 'cold' | 'lightning' | 'poison' | 'chaos';

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
  goldGained: number;
  xpGained: number;
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  bagDrops: Record<string, number>;
  bestItem: Item | null;
}

// --- Currencies ---

export type CurrencyType =
  | 'augment'
  | 'chaos'
  | 'divine'
  | 'annul'
  | 'exalt'
  | 'socket';

export interface CurrencyDef {
  id: CurrencyType;
  name: string;
  description: string;
  icon: string; // emoji for prototype
  rarity: 'common' | 'uncommon' | 'rare';
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

export type AbilityKind = 'active' | 'passive';
export type IdleMode = 'combat' | 'gathering';

export interface AbilityEffect {
  damageMult?: number;
  attackSpeedMult?: number;
  defenseMult?: number;
  clearSpeedMult?: number;
  critChanceBonus?: number;
  critDamageBonus?: number;
  xpMult?: number;
  itemDropMult?: number;
  materialDropMult?: number;
  resistBonus?: number;
  ignoreHazards?: boolean;
  doubleClears?: boolean;
}

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
  mutators: MutatorDef[];
}

export interface EquippedAbility {
  abilityId: string;
  selectedMutatorId: string | null;
}

export interface AbilityTimerState {
  abilityId: string;
  activatedAt: number | null;
  cooldownUntil: number | null;
}

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

  // Auto-salvage
  autoSalvageMinRarity: Rarity;
  craftAutoSalvageMinRarity: Rarity;

  // Offline progression
  offlineProgress: OfflineProgressSummary | null;

  // Abilities (Sprint 4)
  equippedAbilities: (EquippedAbility | null)[];
  abilityTimers: AbilityTimerState[];

  // Meta
  lastSaveTime: number;
}

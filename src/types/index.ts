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
export type ArmorType = 'plate' | 'mail' | 'leather' | 'cloth';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemBaseDef {
  id: string;
  name: string;
  slot: GearSlot;
  armorType?: ArmorType; // weapons don't have armor type
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
  baseStats: Partial<Record<StatKey, number>>;
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
  materialDrops: string[];
  hazards: ZoneHazard[];
  unlockRequirement?: string; // id of zone that must be accessible first
}

export interface IdleRunResult {
  items: Item[];
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  xpGained: number;
  goldGained: number;
  clearsCompleted: number;
  elapsed: number;
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

// --- Pending Loot (banked between zone changes) ---

export interface PendingLoot {
  items: Item[];
  currencyDrops: Record<CurrencyType, number>;
  materials: Record<string, number>;
  goldGained: number;
  clearsCompleted: number;
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

// --- Game State ---

export interface GameState {
  character: Character;
  inventory: Item[];
  currencies: Record<CurrencyType, number>;
  materials: Record<string, number>;
  gold: number;
  pendingLoot: PendingLoot;

  // Idle state
  currentZoneId: string | null;
  idleStartTime: number | null; // timestamp when idle run started

  // Auto-salvage
  autoSalvageMinRarity: Rarity;

  // Meta
  lastSaveTime: number;
}

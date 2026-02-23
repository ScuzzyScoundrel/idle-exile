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
  | 'fire_resist'
  | 'cold_resist'
  | 'lightning_resist';

export type AffixTier = 1 | 2 | 3; // T1 best, T3 worst (simplified for prototype)

export interface AffixDef {
  id: string;
  name: string;
  category: AffixCategory;
  slot: AffixSlot;
  tiers: Record<AffixTier, { min: number; max: number; iLvlReq: number }>;
  weight: number; // drop weight for rolling
  displayTemplate: string; // e.g. "+{value} Life" or "+{value}% Damage"
}

export interface Affix {
  defId: string;
  tier: AffixTier;
  value: number;
}

// --- Items ---

export type GearSlot = 'weapon' | 'chest' | 'boots' | 'ring';
export type ArmorType = 'plate' | 'mail' | 'leather' | 'cloth';
export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';

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
  | 'fireResist'
  | 'coldResist'
  | 'lightningResist';

export type ResolvedStats = Record<StatKey, number>;

export interface Character {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  equipment: Partial<Record<GearSlot, Item>>;
  stats: ResolvedStats;
}

// --- Zones ---

export type GatheringFocus = 'combat' | 'harvesting' | 'prospecting' | 'scavenging';

export interface ZoneDef {
  id: string;
  name: string;
  region: string;
  description: string;
  maxTier: number;
  baseClearTime: number; // seconds at power parity
  iLvlByTier: Record<number, number>; // tier -> item level
  materialDrops: string[];
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
  | 'transmute'
  | 'augment'
  | 'chaos'
  | 'alchemy'
  | 'divine'
  | 'annul'
  | 'exalt'
  | 'regal';

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

// --- Game State ---

export interface GameState {
  character: Character;
  inventory: Item[];
  currencies: Record<CurrencyType, number>;
  materials: Record<string, number>;
  gold: number;

  // Idle state
  currentZoneId: string | null;
  currentZoneTier: number;
  currentFocus: GatheringFocus;
  idleStartTime: number | null; // timestamp when idle run started

  // Meta
  lastSaveTime: number;
}

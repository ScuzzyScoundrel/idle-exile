// ============================================================
// Items — gear, affixes, bags, sets, profession gear
// ============================================================

import type { StatKey } from './stats';

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
  | 'es_recharge'
  | 'ailment_duration' | 'life_leech_percent' | 'life_on_hit'
  | 'life_on_kill' | 'cooldown_recovery' | 'fortify_effect'
  | 'damage_taken_reduction';

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
  armorTypeRestriction?: ArmorType; // only roll on this armor type (cloth/leather/plate)
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

// ============================================================
// Idle Exile — Affix Definitions (v16 overhaul)
// 33 affix types with slot restrictions, 330 total variations.
// ============================================================

import type { AffixDef, AffixTier, GearSlot, WeaponType, OffhandType, ArmorType } from '../types';
import { WEAPON_TYPE_META } from './weapons';

/**
 * Helper to build 10-tier value ranges by interpolation.
 * Anchors: T10 (worst), T8, T6, T4, T2, T1 (best).
 * Interpolate T9, T7, T5, T3 linearly between neighbors.
 */
function buildTiers(
  t10Min: number, t10Max: number,
  t8Min: number, t8Max: number,
  t6Min: number, t6Max: number,
  t4Min: number, t4Max: number,
  t2Min: number, t2Max: number,
  t1Min: number, t1Max: number,
): Record<AffixTier, { min: number; max: number }> {
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  return {
    10: { min: t10Min, max: t10Max },
    9:  { min: lerp(t10Min, t8Min, 0.5), max: lerp(t10Max, t8Max, 0.5) },
    8:  { min: t8Min, max: t8Max },
    7:  { min: lerp(t8Min, t6Min, 0.5), max: lerp(t8Max, t6Max, 0.5) },
    6:  { min: t6Min, max: t6Max },
    5:  { min: lerp(t6Min, t4Min, 0.5), max: lerp(t6Max, t4Max, 0.5) },
    4:  { min: t4Min, max: t4Max },
    3:  { min: lerp(t4Min, t2Min, 0.5), max: lerp(t4Max, t2Max, 0.5) },
    2:  { min: t2Min, max: t2Max },
    1:  { min: t1Min, max: t1Max },
  };
}

// ============================================================
// Slot restriction group tags:
//   attack_weapons — mainhand where scaling = 'attack' or 'hybrid'
//   spell_weapons  — mainhand where scaling = 'spell' or 'hybrid'
//   all_weapons    — any mainhand
//   main_armor     — helmet, chest, shoulders, cloak, pants, boots
//   gloves | belt | bracers | rings | amulets | trinkets
//   shields | focus | quiver
//   all_armor      — all armor + accessories
//   accessories    — rings, amulets, trinkets, belt, bracers, neck, cloak
// ============================================================

export const AFFIX_DEFS: AffixDef[] = [
  // ================================================================
  // PREFIXES — Flat Damage (Attack)
  // ================================================================
  {
    id: 'flat_phys_damage', name: 'Brutal', category: 'flat_phys_damage',
    slot: 'prefix', stat: 'flatPhysDamage',
    allowedSlots: ['attack_weapons', 'gloves', 'rings', 'amulets'],
    tiers: buildTiers(1, 3, 2, 5, 4, 8, 7, 14, 12, 20, 17, 25),
    weight: 100, displayTemplate: '+{value} Physical Damage',
  },
  {
    id: 'flat_atk_fire', name: 'Smoldering', category: 'flat_atk_fire_damage',
    slot: 'prefix', stat: 'flatAtkFireDamage',
    allowedSlots: ['attack_weapons', 'gloves', 'rings'],
    tiers: buildTiers(1, 2, 2, 4, 3, 6, 5, 10, 8, 15, 12, 20),
    weight: 80, displayTemplate: '+{value} Fire Attack Damage',
  },
  {
    id: 'flat_atk_cold', name: 'Frigid', category: 'flat_atk_cold_damage',
    slot: 'prefix', stat: 'flatAtkColdDamage',
    allowedSlots: ['attack_weapons', 'gloves', 'rings'],
    tiers: buildTiers(1, 2, 2, 4, 3, 6, 5, 10, 8, 15, 12, 20),
    weight: 80, displayTemplate: '+{value} Cold Attack Damage',
  },
  {
    id: 'flat_atk_lightning', name: 'Crackling', category: 'flat_atk_lightning_damage',
    slot: 'prefix', stat: 'flatAtkLightningDamage',
    allowedSlots: ['attack_weapons', 'gloves', 'rings'],
    tiers: buildTiers(1, 3, 2, 5, 3, 8, 6, 12, 9, 18, 14, 25),
    weight: 80, displayTemplate: '+{value} Lightning Attack Damage',
  },
  {
    id: 'flat_atk_chaos', name: 'Tainted', category: 'flat_atk_chaos_damage',
    slot: 'prefix', stat: 'flatAtkChaosDamage',
    allowedSlots: ['attack_weapons', 'rings', 'amulets'],
    tiers: buildTiers(1, 2, 1, 3, 2, 5, 4, 8, 6, 12, 10, 16),
    weight: 60, displayTemplate: '+{value} Chaos Attack Damage',
  },

  // ================================================================
  // PREFIXES — Flat Damage (Spell)
  // ================================================================
  {
    id: 'spell_power', name: 'Arcane', category: 'spell_power',
    slot: 'prefix', stat: 'spellPower',
    allowedSlots: ['spell_weapons', 'focus', 'gloves', 'amulets'],
    tiers: buildTiers(2, 5, 4, 8, 7, 14, 12, 22, 18, 32, 25, 40),
    weight: 100, displayTemplate: '+{value} Spell Power',
  },
  {
    id: 'flat_spell_fire', name: 'Blazing', category: 'flat_spell_fire_damage',
    slot: 'prefix', stat: 'flatSpellFireDamage',
    allowedSlots: ['spell_weapons', 'focus', 'rings'],
    tiers: buildTiers(1, 2, 2, 4, 3, 6, 5, 10, 8, 15, 12, 20),
    weight: 80, displayTemplate: '+{value} Fire Spell Damage',
  },
  {
    id: 'flat_spell_cold', name: 'Glacial', category: 'flat_spell_cold_damage',
    slot: 'prefix', stat: 'flatSpellColdDamage',
    allowedSlots: ['spell_weapons', 'focus', 'rings'],
    tiers: buildTiers(1, 2, 2, 4, 3, 6, 5, 10, 8, 15, 12, 20),
    weight: 80, displayTemplate: '+{value} Cold Spell Damage',
  },
  {
    id: 'flat_spell_lightning', name: 'Tempestuous', category: 'flat_spell_lightning_damage',
    slot: 'prefix', stat: 'flatSpellLightningDamage',
    allowedSlots: ['spell_weapons', 'focus', 'rings'],
    tiers: buildTiers(1, 3, 2, 5, 3, 8, 6, 12, 9, 18, 14, 25),
    weight: 80, displayTemplate: '+{value} Lightning Spell Damage',
  },
  {
    id: 'flat_spell_chaos', name: 'Abyssal', category: 'flat_spell_chaos_damage',
    slot: 'prefix', stat: 'flatSpellChaosDamage',
    allowedSlots: ['spell_weapons', 'focus', 'amulets'],
    tiers: buildTiers(1, 2, 1, 3, 2, 5, 4, 8, 6, 12, 10, 16),
    weight: 60, displayTemplate: '+{value} Chaos Spell Damage',
  },

  // ================================================================
  // PREFIXES — Percentage Damage
  // ================================================================
  {
    id: 'inc_phys_damage', name: 'Tyrannical', category: 'inc_phys_damage',
    slot: 'prefix', stat: 'incPhysDamage',
    allowedSlots: ['attack_weapons'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 100, displayTemplate: '+{value}% Physical Damage',
  },
  {
    id: 'inc_spell_damage_weapon', name: 'Enchanted', category: 'inc_spell_damage',
    slot: 'prefix', stat: 'incSpellDamage',
    allowedSlots: ['spell_weapons'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 100, displayTemplate: '+{value}% Spell Damage',
  },
  {
    id: 'inc_spell_damage_armor', name: 'Incanting', category: 'inc_spell_damage',
    slot: 'prefix', stat: 'incSpellDamage',
    allowedSlots: ['gloves', 'amulets', 'trinkets'],
    tiers: buildTiers(2, 3, 3, 5, 5, 8, 8, 14, 12, 20, 18, 28),
    weight: 80, displayTemplate: '+{value}% Spell Damage',
  },
  {
    id: 'inc_attack_damage', name: 'Vicious', category: 'inc_attack_damage',
    slot: 'prefix', stat: 'incAttackDamage',
    allowedSlots: ['attack_weapons', 'gloves', 'amulets'],
    tiers: buildTiers(2, 3, 3, 5, 5, 8, 8, 14, 12, 20, 18, 28),
    weight: 80, displayTemplate: '+{value}% Attack Damage',
  },
  {
    id: 'inc_elemental_damage', name: 'Ruinous', category: 'inc_elemental_damage',
    slot: 'prefix', stat: 'incElementalDamage',
    allowedSlots: ['all_weapons', 'amulets', 'belt'],
    tiers: buildTiers(2, 3, 3, 5, 5, 8, 8, 12, 12, 18, 16, 25),
    weight: 70, displayTemplate: '+{value}% Elemental Damage',
  },
  {
    id: 'inc_fire_damage', name: 'Scorching', category: 'inc_fire_damage',
    slot: 'prefix', stat: 'incFireDamage',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 60, displayTemplate: '+{value}% Fire Damage',
  },
  {
    id: 'inc_cold_damage', name: 'Frozen', category: 'inc_cold_damage',
    slot: 'prefix', stat: 'incColdDamage',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 60, displayTemplate: '+{value}% Cold Damage',
  },
  {
    id: 'inc_lightning_damage', name: 'Thundering', category: 'inc_lightning_damage',
    slot: 'prefix', stat: 'incLightningDamage',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 60, displayTemplate: '+{value}% Lightning Damage',
  },
  {
    id: 'inc_chaos_damage', name: 'Corrupting', category: 'inc_chaos_damage',
    slot: 'prefix', stat: 'incChaosDamage',
    allowedSlots: ['all_weapons', 'rings'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 50, displayTemplate: '+{value}% Chaos Damage',
  },

  // ================================================================
  // PREFIXES — Delivery Tag Damage
  // ================================================================
  {
    id: 'inc_melee_damage', name: 'Savage', category: 'inc_melee_damage',
    slot: 'prefix', stat: 'incMeleeDamage',
    allowedSlots: ['attack_weapons', 'gloves', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 60, displayTemplate: '+{value}% Melee Damage',
  },
  {
    id: 'inc_projectile_damage', name: 'Keen', category: 'inc_projectile_damage',
    slot: 'prefix', stat: 'incProjectileDamage',
    allowedSlots: ['all_weapons', 'gloves', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 60, displayTemplate: '+{value}% Projectile Damage',
  },
  {
    id: 'inc_aoe_damage', name: 'Cataclysmic', category: 'inc_aoe_damage',
    slot: 'prefix', stat: 'incAoEDamage',
    allowedSlots: ['all_weapons', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 50, displayTemplate: '+{value}% AoE Damage',
  },
  {
    id: 'inc_dot_damage', name: 'Venomous', category: 'inc_dot_damage',
    slot: 'prefix', stat: 'incDoTDamage',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 50, displayTemplate: '+{value}% DoT Damage',
  },
  {
    id: 'inc_channel_damage', name: 'Focused', category: 'inc_channel_damage',
    slot: 'prefix', stat: 'incChannelDamage',
    allowedSlots: ['spell_weapons', 'amulets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 14, 14, 22, 20, 30, 28, 40),
    weight: 40, displayTemplate: '+{value}% Channel Damage',
  },

  // ================================================================
  // PREFIXES — Speed & Accuracy
  // ================================================================
  {
    id: 'attack_speed', name: 'Ferocious', category: 'attack_speed',
    slot: 'prefix', stat: 'attackSpeed',
    allowedSlots: ['attack_weapons', 'gloves'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 13, 13, 20),
    weight: 100, displayTemplate: '+{value}% Attack Speed',
  },
  {
    id: 'cast_speed', name: 'Hasty', category: 'cast_speed',
    slot: 'prefix', stat: 'castSpeed',
    allowedSlots: ['spell_weapons', 'gloves', 'focus'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 13, 13, 20),
    weight: 100, displayTemplate: '+{value}% Cast Speed',
  },
  {
    id: 'accuracy', name: 'Precise', category: 'accuracy',
    slot: 'prefix', stat: 'accuracy',
    allowedSlots: ['attack_weapons', 'gloves', 'rings', 'amulets'],
    tiers: buildTiers(5, 10, 10, 20, 20, 35, 35, 55, 55, 80, 80, 120),
    weight: 80, displayTemplate: '+{value} Accuracy',
  },

  // ================================================================
  // PREFIXES — Defensive
  // ================================================================
  {
    id: 'flat_max_life', name: 'Titanic', category: 'flat_max_life',
    slot: 'prefix', stat: 'maxLife',
    allowedSlots: ['main_armor', 'shields', 'belt', 'bracers', 'amulets', 'rings'],
    tiers: buildTiers(3, 8, 6, 14, 12, 25, 22, 40, 35, 60, 51, 80),
    weight: 100, displayTemplate: '+{value} Max Life',
  },
  {
    id: 'inc_max_life', name: 'Robust', category: 'inc_max_life',
    slot: 'prefix', stat: 'incMaxLife',
    allowedSlots: ['chest', 'belt', 'amulets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 14, 13, 20),
    weight: 80, displayTemplate: '+{value}% Max Life',
  },
  {
    id: 'life_regen', name: 'Regenerating', category: 'life_regen',
    slot: 'prefix', stat: 'lifeRegen',
    allowedSlots: ['main_armor', 'belt', 'rings'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 70, displayTemplate: '+{value} Life Regen',
  },
  {
    id: 'flat_armor', name: 'Fortified', category: 'flat_armor',
    slot: 'prefix', stat: 'armor',
    allowedSlots: ['main_armor', 'shields', 'belt', 'bracers'],
    tiers: buildTiers(2, 6, 5, 12, 10, 22, 18, 35, 30, 52, 41, 65),
    weight: 100, displayTemplate: '+{value} Armor',
    armorTypeRestriction: 'plate',
  },
  {
    id: 'flat_evasion', name: 'Nimble', category: 'flat_evasion',
    slot: 'prefix', stat: 'evasion',
    allowedSlots: ['main_armor', 'shields', 'belt', 'bracers'],
    tiers: buildTiers(5, 15, 12, 25, 22, 45, 38, 70, 58, 100, 80, 140),
    weight: 80, displayTemplate: '+{value} Evasion',
    armorTypeRestriction: 'leather',
  },

  // ================================================================
  // PREFIXES — Plate & Leather Exclusive
  // ================================================================
  // Plate-exclusive: % increased armor
  {
    id: 'inc_armor', name: 'Ironclad', category: 'inc_armor',
    slot: 'suffix', stat: 'incArmor',
    allowedSlots: ['chest', 'main_armor', 'belt'],
    tiers: buildTiers(1, 2, 2, 4, 4, 7, 6, 10, 10, 16, 15, 25),
    weight: 70, displayTemplate: '+{value}% Armor',
    armorTypeRestriction: 'plate',
  },
  // Plate-exclusive: flat damage reduction
  {
    id: 'plate_dr', name: 'Indomitable', category: 'plate_dr',
    slot: 'suffix', stat: 'damageTakenReduction',
    allowedSlots: ['chest', 'main_armor', 'shields'],
    tiers: buildTiers(0.2, 0.4, 0.3, 0.6, 0.5, 0.9, 0.7, 1.2, 1.0, 1.8, 1.5, 2.5),
    weight: 50, displayTemplate: '-{value}% Damage Taken',
    armorTypeRestriction: 'plate',
  },
  // Leather-exclusive: % increased evasion
  {
    id: 'inc_evasion', name: 'Flickering', category: 'inc_evasion',
    slot: 'suffix', stat: 'incEvasion',
    allowedSlots: ['chest', 'main_armor', 'belt'],
    tiers: buildTiers(1, 2, 2, 4, 4, 7, 6, 10, 10, 16, 15, 25),
    weight: 70, displayTemplate: '+{value}% Evasion',
    armorTypeRestriction: 'leather',
  },
  // Leather-exclusive: movement speed bonus
  {
    id: 'leather_speed', name: 'Windrunner', category: 'leather_speed',
    slot: 'suffix', stat: 'movementSpeed',
    allowedSlots: ['boots', 'chest', 'pants'],
    tiers: buildTiers(1, 1, 1, 2, 2, 3, 2, 4, 3, 6, 5, 8),
    weight: 50, displayTemplate: '+{value}% Movement Speed',
    armorTypeRestriction: 'leather',
  },

  // ================================================================
  // SUFFIXES — Critical
  // ================================================================
  {
    id: 'crit_chance', name: 'of the Hawk', category: 'crit_chance',
    slot: 'suffix', stat: 'critChance',
    allowedSlots: ['all_weapons', 'gloves', 'rings', 'amulets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 14, 13, 20),
    weight: 100, displayTemplate: '+{value}% Crit Chance',
  },
  {
    id: 'crit_multiplier', name: 'of Devastation', category: 'crit_multiplier',
    slot: 'suffix', stat: 'critMultiplier',
    allowedSlots: ['all_weapons', 'gloves', 'amulets', 'trinkets'],
    tiers: buildTiers(2, 5, 5, 10, 8, 16, 14, 25, 22, 38, 31, 50),
    weight: 100, displayTemplate: '+{value}% Crit Multiplier',
  },

  // ================================================================
  // SUFFIXES — Resistances
  // ================================================================
  {
    id: 'fire_resist', name: 'of the Dragon', category: 'fire_resist',
    slot: 'suffix', stat: 'fireResist',
    allowedSlots: ['all_armor', 'shields'],
    tiers: buildTiers(2, 5, 4, 8, 8, 14, 14, 22, 20, 32, 26, 40),
    weight: 100, displayTemplate: '+{value}% Fire Resist',
  },
  {
    id: 'cold_resist', name: 'of the Yeti', category: 'cold_resist',
    slot: 'suffix', stat: 'coldResist',
    allowedSlots: ['all_armor', 'shields'],
    tiers: buildTiers(2, 5, 4, 8, 8, 14, 14, 22, 20, 32, 26, 40),
    weight: 100, displayTemplate: '+{value}% Cold Resist',
  },
  {
    id: 'lightning_resist', name: 'of the Tempest', category: 'lightning_resist',
    slot: 'suffix', stat: 'lightningResist',
    allowedSlots: ['all_armor', 'shields'],
    tiers: buildTiers(2, 5, 4, 8, 8, 14, 14, 22, 20, 32, 26, 40),
    weight: 100, displayTemplate: '+{value}% Lightning Resist',
  },
  {
    id: 'chaos_resist', name: 'of the Abyss', category: 'chaos_resist',
    slot: 'suffix', stat: 'chaosResist',
    allowedSlots: ['all_armor', 'shields'],
    tiers: buildTiers(2, 4, 3, 6, 6, 12, 10, 18, 16, 28, 23, 35),
    weight: 60, displayTemplate: '+{value}% Chaos Resist',
  },

  // ================================================================
  // SUFFIXES — Utility
  // ================================================================
  {
    id: 'movement_speed', name: 'of Speed', category: 'movement_speed',
    slot: 'suffix', stat: 'movementSpeed',
    allowedSlots: ['boots'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 14, 13, 20),
    weight: 100, displayTemplate: '+{value}% Movement Speed',
  },
  {
    id: 'ability_haste', name: 'of Celerity', category: 'ability_haste',
    slot: 'suffix', stat: 'abilityHaste',
    allowedSlots: ['all_weapons', 'gloves', 'amulets', 'trinkets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 6, 5, 9, 8, 14, 13, 20),
    weight: 80, displayTemplate: '+{value}% Ability Haste',
  },
  {
    id: 'item_quantity', name: 'of Plunder', category: 'item_quantity',
    slot: 'suffix', stat: 'itemQuantity',
    allowedSlots: ['amulets', 'rings', 'trinkets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 50, displayTemplate: '+{value}% Item Quantity',
  },
  {
    id: 'item_rarity', name: 'of Fortune', category: 'item_rarity',
    slot: 'suffix', stat: 'itemRarity',
    allowedSlots: ['amulets', 'rings', 'trinkets'],
    tiers: buildTiers(2, 4, 4, 8, 8, 14, 14, 22, 22, 34, 30, 45),
    weight: 50, displayTemplate: '+{value}% Item Rarity',
  },
  {
    id: 'block_chance', name: 'of the Bulwark', category: 'block_chance',
    slot: 'suffix', stat: 'blockChance',
    allowedSlots: ['shields'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 100, displayTemplate: '+{value}% Block Chance',
  },

  // ================================================================
  // SUFFIXES — Energy Shield
  // ================================================================
  {
    id: 'flat_energy_shield', name: 'of the Barrier', category: 'flat_energy_shield',
    slot: 'suffix', stat: 'energyShield',
    allowedSlots: ['main_armor', 'shields', 'belt'],
    tiers: buildTiers(5, 10, 10, 18, 18, 30, 28, 48, 44, 72, 80, 140),
    weight: 70, displayTemplate: '+{value} Energy Shield',
    armorTypeRestriction: 'cloth',
  },
  {
    id: 'inc_energy_shield', name: 'of Warding', category: 'inc_energy_shield',
    slot: 'suffix', stat: 'incEnergyShield',
    allowedSlots: ['chest', 'main_armor', 'belt'],
    tiers: buildTiers(1, 2, 2, 4, 4, 7, 6, 10, 10, 16, 15, 25),
    weight: 60, displayTemplate: '+{value}% Energy Shield',
    armorTypeRestriction: 'cloth',
  },
  {
    id: 'es_recharge', name: 'of Renewal', category: 'es_recharge',
    slot: 'suffix', stat: 'esRecharge',
    allowedSlots: ['chest', 'main_armor'],
    tiers: buildTiers(1, 1, 1, 2, 2, 3, 2, 4, 3, 5, 4, 8),
    weight: 50, displayTemplate: '+{value} ES Recharge/s',
    armorTypeRestriction: 'cloth',
  },

  // ================================================================
  // SUFFIXES — Sustain & Build Depth (v49)
  // ================================================================
  {
    id: 'ailment_duration', name: 'of Lingering', category: 'ailment_duration',
    slot: 'suffix', stat: 'ailmentDuration',
    allowedSlots: ['all_weapons', 'rings', 'amulets', 'trinkets'],
    tiers: buildTiers(3, 5, 5, 8, 8, 12, 12, 18, 16, 25, 20, 35),
    weight: 60, displayTemplate: '+{value}% Ailment Duration',
  },
  {
    id: 'life_leech_percent', name: 'Vampiric', category: 'life_leech_percent',
    slot: 'prefix', stat: 'lifeLeechPercent',
    allowedSlots: ['attack_weapons', 'spell_weapons', 'gloves', 'rings', 'amulets'],
    tiers: buildTiers(0.2, 0.4, 0.4, 0.6, 0.5, 0.8, 0.8, 1.2, 1.2, 1.8, 1.5, 2.5),
    weight: 50, displayTemplate: '+{value}% Life Leech',
  },
  {
    id: 'life_on_hit', name: 'of Siphoning', category: 'life_on_hit',
    slot: 'suffix', stat: 'lifeOnHit',
    allowedSlots: ['all_weapons', 'gloves', 'rings'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 4, 7, 6, 10, 8, 15),
    weight: 60, displayTemplate: '+{value} Life on Hit',
  },
  {
    id: 'life_on_kill', name: 'of Slaughter', category: 'life_on_kill',
    slot: 'suffix', stat: 'lifeOnKill',
    allowedSlots: ['all_weapons', 'amulets', 'rings'],
    tiers: buildTiers(2, 3, 3, 5, 4, 7, 6, 10, 8, 15, 12, 22),
    weight: 60, displayTemplate: '+{value} Life on Kill',
  },
  {
    id: 'cooldown_recovery', name: 'of Alacrity', category: 'cooldown_recovery',
    slot: 'suffix', stat: 'cooldownRecovery',
    allowedSlots: ['all_weapons', 'amulets', 'trinkets', 'belt'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 4, 7, 6, 10, 8, 15),
    weight: 50, displayTemplate: '+{value}% Cooldown Recovery',
  },
  {
    id: 'fortify_effect', name: 'of Steadfastness', category: 'fortify_effect',
    slot: 'suffix', stat: 'fortifyEffect',
    allowedSlots: ['shields', 'chest', 'belt'],
    tiers: buildTiers(2, 4, 4, 7, 6, 10, 8, 14, 12, 20, 15, 30),
    weight: 50, displayTemplate: '+{value}% Fortify Effect',
  },
  {
    id: 'damage_taken_reduction', name: 'of the Sentinel', category: 'damage_taken_reduction',
    slot: 'suffix', stat: 'damageTakenReduction',
    allowedSlots: ['shields', 'chest', 'amulets'],
    tiers: buildTiers(0.3, 0.5, 0.5, 0.8, 0.7, 1.0, 1.0, 1.5, 1.5, 2.5, 2.0, 4.0),
    weight: 30, displayTemplate: '+{value}% Damage Taken Reduction',
  },

  // ================================================================
  // SUFFIXES — Weapon Scaling (v51)
  // ================================================================
  {
    id: 'inc_attack_speed', name: 'of Velocity', category: 'inc_attack_speed',
    slot: 'suffix', stat: 'incAttackSpeed',
    allowedSlots: ['attack_weapons', 'gloves', 'rings'],
    tiers: buildTiers(1, 2, 2, 4, 4, 7, 6, 10, 10, 16, 15, 25),
    weight: 70, displayTemplate: '+{value}% Increased Attack Speed',
  },
  {
    id: 'inc_crit_chance', name: 'of Precision', category: 'inc_crit_chance',
    slot: 'suffix', stat: 'incCritChance',
    allowedSlots: ['all_weapons', 'gloves', 'rings', 'amulets'],
    tiers: buildTiers(1, 2, 2, 4, 4, 7, 6, 10, 10, 16, 15, 25),
    weight: 70, displayTemplate: '+{value}% Increased Crit Chance',
  },
  // ================================================================
  // SUFFIXES/PREFIXES — Multiplicative Offense (v52)
  // ================================================================
  {
    id: 'fire_penetration', name: 'of Ignition', category: 'fire_penetration',
    slot: 'suffix', stat: 'firePenetration',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 40, displayTemplate: '+{value}% Fire Penetration',
  },
  {
    id: 'cold_penetration', name: 'of Frostbite', category: 'cold_penetration',
    slot: 'suffix', stat: 'coldPenetration',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 40, displayTemplate: '+{value}% Cold Penetration',
  },
  {
    id: 'lightning_penetration', name: 'of Conductivity', category: 'lightning_penetration',
    slot: 'suffix', stat: 'lightningPenetration',
    allowedSlots: ['all_weapons', 'rings', 'amulets'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 40, displayTemplate: '+{value}% Lightning Penetration',
  },
  {
    id: 'chaos_penetration', name: 'of the Void', category: 'chaos_penetration',
    slot: 'suffix', stat: 'chaosPenetration',
    allowedSlots: ['all_weapons', 'rings'],
    tiers: buildTiers(1, 1, 1, 2, 2, 4, 4, 7, 7, 10, 10, 15),
    weight: 30, displayTemplate: '+{value}% Chaos Penetration',
  },
  {
    id: 'dot_multiplier', name: 'Malignant', category: 'dot_multiplier',
    slot: 'prefix', stat: 'dotMultiplier',
    allowedSlots: ['all_weapons', 'amulets', 'gloves'],
    tiers: buildTiers(2, 4, 4, 7, 6, 10, 10, 16, 15, 22, 22, 35),
    weight: 50, displayTemplate: '+{value}% DoT Multiplier',
  },
  {
    id: 'weapon_mastery', name: 'of Mastery', category: 'weapon_mastery',
    slot: 'suffix', stat: 'weaponMastery',
    allowedSlots: ['all_weapons'],
    tiers: buildTiers(1, 2, 2, 3, 3, 5, 5, 8, 8, 12, 12, 18),
    weight: 40, displayTemplate: '+{value}% Weapon Mastery',
  },
];

// ============================================================
// Slot restriction engine
// ============================================================

/** Slot group tags → which GearSlots they match. */
const SLOT_GROUP_MAP: Record<string, GearSlot[]> = {
  main_armor: ['helmet', 'chest', 'shoulders', 'cloak', 'pants', 'boots'],
  gloves: ['gloves'],
  belt: ['belt'],
  bracers: ['bracers'],
  rings: ['ring1', 'ring2'],
  amulets: ['neck'],
  trinkets: ['trinket1', 'trinket2'],
  shields: ['offhand'], // further filtered by offhandType
  focus: ['offhand'],   // further filtered by offhandType
  quiver: ['offhand'],  // further filtered by offhandType
  chest: ['chest'],
  boots: ['boots'],
  all_armor: [
    'helmet', 'chest', 'shoulders', 'cloak', 'pants', 'boots',
    'gloves', 'belt', 'bracers', 'ring1', 'ring2', 'neck',
    'trinket1', 'trinket2',
  ],
  accessories: ['ring1', 'ring2', 'neck', 'trinket1', 'trinket2', 'belt', 'bracers', 'cloak'],
  // Weapon groups are handled specially below
  attack_weapons: ['mainhand'],
  spell_weapons: ['mainhand'],
  all_weapons: ['mainhand'],
};

/**
 * Filter AFFIX_DEFS to affixes valid for a given gear context.
 *
 * @param gearSlot - The slot being rolled for
 * @param weaponType - If mainhand, the weapon type
 * @param offhandType - If offhand, the offhand type (shield/focus/quiver)
 * @param affixSlot - 'prefix' or 'suffix' filter (optional)
 */
export function getAffixesForSlot(
  gearSlot: GearSlot,
  weaponType?: WeaponType,
  offhandType?: OffhandType,
  affixSlot?: 'prefix' | 'suffix',
  armorType?: ArmorType,
): AffixDef[] {
  return AFFIX_DEFS.filter(def => {
    // Filter by prefix/suffix if requested
    if (affixSlot && def.slot !== affixSlot) return false;

    // Armor type restriction (cloth-only ES, etc.)
    // Only applies when the item HAS an armorType — shields/belts/accessories pass through
    if (def.armorTypeRestriction && armorType && def.armorTypeRestriction !== armorType) return false;

    // Check if any of the affix's allowed slot groups match this gear slot
    return def.allowedSlots.some(group => {
      // Weapon scaling groups — only match mainhand with correct scaling
      if (group === 'attack_weapons') {
        if (gearSlot !== 'mainhand' || !weaponType) return false;
        const meta = WEAPON_TYPE_META[weaponType];
        return meta.scaling === 'attack' || meta.scaling === 'hybrid';
      }
      if (group === 'spell_weapons') {
        if (gearSlot !== 'mainhand' || !weaponType) return false;
        const meta = WEAPON_TYPE_META[weaponType];
        return meta.scaling === 'spell' || meta.scaling === 'hybrid';
      }
      if (group === 'all_weapons') {
        return gearSlot === 'mainhand';
      }

      // Offhand type groups
      if (group === 'shields') {
        return gearSlot === 'offhand' && offhandType === 'shield';
      }
      if (group === 'focus') {
        return gearSlot === 'offhand' && offhandType === 'focus';
      }
      if (group === 'quiver') {
        return gearSlot === 'offhand' && offhandType === 'quiver';
      }

      // Standard slot groups
      const slots = SLOT_GROUP_MAP[group];
      if (!slots) return false;
      return slots.includes(gearSlot);
    });
  });
}

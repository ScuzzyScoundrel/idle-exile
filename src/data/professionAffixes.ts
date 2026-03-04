// ============================================================
// Idle Exile — Profession Gear Affix Definitions
// 10 affixes: 5 gathering-focused prefixes, 5 crafting-focused suffixes.
// Uses the same AffixDef shape as combat affixes.
// ============================================================

import type { AffixDef, AffixTier } from '../types';

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

export const PROFESSION_AFFIX_DEFS: AffixDef[] = [
  // ================================================================
  // PREFIXES — Gathering + Crafting Speed
  // ================================================================
  {
    id: 'prof_gather_speed', name: 'Swift', category: 'attack_speed',
    slot: 'prefix', stat: 'attackSpeed',
    allowedSlots: ['profession'],
    tiers: buildTiers(3, 5, 5, 8, 4, 6, 6, 9, 10, 16, 15, 22),
    weight: 100, displayTemplate: '+{value}% Gathering Speed',
  },
  {
    id: 'prof_gather_yield', name: 'Bountiful', category: 'flat_phys_damage',
    slot: 'prefix', stat: 'flatPhysDamage',
    allowedSlots: ['profession'],
    tiers: buildTiers(4, 6, 6, 10, 5, 8, 8, 13, 13, 21, 18, 28),
    weight: 100, displayTemplate: '+{value}% Gathering Yield',
  },
  {
    id: 'prof_instant_gather', name: 'Hasty', category: 'crit_chance',
    slot: 'prefix', stat: 'critChance',
    allowedSlots: ['profession'],
    tiers: buildTiers(1, 3, 3, 5, 2, 3, 3, 5, 5, 10, 8, 14),
    weight: 70, displayTemplate: '+{value}% Instant Gather Chance',
  },
  {
    id: 'prof_craft_speed', name: 'Industrious', category: 'cast_speed',
    slot: 'prefix', stat: 'castSpeed',
    allowedSlots: ['profession'],
    tiers: buildTiers(3, 5, 5, 8, 3, 5, 5, 8, 8, 14, 12, 20),
    weight: 90, displayTemplate: '+{value}% Crafting Speed',
  },
  {
    id: 'prof_rare_find', name: "Prospector's", category: 'inc_phys_damage',
    slot: 'prefix', stat: 'incPhysDamage',
    allowedSlots: ['profession'],
    tiers: buildTiers(2, 4, 4, 7, 3, 5, 4, 7, 7, 13, 10, 18),
    weight: 80, displayTemplate: '+{value}% Rare Material Find',
  },

  // ================================================================
  // SUFFIXES — Crafting Bonuses
  // ================================================================
  {
    id: 'prof_material_save', name: 'of Thrift', category: 'flat_armor',
    slot: 'suffix', stat: 'armor',
    allowedSlots: ['profession'],
    tiers: buildTiers(2, 3, 3, 5, 1, 2, 2, 4, 4, 7, 6, 10),
    weight: 80, displayTemplate: '+{value}% Material Preservation',
  },
  {
    id: 'prof_craft_xp', name: 'of Mastery', category: 'flat_max_life',
    slot: 'suffix', stat: 'maxLife',
    allowedSlots: ['profession'],
    tiers: buildTiers(3, 5, 5, 8, 3, 5, 5, 8, 8, 14, 12, 20),
    weight: 100, displayTemplate: '+{value}% Crafting XP Bonus',
  },
  {
    id: 'prof_bonus_ilvl', name: 'of Precision', category: 'flat_evasion',
    slot: 'suffix', stat: 'evasion',
    allowedSlots: ['profession'],
    tiers: buildTiers(0, 1, 0, 1, 0, 1, 1, 1, 1, 2, 2, 3),
    weight: 60, displayTemplate: '+{value} Bonus iLvl on Crafted Gear',
  },
  {
    id: 'prof_critical_craft', name: 'of Bounty', category: 'crit_multiplier',
    slot: 'suffix', stat: 'critMultiplier',
    allowedSlots: ['profession'],
    tiers: buildTiers(1, 3, 2, 4, 1, 2, 2, 3, 3, 6, 5, 8),
    weight: 70, displayTemplate: '+{value}% Double Craft Output',
  },
  {
    id: 'prof_gold_efficiency', name: 'of Economy', category: 'movement_speed',
    slot: 'suffix', stat: 'movementSpeed',
    allowedSlots: ['profession'],
    tiers: buildTiers(4, 6, 6, 10, 4, 7, 6, 10, 10, 18, 15, 25),
    weight: 90, displayTemplate: '-{value}% Crafting Gold Cost',
  },
];

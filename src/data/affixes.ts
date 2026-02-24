import type { AffixDef, AffixTier } from '../types';

/**
 * Helper to build 10-tier value ranges by interpolation.
 * Anchors: T10 (worst) → T1 (best).
 * T10=lowMin, T7~oldT3, T4~oldT2, T1~oldT1.
 */
function buildTiers(
  t10Min: number, t10Max: number,
  t7Min: number, t7Max: number,
  t4Min: number, t4Max: number,
  t1Min: number, t1Max: number,
): Record<AffixTier, { min: number; max: number }> {
  // Interpolate linearly between anchor points
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  return {
    10: { min: t10Min, max: t10Max },
    9:  { min: lerp(t10Min, t7Min, 0.33), max: lerp(t10Max, t7Max, 0.33) },
    8:  { min: lerp(t10Min, t7Min, 0.67), max: lerp(t10Max, t7Max, 0.67) },
    7:  { min: t7Min, max: t7Max },
    6:  { min: lerp(t7Min, t4Min, 0.33), max: lerp(t7Max, t4Max, 0.33) },
    5:  { min: lerp(t7Min, t4Min, 0.67), max: lerp(t7Max, t4Max, 0.67) },
    4:  { min: t4Min, max: t4Max },
    3:  { min: lerp(t4Min, t1Min, 0.33), max: lerp(t4Max, t1Max, 0.33) },
    2:  { min: lerp(t4Min, t1Min, 0.67), max: lerp(t4Max, t1Max, 0.67) },
    1:  { min: t1Min, max: t1Max },
  };
}

export const AFFIX_DEFS: AffixDef[] = [
  // ==================== Prefixes ====================
  {
    id: 'flat_damage',
    name: 'Sharpened',
    category: 'flat_damage',
    slot: 'prefix',
    // T10: 1-3, T7: 3-8, T4: 9-16, T1: 17-25
    tiers: buildTiers(1, 3, 3, 8, 9, 16, 17, 25),
    weight: 100,
    displayTemplate: '+{value} Damage',
  },
  {
    id: 'percent_damage',
    name: 'Devastating',
    category: 'percent_damage',
    slot: 'prefix',
    // T10: 1-3, T7: 5-10, T4: 11-20, T1: 21-35
    tiers: buildTiers(1, 3, 5, 10, 11, 20, 21, 35),
    weight: 100,
    displayTemplate: '+{value}% Damage',
  },
  {
    id: 'attack_speed',
    name: 'Rapid',
    category: 'attack_speed',
    slot: 'prefix',
    // T10: 1-2, T7: 3-6, T4: 7-12, T1: 13-20
    tiers: buildTiers(1, 2, 3, 6, 7, 12, 13, 20),
    weight: 100,
    displayTemplate: '+{value}% Attack Speed',
  },
  {
    id: 'flat_life',
    name: 'Stout',
    category: 'flat_life',
    slot: 'prefix',
    // T10: 3-8, T7: 10-25, T4: 26-50, T1: 51-80
    tiers: buildTiers(3, 8, 10, 25, 26, 50, 51, 80),
    weight: 100,
    displayTemplate: '+{value} Life',
  },
  {
    id: 'percent_life',
    name: 'Virile',
    category: 'percent_life',
    slot: 'prefix',
    // T10: 1-2, T7: 3-6, T4: 7-12, T1: 13-20
    tiers: buildTiers(1, 2, 3, 6, 7, 12, 13, 20),
    weight: 100,
    displayTemplate: '+{value}% Life',
  },
  {
    id: 'flat_armor',
    name: 'Armored',
    category: 'flat_armor',
    slot: 'prefix',
    // T10: 2-6, T7: 8-20, T4: 21-40, T1: 41-65
    tiers: buildTiers(2, 6, 8, 20, 21, 40, 41, 65),
    weight: 100,
    displayTemplate: '+{value} Armor',
  },
  {
    id: 'ability_haste',
    name: 'Hastened',
    category: 'ability_haste',
    slot: 'prefix',
    // T10: 1-2, T7: 3-6, T4: 7-12, T1: 13-20
    tiers: buildTiers(1, 2, 3, 6, 7, 12, 13, 20),
    weight: 100,
    displayTemplate: '+{value}% Ability Haste',
  },

  // ==================== Suffixes ====================
  {
    id: 'crit_chance',
    name: 'of Precision',
    category: 'crit_chance',
    slot: 'suffix',
    // T10: 1-2, T7: 3-6, T4: 7-12, T1: 13-20
    tiers: buildTiers(1, 2, 3, 6, 7, 12, 13, 20),
    weight: 100,
    displayTemplate: '+{value}% Crit Chance',
  },
  {
    id: 'crit_damage',
    name: 'of Destruction',
    category: 'crit_damage',
    slot: 'suffix',
    // T10: 2-5, T7: 8-15, T4: 16-30, T1: 31-50
    tiers: buildTiers(2, 5, 8, 15, 16, 30, 31, 50),
    weight: 100,
    displayTemplate: '+{value}% Crit Damage',
  },
  {
    id: 'dodge_chance',
    name: 'of Evasion',
    category: 'dodge_chance',
    slot: 'suffix',
    // T10: 1-2, T7: 2-5, T4: 6-10, T1: 11-18
    tiers: buildTiers(1, 2, 2, 5, 6, 10, 11, 18),
    weight: 100,
    displayTemplate: '+{value}% Dodge',
  },
  {
    id: 'fire_resist',
    name: 'of the Flame',
    category: 'fire_resist',
    slot: 'suffix',
    // T10: 2-5, T7: 8-15, T4: 16-25, T1: 26-40
    tiers: buildTiers(2, 5, 8, 15, 16, 25, 26, 40),
    weight: 100,
    displayTemplate: '+{value}% Fire Resist',
  },
  {
    id: 'cold_resist',
    name: 'of the Glacier',
    category: 'cold_resist',
    slot: 'suffix',
    // T10: 2-5, T7: 8-15, T4: 16-25, T1: 26-40
    tiers: buildTiers(2, 5, 8, 15, 16, 25, 26, 40),
    weight: 100,
    displayTemplate: '+{value}% Cold Resist',
  },
  {
    id: 'lightning_resist',
    name: 'of the Storm',
    category: 'lightning_resist',
    slot: 'suffix',
    // T10: 2-5, T7: 8-15, T4: 16-25, T1: 26-40
    tiers: buildTiers(2, 5, 8, 15, 16, 25, 26, 40),
    weight: 100,
    displayTemplate: '+{value}% Lightning Resist',
  },
  {
    id: 'poison_resist',
    name: 'of the Viper',
    category: 'poison_resist',
    slot: 'suffix',
    // T10: 2-5, T7: 8-15, T4: 16-25, T1: 26-40
    tiers: buildTiers(2, 5, 8, 15, 16, 25, 26, 40),
    weight: 80,
    displayTemplate: '+{value}% Poison Resist',
  },
  {
    id: 'chaos_resist',
    name: 'of the Void',
    category: 'chaos_resist',
    slot: 'suffix',
    // T10: 2-4, T7: 6-12, T4: 13-22, T1: 23-35
    tiers: buildTiers(2, 4, 6, 12, 13, 22, 23, 35),
    weight: 60,
    displayTemplate: '+{value}% Chaos Resist',
  },
];

// ============================================================
// Idle Exile — Gathering Gear Affix Definitions
// Separate affix pool for gathering-specific equipment.
// Uses the same AffixDef shape as combat affixes.
// ============================================================

import type { AffixDef, AffixTier } from '../types';

/**
 * Helper to build 10-tier value ranges by interpolation.
 */
function buildTiers(
  t10Min: number, t10Max: number,
  t7Min: number, t7Max: number,
  t4Min: number, t4Max: number,
  t1Min: number, t1Max: number,
): Record<AffixTier, { min: number; max: number }> {
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

export const GATHERING_AFFIX_DEFS: AffixDef[] = [
  // ==================== Prefixes ====================
  {
    id: 'gather_speed',
    name: 'Swift',
    category: 'attack_speed', // reuse stat category for speed
    slot: 'prefix',
    tiers: buildTiers(1, 2, 3, 6, 7, 12, 13, 20),
    weight: 100,
    displayTemplate: '+{value}% Gather Speed',
  },
  {
    id: 'yield_bonus',
    name: 'Bountiful',
    category: 'flat_damage', // repurpose for gathering yield
    slot: 'prefix',
    tiers: buildTiers(1, 3, 4, 8, 9, 15, 16, 25),
    weight: 100,
    displayTemplate: '+{value}% Yield Bonus',
  },
  {
    id: 'double_gather',
    name: 'Plentiful',
    category: 'crit_chance', // repurpose for double chance
    slot: 'prefix',
    tiers: buildTiers(1, 2, 2, 4, 5, 8, 9, 15),
    weight: 80,
    displayTemplate: '+{value}% Double Gather Chance',
  },
  {
    id: 'prospectors_eye',
    name: "Prospector's",
    category: 'percent_damage', // repurpose for rare resource chance
    slot: 'prefix',
    tiers: buildTiers(1, 2, 2, 4, 5, 8, 9, 12),
    weight: 60,
    displayTemplate: '+{value}% Bonus Rare Resource Chance',
  },

  // ==================== Suffixes ====================
  {
    id: 'rare_find',
    name: 'of Discovery',
    category: 'crit_damage', // repurpose for rare find
    slot: 'suffix',
    tiers: buildTiers(1, 2, 3, 5, 6, 10, 11, 18),
    weight: 100,
    displayTemplate: '+{value}% Rare Material Chance',
  },
  {
    id: 'skill_boost',
    name: 'of Expertise',
    category: 'flat_life', // repurpose for skill level bonus
    slot: 'suffix',
    tiers: buildTiers(1, 1, 1, 2, 2, 3, 3, 5),
    weight: 80,
    displayTemplate: '+{value} Gathering Skill Levels',
  },
  {
    id: 'efficiency',
    name: 'of Efficiency',
    category: 'flat_armor', // repurpose for refining cost reduction
    slot: 'suffix',
    tiers: buildTiers(1, 2, 3, 5, 6, 10, 11, 18),
    weight: 60,
    displayTemplate: '+{value}% Refining Efficiency',
  },
  {
    id: 'zone_mastery',
    name: 'of Mastery',
    category: 'dodge_chance', // repurpose for zone-specific bonus
    slot: 'suffix',
    tiers: buildTiers(1, 3, 4, 8, 9, 15, 16, 25),
    weight: 60,
    displayTemplate: '+{value}% Zone Yield Bonus',
  },
];

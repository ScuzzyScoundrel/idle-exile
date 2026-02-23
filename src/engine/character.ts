// ============================================================
// Idle Exile — Character & Stats Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ResolvedStats, StatKey, Item, GearSlot, AffixCategory } from '../types';
import { getAffixDef } from './items';

// --- Base Stats ---

/** Starting stats for a fresh level 1 character. */
export const BASE_STATS: ResolvedStats = {
  damage: 10,
  attackSpeed: 1,
  critChance: 5,
  critDamage: 150,
  life: 100,
  armor: 0,
  dodgeChance: 0,
  fireResist: 0,
  coldResist: 0,
  lightningResist: 0,
};

// --- Affix Category to StatKey mapping ---

/** Map from AffixCategory to the StatKey it modifies. */
const AFFIX_STAT_MAP: Record<AffixCategory, StatKey> = {
  flat_damage: 'damage',
  percent_damage: 'damage',
  attack_speed: 'attackSpeed',
  crit_chance: 'critChance',
  crit_damage: 'critDamage',
  flat_life: 'life',
  percent_life: 'life',
  flat_armor: 'armor',
  dodge_chance: 'dodgeChance',
  fire_resist: 'fireResist',
  cold_resist: 'coldResist',
  lightning_resist: 'lightningResist',
};

/** Categories that apply as percentage multipliers rather than flat additions. */
const PERCENT_CATEGORIES: Set<AffixCategory> = new Set([
  'percent_damage',
  'percent_life',
]);

// --- Functions ---

/** Calculate XP required to reach the next level. */
export function calcXpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/** Create a fresh level 1 character with the given name. */
export function createCharacter(name: string): Character {
  const char: Character = {
    name,
    level: 1,
    xp: 0,
    xpToNext: calcXpToNext(1),
    equipment: {},
    stats: { ...BASE_STATS },
  };
  return char;
}

/**
 * Resolve the final stats for a character, combining base stats,
 * per-level bonuses, equipment base stats, and all affix bonuses.
 *
 * Percent-based affixes (percent_damage, percent_life) are collected
 * and applied as multipliers AFTER all flat bonuses.
 */
export function resolveStats(char: Character): ResolvedStats {
  // Start with a copy of base stats
  const stats: ResolvedStats = { ...BASE_STATS };

  // Per-level bonuses: +2 damage, +5 life per level (level 1 gets no bonus)
  const bonusLevels = char.level - 1;
  stats.damage += 2 * bonusLevels;
  stats.life += 5 * bonusLevels;

  // Collect percent multipliers separately
  const percentBonuses: Partial<Record<StatKey, number>> = {};

  // Loop through all equipped items
  const slots = Object.keys(char.equipment) as GearSlot[];
  for (const slot of slots) {
    const item = char.equipment[slot];
    if (!item) continue;

    // Add base stats from the item
    for (const [key, val] of Object.entries(item.baseStats)) {
      if (typeof val === 'number') {
        stats[key as StatKey] += val;
      }
    }

    // Process all affixes (prefixes + suffixes)
    const allAffixes = [...item.prefixes, ...item.suffixes];
    for (const affix of allAffixes) {
      const def = getAffixDef(affix.defId);
      if (!def) continue;

      const statKey = AFFIX_STAT_MAP[def.category];

      if (PERCENT_CATEGORIES.has(def.category)) {
        // Accumulate percent bonuses for later multiplication
        percentBonuses[statKey] = (percentBonuses[statKey] ?? 0) + affix.value;
      } else {
        // Flat bonus: add directly
        stats[statKey] += affix.value;
      }
    }
  }

  // Apply percent multipliers after all flat bonuses
  for (const [key, pct] of Object.entries(percentBonuses)) {
    if (typeof pct === 'number' && pct > 0) {
      stats[key as StatKey] = Math.floor(stats[key as StatKey] * (1 + pct / 100));
    }
  }

  return stats;
}

/**
 * Add XP to a character and handle level-ups.
 * Returns a NEW character object (does not mutate the original).
 * Handles multiple level-ups if the XP amount is large enough.
 */
export function addXp(char: Character, amount: number): Character {
  let newChar: Character = {
    ...char,
    xp: char.xp + amount,
    equipment: { ...char.equipment },
  };

  // Handle level-ups (potentially multiple)
  while (newChar.xp >= newChar.xpToNext) {
    newChar = {
      ...newChar,
      xp: newChar.xp - newChar.xpToNext,
      level: newChar.level + 1,
      xpToNext: calcXpToNext(newChar.level + 1),
    };
  }

  // Recalculate stats after any level-ups
  newChar.stats = resolveStats(newChar);

  return newChar;
}

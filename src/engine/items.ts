// ============================================================
// Idle Exile — Item Generation Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, Affix, AffixDef, AffixTier, Rarity, GearSlot, ItemBaseDef } from '../types';
import { AFFIX_DEFS } from '../data/affixes';
import { ITEM_BASE_DEFS } from '../data/items';

// --- Helpers ---

/** Generate a short random ID string. */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Return a random integer between min and max inclusive. */
export function rollAffixValue(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Given an item level, pick a random affix tier via weighted selection.
 * Higher tiers are rarer and require higher iLvl to unlock.
 *   T3: always available, weight 60
 *   T2: available if iLvl >= 10, weight 30
 *   T1: available if iLvl >= 20, weight 10
 */
export function rollAffixTier(iLvl: number): AffixTier {
  const pool: { tier: AffixTier; weight: number }[] = [
    { tier: 3, weight: 60 },
  ];
  if (iLvl >= 10) pool.push({ tier: 2, weight: 30 });
  if (iLvl >= 20) pool.push({ tier: 1, weight: 10 });

  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.tier;
  }
  return pool[pool.length - 1].tier;
}

/**
 * Pick a random AffixDef from availableDefs (weighted by def.weight),
 * roll a tier, roll a value within that tier's range. Return the Affix.
 */
export function rollAffix(availableDefs: AffixDef[], iLvl: number): Affix {
  // Weighted random pick from available defs
  const totalWeight = availableDefs.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = availableDefs[0];
  for (const def of availableDefs) {
    roll -= def.weight;
    if (roll <= 0) {
      chosen = def;
      break;
    }
  }

  const tier = rollAffixTier(iLvl);
  const tierData = chosen.tiers[tier];
  const value = rollAffixValue(tierData.min, tierData.max);

  return { defId: chosen.id, tier, value };
}

/**
 * Roll `count` unique affixes of the given slot type.
 * Filters AFFIX_DEFS to the correct slot, removes excluded defIds,
 * and ensures no duplicate defIds in the result.
 */
export function rollAffixes(
  slot: 'prefix' | 'suffix',
  count: number,
  iLvl: number,
  exclude: string[] = [],
): Affix[] {
  const available = AFFIX_DEFS.filter(
    (d) => d.slot === slot && !exclude.includes(d.id),
  );

  const result: Affix[] = [];
  let pool = [...available];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const affix = rollAffix(pool, iLvl);
    result.push(affix);
    // Remove the chosen def so we don't get duplicates
    pool = pool.filter((d) => d.id !== affix.defId);
  }

  return result;
}

/**
 * Generate a complete item for a given gear slot and item level.
 * Picks the highest-iLvl qualifying base, determines rarity, rolls affixes,
 * and constructs the item name.
 */
export function generateItem(
  slot: GearSlot,
  iLvl: number,
  forcedRarity?: Rarity,
): Item {
  // Find qualifying bases for this slot where base iLvl <= given iLvl
  const qualifying = ITEM_BASE_DEFS.filter(
    (b) => b.slot === slot && b.iLvl <= iLvl,
  );

  // Pick the highest-iLvl qualifying base
  const base = qualifying.reduce((best, cur) =>
    cur.iLvl > best.iLvl ? cur : best,
  );

  // Determine rarity
  let rarity: Rarity;
  if (forcedRarity) {
    rarity = forcedRarity;
  } else {
    const rarityRoll = Math.random();
    if (rarityRoll < 0.10) {
      rarity = 'rare';
    } else if (rarityRoll < 0.40) {
      rarity = 'magic';
    } else {
      rarity = 'normal';
    }
  }

  // Roll affixes based on rarity
  let prefixes: Affix[] = [];
  let suffixes: Affix[] = [];

  if (rarity === 'normal') {
    // 0 prefixes, 0 suffixes
  } else if (rarity === 'magic') {
    // 1 prefix + 0-1 suffix
    prefixes = rollAffixes('prefix', 1, iLvl);
    const suffixCount = Math.random() < 0.5 ? 1 : 0;
    if (suffixCount > 0) {
      suffixes = rollAffixes('suffix', suffixCount, iLvl);
    }
  } else if (rarity === 'rare') {
    // 1-3 prefixes + 1-3 suffixes, min total 3
    let prefixCount = rollAffixValue(1, 3);
    let suffixCount = rollAffixValue(1, 3);
    // Ensure minimum total of 3
    while (prefixCount + suffixCount < 3) {
      if (Math.random() < 0.5) {
        prefixCount = Math.min(prefixCount + 1, 3);
      } else {
        suffixCount = Math.min(suffixCount + 1, 3);
      }
    }
    prefixes = rollAffixes('prefix', prefixCount, iLvl);
    const excludeIds = prefixes.map((a) => a.defId);
    suffixes = rollAffixes('suffix', suffixCount, iLvl, excludeIds);
  }

  // Generate item name
  let name: string;
  if (rarity === 'normal') {
    name = base.name;
  } else {
    const parts: string[] = [];
    if (prefixes.length > 0) {
      const prefixDef = getAffixDef(prefixes[0].defId);
      if (prefixDef) parts.push(prefixDef.name);
    }
    parts.push(base.name);
    if (suffixes.length > 0) {
      const suffixDef = getAffixDef(suffixes[0].defId);
      if (suffixDef) parts.push(suffixDef.name);
    }
    name = parts.join(' ');
  }

  return {
    id: generateId(),
    baseId: base.id,
    name,
    slot,
    rarity,
    iLvl,
    prefixes,
    suffixes,
    armorType: base.armorType,
    baseStats: { ...base.baseStats },
  };
}

/** Lookup an AffixDef by its id. */
export function getAffixDef(defId: string): AffixDef | undefined {
  return AFFIX_DEFS.find((d) => d.id === defId);
}

/**
 * Format an affix into a human-readable string.
 * Replaces {value} in the def's displayTemplate with the actual rolled value.
 */
export function formatAffix(affix: Affix): string {
  const def = getAffixDef(affix.defId);
  if (!def) return `Unknown affix: ${affix.defId}`;
  return def.displayTemplate.replace('{value}', String(affix.value));
}

/**
 * Calculate a simple power score for an item.
 * Sum of all affix values + sum of all base stat values.
 */
export function calcItemPower(item: Item): number {
  let power = 0;

  // Sum base stat values
  for (const val of Object.values(item.baseStats)) {
    if (typeof val === 'number') power += val;
  }

  // Sum all affix values
  for (const affix of item.prefixes) {
    power += affix.value;
  }
  for (const affix of item.suffixes) {
    power += affix.value;
  }

  return power;
}

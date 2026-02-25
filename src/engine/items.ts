// ============================================================
// Idle Exile — Item Generation Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, Affix, AffixDef, AffixTier, Rarity, GearSlot, StatKey } from '../types';
import { AFFIX_DEFS } from '../data/affixes';
import { ITEM_BASE_DEFS } from '../data/items';
import { TIER_WEIGHTS, AFFIX_COUNT_WEIGHTS } from '../data/balance';
import { AFFIX_STAT_MAP } from './character';

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
 * Get available tiers based on item level (band-based gating).
 * Higher iLvl unlocks access to better (lower number) tiers.
 */
export function getAvailableTiers(iLvl: number): AffixTier[] {
  // iLvl 1-10: T10-T7 only
  // iLvl 11-20: T10-T5
  // iLvl 21-30: T10-T4
  // iLvl 31-40: T10-T3
  // iLvl 41-50: T10-T2
  // iLvl 51-60: T10-T1
  let minTier: AffixTier;
  if (iLvl >= 51) minTier = 1;
  else if (iLvl >= 41) minTier = 2;
  else if (iLvl >= 31) minTier = 3;
  else if (iLvl >= 21) minTier = 4;
  else if (iLvl >= 11) minTier = 5;
  else minTier = 7;

  const tiers: AffixTier[] = [];
  for (let t = minTier; t <= 10; t++) {
    tiers.push(t as AffixTier);
  }
  return tiers;
}

/**
 * Get the best (lowest number) affix tier available at a given iLvl.
 */
export function getBestTierForILvl(iLvl: number): AffixTier {
  return getAvailableTiers(iLvl)[0];
}

/**
 * Roll a random affix tier using weighted selection from available tiers.
 */
export function rollAffixTier(iLvl: number): AffixTier {
  const available = getAvailableTiers(iLvl);
  const pool = available.map(t => ({ tier: t, weight: TIER_WEIGHTS[t] }));
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.tier;
  }
  return pool[pool.length - 1].tier;
}

/**
 * Classify item rarity based on affix quality (tier).
 * - Legendary: any T1 affix OR 2+ T2 affixes
 * - Epic: any T2 affix
 * - Rare: any T3 affix
 * - Uncommon: any T4-T6 affix
 * - Common: all T7 or worse
 */
export function classifyRarity(item: Item): Rarity {
  const allAffixes = [...item.prefixes, ...item.suffixes];
  if (allAffixes.length === 0) return 'common';

  let t1Count = 0;
  let t2Count = 0;
  let bestTier: AffixTier = 10;

  for (const affix of allAffixes) {
    if (affix.tier < bestTier) bestTier = affix.tier;
    if (affix.tier === 1) t1Count++;
    if (affix.tier === 2) t2Count++;
  }

  if (t1Count > 0 || t2Count >= 2) return 'legendary';
  if (t2Count > 0) return 'epic';
  if (bestTier <= 3) return 'rare';
  if (bestTier <= 6) return 'uncommon';
  return 'common';
}

/**
 * Build a display name for an item based on its affixes and base.
 * Format: [first prefix name] Base Name [first suffix name]
 * Common items with no affixes just use the base name.
 */
export function buildItemName(item: Item): string {
  const baseDef = ITEM_BASE_DEFS.find(b => b.id === item.baseId);
  const baseName = baseDef?.name ?? 'Unknown';

  const allAffixes = [...item.prefixes, ...item.suffixes];
  if (allAffixes.length === 0) return baseName;

  const parts: string[] = [];
  if (item.prefixes.length > 0) {
    const def = getAffixDef(item.prefixes[0].defId);
    if (def) parts.push(def.name);
  }
  parts.push(baseName);
  if (item.suffixes.length > 0) {
    const def = getAffixDef(item.suffixes[0].defId);
    if (def) parts.push(def.name);
  }
  return parts.join(' ');
}

/**
 * Roll how many affixes an item gets (2-6, weighted).
 */
export function rollAffixCount(): number {
  const totalWeight = AFFIX_COUNT_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of AFFIX_COUNT_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.count;
  }
  return 2;
}

/**
 * Pick a random AffixDef from availableDefs (weighted by def.weight),
 * roll a tier, roll a value within that tier's range. Return the Affix.
 */
export function rollAffix(availableDefs: AffixDef[], iLvl: number): Affix {
  const totalWeight = availableDefs.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = availableDefs[0];
  for (const def of availableDefs) {
    roll -= def.weight;
    if (roll <= 0) { chosen = def; break; }
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
  const available = AFFIX_DEFS.filter(d => d.slot === slot && !exclude.includes(d.id));
  const result: Affix[] = [];
  let pool = [...available];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const affix = rollAffix(pool, iLvl);
    result.push(affix);
    pool = pool.filter(d => d.id !== affix.defId);
  }
  return result;
}

/**
 * Generate a complete item for a given gear slot and item level.
 * New system: always 2-6 affixes, rarity derived from affix quality.
 */
export function generateItem(slot: GearSlot, iLvl: number): Item {
  // Find qualifying bases for this slot where base iLvl <= given iLvl
  let qualifying = ITEM_BASE_DEFS.filter(b => b.slot === slot && b.iLvl <= iLvl);
  if (qualifying.length === 0) {
    qualifying = ITEM_BASE_DEFS.filter(b => b.slot === slot);
  }
  if (qualifying.length === 0) {
    return {
      id: generateId(), baseId: 'unknown', name: `Unknown ${slot}`,
      slot, rarity: 'common', iLvl, prefixes: [], suffixes: [], baseStats: {},
    };
  }

  // Pick the highest qualifying iLvl base, random among ties
  const maxILvl = qualifying.reduce((best, cur) => Math.max(best, cur.iLvl), 0);
  const topBases = qualifying.filter(b => b.iLvl === maxILvl);
  const base = topBases[Math.floor(Math.random() * topBases.length)];

  // Roll affix count (2-6)
  const totalAffixes = rollAffixCount();

  // Split into prefixes (max 3) and suffixes (max 3)
  let prefixCount: number;
  let suffixCount: number;

  // Distribute: try to balance, but respect max 3 each
  const half = Math.floor(totalAffixes / 2);
  prefixCount = Math.min(half, 3);
  suffixCount = Math.min(totalAffixes - prefixCount, 3);
  // If we still need more, add to the other side
  if (prefixCount + suffixCount < totalAffixes) {
    prefixCount = Math.min(totalAffixes - suffixCount, 3);
  }

  // Add some randomness to distribution
  if (prefixCount > 1 && suffixCount < 3 && Math.random() < 0.5) {
    prefixCount--;
    suffixCount++;
  } else if (suffixCount > 1 && prefixCount < 3 && Math.random() < 0.5) {
    suffixCount--;
    prefixCount++;
  }

  const prefixes = rollAffixes('prefix', prefixCount, iLvl);
  const excludeIds = prefixes.map(a => a.defId);
  const suffixes = rollAffixes('suffix', suffixCount, iLvl, excludeIds);

  // Build item, then classify rarity from affix quality
  const item: Item = {
    id: generateId(),
    baseId: base.id,
    name: '', // set below
    slot,
    rarity: 'common', // set below
    iLvl,
    prefixes,
    suffixes,
    armorType: base.armorType,
    baseStats: { ...base.baseStats },
  };

  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);

  return item;
}

/** Rarity rank for comparison (higher = better). */
const RARITY_RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

/**
 * Pick the "best" item from a list — highest rarity wins,
 * tiebreak by lowest average affix tier (T1 < T10 = better).
 */
export function pickBestItem(items: Item[]): Item | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestRank = RARITY_RANK[best.rarity];
  let bestAvgTier = avgAffixTier(best);

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const rank = RARITY_RANK[item.rarity];
    const avg = avgAffixTier(item);
    if (rank > bestRank || (rank === bestRank && avg < bestAvgTier)) {
      best = item;
      bestRank = rank;
      bestAvgTier = avg;
    }
  }
  return best;
}

function avgAffixTier(item: Item): number {
  const all = [...item.prefixes, ...item.suffixes];
  if (all.length === 0) return 10;
  return all.reduce((sum, a) => sum + a.tier, 0) / all.length;
}

/** Lookup an AffixDef by its id. */
export function getAffixDef(defId: string): AffixDef | undefined {
  return AFFIX_DEFS.find(d => d.id === defId);
}

/** Format an affix into a human-readable string. */
export function formatAffix(affix: Affix): string {
  const def = getAffixDef(affix.defId);
  if (!def) return `Unknown affix: ${affix.defId}`;
  return def.displayTemplate.replace('{value}', String(affix.value));
}

/** Calculate a simple power score for an item. */
export function calcItemPower(item: Item): number {
  let power = 0;
  for (const val of Object.values(item.baseStats)) {
    if (typeof val === 'number') power += val;
  }
  for (const affix of item.prefixes) power += affix.value;
  for (const affix of item.suffixes) power += affix.value;
  return power;
}

// --- Upgrade Comparison ---

/**
 * Calculate an item's total stat contribution mapped to StatKey.
 * Base stats + all affix values (percent affixes included as raw values
 * for item-to-item comparison, not final character stats).
 */
export function calcItemStatContribution(item: Item): Partial<Record<StatKey, number>> {
  const stats: Partial<Record<StatKey, number>> = {};

  // Base stats
  for (const [key, val] of Object.entries(item.baseStats)) {
    if (typeof val === 'number') {
      const k = key as StatKey;
      stats[k] = (stats[k] ?? 0) + val;
    }
  }

  // Affix values mapped to StatKey
  for (const affix of [...item.prefixes, ...item.suffixes]) {
    const def = getAffixDef(affix.defId);
    if (!def) continue;
    const k = AFFIX_STAT_MAP[def.category];
    stats[k] = (stats[k] ?? 0) + affix.value;
  }

  return stats;
}

/**
 * Returns true if candidate is a net upgrade over equipped.
 * Simple sum of all stat deltas — no weighting for MVP.
 */
export function isUpgradeOver(candidate: Item, equipped: Item): boolean {
  const candStats = calcItemStatContribution(candidate);
  const eqStats = calcItemStatContribution(equipped);
  const allKeys = new Set([...Object.keys(candStats), ...Object.keys(eqStats)]) as Set<StatKey>;

  let netDelta = 0;
  for (const key of allKeys) {
    netDelta += (candStats[key] ?? 0) - (eqStats[key] ?? 0);
  }
  return netDelta > 0;
}

/**
 * Get the equipped item to compare against for a given slot.
 * Handles ring1/ring2 and trinket1/trinket2 paired-slot fallback.
 */
export function getComparisonTarget(
  slot: GearSlot,
  equipment: Partial<Record<GearSlot, Item>>,
): Item | null {
  const direct = equipment[slot];
  if (direct) return direct;

  // Paired slot fallback
  if (slot === 'ring1') return equipment['ring2'] ?? null;
  if (slot === 'ring2') return equipment['ring1'] ?? null;
  if (slot === 'trinket1') return equipment['trinket2'] ?? null;
  if (slot === 'trinket2') return equipment['trinket1'] ?? null;

  return null;
}

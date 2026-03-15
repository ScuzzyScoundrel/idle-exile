// ============================================================
// Idle Exile — Item Generation Engine (v16)
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, Affix, AffixDef, AffixTier, AffixCategory, Rarity, GearSlot, StatKey, WeaponType, OffhandType, ArmorType, ItemBaseDef } from '../types';
import { AFFIX_DEFS, getAffixesForSlot } from '../data/affixes';
import { GATHERING_AFFIX_DEFS } from '../data/gatheringAffixes';
import { PROFESSION_AFFIX_DEFS } from '../data/professionAffixes';
import { PROFESSION_BASE_DEFS } from '../data/professionBases';
import { ITEM_BASE_DEFS } from '../data/items';
import { TIER_LOW_WEIGHTS, TIER_HIGH_WEIGHTS, TIER_ILVL_CAP, AFFIX_TIER_FLOOR_BY_ILVL, AFFIX_COUNT_WEIGHTS, AFFIX_COUNT_WEIGHTS_BY_BAND } from '../data/balance';

/** Unified affix lookup across all pools (combat + gathering + profession). */
const ALL_AFFIX_DEFS: AffixDef[] = [...AFFIX_DEFS, ...GATHERING_AFFIX_DEFS, ...PROFESSION_AFFIX_DEFS];

/** Unified base lookup (combat + profession). */
const ALL_BASE_DEFS: ItemBaseDef[] = [...ITEM_BASE_DEFS, ...PROFESSION_BASE_DEFS];

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
 * Get iLvl-scaled weights for ALL 10 affix tiers.
 * Low iLvl: T10 dominates (~50), T1 near-zero (~0.02).
 * High iLvl (70+): T10 still most common (~20%), T1 still rare chase tier (~1.4%).
 */
export function getWeightedTiers(iLvl: number): Record<AffixTier, number> {
  const t = Math.min(1, Math.max(0, iLvl / TIER_ILVL_CAP));
  const result = {} as Record<AffixTier, number>;
  for (let i = 1; i <= 10; i++) {
    const tier = i as AffixTier;
    result[tier] = TIER_LOW_WEIGHTS[tier] + (TIER_HIGH_WEIGHTS[tier] - TIER_LOW_WEIGHTS[tier]) * t;
  }
  return result;
}

/**
 * Get the best (lowest number) affix tier that has a realistic chance of dropping.
 * "Realistic" = at least 1% of total weight.
 */
export function getBestTierForILvl(iLvl: number): AffixTier {
  const weights = getWeightedTiers(iLvl);
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  for (let t = 1; t <= 10; t++) {
    if (weights[t as AffixTier] / total >= 0.01) return t as AffixTier;
  }
  return 10 as AffixTier;
}

/**
 * Roll a random affix tier using iLvl-scaled weighted selection across all 10 tiers.
 * Applies hard floor: tiers below the floor for this iLvl range get zero weight.
 */
export function rollAffixTier(iLvl: number): AffixTier {
  const weights = getWeightedTiers(iLvl);

  // Hard floor: zero out tiers below the minimum allowed for this iLvl
  let minTier = 1;
  for (const [maxILvl, floor] of AFFIX_TIER_FLOOR_BY_ILVL) {
    if (iLvl <= maxILvl) { minTier = floor; break; }
  }

  const entries = [];
  for (let i = 1; i <= 10; i++) {
    const tier = i as AffixTier;
    entries.push({ tier, weight: tier < minTier ? 0 : weights[tier] });
  }
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.tier;
  }
  return 10 as AffixTier;
}

/**
 * Classify item rarity based on affix quality (tier).
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
 */
export function buildItemName(item: Item): string {
  const baseDef = ALL_BASE_DEFS.find(b => b.id === item.baseId);
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
 * Higher bands guarantee more affixes via AFFIX_COUNT_WEIGHTS_BY_BAND.
 */
export function rollAffixCount(band: number = 1): number {
  const weights = AFFIX_COUNT_WEIGHTS_BY_BAND[band] ?? AFFIX_COUNT_WEIGHTS;
  const totalWeight = weights.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.count;
  }
  return weights[0]?.count ?? 2;
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
 * Roll `count` unique affixes of the given slot type, filtered by gear context.
 * Uses slot-restricted affix pool from getAffixesForSlot().
 */
export function rollAffixes(
  affixSlot: 'prefix' | 'suffix',
  count: number,
  iLvl: number,
  gearSlot: GearSlot,
  weaponType?: WeaponType,
  offhandType?: OffhandType,
  exclude: string[] = [],
  armorType?: ArmorType,
): Affix[] {
  const available = getAffixesForSlot(gearSlot, weaponType, offhandType, affixSlot, armorType)
    .filter(d => !exclude.includes(d.id));
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
 * Uses slot-restricted affix rolling.
 */
export function generateItem(slot: GearSlot, iLvl: number, baseId?: string, guaranteedAffix?: AffixCategory, band: number = 1): Item {
  let base = baseId ? ITEM_BASE_DEFS.find(b => b.id === baseId) : undefined;

  if (!base) {
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

    const maxILvl = qualifying.reduce((best, cur) => Math.max(best, cur.iLvl), 0);
    const topBases = qualifying.filter(b => b.iLvl === maxILvl);
    base = topBases[Math.floor(Math.random() * topBases.length)];
  }

  const totalAffixes = rollAffixCount(band);

  let prefixCount: number;
  let suffixCount: number;

  const half = Math.floor(totalAffixes / 2);
  prefixCount = Math.min(half, 3);
  suffixCount = Math.min(totalAffixes - prefixCount, 3);
  if (prefixCount + suffixCount < totalAffixes) {
    prefixCount = Math.min(totalAffixes - suffixCount, 3);
  }

  if (prefixCount > 1 && suffixCount < 3 && Math.random() < 0.5) {
    prefixCount--;
    suffixCount++;
  } else if (suffixCount > 1 && prefixCount < 3 && Math.random() < 0.5) {
    suffixCount--;
    prefixCount++;
  }

  // Extract gear context for slot-restricted rolling
  const weaponType = base.weaponType;
  const offhandType = base.offhandType;

  // Handle guaranteed affix catalyst
  const guaranteedAffixes: Affix[] = [];
  let guaranteedExcludeId: string | undefined;

  if (guaranteedAffix) {
    const gDef = getAffixesForSlot(slot, weaponType, offhandType)
      .find(d => d.category === guaranteedAffix);
    if (gDef) {
      const targetSlot = gDef.slot;
      const slotCount = targetSlot === 'prefix' ? prefixCount : suffixCount;
      if (slotCount > 0) {
        const tier = rollAffixTier(iLvl);
        const tierData = gDef.tiers[tier];
        const value = rollAffixValue(tierData.min, tierData.max);
        guaranteedAffixes.push({ defId: gDef.id, tier, value });
        guaranteedExcludeId = gDef.id;
        if (targetSlot === 'prefix') prefixCount--;
        else suffixCount--;
      }
    }
  }

  const prefixes = rollAffixes('prefix', prefixCount, iLvl, slot, weaponType, offhandType,
    guaranteedExcludeId ? [guaranteedExcludeId] : [], base.armorType);
  const excludeIds = [...prefixes.map(a => a.defId), ...(guaranteedExcludeId ? [guaranteedExcludeId] : [])];
  const suffixes = rollAffixes('suffix', suffixCount, iLvl, slot, weaponType, offhandType, excludeIds, base.armorType);

  const allPrefixes = [...prefixes];
  const allSuffixes = [...suffixes];
  for (const ga of guaranteedAffixes) {
    const gDef = AFFIX_DEFS.find(d => d.id === ga.defId);
    if (gDef?.slot === 'prefix') allPrefixes.unshift(ga);
    else allSuffixes.unshift(ga);
  }

  const item: Item = {
    id: generateId(),
    baseId: base.id,
    name: '',
    slot,
    rarity: 'common',
    iLvl,
    prefixes: allPrefixes,
    suffixes: allSuffixes,
    armorType: base.armorType,
    weaponType: base.weaponType,
    offhandType: base.offhandType,
    baseStats: { ...base.baseStats },
    baseDamageMin: base.baseDamageMin,
    baseDamageMax: base.baseDamageMax,
    baseSpellPower: base.baseSpellPower,
    baseConversion: base.baseConversion,
  };

  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);

  return item;
}

/**
 * Generate a gathering-specific item for a given gear slot and item level.
 */
export function generateGatheringItem(slot: GearSlot, iLvl: number, baseId?: string): Item {
  let base = baseId ? ITEM_BASE_DEFS.find(b => b.id === baseId) : undefined;

  if (!base) {
    let qualifying = ITEM_BASE_DEFS.filter(b => b.slot === slot && b.iLvl <= iLvl);
    if (qualifying.length === 0) {
      qualifying = ITEM_BASE_DEFS.filter(b => b.slot === slot);
    }
    if (qualifying.length === 0) {
      return {
        id: generateId(), baseId: 'unknown', name: `Unknown ${slot}`,
        slot, rarity: 'common', iLvl, prefixes: [], suffixes: [], baseStats: {},
        isGatheringGear: true,
      };
    }

    const maxILvl = qualifying.reduce((best, cur) => Math.max(best, cur.iLvl), 0);
    const topBases = qualifying.filter(b => b.iLvl === maxILvl);
    base = topBases[Math.floor(Math.random() * topBases.length)];
  }

  const totalAffixes = rollAffixCount();
  let prefixCount = Math.min(Math.floor(totalAffixes / 2), 3);
  let suffixCount = Math.min(totalAffixes - prefixCount, 3);
  if (prefixCount + suffixCount < totalAffixes) {
    prefixCount = Math.min(totalAffixes - suffixCount, 3);
  }

  const gatherPrefixes = GATHERING_AFFIX_DEFS.filter(d => d.slot === 'prefix');
  const gatherSuffixes = GATHERING_AFFIX_DEFS.filter(d => d.slot === 'suffix');

  const prefixes: Affix[] = [];
  let prefPool = [...gatherPrefixes];
  for (let i = 0; i < prefixCount && prefPool.length > 0; i++) {
    const affix = rollAffix(prefPool, iLvl);
    prefixes.push(affix);
    prefPool = prefPool.filter(d => d.id !== affix.defId);
  }

  const suffixes: Affix[] = [];
  let sufPool = [...gatherSuffixes];
  for (let i = 0; i < suffixCount && sufPool.length > 0; i++) {
    const affix = rollAffix(sufPool, iLvl);
    suffixes.push(affix);
    sufPool = sufPool.filter(d => d.id !== affix.defId);
  }

  const item: Item = {
    id: generateId(),
    baseId: base.id,
    name: '',
    slot,
    rarity: 'common',
    iLvl,
    prefixes,
    suffixes,
    armorType: base.armorType,
    baseStats: { ...base.baseStats },
    isGatheringGear: true,
  };

  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);

  return item;
}

/** Rarity rank for comparison (higher = better). */
const RARITY_RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, unique: 5,
};

/**
 * Pick the "best" item from a list.
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

/** Lookup an AffixDef by its id (searches all affix pools). */
export function getAffixDef(defId: string): AffixDef | undefined {
  return ALL_AFFIX_DEFS.find(d => d.id === defId);
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
 */
export function calcItemStatContribution(item: Item): Partial<Record<StatKey, number>> {
  const stats: Partial<Record<StatKey, number>> = {};

  for (const [key, val] of Object.entries(item.baseStats)) {
    if (typeof val === 'number') {
      const k = key as StatKey;
      stats[k] = (stats[k] ?? 0) + val;
    }
  }

  for (const affix of [...item.prefixes, ...item.suffixes]) {
    const def = getAffixDef(affix.defId);
    if (!def) continue;
    const k = def.stat;
    stats[k] = (stats[k] ?? 0) + affix.value;
  }

  return stats;
}

/**
 * Returns true if candidate is a net upgrade over equipped.
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
 * Get the weapon type of the currently equipped mainhand item.
 */
export function getEquippedWeaponType(equipment: Partial<Record<GearSlot, Item>>): WeaponType | null {
  return equipment['mainhand']?.weaponType ?? null;
}

/** Two-handed weapon types that prevent offhand use. */
const TWO_HANDED_WEAPONS: ReadonlySet<WeaponType> = new Set([
  'greatsword', 'greataxe', 'maul', 'staff', 'bow', 'crossbow', 'tome',
]);

export function isTwoHandedWeapon(type: WeaponType): boolean {
  return TWO_HANDED_WEAPONS.has(type);
}

/**
 * Get the equipped item to compare against for a given slot.
 */
export function getComparisonTarget(
  slot: GearSlot,
  equipment: Partial<Record<GearSlot, Item>>,
): Item | null {
  const direct = equipment[slot];
  if (direct) return direct;

  if (slot === 'ring1') return equipment['ring2'] ?? null;
  if (slot === 'ring2') return equipment['ring1'] ?? null;
  if (slot === 'trinket1') return equipment['trinket2'] ?? null;
  if (slot === 'trinket2') return equipment['trinket1'] ?? null;

  return null;
}

/**
 * Generate a profession gear item for a given gear slot and item level.
 * Always rolls exactly 2 prefixes + 2 suffixes from the profession affix pool.
 */
export function generateProfessionItem(slot: GearSlot, iLvl: number, baseId?: string): Item {
  let base = baseId ? PROFESSION_BASE_DEFS.find(b => b.id === baseId) : undefined;

  if (!base) {
    let qualifying = PROFESSION_BASE_DEFS.filter(b => b.slot === slot && b.iLvl <= iLvl);
    if (qualifying.length === 0) {
      qualifying = PROFESSION_BASE_DEFS.filter(b => b.slot === slot);
    }
    if (qualifying.length === 0) {
      return {
        id: generateId(), baseId: 'unknown', name: `Unknown ${slot}`,
        slot, rarity: 'common', iLvl, prefixes: [], suffixes: [], baseStats: {},
        isProfessionGear: true,
      };
    }
    const maxILvl = qualifying.reduce((best, cur) => Math.max(best, cur.iLvl), 0);
    const topBases = qualifying.filter(b => b.iLvl === maxILvl);
    base = topBases[Math.floor(Math.random() * topBases.length)];
  }

  // Always exactly 2 prefixes from profession pool
  const profPrefixes = PROFESSION_AFFIX_DEFS.filter(d => d.slot === 'prefix');
  const prefixes: Affix[] = [];
  let prefPool = [...profPrefixes];
  for (let i = 0; i < 2 && prefPool.length > 0; i++) {
    const affix = rollAffix(prefPool, iLvl);
    prefixes.push(affix);
    prefPool = prefPool.filter(d => d.id !== affix.defId);
  }

  // Always exactly 2 suffixes from profession pool
  const profSuffixes = PROFESSION_AFFIX_DEFS.filter(d => d.slot === 'suffix');
  const suffixes: Affix[] = [];
  let sufPool = [...profSuffixes];
  for (let i = 0; i < 2 && sufPool.length > 0; i++) {
    const affix = rollAffix(sufPool, iLvl);
    suffixes.push(affix);
    sufPool = sufPool.filter(d => d.id !== affix.defId);
  }

  const item: Item = {
    id: generateId(),
    baseId: base.id,
    name: '',
    slot,
    rarity: 'common',
    iLvl,
    prefixes,
    suffixes,
    baseStats: { ...base.baseStats },
    weaponType: base.weaponType,
    isProfessionGear: true,
  };

  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);

  return item;
}

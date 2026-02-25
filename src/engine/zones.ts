// ============================================================
// Idle Exile — Zone & Idle Simulation Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ZoneDef, IdleRunResult, Item, CurrencyType, GearSlot, ResolvedStats } from '../types';
import { generateItem } from './items';
import { calcDefensiveEfficiency } from './setBonus';
import { BAG_UPGRADE_DEFS } from '../data/items';
import {
  BASE_ITEM_DROP_CHANCE, MASTERY_DROP_BONUS,
  MATERIAL_DROP_MIN, MATERIAL_DROP_MAX,
  CURRENCY_DROP_CHANCES, GOLD_PER_BAND, XP_PER_BAND, BAG_DROP_CHANCE,
  POWER_DIVISOR, LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO,
  HAZARD_PENALTY_FLOOR, HAZARD_OVERCAP_MULT,
} from '../data/balance';

// --- Gear slots used for random item drops ---

const GEAR_SLOTS: GearSlot[] = [
  'mainhand', 'offhand',
  'helmet', 'neck', 'shoulders', 'cloak',
  'chest', 'bracers', 'gloves', 'belt',
  'pants', 'boots',
  'ring1', 'trinket1',
];

// --- Hazard Resist Mapping ---

const HAZARD_STAT_MAP: Record<string, keyof ResolvedStats> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  poison: 'poisonResist',
  chaos: 'chaosResist',
};

// --- Functions ---

/**
 * Calculate hazard penalty multiplier for a zone.
 * For each hazard, if player resist < threshold: penalty scales quadratically.
 *   At threshold: 1.0. At 0 resist: 0.05 (95% slower — nearly impossible).
 * If above threshold: 0.95 (minor benefit from over-capping).
 * All hazard penalties multiply together — stacking hazards is brutal.
 */
export function calcHazardPenalty(stats: ResolvedStats, zone: ZoneDef): number {
  if (zone.hazards.length === 0) return 1.0;

  let combined = 1.0;
  for (const hazard of zone.hazards) {
    const resist = stats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    let mult: number;
    if (resist >= hazard.threshold) {
      mult = HAZARD_OVERCAP_MULT;
    } else {
      // Quadratic scale: at threshold = 1.0, at 0 = HAZARD_PENALTY_FLOOR
      const ratio = resist / hazard.threshold;
      mult = HAZARD_PENALTY_FLOOR + (1 - HAZARD_PENALTY_FLOOR) * ratio * ratio;
    }
    combined *= mult;
  }
  return combined;
}

/**
 * Check if character meets ALL hazard thresholds for zone mastery.
 */
export function checkZoneMastery(stats: ResolvedStats, zone: ZoneDef): boolean {
  if (zone.hazards.length === 0) return true; // no hazards = auto-mastery
  for (const hazard of zone.hazards) {
    const resist = stats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    if (resist < hazard.threshold) return false;
  }
  return true;
}

/**
 * Calculate how long (in seconds) a character takes to clear a zone.
 *
 * offensivePower = damage * (1 + atkSpd/100) * (1 + critChance/100 * critDamage/100)
 * charPower = offensivePower * defEff * hazardMult
 * clearTime = zone.baseClearTime / (charPower / 50)
 *
 * Level scaling: each level below zone iLvlMin = 12% longer (exponential).
 * Hazard penalty is multiplicative and quadratic (see calcHazardPenalty).
 * Floor at 20% of baseClearTime. No upper cap — undergeared zones should
 * show absurd clear times to signal "you need to grind first".
 */
export function calcClearTime(
  charStats: ResolvedStats,
  zone: ZoneDef,
  charLevel: number = 1,
): number {
  const offensivePower =
    charStats.damage *
    (1 + charStats.attackSpeed / 100) *
    (1 + (charStats.critChance / 100) * (charStats.critDamage / 100));

  const defEff = calcDefensiveEfficiency(charStats, zone.band);
  const hazardMult = calcHazardPenalty(charStats, zone);
  const charPower = offensivePower * defEff * hazardMult;

  let clearTime = zone.baseClearTime / (charPower / POWER_DIVISOR);

  // Level scaling: exponential penalty for being under-leveled
  const levelDelta = Math.max(0, zone.iLvlMin - charLevel);
  if (levelDelta > 0) {
    clearTime *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);
  }

  // Floor at CLEAR_TIME_FLOOR_RATIO of baseClearTime, no upper cap
  const floor = zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO;
  clearTime = Math.max(floor, clearTime);

  return clearTime;
}

/**
 * Simulate an idle run: given elapsed time (in seconds), calculate how many
 * zone clears happened and accumulate all drops, XP, and gold.
 */
export function simulateIdleRun(
  char: Character,
  zone: ZoneDef,
  elapsed: number,
): IdleRunResult {
  const baseClearTime = calcClearTime(char.stats, zone, char.level);
  const clearsCompleted = Math.floor(elapsed / baseClearTime);

  const hasMastery = checkZoneMastery(char.stats, zone);

  // Accumulate results
  const items: IdleRunResult['items'] = [];
  const materials: Record<string, number> = {};
  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0,
    chaos: 0,
    divine: 0,
    annul: 0,
    exalt: 0,
    socket: 0,
  };
  const bagDrops: Record<string, number> = {};

  const itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;

  for (let i = 0; i < clearsCompleted; i++) {
    // --- Item drops ---
    if (Math.random() < itemDropChance) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
      items.push(generateItem(slot, dropILvl));
    }

    // --- Material drops ---
    const matCount = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
    for (let m = 0; m < matCount; m++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      materials[mat] = (materials[mat] ?? 0) + 1;
    }

    // --- Currency drops ---
    for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
      if (Math.random() < chance) currencyDrops[type as CurrencyType]++;
    }

    // --- Bag drops ---
    if (Math.random() < BAG_DROP_CHANCE) {
      const eligible = BAG_UPGRADE_DEFS.filter(b => b.tier <= zone.band);
      if (eligible.length > 0) {
        const bagId = eligible[Math.floor(Math.random() * eligible.length)].id;
        bagDrops[bagId] = (bagDrops[bagId] ?? 0) + 1;
      }
    }
  }

  // XP and gold scale with zone band
  const xpGained = XP_PER_BAND * zone.band * clearsCompleted;
  const goldGained = GOLD_PER_BAND * zone.band * clearsCompleted;

  return {
    items,
    materials,
    currencyDrops,
    bagDrops,
    xpGained,
    goldGained,
    clearsCompleted,
    elapsed,
  };
}

// --- Single Clear Result ---

export interface SingleClearResult {
  item: Item | null;
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  goldGained: number;
  xpGained: number;
  bagDrop: string | null; // bag upgrade id, or null
}

/**
 * Generate drops for ONE zone clear.
 * Pure function — no side effects.
 */
export function simulateSingleClear(
  char: Character,
  zone: ZoneDef,
): SingleClearResult {
  const hasMastery = checkZoneMastery(char.stats, zone);
  const itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;

  // Item drop
  let item: Item | null = null;
  if (Math.random() < itemDropChance) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    item = generateItem(slot, dropILvl);
  }

  // Materials
  const materials: Record<string, number> = {};
  const matCount = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
  for (let m = 0; m < matCount; m++) {
    const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
    materials[mat] = (materials[mat] ?? 0) + 1;
  }

  // Currency drops
  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0,
  };
  for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
    if (Math.random() < chance) currencyDrops[type as CurrencyType]++;
  }

  // Bag drop
  let bagDrop: string | null = null;
  if (Math.random() < BAG_DROP_CHANCE) {
    const eligible = BAG_UPGRADE_DEFS.filter(b => b.tier <= zone.band);
    if (eligible.length > 0) {
      bagDrop = eligible[Math.floor(Math.random() * eligible.length)].id;
    }
  }

  return {
    item,
    materials,
    currencyDrops,
    goldGained: GOLD_PER_BAND * zone.band,
    xpGained: XP_PER_BAND * zone.band,
    bagDrop,
  };
}

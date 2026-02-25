// ============================================================
// Idle Exile — Zone & Idle Simulation Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ZoneDef, IdleRunResult, Item, CurrencyType, GearSlot, ResolvedStats, AbilityEffect, GatheringProfession } from '../types';
import { generateItem, generateGatheringItem } from './items';
import { calcDefensiveEfficiency } from './setBonus';
import { calcGatheringYield } from './gathering';
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
  abilityEffect?: AbilityEffect,
): number {
  // Apply ability effects to stats before power calc
  const effectiveDamage = charStats.damage * (abilityEffect?.damageMult ?? 1);
  const effectiveAtkSpd = charStats.attackSpeed * (abilityEffect?.attackSpeedMult ?? 1);
  const effectiveCritCh = charStats.critChance + (abilityEffect?.critChanceBonus ?? 0);
  const effectiveCritDm = charStats.critDamage + (abilityEffect?.critDamageBonus ?? 0);

  const offensivePower =
    effectiveDamage *
    (1 + effectiveAtkSpd / 100) *
    (1 + (effectiveCritCh / 100) * (effectiveCritDm / 100));

  let defEff = calcDefensiveEfficiency(charStats, zone.band);
  defEff *= (abilityEffect?.defenseMult ?? 1);

  const hazardMult = abilityEffect?.ignoreHazards ? 1.0 : calcHazardPenalty(charStats, zone);
  const charPower = offensivePower * defEff * hazardMult;

  let clearTime = zone.baseClearTime / (charPower / POWER_DIVISOR);

  // Level scaling: exponential penalty for being under-leveled
  const levelDelta = Math.max(0, zone.iLvlMin - charLevel);
  if (levelDelta > 0) {
    clearTime *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);
  }

  // Floor at CLEAR_TIME_FLOOR_RATIO of baseClearTime, no upper cap
  const floor = zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO;

  // Apply clearSpeedMult after base calc
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1);
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
  abilityEffect?: AbilityEffect,
): IdleRunResult {
  const baseClearTime = calcClearTime(char.stats, zone, char.level, abilityEffect);
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

  let itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;
  itemDropChance *= (abilityEffect?.itemDropMult ?? 1);

  const matMult = (abilityEffect?.materialDropMult ?? 1);
  const xpMult = abilityEffect?.xpMult ?? 1;
  const doubleClear = abilityEffect?.doubleClears ?? false;

  for (let i = 0; i < clearsCompleted; i++) {
    // --- Item drops ---
    if (Math.random() < itemDropChance) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
      items.push(generateItem(slot, dropILvl));
    }

    // --- Material drops ---
    const baseMats = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
    const matCount = Math.round(baseMats * matMult) * (doubleClear ? 2 : 1);
    for (let m = 0; m < matCount; m++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      materials[mat] = (materials[mat] ?? 0) + 1;
    }

    // --- Currency drops ---
    for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
      if (Math.random() < chance) {
        currencyDrops[type as CurrencyType] += doubleClear ? 2 : 1;
      }
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
  const xpGained = Math.round(XP_PER_BAND * zone.band * clearsCompleted * xpMult);
  const goldGained = GOLD_PER_BAND * zone.band * clearsCompleted * (doubleClear ? 2 : 1);

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
  abilityEffect?: AbilityEffect,
): SingleClearResult {
  const hasMastery = checkZoneMastery(char.stats, zone);
  let itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;
  itemDropChance *= (abilityEffect?.itemDropMult ?? 1);

  const matMult = (abilityEffect?.materialDropMult ?? 1);
  const xpMult = abilityEffect?.xpMult ?? 1;
  const doubleClear = abilityEffect?.doubleClears ?? false;

  // Item drop
  let item: Item | null = null;
  if (Math.random() < itemDropChance) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    item = generateItem(slot, dropILvl);
  }

  // Materials
  const materials: Record<string, number> = {};
  const baseMats = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
  const matCount = Math.round(baseMats * matMult) * (doubleClear ? 2 : 1);
  for (let m = 0; m < matCount; m++) {
    const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
    materials[mat] = (materials[mat] ?? 0) + 1;
  }

  // Currency drops
  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0,
  };
  for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
    if (Math.random() < chance) {
      currencyDrops[type as CurrencyType] += doubleClear ? 2 : 1;
    }
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
    goldGained: GOLD_PER_BAND * zone.band * (doubleClear ? 2 : 1),
    xpGained: Math.round(XP_PER_BAND * zone.band * xpMult),
    bagDrop,
  };
}

// --- Gathering Clear ---

export interface GatheringClearResult {
  materials: Record<string, number>;
  gatheringXp: number;
  gatheringGearDrop: Item | null;
}

/**
 * Simulate a single gathering clear.
 * Only drops profession-relevant materials from the zone, plus gathering XP.
 * Small chance for gathering gear drop.
 */
export function simulateGatheringClear(
  skillLevel: number,
  zone: ZoneDef,
  _profession: GatheringProfession,
  yieldMult: number = 1.0,
  doubleGatherChance: number = 0,
): GatheringClearResult {
  const materials: Record<string, number> = {};

  // Base 2-4 materials per gather, scaled by yield
  const baseMats = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
  const totalYield = calcGatheringYield(skillLevel) * yieldMult;
  let matCount = Math.round(baseMats * totalYield);

  // Double gather chance
  if (doubleGatherChance > 0 && Math.random() < doubleGatherChance) {
    matCount *= 2;
  }

  // Only drop zone materials (no filtering by profession — all zone mats are relevant)
  for (let i = 0; i < matCount; i++) {
    const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
    materials[mat] = (materials[mat] ?? 0) + 1;
  }

  // Gathering XP: base 5 * zone band
  const gatheringXp = 5 * zone.band;

  // Small chance for gathering gear (2% per clear)
  let gatheringGearDrop: Item | null = null;
  if (Math.random() < 0.02) {
    const gearSlots: GearSlot[] = ['helmet', 'gloves', 'boots', 'belt', 'chest'];
    const slot = gearSlots[Math.floor(Math.random() * gearSlots.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    gatheringGearDrop = generateGatheringItem(slot, dropILvl);
  }

  return { materials, gatheringXp, gatheringGearDrop };
}

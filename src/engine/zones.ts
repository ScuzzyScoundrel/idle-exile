// ============================================================
// Idle Exile — Zone & Idle Simulation Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ZoneDef, IdleRunResult, CurrencyType, GearSlot, ResolvedStats } from '../types';
import { generateItem } from './items';
import { calcDefensiveEfficiency } from './setBonus';

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
 * For each hazard, if player resist < threshold: penalty scales linearly
 * from 1.0 (at threshold) to 0.6 (at 0 resist).
 * If above threshold: 0.95 (minor benefit from over-capping).
 * Worst penalty across all hazards wins (multiplicative would be too harsh).
 */
export function calcHazardPenalty(stats: ResolvedStats, zone: ZoneDef): number {
  if (zone.hazards.length === 0) return 1.0;

  let worstMult = 1.0;
  for (const hazard of zone.hazards) {
    const resist = stats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    let mult: number;
    if (resist >= hazard.threshold) {
      mult = 0.95; // minor benefit
    } else {
      // Linear scale: at threshold = 1.0, at 0 = 0.6
      const ratio = resist / hazard.threshold;
      mult = 0.6 + 0.4 * ratio;
    }
    if (mult < worstMult) worstMult = mult;
  }
  return worstMult;
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
 * Floor at 20% of baseClearTime. Capped at 600s.
 */
export function calcClearTime(
  charStats: ResolvedStats,
  zone: ZoneDef,
): number {
  const offensivePower =
    charStats.damage *
    (1 + charStats.attackSpeed / 100) *
    (1 + (charStats.critChance / 100) * (charStats.critDamage / 100));

  const defEff = calcDefensiveEfficiency(charStats, zone.band);
  const hazardMult = calcHazardPenalty(charStats, zone);
  const charPower = offensivePower * defEff * hazardMult;

  let clearTime = zone.baseClearTime / (charPower / 50);

  // Floor at 20% of baseClearTime, cap at 600
  const floor = zone.baseClearTime * 0.2;
  clearTime = Math.max(floor, Math.min(600, clearTime));

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
  const baseClearTime = calcClearTime(char.stats, zone);
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

  // Item drop chance: 25% base, +15% if mastery
  const itemDropChance = hasMastery ? 0.25 * 1.15 : 0.25;

  for (let i = 0; i < clearsCompleted; i++) {
    // --- Item drops ---
    if (Math.random() < itemDropChance) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      // Random iLvl between zone min and max
      const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
      items.push(generateItem(slot, dropILvl));
    }

    // --- Material drops (1-2 per clear) ---
    const matCount = 1 + Math.floor(Math.random() * 2);
    for (let m = 0; m < matCount; m++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      materials[mat] = (materials[mat] ?? 0) + 1;
    }

    // --- Currency drops ---
    if (Math.random() < 0.06) currencyDrops.augment++;
    if (Math.random() < 0.03) currencyDrops.chaos++;
    if (Math.random() < 0.015) currencyDrops.divine++;
    if (Math.random() < 0.015) currencyDrops.annul++;
    if (Math.random() < 0.008) currencyDrops.exalt++;
    if (Math.random() < 0.02) currencyDrops.socket++;
  }

  // XP and gold scale with zone band
  const xpGained = 10 * zone.band * clearsCompleted;
  const goldGained = 5 * zone.band * clearsCompleted;

  return {
    items,
    materials,
    currencyDrops,
    xpGained,
    goldGained,
    clearsCompleted,
    elapsed,
  };
}

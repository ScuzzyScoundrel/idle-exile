// ============================================================
// Idle Exile — Zone & Idle Simulation Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ZoneDef, GatheringFocus, IdleRunResult, CurrencyType, GearSlot, ResolvedStats } from '../types';
import { generateItem } from './items';

// --- Gear slots used for random item drops ---

const GEAR_SLOTS: GearSlot[] = ['weapon', 'chest', 'boots', 'ring'];

// --- Functions ---

/**
 * Calculate how long (in seconds) a character takes to clear a zone at a given tier.
 *
 * Character power = damage * (1 + attackSpeed/100) * (1 + critChance/100 * critDamage/100)
 * Zone difficulty  = baseClearTime * (1 + (tier - 1) * 0.5)
 * Clear time       = zoneDifficulty / (charPower / 50)
 *
 * Clamped to [5, 600] seconds.
 */
export function calcClearTime(
  charStats: ResolvedStats,
  zone: ZoneDef,
  tier: number,
): number {
  const charPower =
    charStats.damage *
    (1 + charStats.attackSpeed / 100) *
    (1 + (charStats.critChance / 100) * (charStats.critDamage / 100));

  const zoneDifficulty = zone.baseClearTime * (1 + (tier - 1) * 0.5);

  let clearTime = zoneDifficulty / (charPower / 50);

  // Clamp to [5, 600]
  clearTime = Math.max(5, Math.min(600, clearTime));

  return clearTime;
}

/**
 * Simulate an idle run: given elapsed time (in seconds), calculate how many
 * zone clears happened and accumulate all drops, XP, and gold.
 *
 * The `focus` parameter shifts drop rates:
 *   - 'combat':      default rates
 *   - 'scavenging':  item drop chance 30% -> 45%
 *   - 'harvesting':  material drops 1-2 -> 2-4 per clear
 *   - 'prospecting': all currency drop rates doubled
 */
export function simulateIdleRun(
  char: Character,
  zone: ZoneDef,
  tier: number,
  focus: GatheringFocus,
  elapsed: number,
): IdleRunResult {
  const clearTime = calcClearTime(char.stats, zone, tier);
  const clearsCompleted = Math.floor(elapsed / clearTime);

  // Determine iLvl for drops from zone tier
  const dropILvl = zone.iLvlByTier[tier] ?? 1;

  // Accumulate results
  const items: IdleRunResult['items'] = [];
  const materials: Record<string, number> = {};
  const currencyDrops: Record<CurrencyType, number> = {
    transmute: 0,
    augment: 0,
    chaos: 0,
    alchemy: 0,
    divine: 0,
    annul: 0,
    exalt: 0,
    regal: 0,
  };

  // Item drop chance
  const itemDropChance = focus === 'scavenging' ? 0.45 : 0.30;

  // Material count range
  const matMin = focus === 'harvesting' ? 2 : 1;
  const matMax = focus === 'harvesting' ? 4 : 2;

  // Currency rate multiplier
  const currMult = focus === 'prospecting' ? 2 : 1;

  for (let i = 0; i < clearsCompleted; i++) {
    // --- Item drops ---
    if (Math.random() < itemDropChance) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      items.push(generateItem(slot, dropILvl));
    }

    // --- Material drops ---
    const matCount = matMin + Math.floor(Math.random() * (matMax - matMin + 1));
    for (let m = 0; m < matCount; m++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      materials[mat] = (materials[mat] ?? 0) + 1;
    }

    // --- Currency drops ---
    if (Math.random() < 0.10 * currMult) currencyDrops.transmute++;
    if (Math.random() < 0.05 * currMult) currencyDrops.augment++;
    if (Math.random() < 0.02 * currMult) currencyDrops.chaos++;
    if (Math.random() < 0.01 * currMult) currencyDrops.divine++;
    if (Math.random() < 0.01 * currMult) currencyDrops.annul++;
    if (Math.random() < 0.005 * currMult) currencyDrops.exalt++;
  }

  // XP and gold are flat per-clear accumulations
  const xpGained = 10 * tier * clearsCompleted;
  const goldGained = 5 * tier * clearsCompleted;

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

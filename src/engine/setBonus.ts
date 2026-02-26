// ============================================================
// Idle Exile — Set Bonus & Defensive Efficiency Engine (v16)
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { ArmorType, GearSlot, Item, ResolvedStats, ActiveSetBonus, SetBonusThreshold } from '../types';
import { SET_SLOTS } from '../types';
import { SET_BONUS_DEFS } from '../data/setBonuses';
import { BLOCK_CAP, BLOCK_REDUCTION } from '../data/balance';

// --- Set Bonus Calculation ---

/** Count how many set-eligible pieces of each armor type are equipped. */
export function countSetPieces(equipment: Partial<Record<GearSlot, Item>>): Record<ArmorType, number> {
  const counts: Record<ArmorType, number> = { plate: 0, leather: 0, cloth: 0 };
  for (const slot of SET_SLOTS) {
    const item = equipment[slot];
    if (item?.armorType) {
      counts[item.armorType]++;
    }
  }
  return counts;
}

/** Calculate all active set bonuses for the equipped gear. */
export function calcSetBonuses(equipment: Partial<Record<GearSlot, Item>>): ActiveSetBonus[] {
  const counts = countSetPieces(equipment);
  const active: ActiveSetBonus[] = [];

  for (const [type, count] of Object.entries(counts) as [ArmorType, number][]) {
    if (count < 2) continue;
    const def = SET_BONUS_DEFS[type];
    if (!def) continue;

    const bonuses: ActiveSetBonus['bonuses'] = [];
    const thresholds: SetBonusThreshold[] = [2, 4, 6];
    for (const t of thresholds) {
      if (count >= t) {
        bonuses.push({ threshold: t, stats: def.thresholds[t] });
      }
    }

    if (bonuses.length > 0) {
      active.push({
        armorType: type,
        name: def.name,
        count,
        bonuses,
      });
    }
  }

  return active;
}

// --- Defensive Efficiency (v16 multi-component) ---

/**
 * Calculate defensive efficiency for a character at a given zone band.
 *
 * zonePressure = 50 * 2^(band-1)
 *
 * Components:
 *   Armor:   armor / (armor + zonePressure * 10)
 *   Evasion: evasion / (evasion + 500)  → dodge chance
 *   Life:    maxLife / (maxLife + zonePressure * 2.5)
 *   Block:   min(blockChance, 75) / 100 * 0.75  → avg reduction
 *   Resist:  avg of (resist / 75) for each resist, capped at 1.0
 *
 * DefEff = weighted average of components, min 0.2
 */
export function calcDefensiveEfficiency(stats: ResolvedStats, band: number): number {
  const zonePressure = 50 * Math.pow(2, band - 1);

  // Armor mitigation
  const armorComponent = stats.armor / (stats.armor + zonePressure * 10);

  // Evasion → dodge chance
  const dodgeChance = stats.evasion / (stats.evasion + 500);

  // Life component
  const lifeComponent = stats.maxLife / (stats.maxLife + zonePressure * 2.5);

  // Block component
  const effectiveBlock = Math.min(stats.blockChance, BLOCK_CAP) / 100 * BLOCK_REDUCTION;

  // Resist component (average of 4 resists, each capped at 75)
  const resistAvg = (
    Math.min(stats.fireResist, 75) +
    Math.min(stats.coldResist, 75) +
    Math.min(stats.lightningResist, 75) +
    Math.min(stats.chaosResist, 75)
  ) / 4 / 75;

  // Weighted blend: armor 25%, dodge 20%, life 25%, block 10%, resist 20%
  const raw = armorComponent * 0.25
    + dodgeChance * 0.20
    + lifeComponent * 0.25
    + effectiveBlock * 0.10
    + resistAvg * 0.20;

  // Scale to [0.2, 1.0] range
  return Math.max(0.2, 0.2 + 0.8 * raw);
}

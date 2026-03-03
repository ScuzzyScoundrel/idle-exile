// ============================================================
// Idle Exile — Set Bonus & Defensive Efficiency Engine (v16)
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { ArmorType, GearSlot, Item, ResolvedStats, ActiveSetBonus, SetBonusThreshold } from '../types';
import { SET_SLOTS } from '../types';
import { SET_BONUS_DEFS } from '../data/setBonuses';
import { BLOCK_CAP, BLOCK_REDUCTION, ZONE_ILVL_PRESSURE_SCALE } from '../data/balance';

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

/** Band base iLvls for intra-band pressure scaling. */
const BAND_BASE_ILVLS = [1, 11, 21, 31, 41, 51];

/**
 * Calculate defensive efficiency for a character at a given zone band.
 *
 * zonePressure = 50 * 2^(band-1), optionally refined by zoneILvlMin within band.
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
export function calcDefensiveEfficiency(stats: ResolvedStats, band: number, zoneILvlMin?: number): number {
  let zonePressure = 50 * Math.pow(2, band - 1);

  // Intra-band pressure refinement: last zone in a band has ~40% more pressure than first
  if (zoneILvlMin !== undefined) {
    const bandBaseILvl = BAND_BASE_ILVLS[band - 1] ?? 1;
    zonePressure *= (1 + (zoneILvlMin - bandBaseILvl) * ZONE_ILVL_PRESSURE_SCALE);
  }

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

  // Energy Shield component: ES pool relative to zone pressure
  const esComponent = stats.energyShield / (stats.energyShield + zonePressure * 3);

  // Weighted blend: armor 22%, dodge 18%, life 22%, block 8%, resist 18%, ES 12%
  const raw = armorComponent * 0.22
    + dodgeChance * 0.18
    + lifeComponent * 0.22
    + effectiveBlock * 0.08
    + resistAvg * 0.18
    + esComponent * 0.12;

  // Scale to [0.2, 1.0] range
  return Math.max(0.2, 0.2 + 0.8 * raw);
}

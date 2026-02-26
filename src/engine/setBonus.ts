// ============================================================
// Idle Exile — Set Bonus & Defensive Efficiency Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { ArmorType, GearSlot, Item, ResolvedStats, ActiveSetBonus, SetBonusThreshold } from '../types';
import { SET_SLOTS } from '../types';
import { SET_BONUS_DEFS } from '../data/setBonuses';

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

// --- Defensive Efficiency ---

/**
 * Calculate defensive efficiency for a character at a given zone band.
 *
 * zonePressure     = 50 * 2^(band-1)
 * physMitigation   = armor / (armor + zonePressure)
 * effectiveDodge   = min(dodgeChance, 75) / 100
 * avgResist        = (fire + cold + lightning + poison + chaos) / 5
 * elemMitigation   = min(avgResist, 75) / 100
 *
 * physDamage       = zonePressure * 0.6 * (1 - physMit) * (1 - dodge)
 * elemDamage       = zonePressure * 0.4 * (1 - elemMit) * (1 - dodge)
 * totalDamage      = physDamage + elemDamage
 *
 * survivalRatio    = life / (life + totalDamage)
 * defensiveEff     = 0.7 + 0.3 * survivalRatio     // range [0.7, ~1.0]
 */
export function calcDefensiveEfficiency(stats: ResolvedStats, band: number): number {
  const zonePressure = 50 * Math.pow(2, band - 1);

  const physMit = stats.armor / (stats.armor + zonePressure);
  const dodge = Math.min(stats.dodgeChance, 75) / 100;
  const avgResist = (stats.fireResist + stats.coldResist + stats.lightningResist + stats.poisonResist + stats.chaosResist) / 5;
  const elemMit = Math.min(avgResist, 75) / 100;

  const physDamage = zonePressure * 0.6 * (1 - physMit) * (1 - dodge);
  const elemDamage = zonePressure * 0.4 * (1 - elemMit) * (1 - dodge);
  const totalDamage = physDamage + elemDamage;

  const survivalRatio = stats.life / (stats.life + totalDamage);
  return 0.7 + 0.3 * survivalRatio;
}

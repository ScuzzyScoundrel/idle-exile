// ============================================================
// Idle Exile — Rare Material Drop Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { GatheringProfession, RareMaterialRarity } from '../types';
import { getRareMaterialsForProfession, RARE_DROP_RATES } from '../data/rareMaterials';
import { getActiveGatheringMilestones } from './gathering';

/** Rarity order for rolling — highest first so we short-circuit on the best drop. */
const RARITY_ORDER: RareMaterialRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

/**
 * Roll for a rare material drop during a gathering clear.
 * Rolls from highest rarity down; first hit wins.
 * Returns the drop id + rarity, or null if nothing drops.
 */
export function rollRareMaterialDrop(
  profession: GatheringProfession,
  band: number,
  rareFindBonus: number,
): { id: string; rarity: RareMaterialRarity } | null {
  const defs = getRareMaterialsForProfession(profession);
  if (defs.length === 0) return null;

  const bandIdx = Math.max(0, Math.min(band - 1, 5));

  for (const rarity of RARITY_ORDER) {
    const baseRate = RARE_DROP_RATES[rarity][bandIdx];
    if (baseRate <= 0) continue;

    const adjustedRate = baseRate * (1 + rareFindBonus);
    if (Math.random() < adjustedRate) {
      const def = defs.find(d => d.rarity === rarity);
      if (def) return { id: def.id, rarity: def.rarity };
    }
  }

  return null;
}

/**
 * Calculate total rare find bonus from gathering level + gear stats.
 * Milestone bonuses: level 25 = +0.05, level 100 (mastery) = +0.10
 * Gear rare_find affix: value is a percentage, divide by 100.
 */
export function calcRareFindBonus(
  gatheringLevel: number,
  gearRareFindPercent: number = 0,
): number {
  let bonus = 0;

  for (const ms of getActiveGatheringMilestones(gatheringLevel)) {
    if (ms.type === 'rare_find') bonus += ms.value;
    if (ms.type === 'mastery') bonus += 0.10; // mastery includes +10% rare find
  }

  // Gear rare_find affix (already a percentage value like 5 for 5%)
  bonus += gearRareFindPercent / 100;

  return bonus;
}

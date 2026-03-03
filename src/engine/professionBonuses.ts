// ============================================================
// Idle Exile — Profession Bonus Resolution
// Pure function: no React, no side effects, no DOM.
// Resolves aggregate bonuses from equipped profession gear.
// ============================================================

import type { GearSlot, Item, ProfessionBonuses } from '../types';
import { PROFESSION_GEAR_SLOTS } from '../types';
import { MAX_GOLD_EFFICIENCY, MAX_MATERIAL_SAVE } from '../data/balance';

/** Maps affix defId → ProfessionBonuses field name. */
const AFFIX_BONUS_MAP: Record<string, keyof ProfessionBonuses> = {
  // Profession affixes
  'prof_gather_speed': 'gatherSpeed',
  'prof_gather_yield': 'gatherYield',
  'prof_instant_gather': 'instantGather',
  'prof_craft_speed': 'craftSpeed',
  'prof_rare_find': 'rareFind',
  'prof_material_save': 'materialSave',
  'prof_craft_xp': 'craftXp',
  'prof_bonus_ilvl': 'bonusIlvl',
  'prof_critical_craft': 'criticalCraft',
  'prof_gold_efficiency': 'goldEfficiency',
  // Legacy gathering affix mappings (backward compat)
  'gather_speed': 'gatherSpeed',
  'yield_bonus': 'gatherYield',
  'double_gather': 'instantGather',
  'rare_find': 'rareFind',
  'prospectors_eye': 'rareFind',
  'skill_boost': 'craftXp',
  'efficiency': 'gatherYield',
  'zone_mastery': 'gatherYield',
};

const EMPTY_BONUSES: ProfessionBonuses = {
  gatherSpeed: 0,
  gatherYield: 0,
  instantGather: 0,
  rareFind: 0,
  craftSpeed: 0,
  materialSave: 0,
  craftXp: 0,
  bonusIlvl: 0,
  criticalCraft: 0,
  goldEfficiency: 0,
};

/**
 * Resolve aggregate profession bonuses from all equipped profession gear.
 * Pure function — safe to call from anywhere.
 */
export function resolveProfessionBonuses(
  equipment: Partial<Record<GearSlot, Item>>,
): ProfessionBonuses {
  const bonuses = { ...EMPTY_BONUSES };

  for (const slot of PROFESSION_GEAR_SLOTS) {
    const item = equipment[slot];
    if (!item) continue;

    for (const affix of [...item.prefixes, ...item.suffixes]) {
      const field = AFFIX_BONUS_MAP[affix.defId];
      if (field) {
        bonuses[field] += affix.value;
      }
    }
  }

  // Apply caps
  bonuses.goldEfficiency = Math.min(bonuses.goldEfficiency, MAX_GOLD_EFFICIENCY * 100);
  bonuses.materialSave = Math.min(bonuses.materialSave, MAX_MATERIAL_SAVE * 100);

  return bonuses;
}

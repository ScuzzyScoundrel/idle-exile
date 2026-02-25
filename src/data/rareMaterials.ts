// ============================================================
// Idle Exile — Rare Material Definitions
// 25 rare materials: 5 professions × 5 rarity tiers
// ============================================================

import type { RareMaterialDef, RareMaterialRarity, GatheringProfession } from '../types';

export const RARE_MATERIAL_DEFS: RareMaterialDef[] = [
  // --- Mining ---
  { id: 'rough_gem',     profession: 'mining', rarity: 'common',    name: 'Rough Gem',     icon: '💎', description: 'A dull, uncut gemstone.' },
  { id: 'cut_gem',       profession: 'mining', rarity: 'uncommon',  name: 'Cut Gem',       icon: '💎', description: 'A cleanly faceted gem.' },
  { id: 'polished_gem',  profession: 'mining', rarity: 'rare',      name: 'Polished Gem',  icon: '💎', description: 'A brilliantly polished gemstone.' },
  { id: 'flawless_gem',  profession: 'mining', rarity: 'epic',      name: 'Flawless Gem',  icon: '💎', description: 'A gem without imperfection.' },
  { id: 'perfect_gem',   profession: 'mining', rarity: 'legendary', name: 'Perfect Gem',   icon: '💎', description: 'A gem of impossible clarity.' },

  // --- Herbalism ---
  { id: 'faint_essence',     profession: 'herbalism', rarity: 'common',    name: 'Faint Essence',     icon: '✨', description: 'A wisp of concentrated magic.' },
  { id: 'potent_essence',    profession: 'herbalism', rarity: 'uncommon',  name: 'Potent Essence',    icon: '✨', description: 'A volatile drop of essence.' },
  { id: 'brilliant_essence', profession: 'herbalism', rarity: 'rare',      name: 'Brilliant Essence', icon: '✨', description: 'An essence that hums with power.' },
  { id: 'radiant_essence',   profession: 'herbalism', rarity: 'epic',      name: 'Radiant Essence',   icon: '✨', description: 'Blinding essence of nature.' },
  { id: 'pure_essence',      profession: 'herbalism', rarity: 'legendary', name: 'Pure Essence',      icon: '✨', description: 'The purest distillation of life.' },

  // --- Skinning ---
  { id: 'beast_fang',       profession: 'skinning', rarity: 'common',    name: 'Beast Fang',       icon: '🦷', description: 'A common predator fang.' },
  { id: 'primal_fang',      profession: 'skinning', rarity: 'uncommon',  name: 'Primal Fang',      icon: '🦷', description: 'A fang from an ancient breed.' },
  { id: 'apex_fang',        profession: 'skinning', rarity: 'rare',      name: 'Apex Fang',        icon: '🦷', description: 'Fang of an apex predator.' },
  { id: 'mythic_fang',      profession: 'skinning', rarity: 'epic',      name: 'Mythic Fang',      icon: '🦷', description: 'A fang from a creature of legend.' },
  { id: 'primordial_fang',  profession: 'skinning', rarity: 'legendary', name: 'Primordial Fang',  icon: '🦷', description: 'Fang of a primordial beast.' },

  // --- Logging ---
  { id: 'amber_sap',           profession: 'logging', rarity: 'common',    name: 'Amber Sap',           icon: '🍯', description: 'Thick golden sap.' },
  { id: 'heartwood',           profession: 'logging', rarity: 'uncommon',  name: 'Heartwood',           icon: '🪵', description: 'Dense core wood.' },
  { id: 'ancient_heartwood',   profession: 'logging', rarity: 'rare',      name: 'Ancient Heartwood',   icon: '🪵', description: 'Wood from a centuries-old tree.' },
  { id: 'elder_heartwood',     profession: 'logging', rarity: 'epic',      name: 'Elder Heartwood',     icon: '🪵', description: 'Wood suffused with primal energy.' },
  { id: 'primordial_heartwood', profession: 'logging', rarity: 'legendary', name: 'Primordial Heartwood', icon: '🪵', description: 'Wood from the first tree.' },

  // --- Fishing ---
  { id: 'cloudy_pearl',   profession: 'fishing', rarity: 'common',    name: 'Cloudy Pearl',   icon: '🫧', description: 'A milky pearl.' },
  { id: 'lustrous_pearl', profession: 'fishing', rarity: 'uncommon',  name: 'Lustrous Pearl', icon: '🫧', description: 'A shimmering pearl.' },
  { id: 'radiant_pearl',  profession: 'fishing', rarity: 'rare',      name: 'Radiant Pearl',  icon: '🫧', description: 'A pearl that glows faintly.' },
  { id: 'pristine_pearl', profession: 'fishing', rarity: 'epic',      name: 'Pristine Pearl', icon: '🫧', description: 'A flawless pearl of the deep.' },
  { id: 'abyssal_pearl',  profession: 'fishing', rarity: 'legendary', name: 'Abyssal Pearl',  icon: '🫧', description: 'A pearl from the ocean abyss.' },
];

/**
 * Base rare drop rates per rarity tier, indexed by band (0-5 for bands 1-6).
 * These are base probabilities per gathering clear.
 */
export const RARE_DROP_RATES: Record<RareMaterialRarity, number[]> = {
  common:    [0.08,  0.10,  0.12,  0.14,  0.16,  0.18],
  uncommon:  [0.01,  0.02,  0.03,  0.04,  0.05,  0.07],
  rare:      [0.001, 0.003, 0.005, 0.01,  0.015, 0.025],
  epic:      [0.0001, 0.0005, 0.001, 0.002, 0.005, 0.01],
  legendary: [0,     0.0001, 0.0002, 0.0005, 0.001, 0.003],
};

/** Get all rare material defs for a specific gathering profession. */
export function getRareMaterialsForProfession(profession: GatheringProfession): RareMaterialDef[] {
  return RARE_MATERIAL_DEFS.filter(d => d.profession === profession);
}

/** Look up a single rare material def by id. */
export function getRareMaterialDef(id: string): RareMaterialDef | undefined {
  return RARE_MATERIAL_DEFS.find(d => d.id === id);
}

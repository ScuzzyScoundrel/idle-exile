// ============================================================
// Idle Exile — Crafting Profession Definitions
// ============================================================

import type { CraftingProfession, CraftingMilestone, CraftingSkills } from '../types';

export interface CraftingProfessionDef {
  id: CraftingProfession;
  name: string;
  icon: string;
  description: string;
}

export const CRAFTING_PROFESSION_DEFS: CraftingProfessionDef[] = [
  { id: 'weaponsmith', name: 'Weapons', icon: '\u2694\uFE0F', description: 'Forge weapons and offhands from ingots and planks.' },
  { id: 'armorer', name: 'Armorer', icon: '\uD83D\uDEE1\uFE0F', description: 'Craft plate armor and bracers from ingots and leather.' },
  { id: 'leatherworker', name: 'Leather', icon: '\uD83E\uDE21', description: 'Craft leather armor and cloaks.' },
  { id: 'tailor', name: 'Tailor', icon: '\uD83E\uDDF5', description: 'Weave cloth armor and enchanted garments.' },
  { id: 'alchemist', name: 'Alchemist', icon: '\u2697\uFE0F', description: 'Brew affix catalysts and consumables.' },
  { id: 'jeweler', name: 'Jeweler', icon: '\uD83D\uDC8D', description: 'Fashion rings, belts, amulets, and trinkets.' },
];

/** Milestones unlocked at specific crafting skill levels. */
export const CRAFTING_MILESTONES: CraftingMilestone[] = [
  { level: 10, type: 'pattern_bonus', value: 1, description: '+1 charge on patterns for this profession' },
  { level: 25, type: 'bonus_output', value: 0.05, description: '5% chance for bonus craft' },
  { level: 50, type: 'quality_boost', value: 0.10, description: '+10% chance for higher rarity' },
  { level: 75, type: 'efficiency', value: 0.25, description: '-25% material cost on recipes' },
  { level: 100, type: 'mastery', value: 0.50, description: 'Crafting mastery: +50% quality, +3 pattern charges' },
];

/** Minimum crafting skill level required per tier. */
export const CRAFTING_TIER_REQUIREMENTS: Record<number, number> = {
  1: 1,
  2: 15,
  3: 30,
  4: 50,
  5: 75,
  6: 90,
};

export function getCraftingProfessionDef(id: CraftingProfession): CraftingProfessionDef {
  return CRAFTING_PROFESSION_DEFS.find(p => p.id === id) ?? CRAFTING_PROFESSION_DEFS[0];
}

export function createDefaultCraftingSkills(): CraftingSkills {
  return {
    weaponsmith: { level: 1, xp: 0 },
    armorer: { level: 1, xp: 0 },
    leatherworker: { level: 1, xp: 0 },
    tailor: { level: 1, xp: 0 },
    alchemist: { level: 1, xp: 0 },
    jeweler: { level: 1, xp: 0 },
  };
}

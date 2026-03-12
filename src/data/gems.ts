// ============================================================
// Gem Definitions — socket gem types, tiers, and stat values
// ============================================================

import type { GemType, GemTier, GearSlot, StatKey } from '../types';

export interface GemDef {
  type: GemType;
  name: string;
  icon: string;
  stat: StatKey;
  category: 'defensive' | 'offensive';
  tiers: Record<GemTier, number>;
  description: string;
}

export const GEM_DEFS: Record<GemType, GemDef> = {
  // --- Defensive gems (armor slots) ---
  ruby:     { type: 'ruby',     name: 'Ruby',     icon: '🔴', stat: 'fireResist',      category: 'defensive', tiers: { 5: 6, 4: 8, 3: 10, 2: 12, 1: 15 }, description: 'Fire Resistance' },
  sapphire: { type: 'sapphire', name: 'Sapphire', icon: '🔵', stat: 'coldResist',      category: 'defensive', tiers: { 5: 6, 4: 8, 3: 10, 2: 12, 1: 15 }, description: 'Cold Resistance' },
  topaz:    { type: 'topaz',    name: 'Topaz',    icon: '🟡', stat: 'lightningResist', category: 'defensive', tiers: { 5: 6, 4: 8, 3: 10, 2: 12, 1: 15 }, description: 'Lightning Resistance' },
  amethyst: { type: 'amethyst', name: 'Amethyst', icon: '🟣', stat: 'chaosResist',     category: 'defensive', tiers: { 5: 6, 4: 8, 3: 10, 2: 12, 1: 15 }, description: 'Chaos Resistance' },
  jade:     { type: 'jade',     name: 'Jade',     icon: '🟢', stat: 'armor',           category: 'defensive', tiers: { 5: 12, 4: 20, 3: 30, 2: 45, 1: 60 }, description: 'Armor' },
  emerald:  { type: 'emerald',  name: 'Emerald',  icon: '💚', stat: 'evasion',         category: 'defensive', tiers: { 5: 12, 4: 20, 3: 30, 2: 45, 1: 60 }, description: 'Evasion' },
  garnet:   { type: 'garnet',   name: 'Garnet',   icon: '❤️', stat: 'maxLife',         category: 'defensive', tiers: { 5: 8, 4: 12, 3: 18, 2: 25, 1: 35 }, description: 'Maximum Life' },
  opal:     { type: 'opal',     name: 'Opal',     icon: '🤍', stat: 'energyShield',    category: 'defensive', tiers: { 5: 6, 4: 10, 3: 15, 2: 22, 1: 30 }, description: 'Energy Shield' },

  // --- Offensive gems (weapon + ring slots) ---
  crimson:  { type: 'crimson',  name: 'Crimson',  icon: '⚔️', stat: 'flatPhysDamage',         category: 'offensive', tiers: { 5: 2, 4: 3, 3: 5, 2: 7, 1: 10 }, description: 'Physical Damage' },
  ember:    { type: 'ember',    name: 'Ember',    icon: '🔥', stat: 'flatAtkFireDamage',      category: 'offensive', tiers: { 5: 2, 4: 3, 3: 5, 2: 7, 1: 10 }, description: 'Fire Damage' },
  frost:    { type: 'frost',    name: 'Frost',    icon: '❄️', stat: 'flatAtkColdDamage',      category: 'offensive', tiers: { 5: 2, 4: 3, 3: 5, 2: 7, 1: 10 }, description: 'Cold Damage' },
  storm:    { type: 'storm',    name: 'Storm',    icon: '⚡', stat: 'flatAtkLightningDamage', category: 'offensive', tiers: { 5: 2, 4: 3, 3: 5, 2: 7, 1: 10 }, description: 'Lightning Damage' },
  blight:   { type: 'blight',   name: 'Blight',   icon: '☠️', stat: 'flatAtkChaosDamage',     category: 'offensive', tiers: { 5: 1, 4: 2, 3: 3, 2: 5, 1: 7 }, description: 'Chaos Damage' },
  amber:    { type: 'amber',    name: 'Amber',    icon: '🟠', stat: 'attackSpeed',            category: 'offensive', tiers: { 5: 2, 4: 3, 3: 4, 2: 6, 1: 8 }, description: 'Attack Speed' },
  diamond:  { type: 'diamond',  name: 'Diamond',  icon: '💎', stat: 'critChance',             category: 'offensive', tiers: { 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 }, description: 'Critical Strike Chance' },
  obsidian: { type: 'obsidian', name: 'Obsidian', icon: '⬛', stat: 'critMultiplier',         category: 'offensive', tiers: { 5: 3, 4: 5, 3: 8, 2: 12, 1: 15 }, description: 'Critical Strike Multiplier' },
  prism:    { type: 'prism',    name: 'Prism',    icon: '🌈', stat: 'incElementalDamage',     category: 'offensive', tiers: { 5: 3, 4: 5, 3: 8, 2: 12, 1: 15 }, description: 'Elemental Damage' },
};

export const GEM_TIER_NAMES: Record<GemTier, string> = {
  5: 'Chipped',
  4: 'Flawed',
  3: 'Standard',
  2: 'Flawless',
  1: 'Perfect',
};

export const GEM_TIER_COLORS: Record<GemTier, string> = {
  5: 'text-gray-400',    // common
  4: 'text-green-400',   // uncommon
  3: 'text-blue-400',    // rare
  2: 'text-purple-400',  // epic
  1: 'text-yellow-400',  // legendary
};

const DEFENSIVE_SLOTS: GearSlot[] = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots'];
const OFFENSIVE_SLOTS: GearSlot[] = ['mainhand', 'ring1', 'ring2'];

/** Get the definition for a gem type. */
export function getGemDef(type: GemType): GemDef {
  return GEM_DEFS[type];
}

/** Get the flat stat value for a gem type at a specific tier. */
export function getGemValue(type: GemType, tier: GemTier): number {
  return GEM_DEFS[type].tiers[tier];
}

/** Get which gem types are valid for a given gear slot. */
export function getGemsForSlot(slot: GearSlot): GemDef[] {
  if (DEFENSIVE_SLOTS.includes(slot)) {
    return Object.values(GEM_DEFS).filter(d => d.category === 'defensive');
  }
  if (OFFENSIVE_SLOTS.includes(slot)) {
    return Object.values(GEM_DEFS).filter(d => d.category === 'offensive');
  }
  return [];
}

/** Check if a gem category is valid for a given slot. */
export function isGemValidForSlot(type: GemType, slot: GearSlot): boolean {
  const def = GEM_DEFS[type];
  if (def.category === 'defensive') return DEFENSIVE_SLOTS.includes(slot);
  if (def.category === 'offensive') return OFFENSIVE_SLOTS.includes(slot);
  return false;
}

/** All gem types as an array (useful for random selection). */
export const ALL_GEM_TYPES = Object.keys(GEM_DEFS) as GemType[];
export const DEFENSIVE_GEM_TYPES = ALL_GEM_TYPES.filter(t => GEM_DEFS[t].category === 'defensive');
export const OFFENSIVE_GEM_TYPES = ALL_GEM_TYPES.filter(t => GEM_DEFS[t].category === 'offensive');

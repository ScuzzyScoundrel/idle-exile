import type { Rarity } from '../../types';

export const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

export const AFFIX_TIER_TEXT: Record<number, string> = {
  1: 'text-orange-400',
  2: 'text-purple-400',
  3: 'text-blue-400',
  5: 'text-green-400',
  6: 'text-gray-400',
};

export const CRAFT_AUTO_SALVAGE_OPTIONS: { value: Rarity; label: string }[] = [
  { value: 'common', label: 'None' },
  { value: 'uncommon', label: 'Common' },
  { value: 'rare', label: '\u2264 Uncommon' },
  { value: 'epic', label: '\u2264 Rare' },
  { value: 'legendary', label: '\u2264 Epic' },
];

export const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
};

export const RARITY_GRADIENT: Record<Rarity, string> = {
  common: 'from-green-900/50',
  uncommon: 'from-blue-900/50',
  rare: 'from-yellow-900/50',
  epic: 'from-purple-900/50',
  legendary: 'from-orange-900/50',
};

export const VARIANT_COLORS: Record<string, string> = {
  general: 'border-l-teal-500',
  specialist: 'border-l-amber-500',
  masterwork: 'border-l-purple-500',
};

export const VARIANT_BADGE: Record<string, string> = {
  general: 'bg-teal-900/60 text-teal-300',
  specialist: 'bg-amber-900/60 text-amber-300',
  masterwork: 'bg-purple-900/60 text-purple-300',
};

export const TIER_BORDER: Record<number, string> = {
  1: 'border-l-gray-500',
  2: 'border-l-green-500',
  3: 'border-l-blue-500',
  4: 'border-l-purple-500',
  5: 'border-l-orange-500',
  6: 'border-l-red-500',
};

export const TIER_BADGE: Record<number, string> = {
  1: 'bg-gray-600 text-gray-200',
  2: 'bg-green-900/60 text-green-300',
  3: 'bg-blue-900/60 text-blue-300',
  4: 'bg-purple-900/60 text-purple-300',
  5: 'bg-orange-900/60 text-orange-300',
  6: 'bg-red-900/60 text-red-300',
};

export const SLOT_ICONS: Record<string, string> = {
  mainhand: '\u2694\uFE0F', offhand: '\uD83D\uDEE1\uFE0F',
  helmet: '\u26D1\uFE0F', neck: '\uD83D\uDCAE', shoulders: '\uD83E\uDDD1',
  cloak: '\uD83E\uDDE5', chest: '\uD83E\uDDB4', bracers: '\uD83D\uDD8A\uFE0F',
  gloves: '\uD83E\uDDE4', belt: '\u{1F4FF}', pants: '\uD83D\uDC56',
  boots: '\uD83E\uDD7E', ring1: '\uD83D\uDC8D', ring2: '\uD83D\uDC8D',
  trinket1: '\u2728', trinket2: '\u2728',
};

export const CATEGORY_LABELS: Record<string, string> = {
  sword: 'Swords', axe: 'Axes', mace: 'Maces', dagger: 'Daggers',
  staff: 'Staves', wand: 'Wands', bow: 'Bows', crossbow: 'Crossbows',
  offhand: 'Offhands',
  helmet: 'Helmets', chest: 'Chest',
  gloves: 'Gloves', pants: 'Legs', boots: 'Boots',
  shoulders: 'Shoulders', cloak: 'Cloaks', bracers: 'Bracers',
  neck: 'Neck', belt: 'Belts',
  ring1: 'Rings', ring2: 'Rings',
  trinket1: 'Trinkets', trinket2: 'Trinkets',
  mainhand: 'Weapons',
  catalyst: 'Catalysts',
};

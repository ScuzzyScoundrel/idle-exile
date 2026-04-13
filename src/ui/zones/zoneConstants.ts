import type { Rarity, GatheringProfession, WeaponType, MobDropRarity, MobDamageElement } from '../../types';

// Band visual theming
export const BAND_GRADIENTS: Record<number, string> = {
  1: 'bg-gradient-to-br from-emerald-900 via-green-800 to-lime-900',
  2: 'bg-gradient-to-br from-sky-900 via-cyan-800 to-teal-900',
  3: 'bg-gradient-to-br from-red-900 via-orange-800 to-yellow-900',
  4: 'bg-gradient-to-br from-slate-900 via-gray-800 to-purple-900',
  5: 'bg-gradient-to-br from-indigo-900 via-violet-800 to-blue-900',
  6: 'bg-gradient-to-br from-black via-red-950 to-purple-950',
};

export const BAND_BORDERS: Record<number, string> = {
  1: 'border-emerald-700',
  2: 'border-cyan-700',
  3: 'border-red-700',
  4: 'border-slate-600',
  5: 'border-indigo-700',
  6: 'border-red-900',
};

export const BAND_EMOJIS: Record<number, string> = {
  1: '\u{1F332}',
  2: '\u{26F0}\uFE0F',
  3: '\u2694\uFE0F',
  4: '\u{1F480}',
  5: '\u26A1',
  6: '\u{1F311}',
};

// Element display config (per-mob damage types)
export const ELEMENT_COLORS: Record<MobDamageElement, string> = {
  physical: 'text-gray-400',
  fire: 'text-red-400',
  cold: 'text-blue-400',
  lightning: 'text-yellow-400',
  chaos: 'text-purple-400',
};

export const ELEMENT_ICONS: Record<MobDamageElement, string> = {
  physical: '\u2694\uFE0F',
  fire: '\u{1F525}',
  cold: '\u2744\uFE0F',
  lightning: '\u26A1',
  chaos: '\u{1F480}',
};

export const ELEMENT_LABELS: Record<MobDamageElement, string> = {
  physical: 'Physical',
  fire: 'Fire',
  cold: 'Cold',
  lightning: 'Lightning',
  chaos: 'Chaos',
};

/** @deprecated Hazards removed — kept for any straggling references. */
export const HAZARD_COLORS = ELEMENT_COLORS;
/** @deprecated Hazards removed — kept for any straggling references. */
export const HAZARD_ICONS = ELEMENT_ICONS;
/** @deprecated Hazards removed. */
export const HAZARD_STAT_MAP: Record<string, string> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  chaos: 'chaosResist',
};

// Debuff badge color/label mapping
export const DEBUFF_META: Record<string, {
  text: string; bg: string; label: string;
  fullName: string; description: string;
}> = {
  chilled:    { text: 'text-cyan-300',   bg: 'bg-cyan-900/60',   label: 'CHI',
    fullName: 'Chilled', description: 'Enemy attack speed reduced by 20%.' },
  frostbite:  { text: 'text-sky-300',    bg: 'bg-sky-900/60',    label: 'FRB',
    fullName: 'Frostbite', description: 'Cold damage over time. Each stack snapshots hit damage; 15% of total snapshot per second. Max 5 stacks.' },
  shocked:    { text: 'text-yellow-300', bg: 'bg-yellow-900/60', label: 'SHK',
    fullName: 'Shocked', description: 'Enemy takes 8% increased damage per stack (max 3 stacks).' },
  burning:    { text: 'text-orange-400', bg: 'bg-orange-900/60', label: 'BRN',
    fullName: 'Ignite', description: 'Burns for 1% of enemy max HP per second per stack (max 5 stacks).' },
  poisoned:   { text: 'text-green-400',  bg: 'bg-green-900/60',  label: 'PSN',
    fullName: 'Poisoned', description: 'Deals chaos damage over time. Each hit creates a separate poison instance dealing 15% of hit damage per second.' },
  bleeding:   { text: 'text-red-400',    bg: 'bg-red-900/60',    label: 'BLD',
    fullName: 'Bleeding', description: 'Deals physical damage each time the enemy attacks. Each stack snapshots hit damage; 30% of total triggers per enemy attack. Max 5 stacks.' },
  weakened:   { text: 'text-gray-300',   bg: 'bg-gray-700/60',   label: 'WKN',
    fullName: 'Weakened', description: 'Enemy deals 10% less damage.' },
  hexed:      { text: 'text-purple-300', bg: 'bg-purple-900/60', label: 'HEX',
    fullName: 'Hexed', description: 'Enemy deals 20% less damage. Soul Harvest consumes Hexed for 2× damage.' },
  blinded:    { text: 'text-violet-300', bg: 'bg-violet-900/60', label: 'BLN',
    fullName: 'Blinded', description: 'Enemy has a 20% chance to miss attacks.' },
  vulnerable: { text: 'text-pink-400',   bg: 'bg-pink-900/60',   label: 'VLN',
    fullName: 'Vulnerable', description: 'Enemy takes 20% more damage from all sources.' },
  cursed:     { text: 'text-purple-400', bg: 'bg-purple-900/60', label: 'CRS',
    fullName: 'Cursed', description: 'Reduces enemy resistances by 15 per stack (max 3 stacks).' },
  slowed:     { text: 'text-teal-300',   bg: 'bg-teal-900/60',   label: 'SLO',
    fullName: 'Slowed', description: 'Enemy attack speed reduced by 20%.' },
  corroded:   { text: 'text-amber-400',  bg: 'bg-amber-900/60',  label: 'COR',
    fullName: 'Corroded', description: 'Enemy takes 20% more damage from all sources.' },
  deathMark:  { text: 'text-red-300',    bg: 'bg-red-900/60',    label: 'DTH',
    fullName: 'Death Mark', description: 'Marked for death. Next hit deals bonus damage and consumes the mark.' },
  executionersMark: { text: 'text-red-300', bg: 'bg-red-900/60', label: 'EXE',
    fullName: "Executioner's Mark", description: 'Marked for execution. Next hit deals bonus damage and consumes the mark.' },
  shatterMark: { text: 'text-cyan-300',  bg: 'bg-cyan-900/60',   label: 'SHT',
    fullName: 'Shatter Mark', description: 'Marked for shattering. Next hit deals bonus cold damage.' },
  cobraMark:  { text: 'text-green-300',  bg: 'bg-green-900/60',  label: 'CBR',
    fullName: 'Cobra Mark', description: 'Marked by the cobra. Next hit deals bonus damage.' },
  guillotineMark: { text: 'text-red-300', bg: 'bg-red-900/60',   label: 'GIL',
    fullName: 'Guillotine Mark', description: 'Marked for execution. Next hit deals massive bonus damage.' },
  thunderousMark: { text: 'text-blue-300', bg: 'bg-blue-900/60', label: 'THN',
    fullName: 'Thunderous Mark', description: 'Marked by thunder. Next hit deals bonus lightning damage.' },
};

// Mob drop rarity colors
export const MOB_DROP_RARITY_COLOR: Record<MobDropRarity, string> = {
  common: 'text-amber-400/80',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-300',
};

// Rarity color classes
export const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
  unique: 'text-amber-400',
};

export const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-orange-600',
  unique: 'border-amber-600',
};

export const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-gray-700/50',
  uncommon: 'bg-green-900/40',
  rare: 'bg-blue-900/40',
  epic: 'bg-purple-900/40',
  legendary: 'bg-orange-900/40',
  unique: 'bg-amber-900/40',
};

// Gathering profession icons
export const PROFESSION_ICONS: Record<GatheringProfession, string> = {
  mining: '\u26CF\uFE0F',
  herbalism: '\uD83C\uDF3F',
  skinning: '\uD83E\uDE93',
  logging: '\uD83E\uDEB5',
  fishing: '\uD83C\uDFA3',
};

export const WEAPON_ICONS: Partial<Record<WeaponType, string>> = {
  sword: '\u2694\uFE0F', axe: '\uD83E\uDE93', mace: '\uD83D\uDD28', dagger: '\uD83D\uDDE1\uFE0F',
  staff: '\uD83E\uDE84', wand: '\u2728', bow: '\uD83C\uDFF9', crossbow: '\uD83C\uDFAF',
  greatsword: '\u2694\uFE0F', greataxe: '\uD83E\uDE93', maul: '\uD83D\uDD28',
  scepter: '\uD83E\uDE84', gauntlet: '\uD83E\uDD4A', tome: '\uD83D\uDCD6',
};

export const KIND_BADGE_COLORS: Record<string, string> = {
  active: 'bg-yellow-900 text-yellow-300',
  passive: 'bg-gray-700 text-gray-300',
  buff: 'bg-blue-900 text-blue-300',
  instant: 'bg-orange-900 text-orange-300',
  proc: 'bg-purple-900 text-purple-300',
  toggle: 'bg-green-900 text-green-300',
  ultimate: 'bg-yellow-900 text-yellow-300',
};

export const MASTERY_ICONS: Record<string, { icon: string; cls: string }> = {
  bronze: { icon: '\u{1F944}', cls: 'text-amber-600' },
  silver: { icon: '\u{1FA99}', cls: 'text-gray-300' },
  gold:   { icon: '\u{1F3C6}', cls: 'text-yellow-400' },
};

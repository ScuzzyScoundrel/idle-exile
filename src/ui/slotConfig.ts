import type { GearSlot } from '../types';

/** Human-readable labels and icons for each gear slot. */
export interface SlotInfo {
  label: string;
  icon: string;
}

export const SLOT_CONFIG: Record<GearSlot, SlotInfo> = {
  helmet:   { label: 'Helmet',   icon: '\u{1FA96}' },   // 🪖
  neck:     { label: 'Neck',     icon: '\uD83D\uDCFF' }, // 📿
  shoulders:{ label: 'Shoulders',icon: '\uD83E\uDDB6' }, // 🦶 (placeholder)
  cloak:    { label: 'Cloak',    icon: '\uD83E\uDDE5' }, // 🧥
  chest:    { label: 'Chest',    icon: '\uD83D\uDEE1\uFE0F' },  // 🛡️
  bracers:  { label: 'Bracers',  icon: '\uD83E\uDD4A' }, // 🥊
  gloves:   { label: 'Gloves',   icon: '\uD83E\uDDE4' }, // 🧤
  belt:     { label: 'Belt',     icon: '\u2935\uFE0F' },  // ⤵️
  pants:    { label: 'Pants',    icon: '\uD83D\uDC56' }, // 👖
  boots:    { label: 'Boots',    icon: '\uD83E\uDD7E' }, // 🥾
  ring1:    { label: 'Ring',     icon: '\uD83D\uDC8D' }, // 💍
  ring2:    { label: 'Ring',     icon: '\uD83D\uDC8D' }, // 💍
  trinket1: { label: 'Trinket',  icon: '\uD83D\uDD2E' }, // 🔮
  trinket2: { label: 'Trinket',  icon: '\uD83D\uDD2E' }, // 🔮
  mainhand: { label: 'Main Hand',icon: '\u2694\uFE0F' },  // ⚔️
  offhand:  { label: 'Off Hand', icon: '\uD83D\uDEE1\uFE0F' },  // 🛡️
};

/** Get the icon for a gear slot, with fallback. */
export function slotIcon(slot: GearSlot): string {
  return SLOT_CONFIG[slot]?.icon ?? '\u2753'; // ❓
}

/** Get the label for a gear slot. */
export function slotLabel(slot: GearSlot): string {
  return SLOT_CONFIG[slot]?.label ?? slot;
}

/** Slots that currently have item drops / base definitions. */
export const DROPPABLE_SLOTS: GearSlot[] = [
  'mainhand', 'offhand',
  'helmet', 'neck', 'shoulders', 'cloak',
  'chest', 'bracers', 'gloves', 'belt',
  'pants', 'boots',
  'ring1', 'trinket1',
];

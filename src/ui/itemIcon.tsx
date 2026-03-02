import { useState } from 'react';
import { Item, GearSlot } from '../types';
import { SLOT_CONFIG } from './slotConfig';

// ---------------------------------------------------------------------------
// Icon-key resolution
// ---------------------------------------------------------------------------

/** Normalize paired slots (ring1/ring2 → ring, trinket1/trinket2 → trinket). */
function normalizeSlot(slot: GearSlot): string {
  if (slot === 'ring1' || slot === 'ring2') return 'ring';
  if (slot === 'trinket1' || slot === 'trinket2') return 'trinket';
  return slot;
}

/**
 * Derive the icon lookup key for an item.
 * Resolution: weaponType → offhandType → armorType_slot → slot
 */
export function getItemIconKey(item: Item): string {
  if (item.weaponType) return item.weaponType;
  if (item.offhandType) return item.offhandType;
  if (item.armorType) return `${item.armorType}_${normalizeSlot(item.slot)}`;
  return normalizeSlot(item.slot);
}

/** Get the emoji for a gear slot (for filters / text contexts). */
export function getSlotEmoji(slot: GearSlot): string {
  return SLOT_CONFIG[slot]?.icon ?? '\u2753';
}

// ---------------------------------------------------------------------------
// 404 cache — prevents repeat network hits for missing icons
// ---------------------------------------------------------------------------

const iconStatus = new Map<string, boolean>(); // true = loaded, false = broken

function iconUrl(key: string): string {
  return `/icons/gear/${key}.webp`;
}

// ---------------------------------------------------------------------------
// Size presets
// ---------------------------------------------------------------------------

type IconSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const EMOJI_SIZE: Record<IconSize, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
};

// ---------------------------------------------------------------------------
// <ItemIcon />  — renders graphic icon with emoji fallback
// ---------------------------------------------------------------------------

export function ItemIcon({
  item,
  size = 'md',
  className = '',
}: {
  item: Item;
  size?: IconSize;
  className?: string;
}) {
  const key = getItemIconKey(item);
  const cached = iconStatus.get(key);
  const [broken, setBroken] = useState(cached === false);

  // Already known broken → emoji immediately
  if (broken || cached === false) {
    return (
      <span className={`${EMOJI_SIZE[size]} leading-none ${className}`}>
        {getSlotEmoji(item.slot)}
      </span>
    );
  }

  return (
    <img
      src={iconUrl(key)}
      alt={key}
      loading="lazy"
      className={`${SIZE_CLASS[size]} object-contain ${className}`}
      onLoad={() => { iconStatus.set(key, true); }}
      onError={() => {
        iconStatus.set(key, false);
        setBroken(true);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// <SlotIcon />  — for empty equip slots (faint placeholder)
// ---------------------------------------------------------------------------

/** Icon key for an empty slot (uses slot name, not weapon/armor type). */
function slotIconKey(slot: GearSlot): string {
  return normalizeSlot(slot);
}

export function SlotIcon({
  slot,
  size = 'md',
  className = '',
}: {
  slot: GearSlot;
  size?: IconSize;
  className?: string;
}) {
  const key = slotIconKey(slot);
  const cached = iconStatus.get(key);
  const [broken, setBroken] = useState(cached === false);

  if (broken || cached === false) {
    return (
      <span className={`${EMOJI_SIZE[size]} leading-none ${className}`}>
        {getSlotEmoji(slot)}
      </span>
    );
  }

  return (
    <img
      src={iconUrl(key)}
      alt={key}
      loading="lazy"
      className={`${SIZE_CLASS[size]} object-contain ${className}`}
      onLoad={() => { iconStatus.set(key, true); }}
      onError={() => {
        iconStatus.set(key, false);
        setBroken(true);
      }}
    />
  );
}

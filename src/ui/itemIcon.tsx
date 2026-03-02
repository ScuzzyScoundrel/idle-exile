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
 * Derive the icon lookup key for an item (type only, no tier).
 * Resolution: weaponType → offhandType → armorType_slot → slot
 */
export function getItemIconKey(item: Item): string {
  if (item.weaponType) return item.weaponType;
  if (item.offhandType) return item.offhandType;
  if (item.armorType) return `${item.armorType}_${normalizeSlot(item.slot)}`;
  return normalizeSlot(item.slot);
}

/**
 * Map item iLvl to a visual tier (t1-t7).
 * Bands: 1-10 → t1, 11-20 → t2, 21-30 → t3, 31-40 → t4, 41-50 → t5, 51-60 → t6, 61+ → t7
 */
function getVisualTier(iLvl: number): number {
  if (iLvl <= 10) return 1;
  if (iLvl <= 20) return 2;
  if (iLvl <= 30) return 3;
  if (iLvl <= 40) return 4;
  if (iLvl <= 50) return 5;
  if (iLvl <= 60) return 6;
  return 7;
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
  sm: 'w-5 h-5',
  md: 'w-9 h-9',
  lg: 'w-3/4 h-3/4',
};

const EMOJI_SIZE: Record<IconSize, string> = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-3xl',
};

// ---------------------------------------------------------------------------
// <ItemIcon />  — renders graphic icon with emoji fallback
// Tries: tier-specific (sword_t3.webp) → type (sword.webp) → emoji
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
  const baseKey = getItemIconKey(item);
  const tier = getVisualTier(item.iLvl);
  const tierKey = `${baseKey}_t${tier}`;

  // Determine which key to try first
  const tierStatus = iconStatus.get(tierKey);
  const baseStatus = iconStatus.get(baseKey);

  // Pick best available: tier-specific → type-level → emoji
  let srcKey: string | null = null;
  if (tierStatus !== false) {
    srcKey = tierKey; // try tier first (unknown or known good)
  } else if (baseStatus !== false) {
    srcKey = baseKey; // tier broken, try base
  }
  // else both broken → emoji

  const [fallback, setFallback] = useState<'tier' | 'base' | 'emoji'>(() => {
    if (tierStatus === false && baseStatus === false) return 'emoji';
    if (tierStatus === false) return 'base';
    return 'tier';
  });

  // Emoji fallback
  if (fallback === 'emoji' || (srcKey === null)) {
    return (
      <span className={`${EMOJI_SIZE[size]} leading-none ${className}`}>
        {getSlotEmoji(item.slot)}
      </span>
    );
  }

  const currentKey = fallback === 'tier' ? tierKey : baseKey;

  return (
    <img
      src={iconUrl(currentKey)}
      alt={baseKey}
      loading="lazy"
      className={`${SIZE_CLASS[size]} object-contain ${className}`}
      onLoad={() => { iconStatus.set(currentKey, true); }}
      onError={() => {
        iconStatus.set(currentKey, false);
        if (fallback === 'tier' && baseStatus !== false) {
          // Tier missing, try base
          setFallback('base');
        } else {
          // Base also missing (or we were already on base), go to emoji
          iconStatus.set(baseKey, false);
          setFallback('emoji');
        }
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// <SlotIcon />  — for empty equip slots (faint placeholder)
// ---------------------------------------------------------------------------

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

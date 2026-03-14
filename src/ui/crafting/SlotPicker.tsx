import { useState } from 'react';
import { CATEGORY_LABELS } from './craftingConstants';
import type { WorkbenchSlot } from './craftingHelpers';

interface SlotPickerProps {
  selected: WorkbenchSlot | 'all';
  onSelect: (slot: WorkbenchSlot | 'all') => void;
}

interface SlotDef {
  key: WorkbenchSlot;
  /** Gear icon filename (without .webp) under /icons/gear/ */
  gearIcon: string;
  /** Emoji fallback */
  emoji: string;
  name: string;
}

interface SlotGroup {
  label: string;
  slots: SlotDef[];
}

const GROUPS: SlotGroup[] = [
  {
    label: 'Weapons',
    slots: [
      { key: 'sword',    gearIcon: 'sword',    emoji: '\u2694\uFE0F',       name: 'Sword' },
      { key: 'dagger',   gearIcon: 'dagger',   emoji: '\uD83D\uDDE1\uFE0F', name: 'Dagger' },
      { key: 'axe',      gearIcon: 'axe',      emoji: '\uD83E\uDE93',       name: 'Axe' },
      { key: 'mace',     gearIcon: 'mace',     emoji: '\uD83D\uDD28',       name: 'Mace' },
      { key: 'bow',      gearIcon: 'bow',      emoji: '\uD83C\uDFF9',       name: 'Bow' },
      { key: 'crossbow', gearIcon: 'crossbow', emoji: '\uD83C\uDFAF',       name: 'Xbow' },
      { key: 'wand',     gearIcon: 'wand',     emoji: '\uD83E\uDE84',       name: 'Wand' },
      { key: 'staff',    gearIcon: 'staff',    emoji: '\uD83D\uDCD6',       name: 'Staff' },
    ],
  },
  {
    label: 'Defense',
    slots: [
      { key: 'shield',    gearIcon: 'shield',          emoji: '\uD83D\uDEE1\uFE0F', name: 'Shield' },
      { key: 'helmet',    gearIcon: 'plate_helmet',    emoji: '\u26D1\uFE0F',       name: 'Helm' },
      { key: 'chest',     gearIcon: 'plate_chest',     emoji: '\uD83D\uDC55',       name: 'Chest' },
      { key: 'gloves',    gearIcon: 'plate_gloves',    emoji: '\uD83E\uDDE4',       name: 'Gloves' },
      { key: 'pants',     gearIcon: 'plate_pants',     emoji: '\uD83D\uDC56',       name: 'Pants' },
      { key: 'boots',     gearIcon: 'plate_boots',     emoji: '\uD83E\uDD7E',       name: 'Boots' },
      { key: 'cloak',     gearIcon: 'cloak',           emoji: '\uD83E\uDDE5',       name: 'Cloak' },
      { key: 'shoulders', gearIcon: 'plate_shoulders', emoji: '\uD83E\uDDB6',       name: 'Shoulders' },
    ],
  },
  {
    label: 'Accessory',
    slots: [
      { key: 'ring',    gearIcon: 'ring',    emoji: '\uD83D\uDC8D', name: 'Ring' },
      { key: 'amulet',  gearIcon: 'neck',    emoji: '\uD83D\uDCFF', name: 'Neck' },
      { key: 'belt',    gearIcon: 'belt',    emoji: '\u{1F4FF}',    name: 'Belt' },
      { key: 'trinket', gearIcon: 'trinket', emoji: '\uD83D\uDD2E', name: 'Trinket' },
    ],
  },
  {
    label: 'Other',
    slots: [
      { key: 'catalyst', gearIcon: '', emoji: '\u2697\uFE0F', name: 'Catalysts' },
    ],
  },
];

// Track broken icon URLs so we don't retry on every render
const brokenIcons = new Set<string>();

function SlotIcon({ gearIcon, emoji }: { gearIcon: string; emoji: string }) {
  const [isBroken, setIsBroken] = useState(brokenIcons.has(gearIcon));

  if (!gearIcon || isBroken) {
    return <span className="text-base leading-none">{emoji}</span>;
  }

  return (
    <img
      src={`/icons/gear/${gearIcon}.webp`}
      alt={gearIcon}
      loading="lazy"
      className="w-7 h-7 object-contain"
      onError={() => { brokenIcons.add(gearIcon); setIsBroken(true); }}
    />
  );
}

export function SlotPicker({ selected, onSelect }: SlotPickerProps) {
  return (
    <div className="space-y-2">
      {/* All button */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onSelect('all')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            selected === 'all'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All
        </button>
      </div>

      {/* Slot groups */}
      {GROUPS.map(group => (
        <div key={group.label}>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{group.label}</div>
          <div className="flex flex-wrap gap-1">
            {group.slots.map(({ key, gearIcon, emoji, name }) => (
              <button
                key={key}
                onClick={() => onSelect(key)}
                title={CATEGORY_LABELS[key] ?? name}
                className={`flex flex-col items-center justify-center w-11 h-11 rounded transition-colors text-center ${
                  selected === key
                    ? 'bg-amber-700/60 ring-2 ring-amber-400 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <SlotIcon gearIcon={gearIcon} emoji={emoji} />
                <span className="text-[8px] leading-tight mt-0.5 truncate w-full">{name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

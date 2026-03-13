import { CATEGORY_LABELS } from './craftingConstants';
import type { WorkbenchSlot } from './craftingHelpers';

interface SlotPickerProps {
  selected: WorkbenchSlot | 'all';
  onSelect: (slot: WorkbenchSlot | 'all') => void;
}

interface SlotGroup {
  label: string;
  slots: { key: WorkbenchSlot; icon: string; name: string }[];
}

const GROUPS: SlotGroup[] = [
  {
    label: 'Weapons',
    slots: [
      { key: 'sword',    icon: '\u2694\uFE0F', name: 'Sword' },
      { key: 'dagger',   icon: '\uD83D\uDDE1\uFE0F', name: 'Dagger' },
      { key: 'axe',      icon: '\uD83E\uDE93', name: 'Axe' },
      { key: 'mace',     icon: '\uD83D\uDD28', name: 'Mace' },
      { key: 'bow',      icon: '\uD83C\uDFF9', name: 'Bow' },
      { key: 'crossbow', icon: '\uD83C\uDFAF', name: 'Xbow' },
      { key: 'wand',     icon: '\uD83E\uDE84', name: 'Wand' },
      { key: 'staff',    icon: '\uD83D\uDCD6', name: 'Staff' },
    ],
  },
  {
    label: 'Defense',
    slots: [
      { key: 'shield',    icon: '\uD83D\uDEE1\uFE0F', name: 'Shield' },
      { key: 'helmet',    icon: '\u26D1\uFE0F', name: 'Helm' },
      { key: 'chest',     icon: '\uD83D\uDC55', name: 'Chest' },
      { key: 'gloves',    icon: '\uD83E\uDDE4', name: 'Gloves' },
      { key: 'pants',     icon: '\uD83D\uDC56', name: 'Pants' },
      { key: 'boots',     icon: '\uD83E\uDD7E', name: 'Boots' },
      { key: 'cloak',     icon: '\uD83E\uDDE5', name: 'Cloak' },
      { key: 'shoulders', icon: '\uD83E\uDDB6', name: 'Shoulders' },
    ],
  },
  {
    label: 'Accessory',
    slots: [
      { key: 'ring',    icon: '\uD83D\uDC8D', name: 'Ring' },
      { key: 'amulet',  icon: '\uD83D\uDCFF', name: 'Neck' },
      { key: 'belt',    icon: '\u{1F4FF}',     name: 'Belt' },
      { key: 'trinket', icon: '\uD83D\uDD2E', name: 'Trinket' },
    ],
  },
  {
    label: 'Other',
    slots: [
      { key: 'catalyst', icon: '\u2697\uFE0F', name: 'Catalysts' },
    ],
  },
];

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
            {group.slots.map(({ key, icon, name }) => (
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
                <span className="text-base leading-none">{icon}</span>
                <span className="text-[8px] leading-tight mt-0.5 truncate w-full">{name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

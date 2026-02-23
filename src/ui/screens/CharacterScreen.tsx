import { useGameStore } from '../../store/gameStore';
import { StatKey, GearSlot } from '../../types';
import ItemCard from '../components/ItemCard';

const STAT_CONFIG: { key: StatKey; label: string; icon: string; format?: (v: number) => string }[] = [
  { key: 'damage', label: 'Damage', icon: '\u2694\uFE0F' },
  { key: 'attackSpeed', label: 'Attack Speed', icon: '\u26A1', format: (v) => v.toFixed(1) },
  { key: 'critChance', label: 'Crit Chance', icon: '\uD83C\uDFAF', format: (v) => `${v.toFixed(1)}%` },
  { key: 'critDamage', label: 'Crit Damage', icon: '\uD83D\uDCA5', format: (v) => `${v.toFixed(0)}%` },
  { key: 'life', label: 'Life', icon: '\u2764\uFE0F' },
  { key: 'armor', label: 'Armor', icon: '\uD83D\uDEE1\uFE0F' },
  { key: 'dodgeChance', label: 'Dodge', icon: '\uD83D\uDCA8', format: (v) => `${v.toFixed(1)}%` },
  { key: 'fireResist', label: 'Fire Resist', icon: '\uD83D\uDD25', format: (v) => `${v.toFixed(0)}%` },
  { key: 'coldResist', label: 'Cold Resist', icon: '\u2744\uFE0F', format: (v) => `${v.toFixed(0)}%` },
  { key: 'lightningResist', label: 'Lightning Resist', icon: '\u26A1', format: (v) => `${v.toFixed(0)}%` },
];

const SLOT_ICONS: Record<GearSlot, string> = {
  weapon: '\u2694\uFE0F',
  chest: '\uD83D\uDEE1\uFE0F',
  boots: '\uD83E\uDD7E',
  ring: '\uD83D\uDC8D',
};

const RARITY_BORDER: Record<string, string> = {
  normal: 'border-gray-600',
  magic: 'border-blue-500',
  rare: 'border-yellow-500',
  unique: 'border-orange-500',
};

export default function CharacterScreen() {
  const { character, materials, resetGame, unequipSlot } = useGameStore();

  return (
    <div className="space-y-4">
      {/* Character Header */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-3">
          {/* Character avatar placeholder */}
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl border-2 border-yellow-600">
            \u2694\uFE0F
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-white">{character.name}</div>
            <div className="text-sm text-gray-400">Level {character.level} Exile</div>
            <div className="mt-1">
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>XP</span>
                <span>{character.xp} / {character.xpToNext}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Doll Equipment */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300 mb-3">Equipment</h3>
        <div className="flex flex-col items-center gap-2">
          {/* Row 1: Weapon */}
          <div className="flex gap-2 justify-center">
            <EquipSlot slot="weapon" icon={SLOT_ICONS.weapon} label="Weapon" />
          </div>
          {/* Row 2: Chest + Ring */}
          <div className="flex gap-3 justify-center">
            <EquipSlot slot="chest" icon={SLOT_ICONS.chest} label="Chest" />
            <EquipSlot slot="ring" icon={SLOT_ICONS.ring} label="Ring" />
          </div>
          {/* Row 3: Boots */}
          <div className="flex gap-2 justify-center">
            <EquipSlot slot="boots" icon={SLOT_ICONS.boots} label="Boots" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300 mb-2">Stats</h3>
        <div className="grid grid-cols-2 gap-2">
          {STAT_CONFIG.map(({ key, label, icon, format }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm">{icon}</span>
              <div className="flex-1">
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-sm font-semibold text-white">
                  {format ? format(character.stats[key]) : Math.floor(character.stats[key])}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Materials */}
      {Object.keys(materials).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <h3 className="text-sm font-bold text-gray-300 mb-2">Materials</h3>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(materials).filter(([, v]) => v > 0).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs bg-gray-900 rounded px-2 py-1">
                <span className="text-gray-400">\uD83E\uDEA8 {key.replace(/_/g, ' ')}</span>
                <span className="text-white font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={() => {
            if (confirm('Reset all progress? This cannot be undone!')) {
              resetGame();
            }
          }}
          className="w-full py-2 bg-red-900 hover:bg-red-800 text-red-300 text-sm rounded-lg"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}

// Equipment slot component for the paper doll
function EquipSlot({ slot, icon, label }: { slot: GearSlot; icon: string; label: string }) {
  const { character, unequipSlot } = useGameStore();
  const item = character.equipment[slot];

  return (
    <div
      className={`
        w-28 rounded-lg border-2 p-2 transition-all
        ${item
          ? `${RARITY_BORDER[item.rarity]} bg-gray-900 cursor-pointer hover:brightness-125`
          : 'border-gray-700 border-dashed bg-gray-900/50'}
      `}
      onClick={() => item && unequipSlot(slot)}
      title={item ? `Click to unequip ${item.name}` : `${label} - empty`}
    >
      {item ? (
        <div>
          <div className="text-center text-lg mb-0.5">{icon}</div>
          <div className="text-[10px] text-center font-semibold truncate text-gray-200">{item.name}</div>
          <div className="text-[9px] text-center text-gray-500">
            {item.prefixes.length + item.suffixes.length} affixes
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center text-lg mb-0.5 opacity-30">{icon}</div>
          <div className="text-[10px] text-center text-gray-600">{label}</div>
        </div>
      )}
    </div>
  );
}

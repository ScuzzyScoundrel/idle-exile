import { useGameStore } from '../../store/gameStore';
import { StatKey } from '../../types';

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

export default function CharacterScreen() {
  const { character, materials, resetGame } = useGameStore();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-yellow-400">Character</h2>

      {/* Basic Info */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xl font-bold text-white">{character.name}</div>
        <div className="text-sm text-gray-400">Level {character.level} Exile</div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>XP</span>
            <span>{character.xp} / {character.xpToNext}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
            />
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
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-400">{key.replace(/_/g, ' ')}</span>
                <span className="text-white">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
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

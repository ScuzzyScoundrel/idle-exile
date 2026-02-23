import { useGameStore } from '../../store/gameStore';

export default function TopBar() {
  const { character, gold, currencies } = useGameStore();

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-700 z-50 px-3 py-2">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Character info */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold text-sm">{character.name}</span>
          <span className="text-gray-400 text-xs">Lv.{character.level}</span>
        </div>

        {/* XP bar */}
        <div className="flex-1 mx-3">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
            />
          </div>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-yellow-400">{gold}</span>
          <span className="text-yellow-600">g</span>
        </div>
      </div>

      {/* Currency row */}
      <div className="flex gap-2 max-w-lg mx-auto mt-1 overflow-x-auto">
        {Object.entries(currencies).map(([key, count]) => (
          count > 0 && (
            <span key={key} className="text-xs text-gray-400 whitespace-nowrap">
              {key.slice(0, 3)}: {count}
            </span>
          )
        ))}
      </div>
    </div>
  );
}

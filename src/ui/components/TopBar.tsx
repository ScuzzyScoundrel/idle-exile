import { useGameStore } from '../../store/gameStore';

export default function TopBar() {
  const { character, gold } = useGameStore();

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-theme-accent-muted/30 z-50 px-3 py-2 theme-transition">
      <div className="flex items-center justify-between max-w-4xl xl:max-w-7xl mx-auto">
        {/* Character info */}
        <div className="flex items-center gap-2">
          <span className="text-theme-text-accent font-bold text-sm theme-transition">{character.name}</span>
          <span className="text-gray-400 text-xs">Lv.{character.level}</span>
        </div>

        {/* XP bar */}
        <div className="flex-1 mx-3">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-theme-progress rounded-full transition-all"
              style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
            />
          </div>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-theme-text-accent theme-transition">{gold}</span>
          <span className="text-theme-text-accent/60 theme-transition">g</span>
        </div>
      </div>

    </div>
  );
}

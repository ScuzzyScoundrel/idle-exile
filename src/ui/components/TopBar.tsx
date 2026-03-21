import { useGameStore } from '../../store/gameStore';

export default function TopBar() {
  const { character, gold } = useGameStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-3 py-2"
      style={{ background: 'transparent' }}>
      <div className="flex items-center gap-2 max-w-4xl xl:max-w-7xl mx-auto">
        {/* Character info pill */}
        <div className="flex items-center gap-2 bg-gray-950/90 backdrop-blur-md
          rounded-lg px-3 py-1.5 border border-white/10">
          <span className="text-theme-text-accent font-bold text-sm heading-fantasy theme-transition">
            {character.name}
          </span>
          <span className="text-gray-400 text-xs">Lv.{character.level}</span>
        </div>

        {/* XP bar pill */}
        <div className="flex-1 bg-gray-950/90 backdrop-blur-md rounded-lg
          px-3 py-2 border border-white/10">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-theme-progress rounded-full transition-all"
              style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
            />
          </div>
        </div>

        {/* Gold pill */}
        <div className="flex items-center gap-1 text-xs bg-gray-950/90 backdrop-blur-md
          rounded-lg px-3 py-1.5 border border-white/10">
          <span className="text-theme-text-accent theme-transition">{gold}</span>
          <span className="text-theme-text-accent/60 theme-transition">g</span>
        </div>
      </div>
    </div>
  );
}

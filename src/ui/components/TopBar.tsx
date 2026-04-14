import { useGameStore } from '../../store/gameStore';
import { CLASS_DEFS } from '../../data/classes';
import { CharacterClass } from '../../types';

const CLASS_ICONS: Record<CharacterClass, string> = {
  warrior: '\u2694\uFE0F',
  mage: '\u2728',
  ranger: '\uD83C\uDFF9',
  rogue: '\uD83D\uDDE1\uFE0F',
  witchdoctor: '\uD83C\uDFAD',
  assassin: '\uD83E\uDD77',
};

export default function TopBar() {
  const { character, gold } = useGameStore();
  const xpPct = character.xpToNext > 0 ? (character.xp / character.xpToNext) * 100 : 0;

  return (
    <div className="fixed top-1.5 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-950/70 backdrop-blur-md rounded-full border border-white/10 px-3 py-1">
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="text-sm shrink-0">{CLASS_ICONS[character.class] ?? '\u2694\uFE0F'}</span>
          <span className="text-theme-text-accent font-bold heading-fantasy theme-transition">
            {character.name}
          </span>
          <span className="text-gray-400 shrink-0">Lv.{character.level}</span>
          <span className="text-gray-600 shrink-0">{CLASS_DEFS[character.class]?.name ?? 'Exile'}</span>
          <span className="text-white/20">|</span>
          <span className="text-theme-text-accent theme-transition font-semibold shrink-0">{gold}g</span>
        </div>
        <div className="mt-0.5 h-[2px] bg-gray-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-theme-progress rounded-full transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

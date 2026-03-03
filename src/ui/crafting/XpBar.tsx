import { CRAFTING_PROFESSION_DEFS } from '../../data/craftingProfessions';
import { calcCraftingXpRequired } from '../../engine/craftingProfessions';
import type { CraftingProfession } from '../../types';

interface XpBarProps {
  profession: CraftingProfession;
  level: number;
  xp: number;
  /** Bar color: 'teal' | 'blue' */
  color?: 'teal' | 'blue';
}

export default function XpBar({ profession, level, xp, color = 'blue' }: XpBarProps) {
  const xpToNext = calcCraftingXpRequired(level);
  const profDef = CRAFTING_PROFESSION_DEFS.find(p => p.id === profession);
  const barColor = color === 'teal' ? 'bg-teal-500' : 'bg-blue-500';
  const textColor = color === 'teal' ? 'text-teal-400' : 'text-blue-400';

  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <div className="flex justify-between text-xs mb-1">
        <span className={`${textColor} font-semibold`}>
          {profDef?.icon}{' '}
          {profession.charAt(0).toUpperCase() + profession.slice(1)} Lv.{level}
        </span>
        <span className="text-gray-500">{xp}/{xpToNext} XP</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${(xp / xpToNext) * 100}%` }}
        />
      </div>
    </div>
  );
}

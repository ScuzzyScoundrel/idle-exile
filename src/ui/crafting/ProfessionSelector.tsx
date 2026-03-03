import { CRAFTING_PROFESSION_DEFS } from '../../data/craftingProfessions';
import type { CraftingProfession, CraftingSkills } from '../../types';

interface ProfessionSelectorProps {
  professions: CraftingProfession[];
  selected: CraftingProfession;
  onSelect: (p: CraftingProfession) => void;
  craftingSkills: CraftingSkills;
  /** Active button color: 'teal' for components, 'blue' for craft */
  color?: 'teal' | 'blue' | 'amber';
}

export default function ProfessionSelector({ professions, selected, onSelect, craftingSkills, color = 'blue' }: ProfessionSelectorProps) {
  const activeBg = color === 'teal' ? 'bg-teal-600' : color === 'amber' ? 'bg-amber-600' : 'bg-blue-600';

  return (
    <div className="flex flex-wrap gap-1 bg-gray-800/50 rounded-lg p-1">
      {professions.map(profId => {
        const profDef = CRAFTING_PROFESSION_DEFS.find(p => p.id === profId);
        const s = craftingSkills[profId];
        const isActive = selected === profId;
        return (
          <button
            key={profId}
            onClick={() => onSelect(profId)}
            className={`flex-1 min-w-[4rem] py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
              isActive
                ? `${activeBg} text-white`
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={profDef?.description}
          >
            <span className="block text-center">
              <span className="text-sm">{profDef?.icon ?? '\u2699\uFE0F'}</span>
              <span className="block text-xs mt-0.5">{profDef?.name ?? profId}</span>
              <span className="block text-xs opacity-70">Lv.{s.level}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

import { useGameStore } from '../../store/gameStore';
import { getTotalAttributes } from '../../engine/attributes';
import { AttributeKey } from '../../types';

const ATTRIBUTE_META: Record<AttributeKey, { label: string; color: string; summary: string }> = {
  strength:     { label: 'Strength',     color: 'text-red-400',    summary: '+3 Life, +0.2% Armor, +0.5% Melee Damage' },
  dexterity:    { label: 'Dexterity',    color: 'text-green-400',  summary: '+2 Accuracy, +0.5 Evasion, +0.3% Attack Speed' },
  intelligence: { label: 'Intelligence', color: 'text-blue-400',   summary: '+2 Energy Shield, +0.5% Spell Damage' },
  spirit:       { label: 'Spirit',       color: 'text-purple-400', summary: '+1 Chaos Resist, +0.5% DoT, +0.3% Ailment Potency' },
};

const ORDER: AttributeKey[] = ['strength', 'dexterity', 'intelligence', 'spirit'];

export default function AttributePanel() {
  const character = useGameStore(s => s.character);
  const allocateAttribute = useGameStore(s => s.allocateAttribute);

  const totals = getTotalAttributes(character);
  const allocated = character.attributes.allocated;
  const unallocated = character.attributes.unallocated;
  const canAllocate = unallocated > 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-theme-text-accent heading-fantasy">Attributes</h3>
        <span className={`text-xs ${canAllocate ? 'text-amber-400' : 'text-gray-500'}`}>
          {unallocated} point{unallocated === 1 ? '' : 's'} unspent
        </span>
      </div>

      <div className="space-y-1.5">
        {ORDER.map(key => {
          const meta = ATTRIBUTE_META[key];
          const total = totals[key];
          const allocatedPoints = allocated[key];
          const basePoints = total - allocatedPoints;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-lg font-mono text-white">{total}</span>
                  {allocatedPoints > 0 && (
                    <span className="text-xs text-gray-500">
                      ({basePoints} base + {allocatedPoints} spent)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{meta.summary}</div>
              </div>
              <button
                onClick={() => allocateAttribute(key)}
                disabled={!canAllocate}
                className={`
                  w-7 h-7 rounded text-lg font-bold transition-colors
                  ${canAllocate
                    ? 'bg-amber-900/50 hover:bg-amber-800/70 text-amber-300 cursor-pointer'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'}
                `}
                title={canAllocate ? `Spend 1 point on ${meta.label}` : 'No points available'}
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-gray-600 italic">
        Earn 5 attribute points per level. Respec coming in Phase 5.
      </div>
    </div>
  );
}

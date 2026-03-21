import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { getPatternDef } from '../../data/craftingPatterns';
import { getPatternMaterialCost, canCraftPattern } from '../../engine/craftingProfessions';
import { getCraftingProfessionDef } from '../../data/craftingProfessions';
import { RARITY_TEXT } from './craftingConstants';
import { formatMatName } from './craftingHelpers';
import CraftOutputPanel from './CraftOutputPanel';
import type { Rarity } from '../../types';

const SOURCE_LABEL: Record<string, string> = {
  zone_drop: 'Zone',
  boss_drop: 'Boss',
  invasion_drop: 'Void',
};

const SOURCE_STYLE: Record<string, string> = {
  zone_drop: 'bg-gray-700 text-gray-300',
  boss_drop: 'bg-yellow-900/60 text-yellow-300',
  invasion_drop: 'bg-purple-900/60 text-purple-300',
};

export default function PatternPanel() {
  const { ownedPatterns, craftingSkills, materials, gold } = useGameStore();
  const { craftFromPattern } = useCraftingStore();
  const [flashItem, setFlashItem] = useState<{ name: string; rarity: Rarity; wasSalvaged: boolean } | null>(null);

  const handleCraft = (index: number) => {
    const result = craftFromPattern(index);
    if (result) {
      setFlashItem({ name: result.item.name, rarity: result.item.rarity, wasSalvaged: result.wasSalvaged });
      setTimeout(() => setFlashItem(null), 2500);
    }
  };

  if (ownedPatterns.length === 0) {
    return (
      <div className="space-y-3">
        <CraftOutputPanel />
        <div className="panel-stone p-6 text-center space-y-2">
          <div className="text-3xl">📜</div>
          <div className="text-gray-400 text-sm">No patterns found yet.</div>
          <div className="text-gray-500 text-xs">Patterns drop from zone clears and boss kills. Keep farming!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CraftOutputPanel />

      {/* Flash notification */}
      {flashItem && (
        <div className={`text-center py-2 rounded-lg text-sm font-bold animate-pulse ${
          flashItem.wasSalvaged ? 'bg-gray-700 text-gray-300' : 'bg-green-900/50 text-green-300'
        }`}>
          {flashItem.wasSalvaged ? '🔨 ' : '✨ '}
          Crafted: <span className={RARITY_TEXT[flashItem.rarity]}>{flashItem.name}</span>
          {flashItem.wasSalvaged && ' (auto-salvaged)'}
        </div>
      )}

      <div className="space-y-2">
        {ownedPatterns.map((owned, index) => {
          const def = getPatternDef(owned.defId);
          if (!def) return null;
          const cost = getPatternMaterialCost(def);
          const canCraft = canCraftPattern(def, owned.charges, craftingSkills, materials, gold);
          const profDef = getCraftingProfessionDef(def.profession);

          return (
            <div
              key={`${owned.defId}-${index}`}
              className="panel-stone p-3 space-y-2"
            >
              {/* Header: name + badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-yellow-300 truncate">{def.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_STYLE[def.source]}`}>
                      {SOURCE_LABEL[def.source]}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                      {profDef.icon} {profDef.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{def.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400">Charges</div>
                  <div className="text-sm font-bold text-white">{owned.charges}</div>
                </div>
              </div>

              {/* Guaranteed affixes + min rarity */}
              <div className="flex flex-wrap gap-1">
                {def.guaranteedAffixes.map(affix => (
                  <span key={affix} className="text-xs px-1.5 py-0.5 rounded bg-green-900/50 text-green-300 border border-green-700/50">
                    +{formatMatName(affix)}
                  </span>
                ))}
                <span className={`text-xs px-1.5 py-0.5 rounded ${RARITY_TEXT[def.minRarity]} bg-gray-800 border border-gray-600`}>
                  Min: {def.minRarity}
                </span>
              </div>

              {/* Material cost */}
              {cost && (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-gray-500">Cost:</span>
                  {cost.materials.map(m => {
                    const have = materials[m.materialId] ?? 0;
                    const enough = have >= m.amount;
                    return (
                      <span key={m.materialId} className={`px-1.5 py-0.5 rounded ${enough ? 'bg-gray-800 text-gray-300' : 'bg-red-900/30 text-red-400'}`}>
                        {formatMatName(m.materialId)} {have}/{m.amount}
                      </span>
                    );
                  })}
                  <span className={`px-1.5 py-0.5 rounded ${gold >= cost.goldCost ? 'bg-yellow-900/30 text-yellow-300' : 'bg-red-900/30 text-red-400'}`}>
                    {cost.goldCost}g
                  </span>
                </div>
              )}

              {/* Craft button */}
              <button
                onClick={() => handleCraft(index)}
                disabled={!canCraft}
                className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                  canCraft
                    ? 'bg-green-700 hover:bg-green-600 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Craft ({owned.charges} left)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

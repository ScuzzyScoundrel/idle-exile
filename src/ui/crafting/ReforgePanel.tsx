import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { getReforgeCost, canReforge } from '../../engine/craftingProfessions';
import { getUniqueItemDef } from '../../data/uniqueItems';
import { resolveMaterialMeta } from '../craftIcon';
import { formatMatName } from './craftingHelpers';
import type { Item } from '../../types';

/** Band → target iLvl for reforging (midpoint of band's iLvl range). */
const BAND_ILVL: Record<number, { label: string; iLvl: number }> = {
  1: { label: 'Band 1 (iLvl 5)', iLvl: 5 },
  2: { label: 'Band 2 (iLvl 15)', iLvl: 15 },
  3: { label: 'Band 3 (iLvl 25)', iLvl: 25 },
};

export default function ReforgePanel() {
  const { inventory, character, materials, gold } = useGameStore();
  const { reforgeUnique } = useCraftingStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [targetBand, setTargetBand] = useState(2);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  // Collect all owned unique items (inventory + equipped)
  const uniqueItems = useMemo(() => {
    const items: { item: Item; location: string }[] = [];
    for (const item of inventory) {
      if (item.isUnique && item.uniqueDefId) {
        items.push({ item, location: 'Bag' });
      }
    }
    for (const [slot, item] of Object.entries(character.equipment)) {
      if (item?.isUnique && item.uniqueDefId) {
        items.push({ item, location: slot });
      }
    }
    return items;
  }, [inventory, character.equipment]);

  const selectedEntry = uniqueItems.find(e => e.item.id === selectedItemId);
  const selectedItem = selectedEntry?.item;
  const uniqueDef = selectedItem?.uniqueDefId ? getUniqueItemDef(selectedItem.uniqueDefId) : undefined;

  const cost = selectedItem?.uniqueDefId ? getReforgeCost(selectedItem.uniqueDefId, targetBand) : undefined;
  const canDo = selectedItem ? canReforge(selectedItem, targetBand, materials, gold) : false;
  const targetILvl = BAND_ILVL[targetBand]?.iLvl ?? 15;

  const handleReforge = () => {
    if (!selectedItem) return;
    const result = reforgeUnique(selectedItem.id, targetBand, targetILvl);
    if (result) {
      setFlashMsg(`Reforged to iLvl ${result.iLvl}!`);
      setTimeout(() => setFlashMsg(null), 2500);
    }
  };

  if (uniqueItems.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
        No unique items to reforge. Craft a unique first!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Reforge a unique item to re-roll its random affixes at a new item level. The unique affix is always preserved.
      </p>

      {/* Unique item selector */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-gray-400">Select Unique</div>
        <div className="space-y-1">
          {uniqueItems.map(({ item, location }) => (
            <button
              key={item.id}
              onClick={() => setSelectedItemId(item.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                selectedItemId === item.id
                  ? 'border-amber-500 bg-amber-950/40'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-300">{item.name}</span>
                <span className="text-[10px] text-gray-500">iLvl {item.iLvl} | {location}</span>
              </div>
              {item.uniqueAffix && (
                <div className="text-[10px] text-amber-400/70 mt-0.5">{item.uniqueAffix.displayText}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reforge controls */}
      {selectedItem && uniqueDef && (
        <div className="bg-gray-800 rounded-lg border border-amber-900/50 p-3 space-y-3">
          <div className="text-sm font-bold text-amber-300">{selectedItem.name}</div>
          <div className="text-[10px] text-gray-500">Current iLvl: {selectedItem.iLvl} | {selectedItem.prefixes.length + selectedItem.suffixes.length} affixes</div>

          {/* Target band selector */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-400">Target Band</div>
            <div className="flex gap-1">
              {Object.entries(BAND_ILVL).map(([band, info]) => (
                <button
                  key={band}
                  onClick={() => setTargetBand(Number(band))}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                    targetBand === Number(band)
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cost display */}
          {cost && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-400">Cost</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {cost.materials.map(m => {
                  const have = materials[m.materialId] ?? 0;
                  const meta = resolveMaterialMeta(m.materialId);
                  const name = meta?.name ?? formatMatName(m.materialId);
                  return (
                    <span key={m.materialId} className={`px-1.5 py-0.5 rounded bg-gray-700 ${have >= m.amount ? 'text-gray-300' : 'text-red-400'}`}>
                      {meta?.emoji ? `${meta.emoji} ` : ''}{name} {have}/{m.amount}
                    </span>
                  );
                })}
                <span className={`px-1.5 py-0.5 rounded bg-gray-700 ${gold >= cost.goldCost ? 'text-yellow-400' : 'text-red-400'}`}>
                  {cost.goldCost}g ({gold}g)
                </span>
              </div>
            </div>
          )}

          {/* Reforge button */}
          <button
            onClick={handleReforge}
            disabled={!canDo}
            className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
              canDo
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Reforge to iLvl {targetILvl}
          </button>

          {flashMsg && (
            <div className="text-xs font-bold text-amber-400 text-center animate-pulse">{flashMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}

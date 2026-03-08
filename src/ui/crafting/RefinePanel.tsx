import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { REFINEMENT_TRACK_DEFS } from '../../data/refinement';
import { getRefinementChain, canRefine, canDeconstruct } from '../../engine/refinement';
import { formatMatName } from './craftingHelpers';

export default function RefinePanel() {
  const { materials, gold } = useGameStore();
  const { refineMaterial, refineMaterialBatch, deconstructMaterial } = useCraftingStore();
  const [selectedTrack, setSelectedTrack] = useState(REFINEMENT_TRACK_DEFS[0].id);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const chain = getRefinementChain(selectedTrack);

  const handleRefine = (recipeId: string) => {
    const ok = refineMaterial(recipeId);
    if (ok) {
      setFlashId(recipeId);
      setTimeout(() => setFlashId(null), 600);
    }
  };

  const handleRefineAll = (recipe: typeof chain[0]) => {
    const rawCount = materials[recipe.rawMaterialId] ?? 0;
    const prevCount = recipe.previousRefinedId ? (materials[recipe.previousRefinedId] ?? 0) : Infinity;
    const goldAvail = gold;

    const maxRaw = Math.floor(rawCount / recipe.rawAmount);
    const maxPrev = recipe.previousRefinedId ? Math.floor(prevCount / recipe.previousRefinedAmount) : Infinity;
    const maxGold = Math.floor(goldAvail / recipe.goldCost);
    const max = Math.min(maxRaw, maxPrev, maxGold);

    if (max <= 0) return;
    const crafted = refineMaterialBatch(recipe.id, max);
    if (crafted > 0) {
      setFlashId(recipe.id);
      setFlashMsg(`Refined x${crafted}`);
      setTimeout(() => { setFlashId(null); setFlashMsg(null); }, 1200);
    }
  };

  const handleDeconstruct = (refinedId: string) => {
    deconstructMaterial(refinedId);
  };

  return (
    <div className="space-y-3">
      {/* Track selector pills */}
      <div className="flex flex-wrap gap-1 bg-gray-800/50 rounded-lg p-1">
        {REFINEMENT_TRACK_DEFS.map(track => (
          <button
            key={track.id}
            onClick={() => setSelectedTrack(track.id)}
            className={`flex-1 min-w-[3.5rem] py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
              selectedTrack === track.id
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <span className="block text-center">
              <span className="text-sm">{track.icon}</span>
              <span className="block text-xs mt-0.5">{track.name}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Flash message */}
      {flashMsg && (
        <div className="text-center text-sm font-bold text-yellow-400 py-1 animate-pulse">
          {flashMsg}
        </div>
      )}

      {/* Refinement chain */}
      <div className="space-y-2">
        {chain.map(recipe => {
          const rawCount = materials[recipe.rawMaterialId] ?? 0;
          const prevCount = recipe.previousRefinedId ? (materials[recipe.previousRefinedId] ?? 0) : 0;
          const outputCount = materials[recipe.outputId] ?? 0;
          const craftable = canRefine(recipe, materials, gold);
          const deconstructable = recipe.tier > 1 && outputCount > 0 && canDeconstruct(recipe.outputId, materials);
          const isFlashing = flashId === recipe.id;

          return (
            <div
              key={recipe.id}
              className={`bg-gray-800 rounded-lg p-3 border transition-all ${
                isFlashing ? 'border-yellow-400 bg-yellow-900/20' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">
                  T{recipe.tier} {recipe.outputName}
                </span>
                <span className="text-xs text-gray-500">
                  Owned: <span className="text-white font-semibold">{outputCount}</span>
                </span>
              </div>

              {/* Inputs */}
              <div className="flex flex-wrap gap-2 text-xs mb-2">
                <span className={rawCount >= recipe.rawAmount ? 'text-green-400' : 'text-red-400'}>
                  {formatMatName(recipe.rawMaterialId)} {rawCount}/{recipe.rawAmount}
                </span>
                {recipe.previousRefinedId && (
                  <span className={prevCount >= recipe.previousRefinedAmount ? 'text-green-400' : 'text-red-400'}>
                    {formatMatName(recipe.previousRefinedId)} {prevCount}/{recipe.previousRefinedAmount}
                  </span>
                )}
                <span className={gold >= recipe.goldCost ? 'text-yellow-400' : 'text-red-400'}>
                  {recipe.goldCost}g
                </span>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRefine(recipe.id)}
                  disabled={!craftable}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                    craftable
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Refine
                </button>
                <button
                  onClick={() => handleRefineAll(recipe)}
                  disabled={!craftable}
                  className={`px-3 py-2 rounded text-xs font-bold transition-all ${
                    craftable
                      ? 'bg-amber-700 hover:bg-amber-600 text-amber-200'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Refine maximum possible"
                >
                  All
                </button>
                {recipe.tier > 1 && (
                  <button
                    onClick={() => handleDeconstruct(recipe.outputId)}
                    disabled={!deconstructable}
                    className={`px-3 py-2 rounded text-xs font-bold transition-all ${
                      deconstructable
                        ? 'bg-red-800 hover:bg-red-700 text-red-200'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    title="Deconstruct 1 into 2 of previous tier"
                  >
                    {'\u2702\uFE0F'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

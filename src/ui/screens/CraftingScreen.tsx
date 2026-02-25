import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { REFINEMENT_TRACK_DEFS } from '../../data/refinement';
import { getRefinementChain } from '../../engine/refinement';
import { canRefine, canDeconstruct } from '../../engine/refinement';
import { CRAFTING_PROFESSION_DEFS } from '../../data/craftingProfessions';
import { getRecipesForProfession } from '../../data/craftingRecipes';
import { canCraftRecipe } from '../../engine/craftingProfessions';
import { calcCraftingXpRequired } from '../../engine/craftingProfessions';
import { RARE_MATERIAL_DEFS, getRareMaterialDef } from '../../data/rareMaterials';
import { CATALYST_RARITY_MAP } from '../../data/balance';
import type { CraftingProfession, Rarity } from '../../types';

// Rarity color classes (same as InventoryScreen)
const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-orange-600',
};

type SubTab = 'refine' | 'craft';

export default function CraftingScreen() {
  const [subTab, setSubTab] = useState<SubTab>('refine');

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-yellow-400">Crafting</h2>

      {/* Refine / Craft Toggle */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setSubTab('refine')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
            subTab === 'refine'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {'\u2697\uFE0F'} Refine
        </button>
        <button
          onClick={() => setSubTab('craft')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
            subTab === 'craft'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {'\uD83D\uDD28'} Craft
        </button>
      </div>

      {subTab === 'refine' ? <RefinePanel /> : <CraftPanel />}
    </div>
  );
}

// ─── Refine Panel ────────────────────────────────────────────────

function RefinePanel() {
  const { materials, gold, refineMaterial, deconstructMaterial } = useGameStore();
  const [selectedTrack, setSelectedTrack] = useState(REFINEMENT_TRACK_DEFS[0].id);
  const [flashId, setFlashId] = useState<string | null>(null);

  const chain = getRefinementChain(selectedTrack);

  const handleRefine = (recipeId: string) => {
    const ok = refineMaterial(recipeId);
    if (ok) {
      setFlashId(recipeId);
      setTimeout(() => setFlashId(null), 600);
    }
  };

  const handleDeconstruct = (refinedId: string) => {
    deconstructMaterial(refinedId);
  };

  return (
    <div className="space-y-3">
      {/* Track selector pills */}
      <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
        {REFINEMENT_TRACK_DEFS.map(track => (
          <button
            key={track.id}
            onClick={() => setSelectedTrack(track.id)}
            className={`flex-1 py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
              selectedTrack === track.id
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <span className="block text-center">
              <span className="text-sm">{track.icon}</span>
              <span className="block text-[10px] mt-0.5">{track.name}</span>
            </span>
          </button>
        ))}
      </div>

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
                  className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                    craftable
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Refine
                </button>
                {recipe.tier > 1 && (
                  <button
                    onClick={() => handleDeconstruct(recipe.outputId)}
                    disabled={!deconstructable}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
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

// ─── Craft Panel ─────────────────────────────────────────────────

function CraftPanel() {
  const { craftingSkills, materials, gold, craftRecipe } = useGameStore();
  const [selectedProfession, setSelectedProfession] = useState<CraftingProfession>('weaponsmith');
  const [catalysts, setCatalysts] = useState<Record<string, string>>({});
  const [flashItem, setFlashItem] = useState<{ name: string; rarity: Rarity } | null>(null);

  const skill = craftingSkills[selectedProfession];
  const xpToNext = calcCraftingXpRequired(skill.level);
  const recipes = getRecipesForProfession(selectedProfession);

  // Group recipes by tier
  const tiers = new Map<number, typeof recipes>();
  for (const r of recipes) {
    const list = tiers.get(r.tier) ?? [];
    list.push(r);
    tiers.set(r.tier, list);
  }

  // Available rare materials for catalyst selection
  const availableCatalysts = RARE_MATERIAL_DEFS.filter(d => (materials[d.id] ?? 0) > 0);

  const handleCraft = (recipeId: string) => {
    const catalystId = catalysts[recipeId];
    const result = craftRecipe(recipeId, catalystId);
    if (result) {
      setFlashItem({ name: result.item.name, rarity: result.item.rarity });
      setTimeout(() => setFlashItem(null), 2000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Profession selector pills */}
      <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
        {CRAFTING_PROFESSION_DEFS.map(prof => {
          const s = craftingSkills[prof.id];
          const isActive = selectedProfession === prof.id;
          return (
            <button
              key={prof.id}
              onClick={() => setSelectedProfession(prof.id)}
              className={`flex-1 py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={prof.description}
            >
              <span className="block text-center">
                <span className="text-sm">{prof.icon}</span>
                <span className="block text-[10px] mt-0.5">{prof.name}</span>
                <span className="block text-[9px] opacity-70">Lv.{s.level}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* XP bar */}
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-400 font-semibold">
            {CRAFTING_PROFESSION_DEFS.find(p => p.id === selectedProfession)?.icon}{' '}
            {selectedProfession.charAt(0).toUpperCase() + selectedProfession.slice(1)} Lv.{skill.level}
          </span>
          <span className="text-gray-500">{skill.xp}/{xpToNext} XP</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${(skill.xp / xpToNext) * 100}%` }}
          />
        </div>
      </div>

      {/* Flash craft result */}
      {flashItem && (
        <div className={`text-center text-sm font-bold py-2 rounded-lg border animate-pulse ${
          RARITY_BORDER[flashItem.rarity]
        } ${RARITY_TEXT[flashItem.rarity]} bg-gray-900`}>
          Crafted: {flashItem.name}
        </div>
      )}

      {/* Recipe list grouped by tier */}
      <div className="space-y-3">
        {[...tiers.entries()].sort(([a], [b]) => a - b).map(([tier, tierRecipes]) => (
          <div key={tier}>
            <div className="text-xs font-bold text-gray-500 mb-1">Tier {tier}</div>
            <div className="space-y-2">
              {tierRecipes.map(recipe => {
                const levelLocked = skill.level < recipe.requiredLevel;
                const craftable = !levelLocked && canCraftRecipe(recipe, craftingSkills, materials, gold);
                const hasCatalyst = recipe.requiredCatalyst
                  ? (materials[recipe.requiredCatalyst.rareMaterialId] ?? 0) >= recipe.requiredCatalyst.amount
                  : true;

                return (
                  <div
                    key={recipe.id}
                    className={`bg-gray-800 rounded-lg p-3 border transition-all ${
                      levelLocked ? 'border-gray-700 opacity-50' : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">
                        {recipe.name}
                        {recipe.requiredCatalyst && (
                          <span className="text-purple-400 text-[10px] ml-1">UNIQUE</span>
                        )}
                      </span>
                      {levelLocked && (
                        <span className="text-[10px] text-red-400 font-bold">Lv.{recipe.requiredLevel}</span>
                      )}
                    </div>

                    {/* Material inputs */}
                    <div className="flex flex-wrap gap-2 text-xs mb-1">
                      {recipe.materials.map(({ materialId, amount }) => {
                        const have = materials[materialId] ?? 0;
                        return (
                          <span key={materialId} className={have >= amount ? 'text-green-400' : 'text-red-400'}>
                            {formatMatName(materialId)} {have}/{amount}
                          </span>
                        );
                      })}
                      <span className={gold >= recipe.goldCost ? 'text-yellow-400' : 'text-red-400'}>
                        {recipe.goldCost}g
                      </span>
                    </div>

                    {/* Required catalyst (unique recipes) */}
                    {recipe.requiredCatalyst && (() => {
                      const catDef = getRareMaterialDef(recipe.requiredCatalyst!.rareMaterialId);
                      const have = materials[recipe.requiredCatalyst!.rareMaterialId] ?? 0;
                      return (
                        <div className={`text-xs mb-1 ${hasCatalyst ? 'text-purple-400' : 'text-red-400'}`}>
                          {catDef?.icon} {catDef?.name ?? recipe.requiredCatalyst!.rareMaterialId}: {have}/{recipe.requiredCatalyst!.amount}
                          {!hasCatalyst && <span className="text-red-500 ml-1">(missing)</span>}
                        </div>
                      );
                    })()}

                    {/* Optional catalyst slot */}
                    {recipe.catalystSlot && !recipe.requiredCatalyst && (
                      <div className="mb-1">
                        <select
                          value={catalysts[recipe.id] ?? ''}
                          onChange={e => setCatalysts(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                          className="w-full bg-gray-700 text-xs text-gray-300 rounded px-2 py-1 border border-gray-600"
                        >
                          <option value="">No catalyst</option>
                          {availableCatalysts.map(cat => {
                            const guaranteed = CATALYST_RARITY_MAP[cat.rarity];
                            return (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name} (x{materials[cat.id]}) {'\u2192'} {guaranteed}+
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Craft button */}
                    <button
                      onClick={() => handleCraft(recipe.id)}
                      disabled={!craftable}
                      className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                        craftable
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {levelLocked ? `Requires Lv.${recipe.requiredLevel}` : 'Craft'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatMatName(id: string): string {
  return id.replace(/_/g, ' ');
}

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
import { ITEM_BASE_DEFS } from '../../data/items';
import { REFINEMENT_RECIPES } from '../../data/refinement';
import type { CraftingProfession, CraftingRecipeDef, Rarity } from '../../types';

// Rarity color classes
const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

const CRAFT_AUTO_SALVAGE_OPTIONS: { value: Rarity; label: string }[] = [
  { value: 'common', label: 'None' },
  { value: 'uncommon', label: 'Common' },
  { value: 'rare', label: '\u2264 Uncommon' },
  { value: 'epic', label: '\u2264 Rare' },
  { value: 'legendary', label: '\u2264 Epic' },
];

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-orange-600',
};

type SubTab = 'materials' | 'refine' | 'craft';

export default function CraftingScreen() {
  const [subTab, setSubTab] = useState<SubTab>('materials');

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-yellow-400">Crafting</h2>

      {/* 3-tab toggle */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {([
          { key: 'materials' as const, icon: '\uD83E\uDEA8', label: 'Materials' },
          { key: 'refine' as const, icon: '\u2697\uFE0F', label: 'Refine' },
          { key: 'craft' as const, icon: '\uD83D\uDD28', label: 'Craft' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all ${
              subTab === tab.key
                ? tab.key === 'craft' ? 'bg-blue-600 text-white'
                  : tab.key === 'refine' ? 'bg-amber-600 text-white'
                  : 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'materials' ? <MaterialsPanel /> : subTab === 'refine' ? <RefinePanel /> : <CraftPanel />}
    </div>
  );
}

// ─── Materials Panel ────────────────────────────────────────────

function MaterialsPanel() {
  const { materials } = useGameStore();

  // Categorize materials
  const rawIds = new Set(REFINEMENT_RECIPES.map(r => r.rawMaterialId));
  const refinedIds = new Set(REFINEMENT_RECIPES.map(r => r.outputId));
  const rareIds = new Set(RARE_MATERIAL_DEFS.map(d => d.id));
  const miscIds = new Set(['salvage_dust', 'magic_essence']);

  const categorized: { label: string; items: { id: string; count: number; icon?: string; color?: string }[] }[] = [];

  const raw: { id: string; count: number }[] = [];
  const refined: { id: string; count: number }[] = [];
  const rare: { id: string; count: number; icon?: string; color?: string }[] = [];
  const misc: { id: string; count: number }[] = [];

  for (const [id, count] of Object.entries(materials)) {
    if (count <= 0) continue;
    if (rawIds.has(id)) {
      raw.push({ id, count });
    } else if (refinedIds.has(id)) {
      refined.push({ id, count });
    } else if (rareIds.has(id)) {
      const def = getRareMaterialDef(id);
      rare.push({
        id,
        count,
        icon: def?.icon,
        color: def ? RARITY_TEXT[def.rarity as Rarity] : undefined,
      });
    } else if (miscIds.has(id)) {
      misc.push({ id, count });
    } else {
      // Unknown mats go to raw
      raw.push({ id, count });
    }
  }

  if (raw.length > 0) categorized.push({ label: 'Raw Materials', items: raw });
  if (refined.length > 0) categorized.push({ label: 'Refined Materials', items: refined });
  if (rare.length > 0) categorized.push({ label: 'Rare Materials', items: rare });
  if (misc.length > 0) categorized.push({ label: 'Misc', items: misc });

  if (categorized.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
        No materials yet. Go gathering or fight some monsters!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categorized.map(cat => (
        <div key={cat.label}>
          <div className="text-xs font-bold text-gray-500 mb-1">{cat.label}</div>
          <div className="grid grid-cols-4 gap-2">
            {cat.items.map(item => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg p-2 text-center border border-gray-700"
              >
                <div className="text-lg">{item.icon ?? '\uD83E\uDEA8'}</div>
                <div className={`text-[10px] font-semibold truncate ${item.color ?? 'text-gray-300'}`}>
                  {formatMatName(item.id)}
                </div>
                <div className="text-xs text-white font-bold">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Refine Panel ────────────────────────────────────────────────

function RefinePanel() {
  const { materials, gold, refineMaterial, refineMaterialBatch, deconstructMaterial } = useGameStore();
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
    // Calculate max craftable
    const rawCount = materials[recipe.rawMaterialId] ?? 0;
    const prevCount = recipe.previousRefinedId ? (materials[recipe.previousRefinedId] ?? 0) : Infinity;
    const goldAvail = gold;

    let maxRaw = Math.floor(rawCount / recipe.rawAmount);
    let maxPrev = recipe.previousRefinedId ? Math.floor(prevCount / recipe.previousRefinedAmount) : Infinity;
    let maxGold = Math.floor(goldAvail / recipe.goldCost);
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
                  className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
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
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
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
  const { craftingSkills, materials, gold, craftRecipe, craftAutoSalvageMinRarity, setCraftAutoSalvageRarity } = useGameStore();
  const [selectedProfession, setSelectedProfession] = useState<CraftingProfession>('weaponsmith');
  const [catalysts, setCatalysts] = useState<Record<string, string>>({});
  const [flashItem, setFlashItem] = useState<{ name: string; rarity: Rarity; wasSalvaged: boolean } | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const skill = craftingSkills[selectedProfession];
  const xpToNext = calcCraftingXpRequired(skill.level);
  const recipes = getRecipesForProfession(selectedProfession);

  // Group recipes by tier
  const tiers = new Map<number, CraftingRecipeDef[]>();
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
      setFlashItem({ name: result.item.name, rarity: result.item.rarity, wasSalvaged: result.wasSalvaged });
      setTimeout(() => setFlashItem(null), 2000);
    }
  };

  // Get weapon/armor type info from base def
  const getBaseInfo = (baseId: string) => {
    const base = ITEM_BASE_DEFS.find(b => b.id === baseId);
    if (!base) return null;
    return base;
  };

  // Slot icon lookup
  const SLOT_ICONS: Record<string, string> = {
    mainhand: '\u2694\uFE0F', offhand: '\uD83D\uDEE1\uFE0F',
    helmet: '\u26D1\uFE0F', neck: '\uD83D\uDCAE', shoulders: '\uD83E\uDDD1',
    cloak: '\uD83E\uDDE5', chest: '\uD83E\uDDB4', bracers: '\uD83D\uDD8A\uFE0F',
    gloves: '\uD83E\uDDE4', belt: '\u{1F4FF}', pants: '\uD83D\uDC56',
    boots: '\uD83E\uDD7E', ring1: '\uD83D\uDC8D', ring2: '\uD83D\uDC8D',
    trinket1: '\u2728', trinket2: '\u2728',
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

      {/* Craft auto-salvage dropdown */}
      <div className="flex items-center justify-end gap-2">
        <label className="text-[10px] text-gray-500">Craft auto-salvage:</label>
        <select
          value={craftAutoSalvageMinRarity}
          onChange={(e) => setCraftAutoSalvageRarity(e.target.value as Rarity)}
          className="text-[10px] bg-gray-800 text-gray-300 border border-gray-600 rounded px-1 py-0.5"
        >
          {CRAFT_AUTO_SALVAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Flash craft result */}
      {flashItem && (
        <div className={`text-center text-sm font-bold py-2 rounded-lg border animate-pulse ${
          RARITY_BORDER[flashItem.rarity]
        } ${RARITY_TEXT[flashItem.rarity]} bg-gray-900`}>
          Crafted: {flashItem.name}
          {flashItem.wasSalvaged && <span className="text-amber-400 text-xs ml-1">(auto-salvaged)</span>}
        </div>
      )}

      {/* Recipe grid grouped by tier */}
      <div className="space-y-3">
        {[...tiers.entries()].sort(([a], [b]) => a - b).map(([tier, tierRecipes]) => (
          <div key={tier}>
            <div className="text-xs font-bold text-gray-500 mb-1">Tier {tier}</div>
            <div className="grid grid-cols-2 gap-2">
              {tierRecipes.map(recipe => {
                const levelLocked = skill.level < recipe.requiredLevel;
                const craftable = !levelLocked && canCraftRecipe(recipe, craftingSkills, materials, gold);
                const isExpanded = expandedRecipe === recipe.id;
                const baseInfo = getBaseInfo(recipe.outputBaseId);

                // Material status: all met?
                const allMatsMet = recipe.materials.every(
                  ({ materialId, amount }) => (materials[materialId] ?? 0) >= amount
                );
                const goldMet = gold >= recipe.goldCost;
                const catMet = recipe.requiredCatalyst
                  ? (materials[recipe.requiredCatalyst.rareMaterialId] ?? 0) >= recipe.requiredCatalyst.amount
                  : true;

                return (
                  <div
                    key={recipe.id}
                    className={`bg-gray-800 rounded-lg border transition-all cursor-pointer ${
                      levelLocked ? 'border-gray-700 opacity-50' : isExpanded ? 'border-blue-500' : 'border-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                  >
                    {/* Compact card header */}
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{baseInfo ? SLOT_ICONS[baseInfo.slot] ?? '\u2694\uFE0F' : '\u2694\uFE0F'}</span>
                        <span className="text-xs font-bold text-white flex-1 truncate">
                          {recipe.name}
                        </span>
                        {recipe.requiredCatalyst && (
                          <span className="text-purple-400 text-[9px] font-bold">UNQ</span>
                        )}
                        {levelLocked && (
                          <span className="text-[9px] text-red-400 font-bold">{'\uD83D\uDD12'}Lv.{recipe.requiredLevel}</span>
                        )}
                      </div>

                      {/* Status dots */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${allMatsMet ? 'bg-green-500' : 'bg-red-500'}`} title="Materials" />
                        <span className={`w-2 h-2 rounded-full ${goldMet ? 'bg-yellow-500' : 'bg-red-500'}`} title="Gold" />
                        {recipe.requiredCatalyst && (
                          <span className={`w-2 h-2 rounded-full ${catMet ? 'bg-purple-500' : 'bg-red-500'}`} title="Catalyst" />
                        )}
                        <span className="flex-1" />
                        {baseInfo?.weaponType && (
                          <span className="text-[9px] text-gray-500">{baseInfo.weaponType}</span>
                        )}
                        {baseInfo?.armorType && (
                          <span className="text-[9px] text-gray-500">{baseInfo.armorType}</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && !levelLocked && (
                      <div className="px-2 pb-2 border-t border-gray-700 pt-2 space-y-2" onClick={e => e.stopPropagation()}>
                        {/* Output preview */}
                        {baseInfo && (
                          <div className="text-xs text-gray-400 bg-gray-900 rounded p-1.5">
                            <div className="text-white font-semibold">{baseInfo.name}</div>
                            <div className="text-[10px]">
                              {baseInfo.slot} {baseInfo.weaponType ? `(${baseInfo.weaponType})` : baseInfo.armorType ? `(${baseInfo.armorType})` : ''} &bull; iLvl {recipe.outputILvl}
                            </div>
                            <div className="text-[10px] text-gray-500">2-6 random affixes</div>
                            {recipe.catalystSlot && (
                              <div className="text-[10px] text-purple-400 mt-0.5">
                                Add catalyst for guaranteed rarity+
                              </div>
                            )}
                          </div>
                        )}

                        {/* Material inputs */}
                        <div className="flex flex-wrap gap-1.5 text-xs">
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
                            <div className={`text-xs ${catMet ? 'text-purple-400' : 'text-red-400'}`}>
                              {catDef?.icon} {catDef?.name ?? recipe.requiredCatalyst!.rareMaterialId}: {have}/{recipe.requiredCatalyst!.amount}
                              {!catMet && <span className="text-red-500 ml-1">(missing)</span>}
                            </div>
                          );
                        })()}

                        {/* Optional catalyst slot */}
                        {recipe.catalystSlot && !recipe.requiredCatalyst && (
                          <select
                            value={catalysts[recipe.id] ?? ''}
                            onChange={e => setCatalysts(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                            className="w-full bg-gray-700 text-xs text-gray-300 rounded px-2 py-1 border border-gray-600"
                            onClick={e => e.stopPropagation()}
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
                        )}

                        {/* Craft button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCraft(recipe.id); }}
                          disabled={!craftable}
                          className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                            craftable
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Craft
                        </button>
                      </div>
                    )}

                    {/* Level locked expanded */}
                    {isExpanded && levelLocked && (
                      <div className="px-2 pb-2 text-center text-xs text-red-400" onClick={e => e.stopPropagation()}>
                        Requires {selectedProfession} Lv.{recipe.requiredLevel}
                      </div>
                    )}
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

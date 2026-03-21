import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { canCraftRecipe } from '../../engine/craftingProfessions';
import { ITEM_BASE_DEFS } from '../../data/items';
import { RARE_MATERIAL_DEFS, getRareMaterialDef } from '../../data/rareMaterials';
import { AFFIX_CATALYST_DEFS, getAffixCatalystDef } from '../../data/affixCatalysts';
import { CATALYST_RARITY_MAP, CATALYST_BEST_TIER } from '../../data/balance';
import { CraftIcon } from '../craftIcon';
import MaterialPill from './MaterialPill';
import Tooltip from '../components/Tooltip';
import {
  RARITY_TEXT, AFFIX_TIER_TEXT, TIER_BADGE,
} from './craftingConstants';
import {
  formatMatName, getInlineRefineInfo, rawToTrack, refinedToTrack, materialToZones,
} from './craftingHelpers';
import type { CraftingRecipeDef, Rarity } from '../../types';

// ---------------------------------------------------------------------------
// Material source tag — shows where a material comes from
// ---------------------------------------------------------------------------

function MaterialSourceTag({ materialId }: { materialId: string }) {
  // Refined → show "Mine → Refine" etc
  const refTrack = refinedToTrack.get(materialId);
  if (refTrack) {
    const TRACK_VERB: Record<string, string> = {
      ore: 'Mine', wood: 'Log', leather: 'Skin', cloth: 'Gather', herb: 'Herb', fish: 'Fish',
    };
    return <span className="text-[10px] text-gray-500 ml-1">{TRACK_VERB[refTrack] ?? refTrack} {'\u2192'} Refine</span>;
  }
  // Raw → show zone names
  const rawTrack = rawToTrack.get(materialId);
  if (rawTrack) {
    const zones = materialToZones.get(materialId);
    if (zones && zones.length > 0) {
      return <span className="text-[10px] text-gray-500 ml-1">{zones.slice(0, 2).join(', ')}</span>;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Inline refine button on a material line
// ---------------------------------------------------------------------------

interface InlineRefineProps {
  materialId: string;
  materials: Record<string, number>;
}

function InlineRefineButton({ materialId, materials }: InlineRefineProps) {
  const { refineMaterial } = useCraftingStore();
  const info = getInlineRefineInfo(materialId, materials);
  if (!info) return null;

  return (
    <Tooltip content={`Refine ${formatMatName(info.rawMaterialId)} (${info.rawHave}/${info.rawNeed})`}>
      <button
        onClick={(e) => { e.stopPropagation(); refineMaterial(info.recipeId); }}
        disabled={!info.canRefine}
        className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
          info.canRefine
            ? 'bg-teal-700 hover:bg-teal-600 text-teal-200'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        Refine
      </button>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Catalyst toggle buttons (replace dropdowns)
// ---------------------------------------------------------------------------

interface CatalystToggleProps {
  label: string;
  detail: string;
  count: number;
  active: boolean;
  color: string;
  activeColor: string;
  onToggle: () => void;
}

function CatalystToggle({ label, detail, count, active, color, activeColor, onToggle }: CatalystToggleProps) {
  return (
    <Tooltip content={detail}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          active ? activeColor : color
        }`}
      >
        <span className="truncate">{label}</span>
        <span className="text-[10px] opacity-70">({count})</span>
      </button>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// WorkbenchRecipeCard — self-contained recipe with inline refine + catalyst toggles
// ---------------------------------------------------------------------------

interface WorkbenchRecipeCardProps {
  recipe: CraftingRecipeDef;
  onMaterialClick?: (materialId: string) => void;
}

export function WorkbenchRecipeCard({ recipe, onMaterialClick }: WorkbenchRecipeCardProps) {
  const { craftingSkills, materials, gold } = useGameStore();
  const { craftRecipe, craftRecipeBatch } = useCraftingStore();

  const [selectedAffixCat, setSelectedAffixCat] = useState<string | null>(null);
  const [selectedRareCat, setSelectedRareCat] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; rarity: Rarity } | null>(null);

  const skill = craftingSkills[recipe.profession];
  const levelLocked = skill.level < recipe.requiredLevel;
  const craftable = !levelLocked && canCraftRecipe(recipe, craftingSkills, materials, gold);
  const isMaterialRecipe = !!recipe.outputMaterialId;
  const baseInfo = !isMaterialRecipe ? ITEM_BASE_DEFS.find(b => b.id === recipe.outputBaseId) : null;

  // Status: green = craftable, yellow = level met but missing mats, gray = locked
  const missingMats = !levelLocked && !craftable;
  const borderColor = craftable ? 'border-green-600/60' : missingMats ? 'border-yellow-600/40' : 'border-gray-700';
  const opacity = levelLocked ? 'opacity-50' : '';

  // Available catalysts (only owned)
  const availableAffixCats = AFFIX_CATALYST_DEFS.filter(d => (materials[d.id] ?? 0) > 0);
  const availableRareCats = RARE_MATERIAL_DEFS.filter(d => (materials[d.id] ?? 0) > 0);
  const showCatalysts = !isMaterialRecipe && recipe.catalystSlot && !recipe.requiredCatalyst && !levelLocked;

  // Craft handlers
  const handleCraft = () => {
    const result = craftRecipe(recipe.id, selectedRareCat || undefined, selectedAffixCat || undefined);
    if (result) {
      setFlash({ text: result.wasSalvaged ? `${result.item.name} (salvaged)` : result.item.name, rarity: result.item.rarity });
      setTimeout(() => setFlash(null), 2000);
    }
  };

  const handleCraftAll = () => {
    let max = Infinity;
    for (const { materialId, amount } of recipe.materials) {
      max = Math.min(max, Math.floor((materials[materialId] ?? 0) / amount));
    }
    max = Math.min(max, Math.floor(gold / recipe.goldCost));
    if (recipe.requiredCatalyst) {
      max = Math.min(max, Math.floor((materials[recipe.requiredCatalyst.rareMaterialId] ?? 0) / recipe.requiredCatalyst.amount));
    }
    if (selectedRareCat && !recipe.requiredCatalyst) max = Math.min(max, materials[selectedRareCat] ?? 0);
    if (selectedAffixCat) max = Math.min(max, materials[selectedAffixCat] ?? 0);
    if (max <= 0) return;

    const result = craftRecipeBatch(recipe.id, max, selectedRareCat || undefined, selectedAffixCat || undefined);
    if (result) {
      const txt = result.salvaged > 0
        ? `${result.crafted}x crafted (${result.salvaged} salvaged)`
        : `${result.crafted}x crafted`;
      setFlash({ text: txt, rarity: result.lastItem?.rarity ?? 'common' });
      setTimeout(() => setFlash(null), 2500);
    }
  };

  return (
    <div className={`panel-leather border ${borderColor} ${opacity} transition-colors`}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-base">
          {isMaterialRecipe ? '\u2697\uFE0F'
            : baseInfo?.weaponType ? '\u2694\uFE0F'
            : '\uD83D\uDEE1\uFE0F'}
        </span>
        <span className={`text-sm font-bold flex-1 truncate ${levelLocked ? 'text-gray-500' : 'text-white'}`}>
          {recipe.name}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIER_BADGE[recipe.tier] ?? 'bg-gray-600 text-gray-200'}`}>
          T{recipe.tier}
        </span>
        {!levelLocked && baseInfo && (
          <span className="text-[10px] text-gray-500">Lv.{recipe.requiredLevel}</span>
        )}
        {levelLocked && (
          <span className="text-[10px] text-yellow-500 font-semibold bg-yellow-900/30 px-1.5 py-0.5 rounded">
            Req. Lv.{recipe.requiredLevel}
          </span>
        )}

        {/* Craft buttons — inline in header for quick access */}
        {!levelLocked && (
          <div className="flex gap-1 ml-1">
            <button
              onClick={handleCraft}
              disabled={!craftable}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                craftable
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Craft
            </button>
            <button
              onClick={handleCraftAll}
              disabled={!craftable}
              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                craftable
                  ? 'bg-green-700 hover:bg-green-600 text-green-200'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              title="Craft maximum possible"
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Flash notification */}
      {flash && (
        <div className={`px-3 py-1 text-xs font-bold animate-pulse ${RARITY_TEXT[flash.rarity]}`}>
          {flash.text}
        </div>
      )}

      {/* Body — always visible (not collapsed) */}
      {!levelLocked && (
        <div className="px-3 pb-2.5 space-y-2">
          {/* Materials with source tags + inline refine */}
          <div className="space-y-1">
            {recipe.materials.map(({ materialId, amount }) => {
              const have = materials[materialId] ?? 0;
              const met = have >= amount;
              return (
                <div key={materialId} className="flex items-center gap-1 flex-wrap">
                  <MaterialPill
                    materialId={materialId}
                    have={have}
                    need={amount}
                    onMaterialClick={onMaterialClick}
                  />
                  <MaterialSourceTag materialId={materialId} />
                  {!met && <InlineRefineButton materialId={materialId} materials={materials} />}
                </div>
              );
            })}
            {/* Gold */}
            <div className="flex items-center gap-1">
              <MaterialPill materialId="gold" have={gold} need={recipe.goldCost} variant="gold" />
            </div>
          </div>

          {/* Required catalyst (unique recipes) */}
          {recipe.requiredCatalyst && (() => {
            const catDef = getRareMaterialDef(recipe.requiredCatalyst!.rareMaterialId);
            const have = materials[recipe.requiredCatalyst!.rareMaterialId] ?? 0;
            const met = have >= recipe.requiredCatalyst!.amount;
            return (
              <div className={`flex items-center gap-1 text-xs ${met ? 'text-purple-400' : 'text-red-400'}`}>
                {catDef
                  ? <CraftIcon category="material" id={catDef.id} fallback={catDef.icon} size="sm" />
                  : null}
                {catDef?.name ?? recipe.requiredCatalyst!.rareMaterialId}: {have}/{recipe.requiredCatalyst!.amount}
                {!met && <span className="text-red-500 ml-1">(missing)</span>}
              </div>
            );
          })()}

          {/* Catalyst toggles */}
          {showCatalysts && (availableAffixCats.length > 0 || availableRareCats.length > 0) && (
            <div className="space-y-1.5">
              {/* Affix catalysts */}
              {availableAffixCats.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-gray-500 mb-0.5">Affix Catalyst</div>
                  <div className="flex flex-wrap gap-1">
                    {availableAffixCats.map(ac => (
                      <CatalystToggle
                        key={ac.id}
                        label={`${ac.icon} +${ac.guaranteedAffix.replace(/_/g, ' ')}`}
                        detail={`Guarantees +${ac.guaranteedAffix.replace(/_/g, ' ')} on crafted item`}
                        count={materials[ac.id] ?? 0}
                        active={selectedAffixCat === ac.id}
                        color="bg-gray-700 text-gray-300 hover:bg-gray-600"
                        activeColor="bg-cyan-700 text-cyan-100 ring-1 ring-cyan-400"
                        onToggle={() => setSelectedAffixCat(prev => prev === ac.id ? null : ac.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rare material catalysts */}
              {availableRareCats.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-gray-500 mb-0.5">Quality Catalyst</div>
                  <div className="flex flex-wrap gap-1">
                    {availableRareCats.map(rc => {
                      const minRarity = CATALYST_RARITY_MAP[rc.rarity];
                      const bestTier = CATALYST_BEST_TIER[rc.rarity];
                      return (
                        <CatalystToggle
                          key={rc.id}
                          label={`${rc.icon} ${rc.name}`}
                          detail={`Guarantees ${minRarity}+ quality, best affix T${bestTier}`}
                          count={materials[rc.id] ?? 0}
                          active={selectedRareCat === rc.id}
                          color="bg-gray-700 text-gray-300 hover:bg-gray-600"
                          activeColor="bg-purple-700 text-purple-100 ring-1 ring-purple-400"
                          onToggle={() => setSelectedRareCat(prev => prev === rc.id ? null : rc.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected catalyst summary */}
              {(selectedAffixCat || selectedRareCat) && (
                <div className="text-xs bg-gray-900/50 rounded px-2 py-1 space-y-0.5">
                  {selectedAffixCat && (() => {
                    const def = getAffixCatalystDef(selectedAffixCat);
                    return def ? (
                      <div className="text-cyan-400 truncate">
                        {'\u2697\uFE0F'} +{def.guaranteedAffix.replace(/_/g, ' ')}
                      </div>
                    ) : null;
                  })()}
                  {selectedRareCat && (() => {
                    const def = getRareMaterialDef(selectedRareCat);
                    if (!def) return null;
                    return (
                      <div className={`truncate ${AFFIX_TIER_TEXT[CATALYST_BEST_TIER[def.rarity]] ?? 'text-purple-400'}`}>
                        {'\uD83D\uDC8E'} {CATALYST_RARITY_MAP[def.rarity]}+, T{CATALYST_BEST_TIER[def.rarity]} boosted
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CRAFTING_PROFESSION_DEFS } from '../../data/craftingProfessions';
import { getRecipesForProfession } from '../../data/craftingRecipes';
import { canCraftRecipe } from '../../engine/craftingProfessions';
import { RARE_MATERIAL_DEFS, getRareMaterialDef } from '../../data/rareMaterials';
import { AFFIX_CATALYST_DEFS, getAffixCatalystDef } from '../../data/affixCatalysts';
import { CATALYST_RARITY_MAP, CATALYST_BEST_TIER } from '../../data/balance';
import { ITEM_BASE_DEFS } from '../../data/items';
import { CraftIcon } from '../craftIcon';
import ProfessionSelector from './ProfessionSelector';
import XpBar from './XpBar';
import MaterialPill from './MaterialPill';
import CraftingSearchBar from './CraftingSearchBar';
import CraftLog from './CraftLog';
import CraftOutputPanel from './CraftOutputPanel';
import {
  RARITY_TEXT, AFFIX_TIER_TEXT,
  CRAFT_AUTO_SALVAGE_OPTIONS, TIER_BORDER, TIER_BADGE,
  SLOT_ICONS, CATEGORY_LABELS,
} from './craftingConstants';
import { formatMatName, getCategoryForRecipe } from './craftingHelpers';
import type { CraftingProfession, CraftingRecipeDef, Rarity } from '../../types';

interface CraftPanelProps {
  onMaterialClick?: (materialId: string) => void;
}

export default function CraftPanel({ onMaterialClick }: CraftPanelProps) {
  const { craftingSkills, materials, gold, craftRecipe, craftRecipeBatch, craftAutoSalvageMinRarity, setCraftAutoSalvageRarity } = useGameStore();
  const [selectedProfession, setSelectedProfession] = useState<CraftingProfession>('weaponsmith');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Set<string>>(new Set());
  const [rareCatalysts, setRareCatalysts] = useState<Record<string, string>>({});
  const [affixCatalysts, setAffixCatalysts] = useState<Record<string, string>>({});
  const [flashItem, setFlashItem] = useState<{ name: string; rarity: Rarity; wasSalvaged: boolean; batchCount?: number; batchSalvaged?: number } | null>(null);
  const [search, setSearch] = useState('');
  const [haveMats, setHaveMats] = useState(false);

  const skill = craftingSkills[selectedProfession];
  const allRecipes = getRecipesForProfession(selectedProfession);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    const searchLower = search.toLowerCase();
    return allRecipes.filter(r => {
      if (searchLower && !r.name.toLowerCase().includes(searchLower)) return false;
      if (haveMats) {
        const levelLocked = skill.level < r.requiredLevel;
        if (levelLocked) return false;
        if (!canCraftRecipe(r, craftingSkills, materials, gold)) return false;
      }
      return true;
    });
  }, [allRecipes, search, haveMats, skill.level, craftingSkills, materials, gold]);

  // Group filtered recipes by category
  const groupedRecipes = useMemo(() => {
    const groups = new Map<string, CraftingRecipeDef[]>();
    for (const r of filteredRecipes) {
      const cat = getCategoryForRecipe(r);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(r);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    }
    return groups;
  }, [filteredRecipes]);

  // Available catalysts
  const availableRareCatalysts = RARE_MATERIAL_DEFS.filter(d => (materials[d.id] ?? 0) > 0);
  const availableAffixCatalysts = AFFIX_CATALYST_DEFS.filter(d => (materials[d.id] ?? 0) > 0);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const toggleRecipe = (id: string) => {
    setExpandedRecipeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAllRecipes = () => setExpandedRecipeIds(new Set(filteredRecipes.map(r => r.id)));
  const collapseAllRecipes = () => setExpandedRecipeIds(new Set());

  const handleCraft = (recipeId: string) => {
    const catalystId = rareCatalysts[recipeId];
    const affixCatId = affixCatalysts[recipeId];
    const result = craftRecipe(recipeId, catalystId || undefined, affixCatId || undefined);
    if (result) {
      setFlashItem({ name: result.item.name, rarity: result.item.rarity, wasSalvaged: result.wasSalvaged });
      setTimeout(() => setFlashItem(null), 2000);
    }
  };

  const handleCraftAll = (recipe: CraftingRecipeDef) => {
    let maxFromMats = Infinity;
    for (const { materialId, amount } of recipe.materials) {
      maxFromMats = Math.min(maxFromMats, Math.floor((materials[materialId] ?? 0) / amount));
    }
    const maxFromGold = Math.floor(gold / recipe.goldCost);
    let max = Math.min(maxFromMats, maxFromGold);

    if (recipe.requiredCatalyst) {
      const have = materials[recipe.requiredCatalyst.rareMaterialId] ?? 0;
      max = Math.min(max, Math.floor(have / recipe.requiredCatalyst.amount));
    }

    const catalystId = rareCatalysts[recipe.id];
    const affixCatId = affixCatalysts[recipe.id];
    if (catalystId && !recipe.requiredCatalyst) {
      max = Math.min(max, materials[catalystId] ?? 0);
    }
    if (affixCatId) {
      max = Math.min(max, materials[affixCatId] ?? 0);
    }

    if (max <= 0) return;
    const result = craftRecipeBatch(recipe.id, max, catalystId || undefined, affixCatId || undefined);
    if (result) {
      setFlashItem({
        name: result.lastItem?.name ?? recipe.name,
        rarity: result.lastItem?.rarity ?? 'common',
        wasSalvaged: false,
        batchCount: result.crafted,
        batchSalvaged: result.salvaged,
      });
      setTimeout(() => setFlashItem(null), 2500);
    }
  };

  return (
    <div className="space-y-3">
      <CraftOutputPanel />

      <ProfessionSelector
        professions={CRAFTING_PROFESSION_DEFS.map(p => p.id)}
        selected={selectedProfession}
        onSelect={setSelectedProfession}
        craftingSkills={craftingSkills}
        color="blue"
      />

      <XpBar profession={selectedProfession} level={skill.level} xp={skill.xp} color="blue" />

      {/* Craft auto-salvage dropdown */}
      <div className="flex items-center justify-end gap-2">
        <label className="text-xs text-gray-500">Craft auto-salvage:</label>
        <select
          value={craftAutoSalvageMinRarity}
          onChange={(e) => setCraftAutoSalvageRarity(e.target.value as Rarity)}
          className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-1 py-0.5"
        >
          {CRAFT_AUTO_SALVAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <CraftingSearchBar
        search={search}
        onSearchChange={setSearch}
        haveMats={haveMats}
        onHaveMatsToggle={() => setHaveMats(p => !p)}
        showing={filteredRecipes.length}
        total={allRecipes.length}
      />

      <CraftLog />

      {/* Expand/Collapse all recipes */}
      <div className="flex items-center gap-2">
        <button onClick={expandAllRecipes} className="text-xs text-gray-400 hover:text-white">Expand All</button>
        <button onClick={collapseAllRecipes} className="text-xs text-gray-400 hover:text-white">Collapse All</button>
        {flashItem && (
          <span className={`ml-auto text-sm font-bold animate-pulse ${RARITY_TEXT[flashItem.rarity]}`}>
            {flashItem.batchCount && flashItem.batchCount > 1
              ? <>Crafted {flashItem.batchCount}x {flashItem.name}{flashItem.batchSalvaged ? <span className="text-amber-400 text-xs ml-1">({flashItem.batchSalvaged} salvaged)</span> : null}</>
              : <>Crafted: {flashItem.name}{flashItem.wasSalvaged && <span className="text-amber-400 text-xs ml-1">(auto-salvaged)</span>}</>
            }
          </span>
        )}
      </div>

      {/* Collapsible category sections */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
          {allRecipes.length === 0 ? 'No recipes for this profession.' : 'No recipes match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(groupedRecipes.entries()).map(([cat, catRecipes]) => {
            const isCollapsed = collapsedCategories.has(cat);
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-800/70 hover:bg-gray-700/70 transition-colors text-left"
                >
                  <span className="text-xs text-gray-500">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
                  <span className="text-sm font-bold text-gray-300">
                    {SLOT_ICONS[cat] ?? '\uD83D\uDCE6'} {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <span className="ml-auto text-xs text-gray-500">{catRecipes.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1 mt-1.5">
                    {catRecipes.map(recipe => (
                      <CraftRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        skill={skill}
                        materials={materials}
                        gold={gold}
                        expanded={expandedRecipeIds.has(recipe.id)}
                        onToggle={() => toggleRecipe(recipe.id)}
                        rareCatalysts={rareCatalysts}
                        affixCatalysts={affixCatalysts}
                        availableRareCatalysts={availableRareCatalysts}
                        availableAffixCatalysts={availableAffixCatalysts}
                        onSetRareCatalyst={(id, val) => setRareCatalysts(prev => ({ ...prev, [id]: val }))}
                        onSetAffixCatalyst={(id, val) => setAffixCatalysts(prev => ({ ...prev, [id]: val }))}
                        onCraft={handleCraft}
                        onCraftAll={handleCraftAll}
                        onMaterialClick={onMaterialClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single Recipe Card (collapsed by default) ──────────────────

interface CraftRecipeCardProps {
  recipe: CraftingRecipeDef;
  skill: { level: number; xp: number };
  materials: Record<string, number>;
  gold: number;
  expanded: boolean;
  onToggle: () => void;
  rareCatalysts: Record<string, string>;
  affixCatalysts: Record<string, string>;
  availableRareCatalysts: typeof RARE_MATERIAL_DEFS;
  availableAffixCatalysts: typeof AFFIX_CATALYST_DEFS;
  onSetRareCatalyst: (recipeId: string, val: string) => void;
  onSetAffixCatalyst: (recipeId: string, val: string) => void;
  onCraft: (recipeId: string) => void;
  onCraftAll: (recipe: CraftingRecipeDef) => void;
  onMaterialClick?: (materialId: string) => void;
}

function CraftRecipeCard({
  recipe, skill, materials, gold,
  expanded, onToggle,
  rareCatalysts, affixCatalysts,
  availableRareCatalysts, availableAffixCatalysts,
  onSetRareCatalyst, onSetAffixCatalyst,
  onCraft, onCraftAll, onMaterialClick,
}: CraftRecipeCardProps) {
  const craftingSkills = useGameStore(s => s.craftingSkills);
  const isMaterialRecipe = !!recipe.outputMaterialId;
  const baseInfo = !isMaterialRecipe ? ITEM_BASE_DEFS.find(b => b.id === recipe.outputBaseId) : null;
  const levelLocked = skill.level < recipe.requiredLevel;
  const craftable = !levelLocked && canCraftRecipe(recipe, craftingSkills, materials, gold);

  const affixCatDef = isMaterialRecipe
    ? AFFIX_CATALYST_DEFS.find(d => d.id === recipe.outputMaterialId)
    : null;

  const selAffixCatId = affixCatalysts[recipe.id];
  const selAffixCat = selAffixCatId ? getAffixCatalystDef(selAffixCatId) : null;
  const selRareCatId = rareCatalysts[recipe.id];
  const selRareCat = selRareCatId ? getRareMaterialDef(selRareCatId) : null;

  return (
    <div
      className={`bg-gray-800 rounded-lg border-l-4 border border-gray-700 ${
        TIER_BORDER[recipe.tier] ?? 'border-l-gray-500'
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full p-2.5 flex items-center gap-1.5 text-left"
      >
        <span className="text-sm">
          {isMaterialRecipe && affixCatDef
            ? <CraftIcon category="catalyst" id={affixCatDef.id} fallback={affixCatDef.icon} size="sm" />
            : isMaterialRecipe
            ? '\u2697\uFE0F'
            : baseInfo ? SLOT_ICONS[baseInfo.slot] ?? '\u2694\uFE0F' : '\u2694\uFE0F'}
        </span>
        <span className={`text-xs font-bold flex-1 truncate ${levelLocked ? 'text-gray-500' : 'text-white'}`}>
          {recipe.name}
        </span>
        {levelLocked && (
          <span className="text-xs text-yellow-500 font-semibold px-1.5 py-0.5 rounded bg-yellow-900/30 leading-none">
            Lv.{recipe.requiredLevel}
          </span>
        )}
        {recipe.requiredCatalyst && (
          <span className="text-purple-400 text-xs font-bold bg-purple-900/30 px-1 py-0.5 rounded leading-none">UNQ</span>
        )}
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded leading-none ${TIER_BADGE[recipe.tier] ?? 'bg-gray-600 text-gray-200'}`}>
          T{recipe.tier}
        </span>
        <span className={`w-2 h-2 rounded-full ${craftable ? 'bg-green-500' : levelLocked ? 'bg-gray-600' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-500">{expanded ? '\u25BC' : '\u25B6'}</span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {/* Metadata line */}
          {!isMaterialRecipe && (
            <div className="text-xs text-gray-500">
              iLvl {recipe.outputILvl} {'\u00B7'} {baseInfo?.armorType ?? baseInfo?.weaponType ?? baseInfo?.slot ?? ''}
            </div>
          )}

          {/* Material recipe output */}
          {isMaterialRecipe && (
            <div className="text-xs text-cyan-400">
              {'\u2697\uFE0F'} 1{'\u00D7'} {formatMatName(recipe.outputMaterialId!)}
              {affixCatDef && (
                <span className="text-gray-500 ml-1">({'\u2192'} +{affixCatDef.guaranteedAffix.replace(/_/g, ' ')})</span>
              )}
              <span className="text-gray-500 ml-1">Own: {materials[recipe.outputMaterialId!] ?? 0}</span>
            </div>
          )}

          {levelLocked ? (
            <div className="text-xs text-red-400 font-semibold">
              {'\uD83D\uDD12'} Req. Lv.{recipe.requiredLevel}
            </div>
          ) : (
            <>
              {/* Material pills */}
              <div className="flex flex-wrap gap-1">
                {recipe.materials.map(({ materialId, amount }) => (
                  <MaterialPill
                    key={materialId}
                    materialId={materialId}
                    have={materials[materialId] ?? 0}
                    need={amount}
                    onMaterialClick={onMaterialClick}
                  />
                ))}
                <MaterialPill
                  materialId="gold"
                  have={gold}
                  need={recipe.goldCost}
                  variant="gold"
                />
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

              {/* Catalyst dropdowns + craft button */}
              <div className="space-y-1">
                {!isMaterialRecipe && recipe.catalystSlot && !recipe.requiredCatalyst && (
                  <div className="flex flex-col sm:flex-row gap-1">
                    <select
                      value={affixCatalysts[recipe.id] ?? ''}
                      onChange={e => onSetAffixCatalyst(recipe.id, e.target.value)}
                      className="flex-1 min-w-0 bg-gray-700 text-xs text-gray-300 rounded px-1 py-1 border border-gray-600 truncate"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">{'\u2697\uFE0F'} None</option>
                      {availableAffixCatalysts.map(ac => (
                        <option key={ac.id} value={ac.id}>
                          {ac.icon} {ac.name} ({materials[ac.id]})
                        </option>
                      ))}
                    </select>
                    <select
                      value={rareCatalysts[recipe.id] ?? ''}
                      onChange={e => onSetRareCatalyst(recipe.id, e.target.value)}
                      className="flex-1 min-w-0 bg-gray-700 text-xs text-gray-300 rounded px-1 py-1 border border-gray-600 truncate"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">{'\uD83D\uDC8E'} None</option>
                      {availableRareCatalysts.map(rc => {
                        const guaranteed = CATALYST_RARITY_MAP[rc.rarity];
                        return (
                          <option key={rc.id} value={rc.id}>
                            {rc.icon} {rc.name} ({materials[rc.id]}) {'\u2192'} {guaranteed}+
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Selected catalyst summary */}
                {(selAffixCat || selRareCat) && (
                  <div className="text-xs bg-gray-900/50 rounded px-1.5 py-0.5 space-y-0.5">
                    {selAffixCat && (
                      <div className="text-cyan-400 truncate">
                        {'\u2697\uFE0F'} +{selAffixCat.guaranteedAffix.replace(/_/g, ' ')}
                      </div>
                    )}
                    {selRareCat && (
                      <div className={`truncate ${AFFIX_TIER_TEXT[CATALYST_BEST_TIER[selRareCat.rarity]] ?? 'text-purple-400'}`}>
                        {'\uD83D\uDC8E'} {CATALYST_RARITY_MAP[selRareCat.rarity]}+, T{CATALYST_BEST_TIER[selRareCat.rarity]} boosted
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onCraft(recipe.id); }}
                    disabled={!craftable}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      craftable
                        ? isMaterialRecipe ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isMaterialRecipe ? '\u2697\uFE0F Brew' : '\uD83D\uDD28 Craft'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCraftAll(recipe); }}
                    disabled={!craftable}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      craftable
                        ? isMaterialRecipe ? 'bg-cyan-700 hover:bg-cyan-600 text-cyan-200' : 'bg-blue-700 hover:bg-blue-600 text-blue-200'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    title="Craft maximum possible"
                  >
                    All
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

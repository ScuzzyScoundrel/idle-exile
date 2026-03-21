import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { CRAFTING_RECIPES } from '../../data/craftingRecipes';
import { canCraftRecipe } from '../../engine/craftingProfessions';
import { getPatternDef } from '../../data/craftingPatterns';
import { getPatternMaterialCost, canCraftPattern } from '../../engine/craftingProfessions';
import { ITEM_BASE_DEFS } from '../../data/items';
import { CRAFT_AUTO_SALVAGE_OPTIONS, RARITY_TEXT } from '../crafting/craftingConstants';
import { getRecipesBySlot, getProfessionForSlot, getWorkbenchSlot, formatMatName, getMatTooltip } from '../crafting/craftingHelpers';
import { resolveMaterialMeta } from '../craftIcon';
import Tooltip from '../components/Tooltip';
import { SlotPicker } from '../crafting/SlotPicker';
import { WorkbenchRecipeCard } from '../crafting/WorkbenchRecipeCard';
import { CraftingDrawer } from '../crafting/CraftingDrawer';
import XpBar from '../crafting/XpBar';
import CraftingSearchBar from '../crafting/CraftingSearchBar';
import CraftOutputPanel from '../crafting/CraftOutputPanel';
import CraftLog from '../crafting/CraftLog';
import MaterialsPanel from '../crafting/MaterialsPanel';
import RefinePanel from '../crafting/RefinePanel';
import ProfessionGearPanel from '../crafting/ProfessionGearPanel';
import ReforgePanel from '../crafting/ReforgePanel';
import MaterialDetailModal from '../crafting/MaterialDetailModal';
import type { WorkbenchSlot } from '../crafting/craftingHelpers';
import type { CraftingRecipeDef, Rarity, OwnedPattern, CraftingPatternDef } from '../../types';
import { getUniqueItemDef } from '../../data/uniqueItems';

type DrawerKind = 'bag' | 'refine' | 'gear' | 'reforge' | null;

export default function CraftingScreen() {
  const { craftingSkills, materials, gold, ownedPatterns, craftAutoSalvageMinRarity } = useGameStore();
  const { setCraftAutoSalvageRarity, craftFromPattern } = useCraftingStore();

  const [selectedSlot, setSelectedSlot] = useState<WorkbenchSlot | 'all'>('all');
  const [search, setSearch] = useState('');
  const [craftableOnly, setCraftableOnly] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [traceModalMaterialId, setTraceModalMaterialId] = useState<string | null>(null);
  const [showLowerTiers, setShowLowerTiers] = useState(false);
  const [patternFlash, setPatternFlash] = useState<{ text: string; rarity: Rarity } | null>(null);

  // Current profession for selected slot
  const activeProfession = selectedSlot === 'all' ? 'weaponsmith' : getProfessionForSlot(selectedSlot);
  const skill = craftingSkills[activeProfession];

  // Recipes for selected slot
  const slotMap = getRecipesBySlot();
  const allSlotRecipes = useMemo(() => {
    if (selectedSlot === 'all') return CRAFTING_RECIPES;
    return slotMap.get(selectedSlot) ?? [];
  }, [selectedSlot, slotMap]);

  // Filter + sort recipes
  const { topTier, lowerTier, hiddenLocked } = useMemo(() => {
    const searchLower = search.toLowerCase();
    const vis: CraftingRecipeDef[] = [];
    const locked: CraftingRecipeDef[] = [];

    for (const r of allSlotRecipes) {
      // Search filter
      if (searchLower && !r.name.toLowerCase().includes(searchLower)) continue;
      const profSkill = craftingSkills[r.profession];
      const levelLocked = profSkill.level < r.requiredLevel;

      if (levelLocked) {
        locked.push(r);
        continue;
      }

      const craftable = canCraftRecipe(r, craftingSkills, materials, gold);
      if (craftableOnly && !craftable) continue;
      vis.push(r);
    }

    // Sort: craftable first, then by tier desc, then name
    vis.sort((a, b) => {
      const aCraftable = canCraftRecipe(a, craftingSkills, materials, gold) ? 0 : 1;
      const bCraftable = canCraftRecipe(b, craftingSkills, materials, gold) ? 0 : 1;
      if (aCraftable !== bCraftable) return aCraftable - bCraftable;
      if (b.tier !== a.tier) return b.tier - a.tier;
      return a.name.localeCompare(b.name);
    });

    locked.sort((a, b) => a.requiredLevel - b.requiredLevel);

    // Split into top-tier (highest tier per base type) and lower tiers
    const highestTierByBase = new Map<string, number>();
    for (const r of vis) {
      const key = r.outputBaseId ? r.outputBaseId.replace(/_t\d+$/, '') : r.id;
      const cur = highestTierByBase.get(key) ?? 0;
      if (r.tier > cur) highestTierByBase.set(key, r.tier);
    }
    const top: CraftingRecipeDef[] = [];
    const lower: CraftingRecipeDef[] = [];
    for (const r of vis) {
      const key = r.outputBaseId ? r.outputBaseId.replace(/_t\d+$/, '') : r.id;
      if (r.tier === highestTierByBase.get(key)) {
        top.push(r);
      } else {
        lower.push(r);
      }
    }

    return { topTier: top, lowerTier: lower, hiddenLocked: locked };
  }, [allSlotRecipes, search, craftableOnly, craftingSkills, materials, gold]);

  // Patterns for selected slot
  const slotPatterns = useMemo(() => {
    const results: { owned: OwnedPattern; def: CraftingPatternDef; index: number }[] = [];
    for (let i = 0; i < ownedPatterns.length; i++) {
      const owned = ownedPatterns[i];
      const def = getPatternDef(owned.defId);
      if (!def || owned.charges <= 0) continue;
      if (selectedSlot !== 'all') {
        // Check if pattern's output maps to selected slot
        const base = ITEM_BASE_DEFS.find(b => b.id === def.outputBaseId);
        if (!base) continue;
        const patSlot = getWorkbenchSlot({ outputBaseId: def.outputBaseId, profession: def.profession } as CraftingRecipeDef);
        if (patSlot !== selectedSlot) continue;
      }
      results.push({ owned, def, index: i });
    }
    return results;
  }, [ownedPatterns, selectedSlot]);

  const handlePatternCraft = (index: number) => {
    const result = craftFromPattern(index);
    if (result) {
      const txt = result.wasSalvaged ? `${result.item.name} (salvaged)` : result.item.name;
      setPatternFlash({ text: txt, rarity: result.item.rarity });
      setTimeout(() => setPatternFlash(null), 2000);
    }
  };

  const handleMaterialClick = (materialId: string) => {
    setTraceModalMaterialId(materialId);
  };

  const totalRecipes = selectedSlot === 'all' ? CRAFTING_RECIPES.length : (slotMap.get(selectedSlot)?.length ?? 0);

  return (
    <div className="max-w-4xl xl:max-w-7xl mx-auto space-y-3">
      {/* Header with secondary panel buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yellow-400">Crafting Workbench</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setDrawer('bag')}
            className="px-2 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-semibold"
            title="Materials Bag"
          >
            {'\uD83C\uDF92'} Bag
          </button>
          <button
            onClick={() => setDrawer('refine')}
            className="px-2 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-semibold"
            title="Batch Refinement"
          >
            {'\u2697\uFE0F'} Refine
          </button>
          <button
            onClick={() => setDrawer('gear')}
            className="px-2 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-semibold"
            title="Profession Gear"
          >
            {'\u2699\uFE0F'} Gear
          </button>
          <button
            onClick={() => setDrawer('reforge')}
            className="px-2 py-1.5 rounded bg-gray-700 text-amber-400 hover:bg-gray-600 text-xs font-semibold"
            title="Reforge Uniques"
          >
            {'\uD83D\uDD28'} Reforge
          </button>
        </div>
      </div>

      {/* Slot picker */}
      <SlotPicker selected={selectedSlot} onSelect={setSelectedSlot} />

      {/* Profession XP bar (auto-detected) */}
      {selectedSlot !== 'all' && (
        <XpBar profession={activeProfession} level={skill.level} xp={skill.xp} color="blue" />
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <CraftingSearchBar
            search={search}
            onSearchChange={setSearch}
            haveMats={craftableOnly}
            onHaveMatsToggle={() => setCraftableOnly(p => !p)}
            showing={topTier.length + lowerTier.length}
            total={totalRecipes}
          />
        </div>
        {/* Auto-salvage */}
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-gray-500 whitespace-nowrap">Auto-salvage:</label>
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
      </div>

      {/* Pattern recipes (pinned section) */}
      {slotPatterns.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-yellow-400">{'\uD83D\uDCDC'} Patterns</span>
            <span className="text-[10px] text-gray-500">{slotPatterns.length}</span>
          </div>

          {patternFlash && (
            <div className={`text-xs font-bold animate-pulse ${RARITY_TEXT[patternFlash.rarity]}`}>
              {patternFlash.text}
            </div>
          )}

          {slotPatterns.map(({ owned, def, index }) => {
            const cost = getPatternMaterialCost(def);
            const canCraft = canCraftPattern(def, owned.charges, craftingSkills, materials, gold);
            const isUnique = !!def.uniqueDefId;
            const uniqueDef = isUnique ? getUniqueItemDef(def.uniqueDefId!) : undefined;
            return (
              <div
                key={`${owned.defId}-${index}`}
                className={`bg-gray-800 rounded-lg border ${isUnique ? (canCraft ? 'border-amber-500/60' : 'border-amber-900/50') : (canCraft ? 'border-yellow-600/50' : 'border-gray-700')} p-3 space-y-1.5`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isUnique ? 'bg-amber-900/60 text-amber-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                    {isUnique ? 'Unique' : 'Pattern'}
                  </span>
                  <span className={`text-sm font-bold truncate flex-1 ${isUnique ? 'text-amber-200' : 'text-yellow-200'}`}>{def.name}</span>
                  <span className="text-xs text-gray-400">{owned.charges} charge{owned.charges !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => handlePatternCraft(index)}
                    disabled={!canCraft}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      canCraft
                        ? (isUnique ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white')
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Craft
                  </button>
                </div>
                {isUnique && uniqueDef ? (
                  <div className="space-y-1">
                    <div className="text-xs text-amber-400 italic">{uniqueDef.uniqueAffix.displayText}</div>
                    <div className="text-[10px] text-gray-500 italic">{uniqueDef.lore}</div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 text-xs">
                    {def.guaranteedAffixes.map(affix => (
                      <span key={affix} className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-300 border border-green-700/50">
                        +{formatMatName(affix)}
                      </span>
                    ))}
                    <span className={`px-1.5 py-0.5 rounded ${RARITY_TEXT[def.minRarity]} bg-gray-800 border border-gray-600`}>
                      {def.minRarity}+
                    </span>
                  </div>
                )}
                {cost && (
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
                    {cost.materials.map(m => {
                      const have = materials[m.materialId] ?? 0;
                      const meta = resolveMaterialMeta(m.materialId);
                      const displayName = meta?.name ?? formatMatName(m.materialId);
                      const tip = getMatTooltip(m.materialId);
                      const pill = (
                        <span className={`cursor-default ${have >= m.amount ? 'text-gray-400' : 'text-red-400'}`}>
                          {meta?.emoji ? `${meta.emoji} ` : ''}{displayName} {have}/{m.amount}
                        </span>
                      );
                      return tip ? (
                        <Tooltip key={m.materialId} content={tip}>{pill}</Tooltip>
                      ) : (
                        <span key={m.materialId}>{pill}</span>
                      );
                    })}
                    <span className={gold >= cost.goldCost ? 'text-yellow-400' : 'text-red-400'}>
                      {cost.goldCost}g
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe list — top tier (highest craftable per base) */}
      {topTier.length === 0 && slotPatterns.length === 0 ? (
        <div className="panel-stone p-6 text-center text-gray-500 text-sm">
          {totalRecipes === 0 ? 'No recipes for this slot.' : 'No recipes match your filters.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {topTier.map(recipe => (
            <WorkbenchRecipeCard
              key={recipe.id}
              recipe={recipe}
              onMaterialClick={handleMaterialClick}
            />
          ))}
        </div>
      )}

      {/* Lower tiers accordion */}
      {lowerTier.length > 0 && (
        <div>
          <button
            onClick={() => setShowLowerTiers(p => !p)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showLowerTiers ? '\u25BC' : '\u25B6'} {lowerTier.length} lower tier recipe{lowerTier.length !== 1 ? 's' : ''}
          </button>
          {showLowerTiers && (
            <div className="space-y-1.5 mt-1.5 opacity-70">
              {lowerTier.map(recipe => (
                <WorkbenchRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onMaterialClick={handleMaterialClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show locked toggle */}
      {hiddenLocked.length > 0 && (
        <div>
          <button
            onClick={() => setShowLocked(p => !p)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showLocked ? '\u25BC' : '\u25B6'} {hiddenLocked.length} locked recipe{hiddenLocked.length !== 1 ? 's' : ''} (level too low)
          </button>
          {showLocked && (
            <div className="space-y-1.5 mt-1.5 opacity-50">
              {hiddenLocked.map(recipe => (
                <WorkbenchRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onMaterialClick={handleMaterialClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Output buffer + craft log */}
      <CraftOutputPanel />
      <CraftLog />

      {/* Secondary panel drawers */}
      <CraftingDrawer open={drawer === 'bag'} onClose={() => setDrawer(null)} title="Materials Bag">
        <MaterialsPanel onMaterialClick={handleMaterialClick} />
      </CraftingDrawer>
      <CraftingDrawer open={drawer === 'refine'} onClose={() => setDrawer(null)} title="Refinement">
        <RefinePanel />
      </CraftingDrawer>
      <CraftingDrawer open={drawer === 'gear'} onClose={() => setDrawer(null)} title="Profession Gear">
        <ProfessionGearPanel />
      </CraftingDrawer>
      <CraftingDrawer open={drawer === 'reforge'} onClose={() => setDrawer(null)} title="Reforge Unique">
        <ReforgePanel />
      </CraftingDrawer>

      {/* Material traceability modal */}
      {traceModalMaterialId && (
        <MaterialDetailModal
          materialId={traceModalMaterialId}
          onClose={() => setTraceModalMaterialId(null)}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { REFINEMENT_TRACK_DEFS } from '../../data/refinement';
import { getRefinementChain } from '../../engine/refinement';
import { canRefine, canDeconstruct } from '../../engine/refinement';
import { CRAFTING_PROFESSION_DEFS } from '../../data/craftingProfessions';
import { getRecipesForProfession } from '../../data/craftingRecipes';
import { canCraftRecipe } from '../../engine/craftingProfessions';
import { calcCraftingXpRequired } from '../../engine/craftingProfessions';
import { RARE_MATERIAL_DEFS, getRareMaterialDef } from '../../data/rareMaterials';
import { AFFIX_CATALYST_DEFS, getAffixCatalystDef } from '../../data/affixCatalysts';
import { CATALYST_RARITY_MAP, CATALYST_BEST_TIER } from '../../data/balance';
import { ITEM_BASE_DEFS } from '../../data/items';
import { REFINEMENT_RECIPES } from '../../data/refinement';
import { ZONE_DEFS } from '../../data/zones';
import { CraftIcon, resolveMaterialMeta } from '../../ui/craftIcon';
import Tooltip from '../components/Tooltip';
import type { CraftingProfession, CraftingRecipeDef, Rarity, RefinementTrack } from '../../types';

// Rarity color classes
const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

// Rare catalyst affix tier → text color (matches the tier quality the catalyst grants)
const AFFIX_TIER_TEXT: Record<number, string> = {
  1: 'text-orange-400',  // legendary catalyst → T1
  2: 'text-purple-400',  // epic → T2
  3: 'text-blue-400',    // rare → T3
  5: 'text-green-400',   // uncommon → T5
  6: 'text-gray-400',    // common → T6
};

const CRAFT_AUTO_SALVAGE_OPTIONS: { value: Rarity; label: string }[] = [
  { value: 'common', label: 'None' },
  { value: 'uncommon', label: 'Common' },
  { value: 'rare', label: '\u2264 Uncommon' },
  { value: 'epic', label: '\u2264 Rare' },
  { value: 'legendary', label: '\u2264 Epic' },
];

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
};

const RARITY_GRADIENT: Record<Rarity, string> = {
  common: 'from-green-900/50',
  uncommon: 'from-blue-900/50',
  rare: 'from-yellow-900/50',
  epic: 'from-purple-900/50',
  legendary: 'from-orange-900/50',
};

type SubTab = 'materials' | 'refine' | 'craft';

// Build track lookups from refinement recipes (static, computed once)
const rawToTrack = new Map<string, RefinementTrack>();
const refinedToTrack = new Map<string, RefinementTrack>();
for (const r of REFINEMENT_RECIPES) {
  rawToTrack.set(r.rawMaterialId, r.track);
  refinedToTrack.set(r.outputId, r.track);
}

// Reverse lookup: materialId → zone names where it drops
const materialToZones = new Map<string, string[]>();
for (const zone of ZONE_DEFS) {
  for (const matId of zone.materialDrops) {
    if (!materialToZones.has(matId)) materialToZones.set(matId, []);
    materialToZones.get(matId)!.push(zone.name);
  }
}

export default function CraftingScreen() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
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
            } ${tutorialStep === 6 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
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

interface MatItem {
  id: string;
  count: number;
  icon?: string;
  color?: string;
  subtitle?: string;
  rarity?: Rarity;
  isAffix?: boolean;
}

function MaterialsPanel() {
  const { materials } = useGameStore();

  const affixCatIds = new Set(AFFIX_CATALYST_DEFS.map(d => d.id));
  const rareIds = new Set(RARE_MATERIAL_DEFS.map(d => d.id));
  const miscIds = new Set(['enchanting_essence', 'magic_essence']);

  // Group by track
  const trackGroups = new Map<RefinementTrack, MatItem[]>();
  const affixCats: MatItem[] = [];
  const rare: MatItem[] = [];
  const misc: MatItem[] = [];

  for (const [id, count] of Object.entries(materials)) {
    if (count <= 0) continue;

    if (affixCatIds.has(id)) {
      const def = AFFIX_CATALYST_DEFS.find(d => d.id === id);
      affixCats.push({
        id, count,
        icon: def?.icon,
        color: 'text-cyan-400',
        subtitle: def ? `\u2192 +${def.guaranteedAffix.replace(/_/g, ' ')}` : undefined,
        isAffix: true,
      });
    } else if (rareIds.has(id)) {
      const def = getRareMaterialDef(id);
      rare.push({
        id, count,
        icon: def?.icon,
        color: def ? RARITY_TEXT[def.rarity as Rarity] : undefined,
        subtitle: def ? `${def.rarity} catalyst` : undefined,
        rarity: def?.rarity as Rarity,
      });
    } else if (miscIds.has(id)) {
      misc.push({ id, count });
    } else {
      // Raw or refined — group by track
      const track = rawToTrack.get(id) ?? refinedToTrack.get(id);
      if (track) {
        if (!trackGroups.has(track)) trackGroups.set(track, []);
        trackGroups.get(track)!.push({ id, count });
      } else {
        misc.push({ id, count });
      }
    }
  }

  const sections: { label: string; icon: string; items: MatItem[] }[] = [];

  // Add track groups in canonical order
  for (const trackDef of REFINEMENT_TRACK_DEFS) {
    const items = trackGroups.get(trackDef.id);
    if (items && items.length > 0) {
      sections.push({ label: trackDef.name, icon: trackDef.icon, items });
    }
  }
  if (affixCats.length > 0) sections.push({ label: 'Affix Catalysts', icon: '\u2697\uFE0F', items: affixCats });
  if (rare.length > 0) sections.push({ label: 'Rare Materials', icon: '\uD83D\uDC8E', items: rare });
  if (misc.length > 0) sections.push({ label: 'Misc', icon: '\uD83D\uDCE6', items: misc });

  if (sections.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
        No materials yet. Go gathering or fight some monsters!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map(sec => (
        <div key={sec.label}>
          <div className="text-sm font-bold text-gray-400 border-b border-gray-700/50 pb-1 mb-2">{sec.icon} {sec.label}</div>
          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
            {sec.items.map(item => {
              const tooltipContent = getMatTooltip(item.id);
              const meta = resolveMaterialMeta(item.id);
              const border = item.rarity ? RARITY_BORDER[item.rarity] : item.isAffix ? 'border-cyan-600' : 'border-gray-600';
              const grad = item.rarity ? RARITY_GRADIENT[item.rarity] : '';
              const card = (
                <div className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center overflow-hidden ${item.rarity ? '' : 'bg-gray-900'} ${border}`}>
                  {item.rarity && (
                    <div className={`absolute inset-0 bg-gradient-to-t ${grad} to-transparent pointer-events-none`} />
                  )}
                  {meta
                    ? <CraftIcon category={meta.category} id={item.id} fallback={meta.emoji} size="xl" className="relative z-10" />
                    : <span className="text-3xl">{item.icon ?? '\uD83E\uDEA8'}</span>}
                  <span className="absolute top-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1 rounded-bl z-10">{item.count}</span>
                  <span className="relative z-10 text-[8px] text-gray-400 text-center leading-tight truncate w-full px-0.5 mt-auto">{meta?.name ?? formatMatName(item.id)}</span>
                </div>
              );
              return tooltipContent ? (
                <Tooltip key={item.id} content={tooltipContent}>{card}</Tooltip>
              ) : (
                <div key={item.id}>{card}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Generate tooltip text for a material. */
function getMatTooltip(id: string): string | null {
  // Affix catalyst
  const affixDef = AFFIX_CATALYST_DEFS.find(d => d.id === id);
  if (affixDef) {
    return `Guarantees +${affixDef.guaranteedAffix.replace(/_/g, ' ')} on crafted gear. Brewed by Alchemist.`;
  }

  // Rare material
  const rareDef = getRareMaterialDef(id);
  if (rareDef) {
    const minRarity = CATALYST_RARITY_MAP[rareDef.rarity];
    const bestTier = CATALYST_BEST_TIER[rareDef.rarity];
    return `${rareDef.description}. Catalyst: ${minRarity}+ item with 1 boosted T${bestTier} affix.`;
  }

  // Raw material
  const rawTrack = rawToTrack.get(id);
  if (rawTrack) {
    const trackDef = REFINEMENT_TRACK_DEFS.find(t => t.id === rawTrack);
    const recipe = REFINEMENT_RECIPES.find(r => r.rawMaterialId === id);
    const refinedName = recipe ? formatMatName(recipe.outputId) : 'refined materials';
    const zones = materialToZones.get(id);
    let tip = `Gathered via ${trackDef?.name ?? rawTrack}. Refine into ${refinedName}.`;
    if (zones && zones.length > 0) tip += `\nFound in: ${zones.join(', ')}`;
    return tip;
  }

  // Refined material
  const refTrack = refinedToTrack.get(id);
  if (refTrack) {
    const recipe = REFINEMENT_RECIPES.find(r => r.outputId === id);
    const rawName = recipe ? formatMatName(recipe.rawMaterialId) : 'raw materials';
    const rawZones = recipe ? materialToZones.get(recipe.rawMaterialId) : undefined;
    let tip = `Refined from ${rawName}. Used in crafting recipes.`;
    if (rawZones && rawZones.length > 0) tip += `\nSource: ${rawZones.join(', ')}`;
    return tip;
  }

  return null;
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

// ─── Craft Panel ─────────────────────────────────────────────────

// Tier left-border colors
const TIER_BORDER: Record<number, string> = {
  1: 'border-l-gray-500',
  2: 'border-l-green-500',
  3: 'border-l-blue-500',
  4: 'border-l-purple-500',
  5: 'border-l-orange-500',
  6: 'border-l-red-500',
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

// Derive a category label from a recipe's output base
function getCategoryForRecipe(recipe: CraftingRecipeDef): string {
  if (recipe.outputMaterialId) return 'catalyst';
  const base = ITEM_BASE_DEFS.find(b => b.id === recipe.outputBaseId);
  if (!base) return 'other';
  if (recipe.profession === 'weaponsmith' && base.weaponType) return base.weaponType;
  if (recipe.profession === 'weaponsmith' && base.slot === 'offhand') return 'offhand';
  return base.slot;
}

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  sword: 'Swords', axe: 'Axes', mace: 'Maces', dagger: 'Daggers',
  staff: 'Staves', wand: 'Wands', bow: 'Bows', crossbow: 'Crossbows',
  offhand: 'Offhands',
  helmet: 'Helmets', chest: 'Chest',
  gloves: 'Gloves', pants: 'Legs', boots: 'Boots',
  shoulders: 'Shoulders', cloak: 'Cloaks', bracers: 'Bracers',
  neck: 'Neck', belt: 'Belts',
  ring1: 'Rings', ring2: 'Rings',
  trinket1: 'Trinkets', trinket2: 'Trinkets',
  mainhand: 'Weapons',
  catalyst: 'Catalysts',
};

// Material icon lookup from refinement track
function getMatIcon(matId: string): string {
  const track = rawToTrack.get(matId) ?? refinedToTrack.get(matId);
  if (track) {
    const td = REFINEMENT_TRACK_DEFS.find(t => t.id === track);
    if (td) return td.icon;
  }
  if (matId === 'enchanting_essence') return '\u2728';
  if (matId === 'magic_essence') return '\uD83D\uDCAB';
  return '\uD83E\uDEA8';
}

// Tier badge bg colors
const TIER_BADGE: Record<number, string> = {
  1: 'bg-gray-600 text-gray-200',
  2: 'bg-green-900/60 text-green-300',
  3: 'bg-blue-900/60 text-blue-300',
  4: 'bg-purple-900/60 text-purple-300',
  5: 'bg-orange-900/60 text-orange-300',
  6: 'bg-red-900/60 text-red-300',
};

function CraftPanel() {
  const { craftingSkills, materials, gold, craftRecipe, craftRecipeBatch, craftAutoSalvageMinRarity, setCraftAutoSalvageRarity } = useGameStore();
  const [selectedProfession, setSelectedProfession] = useState<CraftingProfession>('weaponsmith');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [rareCatalysts, setRareCatalysts] = useState<Record<string, string>>({});
  const [affixCatalysts, setAffixCatalysts] = useState<Record<string, string>>({});
  const [flashItem, setFlashItem] = useState<{ name: string; rarity: Rarity; wasSalvaged: boolean; batchCount?: number; batchSalvaged?: number } | null>(null);

  const skill = craftingSkills[selectedProfession];
  const xpToNext = calcCraftingXpRequired(skill.level);
  const recipes = getRecipesForProfession(selectedProfession);

  // Group recipes by category
  const groupedRecipes = useMemo(() => {
    const groups = new Map<string, CraftingRecipeDef[]>();
    for (const r of recipes) {
      const cat = getCategoryForRecipe(r);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(r);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    }
    return groups;
  }, [selectedProfession]); // eslint-disable-line react-hooks/exhaustive-deps

  // Available catalysts
  const availableRareCatalysts = RARE_MATERIAL_DEFS.filter(d => (materials[d.id] ?? 0) > 0);
  const availableAffixCatalysts = AFFIX_CATALYST_DEFS.filter(d => (materials[d.id] ?? 0) > 0);

  const handleProfessionChange = (prof: CraftingProfession) => {
    setSelectedProfession(prof);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

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
    // Calculate max craftable
    let maxFromMats = Infinity;
    for (const { materialId, amount } of recipe.materials) {
      maxFromMats = Math.min(maxFromMats, Math.floor((materials[materialId] ?? 0) / amount));
    }
    const maxFromGold = Math.floor(gold / recipe.goldCost);
    let max = Math.min(maxFromMats, maxFromGold);

    // Required catalyst limits
    if (recipe.requiredCatalyst) {
      const have = materials[recipe.requiredCatalyst.rareMaterialId] ?? 0;
      max = Math.min(max, Math.floor(have / recipe.requiredCatalyst.amount));
    }

    // Optional catalysts consumed per craft
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
      {/* Profession selector pills */}
      <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
        {CRAFTING_PROFESSION_DEFS.map(prof => {
          const s = craftingSkills[prof.id];
          const isActive = selectedProfession === prof.id;
          return (
            <button
              key={prof.id}
              onClick={() => handleProfessionChange(prof.id)}
              className={`flex-1 py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={prof.description}
            >
              <span className="block text-center">
                <span className="text-sm">{prof.icon}</span>
                <span className="block text-xs mt-0.5">{prof.name}</span>
                <span className="block text-xs opacity-70">Lv.{s.level}</span>
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

      {/* Flash craft result */}
      {flashItem && (
        <div className={`text-center text-sm font-bold py-2 rounded-lg border animate-pulse ${
          RARITY_BORDER[flashItem.rarity]
        } ${RARITY_TEXT[flashItem.rarity]} bg-gray-900`}>
          {flashItem.batchCount && flashItem.batchCount > 1
            ? <>Crafted {flashItem.batchCount}x {flashItem.name}{flashItem.batchSalvaged ? <span className="text-amber-400 text-xs ml-1">({flashItem.batchSalvaged} salvaged)</span> : null}</>
            : <>Crafted: {flashItem.name}{flashItem.wasSalvaged && <span className="text-amber-400 text-xs ml-1">(auto-salvaged)</span>}</>
          }
        </div>
      )}

      {/* Collapsible category sections */}
      <div className="space-y-2">
        {Array.from(groupedRecipes.entries()).map(([cat, catRecipes]) => {
          const isCollapsed = collapsedCategories.has(cat);
          return (
            <div key={cat}>
              {/* Section header */}
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

              {/* Recipe grid */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-1.5">
                  {catRecipes.map(recipe => {
                    const isMaterialRecipe = !!recipe.outputMaterialId;
                    const baseInfo = !isMaterialRecipe ? ITEM_BASE_DEFS.find(b => b.id === recipe.outputBaseId) : null;
                    const levelLocked = skill.level < recipe.requiredLevel;
                    const craftable = !levelLocked && canCraftRecipe(recipe, craftingSkills, materials, gold);

                    // Affix catalyst def for material recipes
                    const affixCatDef = isMaterialRecipe
                      ? AFFIX_CATALYST_DEFS.find(d => d.id === recipe.outputMaterialId)
                      : null;

                    // Selected catalysts
                    const selAffixCatId = affixCatalysts[recipe.id];
                    const selAffixCat = selAffixCatId ? getAffixCatalystDef(selAffixCatId) : null;
                    const selRareCatId = rareCatalysts[recipe.id];
                    const selRareCat = selRareCatId ? getRareMaterialDef(selRareCatId) : null;

                    // Slot label for metadata
                    const slotLabel = baseInfo
                      ? baseInfo.armorType ?? baseInfo.weaponType ?? baseInfo.slot
                      : '';

                    return (
                      <div
                        key={recipe.id}
                        className={`bg-gray-800 rounded-lg border-l-4 border border-gray-700 ${
                          TIER_BORDER[recipe.tier] ?? 'border-l-gray-500'
                        } ${levelLocked ? 'opacity-50' : ''}`}
                      >
                        <div className="p-2.5 space-y-1.5">
                          {/* Header: icon + name + tier badge */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">
                              {isMaterialRecipe && affixCatDef
                                ? <CraftIcon category="catalyst" id={affixCatDef.id} fallback={affixCatDef.icon} size="sm" />
                                : isMaterialRecipe
                                ? '\u2697\uFE0F'
                                : baseInfo ? SLOT_ICONS[baseInfo.slot] ?? '\u2694\uFE0F' : '\u2694\uFE0F'}
                            </span>
                            <span className="text-xs font-bold text-white flex-1 truncate">{recipe.name}</span>
                            {recipe.requiredCatalyst && (
                              <span className="text-purple-400 text-xs font-bold bg-purple-900/30 px-1 py-0.5 rounded leading-none">UNQ</span>
                            )}
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded leading-none ${TIER_BADGE[recipe.tier] ?? 'bg-gray-600 text-gray-200'}`}>
                              T{recipe.tier}
                            </span>
                          </div>

                          {/* Metadata line */}
                          {!isMaterialRecipe && (
                            <div className="text-xs text-gray-500">
                              iLvl {recipe.outputILvl} {'\u00B7'} {slotLabel}
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

                          {/* Level locked */}
                          {levelLocked ? (
                            <div className="text-xs text-red-400 font-semibold">
                              {'\uD83D\uDD12'} Req. Lv.{recipe.requiredLevel}
                            </div>
                          ) : (
                            <>
                              {/* Material pills */}
                              <div className="flex flex-wrap gap-1">
                                {recipe.materials.map(({ materialId, amount }) => {
                                  const have = materials[materialId] ?? 0;
                                  const met = have >= amount;
                                  return (
                                    <Tooltip key={materialId} content={getMatTooltip(materialId) ?? formatMatName(materialId)}>
                                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs cursor-help ${
                                        met ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                      }`}>
                                        {getMatIcon(materialId)} {formatMatName(materialId)} {have}/{amount}
                                      </span>
                                    </Tooltip>
                                  );
                                })}
                                <Tooltip content="Gold cost">
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs cursor-help ${
                                    gold >= recipe.goldCost ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'
                                  }`}>
                                    {'\uD83D\uDCB0'} {recipe.goldCost}
                                  </span>
                                </Tooltip>
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
                                  <div className="flex gap-1">
                                    <select
                                      value={affixCatalysts[recipe.id] ?? ''}
                                      onChange={e => setAffixCatalysts(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                                      className="flex-1 min-w-0 bg-gray-700 text-xs text-gray-300 rounded px-1 py-1 border border-gray-600 truncate"
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
                                      onChange={e => setRareCatalysts(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                                      className="flex-1 min-w-0 bg-gray-700 text-xs text-gray-300 rounded px-1 py-1 border border-gray-600 truncate"
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
                                    onClick={() => handleCraft(recipe.id)}
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
                                    onClick={() => handleCraftAll(recipe)}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatMatName(id: string): string {
  return id.replace(/_/g, ' ');
}

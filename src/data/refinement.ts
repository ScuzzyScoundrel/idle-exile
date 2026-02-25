import type { RefinementRecipeDef, RefinementTrack } from '../types';

// ---------------------------------------------------------------------------
// Track metadata
// ---------------------------------------------------------------------------

export interface RefinementTrackDef {
  id: RefinementTrack;
  name: string;
  icon: string;
}

export const REFINEMENT_TRACK_DEFS: RefinementTrackDef[] = [
  { id: 'ore',     name: 'Ore',     icon: '⛏️' },
  { id: 'cloth',   name: 'Cloth',   icon: '🧵' },
  { id: 'leather', name: 'Leather', icon: '🪡' },
  { id: 'wood',    name: 'Wood',    icon: '🪵' },
  { id: 'herb',    name: 'Herb',    icon: '🌿' },
  { id: 'fish',    name: 'Fish',    icon: '🐟' },
  { id: 'catalyst', name: 'Catalysts', icon: '⚗️' },
];

// ---------------------------------------------------------------------------
// Gold costs & amounts by tier
// ---------------------------------------------------------------------------

const GOLD_COST: Record<number, number> = {
  1: 5, 2: 15, 3: 30, 4: 60, 5: 100, 6: 200,
};

const RAW_AMOUNT = 5;
const PREV_REFINED_AMOUNT = 2;

// ---------------------------------------------------------------------------
// Helper to build a recipe
// ---------------------------------------------------------------------------

function recipe(
  track: RefinementTrack,
  tier: number,
  rawMaterialId: string,
  outputId: string,
  outputName: string,
  previousRefinedId: string | null,
): RefinementRecipeDef {
  return {
    id: `refine_${outputId}`,
    track,
    tier,
    rawMaterialId,
    rawAmount: RAW_AMOUNT,
    previousRefinedId,
    previousRefinedAmount: previousRefinedId ? PREV_REFINED_AMOUNT : 0,
    outputId,
    outputName,
    goldCost: GOLD_COST[tier],
  };
}

// ---------------------------------------------------------------------------
// 36 Refinement Recipes (6 tracks × 6 tiers)
// ---------------------------------------------------------------------------

export const REFINEMENT_RECIPES: RefinementRecipeDef[] = [
  // ── Ore ──────────────────────────────────────────────────────────────────
  recipe('ore', 1, 'cindite_ore',   'cindite_ingot',    'Cindite Ingot',    null),
  recipe('ore', 2, 'ferrite_ore',   'ferrite_ingot',    'Ferrite Ingot',    'cindite_ingot'),
  recipe('ore', 3, 'magmaite_ore',  'forged_alloy',     'Forged Alloy',     'ferrite_ingot'),
  recipe('ore', 4, 'voidite_ore',   'voidsteel_ingot',  'Voidsteel Ingot',  'forged_alloy'),
  recipe('ore', 5, 'celestite_ore', 'celesteel_ingot',  'Celesteel Ingot',  'voidsteel_ingot'),
  recipe('ore', 6, 'astralite_ore', 'primordial_ingot', 'Primordial Ingot', 'celesteel_ingot'),

  // ── Wood ─────────────────────────────────────────────────────────────────
  recipe('wood', 1, 'emberwood_logs', 'emberwood_plank',   'Emberwood Plank',   null),
  recipe('wood', 2, 'blight_bark',    'ironwood_plank',    'Ironwood Plank',    'emberwood_plank'),
  recipe('wood', 3, 'ironbark_logs',  'steelwood_plank',   'Steelwood Plank',   'ironwood_plank'),
  recipe('wood', 4, 'shadowbark',     'shadowwood_plank',  'Shadowwood Plank',  'steelwood_plank'),
  recipe('wood', 5, 'dreadwood',      'dreadwood_plank',   'Dreadwood Plank',   'shadowwood_plank'),
  recipe('wood', 6, 'titanbark',      'primordial_plank',  'Primordial Plank',  'dreadwood_plank'),

  // ── Leather ──────────────────────────────────────────────────────────────
  recipe('leather', 1, 'ragged_pelts',  'cured_leather',      'Cured Leather',      null),
  recipe('leather', 2, 'galehide',      'hardened_leather',   'Hardened Leather',   'cured_leather'),
  recipe('leather', 3, 'thornhide',     'reinforced_leather', 'Reinforced Leather', 'hardened_leather'),
  recipe('leather', 4, 'spectralhide',  'shadowleather',      'Shadowleather',      'reinforced_leather'),
  recipe('leather', 5, 'dreadscale',    'dreadleather',       'Dreadleather',       'shadowleather'),
  recipe('leather', 6, 'voidhide',      'primordial_leather', 'Primordial Leather', 'dreadleather'),

  // ── Cloth ────────────────────────────────────────────────────────────────
  recipe('cloth', 1, 'thornweave_fiber', 'thornweave_cloth',  'Thornweave Cloth',  null),
  recipe('cloth', 2, 'steppe_flax',      'woven_linen',       'Woven Linen',       'thornweave_cloth'),
  recipe('cloth', 3, 'silkweave_fiber',  'silkweave_cloth',   'Silkweave Cloth',   'woven_linen'),
  recipe('cloth', 4, 'ashweave_fiber',   'shadowcloth',       'Shadowcloth',       'silkweave_cloth'),
  recipe('cloth', 5, 'aetherweave',      'aethercloth',       'Aethercloth',       'shadowcloth'),
  recipe('cloth', 6, 'starweave_fiber',  'primordial_cloth',  'Primordial Cloth',  'aethercloth'),

  // ── Herb ─────────────────────────────────────────────────────────────────
  recipe('herb', 1, 'wispbloom',       'wispbloom_extract',   'Wispbloom Extract',   null),
  recipe('herb', 2, 'marshbloom',      'potent_tincture',     'Potent Tincture',     'wispbloom_extract'),
  recipe('herb', 3, 'lustreleaf',      'lustral_essence',     'Lustral Essence',     'potent_tincture'),
  recipe('herb', 4, 'blightbloom',     'shadow_elixir',       'Shadow Elixir',       'lustral_essence'),
  recipe('herb', 5, 'galecrest_herb',  'tempest_distillate',  'Tempest Distillate',  'shadow_elixir'),
  recipe('herb', 6, 'thunderbloom',    'primordial_essence',  'Primordial Essence',  'tempest_distillate'),

  // ── Fish ─────────────────────────────────────────────────────────────────
  recipe('fish', 1, 'murkfin',        'fish_oil',           'Fish Oil',           null),
  recipe('fish', 2, 'pale_quartz',    'aqua_reagent',       'Aqua Reagent',       'fish_oil'),
  recipe('fish', 3, 'frostcoral',     'frost_reagent',      'Frost Reagent',      'aqua_reagent'),
  recipe('fish', 4, 'abyssal_pearl',  'abyssal_reagent',    'Abyssal Reagent',    'frost_reagent'),
  recipe('fish', 5, 'depthscale',     'tempest_reagent',    'Tempest Reagent',    'abyssal_reagent'),
  recipe('fish', 6, 'genesis_fiber',  'primordial_reagent', 'Primordial Reagent', 'tempest_reagent'),

  // ── Catalysts (T1 only, no chain — uses refined materials as inputs) ────
  // rawMaterialId = primary ingredient, previousRefinedId = secondary ingredient
  { id: 'refine_whetstone',         track: 'catalyst', tier: 1, rawMaterialId: 'cindite_ingot',    rawAmount: 3, previousRefinedId: 'emberwood_plank',   previousRefinedAmount: 2, outputId: 'whetstone',         outputName: 'Whetstone',         goldCost: 10 },
  { id: 'refine_destruction_lens',  track: 'catalyst', tier: 1, rawMaterialId: 'cindite_ingot',    rawAmount: 3, previousRefinedId: 'wispbloom_extract', previousRefinedAmount: 2, outputId: 'destruction_lens',  outputName: 'Destruction Lens',  goldCost: 10 },
  { id: 'refine_speed_rune',        track: 'catalyst', tier: 1, rawMaterialId: 'emberwood_plank',  rawAmount: 3, previousRefinedId: 'cured_leather',     previousRefinedAmount: 2, outputId: 'speed_rune',        outputName: 'Speed Rune',        goldCost: 10 },
  { id: 'refine_precision_lens',    track: 'catalyst', tier: 1, rawMaterialId: 'cured_leather',    rawAmount: 3, previousRefinedId: 'wispbloom_extract', previousRefinedAmount: 2, outputId: 'precision_lens',    outputName: 'Precision Lens',    goldCost: 10 },
  { id: 'refine_brutality_shard',   track: 'catalyst', tier: 1, rawMaterialId: 'cindite_ingot',    rawAmount: 3, previousRefinedId: 'thornweave_cloth',  previousRefinedAmount: 2, outputId: 'brutality_shard',   outputName: 'Brutality Shard',   goldCost: 10 },
  { id: 'refine_vitality_essence',  track: 'catalyst', tier: 1, rawMaterialId: 'wispbloom_extract', rawAmount: 3, previousRefinedId: 'fish_oil',         previousRefinedAmount: 2, outputId: 'vitality_essence',  outputName: 'Vitality Essence',  goldCost: 10 },
  { id: 'refine_fortification_kit', track: 'catalyst', tier: 1, rawMaterialId: 'cindite_ingot',    rawAmount: 3, previousRefinedId: 'cured_leather',     previousRefinedAmount: 2, outputId: 'fortification_kit', outputName: 'Fortification Kit', goldCost: 10 },
  { id: 'refine_evasion_charm',     track: 'catalyst', tier: 1, rawMaterialId: 'cured_leather',    rawAmount: 3, previousRefinedId: 'emberwood_plank',   previousRefinedAmount: 2, outputId: 'evasion_charm',     outputName: 'Evasion Charm',     goldCost: 10 },
  { id: 'refine_haste_crystal',     track: 'catalyst', tier: 1, rawMaterialId: 'thornweave_cloth', rawAmount: 3, previousRefinedId: 'wispbloom_extract', previousRefinedAmount: 2, outputId: 'haste_crystal',     outputName: 'Haste Crystal',     goldCost: 10 },
];

// ---------------------------------------------------------------------------
// Lookup indexes (built once at import time)
// ---------------------------------------------------------------------------

const byTrack = new Map<RefinementTrack, RefinementRecipeDef[]>();
const byId = new Map<string, RefinementRecipeDef>();
const byOutputId = new Map<string, RefinementRecipeDef>();

for (const r of REFINEMENT_RECIPES) {
  // by track
  let list = byTrack.get(r.track);
  if (!list) {
    list = [];
    byTrack.set(r.track, list);
  }
  list.push(r);

  // by recipe id
  byId.set(r.id, r);

  // by output material id
  byOutputId.set(r.outputId, r);
}

// Sort each track list by tier (should already be in order, but be safe)
byTrack.forEach((list) => {
  list.sort((a, b) => a.tier - b.tier);
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Returns all recipes for the given track, sorted by tier (1-6). */
export function getRefinementChain(track: RefinementTrack): RefinementRecipeDef[] {
  return byTrack.get(track) ?? [];
}

/** Returns a single recipe by its id (e.g. "refine_cindite_ingot"). */
export function getRefinementRecipe(id: string): RefinementRecipeDef | undefined {
  return byId.get(id);
}

/**
 * Given a refined material id, returns what you get from deconstructing it:
 * the previous tier's refined material (2x).
 * T1 refined materials cannot be deconstructed — returns null.
 */
export function getDeconstructOutput(
  refinedId: string,
): { outputId: string; amount: number } | null {
  const recipe = byOutputId.get(refinedId);
  if (!recipe || recipe.tier === 1 || !recipe.previousRefinedId) {
    return null;
  }
  return { outputId: recipe.previousRefinedId, amount: PREV_REFINED_AMOUNT };
}

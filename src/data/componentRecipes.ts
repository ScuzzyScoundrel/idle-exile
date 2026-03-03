// ============================================================
// Idle Exile — Component Recipes
// Bridges combat drops into the crafting pipeline.
// ============================================================

import type { ComponentRecipeDef, CraftingProfession, ComponentVariant } from '../types';

// ---------------------------------------------------------------------------
// Mob Drop Curation — 15 drops per band → 5 profession groups of 3
// ---------------------------------------------------------------------------

/** Curated mob-specific drops grouped by profession per band. */
export const MOB_DROP_CURATION: Record<number, Record<CraftingProfession, string[]>> = {
  1: {
    weaponsmith:   ['creek_snapper_jaw', 'thornfang_barb', 'cave_lurker_fang'],
    armorer:       ['thicket_crawler_chitin', 'bark_beetle_shell', 'stoneback_crab_carapace'],
    leatherworker: ['meadow_stalker_hide', 'canopy_bat_wing', 'meadow_boar_tusk'],
    tailor:        ['pollen_sprite_dust', 'dust_mite_husk', 'mud_leech_gland'],
    jeweler:       ['briar_imp_claw', 'grove_guardian_heartwood', 'river_toad_toxin'],
    alchemist:     [],  // alchemist uses masterwork path, not band specialists
  },
  2: {
    weaponsmith:   ['iron_vulture_talon', 'shard_spider_fang', 'gale_bison_horn'],
    armorer:       ['crag_golem_core', 'steppe_raider_token', 'geode_worm_segment'],
    leatherworker: ['ridge_prowler_pelt', 'dust_hawk_plume', 'rot_bear_claw'],
    tailor:        ['bog_horror_mucus', 'sporecap_membrane', 'marsh_fly_proboscis'],
    jeweler:       ['crystal_fiend_shard', 'blighted_stalker_eye', 'swamp_troll_knuckle'],
    alchemist:     [],
  },
  3: {
    weaponsmith:   ['magma_hound_fang', 'ice_crawler_mandible', 'bog_hydra_fang'],
    armorer:       ['obsidian_drake_scale', 'ironhide_rhino_horn', 'thornwall_brute_tusk'],
    leatherworker: ['silkweaver_spinneret', 'vine_strangler_tendril', 'fen_lurcher_tendril'],
    tailor:        ['frost_wraith_essence', 'wisp_lantern_glow', 'cinder_imp_ember'],
    jeweler:       ['web_matriarch_egg', 'canopy_viper_venom', 'glacial_titan_heart'],
    alchemist:     [],
  },
  4: {
    weaponsmith:   ['pressure_kraken_beak', 'plague_rat_tail', 'abyssal_terror_tentacle'],
    armorer:       ['anvil_guardian_plate', 'forge_construct_gear', 'heat_viper_scale'],
    leatherworker: ['lantern_angler_lure', 'ashborn_ravager_cinder', 'dread_treant_heartknot'],
    tailor:        ['shadow_revenant_wisp', 'grave_moth_dust', 'slag_elemental_residue'],
    jeweler:       ['cultist_venom_vial', 'toxic_golem_sludge', 'ember_colossus_core'],
    alchemist:     [],
  },
  5: {
    weaponsmith:   ['dreadmaw_devourer_tooth', 'ashenmaw_drake_fang', 'ruined_knight_crest'],
    armorer:       ['magma_wyrm_scale', 'prism_sentinel_lens', 'celestine_starling_feather'],
    leatherworker: ['tunnel_creeper_silk', 'pyreling_ember_sac', 'gullet_behemoth_bile'],
    tailor:        ['gale_wraith_essence', 'storm_elemental_spark', 'null_shade_fragment'],
    jeweler:       ['celestine_golem_prism', 'void_acolyte_sigil', 'thunder_roc_pinion'],
    alchemist:     [],
  },
  6: {
    weaponsmith:   ['ossuary_sentinel_skull', 'bone_titan_marrow', 'lightning_wraith_arc'],
    armorer:       ['entropy_titan_shard', 'terminus_guardian_keystone', 'void_mite_husk'],
    leatherworker: ['cosmic_parasite_tendril', 'marrow_worm_secretion', 'horizon_stalker_lens'],
    tailor:        ['edge_walker_echo', 'tempest_incarnate_eye', 'null_entity_residue'],
    jeweler:       ['starborn_aberration_cortex', 'nebula_hulk_fragment', 'thunder_colossus_conduit'],
    alchemist:     [],
  },
};

// ---------------------------------------------------------------------------
// Per-profession material mappings (common generic + refined + uncommon generic)
// ---------------------------------------------------------------------------

/** Common generic mob drop used in general components, per profession per band-pair. */
const PROF_COMMON: Record<CraftingProfession, Record<number, string>> = {
  weaponsmith:   { 1: 'bent_screws', 2: 'bent_screws', 3: 'tempered_bolts', 4: 'tempered_bolts', 5: 'void_rivets', 6: 'void_rivets' },
  armorer:       { 1: 'torn_leather', 2: 'torn_leather', 3: 'scaled_hide', 4: 'scaled_hide', 5: 'thick_pelt', 6: 'thick_pelt' },
  leatherworker: { 1: 'bone_splinters', 2: 'bone_splinters', 3: 'chitin_shards', 4: 'chitin_shards', 5: 'carapace_fragment', 6: 'carapace_fragment' },
  tailor:        { 1: 'frayed_cloth', 2: 'frayed_cloth', 3: 'woven_sinew', 4: 'woven_sinew', 5: 'spectral_thread', 6: 'spectral_thread' },
  jeweler:       { 1: 'bone_splinters', 2: 'bone_splinters', 3: 'chitin_shards', 4: 'chitin_shards', 5: 'carapace_fragment', 6: 'carapace_fragment' },
  alchemist:     { 1: 'frayed_cloth', 2: 'frayed_cloth', 3: 'woven_sinew', 4: 'woven_sinew', 5: 'spectral_thread', 6: 'spectral_thread' },
};

/** Refined material used in component recipes, per profession per band. */
const PROF_REFINED: Record<CraftingProfession, Record<number, string>> = {
  weaponsmith:   { 1: 'cindite_ingot', 2: 'ferrite_ingot', 3: 'forged_alloy', 4: 'voidsteel_ingot', 5: 'celesteel_ingot', 6: 'primordial_ingot' },
  armorer:       { 1: 'cindite_ingot', 2: 'ferrite_ingot', 3: 'forged_alloy', 4: 'voidsteel_ingot', 5: 'celesteel_ingot', 6: 'primordial_ingot' },
  leatherworker: { 1: 'cured_leather', 2: 'hardened_leather', 3: 'reinforced_leather', 4: 'shadowleather', 5: 'dreadleather', 6: 'primordial_leather' },
  tailor:        { 1: 'thornweave_cloth', 2: 'woven_linen', 3: 'silkweave_cloth', 4: 'shadowcloth', 5: 'aethercloth', 6: 'primordial_cloth' },
  jeweler:       { 1: 'wispbloom_extract', 2: 'potent_tincture', 3: 'lustral_essence', 4: 'shadow_elixir', 5: 'tempest_distillate', 6: 'primordial_essence' },
  alchemist:     { 1: 'wispbloom_extract', 2: 'potent_tincture', 3: 'lustral_essence', 4: 'shadow_elixir', 5: 'tempest_distillate', 6: 'primordial_essence' },
};

/** Uncommon generic mob drop used in specialist components, per profession per band-pair. */
const PROF_UNCOMMON: Record<CraftingProfession, Record<number, string>> = {
  weaponsmith:   { 1: 'mana_dust', 2: 'mana_dust', 3: 'soul_wisp', 4: 'soul_wisp', 5: 'arcane_residue', 6: 'arcane_residue' },
  armorer:       { 1: 'viscous_ichor', 2: 'viscous_ichor', 3: 'volatile_gland', 4: 'volatile_gland', 5: 'corrosive_spit', 6: 'corrosive_spit' },
  leatherworker: { 1: 'viscous_ichor', 2: 'viscous_ichor', 3: 'volatile_gland', 4: 'volatile_gland', 5: 'corrosive_spit', 6: 'corrosive_spit' },
  tailor:        { 1: 'mana_dust', 2: 'mana_dust', 3: 'soul_wisp', 4: 'soul_wisp', 5: 'arcane_residue', 6: 'arcane_residue' },
  jeweler:       { 1: 'dim_crystal', 2: 'dim_crystal', 3: 'fractured_prism', 4: 'fractured_prism', 5: 'resonant_shard', 6: 'resonant_shard' },
  alchemist:     { 1: 'dim_crystal', 2: 'dim_crystal', 3: 'fractured_prism', 4: 'fractured_prism', 5: 'resonant_shard', 6: 'resonant_shard' },
};

// ---------------------------------------------------------------------------
// Component Naming
// ---------------------------------------------------------------------------

const GENERAL_NAMES: Record<CraftingProfession, string[]> = {
  weaponsmith:   ['Crude Hilt', 'Tempered Hilt', 'Alloy Pommel', 'Voidforged Grip', 'Celesteel Guard', 'Primordial Crossguard'],
  armorer:       ['Crude Rivet Plate', 'Tempered Brace', 'Alloy Plate', 'Void Plate', 'Celesteel Plate', 'Primordial Plate'],
  leatherworker: ['Crude Strap', 'Tempered Strap', 'Reinforced Strap', 'Shadow Strap', 'Dread Strap', 'Primordial Strap'],
  tailor:        ['Crude Embroidery', 'Woven Thread', 'Silken Thread', 'Shadow Thread', 'Aether Thread', 'Primordial Thread'],
  jeweler:       ['Crude Setting', 'Polished Setting', 'Alloy Setting', 'Void Setting', 'Celesteel Setting', 'Primordial Setting'],
  alchemist:     ['', '', '', '', '', ''],  // no general components for alchemist
};

const SPECIALIST_NAMES: Record<CraftingProfession, string[]> = {
  weaponsmith:   ['Fang Guard', 'Talon Grip', 'Drake-Fang Pommel', 'Kraken-Bone Handle', 'Devourer Blade Socket', 'Deathbone Crossguard'],
  armorer:       ['Chitin-Lined Plate', 'Golem-Core Brace', 'Drake Scale Lining', 'Guardian Plate', 'Wyrm Scale Buckle', 'Titan Shard Clasp'],
  leatherworker: ['Hide-Wrapped Cord', 'Plume Binding', 'Silkweave Lining', 'Angler Gut Cord', 'Creeper Silk Wrap', 'Parasite Sinew'],
  tailor:        ['Sprite Dust Weave', 'Spore-Infused Patch', 'Wraith Essence Stitch', 'Revenant Wisp Lace', 'Storm Spark Weave', 'Echo Thread Lace'],
  jeweler:       ['Imp Claw Clasp', 'Crystal Fiend Socket', 'Matriarch Egg Inlay', 'Venom Phial Mount', 'Golem Prism Facet', 'Aberration Core Socket'],
  alchemist:     ['', '', '', '', '', ''],
};

// ---------------------------------------------------------------------------
// Recipe Generation Constants
// ---------------------------------------------------------------------------

const GENERAL_COSTS: Record<number, { commonAmt: number; refinedAmt: number; gold: number }> = {
  1: { commonAmt: 3, refinedAmt: 1, gold: 5 },
  2: { commonAmt: 4, refinedAmt: 1, gold: 10 },
  3: { commonAmt: 5, refinedAmt: 2, gold: 20 },
  4: { commonAmt: 5, refinedAmt: 2, gold: 30 },
  5: { commonAmt: 6, refinedAmt: 3, gold: 50 },
  6: { commonAmt: 7, refinedAmt: 3, gold: 80 },
};

const SPECIALIST_COSTS: Record<number, { mobDropAmt: number; refinedAmt: number; uncommonAmt: number; gold: number }> = {
  1: { mobDropAmt: 2, refinedAmt: 1, uncommonAmt: 1, gold: 8 },
  2: { mobDropAmt: 2, refinedAmt: 1, uncommonAmt: 1, gold: 12 },
  3: { mobDropAmt: 3, refinedAmt: 2, uncommonAmt: 1, gold: 25 },
  4: { mobDropAmt: 3, refinedAmt: 2, uncommonAmt: 2, gold: 35 },
  5: { mobDropAmt: 4, refinedAmt: 3, uncommonAmt: 2, gold: 60 },
  6: { mobDropAmt: 4, refinedAmt: 3, uncommonAmt: 3, gold: 100 },
};

const BAND_REQ_LEVEL: Record<number, number> = {
  1: 1, 2: 15, 3: 30, 4: 50, 5: 75, 6: 90,
};

// Profession shortcodes for IDs
const PROF_CODE: Record<CraftingProfession, string> = {
  weaponsmith: 'ws', armorer: 'ar', leatherworker: 'lw',
  tailor: 'ta', jeweler: 'je', alchemist: 'al',
};

// ---------------------------------------------------------------------------
// Generate General + Specialist Recipes (5 professions × 6 bands × 2 = 60)
// ---------------------------------------------------------------------------

const CRAFTING_PROFESSIONS: CraftingProfession[] = ['weaponsmith', 'armorer', 'leatherworker', 'tailor', 'jeweler'];

function generateComponentRecipes(): ComponentRecipeDef[] {
  const recipes: ComponentRecipeDef[] = [];

  for (const prof of CRAFTING_PROFESSIONS) {
    const code = PROF_CODE[prof];

    for (let band = 1; band <= 6; band++) {
      const reqLevel = BAND_REQ_LEVEL[band];

      // --- General ---
      const gc = GENERAL_COSTS[band];
      recipes.push({
        id: `comp_${code}_b${band}_general`,
        profession: prof,
        name: GENERAL_NAMES[prof][band - 1],
        band,
        variant: 'general',
        requiredLevel: reqLevel,
        materials: [
          { materialId: PROF_COMMON[prof][band], amount: gc.commonAmt },
          { materialId: PROF_REFINED[prof][band], amount: gc.refinedAmt },
        ],
        goldCost: gc.gold,
        outputMaterialId: `comp_${code}_b${band}_general`,
      });

      // --- Specialist ---
      const sc = SPECIALIST_COSTS[band];
      const mobDrops = MOB_DROP_CURATION[band]?.[prof] ?? [];
      if (mobDrops.length > 0) {
        recipes.push({
          id: `comp_${code}_b${band}_specialist`,
          profession: prof,
          name: SPECIALIST_NAMES[prof][band - 1],
          band,
          variant: 'specialist',
          requiredLevel: reqLevel,
          materials: [
            { materialId: PROF_REFINED[prof][band], amount: sc.refinedAmt },
            { materialId: PROF_UNCOMMON[prof][band], amount: sc.uncommonAmt },
          ],
          mobDropChoice: {
            amount: sc.mobDropAmt,
            anyOf: mobDrops,
          },
          goldCost: sc.gold,
          outputMaterialId: `comp_${code}_b${band}_specialist`,
        });
      }
    }
  }

  return recipes;
}

// ---------------------------------------------------------------------------
// Masterwork Recipes (5 recipes, Alchemist)
// ---------------------------------------------------------------------------

const MASTERWORK_RECIPES: ComponentRecipeDef[] = [
  {
    id: 'comp_mw_weapon',
    profession: 'alchemist',
    name: 'Masterwork Weapon Component',
    band: 5,
    variant: 'masterwork',
    requiredLevel: 75,
    materials: [
      { materialId: 'pristine_fang', amount: 1 },
      { materialId: 'celesteel_ingot', amount: 3 },
      { materialId: 'dreadwood_plank', amount: 3 },
    ],
    goldCost: 200,
    outputMaterialId: 'comp_mw_weapon',
  },
  {
    id: 'comp_mw_armor',
    profession: 'alchemist',
    name: 'Masterwork Armor Component',
    band: 5,
    variant: 'masterwork',
    requiredLevel: 75,
    materials: [
      { materialId: 'enchanted_bone', amount: 1 },
      { materialId: 'celesteel_ingot', amount: 3 },
      { materialId: 'dreadleather', amount: 3 },
    ],
    goldCost: 200,
    outputMaterialId: 'comp_mw_armor',
  },
  {
    id: 'comp_mw_leather',
    profession: 'alchemist',
    name: 'Masterwork Leather Component',
    band: 5,
    variant: 'masterwork',
    requiredLevel: 75,
    materials: [
      { materialId: 'living_ember', amount: 1 },
      { materialId: 'dreadleather', amount: 3 },
      { materialId: 'dreadwood_plank', amount: 3 },
    ],
    goldCost: 200,
    outputMaterialId: 'comp_mw_leather',
  },
  {
    id: 'comp_mw_fabric',
    profession: 'alchemist',
    name: 'Masterwork Fabric Component',
    band: 5,
    variant: 'masterwork',
    requiredLevel: 75,
    materials: [
      { materialId: 'frozen_heart', amount: 1 },
      { materialId: 'aethercloth', amount: 3 },
      { materialId: 'tempest_distillate', amount: 3 },
    ],
    goldCost: 200,
    outputMaterialId: 'comp_mw_fabric',
  },
  {
    id: 'comp_mw_jewel',
    profession: 'alchemist',
    name: 'Masterwork Jewel Component',
    band: 5,
    variant: 'masterwork',
    requiredLevel: 75,
    materials: [
      { materialId: 'void_essence', amount: 1 },
      { materialId: 'tempest_distillate', amount: 3 },
      { materialId: 'celesteel_ingot', amount: 3 },
    ],
    goldCost: 200,
    outputMaterialId: 'comp_mw_jewel',
  },
];

// ---------------------------------------------------------------------------
// Combined Export
// ---------------------------------------------------------------------------

export const COMPONENT_RECIPES: ComponentRecipeDef[] = [
  ...generateComponentRecipes(),
  ...MASTERWORK_RECIPES,
];

/** Look up a component recipe by id. */
export function getComponentRecipe(id: string): ComponentRecipeDef | undefined {
  return COMPONENT_RECIPES.find(r => r.id === id);
}

/** Get all component recipes for a given profession. */
export function getComponentRecipesForProfession(profession: CraftingProfession): ComponentRecipeDef[] {
  return COMPONENT_RECIPES.filter(r => r.profession === profession);
}

/** Get component recipes for a given band (all professions). */
export function getComponentsForBand(band: number): ComponentRecipeDef[] {
  return COMPONENT_RECIPES.filter(r => r.band === band);
}

/** Get the curated mob drops for a band + profession (the anyOf set). */
export function getMobDropsForBandAndProfession(band: number, profession: CraftingProfession): string[] {
  return MOB_DROP_CURATION[band]?.[profession] ?? [];
}

// ---------------------------------------------------------------------------
// Component Display Metadata
// ---------------------------------------------------------------------------

/** Human-readable display info for component material IDs. */
export function getComponentMeta(materialId: string): { name: string; variant: ComponentVariant; profession: CraftingProfession; band: number } | null {
  const recipe = COMPONENT_RECIPES.find(r => r.outputMaterialId === materialId);
  if (!recipe) return null;
  return { name: recipe.name, variant: recipe.variant, profession: recipe.profession, band: recipe.band };
}

/** Check if a material ID is a component. */
export function isComponentMaterial(materialId: string): boolean {
  return materialId.startsWith('comp_');
}

import type { CraftingRecipeDef } from '../types';
import type { CraftingProfession } from '../types';

// ─── Tier Constants ───────────────────────────────────────────────
// Gold:  T1=10, T2=25, T3=50, T4=100, T5=200, T6=500
// iLvl:  T1=5,  T2=15, T3=25, T4=35,  T5=45,  T6=55
// Level: T1=1,  T2=15, T3=30, T4=50,  T5=75,  T6=90
// Mats:  T1=3,  T2=4,  T3=5,  T4=6,   T5=8,   T6=10

// ─── Weaponsmith Recipes ──────────────────────────────────────────
// Uses: ingots (ore track) + planks (wood track)

const weaponsmithRecipes: CraftingRecipeDef[] = [
  // --- Tier 1 ---
  {
    id: 'ws_t1_sword',
    profession: 'weaponsmith',
    name: 'Cindite Sword',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'cindite_ingot', amount: 3 },
      { materialId: 'emberwood_plank', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'iron_sword',
    outputILvl: 5,
    catalystSlot: true,
  },
  {
    id: 'ws_t1_axe',
    profession: 'weaponsmith',
    name: 'Cindite Axe',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'cindite_ingot', amount: 3 },
      { materialId: 'emberwood_plank', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'rusty_hatchet',
    outputILvl: 5,
    catalystSlot: true,
  },
  // --- Tier 2 ---
  {
    id: 'ws_t2_blade',
    profession: 'weaponsmith',
    name: 'Ferrite Blade',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'ferrite_ingot', amount: 4 },
      { materialId: 'ironwood_plank', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'steel_blade',
    outputILvl: 15,
    catalystSlot: true,
  },
  {
    id: 'ws_t2_mace',
    profession: 'weaponsmith',
    name: 'Ferrite Mace',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'ferrite_ingot', amount: 4 },
      { materialId: 'ironwood_plank', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'iron_mace',
    outputILvl: 15,
    catalystSlot: true,
  },
  // --- Tier 3 ---
  {
    id: 'ws_t3_greatsword',
    profession: 'weaponsmith',
    name: 'Alloy Greatsword',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'forged_alloy', amount: 5 },
      { materialId: 'steelwood_plank', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'obsidian_edge',
    outputILvl: 25,
    catalystSlot: true,
  },
  {
    id: 'ws_t3_halberd',
    profession: 'weaponsmith',
    name: 'Alloy Halberd',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'forged_alloy', amount: 5 },
      { materialId: 'steelwood_plank', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'obsidian_hammer',
    outputILvl: 25,
    catalystSlot: true,
  },
  // --- Tier 4 ---
  {
    id: 'ws_t4_blade',
    profession: 'weaponsmith',
    name: 'Voidsteel Blade',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 6 },
      { materialId: 'shadowwood_plank', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_blade',
    outputILvl: 35,
    catalystSlot: true,
  },
  {
    id: 'ws_t4_waraxe',
    profession: 'weaponsmith',
    name: 'Voidsteel Waraxe',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 6 },
      { materialId: 'shadowwood_plank', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_waraxe',
    outputILvl: 35,
    catalystSlot: true,
  },
  // --- Tier 5 ---
  {
    id: 'ws_t5_sword',
    profession: 'weaponsmith',
    name: 'Celesteel Sword',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 8 },
      { materialId: 'dreadwood_plank', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_greatsword',
    outputILvl: 45,
    catalystSlot: true,
  },
  {
    id: 'ws_t5_staff',
    profession: 'weaponsmith',
    name: 'Celesteel Staff',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 8 },
      { materialId: 'dreadwood_plank', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_staff',
    outputILvl: 45,
    catalystSlot: true,
  },
  // --- Tier 6 ---
  {
    id: 'ws_t6_blade',
    profession: 'weaponsmith',
    name: 'Primordial Blade',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 10 },
      { materialId: 'primordial_plank', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_cleaver',
    outputILvl: 55,
    catalystSlot: true,
  },
  {
    id: 'ws_t6_greataxe',
    profession: 'weaponsmith',
    name: 'Primordial Greataxe',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 10 },
      { materialId: 'primordial_plank', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_reaver',
    outputILvl: 55,
    catalystSlot: true,
  },
];

// ─── Armorer Recipes ──────────────────────────────────────────────
// Uses: ingots (ore track) + leather (leather track)

const armorerRecipes: CraftingRecipeDef[] = [
  // --- Tier 1 ---
  {
    id: 'ar_t1_helm',
    profession: 'armorer',
    name: 'Cindite Helm',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'cindite_ingot', amount: 3 },
      { materialId: 'cured_leather', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'iron_helm',
    outputILvl: 5,
    catalystSlot: true,
  },
  {
    id: 'ar_t1_vest',
    profession: 'armorer',
    name: 'Cindite Vest',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'cindite_ingot', amount: 3 },
      { materialId: 'cured_leather', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'chain_vest',
    outputILvl: 5,
    catalystSlot: true,
  },
  // --- Tier 2 ---
  {
    id: 'ar_t2_cuirass',
    profession: 'armorer',
    name: 'Ferrite Cuirass',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'ferrite_ingot', amount: 4 },
      { materialId: 'hardened_leather', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'steel_cuirass',
    outputILvl: 15,
    catalystSlot: true,
  },
  {
    id: 'ar_t2_hauberk',
    profession: 'armorer',
    name: 'Ferrite Hauberk',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'ferrite_ingot', amount: 4 },
      { materialId: 'hardened_leather', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'chain_hauberk',
    outputILvl: 15,
    catalystSlot: true,
  },
  // --- Tier 3 ---
  {
    id: 'ar_t3_breastplate',
    profession: 'armorer',
    name: 'Alloy Breastplate',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'forged_alloy', amount: 5 },
      { materialId: 'reinforced_leather', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'plate_cuirass',
    outputILvl: 25,
    catalystSlot: true,
  },
  {
    id: 'ar_t3_shield',
    profession: 'armorer',
    name: 'Alloy Shield',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'forged_alloy', amount: 5 },
      { materialId: 'reinforced_leather', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'obsidian_bulwark',
    outputILvl: 25,
    catalystSlot: true,
  },
  // --- Tier 4 ---
  {
    id: 'ar_t4_plate',
    profession: 'armorer',
    name: 'Voidsteel Plate',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 6 },
      { materialId: 'shadowleather', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_cuirass',
    outputILvl: 35,
    catalystSlot: true,
  },
  {
    id: 'ar_t4_gauntlets',
    profession: 'armorer',
    name: 'Voidsteel Gauntlets',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 6 },
      { materialId: 'shadowleather', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_gauntlets',
    outputILvl: 35,
    catalystSlot: true,
  },
  // --- Tier 5 ---
  {
    id: 'ar_t5_armor',
    profession: 'armorer',
    name: 'Celesteel Armor',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 8 },
      { materialId: 'dreadleather', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_breastplate',
    outputILvl: 45,
    catalystSlot: true,
  },
  {
    id: 'ar_t5_legguards',
    profession: 'armorer',
    name: 'Celesteel Legguards',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 8 },
      { materialId: 'dreadleather', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_legplates',
    outputILvl: 45,
    catalystSlot: true,
  },
  // --- Tier 6 ---
  {
    id: 'ar_t6_plate',
    profession: 'armorer',
    name: 'Primordial Plate',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 10 },
      { materialId: 'primordial_leather', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_cuirass',
    outputILvl: 55,
    catalystSlot: true,
  },
  {
    id: 'ar_t6_bulwark',
    profession: 'armorer',
    name: 'Primordial Bulwark',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 10 },
      { materialId: 'primordial_leather', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_aegis',
    outputILvl: 55,
    catalystSlot: true,
  },
];

// ─── Tailor Recipes ───────────────────────────────────────────────
// Uses: cloth (cloth track) + extracts (herb track)

const tailorRecipes: CraftingRecipeDef[] = [
  // --- Tier 1 ---
  {
    id: 'ta_t1_robe',
    profession: 'tailor',
    name: 'Thornweave Robe',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'thornweave_cloth', amount: 3 },
      { materialId: 'wispbloom_extract', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'linen_robe',
    outputILvl: 5,
    catalystSlot: true,
  },
  {
    id: 'ta_t1_gloves',
    profession: 'tailor',
    name: 'Thornweave Gloves',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'thornweave_cloth', amount: 3 },
      { materialId: 'wispbloom_extract', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'linen_gloves',
    outputILvl: 5,
    catalystSlot: true,
  },
  // --- Tier 2 ---
  {
    id: 'ta_t2_vestment',
    profession: 'tailor',
    name: 'Linen Vestment',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'woven_linen', amount: 4 },
      { materialId: 'potent_tincture', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'silk_robe',
    outputILvl: 15,
    catalystSlot: true,
  },
  {
    id: 'ta_t2_hood',
    profession: 'tailor',
    name: 'Linen Hood',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'woven_linen', amount: 4 },
      { materialId: 'potent_tincture', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'silk_circlet',
    outputILvl: 15,
    catalystSlot: true,
  },
  // --- Tier 3 ---
  {
    id: 'ta_t3_robe',
    profession: 'tailor',
    name: 'Silkweave Robe',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'silkweave_cloth', amount: 5 },
      { materialId: 'lustral_essence', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'arcane_vestment',
    outputILvl: 25,
    catalystSlot: true,
  },
  {
    id: 'ta_t3_crown',
    profession: 'tailor',
    name: 'Silkweave Crown',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'silkweave_cloth', amount: 5 },
      { materialId: 'lustral_essence', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'arcane_crown',
    outputILvl: 25,
    catalystSlot: true,
  },
  // --- Tier 4 ---
  {
    id: 'ta_t4_vestment',
    profession: 'tailor',
    name: 'Shadow Vestment',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'shadowcloth', amount: 6 },
      { materialId: 'shadow_elixir', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_robe',
    outputILvl: 35,
    catalystSlot: true,
  },
  {
    id: 'ta_t4_mantle',
    profession: 'tailor',
    name: 'Shadow Mantle',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'shadowcloth', amount: 6 },
      { materialId: 'shadow_elixir', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_epaulets',
    outputILvl: 35,
    catalystSlot: true,
  },
  // --- Tier 5 ---
  {
    id: 'ta_t5_robe',
    profession: 'tailor',
    name: 'Aether Robe',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'aethercloth', amount: 8 },
      { materialId: 'tempest_distillate', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_vestment',
    outputILvl: 45,
    catalystSlot: true,
  },
  {
    id: 'ta_t5_gloves',
    profession: 'tailor',
    name: 'Aether Gloves',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'aethercloth', amount: 8 },
      { materialId: 'tempest_distillate', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_handwraps',
    outputILvl: 45,
    catalystSlot: true,
  },
  // --- Tier 6 ---
  {
    id: 'ta_t6_vestment',
    profession: 'tailor',
    name: 'Primordial Vestment',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_cloth', amount: 10 },
      { materialId: 'primordial_essence', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_robe',
    outputILvl: 55,
    catalystSlot: true,
  },
  {
    id: 'ta_t6_crown',
    profession: 'tailor',
    name: 'Primordial Crown',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_cloth', amount: 10 },
      { materialId: 'primordial_essence', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_circlet',
    outputILvl: 55,
    catalystSlot: true,
  },
];

// ─── Alchemist Recipes ────────────────────────────────────────────
// Uses: extracts (herb track) + reagents (fish track)

const alchemistRecipes: CraftingRecipeDef[] = [
  // --- Tier 1 ---
  {
    id: 'al_t1_charm',
    profession: 'alchemist',
    name: 'Wispbloom Charm',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'wispbloom_extract', amount: 3 },
      { materialId: 'fish_oil', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'bone_charm',
    outputILvl: 5,
    catalystSlot: true,
  },
  {
    id: 'al_t1_tincture',
    profession: 'alchemist',
    name: 'Minor Tincture',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'wispbloom_extract', amount: 3 },
      { materialId: 'fish_oil', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'cracked_gem',
    outputILvl: 5,
    catalystSlot: true,
  },
  // --- Tier 2 ---
  {
    id: 'al_t2_amulet',
    profession: 'alchemist',
    name: 'Marsh Amulet',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'potent_tincture', amount: 4 },
      { materialId: 'aqua_reagent', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'jade_amulet',
    outputILvl: 15,
    catalystSlot: true,
  },
  {
    id: 'al_t2_crystal',
    profession: 'alchemist',
    name: 'Potent Crystal',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'potent_tincture', amount: 4 },
      { materialId: 'aqua_reagent', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'polished_stone',
    outputILvl: 15,
    catalystSlot: true,
  },
  // --- Tier 3 ---
  {
    id: 'al_t3_pendant',
    profession: 'alchemist',
    name: 'Lustral Pendant',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'lustral_essence', amount: 5 },
      { materialId: 'frost_reagent', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'onyx_pendant',
    outputILvl: 25,
    catalystSlot: true,
  },
  {
    id: 'al_t3_shard',
    profession: 'alchemist',
    name: 'Frost Shard',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'lustral_essence', amount: 5 },
      { materialId: 'frost_reagent', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'prismatic_shard',
    outputILvl: 25,
    catalystSlot: true,
  },
  // --- Tier 4 ---
  {
    id: 'al_t4_amulet',
    profession: 'alchemist',
    name: 'Shadow Amulet',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'shadow_elixir', amount: 6 },
      { materialId: 'abyssal_reagent', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'ruby_amulet',
    outputILvl: 35,
    catalystSlot: true,
  },
  {
    id: 'al_t4_crystal',
    profession: 'alchemist',
    name: 'Abyssal Crystal',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'shadow_elixir', amount: 6 },
      { materialId: 'abyssal_reagent', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'infused_crystal',
    outputILvl: 35,
    catalystSlot: true,
  },
  // --- Tier 5 ---
  {
    id: 'al_t5_choker',
    profession: 'alchemist',
    name: 'Tempest Choker',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'tempest_distillate', amount: 8 },
      { materialId: 'tempest_reagent', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'void_pendant',
    outputILvl: 45,
    catalystSlot: true,
  },
  {
    id: 'al_t5_prism',
    profession: 'alchemist',
    name: 'Storm Prism',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'tempest_distillate', amount: 8 },
      { materialId: 'tempest_reagent', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'void_shard',
    outputILvl: 45,
    catalystSlot: true,
  },
  // --- Tier 6 ---
  {
    id: 'al_t6_amulet',
    profession: 'alchemist',
    name: 'Primordial Amulet',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_essence', amount: 10 },
      { materialId: 'primordial_reagent', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'astral_choker',
    outputILvl: 55,
    catalystSlot: true,
  },
  {
    id: 'al_t6_prism',
    profession: 'alchemist',
    name: 'Primordial Prism',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_essence', amount: 10 },
      { materialId: 'primordial_reagent', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'astral_prism',
    outputILvl: 55,
    catalystSlot: true,
  },
];

// ─── Jeweler Recipes ──────────────────────────────────────────────
// Uses: ingots (ore track) + essences (herb track); also gems from rare mats

const jewelerRecipes: CraftingRecipeDef[] = [
  // --- Tier 1 ---
  {
    id: 'je_t1_ring',
    profession: 'jeweler',
    name: 'Copper Setting',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'cindite_ingot', amount: 3 },
      { materialId: 'wispbloom_extract', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'copper_band',
    outputILvl: 5,
    catalystSlot: true,
  },
  {
    id: 'je_t1_belt',
    profession: 'jeweler',
    name: 'Cindite Buckle',
    tier: 1,
    requiredLevel: 1,
    materials: [
      { materialId: 'cindite_ingot', amount: 3 },
      { materialId: 'wispbloom_extract', amount: 3 },
    ],
    goldCost: 10,
    outputBaseId: 'rope_belt',
    outputILvl: 5,
    catalystSlot: true,
  },
  // --- Tier 2 ---
  {
    id: 'je_t2_ring',
    profession: 'jeweler',
    name: 'Silver Setting',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'ferrite_ingot', amount: 4 },
      { materialId: 'potent_tincture', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'silver_ring',
    outputILvl: 15,
    catalystSlot: true,
  },
  {
    id: 'je_t2_belt',
    profession: 'jeweler',
    name: 'Ferrite Girdle',
    tier: 2,
    requiredLevel: 15,
    materials: [
      { materialId: 'ferrite_ingot', amount: 4 },
      { materialId: 'potent_tincture', amount: 4 },
    ],
    goldCost: 25,
    outputBaseId: 'studded_belt',
    outputILvl: 15,
    catalystSlot: true,
  },
  // --- Tier 3 ---
  {
    id: 'je_t3_ring',
    profession: 'jeweler',
    name: 'Gold Signet',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'forged_alloy', amount: 5 },
      { materialId: 'lustral_essence', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'gold_signet',
    outputILvl: 25,
    catalystSlot: true,
  },
  {
    id: 'je_t3_belt',
    profession: 'jeweler',
    name: 'Alloy Girdle',
    tier: 3,
    requiredLevel: 30,
    materials: [
      { materialId: 'forged_alloy', amount: 5 },
      { materialId: 'lustral_essence', amount: 5 },
    ],
    goldCost: 50,
    outputBaseId: 'runed_girdle',
    outputILvl: 25,
    catalystSlot: true,
  },
  // --- Tier 4 ---
  {
    id: 'je_t4_ring',
    profession: 'jeweler',
    name: 'Ruby Setting',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 6 },
      { materialId: 'shadow_elixir', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'ruby_ring',
    outputILvl: 35,
    catalystSlot: true,
  },
  {
    id: 'je_t4_belt',
    profession: 'jeweler',
    name: 'Void Girdle',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 6 },
      { materialId: 'shadow_elixir', amount: 6 },
    ],
    goldCost: 100,
    outputBaseId: 'mithril_belt',
    outputILvl: 35,
    catalystSlot: true,
  },
  // --- Tier 5 ---
  {
    id: 'je_t5_ring',
    profession: 'jeweler',
    name: 'Astral Band',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 8 },
      { materialId: 'tempest_distillate', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'astral_ring',
    outputILvl: 45,
    catalystSlot: true,
  },
  {
    id: 'je_t5_belt',
    profession: 'jeweler',
    name: 'Celesteel Belt',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 8 },
      { materialId: 'tempest_distillate', amount: 8 },
    ],
    goldCost: 200,
    outputBaseId: 'runic_girdle',
    outputILvl: 45,
    catalystSlot: true,
  },
  // --- Tier 6 ---
  {
    id: 'je_t6_ring',
    profession: 'jeweler',
    name: 'Starforged Ring',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 10 },
      { materialId: 'primordial_essence', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'starforged_signet',
    outputILvl: 55,
    catalystSlot: true,
  },
  {
    id: 'je_t6_belt',
    profession: 'jeweler',
    name: 'Primordial Belt',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 10 },
      { materialId: 'primordial_essence', amount: 10 },
    ],
    goldCost: 500,
    outputBaseId: 'void_belt',
    outputILvl: 55,
    catalystSlot: true,
  },
];

// ─── Unique / Catalyst Recipes ────────────────────────────────────
// These require specific rare materials (requiredCatalyst) and do NOT have catalystSlot

const uniqueRecipes: CraftingRecipeDef[] = [
  {
    id: 'je_t4_prismatic_ring',
    profession: 'jeweler',
    name: 'Prismatic Ring',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'forged_alloy', amount: 3 },
      { materialId: 'lustral_essence', amount: 3 },
    ],
    goldCost: 300,
    outputBaseId: 'astral_ring',
    outputILvl: 45,
    requiredCatalyst: { rareMaterialId: 'flawless_gem', amount: 1 },
  },
  {
    id: 'ws_t5_fangblade',
    profession: 'weaponsmith',
    name: 'Fangblade',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'celesteel_ingot', amount: 5 },
      { materialId: 'dreadwood_plank', amount: 5 },
    ],
    goldCost: 500,
    outputBaseId: 'runic_greatsword',
    outputILvl: 50,
    requiredCatalyst: { rareMaterialId: 'primordial_fang', amount: 1 },
  },
  {
    id: 'al_t5_elixir_mastery',
    profession: 'alchemist',
    name: 'Elixir of Mastery',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'tempest_distillate', amount: 5 },
      { materialId: 'tempest_reagent', amount: 5 },
    ],
    goldCost: 500,
    outputBaseId: 'astral_choker',
    outputILvl: 50,
    requiredCatalyst: { rareMaterialId: 'pure_essence', amount: 1 },
  },
  {
    id: 'ar_t4_heartwood_shield',
    profession: 'armorer',
    name: 'Heartwood Shield',
    tier: 4,
    requiredLevel: 50,
    materials: [
      { materialId: 'voidsteel_ingot', amount: 4 },
      { materialId: 'shadowleather', amount: 4 },
    ],
    goldCost: 300,
    outputBaseId: 'runic_bulwark',
    outputILvl: 40,
    requiredCatalyst: { rareMaterialId: 'elder_heartwood', amount: 1 },
  },
  {
    id: 'ta_t5_aetherspun_robe',
    profession: 'tailor',
    name: 'Aetherspun Robe',
    tier: 5,
    requiredLevel: 75,
    materials: [
      { materialId: 'aethercloth', amount: 5 },
      { materialId: 'tempest_distillate', amount: 5 },
    ],
    goldCost: 500,
    outputBaseId: 'void_robe',
    outputILvl: 50,
    requiredCatalyst: { rareMaterialId: 'radiant_essence', amount: 1 },
  },
  {
    id: 'je_t6_abyssal_signet',
    profession: 'jeweler',
    name: 'Abyssal Signet',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 5 },
      { materialId: 'primordial_essence', amount: 5 },
    ],
    goldCost: 1000,
    outputBaseId: 'starforged_signet',
    outputILvl: 55,
    requiredCatalyst: { rareMaterialId: 'abyssal_pearl', amount: 1 },
  },
  {
    id: 'ws_t6_primordial_warhammer',
    profession: 'weaponsmith',
    name: 'Primordial Warhammer',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 8 },
      { materialId: 'primordial_plank', amount: 8 },
    ],
    goldCost: 1000,
    outputBaseId: 'starforged_mace',
    outputILvl: 55,
    requiredCatalyst: { rareMaterialId: 'primordial_heartwood', amount: 1 },
  },
  {
    id: 'ar_t6_primordial_fortress',
    profession: 'armorer',
    name: 'Primordial Fortress',
    tier: 6,
    requiredLevel: 90,
    materials: [
      { materialId: 'primordial_ingot', amount: 8 },
      { materialId: 'primordial_leather', amount: 8 },
    ],
    goldCost: 1000,
    outputBaseId: 'starforged_breastplate',
    outputILvl: 55,
    requiredCatalyst: { rareMaterialId: 'perfect_gem', amount: 1 },
  },
];

// ─── Combined Export ──────────────────────────────────────────────

export const CRAFTING_RECIPES: CraftingRecipeDef[] = [
  ...weaponsmithRecipes,
  ...armorerRecipes,
  ...tailorRecipes,
  ...alchemistRecipes,
  ...jewelerRecipes,
  ...uniqueRecipes,
];

/** Look up a single crafting recipe by id */
export function getCraftingRecipe(id: string): CraftingRecipeDef | undefined {
  return CRAFTING_RECIPES.find((r) => r.id === id);
}

/** Get all recipes for a given crafting profession */
export function getRecipesForProfession(
  profession: CraftingProfession,
): CraftingRecipeDef[] {
  return CRAFTING_RECIPES.filter((r) => r.profession === profession);
}

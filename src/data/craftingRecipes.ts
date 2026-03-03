import type { CraftingRecipeDef, CraftingProfession } from '../types';
import { ITEM_BASE_DEFS } from './items';

// ─── Component Cost Helper ──────────────────────────────────────────────
// Maps profession to shortcode for component material IDs.
const COMP_CODE: Record<CraftingProfession, string> = {
  weaponsmith: 'ws', armorer: 'ar', leatherworker: 'lw',
  tailor: 'ta', jeweler: 'je', alchemist: 'al',
};

/**
 * Compute the componentCost for a gear recipe based on tier and profession.
 * T1: 1 general | T2-T3: 1 general + 1 specialist | T4-T5: 2 specialist | T6: 2 specialist + 1 general
 * Tier maps directly to band (T1→B1, ..., T6→B6).
 */
function getComponentCost(tier: number, profession: CraftingProfession): { materialId: string; amount: number }[] {
  const code = COMP_CODE[profession];
  const gen = `comp_${code}_b${tier}_general`;
  const spec = `comp_${code}_b${tier}_specialist`;

  switch (tier) {
    case 1: return [{ materialId: gen, amount: 1 }];
    case 2:
    case 3: return [{ materialId: gen, amount: 1 }, { materialId: spec, amount: 1 }];
    case 4:
    case 5: return [{ materialId: spec, amount: 2 }];
    case 6: return [{ materialId: spec, amount: 2 }, { materialId: gen, amount: 1 }];
    default: return [];
  }
}

// ─── Tier Constants ───────────────────────────────────────────────
// Gold:  T1=10, T2=25, T3=35, T4=70, T5=200, T6=500
// iLvl:  T1=5,  T2=15, T3=25, T4=35,  T5=45,  T6=55
// Level: T1=1,  T2=15, T3=30, T4=50,  T5=75,  T6=90
// Mats:  T1=3,  T2=4,  T3=5,  T4=6,   T5=8,   T6=10

const ARMOR_TIER_CONFIG = [
  { tier: 1, reqLevel: 1, iLvl: 5, gold: 10, matAmt: 3 },
  { tier: 2, reqLevel: 15, iLvl: 15, gold: 25, matAmt: 4 },
  { tier: 3, reqLevel: 30, iLvl: 25, gold: 35, matAmt: 5 },
  { tier: 4, reqLevel: 50, iLvl: 35, gold: 70, matAmt: 6 },
  { tier: 5, reqLevel: 75, iLvl: 45, gold: 200, matAmt: 8 },
  { tier: 6, reqLevel: 90, iLvl: 55, gold: 500, matAmt: 10 },
] as const;

/** Table-driven generation of armor recipes: 6 slots × 6 tiers = 36 per profession. */
function generateArmorRecipes(
  profession: CraftingProfession,
  prefix: string,
  matTracks: [string, string][],
  baseIdMatrix: Record<string, string[]>,
): CraftingRecipeDef[] {
  const result: CraftingRecipeDef[] = [];
  for (const [slot, baseIds] of Object.entries(baseIdMatrix)) {
    for (let ti = 0; ti < 6; ti++) {
      const tc = ARMOR_TIER_CONFIG[ti];
      const baseId = baseIds[ti];
      const baseDef = ITEM_BASE_DEFS.find(b => b.id === baseId);
      result.push({
        id: `${prefix}_t${tc.tier}_${slot}`,
        profession,
        name: baseDef?.name ?? baseId.replace(/_/g, ' '),
        tier: tc.tier,
        requiredLevel: tc.reqLevel,
        materials: [
          { materialId: matTracks[ti][0], amount: tc.matAmt },
          { materialId: matTracks[ti][1], amount: tc.matAmt },
        ],
        goldCost: tc.gold,
        outputBaseId: baseId,
        outputILvl: tc.iLvl,
        catalystSlot: true,
        componentCost: getComponentCost(tc.tier, profession),
      });
    }
  }
  return result;
}

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
    goldCost: 35,
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
    goldCost: 35,
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
    goldCost: 70,
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
    goldCost: 70,
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

  // --- Dagger T1-T6 ---
  {
    id: 'ws_t1_dagger', profession: 'weaponsmith', name: 'Cindite Dagger', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'crude_dagger', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t2_dagger', profession: 'weaponsmith', name: 'Ferrite Stiletto', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'steel_stiletto', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t3_dagger', profession: 'weaponsmith', name: 'Alloy Kris', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'obsidian_kris', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t4_dagger', profession: 'weaponsmith', name: 'Voidsteel Dirk', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_dirk', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t5_dagger', profession: 'weaponsmith', name: 'Celesteel Shiv', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'dreadwood_plank', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_shiv', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'ws_t6_dagger', profession: 'weaponsmith', name: 'Primordial Fang', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_fang', outputILvl: 55, catalystSlot: true,
  },

  // --- Wand T1-T6 ---
  {
    id: 'ws_t1_wand', profession: 'weaponsmith', name: 'Cindite Wand', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'twig_wand', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t2_wand', profession: 'weaponsmith', name: 'Ferrite Wand', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'bone_wand', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t3_wand', profession: 'weaponsmith', name: 'Alloy Wand', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'obsidian_wand', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t4_wand', profession: 'weaponsmith', name: 'Voidsteel Wand', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_wand', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t5_wand', profession: 'weaponsmith', name: 'Celesteel Wand', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'dreadwood_plank', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_wand', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'ws_t6_wand', profession: 'weaponsmith', name: 'Primordial Wand', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_wand', outputILvl: 55, catalystSlot: true,
  },

  // --- Bow T1-T6 ---
  {
    id: 'ws_t1_bow', profession: 'weaponsmith', name: 'Cindite Shortbow', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'shortbow', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t2_bow', profession: 'weaponsmith', name: 'Ferrite Recurve', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'recurve_bow', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t3_bow', profession: 'weaponsmith', name: 'Alloy Longbow', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'obsidian_longbow', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t4_bow', profession: 'weaponsmith', name: 'Voidsteel Bow', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_bow', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t5_bow', profession: 'weaponsmith', name: 'Celesteel Bow', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'dreadwood_plank', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_bow', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'ws_t6_bow', profession: 'weaponsmith', name: 'Primordial Bow', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_bow', outputILvl: 55, catalystSlot: true,
  },

  // --- Crossbow T1-T6 ---
  {
    id: 'ws_t1_crossbow', profession: 'weaponsmith', name: 'Cindite Crossbow', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'hand_crossbow', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t2_crossbow', profession: 'weaponsmith', name: 'Ferrite Crossbow', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'iron_crossbow', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t3_crossbow', profession: 'weaponsmith', name: 'Alloy Arbalest', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'obsidian_arbalest', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t4_crossbow', profession: 'weaponsmith', name: 'Voidsteel Crossbow', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_crossbow', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t5_crossbow', profession: 'weaponsmith', name: 'Celesteel Arbalest', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'dreadwood_plank', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_arbalest', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'ws_t6_crossbow', profession: 'weaponsmith', name: 'Primordial Crossbow', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_crossbow', outputILvl: 55, catalystSlot: true,
  },

  // --- Staff T1-T4 + T6 (T5 runic_staff already exists above) ---
  {
    id: 'ws_t1_staff', profession: 'weaponsmith', name: 'Cindite Staff', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'gnarled_staff', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t2_staff', profession: 'weaponsmith', name: 'Ferrite Staff', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'ironshod_staff', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t3_staff', profession: 'weaponsmith', name: 'Alloy Staff', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'obsidian_staff', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t4_staff', profession: 'weaponsmith', name: 'Voidsteel Staff', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_staff', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t6_staff', profession: 'weaponsmith', name: 'Primordial Staff', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_staff', outputILvl: 55, catalystSlot: true,
  },

  // --- Offhand T1-T6 (shields, bucklers, tomes) ---
  {
    id: 'ws_t1_shield', profession: 'weaponsmith', name: 'Cindite Shield', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'iron_shield', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t1_tome', profession: 'weaponsmith', name: 'Cindite Tome', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'emberwood_plank', amount: 3 }],
    goldCost: 10, outputBaseId: 'arcane_focus', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ws_t2_buckler', profession: 'weaponsmith', name: 'Ferrite Buckler', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'studded_buckler', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t2_shield', profession: 'weaponsmith', name: 'Ferrite Shield', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'ironwood_plank', amount: 4 }],
    goldCost: 25, outputBaseId: 'obsidian_bulwark', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'ws_t3_shield', profession: 'weaponsmith', name: 'Alloy Shield', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'mithril_shield', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t3_tome', profession: 'weaponsmith', name: 'Alloy Grimoire', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'steelwood_plank', amount: 5 }],
    goldCost: 35, outputBaseId: 'eldritch_grimoire', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'ws_t4_buckler', profession: 'weaponsmith', name: 'Voidsteel Buckler', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_buckler', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t4_tome', profession: 'weaponsmith', name: 'Voidsteel Tome', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'runic_tome', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'ws_t5_shield', profession: 'weaponsmith', name: 'Celesteel Shield', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'dreadwood_plank', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_bulwark', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'ws_t5_buckler', profession: 'weaponsmith', name: 'Celesteel Buckler', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'dreadwood_plank', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_buckler', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'ws_t6_shield', profession: 'weaponsmith', name: 'Primordial Shield', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_aegis', outputILvl: 55, catalystSlot: true,
  },
  {
    id: 'ws_t6_tome', profession: 'weaponsmith', name: 'Primordial Codex', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_plank', amount: 10 }],
    goldCost: 500, outputBaseId: 'astral_codex', outputILvl: 55, catalystSlot: true,
  },
];

// ─── Armorer Recipes ──────────────────────────────────────────────
// Plate armor: 6 slots × 6 tiers (generated) + bracer extras. Uses: ingots (ore) + leather

const armorerRecipes: CraftingRecipeDef[] = [
  ...generateArmorRecipes('armorer', 'ar', [
    ['cindite_ingot', 'cured_leather'],
    ['ferrite_ingot', 'hardened_leather'],
    ['forged_alloy', 'reinforced_leather'],
    ['voidsteel_ingot', 'shadowleather'],
    ['celesteel_ingot', 'dreadleather'],
    ['primordial_ingot', 'primordial_leather'],
  ], {
    helmet:    ['iron_helm', 'steel_greathelm', 'obsidian_faceplate', 'mithril_helm', 'runic_greathelm', 'void_faceplate'],
    chest:     ['iron_breastplate', 'steel_cuirass', 'plate_cuirass', 'mithril_cuirass', 'runic_breastplate', 'void_cuirass'],
    shoulders: ['iron_pauldrons', 'steel_shoulderguards', 'obsidian_mantle', 'mithril_pauldrons', 'runic_shoulderguards', 'void_mantle'],
    gloves:    ['iron_gauntlets', 'steel_gauntlets', 'obsidian_gauntlets', 'mithril_gauntlets', 'runic_gauntlets', 'void_gauntlets'],
    pants:     ['iron_legguards', 'steel_legplates', 'obsidian_greaves', 'mithril_legplates', 'runic_legplates', 'void_legplates'],
    boots:     ['iron_sabatons', 'plated_greaves', 'obsidian_sabatons', 'mithril_sabatons', 'runic_sabatons', 'void_sabatons'],
  }),
  // Extra: bracers (not in 6-slot grid)
  {
    id: 'ar_t1_bracers', profession: 'armorer', name: 'Cindite Bracers', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'cured_leather', amount: 3 }],
    goldCost: 10, outputBaseId: 'wrapped_bracers', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'ar_t2_bracers', profession: 'armorer', name: 'Ferrite Bracers', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'hardened_leather', amount: 4 }],
    goldCost: 25, outputBaseId: 'fortified_bracers', outputILvl: 15, catalystSlot: true,
  },
];

// ─── Leatherworker Recipes ──────────────────────────────────────
// Leather armor: 6 slots × 6 tiers (generated) + cloak extras. Uses: leather + planks (wood)

const leatherworkerRecipes: CraftingRecipeDef[] = [
  ...generateArmorRecipes('leatherworker', 'lw', [
    ['cured_leather', 'emberwood_plank'],
    ['hardened_leather', 'ironwood_plank'],
    ['reinforced_leather', 'steelwood_plank'],
    ['shadowleather', 'shadowwood_plank'],
    ['dreadleather', 'dreadwood_plank'],
    ['primordial_leather', 'primordial_plank'],
  ], {
    helmet:    ['rawhide_cap', 'studded_headband', 'nightstalker_hood', 'mithril_headband', 'runic_hood', 'void_hood'],
    chest:     ['rawhide_tunic', 'studded_jerkin', 'nightstalker_vest', 'mithril_vest', 'runic_vest', 'void_vest'],
    shoulders: ['hide_shoulderpads', 'studded_shoulderguards', 'nightstalker_shoulders', 'mithril_shoulderpads', 'runic_shoulderpads', 'void_shoulderpads'],
    gloves:    ['hide_gloves', 'studded_gloves', 'nightstalker_gloves', 'mithril_hide_gloves', 'runic_hide_gloves', 'void_hide_gloves'],
    pants:     ['rawhide_pants', 'studded_leggings', 'nightstalker_pants', 'mithril_leggings', 'runic_leggings', 'void_leggings'],
    boots:     ['leather_boots', 'studded_boots', 'nightstalker_boots', 'mithril_treads', 'runic_treads_leather', 'void_treads'],
  }),
  // Extra: cloak
  {
    id: 'lw_t4_cloak', profession: 'leatherworker', name: 'Shadow Cloak', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'shadowleather', amount: 6 }, { materialId: 'shadowwood_plank', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_cloak', outputILvl: 35, catalystSlot: true,
  },
];

// ─── Tailor Recipes ───────────────────────────────────────────────
// Cloth armor: 6 slots × 6 tiers (generated). Uses: cloth + extracts (herb)

const tailorRecipes: CraftingRecipeDef[] = [
  ...generateArmorRecipes('tailor', 'ta', [
    ['thornweave_cloth', 'wispbloom_extract'],
    ['woven_linen', 'potent_tincture'],
    ['silkweave_cloth', 'lustral_essence'],
    ['shadowcloth', 'shadow_elixir'],
    ['aethercloth', 'tempest_distillate'],
    ['primordial_cloth', 'primordial_essence'],
  ], {
    helmet:    ['linen_hood', 'silk_circlet', 'arcane_crown', 'mithril_circlet', 'runic_crown', 'void_circlet'],
    chest:     ['linen_robe', 'silk_robe', 'arcane_vestment', 'mithril_robe', 'runic_vestment', 'void_robe'],
    shoulders: ['linen_shawl', 'silk_epaulets', 'arcane_mantle', 'mithril_epaulets', 'runic_epaulets', 'void_epaulets'],
    gloves:    ['linen_gloves', 'silk_gloves', 'arcane_handwraps', 'mithril_handwraps', 'runic_handwraps', 'void_handwraps'],
    pants:     ['linen_trousers', 'silk_pants', 'arcane_leggings', 'mithril_trousers', 'runic_trousers', 'void_trousers'],
    boots:     ['linen_sandals', 'silk_slippers', 'runic_treads', 'mithril_slippers', 'runic_slippers', 'void_slippers'],
  }),
];

// ─── Alchemist Recipes ──────────────────────────────────────────
// Affix catalyst recipes — produce materials, not items

const alchemistRecipes: CraftingRecipeDef[] = [
  {
    id: 'al_whetstone', profession: 'alchemist', name: 'Whetstone', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 8 }, { materialId: 'emberwood_plank', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'whetstone',
  },
  {
    id: 'al_destruction_lens', profession: 'alchemist', name: 'Destruction Lens', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 8 }, { materialId: 'wispbloom_extract', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'destruction_lens',
  },
  {
    id: 'al_speed_rune', profession: 'alchemist', name: 'Speed Rune', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'emberwood_plank', amount: 8 }, { materialId: 'cured_leather', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'speed_rune',
  },
  {
    id: 'al_precision_lens', profession: 'alchemist', name: 'Precision Lens', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cured_leather', amount: 8 }, { materialId: 'wispbloom_extract', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'precision_lens',
  },
  {
    id: 'al_brutality_shard', profession: 'alchemist', name: 'Brutality Shard', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 8 }, { materialId: 'thornweave_cloth', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'brutality_shard',
  },
  {
    id: 'al_vitality_essence', profession: 'alchemist', name: 'Vitality Essence', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'wispbloom_extract', amount: 8 }, { materialId: 'fish_oil', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'vitality_essence',
  },
  {
    id: 'al_fortification_kit', profession: 'alchemist', name: 'Fortification Kit', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 8 }, { materialId: 'cured_leather', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'fortification_kit',
  },
  {
    id: 'al_evasion_charm', profession: 'alchemist', name: 'Evasion Charm', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cured_leather', amount: 8 }, { materialId: 'emberwood_plank', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'evasion_charm',
  },
  {
    id: 'al_haste_crystal', profession: 'alchemist', name: 'Haste Crystal', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'thornweave_cloth', amount: 8 }, { materialId: 'wispbloom_extract', amount: 5 }],
    goldCost: 100, outputBaseId: '', outputILvl: 0, outputMaterialId: 'haste_crystal',
  },
];

// ─── Jeweler Recipes ──────────────────────────────────────────────
// Rings + belts (ingots + essences) + neck + trinkets (extracts + reagents, absorbed from alchemist)

const jewelerRecipes: CraftingRecipeDef[] = [
  // --- Rings + Belts (original jeweler) ---
  // Tier 1
  {
    id: 'je_t1_ring', profession: 'jeweler', name: 'Copper Setting', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'wispbloom_extract', amount: 3 }],
    goldCost: 10, outputBaseId: 'copper_band', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'je_t1_belt', profession: 'jeweler', name: 'Cindite Buckle', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'cindite_ingot', amount: 3 }, { materialId: 'wispbloom_extract', amount: 3 }],
    goldCost: 10, outputBaseId: 'rope_belt', outputILvl: 5, catalystSlot: true,
  },
  // Tier 2
  {
    id: 'je_t2_ring', profession: 'jeweler', name: 'Silver Setting', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'potent_tincture', amount: 4 }],
    goldCost: 25, outputBaseId: 'silver_ring', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'je_t2_belt', profession: 'jeweler', name: 'Ferrite Girdle', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'ferrite_ingot', amount: 4 }, { materialId: 'potent_tincture', amount: 4 }],
    goldCost: 25, outputBaseId: 'studded_belt', outputILvl: 15, catalystSlot: true,
  },
  // Tier 3
  {
    id: 'je_t3_ring', profession: 'jeweler', name: 'Gold Signet', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'lustral_essence', amount: 5 }],
    goldCost: 35, outputBaseId: 'gold_signet', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'je_t3_belt', profession: 'jeweler', name: 'Alloy Girdle', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'forged_alloy', amount: 5 }, { materialId: 'lustral_essence', amount: 5 }],
    goldCost: 35, outputBaseId: 'runed_girdle', outputILvl: 25, catalystSlot: true,
  },
  // Tier 4
  {
    id: 'je_t4_ring', profession: 'jeweler', name: 'Ruby Setting', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadow_elixir', amount: 6 }],
    goldCost: 70, outputBaseId: 'ruby_ring', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'je_t4_belt', profession: 'jeweler', name: 'Void Girdle', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 6 }, { materialId: 'shadow_elixir', amount: 6 }],
    goldCost: 70, outputBaseId: 'mithril_belt', outputILvl: 35, catalystSlot: true,
  },
  // Tier 5
  {
    id: 'je_t5_ring', profession: 'jeweler', name: 'Astral Band', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'tempest_distillate', amount: 8 }],
    goldCost: 200, outputBaseId: 'astral_ring', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'je_t5_belt', profession: 'jeweler', name: 'Celesteel Belt', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 8 }, { materialId: 'tempest_distillate', amount: 8 }],
    goldCost: 200, outputBaseId: 'runic_girdle', outputILvl: 45, catalystSlot: true,
  },
  // Tier 6
  {
    id: 'je_t6_ring', profession: 'jeweler', name: 'Starforged Ring', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_essence', amount: 10 }],
    goldCost: 500, outputBaseId: 'starforged_signet', outputILvl: 55, catalystSlot: true,
  },
  {
    id: 'je_t6_belt', profession: 'jeweler', name: 'Primordial Belt', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 10 }, { materialId: 'primordial_essence', amount: 10 }],
    goldCost: 500, outputBaseId: 'void_belt', outputILvl: 55, catalystSlot: true,
  },

  // --- Neck + Trinkets (absorbed from alchemist) ---
  // Tier 1
  {
    id: 'je_t1_charm', profession: 'jeweler', name: 'Wispbloom Charm', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'wispbloom_extract', amount: 3 }, { materialId: 'fish_oil', amount: 3 }],
    goldCost: 10, outputBaseId: 'bone_charm', outputILvl: 5, catalystSlot: true,
  },
  {
    id: 'je_t1_trinket', profession: 'jeweler', name: 'Minor Tincture', tier: 1, requiredLevel: 1,
    materials: [{ materialId: 'wispbloom_extract', amount: 3 }, { materialId: 'fish_oil', amount: 3 }],
    goldCost: 10, outputBaseId: 'cracked_gem', outputILvl: 5, catalystSlot: true,
  },
  // Tier 2
  {
    id: 'je_t2_amulet', profession: 'jeweler', name: 'Marsh Amulet', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'potent_tincture', amount: 4 }, { materialId: 'aqua_reagent', amount: 4 }],
    goldCost: 25, outputBaseId: 'jade_amulet', outputILvl: 15, catalystSlot: true,
  },
  {
    id: 'je_t2_crystal', profession: 'jeweler', name: 'Potent Crystal', tier: 2, requiredLevel: 15,
    materials: [{ materialId: 'potent_tincture', amount: 4 }, { materialId: 'aqua_reagent', amount: 4 }],
    goldCost: 25, outputBaseId: 'polished_stone', outputILvl: 15, catalystSlot: true,
  },
  // Tier 3
  {
    id: 'je_t3_pendant', profession: 'jeweler', name: 'Lustral Pendant', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'lustral_essence', amount: 5 }, { materialId: 'frost_reagent', amount: 5 }],
    goldCost: 35, outputBaseId: 'onyx_pendant', outputILvl: 25, catalystSlot: true,
  },
  {
    id: 'je_t3_shard', profession: 'jeweler', name: 'Frost Shard', tier: 3, requiredLevel: 30,
    materials: [{ materialId: 'lustral_essence', amount: 5 }, { materialId: 'frost_reagent', amount: 5 }],
    goldCost: 35, outputBaseId: 'prismatic_shard', outputILvl: 25, catalystSlot: true,
  },
  // Tier 4
  {
    id: 'je_t4_amulet', profession: 'jeweler', name: 'Shadow Amulet', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'shadow_elixir', amount: 6 }, { materialId: 'abyssal_reagent', amount: 6 }],
    goldCost: 70, outputBaseId: 'ruby_amulet', outputILvl: 35, catalystSlot: true,
  },
  {
    id: 'je_t4_crystal', profession: 'jeweler', name: 'Abyssal Crystal', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'shadow_elixir', amount: 6 }, { materialId: 'abyssal_reagent', amount: 6 }],
    goldCost: 70, outputBaseId: 'infused_crystal', outputILvl: 35, catalystSlot: true,
  },
  // Tier 5
  {
    id: 'je_t5_choker', profession: 'jeweler', name: 'Tempest Choker', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'tempest_distillate', amount: 8 }, { materialId: 'tempest_reagent', amount: 8 }],
    goldCost: 200, outputBaseId: 'void_pendant', outputILvl: 45, catalystSlot: true,
  },
  {
    id: 'je_t5_prism', profession: 'jeweler', name: 'Storm Prism', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'tempest_distillate', amount: 8 }, { materialId: 'tempest_reagent', amount: 8 }],
    goldCost: 200, outputBaseId: 'void_shard', outputILvl: 45, catalystSlot: true,
  },
  // Tier 6
  {
    id: 'je_t6_amulet', profession: 'jeweler', name: 'Primordial Amulet', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_essence', amount: 10 }, { materialId: 'primordial_reagent', amount: 10 }],
    goldCost: 500, outputBaseId: 'astral_choker', outputILvl: 55, catalystSlot: true,
  },
  {
    id: 'je_t6_prism', profession: 'jeweler', name: 'Primordial Prism', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_essence', amount: 10 }, { materialId: 'primordial_reagent', amount: 10 }],
    goldCost: 500, outputBaseId: 'astral_prism', outputILvl: 55, catalystSlot: true,
  },
];

// ─── Unique / Catalyst Recipes ────────────────────────────────────
// These require specific rare materials (requiredCatalyst) and do NOT have catalystSlot

const uniqueRecipes: CraftingRecipeDef[] = [
  {
    id: 'je_t4_prismatic_ring', profession: 'jeweler', name: 'Prismatic Ring', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'forged_alloy', amount: 3 }, { materialId: 'lustral_essence', amount: 3 }],
    goldCost: 300, outputBaseId: 'astral_ring', outputILvl: 45,
    requiredCatalyst: { rareMaterialId: 'flawless_gem', amount: 1 },
  },
  {
    id: 'ws_t5_fangblade', profession: 'weaponsmith', name: 'Fangblade', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'celesteel_ingot', amount: 5 }, { materialId: 'dreadwood_plank', amount: 5 }],
    goldCost: 500, outputBaseId: 'runic_greatsword', outputILvl: 50,
    requiredCatalyst: { rareMaterialId: 'primordial_fang', amount: 1 },
  },
  {
    id: 'je_t5_elixir_mastery', profession: 'jeweler', name: 'Elixir of Mastery', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'tempest_distillate', amount: 5 }, { materialId: 'tempest_reagent', amount: 5 }],
    goldCost: 500, outputBaseId: 'astral_choker', outputILvl: 50,
    requiredCatalyst: { rareMaterialId: 'pure_essence', amount: 1 },
  },
  {
    id: 'ar_t4_heartwood_shield', profession: 'armorer', name: 'Heartwood Shield', tier: 4, requiredLevel: 50,
    materials: [{ materialId: 'voidsteel_ingot', amount: 4 }, { materialId: 'shadowleather', amount: 4 }],
    goldCost: 300, outputBaseId: 'runic_bulwark', outputILvl: 40,
    requiredCatalyst: { rareMaterialId: 'elder_heartwood', amount: 1 },
  },
  {
    id: 'ta_t5_aetherspun_robe', profession: 'tailor', name: 'Aetherspun Robe', tier: 5, requiredLevel: 75,
    materials: [{ materialId: 'aethercloth', amount: 5 }, { materialId: 'tempest_distillate', amount: 5 }],
    goldCost: 500, outputBaseId: 'void_robe', outputILvl: 50,
    requiredCatalyst: { rareMaterialId: 'radiant_essence', amount: 1 },
  },
  {
    id: 'je_t6_abyssal_signet', profession: 'jeweler', name: 'Abyssal Signet', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 5 }, { materialId: 'primordial_essence', amount: 5 }],
    goldCost: 1000, outputBaseId: 'starforged_signet', outputILvl: 55,
    requiredCatalyst: { rareMaterialId: 'abyssal_pearl', amount: 1 },
  },
  {
    id: 'ws_t6_primordial_warhammer', profession: 'weaponsmith', name: 'Primordial Warhammer', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 8 }, { materialId: 'primordial_plank', amount: 8 }],
    goldCost: 1000, outputBaseId: 'starforged_mace', outputILvl: 55,
    requiredCatalyst: { rareMaterialId: 'primordial_heartwood', amount: 1 },
  },
  {
    id: 'ar_t6_primordial_fortress', profession: 'armorer', name: 'Primordial Fortress', tier: 6, requiredLevel: 90,
    materials: [{ materialId: 'primordial_ingot', amount: 8 }, { materialId: 'primordial_leather', amount: 8 }],
    goldCost: 1000, outputBaseId: 'starforged_breastplate', outputILvl: 55,
    requiredCatalyst: { rareMaterialId: 'perfect_gem', amount: 1 },
  },
];

// ─── Combined Export ──────────────────────────────────────────────

// Auto-inject componentCost for gear-producing recipes that don't have one yet.
// Alchemist catalyst recipes (outputMaterialId set) skip component costs.
function injectComponentCosts(recipes: CraftingRecipeDef[]): CraftingRecipeDef[] {
  return recipes.map(r => {
    if (r.componentCost) return r;             // already has one (generated armor)
    if (r.outputMaterialId) return r;          // material-producing (alchemist catalysts)
    if (!r.outputBaseId) return r;             // safety guard
    return { ...r, componentCost: getComponentCost(r.tier, r.profession) };
  });
}

export const CRAFTING_RECIPES: CraftingRecipeDef[] = injectComponentCosts([
  ...weaponsmithRecipes,
  ...armorerRecipes,
  ...leatherworkerRecipes,
  ...tailorRecipes,
  ...alchemistRecipes,
  ...jewelerRecipes,
  ...uniqueRecipes,
]);

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

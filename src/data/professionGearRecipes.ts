import type { CraftingRecipeDef } from '../types';

// ─── Profession Gear Tier Constants ─────────────────────────────────
// Lower costs (~60% of regular gear) since these are profession tools, not combat gear.
// Gold:   T1=0,  T2=0,   T3=0,   T4=10,   T5=30,   T6=75
// iLvl:   T1=5,  T2=15,  T3=25,  T4=35,   T5=45,   T6=55
// Level:  T1=1,  T2=5,   T3=10,  T4=20,   T5=35,   T6=50

const PROF_TIER = [
  { tier: 1, reqLevel: 1,  iLvl: 5,  gold: 0  },
  { tier: 2, reqLevel: 5,  iLvl: 15, gold: 0  },
  { tier: 3, reqLevel: 10, iLvl: 25, gold: 0  },
  { tier: 4, reqLevel: 20, iLvl: 35, gold: 10 },
  { tier: 5, reqLevel: 35, iLvl: 45, gold: 30 },
  { tier: 6, reqLevel: 50, iLvl: 55, gold: 75 },
] as const;

// ─── Material Definitions Per Profession ────────────────────────────
// Each entry is [tier-index] => array of { materialId, amount } pairs.

type MatRow = { materialId: string; amount: number }[];

const ARMORER_MATS: MatRow[] = [
  [{ materialId: 'cindite_ingot',     amount: 2 }, { materialId: 'emberwood_plank',   amount: 1 }],
  [{ materialId: 'ferrite_ingot',     amount: 3 }, { materialId: 'ironwood_plank',    amount: 2 }],
  [{ materialId: 'forged_alloy',      amount: 3 }, { materialId: 'steelwood_plank',   amount: 2 }],
  [{ materialId: 'voidsteel_ingot',   amount: 4 }, { materialId: 'shadowwood_plank',  amount: 2 }],
  [{ materialId: 'celesteel_ingot',   amount: 5 }, { materialId: 'dreadwood_plank',   amount: 3 }],
  [{ materialId: 'primordial_ingot',  amount: 6 }, { materialId: 'primordial_plank',  amount: 3 }],
];

const LEATHERWORKER_MATS: MatRow[] = [
  [{ materialId: 'cured_leather',     amount: 2 }, { materialId: 'cindite_ingot',     amount: 1 }],
  [{ materialId: 'hardened_leather',   amount: 3 }, { materialId: 'ferrite_ingot',     amount: 1 }],
  [{ materialId: 'reinforced_leather', amount: 3 }, { materialId: 'forged_alloy',      amount: 2 }],
  [{ materialId: 'shadowleather',      amount: 4 }, { materialId: 'voidsteel_ingot',   amount: 2 }],
  [{ materialId: 'shadowleather',      amount: 5 }, { materialId: 'celesteel_ingot',   amount: 3 }],
  [{ materialId: 'shadowleather',      amount: 6 }, { materialId: 'primordial_ingot',  amount: 4 }],
];

const TAILOR_MATS: MatRow[] = [
  [{ materialId: 'emberwood_plank',   amount: 2 }, { materialId: 'cured_leather',     amount: 1 }],
  [{ materialId: 'ironwood_plank',    amount: 3 }, { materialId: 'hardened_leather',   amount: 1 }],
  [{ materialId: 'steelwood_plank',   amount: 3 }, { materialId: 'reinforced_leather', amount: 2 }],
  [{ materialId: 'shadowwood_plank',  amount: 4 }, { materialId: 'shadowleather',      amount: 2 }],
  [{ materialId: 'dreadwood_plank',   amount: 5 }, { materialId: 'shadowleather',      amount: 3 }],
  [{ materialId: 'primordial_plank',  amount: 6 }, { materialId: 'shadowleather',      amount: 4 }],
];

const WEAPONSMITH_MATS: MatRow[] = [
  [{ materialId: 'cindite_ingot',     amount: 2 }, { materialId: 'emberwood_plank',   amount: 2 }],
  [{ materialId: 'ferrite_ingot',     amount: 3 }, { materialId: 'ironwood_plank',    amount: 3 }],
  [{ materialId: 'forged_alloy',      amount: 4 }, { materialId: 'steelwood_plank',   amount: 3 }],
  [{ materialId: 'voidsteel_ingot',   amount: 5 }, { materialId: 'shadowwood_plank',  amount: 3 }],
  [{ materialId: 'celesteel_ingot',   amount: 6 }, { materialId: 'dreadwood_plank',   amount: 4 }],
  [{ materialId: 'primordial_ingot',  amount: 8 }, { materialId: 'primordial_plank',  amount: 5 }],
];

// ─── Base Names Per Slot ────────────────────────────────────────────
// Index maps to tier (0 = T1, 5 = T6).

const SLOT_NAMES: Record<string, string[]> = {
  helmet:    ["Apprentice's Cap",     "Journeyman's Hood",      "Artisan's Goggles",    "Expert's Visor",      "Master's Circlet",       "Grandmaster's Crown"],
  shoulders: ['Padded Shawl',         'Leather Mantle',         "Artisan's Pauldrons",  "Expert's Epaulets",   "Master's Shoulderguard", "Grandmaster's Mantle"],
  chest:     ['Work Apron',           'Sturdy Smock',           "Artisan's Vest",       "Expert's Hauberk",    "Master's Vestments",     "Grandmaster's Regalia"],
  gloves:    ['Cloth Mitts',          'Leather Grips',          "Artisan's Gauntlets",  "Expert's Handwraps",  "Master's Gloves",        "Grandmaster's Touch"],
  pants:     ['Rough Trousers',       'Padded Leggings',        "Artisan's Breeches",   "Expert's Greaves",    "Master's Legguards",     "Grandmaster's Chaps"],
  boots:     ['Simple Sandals',       'Sturdy Boots',           "Artisan's Treads",     "Expert's Sabatons",   "Master's Striders",      "Grandmaster's Steps"],
  tool:      ['Crude Pickaxe',        'Iron Sickle',            'Steel Hatchet',        'Mithril Tongs',       'Titanium Auger',         'Dragonbone Chisel'],
};

// ─── Recipe Generator ───────────────────────────────────────────────

interface SlotConfig {
  slot: string;
  profession: string;
  mats: MatRow[];
}

function generateProfGearRecipes(configs: SlotConfig[]): CraftingRecipeDef[] {
  const recipes: CraftingRecipeDef[] = [];

  for (const { slot, profession, mats } of configs) {
    const names = SLOT_NAMES[slot];
    for (let ti = 0; ti < 6; ti++) {
      const tc = PROF_TIER[ti];

      recipes.push({
        id: `prof_${slot}_t${tc.tier}`,
        profession: profession as CraftingRecipeDef['profession'],
        name: names[ti],
        tier: tc.tier,
        requiredLevel: tc.reqLevel,
        materials: [...mats[ti]],
        goldCost: tc.gold,
        outputBaseId: `prof_${slot}_t${tc.tier}`,
        outputILvl: tc.iLvl,
        isProfessionGear: true,
        catalystSlot: true,
      });
    }
  }

  return recipes;
}

// ─── All 42 Profession Gear Recipes ─────────────────────────────────
// 7 slots x 6 tiers = 42 recipes
//   Armorer:       helmet (6) + chest (6)      = 12
//   Leatherworker: gloves (6) + boots (6)      = 12
//   Tailor:        shoulders (6) + pants (6)    = 12
//   Weaponsmith:   tool (6)                     =  6
//                                         Total = 42

export const PROFESSION_GEAR_RECIPES: CraftingRecipeDef[] = generateProfGearRecipes([
  // Armorer: helmet + chest
  { slot: 'helmet',    profession: 'armorer',       mats: ARMORER_MATS },
  { slot: 'chest',     profession: 'armorer',       mats: ARMORER_MATS },
  // Leatherworker: gloves + boots
  { slot: 'gloves',    profession: 'leatherworker', mats: LEATHERWORKER_MATS },
  { slot: 'boots',     profession: 'leatherworker', mats: LEATHERWORKER_MATS },
  // Tailor: shoulders + pants
  { slot: 'shoulders', profession: 'tailor',        mats: TAILOR_MATS },
  { slot: 'pants',     profession: 'tailor',        mats: TAILOR_MATS },
  // Weaponsmith: tool
  { slot: 'tool',      profession: 'weaponsmith',   mats: WEAPONSMITH_MATS },
]);

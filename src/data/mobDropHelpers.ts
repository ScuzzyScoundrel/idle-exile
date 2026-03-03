// ============================================================
// Idle Exile — Mob Drop Table Helpers
// Generates rich drop tables for each mob type.
// ============================================================

import type { MobDrop, MobDropRarity } from '../types';

// ---------------------------------------------------------------------------
// Band-Tiered Crafting Materials
// ---------------------------------------------------------------------------

/** Generic crafting materials available per band tier. */
export const BAND_MATERIALS: Record<number, { common: string[]; uncommon: string[] }> = {
  1: {
    common:   ['frayed_cloth', 'bent_screws', 'torn_leather', 'bone_splinters'],
    uncommon: ['viscous_ichor', 'mana_dust', 'dim_crystal'],
  },
  2: {
    common:   ['frayed_cloth', 'bent_screws', 'torn_leather', 'bone_splinters'],
    uncommon: ['viscous_ichor', 'mana_dust', 'dim_crystal'],
  },
  3: {
    common:   ['woven_sinew', 'tempered_bolts', 'scaled_hide', 'chitin_shards'],
    uncommon: ['volatile_gland', 'soul_wisp', 'fractured_prism'],
  },
  4: {
    common:   ['woven_sinew', 'tempered_bolts', 'scaled_hide', 'chitin_shards'],
    uncommon: ['volatile_gland', 'soul_wisp', 'fractured_prism'],
  },
  5: {
    common:   ['spectral_thread', 'void_rivets', 'thick_pelt', 'carapace_fragment'],
    uncommon: ['corrosive_spit', 'arcane_residue', 'resonant_shard'],
  },
  6: {
    common:   ['spectral_thread', 'void_rivets', 'thick_pelt', 'carapace_fragment'],
    uncommon: ['corrosive_spit', 'arcane_residue', 'resonant_shard'],
  },
};

/** Cross-band rare materials — any band can drop these (very low chance). */
export const CROSS_BAND_RARES: string[] = [
  'pristine_fang', 'enchanted_bone', 'living_ember', 'frozen_heart', 'void_essence',
];

// ---------------------------------------------------------------------------
// Theme-Based Material Affinity
// ---------------------------------------------------------------------------

type MobTheme = 'beast' | 'insectoid' | 'construct' | 'elemental' | 'undead' | 'humanoid';

/** Maps mob theme to preferred common material indices (from band pool). */
const THEME_COMMON_PREFERENCE: Record<MobTheme, number[]> = {
  beast:     [2, 3],  // torn_leather/scaled_hide, bone_splinters/chitin_shards
  insectoid: [3, 1],  // bone_splinters/chitin_shards, bent_screws/tempered_bolts
  construct: [1, 0],  // bent_screws/tempered_bolts, frayed_cloth/woven_sinew
  elemental: [0, 3],  // frayed_cloth/woven_sinew, bone_splinters/chitin_shards
  undead:    [3, 0],  // bone_splinters/chitin_shards, frayed_cloth/woven_sinew
  humanoid:  [0, 2],  // frayed_cloth/woven_sinew, torn_leather/scaled_hide
};

const THEME_UNCOMMON_PREFERENCE: Record<MobTheme, number> = {
  beast:     0,  // viscous_ichor/volatile_gland
  insectoid: 0,  // viscous_ichor/volatile_gland
  construct: 2,  // dim_crystal/fractured_prism
  elemental: 1,  // mana_dust/soul_wisp
  undead:    1,  // mana_dust/soul_wisp
  humanoid:  2,  // dim_crystal/fractured_prism
};

// ---------------------------------------------------------------------------
// buildMobDropTable
// ---------------------------------------------------------------------------

/**
 * Generates a drop table for a mob type.
 *
 * @param uniqueMaterialId - The mob's signature material (becomes the rare drop)
 * @param band - Zone band (1-6)
 * @param weight - Spawn weight (50/35/15) — rarer mobs get better drops
 * @param theme - Mob theme for material affinity
 */
export function buildMobDropTable(
  uniqueMaterialId: string,
  band: number,
  weight: number,
  theme: MobTheme = 'beast',
): MobDrop[] {
  const drops: MobDrop[] = [];
  const bandMats = BAND_MATERIALS[band] ?? BAND_MATERIALS[1];

  // --- Common drops (1-2 based on weight) ---
  const commonPrefs = THEME_COMMON_PREFERENCE[theme];
  const commonChance = weight >= 50 ? 0.40 : weight >= 35 ? 0.38 : 0.35;

  // First common drop
  const common1Idx = commonPrefs[0] % bandMats.common.length;
  drops.push({
    materialId: bandMats.common[common1Idx],
    chance: commonChance,
    minQty: 1,
    maxQty: weight >= 50 ? 2 : 1,
    rarity: 'common' as MobDropRarity,
  });

  // Second common drop (rarer mobs always get it, common mobs sometimes)
  if (weight <= 35) {
    const common2Idx = commonPrefs[1] % bandMats.common.length;
    if (common2Idx !== common1Idx) {
      drops.push({
        materialId: bandMats.common[common2Idx],
        chance: commonChance - 0.05,
        minQty: 1,
        maxQty: 1,
        rarity: 'common' as MobDropRarity,
      });
    }
  }

  // --- Uncommon drop ---
  const uncommonIdx = THEME_UNCOMMON_PREFERENCE[theme] % bandMats.uncommon.length;
  const uncommonChance = weight >= 50 ? 0.15 : weight >= 35 ? 0.14 : 0.18;
  drops.push({
    materialId: bandMats.uncommon[uncommonIdx],
    chance: uncommonChance,
    minQty: 1,
    maxQty: 1,
    rarity: 'uncommon' as MobDropRarity,
  });

  // --- Rare drop: the mob's unique material ---
  const rareChance = weight >= 50 ? 0.04 : weight >= 35 ? 0.05 : 0.03;
  drops.push({
    materialId: uniqueMaterialId,
    chance: rareChance,
    minQty: 1,
    maxQty: 1,
    rarity: 'rare' as MobDropRarity,
  });

  // --- Cross-band rare (weight 15 mobs only, very low chance) ---
  if (weight <= 15) {
    // Pick one based on band for variety
    const crossIdx = (band - 1) % CROSS_BAND_RARES.length;
    drops.push({
      materialId: CROSS_BAND_RARES[crossIdx],
      chance: 0.01,
      minQty: 1,
      maxQty: 1,
      rarity: 'rare' as MobDropRarity,
    });
  }

  return drops;
}

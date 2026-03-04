// ============================================================
// Idle Exile — Void Invasion Mob Definitions
// 2 void-themed mobs per band (12 total). 1.5x HP.
// ============================================================

import type { MobTypeDef } from '../types';

/** Invasion mobs per band. All have hpMultiplier: 1.5. */
export const INVASION_MOBS: Record<number, MobTypeDef[]> = {
  1: [
    {
      id: 'void_wisp_b1',
      name: 'Void Wisp',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.35, minQty: 1, maxQty: 2, rarity: 'uncommon' },
        { materialId: 'emberwood_logs', chance: 0.20, minQty: 1, maxQty: 2, rarity: 'common' },
      ],
      description: 'A flickering mote of void energy that phased into the mortal realm.',
    },
    {
      id: 'void_crawler_b1',
      name: 'Void Crawler',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.30, minQty: 1, maxQty: 2, rarity: 'uncommon' },
        { materialId: 'ragged_pelts', chance: 0.25, minQty: 1, maxQty: 2, rarity: 'common' },
      ],
      description: 'An insectoid creature warped by void corruption.',
    },
  ],
  2: [
    {
      id: 'void_stalker_b2',
      name: 'Void Stalker',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.35, minQty: 1, maxQty: 3, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.15, minQty: 1, maxQty: 1, rarity: 'rare' },
      ],
      description: 'A predator cloaked in ribbons of void darkness.',
    },
    {
      id: 'void_phantom_b2',
      name: 'Void Phantom',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.30, minQty: 1, maxQty: 3, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.10, minQty: 1, maxQty: 1, rarity: 'rare' },
      ],
      description: 'A spectral figure that flickers between dimensions.',
    },
  ],
  3: [
    {
      id: 'void_ravager_b3',
      name: 'Void Ravager',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.40, minQty: 2, maxQty: 4, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.20, minQty: 1, maxQty: 2, rarity: 'rare' },
      ],
      description: 'A hulking beast wreathed in crackling void energy.',
    },
    {
      id: 'void_horror_b3',
      name: 'Void Horror',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.35, minQty: 2, maxQty: 4, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.15, minQty: 1, maxQty: 2, rarity: 'rare' },
      ],
      description: 'An abomination pulled from the space between worlds.',
    },
  ],
  4: [
    {
      id: 'void_wraith_b4',
      name: 'Void Wraith',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.40, minQty: 2, maxQty: 5, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.25, minQty: 1, maxQty: 3, rarity: 'rare' },
        { materialId: 'void_heart_fragment', chance: 0.05, minQty: 1, maxQty: 1, rarity: 'rare' },
      ],
      description: 'A sentient void entity that hunts with cold intelligence.',
    },
    {
      id: 'void_devourer_b4',
      name: 'Void Devourer',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.35, minQty: 2, maxQty: 5, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.20, minQty: 1, maxQty: 3, rarity: 'rare' },
        { materialId: 'void_heart_fragment', chance: 0.05, minQty: 1, maxQty: 1, rarity: 'rare' },
      ],
      description: 'A massive maw that consumes all matter and light.',
    },
  ],
  5: [
    {
      id: 'void_sentinel_b5',
      name: 'Void Sentinel',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.45, minQty: 3, maxQty: 6, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.30, minQty: 2, maxQty: 4, rarity: 'rare' },
        { materialId: 'void_heart_fragment', chance: 0.10, minQty: 1, maxQty: 1, rarity: 'rare' },
      ],
      description: 'An ancient guardian forged from crystallized void energy.',
    },
    {
      id: 'void_colossus_b5',
      name: 'Void Colossus',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.40, minQty: 3, maxQty: 6, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.25, minQty: 2, maxQty: 4, rarity: 'rare' },
        { materialId: 'void_heart_fragment', chance: 0.08, minQty: 1, maxQty: 1, rarity: 'rare' },
      ],
      description: 'A towering titan of compressed void matter.',
    },
  ],
  6: [
    {
      id: 'void_archon_b6',
      name: 'Void Archon',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.50, minQty: 4, maxQty: 8, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.35, minQty: 2, maxQty: 5, rarity: 'rare' },
        { materialId: 'void_heart_fragment', chance: 0.15, minQty: 1, maxQty: 2, rarity: 'rare' },
      ],
      description: 'A commander of the void legions, radiating pure entropy.',
    },
    {
      id: 'void_annihilator_b6',
      name: 'Void Annihilator',
      weight: 50,
      hpMultiplier: 1.5,
      drops: [
        { materialId: 'void_essence_shard', chance: 0.45, minQty: 4, maxQty: 8, rarity: 'uncommon' },
        { materialId: 'void_crystal_dust', chance: 0.30, minQty: 2, maxQty: 5, rarity: 'rare' },
        { materialId: 'void_heart_fragment', chance: 0.12, minQty: 1, maxQty: 2, rarity: 'rare' },
      ],
      description: 'An engine of destruction that unmakes reality around it.',
    },
  ],
};

/** Get invasion mobs for a given band. */
export function getInvasionMobs(band: number): MobTypeDef[] {
  return INVASION_MOBS[band] ?? [];
}

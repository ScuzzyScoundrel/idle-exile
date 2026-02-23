import type { ZoneDef } from '../types';

const SHARED_ILVL_BY_TIER: Record<number, number> = {
  1: 1,
  2: 8,
  3: 15,
  4: 22,
  5: 30,
};

export const ZONE_DEFS: ZoneDef[] = [
  // ==================== Ashwood Forest ====================
  {
    id: 'whispering_glade',
    name: 'Whispering Glade',
    region: 'Ashwood Forest',
    description: 'Starting zone, gentle creatures.',
    maxTier: 5,
    baseClearTime: 20,
    iLvlByTier: { ...SHARED_ILVL_BY_TIER },
    materialDrops: ['rough_linen', 'beast_hide'],
  },
  {
    id: 'darkroot_hollow',
    name: 'Darkroot Hollow',
    region: 'Ashwood Forest',
    description: 'Deeper forest, tougher beasts.',
    maxTier: 5,
    baseClearTime: 30,
    iLvlByTier: { ...SHARED_ILVL_BY_TIER },
    materialDrops: ['rough_linen', 'beast_hide', 'dark_lumber'],
  },

  // ==================== Frostpeak Mines ====================
  {
    id: 'crystal_caverns',
    name: 'Crystal Caverns',
    region: 'Frostpeak Mines',
    description: 'Glittering mines, cold enemies.',
    maxTier: 5,
    baseClearTime: 35,
    iLvlByTier: { ...SHARED_ILVL_BY_TIER },
    materialDrops: ['iron_ore', 'crystal_shard'],
  },
  {
    id: 'frozen_depths',
    name: 'Frozen Depths',
    region: 'Frostpeak Mines',
    description: 'Deep ice caves.',
    maxTier: 5,
    baseClearTime: 45,
    iLvlByTier: { ...SHARED_ILVL_BY_TIER },
    materialDrops: ['iron_ore', 'crystal_shard', 'glacial_essence'],
  },

  // ==================== Rothollow Swamp ====================
  {
    id: 'bogwater_marsh',
    name: 'Bogwater Marsh',
    region: 'Rothollow Swamp',
    description: 'Poisonous wetlands.',
    maxTier: 5,
    baseClearTime: 40,
    iLvlByTier: { ...SHARED_ILVL_BY_TIER },
    materialDrops: ['swamp_herb', 'venom_sac'],
  },
  {
    id: 'venomspire_ruins',
    name: 'Venomspire Ruins',
    region: 'Rothollow Swamp',
    description: 'Ancient ruins in the swamp.',
    maxTier: 5,
    baseClearTime: 55,
    iLvlByTier: { ...SHARED_ILVL_BY_TIER },
    materialDrops: ['swamp_herb', 'venom_sac', 'dark_essence'],
  },
];

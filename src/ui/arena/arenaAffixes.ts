// ============================================================
// Arena Affixes — Spatial mob mechanics (separate from engine stat affixes)
// ============================================================

import type { ArenaAffixId } from './arenaTypes';

export interface ArenaAffixDef {
  id: ArenaAffixId;
  label: string;
  color: string;
  /** For explosive/toxic: hazard params on death */
  hazardType?: 'fire' | 'poison';
  hazardRadius?: number;
  hazardDuration?: number;
  hazardDps?: number;
}

export const ARENA_AFFIX_DEFS: Record<ArenaAffixId, ArenaAffixDef> = {
  explosive: {
    id: 'explosive',
    label: 'Explosive',
    color: '#f97316',
    hazardType: 'fire',
    hazardRadius: 40,
    hazardDuration: 3,
    hazardDps: 8,
  },
  toxic: {
    id: 'toxic',
    label: 'Toxic',
    color: '#4ade80',
    hazardType: 'poison',
    hazardRadius: 55,
    hazardDuration: 4,
    hazardDps: 6,
  },
  shielding: {
    id: 'shielding',
    label: 'Shielding',
    color: '#60a5fa',
  },
  teleporter: {
    id: 'teleporter',
    label: 'Teleporter',
    color: '#a78bfa',
  },
  mortar: {
    id: 'mortar',
    label: 'Mortar',
    color: '#fb923c',
  },
};

const ALL_AFFIX_IDS: ArenaAffixId[] = ['explosive', 'toxic', 'shielding', 'teleporter', 'mortar'];

/** Roll arena affixes for a mob.
 *  Rare: 1 + floor(wave/3), capped at 3.
 *  Non-rare: 35% chance for 1 affix. */
export function rollArenaAffixes(isRare: boolean, wave: number): ArenaAffixId[] {
  if (!isRare) {
    if (Math.random() >= 0.35) return [];
    return [ALL_AFFIX_IDS[Math.floor(Math.random() * ALL_AFFIX_IDS.length)]];
  }

  const count = Math.min(3, 1 + Math.floor(wave / 3));
  const pool = [...ALL_AFFIX_IDS];
  const result: ArenaAffixId[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

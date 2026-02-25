// ============================================================
// Idle Exile — Gathering Profession Definitions
// ============================================================

import type { GatheringProfession, GatheringMilestone } from '../types';

export interface GatheringProfessionDef {
  id: GatheringProfession;
  name: string;
  icon: string;
  description: string;
}

export const GATHERING_PROFESSION_DEFS: GatheringProfessionDef[] = [
  { id: 'mining', name: 'Mining', icon: '\u26CF\uFE0F', description: 'Extract ores and gems from rock formations.' },
  { id: 'herbalism', name: 'Herbalism', icon: '\uD83C\uDF3F', description: 'Harvest herbs, fibers, and plant materials.' },
  { id: 'skinning', name: 'Skinning', icon: '\uD83E\uDE93', description: 'Skin hides and pelts from slain beasts.' },
  { id: 'logging', name: 'Logging', icon: '\uD83E\uDE93', description: 'Fell trees and collect lumber.' },
  { id: 'fishing', name: 'Fishing', icon: '\uD83C\uDFA3', description: 'Fish and forage from bodies of water.' },
];

/** Milestones unlocked at specific gathering skill levels. */
export const GATHERING_MILESTONES: GatheringMilestone[] = [
  { level: 10, type: 'yield_bonus', value: 0.10, description: '+10% base material yield' },
  { level: 25, type: 'rare_find', value: 0.05, description: '+5% rare material chance' },
  { level: 50, type: 'double_gather', value: 0.10, description: '10% chance for double materials' },
  { level: 75, type: 'yield_bonus', value: 0.25, description: '+25% base material yield' },
  { level: 100, type: 'mastery', value: 0.50, description: 'Gathering mastery: +50% yield, +10% rare find' },
];

/** Minimum gathering skill level required per band. */
export const GATHERING_BAND_REQUIREMENTS: Record<number, number> = {
  1: 1,
  2: 15,
  3: 30,
  4: 50,
  5: 75,
  6: 90,
};

export function getGatheringProfessionDef(id: GatheringProfession): GatheringProfessionDef {
  return GATHERING_PROFESSION_DEFS.find(p => p.id === id) ?? GATHERING_PROFESSION_DEFS[0];
}

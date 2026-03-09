// ============================================================
// Character — classes, resources, character state
// ============================================================

import type { StatKey, ResolvedStats } from './stats';
import type { GearSlot, Item, ArmorType } from './items';

export type CharacterClass = 'warrior' | 'mage' | 'ranger' | 'rogue';

export type ResourceType = 'rage' | 'arcane_charges' | 'tracking' | 'momentum';

export interface ClassDef {
  id: CharacterClass;
  name: string;
  description: string;
  baseStatBonuses: Partial<Record<StatKey, number>>;
  armorAffinity: ArmorType;
  // Resource mechanic config
  resourceType: ResourceType;
  resourceMax: number | null;        // null = uncapped (Rogue)
  resourcePerClear: number;
  resourceDecayRate: number;          // stacks lost per second (0 = no time decay)
  resourceDecayOnZoneSwitch: boolean;
  resourceDecayOnStop: boolean;
  resourceDecayOnGearSwap: boolean;
  resourceDescription: string;        // short player-facing summary
}

export interface ClassResourceState {
  type: ResourceType;
  stacks: number;
  lastZoneId: string | null;          // for Ranger same-zone tracking
}

export interface Character {
  name: string;
  class: CharacterClass;
  level: number;
  xp: number;
  xpToNext: number;
  equipment: Partial<Record<GearSlot, Item>>;
  stats: ResolvedStats;
}

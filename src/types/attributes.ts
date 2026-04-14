// ============================================================
// Attributes — four-axis player stat system
// ============================================================
//
// Design reference: docs/design/CLASS_SYSTEM_PLAN.md §4
//
// Strength   — +3 max life, +0.2% armor, +0.5% melee physical damage per point
// Dexterity  — +2 accuracy, +0.5 evasion, +0.3% attack speed per point
// Intelligence — +3 max mana, +2 energy shield, +0.5% spell damage per point
// Spirit     — +1 chaos resist, +0.5% DoT damage, +0.3% ailment potency per point
//
// Points are earned at 5 per character level and allocated by the player.
// Gear + class starting bonuses contribute to derived totals; allocation is
// tracked separately so respecs only affect the player-spent pool.

export type AttributeKey = 'strength' | 'dexterity' | 'intelligence' | 'spirit';

export interface AttributeAllocation {
  strength: number;
  dexterity: number;
  intelligence: number;
  spirit: number;
}

export interface AttributeState {
  /** Points the player has spent. Does NOT include class baseline or gear. */
  allocated: AttributeAllocation;
  /** Unspent attribute points accumulated from leveling. */
  unallocated: number;
}

export const ATTRIBUTE_POINTS_PER_LEVEL = 5;

export const ZERO_ALLOCATION: AttributeAllocation = {
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  spirit: 0,
};

export function createInitialAttributeState(): AttributeState {
  return { allocated: { ...ZERO_ALLOCATION }, unallocated: 0 };
}

// ============================================================
// Idle Exile — Weapon Type Metadata
// Maps each WeaponType to scaling, speed, handedness, category.
// ============================================================

import type { WeaponType, WeaponScalingType } from '../types';

export interface WeaponTypeMeta {
  scaling: WeaponScalingType;
  speedModifier: number;   // 1.0 = baseline
  handedness: '1h' | '2h';
  category: 'melee' | 'ranged' | 'spell';
}

export const WEAPON_TYPE_META: Record<WeaponType, WeaponTypeMeta> = {
  // 1H Attack — Melee
  sword:      { scaling: 'attack', speedModifier: 1.0,  handedness: '1h', category: 'melee' },
  axe:        { scaling: 'attack', speedModifier: 0.9,  handedness: '1h', category: 'melee' },
  mace:       { scaling: 'attack', speedModifier: 0.85, handedness: '1h', category: 'melee' },

  // 2H Attack — Melee
  greatsword: { scaling: 'attack', speedModifier: 0.7,  handedness: '2h', category: 'melee' },
  greataxe:   { scaling: 'attack', speedModifier: 0.65, handedness: '2h', category: 'melee' },
  maul:       { scaling: 'attack', speedModifier: 0.6,  handedness: '2h', category: 'melee' },

  // 2H Attack — Ranged
  bow:        { scaling: 'attack', speedModifier: 0.85, handedness: '2h', category: 'ranged' },
  crossbow:   { scaling: 'attack', speedModifier: 0.75, handedness: '2h', category: 'ranged' },

  // 1H Hybrid
  dagger:     { scaling: 'hybrid', speedModifier: 1.3,  handedness: '1h', category: 'melee' },
  scepter:    { scaling: 'hybrid', speedModifier: 0.95, handedness: '1h', category: 'melee' },

  // 1H Spell
  wand:       { scaling: 'spell',  speedModifier: 1.1,  handedness: '1h', category: 'spell' },
  gauntlet:   { scaling: 'spell',  speedModifier: 0.9,  handedness: '1h', category: 'spell' },

  // 2H Spell
  staff:      { scaling: 'spell',  speedModifier: 0.8,  handedness: '2h', category: 'spell' },
  tome:       { scaling: 'spell',  speedModifier: 1.0,  handedness: '2h', category: 'spell' },
};

/** Get the scaling type for a weapon. */
export function getWeaponScaling(weaponType: WeaponType): WeaponScalingType {
  return WEAPON_TYPE_META[weaponType].scaling;
}

/** Check if weapon is two-handed. */
export function isTwoHanded(weaponType: WeaponType): boolean {
  return WEAPON_TYPE_META[weaponType].handedness === '2h';
}

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
  /**
   * Multiplier for damage-scaling affix rolls. 1.0 for 1H, 2.0 for 2H.
   * Compensates 2H weapons for the lost offhand slot.
   * Applies only to flat/percent damage affixes; speed/crit/utility unaffected.
   */
  affixScaleMultiplier: number;
}

export const WEAPON_TYPE_META: Record<WeaponType, WeaponTypeMeta> = {
  // 1H Attack — Melee
  sword:      { scaling: 'attack', speedModifier: 1.0,  handedness: '1h', category: 'melee',  affixScaleMultiplier: 1.0 },
  axe:        { scaling: 'attack', speedModifier: 0.9,  handedness: '1h', category: 'melee',  affixScaleMultiplier: 1.0 },
  mace:       { scaling: 'attack', speedModifier: 0.85, handedness: '1h', category: 'melee',  affixScaleMultiplier: 1.0 },
  dagger:     { scaling: 'attack', speedModifier: 1.3,  handedness: '1h', category: 'melee',  affixScaleMultiplier: 1.0 },

  // 2H Attack — Melee
  greatsword: { scaling: 'attack', speedModifier: 0.7,  handedness: '2h', category: 'melee',  affixScaleMultiplier: 2.0 },
  greataxe:   { scaling: 'attack', speedModifier: 0.65, handedness: '2h', category: 'melee',  affixScaleMultiplier: 2.0 },
  maul:       { scaling: 'attack', speedModifier: 0.6,  handedness: '2h', category: 'melee',  affixScaleMultiplier: 2.0 },

  // 2H Attack — Ranged
  bow:        { scaling: 'attack', speedModifier: 0.85, handedness: '2h', category: 'ranged', affixScaleMultiplier: 2.0 },
  crossbow:   { scaling: 'attack', speedModifier: 0.75, handedness: '2h', category: 'ranged', affixScaleMultiplier: 2.0 },

  // 1H Hybrid (cast-melee)
  scepter:    { scaling: 'hybrid', speedModifier: 0.95, handedness: '1h', category: 'melee',  affixScaleMultiplier: 1.0 },

  // 1H Spell
  wand:       { scaling: 'spell',  speedModifier: 1.1,  handedness: '1h', category: 'spell',  affixScaleMultiplier: 1.0 },
  gauntlet:   { scaling: 'spell',  speedModifier: 0.9,  handedness: '1h', category: 'spell',  affixScaleMultiplier: 1.0 },

  // 2H Spell
  staff:      { scaling: 'spell',  speedModifier: 0.8,  handedness: '2h', category: 'spell',  affixScaleMultiplier: 2.0 },
  tome:       { scaling: 'spell',  speedModifier: 1.0,  handedness: '2h', category: 'spell',  affixScaleMultiplier: 2.0 },

  // Profession tool (not used in combat)
  tool:       { scaling: 'attack', speedModifier: 1.0,  handedness: '1h', category: 'melee',  affixScaleMultiplier: 1.0 },
};

/** Get the scaling type for a weapon. */
export function getWeaponScaling(weaponType: WeaponType): WeaponScalingType {
  return WEAPON_TYPE_META[weaponType].scaling;
}

/** Check if weapon is two-handed. */
export function isTwoHanded(weaponType: WeaponType): boolean {
  return WEAPON_TYPE_META[weaponType].handedness === '2h';
}

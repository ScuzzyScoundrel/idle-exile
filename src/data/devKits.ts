// ============================================================
// DEV weapon kits — used by the dev-only weapon picker at
// character creation (ClassPicker) via gameStore.devStartKit.
// Bar orders mirror the shipped sim experiments
// (sim/gambit-ab.ts, sim/qa-variation.ts) so a dev character
// reproduces the exact gated rotations in-game.
// ============================================================

import type { Item, WeaponType } from '../types';
import { ITEM_BASE_DEFS } from './items';
import { generateId } from '../engine/items';

export interface DevWeaponKit {
  weaponType: WeaponType;
  label: string;
  /** iLvl-1 base in ITEM_BASE_DEFS granted as the starter weapon. */
  baseId: string;
  /** Skill bar, in sim bar order. Engine casts the whole bar; slot-unlock gating is UI-only. */
  skills: string[];
  /** Shipped rotation preset id (ROTATION_PRESETS) applied on setup. */
  presetId: string;
}

export const DEV_WEAPON_KITS: DevWeaponKit[] = [
  {
    weaponType: 'dagger', label: 'Dagger', baseId: 'crude_dagger', presetId: 'dagger_tempo',
    skills: ['dagger_stab', 'dagger_chain_strike', 'dagger_blade_dance', 'dagger_viper_strike', 'dagger_assassinate'],
  },
  {
    weaponType: 'bow', label: 'Bow', baseId: 'shortbow', presetId: 'bow_marked_tempo',
    skills: ['bow_arrow_shot', 'bow_rapid_fire', 'bow_hunters_mark', 'bow_burning_arrow', 'bow_tracking_shot', 'bow_snipe'],
  },
  {
    weaponType: 'wand', label: 'Wand', baseId: 'twig_wand', presetId: 'wand_attuned_tempo',
    skills: ['wand_void_blast', 'wand_volley_convergence', 'wand_chain_lightning', 'wand_frostbolt', 'wand_magic_missile', 'wand_essence_drain'],
  },
  {
    weaponType: 'staff', label: 'Staff', baseId: 'gnarled_staff', presetId: 'staff_soul_tempo',
    skills: ['staff_soul_harvest', 'staff_hex', 'staff_haunt', 'staff_locust_swarm', 'staff_spirit_barrage', 'staff_bouncing_skull'],
  },
  {
    weaponType: 'flail', label: 'Flail', baseId: 'rusty_flail', presetId: 'flail_rampage_tempo',
    skills: ['flail_arc_sweep', 'flail_hooked_strike', 'flail_disarming_strike', 'flail_bone_crusher', 'flail_crushing_blow'],
  },
];

export function getDevKit(weaponType: WeaponType): DevWeaponKit | undefined {
  return DEV_WEAPON_KITS.find(k => k.weaponType === weaponType);
}

/** Build a common-rarity starter Item from the kit's base def. */
export function createKitWeapon(kit: DevWeaponKit): Item | null {
  const base = ITEM_BASE_DEFS.find(b => b.id === kit.baseId);
  if (!base) return null;
  return {
    id: generateId(),
    baseId: base.id,
    name: base.name,
    slot: 'mainhand',
    rarity: 'common',
    iLvl: base.iLvl,
    prefixes: [],
    suffixes: [],
    weaponType: base.weaponType,
    baseStats: { ...base.baseStats },
    baseDamageMin: base.baseDamageMin,
    baseDamageMax: base.baseDamageMax,
    baseSpellPower: base.baseSpellPower,
    attributeRequirement: base.attributeRequirement,
  };
}

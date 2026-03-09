// ============================================================
// Sword (Warrior) Archetype Definitions (3 archetypes)
// Each defines a skill bar and graph node allocation paths.
// ============================================================

import type { ArchetypeDef, BranchChoice } from './types';

// Skill prefixes from sword.ts:
// sword_slash:          sl
// sword_double_strike:  ds
// sword_whirlwind:      ww
// sword_flame_slash:    fs
// sword_blade_ward:     bw
// sword_mortal_strike:  ms
// sword_ice_thrust:     it
// sword_blade_fury:     bfu (buff)
// sword_riposte:        ri  (buff)
// sword_keen_edge:      ke  (passive)

const PREFIXES: Record<string, string> = {
  'sword_slash': 'sl',
  'sword_double_strike': 'ds',
  'sword_whirlwind': 'ww',
  'sword_flame_slash': 'fs',
  'sword_blade_ward': 'bw',
  'sword_mortal_strike': 'ms',
  'sword_ice_thrust': 'it',
  'sword_blade_fury': 'bfu',
  'sword_riposte': 'ri',
  'sword_keen_edge': 'ke',
};

/** Get the ordered node IDs for a branch path (start → root → minor → notable → keystone). */
export function getBranchPath(skillId: string, branch: BranchChoice): string[] {
  const p = PREFIXES[skillId];
  if (!p) return [];
  return [
    `${p}_start`,
    `${p}_${branch}_root`,
    `${p}_${branch}_m1`,
    `${p}_${branch}_n1`,
    `${p}_${branch}_k`,
  ];
}

// ─── 3 Warrior Archetype Definitions ─────────────────────

export const ARCHETYPES: ArchetypeDef[] = [
  {
    name: 'Berserker',
    charClass: 'warrior',
    weaponType: 'sword',
    armorAffinity: 'plate',
    // Pure damage: B1 Brutality on all skills for max crit/damage
    skillBar: ['sword_mortal_strike', 'sword_whirlwind', 'sword_double_strike', 'sword_slash'],
    allocations: [
      { skillId: 'sword_mortal_strike', branch: 'b1' },
      { skillId: 'sword_whirlwind',     branch: 'b1' },
      { skillId: 'sword_double_strike', branch: 'b1' },
      { skillId: 'sword_slash',         branch: 'b1' },
    ],
  },
  {
    name: 'Elemental Knight',
    charClass: 'warrior',
    weaponType: 'sword',
    armorAffinity: 'plate',
    // B2 Runeforged: elemental conversion, debuffs, burn/chill/shock
    skillBar: ['sword_flame_slash', 'sword_ice_thrust', 'sword_whirlwind', 'sword_double_strike'],
    allocations: [
      { skillId: 'sword_flame_slash',   branch: 'b2' },
      { skillId: 'sword_ice_thrust',    branch: 'b2' },
      { skillId: 'sword_whirlwind',     branch: 'b2' },
      { skillId: 'sword_double_strike', branch: 'b1' },
    ],
  },
  {
    name: 'Iron Guardian',
    charClass: 'warrior',
    weaponType: 'sword',
    armorAffinity: 'plate',
    // B3 Iron Guard: block, leech, fortify — tanky with sustain
    skillBar: ['sword_blade_ward', 'sword_slash', 'sword_mortal_strike', 'sword_double_strike'],
    allocations: [
      { skillId: 'sword_blade_ward',    branch: 'b3' },
      { skillId: 'sword_slash',         branch: 'b3' },
      { skillId: 'sword_mortal_strike', branch: 'b1' },
      { skillId: 'sword_double_strike', branch: 'b3' },
    ],
  },
];

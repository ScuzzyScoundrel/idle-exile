// ============================================================
// Staff (Mage) Archetype Definitions (3 archetypes)
// Each defines a skill bar and graph node allocation paths.
// ============================================================

import type { ArchetypeDef, BranchChoice } from './types';

// Skill prefixes from staff.ts:
// staff_arcane_bolt:    sab
// staff_spark:          spk
// staff_fireball:       sfb
// staff_ice_shard:      sis
// staff_arcane_shield:  sas
// staff_meteor:         smt
// staff_arcane_blast:   sbl (buff)
// staff_elemental_ward: sew (buff)
// staff_wisdom:         swi (passive)

const PREFIXES: Record<string, string> = {
  'staff_arcane_bolt': 'sab',
  'staff_spark': 'spk',
  'staff_fireball': 'sfb',
  'staff_ice_shard': 'sis',
  'staff_arcane_shield': 'sas',
  'staff_meteor': 'smt',
  'staff_arcane_blast': 'sbl',
  'staff_elemental_ward': 'sew',
  'staff_wisdom': 'swi',
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

// ─── 3 Mage Archetype Definitions ───────────────────────

export const ARCHETYPES: ArchetypeDef[] = [
  {
    name: 'Arcane Blaster',
    charClass: 'mage',
    weaponType: 'staff',
    armorAffinity: 'cloth',
    // B1 Arcane Might: raw spell power + crit
    skillBar: ['staff_meteor', 'staff_arcane_bolt', 'staff_spark', 'staff_fireball'],
    allocations: [
      { skillId: 'staff_meteor',      branch: 'b1' },
      { skillId: 'staff_arcane_bolt', branch: 'b1' },
      { skillId: 'staff_spark',       branch: 'b1' },
      { skillId: 'staff_fireball',    branch: 'b1' },
    ],
  },
  {
    name: 'Elementalist',
    charClass: 'mage',
    weaponType: 'staff',
    armorAffinity: 'cloth',
    // B2 Elemental Mastery: tri-element debuffs (burn/chill/shock)
    skillBar: ['staff_fireball', 'staff_ice_shard', 'staff_spark', 'staff_arcane_bolt'],
    allocations: [
      { skillId: 'staff_fireball',    branch: 'b2' },
      { skillId: 'staff_ice_shard',   branch: 'b2' },
      { skillId: 'staff_spark',       branch: 'b2' },
      { skillId: 'staff_arcane_bolt', branch: 'b1' },
    ],
  },
  {
    name: 'Battle Mage',
    charClass: 'mage',
    weaponType: 'staff',
    armorAffinity: 'cloth',
    // B3 Warding + B1 damage: defensive caster with fortify
    skillBar: ['staff_arcane_shield', 'staff_meteor', 'staff_arcane_bolt', 'staff_spark'],
    allocations: [
      { skillId: 'staff_arcane_shield', branch: 'b3' },
      { skillId: 'staff_meteor',        branch: 'b1' },
      { skillId: 'staff_arcane_bolt',   branch: 'b3' },
      { skillId: 'staff_spark',         branch: 'b1' },
    ],
  },
];

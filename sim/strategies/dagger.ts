// ============================================================
// Dagger Archetype Definitions (7 archetypes)
// Each defines a skill bar and graph node allocation paths.
// ============================================================

import type { ArchetypeDef, BranchChoice } from './types';

// Node ID pattern from treeBuilder.ts: {prefix}_{branch}_{position}
// Full B1 path: {p}_start → {p}_b1_root → {p}_b1_m1 → {p}_b1_n1 → {p}_b1_k
// Full B2 path: {p}_start → {p}_b2_root → {p}_b2_m1 → {p}_b2_n1 → {p}_b2_k
// Full B3 path: {p}_start → {p}_b3_root → {p}_b3_m1 → {p}_b3_n1 → {p}_b3_k
// Bridge nodes: {p}_x12, {p}_x23, {p}_x31

// Skill prefixes from dagger.ts:
// dagger_stab:            st
// dagger_blade_flurry:    dbf
// dagger_fan_of_knives:   fk
// dagger_viper_strike:    vs
// dagger_smoke_screen:    ssc
// dagger_assassinate:     as
// dagger_lightning_lunge: ll
// dagger_flurry (buff):   flu
// dagger_shadow_strike:   sst
// dagger_lethality:       le

const PREFIXES: Record<string, string> = {
  'dagger_stab': 'st',
  'dagger_blade_flurry': 'dbf',
  'dagger_fan_of_knives': 'fk',
  'dagger_viper_strike': 'vs',
  'dagger_smoke_screen': 'ssc',
  'dagger_assassinate': 'as',
  'dagger_lightning_lunge': 'll',
  'dagger_flurry': 'flu',
  'dagger_shadow_strike': 'sst',
  'dagger_lethality': 'le',
};

/** Get the ordered node IDs for a branch path (start → root → minor → notable → keystone). */
export function getBranchPath(skillId: string, branch: BranchChoice): string[] {
  const p = PREFIXES[skillId];
  if (!p) return [];
  const b = branch; // b1, b2, or b3
  return [
    `${p}_start`,
    `${p}_${b}_root`,
    `${p}_${b}_m1`,
    `${p}_${b}_n1`,
    `${p}_${b}_k`,
  ];
}

// ─── 7 Archetype Definitions ─────────────────────────────

export const ARCHETYPES: ArchetypeDef[] = [
  {
    name: 'Poison',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_viper_strike', 'dagger_fan_of_knives', 'dagger_blade_flurry', 'dagger_smoke_screen'],
    allocations: [
      { skillId: 'dagger_viper_strike',    branch: 'b2' },
      { skillId: 'dagger_fan_of_knives',   branch: 'b2' },
      { skillId: 'dagger_blade_flurry',    branch: 'b2' },
      { skillId: 'dagger_smoke_screen',    branch: 'b2' },
    ],
  },
  {
    name: 'Crit Assassin',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_assassinate', 'dagger_blade_flurry', 'dagger_lightning_lunge', 'dagger_stab'],
    allocations: [
      { skillId: 'dagger_assassinate',     branch: 'b1' },
      { skillId: 'dagger_blade_flurry',    branch: 'b1' },
      { skillId: 'dagger_lightning_lunge', branch: 'b1' },
      { skillId: 'dagger_stab',            branch: 'b1' },
    ],
  },
  {
    name: 'Shadow Dodge',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_smoke_screen', 'dagger_viper_strike', 'dagger_fan_of_knives', 'dagger_stab'],
    allocations: [
      { skillId: 'dagger_smoke_screen',    branch: 'b3' },
      { skillId: 'dagger_viper_strike',    branch: 'b3' },
      { skillId: 'dagger_fan_of_knives',   branch: 'b3' },
      { skillId: 'dagger_stab',            branch: 'b3' },
    ],
  },
  {
    name: 'Poison-Crit',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_viper_strike', 'dagger_assassinate', 'dagger_fan_of_knives', 'dagger_blade_flurry'],
    allocations: [
      { skillId: 'dagger_viper_strike',    branch: 'b2' },
      { skillId: 'dagger_assassinate',     branch: 'b1' },
      { skillId: 'dagger_fan_of_knives',   branch: 'b2' },
      { skillId: 'dagger_blade_flurry',    branch: 'b1' },
    ],
  },
  {
    name: 'Poison-Dodge',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_viper_strike', 'dagger_fan_of_knives', 'dagger_smoke_screen', 'dagger_stab'],
    allocations: [
      { skillId: 'dagger_viper_strike',    branch: 'b2' },
      { skillId: 'dagger_fan_of_knives',   branch: 'b2' },
      { skillId: 'dagger_smoke_screen',    branch: 'b3' },
      { skillId: 'dagger_stab',            branch: 'b3' },
    ],
  },
  {
    name: 'Crit-Dodge',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_assassinate', 'dagger_lightning_lunge', 'dagger_smoke_screen', 'dagger_blade_flurry'],
    allocations: [
      { skillId: 'dagger_assassinate',     branch: 'b1' },
      { skillId: 'dagger_lightning_lunge', branch: 'b1' },
      { skillId: 'dagger_smoke_screen',    branch: 'b3' },
      { skillId: 'dagger_blade_flurry',    branch: 'b3' },
    ],
  },
  {
    name: 'Full Hybrid',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_assassinate', 'dagger_viper_strike', 'dagger_smoke_screen', 'dagger_blade_flurry'],
    allocations: [
      { skillId: 'dagger_assassinate',     branch: 'b1' },
      { skillId: 'dagger_viper_strike',    branch: 'b2' },
      { skillId: 'dagger_smoke_screen',    branch: 'b3' },
      // Bridge path for blade flurry: start → x12 (bridge between b1 and b2)
      { skillId: 'dagger_blade_flurry',    branch: 'b1' },
    ],
  },
];

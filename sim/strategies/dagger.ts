// ============================================================
// Dagger Archetype Definitions (6 archetypes)
// 3 pure specs (Assassination/Venomcraft/Shadow Dance) x 2 skill bar variants (AoE/ST)
// All use the talent tree system (not legacy skill graphs).
// ============================================================

import type { ArchetypeDef, BranchChoice } from './types';

// Prefixes only needed for skills that still use the legacy skill graph getBranchPath().
// Daggers use the talent tree system exclusively, so this map only covers
// skills that have both a graph AND a tree. Dead entries removed.
const PREFIXES: Record<string, string> = {
  'dagger_stab': 'st',
  'dagger_blade_flurry': 'dbf',
  'dagger_fan_of_knives': 'fk',
  'dagger_viper_strike': 'vs',
  'dagger_smoke_screen': 'ssc',
  'dagger_assassinate': 'as',
  'dagger_lightning_lunge': 'll',
};

/** Get the ordered node IDs for a branch path (start -> root -> minor -> notable -> keystone). */
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

// ─── 6 Archetype Definitions ─────────────────────────────
// 3 pure specs x 2 skill bar variants (AoE vs Single-Target)
// All skills allocated to the same branch for pure-spec testing.

export const ARCHETYPES: ArchetypeDef[] = [
  // ── Assassination (b1) ──
  {
    name: 'Assassination ST',
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
    name: 'Assassination AoE',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_assassinate', 'dagger_fan_of_knives', 'dagger_blade_flurry', 'dagger_lightning_lunge'],
    allocations: [
      { skillId: 'dagger_assassinate',     branch: 'b1' },
      { skillId: 'dagger_fan_of_knives',   branch: 'b1' },
      { skillId: 'dagger_blade_flurry',    branch: 'b1' },
      { skillId: 'dagger_lightning_lunge', branch: 'b1' },
    ],
  },

  // ── Venomcraft (b2) ──
  {
    name: 'Venomcraft AoE',
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
    name: 'Venomcraft ST',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_viper_strike', 'dagger_blade_flurry', 'dagger_smoke_screen', 'dagger_stab'],
    allocations: [
      { skillId: 'dagger_viper_strike',    branch: 'b2' },
      { skillId: 'dagger_blade_flurry',    branch: 'b2' },
      { skillId: 'dagger_smoke_screen',    branch: 'b2' },
      { skillId: 'dagger_stab',            branch: 'b2' },
    ],
  },

  // ── Shadow Dance (b3) ──
  {
    name: 'Shadow Dance AoE',
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
    name: 'Shadow Dance ST',
    charClass: 'rogue',
    weaponType: 'dagger',
    armorAffinity: 'leather',
    skillBar: ['dagger_smoke_screen', 'dagger_viper_strike', 'dagger_stab', 'dagger_lightning_lunge'],
    allocations: [
      { skillId: 'dagger_smoke_screen',    branch: 'b3' },
      { skillId: 'dagger_viper_strike',    branch: 'b3' },
      { skillId: 'dagger_stab',            branch: 'b3' },
      { skillId: 'dagger_lightning_lunge', branch: 'b3' },
    ],
  },
];

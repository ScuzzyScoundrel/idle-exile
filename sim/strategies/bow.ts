// ============================================================
// Bow (Ranger) Archetype Definitions (3 archetypes)
// Each defines a skill bar and graph node allocation paths.
// ============================================================

import type { ArchetypeDef, BranchChoice } from './types';

// Skill prefixes from bow.ts:
// bow_arrow_shot:    ar
// bow_rapid_fire:    rf
// bow_multi_shot:    mu
// bow_burning_arrow: ba
// bow_smoke_arrow:   sma
// bow_snipe:         sn
// bow_rapid_fire (buff): rfb
// bow_piercing_shot: ps  (buff)
// bow_eagle_eye:     ee  (passive)

const PREFIXES: Record<string, string> = {
  'bow_arrow_shot': 'ar',
  'bow_rapid_fire': 'rf',
  'bow_multi_shot': 'mu',
  'bow_burning_arrow': 'ba',
  'bow_smoke_arrow': 'sma',
  'bow_snipe': 'sn',
  'bow_rapid_fire_buff': 'rfb',
  'bow_piercing_shot': 'ps',
  'bow_eagle_eye': 'ee',
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

// ─── 3 Ranger Archetype Definitions ─────────────────────

export const ARCHETYPES: ArchetypeDef[] = [
  {
    name: 'Sniper',
    charClass: 'ranger',
    weaponType: 'bow',
    armorAffinity: 'leather',
    // B1 Sniper: first-hit, crit, precision
    skillBar: ['bow_snipe', 'bow_arrow_shot', 'bow_rapid_fire', 'bow_multi_shot'],
    allocations: [
      { skillId: 'bow_snipe',       branch: 'b1' },
      { skillId: 'bow_arrow_shot',  branch: 'b1' },
      { skillId: 'bow_rapid_fire',  branch: 'b1' },
      { skillId: 'bow_multi_shot',  branch: 'b1' },
    ],
  },
  {
    name: 'Fire Archer',
    charClass: 'ranger',
    weaponType: 'bow',
    armorAffinity: 'leather',
    // B2 Elemental Arrows: conversion, debuffs, DoT
    skillBar: ['bow_burning_arrow', 'bow_multi_shot', 'bow_rapid_fire', 'bow_arrow_shot'],
    allocations: [
      { skillId: 'bow_burning_arrow', branch: 'b2' },
      { skillId: 'bow_multi_shot',    branch: 'b2' },
      { skillId: 'bow_rapid_fire',    branch: 'b2' },
      { skillId: 'bow_arrow_shot',    branch: 'b1' },
    ],
  },
  {
    name: 'Wind Runner',
    charClass: 'ranger',
    weaponType: 'bow',
    armorAffinity: 'leather',
    // B3 Evasion Mastery: dodge, evasion→damage, defensive mobility
    skillBar: ['bow_smoke_arrow', 'bow_snipe', 'bow_arrow_shot', 'bow_multi_shot'],
    allocations: [
      { skillId: 'bow_smoke_arrow', branch: 'b3' },
      { skillId: 'bow_snipe',       branch: 'b1' },
      { skillId: 'bow_arrow_shot',  branch: 'b3' },
      { skillId: 'bow_multi_shot',  branch: 'b3' },
    ],
  },
];

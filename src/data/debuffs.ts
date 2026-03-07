// ============================================================
// Idle Exile — Debuff Definitions (Debuff Overhaul)
// ============================================================

import type { DebuffDef } from '../types';

export const DEBUFF_DEFS: DebuffDef[] = [
  {
    id: 'bleeding',
    name: 'Bleeding',
    description: 'Each stack snapshots hit damage. 30% of total snapshot triggers when enemy attacks. Max 5 stacks.',
    stackable: true,
    maxStacks: 5,
    dotType: 'snapshot',
    effect: { snapshotPercent: 30 },
  },
  {
    id: 'poisoned',
    name: 'Poisoned',
    description: 'Each stack snapshots hit damage. 15% of total snapshot as chaos DoT per second. Max 10 stacks.',
    stackable: true,
    maxStacks: 10,
    dotType: 'snapshot',
    effect: { snapshotPercent: 15 },
  },
  {
    id: 'burning',
    name: 'Burning',
    description: 'Burns for 2% of enemy max HP per second as fire damage.',
    stackable: false,
    maxStacks: 1,
    dotType: 'percentMaxHp',
    effect: { percentMaxHp: 2 },
  },
  {
    id: 'shocked',
    name: 'Shocked',
    description: 'Enemy has +10% chance to be crit per stack (max 3).',
    stackable: true,
    maxStacks: 3,
    effect: { incCritChanceTaken: 10 },
  },
  {
    id: 'chilled',
    name: 'Chilled',
    description: 'Shatter on Kill: 50% of overkill damage dealt to next enemy as cold damage.',
    stackable: false,
    maxStacks: 1,
    effect: { shatterOverkillPercent: 50 },
  },
  {
    id: 'vulnerable',
    name: 'Vulnerable',
    description: 'Target takes 20% more damage from all sources.',
    stackable: false,
    maxStacks: 1,
    effect: { incDamageTaken: 20 },
  },
  {
    id: 'weakened',
    name: 'Weakened',
    description: 'Target deals 10% less damage.',
    stackable: false,
    maxStacks: 1,
    effect: { reducedDamageDealt: 10 },
  },
  {
    id: 'blinded',
    name: 'Blinded',
    description: 'Target has 20% chance to miss.',
    stackable: false,
    maxStacks: 1,
    effect: { missChance: 20 },
  },
  {
    id: 'cursed',
    name: 'Cursed',
    description: 'Target resists reduced by 15 per stack (max 3).',
    stackable: true,
    maxStacks: 3,
    effect: { reducedResists: 15 },
  },
  {
    id: 'slowed',
    name: 'Slowed',
    description: 'Target attack speed reduced by 20%.',
    stackable: false,
    maxStacks: 1,
    effect: { reducedAttackSpeed: 20 },
  },
  {
    id: 'deathMark',
    name: 'Death Mark',
    description: 'Marked for death. Next hit deals bonus damage and removes the mark.',
    stackable: false,
    maxStacks: 1,
    effect: {},
  },
  {
    id: 'executionersMark',
    name: "Executioner's Mark",
    description: 'Marked for execution. Next hit deals bonus damage and removes the mark.',
    stackable: false,
    maxStacks: 1,
    effect: {},
  },
];

export function getDebuffDef(id: string): DebuffDef | undefined {
  return DEBUFF_DEFS.find(d => d.id === id);
}

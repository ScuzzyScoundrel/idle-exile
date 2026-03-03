// ============================================================
// Idle Exile — Debuff Definitions (Sprint 11B)
// ============================================================

import type { DebuffDef } from '../types';

export const DEBUFF_DEFS: DebuffDef[] = [
  {
    id: 'chilled',
    name: 'Chilled',
    description: 'Target takes 10% more damage.',
    stackable: false,
    maxStacks: 1,
    effect: { incDamageTaken: 10 },
  },
  {
    id: 'shocked',
    name: 'Shocked',
    description: 'Target takes 15% more damage per stack (max 3).',
    stackable: true,
    maxStacks: 3,
    effect: { incDamageTaken: 15 },
  },
  {
    id: 'burning',
    name: 'Burning',
    description: 'Target takes fire damage over time.',
    stackable: false,
    maxStacks: 1,
    effect: { dotDps: 5 },
  },
  {
    id: 'poisoned',
    name: 'Poisoned',
    description: 'Target takes chaos damage over time (stacks up to 10).',
    stackable: true,
    maxStacks: 10,
    effect: { dotDps: 2 },
  },
  {
    id: 'bleeding',
    name: 'Bleeding',
    description: 'Target takes physical damage over time (stacks up to 5).',
    stackable: true,
    maxStacks: 5,
    effect: { dotDps: 8 },
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
    id: 'vulnerable',
    name: 'Vulnerable',
    description: 'Target takes 30% increased critical damage.',
    stackable: false,
    maxStacks: 1,
    effect: { incCritDamageTaken: 30 },
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
];

export function getDebuffDef(id: string): DebuffDef | undefined {
  return DEBUFF_DEFS.find(d => d.id === id);
}

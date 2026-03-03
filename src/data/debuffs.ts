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
];

export function getDebuffDef(id: string): DebuffDef | undefined {
  return DEBUFF_DEFS.find(d => d.id === id);
}

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
    description: 'Each hit creates an independent poison instance. 15% of snapshot as chaos DoT per second. No cap.',
    stackable: true,
    maxStacks: 999,
    dotType: 'snapshot',
    instanceBased: true,
    dotTickInterval: 1.0,
    effect: { snapshotPercent: 15 },
  },
  {
    id: 'burning',
    name: 'Ignite',
    description: 'Burns for 1% of enemy max HP per second per stack. Max 5 stacks.',
    stackable: true,
    maxStacks: 5,
    dotType: 'percentMaxHp',
    effect: { percentMaxHp: 1 },
  },
  {
    id: 'shocked',
    name: 'Shocked',
    description: 'Target takes 8% increased damage per stack (max 3).',
    stackable: true,
    maxStacks: 3,
    effect: { incDamageTaken: 8 },
  },
  {
    id: 'chilled',
    name: 'Chilled',
    description: 'Target attack speed reduced by 20%.',
    stackable: false,
    maxStacks: 1,
    effect: { reducedAttackSpeed: 20 },
  },
  {
    id: 'frostbite',
    name: 'Frostbite',
    description: 'Cold damage over time. Each stack snapshots hit damage; 15% of total snapshot per second. Max 5 stacks.',
    stackable: true,
    maxStacks: 5,
    dotType: 'snapshot',
    effect: { snapshotPercent: 15 },
  },
  // ── Staff v2: skill-native DoTs (element chosen at Lv.5 element transform) ──
  // These replace the generic ELEMENT_AILMENT mapping for DoT skills so the
  // debuff reads as "Locust Swarm (Fire)" etc. and always uses the skill's own
  // dotDamagePercent as the tick rate regardless of element.
  {
    id: 'locust_swarm_dot',
    name: 'Locust Swarm',
    description: 'Swarm damage over time. Each cast refreshes and snapshots current hit damage.',
    stackable: true, maxStacks: 1,
    dotType: 'snapshot',
    effect: { snapshotPercent: 40 },  // matches skill.dotDamagePercent 0.40
  },
  {
    id: 'haunt_dot',
    name: 'Haunt',
    description: 'Spirit damage over time. Each cast refreshes and snapshots current hit damage.',
    stackable: true, maxStacks: 1,
    dotType: 'snapshot',
    effect: { snapshotPercent: 35 },  // matches skill.dotDamagePercent 0.35
  },
  {
    id: 'toads_dot',
    name: 'Plague of Toads',
    description: 'Toad poison damage over time. Each cast refreshes and snapshots current hit damage.',
    stackable: true, maxStacks: 1,
    dotType: 'snapshot',
    effect: { snapshotPercent: 30 },  // matches skill.dotDamagePercent 0.30
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
    id: 'hexed',
    name: 'Hexed',
    description: 'Target deals 20% less damage. Consumed by Soul Harvest for 2× damage.',
    stackable: false,
    maxStacks: 1,
    effect: { reducedDamageDealt: 20 },
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
    id: 'corroded',
    name: 'Corroded',
    description: 'Target takes 20% more damage from all sources.',
    stackable: false,
    maxStacks: 1,
    effect: { incDamageTaken: 20 },
  },
  {
    id: 'plague_link',
    name: 'Plague Link',
    description: 'Linked targets share 15% of damage taken with other linked targets.',
    stackable: false,
    maxStacks: 1,
    effect: { sharedDamagePercent: 15 },
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
  {
    id: 'shatterMark',
    name: 'Shatter Mark',
    description: 'Marked for shattering. Next hit deals bonus damage.',
    stackable: false,
    maxStacks: 1,
    effect: {},
  },
  {
    id: 'cobraMark',
    name: 'Cobra Mark',
    description: 'Marked by the cobra. Next hit deals bonus damage.',
    stackable: false,
    maxStacks: 1,
    effect: {},
  },
  {
    id: 'guillotineMark',
    name: 'Guillotine Mark',
    description: 'Marked for execution. Next hit deals massive bonus damage.',
    stackable: false,
    maxStacks: 1,
    effect: {},
  },
  {
    id: 'thunderousMark',
    name: 'Thunderous Mark',
    description: 'Marked by thunder. Next hit deals bonus lightning damage.',
    stackable: false,
    maxStacks: 1,
    effect: {},
  },
  {
    // Phase 4 sub-phase 5: generic mark target for class-talent
    // dispatcher's TalentTag='mark'. Referenced by Assassin Shadow
    // keystones (Shadow Meld while-mark crit bonus, Umbral
    // Executioner crit-re-mark).
    id: 'marked',
    name: 'Marked',
    description: 'Target takes 15% more damage from all sources.',
    stackable: false,
    maxStacks: 1,
    effect: { incDamageTaken: 15 },
  },
];

export function getDebuffDef(id: string): DebuffDef | undefined {
  return DEBUFF_DEFS.find(d => d.id === id);
}

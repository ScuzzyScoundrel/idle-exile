// ============================================================
// Scythe v1 — Witchdoctor reach + reaper skill definitions (Phase C3)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// MULTI_CLASS_PAIRS.md §1 §3 §4 (WD pair scythe playstyles)
// ============================================================
//
// PARADIGM (locked): Reach + reaper + life-on-kill. Long swings hit
// 2-3 enemies; every kill returns life and sometimes mana. The
// "balanced caster-melee" weapon — sustains you while you bleed.
//
// SIGNATURE INTERACTIONS:
//   • Soul Harvest: kills generate Soul stacks (max 5, used by harvest
//     skills as detonation fuel). Uses existing combo/Soul-stack engine.
//   • Life-on-kill: 3% max HP per kill base (per Phase A balance).
//   • Reach AoE on every swing (1-2 splash targets).
//   • Hexed combo state on direct hit (WD natural).
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Blood Cultist (WD+Asn): scythe_reaping_arc → "Cursed Arc" applies
//     Hexed AoE; Soul stacks count as Crit Stacks for Cascade.
//   - Deathwalker (WD+Brs): scythe_soul_drain → "Blood Drain" — life-on-kill
//     becomes life+mana-on-kill; offsets self-damage cost.
//   - Soul Trapper (WD+Hnt): scythe_reaping_kill (passive) — every scythe
//     kill releases a tracking spirit per Spirit Trap fusion.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const SCYTHE_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Reaping Arc (default basic) ──
  {
    id: 'scythe_reaping_arc',
    name: 'Reaping Arc',
    description: 'Wide horizontal sweep hitting up to 3 enemies. Each kill grants +1 Soul stack (max 5).',
    weaponType: 'scythe',
    tags: ['Attack', 'Melee', 'AoE', 'Chaos'],
    baseDamage: 0,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0.1,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '⚰️',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
    hitCount: 3,
  },
  // ── 2. Soul Drain ──
  {
    id: 'scythe_soul_drain',
    name: 'Soul Drain',
    description: 'Single-target heavy strike. Steal 5% of damage dealt as life. Applies Hexed (4s).',
    weaponType: 'scythe',
    tags: ['Attack', 'Melee', 'Chaos', 'Heavy'],
    baseDamage: 2,
    weaponDamagePercent: 1.3,
    spellPowerRatio: 0.15,
    castTime: 1.2,
    cooldown: 6,
    levelRequired: 2,
    icon: '🩹',
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 0,
  },
  // ── 3. Death Pact ──
  {
    id: 'scythe_death_pact',
    name: 'Death Pact',
    description: 'Sacrifice 10% current HP to deal that amount as bonus chaos damage to a target. Refunds Soul stack on kill (instead of consuming).',
    weaponType: 'scythe',
    tags: ['Attack', 'Spell', 'Chaos', 'Heavy'],
    baseDamage: 5,
    weaponDamagePercent: 0.9,
    spellPowerRatio: 0.5,
    castTime: 1.0,
    cooldown: 8,
    levelRequired: 4,
    icon: '🕯️',
    skillKind: 'cast',
    manaCost: 6,
    baseAilmentChance: 0,
  },
  // ── 4. Mortal Sweep ──
  {
    id: 'scythe_mortal_sweep',
    name: 'Mortal Sweep',
    description: 'AoE swing dealing chaos+physical damage to ALL enemies in encounter. Damage scales +20% per Soul stack.',
    weaponType: 'scythe',
    tags: ['Attack', 'Melee', 'AoE', 'Chaos'],
    baseDamage: 3,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0.3,
    castTime: 1.4,
    cooldown: 12,
    levelRequired: 6,
    icon: '🪦',
    skillKind: 'cast',
    manaCost: 18,
    baseAilmentChance: 30,
  },
  // ── 5. Cursed Reap ──
  {
    id: 'scythe_cursed_reap',
    name: 'Cursed Reap',
    description: 'Sweep that converts physical damage to chaos and applies Hexed AoE (4s). Hits up to 3 enemies.',
    weaponType: 'scythe',
    tags: ['Attack', 'Melee', 'AoE', 'Chaos', 'Curse'],
    baseDamage: 2,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0.2,
    castTime: 1.0,
    cooldown: 9,
    levelRequired: 8,
    icon: '🌑',
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 0,
    baseConversion: { from: 'physical', to: 'chaos', percent: 100 },
    hitCount: 3,
  },
  // ── 6. Harvest Souls ──
  {
    id: 'scythe_harvest_souls',
    name: 'Harvest Souls',
    description: 'Consume up to 5 Soul stacks. Each stack: deal 50% spell power chaos damage to ALL enemies + heal 3% max HP.',
    weaponType: 'scythe',
    tags: ['Spell', 'AoE', 'Chaos', 'Heavy'],
    baseDamage: 0,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 1.0,
    cooldown: 14,
    levelRequired: 10,
    icon: '👻',
    skillKind: 'cast',
    manaCost: 16,
    baseAilmentChance: 0,
  },
  // ── 7. Reaper's Bond ──
  {
    id: 'scythe_reapers_bond',
    name: 'Reaper\'s Bond',
    description: 'Channeled DoT field — pulses chaos damage to ALL enemies in encounter every 0.5s for 4s. Applies Plagued on each pulse.',
    weaponType: 'scythe',
    tags: ['Spell', 'AoE', 'Chaos', 'DoT', 'Channel'],
    baseDamage: 2,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.35,
    castTime: 0.5,
    cooldown: 16,
    levelRequired: 12,
    icon: '☠️',
    skillKind: 'channel',
    channelTickInterval: 0.5,
    manaCost: 20,
    baseAilmentChance: 50,
    hitCount: 8,
  },
  // ── 8. Death's Door ──
  {
    id: 'scythe_deaths_door',
    name: 'Death\'s Door',
    description: 'Heavy single-target strike with execute mechanic — instakills targets below 25% HP. On kill: gain 2 Soul stacks.',
    weaponType: 'scythe',
    tags: ['Attack', 'Melee', 'Heavy'],
    baseDamage: 6,
    weaponDamagePercent: 1.4,
    spellPowerRatio: 0.2,
    castTime: 1.3,
    cooldown: 12,
    levelRequired: 14,
    icon: '⚱️',
    skillKind: 'cast',
    manaCost: 18,
    baseAilmentChance: 0,
  },
  // ── 9. Plague Reaper ──
  {
    id: 'scythe_plague_reaper',
    name: 'Plague Reaper',
    description: 'Channeled AoE — 3 sweeps that progressively widen, each tick applying chaos DoT. Strong vs growing packs.',
    weaponType: 'scythe',
    tags: ['Attack', 'Melee', 'AoE', 'Chaos', 'DoT', 'Channel'],
    baseDamage: 3,
    weaponDamagePercent: 0.55,
    spellPowerRatio: 0.25,
    castTime: 0.6,
    cooldown: 14,
    levelRequired: 16,
    icon: '🌪️',
    skillKind: 'channel',
    channelTickInterval: 0.4,
    manaCost: 18,
    baseAilmentChance: 40,
    hitCount: 3,
    dotDuration: 4,
    dotDamagePercent: 0.25,
  },
  // ── 10. Soul Reaper (capstone) ──
  {
    id: 'scythe_soul_reaper',
    name: 'Soul Reaper',
    description: 'Massive AoE sweep dealing chaos damage to ALL enemies. Each Soul stack consumed = +1 enemy execute roll (instakill < 50% HP).',
    weaponType: 'scythe',
    tags: ['Attack', 'AoE', 'Chaos', 'Heavy'],
    baseDamage: 6,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0.4,
    castTime: 1.6,
    cooldown: 24,
    levelRequired: 22,
    icon: '💀',
    skillKind: 'cast',
    manaCost: 30,
    baseAilmentChance: 0,
  },
];

export const SCYTHE_ABILITIES: AbilityDef[] = [
  // Passive: Reaping Kill
  {
    id: 'scythe_reaping_kill',
    name: 'Reaping Kill',
    description: 'Every scythe kill restores 3% max HP and 2 mana. Soul stack generated on kill.',
    weaponType: 'scythe',
    kind: 'passive',
    icon: '🌿',
    cooldown: 0,
    effect: {},
  },
  // Passive: Long Reach
  {
    id: 'scythe_long_reach',
    name: 'Long Reach',
    description: 'All scythe attacks splash 30% damage to up to 2 additional enemies in encounter. +5% chaos damage with scythe equipped.',
    weaponType: 'scythe',
    kind: 'passive',
    icon: '📏',
    cooldown: 0,
    effect: {},
  },
  // Passive: Soul Tether
  {
    id: 'scythe_soul_tether',
    name: 'Soul Tether',
    description: 'While at full Soul stacks (5/5), gain +15% chaos damage and +10% cast speed. Soul Reap-style skills cost 25% less mana.',
    weaponType: 'scythe',
    kind: 'passive',
    icon: '🔗',
    cooldown: 0,
    effect: {},
  },
];

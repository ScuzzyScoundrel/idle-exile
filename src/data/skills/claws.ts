// ============================================================
// Claws v1 — Berserker / Assassin shared skill definitions (Phase C3)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// MULTI_CLASS_PAIRS.md §6 (Dark Reaver — canonical pair weapon)
// ============================================================
//
// PARADIGM (locked): Dual-grip bleed + attack-speed compounding. Fast
// per-hit cadence, lower per-strike damage. Bleed builds passively;
// attack speed scales with consecutive hits. The "tick-storm" weapon.
//
// SIGNATURE INTERACTIONS:
//   • Bleed-on-hit base 30% chance (per Phase A baseAilmentChance schema).
//   • Frenzy stacks: each hit adds +1 stack (max 5), each stack +5%
//     attack speed for 3s. Decays on no-hit window.
//   • Crit-feeds-Cascade: Asn natural — every claws crit increments
//     Cascade per existing combat/combo.ts machinery.
//   • Bloodied combo state on direct hit (Brs natural).
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Dark Reaver (Asn+Brs): canonical claws pair — bleed-tick crits feed
//     Cascade past cap below 50% HP per Frenzied Cascade fusion.
//   - Deathwalker (WD+Brs): claws_dual_strike → "Plagued Strike" applies
//     Plagued + bleed; bleed ticks count toward Pandemic.
//   - Spellreaver (Sor+Brs): claws_frenzy_strike → "Element Frenzy"
//     applies element-of-current-Resonance per hit.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const CLAWS_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Dual Strike (default basic) ──
  {
    id: 'claws_dual_strike',
    name: 'Dual Strike',
    description: 'Two rapid claw strikes. Both hits roll independently for crit and bleed. Builds Frenzy stack on each hit.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 0.55,
    spellPowerRatio: 0,
    castTime: 0.7,
    cooldown: 2,
    levelRequired: 1,
    icon: '🐾',
    skillKind: 'instant',
    recoveryTime: 0.3,
    manaCost: 5,
    baseAilmentChance: 30,
    hitCount: 2,
  },
  // ── 2. Rending Slash ──
  {
    id: 'claws_rending_slash',
    name: 'Rending Slash',
    description: 'Tearing blow that deepens existing bleed stacks (+50% remaining bleed damage). Pure bleed-amp single-target.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'DoT'],
    baseDamage: 1,
    weaponDamagePercent: 0.9,
    spellPowerRatio: 0,
    castTime: 0.8,
    cooldown: 4,
    levelRequired: 2,
    icon: '🩸',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 100,
  },
  // ── 3. Frenzy Strike ──
  {
    id: 'claws_frenzy_strike',
    name: 'Frenzy Strike',
    description: 'Single hit that consumes ALL Frenzy stacks. Damage scales +30% per consumed stack (max +150%).',
    weaponType: 'claws',
    tags: ['Attack', 'Melee'],
    baseDamage: 2,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 0.9,
    cooldown: 6,
    levelRequired: 4,
    icon: '🔥',
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 0,
  },
  // ── 4. Pounce ──
  {
    id: 'claws_pounce',
    name: 'Pounce',
    description: 'Leaping attack that bypasses 25% target armor. Crit on opener (next-hit only) is guaranteed.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee'],
    baseDamage: 3,
    weaponDamagePercent: 1.1,
    spellPowerRatio: 0,
    castTime: 0.8,
    cooldown: 8,
    levelRequired: 6,
    icon: '🐅',
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 30,
  },
  // ── 5. Bleeding Edge ──
  {
    id: 'claws_bleeding_edge',
    name: 'Bleeding Edge',
    description: 'Channeled three-tick attack — each tick has 50% chance to apply a Bleed stack. Strong vs single high-HP targets.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'DoT', 'Channel'],
    baseDamage: 2,
    weaponDamagePercent: 0.4,
    spellPowerRatio: 0,
    castTime: 0.5,
    cooldown: 6,
    levelRequired: 8,
    icon: '🌊',
    skillKind: 'channel',
    channelTickInterval: 0.3,
    manaCost: 12,
    baseAilmentChance: 50,
    hitCount: 3,
  },
  // ── 6. Razor Wind ──
  {
    id: 'claws_razor_wind',
    name: 'Razor Wind',
    description: 'AoE flurry hitting up to 3 enemies in encounter. Each enemy hit applies Bleed (1 stack, 4s).',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'AoE', 'DoT'],
    baseDamage: 3,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 9,
    levelRequired: 10,
    icon: '💨',
    skillKind: 'cast',
    manaCost: 16,
    baseAilmentChance: 100,
    hitCount: 3,
  },
  // ── 7. Hemorrhage ──
  {
    id: 'claws_hemorrhage',
    name: 'Hemorrhage',
    description: 'Heavy single-target bleed-detonation. Consumes ALL Bleed stacks on target, dealing +30% per stack as instant damage.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'Heavy'],
    baseDamage: 2,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 12,
    levelRequired: 12,
    icon: '💉',
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 0,
  },
  // ── 8. Predator's Mark ──
  {
    id: 'claws_predator_mark',
    name: 'Predator\'s Mark',
    description: 'Mark a target (5s). Your next attack against the marked target gains +50% crit chance and applies +2 Bleed stacks.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'Utility'],
    baseDamage: 1,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0,
    castTime: 0.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '👁️',
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 0,
  },
  // ── 9. Crimson Tempest ──
  {
    id: 'claws_crimson_tempest',
    name: 'Crimson Tempest',
    description: 'AoE bleed-bomb hitting ALL enemies in encounter. Each hit guaranteed Bleed (2 stacks). Strong pack-clear.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'AoE', 'DoT'],
    baseDamage: 4,
    weaponDamagePercent: 0.65,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 15,
    levelRequired: 18,
    icon: '🩸',
    skillKind: 'cast',
    manaCost: 22,
    baseAilmentChance: 100,
  },
  // ── 10. Death by 1000 Cuts ──
  {
    id: 'claws_thousand_cuts',
    name: 'Death by 1000 Cuts',
    description: 'Channeled barrage — 6 ticks at 0.2s interval, each tick rolls bleed independently. Heavy bleed-stack stacker against bosses.',
    weaponType: 'claws',
    tags: ['Attack', 'Melee', 'DoT', 'Channel'],
    baseDamage: 3,
    weaponDamagePercent: 0.3,
    spellPowerRatio: 0,
    castTime: 0.5,
    cooldown: 20,
    levelRequired: 22,
    icon: '⚔️',
    skillKind: 'channel',
    channelTickInterval: 0.2,
    manaCost: 24,
    baseAilmentChance: 60,
    hitCount: 6,
  },
];

export const CLAWS_ABILITIES: AbilityDef[] = [
  // Passive: Frenzy Stacks
  {
    id: 'claws_frenzy_stacks',
    name: 'Frenzy',
    description: 'Each claws hit adds +1 Frenzy stack (max 5, decays after 3s without a hit). Each stack: +5% attack speed.',
    weaponType: 'claws',
    kind: 'passive',
    icon: '⚡',
    cooldown: 0,
    effect: {},
  },
  // Passive: Twin Fangs
  {
    id: 'claws_twin_fangs',
    name: 'Twin Fangs',
    description: 'Wielding claws grants +10% attack speed and +5% crit chance. Bleed stacks tick 25% faster.',
    weaponType: 'claws',
    kind: 'passive',
    icon: '🐺',
    cooldown: 0,
    effect: {},
  },
  // Passive: Predator's Instinct
  {
    id: 'claws_predator_instinct',
    name: 'Predator\'s Instinct',
    description: 'On bleed-tick crit: refund 1% mana per stack consumed. Below 50% HP, all claws crits become guaranteed Bleed-applies.',
    weaponType: 'claws',
    kind: 'passive',
    icon: '🌙',
    cooldown: 0,
    effect: {},
  },
];

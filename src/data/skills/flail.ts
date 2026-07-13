// ============================================================
// Flail v1 — Berserker AoE skill definitions (Phase C3)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// MULTI_CLASS_PAIRS.md §3 (Deathwalker), §8 (Spellreaver), §10 (Warden)
// ============================================================
//
// PARADIGM (locked): AoE-cleave + disarm/stun. Slower per-hit cadence
// than greatsword, but every swing is wide. Marked-for-cleave combo
// state lets follow-up skills hit ALL marked enemies in encounter.
//
// SIGNATURE INTERACTIONS:
//   • Cleave AoE every swing (2-4 enemy splash from main hit).
//   • Bloodied combo state on direct hit (Brs class signature).
//   • Disarm = enemy attack speed -25% for 3s. Stun = enemy can't act 1s.
//   • Marked-for-cleave: AoE skills become single-target +50% on Marked
//     targets (cross-pair payoff for Warden Trap-Execute fusion).
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Deathwalker (WD+Brs): flail_arc_sweep → "Cursed Sweep" applies
//     Hexed AoE; flail_executioner → "Reaping Swing" applies Bloodied AoE.
//   - Spellreaver (Sor+Brs): flail_arc_sweep → "Element Cleave" gains
//     element of current top Resonance charge.
//   - Warden (Brs+Hnt): flail_arc_sweep → "Trap Sweep" arms a delayed
//     trap at impact site.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const FLAIL_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Arc Sweep (default basic) ──
  {
    id: 'flail_arc_sweep',
    name: 'Arc Sweep',
    description: 'Wide horizontal sweep hitting up to 3 enemies. The signature flail opener — AoE every cast.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee', 'AoE'],
    baseDamage: 0,
    weaponDamagePercent: 1.403,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '🔗',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
    hitCount: 3,
  },
  // ── 2. Crushing Blow (single-target heavy) ──
  {
    id: 'flail_crushing_blow',
    name: 'Crushing Blow',
    description: 'Slam the spiked head down on a single target for high single-hit damage. Crit chance to apply Stun (1s).',
    weaponType: 'flail',
    tags: ['Attack', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 2.421,
    spellPowerRatio: 0,
    castTime: 1.4,
    cooldown: 6,
    levelRequired: 2,
    icon: '🔨',
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 0,
  },
  // ── 3. Disarming Strike ──
  {
    id: 'flail_disarming_strike',
    name: 'Disarming Strike',
    description: 'Targeted hit that wraps the chain around the enemy weapon. Applies Disarmed (3s) — enemy attack speed -25%.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee', 'Utility'],
    baseDamage: 2.549,
    weaponDamagePercent: 1.403,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 8,
    levelRequired: 4,
    icon: '⚙️',
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 75,
  },
  // ── 4. Whirlwind Chain ──
  {
    id: 'flail_whirlwind_chain',
    name: 'Whirlwind Chain',
    description: 'Spin in place hitting ALL enemies in encounter for 3 ticks. Channeled — releases on tick interval.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee', 'AoE', 'Channel'],
    baseDamage: 3.823,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 10,
    levelRequired: 6,
    icon: '🌀',
    skillKind: 'channel',
    channelTickInterval: 0.4,
    manaCost: 18,
    baseAilmentChance: 0,
    hitCount: 3,
  },
  // ── 5. Marked for Cleave ──
  {
    id: 'flail_marked_for_cleave',
    name: 'Marked for Cleave',
    description: 'Mark all enemies in encounter (4s). Your next AoE skill deals +50% damage to Marked targets.',
    weaponType: 'flail',
    tags: ['Attack', 'AoE', 'Utility'],
    baseDamage: 1.274,
    weaponDamagePercent: 0.51,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 12,
    levelRequired: 8,
    icon: '🎯',
    skillKind: 'cast',
    manaCost: 16,
    baseAilmentChance: 0,
  },
  // ── 6. Bone Crusher ──
  {
    id: 'flail_bone_crusher',
    name: 'Bone Crusher',
    description: 'Heavy blow that ignores 30% armor. On hit, apply Sundered (5s) — target takes +15% physical damage.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee'],
    baseDamage: 5.097,
    weaponDamagePercent: 1.848,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 7,
    levelRequired: 10,
    icon: '🦴',
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 50,
  },
  // ── 7. Concussive Slam ──
  {
    id: 'flail_concussive_slam',
    name: 'Concussive Slam',
    description: 'AoE slam with Stun on direct hit (1.5s) and Dazed (2s) on splash targets.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee', 'AoE', 'Utility'],
    baseDamage: 3.823,
    weaponDamagePercent: 1.147,
    spellPowerRatio: 0,
    castTime: 1.5,
    cooldown: 14,
    levelRequired: 12,
    icon: '💥',
    skillKind: 'cast',
    manaCost: 22,
    baseAilmentChance: 30,
    hitCount: 3,
  },
  // ── 8. Hooked Strike ──
  {
    id: 'flail_hooked_strike',
    name: 'Hooked Strike',
    description: 'Pull the front enemy forward, dealing damage and applying Bloodied (per class signature). Acts as a single-target reset for AoE skills.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee'],
    baseDamage: 2.549,
    weaponDamagePercent: 1.784,
    spellPowerRatio: 0,
    castTime: 0.9,
    cooldown: 5,
    levelRequired: 14,
    icon: '🪝',
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 35,
  },
  // ── 9. Reaping Swing (heavy AoE payoff) ──
  {
    id: 'flail_reaping_swing',
    name: 'Reaping Swing',
    description: 'Devastating wide swing that hits ALL enemies in encounter. Damage scales +25% per Bloodied target hit.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee', 'AoE'],
    baseDamage: 6.373,
    weaponDamagePercent: 1.274,
    spellPowerRatio: 0,
    castTime: 1.6,
    cooldown: 18,
    levelRequired: 18,
    icon: '☠️',
    skillKind: 'cast',
    manaCost: 28,
    baseAilmentChance: 0,
  },
  // ── 10. Executioner (low-HP execute) ──
  {
    id: 'flail_executioner',
    name: 'Executioner',
    description: 'Single-target hit with execute mechanic — instakills targets below 20% HP. Cooldown resets on kill.',
    weaponType: 'flail',
    tags: ['Attack', 'Melee', 'Heavy'],
    baseDamage: 7.647,
    weaponDamagePercent: 1.656,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 15,
    levelRequired: 22,
    icon: '⚰️',
    skillKind: 'cast',
    manaCost: 20,
    baseAilmentChance: 0,
  },
];

export const FLAIL_ABILITIES: AbilityDef[] = [
  // Passive: Cleave-Always
  {
    id: 'flail_cleave_always',
    name: 'Always Cleaving',
    description: 'All flail attacks splash 25% damage to up to 2 additional enemies in encounter.',
    weaponType: 'flail',
    kind: 'passive',
    icon: '🪓',
    cooldown: 0,
    effect: {},
  },
  // Passive: Brutal Momentum
  {
    id: 'flail_brutal_momentum',
    name: 'Brutal Momentum',
    description: 'Each consecutive flail hit on the same target adds +5% damage (max 25%, resets after 3s without a hit).',
    weaponType: 'flail',
    kind: 'passive',
    icon: '⛓️',
    cooldown: 0,
    effect: {},
  },
  // Passive: Crushing Stance (defensive)
  {
    id: 'flail_crushing_stance',
    name: 'Crushing Stance',
    description: 'While wielding a flail, gain +10% physical damage and +5% armor. Stunned/Disarmed enemies take +20% damage from you.',
    weaponType: 'flail',
    kind: 'passive',
    icon: '🛡️',
    cooldown: 0,
    effect: {},
  },
];

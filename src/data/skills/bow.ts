// ============================================================
// Bow v2 — Hunter primary skill definitions (Phase C3 cleanup + expansion)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// CLASS_FANTASY_BRIEFS.md §5 (Hunter — Mark & Execute signature);
// MULTI_CLASS_PAIRS.md §4 §7 §9 §10 (Soul Trapper, Nightstalker,
// Arcane Archer, Warden — bow-canonical pair builds)
// ============================================================
//
// PARADIGM (locked): Setup-and-execute precision projectile. Mark a
// target → next shot is empowered (Hunter signature). Traps + Marks
// are the engine; basic shots are sustain.
//
// SIGNATURE INTERACTIONS:
//   • Hunter's Mark: combo state on first hit (8s base). Next hit on
//     Marked target +30% crit chance and gains Precision Payoff (+150%
//     damage on crit).
//   • Bear Trap: armed for 6s, detonates on first enemy contact, applies
//     Snared (3s, attack speed -50%).
//   • Pierce: line shots can hit multiple targets in encounter.
//   • Stealth: out-of-combat first shot guaranteed crit.
//
// PHASE C3 CLEANUP (2026-05-04):
//   • bow_multi_shot → bow_ice_barrage (id matches "Ice Barrage" name)
//   • bow_smoke_arrow → bow_shock_arrow (id matches "Shock Arrow" name)
//   • bow_rapid_fire ID conflict (active + ability) is handled by the
//     CONFLICTING_ABILITY_IDS rename in skills/index.ts; the ability
//     becomes `bow_rapid_fire_buff` at registry time.
//   • Save migration: ABILITY_ID_MIGRATION entries in skills/index.ts.
//   • Pool grew from 6 → 10 actives by adding 4 Hunter-signature skills:
//     Hunter's Mark, Bear Trap, Pierce Volley, Tracking Shot.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const BOW_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Arrow Shot (default basic) ──
  {
    id: 'bow_arrow_shot',
    name: 'Arrow Shot',
    skillKind: 'cast',
    manaCost: 4,
    baseAilmentChance: 0,
    description: 'A basic arrow shot. Builds 1 Quiver. Crits vs Marked targets open a Vulnerable window (3s).',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '🏹',
  },
  // ── 2. Rapid Fire ──
  {
    id: 'bow_rapid_fire',
    name: 'Rapid Fire',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
    description: 'Loose 3 arrows in quick succession. Builds 3 Quiver (gains past 6 are wasted). Crits vs Marked targets open a Vulnerable window.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0,
    castTime: 0.7,
    cooldown: 6,
    levelRequired: 4,
    icon: '🏹',
    hitCount: 3,
  },
  // ── 3. Burning Arrow ──
  {
    id: 'bow_burning_arrow',
    name: 'Burning Arrow',
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 25,
    description: 'Ignite an arrow tip, adding fire damage and chance to apply Ignite.',
    weaponType: 'bow',
    tags: ['Attack', 'Fire', 'Projectile'],
    baseDamage: 4,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 6,
    icon: '🔥',
    baseConversion: { from: 'physical', to: 'fire', percent: 65 },
  },
  // ── 4. Ice Barrage (renamed from bow_multi_shot) ──
  {
    id: 'bow_ice_barrage',
    name: 'Ice Barrage',
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 30,
    description: 'Fire a volley of frost-tipped arrows in a wide spread. Hits up to 3 enemies.',
    weaponType: 'bow',
    tags: ['Attack', 'Cold', 'Projectile', 'AoE'],
    baseDamage: 4,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '❄️',
    baseConversion: { from: 'physical', to: 'cold', percent: 65 },
    hitCount: 3,
  },
  // ── 5. Shock Arrow (renamed from bow_smoke_arrow) ──
  {
    id: 'bow_shock_arrow',
    name: 'Shock Arrow',
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 25,
    description: 'Fire a crackling arrow charged with lightning. Chains to 1 nearby enemy.',
    weaponType: 'bow',
    tags: ['Attack', 'Lightning', 'Projectile', 'Chain'],
    baseDamage: 3,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '⚡',
    baseConversion: { from: 'physical', to: 'lightning', percent: 65 },
    chainCount: 1,
  },
  // ── 6. Snipe ──
  {
    id: 'bow_snipe',
    name: 'Snipe',
    skillKind: 'cast',
    manaCost: 25,
    baseAilmentChance: 0,
    description: 'The spender. Consumes ALL Quiver: +30% damage per stack; PERFECT at 6 stacks (×2.5, guaranteed crit, advances other cooldowns 1s). Inside a Vulnerable window: ×2 and refunds 2 Quiver.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 8,
    weaponDamagePercent: 1.35,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 6,
    levelRequired: 14,
    icon: '🎯',
  },
  // ── 7. Hunter's Mark (NEW — pair fusion enabler) ──
  {
    id: 'bow_hunters_mark',
    name: 'Hunter\'s Mark',
    skillKind: 'cast',
    manaCost: 6,
    baseAilmentChance: 0,
    description: 'Mark a target for 8s. Marked targets grant +30% crit chance to your next attack and take +25% damage from you.',
    // Effect IR Wave 4: first data-authored skill mechanic — the mark
    // applies via the 'marked' DebuffDef (currently +15% damage taken;
    // reconciling the prose numbers is content-overhaul work).
    effects: [
      { kind: 'on', on: { trigger: { on: 'hit' }, actions: [{ kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 }] } },
    ],
    weaponType: 'bow',
    tags: ['Attack', 'Utility', 'Projectile'],
    baseDamage: 1,
    weaponDamagePercent: 0.4,
    spellPowerRatio: 0,
    castTime: 0.6,
    cooldown: 6,
    levelRequired: 4,
    icon: '👁️',
  },
  // ── 8. Bear Trap (NEW — pair fusion enabler) ──
  {
    id: 'bow_bear_trap',
    name: 'Bear Trap',
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 100,
    description: 'Set a trap (armed 6s). First enemy to engage is Snared (3s, attack speed -50%) and takes physical damage.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Utility', 'Trap'],
    baseDamage: 5,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 0.8,
    cooldown: 12,
    levelRequired: 8,
    icon: '🪤',
  },
  // ── 9. Pierce Volley (NEW — Arcane Archer canonical) ──
  {
    id: 'bow_pierce_volley',
    name: 'Pierce Volley',
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 0,
    description: 'Single arrow that pierces all enemies in a line. Damage scales +20% per pierced target.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile', 'Heavy'],
    baseDamage: 4,
    weaponDamagePercent: 1.1,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 7,
    levelRequired: 12,
    icon: '➡️',
  },
  // ── 10. Tracking Shot (NEW — Mark+Spirit pair payoff) ──
  {
    id: 'bow_tracking_shot',
    name: 'Tracking Shot',
    skillKind: 'cast',
    manaCost: 18,
    baseAilmentChance: 0,
    description: 'Homing shot that automatically targets the lowest-HP Marked enemy. +100% damage if target is below 50% HP (execute synergy).',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile', 'Heavy'],
    baseDamage: 6,
    weaponDamagePercent: 1.4,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 9,
    levelRequired: 16,
    icon: '🏹',
  },
];

export const BOW_ABILITIES: AbilityDef[] = [
  {
    id: 'bow_rapid_fire', name: 'Rapid Fire', description: '2x attack speed for 15s.',
    weaponType: 'bow', kind: 'buff', icon: '🏹',
    duration: 15, cooldown: 60,
    effect: { attackSpeedMult: 2.0 },
  },
  {
    id: 'bow_piercing_shot', name: 'Piercing Shot', description: 'Ignore hazards for 12s.',
    weaponType: 'bow', kind: 'buff', icon: '➡️',
    duration: 12, cooldown: 75,
    effect: { ignoreHazards: true },
  },
  {
    id: 'bow_eagle_eye', name: 'Eagle Eye', description: '+10% item drops (passive).',
    weaponType: 'bow', kind: 'passive', icon: '🦅',
    effect: { itemDropMult: 1.1 },
  },
];

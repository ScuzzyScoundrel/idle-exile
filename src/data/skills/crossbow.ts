// ============================================================
// Crossbow v2 — Hunter heavy bolt skill definitions (Phase C3 step 2)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// CLASS_FANTASY_BRIEFS.md §5 (Hunter); MULTI_CLASS_PAIRS.md §4 (Soul
// Trapper), §7 (Nightstalker), §9 (Arcane Archer), §10 (Warden)
// ============================================================
//
// PARADIGM (locked): Heavy 2H ranged attack. Slower fire rate than bow,
// but each bolt hits harder + pierces. Trap-and-execute synergy is
// natural — set traps, slow targets, snipe with massive bolts.
//
// SIGNATURE INTERACTIONS:
//   • Heavier bolts pierce 1 target by default (line damage).
//   • Hunter's Mark application: Marked targets take +25% damage from
//     crossbow bolts (Hnt natural).
//   • Trap synergy (Warden fusion): trap-snared targets take +50% damage
//     from crossbow bolts.
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Soul Trapper (WD+Hnt): crossbow_explosive_bolt → "Spirit Bolt"
//     applies Hexed AoE on detonation (replaces fire conversion).
//   - Nightstalker (Asn+Hnt): crossbow_siege_shot → "Cascade Bolt" — slow
//     ROF means each crit carries 8+ Cascade stacks.
//   - Arcane Archer (Sor+Hnt): crossbow_convergence_bolt (NEW) — at 4
//     Resonance charges, single overwhelming multi-element bolt.
//   - Warden (Brs+Hnt): crossbow_resonant_trap (NEW) — trap detonation
//     applies Bloodied (Brs combo state) to all hit + element-Mark.
//
// PHASE C3 STEP 2 (2026-05-04):
//   - Extracted from src/data/skills/secondary.ts (was 6 actives + 3
//     abilities pre-audit). Phase A schema fields added.
//   - Pool grew 6 → 10 actives by adding pair-fusion enablers:
//     Convergence Bolt, Resonant Trap, Heavy Mark, Pierce Bolt.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const CROSSBOW_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Bolt Shot (default basic) ──
  {
    id: 'crossbow_bolt_shot',
    name: 'Bolt Shot',
    description: 'A basic crossbow bolt. Pierces 1 target (line damage).',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '🏹',
    skillKind: 'cast',
    manaCost: 6,
    baseAilmentChance: 0,
  },
  // ── 2. Burst Fire ──
  {
    id: 'crossbow_burst_fire',
    name: 'Burst Fire',
    description: 'Fire two bolts in rapid succession. Each rolls crit independently — Cascade feed.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 0.55,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 4,
    levelRequired: 4,
    icon: '🏹',
    hitCount: 2,
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 0,
  },
  // ── 3. Explosive Bolt ──
  {
    id: 'crossbow_explosive_bolt',
    name: 'Explosive Bolt',
    description: 'Fire an explosive bolt that detonates on impact. AoE fire damage with Ignite chance.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Fire', 'Projectile', 'AoE'],
    baseDamage: 8,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '💥',
    baseConversion: { from: 'physical', to: 'fire', percent: 65 },
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 35,
  },
  // ── 4. Frost Bolt ──
  {
    id: 'crossbow_frost_bolt',
    name: 'Frost Bolt',
    description: 'A freezing bolt that chills enemies. Chill snare slows attack speed.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Cold', 'Projectile'],
    baseDamage: 3,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 6,
    icon: '❄️',
    baseConversion: { from: 'physical', to: 'cold', percent: 65 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 50,
  },
  // ── 5. Shock Net ──
  {
    id: 'crossbow_net_shot',
    name: 'Shock Net',
    description: 'Fire an electrified net that shocks enemies on contact. Shocked targets take +20% damage from all sources.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Lightning', 'Projectile'],
    baseDamage: 2,
    weaponDamagePercent: 0.65,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '⚡',
    baseConversion: { from: 'physical', to: 'lightning', percent: 65 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 50,
  },
  // ── 6. Siege Shot (heavy single-target payoff) ──
  {
    id: 'crossbow_siege_shot',
    name: 'Siege Shot',
    description: 'A heavy armor-piercing bolt with massive impact. Ignores 50% target armor. +50% crit chance vs Marked targets.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile', 'Heavy'],
    baseDamage: 15,
    weaponDamagePercent: 2.1,
    spellPowerRatio: 0,
    castTime: 1.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '🏹',
    skillKind: 'cast',
    manaCost: 24,
    baseAilmentChance: 0,
  },
  // ── 7. Convergence Bolt (NEW — Arcane Archer fusion) ──
  {
    id: 'crossbow_convergence_bolt',
    name: 'Convergence Bolt',
    description: 'At 4+ Resonance charges, single overwhelming multi-element bolt. Applies all 4 ailments + 4-bucket damage. Single high-impact target. Consumes all charges.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Projectile', 'Heavy'],
    baseDamage: 10,
    weaponDamagePercent: 1.8,
    spellPowerRatio: 0.4,
    castTime: 1.6,
    cooldown: 16,
    levelRequired: 16,
    icon: '🌠',
    skillKind: 'cast',
    manaCost: 22,
    baseAilmentChance: 100,
  },
  // ── 8. Resonant Trap (NEW — Warden fusion) ──
  {
    id: 'crossbow_resonant_trap',
    name: 'Resonant Trap',
    description: 'Set a trap (armed 8s). On detonation: applies Snared (3s, attack speed -50%) + Hunter\'s Mark to all hit. Adds 1 Resonance charge of element matching trap type.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Trap', 'Utility'],
    baseDamage: 6,
    weaponDamagePercent: 1.2,
    spellPowerRatio: 0,
    castTime: 0.9,
    cooldown: 14,
    levelRequired: 10,
    icon: '🪤',
    skillKind: 'cast',
    manaCost: 16,
    baseAilmentChance: 100,
  },
  // ── 9. Heavy Mark Bolt (NEW — Nightstalker pair) ──
  {
    id: 'crossbow_heavy_mark',
    name: 'Heavy Mark Bolt',
    description: 'Heavy bolt that applies Hunter\'s Mark on impact (10s, longer than basic). Marked targets take +35% damage from crossbow bolts.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile', 'Utility'],
    baseDamage: 4,
    weaponDamagePercent: 1.2,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 7,
    levelRequired: 6,
    icon: '🎯',
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 0,
  },
  // ── 10. Pierce Bolt (NEW — Arcane Archer pair) ──
  {
    id: 'crossbow_pierce_bolt',
    name: 'Pierce Bolt',
    description: 'Heavy bolt that pierces ALL enemies in a line. Each pierced target adds +25% damage to subsequent hits.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile', 'Heavy'],
    baseDamage: 5,
    weaponDamagePercent: 1.4,
    spellPowerRatio: 0,
    castTime: 1.4,
    cooldown: 9,
    levelRequired: 12,
    icon: '➡️',
    skillKind: 'cast',
    manaCost: 16,
    baseAilmentChance: 0,
  },
];

export const CROSSBOW_ABILITIES: AbilityDef[] = [
  {
    id: 'crossbow_power_shot', name: 'Power Shot', description: '4x damage for 5s.',
    weaponType: 'crossbow', kind: 'buff', icon: '💣',
    duration: 5, cooldown: 90,
    effect: { damageMult: 4.0 },
  },
  {
    id: 'crossbow_explosive_bolt', name: 'Explosive Bolt', description: '2x damage + 1.5x materials for 15s.',
    weaponType: 'crossbow', kind: 'buff', icon: '💥',
    duration: 15, cooldown: 75,
    effect: { damageMult: 2.0, materialDropMult: 1.5 },
  },
  {
    id: 'crossbow_steady_aim', name: 'Steady Aim', description: '+20% crit, -10% attack speed (passive).',
    weaponType: 'crossbow', kind: 'passive', icon: '🎯',
    effect: { critChanceBonus: 20, attackSpeedMult: 0.9 },
  },
];

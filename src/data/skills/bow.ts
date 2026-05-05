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
    description: 'A basic arrow shot. First hit on an unmarked target applies Hunter\'s Mark (8s).',
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
    description: 'Loose 3 arrows in quick succession. Each can crit independently and refresh Hunter\'s Mark.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0,
    castTime: 0.7,
    cooldown: 4,
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
    description: 'Take careful aim for a devastating long-range shot. +100% crit chance vs Marked targets.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 10,
    weaponDamagePercent: 2.0,
    spellPowerRatio: 0,
    castTime: 1.8,
    cooldown: 10,
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
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Fire', description: 'Extend Rapid Fire.', nodes: [
          { id: 'bow_rf_a1', name: 'Steady Aim', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'bow_rf_a2', name: 'Sustained Fire', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'bow_rf_a1' },
        ]},
        { id: 'B', name: 'Precise Fire', description: 'Add crit chance.', nodes: [
          { id: 'bow_rf_b1', name: 'Focused Shot', description: '+8% crit chance', tier: 1, effect: { critChanceBonus: 8 } },
          { id: 'bow_rf_b2', name: 'Precise Fire', description: '+15% crit chance', tier: 2, effect: { critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'bow_rf_b1' },
        ]},
        { id: 'C', name: 'Barrage', description: 'Push attack speed further.', nodes: [
          { id: 'bow_rf_c1', name: 'Quick Draw', description: '+25% attack speed', tier: 1, effect: { attackSpeedMult: 1.25 } },
          { id: 'bow_rf_c2', name: 'Barrage', description: '+50% attack speed', tier: 2, effect: { attackSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'bow_rf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'bow_piercing_shot', name: 'Piercing Shot', description: 'Ignore hazards for 12s.',
    weaponType: 'bow', kind: 'buff', icon: '➡️',
    duration: 12, cooldown: 75,
    effect: { ignoreHazards: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Power Shot', description: 'Add damage.', nodes: [
          { id: 'bow_ps_a1', name: 'Heavy Arrow', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'bow_ps_a2', name: 'Power Shot', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'bow_ps_a1' },
        ]},
        { id: 'B', name: 'Sustained Pierce', description: 'Extend Piercing Shot.', nodes: [
          { id: 'bow_ps_b1', name: 'Long Range', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'bow_ps_b2', name: 'Sustained Pierce', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'bow_ps_b1' },
        ]},
        { id: 'C', name: 'Armor Piercing', description: 'Add defense penetration.', nodes: [
          { id: 'bow_ps_c1', name: 'Penetrating', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'bow_ps_c2', name: 'Armor Piercing', description: '+20% damage + ignore hazards', tier: 2, effect: { damageMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'bow_ps_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'bow_eagle_eye', name: 'Eagle Eye', description: '+10% item drops (passive).',
    weaponType: 'bow', kind: 'passive', icon: '🦅',
    effect: { itemDropMult: 1.1 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Hawk Eye', description: 'Convert to crit chance.', nodes: [
          { id: 'bow_ee_a1', name: 'Sharp Sight', description: '+4% crit chance', tier: 1, effect: { critChanceBonus: 4 } },
          { id: 'bow_ee_a2', name: 'Hawk Eye', description: 'Swap to +8% crit chance', tier: 2, effect: { itemDropMult: 1.0, critChanceBonus: 8 }, isPathPayoff: true, requiresNodeId: 'bow_ee_a1' },
        ]},
        { id: 'B', name: 'Quick Draw', description: 'Add attack speed.', nodes: [
          { id: 'bow_ee_b1', name: 'Nimble', description: '+3% attack speed', tier: 1, effect: { attackSpeedMult: 1.03 } },
          { id: 'bow_ee_b2', name: 'Quick Draw', description: '+5% item drops + 5% attack speed', tier: 2, effect: { itemDropMult: 1.05, attackSpeedMult: 1.05 }, isPathPayoff: true, requiresNodeId: 'bow_ee_b1' },
        ]},
        { id: 'C', name: 'Treasure Hunter', description: 'Pure item drop stacking.', nodes: [
          { id: 'bow_ee_c1', name: 'Keen Finder', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'bow_ee_c2', name: 'Treasure Hunter', description: '+20% item drops total', tier: 2, effect: { itemDropMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'bow_ee_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
];

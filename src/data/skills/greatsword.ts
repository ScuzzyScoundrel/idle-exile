// ============================================================
// Greatsword v2 — Berserker flagship skill definitions (Phase C3 step 2)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// CLASS_FANTASY_BRIEFS.md §4 (Berserker — Rage Threshold signature);
// MULTI_CLASS_PAIRS.md §3 (Deathwalker), §6 (Dark Reaver),
// §8 (Spellreaver), §10 (Warden)
// ============================================================
//
// PARADIGM (locked): Heavy 2H melee cleave. Slow per-hit cadence with
// massive per-strike damage and natural splash. Each swing applies
// Bloodied (Brs combo state) on direct hit; cleave splash inherits
// 50% damage to up to 2 additional enemies.
//
// SIGNATURE INTERACTIONS:
//   • Bloodied combo state on direct hit (Brs natural).
//   • Frenzied state synergy: below 50% HP, all greatsword damage +25%.
//   • Execute: skills with Heavy tag get +100% damage on targets <30% HP.
//   • Cleave splash: 1-2 additional targets per swing inherit 50% damage.
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Deathwalker (WD+Brs): greatsword_cleave → "Plagued Cleave" (applies
//     Plagued AoE, native Pandemic vector).
//   - Dark Reaver (Asn+Brs): greatsword_annihilate → Cascade-eligible
//     finisher; below 50% HP each hit can carry 8+ Crit Stacks.
//   - Spellreaver (Sor+Brs): greatsword_cleave → "Element Cleave" gains
//     element of current top Resonance charge (1 charge per cleave hit).
//   - Warden (Brs+Hnt): greatsword_hunters_cleave (NEW) marks all hit
//     targets; subsequent strikes get Precision Payoff scaled with YOUR
//     missing HP.
//
// PHASE C3 STEP 2 (2026-05-04):
//   - Extracted from src/data/skills/secondary.ts (was 7 actives + 3
//     abilities pre-audit). Phase A schema fields added.
//   - Pool grew 7 → 10 actives by adding pair-fusion enablers:
//     Cascade Cleave, Hunter's Cleave, Mana Sacrifice.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const GREATSWORD_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Cleave (default basic) ──
  {
    id: 'greatsword_cleave',
    name: 'Cleave',
    description: 'A wide sweeping strike with a greatsword. Hits front enemy + 2 splash targets at 50% damage. Applies Bloodied to all hit.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.2,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 3,
    levelRequired: 1,
    icon: '⚔️',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
  },
  // ── 2. Wide Sweep ──
  {
    id: 'greatsword_wide_sweep',
    name: 'Wide Sweep',
    description: 'A massive horizontal swing that hits twice. Each hit can crit independently — strong Cascade feed.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'AoE'],
    baseDamage: 0,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 4,
    levelRequired: 4,
    icon: '⚔️',
    hitCount: 2,
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 0,
  },
  // ── 3. Flame Arc ──
  {
    id: 'greatsword_flame_arc',
    name: 'Flame Arc',
    description: 'Sweep the blade in a fiery arc, scorching everything in range. Applies Ignite chance.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Fire', 'Melee', 'AoE'],
    baseDamage: 6,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 6,
    icon: '🔥',
    baseConversion: { from: 'physical', to: 'fire', percent: 55 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 35,
  },
  // ── 4. Frost Wave ──
  {
    id: 'greatsword_frost_wave',
    name: 'Frost Wave',
    description: 'Unleash a wave of frost with each swing. Chill chance applied to all hit targets.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Cold', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 8,
    icon: '❄️',
    baseConversion: { from: 'physical', to: 'cold', percent: 55 },
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 40,
  },
  // ── 5. Thunder Crash ──
  {
    id: 'greatsword_thunder_crash',
    name: 'Thunder Crash',
    description: 'Bring the blade down with thunderous force. Single-target heavy lightning hit.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 5,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 6,
    levelRequired: 10,
    icon: '⚡',
    baseConversion: { from: 'physical', to: 'lightning', percent: 55 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 30,
  },
  // ── 6. Bleeding Edge ──
  {
    id: 'greatsword_bleeding_edge',
    name: 'Bleeding Edge',
    description: 'A razor-sharp slash that leaves a deep wound. Bleed DoT for 5s.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'DoT'],
    baseDamage: 3,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 12,
    icon: '🩸',
    dotDuration: 5,
    dotDamagePercent: 0.3,
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 100,
  },
  // ── 7. Annihilate (heavy single-target payoff) ──
  {
    id: 'greatsword_annihilate',
    name: 'Annihilate',
    description: 'A devastating overhead strike that obliterates the target. +100% damage on targets below 30% HP (execute).',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'Heavy'],
    baseDamage: 22,
    weaponDamagePercent: 2.2,
    spellPowerRatio: 0,
    castTime: 1.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '💥',
    skillKind: 'cast',
    manaCost: 22,
    baseAilmentChance: 0,
  },
  // ── 8. Cascade Cleave (NEW — Dark Reaver pair) ──
  {
    id: 'greatsword_cascade_cleave',
    name: 'Cascade Cleave',
    description: 'Cleave variant where each cleave hit rolls for crit independently. First crit per swing starts Cascade on each target hit. Below 50% HP, gains +1 hit target.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'AoE'],
    baseDamage: 4,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 7,
    levelRequired: 8,
    icon: '🗡️',
    hitCount: 3,
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 0,
  },
  // ── 9. Hunter's Cleave (NEW — Warden pair) ──
  {
    id: 'greatsword_hunters_cleave',
    name: 'Hunter\'s Cleave',
    description: 'Cleave that applies Hunter\'s Mark to all hit targets (5s). +25% damage per Marked target hit. Subsequent strikes get Precision Payoff (+150% damage) scaled with YOUR missing HP.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'AoE', 'Utility'],
    baseDamage: 3,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 9,
    levelRequired: 12,
    icon: '🎯',
    hitCount: 3,
    skillKind: 'cast',
    manaCost: 14,
    baseAilmentChance: 0,
  },
  // ── 10. Mana Sacrifice (NEW — Spellreaver self-cost trigger) ──
  {
    id: 'greatsword_mana_sacrifice',
    name: 'Mana Sacrifice',
    description: 'Sacrifice 30% current mana to deal that amount as bonus physical damage to a target. Below 50% mana, triggers a "weaker Frenzied" state (+25% damage 5s). Spellreaver hybrid trigger.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'Utility'],
    baseDamage: 5,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 14,
    levelRequired: 10,
    icon: '🩹',
    skillKind: 'cast',
    manaCost: 4,
    baseAilmentChance: 0,
  },
];

export const GREATSWORD_ABILITIES: AbilityDef[] = [
  {
    id: 'greatsword_momentum', name: 'Momentum', description: '1.8x damage + 1.3x clear speed for 15s.',
    weaponType: 'greatsword', kind: 'buff', icon: '⚔️',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, clearSpeedMult: 1.3 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Momentum', description: 'Extend Momentum duration.', nodes: [
          { id: 'gs_mom_a1', name: 'Building Speed', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'gs_mom_a2', name: 'Sustained Momentum', description: '+7s duration', tier: 2, effect: {}, durationBonus: 7, isPathPayoff: true, requiresNodeId: 'gs_mom_a1' },
        ]},
        { id: 'B', name: 'Sweeping Momentum', description: 'Add double clears.', nodes: [
          { id: 'gs_mom_b1', name: 'Wide Arc', description: '+10% clear speed', tier: 1, effect: { clearSpeedMult: 1.1 } },
          { id: 'gs_mom_b2', name: 'Sweeping Momentum', description: 'Add double clears', tier: 2, effect: { doubleClears: true }, isPathPayoff: true, requiresNodeId: 'gs_mom_b1' },
        ]},
        { id: 'C', name: 'Unstoppable Force', description: 'Push damage higher.', nodes: [
          { id: 'gs_mom_c1', name: 'Heavy Swings', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'gs_mom_c2', name: 'Unstoppable Force', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'gs_mom_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'greatsword_iron_will', name: 'Iron Will', description: '2.5x defense + 15 all resists for 20s.',
    weaponType: 'greatsword', kind: 'buff', icon: '🛡️',
    duration: 20, cooldown: 75,
    effect: { defenseMult: 2.5, resistBonus: 15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Enduring Will', description: 'Extend Iron Will duration.', nodes: [
          { id: 'gs_iw_a1', name: 'Steadfast', description: '+5s duration', tier: 1, effect: {}, durationBonus: 5 },
          { id: 'gs_iw_a2', name: 'Enduring Will', description: '+10s duration', tier: 2, effect: {}, durationBonus: 10, isPathPayoff: true, requiresNodeId: 'gs_iw_a1' },
        ]},
        { id: 'B', name: 'Retaliating Will', description: 'Add damage while defending.', nodes: [
          { id: 'gs_iw_b1', name: 'Counter Force', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'gs_iw_b2', name: 'Retaliating Will', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'gs_iw_b1' },
        ]},
        { id: 'C', name: 'Unyielding Will', description: 'Boost defense and resists further.', nodes: [
          { id: 'gs_iw_c1', name: 'Reinforced', description: '+10 all resists', tier: 1, effect: { resistBonus: 10 } },
          { id: 'gs_iw_c2', name: 'Unyielding Will', description: '+25 all resists', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'gs_iw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'greatsword_heavy_impact', name: 'Heavy Impact', description: '+20% damage + 20% crit damage (passive).',
    weaponType: 'greatsword', kind: 'passive', icon: '⚔️',
    effect: { damageMult: 1.2, critMultiplierBonus: 20 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lethal Impact', description: 'Focus on crit damage.', nodes: [
          { id: 'gs_hi_a1', name: 'Deep Wounds', description: '+10% crit damage', tier: 1, effect: { critMultiplierBonus: 10 } },
          { id: 'gs_hi_a2', name: 'Lethal Impact', description: '+30% crit damage, less raw damage', tier: 2, effect: { damageMult: 1.0, critMultiplierBonus: 30 }, isPathPayoff: true, requiresNodeId: 'gs_hi_a1' },
        ]},
        { id: 'B', name: 'Cleaving Impact', description: 'Add clear speed.', nodes: [
          { id: 'gs_hi_b1', name: 'Wide Swings', description: '+8% clear speed', tier: 1, effect: { clearSpeedMult: 1.08 } },
          { id: 'gs_hi_b2', name: 'Cleaving Impact', description: '+15% damage + 15% clear speed', tier: 2, effect: { damageMult: 1.15, clearSpeedMult: 1.15 }, isPathPayoff: true, requiresNodeId: 'gs_hi_b1' },
        ]},
        { id: 'C', name: 'Crushing Impact', description: 'Pure damage increase.', nodes: [
          { id: 'gs_hi_c1', name: 'Heavy Blade', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'gs_hi_c2', name: 'Crushing Impact', description: '+30% damage total', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'gs_hi_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
];

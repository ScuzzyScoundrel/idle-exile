// ============================================================
// Idle Exile — Ability Definitions
// 24 abilities: 8 weapon types x (2 buff + 1 passive each)
// Now with skill trees (converted from old mutator system)
// ============================================================

import type { AbilityDef, WeaponType } from '../types';

export const ABILITY_DEFS: AbilityDef[] = [
  // ==================== Sword — Balanced melee ====================
  {
    id: 'sword_blade_fury', name: 'Blade Fury', description: '2x damage for 15s.',
    weaponType: 'sword', kind: 'buff', icon: '\u2694\uFE0F',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Fury', description: 'Extend the duration of Blade Fury.', nodes: [
          { id: 'sword_bf_a1', name: 'Extended Fury', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'sword_bf_a2', name: 'Sustained Fury', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'sword_bf_a1' },
        ]},
        { id: 'B', name: 'Precision Fury', description: 'Add crit chance to Blade Fury.', nodes: [
          { id: 'sword_bf_b1', name: 'Sharpened Edge', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'sword_bf_b2', name: 'Precision Fury', description: '+10% crit chance', tier: 2, effect: { critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'sword_bf_b1' },
        ]},
        { id: 'C', name: 'Frenzied Fury', description: 'Add attack speed to Blade Fury.', nodes: [
          { id: 'sword_bf_c1', name: 'Quick Strikes', description: '+20% attack speed', tier: 1, effect: { attackSpeedMult: 1.2 } },
          { id: 'sword_bf_c2', name: 'Frenzied Fury', description: '+50% attack speed', tier: 2, effect: { attackSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'sword_bf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'sword_riposte', name: 'Riposte', description: '2x defense for 10s.',
    weaponType: 'sword', kind: 'buff', icon: '\uD83D\uDEE1\uFE0F',
    duration: 10, cooldown: 45,
    effect: { defenseMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Counter Strike', description: 'Add damage while defending.', nodes: [
          { id: 'sword_rip_a1', name: 'Opportunist', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'sword_rip_a2', name: 'Counter Strike', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'sword_rip_a1' },
        ]},
        { id: 'B', name: 'Stalwart Guard', description: 'Extend Riposte duration.', nodes: [
          { id: 'sword_rip_b1', name: 'Hold the Line', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'sword_rip_b2', name: 'Stalwart Guard', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'sword_rip_b1' },
        ]},
        { id: 'C', name: 'Iron Bulwark', description: 'Boost defense further.', nodes: [
          { id: 'sword_rip_c1', name: 'Fortified Stance', description: '+10 all resist', tier: 1, effect: { resistBonus: 10 } },
          { id: 'sword_rip_c2', name: 'Iron Bulwark', description: '+25 all resist', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'sword_rip_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'sword_keen_edge', name: 'Keen Edge', description: '+15% crit chance (passive).',
    weaponType: 'sword', kind: 'passive', icon: '\uD83D\uDDE1\uFE0F',
    effect: { critChanceBonus: 15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lethal Edge', description: 'Convert crit chance to crit damage.', nodes: [
          { id: 'sword_ke_a1', name: 'Keen Blade', description: '+5% crit damage', tier: 1, effect: { critMultiplierBonus: 5 } },
          { id: 'sword_ke_a2', name: 'Lethal Edge', description: 'Swap to +20% crit damage', tier: 2, effect: { critChanceBonus: 0, critMultiplierBonus: 20 }, isPathPayoff: true, requiresNodeId: 'sword_ke_a1' },
        ]},
        { id: 'B', name: 'Balanced Edge', description: 'Mix of crit chance and damage.', nodes: [
          { id: 'sword_ke_b1', name: 'Honed Strike', description: '+3% crit chance', tier: 1, effect: { critChanceBonus: 3 } },
          { id: 'sword_ke_b2', name: 'Balanced Edge', description: '+8% crit chance + 8% crit damage', tier: 2, effect: { critChanceBonus: 8, critMultiplierBonus: 8 }, isPathPayoff: true, requiresNodeId: 'sword_ke_b1' },
        ]},
        { id: 'C', name: 'Razor Focus', description: 'Pure crit chance stacking.', nodes: [
          { id: 'sword_ke_c1', name: 'Sharp Eye', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'sword_ke_c2', name: 'Razor Focus', description: '+10% crit chance', tier: 2, effect: { critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'sword_ke_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Axe — High damage, slow ====================
  {
    id: 'axe_cleave', name: 'Cleave', description: '1.5x damage + double clears for 20s.',
    weaponType: 'axe', kind: 'buff', icon: '\uD83E\uDE93',
    duration: 20, cooldown: 90,
    effect: { damageMult: 1.5, doubleClears: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Relentless Cleave', description: 'Extend Cleave duration.', nodes: [
          { id: 'axe_cl_a1', name: 'Sustained Swings', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'axe_cl_a2', name: 'Relentless Cleave', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'axe_cl_a1' },
        ]},
        { id: 'B', name: 'Brutal Cleave', description: 'More damage, no double clears.', nodes: [
          { id: 'axe_cl_b1', name: 'Heavy Chop', description: '+50% damage', tier: 1, effect: { damageMult: 1.5 } },
          { id: 'axe_cl_b2', name: 'Brutal Cleave', description: '3x damage, no double clears', tier: 2, effect: { damageMult: 3.0, doubleClears: false }, isPathPayoff: true, requiresNodeId: 'axe_cl_b1' },
        ]},
        { id: 'C', name: 'Whirlwind', description: 'Add material drops to Cleave.', nodes: [
          { id: 'axe_cl_c1', name: 'Scattering Blows', description: '+10% material drops', tier: 1, effect: { materialDropMult: 1.1 } },
          { id: 'axe_cl_c2', name: 'Whirlwind', description: '+25% material drops', tier: 2, effect: { materialDropMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'axe_cl_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'axe_berserker_rage', name: 'Berserker Rage', description: '3x damage for 12s.',
    weaponType: 'axe', kind: 'buff', icon: '\uD83D\uDD25',
    duration: 12, cooldown: 60,
    effect: { damageMult: 3.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Frenzied Rage', description: 'Add attack speed to Berserker Rage.', nodes: [
          { id: 'axe_br_a1', name: 'Wild Swings', description: '+25% attack speed', tier: 1, effect: { attackSpeedMult: 1.25 } },
          { id: 'axe_br_a2', name: 'Frenzied Rage', description: '+50% attack speed', tier: 2, effect: { attackSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'axe_br_a1' },
        ]},
        { id: 'B', name: 'Sustained Rage', description: 'Extend Berserker Rage duration.', nodes: [
          { id: 'axe_br_b1', name: 'Lingering Fury', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'axe_br_b2', name: 'Sustained Rage', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'axe_br_b1' },
        ]},
        { id: 'C', name: 'Blood Rage', description: 'Add crit during rage.', nodes: [
          { id: 'axe_br_c1', name: 'Reckless Strikes', description: '+10% crit chance', tier: 1, effect: { critChanceBonus: 10 } },
          { id: 'axe_br_c2', name: 'Blood Rage', description: '+20% crit damage', tier: 2, effect: { critMultiplierBonus: 20 }, isPathPayoff: true, requiresNodeId: 'axe_br_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'axe_heavy_blows', name: 'Heavy Blows', description: '+20% damage (passive).',
    weaponType: 'axe', kind: 'passive', icon: '\uD83D\uDCA2',
    effect: { damageMult: 1.2 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Devastating Blows', description: 'Convert to crit damage.', nodes: [
          { id: 'axe_hb_a1', name: 'Focused Impact', description: '+8% crit damage', tier: 1, effect: { critMultiplierBonus: 8 } },
          { id: 'axe_hb_a2', name: 'Devastating Blows', description: '+15% crit damage, less raw damage', tier: 2, effect: { damageMult: 1.0, critMultiplierBonus: 15 }, isPathPayoff: true, requiresNodeId: 'axe_hb_a1' },
        ]},
        { id: 'B', name: 'Scavenging Blows', description: 'Add material drop bonus.', nodes: [
          { id: 'axe_hb_b1', name: 'Resourceful', description: '+5% material drops', tier: 1, effect: { materialDropMult: 1.05 } },
          { id: 'axe_hb_b2', name: 'Scavenging Blows', description: '+10% damage + 10% materials', tier: 2, effect: { damageMult: 1.1, materialDropMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'axe_hb_b1' },
        ]},
        { id: 'C', name: 'Crushing Blows', description: 'Pure damage increase.', nodes: [
          { id: 'axe_hb_c1', name: 'Power Strikes', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'axe_hb_c2', name: 'Crushing Blows', description: '+30% damage total', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'axe_hb_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Mace — Tanky, consistent ====================
  {
    id: 'mace_shockwave', name: 'Shockwave', description: '1.3x damage + ignore hazards for 15s.',
    weaponType: 'mace', kind: 'buff', icon: '\uD83D\uDCA5',
    duration: 15, cooldown: 75,
    effect: { damageMult: 1.3, ignoreHazards: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lingering Shockwave', description: 'Extend Shockwave duration.', nodes: [
          { id: 'mace_sw_a1', name: 'Aftershock', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'mace_sw_a2', name: 'Lingering Shockwave', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'mace_sw_a1' },
        ]},
        { id: 'B', name: 'Defensive Shockwave', description: 'Add defense to Shockwave.', nodes: [
          { id: 'mace_sw_b1', name: 'Stabilized', description: '+50% defense', tier: 1, effect: { defenseMult: 1.5 } },
          { id: 'mace_sw_b2', name: 'Defensive Shockwave', description: '+2x defense', tier: 2, effect: { defenseMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'mace_sw_b1' },
        ]},
        { id: 'C', name: 'Quake', description: 'Boost Shockwave damage.', nodes: [
          { id: 'mace_sw_c1', name: 'Tremor', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'mace_sw_c2', name: 'Quake', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'mace_sw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'mace_fortify', name: 'Fortify', description: '3x defense for 20s.',
    weaponType: 'mace', kind: 'buff', icon: '\uD83C\uDFF0',
    duration: 20, cooldown: 60,
    effect: { defenseMult: 3.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Elemental Fortify', description: 'Add resist bonus.', nodes: [
          { id: 'mace_fo_a1', name: 'Warded', description: '+12 all resists', tier: 1, effect: { resistBonus: 12 } },
          { id: 'mace_fo_a2', name: 'Elemental Fortify', description: '+25 all resists', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'mace_fo_a1' },
        ]},
        { id: 'B', name: 'Iron Wall', description: 'Extend Fortify duration.', nodes: [
          { id: 'mace_fo_b1', name: 'Steadfast', description: '+5s duration', tier: 1, effect: {}, durationBonus: 5 },
          { id: 'mace_fo_b2', name: 'Iron Wall', description: '+10s duration', tier: 2, effect: {}, durationBonus: 10, isPathPayoff: true, requiresNodeId: 'mace_fo_b1' },
        ]},
        { id: 'C', name: 'Thorns', description: 'Add damage while fortified.', nodes: [
          { id: 'mace_fo_c1', name: 'Retaliate', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'mace_fo_c2', name: 'Thorns', description: '+30% damage while defending', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'mace_fo_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'mace_crushing_force', name: 'Crushing Force', description: '+10% damage + 10 all resists (passive).',
    weaponType: 'mace', kind: 'passive', icon: '\uD83D\uDD28',
    effect: { damageMult: 1.1, resistBonus: 10 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Iron Skin', description: 'Focus on resists.', nodes: [
          { id: 'mace_cf_a1', name: 'Hardened', description: '+5 all resists', tier: 1, effect: { resistBonus: 5 } },
          { id: 'mace_cf_a2', name: 'Iron Skin', description: '+20 resists, no damage', tier: 2, effect: { damageMult: 1.0, resistBonus: 20 }, isPathPayoff: true, requiresNodeId: 'mace_cf_a1' },
        ]},
        { id: 'B', name: 'Crushing Power', description: 'Focus on damage.', nodes: [
          { id: 'mace_cf_b1', name: 'Heavy Hitter', description: '+5% damage', tier: 1, effect: { damageMult: 1.05 } },
          { id: 'mace_cf_b2', name: 'Crushing Power', description: '+20% damage, no resists', tier: 2, effect: { damageMult: 1.2, resistBonus: 0 }, isPathPayoff: true, requiresNodeId: 'mace_cf_b1' },
        ]},
        { id: 'C', name: 'Balanced Force', description: 'Enhance both.', nodes: [
          { id: 'mace_cf_c1', name: 'Steady Force', description: '+5% damage', tier: 1, effect: { damageMult: 1.05 } },
          { id: 'mace_cf_c2', name: 'Balanced Force', description: '+15% damage + 15 resists', tier: 2, effect: { damageMult: 1.15, resistBonus: 15 }, isPathPayoff: true, requiresNodeId: 'mace_cf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Dagger — Fast, crit-focused ====================
  {
    id: 'dagger_flurry', name: 'Flurry', description: '3x attack speed for 10s.',
    weaponType: 'dagger', kind: 'buff', icon: '\u26A1',
    duration: 10, cooldown: 45,
    effect: { attackSpeedMult: 3.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Critical Flurry', description: 'Add crit chance during Flurry.', nodes: [
          { id: 'dagger_fl_a1', name: 'Precise Strikes', description: '+8% crit chance', tier: 1, effect: { critChanceBonus: 8 } },
          { id: 'dagger_fl_a2', name: 'Critical Flurry', description: '+15% crit chance', tier: 2, effect: { critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'dagger_fl_a1' },
        ]},
        { id: 'B', name: 'Extended Flurry', description: 'Extend Flurry duration.', nodes: [
          { id: 'dagger_fl_b1', name: 'Momentum', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'dagger_fl_b2', name: 'Extended Flurry', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'dagger_fl_b1' },
        ]},
        { id: 'C', name: 'Blade Storm', description: 'Add damage to Flurry.', nodes: [
          { id: 'dagger_fl_c1', name: 'Sharp Edges', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'dagger_fl_c2', name: 'Blade Storm', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'dagger_fl_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'dagger_shadow_strike', name: 'Shadow Strike', description: '+50% crit + 100% crit damage for 8s.',
    weaponType: 'dagger', kind: 'buff', icon: '\uD83C\uDF11',
    duration: 8, cooldown: 60,
    effect: { critChanceBonus: 50, critMultiplierBonus: 100 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lingering Shadow', description: 'Extend Shadow Strike.', nodes: [
          { id: 'dagger_ss_a1', name: 'Dark Veil', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'dagger_ss_a2', name: 'Lingering Shadow', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'dagger_ss_a1' },
        ]},
        { id: 'B', name: 'Assassinate', description: 'Add raw damage.', nodes: [
          { id: 'dagger_ss_b1', name: 'Exploit Weakness', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'dagger_ss_b2', name: 'Assassinate', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'dagger_ss_b1' },
        ]},
        { id: 'C', name: 'Death Mark', description: 'Push crit even higher.', nodes: [
          { id: 'dagger_ss_c1', name: 'Marked Target', description: '+25% crit damage', tier: 1, effect: { critMultiplierBonus: 25 } },
          { id: 'dagger_ss_c2', name: 'Death Mark', description: '+50% crit damage', tier: 2, effect: { critMultiplierBonus: 50 }, isPathPayoff: true, requiresNodeId: 'dagger_ss_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'dagger_lethality', name: 'Lethality', description: '+25% crit damage (passive).',
    weaponType: 'dagger', kind: 'passive', icon: '\uD83D\uDDE1\uFE0F',
    effect: { critMultiplierBonus: 25 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Precision', description: 'Convert to crit chance.', nodes: [
          { id: 'dagger_le_a1', name: 'Keen Eye', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'dagger_le_a2', name: 'Precision', description: 'Swap to +10% crit chance', tier: 2, effect: { critMultiplierBonus: 0, critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'dagger_le_a1' },
        ]},
        { id: 'B', name: 'Quick Hands', description: 'Add attack speed.', nodes: [
          { id: 'dagger_le_b1', name: 'Nimble Fingers', description: '+5% attack speed', tier: 1, effect: { attackSpeedMult: 1.05 } },
          { id: 'dagger_le_b2', name: 'Quick Hands', description: '+15% crit dmg + 10% attack speed', tier: 2, effect: { critMultiplierBonus: 15, attackSpeedMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'dagger_le_b1' },
        ]},
        { id: 'C', name: 'Lethality Mastery', description: 'Pure crit damage.', nodes: [
          { id: 'dagger_le_c1', name: 'Deep Cuts', description: '+10% crit damage', tier: 1, effect: { critMultiplierBonus: 10 } },
          { id: 'dagger_le_c2', name: 'Lethality Mastery', description: '+35% crit damage total', tier: 2, effect: { critMultiplierBonus: 35 }, isPathPayoff: true, requiresNodeId: 'dagger_le_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Staff — Magic, elemental ====================
  {
    id: 'staff_arcane_blast', name: 'Arcane Blast', description: '2.5x damage for 12s.',
    weaponType: 'staff', kind: 'buff', icon: '\u2728',
    duration: 12, cooldown: 75,
    effect: { damageMult: 2.5 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Blast', description: 'Extend Arcane Blast.', nodes: [
          { id: 'staff_ab_a1', name: 'Resonance', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'staff_ab_a2', name: 'Sustained Blast', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'staff_ab_a1' },
        ]},
        { id: 'B', name: 'Enlightened Blast', description: 'Add XP bonus.', nodes: [
          { id: 'staff_ab_b1', name: 'Insight', description: '+12% XP', tier: 1, effect: { xpMult: 1.12 } },
          { id: 'staff_ab_b2', name: 'Enlightened Blast', description: '+25% XP', tier: 2, effect: { xpMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'staff_ab_b1' },
        ]},
        { id: 'C', name: 'Overcharge', description: 'Push damage higher.', nodes: [
          { id: 'staff_ab_c1', name: 'Empowered', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'staff_ab_c2', name: 'Overcharge', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'staff_ab_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'staff_elemental_ward', name: 'Elemental Ward', description: '+50 all resists for 15s.',
    weaponType: 'staff', kind: 'buff', icon: '\uD83D\uDD2E',
    duration: 15, cooldown: 60,
    effect: { resistBonus: 50 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lasting Ward', description: 'Extend Elemental Ward.', nodes: [
          { id: 'staff_ew_a1', name: 'Persistent Aura', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'staff_ew_a2', name: 'Lasting Ward', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'staff_ew_a1' },
        ]},
        { id: 'B', name: 'Barrier Ward', description: 'Add defense.', nodes: [
          { id: 'staff_ew_b1', name: 'Shielded', description: '+50% defense', tier: 1, effect: { defenseMult: 1.5 } },
          { id: 'staff_ew_b2', name: 'Barrier Ward', description: '+2x defense', tier: 2, effect: { defenseMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'staff_ew_b1' },
        ]},
        { id: 'C', name: 'Arcane Shield', description: 'Boost resist even higher.', nodes: [
          { id: 'staff_ew_c1', name: 'Enhanced Ward', description: '+15 resists', tier: 1, effect: { resistBonus: 15 } },
          { id: 'staff_ew_c2', name: 'Arcane Shield', description: '+30 resists', tier: 2, effect: { resistBonus: 30 }, isPathPayoff: true, requiresNodeId: 'staff_ew_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'staff_wisdom', name: 'Wisdom', description: '+15% XP gain (passive).',
    weaponType: 'staff', kind: 'passive', icon: '\uD83D\uDCD6',
    effect: { xpMult: 1.15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Scholar\'s Insight', description: 'Convert to item drops.', nodes: [
          { id: 'staff_wi_a1', name: 'Perceptive', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'staff_wi_a2', name: 'Scholar\'s Insight', description: 'Swap to +10% item drops', tier: 2, effect: { xpMult: 1.0, itemDropMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'staff_wi_a1' },
        ]},
        { id: 'B', name: 'Balanced Wisdom', description: 'Mix of XP and drops.', nodes: [
          { id: 'staff_wi_b1', name: 'Quick Learner', description: '+4% XP', tier: 1, effect: { xpMult: 1.04 } },
          { id: 'staff_wi_b2', name: 'Balanced Wisdom', description: '+8% XP + 5% item drops', tier: 2, effect: { xpMult: 1.08, itemDropMult: 1.05 }, isPathPayoff: true, requiresNodeId: 'staff_wi_b1' },
        ]},
        { id: 'C', name: 'Deep Knowledge', description: 'Pure XP stacking.', nodes: [
          { id: 'staff_wi_c1', name: 'Studious', description: '+8% XP', tier: 1, effect: { xpMult: 1.08 } },
          { id: 'staff_wi_c2', name: 'Deep Knowledge', description: '+25% XP total', tier: 2, effect: { xpMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'staff_wi_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Wand — Fast magic, utility ====================
  {
    id: 'wand_chain_lightning', name: 'Chain Lightning', description: '1.8x damage + 1.5x materials for 15s.',
    weaponType: 'wand', kind: 'buff', icon: '\u26A1',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, materialDropMult: 1.5 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Lightning', description: 'Extend Chain Lightning.', nodes: [
          { id: 'wand_cl_a1', name: 'Persistent Charge', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'wand_cl_a2', name: 'Sustained Lightning', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'wand_cl_a1' },
        ]},
        { id: 'B', name: 'Magnetic Lightning', description: 'Convert materials to item drops.', nodes: [
          { id: 'wand_cl_b1', name: 'Attract', description: '+10% item drops', tier: 1, effect: { itemDropMult: 1.1 } },
          { id: 'wand_cl_b2', name: 'Magnetic Lightning', description: 'Swap to +1.3x item drops', tier: 2, effect: { materialDropMult: 1.0, itemDropMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'wand_cl_b1' },
        ]},
        { id: 'C', name: 'Storm Surge', description: 'Boost damage.', nodes: [
          { id: 'wand_cl_c1', name: 'Amplified', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'wand_cl_c2', name: 'Storm Surge', description: '+40% damage', tier: 2, effect: { damageMult: 1.4 }, isPathPayoff: true, requiresNodeId: 'wand_cl_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'wand_time_warp', name: 'Time Warp', description: '2x clear speed for 10s.',
    weaponType: 'wand', kind: 'buff', icon: '\u231B',
    duration: 10, cooldown: 90,
    effect: { clearSpeedMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Extended Warp', description: 'Extend Time Warp.', nodes: [
          { id: 'wand_tw_a1', name: 'Time Dilation', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'wand_tw_a2', name: 'Extended Warp', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'wand_tw_a1' },
        ]},
        { id: 'B', name: 'Temporal Harvest', description: 'Add material drops.', nodes: [
          { id: 'wand_tw_b1', name: 'Time Loot', description: '+15% material drops', tier: 1, effect: { materialDropMult: 1.15 } },
          { id: 'wand_tw_b2', name: 'Temporal Harvest', description: '+30% material drops', tier: 2, effect: { materialDropMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'wand_tw_b1' },
        ]},
        { id: 'C', name: 'Haste', description: 'Push clear speed higher.', nodes: [
          { id: 'wand_tw_c1', name: 'Quickened', description: '+25% clear speed', tier: 1, effect: { clearSpeedMult: 1.25 } },
          { id: 'wand_tw_c2', name: 'Haste', description: '+50% clear speed', tier: 2, effect: { clearSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'wand_tw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'wand_mystic_insight', name: 'Mystic Insight', description: '+10% item drops (passive).',
    weaponType: 'wand', kind: 'passive', icon: '\uD83D\uDC41\uFE0F',
    effect: { itemDropMult: 1.1 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Material Insight', description: 'Convert to material drops.', nodes: [
          { id: 'wand_mi_a1', name: 'Resourceful Eye', description: '+8% material drops', tier: 1, effect: { materialDropMult: 1.08 } },
          { id: 'wand_mi_a2', name: 'Material Insight', description: 'Swap to +15% material drops', tier: 2, effect: { itemDropMult: 1.0, materialDropMult: 1.15 }, isPathPayoff: true, requiresNodeId: 'wand_mi_a1' },
        ]},
        { id: 'B', name: 'Dual Insight', description: 'Mix of items and materials.', nodes: [
          { id: 'wand_mi_b1', name: 'Keen Senses', description: '+3% items', tier: 1, effect: { itemDropMult: 1.03 } },
          { id: 'wand_mi_b2', name: 'Dual Insight', description: '+5% items + 8% materials', tier: 2, effect: { itemDropMult: 1.05, materialDropMult: 1.08 }, isPathPayoff: true, requiresNodeId: 'wand_mi_b1' },
        ]},
        { id: 'C', name: 'Fortune\'s Eye', description: 'Pure item drop stacking.', nodes: [
          { id: 'wand_mi_c1', name: 'Lucky Find', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'wand_mi_c2', name: 'Fortune\'s Eye', description: '+20% item drops total', tier: 2, effect: { itemDropMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'wand_mi_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Bow — Ranged, speed ====================
  {
    id: 'bow_rapid_fire', name: 'Rapid Fire', description: '2x attack speed for 15s.',
    weaponType: 'bow', kind: 'buff', icon: '\uD83C\uDFF9',
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
    weaponType: 'bow', kind: 'buff', icon: '\u27A1\uFE0F',
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
    weaponType: 'bow', kind: 'passive', icon: '\uD83E\uDD85',
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

  // ==================== Crossbow — Heavy ranged, burst ====================
  {
    id: 'crossbow_power_shot', name: 'Power Shot', description: '4x damage for 5s.',
    weaponType: 'crossbow', kind: 'buff', icon: '\uD83D\uDCA3',
    duration: 5, cooldown: 90,
    effect: { damageMult: 4.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Power', description: 'Extend Power Shot.', nodes: [
          { id: 'xbow_ps_a1', name: 'Charged Bolt', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'xbow_ps_a2', name: 'Sustained Power', description: '+4s duration', tier: 2, effect: {}, durationBonus: 4, isPathPayoff: true, requiresNodeId: 'xbow_ps_a1' },
        ]},
        { id: 'B', name: 'Guaranteed Crit', description: 'Add massive crit chance.', nodes: [
          { id: 'xbow_ps_b1', name: 'Precision Bolt', description: '+25% crit chance', tier: 1, effect: { critChanceBonus: 25 } },
          { id: 'xbow_ps_b2', name: 'Guaranteed Crit', description: '+50% crit chance', tier: 2, effect: { critChanceBonus: 50 }, isPathPayoff: true, requiresNodeId: 'xbow_ps_b1' },
        ]},
        { id: 'C', name: 'Overkill', description: 'Push damage even higher.', nodes: [
          { id: 'xbow_ps_c1', name: 'Heavy Load', description: '+50% damage', tier: 1, effect: { damageMult: 1.5 } },
          { id: 'xbow_ps_c2', name: 'Overkill', description: '+100% damage (8x total)', tier: 2, effect: { damageMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'xbow_ps_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'crossbow_explosive_bolt', name: 'Explosive Bolt', description: '2x damage + 1.5x materials for 15s.',
    weaponType: 'crossbow', kind: 'buff', icon: '\uD83D\uDCA5',
    duration: 15, cooldown: 75,
    effect: { damageMult: 2.0, materialDropMult: 1.5 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Chain Explosions', description: 'Extend Explosive Bolt.', nodes: [
          { id: 'xbow_eb_a1', name: 'Lingering Fire', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'xbow_eb_a2', name: 'Chain Explosions', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'xbow_eb_a1' },
        ]},
        { id: 'B', name: 'Cluster Bolt', description: 'Add double clears.', nodes: [
          { id: 'xbow_eb_b1', name: 'Scatter Shot', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'xbow_eb_b2', name: 'Cluster Bolt', description: 'Add double clears', tier: 2, effect: { doubleClears: true }, isPathPayoff: true, requiresNodeId: 'xbow_eb_b1' },
        ]},
        { id: 'C', name: 'Incendiary', description: 'Boost material drops.', nodes: [
          { id: 'xbow_eb_c1', name: 'Salvage Blast', description: '+15% material drops', tier: 1, effect: { materialDropMult: 1.15 } },
          { id: 'xbow_eb_c2', name: 'Incendiary', description: '+30% material drops', tier: 2, effect: { materialDropMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'xbow_eb_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'crossbow_steady_aim', name: 'Steady Aim', description: '+20% crit, -10% attack speed (passive).',
    weaponType: 'crossbow', kind: 'passive', icon: '\uD83C\uDFAF',
    effect: { critChanceBonus: 20, attackSpeedMult: 0.9 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Pure Aim', description: 'Remove speed penalty.', nodes: [
          { id: 'xbow_sa_a1', name: 'Improved Mechanism', description: 'Reduce speed penalty', tier: 1, effect: { attackSpeedMult: 1.05 } },
          { id: 'xbow_sa_a2', name: 'Pure Aim', description: '+15% crit, no speed penalty', tier: 2, effect: { critChanceBonus: 15, attackSpeedMult: 1.0 }, isPathPayoff: true, requiresNodeId: 'xbow_sa_a1' },
        ]},
        { id: 'B', name: 'Heavy Bolts', description: 'Add damage, more speed penalty.', nodes: [
          { id: 'xbow_sa_b1', name: 'Weighted Tips', description: '+5% damage', tier: 1, effect: { damageMult: 1.05 } },
          { id: 'xbow_sa_b2', name: 'Heavy Bolts', description: '+10% crit + 10% damage, -15% speed', tier: 2, effect: { critChanceBonus: 10, damageMult: 1.1, attackSpeedMult: 0.85 }, isPathPayoff: true, requiresNodeId: 'xbow_sa_b1' },
        ]},
        { id: 'C', name: 'Marksman', description: 'Pure crit focus.', nodes: [
          { id: 'xbow_sa_c1', name: 'Careful Aim', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'xbow_sa_c2', name: 'Marksman', description: '+30% crit total', tier: 2, effect: { critChanceBonus: 30 }, isPathPayoff: true, requiresNodeId: 'xbow_sa_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
];

/** Get all abilities for a given weapon type. */
export function getAbilitiesForWeapon(weaponType: WeaponType): AbilityDef[] {
  return ABILITY_DEFS.filter(a => a.weaponType === weaponType);
}

/** Look up an ability definition by ID. */
export function getAbilityDef(id: string): AbilityDef | undefined {
  return ABILITY_DEFS.find(a => a.id === id);
}

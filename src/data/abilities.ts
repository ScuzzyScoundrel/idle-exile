// ============================================================
// Idle Exile — Ability Definitions
// 24 abilities: 8 weapon types x (2 active + 1 passive each)
// ============================================================

import type { AbilityDef, WeaponType } from '../types';

export const ABILITY_DEFS: AbilityDef[] = [
  // ==================== Sword — Balanced melee ====================
  {
    id: 'sword_blade_fury', name: 'Blade Fury', description: '2x damage for 15s.',
    weaponType: 'sword', kind: 'active', icon: '\u2694\uFE0F',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0 },
    mutators: [
      { id: 'sword_bf_duration', name: 'Sustained Fury', description: '+5s duration', effectOverride: {}, durationBonus: 5 },
      { id: 'sword_bf_crit', name: 'Precision Fury', description: '+10% crit chance during', effectOverride: { critChanceBonus: 10 } },
      { id: 'sword_bf_speed', name: 'Frenzied Fury', description: '+50% attack speed during', effectOverride: { attackSpeedMult: 1.5 } },
    ],
  },
  {
    id: 'sword_riposte', name: 'Riposte', description: '2x defense for 10s.',
    weaponType: 'sword', kind: 'active', icon: '\uD83D\uDEE1\uFE0F',
    duration: 10, cooldown: 45,
    effect: { defenseMult: 2.0 },
    mutators: [
      { id: 'sword_rip_dmg', name: 'Counter Strike', description: '+30% damage while defending', effectOverride: { damageMult: 1.3 } },
      { id: 'sword_rip_dur', name: 'Stalwart Guard', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
    ],
  },
  {
    id: 'sword_keen_edge', name: 'Keen Edge', description: '+15% crit chance (passive).',
    weaponType: 'sword', kind: 'passive', icon: '\uD83D\uDDE1\uFE0F',
    effect: { critChanceBonus: 15 },
    mutators: [
      { id: 'sword_ke_dmg', name: 'Lethal Edge', description: 'Swap to +20% crit damage', effectOverride: { critChanceBonus: 0, critMultiplierBonus: 20 } },
      { id: 'sword_ke_bal', name: 'Balanced Edge', description: '+8% crit chance + 8% crit damage', effectOverride: { critChanceBonus: 8, critMultiplierBonus: 8 } },
    ],
  },

  // ==================== Axe — High damage, slow ====================
  {
    id: 'axe_cleave', name: 'Cleave', description: '1.5x damage + double clears for 20s.',
    weaponType: 'axe', kind: 'active', icon: '\uD83E\uDE93',
    duration: 20, cooldown: 90,
    effect: { damageMult: 1.5, doubleClears: true },
    mutators: [
      { id: 'axe_cl_dur', name: 'Relentless Cleave', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
      { id: 'axe_cl_dmg', name: 'Brutal Cleave', description: '+2x damage (total 3x) but no double clears', effectOverride: { damageMult: 3.0, doubleClears: false } },
    ],
  },
  {
    id: 'axe_berserker_rage', name: 'Berserker Rage', description: '3x damage for 12s.',
    weaponType: 'axe', kind: 'active', icon: '\uD83D\uDD25',
    duration: 12, cooldown: 60,
    effect: { damageMult: 3.0 },
    mutators: [
      { id: 'axe_br_speed', name: 'Frenzied Rage', description: '+50% attack speed during', effectOverride: { attackSpeedMult: 1.5 } },
      { id: 'axe_br_dur', name: 'Sustained Rage', description: '+6s duration', effectOverride: {}, durationBonus: 6 },
    ],
  },
  {
    id: 'axe_heavy_blows', name: 'Heavy Blows', description: '+20% damage (passive).',
    weaponType: 'axe', kind: 'passive', icon: '\uD83D\uDCA2',
    effect: { damageMult: 1.2 },
    mutators: [
      { id: 'axe_hb_crit', name: 'Devastating Blows', description: 'Swap to +15% crit damage', effectOverride: { damageMult: 1.0, critMultiplierBonus: 15 } },
      { id: 'axe_hb_mats', name: 'Scavenging Blows', description: '+10% material drops', effectOverride: { damageMult: 1.1, materialDropMult: 1.1 } },
    ],
  },

  // ==================== Mace — Tanky, consistent ====================
  {
    id: 'mace_shockwave', name: 'Shockwave', description: '1.3x damage + ignore hazards for 15s.',
    weaponType: 'mace', kind: 'active', icon: '\uD83D\uDCA5',
    duration: 15, cooldown: 75,
    effect: { damageMult: 1.3, ignoreHazards: true },
    mutators: [
      { id: 'mace_sw_dur', name: 'Lingering Shockwave', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
      { id: 'mace_sw_def', name: 'Defensive Shockwave', description: '+2x defense during', effectOverride: { defenseMult: 2.0 } },
    ],
  },
  {
    id: 'mace_fortify', name: 'Fortify', description: '3x defense for 20s.',
    weaponType: 'mace', kind: 'active', icon: '\uD83C\uDFF0',
    duration: 20, cooldown: 60,
    effect: { defenseMult: 3.0 },
    mutators: [
      { id: 'mace_fo_resist', name: 'Elemental Fortify', description: '+25 all resists during', effectOverride: { resistBonus: 25 } },
      { id: 'mace_fo_dur', name: 'Iron Wall', description: '+10s duration', effectOverride: {}, durationBonus: 10 },
    ],
  },
  {
    id: 'mace_crushing_force', name: 'Crushing Force', description: '+10% damage + 10 all resists (passive).',
    weaponType: 'mace', kind: 'passive', icon: '\uD83D\uDD28',
    effect: { damageMult: 1.1, resistBonus: 10 },
    mutators: [
      { id: 'mace_cf_tank', name: 'Iron Skin', description: 'Swap to +20 resists, no damage', effectOverride: { damageMult: 1.0, resistBonus: 20 } },
      { id: 'mace_cf_dmg', name: 'Crushing Power', description: 'Swap to +20% damage, no resists', effectOverride: { damageMult: 1.2, resistBonus: 0 } },
    ],
  },

  // ==================== Dagger — Fast, crit-focused ====================
  {
    id: 'dagger_flurry', name: 'Flurry', description: '3x attack speed for 10s.',
    weaponType: 'dagger', kind: 'active', icon: '\u26A1',
    duration: 10, cooldown: 45,
    effect: { attackSpeedMult: 3.0 },
    mutators: [
      { id: 'dagger_fl_crit', name: 'Critical Flurry', description: '+15% crit chance during', effectOverride: { critChanceBonus: 15 } },
      { id: 'dagger_fl_dur', name: 'Extended Flurry', description: '+5s duration', effectOverride: {}, durationBonus: 5 },
    ],
  },
  {
    id: 'dagger_shadow_strike', name: 'Shadow Strike', description: '+50% crit + 100% crit damage for 8s.',
    weaponType: 'dagger', kind: 'active', icon: '\uD83C\uDF11',
    duration: 8, cooldown: 60,
    effect: { critChanceBonus: 50, critMultiplierBonus: 100 },
    mutators: [
      { id: 'dagger_ss_dur', name: 'Lingering Shadow', description: '+5s duration', effectOverride: {}, durationBonus: 5 },
      { id: 'dagger_ss_dmg', name: 'Assassinate', description: '+50% damage during', effectOverride: { damageMult: 1.5 } },
    ],
  },
  {
    id: 'dagger_lethality', name: 'Lethality', description: '+25% crit damage (passive).',
    weaponType: 'dagger', kind: 'passive', icon: '\uD83D\uDDE1\uFE0F',
    effect: { critMultiplierBonus: 25 },
    mutators: [
      { id: 'dagger_le_chance', name: 'Precision', description: 'Swap to +10% crit chance', effectOverride: { critMultiplierBonus: 0, critChanceBonus: 10 } },
      { id: 'dagger_le_speed', name: 'Quick Hands', description: '+15% crit dmg + 10% attack speed', effectOverride: { critMultiplierBonus: 15, attackSpeedMult: 1.1 } },
    ],
  },

  // ==================== Staff — Magic, elemental ====================
  {
    id: 'staff_arcane_blast', name: 'Arcane Blast', description: '2.5x damage for 12s.',
    weaponType: 'staff', kind: 'active', icon: '\u2728',
    duration: 12, cooldown: 75,
    effect: { damageMult: 2.5 },
    mutators: [
      { id: 'staff_ab_dur', name: 'Sustained Blast', description: '+6s duration', effectOverride: {}, durationBonus: 6 },
      { id: 'staff_ab_xp', name: 'Enlightened Blast', description: '+25% XP during', effectOverride: { xpMult: 1.25 } },
    ],
  },
  {
    id: 'staff_elemental_ward', name: 'Elemental Ward', description: '+50 all resists for 15s.',
    weaponType: 'staff', kind: 'active', icon: '\uD83D\uDD2E',
    duration: 15, cooldown: 60,
    effect: { resistBonus: 50 },
    mutators: [
      { id: 'staff_ew_dur', name: 'Lasting Ward', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
      { id: 'staff_ew_def', name: 'Barrier Ward', description: '+2x defense during', effectOverride: { defenseMult: 2.0 } },
    ],
  },
  {
    id: 'staff_wisdom', name: 'Wisdom', description: '+15% XP gain (passive).',
    weaponType: 'staff', kind: 'passive', icon: '\uD83D\uDCD6',
    effect: { xpMult: 1.15 },
    mutators: [
      { id: 'staff_wi_drops', name: 'Scholar\'s Insight', description: 'Swap to +10% item drops', effectOverride: { xpMult: 1.0, itemDropMult: 1.1 } },
      { id: 'staff_wi_both', name: 'Balanced Wisdom', description: '+8% XP + 5% item drops', effectOverride: { xpMult: 1.08, itemDropMult: 1.05 } },
    ],
  },

  // ==================== Wand — Fast magic, utility ====================
  {
    id: 'wand_chain_lightning', name: 'Chain Lightning', description: '1.8x damage + 1.5x materials for 15s.',
    weaponType: 'wand', kind: 'active', icon: '\u26A1',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, materialDropMult: 1.5 },
    mutators: [
      { id: 'wand_cl_dur', name: 'Sustained Lightning', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
      { id: 'wand_cl_items', name: 'Magnetic Lightning', description: 'Swap materials to +1.3x item drops', effectOverride: { materialDropMult: 1.0, itemDropMult: 1.3 } },
    ],
  },
  {
    id: 'wand_time_warp', name: 'Time Warp', description: '2x clear speed for 10s.',
    weaponType: 'wand', kind: 'active', icon: '\u231B',
    duration: 10, cooldown: 90,
    effect: { clearSpeedMult: 2.0 },
    mutators: [
      { id: 'wand_tw_dur', name: 'Extended Warp', description: '+5s duration', effectOverride: {}, durationBonus: 5 },
      { id: 'wand_tw_drops', name: 'Temporal Harvest', description: '+1.3x material drops during', effectOverride: { materialDropMult: 1.3 } },
    ],
  },
  {
    id: 'wand_mystic_insight', name: 'Mystic Insight', description: '+10% item drops (passive).',
    weaponType: 'wand', kind: 'passive', icon: '\uD83D\uDC41\uFE0F',
    effect: { itemDropMult: 1.1 },
    mutators: [
      { id: 'wand_mi_mats', name: 'Material Insight', description: 'Swap to +15% material drops', effectOverride: { itemDropMult: 1.0, materialDropMult: 1.15 } },
      { id: 'wand_mi_both', name: 'Dual Insight', description: '+5% items + 8% materials', effectOverride: { itemDropMult: 1.05, materialDropMult: 1.08 } },
    ],
  },

  // ==================== Bow — Ranged, speed ====================
  {
    id: 'bow_rapid_fire', name: 'Rapid Fire', description: '2x attack speed for 15s.',
    weaponType: 'bow', kind: 'active', icon: '\uD83C\uDFF9',
    duration: 15, cooldown: 60,
    effect: { attackSpeedMult: 2.0 },
    mutators: [
      { id: 'bow_rf_dur', name: 'Sustained Fire', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
      { id: 'bow_rf_crit', name: 'Precise Fire', description: '+15% crit chance during', effectOverride: { critChanceBonus: 15 } },
    ],
  },
  {
    id: 'bow_piercing_shot', name: 'Piercing Shot', description: 'Ignore hazards for 12s.',
    weaponType: 'bow', kind: 'active', icon: '\u27A1\uFE0F',
    duration: 12, cooldown: 75,
    effect: { ignoreHazards: true },
    mutators: [
      { id: 'bow_ps_dmg', name: 'Power Shot', description: '+1.5x damage during', effectOverride: { damageMult: 1.5 } },
      { id: 'bow_ps_dur', name: 'Sustained Pierce', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
    ],
  },
  {
    id: 'bow_eagle_eye', name: 'Eagle Eye', description: '+10% item drops (passive).',
    weaponType: 'bow', kind: 'passive', icon: '\uD83E\uDD85',
    effect: { itemDropMult: 1.1 },
    mutators: [
      { id: 'bow_ee_crit', name: 'Hawk Eye', description: 'Swap to +8% crit chance', effectOverride: { itemDropMult: 1.0, critChanceBonus: 8 } },
      { id: 'bow_ee_speed', name: 'Quick Draw', description: '+5% item drops + 5% attack speed', effectOverride: { itemDropMult: 1.05, attackSpeedMult: 1.05 } },
    ],
  },

  // ==================== Crossbow — Heavy ranged, burst ====================
  {
    id: 'crossbow_power_shot', name: 'Power Shot', description: '4x damage for 5s.',
    weaponType: 'crossbow', kind: 'active', icon: '\uD83D\uDCA3',
    duration: 5, cooldown: 90,
    effect: { damageMult: 4.0 },
    mutators: [
      { id: 'xbow_ps_dur', name: 'Sustained Power', description: '+4s duration', effectOverride: {}, durationBonus: 4 },
      { id: 'xbow_ps_crit', name: 'Guaranteed Crit', description: '+50% crit chance during', effectOverride: { critChanceBonus: 50 } },
    ],
  },
  {
    id: 'crossbow_explosive_bolt', name: 'Explosive Bolt', description: '2x damage + 1.5x materials for 15s.',
    weaponType: 'crossbow', kind: 'active', icon: '\uD83D\uDCA5',
    duration: 15, cooldown: 75,
    effect: { damageMult: 2.0, materialDropMult: 1.5 },
    mutators: [
      { id: 'xbow_eb_dur', name: 'Chain Explosions', description: '+8s duration', effectOverride: {}, durationBonus: 8 },
      { id: 'xbow_eb_double', name: 'Cluster Bolt', description: 'Add double clears', effectOverride: { doubleClears: true } },
    ],
  },
  {
    id: 'crossbow_steady_aim', name: 'Steady Aim', description: '+20% crit, -10% attack speed (passive).',
    weaponType: 'crossbow', kind: 'passive', icon: '\uD83C\uDFAF',
    effect: { critChanceBonus: 20, attackSpeedMult: 0.9 },
    mutators: [
      { id: 'xbow_sa_pure', name: 'Pure Aim', description: '+15% crit, no speed penalty', effectOverride: { critChanceBonus: 15, attackSpeedMult: 1.0 } },
      { id: 'xbow_sa_power', name: 'Heavy Bolts', description: '+10% crit + 10% damage, -15% speed', effectOverride: { critChanceBonus: 10, damageMult: 1.1, attackSpeedMult: 0.85 } },
    ],
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

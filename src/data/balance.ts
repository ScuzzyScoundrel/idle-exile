// ============================================================
// Idle Exile — Centralized Balance Config
// All tunable game constants in one file.
// ============================================================

import type { CurrencyType, AffixTier, ResolvedStats, RareMaterialRarity, Rarity } from '../types';

// =============================================
// LOOT & DROP RATES
// =============================================

/** Base probability of an item dropping per zone clear. */
export const BASE_ITEM_DROP_CHANCE = 0.08;        // was 0.25

/** Multiplier applied to item drop chance when zone is mastered. */
export const MASTERY_DROP_BONUS = 1.15;

/** Material drops per clear (gathering base): uniform random in [min, max]. */
export const MATERIAL_DROP_MIN = 2;               // was 1
export const MATERIAL_DROP_MAX = 4;               // was 2

/** Combat-specific material drop rates (lower than gathering). */
export const COMBAT_MATERIAL_DROP_CHANCE = 0.30;   // 30% chance per clear
export const COMBAT_MATERIAL_DROP_MIN = 1;
export const COMBAT_MATERIAL_DROP_MAX = 2;

/** Per-clear probability for each currency type. */
export const CURRENCY_DROP_CHANCES: Record<CurrencyType, number> = {
  augment: 0.10,   // was 0.06
  chaos:   0.05,   // was 0.03
  divine:  0.025,  // was 0.015
  annul:   0.025,  // was 0.015
  exalt:   0.015,  // was 0.008
  socket:  0.035,  // was 0.02
};

/** Gold gained per clear = GOLD_PER_BAND * zone.band. */
export const GOLD_PER_BAND = 3;                   // was 8

/** XP gained per clear = XP_PER_BAND * zone.band. */
export const XP_PER_BAND = 10;

/** Bag upgrade drop chance per clear. */
export const BAG_DROP_CHANCE = 0.015;

// =============================================
// COMBAT & CLEAR SPEED
// =============================================

/** charPower divisor in clearTime formula: baseClearTime / (charPower / POWER_DIVISOR). */
export const POWER_DIVISOR = 50;

/** Exponential penalty per level below zone iLvlMin. 10 levels below = 1.12^10 ~ 3.1x. */
export const LEVEL_PENALTY_BASE = 1.12;

/** Clear time floor as fraction of baseClearTime (prevents instant clears). */
export const CLEAR_TIME_FLOOR_RATIO = 0.2;

/** Hazard penalty floor: resist at 0 vs threshold gives this multiplier (0.05 = 95% slower). */
export const HAZARD_PENALTY_FLOOR = 0.05;

/** Minor benefit when resist exceeds threshold. */
export const HAZARD_OVERCAP_MULT = 0.95;

// =============================================
// CHARACTER PROGRESSION
// =============================================

/** Starting stats for a fresh level 1 character. */
export const BASE_STATS: ResolvedStats = {
  damage: 10, attackSpeed: 1, critChance: 5, critDamage: 150,
  life: 100, armor: 0, dodgeChance: 0, abilityHaste: 0,
  fireResist: 0, coldResist: 0, lightningResist: 0, poisonResist: 0, chaosResist: 0,
};

/** Flat damage gained per level beyond 1. */
export const DAMAGE_PER_LEVEL = 2;

/** Flat life gained per level beyond 1. */
export const LIFE_PER_LEVEL = 5;

/** XP curve: XP to next level = XP_BASE * XP_GROWTH^(level-1). */
export const XP_BASE = 100;
export const XP_GROWTH = 1.5;

// =============================================
// ITEM GENERATION
// =============================================

/** Tier drop weights: T10 most common, T1 rarest. */
export const TIER_WEIGHTS: Record<AffixTier, number> = {
  10: 20, 9: 18, 8: 16, 7: 13, 6: 10, 5: 8, 4: 6, 3: 4, 2: 3, 1: 2,
};

/** How many affixes an item rolls (weighted). */
export const AFFIX_COUNT_WEIGHTS: { count: number; weight: number }[] = [
  { count: 2, weight: 35 },
  { count: 3, weight: 30 },
  { count: 4, weight: 20 },
  { count: 5, weight: 10 },
  { count: 6, weight: 5 },
];

// =============================================
// REFINEMENT
// =============================================

/** Gold cost per refinement tier. */
export const REFINEMENT_GOLD_PER_TIER: Record<number, number> = {
  1: 5, 2: 15, 3: 30, 4: 60, 5: 100, 6: 200,
};

// =============================================
// CRAFTING PROFESSIONS
// =============================================

/** XP earned per craft by tier. */
export const CRAFTING_XP_PER_TIER: Record<number, number> = {
  1: 15, 2: 30, 3: 50, 4: 80, 5: 120, 6: 180,
};

// =============================================
// RARE MATERIALS & CATALYSTS
// =============================================

/** Base rare drop rates per rarity per band (6-element arrays for bands 1-6). */
export const RARE_DROP_BASE_RATES: Record<RareMaterialRarity, number[]> = {
  common:    [0.08,   0.10,   0.12,   0.14,   0.16,   0.18],
  uncommon:  [0.01,   0.02,   0.03,   0.04,   0.05,   0.07],
  rare:      [0.001,  0.003,  0.005,  0.01,   0.015,  0.025],
  epic:      [0.0001, 0.0005, 0.001,  0.002,  0.005,  0.01],
  legendary: [0,      0.0001, 0.0002, 0.0005, 0.001,  0.003],
};

/** When a catalyst is used in crafting: rare mat rarity → guaranteed minimum output rarity. */
export const CATALYST_RARITY_MAP: Record<RareMaterialRarity, Rarity> = {
  common: 'uncommon',
  uncommon: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: 'legendary', // legendary catalyst = legendary + bonus affix roll
};

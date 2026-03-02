// ============================================================
// Idle Exile — Centralized Balance Config
// All tunable game constants in one file.
// ============================================================

import type { CurrencyType, AffixTier, ResolvedStats, RareMaterialRarity, Rarity } from '../types';

// =============================================
// LOOT & DROP RATES
// =============================================

/** Base probability of an item dropping per zone clear. */
export const BASE_ITEM_DROP_CHANCE = 0.08;

/** Multiplier applied to item drop chance when zone is mastered. */
export const MASTERY_DROP_BONUS = 1.15;

/** Material drops per clear (gathering base): uniform random in [min, max]. */
export const MATERIAL_DROP_MIN = 2;
export const MATERIAL_DROP_MAX = 4;

/** Combat-specific material drop rates (lower than gathering). */
export const COMBAT_MATERIAL_DROP_CHANCE = 0.30;
export const COMBAT_MATERIAL_DROP_MIN = 1;
export const COMBAT_MATERIAL_DROP_MAX = 2;

/** Per-clear probability for each currency type. */
export const CURRENCY_DROP_CHANCES: Record<CurrencyType, number> = {
  augment:        0.10,
  chaos:          0.05,
  divine:         0.025,
  annul:          0.025,
  exalt:          0.015,
  greater_exalt:  0.002,
  perfect_exalt:  0.0002,
  socket:         0.035,
};

/** Gold gained per clear = GOLD_PER_BAND * zone.band. */
export const GOLD_PER_BAND = 4;

/** XP gained per clear = XP_PER_BAND * zone.band. */
export const XP_PER_BAND = 10;

/** Bag upgrade drop chance per clear. */
export const BAG_DROP_CHANCE = 0.015;

// =============================================
// COMBAT & CLEAR SPEED
// =============================================

/** charPower divisor in clearTime formula: baseClearTime / (charPower / POWER_DIVISOR).
 *  Tuned for offense-only charPower (defEff removed from clear speed in 8E). */
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
// ZONE COMBAT CONSTANTS (new v16)
// =============================================

/** Base zone physical damage used in defensive efficiency formula. */
export const ZONE_PHYS_DAMAGE_BASE = 50;

/** Base zone accuracy for hit chance calculation. */
export const ZONE_ACCURACY_BASE = 50;

/** Divisor for accuracy-based hit chance: hitChance = accuracy / (accuracy + ACCURACY_DIVISOR). */
export const ACCURACY_DIVISOR = 500;

/** Block damage reduction multiplier (blocked hits deal 25% damage). */
export const BLOCK_REDUCTION = 0.75;

/** Maximum block chance percentage. */
export const BLOCK_CAP = 75;

// =============================================
// CHARACTER PROGRESSION
// =============================================

/** Starting stats for a fresh level 1 character (all ~30 keys). */
export const BASE_STATS: ResolvedStats = {
  // Attack
  flatPhysDamage: 8,
  flatAtkFireDamage: 0,
  flatAtkColdDamage: 0,
  flatAtkLightningDamage: 0,
  flatAtkChaosDamage: 0,
  attackSpeed: 0,
  accuracy: 250,
  incPhysDamage: 0,
  incAttackDamage: 0,
  // Spell
  spellPower: 0,
  flatSpellFireDamage: 0,
  flatSpellColdDamage: 0,
  flatSpellLightningDamage: 0,
  flatSpellChaosDamage: 0,
  castSpeed: 0,
  incSpellDamage: 0,
  // Shared Offensive
  incElementalDamage: 0,
  incFireDamage: 0,
  incColdDamage: 0,
  incLightningDamage: 0,
  critChance: 5,
  critMultiplier: 150,
  abilityHaste: 0,
  // Defensive
  maxLife: 100,
  incMaxLife: 0,
  lifeRegen: 0,
  armor: 0,
  evasion: 0,
  blockChance: 0,
  fireResist: 0,
  coldResist: 0,
  lightningResist: 0,
  chaosResist: 0,
  // Utility
  movementSpeed: 0,
  itemQuantity: 0,
  itemRarity: 0,
};

/** Flat physical damage gained per level beyond 1. */
export const PHYS_DAMAGE_PER_LEVEL = 1;

/** Flat max life gained per level beyond 1. */
export const MAX_LIFE_PER_LEVEL = 5;

/** Flat accuracy gained per level beyond 1. */
export const ACCURACY_PER_LEVEL = 5;

/** XP curve: XP to next level = XP_BASE * XP_GROWTH^(level-1). */
export const XP_BASE = 100;
export const XP_GROWTH = 1.5;

// =============================================
// ITEM GENERATION
// =============================================

/**
 * iLvl-scaled affix tier weights.
 * At low iLvl: high tiers (T10) dominate, low tiers (T1) near-impossible.
 * At iLvl cap: T10 still most common, T1 still rare (chase tier).
 * Formula: lerp(TIER_LOW_WEIGHTS[tier], TIER_HIGH_WEIGHTS[tier], clamp(iLvl / TIER_ILVL_CAP, 0, 1))
 */
export const TIER_ILVL_CAP = 70;
/** Weights at iLvl 0 — high tiers dominate completely. */
export const TIER_LOW_WEIGHTS: Record<AffixTier, number> = {
  10: 50, 9: 40, 8: 30, 7: 20, 6: 12, 5: 6, 4: 3, 3: 1, 2: 0.3, 1: 0.02,
};
/** Weights at iLvl cap — T1 is still a chase tier (~1.4%), T10 still most common (~20%). */
export const TIER_HIGH_WEIGHTS: Record<AffixTier, number> = {
  10: 15, 9: 13, 8: 11, 7: 9, 6: 8, 5: 7, 4: 5, 3: 3, 2: 2, 1: 1,
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
  legendary: 'legendary',
};

/** Rare catalyst → one affix forced to this tier (breaks iLvl gating). */
export const CATALYST_BEST_TIER: Record<RareMaterialRarity, AffixTier> = {
  common: 6,
  uncommon: 5,
  rare: 3,
  epic: 2,
  legendary: 1,
};

/** Rare catalyst → iLvl bonus on crafted items (higher rarity = better affix tier weights). */
export const CATALYST_ILVL_BONUS: Record<RareMaterialRarity, number> = {
  common: 3,
  uncommon: 6,
  rare: 10,
  epic: 15,
  legendary: 20,
};

// =============================================
// COMBAT & BOSS MECHANICS
// =============================================

/** maxHp fraction taken at worst defenses per normal clear. */
export const CLEAR_DAMAGE_RATIO = 0.15;
/** maxHp fraction regenerated per normal clear. */
export const CLEAR_REGEN_RATIO = 0.08;

/** Damage amp per level underleveled (exponential). 5 levels under = 1.76x damage taken. */
export const LEVEL_DAMAGE_BASE = 1.12;
/** Damage reduction per level overleveled (linear). 5 levels over = 0.70x damage. */
export const OVERLEVEL_DAMAGE_REDUCTION = 0.06;
/** Minimum damage multiplier when overleveled (floor). */
export const OVERLEVEL_DAMAGE_FLOOR = 0.30;
/** Unavoidable net damage per level gap when underleveled (fraction of maxHp). Harsh. */
export const UNDERLEVEL_MIN_NET_DAMAGE = 0.02;
/** Zone pressure increase per iLvl above band base (intra-band difficulty gradient). */
export const ZONE_ILVL_PRESSURE_SCALE = 0.04;
/** Normal clears between boss encounters. */
export const BOSS_INTERVAL = 10;
/** Base boss HP (band 1). Scales with band^2. Overgeared players melt it fast — that's intended. */
export const BOSS_BASE_HP = 150;
/** Boss damage multiplier (tuning knob). Set to 1.0 in 8E-2 — base pressure formula handles scaling. */
export const BOSS_DAMAGE_MULTIPLIER = 1.0;

/** Boss DPS base: combined with band^1.5 for per-band scaling. */
export const BOSS_DPS_BASE = 4;

/** Zone-specific boss variation: baseClearTime * this factor added to base pressure. */
export const BOSS_DPS_ZONE_FACTOR = 0.2;

/** Each unresisted hazard adds this fraction of base pressure as bonus boss damage. */
export const BOSS_HAZARD_DAMAGE_RATIO = 0.15;
/** Boss drops at iLvlMax + this. */
export const BOSS_ILVL_BONUS = 5;
export const BOSS_DROP_COUNT_MIN = 1;
export const BOSS_DROP_COUNT_MAX = 2;
/** Seconds of celebration after boss victory (shows loot + fight stats). */
export const BOSS_VICTORY_DURATION = 5.0;
/** Seconds of recovery after boss defeat (HP regens visually). */
export const BOSS_DEFEAT_RECOVERY = 5.0;
/** Fraction of missing HP healed after boss victory (1.0 = full heal). */
export const BOSS_VICTORY_HEAL_RATIO = 0.6;

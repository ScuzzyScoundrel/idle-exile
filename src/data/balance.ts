// ============================================================
// Idle Exile — Centralized Balance Config
// All tunable game constants in one file.
// ============================================================

import type { CurrencyType, AffixTier, ResolvedStats, RareMaterialRarity, Rarity, GemTier } from '../types';

// =============================================
// BANK
// =============================================

/** Number of item slots per bank tab. */
export const BANK_TAB_CAPACITY = 20;
/** Maximum number of purchasable bank tabs. */
export const BANK_MAX_TABS = 10;
/** Gold cost of the first bank tab (doubles each tab). */
export const BANK_TAB_BASE_COST = 500;
/** Exponential cost multiplier per tab. */
export const BANK_TAB_COST_MULT = 2;

/** Gold cost to buy the next bank tab (0-indexed tabCount = tabs already owned). */
export function getBankTabCost(tabCount: number): number {
  return BANK_TAB_BASE_COST * Math.pow(BANK_TAB_COST_MULT, tabCount);
}

// =============================================
// LOOT & DROP RATES
// =============================================

/** Base probability of an item dropping per zone clear. */
export const BASE_ITEM_DROP_CHANCE = 0.06;

/** Multiplier applied to item drop chance when zone is mastered. */
export const MASTERY_DROP_BONUS = 1.15;

/** Material drops per clear (gathering base): uniform random in [min, max]. */
export const MATERIAL_DROP_MIN = 2;
export const MATERIAL_DROP_MAX = 6;

/** Combat-specific material drop rates (lower than gathering). */
export const COMBAT_MATERIAL_DROP_CHANCE = 0.30;
export const COMBAT_MATERIAL_DROP_MIN = 1;
export const COMBAT_MATERIAL_DROP_MAX = 2;

/** Per-clear probability for each currency type. */
export const CURRENCY_DROP_CHANCES: Record<CurrencyType, number> = {
  chaos:          0.018,
  divine:         0.008,
  annul:          0.008,
  exalt:          0.02,
  greater_exalt:  0.005,
  perfect_exalt:  0.0007,
  socket:         0.012,
};

/** Gold per clear: round(GOLD_BASE * band^GOLD_BAND_EXPONENT) = 3, 8, 14, 22, 33, 47. */
export const GOLD_BASE = 3;
export const GOLD_BAND_EXPONENT = 1.4;

/** @deprecated Use GOLD_BASE + GOLD_BAND_EXPONENT instead. Kept for reference. */
export const GOLD_PER_BAND = 4;

/** Currency drop multiplier by band — higher bands give more currency per clear. */
export const CURRENCY_BAND_MULTIPLIER: Record<number, number> = {
  1: 1.0, 2: 1.05, 3: 1.10, 4: 1.20, 5: 1.35, 6: 1.50,
};

/** XP gained per clear = XP_PER_BAND * zone.band + XP_ILVL_SCALE * zone.iLvlMin. */
export const XP_PER_BAND = 10;

/** Bonus XP per zone iLvl — rewards pushing to harder zones within a band. */
export const XP_ILVL_SCALE = 0.5;

/** Bag upgrade drop chance per clear. */
export const BAG_DROP_CHANCE = 0.015;

// =============================================
// COMBAT & CLEAR SPEED
// =============================================

/** charPower divisor in clearTime formula: baseClearTime / (charPower / POWER_DIVISOR).
 *  Tuned for offense-only charPower (defEff removed from clear speed in 8E). */
export const POWER_DIVISOR = 25;

/** Exponential penalty per level below zone iLvlMin. 10 levels below = 1.08^5 * sqrt(1.08^5) ~ 1.75x. */
export const LEVEL_PENALTY_BASE = 1.08;

/** Clear time floor as fraction of baseClearTime (prevents instant clears).
 *  0.10 = zone 1 floor is 1.0s, zone 26 floor is 7.8s. DPS investment halves clear time vs 0.20. */
export const CLEAR_TIME_FLOOR_RATIO = 0.15;

/** Hazard penalty floor: resist at 0 vs threshold gives this multiplier (0.05 = 95% slower). */
export const HAZARD_PENALTY_FLOOR = 0.05;

/** Minor benefit when resist exceeds threshold. */
export const HAZARD_OVERCAP_MULT = 0.95;

/** Flat resistance penalty per band — forces resist investment in later content. */
export const BAND_RESIST_PENALTY: Record<number, number> = {
  1: 0,     // Greenlands — no penalty
  2: -5,    // Frontier — slight pressure
  3: -15,   // Contested — must actively gear resist
  4: -30,   // Dark Reaches — resist is tight (median ~70 raw → ~40 effective)
  5: -40,   // Shattered Realm — resist is a real constraint
  6: -75,   // Endlands — every resist roll matters
};

/** Minimum effective resistance (at -100% you take 200% ele damage). */
export const RESIST_FLOOR = -100;

/** Maximum effective resistance (extract existing magic number). */
export const RESIST_CAP = 75;

/** Per-band multiplier on elemental damage portion — makes ele damage scale with progression. */
export const BAND_ELE_DAMAGE_MULT: Record<number, number> = {
  1: 1.0,   // no amplification
  2: 1.15,  // slight pressure
  3: 1.4,   // ele damage becoming real
  4: 1.8,   // must invest in resists
  5: 2.2,   // resist is life
  6: 3.0,   // uncapped = death
};

// =============================================
// ZONE COMBAT CONSTANTS (new v16)
// =============================================

/** Base zone physical damage used in defensive efficiency formula. */
export const ZONE_PHYS_DAMAGE_BASE = 50;

/** Base zone accuracy for hit chance calculation. */
export const ZONE_ACCURACY_BASE = 200;

/** Divisor for accuracy-based hit chance: hitChance = accuracy / (accuracy + ACCURACY_DIVISOR). */
export const ACCURACY_DIVISOR = 50;

/** Outgoing damage penalty base per level underleveled. Softened for balance v2. */
export const OUTGOING_DAMAGE_PENALTY_BASE = 1.06;
/** Minimum outgoing damage multiplier (floor). */
export const OUTGOING_DAMAGE_PENALTY_FLOOR = 0.10;

/** Accuracy scaling per level the player is below zone iLvlMin. */
export const UNDERLEVEL_ACCURACY_SCALE = 0.10;

/** Block damage reduction multiplier (blocked hits deal 25% damage). */
export const BLOCK_REDUCTION = 0.75;

/** Maximum block chance percentage. */
export const BLOCK_CAP = 75;

/** Maximum dodge chance percentage. */
export const DODGE_CAP = 75;

/** Dodged hits still deal this fraction of raw damage (not full avoidance). */
export const DODGE_DAMAGE_FLOOR = 0.00;

/** Min hit chance — even at cap evasion, 1 in 20 always lands. */
export const EVASION_MIN_HIT_CHANCE = 5;

/** Diminishing returns exponent on evasion contest formula.
 *  dodgeChance = (evasion / (evasion + accuracy))^exponent
 *  1.0 = linear (current), 1.2 = needs ~2x evasion for same dodge%. */
export const EVASION_DR_EXPONENT = 1.2;

/** Armor formula coefficient: armor / (armor + ARMOR_COEFFICIENT * physDmg). Lower = more effective. */
export const ARMOR_COEFFICIENT = 3;
/** Flat DR from armor: 1% per ARMOR_FLAT_DR_RATIO armor points. */
export const ARMOR_FLAT_DR_RATIO = 60;
/** Maximum flat DR from armor (25%). */
export const ARMOR_FLAT_DR_CAP = 0.25;

// =============================================
// CHARACTER PROGRESSION
// =============================================

/** Hard level cap — characters cannot exceed this level. */
export const MAX_LEVEL = 60;

/** Starting stats for a fresh level 1 character (all ~30 keys). */
export const BASE_STATS: ResolvedStats = {
  // Attack
  flatPhysDamage: 8,
  flatAtkFireDamage: 0,
  flatAtkColdDamage: 0,
  flatAtkLightningDamage: 0,
  flatAtkChaosDamage: 0,
  baseAttackSpeed: 0,
  incAttackSpeed: 0,
  attackSpeed: 0,
  accuracy: 250,
  baseCritChance: 0,
  incCritChance: 0,
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
  incChaosDamage: 0,
  // Multiplicative Offense
  firePenetration: 0,
  coldPenetration: 0,
  lightningPenetration: 0,
  chaosPenetration: 0,
  dotMultiplier: 0,
  weaponMastery: 0,
  // Delivery
  incMeleeDamage: 0,
  incProjectileDamage: 0,
  incAoEDamage: 0,
  incDoTDamage: 0,
  incChannelDamage: 0,
  critChance: 5,
  critMultiplier: 150,
  // abilityHaste removed — speed stats now reduce cooldowns directly
  // Defensive
  maxLife: 100,
  incMaxLife: 0,
  lifeRegen: 1.5,
  armor: 0,
  incArmor: 0,
  evasion: 0,
  incEvasion: 0,
  blockChance: 0,
  fireResist: 0,
  coldResist: 0,
  lightningResist: 0,
  chaosResist: 0,
  allResist: 0,
  // Energy Shield
  energyShield: 0,
  incEnergyShield: 0,
  esRecharge: 0,
  esCombatRecharge: 0,
  // Utility
  movementSpeed: 0,
  itemQuantity: 0,
  itemRarity: 0,
  // Sustain
  ailmentDuration: 0,
  lifeLeechPercent: 0,
  lifeOnHit: 0,
  lifeOnKill: 0,
  lifeOnDodgePercent: 0,
  lifeRecoveryPerHit: 0,
  // Build depth
  cooldownRecovery: 0,
  fortifyEffect: 0,
  damageTakenReduction: 0,
  // Armor-to-Elemental (plate exclusive)
  armorToElemental: 0,
  // Unique item mechanics
  doublePoisonHalfDamage: 0,
  alwaysChill: 0,
  incDamageVsChilled: 0,
  damageOnHitSelfPercent: 0,
  incDamagePerMissingLifePercent: 0,
  onHitGainDamagePercent: 0,
  onHitGainDamageMaxStacks: 0,
  enhancedCurseEffect: 0,
  moreDotVsCursed: 0,
  dodgeGrantsAttackSpeedPercent: 0,
  dodgeAttackSpeedMaxStacks: 0,
  physToFireConversion: 0,
  burnExplosionPercent: 0,
  moreDotDamage: 0,
  cannotLeech: 0,
  buffExpiryResetCd: 0,
  extraChaosDamagePercent: 0,
  maxLifePenaltyPercent: 0,
  // Ailment scaling (Dagger v2)
  ailmentPotency: 0,
  ailmentTickSpeedMult: 0,
};

/** Flat physical damage gained per level beyond 1. */
export const PHYS_DAMAGE_PER_LEVEL = 1;

/** Flat max life gained per level beyond 1. */
export const MAX_LIFE_PER_LEVEL = 5;

/** Flat accuracy gained per level beyond 1. */
export const ACCURACY_PER_LEVEL = 5;

/** XP curve: XP to next level = XP_BASE * XP_GROWTH^(level-1). */
export const XP_BASE = 100;
export const XP_GROWTH = 1.12;

// =============================================
// ITEM GENERATION
// =============================================

/**
 * iLvl-scaled affix tier weights.
 * At low iLvl: high tiers (T10) dominate, low tiers (T1) near-impossible.
 * At iLvl cap: T10 still most common, T1 still rare (chase tier).
 * Formula: lerp(TIER_LOW_WEIGHTS[tier], TIER_HIGH_WEIGHTS[tier], clamp(iLvl / TIER_ILVL_CAP, 0, 1))
 */
export const TIER_ILVL_CAP = 60;
/** Weights at iLvl 0 — high tiers dominate completely. */
export const TIER_LOW_WEIGHTS: Record<AffixTier, number> = {
  10: 50, 9: 40, 8: 30, 7: 20, 6: 12, 5: 6, 4: 3, 3: 1, 2: 0.3, 1: 0.02,
};
/** Weights at iLvl cap — bell curve peaks at T6, T1 still chase (~2%). */
export const TIER_HIGH_WEIGHTS: Record<AffixTier, number> = {
  10: 3, 9: 5, 8: 8, 7: 12, 6: 15, 5: 13, 4: 10, 3: 6, 2: 3, 1: 1.5,
};

/** Hard floor on affix tiers by iLvl — prevents absurdly high tiers at low levels.
 *  Each entry: [maxILvl, minTier]. E.g. iLvl 1-9 can only roll T8+. */
export const AFFIX_TIER_FLOOR_BY_ILVL: [number, number][] = [
  [9,  8],   // iLvl 1-9:   T8+ only
  [19, 6],   // iLvl 10-19: T6+ only
  [29, 4],   // iLvl 20-29: T4+ only
  [39, 3],   // iLvl 30-39: T3+ only
  [49, 2],   // iLvl 40-49: T2+ only
  // iLvl 50+: no floor
];

/** How many affixes an item rolls (weighted). Default/Band 1 weights. */
export const AFFIX_COUNT_WEIGHTS: { count: number; weight: number }[] = [
  { count: 2, weight: 35 },
  { count: 3, weight: 30 },
  { count: 4, weight: 20 },
  { count: 5, weight: 10 },
  { count: 6, weight: 5 },
];

/** Per-band affix count weights. Higher bands guarantee more affixes. */
export const AFFIX_COUNT_WEIGHTS_BY_BAND: Record<number, { count: number; weight: number }[]> = {
  1: [{ count: 2, weight: 35 }, { count: 3, weight: 30 }, { count: 4, weight: 20 }, { count: 5, weight: 10 }, { count: 6, weight: 5 }],
  2: [{ count: 2, weight: 30 }, { count: 3, weight: 30 }, { count: 4, weight: 22 }, { count: 5, weight: 12 }, { count: 6, weight: 6 }],
  3: [{ count: 2, weight: 15 }, { count: 3, weight: 30 }, { count: 4, weight: 28 }, { count: 5, weight: 17 }, { count: 6, weight: 10 }],
  4: [{ count: 2, weight: 5 },  { count: 3, weight: 20 }, { count: 4, weight: 35 }, { count: 5, weight: 25 }, { count: 6, weight: 15 }],
  5: [{ count: 4, weight: 40 }, { count: 5, weight: 35 }, { count: 6, weight: 25 }],
  6: [{ count: 4, weight: 30 }, { count: 5, weight: 40 }, { count: 6, weight: 30 }],
};

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
// FORTIFY
// =============================================

/** Maximum fortify stacks (hard cap). */
export const FORTIFY_MAX_STACKS = 20;
/** Maximum damage reduction from fortify (75%). */
export const FORTIFY_MAX_DR = 0.75;

// =============================================
// COMBAT & BOSS MECHANICS
// =============================================

/** maxHp fraction regenerated per normal clear (passive base regen). */
export const CLEAR_REGEN_RATIO = 0.08;

/** Damage amp per level underleveled (exponential, softcapped). Reduced from 1.12 for balance v2. */
export const LEVEL_DAMAGE_BASE = 1.08;
/** Damage reduction per level overleveled (linear). 5 levels over = 0.70x damage. */
export const OVERLEVEL_DAMAGE_REDUCTION = 0.10;
/** Minimum damage multiplier when overleveled (floor). */
export const OVERLEVEL_DAMAGE_FLOOR = 0.50;
/** Unavoidable net damage per level gap when underleveled (fraction of maxHp). Harsh. */
export const UNDERLEVEL_MIN_NET_DAMAGE = 0.02;
/** Zone pressure increase per iLvl above band base (intra-band difficulty gradient). */
export const ZONE_ILVL_PRESSURE_SCALE = 0.04;
/** Normal clears between boss encounters. */
export const BOSS_INTERVAL = 10;
/** Base boss HP (band 1). Scales with linear ramp + iLvl component. */
export const BOSS_BASE_HP = 400;
/** Boss HP ramp: HP = base * band * (1 + BOSS_HP_RAMP * (band - 1)) + BOSS_HP_ILVL_SCALE * iLvlMin * band. */
export const BOSS_HP_RAMP = 0.40;
/** iLvl-based boss HP scaling — makes bosses harder within each band. */
export const BOSS_HP_ILVL_SCALE = 3.0;
/** Intra-band boss HP scaling: each bandIndex adds this fraction more HP. */
export const BOSS_BAND_INDEX_SCALE = 0.08;
/** @deprecated Use BOSS_DAMAGE_MULT instead. Kept for reference. */
export const BOSS_DMG_RAMP = 0.30;
/** Each unresisted hazard adds this fraction of base boss damage as bonus elemental damage. */
export const BOSS_HAZARD_DAMAGE_RATIO = 0.15;
/** Boss drops at iLvlMax + this. Barely bridges to next band. */
export const BOSS_ILVL_BONUS = 3;
export const BOSS_DROP_COUNT_MIN = 1;
export const BOSS_DROP_COUNT_MAX = 2;
/** Seconds of celebration after boss victory (shows loot + fight stats). */
export const BOSS_VICTORY_DURATION = 5.0;
/** Seconds of recovery after boss defeat (HP regens visually). */
export const BOSS_DEFEAT_RECOVERY = 5.0;
/** Fraction of missing HP healed after boss victory (1.0 = full heal). */
export const BOSS_VICTORY_HEAL_RATIO = 0.6;

// =============================================
// PER-HIT DEFENSE SYSTEM
// =============================================

/** Seconds between zone attacks during normal clears. */
export const ZONE_ATTACK_INTERVAL = 2.0;
/** Base zone damage per hit at band 1. Scales linearly with band. */
export const ZONE_DMG_BASE = 9;
/** Per-iLvl damage scaling so zones get harder within a band. */
export const ZONE_DMG_ILVL_SCALE = 1.2;
/** Fraction of zone damage that's physical (rest is elemental). */
export const ZONE_PHYS_RATIO = 0.5;
/** @deprecated Use BOSS_DAMAGE_MULT instead. Boss damage now mirrors mob damage * multiplier. */
export const BOSS_DMG_PER_HIT_BASE = 5;
/** Boss damage multiplier: bosses hit this many times harder than zone mobs. */
export const BOSS_DAMAGE_MULT = 2.25;
/** Boss crit chance per attack (15%). */
export const BOSS_CRIT_CHANCE = 0.15;
/** Boss crit damage multiplier. */
export const BOSS_CRIT_MULTIPLIER = 1.5;
/** Mob crit chance per attack (5%). */
export const MOB_CRIT_CHANCE = 0.05;
/** Mob crit damage multiplier. */
export const MOB_CRIT_MULTIPLIER = 1.3;
/** Max boss damage per hit as fraction of player maxHP (prevents one-shots). */
export const BOSS_MAX_DMG_RATIO = 99.0;
/** Seconds between boss attacks. */
export const BOSS_ATTACK_INTERVAL = 1.5;
/** Innate life leech: fraction of damage dealt that heals player. */
export const LEECH_PERCENT = 0.04;
/** Base regen cap ratio (floor — always heal at least 30% maxHP). */
export const BASE_REGEN_CAP_RATIO = 0.20;
/** Extra regen cap per point of damage mitigated, normalized to maxHP. */
export const REGEN_CAP_PER_MITIGATED = 0.003;
/** Hard ceiling on dynamic regen cap. */
export const MAX_REGEN_CAP_RATIO = 0.80;

/** Underlevel softcap: growth slows to sqrt after this many levels under. */
export const UNDERLEVEL_SOFTCAP = 5;

/** Death penalty: base seconds lost on death (Band 1). */
export const DEATH_RESPAWN_BASE = 5.0;
/** Death penalty: extra seconds per band beyond 1. */
export const DEATH_RESPAWN_PER_BAND = 5.0;
/** Death penalty: max base penalty in seconds. */
export const DEATH_RESPAWN_CAP = 45.0;
/** Death streak: each consecutive death adds this fraction more penalty. */
export const DEATH_STREAK_MULT = 0.5;
/** Death streak: maximum streak multiplier. */
export const DEATH_STREAK_CAP = 3.0;
/** Death streak: streak resets after this many seconds without dying. */
export const DEATH_STREAK_WINDOW = 60.0;

/** Offline idle: death penalty multiplier (stacks with streak/band). */
export const OFFLINE_DEATH_PENALTY_MULT = 5.0;
/** Offline idle: extra penalty per level below zone iLvlMin. */
export const OFFLINE_DEATH_UNDERLEVEL_PER_LEVEL = 0.15;

// =============================================
// SKILL AUTO-CAST
// =============================================

/** Global cooldown between skill activations (seconds). */
export const SKILL_GCD = 1.0;

/** Global cooldown between active skill rotation casts (seconds). */
export const ACTIVE_SKILL_GCD = 1.0;

/** Base GCD before speed reduction (seconds). Speed compresses this. */
export const BASE_GCD = 1.0;

/** Absolute minimum cast/GCD interval (seconds). Prevents degenerate tick rates. */
export const GCD_FLOOR = 0.4;

/** Maximum skill level (applies to all skill kinds). */
export const SKILL_MAX_LEVEL = 30;

/** Talent tree tier gate thresholds — points-in-branch required to unlock each tier (index = tier-1). */
export const TALENT_TIER_GATES = [0, 2, 4, 7, 10, 11, 12] as const;

/** Real-time combat tick interval (ms). Documents engine tick rate. */
export const COMBAT_TICK_INTERVAL = 250;

// =============================================
// MOB TYPES & TARGETED FARMING
// =============================================

/** @deprecated — replaced by per-mob MobDrop.chance values in Sprint 12B. */
export const MOB_UNIQUE_DROP_CHANCE = 0.25;

// =============================================
// DAILY QUESTS
// =============================================

/** Kill quest required counts per band (index 0 = band 1). */
export const QUEST_KILL_COUNTS = [150, 200, 250, 300, 400, 500];

/** Zone clear quest required counts per band. */
export const QUEST_CLEAR_COUNTS = [100, 125, 150, 200, 250, 300];

/** Boss defeat quest required counts per band. */
export const QUEST_BOSS_COUNTS = [5, 8, 10, 12, 15, 20];

/** Base gold reward per quest per band. Kill quests get 1.5x, boss quests get 2x. */
export const QUEST_GOLD_REWARD = [200, 500, 1000, 2000, 4000, 8000];

/** Base XP reward per quest per band. Kill quests get 1.5x, boss quests get 2x. */
export const QUEST_XP_REWARD = [100, 250, 500, 1000, 2000, 4000];

/** Clear speed penalty multiplier when targeted farming (1.0 = no penalty). */
export const TARGETED_FARMING_SPEED_PENALTY = 1.0;

// =============================================
// COMPONENT CRAFTING
// =============================================

/** Gold cost for component recipes per band. [general, specialist] */
export const COMPONENT_GOLD_COST: Record<number, { general: number; specialist: number }> = {
  1: { general: 5, specialist: 8 },
  2: { general: 10, specialist: 12 },
  3: { general: 20, specialist: 25 },
  4: { general: 30, specialist: 35 },
  5: { general: 50, specialist: 60 },
  6: { general: 80, specialist: 100 },
};

/** XP earned per component craft — same as crafting a gear item of that tier. */
export const COMPONENT_XP_PER_BAND: Record<number, number> = {
  1: 15, 2: 30, 3: 50, 4: 80, 5: 120, 6: 180,
};

export const CRAFT_OUTPUT_BUFFER_SIZE = 8;
export const CRAFT_LOG_MAX_ENTRIES = 50;

// =============================================
// PROFESSION GEAR
// =============================================

/** Chance per combat clear to drop profession gear. */
export const PROFESSION_GEAR_DROP_CHANCE = 0.01;

/** Chance per gathering clear to drop profession gear. */
export const PROFESSION_GEAR_GATHER_DROP_CHANCE = 0.02;

/** Profession gear always rolls exactly 4 affixes (2 prefix + 2 suffix). */
export const PROFESSION_GEAR_AFFIX_COUNT = 4;

/** Maximum gold cost reduction from profession gear (50%). */
export const MAX_GOLD_EFFICIENCY = 0.50;

// =============================================
// CRAFTING PATTERNS
// =============================================

/** Chance per zone clear to drop a crafting pattern, by band. */
export const PATTERN_DROP_CHANCE_PER_BAND: Record<number, number> = {
  1: 0.005, 2: 0.006, 3: 0.008,
};

/** Chance per boss kill to drop a crafting pattern, by band. */
export const BOSS_PATTERN_DROP_CHANCE: Record<number, number> = {
  1: 0.05, 2: 0.06, 3: 0.08,
};

/** Bonus drop chance for patterns during void invasions. */
export const INVASION_PATTERN_DROP_BONUS = 0.03;

/** Chance per boss kill to drop a unique pattern, by band. */
export const UNIQUE_PATTERN_DROP_CHANCE: Record<number, number> = {
  1: 0.06, 2: 0.06, 3: 0.07, 4: 0.08,
};

/** Chance per boss kill to drop a boss trophy material. */
export const BOSS_TROPHY_DROP_CHANCE = 0.25;

/** Charge ranges for patterns by source type. */
export const PATTERN_CHARGES: Record<string, { min: number; max: number }> = {
  zone_drop: { min: 3, max: 6 },
  boss_drop: { min: 5, max: 10 },
  invasion_drop: { min: 3, max: 8 },
};

/** Patterns give 2x crafting XP. */
export const PATTERN_XP_MULT = 2.0;

// =============================================
// ZONE MASTERY MILESTONES
// =============================================

export const MASTERY_MILESTONES = [
  { threshold: 25,  tier: 'bronze' as const, goldMult: 50,  xpMult: 25,  iLvlPick: 'min' as const, dropBonus: 0.05, matBonus: 0.05 },
  { threshold: 100, tier: 'silver' as const, goldMult: 150, xpMult: 75,  iLvlPick: 'mid' as const, dropBonus: 0.10, matBonus: 0.10 },
  { threshold: 500, tier: 'gold'   as const, goldMult: 500, xpMult: 250, iLvlPick: 'max' as const, dropBonus: 0.15, matBonus: 0.15 },
] as const;

// =============================================
// VOID INVASIONS
// =============================================

/** Minimum ms between invasions per band. */
export const INVASION_MIN_COOLDOWN_MS = 30 * 60 * 1000;
/** Minimum invasion duration in ms. */
export const INVASION_DURATION_MIN_MS = 30 * 60 * 1000;
/** Maximum invasion duration in ms. */
export const INVASION_DURATION_MAX_MS = 60 * 60 * 1000;
/** Chance per tick (250ms) to start invasion after cooldown expires. */
export const INVASION_ROLL_CHANCE = 0.001;
/** Chance that an item dropped during invasion gains a void implicit. */
export const CORRUPTION_DROP_CHANCE = 0.25;
/** Mob HP multiplier during void invasions (stacks with mob hpMultiplier). */
export const INVASION_DIFFICULTY_MULT = 1.3;

/** Maximum material preservation chance from profession gear (50%). */
export const MAX_MATERIAL_SAVE = 0.50;

// =============================================
// CONDITIONAL / PROC SYSTEM
// =============================================

/** Window (ms) for onBlock/onDodge trigger conditions to count as recent. */
export const BLOCK_DODGE_RECENCY_WINDOW = 3000;

// =============================================
// MULTI-MOB PACKS
// =============================================

/** Pack size weights [x1, x2, x3, x4, x5] by band tier. */
export const PACK_SIZE_WEIGHTS: Record<string, number[]> = {
  early: [80, 15, 5, 0, 0],   // bands 1-2
  mid:   [50, 25, 15, 8, 2],  // bands 3-4
  late:  [30, 25, 20, 15, 10], // bands 5-6
};

// =============================================
// RARE MOBS
// =============================================

/** Chance per encounter to be a rare mob, by band (1-indexed). */
export const RARE_CHANCE_BY_BAND: Record<number, number> = {
  1: 0.05, 2: 0.08, 3: 0.10, 4: 0.12, 5: 0.15, 6: 0.18,
};

/** Number of affixes a rare mob rolls, by band (1-indexed). */
export const RARE_AFFIX_COUNT: Record<number, { min: number; max: number }> = {
  1: { min: 1, max: 1 },
  2: { min: 1, max: 1 },
  3: { min: 1, max: 2 },
  4: { min: 1, max: 3 },
  5: { min: 2, max: 3 },
  6: { min: 2, max: 4 },
};

// =============================================
// SOCKET GEMS
// =============================================

/** Base chance per zone clear to drop a gem. */
export const GEM_DROP_CHANCE = 0.04;

/** Gem drop chance multiplier by band (higher bands = more gems). */
export const GEM_DROP_BAND_MULT: Record<number, number> = {
  1: 1.0, 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.5, 6: 1.8,
};

/** Gem tier drop weights by band. Higher bands unlock better tiers. */
export const GEM_TIER_WEIGHTS_BY_BAND: Record<number, Record<GemTier, number>> = {
  1: { 5: 90, 4: 10, 3: 0, 2: 0, 1: 0 },
  2: { 5: 70, 4: 25, 3: 5, 2: 0, 1: 0 },
  3: { 5: 45, 4: 35, 3: 15, 2: 5, 1: 0 },
  4: { 5: 25, 4: 35, 3: 25, 2: 12, 1: 3 },
  5: { 5: 10, 4: 25, 3: 35, 2: 20, 1: 10 },
  6: { 5: 5, 4: 15, 3: 30, 2: 30, 1: 20 },
};

/** Boss kill: guaranteed gem drop at minimum this tier (by band). */
export const BOSS_GEM_MIN_TIER: Record<number, GemTier> = {
  1: 5, 2: 4, 3: 4, 4: 3, 5: 3, 6: 2,
};

/** Gold cost for 3-to-1 gem upgrade by output tier. */
export const GEM_UPGRADE_GOLD_COST: Record<GemTier, number> = {
  5: 0, 4: 50, 3: 200, 2: 800, 1: 3000,
};

/** Maximum gems in player's gem inventory. */
export const GEM_INVENTORY_CAP = 50;

// =============================================
// UNIQUE ITEM REFORGING
// =============================================

/** Reforge cost per target band. Uses refined mats of the target band + alchemist catalyst + essence + gold. */
export const REFORGE_COST_PER_BAND: Record<number, {
  goldCost: number;
  essenceCost: number;
  refinedMats: { materialId: string; amount: number }[];
  alchemistCatalyst: string;
}> = {
  1: {
    goldCost: 150,
    essenceCost: 10,
    refinedMats: [
      { materialId: 'cindite_ingot', amount: 5 },
      { materialId: 'cured_leather', amount: 5 },
      { materialId: 'wispbloom_extract', amount: 3 },
    ],
    alchemistCatalyst: 'vitality_essence',
  },
  2: {
    goldCost: 500,
    essenceCost: 25,
    refinedMats: [
      { materialId: 'ferrite_ingot', amount: 6 },
      { materialId: 'hardened_leather', amount: 6 },
      { materialId: 'potent_tincture', amount: 4 },
    ],
    alchemistCatalyst: 'vitality_essence',
  },
  3: {
    goldCost: 1500,
    essenceCost: 50,
    refinedMats: [
      { materialId: 'forged_alloy', amount: 8 },
      { materialId: 'reinforced_leather', amount: 8 },
      { materialId: 'lustral_essence', amount: 5 },
    ],
    alchemistCatalyst: 'vitality_essence',
  },
  4: {
    goldCost: 4000,
    essenceCost: 80,
    refinedMats: [
      { materialId: 'voidsteel_ingot', amount: 10 },
      { materialId: 'shadowleather', amount: 10 },
      { materialId: 'shadow_elixir', amount: 6 },
    ],
    alchemistCatalyst: 'vitality_essence',
  },
  5: {
    goldCost: 10000,
    essenceCost: 120,
    refinedMats: [
      { materialId: 'celesteel_ingot', amount: 12 },
      { materialId: 'dreadleather', amount: 12 },
      { materialId: 'tempest_distillate', amount: 8 },
    ],
    alchemistCatalyst: 'vitality_essence',
  },
  6: {
    goldCost: 25000,
    essenceCost: 200,
    refinedMats: [
      { materialId: 'primordial_ingot', amount: 15 },
      { materialId: 'primordial_leather', amount: 15 },
      { materialId: 'primordial_essence', amount: 10 },
    ],
    alchemistCatalyst: 'vitality_essence',
  },
};

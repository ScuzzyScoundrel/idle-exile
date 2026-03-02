// ============================================================
// Idle Exile — Zone & Idle Simulation Engine (v16)
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ZoneDef, IdleRunResult, Item, CurrencyType, GearSlot, ResolvedStats, AbilityEffect, GatheringProfession, BossState, CombatClearResult, ActiveSkillDef } from '../types';
import { generateItem, generateGatheringItem } from './items';
import { getWeaponDamageInfo } from './character';
import { calcSkillDps, calcSkillDamagePerCast, getDefaultSkillForWeapon } from './unifiedSkills';
import { getSkillDef } from '../data/unifiedSkills';
import { calcGatheringYield } from './gathering';
import { rollRareMaterialDrop } from './rareMaterials';
import { BAG_UPGRADE_DEFS } from '../data/items';
import {
  BASE_ITEM_DROP_CHANCE, MASTERY_DROP_BONUS,
  MATERIAL_DROP_MIN, MATERIAL_DROP_MAX,
  COMBAT_MATERIAL_DROP_CHANCE, COMBAT_MATERIAL_DROP_MIN, COMBAT_MATERIAL_DROP_MAX,
  CURRENCY_DROP_CHANCES, GOLD_PER_BAND, XP_PER_BAND, BAG_DROP_CHANCE,
  POWER_DIVISOR, LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO,
  HAZARD_PENALTY_FLOOR, HAZARD_OVERCAP_MULT,
  CLEAR_REGEN_RATIO, BOSS_BASE_HP,
  BOSS_HAZARD_DAMAGE_RATIO,
  BOSS_ILVL_BONUS, BOSS_DROP_COUNT_MIN, BOSS_DROP_COUNT_MAX,
  LEVEL_DAMAGE_BASE, OVERLEVEL_DAMAGE_REDUCTION, OVERLEVEL_DAMAGE_FLOOR, UNDERLEVEL_MIN_NET_DAMAGE,
  ZONE_ATTACK_INTERVAL, ZONE_DMG_BASE, ZONE_PHYS_RATIO, ZONE_ACCURACY_BASE,
  BLOCK_CAP, BLOCK_REDUCTION,
  BOSS_DMG_PER_HIT_BASE, BOSS_ATTACK_INTERVAL,
  LEECH_PERCENT, MAX_REGEN_RATIO,
} from '../data/balance';

// --- Gear slots used for random item drops ---

const GEAR_SLOTS: GearSlot[] = [
  'mainhand', 'offhand',
  'helmet', 'neck', 'shoulders', 'cloak',
  'chest', 'bracers', 'gloves', 'belt',
  'pants', 'boots',
  'ring1', 'trinket1',
];

// --- Hazard Resist Mapping (v16: no poison, only fire/cold/lightning/chaos) ---

const HAZARD_STAT_MAP: Record<string, keyof ResolvedStats> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  chaos: 'chaosResist',
};

// --- Ability Effect Helpers ---

/** Apply ability resistBonus to stats for combat calculations. */
export function applyAbilityResists(stats: ResolvedStats, abilityEffect?: AbilityEffect): ResolvedStats {
  if (!abilityEffect?.resistBonus) return stats;
  return {
    ...stats,
    fireResist: stats.fireResist + abilityEffect.resistBonus,
    coldResist: stats.coldResist + abilityEffect.resistBonus,
    lightningResist: stats.lightningResist + abilityEffect.resistBonus,
    chaosResist: stats.chaosResist + abilityEffect.resistBonus,
  };
}

// --- Functions ---

/**
 * Calculate hazard penalty multiplier for a zone.
 */
export function calcHazardPenalty(stats: ResolvedStats, zone: ZoneDef): number {
  if (zone.hazards.length === 0) return 1.0;

  let combined = 1.0;
  for (const hazard of zone.hazards) {
    const resist = stats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    let mult: number;
    if (resist >= hazard.threshold) {
      mult = HAZARD_OVERCAP_MULT;
    } else {
      const ratio = resist / hazard.threshold;
      mult = HAZARD_PENALTY_FLOOR + (1 - HAZARD_PENALTY_FLOOR) * ratio * ratio;
    }
    combined *= mult;
  }
  return combined;
}

/**
 * Check if character meets ALL hazard thresholds for zone mastery.
 */
export function checkZoneMastery(stats: ResolvedStats, zone: ZoneDef): boolean {
  if (zone.hazards.length === 0) return true;
  for (const hazard of zone.hazards) {
    const resist = stats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    if (resist < hazard.threshold) return false;
  }
  return true;
}

/**
 * Calculate player's total DPS using skill-based or legacy formula.
 * If equippedSkills[0] is set, uses tag-based skill DPS.
 * Returns 0 if no skill is equipped and no weapon default exists.
 */
export function calcPlayerDps(char: Character, abilityEffect?: AbilityEffect, equippedSkills?: (string | null)[]): number {
  const stats = char.stats;
  const { avgDamage, spellPower } = getWeaponDamageInfo(char.equipment);

  // Apply ability effects to a modified stats copy
  const effectiveStats: ResolvedStats = { ...stats };
  if (abilityEffect?.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
  if (abilityEffect?.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

  let dps: number;

  // Try skill-based DPS first
  const activeSkillId = equippedSkills?.[0];
  const skillDef = activeSkillId ? getSkillDef(activeSkillId) : null;

  if (skillDef) {
    // Skill-based DPS (tag-based additive %inc)
    dps = calcSkillDps(skillDef, effectiveStats, avgDamage, spellPower);
  } else {
    // Auto-assign default skill based on weapon type
    const weaponType = char.equipment.mainhand?.weaponType;
    const defaultSkill = weaponType ? getDefaultSkillForWeapon(weaponType, char.level) : null;

    if (defaultSkill) {
      dps = calcSkillDps(defaultSkill, effectiveStats, avgDamage, spellPower);
    } else {
      // No skill equipped and no weapon default — can't deal damage
      dps = 0;
    }
  }

  // Apply ability damage multiplier
  dps *= (abilityEffect?.damageMult ?? 1);
  // Apply ability attack speed multiplier (boosts all components)
  dps *= (abilityEffect?.attackSpeedMult ?? 1);

  return dps;
}

/**
 * Calculate how long (in seconds) a character takes to clear a zone.
 * Uses skill-based DPS when equippedSkills provided, otherwise legacy formula.
 * classDamageMult: Warrior rage / Mage charge damage bonus (default 1.0).
 * classSpeedMult: Rogue momentum speed bonus (default 1.0).
 */
export function calcClearTime(
  char: Character,
  zone: ZoneDef,
  abilityEffect?: AbilityEffect,
  classDamageMult: number = 1.0,
  classSpeedMult: number = 1.0,
  equippedSkills?: (string | null)[],
): number {
  const playerDps = calcPlayerDps(char, abilityEffect, equippedSkills) * classDamageMult;

  // Apply ability resist bonus to stats for hazard calculations
  const effectiveStats = applyAbilityResists(char.stats, abilityEffect);

  // Defense does NOT affect clear speed (8E philosophy: offense=speed, defense=survivability).
  // Only hazards slow you down if resists are lacking.
  const hazardMult = abilityEffect?.ignoreHazards ? 1.0 : calcHazardPenalty(effectiveStats, zone);
  const charPower = playerDps * hazardMult;

  let clearTime = zone.baseClearTime / (charPower / POWER_DIVISOR);

  // Level scaling: exponential penalty for being under-leveled
  const levelDelta = Math.max(0, zone.iLvlMin - char.level);
  if (levelDelta > 0) {
    clearTime *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);
  }

  const floor = zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO;

  // Apply clearSpeedMult after base calc (ability + class)
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1) * classSpeedMult;
  clearTime = Math.max(floor, clearTime);

  return clearTime;
}

/**
 * Simulate one combat clear with per-hit rolls (crits, misses, DoT ticks).
 * Used for real-time clears only — offline uses expected-value calcClearTime().
 *
 * Returns raw fight time BEFORE clear speed / floor / level penalty adjustments.
 * The caller (store) applies those post-sim modifiers.
 */
export function simulateCombatClear(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  mobHp: number,
  abilityDamageMult: number,
  abilityAttackSpeedMult: number,
): CombatClearResult {
  const baseDmgPerCast = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower) * abilityDamageMult;
  if (baseDmgPerCast <= 0) {
    return { clearTime: 999, totalCasts: 0, hits: 0, crits: 0, misses: 0, totalDamage: 0, dotDamage: 0 };
  }

  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  // Hit chance: attacks use accuracy formula, spells always hit
  const hitChance = isAttack ? stats.accuracy / (stats.accuracy + 500) : 1.0;

  // Crit
  const critChance = Math.min(stats.critChance, 100) / 100;
  const critDmgMult = stats.critMultiplier / 100; // e.g. 150 -> 1.5x

  // Speed
  let speedMult = 1.0;
  if (isAttack) speedMult = (1 + stats.attackSpeed / 100) * abilityAttackSpeedMult;
  if (isSpell) speedMult = (1 + stats.castSpeed / 100) * abilityAttackSpeedMult;
  const castInterval = skill.castTime / speedMult;

  // DoT tracking
  interface DotStack { remaining: number; dps: number; }
  const dotStacks: DotStack[] = [];
  const hasDoT = !!(skill.dotDuration && skill.dotDamagePercent);

  let remainingHp = mobHp;
  let elapsed = 0;
  let totalCasts = 0;
  let hits = 0;
  let crits = 0;
  let misses = 0;
  let totalDamage = 0;
  let dotDamage = 0;

  const MAX_CASTS = 500; // Safety cap

  while (remainingHp > 0 && totalCasts < MAX_CASTS) {
    // (a) Tick active DoT stacks for castInterval
    for (let i = dotStacks.length - 1; i >= 0; i--) {
      const stack = dotStacks[i];
      const tickTime = Math.min(castInterval, stack.remaining);
      const tickDmg = stack.dps * tickTime;
      remainingHp -= tickDmg;
      totalDamage += tickDmg;
      dotDamage += tickDmg;
      stack.remaining -= castInterval;
      if (stack.remaining <= 0) dotStacks.splice(i, 1);
    }

    // (b) Check if mob died from DoTs
    if (remainingHp <= 0) break;

    // (c) Roll hit
    totalCasts++;
    if (Math.random() > hitChance) {
      misses++;
      elapsed += castInterval;
      continue;
    }

    // (d) Roll crit
    const isCrit = Math.random() < critChance;
    if (isCrit) crits++;
    hits++;

    // (e) Damage with +/-10% variance
    const variance = 0.9 + Math.random() * 0.2;
    const damage = baseDmgPerCast * variance * (isCrit ? critDmgMult : 1);

    // (f) Apply damage
    remainingHp -= damage;
    totalDamage += damage;

    // (g) Apply DoT if skill has one
    if (hasDoT && remainingHp > 0) {
      dotStacks.push({
        remaining: skill.dotDuration!,
        dps: damage * skill.dotDamagePercent!,
      });
    }

    // (h) Advance time
    elapsed += castInterval;
  }

  return {
    clearTime: Math.max(0.1, elapsed),
    totalCasts,
    hits,
    crits,
    misses,
    totalDamage,
    dotDamage,
  };
}

/**
 * XP scaling based on player level vs zone iLvl.
 * Overleveled zones give drastically reduced XP.
 * Each level above zone = -10% XP. Floor at 10%.
 */
export function calcXpScale(playerLevel: number, zoneIlvl: number): number {
  return Math.max(0.1, Math.min(1.0, 1 - (playerLevel - zoneIlvl) * 0.1));
}

/**
 * Simulate an idle run: given elapsed time and a pre-computed clearTime,
 * calculate how many zone clears happened and accumulate all drops, XP, and gold.
 * Caller is responsible for computing clearTime (via computeNextClear or similar).
 */
export function simulateIdleRun(
  char: Character,
  zone: ZoneDef,
  elapsed: number,
  clearTime: number,
  abilityEffect?: AbilityEffect,
): IdleRunResult {
  const clearsCompleted = clearTime > 0 && isFinite(clearTime) ? Math.floor(elapsed / clearTime) : 0;

  const hasMastery = checkZoneMastery(char.stats, zone);

  const items: IdleRunResult['items'] = [];
  const materials: Record<string, number> = {};
  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
  };
  const bagDrops: Record<string, number> = {};

  let itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;
  itemDropChance *= (abilityEffect?.itemDropMult ?? 1);

  const matMult = (abilityEffect?.materialDropMult ?? 1);
  const xpMult = abilityEffect?.xpMult ?? 1;
  const doubleClear = abilityEffect?.doubleClears ?? false;

  for (let i = 0; i < clearsCompleted; i++) {
    if (Math.random() < itemDropChance) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
      items.push(generateItem(slot, dropILvl));
    }

    if (Math.random() < COMBAT_MATERIAL_DROP_CHANCE) {
      const baseMats = COMBAT_MATERIAL_DROP_MIN + Math.floor(Math.random() * (COMBAT_MATERIAL_DROP_MAX - COMBAT_MATERIAL_DROP_MIN + 1));
      const matCount = Math.round(baseMats * matMult) * (doubleClear ? 2 : 1);
      for (let m = 0; m < matCount; m++) {
        const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
        materials[mat] = (materials[mat] ?? 0) + 1;
      }
    }

    for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
      if (Math.random() < chance) {
        currencyDrops[type as CurrencyType] += doubleClear ? 2 : 1;
      }
    }

    if (Math.random() < BAG_DROP_CHANCE) {
      const eligible = BAG_UPGRADE_DEFS.filter(b => b.tier <= zone.band);
      if (eligible.length > 0) {
        const bagId = eligible[Math.floor(Math.random() * eligible.length)].id;
        bagDrops[bagId] = (bagDrops[bagId] ?? 0) + 1;
      }
    }
  }

  const xpScale = calcXpScale(char.level, zone.iLvlMin);
  const xpGained = Math.round(XP_PER_BAND * zone.band * clearsCompleted * xpMult * xpScale);
  const goldGained = GOLD_PER_BAND * zone.band * clearsCompleted * (doubleClear ? 2 : 1);

  return { items, materials, currencyDrops, bagDrops, xpGained, goldGained, clearsCompleted, elapsed };
}

// --- Single Clear Result ---

export interface SingleClearResult {
  item: Item | null;
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  goldGained: number;
  xpGained: number;
  bagDrop: string | null;
}

/**
 * Generate drops for ONE zone clear. Pure function.
 * Optional classRareFindBonus / classMaterialYieldBonus from Ranger tracking.
 */
export function simulateSingleClear(
  char: Character,
  zone: ZoneDef,
  abilityEffect?: AbilityEffect,
  classRareFindBonus: number = 0,
  classMaterialYieldBonus: number = 0,
): SingleClearResult {
  const hasMastery = checkZoneMastery(char.stats, zone);
  let itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;
  itemDropChance *= (abilityEffect?.itemDropMult ?? 1);
  if (classRareFindBonus > 0) itemDropChance *= (1 + classRareFindBonus);

  const matMult = (abilityEffect?.materialDropMult ?? 1);
  const xpMult = abilityEffect?.xpMult ?? 1;
  const doubleClear = abilityEffect?.doubleClears ?? false;

  let item: Item | null = null;
  if (Math.random() < itemDropChance) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    item = generateItem(slot, dropILvl);
  }

  const materials: Record<string, number> = {};
  if (Math.random() < COMBAT_MATERIAL_DROP_CHANCE) {
    const baseMats = COMBAT_MATERIAL_DROP_MIN + Math.floor(Math.random() * (COMBAT_MATERIAL_DROP_MAX - COMBAT_MATERIAL_DROP_MIN + 1));
    const yieldMult = 1 + classMaterialYieldBonus; // Ranger tracking bonus
    const matCount = Math.round(baseMats * matMult * yieldMult) * (doubleClear ? 2 : 1);
    for (let m = 0; m < matCount; m++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      materials[mat] = (materials[mat] ?? 0) + 1;
    }
  }

  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
  };
  for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
    if (Math.random() < chance) {
      currencyDrops[type as CurrencyType] += doubleClear ? 2 : 1;
    }
  }

  let bagDrop: string | null = null;
  if (Math.random() < BAG_DROP_CHANCE) {
    const eligible = BAG_UPGRADE_DEFS.filter(b => b.tier <= zone.band);
    if (eligible.length > 0) {
      bagDrop = eligible[Math.floor(Math.random() * eligible.length)].id;
    }
  }

  const xpScale = calcXpScale(char.level, zone.iLvlMin);
  return {
    item,
    materials,
    currencyDrops,
    goldGained: GOLD_PER_BAND * zone.band * (doubleClear ? 2 : 1),
    xpGained: Math.round(XP_PER_BAND * zone.band * xpMult * xpScale),
    bagDrop,
  };
}

// --- Gathering Clear ---

export interface GatheringClearResult {
  materials: Record<string, number>;
  gatheringXp: number;
  gatheringGearDrop: Item | null;
  rareMaterialDrops: Record<string, number>;
}

/**
 * Simulate a single gathering clear.
 */
export function simulateGatheringClear(
  skillLevel: number,
  zone: ZoneDef,
  profession: GatheringProfession,
  yieldMult: number = 1.0,
  doubleGatherChance: number = 0,
  rareFindBonus: number = 0,
): GatheringClearResult {
  const materials: Record<string, number> = {};

  const baseMats = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
  const totalYield = calcGatheringYield(skillLevel) * yieldMult;
  let matCount = Math.round(baseMats * totalYield);

  if (doubleGatherChance > 0 && Math.random() < doubleGatherChance) {
    matCount *= 2;
  }

  for (let i = 0; i < matCount; i++) {
    const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
    materials[mat] = (materials[mat] ?? 0) + 1;
  }

  const gatheringXp = 5 * zone.band;

  let gatheringGearDrop: Item | null = null;
  if (Math.random() < 0.02) {
    const gearSlots: GearSlot[] = ['helmet', 'gloves', 'boots', 'belt', 'chest'];
    const slot = gearSlots[Math.floor(Math.random() * gearSlots.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    gatheringGearDrop = generateGatheringItem(slot, dropILvl);
  }

  const rareMaterialDrops: Record<string, number> = {};
  const rareDrop = rollRareMaterialDrop(profession, zone.band, rareFindBonus);
  if (rareDrop) {
    rareMaterialDrops[rareDrop.id] = 1;
  }

  return { materials, gatheringXp, gatheringGearDrop, rareMaterialDrops };
}

// ============================================================
// Combat HP & Boss Mechanics
// ============================================================

/**
 * Level-based damage multiplier for combat.
 * Underleveled: exponential — zones hit MUCH harder.
 * Overleveled: linear reduction with floor — trivial farm.
 */
export function calcLevelDamageMult(playerLevel: number, zoneILvlMin: number): number {
  const delta = zoneILvlMin - playerLevel;
  if (delta > 0) {
    // Underleveled: exponential damage increase
    return Math.pow(LEVEL_DAMAGE_BASE, delta);
  } else if (delta < 0) {
    // Overleveled: linear damage reduction, floor at OVERLEVEL_DAMAGE_FLOOR
    return Math.max(OVERLEVEL_DAMAGE_FLOOR, 1 + delta * OVERLEVEL_DAMAGE_REDUCTION);
  }
  return 1.0;
}

// ── Per-Hit Defense Pipeline ──

/**
 * Roll one incoming attack through the defense pipeline:
 *   1. Dodge (evasion vs accuracy)
 *   2. Block (chance, blocked hits deal 25% damage)
 *   3. Armor mitigation (PoE-style, physical portion only)
 *   4. Resist mitigation (elemental portion, average of capped resists)
 */
export function rollZoneAttack(
  rawDamage: number,
  physRatio: number,
  zoneAccuracy: number,
  stats: ResolvedStats,
): { damage: number; isDodged: boolean; isBlocked: boolean } {
  // 1. Dodge check
  const dodgeChance = stats.evasion / (stats.evasion + zoneAccuracy);
  if (Math.random() < dodgeChance) {
    return { damage: 0, isDodged: true, isBlocked: false };
  }

  let physDmg = rawDamage * physRatio;
  let eleDmg = rawDamage * (1 - physRatio);

  // 2. Block check
  const blockChance = Math.min(stats.blockChance, BLOCK_CAP) / 100;
  const isBlocked = Math.random() < blockChance;
  if (isBlocked) {
    physDmg *= (1 - BLOCK_REDUCTION);
    eleDmg *= (1 - BLOCK_REDUCTION);
  }

  // 3. Armor mitigation (PoE-style, physical only)
  if (physDmg > 0) {
    const armorReduction = stats.armor / (stats.armor + 5 * physDmg);
    physDmg *= (1 - armorReduction);
  }

  // 4. Resist mitigation (elemental, average of capped resists)
  if (eleDmg > 0) {
    const avgResist = (
      Math.min(stats.fireResist, 75) +
      Math.min(stats.coldResist, 75) +
      Math.min(stats.lightningResist, 75) +
      Math.min(stats.chaosResist, 75)
    ) / 4;
    eleDmg *= (1 - avgResist / 100);
  }

  return { damage: Math.max(0, physDmg + eleDmg), isDodged: false, isBlocked };
}

/**
 * Simulate all incoming zone attacks during one clear.
 * Returns new HP after damage and regen/leech.
 */
export function simulateClearDefense(
  currentHp: number, maxHp: number, stats: ResolvedStats,
  zone: ZoneDef, playerLevel: number, clearTime: number,
  playerDamageDealt: number,
): { newHp: number; totalDamage: number; dodges: number; blocks: number; hits: number } {
  const levelMult = calcLevelDamageMult(playerLevel, zone.iLvlMin);
  const hitsPerClear = Math.max(1, Math.floor(clearTime / ZONE_ATTACK_INTERVAL));
  const baseDmgPerHit = ZONE_DMG_BASE * zone.band * levelMult;
  const zoneAccuracy = ZONE_ACCURACY_BASE * (1 + (zone.band - 1) * 0.5);
  const physRatio = ZONE_PHYS_RATIO;

  let totalDamage = 0;
  let dodges = 0, blocks = 0, hits = 0;

  for (let i = 0; i < hitsPerClear; i++) {
    const variance = 0.8 + Math.random() * 0.4; // 80%-120%
    const roll = rollZoneAttack(baseDmgPerHit * variance, physRatio, zoneAccuracy, stats);
    if (roll.isDodged) { dodges++; continue; }
    if (roll.isBlocked) blocks++;
    hits++;
    totalDamage += roll.damage;
  }

  // Regen: passive + leech (capped at MAX_REGEN_RATIO of maxHP per clear)
  const passiveRegen = maxHp * CLEAR_REGEN_RATIO + stats.lifeRegen * clearTime;
  const leechHeal = playerDamageDealt * LEECH_PERCENT;
  const totalRegen = Math.min(passiveRegen + leechHeal, maxHp * MAX_REGEN_RATIO);

  // Underlevel minimum net damage (prevents immortality via regen stacking)
  let netDamage = totalDamage - totalRegen;
  const levelDelta = zone.iLvlMin - playerLevel;
  if (levelDelta > 0) {
    const minNet = maxHp * UNDERLEVEL_MIN_NET_DAMAGE * levelDelta;
    netDamage = Math.max(netDamage, minNet);
  }

  const newHp = Math.max(0, Math.min(maxHp, currentHp - netDamage));
  return { newHp, totalDamage, dodges, blocks, hits };
}

/** Boss HP pool. Scales with band^2. Overgeared players melt it — that's intended. */
export function calcBossMaxHp(zone: ZoneDef): number {
  return BOSS_BASE_HP * zone.band * zone.band;
}

/**
 * Calculate boss per-hit attack profile for the defense pipeline.
 * Returns raw damage per hit, attack interval, accuracy, and phys ratio.
 */
export function calcBossAttackProfile(char: Character, zone: ZoneDef, abilityEffect?: AbilityEffect): {
  damagePerHit: number; attackInterval: number; accuracy: number; physRatio: number;
} {
  const effectiveStats = applyAbilityResists(char.stats, abilityEffect);
  const levelMult = calcLevelDamageMult(char.level, zone.iLvlMin);
  const baseDmg = BOSS_DMG_PER_HIT_BASE * zone.band * zone.band * levelMult;

  // Hazard bonus: each unresisted hazard adds elemental damage
  let hazardBonus = 0;
  for (const hazard of zone.hazards) {
    const resist = effectiveStats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    if (resist < hazard.threshold) hazardBonus += baseDmg * BOSS_HAZARD_DAMAGE_RATIO;
  }

  return {
    damagePerHit: baseDmg + hazardBonus,
    attackInterval: BOSS_ATTACK_INTERVAL,
    accuracy: ZONE_ACCURACY_BASE * (1 + zone.band * 0.5) * 1.5, // bosses are more accurate
    physRatio: ZONE_PHYS_RATIO,
  };
}

/** Create BossState at fight start with per-hit attack profile. */
export function createBossEncounter(char: Character, zone: ZoneDef, abilityEffect?: AbilityEffect, equippedSkills?: (string | null)[]): BossState {
  const bossHp = calcBossMaxHp(zone);
  const profile = calcBossAttackProfile(char, zone, abilityEffect);
  // Compute effective DPS for UI display: dmg/interval (pre-mitigation)
  const effectiveBossDps = profile.damagePerHit / profile.attackInterval;
  return {
    bossName: zone.bossName,
    bossMaxHp: bossHp,
    bossCurrentHp: bossHp,
    playerDps: calcPlayerDps(char, abilityEffect, equippedSkills),
    bossDps: effectiveBossDps,
    bossDamagePerHit: profile.damagePerHit,
    bossAttackInterval: profile.attackInterval,
    bossNextAttackAt: Date.now(),
    bossAccuracy: profile.accuracy,
    bossPhysRatio: profile.physRatio,
    startedAt: Date.now(),
  };
}

/** Generate boss loot at boosted iLvl. */
export function generateBossLoot(zone: ZoneDef): Item[] {
  const count = BOSS_DROP_COUNT_MIN + Math.floor(Math.random() * (BOSS_DROP_COUNT_MAX - BOSS_DROP_COUNT_MIN + 1));
  const bossILvl = zone.iLvlMax + BOSS_ILVL_BONUS;
  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    items.push(generateItem(slot, bossILvl));
  }
  return items;
}

// ============================================================
// Idle Exile — Zone & Idle Simulation Engine (v16)
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, ZoneDef, IdleRunResult, Item, CurrencyType, GearSlot, ResolvedStats, AbilityEffect, GatheringProfession, BossState } from '../types';
import { generateItem, generateGatheringItem } from './items';
import { calcDefensiveEfficiency } from './setBonus';
import { calcTotalDps, getWeaponDamageInfo } from './character';
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
  CLEAR_DAMAGE_RATIO, CLEAR_REGEN_RATIO, BOSS_HP_MULTIPLIER,
  BOSS_DAMAGE_MULTIPLIER, BOSS_ILVL_BONUS, BOSS_DROP_COUNT_MIN,
  BOSS_DROP_COUNT_MAX,
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
 * Calculate player's total DPS using the new multi-component DPS formula.
 * Uses weapon info from character equipment.
 */
export function calcPlayerDps(char: Character, abilityEffect?: AbilityEffect): number {
  const stats = char.stats;
  const { avgDamage, spellPower } = getWeaponDamageInfo(char.equipment);

  // Apply ability effects to a modified stats copy
  const effectiveStats: ResolvedStats = { ...stats };
  if (abilityEffect?.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
  if (abilityEffect?.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

  let dps = calcTotalDps(effectiveStats, avgDamage, spellPower);

  // Apply ability damage multiplier
  dps *= (abilityEffect?.damageMult ?? 1);
  // Apply ability attack speed multiplier (boosts all components)
  dps *= (abilityEffect?.attackSpeedMult ?? 1);

  return dps;
}

/**
 * Calculate how long (in seconds) a character takes to clear a zone.
 * Uses the new DPS formula with weapon info.
 */
export function calcClearTime(
  char: Character,
  zone: ZoneDef,
  abilityEffect?: AbilityEffect,
): number {
  const playerDps = calcPlayerDps(char, abilityEffect);

  let defEff = calcDefensiveEfficiency(char.stats, zone.band);
  defEff *= (abilityEffect?.defenseMult ?? 1);

  const hazardMult = abilityEffect?.ignoreHazards ? 1.0 : calcHazardPenalty(char.stats, zone);
  const charPower = playerDps * defEff * hazardMult;

  let clearTime = zone.baseClearTime / (charPower / POWER_DIVISOR);

  // Level scaling: exponential penalty for being under-leveled
  const levelDelta = Math.max(0, zone.iLvlMin - char.level);
  if (levelDelta > 0) {
    clearTime *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);
  }

  const floor = zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO;

  // Apply clearSpeedMult after base calc
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1);
  clearTime = Math.max(floor, clearTime);

  return clearTime;
}

/**
 * Simulate an idle run: given elapsed time (in seconds), calculate how many
 * zone clears happened and accumulate all drops, XP, and gold.
 */
export function simulateIdleRun(
  char: Character,
  zone: ZoneDef,
  elapsed: number,
  abilityEffect?: AbilityEffect,
): IdleRunResult {
  const baseClearTime = calcClearTime(char, zone, abilityEffect);
  const clearsCompleted = Math.floor(elapsed / baseClearTime);

  const hasMastery = checkZoneMastery(char.stats, zone);

  const items: IdleRunResult['items'] = [];
  const materials: Record<string, number> = {};
  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0,
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

  const xpGained = Math.round(XP_PER_BAND * zone.band * clearsCompleted * xpMult);
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
 */
export function simulateSingleClear(
  char: Character,
  zone: ZoneDef,
  abilityEffect?: AbilityEffect,
): SingleClearResult {
  const hasMastery = checkZoneMastery(char.stats, zone);
  let itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;
  itemDropChance *= (abilityEffect?.itemDropMult ?? 1);

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
    const matCount = Math.round(baseMats * matMult) * (doubleClear ? 2 : 1);
    for (let m = 0; m < matCount; m++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      materials[mat] = (materials[mat] ?? 0) + 1;
    }
  }

  const currencyDrops: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0,
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

  return {
    item,
    materials,
    currencyDrops,
    goldGained: GOLD_PER_BAND * zone.band * (doubleClear ? 2 : 1),
    xpGained: Math.round(XP_PER_BAND * zone.band * xpMult),
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

/** Damage taken per normal clear. */
export function calcDamagePerClear(maxHp: number, defEff: number): number {
  const scale = Math.max(0, (1.0 - defEff) / 0.8); // wider range with new min 0.2
  return maxHp * CLEAR_DAMAGE_RATIO * scale;
}

/** HP regen per normal clear. */
export function calcRegenPerClear(maxHp: number): number {
  return maxHp * CLEAR_REGEN_RATIO;
}

/** Apply one clear of HP change. Floor at 1 (can't die to normal mobs). */
export function applyNormalClearHp(currentHp: number, maxHp: number, defEff: number): number {
  return Math.max(1, Math.min(maxHp, currentHp - calcDamagePerClear(maxHp, defEff) + calcRegenPerClear(maxHp)));
}

/** Boss HP pool. */
export function calcBossMaxHp(zone: ZoneDef): number {
  return zone.baseClearTime * zone.band * BOSS_HP_MULTIPLIER;
}

/** Boss DPS against player. Uses zone pressure + defenses, amplified by multiplier. */
export function calcBossDps(char: Character, zone: ZoneDef, abilityEffect?: AbilityEffect): number {
  let defEff = calcDefensiveEfficiency(char.stats, zone.band);
  defEff *= (abilityEffect?.defenseMult ?? 1);
  // Map defEff [0.2, 1.0] → damage scale [1.0, 0.0]
  const damageScale = Math.max(0, (1.0 - defEff) / 0.8);
  const zonePressure = 50 * Math.pow(2, zone.band - 1);
  return zonePressure * damageScale * BOSS_DAMAGE_MULTIPLIER;
}

/** Create BossState at fight start. */
export function createBossEncounter(char: Character, zone: ZoneDef, abilityEffect?: AbilityEffect): BossState {
  return {
    bossName: zone.bossName,
    bossMaxHp: calcBossMaxHp(zone),
    bossCurrentHp: calcBossMaxHp(zone),
    playerDps: calcPlayerDps(char, abilityEffect),
    bossDps: calcBossDps(char, zone, abilityEffect),
    startedAt: Date.now(),
  };
}

/** Tick boss fight by deltaSeconds. */
export interface BossTickResult {
  bossHp: number;
  playerHp: number;
  outcome: 'ongoing' | 'victory' | 'defeat';
}

export function tickBossFight(boss: BossState, playerHp: number, dt: number): BossTickResult {
  const newBossHp = Math.max(0, boss.bossCurrentHp - boss.playerDps * dt);
  const newPlayerHp = Math.max(0, playerHp - boss.bossDps * dt);
  if (newBossHp <= 0) return { bossHp: 0, playerHp: Math.max(1, newPlayerHp), outcome: 'victory' };
  if (newPlayerHp <= 0) return { bossHp: newBossHp, playerHp: 0, outcome: 'defeat' };
  return { bossHp: newBossHp, playerHp: newPlayerHp, outcome: 'ongoing' };
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

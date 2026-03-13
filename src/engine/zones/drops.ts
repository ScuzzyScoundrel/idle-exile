// ============================================================
// Zone Drops — mob drops, single/idle/gathering clear loot
// Extracted from engine/zones.ts (Phase C4)
// ============================================================

import type { Character, ZoneDef, IdleRunResult, Item, CurrencyType, AbilityEffect, GatheringProfession, MobTypeDef, Gem } from '../../types';
import { PROFESSION_GEAR_SLOTS } from '../../types';
import { generateItem, generateProfessionItem } from '../items';
import {
  BASE_ITEM_DROP_CHANCE, MASTERY_DROP_BONUS,
  MATERIAL_DROP_MIN, MATERIAL_DROP_MAX,
  COMBAT_MATERIAL_DROP_CHANCE, COMBAT_MATERIAL_DROP_MIN, COMBAT_MATERIAL_DROP_MAX,
  CURRENCY_DROP_CHANCES, GOLD_BASE, GOLD_BAND_EXPONENT, CURRENCY_BAND_MULTIPLIER,
  XP_PER_BAND, XP_ILVL_SCALE, BAG_DROP_CHANCE,
  PROFESSION_GEAR_DROP_CHANCE, PROFESSION_GEAR_GATHER_DROP_CHANCE,
  PATTERN_DROP_CHANCE_PER_BAND,
  MASTERY_MILESTONES,
  MAX_LEVEL,
} from '../../data/balance';
import { BAG_UPGRADE_DEFS } from '../../data/items';
import { getZoneMobTypes, weightedRandomMob, getMobTypeDef } from '../../data/mobTypes';
import { calcGatheringYield } from '../gathering';
import { rollRareMaterialDrop } from '../rareMaterials';
import { rollPatternDrop } from '../../data/craftingPatterns';
import { calcXpToNext } from '../character';
import { checkZoneMastery, calcXpScale, GEAR_SLOTS } from './scaling';
import { rollGemDrop } from '../gems';

// --- Mob Drop Rolling ---

/** Roll each drop in a mob's drop table independently. Returns materialId → quantity. */
export function rollMobDrops(mob: MobTypeDef): Record<string, number> {
  const result: Record<string, number> = {};
  for (const drop of mob.drops) {
    if (Math.random() < drop.chance) {
      const qty = drop.minQty + Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1));
      result[drop.materialId] = (result[drop.materialId] ?? 0) + qty;
    }
  }
  return result;
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
  _targetedMobId?: string | null,
): IdleRunResult {
  const clearsCompleted = clearTime > 0 && isFinite(clearTime) ? Math.floor(elapsed / clearTime) : 0;

  const hasMastery = checkZoneMastery(char.stats, zone);

  const items: IdleRunResult['items'] = [];
  const materials: Record<string, number> = {};
  const currencyDrops: Record<CurrencyType, number> = {
    chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
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
      items.push(generateItem(slot, dropILvl, undefined, undefined, zone.band));
    }

    if (Math.random() < COMBAT_MATERIAL_DROP_CHANCE) {
      const baseMats = COMBAT_MATERIAL_DROP_MIN + Math.floor(Math.random() * (COMBAT_MATERIAL_DROP_MAX - COMBAT_MATERIAL_DROP_MIN + 1));
      const matCount = Math.round(baseMats * matMult) * (doubleClear ? 2 : 1);
      for (let m = 0; m < matCount; m++) {
        const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
        materials[mat] = (materials[mat] ?? 0) + 1;
      }
    }

    // Mob drops (offline batched — roll full drop table)
    const idleMobs = getZoneMobTypes(zone.id);
    if (idleMobs.length > 0) {
      const mob = _targetedMobId
        ? (idleMobs.find(m => m.id === _targetedMobId) ?? weightedRandomMob(idleMobs))
        : weightedRandomMob(idleMobs);
      const mobDrops = rollMobDrops(mob);
      for (const [matId, qty] of Object.entries(mobDrops)) {
        materials[matId] = (materials[matId] ?? 0) + qty;
      }
    }

    const idleCurrencyMult = CURRENCY_BAND_MULTIPLIER[zone.band] ?? 1;
    for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
      if (Math.random() < chance * idleCurrencyMult) {
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

  // Simulate XP gain level-by-level so overlevel penalty kicks in as the player levels up.
  // Without this, overnight idle at low zones grants way too much XP (penalty calculated once at start).
  let tempLevel = char.level;
  let tempXp = char.xp;
  let tempXpToNext = char.xpToNext;
  const baseXpPerClear = (XP_PER_BAND * zone.band + XP_ILVL_SCALE * zone.iLvlMin) * xpMult;
  let totalXpGained = 0;

  for (let i = 0; i < clearsCompleted; i++) {
    const xpScale = calcXpScale(tempLevel, zone.iLvlMin);
    const clearXp = Math.round(baseXpPerClear * xpScale);
    totalXpGained += clearXp;
    tempXp += clearXp;
    while (tempXp >= tempXpToNext && tempLevel < MAX_LEVEL) {
      tempXp -= tempXpToNext;
      tempLevel++;
      tempXpToNext = calcXpToNext(tempLevel);
    }
  }

  const xpGained = totalXpGained;
  const goldGained = Math.round(GOLD_BASE * Math.pow(zone.band, GOLD_BAND_EXPONENT)) * clearsCompleted * (doubleClear ? 2 : 1);

  return { items, materials, currencyDrops, bagDrops, xpGained, goldGained, clearsCompleted, elapsed };
}

// --- Zone Mastery Milestone Functions ---

/** Returns milestones that are claimable but haven't been claimed yet. */
export function getClaimableMilestones(totalClears: number, highestClaimed: number): typeof MASTERY_MILESTONES[number][] {
  return MASTERY_MILESTONES.filter(m => totalClears >= m.threshold && m.threshold > highestClaimed);
}

/** Returns the permanent drop/material bonus for a zone based on highest claimed milestone. */
export function getMasteryBonus(zoneMasteryClaimed: Record<string, number>, zoneId: string): { dropBonus: number; matBonus: number } {
  const highest = zoneMasteryClaimed[zoneId] ?? 0;
  const milestone = [...MASTERY_MILESTONES].reverse().find(m => m.threshold <= highest);
  return milestone ? { dropBonus: milestone.dropBonus, matBonus: milestone.matBonus } : { dropBonus: 0, matBonus: 0 };
}

// --- Single Clear Result ---

export interface SingleClearResult {
  item: Item | null;
  professionGearDrop: Item | null;
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  goldGained: number;
  xpGained: number;
  bagDrop: string | null;
  mobTypeId: string | null;
  patternDrop: string | null;
  gemDrop: Gem | null;
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
  targetedMobId: string | null = null,
  masteryDropBonus: number = 0,
  masteryMaterialBonus: number = 0,
): SingleClearResult {
  const hasMastery = checkZoneMastery(char.stats, zone);
  let itemDropChance = hasMastery
    ? BASE_ITEM_DROP_CHANCE * MASTERY_DROP_BONUS
    : BASE_ITEM_DROP_CHANCE;
  itemDropChance *= (abilityEffect?.itemDropMult ?? 1);
  if (classRareFindBonus > 0) itemDropChance *= (1 + classRareFindBonus);
  if (masteryDropBonus > 0) itemDropChance *= (1 + masteryDropBonus);

  const matMult = (abilityEffect?.materialDropMult ?? 1) * (1 + masteryMaterialBonus);
  const xpMult = abilityEffect?.xpMult ?? 1;
  const doubleClear = abilityEffect?.doubleClears ?? false;

  let item: Item | null = null;
  if (Math.random() < itemDropChance) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    item = generateItem(slot, dropILvl, undefined, undefined, zone.band);
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
    chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
  };
  const currencyBandMult = CURRENCY_BAND_MULTIPLIER[zone.band] ?? 1;
  for (const [type, chance] of Object.entries(CURRENCY_DROP_CHANCES)) {
    if (Math.random() < chance * currencyBandMult) {
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

  // Resolve mob type: targeted or weighted random
  let mobTypeId: string | null = null;
  const zoneMobs = getZoneMobTypes(zone.id);
  if (zoneMobs.length > 0) {
    if (targetedMobId) {
      const targeted = zoneMobs.find(m => m.id === targetedMobId);
      if (targeted) {
        mobTypeId = targeted.id;
      }
    }
    if (!mobTypeId) {
      mobTypeId = weightedRandomMob(zoneMobs).id;
    }

    // Roll mob drop table
    if (mobTypeId) {
      const mobDef = getMobTypeDef(mobTypeId);
      if (mobDef) {
        const mobDrops = rollMobDrops(mobDef);
        for (const [matId, qty] of Object.entries(mobDrops)) {
          materials[matId] = (materials[matId] ?? 0) + qty;
        }
      }
    }
  }

  // Independent profession gear drop roll
  let professionGearDrop: Item | null = null;
  if (Math.random() < PROFESSION_GEAR_DROP_CHANCE) {
    const profSlot = PROFESSION_GEAR_SLOTS[Math.floor(Math.random() * PROFESSION_GEAR_SLOTS.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    professionGearDrop = generateProfessionItem(profSlot, dropILvl);
  }

  // Roll for crafting pattern drop
  let patternDrop: string | null = null;
  const patternChance = PATTERN_DROP_CHANCE_PER_BAND[zone.band] ?? 0;
  if (patternChance > 0 && Math.random() < patternChance) {
    const pattern = rollPatternDrop(zone.band, 'zone_drop');
    if (pattern) patternDrop = pattern.id;
  }

  // Roll for gem drop (uses its own internal drop chance)
  const gemDrop = rollGemDrop(zone.band);

  const xpScale = calcXpScale(char.level, zone.iLvlMin);
  return {
    item,
    professionGearDrop,
    materials,
    currencyDrops,
    goldGained: Math.round(GOLD_BASE * Math.pow(zone.band, GOLD_BAND_EXPONENT)) * (doubleClear ? 2 : 1),
    xpGained: Math.round((XP_PER_BAND * zone.band + XP_ILVL_SCALE * zone.iLvlMin) * xpMult * xpScale),
    bagDrop,
    mobTypeId,
    patternDrop,
    gemDrop,
  };
}

// --- Gathering Clear ---

export interface GatheringClearResult {
  materials: Record<string, number>;
  gatheringXp: number;
  professionGearDrop: Item | null;
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

  let professionGearDrop: Item | null = null;
  if (Math.random() < PROFESSION_GEAR_GATHER_DROP_CHANCE) {
    const slot = PROFESSION_GEAR_SLOTS[Math.floor(Math.random() * PROFESSION_GEAR_SLOTS.length)];
    const dropILvl = zone.iLvlMin + Math.floor(Math.random() * (zone.iLvlMax - zone.iLvlMin + 1));
    professionGearDrop = generateProfessionItem(slot, dropILvl);
  }

  const rareMaterialDrops: Record<string, number> = {};
  const rareDrop = rollRareMaterialDrop(profession, zone.band, rareFindBonus);
  if (rareDrop) {
    rareMaterialDrops[rareDrop.id] = 1;
  }

  return { materials, gatheringXp, professionGearDrop, rareMaterialDrops };
}

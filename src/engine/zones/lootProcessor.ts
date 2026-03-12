/**
 * Pure function extraction of processNewClears from gameStore.ts (Phase C2).
 * Takes a state snapshot, returns a state patch + summary. No store dependencies.
 */
import type {
  GameState,
  Item,
  CurrencyType,
  GearSlot,
  Rarity,
  CombatClearResult,
  ResolvedStats,
  AbilityEffect,
  EquippedSkill,
  SkillProgress,
  SkillTimerState,
  ZoneDef,
} from '../../types';

import { ZONE_DEFS } from '../../data/zones';
import { simulateSingleClear, simulateGatheringClear, calcClearTime, simulateCombatClear, calcOutgoingDamageMult, getClaimableMilestones, getMasteryBonus } from '../../engine/zones';
import { resolveProfessionBonuses } from '../../engine/professionBonuses';
import { calcRareFindBonus } from '../../engine/rareMaterials';
import { addGatheringXp, calcGatherClearTime } from '../../engine/gathering';
import { addItemsWithOverflow } from '../../engine/inventory/helpers';
import { calcBagCapacity } from '../../data/items';
import { getClassDef } from '../../data/classes';
import {
  tickResourceOnClear, dischargeMageCharges,
  getClassLootModifier, getClassDamageModifier, getClassClearSpeedModifier,
} from '../../engine/classResource';
import { isZoneInvaded, rollCorruption } from '../../engine/invasions';
import { getInvasionMobs } from '../../data/invasionMobs';
import {
  updateQuestProgressForKills,
  updateQuestProgressForClears,
} from '../../engine/dailyQuests';
import {
  createAbilityProgress, addAbilityXp, getAbilityXpPerClear,
  getDefaultSkillForWeapon,
  aggregateSkillBarEffects, aggregateGraphGlobalEffects,
  getPrimaryDamageSkill,
  calcMobHp,
} from '../../engine/unifiedSkills';
import { mergeEffect } from '../../engine/unifiedSkills';
import { getUnifiedSkillDef, ABILITY_ID_MIGRATION } from '../../data/skills';
import { addXp, resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { generateItem } from '../../engine/items';
import { rollPatternDrop, getPatternDef } from '../../data/craftingPatterns';
import {
  PATTERN_CHARGES,
  INVASION_PATTERN_DROP_BONUS, INVASION_DIFFICULTY_MULT,
  LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO,
} from '../../data/balance';
import { CRAFTING_MILESTONES } from '../../data/craftingProfessions';

// ─── Local helper copies (avoid circular deps with gameStore) ───

/** Get inventory capacity from bag slots. */
function getInventoryCapacity(state: GameState): number {
  return calcBagCapacity(state.bagSlots);
}

/** Calculate bonus pattern charges from crafting milestones for a profession. */
function getPatternChargeBonus(
  craftingSkills: import('../../types').CraftingSkills,
  profession: import('../../types').CraftingProfession,
): number {
  const level = craftingSkills[profession].level;
  let bonus = 0;
  for (const m of CRAFTING_MILESTONES) {
    if (level >= m.level && m.type === 'pattern_bonus') bonus += m.value;
    if (level >= m.level && m.type === 'mastery') bonus += 3;
  }
  return bonus;
}

/**
 * Aggregate skill bar effects + class talent effects into one AbilityEffect.
 */
function getFullEffect(
  state: GameState,
  now: number,
  offlineMode: boolean,
  overrides?: {
    skillBar?: (EquippedSkill | null)[];
    skillProgress?: Record<string, SkillProgress>;
    skillTimers?: SkillTimerState[];
  },
): AbilityEffect {
  const skillEffect = aggregateSkillBarEffects(
    overrides?.skillBar ?? state.skillBar,
    overrides?.skillProgress ?? state.skillProgress,
    overrides?.skillTimers ?? state.skillTimers,
    now,
    offlineMode,
  );
  const talentEffect: AbilityEffect = {};
  const graphGlobalEffect = aggregateGraphGlobalEffects(
    overrides?.skillBar ?? state.skillBar,
    overrides?.skillProgress ?? state.skillProgress,
  );
  return mergeEffect(mergeEffect(skillEffect, talentEffect), graphGlobalEffect);
}

/**
 * Compute clear time for next clear using per-hit combat sim.
 * Falls back to expected-value calcClearTime if no skill is available.
 */
function computeNextClear(
  state: GameState,
  zone: ZoneDef,
  abilityEffect: AbilityEffect | undefined,
  classDamageMult: number,
  classSpeedMult: number,
): { clearTime: number; clearResult: CombatClearResult | null } {
  const primarySkill = getPrimaryDamageSkill(state.skillBar ?? []);
  const skill = primarySkill ?? getDefaultSkillForWeapon(
    state.character.equipment.mainhand?.weaponType ?? 'sword',
    state.character.level,
  );

  if (!skill) {
    return {
      clearTime: calcClearTime(state.character, zone, abilityEffect, classDamageMult, classSpeedMult),
      clearResult: null,
    };
  }

  const stats = resolveStats(state.character);
  const effectiveStats: ResolvedStats = { ...stats };
  if (abilityEffect?.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
  if (abilityEffect?.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

  const { avgDamage, spellPower, weaponConversion } = getWeaponDamageInfo(state.character.equipment);
  const invasionMult = isZoneInvaded(state.invasionState, zone.id, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
  const mobHp = calcMobHp(zone) * invasionMult;

  // Hazards removed — per-mob elemental damage replaces this system.
  let effectiveMobHp = mobHp;

  const levelDelta = Math.max(0, zone.iLvlMin - state.character.level);
  if (levelDelta > 0) effectiveMobHp *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);

  const outgoingMult = calcOutgoingDamageMult(state.character.level, zone.iLvlMin);
  const damageMult = (abilityEffect?.damageMult ?? 1) * classDamageMult * outgoingMult;
  const atkSpeedMult = abilityEffect?.attackSpeedMult ?? 1;

  const result = simulateCombatClear(
    skill, effectiveStats, avgDamage, spellPower,
    effectiveMobHp, damageMult, atkSpeedMult, weaponConversion,
  );

  let clearTime = result.clearTime;
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1) * classSpeedMult;
  clearTime = Math.max(clearTime, zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO);

  return { clearTime, clearResult: { ...result, clearTime } };
}

// ─── Public Interface ───

/** Result returned by processClears for the session summary. */
export interface ProcessClearsResult {
  items: { name: string; rarity: Rarity }[];
  overflowCount: number;
  dustGained: number;
  bagDrops: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  materialDrops: Record<string, number>;
  goldGained: number;
  autoSoldCount: number;
  autoSoldGold: number;
  rareMaterialDrops?: Record<string, number>;
  patternDrops?: string[];
  gatheringXpGained?: number;
}

/**
 * Pure extraction of processNewClears. Takes a state snapshot,
 * returns a partial state patch + summary, or null if nothing to do.
 */
export function processClears(
  state: GameState,
  clearCount: number,
  lootMultiplier: number,
): { patch: Partial<GameState>; summary: ProcessClearsResult } | null {
  if (clearCount <= 0) return null;
  if (!state.currentZoneId) return null;
  const zone = ZONE_DEFS.find((z) => z.id === state.currentZoneId);
  if (!zone) return null;

  // ─── Gathering Mode ───
  if (state.idleMode === 'gathering') {
    const profession = state.selectedGatheringProfession;
    if (!profession) return null;

    const skillLevel = state.gatheringSkills[profession].level;
    const profBonuses = resolveProfessionBonuses(state.professionEquipment);
    const rareFindBonus = calcRareFindBonus(skillLevel, profBonuses.rareFind);
    const yieldMult = 1.0 + profBonuses.gatherYield / 100;
    const instantGatherChance = profBonuses.instantGather / 100;
    let accMaterials: Record<string, number> = {};
    let accRareMaterials: Record<string, number> = {};
    let totalGatheringXp = 0;
    const allItems: Item[] = [];

    for (let i = 0; i < clearCount; i++) {
      const result = simulateGatheringClear(skillLevel, zone, profession, yieldMult, instantGatherChance, rareFindBonus);
      for (const [key, val] of Object.entries(result.materials)) {
        accMaterials[key] = (accMaterials[key] || 0) + val;
      }
      for (const [key, val] of Object.entries(result.rareMaterialDrops)) {
        accRareMaterials[key] = (accRareMaterials[key] || 0) + val;
      }
      totalGatheringXp += result.gatheringXp;
      if (result.professionGearDrop) allItems.push(result.professionGearDrop);
    }

    // Apply materials directly to state
    const newMaterials = { ...state.materials };
    for (const [key, val] of Object.entries(accMaterials)) {
      newMaterials[key] = (newMaterials[key] || 0) + val;
    }
    for (const [key, val] of Object.entries(accRareMaterials)) {
      newMaterials[key] = (newMaterials[key] || 0) + val;
    }

    // Add gathering XP
    const newGatheringSkills = addGatheringXp(state.gatheringSkills, profession, totalGatheringXp);

    // Handle gathering gear drops (into bags)
    const { newInventory, newMaterials: matsAfterItems, salvageStats, autoSoldGold, autoSoldCount, keptItems } = addItemsWithOverflow(
      state.inventory,
      getInventoryCapacity(state),
      state.autoSalvageMinRarity,
      state.autoDisposalAction,
      newMaterials,
      allItems,
    );

    // Advance clearStartedAt for completed clears
    const newClearStartedAt = state.clearStartedAt + clearCount * state.currentClearTime * 1000;

    // Recalculate clear time with potentially leveled-up skill
    const newGatherClearTime = calcGatherClearTime(newGatheringSkills[profession].level, zone, profBonuses.gatherSpeed);

    const patch: Partial<GameState> = {
      materials: matsAfterItems,
      gatheringSkills: newGatheringSkills,
      inventory: newInventory,
      gold: state.gold + autoSoldGold,
      clearStartedAt: newClearStartedAt,
      currentClearTime: newGatherClearTime,
    };

    const summary: ProcessClearsResult = {
      items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
      overflowCount: salvageStats.itemsSalvaged,
      dustGained: salvageStats.dustGained,
      bagDrops: {},
      currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
      materialDrops: accMaterials,
      rareMaterialDrops: accRareMaterials,
      goldGained: autoSoldGold,
      autoSoldCount,
      autoSoldGold,
      gatheringXpGained: totalGatheringXp,
    };

    return { patch, summary };
  }

  // ─── Combat Mode ───
  const classDef = getClassDef(state.character.class);
  let classRes = state.classResource;

  const allItems: Item[] = [];
  const accCurrencies: Record<CurrencyType, number> = { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 };
  const accMaterials: Record<string, number> = {};
  let accGold = 0;
  const accBagDrops: Record<string, number> = {};
  let bonusMageClears = 0;

  const abilityEffect = getFullEffect(state, Date.now(), false);

  // Build class resource stacks per clear
  const zoneId = state.currentZoneId!;
  for (let i = 0; i < clearCount; i++) {
    classRes = tickResourceOnClear(classRes, classDef, zoneId);
  }

  // Mage discharge check: at max charges, grant bonus clears
  const discharge = dischargeMageCharges(classRes, classDef);
  if (discharge) {
    bonusMageClears = discharge.bonusClears;
    classRes = discharge.newState;
  }

  const totalClears = clearCount + bonusMageClears;

  // Get class loot modifiers (Ranger tracking)
  const lootMod = getClassLootModifier(classRes, classDef);

  // Zone mastery permanent bonuses
  const masteryBonuses = getMasteryBonus(state.zoneMasteryClaimed, zoneId);

  // Check if zone is invaded
  const zoneInvaded = isZoneInvaded(state.invasionState, zoneId, zone.band);
  const invasionMobs = zoneInvaded ? getInvasionMobs(zone.band) : [];

  const accPatternDrops: string[] = [];

  const accMobKills: Record<string, number> = {};
  for (let i = 0; i < totalClears; i++) {
    const effectiveMobId = state.currentMobTypeId ?? state.targetedMobId;
    const clear = simulateSingleClear(state.character, zone, abilityEffect, lootMod.rareFindBonus, lootMod.materialYieldBonus, effectiveMobId, masteryBonuses.dropBonus, masteryBonuses.matBonus);

    // During invasion: roll corruption on dropped items
    if (zoneInvaded && clear.item) {
      const corruption = rollCorruption(zone.band);
      if (corruption) {
        clear.item.implicit = corruption;
        clear.item.isCorrupted = true;
      }
    }
    if (clear.item) allItems.push(clear.item);
    if (clear.professionGearDrop) allItems.push(clear.professionGearDrop);

    // During invasion: also roll invasion mob drops
    if (zoneInvaded && invasionMobs.length > 0) {
      const invMob = invasionMobs[Math.floor(Math.random() * invasionMobs.length)];
      for (const drop of invMob.drops) {
        if (Math.random() < drop.chance) {
          const qty = drop.minQty + Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1));
          accMaterials[drop.materialId] = (accMaterials[drop.materialId] || 0) + qty;
        }
      }
    }

    for (const [key, val] of Object.entries(clear.currencyDrops)) {
      accCurrencies[key as CurrencyType] += val;
    }
    for (const [key, val] of Object.entries(clear.materials)) {
      accMaterials[key] = (accMaterials[key] || 0) + val;
    }
    accGold += clear.goldGained;
    if (clear.bagDrop) {
      accBagDrops[clear.bagDrop] = (accBagDrops[clear.bagDrop] || 0) + 1;
    }
    if (clear.mobTypeId) {
      accMobKills[clear.mobTypeId] = (accMobKills[clear.mobTypeId] || 0) + 1;
    }

    if (clear.patternDrop) {
      accPatternDrops.push(clear.patternDrop);
    }

    // During invasions: extra chance for invasion-source pattern
    if (zoneInvaded) {
      const invasionPatternChance = INVASION_PATTERN_DROP_BONUS;
      if (Math.random() < invasionPatternChance) {
        const invPattern = rollPatternDrop(zone.band, 'invasion_drop');
        if (invPattern) accPatternDrops.push(invPattern.id);
      }
    }
  }

  // Apply rare mob loot multiplier to gold and materials
  if (lootMultiplier > 1) {
    accGold = Math.round(accGold * lootMultiplier);
    for (const key of Object.keys(accMaterials)) {
      accMaterials[key] = Math.round(accMaterials[key] * lootMultiplier);
    }
  }

  // Items go directly into bags (with overflow salvage / auto-sell)
  const { newInventory, newMaterials, salvageStats, autoSoldGold, autoSoldCount, keptItems } = addItemsWithOverflow(
    state.inventory,
    getInventoryCapacity(state),
    state.autoSalvageMinRarity,
    state.autoDisposalAction,
    state.materials,
    allItems,
  );

  // Auto-apply all resources directly to state
  const newCurrencies = { ...state.currencies };
  for (const [key, val] of Object.entries(accCurrencies)) {
    newCurrencies[key as CurrencyType] += val;
  }
  for (const [key, val] of Object.entries(accMaterials)) {
    newMaterials[key] = (newMaterials[key] || 0) + val;
  }
  const newBagStash = { ...state.bagStash };
  for (const [key, val] of Object.entries(accBagDrops)) {
    newBagStash[key] = (newBagStash[key] || 0) + val;
  }

  // Track clear counts toward boss (only real clears, not mage bonus)
  const newZoneClearCounts = { ...state.zoneClearCounts };
  {
    newZoneClearCounts[zoneId] = (newZoneClearCounts[zoneId] || 0) + clearCount;
  }

  // Track mob kill counts & total zone clears
  const newMobKillCounts = { ...state.mobKillCounts };
  for (const [mobId, count] of Object.entries(accMobKills)) {
    newMobKillCounts[mobId] = (newMobKillCounts[mobId] || 0) + count;
  }
  const newTotalZoneClears = { ...state.totalZoneClears };
  newTotalZoneClears[zoneId] = (newTotalZoneClears[zoneId] || 0) + clearCount;

  // Check zone mastery milestones
  const newZoneMasteryClaimed = { ...state.zoneMasteryClaimed };
  const claimable = getClaimableMilestones(
    newTotalZoneClears[zoneId],
    newZoneMasteryClaimed[zoneId] ?? 0,
  );
  for (const milestone of claimable) {
    accGold += milestone.goldMult * zone.band;

    let rewardILvl = zone.iLvlMin;
    if (milestone.iLvlPick === 'mid') rewardILvl = Math.floor((zone.iLvlMin + zone.iLvlMax) / 2);
    else if (milestone.iLvlPick === 'max') rewardILvl = zone.iLvlMax;
    const REWARD_SLOTS: GearSlot[] = ['mainhand', 'offhand', 'helmet', 'chest', 'gloves', 'boots', 'ring1', 'trinket1'];
    const rewardSlot = REWARD_SLOTS[Math.floor(Math.random() * REWARD_SLOTS.length)];
    allItems.push(generateItem(rewardSlot, rewardILvl));

    newZoneMasteryClaimed[zoneId] = milestone.threshold;
  }
  let masteryXp = 0;
  for (const milestone of claimable) {
    masteryXp += milestone.xpMult * zone.band;
  }

  // Update daily quest progress (kill + clear quests)
  let questProgress = state.dailyQuests.progress;
  for (const [mobId, count] of Object.entries(accMobKills)) {
    questProgress = updateQuestProgressForKills(state.dailyQuests.quests, questProgress, mobId, count);
  }
  questProgress = updateQuestProgressForClears(state.dailyQuests.quests, questProgress, zoneId, clearCount);

  // Add ability XP to all equipped non-active skills in skillBar
  const xpPerClear = getAbilityXpPerClear(zone.band);
  const totalAbilityXp = xpPerClear * clearCount;
  const newAbilityProgress = { ...state.abilityProgress };
  const reverseAbilityMap: Record<string, string> = {};
  for (const [oldId, newId] of Object.entries(ABILITY_ID_MIGRATION)) {
    reverseAbilityMap[newId] = oldId;
  }
  const newSkillProgress = { ...state.skillProgress };
  for (const equipped of state.skillBar) {
    if (!equipped) continue;
    const skillDef = getUnifiedSkillDef(equipped.skillId);
    if (!skillDef) continue;
    const existing = newSkillProgress[equipped.skillId] ?? {
      skillId: equipped.skillId, xp: 0, level: 0, allocatedNodes: [],
    };
    const tempProgress = { abilityId: existing.skillId, xp: existing.xp, level: existing.level, allocatedNodes: existing.allocatedNodes };
    const updated = addAbilityXp(tempProgress, totalAbilityXp);
    newSkillProgress[equipped.skillId] = {
      ...existing,
      xp: updated.xp, level: updated.level, allocatedNodes: updated.allocatedNodes,
    };
    const oldId = reverseAbilityMap[equipped.skillId];
    if (oldId) {
      const oldExisting = newAbilityProgress[oldId] ?? createAbilityProgress(oldId);
      newAbilityProgress[oldId] = addAbilityXp(oldExisting, 0);
      newAbilityProgress[oldId] = { ...newAbilityProgress[oldId], xp: updated.xp, level: updated.level };
    }
  }

  // Advance clearStartedAt for completed clears
  const newClearStartedAt = state.clearStartedAt + clearCount * state.currentClearTime * 1000;

  // Recalculate currentClearTime for next clear
  const cDmgMult = getClassDamageModifier(classRes, classDef);
  const cSpdMult = getClassClearSpeedModifier(classRes, classDef);
  const updatedAbilityEffect = getFullEffect(state, Date.now(), false, { skillProgress: newSkillProgress });
  const simState = { ...state, abilityProgress: newAbilityProgress, skillProgress: newSkillProgress } as GameState;
  const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
    simState, zone, updatedAbilityEffect, cDmgMult, cSpdMult,
  );

  // Track fastest clear time for this zone
  const newFastestClears = { ...state.fastestClears };
  const currentFastest = newFastestClears[zoneId];
  if (currentFastest === undefined || newClearTime < currentFastest) {
    newFastestClears[zoneId] = newClearTime;
  }

  // Create OwnedPattern entries from pattern drops
  const newOwnedPatterns = [...state.ownedPatterns];
  for (const patId of accPatternDrops) {
    const patDef = getPatternDef(patId);
    if (!patDef) continue;
    const chargeRange = PATTERN_CHARGES[patDef.source] ?? { min: 3, max: 6 };
    const bonusCharges = getPatternChargeBonus(state.craftingSkills, patDef.profession);
    const charges = chargeRange.min + Math.floor(Math.random() * (chargeRange.max - chargeRange.min + 1)) + bonusCharges;
    newOwnedPatterns.push({ defId: patId, charges, discoveredAt: Date.now() });
  }

  // Apply mastery XP to character if any milestones were claimed
  const masteryCharUpdate: Partial<GameState> = {};
  if (masteryXp > 0) {
    const newChar = addXp(state.character, masteryXp);
    newChar.stats = resolveStats(newChar);
    masteryCharUpdate.character = newChar;
  }

  const patch: Partial<GameState> = {
    ...masteryCharUpdate,
    inventory: newInventory,
    materials: newMaterials,
    currencies: newCurrencies,
    gold: state.gold + accGold + autoSoldGold,
    bagStash: newBagStash,
    zoneClearCounts: newZoneClearCounts,
    classResource: classRes,
    abilityProgress: newAbilityProgress,
    skillProgress: newSkillProgress,
    clearStartedAt: newClearStartedAt,
    currentClearTime: newClearTime,
    lastClearResult: newClearResult,
    totalKills: state.totalKills + totalClears,
    fastestClears: newFastestClears,
    mobKillCounts: newMobKillCounts,
    totalZoneClears: newTotalZoneClears,
    zoneMasteryClaimed: newZoneMasteryClaimed,
    dailyQuests: { ...state.dailyQuests, progress: questProgress },
    ownedPatterns: newOwnedPatterns,
  };

  const summary: ProcessClearsResult = {
    items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
    overflowCount: salvageStats.itemsSalvaged,
    dustGained: salvageStats.dustGained,
    bagDrops: accBagDrops,
    currencyDrops: accCurrencies,
    materialDrops: accMaterials,
    goldGained: accGold + autoSoldGold,
    autoSoldCount,
    autoSoldGold,
    patternDrops: accPatternDrops,
  };

  return { patch, summary };
}

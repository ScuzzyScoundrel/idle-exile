import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState,
  Character,
  Item,
  CurrencyType,
  GearSlot,
  CraftResult,
  Rarity,
  OfflineProgressSummary,
  IdleMode,
  GatheringProfession,
  CombatPhase,
  CharacterClass,
  CombatClearResult,
  CombatTickResult,
  EquippedSkill,
  SkillProgress,
  SkillTimerState,
  ActiveSkillDef,
  SkillDef,
  ResolvedStats,
} from '../types';
import { createCharacter, resolveStats, addXp, getWeaponDamageInfo } from '../engine/character';
import { simulateSingleClear, simulateIdleRun, simulateGatheringClear, calcClearTime, simulateCombatClear, createBossEncounter, generateBossLoot, applyAbilityResists, calcHazardPenalty, rollZoneAttack, calcLevelDamageMult } from '../engine/zones';
import { calcMobHp, calcSkillCastInterval, rollSkillCast } from '../engine/unifiedSkills';
import { BOSS_VICTORY_DURATION, BOSS_DEFEAT_RECOVERY, BOSS_VICTORY_HEAL_RATIO, LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO, SKILL_GCD, ACTIVE_SKILL_GCD, LEECH_PERCENT, ZONE_ATTACK_INTERVAL, ZONE_DMG_BASE, ZONE_PHYS_RATIO, ZONE_ACCURACY_BASE, MAX_REGEN_RATIO, BOSS_CRIT_CHANCE, BOSS_CRIT_MULTIPLIER, BOSS_MAX_DMG_RATIO } from '../data/balance';
import { pickBestItem, generateId, isTwoHandedWeapon } from '../engine/items';
import { applyCurrency } from '../engine/crafting';
import {
  createAbilityProgress, addAbilityXp, getAbilityXpPerClear,
  canAllocateNode, allocateNode, respecAbility as respecAbilityEngine, getRespecCost,
} from '../engine/unifiedSkills';
import { getAbilityDef } from '../data/unifiedSkills';
import { ZONE_DEFS } from '../data/zones';
import { BAG_UPGRADE_DEFS, getBagDef, calcBagCapacity, BAG_SLOT_COUNT } from '../data/items';
import { addGatheringXp, calcGatherClearTime, createDefaultGatheringSkills, canGatherInZone } from '../engine/gathering';
import { createDefaultCraftingSkills } from '../data/craftingProfessions';
import { calcRareFindBonus } from '../engine/rareMaterials';
import { canRefine, refine, canDeconstruct, deconstruct } from '../engine/refinement';
import { canCraftRecipe, executeCraft, addCraftingXp, getCraftingXpForTier } from '../engine/craftingProfessions';
import { REFINEMENT_RECIPES } from '../data/refinement';
import { getCraftingRecipe } from '../data/craftingRecipes';
import { getClassDef } from '../data/classes';
import {
  createResourceState, tickResourceOnClear, tickResourceDecay,
  resetResourceOnEvent, getClassClearSpeedModifier, getClassDamageModifier,
  getClassLootModifier, dischargeMageCharges,
} from '../engine/classResource';
import { getDefaultSkillForWeapon } from '../engine/unifiedSkills';
import { getSkillDef } from '../data/unifiedSkills';
import { aggregateSkillBarEffects, aggregateGraphGlobalEffects, getPrimaryDamageSkill, getNextRotationSkill, getSkillEffectiveDuration, getSkillEffectiveCooldown, mergeEffect, getSkillGraphModifier } from '../engine/unifiedSkills';
import { aggregateClassTalentEffect, canAllocateTalentNode, allocateTalentNode as allocateTalentNodeEngine, respecTalents as respecTalentsEngine, getTalentRespecCost } from '../engine/classTalents';
import { getUnifiedSkillDef, ABILITY_ID_MIGRATION } from '../data/unifiedSkills';
import { canAllocateGraphNode, allocateGraphNode, respecGraphNodes, getGraphRespecCost } from '../engine/skillGraph';
import { getDebuffDef } from '../data/debuffs';
import { getMobTypeDef, getZoneMobTypes } from '../data/mobTypes';
import {
  generateDailyQuests, getUtcDateString, shouldResetDailyQuests,
  createInitialProgress, updateQuestProgressForKills,
  updateQuestProgressForClears, updateQuestProgressForBossKill,
  isQuestComplete,
} from '../engine/dailyQuests';


const INITIAL_CURRENCIES: Record<CurrencyType, number> = {
  augment: 50,
  chaos: 50,
  divine: 50,
  annul: 50,
  exalt: 50,
  greater_exalt: 0,
  perfect_exalt: 0,
  socket: 50,
};

/** Rarity sort order for auto-salvage comparison. */
const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/** Enchanting essence reward by rarity (from salvage/disenchant). */
const ESSENCE_REWARD: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

/** Gold received when selling gear by rarity (base — iLvl/5 added). */
export const SELL_GOLD: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 8,
  epic: 20,
  legendary: 50,
};

/** Auto-salvage stats returned alongside state updates. */
interface SalvageStats {
  itemsSalvaged: number;
  dustGained: number;
}

/**
 * Process items against auto-salvage threshold and inventory capacity.
 * Items go directly into bags (or are salvaged). Pure function.
 */
function addItemsWithOverflow(
  inventory: Item[],
  inventoryCapacity: number,
  autoSalvageMinRarity: Rarity,
  autoDisposalAction: 'salvage' | 'sell',
  materials: Record<string, number>,
  items: Item[],
): { newInventory: Item[]; newMaterials: Record<string, number>; salvageStats: SalvageStats; autoSoldGold: number; autoSoldCount: number; keptItems: Item[] } {
  const newInventory = [...inventory];
  const newMaterials = { ...materials };
  const minOrder = RARITY_ORDER[autoSalvageMinRarity];
  let itemsSalvaged = 0;
  let dustGained = 0;
  let autoSoldGold = 0;
  let autoSoldCount = 0;
  const keptItems: Item[] = [];

  for (const item of items) {
    // Auto-dispose by rarity threshold
    if (minOrder > 0 && RARITY_ORDER[item.rarity] < minOrder) {
      if (autoDisposalAction === 'sell') {
        autoSoldGold += SELL_GOLD[item.rarity] + Math.floor(item.iLvl / 5);
        autoSoldCount++;
      } else {
        dustGained += ESSENCE_REWARD[item.rarity];
        itemsSalvaged++;
      }
      continue;
    }
    // Overflow: always salvage for essence (emergency)
    if (newInventory.length >= inventoryCapacity) {
      dustGained += ESSENCE_REWARD[item.rarity];
      itemsSalvaged++;
      continue;
    }
    newInventory.push(item);
    keptItems.push(item);
  }

  if (dustGained > 0) {
    newMaterials['enchanting_essence'] = (newMaterials['enchanting_essence'] || 0) + dustGained;
  }

  return { newInventory, newMaterials, salvageStats: { itemsSalvaged, dustGained }, autoSoldGold, autoSoldCount, keptItems };
}

/** Get inventory capacity from bag slots. */
function getInventoryCapacity(state: GameState): number {
  return calcBagCapacity(state.bagSlots);
}

/** Result returned by processNewClears for the session summary. */
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
  // Gathering-specific fields
  gatheringXpGained?: number;
}

/**
 * Aggregate skill bar effects + class talent effects into one AbilityEffect.
 * When no talents are allocated, talent effect is {} (identity under mergeEffect).
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
): import('../types').AbilityEffect {
  const skillEffect = aggregateSkillBarEffects(
    overrides?.skillBar ?? state.skillBar,
    overrides?.skillProgress ?? state.skillProgress,
    overrides?.skillTimers ?? state.skillTimers,
    now,
    offlineMode,
  );
  const talentEffect = aggregateClassTalentEffect(state.character.class, state.talentAllocations);
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
  zone: import('../types').ZoneDef,
  abilityEffect: import('../types').AbilityEffect | undefined,
  classDamageMult: number,
  classSpeedMult: number,
): { clearTime: number; clearResult: CombatClearResult | null } {
  // Get active skill from unified skillBar, fall back to default for weapon
  const primarySkill = getPrimaryDamageSkill(state.skillBar ?? []);
  const skill = primarySkill ?? getDefaultSkillForWeapon(
    state.character.equipment.mainhand?.weaponType ?? 'sword',
    state.character.level,
  );

  if (!skill) {
    // No skill -> expected-value fallback
    return {
      clearTime: calcClearTime(state.character, zone, abilityEffect, classDamageMult, classSpeedMult),
      clearResult: null,
    };
  }

  const stats = resolveStats(state.character);
  const effectiveStats: ResolvedStats = { ...stats };
  if (abilityEffect?.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
  if (abilityEffect?.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

  const { avgDamage, spellPower } = getWeaponDamageInfo(state.character.equipment);
  const mobHp = calcMobHp(zone);

  // Hazard penalty: unresisted hazards make effective mob HP higher
  const hazardMult = abilityEffect?.ignoreHazards ? 1.0 : calcHazardPenalty(
    applyAbilityResists(stats, abilityEffect), zone,
  );

  let effectiveMobHp = mobHp / hazardMult;

  // Level penalty: underleveled = mob effectively tougher
  const levelDelta = Math.max(0, zone.iLvlMin - state.character.level);
  if (levelDelta > 0) effectiveMobHp *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);

  const damageMult = (abilityEffect?.damageMult ?? 1) * classDamageMult;
  const atkSpeedMult = abilityEffect?.attackSpeedMult ?? 1;

  const result = simulateCombatClear(
    skill, effectiveStats, avgDamage, spellPower,
    effectiveMobHp, damageMult, atkSpeedMult,
  );

  // Post-sim: apply clear speed bonuses + floor
  let clearTime = result.clearTime;
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1) * classSpeedMult;
  clearTime = Math.max(clearTime, zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO);

  return { clearTime, clearResult: { ...result, clearTime } };
}

interface GameActions {
  // Class selection
  selectClass: (classId: CharacterClass) => void;

  // Character
  equipItem: (item: Item) => void;
  unequipSlot: (slot: GearSlot) => void;

  // Inventory
  addToInventory: (items: Item[]) => void;
  removeFromInventory: (itemId: string) => void;
  disenchantItem: (itemId: string) => {
    currencies: Partial<Record<CurrencyType, number>>;
    materials: Record<string, number>;
  } | null;
  sellItem: (itemId: string) => number | null;

  // Zone / Idle
  startIdleRun: (zoneId: string) => void;
  processNewClears: (clearCount: number) => ProcessClearsResult | null;
  stopIdleRun: () => void;
  grantIdleXp: (xp: number) => void;
  getEstimatedClearTime: (zoneId: string) => number;
  setTargetedMob: (mobTypeId: string | null) => void;

  // Mode / Gathering
  setIdleMode: (mode: IdleMode) => void;
  setGatheringProfession: (profession: GatheringProfession) => void;

  // Bag system
  equipBag: (bagDefId: string, slotIndex: number) => { replacedId: string; capacityDelta: number } | null;
  sellBag: (bagDefId: string) => boolean;
  salvageBag: (bagDefId: string) => boolean;
  buyBag: (bagDefId: string) => boolean;

  // Crafting (currency)
  craft: (itemId: string, currency: CurrencyType) => CraftResult | null;

  // Crafting professions
  refineMaterial: (recipeId: string) => boolean;
  refineMaterialBatch: (recipeId: string, count: number) => number;
  deconstructMaterial: (refinedId: string) => boolean;
  craftRecipe: (recipeId: string, catalystId?: string, affixCatalystId?: string) => { item: Item; wasSalvaged: boolean } | null;
  craftRecipeBatch: (recipeId: string, count: number, catalystId?: string, affixCatalystId?: string) => { crafted: number; lastItem: Item | null; salvaged: number } | null;

  // Offline progression
  claimOfflineProgress: () => void;

  // Abilities (skill tree management — uses old ability IDs via abilityProgress)
  allocateAbilityNode: (abilityId: string, nodeId: string) => void;
  respecAbility: (abilityId: string) => void;

  // Class talent tree
  allocateTalentNode: (nodeId: string) => void;
  respecTalents: () => void;

  // Class resource
  tickClassResource: (dtSeconds: number) => void;

  // Real-time combat (10K-A, extended 10K-B1 for boss)
  tickCombat: (dtSec: number) => CombatTickResult;

  // Combat / Boss
  startBossFight: () => void;
  handleBossVictory: () => ProcessClearsResult | null;
  handleBossDefeat: () => void;
  checkRecoveryComplete: () => boolean;

  // Active Skills
  equipSkill: (skillId: string, slot?: number) => void;

  // Unified Skill Bar
  equipToSkillBar: (skillId: string, slotIndex: number) => void;
  unequipSkillBarSlot: (slotIndex: number) => void;
  toggleSkillAutoCast: (slotIndex: number) => void;
  reorderSkillBar: (fromSlot: number, toSlot: number) => void;
  activateSkillBarSlot: (slotIndex: number) => void;
  tickAutoCast: () => void;

  // Daily quests
  checkDailyQuestReset: () => void;
  claimQuestReward: (questId: string) => boolean;

  // Tutorial
  advanceTutorial: (step: number) => void;

  // Settings
  setAutoSalvageRarity: (rarity: Rarity) => void;
  setAutoDisposalAction: (action: 'salvage' | 'sell') => void;
  setCraftAutoSalvageRarity: (rarity: Rarity) => void;

  // Utility
  resetGame: () => void;
}

function createInitialState(): GameState {
  const char = createCharacter('Exile', 'warrior');
  const starterWeapon: Item = {
    id: generateId(),
    baseId: 'rusty_shortsword',
    name: 'Rusty Shortsword',
    slot: 'mainhand',
    rarity: 'common',
    iLvl: 1,
    prefixes: [],
    suffixes: [],
    weaponType: 'sword',
    baseStats: { flatPhysDamage: 5 },
    baseDamageMin: 4,
    baseDamageMax: 8,
  };
  return {
    character: { ...char, stats: resolveStats(char) },
    inventory: [starterWeapon],
    currencies: { ...INITIAL_CURRENCIES },
    materials: {},
    gold: 0,
    bagSlots: Array(BAG_SLOT_COUNT).fill('tattered_satchel'),
    bagStash: {},
    currentZoneId: null,
    idleStartTime: null,
    idleMode: 'combat',
    gatheringSkills: createDefaultGatheringSkills(),
    gatheringEquipment: {},
    selectedGatheringProfession: null,
    craftingSkills: createDefaultCraftingSkills(),
    autoSalvageMinRarity: 'common',
    autoDisposalAction: 'salvage' as const,
    craftAutoSalvageMinRarity: 'common',
    offlineProgress: null,
    abilityProgress: {},
    clearStartedAt: 0,
    currentClearTime: 0,
    currentHp: 0,
    combatPhase: 'clearing' as CombatPhase,
    bossState: null,
    zoneClearCounts: {},
    combatPhaseStartedAt: null,
    classResource: createResourceState('warrior'),
    classSelected: false,
    totalKills: 0,
    fastestClears: {},
    skillBar: [null, null, null, null, null],
    skillProgress: {},
    skillTimers: [],
    talentAllocations: [],
    activeDebuffs: [],
    lastClearResult: null,
    lastSkillActivation: 0,
    currentMobHp: 0,
    maxMobHp: 0,
    nextActiveSkillAt: 0,
    zoneNextAttackAt: 0,
    targetedMobId: null,
    mobKillCounts: {},
    bossKillCounts: {},
    totalZoneClears: {},
    dailyQuests: { questDate: '', quests: [], progress: {} },
    tutorialStep: 1,
    lastSaveTime: Date.now(),
  };
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      selectClass: (classId: CharacterClass) => {
        set((state) => {
          const classDef = getClassDef(classId);
          const newChar: Character = {
            ...state.character,
            class: classId,
            name: classDef.name,
          };
          newChar.stats = resolveStats(newChar);
          return {
            character: newChar,
            classResource: createResourceState(classId),
            classSelected: true,
          };
        });
      },

      equipItem: (item: Item) => {
        set((state) => {
          let targetSlot: GearSlot = item.slot;

          const ALTERNATE: Partial<Record<GearSlot, GearSlot>> = {
            ring1: 'ring2',
            trinket1: 'trinket2',
          };
          const alt = ALTERNATE[item.slot];
          if (alt && state.character.equipment[item.slot] && !state.character.equipment[alt]) {
            targetSlot = alt;
          }

          // ── Weapon equip restrictions ──
          const newEquipment = { ...state.character.equipment };
          const newInventory = state.inventory.filter((i) => i.id !== item.id);

          if (targetSlot === 'mainhand' && item.weaponType && isTwoHandedWeapon(item.weaponType)) {
            // 2H weapon: auto-unequip offhand
            const offhand = newEquipment['offhand'];
            if (offhand) {
              newInventory.push(offhand);
              delete newEquipment['offhand'];
            }
          }

          if (targetSlot === 'offhand') {
            const mainhand = newEquipment['mainhand'];
            // Block offhand if mainhand is 2H
            if (mainhand?.weaponType && isTwoHandedWeapon(mainhand.weaponType)) {
              return state; // Reject — 2H weapon prevents offhand
            }
            // Quiver requires bow or crossbow
            if (item.offhandType === 'quiver') {
              if (!mainhand?.weaponType || (mainhand.weaponType !== 'bow' && mainhand.weaponType !== 'crossbow')) {
                return state; // Reject — quiver needs ranged mainhand
              }
            }
          }

          const currentlyEquipped = newEquipment[targetSlot];
          if (currentlyEquipped) {
            newInventory.push(currentlyEquipped);
          }
          newEquipment[targetSlot] = item;
          const newChar: Character = {
            ...state.character,
            equipment: newEquipment,
          };
          newChar.stats = resolveStats(newChar);

          // If mainhand changed, update unified skillBar
          const updates: Partial<GameState> = { character: newChar, inventory: newInventory };
          if (targetSlot === 'mainhand') {
            const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
            const newWeaponType = item.weaponType ?? null;

            // Mirror default skill to skillBar[0]
            if (newWeaponType) {
              const defaultSkill = getDefaultSkillForWeapon(newWeaponType, newChar.level);
              newSkillBar[0] = defaultSkill ? { skillId: defaultSkill.id, autoCast: true } : null;
            } else {
              newSkillBar[0] = null;
            }

            // Clear weapon-incompatible skills from ability slots 1-4
            if (newWeaponType) {
              for (let i = 1; i <= 4; i++) {
                const eq = newSkillBar[i];
                if (!eq) continue;
                const sDef = getUnifiedSkillDef(eq.skillId);
                if (sDef && sDef.weaponType !== newWeaponType) {
                  newSkillBar[i] = null;
                }
              }
            }
            // Remove skill timers for cleared slots
            const activeSkillIds = new Set(newSkillBar.filter(Boolean).map(s => s!.skillId));
            updates.skillTimers = (state.skillTimers ?? []).filter(t => activeSkillIds.has(t.skillId));
            updates.skillBar = newSkillBar;
          }

          // Reset class resource on gear swap (Rogue momentum)
          const cDef = getClassDef(state.character.class);
          updates.classResource = resetResourceOnEvent(state.classResource, cDef, 'gear_swap');

          return updates;
        });
      },

      unequipSlot: (slot: GearSlot) => {
        set((state) => {
          const item = state.character.equipment[slot];
          if (!item) return state;
          // Capacity guard: cannot unequip if bags are full
          if (state.inventory.length >= getInventoryCapacity(state)) return state;
          const newEquipment = { ...state.character.equipment };
          delete newEquipment[slot];
          const newChar: Character = {
            ...state.character,
            equipment: newEquipment,
          };
          newChar.stats = resolveStats(newChar);
          const updates: Partial<GameState> = {
            character: newChar,
            inventory: [...state.inventory, item],
          };
          // Clear skill bar when weapon is unequipped
          if (slot === 'mainhand') {
            const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
            newSkillBar[0] = null;
            for (let i = 1; i <= 4; i++) {
              const eq = newSkillBar[i];
              if (!eq) continue;
              const sDef = getUnifiedSkillDef(eq.skillId);
              // Clear any skill that requires a weapon type (since weapon is removed)
              if (sDef && sDef.weaponType) {
                newSkillBar[i] = null;
              }
            }
            const activeSkillIds = new Set(newSkillBar.filter(Boolean).map(s => s!.skillId));
            updates.skillBar = newSkillBar;
            updates.skillTimers = (state.skillTimers ?? []).filter(t => activeSkillIds.has(t.skillId));
          }
          return updates;
        });
      },

      addToInventory: (items: Item[]) => {
        set((state) => ({
          inventory: [...state.inventory, ...items],
        }));
      },

      removeFromInventory: (itemId: string) => {
        set((state) => ({
          inventory: state.inventory.filter((i) => i.id !== itemId),
        }));
      },

      disenchantItem: (itemId: string) => {
        const state = get();
        const item = state.inventory.find((i) => i.id === itemId);
        if (!item) return null;

        // Enchanting essence based on rarity
        const matReward: Record<string, number> = {};
        matReward['enchanting_essence'] = ESSENCE_REWARD[item.rarity];
        const iLvlBonus = Math.floor(item.iLvl / 10);
        matReward['enchanting_essence'] += iLvlBonus;

        // Magic essence for uncommon+
        if (RARITY_ORDER[item.rarity] >= RARITY_ORDER['uncommon']) {
          matReward['magic_essence'] = RARITY_ORDER[item.rarity] >= RARITY_ORDER['rare'] ? 2 : 1;
        }

        // Currency rewards (simplified — no transmute/alchemy/regal)
        const currReward: Partial<Record<CurrencyType, number>> = {};
        if (RARITY_ORDER[item.rarity] >= RARITY_ORDER['rare']) {
          if (Math.random() < 0.4) currReward.augment = 1;
          if (Math.random() < 0.1) currReward.chaos = 1;
        } else if (RARITY_ORDER[item.rarity] >= RARITY_ORDER['uncommon']) {
          if (Math.random() < 0.3) currReward.augment = 1;
        }

        const newCurrencies = { ...state.currencies };
        for (const [key, val] of Object.entries(currReward)) {
          newCurrencies[key as CurrencyType] += val!;
        }
        const newMaterials = { ...state.materials };
        for (const [key, val] of Object.entries(matReward)) {
          newMaterials[key] = (newMaterials[key] || 0) + val;
        }
        set({
          inventory: state.inventory.filter((i) => i.id !== itemId),
          currencies: newCurrencies,
          materials: newMaterials,
        });
        return { currencies: currReward, materials: matReward };
      },

      sellItem: (itemId: string) => {
        const state = get();
        const item = state.inventory.find((i) => i.id === itemId);
        if (!item) return null;
        const goldValue = SELL_GOLD[item.rarity] + Math.floor(item.iLvl / 5);
        set({
          inventory: state.inventory.filter((i) => i.id !== itemId),
          gold: state.gold + goldValue,
        });
        return goldValue;
      },

      startIdleRun: (zoneId: string) => {
        const state = get();
        const stats = resolveStats(state.character);
        const classDef = getClassDef(state.character.class);

        // Enforce gathering skill lock — reject if skill too low for zone
        if (state.idleMode === 'gathering') {
          const profession = state.selectedGatheringProfession;
          const zone = ZONE_DEFS.find(z => z.id === zoneId);
          if (!profession || !zone || !canGatherInZone(state.gatheringSkills[profession].level, zone)) {
            return;
          }
        }

        // Reset resource if zone changed (Ranger tracking, Rogue momentum)
        let newResource = state.classResource;
        if (state.currentZoneId && state.currentZoneId !== zoneId) {
          newResource = resetResourceOnEvent(newResource, classDef, 'zone_switch');
        }

        // Calculate initial clear time for this run
        const zone = ZONE_DEFS.find(z => z.id === zoneId);
        let initialClearTime = 5;
        let clearResult: CombatClearResult | null = null;
        if (zone) {
          if (state.idleMode === 'gathering') {
            const profession = state.selectedGatheringProfession;
            if (profession) {
              initialClearTime = calcGatherClearTime(state.gatheringSkills[profession].level, zone);
            }
          } else {
            const abilityEffect = getFullEffect(state, Date.now(), false);
            const classDmgMult = getClassDamageModifier(newResource, classDef);
            const classSpdMult = getClassClearSpeedModifier(newResource, classDef);
            const sim = computeNextClear(state, zone, abilityEffect, classDmgMult, classSpdMult);
            initialClearTime = sim.clearTime;
            clearResult = sim.clearResult;
          }
        }

        const now = Date.now();
        // Reset zone clear count so boss is always BOSS_INTERVAL clears away
        const newZoneClearCounts = { ...state.zoneClearCounts };
        delete newZoneClearCounts[zoneId];

        // Real-time combat: initialize mob HP (10K-A) — use targeted mob's hpMultiplier
        let mobHp = 0;
        if (zone && state.idleMode === 'combat') {
          const hpMult = state.targetedMobId ? (getMobTypeDef(state.targetedMobId)?.hpMultiplier ?? 1.0) : 1.0;
          mobHp = calcMobHp(zone, hpMult);
        }

        set({
          currentZoneId: zoneId,
          idleStartTime: now,
          clearStartedAt: now,
          currentClearTime: initialClearTime,
          currentHp: stats.maxLife,
          combatPhase: 'clearing' as CombatPhase,
          bossState: null,
          combatPhaseStartedAt: null,
          lastClearResult: clearResult,
          classResource: newResource,
          zoneClearCounts: newZoneClearCounts,
          currentMobHp: mobHp,
          maxMobHp: mobHp,
          nextActiveSkillAt: now,
          zoneNextAttackAt: now + ZONE_ATTACK_INTERVAL * 1000,
        });
      },

      processNewClears: (clearCount: number) => {
        if (clearCount <= 0) return null;
        const state = get();
        if (!state.currentZoneId) return null;
        const zone = ZONE_DEFS.find((z) => z.id === state.currentZoneId);
        if (!zone) return null;

        // ─── Gathering Mode ───
        if (state.idleMode === 'gathering') {
          const profession = state.selectedGatheringProfession;
          if (!profession) return null;

          const skillLevel = state.gatheringSkills[profession].level;
          const rareFindBonus = calcRareFindBonus(skillLevel);
          let accMaterials: Record<string, number> = {};
          let accRareMaterials: Record<string, number> = {};
          let totalGatheringXp = 0;
          const allItems: Item[] = [];

          for (let i = 0; i < clearCount; i++) {
            const result = simulateGatheringClear(skillLevel, zone, profession, 1.0, 0, rareFindBonus);
            for (const [key, val] of Object.entries(result.materials)) {
              accMaterials[key] = (accMaterials[key] || 0) + val;
            }
            for (const [key, val] of Object.entries(result.rareMaterialDrops)) {
              accRareMaterials[key] = (accRareMaterials[key] || 0) + val;
            }
            totalGatheringXp += result.gatheringXp;
            if (result.gatheringGearDrop) allItems.push(result.gatheringGearDrop);
          }

          // Apply materials directly to state
          const newMaterials = { ...state.materials };
          for (const [key, val] of Object.entries(accMaterials)) {
            newMaterials[key] = (newMaterials[key] || 0) + val;
          }
          // Rare materials go into the same materials pool
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

          // Advance clearStartedAt for completed clears (prevents 100% stuck bug)
          const newClearStartedAt = state.clearStartedAt + clearCount * state.currentClearTime * 1000;

          // Recalculate clear time with potentially leveled-up skill
          const newGatherClearTime = calcGatherClearTime(newGatheringSkills[profession].level, zone);

          set({
            materials: matsAfterItems,
            gatheringSkills: newGatheringSkills,
            inventory: newInventory,
            gold: state.gold + autoSoldGold,
            clearStartedAt: newClearStartedAt,
            currentClearTime: newGatherClearTime,
          });

          return {
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

        const accMobKills: Record<string, number> = {};
        for (let i = 0; i < totalClears; i++) {
          const clear = simulateSingleClear(state.character, zone, abilityEffect, lootMod.rareFindBonus, lootMod.materialYieldBonus, state.targetedMobId);
          if (clear.item) allItems.push(clear.item);

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

        // HP is now managed in real-time by tickCombat zone attacks (no batched defense)

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
        // Build reverse map: unified ID → old ability ID
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
          // Reuse addAbilityXp math via a temporary AbilityProgress conversion
          const tempProgress = { abilityId: existing.skillId, xp: existing.xp, level: existing.level, allocatedNodes: existing.allocatedNodes };
          const updated = addAbilityXp(tempProgress, totalAbilityXp);
          newSkillProgress[equipped.skillId] = {
            skillId: equipped.skillId, xp: updated.xp, level: updated.level, allocatedNodes: updated.allocatedNodes,
          };
          // Bridge back to abilityProgress using reverse ID mapping
          const oldId = reverseAbilityMap[equipped.skillId];
          if (oldId) {
            const oldExisting = newAbilityProgress[oldId] ?? createAbilityProgress(oldId);
            newAbilityProgress[oldId] = addAbilityXp(oldExisting, 0); // sync level from skill progress
            newAbilityProgress[oldId] = { ...newAbilityProgress[oldId], xp: updated.xp, level: updated.level };
          }
        }

        // Advance clearStartedAt for completed clears
        const newClearStartedAt = state.clearStartedAt + clearCount * state.currentClearTime * 1000;

        // Recalculate currentClearTime for next clear (picks up current ability/class state)
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

        set({
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
          dailyQuests: { ...state.dailyQuests, progress: questProgress },
        });

        return {
          items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
          overflowCount: salvageStats.itemsSalvaged,
          dustGained: salvageStats.dustGained,
          bagDrops: accBagDrops,
          currencyDrops: accCurrencies,
          materialDrops: accMaterials,
          goldGained: accGold + autoSoldGold,
          autoSoldCount,
          autoSoldGold,
        };
      },

      stopIdleRun: () => {
        const state = get();
        const cDef = getClassDef(state.character.class);
        set({
          idleStartTime: null,
          currentZoneId: null,
          combatPhase: 'clearing' as CombatPhase,
          bossState: null,
          combatPhaseStartedAt: null,
          lastClearResult: null,
          classResource: resetResourceOnEvent(state.classResource, cDef, 'stop'),
          zoneNextAttackAt: 0,
        });
      },

      setTargetedMob: (mobTypeId: string | null) => {
        const state = get();
        // If mid-run, recalculate mob HP with the new target's hpMultiplier
        if (state.idleStartTime && state.currentZoneId && state.idleMode === 'combat') {
          const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
          if (zone) {
            const hpMult = mobTypeId ? (getMobTypeDef(mobTypeId)?.hpMultiplier ?? 1.0) : 1.0;
            const mobHp = calcMobHp(zone, hpMult);
            set({ targetedMobId: mobTypeId, currentMobHp: mobHp, maxMobHp: mobHp });
            return;
          }
        }
        set({ targetedMobId: mobTypeId });
      },

      grantIdleXp: (xp: number) => {
        if (xp <= 0) return;
        set((state) => {
          const newChar = addXp(state.character, xp);
          newChar.stats = resolveStats(newChar);
          return { character: newChar };
        });
      },

      getEstimatedClearTime: (zoneId: string) => {
        const state = get();

        // If running this zone, return the tracked currentClearTime
        if (state.idleStartTime && state.currentZoneId === zoneId && state.currentClearTime > 0) {
          return state.currentClearTime;
        }

        const zone = ZONE_DEFS.find((z) => z.id === zoneId);
        if (!zone) return 999;

        if (state.idleMode === 'gathering') {
          const profession = state.selectedGatheringProfession;
          if (!profession) return 999;
          return calcGatherClearTime(state.gatheringSkills[profession].level, zone);
        }

        const abilityEffect = getFullEffect(state, Date.now(), false);
        const cDef = getClassDef(state.character.class);
        const classDmgMult = getClassDamageModifier(state.classResource, cDef);
        const classSpdMult = getClassClearSpeedModifier(state.classResource, cDef);
        return calcClearTime(state.character, zone, abilityEffect, classDmgMult, classSpdMult);
      },

      setIdleMode: (mode: IdleMode) => {
        set({ idleStartTime: null, currentZoneId: null, idleMode: mode });
      },

      setGatheringProfession: (profession: GatheringProfession) => {
        const state = get();
        const wasRunning = state.idleStartTime !== null && state.idleMode === 'gathering';
        const runningZone = state.currentZoneId;

        // If a gathering run is active, stop it first
        if (wasRunning) {
          const cDef = getClassDef(state.character.class);
          set({
            idleStartTime: null,
            currentZoneId: null,
            combatPhase: 'clearing' as CombatPhase,
            bossState: null,
            combatPhaseStartedAt: null,
            classResource: resetResourceOnEvent(state.classResource, cDef, 'stop'),
            selectedGatheringProfession: profession,
          });

          // Restart in the same zone with the new profession's clear time
          if (runningZone) {
            const zone = ZONE_DEFS.find(z => z.id === runningZone);
            if (zone && canGatherInZone(get().gatheringSkills[profession].level, zone)) {
              const newClearTime = calcGatherClearTime(get().gatheringSkills[profession].level, zone);
              const now = Date.now();
              set({
                currentZoneId: runningZone,
                idleStartTime: now,
                clearStartedAt: now,
                currentClearTime: newClearTime,
                currentHp: resolveStats(get().character).maxLife,
                combatPhase: 'clearing' as CombatPhase,
                bossState: null,
                combatPhaseStartedAt: null,
              });
            }
          }
        } else {
          set({ selectedGatheringProfession: profession });
        }
      },

      equipBag: (bagDefId: string, slotIndex: number) => {
        const state = get();
        if (slotIndex < 0 || slotIndex >= BAG_SLOT_COUNT) return null;
        const stashCount = state.bagStash[bagDefId] || 0;
        if (stashCount <= 0) return null;
        const newDef = getBagDef(bagDefId);
        const oldId = state.bagSlots[slotIndex];
        const oldDef = getBagDef(oldId);
        // Check if shrinking would overflow inventory
        const capacityDelta = newDef.capacity - oldDef.capacity;
        const currentCap = getInventoryCapacity(state);
        if (currentCap + capacityDelta < state.inventory.length) return null;
        // Swap
        const newSlots = [...state.bagSlots];
        newSlots[slotIndex] = bagDefId;
        const newStash = { ...state.bagStash };
        newStash[bagDefId] = stashCount - 1;
        if (newStash[bagDefId] <= 0) delete newStash[bagDefId];
        newStash[oldId] = (newStash[oldId] || 0) + 1;
        set({ bagSlots: newSlots, bagStash: newStash });
        return { replacedId: oldId, capacityDelta };
      },

      sellBag: (bagDefId: string) => {
        const state = get();
        const count = state.bagStash[bagDefId] || 0;
        if (count <= 0) return false;
        const def = getBagDef(bagDefId);
        const newStash = { ...state.bagStash };
        newStash[bagDefId] = count - 1;
        if (newStash[bagDefId] <= 0) delete newStash[bagDefId];
        set({ bagStash: newStash, gold: state.gold + def.sellValue });
        return true;
      },

      salvageBag: (bagDefId: string) => {
        const state = get();
        const count = state.bagStash[bagDefId] || 0;
        if (count <= 0) return false;
        const def = getBagDef(bagDefId);
        const newStash = { ...state.bagStash };
        newStash[bagDefId] = count - 1;
        if (newStash[bagDefId] <= 0) delete newStash[bagDefId];
        const newMaterials = { ...state.materials };
        newMaterials['enchanting_essence'] = (newMaterials['enchanting_essence'] || 0) + def.salvageValue;
        set({ bagStash: newStash, materials: newMaterials });
        return true;
      },

      buyBag: (bagDefId: string) => {
        const state = get();
        const def = getBagDef(bagDefId);
        if (state.gold < def.goldCost) return false;
        const newStash = { ...state.bagStash };
        newStash[bagDefId] = (newStash[bagDefId] || 0) + 1;
        set({ gold: state.gold - def.goldCost, bagStash: newStash });
        return true;
      },

      craft: (itemId: string, currency: CurrencyType) => {
        const state = get();
        if (state.currencies[currency] <= 0) {
          return { success: false, item: {} as Item, message: `No ${currency} shards remaining.` };
        }

        const itemIndex = state.inventory.findIndex((i) => i.id === itemId);
        let equippedSlot: GearSlot | null = null;
        if (itemIndex === -1) {
          for (const [slot, eqItem] of Object.entries(state.character.equipment)) {
            if (eqItem && eqItem.id === itemId) {
              equippedSlot = slot as GearSlot;
              break;
            }
          }
          if (!equippedSlot) return null;
        }

        const item = equippedSlot
          ? state.character.equipment[equippedSlot]!
          : state.inventory[itemIndex];
        const result = applyCurrency(item, currency);

        if (result.success) {
          const newCurrencies = { ...state.currencies };
          newCurrencies[currency] -= 1;

          if (equippedSlot) {
            const newChar: Character = {
              ...state.character,
              equipment: { ...state.character.equipment, [equippedSlot]: result.item },
            };
            newChar.stats = resolveStats(newChar);
            set({ currencies: newCurrencies, character: newChar });
          } else {
            const newInventory = [...state.inventory];
            newInventory[itemIndex] = result.item;
            set({ currencies: newCurrencies, inventory: newInventory });
          }
        }

        return result;
      },

      refineMaterial: (recipeId: string) => {
        const state = get();
        const recipe = REFINEMENT_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return false;
        if (!canRefine(recipe, state.materials, state.gold)) return false;
        const { newMaterials, newGold } = refine(recipe, state.materials, state.gold);
        set({ materials: newMaterials, gold: newGold });
        return true;
      },

      refineMaterialBatch: (recipeId: string, count: number) => {
        if (count <= 0) return 0;
        const state = get();
        const recipe = REFINEMENT_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return 0;

        let curMaterials = { ...state.materials };
        let curGold = state.gold;
        let crafted = 0;

        for (let i = 0; i < count; i++) {
          if (!canRefine(recipe, curMaterials, curGold)) break;
          const { newMaterials, newGold } = refine(recipe, curMaterials, curGold);
          curMaterials = newMaterials;
          curGold = newGold;
          crafted++;
        }

        if (crafted > 0) {
          set({ materials: curMaterials, gold: curGold });
        }
        return crafted;
      },

      deconstructMaterial: (refinedId: string) => {
        const state = get();
        if (!canDeconstruct(refinedId, state.materials)) return false;
        const newMaterials = deconstruct(refinedId, state.materials);
        set({ materials: newMaterials });
        return true;
      },

      craftRecipe: (recipeId: string, catalystId?: string, affixCatalystId?: string) => {
        const state = get();
        const recipe = getCraftingRecipe(recipeId);
        if (!recipe) return null;
        if (!canCraftRecipe(recipe, state.craftingSkills, state.materials, state.gold)) return null;

        // Consume materials
        const newMaterials = { ...state.materials };
        for (const { materialId, amount } of recipe.materials) {
          newMaterials[materialId] = (newMaterials[materialId] ?? 0) - amount;
        }
        // Consume required catalyst
        if (recipe.requiredCatalyst) {
          newMaterials[recipe.requiredCatalyst.rareMaterialId] =
            (newMaterials[recipe.requiredCatalyst.rareMaterialId] ?? 0) - recipe.requiredCatalyst.amount;
        }
        // Consume optional catalyst
        if (catalystId && !recipe.requiredCatalyst) {
          newMaterials[catalystId] = (newMaterials[catalystId] ?? 0) - 1;
        }
        // Consume affix catalyst
        if (affixCatalystId) {
          newMaterials[affixCatalystId] = (newMaterials[affixCatalystId] ?? 0) - 1;
        }
        const newGold = state.gold - recipe.goldCost;

        // Add crafting XP
        const xp = getCraftingXpForTier(recipe.tier);
        const newCraftingSkills = addCraftingXp(state.craftingSkills, recipe.profession, xp);

        // Material-producing recipe (e.g. alchemist catalysts)
        if (recipe.outputMaterialId) {
          newMaterials[recipe.outputMaterialId] = (newMaterials[recipe.outputMaterialId] ?? 0) + 1;
          set({
            materials: newMaterials,
            gold: newGold,
            craftingSkills: newCraftingSkills,
          });
          // Return a dummy item for the flash message
          return {
            item: { id: '', baseId: '', name: recipe.name, slot: 'trinket1' as const, rarity: 'common' as const, iLvl: 0, prefixes: [], suffixes: [], baseStats: {} },
            wasSalvaged: false,
          };
        }

        // Generate item
        const item = executeCraft(recipe, catalystId, affixCatalystId);

        // Add item to inventory (overflow → auto-salvage using craft threshold, always salvage for crafting)
        const { newInventory, newMaterials: matsAfterItems, salvageStats } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.craftAutoSalvageMinRarity,
          'salvage',
          newMaterials,
          [item],
        );

        set({
          materials: matsAfterItems,
          gold: newGold,
          craftingSkills: newCraftingSkills,
          inventory: newInventory,
        });

        return { item, wasSalvaged: salvageStats.itemsSalvaged > 0 };
      },

      craftRecipeBatch: (recipeId: string, count: number, catalystId?: string, affixCatalystId?: string) => {
        if (count <= 0) return null;
        const state = get();
        const recipe = getCraftingRecipe(recipeId);
        if (!recipe) return null;

        let curMaterials = { ...state.materials };
        let curGold = state.gold;
        let curCraftingSkills = { ...state.craftingSkills };
        let crafted = 0;
        let lastItem: Item | null = null;
        const allItems: Item[] = [];
        let materialOutputCount = 0;

        for (let i = 0; i < count; i++) {
          if (!canCraftRecipe(recipe, curCraftingSkills, curMaterials, curGold)) break;

          // Consume materials
          for (const { materialId, amount } of recipe.materials) {
            curMaterials[materialId] = (curMaterials[materialId] ?? 0) - amount;
          }
          if (recipe.requiredCatalyst) {
            curMaterials[recipe.requiredCatalyst.rareMaterialId] =
              (curMaterials[recipe.requiredCatalyst.rareMaterialId] ?? 0) - recipe.requiredCatalyst.amount;
          }
          if (catalystId && !recipe.requiredCatalyst) {
            curMaterials[catalystId] = (curMaterials[catalystId] ?? 0) - 1;
          }
          if (affixCatalystId) {
            curMaterials[affixCatalystId] = (curMaterials[affixCatalystId] ?? 0) - 1;
          }
          curGold -= recipe.goldCost;

          // Add crafting XP per craft
          const xp = getCraftingXpForTier(recipe.tier);
          curCraftingSkills = addCraftingXp(curCraftingSkills, recipe.profession, xp);

          if (recipe.outputMaterialId) {
            curMaterials[recipe.outputMaterialId] = (curMaterials[recipe.outputMaterialId] ?? 0) + 1;
            materialOutputCount++;
          } else {
            const item = executeCraft(recipe, catalystId, affixCatalystId);
            allItems.push(item);
            lastItem = item;
          }
          crafted++;
        }

        if (crafted === 0) return null;

        // Handle item recipes: add all items to inventory at once
        let salvaged = 0;
        if (allItems.length > 0) {
          const { newInventory, newMaterials: matsAfterItems, salvageStats } = addItemsWithOverflow(
            state.inventory,
            getInventoryCapacity(state),
            state.craftAutoSalvageMinRarity,
            'salvage',
            curMaterials,
            allItems,
          );
          curMaterials = matsAfterItems;
          salvaged = salvageStats.itemsSalvaged;
          set({
            materials: curMaterials,
            gold: curGold,
            craftingSkills: curCraftingSkills,
            inventory: newInventory,
          });
        } else {
          // Material recipe — no inventory changes
          set({
            materials: curMaterials,
            gold: curGold,
            craftingSkills: curCraftingSkills,
          });
          // For material recipes, create a dummy lastItem for flash message
          lastItem = { id: '', baseId: '', name: recipe.name, slot: 'trinket1' as const, rarity: 'common' as const, iLvl: 0, prefixes: [], suffixes: [], baseStats: {} };
        }

        return { crafted, lastItem, salvaged };
      },

      claimOfflineProgress: () => {
        const state = get();
        const progress = state.offlineProgress;
        if (!progress) return;

        // Process items into inventory (overflow auto-salvaged at claim time)
        const { newInventory, newMaterials, autoSoldGold: claimAutoSoldGold } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.autoSalvageMinRarity,
          state.autoDisposalAction,
          state.materials,
          progress.items,
        );

        // Apply gold (zone gold + auto-sold gold at claim time)
        const newGold = state.gold + progress.goldGained + claimAutoSoldGold;

        // Apply currencies
        const newCurrencies = { ...state.currencies };
        for (const [key, val] of Object.entries(progress.currencyDrops)) {
          newCurrencies[key as CurrencyType] += val;
        }

        // Apply materials from simulation (separate from salvage dust handled above)
        for (const [key, val] of Object.entries(progress.materials)) {
          newMaterials[key] = (newMaterials[key] || 0) + val;
        }

        // Apply bag drops
        const newBagStash = { ...state.bagStash };
        for (const [key, val] of Object.entries(progress.bagDrops)) {
          newBagStash[key] = (newBagStash[key] || 0) + val;
        }

        // Apply XP
        const newChar = addXp(state.character, progress.xpGained);
        newChar.stats = resolveStats(newChar);

        // Update daily quest progress for offline clears (clear_zone + defeat_boss only; kill_mob skips offline)
        let offlineQuestProgress = state.dailyQuests.progress;
        offlineQuestProgress = updateQuestProgressForClears(
          state.dailyQuests.quests, offlineQuestProgress, progress.zoneId, progress.clearsCompleted,
        );
        // Estimate boss kills from offline clears (1 boss per BOSS_INTERVAL clears)
        const offlineBossKills = Math.floor(progress.clearsCompleted / 10); // BOSS_INTERVAL = 10
        for (let b = 0; b < offlineBossKills; b++) {
          offlineQuestProgress = updateQuestProgressForBossKill(
            state.dailyQuests.quests, offlineQuestProgress, progress.zoneId,
          );
        }

        set({
          character: newChar,
          inventory: newInventory,
          materials: newMaterials,
          currencies: newCurrencies,
          gold: newGold,
          bagStash: newBagStash,
          offlineProgress: null,
          dailyQuests: { ...state.dailyQuests, progress: offlineQuestProgress },
        });
      },

      allocateAbilityNode: (abilityId: string, nodeId: string) => {
        set((state) => {
          // Check if this is a graph tree skill (uses skillProgress, not abilityProgress)
          const unifiedDef = getUnifiedSkillDef(abilityId);
          if (unifiedDef?.skillGraph) {
            const progress = state.skillProgress[abilityId];
            if (!progress) return state;
            if (!canAllocateGraphNode(unifiedDef.skillGraph, progress.allocatedNodes, nodeId, progress.level)) return state;
            const newProgress = { ...state.skillProgress };
            newProgress[abilityId] = { ...progress, allocatedNodes: allocateGraphNode(progress.allocatedNodes, nodeId) };
            return { skillProgress: newProgress };
          }

          // Old tree path
          const def = getAbilityDef(abilityId);
          if (!def) return state;
          const progress = state.abilityProgress[abilityId];
          if (!progress) return state;
          if (!canAllocateNode(def, progress, nodeId)) return state;
          const newProgress = { ...state.abilityProgress };
          newProgress[abilityId] = allocateNode(progress, nodeId);
          return { abilityProgress: newProgress };
        });
      },

      respecAbility: (abilityId: string) => {
        set((state) => {
          // Check if this is a graph tree skill
          const unifiedDef = getUnifiedSkillDef(abilityId);
          if (unifiedDef?.skillGraph) {
            const progress = state.skillProgress[abilityId];
            if (!progress || progress.allocatedNodes.length === 0) return state;
            const cost = getGraphRespecCost(progress.level);
            if (state.gold < cost) return state;
            const newProgress = { ...state.skillProgress };
            newProgress[abilityId] = { ...progress, allocatedNodes: respecGraphNodes() };
            return { skillProgress: newProgress, gold: state.gold - cost };
          }

          // Old tree path
          const progress = state.abilityProgress[abilityId];
          if (!progress) return state;
          const cost = getRespecCost(progress);
          if (state.gold < cost) return state;
          const newProgress = { ...state.abilityProgress };
          newProgress[abilityId] = respecAbilityEngine(progress);
          return { abilityProgress: newProgress, gold: state.gold - cost };
        });
      },

      // Class talent tree
      allocateTalentNode: (nodeId: string) => {
        set((state) => {
          if (!canAllocateTalentNode(state.character.class, state.talentAllocations, nodeId, state.character.level)) {
            return state;
          }
          return { talentAllocations: allocateTalentNodeEngine(state.talentAllocations, nodeId) };
        });
      },

      respecTalents: () => {
        set((state) => {
          if (state.talentAllocations.length === 0) return state;
          const cost = getTalentRespecCost(state.character.level);
          if (state.gold < cost) return state;
          return { talentAllocations: respecTalentsEngine(), gold: state.gold - cost };
        });
      },

      // Active skill equip
      equipSkill: (skillId: string, _slot?: number) => {
        const state = get();

        // Validate skill exists
        const skillDef = getSkillDef(skillId);
        if (!skillDef) return;

        // Validate weapon type matches equipped weapon
        const mainhand = state.character.equipment.mainhand;
        if (!mainhand?.weaponType || skillDef.weaponType !== mainhand.weaponType) return;

        // Validate level requirement
        if (state.character.level < skillDef.levelRequired) return;

        // Set skill in skillBar[0]
        const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
        newSkillBar[0] = { skillId, autoCast: true };

        const updates: Partial<GameState> = { skillBar: newSkillBar };

        // Mid-clear recalculation
        if (state.idleStartTime && state.currentZoneId && state.currentClearTime > 0) {
          const now = Date.now();
          const oldClearTime = state.currentClearTime;
          const progress = (now - state.clearStartedAt) / (oldClearTime * 1000);
          const clampedProgress = Math.min(Math.max(progress, 0), 0.99);

          const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
          if (zone) {
            const cDef = getClassDef(state.character.class);
            const abilityEffect = getFullEffect(state, now, false, { skillBar: newSkillBar });
            const classDmgMult = getClassDamageModifier(state.classResource, cDef);
            const classSpdMult = getClassClearSpeedModifier(state.classResource, cDef);
            const tempState = { ...state, skillBar: newSkillBar };
            const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
              tempState, zone, abilityEffect, classDmgMult, classSpdMult,
            );
            updates.clearStartedAt = now - clampedProgress * newClearTime * 1000;
            updates.currentClearTime = newClearTime;
            updates.lastClearResult = newClearResult;
          }
        }

        set(updates);
      },

      // ── Unified Skill Bar Actions ──

      equipToSkillBar: (skillId: string, slotIndex: number) => {
        const state = get();
        if (slotIndex < 0 || slotIndex >= 8) return;

        const skillDef = getUnifiedSkillDef(skillId);
        if (!skillDef) return;

        // Validate weapon compatibility
        const mainhand = state.character.equipment.mainhand;
        if (mainhand?.weaponType && skillDef.weaponType !== mainhand.weaponType) return;

        // Validate level requirement
        if (state.character.level < skillDef.levelRequired) return;

        const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];

        // If skill already in another slot, clear that slot
        const existingIdx = newSkillBar.findIndex(s => s?.skillId === skillId);
        if (existingIdx !== -1 && existingIdx !== slotIndex) {
          newSkillBar[existingIdx] = null;
        }

        const autoCast = true; // All skills auto-cast by default (idle game)
        newSkillBar[slotIndex] = { skillId, autoCast };

        const updates: Partial<GameState> = { skillBar: newSkillBar };

        // Init skillProgress if missing
        const newProgress = { ...state.skillProgress };
        if (!newProgress[skillId]) {
          newProgress[skillId] = { skillId, xp: 0, level: 0, allocatedNodes: [] };
          updates.skillProgress = newProgress;
        }

        // Init skillTimers entry for all skill kinds that need timers
        if (skillDef.kind === 'active' || skillDef.kind === 'buff' || skillDef.kind === 'toggle' || skillDef.kind === 'instant' || skillDef.kind === 'ultimate') {
          const newTimers = state.skillTimers.filter(t => t.skillId !== skillId);
          newTimers.push({ skillId, activatedAt: null, cooldownUntil: null });
          updates.skillTimers = newTimers;
        }

        // Mid-clear recalc if running
        if (state.idleStartTime && state.currentZoneId && state.currentClearTime > 0) {
          const now = Date.now();
          const progress = (now - state.clearStartedAt) / (state.currentClearTime * 1000);
          const clampedProgress = Math.min(Math.max(progress, 0), 0.99);
          const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
          if (zone) {
            const abilityEffect = getFullEffect(state, now, false, {
              skillBar: newSkillBar,
              skillProgress: updates.skillProgress ?? state.skillProgress,
              skillTimers: updates.skillTimers ?? state.skillTimers,
            });
            const cDef = getClassDef(state.character.class);
            const classDmgMult = getClassDamageModifier(state.classResource, cDef);
            const classSpdMult = getClassClearSpeedModifier(state.classResource, cDef);
            const tempState = { ...state, skillBar: newSkillBar };
            const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
              tempState, zone, abilityEffect, classDmgMult, classSpdMult,
            );
            updates.clearStartedAt = now - clampedProgress * newClearTime * 1000;
            updates.currentClearTime = newClearTime;
            updates.lastClearResult = newClearResult;
          }
        }

        set(updates);
      },

      unequipSkillBarSlot: (slotIndex: number) => {
        set((state) => {
          if (slotIndex < 0 || slotIndex >= 5) return state;
          const equipped = state.skillBar[slotIndex];
          if (!equipped) return state;

          const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
          newSkillBar[slotIndex] = null;

          // Remove from skillTimers but preserve skillProgress
          const newTimers = state.skillTimers.filter(t => t.skillId !== equipped.skillId);

          return { skillBar: newSkillBar, skillTimers: newTimers };
        });
      },

      toggleSkillAutoCast: (slotIndex: number) => {
        set((state) => {
          if (slotIndex < 0 || slotIndex >= 5) return state;
          const equipped = state.skillBar[slotIndex];
          if (!equipped) return state;

          const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
          newSkillBar[slotIndex] = { ...equipped, autoCast: !equipped.autoCast };
          return { skillBar: newSkillBar };
        });
      },

      reorderSkillBar: (fromSlot: number, toSlot: number) => {
        set((state) => {
          if (fromSlot < 0 || fromSlot >= 5 || toSlot < 0 || toSlot >= 5) return state;
          if (fromSlot === toSlot) return state;

          const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
          const temp = newSkillBar[fromSlot];
          newSkillBar[fromSlot] = newSkillBar[toSlot];
          newSkillBar[toSlot] = temp;
          return { skillBar: newSkillBar };
        });
      },

      activateSkillBarSlot: (slotIndex: number) => {
        set((state) => {
          const equipped = state.skillBar[slotIndex];
          if (!equipped) return state;
          const def = getUnifiedSkillDef(equipped.skillId);
          if (!def) return state;
          if (def.kind === 'active' || def.kind === 'passive' || def.kind === 'proc') return state;

          const now = Date.now();

          const progress = state.skillProgress[equipped.skillId];
          const stIdx = state.skillTimers.findIndex(t => t.skillId === equipped.skillId);
          if (stIdx === -1) return state;
          const timer = state.skillTimers[stIdx];

          const newSkillTimers = [...state.skillTimers];
          const updates: Partial<GameState> = {};

          // === TOGGLE (no GCD — set-and-forget) ===
          if (def.kind === 'toggle') {
            const newActivatedAt = timer.activatedAt !== null ? null : now;
            newSkillTimers[stIdx] = { skillId: equipped.skillId, activatedAt: newActivatedAt, cooldownUntil: null };
            updates.skillTimers = newSkillTimers;

            return updates;
          }

          // === BUFF / INSTANT / ULTIMATE ===
          // GCD check (only for non-toggle skills)
          if (state.lastSkillActivation && now - state.lastSkillActivation < SKILL_GCD * 1000) return state;

          // Cooldown check
          if (timer.cooldownUntil && now < timer.cooldownUntil) return state;

          const duration = getSkillEffectiveDuration(def, progress);
          const cooldown = getSkillEffectiveCooldown(def, progress);

          if (def.kind === 'buff') {
            newSkillTimers[stIdx] = {
              skillId: equipped.skillId,
              activatedAt: now,
              cooldownUntil: now + (duration + cooldown) * 1000,
            };
          } else {
            // instant / ultimate: fire immediately, go on CD
            newSkillTimers[stIdx] = {
              skillId: equipped.skillId,
              activatedAt: null,
              cooldownUntil: now + cooldown * 1000,
            };
          }
          updates.skillTimers = newSkillTimers;
          updates.lastSkillActivation = now;

          // Mage: increment arcane charges on ability activation
          const cDef = getClassDef(state.character.class);
          if (cDef.resourceType === 'arcane_charges') {
            let newStacks = state.classResource.stacks + 1;
            if (cDef.resourceMax !== null) newStacks = Math.min(newStacks, cDef.resourceMax);
            updates.classResource = { ...state.classResource, stacks: newStacks };
          }

          // Mid-clear recalculation (preserve progress % but adjust timing)
          if (state.idleStartTime && state.currentZoneId && state.currentClearTime > 0) {
            const oldClearTime = state.currentClearTime;
            const prog = (now - state.clearStartedAt) / (oldClearTime * 1000);
            const clampedProgress = Math.min(Math.max(prog, 0), 0.99);
            const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
            if (zone) {
              const newAbilityEffect = getFullEffect(state, now, false, {
                skillTimers: updates.skillTimers ?? state.skillTimers,
              });
              const classDmgMult = getClassDamageModifier(updates.classResource ?? state.classResource, cDef);
              const classSpdMult = getClassClearSpeedModifier(updates.classResource ?? state.classResource, cDef);
              const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
                state, zone, newAbilityEffect, classDmgMult, classSpdMult,
              );
              updates.clearStartedAt = now - clampedProgress * newClearTime * 1000;
              updates.currentClearTime = newClearTime;
              updates.lastClearResult = newClearResult;
            }
          }

          return updates;
        });
      },

      tickAutoCast: () => {
        const state = get();
        // Only during active combat
        if (!state.idleStartTime || !state.currentZoneId) return;
        const phase = state.combatPhase;
        if (phase !== 'clearing' && phase !== 'boss_fight') return;

        const now = Date.now();

        for (let i = 0; i < state.skillBar.length; i++) {
          const equipped = state.skillBar[i];
          if (!equipped || !equipped.autoCast) continue;

          const def = getUnifiedSkillDef(equipped.skillId);
          if (!def) continue;
          if (def.kind === 'active' || def.kind === 'passive' || def.kind === 'proc') continue;

          const timer = state.skillTimers.find(t => t.skillId === equipped.skillId);
          if (!timer) continue;

          // Toggle: auto-activate if OFF (no GCD)
          if (def.kind === 'toggle') {
            if (timer.activatedAt === null) {
              get().activateSkillBarSlot(i);
            }
            continue;
          }

          // Buff/Instant/Ultimate: check readiness + GCD
          const freshState = get(); // Re-read after possible prior activation
          if (freshState.lastSkillActivation && now - freshState.lastSkillActivation < SKILL_GCD * 1000) break;

          const progress = freshState.skillProgress[equipped.skillId];
          const duration = getSkillEffectiveDuration(def, progress);
          const freshTimer = freshState.skillTimers.find(t => t.skillId === equipped.skillId);
          const isActive = freshTimer?.activatedAt != null && now < freshTimer.activatedAt + duration * 1000;
          const isOnCooldown = freshTimer?.cooldownUntil != null && now < freshTimer.cooldownUntil;

          if (!isActive && !isOnCooldown) {
            get().activateSkillBarSlot(i);
          }
        }
      },

      // Class resource time decay (called from 250ms timer)
      tickClassResource: (dtSeconds: number) => {
        const state = get();
        const cDef = getClassDef(state.character.class);
        if (cDef.resourceDecayRate <= 0 || state.classResource.stacks <= 0) return;
        // Only decay when not actively clearing
        if (state.combatPhase === 'clearing' && state.idleStartTime) return;
        const newResource = tickResourceDecay(state.classResource, cDef, dtSeconds);
        if (newResource.stacks !== state.classResource.stacks) {
          set({ classResource: newResource });
        }
      },

      // ── Real-Time Combat Tick (10K-A) ──

      tickCombat: (dtSec: number): CombatTickResult => {
        const noResult: CombatTickResult = { mobKills: 0, skillFired: false, damageDealt: 0, skillId: null, isCrit: false, isHit: false };
        const state = get();
        const phase = state.combatPhase;
        if (phase !== 'clearing' && phase !== 'boss_fight') return noResult;
        if (!state.currentZoneId || !state.idleStartTime) return noResult;
        if (state.idleMode !== 'combat') return noResult;

        const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
        if (!zone) return noResult;

        const now = Date.now();

        // Helper: apply boss per-hit attacks + passive regen to player
        const applyBossDamage = (): CombatTickResult => {
          if (phase === 'boss_fight' && state.bossState) {
            const bs = state.bossState;
            const bossStats = resolveStats(state.character);
            const abilEff = getFullEffect(state, now, false);
            const defStats = applyAbilityResists(bossStats, abilEff);
            let playerHp = state.currentHp;
            let bossAttackResult: CombatTickResult['bossAttack'] = null;

            // Check if boss attack is due
            let nextAttack = bs.bossNextAttackAt;
            if (now >= nextAttack) {
              // Boss damage smoothing: variance + crit
              const isBossCrit = Math.random() < BOSS_CRIT_CHANCE;
              const variance = 0.6 + Math.random() * 0.4; // 60%-100% normal
              const rawDmg = bs.bossDamagePerHit * (isBossCrit ? BOSS_CRIT_MULTIPLIER : variance);

              const roll = rollZoneAttack(rawDmg, bs.bossPhysRatio, bs.bossAccuracy, defStats);

              // Damage cap: never exceed BOSS_MAX_DMG_RATIO of maxHP per hit
              const cappedDmg = Math.min(roll.damage, bossStats.maxLife * BOSS_MAX_DMG_RATIO);
              playerHp -= cappedDmg;
              bossAttackResult = { damage: cappedDmg, isDodged: roll.isDodged, isBlocked: roll.isBlocked, isCrit: isBossCrit };
              nextAttack = now + bs.bossAttackInterval * 1000;
            }

            // Passive regen per tick
            playerHp = Math.min(bossStats.maxLife, playerHp + bossStats.lifeRegen * dtSec);

            if (playerHp <= 0) {
              set({ currentHp: 0, bossState: { ...bs, bossNextAttackAt: nextAttack } });
              return { ...noResult, bossOutcome: 'defeat', bossAttack: bossAttackResult };
            }
            set({ currentHp: playerHp, bossState: { ...bs, bossNextAttackAt: nextAttack } });
            return { ...noResult, bossOutcome: 'ongoing', bossAttack: bossAttackResult };
          }
          return noResult;
        };

        // Helper: apply zone per-hit attacks + passive regen during normal clearing
        const applyZoneDamage = (dt: number): CombatTickResult => {
          if (phase !== 'clearing') return noResult;
          let playerHp = state.currentHp;
          let zoneAttackResult: CombatTickResult['zoneAttack'] = null;
          let nextAttackAt = state.zoneNextAttackAt;

          if (nextAttackAt > 0 && now >= nextAttackAt) {
            const playerStats = resolveStats(state.character);
            const abilEff = getFullEffect(state, now, false);
            const defStats = applyAbilityResists(playerStats, abilEff);
            // Apply defenseMult from abilities to armor/evasion
            const buffedStats: ResolvedStats = abilEff.defenseMult
              ? { ...defStats, armor: defStats.armor * abilEff.defenseMult, evasion: defStats.evasion * abilEff.defenseMult }
              : defStats;

            const levelMult = calcLevelDamageMult(state.character.level, zone.iLvlMin);
            const zoneAccuracy = ZONE_ACCURACY_BASE * (1 + (zone.band - 1) * 0.5);
            const variance = 0.8 + Math.random() * 0.4;
            const rawDmg = ZONE_DMG_BASE * zone.band * levelMult * variance;

            const roll = rollZoneAttack(rawDmg, ZONE_PHYS_RATIO, zoneAccuracy, buffedStats);
            playerHp -= roll.damage;
            zoneAttackResult = roll;
            nextAttackAt = now + ZONE_ATTACK_INTERVAL * 1000;

            // Passive regen per tick
            const maxLife = playerStats.maxLife;
            const regenCap = maxLife * MAX_REGEN_RATIO;
            const regen = Math.min(playerStats.lifeRegen * dt, regenCap);
            playerHp = Math.min(maxLife, playerHp + regen);

            if (playerHp <= 0) {
              set({ currentHp: 0, zoneNextAttackAt: nextAttackAt, combatPhase: 'zone_defeat' as CombatPhase, combatPhaseStartedAt: Date.now() });
              return { ...noResult, zoneAttack: zoneAttackResult, zoneDeath: true };
            }
            set({ currentHp: playerHp, zoneNextAttackAt: nextAttackAt });
          }
          return { ...noResult, zoneAttack: zoneAttackResult };
        };

        // GCD check: can we fire any active skill yet?
        if (now < state.nextActiveSkillAt) {
          if (phase === 'clearing') return applyZoneDamage(dtSec);
          return applyBossDamage();
        }

        // Find next ready skill from rotation (slot-priority order)
        const rotationResult = getNextRotationSkill(state.skillBar ?? [], state.skillTimers, now);

        // Fallback: if no rotation skill ready, check why
        let skill: SkillDef | ActiveSkillDef | null = rotationResult?.skill ?? null;
        if (!skill) {
          // Check if any active skills are equipped
          const hasActiveSkill = (state.skillBar ?? []).some(eq => {
            if (!eq) return false;
            const def = getUnifiedSkillDef(eq.skillId);
            return def?.kind === 'active';
          });
          if (hasActiveSkill) {
            // Active skills exist but all on CD — idle until one comes back
            if (phase === 'clearing') return applyZoneDamage(dtSec);
            return applyBossDamage();
          }
          // No active skills equipped at all — fall back to default weapon skill
          skill = getDefaultSkillForWeapon(
            state.character.equipment.mainhand?.weaponType ?? 'sword',
            state.character.level,
          );
        }

        // If still no skill, idle (enemies still damage)
        if (!skill) {
          if (phase === 'clearing') return applyZoneDamage(dtSec);
          return applyBossDamage();
        }

        const stats = resolveStats(state.character);
        const abilityEffect = getFullEffect(state, now, false);

        // Apply ability stat bonuses to effective stats
        const effectiveStats = { ...stats };
        if (abilityEffect.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
        if (abilityEffect.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

        const classDef = getClassDef(state.character.class);
        const damageMult = (abilityEffect.damageMult ?? 1) * getClassDamageModifier(state.classResource, classDef);
        const atkSpeedMult = abilityEffect.attackSpeedMult ?? 1;

        // Resolve graph modifier for active skills
        const skillProgress = state.skillProgress[skill.id];
        const skillDef = getUnifiedSkillDef(skill.id);
        const graphMod = skillDef ? getSkillGraphModifier(skillDef, skillProgress) : null;

        // Apply graph cast speed bonus
        const graphSpeedMult = graphMod?.incCastSpeed ? (1 + graphMod.incCastSpeed / 100) : 1;
        const castInterval = calcSkillCastInterval(skill, effectiveStats, atkSpeedMult * graphSpeedMult);

        // Fire skill
        const { avgDamage, spellPower } = getWeaponDamageInfo(state.character.equipment);
        const roll = rollSkillCast(skill, effectiveStats, avgDamage, spellPower, damageMult, graphMod ?? undefined);

        // Apply debuff damage amplification
        let debuffDamageMult = 1;
        for (const debuff of state.activeDebuffs) {
          const debuffDef = getDebuffDef(debuff.debuffId);
          if (debuffDef?.effect.incDamageTaken) {
            debuffDamageMult += (debuffDef.effect.incDamageTaken * debuff.stacks) / 100;
          }
        }
        if (debuffDamageMult > 1 && roll.isHit) {
          (roll as { damage: number }).damage *= debuffDamageMult;
        }

        // Apply new debuffs from graph modifier
        let newDebuffs = [...state.activeDebuffs];
        if (roll.isHit && graphMod) {
          for (const debuffInfo of graphMod.debuffs) {
            if (Math.random() < debuffInfo.chance) {
              const existing = newDebuffs.findIndex(d => d.debuffId === debuffInfo.debuffId);
              const debuffDef = getDebuffDef(debuffInfo.debuffId);
              if (existing >= 0 && debuffDef?.stackable) {
                const d = newDebuffs[existing];
                newDebuffs[existing] = {
                  ...d,
                  stacks: Math.min(d.stacks + 1, debuffDef.maxStacks),
                  remainingDuration: debuffInfo.duration,
                  appliedBySkillId: skill.id,
                };
              } else if (existing >= 0) {
                // Refresh duration (non-stackable)
                newDebuffs[existing] = { ...newDebuffs[existing], remainingDuration: debuffInfo.duration, appliedBySkillId: skill.id };
              } else {
                newDebuffs.push({ debuffId: debuffInfo.debuffId, stacks: 1, remainingDuration: debuffInfo.duration, appliedBySkillId: skill.id });
              }
            }
          }
        }

        // Tick debuff durations + apply DoT
        let debuffDotDamage = 0;
        newDebuffs = newDebuffs
          .map(d => ({ ...d, remainingDuration: d.remainingDuration - dtSec }))
          .filter(d => d.remainingDuration > 0);
        for (const debuff of newDebuffs) {
          const debuffDef = getDebuffDef(debuff.debuffId);
          if (debuffDef?.effect.dotDps) {
            debuffDotDamage += debuffDef.effect.dotDps * debuff.stacks * dtSec;
          }
        }

        // Life leech from graph flag
        const hasLifeLeech = graphMod?.flags.includes('lifeLeech');

        // Update GCD: next active skill can fire after max(GCD, castInterval)
        const gcdMs = Math.max(ACTIVE_SKILL_GCD, castInterval) * 1000;
        const nextActiveSkillAt = now + gcdMs;

        // Update per-skill cooldown timer (if skill has a cooldown)
        let newTimers = state.skillTimers;
        if (skill.cooldown > 0) {
          const timerIdx = state.skillTimers.findIndex(t => t.skillId === skill!.id);
          if (timerIdx >= 0) {
            newTimers = state.skillTimers.map((t, i) =>
              i === timerIdx
                ? { ...t, cooldownUntil: now + skill!.cooldown * 1000 }
                : t,
            );
          } else {
            // Defensive: create timer entry if missing
            newTimers = [...state.skillTimers, {
              skillId: skill!.id,
              activatedAt: null,
              cooldownUntil: now + skill!.cooldown * 1000,
            }];
          }
        }

        // ── Boss fight path ──
        if (phase === 'boss_fight' && state.bossState) {
          const bs = state.bossState;
          let totalDamage = 0;
          let newBossHp = bs.bossCurrentHp;

          if (roll.isHit) {
            newBossHp -= roll.damage;
            totalDamage = roll.damage;
          }

          // Apply debuff DoT to boss
          if (debuffDotDamage > 0) {
            newBossHp -= debuffDotDamage;
            totalDamage += debuffDotDamage;
          }

          // Boss per-hit attack (if attack timer is due)
          let playerHp = state.currentHp;
          let nextAttack = bs.bossNextAttackAt;
          let bossAttackResult: CombatTickResult['bossAttack'] = null;
          if (now >= nextAttack) {
            // Boss damage smoothing: variance + crit
            const isBossCrit = Math.random() < BOSS_CRIT_CHANCE;
            const bossVariance = 0.6 + Math.random() * 0.4; // 60%-100% normal
            const rawBossDmg = bs.bossDamagePerHit * (isBossCrit ? BOSS_CRIT_MULTIPLIER : bossVariance);

            const bossRoll = rollZoneAttack(rawBossDmg, bs.bossPhysRatio, bs.bossAccuracy, effectiveStats);

            // Damage cap: never exceed BOSS_MAX_DMG_RATIO of maxHP per hit
            const cappedBossDmg = Math.min(bossRoll.damage, stats.maxLife * BOSS_MAX_DMG_RATIO);
            playerHp -= cappedBossDmg;
            bossAttackResult = { damage: cappedBossDmg, isDodged: bossRoll.isDodged, isBlocked: bossRoll.isBlocked, isCrit: isBossCrit };
            nextAttack = now + bs.bossAttackInterval * 1000;
          }

          // Passive regen per tick
          playerHp = Math.min(stats.maxLife, playerHp + stats.lifeRegen * dtSec);

          // Life leech from player's attack (base + graph bonus)
          if (roll.isHit) {
            const leechRate = hasLifeLeech ? LEECH_PERCENT * 2 : LEECH_PERCENT;
            playerHp = Math.min(stats.maxLife, playerHp + roll.damage * leechRate);
          }

          const updatedBoss = { ...bs, bossCurrentHp: newBossHp, bossNextAttackAt: nextAttack };

          // Check outcomes
          if (newBossHp <= 0) {
            set({
              bossState: { ...updatedBoss, bossCurrentHp: 0 },
              currentHp: Math.max(1, playerHp),
              nextActiveSkillAt,
              skillTimers: newTimers,
              activeDebuffs: [], // Clear debuffs on boss death
            });
            return {
              mobKills: 0, skillFired: true, damageDealt: totalDamage,
              skillId: skill.id, isCrit: roll.isCrit, isHit: roll.isHit,
              bossOutcome: 'victory', bossAttack: bossAttackResult,
            };
          }
          if (playerHp <= 0) {
            set({
              bossState: updatedBoss,
              currentHp: 0,
              nextActiveSkillAt,
              skillTimers: newTimers,
              activeDebuffs: [], // Clear debuffs on death
            });
            return {
              mobKills: 0, skillFired: true, damageDealt: totalDamage,
              skillId: skill.id, isCrit: roll.isCrit, isHit: roll.isHit,
              bossOutcome: 'defeat', bossAttack: bossAttackResult,
            };
          }

          set({
            bossState: updatedBoss,
            currentHp: playerHp,
            nextActiveSkillAt,
            skillTimers: newTimers,
            activeDebuffs: newDebuffs,
          });
          return {
            mobKills: 0, skillFired: true, damageDealt: totalDamage,
            skillId: skill.id, isCrit: roll.isCrit, isHit: roll.isHit,
            bossOutcome: 'ongoing', bossAttack: bossAttackResult,
          };
        }

        // ── Normal clearing path ──
        let currentMobHp = state.currentMobHp;
        let mobKills = 0;
        let totalDamage = 0;

        if (roll.isHit) {
          currentMobHp -= roll.damage;
          totalDamage = roll.damage;
        }

        // Apply debuff DoT to mob
        if (debuffDotDamage > 0) {
          currentMobHp -= debuffDotDamage;
          totalDamage += debuffDotDamage;
        }

        // Check for mob death(s) — cap at 10 kills per tick for safety
        const targetHpMult = state.targetedMobId ? (getMobTypeDef(state.targetedMobId)?.hpMultiplier ?? 1.0) : 1.0;
        const maxMobHp = state.maxMobHp > 0 ? state.maxMobHp : calcMobHp(zone, targetHpMult);
        while (currentMobHp <= 0 && mobKills < 10) {
          mobKills++;
          currentMobHp = maxMobHp + currentMobHp; // carry over overkill damage
          if (currentMobHp <= 0) currentMobHp = maxMobHp; // safety: reset if still negative
          newDebuffs = []; // Clear debuffs on mob death
        }

        // Zone attack check during clearing (real-time defense)
        let playerHp = state.currentHp;
        let zoneAttackResult: CombatTickResult['zoneAttack'] = null;
        let nextZoneAttack = state.zoneNextAttackAt;

        if (nextZoneAttack > 0 && now >= nextZoneAttack) {
          const defStats = applyAbilityResists(stats, abilityEffect);
          const buffedStats: ResolvedStats = abilityEffect.defenseMult
            ? { ...defStats, armor: defStats.armor * abilityEffect.defenseMult, evasion: defStats.evasion * abilityEffect.defenseMult }
            : defStats;

          const levelMult = calcLevelDamageMult(state.character.level, zone.iLvlMin);
          const zoneAccuracy = ZONE_ACCURACY_BASE * (1 + (zone.band - 1) * 0.5);
          const variance = 0.8 + Math.random() * 0.4;
          const rawDmg = ZONE_DMG_BASE * zone.band * levelMult * variance;

          const zoneRoll = rollZoneAttack(rawDmg, ZONE_PHYS_RATIO, zoneAccuracy, buffedStats);
          playerHp -= zoneRoll.damage;
          zoneAttackResult = zoneRoll;
          nextZoneAttack = now + ZONE_ATTACK_INTERVAL * 1000;
        }

        // Passive regen per tick
        playerHp = Math.min(stats.maxLife, playerHp + stats.lifeRegen * dtSec);

        // Life leech from player's attack (base + graph bonus)
        if (roll.isHit) {
          const leechRate = hasLifeLeech ? LEECH_PERCENT * 2 : LEECH_PERCENT;
          playerHp = Math.min(stats.maxLife, playerHp + roll.damage * leechRate);
        }

        // Zone death check
        if (playerHp <= 0) {
          set({
            currentHp: 0,
            currentMobHp,
            maxMobHp,
            nextActiveSkillAt,
            skillTimers: newTimers,
            zoneNextAttackAt: nextZoneAttack,
            combatPhase: 'zone_defeat' as CombatPhase,
            combatPhaseStartedAt: Date.now(),
            activeDebuffs: [],
          });
          return {
            mobKills,
            skillFired: true,
            damageDealt: totalDamage,
            skillId: skill.id,
            isCrit: roll.isCrit,
            isHit: roll.isHit,
            zoneAttack: zoneAttackResult,
            zoneDeath: true,
          };
        }

        set({
          currentMobHp,
          maxMobHp,
          nextActiveSkillAt,
          skillTimers: newTimers,
          currentHp: playerHp,
          zoneNextAttackAt: nextZoneAttack,
          activeDebuffs: newDebuffs,
        });

        return {
          mobKills,
          skillFired: true,
          damageDealt: totalDamage,
          skillId: skill.id,
          isCrit: roll.isCrit,
          isHit: roll.isHit,
          zoneAttack: zoneAttackResult,
        };
      },

      startBossFight: () => {
        const state = get();
        if (!state.currentZoneId) return;
        const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
        if (!zone) return;
        const abilityEffect = getFullEffect(state, Date.now(), false);
        const boss = createBossEncounter(state.character, zone, abilityEffect);
        set({
          combatPhase: 'boss_fight' as CombatPhase,
          bossState: boss,
          combatPhaseStartedAt: Date.now(),
          nextActiveSkillAt: Date.now(),
          zoneNextAttackAt: 0,
        });
      },

      handleBossVictory: () => {
        const state = get();
        if (!state.currentZoneId) return null;
        const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
        if (!zone) return null;

        const bossItems = generateBossLoot(zone);
        const { newInventory, newMaterials, salvageStats, autoSoldGold: bossAutoSoldGold, autoSoldCount: bossAutoSoldCount, keptItems } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.autoSalvageMinRarity,
          state.autoDisposalAction,
          state.materials,
          bossItems,
        );

        const newZoneClearCounts = { ...state.zoneClearCounts };
        delete newZoneClearCounts[state.currentZoneId];

        // Track boss kill count
        const newBossKillCounts = { ...state.bossKillCounts };
        newBossKillCounts[state.currentZoneId] = (newBossKillCounts[state.currentZoneId] || 0) + 1;

        // Update daily quest progress for boss kill
        const bossQuestProgress = updateQuestProgressForBossKill(
          state.dailyQuests.quests, state.dailyQuests.progress, state.currentZoneId,
        );

        set({
          inventory: newInventory,
          materials: newMaterials,
          gold: state.gold + bossAutoSoldGold,
          combatPhase: 'boss_victory' as CombatPhase,
          combatPhaseStartedAt: Date.now(),
          zoneClearCounts: newZoneClearCounts,
          bossKillCounts: newBossKillCounts,
          dailyQuests: { ...state.dailyQuests, progress: bossQuestProgress },
        });

        return {
          items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
          overflowCount: salvageStats.itemsSalvaged,
          dustGained: salvageStats.dustGained,
          bagDrops: {},
          currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
          materialDrops: {},
          goldGained: bossAutoSoldGold,
          autoSoldCount: bossAutoSoldCount,
          autoSoldGold: bossAutoSoldGold,
        };
      },

      handleBossDefeat: () => {
        const state = get();
        const newZoneClearCounts = { ...state.zoneClearCounts };
        if (state.currentZoneId) {
          delete newZoneClearCounts[state.currentZoneId];
        }
        set({
          combatPhase: 'boss_defeat' as CombatPhase,
          currentHp: 0,
          combatPhaseStartedAt: Date.now(),
          zoneClearCounts: newZoneClearCounts,
        });
      },

      checkRecoveryComplete: () => {
        const state = get();
        if (state.combatPhase !== 'boss_victory' && state.combatPhase !== 'boss_defeat' && state.combatPhase !== 'zone_defeat') return false;
        if (!state.combatPhaseStartedAt) return false;

        const elapsed = (Date.now() - state.combatPhaseStartedAt) / 1000;
        const duration = state.combatPhase === 'boss_victory' ? BOSS_VICTORY_DURATION : BOSS_DEFEAT_RECOVERY;
        const stats = resolveStats(state.character);

        if (state.combatPhase === 'boss_defeat' || state.combatPhase === 'zone_defeat') {
          // Linearly regen HP during recovery
          const progress = Math.min(1, elapsed / duration);
          set({ currentHp: stats.maxLife * progress });
        }

        if (elapsed >= duration) {
          // Victory: partial heal (HP carries across cycles)
          // Defeat: full heal (the recovery time is punishment enough)
          const healedHp = state.combatPhase === 'boss_victory'
            ? state.currentHp + (stats.maxLife - state.currentHp) * BOSS_VICTORY_HEAL_RATIO
            : stats.maxLife;

          // Reset mob HP for real-time combat (10K-A) — use targeted mob hpMultiplier
          const zone = state.currentZoneId ? ZONE_DEFS.find(z => z.id === state.currentZoneId) : null;
          const recoveryHpMult = state.targetedMobId ? (getMobTypeDef(state.targetedMobId)?.hpMultiplier ?? 1.0) : 1.0;
          const mobHp = zone ? calcMobHp(zone, recoveryHpMult) : 0;

          set({
            combatPhase: 'clearing' as CombatPhase,
            bossState: null,
            combatPhaseStartedAt: null,
            currentHp: Math.min(stats.maxLife, healedHp),
            currentMobHp: mobHp,
            maxMobHp: mobHp,
            nextActiveSkillAt: Date.now(),
            zoneNextAttackAt: Date.now() + ZONE_ATTACK_INTERVAL * 1000,
          });
          return true;
        }
        return false;
      },

      advanceTutorial: (step: number) => {
        set((state) => {
          // Only advance forward, or set to 0 (done)
          if (step === 0 || step > state.tutorialStep) {
            return { tutorialStep: step };
          }
          return state;
        });
      },

      setAutoSalvageRarity: (rarity: Rarity) => {
        set({ autoSalvageMinRarity: rarity });
      },

      setAutoDisposalAction: (action: 'salvage' | 'sell') => {
        set({ autoDisposalAction: action });
      },

      setCraftAutoSalvageRarity: (rarity: Rarity) => {
        set({ craftAutoSalvageMinRarity: rarity });
      },

      // --- Daily Quests ---
      checkDailyQuestReset: () => {
        const state = get();
        const now = new Date();
        if (!shouldResetDailyQuests(state.dailyQuests, now) && state.dailyQuests.quests.length > 0) return;

        const dateStr = getUtcDateString(now);
        // Determine accessible bands (any zone the player has reached)
        const accessibleBands = new Set<number>();
        for (const zoneId of Object.keys(state.totalZoneClears)) {
          const zone = ZONE_DEFS.find(z => z.id === zoneId);
          if (zone) accessibleBands.add(zone.band);
        }
        // Always include band 1
        accessibleBands.add(1);
        const bands = Array.from(accessibleBands).sort((a, b) => a - b);

        // Build zone/mob lookups
        const zonesByBand: Record<number, typeof ZONE_DEFS> = {};
        for (const z of ZONE_DEFS) {
          if (!zonesByBand[z.band]) zonesByBand[z.band] = [];
          zonesByBand[z.band].push(z);
        }
        const mobTypesByZone: Record<string, ReturnType<typeof getZoneMobTypes>> = {};
        for (const z of ZONE_DEFS) {
          mobTypesByZone[z.id] = getZoneMobTypes(z.id);
        }

        const quests = generateDailyQuests(dateStr, bands, zonesByBand, mobTypesByZone);
        const progress = createInitialProgress(quests);
        set({ dailyQuests: { questDate: dateStr, quests, progress } });
      },

      claimQuestReward: (questId: string) => {
        const state = get();
        const quest = state.dailyQuests.quests.find(q => q.id === questId);
        const progress = state.dailyQuests.progress[questId];
        if (!quest || !progress || progress.claimed) return false;
        if (!isQuestComplete(quest, progress)) return false;

        const reward = quest.reward;
        const newGold = state.gold + (reward.gold ?? 0);
        const xpResult = addXp(state.character, reward.xp ?? 0);

        const newMaterials = { ...state.materials };
        if (reward.materials) {
          for (const [matId, qty] of Object.entries(reward.materials)) {
            newMaterials[matId] = (newMaterials[matId] ?? 0) + qty;
          }
        }

        const newCurrencies = { ...state.currencies };
        if (reward.currencies) {
          for (const [cur, qty] of Object.entries(reward.currencies)) {
            if (qty) newCurrencies[cur as CurrencyType] = (newCurrencies[cur as CurrencyType] ?? 0) + qty;
          }
        }

        const newProgress = {
          ...state.dailyQuests.progress,
          [questId]: { ...progress, claimed: true },
        };

        set({
          gold: newGold,
          character: { ...state.character, ...xpResult },
          materials: newMaterials,
          currencies: newCurrencies,
          dailyQuests: { ...state.dailyQuests, progress: newProgress },
        });
        return true;
      },

      resetGame: () => {
        set(createInitialState());
      },
    }),
    {
      name: 'idle-exile-save',
      version: 32,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) return;

          // Preserve persisted HP through rehydration (startIdleRun sets maxLife for new runs)
          // Clamp to valid range in case of stale data
          const rehydrateStats = resolveStats(state.character);
          state.currentHp = (state.currentHp > 0 && state.currentHp <= rehydrateStats.maxLife)
            ? state.currentHp
            : rehydrateStats.maxLife;
          state.combatPhase = 'clearing';
          state.bossState = null;
          state.combatPhaseStartedAt = null;
          state.lastClearResult = null;

          // Check daily quest reset on rehydrate
          // (Must use useGameStore.getState() because state here is the raw object,
          // but checkDailyQuestReset uses get()/set() which need the store to be ready.
          // Schedule for next tick to ensure store is fully initialized.)
          setTimeout(() => {
            useGameStore.getState().checkDailyQuestReset();
          }, 0);

          // Auto-assign default active skill to skillBar[0] if weapon equipped but no skill set
          if (state.character?.equipment?.mainhand?.weaponType) {
            const hasActiveSkill = state.skillBar?.some(s => {
              if (!s) return false;
              const def = getUnifiedSkillDef(s.skillId);
              return def?.kind === 'active';
            });
            if (!hasActiveSkill) {
              const wt = state.character.equipment.mainhand.weaponType;
              const defaultSkill = getDefaultSkillForWeapon(wt, state.character.level);
              if (defaultSkill) {
                if (!state.skillBar) state.skillBar = [null, null, null, null, null];
                state.skillBar[0] = { skillId: defaultSkill.id, autoCast: true };
              }
            }
          }

          const { currentZoneId, idleStartTime, character, idleMode } = state;
          if (!currentZoneId || !idleStartTime) return;

          const elapsedSeconds = (Date.now() - idleStartTime) / 1000;
          if (elapsedSeconds < 60) {
            // Short absence — let real-time tick handle it, but reset start time
            state.idleStartTime = Date.now();
            return;
          }

          const zone = ZONE_DEFS.find(z => z.id === currentZoneId);
          if (!zone) {
            // Zone no longer exists — reset run
            state.currentZoneId = null;
            state.idleStartTime = null;
            return;
          }

          // Null guards for unified skill bar fields
          if (!state.skillBar) state.skillBar = [null, null, null, null, null];
          if (!state.skillProgress) state.skillProgress = {};
          if (!state.skillTimers) state.skillTimers = [];

          // Reset ephemeral GCD state
          state.lastSkillActivation = 0;
          // Reset ephemeral real-time combat state (10K-A)
          state.currentMobHp = 0;
          state.maxMobHp = 0;
          state.nextActiveSkillAt = 0;
          state.zoneNextAttackAt = 0;
          // Reset ephemeral debuffs (11B)
          state.activeDebuffs = [];

          // Ensure all equipped skills default to autoCast: true (fix for pre-10I saves)
          if (state.skillBar) {
            state.skillBar = state.skillBar.map((s: EquippedSkill | null) => {
              if (s && !s.autoCast) return { ...s, autoCast: true };
              return s;
            }) as (EquippedSkill | null)[];
          }

          // Clean up stale skill timers
          if (state.skillTimers && state.skillTimers.length > 0) {
            state.skillTimers = state.skillTimers.map(t => ({
              ...t,
              cooldownUntil: t.cooldownUntil && t.cooldownUntil < Date.now() ? null : t.cooldownUntil,
              activatedAt: null, // Clear active buffs after offline
            }));
            // Remove timers for skills no longer in the skill bar
            const equippedSkillIds = new Set(state.skillBar.filter(Boolean).map(s => s!.skillId));
            state.skillTimers = state.skillTimers.filter(t => equippedSkillIds.has(t.skillId));
          }

          if (idleMode === 'gathering') {
            // Gathering mode offline simulation
            const profession = state.selectedGatheringProfession;
            if (!profession) {
              state.currentZoneId = null;
              state.idleStartTime = null;
              return;
            }
            const skillLevel = state.gatheringSkills[profession].level;
            const clearTime = calcGatherClearTime(skillLevel, zone);
            const clearsCompleted = Math.floor(elapsedSeconds / clearTime);

            if (clearsCompleted > 0) {
              let accMaterials: Record<string, number> = {};
              let totalGatheringXp = 0;
              for (let i = 0; i < clearsCompleted; i++) {
                const result = simulateGatheringClear(skillLevel, zone, profession);
                for (const [key, val] of Object.entries(result.materials)) {
                  accMaterials[key] = (accMaterials[key] || 0) + val;
                }
                totalGatheringXp += result.gatheringXp;
              }

              // Apply materials
              for (const [key, val] of Object.entries(accMaterials)) {
                state.materials[key] = (state.materials[key] || 0) + val;
              }

              // Apply gathering XP
              state.gatheringSkills = addGatheringXp(state.gatheringSkills, profession, totalGatheringXp);

              const summary: OfflineProgressSummary = {
                zoneId: zone.id,
                zoneName: zone.name,
                elapsedSeconds,
                clearsCompleted,
                items: [],
                autoSalvagedCount: 0,
                autoSalvagedDust: 0,
                autoSoldCount: 0,
                autoSoldGold: 0,
                goldGained: 0,
                xpGained: 0,
                materials: accMaterials,
                currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
                bagDrops: {},
                bestItem: null,
              };

              state.offlineProgress = summary;
            }
            state.idleStartTime = Date.now();
            return;
          }

          // Combat mode offline simulation — use same DPS path as real-time
          const passiveEffect = getFullEffect(state, Date.now(), true);
          const offlineClassDef = getClassDef(state.character.class);
          const offlineClassDmgMult = getClassDamageModifier(state.classResource, offlineClassDef);
          const offlineClassSpdMult = getClassClearSpeedModifier(state.classResource, offlineClassDef);
          const offlineSim = computeNextClear(state, zone, passiveEffect, offlineClassDmgMult, offlineClassSpdMult);
          const result = simulateIdleRun(character, zone, elapsedSeconds, offlineSim.clearTime, passiveEffect);

          // Dry run to estimate auto-salvage/auto-sell stats for display
          const capacity = calcBagCapacity(state.bagSlots);
          const { salvageStats, autoSoldGold: offlineAutoSoldGold, autoSoldCount: offlineAutoSoldCount } = addItemsWithOverflow(
            state.inventory,
            capacity,
            state.autoSalvageMinRarity,
            state.autoDisposalAction,
            { ...state.materials },
            result.items,
          );

          const best = pickBestItem(result.items);

          const summary: OfflineProgressSummary = {
            zoneId: zone.id,
            zoneName: zone.name,
            elapsedSeconds,
            clearsCompleted: result.clearsCompleted,
            items: result.items,
            autoSalvagedCount: salvageStats.itemsSalvaged,
            autoSalvagedDust: salvageStats.dustGained,
            autoSoldCount: offlineAutoSoldCount,
            autoSoldGold: offlineAutoSoldGold,
            goldGained: result.goldGained,
            xpGained: result.xpGained,
            materials: result.materials,
            currencyDrops: result.currencyDrops,
            bagDrops: result.bagDrops,
            bestItem: best,
          };

          state.offlineProgress = summary;
          state.idleStartTime = Date.now();
        };
      },
      migrate: (persisted: unknown, version: number) => {
        const old = persisted as Record<string, unknown>;
        const state = { ...old } as unknown as GameState & GameActions;
        const raw = state as unknown as Record<string, unknown>;

        if (version < 7) {
          // v7: Add bag system fields
          raw.bagSlots = Array(BAG_SLOT_COUNT).fill('tattered_satchel');
          raw.bagStash = {};
        }

        if (version < 8) {
          // v8: Replace inventoryCapacity/consumables with bagSlots/bagStash
          const oldCap = (old.inventoryCapacity as number) ?? 30;
          const oldConsumables = (old.consumables as Record<string, number>) ?? {};

          const bagSlots = Array(BAG_SLOT_COUNT).fill('tattered_satchel') as string[];
          const upgradeCount = Math.min(Math.floor((oldCap - 30) / 6), 5);
          const tierOrder = BAG_UPGRADE_DEFS.map(b => b.id);
          for (let i = 0; i < upgradeCount; i++) {
            const slotIdx = i % BAG_SLOT_COUNT;
            const currentDef = getBagDef(bagSlots[slotIdx]);
            const nextTierIdx = tierOrder.indexOf(currentDef.id) + 1;
            if (nextTierIdx < tierOrder.length) {
              bagSlots[slotIdx] = tierOrder[nextTierIdx];
            }
          }

          state.bagSlots = bagSlots;
          state.bagStash = { ...oldConsumables };

          delete raw.inventoryCapacity;
          delete raw.consumables;
        }

        if (version < 9) {
          state.offlineProgress = null;
        }

        if (version < 10) {
          old.equippedAbilities = [null, null, null, null];
          old.abilityTimers = [];
          if (state.character?.equipment?.mainhand) {
            (state.character.equipment.mainhand as Item).weaponType = 'sword';
          }
          for (const item of (state.inventory ?? [])) {
            if (item.slot === 'mainhand' && !item.weaponType) {
              (item as Item).weaponType = 'sword';
            }
          }
        }

        if (version < 11) {
          // v11: Gathering system + auto-apply resources
          state.idleMode = 'combat';
          state.gatheringSkills = createDefaultGatheringSkills();
          state.gatheringEquipment = {};
          state.selectedGatheringProfession = null;

          // Flush any remaining pendingLoot into state
          const pendingLoot = raw.pendingLoot as {
            currencyDrops?: Record<string, number>;
            materials?: Record<string, number>;
            goldGained?: number;
            bagDrops?: Record<string, number>;
          } | undefined;

          if (pendingLoot) {
            if (pendingLoot.currencyDrops) {
              const currencies = (state.currencies ?? {}) as Record<string, number>;
              for (const [key, val] of Object.entries(pendingLoot.currencyDrops)) {
                currencies[key] = (currencies[key] || 0) + val;
              }
            }
            if (pendingLoot.materials) {
              const materials = (state.materials ?? {}) as Record<string, number>;
              for (const [key, val] of Object.entries(pendingLoot.materials)) {
                materials[key] = (materials[key] || 0) + val;
              }
            }
            if (pendingLoot.goldGained) {
              state.gold = (state.gold || 0) + pendingLoot.goldGained;
            }
            if (pendingLoot.bagDrops) {
              const bagStash = (state.bagStash ?? {}) as Record<string, number>;
              for (const [key, val] of Object.entries(pendingLoot.bagDrops)) {
                bagStash[key] = (bagStash[key] || 0) + val;
              }
            }
          }

          // Remove old fields
          delete raw.pendingLoot;
          delete raw.focusMode;
        }

        if (version < 12) {
          // v12: Crafting professions
          state.craftingSkills = createDefaultCraftingSkills();
        }

        if (version < 13) {
          // v13: Independent craft auto-salvage threshold
          state.craftAutoSalvageMinRarity = 'common';
        }

        if (version < 15) {
          // v15: Combat HP + Boss system
          raw.zoneClearCounts = {};
          raw.currentHp = 0;
          raw.combatPhase = 'clearing';
          raw.bossState = null;
          raw.combatPhaseStartedAt = null;
        }

        if (version < 16) {
          // v16: Stat system + affix overhaul — clean wipe required
          return createInitialState();
        }

        if (version < 17) {
          // v17: Tutorial system + starter weapon for existing saves
          const hasMainhand = !!(state.character?.equipment?.mainhand);
          const hasMainhandInBag = (state.inventory ?? []).some(
            (i: Item) => i.slot === 'mainhand'
          );

          // Inject starter weapon if player has no mainhand at all
          if (!hasMainhand && !hasMainhandInBag) {
            const starterWeapon: Item = {
              id: generateId(),
              baseId: 'rusty_shortsword',
              name: 'Rusty Shortsword',
              slot: 'mainhand',
              rarity: 'common',
              iLvl: 1,
              prefixes: [],
              suffixes: [],
              weaponType: 'sword',
              baseStats: { flatPhysDamage: 5 },
              baseDamageMin: 4,
              baseDamageMax: 8,
            };
            state.inventory = [...(state.inventory ?? []), starterWeapon];
          }

          // Set tutorial step based on progress
          if (!hasMainhand) {
            raw.tutorialStep = 1; // Equip weapon
          } else if (!state.idleStartTime && !state.currentZoneId) {
            // Never started a run (or not currently running)
            // Check if they've ever gathered
            const skills = state.gatheringSkills;
            const neverGathered = skills && Object.values(skills).every(
              (s: { level: number; xp: number }) => s.level === 1 && s.xp === 0
            );
            if (neverGathered) {
              raw.tutorialStep = 2; // Guide to zones
            } else {
              raw.tutorialStep = 0; // Done
            }
          } else {
            // Has a run going — check gathering
            const skills = state.gatheringSkills;
            const neverGathered = skills && Object.values(skills).every(
              (s: { level: number; xp: number }) => s.level === 1 && s.xp === 0
            );
            if (neverGathered) {
              raw.tutorialStep = 4; // Try gathering
            } else {
              raw.tutorialStep = 0; // Done
            }
          }
        }

        if (version < 14) {
          // v14: Crafting overhaul — add leatherworker, remove mail armor
          // Add leatherworker skill
          if (state.craftingSkills && !('leatherworker' in state.craftingSkills)) {
            (state.craftingSkills as Record<string, { level: number; xp: number }>).leatherworker = { level: 1, xp: 0 };
          }
          // Convert mail items to leather equivalents
          const mailToLeather: Record<string, string> = {
            // Helmet
            chain_coif: 'rawhide_cap', linked_visor: 'studded_headband', riveted_helm: 'nightstalker_hood',
            mithril_coif: 'mithril_headband', runic_visor: 'runic_hood', void_visor: 'void_hood', starforged_coif: 'starforged_headband',
            // Shoulders
            chain_spaulders: 'hide_shoulderpads', linked_pauldrons: 'studded_shoulderguards', riveted_shoulders: 'nightstalker_shoulders',
            mithril_spaulders: 'mithril_shoulderpads', runic_spaulders: 'runic_shoulderpads', void_spaulders: 'void_shoulderpads', starforged_spaulders: 'starforged_shoulderpads',
            // Chest
            chain_vest: 'rawhide_tunic', chain_hauberk: 'studded_jerkin', linked_haubergeon: 'nightstalker_vest',
            mithril_hauberk: 'mithril_vest', runic_hauberk: 'runic_vest', void_hauberk: 'void_vest', starforged_hauberk: 'starforged_vest',
            // Gloves
            chain_gloves: 'hide_gloves', linked_gauntlets: 'studded_gloves', riveted_gauntlets: 'nightstalker_gloves',
            mithril_chain_gloves: 'mithril_hide_gloves', runic_chain_gloves: 'runic_hide_gloves', void_chain_gloves: 'void_hide_gloves', starforged_chain_gloves: 'starforged_hide_gloves',
            // Pants
            chain_leggings: 'rawhide_pants', linked_chausses: 'studded_leggings', riveted_leggings: 'nightstalker_pants',
            mithril_chausses: 'mithril_leggings', runic_chausses: 'runic_leggings', void_chausses: 'void_leggings', starforged_chausses: 'starforged_leggings',
            // Boots
            chain_boots: 'leather_boots', linked_boots: 'studded_boots', riveted_treads: 'nightstalker_boots',
            mithril_boots: 'mithril_treads', runic_boots: 'runic_treads_leather', void_boots: 'void_treads', starforged_boots: 'starforged_treads',
          };
          const convertItem = (item: Record<string, unknown>) => {
            if (item && item.armorType === 'mail') {
              const newBaseId = mailToLeather[item.baseId as string];
              if (newBaseId) {
                item.baseId = newBaseId;
              }
              item.armorType = 'leather';
            }
          };
          // Convert equipped items
          if (state.character?.equipment) {
            for (const slot of Object.keys(state.character.equipment)) {
              const item = (state.character.equipment as Record<string, unknown>)[slot];
              if (item) convertItem(item as Record<string, unknown>);
            }
          }
          // Convert inventory items
          if (state.inventory) {
            for (const item of state.inventory) {
              convertItem(item as unknown as Record<string, unknown>);
            }
          }
          // Prep potionSlots for Phase 2
          (raw as Record<string, unknown>).potionSlots = [null, null, null];
        }

        if (version < 18) {
          // v18: Class resource system + class selection
          // Existing saves default to Warrior, skip class picker
          if (!state.character?.class || state.character.class === 'warrior') {
            raw.classResource = createResourceState('warrior');
          } else {
            raw.classResource = createResourceState(state.character.class as CharacterClass);
          }
          raw.classSelected = true;  // Skip picker for existing saves
        }

        if (version < 19) {
          // v19: Ability system overhaul — skill trees, XP, per-clear tracking
          raw.abilityProgress = {};
          raw.clearStartedAt = 0;
          raw.currentClearTime = 0;
          // Clear old mutator selections (players re-pick via tree)
          if (old.equippedAbilities) {
            old.equippedAbilities = (old.equippedAbilities as Array<{ abilityId: string; selectedMutatorId: string | null } | null>).map(
              (ea: { abilityId: string; selectedMutatorId: string | null } | null) => ea ? { abilityId: ea.abilityId, selectedMutatorId: null } : null,
            );
          }
        }

        if (version < 20) {
          // v20: Kill counter + fastest clear tracking
          raw.totalKills = 0;
          raw.fastestClears = {};
        }

        if (version < 21) {
          // v21: Greater Exalt + Perfect Exalt currencies
          const currencies = (state.currencies ?? {}) as Record<string, number>;
          if (currencies.greater_exalt === undefined) currencies.greater_exalt = 0;
          if (currencies.perfect_exalt === undefined) currencies.perfect_exalt = 0;
        }

        if (version < 22) {
          // v22: Rename salvage_dust → enchanting_essence
          const materials = (state.materials ?? {}) as Record<string, number>;
          if (materials.salvage_dust !== undefined) {
            materials.enchanting_essence = (materials.enchanting_essence ?? 0) + materials.salvage_dust;
            delete materials.salvage_dust;
          }
        }

        if (version < 23) {
          // v23: Auto-disposal action (salvage vs sell toggle)
          raw.autoDisposalAction = 'salvage';
        }

        if (version < 24) {
          // v24: Active skills system — auto-assign default skill for equipped weapon
          const weaponType = state.character?.equipment?.mainhand?.weaponType;
          if (weaponType) {
            const defaultSkill = getDefaultSkillForWeapon(weaponType, state.character.level);
            raw.equippedSkills = [defaultSkill?.id ?? null, null, null, null];
          } else {
            raw.equippedSkills = [null, null, null, null];
          }
        }

        if (version < 25) {
          // v25: Unified skill bar — migrate equippedSkills + equippedAbilities → skillBar
          const skillBar: (EquippedSkill | null)[] = [null, null, null, null, null, null, null, null];
          const skillProgress: Record<string, SkillProgress> = {};
          const skillTimers: SkillTimerState[] = [];

          // Slot 0: active skill from equippedSkills[0]
          const activeId = (old.equippedSkills as (string | null)[] | undefined)?.[0];
          if (activeId) {
            skillBar[0] = { skillId: activeId, autoCast: true };
          }

          // Slots 1-4: abilities from equippedAbilities[0-3] with ID migration
          const abilities = (old.equippedAbilities ?? []) as ({ abilityId: string; selectedMutatorId: string | null } | null)[];
          const abilityProg = (state.abilityProgress ?? {}) as Record<string, { abilityId: string; xp: number; level: number; allocatedNodes: string[] }>;

          for (let i = 0; i < 4; i++) {
            const ea = abilities[i];
            if (!ea) continue;
            const unifiedId = ABILITY_ID_MIGRATION[ea.abilityId] ?? ea.abilityId;
            const sDef = getUnifiedSkillDef(unifiedId);
            const autoCast = sDef ? (sDef.kind === 'passive' || sDef.kind === 'proc') : false;
            skillBar[i + 1] = { skillId: unifiedId, autoCast };

            // Migrate ability progress to skill progress
            const oldProg = abilityProg[ea.abilityId];
            if (oldProg) {
              skillProgress[unifiedId] = {
                skillId: unifiedId,
                xp: oldProg.xp,
                level: oldProg.level,
                allocatedNodes: [...oldProg.allocatedNodes],
              };
            } else {
              skillProgress[unifiedId] = { skillId: unifiedId, xp: 0, level: 0, allocatedNodes: [] };
            }

            // Init timers for buff/toggle/instant/ultimate kinds
            if (sDef && (sDef.kind === 'buff' || sDef.kind === 'toggle' || sDef.kind === 'instant' || sDef.kind === 'ultimate')) {
              skillTimers.push({ skillId: unifiedId, activatedAt: null, cooldownUntil: null });
            }
          }

          raw.skillBar = skillBar;
          raw.skillProgress = skillProgress;
          raw.skillTimers = skillTimers;
        }

        if (version < 26) {
          // v26: Remove legacy fields, truncate skillBar to 5 slots
          delete old.equippedAbilities;
          delete old.abilityTimers;
          delete old.equippedSkills;
          // Truncate skillBar from 8 to 5 slots
          const bar = (old.skillBar ?? state.skillBar ?? []) as (EquippedSkill | null)[];
          if (bar.length > 5) {
            raw.skillBar = bar.slice(0, 5);
          }
        }

        if (version < 27) {
          // v27: Rotation engine — rename lastSkillCastAt → nextActiveSkillAt (ephemeral, just init to 0)
          delete old.lastSkillCastAt;
          raw.nextActiveSkillAt = 0;

          // Ensure all equipped active skills have SkillTimerState entries
          const skillBar27 = (old.skillBar ?? []) as (EquippedSkill | null)[];
          const timers27 = [...((old.skillTimers ?? []) as SkillTimerState[])];
          const timerSkillIds = new Set(timers27.map(t => t.skillId));
          for (const equipped of skillBar27) {
            if (!equipped) continue;
            const sDef = getUnifiedSkillDef(equipped.skillId);
            if (sDef && sDef.kind === 'active' && !timerSkillIds.has(equipped.skillId)) {
              timers27.push({ skillId: equipped.skillId, activatedAt: null, cooldownUntil: null });
            }
          }
          raw.skillTimers = timers27;
        }

        if (version < 28) {
          // v28: Class talent tree
          raw.talentAllocations = [];
        }

        if (version < 29) {
          // v29: Skill graph trees — clear wand skill allocations (preserve XP/level)
          raw.activeDebuffs = [];
          const sp = (state.skillProgress ?? {}) as Record<string, SkillProgress>;
          const wandSkillIds = [
            'wand_magic_missile', 'wand_chain_lightning', 'wand_frostbolt',
            'wand_searing_ray', 'wand_essence_drain', 'wand_void_blast',
            'wand_chain_lightning_buff', 'wand_time_warp', 'wand_mystic_insight',
          ];
          for (const id of wandSkillIds) {
            if (sp[id]) {
              sp[id] = { ...sp[id], allocatedNodes: [] };
            }
          }
          // Also clear old abilityProgress for wand abilities
          const ap = (state.abilityProgress ?? {}) as Record<string, { abilityId: string; xp: number; level: number; allocatedNodes: string[] }>;
          const wandAbilityIds = ['wand_chain_lightning', 'wand_time_warp', 'wand_mystic_insight'];
          for (const id of wandAbilityIds) {
            if (ap[id]) {
              ap[id] = { ...ap[id], allocatedNodes: [] };
            }
          }
        }

        if (version < 30) {
          // v30: Mob types & targeted farming
          raw.targetedMobId = null;
          raw.mobKillCounts = {};
          raw.bossKillCounts = {};
          raw.totalZoneClears = {};
        }

        if (version < 31) {
          // v31: Enhanced mob drop tables — no state shape change needed.
          // MobTypeDef.drops replaces .uniqueDrops (code-only, not persisted).
          // New crafting materials just appear as they drop into existing materials dict.
        }

        if (version < 32) {
          // v32: Daily quest system
          raw.dailyQuests = { questDate: '', quests: [], progress: {} };
        }

        return state;
      },
    }
  )
);

export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

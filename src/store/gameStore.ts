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
  IdleMode,
  GatheringProfession,
  CombatPhase,
  CharacterClass,
  CombatClearResult,
  CombatTickResult,
  EquippedSkill,
  CraftLogEntry,
  MobInPack,
  OfflineProgressSummary,
  Gem,
  GemType,
  GemTier,
} from '../types';
import { createCharacter, resolveStats, addXp } from '../engine/character';
import { calcClearTime, createBossEncounter, generateBossLoot, calcDeathPenalty, simulateIdleRun } from '../engine/zones';
import { BOSS_VICTORY_DURATION, BOSS_VICTORY_HEAL_RATIO, INVASION_DIFFICULTY_MULT, INVASION_DURATION_MIN_MS, INVASION_DURATION_MAX_MS, DEATH_STREAK_WINDOW } from '../data/balance';
// SKILL_GCD import moved to skillStore
import { generateId, isTwoHandedWeapon, pickBestItem } from '../engine/items';
import { applyCurrency } from '../engine/crafting';
// createAbilityProgress, addAbilityXp, getAbilityXpPerClear moved to lootProcessor
import { ZONE_DEFS } from '../data/zones';
import { BAG_SLOT_COUNT, calcBagCapacity } from '../data/items';
import { runMigrations } from './migrations';
import { useCraftingStore } from './craftingStore';
import { useSkillStore } from './skillStore';
import { useQuestStore } from './questStore';
import { useUiStore } from './uiStore';
import { handleRehydrate } from './hydrate';
import { calcGatherClearTime, createDefaultGatheringSkills, canGatherInZone } from '../engine/gathering';
import { createDefaultCraftingSkills, CRAFTING_MILESTONES } from '../data/craftingProfessions';
// refinement + craftingProfessions imports moved to craftingStore
import { BOSS_PATTERN_DROP_CHANCE, PATTERN_CHARGES } from '../data/balance';
import { getPatternDef, rollPatternDrop } from '../data/craftingPatterns';
import { resolveProfessionBonuses } from '../engine/professionBonuses';
// REFINEMENT_RECIPES + getCraftingRecipe imports moved to craftingStore
import { getClassDef } from '../data/classes';
import {
  createResourceState, tickResourceDecay,
  resetResourceOnEvent, getClassClearSpeedModifier, getClassDamageModifier,
} from '../engine/classResource';
import { getDefaultSkillForWeapon } from '../engine/unifiedSkills';
// getSkillEffectiveDuration, getSkillEffectiveCooldown imports moved to skillStore
// classTalents import removed (Skill Tree Overhaul Phase 0)
// canAllocateTalentRank, allocateTalentRank, respecTalentRanks, getTalentRespecCost imports moved to skillStore
import { getUnifiedSkillDef } from '../data/skills';
// canAllocateGraphNode, allocateGraphNode, respecGraphNodes, getGraphRespecCost imports moved to skillStore
import { getFullEffect } from '../engine/combat/helpers';
import { runCombatTick } from '../engine/combat/tick';
import { simulateOfflineCombat } from '../engine/combat/offlineSim';
import { RARITY_ORDER, ESSENCE_REWARD, SELL_GOLD, addItemsWithOverflow, getInventoryCapacity } from '../engine/inventory/helpers';
import { pickCurrentMob, computeNextClear } from '../engine/zones/helpers';
import { getMobTypeDef } from '../data/mobTypes';
import { spawnPack } from '../engine/packs';
import { isGemValidForSlot } from '../data/gems';
import { canUpgradeGem, upgradeGem as upgradeGemEngine, rollGemDrop } from '../engine/gems';
import { GEM_UPGRADE_GOLD_COST, GEM_INVENTORY_CAP } from '../data/balance';
import { tickInvasions as tickInvasionsPure, isZoneInvaded } from '../engine/invasions';
import {
  updateQuestProgressForBossKill,
} from '../engine/dailyQuests';



const INITIAL_CURRENCIES: Record<CurrencyType, number> = {
  chaos: 0,
  divine: 0,
  annul: 0,
  exalt: 0,
  greater_exalt: 0,
  perfect_exalt: 0,
  socket: 0,
};

/** Calculate bonus pattern charges from crafting milestones for a profession. */
function getPatternChargeBonus(craftingSkills: import('../types').CraftingSkills, profession: import('../types').CraftingProfession): number {
  const level = craftingSkills[profession].level;
  let bonus = 0;
  for (const m of CRAFTING_MILESTONES) {
    if (level >= m.level && m.type === 'pattern_bonus') bonus += m.value;
    if (level >= m.level && m.type === 'mastery') bonus += 3; // mastery grants +3 pattern charges
  }
  return bonus;
}

// Re-export for consumers that import from gameStore
export { calcFortifyDR } from '../engine/combat/helpers';
export { SELL_GOLD } from '../engine/inventory/helpers';

// ProcessClearsResult moved to engine/zones/lootProcessor.ts — re-export for backward compat
export type { ProcessClearsResult } from '../engine/zones/lootProcessor';
import { processClears, type ProcessClearsResult } from '../engine/zones/lootProcessor';

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
  processNewClears: (clearCount: number, lootMultiplier?: number) => ProcessClearsResult | null;
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

  // Craft log & output buffer
  addCraftLogEntry: (entry: Omit<CraftLogEntry, 'id' | 'timestamp'>) => void;
  clearCraftLog: () => void;
  claimCraftOutput: (itemId: string) => void;
  claimAllCraftOutput: () => void;
  salvageCraftOutput: (itemId: string) => void;
  salvageAllCraftOutput: () => void;

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

  // Void invasions
  tickInvasions: () => void;
  forceInvasion: (band: number) => void;

  // Daily quests
  checkDailyQuestReset: () => void;
  claimQuestReward: (questId: string) => boolean;

  // Profession gear
  equipProfessionGear: (itemId: string) => void;
  unequipProfessionSlot: (slot: GearSlot) => void;

  // Tutorial
  advanceTutorial: (step: number) => void;
  dismissCraftingHint: () => void;

  // Pattern crafting
  craftFromPattern: (patternIndex: number) => { item: Item; wasSalvaged: boolean } | null;

  // Settings
  setAutoSalvageRarity: (rarity: Rarity) => void;
  setAutoDisposalAction: (action: 'salvage' | 'sell') => void;
  setCraftAutoSalvageRarity: (rarity: Rarity) => void;

  // Socket Gems
  socketGem: (itemSlot: GearSlot, gemIndex: number, socketIndex: number) => boolean;
  addGemToInventory: (gem: Gem) => boolean;
  upgradeGems: (type: GemType, tier: GemTier) => boolean;
  unsocketGem: (itemSlot: GearSlot, socketIndex: number) => void;

  // Utility
  resetGame: () => void;
}

function createInitialState(): GameState {
  const char = createCharacter('Exile', 'warrior');
  const starterWeapon: Item = {
    id: generateId(),
    baseId: 'crude_dagger',
    name: 'Crude Dagger',
    slot: 'mainhand',
    rarity: 'common',
    iLvl: 1,
    prefixes: [],
    suffixes: [],
    weaponType: 'dagger',
    baseStats: { spellPower: 2, baseAttackSpeed: 10, baseCritChance: 2 },
    baseDamageMin: 3,
    baseDamageMax: 7,
    baseSpellPower: 2,
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
    professionEquipment: {},
    craftingSkills: createDefaultCraftingSkills(),
    ownedPatterns: [],
    autoSalvageMinRarity: 'common',
    autoDisposalAction: 'salvage' as const,
    craftAutoSalvageMinRarity: 'common',
    offlineProgress: null,
    abilityProgress: {},
    clearStartedAt: 0,
    currentClearTime: 0,
    currentHp: 0,
    currentEs: 0,
    combatPhase: 'clearing' as CombatPhase,
    bossState: null,
    zoneClearCounts: {},
    combatPhaseStartedAt: null,
    classResource: createResourceState('warrior'),
    classSelected: false,
    totalKills: 0,
    fastestClears: {},
    skillBar: [null, null, null, null],
    skillProgress: {},
    skillTimers: [],
    talentAllocations: [],
    activeDebuffs: [],
    consecutiveHits: 0,
    lastSkillsCast: [],
    lastOverkillDamage: 0,
    killStreak: 0,
    lastCritAt: 0,
    lastBlockAt: 0,
    lastDodgeAt: 0,
    dodgeEntropy: Math.floor(Math.random() * 100),
    tempBuffs: [],
    skillCharges: {},
    rampingStacks: 0, rampingLastHitAt: 0,
    fortifyStacks: 0, fortifyExpiresAt: 0, fortifyDRPerStack: 0,
    deathStreak: 0, lastDeathTime: 0,
    lastHitMobTypeId: null, freeCastUntil: {}, lastProcTriggerAt: {},
    lastClearResult: null,
    lastSkillActivation: 0,
    nextActiveSkillAt: 0,
    packMobs: [],
    currentPackSize: 1,
    targetedMobId: null,
    currentMobTypeId: null,
    mobKillCounts: {},
    bossKillCounts: {},
    totalZoneClears: {},
    dailyQuests: { questDate: '', quests: [], progress: {} },
    craftLog: [],
    craftOutputBuffer: [],
    gemInventory: [],
    zoneMasteryClaimed: {},
    invasionState: { activeInvasions: {}, bandCooldowns: {} },
    tutorialStep: 1,
    hasSeenCraftingHint: false,
    lastSaveTime: Date.now(),
  };
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    ((set, get) => ({
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
          if (Math.random() < 0.4) currReward.exalt = 1;
          if (Math.random() < 0.1) currReward.chaos = 1;
        } else if (RARITY_ORDER[item.rarity] >= RARITY_ORDER['uncommon']) {
          if (Math.random() < 0.3) currReward.exalt = 1;
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
              const pb = resolveProfessionBonuses(state.professionEquipment);
              initialClearTime = calcGatherClearTime(state.gatheringSkills[profession].level, zone, pb.gatherSpeed);
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

        // Real-time combat: initialize per-mob pack (10K-A) — pick mob and use its hpMultiplier
        let initialPackMobs: MobInPack[] = [];
        let initialMobTypeId: string | null = null;
        let initialPackSize = 1;
        if (zone && state.idleMode === 'combat') {
          initialMobTypeId = pickCurrentMob(zoneId, state.targetedMobId);
          const initialMobDef = initialMobTypeId ? getMobTypeDef(initialMobTypeId) : undefined;
          const hpMult = initialMobDef?.hpMultiplier ?? 1.0;
          const invMult = isZoneInvaded(state.invasionState, zoneId, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
          initialPackMobs = spawnPack(zone, hpMult, invMult, now, initialMobDef?.damageElement, initialMobDef?.physRatio);
          initialPackSize = initialPackMobs.length;
        }

        set({
          currentZoneId: zoneId,
          idleStartTime: now,
          clearStartedAt: now,
          currentClearTime: initialClearTime,
          currentHp: stats.maxLife,
          currentEs: stats.energyShield,
          combatPhase: 'clearing' as CombatPhase,
          bossState: null,
          combatPhaseStartedAt: null,
          lastClearResult: clearResult,
          classResource: newResource,
          zoneClearCounts: newZoneClearCounts,
          currentMobTypeId: initialMobTypeId,
          nextActiveSkillAt: now,
          packMobs: initialPackMobs,
          currentPackSize: initialPackSize,
        });
      },

      processNewClears: (clearCount: number, lootMultiplier: number = 1) => {
        const state = get();
        const result = processClears(state, clearCount, lootMultiplier);
        if (!result) return null;
        set(result.patch);
        return result.summary;
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
          packMobs: [],
        });
      },

      setTargetedMob: (mobTypeId: string | null) => {
        const state = get();
        // If mid-run, respawn pack with the new target's hpMultiplier
        if (state.idleStartTime && state.currentZoneId && state.idleMode === 'combat') {
          const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
          if (zone) {
            const currentMob = pickCurrentMob(state.currentZoneId, mobTypeId);
            const targetMobDef = currentMob ? getMobTypeDef(currentMob) : undefined;
            const hpMult = targetMobDef?.hpMultiplier ?? 1.0;
            const invMult = isZoneInvaded(state.invasionState, state.currentZoneId, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
            const newPack = spawnPack(zone, hpMult, invMult, Date.now(), targetMobDef?.damageElement, targetMobDef?.physRatio);
            set({ targetedMobId: mobTypeId, currentMobTypeId: currentMob, packMobs: newPack, currentPackSize: newPack.length });
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
          const pb = resolveProfessionBonuses(state.professionEquipment);
          return calcGatherClearTime(state.gatheringSkills[profession].level, zone, pb.gatherSpeed);
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
              const pb = resolveProfessionBonuses(get().professionEquipment);
              const newClearTime = calcGatherClearTime(get().gatheringSkills[profession].level, zone, pb.gatherSpeed);
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

      // --- Bag actions (canonical logic in uiStore; kept here for internal callers) ---
      // ─── Bag actions (delegated to uiStore) ─────
      equipBag: (bagDefId: string, slotIndex: number) => {
        return useUiStore.getState().equipBag(bagDefId, slotIndex);
      },
      sellBag: (bagDefId: string) => {
        return useUiStore.getState().sellBag(bagDefId);
      },
      salvageBag: (bagDefId: string) => {
        return useUiStore.getState().salvageBag(bagDefId);
      },
      buyBag: (bagDefId: string) => {
        return useUiStore.getState().buyBag(bagDefId);
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

      // ─── Crafting actions (delegated to craftingStore) ──────
      refineMaterial: (recipeId: string) => {
        return useCraftingStore.getState().refineMaterial(recipeId);
      },

      refineMaterialBatch: (recipeId: string, count: number) => {
        return useCraftingStore.getState().refineMaterialBatch(recipeId, count);
      },

      deconstructMaterial: (refinedId: string) => {
        return useCraftingStore.getState().deconstructMaterial(refinedId);
      },

      craftRecipe: (recipeId: string, catalystId?: string, affixCatalystId?: string) => {
        return useCraftingStore.getState().craftRecipe(recipeId, catalystId, affixCatalystId);
      },

      craftRecipeBatch: (recipeId: string, count: number, catalystId?: string, affixCatalystId?: string) => {
        return useCraftingStore.getState().craftRecipeBatch(recipeId, count, catalystId, affixCatalystId);
      },

      // ─── Craft Log & Output Buffer (delegated to craftingStore) ──

      addCraftLogEntry: (entry) => {
        useCraftingStore.getState().addCraftLogEntry(entry);
      },

      clearCraftLog: () => useCraftingStore.getState().clearCraftLog(),

      claimCraftOutput: (itemId: string) => {
        useCraftingStore.getState().claimCraftOutput(itemId);
      },

      claimAllCraftOutput: () => {
        useCraftingStore.getState().claimAllCraftOutput();
      },

      salvageCraftOutput: (itemId: string) => {
        useCraftingStore.getState().salvageCraftOutput(itemId);
      },

      salvageAllCraftOutput: () => {
        useCraftingStore.getState().salvageAllCraftOutput();
      },

      // --- Offline progress (delegated to uiStore) ---
      claimOfflineProgress: () => {
        useUiStore.getState().claimOfflineProgress();
      },

      // ─── Skill/talent actions (delegated to skillStore) ─────
      allocateAbilityNode: (abilityId: string, nodeId: string) => {
        useSkillStore.getState().allocateAbilityNode(abilityId, nodeId);
      },

      respecAbility: (abilityId: string) => {
        useSkillStore.getState().respecAbility(abilityId);
      },

      allocateTalentNode: (nodeId: string) => {
        useSkillStore.getState().allocateTalentNode(nodeId);
      },

      respecTalents: () => {
        useSkillStore.getState().respecTalents();
      },

      equipSkill: (skillId: string, slot?: number) => {
        useSkillStore.getState().equipSkill(skillId, slot);
      },

      // ── Unified Skill Bar Actions (delegated to skillStore) ──

      equipToSkillBar: (skillId: string, slotIndex: number) => {
        useSkillStore.getState().equipToSkillBar(skillId, slotIndex);
      },

      unequipSkillBarSlot: (slotIndex: number) => {
        useSkillStore.getState().unequipSkillBarSlot(slotIndex);
      },

      toggleSkillAutoCast: (slotIndex: number) => {
        useSkillStore.getState().toggleSkillAutoCast(slotIndex);
      },

      reorderSkillBar: (fromSlot: number, toSlot: number) => {
        useSkillStore.getState().reorderSkillBar(fromSlot, toSlot);
      },

      activateSkillBarSlot: (slotIndex: number) => {
        useSkillStore.getState().activateSkillBarSlot(slotIndex);
      },

      tickAutoCast: () => {
        useSkillStore.getState().tickAutoCast();
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
        const state = get();
        const { patch, result } = runCombatTick(state, dtSec);
        if (Object.keys(patch).length > 0) set(patch);
        return result;
      },

      startBossFight: () => {
        const state = get();
        if (!state.currentZoneId) return;
        const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
        if (!zone) return;
        const abilityEffect = getFullEffect(state, Date.now(), false);
        const boss = createBossEncounter(state.character, zone, abilityEffect, undefined, state.skillBar, state.skillProgress);
        set({
          combatPhase: 'boss_fight' as CombatPhase,
          bossState: boss,
          combatPhaseStartedAt: Date.now(),
          nextActiveSkillAt: Date.now(),
          packMobs: [],
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

        // Roll for boss pattern drop
        const bossPatternDrops: string[] = [];
        const bossPatChance = BOSS_PATTERN_DROP_CHANCE[zone.band] ?? 0;
        if (bossPatChance > 0 && Math.random() < bossPatChance) {
          const pat = rollPatternDrop(zone.band, 'boss_drop');
          if (pat) bossPatternDrops.push(pat.id);
        }

        // Create OwnedPattern entries from boss pattern drops
        const newOwnedPatterns = [...state.ownedPatterns];
        for (const patId of bossPatternDrops) {
          const patDef = getPatternDef(patId);
          if (!patDef) continue;
          const chargeRange = PATTERN_CHARGES[patDef.source] ?? { min: 5, max: 10 };
          const bonusCharges = getPatternChargeBonus(state.craftingSkills, patDef.profession);
          const charges = chargeRange.min + Math.floor(Math.random() * (chargeRange.max - chargeRange.min + 1)) + bonusCharges;
          newOwnedPatterns.push({ defId: patId, charges, discoveredAt: Date.now() });
        }

        // Chance-based boss gem drop (same rate as normal clears)
        const bossGemDrop = rollGemDrop(zone.band);
        const bossGemDrops: Gem[] = bossGemDrop ? [bossGemDrop] : [];
        const newGemInventory = [...state.gemInventory];
        for (const gem of bossGemDrops) {
          if (newGemInventory.length < GEM_INVENTORY_CAP) {
            newGemInventory.push(gem);
          }
        }

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
          ownedPatterns: newOwnedPatterns,
          gemInventory: newGemInventory,
        });

        return {
          items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
          overflowCount: salvageStats.itemsSalvaged,
          dustGained: salvageStats.dustGained,
          bagDrops: {},
          currencyDrops: { chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
          materialDrops: {},
          goldGained: bossAutoSoldGold,
          autoSoldCount: bossAutoSoldCount,
          autoSoldGold: bossAutoSoldGold,
          patternDrops: bossPatternDrops,
          gemDrops: bossGemDrops,
        };
      },

      handleBossDefeat: () => {
        const state = get();
        const newZoneClearCounts = { ...state.zoneClearCounts };
        if (state.currentZoneId) {
          delete newZoneClearCounts[state.currentZoneId];
        }
        const bossDeathNow = Date.now();
        const bossStreakReset = bossDeathNow - state.lastDeathTime > DEATH_STREAK_WINDOW * 1000;
        const bossNewStreak = bossStreakReset ? 0 : state.deathStreak + 1;
        set({
          combatPhase: 'boss_defeat' as CombatPhase,
          currentHp: 0,
          combatPhaseStartedAt: bossDeathNow,
          zoneClearCounts: newZoneClearCounts,
          deathStreak: bossNewStreak,
          lastDeathTime: bossDeathNow,
        });
      },

      checkRecoveryComplete: () => {
        const state = get();
        if (state.combatPhase !== 'boss_victory' && state.combatPhase !== 'boss_defeat' && state.combatPhase !== 'zone_defeat') return false;
        if (!state.combatPhaseStartedAt) return false;

        const isDefeat = state.combatPhase === 'boss_defeat' || state.combatPhase === 'zone_defeat';
        const zone = state.currentZoneId ? ZONE_DEFS.find(z => z.id === state.currentZoneId) : null;
        const band = zone?.band ?? 1;

        // Death penalty duration: scales with band and death streak
        const duration = isDefeat
          ? calcDeathPenalty(band, state.deathStreak)
          : BOSS_VICTORY_DURATION;

        const elapsed = (Date.now() - state.combatPhaseStartedAt) / 1000;
        const stats = resolveStats(state.character);

        if (isDefeat) {
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

          // Spawn new pack for real-time combat (10K-A)
          const recoveryMobId = zone ? pickCurrentMob(zone.id, state.targetedMobId) : null;
          const recoveryMobDef = recoveryMobId ? getMobTypeDef(recoveryMobId) : undefined;
          const recoveryHpMult = recoveryMobDef?.hpMultiplier ?? 1.0;
          const recoveryInvMult = zone && state.currentZoneId && isZoneInvaded(state.invasionState, state.currentZoneId, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
          const recoveryNow = Date.now();
          const recoveryPack = zone ? spawnPack(zone, recoveryHpMult, recoveryInvMult, recoveryNow, recoveryMobDef?.damageElement, recoveryMobDef?.physRatio) : [];

          // Reset boss progress on any death (zone or boss defeat)
          const recoveryZoneClearCounts = isDefeat && state.currentZoneId
            ? { ...state.zoneClearCounts, [state.currentZoneId]: 0 }
            : state.zoneClearCounts;

          set({
            combatPhase: 'clearing' as CombatPhase,
            bossState: null,
            combatPhaseStartedAt: null,
            currentHp: Math.min(stats.maxLife, healedHp),
            currentEs: stats.energyShield,
            currentMobTypeId: recoveryMobId,
            nextActiveSkillAt: recoveryNow,
            packMobs: recoveryPack,
            currentPackSize: recoveryPack.length,
            zoneClearCounts: recoveryZoneClearCounts,
          });
          return true;
        }
        return false;
      },

      // --- Profession Gear ---

      // --- Profession gear (delegated to uiStore) ---
      equipProfessionGear: (itemId: string) => {
        useUiStore.getState().equipProfessionGear(itemId);
      },
      unequipProfessionSlot: (slot: GearSlot) => {
        useUiStore.getState().unequipProfessionSlot(slot);
      },

      // --- Tutorial (delegated to uiStore) ---
      advanceTutorial: (step: number) => {
        useUiStore.getState().advanceTutorial(step);
      },
      dismissCraftingHint: () => {
        set({ hasSeenCraftingHint: true });
      },

      setAutoSalvageRarity: (rarity: Rarity) => {
        set({ autoSalvageMinRarity: rarity });
      },

      setAutoDisposalAction: (action: 'salvage' | 'sell') => {
        set({ autoDisposalAction: action });
      },

      setCraftAutoSalvageRarity: (rarity: Rarity) => {
        useCraftingStore.getState().setCraftAutoSalvageRarity(rarity);
      },

      // --- Pattern Crafting (delegated to craftingStore) ---
      craftFromPattern: (patternIndex: number) => {
        return useCraftingStore.getState().craftFromPattern(patternIndex);
      },

      // --- Daily Quests ---
      tickInvasions: () => {
        const state = get();
        const now = Date.now();
        const newInvasionState = tickInvasionsPure(state.invasionState, now, ZONE_DEFS);
        // Deep-compare active invasions to avoid unnecessary state churn
        // (tickInvasionsPure always returns a new object via spread, so !== is always true)
        const oldKeys = Object.keys(state.invasionState.activeInvasions);
        const newKeys = Object.keys(newInvasionState.activeInvasions);
        const invasionsChanged = oldKeys.length !== newKeys.length
          || oldKeys.some(k => state.invasionState.activeInvasions[Number(k)]?.zoneId
            !== newInvasionState.activeInvasions[Number(k)]?.zoneId);
        const cooldownsChanged = Object.keys(newInvasionState.bandCooldowns).some(
          k => state.invasionState.bandCooldowns[Number(k)] !== newInvasionState.bandCooldowns[Number(k)]
        );
        if (invasionsChanged || cooldownsChanged) {
          set({ invasionState: newInvasionState });
        }
      },

      forceInvasion: (band: number) => {
        const state = get();
        const bandZones = ZONE_DEFS.filter(z => z.band === band);
        if (bandZones.length === 0) return;
        const picked = bandZones[Math.floor(Math.random() * bandZones.length)];
        const now = Date.now();
        const duration = INVASION_DURATION_MIN_MS + Math.random() * (INVASION_DURATION_MAX_MS - INVASION_DURATION_MIN_MS);
        const newActive = { ...state.invasionState.activeInvasions };
        newActive[band] = { zoneId: picked.id, startTime: now, endTime: now + duration };
        set({ invasionState: { ...state.invasionState, activeInvasions: newActive } });
      },

      // --- Daily quests (delegated to questStore) ---
      checkDailyQuestReset: () => {
        useQuestStore.getState().checkDailyQuestReset();
      },
      claimQuestReward: (questId: string) => {
        return useQuestStore.getState().claimQuestReward(questId);
      },

      // --- Socket Gems ---
      socketGem: (itemSlot: GearSlot, gemIndex: number, socketIndex: number) => {
        const state = get();
        const gem = state.gemInventory[gemIndex];
        if (!gem) return false;

        const item = state.character.equipment[itemSlot];
        if (!item || !item.sockets || socketIndex >= item.sockets.length) return false;

        // Validate gem category matches slot
        if (!isGemValidForSlot(gem.type, item.slot)) return false;

        // Clone item and socket the gem (old gem destroyed — free overwrite)
        const newSockets = [...item.sockets];
        newSockets[socketIndex] = gem;
        const newItem: Item = {
          ...item,
          prefixes: [...item.prefixes],
          suffixes: [...item.suffixes],
          baseStats: { ...item.baseStats },
          sockets: newSockets,
        };

        // Remove gem from inventory
        const newGemInventory = [...state.gemInventory];
        newGemInventory.splice(gemIndex, 1);

        // Update equipment and re-resolve stats
        const newEquipment = { ...state.character.equipment, [itemSlot]: newItem };
        const newChar = { ...state.character, equipment: newEquipment };
        newChar.stats = resolveStats(newChar);

        set({ character: newChar, gemInventory: newGemInventory });
        return true;
      },

      addGemToInventory: (gem: Gem) => {
        const state = get();
        if (state.gemInventory.length >= GEM_INVENTORY_CAP) return false;
        set({ gemInventory: [...state.gemInventory, gem] });
        return true;
      },

      upgradeGems: (type: GemType, tier: GemTier) => {
        const state = get();
        if (tier <= 1) return false; // T1 is max
        if (!canUpgradeGem(state.gemInventory, type, tier)) return false;

        const outputTier = (tier - 1) as GemTier;
        const cost = GEM_UPGRADE_GOLD_COST[outputTier];
        if (state.gold < cost) return false;

        const { newGem, remainingGems } = upgradeGemEngine(state.gemInventory, type, tier);
        set({
          gemInventory: [...remainingGems, newGem],
          gold: state.gold - cost,
        });
        return true;
      },

      unsocketGem: (itemSlot: GearSlot, socketIndex: number) => {
        const state = get();
        const item = state.character.equipment[itemSlot];
        if (!item || !item.sockets || socketIndex >= item.sockets.length) return;
        const gem = item.sockets[socketIndex];
        if (!gem) return;

        // Remove gem from socket
        const unsocketSockets = [...item.sockets];
        unsocketSockets[socketIndex] = null;
        const newItem: Item = {
          ...item,
          prefixes: [...item.prefixes],
          suffixes: [...item.suffixes],
          baseStats: { ...item.baseStats },
          sockets: unsocketSockets,
        };

        // Add gem back to inventory (if room)
        const newGemInventory = state.gemInventory.length < GEM_INVENTORY_CAP
          ? [...state.gemInventory, gem]
          : state.gemInventory; // gem lost if inventory full

        const newEquipment = { ...state.character.equipment, [itemSlot]: newItem };
        const newChar = { ...state.character, equipment: newEquipment };
        newChar.stats = resolveStats(newChar);

        set({ character: newChar, gemInventory: newGemInventory });
      },

      resetGame: () => {
        set(createInitialState());
      },
    })) as import('zustand').StateCreator<GameState & GameActions, [['zustand/persist', unknown]], []>,
    {
      name: 'idle-exile-save',
      version: 56,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) return;
          handleRehydrate(state, () => {
            useGameStore.getState().checkDailyQuestReset();
          });
        };
      },
      migrate: (persisted: unknown, version: number) => {
        const migrated = runMigrations(persisted, version, createInitialState);
        return migrated;
      },
    }
  )
);

// ── Tab-refocus catchup: run headless sim for time lost while backgrounded ──
// The 250ms setInterval in CombatPanel gets throttled/suspended by browsers when
// the tab is hidden. We pause the tick loop via `isTabHidden` and run the headless
// sim for the full gap when the tab becomes visible again.

let _tabHiddenAt = 0;
let _isTabHidden = false;

/** True when the browser tab is hidden. CombatPanel should skip ticks. */
export function isTabHidden(): boolean { return _isTabHidden; }

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      _isTabHidden = true;
      _tabHiddenAt = Date.now();
      return;
    }

    // Tab became visible again — unblock ticks immediately
    _isTabHidden = false;

    if (!_tabHiddenAt) return;
    const gapSeconds = (Date.now() - _tabHiddenAt) / 1000;
    _tabHiddenAt = 0;

    // Only catch up if gap is meaningful (>5s)
    if (gapSeconds < 5) return;

    const state = useGameStore.getState();
    // Only run if we're actively in combat mode with a zone
    if (!state.currentZoneId || !state.idleStartTime || state.idleMode !== 'combat') return;
    // Don't interrupt an already-showing offline modal
    if (state.offlineProgress) return;

    const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
    if (!zone) return;

    console.log(`[TabCatchup] Tab was hidden for ${gapSeconds.toFixed(0)}s, running headless sim...`);

    const simResult = simulateOfflineCombat(state as GameState, gapSeconds);
    console.log(`[TabCatchup] ${simResult.totalMobKills} kills, ${simResult.totalDeaths} deaths in ${simResult.elapsedSimMs.toFixed(0)}ms`);

    if (simResult.totalMobKills === 0 && !simResult.deathLoopDetected) return; // Nothing happened

    // Generate loot via existing simulateIdleRun
    const passiveEffect = getFullEffect(state, Date.now(), true);
    const syntheticClearTime = simResult.totalMobKills > 0
      ? gapSeconds / simResult.totalMobKills : 999;
    const result = simulateIdleRun(state.character, zone, gapSeconds, syntheticClearTime, passiveEffect);
    result.items.push(...simResult.bossLoot);

    // Dry run auto-salvage/sell for display
    const capacity = calcBagCapacity(state.bagSlots);
    const { salvageStats, autoSoldGold: catchupAutoSoldGold, autoSoldCount: catchupAutoSoldCount } = addItemsWithOverflow(
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
      elapsedSeconds: gapSeconds,
      clearsCompleted: simResult.totalMobKills,
      items: result.items,
      autoSalvagedCount: salvageStats.itemsSalvaged,
      autoSalvagedDust: salvageStats.dustGained,
      autoSoldCount: catchupAutoSoldCount,
      autoSoldGold: catchupAutoSoldGold,
      goldGained: result.goldGained,
      xpGained: result.xpGained,
      materials: result.materials,
      currencyDrops: result.currencyDrops,
      bagDrops: result.bagDrops,
      bestItem: best,
      totalDeaths: simResult.totalDeaths,
      bossVictories: simResult.bossVictories,
      deathLoopDetected: simResult.deathLoopDetected,
    };

    // Reset idleStartTime so real-time tick resumes from now
    // Respawn pack for fresh combat
    const catchupMobId = pickCurrentMob(state.currentZoneId!, state.targetedMobId);
    const catchupMobDef = catchupMobId ? getMobTypeDef(catchupMobId) : undefined;
    const catchupHpMult = catchupMobDef?.hpMultiplier ?? 1.0;
    const catchupInvMult = isZoneInvaded(state.invasionState, state.currentZoneId!, zone.band)
      ? INVASION_DIFFICULTY_MULT : 1.0;
    const catchupNow = Date.now();

    // Heal to full after catchup (same as rehydration)
    const catchupStats = resolveStats(state.character);

    useGameStore.setState({
      offlineProgress: summary,
      idleStartTime: catchupNow,
      packMobs: spawnPack(zone, catchupHpMult, catchupInvMult, catchupNow, catchupMobDef?.damageElement, catchupMobDef?.physRatio),
      currentPackSize: state.currentPackSize,
      currentMobTypeId: catchupMobId,
      currentHp: catchupStats.maxLife,
      currentEs: catchupStats.energyShield,
      combatPhase: 'clearing' as CombatPhase,
      bossState: null,
      combatPhaseStartedAt: null,
      activeDebuffs: [],
      tempBuffs: [],
    });
  });
}

export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

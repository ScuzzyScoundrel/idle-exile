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
} from '../types';
import { createCharacter, resolveStats, addXp } from '../engine/character';
import { simulateSingleClear, simulateIdleRun, simulateGatheringClear, calcClearTime } from '../engine/zones';
import { pickBestItem, getEquippedWeaponType } from '../engine/items';
import { applyCurrency } from '../engine/crafting';
import { aggregateAbilityEffects, getIncompatibleAbilities, getEffectiveDuration } from '../engine/abilities';
import { getAbilityDef } from '../data/abilities';
import { ZONE_DEFS } from '../data/zones';
import { BAG_UPGRADE_DEFS, getBagDef, calcBagCapacity, BAG_SLOT_COUNT } from '../data/items';
import { addGatheringXp, calcGatherClearTime, createDefaultGatheringSkills } from '../engine/gathering';
import { createDefaultCraftingSkills } from '../data/craftingProfessions';
import { calcRareFindBonus } from '../engine/rareMaterials';
import { canRefine, refine, canDeconstruct, deconstruct } from '../engine/refinement';
import { canCraftRecipe, executeCraft, addCraftingXp, getCraftingXpForTier } from '../engine/craftingProfessions';
import { REFINEMENT_RECIPES } from '../data/refinement';
import { getCraftingRecipe } from '../data/craftingRecipes';


const INITIAL_CURRENCIES: Record<CurrencyType, number> = {
  augment: 50,
  chaos: 50,
  divine: 50,
  annul: 50,
  exalt: 50,
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

/** Salvage dust reward by rarity. */
const SALVAGE_DUST: Record<Rarity, number> = {
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
  materials: Record<string, number>,
  items: Item[],
): { newInventory: Item[]; newMaterials: Record<string, number>; salvageStats: SalvageStats; keptItems: Item[] } {
  const newInventory = [...inventory];
  const newMaterials = { ...materials };
  const minOrder = RARITY_ORDER[autoSalvageMinRarity];
  let itemsSalvaged = 0;
  let dustGained = 0;
  const keptItems: Item[] = [];

  for (const item of items) {
    // Auto-salvage by rarity threshold
    if (minOrder > 0 && RARITY_ORDER[item.rarity] < minOrder) {
      dustGained += SALVAGE_DUST[item.rarity];
      itemsSalvaged++;
      continue;
    }
    // Overflow: salvage if at capacity
    if (newInventory.length >= inventoryCapacity) {
      dustGained += SALVAGE_DUST[item.rarity];
      itemsSalvaged++;
      continue;
    }
    newInventory.push(item);
    keptItems.push(item);
  }

  if (dustGained > 0) {
    newMaterials['salvage_dust'] = (newMaterials['salvage_dust'] || 0) + dustGained;
  }

  return { newInventory, newMaterials, salvageStats: { itemsSalvaged, dustGained }, keptItems };
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
  rareMaterialDrops?: Record<string, number>;
  // Gathering-specific fields
  gatheringXpGained?: number;
}

interface GameActions {
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
  deconstructMaterial: (refinedId: string) => boolean;
  craftRecipe: (recipeId: string, catalystId?: string) => { item: Item } | null;

  // Offline progression
  claimOfflineProgress: () => void;

  // Abilities (Sprint 4)
  equipAbility: (slotIndex: number, abilityId: string) => void;
  unequipAbility: (slotIndex: number) => void;
  selectMutator: (slotIndex: number, mutatorId: string | null) => void;
  activateAbility: (abilityId: string) => void;

  // Settings
  setAutoSalvageRarity: (rarity: Rarity) => void;

  // Utility
  resetGame: () => void;
}

function createInitialState(): GameState {
  const char = createCharacter('Warrior', 'warrior');
  return {
    character: { ...char, stats: resolveStats(char) },
    inventory: [],
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
    offlineProgress: null,
    equippedAbilities: [null, null, null, null],
    abilityTimers: [],
    lastSaveTime: Date.now(),
  };
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

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

          const currentlyEquipped = state.character.equipment[targetSlot];
          const newInventory = state.inventory.filter((i) => i.id !== item.id);
          if (currentlyEquipped) {
            newInventory.push(currentlyEquipped);
          }
          const newChar: Character = {
            ...state.character,
            equipment: { ...state.character.equipment, [targetSlot]: item },
          };
          newChar.stats = resolveStats(newChar);

          // If mainhand changed, strip incompatible abilities
          const updates: Partial<GameState> = { character: newChar, inventory: newInventory };
          if (targetSlot === 'mainhand') {
            const newWeaponType = item.weaponType ?? null;
            const incompatible = getIncompatibleAbilities(state.equippedAbilities, newWeaponType);
            if (incompatible.length > 0) {
              const newAbilities = state.equippedAbilities.map(ea => {
                if (ea && incompatible.includes(ea.abilityId)) return null;
                return ea;
              });
              const newTimers = state.abilityTimers.filter(t => !incompatible.includes(t.abilityId));
              updates.equippedAbilities = newAbilities;
              updates.abilityTimers = newTimers;
            }
          }
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
          return {
            character: newChar,
            inventory: [...state.inventory, item],
          };
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

        // Salvage dust based on rarity
        const matReward: Record<string, number> = {};
        matReward['salvage_dust'] = SALVAGE_DUST[item.rarity];
        const iLvlBonus = Math.floor(item.iLvl / 10);
        matReward['salvage_dust'] += iLvlBonus;

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
        set({
          currentZoneId: zoneId,
          idleStartTime: Date.now(),
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
          const { newInventory, newMaterials: matsAfterItems, salvageStats, keptItems } = addItemsWithOverflow(
            state.inventory,
            getInventoryCapacity(state),
            state.autoSalvageMinRarity,
            newMaterials,
            allItems,
          );

          set({
            materials: matsAfterItems,
            gatheringSkills: newGatheringSkills,
            inventory: newInventory,
          });

          return {
            items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
            overflowCount: salvageStats.itemsSalvaged,
            dustGained: salvageStats.dustGained,
            bagDrops: {},
            currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 },
            materialDrops: accMaterials,
            rareMaterialDrops: accRareMaterials,
            goldGained: 0,
            gatheringXpGained: totalGatheringXp,
          };
        }

        // ─── Combat Mode ───
        const allItems: Item[] = [];
        const accCurrencies: Record<CurrencyType, number> = { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 };
        const accMaterials: Record<string, number> = {};
        let accGold = 0;
        const accBagDrops: Record<string, number> = {};

        const abilityEffect = aggregateAbilityEffects(state.equippedAbilities, state.abilityTimers, Date.now(), false);

        for (let i = 0; i < clearCount; i++) {
          const clear = simulateSingleClear(state.character, zone, abilityEffect);
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
        }

        // Items go directly into bags (with overflow salvage)
        const { newInventory, newMaterials, salvageStats, keptItems } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.autoSalvageMinRarity,
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

        set({
          inventory: newInventory,
          materials: newMaterials,
          currencies: newCurrencies,
          gold: state.gold + accGold,
          bagStash: newBagStash,
        });

        return {
          items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
          overflowCount: salvageStats.itemsSalvaged,
          dustGained: salvageStats.dustGained,
          bagDrops: accBagDrops,
          currencyDrops: accCurrencies,
          materialDrops: accMaterials,
          goldGained: accGold,
        };
      },

      stopIdleRun: () => {
        set({ idleStartTime: null, currentZoneId: null });
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
        const zone = ZONE_DEFS.find((z) => z.id === zoneId);
        if (!zone) return 999;

        if (state.idleMode === 'gathering') {
          const profession = state.selectedGatheringProfession;
          if (!profession) return 999;
          return calcGatherClearTime(state.gatheringSkills[profession].level, zone);
        }

        const abilityEffect = aggregateAbilityEffects(state.equippedAbilities, state.abilityTimers, Date.now(), false);
        return calcClearTime(state.character.stats, zone, state.character.level, abilityEffect);
      },

      setIdleMode: (mode: IdleMode) => {
        const state = get();
        // Stop run if switching modes while running
        if (state.idleStartTime) {
          set({ idleStartTime: null, currentZoneId: null, idleMode: mode });
        } else {
          set({ idleMode: mode });
        }
      },

      setGatheringProfession: (profession: GatheringProfession) => {
        set({ selectedGatheringProfession: profession });
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
        newMaterials['salvage_dust'] = (newMaterials['salvage_dust'] || 0) + def.salvageValue;
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

      deconstructMaterial: (refinedId: string) => {
        const state = get();
        if (!canDeconstruct(refinedId, state.materials)) return false;
        const newMaterials = deconstruct(refinedId, state.materials);
        set({ materials: newMaterials });
        return true;
      },

      craftRecipe: (recipeId: string, catalystId?: string) => {
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
        const newGold = state.gold - recipe.goldCost;

        // Generate item
        const item = executeCraft(recipe, catalystId);

        // Add crafting XP
        const xp = getCraftingXpForTier(recipe.tier);
        const newCraftingSkills = addCraftingXp(state.craftingSkills, recipe.profession, xp);

        // Add item to inventory (overflow → auto-salvage)
        const { newInventory, newMaterials: matsAfterItems } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.autoSalvageMinRarity,
          newMaterials,
          [item],
        );

        set({
          materials: matsAfterItems,
          gold: newGold,
          craftingSkills: newCraftingSkills,
          inventory: newInventory,
        });

        return { item };
      },

      claimOfflineProgress: () => {
        const state = get();
        const progress = state.offlineProgress;
        if (!progress) return;

        // Process items into inventory (overflow auto-salvaged at claim time)
        const { newInventory, newMaterials } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.autoSalvageMinRarity,
          state.materials,
          progress.items,
        );

        // Apply gold
        const newGold = state.gold + progress.goldGained;

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

        set({
          character: newChar,
          inventory: newInventory,
          materials: newMaterials,
          currencies: newCurrencies,
          gold: newGold,
          bagStash: newBagStash,
          offlineProgress: null,
        });
      },

      equipAbility: (slotIndex: number, abilityId: string) => {
        set((state) => {
          const def = getAbilityDef(abilityId);
          if (!def) return state;
          // Check weapon compatibility
          const weaponType = getEquippedWeaponType(state.character.equipment);
          if (weaponType && def.weaponType !== weaponType) return state;

          const newAbilities = [...state.equippedAbilities];
          newAbilities[slotIndex] = { abilityId, selectedMutatorId: null };

          // Init timer for active abilities
          let newTimers = [...state.abilityTimers];
          if (def.kind === 'active') {
            // Remove old timer if exists
            newTimers = newTimers.filter(t => t.abilityId !== abilityId);
            newTimers.push({ abilityId, activatedAt: null, cooldownUntil: null });
          }

          return { equippedAbilities: newAbilities, abilityTimers: newTimers };
        });
      },

      unequipAbility: (slotIndex: number) => {
        set((state) => {
          const equipped = state.equippedAbilities[slotIndex];
          if (!equipped) return state;
          const newAbilities = [...state.equippedAbilities];
          newAbilities[slotIndex] = null;
          const newTimers = state.abilityTimers.filter(t => t.abilityId !== equipped.abilityId);
          return { equippedAbilities: newAbilities, abilityTimers: newTimers };
        });
      },

      selectMutator: (slotIndex: number, mutatorId: string | null) => {
        set((state) => {
          const equipped = state.equippedAbilities[slotIndex];
          if (!equipped) return state;
          const newAbilities = [...state.equippedAbilities];
          newAbilities[slotIndex] = { ...equipped, selectedMutatorId: mutatorId };
          return { equippedAbilities: newAbilities };
        });
      },

      activateAbility: (abilityId: string) => {
        set((state) => {
          const equipped = state.equippedAbilities.find(ea => ea?.abilityId === abilityId);
          if (!equipped) return state;
          const def = getAbilityDef(abilityId);
          if (!def || def.kind !== 'active') return state;

          const now = Date.now();
          const timerIdx = state.abilityTimers.findIndex(t => t.abilityId === abilityId);
          if (timerIdx === -1) return state;

          const timer = state.abilityTimers[timerIdx];
          // Check if on cooldown
          if (timer.cooldownUntil && now < timer.cooldownUntil) return state;

          const duration = getEffectiveDuration(equipped);
          const newTimers = [...state.abilityTimers];
          newTimers[timerIdx] = {
            abilityId,
            activatedAt: now,
            cooldownUntil: now + (duration + (def.cooldown ?? 0)) * 1000,
          };
          return { abilityTimers: newTimers };
        });
      },

      setAutoSalvageRarity: (rarity: Rarity) => {
        set({ autoSalvageMinRarity: rarity });
      },

      resetGame: () => {
        set(createInitialState());
      },
    }),
    {
      name: 'idle-exile-save',
      version: 12,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) return;

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

          // Clean up stale ability timers
          if (state.abilityTimers) {
            state.abilityTimers = state.abilityTimers.map(t => ({
              ...t,
              cooldownUntil: t.cooldownUntil && t.cooldownUntil < Date.now() ? null : t.cooldownUntil,
              activatedAt: null, // Clear active buffs after offline
            }));
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
                goldGained: 0,
                xpGained: 0,
                materials: accMaterials,
                currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 },
                bagDrops: {},
                bestItem: null,
              };

              state.offlineProgress = summary;
            }
            state.idleStartTime = Date.now();
            return;
          }

          // Combat mode offline simulation — passive-only ability effects
          const passiveEffect = aggregateAbilityEffects(
            state.equippedAbilities ?? [null, null, null, null],
            state.abilityTimers ?? [],
            Date.now(),
            true, // offlineMode: passives only
          );
          const result = simulateIdleRun(character, zone, elapsedSeconds, passiveEffect);

          // Dry run to estimate auto-salvage stats for display
          const capacity = calcBagCapacity(state.bagSlots);
          const { salvageStats } = addItemsWithOverflow(
            state.inventory,
            capacity,
            state.autoSalvageMinRarity,
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
          state.equippedAbilities = [null, null, null, null];
          state.abilityTimers = [];
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

        return state;
      },
    }
  )
);

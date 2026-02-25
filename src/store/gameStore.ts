import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState,
  Character,
  Item,
  CurrencyType,
  GearSlot,
  CraftResult,
  PendingLoot,
  Rarity,
  OfflineProgressSummary,
} from '../types';
import { createCharacter, resolveStats, addXp } from '../engine/character';
import { simulateSingleClear, simulateIdleRun, calcClearTime } from '../engine/zones';
import { pickBestItem } from '../engine/items';
import { applyCurrency } from '../engine/crafting';
import { ZONE_DEFS } from '../data/zones';
import { BAG_UPGRADE_DEFS, getBagDef, calcBagCapacity, BAG_SLOT_COUNT } from '../data/items';


const INITIAL_CURRENCIES: Record<CurrencyType, number> = {
  augment: 50,
  chaos: 50,
  divine: 50,
  annul: 50,
  exalt: 50,
  socket: 50,
};

const EMPTY_PENDING_LOOT: PendingLoot = {
  currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 },
  materials: {},
  goldGained: 0,
  clearsCompleted: 0,
  bagDrops: {},
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

/** Combine two PendingLoot objects (resources-only, no items). */
function mergePendingLoot(a: PendingLoot, b: PendingLoot): PendingLoot {
  const currencyDrops = { ...a.currencyDrops };
  for (const [key, val] of Object.entries(b.currencyDrops)) {
    currencyDrops[key as CurrencyType] += val;
  }
  const materials = { ...a.materials };
  for (const [key, val] of Object.entries(b.materials)) {
    materials[key] = (materials[key] || 0) + val;
  }
  const bagDrops = { ...a.bagDrops };
  for (const [key, val] of Object.entries(b.bagDrops)) {
    bagDrops[key] = (bagDrops[key] || 0) + val;
  }
  return {
    currencyDrops,
    materials,
    goldGained: a.goldGained + b.goldGained,
    clearsCompleted: a.clearsCompleted + b.clearsCompleted,
    bagDrops,
  };
}

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

/** Apply pending resource loot (no items) to state. */
function applyPendingResources(state: GameState, loot: PendingLoot): Partial<GameState> {
  const newCurrencies = { ...state.currencies };
  for (const [key, val] of Object.entries(loot.currencyDrops)) {
    newCurrencies[key as CurrencyType] += val;
  }
  const newMaterials = { ...state.materials };
  for (const [key, val] of Object.entries(loot.materials)) {
    newMaterials[key] = (newMaterials[key] || 0) + val;
  }
  const newBagStash = { ...state.bagStash };
  for (const [key, val] of Object.entries(loot.bagDrops)) {
    newBagStash[key] = (newBagStash[key] || 0) + val;
  }
  return {
    currencies: newCurrencies,
    materials: newMaterials,
    gold: state.gold + loot.goldGained,
    bagStash: newBagStash,
    pendingLoot: { ...EMPTY_PENDING_LOOT, currencyDrops: { ...EMPTY_PENDING_LOOT.currencyDrops }, bagDrops: {} },
  };
}

/** Result returned by processNewClears for the loot feed. */
export interface ProcessClearsResult {
  items: { name: string; rarity: Rarity }[];
  overflowCount: number;
  dustGained: number;
  bagDrops: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  materialDrops: Record<string, number>;
  goldGained: number;
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
  startIdleRun: (zoneId: string) => { bankedClears: number } | null;
  processNewClears: (clearCount: number) => ProcessClearsResult | null;
  collectIdleResults: () => { gold: number; materials: Record<string, number>; currencyDrops: Record<CurrencyType, number>; bagDrops: Record<string, number>; clearsCompleted: number } | null;
  stopIdleRun: () => { gold: number; materials: Record<string, number>; currencyDrops: Record<CurrencyType, number>; bagDrops: Record<string, number>; clearsCompleted: number } | null;
  grantIdleXp: (xp: number) => void;
  getEstimatedClearTime: (zoneId: string) => number;

  // Bag system
  equipBag: (bagDefId: string, slotIndex: number) => { replacedId: string; capacityDelta: number } | null;
  sellBag: (bagDefId: string) => boolean;
  salvageBag: (bagDefId: string) => boolean;
  buyBag: (bagDefId: string) => boolean;

  // Crafting
  craft: (itemId: string, currency: CurrencyType) => CraftResult | null;

  // Offline progression
  claimOfflineProgress: () => void;

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
    pendingLoot: { ...EMPTY_PENDING_LOOT, currencyDrops: { ...EMPTY_PENDING_LOOT.currencyDrops }, bagDrops: {} },
    bagSlots: Array(BAG_SLOT_COUNT).fill('tattered_satchel'),
    bagStash: {},
    currentZoneId: null,
    idleStartTime: null,
    autoSalvageMinRarity: 'common',
    offlineProgress: null,
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
          return { character: newChar, inventory: newInventory };
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
        const state = get();
        // Bank previous pending resources when switching zones (no item handling)
        const bankedClears = state.pendingLoot.clearsCompleted;
        set({
          currentZoneId: zoneId,
          idleStartTime: Date.now(),
        });
        return bankedClears > 0 ? { bankedClears } : null;
      },

      processNewClears: (clearCount: number) => {
        if (clearCount <= 0) return null;
        const state = get();
        if (!state.currentZoneId) return null;
        const zone = ZONE_DEFS.find((z) => z.id === state.currentZoneId);
        if (!zone) return null;

        // Generate drops for each clear
        const allItems: Item[] = [];
        const accResources: PendingLoot = {
          currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 },
          materials: {},
          goldGained: 0,
          clearsCompleted: clearCount,
          bagDrops: {},
        };

        for (let i = 0; i < clearCount; i++) {
          const clear = simulateSingleClear(state.character, zone);
          if (clear.item) allItems.push(clear.item);

          // Accumulate resources
          for (const [key, val] of Object.entries(clear.currencyDrops)) {
            accResources.currencyDrops[key as CurrencyType] += val;
          }
          for (const [key, val] of Object.entries(clear.materials)) {
            accResources.materials[key] = (accResources.materials[key] || 0) + val;
          }
          accResources.goldGained += clear.goldGained;
          if (clear.bagDrop) {
            accResources.bagDrops[clear.bagDrop] = (accResources.bagDrops[clear.bagDrop] || 0) + 1;
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

        // Accumulate resources into pendingLoot (collected later via button)
        const newPending = mergePendingLoot(state.pendingLoot, accResources);

        set({
          inventory: newInventory,
          materials: newMaterials,
          pendingLoot: newPending,
        });

        return {
          items: keptItems.map(it => ({ name: it.name, rarity: it.rarity })),
          overflowCount: salvageStats.itemsSalvaged,
          dustGained: salvageStats.dustGained,
          bagDrops: accResources.bagDrops,
          currencyDrops: accResources.currencyDrops,
          materialDrops: accResources.materials,
          goldGained: accResources.goldGained,
        };
      },

      collectIdleResults: () => {
        const state = get();
        const loot = state.pendingLoot;
        if (loot.clearsCompleted === 0) return null;

        const patch = applyPendingResources(state, loot);
        set({
          ...patch,
          idleStartTime: Date.now(),
        });
        return {
          gold: loot.goldGained,
          materials: loot.materials,
          currencyDrops: loot.currencyDrops,
          bagDrops: loot.bagDrops,
          clearsCompleted: loot.clearsCompleted,
        };
      },

      stopIdleRun: () => {
        const state = get();
        const loot = state.pendingLoot;
        if (loot.clearsCompleted === 0) {
          set({ idleStartTime: null, currentZoneId: null });
          return null;
        }
        const patch = applyPendingResources(state, loot);
        set({
          ...patch,
          idleStartTime: null,
          currentZoneId: null,
        });
        return {
          gold: loot.goldGained,
          materials: loot.materials,
          currencyDrops: loot.currencyDrops,
          bagDrops: loot.bagDrops,
          clearsCompleted: loot.clearsCompleted,
        };
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
        return calcClearTime(state.character.stats, zone, state.character.level);
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
        let newGold = state.gold + progress.goldGained;

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
        let newChar = addXp(state.character, progress.xpGained);
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

      setAutoSalvageRarity: (rarity: Rarity) => {
        set({ autoSalvageMinRarity: rarity });
      },

      resetGame: () => {
        set(createInitialState());
      },
    }),
    {
      name: 'idle-exile-save',
      version: 9,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) return;

          const { currentZoneId, idleStartTime, character } = state;
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

          // Simulate offline loot
          const result = simulateIdleRun(character, zone, elapsedSeconds);

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
        const state = { ...old } as GameState & GameActions;

        if (version < 7) {
          // v7: Add bag system fields, drop any old pendingLoot.items (alpha-stage)
          const oldPending = old.pendingLoot as Record<string, unknown> | undefined;
          state.pendingLoot = {
            currencyDrops: (oldPending?.currencyDrops as Record<CurrencyType, number>) ?? { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 },
            materials: (oldPending?.materials as Record<string, number>) ?? {},
            goldGained: (oldPending?.goldGained as number) ?? 0,
            clearsCompleted: (oldPending?.clearsCompleted as number) ?? 0,
            bagDrops: {},
          };
        }

        if (version < 8) {
          // v8: Replace inventoryCapacity/consumables with bagSlots/bagStash
          const oldCap = (old.inventoryCapacity as number) ?? 30;
          const oldConsumables = (old.consumables as Record<string, number>) ?? {};

          // Start with 5x tattered_satchel
          const bagSlots = Array(BAG_SLOT_COUNT).fill('tattered_satchel') as string[];

          // Count old upgrades from capacity (each was +6, base was 30)
          const upgradeCount = Math.min(Math.floor((oldCap - 30) / 6), 5);

          // Round-robin upgrade slots: bump one tier per upgrade
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

          // Clean up old fields
          delete (state as Record<string, unknown>).inventoryCapacity;
          delete (state as Record<string, unknown>).consumables;
        }

        if (version < 9) {
          // v9: Add offline progression field
          state.offlineProgress = null;
        }

        return state;
      },
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState,
  Character,
  Item,
  CurrencyType,
  GatheringFocus,
  GearSlot,
  IdleRunResult,
  CraftResult,
} from '../types';
import { createCharacter, resolveStats, addXp } from '../engine/character';
import { simulateIdleRun, calcClearTime } from '../engine/zones';
import { applyCurrency } from '../engine/crafting';
import { calcItemPower } from '../engine/items';
import { ZONE_DEFS } from '../data/zones';

const INITIAL_CURRENCIES: Record<CurrencyType, number> = {
  transmute: 5,
  augment: 3,
  chaos: 1,
  alchemy: 2,
  divine: 0,
  annul: 0,
  exalt: 0,
  regal: 1,
};

interface GameActions {
  // Character
  equipItem: (item: Item) => void;
  unequipSlot: (slot: GearSlot) => void;

  // Inventory
  addToInventory: (items: Item[]) => void;
  removeFromInventory: (itemId: string) => void;
  disenchantItem: (itemId: string) => void;

  // Zone / Idle
  startIdleRun: (zoneId: string, tier: number, focus: GatheringFocus) => void;
  collectIdleResults: () => IdleRunResult | null;
  getEstimatedClearTime: (zoneId: string, tier: number) => number;

  // Crafting
  craft: (itemId: string, currency: CurrencyType) => CraftResult | null;

  // Utility
  resetGame: () => void;
}

function createInitialState(): GameState {
  const char = createCharacter('Exile');
  return {
    character: { ...char, stats: resolveStats(char) },
    inventory: [],
    currencies: { ...INITIAL_CURRENCIES },
    materials: {},
    gold: 0,
    currentZoneId: null,
    currentZoneTier: 1,
    currentFocus: 'combat',
    idleStartTime: null,
    lastSaveTime: Date.now(),
  };
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      equipItem: (item: Item) => {
        set((state) => {
          const currentlyEquipped = state.character.equipment[item.slot];
          const newInventory = state.inventory.filter((i) => i.id !== item.id);
          if (currentlyEquipped) {
            newInventory.push(currentlyEquipped);
          }
          const newChar: Character = {
            ...state.character,
            equipment: { ...state.character.equipment, [item.slot]: item },
          };
          newChar.stats = resolveStats(newChar);
          return { character: newChar, inventory: newInventory };
        });
      },

      unequipSlot: (slot: GearSlot) => {
        set((state) => {
          const item = state.character.equipment[slot];
          if (!item) return state;
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
        set((state) => {
          const item = state.inventory.find((i) => i.id === itemId);
          if (!item) return state;
          // Currency reward based on rarity
          const reward: Partial<Record<CurrencyType, number>> = {};
          if (item.rarity === 'magic') {
            reward.transmute = 1;
          } else if (item.rarity === 'rare') {
            reward.transmute = 2;
            reward.augment = 1;
          } else {
            // normal items give nothing
          }
          const newCurrencies = { ...state.currencies };
          for (const [key, val] of Object.entries(reward)) {
            newCurrencies[key as CurrencyType] += val!;
          }
          return {
            inventory: state.inventory.filter((i) => i.id !== itemId),
            currencies: newCurrencies,
          };
        });
      },

      startIdleRun: (zoneId: string, tier: number, focus: GatheringFocus) => {
        set({
          currentZoneId: zoneId,
          currentZoneTier: tier,
          currentFocus: focus,
          idleStartTime: Date.now(),
        });
      },

      collectIdleResults: () => {
        const state = get();
        if (!state.currentZoneId || !state.idleStartTime) return null;

        const zone = ZONE_DEFS.find((z) => z.id === state.currentZoneId);
        if (!zone) return null;

        const elapsed = (Date.now() - state.idleStartTime) / 1000;
        if (elapsed < 1) return null;

        const results = simulateIdleRun(
          state.character,
          zone,
          state.currentZoneTier,
          state.currentFocus,
          elapsed
        );

        if (results.clearsCompleted === 0) return null;

        // Apply results to state
        const newChar = addXp(state.character, results.xpGained);
        newChar.stats = resolveStats(newChar);

        const newCurrencies = { ...state.currencies };
        for (const [key, val] of Object.entries(results.currencyDrops)) {
          newCurrencies[key as CurrencyType] += val;
        }

        const newMaterials = { ...state.materials };
        for (const [key, val] of Object.entries(results.materials)) {
          newMaterials[key] = (newMaterials[key] || 0) + val;
        }

        set({
          character: newChar,
          inventory: [...state.inventory, ...results.items],
          currencies: newCurrencies,
          materials: newMaterials,
          gold: state.gold + results.goldGained,
          idleStartTime: Date.now(), // reset timer
        });

        return results;
      },

      getEstimatedClearTime: (zoneId: string, tier: number) => {
        const state = get();
        const zone = ZONE_DEFS.find((z) => z.id === zoneId);
        if (!zone) return 999;
        return calcClearTime(state.character.stats, zone, tier);
      },

      craft: (itemId: string, currency: CurrencyType) => {
        const state = get();
        if (state.currencies[currency] <= 0) {
          return { success: false, item: {} as Item, message: `No ${currency} shards remaining.` };
        }

        const itemIndex = state.inventory.findIndex((i) => i.id === itemId);
        if (itemIndex === -1) return null;

        const item = state.inventory[itemIndex];
        const result = applyCurrency(item, currency);

        if (result.success) {
          const newCurrencies = { ...state.currencies };
          newCurrencies[currency] -= 1;
          const newInventory = [...state.inventory];
          newInventory[itemIndex] = result.item;
          set({ currencies: newCurrencies, inventory: newInventory });
        }

        return result;
      },

      resetGame: () => {
        set(createInitialState());
      },
    }),
    {
      name: 'idle-exile-save',
    }
  )
);

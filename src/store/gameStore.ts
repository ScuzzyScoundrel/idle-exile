import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState,
  Character,
  Item,
  CurrencyType,
  GearSlot,
  IdleRunResult,
  CraftResult,
  PendingLoot,
  Rarity,
} from '../types';
import { createCharacter, resolveStats, addXp } from '../engine/character';
import { simulateIdleRun, calcClearTime } from '../engine/zones';
import { applyCurrency } from '../engine/crafting';
import { ZONE_DEFS } from '../data/zones';
import { generateItem, classifyRarity } from '../engine/items';

const INITIAL_CURRENCIES: Record<CurrencyType, number> = {
  augment: 50,
  chaos: 50,
  divine: 50,
  annul: 50,
  exalt: 50,
  socket: 50,
};

const EMPTY_PENDING_LOOT: PendingLoot = {
  items: [],
  currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, socket: 0 },
  materials: {},
  goldGained: 0,
  clearsCompleted: 0,
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

/** Extract non-XP fields from sim results into a PendingLoot. */
function resultToPendingLoot(result: IdleRunResult): PendingLoot {
  return {
    items: result.items,
    currencyDrops: { ...result.currencyDrops },
    materials: { ...result.materials },
    goldGained: result.goldGained,
    clearsCompleted: result.clearsCompleted,
  };
}

/** Combine two PendingLoot objects. */
function mergePendingLoot(a: PendingLoot, b: PendingLoot): PendingLoot {
  const currencyDrops = { ...a.currencyDrops };
  for (const [key, val] of Object.entries(b.currencyDrops)) {
    currencyDrops[key as CurrencyType] += val;
  }
  const materials = { ...a.materials };
  for (const [key, val] of Object.entries(b.materials)) {
    materials[key] = (materials[key] || 0) + val;
  }
  return {
    items: [...a.items, ...b.items],
    currencyDrops,
    materials,
    goldGained: a.goldGained + b.goldGained,
    clearsCompleted: a.clearsCompleted + b.clearsCompleted,
  };
}

/** Apply banked loot to inventory/currencies/materials/gold and clear pendingLoot. */
function applyPendingLoot(state: GameState, loot: PendingLoot): Partial<GameState> {
  const newCurrencies = { ...state.currencies };
  for (const [key, val] of Object.entries(loot.currencyDrops)) {
    newCurrencies[key as CurrencyType] += val;
  }
  const newMaterials = { ...state.materials };
  for (const [key, val] of Object.entries(loot.materials)) {
    newMaterials[key] = (newMaterials[key] || 0) + val;
  }

  // Auto-salvage: filter items below threshold
  const minRarity = state.autoSalvageMinRarity;
  const minOrder = RARITY_ORDER[minRarity];
  let keptItems: Item[] = [];
  let autoSalvageDust = 0;

  if (minOrder > 0) {
    for (const item of loot.items) {
      if (RARITY_ORDER[item.rarity] < minOrder) {
        // Auto-salvage this item
        autoSalvageDust += SALVAGE_DUST[item.rarity];
      } else {
        keptItems.push(item);
      }
    }
  } else {
    keptItems = loot.items;
  }

  if (autoSalvageDust > 0) {
    newMaterials['salvage_dust'] = (newMaterials['salvage_dust'] || 0) + autoSalvageDust;
  }

  return {
    inventory: [...state.inventory, ...keptItems],
    currencies: newCurrencies,
    materials: newMaterials,
    gold: state.gold + loot.goldGained,
    pendingLoot: { ...EMPTY_PENDING_LOOT, currencyDrops: { ...EMPTY_PENDING_LOOT.currencyDrops } },
  };
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

  // Zone / Idle
  startIdleRun: (zoneId: string) => { bankedClears: number } | null;
  collectIdleResults: () => IdleRunResult | null;
  stopIdleRun: () => IdleRunResult | null;
  grantIdleXp: (xp: number) => void;
  getEstimatedClearTime: (zoneId: string) => number;

  // Crafting
  craft: (itemId: string, currency: CurrencyType) => CraftResult | null;

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
    pendingLoot: { ...EMPTY_PENDING_LOOT, currencyDrops: { ...EMPTY_PENDING_LOOT.currencyDrops } },
    currentZoneId: null,
    idleStartTime: null,
    autoSalvageMinRarity: 'common',
    lastSaveTime: Date.now(),
  };
}

/** Collect any pending idle results from the current run and return them (without mutating state). */
function collectPendingResults(state: GameState): IdleRunResult | null {
  if (!state.currentZoneId || !state.idleStartTime) return null;
  const zone = ZONE_DEFS.find((z) => z.id === state.currentZoneId);
  if (!zone) return null;
  const elapsed = (Date.now() - state.idleStartTime) / 1000;
  if (elapsed < 1) return null;
  const results = simulateIdleRun(
    state.character,
    zone,
    elapsed,
  );
  if (results.clearsCompleted === 0) return null;
  return results;
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

      startIdleRun: (zoneId: string) => {
        const state = get();
        // Bank previous segment results
        const prev = collectPendingResults(state);
        const banked = prev ? resultToPendingLoot(prev) : null;
        const newPending = banked
          ? mergePendingLoot(state.pendingLoot, banked)
          : state.pendingLoot;
        set({
          pendingLoot: newPending,
          currentZoneId: zoneId,
          idleStartTime: Date.now(),
        });
        return banked ? { bankedClears: banked.clearsCompleted } : null;
      },

      collectIdleResults: () => {
        const state = get();
        const results = collectPendingResults(state);
        const currentLoot = results ? resultToPendingLoot(results) : null;
        let totalLoot = state.pendingLoot;
        if (currentLoot) {
          totalLoot = mergePendingLoot(totalLoot, currentLoot);
        }
        if (totalLoot.clearsCompleted === 0 && totalLoot.items.length === 0) return null;
        const applied = applyPendingLoot(state, totalLoot);
        set({
          ...applied,
          idleStartTime: Date.now(),
        });
        return {
          items: totalLoot.items,
          materials: totalLoot.materials,
          currencyDrops: totalLoot.currencyDrops,
          xpGained: 0,
          goldGained: totalLoot.goldGained,
          clearsCompleted: totalLoot.clearsCompleted,
          elapsed: results?.elapsed ?? 0,
        };
      },

      stopIdleRun: () => {
        const state = get();
        const results = collectPendingResults(state);
        const currentLoot = results ? resultToPendingLoot(results) : null;
        let totalLoot = state.pendingLoot;
        if (currentLoot) {
          totalLoot = mergePendingLoot(totalLoot, currentLoot);
        }
        if (totalLoot.clearsCompleted === 0 && totalLoot.items.length === 0) {
          set({ idleStartTime: null });
          return null;
        }
        const applied = applyPendingLoot(state, totalLoot);
        set({
          ...applied,
          idleStartTime: null,
        });
        return {
          items: totalLoot.items,
          materials: totalLoot.materials,
          currencyDrops: totalLoot.currencyDrops,
          xpGained: 0,
          goldGained: totalLoot.goldGained,
          clearsCompleted: totalLoot.clearsCompleted,
          elapsed: results?.elapsed ?? 0,
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
        return calcClearTime(state.character.stats, zone);
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

      setAutoSalvageRarity: (rarity: Rarity) => {
        set({ autoSalvageMinRarity: rarity });
      },

      resetGame: () => {
        set(createInitialState());
      },
    }),
    {
      name: 'idle-exile-save',
      version: 6,
      migrate: (_persisted: unknown, _version: number) => {
        // v6: Full wipe — new systems are incompatible with old save data
        return createInitialState() as GameState & GameActions;
      },
    }
  )
);

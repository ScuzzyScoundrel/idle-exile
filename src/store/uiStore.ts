/**
 * uiStore.ts — UI/bag/profession-gear action logic extracted from gameStore.
 *
 * STATE stays in gameStore (for save compatibility).
 * This store holds ONLY the UI-related actions.
 * Actions read/write gameStore via useGameStore.getState() / useGameStore.setState().
 * UI components import actions from here, state from gameStore.
 */
import { create } from 'zustand';
import type { CurrencyType, GearSlot, BankTab } from '../types';
import { useGameStore } from './gameStore';
import { addXp, resolveStats } from '../engine/character';
import { getBagDef, BAG_SLOT_COUNT } from '../data/items';
import { addItemsWithOverflow, getInventoryCapacity } from '../engine/inventory/helpers';
import { ZONE_DEFS } from '../data/zones';
import { getUnifiedSkillDef, ABILITY_ID_MIGRATION } from '../data/skills';
import {
  createAbilityProgress, addAbilityXp, getAbilityXpPerClear,
} from '../engine/unifiedSkills';
import {
  updateQuestProgressForClears, updateQuestProgressForBossKill,
} from '../engine/dailyQuests';
import {
  BANK_TAB_CAPACITY, BANK_MAX_TABS, getBankTabCost,
} from '../data/balance';

interface UiActions {
  // Offline progress
  claimOfflineProgress: () => void;

  // Tutorial
  advanceTutorial: (step: number) => void;

  // Bag management
  equipBag: (bagDefId: string, slotIndex: number) => { replacedId: string; capacityDelta: number } | null;
  sellBag: (bagDefId: string) => boolean;
  salvageBag: (bagDefId: string) => boolean;
  buyBag: (bagDefId: string) => boolean;

  // Profession gear
  equipProfessionGear: (itemId: string) => void;
  unequipProfessionSlot: (slot: GearSlot) => void;

  // Bank
  buyBankTab: () => boolean;
  depositItem: (itemId: string, tabIndex: number) => boolean;
  withdrawItem: (tabIndex: number, slotIndex: number) => boolean;
}

export const useUiStore = create<UiActions>()(() => ({

  // ─── Offline Progress ───────────────────────────────────────

  claimOfflineProgress: () => {
    const state = useGameStore.getState();
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

    // Apply skill XP to all equipped skills (mirrors processNewClears lines 1205-1236)
    const claimZone = ZONE_DEFS.find(z => z.id === progress.zoneId);
    const newSkillProgress = { ...state.skillProgress };
    const newAbilityProgress = { ...state.abilityProgress };
    if (claimZone && progress.clearsCompleted > 0) {
      const xpPerClear = getAbilityXpPerClear(claimZone.band);
      const totalAbilityXp = xpPerClear * progress.clearsCompleted;
      const reverseAbilityMap: Record<string, string> = {};
      for (const [oldId, newId] of Object.entries(ABILITY_ID_MIGRATION)) {
        reverseAbilityMap[newId] = oldId;
      }
      for (const equipped of state.skillBar) {
        if (!equipped) continue;
        const skillDef = getUnifiedSkillDef(equipped.skillId);
        if (!skillDef) continue;
        const existing = newSkillProgress[equipped.skillId] ?? {
          skillId: equipped.skillId, xp: 0, level: 0, allocatedNodes: [],
        };
        const tempProgress = {
          abilityId: existing.skillId, xp: existing.xp,
          level: existing.level, allocatedNodes: existing.allocatedNodes,
        };
        const updated = addAbilityXp(tempProgress, totalAbilityXp);
        newSkillProgress[equipped.skillId] = {
          ...existing, xp: updated.xp, level: updated.level,
          allocatedNodes: updated.allocatedNodes,
        };
        const oldId = reverseAbilityMap[equipped.skillId];
        if (oldId) {
          const oldExisting = newAbilityProgress[oldId] ?? createAbilityProgress(oldId);
          newAbilityProgress[oldId] = { ...oldExisting, xp: updated.xp, level: updated.level };
        }
      }
    }

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

    useGameStore.setState({
      character: newChar,
      inventory: newInventory,
      materials: newMaterials,
      currencies: newCurrencies,
      gold: newGold,
      bagStash: newBagStash,
      skillProgress: newSkillProgress,
      abilityProgress: newAbilityProgress,
      offlineProgress: null,
      dailyQuests: { ...state.dailyQuests, progress: offlineQuestProgress },
    });
  },

  // ─── Tutorial ───────────────────────────────────────────────

  advanceTutorial: (step: number) => {
    const state = useGameStore.getState();
    // Only advance forward, or set to 0 (done)
    if (step === 0 || step > state.tutorialStep) {
      useGameStore.setState({ tutorialStep: step });
    }
  },

  // ─── Bag Management ─────────────────────────────────────────

  equipBag: (bagDefId: string, slotIndex: number) => {
    const state = useGameStore.getState();
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
    useGameStore.setState({ bagSlots: newSlots, bagStash: newStash });
    return { replacedId: oldId, capacityDelta };
  },

  sellBag: (bagDefId: string) => {
    const state = useGameStore.getState();
    const count = state.bagStash[bagDefId] || 0;
    if (count <= 0) return false;
    const def = getBagDef(bagDefId);
    const newStash = { ...state.bagStash };
    newStash[bagDefId] = count - 1;
    if (newStash[bagDefId] <= 0) delete newStash[bagDefId];
    useGameStore.setState({ bagStash: newStash, gold: state.gold + def.sellValue });
    return true;
  },

  salvageBag: (bagDefId: string) => {
    const state = useGameStore.getState();
    const count = state.bagStash[bagDefId] || 0;
    if (count <= 0) return false;
    const def = getBagDef(bagDefId);
    const newStash = { ...state.bagStash };
    newStash[bagDefId] = count - 1;
    if (newStash[bagDefId] <= 0) delete newStash[bagDefId];
    const newMaterials = { ...state.materials };
    newMaterials['enchanting_essence'] = (newMaterials['enchanting_essence'] || 0) + def.salvageValue;
    useGameStore.setState({ bagStash: newStash, materials: newMaterials });
    return true;
  },

  buyBag: (bagDefId: string) => {
    const state = useGameStore.getState();
    const def = getBagDef(bagDefId);
    if (state.gold < def.goldCost) return false;
    const newStash = { ...state.bagStash };
    newStash[bagDefId] = (newStash[bagDefId] || 0) + 1;
    useGameStore.setState({ gold: state.gold - def.goldCost, bagStash: newStash });
    return true;
  },

  // ─── Profession Gear ────────────────────────────────────────

  equipProfessionGear: (itemId: string) => {
    const state = useGameStore.getState();
    const idx = state.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = state.inventory[idx];
    if (!item.isProfessionGear) return;

    const slot = item.slot;
    const newInventory = [...state.inventory];
    newInventory.splice(idx, 1);

    // Unequip existing item in that slot back to inventory
    const existing = state.professionEquipment[slot];
    if (existing) newInventory.push(existing);

    useGameStore.setState({
      inventory: newInventory,
      professionEquipment: { ...state.professionEquipment, [slot]: item },
    });
  },

  unequipProfessionSlot: (slot: GearSlot) => {
    const state = useGameStore.getState();
    const item = state.professionEquipment[slot];
    if (!item) return;
    const newEquip = { ...state.professionEquipment };
    delete newEquip[slot];
    useGameStore.setState({
      inventory: [...state.inventory, item],
      professionEquipment: newEquip,
    });
  },

  // ─── Bank ────────────────────────────────────────────────────

  buyBankTab: () => {
    const state = useGameStore.getState();
    const tabCount = state.bank.tabs.length;
    if (tabCount >= BANK_MAX_TABS) return false;
    const cost = getBankTabCost(tabCount);
    if (state.gold < cost) return false;
    const newTab: BankTab = {
      label: `Tab ${tabCount + 1}`,
      items: Array(BANK_TAB_CAPACITY).fill(null),
    };
    useGameStore.setState({
      gold: state.gold - cost,
      bank: { tabs: [...state.bank.tabs, newTab] },
    });
    return true;
  },

  depositItem: (itemId: string, tabIndex: number) => {
    const state = useGameStore.getState();
    const { bank, inventory } = state;
    if (tabIndex < 0 || tabIndex >= bank.tabs.length) return false;

    // Find item in inventory (not equipped)
    const itemIdx = inventory.findIndex(i => i.id === itemId);
    if (itemIdx === -1) return false;
    const item = inventory[itemIdx];

    // Find first empty slot in target tab, fallback to other tabs
    let targetTab = tabIndex;
    let slotIdx = bank.tabs[targetTab].items.indexOf(null);
    if (slotIdx === -1) {
      // Try other tabs
      for (let t = 0; t < bank.tabs.length; t++) {
        if (t === tabIndex) continue;
        const s = bank.tabs[t].items.indexOf(null);
        if (s !== -1) { targetTab = t; slotIdx = s; break; }
      }
    }
    if (slotIdx === -1) return false; // All tabs full

    const newTabs = bank.tabs.map((tab, i) => {
      if (i !== targetTab) return tab;
      const newItems = [...tab.items];
      newItems[slotIdx] = item;
      return { ...tab, items: newItems };
    });

    useGameStore.setState({
      inventory: inventory.filter((_, i) => i !== itemIdx),
      bank: { tabs: newTabs },
    });
    return true;
  },

  withdrawItem: (tabIndex: number, slotIndex: number) => {
    const state = useGameStore.getState();
    const { bank, inventory } = state;
    if (tabIndex < 0 || tabIndex >= bank.tabs.length) return false;
    const tab = bank.tabs[tabIndex];
    if (slotIndex < 0 || slotIndex >= tab.items.length) return false;
    const item = tab.items[slotIndex];
    if (!item) return false;

    // Check bag capacity
    if (inventory.length >= getInventoryCapacity(state)) return false;

    const newTabs = bank.tabs.map((t, i) => {
      if (i !== tabIndex) return t;
      const newItems = [...t.items];
      newItems[slotIndex] = null;
      return { ...t, items: newItems };
    });

    useGameStore.setState({
      inventory: [...inventory, item],
      bank: { tabs: newTabs },
    });
    return true;
  },

}));

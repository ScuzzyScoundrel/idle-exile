/**
 * craftingStore.ts — Crafting action logic extracted from gameStore.
 *
 * STATE stays in gameStore (for save compatibility).
 * This store holds ONLY the crafting-specific actions.
 * Actions read/write gameStore via useGameStore.getState() / useGameStore.setState().
 * UI components import actions from here, state from gameStore.
 */
import { create } from 'zustand';
import type {
  Item,
  Rarity,
  CraftLogEntry,
} from '../types';
import { useGameStore } from './gameStore';
import { REFINEMENT_RECIPES } from '../data/refinement';
import { getCraftingRecipe } from '../data/craftingRecipes';
import { canRefine, refine, canDeconstruct, deconstruct } from '../engine/refinement';
import {
  canCraftRecipe, executeCraft, addCraftingXp, getCraftingXpForTier,
  canCraftPattern, executePatternCraft, getPatternMaterialCost,
} from '../engine/craftingProfessions';
import { resolveProfessionBonuses } from '../engine/professionBonuses';
import { getPatternDef } from '../data/craftingPatterns';
import { addItemsWithOverflow, ESSENCE_REWARD } from '../engine/inventory/helpers';
import { calcBagCapacity } from '../data/items';
import {
  CRAFT_OUTPUT_BUFFER_SIZE, CRAFT_LOG_MAX_ENTRIES,
  MAX_GOLD_EFFICIENCY, CRAFTING_XP_PER_TIER,
} from '../data/balance';
import type { GameState } from '../types';

/** Helper: get inventory capacity from bag slots. */
function getInventoryCapacity(state: GameState): number {
  return calcBagCapacity(state.bagSlots);
}

interface CraftingActions {
  // Refinement
  refineMaterial: (recipeId: string) => boolean;
  refineMaterialBatch: (recipeId: string, count: number) => number;
  deconstructMaterial: (refinedId: string) => boolean;

  // Recipe crafting
  craftRecipe: (recipeId: string, catalystId?: string, affixCatalystId?: string) => { item: Item; wasSalvaged: boolean } | null;
  craftRecipeBatch: (recipeId: string, count: number, catalystId?: string, affixCatalystId?: string) => { crafted: number; lastItem: Item | null; salvaged: number } | null;

  // Pattern crafting
  craftFromPattern: (patternIndex: number) => { item: Item; wasSalvaged: boolean } | null;

  // Craft log
  addCraftLogEntry: (entry: Omit<CraftLogEntry, 'id' | 'timestamp'>) => void;
  clearCraftLog: () => void;

  // Craft output buffer
  claimCraftOutput: (itemId: string) => void;
  claimAllCraftOutput: () => void;
  salvageCraftOutput: (itemId: string) => void;
  salvageAllCraftOutput: () => void;

  // Settings
  setCraftAutoSalvageRarity: (rarity: Rarity) => void;
}

export const useCraftingStore = create<CraftingActions>()((_set, get) => ({

  // ─── Refinement ─────────────────────────────────────────────

  refineMaterial: (recipeId: string) => {
    const state = useGameStore.getState();
    const recipe = REFINEMENT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    if (!canRefine(recipe, state.materials, state.gold)) return false;
    const { newMaterials, newGold } = refine(recipe, state.materials, state.gold);
    useGameStore.setState({ materials: newMaterials, gold: newGold });
    get().addCraftLogEntry({ type: 'refine', recipeName: recipe.outputName, count: 1, xpGained: 0, trackId: recipe.track });
    return true;
  },

  refineMaterialBatch: (recipeId: string, count: number) => {
    if (count <= 0) return 0;
    const state = useGameStore.getState();
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
      useGameStore.setState({ materials: curMaterials, gold: curGold });
      get().addCraftLogEntry({ type: 'refine', recipeName: recipe.outputName, count: crafted, xpGained: 0, trackId: recipe.track });
    }
    return crafted;
  },

  deconstructMaterial: (refinedId: string) => {
    const state = useGameStore.getState();
    if (!canDeconstruct(refinedId, state.materials)) return false;
    const newMaterials = deconstruct(refinedId, state.materials);
    useGameStore.setState({ materials: newMaterials });
    return true;
  },

  // ─── Recipe Crafting ────────────────────────────────────────

  craftRecipe: (recipeId: string, catalystId?: string, affixCatalystId?: string) => {
    const state = useGameStore.getState();
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) return null;
    if (!canCraftRecipe(recipe, state.craftingSkills, state.materials, state.gold)) return null;

    // Resolve profession bonuses
    const profBonuses = resolveProfessionBonuses(state.professionEquipment);

    // Consume materials (with material preservation chance)
    const newMaterials = { ...state.materials };
    for (const { materialId, amount } of recipe.materials) {
      let consumed = 0;
      for (let j = 0; j < amount; j++) {
        if (Math.random() >= profBonuses.materialSave / 100) consumed++;
      }
      newMaterials[materialId] = (newMaterials[materialId] ?? 0) - consumed;
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
    // Gold cost with reduction
    const goldCost = Math.max(0, Math.round(recipe.goldCost * (1 - Math.min(profBonuses.goldEfficiency / 100, MAX_GOLD_EFFICIENCY))));
    const newGold = state.gold - goldCost;

    // Add crafting XP (with bonus)
    const baseXp = getCraftingXpForTier(recipe.tier);
    const xp = Math.round(baseXp * (1 + profBonuses.craftXp / 100));
    const newCraftingSkills = addCraftingXp(state.craftingSkills, recipe.profession, xp);

    // Material-producing recipe (e.g. alchemist catalysts)
    if (recipe.outputMaterialId) {
      newMaterials[recipe.outputMaterialId] = (newMaterials[recipe.outputMaterialId] ?? 0) + 1;
      useGameStore.setState({
        materials: newMaterials,
        gold: newGold,
        craftingSkills: newCraftingSkills,
      });
      get().addCraftLogEntry({ type: 'gear', recipeName: recipe.name, count: 1, xpGained: xp, profession: recipe.profession });
      return {
        item: { id: '', baseId: '', name: recipe.name, slot: 'trinket1' as const, rarity: 'common' as const, iLvl: 0, prefixes: [], suffixes: [], baseStats: {} },
        wasSalvaged: false,
      };
    }

    // Generate item (with profession gear bonus iLvl)
    const item = executeCraft(recipe, catalystId, affixCatalystId, profBonuses.bonusIlvl);

    // Critical craft: chance for double output
    const isCrit = profBonuses.criticalCraft > 0 && Math.random() < profBonuses.criticalCraft / 100;
    const critItem = isCrit ? executeCraft(recipe, catalystId, affixCatalystId, profBonuses.bonusIlvl) : null;

    // Place in output buffer first; overflow into inventory
    const currentBuffer = [...state.craftOutputBuffer];
    let wasSalvaged = false;
    const itemsToPlace = critItem ? [item, critItem] : [item];
    let currentInventory = [...state.inventory];
    for (const craftItem of itemsToPlace) {
      if (currentBuffer.length < CRAFT_OUTPUT_BUFFER_SIZE) {
        currentBuffer.push(craftItem);
      } else {
        const { newInventory: ni, newMaterials: mi, salvageStats: si } = addItemsWithOverflow(
          currentInventory,
          getInventoryCapacity(state),
          state.craftAutoSalvageMinRarity,
          'salvage',
          newMaterials,
          [craftItem],
        );
        if (si.itemsSalvaged > 0) wasSalvaged = true;
        for (const [k, v] of Object.entries(mi)) newMaterials[k] = v;
        currentInventory = ni;
      }
    }
    useGameStore.setState({
      materials: newMaterials,
      gold: newGold,
      craftingSkills: newCraftingSkills,
      craftOutputBuffer: currentBuffer,
      inventory: currentInventory,
    });

    get().addCraftLogEntry({
      type: 'gear', recipeName: recipe.name, count: 1, xpGained: xp,
      profession: recipe.profession, itemName: item.name, itemRarity: item.rarity, wasSalvaged,
    });

    return { item, wasSalvaged };
  },

  craftRecipeBatch: (recipeId: string, count: number, catalystId?: string, affixCatalystId?: string) => {
    if (count <= 0) return null;
    const state = useGameStore.getState();
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) return null;

    const profBonuses = resolveProfessionBonuses(state.professionEquipment);

    let curMaterials = { ...state.materials };
    let curGold = state.gold;
    let curCraftingSkills = { ...state.craftingSkills };
    let crafted = 0;
    let lastItem: Item | null = null;
    const allItems: Item[] = [];
    let materialOutputCount = 0;

    for (let i = 0; i < count; i++) {
      if (!canCraftRecipe(recipe, curCraftingSkills, curMaterials, curGold)) break;

      // Consume materials (with material preservation)
      for (const { materialId, amount } of recipe.materials) {
        let consumed = 0;
        for (let j = 0; j < amount; j++) {
          if (Math.random() >= profBonuses.materialSave / 100) consumed++;
        }
        curMaterials[materialId] = (curMaterials[materialId] ?? 0) - consumed;
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
      const goldCost = Math.max(0, Math.round(recipe.goldCost * (1 - Math.min(profBonuses.goldEfficiency / 100, MAX_GOLD_EFFICIENCY))));
      curGold -= goldCost;

      // Add crafting XP per craft (with bonus)
      const baseXp = getCraftingXpForTier(recipe.tier);
      const xp = Math.round(baseXp * (1 + profBonuses.craftXp / 100));
      curCraftingSkills = addCraftingXp(curCraftingSkills, recipe.profession, xp);

      if (recipe.outputMaterialId) {
        curMaterials[recipe.outputMaterialId] = (curMaterials[recipe.outputMaterialId] ?? 0) + 1;
        materialOutputCount++;
      } else {
        const item = executeCraft(recipe, catalystId, affixCatalystId, profBonuses.bonusIlvl);
        allItems.push(item);
        lastItem = item;
        // Critical craft
        if (profBonuses.criticalCraft > 0 && Math.random() < profBonuses.criticalCraft / 100) {
          const critItem = executeCraft(recipe, catalystId, affixCatalystId, profBonuses.bonusIlvl);
          allItems.push(critItem);
          lastItem = critItem;
        }
      }
      crafted++;
    }

    if (crafted === 0) return null;

    const totalXp = Math.round(getCraftingXpForTier(recipe.tier) * (1 + profBonuses.craftXp / 100)) * crafted;

    // Handle item recipes: fill output buffer first, overflow to inventory
    let salvaged = 0;
    if (allItems.length > 0) {
      const currentBuffer = [...state.craftOutputBuffer];
      const bufferSpace = CRAFT_OUTPUT_BUFFER_SIZE - currentBuffer.length;
      const toBuffer = allItems.slice(0, bufferSpace);
      const toOverflow = allItems.slice(bufferSpace);
      currentBuffer.push(...toBuffer);

      if (toOverflow.length > 0) {
        const { newInventory, newMaterials: matsAfterItems, salvageStats } = addItemsWithOverflow(
          state.inventory,
          getInventoryCapacity(state),
          state.craftAutoSalvageMinRarity,
          'salvage',
          curMaterials,
          toOverflow,
        );
        curMaterials = matsAfterItems;
        salvaged = salvageStats.itemsSalvaged;
        useGameStore.setState({
          materials: curMaterials,
          gold: curGold,
          craftingSkills: curCraftingSkills,
          inventory: newInventory,
          craftOutputBuffer: currentBuffer,
        });
      } else {
        useGameStore.setState({
          materials: curMaterials,
          gold: curGold,
          craftingSkills: curCraftingSkills,
          craftOutputBuffer: currentBuffer,
        });
      }
    } else {
      // Material recipe — no inventory changes
      useGameStore.setState({
        materials: curMaterials,
        gold: curGold,
        craftingSkills: curCraftingSkills,
      });
      lastItem = { id: '', baseId: '', name: recipe.name, slot: 'trinket1' as const, rarity: 'common' as const, iLvl: 0, prefixes: [], suffixes: [], baseStats: {} };
    }

    get().addCraftLogEntry({
      type: 'gear', recipeName: recipe.name, count: crafted, xpGained: totalXp,
      profession: recipe.profession, itemName: lastItem?.name, itemRarity: lastItem?.rarity, batchSalvaged: salvaged > 0 ? salvaged : undefined,
    });

    return { crafted, lastItem, salvaged };
  },

  // ─── Pattern Crafting ───────────────────────────────────────

  craftFromPattern: (patternIndex: number) => {
    const state = useGameStore.getState();
    const owned = state.ownedPatterns[patternIndex];
    if (!owned) return null;
    const patDef = getPatternDef(owned.defId);
    if (!patDef) return null;

    // Validate
    if (!canCraftPattern(patDef, owned.charges, state.craftingSkills, state.materials, state.gold)) return null;

    const cost = getPatternMaterialCost(patDef);
    if (!cost) return null;

    // Resolve profession bonuses
    const profBonuses = resolveProfessionBonuses(state.professionEquipment);

    // Consume materials (with material preservation chance)
    const newMaterials = { ...state.materials };
    for (const { materialId, amount } of cost.materials) {
      let consumed = 0;
      for (let j = 0; j < amount; j++) {
        if (Math.random() >= profBonuses.materialSave / 100) consumed++;
      }
      newMaterials[materialId] = (newMaterials[materialId] ?? 0) - consumed;
    }

    // Gold cost with reduction
    const goldCost = Math.max(0, Math.round(cost.goldCost * (1 - Math.min(profBonuses.goldEfficiency / 100, MAX_GOLD_EFFICIENCY))));
    const newGold = state.gold - goldCost;

    // Generate item
    const item = executePatternCraft(patDef);

    // Award XP: base tier XP × pattern xpMult (with profession gear bonus)
    const baseXp = CRAFTING_XP_PER_TIER[patDef.band] ?? 15;
    const xp = Math.round(baseXp * patDef.xpMult * (1 + profBonuses.craftXp / 100));
    const newCraftingSkills = addCraftingXp(state.craftingSkills, patDef.profession, xp);

    // Decrement charges; remove pattern if exhausted
    const newOwnedPatterns = [...state.ownedPatterns];
    const newCharges = owned.charges - 1;
    if (newCharges <= 0) {
      newOwnedPatterns.splice(patternIndex, 1);
    } else {
      newOwnedPatterns[patternIndex] = { ...owned, charges: newCharges };
    }

    // Place in output buffer
    const currentBuffer = [...state.craftOutputBuffer];
    let wasSalvaged = false;
    let currentInventory = [...state.inventory];
    if (currentBuffer.length < CRAFT_OUTPUT_BUFFER_SIZE) {
      currentBuffer.push(item);
    } else {
      const { newInventory: ni, newMaterials: mi, salvageStats: si } = addItemsWithOverflow(
        currentInventory,
        getInventoryCapacity(state),
        state.craftAutoSalvageMinRarity,
        'salvage',
        newMaterials,
        [item],
      );
      if (si.itemsSalvaged > 0) wasSalvaged = true;
      for (const [k, v] of Object.entries(mi)) newMaterials[k] = v;
      currentInventory = ni;
    }

    useGameStore.setState({
      materials: newMaterials,
      gold: newGold,
      craftingSkills: newCraftingSkills,
      ownedPatterns: newOwnedPatterns,
      craftOutputBuffer: currentBuffer,
      inventory: currentInventory,
    });

    get().addCraftLogEntry({
      type: 'pattern', recipeName: patDef.name, count: 1, xpGained: xp,
      profession: patDef.profession, itemName: item.name, itemRarity: item.rarity, wasSalvaged,
    });

    return { item, wasSalvaged };
  },

  // ─── Craft Log & Output Buffer ─────────────────────────────

  addCraftLogEntry: (entry) => {
    const log = [...useGameStore.getState().craftLog];
    log.unshift({ ...entry, id: crypto.randomUUID(), timestamp: Date.now() });
    if (log.length > CRAFT_LOG_MAX_ENTRIES) log.length = CRAFT_LOG_MAX_ENTRIES;
    useGameStore.setState({ craftLog: log });
  },

  clearCraftLog: () => useGameStore.setState({ craftLog: [] }),

  claimCraftOutput: (itemId: string) => {
    const state = useGameStore.getState();
    const idx = state.craftOutputBuffer.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = state.craftOutputBuffer[idx];
    const newBuffer = state.craftOutputBuffer.filter(i => i.id !== itemId);
    const { newInventory, newMaterials } = addItemsWithOverflow(
      state.inventory, getInventoryCapacity(state),
      'common', 'salvage', // never auto-salvage claimed items
      { ...state.materials }, [item],
    );
    useGameStore.setState({ craftOutputBuffer: newBuffer, inventory: newInventory, materials: newMaterials });
  },

  claimAllCraftOutput: () => {
    const state = useGameStore.getState();
    if (state.craftOutputBuffer.length === 0) return;
    const { newInventory, newMaterials } = addItemsWithOverflow(
      state.inventory, getInventoryCapacity(state),
      'common', 'salvage', // never auto-salvage claimed items
      { ...state.materials }, [...state.craftOutputBuffer],
    );
    useGameStore.setState({ craftOutputBuffer: [], inventory: newInventory, materials: newMaterials });
  },

  salvageCraftOutput: (itemId: string) => {
    const state = useGameStore.getState();
    const idx = state.craftOutputBuffer.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = state.craftOutputBuffer[idx];
    const newBuffer = state.craftOutputBuffer.filter(i => i.id !== itemId);
    const newMaterials = { ...state.materials };
    newMaterials['enchanting_essence'] = (newMaterials['enchanting_essence'] ?? 0) + ESSENCE_REWARD[item.rarity];
    useGameStore.setState({ craftOutputBuffer: newBuffer, materials: newMaterials });
  },

  salvageAllCraftOutput: () => {
    const state = useGameStore.getState();
    if (state.craftOutputBuffer.length === 0) return;
    const newMaterials = { ...state.materials };
    let dust = 0;
    for (const item of state.craftOutputBuffer) dust += ESSENCE_REWARD[item.rarity];
    newMaterials['enchanting_essence'] = (newMaterials['enchanting_essence'] ?? 0) + dust;
    useGameStore.setState({ craftOutputBuffer: [], materials: newMaterials });
  },

  // ─── Settings ──────────────────────────────────────────────

  setCraftAutoSalvageRarity: (rarity: Rarity) => {
    useGameStore.setState({ craftAutoSalvageMinRarity: rarity });
  },

}));

import { Item, Rarity, GameState } from '../../types';
import { calcBagCapacity } from '../../data/items';

/** Rarity sort order for auto-salvage comparison. */
export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  unique: 5,
};

/** Enchanting essence reward by rarity (from salvage/disenchant). */
export const ESSENCE_REWARD: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  unique: 5,
};

/** Gold received when selling gear by rarity (base — iLvl/5 added). */
export const SELL_GOLD: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 8,
  epic: 20,
  legendary: 50,
  unique: 50,
};

/** Auto-salvage stats returned alongside state updates. */
export interface SalvageStats {
  itemsSalvaged: number;
  dustGained: number;
}

/**
 * Process items against auto-salvage threshold and inventory capacity.
 * Items go directly into bags (or are salvaged). Pure function.
 */
export function addItemsWithOverflow(
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
    // Never auto-salvage corrupted items (void invasion drops are always valuable)
    // Auto-dispose by rarity threshold
    if (!item.isCorrupted && minOrder > 0 && RARITY_ORDER[item.rarity] < minOrder) {
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
export function getInventoryCapacity(state: GameState): number {
  return calcBagCapacity(state.bagSlots);
}

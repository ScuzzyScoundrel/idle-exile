// ============================================================
// Currencies — currency types and crafting results
// ============================================================

import type { Item } from './items';

export type CurrencyType =
  | 'chaos'
  | 'divine'
  | 'annul'
  | 'exalt'
  | 'greater_exalt'
  | 'perfect_exalt'
  | 'socket';

export interface CurrencyDef {
  id: CurrencyType;
  name: string;
  description: string;
  icon: string; // emoji for prototype
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface CraftResult {
  success: boolean;
  item: Item;
  message: string;
}

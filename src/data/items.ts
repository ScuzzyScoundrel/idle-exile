import type { ItemBaseDef, CurrencyDef } from '../types';

export const ITEM_BASE_DEFS: ItemBaseDef[] = [
  // ==================== Weapons ====================
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    slot: 'weapon',
    baseStats: { damage: 15 },
    iLvl: 1,
  },
  {
    id: 'steel_blade',
    name: 'Steel Blade',
    slot: 'weapon',
    baseStats: { damage: 25 },
    iLvl: 10,
  },
  {
    id: 'obsidian_edge',
    name: 'Obsidian Edge',
    slot: 'weapon',
    baseStats: { damage: 40 },
    iLvl: 20,
  },

  // ==================== Chest ====================
  {
    id: 'linen_robe',
    name: 'Linen Robe',
    slot: 'chest',
    armorType: 'cloth',
    baseStats: { armor: 10, life: 5 },
    iLvl: 1,
  },
  {
    id: 'chain_hauberk',
    name: 'Chain Hauberk',
    slot: 'chest',
    armorType: 'mail',
    baseStats: { armor: 25, life: 10 },
    iLvl: 10,
  },
  {
    id: 'plate_cuirass',
    name: 'Plate Cuirass',
    slot: 'chest',
    armorType: 'plate',
    baseStats: { armor: 45, life: 15 },
    iLvl: 20,
  },

  // ==================== Boots ====================
  {
    id: 'leather_boots',
    name: 'Leather Boots',
    slot: 'boots',
    armorType: 'leather',
    baseStats: { armor: 5, dodgeChance: 3 },
    iLvl: 1,
  },
  {
    id: 'plated_greaves',
    name: 'Plated Greaves',
    slot: 'boots',
    armorType: 'plate',
    baseStats: { armor: 15, dodgeChance: 2 },
    iLvl: 10,
  },
  {
    id: 'runic_treads',
    name: 'Runic Treads',
    slot: 'boots',
    armorType: 'cloth',
    baseStats: { armor: 8, dodgeChance: 5 },
    iLvl: 20,
  },

  // ==================== Rings ====================
  {
    id: 'copper_band',
    name: 'Copper Band',
    slot: 'ring',
    baseStats: { life: 5 },
    iLvl: 1,
  },
  {
    id: 'silver_ring',
    name: 'Silver Ring',
    slot: 'ring',
    baseStats: { life: 10, critChance: 2 },
    iLvl: 10,
  },
  {
    id: 'gold_signet',
    name: 'Gold Signet',
    slot: 'ring',
    baseStats: { life: 15, critDamage: 10 },
    iLvl: 20,
  },
];

export const CURRENCY_DEFS: CurrencyDef[] = [
  {
    id: 'transmute',
    name: 'Transmute Shard',
    description: 'Upgrade Normal to Magic (adds 1-2 affixes)',
    icon: '\u26AA',
    rarity: 'common',
  },
  {
    id: 'augment',
    name: 'Augment Shard',
    description: 'Add one random affix to an item with open slots',
    icon: '\uD83D\uDFE2',
    rarity: 'common',
  },
  {
    id: 'chaos',
    name: 'Chaos Shard',
    description: 'Remove one random affix and add one random affix',
    icon: '\uD83D\uDD34',
    rarity: 'uncommon',
  },
  {
    id: 'alchemy',
    name: 'Alchemy Shard',
    description: 'Upgrade Normal to Rare (adds 3-6 affixes)',
    icon: '\uD83D\uDFE1',
    rarity: 'common',
  },
  {
    id: 'divine',
    name: 'Divine Shard',
    description: 'Reroll values within existing affixes',
    icon: '\uD83D\uDFE0',
    rarity: 'uncommon',
  },
  {
    id: 'annul',
    name: 'Annul Shard',
    description: 'Remove one random affix',
    icon: '\u26AB',
    rarity: 'uncommon',
  },
  {
    id: 'exalt',
    name: 'Exalt Shard',
    description: 'Add one random high-tier affix (T1-T2 only)',
    icon: '\uD83D\uDFE3',
    rarity: 'rare',
  },
  {
    id: 'regal',
    name: 'Regal Shard',
    description: 'Upgrade Magic to Rare (adds 1+ random affix)',
    icon: '\uD83D\uDD35',
    rarity: 'common',
  },
];

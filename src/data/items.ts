import type { ItemBaseDef, CurrencyDef, BagUpgradeDef } from '../types';

export const ITEM_BASE_DEFS: ItemBaseDef[] = [
  // ==================== Main Hand — Swords (Balanced) ====================
  { id: 'iron_sword', name: 'Iron Sword', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 15 }, iLvl: 1 },
  { id: 'steel_blade', name: 'Steel Blade', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 25 }, iLvl: 10 },
  { id: 'obsidian_edge', name: 'Obsidian Edge', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 40 }, iLvl: 20 },
  { id: 'mithril_blade', name: 'Mithril Blade', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 55 }, iLvl: 30 },
  { id: 'runic_greatsword', name: 'Runic Greatsword', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 75 }, iLvl: 40 },
  { id: 'void_cleaver', name: 'Void Cleaver', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 100 }, iLvl: 50 },
  { id: 'starforged_blade', name: 'Starforged Blade', slot: 'mainhand', weaponType: 'sword', baseStats: { damage: 130 }, iLvl: 60 },

  // ==================== Main Hand — Axes (High Damage, +20% over sword) ====================
  { id: 'rusty_hatchet', name: 'Rusty Hatchet', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 18 }, iLvl: 1 },
  { id: 'iron_battleaxe', name: 'Iron Battleaxe', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 30 }, iLvl: 10 },
  { id: 'obsidian_cleaver', name: 'Obsidian Cleaver', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 48 }, iLvl: 20 },
  { id: 'mithril_waraxe', name: 'Mithril Waraxe', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 66 }, iLvl: 30 },
  { id: 'runic_greataxe', name: 'Runic Greataxe', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 90 }, iLvl: 40 },
  { id: 'void_reaver', name: 'Void Reaver', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 120 }, iLvl: 50 },
  { id: 'starforged_axe', name: 'Starforged Axe', slot: 'mainhand', weaponType: 'axe', baseStats: { damage: 156 }, iLvl: 60 },

  // ==================== Main Hand — Maces (Tanky: damage + armor) ====================
  { id: 'crude_club', name: 'Crude Club', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 13, armor: 3 }, iLvl: 1 },
  { id: 'iron_mace', name: 'Iron Mace', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 22, armor: 6 }, iLvl: 10 },
  { id: 'obsidian_hammer', name: 'Obsidian Hammer', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 35, armor: 11 }, iLvl: 20 },
  { id: 'mithril_mace', name: 'Mithril Mace', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 48, armor: 16 }, iLvl: 30 },
  { id: 'runic_warhammer', name: 'Runic Warhammer', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 65, armor: 22 }, iLvl: 40 },
  { id: 'void_maul', name: 'Void Maul', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 87, armor: 28 }, iLvl: 50 },
  { id: 'starforged_mace', name: 'Starforged Mace', slot: 'mainhand', weaponType: 'mace', baseStats: { damage: 114, armor: 34 }, iLvl: 60 },

  // ==================== Main Hand — Daggers (Crit-focused: damage + critChance) ====================
  { id: 'crude_dagger', name: 'Crude Dagger', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 10, critChance: 3 }, iLvl: 1 },
  { id: 'steel_stiletto', name: 'Steel Stiletto', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 17, critChance: 5 }, iLvl: 10 },
  { id: 'obsidian_kris', name: 'Obsidian Kris', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 27, critChance: 8 }, iLvl: 20 },
  { id: 'mithril_dirk', name: 'Mithril Dirk', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 37, critChance: 10 }, iLvl: 30 },
  { id: 'runic_shiv', name: 'Runic Shiv', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 50, critChance: 13 }, iLvl: 40 },
  { id: 'void_fang', name: 'Void Fang', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 67, critChance: 16 }, iLvl: 50 },
  { id: 'starforged_dagger', name: 'Starforged Dagger', slot: 'mainhand', weaponType: 'dagger', baseStats: { damage: 87, critChance: 18 }, iLvl: 60 },

  // ==================== Main Hand — Staves (Ability-focused: damage + abilityHaste) ====================
  { id: 'gnarled_staff', name: 'Gnarled Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 12, abilityHaste: 3 }, iLvl: 1 },
  { id: 'ironshod_staff', name: 'Ironshod Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 20, abilityHaste: 6 }, iLvl: 10 },
  { id: 'obsidian_staff', name: 'Obsidian Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 32, abilityHaste: 10 }, iLvl: 20 },
  { id: 'mithril_staff', name: 'Mithril Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 44, abilityHaste: 14 }, iLvl: 30 },
  { id: 'runic_staff', name: 'Runic Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 60, abilityHaste: 18 }, iLvl: 40 },
  { id: 'void_staff', name: 'Void Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 80, abilityHaste: 22 }, iLvl: 50 },
  { id: 'starforged_staff', name: 'Starforged Staff', slot: 'mainhand', weaponType: 'staff', baseStats: { damage: 104, abilityHaste: 26 }, iLvl: 60 },

  // ==================== Main Hand — Wands (Utility caster: low damage + high abilityHaste) ====================
  { id: 'twig_wand', name: 'Twig Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 8, abilityHaste: 5 }, iLvl: 1 },
  { id: 'bone_wand', name: 'Bone Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 14, abilityHaste: 10 }, iLvl: 10 },
  { id: 'obsidian_wand', name: 'Obsidian Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 22, abilityHaste: 16 }, iLvl: 20 },
  { id: 'mithril_wand', name: 'Mithril Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 30, abilityHaste: 22 }, iLvl: 30 },
  { id: 'runic_wand', name: 'Runic Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 41, abilityHaste: 28 }, iLvl: 40 },
  { id: 'void_wand', name: 'Void Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 55, abilityHaste: 34 }, iLvl: 50 },
  { id: 'starforged_wand', name: 'Starforged Wand', slot: 'mainhand', weaponType: 'wand', baseStats: { damage: 71, abilityHaste: 38 }, iLvl: 60 },

  // ==================== Main Hand — Bows (Speed ranged: damage + attackSpeed) ====================
  { id: 'shortbow', name: 'Shortbow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 14, attackSpeed: 2 }, iLvl: 1 },
  { id: 'recurve_bow', name: 'Recurve Bow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 23, attackSpeed: 4 }, iLvl: 10 },
  { id: 'obsidian_longbow', name: 'Obsidian Longbow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 37, attackSpeed: 6 }, iLvl: 20 },
  { id: 'mithril_bow', name: 'Mithril Bow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 51, attackSpeed: 8 }, iLvl: 30 },
  { id: 'runic_bow', name: 'Runic Bow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 69, attackSpeed: 11 }, iLvl: 40 },
  { id: 'void_bow', name: 'Void Bow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 92, attackSpeed: 13 }, iLvl: 50 },
  { id: 'starforged_bow', name: 'Starforged Bow', slot: 'mainhand', weaponType: 'bow', baseStats: { damage: 120, attackSpeed: 15 }, iLvl: 60 },

  // ==================== Main Hand — Crossbows (Burst ranged: +33% over sword damage) ====================
  { id: 'hand_crossbow', name: 'Hand Crossbow', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 20 }, iLvl: 1 },
  { id: 'iron_crossbow', name: 'Iron Crossbow', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 33 }, iLvl: 10 },
  { id: 'obsidian_arbalest', name: 'Obsidian Arbalest', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 53 }, iLvl: 20 },
  { id: 'mithril_crossbow', name: 'Mithril Crossbow', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 73 }, iLvl: 30 },
  { id: 'runic_arbalest', name: 'Runic Arbalest', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 100 }, iLvl: 40 },
  { id: 'void_crossbow', name: 'Void Crossbow', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 133 }, iLvl: 50 },
  { id: 'starforged_crossbow', name: 'Starforged Crossbow', slot: 'mainhand', weaponType: 'crossbow', baseStats: { damage: 173 }, iLvl: 60 },

  // ==================== Off Hand ====================
  // -- Shields --
  { id: 'wooden_shield', name: 'Wooden Shield', slot: 'offhand', baseStats: { armor: 8 }, iLvl: 1 },
  { id: 'iron_shield', name: 'Iron Shield', slot: 'offhand', baseStats: { armor: 18 }, iLvl: 10 },
  { id: 'obsidian_bulwark', name: 'Obsidian Bulwark', slot: 'offhand', baseStats: { armor: 35 }, iLvl: 20 },
  { id: 'mithril_shield', name: 'Mithril Shield', slot: 'offhand', baseStats: { armor: 50 }, iLvl: 30 },
  { id: 'runic_bulwark', name: 'Runic Bulwark', slot: 'offhand', baseStats: { armor: 70 }, iLvl: 40 },
  { id: 'void_aegis', name: 'Void Aegis', slot: 'offhand', baseStats: { armor: 95 }, iLvl: 50 },
  { id: 'starforged_shield', name: 'Starforged Shield', slot: 'offhand', baseStats: { armor: 125 }, iLvl: 60 },
  // -- Bucklers --
  { id: 'leather_buckler', name: 'Leather Buckler', slot: 'offhand', baseStats: { armor: 3, dodgeChance: 3 }, iLvl: 1 },
  { id: 'studded_buckler', name: 'Studded Buckler', slot: 'offhand', baseStats: { armor: 6, dodgeChance: 5 }, iLvl: 10 },
  { id: 'shadow_buckler', name: 'Shadow Buckler', slot: 'offhand', baseStats: { armor: 10, dodgeChance: 8 }, iLvl: 20 },
  { id: 'mithril_buckler', name: 'Mithril Buckler', slot: 'offhand', baseStats: { armor: 14, dodgeChance: 10 }, iLvl: 30 },
  { id: 'runic_buckler', name: 'Runic Buckler', slot: 'offhand', baseStats: { armor: 20, dodgeChance: 13 }, iLvl: 40 },
  { id: 'void_deflector', name: 'Void Deflector', slot: 'offhand', baseStats: { armor: 28, dodgeChance: 16 }, iLvl: 50 },
  { id: 'starforged_buckler', name: 'Starforged Buckler', slot: 'offhand', baseStats: { armor: 36, dodgeChance: 20 }, iLvl: 60 },
  // -- Tomes --
  { id: 'worn_tome', name: 'Worn Tome', slot: 'offhand', baseStats: { abilityHaste: 3 }, iLvl: 1 },
  { id: 'arcane_focus', name: 'Arcane Focus', slot: 'offhand', baseStats: { abilityHaste: 6 }, iLvl: 10 },
  { id: 'eldritch_grimoire', name: 'Eldritch Grimoire', slot: 'offhand', baseStats: { abilityHaste: 10 }, iLvl: 20 },
  { id: 'runic_tome', name: 'Runic Tome', slot: 'offhand', baseStats: { abilityHaste: 14 }, iLvl: 30 },
  { id: 'void_grimoire', name: 'Void Grimoire', slot: 'offhand', baseStats: { abilityHaste: 19 }, iLvl: 40 },
  { id: 'astral_codex', name: 'Astral Codex', slot: 'offhand', baseStats: { abilityHaste: 25 }, iLvl: 50 },
  { id: 'starforged_grimoire', name: 'Starforged Grimoire', slot: 'offhand', baseStats: { abilityHaste: 32 }, iLvl: 60 },

  // ==================== Helmet ====================
  // -- Plate --
  { id: 'iron_helm', name: 'Iron Helm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 9 }, iLvl: 1 },
  { id: 'steel_greathelm', name: 'Steel Greathelm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 22 }, iLvl: 10 },
  { id: 'obsidian_faceplate', name: 'Obsidian Faceplate', slot: 'helmet', armorType: 'plate', baseStats: { armor: 38 }, iLvl: 20 },
  { id: 'mithril_helm', name: 'Mithril Helm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 52 }, iLvl: 30 },
  { id: 'runic_greathelm', name: 'Runic Greathelm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 70 }, iLvl: 40 },
  { id: 'void_faceplate', name: 'Void Faceplate', slot: 'helmet', armorType: 'plate', baseStats: { armor: 92 }, iLvl: 50 },
  { id: 'starforged_helm', name: 'Starforged Helm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 118 }, iLvl: 60 },
  // -- Mail --
  { id: 'chain_coif', name: 'Chain Coif', slot: 'helmet', armorType: 'mail', baseStats: { armor: 6, dodgeChance: 1 }, iLvl: 1 },
  { id: 'linked_visor', name: 'Linked Visor', slot: 'helmet', armorType: 'mail', baseStats: { armor: 14, dodgeChance: 2 }, iLvl: 10 },
  { id: 'riveted_helm', name: 'Riveted Helm', slot: 'helmet', armorType: 'mail', baseStats: { armor: 25, dodgeChance: 4 }, iLvl: 20 },
  { id: 'mithril_coif', name: 'Mithril Coif', slot: 'helmet', armorType: 'mail', baseStats: { armor: 34, dodgeChance: 5 }, iLvl: 30 },
  { id: 'runic_visor', name: 'Runic Visor', slot: 'helmet', armorType: 'mail', baseStats: { armor: 46, dodgeChance: 7 }, iLvl: 40 },
  { id: 'void_visor', name: 'Void Visor', slot: 'helmet', armorType: 'mail', baseStats: { armor: 60, dodgeChance: 9 }, iLvl: 50 },
  { id: 'starforged_coif', name: 'Starforged Coif', slot: 'helmet', armorType: 'mail', baseStats: { armor: 78, dodgeChance: 12 }, iLvl: 60 },
  // -- Leather --
  { id: 'rawhide_cap', name: 'Rawhide Cap', slot: 'helmet', armorType: 'leather', baseStats: { armor: 2, dodgeChance: 3 }, iLvl: 1 },
  { id: 'studded_headband', name: 'Studded Headband', slot: 'helmet', armorType: 'leather', baseStats: { armor: 6, dodgeChance: 5 }, iLvl: 10 },
  { id: 'nightstalker_hood', name: 'Nightstalker Hood', slot: 'helmet', armorType: 'leather', baseStats: { armor: 10, dodgeChance: 7 }, iLvl: 20 },
  { id: 'mithril_headband', name: 'Mithril Headband', slot: 'helmet', armorType: 'leather', baseStats: { armor: 14, dodgeChance: 9 }, iLvl: 30 },
  { id: 'runic_hood', name: 'Runic Hood', slot: 'helmet', armorType: 'leather', baseStats: { armor: 20, dodgeChance: 12 }, iLvl: 40 },
  { id: 'void_hood', name: 'Void Hood', slot: 'helmet', armorType: 'leather', baseStats: { armor: 26, dodgeChance: 15 }, iLvl: 50 },
  { id: 'starforged_headband', name: 'Starforged Headband', slot: 'helmet', armorType: 'leather', baseStats: { armor: 34, dodgeChance: 19 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_hood', name: 'Linen Hood', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 1, abilityHaste: 2 }, iLvl: 1 },
  { id: 'silk_circlet', name: 'Silk Circlet', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 3, abilityHaste: 5 }, iLvl: 10 },
  { id: 'arcane_crown', name: 'Arcane Crown', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 5, abilityHaste: 8 }, iLvl: 20 },
  { id: 'mithril_circlet', name: 'Mithril Circlet', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 7, abilityHaste: 11 }, iLvl: 30 },
  { id: 'runic_crown', name: 'Runic Crown', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 10, abilityHaste: 15 }, iLvl: 40 },
  { id: 'void_circlet', name: 'Void Circlet', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 14, abilityHaste: 20 }, iLvl: 50 },
  { id: 'starforged_crown', name: 'Starforged Crown', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 18, abilityHaste: 26 }, iLvl: 60 },

  // ==================== Neck ====================
  { id: 'bone_charm', name: 'Bone Charm', slot: 'neck', baseStats: { life: 8 }, iLvl: 1 },
  { id: 'jade_amulet', name: 'Jade Amulet', slot: 'neck', baseStats: { life: 15, damage: 3 }, iLvl: 10 },
  { id: 'onyx_pendant', name: 'Onyx Pendant', slot: 'neck', baseStats: { life: 22, critChance: 3 }, iLvl: 20 },
  { id: 'ruby_amulet', name: 'Ruby Amulet', slot: 'neck', baseStats: { life: 30, damage: 5 }, iLvl: 30 },
  { id: 'void_pendant', name: 'Void Pendant', slot: 'neck', baseStats: { life: 40, critChance: 5 }, iLvl: 40 },
  { id: 'astral_choker', name: 'Astral Choker', slot: 'neck', baseStats: { life: 52, critDamage: 15 }, iLvl: 50 },
  { id: 'starforged_amulet', name: 'Starforged Amulet', slot: 'neck', baseStats: { life: 65, damage: 10, critChance: 5 }, iLvl: 60 },

  // ==================== Shoulders ====================
  // -- Plate --
  { id: 'iron_pauldrons', name: 'Iron Pauldrons', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 8 }, iLvl: 1 },
  { id: 'steel_shoulderguards', name: 'Steel Shoulderguards', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 18 }, iLvl: 10 },
  { id: 'obsidian_mantle', name: 'Obsidian Mantle', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 32 }, iLvl: 20 },
  { id: 'mithril_pauldrons', name: 'Mithril Pauldrons', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 44 }, iLvl: 30 },
  { id: 'runic_shoulderguards', name: 'Runic Shoulderguards', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 60 }, iLvl: 40 },
  { id: 'void_mantle', name: 'Void Mantle', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 78 }, iLvl: 50 },
  { id: 'starforged_pauldrons', name: 'Starforged Pauldrons', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 100 }, iLvl: 60 },
  // -- Mail --
  { id: 'chain_spaulders', name: 'Chain Spaulders', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 5, dodgeChance: 1 }, iLvl: 1 },
  { id: 'linked_pauldrons', name: 'Linked Pauldrons', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 12, dodgeChance: 2 }, iLvl: 10 },
  { id: 'riveted_shoulders', name: 'Riveted Shoulders', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 21, dodgeChance: 3 }, iLvl: 20 },
  { id: 'mithril_spaulders', name: 'Mithril Spaulders', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 29, dodgeChance: 4 }, iLvl: 30 },
  { id: 'runic_spaulders', name: 'Runic Spaulders', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 39, dodgeChance: 6 }, iLvl: 40 },
  { id: 'void_spaulders', name: 'Void Spaulders', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 52, dodgeChance: 8 }, iLvl: 50 },
  { id: 'starforged_spaulders', name: 'Starforged Spaulders', slot: 'shoulders', armorType: 'mail', baseStats: { armor: 67, dodgeChance: 10 }, iLvl: 60 },
  // -- Leather --
  { id: 'hide_shoulderpads', name: 'Hide Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 2, dodgeChance: 3 }, iLvl: 1 },
  { id: 'studded_shoulderguards', name: 'Studded Shoulderguards', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 5, dodgeChance: 4 }, iLvl: 10 },
  { id: 'nightstalker_shoulders', name: 'Nightstalker Shoulders', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 8, dodgeChance: 6 }, iLvl: 20 },
  { id: 'mithril_shoulderpads', name: 'Mithril Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 12, dodgeChance: 8 }, iLvl: 30 },
  { id: 'runic_shoulderpads', name: 'Runic Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 16, dodgeChance: 10 }, iLvl: 40 },
  { id: 'void_shoulderpads', name: 'Void Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 22, dodgeChance: 13 }, iLvl: 50 },
  { id: 'starforged_shoulderpads', name: 'Starforged Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 28, dodgeChance: 16 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_shawl', name: 'Linen Shawl', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 1, abilityHaste: 2 }, iLvl: 1 },
  { id: 'silk_epaulets', name: 'Silk Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 3, abilityHaste: 4 }, iLvl: 10 },
  { id: 'arcane_mantle', name: 'Arcane Mantle', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 5, abilityHaste: 7 }, iLvl: 20 },
  { id: 'mithril_epaulets', name: 'Mithril Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 7, abilityHaste: 10 }, iLvl: 30 },
  { id: 'runic_epaulets', name: 'Runic Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 10, abilityHaste: 13 }, iLvl: 40 },
  { id: 'void_epaulets', name: 'Void Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 13, abilityHaste: 17 }, iLvl: 50 },
  { id: 'starforged_epaulets', name: 'Starforged Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 17, abilityHaste: 22 }, iLvl: 60 },

  // ==================== Cloak (generic -- no armor type) ====================
  { id: 'tattered_cloak', name: 'Tattered Cloak', slot: 'cloak', baseStats: { armor: 2, dodgeChance: 1 }, iLvl: 1 },
  { id: 'travelers_cloak', name: "Traveler's Cloak", slot: 'cloak', baseStats: { armor: 6, dodgeChance: 2 }, iLvl: 10 },
  { id: 'shadowweave_cloak', name: 'Shadowweave Cloak', slot: 'cloak', baseStats: { armor: 10, dodgeChance: 4 }, iLvl: 20 },
  { id: 'mithril_cloak', name: 'Mithril Cloak', slot: 'cloak', baseStats: { armor: 15, dodgeChance: 5 }, iLvl: 30 },
  { id: 'runic_mantle', name: 'Runic Mantle', slot: 'cloak', baseStats: { armor: 22, dodgeChance: 7 }, iLvl: 40 },
  { id: 'void_shroud', name: 'Void Shroud', slot: 'cloak', baseStats: { armor: 30, dodgeChance: 9 }, iLvl: 50 },
  { id: 'starforged_cloak', name: 'Starforged Cloak', slot: 'cloak', baseStats: { armor: 40, dodgeChance: 12 }, iLvl: 60 },

  // ==================== Chest ====================
  // -- Plate --
  { id: 'iron_breastplate', name: 'Iron Breastplate', slot: 'chest', armorType: 'plate', baseStats: { armor: 12 }, iLvl: 1 },
  { id: 'steel_cuirass', name: 'Steel Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 28 }, iLvl: 10 },
  { id: 'plate_cuirass', name: 'Plate Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 45, life: 15 }, iLvl: 20 },
  { id: 'mithril_cuirass', name: 'Mithril Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 62, life: 20 }, iLvl: 30 },
  { id: 'runic_breastplate', name: 'Runic Breastplate', slot: 'chest', armorType: 'plate', baseStats: { armor: 84, life: 28 }, iLvl: 40 },
  { id: 'void_cuirass', name: 'Void Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 110, life: 36 }, iLvl: 50 },
  { id: 'starforged_breastplate', name: 'Starforged Breastplate', slot: 'chest', armorType: 'plate', baseStats: { armor: 140, life: 46 }, iLvl: 60 },
  // -- Mail --
  { id: 'chain_vest', name: 'Chain Vest', slot: 'chest', armorType: 'mail', baseStats: { armor: 8, dodgeChance: 2 }, iLvl: 1 },
  { id: 'chain_hauberk', name: 'Chain Hauberk', slot: 'chest', armorType: 'mail', baseStats: { armor: 25, life: 10 }, iLvl: 10 },
  { id: 'linked_haubergeon', name: 'Linked Haubergeon', slot: 'chest', armorType: 'mail', baseStats: { armor: 32, dodgeChance: 5 }, iLvl: 20 },
  { id: 'mithril_hauberk', name: 'Mithril Hauberk', slot: 'chest', armorType: 'mail', baseStats: { armor: 44, dodgeChance: 6 }, iLvl: 30 },
  { id: 'runic_hauberk', name: 'Runic Hauberk', slot: 'chest', armorType: 'mail', baseStats: { armor: 58, dodgeChance: 8 }, iLvl: 40 },
  { id: 'void_hauberk', name: 'Void Hauberk', slot: 'chest', armorType: 'mail', baseStats: { armor: 76, dodgeChance: 11 }, iLvl: 50 },
  { id: 'starforged_hauberk', name: 'Starforged Hauberk', slot: 'chest', armorType: 'mail', baseStats: { armor: 98, dodgeChance: 14 }, iLvl: 60 },
  // -- Leather --
  { id: 'rawhide_tunic', name: 'Rawhide Tunic', slot: 'chest', armorType: 'leather', baseStats: { armor: 3, dodgeChance: 4 }, iLvl: 1 },
  { id: 'studded_jerkin', name: 'Studded Jerkin', slot: 'chest', armorType: 'leather', baseStats: { armor: 8, dodgeChance: 6 }, iLvl: 10 },
  { id: 'nightstalker_vest', name: 'Nightstalker Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 13, dodgeChance: 9 }, iLvl: 20 },
  { id: 'mithril_vest', name: 'Mithril Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 18, dodgeChance: 11 }, iLvl: 30 },
  { id: 'runic_vest', name: 'Runic Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 24, dodgeChance: 14 }, iLvl: 40 },
  { id: 'void_vest', name: 'Void Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 32, dodgeChance: 18 }, iLvl: 50 },
  { id: 'starforged_vest', name: 'Starforged Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 42, dodgeChance: 22 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_robe', name: 'Linen Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 10, life: 5 }, iLvl: 1 },
  { id: 'silk_robe', name: 'Silk Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 4, abilityHaste: 6 }, iLvl: 10 },
  { id: 'arcane_vestment', name: 'Arcane Vestment', slot: 'chest', armorType: 'cloth', baseStats: { armor: 7, abilityHaste: 10 }, iLvl: 20 },
  { id: 'mithril_robe', name: 'Mithril Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 10, abilityHaste: 13 }, iLvl: 30 },
  { id: 'runic_vestment', name: 'Runic Vestment', slot: 'chest', armorType: 'cloth', baseStats: { armor: 14, abilityHaste: 18 }, iLvl: 40 },
  { id: 'void_robe', name: 'Void Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 18, abilityHaste: 24 }, iLvl: 50 },
  { id: 'starforged_vestment', name: 'Starforged Vestment', slot: 'chest', armorType: 'cloth', baseStats: { armor: 24, abilityHaste: 30 }, iLvl: 60 },

  // ==================== Bracers (generic -- no armor type) ====================
  { id: 'wrapped_bracers', name: 'Wrapped Bracers', slot: 'bracers', baseStats: { armor: 4, life: 3 }, iLvl: 1 },
  { id: 'fortified_bracers', name: 'Fortified Bracers', slot: 'bracers', baseStats: { armor: 10, life: 8 }, iLvl: 10 },
  { id: 'runed_bracers', name: 'Runed Bracers', slot: 'bracers', baseStats: { armor: 18, life: 12 }, iLvl: 20 },
  { id: 'mithril_bracers', name: 'Mithril Bracers', slot: 'bracers', baseStats: { armor: 26, life: 16 }, iLvl: 30 },
  { id: 'runic_vambraces', name: 'Runic Vambraces', slot: 'bracers', baseStats: { armor: 36, life: 22 }, iLvl: 40 },
  { id: 'void_bracers', name: 'Void Bracers', slot: 'bracers', baseStats: { armor: 48, life: 28 }, iLvl: 50 },
  { id: 'starforged_bracers', name: 'Starforged Bracers', slot: 'bracers', baseStats: { armor: 62, life: 36 }, iLvl: 60 },

  // ==================== Gloves ====================
  // -- Plate --
  { id: 'iron_gauntlets', name: 'Iron Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 6 }, iLvl: 1 },
  { id: 'steel_gauntlets', name: 'Steel Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 14 }, iLvl: 10 },
  { id: 'obsidian_gauntlets', name: 'Obsidian Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 24 }, iLvl: 20 },
  { id: 'mithril_gauntlets', name: 'Mithril Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 33 }, iLvl: 30 },
  { id: 'runic_gauntlets', name: 'Runic Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 44 }, iLvl: 40 },
  { id: 'void_gauntlets', name: 'Void Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 58 }, iLvl: 50 },
  { id: 'starforged_gauntlets', name: 'Starforged Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 74 }, iLvl: 60 },
  // -- Mail --
  { id: 'chain_gloves', name: 'Chain Gloves', slot: 'gloves', armorType: 'mail', baseStats: { armor: 4, dodgeChance: 1 }, iLvl: 1 },
  { id: 'linked_gauntlets', name: 'Linked Gauntlets', slot: 'gloves', armorType: 'mail', baseStats: { armor: 9, dodgeChance: 2 }, iLvl: 10 },
  { id: 'riveted_gauntlets', name: 'Riveted Gauntlets', slot: 'gloves', armorType: 'mail', baseStats: { armor: 16, dodgeChance: 3 }, iLvl: 20 },
  { id: 'mithril_chain_gloves', name: 'Mithril Chain Gloves', slot: 'gloves', armorType: 'mail', baseStats: { armor: 22, dodgeChance: 4 }, iLvl: 30 },
  { id: 'runic_chain_gloves', name: 'Runic Chain Gloves', slot: 'gloves', armorType: 'mail', baseStats: { armor: 30, dodgeChance: 5 }, iLvl: 40 },
  { id: 'void_chain_gloves', name: 'Void Chain Gloves', slot: 'gloves', armorType: 'mail', baseStats: { armor: 40, dodgeChance: 7 }, iLvl: 50 },
  { id: 'starforged_chain_gloves', name: 'Starforged Chain Gloves', slot: 'gloves', armorType: 'mail', baseStats: { armor: 52, dodgeChance: 9 }, iLvl: 60 },
  // -- Leather --
  { id: 'hide_gloves', name: 'Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 2, dodgeChance: 2 }, iLvl: 1 },
  { id: 'studded_gloves', name: 'Studded Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 4, dodgeChance: 3 }, iLvl: 10 },
  { id: 'nightstalker_gloves', name: 'Nightstalker Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 6, dodgeChance: 5 }, iLvl: 20 },
  { id: 'mithril_hide_gloves', name: 'Mithril Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 9, dodgeChance: 7 }, iLvl: 30 },
  { id: 'runic_hide_gloves', name: 'Runic Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 12, dodgeChance: 9 }, iLvl: 40 },
  { id: 'void_hide_gloves', name: 'Void Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 16, dodgeChance: 12 }, iLvl: 50 },
  { id: 'starforged_hide_gloves', name: 'Starforged Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 22, dodgeChance: 15 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_gloves', name: 'Linen Gloves', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 1, abilityHaste: 1 }, iLvl: 1 },
  { id: 'silk_gloves', name: 'Silk Gloves', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 2, abilityHaste: 3 }, iLvl: 10 },
  { id: 'arcane_handwraps', name: 'Arcane Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 4, abilityHaste: 5 }, iLvl: 20 },
  { id: 'mithril_handwraps', name: 'Mithril Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 6, abilityHaste: 7 }, iLvl: 30 },
  { id: 'runic_handwraps', name: 'Runic Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 8, abilityHaste: 10 }, iLvl: 40 },
  { id: 'void_handwraps', name: 'Void Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 11, abilityHaste: 13 }, iLvl: 50 },
  { id: 'starforged_handwraps', name: 'Starforged Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 14, abilityHaste: 17 }, iLvl: 60 },

  // ==================== Belt (generic -- no armor type) ====================
  { id: 'rope_belt', name: 'Rope Belt', slot: 'belt', baseStats: { armor: 3, life: 5 }, iLvl: 1 },
  { id: 'studded_belt', name: 'Studded Belt', slot: 'belt', baseStats: { armor: 8, life: 12 }, iLvl: 10 },
  { id: 'runed_girdle', name: 'Runed Girdle', slot: 'belt', baseStats: { armor: 14, life: 18 }, iLvl: 20 },
  { id: 'mithril_belt', name: 'Mithril Belt', slot: 'belt', baseStats: { armor: 20, life: 25 }, iLvl: 30 },
  { id: 'runic_girdle', name: 'Runic Girdle', slot: 'belt', baseStats: { armor: 28, life: 34 }, iLvl: 40 },
  { id: 'void_belt', name: 'Void Belt', slot: 'belt', baseStats: { armor: 38, life: 44 }, iLvl: 50 },
  { id: 'starforged_belt', name: 'Starforged Belt', slot: 'belt', baseStats: { armor: 50, life: 56 }, iLvl: 60 },

  // ==================== Pants ====================
  // -- Plate --
  { id: 'iron_legguards', name: 'Iron Legguards', slot: 'pants', armorType: 'plate', baseStats: { armor: 10 }, iLvl: 1 },
  { id: 'steel_legplates', name: 'Steel Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 24 }, iLvl: 10 },
  { id: 'obsidian_greaves', name: 'Obsidian Greaves', slot: 'pants', armorType: 'plate', baseStats: { armor: 42 }, iLvl: 20 },
  { id: 'mithril_legplates', name: 'Mithril Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 58 }, iLvl: 30 },
  { id: 'runic_legplates', name: 'Runic Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 78 }, iLvl: 40 },
  { id: 'void_legplates', name: 'Void Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 102 }, iLvl: 50 },
  { id: 'starforged_legplates', name: 'Starforged Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 130 }, iLvl: 60 },
  // -- Mail --
  { id: 'chain_leggings', name: 'Chain Leggings', slot: 'pants', armorType: 'mail', baseStats: { armor: 7, dodgeChance: 1 }, iLvl: 1 },
  { id: 'linked_chausses', name: 'Linked Chausses', slot: 'pants', armorType: 'mail', baseStats: { armor: 16, dodgeChance: 3 }, iLvl: 10 },
  { id: 'riveted_leggings', name: 'Riveted Leggings', slot: 'pants', armorType: 'mail', baseStats: { armor: 28, dodgeChance: 4 }, iLvl: 20 },
  { id: 'mithril_chausses', name: 'Mithril Chausses', slot: 'pants', armorType: 'mail', baseStats: { armor: 38, dodgeChance: 5 }, iLvl: 30 },
  { id: 'runic_chausses', name: 'Runic Chausses', slot: 'pants', armorType: 'mail', baseStats: { armor: 52, dodgeChance: 7 }, iLvl: 40 },
  { id: 'void_chausses', name: 'Void Chausses', slot: 'pants', armorType: 'mail', baseStats: { armor: 68, dodgeChance: 9 }, iLvl: 50 },
  { id: 'starforged_chausses', name: 'Starforged Chausses', slot: 'pants', armorType: 'mail', baseStats: { armor: 88, dodgeChance: 12 }, iLvl: 60 },
  // -- Leather --
  { id: 'rawhide_pants', name: 'Rawhide Pants', slot: 'pants', armorType: 'leather', baseStats: { armor: 3, dodgeChance: 3 }, iLvl: 1 },
  { id: 'studded_leggings', name: 'Studded Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 7, dodgeChance: 5 }, iLvl: 10 },
  { id: 'nightstalker_pants', name: 'Nightstalker Pants', slot: 'pants', armorType: 'leather', baseStats: { armor: 11, dodgeChance: 8 }, iLvl: 20 },
  { id: 'mithril_leggings', name: 'Mithril Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 16, dodgeChance: 10 }, iLvl: 30 },
  { id: 'runic_leggings', name: 'Runic Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 22, dodgeChance: 13 }, iLvl: 40 },
  { id: 'void_leggings', name: 'Void Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 30, dodgeChance: 16 }, iLvl: 50 },
  { id: 'starforged_leggings', name: 'Starforged Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 38, dodgeChance: 20 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_trousers', name: 'Linen Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 2, abilityHaste: 3 }, iLvl: 1 },
  { id: 'silk_pants', name: 'Silk Pants', slot: 'pants', armorType: 'cloth', baseStats: { armor: 4, abilityHaste: 5 }, iLvl: 10 },
  { id: 'arcane_leggings', name: 'Arcane Leggings', slot: 'pants', armorType: 'cloth', baseStats: { armor: 6, abilityHaste: 9 }, iLvl: 20 },
  { id: 'mithril_trousers', name: 'Mithril Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 9, abilityHaste: 12 }, iLvl: 30 },
  { id: 'runic_trousers', name: 'Runic Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 12, abilityHaste: 16 }, iLvl: 40 },
  { id: 'void_trousers', name: 'Void Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 16, abilityHaste: 21 }, iLvl: 50 },
  { id: 'starforged_trousers', name: 'Starforged Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 20, abilityHaste: 27 }, iLvl: 60 },

  // ==================== Boots ====================
  // -- Plate --
  { id: 'iron_sabatons', name: 'Iron Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 8, dodgeChance: 1 }, iLvl: 1 },
  { id: 'plated_greaves', name: 'Plated Greaves', slot: 'boots', armorType: 'plate', baseStats: { armor: 15, dodgeChance: 2 }, iLvl: 10 },
  { id: 'obsidian_sabatons', name: 'Obsidian Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 28, dodgeChance: 2 }, iLvl: 20 },
  { id: 'mithril_sabatons', name: 'Mithril Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 38, dodgeChance: 3 }, iLvl: 30 },
  { id: 'runic_sabatons', name: 'Runic Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 52, dodgeChance: 4 }, iLvl: 40 },
  { id: 'void_sabatons', name: 'Void Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 68, dodgeChance: 5 }, iLvl: 50 },
  { id: 'starforged_sabatons', name: 'Starforged Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 88, dodgeChance: 6 }, iLvl: 60 },
  // -- Mail --
  { id: 'chain_boots', name: 'Chain Boots', slot: 'boots', armorType: 'mail', baseStats: { armor: 5, dodgeChance: 2 }, iLvl: 1 },
  { id: 'linked_boots', name: 'Linked Boots', slot: 'boots', armorType: 'mail', baseStats: { armor: 12, dodgeChance: 3 }, iLvl: 10 },
  { id: 'riveted_treads', name: 'Riveted Treads', slot: 'boots', armorType: 'mail', baseStats: { armor: 18, dodgeChance: 4 }, iLvl: 20 },
  { id: 'mithril_boots', name: 'Mithril Boots', slot: 'boots', armorType: 'mail', baseStats: { armor: 25, dodgeChance: 5 }, iLvl: 30 },
  { id: 'runic_boots', name: 'Runic Boots', slot: 'boots', armorType: 'mail', baseStats: { armor: 34, dodgeChance: 7 }, iLvl: 40 },
  { id: 'void_boots', name: 'Void Boots', slot: 'boots', armorType: 'mail', baseStats: { armor: 45, dodgeChance: 9 }, iLvl: 50 },
  { id: 'starforged_boots', name: 'Starforged Boots', slot: 'boots', armorType: 'mail', baseStats: { armor: 58, dodgeChance: 11 }, iLvl: 60 },
  // -- Leather --
  { id: 'leather_boots', name: 'Leather Boots', slot: 'boots', armorType: 'leather', baseStats: { armor: 5, dodgeChance: 3 }, iLvl: 1 },
  { id: 'studded_boots', name: 'Studded Boots', slot: 'boots', armorType: 'leather', baseStats: { armor: 5, dodgeChance: 5 }, iLvl: 10 },
  { id: 'nightstalker_boots', name: 'Nightstalker Boots', slot: 'boots', armorType: 'leather', baseStats: { armor: 8, dodgeChance: 7 }, iLvl: 20 },
  { id: 'mithril_treads', name: 'Mithril Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 12, dodgeChance: 9 }, iLvl: 30 },
  { id: 'runic_treads_leather', name: 'Runic Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 16, dodgeChance: 12 }, iLvl: 40 },
  { id: 'void_treads', name: 'Void Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 22, dodgeChance: 15 }, iLvl: 50 },
  { id: 'starforged_treads', name: 'Starforged Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 28, dodgeChance: 18 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_sandals', name: 'Linen Sandals', slot: 'boots', armorType: 'cloth', baseStats: { armor: 1, dodgeChance: 1, abilityHaste: 2 }, iLvl: 1 },
  { id: 'silk_slippers', name: 'Silk Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 3, dodgeChance: 2, abilityHaste: 4 }, iLvl: 10 },
  { id: 'runic_treads', name: 'Runic Treads', slot: 'boots', armorType: 'cloth', baseStats: { armor: 8, dodgeChance: 5 }, iLvl: 20 },
  { id: 'mithril_slippers', name: 'Mithril Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 5, dodgeChance: 3, abilityHaste: 6 }, iLvl: 30 },
  { id: 'runic_slippers', name: 'Runic Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 7, dodgeChance: 4, abilityHaste: 8 }, iLvl: 40 },
  { id: 'void_slippers', name: 'Void Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 10, dodgeChance: 5, abilityHaste: 11 }, iLvl: 50 },
  { id: 'starforged_slippers', name: 'Starforged Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 13, dodgeChance: 6, abilityHaste: 14 }, iLvl: 60 },

  // ==================== Rings (ring1 slot) ====================
  { id: 'copper_band', name: 'Copper Band', slot: 'ring1', baseStats: { life: 5 }, iLvl: 1 },
  { id: 'silver_ring', name: 'Silver Ring', slot: 'ring1', baseStats: { life: 10, critChance: 2 }, iLvl: 10 },
  { id: 'gold_signet', name: 'Gold Signet', slot: 'ring1', baseStats: { life: 15, critDamage: 10 }, iLvl: 20 },
  { id: 'ruby_ring', name: 'Ruby Ring', slot: 'ring1', baseStats: { life: 20, critChance: 4 }, iLvl: 30 },
  { id: 'void_band', name: 'Void Band', slot: 'ring1', baseStats: { life: 28, critDamage: 18 }, iLvl: 40 },
  { id: 'astral_ring', name: 'Astral Ring', slot: 'ring1', baseStats: { life: 36, critChance: 6 }, iLvl: 50 },
  { id: 'starforged_signet', name: 'Starforged Signet', slot: 'ring1', baseStats: { life: 45, critDamage: 25 }, iLvl: 60 },

  // ==================== Trinkets (trinket1 slot) ====================
  { id: 'cracked_gem', name: 'Cracked Gem', slot: 'trinket1', baseStats: { damage: 3 }, iLvl: 1 },
  { id: 'polished_stone', name: 'Polished Stone', slot: 'trinket1', baseStats: { damage: 5, critChance: 2 }, iLvl: 10 },
  { id: 'prismatic_shard', name: 'Prismatic Shard', slot: 'trinket1', baseStats: { damage: 8, critDamage: 15 }, iLvl: 20 },
  { id: 'infused_crystal', name: 'Infused Crystal', slot: 'trinket1', baseStats: { damage: 12, critChance: 4 }, iLvl: 30 },
  { id: 'void_shard', name: 'Void Shard', slot: 'trinket1', baseStats: { damage: 18, critDamage: 20 }, iLvl: 40 },
  { id: 'astral_prism', name: 'Astral Prism', slot: 'trinket1', baseStats: { damage: 25, critChance: 6 }, iLvl: 50 },
  { id: 'starforged_gem', name: 'Starforged Gem', slot: 'trinket1', baseStats: { damage: 35, critDamage: 30 }, iLvl: 60 },
];

export const BAG_UPGRADE_DEFS: BagUpgradeDef[] = [
  { id: 'tattered_satchel', name: 'Tattered Satchel', capacity: 6, tier: 1, description: 'A worn bag. 6 slots.', goldCost: 50, sellValue: 5, salvageValue: 1 },
  { id: 'leather_pack', name: 'Leather Pack', capacity: 8, tier: 2, description: 'A sturdy leather pack. 8 slots.', goldCost: 200, sellValue: 25, salvageValue: 2 },
  { id: 'reinforced_rucksack', name: 'Reinforced Rucksack', capacity: 10, tier: 3, description: 'Metal-braced rucksack. 10 slots.', goldCost: 450, sellValue: 60, salvageValue: 3 },
  { id: 'enchanted_haversack', name: 'Enchanted Haversack', capacity: 12, tier: 4, description: 'Magically expanded haversack. 12 slots.', goldCost: 800, sellValue: 120, salvageValue: 4 },
  { id: 'void_touched_sack', name: 'Void-Touched Sack', capacity: 14, tier: 5, description: 'A bag touched by the void. 14 slots.', goldCost: 1250, sellValue: 200, salvageValue: 5 },
];

export const BAG_SLOT_COUNT = 5;

/** Lookup a BagUpgradeDef by id, fallback to tier 1. */
export function getBagDef(id: string): BagUpgradeDef {
  return BAG_UPGRADE_DEFS.find(b => b.id === id) ?? BAG_UPGRADE_DEFS[0];
}

/** Calculate total inventory capacity from an array of bag slot IDs. */
export function calcBagCapacity(bagSlots: string[]): number {
  return bagSlots.reduce((sum, id) => sum + getBagDef(id).capacity, 0);
}

export const CURRENCY_DEFS: CurrencyDef[] = [
  { id: 'augment', name: 'Augment Shard', description: 'Add one random affix to an item with open slots', icon: '\uD83D\uDFE2', rarity: 'common' },
  { id: 'chaos', name: 'Chaos Shard', description: 'Remove one random affix and add one random affix', icon: '\uD83D\uDD34', rarity: 'uncommon' },
  { id: 'divine', name: 'Divine Shard', description: 'Reroll values within existing affixes', icon: '\uD83D\uDFE0', rarity: 'uncommon' },
  { id: 'annul', name: 'Annul Shard', description: 'Remove one random affix (minimum 2 affixes)', icon: '\u26AB', rarity: 'uncommon' },
  { id: 'exalt', name: 'Exalt Shard', description: 'Add one guaranteed T1-T3 affix', icon: '\uD83D\uDFE3', rarity: 'rare' },
  { id: 'socket', name: 'Socket Shard', description: 'Socket crafting (coming soon)', icon: '\uD83D\uDD35', rarity: 'rare' },
];

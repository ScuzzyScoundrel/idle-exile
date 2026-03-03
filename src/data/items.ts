import type { ItemBaseDef, CurrencyDef, BagUpgradeDef } from '../types';

export const ITEM_BASE_DEFS: ItemBaseDef[] = [
  // ============================================================
  // MAINHAND — 14 weapon types × 6 bands (84 bases)
  // Attack weapons: baseStats.flatPhysDamage = avg, baseDamageMin/Max
  // Spell weapons: baseStats.spellPower = avg, baseSpellPower
  // Hybrid: both flatPhysDamage and spellPower
  // ============================================================

  // ==================== Swords (1H Attack, balanced) ====================
  { id: 'rusty_shortsword', name: 'Rusty Shortsword', slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 5 }, baseDamageMin: 4, baseDamageMax: 8, iLvl: 1 },
  { id: 'iron_sword',        name: 'Iron Sword',        slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 15 }, baseDamageMin: 10, baseDamageMax: 20, iLvl: 1 },
  { id: 'steel_blade',       name: 'Steel Blade',       slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 25 }, baseDamageMin: 18, baseDamageMax: 32, iLvl: 10 },
  { id: 'obsidian_edge',     name: 'Obsidian Edge',     slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 40 }, baseDamageMin: 30, baseDamageMax: 50, iLvl: 20 },
  { id: 'mithril_blade',     name: 'Mithril Blade',     slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 55 }, baseDamageMin: 42, baseDamageMax: 68, iLvl: 30 },
  { id: 'void_cleaver',      name: 'Void Cleaver',      slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 80 }, baseDamageMin: 62, baseDamageMax: 98, iLvl: 45 },
  { id: 'starforged_blade',  name: 'Starforged Blade',  slot: 'mainhand', weaponType: 'sword', baseStats: { flatPhysDamage: 110 }, baseDamageMin: 86, baseDamageMax: 134, iLvl: 60 },

  // ==================== Axes (1H Attack, high damage slow) ====================
  { id: 'rusty_hatchet',     name: 'Rusty Hatchet',     slot: 'mainhand', weaponType: 'axe', baseStats: { flatPhysDamage: 18 }, baseDamageMin: 12, baseDamageMax: 24, iLvl: 1 },
  { id: 'iron_battleaxe',    name: 'Iron Battleaxe',    slot: 'mainhand', weaponType: 'axe', baseStats: { flatPhysDamage: 30 }, baseDamageMin: 22, baseDamageMax: 38, iLvl: 10 },
  { id: 'obsidian_cleaver',  name: 'Obsidian Cleaver',  slot: 'mainhand', weaponType: 'axe', baseStats: { flatPhysDamage: 48 }, baseDamageMin: 36, baseDamageMax: 60, iLvl: 20 },
  { id: 'mithril_waraxe',    name: 'Mithril Waraxe',    slot: 'mainhand', weaponType: 'axe', baseStats: { flatPhysDamage: 66 }, baseDamageMin: 50, baseDamageMax: 82, iLvl: 30 },
  { id: 'void_reaver',       name: 'Void Reaver',       slot: 'mainhand', weaponType: 'axe', baseStats: { flatPhysDamage: 96 }, baseDamageMin: 74, baseDamageMax: 118, iLvl: 45 },
  { id: 'starforged_axe',    name: 'Starforged Axe',    slot: 'mainhand', weaponType: 'axe', baseStats: { flatPhysDamage: 132 }, baseDamageMin: 102, baseDamageMax: 162, iLvl: 60 },

  // ==================== Maces (1H Attack, tanky) ====================
  { id: 'crude_club',        name: 'Crude Club',        slot: 'mainhand', weaponType: 'mace', baseStats: { flatPhysDamage: 13, armor: 3 }, baseDamageMin: 8, baseDamageMax: 18, iLvl: 1 },
  { id: 'iron_mace',         name: 'Iron Mace',         slot: 'mainhand', weaponType: 'mace', baseStats: { flatPhysDamage: 22, armor: 6 }, baseDamageMin: 15, baseDamageMax: 29, iLvl: 10 },
  { id: 'obsidian_hammer',   name: 'Obsidian Hammer',   slot: 'mainhand', weaponType: 'mace', baseStats: { flatPhysDamage: 35, armor: 11 }, baseDamageMin: 25, baseDamageMax: 45, iLvl: 20 },
  { id: 'mithril_mace',      name: 'Mithril Mace',      slot: 'mainhand', weaponType: 'mace', baseStats: { flatPhysDamage: 48, armor: 16 }, baseDamageMin: 35, baseDamageMax: 61, iLvl: 30 },
  { id: 'void_maul_1h',      name: 'Void Crusher',      slot: 'mainhand', weaponType: 'mace', baseStats: { flatPhysDamage: 70, armor: 22 }, baseDamageMin: 52, baseDamageMax: 88, iLvl: 45 },
  { id: 'starforged_mace',   name: 'Starforged Mace',   slot: 'mainhand', weaponType: 'mace', baseStats: { flatPhysDamage: 96, armor: 30 }, baseDamageMin: 72, baseDamageMax: 120, iLvl: 60 },

  // ==================== Greatswords (2H Attack) ====================
  { id: 'iron_greatsword',      name: 'Iron Greatsword',      slot: 'mainhand', weaponType: 'greatsword', baseStats: { flatPhysDamage: 24 }, baseDamageMin: 16, baseDamageMax: 32, iLvl: 1 },
  { id: 'steel_greatsword',     name: 'Steel Greatsword',     slot: 'mainhand', weaponType: 'greatsword', baseStats: { flatPhysDamage: 42 }, baseDamageMin: 30, baseDamageMax: 54, iLvl: 10 },
  { id: 'obsidian_greatsword',  name: 'Obsidian Greatsword',  slot: 'mainhand', weaponType: 'greatsword', baseStats: { flatPhysDamage: 66 }, baseDamageMin: 48, baseDamageMax: 84, iLvl: 20 },
  { id: 'mithril_greatsword',   name: 'Mithril Greatsword',   slot: 'mainhand', weaponType: 'greatsword', baseStats: { flatPhysDamage: 90 }, baseDamageMin: 66, baseDamageMax: 114, iLvl: 30 },
  { id: 'void_greatsword',      name: 'Void Greatsword',      slot: 'mainhand', weaponType: 'greatsword', baseStats: { flatPhysDamage: 130 }, baseDamageMin: 96, baseDamageMax: 164, iLvl: 45 },
  { id: 'starforged_greatsword', name: 'Starforged Greatsword', slot: 'mainhand', weaponType: 'greatsword', baseStats: { flatPhysDamage: 180 }, baseDamageMin: 134, baseDamageMax: 226, iLvl: 60 },

  // ==================== Greataxes (2H Attack) ====================
  { id: 'iron_greataxe',      name: 'Iron Greataxe',      slot: 'mainhand', weaponType: 'greataxe', baseStats: { flatPhysDamage: 28 }, baseDamageMin: 18, baseDamageMax: 38, iLvl: 1 },
  { id: 'steel_greataxe',     name: 'Steel Greataxe',     slot: 'mainhand', weaponType: 'greataxe', baseStats: { flatPhysDamage: 48 }, baseDamageMin: 32, baseDamageMax: 64, iLvl: 10 },
  { id: 'obsidian_greataxe',  name: 'Obsidian Greataxe',  slot: 'mainhand', weaponType: 'greataxe', baseStats: { flatPhysDamage: 76 }, baseDamageMin: 52, baseDamageMax: 100, iLvl: 20 },
  { id: 'mithril_greataxe',   name: 'Mithril Greataxe',   slot: 'mainhand', weaponType: 'greataxe', baseStats: { flatPhysDamage: 104 }, baseDamageMin: 72, baseDamageMax: 136, iLvl: 30 },
  { id: 'void_greataxe',      name: 'Void Greataxe',      slot: 'mainhand', weaponType: 'greataxe', baseStats: { flatPhysDamage: 150 }, baseDamageMin: 106, baseDamageMax: 194, iLvl: 45 },
  { id: 'starforged_greataxe', name: 'Starforged Greataxe', slot: 'mainhand', weaponType: 'greataxe', baseStats: { flatPhysDamage: 206 }, baseDamageMin: 146, baseDamageMax: 266, iLvl: 60 },

  // ==================== Mauls (2H Attack, slowest/hardest) ====================
  { id: 'iron_maul',       name: 'Iron Maul',       slot: 'mainhand', weaponType: 'maul', baseStats: { flatPhysDamage: 32 }, baseDamageMin: 20, baseDamageMax: 44, iLvl: 1 },
  { id: 'steel_maul',      name: 'Steel Maul',      slot: 'mainhand', weaponType: 'maul', baseStats: { flatPhysDamage: 54 }, baseDamageMin: 36, baseDamageMax: 72, iLvl: 10 },
  { id: 'obsidian_maul',   name: 'Obsidian Maul',   slot: 'mainhand', weaponType: 'maul', baseStats: { flatPhysDamage: 86 }, baseDamageMin: 58, baseDamageMax: 114, iLvl: 20 },
  { id: 'mithril_maul',    name: 'Mithril Maul',    slot: 'mainhand', weaponType: 'maul', baseStats: { flatPhysDamage: 118 }, baseDamageMin: 80, baseDamageMax: 156, iLvl: 30 },
  { id: 'void_maul',       name: 'Void Maul',       slot: 'mainhand', weaponType: 'maul', baseStats: { flatPhysDamage: 170 }, baseDamageMin: 116, baseDamageMax: 224, iLvl: 45 },
  { id: 'starforged_maul',  name: 'Starforged Maul',  slot: 'mainhand', weaponType: 'maul', baseStats: { flatPhysDamage: 234 }, baseDamageMin: 160, baseDamageMax: 308, iLvl: 60 },

  // ==================== Bows (2H Attack, ranged) ====================
  { id: 'shortbow',         name: 'Shortbow',         slot: 'mainhand', weaponType: 'bow', baseStats: { flatPhysDamage: 14 }, baseDamageMin: 9, baseDamageMax: 19, iLvl: 1 },
  { id: 'recurve_bow',      name: 'Recurve Bow',      slot: 'mainhand', weaponType: 'bow', baseStats: { flatPhysDamage: 23 }, baseDamageMin: 16, baseDamageMax: 30, iLvl: 10 },
  { id: 'obsidian_longbow',  name: 'Obsidian Longbow',  slot: 'mainhand', weaponType: 'bow', baseStats: { flatPhysDamage: 37 }, baseDamageMin: 26, baseDamageMax: 48, iLvl: 20 },
  { id: 'mithril_bow',      name: 'Mithril Bow',      slot: 'mainhand', weaponType: 'bow', baseStats: { flatPhysDamage: 51 }, baseDamageMin: 36, baseDamageMax: 66, iLvl: 30 },
  { id: 'void_bow',         name: 'Void Bow',         slot: 'mainhand', weaponType: 'bow', baseStats: { flatPhysDamage: 74 }, baseDamageMin: 54, baseDamageMax: 94, iLvl: 45 },
  { id: 'starforged_bow',   name: 'Starforged Bow',   slot: 'mainhand', weaponType: 'bow', baseStats: { flatPhysDamage: 102 }, baseDamageMin: 74, baseDamageMax: 130, iLvl: 60 },

  // ==================== Crossbows (2H Attack, burst) ====================
  { id: 'hand_crossbow',       name: 'Hand Crossbow',       slot: 'mainhand', weaponType: 'crossbow', baseStats: { flatPhysDamage: 20 }, baseDamageMin: 14, baseDamageMax: 26, iLvl: 1 },
  { id: 'iron_crossbow',       name: 'Iron Crossbow',       slot: 'mainhand', weaponType: 'crossbow', baseStats: { flatPhysDamage: 33 }, baseDamageMin: 24, baseDamageMax: 42, iLvl: 10 },
  { id: 'obsidian_arbalest',   name: 'Obsidian Arbalest',   slot: 'mainhand', weaponType: 'crossbow', baseStats: { flatPhysDamage: 53 }, baseDamageMin: 38, baseDamageMax: 68, iLvl: 20 },
  { id: 'mithril_crossbow',    name: 'Mithril Crossbow',    slot: 'mainhand', weaponType: 'crossbow', baseStats: { flatPhysDamage: 73 }, baseDamageMin: 52, baseDamageMax: 94, iLvl: 30 },
  { id: 'void_crossbow',       name: 'Void Crossbow',       slot: 'mainhand', weaponType: 'crossbow', baseStats: { flatPhysDamage: 106 }, baseDamageMin: 76, baseDamageMax: 136, iLvl: 45 },
  { id: 'starforged_crossbow',  name: 'Starforged Crossbow',  slot: 'mainhand', weaponType: 'crossbow', baseStats: { flatPhysDamage: 146 }, baseDamageMin: 106, baseDamageMax: 186, iLvl: 60 },

  // ==================== Daggers (1H Hybrid, fast + crit) ====================
  { id: 'crude_dagger',       name: 'Crude Dagger',       slot: 'mainhand', weaponType: 'dagger', baseStats: { flatPhysDamage: 8, spellPower: 4, critChance: 3 }, baseDamageMin: 5, baseDamageMax: 11, baseSpellPower: 4, iLvl: 1 },
  { id: 'steel_stiletto',     name: 'Steel Stiletto',     slot: 'mainhand', weaponType: 'dagger', baseStats: { flatPhysDamage: 14, spellPower: 7, critChance: 5 }, baseDamageMin: 9, baseDamageMax: 19, baseSpellPower: 7, iLvl: 10 },
  { id: 'obsidian_kris',      name: 'Obsidian Kris',      slot: 'mainhand', weaponType: 'dagger', baseStats: { flatPhysDamage: 22, spellPower: 11, critChance: 8 }, baseDamageMin: 15, baseDamageMax: 29, baseSpellPower: 11, iLvl: 20 },
  { id: 'mithril_dirk',       name: 'Mithril Dirk',       slot: 'mainhand', weaponType: 'dagger', baseStats: { flatPhysDamage: 30, spellPower: 15, critChance: 10 }, baseDamageMin: 20, baseDamageMax: 40, baseSpellPower: 15, iLvl: 30 },
  { id: 'void_fang',          name: 'Void Fang',          slot: 'mainhand', weaponType: 'dagger', baseStats: { flatPhysDamage: 44, spellPower: 22, critChance: 13 }, baseDamageMin: 30, baseDamageMax: 58, baseSpellPower: 22, iLvl: 45 },
  { id: 'starforged_dagger',  name: 'Starforged Dagger',  slot: 'mainhand', weaponType: 'dagger', baseStats: { flatPhysDamage: 60, spellPower: 30, critChance: 16 }, baseDamageMin: 42, baseDamageMax: 78, baseSpellPower: 30, iLvl: 60 },

  // ==================== Scepters (1H Hybrid) ====================
  { id: 'copper_scepter',     name: 'Copper Scepter',     slot: 'mainhand', weaponType: 'scepter', baseStats: { flatPhysDamage: 10, spellPower: 10 }, baseDamageMin: 7, baseDamageMax: 13, baseSpellPower: 10, iLvl: 1 },
  { id: 'iron_scepter',       name: 'Iron Scepter',       slot: 'mainhand', weaponType: 'scepter', baseStats: { flatPhysDamage: 18, spellPower: 18 }, baseDamageMin: 12, baseDamageMax: 24, baseSpellPower: 18, iLvl: 10 },
  { id: 'obsidian_scepter',   name: 'Obsidian Scepter',   slot: 'mainhand', weaponType: 'scepter', baseStats: { flatPhysDamage: 28, spellPower: 28 }, baseDamageMin: 20, baseDamageMax: 36, baseSpellPower: 28, iLvl: 20 },
  { id: 'mithril_scepter',    name: 'Mithril Scepter',    slot: 'mainhand', weaponType: 'scepter', baseStats: { flatPhysDamage: 38, spellPower: 38 }, baseDamageMin: 27, baseDamageMax: 49, baseSpellPower: 38, iLvl: 30 },
  { id: 'void_scepter',       name: 'Void Scepter',       slot: 'mainhand', weaponType: 'scepter', baseStats: { flatPhysDamage: 56, spellPower: 56 }, baseDamageMin: 40, baseDamageMax: 72, baseSpellPower: 56, iLvl: 45 },
  { id: 'starforged_scepter', name: 'Starforged Scepter', slot: 'mainhand', weaponType: 'scepter', baseStats: { flatPhysDamage: 76, spellPower: 76 }, baseDamageMin: 56, baseDamageMax: 96, baseSpellPower: 76, iLvl: 60 },

  // ==================== Wands (1H Spell) ====================
  { id: 'twig_wand',        name: 'Twig Wand',        slot: 'mainhand', weaponType: 'wand', baseStats: { spellPower: 12 }, baseSpellPower: 12, iLvl: 1 },
  { id: 'bone_wand',        name: 'Bone Wand',        slot: 'mainhand', weaponType: 'wand', baseStats: { spellPower: 22 }, baseSpellPower: 22, iLvl: 10 },
  { id: 'obsidian_wand',    name: 'Obsidian Wand',    slot: 'mainhand', weaponType: 'wand', baseStats: { spellPower: 36 }, baseSpellPower: 36, iLvl: 20 },
  { id: 'mithril_wand',     name: 'Mithril Wand',     slot: 'mainhand', weaponType: 'wand', baseStats: { spellPower: 50 }, baseSpellPower: 50, iLvl: 30 },
  { id: 'void_wand',        name: 'Void Wand',        slot: 'mainhand', weaponType: 'wand', baseStats: { spellPower: 72 }, baseSpellPower: 72, iLvl: 45 },
  { id: 'starforged_wand',  name: 'Starforged Wand',  slot: 'mainhand', weaponType: 'wand', baseStats: { spellPower: 100 }, baseSpellPower: 100, iLvl: 60 },

  // ==================== Gauntlets (1H Spell, combat caster) ====================
  { id: 'runed_gauntlet',       name: 'Runed Gauntlet',       slot: 'mainhand', weaponType: 'gauntlet', baseStats: { spellPower: 10, armor: 3 }, baseSpellPower: 10, iLvl: 1 },
  { id: 'iron_spell_gauntlet',  name: 'Iron Spell Gauntlet',  slot: 'mainhand', weaponType: 'gauntlet', baseStats: { spellPower: 18, armor: 6 }, baseSpellPower: 18, iLvl: 10 },
  { id: 'obsidian_gauntlet',    name: 'Obsidian Gauntlet',    slot: 'mainhand', weaponType: 'gauntlet', baseStats: { spellPower: 30, armor: 10 }, baseSpellPower: 30, iLvl: 20 },
  { id: 'mithril_gauntlet',     name: 'Mithril Gauntlet',     slot: 'mainhand', weaponType: 'gauntlet', baseStats: { spellPower: 42, armor: 14 }, baseSpellPower: 42, iLvl: 30 },
  { id: 'void_gauntlet',        name: 'Void Gauntlet',        slot: 'mainhand', weaponType: 'gauntlet', baseStats: { spellPower: 60, armor: 20 }, baseSpellPower: 60, iLvl: 45 },
  { id: 'starforged_gauntlet',  name: 'Starforged Gauntlet',  slot: 'mainhand', weaponType: 'gauntlet', baseStats: { spellPower: 84, armor: 26 }, baseSpellPower: 84, iLvl: 60 },

  // ==================== Staves (2H Spell) ====================
  { id: 'gnarled_staff',     name: 'Gnarled Staff',     slot: 'mainhand', weaponType: 'staff', baseStats: { spellPower: 20 }, baseSpellPower: 20, iLvl: 1 },
  { id: 'ironshod_staff',    name: 'Ironshod Staff',    slot: 'mainhand', weaponType: 'staff', baseStats: { spellPower: 36 }, baseSpellPower: 36, iLvl: 10 },
  { id: 'obsidian_staff',    name: 'Obsidian Staff',    slot: 'mainhand', weaponType: 'staff', baseStats: { spellPower: 58 }, baseSpellPower: 58, iLvl: 20 },
  { id: 'mithril_staff',     name: 'Mithril Staff',     slot: 'mainhand', weaponType: 'staff', baseStats: { spellPower: 80 }, baseSpellPower: 80, iLvl: 30 },
  { id: 'void_staff',        name: 'Void Staff',        slot: 'mainhand', weaponType: 'staff', baseStats: { spellPower: 116 }, baseSpellPower: 116, iLvl: 45 },
  { id: 'starforged_staff',  name: 'Starforged Staff',  slot: 'mainhand', weaponType: 'staff', baseStats: { spellPower: 160 }, baseSpellPower: 160, iLvl: 60 },

  // ==================== Tomes (2H Spell, balanced caster) ====================
  { id: 'worn_tome',         name: 'Worn Tome',         slot: 'mainhand', weaponType: 'tome', baseStats: { spellPower: 16, abilityHaste: 3 }, baseSpellPower: 16, iLvl: 1 },
  { id: 'arcane_tome',       name: 'Arcane Tome',       slot: 'mainhand', weaponType: 'tome', baseStats: { spellPower: 30, abilityHaste: 6 }, baseSpellPower: 30, iLvl: 10 },
  { id: 'obsidian_tome',     name: 'Obsidian Tome',     slot: 'mainhand', weaponType: 'tome', baseStats: { spellPower: 48, abilityHaste: 10 }, baseSpellPower: 48, iLvl: 20 },
  { id: 'mithril_tome',      name: 'Mithril Tome',      slot: 'mainhand', weaponType: 'tome', baseStats: { spellPower: 66, abilityHaste: 14 }, baseSpellPower: 66, iLvl: 30 },
  { id: 'void_tome',         name: 'Void Tome',         slot: 'mainhand', weaponType: 'tome', baseStats: { spellPower: 96, abilityHaste: 20 }, baseSpellPower: 96, iLvl: 45 },
  { id: 'starforged_tome',   name: 'Starforged Tome',   slot: 'mainhand', weaponType: 'tome', baseStats: { spellPower: 132, abilityHaste: 26 }, baseSpellPower: 132, iLvl: 60 },

  // ============================================================
  // OFF HAND — Shields, Focus/Orb, Quivers
  // ============================================================

  // -- Shields (armor + blockChance + life) --
  { id: 'wooden_shield',     name: 'Wooden Shield',     slot: 'offhand', offhandType: 'shield', baseStats: { armor: 8, blockChance: 5, maxLife: 5 }, iLvl: 1 },
  { id: 'iron_shield',       name: 'Iron Shield',       slot: 'offhand', offhandType: 'shield', baseStats: { armor: 18, blockChance: 8, maxLife: 10 }, iLvl: 10 },
  { id: 'obsidian_bulwark',  name: 'Obsidian Bulwark',  slot: 'offhand', offhandType: 'shield', baseStats: { armor: 35, blockChance: 10, maxLife: 16 }, iLvl: 20 },
  { id: 'mithril_shield',    name: 'Mithril Shield',    slot: 'offhand', offhandType: 'shield', baseStats: { armor: 50, blockChance: 12, maxLife: 22 }, iLvl: 30 },
  { id: 'runic_bulwark',     name: 'Runic Bulwark',     slot: 'offhand', offhandType: 'shield', baseStats: { armor: 70, blockChance: 14, maxLife: 30 }, iLvl: 40 },
  { id: 'void_aegis',        name: 'Void Aegis',        slot: 'offhand', offhandType: 'shield', baseStats: { armor: 95, blockChance: 16, maxLife: 40 }, iLvl: 50 },
  { id: 'starforged_shield', name: 'Starforged Shield', slot: 'offhand', offhandType: 'shield', baseStats: { armor: 125, blockChance: 18, maxLife: 50 }, iLvl: 60 },

  // -- Focus/Orb (spellPower + life) --
  { id: 'worn_focus',        name: 'Worn Focus',        slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 6, maxLife: 5 }, baseSpellPower: 6, iLvl: 1 },
  { id: 'arcane_focus',      name: 'Arcane Focus',      slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 12, maxLife: 10 }, baseSpellPower: 12, iLvl: 10 },
  { id: 'eldritch_orb',      name: 'Eldritch Orb',      slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 20, maxLife: 15 }, baseSpellPower: 20, iLvl: 20 },
  { id: 'mithril_focus',     name: 'Mithril Focus',     slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 28, maxLife: 20 }, baseSpellPower: 28, iLvl: 30 },
  { id: 'void_orb',          name: 'Void Orb',          slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 40, maxLife: 28 }, baseSpellPower: 40, iLvl: 40 },
  { id: 'astral_codex',      name: 'Astral Codex',      slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 54, maxLife: 36 }, baseSpellPower: 54, iLvl: 50 },
  { id: 'starforged_focus',  name: 'Starforged Focus',  slot: 'offhand', offhandType: 'focus', baseStats: { spellPower: 70, maxLife: 46 }, baseSpellPower: 70, iLvl: 60 },

  // -- Quivers (flatPhysDamage + life) --
  { id: 'leather_quiver',    name: 'Leather Quiver',    slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 3, maxLife: 5 }, iLvl: 1 },
  { id: 'studded_quiver',    name: 'Studded Quiver',    slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 6, maxLife: 10 }, iLvl: 10 },
  { id: 'runed_quiver',      name: 'Runed Quiver',      slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 10, maxLife: 15 }, iLvl: 20 },
  { id: 'mithril_quiver',    name: 'Mithril Quiver',    slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 14, maxLife: 20 }, iLvl: 30 },
  { id: 'void_quiver',       name: 'Void Quiver',       slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 20, maxLife: 28 }, iLvl: 40 },
  { id: 'astral_quiver',     name: 'Astral Quiver',     slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 28, maxLife: 36 }, iLvl: 50 },
  { id: 'starforged_quiver', name: 'Starforged Quiver', slot: 'offhand', offhandType: 'quiver', baseStats: { flatPhysDamage: 38, maxLife: 46 }, iLvl: 60 },

  // ============================================================
  // ARMOR — stat key migration: life → maxLife, dodgeChance → evasion (×10), critDamage → critMultiplier, damage → flatPhysDamage
  // All IDs preserved for crafting recipe compatibility.
  // ============================================================

  // ==================== Helmet ====================
  // -- Plate --
  { id: 'iron_helm', name: 'Iron Helm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 9 }, iLvl: 1 },
  { id: 'steel_greathelm', name: 'Steel Greathelm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 22 }, iLvl: 10 },
  { id: 'obsidian_faceplate', name: 'Obsidian Faceplate', slot: 'helmet', armorType: 'plate', baseStats: { armor: 38 }, iLvl: 20 },
  { id: 'mithril_helm', name: 'Mithril Helm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 52 }, iLvl: 30 },
  { id: 'runic_greathelm', name: 'Runic Greathelm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 70 }, iLvl: 40 },
  { id: 'void_faceplate', name: 'Void Faceplate', slot: 'helmet', armorType: 'plate', baseStats: { armor: 92 }, iLvl: 50 },
  { id: 'starforged_helm', name: 'Starforged Helm', slot: 'helmet', armorType: 'plate', baseStats: { armor: 118 }, iLvl: 60 },
  // -- Leather --
  { id: 'rawhide_cap', name: 'Rawhide Cap', slot: 'helmet', armorType: 'leather', baseStats: { armor: 2, evasion: 30 }, iLvl: 1 },
  { id: 'studded_headband', name: 'Studded Headband', slot: 'helmet', armorType: 'leather', baseStats: { armor: 6, evasion: 50 }, iLvl: 10 },
  { id: 'nightstalker_hood', name: 'Nightstalker Hood', slot: 'helmet', armorType: 'leather', baseStats: { armor: 10, evasion: 70 }, iLvl: 20 },
  { id: 'mithril_headband', name: 'Mithril Headband', slot: 'helmet', armorType: 'leather', baseStats: { armor: 14, evasion: 90 }, iLvl: 30 },
  { id: 'runic_hood', name: 'Runic Hood', slot: 'helmet', armorType: 'leather', baseStats: { armor: 20, evasion: 120 }, iLvl: 40 },
  { id: 'void_hood', name: 'Void Hood', slot: 'helmet', armorType: 'leather', baseStats: { armor: 26, evasion: 150 }, iLvl: 50 },
  { id: 'starforged_headband', name: 'Starforged Headband', slot: 'helmet', armorType: 'leather', baseStats: { armor: 34, evasion: 190 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_hood', name: 'Linen Hood', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 1, abilityHaste: 2, energyShield: 20, esRecharge: 2 }, iLvl: 1 },
  { id: 'silk_circlet', name: 'Silk Circlet', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 3, abilityHaste: 5, energyShield: 35, esRecharge: 3 }, iLvl: 10 },
  { id: 'arcane_crown', name: 'Arcane Crown', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 5, abilityHaste: 8, energyShield: 55, esRecharge: 4 }, iLvl: 20 },
  { id: 'mithril_circlet', name: 'Mithril Circlet', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 7, abilityHaste: 11, energyShield: 80, esRecharge: 5 }, iLvl: 30 },
  { id: 'runic_crown', name: 'Runic Crown', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 10, abilityHaste: 15, energyShield: 110, esRecharge: 6 }, iLvl: 40 },
  { id: 'void_circlet', name: 'Void Circlet', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 14, abilityHaste: 20, energyShield: 145, esRecharge: 7 }, iLvl: 50 },
  { id: 'starforged_crown', name: 'Starforged Crown', slot: 'helmet', armorType: 'cloth', baseStats: { armor: 18, abilityHaste: 26, energyShield: 185, esRecharge: 8 }, iLvl: 60 },

  // ==================== Neck ====================
  { id: 'bone_charm', name: 'Bone Charm', slot: 'neck', baseStats: { maxLife: 8 }, iLvl: 1 },
  { id: 'jade_amulet', name: 'Jade Amulet', slot: 'neck', baseStats: { maxLife: 15, flatPhysDamage: 3 }, iLvl: 10 },
  { id: 'onyx_pendant', name: 'Onyx Pendant', slot: 'neck', baseStats: { maxLife: 22, critChance: 3 }, iLvl: 20 },
  { id: 'ruby_amulet', name: 'Ruby Amulet', slot: 'neck', baseStats: { maxLife: 30, flatPhysDamage: 5 }, iLvl: 30 },
  { id: 'void_pendant', name: 'Void Pendant', slot: 'neck', baseStats: { maxLife: 40, critChance: 5 }, iLvl: 40 },
  { id: 'astral_choker', name: 'Astral Choker', slot: 'neck', baseStats: { maxLife: 52, critMultiplier: 15 }, iLvl: 50 },
  { id: 'starforged_amulet', name: 'Starforged Amulet', slot: 'neck', baseStats: { maxLife: 65, flatPhysDamage: 10, critChance: 5 }, iLvl: 60 },

  // ==================== Shoulders ====================
  // -- Plate --
  { id: 'iron_pauldrons', name: 'Iron Pauldrons', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 8 }, iLvl: 1 },
  { id: 'steel_shoulderguards', name: 'Steel Shoulderguards', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 18 }, iLvl: 10 },
  { id: 'obsidian_mantle', name: 'Obsidian Mantle', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 32 }, iLvl: 20 },
  { id: 'mithril_pauldrons', name: 'Mithril Pauldrons', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 44 }, iLvl: 30 },
  { id: 'runic_shoulderguards', name: 'Runic Shoulderguards', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 60 }, iLvl: 40 },
  { id: 'void_mantle', name: 'Void Mantle', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 78 }, iLvl: 50 },
  { id: 'starforged_pauldrons', name: 'Starforged Pauldrons', slot: 'shoulders', armorType: 'plate', baseStats: { armor: 100 }, iLvl: 60 },
  // -- Leather --
  { id: 'hide_shoulderpads', name: 'Hide Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 2, evasion: 30 }, iLvl: 1 },
  { id: 'studded_shoulderguards', name: 'Studded Shoulderguards', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 5, evasion: 40 }, iLvl: 10 },
  { id: 'nightstalker_shoulders', name: 'Nightstalker Shoulders', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 8, evasion: 60 }, iLvl: 20 },
  { id: 'mithril_shoulderpads', name: 'Mithril Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 12, evasion: 80 }, iLvl: 30 },
  { id: 'runic_shoulderpads', name: 'Runic Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 16, evasion: 100 }, iLvl: 40 },
  { id: 'void_shoulderpads', name: 'Void Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 22, evasion: 130 }, iLvl: 50 },
  { id: 'starforged_shoulderpads', name: 'Starforged Shoulderpads', slot: 'shoulders', armorType: 'leather', baseStats: { armor: 28, evasion: 160 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_shawl', name: 'Linen Shawl', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 1, abilityHaste: 2, energyShield: 15 }, iLvl: 1 },
  { id: 'silk_epaulets', name: 'Silk Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 3, abilityHaste: 4, energyShield: 30 }, iLvl: 10 },
  { id: 'arcane_mantle', name: 'Arcane Mantle', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 5, abilityHaste: 7, energyShield: 50 }, iLvl: 20 },
  { id: 'mithril_epaulets', name: 'Mithril Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 7, abilityHaste: 10, energyShield: 70 }, iLvl: 30 },
  { id: 'runic_epaulets', name: 'Runic Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 10, abilityHaste: 13, energyShield: 95 }, iLvl: 40 },
  { id: 'void_epaulets', name: 'Void Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 13, abilityHaste: 17, energyShield: 125 }, iLvl: 50 },
  { id: 'starforged_epaulets', name: 'Starforged Epaulets', slot: 'shoulders', armorType: 'cloth', baseStats: { armor: 17, abilityHaste: 22, energyShield: 160 }, iLvl: 60 },

  // ==================== Cloak ====================
  { id: 'tattered_cloak', name: 'Tattered Cloak', slot: 'cloak', baseStats: { armor: 2, evasion: 10 }, iLvl: 1 },
  { id: 'travelers_cloak', name: "Traveler's Cloak", slot: 'cloak', baseStats: { armor: 6, evasion: 20 }, iLvl: 10 },
  { id: 'shadowweave_cloak', name: 'Shadowweave Cloak', slot: 'cloak', baseStats: { armor: 10, evasion: 40 }, iLvl: 20 },
  { id: 'mithril_cloak', name: 'Mithril Cloak', slot: 'cloak', baseStats: { armor: 15, evasion: 50 }, iLvl: 30 },
  { id: 'runic_mantle', name: 'Runic Mantle', slot: 'cloak', baseStats: { armor: 22, evasion: 70 }, iLvl: 40 },
  { id: 'void_shroud', name: 'Void Shroud', slot: 'cloak', baseStats: { armor: 30, evasion: 90 }, iLvl: 50 },
  { id: 'starforged_cloak', name: 'Starforged Cloak', slot: 'cloak', baseStats: { armor: 40, evasion: 120 }, iLvl: 60 },

  // ==================== Chest ====================
  // -- Plate --
  { id: 'iron_breastplate', name: 'Iron Breastplate', slot: 'chest', armorType: 'plate', baseStats: { armor: 12 }, iLvl: 1 },
  { id: 'steel_cuirass', name: 'Steel Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 28 }, iLvl: 10 },
  { id: 'plate_cuirass', name: 'Plate Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 45, maxLife: 15 }, iLvl: 20 },
  { id: 'mithril_cuirass', name: 'Mithril Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 62, maxLife: 20 }, iLvl: 30 },
  { id: 'runic_breastplate', name: 'Runic Breastplate', slot: 'chest', armorType: 'plate', baseStats: { armor: 84, maxLife: 28 }, iLvl: 40 },
  { id: 'void_cuirass', name: 'Void Cuirass', slot: 'chest', armorType: 'plate', baseStats: { armor: 110, maxLife: 36 }, iLvl: 50 },
  { id: 'starforged_breastplate', name: 'Starforged Breastplate', slot: 'chest', armorType: 'plate', baseStats: { armor: 140, maxLife: 46 }, iLvl: 60 },
  // -- Leather --
  { id: 'rawhide_tunic', name: 'Rawhide Tunic', slot: 'chest', armorType: 'leather', baseStats: { armor: 3, evasion: 40 }, iLvl: 1 },
  { id: 'studded_jerkin', name: 'Studded Jerkin', slot: 'chest', armorType: 'leather', baseStats: { armor: 8, evasion: 60 }, iLvl: 10 },
  { id: 'nightstalker_vest', name: 'Nightstalker Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 13, evasion: 90 }, iLvl: 20 },
  { id: 'mithril_vest', name: 'Mithril Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 18, evasion: 110 }, iLvl: 30 },
  { id: 'runic_vest', name: 'Runic Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 24, evasion: 140 }, iLvl: 40 },
  { id: 'void_vest', name: 'Void Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 32, evasion: 180 }, iLvl: 50 },
  { id: 'starforged_vest', name: 'Starforged Vest', slot: 'chest', armorType: 'leather', baseStats: { armor: 42, evasion: 220 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_robe', name: 'Linen Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 10, maxLife: 5, energyShield: 25, esRecharge: 3 }, iLvl: 1 },
  { id: 'silk_robe', name: 'Silk Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 4, abilityHaste: 6, energyShield: 45, esRecharge: 4 }, iLvl: 10 },
  { id: 'arcane_vestment', name: 'Arcane Vestment', slot: 'chest', armorType: 'cloth', baseStats: { armor: 7, abilityHaste: 10, energyShield: 70, esRecharge: 5 }, iLvl: 20 },
  { id: 'mithril_robe', name: 'Mithril Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 10, abilityHaste: 13, energyShield: 100, esRecharge: 6 }, iLvl: 30 },
  { id: 'runic_vestment', name: 'Runic Vestment', slot: 'chest', armorType: 'cloth', baseStats: { armor: 14, abilityHaste: 18, energyShield: 135, esRecharge: 7 }, iLvl: 40 },
  { id: 'void_robe', name: 'Void Robe', slot: 'chest', armorType: 'cloth', baseStats: { armor: 18, abilityHaste: 24, energyShield: 175, esRecharge: 8 }, iLvl: 50 },
  { id: 'starforged_vestment', name: 'Starforged Vestment', slot: 'chest', armorType: 'cloth', baseStats: { armor: 24, abilityHaste: 30, energyShield: 220, esRecharge: 10 }, iLvl: 60 },

  // ==================== Bracers ====================
  { id: 'wrapped_bracers', name: 'Wrapped Bracers', slot: 'bracers', baseStats: { armor: 4, maxLife: 3 }, iLvl: 1 },
  { id: 'fortified_bracers', name: 'Fortified Bracers', slot: 'bracers', baseStats: { armor: 10, maxLife: 8 }, iLvl: 10 },
  { id: 'runed_bracers', name: 'Runed Bracers', slot: 'bracers', baseStats: { armor: 18, maxLife: 12 }, iLvl: 20 },
  { id: 'mithril_bracers', name: 'Mithril Bracers', slot: 'bracers', baseStats: { armor: 26, maxLife: 16 }, iLvl: 30 },
  { id: 'runic_vambraces', name: 'Runic Vambraces', slot: 'bracers', baseStats: { armor: 36, maxLife: 22 }, iLvl: 40 },
  { id: 'void_bracers', name: 'Void Bracers', slot: 'bracers', baseStats: { armor: 48, maxLife: 28 }, iLvl: 50 },
  { id: 'starforged_bracers', name: 'Starforged Bracers', slot: 'bracers', baseStats: { armor: 62, maxLife: 36 }, iLvl: 60 },

  // ==================== Gloves ====================
  // -- Plate --
  { id: 'iron_gauntlets', name: 'Iron Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 6 }, iLvl: 1 },
  { id: 'steel_gauntlets', name: 'Steel Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 14 }, iLvl: 10 },
  { id: 'obsidian_gauntlets', name: 'Obsidian Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 24 }, iLvl: 20 },
  { id: 'mithril_gauntlets', name: 'Mithril Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 33 }, iLvl: 30 },
  { id: 'runic_gauntlets', name: 'Runic Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 44 }, iLvl: 40 },
  { id: 'void_gauntlets', name: 'Void Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 58 }, iLvl: 50 },
  { id: 'starforged_gauntlets', name: 'Starforged Gauntlets', slot: 'gloves', armorType: 'plate', baseStats: { armor: 74 }, iLvl: 60 },
  // -- Leather --
  { id: 'hide_gloves', name: 'Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 2, evasion: 20 }, iLvl: 1 },
  { id: 'studded_gloves', name: 'Studded Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 4, evasion: 30 }, iLvl: 10 },
  { id: 'nightstalker_gloves', name: 'Nightstalker Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 6, evasion: 50 }, iLvl: 20 },
  { id: 'mithril_hide_gloves', name: 'Mithril Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 9, evasion: 70 }, iLvl: 30 },
  { id: 'runic_hide_gloves', name: 'Runic Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 12, evasion: 90 }, iLvl: 40 },
  { id: 'void_hide_gloves', name: 'Void Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 16, evasion: 120 }, iLvl: 50 },
  { id: 'starforged_hide_gloves', name: 'Starforged Hide Gloves', slot: 'gloves', armorType: 'leather', baseStats: { armor: 22, evasion: 150 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_gloves', name: 'Linen Gloves', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 1, abilityHaste: 1, energyShield: 10 }, iLvl: 1 },
  { id: 'silk_gloves', name: 'Silk Gloves', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 2, abilityHaste: 3, energyShield: 20 }, iLvl: 10 },
  { id: 'arcane_handwraps', name: 'Arcane Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 4, abilityHaste: 5, energyShield: 35 }, iLvl: 20 },
  { id: 'mithril_handwraps', name: 'Mithril Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 6, abilityHaste: 7, energyShield: 50 }, iLvl: 30 },
  { id: 'runic_handwraps', name: 'Runic Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 8, abilityHaste: 10, energyShield: 70 }, iLvl: 40 },
  { id: 'void_handwraps', name: 'Void Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 11, abilityHaste: 13, energyShield: 95 }, iLvl: 50 },
  { id: 'starforged_handwraps', name: 'Starforged Handwraps', slot: 'gloves', armorType: 'cloth', baseStats: { armor: 14, abilityHaste: 17, energyShield: 120 }, iLvl: 60 },

  // ==================== Belt ====================
  { id: 'rope_belt', name: 'Rope Belt', slot: 'belt', baseStats: { armor: 3, maxLife: 5 }, iLvl: 1 },
  { id: 'studded_belt', name: 'Studded Belt', slot: 'belt', baseStats: { armor: 8, maxLife: 12 }, iLvl: 10 },
  { id: 'runed_girdle', name: 'Runed Girdle', slot: 'belt', baseStats: { armor: 14, maxLife: 18 }, iLvl: 20 },
  { id: 'mithril_belt', name: 'Mithril Belt', slot: 'belt', baseStats: { armor: 20, maxLife: 25 }, iLvl: 30 },
  { id: 'runic_girdle', name: 'Runic Girdle', slot: 'belt', baseStats: { armor: 28, maxLife: 34 }, iLvl: 40 },
  { id: 'void_belt', name: 'Void Belt', slot: 'belt', baseStats: { armor: 38, maxLife: 44 }, iLvl: 50 },
  { id: 'starforged_belt', name: 'Starforged Belt', slot: 'belt', baseStats: { armor: 50, maxLife: 56 }, iLvl: 60 },

  // ==================== Pants ====================
  // -- Plate --
  { id: 'iron_legguards', name: 'Iron Legguards', slot: 'pants', armorType: 'plate', baseStats: { armor: 10 }, iLvl: 1 },
  { id: 'steel_legplates', name: 'Steel Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 24 }, iLvl: 10 },
  { id: 'obsidian_greaves', name: 'Obsidian Greaves', slot: 'pants', armorType: 'plate', baseStats: { armor: 42 }, iLvl: 20 },
  { id: 'mithril_legplates', name: 'Mithril Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 58 }, iLvl: 30 },
  { id: 'runic_legplates', name: 'Runic Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 78 }, iLvl: 40 },
  { id: 'void_legplates', name: 'Void Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 102 }, iLvl: 50 },
  { id: 'starforged_legplates', name: 'Starforged Legplates', slot: 'pants', armorType: 'plate', baseStats: { armor: 130 }, iLvl: 60 },
  // -- Leather --
  { id: 'rawhide_pants', name: 'Rawhide Pants', slot: 'pants', armorType: 'leather', baseStats: { armor: 3, evasion: 30 }, iLvl: 1 },
  { id: 'studded_leggings', name: 'Studded Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 7, evasion: 50 }, iLvl: 10 },
  { id: 'nightstalker_pants', name: 'Nightstalker Pants', slot: 'pants', armorType: 'leather', baseStats: { armor: 11, evasion: 80 }, iLvl: 20 },
  { id: 'mithril_leggings', name: 'Mithril Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 16, evasion: 100 }, iLvl: 30 },
  { id: 'runic_leggings', name: 'Runic Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 22, evasion: 130 }, iLvl: 40 },
  { id: 'void_leggings', name: 'Void Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 30, evasion: 160 }, iLvl: 50 },
  { id: 'starforged_leggings', name: 'Starforged Leggings', slot: 'pants', armorType: 'leather', baseStats: { armor: 38, evasion: 200 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_trousers', name: 'Linen Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 2, abilityHaste: 3, energyShield: 15 }, iLvl: 1 },
  { id: 'silk_pants', name: 'Silk Pants', slot: 'pants', armorType: 'cloth', baseStats: { armor: 4, abilityHaste: 5, energyShield: 30 }, iLvl: 10 },
  { id: 'arcane_leggings', name: 'Arcane Leggings', slot: 'pants', armorType: 'cloth', baseStats: { armor: 6, abilityHaste: 9, energyShield: 50 }, iLvl: 20 },
  { id: 'mithril_trousers', name: 'Mithril Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 9, abilityHaste: 12, energyShield: 70 }, iLvl: 30 },
  { id: 'runic_trousers', name: 'Runic Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 12, abilityHaste: 16, energyShield: 95 }, iLvl: 40 },
  { id: 'void_trousers', name: 'Void Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 16, abilityHaste: 21, energyShield: 125 }, iLvl: 50 },
  { id: 'starforged_trousers', name: 'Starforged Trousers', slot: 'pants', armorType: 'cloth', baseStats: { armor: 20, abilityHaste: 27, energyShield: 160 }, iLvl: 60 },

  // ==================== Boots ====================
  // -- Plate --
  { id: 'iron_sabatons', name: 'Iron Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 8, evasion: 10 }, iLvl: 1 },
  { id: 'plated_greaves', name: 'Plated Greaves', slot: 'boots', armorType: 'plate', baseStats: { armor: 15, evasion: 20 }, iLvl: 10 },
  { id: 'obsidian_sabatons', name: 'Obsidian Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 28, evasion: 20 }, iLvl: 20 },
  { id: 'mithril_sabatons', name: 'Mithril Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 38, evasion: 30 }, iLvl: 30 },
  { id: 'runic_sabatons', name: 'Runic Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 52, evasion: 40 }, iLvl: 40 },
  { id: 'void_sabatons', name: 'Void Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 68, evasion: 50 }, iLvl: 50 },
  { id: 'starforged_sabatons', name: 'Starforged Sabatons', slot: 'boots', armorType: 'plate', baseStats: { armor: 88, evasion: 60 }, iLvl: 60 },
  // -- Leather --
  { id: 'leather_boots', name: 'Leather Boots', slot: 'boots', armorType: 'leather', baseStats: { armor: 5, evasion: 30 }, iLvl: 1 },
  { id: 'studded_boots', name: 'Studded Boots', slot: 'boots', armorType: 'leather', baseStats: { armor: 5, evasion: 50 }, iLvl: 10 },
  { id: 'nightstalker_boots', name: 'Nightstalker Boots', slot: 'boots', armorType: 'leather', baseStats: { armor: 8, evasion: 70 }, iLvl: 20 },
  { id: 'mithril_treads', name: 'Mithril Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 12, evasion: 90 }, iLvl: 30 },
  { id: 'runic_treads_leather', name: 'Runic Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 16, evasion: 120 }, iLvl: 40 },
  { id: 'void_treads', name: 'Void Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 22, evasion: 150 }, iLvl: 50 },
  { id: 'starforged_treads', name: 'Starforged Treads', slot: 'boots', armorType: 'leather', baseStats: { armor: 28, evasion: 180 }, iLvl: 60 },
  // -- Cloth --
  { id: 'linen_sandals', name: 'Linen Sandals', slot: 'boots', armorType: 'cloth', baseStats: { armor: 1, evasion: 10, abilityHaste: 2, energyShield: 10 }, iLvl: 1 },
  { id: 'silk_slippers', name: 'Silk Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 3, evasion: 20, abilityHaste: 4, energyShield: 20 }, iLvl: 10 },
  { id: 'runic_treads', name: 'Runic Treads', slot: 'boots', armorType: 'cloth', baseStats: { armor: 8, evasion: 50, energyShield: 35 }, iLvl: 20 },
  { id: 'mithril_slippers', name: 'Mithril Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 5, evasion: 30, abilityHaste: 6, energyShield: 50 }, iLvl: 30 },
  { id: 'runic_slippers', name: 'Runic Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 7, evasion: 40, abilityHaste: 8, energyShield: 70 }, iLvl: 40 },
  { id: 'void_slippers', name: 'Void Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 10, evasion: 50, abilityHaste: 11, energyShield: 95 }, iLvl: 50 },
  { id: 'starforged_slippers', name: 'Starforged Slippers', slot: 'boots', armorType: 'cloth', baseStats: { armor: 13, evasion: 60, abilityHaste: 14, energyShield: 120 }, iLvl: 60 },

  // ==================== Rings ====================
  { id: 'copper_band', name: 'Copper Band', slot: 'ring1', baseStats: { maxLife: 5 }, iLvl: 1 },
  { id: 'silver_ring', name: 'Silver Ring', slot: 'ring1', baseStats: { maxLife: 10, critChance: 2 }, iLvl: 10 },
  { id: 'gold_signet', name: 'Gold Signet', slot: 'ring1', baseStats: { maxLife: 15, critMultiplier: 10 }, iLvl: 20 },
  { id: 'ruby_ring', name: 'Ruby Ring', slot: 'ring1', baseStats: { maxLife: 20, critChance: 4 }, iLvl: 30 },
  { id: 'void_band', name: 'Void Band', slot: 'ring1', baseStats: { maxLife: 28, critMultiplier: 18 }, iLvl: 40 },
  { id: 'astral_ring', name: 'Astral Ring', slot: 'ring1', baseStats: { maxLife: 36, critChance: 6 }, iLvl: 50 },
  { id: 'starforged_signet', name: 'Starforged Signet', slot: 'ring1', baseStats: { maxLife: 45, critMultiplier: 25 }, iLvl: 60 },

  // ==================== Trinkets ====================
  { id: 'cracked_gem', name: 'Cracked Gem', slot: 'trinket1', baseStats: { flatPhysDamage: 3 }, iLvl: 1 },
  { id: 'polished_stone', name: 'Polished Stone', slot: 'trinket1', baseStats: { flatPhysDamage: 5, critChance: 2 }, iLvl: 10 },
  { id: 'prismatic_shard', name: 'Prismatic Shard', slot: 'trinket1', baseStats: { flatPhysDamage: 8, critMultiplier: 15 }, iLvl: 20 },
  { id: 'infused_crystal', name: 'Infused Crystal', slot: 'trinket1', baseStats: { flatPhysDamage: 12, critChance: 4 }, iLvl: 30 },
  { id: 'void_shard', name: 'Void Shard', slot: 'trinket1', baseStats: { flatPhysDamage: 18, critMultiplier: 20 }, iLvl: 40 },
  { id: 'astral_prism', name: 'Astral Prism', slot: 'trinket1', baseStats: { flatPhysDamage: 25, critChance: 6 }, iLvl: 50 },
  { id: 'starforged_gem', name: 'Starforged Gem', slot: 'trinket1', baseStats: { flatPhysDamage: 35, critMultiplier: 30 }, iLvl: 60 },
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
  { id: 'exalt', name: 'Exalt Shard', description: 'Add one high-tier affix (top 3 tiers for item level)', icon: '\uD83D\uDFE3', rarity: 'rare' },
  { id: 'greater_exalt', name: 'Greater Exalt', description: 'Add one affix from the top 2 tiers for item level', icon: '\uD83D\uDFE1', rarity: 'epic' },
  { id: 'perfect_exalt', name: 'Perfect Exalt', description: 'Add one affix at the best tier for item level', icon: '\u2B50', rarity: 'legendary' },
  { id: 'socket', name: 'Socket Shard', description: 'Socket crafting (coming soon)', icon: '\uD83D\uDD35', rarity: 'rare' },
];

// ============================================================
// Idle Exile — Profession Gear Item Base Definitions
// 42 bases: 7 slots × 6 tiers. No combat stats.
// Tool bases use weaponType: 'tool'.
// ============================================================

import type { ItemBaseDef } from '../types';

export const PROFESSION_BASE_DEFS: ItemBaseDef[] = [
  // ==================== Helmet (6 tiers) ====================
  { id: 'prof_helmet_t1', name: "Apprentice's Cap",       slot: 'helmet',    baseStats: {}, iLvl: 5 },
  { id: 'prof_helmet_t2', name: "Journeyman's Hood",      slot: 'helmet',    baseStats: {}, iLvl: 15 },
  { id: 'prof_helmet_t3', name: "Artisan's Goggles",      slot: 'helmet',    baseStats: {}, iLvl: 25 },
  { id: 'prof_helmet_t4', name: "Expert's Visor",         slot: 'helmet',    baseStats: {}, iLvl: 35 },
  { id: 'prof_helmet_t5', name: "Master's Circlet",       slot: 'helmet',    baseStats: {}, iLvl: 45 },
  { id: 'prof_helmet_t6', name: "Grandmaster's Crown",    slot: 'helmet',    baseStats: {}, iLvl: 55 },

  // ==================== Shoulders (6 tiers) ====================
  { id: 'prof_shoulders_t1', name: 'Padded Shawl',              slot: 'shoulders', baseStats: {}, iLvl: 5 },
  { id: 'prof_shoulders_t2', name: 'Leather Mantle',            slot: 'shoulders', baseStats: {}, iLvl: 15 },
  { id: 'prof_shoulders_t3', name: "Artisan's Pauldrons",       slot: 'shoulders', baseStats: {}, iLvl: 25 },
  { id: 'prof_shoulders_t4', name: "Expert's Epaulets",         slot: 'shoulders', baseStats: {}, iLvl: 35 },
  { id: 'prof_shoulders_t5', name: "Master's Shoulderguard",    slot: 'shoulders', baseStats: {}, iLvl: 45 },
  { id: 'prof_shoulders_t6', name: "Grandmaster's Mantle",      slot: 'shoulders', baseStats: {}, iLvl: 55 },

  // ==================== Chest (6 tiers) ====================
  { id: 'prof_chest_t1', name: 'Work Apron',              slot: 'chest',     baseStats: {}, iLvl: 5 },
  { id: 'prof_chest_t2', name: 'Sturdy Smock',            slot: 'chest',     baseStats: {}, iLvl: 15 },
  { id: 'prof_chest_t3', name: "Artisan's Vest",          slot: 'chest',     baseStats: {}, iLvl: 25 },
  { id: 'prof_chest_t4', name: "Expert's Hauberk",        slot: 'chest',     baseStats: {}, iLvl: 35 },
  { id: 'prof_chest_t5', name: "Master's Vestments",      slot: 'chest',     baseStats: {}, iLvl: 45 },
  { id: 'prof_chest_t6', name: "Grandmaster's Regalia",   slot: 'chest',     baseStats: {}, iLvl: 55 },

  // ==================== Gloves (6 tiers) ====================
  { id: 'prof_gloves_t1', name: 'Cloth Mitts',            slot: 'gloves',    baseStats: {}, iLvl: 5 },
  { id: 'prof_gloves_t2', name: 'Leather Grips',          slot: 'gloves',    baseStats: {}, iLvl: 15 },
  { id: 'prof_gloves_t3', name: "Artisan's Gauntlets",    slot: 'gloves',    baseStats: {}, iLvl: 25 },
  { id: 'prof_gloves_t4', name: "Expert's Handwraps",     slot: 'gloves',    baseStats: {}, iLvl: 35 },
  { id: 'prof_gloves_t5', name: "Master's Gloves",        slot: 'gloves',    baseStats: {}, iLvl: 45 },
  { id: 'prof_gloves_t6', name: "Grandmaster's Touch",    slot: 'gloves',    baseStats: {}, iLvl: 55 },

  // ==================== Pants (6 tiers) ====================
  { id: 'prof_pants_t1', name: 'Rough Trousers',          slot: 'pants',     baseStats: {}, iLvl: 5 },
  { id: 'prof_pants_t2', name: 'Padded Leggings',         slot: 'pants',     baseStats: {}, iLvl: 15 },
  { id: 'prof_pants_t3', name: "Artisan's Breeches",      slot: 'pants',     baseStats: {}, iLvl: 25 },
  { id: 'prof_pants_t4', name: "Expert's Greaves",        slot: 'pants',     baseStats: {}, iLvl: 35 },
  { id: 'prof_pants_t5', name: "Master's Legguards",      slot: 'pants',     baseStats: {}, iLvl: 45 },
  { id: 'prof_pants_t6', name: "Grandmaster's Chaps",     slot: 'pants',     baseStats: {}, iLvl: 55 },

  // ==================== Boots (6 tiers) ====================
  { id: 'prof_boots_t1', name: 'Simple Sandals',          slot: 'boots',     baseStats: {}, iLvl: 5 },
  { id: 'prof_boots_t2', name: 'Sturdy Boots',            slot: 'boots',     baseStats: {}, iLvl: 15 },
  { id: 'prof_boots_t3', name: "Artisan's Treads",        slot: 'boots',     baseStats: {}, iLvl: 25 },
  { id: 'prof_boots_t4', name: "Expert's Sabatons",       slot: 'boots',     baseStats: {}, iLvl: 35 },
  { id: 'prof_boots_t5', name: "Master's Striders",       slot: 'boots',     baseStats: {}, iLvl: 45 },
  { id: 'prof_boots_t6', name: "Grandmaster's Steps",     slot: 'boots',     baseStats: {}, iLvl: 55 },

  // ==================== Tool / Mainhand (6 tiers) ====================
  { id: 'prof_tool_t1', name: 'Crude Pickaxe',            slot: 'mainhand',  weaponType: 'tool', baseStats: {}, iLvl: 5 },
  { id: 'prof_tool_t2', name: 'Iron Sickle',              slot: 'mainhand',  weaponType: 'tool', baseStats: {}, iLvl: 15 },
  { id: 'prof_tool_t3', name: 'Steel Hatchet',            slot: 'mainhand',  weaponType: 'tool', baseStats: {}, iLvl: 25 },
  { id: 'prof_tool_t4', name: 'Mithril Tongs',            slot: 'mainhand',  weaponType: 'tool', baseStats: {}, iLvl: 35 },
  { id: 'prof_tool_t5', name: 'Titanium Auger',           slot: 'mainhand',  weaponType: 'tool', baseStats: {}, iLvl: 45 },
  { id: 'prof_tool_t6', name: 'Dragonbone Chisel',        slot: 'mainhand',  weaponType: 'tool', baseStats: {}, iLvl: 55 },
];

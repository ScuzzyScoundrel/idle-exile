// ============================================================
// Crafting — gathering, refinement, crafting professions, patterns
// ============================================================

import type { AffixCategory, Rarity } from './items';

// --- Gathering Professions ---

export type GatheringProfession = 'mining' | 'herbalism' | 'skinning' | 'logging' | 'fishing';

export interface GatheringSkillState { level: number; xp: number; }
export type GatheringSkills = Record<GatheringProfession, GatheringSkillState>;

export interface GatheringMilestone {
  level: number;
  type: 'yield_bonus' | 'rare_find' | 'double_gather' | 'mastery';
  value: number;
  description: string;
}

// --- Rare Materials ---

export type RareMaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RareMaterialDef {
  id: string;
  profession: GatheringProfession;
  rarity: RareMaterialRarity;
  name: string;
  icon: string;
  description: string;
}

// --- Refinement ---

export type RefinementTrack = 'ore' | 'cloth' | 'leather' | 'wood' | 'herb' | 'fish';

export interface RefinementRecipeDef {
  id: string;
  track: RefinementTrack;
  tier: number;                     // 1-6
  rawMaterialId: string;
  rawAmount: number;
  previousRefinedId: string | null; // null for T1
  previousRefinedAmount: number;
  outputId: string;
  outputName: string;
  goldCost: number;
}

// --- Crafting Professions ---

export type CraftingProfession = 'weaponsmith' | 'armorer' | 'leatherworker' | 'tailor' | 'alchemist' | 'jeweler';

export interface CraftingSkillState { level: number; xp: number; }
export type CraftingSkills = Record<CraftingProfession, CraftingSkillState>;

export interface CraftingRecipeDef {
  id: string;
  profession: CraftingProfession;
  name: string;
  tier: number;                     // 1-6
  requiredLevel: number;
  materials: { materialId: string; amount: number }[];
  goldCost: number;
  outputBaseId: string;             // references ITEM_BASE_DEFS id
  outputILvl: number;
  outputMaterialId?: string;        // for recipes that produce materials (e.g. catalysts)
  isGatheringGear?: boolean;
  isProfessionGear?: boolean;
  catalystSlot?: boolean;           // true = recipe accepts an optional catalyst
  requiredCatalyst?: {              // for unique recipes that REQUIRE a specific rare mat
    rareMaterialId: string;
    amount: number;
  };
}

export interface CraftingMilestone {
  level: number;
  type: 'efficiency' | 'bonus_output' | 'quality_boost' | 'mastery' | 'pattern_bonus';
  value: number;
  description: string;
}

// --- Crafting Patterns ---

export type PatternSource = 'zone_drop' | 'boss_drop' | 'invasion_drop' | 'unique_drop';

export interface CraftingPatternDef {
  id: string;
  name: string;
  description: string;
  band: number;                         // 1-3 for MVP
  profession: CraftingProfession;
  outputBaseId: string;                 // what item base it creates
  outputILvl: number;
  guaranteedAffixes: AffixCategory[];   // 1-2 guaranteed affix categories
  minRarity: Rarity;                    // minimum output rarity
  maxCharges: number;                   // base charges when found
  source: PatternSource;
  materialCostMult: number;             // 1.0 = same as normal recipe, 1.5 = 50% more
  xpMult: number;                       // 2.0 = double XP
  uniqueDefId?: string;                 // links to UniqueItemDef for unique patterns
}

export interface UniqueItemDef {
  id: string;
  name: string;
  lore: string;
  baseItemId: string;                   // e.g. 'crude_dagger'
  bossZoneId: string;                   // which zone's boss drops this
  band: number;
  uniqueAffix: {
    slot: 'prefix' | 'suffix';
    displayText: string;
    stats: Partial<Record<import('./stats').StatKey, number>>;
  };
  craftCost: {
    trophyId: string;
    trophyAmount: number;
    materials: { materialId: string; amount: number }[];
    rareMaterialId?: string;
    rareMaterialAmount?: number;
    goldCost: number;
  };
  profession: import('./crafting').CraftingProfession;
}

export interface OwnedPattern {
  defId: string;
  charges: number;
  discoveredAt: number;
}

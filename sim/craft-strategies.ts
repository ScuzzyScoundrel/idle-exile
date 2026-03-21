// ============================================================
// Craft Bot Strategies — defines profession combos to simulate
// ============================================================

import type {
  GatheringProfession,
  CraftingProfession,
  GatheringSkills,
  CraftingSkills,
  Item,
  Rarity,
  RareMaterialRarity,
} from '../src/types';

// ─── Strategy Definition ─────────────────────────────────

export interface CraftStrategy {
  name: string;
  primaryGathering: GatheringProfession;
  secondaryGathering?: GatheringProfession;
  craftingProfession?: CraftingProfession;
  description: string;
}

export const CRAFT_STRATEGIES: CraftStrategy[] = [
  {
    name: 'miner_weaponsmith',
    primaryGathering: 'mining',
    secondaryGathering: 'logging',
    craftingProfession: 'weaponsmith',
    description: 'Ore→ingots + Wood→planks → weapons',
  },
  {
    name: 'miner_armorer',
    primaryGathering: 'mining',
    secondaryGathering: 'skinning',
    craftingProfession: 'armorer',
    description: 'Ore→ingots + Hides→leather → plate armor',
  },
  {
    name: 'logger_weaponsmith',
    primaryGathering: 'logging',
    secondaryGathering: 'mining',
    craftingProfession: 'weaponsmith',
    description: 'Wood→planks + Ore→ingots → weapons',
  },
  {
    name: 'herbalist_tailor',
    primaryGathering: 'herbalism',
    secondaryGathering: 'logging',      // cloth recipes use herbs + cloth
    craftingProfession: 'tailor',
    description: 'Herbs→extract + Fiber→cloth → cloth armor',
  },
  {
    name: 'herbalist_alchemist',
    primaryGathering: 'herbalism',
    craftingProfession: 'alchemist',
    description: 'Herbs→extract → affix catalysts',
  },
  {
    name: 'skinner_leatherworker',
    primaryGathering: 'skinning',
    secondaryGathering: 'logging',
    craftingProfession: 'leatherworker',
    description: 'Hides→leather + Wood→planks → leather armor',
  },
  {
    name: 'fisher_jeweler',
    primaryGathering: 'fishing',
    craftingProfession: 'jeweler',
    description: 'Fish→reagents → jewelry',
  },
  {
    name: 'multi_gatherer',
    primaryGathering: 'mining',
    secondaryGathering: 'logging',
    description: 'Pure gathering XP analysis — no crafting',
  },
  {
    name: 'full_crafter',
    primaryGathering: 'mining',
    secondaryGathering: 'logging',
    craftingProfession: 'weaponsmith',
    description: 'Dual-gather self-supply weaponsmith',
  },
];

// ─── Bot Config ──────────────────────────────────────────

export interface CraftBotConfig {
  strategy: CraftStrategy;
  seed: number;
  maxClears: number;
}

// ─── Clear Log Snapshot ──────────────────────────────────

export interface CraftClearLog {
  clearNum: number;
  gatheringLevels: Record<GatheringProfession, number>;
  craftingLevel: number;
  characterLevel: number;
  totalMaterials: Record<string, number>;
  totalRefines: number;
  totalCrafts: number;
  highestBand: number;
  gold: number;
}

// ─── Bot Summary ─────────────────────────────────────────

export interface RareMaterialLog {
  id: string;
  rarity: RareMaterialRarity;
  clearNum: number;
}

export interface CraftedItemLog {
  recipeTier: number;
  rarity: Rarity;
  affixCount: number;
  iLvl: number;
  clearNum: number;
}

export interface CraftBotSummary {
  strategyName: string;
  seed: number;
  totalClears: number;
  totalSimTimeSec: number;

  // Final skill levels
  finalGatheringLevels: Record<GatheringProfession, number>;
  finalCraftingLevel: number;
  finalCharacterLevel: number;

  // Gathering milestones: clears to reach level N
  gatheringMilestones: Record<number, number>;  // level → clearNum
  craftingMilestones: Record<number, number>;    // level → clearNum

  // Material flow
  totalGathered: Record<string, number>;
  totalRefined: Record<string, number>;
  totalSpentOnCrafts: Record<string, number>;
  finalSurplus: Record<string, number>;

  // Refinement stats
  refinesPerTier: Record<number, number>;
  totalRefines: number;

  // Crafting stats
  totalCrafts: number;
  craftsPerTier: Record<number, number>;
  craftedItems: CraftedItemLog[];

  // Rare materials
  rareDrops: RareMaterialLog[];

  // Gold
  finalGold: number;
  totalGoldSpent: number;

  // Pain points (auto-detected)
  painPoints: string[];

  // Progression snapshots
  snapshots: CraftClearLog[];
}

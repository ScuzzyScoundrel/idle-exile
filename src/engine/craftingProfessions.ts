// ============================================================
// Idle Exile — Crafting Professions Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { CraftingSkills, CraftingProfession, CraftingRecipeDef, CraftingMilestone, Item, Rarity, RareMaterialRarity, AffixTier } from '../types';
import { CRAFTING_MILESTONES } from '../data/craftingProfessions';
import { CRAFTING_XP_PER_TIER, CATALYST_RARITY_MAP, CATALYST_BEST_TIER, CATALYST_ILVL_BONUS } from '../data/balance';
import { generateItem, generateGatheringItem, rollAffixValue, classifyRarity, buildItemName } from './items';
import { AFFIX_DEFS } from '../data/affixes';
import { getRareMaterialDef } from '../data/rareMaterials';
import { getAffixCatalystDef } from '../data/affixCatalysts';

/** XP curve for crafting professions — matches gathering curve. */
const CRAFTING_XP_BASE = 50;
const CRAFTING_XP_GROWTH = 1.10;

/** Rarity rank for comparison. */
const RARITY_RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

/** Calculate XP required to reach the next crafting level. */
export function calcCraftingXpRequired(level: number): number {
  return Math.round(CRAFTING_XP_BASE * Math.pow(CRAFTING_XP_GROWTH, level - 1));
}

/** Add crafting XP to a profession, handling level-ups. Returns new skills state. */
export function addCraftingXp(
  skills: CraftingSkills,
  profession: CraftingProfession,
  xp: number,
): CraftingSkills {
  const current = skills[profession];
  let newXp = current.xp + xp;
  let newLevel = current.level;

  while (newLevel < 100) {
    const needed = calcCraftingXpRequired(newLevel);
    if (newXp >= needed) {
      newXp -= needed;
      newLevel++;
    } else {
      break;
    }
  }

  return {
    ...skills,
    [profession]: { level: newLevel, xp: newXp },
  };
}

/** Check if a recipe can be crafted (level + materials + gold + catalyst). */
export function canCraftRecipe(
  recipe: CraftingRecipeDef,
  skills: CraftingSkills,
  materials: Record<string, number>,
  gold: number,
): boolean {
  // Check profession level
  if (skills[recipe.profession].level < recipe.requiredLevel) return false;

  // Check gold
  if (gold < recipe.goldCost) return false;

  // Check materials
  for (const { materialId, amount } of recipe.materials) {
    if ((materials[materialId] ?? 0) < amount) return false;
  }

  // Check required catalyst (for unique recipes)
  if (recipe.requiredCatalyst) {
    if ((materials[recipe.requiredCatalyst.rareMaterialId] ?? 0) < recipe.requiredCatalyst.amount) return false;
  }

  // Check component cost
  if (recipe.componentCost) {
    for (const { materialId, amount } of recipe.componentCost) {
      if ((materials[materialId] ?? 0) < amount) return false;
    }
  }

  return true;
}

/**
 * Execute a craft: generate an item with optional catalyst rarity boost.
 *
 * - No catalyst: normal random item generation
 * - Optional catalyst: if rarity < guaranteed minimum, regenerate until it meets minimum
 * - Required catalyst (unique recipes): guaranteed high-rarity item
 * - Legendary catalyst bonus: adds an extra affix roll
 */
export function executeCraft(
  recipe: CraftingRecipeDef,
  catalystId?: string,
  affixCatalystId?: string,
): Item {
  // Resolve guaranteed affix from affix catalyst
  const affixCatDef = affixCatalystId ? getAffixCatalystDef(affixCatalystId) : undefined;
  const guaranteedAffix = affixCatDef?.guaranteedAffix;

  // Resolve catalyst iLvl bonus — higher rarity catalyst = better affix tier weights
  let catalystILvlBonus = 0;
  if (recipe.requiredCatalyst) {
    const cd = getRareMaterialDef(recipe.requiredCatalyst.rareMaterialId);
    if (cd) catalystILvlBonus = CATALYST_ILVL_BONUS[cd.rarity];
  } else if (catalystId) {
    const cd = getRareMaterialDef(catalystId);
    if (cd) catalystILvlBonus = CATALYST_ILVL_BONUS[cd.rarity];
  }
  const effectiveILvl = recipe.outputILvl + catalystILvlBonus;

  // Generate the base item — pass outputBaseId to ensure correct item type
  let item: Item;
  if (recipe.isGatheringGear) {
    item = generateGatheringItem(
      getSlotFromBaseId(recipe.outputBaseId),
      effectiveILvl,
      recipe.outputBaseId,
    );
  } else {
    item = generateItem(
      getSlotFromBaseId(recipe.outputBaseId),
      effectiveILvl,
      recipe.outputBaseId,
      guaranteedAffix,
    );
  }

  // Determine minimum rarity from catalyst
  let minRarity: Rarity | null = null;

  if (recipe.requiredCatalyst) {
    // Unique recipe — use the catalyst's rarity to determine minimum
    const catDef = getRareMaterialDef(recipe.requiredCatalyst.rareMaterialId);
    if (catDef) {
      minRarity = CATALYST_RARITY_MAP[catDef.rarity];
    }
  } else if (catalystId) {
    // Optional catalyst
    const catDef = getRareMaterialDef(catalystId);
    if (catDef) {
      minRarity = CATALYST_RARITY_MAP[catDef.rarity];
    }
  }

  // Reroll item if it doesn't meet minimum rarity (max 10 attempts to prevent infinite loop)
  if (minRarity && RARITY_RANK[item.rarity] < RARITY_RANK[minRarity]) {
    for (let i = 0; i < 10; i++) {
      if (recipe.isGatheringGear) {
        item = generateGatheringItem(
          getSlotFromBaseId(recipe.outputBaseId),
          effectiveILvl,
          recipe.outputBaseId,
        );
      } else {
        item = generateItem(
          getSlotFromBaseId(recipe.outputBaseId),
          effectiveILvl,
          recipe.outputBaseId,
        );
      }
      if (RARITY_RANK[item.rarity] >= RARITY_RANK[minRarity]) break;
    }
    // Force minimum rarity if still below after 10 attempts
    if (RARITY_RANK[item.rarity] < RARITY_RANK[minRarity]) {
      item.rarity = minRarity;
    }
  }

  // God-tier affix: rare catalyst forces 1 affix to break iLvl tier cap
  let catalystRarity: RareMaterialRarity | null = null;
  if (recipe.requiredCatalyst) {
    const cd = getRareMaterialDef(recipe.requiredCatalyst.rareMaterialId);
    if (cd) catalystRarity = cd.rarity;
  } else if (catalystId) {
    const cd = getRareMaterialDef(catalystId);
    if (cd) catalystRarity = cd.rarity;
  }

  if (catalystRarity) {
    const bestTier = CATALYST_BEST_TIER[catalystRarity];
    const allAffixes = [...item.prefixes, ...item.suffixes];
    if (allAffixes.length > 0) {
      const target = allAffixes[Math.floor(Math.random() * allAffixes.length)];
      if (bestTier < target.tier) {
        const def = AFFIX_DEFS.find(d => d.id === target.defId);
        if (def?.tiers[bestTier as AffixTier]) {
          const td = def.tiers[bestTier as AffixTier];
          target.tier = bestTier as AffixTier;
          target.value = rollAffixValue(td.min, td.max);
        }
      }
    }
    item.rarity = classifyRarity(item);
    item.name = buildItemName(item);
  }

  item.isCrafted = true;
  return item;
}

/** Get the XP reward for crafting a recipe of a given tier. */
export function getCraftingXpForTier(tier: number): number {
  return CRAFTING_XP_PER_TIER[tier] ?? 15;
}

/** Get all milestones that are active at a given crafting level. */
export function getActiveCraftingMilestones(level: number): CraftingMilestone[] {
  return CRAFTING_MILESTONES.filter(m => level >= m.level);
}

/**
 * Helper: extract the gear slot from a base item ID by looking it up.
 * We import ITEM_BASE_DEFS to find the slot.
 */
import { ITEM_BASE_DEFS } from '../data/items';
import type { GearSlot } from '../types';

function getSlotFromBaseId(baseId: string): GearSlot {
  const base = ITEM_BASE_DEFS.find(b => b.id === baseId);
  return base?.slot ?? 'mainhand';
}

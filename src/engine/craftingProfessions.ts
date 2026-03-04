// ============================================================
// Idle Exile — Crafting Professions Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { CraftingSkills, CraftingProfession, CraftingRecipeDef, CraftingMilestone, CraftingPatternDef, Item, Rarity, RareMaterialRarity, AffixTier } from '../types';
import { CRAFTING_MILESTONES } from '../data/craftingProfessions';
import { CRAFTING_XP_PER_TIER, CATALYST_RARITY_MAP, CATALYST_BEST_TIER, CATALYST_ILVL_BONUS } from '../data/balance';
import { generateItem, generateGatheringItem, generateProfessionItem, rollAffixValue, classifyRarity, buildItemName, getAffixDef } from './items';
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
  bonusIlvl: number = 0,
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
  const effectiveILvl = recipe.outputILvl + catalystILvlBonus + bonusIlvl;

  // Generate the base item — pass outputBaseId to ensure correct item type
  let item: Item;
  if (recipe.isProfessionGear) {
    item = generateProfessionItem(
      getSlotFromBaseId(recipe.outputBaseId),
      effectiveILvl,
      recipe.outputBaseId,
    );
  } else if (recipe.isGatheringGear) {
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
      if (recipe.isProfessionGear) {
        item = generateProfessionItem(
          getSlotFromBaseId(recipe.outputBaseId),
          effectiveILvl,
          recipe.outputBaseId,
        );
      } else if (recipe.isGatheringGear) {
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
        const def = getAffixDef(target.defId);
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
import { PROFESSION_BASE_DEFS } from '../data/professionBases';
import type { GearSlot } from '../types';

function getSlotFromBaseId(baseId: string): GearSlot {
  const base = ITEM_BASE_DEFS.find(b => b.id === baseId)
    ?? PROFESSION_BASE_DEFS.find(b => b.id === baseId);
  return base?.slot ?? 'mainhand';
}

// ─── Pattern Crafting ───────────────────────────────────────────

import { CRAFTING_RECIPES } from '../data/craftingRecipes';

/**
 * Find the equivalent normal recipe for a pattern to determine base material cost.
 * Matches by outputBaseId, or falls back to any recipe of the same tier+profession.
 */
function findEquivalentRecipe(pattern: CraftingPatternDef): CraftingRecipeDef | undefined {
  // Try exact match on outputBaseId
  let recipe = CRAFTING_RECIPES.find(
    r => r.outputBaseId === pattern.outputBaseId && r.profession === pattern.profession,
  );
  if (recipe) return recipe;
  // Fallback: any recipe of same profession+tier
  recipe = CRAFTING_RECIPES.find(
    r => r.profession === pattern.profession && r.tier === pattern.band,
  );
  return recipe;
}

/**
 * Get the material cost for a pattern craft (base recipe cost × materialCostMult).
 * Returns undefined if no equivalent recipe found.
 */
export function getPatternMaterialCost(
  pattern: CraftingPatternDef,
): { materials: { materialId: string; amount: number }[]; goldCost: number } | undefined {
  const recipe = findEquivalentRecipe(pattern);
  if (!recipe) return undefined;
  const materials = recipe.materials.map(m => ({
    materialId: m.materialId,
    amount: Math.ceil(m.amount * pattern.materialCostMult),
  }));
  const goldCost = Math.ceil(recipe.goldCost * pattern.materialCostMult);
  return { materials, goldCost };
}

/** Check if a pattern can be crafted (materials, charges, level). */
export function canCraftPattern(
  pattern: CraftingPatternDef,
  charges: number,
  skills: CraftingSkills,
  materials: Record<string, number>,
  gold: number,
): boolean {
  if (charges <= 0) return false;
  const cost = getPatternMaterialCost(pattern);
  if (!cost) return false;
  // Check profession level (use tier requirement)
  const recipe = findEquivalentRecipe(pattern);
  if (recipe && skills[pattern.profession].level < recipe.requiredLevel) return false;
  // Check gold
  if (gold < cost.goldCost) return false;
  // Check materials
  for (const { materialId, amount } of cost.materials) {
    if ((materials[materialId] ?? 0) < amount) return false;
  }
  return true;
}

/**
 * Execute a pattern craft — generate an item with guaranteed affixes and minimum rarity.
 */
export function executePatternCraft(pattern: CraftingPatternDef): Item {
  const slot = getSlotFromBaseId(pattern.outputBaseId);
  // Generate with first guaranteed affix
  let item = generateItem(slot, pattern.outputILvl, pattern.outputBaseId, pattern.guaranteedAffixes[0]);

  // If pattern has a second guaranteed affix, ensure it's present
  if (pattern.guaranteedAffixes.length > 1) {
    const secondAffix = pattern.guaranteedAffixes[1];
    const hasSecond = [...item.prefixes, ...item.suffixes].some(a => {
      const def = getAffixDef(a.defId);
      return def?.category === secondAffix;
    });
    if (!hasSecond) {
      // Generate a second item with the second affix and steal its guaranteed affix
      const secondItem = generateItem(slot, pattern.outputILvl, pattern.outputBaseId, secondAffix);
      const secondAffixRoll = [...secondItem.prefixes, ...secondItem.suffixes].find(a => {
        const def = getAffixDef(a.defId);
        return def?.category === secondAffix;
      });
      if (secondAffixRoll) {
        // Replace weakest existing affix with the guaranteed one
        const allAffixes = [...item.prefixes, ...item.suffixes];
        if (allAffixes.length > 0) {
          // Find weakest affix (highest tier number = weakest)
          let weakestIdx = 0;
          let weakestTier = 0;
          allAffixes.forEach((a, i) => {
            if (a.tier > weakestTier) { weakestTier = a.tier; weakestIdx = i; }
          });
          if (weakestIdx < item.prefixes.length) {
            item.prefixes[weakestIdx] = secondAffixRoll;
          } else {
            item.suffixes[weakestIdx - item.prefixes.length] = secondAffixRoll;
          }
        }
      }
    }
  }

  // Enforce minimum rarity
  if (RARITY_RANK[item.rarity] < RARITY_RANK[pattern.minRarity]) {
    // Reroll up to 10 times to try to meet min rarity
    for (let i = 0; i < 10; i++) {
      item = generateItem(slot, pattern.outputILvl, pattern.outputBaseId, pattern.guaranteedAffixes[0]);
      if (RARITY_RANK[item.rarity] >= RARITY_RANK[pattern.minRarity]) break;
    }
    // Force if still below
    if (RARITY_RANK[item.rarity] < RARITY_RANK[pattern.minRarity]) {
      item.rarity = pattern.minRarity;
    }
  }

  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);
  item.isCrafted = true;
  return item;
}

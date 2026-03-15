// ============================================================
// Idle Exile — Crafting Professions Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { CraftingSkills, CraftingProfession, CraftingRecipeDef, CraftingMilestone, CraftingPatternDef, Item, Rarity, RareMaterialRarity, AffixTier } from '../types';
import { CRAFTING_MILESTONES } from '../data/craftingProfessions';
import { CRAFTING_XP_PER_TIER, CATALYST_RARITY_MAP, CATALYST_BEST_TIER, CATALYST_ILVL_BONUS, REFORGE_COST_PER_BAND } from '../data/balance';
import { generateItem, generateGatheringItem, generateProfessionItem, rollAffixValue, classifyRarity, buildItemName, getAffixDef } from './items';
import { getRareMaterialDef } from '../data/rareMaterials';
import { getAffixCatalystDef } from '../data/affixCatalysts';
import { getUniqueItemDef } from '../data/uniqueItems';

/** XP curve for crafting professions — matches gathering curve. */
const CRAFTING_XP_BASE = 50;
const CRAFTING_XP_GROWTH = 1.10;

/** Rarity rank for comparison. */
const RARITY_RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, unique: 5,
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
 * Get the material cost for a pattern craft.
 * For unique patterns: uses UniqueItemDef.craftCost (trophies + mats + rare mat + gold).
 * For normal patterns: base recipe cost × materialCostMult.
 * Returns undefined if no cost info found.
 */
export function getPatternMaterialCost(
  pattern: CraftingPatternDef,
): { materials: { materialId: string; amount: number }[]; goldCost: number } | undefined {
  // Unique pattern: derive cost from UniqueItemDef
  if (pattern.uniqueDefId) {
    const uniqueDef = getUniqueItemDef(pattern.uniqueDefId);
    if (!uniqueDef) return undefined;
    const materials: { materialId: string; amount: number }[] = [
      { materialId: uniqueDef.craftCost.trophyId, amount: uniqueDef.craftCost.trophyAmount },
      ...uniqueDef.craftCost.materials,
    ];
    if (uniqueDef.craftCost.rareMaterialId && uniqueDef.craftCost.rareMaterialAmount) {
      materials.push({ materialId: uniqueDef.craftCost.rareMaterialId, amount: uniqueDef.craftCost.rareMaterialAmount });
    }
    return { materials, goldCost: uniqueDef.craftCost.goldCost };
  }

  // Normal pattern: derive from equivalent recipe
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
  // Check profession level (unique patterns skip recipe level check)
  if (!pattern.uniqueDefId) {
    const recipe = findEquivalentRecipe(pattern);
    if (recipe && skills[pattern.profession].level < recipe.requiredLevel) return false;
  }
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
 * For unique patterns, delegates to executeUniquePatternCraft.
 */
export function executePatternCraft(pattern: CraftingPatternDef): Item {
  if (pattern.uniqueDefId) {
    return executeUniquePatternCraft(pattern);
  }
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

// ─── Unique Pattern Crafting ────────────────────────────────────

/**
 * Craft a unique item from a unique pattern.
 * Always generates exactly 5 random affixes + 1 unique affix = 6 total.
 * Cannot be modified with currency — you reforge or craft again.
 */
function executeUniquePatternCraft(pattern: CraftingPatternDef): Item {
  const uniqueDef = getUniqueItemDef(pattern.uniqueDefId!);
  if (!uniqueDef) {
    const slot = getSlotFromBaseId(pattern.outputBaseId);
    return generateItem(slot, pattern.outputILvl, pattern.outputBaseId);
  }

  const slot = getSlotFromBaseId(pattern.outputBaseId);
  const item = generateItem(slot, pattern.outputILvl, pattern.outputBaseId);

  // Force exactly 5 random affixes (unique affix takes the 6th slot)
  forceUniqueAffixCount(item, uniqueDef.uniqueAffix.slot, slot, pattern.outputILvl, pattern.outputBaseId);

  // Attach unique affix
  item.uniqueAffix = {
    uniqueDefId: uniqueDef.id,
    slot: uniqueDef.uniqueAffix.slot,
    displayText: uniqueDef.uniqueAffix.displayText,
    stats: { ...uniqueDef.uniqueAffix.stats },
  };

  // Set unique properties
  item.isUnique = true;
  item.uniqueDefId = uniqueDef.id;
  item.rarity = 'unique';
  item.name = uniqueDef.name;
  item.isCrafted = true;

  return item;
}

// ─── Reforge System ─────────────────────────────────────────────

/**
 * Get the cost to reforge a unique item to a target band's iLvl.
 */
export function getReforgeCost(
  uniqueDefId: string,
  targetBand: number,
): { materials: { materialId: string; amount: number }[]; goldCost: number } | undefined {
  const uniqueDef = getUniqueItemDef(uniqueDefId);
  if (!uniqueDef) return undefined;
  const bandCost = REFORGE_COST_PER_BAND[targetBand];
  if (!bandCost) return undefined;

  // Reforge costs: trophy + band-appropriate refined materials + gold
  const materials: { materialId: string; amount: number }[] = [
    { materialId: uniqueDef.craftCost.trophyId, amount: 1 },
  ];
  // Use the same base materials from the unique's original craft cost, scaled by target band
  for (const mat of uniqueDef.craftCost.materials) {
    materials.push({
      materialId: mat.materialId,
      amount: Math.ceil(mat.amount * (targetBand / uniqueDef.band)),
    });
  }

  return { materials, goldCost: bandCost.goldCost };
}

/**
 * Check if a unique item can be reforged to the target band.
 */
export function canReforge(
  item: Item,
  targetBand: number,
  materials: Record<string, number>,
  gold: number,
): boolean {
  if (!item.isUnique || !item.uniqueDefId) return false;
  const cost = getReforgeCost(item.uniqueDefId, targetBand);
  if (!cost) return false;
  if (gold < cost.goldCost) return false;
  for (const { materialId, amount } of cost.materials) {
    if ((materials[materialId] ?? 0) < amount) return false;
  }
  return true;
}

/** Force an item to have exactly 5 random affixes for unique crafting. */
function forceUniqueAffixCount(item: Item, uniqueSlot: 'prefix' | 'suffix', slot: import('../types').GearSlot, iLvl: number, baseId: string): void {
  const TARGET = 5;
  const maxPrefixes = uniqueSlot === 'prefix' ? 2 : 3;
  const maxSuffixes = uniqueSlot === 'suffix' ? 2 : 3;

  // Trim excess (remove weakest first)
  while (item.prefixes.length > maxPrefixes) {
    let worstIdx = 0;
    for (let i = 1; i < item.prefixes.length; i++) {
      if (item.prefixes[i].tier > item.prefixes[worstIdx].tier) worstIdx = i;
    }
    item.prefixes.splice(worstIdx, 1);
  }
  while (item.suffixes.length > maxSuffixes) {
    let worstIdx = 0;
    for (let i = 1; i < item.suffixes.length; i++) {
      if (item.suffixes[i].tier > item.suffixes[worstIdx].tier) worstIdx = i;
    }
    item.suffixes.splice(worstIdx, 1);
  }

  // Pad if total < TARGET
  let total = item.prefixes.length + item.suffixes.length;
  for (let attempt = 0; attempt < 5 && total < TARGET; attempt++) {
    const padItem = generateItem(slot, iLvl, baseId);
    for (const affix of padItem.prefixes) {
      if (item.prefixes.length < maxPrefixes && total < TARGET && !item.prefixes.some(a => a.defId === affix.defId)) {
        item.prefixes.push(affix);
        total++;
      }
    }
    for (const affix of padItem.suffixes) {
      if (item.suffixes.length < maxSuffixes && total < TARGET && !item.suffixes.some(a => a.defId === affix.defId)) {
        item.suffixes.push(affix);
        total++;
      }
    }
  }
}

/**
 * Reforge a unique item: re-generate at new iLvl, preserve unique affix, re-roll random affixes.
 * Always produces exactly 5 random affixes + 1 unique affix.
 * Returns a new item (does not mutate the original).
 */
export function executeReforge(item: Item, targetILvl: number): Item {
  if (!item.isUnique || !item.uniqueDefId || !item.uniqueAffix) return item;

  const uniqueDef = getUniqueItemDef(item.uniqueDefId);
  if (!uniqueDef) return item;

  const slot = getSlotFromBaseId(uniqueDef.baseItemId);

  // Find the appropriate base item for the target iLvl
  const targetBase = ITEM_BASE_DEFS
    .filter(b => b.slot === slot && (b.armorType === item.armorType || (!b.armorType && !item.armorType)) && (b.weaponType === item.weaponType || (!b.weaponType && !item.weaponType)))
    .sort((a, b) => Math.abs(a.iLvl - targetILvl) - Math.abs(b.iLvl - targetILvl))[0];

  const baseId = targetBase?.id ?? uniqueDef.baseItemId;
  const newItem = generateItem(slot, targetILvl, baseId);

  // Force exactly 5 random affixes
  forceUniqueAffixCount(newItem, uniqueDef.uniqueAffix.slot, slot, targetILvl, baseId);

  // Preserve unique properties
  newItem.uniqueAffix = { ...item.uniqueAffix };
  newItem.isUnique = true;
  newItem.uniqueDefId = item.uniqueDefId;
  newItem.rarity = 'unique';
  newItem.name = uniqueDef.name;
  newItem.isCrafted = true;
  newItem.iLvl = targetILvl;

  return newItem;
}

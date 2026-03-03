// ============================================================
// Idle Exile — Component Crafting Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { ComponentRecipeDef, CraftingSkills } from '../types';

/** Check if a component recipe can be crafted. */
export function canCraftComponent(
  recipe: ComponentRecipeDef,
  skills: CraftingSkills,
  materials: Record<string, number>,
  gold: number,
  selectedMobDrop?: string,
): boolean {
  // Check profession level
  if (skills[recipe.profession].level < recipe.requiredLevel) return false;

  // Check gold
  if (gold < recipe.goldCost) return false;

  // Check fixed materials
  for (const { materialId, amount } of recipe.materials) {
    if ((materials[materialId] ?? 0) < amount) return false;
  }

  // Check mob drop choice (specialist recipes)
  if (recipe.mobDropChoice) {
    const { amount, anyOf } = recipe.mobDropChoice;
    if (selectedMobDrop) {
      // Specific drop selected — must be in the anyOf list
      if (!anyOf.includes(selectedMobDrop)) return false;
      if ((materials[selectedMobDrop] ?? 0) < amount) return false;
    } else {
      // No specific drop selected — check if ANY of the acceptable drops has enough
      const hasAny = anyOf.some(id => (materials[id] ?? 0) >= amount);
      if (!hasAny) return false;
    }
  }

  return true;
}

/** Calculate the max craftable count for a component recipe. */
export function getMaxCraftableComponents(
  recipe: ComponentRecipeDef,
  skills: CraftingSkills,
  materials: Record<string, number>,
  gold: number,
  selectedMobDrop?: string,
): number {
  if (skills[recipe.profession].level < recipe.requiredLevel) return 0;

  let max = Math.floor(gold / recipe.goldCost);
  if (max <= 0) return 0;

  // Fixed materials
  for (const { materialId, amount } of recipe.materials) {
    max = Math.min(max, Math.floor((materials[materialId] ?? 0) / amount));
  }

  // Mob drop choice
  if (recipe.mobDropChoice) {
    const { amount, anyOf } = recipe.mobDropChoice;
    if (selectedMobDrop) {
      if (!anyOf.includes(selectedMobDrop)) return 0;
      max = Math.min(max, Math.floor((materials[selectedMobDrop] ?? 0) / amount));
    } else {
      // Auto-pick the drop with the most supply
      const bestCount = Math.max(...anyOf.map(id => Math.floor((materials[id] ?? 0) / amount)));
      max = Math.min(max, bestCount);
    }
  }

  return Math.max(0, max);
}

/** For specialist recipes with no specific drop selected, auto-pick the best available drop. */
export function autoPickMobDrop(
  recipe: ComponentRecipeDef,
  materials: Record<string, number>,
): string | undefined {
  if (!recipe.mobDropChoice) return undefined;
  const { amount, anyOf } = recipe.mobDropChoice;

  let bestId: string | undefined;
  let bestCount = -1;
  for (const id of anyOf) {
    const have = materials[id] ?? 0;
    if (have >= amount && have > bestCount) {
      bestCount = have;
      bestId = id;
    }
  }
  return bestId;
}

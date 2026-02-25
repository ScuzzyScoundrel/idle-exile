// ============================================================
// Idle Exile — Refinement Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { RefinementRecipeDef } from '../types';
import { getDeconstructOutput, REFINEMENT_RECIPES } from '../data/refinement';

/**
 * Check if the player has enough materials and gold to refine a recipe.
 */
export function canRefine(
  recipe: RefinementRecipeDef,
  materials: Record<string, number>,
  gold: number,
): boolean {
  if (gold < recipe.goldCost) return false;
  if ((materials[recipe.rawMaterialId] ?? 0) < recipe.rawAmount) return false;
  if (recipe.previousRefinedId) {
    if ((materials[recipe.previousRefinedId] ?? 0) < recipe.previousRefinedAmount) return false;
  }
  return true;
}

/**
 * Execute a refinement: deduct inputs, add output. Returns new state.
 */
export function refine(
  recipe: RefinementRecipeDef,
  materials: Record<string, number>,
  gold: number,
): { newMaterials: Record<string, number>; newGold: number } {
  const newMaterials = { ...materials };
  newMaterials[recipe.rawMaterialId] = (newMaterials[recipe.rawMaterialId] ?? 0) - recipe.rawAmount;
  if (recipe.previousRefinedId) {
    newMaterials[recipe.previousRefinedId] = (newMaterials[recipe.previousRefinedId] ?? 0) - recipe.previousRefinedAmount;
  }
  newMaterials[recipe.outputId] = (newMaterials[recipe.outputId] ?? 0) + 1;
  return { newMaterials, newGold: gold - recipe.goldCost };
}

/**
 * Check if a refined material can be deconstructed.
 * T1 materials cannot be deconstructed.
 */
export function canDeconstruct(
  refinedId: string,
  materials: Record<string, number>,
): boolean {
  if ((materials[refinedId] ?? 0) < 1) return false;
  const output = getDeconstructOutput(refinedId);
  return output !== null;
}

/**
 * Deconstruct a refined material: 1 refined → 2 of previous tier.
 */
export function deconstruct(
  refinedId: string,
  materials: Record<string, number>,
): Record<string, number> {
  const newMaterials = { ...materials };
  const output = getDeconstructOutput(refinedId);
  if (!output) return newMaterials;

  newMaterials[refinedId] = (newMaterials[refinedId] ?? 0) - 1;
  newMaterials[output.outputId] = (newMaterials[output.outputId] ?? 0) + output.amount;
  return newMaterials;
}

/**
 * Get the refinement chain for a given track, sorted by tier.
 */
export function getRefinementChain(track: string): RefinementRecipeDef[] {
  return REFINEMENT_RECIPES
    .filter(r => r.track === track)
    .sort((a, b) => a.tier - b.tier);
}

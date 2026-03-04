import { REFINEMENT_RECIPES } from '../../data/refinement';
import { REFINEMENT_TRACK_DEFS } from '../../data/refinement';
import { AFFIX_CATALYST_DEFS } from '../../data/affixCatalysts';
import { getRareMaterialDef } from '../../data/rareMaterials';
import { CATALYST_RARITY_MAP, CATALYST_BEST_TIER } from '../../data/balance';
import { ZONE_DEFS } from '../../data/zones';
import { ITEM_BASE_DEFS } from '../../data/items';
import type { CraftingRecipeDef, RefinementTrack } from '../../types';

// Build track lookups from refinement recipes (static, computed once)
export const rawToTrack = new Map<string, RefinementTrack>();
export const refinedToTrack = new Map<string, RefinementTrack>();
for (const r of REFINEMENT_RECIPES) {
  rawToTrack.set(r.rawMaterialId, r.track);
  refinedToTrack.set(r.outputId, r.track);
}

// Reverse lookup: materialId -> zone names where it drops
export const materialToZones = new Map<string, string[]>();
for (const zone of ZONE_DEFS) {
  for (const matId of zone.materialDrops) {
    if (!materialToZones.has(matId)) materialToZones.set(matId, []);
    materialToZones.get(matId)!.push(zone.name);
  }
}

export function formatMatName(id: string): string {
  return id.replace(/_/g, ' ');
}

/** Generate tooltip text for a material. */
export function getMatTooltip(id: string): string | null {
  // Affix catalyst
  const affixDef = AFFIX_CATALYST_DEFS.find(d => d.id === id);
  if (affixDef) {
    return `Guarantees +${affixDef.guaranteedAffix.replace(/_/g, ' ')} on crafted gear. Brewed by Alchemist.`;
  }

  // Rare material
  const rareDef = getRareMaterialDef(id);
  if (rareDef) {
    const minRarity = CATALYST_RARITY_MAP[rareDef.rarity];
    const bestTier = CATALYST_BEST_TIER[rareDef.rarity];
    return `${rareDef.description}. Catalyst: ${minRarity}+ item with 1 boosted T${bestTier} affix.`;
  }

  // Raw material
  const rawTrack = rawToTrack.get(id);
  if (rawTrack) {
    const trackDef = REFINEMENT_TRACK_DEFS.find(t => t.id === rawTrack);
    const recipe = REFINEMENT_RECIPES.find(r => r.rawMaterialId === id);
    const refinedName = recipe ? formatMatName(recipe.outputId) : 'refined materials';
    const zones = materialToZones.get(id);
    let tip = `Gathered via ${trackDef?.name ?? rawTrack}. Refine into ${refinedName}.`;
    if (zones && zones.length > 0) tip += `\nFound in: ${zones.join(', ')}`;
    return tip;
  }

  // Refined material
  const refTrack = refinedToTrack.get(id);
  if (refTrack) {
    const recipe = REFINEMENT_RECIPES.find(r => r.outputId === id);
    const rawName = recipe ? formatMatName(recipe.rawMaterialId) : 'raw materials';
    const rawZones = recipe ? materialToZones.get(recipe.rawMaterialId) : undefined;
    let tip = `Refined from ${rawName}. Used in crafting recipes.`;
    if (rawZones && rawZones.length > 0) tip += `\nSource: ${rawZones.join(', ')}`;
    return tip;
  }

  return null;
}

/** Material icon lookup from refinement track */
export function getMatIcon(matId: string): string {
  const track = rawToTrack.get(matId) ?? refinedToTrack.get(matId);
  if (track) {
    const td = REFINEMENT_TRACK_DEFS.find(t => t.id === track);
    if (td) return td.icon;
  }
  if (matId === 'enchanting_essence') return '\u2728';
  if (matId === 'magic_essence') return '\uD83D\uDCAB';
  return '\uD83E\uDEA8';
}

/** Derive a category label from a recipe's output base */
export function getCategoryForRecipe(recipe: CraftingRecipeDef): string {
  if (recipe.outputMaterialId) return 'catalyst';
  const base = ITEM_BASE_DEFS.find(b => b.id === recipe.outputBaseId);
  if (!base) return 'other';
  if (recipe.profession === 'weaponsmith' && base.weaponType) return base.weaponType;
  if (recipe.profession === 'weaponsmith' && base.slot === 'offhand') return 'offhand';
  return base.slot;
}

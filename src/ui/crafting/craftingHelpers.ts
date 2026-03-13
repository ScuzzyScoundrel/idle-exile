import { REFINEMENT_RECIPES } from '../../data/refinement';
import { REFINEMENT_TRACK_DEFS } from '../../data/refinement';
import { AFFIX_CATALYST_DEFS } from '../../data/affixCatalysts';
import { getRareMaterialDef } from '../../data/rareMaterials';
import { CATALYST_RARITY_MAP, CATALYST_BEST_TIER } from '../../data/balance';
import { ZONE_DEFS } from '../../data/zones';
import { ITEM_BASE_DEFS } from '../../data/items';
import { CRAFTING_RECIPES } from '../../data/craftingRecipes';
import type { CraftingProfession, CraftingRecipeDef, RefinementTrack } from '../../types';

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

// ---------------------------------------------------------------------------
// Workbench helpers — slot→recipe mapping, profession lookup, inline refine
// ---------------------------------------------------------------------------

/** Canonical slot keys used by the workbench SlotPicker.
 *  Weapon types are split out from the generic 'mainhand' GearSlot so the
 *  picker can show individual weapon buttons (Sword, Dagger, Bow, etc.).
 *  Accessories that share a GearSlot (ring1/ring2, trinket1/trinket2) are
 *  collapsed to a single key.  'catalyst' covers alchemist output recipes. */
export type WorkbenchSlot =
  // Weapons (split by weaponType)
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'bow' | 'crossbow' | 'wand' | 'staff'
  // Offhand (split by offhandType)
  | 'shield'
  // Defense
  | 'helmet' | 'chest' | 'shoulders' | 'gloves' | 'pants' | 'boots' | 'cloak'
  // Accessories
  | 'ring' | 'amulet' | 'belt' | 'trinket'
  // Other
  | 'catalyst';

/** Map a CraftingRecipeDef to its WorkbenchSlot key. */
export function getWorkbenchSlot(recipe: CraftingRecipeDef): WorkbenchSlot {
  if (recipe.outputMaterialId) return 'catalyst';
  if (recipe.isGatheringGear || recipe.isProfessionGear) return 'catalyst'; // profession gear goes in "Other"
  const base = ITEM_BASE_DEFS.find(b => b.id === recipe.outputBaseId);
  if (!base) return 'catalyst';
  // Weapons: use weaponType for fine-grained picker
  if (base.weaponType) return base.weaponType as WorkbenchSlot;
  // Offhand: only shields are craftable for now
  if (base.slot === 'offhand') return 'shield';
  // Accessories: collapse ring1/ring2 → ring, trinket1/trinket2 → trinket
  if (base.slot === 'ring1' || base.slot === 'ring2') return 'ring';
  if (base.slot === 'trinket1' || base.slot === 'trinket2') return 'trinket';
  if (base.slot === 'neck') return 'amulet';
  return base.slot as WorkbenchSlot;
}

// Pre-built slot→recipes map (computed once at import time)
const _slotRecipeMap = new Map<WorkbenchSlot, CraftingRecipeDef[]>();
for (const r of CRAFTING_RECIPES) {
  const slot = getWorkbenchSlot(r);
  let list = _slotRecipeMap.get(slot);
  if (!list) {
    list = [];
    _slotRecipeMap.set(slot, list);
  }
  list.push(r);
}

/** Get all recipes grouped by WorkbenchSlot. Computed once, returns cached map. */
export function getRecipesBySlot(): Map<WorkbenchSlot, CraftingRecipeDef[]> {
  return _slotRecipeMap;
}

// Pre-built slot→profession(s) map
const _slotProfessionMap = new Map<WorkbenchSlot, CraftingProfession>();
for (const [slot, recipes] of _slotRecipeMap) {
  // Use the first recipe's profession — each slot is handled by exactly one profession
  if (recipes.length > 0) _slotProfessionMap.set(slot, recipes[0].profession);
}

/** Get the primary crafting profession for a given workbench slot. */
export function getProfessionForSlot(slot: WorkbenchSlot): CraftingProfession {
  return _slotProfessionMap.get(slot) ?? 'weaponsmith';
}

// Pre-built refined→refinement recipe lookup (outputId → recipe)
const _refinedToRecipe = new Map<string, typeof REFINEMENT_RECIPES[number]>();
for (const r of REFINEMENT_RECIPES) {
  _refinedToRecipe.set(r.outputId, r);
}

/** Check if a material can be refined inline and return the info needed. */
export function getInlineRefineInfo(
  materialId: string,
  playerMaterials: Record<string, number>,
): {
  canRefine: boolean;
  rawMaterialId: string;
  rawHave: number;
  rawNeed: number;
  recipeId: string;
} | null {
  // Only refined materials have an inline refine button
  const recipe = _refinedToRecipe.get(materialId);
  if (!recipe) return null;

  const rawHave = playerMaterials[recipe.rawMaterialId] ?? 0;
  const rawNeed = recipe.rawAmount;

  return {
    canRefine: rawHave >= rawNeed,
    rawMaterialId: recipe.rawMaterialId,
    rawHave,
    rawNeed,
    recipeId: recipe.id,
  };
}

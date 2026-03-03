import { ZONE_DEFS } from './zones';
import { ZONE_MOB_TYPES } from './mobTypes';
import { REFINEMENT_RECIPES } from './refinement';
import { COMPONENT_RECIPES } from './componentRecipes';
import { CRAFTING_RECIPES } from './craftingRecipes';

export interface MaterialTraceInfo {
  dropSources: {
    zones: string[];
    mobs: { name: string; zone: string }[];
  };
  usedInRecipes: {
    name: string;
    id: string;
    type: 'refine' | 'component' | 'gear';
    profession?: string;
  }[];
  producedByRecipes: {
    name: string;
    id: string;
    type: 'refine' | 'component' | 'gear';
  }[];
}

// ─── Build static indexes at module load ───────────────────────

// Zone gathering sources: materialId → zone names
const zoneDropIndex = new Map<string, string[]>();
for (const zone of ZONE_DEFS) {
  for (const matId of zone.materialDrops) {
    if (!zoneDropIndex.has(matId)) zoneDropIndex.set(matId, []);
    zoneDropIndex.get(matId)!.push(zone.name);
  }
}

// Mob drop sources: materialId → { mobName, zoneName }[]
const mobDropIndex = new Map<string, { name: string; zone: string }[]>();
for (const zone of ZONE_DEFS) {
  const mobs = ZONE_MOB_TYPES[zone.id];
  if (!mobs) continue;
  for (const mob of mobs) {
    for (const drop of mob.drops) {
      if (!mobDropIndex.has(drop.materialId)) mobDropIndex.set(drop.materialId, []);
      mobDropIndex.get(drop.materialId)!.push({ name: mob.name, zone: zone.name });
    }
  }
}

// "Used in" index: materialId → recipes that consume it
const usedInIndex = new Map<string, MaterialTraceInfo['usedInRecipes']>();

function addUsedIn(matId: string, entry: MaterialTraceInfo['usedInRecipes'][0]) {
  if (!usedInIndex.has(matId)) usedInIndex.set(matId, []);
  usedInIndex.get(matId)!.push(entry);
}

// Refinement recipes consume raw materials (and previous refined for T2+)
for (const r of REFINEMENT_RECIPES) {
  addUsedIn(r.rawMaterialId, { name: r.outputName, id: r.id, type: 'refine' });
  if (r.previousRefinedId) {
    addUsedIn(r.previousRefinedId, { name: r.outputName, id: r.id, type: 'refine' });
  }
}

// Component recipes consume fixed materials + mob drops
for (const r of COMPONENT_RECIPES) {
  for (const { materialId } of r.materials) {
    addUsedIn(materialId, { name: r.name, id: r.id, type: 'component', profession: r.profession });
  }
  if (r.mobDropChoice) {
    for (const dropId of r.mobDropChoice.anyOf) {
      addUsedIn(dropId, { name: r.name, id: r.id, type: 'component', profession: r.profession });
    }
  }
}

// Gear/material recipes consume refined materials, components, catalysts
for (const r of CRAFTING_RECIPES) {
  for (const { materialId } of r.materials) {
    addUsedIn(materialId, { name: r.name, id: r.id, type: 'gear', profession: r.profession });
  }
  if (r.componentCost) {
    for (const { materialId } of r.componentCost) {
      addUsedIn(materialId, { name: r.name, id: r.id, type: 'gear', profession: r.profession });
    }
  }
  if (r.requiredCatalyst) {
    addUsedIn(r.requiredCatalyst.rareMaterialId, { name: r.name, id: r.id, type: 'gear', profession: r.profession });
  }
}

// "Produced by" index: materialId → recipes that produce it
const producedByIndex = new Map<string, MaterialTraceInfo['producedByRecipes']>();

function addProducedBy(matId: string, entry: MaterialTraceInfo['producedByRecipes'][0]) {
  if (!producedByIndex.has(matId)) producedByIndex.set(matId, []);
  producedByIndex.get(matId)!.push(entry);
}

for (const r of REFINEMENT_RECIPES) {
  addProducedBy(r.outputId, { name: r.outputName, id: r.id, type: 'refine' });
}

for (const r of COMPONENT_RECIPES) {
  addProducedBy(r.outputMaterialId, { name: r.name, id: r.id, type: 'component' });
}

for (const r of CRAFTING_RECIPES) {
  if (r.outputMaterialId) {
    addProducedBy(r.outputMaterialId, { name: r.name, id: r.id, type: 'gear' });
  }
}

// ─── Public API ────────────────────────────────────────────────

export function getMaterialTraceInfo(materialId: string): MaterialTraceInfo {
  return {
    dropSources: {
      zones: zoneDropIndex.get(materialId) ?? [],
      mobs: mobDropIndex.get(materialId) ?? [],
    },
    usedInRecipes: usedInIndex.get(materialId) ?? [],
    producedByRecipes: producedByIndex.get(materialId) ?? [],
  };
}

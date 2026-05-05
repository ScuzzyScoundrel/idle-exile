// ============================================================
// Class Tree Registry — Phase C step 1 (engine wiring)
// ============================================================
//
// SINGLE SOURCE OF TRUTH for class talent tree structure + design data.
// Adding a new class? Two-line change:
//
//   1. import newClassTree from './newclass.json';
//   2. Add `newclass: newClassTree as ClassTreeData,` to CLASS_TREES.
//
// (You also need to add the classId to the `CharacterClass` union in
// `src/types/character.ts`, but that flips downstream tsc errors that
// guide you through every other registry that needs the new entry —
// CLASS_DEFS, CLASS_MANA_CONFIG, CLASS_TALENT_TREES, plus UI per-class
// records. The §15.4 rename commit `69ae2e6a` is a worked example.)
//
// Why JSON not TS?
//   • The 5 class trees are 80-81 nodes each (404 total). JSON keeps the
//     authoring file pure data — no risk of accidentally importing engine
//     code into design files.
//   • JSON is the lockfile artifact for design — the Phase B docs reference
//     these files as the "source-of-truth" per the design lock 2026-05-03.
//   • `resolveJsonModule: true` in tsconfig.app.json gives full type checking
//     against `ClassTreeData` at import time — malformed JSON fails the build.
//
// Engine-effect data status:
//   • The JSON nodes carry STRUCTURE (id/name/tier/ranks/description) and
//     ENGINEERING HINTS (`engineHook`, `dependencies`). They do NOT yet carry
//     typed `effects[]` data the engine can dispatch.
//   • The legacy `src/data/classTalents.ts` (typed effect data, smaller node
//     ids like `wd_voodoo_1`) remains the engine's effect source until
//     Phase F migrates effects inline into the JSON nodes.
//   • This file's helpers feed the UI (ClassTalentPanel) directly. Engine
//     dispatch (classTalentDispatcher.ts) keeps using the legacy file
//     until effect-data migration completes.

import type { CharacterClass, ClassTreeData, ClassTreeNodeData, ClassTreePathData } from '../../types';

import witchdoctorTree from './witchdoctor.json';
import assassinTree from './assassin.json';
import sorcererTree from './sorcerer.json';
import berserkerTree from './berserker.json';
import hunterTree from './hunter.json';

/**
 * The registry. Adding a class is one entry here + one import above.
 *
 * The `as ClassTreeData` cast is necessary because TS infers JSON imports
 * as their literal narrow type, but our schema treats `kind`/`category`/
 * `tier` as their string-union types. The cast trusts the JSON at the
 * boundary; TS verifies all consumer code against the wider type.
 */
export const CLASS_TREES: Record<CharacterClass, ClassTreeData> = {
  witchdoctor: witchdoctorTree as ClassTreeData,
  assassin:    assassinTree as ClassTreeData,
  sorcerer:    sorcererTree as ClassTreeData,
  berserker:   berserkerTree as ClassTreeData,
  hunter:      hunterTree as ClassTreeData,
};

/**
 * Maximum talent points per class, per design lock §6.1.
 * Currently uniform (51 per class — WoW Classic shape). If a future class
 * deviates, override here as a per-class entry.
 */
export const CLASS_TREE_MAX_POINTS = 51;

/** Lookup the JSON tree for a class. Throws on unknown classId — type union narrows this away. */
export function getClassTree(classId: CharacterClass): ClassTreeData {
  return CLASS_TREES[classId];
}

/** Flat array of every node in a class tree. */
export function getClassTreeAllNodes(classId: CharacterClass): ClassTreeNodeData[] {
  const tree = CLASS_TREES[classId];
  if (!tree) return [];
  return tree.paths.flatMap(p => p.nodes);
}

/** Find a node by id within a class tree. Returns null if missing. */
export function findClassTreeNode(classId: CharacterClass, nodeId: string): ClassTreeNodeData | null {
  const tree = CLASS_TREES[classId];
  if (!tree) return null;
  for (const path of tree.paths) {
    const node = path.nodes.find(n => n.id === nodeId);
    if (node) return node;
  }
  return null;
}

/** Find which path contains a given node id (returns path + node, or null). */
export function findClassTreeNodeWithPath(
  classId: CharacterClass,
  nodeId: string,
): { path: ClassTreePathData; node: ClassTreeNodeData } | null {
  const tree = CLASS_TREES[classId];
  if (!tree) return null;
  for (const path of tree.paths) {
    const node = path.nodes.find(n => n.id === nodeId);
    if (node) return { path, node };
  }
  return null;
}

/** All node ids for a class — useful for save validation / migration. */
export function getClassTreeNodeIds(classId: CharacterClass): string[] {
  return getClassTreeAllNodes(classId).map(n => n.id);
}

/**
 * Maximum points spendable in a class tree. Each node can be allocated up
 * to its `ranks` count, so the cap is min(class point pool, sum-of-ranks).
 */
export function getClassTreeMaxPoints(_classId: CharacterClass): number {
  return CLASS_TREE_MAX_POINTS;
}

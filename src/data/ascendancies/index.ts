// ============================================================
// Ascendancy Registry — Phase E (2026-05-05)
// ============================================================
//
// SINGLE SOURCE OF TRUTH for ascendancy tree structure + design data.
// Adding a new ascendancy?
//
//   1. Author `src/data/ascendancies/<classId>_<ascId>.json` matching
//      AscendancyTreeData.
//   2. Add 1 import + 1 entry to ASCENDANCY_TREES below.
//   3. Add the ascendancy id to CLASS_ASCENDANCY_OPTIONS for that class.
//
// Per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §10:
//   • 5 classes × 3 ascendancies = 15 trees total.
//   • Ascendancy ids match class-tree path ids (e.g. "plague_priest"
//     ascendancy mirrors the Witchdoctor's plague_priest path).
//   • The chosen ascendancy is permanent within a "life" (Phase E does
//     not implement asc-swap; future enhancement).

import type { CharacterClass, AscendancyTreeData, TalentEffect } from '../../types';

import witchdoctorPlaguePriest from './witchdoctor_plague_priest.json';
import witchdoctorSpiritWhisperer from './witchdoctor_spirit_whisperer.json';
import witchdoctorVoodooSovereign from './witchdoctor_voodoo_sovereign.json';
import { getAscendancyNodeEffectsById } from './effects';

/**
 * The registry. Adding an ascendancy is one entry here + one import above.
 *
 * The `as AscendancyTreeData` cast is necessary because TS infers JSON
 * imports as their literal narrow type. The cast trusts JSON at the
 * boundary; TS verifies all consumer code against the wider type.
 *
 * Phase E1+E2a (2026-05-05): Witchdoctor's full ascendancy set authored
 * (Plague Priest + Spirit Whisperer + Voodoo Sovereign — 3/15 done).
 * Remaining 12 trees pending — see CLASS_ASCENDANCY_OPTIONS for full list.
 *
 * Note: ASCENDANCY_TREES is keyed by ascendancy id. Ids are unique across
 * classes by design (plague_priest, blademaster, marksman, etc. don't
 * collide), so a flat record works without compound class+id keys.
 */
export const ASCENDANCY_TREES: Record<string, AscendancyTreeData> = {
  plague_priest:    witchdoctorPlaguePriest as AscendancyTreeData,
  spirit_whisperer: witchdoctorSpiritWhisperer as AscendancyTreeData,
  voodoo_sovereign: witchdoctorVoodooSovereign as AscendancyTreeData,
};

/**
 * Per-class ascendancy options. Player picks one of these at level 25.
 * Order matches the in-game UI presentation order (left → right).
 *
 * For ascendancies not yet authored, the id is still listed here so the
 * UI can show "Coming Soon" or hide the option until a JSON exists.
 * `getAscendancyTree(id)` returns `null` for not-yet-authored ids.
 */
export const CLASS_ASCENDANCY_OPTIONS: Record<CharacterClass, readonly string[]> = {
  witchdoctor: ['plague_priest', 'spirit_whisperer', 'voodoo_sovereign'],
  assassin:    ['blademaster', 'venomcraft', 'shadowdancer'],
  sorcerer:    ['elementalist', 'arcanist', 'specialist'],
  berserker:   ['warlord', 'reaver', 'juggernaut'],
  hunter:      ['marksman', 'beastmaster', 'trapper'],
};

/** Lookup an ascendancy tree by id. Returns `null` for not-yet-authored. */
export function getAscendancyTree(id: string | null): AscendancyTreeData | null {
  if (!id) return null;
  return ASCENDANCY_TREES[id] ?? null;
}

/** Find an ascendancy node by id within a tree. */
export function findAscendancyNode(treeId: string, nodeId: string) {
  const tree = ASCENDANCY_TREES[treeId];
  if (!tree) return null;
  return tree.nodes.find(n => n.id === nodeId) ?? null;
}

/** Available ascendancy options for a class — filters to authored trees. */
export function getAvailableAscendanciesForClass(charClass: CharacterClass): AscendancyTreeData[] {
  return CLASS_ASCENDANCY_OPTIONS[charClass]
    .map(id => ASCENDANCY_TREES[id])
    .filter((t): t is AscendancyTreeData => !!t);
}

/**
 * Resolve an ascendancy node's runtime effects.
 *
 * Same precedence rules as classTrees/index.ts:getNodeEffects:
 *   1. Inline `effects?` field on the JSON node.
 *   2. Side-table lookup via `effects.ts`.
 *   3. Empty array — node is decorative (still costs a point).
 */
export function getAscendancyNodeEffects(treeId: string, nodeId: string): TalentEffect[] {
  const node = findAscendancyNode(treeId, nodeId);
  if (!node) return [];
  const inline = node.effects ?? [];
  const sideTable = getAscendancyNodeEffectsById(nodeId);
  return [...inline, ...sideTable];
}

/** All node ids across all authored ascendancies — useful for save validation. */
export function getAllAscendancyNodeIds(): string[] {
  const ids: string[] = [];
  for (const tree of Object.values(ASCENDANCY_TREES)) {
    for (const node of tree.nodes) ids.push(node.id);
  }
  return ids;
}

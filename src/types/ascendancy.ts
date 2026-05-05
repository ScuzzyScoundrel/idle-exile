// ============================================================
// Ascendancy — JSON authoring source-of-truth shape (Phase E)
// ============================================================
//
// Per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §10:
//   • 3 ascendancies per class (one per loadout archetype / class-tree path).
//   • Each ascendancy is a small compact tree (~8 nodes).
//   • Unlocked at level 25 (per §13 "Open Decisions" recommendation).
//   • Separate point pool from class talents (does NOT compete for points).
//   • Capstone effect mirrors §10.1 ascendancy draft (e.g. Plague Priest:
//     "Poison stack cap +15. Pandemic spreads to 2 targets on death.").
//
// Authoring file pattern: ONE JSON file per ascendancy at
// `src/data/ascendancies/<classId>_<ascendancyId>.json`. The 15 files share
// this shape via `resolveJsonModule: true` typing.
//
// Ascendancy node ids: namespaced as `asc_<classShort>_<ascShort>_<name>`,
// e.g. `asc_wd_pp_apothecary_reservoir`. The `asc_` prefix avoids collision
// with class-tree node ids (which use `<classShort>_<pathShort>_<name>`).

import type { CharacterClass } from './character';
import type { TalentEffect } from './skills';

/** A single node in an ascendancy tree. */
export interface AscendancyNodeData {
  /** Stable identifier — used as save-data key. NEVER renumber. */
  id: string;
  /** Player-facing title. */
  name: string;
  /** Tier 1-3 (compact tree). Capstone is always tier 3. */
  tier: number;
  /** Total ranks (each rank = 1 ascendancy point sink). */
  ranks: number;
  /** Player-facing prose; per-rank scaling described inline. */
  description: string;
  /**
   * Engineering hint — engine event/site this node modifies.
   * Same convention as ClassTreeNodeData.engineHook.
   */
  engineHook: string;
  /** Engine-mechanic dependencies (cross-node or base-mechanic deps). */
  dependencies: string[];
  /** Prerequisite node id — must be allocated before this node unlocks. */
  requiresNodeId?: string;
  /** Optional inline TypedEffect array (forward-compatible). */
  effects?: TalentEffect[];
  /** Marks the §10.1 keystone effect — drives UI styling. */
  isCapstone?: boolean;
}

/** A full ascendancy tree — 8 nodes, mirrors one class-tree path. */
export interface AscendancyTreeData {
  /** $schema link for editor IntelliSense. */
  $schema?: string;
  /** Stable identifier — must equal one of the class-tree path ids
   *  for the parent class (e.g. "plague_priest" for Witchdoctor). */
  id: string;
  /** Class identifier — must match a `CharacterClass` union variant. */
  classId: CharacterClass;
  /** Player-facing title (e.g. "Plague Priest"). */
  name: string;
  /** Player-facing one-line theme. */
  theme: string;
  /** Schema version — bump when AscendancyTreeData shape changes. */
  version: number;
  /** ISO date authored — for audit trail. */
  authoredDate: string;
  /** Total node count — included for cross-ascendancy consistency checks. */
  totalNodes: number;
  /** Author notes — design intent + consistency check log. */
  designNotes?: string[];
  nodes: AscendancyNodeData[];
}

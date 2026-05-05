// ============================================================
// Class Tree — JSON authoring source-of-truth shape
// ============================================================
//
// This is the typed shape of `src/data/classTrees/*.json` — the Phase B
// design lock for per-class talent trees. ONE JSON file per class.
//
// Authoring goals:
//   • Structure (id, name, ranks, prereqs, tier, kind) lives here.
//   • Player-facing prose (name, description) lives here.
//   • Engineering hooks (`engineHook` strings, `dependencies` array) hint
//     at what the engine needs to wire to make a node mechanically live —
//     the actual runtime effect dispatch is engine code, not data.
//   • Optional `effects?: TalentEffect[]` field on a node lets authors
//     embed engine-ready typed effect data INLINE for nodes whose engine
//     wiring already exists. Phase F will migrate the legacy
//     `src/data/classTalents.ts` effect data into this field per node;
//     until then, that legacy file remains the engine's effect source.
//
// Adding a new class:
//   1. Author `src/data/classTrees/<classId>.json` matching ClassTreeData.
//   2. Add 1 import + 1 entry in `src/data/classTrees/index.ts`.
//   3. Add the classId to `CharacterClass` union in `src/types/character.ts`.
//   4. Wire mana config + skill data + class def + UI labels in their
//      respective single-file registries.
//
// (For the full new-class checklist, see the Phase B design lock docs.)
//
// Companion: `src/data/classTrees/index.ts` consumes this shape via
// resolveJsonModule-typed imports; `ClassTalentPanel.tsx` renders it.

import type { CharacterClass } from './character';
import type { TalentEffect } from './skills';

/** Node kind — drives UI styling + max-rank display. */
export type ClassTreeNodeKind = 'passive' | 'capstone' | 'capstone_supporting';

/** Node category — drives icon/colour + organising filters. */
export type ClassTreeNodeCategory =
  | 'stat'             // Pure stat-stick (e.g. +max-poison-stacks)
  | 'proc'             // Roll-on-event proc (e.g. on-crit chance to do X)
  | 'conditional'      // Stat that activates on a condition (e.g. while Hexed)
  | 'identity'         // Singular keystone-flavored mechanic (e.g. Pandemic+1 target)
  | 'buff_migration';  // Migrated from a removed active buff (per SKILL_FANTASY_AUDIT)

/** A single node in a class tree. */
export interface ClassTreeNodeData {
  /** Stable identifier — used as save-data key. NEVER renumber. */
  id: string;
  /** Player-facing title. */
  name: string;
  /** 1-7 (gates apply per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §6.1). */
  tier: number;
  /** Node kind — passive vs capstone. */
  kind: ClassTreeNodeKind;
  /** Total ranks (each rank = 1 talent point sink). */
  ranks: number;
  /** UX/filter category. */
  category: ClassTreeNodeCategory;
  /** Player-facing prose (per-rank scaling described inline, e.g. "+1/2/3/4/5%"). */
  description: string;
  /**
   * Engineering hint — the engine event/site this node modifies. Schema
   * convention: dotted/colon-separated namespace (e.g. `onChaosDotTick`,
   * `conditionalStat:dotDamage:enemyHpBelow50`, `modifyMechanic:pandemic`).
   * Not yet a registry; consumed by Phase F engine wiring.
   */
  engineHook: string;
  /**
   * Engine-mechanic dependencies — names of base mechanics this node
   * presupposes (e.g. `["poisonStackCap"]`, `["healingPotions"]`,
   * `["wd_pp_plague_aura"]` for cross-node deps). Used to flag nodes that
   * cannot be enabled until their dependency lands.
   */
  dependencies: string[];
  /** Prerequisite node id — must be allocated before this node unlocks. */
  requiresNodeId?: string;
  /**
   * Optional inline TypedEffect array. Forward-compatible: nodes whose
   * engine wiring exists today can embed effects here and bypass the
   * legacy `classTalents.ts` lookup. Until Phase F migrates that data,
   * most nodes will leave this undefined.
   */
  effects?: TalentEffect[];
}

/** A path within a class tree — one of 3 paths per class. */
export interface ClassTreePathData {
  /** Stable identifier (e.g. "plague_priest", "marksman"). */
  id: string;
  /** Player-facing title. */
  name: string;
  /** Player-facing one-line theme. */
  theme: string;
  /**
   * Ascendancy mirror — name of the ascendancy this path conceptually
   * pairs with (per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §10.1). Phase E
   * uses this to wire the ascendancy bonus tier on top of the path.
   */
  ascendancyMirror?: string;
  nodes: ClassTreeNodeData[];
}

/** A complete class tree — 3 paths, ~80 nodes total. */
export interface ClassTreeData {
  /** $schema link for editor IntelliSense (does not affect runtime). */
  $schema?: string;
  /** Class identifier — must match a `CharacterClass` union variant. */
  classId: CharacterClass;
  /** Schema version — bump when ClassTreeData shape changes. */
  version: number;
  /** ISO date authored — for audit trail. */
  authoredDate: string;
  /** One-line lockfile reference (mirrors the "spec" line in the JSON). */
  spec?: string;
  /** Total node count — included for cross-class consistency checks. */
  totalNodes: number;
  /** Identity-kind node count (audit field). */
  identityCount?: number;
  /** Multi-rank passive count (audit field). */
  multiRankCount?: number;
  /** Author notes — design intent + consistency check log. */
  designNotes?: string[];
  paths: ClassTreePathData[];
}

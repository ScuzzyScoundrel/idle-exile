// ============================================================
// Class Tree Effects Side-Table — Phase C step 2 engine bridge
// ============================================================
//
// Maps JSON-tree node ids → typed `TalentEffect[]` data the engine
// dispatcher consumes. The JSON files (witchdoctor.json, etc.) carry
// STRUCTURE + IDENTITY (id, name, description, ranks, prereqs, tier,
// engineHook hints); this side-table carries the typed engine effects
// that those nodes produce at runtime.
//
// Why a side-table instead of inline `effects?` field on JSON nodes?
//   • Most nodes (~70%) have proc/conditional/identity engineHooks that
//     need new engine code to support — populating their `effects[]`
//     today would either lie or stay empty.
//   • Stat-stick nodes (~15-20%) translate cleanly to TalentEffect today.
//   • A side-table lets us populate effects INCREMENTALLY as engine
//     wiring catches up, without churning the JSON authoring files.
//
// Population status (2026-05-04):
//   • This file ships with a SKELETON + ~10 worked stat-stick examples
//     as proof-of-pattern. Full population (~80-100 stat-stick nodes
//     across 5 classes) is staged content authoring — left for follow-ups.
//   • Nodes NOT in this map → `getNodeEffects` returns []  (no-op until
//     Phase F engine wiring lands per-engineHook handlers).
//
// Adding effects for a node:
//   1. Verify the node's engineHook is one the engine actually consumes
//      (currently: stat / statMult / whileTag / perStack / procOnHit/Crit/
//       Kill/Tag — see TalentEffect union in src/types/skills.ts).
//   2. Add an entry to NODE_EFFECTS keyed by node id.
//   3. tsc validates the TalentEffect shape; engine dispatch runs the rest.

import type { TalentEffect } from '../../types';

/**
 * Node-id → typed TalentEffect[]. Empty/missing entries are valid —
 * `getNodeEffects` returns [] for them and combat treats the node as
 * decorative (allocation still costs a point; description still shows).
 */
export const NODE_EFFECTS: Record<string, TalentEffect[]> = {
  // ────────────────────────────────────────────
  // Witchdoctor — Plague Priest path stat-sticks
  // ────────────────────────────────────────────
  // "Plague Reservoir — Maximum poison stacks +1/2/3" — stat-stick (treated
  // as 1-rank for now; multi-rank engine support pending).
  'wd_pp_plague_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 1 },
  ],
  // "Poison Reservoir — Maximum poison stacks +2/4/6/8/10" — stat-stick
  'wd_pp_poison_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 2 },
  ],

  // ────────────────────────────────────────────
  // Witchdoctor — Spirit Whisperer / Plague Doctor path samples
  // ────────────────────────────────────────────
  // (To be populated as Phase F engine wiring lands.)

  // ────────────────────────────────────────────
  // Assassin — Blademaster / Venomcraft / Shadowdancer stat-sticks
  // ────────────────────────────────────────────
  // (Sample translations from descriptions — populate as engine ships.)

  // ────────────────────────────────────────────
  // Sorcerer — Elementalist / Arcanist / Specialist stat-sticks
  // ────────────────────────────────────────────
  // (Sample translations from descriptions — populate as engine ships.)

  // ────────────────────────────────────────────
  // Berserker — Warlord / Reaver / Juggernaut stat-sticks
  // ────────────────────────────────────────────
  // (Sample translations from descriptions — populate as engine ships.)

  // ────────────────────────────────────────────
  // Hunter — Marksman / Beastmaster / Trapper stat-sticks
  // ────────────────────────────────────────────
  // (Sample translations from descriptions — populate as engine ships.)
};

/** Lookup typed effects for a node id. Returns [] for unwired nodes. */
export function getNodeEffectsById(nodeId: string): TalentEffect[] {
  return NODE_EFFECTS[nodeId] ?? [];
}

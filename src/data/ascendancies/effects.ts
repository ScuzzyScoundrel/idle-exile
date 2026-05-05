// ============================================================
// Ascendancy Effects Side-Table — engine bridge for JSON nodes
// ============================================================
//
// Maps ascendancy node ids → typed `TalentEffect[]` for the dispatcher.
// Same shape + scaling pipeline as `data/classTrees/effects.ts`.
// `engine/classTalentDispatcher.ts:scaleTalentEffectByRank` handles
// per-rank scaling — entries here are authored at rank-1 values.
//
// Engine support audit (per engine/classTalentDispatcher.ts):
//   WIRED   stat / statMult / whileTag / perStack / 4× procOn*,
//           actions: applyTag (TALENT_TAG_TO_DEBUFF: hex/curse/mark/
//           poison/bleed/ignite/chill/shock/frozen) + healSelf
//   STUBS   summon / triggerSkill / grantBuff / grantTagOnSkill, plus
//           all signature-mechanic events (modifyMechanic:pandemic /
//           modifyMechanic:plagueAuraDamage / etc.)
//
// Phase E1 status: only entries with already-wired effects are populated.
// Mechanic-event nodes (Diffuse Mastery, Endemic Pulse, Plague Sovereign,
// Festering Aftermath) stay empty until Phase F engine wiring lands.

import type { TalentEffect } from '../../types';

/**
 * Node-id → typed TalentEffect[]. Empty/missing entries are valid —
 * `getAscendancyNodeEffectsById` returns [] for them and combat treats
 * the node as decorative (allocation still costs a point; description
 * still shows).
 */
export const ASCENDANCY_NODE_EFFECTS: Record<string, TalentEffect[]> = {

  // ── Witchdoctor — Plague Priest ────────────────────────────────────
  // Forward-compat seed: maxPoisonStacks not yet on ResolvedStats; the
  // dispatcher silent-no-ops unknown stats so this activates when the
  // stat lands on the type.
  'asc_wd_pp_apothecarys_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 1 },
  ],
  // "+1% chaos damage" rank-1 → scales linearly to +5% at rank 5.
  'asc_wd_pp_slow_death_bloom': [
    { kind: 'stat', stat: 'incChaosDamage', delta: 1 },
  ],
  // "+2% damage vs hexed targets" rank-1 → +10% at rank 5.
  'asc_wd_pp_plague_bearers_mark': [
    { kind: 'whileTag', tag: 'hex', stat: 'damageMult', mult: 1.02 },
  ],
  // Capstone: forward-compat seed for max-poison-stacks +15.
  'asc_wd_pp_plague_sovereign': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 15 },
  ],
};

/** Lookup typed effects for an ascendancy node id. */
export function getAscendancyNodeEffectsById(nodeId: string): TalentEffect[] {
  return ASCENDANCY_NODE_EFFECTS[nodeId] ?? [];
}

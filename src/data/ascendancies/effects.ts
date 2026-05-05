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

  // ── Witchdoctor — Spirit Whisperer ─────────────────────────────────
  // Every node here is decorative pending Phase F minion-event wiring.
  // Forward-compat seeds use stat keys not yet on ResolvedStats — the
  // dispatcher silent-no-ops them today, activates when the stat lands.
  'asc_wd_sw_soul_anchor': [
    { kind: 'stat', stat: 'minionHp', delta: 2 },
  ],
  'asc_wd_sw_pack_tempo': [
    { kind: 'stat', stat: 'minionAttackSpeed', delta: 2 },
  ],

  // ── Witchdoctor — Voodoo Sovereign ─────────────────────────────────
  // 5 of 8 nodes have working effects today (whileTag, stat, perStack,
  // procOnCrit). Witch's Eye + Hex Reaver + Crowned in Curses capstone
  // need new engine hooks (cross-weapon hex apply, on-kill stack-buff
  // counter, hex-can-crit + hex-consume-multiplier) — Phase F.

  // "+1% damage vs hexed" rank-1 → +5% at rank 5 (linear scaling).
  'asc_wd_vs_curse_affinity': [
    { kind: 'whileTag', tag: 'hex', stat: 'damageMult', mult: 1.01 },
  ],
  // "+1% chaos damage" rank-1 → +5% at rank 5.
  'asc_wd_vs_voodoo_strength': [
    { kind: 'stat', stat: 'incChaosDamage', delta: 1 },
  ],
  // "5% chance on crit to apply Hexed" rank-1 → 15% at rank 3.
  'asc_wd_vs_hex_mark': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'hex', stacks: 1, duration: 6 } },
  ],
  // "+2% damage per hex stack on target" rank-1 → +6% per-stack at rank 3.
  'asc_wd_vs_curse_bound': [
    { kind: 'perStack', stack: 'hex', stat: 'damageMult', perStackDelta: 0.02, cap: 0.06 },
  ],
  // "5% chance on crit to apply 2 hex stacks" — broadened to all crits
  // (engine cannot filter procOnCrit by target tag today). Rank-1 → 25%
  // at rank 5.
  'asc_wd_vs_bloodied_curse': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'hex', stacks: 2, duration: 6 } },
  ],

  // ── Assassin — Blademaster ────────────────────────────────────────
  // 3 of 8 wired today (foundation stat-sticks). Crit Cascade mechanic +
  // dual-wield offhand check + cooldown-refund-on-crit are Phase F.
  'asc_asn_bm_honed_apex': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  'asc_asn_bm_bladework_mastery': [
    { kind: 'stat', stat: 'attackSpeed', delta: 1 },
  ],
  'asc_asn_bm_twin_edge': [
    { kind: 'stat', stat: 'critMultiplier', delta: 5 },
  ],

  // ── Assassin — Venomcraft ─────────────────────────────────────────
  // 6 of 8 wired today (heaviest wire-rate of the Asn set due to poison
  // palette match). Toxic Saint capstone (poison-can-crit + decay-pause)
  // and the maxPoisonStacks seed are Phase F / forward-compat.
  'asc_asn_vc_snake_charmer': [
    { kind: 'stat', stat: 'incChaosDamage', delta: 1 },
  ],
  'asc_asn_vc_lingering_toxin': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 0.5 },
  ],
  'asc_asn_vc_vile_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 1 },
  ],
  // "+2% damage per poison stack on target" rank-1 → +6% at rank 3.
  'asc_asn_vc_poison_mastery': [
    { kind: 'perStack', stack: 'poison', stat: 'damageMult', perStackDelta: 0.02, cap: 0.06 },
  ],
  // "5% chance on crit to apply 2 poison stacks" — broadened (no target
  // filter on procOnCrit). Rank-1 → 25% at rank 5.
  'asc_asn_vc_tainted_strike': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'poison', stacks: 2, duration: 6 } },
  ],
  // "+10% damage vs poisoned" 1-rank.
  'asc_asn_vc_withering_reach': [
    { kind: 'whileTag', tag: 'poison', stat: 'damageMult', mult: 1.10 },
  ],
  // "+5% damage vs poisoned" rank-1 → +15% at rank 3 (stacks via the
  // mult-update rule: 1 + 0.05 * 3 = 1.15).
  'asc_asn_vc_predators_patience': [
    { kind: 'whileTag', tag: 'poison', stat: 'damageMult', mult: 1.05 },
  ],

  // ── Assassin — Shadowdancer ───────────────────────────────────────
  // 6 of 8 wired today. First-hit-Mark + Mark-hit-generates-Momentum
  // capstone, plus Twin Marks chain-count, need Phase F.
  'asc_asn_sd_stalkers_eye': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  'asc_asn_sd_phantom_step': [
    { kind: 'stat', stat: 'cooldownRecovery', delta: 1 },
  ],
  'asc_asn_sd_killers_grace': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 0.5 },
  ],
  // "+1% damage vs marked" rank-1 → +5% at rank 5.
  'asc_asn_sd_mark_stalker': [
    { kind: 'whileTag', tag: 'mark', stat: 'damageMult', mult: 1.01 },
  ],
  // "10% chance on crit to apply Mark" rank-1 → 30% at rank 3.
  'asc_asn_sd_shadow_reach': [
    { kind: 'procOnCrit', chance: 10, action: { kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  // "+10% damage vs marked" rank-1 → +30% at rank 3 (stacks deeper).
  'asc_asn_sd_mark_hunter': [
    { kind: 'whileTag', tag: 'mark', stat: 'damageMult', mult: 1.10 },
  ],
};

/** Lookup typed effects for an ascendancy node id. */
export function getAscendancyNodeEffectsById(nodeId: string): TalentEffect[] {
  return ASCENDANCY_NODE_EFFECTS[nodeId] ?? [];
}

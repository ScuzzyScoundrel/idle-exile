// ============================================================
// Class Tree Effects Side-Table — engine bridge for JSON nodes
// ============================================================
//
// Maps JSON-tree node ids → typed `TalentEffect[]` data the engine
// dispatcher consumes. The JSON files (witchdoctor.json etc.) carry
// STRUCTURE + IDENTITY (id, name, description, ranks, prereqs, tier,
// engineHook hints); this side-table carries the typed engine effects
// those nodes produce at runtime.
//
// Engine support audit (see engine/classTalentDispatcher.ts):
//   FULLY WIRED  : `stat`, `statMult`, `whileTag`, `perStack`,
//                  `procOnHit`, `procOnCrit`, `procOnKill`, `procOnTag`
//   ACTIONS WIRED: `applyTag`, `healSelf`
//   STUBS        : `summon`, `triggerSkill`, `grantBuff`, `grantTagOnSkill`
//
// `applyTag` works for tags registered in TALENT_TAG_TO_DEBUFF:
//   hex / curse / mark / poison / bleed / ignite / chill / shock / frozen.
//
// Authoring conventions for the entries below:
//   • Rank-1 values only (multi-rank engine support pending Phase D).
//   • `whileTag … damageMult` is the canonical "+X% damage vs tagged" form
//     (engine special-cases damageMult; multiplying %-based stats would
//     misbehave). For DoT/element-specific bonuses where this is too broad,
//     the entry is omitted (decorative — node is allocatable but no-op).
//   • `perStack` keyed on a TalentTag counts that tag's stacks on the
//     target — see TALENT_TAG_TO_DEBUFF for valid keys.
//   • Some entries reference stats (e.g. `maxPoisonStacks`) NOT in
//     `ResolvedStats.StatKey`. The dispatcher silent-no-ops unknown keys
//     so these are forward-compat seeds — they activate when the stat
//     lands on `ResolvedStats`.
//   • Capstones, signature-mechanic identity nodes, summon/trigger/buff
//     procs, mechanic-event hooks (onResonanceChargeGain, onMinionDeath,
//     onTrapDetonate, onFrenziedEnter, …) are NOT in this map — those
//     ride on Phase F engine wiring and are intentionally decorative
//     until then.
//
// Adding effects for a node:
//   1. Verify the node's engineHook is currently consumed by the
//      dispatcher (stat / statMult / whileTag / perStack / procOnHit /
//      procOnCrit / procOnKill / procOnTag) and the action is `applyTag`
//      or `healSelf`.
//   2. Add an entry to NODE_EFFECTS keyed by the JSON node id.
//   3. tsc validates the TalentEffect shape; engine dispatch handles the rest.

import type { TalentEffect } from '../../types';

/**
 * Node-id → typed TalentEffect[]. Empty/missing entries are valid —
 * `getNodeEffects` returns [] for them and combat treats the node as
 * decorative (allocation still costs a point; description still shows).
 */
export const NODE_EFFECTS: Record<string, TalentEffect[]> = {

  // ====================================================================
  // WITCHDOCTOR
  // ====================================================================

  // ── Plague Priest path ──────────────────────────────────────────────
  // Stack-cap seeds (forward-compat: maxPoisonStacks not yet on ResolvedStats).
  'wd_pp_plague_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 1 },
  ],
  'wd_pp_poison_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 2 },
  ],
  // "Hexed enemies take +10% damage from your DoTs." — broadened to global
  // damageMult vs hexed (engine cannot isolate DoT damage on whileTag).
  'wd_pp_festering_wound': [
    { kind: 'whileTag', tag: 'hex', stat: 'damageMult', mult: 1.10 },
  ],

  // ── Voodoo Sovereign path ───────────────────────────────────────────
  // "Hexed enemies take +10% damage from chaos sources." — broadened to
  // global damageMult vs hexed (engine cannot isolate chaos channel).
  'wd_vs_brand_of_suffering': [
    { kind: 'whileTag', tag: 'hex', stat: 'damageMult', mult: 1.10 },
  ],
  // "All your skills, regardless of weapon, apply Hexed on crit." —
  // procOnCrit + applyTag(hex) at 100% chance.
  'wd_vs_voodoo_mark': [
    { kind: 'procOnCrit', chance: 100, action: { kind: 'applyTag', tag: 'hex', stacks: 1, duration: 6 } },
  ],

  // ── Spirit Whisperer path ──────────────────────────────────────────
  // Minion-event nodes — no engine wiring today; left empty.

  // ====================================================================
  // ASSASSIN
  // ====================================================================

  // ── Blademaster path ────────────────────────────────────────────────
  'asn_bm_honed_edge': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  'asn_bm_bladework': [
    { kind: 'stat', stat: 'attackSpeed', delta: 2 },
  ],
  'asn_bm_cutting_edge': [
    { kind: 'stat', stat: 'critMultiplier', delta: 5 },
  ],
  // Crit-stack ceiling (forward-compat: maxCritStacks not yet on ResolvedStats).
  'asn_bm_cascade_reservoir': [
    { kind: 'stat', stat: 'maxCritStacks', delta: 1 },
  ],
  'asn_bm_crit_mastery': [
    { kind: 'stat', stat: 'critChance', delta: 2 },
  ],

  // ── Venomcraft path ─────────────────────────────────────────────────
  // "+5% poison damage" — approximated as +5% chaos channel.
  'asn_vc_toxic_edge': [
    { kind: 'stat', stat: 'incChaosDamage', delta: 5 },
  ],
  'asn_vc_lingering_doom': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 0.5 },
  ],
  'asn_vc_vile_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 1 },
  ],
  // "+1% damage per active poison stack on target."
  'asn_vc_acrid_concentration': [
    { kind: 'perStack', stack: 'poison', stat: 'damageMult', perStackDelta: 0.01, cap: 0.05 },
  ],
  'asn_vc_toxin_reservoir': [
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 2 },
  ],
  // "Critical hits apply 1 stack of poison automatically."
  'asn_vc_necrotic_bite': [
    { kind: 'procOnCrit', chance: 100, action: { kind: 'applyTag', tag: 'poison', stacks: 1, duration: 6 } },
  ],
  // "Poisoned enemies take +5% damage from all sources."
  'asn_vc_curare': [
    { kind: 'whileTag', tag: 'poison', stat: 'damageMult', mult: 1.05 },
  ],

  // ── Shadowdancer path ───────────────────────────────────────────────
  'asn_sd_phantom_step': [
    { kind: 'stat', stat: 'cooldownRecovery', delta: 1 },
  ],

  // ====================================================================
  // SORCERER
  // ====================================================================

  // ── Elementalist path ───────────────────────────────────────────────
  'sor_el_element_affinity': [
    { kind: 'stat', stat: 'incElementalDamage', delta: 1 },
  ],
  'sor_el_conduit_mastery': [
    { kind: 'stat', stat: 'spellPower', delta: 5 },
  ],

  // ── Arcanist path ───────────────────────────────────────────────────
  // Resonance bank-size seed (maxResonanceCharges not yet on ResolvedStats).
  'sor_ar_bank_mastery': [
    { kind: 'stat', stat: 'maxResonanceCharges', delta: 1 },
  ],

  // ── Specialist path ─────────────────────────────────────────────────
  'sor_sp_pyre_affinity': [
    { kind: 'stat', stat: 'incFireDamage', delta: 2 },
  ],
  'sor_sp_frost_affinity': [
    { kind: 'stat', stat: 'incColdDamage', delta: 2 },
  ],
  'sor_sp_storm_affinity': [
    { kind: 'stat', stat: 'incLightningDamage', delta: 2 },
  ],
  // "Ignite damage +5%." — approximated as global ailmentPotency
  // (broader than ignite-only, but the closest live stat).
  'sor_sp_ignite_mastery': [
    { kind: 'stat', stat: 'ailmentPotency', delta: 5 },
  ],
  // "Shocked enemies take +2% damage per Shock stack."
  'sor_sp_shock_mastery': [
    { kind: 'perStack', stack: 'shock', stat: 'damageMult', perStackDelta: 0.02, cap: 0.10 },
  ],
  'sor_sp_element_mastery': [
    { kind: 'stat', stat: 'incElementalDamage', delta: 5 },
  ],

  // ====================================================================
  // BERSERKER
  // ====================================================================

  // ── Warlord path ────────────────────────────────────────────────────
  'brs_wl_heavy_hands': [
    { kind: 'statMult', stat: 'damageMult', mult: 1.02 },
  ],
  'brs_wl_brutal_tempo': [
    { kind: 'stat', stat: 'attackSpeed', delta: 1 },
  ],
  'brs_wl_power_surge': [
    { kind: 'statMult', stat: 'damageMult', mult: 1.02 },
  ],
  // Phase F F1a (2026-05-05): whileTargetHpBelow unlocks Warlord execute
  // tier. "+2/4/6/8/10% damage to enemies below 50% HP" rank-1 → +10% at rank 5.
  'brs_wl_threshold_hunter': [
    { kind: 'whileTargetHpBelow', threshold: 0.5, stat: 'damageMult', mult: 1.02 },
  ],
  // "+10/20/30/40/50% damage to enemies below 25% HP" rank-1 → +50% at rank 5
  // (deeper execute scaling).
  'brs_wl_apex_predator': [
    { kind: 'whileTargetHpBelow', threshold: 0.25, stat: 'damageMult', mult: 1.10 },
  ],

  // ── Reaver path ─────────────────────────────────────────────────────
  'brs_rv_wound_tolerance': [
    { kind: 'stat', stat: 'maxLife', delta: 5 },
  ],
  // Phase F F1a (2026-05-05): whileSelfHpBelow unlocks Reaver low-HP tier.
  // "+2/4/6/8/10% damage while below 50% HP" rank-1 → +10% at rank 5.
  'brs_rv_hunger': [
    { kind: 'whileSelfHpBelow', threshold: 0.5, stat: 'damageMult', mult: 1.02 },
  ],

  // ── Juggernaut path ─────────────────────────────────────────────────
  'brs_jg_stalwart': [
    { kind: 'stat', stat: 'maxLife', delta: 5 },
  ],
  'brs_jg_iron_body': [
    { kind: 'stat', stat: 'damageTakenReduction', delta: 1 },
  ],
  'brs_jg_battle_stance': [
    { kind: 'stat', stat: 'critMultiplier', delta: 2 },
  ],
  'brs_jg_bulwark': [
    { kind: 'stat', stat: 'maxLife', delta: 10 },
  ],

  // ====================================================================
  // HUNTER
  // ====================================================================

  // ── Marksman path ───────────────────────────────────────────────────
  'hnt_mm_steady_aim': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  'hnt_mm_crit_mastery': [
    { kind: 'stat', stat: 'critChance', delta: 2 },
  ],
  // "+1% damage to Marked targets."
  'hnt_mm_mark_hunter': [
    { kind: 'whileTag', tag: 'mark', stat: 'damageMult', mult: 1.01 },
  ],

  // ── Beastmaster path ────────────────────────────────────────────────
  // Companion-event nodes — no engine wiring today; left empty.

  // ── Trapper path ────────────────────────────────────────────────────
  // Trap-event nodes — no engine wiring today; left empty.
};

/** Lookup typed effects for a node id. Returns [] for unwired nodes. */
export function getNodeEffectsById(nodeId: string): TalentEffect[] {
  return NODE_EFFECTS[nodeId] ?? [];
}

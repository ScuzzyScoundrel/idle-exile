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
  // Capstone: Phase F F5e (2026-05-06) — grantPandemic + +15
  // maxPoisonStacks (forward-compat seed). zoneAttack.ts dyingMobs
  // loop spreads DoTs to surviving pack mobs when allocated.
  'asc_wd_pp_plague_sovereign': [
    { kind: 'grantPandemic' },
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
    { kind: 'stat', stat: 'ailmentDuration', delta: 50 },
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
    { kind: 'stat', stat: 'ailmentDuration', delta: 50 },
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

  // ── Sorcerer — Elementalist ───────────────────────────────────────
  // 4 of 8 wired today. Resonance mechanic + conversion-stack-cap +
  // hybrid-damage-types condition + Element Cascade cooldown action
  // are decorative until Phase F.
  'asc_sor_el_element_affinity': [
    { kind: 'stat', stat: 'incElementalDamage', delta: 1 },
  ],
  'asc_sor_el_chaos_tap': [
    { kind: 'stat', stat: 'incChaosDamage', delta: 1 },
  ],
  // "5% chance on crit to apply Chill" rank-1 → 15% at rank 3.
  'asc_sor_el_spell_cycle': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'chill', stacks: 1, duration: 4 } },
  ],
  // "+5% damage vs shocked" rank-1 → +15% at rank 3.
  'asc_sor_el_element_pulse': [
    { kind: 'whileTag', tag: 'shock', stat: 'damageMult', mult: 1.05 },
  ],

  // ── Sorcerer — Arcanist ───────────────────────────────────────────
  // 4 of 8 wired today. Resonance bank-size + cast-speed burst on
  // Resonance spend + maxMana stat (mana not on ResolvedStats yet)
  // are decorative until Phase F.
  'asc_sor_ar_spell_mastery': [
    { kind: 'stat', stat: 'spellPower', delta: 1 },
  ],
  'asc_sor_ar_channel_tempo': [
    { kind: 'stat', stat: 'castSpeed', delta: 1 },
  ],
  // Forward-compat seed: maxResonanceCharges not on ResolvedStats.
  'asc_sor_ar_bank_mastery': [
    { kind: 'stat', stat: 'maxResonanceCharges', delta: 1 },
  ],
  'asc_sor_ar_resonant_crit': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  // Forward-compat seed: maxMana not on ResolvedStats.
  'asc_sor_ar_bank_reservoir': [
    { kind: 'stat', stat: 'maxMana', delta: 20 },
  ],
  // "+5% damage vs shocked" rank-1 → +15% at rank 3.
  'asc_sor_ar_spell_cascade': [
    { kind: 'whileTag', tag: 'shock', stat: 'damageMult', mult: 1.05 },
  ],

  // ── Sorcerer — Specialist ─────────────────────────────────────────
  // 7 of 8 wired today — heaviest wire-rate of any ascendancy so far,
  // due to clean element-specific damage stats + whileTag for chill/
  // shock/ignite. Avatar of Element capstone (chosen-element pick UI)
  // is decorative until Phase F.
  'asc_sor_sp_pyre_affinity': [
    { kind: 'stat', stat: 'incFireDamage', delta: 2 },
  ],
  'asc_sor_sp_frost_affinity': [
    { kind: 'stat', stat: 'incColdDamage', delta: 2 },
  ],
  'asc_sor_sp_storm_affinity': [
    { kind: 'stat', stat: 'incLightningDamage', delta: 2 },
  ],
  // "+5% damage vs ignited" rank-1 → +25% at rank 5.
  'asc_sor_sp_ignite_mastery': [
    { kind: 'whileTag', tag: 'ignite', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_sor_sp_chill_mastery': [
    { kind: 'whileTag', tag: 'chill', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_sor_sp_shock_mastery': [
    { kind: 'whileTag', tag: 'shock', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_sor_sp_element_crit': [
    { kind: 'stat', stat: 'critMultiplier', delta: 5 },
  ],

  // ── Berserker — Warlord ───────────────────────────────────────────
  // 6 of 8 wired today. Threshold Push (rageThresholdHpPercent stat)
  // and King of Ruin capstone (threshold +15% + execute bonus) are
  // decorative until Phase F lands the Rage Threshold mechanic.
  'asc_brs_wl_heavy_hands': [
    { kind: 'statMult', stat: 'damageMult', mult: 1.01 },
  ],
  'asc_brs_wl_bloodlust_tempo': [
    { kind: 'stat', stat: 'attackSpeed', delta: 1 },
  ],
  // "+5% damage vs bleeding" rank-1 → +15% at rank 3.
  'asc_brs_wl_threshold_hunter': [
    { kind: 'whileTag', tag: 'bleed', stat: 'damageMult', mult: 1.05 },
  ],
  // "1% chance on crit to apply 2 bleed stacks" rank-1 → 5% at rank 5.
  'asc_brs_wl_bloodbath': [
    { kind: 'procOnCrit', chance: 1, action: { kind: 'applyTag', tag: 'bleed', stacks: 2, duration: 6 } },
  ],
  'asc_brs_wl_slam_mastery': [
    { kind: 'stat', stat: 'critMultiplier', delta: 5 },
  ],
  'asc_brs_wl_apex_predator': [
    { kind: 'whileTag', tag: 'bleed', stat: 'damageMult', mult: 1.05 },
  ],

  // ── Berserker — Reaver ────────────────────────────────────────────
  // 7 of 8 wired today (heaviest Berserker wire-rate). Undying Wrath
  // capstone (frenzied window extension + lethal-hit immunity) is
  // decorative until Phase F lands Rage Threshold + Frenzied.
  'asc_brs_rv_wound_tolerance': [
    { kind: 'stat', stat: 'maxLife', delta: 5 },
  ],
  'asc_brs_rv_bloodlet': [
    { kind: 'stat', stat: 'lifeOnHit', delta: 1 },
  ],
  'asc_brs_rv_reckless': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  // "5% chance on crit to apply 2 bleed stacks" rank-1 → 25% at rank 5.
  'asc_brs_rv_bloody_crit': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'bleed', stacks: 2, duration: 6 } },
  ],
  'asc_brs_rv_bloodied_strike': [
    { kind: 'whileTag', tag: 'bleed', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_brs_rv_iron_skin': [
    { kind: 'stat', stat: 'damageTakenReduction', delta: 5 },
  ],
  'asc_brs_rv_wrath_sustain': [
    { kind: 'stat', stat: 'lifeLeechPercent', delta: 1 },
  ],

  // ── Berserker — Juggernaut ────────────────────────────────────────
  // 7 of 8 wired today. Heavy Stance is authored as a flat DR stat
  // (additive with Iron Body); the offhand-conditional clause from
  // the original design is folded into the engine-side dispatch via
  // Mountain capstone, decorative until Phase F.
  'asc_brs_jg_stalwart': [
    { kind: 'stat', stat: 'maxLife', delta: 5 },
  ],
  'asc_brs_jg_iron_body': [
    { kind: 'stat', stat: 'damageTakenReduction', delta: 1 },
  ],
  'asc_brs_jg_heavy_stance': [
    { kind: 'stat', stat: 'damageTakenReduction', delta: 1 },
  ],
  'asc_brs_jg_battle_cleave': [
    { kind: 'stat', stat: 'incAoEDamage', delta: 1 },
  ],
  'asc_brs_jg_stagger_sweep': [
    { kind: 'whileTag', tag: 'bleed', stat: 'damageMult', mult: 1.05 },
  ],
  // Multi-effect node: block chance + max life.
  'asc_brs_jg_iron_aegis': [
    { kind: 'stat', stat: 'blockChance', delta: 5 },
    { kind: 'stat', stat: 'maxLife', delta: 10 },
  ],
  'asc_brs_jg_bulwark': [
    { kind: 'stat', stat: 'maxLife', delta: 10 },
  ],

  // ── Hunter — Marksman ─────────────────────────────────────────────
  // 7 of 8 wired today. First-hit-guaranteed-crit + precision-payoff
  // bonus capstone needs Phase F (firstHitOnTarget condition + payoff
  // mechanic dispatch).
  'asc_hnt_mm_steady_aim': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  'asc_hnt_mm_hunters_edge': [
    { kind: 'stat', stat: 'critMultiplier', delta: 1 },
  ],
  'asc_hnt_mm_mark_tracker': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 50 },
  ],
  // "5% chance on crit to apply Mark" rank-1 → 25% at rank 5.
  'asc_hnt_mm_critical_aim': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  // "+5% damage vs marked" rank-1 → +15% at rank 3.
  'asc_hnt_mm_mark_hunter': [
    { kind: 'whileTag', tag: 'mark', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_hnt_mm_snipers_tempo': [
    { kind: 'stat', stat: 'critChance', delta: 5 },
  ],
  // "+10% damage vs marked" rank-1 → +30% at rank 3 (stacks deeper).
  'asc_hnt_mm_predators_mark': [
    { kind: 'whileTag', tag: 'mark', stat: 'damageMult', mult: 1.10 },
  ],

  // ── Hunter — Beastmaster ──────────────────────────────────────────
  // 5 of 8 wired today. Pack Bond / Companion's Vigor are forward-compat
  // (companion stats not on ResolvedStats); Pack Leader capstone needs
  // Phase F (companion summoning + proc inheritance dispatch).
  'asc_hnt_bm_pack_bond': [
    { kind: 'stat', stat: 'companionDamage', delta: 5 },
  ],
  'asc_hnt_bm_companions_vigor': [
    { kind: 'stat', stat: 'companionHp', delta: 5 },
  ],
  'asc_hnt_bm_bond_of_wild': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  'asc_hnt_bm_pack_tempo': [
    { kind: 'stat', stat: 'attackSpeed', delta: 1 },
  ],
  'asc_hnt_bm_wild_mark': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  'asc_hnt_bm_pack_awareness': [
    { kind: 'statMult', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_hnt_bm_bond_of_hunting': [
    { kind: 'whileTag', tag: 'mark', stat: 'damageMult', mult: 1.05 },
  ],
  // Pack Leader capstone — Phase F F4 (2026-05-06): grants companion
  // permission + full proc inheritance. Summon runtime (F4 follow-on)
  // spawns the singleton type='companion' MinionState; F4 polish proc
  // inheritance routes 100% of player procOnHit/procOnCrit through
  // every companion attack so capstone Beastmasters truly play "two
  // characters at once" — the design intent of the keystone.
  'asc_hnt_bm_pack_leader': [
    { kind: 'grantCompanion', minionType: 'companion' },
    { kind: 'companionProcInheritance', percent: 100 },
  ],


  // ── Hunter — Trapper ──────────────────────────────────────────────
  // 5 of 8 wired today. Multi-Arming / Heavy Trap / Snare Field
  // capstone are decorative until Phase F lands the trap mechanic +
  // onTrapDetonate dispatch.
  'asc_hnt_tp_trappers_hand': [
    { kind: 'whileTag', tag: 'bleed', stat: 'damageMult', mult: 1.05 },
  ],
  'asc_hnt_tp_quick_reload': [
    { kind: 'stat', stat: 'cooldownRecovery', delta: 1 },
  ],
  'asc_hnt_tp_snare_sense': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  // "5% chance on hit to apply Bleed" 1-rank.
  'asc_hnt_tp_trap_trigger': [
    { kind: 'procOnHit', chance: 5, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 6 } },
  ],
  // "+2% cooldown recovery" rank-1 → +6% at rank 3 (stacks with Quick Reload).
  'asc_hnt_tp_cooldown_mastery': [
    { kind: 'stat', stat: 'cooldownRecovery', delta: 2 },
  ],
};

/** Lookup typed effects for an ascendancy node id. */
export function getAscendancyNodeEffectsById(nodeId: string): TalentEffect[] {
  return ASCENDANCY_NODE_EFFECTS[nodeId] ?? [];
}

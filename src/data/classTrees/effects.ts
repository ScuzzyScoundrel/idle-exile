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
  // Phase F F1c (2026-05-06): combo-state duration via global ailmentDuration
  // (engine cannot filter by state id today). "+0.2s Plagued duration / rank"
  // approximated as +5% ailment+combo-state duration / rank → +25% at rank 5.
  // Broader than design intent (also extends poison/burn/bleed/combo states).
  'wd_pp_pandemic_vector': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 5 },
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
  // "+1s Hex duration / rank" approximated as +10% ailment+combo duration / rank
  // → +30% at rank 3. Global stat (broader than per-state design).
  'wd_vs_branding_iron': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 10 },
  ],

  // ── Spirit Whisperer path ──────────────────────────────────────────
  // Phase F F2 (2026-05-06): procOnMinionHit / procOnMinionCrit /
  // procOnMinionDeath unlocked. Engine fires from staff.ts tickMaintenance
  // at the minion-attack consumer (line ~213 after isCrit determined) and
  // the death-detection loop (line ~485).
  //
  // "Minion attacks have +2/4/6/8/10% chance to apply Hexed."
  'wd_sw_spirit_bond': [
    { kind: 'procOnMinionHit', chance: 2, action: { kind: 'applyTag', tag: 'hex', stacks: 1, duration: 6 } },
  ],
  // "Minion summons cost 5/10/15/20/25% less mana." — forward-compat
  // (minionSummonManaCost not yet on ResolvedStats). Authored as stat
  // delta to land automatically when stat is added.
  'wd_sw_spirit_conduit': [
    { kind: 'stat', stat: 'minionSummonManaCost', delta: -5 },
  ],
  // "Minions gain +5/10/15/20/25% HP." — forward-compat (minionHp).
  'wd_sw_spirit_vigor': [
    { kind: 'stat', stat: 'minionHp', delta: 5 },
  ],
  // "Minion duration +2/4/6 seconds." — forward-compat (minionDuration).
  'wd_sw_soul_bind': [
    { kind: 'stat', stat: 'minionDuration', delta: 2 },
  ],
  // "Minion crits have +5/10/15/20/25% chance to fire an additional minion
  // attack on the same target." Approximated as procOnMinionCrit applying
  // Hexed (flavor analog: extra damage pressure from hex stacks; engine
  // cannot trigger an extra synthetic minion-attack today).
  'wd_sw_spectral_edge': [
    { kind: 'procOnMinionCrit', chance: 5, action: { kind: 'applyTag', tag: 'hex', stacks: 1, duration: 6 } },
  ],
  // "Minion attacks have +1/2/3/4/5% chance to hit twice (double-strike)."
  // Approximated as procOnMinionHit applying Bleeding — bleed's stacking
  // DoT is the closest single-action analog to a duplicated hit.
  'wd_sw_pack_mastery': [
    { kind: 'procOnMinionHit', chance: 1, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 4 } },
  ],
  // "Minion attacks have +5/10/15/20/25% chance to restore 5 mana."
  // refundMana action exists; ctx.mana ref isn't threaded into
  // tickMaintenance yet so this currently no-ops gracefully (per Phase F
  // F1b dispatcher contract). Lands automatically once mana ref is added
  // to WeaponTickContext.
  'wd_sw_soul_ration': [
    { kind: 'procOnMinionHit', chance: 5, action: { kind: 'refundMana', amount: 5 } },
  ],
  // "Minion crits have +25/50/75% chance to apply Hexed."
  'wd_sw_inherited_curse': [
    { kind: 'procOnMinionCrit', chance: 25, action: { kind: 'applyTag', tag: 'hex', stacks: 1, duration: 6 } },
  ],
  // Pack Sovereign capstone — "Minion crits trigger chaos AoE around the
  // target dealing 100% of crit damage as splash to all enemies."
  // Approximated as broadcast Hexed (engine cannot trigger free-cast AoE
  // damage from a proc today; broadcast hex is the closest pack-pressure
  // analog and ties into existing whileTag(hex) damage scaling).
  'wd_sw_pack_sovereign': [
    { kind: 'procOnMinionCrit', chance: 100, action: { kind: 'applyTagAll', tag: 'hex', stacks: 1, duration: 6 } },
  ],

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
  // Phase F F1b (2026-05-05): refundMana action unlocks Asn mana-on-crit.
  // "+1/2/3 mana on crit" rank-1 → 100% chance, refunds 1 mana per crit.
  'asn_bm_sharpshot': [
    { kind: 'procOnCrit', chance: 100, action: { kind: 'refundMana', amount: 1 } },
  ],
  // refundCooldown action unlocks Eviscerate. "Crits +5/10/15/20/25%
  // chance to refresh consumed-skill cooldown" rank-1 → 5%, full refund.
  // Broader than design intent ("refresh Stab") since procOnCrit can't
  // filter by skill id today.
  'asn_bm_eviscerate': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'refundCooldown' } },
  ],

  // ── Venomcraft path ─────────────────────────────────────────────────
  // "+5% poison damage" — approximated as +5% chaos channel.
  'asn_vc_toxic_edge': [
    { kind: 'stat', stat: 'incChaosDamage', delta: 5 },
  ],
  'asn_vc_lingering_doom': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 50 },
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
  // Phase F F1b (2026-05-05): applyTagAll action unlocks burst-Marker.
  // "On crit, +1/2/3/4/5% chance to apply Mark to ALL enemies" rank-1 → 1%.
  'asn_sd_stalkers_sigil': [
    { kind: 'procOnCrit', chance: 1, action: { kind: 'applyTagAll', tag: 'mark', stacks: 1, duration: 8 } },
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
  // Phase F F1b (2026-05-05): refundMana unlocks Arcanist crit-economy.
  // "On crit, +1/2/3 mana refunded" rank-1 → 100% chance, +1 mana per crit.
  'sor_ar_mana_surge': [
    { kind: 'procOnCrit', chance: 100, action: { kind: 'refundMana', amount: 1 } },
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
  // Phase F F1b (2026-05-05): applyTagAll unlocks Storm Crest broadcast.
  // "Lightning crits +1/2/3/4/5% chance to apply Shock to all enemies"
  // rank-1 → 1%. Broader than design intent (procOnCrit cannot filter
  // by element today) — fires on any crit, not just lightning crits.
  'sor_sp_storm_crest': [
    { kind: 'procOnCrit', chance: 1, action: { kind: 'applyTagAll', tag: 'shock', stacks: 1, duration: 4 } },
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
  // "+1s Bloodied state duration / rank" approximated as +10% global ailment+combo
  // duration / rank → +30% at rank 3. Bloodied is bleed-tagged (§8.3) so
  // ailmentDuration covers it; broader than design intent (extends all DoTs).
  'brs_wl_bloodied_mastery': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 10 },
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
  // Phase F F1b (2026-05-05): refundMana unlocks Hunter sniper economy.
  // "On crit, consumed skill regains 1/2/3 mana" rank-1 → 100% chance, +1.
  'hnt_mm_snipers_tempo': [
    { kind: 'procOnCrit', chance: 100, action: { kind: 'refundMana', amount: 1 } },
  ],
  // "+2s Mark duration / rank" approximated as +15% global ailment+combo
  // duration / rank → +45% at rank 3. Mark is the highest-impact target since
  // Hunter procOnCrit pipelines feed off it (Phase E ascendancy nodes).
  'hnt_mm_mark_master': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 15 },
  ],

  // ── Beastmaster path ────────────────────────────────────────────────
  // Phase F F4 (2026-05-06): procOnCompanionHit / procOnCompanionCrit /
  // procOnCompanionDeath unlocked + `grantCompanion` kind for tagging
  // companion-permission nodes. The companion-summon RUNTIME (i.e.
  // actually spawning + ticking the companion as a permanent type
  // 'companion' MinionState for non-staff classes) is deferred to F4
  // follow-on. Today these entries fire only when a companion-tagged
  // minion exists in `state.activeMinions` (via WD multi-class fusion
  // or future runtime). Engine fires from staff.ts minion-attack
  // consumer (line ~230 — type filter on `attackingMinion.type`).
  //
  // Foundation stats — forward-compat seeds (companionDamage / Hp /
  // AttackSpeed / SummonManaCost not on ResolvedStats today). Land
  // automatically when the stats are added.
  'hnt_bm_pack_bond': [
    { kind: 'stat', stat: 'companionDamage', delta: 5 },
  ],
  'hnt_bm_companions_vigor': [
    { kind: 'stat', stat: 'companionHp', delta: 5 },
  ],
  'hnt_bm_hunting_tempo': [
    { kind: 'stat', stat: 'companionAttackSpeed', delta: 2 },
  ],
  'hnt_bm_hunters_loyalty': [
    { kind: 'stat', stat: 'companionSummonManaCost', delta: -5 },
  ],
  // "Companion attacks have +5/10/15/20/25% chance to apply Mark."
  'hnt_bm_pack_hunt': [
    { kind: 'procOnCompanionHit', chance: 5, action: { kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  // "When you apply Mark, +5/10/15/20/25% chance the companion focuses
  // the Marked target on its next attack." Approximated as
  // procOnCompanionHit re-applying Mark — engine cannot retarget the
  // companion's next attack today.
  'hnt_bm_hunters_mark_bond': [
    { kind: 'procOnCompanionHit', chance: 5, action: { kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  // "Companion attacks have +5/10/15/20/25% chance to apply Bleeding Out."
  'hnt_bm_wild_strike': [
    { kind: 'procOnCompanionHit', chance: 5, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 4 } },
  ],
  // "Companion crits have +5/10/15/20/25% chance to land double crits."
  // "Double crit" approximated as applyTag(bleed) for stacking damage
  // pressure — engine cannot trigger a synthetic re-crit on the same
  // attack today.
  'hnt_bm_beastmasters_ferocity': [
    { kind: 'procOnCompanionCrit', chance: 5, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 4 } },
  ],
  // "Companion crits have +20/40/60% chance to crit twice." Same
  // approximation pattern as Beastmaster's Ferocity.
  'hnt_bm_pack_sovereign': [
    { kind: 'procOnCompanionCrit', chance: 20, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 4 } },
  ],
  // Pack Leader Preview — flag node that grants companion permission.
  // Today this is a no-op marker; the deferred F4 follow-on companion-
  // summon runtime checks `talentEffects.some(e => e.kind === 'grantCompanion')`
  // to know whether to spawn / maintain the companion for this build.
  'hnt_bm_pack_leader_preview': [
    { kind: 'grantCompanion', minionType: 'companion' },
  ],

  // ── Trapper path ────────────────────────────────────────────────────
  // Phase F F3 (2026-05-06): procOnTrapDetonate / procOnTrapChain
  // unlocked. Engine fires from `dagger.ts` onEnemyAttack at the trap
  // detonation site (line ~470). Bow / crossbow trap modules will
  // adopt the same hooks once those weapons gain trap mechanics.
  //
  // "+1s Snare duration / rank" approximated as +8% global ailment
  // duration / rank → +40% at rank 5.
  'hnt_tp_snare_mastery': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 8 },
  ],
  // "+5/10/15/20/25% trap-tagged skill damage." — forward-compat seed
  // (incTrapDamage not on ResolvedStats today). Lands when stat is added.
  'hnt_tp_trappers_hand': [
    { kind: 'stat', stat: 'incTrapDamage', delta: 5 },
  ],
  // "Trap cooldowns -2/4/6/8/10%." Approximated as global
  // cooldownRecovery (engine cannot filter trap-tagged today).
  'hnt_tp_quick_reload': [
    { kind: 'stat', stat: 'cooldownRecovery', delta: 2 },
  ],
  // "+2/4/6/8/10% trap detonation damage." — forward-compat seed
  // (trapDetonationDamage stat not on ResolvedStats today).
  'hnt_tp_heavy_trap': [
    { kind: 'stat', stat: 'trapDetonationDamage', delta: 2 },
  ],
  // "+1/2/3 maximum traps active." — forward-compat seed (maxActiveTraps
  // not on ResolvedStats today; trap cap is hard-coded in dagger.ts).
  'hnt_tp_trap_stack': [
    { kind: 'stat', stat: 'maxActiveTraps', delta: 1 },
  ],
  // "+2/4/6 maximum traps active (stacks with Trap Stack)."
  'hnt_tp_trap_reservoir': [
    { kind: 'stat', stat: 'maxActiveTraps', delta: 2 },
  ],
  // "On trap detonation hitting multiple enemies, all hit gain Snared."
  // 'snare' isn't in TalentTag yet — using `frozen` (frostbite debuff) as
  // the closest movement-impair analog. Triggers from dagger Blade Trap
  // detonations today; bow/crossbow traps will inherit when wired.
  'hnt_tp_snare_cascade': [
    { kind: 'procOnTrapDetonate', chance: 100, action: { kind: 'applyTagAll', tag: 'frozen', stacks: 1, duration: 4 } },
  ],
  // "Multi-trap chains' damage escalation +5/10/15/20/25% per chained
  // detonation." Approximated as procOnTrapChain applying Bleeding —
  // bleed's stacking DoT mirrors the per-chain damage escalation curve.
  'hnt_tp_chain_trap': [
    { kind: 'procOnTrapChain', chance: 5, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 4 } },
  ],
};

/** Lookup typed effects for a node id. Returns [] for unwired nodes. */
export function getNodeEffectsById(nodeId: string): TalentEffect[] {
  return NODE_EFFECTS[nodeId] ?? [];
}

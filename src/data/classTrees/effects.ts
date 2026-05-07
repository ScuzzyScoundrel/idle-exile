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
  // Phase F F5e (2026-05-06): Pandemic capstone — DoTs spread on enemy
  // death. zoneAttack.ts dyingMobs loop checks hasPandemicGrant once
  // per tick and transfers each dying mob's DoT debuffs (bleeding /
  // poisoned / burning / frostbite / locust_swarm_dot / haunt_dot /
  // toads_dot) to up to 3 surviving pack mobs with snapshot damage
  // and remaining duration preserved. The +15 poison stacks half of
  // the design is the maxPoisonStacks forward-compat seed (won't
  // activate until the stat lands on ResolvedStats).
  'wd_pp_pandemic_plus': [
    { kind: 'grantPandemic' },
    { kind: 'stat', stat: 'maxPoisonStacks', delta: 15 },
  ],

  // ── Voodoo Sovereign path ───────────────────────────────────────────
  // "Hexed enemies take +10% damage from chaos sources." — broadened to
  // global damageMult vs hexed (engine cannot isolate chaos channel).
  'wd_vs_brand_of_suffering': [
    { kind: 'whileTag', tag: 'hex', stat: 'damageMult', mult: 1.10 },
  ],
  // Phase F polish (2026-05-06): targetTag filter on procOnHit/Kill
  // unlocks per-target-debuff gating.
  // "Curse-tagged skills +1/2/3/4/5% chance to crit." Approximated as
  // global critChance delta (engine cannot filter critChance by skill
  // tag today). Broader than design intent.
  'wd_vs_curse_affinity': [
    { kind: 'stat', stat: 'critChance', delta: 1 },
  ],
  // "Hits on cursed enemies +5/10/15/20/25% chance to apply additional
  // Hex stack."
  'wd_vs_curse_mastery': [
    { kind: 'procOnHit', targetTag: 'hex', chance: 5, action: { kind: 'applyTag', tag: 'hex', stacks: 1, duration: 6 } },
  ],
  // "Hexed enemy hit +5/10/15/20/25% chance Hex spreads to one nearby."
  // Approximated as broadcast hex (engine can't pick one nearby; AoE
  // is the closest analog and feeds whileTag(hex) damage scaling).
  'wd_vs_curse_spread': [
    { kind: 'procOnHit', targetTag: 'hex', chance: 5, action: { kind: 'applyTagAll', tag: 'hex', stacks: 1, duration: 6 } },
  ],
  // "Hexed enemies that die +20/40/60/80/100% chance to chain-curse."
  // Approximated as procOnKill targetTag(hex) applyTagAll(hex).
  'wd_vs_bloodbound': [
    { kind: 'procOnKill', targetTag: 'hex', chance: 20, action: { kind: 'applyTagAll', tag: 'hex', stacks: 1, duration: 6 } },
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
  // "Minion crits have +5/10/15/20/25% chance to fire an additional
  // minion attack on the same target." Now authentic via bonusDamage
  // (percent 100 = full duplicate hit damage folded into the minion's
  // attack damage that tick). bonusDamageRef threaded into minion
  // procCtx 2026-05-07.
  'wd_sw_spectral_edge': [
    { kind: 'procOnMinionCrit', chance: 5, action: { kind: 'bonusDamage', percent: 100 } },
  ],
  // "Minion attacks have +1/2/3/4/5% chance to hit twice (double-strike)."
  // Now authentic via bonusDamage (percent 100 = exact duplicate hit
  // damage on roll success). Replaces prior bleed-applyTag approximation.
  'wd_sw_pack_mastery': [
    { kind: 'procOnMinionHit', chance: 1, action: { kind: 'bonusDamage', percent: 100 } },
  ],
  // "Fetish Swarm warriors have +5/10/15/20/25% chance to deal +50%
  // damage on each attack." minionType filter routes the proc to
  // fetish minions only — non-fetish minions ignore. Same applyTag
  // 'bleed' approximation as pack_mastery (bleed = damage-pressure
  // analog), but rank-1 chance is 5% (vs pack_mastery's 1%) since
  // fetish-only is more restricted than all-minion.
  'wd_sw_fetish_frenzy': [
    { kind: 'procOnMinionHit', minionType: 'fetish', chance: 5, action: { kind: 'applyTag', tag: 'bleed', stacks: 1, duration: 4 } },
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
  // "While 3+ minions are alive, +25% cast speed and +15% damage." 1
  // rank — both effects apply when the minion-count threshold is met.
  // Engine treats attack/cast cadence under attackSpeed (no separate
  // castSpeed stat); +25% there covers spell rotation per spec.
  'wd_sw_voodoo_roar': [
    { kind: 'whileMinionCountAtLeast', threshold: 3, stat: 'attackSpeed', mult: 1, delta: 25 },
    { kind: 'whileMinionCountAtLeast', threshold: 3, stat: 'damageMult', mult: 1.15 },
  ],
  // "When a minion dies, +5/10/15/20/25% chance you gain a 'Necro
  // Stack' (max 5, 8s); each stack +6% damage." Necro Stack approx-
  // imated as stackable necro_stack tempBuff (damageMult 1.06 per
  // stack, max 5, 8s duration). Stacks via mergeProcTempBuff; 5
  // stacks at full = damageMult 1.30 (matches spec's +30% peak).
  // Decays naturally when no minion dies within 8s.
  'wd_sw_death_mastery': [
    { kind: 'procOnMinionDeath', chance: 5, action: { kind: 'grantBuff', buffId: 'necro_stack', duration: 8 } },
  ],
  // Phase F polish (2026-05-06): grantBuff action wired via TALENT_BUFF
  // _REGISTRY. "Minion deaths +2/4/6/8/10% chance to grant brief +20%
  // damage reduction shield (3s)."
  'wd_sw_bone_armor': [
    { kind: 'procOnMinionDeath', chance: 2, action: { kind: 'grantBuff', buffId: 'bone_armor', duration: 3 } },
  ],
  // "When a minion dies, your next cast within 3s deals +25/50/75% damage."
  // Approximated as duration-only buff (every cast within window benefits,
  // not just the first; broader than design intent).
  'wd_sw_spirit_shield': [
    { kind: 'procOnMinionDeath', chance: 25, action: { kind: 'grantBuff', buffId: 'spirit_shield', duration: 3 } },
  ],
  // Phase F polish (2026-05-06): summon TalentAction wired via
  // SUMMON_CONFIGS lookup. "On enemy kill, +20/40/60% chance to summon
  // a temporary spirit minion for 6 seconds." Uses the spirit_temp
  // archetype (1 minion, 10% player HP, 1.5s attack interval, cold).
  'wd_sw_necromantic_rite': [
    { kind: 'procOnKill', chance: 20, action: { kind: 'summon', minionType: 'spirit_temp', count: 1, durationSec: 6 } },
  ],
  // "When a minion dies, +25/50/75% chance to immediately spawn a
  // 'Spirit Echo' (4s, 50% damage)." Approximated via spirit_temp
  // archetype with 4s duration. The 50%-damage flavor is dropped
  // (would need a custom config; spirit_temp's stock damage is fine
  // for first slice).
  'wd_sw_resilient_spirits': [
    { kind: 'procOnMinionDeath', chance: 25, action: { kind: 'summon', minionType: 'spirit_temp', count: 1, durationSec: 4 } },
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
  // Phase F F5a (2026-05-06): Crit Cascade engine landed — Assassin
  // signature mechanic. Every player crit adds 1 stack (capped at 5)
  // to `state.critStacks` with a 4s decay window; stacks drive the
  // perCritStack and whileCritStacksAtLeast effect kinds.
  //
  // "Each Crit Stack reduces all skill cooldowns by -0.1/-0.2/-0.3s."
  // Approximated as +5% cooldownRecovery per stack (rank-scaled). At
  // rank 3 + 5 stacks → 5*3*5 = +75% cooldown recovery — generous but
  // illustrates the spike-empowerment fantasy of the node.
  'asn_bm_bladestorm_tempo': [
    { kind: 'perCritStack', stat: 'cooldownRecovery', perStackDelta: 5 },
  ],
  // "Skill cast intervals reduced by +1/2/3/4/5% per Crit Stack."
  // Approximated globally (the design's "on Shadow Marked target"
  // gate is dropped — engine cannot filter castSpeed by per-target
  // condition today; broader than design intent but functional).
  'asn_bm_bladework_mastery': [
    { kind: 'perCritStack', stat: 'castSpeed', perStackDelta: 1 },
  ],
  // F5a follow-on: addCritStack action wired. "Crits +1/2/3% chance
  // to add an extra Crit Stack (signature accelerator)."
  'asn_bm_cascading_crit': [
    { kind: 'procOnCrit', chance: 1, action: { kind: 'addCritStack', amount: 1 } },
  ],
  // F5b targetTag filter unlocks "vs poisoned" gating. "Hits against
  // poisoned enemies have +2/4/6/8/10% chance to add a Crit Stack."
  // Now correctly filtered to poisoned targets (back to design's 2%
  // rank-1 since the trigger surface is no longer broader-than-intent).
  'asn_vc_withering_strike': [
    { kind: 'procOnHit', targetTag: 'poison', chance: 2, action: { kind: 'addCritStack', amount: 1 } },
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
  // Phase F F5e follow-on (2026-05-06): grantDotCrit + whilePauseDebuffDecay.
  // Toxic Saint capstone (1 rank) — "Poison can crit. Your poison
  // stacks no longer decay while Shadow Mark is active on any target."
  // BOTH HALVES WIRED:
  //   1. grantDotCrit: each poisoned tick rolls a 30% crit chance,
  //      multiplying the tick by player critMultiplier on success.
  //   2. whilePauseDebuffDecay: while the target has any 'mark' tag
  //      debuff active (Shadow Mark uses the generic 'mark' tag), the
  //      'poisoned' debuff's duration stops counting down. Damage
  //      still ticks; only the dtSec subtraction is skipped per tick.
  'asn_vc_toxic_saint': [
    { kind: 'grantDotCrit', debuffId: 'poisoned', chanceBonus: 30 },
    { kind: 'whilePauseDebuffDecay', tag: 'mark', debuffId: 'poisoned' },
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
  // F5b/d delta on whileTag enables percent-stat conditionals.
  // "Hits on Shadow Marked targets have +1/2/3/4/5% chance to crit."
  // Approximated via Mark debuff (Shadow Mark and Mark share the
  // 'marked' debuff today; engine doesn't yet distinguish the two).
  'asn_sd_stalkers_sense': [
    { kind: 'whileTag', tag: 'mark', stat: 'critChance', mult: 1, delta: 1 },
  ],
  // "+1/2/3/4/5s Shadow Mark duration / rank" — global ailment+combo
  // duration approximation (engine cannot filter to a specific debuff
  // id today). Rank 5 → +50% all ailment durations.
  'asn_sd_killers_grace': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 10 },
  ],
  // "Crits +5/10/15/20/25% chance to apply Shadow Mark to an additional
  // enemy." Approximated via applyTagAll mark (broader — broadcasts
  // instead of picking one).
  'asn_sd_mark_spread': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'applyTagAll', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  // F5b targetTag filter — "Hits against Shadow Marked targets +X%
  // chance to refresh Shadow Mark to full duration." Now correctly
  // filtered to Marked targets only.
  'asn_sd_hunters_patience': [
    { kind: 'procOnHit', targetTag: 'mark', chance: 2, action: { kind: 'applyTag', tag: 'mark', stacks: 1, duration: 8 } },
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
  // Phase F F5d (2026-05-06): Resonance engine landed — charges
  // accumulate per elemental hit (capped at 5/element, 6s decay).
  // Total charges drive whileResonanceChargesAtLeast + perResonanceCharge.
  // "Each unique element ailment on a target grants +2/4/6/8/10% damage."
  // Approximated as perResonanceCharge damageMult — total charges
  // (which require unique elements to be dealt) loosely tracks unique-
  // ailment count for player-side accumulation.
  'sor_el_catalyst': [
    { kind: 'perResonanceCharge', stat: 'damageMult', perStackDelta: 0.02, cap: 0.10 },
  ],
  // "Skills dealing 2+ damage types deal +3/6/9/12/15% bonus damage."
  // Approximated as whileResonanceChargesAtLeast threshold 2 (you have
  // at least 2 charges → recently hit with 2+ elements).
  'sor_el_hybrid_empowerment': [
    { kind: 'whileResonanceChargesAtLeast', threshold: 2, stat: 'damageMult', mult: 1.03 },
  ],
  // F5d follow-on: addResonanceCharge action wired. "Crits +5/10/15/20/25%
  // chance to add a Resonance charge of a random missing element."
  // Element omitted → dispatcher picks first missing.
  'sor_el_element_swap': [
    { kind: 'procOnCrit', chance: 5, action: { kind: 'addResonanceCharge' } },
  ],
  // "On Convergence cast, fire an extra elemental detonation of a
  // random element to all enemies in encounter for 50% spell power."
  // 1-rank identity. First-slice approximation: bonusDamage percent
  // 50 fired always (chance 100) on Convergence cast — folds +50%
  // damage into the same Convergence cast (loses "broadcast to all
  // enemies" — only hits front mob via procDamage path). True
  // broadcast detonation needs zone-wide bonusDamage application.
  'sor_el_resonant_burst': [
    { kind: 'procOnConvergenceCast', chance: 100, action: { kind: 'bonusDamage', percent: 50 } },
  ],
  // "Hits dealing a NEW element type (not yet in current Resonance bank)
  // have +5/10/15/20/25% chance to deal +50% damage." Approximated as
  // procOnHit applying addResonanceCharge — the "new element" gate is
  // dropped (engine cannot inspect bank-vs-hit element today; broader
  // than design intent).
  'sor_el_spell_cycle': [
    { kind: 'procOnHit', chance: 5, action: { kind: 'addResonanceCharge' } },
  ],
  // "On killing an enemy, +5/10/15/20/25% chance to gain a Resonance
  // charge of a random missing element."
  'sor_el_element_cycle': [
    { kind: 'procOnKill', chance: 5, action: { kind: 'addResonanceCharge' } },
  ],

  // ── Arcanist path ───────────────────────────────────────────────────
  // Resonance bank-size seed (maxResonanceCharges not yet on ResolvedStats).
  'sor_ar_bank_mastery': [
    { kind: 'stat', stat: 'maxResonanceCharges', delta: 1 },
  ],
  // F5d follow-on candidate — at full bank, +X% spell power. Authoring
  // as whileResonanceChargesAtLeast threshold 5 (1 charge in 4+ elements
  // = "saturated bank"). Approximation since per-element threshold
  // would need separate kind.
  'sor_ar_saturation': [
    { kind: 'whileResonanceChargesAtLeast', threshold: 5, stat: 'spellPower', mult: 1.20 },
  ],
  // "+5/10/15/20/25 maximum mana." Forward-compat seed (maxMana stat
  // exists; delta gets folded into the mana ceiling at character resolve).
  'sor_ar_mana_reservoir': [
    { kind: 'stat', stat: 'maxMana', delta: 5 },
  ],
  // "For each Resonance charge held, +1/2/3/4/5% spell power."
  'sor_ar_bank_surge': [
    { kind: 'perResonanceCharge', stat: 'spellPower', perStackDelta: 1 },
  ],
  // "Resonance charges grant +2/4/6/8/10% defense per charge."
  // Approximated as damageTakenReduction (closest live defense stat).
  'sor_ar_crystal_lattice': [
    { kind: 'perResonanceCharge', stat: 'damageTakenReduction', perStackDelta: 2 },
  ],
  // F5b/F5d delta variants land — additive percent conditionals work.
  // "Hits while at 4+ Resonance charges have +5/10/15/20/25% crit chance."
  'sor_ar_resonance_sense': [
    { kind: 'whileResonanceChargesAtLeast', threshold: 4, stat: 'critChance', mult: 1, delta: 5 },
  ],
  // Phase F F5d expansion (2026-05-07): procOnResonanceChargeGain unlocks
  // Sorcerer charge-aware procs. "On gaining a Resonance charge, +1/2/3/4/5%
  // chance to add an additional charge of the same element." First-slice
  // approximation: addResonanceCharge with no element picks the first
  // non-full element (fire→cold→lightning→chaos), so the bonus charge may
  // land on a different element if the triggering one is at cap. True
  // "same element" needs the dispatcher to read the current proc's element
  // from a new ctx field — Phase F follow-on.
  'sor_ar_charge_sense': [
    { kind: 'procOnResonanceChargeGain', chance: 1, action: { kind: 'addResonanceCharge', amount: 1 } },
  ],
  // "Convergence cast has +20/40/60/80/100% chance to refund 50% of its
  // mana cost." Approximation: refundMana amount=4 (typical convergence
  // skill costs ~8 mana, half = 4); chance scales linearly per rank.
  // Rank 1 = 20% × 4 = +0.8 expected mana per cast (matches spec ~50%
  // of avg cost). Rank 5 = 100% × 4 = +4 mana per cast.
  'sor_ar_convergence_burst': [
    { kind: 'procOnConvergenceCast', chance: 20, action: { kind: 'refundMana', amount: 4 } },
  ],
  // "On Convergence cast, gain +20/40/60% cast speed for 3s." Buff
  // strength fixed at +40% (mid-rank); chance scales per rank
  // instead. Saturation tempo buff uses attackSpeedMult since this
  // engine treats attack/cast cadence under the same multiplier.
  'sor_ar_saturation_tempo': [
    { kind: 'procOnConvergenceCast', chance: 20, action: { kind: 'grantBuff', buffId: 'saturation_tempo', duration: 3 } },
  ],
  // "Convergence has +20/40/60/80/100% chance to spawn a phantom-
  // Convergence cast 1.5s later for 50% damage." First-slice
  // approximation: bonusDamage percent 50 folded into the same
  // Convergence cast (loses the "1.5s later" timing but preserves the
  // +50% damage spirit). True delayed-cast queue is a Phase F follow-
  // on requiring a new infrastructure (cast scheduler).
  'sor_ar_spectral_echo': [
    { kind: 'procOnConvergenceCast', chance: 20, action: { kind: 'bonusDamage', percent: 50 } },
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
  // Phase F polish (2026-05-06): whileTag.delta enables percent-stat
  // conditional. "Chilled enemies take +1/2/3/4/5% crit damage from
  // your skills."
  'sor_sp_frost_bite': [
    { kind: 'whileTag', tag: 'chill', stat: 'critMultiplier', mult: 1, delta: 1 },
  ],
  // procOnTag cascade — "On igniting a target, +10/20/30/40/50% chance
  // to apply 2 Ignites instead of 1." Approximated as procOnTag(ignite)
  // → applyTag(ignite) — fires when ignite is freshly applied,
  // re-applies it (incrementing stacks). 1-deep recursion guard
  // prevents runaway via the dispatcher's _inProcOnTag flag.
  'sor_sp_conflagration': [
    { kind: 'procOnTag', tag: 'ignite', chance: 10, action: { kind: 'applyTag', tag: 'ignite', stacks: 1, duration: 4 } },
  ],
  // "Ignites stack +1/2/3 times." Forward-compat seed (maxIgniteStacks
  // not on ResolvedStats today).
  'sor_sp_burning_hex': [
    { kind: 'stat', stat: 'maxIgniteStacks', delta: 1 },
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
  // Phase F F5b/d delta variant on whileTargetHpBelow lets percent
  // stats author cleanly. "+2/4/6/8/10% crit chance vs enemies <50% HP."
  'brs_wl_execute_sense': [
    { kind: 'whileTargetHpBelow', threshold: 0.5, stat: 'critChance', mult: 1, delta: 2 },
  ],
  // "+10/20/30/40/50% damage to enemies below 25% HP" rank-1 → +50% at rank 5
  // (deeper execute scaling).
  'brs_wl_apex_predator': [
    { kind: 'whileTargetHpBelow', threshold: 0.25, stat: 'damageMult', mult: 1.10 },
  ],
  // "+5/10/15/20/25% damage while in Frenzied state (Frenzied scaler)."
  'brs_wl_frenzied_power': [
    { kind: 'whileFrenzied', stat: 'damageMult', mult: 1.05 },
  ],
  // "Cooldown recovery +5/10/15% while in Frenzied state."
  'brs_wl_kings_wrath': [
    { kind: 'whileFrenzied', stat: 'cooldownRecovery', mult: 1, delta: 5 },
  ],
  // "+1s Bloodied state duration / rank" approximated as +10% global ailment+combo
  // duration / rank → +30% at rank 3. Bloodied is bleed-tagged (§8.3) so
  // ailmentDuration covers it; broader than design intent (extends all DoTs).
  'brs_wl_bloodied_mastery': [
    { kind: 'stat', stat: 'ailmentDuration', delta: 10 },
  ],
  // "Staggered enemies take +5/10/15/20/25% increased damage." Fires
  // whenever the player attacks a target carrying the 'staggered' debuff
  // (the Stagger debuff itself only adds reducedAttackSpeed: 10 — this
  // talent layers the damage payoff on top).
  'brs_wl_stagger_mastery': [
    { kind: 'whileTag', tag: 'staggered', stat: 'damageMult', mult: 1.05 },
  ],

  // ── Reaver path ─────────────────────────────────────────────────────
  'brs_rv_wound_tolerance': [
    { kind: 'stat', stat: 'maxLife', delta: 5 },
  ],
  // Phase F F1a (2026-05-05): whileSelfHpBelow unlocks Reaver low-HP tier.
  // "+2/4/6/8/10% damage while Frenzied (sticky — enters at <50% HP,
  // exits at >75%)." Phase F F5c: converted from whileSelfHpBelow:0.5
  // to whileFrenzied to match design intent.
  'brs_rv_hunger': [
    { kind: 'whileFrenzied', stat: 'damageMult', mult: 1.02 },
  ],
  // Phase F F5c follow-on (2026-05-06): additive delta on whileSelfHpBelow
  // unlocks percent-stat conditionals. Authoring with `mult: 1` (ignored)
  // + `delta: N` so the dispatcher adds N to the stat additively.
  // "+2/4/6/8/10% crit chance while Frenzied (sticky)." Phase F F5c:
  // converted from whileSelfHpBelow:0.5 to whileFrenzied.
  'brs_rv_reckless': [
    { kind: 'whileFrenzied', stat: 'critChance', mult: 1, delta: 2 },
  ],
  // "+2/4/6/8/10% damage reduction while Frenzied (sticky)." Phase F
  // F5c: converted from whileSelfHpBelow:0.5 to whileFrenzied.
  'brs_rv_iron_skin': [
    { kind: 'whileFrenzied', stat: 'damageTakenReduction', mult: 1, delta: 2 },
  ],
  // "+1/2/3/4/5% damage reduction while above 50% HP (defensive ramp pre-Frenzied)."
  'brs_rv_pain_tolerance': [
    { kind: 'whileSelfHpAbove', threshold: 0.5, stat: 'damageTakenReduction', mult: 1, delta: 1 },
  ],
  // "Lifesteal: +1/2/3/4/5% of damage while Frenzied returns as healing."
  // Approximation via lifeLeechPercent — engine may treat lifesteal/leech
  // semantically equivalent. delta scales linearly per rank.
  'brs_rv_wrath_sustain': [
    { kind: 'whileFrenzied', stat: 'lifeLeechPercent', mult: 1, delta: 1 },
  ],
  // "+5/10/15/20/25% damage reduction while Frenzied."
  'brs_rv_berserkers_resolve': [
    { kind: 'whileFrenzied', stat: 'damageTakenReduction', mult: 1, delta: 5 },
  ],
  // "+10/20/30/40/50% crit damage while below 25% HP" — deep-execute crit
  // multiplier scaler.
  'brs_rv_reckless_surge': [
    { kind: 'whileSelfHpBelow', threshold: 0.25, stat: 'critMultiplier', mult: 1, delta: 10 },
  ],
  // "+5/10/15% crit chance while below 25% HP."
  'brs_rv_death_defiance': [
    { kind: 'whileSelfHpBelow', threshold: 0.25, stat: 'critChance', mult: 1, delta: 5 },
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
  // "AoE crits have +5/10/15/20/25% chance to apply Staggered to all
  // enemies hit." procOnCrit gained tag?: DamageTag filter (parallel
  // to procOnHit) so we can gate this to AoE-tagged crits only.
  // applyTagAll broadcasts to every mob's debuff list this tick.
  'brs_jg_stagger_sweep': [
    { kind: 'procOnCrit', tag: 'AoE', chance: 5, action: { kind: 'applyTagAll', tag: 'staggered' } },
  ],
  // "On hitting a target with an AoE-tagged skill, +5/10/15/20/25%
  // chance to apply Marked for Cleave (next AoE on this target deals
  // +25% damage)." First-slice approximation: applyTag 'cleave'; the
  // "+25% on consume" payoff is layered via brs_jg_cleave_mastery as
  // a flat +damage-while-marked. True consume payoff (extra damage on
  // the consuming hit specifically) needs a future bonusDamage proc
  // action — Phase F follow-on.
  'brs_jg_marked_for_cleave': [
    { kind: 'procOnHit', tag: 'AoE', chance: 5, action: { kind: 'applyTag', tag: 'cleave' } },
  ],
  // "Hits on Marked for Cleave targets have +5/10/15/20/25% chance to
  // deal +100% damage." Now uses bonusDamage action (read back into
  // procDamage) — authentic "this hit deals +100%" semantic. Rank 5 =
  // 25% chance to fold +100% of base damage into the same hit's
  // procDamage accumulator, applied to the same target via the
  // existing procDamage flow.
  'brs_jg_marked_slam': [
    { kind: 'procOnHit', targetTag: 'cleave', chance: 5, action: { kind: 'bonusDamage', percent: 100 } },
  ],
  'brs_jg_bulwark': [
    { kind: 'stat', stat: 'maxLife', delta: 10 },
  ],
  // "+1/2/3/4/5% damage per enemy in encounter (max +25% with 5+
  // enemies)." perEnemyCount scales perEnemyDelta linearly per rank;
  // cap rank-5 at 25 = +25% damage with 5+ mobs. boss_fight phase
  // counts as 1 enemy (so rank-5 gives +5% on bosses).
  'brs_jg_crowd_punisher': [
    { kind: 'perEnemyCount', stat: 'damageMult', perEnemyDelta: 0.01, cap: 0.05 },
  ],
  // "While no offhand equipped, +2/4/6/8/10% damage reduction." Class-First
  // per §6.3: gates on equip slot, not weapon name.
  'brs_jg_heavy_stance': [
    { kind: 'whileOffhandAbsent', stat: 'damageTakenReduction', mult: 1, delta: 2 },
  ],
  // "AoE-tagged skills hit +1/2/3 additional enemies." aoeTargetCount
  // landed in ResolvedStats 2026-05-07 — folded into skillChains at
  // chain-resolution (tick.ts:2184) for AoE-tagged skills only.
  'brs_jg_wide_sweep': [
    { kind: 'stat', stat: 'aoeTargetCount', delta: 1 },
  ],
  // "+2/4/6/8/10% attack speed while no offhand equipped."
  'brs_jg_mountain_tempo': [
    { kind: 'whileOffhandAbsent', stat: 'attackSpeed', mult: 1, delta: 2 },
  ],
  // "Heavy-skill (Heavy-tagged) hits have +5/10/15/20/25% chance to
  // apply Staggered." procOnHit's tag filter routes the proc to
  // Heavy-tagged hits only.
  'brs_jg_concussive_force': [
    { kind: 'procOnHit', tag: 'Heavy', chance: 5, action: { kind: 'applyTag', tag: 'staggered' } },
  ],
  // "Marked for Cleave consume payoffs deal +5/10/15/20/25% damage on
  // AoE consumers." First-slice approximation as flat +damage-vs-cleave-
  // marked-targets via whileTag (fires on every hit against a marked
  // target, not just the AoE-consume hit). True consume-only payoff
  // needs a consume hook — Phase F follow-on.
  'brs_jg_cleave_mastery': [
    { kind: 'whileTag', tag: 'cleave', stat: 'damageMult', mult: 1.05 },
  ],
  // "On killing a Marked for Cleave enemy, +20/40/60% chance to apply
  // Marked for Cleave to all enemies in encounter." procOnKill's
  // targetTag filter restricts the proc to kills on marked enemies.
  'brs_jg_cleave_cascade': [
    { kind: 'procOnKill', targetTag: 'cleave', chance: 20, action: { kind: 'applyTagAll', tag: 'cleave' } },
  ],
  // "+2/4/6/8/10% cooldown recovery while no offhand equipped."
  'brs_jg_mountains_step': [
    { kind: 'whileOffhandAbsent', stat: 'cooldownRecovery', mult: 1, delta: 2 },
  ],
  // "AoE skill radius/reach +5/10/15/20/25%." Silent-ignore safe.
  'brs_jg_cleave_reach': [
    { kind: 'stat', stat: 'aoeRadius', delta: 5 },
  ],
  // "Multi-target kills (kills with same skill within 1s) refund
  // +1/2/3/4/5 rage per chained kill." This game has no rage —
  // approximated as refundMana. Math: chance=20 scales linearly per
  // rank to 100%, amount=5 fires once per chained kill. Rank 1 =
  // 20% chance × 5 = +1 expected mana per chain (matches spec's
  // +1 rage). Rank 5 = 100% × 5 = +5 mana per chain (matches +5
  // rage). Mathematically equivalent in expectation.
  'brs_jg_mass_slaughter': [
    { kind: 'procOnMultiKillChain', chance: 20, action: { kind: 'refundMana', amount: 5 } },
  ],
  // "On taking a hit, +1/2/3/4/5% chance to gain a Bulwark charge
  // (reduces next hit's damage by 50%)." First-slice approximation
  // via grantBuff bulwark_charge — stackable defenseMult tempBuff
  // (1.2 per stack, up to 3). True "consume on next hit" semantic
  // deferred (would need procOnBulwarkConsume for sustained_aegis).
  // procOnHitTaken with no critTaken filter = fires on any hit taken.
  'brs_jg_stalwart_spirit': [
    { kind: 'procOnHitTaken', chance: 1, action: { kind: 'grantBuff', buffId: 'bulwark_charge', duration: 5 } },
  ],
  // "On Bulwark charge consumed, +20/40/60% chance to grant another
  // Bulwark charge instantly." procOnBulwarkConsume fires after a
  // Bulwark stack absorbs a hit (damage halved + stack removed).
  // Action grants a fresh bulwark_charge tempBuff via grantBuff —
  // dispatcher's mergeProcTempBuff handles the stack-or-refresh
  // logic. Net effect: at high ranks, Bulwark stacks self-sustain
  // through extended fights.
  'brs_jg_sustained_aegis': [
    { kind: 'procOnBulwarkConsume', chance: 20, action: { kind: 'grantBuff', buffId: 'bulwark_charge', duration: 5 } },
  ],
  // "+5/10/15% damage while no offhand equipped." mult=1.05 scales:
  // rank 1 → 1.05, rank 3 → 1.15.
  'brs_jg_mountains_wrath': [
    { kind: 'whileOffhandAbsent', stat: 'damageMult', mult: 1.05 },
  ],
  // "On Stagger application, +25/50/75% chance to apply Stagger to all
  // enemies in encounter." procOnTag fires whenever applyTag/applyTagAll
  // adds a 'staggered' debuff (cascade is recursion-guarded by the
  // dispatcher's _inProcOnTag flag — won't infinite loop).
  'brs_jg_stagger_cascade': [
    { kind: 'procOnTag', tag: 'staggered', chance: 25, action: { kind: 'applyTagAll', tag: 'staggered' } },
  ],
  // "On taking a non-crit hit, +1/2/3/4/5% chance to apply Staggered
  // to the attacker." procOnHitTaken with critTaken=false fires only
  // on non-crit hits taken; applyTag 'staggered' is the placeholder
  // debuff (no live mechanic yet — slot reserved for Phase F follow-on).
  'brs_jg_stalwart_mastery': [
    { kind: 'procOnHitTaken', critTaken: false, chance: 1, action: { kind: 'applyTag', tag: 'staggered' } },
  ],
  // "On taking a critical hit, +20/40/60/80/100% chance to gain
  // Ironclad Stance (defenseMult buff for 2s)." procOnHitTaken with
  // critTaken=true fires only on crits taken. ironclad_stance buff
  // mirrors bone_armor — multiplies armor/evasion by 1.3.
  'brs_jg_ironclad': [
    { kind: 'procOnHitTaken', critTaken: true, chance: 20, action: { kind: 'grantBuff', buffId: 'ironclad_stance', duration: 2 } },
  ],
  // Capstone (1 rank): "While no offhand, damage taken −30% AND AoE
  // radius +50%." Mirrors §10.1 Juggernaut keystone — Class-First per
  // §6.3 (offhand-conditional, not weapon-conditional).
  'brs_jg_mountain': [
    { kind: 'whileOffhandAbsent', stat: 'damageTakenReduction', mult: 1, delta: 30 },
    { kind: 'whileOffhandAbsent', stat: 'aoeRadius', mult: 1, delta: 50 },
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
  // Phase F F5b (2026-05-06): Precision Payoff engine landed. A hit
  // on a Marked target by a skill different from the one that applied
  // Mark gets a damage bonus equal to the sum of all precisionPayoff
  // bonusPercents and consumes the Mark.
  // "+5/10/15/20/25% damage on Precision Payoff hits."
  'hnt_mm_precision_payoff_mastery': [
    { kind: 'precisionPayoff', bonusPercent: 5 },
  ],
  // F5b also unlocks whileTag.delta — additive variant so percent
  // stats author cleanly. "+2/4/6/8/10% crit chance vs Marked targets."
  'hnt_mm_critical_aim': [
    { kind: 'whileTag', tag: 'mark', stat: 'critChance', mult: 1, delta: 2 },
  ],
  // "+5/10/15/20/25% crit damage vs Marked targets."
  'hnt_mm_headshot_sense': [
    { kind: 'whileTag', tag: 'mark', stat: 'critMultiplier', mult: 1, delta: 5 },
  ],
  // Phase F polish (2026-05-06): procOnTag cascade landed. "On Mark
  // application, +5/10/15/20/25% chance to gain a guaranteed-crit
  // charge for the follow-up Precision Payoff." Approximated as
  // procOnTag(mark) → grantBuff(precision_charge) — buff grants
  // critChanceBonus 100 for 4s (single-use semantics aren't precise
  // since duration buffs don't auto-consume on first hit, but the
  // crit-floor effect lands).
  'hnt_mm_hunters_eye': [
    { kind: 'procOnTag', tag: 'mark', chance: 5, action: { kind: 'grantBuff', buffId: 'precision_charge', duration: 4 } },
  ],
  // "On crit, +1/2/3/4/5% chance to instantly Mark another enemy."
  // Approximated as procOnCrit applyTagAll(mark) — broader than
  // design's "another enemy" intent (broadcasts to all instead of
  // picking one).
  'hnt_mm_critical_cycle': [
    { kind: 'procOnCrit', chance: 1, action: { kind: 'applyTagAll', tag: 'mark', stacks: 1, duration: 8 } },
  ],
  // "On crit-killing a Marked target, +20/40/60% chance to instantly
  // Mark all enemies." Approximated as procOnKill applyTagAll(mark)
  // (the target-Marked + crit gates are dropped — fires on any crit-
  // kill since procOnKill cannot filter by target debuff today).
  'hnt_mm_mark_reset': [
    { kind: 'procOnKill', chance: 20, action: { kind: 'applyTagAll', tag: 'mark', stacks: 1, duration: 8 } },
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
  // F4 follow-on landed the summon runtime, so this now actually spawns
  // a singleton type='companion' MinionState. The Mark-auto-inheritance
  // half of the design ("companion auto-inherits Mark application from
  // your hits") is approximated by the inheritance % roll below — Mark
  // is part of the player's procOnHit pipeline (Hunter Mark nodes), so
  // inheritance % carries Mark application along automatically.
  'hnt_bm_pack_leader_preview': [
    { kind: 'grantCompanion', minionType: 'companion' },
  ],
  // "Companion inherits +5/10/15/20/25% of your on-hit procs."
  // Phase F F4 polish (2026-05-06): the headline Beastmaster mechanic.
  // Per-attack roll fires the player's procOnHit/procOnCrit pipeline
  // through the companion's hits, so all Hunter procOnHit/procOnCrit
  // entries (Mark application, refundMana, applyTagAll etc.) flow
  // through the pet at the rolled chance.
  'hnt_bm_packs_inheritance': [
    { kind: 'companionProcInheritance', percent: 5 },
  ],
  // "Companion inherits +25/50/75% of your on-hit procs (scales)."
  // Stacks additively with Pack's Inheritance — the cap (100%) is
  // applied during dispatch in tick.ts.
  'hnt_bm_pack_inheritance_mastery': [
    { kind: 'companionProcInheritance', percent: 25 },
  ],
  // "While companion is alive, +1/2/3/4/5% crit chance."
  'hnt_bm_pack_awareness': [
    { kind: 'whileCompanionAlive', stat: 'critChance', mult: 1.01 },
  ],
  // "While companion is alive, +5/10/15/20/25% damage to you."
  'hnt_bm_pack_synergy': [
    { kind: 'whileCompanionAlive', stat: 'damageMult', mult: 1.05 },
  ],
  // "+5/10/15/20/25% companion damage while you are above 75% HP." Stat
  // companionDamage silent-ignores until ResolvedStats lands the field —
  // forward-compat seed but the conditional gating fires correctly today.
  'hnt_bm_companions_fury': [
    { kind: 'whileSelfHpAbove', threshold: 0.75, stat: 'companionDamage', mult: 1, delta: 5 },
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

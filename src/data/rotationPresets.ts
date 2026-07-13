// ============================================================
// Rotation presets — the shipped gambit library (RotationPanel v1).
//
// SINGLE SOURCE OF TRUTH for preset gambits: sim/gambit-ab.ts imports
// DAGGER_TEMPO_POLICY from here, so the values below are exactly what
// GATE E1 measured (smart vs best blind: mean +15.6%, CI95
// [+11.8, +19.5]). Do NOT edit rule values without re-running
// `npx tsx sim/gambit-ab.ts` — the gate reads the CI lower bound.
//
// Preset selection UI: RotationPanel filters by equipped weapon type
// (slot_order always shown). policy: null = legacy slot-order (the
// implicit slotOrderPolicy in engine/ir/rotationPolicy.ts).
// ============================================================

import type { RotationPolicy } from '../types/rotation';
import type { WeaponType } from '../types/items';

export interface RotationPresetDef {
  id: string;
  name: string;
  blurb: string;
  /** null = weapon-agnostic (shown for every weapon). */
  weaponType: WeaponType | null;
  /** null = slot-order (the implicit default policy). */
  policy: RotationPolicy | null;
}

// ── Dagger "Tempo Assassin" — COMBAT_ECONOMY_DESIGN §2.3, GATE-E1
// tested verbatim (sim/gambit-ab.ts DAGGER experiment). Rule values
// are sacred: 9 tuning iterations landed exactly these. ──
export const DAGGER_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    // 1. Wet spend — react to the Opening with a meaningful ledger
    { id: 'wet_spend', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'opening', count: 1 } },
      { stateCountAtLeast: { stateId: 'momentum', count: 3 } },
      { skillReady: 'dagger_assassinate' },
    ] }, action: { kind: 'castSkill', skillId: 'dagger_assassinate' } },
    // 2. Culling band — execute below 30% regardless of window
    { id: 'culling_band', enabled: true, when: { all: [
      { targetHpBelow: 0.30 },
      { stateCountAtLeast: { stateId: 'momentum', count: 4 } },
    ] }, action: { kind: 'castSkill', skillId: 'dagger_assassinate' } },
    // NO cap-dump rule (iteration-8 lesson): holding a full ledger is
    // FREE — overcap builder gains are already worthless, builders keep
    // dealing damage while parked, and a dry Perfect (~450) preempts a
    // wet Perfect (~900) that arrives with the next window. Spend ONLY
    // into windows (rule 1) or the execute band (rule 2).
    // 3-6. Builders at FULL parity with the blind arm (iteration-1
    // lesson: benching Blade Dance/Viper starved throughput −13%;
    // Viper builds no momentum so casting it is always ledger-free —
    // the smart arm's edge must come from spend TIMING alone).
    { id: 'dance', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_blade_dance' } },
    { id: 'viper', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_viper_strike' } },
    { id: 'builder', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_chain_strike', minMana: 22 } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_stab' } },
  ],
};

// ── Bow "Marked Tempo" — COMBAT_ECONOMY_DESIGN §3, the GATE-E3
// experiment policy (sim/gambit-ab.ts BOW experiment). Same chassis as
// Tempo Assassin: no cap-dump, spend only into windows/execute; plus
// the bow-specific axes — Mark upkeep gates the windows, and Rapid
// Fire is held below cap to dodge the overcap trap. ──
export const BOW_MARKED_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    // 1. Mark upkeep — table stakes: windows only open vs Marked targets
    { id: 'mark_upkeep', enabled: true, when: { targetLacksTag: 'mark' }, action: { kind: 'castSkill', skillId: 'bow_hunters_mark' } },
    // 2. Wet spend — Vulnerable window + a meaningful quiver
    { id: 'wet_spend', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'vulnerable', count: 1 } },
      { stateCountAtLeast: { stateId: 'quiver', count: 4 } },
      { skillReady: 'bow_snipe' },
    ] }, action: { kind: 'castSkill', skillId: 'bow_snipe' } },
    // 3. Execute band — Tracking Shot ×2 below 35% (hunter innate)
    { id: 'execute_band', enabled: true, when: { targetHpBelow: 0.35 }, action: { kind: 'castSkill', skillId: 'bow_tracking_shot' } },
    // 3b. CAP-DUMP (E3 iteration-3 — the dagger lesson MIRRORED):
    // bow windows are scarce (~1 per 50s vs dagger's ~8s), while the
    // blind bar under-spends (last-slot snipe fires every ~12.5s vs a
    // ~7.5s build-to-cap). The bow edge is OUT-SPENDING blind at cap,
    // not withholding: dump Perfects on cooldown, wet when lucky.
    { id: 'cap_dump', enabled: true, when:
      { stateCountAtLeast: { stateId: 'quiver', count: 6 } },
      action: { kind: 'castSkill', skillId: 'bow_snipe' } },
    // 4. Rapid Fire UNCONDITIONAL (E3 iteration-1 lesson, the dagger
    // lesson mirrored): overcap GAINS are free to waste, but holding
    // the kit's crit engine is not — gating rapid below cap starved
    // crits → windows → spends (32 vs 192 casts, snipe ×23, −36%).
    { id: 'rapid', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_rapid_fire' } },
    // 5-6. Builders/filler at parity (dagger iteration-1 lesson)
    { id: 'builder', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_arrow_shot', minMana: 25 } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_burning_arrow' } },
  ],
};

// ── Wand "Attuned Tempo" — Wave E4, the GATE-E4a experiment policy.
// Out-spend chassis (Marked Tempo's): dump Perfects at cap, take
// Surges as bonuses; Essence Drain is ledger-free, cast it freely. ──
export const WAND_ATTUNED_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'wet_spend', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'arcane_surge', count: 1 } },
      { stateCountAtLeast: { stateId: 'attunement', count: 3 } },
      { skillReady: 'wand_void_blast' },
    ] }, action: { kind: 'castSkill', skillId: 'wand_void_blast' } },
    // AoE arbitration (E4a iteration-4 — the parity lesson, third
    // time): Volley is the kit's biggest cast in packs; blind casts it
    // blindly even single-target, smart routes the ledger — Volley for
    // 3+ enemies, Void Blast for single targets.
    { id: 'volley_packs', enabled: true, when: { all: [
      { enemyCountAtLeast: 3 },
      { stateCountAtLeast: { stateId: 'attunement', count: 3 } },
    ] }, action: { kind: 'castSkill', skillId: 'wand_volley_convergence' } },
    // Cap-dump (E4a iteration-2: at ~10% spell crit the Surge windows
    // are scarce — wand is an OUT-SPEND kit like bow, not withhold).
    { id: 'cap_dump', enabled: true, when:
      { stateCountAtLeast: { stateId: 'attunement', count: 5 } },
      action: { kind: 'castSkill', skillId: 'wand_void_blast' } },
    // Volley still fires single-target when Void Blast is on cooldown
    // and the ledger is full (never idle a capped ledger with both
    // spenders down).
    { id: 'volley_overflow', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'attunement', count: 5 } },
      { not: { skillReady: 'wand_void_blast' } },
    ] }, action: { kind: 'castSkill', skillId: 'wand_volley_convergence' } },
    // Builders/park at full parity (dagger iteration-1 lesson).
    { id: 'chain', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_chain_lightning' } },
    { id: 'frost', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_frostbolt' } },
    { id: 'park', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_essence_drain' } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_magic_missile', minMana: 24 } },
  ],
};

// ── Staff "Soul Tempo" — Wave E4b, the GATE-E4b experiment policy.
// Withhold-plus-pairs chassis: hold souls for Perfects/Frenzies, and
// keep the setup-consume pairs primed (Hex doubles Soul Harvest,
// Haunt guarantees Spirit Barrage crits → Ritual Frenzy windows). ──
export const STAFF_SOUL_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'wet_spend', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'ritual_frenzy', count: 1 } },
      { stateCountAtLeast: { stateId: 'soul_stack', count: 4 } },
      { skillReady: 'staff_bouncing_skull' },
    ] }, action: { kind: 'castSkill', skillId: 'staff_bouncing_skull' } },
    { id: 'cap_dump', enabled: true, when:
      { stateCountAtLeast: { stateId: 'soul_stack', count: 6 } },
      action: { kind: 'castSkill', skillId: 'staff_bouncing_skull' } },
    // Engines FIRST (E4b iteration-4 lesson — never bench the engine,
    // third appearance): Harvest is the soul engine, Locust the window
    // engine; both outrank pair upkeep.
    { id: 'harvest', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'staff_soul_harvest' } },
    { id: 'locust', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'staff_locust_swarm' } },
    // Pair upkeep: Hex doubles Harvest, Haunt guarantees Barrage crits.
    { id: 'haunt_upkeep', enabled: true, when:
      { stateCountBelow: { stateId: 'haunted', count: 1 } },
      action: { kind: 'castSkill', skillId: 'staff_haunt' } },
    { id: 'barrage', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'staff_spirit_barrage' } },
    { id: 'hex_upkeep', enabled: true, when:
      { stateCountBelow: { stateId: 'hexed', count: 1 } },
      action: { kind: 'castSkill', skillId: 'staff_hex' } },
  ],
};

// ── Flail "Rampage Tempo" — Wave E4c (owner Q6 option b). Rampage
// opens ON crossing full Fury (capReached), so the wet rule usually
// catches it; the cap-dump below is the deadlock guard — capReached
// will not re-fire while parked at cap, so a missed window would
// otherwise freeze the ledger. ──
export const FLAIL_RAMPAGE_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'wet_spend', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'rampage', count: 1 } },
      { stateCountAtLeast: { stateId: 'fury_charge', count: 5 } },
      { skillReady: 'flail_crushing_blow' },
    ] }, action: { kind: 'castSkill', skillId: 'flail_crushing_blow' } },
    { id: 'cap_dump', enabled: true, when:
      { stateCountAtLeast: { stateId: 'fury_charge', count: 8 } },
      action: { kind: 'castSkill', skillId: 'flail_crushing_blow' } },
    { id: 'arc', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_arc_sweep' } },
    { id: 'hooked', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_hooked_strike' } },
    { id: 'bone', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_bone_crusher' } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_disarming_strike', minMana: 12 } },
  ],
};

// ── Wave E5 variant presets: the payoff-shape nodes flip which preset
// wins (GATE E5). Ruthless Tempo suits flat-spender builds (spend on
// cooldown at 3+); Snap Shot suits Splitburst bows (jackpot from 4+). ──
export const DAGGER_RUTHLESS_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'spend', enabled: true, when:
      { stateCountAtLeast: { stateId: 'momentum', count: 3 } },
      action: { kind: 'castSkill', skillId: 'dagger_assassinate' } },
    { id: 'dance', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_blade_dance' } },
    { id: 'viper', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_viper_strike' } },
    { id: 'builder', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_chain_strike', minMana: 22 } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_stab' } },
  ],
};
export const BOW_SNAP_SHOT_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'mark_upkeep', enabled: true, when: { targetLacksTag: 'mark' }, action: { kind: 'castSkill', skillId: 'bow_hunters_mark' } },
    { id: 'spend', enabled: true, when:
      { stateCountAtLeast: { stateId: 'quiver', count: 4 } },
      action: { kind: 'castSkill', skillId: 'bow_snipe' } },
    { id: 'rapid', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_rapid_fire' } },
    { id: 'builder', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_arrow_shot', minMana: 25 } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_burning_arrow' } },
  ],
};

// ── Variation-pair variant presets (2026-07-12): flat-shape builds
// spend on cooldown at their rule's minStacks/capFrom threshold and
// ignore windows (their rules render windows inert). Builder/engine/
// upkeep structure copied from each kit's tempo preset (parity law). ──
export const WAND_VOID_HUNGER_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'spend', enabled: true, when:
      { stateCountAtLeast: { stateId: 'attunement', count: 3 } },
      action: { kind: 'castSkill', skillId: 'wand_void_blast' } },
    // Keep the ST-vs-AoE arbitration — it's kit structure, not shape.
    { id: 'volley_packs', enabled: true, when: { all: [
      { enemyCountAtLeast: 3 },
      { stateCountAtLeast: { stateId: 'attunement', count: 3 } },
    ] }, action: { kind: 'castSkill', skillId: 'wand_volley_convergence' } },
    { id: 'chain', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_chain_lightning' } },
    { id: 'frost', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_frostbolt' } },
    { id: 'park', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_essence_drain' } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'wand_magic_missile', minMana: 24 } },
  ],
};
export const STAFF_DEATH_TIDE_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'spend', enabled: true, when:
      { stateCountAtLeast: { stateId: 'soul_stack', count: 4 } },
      action: { kind: 'castSkill', skillId: 'staff_bouncing_skull' } },
    { id: 'harvest', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'staff_soul_harvest' } },
    { id: 'locust', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'staff_locust_swarm' } },
    { id: 'haunt_upkeep', enabled: true, when:
      { stateCountBelow: { stateId: 'haunted', count: 1 } },
      action: { kind: 'castSkill', skillId: 'staff_haunt' } },
    { id: 'barrage', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'staff_spirit_barrage' } },
    { id: 'hex_upkeep', enabled: true, when:
      { stateCountBelow: { stateId: 'hexed', count: 1 } },
      action: { kind: 'castSkill', skillId: 'staff_hex' } },
  ],
};
// ── Claws "Ravage Tempo" — Wave A. The HOT ledger (frenzy rots 6s
// after last gain) inverts the dagger no-cap-dump law: cap_dump is
// MANDATORY here. Park (Bleeding Edge) stocks bleed for the Arterial
// detonate; Thousand Cuts is the overcap trap (only cast below 4).
// No minMana reserves: assassin is mana-free per E20. ──
export const CLAWS_RAVAGE_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    // AoE arbitration FIRST (iteration-2, the wand volley lesson): in
    // packs the pool belongs to Tempest — iteration 1 spent it on ST
    // Frenzy Strikes (19 vs blind's 142 tempests) and lost −12%.
    { id: 'tempest_aoe', enabled: true, when: { all: [
      { enemyCountAtLeast: 3 },
      { stateCountAtLeast: { stateId: 'frenzy', count: 3 } },
    ] }, action: { kind: 'castSkill', skillId: 'claws_crimson_tempest' } },
    { id: 'wet_spend', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'arterial', count: 1 } },
      { stateCountAtLeast: { stateId: 'frenzy', count: 4 } },
      { skillReady: 'claws_frenzy_strike' },
    ] }, action: { kind: 'castSkill', skillId: 'claws_frenzy_strike' } },
    { id: 'culling', enabled: true, when: { all: [
      { targetHpBelow: 0.30 },
      { stateCountAtLeast: { stateId: 'frenzy', count: 6 } },
    ] }, action: { kind: 'castSkill', skillId: 'claws_frenzy_strike' } },
    { id: 'park', enabled: true, when: { all: [
      { stateCountAtLeast: { stateId: 'frenzy', count: 7 } },
      { stateCountBelow: { stateId: 'arterial', count: 1 } },
    ] }, action: { kind: 'castSkill', skillId: 'claws_bleeding_edge' } },
    // NO cap-dump (iteration-10 — the full dagger shape): frenzy
    // refreshes on every gain, so parking a full ledger while builders
    // keep casting is FREE; a dry Perfect preempts the wet Perfect that
    // arrives with the next window/execute. Spend ONLY into windows
    // (wet_spend), the execute band (culling), or packs (tempest_aoe).
    // Bleeding Edge at FULL parity (iteration-3 — the never-bench-an-
    // engine-skill law, 4th appearance): it is ledger-free (builds no
    // frenzy, like dagger's Viper) and it IS the bleed engine that
    // funds the Arterial detonate. Benching it cost 20%.
    { id: 'edge', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_bleeding_edge' } },
    // Cuts UNCONDITIONAL (iteration-5 — the bow rapid-fire lesson,
    // 5th appearance: overcap gains are free to waste, but holding the
    // BLEED ENGINE starves windows and detonates).
    { id: 'cuts', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_thousand_cuts' } },
    { id: 'razor', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_razor_wind' } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_dual_strike' } },
    // idle_dump (iteration-7): smart idled ~260 GCDs that blind filled
    // with "wasted" Tempests — a 0.65×wd cast beats an empty tick. Only
    // when the pool is trivial (≤1) so the consume leaks nothing.
    { id: 'idle_dump', enabled: true, when:
      { stateCountBelow: { stateId: 'frenzy', count: 2 } },
      action: { kind: 'castSkill', skillId: 'claws_crimson_tempest' } },
  ],
};
export const CLAWS_RABID_TEMPO_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'spend', enabled: true, when:
      { stateCountAtLeast: { stateId: 'frenzy', count: 3 } },
      action: { kind: 'castSkill', skillId: 'claws_frenzy_strike' } },
    { id: 'tempest_aoe', enabled: true, when: { all: [
      { enemyCountAtLeast: 3 },
      { stateCountAtLeast: { stateId: 'frenzy', count: 3 } },
    ] }, action: { kind: 'castSkill', skillId: 'claws_crimson_tempest' } },
    // Engine parity with Ravage Tempo (never bench an engine skill —
    // 6th appearance): edge/cuts/razor/dual all run; only the SPEND
    // POLICY differs between the presets.
    { id: 'edge', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_bleeding_edge' } },
    { id: 'cuts', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_thousand_cuts' } },
    { id: 'razor', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_razor_wind' } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'claws_dual_strike' } },
    { id: 'idle_dump', enabled: true, when:
      { stateCountBelow: { stateId: 'frenzy', count: 2 } },
      action: { kind: 'castSkill', skillId: 'claws_crimson_tempest' } },
  ],
};

export const FLAIL_BLOOD_RUSH_POLICY: RotationPolicy = {
  version: 1,
  rules: [
    { id: 'spend', enabled: true, when:
      { stateCountAtLeast: { stateId: 'fury_charge', count: 5 } },
      action: { kind: 'castSkill', skillId: 'flail_crushing_blow' } },
    { id: 'arc', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_arc_sweep' } },
    { id: 'hooked', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_hooked_strike' } },
    { id: 'bone', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_bone_crusher' } },
    { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'flail_disarming_strike', minMana: 12 } },
  ],
};

export const ROTATION_PRESETS: RotationPresetDef[] = [
  {
    id: 'slot_order',
    name: 'Slot Order',
    blurb: 'Casts skills in bar order, first available wins — the default.',
    weaponType: null,
    policy: null,
  },
  {
    id: 'dagger_tempo',
    name: 'Tempo Assassin',
    blurb: 'Banks Momentum with builders and spends Assassinate only into Openings or the sub-30% execute band — never cap-dumps a full ledger.',
    weaponType: 'dagger',
    policy: DAGGER_TEMPO_POLICY,
  },
  {
    id: 'wand_attuned_tempo',
    name: 'Attuned Tempo',
    blurb: 'Banks Attunement with elemental bolts, dumps Void Blast Perfects at cap, and doubles them inside Arcane Surges.',
    weaponType: 'wand',
    policy: WAND_ATTUNED_TEMPO_POLICY,
  },
  {
    id: 'staff_soul_tempo',
    name: 'Soul Tempo',
    blurb: 'Keeps Hex and Haunt primed for their consume pairs, banks Soul Stacks, and spends Bouncing Skull at cap or into Ritual Frenzies.',
    weaponType: 'staff',
    policy: STAFF_SOUL_TEMPO_POLICY,
  },
  {
    id: 'flail_rampage_tempo',
    name: 'Rampage Tempo',
    blurb: 'Builds Fury with strikes and the hits you take, then spends Crushing Blow into the Rampage that opens at full Fury.',
    weaponType: 'flail',
    policy: FLAIL_RAMPAGE_TEMPO_POLICY,
  },
  {
    id: 'dagger_ruthless_tempo',
    name: 'Ruthless Tempo',
    blurb: 'Spends Assassinate on cooldown at 3+ Momentum — built for Ruthlessness (flat payoff) Blademasters.',
    weaponType: 'dagger',
    policy: DAGGER_RUTHLESS_TEMPO_POLICY,
  },
  {
    id: 'bow_snap_shot',
    name: 'Snap Shot',
    blurb: 'Spends Snipe at 4+ Quiver on cooldown — built for Splitburst Marksmen.',
    weaponType: 'bow',
    policy: BOW_SNAP_SHOT_POLICY,
  },
  {
    id: 'bow_marked_tempo',
    name: 'Marked Tempo',
    blurb: 'Keeps Hunter\'s Mark up, holds Rapid Fire below cap to dodge the overcap trap, and spends Snipe only into Vulnerable windows or the sub-35% Tracking Shot band.',
    weaponType: 'bow',
    policy: BOW_MARKED_TEMPO_POLICY,
  },
  {
    id: 'wand_void_hunger',
    name: 'Void Hunger',
    blurb: 'Spends Void Blast on cooldown at 3+ Attunement — built for Void Hunger (flat payoff) Arcanists.',
    weaponType: 'wand',
    policy: WAND_VOID_HUNGER_POLICY,
  },
  {
    id: 'staff_death_tide',
    name: 'Death Tide',
    blurb: 'Spends Bouncing Skull at 4+ Souls on cooldown — built for Death Tide (early-jackpot) Plague Priests.',
    weaponType: 'staff',
    policy: STAFF_DEATH_TIDE_POLICY,
  },
  {
    id: 'claws_ravage_tempo',
    name: 'Ravage Tempo',
    blurb: 'Rides the rotting Frenzy ledger — spends into Arterial Rips or the execute band, parks Bleeding Edge at cap to stock the detonate, and NEVER lets the ledger spoil.',
    weaponType: 'claws',
    policy: CLAWS_RAVAGE_TEMPO_POLICY,
  },
  {
    id: 'claws_rabid_tempo',
    name: 'Rabid Tempo',
    blurb: 'Spends Frenzy Strike at 3+ on cooldown — built for Rabid (flat payoff) builds.',
    weaponType: 'claws',
    policy: CLAWS_RABID_TEMPO_POLICY,
  },
  {
    id: 'flail_blood_rush',
    name: 'Blood Rush',
    blurb: 'Spends Crushing Blow at 5+ Fury on cooldown, no Rampage-waiting — built for Blood Rush (flat payoff) Warlords.',
    weaponType: 'flail',
    policy: FLAIL_BLOOD_RUSH_POLICY,
  },
];

export function getRotationPreset(id: string): RotationPresetDef | undefined {
  return ROTATION_PRESETS.find(p => p.id === id);
}

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
      { stateCountAtLeast: { stateId: 'momentum', count: 3 } },
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
    id: 'bow_marked_tempo',
    name: 'Marked Tempo',
    blurb: 'Keeps Hunter\'s Mark up, holds Rapid Fire below cap to dodge the overcap trap, and spends Snipe only into Vulnerable windows or the sub-35% Tracking Shot band.',
    weaponType: 'bow',
    policy: BOW_MARKED_TEMPO_POLICY,
  },
];

export function getRotationPreset(id: string): RotationPresetDef | undefined {
  return ROTATION_PRESETS.find(p => p.id === id);
}

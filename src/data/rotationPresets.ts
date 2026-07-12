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
];

export function getRotationPreset(id: string): RotationPresetDef | undefined {
  return ROTATION_PRESETS.find(p => p.id === id);
}

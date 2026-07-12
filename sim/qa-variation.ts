#!/usr/bin/env node
// ============================================================
// GATE E5 — within-spec variation (COMBAT_ECONOMY_DESIGN §4/E17).
// Two same-spec builds (each = ONE payoff-shape node) must each
// prefer a DIFFERENT shipped preset by ≥ 3% (10-seed means).
// Dagger/Blademaster: Perfect Rhythm vs Ruthlessness.
// Bow/Marksman: Deadeye vs Splitburst.
//
// GATE E5b — power parity (balance pass 2026-07-12): the two builds'
// BEST-preset totals must sit within 1.10× of each other. Variation
// nodes are sidegrades, not tiers — pre-pass the flat builds were
// 37% (dagger) / 14% (bow) under. Levers used, in causal order:
//   flatMult 2.6→3.4 (+10% — spender share ~33% bounds raw mult),
//   flatSpender advanceOthersSec 1 (power +1% but fork 5.2→12.4% —
//     it HURTS the hold preset via builder GCD saturation),
//   perfectRefund 2→1 (shape −2.6% — refund is NOT the hot lever),
//   asn_bm_doubled_stroke unscoped ×1.30 damageMult mod (the closer:
//     fork-neutral by construction — multiplies both cells equally),
//   splitburst perStack 20→26.
// Usage: npx tsx sim/qa-variation.ts   (exit 1 on failure)
// ============================================================

import { installRng } from './rng';
import { installClock } from './clock';
const SEED_BASE = 1337;
const N_SEEDS = 10;
installClock();
installRng(SEED_BASE);

import './balance-overrides';

import { runPolicy, type Telemetry } from './kitFixture';
import {
  DAGGER_TEMPO_POLICY, DAGGER_RUTHLESS_TEMPO_POLICY,
  BOW_MARKED_TEMPO_POLICY, BOW_SNAP_SHOT_POLICY,
} from '../src/data/rotationPresets';
import type { RotationPolicy } from '../src/types/rotation';
import type { CharacterClass } from '../src/types';

const TICKS = 2400;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function cell(
  cls: CharacterClass, weapon: string, bar: string[], tel: Telemetry,
  policy: RotationPolicy, ranks: Record<string, number>,
): number {
  const runs: number[] = [];
  for (let i = 0; i < N_SEEDS; i++) {
    runs.push(runPolicy(cls, weapon, bar, policy, TICKS, SEED_BASE + i, tel, ranks).totalDamage);
  }
  return mean(runs);
}

let pass = 0, fail = 0;
function gate(
  label: string,
  cls: CharacterClass, weapon: string, bar: string[], tel: Telemetry,
  builds: Record<string, Record<string, number>>,
  presets: Record<string, RotationPolicy>,
): void {
  console.log(`\n── ${label} ──`);
  const buildNames = Object.keys(builds);
  const presetNames = Object.keys(presets);
  const prefs: Record<string, { best: string; gapPct: number; bestDmg: number }> = {};
  for (const b of buildNames) {
    const scores = presetNames.map(p => ({ p, dmg: cell(cls, weapon, bar, tel, presets[p], builds[b]) }));
    scores.sort((x, y) => y.dmg - x.dmg);
    const gapPct = ((scores[0].dmg - scores[1].dmg) / scores[1].dmg) * 100;
    prefs[b] = { best: scores[0].p, gapPct, bestDmg: scores[0].dmg };
    console.log(`  ${b}: ${scores.map(s => `${s.p}=${s.dmg.toFixed(0)}`).join('  ')} → prefers ${scores[0].p} (+${gapPct.toFixed(1)}%)`);
  }
  const distinct = new Set(buildNames.map(b => prefs[b].best)).size === buildNames.length;
  const gapsOk = buildNames.every(b => prefs[b].gapPct >= 3);
  // GATE E5b: best-vs-best power parity ≤ 1.10× (sidegrades, not tiers).
  const bests = buildNames.map(b => prefs[b].bestDmg);
  const parityRatio = Math.max(...bests) / Math.min(...bests);
  const parityOk = parityRatio <= 1.10;
  const ok = distinct && gapsOk && parityOk;
  console.log(`  distinct preferences: ${distinct ? 'PASS' : 'FAIL'}; each gap ≥ 3%: ${gapsOk ? 'PASS' : 'FAIL'}; power parity ${parityRatio.toFixed(3)}× ≤ 1.10×: ${parityOk ? 'PASS' : 'FAIL'} → ${ok ? 'PASS' : 'FAIL'}`);
  if (ok) pass++; else fail++;
}

const DAGGER_TEL: Telemetry = { spenderSkillId: 'dagger_assassinate', chargeStateId: 'momentum', windowStateId: 'opening', spendCost: 22 };
gate('DAGGER / Blademaster (Perfect Rhythm vs Ruthlessness)', 'assassin', 'dagger',
  ['dagger_stab', 'dagger_chain_strike', 'dagger_blade_dance', 'dagger_viper_strike', 'dagger_assassinate'],
  DAGGER_TEL,
  {
    perfect_rhythm: { asn_bm_killing_tempo: 1 },
    ruthless: { asn_bm_doubled_stroke: 1 },
  },
  {
    tempo_assassin: DAGGER_TEMPO_POLICY,
    ruthless_tempo: DAGGER_RUTHLESS_TEMPO_POLICY,
  });

const BOW_TEL: Telemetry = { spenderSkillId: 'bow_snipe', chargeStateId: 'quiver', windowStateId: 'vulnerable', spendCost: 25 };
gate('BOW / Marksman (Deadeye vs Splitburst)', 'hunter', 'bow',
  ['bow_arrow_shot', 'bow_rapid_fire', 'bow_hunters_mark', 'bow_burning_arrow', 'bow_tracking_shot', 'bow_snipe'],
  BOW_TEL,
  {
    deadeye: { hnt_mm_snipers_patience: 1 },
    splitburst: { hnt_mm_precision_cascade: 1 },
  },
  {
    marked_tempo: BOW_MARKED_TEMPO_POLICY,
    snap_shot: BOW_SNAP_SHOT_POLICY,
  });

console.log(`\nGATE E5 + E5b (distinct preferences ≥3% AND best-vs-best power parity ≤1.10×): ${fail === 0 ? 'PASSED' : 'FAILED'} (${pass} pass, ${fail} fail)`);
process.exit(fail > 0 ? 1 : 0);

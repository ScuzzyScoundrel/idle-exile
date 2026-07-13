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
  WAND_ATTUNED_TEMPO_POLICY, WAND_VOID_HUNGER_POLICY,
  STAFF_SOUL_TEMPO_POLICY, STAFF_DEATH_TIDE_POLICY,
  FLAIL_RAMPAGE_TEMPO_POLICY, FLAIL_BLOOD_RUSH_POLICY,
  CLAWS_RAVAGE_TEMPO_POLICY, CLAWS_RABID_TEMPO_POLICY,
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

// ── Variation-pair wave (2026-07-12): the remaining three classes,
// same proven shapes (perfectEcho/frenzySurge/windUp = shape;
// voidHunger/deathTide/bloodRush = flat). Bars from gambit-ab. ──
const WAND_TEL: Telemetry = { spenderSkillId: 'wand_void_blast', chargeStateId: 'attunement', windowStateId: 'arcane_surge', spendCost: 22 };
gate('WAND / Arcanist (Perfect Echo vs Void Hunger)', 'sorcerer', 'wand',
  ['wand_void_blast', 'wand_volley_convergence', 'wand_chain_lightning', 'wand_frostbolt', 'wand_magic_missile', 'wand_essence_drain'],
  WAND_TEL,
  {
    perfect_echo: { sor_ar_discharged_crit: 1 },
    void_hunger: { sor_ar_convergence_mastery: 1 },
  },
  {
    attuned_tempo: WAND_ATTUNED_TEMPO_POLICY,
    void_hunger: WAND_VOID_HUNGER_POLICY,
  });

const STAFF_TEL: Telemetry = { spenderSkillId: 'staff_bouncing_skull', chargeStateId: 'soul_stack', windowStateId: 'ritual_frenzy', spendCost: 12 };
gate('STAFF / Plague Priest (Frenzy Surge vs Death Tide)', 'witchdoctor', 'staff',
  ['staff_soul_harvest', 'staff_hex', 'staff_haunt', 'staff_locust_swarm', 'staff_spirit_barrage', 'staff_bouncing_skull'],
  STAFF_TEL,
  {
    frenzy_surge: { wd_pp_chaos_surge: 1 },
    death_tide: { wd_pp_death_tide: 1 },
  },
  {
    soul_tempo: STAFF_SOUL_TEMPO_POLICY,
    death_tide: STAFF_DEATH_TIDE_POLICY,
  });

const FLAIL_TEL: Telemetry = { spenderSkillId: 'flail_crushing_blow', chargeStateId: 'fury_charge', windowStateId: 'rampage', spendCost: 12 };
gate('FLAIL / Warlord (Wind-Up vs Blood Rush)', 'berserker', 'flail',
  ['flail_arc_sweep', 'flail_hooked_strike', 'flail_disarming_strike', 'flail_bone_crusher', 'flail_crushing_blow'],
  FLAIL_TEL,
  {
    wind_up: { brs_wl_wind_up_strike: 1 },
    blood_rush: { brs_wl_reapers_touch: 1 },
  },
  {
    rampage_tempo: FLAIL_RAMPAGE_TEMPO_POLICY,
    blood_rush: FLAIL_BLOOD_RUSH_POLICY,
  });

const CLAWS_TEL: Telemetry = { spenderSkillId: 'claws_frenzy_strike', chargeStateId: 'frenzy', windowStateId: 'arterial', spendCost: 12 };
gate('CLAWS / Ravage (Exsanguinate vs Rabid)', 'assassin', 'claws',
  ['claws_dual_strike', 'claws_razor_wind', 'claws_thousand_cuts', 'claws_bleeding_edge', 'claws_frenzy_strike', 'claws_crimson_tempest'],
  CLAWS_TEL,
  {
    exsanguinate: { asn_bm_bleeding_edge: 1 },
    rabid: { asn_vc_wound_mastery: 1 },
  },
  {
    ravage_tempo: CLAWS_RAVAGE_TEMPO_POLICY,
    rabid_tempo: CLAWS_RABID_TEMPO_POLICY,
  });

console.log(`\nGATE E5 + E5b (distinct preferences ≥3% AND best-vs-best power parity ≤1.10×): ${fail === 0 ? 'PASSED' : 'FAILED'} (${pass} pass, ${fail} fail)`);
process.exit(fail > 0 ? 1 : 0);

#!/usr/bin/env node
// ============================================================
// Gambit A/B — Effect IR GATE 4 harness (EFFECT_IR_DESIGN.md D28),
// upgraded per COMBAT_ECONOMY_DESIGN.md E15 (Wave E0):
//   - death reset: zone_defeat no longer zeroes the remainder of the
//     run (the raw −63% bow number was ~40% death-confound); deaths
//     are counted + reported per arm instead.
//   - ≥10 seeds with a 95% CI; the gate reads the CI LOWER BOUND.
//   - encounter mix: 3-pack / single-target / 5-swarm / long-ST
//     "boss-like" window (equal total pack HP). NOTE: no true
//     boss_fight phase is simulated — bossState plumbing is out of
//     scope for this harness; the long-ST window approximates it.
//   - per-arm telemetry: realized crit rate, mana floor, ticks below
//     spend cost, stack-at-spend histogram, wet rate (window state
//     live at spend). These falsify the E-doc's model cheaply.
// GATE 4 (project): smart gambit must beat slot-order by ≥ +10%
// (CI lower bound) on at least one build. < +5% everywhere = STOP.
// GATE E0 (null controls, run on pre-E1 content): dagger Δ ≈ 0 ± 2%,
// bow Δ ∈ [−45%, −30%] — proves the instrument before E1 tuning.
// Usage: npx tsx sim/gambit-ab.ts
// ============================================================

import { installRng } from './rng';
import { installClock } from './clock';

const SEED_BASE = 1337;
const N_SEEDS = 10;
installClock();
installRng(SEED_BASE);

import './balance-overrides';

import { createFixtureState, runPolicy, type Telemetry, type ArmStats } from './kitFixture';
void createFixtureState; // fixture is consumed via runPolicy

import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import type { GameState, ActiveDebuff, MobInPack, EquippedSkill, CharacterClass } from '../src/types';
import type { RotationPolicy } from '../src/types/rotation';
import { DAGGER_TEMPO_POLICY, BOW_MARKED_TEMPO_POLICY, WAND_ATTUNED_TEMPO_POLICY, STAFF_SOUL_TEMPO_POLICY, FLAIL_RAMPAGE_TEMPO_POLICY } from '../src/data/rotationPresets';

// ── VERDICT LOG ──
// 2026-07-12 first run (single seed, perpetual 3-packs, no death reset):
// GATE 4 FAILED — bow Δ −63.0%, dagger Δ +0.5%. CONSEQUENCE per D28:
// gambit MACHINERY ships; the RotationPanel UI does NOT until Phase 3
// content adds resource scarcity / consume payoffs. This harness is the
// re-test after each content-tuning wave (COMBAT_ECONOMY_DESIGN.md
// Gates E0/E1/E3/E4). Append new verdicts here after each gate run. ──
//
// 2026-07-12 GATE E0 (instrument nulls, 10 seeds): PASSED — bow −34.1%
// ∈ [−45,−30] (death confound was ~29pts of the raw −63); dagger −3.1%
// CI [−5.4,−0.8] (withholding casts is strictly negative in a no-payoff
// economy → the instrument cannot false-positive a gambit win).
//
// 2026-07-12 GATE E1 (dagger reference kit, 9 tuning iterations):
// PASSED — smart gambit vs BEST blind ordering: mean +15.6%, CI95
// [+11.8, +19.5]; blind 195k = 394% of pre-redesign; worst-of-3
// orderings 187k ≥ 150% floor; blind k̄ 3.83, Perfect 15.7% vs smart
// 40.4% (2.6× exclusivity). Load-bearing discoveries, in order:
//   1. Builder parity is mandatory: a gambit that benches Blade Dance /
//      Viper loses −13% on throughput alone. Viper (zero momentum gen)
//      is ledger-free — cast it freely, park with it at cap.
//   2. A builder-LAST slot ordering IS a builder-spender policy (spender
//      fires only when builders are all on cd → arrives near cap). With
//      GCD-saturating builders it hit k̄ 4.78 / 82% Perfect and beat
//      everything. FIX: builder supply must NOT saturate cast capacity
//      (U1 inverted: ~0.73 casts/s supply vs ~0.95 capacity).
//   3. NO cap-dump rule: holding a full ledger is free (overcap gains
//      are worthless anyway, builders keep dealing damage) and a dry
//      Perfect (~450) preempts a wet Perfect (~900). Spend ONLY into
//      Openings or the execute band — this single change was +7pts.
//   4. The Opening window is the ONE lever no fixed ordering can react
//      to (smart captures ~57% of windows, blind ~10-13% pro-rata);
//      many small windows (icd 3s, ×2.0) beat few large ones (icd 6s,
//      ×2.5) because the gate reads the CI lower bound and window
//      variance dominates per-seed spread.
//   5. Momentum cap 6 starves the smart arm more than blind (wet spends
//      land sub-cap) — cap 5 is correct for this cd lattice.
// CONSEQUENCE: the D28 stop-rule is LIFTED — RotationPanel UI may ship
// (with §2.3's preset as the shipped default gambit). ──
//
// 2026-07-12 GATE E3 (bow reference kit, 6 tuning iterations): PASSED —
// smart vs best blind ordering: mean +16.9%, CI95 [+14.1, +19.8];
// blind 190k = 232% of pre-redesign bow; worst-of-3 ≥ floor; smart
// out-spends 1.40× at 87% Perfect with 2.4× the wet captures.
// Load-bearing discoveries (the dagger lessons MIRRORED):
//   1. The overcap-avoidance rule was a trap for the GAMBIT: holding
//      Rapid Fire (the crit engine) starved windows → spends → −36%.
//      Overcap GAINS are free to waste; the crit engine is not.
//   2. Bow windows are scarce (~1/35s vs dagger ~8s: fixture crit
//      ~11-17% + Mark dies with each ~4s mob) — the withhold model
//      cannot work. Bow's edge is OUT-SPENDING: the blind builder-last
//      bar is contention-starved (snipe every 12.5s vs 8s build-to-cap),
//      so the smart arm cap-dumps on cooldown and takes windows as
//      bonuses. kitGate has 'withhold' vs 'outspend' exclusivity models.
//   3. Deterministic levers beat stochastic ones for the CI lower
//      bound: enriching scarce windows (×2.5/refund 3) froze the mean
//      and doubled variance; advanceOthersSec-on-Perfect + spender base
//      moved the mean +6.5pts with no variance cost. advanceOthersSec
//      is bow's sharpest asymmetric lever: it accelerates smart's
//      builders while REDUCING blind's all-on-cd snipe gaps.
//   4. Rapid Fire +3/flurry (the §3 value) beats +2: blind's spend
//      count is contention-FIXED, so faster generation only widens the
//      smart arm's cycle advantage (and blind wastes more at cap). ──
//
// 2026-07-12 AUTOS DISCOVERY + RE-BASELINE: the fixture never set
// nextAutoAttackAt, so `now >= undefined` was false and AUTO-ATTACKS
// NEVER FIRED in any harness run before E4c — the first four gates
// measured a skills-only world (consistent across arms, but auto
// damage dilutes live deltas). Autos are ON since E4c. Dagger and
// staff re-tuned to re-clear under dilution: momentum/soul Perfect
// capBonus 150→200 (×2.5→×3), Opening wet ×2→×2.25, and the dagger
// culling rule raised k≥3→k≥4 — its k=3 spends on dying mobs were
// VALUE-DESTRUCTIVE (that one preset change was worth ~9 CI points).
// Autos-on all-five: dagger CI-low +17.3, bow +10.8, wand +15.1,
// staff +14.3, flail +42.7.
//
// 2026-07-12 GATE E4c (flail/berserker, Q6 = option b, 4 iterations):
// PASSED — mean +45%, CI-low +42.7% vs best blind. The kit is the
// first live end-to-end exercise of the Wave-E2 generic runtime: fury
// on hitTaken (innate IR rule w/ icdSec 2 — first EffectRule.icdSec
// consumer; required adding the missing PACK-path hitTaken dispatch,
// a deferred-audit fix) and the Rampage window opened by the
// capReached stateChange event. Lessons: (1) a cap-coupled window is
// DETERMINISTIC — smart hits 100% wet-Perfect, so payoffs must be
// compressed (per-stack 22, Perfect ×2, wet ×1.5) or the gambit
// becomes a mandate (+115% at first tuning); (2) capReached does not
// re-fire while parked at cap — presets need a cap-dump deadlock
// guard; (3) the berserker floor uses floorMult 1.1 because its
// baseline is the only autos-INCLUSIVE one (like-for-like). Berserker
// stays the most gambit-rewarding class (~+45%) — rage rewards
// attention; E5 variation nodes are the lever if that needs taming. ──
//
// 2026-07-12 GATE E5 (within-spec variation, sim/qa-variation.ts, 3
// iterations): PASSED — Blademaster: Perfect Rhythm prefers Tempo
// Assassin +48.6%, Ruthlessness prefers Ruthless Tempo +5.9%;
// Marksman: Deadeye prefers Marked Tempo +62.4%, Splitburst prefers
// Snap Shot +5.6%. Mechanism: payoff-shape RULES (D15 registry, read
// at the shared consume fold via ctx.activeRules) attached to four
// previously-unwired tree nodes. THE LESSON: a flat payoff shape only
// forks the optimal gambit if it also renders the wet WINDOWS inert —
// with windows live, the hold-preset spends nearly as often as the
// spend-fast preset (dagger windows fire ~every cd) and the fork
// collapses to ±0.2%. "No finesse" is the fork. KNOWN IMBALANCE: the
// flat builds total ~35% below the shape builds — GATE E5 measures
// preference forks, not power parity; a balance pass is future work. ──
//
// 2026-07-12 GATE E4a (wand/sorcerer, 6 iterations): PASSED — smart vs
// best blind (spender-first!): mean +23.0%, CI95 [+18.2, +27.7]; every
// ordering ≥ 178% of pre-redesign. ERRATUM: resonance_charge has NO
// consume path in the engine (accumulator read by conditionals only) —
// the sorcerer ledger ships as the 'attunement' combo state; resonance
// storage unification deferred. Lessons: (1) the wand had NO weapon
// module registered (windows=0 until dataDrivenFor('wand') landed);
// (2) U8 first — both new casters were drowning (belowCost 84-91%,
// mass deaths) until costs were cut, and every other signal was noise
// until mana stopped binding; (3) benching the AoE spender (Volley)
// forfeited ~50k — the smart edge is ST-vs-AoE ARBITRATION (Volley in
// packs, Void Blast single-target), which no fixed order can express.
//
// 2026-07-12 GATE E4b (staff/witchdoctor, 6 iterations): PASSED —
// mean +16.6%, CI95 [+12.2, +20.9]; blind = 317% of pre-redesign.
// Lessons: (1) a window creator ADJACENT to the spender in bar order
// phase-locks windows onto blind spends (Barrage slot-5 crit → Skull
// slot-6 wet, 80% free capture) — windows must ride a skill distant
// from the spender (Locust); (2) without icd support in the staff
// creation path the window spammed to ~80% uptime — uptime ≤ ~35%
// (U4) is what makes capture a skill; (3) never bench the engine,
// third appearance: Harvest (souls) and Locust (windows) outrank the
// pair-upkeep rules; (4) the spender's damage SHARE bounds the gate —
// Skull at ~15/bounce could not surface a 1.4× per-spend edge until
// its base doubled. ──

const TICKS = 2400; // 1200s simulated at 0.5s ticks (E1 iter 6: doubled to tighten the CI — the gate reads its lower bound)
const SIM_SEC = TICKS * 0.5;
const fmt = (m: Map<string, number>) => [...m.entries()].map(([k, v]) => `${k}×${v}`).join(', ');
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1));
};
const T_CRIT_DF9 = 2.262; // two-sided 95%, n=10

function summarize(arms: ArmStats[], tel: Telemetry): string {
  const dmg = mean(arms.map(a => a.totalDamage));
  const deaths = arms.reduce((a, x) => a + x.deaths, 0);
  const crit = arms.reduce((a, x) => a + x.critTicks, 0) / Math.max(1, arms.reduce((a, x) => a + x.hitTicks, 0));
  const manaMin = Math.min(...arms.map(a => a.manaMin));
  const belowPct = arms.reduce((a, x) => a + x.manaBelowCostTicks, 0) / arms.reduce((a, x) => a + x.ticks, 0) * 100;
  let spendLine = '';
  if (tel.spenderSkillId) {
    const all = arms.flatMap(a => a.spendStacks);
    const kbar = all.length ? mean(all) : 0;
    const hist = new Map<number, number>();
    for (const k of all) hist.set(k, (hist.get(k) ?? 0) + 1);
    const histStr = [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}:${n}`).join(' ');
    const spends = arms.reduce((a, x) => a + x.totalSpends, 0);
    const wet = tel.windowStateId
      ? ` wet=${(arms.reduce((a, x) => a + x.wetSpends, 0) / Math.max(1, spends) * 100).toFixed(0)}%`
      : '';
    const windows = arms.reduce((a, x) => a + x.windowsCreated, 0);
    const winStr = tel.windowStateId ? ` windows=${windows}` : '';
    spendLine = `\n    ${tel.spenderSkillId}: spends=${spends} k̄=${kbar.toFixed(2)} hist[${histStr}]${wet}${winStr}`;
  }
  return `damage=${dmg.toFixed(0)} deaths=${deaths} crit=${(crit * 100).toFixed(1)}% manaMin=${manaMin.toFixed(0)} belowCost=${belowPct.toFixed(1)}% casts: ${fmt(arms[0].casts)}${spendLine}`;
}

function experiment(
  label: string,
  cls: CharacterClass,
  weaponType: string,
  bar: string[],
  gambit: RotationPolicy,
  tel: Telemetry,
): { meanDelta: number; ciLow: number; ciHigh: number; aDamage: number; bDamage: number; aArms: ArmStats[]; bArms: ArmStats[] } {
  const aArms: ArmStats[] = [];
  const bArms: ArmStats[] = [];
  const deltas: number[] = [];
  for (let i = 0; i < N_SEEDS; i++) {
    const seed = SEED_BASE + i;
    const a = runPolicy(cls, weaponType, bar, null, TICKS, seed, tel);
    const b = runPolicy(cls, weaponType, bar, gambit, TICKS, seed, tel);
    aArms.push(a);
    bArms.push(b);
    deltas.push(((b.totalDamage - a.totalDamage) / a.totalDamage) * 100);
  }
  const m = mean(deltas);
  const half = T_CRIT_DF9 * sd(deltas) / Math.sqrt(N_SEEDS);
  console.log(`\n── ${label} ── (${N_SEEDS} seeds)`);
  console.log(`A slot-order: ${summarize(aArms, tel)}`);
  console.log(`B gambit:     ${summarize(bArms, tel)}`);
  console.log(`Δ total damage: mean ${m.toFixed(1)}%  CI95 [${(m - half).toFixed(1)}%, ${(m + half).toFixed(1)}%]  per-seed [${deltas.map(d => d.toFixed(1)).join(', ')}]`);
  return {
    meanDelta: m, ciLow: m - half, ciHigh: m + half,
    aDamage: mean(aArms.map(x => x.totalDamage)), bDamage: mean(bArms.map(x => x.totalDamage)),
    aArms, bArms,
  };
}

/** Mean blind (slot-order) damage for an alternative bar ordering. */
function blindOrdering(cls: CharacterClass, weaponType: string, bar: string[], tel: Telemetry): number {
  const runs: number[] = [];
  for (let i = 0; i < N_SEEDS; i++) {
    runs.push(runPolicy(cls, weaponType, bar, null, TICKS, SEED_BASE + i, tel).totalDamage);
  }
  return mean(runs);
}

console.log('NOTE (E15): no true boss_fight phase simulated — the 1×3600 long-ST window approximates it.');

// Experiment 1 — bow E3 REFERENCE KIT (COMBAT_ECONOMY_DESIGN §3, Wave
// E3): quiver ledger (arrow +1 / rapid +2 overcap trap, consume-all
// Snipe ×(1+0.30k), Perfect@6 ×2.5 + guaranteed crit) + Vulnerable
// window (crit-vs-Marked, icd 3s, ×2 + refund 2) + Tracking Shot
// execute innate. Policy = the shipped "Marked Tempo" preset.
// (The pre-E3 bow null control — −34.1% ∈ [−45,−30], proving the
// death-confound decomposition — retired with the old bow content.)
const BOW_TEL: Telemetry = { spenderSkillId: 'bow_snipe', chargeStateId: 'quiver', windowStateId: 'vulnerable', spendCost: 25 };
const BOW_BAR = ['bow_arrow_shot', 'bow_rapid_fire', 'bow_hunters_mark', 'bow_burning_arrow', 'bow_tracking_shot', 'bow_snipe'];
const bow = experiment('BOW (E3 reference kit: quiver + vulnerable)', 'hunter', 'bow',
  BOW_BAR,
  BOW_MARKED_TEMPO_POLICY,
  BOW_TEL);

// Experiment 2 — dagger REFERENCE KIT (COMBAT_ECONOMY_DESIGN §2, Wave E1):
// momentum ledger (builders +1, consume-all spender ×(1+0.35k), Perfect
// jackpot at 5) + Opening wet window (crit, icd 6s, ×1.5 + refund 2) +
// Viper as park skill + culling band. Preset gambit = §2.3 verbatim.
const DAGGER_TEL: Telemetry = { spenderSkillId: 'dagger_assassinate', chargeStateId: 'momentum', windowStateId: 'opening', spendCost: 22 };
// E18 REVISED (E1 iteration 2, measured): builder-first is the BEST blind
// ordering (119,949 vs spender-first 93,150 — the last-slot spender only
// fires when builders are all on cd, arriving near cap: slot-order can
// express "build then spend"). It ships as the default, and the gambit
// is measured against it — the honest bar, since players find this.
const DAGGER_BAR = ['dagger_stab', 'dagger_chain_strike', 'dagger_blade_dance', 'dagger_viper_strike', 'dagger_assassinate'];
// The gambit literal moved to src/data/rotationPresets.ts (RotationPanel
// v1 ships it as the "Tempo Assassin" preset) — this import keeps the
// gate-tested values and the shipped preset a single source of truth.
// Rule rationale comments (no cap-dump, builder parity) live there now.
const dagger = experiment('DAGGER (E1 reference kit: momentum + opening)', 'assassin', 'dagger',
  DAGGER_BAR,
  DAGGER_TEMPO_POLICY,
  DAGGER_TEL);

// ── Shared kit-gate criteria (GATE E1 dagger / GATE E3 bow) ──
// Floor rationale (E1 iteration 4): "worst-of-3 ≥ 85% of SMART" is
// arithmetically incompatible with "smart ≥ 110% of the BEST blind" —
// the U6 intent (a no-gambit player always progresses) is measured
// against pre-redesign throughput: every plausible ordering must beat
// today's game by ≥ 50%. Perfect-exclusivity is a RATIO (E1 iterations
// 7-9): the smart arm must earn Perfects at ≥ 2× the blind rate (the
// absolute 15% was the doc's pre-measurement model guess, and the 0.5s
// tick grid quantizes sub-half-second cd dials into no-ops). The k̄
// bound scales with cap (80% — builder-last arrives ~3.8/5 at the
// dagger cd lattice).
// `model` picks the kit-appropriate exclusivity checks (E3 iteration 3):
//   'withhold' (dagger): blind must not farm the jackpot — k̄ ≤ 80% of
//     cap + Perfect rate ≤ half of smart's. Fits kits whose smart play
//     is HOLDING a full ledger for frequent windows.
//   'outspend' (bow): the blind bar structurally under-spends (last-slot
//     contention interval ≫ build-to-cap), so both arms spend at cap and
//     the smart edges are RATE + window capture: smart spends ≥ 1.3× and
//     wet-rate ≥ 2× blind. Fits kits with scarce windows.
function kitGate(
  label: string,
  exp: { ciLow: number; aDamage: number; bDamage: number; aArms: ArmStats[]; bArms: ArmStats[] },
  cap: number,
  preRedesignDps: number,
  orderings: string[][],
  cls: CharacterClass,
  weaponType: string,
  tel: Telemetry,
  model: 'withhold' | 'outspend',
  // Floor multiplier vs the frozen pre-redesign baseline. 1.5 for the
  // four legacy baselines measured with autos silently OFF (an easy bar
  // against autos-ON blind arms); 1.1 for autos-INCLUSIVE baselines
  // (flail onward) — like-for-like, the U6 core is "the worst ordering
  // must still beat the old game".
  floorMult: number = 1.5,
): boolean {
  const preRedesign = preRedesignDps * SIM_SEC;
  const orderingDamages = orderings.map((bar, i) => i === 0 ? exp.aDamage : blindOrdering(cls, weaponType, bar, tel));
  const worst = Math.min(...orderingDamages);
  const floor = preRedesign * floorMult;
  const blindSpends = exp.aArms.flatMap(a => a.spendStacks);
  const blindKbar = blindSpends.length ? mean(blindSpends) : 0;
  const blindPerfect = blindSpends.length ? blindSpends.filter(k => k >= cap).length / blindSpends.length * 100 : 0;
  const smartSpends = exp.bArms.flatMap(a => a.spendStacks);
  const smartPerfect = smartSpends.length ? smartSpends.filter(k => k >= cap).length / smartSpends.length * 100 : 0;
  const kbarMax = cap * 0.8;

  const cDelta = exp.ciLow >= 10;
  const cFloor = exp.aDamage >= preRedesign;
  const cWorst = worst >= floor;
  console.log(`\n${label}:`);
  console.log(`  smart-vs-blind CI low ≥ +10%:        ${cDelta ? 'PASS' : 'FAIL'} (${exp.ciLow.toFixed(1)}%)`);
  console.log(`  blind ≥ 100% pre-redesign (${preRedesign.toFixed(0)}): ${cFloor ? 'PASS' : 'FAIL'} (${exp.aDamage.toFixed(0)})`);
  console.log(`  worst-of-3 blind ≥ ${(floorMult * 100).toFixed(0)}% pre-redesign: ${cWorst ? 'PASS' : 'FAIL'} (worst ${worst.toFixed(0)} vs floor ${floor.toFixed(0)}; orderings [${orderingDamages.map(d => d.toFixed(0)).join(', ')}])`);
  let cA: boolean, cB: boolean;
  if (model === 'withhold') {
    cA = blindKbar <= kbarMax;
    cB = blindPerfect <= smartPerfect / 2;
    console.log(`  blind k̄ at spend ≤ ${kbarMax.toFixed(1)}:              ${cA ? 'PASS' : 'FAIL'} (${blindKbar.toFixed(2)})`);
    console.log(`  Perfect exclusivity (blind ≤ smart/2): ${cB ? 'PASS' : 'FAIL'} (blind ${blindPerfect.toFixed(1)}% vs smart ${smartPerfect.toFixed(1)}%)`);
  } else {
    const blindN = exp.aArms.reduce((a, x) => a + x.totalSpends, 0);
    const smartN = exp.bArms.reduce((a, x) => a + x.totalSpends, 0);
    // Wet capture compares COUNTS, not fractions — the out-spend model
    // deliberately makes many dry spends, which dilutes the smart arm's
    // wet FRACTION while its absolute window capture is 2×+ blind's.
    const blindWetN = exp.aArms.reduce((a, x) => a + x.wetSpends, 0);
    const smartWetN = exp.bArms.reduce((a, x) => a + x.wetSpends, 0);
    cA = smartN >= 1.3 * blindN;
    cB = smartWetN >= 2 * blindWetN;
    console.log(`  spend-rate edge (smart ≥ 1.3× blind): ${cA ? 'PASS' : 'FAIL'} (smart ${smartN} vs blind ${blindN})`);
    console.log(`  wet-capture edge (smart ≥ 2× blind):  ${cB ? 'PASS' : 'FAIL'} (smart ${smartWetN} wet spends vs blind ${blindWetN})`);
  }
  const ok = cDelta && cFloor && cWorst && cA && cB;
  console.log(`  ${label}: ${ok ? 'PASSED' : 'FAILED'}`);
  return ok;
}

// Pre-redesign blind DPS baselines, measured 2026-07-12 on this exact
// fixture/encounter-mix/seeds before each kit landed (U6 idle floors).
const PRE_E1_DAGGER_DPS = 49486 / 600;
const PRE_E3_BOW_DPS = 81832 / 1200;

const gateE1 = kitGate('GATE E1 (dagger reference kit)', dagger, 5, PRE_E1_DAGGER_DPS, [
  DAGGER_BAR,                                                                                    // builder-first (shipped default — measured best blind)
  ['dagger_assassinate', 'dagger_viper_strike', 'dagger_blade_dance', 'dagger_chain_strike', 'dagger_stab'], // spender-first
  ['dagger_viper_strike', 'dagger_blade_dance', 'dagger_assassinate', 'dagger_chain_strike', 'dagger_stab'], // mixed
], 'assassin', 'dagger', DAGGER_TEL, 'withhold');

const gateE3 = kitGate('GATE E3 (bow reference kit)', bow, 6, PRE_E3_BOW_DPS, [
  BOW_BAR,                                                                                       // builder-first (shipped default)
  ['bow_snipe', 'bow_tracking_shot', 'bow_rapid_fire', 'bow_arrow_shot', 'bow_hunters_mark', 'bow_burning_arrow'], // spender-first
  ['bow_rapid_fire', 'bow_snipe', 'bow_arrow_shot', 'bow_burning_arrow', 'bow_tracking_shot', 'bow_hunters_mark'], // mixed
], 'hunter', 'bow', BOW_TEL, 'outspend');

// Experiment 3 — wand/sorcerer E4a REFERENCE KIT (Wave E4): attunement
// ledger (bolts +1, Void Blast consume-all ×(1+0.30k), Perfect@5 ×2.5 +
// advance 1s) + Arcane Surge window (bolt crits, icd 3s, ×2 + refund 3)
// + Essence Drain park. Withhold model (dagger-shaped).
// PRE-E4a baseline measured 2026-07-12 (blind, old wand data): 49,887.
const WAND_TEL: Telemetry = { spenderSkillId: 'wand_void_blast', chargeStateId: 'attunement', windowStateId: 'arcane_surge', spendCost: 24 };
// E18 principle (measured, E4a iteration 4): spender-first is the BEST
// blind wand ordering (100,454 vs builder-first 87,594) — void/volley
// on cooldown at low k̄ beats hoarding. It ships as the default and the
// gambit is measured against it.
const WAND_BAR = ['wand_void_blast', 'wand_volley_convergence', 'wand_chain_lightning', 'wand_frostbolt', 'wand_magic_missile', 'wand_essence_drain'];
const wand = experiment('WAND (E4a reference kit: attunement + surge)', 'sorcerer', 'wand',
  WAND_BAR,
  WAND_ATTUNED_TEMPO_POLICY,
  WAND_TEL);
const PRE_E4_SORC_DPS = 49887 / 1200;
const gateE4a = kitGate('GATE E4a (wand reference kit)', wand, 5, PRE_E4_SORC_DPS, [
  WAND_BAR,                                                                                     // spender-first (shipped default — measured best blind)
  ['wand_magic_missile', 'wand_chain_lightning', 'wand_frostbolt', 'wand_essence_drain', 'wand_volley_convergence', 'wand_void_blast'], // builder-first
  ['wand_frostbolt', 'wand_void_blast', 'wand_magic_missile', 'wand_essence_drain', 'wand_chain_lightning', 'wand_volley_convergence'], // mixed
], 'sorcerer', 'wand', WAND_TEL, 'withhold');

// Experiment 4 — staff/witchdoctor E4b REFERENCE KIT (Wave E4b): soul
// ledger (Harvest +2, Skull consume-all ×(1+0.30k) + bounce/stack,
// Perfect@5 ×2.5 + advance 1s) + Ritual Frenzy window (spirit-skill
// crits, ×2 + refund 3) + the Hex/Haunt setup-consume pairs.
// PRE-E4b baseline measured 2026-07-12 (blind, old staff data): 25,403.
const STAFF_TEL: Telemetry = { spenderSkillId: 'staff_bouncing_skull', chargeStateId: 'soul_stack', windowStateId: 'ritual_frenzy', spendCost: 16 };
const STAFF_BAR = ['staff_soul_harvest', 'staff_hex', 'staff_haunt', 'staff_locust_swarm', 'staff_spirit_barrage', 'staff_bouncing_skull'];
const staffExp = experiment('STAFF (E4b reference kit: souls + frenzy)', 'witchdoctor', 'staff',
  STAFF_BAR,
  STAFF_SOUL_TEMPO_POLICY,
  STAFF_TEL);
const PRE_E4_WD_DPS = 25403 / 1200;
const gateE4b = kitGate('GATE E4b (staff reference kit)', staffExp, 6, PRE_E4_WD_DPS, [
  STAFF_BAR,                                                                                    // builder-first (shipped default)
  ['staff_bouncing_skull', 'staff_spirit_barrage', 'staff_soul_harvest', 'staff_hex', 'staff_haunt', 'staff_locust_swarm'], // spender-first
  ['staff_haunt', 'staff_bouncing_skull', 'staff_hex', 'staff_locust_swarm', 'staff_soul_harvest', 'staff_spirit_barrage'], // mixed
], 'witchdoctor', 'staff', STAFF_TEL, 'withhold');

// Experiment 5 — flail/berserker E4c REFERENCE KIT (owner Q6 option b):
// fury ledger (strikes +1, hits TAKEN +1 via innate IR rule — the
// first live generic-runtime consumer) + Rampage window opened by the
// capReached stateChange event + Crushing Blow consume-all.
// PRE-E4c baseline measured 2026-07-12 (blind, autos on): 120,189.
const FLAIL_TEL: Telemetry = { spenderSkillId: 'flail_crushing_blow', chargeStateId: 'fury_charge', windowStateId: 'rampage', spendCost: 12 };
const FLAIL_BAR = ['flail_arc_sweep', 'flail_hooked_strike', 'flail_disarming_strike', 'flail_bone_crusher', 'flail_crushing_blow'];
const flail = experiment('FLAIL (E4c reference kit: fury + rampage)', 'berserker', 'flail',
  FLAIL_BAR,
  FLAIL_RAMPAGE_TEMPO_POLICY,
  FLAIL_TEL);
const PRE_E4C_BERSERKER_DPS = 120189 / 1200;
const gateE4c = kitGate('GATE E4c (flail reference kit)', flail, 8, PRE_E4C_BERSERKER_DPS, [
  FLAIL_BAR,                                                                                    // builder-first (shipped default)
  ['flail_crushing_blow', 'flail_bone_crusher', 'flail_arc_sweep', 'flail_hooked_strike', 'flail_disarming_strike'], // spender-first
  ['flail_hooked_strike', 'flail_crushing_blow', 'flail_disarming_strike', 'flail_arc_sweep', 'flail_bone_crusher'], // mixed
], 'berserker', 'flail', FLAIL_TEL, 'withhold', 1.1);

console.log(`\nGATE 4 (CI lower bound ≥ +10% on at least one build; < +5% everywhere = STOP and tune payoffs):`);
const best = Math.max(bow.ciLow, dagger.ciLow);
if (best >= 10 && gateE1 && gateE3 && gateE4a && gateE4b && gateE4c) { console.log(`PASSED (best CI-low Δ ${best.toFixed(1)}%)`); process.exit(0); }
if (best >= 5) { console.log(`MARGINAL (best CI-low Δ ${best.toFixed(1)}%) — investigate before UI work`); process.exit(1); }
console.log(`FAILED (best CI-low Δ ${best.toFixed(1)}%) — do not build rotation UI; tune consume payoffs first`);
process.exit(1);

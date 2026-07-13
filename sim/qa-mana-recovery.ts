#!/usr/bin/env node
// ============================================================
// GATE E6 — mana OOM recovery (COMBAT_ECONOMY_DESIGN E20).
//
// Owner bug (2026-07-12): "once OOM you only cast the first lowest
// mana cost ability" — evaluatePolicy fell THROUGH unaffordable rules,
// so the cheapest skill always intercepted the regen trickle and the
// spender starved forever (measured: 0 assassinates in 300s at regen 2).
//
// E20 ships two fixes, both gated here:
//  1. MARTIALS (berserker/assassin/hunter) drop mana entirely —
//     classUsesMana=false zeroes costs and skips every mana gate.
//     Scenario C asserts their spenders fire from mana=0/regen=0.
//  2. CASTERS (sorcerer/witchdoctor) keep mana + MANA CLAIMS
//     (hold-for-priority in evaluatePolicy): the first mana-blocked
//     rule claims the pool; lower PAID rules hold until it's funded.
//     Scenarios A/B assert spender recovery from mana=0 at low regen.
//  Scenario D flips the kill-switch (MANA_CLAIM.maxHoldSec=0 restores
//  pre-E20 fall-through by construction — the claim condition can
//  never be satisfied) and asserts claims strictly improve recovery.
//
// Usage: npx tsx sim/qa-mana-recovery.ts   (exit 1 on failure)
// ============================================================

import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';
installClock();
installRng(1337);

import './balance-overrides';

import { createFixtureState, createMobPack, ENCOUNTER_MIX } from './kitFixture';
import { runCombatTick } from '../src/engine/combat/tick';
import { MANA_CLAIM } from '../src/engine/ir/rotationPolicy';
import {
  DAGGER_TEMPO_POLICY, WAND_ATTUNED_TEMPO_POLICY,
  STAFF_SOUL_TEMPO_POLICY, FLAIL_RAMPAGE_TEMPO_POLICY,
} from '../src/data/rotationPresets';
import type { RotationPolicy } from '../src/types/rotation';
import type { CharacterClass } from '../src/types';

const TICKS = 600; // 300s
const DT = 0.5;
const SEEDS = [42, 1337];

const DAGGER_BAR = ['dagger_stab', 'dagger_chain_strike', 'dagger_blade_dance', 'dagger_viper_strike', 'dagger_assassinate'];
const WAND_BAR = ['wand_void_blast', 'wand_volley_convergence', 'wand_chain_lightning', 'wand_frostbolt', 'wand_magic_missile', 'wand_essence_drain'];
const STAFF_BAR = ['staff_soul_harvest', 'staff_hex', 'staff_haunt', 'staff_locust_swarm', 'staff_spirit_barrage', 'staff_bouncing_skull'];
const FLAIL_BAR = ['flail_arc_sweep', 'flail_hooked_strike', 'flail_disarming_strike', 'flail_bone_crusher', 'flail_crushing_blow'];

interface RunOut { casts: Map<string, number>; firstSpendSec: number; total: number }

function run(cls: CharacterClass, weapon: string, bar: string[], policy: RotationPolicy | null,
  spenderId: string, regen: number, seed: number): RunOut {
  resetRng(seed);
  setClock(1_000_000);
  let s = createFixtureState(cls, weapon, bar, policy, {});
  (s.character as any).mana = { ...(s.character as any).mana, current: 0, regenPerSec: regen };
  const casts = new Map<string, number>();
  let firstSpendSec = -1, encounterIdx = 0;
  for (let i = 0; i < TICKS; i++) {
    const out = runCombatTick(s, DT, getNow());
    s = { ...s, ...out.patch };
    if (out.result.skillFired && out.result.skillId) {
      casts.set(out.result.skillId, (casts.get(out.result.skillId) ?? 0) + 1);
      if (out.result.skillId === spenderId && firstSpendSec < 0) firstSpendSec = i * DT;
    }
    if (out.result.zoneDeath || s.combatPhase === 'zone_defeat') {
      s = { ...s, combatPhase: 'clearing', combatPhaseStartedAt: getNow(), currentHp: s.character.stats.maxLife, currentEs: 0 };
    }
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      encounterIdx = (encounterIdx + 1) % ENCOUNTER_MIX.length;
      const [count, hp] = ENCOUNTER_MIX[encounterIdx];
      s = { ...s, packMobs: createMobPack(count, hp), currentPackSize: count };
    }
    advanceClock(DT * 1000);
  }
  const total = [...casts.values()].reduce((a, b) => a + b, 0);
  return { casts, firstSpendSec, total };
}

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail: string): void {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label} — ${detail}`);
  if (ok) pass++; else fail++;
}
const fs = (r: RunOut) => r.firstSpendSec < 0 ? 'never' : `${r.firstSpendSec}s`;

// ── Scenario A: CASTER CLAIMS — sorcerer/wand from mana=0 ──
// Thresholds are measured-plus-headroom (2026-07-12): the preset arm
// legitimately spends later than slot-order — it builds the ledger and
// arbitrates Volley in packs before Void Blast (measured preset firsts:
// 40-46s @2, 21-31.5s @4, 17.5-18s @8; slot-order 11s/5.5s/2.5s).
console.log('\n══ A: sorcerer/wand claims recovery (spender wand_void_blast, cost 22) ══');
for (const seed of SEEDS) {
  for (const [regen, maxFirst] of [[2, 60], [4, 40], [8, 25]] as const) {
    for (const [arm, policy] of [['slot_order', null], ['attuned_tempo', WAND_ATTUNED_TEMPO_POLICY]] as const) {
      const r = run('sorcerer', 'wand', WAND_BAR, policy as RotationPolicy | null, 'wand_void_blast', regen, seed);
      const spends = r.casts.get('wand_void_blast') ?? 0;
      const cheap = r.casts.get('wand_magic_missile') ?? 0;
      const cheapShare = r.total ? cheap / r.total : 0;
      check(`A ${arm} regen=${regen} seed=${seed}`,
        r.firstSpendSec >= 0 && r.firstSpendSec <= maxFirst && spends >= 3 && cheapShare <= 0.4,
        `firstSpend=${fs(r)} (max ${maxFirst}s) spends=${spends} cheapShare=${(cheapShare * 100).toFixed(0)}%`);
    }
  }
}

// ── Scenario B: CASTER CLAIMS — witchdoctor/staff from mana=0 ──
console.log('\n══ B: witchdoctor/staff claims recovery (spender staff_bouncing_skull, cost 12) ══');
for (const seed of SEEDS) {
  // Thresholds re-calibrated after the GATE P caster lifts changed kill
  // pacing (staff ×2.71): measured 42s @2 (was 18.5-40s).
  for (const [regen, maxFirst] of [[2, 55], [4, 20]] as const) {
    const r = run('witchdoctor', 'staff', STAFF_BAR, STAFF_SOUL_TEMPO_POLICY, 'staff_bouncing_skull', regen, seed);
    const spends = r.casts.get('staff_bouncing_skull') ?? 0;
    check(`B soul_tempo regen=${regen} seed=${seed}`,
      r.firstSpendSec >= 0 && r.firstSpendSec <= maxFirst && spends >= 5,
      `firstSpend=${fs(r)} (max ${maxFirst}s) spends=${spends}`);
  }
}

// ── Scenario C: MARTIAL FREE — mana can never gate (regen 0, mana 0) ──
console.log('\n══ C: martials cast from mana=0 regen=0 (usesMana=false) ══');
for (const seed of SEEDS) {
  const d = run('assassin', 'dagger', DAGGER_BAR, DAGGER_TEMPO_POLICY, 'dagger_assassinate', 0, seed);
  check(`C assassin/dagger seed=${seed}`,
    (d.casts.get('dagger_assassinate') ?? 0) >= 20 && d.firstSpendSec >= 0 && d.firstSpendSec <= 20,
    `assassinate=${d.casts.get('dagger_assassinate') ?? 0} firstSpend=${fs(d)}`);
  const f = run('berserker', 'flail', FLAIL_BAR, FLAIL_RAMPAGE_TEMPO_POLICY, 'flail_crushing_blow', 0, seed);
  check(`C berserker/flail seed=${seed}`,
    (f.casts.get('flail_crushing_blow') ?? 0) >= 20,
    `crushing_blow=${f.casts.get('flail_crushing_blow') ?? 0} firstSpend=${fs(f)}`);
}

// ── Scenario D: KILL-SWITCH — maxHoldSec=0 restores fall-through; claims must strictly improve ──
console.log('\n══ D: kill-switch (MANA_CLAIM.maxHoldSec 0 vs 12), sorcerer/wand slot_order regen=2 ══');
for (const seed of SEEDS) {
  const withClaims = run('sorcerer', 'wand', WAND_BAR, null, 'wand_void_blast', 2, seed);
  MANA_CLAIM.maxHoldSec = 0;
  const noClaims = run('sorcerer', 'wand', WAND_BAR, null, 'wand_void_blast', 2, seed);
  MANA_CLAIM.maxHoldSec = 12;
  const wc = withClaims.casts.get('wand_void_blast') ?? 0;
  const nc = noClaims.casts.get('wand_void_blast') ?? 0;
  check(`D seed=${seed}`, wc > nc,
    `void_blast with-claims=${wc} (first ${fs(withClaims)}) vs kill-switch=${nc} (first ${fs(noClaims)})`);
}

console.log(`\nGATE E6 (E20 mana: caster claims recovery + martial mana-free + kill-switch): ${fail === 0 ? 'PASSED' : 'FAILED'} (${pass} pass, ${fail} fail)`);
process.exit(fail > 0 ? 1 : 0);

#!/usr/bin/env node
// ============================================================
// MANA OOM-RECOVERY PROBE (2026-07-12, owner bug report):
// "once OOM and you finally get mana it only casts the first
// lowest-mana-cost ability available."
//
// Mechanism under test: evaluatePolicy (rotationPolicy.ts) falls
// THROUGH unaffordable rules, so at OOM the cheapest skill is always
// the first affordable match, each cast re-drains the trickle, and
// every rule above it starves forever (the cheap-skill lock).
//
// Diagnostic only — NOT a gate yet. Prints cast distributions from a
// forced mana=0 start across regen tiers for slot-order vs the tempo
// preset. A mana redesign should turn this into a gate with a
// "spender share recovers within X sec" criterion.
// Usage: npx tsx sim/qa-mana-recovery.ts
// ============================================================

import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';
installClock();
installRng(1337);

import './balance-overrides';

import { createFixtureState, createMobPack, ENCOUNTER_MIX } from './kitFixture';
import { runCombatTick } from '../src/engine/combat/tick';
import { DAGGER_TEMPO_POLICY } from '../src/data/rotationPresets';
import type { RotationPolicy } from '../src/types/rotation';

const BAR = ['dagger_stab', 'dagger_chain_strike', 'dagger_blade_dance', 'dagger_viper_strike', 'dagger_assassinate'];
const SPEND_COST = 22; // dagger_assassinate
const TICKS = 600;     // 300s
const DT = 0.5;

function runStarved(policy: RotationPolicy | null, regenPerSec: number, seed: number) {
  resetRng(seed);
  setClock(1_000_000);
  let s = createFixtureState('assassin', 'dagger', BAR, policy, {});
  const natural = { ...(s.character as any).mana };
  (s.character as any).mana = { ...natural, current: 0, regenPerSec };
  const casts = new Map<string, number>();
  let belowCost = 0, manaMax = 0, encounterIdx = 0;
  for (let i = 0; i < TICKS; i++) {
    const out = runCombatTick(s, DT, getNow());
    s = { ...s, ...out.patch };
    if (out.result.skillFired && out.result.skillId) {
      casts.set(out.result.skillId, (casts.get(out.result.skillId) ?? 0) + 1);
    }
    const mana = (s.character as any).mana;
    if (mana) {
      if (mana.current < SPEND_COST) belowCost++;
      if (mana.current > manaMax) manaMax = mana.current;
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
  return { casts, belowCost, manaMax, natural };
}

let naturalPrinted = false;
for (const [pname, policy] of [['slot_order', null], ['dagger_tempo', DAGGER_TEMPO_POLICY]] as const) {
  console.log(`\n══ ${pname} ══`);
  for (const regen of [2, 4, 8, 16]) {
    const r = runStarved(policy as RotationPolicy | null, regen, 42);
    if (!naturalPrinted) {
      console.log(`(fixture natural mana: max=${r.natural.max} regenPerSec=${r.natural.regenPerSec})`);
      naturalPrinted = true;
    }
    const entries = [...r.casts.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((a, [, n]) => a + n, 0);
    const cheap = r.casts.get('dagger_stab') ?? 0;
    const spends = r.casts.get('dagger_assassinate') ?? 0;
    console.log(`regen=${regen}/s: casts=${total} stab-share=${total ? ((cheap / total) * 100).toFixed(0) : 0}% assassinate=${spends} belowCost=${((r.belowCost / TICKS) * 100).toFixed(0)}% manaPeak=${r.manaMax.toFixed(0)}`);
    console.log(`   ${entries.map(([k, n]) => `${k.replace('dagger_', '')}×${n}`).join('  ')}`);
  }
}

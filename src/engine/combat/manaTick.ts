// ============================================================
// Mana tick helpers — Phase A Change 4 + Phase A cleanup (procs)
// ============================================================
//
// Small pure functions for regen + deduct + event-proc gain during
// combat tick. Mana regen runs every tick (whether or not a skill
// fires). Mana deduct runs once per skill cast (or once per channel
// tick, since channels re-enter the skill-cast path each tickInterval).
//
// Phase A cleanup (2026-05-03): event-proc mana gains
// (onKill/onHitDealt/onHitTaken/onCrit) now plug into these
// primitives via the optional `procGain` parameter on
// tickManaWithCost. Per-class proc rates live in CLASS_MANA_CONFIG
// (src/types/mana.ts §9.4 calibration matrix); callers compute the
// total proc gain by multiplying event counts with the matrix entries
// and pass the sum into the standard mana update.

import type { ManaState } from '../../types';

/** Apply passive regen for `dtSec` seconds. Caps at mana.max. */
export function regenMana(mana: ManaState, dtSec: number): ManaState {
  if (mana.regenPerSec <= 0 || mana.current >= mana.max) return mana;
  const next = Math.min(mana.max, mana.current + mana.regenPerSec * dtSec);
  if (next === mana.current) return mana;
  return { ...mana, current: next };
}

/** Deduct `amount` mana. Floors at 0. Returns same object if no change. */
export function deductMana(mana: ManaState, amount: number): ManaState {
  if (amount <= 0) return mana;
  const next = Math.max(0, mana.current - amount);
  if (next === mana.current) return mana;
  return { ...mana, current: next };
}

/** Add `amount` mana from proc events (onKill/onHit/onCrit). Caps at mana.max. */
export function gainMana(mana: ManaState, amount: number): ManaState {
  if (amount <= 0 || mana.current >= mana.max) return mana;
  const next = Math.min(mana.max, mana.current + amount);
  if (next === mana.current) return mana;
  return { ...mana, current: next };
}

/** Can we afford a skill's mana cost this tick, accounting for this tick's regen? */
export function canAffordManaCost(mana: ManaState, dtSec: number, cost: number): boolean {
  if (cost <= 0) return true;
  // Clamp regen credit to one normal tick (COMBAT_ECONOMY_DESIGN E12):
  // throttled background tabs deliver multi-second dtSec, which credited
  // a whole second+ of regen and let unaffordable casts fire.
  const regened = regenMana(mana, Math.min(dtSec, 0.25)).current;
  return regened >= cost;
}

/**
 * Standard skill-cast mana update: regen this tick → add proc gains → deduct cost.
 * Order matters — regen first lets a skill with cost == max fire at full-empty
 * as long as regen + proc gains cover the gap; deducting last ensures the cast
 * actually pays its cost out of the post-gain pool.
 *
 * `procGain` is the sum of per-class event-proc gains from CLASS_MANA_CONFIG
 * (e.g. `onCritGain * critsThisCast + onKillGain * killsThisCast`). Caller
 * computes; this helper applies. Defaults to 0 for backwards-compatibility
 * with pre-cleanup callers.
 */
export function tickManaWithCost(
  mana: ManaState,
  dtSec: number,
  cost: number,
  procGain: number = 0,
): ManaState {
  return deductMana(gainMana(regenMana(mana, dtSec), procGain), cost);
}

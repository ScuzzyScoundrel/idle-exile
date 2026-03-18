// ============================================================
// Idle Exile — Combo State Engine (Dagger v2)
// Pure functions for creating, consuming, ticking combo states.
// No store dependency — called by tick.ts.
// ============================================================

import type { ComboState, ComboStateEffect } from '../../types';

// ─── Combo State Data ───

export interface ComboStateConfig {
  stateId: string;
  duration: number;
  maxStacks: number;
  effect: ComboStateEffect;
  createOn?: 'onCast' | 'onCrit' | 'onKill';  // default: onCast
  minTargetsHit?: number;   // gate: only create if skill hits N+ distinct targets
}

/** Default combo states created by dagger skills on cast.
 *  Talent trees can override/extend via SkillModifier.comboStateCreation. */
export const COMBO_STATE_CREATORS: Record<string, ComboStateConfig> = {
  // Stab: crit creates Exposed (3s) — consumed by any non-Stab skill for +25% damage
  dagger_stab:          { stateId: 'exposed',          duration: 3, maxStacks: 1, createOn: 'onCrit',
                          effect: { incDamage: 25 } },
  // Blade Dance: all 3 hits on different targets → Dance Momentum (4s)
  // Next single-target skill also splashes to 1 adjacent enemy for 50% damage
  dagger_blade_dance:   { stateId: 'dance_momentum',   duration: 4, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 15 }, minTargetsHit: 3 },
  // Fan of Knives: Saturated created conditionally in tick.ts (requires 3+ ailmented targets)
  // NOT auto-created here — see tick.ts FoK Saturated block
  // Viper Strike: creates Deep Wound — consumed by Assassinate for instant burst
  dagger_viper_strike:  { stateId: 'deep_wound',       duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { burstDamage: 50, burstElement: 'chaos' } },
  // Shadow Mark: applies Shadow Mark debuff — empowers next skill per-skill
  dagger_shadow_mark:   { stateId: 'shadow_mark',      duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 20, perSkillBonus: {
                            dagger_stab:          { guaranteedCrit: true },
                            dagger_blade_dance:   { incDamage: 30, focusBurst: true },  // all 3 hits target same enemy
                            dagger_fan_of_knives: { incDamage: 30 },
                            dagger_viper_strike:  { ailmentPotency: 50 },
                            dagger_assassinate:   { cdRefundPercent: 50 },
                            dagger_chain_strike:  { extraChains: 2 },
                            dagger_blade_ward:    { counterDamageMult: 2 },  // counter-hits deal double
                            dagger_blade_trap:    { burstDamage: 50 },  // +50% detonation damage
                            dagger_shadow_dash:   { markPassthrough: true },  // mark persists for next skill
                          } } },
  // Chain Strike: chaining to 3+ targets creates Chain Surge (3s)
  // Next single-target skill also chains to 1 additional enemy
  dagger_chain_strike:  { stateId: 'chain_surge',      duration: 3, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 10 }, minTargetsHit: 3 },
  // Blade Ward: Guarded created conditionally in tick.ts (requires 3+ hits during ward window)
  // Blade Trap: Primed created conditionally in tick.ts (requires crit detonation after 3s armed)
  // Shadow Dash: creates Shadow Momentum (2s) — next skill CD starts 2s earlier
  dagger_shadow_dash:   { stateId: 'shadow_momentum',  duration: 2, maxStacks: 1, createOn: 'onCast',
                          effect: { cooldownAcceleration: 2 } },
};

/** Which combo states each skill consumes on cast.
 *  Assassinate consumes BOTH exposed and deep_wound.
 *  Array format: consume all listed states. */
export const COMBO_STATE_CONSUMERS: Record<string, string[]> = {
  // Exposed: consumed by ANY non-Stab skill for +25% damage
  // Deep Wound: consumed by Assassinate (+ Chain Strike) for burst
  // Shadow Mark: consumed by any skill on marked target
  dagger_assassinate:  ['exposed', 'deep_wound', 'shadow_mark'],
  dagger_chain_strike: ['exposed', 'shadow_mark'],
  dagger_blade_dance:  ['exposed', 'shadow_mark'],
  dagger_fan_of_knives:['exposed', 'shadow_mark'],
  dagger_viper_strike: ['exposed', 'shadow_mark'],
  dagger_blade_ward:   ['exposed', 'shadow_mark'],
  dagger_blade_trap:   ['exposed', 'shadow_mark'],
  dagger_shadow_dash:  ['exposed', 'shadow_mark'],
  // Stab does NOT consume exposed (can't consume its own state)
  dagger_stab:         ['shadow_mark'],
  // Shadow Mark does NOT consume exposed (setup skill, not a damage follow-up)
  dagger_shadow_mark:  ['shadow_mark'],
};

// ─── Pure Functions ───

/** Check if a combo state exists in the list. */
export function hasComboState(states: ComboState[], stateId: string): boolean {
  return states.some(s => s.stateId === stateId);
}

/** Get a combo state from the list. */
export function getComboState(states: ComboState[], stateId: string): ComboState | undefined {
  return states.find(s => s.stateId === stateId);
}

/** Create or refresh a combo state. Returns updated array. */
export function createComboState(
  states: ComboState[],
  stateId: string,
  sourceSkillId: string,
  effect: ComboStateEffect,
  duration: number,
  maxStacks: number = 1,
): ComboState[] {
  const existing = states.find(s => s.stateId === stateId);
  if (existing) {
    // Refresh duration, increment stacks up to max
    return states.map(s =>
      s.stateId === stateId
        ? { ...s, remainingDuration: duration, stacks: Math.min(s.stacks + 1, maxStacks), sourceSkillId }
        : s,
    );
  }
  return [...states, {
    stateId,
    sourceSkillId,
    remainingDuration: duration,
    stacks: 1,
    maxStacks,
    effect,
  }];
}

/** Consume a combo state, removing it from the list.
 *  Returns the consumed state (or null) and the remaining states. */
export function consumeComboState(
  states: ComboState[],
  stateId: string,
): { consumed: ComboState | null; remaining: ComboState[] } {
  const idx = states.findIndex(s => s.stateId === stateId);
  if (idx < 0) return { consumed: null, remaining: states };
  const consumed = states[idx];
  return {
    consumed,
    remaining: [...states.slice(0, idx), ...states.slice(idx + 1)],
  };
}

/** Consume multiple combo states at once. Returns all consumed states and remaining. */
export function consumeMultipleComboStates(
  states: ComboState[],
  stateIds: string[],
): { consumed: ComboState[]; remaining: ComboState[] } {
  const consumed: ComboState[] = [];
  let remaining = states;
  for (const stateId of stateIds) {
    const result = consumeComboState(remaining, stateId);
    if (result.consumed) consumed.push(result.consumed);
    remaining = result.remaining;
  }
  return { consumed, remaining };
}

/** Tick all combo state durations, remove expired. */
export function tickComboStates(states: ComboState[], dtSec: number): ComboState[] {
  return states
    .map(s => ({ ...s, remainingDuration: s.remainingDuration - dtSec }))
    .filter(s => s.remainingDuration > 0);
}

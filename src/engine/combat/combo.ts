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
}

/** Default combo states created by dagger skills on cast.
 *  Talent trees can override/extend via SkillModifier.comboStateCreation. */
export const COMBO_STATE_CREATORS: Record<string, ComboStateConfig> = {
  dagger_stab:        { stateId: 'exposed',          duration: 5, maxStacks: 1, createOn: 'onCrit',
                        effect: { incDamage: 25 } },
  dagger_viper_strike:{ stateId: 'deep_wound',       duration: 5, maxStacks: 1, createOn: 'onCast',
                        effect: { burstDamage: 50, burstElement: 'chaos' } },
  dagger_shadow_dash: { stateId: 'shadow_momentum',  duration: 4, maxStacks: 1, createOn: 'onCast',
                        effect: { cooldownAcceleration: 2 } },
};

/** Which combo states each skill consumes on cast. */
export const COMBO_STATE_CONSUMERS: Record<string, string> = {
  dagger_assassinate:  'exposed',
  dagger_chain_strike: 'deep_wound',
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

/** Tick all combo state durations, remove expired. */
export function tickComboStates(states: ComboState[], dtSec: number): ComboState[] {
  return states
    .map(s => ({ ...s, remainingDuration: s.remainingDuration - dtSec }))
    .filter(s => s.remainingDuration > 0);
}

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

  // ── Staff v2 (Witch Doctor) ──
  // Locust Swarm: creates Plagued — consumed by Plague of Toads for pandemic spread (wired in staff module)
  staff_locust_swarm:   { stateId: 'plagued',          duration: 6, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 0 } },
  // Haunt: creates Haunted — consumed by Spirit Barrage for guaranteed crit + 30% bonus damage
  staff_haunt:          { stateId: 'haunted',          duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 30, guaranteedCrit: true } },
  // Hex: creates Hexed — consumed by Soul Harvest for 2x damage (+100%)
  staff_hex:            { stateId: 'hexed',            duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 100 } },
  // Soul Harvest: creates Soul Stack (max 5, refreshes on new stack) — consumed by Bouncing Skull / Mass Sacrifice
  staff_soul_harvest:   { stateId: 'soul_stack',       duration: 10, maxStacks: 5, createOn: 'onCast',
                          effect: { extraChains: 1 } },
  // Note: haunted on dog-bite + spirit_link while minions alive are created by the minion subsystem, not on-cast.
};

/** Which combo states each skill consumes on cast.
 *  Assassinate consumes BOTH exposed and deep_wound.
 *  Array format: consume all listed states. */
// One-shot combo states consumed by the next skill (not the creator):
// chain_surge (Chain Strike → next skill gets +1 chain)
// dance_momentum (Blade Dance → next skill gets splash)
// contagion_surge (Chain Strike + talent → next skill spreads ailments)
// shadow_momentum (Shadow Dash → next skill bonus)
const CROSS_SKILL_STATES = ['chain_surge', 'dance_momentum', 'contagion_surge', 'shadow_momentum'];

export const COMBO_STATE_CONSUMERS: Record<string, string[]> = {
  // Exposed: consumed by ANY non-Stab skill for +25% damage
  // Deep Wound: consumed by Assassinate (+ Chain Strike) for burst
  // Shadow Mark: consumed by any skill on marked target
  // Cross-skill states: consumed by any skill EXCEPT the one that created them
  dagger_assassinate:  ['exposed', 'deep_wound', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_chain_strike: ['exposed', 'shadow_mark', 'dance_momentum', 'shadow_momentum'],  // NOT chain_surge/contagion_surge (own states)
  dagger_blade_dance:  ['exposed', 'shadow_mark', 'chain_surge', 'contagion_surge', 'shadow_momentum'],  // NOT dance_momentum (own state)
  dagger_fan_of_knives:['exposed', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_viper_strike: ['exposed', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_blade_ward:   ['exposed', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_blade_trap:   ['exposed', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_shadow_dash:  ['exposed', 'shadow_mark', 'chain_surge', 'dance_momentum', 'contagion_surge'],  // NOT shadow_momentum (own state)
  // Stab does NOT consume exposed (can't consume its own state)
  dagger_stab:         ['shadow_mark', ...CROSS_SKILL_STATES],
  // Shadow Mark does NOT consume exposed (setup skill, not a damage follow-up)
  dagger_shadow_mark:  ['shadow_mark', ...CROSS_SKILL_STATES],

  // ── Staff v2 (Witch Doctor) ──
  staff_spirit_barrage:  ['haunted'],
  staff_plague_of_toads: ['plagued'],
  staff_soul_harvest:    ['hexed'],
  staff_bouncing_skull:  ['soul_stack'],
  staff_mass_sacrifice:  ['haunted', 'plagued', 'hexed', 'soul_stack', 'spirit_link'],
  // Creators (Zombie Dogs, Locust Swarm, Haunt, Hex, Fetish Swarm) do not consume.
};

// ─── Carrier Death Behavior ───
// When a mob carrying a debuff from one of these skills dies, the debuff behaves specially:
// - 'transfer': remaining duration preserved, jumps to next enemy (Locust Swarm)
// - 'chain': fresh duration, jumps to next enemy (Haunt)
export interface CarrierDeathBehavior {
  mode: 'transfer' | 'chain';
  freshDuration?: number;  // required for 'chain' mode (seconds)
}
export const CARRIER_DEATH_BEHAVIOR: Record<string, CarrierDeathBehavior> = {
  staff_locust_swarm: { mode: 'transfer' },
  staff_haunt:        { mode: 'chain', freshDuration: 6 },
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

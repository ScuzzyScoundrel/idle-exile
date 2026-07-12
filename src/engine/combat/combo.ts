// ============================================================
// Idle Exile — Combo State Engine (Dagger v2 + §8.1 migration)
// Pure functions for creating, consuming, ticking combo states.
// No store dependency — called by tick.ts.
// ============================================================
//
// §8.1 ComboStateSpec migration (2026-05-04):
//   • State DEFINITIONS (id/name/description/duration/maxStacks/effect/
//     category/side/fusion/carrierDeath) live in `src/data/comboStates.ts`
//     as the typed COMBO_STATE_SPECS registry.
//   • This file holds the WIRING — which skills create/consume which
//     states (COMBO_STATE_CREATORS / COMBO_STATE_CONSUMERS), and the
//     pure runtime functions (createComboState, consumeComboState, etc.).
//   • CARRIER_DEATH_BEHAVIOR is preserved here for engine-call backwards-
//     compat; new authoring should put `carrierDeath` on the spec instead.

import type { ComboState, ComboStateEffect } from '../../types';
import { getComboStateSpec } from '../../data/comboStates';

// ─── Combo State Data ───

export interface ComboStateConfig {
  stateId: string;
  duration: number;
  maxStacks: number;
  effect: ComboStateEffect;
  createOn?: 'onCast' | 'onCrit' | 'onKill';  // default: onCast
  minTargetsHit?: number;   // gate: only create if skill hits N+ distinct targets
  // ── COMBAT_ECONOMY_DESIGN E1 combo-layer extensions ──
  /** Internal cooldown (seconds) shared per stateId across all creators —
   *  decorrelates stochastic windows from any fixed cast cadence (E5). */
  icdSec?: number;
  /** Stacks added per creation event (default 1). */
  stacksPerGain?: number;
  /** Wave E3: only create when the target carries this talent tag's
   *  debuff (bow: +1 extra quiver vs Marked; vulnerable on crit-vs-
   *  Marked). Resolved via TALENT_TAG_TO_DEBUFF at the creation gate. */
  requiresTargetTag?: string;
}

// Per-stateId ICD stamps. Ephemeral by design (resets on reload — an ICD
// is sub-10s texture, not progression). `now < last` handles sim clock
// rewinds between seeded runs.
const _icdLastCreated: Record<string, number> = {};
/** True (and stamps the ICD) if stateId may be created at `now`. */
export function checkAndStampIcd(stateId: string, icdSec: number | undefined, now: number): boolean {
  if (!icdSec) return true;
  const last = _icdLastCreated[stateId];
  if (last !== undefined && now >= last && now - last < icdSec * 1000) return false;
  _icdLastCreated[stateId] = now;
  return true;
}

/** All creator configs for a skill, normalized to an array. */
export function getCreatorConfigs(skillId: string): ComboStateConfig[] {
  const entry = COMBO_STATE_CREATORS[skillId];
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

/** First creator config (any skill) that creates the given state. */
export function findCreatorByStateId(stateId: string): ComboStateConfig | undefined {
  for (const entry of Object.values(COMBO_STATE_CREATORS)) {
    const configs = Array.isArray(entry) ? entry : [entry];
    const hit = configs.find(c => c.stateId === stateId);
    if (hit) return hit;
  }
  return undefined;
}

// ── COMBAT_ECONOMY_DESIGN §2: the Assassin ledger + window effects ──
// Momentum: consume-ALL spender payoff — ×(1+0.35/stack), Perfect jackpot
// at exactly cap (×1.8 + advance other CDs 1s). FoK spends the same pool
// at a flatter rate with no jackpot (ST-vs-AoE arbitration).
// Tuning log (GATE E1 iteration 1, 2026-07-12): per-stack 35 / Perfect
// ×1.8 measured −13.2% — blind rides the linear term at k̄ 2.82, so the
// anti-slot-order signal must live in the DISCONTINUITY (E3). Shifted
// weight from linear (35→30) into the jackpot (×1.8→×2.5).
const MOMENTUM_EFFECT: ComboStateEffect = {
  incDamagePerStackConsumed: 30,
  capBonus: { incDamage: 150, advanceOthersSec: 1 },
  perSkillBonus: {
    dagger_fan_of_knives: { incDamagePerStackConsumed: 20, capBonus: undefined },
  },
};
// Opening: stochastic wet window (crit-created, ICD 3s) — wet spend ×2.0
// and refunds 3 Momentum so waiting for the window is tempo-free (E5).
// Tuning log (E1 iterations 2-5): wet ×1.5/refund-2 gave the smart arm
// only a 25%-vs-21% capture edge; after builder de-saturation the smart
// arm captures ~57% of windows vs blind ~10% — the window is the ONE
// lever no fixed slot ordering can react to, so it carries the gate.
const OPENING_EFFECT: ComboStateEffect = {
  incDamage: 100,
  refundStacks: { stateId: 'momentum', amount: 3 },
};

// ── COMBAT_ECONOMY_DESIGN §3 (Wave E3): the Hunter quiver economy ──
// Quiver: consume-all — Snipe ×(1+0.30/stack), Perfect at 6 = ×2.5 +
// guaranteed crit; Pierce Volley spends the same pool flatter with no
// jackpot (ST-vs-AoE arbitration, mirrors FoK).
const QUIVER_EFFECT: ComboStateEffect = {
  incDamagePerStackConsumed: 30,
  capBonus: { incDamage: 150, guaranteedCrit: true, advanceOthersSec: 1 },
  perSkillBonus: {
    bow_pierce_volley: { incDamagePerStackConsumed: 15, capBonus: undefined },
  },
};
// Vulnerable: the wet window — opened by crits ON A MARKED TARGET
// (Mark upkeep is table stakes, window timing is the skill test; icd 3s
// per the dagger E1 lesson: many small windows beat few large ones).
// E3 iteration-6: ×2.5/refund-3 froze the mean and blew up variance
// (scarce windows = noise) — reverted to ×2/refund-2; the mean lives
// in deterministic levers (advanceOthersSec on Perfect, spender base).
const VULNERABLE_EFFECT: ComboStateEffect = {
  incDamage: 100,
  refundStacks: { stateId: 'quiver', amount: 2 },
};

// ── COMBAT_ECONOMY_DESIGN §5 (Wave E4): the Sorcerer attunement economy ──
// ERRATUM vs the E-doc: resonance_charge has NO consume path in the
// engine (it is an accumulator read by talent conditionals; "Convergence"
// is a skill-id substring proc). The sorcerer ledger therefore ships as
// a proper combo state on the E2 grammar; resonance stays as the legacy
// passive layer and storage unification is deferred.
// Withhold-model kit (dagger-shaped): frequent crit windows, hold the
// ledger, Void Blast spends only into Surges.
const ATTUNEMENT_EFFECT: ComboStateEffect = {
  incDamagePerStackConsumed: 30,
  capBonus: { incDamage: 150, advanceOthersSec: 1 },
  perSkillBonus: {
    wand_volley_convergence: { incDamagePerStackConsumed: 15, capBonus: undefined },
  },
};
const ARCANE_SURGE_EFFECT: ComboStateEffect = {
  incDamage: 100,
  refundStacks: { stateId: 'attunement', amount: 3 },
};

// Re-export the registry helpers so engine consumers have a single import surface.
export { getComboStateSpec, getAllComboStateSpecs, getComboStateSpecsByPair, getComboStateSpecsBySide } from '../../data/comboStates';

/** Default combo states created by dagger skills on cast.
 *  Talent trees can override/extend via SkillModifier.comboStateCreation.
 *  COMBAT_ECONOMY_DESIGN E1: values may be arrays — a skill can create
 *  several states (Stab: momentum on cast + opening on crit). */
export const COMBO_STATE_CREATORS: Record<string, ComboStateConfig | ComboStateConfig[]> = {
  // Stab: builder — +1 Momentum per cast; crits open the wet window
  // (Opening, shared 6s ICD with Chain Strike).
  dagger_stab: [
    { stateId: 'momentum', duration: 10, maxStacks: 5, createOn: 'onCast', effect: MOMENTUM_EFFECT },
    { stateId: 'opening',  duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, effect: OPENING_EFFECT },
  ],
  // Blade Dance: builder — +1 Momentum, +1 more when hitting 3+ targets
  // (two entries compose via refresh-on-gain stacking); keeps Dance
  // Momentum (4s): next single-target skill splashes 1 adjacent enemy.
  dagger_blade_dance: [
    { stateId: 'momentum', duration: 10, maxStacks: 5, createOn: 'onCast', effect: MOMENTUM_EFFECT },
    { stateId: 'momentum', duration: 10, maxStacks: 5, createOn: 'onCast', effect: MOMENTUM_EFFECT, minTargetsHit: 3 },
    { stateId: 'dance_momentum', duration: 4, maxStacks: 1, createOn: 'onCast',
      effect: { incDamage: 15 }, minTargetsHit: 3 },
  ],
  // Fan of Knives: Saturated created conditionally in tick.ts (requires 3+ ailmented targets)
  // NOT auto-created here — see tick.ts FoK Saturated block
  // Viper Strike: PARK SKILL (E8) — zero Momentum generation, real DoT.
  // Its own cooldown is the at-cap hold-timer. deep_wound RETIRED at
  // baseline; reborn as a Venomcraft talent state (§4 Fester).
  // Shadow Mark: applies Shadow Mark debuff — empowers next skill per-skill
  dagger_shadow_mark:   { stateId: 'shadow_mark',      duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 20, perSkillBonus: {
                            dagger_stab:          { guaranteedCrit: true },
                            dagger_blade_dance:   { incDamage: 30, focusBurst: true },  // all 3 hits target same enemy
                            dagger_fan_of_knives: { incDamage: 30 },
                            dagger_viper_strike:  { ailmentPotency: 50 },
                            // E4: cdRefundPercent 50 retired — it confounded the
                            // spender-cd ≪ build-period cadence the jackpot rests on.
                            dagger_assassinate:   { incDamage: 25 },
                            dagger_chain_strike:  { extraChains: 2 },
                            dagger_blade_ward:    { counterDamageMult: 2 },  // counter-hits deal double
                            dagger_blade_trap:    { burstDamage: 50 },  // +50% detonation damage
                            dagger_shadow_dash:   { markPassthrough: true },  // mark persists for next skill
                          } } },
  // Chain Strike: builder — +1 Momentum; crits open the wet window
  // (shared ICD with Stab); chaining to 3+ targets keeps Chain Surge.
  dagger_chain_strike: [
    { stateId: 'momentum', duration: 10, maxStacks: 5, createOn: 'onCast', effect: MOMENTUM_EFFECT },
    { stateId: 'opening',  duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, effect: OPENING_EFFECT },
    { stateId: 'chain_surge', duration: 3, maxStacks: 1, createOn: 'onCast',
      effect: { incDamage: 10 }, minTargetsHit: 3 },
  ],
  // Blade Ward: Guarded created conditionally in tick.ts (requires 3+ hits during ward window)
  // Blade Trap: Primed created conditionally in tick.ts (requires crit detonation after 3s armed)
  // Shadow Dash: creates Shadow Momentum (2s) — next skill CD starts 2s earlier
  dagger_shadow_dash:   { stateId: 'shadow_momentum',  duration: 2, maxStacks: 1, createOn: 'onCast',
                          effect: { cooldownAcceleration: 2 } },

  // ── Bow (Hunter) — Wave E3 (§3): builders. Elemental arrows are the
  // chargeless park/filler; NOTE (measured deviation from §3): the
  // "+1 extra quiver vs Marked" generation bonus is dropped — both arms
  // run ~100% Mark uptime so it cancels, and it pushed builder supply
  // into the cap-farming saturation that sank dagger iteration 3. ──
  bow_arrow_shot: [
    { stateId: 'quiver', duration: 10, maxStacks: 6, createOn: 'onCast', effect: QUIVER_EFFECT },
    { stateId: 'vulnerable', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, requiresTargetTag: 'mark', effect: VULNERABLE_EFFECT },
  ],
  bow_rapid_fire: [
    // +3 per flurry (one per arrow): the overcap trap — casting it near cap wastes gains,
    // which only a gambit (quiver-below check) can avoid.
    { stateId: 'quiver', duration: 10, maxStacks: 6, createOn: 'onCast', stacksPerGain: 3, effect: QUIVER_EFFECT },
    { stateId: 'vulnerable', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, requiresTargetTag: 'mark', effect: VULNERABLE_EFFECT },
  ],
  // E3 iteration-3: windows were 10× rarer than modeled (fixture crit
  // ~11-17%, Mark dies with each ~4s mob) — ANY bow attack critting a
  // Marked target opens the killing angle, not just the builders.
  bow_burning_arrow: [
    { stateId: 'vulnerable', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, requiresTargetTag: 'mark', effect: VULNERABLE_EFFECT },
  ],
  bow_tracking_shot: [
    { stateId: 'vulnerable', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, requiresTargetTag: 'mark', effect: VULNERABLE_EFFECT },
  ],

  // ── Wand (Sorcerer) — Wave E4: builders. Essence Drain is the
  // ledger-free park skill; Void Blast / Volley Convergence spend. ──
  wand_magic_missile: [
    { stateId: 'attunement', duration: 10, maxStacks: 5, createOn: 'onCast', effect: ATTUNEMENT_EFFECT },
    { stateId: 'arcane_surge', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, effect: ARCANE_SURGE_EFFECT },
  ],
  wand_chain_lightning: [
    { stateId: 'attunement', duration: 10, maxStacks: 5, createOn: 'onCast', effect: ATTUNEMENT_EFFECT },
    { stateId: 'arcane_surge', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, effect: ARCANE_SURGE_EFFECT },
  ],
  wand_frostbolt: [
    { stateId: 'attunement', duration: 10, maxStacks: 5, createOn: 'onCast', effect: ATTUNEMENT_EFFECT },
    { stateId: 'arcane_surge', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 3, effect: ARCANE_SURGE_EFFECT },
  ],

  // ── Staff v2 (Witch Doctor) ──
  // Locust Swarm: creates Plagued — consumed by Plague of Toads for pandemic spread (wired in staff module)
  staff_locust_swarm: [
    { stateId: 'plagued',          duration: 6, maxStacks: 1, createOn: 'onCast',
      effect: { incDamage: 0 } },
    // Wave E4b window rides Locust crits (see the iteration-4 note above).
    { stateId: 'ritual_frenzy', duration: 3.0, maxStacks: 1, createOn: 'onCrit', icdSec: 5,
      effect: { incDamage: 100, refundStacks: { stateId: 'soul_stack', amount: 3 } } },
  ],
  // Haunt: creates Haunted — consumed by Spirit Barrage for guaranteed crit + 30% bonus damage
  staff_haunt:          { stateId: 'haunted',          duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 30, guaranteedCrit: true } },
  // Hex: creates Hexed — consumed by Soul Harvest for 2x damage (+100%)
  staff_hex:            { stateId: 'hexed',            duration: 5, maxStacks: 1, createOn: 'onCast',
                          effect: { incDamage: 100 } },
  // Soul Harvest: +2 Soul Stacks per cast (max 5) — consumed by Bouncing
  // Skull (E10 payoffs, Wave E4b) / Mass Sacrifice (its own fold).
  staff_soul_harvest:   { stateId: 'soul_stack',       duration: 10, maxStacks: 6, createOn: 'onCast',
                          stacksPerGain: 2,
                          effect: { extraChains: 1, incDamagePerStackConsumed: 30,
                                    capBonus: { incDamage: 150, advanceOthersSec: 1 } } },
  // Wave E4b iteration-4: the window creator must NOT sit adjacent to
  // the spender in bar order (Barrage slot-5 crits phase-locked windows
  // onto slot-6 Skull — blind captured 80% wet for free). Harvest, the
  // BUILDER, opens the window instead: for a blind bar the spend comes
  // ~4s later (window expired); a gambit reacts within one tick.
  // Harvest cannot create two states via the staff path (single config
  // per skill), so soul gain moves to a spec-driven second entry below
  // is NOT possible — instead ritual_frenzy rides Locust Swarm crits
  // (slot 4, damage filler — never adjacent to Skull in the default).

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
  // COMBAT_ECONOMY_DESIGN §2.1: momentum + opening are consumed ONLY by
  // the two spenders (Assassinate ST, Fan of Knives AoE) — builders must
  // never eat the ledger or the window. exposed RETIRED (folded into
  // opening); deep_wound RETIRED at baseline (Venomcraft talent state).
  // Shadow Mark: consumed by any skill on marked target
  // Cross-skill states: consumed by any skill EXCEPT the one that created them
  dagger_assassinate:  ['momentum', 'opening', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_chain_strike: ['shadow_mark', 'dance_momentum', 'shadow_momentum'],  // NOT chain_surge/contagion_surge (own states)
  dagger_blade_dance:  ['shadow_mark', 'chain_surge', 'contagion_surge', 'shadow_momentum'],  // NOT dance_momentum (own state)
  dagger_fan_of_knives:['momentum', 'opening', 'shadow_mark', ...CROSS_SKILL_STATES],
  dagger_viper_strike: ['shadow_mark', ...CROSS_SKILL_STATES],
  dagger_blade_ward:   ['shadow_mark', ...CROSS_SKILL_STATES],
  dagger_blade_trap:   ['shadow_mark', ...CROSS_SKILL_STATES],
  dagger_shadow_dash:  ['shadow_mark', 'chain_surge', 'dance_momentum', 'contagion_surge'],  // NOT shadow_momentum (own state)
  dagger_stab:         ['shadow_mark', ...CROSS_SKILL_STATES],
  // Shadow Mark is a setup skill, not a damage follow-up
  dagger_shadow_mark:  ['shadow_mark', ...CROSS_SKILL_STATES],

  // ── Bow (Hunter) — Wave E3: the two spenders share the quiver pool ──
  bow_snipe:         ['quiver', 'vulnerable'],
  bow_pierce_volley: ['quiver', 'vulnerable'],

  // ── Wand (Sorcerer) — Wave E4: two spenders share the attunement pool ──
  wand_void_blast:         ['attunement', 'arcane_surge'],
  wand_volley_convergence: ['attunement', 'arcane_surge'],

  // ── Staff v2 (Witch Doctor) ──
  staff_spirit_barrage:  ['haunted'],
  staff_plague_of_toads: ['plagued'],
  staff_soul_harvest:    ['hexed'],
  staff_bouncing_skull:  ['soul_stack', 'ritual_frenzy'],
  staff_mass_sacrifice:  ['haunted', 'plagued', 'hexed', 'soul_stack', 'spirit_link', 'ritual_frenzy'],
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

/**
 * Create or refresh a combo state from its registered ComboStateSpec.
 *
 * Phase C3 §8.1 modular path — new authoring should prefer this over the
 * lower-level `createComboState`. State id is the only required argument;
 * the spec's defaultDuration / maxStacks / defaultEffect are pulled from
 * the registry. Override any field via the optional `overrides` arg.
 *
 * Returns the unchanged states array if the state id has no registered
 * spec (warns to console once per unknown id).
 */
const _warnedUnknownSpecs = new Set<string>();
export function createStateFromSpec(
  states: ComboState[],
  stateId: string,
  sourceSkillId: string,
  overrides?: Partial<{ duration: number; maxStacks: number; effect: ComboStateEffect }>,
  durationMult: number = 1,
  stacksToAdd: number = 1,
): ComboState[] {
  const spec = getComboStateSpec(stateId);
  if (!spec) {
    if (!_warnedUnknownSpecs.has(stateId)) {
      _warnedUnknownSpecs.add(stateId);
      console.warn(`[combo] createStateFromSpec: unknown state id "${stateId}" — add to COMBO_STATE_SPECS in src/data/comboStates.ts`);
    }
    return states;
  }
  return createComboState(
    states,
    stateId,
    sourceSkillId,
    overrides?.effect ?? spec.defaultEffect,
    overrides?.duration ?? spec.defaultDuration,
    overrides?.maxStacks ?? spec.maxStacks,
    durationMult,
    stacksToAdd,
  );
}

/** Create or refresh a combo state. Returns updated array.
 *  `durationMult` (default 1) scales the final duration — caller passes
 *  `1 + (effectiveStats.ailmentDuration ?? 0) / 100` so combo states benefit
 *  from the same +Ailment Duration stat that scales DoT debuffs. */
export function createComboState(
  states: ComboState[],
  stateId: string,
  sourceSkillId: string,
  effect: ComboStateEffect,
  duration: number,
  maxStacks: number = 1,
  durationMult: number = 1,
  stacksToAdd: number = 1,
): ComboState[] {
  const finalDuration = duration * durationMult;
  const existing = states.find(s => s.stateId === stateId);
  if (existing) {
    return states.map(s =>
      s.stateId === stateId
        ? { ...s, remainingDuration: finalDuration, stacks: Math.min(s.stacks + stacksToAdd, maxStacks), sourceSkillId }
        : s,
    );
  }
  return [...states, {
    stateId,
    sourceSkillId,
    remainingDuration: finalDuration,
    stacks: Math.min(stacksToAdd, maxStacks),
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

/** Partial consume (Wave E2, ask 4e — Dashweaver / generic modifyState):
 *  remove up to `n` stacks from a state, dropping it at 0. */
export function consumeStacks(states: ComboState[], stateId: string, n: number): ComboState[] {
  return states.flatMap(s => {
    if (s.stateId !== stateId) return [s];
    const left = s.stacks - n;
    return left > 0 ? [{ ...s, stacks: left }] : [];
  });
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

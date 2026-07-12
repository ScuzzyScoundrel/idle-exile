// ============================================================
// Unified State Registry (Effect IR Wave 3, EFFECT_IR_DESIGN.md D12-D13)
//
// ONE registry for every stack/charge/state concept in the game:
// the 25 combo-state specs (derived from COMBO_STATE_SPECS so the two
// registries cannot drift — comboStates.ts remains the authoring home
// for those 25 until the StateInstance runtime lands and the shim
// direction inverts per D31), plus the 4 states that previously
// existed ONLY as engine inline literals ("phantom states", registered
// at their current values — redesign is explicitly deferred, D32.19),
// plus bulwark_charge (previously a TALENT_BUFF_REGISTRY special case)
// and frenzied (previously bare literals at tick.ts:712-715 — its
// hysteresis thresholds now live HERE as the single source of truth,
// which is what makes a King-of-Ruin-style "enter Frenzied at 65%"
// capstone a future rule-param override instead of an engine edit).
//
// Consumers today: tick.ts (frenzied thresholds), talent-bot Pass 0
// (id closure — every stateId referenced by any effect must resolve
// here), Condition evaluation (stateCountAtLeast / stateActive ids).
// ============================================================

import type { Condition } from '../types/conditions';
import { COMBO_STATE_SPECS } from './comboStates';

export interface StateDef {
  id: string;
  name: string;
  /** Mechanical prose — the single home for what this state DOES. */
  blurb: string;
  /** Who carries it. 'self' = player, 'target' = an enemy,
   *  'encounter' = the whole fight. */
  scope: 'self' | 'target' | 'encounter';
  maxStacks: number;
  /** Keyed sub-bags (resonance: one bag per element; maxStacks applies
   *  PER KEY). */
  keys?: readonly string[];
  /** Default lifetime in seconds; undefined = persistent until
   *  consumed / condition-exited. */
  durationSec?: number;
  /** Hysteresis auto-state: entered when `enter` evaluates true,
   *  exited when `exit` does. (frenzied.) */
  while?: { enter: Condition; exit: Condition };
  /** Bridge to a data/debuffs.ts DebuffDef when this state manifests
   *  as a target debuff in the current engine. */
  legacyDebuffId?: string;
  /** Where this state's runtime lives today — documents the dual-read
   *  path the StateInstance runtime will subsume. */
  runtime: 'comboStates' | 'tempBuffs' | 'scalarFields' | 'debuffs' | 'none';
}

/** Derive a StateDef from a legacy ComboStateSpec (D13: side→scope,
 *  999-durations→persistent). */
function fromComboSpec(id: string, over?: Partial<StateDef>): StateDef {
  const spec = COMBO_STATE_SPECS[id];
  if (!spec) throw new Error(`states.ts: no COMBO_STATE_SPECS entry '${id}'`);
  return {
    id: spec.id,
    name: spec.name,
    blurb: spec.description,
    scope: spec.side === 'player' ? 'self' : 'target',
    maxStacks: spec.maxStacks,
    durationSec: spec.defaultDuration >= 999 ? undefined : spec.defaultDuration,
    runtime: 'comboStates',
    ...over,
  };
}

export const STATE_DEFS: Record<string, StateDef> = {
  // ── 25 combo-state specs (derived — single source of truth) ──
  ...Object.fromEntries(Object.keys(COMBO_STATE_SPECS).map(id => [id, fromComboSpec(id)])),

  // Overrides where the derived entry needs IR-specific fields:
  crit_stack: fromComboSpec('crit_stack', {
    scope: 'self',          // runtime truth: state.critStacks is PLAYER-side
                            // (spec said side:'target' — documented drift;
                            // the engine has always tracked it on self)
    durationSec: 4,         // decay window per tick.ts (4s refresh-on-gain)
    runtime: 'scalarFields',
  }),
  resonance_charge: fromComboSpec('resonance_charge', {
    keys: ['fire', 'cold', 'lightning', 'chaos'] as const,
    maxStacks: 5,           // runtime truth: 5 per element (tick.ts caps at 5;
                            // spec's 4 counted unique elements, not stacks)
    durationSec: 6,         // shared decay window (per-key expiry is v2, D32.2)
    runtime: 'scalarFields',
  }),
  hexed: fromComboSpec('hexed', { legacyDebuffId: 'hexed' }),
  marked: fromComboSpec('marked', { legacyDebuffId: 'marked' }),
  snared: fromComboSpec('snared', { legacyDebuffId: 'snared' }),

  // ── De-phantomed states (D13): previously engine inline literals
  //    only — registered at CURRENT values, no redesign ──
  guarded: {
    id: 'guarded', name: 'Guarded',
    blurb: 'Blade Ward counter-stance payoff — created at 3+ ward hits. +20% damage.',
    scope: 'self', maxStacks: 1, durationSec: 3,
    runtime: 'comboStates',   // created inline at dagger.ts (ward block)
  },
  primed: {
    id: 'primed', name: 'Primed',
    blurb: 'Trap detonated after 3s+ armed with a crit. +25% damage.',
    scope: 'self', maxStacks: 1, durationSec: 4,
    runtime: 'comboStates',   // created inline at dagger.ts (detonation block)
  },
  saturated: {
    id: 'saturated', name: 'Saturated',
    blurb: 'Detonation debuff rider (comboModification.onDetonation). +15% damage.',
    scope: 'self', maxStacks: 1, durationSec: 4,
    runtime: 'comboStates',   // created inline at dagger.ts (detonation block)
  },
  contagion_surge: {
    id: 'contagion_surge', name: 'Contagion Surge',
    blurb: 'Chain Strike momentum — next skill spreads its ailments to chain targets.',
    scope: 'self', maxStacks: 1, durationSec: 4,
    runtime: 'comboStates',   // cross-skill state list at combo.ts:96
  },

  // ── Migrated bespoke states ──
  bulwark_charge: {
    id: 'bulwark_charge', name: 'Bulwark Charge',
    blurb: 'Absorbs the next hit: damage halved, one stack consumed. Grant via stalwart_spirit / sustained_aegis.',
    scope: 'self', maxStacks: 3, durationSec: 5,
    runtime: 'tempBuffs',     // TALENT_BUFF_REGISTRY entry + consumeBulwarkCharge
  },
  frenzied: {
    id: 'frenzied', name: 'Frenzied',
    blurb: 'Sticky low-HP fury. Enters below 50% HP, exits above 75% — hysteresis prevents boundary flicker.',
    scope: 'self', maxStacks: 1,
    while: {
      enter: { selfHpBelow: 0.5 },
      exit: { selfHpAbove: 0.75 },
    },
    runtime: 'scalarFields',  // state.frenziedActive; tick.ts reads THESE thresholds
  },
};

/** Lookup — undefined for unknown ids (Pass 0 makes unknown ids a
 *  build failure at the authoring layer). */
export function getStateDef(stateId: string): StateDef | undefined {
  return STATE_DEFS[stateId];
}

export const STATE_IDS: ReadonlySet<string> = new Set(Object.keys(STATE_DEFS));

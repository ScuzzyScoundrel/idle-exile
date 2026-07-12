// ============================================================
// RULES Registry (Effect IR Wave 3c, EFFECT_IR_DESIGN.md D15)
//
// Registry-keyed ENGINE RULES — behaviors that aren't expressible as
// trigger×condition×action data because they rewrite how a core system
// works (poison instance math, trap arming, mechanic thresholds).
// A `{ kind: 'rule', rule: '<id>', params? }` effect on any source
// (talent node, ascendancy node, unique item) activates the rule; the
// engine consults `collectActiveRules(effects)` at the site named in
// the RuleDef. Every rule documents its consumption site so a rule
// without a consumer is visible drift, not silent decoration.
//
// Pass 0 (talent-bot) fails the build on rule ids that don't resolve
// here — same closure discipline as stats/states/tags.
// ============================================================

import type { TalentEffect } from '../types';

export interface RuleDef {
  id: string;
  name: string;
  /** What the rule DOES — mechanical prose. */
  blurb: string;
  /** Default params; a rule effect's `params` shallow-merges over these. */
  params?: Record<string, number>;
  /** Engine consumption site (file:function) — greppable accountability. */
  site: string;
}

export const RULES: Record<string, RuleDef> = {
  'poison.splitInstances': {
    id: 'poison.splitInstances',
    name: 'Split Poison Instances',
    blurb: 'Poisons apply N× instances at reduced snapshot each (Adder\'s Fang: 2× at 50%).',
    params: { instanceMult: 2, damageMult: 0.5 },
    site: 'src/engine/combat/helpers.ts:applyDebuffToList (flag threaded from tick.ts ailment roll)',
  },

  // ── Wave E5 payoff-shape rules (E17): each FLIPS the optimal gambit
  // for its spec rather than nudging numbers. Consumed at the shared
  // combo consume fold. ──
  'momentum.perfectRefund': {
    id: 'momentum.perfectRefund',
    name: 'Perfect Rhythm',
    blurb: 'A PERFECT Assassinate refunds 1 Momentum — tighter cap-cycling.',
    params: { refund: 1 },
    site: 'src/engine/combat/comboRuntime.ts:comboConsumePreRoll (capBonus branch)',
  },
  'momentum.flatSpender': {
    id: 'momentum.flatSpender',
    name: 'Ruthlessness',
    blurb: 'Assassinate loses the per-stack ramp and Perfect jackpot; instead a flat ×3.4 whenever 3+ Momentum are consumed, and every such spend advances other cooldowns 1s — spend on cooldown.',
    params: { flatMult: 3.4, minStacks: 3, advanceOthersSec: 1 },
    site: 'src/engine/combat/comboRuntime.ts:comboConsumePreRoll (momentum fold replacement)',
  },
  'quiver.deadeye': {
    id: 'quiver.deadeye',
    name: 'Deadeye',
    blurb: 'Vulnerable-window spends hit 75% harder — hunt the windows.',
    params: { wetBonusMult: 0.75 },
    site: 'src/engine/combat/comboRuntime.ts:comboConsumePreRoll (window-consume branch)',
  },
  'quiver.splitburst': {
    id: 'quiver.splitburst',
    name: 'Splitburst',
    blurb: 'Snipe per-stack reduced (26%), but the Perfect jackpot fires from 4+ Quiver — spend fast and often.',
    params: { perStack: 26, capFrom: 4 },
    site: 'src/engine/combat/comboRuntime.ts:comboConsumePreRoll (quiver fold replacement)',
  },
};

/** Collect active rules (with merged params) from a collected-effects
 *  array. Computed once per tick next to collectTalentEffects. */
export function collectActiveRules(effects: TalentEffect[]): Map<string, Record<string, number>> {
  const active = new Map<string, Record<string, number>>();
  for (const eff of effects) {
    if (eff.kind !== 'rule') continue;
    const def = RULES[eff.rule];
    if (!def) continue; // Pass 0 makes this unreachable for authored content
    active.set(eff.rule, { ...def.params, ...eff.params });
  }
  return active;
}

export const RULE_IDS: ReadonlySet<string> = new Set(Object.keys(RULES));

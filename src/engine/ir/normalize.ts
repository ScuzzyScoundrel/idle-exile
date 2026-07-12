// ============================================================
// Effect IR — value resolution + legacy-kind normalization
// (Phase 2 Wave 2, EFFECT_IR_DESIGN.md D7/D9)
//
// normalizeTalentEffect is a TOTAL function: every TalentEffect kind
// returns a non-empty array of IR-form effects ('on' / 'mod' / 'rule'),
// or — for presence/getter kinds whose consumers read them directly
// (grantDotCrit, whilePauseDebuffDecay, precisionPayoff, grantPandemic,
// grantCompanion, companionProcInheritance, grantTagOnSkill) — the
// effect itself unchanged (they lower onto the RULES registry in
// Wave 3; passing through keeps normalization total today).
//
// CRITICAL SEMANTICS (D9): legacy kinds normalize to their CURRENT
// runtime behavior — e.g. whileTag becomes mod.if{targetHasTag}
// (global front-target gating), NOT the corrected per-hit scope.vsTag.
// Per-hit scoping is opt-in for NEW authoring only, so Gate 1's
// legacy-dispatch ≡ normalized-dispatch golden holds.
// ============================================================

import type { TalentEffect, EffectRule, ScopedMod, Value, TalentTag } from '../../types';

/** Resolve a rank-scalable Value to a concrete number (D7).
 *  Scalar reproduces scaleTalentEffectByRank exactly:
 *    op 'add' / 'chance': v * rank
 *    op 'mult':           1 + (v - 1) * rank
 *  Array indexes value[min(rank, len) - 1] (non-linear curves). */
export function resolveValue(v: Value, rank: number, op: 'add' | 'mult' | 'chance' | 'gainAs'): number {
  if (Array.isArray(v)) {
    if (v.length === 0) return 0;
    return v[Math.min(Math.max(rank, 1), v.length) - 1];
  }
  if (op === 'mult') return 1 + (v - 1) * rank;
  if (op === 'chance') return Math.min(100, v * rank);
  return v * rank;
}

const on = (rule: EffectRule): TalentEffect => ({ kind: 'on', on: rule });
const mod = (m: ScopedMod): TalentEffect => ({ kind: 'mod', mod: m });

/** while*-family shared lowering: legacy apply semantics are
 *  delta→add, else mult (damageMult handled by the fold). */
function whileMod(condition: NonNullable<ScopedMod['if']>, stat: string, mult: number, delta?: number): TalentEffect {
  return mod(delta !== undefined
    ? { stat, op: 'add', value: delta, if: condition }
    : { stat, op: 'mult', value: mult, if: condition });
}

function perMod(stat: string, per: NonNullable<ScopedMod['per']>, perDelta: number, cap?: number): TalentEffect {
  return mod({ stat, op: 'add', value: perDelta, per, cap });
}

/** AND-combine optional trigger filters into an EffectRule.if. */
function andIf(...conds: (object | undefined)[]): EffectRule['if'] {
  const list = conds.filter(Boolean) as NonNullable<EffectRule['if']>[];
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return { all: list };
}

/** Lower a legacy TalentEffect to IR form ('on'/'mod'/'rule'), or pass
 *  through unchanged for presence/getter kinds (Wave 3 lowers those)
 *  and for effects already in IR form. Total — never throws. */
export function normalizeTalentEffect(eff: TalentEffect): TalentEffect[] {
  switch (eff.kind) {
    // ── Already IR ──
    case 'on': case 'mod': case 'rule':
      return [eff];

    // ── Flat stats ──
    case 'stat':
      return [mod({ stat: eff.stat, op: 'add', value: eff.delta })];
    case 'statMult':
      return [mod({ stat: eff.stat, op: 'mult', value: eff.mult })];

    // ── Conditional while* family (D9: current global-target semantics) ──
    case 'whileTag':
      return [whileMod({ targetHasTag: eff.tag }, eff.stat, eff.mult, eff.delta)];
    case 'whileSelfHpBelow':
      return [whileMod({ selfHpBelow: eff.threshold }, eff.stat, eff.mult, eff.delta)];
    case 'whileSelfHpAbove':
      return [whileMod({ selfHpAbove: eff.threshold }, eff.stat, eff.mult, eff.delta)];
    case 'whileFrenzied':
      return [whileMod({ stateActive: 'frenzied' }, eff.stat, eff.mult, eff.delta)];
    case 'whileTargetHpBelow':
      return [whileMod({ targetHpBelow: eff.threshold }, eff.stat, eff.mult, eff.delta)];
    case 'whileCompanionAlive':
      return [whileMod({ companionAlive: true }, eff.stat, eff.mult, eff.delta)];
    case 'whileMinionCountAtLeast':
      return [whileMod({ minionCountAtLeast: { count: eff.threshold } }, eff.stat, eff.mult, eff.delta)];
    case 'whileOffhandAbsent':
      return [whileMod({ offhandAbsent: true }, eff.stat, eff.mult, eff.delta)];
    case 'whileCritStacksAtLeast':
      return [whileMod({ stateCountAtLeast: { stateId: 'crit_stack', count: eff.threshold } }, eff.stat, eff.mult, eff.delta)];
    case 'whileResonanceChargesAtLeast':
      return [whileMod({ stateCountAtLeast: { stateId: 'resonance_charge', count: eff.threshold } }, eff.stat, eff.mult, eff.delta)];

    // ── per* family → mod.per ──
    case 'perCritStack':
      return [perMod(eff.stat, { count: 'stateStacks', stateId: 'crit_stack' }, eff.perStackDelta, eff.cap)];
    case 'perResonanceCharge':
      return [perMod(eff.stat, { count: 'stateStacks', stateId: 'resonance_charge' }, eff.perStackDelta, eff.cap)];
    case 'perEnemyCount':
      return [perMod(eff.stat, { count: 'enemies' }, eff.perEnemyDelta, eff.cap)];
    case 'perStack':
      return [perMod(eff.stat, { count: 'stateStacks', stateId: eff.stack, side: 'target' }, eff.perStackDelta, eff.cap)];

    // ── proc* family → 'on' rules ──
    case 'procOnHit':
      return [on({
        trigger: { on: 'hit', source: 'self' },
        if: andIf(eff.tag ? { hitDamageTag: eff.tag } : undefined,
                  eff.targetTag ? { targetHasTag: eff.targetTag } : undefined),
        chance: eff.chance, actions: [eff.action],
      })];
    case 'procOnCrit':
      return [on({
        trigger: { on: 'crit', source: 'self' },
        if: andIf(eff.tag ? { hitDamageTag: eff.tag } : undefined,
                  eff.targetTag ? { targetHasTag: eff.targetTag } : undefined),
        chance: eff.chance, actions: [eff.action],
      })];
    case 'procOnKill':
      return [on({
        trigger: { on: 'kill', source: 'self' },
        if: andIf(eff.tag ? { hitDamageTag: eff.tag } : undefined,
                  eff.targetTag ? { targetHasTag: eff.targetTag } : undefined),
        chance: eff.chance, actions: [eff.action],
      })];
    case 'procOnMultiKillChain':
      return [on({ trigger: { on: 'kill', source: 'self', chained: true }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnTag':
      return [on({ trigger: { on: 'tagApplied', tag: eff.tag }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnHitTaken':
      return [on({ trigger: { on: 'hitTaken', critTaken: eff.critTaken }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnMinionHit':
      return [on({ trigger: { on: 'hit', source: 'minion', minionType: eff.minionType }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnMinionCrit':
      return [on({ trigger: { on: 'crit', source: 'minion', minionType: eff.minionType }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnMinionDeath':
      return [on({ trigger: { on: 'minionEvent', event: 'death', minionType: eff.minionType }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnCompanionHit':
      return [on({ trigger: { on: 'hit', source: 'companion' }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnCompanionCrit':
      return [on({ trigger: { on: 'crit', source: 'companion' }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnCompanionDeath':
      // source:'companion' (STRICT channel in matchTrigger) — keeps the
      // legacy kind-separation from procOnMinionDeath's wildcard.
      return [on({ trigger: { on: 'minionEvent', event: 'death', source: 'companion' }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnTrapDetonate':
      return [on({ trigger: { on: 'trapEvent', event: 'detonate' }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnTrapChain':
      return [on({ trigger: { on: 'trapEvent', event: 'chain' }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnResonanceChargeGain':
      return [on({
        trigger: { on: 'stateChange', stateId: 'resonance_charge', change: 'gain', key: eff.element },
        chance: eff.chance, actions: [eff.action],
      })];
    case 'procOnConvergenceCast':
      // Legacy semantics: the CALLER gates on skill.id containing
      // 'convergence' before dispatching, so the rule itself carries no
      // filter (equivalence with the shimmed dispatch is exact).
      return [on({ trigger: { on: 'cast' }, chance: eff.chance, actions: [eff.action] })];
    case 'procOnBulwarkConsume':
      return [on({ trigger: { on: 'stateChange', stateId: 'bulwark_charge', change: 'consume' }, chance: eff.chance, actions: [eff.action] })];

    // ── Presence/getter kinds: consumers read these directly today;
    //    they lower onto the RULES registry in Wave 3 (D15). ──
    case 'grantDotCrit':
    case 'whilePauseDebuffDecay':
    case 'precisionPayoff':
    case 'grantPandemic':
    case 'grantCompanion':
    case 'companionProcInheritance':
    case 'grantTagOnSkill':
      return [eff];
  }
}

/** Convenience: normalize a whole collected-effects array. */
export function normalizeAll(effects: TalentEffect[]): TalentEffect[] {
  const out: TalentEffect[] = [];
  for (const e of effects) out.push(...normalizeTalentEffect(e));
  return out;
}

// Re-export for authoring/tests that want tag semantics near the IR.
export type { TalentTag };

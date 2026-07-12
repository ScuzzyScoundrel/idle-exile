// ============================================================
// Class Talent Dispatcher (Phase 4 sub-phase 5)
// ============================================================
//
// Processes TalentEffect[] from allocated class talent nodes. Plugs
// into existing combat event surfaces in engine/combat/tick.ts:
//   • pre-roll    → fold whileTag + perStack into effectiveStats
//   • post-hit    → procOnHit triggers
//   • post-crit   → procOnCrit triggers
//   • on-kill     → procOnKill triggers
//   • on-applyTag → procOnTag triggers (hooked via applyDebuffToList)
//
// Action handlers:
//   • applyTag   → maps TalentTag → debuff id, adds stacks to target
//   • healSelf   → increments state.life (clamped to maxLife)
//   • summon     → STUB (Phase 4.1 — needs minion slot)
//   • triggerSkill → STUB (Phase 4.1 — needs free-cast path)
//   • grantBuff  → STUB

import type {
  CharacterClass, Character, TalentEffect, TalentTag,
  ActiveDebuff, ResolvedStats, TempBuff,
} from '../types';
import { getNodeEffects } from '../data/classTrees';
import { getAscendancyNodeEffects } from '../data/ascendancies';
import { getUniqueItemDef } from '../data/uniqueItems';
import { evalCondition, TALENT_TAG_TO_DEBUFF, type ConditionContext } from './ir/conditions';
import { resolveValue } from './ir/normalize';
import { dispatchEvent, type TalentProcContext } from './ir/dispatch';

// Phase 2 Waves 1-2 (2026-07-12): the canonical TALENT_TAG_TO_DEBUFF +
// Condition evaluator live in ir/conditions.ts; TalentProcContext,
// executeAction, rollAndFire and the event interpreter (dispatchEvent /
// matchTrigger) live in ir/dispatch.ts. One predicate language + one
// dispatch path for talent conditionals, EffectRule.if, and gambit
// rotation policies (Wave 5). Re-exported here for legacy callers.
export { TALENT_TAG_TO_DEBUFF, evalCondition, type ConditionContext };
export {
  dispatchEvent, matchTrigger, executeAction, rollAndFire,
  buildProcConditionCtx, TALENT_BUFF_REGISTRY,
  type TalentProcContext, type TriggerEvent,
} from './ir/dispatch';

// TALENT_BUFF_REGISTRY moved to ir/dispatch.ts (Wave 2, D10) — re-exported above.

// (TALENT_TAG_TO_DEBUFF now lives in ir/conditions.ts — imported above.)

// Shared frozen sets so building a ConditionContext per call allocates nothing.
const FRENZIED_ACTIVE_SET: ReadonlySet<string> = new Set(['frenzied']);
const NO_ACTIVE_STATES: ReadonlySet<string> = new Set();

/**
 * Scale a TalentEffect by an allocated rank.
 *
 * Phase D (2026-05-05): effects.ts entries are authored at rank-1 values;
 * a node at rank N produces N× the rank-1 effect. Scaling rules per kind:
 *   • stat:        delta * rank
 *   • statMult:    1 + (mult - 1) * rank   (linear additive scaling)
 *   • whileTag:    1 + (mult - 1) * rank   (same — additive while-tag bonus)
 *   • perStack:    perStackDelta * rank, cap also scaled
 *   • procOnHit/Crit/Kill/Tag: chance * rank, capped at 100
 *   • grantTagOnSkill: not scaled (boolean-shape)
 */
export function scaleTalentEffectByRank(effect: TalentEffect, rank: number): TalentEffect {
  if (rank <= 1) return effect;
  switch (effect.kind) {
    case 'stat':
      return { ...effect, delta: effect.delta * rank };
    case 'statMult':
      return { ...effect, mult: 1 + (effect.mult - 1) * rank };
    // ── Effect IR kinds (Wave 2, D7): resolve rank at scale time so
    //    downstream dispatch stays rank-free. 'on' scales chance only
    //    (parity with legacy proc scaling); 'rule' params don't scale in v1.
    case 'on':
      return { ...effect, on: { ...effect.on, chance: resolveValue(effect.on.chance ?? 100, rank, 'chance') } };
    case 'mod':
      return { ...effect, mod: { ...effect.mod, value: resolveValue(effect.mod.value, rank, effect.mod.op) } };
    case 'rule':
      return effect;
    case 'whileTag':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileSelfHpBelow':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileSelfHpAbove':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileFrenzied':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileTargetHpBelow':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileCompanionAlive':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileMinionCountAtLeast':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileOffhandAbsent':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'whileCritStacksAtLeast':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'perCritStack':
      return {
        ...effect,
        perStackDelta: effect.perStackDelta * rank,
        cap: effect.cap !== undefined ? effect.cap * rank : undefined,
      };
    case 'perEnemyCount':
      return {
        ...effect,
        perEnemyDelta: effect.perEnemyDelta * rank,
        cap: effect.cap !== undefined ? effect.cap * rank : undefined,
      };
    case 'whileResonanceChargesAtLeast':
      return {
        ...effect,
        mult: 1 + (effect.mult - 1) * rank,
        delta: effect.delta !== undefined ? effect.delta * rank : undefined,
      };
    case 'perResonanceCharge':
      return {
        ...effect,
        perStackDelta: effect.perStackDelta * rank,
        cap: effect.cap !== undefined ? effect.cap * rank : undefined,
      };
    case 'perStack':
      return {
        ...effect,
        perStackDelta: effect.perStackDelta * rank,
        cap: effect.cap !== undefined ? effect.cap * rank : undefined,
      };
    case 'procOnHit':
    case 'procOnKill':
    case 'procOnCrit':
    case 'procOnTag':
    case 'procOnMinionHit':
    case 'procOnMinionCrit':
    case 'procOnMinionDeath':
    case 'procOnTrapDetonate':
    case 'procOnTrapChain':
    case 'procOnCompanionHit':
    case 'procOnCompanionCrit':
    case 'procOnCompanionDeath':
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'procOnHitTaken':
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'procOnMultiKillChain':
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'procOnResonanceChargeGain':
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'procOnConvergenceCast':
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'procOnBulwarkConsume':
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'companionProcInheritance':
      return { ...effect, percent: Math.min(100, effect.percent * rank) };
    case 'precisionPayoff':
      return { ...effect, bonusPercent: effect.bonusPercent * rank };
    case 'grantDotCrit':
      return { ...effect, chanceBonus: Math.min(100, effect.chanceBonus * rank) };
    case 'grantTagOnSkill':
    case 'grantCompanion':
    case 'grantPandemic':
    case 'whilePauseDebuffDecay':
      return effect;
  }
}

/** Extract all talent effects for a class, scaled by their allocated ranks.
 *  Phase D (2026-05-05): reads `talentRanks: Record<string, number>` shape
 *  and applies `scaleTalentEffectByRank` per entry. */
export function collectTalentEffects(
  charClass: CharacterClass,
  ranks: Record<string, number>,
): TalentEffect[] {
  const result: TalentEffect[] = [];
  for (const [nodeId, rank] of Object.entries(ranks)) {
    if (rank <= 0) continue;
    const effects = getNodeEffects(charClass, nodeId);
    for (const eff of effects) {
      result.push(scaleTalentEffectByRank(eff, rank));
    }
  }
  return result;
}

/** Extract all ascendancy effects for a chosen tree, scaled by allocated ranks.
 *  Phase E (2026-05-05): same scaling pipeline as class talents — ascendancy
 *  effects feed the same dispatcher (whileTag / perStack / procOn* / etc.). */
export function collectAscendancyEffects(
  ascendancyId: string | null,
  ranks: Record<string, number>,
): TalentEffect[] {
  if (!ascendancyId) return [];
  const result: TalentEffect[] = [];
  for (const [nodeId, rank] of Object.entries(ranks)) {
    if (rank <= 0) continue;
    const effects = getAscendancyNodeEffects(ascendancyId, nodeId);
    for (const eff of effects) {
      result.push(scaleTalentEffectByRank(eff, rank));
    }
  }
  return result;
}

/** Effect IR Wave 3b (D17): collect TalentEffect[] from equipped
 *  uniques' DEF-level uniqueAffix.effects (looked up by uniqueDefId so
 *  existing crafted items inherit def changes — instance stats stay
 *  untouched for save compat). No rank scaling — items have no ranks. */
export function collectUniqueEffects(character: Character): TalentEffect[] {
  const result: TalentEffect[] = [];
  for (const item of Object.values(character.equipment)) {
    const defId = item?.uniqueDefId ?? item?.uniqueAffix?.uniqueDefId;
    if (!defId) continue;
    const def = getUniqueItemDef(defId);
    if (def?.uniqueAffix.effects) result.push(...def.uniqueAffix.effects);
  }
  return result;
}

/** Count stacks of a debuff (by id) on a target. */
function countStacksById(debuffs: ActiveDebuff[], debuffId: string): number {
  let total = 0;
  for (const d of debuffs) if (d.debuffId === debuffId) total += d.stacks;
  return total;
}

function targetHasTag(debuffs: ActiveDebuff[], tag: TalentTag): boolean {
  const did = TALENT_TAG_TO_DEBUFF[tag];
  if (!did) return false;
  return debuffs.some(d => d.debuffId === did);
}

/** Folds whileTag + perStack + whileSelfHpBelow + whileTargetHpBelow
 *  modifiers into effectiveStats based on current target-debuff state +
 *  player and target HP fractions. Legacy `stat` / `statMult` also
 *  handled so authors can use either effect shape.
 *
 *  Phase F (2026-05-05): adds `selfHpFraction` + `targetHpFraction`
 *  parameters (both 0-1, default 1 = "no HP-conditional fires"). Callers
 *  that don't track HP can omit them. */
export function applyConditionalTalentEffects(
  effects: TalentEffect[],
  stats: ResolvedStats,
  targetDebuffs: ActiveDebuff[],
  selfHpFraction: number = 1,
  targetHpFraction: number = 1,
  companionAlive: boolean = false,
  critStacks: number = 0,
  resonanceCharges: number = 0,
  offhandAbsent: boolean = false,
  enemyCount: number = 0,
  frenziedActive: boolean = false,
  minionCount: number = 0,
  castSkillId?: string,
): { damageMult: number } {
  let damageMult = 1;

  // Phase 2 Wave 1 (2026-07-12): one ConditionContext + one evaluator
  // replaces the per-kind guard clauses below. Legacy while* kinds map
  // to Condition leaves with byte-identical semantics (D9: normalization
  // preserves current global-front-target behavior).
  const condCtx: ConditionContext = {
    targetDebuffs,
    selfHpFraction,
    targetHpFraction,
    companionAlive,
    offhandAbsent,
    enemyCount,
    minionCount,
    stateCounts: { crit_stack: critStacks, resonance_charge: resonanceCharges },
    activeStates: frenziedActive ? FRENZIED_ACTIVE_SET : NO_ACTIVE_STATES,
  };
  /** while*-family apply body: delta adds, damageMult multiplies, other
   *  stats multiply — exact legacy semantics. */
  const applyWhileBonus = (stat: string, mult: number, delta?: number): void => {
    if (delta !== undefined) {
      if (typeof (stats as any)[stat] === 'number') {
        (stats as any)[stat] += delta;
      }
    } else if (stat === 'damageMult') {
      damageMult *= mult;
    } else if (typeof (stats as any)[stat] === 'number') {
      (stats as any)[stat] *= mult;
    }
  };
  /** per*-family apply body: capped counter bonus, damageMult as
   *  (1 + bonus) multiplier, other stats additive — exact legacy
   *  semantics (cap of 0 means uncapped, matching `eff.cap ?`). */
  const applyPerBonus = (stat: string, raw: number, cap?: number): void => {
    const bonus = cap ? Math.min(raw, cap) : raw;
    if (stat === 'damageMult') damageMult *= (1 + bonus);
    else if (typeof (stats as any)[stat] === 'number') {
      (stats as any)[stat] += bonus;
    }
  };

  for (const eff of effects) {
    switch (eff.kind) {
      case 'stat':
        // Folded into stats in-place. Unknown stats silently ignored.
        if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] += eff.delta;
        }
        break;
      case 'statMult':
        if (eff.stat === 'damageMult') damageMult *= eff.mult;
        else if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] *= eff.mult;
        }
        break;
      // ── while* family: legacy kind → Condition leaf → shared apply body.
      //    Semantics preserved exactly (strict < for Below, >= for Above/AtLeast).
      case 'whileTag':
        if (evalCondition({ targetHasTag: eff.tag }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileSelfHpBelow':
        if (evalCondition({ selfHpBelow: eff.threshold }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileSelfHpAbove':
        if (evalCondition({ selfHpAbove: eff.threshold }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileFrenzied':
        if (evalCondition({ stateActive: 'frenzied' }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileTargetHpBelow':
        if (evalCondition({ targetHpBelow: eff.threshold }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileCompanionAlive':
        if (evalCondition({ companionAlive: true }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileMinionCountAtLeast':
        if (evalCondition({ minionCountAtLeast: { count: eff.threshold } }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileOffhandAbsent':
        if (evalCondition({ offhandAbsent: true }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileCritStacksAtLeast':
        if (evalCondition({ stateCountAtLeast: { stateId: 'crit_stack', count: eff.threshold } }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      case 'whileResonanceChargesAtLeast':
        if (evalCondition({ stateCountAtLeast: { stateId: 'resonance_charge', count: eff.threshold } }, condCtx)) applyWhileBonus(eff.stat, eff.mult, eff.delta);
        break;
      // ── per* family: counter × delta, capped, shared apply body ──
      case 'perCritStack':
        if (critStacks > 0) applyPerBonus(eff.stat, critStacks * eff.perStackDelta, eff.cap);
        break;
      case 'perEnemyCount':
        if (enemyCount > 0) applyPerBonus(eff.stat, enemyCount * eff.perEnemyDelta, eff.cap);
        break;
      case 'perResonanceCharge':
        if (resonanceCharges > 0) applyPerBonus(eff.stat, resonanceCharges * eff.perStackDelta, eff.cap);
        break;
      case 'perStack': {
        const did = TALENT_TAG_TO_DEBUFF[eff.stack as TalentTag];
        if (!did) break;
        const stacks = countStacksById(targetDebuffs, did);
        if (stacks > 0) applyPerBonus(eff.stat, stacks * eff.perStackDelta, eff.cap);
        break;
      }
      // ── Effect IR 'mod' fold (Wave 2, D5/D6 slice A): if-condition +
      //    per-counters + add/mult ops. Bucket/element scope folds land
      //    with the damage-pipeline slices; 'gainAs' with them (Wave 3). ──
      case 'mod': {
        const m = eff.mod;
        // Skill scope (E14): a skillId-scoped mod folds only into casts
        // of that skill; when the fold runs without a cast (castSkillId
        // undefined), scoped mods stay inert. Other scope axes (bucket/
        // element/tag) still land with the damage-pipeline slices.
        if (m.scope?.skillId && m.scope.skillId !== castSkillId) break;
        if (m.if && !evalCondition(m.if, condCtx)) break;
        const raw = Array.isArray(m.value) ? m.value[0] : m.value;
        if (m.per) {
          const p = m.per;
          const count = p.count === 'enemies' ? enemyCount
            : p.count === 'minions' ? minionCount
            : p.count === 'stateStacks'
              ? (p.side === 'target'
                ? countStacksById(targetDebuffs, TALENT_TAG_TO_DEBUFF[p.stateId as TalentTag] ?? p.stateId)
                : (condCtx.stateCounts[p.stateId] ?? 0))
              : 0; // missingLifePercent — Wave 3 (needs maxLife here)
          if (count > 0) applyPerBonus(m.stat, count * raw, m.cap);
          break;
        }
        if (m.op === 'mult') applyWhileBonus(m.stat, raw, undefined);
        else if (m.op === 'add') applyWhileBonus(m.stat, 1, raw);
        break;
      }
      case 'on':
      case 'rule':
        // 'on' rules fire via dispatchEvent at combat event sites;
        // 'rule' entries are read by their registry consumers (Wave 3).
        break;
      // Event-driven triggers handled by dispatchProc* below.
      case 'procOnHit':
      case 'procOnKill':
      case 'procOnCrit':
      case 'procOnTag':
      case 'procOnMinionHit':
      case 'procOnMinionCrit':
      case 'procOnMinionDeath':
      case 'procOnTrapDetonate':
      case 'procOnTrapChain':
      case 'procOnCompanionHit':
      case 'procOnCompanionCrit':
      case 'procOnCompanionDeath':
      case 'grantTagOnSkill':
      case 'grantCompanion':
      case 'grantPandemic':
      case 'grantDotCrit':
      case 'companionProcInheritance':
      case 'precisionPayoff':
        break;
    }
  }
  return { damageMult };
}

// Re-export TALENT_TAG_TO_DEBUFF type guard helpers for tests / callers
// that need to know what conditional kinds fire on what state — kept
// internal for now but the structure is here.

// TalentProcContext, rollAndFire, executeAction and the event
// interpreter (dispatchEvent/matchTrigger) live in ir/dispatch.ts as of
// Wave 2 (D10) — re-exported above. The dispatchProcOn* functions below
// are one-line event-descriptor shims kept so tick.ts / staff.ts /
// dagger.ts / talent-bot call sites compile unchanged.

export function dispatchProcOnHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'hit', source: 'self' }, effects, ctx);
}

export function dispatchProcOnCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'crit', source: 'self' }, effects, ctx);
}

export function dispatchProcOnKill(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'kill', source: 'self' }, effects, ctx);
}

/** Phase F (2026-05-06): fires when the player TAKES a hit. Caller
 *  passes `isCrit` (was the incoming hit a crit?). The kind's
 *  `critTaken?` discriminator filters: undefined = any hit, true =
 *  crits only, false = non-crits only. Callers should suppress on
 *  dodge (no proc fire) but block still fires. ctx.targetDebuffs
 *  should be the ATTACKER's debuff list (so applyTag goes on the
 *  attacker, not the player). Used by Brs Juggernaut defensive
 *  procs (stalwart_mastery, ironclad). */
export function dispatchProcOnHitTaken(
  effects: TalentEffect[],
  ctx: TalentProcContext,
  isCrit: boolean,
): void {
  dispatchEvent({ on: 'hitTaken', critTaken: isCrit }, effects, ctx);
}

/** Phase F (2026-05-06): fires once per CHAINED kill within a cast
 *  (kills 2..N — the first kill of the cast doesn't count as a chain).
 *  Caller passes `killCount` (mobKills from per-cast counter); the
 *  dispatcher rolls and fires `(killCount - 1)` times. Used by Brs
 *  Juggernaut Mass Slaughter — "kills with same skill within 1s
 *  refund X rage per chained kill." */
export function dispatchProcOnMultiKillChain(
  effects: TalentEffect[],
  ctx: TalentProcContext,
  killCount: number,
): void {
  if (killCount < 2) return;
  // One chained-kill event per kill 2..N — each matching rule rolls
  // once per event (legacy fired (killCount-1) rolls per effect).
  for (let i = 1; i < killCount; i++) {
    dispatchEvent({ on: 'kill', source: 'self', chained: true }, effects, ctx);
  }
}

/** Phase F F5d expansion (2026-05-07): fires when the player GAINS a
 *  Resonance charge (element-tagged hit added a charge pre-cap).
 *  Caller passes the element of the charge gained; the kind's
 *  optional `element?` filter restricts to a single element when
 *  set, or any-element when undefined. Used by Sor Arcanist /
 *  Elementalist Resonance-aware procs. */
export function dispatchProcOnResonanceChargeGain(
  effects: TalentEffect[],
  ctx: TalentProcContext,
  element: 'fire' | 'cold' | 'lightning' | 'chaos',
): void {
  dispatchEvent({ on: 'stateChange', stateId: 'resonance_charge', change: 'gain', key: element }, effects, ctx);
}

/** Phase F F5d expansion (2026-05-07): fires when a Convergence skill
 *  is cast. Caller detects via `skill.id.includes('convergence')` at
 *  the skill-cast site (covers gauntlet_forge_convergence,
 *  wand_volley_convergence, crossbow_convergence_bolt). Used by Sor
 *  Arcanist convergence-aware procs. */
export function dispatchProcOnConvergenceCast(
  effects: TalentEffect[],
  ctx: TalentProcContext,
): void {
  // NOTE: 'cast' events are only emitted at the convergence-gated call
  // site today; new-form {on:'cast'} rules therefore fire on Convergence
  // casts only until a general cast-event emit lands (Wave 4).
  dispatchEvent({ on: 'cast', skillId: ctx.sourceSkillId }, effects, ctx);
}

/** Phase F (2026-05-07): fires when a Bulwark charge is consumed —
 *  player took a hit with `bulwark_charge` tempBuff active, damage
 *  halved, one stack removed. Used by Brs Juggernaut Sustained Aegis
 *  ("on Bulwark consumed, +X% chance to grant another charge"). */
export function dispatchProcOnBulwarkConsume(
  effects: TalentEffect[],
  ctx: TalentProcContext,
): void {
  dispatchEvent({ on: 'stateChange', stateId: 'bulwark_charge', change: 'consume' }, effects, ctx);
}

/** Phase F (2026-05-07): Bulwark consume helper — checks tempBuffs
 *  for `bulwark_charge`, halves the incoming damage if found, removes
 *  one stack (or splices if last), returns the new damage value AND
 *  whether a consume happened. Caller fires procOnBulwarkConsume when
 *  consumed=true. Mutates `tempBuffs` in place. */
export function consumeBulwarkCharge(
  tempBuffs: TempBuff[],
  damage: number,
): { damage: number; consumed: boolean } {
  if (damage <= 0) return { damage, consumed: false };
  const idx = tempBuffs.findIndex(b => b.id === 'bulwark_charge');
  if (idx < 0) return { damage, consumed: false };
  const buff = tempBuffs[idx];
  if (buff.stacks > 1) {
    tempBuffs[idx] = { ...buff, stacks: buff.stacks - 1 };
  } else {
    tempBuffs.splice(idx, 1);
  }
  return { damage: damage * 0.5, consumed: true };
}

export function dispatchProcOnTag(
  effects: TalentEffect[],
  appliedTag: TalentTag,
  ctx: TalentProcContext,
): void {
  dispatchEvent({ on: 'tagApplied', tag: appliedTag }, effects, ctx);
}

/** Fires when one of the player's minions hits an enemy.
 *  Phase F F2 (2026-05-06): caller passes `targetDebuffs` as the hit
 *  target's debuff list so apply-tag actions land on the correct enemy. */
export function dispatchProcOnMinionHit(effects: TalentEffect[], ctx: TalentProcContext, minionType?: string): void {
  dispatchEvent({ on: 'hit', source: 'minion', minionType }, effects, ctx);
}

/** Fires when one of the player's minions crits.
 *  Phase F F2 follow-on (2026-05-07): optional minionType filter
 *  routes procs to specific summon archetypes (fetish, hound, etc.). */
export function dispatchProcOnMinionCrit(effects: TalentEffect[], ctx: TalentProcContext, minionType?: string): void {
  dispatchEvent({ on: 'crit', source: 'minion', minionType }, effects, ctx);
}

/** Fires when one of the player's minions dies. The dying minion's
 *  position is irrelevant for now — actions like grantBuff / refundMana
 *  apply to the player; applyTag/applyTagAll target enemies via ctx.
 *  Phase F F2 follow-on (2026-05-07): optional minionType filter. */
export function dispatchProcOnMinionDeath(effects: TalentEffect[], ctx: TalentProcContext, minionType?: string): void {
  dispatchEvent({ on: 'minionEvent', event: 'death', minionType }, effects, ctx);
}

/** Fires when one of the player's traps detonates. Phase F F3
 *  (2026-05-06): caller passes targetDebuffs as the detonation-impact
 *  enemy's debuff list so applyTag actions land correctly. */
export function dispatchProcOnTrapDetonate(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'trapEvent', event: 'detonate' }, effects, ctx);
}

/** Fires when a trap detonation chains into a nearby trap (multi-trap
 *  burst). For now the chain detection is approximate — fires once per
 *  detonation event when multiple traps were active beforehand. */
export function dispatchProcOnTrapChain(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'trapEvent', event: 'chain' }, effects, ctx);
}

/** Fires when the player's companion (singleton minion with
 *  `type: 'companion'`) hits an enemy. Phase F F4 (2026-05-06):
 *  separate from generic procOnMinionHit so Hunter Beastmaster nodes
 *  can target companion-only behavior. */
export function dispatchProcOnCompanionHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'hit', source: 'companion' }, effects, ctx);
}

/** Fires when the player's companion crits. */
export function dispatchProcOnCompanionCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'crit', source: 'companion' }, effects, ctx);
}

/** Fires when the player's companion dies. */
export function dispatchProcOnCompanionDeath(effects: TalentEffect[], ctx: TalentProcContext): void {
  dispatchEvent({ on: 'minionEvent', event: 'death', source: 'companion' }, effects, ctx);
}

/** Returns true if the player has at least one `grantCompanion` effect
 *  allocated — used by the (deferred) companion-summon runtime to
 *  decide whether to spawn / maintain a singleton companion. Today
 *  this is consulted only in tests; the runtime that actually summons
 *  the companion is the F4 follow-on. */
export function hasCompanionGrant(effects: TalentEffect[]): boolean {
  return effects.some(e => e.kind === 'grantCompanion');
}

/** Returns true if the player has at least one `grantPandemic` effect
 *  allocated. Phase F F5e (2026-05-06): consulted by zoneAttack.ts
 *  dying-mob loop to decide whether to spread the dying mob's DoT
 *  debuffs to surviving enemies. */
export function hasPandemicGrant(effects: TalentEffect[]): boolean {
  return effects.some(e => e.kind === 'grantPandemic');
}

/** Aggregates all `precisionPayoff` bonusPercents (already rank-scaled)
 *  into a single damage multiplier bonus. Phase F F5b (2026-05-06):
 *  consumed by tick.ts on Precision Payoff hits (a hit on a Marked
 *  target by a skill different from the one that applied Mark).
 *  Result is the raw percent (e.g. 35 → +35% damage). */
export function getPrecisionPayoffBonus(effects: TalentEffect[]): number {
  let total = 0;
  for (const e of effects) {
    if (e.kind === 'precisionPayoff') total += e.bonusPercent;
  }
  return total;
}

/** Aggregates all `grantDotCrit` effects into a per-debuff crit-chance
 *  map. Phase F F5e follow-on (2026-05-06): consumed by tickDebuffDoT
 *  to roll for crit on each DoT batch tick. Effects without an explicit
 *  `debuffId` apply to all DoTs (recorded under the wildcard key '*'
 *  which the caller checks first). Multiple effects on the same key
 *  aggregate additively, capped at 100. */
export function getDotCritByDebuffId(effects: TalentEffect[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const e of effects) {
    if (e.kind !== 'grantDotCrit') continue;
    const key = e.debuffId ?? '*';
    acc[key] = Math.min(100, (acc[key] ?? 0) + e.chanceBonus);
  }
  return acc;
}

/** Phase F F5e follow-on (2026-05-06): aggregates all `whilePauseDebuffDecay`
 *  effects into a Set of debuff IDs whose duration decay should be paused
 *  this tick. A pause fires when the gating tag (e.g. 'mark') is present
 *  on the target. Used by tickDebuffDoT to skip the dtSec subtraction
 *  for matching debuffs. Empty set = no pauses. */
export function getPausedDebuffIds(
  effects: TalentEffect[],
  targetDebuffs: ActiveDebuff[],
): Set<string> {
  const acc = new Set<string>();
  for (const e of effects) {
    if (e.kind !== 'whilePauseDebuffDecay') continue;
    if (targetHasTag(targetDebuffs, e.tag)) {
      acc.add(e.debuffId);
    }
  }
  return acc;
}

/** Aggregates all `companionProcInheritance` percents (already rank-
 *  scaled) into a single roll-target capped at 100. Phase F F4 polish
 *  (2026-05-06): consumed by tick.ts non-staff minion tick to decide
 *  whether each companion attack also fires the player's procOnHit /
 *  procOnCrit pipeline. */
export function getCompanionInheritancePercent(effects: TalentEffect[]): number {
  let total = 0;
  for (const e of effects) {
    if (e.kind === 'companionProcInheritance') total += e.percent;
  }
  return Math.min(100, total);
}

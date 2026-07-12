// ============================================================
// Effect IR — condition evaluator (Phase 2 Wave 1, D4/D24)
// Pure, total, no RNG. The SINGLE predicate evaluator behind talent
// conditionals (applyConditionalTalentEffects), EffectRule.if (Wave 2),
// and gambit RotationPolicy rules (Wave 5).
//
// Totality rule: a positive leaf evaluates FALSE when the context lacks
// the data it needs (e.g. no readySkillIds provided → skillReady is
// false); `not` inverts that result. Callers populate only the context
// fields their surface knows about.
// ============================================================

import type { Condition } from '../../types/conditions';
import type { ActiveDebuff } from '../../types/combat';
import type { TalentTag } from '../../types/skills';

/** Map TalentTag → debuff id registered in data/debuffs.ts.
 *  CANONICAL copy (moved from classTalentDispatcher.ts in Wave 1 so the
 *  IR evaluator and the dispatcher can never disagree; dispatcher
 *  re-exports for legacy callers). */
export const TALENT_TAG_TO_DEBUFF: Record<TalentTag, string> = {
  hex: 'hexed',
  curse: 'cursed',
  mark: 'marked',
  poison: 'poisoned',
  bleed: 'bleeding',
  ignite: 'burning',
  chill: 'chilled',
  shock: 'shocked',
  frozen: 'frostbite',
  stun: 'stunned',      // Placeholder — no matching debuff yet.
  taunt: 'taunted',     // Placeholder — no matching debuff yet.
  staggered: 'staggered',
  cleave: 'cleave_marked',
  snare: 'snared',
};

/** Runtime snapshot a Condition is evaluated against. Wave 1 populates
 *  the required block from applyConditionalTalentEffects' params; the
 *  optional block is filled in by richer surfaces (proc dispatch Wave 2,
 *  gambits Wave 5). */
export interface ConditionContext {
  targetDebuffs: ActiveDebuff[];
  selfHpFraction: number;
  targetHpFraction: number;
  companionAlive: boolean;
  offhandAbsent: boolean;
  enemyCount: number;
  minionCount: number;
  /** Stack counts by StateDef id ('crit_stack', 'resonance_charge', …).
   *  Wave 3 redirects these to generic StateInstances. */
  stateCounts: Record<string, number>;
  /** Boolean states currently active ('frenzied', …). */
  activeStates: ReadonlySet<string>;
  // ── Optional runtime (false-when-absent per the totality rule) ──
  minionCountByType?: Record<string, number>;
  manaPct?: number;                       // 0-100
  weaponType?: string;
  skillTags?: readonly string[];
  hitDamageTag?: string;
  skillId?: string;
  readySkillIds?: ReadonlySet<string>;
  activeBuffIds?: ReadonlySet<string>;
  inBossFight?: boolean;
  /** Target-side generic states (Wave 3+); used by targetHasState /
   *  appliedByDifferentSkill. */
  targetStates?: readonly { defId: string; stacks: number; appliedBySkillId?: string }[];
}

function debuffIdForTag(tag: TalentTag): string | undefined {
  return TALENT_TAG_TO_DEBUFF[tag];
}

function targetHasTagDebuff(debuffs: ActiveDebuff[], tag: TalentTag): boolean {
  const did = debuffIdForTag(tag);
  if (!did) return false;
  return debuffs.some(d => d.debuffId === did);
}

function stateCount(ctx: ConditionContext, stateId: string, key?: string, side?: 'self' | 'target'): number {
  if (side === 'target') {
    const inst = ctx.targetStates?.filter(s => s.defId === stateId) ?? [];
    return inst.reduce((sum, s) => sum + s.stacks, 0);
  }
  const k = key ? `${stateId}:${key}` : stateId;
  return ctx.stateCounts[k] ?? ctx.stateCounts[stateId] ?? 0;
}

/** Evaluate a Condition against a runtime snapshot. Pure + total. */
export function evalCondition(cond: Condition, ctx: ConditionContext): boolean {
  if ('all' in cond) return cond.all.every(c => evalCondition(c, ctx));
  if ('any' in cond) return cond.any.some(c => evalCondition(c, ctx));
  if ('not' in cond) return !evalCondition(cond.not, ctx);

  if ('targetHasTag' in cond) return targetHasTagDebuff(ctx.targetDebuffs, cond.targetHasTag);
  if ('targetLacksTag' in cond) return !targetHasTagDebuff(ctx.targetDebuffs, cond.targetLacksTag);
  if ('targetHasState' in cond) {
    const { stateId, minStacks = 1 } = cond.targetHasState;
    return stateCount(ctx, stateId, undefined, 'target') >= minStacks;
  }

  if ('stateActive' in cond) {
    return ctx.activeStates.has(cond.stateActive) || stateCount(ctx, cond.stateActive) > 0;
  }
  if ('stateMissing' in cond) {
    return !ctx.activeStates.has(cond.stateMissing) && stateCount(ctx, cond.stateMissing) <= 0;
  }
  if ('stateCountAtLeast' in cond) {
    const p = cond.stateCountAtLeast;
    return stateCount(ctx, p.stateId, p.key, p.side) >= p.count;
  }
  if ('stateCountBelow' in cond) {
    const p = cond.stateCountBelow;
    return stateCount(ctx, p.stateId, p.key, p.side) < p.count;
  }

  if ('selfHpBelow' in cond) return ctx.selfHpFraction < cond.selfHpBelow;
  if ('selfHpAbove' in cond) return ctx.selfHpFraction >= cond.selfHpAbove;
  if ('targetHpBelow' in cond) return ctx.targetHpFraction < cond.targetHpBelow;
  if ('targetHpAbove' in cond) return ctx.targetHpFraction >= cond.targetHpAbove;
  if ('manaPctAtLeast' in cond) return ctx.manaPct !== undefined && ctx.manaPct >= cond.manaPctAtLeast;
  if ('manaPctBelow' in cond) return ctx.manaPct !== undefined && ctx.manaPct < cond.manaPctBelow;

  if ('enemyCountAtLeast' in cond) return ctx.enemyCount >= cond.enemyCountAtLeast;
  if ('minionCountAtLeast' in cond) {
    const p = cond.minionCountAtLeast;
    if (p.minionType) return (ctx.minionCountByType?.[p.minionType] ?? 0) >= p.count;
    return ctx.minionCount >= p.count;
  }
  if ('companionAlive' in cond) return ctx.companionAlive;
  if ('inBossFight' in cond) return ctx.inBossFight === true;

  if ('offhandAbsent' in cond) return ctx.offhandAbsent;
  if ('weaponType' in cond) return ctx.weaponType === cond.weaponType;
  if ('skillHasTag' in cond) return ctx.skillTags?.includes(cond.skillHasTag) === true;
  if ('hitDamageTag' in cond) return ctx.hitDamageTag === cond.hitDamageTag;
  if ('skillIdIs' in cond) return ctx.skillId === cond.skillIdIs;
  if ('skillReady' in cond) return ctx.readySkillIds?.has(cond.skillReady) === true;
  if ('buffActive' in cond) return ctx.activeBuffIds?.has(cond.buffActive) === true;
  if ('buffMissing' in cond) return !(ctx.activeBuffIds?.has(cond.buffMissing) === true);

  if ('appliedByDifferentSkill' in cond) {
    const { stateId } = cond.appliedByDifferentSkill;
    if (!ctx.skillId || !ctx.targetStates) return false;
    return ctx.targetStates.some(s => s.defId === stateId && s.appliedBySkillId !== undefined && s.appliedBySkillId !== ctx.skillId);
  }

  return false;
}

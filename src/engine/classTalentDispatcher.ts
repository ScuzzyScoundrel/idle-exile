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
  CharacterClass, TalentEffect, TalentAction, TalentTag, DamageTag,
  ActiveDebuff, ResolvedStats,
} from '../types';
import { getNodeEffects } from '../data/classTrees';
import { getAscendancyNodeEffects } from '../data/ascendancies';
import { applyDebuffToList } from './combat/helpers';

/** Map TalentTag → debuff id registered in data/debuffs.ts. */
const TALENT_TAG_TO_DEBUFF: Record<TalentTag, string> = {
  hex: 'hexed',
  curse: 'cursed',
  mark: 'marked',       // Registered below as a lightweight debuff.
  poison: 'poisoned',
  bleed: 'bleeding',
  ignite: 'burning',
  chill: 'chilled',
  shock: 'shocked',
  frozen: 'frostbite',
  stun: 'stunned',      // Placeholder — no matching debuff yet.
  taunt: 'taunted',     // Placeholder — no matching debuff yet.
};

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
    case 'whileTag':
      return { ...effect, mult: 1 + (effect.mult - 1) * rank };
    case 'whileSelfHpBelow':
      return { ...effect, mult: 1 + (effect.mult - 1) * rank };
    case 'whileTargetHpBelow':
      return { ...effect, mult: 1 + (effect.mult - 1) * rank };
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
      return { ...effect, chance: Math.min(100, effect.chance * rank) };
    case 'grantTagOnSkill':
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
): { damageMult: number } {
  let damageMult = 1;
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
      case 'whileTag':
        if (targetHasTag(targetDebuffs, eff.tag)) {
          if (eff.stat === 'damageMult') damageMult *= eff.mult;
          else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileSelfHpBelow':
        if (selfHpFraction < eff.threshold) {
          if (eff.stat === 'damageMult') damageMult *= eff.mult;
          else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileTargetHpBelow':
        if (targetHpFraction < eff.threshold) {
          if (eff.stat === 'damageMult') damageMult *= eff.mult;
          else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'perStack': {
        const did = TALENT_TAG_TO_DEBUFF[eff.stack as TalentTag];
        if (!did) break;
        const stacks = countStacksById(targetDebuffs, did);
        if (stacks <= 0) break;
        const raw = stacks * eff.perStackDelta;
        const bonus = eff.cap ? Math.min(raw, eff.cap) : raw;
        if (eff.stat === 'damageMult') damageMult *= (1 + bonus);
        else if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] += bonus;
        }
        break;
      }
      // Event-driven triggers handled by dispatchProc* below.
      case 'procOnHit':
      case 'procOnKill':
      case 'procOnCrit':
      case 'procOnTag':
      case 'grantTagOnSkill':
        break;
    }
  }
  return { damageMult };
}

// Re-export TALENT_TAG_TO_DEBUFF type guard helpers for tests / callers
// that need to know what conditional kinds fire on what state — kept
// internal for now but the structure is here.

export interface TalentProcContext {
  /** Target debuffs at proc time. New debuffs from this proc append here. */
  targetDebuffs: ActiveDebuff[];
  /** Current player life — handlers may mutate to apply heals. */
  life: { value: number; max: number };
  /** Source skill id for applyDebuffToList attribution. */
  sourceSkillId: string;
  /** Skill tag (from the hit that triggered) for procOnHit/Kill filters. */
  hitDamageTag?: DamageTag;
}

/** Roll chance and dispatch action. chance is 0-100 (not 0-1). */
function rollAndFire(action: TalentAction, chance: number, ctx: TalentProcContext): void {
  if (Math.random() * 100 >= chance) return;
  executeAction(action, ctx);
}

function executeAction(action: TalentAction, ctx: TalentProcContext): void {
  switch (action.kind) {
    case 'applyTag': {
      const did = TALENT_TAG_TO_DEBUFF[action.tag];
      if (!did) return;
      applyDebuffToList(ctx.targetDebuffs, did, action.stacks ?? 1, action.duration ?? 4, ctx.sourceSkillId);
      break;
    }
    case 'healSelf':
      ctx.life.value = Math.min(ctx.life.max, ctx.life.value + action.amount);
      break;
    // Deferred (Phase 4.1):
    case 'summon':
    case 'triggerSkill':
    case 'grantBuff':
      break;
  }
}

export function dispatchProcOnHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnHit') continue;
    if (eff.tag && eff.tag !== ctx.hitDamageTag) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnCrit') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnKill(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnKill') continue;
    if (eff.tag && eff.tag !== ctx.hitDamageTag) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnTag(
  effects: TalentEffect[],
  appliedTag: TalentTag,
  ctx: TalentProcContext,
): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnTag') continue;
    if (eff.tag !== appliedTag) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

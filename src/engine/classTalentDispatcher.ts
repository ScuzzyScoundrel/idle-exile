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
  ActiveDebuff, ResolvedStats, SkillTimerState, TempBuff, AbilityEffect,
} from '../types';
import { getNodeEffects } from '../data/classTrees';
import { getAscendancyNodeEffects } from '../data/ascendancies';
import { applyDebuffToList, mergeProcTempBuff } from './combat/helpers';
import { SUMMON_CONFIGS, summonMinions, type MinionState } from './combat/minions';

/** Phase F polish (2026-05-06): grantBuff TalentAction registry.
 *  Maps `buffId` → AbilityEffect + maxStacks. Keep this registry
 *  small and player-facing — these are the talent-tree buffs
 *  visible in HUD pills. Skill / proc / item buffs use other paths. */
const TALENT_BUFF_REGISTRY: Record<string, { effect: AbilityEffect; maxStacks: number }> = {
  // wd_sw_bone_armor — +20% damage reduction shield
  bone_armor:    { effect: { defenseMult: 1.2 }, maxStacks: 1 },
  // wd_sw_spirit_shield — next cast within window deals +50% damage
  // (approximated as duration-only — every cast within window gets
  // the buff, not just the first; broader than design intent)
  spirit_shield: { effect: { damageMult: 1.5 }, maxStacks: 1 },
  // hnt_mm_hunters_eye — guaranteed crit charge (consumed by next hit)
  // Approximated as +crit-chance buff for the duration; not a true
  // single-use guarantee. Lands cleanly when buff-consume hooks exist.
  precision_charge: { effect: { critChanceBonus: 100 }, maxStacks: 1 },
};

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
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileSelfHpBelow':
        if (selfHpFraction < eff.threshold) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileSelfHpAbove':
        if (selfHpFraction >= eff.threshold) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileTargetHpBelow':
        if (targetHpFraction < eff.threshold) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileCompanionAlive':
        if (companionAlive) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileOffhandAbsent':
        if (offhandAbsent) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'whileCritStacksAtLeast':
        if (critStacks >= eff.threshold) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'perCritStack': {
        if (critStacks <= 0) break;
        const raw = critStacks * eff.perStackDelta;
        const bonus = eff.cap ? Math.min(raw, eff.cap) : raw;
        if (eff.stat === 'damageMult') damageMult *= (1 + bonus);
        else if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] += bonus;
        }
        break;
      }
      case 'whileResonanceChargesAtLeast':
        if (resonanceCharges >= eff.threshold) {
          if (eff.delta !== undefined) {
            if (typeof (stats as any)[eff.stat] === 'number') {
              (stats as any)[eff.stat] += eff.delta;
            }
          } else if (eff.stat === 'damageMult') {
            damageMult *= eff.mult;
          } else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'perResonanceCharge': {
        if (resonanceCharges <= 0) break;
        const raw = resonanceCharges * eff.perStackDelta;
        const bonus = eff.cap ? Math.min(raw, eff.cap) : raw;
        if (eff.stat === 'damageMult') damageMult *= (1 + bonus);
        else if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] += bonus;
        }
        break;
      }
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

export interface TalentProcContext {
  /** Target debuffs at proc time. New debuffs from this proc append here. */
  targetDebuffs: ActiveDebuff[];
  /** Current player life — handlers may mutate to apply heals. */
  life: { value: number; max: number };
  /** Source skill id for applyDebuffToList attribution. */
  sourceSkillId: string;
  /** Skill tag (from the hit that triggered) for procOnHit/Kill filters. */
  hitDamageTag?: DamageTag;
  // Phase F F1b additions (2026-05-05) — optional refs for new actions.
  // When omitted, the corresponding action becomes a no-op (graceful).
  /** All enemy debuff lists for `applyTagAll` broadcast (each pack mob's
   *  debuffs in clearing; `[activeDebuffs]` in boss_fight). */
  broadcastDebuffLists?: ActiveDebuff[][];
  /** Live skill-timer array for `refundCooldown` to mutate cooldownUntil. */
  skillTimers?: SkillTimerState[];
  /** Player mana ref for `refundMana` (caller reads back into state). */
  mana?: { current: number; max: number };
  /** Crit Cascade ref for `addCritStack` (Phase F F5a follow-on,
   *  2026-05-06). Caller builds `{ value, max, expiresAt }`, dispatcher
   *  bumps `value` capped at `max`, refreshes `expiresAt`. Caller
   *  writes both back to state.critStacks / state.critStacksExpiresAt. */
  critStacksRef?: { value: number; max: number; expiresAt: number };
  /** Resonance ref for `addResonanceCharge` (Phase F F5d follow-on,
   *  2026-05-06). Caller builds the charge bag from state, dispatcher
   *  bumps the chosen element capped at 5, refreshes expiresAt.
   *  Caller writes back to state.resonanceCharges /
   *  state.resonanceExpiresAt. */
  resonanceRef?: {
    charges: { fire: number; cold: number; lightning: number; chaos: number };
    expiresAt: number;
  };
  /** Mutable temp-buff list for `grantBuff` action. Phase F polish
   *  (2026-05-06). Caller passes a copy of state.tempBuffs;
   *  dispatcher pushes new buffs (or refreshes existing) via
   *  mergeProcTempBuff. Caller writes back to state.tempBuffs. */
  tempBuffsRef?: TempBuff[];
  /** Mutable minion list + summon parameters for `summon` action.
   *  Phase F polish (2026-05-06): caller exposes player maxLife +
   *  spellPower so summonMinions can scale freshly-summoned units;
   *  dispatcher pushes via in-place length=0 + push. Caller writes
   *  list back to state.activeMinions. */
  minionsRef?: {
    list: MinionState[];
    playerMaxLife: number;
    playerSpellPower: number;
    now: number;
  };
  /** Self-reference to all allocated talent effects so executeAction
   *  can fire procOnTag cascades (Phase F polish, 2026-05-06).
   *  When caller passes effects here, applyTag / applyTagAll actions
   *  recursively fire `dispatchProcOnTag` with the applied tag —
   *  enabling "on Mark application" / "on Hex application" nodes.
   *  Internal `_inProcOnTag` guard prevents direct recursion. */
  effects?: TalentEffect[];
  _inProcOnTag?: boolean;
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
      // Phase F polish (2026-05-06): cascade procOnTag (e.g. hnt_mm
      // _hunters_eye fires on Mark application). Guard against direct
      // recursion via the _inProcOnTag flag — chain probability decays
      // naturally so 1-deep is sufficient for typical builds.
      if (ctx.effects && !ctx._inProcOnTag) {
        ctx._inProcOnTag = true;
        dispatchProcOnTag(ctx.effects, action.tag, ctx);
        ctx._inProcOnTag = false;
      }
      break;
    }
    case 'applyTagAll': {
      const did = TALENT_TAG_TO_DEBUFF[action.tag];
      if (!did) return;
      const lists = ctx.broadcastDebuffLists;
      if (!lists) return; // graceful no-op when caller didn't provide refs
      for (const list of lists) {
        applyDebuffToList(list, did, action.stacks ?? 1, action.duration ?? 4, ctx.sourceSkillId);
      }
      // Cascade procOnTag once per broadcast (not per target).
      if (ctx.effects && !ctx._inProcOnTag) {
        ctx._inProcOnTag = true;
        dispatchProcOnTag(ctx.effects, action.tag, ctx);
        ctx._inProcOnTag = false;
      }
      break;
    }
    case 'healSelf':
      ctx.life.value = Math.min(ctx.life.max, ctx.life.value + action.amount);
      break;
    case 'refundCooldown': {
      // Set the consumed skill's cooldownUntil to now (full refund) or
      // shorten by `percent` of the original remaining window.
      const timers = ctx.skillTimers;
      if (!timers) return;
      const timer = timers.find(t => t.skillId === ctx.sourceSkillId);
      if (!timer || timer.cooldownUntil === null) return;
      const now = Date.now();
      const pct = action.percent ?? 100;
      if (pct >= 100) {
        timer.cooldownUntil = now;
      } else {
        const remaining = Math.max(0, timer.cooldownUntil - now);
        timer.cooldownUntil = now + remaining * (1 - pct / 100);
      }
      break;
    }
    case 'refundMana':
      if (!ctx.mana) return;
      ctx.mana.current = Math.min(ctx.mana.max, ctx.mana.current + action.amount);
      break;
    case 'addCritStack': {
      if (!ctx.critStacksRef) return;
      const amount = action.amount ?? 1;
      ctx.critStacksRef.value = Math.min(ctx.critStacksRef.max, ctx.critStacksRef.value + amount);
      ctx.critStacksRef.expiresAt = Date.now() + 4000;
      break;
    }
    case 'addResonanceCharge': {
      if (!ctx.resonanceRef) return;
      const amount = action.amount ?? 1;
      const charges = ctx.resonanceRef.charges;
      // Resolve element: explicit pick > first missing > no-op if all full.
      let el: 'fire' | 'cold' | 'lightning' | 'chaos' | null = action.element ?? null;
      if (!el) {
        const order: Array<'fire' | 'cold' | 'lightning' | 'chaos'> = ['fire', 'cold', 'lightning', 'chaos'];
        el = order.find(k => charges[k] < 5) ?? null;
      }
      if (!el) return;
      charges[el] = Math.min(5, charges[el] + amount);
      ctx.resonanceRef.expiresAt = Date.now() + 6000;
      break;
    }
    case 'grantBuff': {
      // Phase F polish (2026-05-06): grantBuff via TALENT_BUFF_REGISTRY.
      // Looks up the buffId, builds a TempBuff, merges via the existing
      // mergeProcTempBuff helper. No-op when registry doesn't contain
      // the buffId or caller didn't provide tempBuffsRef.
      if (!ctx.tempBuffsRef) return;
      const reg = TALENT_BUFF_REGISTRY[action.buffId];
      if (!reg) return;
      const buff: TempBuff = {
        id: action.buffId,
        effect: reg.effect,
        expiresAt: Date.now() + action.duration * 1000,
        sourceSkillId: ctx.sourceSkillId,
        stacks: 1,
        maxStacks: reg.maxStacks,
      };
      // Mutate the array in-place so caller's ref reflects merge.
      const merged = mergeProcTempBuff(ctx.tempBuffsRef, buff);
      ctx.tempBuffsRef.length = 0;
      ctx.tempBuffsRef.push(...merged);
      break;
    }
    case 'summon': {
      // Phase F polish (2026-05-06): summon via SUMMON_CONFIGS lookup.
      // Looks up the minionType, applies optional count / duration
      // overrides, calls summonMinions with player scalings. No-op if
      // caller didn't provide minionsRef or registry doesn't have the
      // type.
      if (!ctx.minionsRef) return;
      const baseCfg = SUMMON_CONFIGS[action.minionType];
      if (!baseCfg) return;
      const cfg = {
        ...baseCfg,
        count: action.count ?? baseCfg.count,
        duration: action.durationSec ?? baseCfg.duration,
      };
      const updated = summonMinions(
        ctx.minionsRef.list, cfg,
        ctx.minionsRef.playerMaxLife, ctx.minionsRef.playerSpellPower,
        ctx.minionsRef.now,
      );
      ctx.minionsRef.list.length = 0;
      ctx.minionsRef.list.push(...updated);
      break;
    }
    case 'triggerSkill': {
      // Phase F polish (2026-05-06): minimal viable triggerSkill —
      // refunds the named skill's cooldown (distinct from
      // refundCooldown which targets the SOURCE skill that fired the
      // proc). True free-cast semantics (synthetic damage roll +
      // proc cascade) are deferred — for now this readies the named
      // skill for instant manual recast. Mutates ctx.skillTimers
      // in-place; no-ops if ref or timer missing.
      const timers = ctx.skillTimers;
      if (!timers) return;
      const timer = timers.find(t => t.skillId === action.skillId);
      if (!timer || timer.cooldownUntil === null) return;
      timer.cooldownUntil = Date.now();
      break;
    }
  }
}

export function dispatchProcOnHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnHit') continue;
    if (eff.tag && eff.tag !== ctx.hitDamageTag) continue;
    if (eff.targetTag && !targetHasTag(ctx.targetDebuffs, eff.targetTag)) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnCrit') continue;
    if (eff.targetTag && !targetHasTag(ctx.targetDebuffs, eff.targetTag)) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnKill(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnKill') continue;
    if (eff.tag && eff.tag !== ctx.hitDamageTag) continue;
    if (eff.targetTag && !targetHasTag(ctx.targetDebuffs, eff.targetTag)) continue;
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

/** Fires when one of the player's minions hits an enemy.
 *  Phase F F2 (2026-05-06): caller passes `targetDebuffs` as the hit
 *  target's debuff list so apply-tag actions land on the correct enemy. */
export function dispatchProcOnMinionHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnMinionHit') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when one of the player's minions crits. */
export function dispatchProcOnMinionCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnMinionCrit') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when one of the player's minions dies. The dying minion's
 *  position is irrelevant for now — actions like grantBuff / refundMana
 *  apply to the player; applyTag/applyTagAll target enemies via ctx. */
export function dispatchProcOnMinionDeath(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnMinionDeath') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when one of the player's traps detonates. Phase F F3
 *  (2026-05-06): caller passes targetDebuffs as the detonation-impact
 *  enemy's debuff list so applyTag actions land correctly. */
export function dispatchProcOnTrapDetonate(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnTrapDetonate') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when a trap detonation chains into a nearby trap (multi-trap
 *  burst). For now the chain detection is approximate — fires once per
 *  detonation event when multiple traps were active beforehand. */
export function dispatchProcOnTrapChain(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnTrapChain') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when the player's companion (singleton minion with
 *  `type: 'companion'`) hits an enemy. Phase F F4 (2026-05-06):
 *  separate from generic procOnMinionHit so Hunter Beastmaster nodes
 *  can target companion-only behavior. */
export function dispatchProcOnCompanionHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnCompanionHit') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when the player's companion crits. */
export function dispatchProcOnCompanionCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnCompanionCrit') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

/** Fires when the player's companion dies. */
export function dispatchProcOnCompanionDeath(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnCompanionDeath') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
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

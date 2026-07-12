// ============================================================
// Effect IR — event dispatch interpreter (Phase 2 Wave 2, D10)
//
// ONE dispatchEvent(event, effects, ctx) replaces the 15 per-kind
// dispatchProcOn* bodies: effects are normalized (legacy kinds lower
// onto 'on' rules — see normalize.ts), matched against the runtime
// event, gated by their `if` Condition, chance-rolled, and executed.
// classTalentDispatcher.ts keeps the legacy exports as one-line shims
// so tick.ts / staff.ts / dagger.ts / talent-bot call sites compile
// unchanged.
//
// TalentProcContext, TALENT_BUFF_REGISTRY, rollAndFire and
// executeAction moved here verbatim from classTalentDispatcher.ts
// (which re-exports them). executeAction gains the five Wave 2
// actions: modifyState / dealDamage / dealSelfDamage / spreadDebuffs /
// advanceCooldowns (D8).
// ============================================================

import type {
  TalentEffect, TalentAction, TalentTag, DamageTag, Trigger,
  ActiveDebuff, SkillTimerState, TempBuff, AbilityEffect,
} from '../../types';
import { applyDebuffToList, mergeProcTempBuff } from '../combat/helpers';
import { SUMMON_CONFIGS, summonMinions, type MinionState } from '../combat/minions';
import { evalCondition, TALENT_TAG_TO_DEBUFF, type ConditionContext } from './conditions';
import { normalizeTalentEffect } from './normalize';

/** grantBuff TalentAction registry. Maps `buffId` → AbilityEffect +
 *  maxStacks. Keep small and player-facing — these are the talent-tree
 *  buffs visible in HUD pills. (Moved from classTalentDispatcher.) */
export const TALENT_BUFF_REGISTRY: Record<string, { effect: AbilityEffect; maxStacks: number }> = {
  // wd_sw_bone_armor — +20% damage reduction shield
  bone_armor:    { effect: { defenseMult: 1.2 }, maxStacks: 1 },
  // wd_sw_spirit_shield — next cast within window deals +50% damage
  // (approximated as duration-only)
  spirit_shield: { effect: { damageMult: 1.5 }, maxStacks: 1 },
  // hnt_mm_hunters_eye — guaranteed crit charge (crit-floor approximation)
  precision_charge: { effect: { critChanceBonus: 100 }, maxStacks: 1 },
  // brs_jg_ironclad — damage reduction on crit-taken
  ironclad_stance: { effect: { defenseMult: 1.3 }, maxStacks: 1 },
  // brs_jg_stalwart_spirit — Bulwark charges (consume handled by
  // consumeBulwarkCharge in classTalentDispatcher)
  bulwark_charge: { effect: { defenseMult: 1.2 }, maxStacks: 3 },
  // brs_jg_marked_slam legacy buff — unused since the bonusDamage
  // switch; kept to avoid breaking save state.
  cleave_strike: { effect: { damageMult: 2.0 }, maxStacks: 1 },
  // sor_ar_saturation_tempo — speed buff after Convergence cast
  saturation_tempo: { effect: { attackSpeedMult: 1.4 }, maxStacks: 1 },
  // wd_sw_death_mastery — Necro Stack: 5 × 1.06 = +30% at full stack
  necro_stack: { effect: { damageMult: 1.06 }, maxStacks: 5 },
};

export interface TalentProcContext {
  /** Target debuffs at proc time. New debuffs from this proc append here. */
  targetDebuffs: ActiveDebuff[];
  /** Current player life — handlers may mutate to apply heals. */
  life: { value: number; max: number };
  /** Source skill id for applyDebuffToList attribution. */
  sourceSkillId: string;
  /** Skill tag (from the hit that triggered) for procOnHit/Kill filters. */
  hitDamageTag?: DamageTag;
  /** All enemy debuff lists for `applyTagAll` broadcast. */
  broadcastDebuffLists?: ActiveDebuff[][];
  /** Live skill-timer array for `refundCooldown` to mutate cooldownUntil. */
  skillTimers?: SkillTimerState[];
  /** Player mana ref for `refundMana` (caller reads back into state). */
  mana?: { current: number; max: number };
  /** Crit Cascade ref for `addCritStack` / modifyState('crit_stack'). */
  critStacksRef?: { value: number; max: number; expiresAt: number };
  /** Resonance ref for `addResonanceCharge` / modifyState('resonance_charge'). */
  resonanceRef?: {
    charges: { fire: number; cold: number; lightning: number; chaos: number };
    expiresAt: number;
  };
  /** Mutable temp-buff list for `grantBuff` action. */
  tempBuffsRef?: TempBuff[];
  /** Bonus-damage accumulator for `bonusDamage` / `dealDamage`. */
  bonusDamageRef?: { value: number; baseDamage: number };
  /** Mutable minion list + summon parameters for `summon` action. */
  minionsRef?: {
    list: MinionState[];
    playerMaxLife: number;
    playerSpellPower: number;
    now: number;
  };
  /** Self-reference to all allocated talent effects for tagApplied
   *  cascades. `_inProcOnTag` guards direct recursion (1-deep). */
  effects?: TalentEffect[];
  _inProcOnTag?: boolean;
}

/** Runtime event instance — same shape as Trigger, plus cast metadata. */
export type TriggerEvent = Trigger & { skillTags?: readonly string[] };

/** Does an authored trigger match a runtime event? Filter fields left
 *  undefined on the TRIGGER are wildcards; sources default to 'self'
 *  ('minion' for minionEvent) so legacy kind-channels can't cross-fire. */
export function matchTrigger(t: Trigger, ev: TriggerEvent): boolean {
  if (t.on !== ev.on) return false;
  switch (t.on) {
    case 'hit':
    case 'crit': {
      const e = ev as Extract<TriggerEvent, { on: 'hit' | 'crit' }>;
      if ((t.source ?? 'self') !== (e.source ?? 'self')) return false;
      if (t.minionType !== undefined && t.minionType !== e.minionType) return false;
      return true;
    }
    case 'kill': {
      const e = ev as Extract<TriggerEvent, { on: 'kill' }>;
      if ((t.source ?? 'self') !== (e.source ?? 'self')) return false;
      if ((t.chained ?? false) !== (e.chained ?? false)) return false;
      return true;
    }
    case 'cast': {
      const e = ev as Extract<TriggerEvent, { on: 'cast' }>;
      if (t.skillId !== undefined && t.skillId !== e.skillId) return false;
      if (t.skillTag !== undefined && !(e.skillTags?.includes(t.skillTag))) return false;
      return true;
    }
    case 'hitTaken': {
      const e = ev as Extract<TriggerEvent, { on: 'hitTaken' }>;
      if (t.critTaken !== undefined && t.critTaken !== e.critTaken) return false;
      if (t.blocked !== undefined && t.blocked !== e.blocked) return false;
      return true;
    }
    case 'dotTick': {
      const e = ev as Extract<TriggerEvent, { on: 'dotTick' }>;
      if (t.debuffId !== undefined && t.debuffId !== e.debuffId) return false;
      if (t.crit !== undefined && t.crit !== e.crit) return false;
      return true;
    }
    case 'tagApplied': {
      const e = ev as Extract<TriggerEvent, { on: 'tagApplied' }>;
      return t.tag === undefined || t.tag === e.tag;
    }
    case 'stateChange': {
      const e = ev as Extract<TriggerEvent, { on: 'stateChange' }>;
      if (t.stateId !== e.stateId) return false;
      if (t.change !== e.change) return false;
      if (t.key !== undefined && t.key !== e.key) return false;
      return true;
    }
    case 'minionEvent': {
      const e = ev as Extract<TriggerEvent, { on: 'minionEvent' }>;
      if (t.event !== e.event) return false;
      // STRICT source channel (default 'minion') — legacy
      // procOnCompanionDeath and procOnMinionDeath were separate kind
      // channels; wildcarding source here would double-fire them.
      if ((t.source ?? 'minion') !== (e.source ?? 'minion')) return false;
      if (t.minionType !== undefined && t.minionType !== e.minionType) return false;
      return true;
    }
    case 'trapEvent': {
      const e = ev as Extract<TriggerEvent, { on: 'trapEvent' }>;
      return t.event === e.event;
    }
    case 'targetDeath': {
      const e = ev as Extract<TriggerEvent, { on: 'targetDeath' }>;
      return t.withState === undefined || t.withState === e.withState;
    }
    case 'dodge':
    case 'block':
    case 'lethalHit':
    case 'encounterStart':
      return true;
    case 'interval':
      // Schema-reserved (D32.9): no engine emits interval events in v1.
      return false;
  }
}

const NO_STATES: ReadonlySet<string> = new Set();

/** Build the Condition evaluation snapshot available at proc time.
 *  Fields the proc context can't know (targetHp, offhand, frenzied…)
 *  take neutral defaults — legacy-normalized rule conditions only use
 *  hitDamageTag + targetHasTag, which are exact. */
export function buildProcConditionCtx(ctx: TalentProcContext, ev: TriggerEvent): ConditionContext {
  const r = ctx.resonanceRef?.charges;
  return {
    targetDebuffs: ctx.targetDebuffs,
    selfHpFraction: ctx.life.max > 0 ? ctx.life.value / ctx.life.max : 1,
    targetHpFraction: 1,
    companionAlive: false,
    offhandAbsent: false,
    enemyCount: ctx.broadcastDebuffLists?.length ?? 0,
    minionCount: ctx.minionsRef ? ctx.minionsRef.list.filter(m => m.hp > 0).length : 0,
    stateCounts: {
      crit_stack: ctx.critStacksRef?.value ?? 0,
      resonance_charge: r ? r.fire + r.cold + r.lightning + r.chaos : 0,
    },
    activeStates: NO_STATES,
    hitDamageTag: ctx.hitDamageTag,
    manaPct: ctx.mana && ctx.mana.max > 0 ? (100 * ctx.mana.current) / ctx.mana.max : undefined,
    skillId: (ev as { skillId?: string }).skillId ?? ctx.sourceSkillId,
    skillTags: ev.skillTags,
  };
}

/** Roll chance and dispatch action. chance is 0-100 (not 0-1). */
export function rollAndFire(action: TalentAction, chance: number, ctx: TalentProcContext): void {
  if (Math.random() * 100 >= chance) return;
  executeAction(action, ctx);
}

/** THE dispatch entry point (D10): normalize → match → condition →
 *  chance → execute. Iterates effects in authored order, one roll per
 *  matching rule (legacy RNG-shape preserved). */
export function dispatchEvent(ev: TriggerEvent, effects: TalentEffect[], ctx: TalentProcContext): void {
  let condCtx: ConditionContext | null = null;
  for (const src of effects) {
    for (const eff of normalizeTalentEffect(src)) {
      if (eff.kind !== 'on') continue;
      const rule = eff.on;
      if (!matchTrigger(rule.trigger, ev)) continue;
      if (rule.if) {
        condCtx ??= buildProcConditionCtx(ctx, ev);
        if (!evalCondition(rule.if, condCtx)) continue;
      }
      const c = rule.chance;
      const chance = c === undefined ? 100 : Array.isArray(c) ? c[0] : c;
      if (Math.random() * 100 >= chance) continue;
      for (const action of rule.actions) executeAction(action, ctx);
    }
  }
}

export function executeAction(action: TalentAction, ctx: TalentProcContext): void {
  switch (action.kind) {
    case 'applyTag': {
      const did = TALENT_TAG_TO_DEBUFF[action.tag];
      if (!did) return;
      applyDebuffToList(ctx.targetDebuffs, did, action.stacks ?? 1, action.duration ?? 4, ctx.sourceSkillId);
      // Cascade tagApplied (1-deep, guarded).
      if (ctx.effects && !ctx._inProcOnTag) {
        ctx._inProcOnTag = true;
        dispatchEvent({ on: 'tagApplied', tag: action.tag }, ctx.effects, ctx);
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
      // Cascade once per broadcast (not per target).
      if (ctx.effects && !ctx._inProcOnTag) {
        ctx._inProcOnTag = true;
        dispatchEvent({ on: 'tagApplied', tag: action.tag }, ctx.effects, ctx);
        ctx._inProcOnTag = false;
      }
      break;
    }
    case 'healSelf':
      ctx.life.value = Math.min(ctx.life.max, ctx.life.value + action.amount);
      break;
    case 'refundCooldown': {
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
    case 'addCritStack':
      // Deprecated alias of modifyState('crit_stack','add') — D8.
      executeAction({ kind: 'modifyState', stateId: 'crit_stack', op: 'add', amount: action.amount }, ctx);
      break;
    case 'addResonanceCharge':
      executeAction({ kind: 'modifyState', stateId: 'resonance_charge', op: 'add', amount: action.amount, key: action.element }, ctx);
      break;
    case 'modifyState': {
      // Wave 2: 'crit_stack' and 'resonance_charge' back onto the
      // existing refs (exact legacy semantics). Other stateIds no-op
      // until the generic StateInstance runtime lands (Wave 3).
      if (action.stateId === 'crit_stack') {
        const ref = ctx.critStacksRef;
        if (!ref) return;
        const amount = action.amount ?? 1;
        switch (action.op) {
          case 'add':
            ref.value = Math.min(ref.max, ref.value + amount);
            ref.expiresAt = Date.now() + 4000;
            break;
          case 'remove': case 'consume':
            ref.value = Math.max(0, ref.value - amount);
            break;
          case 'clear':
            ref.value = 0;
            break;
          case 'extend':
            ref.expiresAt += (action.seconds ?? 0) * 1000;
            break;
        }
        return;
      }
      if (action.stateId === 'resonance_charge') {
        const ref = ctx.resonanceRef;
        if (!ref) return;
        const amount = action.amount ?? 1;
        const charges = ref.charges;
        const order: Array<'fire' | 'cold' | 'lightning' | 'chaos'> = ['fire', 'cold', 'lightning', 'chaos'];
        switch (action.op) {
          case 'add': {
            // Resolve element: explicit key > first missing > no-op if full.
            let el = (action.key as 'fire' | 'cold' | 'lightning' | 'chaos' | undefined) ?? null;
            if (!el) el = order.find(k => charges[k] < 5) ?? null;
            if (!el) return;
            charges[el] = Math.min(5, charges[el] + amount);
            ref.expiresAt = Date.now() + 6000;
            break;
          }
          case 'remove': case 'consume': {
            const el = (action.key as 'fire' | 'cold' | 'lightning' | 'chaos' | undefined)
              ?? order.find(k => charges[k] > 0);
            if (!el) return;
            charges[el] = Math.max(0, charges[el] - amount);
            break;
          }
          case 'clear':
            for (const k of order) charges[k] = 0;
            break;
          case 'extend':
            ref.expiresAt += (action.seconds ?? 0) * 1000;
            break;
        }
        return;
      }
      return; // unknown stateId — Wave 3 wires the generic registry
    }
    case 'grantBuff': {
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
      const merged = mergeProcTempBuff(ctx.tempBuffsRef, buff);
      ctx.tempBuffsRef.length = 0;
      ctx.tempBuffsRef.push(...merged);
      break;
    }
    case 'bonusDamage': {
      if (!ctx.bonusDamageRef) break;
      ctx.bonusDamageRef.value += (action.percent / 100) * ctx.bonusDamageRef.baseDamage;
      break;
    }
    case 'dealDamage': {
      // Wave 2: accumulates into the same bonus-damage channel the
      // caller applies to the triggering target. `aoe` and `element`
      // routing land with the damage-pipeline slice (D6 slice B/C).
      if (!ctx.bonusDamageRef) break;
      if (action.percentOfTrigger) {
        ctx.bonusDamageRef.value += (action.percentOfTrigger / 100) * ctx.bonusDamageRef.baseDamage;
      }
      if (action.flat) ctx.bonusDamageRef.value += action.flat;
      break;
    }
    case 'dealSelfDamage': {
      // Blood-magic style cost. Clamped to leave 1 HP — a proc can
      // never self-execute the player.
      const dmg = ctx.life.value * (action.percentOfCurrentLife / 100);
      ctx.life.value = Math.max(1, ctx.life.value - dmg);
      break;
    }
    case 'spreadDebuffs': {
      const lists = ctx.broadcastDebuffLists;
      if (!lists) return;
      const wanted = action.debuffIds;
      const source = wanted
        ? ctx.targetDebuffs.filter(d => wanted.includes(d.debuffId))
        : ctx.targetDebuffs;
      if (source.length === 0) return;
      // Spread to up to maxTargets OTHER lists (skip the source list
      // identity). Duration approximated at 4s (ActiveDebuff carries an
      // absolute expiry, not a remaining-duration we can copy exactly).
      let spread = 0;
      for (const list of lists) {
        if (list === ctx.targetDebuffs) continue;
        if (spread >= action.maxTargets) break;
        for (const d of source) {
          applyDebuffToList(list, d.debuffId, d.stacks, 4, ctx.sourceSkillId);
        }
        spread++;
      }
      break;
    }
    case 'advanceCooldowns': {
      const timers = ctx.skillTimers;
      if (!timers) return;
      const now = Date.now();
      const ms = action.seconds * 1000;
      const advance = (t: SkillTimerState): void => {
        if (t.cooldownUntil === null || t.cooldownUntil <= now) return;
        t.cooldownUntil = Math.max(now, t.cooldownUntil - ms);
      };
      if (action.scope === 'all') {
        for (const t of timers) advance(t);
      } else if (action.scope === 'skillId') {
        const t = timers.find(x => x.skillId === action.skillId);
        if (t) advance(t);
      } else {
        // 'lowest': the skill closest to coming off cooldown.
        let best: SkillTimerState | null = null;
        for (const t of timers) {
          if (t.cooldownUntil === null || t.cooldownUntil <= now) continue;
          if (!best || t.cooldownUntil < best.cooldownUntil!) best = t;
        }
        if (best) advance(best);
      }
      break;
    }
    case 'summon': {
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
      // Minimal viable: refunds the NAMED skill's cooldown (distinct
      // from refundCooldown which targets the proc's source skill).
      const timers = ctx.skillTimers;
      if (!timers) return;
      const timer = timers.find(t => t.skillId === action.skillId);
      if (!timer || timer.cooldownUntil === null) return;
      timer.cooldownUntil = Date.now();
      break;
    }
  }
}

// Re-exported so authoring helpers can express "which tag is this
// debuff" questions next to the IR.
export type { TalentTag };

// ============================================================
// Gambit Rotation Policy evaluator (Effect IR Wave 5, D18-D19)
//
// evaluatePolicy is the ONE skill-selection path: tick.ts feeds it
// state.rotationPolicy ?? slotOrderPolicy(bar), and the legacy
// getNextRotationSkill (engine/skills/rotation.ts) is a shim over
// evaluatePolicy(slotOrderPolicy(...)) so all legacy callers keep
// byte-identical behavior.
//
// A castSkill rule fires only if it passes the SAME gates in the SAME
// order as the legacy selector (rotation.ts:119-140): equipped →
// active-kind → cooldown (skillTimers) → execute-lock → canAffordManaCost
// — preserving the approve-here/reject-there invariant with tick.ts's
// mana gate — plus the rule's optional minMana floor.
// ============================================================

import type {
  EquippedSkill, SkillDef, SkillProgress, SkillTimerState, GameState, CombatPhase,
} from '../../types';
import type { RotationPolicy, RotationRule } from '../../types/rotation';
import { evalCondition, type ConditionContext } from './conditions';
import { getUnifiedSkillDef } from '../../data/skills';
import { getSkillGraphModifier } from '../skills/resolution';
import { canAffordManaCost } from '../combat/manaTick';

export interface RotationSnapshot {
  skillBar: (EquippedSkill | null)[];
  skillTimers: SkillTimerState[];
  now: number;
  skillProgress?: Record<string, SkillProgress>;
  targetHpPercent?: number;
  mana?: { current: number; max: number; regenPerSec: number };
  dtSec?: number;
  /** Condition context for `when` clauses. Slot-order policies have
   *  when=null everywhere, so the legacy shim passes NEUTRAL_COND. */
  cond: ConditionContext;
}

export interface RotationDecision {
  skill: SkillDef;
  slotIndex: number;
  ruleId: string;
  /** True when an autoAttackOnly/idle rule matched — the caller should
   *  NOT fall through to default-skill logic. */
  intentionalHold?: boolean;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/** Neutral condition context — used by the legacy shim where no
 *  when-clauses can exist. All positive leaves evaluate false. */
export const NEUTRAL_COND: ConditionContext = {
  targetDebuffs: [],
  selfHpFraction: 1,
  targetHpFraction: 1,
  companionAlive: false,
  offhandAbsent: false,
  enemyCount: 0,
  minionCount: 0,
  stateCounts: {},
  activeStates: EMPTY_SET,
};

/** The implicit default policy: slots 0→N in priority order, no
 *  conditions — reproduces legacy getNextRotationSkill exactly. */
export function slotOrderPolicy(skillBar: (EquippedSkill | null)[]): RotationPolicy {
  const rules: RotationRule[] = [];
  skillBar.forEach((eq, i) => {
    if (!eq) return;
    rules.push({
      id: `slot_${i}`,
      enabled: true,
      when: null,
      action: { kind: 'castSkill', skillId: eq.skillId },
    });
  });
  return { version: 1, rules };
}

/** First-match-wins policy evaluation. Returns the chosen skill, or
 *  null when nothing fires (all gated) — including an intentional
 *  hold when an autoAttackOnly/idle rule matches. */
export function evaluatePolicy(policy: RotationPolicy, snap: RotationSnapshot): RotationDecision | null {
  for (const rule of policy.rules) {
    if (!rule.enabled) continue;
    if (rule.when && !evalCondition(rule.when, snap.cond)) continue;
    const action = rule.action;
    if (action.kind === 'autoAttackOnly' || action.kind === 'idle') {
      // Matched hold rule: intentionally cast nothing this tick.
      return null;
    }
    // castSkill — legacy gate order preserved exactly.
    const slotIndex = snap.skillBar.findIndex(eq => eq?.skillId === action.skillId);
    if (slotIndex < 0) continue;
    const skill = getUnifiedSkillDef(action.skillId);
    if (!skill || skill.kind !== 'active') continue;
    const timer = snap.skillTimers.find(t => t.skillId === action.skillId);
    if (timer && timer.cooldownUntil != null && snap.now < timer.cooldownUntil) continue;
    if (snap.skillProgress && snap.targetHpPercent !== undefined) {
      const graphMod = getSkillGraphModifier(skill, snap.skillProgress[action.skillId]);
      if (graphMod?.executeOnly && snap.targetHpPercent > graphMod.executeOnly.hpThreshold) continue;
    }
    if (snap.mana && snap.dtSec !== undefined) {
      const cost = (skill as { manaCost?: number }).manaCost ?? 0;
      if (!canAffordManaCost(snap.mana, snap.dtSec, cost)) continue;
      if (action.minMana !== undefined && snap.mana.current < action.minMana) continue;
    }
    return { skill, slotIndex, ruleId: rule.id };
  }
  return null;
}

/** Build the rotation-time ConditionContext from live GameState.
 *  Exposes ALL combo-state stacks generically (soul_stack, frenzy,
 *  shadow_mark…) plus crit/resonance scalars — gambits can gate on any
 *  registered state without per-state plumbing. */
export function buildRotationCond(
  state: GameState,
  phase: CombatPhase,
  targetHpPct: number,
  maxLife: number,
  now: number,
): ConditionContext {
  const targetDebuffs = phase === 'boss_fight'
    ? state.activeDebuffs
    : (state.packMobs[0]?.debuffs ?? []);
  const stateCounts: Record<string, number> = {
    crit_stack: state.critStacks,
    resonance_charge: state.resonanceCharges.fire + state.resonanceCharges.cold
      + state.resonanceCharges.lightning + state.resonanceCharges.chaos,
  };
  for (const cs of state.comboStates) {
    stateCounts[cs.stateId] = (stateCounts[cs.stateId] ?? 0) + cs.stacks;
  }
  const readySkillIds = new Set<string>();
  for (const eq of state.skillBar ?? []) {
    if (!eq) continue;
    const timer = state.skillTimers.find(t => t.skillId === eq.skillId);
    if (!timer || timer.cooldownUntil == null || now >= timer.cooldownUntil) {
      readySkillIds.add(eq.skillId);
    }
  }
  return {
    targetDebuffs,
    selfHpFraction: maxLife > 0 ? state.currentHp / maxLife : 1,
    targetHpFraction: targetHpPct / 100,
    companionAlive: (state.activeMinions ?? []).some(m => m.type === 'companion' && m.hp > 0),
    offhandAbsent: !state.character.equipment.offhand,
    enemyCount: phase === 'boss_fight' ? 1 : state.packMobs.length,
    minionCount: (state.activeMinions ?? []).filter(m => m.hp > 0).length,
    stateCounts,
    activeStates: state.frenziedActive ? new Set(['frenzied']) : EMPTY_SET,
    manaPct: state.character.mana.max > 0
      ? (100 * state.character.mana.current) / state.character.mana.max
      : undefined,
    weaponType: state.character.equipment.mainhand?.weaponType,
    readySkillIds,
    activeBuffIds: new Set(state.tempBuffs.map(b => b.id)),
    inBossFight: phase === 'boss_fight',
  };
}

// ============================================================
// Gambit Rotation Policy types (Effect IR Wave 5, EFFECT_IR_DESIGN.md D18)
//
// A RotationPolicy is the player-programmable replacement for
// slot-order skill selection: an ordered list of rules, first match
// wins. `when` clauses use the SAME Condition grammar as talent
// conditionals and EffectRule.if — one predicate language everywhere.
// Slot order remains the implicit default policy (slotOrderPolicy),
// so a player who never opens the panel gets exactly today's behavior.
// ============================================================

import type { Condition } from './conditions';

export type RotationAction =
  /** Cast this skill if it passes the standard gates (equipped →
   *  cooldown → execute-lock → mana), plus an optional mana floor
   *  (bank-and-burst builds). */
  | { kind: 'castSkill'; skillId: string; minMana?: number }
  /** Intentionally cast nothing this tick — let auto-attacks run
   *  (mana banking / Berserker event-economy builds). */
  | { kind: 'autoAttackOnly' }
  /** Cast nothing, full stop. */
  | { kind: 'idle' };

export interface RotationRule {
  id: string;
  enabled: boolean;
  /** null = always applies. */
  when: Condition | null;
  action: RotationAction;
}

export interface RotationPolicy {
  version: 1;
  rules: RotationRule[];
}

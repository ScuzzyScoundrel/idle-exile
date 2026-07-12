// ============================================================
// TRAP_DEFS Registry (Effect IR Wave 4, EFFECT_IR_DESIGN.md D16)
//
// Data definitions for trap-placing skills. The dataDriven weapon
// module (src/engine/combat/weapons/dataDriven.ts) places a TrapState
// when a skill with a TrapDef is cast, and executes `onDetonate`
// actions through the standard executeAction pipeline when an armed
// trap detonates — so trap payloads (Snare, Mark, charges…) are
// authored here, not in engine code. Arm/expire flow stays in
// src/engine/combat/traps.ts.
//
// (Deviation from D27's sketch, documented: skills reference traps by
// TRAP_DEFS_BY_SKILL keyed on the placing skill id rather than a new
// placeTrap TalentAction — placement can only happen inside a weapon
// module hook anyway, and this keeps the TalentAction union closed.)
// ============================================================

import type { TalentAction } from '../types';

export interface TrapDef {
  id: string;
  /** The skill whose cast places this trap. */
  skillId: string;
  name: string;
  blurb: string;
  /** Seconds after placement before the trap can detonate. */
  armDelaySec: number;
  /** Trap lifetime in seconds (expires unarmed-or-not). */
  durationSec: number;
  /** Detonation damage = placement roll damage × this. */
  damageMult: number;
  /** Placement requires the placing cast to hit (dagger parity). */
  requiresHit: boolean;
  /** Actions executed on detonation via executeAction — targetDebuffs
   *  = the enemy that sprang the trap; broadcast refs reach the pack. */
  onDetonate: TalentAction[];
}

export const TRAP_DEFS: Record<string, TrapDef> = {
  bear_trap: {
    id: 'bear_trap',
    skillId: 'bow_bear_trap',
    name: 'Bear Trap',
    blurb: 'Springs on the first enemy attack once armed: physical damage + Snared.',
    armDelaySec: 1.0,
    durationSec: 6,          // "armed 6s" per the skill prose
    damageMult: 1.0,
    requiresHit: true,
    onDetonate: [
      { kind: 'applyTag', tag: 'snare', stacks: 1, duration: 3 },
    ],
  },
};

/** Trap def placed by a given skill, if any. */
export const TRAP_DEFS_BY_SKILL: Record<string, TrapDef> = Object.fromEntries(
  Object.values(TRAP_DEFS).map(t => [t.skillId, t]),
);

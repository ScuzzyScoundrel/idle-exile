// ============================================================
// Combat Tick Types — shared output types for combat subsystems
// Extracted from combat/tick.ts (Phase D1)
// ============================================================

import type { GameState, CombatTickResult } from '../../types';

/** Output of a combat tick — a state patch + a result summary. */
export interface CombatTickOutput {
  patch: Partial<GameState>;
  result: CombatTickResult;
}

/** Default empty result (no skill fired, no kills). */
export const noResult: CombatTickResult = {
  mobKills: 0,
  skillFired: false,
  damageDealt: 0,
  skillId: null,
  isCrit: false,
  isHit: false,
};

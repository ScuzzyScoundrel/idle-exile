// ============================================================
// Effect IR — shared Condition grammar (Phase 2 Wave 1, D4)
// ONE predicate language consumed by three surfaces:
//   1. talent conditional modifiers (while*/per* kinds normalize onto it)
//   2. EffectRule.if (Wave 2 'on' kind)
//   3. gambit RotationRule.when (Wave 5)
// Evaluated by evalCondition (src/engine/ir/conditions.ts) — pure, total,
// no RNG. Positive leaves evaluate false when the context lacks the data
// they need; `not` inverts that result (documented totality rule).
// ============================================================

import type { TalentTag, DamageTag } from './skills';
import type { WeaponType } from './items';

export type Condition =
  // ── Combinators (in evaluator from day one — normalization needs `all`;
  //    the gambit editor UI limits depth separately, per D22/D39) ──
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  // ── Target debuff/tag predicates (resolve through TALENT_TAG_TO_DEBUFF
  //    so talent and gambit tag semantics can never disagree) ──
  | { targetHasTag: TalentTag }
  | { targetLacksTag: TalentTag }
  | { targetHasState: { stateId: string; minStacks?: number } }
  // ── Generic state predicates ('crit_stack', 'resonance_charge',
  //    'frenzied', ... — StateDef ids; Wave 3 backs these with real
  //    StateInstances, Wave 1 backs them with ctx.stateCounts) ──
  | { stateActive: string }
  | { stateMissing: string }
  | { stateCountAtLeast: { stateId: string; count: number; key?: string; side?: 'self' | 'target' } }
  | { stateCountBelow: { stateId: string; count: number; key?: string; side?: 'self' | 'target' } }
  // ── HP / resource gates ──
  | { selfHpBelow: number }        // fraction 0-1, strict <  (matches whileSelfHpBelow)
  | { selfHpAbove: number }        // fraction 0-1, >=        (matches whileSelfHpAbove)
  | { targetHpBelow: number }      // fraction 0-1, strict <
  | { targetHpAbove: number }      // fraction 0-1, >=
  | { manaPctAtLeast: number }     // 0-100
  | { manaPctBelow: number }       // 0-100
  // ── Encounter shape ──
  | { enemyCountAtLeast: number }
  | { minionCountAtLeast: { count: number; minionType?: string } }
  | { companionAlive: true }
  | { inBossFight: true }
  // ── Loadout / cast context ──
  | { offhandAbsent: true }
  | { weaponType: WeaponType }
  | { skillHasTag: DamageTag }
  | { hitDamageTag: DamageTag }
  | { skillIdIs: string }
  | { skillReady: string }         // skillId off cooldown (gambit surface)
  | { buffActive: string }         // tempBuff id
  | { buffMissing: string }
  // ── Precision-payoff family: state applied by a DIFFERENT skill than
  //    the one currently resolving ──
  | { appliedByDifferentSkill: { stateId: string } };

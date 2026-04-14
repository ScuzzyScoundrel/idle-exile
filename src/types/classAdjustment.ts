// ============================================================
// ClassSkillAdjustment — per-(class, skill) morph table
// ============================================================
//
// Design reference: docs/design/CLASS_SYSTEM_PLAN.md §Core Decision 1
//
// Each entry morphs a skill for one or more classes: changes its damage
// type, flavor name, cast/mana feel. The ADJUSTMENT IS APPLIED BEFORE
// TALENT TREE RESOLUTION, so the tree operates on the morphed base.
//
// Sparse table — only (class, skill) combinations with authored morphs
// appear. Unlisted combinations fall through to the raw skill definition.
//
// `classIds` is a LIST, not a single class, to enable multiclass merge
// (Phase 5) without schema change. Today a morph usually belongs to one
// class, but the shape is future-compatible.

import type { CharacterClass } from './character';
import type { DamageType } from './skills';

export interface ClassSkillAdjustment {
  /** Skill that this adjustment morphs (e.g. 'staff_locust'). */
  skillId: string;
  /** Classes that receive this morph. Usually a single-element array. */
  classIds: CharacterClass[];

  // ── Morph axes (all optional) ───────────────────────────────────────

  /** Override the skill's default damage type (chaos → physical, etc.). */
  damageTypeOverride?: DamageType;
  /** Player-facing renamed skill (e.g. Locust Swarm → Whirling Razors). */
  flavorName?: string;
  /** Sprite/VFX override key, resolved by the renderer. */
  visualOverride?: string;
  /** Multiplier on baseline cast time (0.5 = twice as fast). */
  castTimeMult?: number;
  /** Multiplier on baseline mana cost. */
  manaCostMult?: number;

  // Phase 3a may extend with secondaryProc, scalingWeightOverride, etc.
  // Keep additions backward-compatible (all optional).
}

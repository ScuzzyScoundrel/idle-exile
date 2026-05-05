// ============================================================
// Skill Resolution — formula evaluation, effect resolution
// Per-skill talent trees retired 2026-05-04 (Phase 2 cleanup) —
// resolveAbilityEffect / resolveSkillEffect simplified to base effect only.
// Class talent → modifier resolution lands in Phase D.
// ============================================================

import type {
  SkillDef, SkillProgress, EquippedAbility,
  AbilityEffect, AbilityProgress, AbilityDef,
  ResolvedStats, ScalingFormula,
} from '../../types';
import { getAbilityDef } from '../../data/skills';
import type { ResolvedSkillModifier } from '../skillGraph';
export type { ResolvedSkillModifier } from '../skillGraph';

/**
 * Merge two AbilityEffects together.
 * Multiplicative fields multiply, additive fields sum, booleans OR.
 */
export function mergeEffect(target: AbilityEffect, source: AbilityEffect): AbilityEffect {
  return {
    damageMult: (target.damageMult ?? 1) * (source.damageMult ?? 1),
    attackSpeedMult: (target.attackSpeedMult ?? 1) * (source.attackSpeedMult ?? 1),
    defenseMult: (target.defenseMult ?? 1) * (source.defenseMult ?? 1),
    clearSpeedMult: (target.clearSpeedMult ?? 1) * (source.clearSpeedMult ?? 1),
    critChanceBonus: (target.critChanceBonus ?? 0) + (source.critChanceBonus ?? 0),
    critMultiplierBonus: (target.critMultiplierBonus ?? 0) + (source.critMultiplierBonus ?? 0),
    xpMult: (target.xpMult ?? 1) * (source.xpMult ?? 1),
    itemDropMult: (target.itemDropMult ?? 1) * (source.itemDropMult ?? 1),
    materialDropMult: (target.materialDropMult ?? 1) * (source.materialDropMult ?? 1),
    resistBonus: (target.resistBonus ?? 0) + (source.resistBonus ?? 0),
    ignoreHazards: (target.ignoreHazards ?? false) || (source.ignoreHazards ?? false),
    doubleClears: (target.doubleClears ?? false) || (source.doubleClears ?? false),
  };
}

/** An empty/identity effect — multipliers at 1.0, bonuses at 0. */
export const EMPTY_EFFECT: AbilityEffect = {};

/** Evaluate a ScalingFormula against character stats. */
export function evaluateFormula(formula: ScalingFormula, stats: ResolvedStats): number {
  let result = formula.base;
  if (formula.scaling) {
    for (const term of formula.scaling) {
      result += Math.floor(stats[term.stat] / term.divisor);
    }
  }
  return Math.max(0, result);
}

/**
 * Resolve the final effect for an ability.
 * Per-skill talent trees retired — returns the base effect directly.
 */
export function resolveAbilityEffect(
  def: AbilityDef,
  _progress: AbilityProgress | undefined,
): AbilityEffect {
  return { ...def.effect };
}

/**
 * Legacy: resolve effect using old mutator system (for backwards compat during migration).
 */
export function resolveAbilityEffectLegacy(equipped: EquippedAbility): AbilityEffect {
  const def = getAbilityDef(equipped.abilityId);
  if (!def) return EMPTY_EFFECT;

  if (!equipped.selectedMutatorId || !def.mutators) {
    return { ...def.effect };
  }

  const mutator = def.mutators.find(m => m.id === equipped.selectedMutatorId);
  if (!mutator) return { ...def.effect };

  return { ...def.effect, ...mutator.effectOverride };
}

/**
 * Get the resolved graph modifier for a skill.
 * Phase 2 cleanup: per-skill graphs retired; always returns null. Phase D
 * will rewire this to resolve class-talent modifiers from `src/data/classTrees/`.
 */
export function getSkillGraphModifier(
  _skill: SkillDef,
  _progress: SkillProgress | undefined,
): ResolvedSkillModifier | null {
  return null;
}

/**
 * Resolve the final AbilityEffect for a non-active skill (buff/passive/etc.).
 * Per-skill talent trees retired — returns the base effect directly.
 * Returns empty effect for active skills.
 */
export function resolveSkillEffect(
  skill: SkillDef,
  _progress: SkillProgress | undefined,
): AbilityEffect {
  if (skill.kind === 'active') return {};
  return { ...skill.effect };
}

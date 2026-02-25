// ============================================================
// Idle Exile — Ability Engine
// Pure TS functions: resolve effects, aggregate, timers, compatibility.
// No React, no side effects.
// ============================================================

import type { AbilityEffect, EquippedAbility, AbilityTimerState, WeaponType } from '../types';
import { getAbilityDef } from '../data/abilities';

/** An empty/identity effect — multipliers at 1.0, bonuses at 0. */
const EMPTY_EFFECT: AbilityEffect = {};

/**
 * Resolve the final effect for an equipped ability (base + selected mutator).
 */
export function resolveAbilityEffect(equipped: EquippedAbility): AbilityEffect {
  const def = getAbilityDef(equipped.abilityId);
  if (!def) return EMPTY_EFFECT;

  if (!equipped.selectedMutatorId) {
    return { ...def.effect };
  }

  const mutator = def.mutators.find(m => m.id === equipped.selectedMutatorId);
  if (!mutator) return { ...def.effect };

  // Merge: mutator effectOverride fields replace base fields
  return { ...def.effect, ...mutator.effectOverride };
}

/**
 * Get the effective duration (base + mutator bonus) in seconds.
 */
export function getEffectiveDuration(equipped: EquippedAbility): number {
  const def = getAbilityDef(equipped.abilityId);
  if (!def || !def.duration) return 0;

  let bonus = 0;
  if (equipped.selectedMutatorId) {
    const mutator = def.mutators.find(m => m.id === equipped.selectedMutatorId);
    if (mutator?.durationBonus) bonus = mutator.durationBonus;
  }
  return def.duration + bonus;
}

/**
 * Check if an ability's buff is currently active.
 */
export function isAbilityActive(timer: AbilityTimerState, equipped: EquippedAbility, now: number): boolean {
  if (!timer.activatedAt) return false;
  const duration = getEffectiveDuration(equipped);
  return now < timer.activatedAt + duration * 1000;
}

/**
 * Check if an ability is currently on cooldown.
 */
export function isAbilityOnCooldown(timer: AbilityTimerState, now: number): boolean {
  if (!timer.cooldownUntil) return false;
  return now < timer.cooldownUntil;
}

/**
 * Get remaining cooldown in seconds (0 if ready).
 */
export function getRemainingCooldown(timer: AbilityTimerState, now: number): number {
  if (!timer.cooldownUntil) return 0;
  return Math.max(0, (timer.cooldownUntil - now) / 1000);
}

/**
 * Get remaining buff duration in seconds (0 if inactive).
 */
export function getRemainingBuff(timer: AbilityTimerState, equipped: EquippedAbility, now: number): number {
  if (!timer.activatedAt) return 0;
  const duration = getEffectiveDuration(equipped);
  return Math.max(0, (timer.activatedAt + duration * 1000 - now) / 1000);
}

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
    critDamageBonus: (target.critDamageBonus ?? 0) + (source.critDamageBonus ?? 0),
    xpMult: (target.xpMult ?? 1) * (source.xpMult ?? 1),
    itemDropMult: (target.itemDropMult ?? 1) * (source.itemDropMult ?? 1),
    materialDropMult: (target.materialDropMult ?? 1) * (source.materialDropMult ?? 1),
    resistBonus: (target.resistBonus ?? 0) + (source.resistBonus ?? 0),
    ignoreHazards: (target.ignoreHazards ?? false) || (source.ignoreHazards ?? false),
    doubleClears: (target.doubleClears ?? false) || (source.doubleClears ?? false),
  };
}

/**
 * Aggregate all equipped ability effects into a single AbilityEffect.
 * In offlineMode, only passive abilities are included (active buffs skipped).
 */
export function aggregateAbilityEffects(
  equippedAbilities: (EquippedAbility | null)[],
  timers: AbilityTimerState[],
  now: number,
  offlineMode: boolean,
): AbilityEffect {
  let result: AbilityEffect = {};

  for (const equipped of equippedAbilities) {
    if (!equipped) continue;
    const def = getAbilityDef(equipped.abilityId);
    if (!def) continue;

    if (def.kind === 'passive') {
      // Passives always contribute
      const effect = resolveAbilityEffect(equipped);
      result = mergeEffect(result, effect);
    } else if (!offlineMode) {
      // Active abilities contribute only if buff is active (and not offline)
      const timer = timers.find(t => t.abilityId === equipped.abilityId);
      if (timer && isAbilityActive(timer, equipped, now)) {
        const effect = resolveAbilityEffect(equipped);
        result = mergeEffect(result, effect);
      }
    }
  }

  return result;
}

/**
 * Get list of ability IDs that are incompatible with the given weapon type.
 * An ability is incompatible if its weaponType doesn't match.
 */
export function getIncompatibleAbilities(
  equippedAbilities: (EquippedAbility | null)[],
  weaponType: WeaponType | null,
): string[] {
  if (!weaponType) return [];
  const incompatible: string[] = [];
  for (const equipped of equippedAbilities) {
    if (!equipped) continue;
    const def = getAbilityDef(equipped.abilityId);
    if (def && def.weaponType !== weaponType) {
      incompatible.push(equipped.abilityId);
    }
  }
  return incompatible;
}

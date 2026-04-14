// ============================================================
// Idle Exile — Class Resource Engine (NEUTRALIZED in Phase 2g)
// ============================================================
//
// All mechanical effects of the legacy per-class resource system
// (rage / arcane_charges / tracking / momentum) have been neutralized.
// Every function here is a no-op that preserves the existing API shape
// so consumers compile without modification. `stacks` stays at 0 forever.
//
// The system is being replaced by:
//   - Attributes (Str/Dex/Int/Spirit) for character power scaling
//   - Universal Mana (class-flavored regen) for ability-cost gating
// See docs/design/CLASS_SYSTEM_PLAN.md §Mana + §Attributes.
//
// Phase 6 deletes this file entirely once the universal Mana system
// drives combat. For now it remains as a compatibility shim.

import type { ClassDef, ClassResourceState, CharacterClass } from '../types';
import { getClassDef } from '../data/classes';

/** Create initial resource state for a class. (Still needed for state shape.) */
export function createResourceState(classId: CharacterClass): ClassResourceState {
  const def = getClassDef(classId);
  return {
    type: def.resourceType,
    stacks: 0,
    lastZoneId: null,
  };
}

/** No-op — legacy resource generation disabled. */
export function tickResourceOnClear(
  state: ClassResourceState,
  _classDef: ClassDef,
  _currentZoneId: string,
): ClassResourceState {
  return state;
}

/** No-op — legacy resource decay disabled. */
export function tickResourceDecay(
  state: ClassResourceState,
  _classDef: ClassDef,
  _dtSeconds: number,
): ClassResourceState {
  return state;
}

export type ResourceResetEvent = 'zone_switch' | 'stop' | 'gear_swap';

/** No-op — legacy resource reset disabled. */
export function resetResourceOnEvent(
  state: ClassResourceState,
  _classDef: ClassDef,
  _event: ResourceResetEvent,
): ClassResourceState {
  return state;
}

/** Neutralized — returns 1.0 (no modifier). */
export function getClassClearSpeedModifier(
  _state: ClassResourceState,
  _classDef: ClassDef,
): number {
  return 1.0;
}

/** Neutralized — returns 1.0 (no modifier). */
export function getClassDamageModifier(
  _state: ClassResourceState,
  _classDef: ClassDef,
): number {
  return 1.0;
}

/** Neutralized — returns zeros. */
export function getClassLootModifier(
  _state: ClassResourceState,
  _classDef: ClassDef,
): { rareFindBonus: number; materialYieldBonus: number } {
  return { rareFindBonus: 0, materialYieldBonus: 0 };
}

/** Neutralized — returns 0. */
export function getClassAbilityHasteBonus(
  _state: ClassResourceState,
  _classDef: ClassDef,
): number {
  return 0;
}

/** Neutralized — returns null (no discharge). */
export function dischargeMageCharges(
  _state: ClassResourceState,
  _classDef: ClassDef,
): { bonusClears: number; newState: ClassResourceState } | null {
  return null;
}

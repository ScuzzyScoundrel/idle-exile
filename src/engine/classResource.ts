// ============================================================
// Idle Exile — Class Resource Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { ClassDef, ClassResourceState, CharacterClass } from '../types';
import { getClassDef } from '../data/classes';

/** Create initial resource state for a class. */
export function createResourceState(classId: CharacterClass): ClassResourceState {
  const def = getClassDef(classId);
  return {
    type: def.resourceType,
    stacks: 0,
    lastZoneId: null,
  };
}

/** Increment resource stacks on zone clear. Returns new state. */
export function tickResourceOnClear(
  state: ClassResourceState,
  classDef: ClassDef,
  currentZoneId: string,
): ClassResourceState {
  if (classDef.resourcePerClear <= 0) return state;

  // Ranger: only build in same zone
  if (classDef.resourceType === 'tracking') {
    if (state.lastZoneId !== null && state.lastZoneId !== currentZoneId) {
      // Zone changed since last clear — reset
      return { ...state, stacks: classDef.resourcePerClear, lastZoneId: currentZoneId };
    }
  }

  let newStacks = state.stacks + classDef.resourcePerClear;
  if (classDef.resourceMax !== null) {
    newStacks = Math.min(newStacks, classDef.resourceMax);
  }

  return { ...state, stacks: newStacks, lastZoneId: currentZoneId };
}

/** Apply time-based decay (Warrior rage). Returns new state. */
export function tickResourceDecay(
  state: ClassResourceState,
  classDef: ClassDef,
  dtSeconds: number,
): ClassResourceState {
  if (classDef.resourceDecayRate <= 0 || state.stacks <= 0) return state;

  const decayAmount = classDef.resourceDecayRate * dtSeconds;
  const newStacks = Math.max(0, state.stacks - decayAmount);
  return { ...state, stacks: newStacks };
}

export type ResourceResetEvent = 'zone_switch' | 'stop' | 'gear_swap';

/** Reset resource on specific events. Returns new state. */
export function resetResourceOnEvent(
  state: ClassResourceState,
  classDef: ClassDef,
  event: ResourceResetEvent,
): ClassResourceState {
  let shouldReset = false;
  if (event === 'zone_switch' && classDef.resourceDecayOnZoneSwitch) shouldReset = true;
  if (event === 'stop' && classDef.resourceDecayOnStop) shouldReset = true;
  if (event === 'gear_swap' && classDef.resourceDecayOnGearSwap) shouldReset = true;

  if (!shouldReset) return state;
  return { ...state, stacks: 0, lastZoneId: null };
}

/**
 * Get clear speed multiplier from class resource.
 * - Warrior: +2% damage per rage stack → affects DPS, not clear speed directly
 * - Rogue: +1% clear speed per momentum stack
 * Returns a multiplier >= 1.0
 */
export function getClassClearSpeedModifier(
  state: ClassResourceState,
  classDef: ClassDef,
): number {
  if (classDef.resourceType === 'momentum') {
    // +1% per stack → clear time divides by (1 + stacks/100)
    return 1 + state.stacks / 100;
  }
  return 1.0;
}

/**
 * Get DPS multiplier from class resource.
 * - Warrior: +2% damage per rage stack (max +40% at 20 rage)
 * - Mage: +5% spell damage per charge (applied separately in DPS calc if needed)
 */
export function getClassDamageModifier(
  state: ClassResourceState,
  classDef: ClassDef,
): number {
  if (classDef.resourceType === 'rage') {
    return 1 + state.stacks * 0.02;
  }
  if (classDef.resourceType === 'arcane_charges') {
    return 1 + state.stacks * 0.05;
  }
  return 1.0;
}

/**
 * Get loot modifiers from class resource (Ranger tracking).
 * Returns bonus percentages (not multipliers).
 */
export function getClassLootModifier(
  state: ClassResourceState,
  classDef: ClassDef,
): { rareFindBonus: number; materialYieldBonus: number } {
  if (classDef.resourceType === 'tracking') {
    return {
      rareFindBonus: state.stacks * 0.005,       // +0.5% per stack
      materialYieldBonus: state.stacks * 0.003,   // +0.3% per stack
    };
  }
  return { rareFindBonus: 0, materialYieldBonus: 0 };
}

/**
 * Get ability haste bonus from Mage charges.
 * +3% ability haste per arcane charge.
 */
export function getClassAbilityHasteBonus(
  state: ClassResourceState,
  classDef: ClassDef,
): number {
  if (classDef.resourceType === 'arcane_charges') {
    return state.stacks * 3;
  }
  return 0;
}

/**
 * Mage discharge: when charges hit max, returns bonus clears and resets.
 * Returns { bonusClears, newState } or null if no discharge.
 */
export function dischargeMageCharges(
  state: ClassResourceState,
  classDef: ClassDef,
): { bonusClears: number; newState: ClassResourceState } | null {
  if (classDef.resourceType !== 'arcane_charges') return null;
  if (classDef.resourceMax === null) return null;
  if (state.stacks < classDef.resourceMax) return null;

  const bonusClears = Math.floor(state.stacks / 2);
  return {
    bonusClears,
    newState: { ...state, stacks: 0 },
  };
}

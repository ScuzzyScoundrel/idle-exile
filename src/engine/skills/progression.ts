// ============================================================
// Skill Progression — XP, leveling, ability bookkeeping
// Phase 2 cleanup 2026-05-04: tree allocation helpers removed
// (canAllocateNode/allocateNode/respecAbility/getRespecCost).
// Per-skill talent trees retired; class trees in src/data/classTrees/
// are the sole talent layer.
// ============================================================

import type {
  AbilityProgress, EquippedAbility, WeaponType,
} from '../../types';
import { ABILITY_SLOT_UNLOCKS } from '../../types';
import { getAbilityDef } from '../../data/skills';
import { SKILL_MAX_LEVEL } from '../../data/balance';

/**
 * Get list of ability IDs that are incompatible with the given weapon type.
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

/** Get number of unlocked ability slots for a character level. */
export function getUnlockedSlotCount(characterLevel: number): number {
  let count = 0;
  for (const unlockLevel of ABILITY_SLOT_UNLOCKS) {
    if (characterLevel >= unlockLevel) count++;
  }
  return count;
}

/** XP needed for next level: quadratic curve — 100 * (level + 1) * (1 + level * 0.1). */
export function getAbilityXpForLevel(level: number): number {
  return Math.round(100 * (level + 1) * (1 + level * 0.1));
}

/** Add XP and return updated progress (handles level-ups). */
export function addAbilityXp(progress: AbilityProgress, xpGained: number): AbilityProgress {
  if (progress.level >= SKILL_MAX_LEVEL) return progress;
  let { xp, level } = progress;
  xp += xpGained;

  while (level < SKILL_MAX_LEVEL) {
    const needed = getAbilityXpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
    } else {
      break;
    }
  }

  if (level >= SKILL_MAX_LEVEL) xp = 0;

  return { ...progress, xp, level };
}

/** Get XP gained per clear: 6 + floor(zoneBand * 2). */
export function getAbilityXpPerClear(zoneBand: number): number {
  return 6 + Math.floor(zoneBand * 2);
}

/** Create initial ability progress for a newly equipped ability. */
export function createAbilityProgress(abilityId: string): AbilityProgress {
  return {
    abilityId,
    xp: 0,
    level: 0,
  };
}

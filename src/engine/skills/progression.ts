// ============================================================
// Skill Progression — XP, leveling, tree allocation, respec
// Extracted from engine/unifiedSkills.ts (Phase B4)
// ============================================================

import type {
  AbilityProgress, AbilityDef, EquippedAbility, WeaponType,
} from '../../types';
import { ABILITY_SLOT_UNLOCKS } from '../../types';
import { getAbilityDef } from '../../data/skills';
import { SKILL_MAX_LEVEL } from '../../data/balance';
import { getAllTreeNodes } from './resolution';

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

/** Can a tree node be allocated? */
export function canAllocateNode(
  def: AbilityDef,
  progress: AbilityProgress,
  nodeId: string,
): boolean {
  if (!def.skillTree) return false;
  if (progress.allocatedNodes.includes(nodeId)) return false;

  const availablePoints = progress.level - progress.allocatedNodes.length;
  if (availablePoints <= 0) return false;

  const allNodes = getAllTreeNodes(def);
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return false;

  if (node.requiresNodeId && !progress.allocatedNodes.includes(node.requiresNodeId)) {
    return false;
  }

  return true;
}

/** Allocate a tree node (returns new progress). */
export function allocateNode(progress: AbilityProgress, nodeId: string): AbilityProgress {
  return {
    ...progress,
    allocatedNodes: [...progress.allocatedNodes, nodeId],
  };
}

/** Respec an ability (reset all nodes and XP to 0). */
export function respecAbility(progress: AbilityProgress): AbilityProgress {
  return {
    ...progress,
    xp: 0,
    level: 0,
    allocatedNodes: [],
  };
}

/** Get respec cost in gold: 50 * level^2. */
export function getRespecCost(progress: AbilityProgress): number {
  return 50 * progress.level * progress.level;
}

/** Create initial ability progress for a newly equipped ability. */
export function createAbilityProgress(abilityId: string): AbilityProgress {
  return {
    abilityId,
    xp: 0,
    level: 0,
    allocatedNodes: [],
  };
}

// ============================================================
// Class-Skill Adjustment resolver
// ============================================================
//
// Looks up morphs for a given (class, skill) pair. Empty registry until
// Phase 3a authors the morph content for Witchdoctor and Assassin.
//
// Consumers call `getClassSkillAdjustment(skillId, classId)` before
// talent tree resolution — the returned (or null) adjustment shapes the
// skill base, then trees apply on top.

import type { CharacterClass, ClassSkillAdjustment } from '../types';

/**
 * Registry of authored morphs. Populated in Phase 3a.
 * Keyed by skillId, each entry is a list of adjustments (one per class cell).
 */
export const CLASS_SKILL_ADJUSTMENTS: Record<string, ClassSkillAdjustment[]> = {
  // Example shape (NOT authored yet — remove this comment in Phase 3a when real entries land):
  //   staff_locust: [
  //     { skillId: 'staff_locust', classIds: ['witchdoctor'] },  // base flavor, no overrides
  //     { skillId: 'staff_locust', classIds: ['assassin'],
  //       damageTypeOverride: 'chaos', flavorName: 'Venomous Swarm' },
  //   ],
};

/**
 * Resolve the class morph for a skill+class pair. Returns null if no
 * authored adjustment exists (use raw skill definition in that case).
 */
export function getClassSkillAdjustment(
  skillId: string,
  classId: CharacterClass,
): ClassSkillAdjustment | null {
  const entries = CLASS_SKILL_ADJUSTMENTS[skillId];
  if (!entries) return null;
  for (const entry of entries) {
    if (entry.classIds.includes(classId)) return entry;
  }
  return null;
}

/**
 * Multiclass variant — returns ALL adjustments that apply to ANY of the
 * given class IDs. Phase 5 consumer will merge these using additive-math
 * / multiplicative-tag rules per the design plan.
 */
export function getClassSkillAdjustmentsForClasses(
  skillId: string,
  classIds: CharacterClass[],
): ClassSkillAdjustment[] {
  const entries = CLASS_SKILL_ADJUSTMENTS[skillId];
  if (!entries) return [];
  return entries.filter(e => e.classIds.some(c => classIds.includes(c)));
}

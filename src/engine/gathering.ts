// ============================================================
// Idle Exile — Gathering Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { GatheringSkills, GatheringProfession, GatheringMilestone, ZoneDef } from '../types';
import { GATHERING_MILESTONES, GATHERING_BAND_REQUIREMENTS } from '../data/gatheringProfessions';

/** XP curve for gathering professions. Similar shape to character XP. */
const GATHERING_XP_BASE = 50;
const GATHERING_XP_GROWTH = 1.35;

/** Calculate XP required to reach the next gathering level. */
export function calcGatheringXpRequired(level: number): number {
  return Math.round(GATHERING_XP_BASE * Math.pow(GATHERING_XP_GROWTH, level - 1));
}

/** Add gathering XP to a profession, handling level-ups. Returns new skills state. */
export function addGatheringXp(
  skills: GatheringSkills,
  profession: GatheringProfession,
  xp: number,
): GatheringSkills {
  const current = skills[profession];
  let newXp = current.xp + xp;
  let newLevel = current.level;

  while (newLevel < 100) {
    const needed = calcGatheringXpRequired(newLevel);
    if (newXp >= needed) {
      newXp -= needed;
      newLevel++;
    } else {
      break;
    }
  }

  return {
    ...skills,
    [profession]: { level: newLevel, xp: newXp },
  };
}

/**
 * Calculate gathering clear time for a zone.
 * Gathering is slower than combat but scales with skill level.
 * Formula: baseClearTime * 2 / (1 + skillLevel / 25) / (1 + gatherSpeedBonus / 100)
 */
export function calcGatherClearTime(skillLevel: number, zone: ZoneDef, gatherSpeedBonus: number = 0): number {
  const base = zone.baseClearTime * 2;
  return base / (1 + skillLevel / 25) / (1 + gatherSpeedBonus / 100);
}

/**
 * Calculate material yield multiplier based on gathering skill level.
 * Base yield is 1.0, increased by milestones.
 */
export function calcGatheringYield(skillLevel: number): number {
  let yield_mult = 1.0;
  for (const ms of getActiveGatheringMilestones(skillLevel)) {
    if (ms.type === 'yield_bonus') yield_mult += ms.value;
    if (ms.type === 'mastery') yield_mult += ms.value;
  }
  return yield_mult;
}

/** Get all milestones that are active at a given skill level. */
export function getActiveGatheringMilestones(level: number): GatheringMilestone[] {
  return GATHERING_MILESTONES.filter(m => level >= m.level);
}

/** Get the minimum skill level required for a zone band. */
export function getGatheringSkillRequirement(band: number): number {
  return GATHERING_BAND_REQUIREMENTS[band] ?? 1;
}

/** Check if a gathering skill level meets the requirement for a zone. */
export function canGatherInZone(skillLevel: number, zone: ZoneDef): boolean {
  return skillLevel >= getGatheringSkillRequirement(zone.band);
}

/** Create default gathering skills (all level 1, 0 xp). */
export function createDefaultGatheringSkills(): GatheringSkills {
  return {
    mining: { level: 1, xp: 0 },
    herbalism: { level: 1, xp: 0 },
    skinning: { level: 1, xp: 0 },
    logging: { level: 1, xp: 0 },
    fishing: { level: 1, xp: 0 },
  };
}

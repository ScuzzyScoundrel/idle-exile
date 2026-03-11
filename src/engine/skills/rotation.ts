// ============================================================
// Skill Rotation — rotation DPS, skill selection, mob HP
// Extracted from engine/unifiedSkills.ts (Phase B6)
// ============================================================

import type {
  SkillDef, EquippedSkill, SkillProgress, SkillTimerState,
  ResolvedStats, ActiveSkillDef, WeaponType, ZoneDef, ConversionSpec,
} from '../../types';
import { POWER_DIVISOR } from '../../data/balance';
import { getUnifiedSkillDef, getSkillsForWeapon } from '../../data/skills';
import { getSkillGraphModifier } from './resolution';
import { calcSkillDps, calcSkillCastInterval } from './dps';
import { estimateProcDps, type CombatContext } from '../procEstimation';

/**
 * Calculate total rotation DPS across all equipped active skills.
 * Each skill contributes its individual DPS (dmg/cycleTime), summed together.
 */
export function calcRotationDps(
  skillBar: (EquippedSkill | null)[],
  skillProgress: Record<string, SkillProgress>,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  atkSpeedMult: number = 1.0,
  weaponConversion?: ConversionSpec,
  combatCtx?: CombatContext,
): number {
  let totalDps = 0;

  // Collect proc data across all skills for steady-state estimation
  const allProcs: import('../../types').SkillProcEffect[] = [];
  const allConditionalMods: import('../../types').ConditionalModifier[] = [];
  let mergedDebuffInteraction: import('../../types/skills').DebuffInteraction | null = null;
  let totalCycleTime = 0;
  let skillCount = 0;
  let totalBaseIncDamage = 0;
  let maxGraphCritChance = 0;
  let maxGraphCritMult = 0;

  for (const equipped of skillBar) {
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (!skill || skill.kind !== 'active') continue;

    const progress = skillProgress[equipped.skillId];
    const graphMod = getSkillGraphModifier(skill, progress);
    totalDps += calcSkillDps(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod ?? undefined, atkSpeedMult, weaponConversion);

    // Collect proc/conditional data from graph modifiers
    if (graphMod) {
      if (graphMod.skillProcs.length > 0) allProcs.push(...graphMod.skillProcs);
      if (graphMod.conditionalMods.length > 0) allConditionalMods.push(...graphMod.conditionalMods);
      if (graphMod.debuffInteraction && !mergedDebuffInteraction) {
        mergedDebuffInteraction = graphMod.debuffInteraction;
      }
      totalBaseIncDamage += graphMod.incDamage;
      if (graphMod.incCritChance > maxGraphCritChance) maxGraphCritChance = graphMod.incCritChance;
      if (graphMod.incCritMultiplier > maxGraphCritMult) maxGraphCritMult = graphMod.incCritMultiplier;
    }

    // Accumulate cycle time for averaging
    const graphSpeedMult = graphMod?.incCastSpeed ? (1 + graphMod.incCastSpeed / 100) : 1;
    totalCycleTime += calcSkillCastInterval(skill, stats, atkSpeedMult * graphSpeedMult);
    skillCount++;
  }

  // Apply proc estimation if any proc/conditional data exists
  if (totalDps > 0 && (allProcs.length > 0 || allConditionalMods.length > 0 || mergedDebuffInteraction)) {
    const avgCycleTime = skillCount > 0 ? totalCycleTime / skillCount : 1;
    const procEst = estimateProcDps(
      allProcs, allConditionalMods, mergedDebuffInteraction,
      stats, weaponAvgDmg, avgCycleTime, combatCtx,
      totalBaseIncDamage, maxGraphCritChance, maxGraphCritMult,
    );
    totalDps += procEst.instantDamageDps;
    totalDps *= procEst.buffDpsMult * procEst.conditionalDpsMult * procEst.debuffInteractionMult;
    totalDps += procEst.debuffTickDps;
  }

  return totalDps;
}

/**
 * Get the primary damage skill from a skill bar (first 'active' kind).
 * Used by offline DPS estimation (single-skill model).
 */
export function getPrimaryDamageSkill(
  skillBar: (EquippedSkill | null)[],
): SkillDef | null {
  for (const equipped of skillBar) {
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (skill && skill.kind === 'active') return skill;
  }
  return null;
}

/**
 * Get the next active skill ready to fire in the rotation.
 * Iterates slots 0→4 in priority order; returns first active skill off cooldown.
 */
export function getNextRotationSkill(
  skillBar: (EquippedSkill | null)[],
  skillTimers: SkillTimerState[],
  now: number,
): { skill: SkillDef; slotIndex: number } | null {
  for (let i = 0; i < skillBar.length; i++) {
    const equipped = skillBar[i];
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (!skill || skill.kind !== 'active') continue;

    const timer = skillTimers.find(t => t.skillId === equipped.skillId);
    if (timer && timer.cooldownUntil != null && now < timer.cooldownUntil) {
      continue;
    }

    return { skill, slotIndex: i };
  }
  return null;
}

/**
 * Get the default (first unlocked) skill for a weapon type at a given player level.
 */
export function getDefaultSkillForWeapon(weaponType: WeaponType, playerLevel: number = 1): ActiveSkillDef | null {
  const skills = getSkillsForWeapon(weaponType);
  if (skills.length === 0) return null;

  const unlocked = skills.filter(s => s.levelRequired <= playerLevel);
  if (unlocked.length > 0) {
    const sorted = [...unlocked].sort((a, b) => a.cooldown - b.cooldown);
    return sorted[0];
  }

  return skills[0];
}

/**
 * Calculate Mob HP for a zone (used in clear time formula).
 * mobHp = baseClearTime * POWER_DIVISOR
 */
export function calcMobHp(zone: ZoneDef, hpMultiplier: number = 1.0): number {
  return zone.baseClearTime * POWER_DIVISOR * hpMultiplier;
}

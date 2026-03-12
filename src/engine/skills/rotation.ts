// ============================================================
// Skill Rotation — rotation DPS, skill selection, mob HP
// Extracted from engine/unifiedSkills.ts (Phase B6)
// ============================================================

import type {
  SkillDef, EquippedSkill, SkillProgress, SkillTimerState,
  ResolvedStats, ActiveSkillDef, WeaponType, ZoneDef, ConversionSpec,
  SkillProcEffect,
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

  for (const equipped of skillBar) {
    if (!equipped) continue;
    const skill = getUnifiedSkillDef(equipped.skillId);
    if (!skill || skill.kind !== 'active') continue;

    const progress = skillProgress[equipped.skillId];
    const graphMod = getSkillGraphModifier(skill, progress);
    let skillDps = calcSkillDps(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod ?? undefined, atkSpeedMult, weaponConversion);

    // Apply proc/conditional estimation scoped to THIS skill only
    if (graphMod && skillDps > 0 && (
      graphMod.skillProcs.length > 0 ||
      graphMod.debuffs.length > 0 ||
      graphMod.conditionalMods.length > 0 ||
      graphMod.debuffInteraction
    )) {
      // Synthesize procs from guaranteed debuff applications (graphMod.debuffs)
      // so estimateProcDps can account for their DoT damage (e.g., poison ticks)
      let allProcs = graphMod.skillProcs;
      if (graphMod.debuffs.length > 0) {
        const syntheticProcs: SkillProcEffect[] = graphMod.debuffs.map((d, i) => ({
          id: `_synth_debuff_${equipped.skillId}_${i}`,
          chance: d.chance,
          trigger: 'onHit' as const,
          applyDebuff: { debuffId: d.debuffId, stacks: 1, duration: d.duration },
        }));
        allProcs = [...graphMod.skillProcs, ...syntheticProcs];
      }

      const graphSpeedMult = graphMod.incCastSpeed ? (1 + graphMod.incCastSpeed / 100) : 1;
      const cycleTime = calcSkillCastInterval(skill, stats, atkSpeedMult * graphSpeedMult);
      const procEst = estimateProcDps(
        allProcs, graphMod.conditionalMods, graphMod.debuffInteraction,
        stats, weaponAvgDmg, cycleTime, combatCtx,
        graphMod.incDamage, graphMod.incCritChance, graphMod.incCritMultiplier,
      );
      skillDps += procEst.instantDamageDps;
      skillDps *= procEst.buffDpsMult * procEst.conditionalDpsMult * procEst.debuffInteractionMult;
      skillDps += procEst.debuffTickDps;
    }

    totalDps += skillDps;
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

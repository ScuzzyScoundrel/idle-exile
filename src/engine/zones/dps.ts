// ============================================================
// Zone DPS — player DPS calculation, clear time, combat simulation
// Extracted from engine/zones.ts (Phase C3)
// ============================================================

import type { Character, ZoneDef, ResolvedStats, AbilityEffect, CombatClearResult, ActiveSkillDef, EquippedSkill, SkillProgress, ConversionSpec } from '../../types';
import { POWER_DIVISOR, LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO } from '../../data/balance';
import { getWeaponDamageInfo, calcHitChance } from '../character';
import { calcSkillDps, calcSkillDamagePerCast, getDefaultSkillForWeapon, calcRotationDps } from '../skills';
import type { CombatContext } from '../procEstimation';
import { getSkillDef } from '../../data/skills';
import { calcOutgoingDamageMult } from './scaling';

/**
 * Calculate player's total DPS using cooldown-aware rotation formula.
 * If skillBar + skillProgress provided, sums DPS across ALL equipped active skills.
 * Falls back to single-skill or default weapon skill if no skill bar provided.
 */
export function calcPlayerDps(
  char: Character,
  abilityEffect?: AbilityEffect,
  equippedSkills?: (string | null)[],
  skillBar?: (EquippedSkill | null)[],
  skillProgress?: Record<string, SkillProgress>,
  combatCtx?: CombatContext,
): number {
  const stats = char.stats;
  const { avgDamage, spellPower, weaponConversion } = getWeaponDamageInfo(char.equipment);

  // Apply ability effects to a modified stats copy
  const effectiveStats: ResolvedStats = { ...stats };
  if (abilityEffect?.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
  if (abilityEffect?.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

  const atkSpeedMult = abilityEffect?.attackSpeedMult ?? 1;
  let dps: number;

  // Full rotation DPS: sum DPS across all equipped active skills
  if (skillBar && skillProgress) {
    dps = calcRotationDps(skillBar, skillProgress, effectiveStats, avgDamage, spellPower, atkSpeedMult, weaponConversion, combatCtx);
  } else {
    // Legacy path: single skill ID
    const activeSkillId = equippedSkills?.[0];
    const skillDef = activeSkillId ? getSkillDef(activeSkillId) : null;

    if (skillDef) {
      dps = calcSkillDps(skillDef, effectiveStats, avgDamage, spellPower, undefined, atkSpeedMult, weaponConversion);
    } else {
      // Auto-assign default skill based on weapon type
      const weaponType = char.equipment.mainhand?.weaponType;
      const defaultSkill = weaponType ? getDefaultSkillForWeapon(weaponType, char.level) : null;

      if (defaultSkill) {
        dps = calcSkillDps(defaultSkill, effectiveStats, avgDamage, spellPower, undefined, atkSpeedMult, weaponConversion);
      } else {
        dps = 0;
      }
    }
  }

  // Apply ability damage multiplier
  dps *= (abilityEffect?.damageMult ?? 1);

  return dps;
}

/**
 * Calculate how long (in seconds) a character takes to clear a zone.
 * Uses skill-based DPS when equippedSkills provided, otherwise legacy formula.
 * classDamageMult: Warrior rage / Mage charge damage bonus (default 1.0).
 * classSpeedMult: Rogue momentum speed bonus (default 1.0).
 */
export function calcClearTime(
  char: Character,
  zone: ZoneDef,
  abilityEffect?: AbilityEffect,
  classDamageMult: number = 1.0,
  classSpeedMult: number = 1.0,
  equippedSkills?: (string | null)[],
  skillBar?: (EquippedSkill | null)[],
  skillProgress?: Record<string, SkillProgress>,
  combatCtx?: CombatContext,
): number {
  const playerDps = calcPlayerDps(char, abilityEffect, equippedSkills, skillBar, skillProgress, combatCtx) * classDamageMult;

  // Defense does NOT affect clear speed (8E philosophy: offense=speed, defense=survivability).
  // Hazards removed — per-mob elemental damage replaces this system.
  const outgoingMult = calcOutgoingDamageMult(char.level, zone.iLvlMin);
  const charPower = playerDps * outgoingMult;

  let clearTime = zone.baseClearTime / (charPower / POWER_DIVISOR);

  // Level scaling: exponential penalty for being under-leveled
  const levelDelta = Math.max(0, zone.iLvlMin - char.level);
  if (levelDelta > 0) {
    clearTime *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);
  }

  const floor = zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO;

  // Apply clearSpeedMult after base calc (ability + class)
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1) * classSpeedMult;
  clearTime = Math.max(floor, clearTime);

  return clearTime;
}

/**
 * Simulate one combat clear with per-hit rolls (crits, misses, DoT ticks).
 * Used for real-time clears only — offline uses expected-value calcClearTime().
 *
 * Returns raw fight time BEFORE clear speed / floor / level penalty adjustments.
 * The caller (store) applies those post-sim modifiers.
 */
export function simulateCombatClear(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  mobHp: number,
  abilityDamageMult: number,
  abilityAttackSpeedMult: number,
  weaponConversion?: ConversionSpec,
): CombatClearResult {
  const masteryMult = stats.weaponMastery > 0 ? (1 + stats.weaponMastery / 100) : 1;
  const baseDmgPerCast = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower, undefined, weaponConversion).total * abilityDamageMult * masteryMult;
  if (baseDmgPerCast <= 0) {
    return { clearTime: 999, totalCasts: 0, hits: 0, crits: 0, misses: 0, totalDamage: 0, dotDamage: 0 };
  }

  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  // Hit chance: both attacks and spells use accuracy formula
  const hitChance = calcHitChance(stats.accuracy);

  // Crit
  const critChance = Math.min(stats.critChance, 100) / 100;
  const critDmgMult = stats.critMultiplier / 100; // e.g. 150 -> 1.5x

  // Speed
  let speedMult = 1.0;
  if (isAttack) speedMult = (1 + stats.attackSpeed / 100) * abilityAttackSpeedMult;
  if (isSpell) speedMult = (1 + stats.castSpeed / 100) * abilityAttackSpeedMult;
  const castInterval = skill.castTime / speedMult;

  // DoT tracking
  interface DotStack { remaining: number; dps: number; }
  const dotStacks: DotStack[] = [];
  const hasDoT = !!(skill.dotDuration && skill.dotDamagePercent);

  let remainingHp = mobHp;
  let elapsed = 0;
  let totalCasts = 0;
  let hits = 0;
  let crits = 0;
  let misses = 0;
  let totalDamage = 0;
  let dotDamage = 0;

  const MAX_CASTS = 500; // Safety cap

  while (remainingHp > 0 && totalCasts < MAX_CASTS) {
    // (a) Tick active DoT stacks for castInterval
    for (let i = dotStacks.length - 1; i >= 0; i--) {
      const stack = dotStacks[i];
      const tickTime = Math.min(castInterval, stack.remaining);
      const tickDmg = stack.dps * tickTime;
      remainingHp -= tickDmg;
      totalDamage += tickDmg;
      dotDamage += tickDmg;
      stack.remaining -= castInterval;
      if (stack.remaining <= 0) dotStacks.splice(i, 1);
    }

    // (b) Check if mob died from DoTs
    if (remainingHp <= 0) break;

    // (c) Roll hit
    totalCasts++;
    if (Math.random() > hitChance) {
      misses++;
      elapsed += castInterval;
      continue;
    }

    // (d) Roll crit
    const isCrit = Math.random() < critChance;
    if (isCrit) crits++;
    hits++;

    // (e) Damage with +/-10% variance
    const variance = 0.9 + Math.random() * 0.2;
    const damage = baseDmgPerCast * variance * (isCrit ? critDmgMult : 1);

    // (f) Apply damage
    remainingHp -= damage;
    totalDamage += damage;

    // (g) Apply DoT if skill has one
    if (hasDoT && remainingHp > 0) {
      dotStacks.push({
        remaining: skill.dotDuration!,
        dps: damage * skill.dotDamagePercent! * (1 + stats.dotMultiplier / 100),
      });
    }

    // (h) Advance time
    elapsed += castInterval;
  }

  return {
    clearTime: Math.max(0.1, elapsed),
    totalCasts,
    hits,
    crits,
    misses,
    totalDamage,
    dotDamage,
  };
}

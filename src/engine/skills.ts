// ============================================================
// Idle Exile — Active Skill DPS Engine (v24)
// Tag-based additive %increased damage calculation (PoE-style).
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { ActiveSkillDef, ResolvedStats, WeaponType, ZoneDef } from '../types';
import { calcHitChance } from './character';
import { getSkillsForWeapon } from '../data/skills';
import { POWER_DIVISOR } from '../data/balance';

// --- Tag-Based DPS Calculation ---

/**
 * Compute base damage per skill cast BEFORE hit/crit/speed multipliers.
 * = baseDmg (with flat additions) * incMult * hitCount
 * Shared by calcSkillDps (expected-value) and simulateCombatClear (per-hit).
 */
export function calcSkillDamagePerCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  // --- Step 1: Base damage ---
  let baseDmg = skill.baseDamage;

  if (isAttack) {
    baseDmg += weaponAvgDmg * skill.weaponDamagePercent;
    if (tags.includes('Physical')) baseDmg += stats.flatPhysDamage;
    if (tags.includes('Fire')) baseDmg += stats.flatAtkFireDamage;
    if (tags.includes('Cold')) baseDmg += stats.flatAtkColdDamage;
    if (tags.includes('Lightning')) baseDmg += stats.flatAtkLightningDamage;
    if (tags.includes('Chaos')) baseDmg += stats.flatAtkChaosDamage;
  }

  if (isSpell) {
    baseDmg += (weaponSpellPower + stats.spellPower) * skill.spellPowerRatio;
    if (tags.includes('Fire')) baseDmg += stats.flatSpellFireDamage;
    if (tags.includes('Cold')) baseDmg += stats.flatSpellColdDamage;
    if (tags.includes('Lightning')) baseDmg += stats.flatSpellLightningDamage;
    if (tags.includes('Chaos')) baseDmg += stats.flatSpellChaosDamage;
  }

  if (baseDmg <= 0) return 0;

  // --- Step 2: %increased (all ADDITIVE) ---
  let totalInc = 0;
  if (isAttack) totalInc += stats.incAttackDamage;
  if (isSpell) totalInc += stats.incSpellDamage;
  if (tags.includes('Physical')) totalInc += stats.incPhysDamage;
  if (tags.includes('Fire')) totalInc += stats.incFireDamage + stats.incElementalDamage;
  if (tags.includes('Cold')) totalInc += stats.incColdDamage + stats.incElementalDamage;
  if (tags.includes('Lightning')) totalInc += stats.incLightningDamage + stats.incElementalDamage;
  // Delivery tag scaling
  if (tags.includes('Melee'))      totalInc += stats.incMeleeDamage;
  if (tags.includes('Projectile')) totalInc += stats.incProjectileDamage;
  if (tags.includes('AoE'))        totalInc += stats.incAoEDamage;
  if (tags.includes('DoT'))        totalInc += stats.incDoTDamage;
  if (tags.includes('Channel'))    totalInc += stats.incChannelDamage;

  const incMult = 1 + totalInc / 100;

  // --- Hit count ---
  const hitCount = skill.hitCount ?? 1;

  return baseDmg * incMult * hitCount;
}

/**
 * Calculate DPS for an active skill given resolved character stats and weapon info.
 *
 * Uses PoE-style ADDITIVE %increased:
 *   totalInc = sum of all matching %inc stats
 *   multiplier = (1 + totalInc / 100)
 *
 * @param skill - The active skill definition
 * @param stats - Fully resolved character stats
 * @param weaponAvgDmg - Average physical damage of equipped weapon
 * @param weaponSpellPower - Base spell power of equipped weapon
 */
export function calcSkillDps(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  const dmgPerCast = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower);
  if (dmgPerCast <= 0) return 0;

  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  // --- Speed multiplier ---
  let speedMult = 1.0;
  if (isAttack) speedMult = 1 + stats.attackSpeed / 100;
  if (isSpell) speedMult = 1 + stats.castSpeed / 100;

  // --- Hit chance (Attack only; Spells always hit) ---
  const hitChance = isAttack ? calcHitChance(stats.accuracy) : 1.0;

  // --- Crit multiplier (expected value) ---
  const critMult = 1 + (stats.critChance / 100) * ((stats.critMultiplier - 100) / 100);

  // --- Per-second DPS ---
  const effectiveDmgPerCast = dmgPerCast * hitChance * critMult;
  let dps = (effectiveDmgPerCast / skill.castTime) * speedMult;

  // --- DoT bonus ---
  if (skill.dotDuration && skill.dotDamagePercent) {
    const dotDpsBonus = (effectiveDmgPerCast * skill.dotDamagePercent * skill.dotDuration) / skill.castTime * speedMult;
    dps += dotDpsBonus;
  }

  return dps;
}

// --- Helper Functions ---

/**
 * Get the default (first unlocked) skill for a weapon type at a given player level.
 * Falls back to the first skill for that weapon regardless of level.
 */
export function getDefaultSkillForWeapon(weaponType: WeaponType, playerLevel: number = 1): ActiveSkillDef | null {
  const skills = getSkillsForWeapon(weaponType);
  if (skills.length === 0) return null;

  // Find the highest-level skill the player can use (prefer basic spammable)
  const unlocked = skills.filter(s => s.levelRequired <= playerLevel && s.cooldown === 0);
  if (unlocked.length > 0) return unlocked[0]; // First = basic spammable

  // Fallback: first skill for this weapon
  return skills[0];
}

/**
 * Calculate Mob HP for a zone (used in clear time formula).
 * mobHp = baseClearTime * POWER_DIVISOR
 * This is mathematically equivalent to the old formula:
 *   clearTime = baseClearTime / (charPower / POWER_DIVISOR)
 *            = (baseClearTime * POWER_DIVISOR) / charPower
 *            = mobHp / charPower
 */
export function calcMobHp(zone: ZoneDef): number {
  return zone.baseClearTime * POWER_DIVISOR;
}

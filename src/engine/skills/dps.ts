// ============================================================
// Skill DPS — damage calculation, cast intervals, combat rolls
// Extracted from engine/unifiedSkills.ts (Phase B5)
// ============================================================

import type {
  SkillDef, ActiveSkillDef, ResolvedStats, DamageResult, DamageBucket, ConversionSpec, DamageType,
} from '../../types';
import { BASE_GCD, GCD_FLOOR } from '../../data/balance';
import { calcHitChance } from '../character';
import { resolveDamageBuckets } from '../damageBuckets';
import type { ResolvedSkillModifier } from '../skillGraph';

/**
 * Compute base damage per skill cast BEFORE hit/crit/speed multipliers.
 * = baseDmg (with flat additions) * incMult * hitCount
 * Optional graphMod applies graph tree bonuses (flat damage, %inc, extra hits, conversion).
 */
export function calcSkillDamagePerCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  graphMod?: ResolvedSkillModifier,
  weaponConversion?: ConversionSpec,
  elementTransform?: DamageType,
): DamageResult {
  return resolveDamageBuckets(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod, weaponConversion, elementTransform);
}

/**
 * Calculate DPS for an active skill given resolved character stats and weapon info.
 * Cooldown-aware: DPS = dmgPerCast / cycleTime where cycleTime = max(castInterval, effectiveCooldown).
 * Speed compresses cast time & GCD; ability haste compresses cooldowns. Orthogonal.
 */
export function calcSkillDps(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  graphMod?: ResolvedSkillModifier,
  atkSpeedMult: number = 1.0,
  weaponConversion?: ConversionSpec,
  elementTransform?: DamageType,
): number {
  const dmgResult = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod, weaponConversion, elementTransform);
  const dmgPerCast = dmgResult.total;
  if (dmgPerCast <= 0) return 0;

  const hitChance = calcHitChance(stats.accuracy);

  const effectiveCritChance = Math.min(stats.critChance * (1 + (graphMod?.incCritChance ?? 0) / 100), 100);
  const effectiveCritMult = stats.critMultiplier + (graphMod?.incCritMultiplier ?? 0);
  const critMult = 1 + (effectiveCritChance / 100) * ((effectiveCritMult - 100) / 100);

  const graphSpeedMult = graphMod?.incCastSpeed ? (1 + graphMod.incCastSpeed / 100) : 1;
  const castInterval = calcSkillCastInterval(skill, stats, atkSpeedMult * graphSpeedMult);

  let effectiveCooldown = 0;
  if (skill.cooldown > 0) {
    const baseCd = skill.cooldown + (graphMod?.cooldownIncrease ?? 0);
    const graphCDR = graphMod?.cooldownReduction ?? 0;
    effectiveCooldown = baseCd * (1 - graphCDR / 100);
    // Speed stat reduces cooldown: attack speed for Attack, cast speed for Spell
    const speedCDR = skill.tags.includes('Spell') ? stats.castSpeed : stats.attackSpeed;
    if (speedCDR > 0) {
      effectiveCooldown = effectiveCooldown / (1 + speedCDR / 100);
    }
    effectiveCooldown = Math.max(1, effectiveCooldown);
  }

  const cycleTime = Math.max(castInterval, effectiveCooldown);

  const effectiveDmgPerCast = dmgPerCast * hitChance * critMult;
  let dps = effectiveDmgPerCast / cycleTime;

  if (skill.dotDuration && skill.dotDamagePercent) {
    const dotMult = 1 + (stats.dotMultiplier + (graphMod?.dotMultiplier ?? 0)) / 100;
    const dotTotalDmg = effectiveDmgPerCast * skill.dotDamagePercent * skill.dotDuration * dotMult;
    dps += dotTotalDmg / cycleTime;
  }

  const totalWeaponMastery = stats.weaponMastery + (graphMod?.weaponMastery ?? 0);
  if (totalWeaponMastery > 0) {
    dps *= (1 + totalWeaponMastery / 100);
  }

  return dps;
}

/**
 * Calculate effective cast interval (seconds) for an active skill,
 * accounting for attack/cast speed, ability speed multiplier, and GCD floor.
 */
export function calcSkillCastInterval(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  atkSpeedMult: number,
): number {
  const tags = skill.tags;
  const isAttack = tags.includes('Attack');
  const isSpell = tags.includes('Spell');

  let speedMult = 1.0;
  if (isAttack) speedMult = (1 + stats.attackSpeed / 100) * atkSpeedMult;
  if (isSpell) speedMult = (1 + stats.castSpeed / 100) * atkSpeedMult;

  const effectiveCastTime = skill.castTime / speedMult;
  const effectiveGCD = BASE_GCD / speedMult;

  return Math.max(effectiveCastTime, effectiveGCD, GCD_FLOOR);
}

/**
 * Roll a single skill cast with hit/miss, crit, damage variance.
 * Optional graphMod applies graph tree bonuses (crit, flags).
 */
export function rollSkillCast(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  damageMult: number,
  graphMod?: ResolvedSkillModifier,
  weaponConversion?: ConversionSpec,
  elementTransform?: DamageType,
): { damage: number; isCrit: boolean; isHit: boolean; graphMod?: ResolvedSkillModifier; buckets?: DamageBucket[] } {
  const dmgResult = calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower, graphMod, weaponConversion, elementTransform);
  const baseDmgPerCast = dmgResult.total * damageMult;
  if (baseDmgPerCast <= 0) return { damage: 0, isCrit: false, isHit: false };

  const hitChance = calcHitChance(stats.accuracy);
  if (Math.random() > hitChance) return { damage: 0, isCrit: false, isHit: false };

  let effectiveCritChance = stats.critChance * (1 + (graphMod?.incCritChance ?? 0) / 100);
  const hasAlwaysCrit = graphMod?.flags.includes('alwaysCrit');
  const hasCannotCrit = graphMod?.flags.includes('cannotCrit');
  if (hasCannotCrit) effectiveCritChance = 0;
  if (hasAlwaysCrit) effectiveCritChance = 100;

  if (graphMod?.critChanceCap && graphMod.critChanceCap > 0) {
    effectiveCritChance = Math.min(effectiveCritChance, graphMod.critChanceCap * 100);
  }

  const critChance = Math.min(effectiveCritChance, 100) / 100;
  const isCrit = Math.random() < critChance;
  const critDmgMult = (stats.critMultiplier + (graphMod?.incCritMultiplier ?? 0)) / 100;

  const effectiveCritMult = (isCrit && graphMod?.critsDoNoBonusDamage) ? 1 : (isCrit ? critDmgMult : 1);

  const variance = 0.9 + Math.random() * 0.2;
  const scaleMult = variance * effectiveCritMult * damageMult;
  const damage = dmgResult.total * scaleMult;

  const scaledBuckets: DamageBucket[] = dmgResult.buckets.map(b => ({
    type: b.type,
    amount: b.amount * scaleMult,
  }));

  return { damage, isCrit, isHit: true, graphMod, buckets: scaledBuckets };
}

/**
 * Calculate DPS for a unified skill.
 * Returns 0 for non-active skills (buffs, passives, etc.).
 */
export function calcUnifiedDps(
  skill: SkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  if (skill.kind !== 'active') return 0;
  return calcSkillDps(skill, stats, weaponAvgDmg, weaponSpellPower);
}

/**
 * Calculate base damage per cast for a unified skill.
 * Returns 0 for non-active skills.
 */
export function calcUnifiedDamagePerCast(
  skill: SkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
): number {
  if (skill.kind !== 'active') return 0;
  return calcSkillDamagePerCast(skill, stats, weaponAvgDmg, weaponSpellPower).total;
}

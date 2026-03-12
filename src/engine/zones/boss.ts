// ============================================================
// Boss Mechanics — HP, attack profile, encounters, loot, death penalty
// Extracted from engine/zones.ts (Phase C5)
// ============================================================

import type { Character, ZoneDef, BossState, Item, AbilityEffect, EquippedSkill, SkillProgress } from '../../types';
import {
  BOSS_BASE_HP, BOSS_HP_RAMP, BOSS_HP_ILVL_SCALE, BOSS_DAMAGE_MULT,
  BOSS_ATTACK_INTERVAL, BOSS_HAZARD_DAMAGE_RATIO,
  BOSS_ILVL_BONUS, BOSS_DROP_COUNT_MIN, BOSS_DROP_COUNT_MAX,
  ZONE_PHYS_RATIO, ZONE_DMG_BASE, ZONE_DMG_ILVL_SCALE,
  DEATH_RESPAWN_BASE, DEATH_RESPAWN_PER_BAND, DEATH_RESPAWN_CAP,
  DEATH_STREAK_MULT, DEATH_STREAK_CAP,
  OFFLINE_DEATH_PENALTY_MULT, OFFLINE_DEATH_UNDERLEVEL_PER_LEVEL,
} from '../../data/balance';
import { generateItem } from '../items';
import { applyAbilityResists, calcZoneAccuracy, HAZARD_STAT_MAP, GEAR_SLOTS } from './scaling';
import { calcLevelDamageMult } from './scaling';
import { calcPlayerDps } from './dps';

/** Boss HP pool. Linear ramp + iLvl scaling. */
export function calcBossMaxHp(zone: ZoneDef): number {
  return (BOSS_BASE_HP * zone.band * (1 + BOSS_HP_RAMP * (zone.band - 1)))
    + (BOSS_HP_ILVL_SCALE * zone.iLvlMin * zone.band);
}

/**
 * Calculate boss per-hit attack profile for the defense pipeline.
 * Returns raw damage per hit, attack interval, accuracy, and phys ratio.
 */
export function calcBossAttackProfile(char: Character, zone: ZoneDef, abilityEffect?: AbilityEffect): {
  damagePerHit: number; attackInterval: number; accuracy: number; physRatio: number;
} {
  const effectiveStats = applyAbilityResists(char.stats, abilityEffect);
  const levelMult = calcLevelDamageMult(char.level, zone.iLvlMin);
  const baseDmg = (ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin) * BOSS_DAMAGE_MULT * levelMult;

  // Hazard bonus: each unresisted hazard adds elemental damage
  let hazardBonus = 0;
  for (const hazard of zone.hazards) {
    const resist = effectiveStats[HAZARD_STAT_MAP[hazard.type]] ?? 0;
    if (resist < hazard.threshold) hazardBonus += baseDmg * BOSS_HAZARD_DAMAGE_RATIO;
  }

  return {
    damagePerHit: baseDmg + hazardBonus,
    attackInterval: BOSS_ATTACK_INTERVAL,
    accuracy: calcZoneAccuracy(zone.band, char.level, zone.iLvlMin) * 1.5, // bosses are more accurate
    physRatio: ZONE_PHYS_RATIO,
  };
}

/** Create BossState at fight start with per-hit attack profile. */
export function createBossEncounter(
  char: Character, zone: ZoneDef, abilityEffect?: AbilityEffect,
  equippedSkills?: (string | null)[],
  skillBar?: (EquippedSkill | null)[], skillProgress?: Record<string, SkillProgress>,
): BossState {
  const bossHp = calcBossMaxHp(zone);
  const profile = calcBossAttackProfile(char, zone, abilityEffect);
  // Compute effective DPS for UI display: dmg/interval (pre-mitigation)
  const effectiveBossDps = profile.damagePerHit / profile.attackInterval;
  return {
    bossName: zone.bossName,
    bossMaxHp: bossHp,
    bossCurrentHp: bossHp,
    playerDps: calcPlayerDps(char, abilityEffect, equippedSkills, skillBar, skillProgress),
    bossDps: effectiveBossDps,
    bossDamagePerHit: profile.damagePerHit,
    bossAttackInterval: profile.attackInterval,
    bossNextAttackAt: Date.now(),
    bossAccuracy: profile.accuracy,
    bossPhysRatio: profile.physRatio,
    startedAt: Date.now(),
    dodgeEntropy: Math.floor(Math.random() * 100),
  };
}

/**
 * Calculate death penalty duration in seconds.
 * Scales with band, consecutive death streak, and optionally offline + underlevel.
 */
export function calcDeathPenalty(
  band: number,
  deathStreak: number,
  opts?: { offline?: boolean; levelDelta?: number },
): number {
  const base = Math.min(DEATH_RESPAWN_BASE + (band - 1) * DEATH_RESPAWN_PER_BAND, DEATH_RESPAWN_CAP);
  const streakMult = Math.min(1 + deathStreak * DEATH_STREAK_MULT, DEATH_STREAK_CAP);
  let penalty = base * streakMult;

  if (opts?.offline) {
    penalty *= OFFLINE_DEATH_PENALTY_MULT;
    // Extra penalty per level below zone minimum
    const delta = Math.max(0, opts.levelDelta ?? 0);
    if (delta > 0) {
      penalty *= 1 + delta * OFFLINE_DEATH_UNDERLEVEL_PER_LEVEL;
    }
  }

  return penalty;
}

/** Generate boss loot at boosted iLvl. */
export function generateBossLoot(zone: ZoneDef): Item[] {
  const count = BOSS_DROP_COUNT_MIN + Math.floor(Math.random() * (BOSS_DROP_COUNT_MAX - BOSS_DROP_COUNT_MIN + 1));
  const bossILvl = zone.iLvlMax + BOSS_ILVL_BONUS;
  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    items.push(generateItem(slot, bossILvl, undefined, undefined, zone.band));
  }
  return items;
}

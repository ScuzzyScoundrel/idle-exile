// ============================================================
// Zone Scaling — hazard/level/accuracy/damage multipliers
// Extracted from engine/zones.ts (Phase C1)
// ============================================================

import type { ResolvedStats, ZoneDef, GearSlot, AbilityEffect } from '../../types';
import {
  LEVEL_DAMAGE_BASE, OVERLEVEL_DAMAGE_REDUCTION, OVERLEVEL_DAMAGE_FLOOR,
  UNDERLEVEL_SOFTCAP,
  OUTGOING_DAMAGE_PENALTY_BASE, OUTGOING_DAMAGE_PENALTY_FLOOR,
  ZONE_ACCURACY_BASE, UNDERLEVEL_ACCURACY_SCALE,
  ZONE_DMG_BASE, ZONE_DMG_ILVL_SCALE,
} from '../../data/balance';

// --- Gear slots used for random item drops ---

export const GEAR_SLOTS: GearSlot[] = [
  'mainhand', 'offhand',
  'helmet', 'neck', 'shoulders', 'cloak',
  'chest', 'bracers', 'gloves', 'belt',
  'pants', 'boots',
  'ring1', 'trinket1',
];

// --- Hazard Resist Mapping (v16: no poison, only fire/cold/lightning/chaos) ---

export const HAZARD_STAT_MAP: Record<string, keyof ResolvedStats> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  chaos: 'chaosResist',
};

// --- Ability Effect Helpers ---

/** Apply ability resistBonus to stats for combat calculations. */
export function applyAbilityResists(stats: ResolvedStats, abilityEffect?: AbilityEffect): ResolvedStats {
  if (!abilityEffect?.resistBonus) return stats;
  return {
    ...stats,
    fireResist: stats.fireResist + abilityEffect.resistBonus,
    coldResist: stats.coldResist + abilityEffect.resistBonus,
    lightningResist: stats.lightningResist + abilityEffect.resistBonus,
    chaosResist: stats.chaosResist + abilityEffect.resistBonus,
  };
}

// --- Functions ---

/**
 * Calculate hazard penalty multiplier for a zone.
 * @deprecated Hazards removed — always returns 1.0. Per-mob elemental damage replaces this system.
 */
export function calcHazardPenalty(_stats: ResolvedStats, _zone: ZoneDef): number {
  return 1.0;
}

/**
 * Check if character meets ALL hazard thresholds for zone mastery.
 * @deprecated Hazards removed — always returns true. Per-mob elemental damage replaces this system.
 */
export function checkZoneMastery(_stats: ResolvedStats, _zone: ZoneDef): boolean {
  return true;
}

/**
 * XP scaling based on player level vs zone iLvl.
 * Overleveled zones give drastically reduced XP.
 * Each level above zone = -20% XP. Hard cutoff at 5+ levels over (0 XP).
 */
export function calcXpScale(playerLevel: number, zoneIlvl: number): number {
  const delta = playerLevel - zoneIlvl;
  if (delta >= 5) return 0;      // Hard cutoff: 0 XP at 5+ levels over
  if (delta <= 0) return 1.0;    // Full XP if at or below zone level
  return 1 - delta * 0.2;       // 80%, 60%, 40%, 20%, then 0%
}

/**
 * Level-based damage multiplier for combat.
 * Underleveled: exponential — zones hit MUCH harder.
 * Overleveled: linear reduction with floor — trivial farm.
 */
export function calcLevelDamageMult(playerLevel: number, zoneILvlMin: number): number {
  const delta = zoneILvlMin - playerLevel;
  if (delta > 0) {
    // Underleveled: exponential up to softcap, then sqrt growth
    if (delta <= UNDERLEVEL_SOFTCAP) {
      return Math.pow(LEVEL_DAMAGE_BASE, delta);
    }
    // Past softcap: base^softcap * sqrt(base^(delta - softcap))
    return Math.pow(LEVEL_DAMAGE_BASE, UNDERLEVEL_SOFTCAP) *
      Math.sqrt(Math.pow(LEVEL_DAMAGE_BASE, delta - UNDERLEVEL_SOFTCAP));
  } else if (delta < 0) {
    // Overleveled: linear damage reduction, floor at OVERLEVEL_DAMAGE_FLOOR
    return Math.max(OVERLEVEL_DAMAGE_FLOOR, 1 + delta * OVERLEVEL_DAMAGE_REDUCTION);
  }
  return 1.0;
}

/**
 * Outgoing damage penalty when player is underleveled for a zone.
 * Reduces player damage output exponentially per level below zone iLvlMin.
 */
export function calcOutgoingDamageMult(playerLevel: number, zoneILvlMin: number): number {
  const delta = zoneILvlMin - playerLevel;
  if (delta <= 0) return 1.0;
  return Math.max(OUTGOING_DAMAGE_PENALTY_FLOOR, Math.pow(OUTGOING_DAMAGE_PENALTY_BASE, -delta));
}

/**
 * Calculate zone accuracy with level-based scaling.
 * Underleveled players face much higher accuracy, degrading evasion effectiveness.
 */
export function calcZoneAccuracy(band: number, playerLevel: number, zoneILvlMin: number): number {
  const baseAccuracy = ZONE_ACCURACY_BASE * (1 + (band - 1) * 0.5);
  const levelDelta = Math.max(0, zoneILvlMin - playerLevel);
  return levelDelta > 0 ? baseAccuracy * (1 + levelDelta * UNDERLEVEL_ACCURACY_SCALE) : baseAccuracy;
}

/**
 * Calculate the reference damage per hit for a zone (for EHP scoring).
 * Mirrors simulateClearDefense's baseDmgPerHit formula.
 */
export function calcZoneRefDamage(zone: ZoneDef, playerLevel: number): number {
  const levelMult = calcLevelDamageMult(playerLevel, zone.iLvlMin);
  return (ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin) * levelMult;
}

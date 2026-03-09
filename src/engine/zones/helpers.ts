import type { GameState, AbilityEffect, ResolvedStats, CombatClearResult, ZoneDef } from '../../types';
import { getZoneMobTypes, weightedRandomMob } from '../../data/mobTypes';
import { calcMobHp, getPrimaryDamageSkill, getDefaultSkillForWeapon } from '../../engine/unifiedSkills';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { calcClearTime, simulateCombatClear, applyAbilityResists, calcHazardPenalty, calcOutgoingDamageMult } from '../../engine/zones';
import { isZoneInvaded } from '../../engine/invasions';
import { LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO, INVASION_DIFFICULTY_MULT } from '../../data/balance';

/** Pick the mob currently being fought: targeted mob or weighted random from zone. */
export function pickCurrentMob(zoneId: string, targetedMobId: string | null): string | null {
  if (targetedMobId) return targetedMobId;
  const mobs = getZoneMobTypes(zoneId);
  if (mobs.length === 0) return null;
  return weightedRandomMob(mobs).id;
}

/**
 * Compute clear time for next clear using per-hit combat sim.
 * Falls back to expected-value calcClearTime if no skill is available.
 */
export function computeNextClear(
  state: GameState,
  zone: ZoneDef,
  abilityEffect: AbilityEffect | undefined,
  classDamageMult: number,
  classSpeedMult: number,
): { clearTime: number; clearResult: CombatClearResult | null } {
  // Get active skill from unified skillBar, fall back to default for weapon
  const primarySkill = getPrimaryDamageSkill(state.skillBar ?? []);
  const skill = primarySkill ?? getDefaultSkillForWeapon(
    state.character.equipment.mainhand?.weaponType ?? 'sword',
    state.character.level,
  );

  if (!skill) {
    // No skill -> expected-value fallback
    return {
      clearTime: calcClearTime(state.character, zone, abilityEffect, classDamageMult, classSpeedMult),
      clearResult: null,
    };
  }

  const stats = resolveStats(state.character);
  const effectiveStats: ResolvedStats = { ...stats };
  if (abilityEffect?.critChanceBonus) effectiveStats.critChance += abilityEffect.critChanceBonus;
  if (abilityEffect?.critMultiplierBonus) effectiveStats.critMultiplier += abilityEffect.critMultiplierBonus;

  const { avgDamage, spellPower } = getWeaponDamageInfo(state.character.equipment);
  // Invasion difficulty: mobs have more HP during void invasions
  const invasionMult = isZoneInvaded(state.invasionState, zone.id, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
  const mobHp = calcMobHp(zone) * invasionMult;

  // Hazard penalty: unresisted hazards make effective mob HP higher
  const hazardMult = abilityEffect?.ignoreHazards ? 1.0 : calcHazardPenalty(
    applyAbilityResists(stats, abilityEffect), zone,
  );

  let effectiveMobHp = mobHp / hazardMult;

  // Level penalty: underleveled = mob effectively tougher
  const levelDelta = Math.max(0, zone.iLvlMin - state.character.level);
  if (levelDelta > 0) effectiveMobHp *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);

  const outgoingMult = calcOutgoingDamageMult(state.character.level, zone.iLvlMin);
  const damageMult = (abilityEffect?.damageMult ?? 1) * classDamageMult * outgoingMult;
  const atkSpeedMult = abilityEffect?.attackSpeedMult ?? 1;

  const result = simulateCombatClear(
    skill, effectiveStats, avgDamage, spellPower,
    effectiveMobHp, damageMult, atkSpeedMult,
  );

  // Post-sim: apply clear speed bonuses + floor
  let clearTime = result.clearTime;
  clearTime /= (abilityEffect?.clearSpeedMult ?? 1) * classSpeedMult;
  clearTime = Math.max(clearTime, zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO);

  return { clearTime, clearResult: { ...result, clearTime } };
}

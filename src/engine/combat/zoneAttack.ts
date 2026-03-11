// ============================================================
// Zone Attack — per-mob attack timers + passive regen (non-skill ticks)
// Extracted from combat/tick.ts (Phase D3)
// ============================================================

import type { GameState, CombatTickResult, ResolvedStats, CombatPhase } from '../../types';
import { resolveStats } from '../character';
import {
  rollZoneAttack,
  applyAbilityResists,
  calcLevelDamageMult,
  calcZoneAccuracy,
} from '../zones';
import {
  ZONE_ATTACK_INTERVAL,
  ZONE_DMG_BASE,
  ZONE_DMG_ILVL_SCALE,
  ZONE_PHYS_RATIO,
  MAX_REGEN_CAP_RATIO,
  DEATH_STREAK_WINDOW,
} from '../../data/balance';
import {
  tickDebuffDoT,
  calcEnemyDebuffMods,
  calcBleedTriggerDamage,
  calcFortifyDR,
  getFullEffect,
} from './helpers';
import type { CombatTickOutput } from './types';
import { noResult } from './types';

/**
 * Apply zone per-hit attacks + passive regen during normal clearing.
 * Per-mob: each mob attacks independently, each has own debuffs/regen.
 * Called on non-skill ticks (GCD not ready) during clearing phase.
 * Returns merged patch + result instead of calling set().
 */
export function applyZoneDamage(
  state: GameState,
  dt: number,
  now: number,
  zone: { band: number; iLvlMin: number },
): CombatTickOutput {
  if (state.combatPhase !== 'clearing') return { patch: {}, result: noResult };
  let playerHp = state.currentHp;
  let zoneAttackResult: CombatTickResult['zoneAttack'] = null;
  let helperBleedDmg = 0;
  let helperDotDamage = 0;
  const updatedMobs = state.packMobs.map(m => ({ ...m, debuffs: [...m.debuffs] }));
  const packSize = updatedMobs.length;
  // Per-mob damage scaling: divide per-mob zone damage by sqrt(packSize)
  const packDmgScale = packSize > 1 ? 1 / Math.sqrt(packSize) : 1;

  // --- Per-mob attack timers ---
  let currentDodgeEntropy = state.dodgeEntropy;
  let anyAttacked = false;
  let currentEs = state.currentEs;
  for (const mob of updatedMobs) {
    if (mob.nextAttackAt <= 0 || now < mob.nextAttackAt) continue;
    anyAttacked = true;
    const mobEnemyMods = calcEnemyDebuffMods(mob.debuffs);

    // Bleed trigger: mob attacked (hit or miss — mob still swung)
    const mobBleedDmg = calcBleedTriggerDamage(mob.debuffs, 1, resolveStats(state.character).incDoTDamage);
    if (mobBleedDmg > 0) {
      mob.hp = Math.max(0, mob.hp - mobBleedDmg);
      helperBleedDmg += mobBleedDmg;
    }

    // Rare mob attack speed multiplier (Frenzied)
    const mobRareAtkMult = mob.rare?.combinedAtkSpeedMult ?? 1;

    // Miss chance from debuffs (e.g. Blinded)
    if (Math.random() * 100 < mobEnemyMods.missChance) {
      if (!zoneAttackResult) zoneAttackResult = { damage: 0, isDodged: true, isBlocked: false };
      mob.nextAttackAt = now + ZONE_ATTACK_INTERVAL * mobEnemyMods.atkSpeedSlowMult * mobRareAtkMult * 1000;
    } else {
      const playerStats = resolveStats(state.character);
      const abilEff = getFullEffect(state, now, false);
      const defStats = applyAbilityResists(playerStats, abilEff);
      const buffedStats: ResolvedStats = abilEff.defenseMult
        ? { ...defStats, armor: defStats.armor * abilEff.defenseMult, evasion: defStats.evasion * abilEff.defenseMult }
        : defStats;

      const levelMult = calcLevelDamageMult(state.character.level, zone.iLvlMin);
      const zoneAccuracy = calcZoneAccuracy(zone.band, state.character.level, zone.iLvlMin);
      const variance = 0.8 + Math.random() * 0.4;
      const mobRareDmgMult = mob.rare?.combinedDamageMult ?? 1;
      const rawDmg = (ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin) * levelMult * variance * mobRareDmgMult * packDmgScale;

      const roll = rollZoneAttack(rawDmg, ZONE_PHYS_RATIO, zoneAccuracy, buffedStats, currentDodgeEntropy);
      currentDodgeEntropy = roll.newDodgeEntropy;
      let mobZoneDmg = roll.damage * mobEnemyMods.damageMult;
      const helperZoneFortifyDR = calcFortifyDR(state.fortifyStacks, state.fortifyExpiresAt, state.fortifyDRPerStack, now, resolveStats(state.character).fortifyEffect);
      if (helperZoneFortifyDR > 0) mobZoneDmg *= (1 - helperZoneFortifyDR);
      if (playerStats.damageTakenReduction > 0) mobZoneDmg *= (1 - playerStats.damageTakenReduction / 100);
      if (currentEs > 0 && mobZoneDmg > 0) {
        const esAbsorbed = Math.min(currentEs, mobZoneDmg);
        currentEs -= esAbsorbed;
        mobZoneDmg -= esAbsorbed;
      }
      playerHp -= mobZoneDmg;
      // Report last attacking mob's roll as the zone attack result
      zoneAttackResult = roll;
      mob.nextAttackAt = now + ZONE_ATTACK_INTERVAL * mobEnemyMods.atkSpeedSlowMult * mobRareAtkMult * 1000;

      const zoneStats = resolveStats(state.character);
      if (zoneStats.esRecharge > 0) {
        currentEs = Math.min(zoneStats.energyShield, currentEs + zoneStats.esRecharge * dt);
      }
    }
  }

  // Passive player regen per tick (only if any mob attacked — keeps original behavior)
  if (anyAttacked) {
    const maxLife = resolveStats(state.character).maxLife;
    const regenCap = maxLife * MAX_REGEN_CAP_RATIO;
    const regen = Math.min(resolveStats(state.character).lifeRegen * dt, regenCap);
    playerHp = Math.min(maxLife, playerHp + regen);

    if (playerHp <= 0) {
      const deathNow = Date.now();
      const streakReset = deathNow - state.lastDeathTime > DEATH_STREAK_WINDOW * 1000;
      const newStreak = streakReset ? 0 : state.deathStreak + 1;
      return {
        patch: {
          currentHp: 0,
          currentEs: 0,
          dodgeEntropy: Math.floor(Math.random() * 100),
          packMobs: updatedMobs,
          combatPhase: 'zone_defeat' as CombatPhase,
          combatPhaseStartedAt: deathNow,
          deathStreak: newStreak,
          lastDeathTime: deathNow,
        },
        result: { ...noResult, zoneAttack: zoneAttackResult, zoneDeath: true, bleedTriggerDamage: helperBleedDmg },
      };
    }
    // Fold currentHp + dodgeEntropy into patch
  }

  // --- Per-mob DoT and regen ---
  const zonePlayerStats = resolveStats(state.character);
  let helperPoisonCount: number | undefined;
  for (const mob of updatedMobs) {
    if (mob.debuffs.length > 0) {
      const enemyMaxHp = mob.maxHp > 0 ? mob.maxHp : 1;
      const dot = tickDebuffDoT(mob.debuffs, dt, 1, zonePlayerStats.incDoTDamage, enemyMaxHp);
      const mobDamageTakenMult = mob.rare?.combinedDamageTakenMult ?? 1;
      const dotDmg = dot.damage * mobDamageTakenMult;
      helperDotDamage += dotDmg;
      mob.hp = Math.max(0, mob.hp - dotDmg);
      mob.debuffs = dot.updatedDebuffs;
      if (dot.poisonInstanceCount) helperPoisonCount = (helperPoisonCount ?? 0) + dot.poisonInstanceCount;
    }
    // Rare mob regen (Regenerating)
    const regenRate = mob.rare?.combinedRegenPerSec ?? 0;
    if (regenRate > 0 && mob.maxHp > 0) {
      mob.hp = Math.min(mob.maxHp, mob.hp + mob.maxHp * regenRate * dt);
    }
  }

  return {
    patch: {
      packMobs: updatedMobs,
      currentHp: playerHp,
      currentEs: currentEs,
      dodgeEntropy: currentDodgeEntropy,
    },
    result: { ...noResult, zoneAttack: zoneAttackResult, bleedTriggerDamage: helperBleedDmg, dotDamage: helperDotDamage, poisonInstanceCount: helperPoisonCount },
  };
}

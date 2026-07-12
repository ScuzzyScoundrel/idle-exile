// ============================================================
// Auto-attack subsystem — Phase A Change 2
// ============================================================
//
// Fills dead air between skill casts. Fires at the equipped weapon's
// natural speed (WEAPON_TYPE_META.speedModifier) compressed by the
// character's attackSpeed / castSpeed stat.
//
// Design principles:
//   • Autos ONLY fire on ticks where no skill was cast (non-skill ticks).
//   • Autos DO NOT create or consume combo states (skills own combos).
//   • Autos CAN crit + trigger on-hit procs + apply ailments (latter two
//     wire in Change 3 / Change 4 — this MVP does damage only).
//   • Active channel pauses autos (channels already produce output cadence).
//   • Caster weapons (staff, wand, tome, gauntlet, scepter, scythe) auto
//     with spellPower as a ranged bolt; melee weapons auto with weapon dmg.
//
// What this MVP ships:
//   • rollAutoAttack() → { damage, canFire } — pure
//   • computeAutoAttackInterval() → seconds until next auto
//   • shouldFireAutoAttack() → boolean gate against channelState + timer
//
// What callers must do:
//   • After each tick's skill phase, invoke shouldFireAutoAttack().
//   • If true: rollAutoAttack(), apply damage to front mob / boss,
//     bump state.nextAutoAttackAt.

import type {
  GameState, ResolvedStats, WeaponType,
  CombatPhase, ZoneDef, CombatTickResult,
} from '../../types';
import { WEAPON_TYPE_META } from '../../data/weapons';
import { getWeaponDamageInfo, calcHitChance, resolveStats } from '../character';
import { applyZoneDamage } from './zoneAttack';
import { applyBossDamage } from './bossAttack';
import { regenMana, tickManaWithCost } from './manaTick';
import { CLASS_MANA_CONFIG } from '../../types/mana';
import {
  AUTO_ATTACK_BASE_DMG_COEF,
  AUTO_ATTACK_MIN_INTERVAL,
  AUTO_ATTACK_BASE_INTERVAL,
} from '../../data/balance';

// CombatTickOutput shape lives in ../../types/combat via CombatTickResult.
// Redeclare minimal type used here to avoid cross-file import churn.
interface CombatTickOutput {
  patch: Partial<GameState>;
  result: CombatTickResult;
}

/** Is a channel currently active (pauses autos)? */
function channelIsActive(state: GameState, now: number): boolean {
  // Loose != guards against undefined from pre-channel saves/harness states.
  const ch = state.channelState;
  return ch != null && now < ch.expiresAt;
}

/** Get the equipped mainhand weapon type, or null if unarmed / no mainhand. */
function getEquippedWeaponType(state: GameState): WeaponType | null {
  return state.character.equipment.mainhand?.weaponType ?? null;
}

/**
 * Seconds between auto-attacks, scaled by weapon speedModifier and stat.
 *
 * Example: dagger speedModifier 1.3, attackSpeed 50 →
 *   (1.0 / 1.3) / (1 + 50/100) = 0.769 / 1.5 = 0.513s between autos.
 * Example: greatsword 0.7, 0% speed →
 *   (1.0 / 0.7) / 1.0 = 1.429s between autos.
 */
export function computeAutoAttackInterval(
  weaponType: WeaponType,
  stats: ResolvedStats,
): number {
  const meta = WEAPON_TYPE_META[weaponType];
  const speedMod = meta?.speedModifier ?? 1.0;
  // Caster weapons use castSpeed for auto cadence; others use attackSpeed.
  const useCastSpeed = meta?.category === 'spell';
  const statPct = useCastSpeed ? stats.castSpeed : stats.attackSpeed;
  const interval = AUTO_ATTACK_BASE_INTERVAL / speedMod / (1 + statPct / 100);
  return Math.max(interval, AUTO_ATTACK_MIN_INTERVAL);
}

/**
 * Should the next auto-attack fire on this tick? Gates:
 *   • mainhand weapon is equipped
 *   • no active channel (channels pause autos)
 *   • timer: now >= state.nextAutoAttackAt
 *
 * Caller separately ensures no skill fired this tick (i.e., call this
 * inside the non-skill tick early-return paths).
 */
export function shouldFireAutoAttack(state: GameState, now: number): boolean {
  if (channelIsActive(state, now)) return false;
  if (getEquippedWeaponType(state) === null) return false;
  return now >= state.nextAutoAttackAt;
}

/**
 * Roll a single auto-attack. MVP: flat damage from weapon base, scaled by
 * AUTO_ATTACK_BASE_DMG_COEF, multiplied by (1 + incPhysDamage/100) for
 * attack weapons or (1 + incSpellDamage/100) for caster weapons. Hit
 * chance applied — a miss returns damage = 0 but still consumes the
 * auto-attack timer (same as skills).
 *
 * Returns flat damage to apply to the primary target. Caller decides
 * front mob vs boss.
 *
 * Future integration (Change 3+): route through resolveDamageBuckets for
 * elemental autos, add crit roll, add on-hit proc dispatch, add ailment
 * chance resolver. For now, this is a simple physical/spell ping that
 * proves timing feel.
 */
export function rollAutoAttack(
  state: GameState,
  stats: ResolvedStats,
): { damage: number; weaponType: WeaponType | null } {
  const weaponType = getEquippedWeaponType(state);
  if (!weaponType) return { damage: 0, weaponType: null };

  const meta = WEAPON_TYPE_META[weaponType];
  const { avgDamage, spellPower } = getWeaponDamageInfo(state.character.equipment);

  const hitChance = calcHitChance(stats.accuracy);
  if (Math.random() > hitChance) {
    // Miss — timer still consumed (damage = 0).
    return { damage: 0, weaponType };
  }

  // Pick the base for this weapon category.
  const isCaster = meta?.category === 'spell';
  const rawBase = isCaster
    ? (spellPower + stats.spellPower)
    : (avgDamage + stats.flatPhysDamage);

  if (rawBase <= 0) return { damage: 0, weaponType };

  const incPct = isCaster ? stats.incSpellDamage : stats.incPhysDamage;
  const dmg = rawBase * AUTO_ATTACK_BASE_DMG_COEF * (1 + incPct / 100);

  // Small variance (±10%) so repeated autos don't feel robotic.
  const variance = 0.9 + Math.random() * 0.2;

  return { damage: dmg * variance, weaponType };
}

/**
 * Wrapper for the "non-skill tick" path. Replaces the direct calls to
 * applyZoneDamage / applyBossDamage in tick.ts so auto-attacks are a
 * first-class citizen of every tick where no skill fires.
 *
 * Flow:
 *   1. If auto is due (and no channel active), roll the auto.
 *   2. Apply auto damage to the primary target (front mob / boss).
 *   3. Bump state.nextAutoAttackAt to now + interval.
 *   4. Delegate to applyZoneDamage / applyBossDamage with the modified
 *      state, so downstream mob attack timers / regen / debuff ticks all
 *      see the post-auto HP.
 *   5. Merge the new nextAutoAttackAt into the sub-output's patch.
 *
 * Zero change when no auto is due — returns identical output to a
 * direct applyZoneDamage / applyBossDamage call.
 */
export function applyNonSkillTickWithAuto(
  state: GameState,
  dtSec: number,
  now: number,
  zone: ZoneDef,
  phase: CombatPhase,
): CombatTickOutput {
  let workingState: GameState = state;
  let newNextAuto = state.nextAutoAttackAt;
  // Phase F follow-on (2026-05-07): track auto-hit + auto-kill events
  // so we can feed them into tickManaWithCost (per-class onHitDealtGain
  // / onKillGain). Critical for Berserker — startFull:false +
  // passiveRegen:0 means autos are the ONLY mana source until skills
  // can fire, but pre-2026-05-07 autos didn't trigger event-proc gain.
  let autoHitLanded = false;
  let autoKillCount = 0;

  if (shouldFireAutoAttack(state, now)) {
    const stats = resolveStats(state.character);
    const { damage, weaponType } = rollAutoAttack(state, stats);
    if (weaponType) {
      const interval = computeAutoAttackInterval(weaponType, stats);
      newNextAuto = now + interval * 1000;
    } else {
      // No weapon — push timer out slightly to avoid hot-looping.
      newNextAuto = now + AUTO_ATTACK_BASE_INTERVAL * 1000;
    }

    if (damage > 0) {
      autoHitLanded = true;
      if (phase === 'boss_fight' && state.bossState) {
        const newBossHp = Math.max(0, state.bossState.bossCurrentHp - damage);
        if (state.bossState.bossCurrentHp > 0 && newBossHp <= 0) autoKillCount = 1;
        workingState = {
          ...state,
          bossState: {
            ...state.bossState,
            bossCurrentHp: newBossHp,
          },
        };
      } else if (state.packMobs.length > 0 && state.packMobs[0].hp > 0) {
        const newFrontHp = Math.max(0, state.packMobs[0].hp - damage);
        if (newFrontHp <= 0) autoKillCount = 1;
        workingState = {
          ...state,
          packMobs: state.packMobs.map((m, i) =>
            i === 0 ? { ...m, hp: newFrontHp } : m,
          ),
        };
      }
    }
  }

  const sub: CombatTickOutput = phase === 'boss_fight'
    ? applyBossDamage(workingState, dtSec, now)
    : applyZoneDamage(workingState, dtSec, now, zone);

  // Phase A Change 4 + Phase F follow-on (2026-05-07): passive regen
  // PLUS auto-attack event-proc mana gain. Without onHitDealtGain on
  // auto-hits, Berserker (startFull:false, passiveRegen:0) starves
  // because skills cost mana but autos couldn't generate any —
  // chicken-and-egg locked the player into auto-attack-only.
  const cfg = CLASS_MANA_CONFIG[state.character.class];
  const autoProcGain = cfg
    ? (autoHitLanded ? cfg.onHitDealtGain : 0) + (autoKillCount > 0 ? cfg.onKillGain * autoKillCount : 0)
    : 0;
  const updatedMana = autoProcGain > 0
    ? tickManaWithCost(state.character.mana, dtSec, 0, autoProcGain)
    : regenMana(state.character.mana, dtSec);
  const manaChanged = updatedMana !== state.character.mana;

  return {
    patch: {
      ...sub.patch,
      nextAutoAttackAt: newNextAuto,
      ...(manaChanged ? { character: { ...state.character, mana: updatedMana } } : {}),
    },
    result: sub.result,
  };
}

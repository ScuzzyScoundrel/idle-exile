// ============================================================
// Headless offline combat simulation
// Runs runCombatTick in a virtual-time loop to produce accurate
// offline kill/death counts without a UI.
// ============================================================

import type { GameState, CombatPhase, Item } from '../../types';
import { runCombatTick } from './tick';
import { getFullEffect } from './helpers';
import { resolveStats } from '../character';
import { spawnPack } from '../packs';
import { pickCurrentMob } from '../zones/helpers';
import { createBossEncounter, calcDeathPenalty, generateBossLoot } from '../zones';
import { getMobTypeDef } from '../../data/mobTypes';
import { isZoneInvaded } from '../invasions';
import { ZONE_DEFS } from '../../data/zones';
import {
  BOSS_INTERVAL,
  BOSS_VICTORY_DURATION,
  BOSS_VICTORY_HEAL_RATIO,
  INVASION_DIFFICULTY_MULT,
} from '../../data/balance';

// ── Tuning constants ──

/** Match real-time tick granularity so ES recharge doesn't prevent deaths. */
const TICK_DT = 0.25;
/** Cap virtual time to 24 hours regardless of actual elapsed. */
const MAX_VIRTUAL_SECONDS = 86_400;
/** Consecutive deaths without a kill → abort. */
const DEATH_LOOP_THRESHOLD = 50;
/** Max ticks per single boss fight (10 min at 4 ticks/sec). */
const BOSS_FIGHT_TICK_CAP = 2400;

// ── Result type ──

export interface OfflineSimResult {
  totalMobKills: number;
  totalDeaths: number;
  bossAttempts: number;
  bossVictories: number;
  bossLoot: Item[];
  ticksSimulated: number;
  deathLoopDetected: boolean;
  elapsedSimMs: number; // wall-clock performance measurement
}

// ── Main function ──

export function simulateOfflineCombat(
  initialState: GameState,
  elapsedSeconds: number,
): OfflineSimResult {
  const wallStart = performance.now();

  // Deep copy so we can mutate freely.
  // Use JSON round-trip instead of structuredClone because the Zustand store
  // state object contains action functions which structuredClone cannot handle.
  const s = JSON.parse(JSON.stringify(initialState)) as GameState;

  const cappedSeconds = Math.min(elapsedSeconds, MAX_VIRTUAL_SECONDS);
  const startMs = s.idleStartTime ?? Date.now();
  let virtualNow = startMs;
  const endTime = startMs + cappedSeconds * 1000;
  const tickDtMs = TICK_DT * 1000;

  // Look up zone
  const zone = ZONE_DEFS.find(z => z.id === s.currentZoneId);
  if (!zone) {
    return emptyResult(performance.now() - wallStart);
  }

  // Counters
  let totalMobKills = 0;
  let totalDeaths = 0;
  let bossAttempts = 0;
  let bossVictories = 0;
  const bossLoot: Item[] = [];
  let ticksSimulated = 0;
  let consecutiveDeathsWithoutKill = 0;
  let deathLoopDetected = false;

  // Boss trigger tracking — count clears toward next boss
  let clearsSinceBoss = (s.zoneClearCounts[zone.id] ?? 0) % BOSS_INTERVAL;

  // Ensure a pack exists for the first tick
  ensurePack(s, zone, virtualNow);
  s.combatPhase = 'clearing';
  s.bossState = null;

  // Heal to full for start of offline sim
  const startStats = resolveStats(s.character);
  s.currentHp = startStats.maxLife;
  s.currentEs = startStats.energyShield;

  // ── Main loop ──

  while (virtualNow < endTime) {
    if (deathLoopDetected) break;

    // applyPatch mutates combatPhase via `any` cast — TS can't track it
    const phase = s.combatPhase as CombatPhase;

    // ─── Recovery phases: fast-forward ───
    if (phase === 'zone_defeat' || phase === 'boss_defeat' || phase === 'boss_victory') {
      const isDefeat = phase === 'zone_defeat' || phase === 'boss_defeat';
      const levelDelta = Math.max(0, zone.iLvlMin - s.character.level);
      const recoveryDuration = isDefeat
        ? calcDeathPenalty(zone.band, s.deathStreak, { offline: true, levelDelta })
        : BOSS_VICTORY_DURATION;

      // Jump virtual clock to end of recovery
      virtualNow += recoveryDuration * 1000;
      if (virtualNow >= endTime) break;

      // Heal
      const stats = resolveStats(s.character);
      if (phase === 'boss_victory') {
        s.currentHp = s.currentHp + (stats.maxLife - s.currentHp) * BOSS_VICTORY_HEAL_RATIO;
      } else {
        s.currentHp = stats.maxLife;
      }
      s.currentEs = stats.energyShield;

      // Clear boss state
      s.bossState = null;
      s.combatPhaseStartedAt = null;

      // Reset ephemeral combat state
      s.activeDebuffs = [];
      s.tempBuffs = [];
      s.skillCharges = {};
      s.consecutiveHits = 0;
      s.killStreak = 0;
      s.lastOverkillDamage = 0;
      s.rampingStacks = 0;
      s.rampingLastHitAt = 0;
      s.fortifyStacks = 0;
      s.fortifyExpiresAt = 0;

      // Spawn new pack and resume clearing
      ensurePack(s, zone, virtualNow);
      s.combatPhase = 'clearing';
      continue;
    }

    // ─── Boss trigger check ───
    if (phase === 'clearing' && clearsSinceBoss >= BOSS_INTERVAL) {
      // Start boss fight
      bossAttempts++;
      clearsSinceBoss = 0;
      const effect = getFullEffect(s, virtualNow, false);
      const boss = createBossEncounter(s.character, zone, effect, undefined, s.skillBar, s.skillProgress);
      // Override timestamps to virtual time
      boss.bossNextAttackAt = virtualNow;
      boss.startedAt = virtualNow;
      s.bossState = boss;
      s.combatPhase = 'boss_fight';
      s.combatPhaseStartedAt = virtualNow;
      s.packMobs = [];
      s.activeDebuffs = [];

      let bossTicks = 0;
      // Inner boss fight loop
      while (virtualNow < endTime && bossTicks < BOSS_FIGHT_TICK_CAP) {
        const { patch, result } = runCombatTick(s, TICK_DT, virtualNow);
        applyPatch(s, patch);
        ticksSimulated++;
        bossTicks++;
        virtualNow += tickDtMs;

        if (result.bossOutcome === 'victory') {
          bossVictories++;
          consecutiveDeathsWithoutKill = 0;
          bossLoot.push(...generateBossLoot(zone));
          // Transition to boss_victory recovery
          s.combatPhase = 'boss_victory';
          s.combatPhaseStartedAt = virtualNow;
          break;
        }
        if (result.bossOutcome === 'defeat') {
          totalDeaths++;
          consecutiveDeathsWithoutKill++;
          s.deathStreak++;
          s.lastDeathTime = virtualNow;
          if (consecutiveDeathsWithoutKill >= DEATH_LOOP_THRESHOLD) {
            deathLoopDetected = true;
          }
          // Transition to boss_defeat recovery
          s.combatPhase = 'boss_defeat';
          s.combatPhaseStartedAt = virtualNow;
          break;
        }
      }

      // Boss timed out — treat as defeat
      if (bossTicks >= BOSS_FIGHT_TICK_CAP && s.combatPhase === 'boss_fight' as CombatPhase) {
        totalDeaths++;
        consecutiveDeathsWithoutKill++;
        s.deathStreak++;
        s.lastDeathTime = virtualNow;
        if (consecutiveDeathsWithoutKill >= DEATH_LOOP_THRESHOLD) {
          deathLoopDetected = true;
        }
        s.combatPhase = 'boss_defeat';
        s.combatPhaseStartedAt = virtualNow;
      }

      continue; // Process recovery on next iteration
    }

    // ─── Normal clearing ───
    if (phase === 'clearing') {
      // Ensure pack exists
      if (s.packMobs.length === 0) {
        ensurePack(s, zone, virtualNow);
      }

      const { patch, result } = runCombatTick(s, TICK_DT, virtualNow);
      applyPatch(s, patch);
      ticksSimulated++;
      virtualNow += tickDtMs;

      if (result.mobKills > 0) {
        totalMobKills += result.mobKills;
        consecutiveDeathsWithoutKill = 0;

        // Check if pack is clear — count toward boss
        if (s.packMobs.length === 0) {
          clearsSinceBoss++;
          // Spawn next pack
          ensurePack(s, zone, virtualNow);
        }
      }

      if (result.zoneDeath) {
        totalDeaths++;
        consecutiveDeathsWithoutKill++;
        s.deathStreak++;
        s.lastDeathTime = virtualNow;
        clearsSinceBoss = 0; // Death resets boss progress
        if (consecutiveDeathsWithoutKill >= DEATH_LOOP_THRESHOLD) {
          deathLoopDetected = true;
        }
        // The patch already set combatPhase to 'zone_defeat'
        // Next iteration will fast-forward through recovery
      }

      continue;
    }

    // Fallback: advance clock to avoid infinite loop
    virtualNow += tickDtMs;
  }

  return {
    totalMobKills,
    totalDeaths,
    bossAttempts,
    bossVictories,
    bossLoot,
    ticksSimulated,
    deathLoopDetected,
    elapsedSimMs: performance.now() - wallStart,
  };
}

// ── Helpers ──

function emptyResult(elapsedMs: number): OfflineSimResult {
  return {
    totalMobKills: 0,
    totalDeaths: 0,
    bossAttempts: 0,
    bossVictories: 0,
    bossLoot: [],
    ticksSimulated: 0,
    deathLoopDetected: false,
    elapsedSimMs: elapsedMs,
  };
}

/** Spawn a fresh pack on the working state. */
function ensurePack(s: GameState, zone: typeof ZONE_DEFS[number], virtualNow: number): void {
  const mobId = pickCurrentMob(zone.id, s.targetedMobId);
  const hpMult = mobId ? (getMobTypeDef(mobId)?.hpMultiplier ?? 1.0) : 1.0;
  const invMult = s.currentZoneId && isZoneInvaded(s.invasionState, s.currentZoneId, zone.band)
    ? INVASION_DIFFICULTY_MULT : 1.0;
  s.packMobs = spawnPack(zone, hpMult, invMult, virtualNow);
  s.currentPackSize = s.packMobs.length;
  s.currentMobTypeId = mobId;
}

/** Apply a partial patch to mutable state. */
function applyPatch(s: GameState, patch: Partial<GameState>): void {
  for (const key of Object.keys(patch) as (keyof GameState)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any)[key] = (patch as any)[key];
  }
}

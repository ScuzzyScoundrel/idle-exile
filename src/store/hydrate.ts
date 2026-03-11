// ============================================================
// Hydrate Handler — runs after Zustand rehydrates persisted state
// Extracted from gameStore.ts (Phase E1)
// Resets ephemeral combat state + runs offline simulation
// ============================================================

import type { GameState, EquippedSkill, OfflineProgressSummary } from '../types';
import { resolveStats, calcXpToNext } from '../engine/character';
import { simulateIdleRun, simulateGatheringClear } from '../engine/zones';
import { simulateOfflineCombat } from '../engine/combat/offlineSim';
import { INVASION_DIFFICULTY_MULT } from '../data/balance';
import { ZONE_DEFS } from '../data/zones';
import { pickBestItem } from '../engine/items';
import { calcBagCapacity } from '../data/items';
import { addGatheringXp, calcGatherClearTime } from '../engine/gathering';
import { calcRareFindBonus } from '../engine/rareMaterials';
import { resolveProfessionBonuses } from '../engine/professionBonuses';
// getClassDef, getClassClearSpeedModifier, getClassDamageModifier no longer needed (headless sim handles this)
import { getDefaultSkillForWeapon } from '../engine/unifiedSkills';
import { getUnifiedSkillDef } from '../data/skills';
import { getFullEffect } from '../engine/combat/helpers';
import { addItemsWithOverflow } from '../engine/inventory/helpers';
import { pickCurrentMob } from '../engine/zones/helpers';
import { getMobTypeDef } from '../data/mobTypes';
import { spawnPack } from '../engine/packs';
import { isZoneInvaded } from '../engine/invasions';

/**
 * Post-rehydration handler. Resets ephemeral combat state, runs offline
 * simulation for elapsed time, and prepares the game for real-time play.
 *
 * Called by Zustand's `onRehydrateStorage` callback.
 * `scheduleQuestReset` is a callback to schedule daily quest check
 * (needs store to be fully initialized, so deferred via setTimeout).
 */
export function handleRehydrate(
  state: GameState,
  scheduleQuestReset: () => void,
): void {
  // Preserve persisted HP through rehydration (startIdleRun sets maxLife for new runs)
  // Clamp to valid range in case of stale data
  const rehydrateStats = resolveStats(state.character);
  state.currentHp = (state.currentHp > 0 && state.currentHp <= rehydrateStats.maxLife)
    ? state.currentHp
    : rehydrateStats.maxLife;
  // Recalculate xpToNext in case XP curve constants changed
  state.character.xpToNext = calcXpToNext(state.character.level);
  // Reset ES to full on rehydrate
  state.currentEs = rehydrateStats.energyShield;
  state.combatPhase = 'clearing';
  state.bossState = null;
  state.combatPhaseStartedAt = null;
  state.lastClearResult = null;

  // Reset talent tree ephemeral state
  state.lastHitMobTypeId = null;
  state.freeCastUntil = {};
  state.lastProcTriggerAt = {};

  // Check daily quest reset on rehydrate (deferred to next tick)
  setTimeout(scheduleQuestReset, 0);

  // Auto-assign default active skill to skillBar[0] if weapon equipped but no skill set
  if (state.character?.equipment?.mainhand?.weaponType) {
    const hasActiveSkill = state.skillBar?.some(s => {
      if (!s) return false;
      const def = getUnifiedSkillDef(s.skillId);
      return def?.kind === 'active';
    });
    if (!hasActiveSkill) {
      const wt = state.character.equipment.mainhand.weaponType;
      const defaultSkill = getDefaultSkillForWeapon(wt, state.character.level);
      if (defaultSkill) {
        if (!state.skillBar) state.skillBar = [null, null, null, null];
        state.skillBar[0] = { skillId: defaultSkill.id, autoCast: true };
      }
    }
  }

  const { currentZoneId, idleStartTime, character, idleMode } = state;
  if (!currentZoneId || !idleStartTime) return;

  const zone = ZONE_DEFS.find(z => z.id === currentZoneId);
  if (!zone) {
    // Zone no longer exists — reset run
    state.currentZoneId = null;
    state.idleStartTime = null;
    return;
  }

  const elapsedSeconds = (Date.now() - idleStartTime) / 1000;
  if (elapsedSeconds < 60) {
    // Short absence — let real-time tick handle it, but reset start time
    state.idleStartTime = Date.now();
    // Respawn pack if combat mode (packMobs is ephemeral, not persisted correctly)
    if (idleMode === 'combat') {
      const shortMobId = pickCurrentMob(currentZoneId, state.targetedMobId);
      const shortHpMult = shortMobId ? (getMobTypeDef(shortMobId)?.hpMultiplier ?? 1.0) : 1.0;
      const shortInvMult = isZoneInvaded(state.invasionState, currentZoneId, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
      state.packMobs = spawnPack(zone, shortHpMult, shortInvMult, Date.now());
      state.currentPackSize = state.packMobs.length;
      state.currentMobTypeId = shortMobId;
    }
    return;
  }

  // Null guards for unified skill bar fields
  if (!state.skillBar) state.skillBar = [null, null, null, null];
  if (!state.skillProgress) state.skillProgress = {};
  if (!state.skillTimers) state.skillTimers = [];

  // Reset ephemeral GCD state
  state.lastSkillActivation = 0;
  // Reset ephemeral real-time combat state (10K-A)
  state.nextActiveSkillAt = 0;
  // Reset ephemeral pack state
  state.packMobs = [];
  state.currentPackSize = 1;
  // Reset ephemeral debuffs (11B)
  state.activeDebuffs = [];
  state.craftLog = [];
  // Reset ephemeral combat state (Phase 1 — skill tree expansion)
  state.consecutiveHits = 0;
  state.lastSkillsCast = [];
  state.lastOverkillDamage = 0;
  state.killStreak = 0;
  state.lastCritAt = 0;
  state.lastBlockAt = 0;
  state.lastDodgeAt = 0;
  state.dodgeEntropy = Math.floor(Math.random() * 100);
  state.tempBuffs = [];
  state.skillCharges = {};
  state.rampingStacks = 0; state.rampingLastHitAt = 0;
  state.fortifyStacks = 0; state.fortifyExpiresAt = 0; state.fortifyDRPerStack = 0;

  // Ensure all equipped skills default to autoCast: true (fix for pre-10I saves)
  if (state.skillBar) {
    state.skillBar = state.skillBar.map((s: EquippedSkill | null) => {
      if (s && !s.autoCast) return { ...s, autoCast: true };
      return s;
    }) as (EquippedSkill | null)[];
  }

  // Clean up stale skill timers
  if (state.skillTimers && state.skillTimers.length > 0) {
    state.skillTimers = state.skillTimers.map(t => ({
      ...t,
      cooldownUntil: t.cooldownUntil && t.cooldownUntil < Date.now() ? null : t.cooldownUntil,
      activatedAt: null, // Clear active buffs after offline
    }));
    // Remove timers for skills no longer in the skill bar
    const equippedSkillIds = new Set(state.skillBar.filter(Boolean).map(s => s!.skillId));
    state.skillTimers = state.skillTimers.filter(t => equippedSkillIds.has(t.skillId));
  }

  if (idleMode === 'gathering') {
    // Gathering mode offline simulation
    const profession = state.selectedGatheringProfession;
    if (!profession) {
      state.currentZoneId = null;
      state.idleStartTime = null;
      return;
    }
    const skillLevel = state.gatheringSkills[profession].level;
    const offlineProfBonuses = resolveProfessionBonuses(state.professionEquipment);
    const clearTime = calcGatherClearTime(skillLevel, zone, offlineProfBonuses.gatherSpeed);
    const clearsCompleted = Math.floor(elapsedSeconds / clearTime);

    if (clearsCompleted > 0) {
      let accMaterials: Record<string, number> = {};
      let totalGatheringXp = 0;
      const offlineYieldMult = 1.0 + offlineProfBonuses.gatherYield / 100;
      const offlineInstantChance = offlineProfBonuses.instantGather / 100;
      const offlineRareFindBonus = calcRareFindBonus(skillLevel, offlineProfBonuses.rareFind);
      for (let i = 0; i < clearsCompleted; i++) {
        const result = simulateGatheringClear(skillLevel, zone, profession, offlineYieldMult, offlineInstantChance, offlineRareFindBonus);
        for (const [key, val] of Object.entries(result.materials)) {
          accMaterials[key] = (accMaterials[key] || 0) + val;
        }
        totalGatheringXp += result.gatheringXp;
      }

      // Apply materials
      for (const [key, val] of Object.entries(accMaterials)) {
        state.materials[key] = (state.materials[key] || 0) + val;
      }

      // Apply gathering XP
      state.gatheringSkills = addGatheringXp(state.gatheringSkills, profession, totalGatheringXp);

      const summary: OfflineProgressSummary = {
        zoneId: zone.id,
        zoneName: zone.name,
        elapsedSeconds,
        clearsCompleted,
        items: [],
        autoSalvagedCount: 0,
        autoSalvagedDust: 0,
        autoSoldCount: 0,
        autoSoldGold: 0,
        goldGained: 0,
        xpGained: 0,
        materials: accMaterials,
        currencyDrops: { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
        bagDrops: {},
        bestItem: null,
      };

      state.offlineProgress = summary;
    }
    state.idleStartTime = Date.now();
    return;
  }

  // Combat mode offline simulation — headless combat engine
  const simResult = simulateOfflineCombat(state as GameState, elapsedSeconds);
  console.log(`[Offline] Headless sim: ${simResult.totalMobKills} kills, ${simResult.totalDeaths} deaths, ${simResult.bossVictories} boss kills in ${simResult.elapsedSimMs.toFixed(0)}ms (${simResult.ticksSimulated} ticks)`);

  // Use headless kill count to drive loot generation via existing simulateIdleRun
  const passiveEffect = getFullEffect(state, Date.now(), true);
  const syntheticClearTime = simResult.totalMobKills > 0
    ? elapsedSeconds / simResult.totalMobKills : 999;
  const result = simulateIdleRun(character, zone, elapsedSeconds, syntheticClearTime, passiveEffect);
  // Append boss loot from headless sim
  result.items.push(...simResult.bossLoot);

  if (simResult.totalMobKills === 0 && elapsedSeconds >= 60) {
    console.warn('[Offline] 0 kills despite', Math.round(elapsedSeconds), 's elapsed.',
      'deathLoop:', simResult.deathLoopDetected, 'zone:', zone.id);
  }

  // Dry run to estimate auto-salvage/auto-sell stats for display
  const capacity = calcBagCapacity(state.bagSlots);
  const { salvageStats, autoSoldGold: offlineAutoSoldGold, autoSoldCount: offlineAutoSoldCount } = addItemsWithOverflow(
    state.inventory,
    capacity,
    state.autoSalvageMinRarity,
    state.autoDisposalAction,
    { ...state.materials },
    result.items,
  );

  const best = pickBestItem(result.items);

  const summary: OfflineProgressSummary = {
    zoneId: zone.id,
    zoneName: zone.name,
    elapsedSeconds,
    clearsCompleted: simResult.totalMobKills,
    items: result.items,
    autoSalvagedCount: salvageStats.itemsSalvaged,
    autoSalvagedDust: salvageStats.dustGained,
    autoSoldCount: offlineAutoSoldCount,
    autoSoldGold: offlineAutoSoldGold,
    goldGained: result.goldGained,
    xpGained: result.xpGained,
    materials: result.materials,
    currencyDrops: result.currencyDrops,
    bagDrops: result.bagDrops,
    bestItem: best,
    totalDeaths: simResult.totalDeaths,
    bossVictories: simResult.bossVictories,
    deathLoopDetected: simResult.deathLoopDetected,
  };

  state.offlineProgress = summary;
  state.idleStartTime = Date.now();

  // Respawn pack for real-time combat after offline catchup
  if (idleMode === 'combat') {
    const offMobId = pickCurrentMob(currentZoneId, state.targetedMobId);
    const offHpMult = offMobId ? (getMobTypeDef(offMobId)?.hpMultiplier ?? 1.0) : 1.0;
    const offInvMult = isZoneInvaded(state.invasionState, currentZoneId, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;
    state.packMobs = spawnPack(zone, offHpMult, offInvMult, Date.now());
    state.currentPackSize = state.packMobs.length;
    state.currentMobTypeId = offMobId;
  }
}

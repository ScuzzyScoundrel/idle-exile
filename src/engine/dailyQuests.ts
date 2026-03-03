// ============================================================
// Idle Exile — Daily Quest Engine
// Pure TS: no React, no side effects.
// ============================================================

import type {
  QuestDef, QuestReward, QuestProgress,
  DailyQuestState, ZoneDef, MobTypeDef,
} from '../types';
import {
  QUEST_KILL_COUNTS, QUEST_CLEAR_COUNTS, QUEST_BOSS_COUNTS,
  QUEST_GOLD_REWARD, QUEST_XP_REWARD,
} from '../data/balance';

// ---------------------------------------------------------------------------
// Seeded RNG (Mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Convert a date string to a numeric seed. */
function dateSeed(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Quest Generation
// ---------------------------------------------------------------------------

/**
 * Generate daily quests for all accessible bands.
 * 3 quests per band: 1 kill_mob, 1 clear_zone, 1 defeat_boss.
 * Seeded by date so all players get the same quests on the same day.
 */
export function generateDailyQuests(
  dateStr: string,
  accessibleBands: number[],
  zonesByBand: Record<number, ZoneDef[]>,
  mobTypesByZone: Record<string, MobTypeDef[]>,
): QuestDef[] {
  const rng = mulberry32(dateSeed(dateStr));
  const quests: QuestDef[] = [];

  for (const band of accessibleBands) {
    const zones = zonesByBand[band];
    if (!zones || zones.length === 0) continue;

    const killCounts = QUEST_KILL_COUNTS[band - 1] ?? 150;
    const clearCounts = QUEST_CLEAR_COUNTS[band - 1] ?? 100;
    const bossCounts = QUEST_BOSS_COUNTS[band - 1] ?? 5;
    const goldReward = QUEST_GOLD_REWARD[band - 1] ?? 200;
    const xpReward = QUEST_XP_REWARD[band - 1] ?? 100;

    // Pick a random zone for this band
    const zoneIdx = Math.floor(rng() * zones.length);
    const zone = zones[zoneIdx];

    // Pick a random mob from that zone for kill quest
    const mobs = mobTypesByZone[zone.id] ?? [];
    const mobIdx = mobs.length > 0 ? Math.floor(rng() * mobs.length) : 0;
    const mob = mobs[mobIdx];

    // 1. Kill mob quest (1.5x reward)
    if (mob) {
      quests.push({
        id: `daily_${dateStr}_b${band}_kill`,
        band,
        objective: {
          type: 'kill_mob',
          targetId: mob.id,
          targetName: mob.name,
          required: killCounts,
        },
        reward: buildReward(Math.round(goldReward * 1.5), Math.round(xpReward * 1.5), band),
      });
    }

    // 2. Clear zone quest
    quests.push({
      id: `daily_${dateStr}_b${band}_clear`,
      band,
      objective: {
        type: 'clear_zone',
        targetId: zone.id,
        targetName: zone.name,
        required: clearCounts,
      },
      reward: buildReward(goldReward, xpReward, band),
    });

    // 3. Defeat boss quest (2x reward)
    // Pick a potentially different zone for boss quest
    const bossZoneIdx = Math.floor(rng() * zones.length);
    const bossZone = zones[bossZoneIdx];
    quests.push({
      id: `daily_${dateStr}_b${band}_boss`,
      band,
      objective: {
        type: 'defeat_boss',
        targetId: bossZone.id,
        targetName: bossZone.bossName,
        required: bossCounts,
      },
      reward: buildReward(goldReward * 2, xpReward * 2, band),
    });
  }

  return quests;
}

/** Build a quest reward with band-appropriate currencies. */
function buildReward(gold: number, xp: number, band: number): QuestReward {
  const reward: QuestReward = { gold, xp };

  // Band 3+ quests also award augment orbs
  if (band >= 3) {
    reward.currencies = { augment: band >= 5 ? 3 : 2 };
  }

  // Band 5+ add chaos orbs
  if (band >= 5) {
    reward.currencies = { ...reward.currencies, chaos: band >= 6 ? 2 : 1 };
  }

  return reward;
}

// ---------------------------------------------------------------------------
// Daily Reset
// ---------------------------------------------------------------------------

/** Get today's date as YYYY-MM-DD in UTC. */
export function getUtcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Check if daily quests should reset (date changed). */
export function shouldResetDailyQuests(state: DailyQuestState, now: Date = new Date()): boolean {
  const today = getUtcDateString(now);
  return state.questDate !== today;
}

// ---------------------------------------------------------------------------
// Progress Tracking
// ---------------------------------------------------------------------------

/** Create initial progress entries for a set of quests. */
export function createInitialProgress(quests: QuestDef[]): Record<string, QuestProgress> {
  const progress: Record<string, QuestProgress> = {};
  for (const q of quests) {
    progress[q.id] = { questId: q.id, current: 0, claimed: false };
  }
  return progress;
}

/** Update quest progress for mob kills. Returns updated progress map. */
export function updateQuestProgressForKills(
  quests: QuestDef[],
  progress: Record<string, QuestProgress>,
  mobTypeId: string,
  killCount: number,
): Record<string, QuestProgress> {
  const updated = { ...progress };
  for (const q of quests) {
    if (q.objective.type === 'kill_mob' && q.objective.targetId === mobTypeId) {
      const p = updated[q.id];
      if (p && !p.claimed) {
        updated[q.id] = { ...p, current: Math.min(p.current + killCount, q.objective.required) };
      }
    }
  }
  return updated;
}

/** Update quest progress for zone clears. */
export function updateQuestProgressForClears(
  quests: QuestDef[],
  progress: Record<string, QuestProgress>,
  zoneId: string,
  clearCount: number,
): Record<string, QuestProgress> {
  const updated = { ...progress };
  for (const q of quests) {
    if (q.objective.type === 'clear_zone' && q.objective.targetId === zoneId) {
      const p = updated[q.id];
      if (p && !p.claimed) {
        updated[q.id] = { ...p, current: Math.min(p.current + clearCount, q.objective.required) };
      }
    }
  }
  return updated;
}

/** Update quest progress for boss kills. */
export function updateQuestProgressForBossKill(
  quests: QuestDef[],
  progress: Record<string, QuestProgress>,
  zoneId: string,
): Record<string, QuestProgress> {
  const updated = { ...progress };
  for (const q of quests) {
    if (q.objective.type === 'defeat_boss' && q.objective.targetId === zoneId) {
      const p = updated[q.id];
      if (p && !p.claimed) {
        updated[q.id] = { ...p, current: Math.min(p.current + 1, q.objective.required) };
      }
    }
  }
  return updated;
}

/** Check if a quest is complete (progress >= required). */
export function isQuestComplete(quest: QuestDef, progress: QuestProgress | undefined): boolean {
  if (!progress) return false;
  return progress.current >= quest.objective.required;
}

// ============================================================
// Simulator Logger — Structured stats tracking & aggregation
// ============================================================

import type { Character, GearSlot, Item, CurrencyType } from '../src/types';
import { getAffixDef } from '../src/engine/items';
import { calcEhp } from './gear-eval';
import type {
  ClearLog, ZoneSummary, BotSummary, ProgressionSample,
  GearSnapshot, ItemDropLog, AggregateResult, ZoneAggregate,
  PercentileStats, UpgradeRecord,
} from './strategies/types';
import { ZONE_DEFS } from '../src/data/zones';

// ─── Per-Bot Logger ──────────────────────────────────────

export class BotLogger {
  readonly seed: number;
  readonly archetypeName: string;
  readonly gearStrategy: string;

  private clears: ClearLog[] = [];
  private zoneClearCounts: Record<string, number> = {};
  private zoneEntryLevels: Record<string, number> = {};
  private currentZoneId: string = '';
  private currentZoneClears = 0;
  private deaths: Record<string, number> = {};
  private upgradeRecords: UpgradeRecord[] = [];
  private bossFights: { zoneId: string; victory: boolean }[] = [];
  private progressionSamples: ProgressionSample[] = [];
  private lastUpgradePerSlot: Record<string, { clearNumber: number; iLvl: number }> = {};

  constructor(seed: number, archetypeName: string, gearStrategy: string) {
    this.seed = seed;
    this.archetypeName = archetypeName;
    this.gearStrategy = gearStrategy;
  }

  /** Track entering a new zone. */
  enterZone(zoneId: string, level: number): void {
    this.currentZoneId = zoneId;
    this.currentZoneClears = 0;
    if (!this.zoneEntryLevels[zoneId]) {
      this.zoneEntryLevels[zoneId] = level;
    }
  }

  /** Log a single clear. */
  logClear(log: ClearLog): void {
    this.clears.push(log);
    this.zoneClearCounts[log.zoneId] = (this.zoneClearCounts[log.zoneId] ?? 0) + 1;
    this.currentZoneClears++;
    if (log.died) {
      this.deaths[log.zoneId] = (this.deaths[log.zoneId] ?? 0) + 1;
    }
  }

  /** Log an item upgrade being equipped (with full affix data). */
  logUpgrade(record: UpgradeRecord): void {
    this.upgradeRecords.push(record);
    this.lastUpgradePerSlot[record.slot] = { clearNumber: record.clearNumber, iLvl: record.newILvl };
  }

  /** Log a boss fight result. */
  logBoss(zoneId: string, victory: boolean): void {
    this.bossFights.push({ zoneId, victory });
  }

  /** Sample progression data (call every N clears). */
  sampleProgression(clearNumber: number, char: Character, zoneId: string, clearTime: number, dps: number, refDamage?: number, refAccuracy?: number): void {
    this.progressionSamples.push({
      clearNumber,
      level: char.level,
      zoneId,
      clearTime,
      dps,
      ehp: calcEhp(char.stats, refDamage, refAccuracy),
    });
  }

  /** Build final bot summary. */
  buildSummary(
    char: Character, totalSimTime: number, armorPreference: string = 'any', totalDeathPenaltyTime: number = 0,
    craftingMetrics?: { craftingAttempts: number; craftingUpgrades: number; currencySpent: Record<CurrencyType, number>; currencyEarned: Record<CurrencyType, number> },
    finalDps: number = 0, refDamage?: number, refAccuracy?: number,
    skillProgress?: Record<string, { skillId: string; level: number; allocatedNodes: string[]; allocatedRanks: Record<string, number> }>,
  ): BotSummary {
    const zoneIndex = ZONE_DEFS.findIndex(z => z.id === this.currentZoneId);
    const zoneSummaries = this.buildZoneSummaries(char);

    // Find longest wall
    let longestWall = { zoneId: '', clears: 0 };
    for (const zs of zoneSummaries) {
      if (zs.clearsToProgress > longestWall.clears) {
        longestWall = { zoneId: zs.zoneId, clears: zs.clearsToProgress };
      }
    }

    // Death clustering: zones sorted by death count
    const deathClustering = Object.entries(this.deaths)
      .map(([zoneId, deaths]) => ({ zoneId, deaths }))
      .filter(d => d.deaths > 0)
      .sort((a, b) => b.deaths - a.deaths);

    const gearProgression: Record<string, { clearNumber: number; iLvl: number }> = {};
    for (const [slot, data] of Object.entries(this.lastUpgradePerSlot)) {
      gearProgression[slot] = data;
    }

    return {
      seed: this.seed,
      archetypeName: this.archetypeName,
      gearStrategy: this.gearStrategy,
      armorPreference,
      finalLevel: char.level,
      finalZoneIndex: zoneIndex,
      finalZoneId: this.currentZoneId,
      totalSimTime,
      totalClears: this.clears.length,
      totalDeaths: Object.values(this.deaths).reduce((a, b) => a + b, 0),
      totalBossKills: this.bossFights.filter(b => b.victory).length,
      totalBossDefeats: this.bossFights.filter(b => !b.victory).length,
      progressionCurve: this.progressionSamples,
      gearProgression: gearProgression as any,
      longestWall,
      deathClustering,
      zoneSummaries,
      finalDps,
      finalEhp: calcEhp(char.stats, refDamage, refAccuracy),
      totalDeathPenaltyTime,
      craftingAttempts: craftingMetrics?.craftingAttempts ?? 0,
      craftingUpgrades: craftingMetrics?.craftingUpgrades ?? 0,
      currencySpent: craftingMetrics?.currencySpent ?? { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
      currencyEarned: craftingMetrics?.currencyEarned ?? { augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0 },
      upgradeRecords: this.upgradeRecords,
      skillProgress: skillProgress ?? {},
    };
  }

  private buildZoneSummaries(char: Character): ZoneSummary[] {
    const summaries: ZoneSummary[] = [];
    const zoneIds = [...new Set(this.clears.map(c => c.zoneId))];

    for (const zoneId of zoneIds) {
      const zone = ZONE_DEFS.find(z => z.id === zoneId);
      if (!zone) continue;

      const zoneClears = this.clears.filter(c => c.zoneId === zoneId);
      if (zoneClears.length === 0) continue;

      const clearTimes = zoneClears.map(c => c.clearTime);
      const zoneUpgrades = this.upgradeRecords.filter(u =>
        zoneClears.some(c => c.clearNumber === u.clearNumber)
      );

      // Build gear snapshot from character's current equipment (simplified)
      const gearSnapshot: GearSnapshot[] = [];
      for (const [slot, item] of Object.entries(char.equipment)) {
        if (!item) continue;
        gearSnapshot.push({
          slot: slot as GearSlot,
          name: item.name,
          rarity: item.rarity,
          iLvl: item.iLvl,
          affixes: [...item.prefixes, ...item.suffixes].map(a => ({
            defId: a.defId,
            tier: a.tier,
            value: a.value,
          })),
        });
      }

      const bossInZone = this.bossFights.filter(b => b.zoneId === zoneId);

      summaries.push({
        zoneId,
        zoneName: zone.name,
        band: zone.band,
        clearsToProgress: zoneClears.length,
        clearsSpentFarming: Math.max(0, zoneClears.length - 20),
        levelAtEntry: this.zoneEntryLevels[zoneId] ?? zoneClears[0].playerLevel,
        levelAtExit: zoneClears[zoneClears.length - 1].playerLevel,
        deaths: this.deaths[zoneId] ?? 0,
        itemUpgrades: zoneUpgrades.length,
        upgradeSlots: zoneUpgrades.map(u => u.slot),
        avgClearTime: clearTimes.reduce((a, b) => a + b, 0) / clearTimes.length,
        minClearTime: Math.min(...clearTimes),
        maxClearTime: Math.max(...clearTimes),
        avgDamageTaken: zoneClears.reduce((a, c) => a + c.damageTaken, 0) / zoneClears.length,
        bossAttempts: bossInZone.length,
        bossVictories: bossInZone.filter(b => b.victory).length,
        bossDefeats: bossInZone.filter(b => !b.victory).length,
        gearSnapshot,
      });
    }
    return summaries;
  }
}

// ─── Aggregation ─────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * p / 100) - 1);
  return sorted[idx];
}

function calcPercentiles(values: number[]): PercentileStats {
  return {
    median: percentile(values, 50),
    p10: percentile(values, 10),
    p90: percentile(values, 90),
  };
}

/** Aggregate multiple bot summaries into a single result. */
export function aggregateBots(summaries: BotSummary[]): AggregateResult {
  if (summaries.length === 0) {
    return {
      archetypeName: '', gearStrategy: '', armorPreference: 'any', botCount: 0,
      finalZone: { median: 0, p10: 0, p90: 0 },
      finalLevel: { median: 0, p10: 0, p90: 0 },
      totalClears: { median: 0, p10: 0, p90: 0 },
      totalDeaths: { median: 0, p10: 0, p90: 0 },
      finalDps: { median: 0, p10: 0, p90: 0 },
      longestWallZone: '',
      zones: [],
    };
  }

  const first = summaries[0];

  // Collect all zone IDs across all bots
  const allZoneIds = new Set<string>();
  for (const s of summaries) {
    for (const zs of s.zoneSummaries) {
      allZoneIds.add(zs.zoneId);
    }
  }

  const zones: ZoneAggregate[] = [];
  for (const zoneId of allZoneIds) {
    const zone = ZONE_DEFS.find(z => z.id === zoneId);
    if (!zone) continue;

    const zoneData = summaries
      .map(s => s.zoneSummaries.find(zs => zs.zoneId === zoneId))
      .filter((z): z is ZoneSummary => z != null);

    if (zoneData.length === 0) continue;

    const ctpValues = zoneData.map(z => z.clearsToProgress);
    const ctp = calcPercentiles(ctpValues);

    zones.push({
      zoneId,
      zoneName: zone.name,
      band: zone.band,
      clearsToProgress: ctp,
      levelAtEntry: calcPercentiles(zoneData.map(z => z.levelAtEntry)),
      deaths: calcPercentiles(zoneData.map(z => z.deaths)),
      isGearWall: ctp.p90 > ctp.median * 3 && ctp.median > 10,
    });
  }

  // Find most common longest wall zone
  const wallCounts: Record<string, number> = {};
  for (const s of summaries) {
    if (s.longestWall.zoneId) {
      wallCounts[s.longestWall.zoneId] = (wallCounts[s.longestWall.zoneId] ?? 0) + 1;
    }
  }
  const longestWallZone = Object.entries(wallCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  return {
    archetypeName: first.archetypeName,
    gearStrategy: first.gearStrategy,
    armorPreference: first.armorPreference,
    botCount: summaries.length,
    finalZone: calcPercentiles(summaries.map(s => s.finalZoneIndex)),
    finalLevel: calcPercentiles(summaries.map(s => s.finalLevel)),
    totalClears: calcPercentiles(summaries.map(s => s.totalClears)),
    totalDeaths: calcPercentiles(summaries.map(s => s.totalDeaths)),
    finalDps: calcPercentiles(summaries.map(s => s.finalDps)),
    longestWallZone,
    zones,
  };
}

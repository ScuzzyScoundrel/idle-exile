#!/usr/bin/env node
// ============================================================
// Deep Dive Analysis — DPS scaling, crafting, strategy diff
// Usage: npx tsx sim/deep-dive.ts <results.json>
// ============================================================

import { readFileSync } from 'fs';
import type { RunOutput, BotSummary, CurrencyType } from './strategies/types';

const file = process.argv[2];
if (!file) { console.error('Usage: npx tsx sim/deep-dive.ts <results.json>'); process.exit(1); }
const data: RunOutput = JSON.parse(readFileSync(file, 'utf-8'));
const bots = data.botSummaries;

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
function avg(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function p(n: number, d = 1): string { return n.toFixed(d); }
function pct(n: number, t: number): string { return t > 0 ? `${(n / t * 100).toFixed(1)}%` : '0%'; }

console.log('='.repeat(80));
console.log('IDLE EXILE — DEEP DIVE ANALYSIS');
console.log(`Bots: ${bots.length} | File: ${file}`);
console.log('='.repeat(80));

// ─── 1. DPS SCALING FACTOR ──────────────────────────────────
console.log('\n### 1. DPS SCALING (early → late game)');
console.log('─'.repeat(70));
console.log('  Target: 15-20x DPS scaling over the full game');

const archetypes = [...new Set(bots.map(b => b.archetypeName))];

for (const arch of archetypes) {
  const archBots = bots.filter(b => b.archetypeName === arch && b.gearStrategy === 'balanced');
  if (!archBots.length) continue;

  // Get DPS at clear 100 and clear 5000
  const earlyDps: number[] = [];
  const lateDps: number[] = [];
  const earlyEhp: number[] = [];
  const lateEhp: number[] = [];

  for (const bot of archBots) {
    const curve = bot.progressionCurve;
    if (curve.length < 2) continue;

    // Find closest sample to clear 100 and 5000
    let early = curve[0];
    let late = curve[curve.length - 1];
    for (const s of curve) {
      if (Math.abs(s.clearNumber - 100) < Math.abs(early.clearNumber - 100)) early = s;
      if (Math.abs(s.clearNumber - 5000) < Math.abs(late.clearNumber - 5000)) late = s;
    }
    if (early.dps > 0) {
      earlyDps.push(early.dps);
      lateDps.push(late.dps);
      earlyEhp.push(early.ehp);
      lateEhp.push(late.ehp);
    }
  }

  const dpsScale = median(lateDps) / median(earlyDps);
  const ehpScale = median(lateEhp) / median(earlyEhp);
  console.log(`  ${arch.padEnd(20)} DPS: ${p(median(earlyDps),0)} → ${p(median(lateDps),0)} (${p(dpsScale,1)}x) | EHP: ${p(median(earlyEhp),0)} → ${p(median(lateEhp),0)} (${p(ehpScale,1)}x)`);
}

// ─── 2. STRATEGY DIFFERENTIATION (since all hit zone 25) ────
console.log('\n\n### 2. STRATEGY DIFFERENTIATION (time efficiency)');
console.log('─'.repeat(70));
console.log('  Since all strategies reach zone 25, comparing HOW they get there.\n');

// Clear time at each band by strategy
const strategies = ['balanced', 'aggressive', 'defensive'];
console.log('  Avg clear time by band × strategy:');
console.log('  Strategy     | Band 1 | Band 2 | Band 3 | Band 4 | Band 5 | Band 6');

for (const strat of strategies) {
  const sBots = bots.filter(b => b.gearStrategy === strat);
  const bands = [1, 2, 3, 4, 5, 6].map(band => {
    const times: number[] = [];
    for (const bot of sBots) {
      for (const zs of bot.zoneSummaries) {
        if (zs.band === band) times.push(zs.avgClearTime);
      }
    }
    return times.length ? p(median(times), 1) : '-';
  });
  console.log(`  ${strat.padEnd(12)} | ${bands.map(b => b.padStart(6)).join(' | ')}`);
}

// Total sim time by strategy
console.log('\n  Total sim time (seconds) by strategy:');
for (const strat of strategies) {
  const sBots = bots.filter(b => b.gearStrategy === strat);
  const simTimes = sBots.map(b => b.totalSimTime);
  const clearTimes = simTimes.map((t, i) => t - (sBots[i].totalDeathPenaltyTime ?? 0));
  console.log(`  ${strat.padEnd(12)} Total: ${p(median(simTimes),0)}s | Active: ${p(median(clearTimes),0)}s | Penalty: ${p(median(sBots.map(b => b.totalDeathPenaltyTime ?? 0)),0)}s`);
}

// Aggressive DPS advantage
console.log('\n  Aggressive vs Defensive DPS difference:');
for (const arch of archetypes) {
  const aggBots = bots.filter(b => b.archetypeName === arch && b.gearStrategy === 'aggressive');
  const defBots = bots.filter(b => b.archetypeName === arch && b.gearStrategy === 'defensive');
  if (!aggBots.length || !defBots.length) continue;
  const aggDps = median(aggBots.map(b => b.finalDps));
  const defDps = median(defBots.map(b => b.finalDps));
  const aggDeaths = median(aggBots.map(b => b.totalDeaths));
  const defDeaths = median(defBots.map(b => b.totalDeaths));
  const ratio = defDps > 0 ? aggDps / defDps : 0;
  console.log(`  ${arch.padEnd(20)} Agg DPS ${p(aggDps,0)} vs Def DPS ${p(defDps,0)} (${p(ratio,2)}x) | Deaths: ${p(aggDeaths,0)} vs ${p(defDeaths,0)}`);
}

// ─── 3. CRAFTING IMPACT ─────────────────────────────────────
console.log('\n\n### 3. CRAFTING IMPACT');
console.log('─'.repeat(70));

const totalAttempts = bots.reduce((a, b) => a + (b.craftingAttempts ?? 0), 0);
const totalUpgrades = bots.reduce((a, b) => a + (b.craftingUpgrades ?? 0), 0);
const avgAttempts = totalAttempts / bots.length;
const avgUpgrades = totalUpgrades / bots.length;
const hitRate = totalAttempts > 0 ? totalUpgrades / totalAttempts * 100 : 0;

console.log(`  Total crafting attempts: ${totalAttempts} (${p(avgAttempts,1)} per bot)`);
console.log(`  Total crafting upgrades: ${totalUpgrades} (${p(avgUpgrades,1)} per bot)`);
console.log(`  Hit rate: ${p(hitRate,1)}%`);

// Currency earned vs spent
const currencyTypes: CurrencyType[] = ['augment', 'chaos', 'divine', 'annul', 'exalt', 'greater_exalt', 'perfect_exalt'];
console.log('\n  Currency earned vs spent (totals across all bots):');
console.log('  Currency       | Earned   | Spent    | Net      | Utilization');
for (const ct of currencyTypes) {
  const earned = bots.reduce((a, b) => a + ((b.currencyEarned as any)?.[ct] ?? 0), 0);
  const spent = bots.reduce((a, b) => a + ((b.currencySpent as any)?.[ct] ?? 0), 0);
  if (earned === 0 && spent === 0) continue;
  console.log(`  ${ct.padEnd(14)} | ${String(earned).padStart(8)} | ${String(spent).padStart(8)} | ${String(earned - spent).padStart(8)} | ${pct(spent, earned).padStart(11)}`);
}

// ─── 4. BAND 2-3 DEATH ANALYSIS ────────────────────────────
console.log('\n\n### 4. BAND 2-3 DEATH SPIKE ANALYSIS');
console.log('─'.repeat(70));

// Per-zone death breakdown in bands 2-3
console.log('  Per-zone breakdown (Bands 2-3):');
console.log('  Zone                       | Band | Deaths | Clears | Death% | Avg ClearTime | Avg Lvl@Entry');

const zoneData: Record<string, { name: string; band: number; deaths: number; clears: number; clearTimes: number[]; entryLevels: number[] }> = {};
for (const bot of bots) {
  for (const zs of bot.zoneSummaries) {
    if (zs.band !== 2 && zs.band !== 3) continue;
    if (!zoneData[zs.zoneId]) zoneData[zs.zoneId] = { name: zs.zoneName, band: zs.band, deaths: 0, clears: 0, clearTimes: [], entryLevels: [] };
    zoneData[zs.zoneId].deaths += zs.deaths;
    zoneData[zs.zoneId].clears += zs.clearsToProgress;
    zoneData[zs.zoneId].clearTimes.push(zs.avgClearTime);
    zoneData[zs.zoneId].entryLevels.push(zs.levelAtEntry);
  }
}

for (const [id, d] of Object.entries(zoneData).sort((a, b) => b[1].deaths - a[1].deaths)) {
  const deathPct = d.clears > 0 ? d.deaths / d.clears * 100 : 0;
  console.log(`  ${d.name.padEnd(28)} | ${d.band}    | ${String(d.deaths).padStart(6)} | ${String(d.clears).padStart(6)} | ${p(deathPct,1).padStart(6)}% | ${p(median(d.clearTimes),1).padStart(13)}s | ${p(median(d.entryLevels),0).padStart(13)}`);
}

// Level at entry vs zone iLvl — are bots entering undergeared?
console.log('\n  Level delta at zone entry (playerLevel - zoneILvlMin):');
const levelDeltas: Record<number, number[]> = {};
for (const bot of bots) {
  for (const zs of bot.zoneSummaries) {
    if (!levelDeltas[zs.band]) levelDeltas[zs.band] = [];
    // Approximate: zone iLvl ≈ levelAtExit for last zone in that band
    levelDeltas[zs.band].push(zs.levelAtEntry);
  }
}

// ─── 5. CLEAR TIME FLOOR ANALYSIS ──────────────────────────
console.log('\n\n### 5. CLEAR TIME FLOOR ANALYSIS');
console.log('─'.repeat(70));
console.log('  Floor = baseClearTime × 0.10. How many zones are bots hitting the floor?\n');

const floorHits: Record<number, { total: number; atFloor: number }> = {};
for (const bot of bots) {
  for (const zs of bot.zoneSummaries) {
    if (!floorHits[zs.band]) floorHits[zs.band] = { total: 0, atFloor: 0 };
    floorHits[zs.band].total++;
    // Check if min clear time is within 5% of the floor
    // Band base clear times: 10, 14, 20, 32, 42, 78 roughly
    const baseTimes: Record<number, number> = { 1: 10, 2: 14, 3: 20, 4: 32, 5: 42, 6: 78 };
    const floor = (baseTimes[zs.band] ?? 10) * 0.10;
    if (zs.minClearTime <= floor * 1.05) {
      floorHits[zs.band].atFloor++;
    }
  }
}

console.log('  Band | Bot-zones | At Floor | Floor%');
for (const [band, data] of Object.entries(floorHits).sort((a, b) => +a[0] - +b[0])) {
  console.log(`     ${band} | ${String(data.total).padStart(9)} | ${String(data.atFloor).padStart(8)} | ${pct(data.atFloor, data.total).padStart(6)}`);
}

// ─── 6. EHP vs DEATHS CORRELATION ──────────────────────────
console.log('\n\n### 6. EHP EFFECTIVENESS');
console.log('─'.repeat(70));

// Group bots by EHP quartile and see death rates
const ehpValues = bots.map(b => b.finalEhp).sort((a, b) => a - b);
const q1 = ehpValues[Math.floor(ehpValues.length * 0.25)];
const q3 = ehpValues[Math.floor(ehpValues.length * 0.75)];

const lowEhp = bots.filter(b => b.finalEhp <= q1);
const midEhp = bots.filter(b => b.finalEhp > q1 && b.finalEhp <= q3);
const highEhp = bots.filter(b => b.finalEhp > q3);

console.log('  EHP Quartile      | Med EHP  | Med Deaths | Med DPS | Med Zone');
console.log(`  Low (< ${p(q1,0).padStart(6)})    | ${p(median(lowEhp.map(b => b.finalEhp)),0).padStart(8)} | ${p(median(lowEhp.map(b => b.totalDeaths)),0).padStart(10)} | ${p(median(lowEhp.map(b => b.finalDps)),0).padStart(7)} | ${p(median(lowEhp.map(b => b.finalZoneIndex)),1).padStart(8)}`);
console.log(`  Mid (${p(q1,0)}-${p(q3,0)})  | ${p(median(midEhp.map(b => b.finalEhp)),0).padStart(8)} | ${p(median(midEhp.map(b => b.totalDeaths)),0).padStart(10)} | ${p(median(midEhp.map(b => b.finalDps)),0).padStart(7)} | ${p(median(midEhp.map(b => b.finalZoneIndex)),1).padStart(8)}`);
console.log(`  High (> ${p(q3,0).padStart(6)})   | ${p(median(highEhp.map(b => b.finalEhp)),0).padStart(8)} | ${p(median(highEhp.map(b => b.totalDeaths)),0).padStart(10)} | ${p(median(highEhp.map(b => b.finalDps)),0).padStart(7)} | ${p(median(highEhp.map(b => b.finalZoneIndex)),1).padStart(8)}`);

// ─── 7. DPS COMPOSITION ────────────────────────────────────
console.log('\n\n### 7. ARMOR TYPE × STRATEGY DEEP CUT');
console.log('─'.repeat(70));

const armorTypes = ['plate', 'leather', 'cloth'];
console.log('  Armor × Strategy   | Med DPS | Med EHP  | Med Deaths | Penalty(s)');
for (const armor of armorTypes) {
  for (const strat of strategies) {
    const subset = bots.filter(b => b.armorPreference === armor && b.gearStrategy === strat);
    if (!subset.length) continue;
    console.log(`  ${(armor + '/' + strat).padEnd(20)} | ${p(median(subset.map(b => b.finalDps)),0).padStart(7)} | ${p(median(subset.map(b => b.finalEhp)),0).padStart(8)} | ${p(median(subset.map(b => b.totalDeaths)),0).padStart(10)} | ${p(median(subset.map(b => b.totalDeathPenaltyTime ?? 0)),0).padStart(10)}`);
  }
}

// ─── 8. PROGRESSION SPEED ───────────────────────────────────
console.log('\n\n### 8. PROGRESSION SPEED (clears to reach each band)');
console.log('─'.repeat(70));

// For each bot, find the clear number when they first entered each band
console.log('  Strategy     | Band 1 | Band 2 | Band 3 | Band 4 | Band 5 | Band 6');
for (const strat of strategies) {
  const sBots = bots.filter(b => b.gearStrategy === strat);
  const bands = [1, 2, 3, 4, 5, 6].map(band => {
    // Sum up clears in all zones below this band
    const clearsToReach: number[] = [];
    for (const bot of sBots) {
      let totalClears = 0;
      for (const zs of bot.zoneSummaries) {
        if (zs.band < band) totalClears += zs.clearsToProgress;
      }
      if (bot.zoneSummaries.some(zs => zs.band >= band)) {
        clearsToReach.push(totalClears);
      }
    }
    return clearsToReach.length ? p(median(clearsToReach), 0) : '-';
  });
  console.log(`  ${strat.padEnd(12)} | ${bands.map(b => b.padStart(6)).join(' | ')}`);
}

// ─── 9. WORST-CASE ANALYSIS ────────────────────────────────
console.log('\n\n### 9. WORST-CASE BOTS (bottom 10 by zone)');
console.log('─'.repeat(70));

const worst = [...bots].sort((a, b) => a.finalZoneIndex - b.finalZoneIndex).slice(0, 10);
console.log('  Archetype          | Strategy    | Armor   | Lv  | Zone | Deaths | DPS  | EHP');
for (const bot of worst) {
  console.log(`  ${bot.archetypeName.padEnd(20)} | ${bot.gearStrategy.padEnd(11)} | ${(bot.armorPreference || 'any').padEnd(7)} | ${String(bot.finalLevel).padStart(3)} | ${String(bot.finalZoneIndex).padStart(4)} | ${String(bot.totalDeaths).padStart(6)} | ${p(bot.finalDps,0).padStart(4)} | ${p(bot.finalEhp,0)}`);
}

// ─── 10. BEST-CASE ANALYSIS ────────────────────────────────
console.log('\n\n### 10. TOP PERFORMERS (lowest total deaths, zone 25)');
console.log('─'.repeat(70));

const best = bots.filter(b => b.finalZoneIndex === 25).sort((a, b) => a.totalDeaths - b.totalDeaths).slice(0, 10);
console.log('  Archetype          | Strategy    | Armor   | Lv  | Deaths | DPS  | EHP   | Penalty');
for (const bot of best) {
  console.log(`  ${bot.archetypeName.padEnd(20)} | ${bot.gearStrategy.padEnd(11)} | ${(bot.armorPreference || 'any').padEnd(7)} | ${String(bot.finalLevel).padStart(3)} | ${String(bot.totalDeaths).padStart(6)} | ${p(bot.finalDps,0).padStart(4)} | ${p(bot.finalEhp,0).padStart(5)} | ${p(bot.totalDeathPenaltyTime ?? 0,0)}s`);
}

console.log('\n' + '='.repeat(80));
console.log('END OF DEEP DIVE');
console.log('='.repeat(80));

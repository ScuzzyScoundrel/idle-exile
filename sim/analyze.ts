#!/usr/bin/env node
// ============================================================
// Deep Analysis Script — Reads sim JSON and produces balance report
// Usage: npx tsx sim/analyze.ts [path-to-json]
//        npx tsx sim/analyze.ts --compare before.json after.json
// ============================================================

import { readFileSync } from 'fs';
import type { RunOutput, BotSummary, ZoneSummary, ProgressionSample } from './strategies/types';

// ─── Helper ───────────────────────────────────────────────
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function p(n: number, d = 1): string { return n.toFixed(d); }
function delta(before: number, after: number): string {
  const diff = after - before;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${p(diff)}`;
}

// ─── Detect mode ──────────────────────────────────────────

const args = process.argv.slice(2);
const compareIdx = args.indexOf('--compare');

if (compareIdx >= 0) {
  // ═══════════════════════════════════════════════════════════
  // COMPARE MODE: before.json vs after.json
  // ═══════════════════════════════════════════════════════════
  const beforeFile = args[compareIdx + 1];
  const afterFile = args[compareIdx + 2];
  if (!beforeFile || !afterFile) {
    console.error('Usage: npx tsx sim/analyze.ts --compare <before.json> <after.json>');
    process.exit(1);
  }

  const before: RunOutput = JSON.parse(readFileSync(beforeFile, 'utf-8'));
  const after: RunOutput = JSON.parse(readFileSync(afterFile, 'utf-8'));

  console.log('='.repeat(80));
  console.log('IDLE EXILE — BALANCE COMPARISON ANALYSIS');
  console.log(`Before: ${beforeFile} (${before.botSummaries.length} bots, ${before.balanceVersion ?? 'v1'})`);
  console.log(`After:  ${afterFile} (${after.botSummaries.length} bots, ${after.balanceVersion ?? 'v1'})`);
  console.log('='.repeat(80));

  // --- 1. Deaths per 100 clears by band ---
  console.log('\n### 1. DEATHS PER 100 CLEARS BY BAND (before → after)');
  console.log('─'.repeat(70));

  function deathRateByBand(bots: BotSummary[]): Record<number, { deaths: number; clears: number }> {
    const result: Record<number, { deaths: number; clears: number }> = {};
    for (const bot of bots) {
      for (const zs of bot.zoneSummaries) {
        if (!result[zs.band]) result[zs.band] = { deaths: 0, clears: 0 };
        result[zs.band].deaths += zs.deaths;
        result[zs.band].clears += zs.clearsToProgress;
      }
    }
    return result;
  }

  const beforeDeaths = deathRateByBand(before.botSummaries);
  const afterDeaths = deathRateByBand(after.botSummaries);
  const allBands = [...new Set([...Object.keys(beforeDeaths), ...Object.keys(afterDeaths)].map(Number))].sort((a, b) => a - b);

  console.log('  Band | Before  | After   | Delta');
  for (const band of allBands) {
    const bRate = beforeDeaths[band]?.clears ? beforeDeaths[band].deaths / beforeDeaths[band].clears * 100 : 0;
    const aRate = afterDeaths[band]?.clears ? afterDeaths[band].deaths / afterDeaths[band].clears * 100 : 0;
    console.log(`     ${band} | ${p(bRate, 1).padStart(6)}% | ${p(aRate, 1).padStart(6)}% | ${delta(bRate, aRate)}%`);
  }

  // --- 2. Boss win rate by band ---
  console.log('\n### 2. BOSS WIN RATE BY BAND (before → after)');
  console.log('─'.repeat(70));

  function bossWinByBand(bots: BotSummary[]): Record<number, { attempts: number; wins: number }> {
    const result: Record<number, { attempts: number; wins: number }> = {};
    for (const bot of bots) {
      for (const zs of bot.zoneSummaries) {
        if (!result[zs.band]) result[zs.band] = { attempts: 0, wins: 0 };
        result[zs.band].attempts += zs.bossAttempts;
        result[zs.band].wins += zs.bossVictories;
      }
    }
    return result;
  }

  const beforeBoss = bossWinByBand(before.botSummaries);
  const afterBoss = bossWinByBand(after.botSummaries);

  console.log('  Band | Before  | After   | Delta');
  for (const band of allBands) {
    const bRate = beforeBoss[band]?.attempts ? beforeBoss[band].wins / beforeBoss[band].attempts * 100 : 0;
    const aRate = afterBoss[band]?.attempts ? afterBoss[band].wins / afterBoss[band].attempts * 100 : 0;
    console.log(`     ${band} | ${p(bRate, 1).padStart(6)}% | ${p(aRate, 1).padStart(6)}% | ${delta(bRate, aRate)}%`);
  }

  // --- 3. Final zone by archetype x strategy ---
  console.log('\n### 3. FINAL ZONE BY ARCHETYPE x STRATEGY (before → after)');
  console.log('─'.repeat(70));

  const archetypes = [...new Set(before.botSummaries.map(b => b.archetypeName))];
  const strategies = ['balanced', 'aggressive', 'defensive'];

  console.log('  Archetype          | Strategy    | Before | After  | Delta');
  for (const arch of archetypes) {
    for (const strat of strategies) {
      const bBots = before.botSummaries.filter(b => b.archetypeName === arch && b.gearStrategy === strat);
      const aBots = after.botSummaries.filter(b => b.archetypeName === arch && b.gearStrategy === strat);
      if (!bBots.length && !aBots.length) continue;
      const bZone = median(bBots.map(b => b.finalZoneIndex));
      const aZone = median(aBots.map(b => b.finalZoneIndex));
      console.log(`  ${arch.padEnd(20)} | ${strat.padEnd(11)} | ${p(bZone, 1).padStart(6)} | ${p(aZone, 1).padStart(6)} | ${delta(bZone, aZone)}`);
    }
  }

  // --- 4. Defense effectiveness ---
  console.log('\n### 4. DEFENSE EFFECTIVENESS (does defensive gear reach further?)');
  console.log('─'.repeat(70));

  console.log('  Strategy    | Before Zone | Before Deaths | After Zone | After Deaths');
  for (const strat of strategies) {
    const bBots = before.botSummaries.filter(b => b.gearStrategy === strat);
    const aBots = after.botSummaries.filter(b => b.gearStrategy === strat);
    const bZone = median(bBots.map(b => b.finalZoneIndex));
    const bDeaths = median(bBots.map(b => b.totalDeaths));
    const aZone = median(aBots.map(b => b.finalZoneIndex));
    const aDeaths = median(aBots.map(b => b.totalDeaths));
    console.log(`  ${strat.padEnd(11)} | ${p(bZone, 1).padStart(11)} | ${p(bDeaths, 0).padStart(13)} | ${p(aZone, 1).padStart(10)} | ${p(aDeaths, 0).padStart(12)}`);
  }

  // Verdict
  const afterDef = after.botSummaries.filter(b => b.gearStrategy === 'defensive');
  const afterAgg = after.botSummaries.filter(b => b.gearStrategy === 'aggressive');
  const defZone = median(afterDef.map(b => b.finalZoneIndex));
  const aggZone = median(afterAgg.map(b => b.finalZoneIndex));
  const defDeaths = median(afterDef.map(b => b.totalDeaths));
  const aggDeaths = median(afterAgg.map(b => b.totalDeaths));
  console.log(`\n  VERDICT: Defensive zone ${p(defZone,1)} vs Aggressive zone ${p(aggZone,1)}`);
  console.log(`  VERDICT: Defensive deaths ${p(defDeaths,0)} vs Aggressive deaths ${p(aggDeaths,0)}`);
  if (defZone >= aggZone) {
    console.log('  >>> DEFENSIVE GEAR NOW REACHES AS FAR OR FURTHER <<<');
  } else if (defDeaths < aggDeaths * 0.5) {
    console.log('  >>> DEFENSIVE GEAR DIES SIGNIFICANTLY LESS <<<');
  } else {
    console.log('  >>> DEFENSE STILL UNDERPERFORMING — may need further tuning <<<');
  }

  // --- 5. Death penalty time wasted ---
  console.log('\n### 5. DEATH PENALTY TIME WASTED BY STRATEGY');
  console.log('─'.repeat(70));

  console.log('  Strategy    | Med.Penalty(s) | % of Total Sim | Med.Deaths');
  for (const strat of strategies) {
    const sBots = after.botSummaries.filter(b => b.gearStrategy === strat);
    const penaltyTimes = sBots.map(b => b.totalDeathPenaltyTime ?? 0);
    const simTimes = sBots.map(b => b.totalSimTime);
    const deaths = sBots.map(b => b.totalDeaths);
    const medPenalty = median(penaltyTimes);
    const medSim = median(simTimes);
    const pct = medSim > 0 ? medPenalty / medSim * 100 : 0;
    console.log(`  ${strat.padEnd(11)} | ${p(medPenalty, 0).padStart(14)} | ${p(pct, 1).padStart(14)}% | ${p(median(deaths), 0).padStart(10)}`);
  }

  // --- 6. Armor type comparison ---
  console.log('\n### 6. ARMOR TYPE COMPARISON (plate vs leather vs cloth)');
  console.log('─'.repeat(70));

  const armorTypes = [...new Set(after.botSummaries.map(b => b.armorPreference).filter(Boolean))];
  if (armorTypes.length > 1) {
    console.log('  Armor   | Med.Zone | Med.Deaths | Med.DPS | Med.EHP | Penalty(s)');
    for (const armor of armorTypes) {
      const aBots = after.botSummaries.filter(b => b.armorPreference === armor);
      if (!aBots.length) continue;
      const zone = median(aBots.map(b => b.finalZoneIndex));
      const deaths = median(aBots.map(b => b.totalDeaths));
      const dps = median(aBots.map(b => b.finalDps));
      const ehp = median(aBots.map(b => b.finalEhp));
      const penalty = median(aBots.map(b => b.totalDeathPenaltyTime ?? 0));
      console.log(`  ${armor.padEnd(7)} | ${p(zone, 1).padStart(8)} | ${p(deaths, 0).padStart(10)} | ${p(dps, 0).padStart(7)} | ${p(ehp, 0).padStart(7)} | ${p(penalty, 0).padStart(10)}`);
    }

    // Per-archetype armor breakdown
    console.log('\n  Per-archetype armor breakdown (median zone):');
    console.log(`  ${'Archetype'.padEnd(20)} | ${armorTypes.map(a => a.padStart(8)).join(' | ')}`);
    for (const arch of [...new Set(after.botSummaries.map(b => b.archetypeName))]) {
      const cols = armorTypes.map(armor => {
        const aBots = after.botSummaries.filter(b => b.archetypeName === arch && b.armorPreference === armor);
        return aBots.length ? p(median(aBots.map(b => b.finalZoneIndex)), 1) : '-';
      });
      console.log(`  ${arch.padEnd(20)} | ${cols.map(c => c.padStart(8)).join(' | ')}`);
    }
  } else {
    console.log('  (No armor type differentiation in after dataset — run with --armor all)');
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF COMPARISON');
  console.log('='.repeat(80));

} else {
  // ═══════════════════════════════════════════════════════════
  // SINGLE FILE MODE: original analysis
  // ═══════════════════════════════════════════════════════════
  const file = args[0] || 'sim/results/run_2026-03-08T20-53-55-270Z.json';
  const data: RunOutput = JSON.parse(readFileSync(file, 'utf-8'));

  const bots = data.botSummaries;

  console.log('='.repeat(80));
  console.log('IDLE EXILE — DEEP BALANCE ANALYSIS');
  console.log(`Bots: ${bots.length} | File: ${file} | Balance: ${data.balanceVersion ?? 'v1'}`);
  console.log('='.repeat(80));

  // ─── 1. GEAR STRATEGY IMPACT ─────────────────────────────
  console.log('\n### 1. GEAR STRATEGY IMPACT (averaged across all archetypes)');
  console.log('─'.repeat(70));

  for (const strat of ['balanced', 'aggressive', 'defensive']) {
    const stratBots = bots.filter(b => b.gearStrategy === strat);
    const zones = stratBots.map(b => b.finalZoneIndex);
    const dps = stratBots.map(b => b.finalDps);
    const ehp = stratBots.map(b => b.finalEhp);
    const deaths = stratBots.map(b => b.totalDeaths);
    const levels = stratBots.map(b => b.finalLevel);

    console.log(`\n  ${strat.toUpperCase()} (${stratBots.length} bots):`);
    console.log(`    Zone:   median ${p(median(zones))} | avg ${p(avg(zones))}`);
    console.log(`    Level:  median ${p(median(levels))} | avg ${p(avg(levels))}`);
    console.log(`    DPS:    median ${p(median(dps))} | avg ${p(avg(dps))}`);
    console.log(`    EHP:    median ${p(median(ehp))} | avg ${p(avg(ehp))}`);
    console.log(`    Deaths: median ${p(median(deaths))} | avg ${p(avg(deaths))}`);
    const penaltyTimes = stratBots.map(b => b.totalDeathPenaltyTime ?? 0);
    if (penaltyTimes.some(t => t > 0)) {
      console.log(`    Death Penalty: median ${p(median(penaltyTimes),0)}s | avg ${p(avg(penaltyTimes),0)}s`);
    }
  }

  // ─── 2. PER-ARCHETYPE BREAKDOWN ──────────────────────────
  console.log('\n\n### 2. PER-ARCHETYPE BREAKDOWN (best gear strat for each)');
  console.log('─'.repeat(70));

  const archetypes = [...new Set(bots.map(b => b.archetypeName))];
  for (const arch of archetypes) {
    console.log(`\n  === ${arch} ===`);
    for (const strat of ['balanced', 'aggressive', 'defensive']) {
      const sb = bots.filter(b => b.archetypeName === arch && b.gearStrategy === strat);
      if (!sb.length) continue;
      const zones = sb.map(b => b.finalZoneIndex);
      const dps = sb.map(b => b.finalDps);
      const ehp = sb.map(b => b.finalEhp);
      const deaths = sb.map(b => b.totalDeaths);
      console.log(`    ${strat.padEnd(12)} Zone ${p(median(zones))} | DPS ${p(median(dps),0)} | EHP ${p(median(ehp),0)} | Deaths ${p(median(deaths),0)}`);
    }
  }

  // ─── 3. PROGRESSION CURVES ───────────────────────────────
  console.log('\n\n### 3. PROGRESSION CURVES (DPS + EHP at clear milestones)');
  console.log('─'.repeat(70));

  const milestones = [100, 250, 500, 1000, 2000, 3000, 5000];
  for (const arch of archetypes) {
    const archBots = bots.filter(b => b.archetypeName === arch && b.gearStrategy === 'balanced');
    if (!archBots.length) continue;
    console.log(`\n  ${arch} (balanced):`);
    console.log('    Clear#  | Level | Zone  | DPS     | EHP');
    for (const m of milestones) {
      const samples = archBots.map(b => {
        const curve = b.progressionCurve;
        let best = curve[0];
        for (const s of curve) {
          if (Math.abs(s.clearNumber - m) < Math.abs(best.clearNumber - m)) best = s;
        }
        return best;
      }).filter(Boolean);
      if (!samples.length) continue;
      const lvl = avg(samples.map(s => s.level));
      const zone = avg(samples.map(s => {
        const bot = archBots[0];
        const zi = bot.zoneSummaries.findIndex(z => z.zoneId === s.zoneId);
        return zi >= 0 ? zi : 0;
      }));
      const dps = avg(samples.map(s => s.dps));
      const ehp = avg(samples.map(s => s.ehp));
      console.log(`    ${String(m).padStart(6)}  | ${p(lvl,0).padStart(5)} | ${p(zone,0).padStart(5)} | ${p(dps,0).padStart(7)} | ${p(ehp,0)}`);
    }
  }

  // ─── 4. DEATH ANALYSIS BY BAND ──────────────────────────
  console.log('\n\n### 4. DEATH ANALYSIS BY BAND');
  console.log('─'.repeat(70));

  const bandDeaths: Record<number, { total: number; bots: number; zones: string[] }> = {};
  for (const bot of bots) {
    for (const zs of bot.zoneSummaries) {
      if (!bandDeaths[zs.band]) bandDeaths[zs.band] = { total: 0, bots: 0, zones: [] };
      bandDeaths[zs.band].total += zs.deaths;
      bandDeaths[zs.band].bots++;
      if (!bandDeaths[zs.band].zones.includes(zs.zoneName)) {
        bandDeaths[zs.band].zones.push(zs.zoneName);
      }
    }
  }

  for (const [band, info] of Object.entries(bandDeaths).sort((a, b) => +a[0] - +b[0])) {
    const deathsPerBot = info.total / info.bots;
    console.log(`  Band ${band}: ${info.total} total deaths (${p(deathsPerBot,1)} per bot-zone) across ${info.zones.length} zones`);
  }

  // ─── 5. ZONE WALL ANALYSIS ──────────────────────────────
  console.log('\n\n### 5. ZONE WALL ANALYSIS (zones where bots spend >50 median clears)');
  console.log('─'.repeat(70));

  interface ZoneWallData {
    zoneName: string;
    band: number;
    clears: number[];
    deaths: number[];
    avgClearTimes: number[];
  }
  const zoneWalls: Record<string, ZoneWallData> = {};

  for (const bot of bots) {
    for (const zs of bot.zoneSummaries) {
      if (!zoneWalls[zs.zoneId]) {
        zoneWalls[zs.zoneId] = { zoneName: zs.zoneName, band: zs.band, clears: [], deaths: [], avgClearTimes: [] };
      }
      zoneWalls[zs.zoneId].clears.push(zs.clearsToProgress);
      zoneWalls[zs.zoneId].deaths.push(zs.deaths);
      zoneWalls[zs.zoneId].avgClearTimes.push(zs.avgClearTime);
    }
  }

  const wallEntries = Object.entries(zoneWalls)
    .map(([id, d]) => ({ id, ...d, medClears: median(d.clears), avgClears: avg(d.clears), p90Clears: [...d.clears].sort((a,b) => a-b)[Math.floor(d.clears.length * 0.9)] || 0 }))
    .filter(z => z.medClears > 50)
    .sort((a, b) => b.medClears - a.medClears);

  console.log('  Zone                       | Band | Med.Clears | P90 Clears | Med.Deaths | Avg ClearTime');
  for (const z of wallEntries.slice(0, 15)) {
    const medDeaths = median(z.deaths);
    const avgCT = avg(z.avgClearTimes);
    console.log(`  ${z.zoneName.padEnd(28)} | ${z.band}    | ${p(z.medClears,0).padStart(10)} | ${p(z.p90Clears,0).padStart(10)} | ${p(medDeaths,0).padStart(10)} | ${p(avgCT,1)}s`);
  }

  // ─── 6. DPS vs EHP TRADEOFF ─────────────────────────────
  console.log('\n\n### 6. DPS vs EHP TRADEOFF (final stats by archetype x strategy)');
  console.log('─'.repeat(70));
  console.log('  Archetype          | Strategy    | DPS    | EHP    | DPS/EHP Ratio | Zone');

  for (const arch of archetypes) {
    for (const strat of ['balanced', 'aggressive', 'defensive']) {
      const sb = bots.filter(b => b.archetypeName === arch && b.gearStrategy === strat);
      if (!sb.length) continue;
      const dps = median(sb.map(b => b.finalDps));
      const ehp = median(sb.map(b => b.finalEhp));
      const zone = median(sb.map(b => b.finalZoneIndex));
      const ratio = ehp > 0 ? dps / ehp : 0;
      console.log(`  ${arch.padEnd(20)} | ${strat.padEnd(11)} | ${p(dps,0).padStart(6)} | ${p(ehp,0).padStart(6)} | ${p(ratio,3).padStart(13)} | ${p(zone,0)}`);
    }
  }

  // ─── 7. GEAR UPGRADE FREQUENCY ──────────────────────────
  console.log('\n\n### 7. GEAR UPGRADE FREQUENCY (avg upgrades per zone band)');
  console.log('─'.repeat(70));

  const upgradesByBand: Record<string, Record<number, number[]>> = {};
  for (const bot of bots) {
    const key = `${bot.archetypeName}/${bot.gearStrategy}`;
    if (!upgradesByBand[key]) upgradesByBand[key] = {};
    for (const zs of bot.zoneSummaries) {
      if (!upgradesByBand[key][zs.band]) upgradesByBand[key][zs.band] = [];
      upgradesByBand[key][zs.band].push(zs.itemUpgrades);
    }
  }

  console.log('  Archetype          | Band 1 | Band 2 | Band 3 | Band 4 | Band 5 | Band 6');
  for (const arch of archetypes) {
    const key = `${arch}/balanced`;
    const bandData = upgradesByBand[key] || {};
    const bands = [1, 2, 3, 4, 5, 6].map(b => {
      const vals = bandData[b] || [];
      return vals.length ? p(avg(vals), 1) : '-';
    });
    console.log(`  ${arch.padEnd(20)} | ${bands.map(b => b.padStart(6)).join(' | ')}`);
  }

  // ─── 8. CLEAR TIME PROGRESSION ──────────────────────────
  console.log('\n\n### 8. CLEAR TIME BY BAND (average across all bots)');
  console.log('─'.repeat(70));

  const clearTimeByBand: Record<number, number[]> = {};
  for (const bot of bots) {
    for (const zs of bot.zoneSummaries) {
      if (!clearTimeByBand[zs.band]) clearTimeByBand[zs.band] = [];
      clearTimeByBand[zs.band].push(zs.avgClearTime);
    }
  }

  for (const [band, times] of Object.entries(clearTimeByBand).sort((a, b) => +a[0] - +b[0])) {
    const med = median(times);
    const min = Math.min(...times);
    const max = Math.max(...times);
    console.log(`  Band ${band}: median ${p(med,1)}s | min ${p(min,1)}s | max ${p(max,1)}s | spread ${p(max/med,1)}x`);
  }

  // ─── 9. DEATH RATE BY ARCHETYPE ─────────────────────────
  console.log('\n\n### 9. DEATH RATE (deaths per 100 clears by band)');
  console.log('─'.repeat(70));

  console.log('  Archetype          | Band 1 | Band 2 | Band 3 | Band 4 | Band 5 | Band 6');
  for (const arch of archetypes) {
    const archBots = bots.filter(b => b.archetypeName === arch && b.gearStrategy === 'balanced');
    const bands = [1, 2, 3, 4, 5, 6].map(band => {
      let totalDeaths = 0;
      let totalClears = 0;
      for (const bot of archBots) {
        for (const zs of bot.zoneSummaries) {
          if (zs.band === band) {
            totalDeaths += zs.deaths;
            totalClears += zs.clearsToProgress;
          }
        }
      }
      return totalClears > 0 ? p(totalDeaths / totalClears * 100, 1) : '-';
    });
    console.log(`  ${arch.padEnd(20)} | ${bands.map(b => b.padStart(6)).join(' | ')}`);
  }

  // ─── 10. BOSS SUCCESS RATE ──────────────────────────────
  console.log('\n\n### 10. BOSS SUCCESS RATE BY BAND');
  console.log('─'.repeat(70));

  const bossStatsByBand: Record<number, { attempts: number; wins: number }> = {};
  for (const bot of bots) {
    for (const zs of bot.zoneSummaries) {
      if (!bossStatsByBand[zs.band]) bossStatsByBand[zs.band] = { attempts: 0, wins: 0 };
      bossStatsByBand[zs.band].attempts += zs.bossAttempts;
      bossStatsByBand[zs.band].wins += zs.bossVictories;
    }
  }

  for (const [band, stats] of Object.entries(bossStatsByBand).sort((a, b) => +a[0] - +b[0])) {
    const rate = stats.attempts > 0 ? (stats.wins / stats.attempts * 100) : 0;
    console.log(`  Band ${band}: ${stats.wins}/${stats.attempts} (${p(rate,1)}% win rate)`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(80));
}

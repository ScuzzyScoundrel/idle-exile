#!/usr/bin/env node
// ============================================================
// Headless Balance Simulator — CLI Entry Point
// Usage: npx tsx sim/runner.ts [options]
// ============================================================

// IMPORTANT: Install global mocks BEFORE any engine imports
import { installRng } from './rng';
import { installClock } from './clock';

// Parse args first (before mocks need to be active)
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const botsPerConfig = parseInt(getArg('bots', '10'));
const maxClears = parseInt(getArg('max-clears', '5000'));
const archetypeFilter = getArg('archetype', 'all').toLowerCase();
const gearStratFilter = getArg('gear-strat', 'all').toLowerCase();
const armorFilter = getArg('armor', 'all').toLowerCase();
const baseSeed = parseInt(getArg('seed', '42'));
const verbose = hasFlag('verbose');

// Now install mocks
installClock();

// Now safe to import engine code
import { Bot } from './bot';
import { ARCHETYPES as DAGGER_ARCHETYPES } from './strategies/dagger';
import { ARCHETYPES as SWORD_ARCHETYPES } from './strategies/sword';
import { ARCHETYPES as STAFF_ARCHETYPES } from './strategies/staff';
import { ARCHETYPES as BOW_ARCHETYPES } from './strategies/bow';
import { GEAR_STRATEGIES } from './strategies/types';

// All archetypes across all weapon types
const ARCHETYPES = [
  ...DAGGER_ARCHETYPES,
  ...SWORD_ARCHETYPES,
  ...STAFF_ARCHETYPES,
  ...BOW_ARCHETYPES,
];
import type { BotConfig, BotSummary, AggregateResult, GearWeights, ArmorPreference } from './strategies/types';
import { aggregateBots } from './logger';
import { ZONE_DEFS } from '../src/data/zones';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ARMOR_TYPES: ArmorPreference[] = ['plate', 'leather', 'cloth', 'any'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Filter configs ──────────────────────────────────────

const selectedArchetypes = archetypeFilter === 'all'
  ? ARCHETYPES
  : ARCHETYPES.filter(a => a.name.toLowerCase() === archetypeFilter || a.name.toLowerCase().startsWith(archetypeFilter));

const selectedStrategies = gearStratFilter === 'all'
  ? Object.entries(GEAR_STRATEGIES)
  : Object.entries(GEAR_STRATEGIES).filter(([name]) => name.toLowerCase().includes(gearStratFilter));

if (selectedArchetypes.length === 0) {
  console.error(`No archetype matching "${archetypeFilter}". Available: ${ARCHETYPES.map(a => a.name).join(', ')}`);
  process.exit(1);
}
if (selectedStrategies.length === 0) {
  console.error(`No gear strategy matching "${gearStratFilter}". Available: ${Object.keys(GEAR_STRATEGIES).join(', ')}`);
  process.exit(1);
}

const selectedArmors: ArmorPreference[] = armorFilter === 'all'
  ? ARMOR_TYPES
  : ARMOR_TYPES.filter(a => a === armorFilter);
if (selectedArmors.length === 0) {
  console.error(`No armor type matching "${armorFilter}". Available: plate, leather, cloth, any, all`);
  process.exit(1);
}
const armorLoop: ArmorPreference[] = selectedArmors;

// ─── Run simulations ─────────────────────────────────────

const totalConfigs = selectedArchetypes.length * selectedStrategies.length * armorLoop.length;
const totalBots = totalConfigs * botsPerConfig;

console.log(`\n=== Idle Exile Balance Simulator (Balance v2) ===`);
console.log(`Archetypes: ${selectedArchetypes.map(a => a.name).join(', ')}`);
console.log(`Strategies: ${selectedStrategies.map(([n]) => n).join(', ')}`);
console.log(`Armor types: ${armorLoop.join(', ')}`);
console.log(`Bots per config: ${botsPerConfig}`);
console.log(`Max clears: ${maxClears}`);
console.log(`Base seed: ${baseSeed}`);
console.log(`Total bots: ${totalBots}\n`);

const allSummaries: BotSummary[] = [];
const aggregates: AggregateResult[] = [];
let botIndex = 0;

for (const archetype of selectedArchetypes) {
  for (const [stratName, weights] of selectedStrategies) {
    for (const armorPref of armorLoop) {
      const configSummaries: BotSummary[] = [];

      for (let i = 0; i < botsPerConfig; i++) {
        const seed = baseSeed + botIndex;
        botIndex++;

        // Install fresh RNG for this bot
        installRng(seed);
        installClock();

        const config: BotConfig = {
          archetype,
          gearStrategy: stratName,
          gearWeights: weights,
          armorPreference: armorPref,
          seed,
          maxClears,
        };

        const bot = new Bot(config);
        const summary = bot.run();
        configSummaries.push(summary);
        allSummaries.push(summary);

        if (verbose) {
          const armorTag = armorPref !== 'any' ? `/${armorPref}` : '';
          console.log(`  [${archetype.name}/${stratName}${armorTag}] Seed ${seed}: Lv${summary.finalLevel} Zone ${summary.finalZoneIndex + 1} (${summary.finalZoneId}) | ${summary.totalClears} clears, ${summary.totalDeaths} deaths, DPS ${Math.round(summary.finalDps)}, Penalty ${summary.totalDeathPenaltyTime.toFixed(0)}s`);
        }

        // Progress indicator
        const pct = Math.round(botIndex / totalBots * 100);
        process.stdout.write(`\rProgress: ${botIndex}/${totalBots} (${pct}%)`);
      }

      const agg = aggregateBots(configSummaries);
      aggregates.push(agg);
    }
  }
}

console.log('\n');

// ─── Print Summary Tables ────────────────────────────────

// 1. Archetype Performance Matrix
console.log('┌──────────────────┬────────────┬─────────┬───────┬──────────┬────────┬────────┬────────┬─────────┬──────────────────┐');
console.log('│ Archetype        │ Gear       │ Armor   │ Bots  │ Med.Zone │ Med.Lv │ Deaths │ Clears │ Med.DPS │ Longest Wall     │');
console.log('├──────────────────┼────────────┼─────────┼───────┼──────────┼────────┼────────┼────────┼─────────┼──────────────────┤');

for (const agg of aggregates) {
  const wallZone = ZONE_DEFS.find(z => z.id === agg.longestWallZone);
  const wallName = wallZone ? wallZone.name.slice(0, 16) : 'N/A';
  const medZoneIdx = Math.round(agg.finalZone.median);
  const medZoneName = ZONE_DEFS[medZoneIdx]?.name ?? `Zone ${medZoneIdx}`;
  const armorLabel = agg.botCount > 0 ? (allSummaries.find(s => s.archetypeName === agg.archetypeName && s.gearStrategy === agg.gearStrategy)?.armorPreference ?? 'any') : 'any';

  console.log(
    `│ ${pad(agg.archetypeName, 16)} │ ${pad(agg.gearStrategy, 10)} │ ${pad(armorLabel, 7)} │ ${pad(String(agg.botCount), 5)} │ ${pad(medZoneName.slice(0, 8), 8)} │ ${pad(String(Math.round(agg.finalLevel.median)), 6)} │ ${pad(String(Math.round(agg.totalDeaths.median)), 6)} │ ${pad(String(Math.round(agg.totalClears.median)), 6)} │ ${pad(String(Math.round(agg.finalDps.median)), 7)} │ ${pad(wallName, 16)} │`
  );
}

console.log('└──────────────────┴────────────┴─────────┴───────┴──────────┴────────┴────────┴────────┴─────────┴──────────────────┘');

// 2. Gear Wall Report
const gearWalls = aggregates.flatMap(agg =>
  agg.zones.filter(z => z.isGearWall).map(z => ({
    ...z,
    archetype: agg.archetypeName,
    strategy: agg.gearStrategy,
  }))
);

if (gearWalls.length > 0) {
  console.log('\nGEAR WALLS DETECTED (P90 > 3x median clears):');
  for (const wall of gearWalls) {
    console.log(`  ${wall.zoneName} (Band ${wall.band}): Median ${Math.round(wall.clearsToProgress.median)} clears, P90 ${Math.round(wall.clearsToProgress.p90)} clears [${wall.archetype}/${wall.strategy}]`);
  }
} else {
  console.log('\nNo gear walls detected.');
}

// 3. Cross-archetype comparison
console.log('\nCROSS-ARCHETYPE COMPARISON (median zone reached):');
const byArchetype = new Map<string, number[]>();
for (const agg of aggregates) {
  const arr = byArchetype.get(agg.archetypeName) ?? [];
  arr.push(agg.finalZone.median);
  byArchetype.set(agg.archetypeName, arr);
}
const archetypeRanking = [...byArchetype.entries()]
  .map(([name, zones]) => ({ name, avgZone: zones.reduce((a, b) => a + b, 0) / zones.length }))
  .sort((a, b) => b.avgZone - a.avgZone);

for (const { name, avgZone } of archetypeRanking) {
  const zoneName = ZONE_DEFS[Math.round(avgZone)]?.name ?? `Zone ${Math.round(avgZone)}`;
  console.log(`  ${pad(name, 16)} → ${zoneName} (index ${avgZone.toFixed(1)})`);
}

// 4. Death clustering analysis
console.log('\nDEATH HOTSPOTS (most deaths across all bots):');
const deathByZone: Record<string, number> = {};
for (const s of allSummaries) {
  for (const dc of s.deathClustering) {
    deathByZone[dc.zoneId] = (deathByZone[dc.zoneId] ?? 0) + dc.deaths;
  }
}
const topDeathZones = Object.entries(deathByZone)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5);
for (const [zoneId, deaths] of topDeathZones) {
  const zone = ZONE_DEFS.find(z => z.id === zoneId);
  console.log(`  ${zone?.name ?? zoneId} (Band ${zone?.band}): ${deaths} total deaths`);
}

// ─── Save JSON ───────────────────────────────────────────

const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(resultsDir, `run_${timestamp}.json`);

const output = {
  timestamp: new Date().toISOString(),
  balanceVersion: 'v2',
  configs: selectedArchetypes.flatMap(a =>
    selectedStrategies.flatMap(([s]) =>
      armorLoop.map(armor => ({
        archetype: a.name,
        gearStrategy: s,
        armorPreference: armor,
        bots: botsPerConfig,
      }))
    )
  ),
  aggregates,
  botSummaries: allSummaries,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nFull results saved to: ${outputPath}`);

// ─── Helpers ─────────────────────────────────────────────

function pad(s: string, len: number): string {
  return s.padEnd(len).slice(0, len);
}

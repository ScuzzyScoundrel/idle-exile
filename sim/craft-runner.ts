#!/usr/bin/env node
// ============================================================
// Craft Bot Runner — CLI entry point for crafting simulations
// Usage: npx tsx sim/craft-runner.ts [options]
// ============================================================

// IMPORTANT: Install global mocks BEFORE any engine imports
import { installRng } from './rng';
import { installClock } from './clock';

// Parse args first
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const botsPerStrategy = parseInt(getArg('bots', '10'));
const maxClears = parseInt(getArg('max-clears', '5000'));
const strategyFilter = getArg('strategy', 'all').toLowerCase();
const baseSeed = parseInt(getArg('seed', '42'));
const verbose = hasFlag('verbose');

// Install mocks before engine imports
installClock();

// Now safe to import engine code
import { CraftBot } from './craft-bot';
import { CRAFT_STRATEGIES } from './craft-strategies';
import type { CraftBotSummary, CraftStrategy } from './craft-strategies';
import type { GatheringProfession } from '../src/types';
import { GATHERING_BAND_REQUIREMENTS } from '../src/data/gatheringProfessions';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Filter Strategies ──────────────────────────────────

const selectedStrategies = strategyFilter === 'all'
  ? CRAFT_STRATEGIES
  : CRAFT_STRATEGIES.filter(s => s.name.toLowerCase().includes(strategyFilter));

if (selectedStrategies.length === 0) {
  console.error(`No strategy matching "${strategyFilter}". Available: ${CRAFT_STRATEGIES.map(s => s.name).join(', ')}`);
  process.exit(1);
}

// ─── Run Simulations ────────────────────────────────────

const totalBots = selectedStrategies.length * botsPerStrategy;

console.log(`\n=== Idle Exile Crafting Profession Simulator ===`);
console.log(`Strategies: ${selectedStrategies.map(s => s.name).join(', ')}`);
console.log(`Bots per strategy: ${botsPerStrategy}`);
console.log(`Max clears: ${maxClears}`);
console.log(`Base seed: ${baseSeed}`);
console.log(`Total bots: ${totalBots}\n`);

const allSummaries: CraftBotSummary[] = [];
const strategyGroups = new Map<string, CraftBotSummary[]>();
let botIndex = 0;

for (const strategy of selectedStrategies) {
  const group: CraftBotSummary[] = [];

  for (let i = 0; i < botsPerStrategy; i++) {
    const seed = baseSeed + botIndex;
    botIndex++;

    const config = { strategy, seed, maxClears };
    const bot = new CraftBot(config);
    const summary = bot.run();

    group.push(summary);
    allSummaries.push(summary);

    if (verbose) {
      const primary = strategy.primaryGathering;
      console.log(`  [${strategy.name}] Seed ${seed}: G.Lv${summary.finalGatheringLevels[primary]} C.Lv${summary.finalCraftingLevel} | ${summary.totalCrafts} crafts, ${summary.totalRefines} refines, ${summary.rareDrops.length} rares`);
    }

    const pct = Math.round(botIndex / totalBots * 100);
    process.stdout.write(`\rProgress: ${botIndex}/${totalBots} (${pct}%)`);
  }

  strategyGroups.set(strategy.name, group);
}

console.log('\n');

// ─── Helper Functions ───────────────────────────────────

function pad(s: string, len: number): string {
  return s.padEnd(len).slice(0, len);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function p90(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.9)];
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─── Table 1: Strategy Performance Matrix ───────────────

console.log('╔══════════════════════╦═══════╦════════╦════════╦════════╦══════════╦══════════════════════════╗');
console.log('║ Strategy             ║ Bots  ║ G.Lvl  ║ C.Lvl  ║ Crafts ║ Refines  ║ Top Surplus              ║');
console.log('╠══════════════════════╬═══════╬════════╬════════╬════════╬══════════╬══════════════════════════╣');

for (const [name, group] of strategyGroups) {
  const strat = selectedStrategies.find(s => s.name === name)!;
  const gLvls = group.map(s => s.finalGatheringLevels[strat.primaryGathering]);
  const cLvls = group.map(s => s.finalCraftingLevel);
  const crafts = group.map(s => s.totalCrafts);
  const refines = group.map(s => s.totalRefines);

  // Find top surplus material
  const surplusAgg: Record<string, number> = {};
  for (const s of group) {
    for (const [matId, count] of Object.entries(s.finalSurplus)) {
      if (count > 0) surplusAgg[matId] = (surplusAgg[matId] ?? 0) + count;
    }
  }
  const topSurplus = Object.entries(surplusAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 1)
    .map(([id, count]) => `${id.slice(0, 16)} +${Math.round(count / group.length)}`)
    .join(', ') || 'none';

  console.log(
    `║ ${pad(name, 20)} ║ ${pad(String(group.length), 5)} ║ ${pad(String(Math.round(median(gLvls))), 6)} ║ ${pad(String(Math.round(median(cLvls))), 6)} ║ ${pad(String(Math.round(median(crafts))), 6)} ║ ${pad(String(Math.round(median(refines))), 8)} ║ ${pad(topSurplus, 24)} ║`,
  );
}

console.log('╚══════════════════════╩═══════╩════════╩════════╩════════╩══════════╩══════════════════════════╝');

// ─── Table 2: Gathering XP Milestones ───────────────────

console.log('\nGATHERING XP MILESTONES (median clears to reach level):');
console.log('┌──────────────────────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┐');
console.log('│ Strategy             │ L10   │ L15   │ L25   │ L30   │ L50   │ L75   │ L90   │ L100  │');
console.log('├──────────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤');

const milestoneTargets = [10, 15, 25, 30, 50, 75, 90, 100];

for (const [name, group] of strategyGroups) {
  const cols = milestoneTargets.map(level => {
    const values = group
      .map(s => s.gatheringMilestones[level])
      .filter((v): v is number => v !== undefined);
    if (values.length === 0) return '  ---';
    return pad(String(Math.round(median(values))), 5);
  });

  console.log(`│ ${pad(name, 20)} │ ${cols.join(' │ ')} │`);
}

console.log('└──────────────────────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘');

// ─── Table 3: Crafting XP Milestones ────────────────────

console.log('\nCRAFTING XP MILESTONES (median clears to reach level):');
console.log('┌──────────────────────┬───────┬───────┬───────┬───────┬───────┐');
console.log('│ Strategy             │ L15   │ L30   │ L50   │ L75   │ L90   │');
console.log('├──────────────────────┼───────┼───────┼───────┼───────┼───────┤');

const craftTargets = [15, 30, 50, 75, 90];

for (const [name, group] of strategyGroups) {
  const cols = craftTargets.map(level => {
    const values = group
      .map(s => s.craftingMilestones[level])
      .filter((v): v is number => v !== undefined);
    if (values.length === 0) return '  ---';
    return pad(String(Math.round(median(values))), 5);
  });

  console.log(`│ ${pad(name, 20)} │ ${cols.join(' │ ')} │`);
}

console.log('└──────────────────────┴───────┴───────┴───────┴───────┴───────┘');

// ─── Table 4: Material Flow ─────────────────────────────

console.log('\nMATERIAL FLOW (avg per bot: gathered → refined → crafted → surplus):');

for (const [name, group] of strategyGroups) {
  console.log(`\n  ${name}:`);

  // Aggregate material counts
  const gathered: Record<string, number> = {};
  const refined: Record<string, number> = {};
  const spent: Record<string, number> = {};
  const surplus: Record<string, number> = {};

  for (const s of group) {
    for (const [k, v] of Object.entries(s.totalGathered)) { gathered[k] = (gathered[k] ?? 0) + v; }
    for (const [k, v] of Object.entries(s.totalRefined)) { refined[k] = (refined[k] ?? 0) + v; }
    for (const [k, v] of Object.entries(s.totalSpentOnCrafts)) { spent[k] = (spent[k] ?? 0) + v; }
    for (const [k, v] of Object.entries(s.finalSurplus)) { if (v > 0) surplus[k] = (surplus[k] ?? 0) + v; }
  }

  const n = group.length;

  // Show top raw materials gathered
  const topGathered = Object.entries(gathered)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  for (const [matId, total] of topGathered) {
    const avgGathered = Math.round(total / n);
    const avgRefined = Math.round((refined[matId] ?? 0) / n);
    const avgSpent = Math.round((spent[matId] ?? 0) / n);
    const avgSurplus = Math.round((surplus[matId] ?? 0) / n);
    console.log(`    ${pad(matId, 24)} gathered:${pad(String(avgGathered), 6)} refined:${pad(String(avgRefined), 5)} crafted:${pad(String(avgSpent), 5)} surplus:${avgSurplus}`);
  }

  // Show refined materials
  const topRefined = Object.entries(refined)
    .filter(([k]) => !gathered[k]) // only show outputs, not inputs
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  if (topRefined.length > 0) {
    console.log('    --- Refined outputs ---');
    for (const [matId, total] of topRefined) {
      const avgMade = Math.round(total / n);
      const avgSpentC = Math.round((spent[matId] ?? 0) / n);
      const avgSurplusC = Math.round((surplus[matId] ?? 0) / n);
      console.log(`    ${pad(matId, 24)} produced:${pad(String(avgMade), 5)} → crafted:${pad(String(avgSpentC), 5)} surplus:${avgSurplusC}`);
    }
  }
}

// ─── Table 5: Refinement Throughput ─────────────────────

console.log('\nREFINEMENT THROUGHPUT (avg refines per tier per bot):');
console.log('┌──────────────────────┬───────┬───────┬───────┬───────┬───────┬───────┐');
console.log('│ Strategy             │ T1    │ T2    │ T3    │ T4    │ T5    │ T6    │');
console.log('├──────────────────────┼───────┼───────┼───────┼───────┼───────┼───────┤');

for (const [name, group] of strategyGroups) {
  const tiers = [1, 2, 3, 4, 5, 6].map(t => {
    const vals = group.map(s => s.refinesPerTier[t] ?? 0);
    return pad(String(Math.round(avg(vals))), 5);
  });

  console.log(`│ ${pad(name, 20)} │ ${tiers.join(' │ ')} │`);
}

console.log('└──────────────────────┴───────┴───────┴───────┴───────┴───────┴───────┘');

// ─── Table 6: Rare Material Drops ───────────────────────

console.log('\nRARE MATERIAL DROPS (avg per bot across all strategies):');

const rareTotals: Record<string, { count: number; earliestClear: number[] }> = {};
for (const s of allSummaries) {
  for (const drop of s.rareDrops) {
    if (!rareTotals[drop.rarity]) {
      rareTotals[drop.rarity] = { count: 0, earliestClear: [] };
    }
    rareTotals[drop.rarity].count++;
    rareTotals[drop.rarity].earliestClear.push(drop.clearNum);
  }
}

const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
for (const rarity of rarityOrder) {
  const data = rareTotals[rarity];
  if (!data) {
    console.log(`  ${pad(rarity, 12)}: 0 drops (avg 0 per bot)`);
    continue;
  }
  const avgPerBot = (data.count / allSummaries.length).toFixed(1);
  const avgFirstDrop = Math.round(avg(data.earliestClear));
  console.log(`  ${pad(rarity, 12)}: ${data.count} total (avg ${avgPerBot}/bot, first drop ~clear ${avgFirstDrop})`);
}

// ─── Table 7: Pain Points ───────────────────────────────

console.log('\nPAIN POINTS (auto-detected issues):');

const painCounts: Record<string, number> = {};
for (const s of allSummaries) {
  for (const pain of s.painPoints) {
    painCounts[pain] = (painCounts[pain] ?? 0) + 1;
  }
}

const sortedPains = Object.entries(painCounts).sort(([, a], [, b]) => b - a);
if (sortedPains.length === 0) {
  console.log('  None detected — all strategies completed smoothly.');
} else {
  for (const [pain, count] of sortedPains.slice(0, 15)) {
    const pct = Math.round(count / allSummaries.length * 100);
    console.log(`  [${pct}% of bots] ${pain}`);
  }
}

// ─── Table 8: Endgame Craft Quality ─────────────────────

console.log('\nENDGAME CRAFT QUALITY (T5/T6 crafted items):');

for (const [name, group] of strategyGroups) {
  const strat = selectedStrategies.find(s => s.name === name)!;
  if (!strat.craftingProfession) continue;

  const t5Items = group.flatMap(s => s.craftedItems.filter(i => i.recipeTier === 5));
  const t6Items = group.flatMap(s => s.craftedItems.filter(i => i.recipeTier === 6));
  const endgame = [...t5Items, ...t6Items];

  if (endgame.length === 0) {
    console.log(`  ${name}: No T5/T6 crafts achieved`);
    continue;
  }

  console.log(`  ${name}:`);

  // Rarity distribution
  const rarityDist: Record<string, number> = {};
  for (const item of endgame) {
    rarityDist[item.rarity] = (rarityDist[item.rarity] ?? 0) + 1;
  }
  const rarityStr = Object.entries(rarityDist)
    .map(([r, c]) => `${r}:${c}`)
    .join(', ');

  console.log(`    T5: ${t5Items.length} crafts | T6: ${t6Items.length} crafts`);
  console.log(`    Rarity spread: ${rarityStr}`);
  console.log(`    Avg affixes: ${avg(endgame.map(i => i.affixCount)).toFixed(1)}`);
  console.log(`    Avg iLvl: ${avg(endgame.map(i => i.iLvl)).toFixed(0)}`);
}

// ─── Crafts Per Tier Summary ────────────────────────────

console.log('\nCRAFTS PER TIER (avg per bot):');
console.log('┌──────────────────────┬───────┬───────┬───────┬───────┬───────┬───────┐');
console.log('│ Strategy             │ T1    │ T2    │ T3    │ T4    │ T5    │ T6    │');
console.log('├──────────────────────┼───────┼───────┼───────┼───────┼───────┼───────┤');

for (const [name, group] of strategyGroups) {
  const strat = selectedStrategies.find(s => s.name === name)!;
  if (!strat.craftingProfession) continue;

  const tiers = [1, 2, 3, 4, 5, 6].map(t => {
    const vals = group.map(s => s.craftsPerTier[t] ?? 0);
    return pad(String(Math.round(avg(vals))), 5);
  });

  console.log(`│ ${pad(name, 20)} │ ${tiers.join(' │ ')} │`);
}

console.log('└──────────────────────┴───────┴───────┴───────┴───────┴───────┴───────┘');

// ─── Sim Time Summary ───────────────────────────────────

console.log('\nSIM TIME (real-world hours per bot at max clears):');
for (const [name, group] of strategyGroups) {
  const totalSec = avg(group.map(s => s.totalSimTimeSec));
  const hours = totalSec / 3600;
  console.log(`  ${pad(name, 22)} ${hours.toFixed(1)}h (${Math.round(totalSec)}s sim time)`);
}

// ─── Save JSON ──────────────────────────────────────────

const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(resultsDir, `craft_run_${timestamp}.json`);

const output = {
  timestamp: new Date().toISOString(),
  config: {
    botsPerStrategy,
    maxClears,
    baseSeed,
    strategies: selectedStrategies.map(s => s.name),
  },
  summaries: allSummaries,
};

// Stream-write to avoid RangeError on large runs
const fd = fs.openSync(outputPath, 'w');
fs.writeSync(fd, `{\n"timestamp": ${JSON.stringify(output.timestamp)},\n"config": ${JSON.stringify(output.config, null, 2)},\n"summaries": [\n`);
for (let i = 0; i < allSummaries.length; i++) {
  const comma = i < allSummaries.length - 1 ? ',\n' : '\n';
  fs.writeSync(fd, JSON.stringify(allSummaries[i]) + comma);
}
fs.writeSync(fd, ']\n}\n');
fs.closeSync(fd);

console.log(`\nFull results saved to: ${outputPath}`);

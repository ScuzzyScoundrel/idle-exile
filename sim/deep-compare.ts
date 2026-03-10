/**
 * Deep cross-archetype comparison.
 * Usage: npx tsx sim/deep-compare.ts <poison-results.json> <crit-results.json> <dodge-results.json>
 */
import { readFileSync } from 'fs';

interface Sample { clearNumber: number; level: number; zoneId: string; clearTime: number; dps: number; ehp: number; }
interface ZoneSummary { zoneId: string; zoneName: string; band: number; clearsToProgress: number; deaths: number; levelAtEntry: number; levelAtExit: number; itemUpgrades: number; avgClearTime: number; bossAttempts: number; bossVictories: number; }
interface UpgradeRecord { clearNumber: number; band: number; slot: string; newILvl: number; newRarity: string; dpsBefore: number; dpsAfter: number; ehpBefore: number; ehpAfter: number; scoreBefore: number; scoreAfter: number; }
interface BotSummary {
  archetypeName: string; armorPreference: string; finalLevel: number; finalZoneIndex: number;
  totalClears: number; totalDeaths: number; finalDps: number; finalEhp: number;
  totalDeathPenaltyTime: number;
  progressionCurve: Sample[];
  zoneSummaries: ZoneSummary[];
  upgradeRecords: UpgradeRecord[];
  skillProgress: Record<string, { skillId: string; level: number; allocatedNodes: string[]; allocatedRanks: Record<string, number> }>;
}
interface ResultFile { aggregates: any[]; botSummaries: BotSummary[]; }

// Load all result files
const files = process.argv.slice(2);
if (files.length < 2) {
  console.error('Usage: npx tsx sim/deep-compare.ts <results1.json> <results2.json> ...');
  process.exit(1);
}

const allBots: BotSummary[] = [];
for (const f of files) {
  const data: ResultFile = JSON.parse(readFileSync(f, 'utf-8'));
  allBots.push(...data.botSummaries);
}

// Group by archetype+armor
type GroupKey = string;
const groups = new Map<GroupKey, BotSummary[]>();
for (const bot of allBots) {
  const key = `${bot.archetypeName}|${bot.armorPreference}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(bot);
}

// Focus on leather for consistent comparison
const leatherGroups = new Map<string, BotSummary[]>();
for (const [key, bots] of groups) {
  if (key.endsWith('|leather')) {
    leatherGroups.set(key.split('|')[0], bots);
  }
}

const archetypes = [...leatherGroups.keys()].sort();

// ═══════════════════════════════════════════════════════════
// SECTION 1: DPS Progression Curves (at key milestones)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 1: DPS PROGRESSION CURVES (leather, median across bots)');
console.log('═'.repeat(80));

const milestones = [100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000];

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Header
const hdr = 'Clear#'.padStart(7) + archetypes.map(a => a.padStart(16)).join('');
console.log(hdr);
console.log('-'.repeat(hdr.length));

for (const m of milestones) {
  const row = [String(m).padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const dpsValues = bots.map(b => {
      // Find closest sample to this milestone
      const sample = b.progressionCurve.find(s => s.clearNumber >= m);
      return sample?.dps ?? b.finalDps;
    });
    row.push(Math.round(median(dpsValues)).toLocaleString().padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 2: Zone Progression Speed (clears to progress per band)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 2: CLEARS TO PROGRESS BY BAND (leather, median)');
console.log('═'.repeat(80));

for (let band = 1; band <= 6; band++) {
  const row = [`Band ${band}`.padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const clears = bots.map(b => {
      const zones = b.zoneSummaries.filter(z => z.band === band);
      return zones.reduce((sum, z) => sum + z.clearsToProgress, 0);
    });
    row.push(Math.round(median(clears)).toLocaleString().padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 3: Death Rate by Band
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 3: DEATHS PER 100 CLEARS BY BAND (leather, median)');
console.log('═'.repeat(80));

for (let band = 1; band <= 6; band++) {
  const row = [`Band ${band}`.padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const rates = bots.map(b => {
      const zones = b.zoneSummaries.filter(z => z.band === band);
      const totalClears = zones.reduce((s, z) => s + z.clearsToProgress, 0);
      const totalDeaths = zones.reduce((s, z) => s + z.deaths, 0);
      return totalClears > 0 ? (totalDeaths / totalClears) * 100 : 0;
    });
    row.push(median(rates).toFixed(1).padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 4: Gear Quality (avg iLvl of upgrades by band)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 4: MEDIAN UPGRADE iLvl BY BAND (leather)');
console.log('═'.repeat(80));

for (let band = 1; band <= 6; band++) {
  const row = [`Band ${band}`.padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const avgILvls = bots.map(b => {
      const ups = b.upgradeRecords.filter(u => u.band === band);
      return ups.length > 0 ? ups.reduce((s, u) => s + u.newILvl, 0) / ups.length : 0;
    });
    const vals = avgILvls.filter(v => v > 0);
    row.push((vals.length > 0 ? Math.round(median(vals)) : 0).toString().padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 5: Upgrade Frequency (how many upgrades per band)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 5: MEDIAN UPGRADE COUNT BY BAND (leather)');
console.log('═'.repeat(80));

for (let band = 1; band <= 6; band++) {
  const row = [`Band ${band}`.padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const counts = bots.map(b => b.upgradeRecords.filter(u => u.band === band).length);
    row.push(Math.round(median(counts)).toString().padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 6: Talent Allocation Audit
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 6: TALENT ALLOCATION AUDIT (leather)');
console.log('═'.repeat(80));

for (const arch of archetypes) {
  const bots = leatherGroups.get(arch)!;
  console.log(`\n  ${arch}:`);
  // Take first bot as representative
  const bot = bots[0];
  for (const [skillId, prog] of Object.entries(bot.skillProgress)) {
    const totalRanks = Object.values(prog.allocatedRanks).reduce((s, r) => s + r, 0);
    const nodeCount = Object.keys(prog.allocatedRanks).length;
    console.log(`    ${skillId}: level ${prog.level}, ${totalRanks} ranks across ${nodeCount} nodes, graph nodes: ${prog.allocatedNodes.length}`);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 7: Final Stats Comparison
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 7: FINAL STATS (leather, median)');
console.log('═'.repeat(80));

const statsHeader = 'Stat'.padEnd(20) + archetypes.map(a => a.padStart(16)).join('');
console.log(statsHeader);
console.log('-'.repeat(statsHeader.length));

for (const stat of ['finalDps', 'finalEhp', 'totalDeaths', 'totalDeathPenaltyTime', 'finalLevel'] as const) {
  const row = [stat.padEnd(20)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const vals = bots.map(b => (b as any)[stat] as number);
    row.push(Math.round(median(vals)).toLocaleString().padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 8: DPS/EHP Ratio (offensive vs defensive balance)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 8: DPS/EHP RATIO AT KEY MILESTONES (leather, median)');
console.log('═'.repeat(80));

console.log('Clear#'.padStart(7) + archetypes.map(a => a.padStart(16)).join(''));
console.log('-'.repeat(7 + archetypes.length * 16));

for (const m of [500, 1000, 2000, 3000, 5000]) {
  const row = [String(m).padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const ratios = bots.map(b => {
      const sample = b.progressionCurve.find(s => s.clearNumber >= m);
      if (!sample) return 0;
      return sample.ehp > 0 ? sample.dps / sample.ehp : 0;
    });
    row.push(median(ratios).toFixed(2).padStart(16));
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 9: "Where does Crit pull away?" — DPS ratio over time
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 9: DPS RATIO vs FIRST ARCHETYPE OVER TIME');
console.log('═'.repeat(80));

const baseArch = archetypes[0]; // first alphabetically
console.log(`(All values are ratio vs ${baseArch})`);
console.log('Clear#'.padStart(7) + archetypes.map(a => a.padStart(16)).join(''));
console.log('-'.repeat(7 + archetypes.length * 16));

for (const m of milestones) {
  const baseBots = leatherGroups.get(baseArch)!;
  const baseDps = median(baseBots.map(b => {
    const s = b.progressionCurve.find(s => s.clearNumber >= m);
    return s?.dps ?? b.finalDps;
  }));

  const row = [String(m).padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const dpsVals = bots.map(b => {
      const s = b.progressionCurve.find(s => s.clearNumber >= m);
      return s?.dps ?? b.finalDps;
    });
    const archDps = median(dpsVals);
    const ratio = baseDps > 0 ? archDps / baseDps : 0;
    row.push(ratio.toFixed(1).padStart(16) + 'x');
  }
  console.log(row.join(''));
}

// ═══════════════════════════════════════════════════════════
// SECTION 10: Boss Win Rate by Band
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('SECTION 10: BOSS WIN RATE BY BAND (leather, median %)');
console.log('═'.repeat(80));

for (let band = 1; band <= 6; band++) {
  const row = [`Band ${band}`.padStart(7)];
  for (const arch of archetypes) {
    const bots = leatherGroups.get(arch)!;
    const rates = bots.map(b => {
      const zones = b.zoneSummaries.filter(z => z.band === band);
      const attempts = zones.reduce((s, z) => s + z.bossAttempts, 0);
      const wins = zones.reduce((s, z) => s + z.bossVictories, 0);
      return attempts > 0 ? (wins / attempts) * 100 : 100;
    });
    row.push((median(rates).toFixed(0) + '%').padStart(16));
  }
  console.log(row.join(''));
}

console.log('\n' + '═'.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('═'.repeat(80));

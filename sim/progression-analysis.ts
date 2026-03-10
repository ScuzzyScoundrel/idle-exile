/**
 * Idle Exile Sim Progression Analysis
 * Analyzes 840 bot summaries from a ~293MB sim results file.
 *
 * Sections:
 *   1. Weapon (mainhand) progression timeline
 *   2. Skill level progression milestones
 *   3. Gear completeness by armor preference
 *   4. DPS / EHP curves
 *   5. Upgrade frequency analysis
 *
 * Run:
 *   NODE_OPTIONS='--max-old-space-size=4096' npx tsx sim/progression-analysis.ts
 */

import * as fs from "fs";
import { fileURLToPath } from "url";
import * as path from "path";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProgressionPoint {
  clearNumber: number;
  level: number;
  zoneId: string;
  clearTime: number;
  dps: number;
  ehp: number;
}

interface UpgradeRecord {
  clearNumber: number;
  zoneId: string;
  band: number;
  slot: string;
  oldILvl: number | null;
  oldRarity: string | null;
  oldAffixes: unknown[] | null;
  newILvl: number;
  newRarity: string;
  newAffixes: unknown[];
  dpsBefore: number;
  dpsAfter: number;
  ehpBefore: number;
  ehpAfter: number;
  scoreBefore: number;
  scoreAfter: number;
}

interface ZoneSummary {
  zoneId: string;
  zoneName: string;
  band: number;
  clearsToProgress: number;
  clearsSpentFarming: number;
  levelAtEntry: number;
  levelAtExit: number;
  deaths: number;
  itemUpgrades: number;
  upgradeSlots: string[];
  avgClearTime: number;
  gearSnapshot: Array<{ slot: string; rarity: string; iLvl: number }>;
}

interface GearProgressionSlot {
  clearNumber: number;
  iLvl: number;
}

interface BotSummary {
  seed: number;
  archetypeName: string;
  gearStrategy: string;
  armorPreference: string;
  finalLevel: number;
  finalZoneIndex: number;
  finalZoneId: string;
  totalClears: number;
  totalDeaths: number;
  finalDps: number;
  finalEhp: number;
  progressionCurve: ProgressionPoint[];
  gearProgression: Record<string, GearProgressionSlot>;
  upgradeRecords: UpgradeRecord[];
  zoneSummaries: ZoneSummary[];
}

interface SimResults {
  timestamp: string;
  balanceVersion: string;
  botSummaries: BotSummary[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(item);
  }
  return map;
}

function fmt(n: number, decimals = 1): string {
  if (isNaN(n)) return "N/A";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(n: number): string {
  if (isNaN(n)) return "N/A";
  return Math.round(n).toLocaleString("en-US");
}

function hr(char = "-", len = 90): string {
  return char.repeat(len);
}

function sectionHeader(title: string): void {
  console.log("\n" + hr("="));
  console.log(`  ${title}`);
  console.log(hr("="));
}

// ── Main ─────────────────────────────────────────────────────────────────────


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(
  __dirname,
  "results/run_2026-03-09T19-34-41-016Z.json"
);

console.log(`Loading ${FILE} ...`);
const raw = fs.readFileSync(FILE, "utf8");
console.log(`Parsing ${(raw.length / 1e6).toFixed(1)} MB of JSON ...`);
const data: SimResults = JSON.parse(raw);
const bots = data.botSummaries;
console.log(`Loaded ${bots.length} bot summaries.\n`);

const ARCHETYPES = [...new Set(bots.map((b) => b.archetypeName))].sort();
const ARMOR_PREFS = [...new Set(bots.map((b) => b.armorPreference))].sort();

// ==========================================================================
// 1. WEAPON (MAINHAND) PROGRESSION TIMELINE
// ==========================================================================

sectionHeader("1. WEAPON (MAINHAND) PROGRESSION TIMELINE");

// iLvl tiers
const ILVL_TIERS: [number, number][] = [
  [1, 10],
  [11, 20],
  [21, 30],
  [31, 40],
  [41, 50],
];

// For each bot, find the FIRST clear number where mainhand reached each tier
interface WeaponMilestone {
  archetypeName: string;
  armorPreference: string;
  tierFirstReached: Map<string, number>; // "1-10" -> clearNumber
  finalWeaponClear: number;
  finalWeaponILvl: number;
}

const weaponMilestones: WeaponMilestone[] = [];

for (const bot of bots) {
  const mhUpgrades = bot.upgradeRecords
    .filter((r) => r.slot === "mainhand")
    .sort((a, b) => a.clearNumber - b.clearNumber);

  const tierFirstReached = new Map<string, number>();
  let maxILvl = 0;
  let maxClear = 0;

  for (const u of mhUpgrades) {
    if (u.newILvl > maxILvl) {
      maxILvl = u.newILvl;
      maxClear = u.clearNumber;
    }
    for (const [lo, hi] of ILVL_TIERS) {
      const key = `${lo}-${hi}`;
      if (u.newILvl >= lo && !tierFirstReached.has(key)) {
        tierFirstReached.set(key, u.clearNumber);
      }
    }
  }

  // Also check gearProgression.mainhand for final weapon info
  const gp = bot.gearProgression?.mainhand;
  if (gp && gp.iLvl > maxILvl) {
    maxILvl = gp.iLvl;
    maxClear = gp.clearNumber;
  }

  weaponMilestones.push({
    archetypeName: bot.archetypeName,
    armorPreference: bot.armorPreference,
    tierFirstReached,
    finalWeaponClear: maxClear,
    finalWeaponILvl: maxILvl,
  });
}

console.log("\n  Median clear# to first reach each weapon iLvl tier (all bots):\n");
console.log(
  `  ${"iLvl Tier".padEnd(12)} ${"Median".padStart(8)} ${"P10".padStart(8)} ${"P90".padStart(8)} ${"Bots".padStart(6)}`
);
console.log(`  ${hr("-", 44)}`);

for (const [lo, hi] of ILVL_TIERS) {
  const key = `${lo}-${hi}`;
  const clears = weaponMilestones
    .map((wm) => wm.tierFirstReached.get(key))
    .filter((v): v is number => v !== undefined);
  console.log(
    `  ${key.padEnd(12)} ${fmtInt(median(clears)).padStart(8)} ${fmtInt(percentile(clears, 10)).padStart(8)} ${fmtInt(percentile(clears, 90)).padStart(8)} ${String(clears.length).padStart(6)}`
  );
}

// Final weapon stats
const finalClears = weaponMilestones.map((wm) => wm.finalWeaponClear);
const finalILvls = weaponMilestones.map((wm) => wm.finalWeaponILvl);
console.log(`\n  Final (max) weapon:`);
console.log(
  `    Median iLvl: ${fmtInt(median(finalILvls))}   Median clear#: ${fmtInt(median(finalClears))}`
);
console.log(
  `    P10 clear#: ${fmtInt(percentile(finalClears, 10))}   P90 clear#: ${fmtInt(percentile(finalClears, 90))}`
);

// Breakdown by archetype
console.log("\n  Median clear# to final weapon, by archetype:\n");
console.log(
  `  ${"Archetype".padEnd(18)} ${"Median iLvl".padStart(12)} ${"Median Clear".padStart(13)} ${"Bots".padStart(6)}`
);
console.log(`  ${hr("-", 51)}`);

const byArchWeapon = groupBy(weaponMilestones, (wm) => wm.archetypeName);
for (const arch of ARCHETYPES) {
  const group = byArchWeapon.get(arch) ?? [];
  const clrs = group.map((g) => g.finalWeaponClear);
  const ilvls = group.map((g) => g.finalWeaponILvl);
  console.log(
    `  ${arch.padEnd(18)} ${fmtInt(median(ilvls)).padStart(12)} ${fmtInt(median(clrs)).padStart(13)} ${String(group.length).padStart(6)}`
  );
}

// ==========================================================================
// 2. SKILL LEVEL PROGRESSION
// ==========================================================================

sectionHeader("2. SKILL LEVEL PROGRESSION");

const LEVEL_MILESTONES = [10, 20, 30, 40, 50];

// From progressionCurve, find the first clear# where bot reached each level
interface LevelMilestone {
  archetypeName: string;
  milestones: Map<number, number>; // level -> clearNumber
  finalLevel: number;
}

const levelMilestones: LevelMilestone[] = [];

for (const bot of bots) {
  const milestones = new Map<number, number>();
  const curve = bot.progressionCurve;

  for (const target of LEVEL_MILESTONES) {
    // Find first sample where level >= target
    const point = curve.find((p) => p.level >= target);
    if (point) {
      milestones.set(target, point.clearNumber);
    }
  }

  levelMilestones.push({
    archetypeName: bot.archetypeName,
    milestones,
    finalLevel: bot.finalLevel,
  });
}

console.log("\n  Median clear# to reach each level milestone (all bots):\n");
console.log(
  `  ${"Level".padEnd(8)} ${"Median".padStart(8)} ${"P10".padStart(8)} ${"P90".padStart(8)} ${"Bots Reached".padStart(14)}`
);
console.log(`  ${hr("-", 40)}`);

for (const lvl of LEVEL_MILESTONES) {
  const clears = levelMilestones
    .map((lm) => lm.milestones.get(lvl))
    .filter((v): v is number => v !== undefined);
  console.log(
    `  ${String(lvl).padEnd(8)} ${fmtInt(median(clears)).padStart(8)} ${fmtInt(percentile(clears, 10)).padStart(8)} ${fmtInt(percentile(clears, 90)).padStart(8)} ${`${clears.length}/${bots.length}`.padStart(14)}`
  );
}

// Passive nodes = level - 1
console.log("\n  Passive tree progress (passives = level - 1):");
const finalLevels = bots.map((b) => b.finalLevel);
console.log(
  `    Final level range: ${Math.min(...finalLevels)} - ${Math.max(...finalLevels)}`
);
console.log(`    Median final level: ${fmtInt(median(finalLevels))}`);
console.log(
  `    Median final passives: ${fmtInt(median(finalLevels) - 1)}`
);

// By archetype
console.log("\n  Level milestones by archetype (median clear#):\n");

const headerCols = LEVEL_MILESTONES.map((l) => `Lv${l}`.padStart(7));
console.log(`  ${"Archetype".padEnd(18)} ${headerCols.join(" ")}`);
console.log(`  ${hr("-", 18 + 8 * LEVEL_MILESTONES.length)}`);

const byArchLevel = groupBy(levelMilestones, (lm) => lm.archetypeName);
for (const arch of ARCHETYPES) {
  const group = byArchLevel.get(arch) ?? [];
  const cols = LEVEL_MILESTONES.map((lvl) => {
    const clears = group
      .map((g) => g.milestones.get(lvl))
      .filter((v): v is number => v !== undefined);
    return fmtInt(median(clears)).padStart(7);
  });
  console.log(`  ${arch.padEnd(18)} ${cols.join(" ")}`);
}

// ==========================================================================
// 3. GEAR COMPLETENESS BY ARMOR TYPE
// ==========================================================================

sectionHeader("3. GEAR COMPLETENESS BY ARMOR TYPE");

const ALL_GEAR_SLOTS = [
  "mainhand",
  "offhand",
  "helmet",
  "shoulders",
  "chest",
  "gloves",
  "bracers",
  "belt",
  "pants",
  "boots",
  "cloak",
  "ring1",
  "neck",
  "trinket1",
];

const MAGIC_PLUS = new Set(["uncommon", "rare", "epic", "legendary"]);

// 3a: Average number of upgrades per armor preference
console.log("\n  Average total upgrades by armor preference:\n");
console.log(
  `  ${"Armor Pref".padEnd(12)} ${"Mean".padStart(8)} ${"Median".padStart(8)} ${"P10".padStart(8)} ${"P90".padStart(8)} ${"Bots".padStart(6)}`
);
console.log(`  ${hr("-", 52)}`);

const byArmor = groupBy(bots, (b) => b.armorPreference);
for (const pref of ARMOR_PREFS) {
  const group = byArmor.get(pref) ?? [];
  const counts = group.map((b) => b.upgradeRecords.length);
  console.log(
    `  ${pref.padEnd(12)} ${fmt(mean(counts)).padStart(8)} ${fmtInt(median(counts)).padStart(8)} ${fmtInt(percentile(counts, 10)).padStart(8)} ${fmtInt(percentile(counts, 90)).padStart(8)} ${String(group.length).padStart(6)}`
  );
}

// 3b: Median final iLvl by slot for each armor pref
console.log(
  "\n  Median final iLvl by slot and armor preference (from gearProgression):\n"
);

// Header
const armorCols = ARMOR_PREFS.map((p) => p.padStart(8));
console.log(`  ${"Slot".padEnd(14)} ${armorCols.join(" ")}`);
console.log(`  ${hr("-", 14 + 9 * ARMOR_PREFS.length)}`);

for (const slot of ALL_GEAR_SLOTS) {
  const cols = ARMOR_PREFS.map((pref) => {
    const group = byArmor.get(pref) ?? [];
    const ilvls = group
      .map((b) => b.gearProgression?.[slot]?.iLvl)
      .filter((v): v is number => v !== undefined && v > 0);
    return fmtInt(median(ilvls)).padStart(8);
  });
  console.log(`  ${slot.padEnd(14)} ${cols.join(" ")}`);
}

// 3c: Clears to fill all slots with magic+ rarity
const SIX_ARMOR_SLOTS = [
  "helmet",
  "shoulders",
  "chest",
  "gloves",
  "pants",
  "boots",
];

console.log(
  "\n  Median clears to fill all armor slots (6) with magic+ rarity:\n"
);

interface FillInfo {
  armorPreference: string;
  clearsToFill6: number | null;
  clearsToFillAll: number | null;
}

const fillInfos: FillInfo[] = [];

for (const bot of bots) {
  // Track when each slot first gets magic+ rarity
  const slotFirstMagic = new Map<string, number>();

  const sorted = [...bot.upgradeRecords].sort(
    (a, b) => a.clearNumber - b.clearNumber
  );
  for (const u of sorted) {
    if (MAGIC_PLUS.has(u.newRarity) && !slotFirstMagic.has(u.slot)) {
      slotFirstMagic.set(u.slot, u.clearNumber);
    }
  }

  // Check 6 armor slots
  const sixFilled = SIX_ARMOR_SLOTS.every((s) => slotFirstMagic.has(s));
  let clearsToFill6: number | null = null;
  if (sixFilled) {
    clearsToFill6 = Math.max(
      ...SIX_ARMOR_SLOTS.map((s) => slotFirstMagic.get(s)!)
    );
  }

  // Check all 14 slots
  const allFilled = ALL_GEAR_SLOTS.every((s) => slotFirstMagic.has(s));
  let clearsToFillAll: number | null = null;
  if (allFilled) {
    clearsToFillAll = Math.max(
      ...ALL_GEAR_SLOTS.map((s) => slotFirstMagic.get(s)!)
    );
  }

  fillInfos.push({
    armorPreference: bot.armorPreference,
    clearsToFill6,
    clearsToFillAll,
  });
}

console.log(
  `  ${"Armor Pref".padEnd(12)} ${"Median (6 slots)".padStart(18)} ${"% Filled".padStart(10)} ${"Median (all 14)".padStart(17)} ${"% Filled".padStart(10)}`
);
console.log(`  ${hr("-", 68)}`);

for (const pref of ARMOR_PREFS) {
  const group = fillInfos.filter((f) => f.armorPreference === pref);
  const fill6 = group
    .map((f) => f.clearsToFill6)
    .filter((v): v is number => v !== null);
  const fillAll = group
    .map((f) => f.clearsToFillAll)
    .filter((v): v is number => v !== null);
  const pct6 = ((fill6.length / group.length) * 100).toFixed(0);
  const pctAll = ((fillAll.length / group.length) * 100).toFixed(0);
  console.log(
    `  ${pref.padEnd(12)} ${fmtInt(median(fill6)).padStart(18)} ${(pct6 + "%").padStart(10)} ${fmtInt(median(fillAll)).padStart(17)} ${(pctAll + "%").padStart(10)}`
  );
}

// ==========================================================================
// 4. DPS / EHP CURVES
// ==========================================================================

sectionHeader("4. DPS / EHP CURVES");

const CLEAR_MILESTONES = [100, 500, 1000, 2000, 3000, 5000];

function getValueAtClear(
  curve: ProgressionPoint[],
  clearNum: number,
  field: "dps" | "ehp"
): number | undefined {
  // progressionCurve is sampled at 50, 100, 150, ..., 5000
  const point = curve.find((p) => p.clearNumber === clearNum);
  if (point) return point[field];
  // fallback: find nearest sample <= clearNum
  let closest: ProgressionPoint | undefined;
  for (const p of curve) {
    if (p.clearNumber <= clearNum) {
      if (!closest || p.clearNumber > closest.clearNumber) closest = p;
    }
  }
  return closest?.[field];
}

console.log("\n  Median DPS at clear milestones (all bots):\n");
const dpsCols = CLEAR_MILESTONES.map((c) => `@${fmtInt(c)}`.padStart(10));
console.log(`  ${"".padEnd(18)} ${dpsCols.join(" ")}`);
console.log(`  ${hr("-", 18 + 11 * CLEAR_MILESTONES.length)}`);

// All bots aggregate
{
  const cols = CLEAR_MILESTONES.map((c) => {
    const vals = bots
      .map((b) => getValueAtClear(b.progressionCurve, c, "dps"))
      .filter((v): v is number => v !== undefined);
    return fmt(median(vals), 1).padStart(10);
  });
  console.log(`  ${"ALL".padEnd(18)} ${cols.join(" ")}`);
}

// By archetype
for (const arch of ARCHETYPES) {
  const archBots = bots.filter((b) => b.archetypeName === arch);
  const cols = CLEAR_MILESTONES.map((c) => {
    const vals = archBots
      .map((b) => getValueAtClear(b.progressionCurve, c, "dps"))
      .filter((v): v is number => v !== undefined);
    return fmt(median(vals), 1).padStart(10);
  });
  console.log(`  ${arch.padEnd(18)} ${cols.join(" ")}`);
}

console.log("\n  Median EHP at clear milestones (all bots):\n");
console.log(`  ${"".padEnd(18)} ${dpsCols.join(" ")}`);
console.log(`  ${hr("-", 18 + 11 * CLEAR_MILESTONES.length)}`);

{
  const cols = CLEAR_MILESTONES.map((c) => {
    const vals = bots
      .map((b) => getValueAtClear(b.progressionCurve, c, "ehp"))
      .filter((v): v is number => v !== undefined);
    return fmt(median(vals), 0).padStart(10);
  });
  console.log(`  ${"ALL".padEnd(18)} ${cols.join(" ")}`);
}

for (const arch of ARCHETYPES) {
  const archBots = bots.filter((b) => b.archetypeName === arch);
  const cols = CLEAR_MILESTONES.map((c) => {
    const vals = archBots
      .map((b) => getValueAtClear(b.progressionCurve, c, "ehp"))
      .filter((v): v is number => v !== undefined);
    return fmt(median(vals), 0).padStart(10);
  });
  console.log(`  ${arch.padEnd(18)} ${cols.join(" ")}`);
}

// DPS growth ratio: final vs clear-100
console.log("\n  DPS growth ratio (final / clear-100 median):\n");
console.log(
  `  ${"Archetype".padEnd(18)} ${"DPS@100".padStart(10)} ${"Final DPS".padStart(10)} ${"Ratio".padStart(8)}`
);
console.log(`  ${hr("-", 48)}`);

for (const arch of ARCHETYPES) {
  const archBots = bots.filter((b) => b.archetypeName === arch);
  const dps100 = archBots
    .map((b) => getValueAtClear(b.progressionCurve, 100, "dps"))
    .filter((v): v is number => v !== undefined);
  const dpsFinal = archBots.map((b) => b.finalDps);
  const m100 = median(dps100);
  const mFinal = median(dpsFinal);
  console.log(
    `  ${arch.padEnd(18)} ${fmt(m100).padStart(10)} ${fmt(mFinal).padStart(10)} ${fmt(mFinal / m100, 1).padStart(8)}x`
  );
}

// ==========================================================================
// 5. UPGRADE FREQUENCY
// ==========================================================================

sectionHeader("5. UPGRADE FREQUENCY");

// 5a: Total upgrades per bot
const upgradesPerBot = bots.map((b) => b.upgradeRecords.length);
console.log("\n  Total upgrades per bot:");
console.log(`    Median: ${fmtInt(median(upgradesPerBot))}`);
console.log(`    Mean:   ${fmt(mean(upgradesPerBot))}`);
console.log(
  `    P10:    ${fmtInt(percentile(upgradesPerBot, 10))}`
);
console.log(
  `    P90:    ${fmtInt(percentile(upgradesPerBot, 90))}`
);
console.log(
  `    Range:  ${Math.min(...upgradesPerBot)} - ${Math.max(...upgradesPerBot)}`
);

// 5b: Upgrades by slot
console.log("\n  Upgrades by slot (across all bots):\n");

const slotUpgradeCounts = new Map<string, number[]>();
for (const slot of ALL_GEAR_SLOTS) {
  slotUpgradeCounts.set(slot, []);
}

for (const bot of bots) {
  const slotCounts = new Map<string, number>();
  for (const u of bot.upgradeRecords) {
    slotCounts.set(u.slot, (slotCounts.get(u.slot) ?? 0) + 1);
  }
  for (const slot of ALL_GEAR_SLOTS) {
    slotUpgradeCounts.get(slot)!.push(slotCounts.get(slot) ?? 0);
  }
}

// Sort by median upgrades descending
const slotStats = ALL_GEAR_SLOTS.map((slot) => {
  const counts = slotUpgradeCounts.get(slot)!;
  return {
    slot,
    median: median(counts),
    mean: mean(counts),
    total: counts.reduce((s, v) => s + v, 0),
  };
}).sort((a, b) => b.median - a.median || b.mean - a.mean);

console.log(
  `  ${"Slot".padEnd(14)} ${"Median".padStart(8)} ${"Mean".padStart(8)} ${"Total".padStart(8)}`
);
console.log(`  ${hr("-", 40)}`);

for (const s of slotStats) {
  console.log(
    `  ${s.slot.padEnd(14)} ${fmtInt(s.median).padStart(8)} ${fmt(s.mean).padStart(8)} ${fmtInt(s.total).padStart(8)}`
  );
}

// 5c: Upgrades by band
console.log("\n  Upgrades by band (across all bots):\n");

const bandUpgradeCounts = new Map<number, number[]>();
for (let band = 1; band <= 5; band++) {
  bandUpgradeCounts.set(band, []);
}

for (const bot of bots) {
  const bandCounts = new Map<number, number>();
  for (const u of bot.upgradeRecords) {
    bandCounts.set(u.band, (bandCounts.get(u.band) ?? 0) + 1);
  }
  for (let band = 1; band <= 5; band++) {
    bandUpgradeCounts.get(band)!.push(bandCounts.get(band) ?? 0);
  }
}

console.log(
  `  ${"Band".padEnd(8)} ${"Median".padStart(8)} ${"Mean".padStart(8)} ${"P10".padStart(8)} ${"P90".padStart(8)} ${"Total".padStart(8)}`
);
console.log(`  ${hr("-", 48)}`);

for (let band = 1; band <= 5; band++) {
  const counts = bandUpgradeCounts.get(band)!;
  const total = counts.reduce((s, v) => s + v, 0);
  console.log(
    `  ${String(band).padEnd(8)} ${fmtInt(median(counts)).padStart(8)} ${fmt(mean(counts)).padStart(8)} ${fmtInt(percentile(counts, 10)).padStart(8)} ${fmtInt(percentile(counts, 90)).padStart(8)} ${fmtInt(total).padStart(8)}`
  );
}

// 5d: Upgrade rarity breakdown
console.log("\n  Upgrade rarity breakdown (all bots combined):\n");

const rarityCounts = new Map<string, number>();
for (const bot of bots) {
  for (const u of bot.upgradeRecords) {
    rarityCounts.set(u.newRarity, (rarityCounts.get(u.newRarity) ?? 0) + 1);
  }
}

const totalUpgrades = [...rarityCounts.values()].reduce((s, v) => s + v, 0);
const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];

console.log(
  `  ${"Rarity".padEnd(14)} ${"Count".padStart(8)} ${"% of Total".padStart(12)}`
);
console.log(`  ${hr("-", 36)}`);

for (const rarity of rarityOrder) {
  const count = rarityCounts.get(rarity) ?? 0;
  const pct = ((count / totalUpgrades) * 100).toFixed(1);
  console.log(
    `  ${rarity.padEnd(14)} ${fmtInt(count).padStart(8)} ${(pct + "%").padStart(12)}`
  );
}
console.log(
  `  ${"TOTAL".padEnd(14)} ${fmtInt(totalUpgrades).padStart(8)}`
);

// ==========================================================================
// Summary
// ==========================================================================

sectionHeader("SUMMARY");

console.log(`
  Bots analyzed:      ${bots.length}
  Archetypes:         ${ARCHETYPES.join(", ")}
  Gear strategies:    ${[...new Set(bots.map((b) => b.gearStrategy))].sort().join(", ")}
  Armor preferences:  ${ARMOR_PREFS.join(", ")}
  Total clears/bot:   ${fmtInt(median(bots.map((b) => b.totalClears)))} median
  Final level range:  ${Math.min(...finalLevels)} - ${Math.max(...finalLevels)}
  Final DPS median:   ${fmt(median(bots.map((b) => b.finalDps)))}
  Final EHP median:   ${fmt(median(bots.map((b) => b.finalEhp)))}
  Total deaths med:   ${fmtInt(median(bots.map((b) => b.totalDeaths)))}
`);

console.log(hr("="));
console.log("  Analysis complete.");
console.log(hr("="));

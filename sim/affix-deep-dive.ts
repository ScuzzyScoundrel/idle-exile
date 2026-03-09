#!/usr/bin/env node
// ============================================================
// Affix Deep-Dive Analysis — per-spec affix-level insights
// Usage: npx tsx sim/affix-deep-dive.ts <results.json> [--archetype <name>]
// ============================================================

import * as fs from 'fs';
import type { RunOutput, BotSummary, UpgradeRecord } from './strategies/types';

// ─── CLI ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
if (!filePath) {
  console.error('Usage: npx tsx sim/affix-deep-dive.ts <results.json> [--archetype <name>]');
  process.exit(1);
}

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const archetypeFilter = getArg('archetype')?.toLowerCase();

const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RunOutput;
let bots = raw.botSummaries;

if (archetypeFilter) {
  bots = bots.filter(b => b.archetypeName.toLowerCase().includes(archetypeFilter));
  if (bots.length === 0) {
    console.error(`No bots matching archetype "${archetypeFilter}".`);
    process.exit(1);
  }
}

console.log(`\n=== Affix Deep-Dive Analysis ===`);
console.log(`Bots: ${bots.length} | Archetypes: ${[...new Set(bots.map(b => b.archetypeName))].join(', ')}\n`);

// Check that we have upgrade records
const totalRecords = bots.reduce((sum, b) => sum + (b.upgradeRecords?.length ?? 0), 0);
if (totalRecords === 0) {
  console.error('No upgradeRecords found in results. Re-run simulation with instrumented bot.ts.');
  process.exit(1);
}
console.log(`Total upgrade records: ${totalRecords}\n`);

// ─── Helpers ─────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pad(s: string, len: number): string {
  return s.padEnd(len).slice(0, len);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k) ?? [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}

// Collect all upgrade records grouped by archetype
const recordsByArchetype = groupBy(
  bots.flatMap(b => (b.upgradeRecords ?? []).map(r => ({ ...r, archetype: b.archetypeName, armor: b.armorPreference }))),
  r => r.archetype,
);

// ─── Section 1: Affix Frequency by Spec ──────────────────

console.log('═══════════════════════════════════════════════════════');
console.log(' 1. AFFIX FREQUENCY BY SPEC (final gear)');
console.log('═══════════════════════════════════════════════════════\n');

const botsByArchetype = groupBy(bots, b => b.archetypeName);

for (const [archName, archBots] of botsByArchetype) {
  const affixCounts: Record<string, number> = {};
  let totalAffixes = 0;

  for (const bot of archBots) {
    const lastZone = bot.zoneSummaries[bot.zoneSummaries.length - 1];
    if (!lastZone) continue;
    for (const gear of lastZone.gearSnapshot) {
      for (const affix of gear.affixes) {
        affixCounts[affix.defId] = (affixCounts[affix.defId] ?? 0) + 1;
        totalAffixes++;
      }
    }
  }

  const sorted = Object.entries(affixCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  console.log(`  ${archName} (${archBots.length} bots, ${totalAffixes} total affixes in final gear):`);
  for (const [defId, count] of sorted) {
    const pct = ((count / totalAffixes) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / totalAffixes * 50));
    console.log(`    ${pad(defId, 28)} ${pad(String(count), 5)} (${pad(pct + '%', 6)}) ${bar}`);
  }
  console.log('');
}

// ─── Section 2: Affix DPS Impact Ranking ─────────────────

console.log('═══════════════════════════════════════════════════════');
console.log(' 2. AFFIX DPS IMPACT RANKING (median DPS gain per affix)');
console.log('═══════════════════════════════════════════════════════\n');

for (const [archName, records] of recordsByArchetype) {
  // For each affix that appears in the NEW item but not the OLD, measure DPS delta
  const affixDpsGains: Record<string, number[]> = {};

  for (const r of records) {
    const dpsGain = r.dpsAfter - r.dpsBefore;
    const oldAffixIds = new Set(r.oldAffixes?.map(a => a.defId) ?? []);

    for (const affix of r.newAffixes) {
      if (!oldAffixIds.has(affix.defId)) {
        // This affix was added in the upgrade
        const arr = affixDpsGains[affix.defId] ?? [];
        arr.push(dpsGain);
        affixDpsGains[affix.defId] = arr;
      }
    }
  }

  const ranked = Object.entries(affixDpsGains)
    .map(([defId, gains]) => ({ defId, medianGain: median(gains), count: gains.length }))
    .filter(r => r.count >= 3) // min sample
    .sort((a, b) => b.medianGain - a.medianGain)
    .slice(0, 15);

  console.log(`  ${archName}:`);
  if (ranked.length === 0) {
    console.log('    (insufficient data)\n');
    continue;
  }
  for (const { defId, medianGain, count } of ranked) {
    const sign = medianGain >= 0 ? '+' : '';
    console.log(`    ${pad(defId, 28)} ${sign}${medianGain.toFixed(1)} DPS (n=${count})`);
  }
  console.log('');
}

// ─── Section 3: Tier Threshold Analysis ──────────────────

console.log('═══════════════════════════════════════════════════════');
console.log(' 3. TIER THRESHOLD ANALYSIS (affix tiers by zone band)');
console.log('═══════════════════════════════════════════════════════\n');

for (const [archName, records] of recordsByArchetype) {
  // Group by band, then find median tier for key affixes
  const byBand = groupBy(records, r => String(r.band));
  const bands = [...byBand.keys()].sort((a, b) => Number(a) - Number(b));

  // Find top-5 most common affixes across all records
  const affixFreq: Record<string, number> = {};
  for (const r of records) {
    for (const a of r.newAffixes) {
      affixFreq[a.defId] = (affixFreq[a.defId] ?? 0) + 1;
    }
  }
  const topAffixes = Object.entries(affixFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id]) => id);

  if (topAffixes.length === 0) continue;

  console.log(`  ${archName}:`);
  const header = `    ${pad('Band', 6)} ${topAffixes.map(a => pad(a.slice(0, 12), 13)).join('')}`;
  console.log(header);
  console.log(`    ${'─'.repeat(header.length - 4)}`);

  for (const band of bands) {
    const bandRecords = byBand.get(band)!;
    const cells: string[] = [];
    for (const affixId of topAffixes) {
      const tiers: number[] = [];
      for (const r of bandRecords) {
        for (const a of r.newAffixes) {
          if (a.defId === affixId) tiers.push(a.tier);
        }
      }
      cells.push(tiers.length > 0 ? `T${median(tiers).toFixed(0)} (n=${tiers.length})` : '—');
    }
    console.log(`    ${pad(`B${band}`, 6)} ${cells.map(c => pad(c, 13)).join('')}`);
  }
  console.log('');
}

// ─── Section 4: Affix Value Comparison Across Specs ──────

console.log('═══════════════════════════════════════════════════════');
console.log(' 4. AFFIX VALUE COMPARISON ACROSS SPECS');
console.log('═══════════════════════════════════════════════════════\n');

// Pivot: for each affix, show median DPS gain per spec
const allAffixDps: Record<string, Record<string, number[]>> = {};

for (const [archName, records] of recordsByArchetype) {
  for (const r of records) {
    const dpsGain = r.dpsAfter - r.dpsBefore;
    const oldIds = new Set(r.oldAffixes?.map(a => a.defId) ?? []);
    for (const a of r.newAffixes) {
      if (!oldIds.has(a.defId)) {
        if (!allAffixDps[a.defId]) allAffixDps[a.defId] = {};
        if (!allAffixDps[a.defId][archName]) allAffixDps[a.defId][archName] = [];
        allAffixDps[a.defId][archName].push(dpsGain);
      }
    }
  }
}

// Show affixes that appear in 2+ archetypes
const archNames = [...recordsByArchetype.keys()];
const multiSpecAffixes = Object.entries(allAffixDps)
  .filter(([, byArch]) => Object.keys(byArch).length >= 2)
  .sort(([a], [b]) => a.localeCompare(b));

if (multiSpecAffixes.length > 0) {
  const colWidth = 16;
  const header = `  ${pad('Affix', 28)} ${archNames.map(n => pad(n.slice(0, colWidth - 1), colWidth)).join('')}`;
  console.log(header);
  console.log(`  ${'─'.repeat(header.length - 2)}`);

  for (const [defId, byArch] of multiSpecAffixes) {
    const cells = archNames.map(arch => {
      const gains = byArch[arch];
      if (!gains || gains.length < 2) return '—';
      const m = median(gains);
      return `${m >= 0 ? '+' : ''}${m.toFixed(1)}`;
    });
    console.log(`  ${pad(defId, 28)} ${cells.map(c => pad(c, colWidth)).join('')}`);
  }
} else {
  console.log('  (not enough cross-spec data)');
}
console.log('');

// ─── Section 5: Armor Type Affix Availability ────────────

console.log('═══════════════════════════════════════════════════════');
console.log(' 5. ARMOR TYPE AFFIX AVAILABILITY');
console.log('═══════════════════════════════════════════════════════\n');

const allRecordsWithArmor = bots.flatMap(b =>
  (b.upgradeRecords ?? []).map(r => ({ ...r, botArmor: b.armorPreference }))
);

const byArmorType = groupBy(allRecordsWithArmor, r => r.botArmor);

for (const [armorType, records] of byArmorType) {
  const affixCounts: Record<string, number> = {};
  const dpsGains: Record<string, number[]> = {};
  const ehpGains: Record<string, number[]> = {};

  for (const r of records) {
    for (const a of r.newAffixes) {
      affixCounts[a.defId] = (affixCounts[a.defId] ?? 0) + 1;
      if (!dpsGains[a.defId]) dpsGains[a.defId] = [];
      dpsGains[a.defId].push(r.dpsAfter - r.dpsBefore);
      if (!ehpGains[a.defId]) ehpGains[a.defId] = [];
      ehpGains[a.defId].push(r.ehpAfter - r.ehpBefore);
    }
  }

  const sorted = Object.entries(affixCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log(`  ${armorType} armor (${records.length} upgrades):`);
  for (const [defId, count] of sorted) {
    const medDps = median(dpsGains[defId] ?? []);
    const medEhp = median(ehpGains[defId] ?? []);
    console.log(`    ${pad(defId, 28)} ${pad(String(count) + 'x', 6)} DPS${medDps >= 0 ? '+' : ''}${medDps.toFixed(1)}  EHP${medEhp >= 0 ? '+' : ''}${medEhp.toFixed(1)}`);
  }
  console.log('');
}

// ─── Section 6: Upgrade Drought Detection ────────────────

console.log('═══════════════════════════════════════════════════════');
console.log(' 6. UPGRADE DROUGHT DETECTION');
console.log('═══════════════════════════════════════════════════════\n');

for (const [archName, archBots] of botsByArchetype) {
  const droughts: { bot: number; from: number; to: number; gap: number; zoneId: string; band: number }[] = [];

  for (const bot of archBots) {
    const records = bot.upgradeRecords ?? [];
    if (records.length < 2) continue;

    const sorted = [...records].sort((a, b) => a.clearNumber - b.clearNumber);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].clearNumber - sorted[i - 1].clearNumber;
      if (gap >= 100) { // drought = 100+ clears between upgrades
        droughts.push({
          bot: bot.seed,
          from: sorted[i - 1].clearNumber,
          to: sorted[i].clearNumber,
          gap,
          zoneId: sorted[i].zoneId,
          band: sorted[i].band,
        });
      }
    }
  }

  if (droughts.length === 0) {
    console.log(`  ${archName}: No significant droughts detected.\n`);
    continue;
  }

  // Group by band
  const byBand = groupBy(droughts, d => String(d.band));
  console.log(`  ${archName} (${droughts.length} droughts ≥100 clears):`);
  for (const [band, bandDroughts] of [...byBand.entries()].sort(([a], [b]) => Number(a) - Number(b))) {
    const gaps = bandDroughts.map(d => d.gap);
    const medGap = median(gaps);
    const maxGap = Math.max(...gaps);
    console.log(`    Band ${band}: ${bandDroughts.length} droughts, median gap ${medGap.toFixed(0)}, max gap ${maxGap}`);
  }
  console.log('');
}

// ─── Section 7: Optimal Affix Priority Ladder ────────────

console.log('═══════════════════════════════════════════════════════');
console.log(' 7. OPTIMAL AFFIX PRIORITY LADDER (top-3 per spec/band)');
console.log('═══════════════════════════════════════════════════════\n');

for (const [archName, records] of recordsByArchetype) {
  const byBand = groupBy(records, r => String(r.band));
  const bands = [...byBand.keys()].sort((a, b) => Number(a) - Number(b));

  console.log(`  ${archName}:`);

  for (const band of bands) {
    const bandRecords = byBand.get(band)!;

    // For each affix, compute median score delta when it's added
    const affixScoreImpact: Record<string, number[]> = {};

    for (const r of bandRecords) {
      const scoreDelta = r.scoreAfter - r.scoreBefore;
      const oldIds = new Set(r.oldAffixes?.map(a => a.defId) ?? []);
      for (const a of r.newAffixes) {
        if (!oldIds.has(a.defId)) {
          if (!affixScoreImpact[a.defId]) affixScoreImpact[a.defId] = [];
          affixScoreImpact[a.defId].push(scoreDelta);
        }
      }
    }

    const ranked = Object.entries(affixScoreImpact)
      .map(([defId, deltas]) => ({ defId, medianDelta: median(deltas), count: deltas.length }))
      .filter(r => r.count >= 2)
      .sort((a, b) => b.medianDelta - a.medianDelta)
      .slice(0, 3);

    if (ranked.length === 0) continue;

    const labels = ranked.map((r, i) => `${i + 1}. ${r.defId} (+${r.medianDelta.toFixed(1)} score, n=${r.count})`).join('  ');
    console.log(`    Band ${pad(band, 3)} → ${labels}`);
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log(' Analysis complete.');
console.log('═══════════════════════════════════════════════════════');

/**
 * Analyze average affix tiers at each bot's max zone.
 * Usage: npx tsx sim/gear-tier-analysis.ts <results1.json> [results2.json ...]
 */
import { readFileSync } from 'fs';

interface Affix { defId: string; tier: number; value: number }
interface GearSnapshot { slot: string; name: string; rarity: string; iLvl: number; affixes: Affix[] }
interface ZoneSummary { zoneId: string; zoneName: string; band: number; gearSnapshot: GearSnapshot[] }
interface BotSummary {
  archetypeName: string;
  gearStrategy: string;
  armorPreference: string;
  finalLevel: number;
  finalZoneIndex: number;
  finalZoneId: string;
  totalClears: number;
  totalDeaths: number;
  zoneSummaries: ZoneSummary[];
}
interface ResultFile { botSummaries: BotSummary[] }

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: npx tsx sim/gear-tier-analysis.ts <results.json> ...');
  process.exit(1);
}

// Load all bots
const allBots: BotSummary[] = [];
for (const f of files) {
  const data: ResultFile = JSON.parse(readFileSync(f, 'utf-8'));
  allBots.push(...data.botSummaries);
}

// For each bot, get the gear snapshot from their final (max) zone
interface BotGearAtMax {
  archetype: string;
  armor: string;
  maxZoneIndex: number;
  maxZoneName: string;
  band: number;
  avgAffixTier: number;
  totalAffixes: number;
  gearSlots: number;
  emptySlots: number;
  avgILvl: number;
  tiersBySlot: Record<string, number>;
}

const botGearData: BotGearAtMax[] = [];

for (const bot of allBots) {
  // Get last zone summary (max zone reached)
  const lastZone = bot.zoneSummaries[bot.zoneSummaries.length - 1];
  if (!lastZone || !lastZone.gearSnapshot) continue;

  const snapshot = lastZone.gearSnapshot;
  let totalTier = 0;
  let affixCount = 0;
  let totalILvl = 0;
  let iLvlCount = 0;
  let emptySlots = 0;
  const tiersBySlot: Record<string, number> = {};

  for (const gear of snapshot) {
    if (!gear.affixes || gear.affixes.length === 0) {
      emptySlots++;
      continue;
    }
    const slotAvgTier = gear.affixes.reduce((s, a) => s + a.tier, 0) / gear.affixes.length;
    tiersBySlot[gear.slot] = slotAvgTier;
    for (const a of gear.affixes) {
      totalTier += a.tier;
      affixCount++;
    }
    totalILvl += gear.iLvl;
    iLvlCount++;
  }

  botGearData.push({
    archetype: bot.archetypeName,
    armor: bot.armorPreference,
    maxZoneIndex: bot.finalZoneIndex,
    maxZoneName: lastZone.zoneName,
    band: lastZone.band,
    avgAffixTier: affixCount > 0 ? totalTier / affixCount : 0,
    totalAffixes: affixCount,
    gearSlots: snapshot.length,
    emptySlots,
    avgILvl: iLvlCount > 0 ? totalILvl / iLvlCount : 0,
    tiersBySlot,
  });
}

// Group by armor type
const armorTypes = [...new Set(botGearData.map(b => b.armor))].sort();

console.log('\n========================================');
console.log('  GEAR TIER ANALYSIS AT MAX ZONE');
console.log('========================================\n');

for (const armor of armorTypes) {
  const bots = botGearData.filter(b => b.armor === armor);
  const avgTier = bots.reduce((s, b) => s + b.avgAffixTier, 0) / bots.length;
  const avgILvl = bots.reduce((s, b) => s + b.avgILvl, 0) / bots.length;
  const avgAffixes = bots.reduce((s, b) => s + b.totalAffixes, 0) / bots.length;
  const avgEmpty = bots.reduce((s, b) => s + b.emptySlots, 0) / bots.length;
  const avgZone = bots.reduce((s, b) => s + b.maxZoneIndex, 0) / bots.length;

  console.log(`── ${armor.toUpperCase()} ARMOR (${bots.length} bots) ──`);
  console.log(`  Avg Max Zone: ${avgZone.toFixed(1)}`);
  console.log(`  Avg Affix Tier: ${avgTier.toFixed(2)}`);
  console.log(`  Avg Item iLvl: ${avgILvl.toFixed(1)}`);
  console.log(`  Avg Total Affixes: ${avgAffixes.toFixed(1)}`);
  console.log(`  Avg Empty Slots: ${avgEmpty.toFixed(1)}`);
  console.log('');
}

// Group by archetype × armor for detailed view
console.log('\n========================================');
console.log('  DETAILED: ARCHETYPE × ARMOR');
console.log('========================================\n');

const archetypes = [...new Set(botGearData.map(b => b.archetype))].sort();

// Header
const header = ['Archetype', ...armorTypes.map(a => `${a} (tier/iLvl/zone)`)];
console.log(header.join(' | '));
console.log(header.map(h => '-'.repeat(h.length)).join('-|-'));

for (const arch of archetypes) {
  const cols = [arch.padEnd(18)];
  for (const armor of armorTypes) {
    const bots = botGearData.filter(b => b.archetype === arch && b.armor === armor);
    if (bots.length === 0) {
      cols.push('N/A');
      continue;
    }
    const avgTier = bots.reduce((s, b) => s + b.avgAffixTier, 0) / bots.length;
    const avgILvl = bots.reduce((s, b) => s + b.avgILvl, 0) / bots.length;
    const avgZone = bots.reduce((s, b) => s + b.maxZoneIndex, 0) / bots.length;
    cols.push(`T${avgTier.toFixed(1)} / iLvl ${avgILvl.toFixed(0)} / Z${avgZone.toFixed(0)}`);
  }
  console.log(cols.join(' | '));
}

// Band-level gear tier progression
console.log('\n\n========================================');
console.log('  GEAR TIER PROGRESSION BY BAND');
console.log('========================================\n');

// For each bot, get gear snapshot at the END of each band
const bandData: Map<number, { tier: number; iLvl: number; affixes: number; count: number }> = new Map();

for (const bot of allBots) {
  // Group zone summaries by band, take last zone in each band
  const byBand = new Map<number, ZoneSummary>();
  for (const zs of bot.zoneSummaries) {
    byBand.set(zs.band, zs); // last zone in band wins
  }

  for (const [band, zs] of byBand) {
    if (!zs.gearSnapshot) continue;
    let totalTier = 0;
    let affixCount = 0;
    let totalILvl = 0;
    let iLvlCount = 0;

    for (const gear of zs.gearSnapshot) {
      if (!gear.affixes || gear.affixes.length === 0) continue;
      for (const a of gear.affixes) {
        totalTier += a.tier;
        affixCount++;
      }
      totalILvl += gear.iLvl;
      iLvlCount++;
    }

    const entry = bandData.get(band) || { tier: 0, iLvl: 0, affixes: 0, count: 0 };
    if (affixCount > 0) {
      entry.tier += totalTier / affixCount;
      entry.iLvl += iLvlCount > 0 ? totalILvl / iLvlCount : 0;
      entry.affixes += affixCount;
      entry.count++;
    }
    bandData.set(band, entry);
  }
}

for (const [band, data] of [...bandData].sort((a, b) => a[0] - b[0])) {
  if (data.count === 0) continue;
  console.log(`Band ${band}: Avg Tier ${(data.tier / data.count).toFixed(2)} | Avg iLvl ${(data.iLvl / data.count).toFixed(1)} | Avg Affixes ${(data.affixes / data.count).toFixed(1)} (${data.count} bots)`);
}

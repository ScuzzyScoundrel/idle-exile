import { readFileSync } from 'fs';
const file = process.argv[2] || 'sim/results/run_2026-03-10T19-03-18-735Z.json';
const data = JSON.parse(readFileSync(file, 'utf-8'));

interface BotSummary {
  armorPreference: string;
  finalZoneIndex: number;
  totalDeaths: number;
  finalLevel: number;
  archetypeName: string;
}

const byArmor: Record<string, { zones: number[]; deaths: number[]; levels: number[] }> = {};
for (const bot of data.botSummaries as BotSummary[]) {
  const a = bot.armorPreference;
  if (!byArmor[a]) byArmor[a] = { zones: [], deaths: [], levels: [] };
  byArmor[a].zones.push(bot.finalZoneIndex);
  byArmor[a].deaths.push(bot.totalDeaths);
  byArmor[a].levels.push(bot.finalLevel);
}

console.log('\n=== ARMOR TYPE COMPARISON ===\n');
for (const [armor, d] of Object.entries(byArmor).sort()) {
  const avgZone = d.zones.reduce((a, b) => a + b, 0) / d.zones.length;
  const totalDeaths = d.deaths.reduce((a, b) => a + b, 0);
  const avgLevel = d.levels.reduce((a, b) => a + b, 0) / d.levels.length;
  console.log(
    `${armor.padEnd(8)} | Avg Zone: ${avgZone.toFixed(1)} | Total Deaths: ${totalDeaths.toLocaleString().padStart(6)} | Avg Level: ${avgLevel.toFixed(1)} | Bots: ${d.zones.length}`,
  );
}

// Also break down by archetype × armor
console.log('\n=== ARCHETYPE × ARMOR ===\n');
const byArch: Record<string, Record<string, { zones: number[]; deaths: number[] }>> = {};
for (const bot of data.botSummaries as BotSummary[]) {
  if (!byArch[bot.archetypeName]) byArch[bot.archetypeName] = {};
  if (!byArch[bot.archetypeName][bot.armorPreference]) byArch[bot.archetypeName][bot.armorPreference] = { zones: [], deaths: [] };
  byArch[bot.archetypeName][bot.armorPreference].zones.push(bot.finalZoneIndex);
  byArch[bot.archetypeName][bot.armorPreference].deaths.push(bot.totalDeaths);
}

const armors = ['plate', 'leather', 'cloth', 'any'];
console.log('Archetype'.padEnd(18) + armors.map(a => a.padEnd(20)).join(''));
console.log('-'.repeat(98));
for (const [arch, armorData] of Object.entries(byArch).sort()) {
  const cols = [arch.padEnd(18)];
  for (const armor of armors) {
    const d = armorData[armor];
    if (!d) { cols.push('N/A'.padEnd(20)); continue; }
    const avgZ = d.zones.reduce((a, b) => a + b, 0) / d.zones.length;
    const totalD = d.deaths.reduce((a, b) => a + b, 0);
    cols.push(`Z${avgZ.toFixed(1)} / ${totalD}d`.padEnd(20));
  }
  console.log(cols.join(''));
}

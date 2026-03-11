import { installClock } from './clock';
import { installRng } from './rng';
installClock();
installRng(42);

import { Bot } from './bot';
import { ARCHETYPES } from './strategies/dagger';
import { GEAR_STRATEGIES } from './strategies/types';
import type { BotConfig } from './strategies/types';

const SET_SLOTS = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots'] as const;

const armorCounts: Record<string, number> = { plate: 0, leather: 0, cloth: 0, none: 0 };
const botGearBreakdowns: { arch: string; plate: number; leather: number; cloth: number; deaths: number }[] = [];
let totalBots = 0;

for (let archIdx = 0; archIdx < ARCHETYPES.length; archIdx++) {
  for (let i = 0; i < 15; i++) {
    const seed = 42 + totalBots;
    totalBots++;
    installRng(seed);
    installClock();

    const config: BotConfig = {
      archetype: ARCHETYPES[archIdx],
      gearStrategy: 'balanced',
      gearWeights: GEAR_STRATEGIES['balanced'],
      armorPreference: 'any',
      seed,
      maxClears: 5000,
    };

    const bot = new Bot(config);
    const summary = bot.run();

    // @ts-ignore
    const char = bot.char;
    let p = 0, l = 0, c = 0;
    for (const slot of SET_SLOTS) {
      const item = char.equipment[slot];
      if (!item?.armorType) { armorCounts['none']++; continue; }
      armorCounts[item.armorType]++;
      if (item.armorType === 'plate') p++;
      if (item.armorType === 'leather') l++;
      if (item.armorType === 'cloth') c++;
    }
    botGearBreakdowns.push({ arch: ARCHETYPES[archIdx].name, plate: p, leather: l, cloth: c, deaths: summary.totalDeaths });
  }
}

const totalSlots = Object.values(armorCounts).reduce((a, b) => a + b, 0);
console.log('\n=== "ANY" BOTS ARMOR TYPE DISTRIBUTION ===\n');
console.log(`Total set slots across ${totalBots} bots: ${totalSlots}`);
for (const [type, count] of Object.entries(armorCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(8)}: ${count} pieces (${(count / totalSlots * 100).toFixed(1)}%)`);
}

// Average composition per bot
const avgPlate = botGearBreakdowns.reduce((s, b) => s + b.plate, 0) / totalBots;
const avgLeather = botGearBreakdowns.reduce((s, b) => s + b.leather, 0) / totalBots;
const avgCloth = botGearBreakdowns.reduce((s, b) => s + b.cloth, 0) / totalBots;
console.log(`\nAvg per bot: ${avgPlate.toFixed(1)} plate, ${avgLeather.toFixed(1)} leather, ${avgCloth.toFixed(1)} cloth`);

// Check how many "any" bots accidentally get 4+ or 6pc of a type
const setCounts = { '4+plate': 0, '4+leather': 0, '4+cloth': 0, '6plate': 0, '6leather': 0, '6cloth': 0 };
for (const b of botGearBreakdowns) {
  if (b.plate >= 4) setCounts['4+plate']++;
  if (b.leather >= 4) setCounts['4+leather']++;
  if (b.cloth >= 4) setCounts['4+cloth']++;
  if (b.plate >= 6) setCounts['6plate']++;
  if (b.leather >= 6) setCounts['6leather']++;
  if (b.cloth >= 6) setCounts['6cloth']++;
}
console.log(`\nAccidental set bonuses in "any" bots:`);
for (const [key, count] of Object.entries(setCounts)) {
  if (count > 0) console.log(`  ${key}: ${count}/${totalBots} bots`);
}
if (Object.values(setCounts).every(v => v === 0)) console.log(`  None — no "any" bot has 4+ of one type`);

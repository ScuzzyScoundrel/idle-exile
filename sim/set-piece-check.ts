import { installClock } from './clock';
import { installRng } from './rng';
installClock();
installRng(42);

import { Bot } from './bot';
import { ARCHETYPES } from './strategies/dagger';
import { GEAR_STRATEGIES } from './strategies/types';
import type { BotConfig } from './strategies/types';
import { countSetPieces, calcSetBonuses } from '../src/engine/setBonus';
import { resolveStats } from '../src/engine/character';

const SET_SLOTS = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots'] as const;

// Run a single plate bot and check set pieces + stats
installRng(42);
installClock();

const config: BotConfig = {
  archetype: ARCHETYPES[0],
  gearStrategy: 'balanced',
  gearWeights: GEAR_STRATEGIES['balanced'],
  armorPreference: 'plate',
  seed: 42,
  maxClears: 5000,
};

const bot = new Bot(config);
const summary = bot.run();

// Access char through bot (need to expose it or use the summary)
// Actually, let's just recreate the character state from the summary
// Better: check the actual character
// @ts-ignore - access private field for debugging
const char = bot.char;

console.log(`\n=== PLATE BOT FINAL STATE ===`);
console.log(`Level: ${char.level}, Zone: ${summary.finalZoneIndex}`);

const counts = countSetPieces(char.equipment);
console.log(`\nSet piece counts:`, counts);

const setBonuses = calcSetBonuses(char.equipment);
console.log(`\nActive set bonuses:`);
for (const sb of setBonuses) {
  console.log(`  ${sb.name} (${sb.armorType}) — ${sb.count}pc`);
  for (const b of sb.bonuses) {
    console.log(`    ${b.threshold}pc: ${JSON.stringify(b.stats)}`);
  }
}

console.log(`\nKey stats from char.stats:`);
console.log(`  damageTakenReduction: ${char.stats.damageTakenReduction}`);
console.log(`  lifeRecoveryPerHit: ${char.stats.lifeRecoveryPerHit}`);
console.log(`  lifeOnDodgePercent: ${char.stats.lifeOnDodgePercent}`);
console.log(`  esCombatRecharge: ${char.stats.esCombatRecharge}`);
console.log(`  maxLife: ${char.stats.maxLife}`);
console.log(`  armor: ${char.stats.armor}`);
console.log(`  energyShield: ${char.stats.energyShield}`);
console.log(`  lifeLeechPercent: ${char.stats.lifeLeechPercent}`);

// Check each set slot
console.log(`\nGear in set slots:`);
for (const slot of SET_SLOTS) {
  const item = char.equipment[slot];
  if (item) {
    console.log(`  ${slot}: ${item.name} (armorType: ${item.armorType}, iLvl: ${item.iLvl})`);
  } else {
    console.log(`  ${slot}: EMPTY`);
  }
}

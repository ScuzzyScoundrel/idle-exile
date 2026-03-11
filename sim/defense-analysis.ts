// ============================================================
// Defense Analysis — Deep dive into WHY each armor type performs as it does
// Shows actual dodge rates, damage per hit, healing per clear, etc.
// ============================================================

import { installClock } from './clock';
import { installRng } from './rng';
installClock();
installRng(42);
import './balance-overrides';

import { Bot } from './bot';
import { ARCHETYPES } from './strategies/dagger';
import { GEAR_STRATEGIES } from './strategies/types';
import type { BotConfig } from './strategies/types';
import { resolveStats } from '../src/engine/character';
import { countSetPieces } from '../src/engine/setBonus';
import { ZONE_DEFS } from '../src/data/zones';
import {
  DODGE_CAP, EVASION_DR_EXPONENT, EVASION_MIN_HIT_CHANCE,
  ARMOR_COEFFICIENT, ARMOR_FLAT_DR_RATIO, ARMOR_FLAT_DR_CAP,
  DODGE_DAMAGE_FLOOR, ZONE_ACCURACY_BASE, ZONE_DMG_BASE, ZONE_DMG_ILVL_SCALE,
} from '../src/data/balance';

const SET_SLOTS = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots'] as const;
const ARMOR_TYPES = ['plate', 'leather', 'cloth', 'any'] as const;

// Run a representative sample: 3 bots per armor type, archetype 0
const archetype = ARCHETYPES[0];
const results: Record<string, any[]> = { plate: [], leather: [], cloth: [], any: [] };

for (const armorPref of ARMOR_TYPES) {
  for (let i = 0; i < 5; i++) {
    const seed = 42 + i + ARMOR_TYPES.indexOf(armorPref) * 100;
    installRng(seed);
    installClock();

    const config: BotConfig = {
      archetype,
      gearStrategy: 'balanced',
      gearWeights: GEAR_STRATEGIES['balanced'],
      armorPreference: armorPref,
      seed,
      maxClears: 5000,
    };

    const bot = new Bot(config);
    const summary = bot.run();

    // @ts-ignore — access private char for analysis
    const char = bot.char;
    const stats = char.stats;

    // Compute effective dodge chance at their final zone
    const zone = ZONE_DEFS[summary.finalZoneIndex];
    const zoneAcc = ZONE_ACCURACY_BASE * (1 + (zone.band - 1) * 0.5);
    const rawDodge = stats.evasion / (stats.evasion + zoneAcc);
    const dodgeChance = Math.min(Math.pow(rawDodge, EVASION_DR_EXPONENT), DODGE_CAP / 100);
    const hitChance = Math.max(EVASION_MIN_HIT_CHANCE / 100, 1 - dodgeChance);

    // Compute effective armor reduction vs zone's reference damage
    const zoneDmg = ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin;
    const physDmg = zoneDmg * 0.5;
    const armorReduction = stats.armor / (stats.armor + ARMOR_COEFFICIENT * physDmg);
    const flatDR = Math.min(stats.armor / ARMOR_FLAT_DR_RATIO / 100, ARMOR_FLAT_DR_CAP);

    // Set piece counts
    const counts = countSetPieces(char.equipment);

    results[armorPref].push({
      seed,
      level: char.level,
      zone: summary.finalZoneIndex,
      deaths: summary.totalDeaths,
      // Key defensive stats
      maxLife: stats.maxLife,
      armor: stats.armor,
      evasion: stats.evasion,
      energyShield: stats.energyShield,
      blockChance: stats.blockChance,
      // Derived defense values
      dodgeChance: (dodgeChance * 100).toFixed(1),
      hitChance: (hitChance * 100).toFixed(1),
      armorPhysReduction: (armorReduction * 100).toFixed(1),
      flatDRPercent: (flatDR * 100).toFixed(1),
      damageTakenReduction: stats.damageTakenReduction,
      // Set bonus stats
      lifeLeechPercent: stats.lifeLeechPercent,
      lifeRecoveryPerHit: stats.lifeRecoveryPerHit,
      lifeOnDodgePercent: stats.lifeOnDodgePercent,
      esCombatRecharge: stats.esCombatRecharge,
      // Resists (averaged)
      avgResist: ((Math.min(stats.fireResist, 75) + Math.min(stats.coldResist, 75) +
                   Math.min(stats.lightningResist, 75) + Math.min(stats.chaosResist, 75)) / 4).toFixed(1),
      // Set pieces
      setCounts: counts,
    });
  }
}

// Print analysis
console.log('\n=== DEFENSE ANALYSIS BY ARMOR TYPE ===\n');
console.log(`Balance constants: DODGE_DAMAGE_FLOOR=${DODGE_DAMAGE_FLOOR}, ARMOR_COEFFICIENT=${ARMOR_COEFFICIENT}`);
console.log(`Archetype: ${archetype.name}\n`);

for (const armorPref of ARMOR_TYPES) {
  const bots = results[armorPref];
  const avg = (key: string) => {
    const vals = bots.map((b: any) => typeof b[key] === 'string' ? parseFloat(b[key]) : b[key]);
    return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  };

  console.log(`── ${armorPref.toUpperCase()} (${bots.length} bots) ──`);
  console.log(`  Deaths: ${avg('deaths').toFixed(0)} avg | Zone: ${avg('zone').toFixed(1)}`);
  console.log(`  MaxLife: ${avg('maxLife').toFixed(0)} | Armor: ${avg('armor').toFixed(0)} | Evasion: ${avg('evasion').toFixed(0)} | ES: ${avg('energyShield').toFixed(0)}`);
  console.log(`  Dodge%: ${avg('dodgeChance').toFixed(1)} | Hit%: ${avg('hitChance').toFixed(1)} | ArmorPhysRed: ${avg('armorPhysReduction').toFixed(1)}% | FlatDR: ${avg('flatDRPercent').toFixed(1)}% | DTR: ${avg('damageTakenReduction').toFixed(1)}%`);
  console.log(`  AvgResist: ${avg('avgResist').toFixed(1)}%`);
  console.log(`  Sustain — LifeLeech: ${avg('lifeLeechPercent').toFixed(1)}% | LifePerHit: ${avg('lifeRecoveryPerHit').toFixed(1)}% | LifeOnDodge: ${avg('lifeOnDodgePercent').toFixed(1)}% | ESCombatRecharge: ${avg('esCombatRecharge').toFixed(1)}%`);

  // Show individual set piece breakdowns
  const setBreakdowns = bots.map((b: any) => {
    const c = b.setCounts;
    return `${c.plate || 0}P/${c.leather || 0}L/${c.cloth || 0}C`;
  });
  console.log(`  Set pieces: ${setBreakdowns.join(', ')}`);
  console.log();
}

// Effective damage comparison
console.log('── EFFECTIVE DAMAGE PER HIT COMPARISON ──\n');
console.log('For a 100-damage zone hit (50 phys / 50 ele):');
for (const armorPref of ARMOR_TYPES) {
  const bots = results[armorPref];
  const avg = (key: string) => {
    const vals = bots.map((b: any) => typeof b[key] === 'string' ? parseFloat(b[key]) : b[key]);
    return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  };

  const dodgePct = avg('dodgeChance') / 100;
  const hitPct = 1 - dodgePct;
  const armorRed = avg('armorPhysReduction') / 100;
  const flatDR = avg('flatDRPercent') / 100;
  const dtr = avg('damageTakenReduction') / 100;
  const avgResist = avg('avgResist') / 100;

  // Damage when NOT dodged
  const physAfterArmor = 50 * (1 - armorRed);
  const eleAfterResist = 50 * (1 - avgResist);
  const totalAfterMitigation = (physAfterArmor + eleAfterResist) * (1 - flatDR) * (1 - dtr);

  // Expected damage per attack (accounting for dodge)
  const expectedDmg = hitPct * totalAfterMitigation;

  console.log(`  ${armorPref.padEnd(8)}: ${expectedDmg.toFixed(1)} expected dmg/attack (${(dodgePct * 100).toFixed(0)}% dodged, ${totalAfterMitigation.toFixed(1)} when hit)`);
}

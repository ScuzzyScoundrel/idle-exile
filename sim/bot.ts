// ============================================================
// Bot — Core per-clear state machine for headless simulation
// ============================================================

import type { Character, ZoneDef, EquippedSkill, SkillProgress, Item, GearSlot } from '../src/types';
import { createCharacter, resolveStats, addXp, getWeaponDamageInfo, calcTotalDps } from '../src/engine/character';
import {
  calcPlayerDps, simulateSingleClear, simulateClearDefense,
  calcHazardPenalty, calcBossMaxHp, calcBossAttackProfile, generateBossLoot, rollZoneAttack,
  calcOutgoingDamageMult,
} from '../src/engine/zones';
import { generateItem } from '../src/engine/items';
import { canAllocateGraphNode, allocateGraphNode } from '../src/engine/skillGraph';
import { ZONE_DEFS } from '../src/data/zones';
import { BOSS_INTERVAL, POWER_DIVISOR, LEVEL_PENALTY_BASE, CLEAR_TIME_FLOOR_RATIO, DEATH_STREAK_WINDOW } from '../src/data/balance';
import { calcDeathPenalty } from '../src/engine/zones';
import { DAGGER_SKILL_GRAPHS } from '../src/data/skillGraphs/dagger';
import { advanceClock } from './clock';
import { isUpgrade, equipItem, calcCharDps, calcEhp } from './gear-eval';
import { BotLogger } from './logger';
import { getBranchPath } from './strategies/dagger';
import type { BotConfig, ClearLog, BotSummary, GearWeights } from './strategies/types';

// Zone advancement: rolling window settings
const ADVANCE_WINDOW = 20;
const ADVANCE_CLEAR_RATIO = 0.35; // advance when avgClearTime < baseClearTime * this ratio
const ADVANCE_DEATH_THRESHOLD = 1;

export class Bot {
  readonly config: BotConfig;
  readonly logger: BotLogger;

  private char: Character;
  private currentHp: number;
  private currentZoneIndex = 0;
  private totalClears = 0;
  private zoneClearsCount = 0;
  private clearsSinceBoss = 0;
  private totalSimTime = 0;
  private deathStreak = 0;
  private lastDeathSimTime = 0;
  private totalDeathPenaltyTime = 0;

  // Skill bar (4 active skills as EquippedSkill)
  private skillBar: (EquippedSkill | null)[] = [];
  private skillProgress: Record<string, SkillProgress> = {};

  // Rolling window for zone advancement
  private recentClearTimes: number[] = [];
  private recentDeaths: number[] = []; // 1 = died, 0 = survived

  constructor(config: BotConfig) {
    this.config = config;
    this.logger = new BotLogger(config.seed, config.archetype.name, config.gearStrategy);

    // Create rogue character with dagger
    this.char = createCharacter('Bot', 'rogue');

    // Give starting weapon
    const startDagger = generateItem('mainhand', 1, undefined);
    this.char = equipItem(this.char, startDagger);

    this.currentHp = this.char.stats.maxLife;

    // Initialize skill bar
    this.initSkillBar();
  }

  private initSkillBar(): void {
    const archetype = this.config.archetype;
    this.skillBar = archetype.skillBar.map(skillId => ({
      skillId,
      autoCast: true,
    }));

    // Pad to 8 slots
    while (this.skillBar.length < 8) this.skillBar.push(null);

    // Initialize skill progress for each equipped skill
    for (const skillId of archetype.skillBar) {
      this.skillProgress[skillId] = {
        skillId,
        xp: 0,
        level: 1,
        allocatedNodes: [],
      };
    }
  }

  /** Run the full simulation. Returns bot summary. */
  run(): BotSummary {
    const zone = ZONE_DEFS[0];
    this.logger.enterZone(zone.id, this.char.level);

    while (this.totalClears < this.config.maxClears) {
      const zone = ZONE_DEFS[this.currentZoneIndex];
      if (!zone) break;

      this.simulateClear(zone);
      this.totalClears++;

      // Sample progression every 50 clears
      if (this.totalClears % 50 === 0) {
        this.logger.sampleProgression(
          this.totalClears, this.char, zone.id,
          this.computeClearTime(zone),
        );
      }

      // Check zone advancement
      this.checkZoneAdvancement();
    }

    // Final sample
    const finalZone = ZONE_DEFS[this.currentZoneIndex];
    if (finalZone) {
      this.logger.sampleProgression(
        this.totalClears, this.char, finalZone.id,
        this.computeClearTime(finalZone),
      );
    }

    return this.logger.buildSummary(this.char, this.totalSimTime, this.config.armorPreference, this.totalDeathPenaltyTime);
  }

  private simulateClear(zone: ZoneDef): void {
    // 1. Calculate clear time
    const clearTime = this.computeClearTime(zone);

    // 2. Simulate incoming damage during clear
    const playerDps = this.computePlayerDps();
    const playerDamageDealt = playerDps * clearTime;
    const defense = simulateClearDefense(
      this.currentHp, this.char.stats.maxLife, this.char.stats,
      zone, this.char.level, clearTime, playerDamageDealt,
    );

    const hpBefore = this.currentHp;
    this.currentHp = defense.newHp;
    let died = false;
    let deathPenaltyTime = 0;

    // 3. Check for death
    if (this.currentHp <= 0) {
      died = true;
      this.currentHp = this.char.stats.maxLife; // Full recover

      // Death streak tracking
      if (this.totalSimTime - this.lastDeathSimTime > DEATH_STREAK_WINDOW) {
        this.deathStreak = 0;
      }
      deathPenaltyTime = calcDeathPenalty(zone.band, this.deathStreak);
      this.deathStreak++;
      this.lastDeathSimTime = this.totalSimTime;
      this.totalDeathPenaltyTime += deathPenaltyTime;
    }

    // 4. Simulate loot/xp from clear
    const clearResult = simulateSingleClear(this.char, zone);

    // 5. Add XP
    const prevLevel = this.char.level;
    this.char = addXp(this.char, clearResult.xpGained);
    this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);

    // 6. Handle level-ups: allocate skill graph nodes
    if (this.char.level > prevLevel) {
      this.allocateGraphNodes();
      this.grantSkillXp(zone.band);
    }

    // 7. Check for item drops and equip upgrades
    let itemDropLog = null;
    if (clearResult.item) {
      const item = clearResult.item;
      const wasEquipped = this.tryEquipUpgrade(item);
      itemDropLog = {
        slot: item.slot,
        rarity: item.rarity,
        iLvl: item.iLvl,
        affixes: [...item.prefixes, ...item.suffixes].map(a => ({
          defId: a.defId, tier: a.tier, value: a.value,
        })),
        wasEquipped,
      };
    }

    // 8. Boss fight every BOSS_INTERVAL clears
    this.clearsSinceBoss++;
    if (this.clearsSinceBoss >= BOSS_INTERVAL) {
      this.clearsSinceBoss = 0;
      this.simulateBoss(zone);
    }

    // 9. Log
    this.zoneClearsCount++;
    const dps = calcCharDps(this.char);

    const log: ClearLog = {
      clearNumber: this.totalClears,
      zoneId: zone.id,
      zoneClearsInZone: this.zoneClearsCount,
      clearTime,
      playerLevel: this.char.level,
      xpGained: clearResult.xpGained,
      xpToNext: this.char.xpToNext,
      hpBefore,
      hpAfter: this.currentHp,
      damageTaken: defense.totalDamage,
      dodges: defense.dodges,
      blocks: defense.blocks,
      hitsReceived: defense.hits,
      dps,
      itemDrop: itemDropLog,
      died,
      goldGained: clearResult.goldGained,
      materialsGained: clearResult.materials,
      deathPenaltyTime,
      totalMitigated: defense.totalMitigated,
      regenCapUsed: defense.regenCapUsed,
    };
    this.logger.logClear(log);

    // 10. Advance mock clock (includes death penalty time)
    this.totalSimTime += clearTime + deathPenaltyTime;
    advanceClock((clearTime + deathPenaltyTime) * 1000);

    // Update rolling window
    this.recentClearTimes.push(clearTime);
    this.recentDeaths.push(died ? 1 : 0);
    if (this.recentClearTimes.length > ADVANCE_WINDOW) {
      this.recentClearTimes.shift();
      this.recentDeaths.shift();
    }
  }

  private simulateBoss(zone: ZoneDef): void {
    const bossHp = calcBossMaxHp(zone);
    const profile = calcBossAttackProfile(this.char, zone);
    const playerDps = this.computePlayerDps();

    // Simplified boss fight: DPS race
    // Time to kill boss = bossHp / playerDps
    const timeToKill = playerDps > 0 ? bossHp / playerDps : 999;
    const bossAttacks = Math.floor(timeToKill / profile.attackInterval);

    // Simulate boss attacks
    let hp = this.currentHp;
    let dodgeEntropy = Math.floor(Math.random() * 100);
    let victory = true;

    for (let i = 0; i < bossAttacks; i++) {
      const variance = 0.8 + Math.random() * 0.4;
      const roll = rollZoneAttack(
        profile.damagePerHit * variance,
        profile.physRatio,
        profile.accuracy,
        this.char.stats,
        dodgeEntropy,
      );
      dodgeEntropy = roll.newDodgeEntropy;
      hp -= roll.damage;

      if (hp <= 0) {
        victory = false;
        break;
      }
    }

    this.logger.logBoss(zone.id, victory);

    if (victory) {
      // Loot from boss
      const loot = generateBossLoot(zone);
      for (const item of loot) {
        this.tryEquipUpgrade(item);
      }
      // Heal after victory
      this.currentHp = Math.min(
        this.char.stats.maxLife,
        hp + this.char.stats.maxLife * 0.6,
      );
    } else {
      // Death — full recover
      this.currentHp = this.char.stats.maxLife;
    }
  }

  private tryEquipUpgrade(item: Item): boolean {
    if (isUpgrade(this.char, item, this.config.gearWeights, this.config.armorPreference)) {
      this.char = equipItem(this.char, item);
      this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);
      this.logger.logUpgrade(this.totalClears, item.slot, item.iLvl);
      return true;
    }
    return false;
  }

  private checkZoneAdvancement(): void {
    if (this.recentClearTimes.length < ADVANCE_WINDOW) return;
    if (this.currentZoneIndex >= ZONE_DEFS.length - 1) return;

    const zone = ZONE_DEFS[this.currentZoneIndex];
    const avgClearTime = this.recentClearTimes.reduce((a, b) => a + b, 0) / this.recentClearTimes.length;
    const recentDeathCount = this.recentDeaths.reduce((a, b) => a + b, 0);
    const threshold = zone.baseClearTime * ADVANCE_CLEAR_RATIO;

    if (avgClearTime < threshold && recentDeathCount < ADVANCE_DEATH_THRESHOLD) {
      this.currentZoneIndex++;
      const newZone = ZONE_DEFS[this.currentZoneIndex];
      this.zoneClearsCount = 0;
      this.clearsSinceBoss = 0;
      this.recentClearTimes = [];
      this.recentDeaths = [];
      this.logger.enterZone(newZone.id, this.char.level);
    }
  }

  private computePlayerDps(): number {
    return calcPlayerDps(this.char, undefined, undefined, this.skillBar, this.skillProgress);
  }

  private computeClearTime(zone: ZoneDef): number {
    const playerDps = this.computePlayerDps();
    const hazardMult = calcHazardPenalty(this.char.stats, zone);
    const outgoingMult = calcOutgoingDamageMult(this.char.level, zone.iLvlMin);
    const charPower = playerDps * hazardMult * outgoingMult;
    let clearTime = zone.baseClearTime / (charPower / POWER_DIVISOR);
    const levelDelta = Math.max(0, zone.iLvlMin - this.char.level);
    if (levelDelta > 0) clearTime *= Math.pow(LEVEL_PENALTY_BASE, levelDelta);
    clearTime = Math.max(zone.baseClearTime * CLEAR_TIME_FLOOR_RATIO, clearTime);
    return clearTime;
  }

  /** Allocate skill graph nodes based on archetype's branch choices. */
  private allocateGraphNodes(): void {
    for (const alloc of this.config.archetype.allocations) {
      const graph = DAGGER_SKILL_GRAPHS[alloc.skillId];
      const progress = this.skillProgress[alloc.skillId];
      if (!graph || !progress) continue;

      const path = getBranchPath(alloc.skillId, alloc.branch);

      // Try to allocate the next unallocated node in the path
      for (const nodeId of path) {
        if (progress.allocatedNodes.includes(nodeId)) continue;
        if (canAllocateGraphNode(graph, progress.allocatedNodes, nodeId, progress.level)) {
          progress.allocatedNodes = allocateGraphNode(progress.allocatedNodes, nodeId);
          break; // One node per level-up check
        }
      }
    }
  }

  /** Grant skill XP per clear (simplified: 10 + band * 2). */
  private grantSkillXp(band: number): void {
    const xpGain = 10 + Math.floor(band * 2);
    for (const skillId of this.config.archetype.skillBar) {
      const progress = this.skillProgress[skillId];
      if (!progress) continue;

      progress.xp += xpGain;
      // Level up: 100 * (level + 1) * (1 + level * 0.1)
      const xpNeeded = Math.round(100 * (progress.level + 1) * (1 + progress.level * 0.1));
      if (progress.xp >= xpNeeded && progress.level < 30) {
        progress.xp -= xpNeeded;
        progress.level++;
      }
    }
  }
}

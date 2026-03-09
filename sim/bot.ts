// ============================================================
// Bot — Core per-clear state machine for headless simulation
// ============================================================

import type { Character, ZoneDef, EquippedSkill, SkillProgress, Item, GearSlot, CurrencyType, ClassResourceState } from '../src/types';
import { createCharacter, resolveStats, addXp } from '../src/engine/character';
import { applyCurrency } from '../src/engine/crafting';
import {
  calcPlayerDps, calcClearTime, simulateSingleClear, simulateClearDefense,
  calcBossMaxHp, calcBossAttackProfile, generateBossLoot, rollZoneAttack,
  calcDeathPenalty,
} from '../src/engine/zones';
import { generateItem } from '../src/engine/items';
import { canAllocateGraphNode, allocateGraphNode } from '../src/engine/skillGraph';
import { ZONE_DEFS } from '../src/data/zones';
import { BOSS_INTERVAL, DEATH_STREAK_WINDOW } from '../src/data/balance';
import { ALL_SKILL_GRAPHS } from '../src/data/skillGraphs';
import { getClassDef } from '../src/data/classes';
import {
  createResourceState, tickResourceOnClear, tickResourceDecay,
  resetResourceOnEvent, getClassDamageModifier, getClassClearSpeedModifier,
  getClassLootModifier,
} from '../src/engine/classResource';
import { advanceClock } from './clock';
import { isUpgrade, equipItem, calcCharDps, calcEhp } from './gear-eval';
import { BotLogger } from './logger';
import { getBranchPath as getDaggerBranchPath } from './strategies/dagger';
import { getBranchPath as getSwordBranchPath } from './strategies/sword';
import { getBranchPath as getStaffBranchPath } from './strategies/staff';
import { getBranchPath as getBowBranchPath } from './strategies/bow';
import type { BotConfig, ClearLog, BotSummary, GearWeights, WeaponType } from './strategies/types';

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

  // Currency + crafting tracking
  private currency: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
  };
  private craftingAttempts = 0;
  private craftingUpgrades = 0;
  private currencySpent: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
  };
  private currencyEarned: Record<CurrencyType, number> = {
    augment: 0, chaos: 0, divine: 0, annul: 0, exalt: 0, greater_exalt: 0, perfect_exalt: 0, socket: 0,
  };

  // Class resource tracking
  private resourceState: ClassResourceState;

  // Rolling window for zone advancement
  private recentClearTimes: number[] = [];
  private recentDeaths: number[] = []; // 1 = died, 0 = survived

  constructor(config: BotConfig) {
    this.config = config;
    this.logger = new BotLogger(config.seed, config.archetype.name, config.gearStrategy);

    // Create character with archetype's class
    const charClass = config.archetype.charClass;
    this.char = createCharacter('Bot', charClass);

    // Give starting weapon (matches archetype's weapon type)
    const startWeapon = generateItem('mainhand', 1, undefined);
    this.char = equipItem(this.char, startWeapon);

    this.currentHp = this.char.stats.maxLife;

    // Initialize class resource state
    this.resourceState = createResourceState(charClass);

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
          this.computePlayerDps(),
        );
      }

      // Check zone advancement
      this.checkZoneAdvancement();
    }

    // Final sample
    const finalZone = ZONE_DEFS[this.currentZoneIndex];
    const finalDps = this.computePlayerDps();
    if (finalZone) {
      this.logger.sampleProgression(
        this.totalClears, this.char, finalZone.id,
        this.computeClearTime(finalZone),
        finalDps,
      );
    }

    return this.logger.buildSummary(this.char, this.totalSimTime, this.config.armorPreference, this.totalDeathPenaltyTime, {
      craftingAttempts: this.craftingAttempts,
      craftingUpgrades: this.craftingUpgrades,
      currencySpent: { ...this.currencySpent },
      currencyEarned: { ...this.currencyEarned },
    }, finalDps);
  }

  private simulateClear(zone: ZoneDef): void {
    // 0. Tick class resource on clear
    const classDef = getClassDef(this.config.archetype.charClass);
    this.resourceState = tickResourceOnClear(this.resourceState, classDef, zone.id);

    // 1. Calculate clear time (with class multipliers)
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

    // 4b. Accumulate currency from clear
    for (const [type, qty] of Object.entries(clearResult.currencyDrops)) {
      if (qty > 0) {
        this.currency[type as CurrencyType] += qty;
        this.currencyEarned[type as CurrencyType] += qty;
      }
    }

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

    // 7b. Attempt crafting every 25 clears
    if (this.totalClears % 25 === 0) {
      this.attemptCrafting();
    }

    // 8. Boss fight every BOSS_INTERVAL clears
    this.clearsSinceBoss++;
    if (this.clearsSinceBoss >= BOSS_INTERVAL) {
      this.clearsSinceBoss = 0;
      this.simulateBoss(zone);
    }

    // 9. Log
    this.zoneClearsCount++;
    const dps = calcCharDps(this.char, this.skillBar, this.skillProgress);

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

    // 11. Tick class resource decay (Warrior rage decays over time)
    this.resourceState = tickResourceDecay(this.resourceState, classDef, clearTime + deathPenaltyTime);

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
    if (isUpgrade(this.char, item, this.config.gearWeights, this.config.armorPreference, this.skillBar, this.skillProgress)) {
      this.char = equipItem(this.char, item);
      this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);
      this.logger.logUpgrade(this.totalClears, item.slot, item.iLvl);

      // Reset class resource on gear swap (Rogue momentum)
      const classDef = getClassDef(this.config.archetype.charClass);
      this.resourceState = resetResourceOnEvent(this.resourceState, classDef, 'gear_swap');
      return true;
    }
    return false;
  }

  /** Attempt to craft on the weakest equipped item using available currency. */
  private attemptCrafting(): void {
    const equipment = this.char.equipment;
    const slots: GearSlot[] = [
      'mainhand', 'offhand', 'helmet', 'chest', 'shoulders', 'cloak',
      'pants', 'boots', 'gloves', 'belt', 'bracers', 'neck',
      'ring1', 'ring2', 'trinket1', 'trinket2',
    ];

    // Find weakest equipped item (lowest iLvl, fewest affixes)
    let weakest: Item | null = null;
    let weakestSlot: GearSlot | null = null;
    for (const slot of slots) {
      const item = equipment[slot];
      if (!item) continue;
      if (!weakest || item.iLvl < weakest.iLvl ||
          (item.iLvl === weakest.iLvl &&
           (item.prefixes.length + item.suffixes.length) < (weakest.prefixes.length + weakest.suffixes.length))) {
        weakest = item;
        weakestSlot = slot;
      }
    }
    if (!weakest || !weakestSlot) return;

    const totalAffixes = weakest.prefixes.length + weakest.suffixes.length;

    // Strategy: augment on <4 affixes, chaos on poor items, exalt on 4+ with open slots, divine on near-perfect
    let currencyToUse: CurrencyType | null = null;
    if (totalAffixes < 4 && this.currency.augment > 0) {
      currencyToUse = 'augment';
    } else if (totalAffixes <= 3 && this.currency.chaos > 0) {
      currencyToUse = 'chaos';
    } else if (totalAffixes >= 4 && totalAffixes < 6 && this.currency.exalt > 0) {
      currencyToUse = 'exalt';
    } else if (totalAffixes >= 5 && this.currency.divine > 0) {
      currencyToUse = 'divine';
    } else if (this.currency.augment > 0 && totalAffixes < 6) {
      currencyToUse = 'augment';
    }

    if (!currencyToUse) return;

    // Spend currency
    this.currency[currencyToUse]--;
    this.currencySpent[currencyToUse]++;
    this.craftingAttempts++;

    const result = applyCurrency(weakest, currencyToUse);
    if (result.success) {
      // Check if crafted item is an upgrade over what we had
      if (isUpgrade(this.char, result.item, this.config.gearWeights, this.config.armorPreference, this.skillBar, this.skillProgress)) {
        this.char = equipItem(this.char, result.item);
        this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);
        this.craftingUpgrades++;
      } else if (currencyToUse === 'augment' || currencyToUse === 'exalt') {
        // Augment/exalt always add affixes, so always equip the result (it's the same item improved)
        this.char = equipItem(this.char, result.item);
        this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);
        this.craftingUpgrades++;
      }
    }
  }

  private checkZoneAdvancement(): void {
    if (this.currentZoneIndex >= ZONE_DEFS.length - 1) return;

    const zone = ZONE_DEFS[this.currentZoneIndex];

    // Overlevel check: advance if player is 3+ levels above zone (mirrors real player behavior)
    if (this.char.level >= zone.iLvlMin + 3) {
      this.advanceToNextZone();
      return;
    }

    if (this.recentClearTimes.length < ADVANCE_WINDOW) return;

    const avgClearTime = this.recentClearTimes.reduce((a, b) => a + b, 0) / this.recentClearTimes.length;
    const recentDeathCount = this.recentDeaths.reduce((a, b) => a + b, 0);
    const threshold = zone.baseClearTime * ADVANCE_CLEAR_RATIO;

    if (avgClearTime < threshold && recentDeathCount < ADVANCE_DEATH_THRESHOLD) {
      this.advanceToNextZone();
    }
  }

  private advanceToNextZone(): void {
    this.currentZoneIndex++;
    const newZone = ZONE_DEFS[this.currentZoneIndex];
    this.zoneClearsCount = 0;
    this.clearsSinceBoss = 0;
    this.recentClearTimes = [];
    this.recentDeaths = [];
    this.logger.enterZone(newZone.id, this.char.level);

    // Reset class resource on zone switch (Ranger tracking, Rogue momentum)
    const classDef = getClassDef(this.config.archetype.charClass);
    this.resourceState = resetResourceOnEvent(this.resourceState, classDef, 'zone_switch');
  }

  private computePlayerDps(): number {
    return calcPlayerDps(this.char, undefined, undefined, this.skillBar, this.skillProgress);
  }

  private computeClearTime(zone: ZoneDef): number {
    const classDef = getClassDef(this.config.archetype.charClass);
    const classDmgMult = getClassDamageModifier(this.resourceState, classDef);
    const classSpdMult = getClassClearSpeedModifier(this.resourceState, classDef);
    return calcClearTime(this.char, zone, undefined, classDmgMult, classSpdMult);
  }

  /** Route to the correct getBranchPath for this archetype's weapon type. */
  private getBranchPathForWeapon(skillId: string, branch: import('./strategies/types').BranchChoice): string[] {
    switch (this.config.archetype.weaponType) {
      case 'dagger': return getDaggerBranchPath(skillId, branch);
      case 'sword':  return getSwordBranchPath(skillId, branch);
      case 'staff':  return getStaffBranchPath(skillId, branch);
      case 'bow':    return getBowBranchPath(skillId, branch);
      default:       return [];
    }
  }

  /** Allocate skill graph nodes based on archetype's branch choices. */
  private allocateGraphNodes(): void {
    for (const alloc of this.config.archetype.allocations) {
      const graph = ALL_SKILL_GRAPHS[alloc.skillId];
      const progress = this.skillProgress[alloc.skillId];
      if (!graph || !progress) continue;

      const path = this.getBranchPathForWeapon(alloc.skillId, alloc.branch);

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

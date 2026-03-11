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
import type { CombatContext } from '../src/engine/procEstimation';
import { generateItem } from '../src/engine/items';
import { canAllocateGraphNode, allocateGraphNode } from '../src/engine/skillGraph';
import { canAllocateTalentRank, allocateTalentRank } from '../src/engine/talentTree';
import { ZONE_DEFS } from '../src/data/zones';
import { BOSS_INTERVAL, DEATH_STREAK_WINDOW, ZONE_ATTACK_INTERVAL } from '../src/data/balance';
import { rollPackSize, rollIsRare, rollRareAffixes, resolveRareMods, isSkillAoE } from '../src/engine/packs';
import { ALL_SKILL_GRAPHS } from '../src/data/skillGraphs';
import { ALL_TALENT_TREES } from '../src/data/skillGraphs/talentTrees';
import { aggregateGraphGlobalEffects } from '../src/engine/unifiedSkills';
import { getClassDef } from '../src/data/classes';
import {
  createResourceState, tickResourceOnClear, tickResourceDecay,
  resetResourceOnEvent, getClassDamageModifier, getClassClearSpeedModifier,
  getClassLootModifier,
} from '../src/engine/classResource';
import { advanceClock } from './clock';
import { isUpgrade, equipItem, calcCharDps, calcEhp, scoreCharacter, calcZoneRefDamage, calcZoneAccuracy } from './gear-eval';
import { BotLogger } from './logger';
import { getBranchPath as getDaggerBranchPath } from './strategies/dagger';
import { getBranchPath as getSwordBranchPath } from './strategies/sword';
import { getBranchPath as getStaffBranchPath } from './strategies/staff';
import { getBranchPath as getBowBranchPath } from './strategies/bow';
import type { BotConfig, ClearLog, BotSummary, GearWeights, WeaponType, UpgradeRecord } from './strategies/types';

// Zone advancement: rolling window settings
const ADVANCE_WINDOW = 20;
const ADVANCE_CLEAR_RATIO = 0.35; // advance when avgClearTime < baseClearTime * this ratio
const ADVANCE_DEATH_THRESHOLD = 1;

// Retreat logic: if bot dies too many times without progress, drop back a zone to farm gear
const RETREAT_DEATH_THRESHOLD = 10; // deaths in rolling window to trigger retreat
const RETREAT_COOLDOWN = 50; // minimum clears in a zone before allowing another retreat

// ─── Pack Encounter Simulation ───

interface PackEncounterResult {
  packSize: number;
  clearTimeMult: number;       // multiplier on clear time from pack HP
  damageMult: number;          // avg damage multiplier from rare affixes
  hitCountMult: number;        // more mobs = more incoming hits
  rareCount: number;
}

/**
 * Roll a pack encounter and compute expected-value multipliers.
 *
 * AoE model: If the skill bar has at least one AoE skill, packs take
 * sqrt(packSize) times longer (AoE cleaves multiple mobs). Otherwise
 * packs take packSize times longer (sequential single-target kills).
 *
 * Rare mob affixes inflate HP (via clearTimeMult) and incoming damage
 * (via damageMult). Each mob attacks independently so hitCountMult = packSize.
 */
function simulatePackEncounter(
  zone: ZoneDef,
  skillBar: (EquippedSkill | null)[],
  skillProgress: Record<string, SkillProgress>,
): PackEncounterResult {
  const packSize = rollPackSize(zone.band);

  // Roll rare status for each mob in the pack
  let rareCount = 0;
  let totalHpMult = 0;         // sum of per-mob HP multipliers
  let totalDamageMult = 0;     // sum of per-mob damage multipliers (for weighted avg)

  for (let i = 0; i < packSize; i++) {
    let mobHpMult = 1;
    let mobDmgMult = 1;
    if (rollIsRare(zone.band)) {
      rareCount++;
      const affixes = rollRareAffixes(zone.band);
      const mods = resolveRareMods(affixes);
      mobHpMult = mods.combinedHpMult;
      mobDmgMult = mods.combinedDamageMult;
    }
    totalHpMult += mobHpMult;
    totalDamageMult += mobDmgMult;
  }

  // Average damage multiplier across all mobs in the pack
  const avgDamageMult = totalDamageMult / packSize;

  // AoE detection: check if any equipped skill has AoE tag
  let hasAoE = false;
  for (const slot of skillBar) {
    if (!slot) continue;
    if (isSkillAoE(skillBar, slot.skillId, skillProgress)) {
      hasAoE = true;
      break;
    }
  }

  // Clear time multiplier:
  // - AoE builds: sqrt(totalHpMult) — AoE hits all mobs simultaneously
  // - Single-target builds: totalHpMult — must kill each mob sequentially
  const clearTimeMult = hasAoE ? Math.sqrt(totalHpMult) : totalHpMult;

  return {
    packSize,
    clearTimeMult,
    damageMult: avgDamageMult,
    hitCountMult: packSize,  // each mob swings independently
    rareCount,
  };
}

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
  private clearsSinceZoneChange = 0; // retreat cooldown tracker
  private highestZoneReached = 0; // track furthest progress for re-advance logic

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
        allocatedRanks: {},
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
        const { refDamage, refAccuracy } = this.getZoneEhpParams();
        this.logger.sampleProgression(
          this.totalClears, this.char, zone.id,
          this.computeClearTime(zone),
          this.computePlayerDps(),
          refDamage, refAccuracy,
        );
      }

      // Check zone advancement
      this.checkZoneAdvancement();
    }

    // Final sample
    const finalZone = ZONE_DEFS[this.currentZoneIndex];
    const finalDps = this.computePlayerDps();
    const { refDamage: finalRefDmg, refAccuracy: finalRefAcc } = this.getZoneEhpParams();
    if (finalZone) {
      this.logger.sampleProgression(
        this.totalClears, this.char, finalZone.id,
        this.computeClearTime(finalZone),
        finalDps,
        finalRefDmg, finalRefAcc,
      );
    }

    // Build skill progress snapshot for export
    const skillProgressSnapshot: Record<string, { skillId: string; level: number; allocatedNodes: string[]; allocatedRanks: Record<string, number> }> = {};
    for (const [skillId, progress] of Object.entries(this.skillProgress)) {
      skillProgressSnapshot[skillId] = {
        skillId: progress.skillId,
        level: progress.level,
        allocatedNodes: [...progress.allocatedNodes],
        allocatedRanks: { ...(progress.allocatedRanks ?? {}) },
      };
    }

    return this.logger.buildSummary(this.char, this.totalSimTime, this.config.armorPreference, this.totalDeathPenaltyTime, {
      craftingAttempts: this.craftingAttempts,
      craftingUpgrades: this.craftingUpgrades,
      currencySpent: { ...this.currencySpent },
      currencyEarned: { ...this.currencyEarned },
    }, finalDps, finalRefDmg, finalRefAcc, skillProgressSnapshot);
  }

  private simulateClear(zone: ZoneDef): void {
    // 0. Tick class resource on clear
    const classDef = getClassDef(this.config.archetype.charClass);
    this.resourceState = tickResourceOnClear(this.resourceState, classDef, zone.id);

    // 0b. Roll pack encounter (pack size + rare affixes)
    const pack = simulatePackEncounter(zone, this.skillBar, this.skillProgress);

    // 1. Calculate clear time (with class multipliers), scaled by pack
    const baseClearTime = this.computeClearTime(zone);
    const clearTime = baseClearTime * pack.clearTimeMult;

    // 2. Simulate incoming damage during clear (pack mobs attack independently)
    const playerDps = this.computePlayerDps();
    const playerDamageDealt = playerDps * clearTime;
    const defense = simulateClearDefense(
      this.currentHp, this.char.stats.maxLife, this.char.stats,
      zone, this.char.level, clearTime, playerDamageDealt,
      { damageMult: pack.damageMult, hitCountMult: pack.hitCountMult },
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
    const effect = this.computeAbilityEffect();
    const clearResult = simulateSingleClear(this.char, zone, effect);

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

    // 6. Handle level-ups: allocate skill nodes
    if (this.char.level > prevLevel) {
      // Daggers use the new talent tree system; other weapons use legacy skill graphs
      if (this.config.archetype.weaponType === 'dagger') {
        this.allocateTalentNodes();
      } else {
        this.allocateGraphNodes();
      }
    }

    // 6b. Grant skill XP every clear (not just on level-up)
    this.grantSkillXp(zone.band);

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
    this.clearsSinceZoneChange++;
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
      packSize: pack.packSize,
      rareCount: pack.rareCount,
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
    const effect = this.computeAbilityEffect();
    const profile = calcBossAttackProfile(this.char, zone, effect);
    const playerDps = this.computePlayerDps();

    // Simplified boss fight: DPS race
    // Time to kill boss = bossHp / playerDps
    const timeToKill = playerDps > 0 ? bossHp / playerDps : 999;
    const bossAttacks = Math.floor(timeToKill / profile.attackInterval);

    // Simulate boss attacks (with set bonus sustain mechanics)
    let hp = this.currentHp;
    let dodgeEntropy = Math.floor(Math.random() * 100);
    let victory = true;
    const stats = this.char.stats;
    const lifeRecoverPct = stats.lifeRecoveryPerHit ?? 0;
    const lifeOnDodgePct = stats.lifeOnDodgePercent ?? 0;
    const esRecoverPct = stats.esCombatRecharge ?? 0;
    const maxEs = stats.energyShield ?? 0;
    let currentEs = maxEs;

    for (let i = 0; i < bossAttacks; i++) {
      const variance = 0.8 + Math.random() * 0.4;
      const roll = rollZoneAttack(
        profile.damagePerHit * variance,
        profile.physRatio,
        profile.accuracy,
        stats,
        dodgeEntropy,
      );
      dodgeEntropy = roll.newDodgeEntropy;

      // ES absorbs damage before HP
      let dmg = roll.damage;
      if (currentEs > 0 && dmg > 0) {
        const esAbsorbed = Math.min(currentEs, dmg);
        currentEs -= esAbsorbed;
        dmg -= esAbsorbed;
      }
      hp -= dmg;

      // Set bonus sustain mechanics
      if (roll.isDodged && lifeOnDodgePct > 0) {
        hp = Math.min(stats.maxLife, hp + stats.maxLife * lifeOnDodgePct / 100);
      }
      if (!roll.isDodged && lifeRecoverPct > 0) {
        hp = Math.min(stats.maxLife, hp + stats.maxLife * lifeRecoverPct / 100);
      }
      if (!roll.isDodged && esRecoverPct > 0 && maxEs > 0) {
        currentEs = Math.min(maxEs, currentEs + maxEs * esRecoverPct / 100);
      }

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

  /** Get zone-scaled ref damage and accuracy for EHP scoring. */
  private getZoneEhpParams(): { refDamage: number; refAccuracy: number } {
    const zone = ZONE_DEFS[this.currentZoneIndex];
    return {
      refDamage: calcZoneRefDamage(zone, this.char.level),
      refAccuracy: calcZoneAccuracy(zone.band, this.char.level, zone.iLvlMin),
    };
  }

  /** Build an UpgradeRecord capturing before/after metrics and both items' affixes. */
  private buildUpgradeRecord(oldItem: Item | undefined, newItem: Item, charBefore: Character): UpgradeRecord {
    const { refDamage, refAccuracy } = this.getZoneEhpParams();
    const zone = ZONE_DEFS[this.currentZoneIndex];

    const dpsBefore = calcCharDps(charBefore, this.skillBar, this.skillProgress);
    const ehpBefore = calcEhp(charBefore.stats, refDamage, refAccuracy);
    const scoreBefore = scoreCharacter(charBefore, this.config.gearWeights, this.skillBar, this.skillProgress, refDamage, refAccuracy);

    const dpsAfter = calcCharDps(this.char, this.skillBar, this.skillProgress);
    const ehpAfter = calcEhp(this.char.stats, refDamage, refAccuracy);
    const scoreAfter = scoreCharacter(this.char, this.config.gearWeights, this.skillBar, this.skillProgress, refDamage, refAccuracy);

    const extractAffixes = (it: Item) =>
      [...it.prefixes, ...it.suffixes].map(a => ({ defId: a.defId, tier: a.tier, value: a.value }));

    return {
      clearNumber: this.totalClears,
      zoneId: zone.id,
      band: zone.band,
      slot: newItem.slot,
      oldILvl: oldItem ? oldItem.iLvl : null,
      oldRarity: oldItem ? oldItem.rarity : null,
      oldAffixes: oldItem ? extractAffixes(oldItem) : null,
      newILvl: newItem.iLvl,
      newRarity: newItem.rarity,
      newAffixes: extractAffixes(newItem),
      newArmorType: newItem.armorType as 'plate' | 'leather' | 'cloth' | undefined,
      dpsBefore,
      dpsAfter,
      ehpBefore,
      ehpAfter,
      scoreBefore,
      scoreAfter,
    };
  }

  private tryEquipUpgrade(item: Item): boolean {
    const { refDamage, refAccuracy } = this.getZoneEhpParams();
    if (isUpgrade(this.char, item, this.config.gearWeights, this.config.armorPreference, this.skillBar, this.skillProgress, refDamage, refAccuracy)) {
      const oldItem = this.char.equipment[item.slot];
      const charBefore = this.char;

      this.char = equipItem(this.char, item);
      this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);

      const record = this.buildUpgradeRecord(oldItem ?? undefined, item, charBefore);
      this.logger.logUpgrade(record);

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
      const { refDamage, refAccuracy } = this.getZoneEhpParams();
      const shouldEquip = isUpgrade(this.char, result.item, this.config.gearWeights, this.config.armorPreference, this.skillBar, this.skillProgress, refDamage, refAccuracy)
        || currencyToUse === 'augment' || currencyToUse === 'exalt';
      if (shouldEquip) {
        const oldItem = this.char.equipment[result.item.slot];
        const charBefore = this.char;

        this.char = equipItem(this.char, result.item);
        this.currentHp = Math.min(this.currentHp, this.char.stats.maxLife);
        this.craftingUpgrades++;

        const record = this.buildUpgradeRecord(oldItem ?? undefined, result.item, charBefore);
        this.logger.logUpgrade(record);
      }
    }
  }

  private checkZoneAdvancement(): void {
    const zone = ZONE_DEFS[this.currentZoneIndex];

    // --- Retreat check: too many deaths → drop back to farm gear ---
    if (this.currentZoneIndex > 0
      && this.clearsSinceZoneChange >= RETREAT_COOLDOWN
      && this.recentDeaths.length >= ADVANCE_WINDOW) {
      const recentDeathCount = this.recentDeaths.reduce((a, b) => a + b, 0);
      if (recentDeathCount >= RETREAT_DEATH_THRESHOLD) {
        this.retreatToPreviousZone();
        return;
      }
    }

    if (this.currentZoneIndex >= ZONE_DEFS.length - 1) return;

    // Overlevel check: advance if player is 5+ levels above zone (wider gap with compressed iLvl)
    if (this.char.level >= zone.iLvlMin + 5) {
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
    if (this.currentZoneIndex > this.highestZoneReached) {
      this.highestZoneReached = this.currentZoneIndex;
    }
    this.resetZoneState();
  }

  private retreatToPreviousZone(): void {
    this.currentZoneIndex--;
    this.resetZoneState();
  }

  private resetZoneState(): void {
    const newZone = ZONE_DEFS[this.currentZoneIndex];
    this.zoneClearsCount = 0;
    this.clearsSinceBoss = 0;
    this.clearsSinceZoneChange = 0;
    this.recentClearTimes = [];
    this.recentDeaths = [];
    this.logger.enterZone(newZone.id, this.char.level);

    // Reset class resource on zone switch (Ranger tracking, Rogue momentum)
    const classDef = getClassDef(this.config.archetype.charClass);
    this.resourceState = resetResourceOnEvent(this.resourceState, classDef, 'zone_switch');
  }

  /** Aggregate skill graph node modifiers into an AbilityEffect. */
  private computeAbilityEffect() {
    return aggregateGraphGlobalEffects(this.skillBar, this.skillProgress);
  }

  private computePlayerDps(): number {
    const effect = this.computeAbilityEffect();
    const zone = ZONE_DEFS[this.currentZoneIndex];
    const combatCtx: CombatContext = {
      mobAttackInterval: ZONE_ATTACK_INTERVAL,
      zoneAccuracy: calcZoneAccuracy(zone.band, this.char.level, zone.iLvlMin),
    };
    return calcPlayerDps(this.char, effect, undefined, this.skillBar, this.skillProgress, combatCtx);
  }

  private computeClearTime(zone: ZoneDef): number {
    const classDef = getClassDef(this.config.archetype.charClass);
    const classDmgMult = getClassDamageModifier(this.resourceState, classDef);
    const classSpdMult = getClassClearSpeedModifier(this.resourceState, classDef);
    const effect = this.computeAbilityEffect();
    const combatCtx: CombatContext = {
      mobAttackInterval: ZONE_ATTACK_INTERVAL,
      zoneAccuracy: calcZoneAccuracy(zone.band, this.char.level, zone.iLvlMin),
    };
    return calcClearTime(this.char, zone, effect, classDmgMult, classSpdMult, undefined, this.skillBar, this.skillProgress, combatCtx);
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

  /** Allocate talent tree ranks based on archetype's branch choices.
   *  Round-robins across skills (1 rank per skill per loop), continuing
   *  until no skill can allocate any more ranks. */
  private allocateTalentNodes(): void {
    let allocated = true;
    while (allocated) {
      allocated = false;
      for (const alloc of this.config.archetype.allocations) {
        const tree = ALL_TALENT_TREES[alloc.skillId];
        const progress = this.skillProgress[alloc.skillId];
        if (!tree || !progress) continue;

        // Map branch choice to branch index: b1→0, b2→1, b3→2
        const branchIndex = alloc.branch === 'b1' ? 0 : alloc.branch === 'b2' ? 1 : 2;
        const branch = tree.branches[branchIndex];
        if (!branch) continue;

        // Sort branch nodes by tier, then try to allocate ranks
        const sortedNodes = [...branch.nodes].sort((a, b) => a.tier - b.tier);
        const ranks = progress.allocatedRanks ?? {};

        for (const node of sortedNodes) {
          if ((ranks[node.id] ?? 0) >= node.maxRank) continue;
          if (canAllocateTalentRank(tree, ranks, node.id, progress.level)) {
            progress.allocatedRanks = allocateTalentRank(ranks, node.id);
            allocated = true;
            break; // move to next skill's allocation
          }
        }
      }
    }
  }

  /** Grant skill XP per clear (simplified: 10 + band * 2). */
  private grantSkillXp(band: number): void {
    const xpGain = 10 + Math.floor(band * 2);
    let anyLevelUp = false;
    for (const skillId of this.config.archetype.skillBar) {
      const progress = this.skillProgress[skillId];
      if (!progress) continue;

      progress.xp += xpGain;
      // Level up: 100 * (level + 1) * (1 + level * 0.1)
      const xpNeeded = Math.round(100 * (progress.level + 1) * (1 + progress.level * 0.1));
      if (progress.xp >= xpNeeded && progress.level < 20) {
        progress.xp -= xpNeeded;
        progress.level++;
        anyLevelUp = true;
      }
    }
    // Allocate talent nodes when skills level up (more points available)
    if (anyLevelUp) {
      if (this.config.archetype.weaponType === 'dagger') {
        this.allocateTalentNodes();
      } else {
        this.allocateGraphNodes();
      }
    }
  }
}

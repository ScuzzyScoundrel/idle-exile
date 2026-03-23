// ============================================================
// Bot — Core per-clear state machine for headless simulation
// ============================================================

import type { Character, ZoneDef, EquippedSkill, SkillProgress, Item, GearSlot, CurrencyType, ClassResourceState, Gem, GemType, GemTier } from '../src/types';
import { SOCKETABLE_SLOTS } from '../src/types';
import { createCharacter, resolveStats, addXp } from '../src/engine/character';
import { applyCurrency } from '../src/engine/crafting';
import { rollGemForBoss, canUpgradeGem, upgradeGem, getGemStat } from '../src/engine/gems';
import { isGemValidForSlot, DEFENSIVE_GEM_TYPES, OFFENSIVE_GEM_TYPES } from '../src/data/gems';
import { GEM_INVENTORY_CAP } from '../src/data/balance';
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

  // Gem system tracking
  private gemInventory: Gem[] = [];
  private gemsSocketed = 0;
  private gemsUpgraded = 0;
  private gemsCollected = 0;

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
    const startWeapon = generateItem('mainhand', 1, config.archetype.weaponType === 'dagger' ? 'crude_dagger' : undefined);
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

    // Build gem metrics snapshot
    const socketedGems: { slot: GearSlot; gemType: typeof this.gemInventory[0]['type']; gemTier: typeof this.gemInventory[0]['tier'] }[] = [];
    for (const slot of SOCKETABLE_SLOTS) {
      const item = this.char.equipment[slot];
      if (!item?.sockets) continue;
      for (const gem of item.sockets) {
        if (gem) socketedGems.push({ slot, gemType: gem.type, gemTier: gem.tier });
      }
    }

    return this.logger.buildSummary(this.char, this.totalSimTime, this.config.armorPreference, this.totalDeathPenaltyTime, {
      craftingAttempts: this.craftingAttempts,
      craftingUpgrades: this.craftingUpgrades,
      currencySpent: { ...this.currencySpent },
      currencyEarned: { ...this.currencyEarned },
    }, finalDps, finalRefDmg, finalRefAcc, skillProgressSnapshot, {
      gemsCollected: this.gemsCollected,
      gemsSocketed: this.gemsSocketed,
      gemsUpgraded: this.gemsUpgraded,
      finalGemInventory: this.gemInventory.map(g => ({ type: g.type, tier: g.tier })),
      socketedGems,
    });
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

    // 4c. Collect gem drop
    if (clearResult.gemDrop && this.gemInventory.length < GEM_INVENTORY_CAP) {
      this.gemInventory.push(clearResult.gemDrop);
      this.gemsCollected++;
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

    // 7c. Manage gems every 10 clears
    if (this.totalClears % 10 === 0) {
      this.manageGems();
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
      // Boss guaranteed gem drop
      const bossGem = rollGemForBoss(zone.band);
      if (this.gemInventory.length < GEM_INVENTORY_CAP) {
        this.gemInventory.push(bossGem);
        this.gemsCollected++;
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
    // Reject mainhand drops that don't match the archetype's weapon type
    if (item.slot === 'mainhand' && item.weaponType && item.weaponType !== this.config.archetype.weaponType) {
      return false;
    }

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

  // ─── Gem Management ───

  /** Top-level gem management: use socket shards, upgrade gems, socket best gems. */
  private manageGems(): void {
    this.useSocketShards();
    this.upgradeAvailableGems();
    this.socketBestGems();
  }

  /** Spend socket currency on highest-value unsocketed items. */
  private useSocketShards(): void {
    if (this.currency.socket <= 0) return;

    // Prioritize defensive slots (for resist gems) then offensive
    const priorityOrder: GearSlot[] = [
      'chest', 'helmet', 'pants', 'boots', 'shoulders', 'gloves', // defensive
      'mainhand', 'ring1', 'ring2', // offensive
    ];

    for (const slot of priorityOrder) {
      if (this.currency.socket <= 0) break;
      const item = this.char.equipment[slot];
      if (!item) continue;
      if (!SOCKETABLE_SLOTS.includes(slot)) continue;
      // Skip items that already have a socket
      if (item.sockets && item.sockets.length > 0) continue;

      const result = applyCurrency(item, 'socket');
      if (result.success) {
        this.currency.socket--;
        this.currencySpent.socket++;
        // Re-equip the socketed item
        this.char = equipItem(this.char, result.item);
      }
    }
  }

  /** Combine 3 gems of same type+tier into 1 higher-tier gem. Repeat until exhausted. */
  private upgradeAvailableGems(): void {
    let upgraded = true;
    while (upgraded) {
      upgraded = false;
      // Check all type+tier combos (tier 5→2, since tier 1 is max)
      for (const gem of [...this.gemInventory]) {
        if (gem.tier <= 1) continue;
        if (canUpgradeGem(this.gemInventory, gem.type, gem.tier)) {
          const { newGem, remainingGems } = upgradeGem(this.gemInventory, gem.type, gem.tier);
          this.gemInventory = remainingGems;
          this.gemInventory.push(newGem);
          this.gemsUpgraded++;
          upgraded = true;
          break; // restart scan since inventory changed
        }
      }
    }
  }

  /** Socket best available gems into empty sockets on equipped items. */
  private socketBestGems(): void {
    if (this.gemInventory.length === 0) return;

    // Find all equipped items with empty sockets
    for (const slot of SOCKETABLE_SLOTS) {
      const item = this.char.equipment[slot];
      if (!item?.sockets) continue;

      for (let si = 0; si < item.sockets.length; si++) {
        if (item.sockets[si] !== null) continue; // already filled
        if (this.gemInventory.length === 0) return;

        const bestGem = this.pickBestGemForSlot(slot);
        if (!bestGem) continue;

        // Socket the gem: clone item, fill socket, re-equip
        const newItem: Item = {
          ...item,
          prefixes: [...item.prefixes],
          suffixes: [...item.suffixes],
          baseStats: { ...item.baseStats },
          sockets: [...item.sockets],
        };
        newItem.sockets![si] = bestGem;

        // Remove gem from inventory
        const gemIdx = this.gemInventory.findIndex(g => g.id === bestGem.id);
        if (gemIdx >= 0) this.gemInventory.splice(gemIdx, 1);

        // Re-equip and re-resolve stats
        this.char = equipItem(this.char, newItem);
        this.gemsSocketed++;
      }
    }
  }

  /** Pick the best gem from inventory for a given gear slot. */
  private pickBestGemForSlot(slot: GearSlot): Gem | null {
    // Filter to valid gems for this slot
    const validGems = this.gemInventory.filter(g => isGemValidForSlot(g.type, slot));
    if (validGems.length === 0) return null;

    // Defensive slots: resistance-gap-aware scoring
    const isDefensiveSlot = ['helmet', 'shoulders', 'chest', 'gloves', 'pants', 'boots'].includes(slot);

    if (isDefensiveSlot) {
      return this.pickBestDefensiveGem(validGems);
    } else {
      return this.pickBestOffensiveGem(validGems);
    }
  }

  /** Pick defensive gem: prioritize lowest resistance, fall back to life/armor. */
  private pickBestDefensiveGem(gems: Gem[]): Gem {
    const stats = this.char.stats;
    const resists: { type: GemType; value: number }[] = [
      { type: 'ruby',     value: stats.fireResist ?? 0 },
      { type: 'sapphire', value: stats.coldResist ?? 0 },
      { type: 'topaz',    value: stats.lightningResist ?? 0 },
      { type: 'amethyst', value: stats.chaosResist ?? 0 },
    ];

    // Sort by lowest resist first
    resists.sort((a, b) => a.value - b.value);
    const lowestResist = resists[0].value;
    const secondLowest = resists[1].value;

    // If lowest resist is meaningfully behind (>5 gap or <40%), prioritize resist gem
    if (lowestResist < 40 || lowestResist < secondLowest - 5) {
      const resistType = resists[0].type;
      const resistGems = gems
        .filter(g => g.type === resistType)
        .sort((a, b) => a.tier - b.tier); // lower tier = better
      if (resistGems.length > 0) return resistGems[0];
    }

    // All resists are reasonable — fall back to garnet (life), jade (armor), or emerald (evasion)
    // Prefer garnet for general survivability
    const fallbackOrder: GemType[] = ['garnet', 'jade', 'emerald', 'opal'];
    for (const type of fallbackOrder) {
      const fallbackGems = gems
        .filter(g => g.type === type)
        .sort((a, b) => a.tier - b.tier);
      if (fallbackGems.length > 0) return fallbackGems[0];
    }

    // Still nothing? Pick any resist gem that helps the lowest resist
    for (const r of resists) {
      const rGems = gems
        .filter(g => g.type === r.type)
        .sort((a, b) => a.tier - b.tier);
      if (rGems.length > 0) return rGems[0];
    }

    // Absolute fallback: best tier of any valid gem
    return gems.sort((a, b) => a.tier - b.tier)[0];
  }

  /** Pick offensive gem: simulate DPS delta for each candidate, pick best. */
  private pickBestOffensiveGem(gems: Gem[]): Gem {
    const { refDamage, refAccuracy } = this.getZoneEhpParams();
    let bestGem = gems[0];
    let bestScore = -Infinity;

    for (const gem of gems) {
      // Temporarily socket gem to measure DPS impact
      const { stat, value } = getGemStat(gem);
      // Quick score: use stat contribution as proxy (avoid full re-resolve per gem)
      let score = value;
      // Weight offensive stats by their DPS impact
      switch (stat) {
        case 'critChance':       score = value * 3; break;   // crit is high-leverage
        case 'critMultiplier':   score = value * 2; break;
        case 'attackSpeed':      score = value * 2.5; break;
        case 'flatPhysDamage':   score = value * 1.5; break;
        case 'incElementalDamage': score = value * 1.2; break;
        default:                 score = value; break;        // flat ele damage
      }
      // Prefer higher tier (lower number = better)
      if (score > bestScore || (score === bestScore && gem.tier < bestGem.tier)) {
        bestScore = score;
        bestGem = gem;
      }
    }

    return bestGem;
  }
}

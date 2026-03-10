// ============================================================
// Simulator Type Definitions
// ============================================================

import type { Character, Item, GearSlot, Affix, ZoneDef, CurrencyType, CharacterClass } from '../../src/types';

// --- Gear Strategy ---

export type WeaponType = 'dagger' | 'sword' | 'staff' | 'bow';
export type ArmorPreference = 'plate' | 'leather' | 'cloth' | 'any';

export interface GearWeights {
  dps: number;
  ehp: number;
}

export const GEAR_STRATEGIES: Record<string, GearWeights> = {
  balanced:   { dps: 1.5, ehp: 1.0 },
  aggressive: { dps: 3.0, ehp: 0.5 },
  defensive:  { dps: 0.5, ehp: 2.0 },
};

// --- Archetype Definition ---

/** Which branch to allocate for each skill. */
export type BranchChoice = 'b1' | 'b2' | 'b3';

export interface SkillAllocation {
  skillId: string;
  branch: BranchChoice;
}

export interface ArchetypeDef {
  name: string;
  /** Character class this archetype belongs to */
  charClass: CharacterClass;
  /** Primary weapon type */
  weaponType: WeaponType;
  /** Preferred armor type (matches class affinity) */
  armorAffinity: ArmorPreference;
  /** 4 active skills in priority order */
  skillBar: string[];
  /** Per-skill graph allocation path (branch to follow) */
  allocations: SkillAllocation[];
}

// --- Bot Config ---

export interface BotConfig {
  archetype: ArchetypeDef;
  gearStrategy: string;
  gearWeights: GearWeights;
  armorPreference: ArmorPreference;
  seed: number;
  maxClears: number;
}

// --- Per-Clear Log ---

export interface ClearLog {
  clearNumber: number;
  zoneId: string;
  zoneClearsInZone: number;
  clearTime: number;
  playerLevel: number;
  xpGained: number;
  xpToNext: number;
  hpBefore: number;
  hpAfter: number;
  damageTaken: number;
  dodges: number;
  blocks: number;
  hitsReceived: number;
  dps: number;
  itemDrop: ItemDropLog | null;
  died: boolean;
  goldGained: number;
  materialsGained: Record<string, number>;
  deathPenaltyTime: number;
  totalMitigated: number;
  regenCapUsed: number;
  packSize?: number;
  rareCount?: number;
}

export interface ItemDropLog {
  slot: GearSlot;
  rarity: string;
  iLvl: number;
  affixes: { defId: string; tier: number; value: number }[];
  wasEquipped: boolean;
}

// --- Per-Zone Summary ---

export interface GearSnapshot {
  slot: GearSlot;
  name: string;
  rarity: string;
  iLvl: number;
  affixes: { defId: string; tier: number; value: number }[];
}

export interface ZoneSummary {
  zoneId: string;
  zoneName: string;
  band: number;
  clearsToProgress: number;
  clearsSpentFarming: number;
  levelAtEntry: number;
  levelAtExit: number;
  deaths: number;
  itemUpgrades: number;
  upgradeSlots: GearSlot[];
  avgClearTime: number;
  minClearTime: number;
  maxClearTime: number;
  avgDamageTaken: number;
  bossAttempts: number;
  bossVictories: number;
  bossDefeats: number;
  gearSnapshot: GearSnapshot[];
}

// --- Boss Fight Log ---

export interface BossFightLog {
  zoneId: string;
  clearNumber: number;
  victory: boolean;
  attempts: number;
  playerDps: number;
  bossHp: number;
}

// --- Upgrade Record (affix-level instrumentation) ---

export interface UpgradeRecord {
  clearNumber: number;
  zoneId: string;
  band: number;
  slot: GearSlot;
  // Old item (null for first equip in slot)
  oldILvl: number | null;
  oldRarity: string | null;
  oldAffixes: { defId: string; tier: number; value: number }[] | null;
  // New item
  newILvl: number;
  newRarity: string;
  newAffixes: { defId: string; tier: number; value: number }[];
  newArmorType?: 'plate' | 'leather' | 'cloth';
  // Score deltas
  dpsBefore: number;
  dpsAfter: number;
  ehpBefore: number;
  ehpAfter: number;
  scoreBefore: number;
  scoreAfter: number;
}

// --- Per-Bot Summary ---

export interface ProgressionSample {
  clearNumber: number;
  level: number;
  zoneId: string;
  clearTime: number;
  dps: number;
  ehp: number;
}

export interface AffixContribution {
  defId: string;
  tier: number;
  value: number;
  dpsContribution: number;
  ehpContribution: number;
  percentOfTotal: number;
}

export interface BotSummary {
  seed: number;
  archetypeName: string;
  gearStrategy: string;
  armorPreference: string;
  finalLevel: number;
  finalZoneIndex: number;
  finalZoneId: string;
  totalSimTime: number;
  totalClears: number;
  totalDeaths: number;
  totalBossKills: number;
  totalBossDefeats: number;
  progressionCurve: ProgressionSample[];
  gearProgression: Record<GearSlot, { clearNumber: number; iLvl: number }>;
  longestWall: { zoneId: string; clears: number };
  deathClustering: { zoneId: string; deaths: number }[];
  zoneSummaries: ZoneSummary[];
  finalDps: number;
  finalEhp: number;
  totalDeathPenaltyTime: number;
  // Crafting metrics
  craftingAttempts: number;
  craftingUpgrades: number;
  currencySpent: Record<CurrencyType, number>;
  currencyEarned: Record<CurrencyType, number>;
  // Affix-level upgrade instrumentation
  upgradeRecords: UpgradeRecord[];
  // Skill progress with graph + talent allocations
  skillProgress: Record<string, { skillId: string; level: number; allocatedNodes: string[]; allocatedRanks: Record<string, number> }>;
}

// --- Aggregate Stats ---

export interface PercentileStats {
  median: number;
  p10: number;
  p90: number;
}

export interface ZoneAggregate {
  zoneId: string;
  zoneName: string;
  band: number;
  clearsToProgress: PercentileStats;
  levelAtEntry: PercentileStats;
  deaths: PercentileStats;
  isGearWall: boolean;
}

export interface AggregateResult {
  archetypeName: string;
  gearStrategy: string;
  armorPreference: string;
  botCount: number;
  finalZone: PercentileStats;
  finalLevel: PercentileStats;
  totalClears: PercentileStats;
  totalDeaths: PercentileStats;
  finalDps: PercentileStats;
  longestWallZone: string;
  zones: ZoneAggregate[];
}

// --- Full Run Output ---

export interface RunOutput {
  timestamp: string;
  balanceVersion?: string;
  configs: { archetype: string; gearStrategy: string; armorPreference?: string; bots: number }[];
  aggregates: AggregateResult[];
  botSummaries: BotSummary[];
}

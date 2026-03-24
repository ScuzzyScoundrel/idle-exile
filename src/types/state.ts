// ============================================================
// State — top-level game state and craft log
// ============================================================

import type { Character } from './character';
import type { Gem, GearSlot, Item, Rarity } from './items';
import type { CurrencyType } from './currencies';
import type { IdleMode, AbilityProgress, EquippedSkill, SkillProgress, SkillTimerState } from './skills';
import type { CombatPhase, BossState, ActiveDebuff, TempBuff, MobInPack, CombatClearResult, ComboState } from './combat';
import type { TrapState } from '../engine/combat/traps';
import type { DamageType } from './skills';
import type { GatheringProfession, GatheringSkills, CraftingSkills, CraftingProfession, OwnedPattern } from './crafting';
import type { ClassResourceState } from './character';
import type { OfflineProgressSummary } from './zones';
import type { DailyQuestState } from './quests';

export interface BankTab {
  label: string;              // "Tab 1", "Tab 2", etc.
  items: (Item | null)[];     // fixed-length array of BANK_TAB_CAPACITY slots
}

export interface BankState {
  tabs: BankTab[];            // starts empty [], max BANK_MAX_TABS
}

export interface GameState {
  character: Character;
  inventory: Item[];
  currencies: Record<CurrencyType, number>;
  materials: Record<string, number>;
  gold: number;

  // Bag system
  bagSlots: string[];                    // exactly 5 bag def IDs
  bagStash: Record<string, number>;      // collected but unequipped bags

  // Bank system
  bank: BankState;

  // Idle state
  currentZoneId: string | null;
  idleStartTime: number | null; // timestamp when idle run started
  idleMode: IdleMode;

  // Gathering
  gatheringSkills: GatheringSkills;
  gatheringEquipment: Partial<Record<GearSlot, Item>>;
  selectedGatheringProfession: GatheringProfession | null;

  // Profession gear
  professionEquipment: Partial<Record<GearSlot, Item>>;

  // Crafting professions
  craftingSkills: CraftingSkills;

  // Crafting patterns
  ownedPatterns: OwnedPattern[];

  // Auto-salvage / auto-sell
  autoSalvageMinRarity: Rarity;
  autoDisposalAction: 'salvage' | 'sell';
  craftAutoSalvageMinRarity: Rarity;

  // Offline progression
  offlineProgress: OfflineProgressSummary | null;

  // Abilities (skill tree state — keyed by old ability IDs)
  abilityProgress: Record<string, AbilityProgress>;

  // Per-clear tracking (bug fix: replaces modulo-based progress)
  clearStartedAt: number;               // timestamp when current clear began
  currentClearTime: number;             // current clear duration in seconds

  // Combat (v15)
  currentHp: number;
  currentEs: number;  // energy shield pool (ephemeral, not persisted)
  combatPhase: CombatPhase;
  bossState: BossState | null;
  zoneClearCounts: Record<string, number>;  // persisted: clears per zone toward boss
  combatPhaseStartedAt: number | null;

  // Class resource
  classResource: ClassResourceState;
  classSelected: boolean;

  // Stats tracking
  totalKills: number;
  fastestClears: Record<string, number>;  // zoneId → fastest clear time in seconds

  // Unified skill bar (v25)
  skillBar: (EquippedSkill | null)[];         // 8 unified slots
  skillProgress: Record<string, SkillProgress>;
  skillTimers: SkillTimerState[];

  // Class talent tree (v28)
  talentAllocations: string[];

  // Skill graph debuffs (v29 — ephemeral, not persisted)
  activeDebuffs: ActiveDebuff[];

  // Skill tree Phase 1: ephemeral combat state (not persisted, reset on rehydrate)
  consecutiveHits: number;
  lastSkillsCast: string[];
  lastOverkillDamage: number;
  killStreak: number;
  lastCritAt: number;
  lastBlockAt: number;
  lastDodgeAt: number;
  dodgeEntropy: number;        // entropy counter for POE-style deterministic evasion
  tempBuffs: TempBuff[];
  skillCharges: Record<string, { current: number; max: number; chargeId: string }>;
  rampingStacks: number;
  rampingLastHitAt: number;
  fortifyStacks: number;
  fortifyExpiresAt: number;
  fortifyDRPerStack: number;  // copied from graphMod on hit, avoids graphMod lookup at damage sites
  deathStreak: number;        // consecutive deaths for streak penalty
  lastDeathTime: number;      // timestamp of last death for streak window

  // Combo states (Dagger v2 — ephemeral, not persisted)
  comboStates: ComboState[];

  // Active traps (Dagger v2 — ephemeral, not persisted)
  activeTraps: TrapState[];

  // Element transforms (Dagger v2 — persisted per-skill element choice)
  elementTransforms: Record<string, DamageType>;

  // Blade Ward: track hits during ward window for Guarded threshold
  bladeWardExpiresAt: number;       // timestamp when ward window ends (0 = not active)
  bladeWardHits: number;            // hits received during current ward window

  // Arena spatial dodge/block queue — fed to weapon module hooks in next tickCombat
  pendingSpatialDodges: number;
  pendingSpatialBlocks: number;

  // Talent tree: ephemeral combat state (not persisted, reset on rehydrate)
  lastHitMobTypeId: string | null;                    // for same-target consecutive hit tracking
  freeCastUntil: Record<string, number>;              // skillId → timestamp: free cast (no CD) until
  lastProcTriggerAt: Record<string, number>;          // procId → timestamp: internal cooldown tracking

  // Per-clear combat sim result (v25 — ephemeral, not persisted)
  lastClearResult: CombatClearResult | null;

  // Auto-cast GCD tracking (ephemeral)
  lastSkillActivation: number;

  // Real-time combat (10K-A — ephemeral, reset on rehydrate)
  nextActiveSkillAt: number;

  // Per-mob pack state (ephemeral, reset on rehydrate)
  packMobs: MobInPack[];              // each mob has own HP, debuffs, attack timer, affixes
  currentPackSize: number;            // convenience: total mobs in encounter (1 = single)

  // Mob types & targeted farming
  targetedMobId: string | null;
  currentMobTypeId: string | null;  // ephemeral: the mob currently being fought (random or targeted)
  mobKillCounts: Record<string, number>;
  bossKillCounts: Record<string, number>;
  totalZoneClears: Record<string, number>;

  // Daily quests
  dailyQuests: DailyQuestState;

  // Craft log (ephemeral — not persisted, reset on rehydrate)
  craftLog: CraftLogEntry[];

  // Craft output buffer (persisted — staging area for crafted gear)
  craftOutputBuffer: Item[];

  /** Player's gem stash. */
  gemInventory: Gem[];

  // Zone mastery milestones
  zoneMasteryClaimed: Record<string, number>;  // zoneId → highest claimed threshold (0/25/100/500)

  // Void invasions
  invasionState: {
    activeInvasions: Record<number, { zoneId: string; startTime: number; endTime: number }>;
    bandCooldowns: Record<number, number>;  // band → timestamp when cooldown expires
  };

  // Tutorial
  tutorialStep: number;
  hasSeenCraftingHint: boolean;

  // Map system
  mapFragments: number;
  mapCompletedCounts: Record<string, number>;  // zoneId → maps completed (resets after boss)
  highestCorruptedTier: number;  // highest corrupted map tier completed

  // Meta
  lastSaveTime: number;
}

export interface CraftLogEntry {
  id: string;
  timestamp: number;
  type: 'refine' | 'gear' | 'pattern';
  recipeName: string;
  count: number;
  xpGained: number;
  profession?: CraftingProfession;
  trackId?: string;             // refinement track for refine entries
  itemName?: string;
  itemRarity?: Rarity;
  wasSalvaged?: boolean;
  batchSalvaged?: number;
}

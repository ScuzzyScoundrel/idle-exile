// ============================================================
// Combat — combat results, boss state, rare mobs, debuffs
// ============================================================

import type { AbilityEffect } from './skills';
import type { MobDamageElement } from './zones';

// --- Combat Results ---

/** Result of simulating one combat clear with per-hit rolls. */
export interface CombatClearResult {
  clearTime: number;      // Simulated clear time in seconds
  totalCasts: number;     // Skill casts during clear
  hits: number;           // Successful hits
  crits: number;          // Critical hits (subset of hits)
  misses: number;         // Missed attacks (spells always hit -> 0)
  totalDamage: number;    // Total damage dealt to mob
  dotDamage: number;      // Damage from DoT ticks (subset of totalDamage)
}

/** Result of one real-time combat tick (10K-A, extended 10K-B1 for boss). */
export interface CombatTickResult {
  mobKills: number;
  skillFired: boolean;
  damageDealt: number;
  skillId: string | null;
  isCrit: boolean;
  isHit: boolean;
  bossOutcome?: 'ongoing' | 'victory' | 'defeat';
  zoneAttack?: { damage: number; isDodged: boolean; isBlocked: boolean } | null;
  bossAttack?: { damage: number; isDodged: boolean; isBlocked: boolean; isCrit: boolean } | null;
  zoneDeath?: boolean;
  dotDamage?: number;           // poison + burning DoT this tick
  bleedTriggerDamage?: number;  // bleed trigger damage this tick
  shatterDamage?: number;       // chilled shatter damage this tick
  procDamage?: number;           // proc bonus damage (for separate floater)
  procLabel?: string;            // human-readable proc name e.g. "Venom Burst"
  cooldownWasReset?: boolean;    // true if any skill CD was reset via proc this tick
  gcdWasReset?: boolean;         // true if any proc had resetGcd (free instant cast)
  didSpreadDebuffs?: boolean;    // true if debuffs were spread to new mob on kill
  packSize?: number;             // pack size of current encounter (for UI)
  encounterLootMult?: number;    // rare mob loot multiplier for this encounter
  poisonInstanceCount?: number;  // number of active poison instances (for "Poison (x8)" log label)
  perHitDamages?: number[];      // sequential hit damages (Blade Dance: [23, 25, 21])

  // Structured event data (Sprint 1 — combat readability)
  procEvents?: Array<{
    procId: string;           // e.g. 'st_venomburst'
    label: string;            // e.g. 'Venom Burst'
    damage: number;           // bonus damage (0 if non-damage proc)
    sourceSkillId: string;    // which skill triggered it
    type: 'damage' | 'buff' | 'debuff' | 'heal' | 'cdReset' | 'cast';
  }>;
  spreadEvents?: Array<{
    debuffId: string;         // e.g. 'poisoned'
    stacks: number;           // how many stacks spread
  }>;
  cooldownResets?: string[];  // skill IDs that had CD reset
  conditionalModBonuses?: number;  // sum of non-zero conditional mod effects applied this tick
  counterHitDamage?: number;       // counter-hit damage from weapon hooks this tick
  trapDetonationDamage?: number;   // trap detonation damage from weapon hooks this tick
}

export type CombatPhase = 'clearing' | 'boss_fight' | 'boss_victory' | 'boss_defeat' | 'zone_defeat';

export interface BossState {
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  playerDps: number;           // damage to boss per second (kept for victory overlay stats)
  bossDps: number;             // effective boss DPS (computed from per-hit: dmg/interval, for UI display)
  bossDamagePerHit: number;    // base damage per boss attack
  bossAttackInterval: number;  // seconds between boss attacks
  bossNextAttackAt: number;    // timestamp of next boss attack (ms)
  bossAccuracy: number;        // boss accuracy for dodge calc
  bossPhysRatio: number;       // physical vs elemental split (0-1)
  bossDamageElement: MobDamageElement; // element of boss attacks
  startedAt: number;           // timestamp
  dodgeEntropy: number;        // entropy counter for POE-style deterministic evasion
}

// --- Rare Mob Affixes ---

export type RareAffixId = 'mighty' | 'frenzied' | 'armored' | 'empowered' | 'regenerating';

export interface RareAffixDef {
  id: RareAffixId;
  name: string;
  description: string;
  hpMultiplier: number;
  damageMultiplier?: number;         // multiplies zone damage to player
  attackSpeedMultiplier?: number;    // multiplies zone attack interval (< 1 = faster)
  damageTakenMultiplier?: number;    // multiplies damage mob receives (< 1 = tankier)
  regenPerSec?: number;              // % of maxHP regen per second
  lootMultiplier: number;
  color: string;
}

export interface RareMobState {
  affixes: RareAffixId[];
  combinedHpMult: number;
  combinedLootMult: number;
  combinedDamageMult: number;        // to player
  combinedAtkSpeedMult: number;      // zone attack interval multiplier
  combinedDamageTakenMult: number;   // damage mob receives
  combinedRegenPerSec: number;       // flat regen rate (% of maxHP)
}

// --- Per-Mob Pack State ---

export interface MobInPack {
  hp: number;
  maxHp: number;
  debuffs: ActiveDebuff[];
  nextAttackAt: number;           // ms timestamp, each mob swings independently
  rare: RareMobState | null;      // null = normal mob
  damageElement: MobDamageElement;   // element of this mob's attacks
  physRatio: number;              // physical vs elemental split (0-1)
}

// --- Debuffs & Buffs ---

export interface DebuffDef {
  id: string;
  name: string;
  description: string;
  stackable: boolean;
  maxStacks: number;
  dotType?: 'flat' | 'snapshot' | 'percentMaxHp'; // DoT calculation method
  effect: {
    incDamageTaken?: number;    // % more damage taken per stack
    dotDps?: number;            // damage per second per stack (legacy flat)
    reducedDamageDealt?: number;   // Weakened: % reduced damage dealt
    missChance?: number;           // Blinded: % chance to miss
    incCritDamageTaken?: number;   // Vulnerable: % increased crit damage taken
    reducedResists?: number;       // Cursed: flat resist reduction per stack
    reducedAttackSpeed?: number;   // Slowed: % reduced attack speed
    snapshotPercent?: number;      // % of hit damage as DoT per stack (bleed/poison)
    percentMaxHp?: number;         // % of enemy max HP as DPS (burning)
    incCritChanceTaken?: number;   // +crit chance on target per stack (shocked)
    shatterOverkillPercent?: number; // % of overkill dealt to next mob (chilled)
  };
  instanceBased?: boolean;        // true = each application creates independent instance (poison)
  dotTickInterval?: number;       // seconds between batched DoT ticks (e.g. 0.5 for poison)
}

export interface PoisonInstance {
  snapshot: number;
  remainingDuration: number;
  appliedBySkillId: string;
}

export interface ActiveDebuff {
  debuffId: string;
  stacks: number;
  remainingDuration: number;    // seconds
  appliedBySkillId: string;
  stackSnapshots?: number[];    // hit damage that applied each stack (bleed/poison)
  instances?: PoisonInstance[];     // instance-based DoT (poison): each has own snapshot + duration
  dotTickAccumulator?: number;     // accumulates time between batched DoT ticks
  igniteAccumulatedDamage?: number;  // Ignite: total accumulated snapshot for ramp-on-refresh
}

export interface TempBuff {
  id: string;
  effect: AbilityEffect;
  expiresAt: number;
  sourceSkillId: string;
  stacks: number;
  maxStacks: number;
}

// --- Combo States (Dagger v2) ---

export interface ComboStateEffect {
  incDamage?: number;             // % bonus damage when consumed
  incCritChance?: number;         // % bonus crit chance when consumed
  incCritMultiplier?: number;     // % bonus crit multiplier when consumed
  cooldownAcceleration?: number;  // seconds subtracted from next skill CD
  burstDamage?: number;           // flat burst damage on consume
  burstElement?: string;          // element of burst damage
  // v2: per-skill bonus (Shadow Mark, etc.)
  guaranteedCrit?: boolean;       // consuming skill auto-crits
  ailmentPotency?: number;        // % bonus ailment potency on consuming skill
  cdRefundPercent?: number;       // % of consuming skill's CD refunded after consume
  extraChains?: number;           // bonus chain targets for consuming skill
  perSkillBonus?: Record<string, ComboStateEffect>;  // skill-specific overrides
  // Shadow Mark per-skill specials
  focusBurst?: boolean;         // Blade Dance: all hits target same enemy
  counterDamageMult?: number;   // Blade Ward: multiply counter-hit damage
  markPassthrough?: boolean;    // Shadow Dash: re-create mark after consume
}

export interface ComboState {
  stateId: string;                // e.g. 'exposed', 'deep_wound', 'shadow_momentum'
  sourceSkillId: string;          // skill that created this state
  remainingDuration: number;      // seconds until expiry
  stacks: number;
  maxStacks: number;
  effect: ComboStateEffect;
}

// ============================================================
// Combat — combat results, boss state, rare mobs, debuffs
// ============================================================

import type { AbilityEffect, DamageType } from './skills';
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

  // COMBAT_ECONOMY_DESIGN E16: consume-all spend telegraphy
  perfectSpend?: boolean;          // capBonus jackpot fired — spend consumed exactly cap stacks (Perfect)
  wetSpend?: boolean;              // a window state (Opening) was consumed by this cast (wet spend)
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
    sharedDamagePercent?: number;    // Plague Link: % of damage shared to other linked targets
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
  /** Staff v2: skill-native DoT element carried per-instance (Locust/Haunt/Toads). */
  damageElement?: DamageType;
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
  // ── COMBAT_ECONOMY_DESIGN E10: generic table-driven consume payoffs ──
  // Any creator→consumer pair may use these; read once at the consume fold.
  /** % damage per stack consumed (momentum ×(1+0.35k) → 35). */
  incDamagePerStackConsumed?: number;
  /** Perfect jackpot: applies ONLY when the consumed stacks == maxStacks. */
  capBonus?: {
    incDamage?: number;         // % damage (×1.8 → 80)
    advanceOthersSec?: number;  // advance all OTHER skill CDs (self-excluded)
  };
  /** Wet-spend tempo refund: re-create stateId with N stacks after consume. */
  refundStacks?: { stateId: string; amount: number };
  /** Generic DoT detonation: % of remaining ailment ticks dealt as instant
   *  burst (retires the deep_wound stateId hardcode). */
  detonateDotPercent?: number;
}

export interface ComboState {
  stateId: string;                // e.g. 'exposed', 'deep_wound', 'shadow_momentum'
  sourceSkillId: string;          // skill that created this state
  remainingDuration: number;      // seconds until expiry
  stacks: number;
  maxStacks: number;
  effect: ComboStateEffect;
}

// ──────────────────────────────────────────────────────────────
// ComboStateSpec — first-class typed combo state schema (§8.1)
// ──────────────────────────────────────────────────────────────
//
// Phase C3 §8.1 migration (2026-05-04): combo states are now first-class
// typed entities with their own definitions, decoupled from the skills
// that create/consume them. Source-of-truth: `src/data/comboStates.ts`
// (the COMBO_STATE_SPECS registry).
//
// Why?
//   • Phase C3 weapon pools introduced 7+ new states (bloodied, snared,
//     disarmed, frenzy, marked, marked_for_cleave, sundered) that the
//     legacy hardcoded combo.ts couldn't host without bloat.
//   • Phase F pair-fusion mechanics need fused states (hunters_shadow,
//     cursed_cascade, element_mark, self_bloodied, resonance_charge,
//     tracking_spirit, crit_stack) — these need data definitions BEFORE
//     engine wiring lands.
//   • A typed registry lets UI render state badges/tooltips without
//     reaching into engine internals.
//
// Adding a new state: drop one entry in COMBO_STATE_SPECS. Skills then
// reference the state by id in COMBO_STATE_CREATORS / CONSUMERS.

/** Where the combo state lives. */
export type ComboStateSide = 'player' | 'target';

/** UI-grouping/filter category for the state. */
export type ComboStateCategory =
  | 'self'    // Player-side buff (Frenzy, Self-Bloodied, Crit Stack, Resonance)
  | 'target'  // Enemy-side debuff (Bloodied, Hexed, Plagued, Marked, Snared)
  | 'aura'    // Persistent zone/encounter effect (Plague Aura, Shadow Veil)
  | 'stack'   // Stacking counter (Soul Stack, Frenzy stacks, Crit Stacks)
  | 'fusion'; // Phase F pair-fusion state (Hunter's Shadow, Cursed Cascade)

/**
 * First-class combo state definition.
 *
 * Adding a new state is one entry in `COMBO_STATE_SPECS`. Skills reference
 * the state's id; engine wiring resolves data via `getComboStateSpec(id)`.
 */
export interface ComboStateSpec {
  /** Stable identifier — used in skills/talents/save data. */
  id: string;
  /** Player-facing name (e.g. "Bloodied", "Hunter's Mark"). */
  name: string;
  /** One-line player-facing description. */
  description: string;
  /** Default base duration when created (seconds). */
  defaultDuration: number;
  /** Max stack count (1 for singletons, 5 for stacking states). */
  maxStacks: number;
  /** Default effect when state is active/consumed. */
  defaultEffect: ComboStateEffect;
  /** UI/filter category. */
  category: ComboStateCategory;
  /** Whether the state lives on the player or on a target enemy. */
  side: ComboStateSide;
  /**
   * Optional: this is a pair-fusion state combining two simpler states.
   * Used by Phase F pair-fusion engine to detect fused-state activation.
   * Example: `hunters_shadow` combines `marked` + `shadow_mark` for the
   * Asn+Hnt Nightstalker pair.
   */
  fusion?: {
    /** Stable ids of the two parent states this fusion combines. */
    combines: [string, string];
    /** Pair archetype name this fusion belongs to (e.g. "Nightstalker"). */
    pair: string;
  };
  /**
   * Optional: when the carrier (host) of this state dies, what happens?
   * Replaces the legacy CARRIER_DEATH_BEHAVIOR map.
   *   - 'transfer': remaining duration preserved, jumps to next enemy.
   *   - 'chain':    fresh duration, jumps to next enemy.
   *   - 'spawn_spirit': spawns a tracking spirit (Phase F Soul Trapper).
   */
  carrierDeath?: {
    mode: 'transfer' | 'chain' | 'spawn_spirit';
    freshDuration?: number; // required for 'chain' mode
  };
  /**
   * Optional: pair archetype this state is canonical for. Used by UI to
   * group states by pair brief, and by engine to gate state-aware procs.
   */
  pairArchetype?: string;
}

// ──────────────────────────────────────────────────────────────
// Channel state — active-channel tracking for skillKind: 'channel'
// ──────────────────────────────────────────────────────────────
// Phase A Change 1. Tracks an in-progress channel skill. Null when
// no channel active. Channel ticks fire every channelTickInterval
// seconds until expiresAt, consuming mana per tick. Any other skill
// cast breaks the channel early.
export interface ChannelState {
  skillId: string;
  startedAt: number;        // ms timestamp
  nextTickAt: number;       // ms timestamp — next damage/effect tick
  expiresAt: number;        // ms timestamp — channel ends here
  tickInterval: number;     // seconds — cached from skill def
}

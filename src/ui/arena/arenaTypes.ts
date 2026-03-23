// ============================================================
// Arena Types — All interfaces, types, and exported constants
// ============================================================

import type { ArenaGroundItem } from './arenaLoot';

// ── Types ──

export interface Vec2 { x: number; y: number }

export interface ArenaMob {
  mobId: number;           // stable unique ID (survives index shifts)
  packIndex: number;       // maps to packMobs[i] in game state
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  isRare: boolean;
  dead: boolean;
  deathTimer: number;      // seconds since death (for animation)
  color: string;
  vx: number;              // current velocity for smoothing
  vy: number;
  // Phase 1: Combat juice
  lastHitTime: number;     // totalTime when last hit — for white flash
  knockbackVx: number;     // knockback velocity (decays)
  knockbackVy: number;
  attackTimer: number;     // per-mob attack cooldown (seconds until next attack)
  // Debuff indicators
  activeDebuffs: string[]; // debuff IDs for visual rendering (e.g. ['poisoned','bleeding'])
  // Behavior
  behavior: 'melee' | 'fast' | 'ranged'; // movement style
}

export interface DamageFloater {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  maxAge: number;
  isCrit: boolean;
  vy: number;
}

export interface ArenaSplash {
  x: number;
  y: number;
  maxRadius: number;
  age: number;
  maxAge: number;
  color: string;
}

export interface ArenaGem {
  x: number;
  y: number;
  color: string;
  size: number;
  age: number;
  collected: boolean;
  collectTimer: number;   // animation timer after pickup
}

export interface SkillCooldownInfo {
  skillId: string;
  name: string;
  cooldownPct: number;     // 0 = ready, 1 = full cooldown
  isActive: boolean;       // currently casting
  isOnGcd: boolean;        // waiting for GCD
}

export interface ArenaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  age: number;
  maxAge: number;
}

export interface ArenaTrailDot {
  x: number;
  y: number;
  age: number;
}

export interface ArenaProjectile {
  id: number;
  x: number; y: number;
  vx: number; vy: number;    // ~200px/sec toward player
  radius: number;             // hitbox 6px
  color: string;
  age: number; maxAge: number; // 2s lifetime
  damage: number;             // pre-rolled
  sourceMobId: number;
  hit: boolean;
}

export interface ArenaTrap {
  id: number;
  x: number; y: number;
  armTimer: number;            // seconds until armed (starts at 1.5)
  armed: boolean;
  age: number;
  detonated: boolean;
  detonateTimer: number;       // >0 during detonation animation
  rotation: number;            // current spin angle (radians)
}

export type SkillVisualType = 'slash' | 'cone' | 'projectile' | 'fan' | 'ring' | 'chain' | 'trap' | 'dash';

export interface ArenaSkillVisual {
  type: SkillVisualType;
  x: number;
  y: number;
  // For slash/cone: angle + half-angle spread
  angle?: number;
  halfAngle?: number;   // cone half-spread in radians
  length?: number;       // cone reach in px
  // For chain: target positions
  targets?: Vec2[];
  // For projectile/fan: direction + travel
  dx?: number;
  dy?: number;
  dist?: number;
  // For fan: multiple projectile directions
  fanDirs?: Array<{ dx: number; dy: number }>;
  // For dash: start position (end = current x,y)
  startX?: number;
  startY?: number;
  color: string;
  age: number;
  maxAge: number;
}

export interface CombatLogEntry {
  time: number;       // session elapsed seconds
  text: string;
  color: string;
}

export interface ArenaState {
  player: Vec2;
  playerRadius: number;
  playerFacing: Vec2;       // normalized direction player last moved
  mobs: ArenaMob[];
  floaters: DamageFloater[];
  splashes: ArenaSplash[];  // visual AoE burst effects
  gems: ArenaGem[];         // XP/loot gem pickups
  lastKnownPackLength: number;
  width: number;
  height: number;
  tickAccumulator: number;
  totalTime: number;        // for pulse animations
  nextMobId: number;        // unique ID counter for visual mobs
  pendingSpawns: number;    // mobs queued for spawning (from kills)
  spawnTimer: number;       // throttle spawn rate
  // Screen shake
  shakeIntensity: number;
  shakeTimer: number;
  // Skill display
  lastCastSkillId: string | null;
  lastCastTimer: number;    // fades out the "active" highlight
  // Phase 1: Combat juice
  particles: ArenaParticle[];
  trail: ArenaTrailDot[];
  skillVisuals: ArenaSkillVisual[];
  iFrameTimer: number;       // seconds remaining of invincibility
  playerMoving: boolean;     // true when WASD held — for trail
  // Phase 3: Boss entrance
  bossEntranceTimer: number; // >0 during boss entrance animation (1s)
  lastCombatPhase: string;   // track phase transitions
  // Phase 4: HUD state
  paused: boolean;
  showStats: boolean;
  sessionStartTime: number;  // Date.now() when arena started
  sessionDeaths: number;
  // Phase 5: Camera + scrolling world
  camera: Vec2;              // top-left of viewport in world coords
  worldWidth: number;
  worldHeight: number;
  // Phase 6: Events & power fantasy
  killStreakCount: number;
  frenzyTimer: number;       // >0 during frenzy mode (kill streak reward)
  // Phase 7: Ground loot
  groundItems: ArenaGroundItem[];
  nextGroundItemId: number;
  mouseWorldPos: Vec2 | null;        // mouse position in world coords (for hover)
  currentCombatPhase: string;        // synced from store for spawn rate control
  killAccumForClears: number;             // kills toward next processNewClears call
  arenaInitialized: boolean;              // true once arena-sized pack has been spawned
  // Phase 8: Wave progression
  currentWave: number;
  waveKillCount: number;
  waveKillTarget: number;
  waveAnnouncementTimer: number;          // >0 shows "WAVE X" banner
  multiKillTimer: number;                 // >0 shows multi-kill text
  multiKillCount: number;                 // kills in current multi-kill window
  critFlashTimer: number;                 // >0 shows brief white crit flash
  // Combat log
  combatLog: CombatLogEntry[];
  // Phase 9: Ranged mob projectiles
  projectiles: ArenaProjectile[];
  nextProjectileId: number;
  // Phase 10: Persistent arena traps
  traps: ArenaTrap[];
  nextTrapId: number;
}

export interface ProjectileHitResult {
  damage: number;
  isDodged: boolean;
  isBlocked: boolean;
}

export interface ArenaRenderOpts {
  bgImage?: HTMLImageElement | null;
  zoneName?: string;
  zoneBand?: number;
  zoneILvl?: string;           // e.g. "12-20"
  combatPhase?: string;
  bossName?: string;
  bossHp?: number;
  bossMaxHp?: number;
  deathStreak?: number;
  playerLevel?: number;
  playerXp?: number;
  playerXpToNext?: number;
  zoneClearCount?: number;
  zoneClearsNeeded?: number;
  // Phase 6
  isInvaded?: boolean;
  comboStates?: Array<{ stateId: string; remainingDuration: number; stacks: number }>;
  classResourceType?: string;   // 'momentum' | 'rage' | 'charges' | 'tracking'
  classResourceStacks?: number;
}

// ── Constants ──

export const PLAYER_ATTACK_RANGE = 80;   // px — player auto-attacks mobs within this radius
export const MOB_ATTACK_RANGE = 35;      // px — mobs must be this close to hit player

// ── Splash / AoE ──
export const SPLASH_RADIUS_AOE = 150;       // px — AoE-tagged skills
export const SPLASH_RADIUS_SINGLE = 50;     // px — single-target skills
export const SPLASH_DAMAGE_SINGLE = 0.6;    // 60% damage for single-target splash

// ── Arena Mobs ──
export const KILLS_PER_CLEAR = 5;           // kills needed for 1 processNewClears call

export const FLOATER_MAX_AGE = 1.4;

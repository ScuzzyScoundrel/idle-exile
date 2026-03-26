// ============================================================
// Map Types — Room-based dungeon map interfaces
// ============================================================

import type { ArenaMob, ArenaHazard, ArenaProjectile, ArenaGem,
  ArenaParticle, DamageFloater, ArenaSplash, ArenaSkillVisual, ArenaTrailDot,
  ArenaTrap, ArenaShrine, ArenaShrineEffect, CombatLogEntry,
  Vec2 } from '../arena/arenaTypes';
import type { ArenaGroundItem } from '../arena/arenaLoot';

export type { Vec2 } from '../arena/arenaTypes';

// ── Player Debuffs ──

export interface PlayerDebuff {
  type: 'slow' | 'poison' | 'chill' | 'curse' | 'bleed';
  remainingTime: number;  // seconds
  magnitude: number;      // slow: speed mult (0.5 = 50% slow), poison: DPS, curse: dmg taken mult, bleed: DPS when moving
}

// ── Rare Mob Signature Attacks ──

export interface RareAbilityState {
  type: 'charge' | 'leap' | 'spin';
  cooldown: number;       // seconds until next ability
  telegraphTimer: number; // >0 during telegraph
  activeTimer: number;    // >0 during ability execution
  targetX: number;
  targetY: number;
}

// ── Map Boss ──

export interface MapBoss {
  x: number; y: number;
  radius: number;           // 45px
  hp: number; maxHp: number;
  name: string; color: string;
  vx: number; vy: number;
  lastHitTime: number;
  knockbackVx: number; knockbackVy: number;
  dead: boolean; deathTimer: number;
  phase: 1 | 2 | 3 | 4;
  slamTimer: number;        // countdown to next AoE slam
  barrageTimer: number;     // countdown to next projectile barrage
  hazardTimer: number;      // countdown to next ground hazard drop
  slamTelegraph: number;    // >0 during telegraph warning before slam
  slamX: number; slamY: number; // slam target position
  entranceTimer: number;    // walk-in animation
}

// ── Wall / Room Geometry ──

export interface WallSegment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface RoomDoor {
  x: number; y: number;
  width: number;          // door opening width (px)
  direction: 'north' | 'south' | 'east' | 'west';
  connectsTo: number;     // index of room this door leads to
}

export interface MobSpawnPoint {
  x: number; y: number;
  tier: 'white' | 'magic' | 'rare';
}

export interface RoomChest {
  id: number;
  x: number; y: number;
  opened: boolean;
  tier: 'normal' | 'rare' | 'boss';
}

export type RoomType = 'entry' | 'pack' | 'large' | 'side' | 'corridor' | 'boss';

export interface MapRoom {
  id: number;
  type: RoomType;
  // World-space bounding box
  x: number; y: number;
  width: number; height: number;
  // Geometry
  walls: WallSegment[];
  doors: RoomDoor[];
  // Content
  spawnPoints: MobSpawnPoint[];
  chests: RoomChest[];
  hasShrineSpot: boolean;
  shrinePos?: Vec2;
  // State
  entered: boolean;          // player has visited this room
  cleared: boolean;          // all mobs in this room dead
  mobIds: number[];          // mobId references into MapState.mobs
}

/** A decorative/collision prop placed in a room (rocks, trees, ruins). */
export interface MapProp {
  x: number; y: number;
  width: number; height: number;    // render size
  spriteIdx: number;                // index into prop sprite array
  collisionRadius: number;          // 0 = decorative only, >0 = blocks movement
}

export interface MapLayout {
  rooms: MapRoom[];
  worldWidth: number;
  worldHeight: number;
  startRoomId: number;
  exitRoomId: number;        // final room (or boss room)
  props: MapProp[];          // world-space props (rocks, trees, etc.)
}

// ── Map State (extends arena-compatible fields) ──

export interface MapState {
  // Player
  player: Vec2;
  playerRadius: number;
  playerFacing: Vec2;
  playerMoving: boolean;

  // Camera
  camera: Vec2;
  width: number;             // viewport width
  height: number;            // viewport height

  // Map layout
  layout: MapLayout;
  currentRoomId: number;     // room the player is currently in

  // Mobs (same as arena)
  mobs: ArenaMob[];
  bossMob: MapBoss | null;
  nextMobId: number;

  // Combat visuals (reused from arena)
  floaters: DamageFloater[];
  splashes: ArenaSplash[];
  particles: ArenaParticle[];
  trail: ArenaTrailDot[];
  skillVisuals: ArenaSkillVisual[];
  combatLog: CombatLogEntry[];

  // Projectiles & hazards
  projectiles: ArenaProjectile[];
  nextProjectileId: number;
  hazards: ArenaHazard[];
  nextHazardId: number;
  traps: ArenaTrap[];
  nextTrapId: number;

  // Loot
  groundItems: ArenaGroundItem[];
  nextGroundItemId: number;
  gems: ArenaGem[];

  // Shrines (placed in rooms, not kill-based)
  shrines: ArenaShrine[];
  nextShrineId: number;
  activeShrineEffects: ArenaShrineEffect[];

  // Player state
  iFrameTimer: number;
  dodgeRollCooldown: number;
  dodgeRollTimer: number;
  dodgeRollDir: Vec2;
  hitStopTimer: number;
  shakeIntensity: number;
  shakeTimer: number;
  critFlashTimer: number;

  // Skill display
  lastCastSkillId: string | null;
  lastCastTimer: number;

  // Timing
  totalTime: number;
  tickAccumulator: number;

  // Session
  paused: boolean;
  sessionStartTime: number;

  // Map progress
  phase: 'exploring' | 'combat' | 'boss_fight' | 'complete' | 'failed';
  roomsCleared: number;
  totalRooms: number;         // excludes corridors
  totalKills: number;
  mapStartTime: number;
  isBossMap: boolean;
  bossDefeatedBanner: number; // >0 shows "BOSS DEFEATED" banner (countdown)
  completedAt: number;        // Date.now() when map completed (0 = not yet)

  // Mouse
  mouseWorldPos: Vec2 | null;

  // Store sync
  lastKnownPackLength: number;
  killAccumForClears: number;

  // Frenzy / streaks
  killStreakCount: number;
  frenzyTimer: number;
  multiKillTimer: number;
  multiKillCount: number;

  // Corrupted map state
  corruptedTier: number;           // 0 = normal map, 1+ = corrupted
  modifiers: MapModifier[];        // active map modifiers
  timerRemaining: number | null;   // temporal modifier countdown (null = no timer)

  // Player debuffs (from mob hits)
  playerDebuffs: PlayerDebuff[];

  // Rare mob signature attacks
  rareAbilityStates: Map<number, RareAbilityState>;

  // Exit portal (spawns when boss dies)
  portal: { x: number; y: number; active: boolean } | null;

  // Fog of war (radius-based reveal)
  fogCanvas: OffscreenCanvas | null;
  fogCtx: OffscreenCanvasRenderingContext2D | null;

  // Collision polygon (pre-traced from background image tree lines)
  // Vertices are normalized 0..1 — mapped per-room at runtime
  collisionPolygon: number[][] | null;
}

// ── Map Modifiers (Corrupted Maps) ──

export interface MapModifier {
  id: string;
  label: string;
  description: string;
  /** Multiplicative reward bonuses: xp, loot, fragments */
  xpMult: number;
  lootMult: number;
  fragMult: number;
}

// ── Room Templates ──

export interface RoomTemplate {
  type: RoomType;
  width: number;
  height: number;
  /** Wall offsets relative to room origin (0,0). Doors are gaps in walls. */
  wallBuilder: (x: number, y: number, w: number, h: number) => WallSegment[];
  /** Spawn point positions relative to room origin */
  spawnBuilder: (w: number, h: number, tier: RoomType) => MobSpawnPoint[];
}

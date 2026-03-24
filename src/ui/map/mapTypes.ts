// ============================================================
// Map Types — Room-based dungeon map interfaces
// ============================================================

import type { ArenaMob, ArenaHazard, ArenaProjectile, ArenaGem,
  ArenaParticle, DamageFloater, ArenaSplash, ArenaSkillVisual, ArenaTrailDot,
  ArenaTrap, ArenaShrine, ArenaShrineEffect, ArenaBoss, CombatLogEntry,
  Vec2 } from '../arena/arenaTypes';
import type { ArenaGroundItem } from '../arena/arenaLoot';

export type { Vec2 } from '../arena/arenaTypes';

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

export interface MapLayout {
  rooms: MapRoom[];
  worldWidth: number;
  worldHeight: number;
  startRoomId: number;
  exitRoomId: number;        // final room (or boss room)
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
  bossMob: ArenaBoss | null;
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
  phase: 'exploring' | 'combat' | 'complete' | 'failed';
  roomsCleared: number;
  totalRooms: number;         // excludes corridors
  totalKills: number;
  mapStartTime: number;

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

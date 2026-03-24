// ============================================================
// Map Engine — State creation, wall collision, update loop,
// mob aggro, room transitions
// ============================================================

import type { MapState, MapLayout, WallSegment, MapRoom, Vec2, MapBoss, MapModifier } from './mapTypes';
import type { ArenaMob, ShrineType } from '../arena/arenaTypes';
import { generateMap, createMobFromSpawn, getAllWalls, getRoomAtPosition, hasModifier } from './mapGeneration';
import { PLAYER_SPEED, moveMobsTowardPlayer } from '../arena/arenaMovement';
import { updateGems } from '../arena/arenaCombatFeedback';

// ── Constants ──

const PLAYER_RADIUS = 16;
const AGGRO_RANGE = 200;          // px — mobs wake up when player enters this range
const MOB_ROOM_LEASH = 40;        // px — mobs won't chase past room bounds + leash
const WALL_PUSH_DISTANCE = 1;     // px — how far to push entity out of wall

// Boss constants
const BOSS_RADIUS = 45;
const BOSS_SPEED_RATIO = 0.6;     // 60% of PLAYER_SPEED
const BOSS_PREFERRED_DIST = 80;   // px — boss prefers this distance from player
const BOSS_SLAM_RADIUS = 80;
const BOSS_SLAM_TELEGRAPH = 1.0;  // seconds warning before slam
const BOSS_BARRAGE_COUNT = 8;     // projectiles in a ring
const BOSS_BARRAGE_SPEED = 200;   // px/sec
const BOSS_HAZARD_RADIUS = 40;
const BOSS_HAZARD_DURATION = 3.0;
export const BOSS_SLAM_DAMAGE_MULT = 3;
export const BOSS_BARRAGE_DAMAGE_MULT = 1;
export const BOSS_HAZARD_DPS_MULT = 1.5;

// Zone band → boss color
const BOSS_COLORS: Record<number, string> = {
  1: '#ef4444',  // red
  2: '#f97316',  // orange
  3: '#eab308',  // yellow
  4: '#22d3ee',  // cyan
};
function getBossColor(band: number): string {
  return BOSS_COLORS[band] ?? '#a78bfa'; // purple for band 5+
}

// ── State Creation ──

export function createMapState(
  viewportWidth: number,
  viewportHeight: number,
  zoneBand: number,
  wave: number,
  isBossMap: boolean,
  corruptedTier: number = 0,
  modifiers: MapModifier[] = [],
): MapState {
  const layout = generateMap(zoneBand, wave, isBossMap, modifiers);
  const startRoom = layout.rooms.find(r => r.id === layout.startRoomId)!;

  // Player starts in center of entry room
  const playerX = startRoom.x + startRoom.width / 2;
  const playerY = startRoom.y + startRoom.height / 2;

  const state: MapState = {
    player: { x: playerX, y: playerY },
    playerRadius: PLAYER_RADIUS,
    playerFacing: { x: 0, y: 1 },
    playerMoving: false,

    camera: { x: playerX - viewportWidth / 2, y: playerY - viewportHeight / 2 },
    width: viewportWidth,
    height: viewportHeight,

    layout,
    currentRoomId: layout.startRoomId,

    mobs: [],
    bossMob: null,
    nextMobId: 1,

    floaters: [],
    splashes: [],
    particles: [],
    trail: [],
    skillVisuals: [],
    combatLog: [],

    projectiles: [],
    nextProjectileId: 1,
    hazards: [],
    nextHazardId: 1,
    traps: [],
    nextTrapId: 1,

    groundItems: [],
    nextGroundItemId: 1,
    gems: [],

    shrines: [],
    nextShrineId: 1,
    activeShrineEffects: [],

    iFrameTimer: 0,
    dodgeRollCooldown: 0,
    dodgeRollTimer: 0,
    dodgeRollDir: { x: 0, y: 1 },
    hitStopTimer: 0,
    shakeIntensity: 0,
    shakeTimer: 0,
    critFlashTimer: 0,

    lastCastSkillId: null,
    lastCastTimer: 0,

    totalTime: 0,
    tickAccumulator: 0,

    paused: false,
    sessionStartTime: Date.now(),

    phase: 'exploring',
    roomsCleared: 0,
    totalRooms: layout.rooms.filter(r => r.type !== 'corridor').length,
    totalKills: 0,
    mapStartTime: Date.now(),
    isBossMap: isBossMap,
    bossDefeatedBanner: 0,

    mouseWorldPos: null,

    lastKnownPackLength: 0,
    killAccumForClears: 0,

    killStreakCount: 0,
    frenzyTimer: 0,
    multiKillTimer: 0,
    multiKillCount: 0,

    corruptedTier,
    modifiers,
    timerRemaining: hasModifier(modifiers, 'temporal') ? 180 : null, // 3 minutes
  };

  // Populate mobs for all rooms
  populateAllRooms(state, zoneBand, wave, corruptedTier, modifiers);

  // Place shrines in rooms that have shrine spots
  for (const room of layout.rooms) {
    if (room.hasShrineSpot && room.shrinePos) {
      placeRoomShrine(state, room);
    }
  }

  return state;
}

// ── Mob Population ──

function populateAllRooms(state: MapState, zoneBand: number, wave: number, corruptedTier: number = 0, modifiers: MapModifier[] = []): void {
  let packIndex = 0;
  for (const room of state.layout.rooms) {
    for (const spawn of room.spawnPoints) {
      const mob = createMobFromSpawn(spawn, state.nextMobId++, packIndex++, wave, zoneBand, corruptedTier, modifiers);
      room.mobIds.push(mob.mobId);
      state.mobs.push(mob);
    }
  }
}

// ── Shrines ──

const SHRINE_TYPES: ShrineType[] = ['damage', 'speed', 'magnet', 'bomb'];

function placeRoomShrine(state: MapState, room: MapRoom): void {
  if (!room.shrinePos) return;
  const type = SHRINE_TYPES[Math.floor(Math.random() * SHRINE_TYPES.length)];
  state.shrines.push({
    id: state.nextShrineId++,
    x: room.shrinePos.x,
    y: room.shrinePos.y,
    type,
    age: 0,
    collected: false,
  });
}

// ── Wall Collision ──

/** Check if a circle (entity) overlaps any wall segment. Returns push vector or null. */
export function resolveWallCollision(
  pos: Vec2,
  radius: number,
  walls: WallSegment[],
): Vec2 | null {
  let pushX = 0, pushY = 0;
  let pushed = false;

  for (const wall of walls) {
    const closest = closestPointOnSegment(pos, wall);
    const dx = pos.x - closest.x;
    const dy = pos.y - closest.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius + WALL_PUSH_DISTANCE) {
      // Push entity away from wall
      if (dist < 0.01) {
        // Entity is exactly on the wall — push perpendicular
        const wx = wall.x2 - wall.x1;
        const wy = wall.y2 - wall.y1;
        const len = Math.sqrt(wx * wx + wy * wy);
        if (len > 0) {
          pushX += -wy / len * (radius + WALL_PUSH_DISTANCE);
          pushY += wx / len * (radius + WALL_PUSH_DISTANCE);
        }
      } else {
        const overlap = radius + WALL_PUSH_DISTANCE - dist;
        pushX += (dx / dist) * overlap;
        pushY += (dy / dist) * overlap;
      }
      pushed = true;
    }
  }

  return pushed ? { x: pushX, y: pushY } : null;
}

/** Closest point on a wall segment to a position. */
function closestPointOnSegment(pos: Vec2, wall: WallSegment): Vec2 {
  const wx = wall.x2 - wall.x1;
  const wy = wall.y2 - wall.y1;
  const len2 = wx * wx + wy * wy;

  if (len2 < 0.01) return { x: wall.x1, y: wall.y1 };

  let t = ((pos.x - wall.x1) * wx + (pos.y - wall.y1) * wy) / len2;
  t = Math.max(0, Math.min(1, t));

  return {
    x: wall.x1 + t * wx,
    y: wall.y1 + t * wy,
  };
}

/** Check if a line segment (projectile path) intersects any wall.
 *  Returns the first intersection point or null. */
export function raycastWalls(
  from: Vec2, to: Vec2, walls: WallSegment[],
): Vec2 | null {
  let closest: Vec2 | null = null;
  let closestDist = Infinity;

  for (const wall of walls) {
    const hit = segmentIntersection(from, to, wall);
    if (hit) {
      const dx = hit.x - from.x;
      const dy = hit.y - from.y;
      const d = dx * dx + dy * dy;
      if (d < closestDist) {
        closestDist = d;
        closest = hit;
      }
    }
  }

  return closest;
}

/** Line segment intersection test. */
function segmentIntersection(
  a1: Vec2, a2: Vec2, wall: WallSegment,
): Vec2 | null {
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = wall.x2 - wall.x1;
  const dy2 = wall.y2 - wall.y1;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 0.001) return null; // parallel

  const t = ((wall.x1 - a1.x) * dy2 - (wall.y1 - a1.y) * dx2) / denom;
  const u = ((wall.x1 - a1.x) * dy1 - (wall.y1 - a1.y) * dx1) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a1.x + t * dx1,
      y: a1.y + t * dy1,
    };
  }
  return null;
}

// ── Update Loop ──

export function updateMap(state: MapState, dt: number, keys: Set<string>): void {
  // Hit-stop freeze
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    return;
  }

  state.totalTime += dt;
  const allWalls = getAllWalls(state.layout);

  // ── Player Movement ──
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Mouse aim
  if (state.mouseWorldPos) {
    const mx = state.mouseWorldPos.x - state.player.x;
    const my = state.mouseWorldPos.y - state.player.y;
    const mLen = Math.sqrt(mx * mx + my * my);
    if (mLen > 5) {
      state.playerFacing = { x: mx / mLen, y: my / mLen };
    }
  } else if (dx !== 0 || dy !== 0) {
    state.playerFacing = { x: dx, y: dy };
  }

  // Speed shrine buff
  const hasSpeedBuff = state.activeShrineEffects.some(e => e.type === 'speed');
  const speedMult = hasSpeedBuff ? 1.5 : 1;

  // Dodge roll
  if (state.dodgeRollCooldown > 0) state.dodgeRollCooldown -= dt;
  if (state.dodgeRollTimer > 0) {
    const DODGE_SPEED = PLAYER_SPEED * 4;
    state.player.x += state.dodgeRollDir.x * DODGE_SPEED * dt;
    state.player.y += state.dodgeRollDir.y * DODGE_SPEED * dt;
    state.dodgeRollTimer -= dt;
    state.iFrameTimer = 0.1;
    state.playerMoving = true;
  } else {
    state.player.x += dx * PLAYER_SPEED * speedMult * dt;
    state.player.y += dy * PLAYER_SPEED * speedMult * dt;
  }
  state.playerMoving = dx !== 0 || dy !== 0 || state.dodgeRollTimer > 0;

  // Wall collision for player
  const playerPush = resolveWallCollision(state.player, state.playerRadius, allWalls);
  if (playerPush) {
    state.player.x += playerPush.x;
    state.player.y += playerPush.y;
  }

  // World bounds clamp
  state.player.x = Math.max(state.playerRadius, Math.min(state.layout.worldWidth - state.playerRadius, state.player.x));
  state.player.y = Math.max(state.playerRadius, Math.min(state.layout.worldHeight - state.playerRadius, state.player.y));

  // ── Camera Follow ──
  const DEADZONE = 40;
  const CAMERA_SMOOTH = 5;
  const targetCamX = state.player.x - state.width / 2;
  const targetCamY = state.player.y - state.height / 2;
  const camDx = targetCamX - state.camera.x;
  const camDy = targetCamY - state.camera.y;
  if (Math.abs(camDx) > DEADZONE) state.camera.x += (camDx - Math.sign(camDx) * DEADZONE) * CAMERA_SMOOTH * dt;
  if (Math.abs(camDy) > DEADZONE) state.camera.y += (camDy - Math.sign(camDy) * DEADZONE) * CAMERA_SMOOTH * dt;
  state.camera.x = Math.max(0, Math.min(state.layout.worldWidth - state.width, state.camera.x));
  state.camera.y = Math.max(0, Math.min(state.layout.worldHeight - state.height, state.camera.y));

  // ── Room Detection ──
  const currentRoom = getRoomAtPosition(state.layout, state.player);
  if (currentRoom && currentRoom.id !== state.currentRoomId) {
    state.currentRoomId = currentRoom.id;
    if (!currentRoom.entered) {
      currentRoom.entered = true;
    }
  }

  // ── Boss Spawn Detection (when player enters boss room) ──
  // Actual boss spawning is handled in MapScreen (needs store/zone data).
  // This just flags the phase transition so MapScreen knows to call spawnMapBoss().
  if (state.isBossMap && !state.bossMob && currentRoom?.type === 'boss' && state.phase !== 'boss_fight') {
    state.phase = 'boss_fight';
  }

  // ── Mob Aggro + Movement ──
  // Only move mobs that are in entered rooms and within aggro range
  const activeMobs: ArenaMob[] = [];
  for (const mob of state.mobs) {
    if (mob.dead) continue;
    const room = findMobRoom(state.layout, mob.mobId);
    if (!room || !room.entered) continue;

    const pdx = state.player.x - mob.x;
    const pdy = state.player.y - mob.y;
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

    if (pDist <= AGGRO_RANGE) {
      activeMobs.push(mob);
    }
  }

  // Move aggroed mobs toward player
  moveMobsTowardPlayer(state as any, activeMobs, dt);

  // Wall collision for mobs
  for (const mob of activeMobs) {
    const mobPush = resolveWallCollision({ x: mob.x, y: mob.y }, mob.radius, allWalls);
    if (mobPush) {
      mob.x += mobPush.x;
      mob.y += mobPush.y;
    }

    // Leash: don't let mobs wander too far from their room
    const room = findMobRoom(state.layout, mob.mobId);
    if (room) {
      mob.x = Math.max(room.x - MOB_ROOM_LEASH, Math.min(room.x + room.width + MOB_ROOM_LEASH, mob.x));
      mob.y = Math.max(room.y - MOB_ROOM_LEASH, Math.min(room.y + room.height + MOB_ROOM_LEASH, mob.y));
    }
  }

  // ── Projectile Wall Collision ──
  for (const proj of state.projectiles) {
    if (proj.hit) continue;
    const nextX = proj.x + proj.vx * dt;
    const nextY = proj.y + proj.vy * dt;
    const wallHit = raycastWalls(
      { x: proj.x, y: proj.y },
      { x: nextX, y: nextY },
      allWalls,
    );
    if (wallHit) {
      proj.x = wallHit.x;
      proj.y = wallHit.y;
      proj.hit = true;

      // Mortar: spawn hazard on wall hit
      if (proj.isMortar) {
        state.hazards.push({
          id: state.nextHazardId++,
          x: wallHit.x, y: wallHit.y,
          radius: 40, type: 'fire',
          age: 0, maxAge: 3,
          damagePerSec: 8,
          lastDamageTick: 0,
        });
      }
    } else {
      proj.x = nextX;
      proj.y = nextY;
    }
    proj.age += dt;
  }
  state.projectiles = state.projectiles.filter(p => !p.hit && p.age < p.maxAge);

  // ── Hazard Aging ──
  for (const h of state.hazards) h.age += dt;
  state.hazards = state.hazards.filter(h => h.age < h.maxAge);
  if (state.hazards.length > 30) state.hazards = state.hazards.slice(-30);

  // ── Teleporter Affix ──
  for (const mob of state.mobs) {
    if (mob.dead || !mob.arenaAffixes.includes('teleporter')) continue;
    mob.teleportTimer -= dt;
    if (mob.teleportTimer <= 0) {
      mob.teleportTimer = 3 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 40;
      const newX = state.player.x + Math.cos(angle) * dist;
      const newY = state.player.y + Math.sin(angle) * dist;
      // Only teleport if destination isn't inside a wall
      const push = resolveWallCollision({ x: newX, y: newY }, mob.radius, allWalls);
      mob.x = push ? newX + push.x : newX;
      mob.y = push ? newY + push.y : newY;
      mob.vx = 0;
      mob.vy = 0;
      for (let i = 0; i < 6; i++) {
        const pa = Math.random() * Math.PI * 2;
        state.particles.push({
          x: mob.x, y: mob.y,
          vx: Math.cos(pa) * 60, vy: Math.sin(pa) * 60,
          size: 2 + Math.random() * 2,
          color: '#a78bfa',
          age: 0, maxAge: 0.3 + Math.random() * 0.2,
        });
      }
    }
  }

  // ── Mortar Affix ──
  for (const mob of state.mobs) {
    if (mob.dead || !mob.arenaAffixes.includes('mortar')) continue;
    mob.mortarTimer -= dt;
    if (mob.mortarTimer <= 0) {
      mob.mortarTimer = 4 + Math.random() * 2;
      const mdx = state.player.x - mob.x;
      const mdy = state.player.y - mob.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist > 1 && mDist < 500) {
        const MORTAR_SPEED = 100;
        state.projectiles.push({
          id: state.nextProjectileId++,
          x: mob.x, y: mob.y,
          vx: (mdx / mDist) * MORTAR_SPEED,
          vy: (mdy / mDist) * MORTAR_SPEED,
          radius: 8, color: '#fb923c',
          age: 0, maxAge: 3.0,
          damage: 0, sourceMobId: mob.mobId,
          hit: false, isMortar: true,
        });
      }
    }
  }

  // ── Player Trail ──
  if (state.playerMoving) {
    if (state.trail.length === 0 || state.trail[state.trail.length - 1].age > 0.04) {
      state.trail.push({ x: state.player.x, y: state.player.y, age: 0 });
    }
  }
  for (const dot of state.trail) dot.age += dt;
  state.trail = state.trail.filter(d => d.age < 0.25);
  if (state.trail.length > 6) state.trail = state.trail.slice(-6);

  // ── Knockback Decay ──
  const KNOCKBACK_FRICTION = 8;
  for (const mob of state.mobs) {
    if (mob.knockbackVx !== 0 || mob.knockbackVy !== 0) {
      mob.x += mob.knockbackVx * dt;
      mob.y += mob.knockbackVy * dt;
      mob.knockbackVx *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt);
      mob.knockbackVy *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt);
      if (Math.abs(mob.knockbackVx) < 1) mob.knockbackVx = 0;
      if (Math.abs(mob.knockbackVy) < 1) mob.knockbackVy = 0;
    }
  }

  // ── Particles ──
  for (const p of state.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
  }
  state.particles = state.particles.filter(p => p.age < p.maxAge);

  // ── Skill Visuals ──
  for (const sv of state.skillVisuals) {
    sv.age += dt;
    if (sv.type === 'projectile' && sv.dx !== undefined && sv.dy !== undefined) {
      sv.x += sv.dx * 400 * dt;
      sv.y += sv.dy * 400 * dt;
    }
  }
  state.skillVisuals = state.skillVisuals.filter(sv => sv.age < sv.maxAge);

  // ── Traps ──
  for (const trap of state.traps) {
    trap.age += dt;
    trap.rotation += (trap.armed ? 8 : 3) * dt;
    if (!trap.armed && trap.armTimer > 0) {
      trap.armTimer -= dt;
      if (trap.armTimer <= 0) trap.armed = true;
    }
    if (trap.detonated) trap.detonateTimer += dt;
  }
  state.traps = state.traps.filter(t => !t.detonated || t.detonateTimer < 0.5);

  // ── Gems ──
  updateGems(state as any, dt);

  // ── Shrines ──
  for (const shrine of state.shrines) {
    shrine.age += dt;
    if (shrine.collected) continue;
    const sdx = state.player.x - shrine.x;
    const sdy = state.player.y - shrine.y;
    if (Math.sqrt(sdx * sdx + sdy * sdy) < state.playerRadius + 20) {
      shrine.collected = true;
      // Effect applied in MapScreen
    }
  }
  state.shrines = state.shrines.filter(s => !s.collected && s.age < 60);

  // ── Shrine Effect Decay ──
  for (const eff of state.activeShrineEffects) eff.remainingTime -= dt;
  state.activeShrineEffects = state.activeShrineEffects.filter(e => e.remainingTime > 0);

  // ── Timer Decays ──
  if (state.iFrameTimer > 0) state.iFrameTimer -= dt;
  if (state.frenzyTimer > 0) state.frenzyTimer -= dt;
  if (state.multiKillTimer > 0) state.multiKillTimer -= dt;
  if (state.critFlashTimer > 0) state.critFlashTimer -= dt;
  if (state.shakeTimer > 0) {
    state.shakeTimer -= dt;
    if (state.shakeTimer <= 0) state.shakeIntensity = 0;
  }
  if (state.lastCastTimer > 0) {
    state.lastCastTimer -= dt;
    if (state.lastCastTimer <= 0) state.lastCastSkillId = null;
  }

  // ── Floaters ──
  for (const f of state.floaters) {
    f.age += dt;
    f.y += f.vy * dt;
    f.vy -= 100 * dt;
  }
  state.floaters = state.floaters.filter(f => f.age < f.maxAge);

  // ── Death Animations ──
  for (const m of state.mobs) {
    if (m.dead) m.deathTimer += dt;
  }
  state.mobs = state.mobs.filter(m => !m.dead || m.deathTimer < 0.6);

  // ── Room Cleared Detection ──
  for (const room of state.layout.rooms) {
    if (room.cleared || !room.entered) continue;
    const roomMobsAlive = room.mobIds.some(id => {
      const mob = state.mobs.find(m => m.mobId === id);
      return mob && !mob.dead;
    });
    if (!roomMobsAlive && room.mobIds.length > 0) {
      room.cleared = true;
      if (room.type !== 'corridor') {
        state.roomsCleared++;
      }
    }
  }

  // ── Boss AI Tick ──
  if (state.bossMob && !state.bossMob.dead) {
    updateMapBoss(state, dt, allWalls);
  }

  // ── Boss Defeated Banner Decay ──
  if (state.bossDefeatedBanner > 0) {
    state.bossDefeatedBanner -= dt;
  }

  // ── Map Complete Check ──
  if (state.isBossMap) {
    // Boss map: complete when boss is dead
    if (state.bossMob && state.bossMob.dead && state.bossMob.deathTimer > 2.0 && state.phase !== 'complete') {
      state.phase = 'complete';
    }
  } else {
    const exitRoom = state.layout.rooms.find(r => r.id === state.layout.exitRoomId);
    if (exitRoom && exitRoom.cleared && state.phase !== 'complete') {
      state.phase = 'complete';
    }
  }

  // ── Temporal Modifier Timer ──
  if (state.timerRemaining !== null && state.phase !== 'complete' && state.phase !== 'failed') {
    state.timerRemaining -= dt;
    if (state.timerRemaining <= 0) {
      state.timerRemaining = 0;
      state.phase = 'failed';
    }
  }

  // ── Tick Accumulator ──
  state.tickAccumulator += dt;
}

// ── Helpers ──

/** Find which room a mob belongs to by mobId. */
function findMobRoom(layout: MapLayout, mobId: number): MapRoom | null {
  for (const room of layout.rooms) {
    if (room.mobIds.includes(mobId)) return room;
  }
  return null;
}

/** Get living mobs within player attack range. */
export function getMapMobsInRange(state: MapState, range: number): ArenaMob[] {
  return state.mobs.filter(m => {
    if (m.dead) return false;
    const dx = state.player.x - m.x;
    const dy = state.player.y - m.y;
    return Math.sqrt(dx * dx + dy * dy) <= range;
  });
}

/** True if any living mob is within range. */
export function anyMapMobInRange(state: MapState, range: number): boolean {
  return state.mobs.some(m => {
    if (m.dead) return false;
    const dx = state.player.x - m.x;
    const dy = state.player.y - m.y;
    return Math.sqrt(dx * dx + dy * dy) <= range;
  });
}

/** True if mob is close enough to melee the player. */
export function mobCanAttackMapPlayer(state: MapState, mob: ArenaMob): boolean {
  const dx = state.player.x - mob.x;
  const dy = state.player.y - mob.y;
  return Math.sqrt(dx * dx + dy * dy) <= 35 + state.playerRadius + mob.radius;
}

// ============================================================
// Boss System
// ============================================================

/** Spawn a boss in the boss room. Called from MapScreen when player enters boss room. */
export function spawnMapBoss(state: MapState, zoneBand: number, bossName: string): void {
  const bossRoom = state.layout.rooms.find(r => r.type === 'boss');
  if (!bossRoom) return;

  let baseHp = 500 + zoneBand * 300;
  // Corrupted tier scaling: +8% HP per tier
  if (state.corruptedTier > 0) baseHp = Math.round(baseHp * (1 + state.corruptedTier * 0.08));
  // Empowered modifier: +50% boss HP
  if (hasModifier(state.modifiers, 'empowered')) baseHp = Math.round(baseHp * 1.5);
  const boss: MapBoss = {
    x: bossRoom.x + bossRoom.width / 2,
    y: bossRoom.y + bossRoom.height * 0.35,
    radius: BOSS_RADIUS,
    hp: baseHp,
    maxHp: baseHp,
    name: bossName,
    color: getBossColor(zoneBand),
    vx: 0, vy: 0,
    lastHitTime: -1,
    knockbackVx: 0, knockbackVy: 0,
    dead: false, deathTimer: 0,
    phase: 1,
    slamTimer: 4.0 + Math.random() * 2,
    barrageTimer: 6.0 + Math.random() * 2,
    hazardTimer: 5.0 + Math.random() * 2,
    slamTelegraph: 0,
    slamX: 0, slamY: 0,
    entranceTimer: 1.0,
  };

  state.bossMob = boss;
  state.phase = 'boss_fight';

  // Screen shake for entrance
  state.shakeIntensity = 6;
  state.shakeTimer = 0.4;

  // Entrance particles
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    state.particles.push({
      x: boss.x, y: boss.y,
      vx: Math.cos(angle) * (80 + Math.random() * 60),
      vy: Math.sin(angle) * (80 + Math.random() * 60),
      size: 3 + Math.random() * 3,
      color: boss.color,
      age: 0, maxAge: 0.6 + Math.random() * 0.4,
    });
  }
}

/** Update boss AI: movement, phase transitions, attack patterns. */
function updateMapBoss(state: MapState, dt: number, allWalls: WallSegment[]): void {
  const boss = state.bossMob;
  if (!boss || boss.dead) return;

  // Entrance animation — boss stands still
  if (boss.entranceTimer > 0) {
    boss.entranceTimer -= dt;
    return;
  }

  // ── Phase Detection ──
  const hpPct = boss.hp / boss.maxHp;
  const prevPhase = boss.phase;
  if (hpPct > 0.75) boss.phase = 1;
  else if (hpPct > 0.5) boss.phase = 2;
  else if (hpPct > 0.25) boss.phase = 3;
  else boss.phase = 4;

  // Phase transition effects
  if (boss.phase !== prevPhase) {
    state.shakeIntensity = 8;
    state.shakeTimer = 0.3;
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      state.particles.push({
        x: boss.x, y: boss.y,
        vx: Math.cos(angle) * (100 + Math.random() * 80),
        vy: Math.sin(angle) * (100 + Math.random() * 80),
        size: 2 + Math.random() * 3,
        color: boss.color,
        age: 0, maxAge: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // ── Enrage Speed Multiplier ──
  const enrageMult = boss.phase === 4 ? 1.5 : 1.0;

  // ── Boss Movement (toward player, prefer BOSS_PREFERRED_DIST) ──
  const pdx = state.player.x - boss.x;
  const pdy = state.player.y - boss.y;
  const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

  if (pDist > 1) {
    const bossSpeed = PLAYER_SPEED * BOSS_SPEED_RATIO * enrageMult;
    let moveX = 0, moveY = 0;

    if (pDist > BOSS_PREFERRED_DIST + 10) {
      // Move toward player
      moveX = (pdx / pDist) * bossSpeed * dt;
      moveY = (pdy / pDist) * bossSpeed * dt;
    } else if (pDist < BOSS_PREFERRED_DIST - 20) {
      // Back away slightly
      moveX = -(pdx / pDist) * bossSpeed * 0.3 * dt;
      moveY = -(pdy / pDist) * bossSpeed * 0.3 * dt;
    }

    boss.x += moveX;
    boss.y += moveY;
  }

  // Knockback decay
  if (boss.knockbackVx !== 0 || boss.knockbackVy !== 0) {
    boss.x += boss.knockbackVx * dt;
    boss.y += boss.knockbackVy * dt;
    const friction = 8;
    boss.knockbackVx *= Math.max(0, 1 - friction * dt);
    boss.knockbackVy *= Math.max(0, 1 - friction * dt);
    if (Math.abs(boss.knockbackVx) < 1) boss.knockbackVx = 0;
    if (Math.abs(boss.knockbackVy) < 1) boss.knockbackVy = 0;
  }

  // Wall collision for boss
  const bossPush = resolveWallCollision({ x: boss.x, y: boss.y }, boss.radius, allWalls);
  if (bossPush) {
    boss.x += bossPush.x;
    boss.y += bossPush.y;
  }

  // Clamp boss to boss room
  const bossRoom = state.layout.rooms.find(r => r.type === 'boss');
  if (bossRoom) {
    boss.x = Math.max(bossRoom.x + boss.radius, Math.min(bossRoom.x + bossRoom.width - boss.radius, boss.x));
    boss.y = Math.max(bossRoom.y + boss.radius, Math.min(bossRoom.y + bossRoom.height - boss.radius, boss.y));
  }

  // ── Attack Pattern: Slam AoE (all phases) ──
  if (boss.slamTelegraph > 0) {
    boss.slamTelegraph -= dt;
    if (boss.slamTelegraph <= 0) {
      // Slam hits!
      const sdx = state.player.x - boss.slamX;
      const sdy = state.player.y - boss.slamY;
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      if (sDist < BOSS_SLAM_RADIUS + state.playerRadius) {
        // Damage applied in MapScreen (needs store access)
        // Mark slam hit on state for MapScreen to read
        state.shakeIntensity = 10;
        state.shakeTimer = 0.2;
      }
      // Visual explosion at slam position
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        state.particles.push({
          x: boss.slamX, y: boss.slamY,
          vx: Math.cos(angle) * (60 + Math.random() * 80),
          vy: Math.sin(angle) * (60 + Math.random() * 80),
          size: 2 + Math.random() * 3,
          color: '#ef4444',
          age: 0, maxAge: 0.4 + Math.random() * 0.3,
        });
      }
    }
  } else {
    boss.slamTimer -= dt * enrageMult;
    if (boss.slamTimer <= 0) {
      // Start slam telegraph
      boss.slamTelegraph = BOSS_SLAM_TELEGRAPH;
      boss.slamX = state.player.x;
      boss.slamY = state.player.y;
      boss.slamTimer = 5.0 + Math.random() * 2;
    }
  }

  // ── Attack Pattern: Projectile Barrage (phases 2+) ──
  if (boss.phase >= 2) {
    boss.barrageTimer -= dt * enrageMult;
    if (boss.barrageTimer <= 0) {
      boss.barrageTimer = 4.0 + Math.random() * 2;
      for (let i = 0; i < BOSS_BARRAGE_COUNT; i++) {
        const angle = (Math.PI * 2 / BOSS_BARRAGE_COUNT) * i;
        state.projectiles.push({
          id: state.nextProjectileId++,
          x: boss.x, y: boss.y,
          vx: Math.cos(angle) * BOSS_BARRAGE_SPEED,
          vy: Math.sin(angle) * BOSS_BARRAGE_SPEED,
          radius: 7, color: boss.color,
          age: 0, maxAge: 2.5,
          damage: 0, // Damage calculated in MapScreen with zone data
          sourceMobId: -999, // sentinel for boss projectile
          hit: false,
        });
      }
      // Visual burst
      state.shakeIntensity = 4;
      state.shakeTimer = 0.1;
    }
  }

  // ── Attack Pattern: Ground Hazard Drops (phases 3+) ──
  if (boss.phase >= 3) {
    boss.hazardTimer -= dt * enrageMult;
    if (boss.hazardTimer <= 0) {
      boss.hazardTimer = 3.0;
      state.hazards.push({
        id: state.nextHazardId++,
        x: state.player.x,
        y: state.player.y,
        radius: BOSS_HAZARD_RADIUS,
        type: 'fire',
        age: 0,
        maxAge: BOSS_HAZARD_DURATION,
        damagePerSec: 0, // DPS set by MapScreen with zone scaling
        lastDamageTick: 0,
      });
    }
  }
}

/** Check if a boss slam just landed and player is in range. Returns true if player should take slam damage. */
export function checkBossSlamHit(state: MapState): boolean {
  const boss = state.bossMob;
  if (!boss || boss.dead) return false;
  // Slam just finished telegraph (within this frame)
  if (boss.slamTelegraph <= 0 && boss.slamTelegraph > -0.05) {
    const sdx = state.player.x - boss.slamX;
    const sdy = state.player.y - boss.slamY;
    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
    return sDist < BOSS_SLAM_RADIUS + state.playerRadius;
  }
  return false;
}

/** Check if boss is in melee range of player. */
export function bossCanAttackMapPlayer(state: MapState): boolean {
  const boss = state.bossMob;
  if (!boss || boss.dead) return false;
  const dx = state.player.x - boss.x;
  const dy = state.player.y - boss.y;
  return Math.sqrt(dx * dx + dy * dy) <= 50 + state.playerRadius + boss.radius;
}

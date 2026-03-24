// ============================================================
// Map Generation — Room templates, linear assembly, mob placement
// ============================================================

import type { MapRoom, MapLayout, WallSegment, RoomDoor, MobSpawnPoint, RoomType, Vec2, MapModifier } from './mapTypes';
import { rollArenaAffixes } from '../arena/arenaAffixes';
import type { ArenaMob } from '../arena/arenaTypes';

// ── Map Modifier Pool ──

const MAP_MODIFIER_POOL: MapModifier[] = [
  { id: 'dense',     label: 'Dense Pack',      description: '+30% more mobs per room',          xpMult: 0.20, lootMult: 0,    fragMult: 0 },
  { id: 'armored',   label: 'Armored',          description: 'Mob HP +25%',                      xpMult: 0,    lootMult: 0.15, fragMult: 0 },
  { id: 'volatile',  label: 'Volatile',         description: 'Mobs explode on death (fire pool)', xpMult: 0,    lootMult: 0,    fragMult: 0.20 },
  { id: 'temporal',  label: 'Temporal',          description: 'Map timer: 3 minutes',             xpMult: 0.25, lootMult: 0,    fragMult: 0 },
  { id: 'hexproof',  label: 'Hexproof',         description: 'Mob debuff duration -50%',         xpMult: 0.15, lootMult: 0,    fragMult: 0 },
  { id: 'swarm',     label: 'Swarm',            description: '+3 white mobs per room',           xpMult: 0.30, lootMult: 0,    fragMult: 0 },
  { id: 'empowered', label: 'Boss Empowered',   description: 'Boss HP +50%',                     xpMult: 0,    lootMult: 0,    fragMult: 0.50 },
];

/** Roll 1-3 random modifiers based on corrupted tier. */
export function rollMapModifiers(tier: number): MapModifier[] {
  const count = tier <= 5 ? 1 : tier <= 15 ? 2 : 3;
  const pool = [...MAP_MODIFIER_POOL];
  const result: MapModifier[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

/** Check if a modifier ID is active in a list. */
export function hasModifier(modifiers: MapModifier[], id: string): boolean {
  return modifiers.some(m => m.id === id);
}

// ── Constants ──

const CORRIDOR_WIDTH = 200;
const CORRIDOR_LENGTH = 300;
const DOOR_WIDTH = 150;
const MOB_RADIUS = 11;
const RARE_MOB_RADIUS = 15;
const RARE_AFFIX_MOB_RADIUS = 17;

// ── Room Size Presets ──

const ROOM_SIZES: Record<RoomType, { w: number; h: number }> = {
  entry:    { w: 750, h: 625 },
  pack:     { w: 875, h: 750 },
  large:    { w: 1125, h: 1000 },
  side:     { w: 625, h: 625 },
  corridor: { w: CORRIDOR_WIDTH, h: CORRIDOR_LENGTH },
  boss:     { w: 1250, h: 1125 },
};

// ── Wall Builders ──

/** Build 4 walls for a rectangular room with door gaps. */
function buildRectWalls(
  rx: number, ry: number, rw: number, rh: number,
  doors: RoomDoor[],
): WallSegment[] {
  const walls: WallSegment[] = [];
  const doorsByDir = new Map<string, RoomDoor[]>();
  for (const d of doors) {
    const list = doorsByDir.get(d.direction) ?? [];
    list.push(d);
    doorsByDir.set(d.direction, list);
  }

  // North wall (top)
  walls.push(...buildWallWithGaps(
    rx, ry, rx + rw, ry,
    (doorsByDir.get('north') ?? []).map(d => ({ pos: d.x, width: d.width })),
    'x',
  ));
  // South wall (bottom)
  walls.push(...buildWallWithGaps(
    rx, ry + rh, rx + rw, ry + rh,
    (doorsByDir.get('south') ?? []).map(d => ({ pos: d.x, width: d.width })),
    'x',
  ));
  // West wall (left)
  walls.push(...buildWallWithGaps(
    rx, ry, rx, ry + rh,
    (doorsByDir.get('west') ?? []).map(d => ({ pos: d.y, width: d.width })),
    'y',
  ));
  // East wall (right)
  walls.push(...buildWallWithGaps(
    rx + rw, ry, rx + rw, ry + rh,
    (doorsByDir.get('east') ?? []).map(d => ({ pos: d.y, width: d.width })),
    'y',
  ));

  return walls;
}

/** Build a wall segment with gaps for doors. */
function buildWallWithGaps(
  x1: number, y1: number, x2: number, y2: number,
  gaps: Array<{ pos: number; width: number }>,
  axis: 'x' | 'y',
): WallSegment[] {
  if (gaps.length === 0) return [{ x1, y1, x2, y2 }];

  // Sort gaps by position
  const sorted = [...gaps].sort((a, b) => a.pos - b.pos);
  const segments: WallSegment[] = [];
  let cursor = axis === 'x' ? x1 : y1;
  const end = axis === 'x' ? x2 : y2;

  for (const gap of sorted) {
    const gapStart = gap.pos - gap.width / 2;
    const gapEnd = gap.pos + gap.width / 2;

    if (cursor < gapStart) {
      if (axis === 'x') {
        segments.push({ x1: cursor, y1, x2: gapStart, y2 });
      } else {
        segments.push({ x1, y1: cursor, x2, y2: gapStart });
      }
    }
    cursor = gapEnd;
  }

  if (cursor < end) {
    if (axis === 'x') {
      segments.push({ x1: cursor, y1, x2: end, y2 });
    } else {
      segments.push({ x1, y1: cursor, x2, y2: end });
    }
  }

  return segments;
}

// ── Spawn Point Generation ──

function generateSpawnPoints(
  rx: number, ry: number, rw: number, rh: number,
  roomType: RoomType,
): MobSpawnPoint[] {
  const points: MobSpawnPoint[] = [];
  const margin = 30; // keep mobs away from walls

  const addRandom = (tier: 'white' | 'magic' | 'rare', count: number) => {
    for (let i = 0; i < count; i++) {
      points.push({
        x: rx + margin + Math.random() * (rw - margin * 2),
        y: ry + margin + Math.random() * (rh - margin * 2),
        tier,
      });
    }
  };

  switch (roomType) {
    case 'entry':
      addRandom('white', 4 + Math.floor(Math.random() * 3));
      break;
    case 'pack':
      addRandom('white', 8 + Math.floor(Math.random() * 8));
      addRandom('magic', 1 + Math.floor(Math.random() * 2));
      break;
    case 'large':
      addRandom('white', 15 + Math.floor(Math.random() * 11));
      addRandom('magic', 2 + Math.floor(Math.random() * 2));
      addRandom('rare', 1);
      break;
    case 'side':
      addRandom('white', 5 + Math.floor(Math.random() * 4));
      addRandom('magic', 1);
      break;
    case 'corridor':
      addRandom('white', 3 + Math.floor(Math.random() * 3));
      break;
    case 'boss':
      addRandom('white', 6 + Math.floor(Math.random() * 5));
      addRandom('magic', 1 + Math.floor(Math.random() * 2));
      // Boss itself is spawned separately
      break;
  }

  return points;
}

// ── Mob Creation ──

function rollMobBehavior(): 'melee' | 'fast' | 'ranged' {
  const r = Math.random();
  if (r < 0.15) return 'ranged';
  if (r < 0.35) return 'fast';
  return 'melee';
}

function tierColor(tier: 'white' | 'magic' | 'rare'): string {
  switch (tier) {
    case 'white': return '#9ca3af';  // gray
    case 'magic': return '#60a5fa';  // blue
    case 'rare':  return '#f59e0b';  // gold
  }
}

/** Create an ArenaMob from a spawn point.
 *  corruptedTier > 0 applies +8% HP per tier.
 *  armoredMod applies an additional 1.25x HP multiplier. */
export function createMobFromSpawn(
  spawn: MobSpawnPoint,
  mobId: number,
  packIndex: number,
  wave: number,
  zoneBand: number,
  corruptedTier: number = 0,
  modifiers: MapModifier[] = [],
): ArenaMob {
  const isRare = spawn.tier === 'rare';
  const isMagic = spawn.tier === 'magic';

  // HP scaling: white=1x, magic=3x, rare=8x base
  const hpBase = 20 + zoneBand * 15;
  const hpMult = isRare ? 8 : isMagic ? 3 : 1;
  let hp = Math.round(hpBase * hpMult);
  // Corrupted tier scaling: +8% HP per tier
  if (corruptedTier > 0) hp = Math.round(hp * (1 + corruptedTier * 0.08));
  // Armored modifier: +25% HP
  if (hasModifier(modifiers, 'armored')) hp = Math.round(hp * 1.25);

  const affixes = isRare
    ? rollArenaAffixes(true, wave)
    : isMagic
      ? (Math.random() < 0.20 ? rollArenaAffixes(false, wave) : [])
      : [];

  const baseRadius = isRare ? RARE_MOB_RADIUS : MOB_RADIUS;
  const radius = isRare && affixes.length > 0 ? RARE_AFFIX_MOB_RADIUS : isMagic ? 13 : baseRadius;

  return {
    mobId,
    packIndex,
    x: spawn.x,
    y: spawn.y,
    radius,
    hp,
    maxHp: hp,
    isRare,
    dead: false,
    deathTimer: 0,
    color: tierColor(spawn.tier),
    vx: 0,
    vy: 0,
    lastHitTime: -1,
    knockbackVx: 0,
    knockbackVy: 0,
    attackTimer: 1 + Math.random() * 2,
    activeDebuffs: [],
    behavior: rollMobBehavior(),
    arenaAffixes: affixes,
    teleportTimer: affixes.includes('teleporter') ? 3 + Math.random() * 2 : 0,
    mortarTimer: affixes.includes('mortar') ? 4 + Math.random() * 2 : 0,
    shieldAuraRadius: affixes.includes('shielding') ? 60 : 0,
  };
}

// ── Map Generation ──

/** Apply dense/swarm modifiers to spawn points after generation. */
function applyModifierSpawns(
  points: MobSpawnPoint[],
  rx: number, ry: number, rw: number, rh: number,
  modifiers: MapModifier[],
): MobSpawnPoint[] {
  let result = [...points];
  const margin = 30;

  // Dense: multiply white mob count by 1.3 (round up)
  if (hasModifier(modifiers, 'dense')) {
    const whites = result.filter(p => p.tier === 'white');
    const toAdd = Math.ceil(whites.length * 0.3);
    for (let i = 0; i < toAdd; i++) {
      result.push({
        x: rx + margin + Math.random() * (rw - margin * 2),
        y: ry + margin + Math.random() * (rh - margin * 2),
        tier: 'white',
      });
    }
  }

  // Swarm: +3 extra white spawn points per room
  if (hasModifier(modifiers, 'swarm')) {
    for (let i = 0; i < 3; i++) {
      result.push({
        x: rx + margin + Math.random() * (rw - margin * 2),
        y: ry + margin + Math.random() * (rh - margin * 2),
        tier: 'white',
      });
    }
  }

  return result;
}

/** Generate a linear map: entry → pack rooms → large room → exit.
 *  Optionally attaches 0-2 side rooms. */
export function generateMap(_zoneBand: number, _wave: number, isBossMap: boolean, modifiers: MapModifier[] = []): MapLayout {
  const rooms: MapRoom[] = [];
  let nextRoomId = 0;
  let cursorX = 0;
  let cursorY = 0;

  // Room sequence: entry, 2-3 pack rooms, 1 large room, exit/boss
  const sequence: RoomType[] = ['entry'];
  const packCount = 2 + Math.floor(Math.random() * 2); // 2-3 pack rooms
  for (let i = 0; i < packCount; i++) sequence.push('pack');
  sequence.push('large');
  if (isBossMap) {
    sequence.push('boss');
  }

  // Side room candidates: after pack rooms (50% chance each)
  const sideRoomAfter = new Set<number>();
  for (let i = 1; i <= packCount; i++) {
    if (Math.random() < 0.5) sideRoomAfter.add(i);
  }

  for (let seqIdx = 0; seqIdx < sequence.length; seqIdx++) {
    const roomType = sequence[seqIdx];
    const size = ROOM_SIZES[roomType];
    // Add some random size variance
    const rw = size.w + Math.floor(Math.random() * 60 - 30);
    const rh = size.h + Math.floor(Math.random() * 60 - 30);

    const roomId = nextRoomId++;
    const rx = cursorX;
    const ry = cursorY;

    // Doors: south door to previous corridor, north door to next corridor
    const doors: RoomDoor[] = [];
    if (seqIdx > 0) {
      // South door (entrance from corridor)
      doors.push({
        x: rx + rw / 2,
        y: ry,
        width: DOOR_WIDTH,
        direction: 'north',
        connectsTo: roomId - 1, // connects to corridor before this room
      });
    }
    if (seqIdx < sequence.length - 1) {
      // North door (exit to next corridor)
      doors.push({
        x: rx + rw / 2,
        y: ry + rh,
        width: DOOR_WIDTH,
        direction: 'south',
        connectsTo: -1, // will be set when corridor is created
      });
    }

    const baseSpawns = generateSpawnPoints(rx, ry, rw, rh, roomType);
    const spawnPoints = applyModifierSpawns(baseSpawns, rx, ry, rw, rh, modifiers);
    const hasShrineSpot = roomType === 'side' || (roomType === 'large' && Math.random() < 0.3);

    rooms.push({
      id: roomId,
      type: roomType,
      x: rx, y: ry,
      width: rw, height: rh,
      walls: buildRectWalls(rx, ry, rw, rh, doors),
      doors,
      spawnPoints,
      chests: roomType === 'side' ? [{
        id: roomId * 100,
        x: rx + rw / 2,
        y: ry + rh / 2,
        opened: false,
        tier: 'normal',
      }] : [],
      hasShrineSpot,
      shrinePos: hasShrineSpot ? { x: rx + rw / 2, y: ry + rh * 0.3 } : undefined,
      entered: seqIdx === 0, // first room starts entered
      cleared: false,
      mobIds: [],
    });

    // Add corridor after this room (except last)
    if (seqIdx < sequence.length - 1) {
      const corridorId = nextRoomId++;
      const cx = rx + rw / 2 - CORRIDOR_WIDTH / 2;
      const cy = ry + rh;

      const corridorDoors: RoomDoor[] = [
        { x: cx + CORRIDOR_WIDTH / 2, y: cy, width: DOOR_WIDTH, direction: 'north', connectsTo: roomId },
        { x: cx + CORRIDOR_WIDTH / 2, y: cy + CORRIDOR_LENGTH, width: DOOR_WIDTH, direction: 'south', connectsTo: -1 },
      ];

      // Fix the previous room's south door to point to corridor
      const lastDoor = rooms[rooms.length - 1].doors.find(d => d.direction === 'south');
      if (lastDoor) lastDoor.connectsTo = corridorId;

      const corridorSpawns = applyModifierSpawns(generateSpawnPoints(cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, 'corridor'), cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, modifiers);

      rooms.push({
        id: corridorId,
        type: 'corridor',
        x: cx, y: cy,
        width: CORRIDOR_WIDTH, height: CORRIDOR_LENGTH,
        walls: buildRectWalls(cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, corridorDoors),
        doors: corridorDoors,
        spawnPoints: corridorSpawns,
        chests: [],
        hasShrineSpot: false,
        entered: false,
        cleared: false,
        mobIds: [],
      });

      cursorY = cy + CORRIDOR_LENGTH;

      // Side room branch (east side)
      if (sideRoomAfter.has(seqIdx)) {
        const sideId = nextRoomId++;
        const sideSize = ROOM_SIZES.side;
        const sx = cx + CORRIDOR_WIDTH;
        const sy = cy + CORRIDOR_LENGTH / 2 - sideSize.h / 2;

        const sideDoors: RoomDoor[] = [
          { x: sx, y: sy + sideSize.h / 2, width: DOOR_WIDTH, direction: 'west', connectsTo: corridorId },
        ];
        // Add east door to corridor
        rooms[rooms.length - 1].doors.push({
          x: cx + CORRIDOR_WIDTH, y: cy + CORRIDOR_LENGTH / 2,
          width: DOOR_WIDTH, direction: 'east', connectsTo: sideId,
        });
        // Rebuild corridor walls with new door
        rooms[rooms.length - 1].walls = buildRectWalls(
          cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, rooms[rooms.length - 1].doors,
        );

        const sideSpawns = applyModifierSpawns(generateSpawnPoints(sx, sy, sideSize.w, sideSize.h, 'side'), sx, sy, sideSize.w, sideSize.h, modifiers);
        rooms.push({
          id: sideId,
          type: 'side',
          x: sx, y: sy,
          width: sideSize.w, height: sideSize.h,
          walls: buildRectWalls(sx, sy, sideSize.w, sideSize.h, sideDoors),
          doors: sideDoors,
          spawnPoints: sideSpawns,
          chests: [{
            id: sideId * 100,
            x: sx + sideSize.w / 2,
            y: sy + sideSize.h / 2,
            opened: false,
            tier: Math.random() < 0.2 ? 'rare' : 'normal',
          }],
          hasShrineSpot: true,
          shrinePos: { x: sx + sideSize.w * 0.3, y: sy + sideSize.h * 0.3 },
          entered: false,
          cleared: false,
          mobIds: [],
        });
      }
    }
  }

  // After all rooms are generated, center the map in the world
  const padding = 400;
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  for (const room of rooms) {
    minX = Math.min(minX, room.x);
    minY = Math.min(minY, room.y);
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.height);
  }
  const mapW = maxX - minX;
  const mapH = maxY - minY;
  const worldW = mapW + padding * 2;
  const worldH = mapH + padding * 2;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  // Offset all room positions, walls, doors, spawns, chests, shrines
  for (const room of rooms) {
    room.x += offsetX;
    room.y += offsetY;
    for (const wall of room.walls) {
      wall.x1 += offsetX; wall.y1 += offsetY;
      wall.x2 += offsetX; wall.y2 += offsetY;
    }
    for (const door of room.doors) {
      door.x += offsetX; door.y += offsetY;
    }
    for (const sp of room.spawnPoints) {
      sp.x += offsetX; sp.y += offsetY;
    }
    for (const chest of room.chests) {
      chest.x += offsetX; chest.y += offsetY;
    }
    if (room.shrinePos) {
      room.shrinePos.x += offsetX;
      room.shrinePos.y += offsetY;
    }
  }

  return {
    rooms,
    worldWidth: worldW,
    worldHeight: worldH,
    startRoomId: 0,
    exitRoomId: rooms[rooms.length - 1].type === 'side'
      ? rooms[rooms.length - 2].id  // skip trailing side room
      : rooms[rooms.length - 1].id,
  };
}

// ── All Walls Helper ──

/** Get all wall segments across all rooms (for collision checks). */
export function getAllWalls(layout: MapLayout): WallSegment[] {
  const walls: WallSegment[] = [];
  for (const room of layout.rooms) {
    walls.push(...room.walls);
  }
  return walls;
}

// ── Room Lookup ──

/** Find which room contains a world position. */
export function getRoomAtPosition(layout: MapLayout, pos: Vec2): MapRoom | null {
  for (const room of layout.rooms) {
    if (pos.x >= room.x && pos.x <= room.x + room.width &&
        pos.y >= room.y && pos.y <= room.y + room.height) {
      return room;
    }
  }
  return null;
}

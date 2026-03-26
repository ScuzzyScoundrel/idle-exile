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
      if (Math.random() < 0.5) addRandom('rare', 1); // 50% chance of a rare in pack rooms
      break;
    case 'large':
      addRandom('white', 15 + Math.floor(Math.random() * 11));
      addRandom('magic', 2 + Math.floor(Math.random() * 2));
      addRandom('rare', 1 + Math.floor(Math.random() * 2)); // 1-2 rares
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
      addRandom('rare', 2); // 2 rares guard the boss
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

/** Generate pillar obstacles inside a room (cross-shaped wall segments). */
function generatePillars(rx: number, ry: number, rw: number, rh: number, count: number): WallSegment[] {
  const pillars: WallSegment[] = [];
  const pillarSize = 40;
  const margin = 120; // keep pillars away from walls/doors

  for (let i = 0; i < count; i++) {
    // Distribute pillars evenly with some randomness
    const col = count <= 2 ? (i === 0 ? 0.33 : 0.67) : (i + 0.5) / count;
    const row = 0.3 + Math.random() * 0.4; // vertical spread
    const px = rx + margin + col * (rw - margin * 2);
    const py = ry + margin + row * (rh - margin * 2);
    const half = pillarSize / 2;

    // Cross shape: horizontal + vertical segments
    pillars.push(
      { x1: px - half, y1: py, x2: px + half, y2: py },     // horizontal
      { x1: px, y1: py - half, x2: px, y2: py + half },     // vertical
    );
  }
  return pillars;
}

/** Generate a branching 2D map: rooms connect in multiple directions,
 *  creating winding PoE-style dungeon layouts. */
export function generateMap(_zoneBand: number, _wave: number, isBossMap: boolean, modifiers: MapModifier[] = []): MapLayout {
  const rooms: MapRoom[] = [];
  let nextRoomId = 0;

  // Room sequence
  const sequence: RoomType[] = ['entry'];
  const packCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < packCount; i++) sequence.push('pack');
  sequence.push('large');
  if (isBossMap) sequence.push('boss');

  // ── Direction helpers ──
  type Dir = 'north' | 'south' | 'east' | 'west';
  const OPP: Record<Dir, Dir> = { north: 'south', south: 'north', east: 'west', west: 'east' };
  const isHoriz = (d: Dir) => d === 'east' || d === 'west';

  // ── Overlap detection ──
  interface Rect { x: number; y: number; w: number; h: number }
  const placed: Rect[] = [];
  /** Check if rect overlaps any placed rect, optionally skipping one index (the room we're exiting). */
  function overlaps(r: Rect, skipIdx = -1): boolean {
    const m = 10;
    for (let i = 0; i < placed.length; i++) {
      if (i === skipIdx) continue;
      const p = placed[i];
      if (r.x < p.x + p.w + m && r.x + r.w + m > p.x &&
          r.y < p.y + p.h + m && r.y + r.h + m > p.y) return true;
    }
    return false;
  }

  // ── Weighted direction picker (biased south, avoids backtrack) ──
  function pickDir(exclude: Dir | null): Dir {
    const pool: [Dir, number][] = [['south', 40], ['east', 25], ['west', 25], ['north', 10]];
    const filtered = exclude ? pool.filter(([d]) => d !== exclude) : pool;
    const total = filtered.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [d, w] of filtered) { r -= w; if (r <= 0) return d; }
    return filtered[filtered.length - 1][0];
  }

  // ── Door factory ──
  function makeDoor(dir: Dir, rx: number, ry: number, rw: number, rh: number, gap: number, connectsTo: number): RoomDoor {
    // gap = center of opening along the wall's axis (X for N/S walls, Y for E/W walls)
    switch (dir) {
      case 'south': return { x: gap, y: ry + rh, width: DOOR_WIDTH, direction: 'south', connectsTo };
      case 'north': return { x: gap, y: ry, width: DOOR_WIDTH, direction: 'north', connectsTo };
      case 'east':  return { x: rx + rw, y: gap, width: DOOR_WIDTH, direction: 'east', connectsTo };
      case 'west':  return { x: rx, y: gap, width: DOOR_WIDTH, direction: 'west', connectsTo };
    }
  }

  // ── Helper: create a MapRoom ──
  function makeRoom(id: number, type: RoomType, rx: number, ry: number, rw: number, rh: number, doors: RoomDoor[]): MapRoom {
    const walls = buildRectWalls(rx, ry, rw, rh, doors);
    if (type === 'large' || type === 'boss') {
      walls.push(...generatePillars(rx, ry, rw, rh, type === 'boss' ? 4 : 2 + Math.floor(Math.random() * 3)));
    }
    const hasShrineSpot = type === 'side' || (type === 'large' && Math.random() < 0.3);
    return {
      id, type, x: rx, y: ry, width: rw, height: rh,
      walls, doors,
      spawnPoints: applyModifierSpawns(generateSpawnPoints(rx, ry, rw, rh, type), rx, ry, rw, rh, modifiers),
      chests: type === 'side' ? [{ id: id * 100, x: rx + rw / 2, y: ry + rh / 2, opened: false, tier: Math.random() < 0.2 ? 'rare' as const : 'normal' as const }] : [],
      hasShrineSpot,
      shrinePos: hasShrineSpot ? { x: rx + rw / 2, y: ry + rh * 0.3 } : undefined,
      entered: false, cleared: false, mobIds: [],
    };
  }

  // ── Place entry room at origin ──
  const eSize = ROOM_SIZES.entry;
  const ew = eSize.w + Math.floor(Math.random() * 60 - 30);
  const eh = eSize.h + Math.floor(Math.random() * 60 - 30);
  const entryRoom = makeRoom(nextRoomId++, 'entry', 0, 0, ew, eh, []);
  entryRoom.entered = true;
  rooms.push(entryRoom);
  placed.push({ x: 0, y: 0, w: ew, h: eh });

  let prevRoom = entryRoom;
  let cameFrom: Dir | null = null;

  // ── Place main path rooms with branching corridors ──
  for (let si = 1; si < sequence.length; si++) {
    const roomType = sequence[si];
    const size = ROOM_SIZES[roomType];
    const rw = size.w + Math.floor(Math.random() * 60 - 30);
    const rh = size.h + Math.floor(Math.random() * 60 - 30);

    let success = false;
    const tried = new Set<Dir>();

    for (let attempt = 0; attempt < 8 && !success; attempt++) {
      // Pick direction
      let dir: Dir;
      if (attempt < 4) {
        dir = pickDir(cameFrom ? OPP[cameFrom] : null);
        if (tried.has(dir)) continue;
      } else {
        const untried = (['south', 'east', 'west', 'north'] as Dir[]).filter(d => !tried.has(d));
        if (untried.length === 0) break;
        dir = untried[0];
      }
      tried.add(dir);

      // Random jog: corridor attaches at 30-70% along prevRoom wall
      const jog = 0.35 + Math.random() * 0.3;
      // Random offset: next room isn't centered on corridor
      const roomJog = (Math.random() - 0.5) * 150;

      // Corridor dimensions (swap width/height for horizontal)
      const cw = isHoriz(dir) ? CORRIDOR_LENGTH : CORRIDOR_WIDTH;
      const ch = isHoriz(dir) ? CORRIDOR_WIDTH : CORRIDOR_LENGTH;

      // Calculate corridor position
      let cx: number, cy: number;
      switch (dir) {
        case 'south': cx = prevRoom.x + prevRoom.width * jog - CORRIDOR_WIDTH / 2; cy = prevRoom.y + prevRoom.height; break;
        case 'north': cx = prevRoom.x + prevRoom.width * jog - CORRIDOR_WIDTH / 2; cy = prevRoom.y - CORRIDOR_LENGTH; break;
        case 'east':  cx = prevRoom.x + prevRoom.width; cy = prevRoom.y + prevRoom.height * jog - CORRIDOR_WIDTH / 2; break;
        case 'west':  cx = prevRoom.x - CORRIDOR_LENGTH; cy = prevRoom.y + prevRoom.height * jog - CORRIDOR_WIDTH / 2; break;
      }

      // Calculate room position at corridor end
      let rx: number, ry: number;
      switch (dir) {
        case 'south': rx = cx + CORRIDOR_WIDTH / 2 - rw / 2 + roomJog; ry = cy + CORRIDOR_LENGTH; break;
        case 'north': rx = cx + CORRIDOR_WIDTH / 2 - rw / 2 + roomJog; ry = cy - rh; break;
        case 'east':  rx = cx + CORRIDOR_LENGTH; ry = cy + CORRIDOR_WIDTH / 2 - rh / 2 + roomJog; break;
        case 'west':  rx = cx - rw; ry = cy + CORRIDOR_WIDTH / 2 - rh / 2 + roomJog; break;
      }

      const corrRect: Rect = { x: cx, y: cy, w: cw, h: ch };
      const roomRect: Rect = { x: rx, y: ry, w: rw, h: rh };
      // Skip prevRoom (last placed) when checking corridor adjacency
      const prevIdx = placed.length - 1;
      if (overlaps(corrRect, prevIdx) || overlaps(roomRect, prevIdx)) continue;

      // ── Success — place corridor + room ──
      const corrId = nextRoomId++;
      const roomId = nextRoomId++;

      // Gap center (X for vertical corridors, Y for horizontal)
      const gapV = cx + CORRIDOR_WIDTH / 2;   // X center for N/S
      const gapH = cy + CORRIDOR_WIDTH / 2;   // Y center for E/W
      const gap = isHoriz(dir) ? gapH : gapV;

      // Add exit door to prevRoom
      prevRoom.doors.push(makeDoor(dir, prevRoom.x, prevRoom.y, prevRoom.width, prevRoom.height, gap, corrId));
      // Rebuild prevRoom walls with new door
      const prevWalls = buildRectWalls(prevRoom.x, prevRoom.y, prevRoom.width, prevRoom.height, prevRoom.doors);
      if (prevRoom.type === 'large' || prevRoom.type === 'boss') {
        prevWalls.push(...generatePillars(prevRoom.x, prevRoom.y, prevRoom.width, prevRoom.height, prevRoom.type === 'boss' ? 4 : 2 + Math.floor(Math.random() * 3)));
      }
      prevRoom.walls = prevWalls;

      // Corridor
      const corrDoors: RoomDoor[] = [
        makeDoor(OPP[dir], cx, cy, cw, ch, gap, prevRoom.id),
        makeDoor(dir, cx, cy, cw, ch, gap, roomId),
      ];
      const corrSpawns = applyModifierSpawns(
        generateSpawnPoints(cx, cy, cw, ch, 'corridor'), cx, cy, cw, ch, modifiers);
      rooms.push({
        id: corrId, type: 'corridor', x: cx, y: cy, width: cw, height: ch,
        walls: buildRectWalls(cx, cy, cw, ch, corrDoors),
        doors: corrDoors, spawnPoints: corrSpawns,
        chests: [], hasShrineSpot: false, entered: false, cleared: false, mobIds: [],
      });
      placed.push(corrRect);

      // Room
      const roomDoors = [makeDoor(OPP[dir], rx, ry, rw, rh, gap, corrId)];
      const newRoom = makeRoom(roomId, roomType, rx, ry, rw, rh, roomDoors);
      rooms.push(newRoom);
      placed.push(roomRect);

      prevRoom = newRoom;
      cameFrom = dir;
      success = true;
    }

    // Emergency fallback: extend south with extra gap to avoid overlap
    if (!success) {
      const maxY = placed.reduce((m, p) => Math.max(m, p.y + p.h), 0);
      const corrId = nextRoomId++;
      const roomId = nextRoomId++;
      const cx = prevRoom.x + prevRoom.width / 2 - CORRIDOR_WIDTH / 2;
      const cy = maxY + 50;
      const rx = cx + CORRIDOR_WIDTH / 2 - rw / 2;
      const ry = cy + CORRIDOR_LENGTH;
      const gapV = cx + CORRIDOR_WIDTH / 2;

      prevRoom.doors.push(makeDoor('south', prevRoom.x, prevRoom.y, prevRoom.width, prevRoom.height, gapV, corrId));
      prevRoom.walls = buildRectWalls(prevRoom.x, prevRoom.y, prevRoom.width, prevRoom.height, prevRoom.doors);

      const corrDoors: RoomDoor[] = [
        makeDoor('north', cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, gapV, prevRoom.id),
        makeDoor('south', cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, gapV, roomId),
      ];
      rooms.push({
        id: corrId, type: 'corridor', x: cx, y: cy, width: CORRIDOR_WIDTH, height: CORRIDOR_LENGTH,
        walls: buildRectWalls(cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, corrDoors),
        doors: corrDoors,
        spawnPoints: applyModifierSpawns(generateSpawnPoints(cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, 'corridor'), cx, cy, CORRIDOR_WIDTH, CORRIDOR_LENGTH, modifiers),
        chests: [], hasShrineSpot: false, entered: false, cleared: false, mobIds: [],
      });
      placed.push({ x: cx, y: cy, w: CORRIDOR_WIDTH, h: CORRIDOR_LENGTH });

      const roomDoors = [makeDoor('north', rx, ry, rw, rh, gapV, corrId)];
      const newRoom = makeRoom(roomId, roomType, rx, ry, rw, rh, roomDoors);
      rooms.push(newRoom);
      placed.push({ x: rx, y: ry, w: rw, h: rh });

      prevRoom = newRoom;
      cameFrom = 'south' as Dir;
    }
  }

  // ── Side rooms off corridors (40% chance per corridor, perpendicular direction) ──
  const corridors = rooms.filter(r => r.type === 'corridor');
  for (const corr of corridors) {
    if (Math.random() > 0.4) continue;
    const corrIsVert = corr.height > corr.width;
    const sideDirs: Dir[] = corrIsVert ? ['east', 'west'] : ['north', 'south'];
    const sideDir = sideDirs[Math.floor(Math.random() * sideDirs.length)];
    const sSize = ROOM_SIZES.side;

    let sx: number, sy: number;
    switch (sideDir) {
      case 'east':  sx = corr.x + corr.width; sy = corr.y + corr.height / 2 - sSize.h / 2; break;
      case 'west':  sx = corr.x - sSize.w; sy = corr.y + corr.height / 2 - sSize.h / 2; break;
      case 'south': sx = corr.x + corr.width / 2 - sSize.w / 2; sy = corr.y + corr.height; break;
      case 'north': sx = corr.x + corr.width / 2 - sSize.w / 2; sy = corr.y - sSize.h; break;
    }

    const sideRect = { x: sx, y: sy, w: sSize.w, h: sSize.h };
    if (overlaps(sideRect)) continue;

    const sideId = nextRoomId++;
    // Gap on corridor wall
    const sideGap = isHoriz(sideDir)
      ? corr.y + corr.height / 2   // Y center for E/W
      : corr.x + corr.width / 2;   // X center for N/S

    // Add door to corridor
    corr.doors.push(makeDoor(sideDir, corr.x, corr.y, corr.width, corr.height, sideGap, sideId));
    corr.walls = buildRectWalls(corr.x, corr.y, corr.width, corr.height, corr.doors);

    // Side room
    const sideDoor = makeDoor(OPP[sideDir], sx, sy, sSize.w, sSize.h, sideGap, corr.id);
    const sideRoom = makeRoom(sideId, 'side', sx, sy, sSize.w, sSize.h, [sideDoor]);
    rooms.push(sideRoom);
    placed.push(sideRect);
  }

  // ── Generate organic tree collision circles around room perimeters ──
  // These match where trees appear in the background images.
  // No sprites needed — the background provides the visuals.
  const props: import('./mapTypes').MapProp[] = [];
  for (const room of rooms) {
    if (room.type === 'corridor') continue; // corridors use wall collision only

    const treeInset = 70; // how far inward from room edge the tree ring starts
    const treeDepth = 50; // depth of the tree collision band

    // ── Perimeter tree ring (irregular circle-cluster along edges) ──
    // Walk around the room perimeter and place collision circles
    const perimeterPoints: Array<{ x: number; y: number }> = [];
    const step = 35; // spacing between circle centers

    // Top edge
    for (let px = room.x + step; px < room.x + room.width - step; px += step + Math.random() * 15) {
      perimeterPoints.push({ x: px + (Math.random() - 0.5) * 20, y: room.y + treeInset + Math.random() * treeDepth });
    }
    // Bottom edge
    for (let px = room.x + step; px < room.x + room.width - step; px += step + Math.random() * 15) {
      perimeterPoints.push({ x: px + (Math.random() - 0.5) * 20, y: room.y + room.height - treeInset - Math.random() * treeDepth });
    }
    // Left edge
    for (let py = room.y + step; py < room.y + room.height - step; py += step + Math.random() * 15) {
      perimeterPoints.push({ x: room.x + treeInset + Math.random() * treeDepth, y: py + (Math.random() - 0.5) * 20 });
    }
    // Right edge
    for (let py = room.y + step; py < room.y + room.height - step; py += step + Math.random() * 15) {
      perimeterPoints.push({ x: room.x + room.width - treeInset - Math.random() * treeDepth, y: py + (Math.random() - 0.5) * 20 });
    }

    // Filter out circles near doors (leave gaps for navigation)
    for (const pt of perimeterPoints) {
      const nearDoor = room.doors.some(d => {
        const ddx = pt.x - d.x; const ddy = pt.y - d.y;
        return Math.sqrt(ddx * ddx + ddy * ddy) < DOOR_WIDTH * 1.2;
      });
      if (nearDoor) continue;

      const radius = 18 + Math.random() * 14; // 18-32px collision radius
      props.push({
        x: pt.x, y: pt.y,
        width: radius * 2, height: radius * 2,
        spriteIdx: -1, // no sprite — background image provides visuals
        collisionRadius: radius,
      });
    }

    // ── Interior tree clusters (2-5 small groups for combat positioning) ──
    const clusterCount = room.type === 'boss' ? 2 + Math.floor(Math.random() * 2)
      : room.type === 'large' ? 3 + Math.floor(Math.random() * 3)
      : 1 + Math.floor(Math.random() * 3);
    const innerMargin = treeInset + treeDepth + 40; // stay clear of perimeter ring

    for (let c = 0; c < clusterCount; c++) {
      const clusterX = room.x + innerMargin + Math.random() * (room.width - innerMargin * 2);
      const clusterY = room.y + innerMargin + Math.random() * (room.height - innerMargin * 2);

      // Skip clusters near doors
      const clusterNearDoor = room.doors.some(d => {
        const ddx = clusterX - d.x; const ddy = clusterY - d.y;
        return Math.sqrt(ddx * ddx + ddy * ddy) < DOOR_WIDTH * 1.5;
      });
      if (clusterNearDoor) continue;

      // Each cluster = 2-4 overlapping circles
      const treeCount = 2 + Math.floor(Math.random() * 3);
      for (let t = 0; t < treeCount; t++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 25;
        const radius = 15 + Math.random() * 12;
        props.push({
          x: clusterX + Math.cos(angle) * dist,
          y: clusterY + Math.sin(angle) * dist,
          width: radius * 2, height: radius * 2,
          spriteIdx: -1,
          collisionRadius: radius,
        });
      }
    }
  }

  // ── Center the map in the world ──
  const padding = 400;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const room of rooms) {
    minX = Math.min(minX, room.x);
    minY = Math.min(minY, room.y);
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.height);
  }
  const worldW = (maxX - minX) + padding * 2;
  const worldH = (maxY - minY) + padding * 2;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  for (const room of rooms) {
    room.x += offsetX; room.y += offsetY;
    for (const wall of room.walls) { wall.x1 += offsetX; wall.y1 += offsetY; wall.x2 += offsetX; wall.y2 += offsetY; }
    for (const door of room.doors) { door.x += offsetX; door.y += offsetY; }
    for (const sp of room.spawnPoints) { sp.x += offsetX; sp.y += offsetY; }
    for (const chest of room.chests) { chest.x += offsetX; chest.y += offsetY; }
    if (room.shrinePos) { room.shrinePos.x += offsetX; room.shrinePos.y += offsetY; }
  }
  // Offset props too
  for (const prop of props) { prop.x += offsetX; prop.y += offsetY; }

  // Exit room = last main-path room (not side/corridor)
  const mainRooms = rooms.filter(r => r.type !== 'side' && r.type !== 'corridor');
  const exitRoom = mainRooms[mainRooms.length - 1];

  return { rooms, props, worldWidth: worldW, worldHeight: worldH, startRoomId: 0, exitRoomId: exitRoom.id };
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

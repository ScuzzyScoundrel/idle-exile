// ============================================================
// Procedural Map Generation — Noise-based terrain with carved
// clearings and connecting paths. Collision = the grid itself.
// ============================================================

import type { MapRoom, MapLayout, MobSpawnPoint, RoomType, MapModifier } from './mapTypes';
import { hasModifier } from './mapGeneration';

// ── Noise Functions ──

/** Seeded hash for 2D coordinates → 0..1 */
function hash2d(x: number, y: number, seed: number): number {
  let h = (seed | 0) + (x | 0) * 374761393 + (y | 0) * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h & 0x7fffffff) / 0x7fffffff);
}

/** Smooth interpolated value noise */
function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2d(ix, iy, seed);
  const n10 = hash2d(ix + 1, iy, seed);
  const n01 = hash2d(ix, iy + 1, seed);
  const n11 = hash2d(ix + 1, iy + 1, seed);
  return (n00 + (n10 - n00) * sx) + ((n01 + (n11 - n01) * sx) - (n00 + (n10 - n00) * sx)) * sy;
}

/** Fractal Brownian Motion — layered noise for natural terrain */
function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 1000) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / max;
}

// ── Terrain Grid Generation ──

export interface TerrainGrid {
  grid: Uint8Array;      // 0 = blocked (trees), 1 = walkable (ground)
  width: number;         // grid cells
  height: number;        // grid cells
  cellSize: number;      // world pixels per cell
  worldWidth: number;    // total world pixels
  worldHeight: number;
}

export interface Clearing {
  cx: number; cy: number;  // grid coords (center)
  radius: number;          // grid cells
  type: 'start' | 'pack' | 'large' | 'boss' | 'secret';
  wx: number; wy: number;  // world coords (center)
  worldRadius: number;     // world pixels
}

/** Generate the full procedural terrain */
export function generateProceduralTerrain(seed: number): { terrain: TerrainGrid; clearings: Clearing[] } {
  const gw = 200, gh = 200;
  const cellSize = 20;
  const grid = new Uint8Array(gw * gh);

  // Generate base noise terrain
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const n = fbm(x * 0.035, y * 0.035, seed, 5);
      // Higher threshold = more trees, lower = more open
      grid[y * gw + x] = n > 0.48 ? 1 : 0;
    }
  }

  // Force border to be trees (2-cell thick border)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (x < 3 || x >= gw - 3 || y < 3 || y >= gh - 3) {
        grid[y * gw + x] = 0;
      }
    }
  }

  // ── Place clearings ──
  const clearings: Clearing[] = [];
  const margin = 20; // cells from edge

  // Start clearing (center-ish)
  const startCx = margin + Math.floor(hash2d(1, 1, seed) * (gw / 3 - margin));
  const startCy = gh / 2 + Math.floor((hash2d(2, 2, seed) - 0.5) * gh / 3);
  clearings.push({ cx: startCx, cy: startCy, radius: 8, type: 'start',
    wx: startCx * cellSize, wy: startCy * cellSize, worldRadius: 8 * cellSize });

  // Boss clearing (far from start)
  const bossCx = gw - margin - Math.floor(hash2d(3, 3, seed) * (gw / 3 - margin));
  const bossCy = gh / 2 + Math.floor((hash2d(4, 4, seed) - 0.5) * gh / 3);
  clearings.push({ cx: bossCx, cy: bossCy, radius: 10, type: 'boss',
    wx: bossCx * cellSize, wy: bossCy * cellSize, worldRadius: 10 * cellSize });

  // Pack clearings (scattered between start and boss)
  const packCount = 4 + Math.floor(hash2d(5, 5, seed) * 3); // 4-6
  for (let i = 0; i < packCount; i++) {
    const t = (i + 1) / (packCount + 1); // spread evenly along x axis
    const pcx = Math.floor(margin + t * (gw - margin * 2) + (hash2d(10 + i, 10, seed) - 0.5) * 30);
    const pcy = Math.floor(margin + hash2d(10, 10 + i, seed) * (gh - margin * 2));
    const pr = 5 + Math.floor(hash2d(20 + i, 20, seed) * 4); // radius 5-8
    clearings.push({ cx: pcx, cy: pcy, radius: pr, type: 'pack',
      wx: pcx * cellSize, wy: pcy * cellSize, worldRadius: pr * cellSize });
  }

  // One large clearing
  const lgCx = Math.floor(gw * 0.5 + (hash2d(30, 30, seed) - 0.5) * 40);
  const lgCy = Math.floor(gh * 0.35 + (hash2d(31, 31, seed) - 0.5) * 30);
  clearings.push({ cx: lgCx, cy: lgCy, radius: 9, type: 'large',
    wx: lgCx * cellSize, wy: lgCy * cellSize, worldRadius: 9 * cellSize });

  // Secret clearing (small, off the beaten path)
  const secCx = Math.floor(margin + hash2d(40, 40, seed) * (gw - margin * 2));
  const secCy = Math.floor(margin / 2 + hash2d(41, 41, seed) * margin); // near top edge
  clearings.push({ cx: secCx, cy: secCy, radius: 4, type: 'secret',
    wx: secCx * cellSize, wy: secCy * cellSize, worldRadius: 4 * cellSize });

  // Carve all clearings into the grid
  for (const c of clearings) {
    carveCircle(grid, gw, gh, c.cx, c.cy, c.radius);
  }

  // ── Connect clearings with paths ──
  // Sort by x position, connect sequentially + some cross-connections
  const sorted = [...clearings].sort((a, b) => a.cx - b.cx);
  for (let i = 0; i < sorted.length - 1; i++) {
    carvePath(grid, gw, gh, sorted[i].cx, sorted[i].cy, sorted[i + 1].cx, sorted[i + 1].cy, 3, seed + i * 100);
  }
  // Extra connections for loops (connect some non-adjacent clearings)
  if (sorted.length > 3) {
    carvePath(grid, gw, gh, sorted[0].cx, sorted[0].cy, sorted[Math.floor(sorted.length / 2)].cx, sorted[Math.floor(sorted.length / 2)].cy, 2, seed + 500);
  }
  if (sorted.length > 5) {
    carvePath(grid, gw, gh, sorted[2].cx, sorted[2].cy, sorted[sorted.length - 1].cx, sorted[sorted.length - 1].cy, 2, seed + 600);
  }

  // ── Smooth the terrain (remove isolated blocked/open cells) ──
  smoothGrid(grid, gw, gh);

  const terrain: TerrainGrid = {
    grid, width: gw, height: gh, cellSize,
    worldWidth: gw * cellSize, worldHeight: gh * cellSize,
  };

  return { terrain, clearings };
}

/** Carve a circular clearing into the grid */
function carveCircle(grid: Uint8Array, gw: number, gh: number, cx: number, cy: number, radius: number): void {
  for (let y = Math.max(0, cy - radius - 1); y <= Math.min(gh - 1, cy + radius + 1); y++) {
    for (let x = Math.max(0, cx - radius - 1); x <= Math.min(gw - 1, cx + radius + 1); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        grid[y * gw + x] = 1;
      }
    }
  }
}

/** Carve a winding path between two points */
function carvePath(grid: Uint8Array, gw: number, gh: number,
  x1: number, y1: number, x2: number, y2: number, width: number, seed: number): void {
  let cx = x1, cy = y1;
  let step = 0;
  const maxSteps = (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * 3;

  while ((cx !== x2 || cy !== y2) && step < maxSteps) {
    // Carve circle at current position
    for (let dy = -width; dy <= width; dy++) {
      for (let dx = -width; dx <= width; dx++) {
        if (dx * dx + dy * dy <= width * width) {
          const gx = cx + dx, gy = cy + dy;
          if (gx >= 0 && gx < gw && gy >= 0 && gy < gh) {
            grid[gy * gw + gx] = 1;
          }
        }
      }
    }

    // Move toward target with some randomness for organic paths
    const jitter = hash2d(cx + step, cy + step, seed);
    if (jitter < 0.15 && cy > 2 && cy < gh - 2) {
      // Random perpendicular jog
      cy += hash2d(step, 0, seed + 999) > 0.5 ? 1 : -1;
    } else if (jitter < 0.3 && cx > 2 && cx < gw - 2) {
      cx += hash2d(0, step, seed + 998) > 0.5 ? 1 : -1;
    } else if (Math.abs(cx - x2) > Math.abs(cy - y2)) {
      cx += cx < x2 ? 1 : -1;
    } else {
      cy += cy < y2 ? 1 : -1;
    }
    step++;
  }
}

/** Smooth grid: remove isolated cells (cellular automata pass) */
function smoothGrid(grid: Uint8Array, gw: number, gh: number): void {
  const copy = new Uint8Array(grid);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          neighbors += copy[(y + dy) * gw + (x + dx)];
        }
      }
      // If most neighbors disagree, flip this cell
      if (grid[y * gw + x] === 1 && neighbors < 2) grid[y * gw + x] = 0;
      if (grid[y * gw + x] === 0 && neighbors > 6) grid[y * gw + x] = 1;
    }
  }
}

// ── Convert Clearings to MapRooms (for existing mob/combat systems) ──

function clearingToRoomType(type: Clearing['type']): RoomType {
  switch (type) {
    case 'start': return 'entry';
    case 'pack': return 'pack';
    case 'large': return 'large';
    case 'boss': return 'boss';
    case 'secret': return 'side';
  }
}

/** Generate mob spawn points within a clearing */
function generateClearingSpawns(c: Clearing, modifiers: MapModifier[]): MobSpawnPoint[] {
  const points: MobSpawnPoint[] = [];
  const margin = c.worldRadius * 0.3;
  const addRandom = (tier: 'white' | 'magic' | 'rare', count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (c.worldRadius - margin);
      points.push({
        x: c.wx + Math.cos(angle) * dist,
        y: c.wy + Math.sin(angle) * dist,
        tier,
      });
    }
  };

  switch (c.type) {
    case 'start':
      addRandom('white', 4 + Math.floor(Math.random() * 3));
      break;
    case 'pack':
      addRandom('white', 6 + Math.floor(Math.random() * 6));
      addRandom('magic', 1 + Math.floor(Math.random() * 2));
      if (Math.random() < 0.5) addRandom('rare', 1);
      break;
    case 'large':
      addRandom('white', 12 + Math.floor(Math.random() * 8));
      addRandom('magic', 2 + Math.floor(Math.random() * 2));
      addRandom('rare', 1 + Math.floor(Math.random() * 2));
      break;
    case 'boss':
      addRandom('white', 6 + Math.floor(Math.random() * 4));
      addRandom('magic', 1 + Math.floor(Math.random() * 2));
      addRandom('rare', 2);
      break;
    case 'secret':
      addRandom('magic', 2);
      addRandom('rare', 1);
      break;
  }

  // Apply dense/swarm modifiers
  if (hasModifier(modifiers, 'dense')) {
    const whites = points.filter(p => p.tier === 'white').length;
    const toAdd = Math.ceil(whites * 0.3);
    addRandom('white', toAdd);
  }
  if (hasModifier(modifiers, 'swarm')) {
    addRandom('white', 3);
  }

  return points;
}

// ── Main Generation Function ──

/** Generate a procedural map with noise terrain, clearings, and paths */
export function generateProceduralMap(
  _zoneBand: number, _wave: number, isBossMap: boolean, modifiers: MapModifier[] = [],
): MapLayout {
  const seed = Math.floor(Math.random() * 999999);
  const { terrain, clearings } = generateProceduralTerrain(seed);

  // Convert clearings to MapRooms for the existing combat/mob systems
  const rooms: MapRoom[] = [];
  let nextRoomId = 0;

  for (const c of clearings) {
    if (c.type === 'boss' && !isBossMap) continue;
    const roomType = clearingToRoomType(c.type);
    const rw = c.worldRadius * 2;
    const rh = c.worldRadius * 2;
    const rx = c.wx - c.worldRadius;
    const ry = c.wy - c.worldRadius;
    const hasShrineSpot = c.type === 'secret' || (c.type === 'large' && Math.random() < 0.3);

    rooms.push({
      id: nextRoomId++,
      type: roomType,
      x: rx, y: ry, width: rw, height: rh,
      walls: [],    // no wall collision — terrain grid handles it
      doors: [],    // no doors — open terrain
      spawnPoints: generateClearingSpawns(c, modifiers),
      chests: c.type === 'secret' ? [{
        id: nextRoomId * 100, x: c.wx, y: c.wy,
        opened: false, tier: Math.random() < 0.3 ? 'rare' as const : 'normal' as const,
      }] : [],
      hasShrineSpot,
      shrinePos: hasShrineSpot ? { x: c.wx, y: c.wy - c.worldRadius * 0.3 } : undefined,
      entered: c.type === 'start',
      cleared: false,
      mobIds: [],
    });
  }

  // Ensure at least one room exists
  if (rooms.length === 0) {
    rooms.push({
      id: 0, type: 'entry',
      x: terrain.worldWidth * 0.3, y: terrain.worldHeight * 0.4,
      width: 300, height: 300,
      walls: [], doors: [],
      spawnPoints: [], chests: [],
      hasShrineSpot: false, entered: true, cleared: false, mobIds: [],
    });
  }

  const startRoom = rooms.find(r => r.type === 'entry') ?? rooms[0];
  const exitRoom = rooms.find(r => r.type === 'boss') ?? rooms[rooms.length - 1];

  return {
    rooms,
    worldWidth: terrain.worldWidth,
    worldHeight: terrain.worldHeight,
    startRoomId: startRoom.id,
    exitRoomId: exitRoom.id,
    props: [],
    terrain,
  };
}

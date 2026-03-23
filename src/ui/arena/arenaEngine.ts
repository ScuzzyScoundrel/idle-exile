// ============================================================
// Arena Engine — spatial ARPG layer over the idle combat engine
// Core logic: state creation, spawning, combat slicing, update loop.
// Sub-modules handle types, rendering, feedback, movement, traps.
// ============================================================

// Re-export sub-modules (ArenaScreen imports from ./arenaEngine)
export * from './arenaTypes';
export * from './arenaCombatFeedback';
export * from './arenaMovement';
export * from './arenaTraps';
export * from './arenaRendering';

import type { ArenaGroundItem } from './arenaLoot';
import { applyGroundItemPickup } from './arenaLoot';
import { rollZoneAttack, calcZoneAccuracy, calcLevelDamageMult } from '../../engine/zones';
import { spawnPack } from '../../engine/packs';
import { getDebuffDef } from '../../data/debuffs';
import type { ResolvedStats, ZoneDef } from '../../types';
import type { MobInPack } from '../../types/combat';
import type { MobDamageElement } from '../../types/zones';

import type { ArenaState, ArenaMob, Vec2 } from './arenaTypes';
import { PLAYER_ATTACK_RANGE, MOB_ATTACK_RANGE } from './arenaTypes';
import {
  addKillFloater,
  spawnDeathParticles,
  spawnGems,
  addDamageFloater,
  markMobHit,
  applyKnockback,
  updateGems,
} from './arenaCombatFeedback';
import { triggerShake } from './arenaCombatFeedback';
import { moveMobsTowardPlayer, PLAYER_SPEED } from './arenaMovement';

// ── Constants (kept in arenaEngine) ──

const PLAYER_RADIUS = 16;
const MOB_RADIUS = 11;
const RARE_MOB_RADIUS = 15;
const SPAWN_MARGIN = 60;
const SPATIAL_ATTACK_INTERVAL = 2.0;        // seconds between mob spatial attacks
const SPATIAL_DMG_BASE = 9;                 // matches ZONE_DMG_BASE
const SPATIAL_DMG_ILVL_SCALE = 1.2;         // matches ZONE_DMG_ILVL_SCALE

// ── Wave System ──
const WAVE_BASE_DENSITY = 20;              // mob target for wave 1
const WAVE_DENSITY_PER_WAVE = 5;           // additional mobs per wave
const WAVE_MAX_DENSITY = 40;               // cap on mob target
const WAVE_BASE_INTERVAL = 0.5;            // spawn interval wave 1 (seconds)
const WAVE_INTERVAL_REDUCTION = 0.05;      // faster spawns per wave
const WAVE_MIN_INTERVAL = 0.3;             // fastest spawn interval
const WAVE_BOSS_DENSITY = 12;              // fewer adds during boss
const WAVE_BOSS_INTERVAL = 2.0;            // slow spawns during boss

// ── Ranged Mob Projectiles ──

export const PROJECTILE_SPEED = 200;         // px/sec (also used by arenaRendering for trail calc)
const PROJECTILE_RADIUS = 6;          // hitbox
const PROJECTILE_MAX_AGE = 2.0;       // seconds
const RANGED_ATTACK_INTERVAL = 2.5;   // seconds between ranged mob shots
const PROJECTILE_LEAD = 0.15;         // seconds of player velocity lead

// ── Ground Items ──

const GROUND_ITEM_PICKUP_RADIUS = 50;
const GROUND_ITEM_HOVER_RADIUS = 40;
const GROUND_ITEM_MAX_AGE = 30;
export const GROUND_ITEM_COLLECT_ANIM = 0.25;
const GROUND_ITEM_DRIFT_SPEED = 250;

// ── Create ──

export function createArenaState(width: number, height: number): ArenaState {
  return {
    player: { x: width * 1.25, y: height * 1.25 }, // world center
    playerRadius: PLAYER_RADIUS,
    playerFacing: { x: 0, y: -1 },
    mobs: [],
    floaters: [],
    splashes: [],
    gems: [],
    lastKnownPackLength: 0,
    width,
    height,
    tickAccumulator: 0,
    totalTime: 0,
    nextMobId: 1,
    pendingSpawns: 0,
    spawnTimer: 0,
    shakeIntensity: 0,
    shakeTimer: 0,
    lastCastSkillId: null,
    lastCastTimer: 0,
    particles: [],
    trail: [],
    skillVisuals: [],
    iFrameTimer: 0,
    playerMoving: false,
    bossEntranceTimer: 0,
    lastCombatPhase: 'clearing',
    paused: false,
    showStats: false,
    sessionStartTime: Date.now(),
    sessionDeaths: 0,
    camera: { x: width * 0.75, y: height * 0.75 }, // centered on player start
    worldWidth: width * 2.5,
    worldHeight: height * 2.5,
    killStreakCount: 0,
    frenzyTimer: 0,
    // Phase 7
    groundItems: [],
    nextGroundItemId: 1,
    mouseWorldPos: null,
    currentCombatPhase: 'clearing',
    killAccumForClears: 0,
    arenaInitialized: false,
    // Phase 8: Wave progression
    currentWave: 1,
    waveKillCount: 0,
    waveKillTarget: 10,
    waveAnnouncementTimer: 0,
    multiKillTimer: 0,
    multiKillCount: 0,
    critFlashTimer: 0,
    combatLog: [],
    // Phase 9: Ranged mob projectiles
    projectiles: [],
    nextProjectileId: 1,
    // Phase 10: Persistent arena traps
    traps: [],
    nextTrapId: 1,
  };
}

// ── Mob Spawning ──

/** Spawn position just outside the camera view (not world edge). */
function randomEdgePosition(width: number, height: number, camera?: Vec2): Vec2 {
  const cx = camera?.x ?? 0;
  const cy = camera?.y ?? 0;
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: return { x: cx + Math.random() * width, y: cy - SPAWN_MARGIN };
    case 1: return { x: cx + Math.random() * width, y: cy + height + SPAWN_MARGIN };
    case 2: return { x: cx - SPAWN_MARGIN, y: cy + Math.random() * height };
    default: return { x: cx + width + SPAWN_MARGIN, y: cy + Math.random() * height };
  }
}

/** Roll a random mob behavior type. */
function rollMobBehavior(): 'melee' | 'fast' | 'ranged' {
  const r = Math.random();
  if (r < 0.15) return 'ranged';  // 15% ranged
  if (r < 0.35) return 'fast';    // 20% fast
  return 'melee';                  // 65% melee
}

/** Map damage element to mob color. */
function elementColor(element?: string, isRare?: boolean): string {
  if (isRare) return '#f59e0b'; // rare always gold
  switch (element) {
    case 'fire': return '#f97316';
    case 'cold': return '#22d3ee';
    case 'lightning': return '#facc15';
    case 'chaos': return '#4ade80';
    default: return '#ef4444'; // physical
  }
}

/** Sync arena visual mobs with the game engine's packMobs array. */
export function syncMobsFromPack(
  state: ArenaState,
  packMobs: ReadonlyArray<{ hp: number; maxHp: number; rare: unknown; damageElement?: string; debuffs?: Array<{ debuffId: string }> }>,
): void {
  const len = packMobs.length;

  // Detect new pack spawn (engine replaced packMobs entirely)
  const isNewPack = len !== state.lastKnownPackLength ||
    (len > 0 && state.mobs.length === 0) ||
    (len > 0 && state.mobs.every(m => m.dead));

  if (isNewPack) {
    state.mobs = packMobs.map((mob, i) => {
      const pos = randomEdgePosition(state.width, state.height, state.camera);
      return {
        mobId: state.nextMobId++,
        packIndex: i,
        x: pos.x,
        y: pos.y,
        radius: mob.rare ? RARE_MOB_RADIUS : MOB_RADIUS,
        hp: mob.hp,
        maxHp: mob.maxHp,
        isRare: !!mob.rare,
        dead: mob.hp <= 0,
        deathTimer: 0,
        color: elementColor(mob.damageElement, !!mob.rare),
        vx: 0,
        vy: 0,
        lastHitTime: -1,
        knockbackVx: 0,
        knockbackVy: 0,
        attackTimer: Math.random() * SPATIAL_ATTACK_INTERVAL,
        activeDebuffs: [],
        behavior: rollMobBehavior(),
      };
    });
    state.lastKnownPackLength = len;
  } else {
    // Sync HP from store — use packIndex, NOT array position
    for (const mob of state.mobs) {
      if (mob.dead || mob.packIndex < 0 || mob.packIndex >= packMobs.length) continue;
      const pm = packMobs[mob.packIndex];
      const prevHp = mob.hp;
      mob.hp = pm.hp;
      mob.maxHp = pm.maxHp;
      if (pm.hp <= 0 && prevHp > 0) {
        mob.dead = true;
        mob.deathTimer = 0;
      }
      // Sync debuff indicators
      mob.activeDebuffs = pm.debuffs?.map(d => d.debuffId) ?? [];
    }
  }
}

// ── Arena Pack Management ──

/** Spawn an arena-sized pack of real engine mobs with disabled zone attacks.
 *  Creates matching visual ArenaMob entries at random edge positions. */
export function spawnArenaPack(
  state: ArenaState,
  zone: ZoneDef,
  hpMult: number,
  invMult: number,
  count: number,
  mobElement?: MobDamageElement,
  mobPhysRatio?: number,
): MobInPack[] {
  const now = Date.now();
  const pack = spawnPack(zone, hpMult, invMult, now, mobElement, mobPhysRatio, count);

  // Create matching visual mobs
  state.mobs = pack.map((mob, i) => {
    const pos = randomEdgePosition(state.width, state.height, state.camera);
    return {
      mobId: state.nextMobId++,
      packIndex: i,
      x: pos.x,
      y: pos.y,
      radius: mob.rare ? RARE_MOB_RADIUS : MOB_RADIUS,
      hp: mob.hp,
      maxHp: mob.maxHp,
      isRare: !!mob.rare,
      dead: false,
      deathTimer: 0,
      color: elementColor(mob.damageElement, !!mob.rare),
      vx: 0,
      vy: 0,
      lastHitTime: -1,
      knockbackVx: 0,
      knockbackVy: 0,
      attackTimer: Math.random() * SPATIAL_ATTACK_INTERVAL,
      activeDebuffs: [],
      behavior: rollMobBehavior(),
    };
  });
  state.lastKnownPackLength = pack.length;

  return pack;
}

/** Build a combat slice: only mobs within PLAYER_ATTACK_RANGE, sorted closest-first.
 *  The engine will only see (and damage) these mobs during the tick.
 *  Out-of-range mobs are untouched — their debuffs freeze (matches engine semantics:
 *  only packMobs[0]'s debuffs tick anyway). */
export function buildCombatSlice(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
): { slice: MobInPack[]; slicePackIndices: number[] } {
  const entries: { packIndex: number; dist: number }[] = [];
  for (const vm of state.mobs) {
    if (vm.dead || vm.packIndex >= fullPack.length) continue;
    const dx = state.player.x - vm.x;
    const dy = state.player.y - vm.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= PLAYER_ATTACK_RANGE) {
      entries.push({ packIndex: vm.packIndex, dist });
    }
  }
  entries.sort((a, b) => a.dist - b.dist);
  return {
    slice: entries.map(e => fullPack[e.packIndex]),
    slicePackIndices: entries.map(e => e.packIndex),
  };
}

/** After tickCombat on a combat slice: sync kills/damage back to visual mobs,
 *  merge surviving slice mobs back into the full pack, remove dead mobs.
 *  Returns the rebuilt full pack. */
export function mergeAfterTick(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
  slicePackIndices: number[],
  postSlice: ReadonlyArray<MobInPack>,
  mobKills: number,
  isCrit: boolean,
): MobInPack[] {
  // Engine popped mobKills dead mobs from front of slice.
  // Dead: slicePackIndices[0..mobKills-1]
  // Surviving slice mobs: postSlice[i] = slicePackIndices[mobKills + i]
  const deadSet = new Set<number>();

  // 1. Mark killed visual mobs (closest mobs that died)
  for (let i = 0; i < mobKills && i < slicePackIndices.length; i++) {
    const origIdx = slicePackIndices[i];
    deadSet.add(origIdx);
    const visMob = state.mobs.find(m => m.packIndex === origIdx);
    if (visMob && !visMob.dead) {
      visMob.dead = true;
      visMob.deathTimer = 0;
      addKillFloater(state, visMob);
      spawnDeathParticles(state, visMob);
      spawnGems(state, visMob, 2 + Math.floor(Math.random() * 3));
      if (Math.random() < 0.3) spawnGems(state, visMob, 1, true);
    }
  }

  // 2. Sync HP on surviving slice mobs + visual feedback
  const updatedByOrigIdx = new Map<number, MobInPack>();
  for (let i = 0; i < postSlice.length; i++) {
    const srcI = mobKills + i;
    if (srcI >= slicePackIndices.length) break;
    const origIdx = slicePackIndices[srcI];
    updatedByOrigIdx.set(origIdx, postSlice[i]);

    const visMob = state.mobs.find(m => m.packIndex === origIdx);
    if (!visMob || visMob.dead) continue;

    const prevHp = visMob.hp;
    visMob.hp = postSlice[i].hp;
    visMob.maxHp = postSlice[i].maxHp;
    visMob.activeDebuffs = postSlice[i].debuffs?.map(d => d.debuffId) ?? [];
    const hpDelta = prevHp - postSlice[i].hp;

    if (hpDelta > 0 && postSlice[i].hp > 0) {
      markMobHit(state, visMob);
      applyKnockback(state, visMob);
      addDamageFloater(state, hpDelta, isCrit, visMob);
    }
    if (postSlice[i].hp <= 0 && prevHp > 0) {
      visMob.dead = true;
      visMob.deathTimer = 0;
      deadSet.add(origIdx);
      addKillFloater(state, visMob);
      spawnDeathParticles(state, visMob);
      spawnGems(state, visMob, 2 + Math.floor(Math.random() * 3));
      if (Math.random() < 0.3) spawnGems(state, visMob, 1, true);
    }
  }

  // 3. Rebuild full pack: use updated MobInPack for slice survivors, keep originals for rest
  const newFull: MobInPack[] = [];
  const oldToNew = new Map<number, number>();
  for (let i = 0; i < fullPack.length; i++) {
    if (deadSet.has(i)) continue;
    oldToNew.set(i, newFull.length);
    newFull.push(updatedByOrigIdx.get(i) ?? fullPack[i]);
  }

  // 4. Reindex visual mobs' packIndex
  for (const vm of state.mobs) {
    if (vm.dead) continue;
    const mapped = oldToNew.get(vm.packIndex);
    if (mapped !== undefined) vm.packIndex = mapped;
  }

  // 5. Queue replacement spawns
  state.pendingSpawns += deadSet.size;
  state.lastKnownPackLength = newFull.length;

  return newFull;
}

/** Consume pendingSpawns at wave-controlled rate. Returns new MobInPack[] to append to store. */
export function tickArenaSpawns(
  state: ArenaState,
  dt: number,
  zone: ZoneDef,
  hpMult: number,
  invMult: number,
  mobElement?: MobDamageElement,
  mobPhysRatio?: number,
): MobInPack[] {
  if (state.pendingSpawns <= 0) return [];

  const isBoss = state.currentCombatPhase === 'boss_fight';
  const wave = state.currentWave;
  const densityCap = isBoss
    ? WAVE_BOSS_DENSITY
    : Math.min(WAVE_MAX_DENSITY, WAVE_BASE_DENSITY + (wave - 1) * WAVE_DENSITY_PER_WAVE);
  const interval = isBoss
    ? WAVE_BOSS_INTERVAL
    : Math.max(WAVE_MIN_INTERVAL, WAVE_BASE_INTERVAL - (wave - 1) * WAVE_INTERVAL_REDUCTION);

  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return [];

  // Count living mobs
  const alive = state.mobs.filter(m => !m.dead).length;
  if (alive >= densityCap) return [];

  // Spawn one mob
  state.spawnTimer = interval;
  state.pendingSpawns--;

  const now = Date.now();
  const pack = spawnPack(zone, hpMult, invMult, now, mobElement, mobPhysRatio, 1);
  // Create visual mob at edge
  const currentPackLen = state.lastKnownPackLength;
  const pos = randomEdgePosition(state.width, state.height, state.camera);
  state.mobs.push({
    mobId: state.nextMobId++,
    packIndex: currentPackLen, // appended to end of packMobs
    x: pos.x,
    y: pos.y,
    radius: pack[0].rare ? RARE_MOB_RADIUS : MOB_RADIUS,
    hp: pack[0].hp,
    maxHp: pack[0].maxHp,
    isRare: !!pack[0].rare,
    dead: false,
    deathTimer: 0,
    color: elementColor(pack[0].damageElement, !!pack[0].rare),
    vx: 0,
    vy: 0,
    lastHitTime: -1,
    knockbackVx: 0,
    knockbackVy: 0,
    attackTimer: Math.random() * SPATIAL_ATTACK_INTERVAL,
    activeDebuffs: [],
    behavior: rollMobBehavior(),
  });
  state.lastKnownPackLength = currentPackLen + 1;

  return pack;
}

/** Returns closest living target in attack range. */
export function getClosestTargetInRange(state: ArenaState): ArenaMob | null {
  let closest: ArenaMob | null = null;
  let closestDist = Infinity;
  for (const mob of state.mobs) {
    if (mob.dead) continue;
    const dx = state.player.x - mob.x;
    const dy = state.player.y - mob.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= PLAYER_ATTACK_RANGE && d < closestDist) {
      closest = mob;
      closestDist = d;
    }
  }
  return closest;
}

/** Advance wave — call when waveKillCount >= waveKillTarget. */
export function advanceWave(state: ArenaState): void {
  state.currentWave++;
  state.waveKillCount = 0;
  state.waveKillTarget = Math.min(50, state.currentWave * 10);
  state.waveAnnouncementTimer = 1.5;
  triggerShake(state, 3);
}

// ── Ranged Mob Projectiles ──

/** Tick ranged mob projectile spawning, movement, and collision.
 *  Called per-frame from ArenaScreen after updateArena. */
export function tickRangedProjectiles(
  state: ArenaState,
  dt: number,
  zoneBand: number,
  zoneILvlMin: number,
  playerLevel: number,
  playerStats: ResolvedStats,
): ProjectileHitResult[] {
  const hits: ProjectileHitResult[] = [];
  const levelMult = calcLevelDamageMult(playerLevel, zoneILvlMin);
  const zoneAccuracy = calcZoneAccuracy(zoneBand, playerLevel, zoneILvlMin);

  // 1. Ranged mobs fire projectiles
  for (const mob of state.mobs) {
    if (mob.dead || mob.behavior !== 'ranged') continue;

    mob.attackTimer -= dt;
    if (mob.attackTimer > 0) continue;
    mob.attackTimer = RANGED_ATTACK_INTERVAL * (0.8 + Math.random() * 0.4);

    // Aim at player position + slight lead
    const dx = state.player.x - mob.x;
    const dy = state.player.y - mob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1 || dist > 500) continue; // too close or too far

    // Lead target based on player movement
    const leadX = state.playerMoving ? state.playerFacing.x * PLAYER_SPEED * PROJECTILE_LEAD : 0;
    const leadY = state.playerMoving ? state.playerFacing.y * PLAYER_SPEED * PROJECTILE_LEAD : 0;
    const aimX = state.player.x + leadX - mob.x;
    const aimY = state.player.y + leadY - mob.y;
    const aimDist = Math.sqrt(aimX * aimX + aimY * aimY);

    // Pre-roll damage
    const variance = 0.8 + Math.random() * 0.4;
    const rawDmg = (SPATIAL_DMG_BASE * zoneBand + SPATIAL_DMG_ILVL_SCALE * zoneILvlMin) * levelMult * variance;

    state.projectiles.push({
      id: state.nextProjectileId++,
      x: mob.x,
      y: mob.y,
      vx: (aimX / aimDist) * PROJECTILE_SPEED,
      vy: (aimY / aimDist) * PROJECTILE_SPEED,
      radius: PROJECTILE_RADIUS,
      color: '#60a5fa',
      age: 0,
      maxAge: PROJECTILE_MAX_AGE,
      damage: rawDmg,
      sourceMobId: mob.mobId,
      hit: false,
    });
  }

  // 2. Collision check
  for (const proj of state.projectiles) {
    if (proj.hit) continue;
    const px = state.player.x - proj.x;
    const py = state.player.y - proj.y;
    const d = Math.sqrt(px * px + py * py);
    if (d > proj.radius + state.playerRadius) continue;

    proj.hit = true;

    // Skip if i-frames active
    if (state.iFrameTimer > 0) continue;

    // Roll dodge/block using engine's zone attack roll
    const roll = rollZoneAttack(proj.damage, 0.7, zoneAccuracy, playerStats, undefined, undefined, zoneBand);
    hits.push({
      damage: Math.round(roll.damage),
      isDodged: roll.isDodged,
      isBlocked: roll.isBlocked,
    });
  }

  return hits;
}

// We need ProjectileHitResult for the return type — it's re-exported from arenaTypes
import type { ProjectileHitResult } from './arenaTypes';

// ── Update ──

export function updateArena(
  state: ArenaState,
  dt: number,
  keys: Set<string>,
): void {
  state.totalTime += dt;

  // ── Player movement ──
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
    state.playerFacing = { x: dx, y: dy };
  }

  // Soft boundary: slow near world edges
  const BOUNDARY_ZONE = 60;
  let speedMult = 1;
  const distToLeft = state.player.x - state.playerRadius;
  const distToRight = state.worldWidth - state.playerRadius - state.player.x;
  const distToTop = state.player.y - state.playerRadius;
  const distToBottom = state.worldHeight - state.playerRadius - state.player.y;
  const minEdgeDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
  if (minEdgeDist < BOUNDARY_ZONE) {
    speedMult = Math.max(0.3, minEdgeDist / BOUNDARY_ZONE);
  }

  state.player.x += dx * PLAYER_SPEED * speedMult * dt;
  state.player.y += dy * PLAYER_SPEED * speedMult * dt;
  state.playerMoving = dx !== 0 || dy !== 0;

  // Clamp to world bounds
  state.player.x = Math.max(state.playerRadius, Math.min(state.worldWidth - state.playerRadius, state.player.x));
  state.player.y = Math.max(state.playerRadius, Math.min(state.worldHeight - state.playerRadius, state.player.y));

  // ── Camera follow with deadzone ──
  const DEADZONE = 40;
  const CAMERA_SMOOTH = 5;
  const targetCamX = state.player.x - state.width / 2;
  const targetCamY = state.player.y - state.height / 2;
  const camDx = targetCamX - state.camera.x;
  const camDy = targetCamY - state.camera.y;
  if (Math.abs(camDx) > DEADZONE) state.camera.x += (camDx - Math.sign(camDx) * DEADZONE) * CAMERA_SMOOTH * dt;
  if (Math.abs(camDy) > DEADZONE) state.camera.y += (camDy - Math.sign(camDy) * DEADZONE) * CAMERA_SMOOTH * dt;
  // Clamp camera to world
  state.camera.x = Math.max(0, Math.min(state.worldWidth - state.width, state.camera.x));
  state.camera.y = Math.max(0, Math.min(state.worldHeight - state.height, state.camera.y));

  // ── Player trail (afterimage dots when moving) ──
  if (state.playerMoving) {
    // Add dot every ~0.04s (every other frame at 60fps)
    if (state.trail.length === 0 || state.trail[state.trail.length - 1].age > 0.04) {
      state.trail.push({ x: state.player.x, y: state.player.y, age: 0 });
    }
  }
  for (const dot of state.trail) dot.age += dt;
  state.trail = state.trail.filter(d => d.age < 0.25);
  // Cap to 6 dots
  if (state.trail.length > 6) state.trail = state.trail.slice(-6);

  // ── Mob movement ──
  moveMobsTowardPlayer(state, state.mobs, dt);

  // ── Splashes ──
  for (const s of state.splashes) s.age += dt;
  state.splashes = state.splashes.filter(s => s.age < s.maxAge);

  // ── Gems ──
  updateGems(state, dt);

  // ── Ground Items (Phase 7) ──
  updateGroundItems(state, dt);

  // ── Knockback decay (all mobs) ──
  const KNOCKBACK_FRICTION = 8;
  const applyKnockbackDecay = (mob: ArenaMob) => {
    if (mob.knockbackVx !== 0 || mob.knockbackVy !== 0) {
      mob.x += mob.knockbackVx * dt;
      mob.y += mob.knockbackVy * dt;
      mob.knockbackVx *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt);
      mob.knockbackVy *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt);
      if (Math.abs(mob.knockbackVx) < 1) mob.knockbackVx = 0;
      if (Math.abs(mob.knockbackVy) < 1) mob.knockbackVy = 0;
    }
  };
  for (const m of state.mobs) applyKnockbackDecay(m);

  // ── Particles ──
  for (const p of state.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt; // slight gravity
  }
  state.particles = state.particles.filter(p => p.age < p.maxAge);

  // ── Skill visuals ──
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
    trap.rotation += (trap.armed ? 8 : 3) * dt; // spin faster when armed
    if (!trap.armed && trap.armTimer > 0) {
      trap.armTimer -= dt;
      if (trap.armTimer <= 0) trap.armed = true;
    }
    if (trap.detonated) trap.detonateTimer += dt;
  }
  state.traps = state.traps.filter(t => !t.detonated || t.detonateTimer < 0.5);

  // ── Projectile movement ──
  for (const proj of state.projectiles) {
    proj.age += dt;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
  }
  state.projectiles = state.projectiles.filter(p => !p.hit && p.age < p.maxAge);

  // ── I-frame decay ──
  if (state.iFrameTimer > 0) state.iFrameTimer -= dt;

  // ── Boss entrance timer decay ──
  if (state.bossEntranceTimer > 0) state.bossEntranceTimer -= dt;

  // ── Frenzy timer decay ──
  if (state.frenzyTimer > 0) state.frenzyTimer -= dt;

  // ── Wave / multi-kill / crit flash decay ──
  if (state.waveAnnouncementTimer > 0) state.waveAnnouncementTimer -= dt;
  if (state.multiKillTimer > 0) state.multiKillTimer -= dt;
  if (state.critFlashTimer > 0) state.critFlashTimer -= dt;

  // ── Screen shake decay ──
  if (state.shakeTimer > 0) {
    state.shakeTimer -= dt;
    if (state.shakeTimer <= 0) {
      state.shakeIntensity = 0;
    }
  }

  // ── Skill cast timer decay ──
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

  // Clean up finished death animations
  state.mobs = state.mobs.filter(m => !m.dead || m.deathTimer < 0.6);

  // Accumulate combat tick time
  state.tickAccumulator += dt;
}

// ── Proximity Helpers ──

function distToPlayer(state: ArenaState, mob: ArenaMob): number {
  const dx = state.player.x - mob.x;
  const dy = state.player.y - mob.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Returns living mobs within the player's attack range. */
export function getMobsInRange(state: ArenaState): ArenaMob[] {
  return state.mobs.filter(m => !m.dead && distToPlayer(state, m) <= PLAYER_ATTACK_RANGE);
}

/** Returns the closest living mob within attack range, or null. */
export function getClosestMobInRange(state: ArenaState): ArenaMob | null {
  let closest: ArenaMob | null = null;
  let closestDist = Infinity;
  for (const mob of state.mobs) {
    if (mob.dead) continue;
    const d = distToPlayer(state, mob);
    if (d <= PLAYER_ATTACK_RANGE && d < closestDist) {
      closest = mob;
      closestDist = d;
    }
  }
  return closest;
}

/** True if any living mob is within attack range. */
export function anyMobInRange(state: ArenaState): boolean {
  return state.mobs.some(m => !m.dead && distToPlayer(state, m) <= PLAYER_ATTACK_RANGE);
}

/** True if a specific mob is close enough to attack the player. */
export function mobCanAttackPlayer(state: ArenaState, mob: ArenaMob): boolean {
  return distToPlayer(state, mob) <= MOB_ATTACK_RANGE + state.playerRadius + mob.radius;
}

// ── Out-of-Range DoT Ticker ──

/** Approximate DoT damage on out-of-range mobs so poison/bleed work when player walks away.
 *  Modifies fullPack MobInPack HP directly. Returns number of kills from DoTs. */
export function tickOutOfRangeDoTs(
  state: ArenaState,
  fullPack: MobInPack[],
  dt: number,
): number {
  let kills = 0;
  const inRangeSet = new Set<number>();
  for (const vm of state.mobs) {
    if (vm.dead || vm.packIndex >= fullPack.length) continue;
    const dx = state.player.x - vm.x;
    const dy = state.player.y - vm.y;
    if (Math.sqrt(dx * dx + dy * dy) <= PLAYER_ATTACK_RANGE) {
      inRangeSet.add(vm.packIndex);
    }
  }

  for (let i = 0; i < fullPack.length; i++) {
    if (inRangeSet.has(i)) continue; // engine handles in-range mobs
    const mob = fullPack[i];
    if (mob.hp <= 0 || mob.debuffs.length === 0) continue;

    let dotDmg = 0;
    const updatedDebuffs = [];
    for (const debuff of mob.debuffs) {
      const def = getDebuffDef(debuff.debuffId);
      const newDuration = debuff.remainingDuration - dt;
      if (newDuration <= 0) continue; // expired, drop it

      if (def?.instanceBased && debuff.instances && debuff.instances.length > 0) {
        // Instance-based DoT (poison): each instance ticks independently
        const snapshotPct = (def.effect.snapshotPercent ?? 15) / 100;
        const living = debuff.instances
          .map(inst => ({ ...inst, remainingDuration: inst.remainingDuration - dt }))
          .filter(inst => inst.remainingDuration > 0);
        if (living.length > 0) {
          const snapSum = living.reduce((a, inst) => a + inst.snapshot, 0);
          dotDmg += snapSum * snapshotPct * dt;
          updatedDebuffs.push({ ...debuff, remainingDuration: newDuration, instances: living, stacks: living.length });
        }
      } else if (def?.dotType === 'snapshot' && !def.instanceBased) {
        // Bleed: trigger-based (fires when mob attacks player), NOT passive DPS.
        // Out-of-range mobs can't attack → bleed doesn't deal damage. Just tick duration.
        updatedDebuffs.push({ ...debuff, remainingDuration: newDuration });
      } else if (def?.dotType === 'percentMaxHp') {
        // Percent max HP DoT (burning/ignite): X% per second per stack
        const pctPerSec = (def.effect.percentMaxHp ?? 1) / 100;
        dotDmg += mob.maxHp * pctPerSec * debuff.stacks * dt;
        updatedDebuffs.push({ ...debuff, remainingDuration: newDuration });
      } else {
        // Non-damage debuff (shocked, chilled, etc.) — keep it, no damage
        updatedDebuffs.push({ ...debuff, remainingDuration: newDuration });
      }
    }

    mob.debuffs = updatedDebuffs;

    if (dotDmg > 0) {
      mob.hp -= dotDmg;
      // Update visual mob
      const visMob = state.mobs.find(m => m.packIndex === i);
      if (visMob && !visMob.dead) {
        visMob.hp = mob.hp;
        visMob.activeDebuffs = updatedDebuffs.map(d => d.debuffId);
        if (mob.hp <= 0) {
          mob.hp = 0;
          visMob.hp = 0;
          visMob.dead = true;
          visMob.deathTimer = 0;
          kills++;
          addKillFloater(state, visMob);
          spawnDeathParticles(state, visMob);
          spawnGems(state, visMob, 2 + Math.floor(Math.random() * 3));
          if (Math.random() < 0.3) spawnGems(state, visMob, 1, true);
        } else if (dotDmg > 1) {
          addDamageFloater(state, dotDmg, false, visMob);
        }
      }
    } else {
      // No damage debuffs but debuffs updated (duration decremented)
      const visMob = state.mobs.find(m => m.packIndex === i);
      if (visMob) visMob.activeDebuffs = updatedDebuffs.map(d => d.debuffId);
    }
  }
  return kills;
}

// ── Ground Items ──

export function updateGroundItems(state: ArenaState, dt: number): void {
  for (const gi of state.groundItems) {
    gi.age += dt;

    if (gi.collected) {
      gi.collectTimer += dt;
      continue;
    }

    // Auto-pickup items drift toward player
    if (gi.autoPickup) {
      const dx = state.player.x - gi.x;
      const dy = state.player.y - gi.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < GROUND_ITEM_PICKUP_RADIUS) {
        const speed = GROUND_ITEM_DRIFT_SPEED * (1 - dist / GROUND_ITEM_PICKUP_RADIUS + 0.3);
        gi.x += (dx / dist) * speed * dt;
        gi.y += (dy / dist) * speed * dt;

        if (dist < state.playerRadius + 8) {
          gi.collected = true;
          gi.collectTimer = 0;
          applyGroundItemPickup(gi);
        }
      }
    }

    // Hover detection for equipment items (click-to-loot)
    if (!gi.autoPickup && state.mouseWorldPos) {
      const dx = state.mouseWorldPos.x - gi.x;
      const dy = state.mouseWorldPos.y - gi.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      gi.hovered = dist < GROUND_ITEM_HOVER_RADIUS;
    } else {
      gi.hovered = false;
    }
  }

  // Remove collected (after animation) and expired
  state.groundItems = state.groundItems.filter(gi => {
    if (gi.collected) return gi.collectTimer < GROUND_ITEM_COLLECT_ANIM;
    return gi.age < GROUND_ITEM_MAX_AGE;
  });
}

/** Click-to-pickup: find closest non-collected equipment item near click pos. */
export function tryPickupGroundItem(state: ArenaState, worldX: number, worldY: number): ArenaGroundItem | null {
  let closest: ArenaGroundItem | null = null;
  let closestDist = Infinity;

  for (const gi of state.groundItems) {
    if (gi.collected || gi.autoPickup) continue;
    const dx = worldX - gi.x;
    const dy = worldY - gi.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < GROUND_ITEM_HOVER_RADIUS && dist < closestDist) {
      closest = gi;
      closestDist = dist;
    }
  }

  if (closest) {
    closest.collected = true;
    closest.collectTimer = 0;
    applyGroundItemPickup(closest);
  }

  return closest;
}

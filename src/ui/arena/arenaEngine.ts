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
export * from './arenaAffixes';
export * from './arenaRendering';

import type { ArenaGroundItem } from './arenaLoot';
import { applyGroundItemPickup } from './arenaLoot';
import { rollZoneAttack, calcZoneAccuracy, calcLevelDamageMult } from '../../engine/zones';
import { spawnPack } from '../../engine/packs';
import { getDebuffDef } from '../../data/debuffs';
import type { ResolvedStats, ZoneDef } from '../../types';
import type { MobInPack } from '../../types/combat';
import type { MobDamageElement } from '../../types/zones';

import type { ArenaState, ArenaMob, Vec2, ArenaProjectile } from './arenaTypes';
import { PLAYER_ATTACK_RANGE, MOB_ATTACK_RANGE } from './arenaTypes';
import {
  addKillFloater,
  spawnDeathParticles,
  spawnGems,
  addDamageFloater,
  markMobHit,
  applyKnockback,
  updateGems,
  spawnDeathHazards,
} from './arenaCombatFeedback';
import { triggerShake } from './arenaCombatFeedback';
import { moveMobsTowardPlayer, PLAYER_SPEED } from './arenaMovement';
import { rollArenaAffixes, ARENA_AFFIX_DEFS } from './arenaAffixes';
import type { ArenaHazard } from './arenaTypes';

// ── Constants (kept in arenaEngine) ──

const PLAYER_RADIUS = 16;
const MOB_RADIUS = 11;
const RARE_MOB_RADIUS = 15;
const SPAWN_MARGIN = 60;
const SPATIAL_ATTACK_INTERVAL = 2.0;        // seconds between mob spatial attacks
const SPATIAL_DMG_BASE = 9;                 // matches ZONE_DMG_BASE
const SPATIAL_DMG_ILVL_SCALE = 1.2;         // matches ZONE_DMG_ILVL_SCALE

// ── Wave System ──
const WAVE_BASE_DENSITY = 40;              // mob target for wave 1 (VS-style swarm)
const WAVE_DENSITY_PER_WAVE = 8;           // additional mobs per wave
const WAVE_MAX_DENSITY = 80;               // cap on mob target
const WAVE_BASE_INTERVAL = 0.15;           // spawn interval wave 1 (seconds) — fast burst
const WAVE_INTERVAL_REDUCTION = 0.02;      // faster spawns per wave
const WAVE_MIN_INTERVAL = 0.08;            // fastest spawn interval
const BURST_SPAWN_COUNT = 4;               // spawn this many at once per tick
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
    bossMob: null,
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
    // Phase 11: Spatial dodge queue
    spatialDodgeQueue: 0,
    spatialBlockQueue: 0,
    // Phase 11: Dodge roll
    dodgeRollCooldown: 0,
    dodgeRollTimer: 0,
    dodgeRollDir: { x: 0, y: -1 },
    // Phase 12: Hit-stop
    hitStopTimer: 0,
    // Phase 13: Shrines
    shrines: [],
    nextShrineId: 1,
    activeShrineEffects: [],
    totalKillsForShrines: 0,
    nextTrapId: 1,
    // Phase 14: Arena affixes + ground hazards
    hazards: [],
    nextHazardId: 1,
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
        arenaAffixes: [],
        teleportTimer: 0,
        mortarTimer: 0,
        shieldAuraRadius: 0,
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
      arenaAffixes: [],
      teleportTimer: 0,
      mortarTimer: 0,
      shieldAuraRadius: 0,
    };
  });
  state.lastKnownPackLength = pack.length;

  // Roll arena affixes on initial pack
  let affixCount = 0;
  for (const vm of state.mobs) {
    const affixes = rollArenaAffixes(vm.isRare, state.currentWave);
    vm.arenaAffixes = affixes;
    if (affixes.includes('shielding')) vm.shieldAuraRadius = 60;
    if (affixes.includes('teleporter')) vm.teleportTimer = 3 + Math.random() * 2;
    if (affixes.includes('mortar')) vm.mortarTimer = 4 + Math.random() * 2;
    if (vm.isRare && affixes.length > 0) vm.radius = 17; // bigger rares with affixes
    if (affixes.length > 0) affixCount++;
  }
  console.log(`[arena] spawnArenaPack: ${state.mobs.length} mobs, ${affixCount} with affixes, wave ${state.currentWave}`);

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
  zoneBand: number = 1,
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
      spawnDeathHazards(state, visMob, zoneBand);
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
      spawnDeathHazards(state, visMob, zoneBand);
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

  // Burst spawn: spawn multiple mobs at once in a cluster
  state.spawnTimer = interval;
  const burstCount = isBoss ? 1 : Math.min(BURST_SPAWN_COUNT, state.pendingSpawns, densityCap - alive);
  if (burstCount <= 0) return [];

  const allPack: MobInPack[] = [];
  const now = Date.now();
  // Pick one edge position, then scatter burst around it
  const basePos = randomEdgePosition(state.width, state.height, state.camera);

  for (let b = 0; b < burstCount; b++) {
    state.pendingSpawns--;
    const pack = spawnPack(zone, hpMult, invMult, now, mobElement, mobPhysRatio, 1);
    const currentPackLen = state.lastKnownPackLength;
    // Scatter within 40px of base position for cluster feel
    const pos = {
      x: basePos.x + (Math.random() - 0.5) * 80,
      y: basePos.y + (Math.random() - 0.5) * 80,
    };
    state.mobs.push({
      mobId: state.nextMobId++,
      packIndex: currentPackLen,
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
      arenaAffixes: [],
      teleportTimer: 0,
      mortarTimer: 0,
      shieldAuraRadius: 0,
    });
    // Roll arena affixes on spawned mob
    const spawnedMob = state.mobs[state.mobs.length - 1];
    const affixes = rollArenaAffixes(spawnedMob.isRare, state.currentWave);
    spawnedMob.arenaAffixes = affixes;
    if (affixes.includes('shielding')) spawnedMob.shieldAuraRadius = 60;
    if (affixes.includes('teleporter')) spawnedMob.teleportTimer = 3 + Math.random() * 2;
    if (affixes.includes('mortar')) spawnedMob.mortarTimer = 4 + Math.random() * 2;
    if (spawnedMob.isRare && affixes.length > 0) spawnedMob.radius = 17;
    state.lastKnownPackLength = currentPackLen + 1;
    allPack.push(...pack);
  }

  return allPack;
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

// ── Dodge Roll ──

const DODGE_ROLL_COOLDOWN = 4.0;  // seconds between rolls
const DODGE_ROLL_DURATION = 0.15; // seconds of roll movement

/** Trigger a dodge roll in the current movement or facing direction. */
export function triggerDodgeRoll(state: ArenaState, keys: Set<string>): boolean {
  if (state.dodgeRollCooldown > 0 || state.dodgeRollTimer > 0) return false;

  // Roll in movement direction if moving, else facing direction
  let rdx = 0, rdy = 0;
  if (keys.has('w') || keys.has('arrowup')) rdy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) rdy += 1;
  if (keys.has('a') || keys.has('arrowleft')) rdx -= 1;
  if (keys.has('d') || keys.has('arrowright')) rdx += 1;

  if (rdx === 0 && rdy === 0) {
    rdx = state.playerFacing.x;
    rdy = state.playerFacing.y;
  }
  const len = Math.sqrt(rdx * rdx + rdy * rdy);
  if (len < 0.01) return false;

  state.dodgeRollDir = { x: rdx / len, y: rdy / len };
  state.dodgeRollTimer = DODGE_ROLL_DURATION;
  state.dodgeRollCooldown = DODGE_ROLL_COOLDOWN;
  state.iFrameTimer = DODGE_ROLL_DURATION + 0.05;
  triggerShake(state, 2);
  return true;
}

// ── Shrines ──

import type { ShrineType } from './arenaTypes';

const SHRINE_TYPES: ShrineType[] = ['damage', 'speed', 'magnet', 'bomb'];
const SHRINE_SPAWN_KILLS = 12; // kills between shrine spawns

/** Spawn a shrine at a random position near the player. */
export function spawnShrine(state: ArenaState): void {
  const angle = Math.random() * Math.PI * 2;
  const dist = 100 + Math.random() * 150;
  const x = Math.max(30, Math.min(state.worldWidth - 30, state.player.x + Math.cos(angle) * dist));
  const y = Math.max(30, Math.min(state.worldHeight - 30, state.player.y + Math.sin(angle) * dist));
  const type = SHRINE_TYPES[Math.floor(Math.random() * SHRINE_TYPES.length)];
  state.shrines.push({
    id: state.nextShrineId++,
    x, y, type,
    age: 0,
    collected: false,
  });
  // Floater + log so the player knows a shrine spawned
  state.floaters.push({
    x, y: y - 20,
    text: `${type.toUpperCase()} SHRINE`,
    color: type === 'damage' ? '#ef4444' : type === 'speed' ? '#60a5fa' : type === 'magnet' ? '#c084fc' : '#f97316',
    age: 0, maxAge: 2.0, isCrit: false, vy: -30,
  });
  console.log(`[arena] Shrine spawned: ${type} at (${Math.round(x)}, ${Math.round(y)}), totalKillsForShrines was ${state.totalKillsForShrines}`);
}

/** Apply a shrine effect. */
function applyShrineEffect(state: ArenaState, type: ShrineType): void {
  switch (type) {
    case 'damage':
      // Remove existing damage buff, add fresh
      state.activeShrineEffects = state.activeShrineEffects.filter(e => e.type !== 'damage');
      state.activeShrineEffects.push({ type: 'damage', remainingTime: 10 });
      triggerShake(state, 3);
      break;
    case 'speed':
      state.activeShrineEffects = state.activeShrineEffects.filter(e => e.type !== 'speed');
      state.activeShrineEffects.push({ type: 'speed', remainingTime: 8 });
      triggerShake(state, 2);
      break;
    case 'magnet':
      // Vacuum all ground items + gems toward player
      for (const gi of state.groundItems) {
        if (!gi.collected) { gi.autoPickup = true; }
      }
      for (const gem of state.gems) {
        if (!gem.collected) {
          gem.x = state.player.x + (Math.random() - 0.5) * 30;
          gem.y = state.player.y + (Math.random() - 0.5) * 30;
        }
      }
      triggerShake(state, 4);
      break;
    case 'bomb':
      // Kill all on-screen mobs (within viewport)
      for (const mob of state.mobs) {
        if (mob.dead) continue;
        const dx = mob.x - state.camera.x - state.width / 2;
        const dy = mob.y - state.camera.y - state.height / 2;
        if (Math.abs(dx) < state.width / 2 + 50 && Math.abs(dy) < state.height / 2 + 50) {
          mob.hp = 0;
          mob.dead = true;
          mob.deathTimer = 0;
          addKillFloater(state, mob);
          spawnDeathParticles(state, mob);
          spawnGems(state, mob, 2 + Math.floor(Math.random() * 3));
          state.pendingSpawns++;
        }
      }
      triggerShake(state, 8);
      break;
  }
}

/** Check if it's time to spawn a shrine based on kills. */
export function checkShrineSpawn(state: ArenaState, kills: number): void {
  state.totalKillsForShrines += kills;
  if (state.totalKillsForShrines >= SHRINE_SPAWN_KILLS) {
    state.totalKillsForShrines -= SHRINE_SPAWN_KILLS;
    spawnShrine(state);
  }
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

/** Tick melee mob attacks — mobs within melee range attack on their own timer.
 *  Same damage/dodge/block formula as ranged projectiles.
 *  Called per-frame alongside tickRangedProjectiles. */
export function tickMeleeAttacks(
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

  for (const mob of state.mobs) {
    if (mob.dead || mob.behavior === 'ranged') continue;

    mob.attackTimer -= dt;
    if (mob.attackTimer > 0) continue;
    if (!mobCanAttackPlayer(state, mob)) {
      // Not in range — don't reset timer, let it stay at 0 so attack fires immediately on contact
      mob.attackTimer = 0;
      continue;
    }

    // Attack — reset timer with variance
    mob.attackTimer = SPATIAL_ATTACK_INTERVAL * (0.8 + Math.random() * 0.4);

    // Fast mobs hit lighter but more often
    const dmgMult = mob.behavior === 'fast' ? 0.6 : 1.0;
    const variance = 0.8 + Math.random() * 0.4;
    const rawDmg = (SPATIAL_DMG_BASE * zoneBand + SPATIAL_DMG_ILVL_SCALE * zoneILvlMin) * levelMult * variance * dmgMult;

    const roll = rollZoneAttack(rawDmg, 0.7, zoneAccuracy, playerStats, undefined, undefined, zoneBand);
    hits.push({
      damage: Math.round(roll.damage),
      isDodged: roll.isDodged,
      isBlocked: roll.isBlocked,
    });
  }

  return hits;
}

// ── Update ──

export function updateArena(
  state: ArenaState,
  dt: number,
  keys: Set<string>,
): void {
  // ── Hit-stop: freeze all simulation briefly for impact ──
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    return; // freeze everything — no movement, no ticks
  }

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
  }

  // ── Mouse-aim: skills fire toward cursor, not movement direction ──
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

  // Speed shrine buff
  const hasSpeedBuff = state.activeShrineEffects.some(e => e.type === 'speed');
  const shrineSpeedMult = hasSpeedBuff ? 1.5 : 1;

  // ── Dodge roll ──
  if (state.dodgeRollCooldown > 0) state.dodgeRollCooldown -= dt;
  if (state.dodgeRollTimer > 0) {
    // During roll: fast movement in roll direction, i-frames
    const DODGE_SPEED = PLAYER_SPEED * 4;
    state.player.x += state.dodgeRollDir.x * DODGE_SPEED * dt;
    state.player.y += state.dodgeRollDir.y * DODGE_SPEED * dt;
    state.dodgeRollTimer -= dt;
    state.iFrameTimer = 0.1; // maintain i-frames during roll
    state.playerMoving = true;
  } else {
    state.player.x += dx * PLAYER_SPEED * speedMult * shrineSpeedMult * dt;
    state.player.y += dy * PLAYER_SPEED * speedMult * shrineSpeedMult * dt;
  }
  state.playerMoving = dx !== 0 || dy !== 0 || state.dodgeRollTimer > 0;

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

  // ── Boss movement ──
  if (state.bossMob && !state.bossMob.dead) {
    const boss = state.bossMob;
    // Entrance walk-in: slide toward player from above
    if (boss.entranceTimer > 0) {
      boss.entranceTimer -= dt;
      const tgt = { x: state.player.x, y: state.player.y - 80 };
      const edx = tgt.x - boss.x;
      const edy = tgt.y - boss.y;
      const eDist = Math.sqrt(edx * edx + edy * edy);
      if (eDist > 5) {
        const eSpeed = 120; // entrance speed
        boss.x += (edx / eDist) * eSpeed * dt;
        boss.y += (edy / eDist) * eSpeed * dt;
      }
    } else {
      // Track player at 45% player speed, prefer ~60px distance
      const BOSS_SPEED = PLAYER_SPEED * 0.45;
      const PREFERRED_DIST = 60;
      const bdx = state.player.x - boss.x;
      const bdy = state.player.y - boss.y;
      const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bDist > PREFERRED_DIST + 10) {
        const spd = BOSS_SPEED * Math.min(1, (bDist - PREFERRED_DIST) / 80);
        boss.vx = (bdx / bDist) * spd;
        boss.vy = (bdy / bDist) * spd;
      } else if (bDist < PREFERRED_DIST - 10) {
        // Too close — back away slightly
        boss.vx = -(bdx / bDist) * BOSS_SPEED * 0.3;
        boss.vy = -(bdy / bDist) * BOSS_SPEED * 0.3;
      } else {
        boss.vx *= 0.9;
        boss.vy *= 0.9;
      }
      boss.x += boss.vx * dt;
      boss.y += boss.vy * dt;
    }
    // Knockback decay
    if (boss.knockbackVx !== 0 || boss.knockbackVy !== 0) {
      boss.x += boss.knockbackVx * dt;
      boss.y += boss.knockbackVy * dt;
      boss.knockbackVx *= Math.max(0, 1 - 6 * dt);
      boss.knockbackVy *= Math.max(0, 1 - 6 * dt);
      if (Math.abs(boss.knockbackVx) < 1) boss.knockbackVx = 0;
      if (Math.abs(boss.knockbackVy) < 1) boss.knockbackVy = 0;
    }
    // Clamp to world
    boss.x = Math.max(boss.radius, Math.min(state.worldWidth - boss.radius, boss.x));
    boss.y = Math.max(boss.radius, Math.min(state.worldHeight - boss.radius, boss.y));
    // Death timer
    if (boss.dead) {
      boss.deathTimer += dt;
    }
  }

  // ── Splashes ──
  for (const s of state.splashes) s.age += dt;
  state.splashes = state.splashes.filter(s => s.age < s.maxAge);

  // ── Gems ──
  updateGems(state, dt);

  // ── Ground Items (Phase 7) ──
  updateGroundItems(state, dt);

  // ── Shrines ──
  for (const shrine of state.shrines) {
    shrine.age += dt;
    if (shrine.collected) continue;
    // Proximity pickup
    const sdx = state.player.x - shrine.x;
    const sdy = state.player.y - shrine.y;
    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
    if (sDist < state.playerRadius + 20) {
      shrine.collected = true;
      applyShrineEffect(state, shrine.type);
    }
  }
  state.shrines = state.shrines.filter(s => !s.collected && s.age < 30);

  // Decay shrine effects
  for (const eff of state.activeShrineEffects) {
    eff.remainingTime -= dt;
  }
  state.activeShrineEffects = state.activeShrineEffects.filter(e => e.remainingTime > 0);

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

  // ── Ground Hazards (fire/poison pools) ──
  for (const h of state.hazards) h.age += dt;
  state.hazards = state.hazards.filter(h => h.age < h.maxAge);
  // Cap at 30 hazards
  if (state.hazards.length > 30) {
    state.hazards = state.hazards.slice(-30);
  }

  // ── Teleporter Affix: blink to near player ──
  for (const mob of state.mobs) {
    if (mob.dead || !mob.arenaAffixes.includes('teleporter')) continue;
    mob.teleportTimer -= dt;
    if (mob.teleportTimer <= 0) {
      mob.teleportTimer = 3 + Math.random() * 2;
      // Blink to random position within 80px of player
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 40;
      mob.x = Math.max(mob.radius, Math.min(state.worldWidth - mob.radius,
        state.player.x + Math.cos(angle) * dist));
      mob.y = Math.max(mob.radius, Math.min(state.worldHeight - mob.radius,
        state.player.y + Math.sin(angle) * dist));
      mob.vx = 0;
      mob.vy = 0;
      // Purple teleport particles
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

  // ── Mortar Affix: fire slow AoE projectile → fire hazard on impact ──
  for (const mob of state.mobs) {
    if (mob.dead || !mob.arenaAffixes.includes('mortar')) continue;
    mob.mortarTimer -= dt;
    if (mob.mortarTimer <= 0) {
      mob.mortarTimer = 4 + Math.random() * 2;
      const dx = state.player.x - mob.x;
      const dy = state.player.y - mob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1 && dist < 500) {
        const MORTAR_SPEED = 100;
        state.projectiles.push({
          id: state.nextProjectileId++,
          x: mob.x, y: mob.y,
          vx: (dx / dist) * MORTAR_SPEED,
          vy: (dy / dist) * MORTAR_SPEED,
          radius: 8,
          color: '#fb923c',
          age: 0, maxAge: 3.0,
          damage: 0, // mortar doesn't deal direct damage — spawns hazard
          sourceMobId: mob.mobId,
          hit: false,
          isMortar: true,
        });
      }
    }
  }

  // ── Mortar impact → spawn fire hazard ──
  for (const proj of state.projectiles) {
    if (proj.hit || !proj.isMortar) continue;
    // Check if mortar reached player vicinity (within 20px) or expired
    const pdx = state.player.x - proj.x;
    const pdy = state.player.y - proj.y;
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
    if (pDist < 25 || proj.age >= proj.maxAge - 0.05) {
      proj.hit = true;
      // Spawn fire hazard at impact point
      state.hazards.push({
        id: state.nextHazardId++,
        x: proj.x, y: proj.y,
        radius: 40,
        type: 'fire',
        age: 0, maxAge: 3,
        damagePerSec: 8,
        lastDamageTick: 0,
      });
      // Impact particles
      for (let i = 0; i < 5; i++) {
        const pa = Math.random() * Math.PI * 2;
        state.particles.push({
          x: proj.x, y: proj.y,
          vx: Math.cos(pa) * 40, vy: Math.sin(pa) * 40,
          size: 2 + Math.random() * 2,
          color: '#f97316',
          age: 0, maxAge: 0.3,
        });
      }
    }
  }

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

// ============================================================
// Spatial Targeting — per-skill targeting strategies for arena combat.
// Replaces buildCombatSlice with skill-aware spatial selection.
// Pure functions, no side effects, no engine modifications.
// ============================================================

import type { ArenaState, ArenaMob, Vec2 } from './arenaEngine';
import type { MobInPack } from '../../types/combat';
import type { SkillDef } from '../../types/skills';
import { PLAYER_ATTACK_RANGE, SPLASH_RADIUS_AOE } from './arenaEngine';

// ── Constants ──

const CHAIN_RANGE = 120;             // px — max distance between chain targets
const FAN_CONE_HALF_ANGLE = Math.PI / 4; // 45° half = 90° total cone
const FAN_RANGE = 160;               // px — fan/cone projectile reach
const TRAP_OFFSET = 40;              // px — trap placed in front of player
const MOVEMENT_RANGE = 200;          // px — extended range for movement skills

// ── Result Type ──

export interface SpatialSliceResult {
  slice: MobInPack[];           // ordered mobs for engine
  slicePackIndices: number[];   // maps slice[i] → fullPack index
  targetMobs: ArenaMob[];       // visual targets for skill visuals
  strategyUsed: string;         // for combat log / debugging
}

// ── Helpers ──

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function livingMobsByDistance(state: ArenaState, from: Vec2): ArenaMob[] {
  return state.mobs
    .filter(m => !m.dead)
    .map(m => ({ mob: m, d: dist(from, m) }))
    .sort((a, b) => a.d - b.d)
    .map(e => e.mob);
}

/** Build a SpatialSliceResult from a list of selected ArenaMobs. */
function buildResult(
  fullPack: ReadonlyArray<MobInPack>,
  selected: ArenaMob[],
  strategy: string,
): SpatialSliceResult {
  const slice: MobInPack[] = [];
  const slicePackIndices: number[] = [];
  const targetMobs: ArenaMob[] = [];

  for (const mob of selected) {
    if (mob.packIndex >= 0 && mob.packIndex < fullPack.length) {
      slice.push(fullPack[mob.packIndex]);
      slicePackIndices.push(mob.packIndex);
      targetMobs.push(mob);
    }
  }

  return { slice, slicePackIndices, targetMobs, strategyUsed: strategy };
}

// ── Strategy 1: Trap — AoE at placement point ──

function resolveTrap(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
): SpatialSliceResult {
  const trapPos: Vec2 = {
    x: state.player.x + state.playerFacing.x * TRAP_OFFSET,
    y: state.player.y + state.playerFacing.y * TRAP_OFFSET,
  };
  const inRadius = livingMobsByDistance(state, trapPos)
    .filter(m => dist(trapPos, m) <= SPLASH_RADIUS_AOE);
  return buildResult(fullPack, inRadius, 'trap');
}

// ── Strategy 2: Movement — closest mob within extended range ──

function resolveMovement(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
): SpatialSliceResult {
  const sorted = livingMobsByDistance(state, state.player);
  const target = sorted.find(m => dist(state.player, m) <= MOVEMENT_RANGE);
  return buildResult(fullPack, target ? [target] : [], 'movement');
}

// ── Strategy 3: Chain — BFS closest then nearest unchained ──

function resolveChain(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
  chainCount: number,
): SpatialSliceResult {
  const sorted = livingMobsByDistance(state, state.player);
  const primary = sorted.find(m => dist(state.player, m) <= PLAYER_ATTACK_RANGE);
  if (!primary) return buildResult(fullPack, [], 'chain');

  const chain: ArenaMob[] = [primary];
  const used = new Set<number>([primary.mobId]);
  let current: ArenaMob = primary;

  for (let i = 0; i < chainCount; i++) {
    let bestDist = Infinity;
    let bestMob: ArenaMob | null = null;
    for (const m of state.mobs) {
      if (m.dead || used.has(m.mobId)) continue;
      const d = dist(current, m);
      if (d <= CHAIN_RANGE && d < bestDist) {
        bestDist = d;
        bestMob = m;
      }
    }
    if (!bestMob) break;
    chain.push(bestMob);
    used.add(bestMob.mobId);
    current = bestMob;
  }

  return buildResult(fullPack, chain, 'chain');
}

// ── Strategy 4: Fan Projectile — 90° cone in facing direction ──

function resolveFanProjectile(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
): SpatialSliceResult {
  const facingAngle = Math.atan2(state.playerFacing.y, state.playerFacing.x);
  const inCone: ArenaMob[] = [];

  for (const m of state.mobs) {
    if (m.dead) continue;
    const d = dist(state.player, m);
    if (d > FAN_RANGE) continue;
    const angleToMob = Math.atan2(m.y - state.player.y, m.x - state.player.x);
    let angleDiff = angleToMob - facingAngle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    if (Math.abs(angleDiff) <= FAN_CONE_HALF_ANGLE) {
      inCone.push(m);
    }
  }

  inCone.sort((a, b) => dist(state.player, a) - dist(state.player, b));
  return buildResult(fullPack, inCone, 'fan');
}

// ── Strategy 5: AoE — all within splash radius ──

function resolveAoE(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
): SpatialSliceResult {
  const inRadius = livingMobsByDistance(state, state.player)
    .filter(m => dist(state.player, m) <= SPLASH_RADIUS_AOE);
  return buildResult(fullPack, inRadius, 'aoe');
}

// ── Strategy 6: Sequential — N closest (multi-hit skills) ──

function resolveSequential(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
  hitCount: number,
): SpatialSliceResult {
  const sorted = livingMobsByDistance(state, state.player)
    .filter(m => dist(state.player, m) <= PLAYER_ATTACK_RANGE);
  const selected = sorted.slice(0, hitCount);
  return buildResult(fullPack, selected, 'sequential');
}

// ── Strategy 7: Single target — closest within attack range ──

function resolveSingleTarget(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
): SpatialSliceResult {
  const sorted = livingMobsByDistance(state, state.player);
  const target = sorted.find(m => dist(state.player, m) <= PLAYER_ATTACK_RANGE);
  return buildResult(fullPack, target ? [target] : [], 'single');
}

// ── Entry Point ──

/** Build a spatial combat slice: select and order mobs based on the predicted skill.
 *  Replaces buildCombatSlice with skill-aware spatial targeting.
 *  Each strategy is checked in priority order by skill tags. */
export function buildSpatialSlice(
  state: ArenaState,
  fullPack: ReadonlyArray<MobInPack>,
  skill: SkillDef | null,
  graphMod?: { extraHits?: number; chainCount?: number; convertToAoE?: boolean } | null,
): SpatialSliceResult {
  if (!skill) {
    return resolveSingleTarget(state, fullPack);
  }

  const tags = skill.tags;

  // Priority 1: Trap
  if (tags.includes('Trap')) {
    return resolveTrap(state, fullPack);
  }

  // Priority 2: Movement
  if (tags.includes('Movement')) {
    return resolveMovement(state, fullPack);
  }

  // Priority 3: Chain
  const chainCount = (graphMod?.chainCount ?? 0) + (skill.chainCount ?? 0);
  if (tags.includes('Chain') && chainCount > 0) {
    return resolveChain(state, fullPack, chainCount);
  }

  // Priority 4: Projectile + AoE (fan/cone)
  if (tags.includes('Projectile') && (tags.includes('AoE') || graphMod?.convertToAoE)) {
    return resolveFanProjectile(state, fullPack);
  }

  // Priority 5: Multi-hit (hitCount > 1) — sequential targeting beats pure AoE
  // e.g. Blade Dance (3 hits) picks 3 closest, not all mobs in radius
  const totalHits = (skill.hitCount ?? 1) + (graphMod?.extraHits ?? 0);
  if (totalHits > 1) {
    return resolveSequential(state, fullPack, totalHits);
  }

  // Priority 6: AoE (no hitCount) — true area damage
  if (tags.includes('AoE') || graphMod?.convertToAoE) {
    return resolveAoE(state, fullPack);
  }

  // Priority 7: Fallback single target
  return resolveSingleTarget(state, fullPack);
}

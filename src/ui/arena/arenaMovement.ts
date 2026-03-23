// ============================================================
// Arena Movement — Player + mob movement logic
// ============================================================

import type { ArenaState, ArenaMob } from './arenaTypes';

// ── Movement Constants ──

export const PLAYER_SPEED = 180;      // px/sec (also needed by arenaEngine for projectile lead calc)
const MOB_SPEED = 55;           // px/sec
const MOB_SEPARATION = 32;      // min distance between mobs (soft repulsion)
const MOB_HARD_SEPARATION = 20; // hard collision distance (mobs can't overlap)

// ── Mob Movement ──

export function moveMobsTowardPlayer(state: ArenaState, mobs: ArenaMob[], dt: number, speed: number = MOB_SPEED): void {
  for (const mob of mobs) {
    if (mob.dead) {
      mob.deathTimer += dt;
      continue;
    }

    const toPlayerX = state.player.x - mob.x;
    const toPlayerY = state.player.y - mob.y;
    const dist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);

    // Behavior-based speed and stop distance
    let s = speed;
    let stopDist = mob.radius + state.playerRadius + 2;
    if (mob.behavior === 'fast') {
      s = speed * 2.0; // 2x speed — very noticeable rush
    } else if (mob.behavior === 'ranged') {
      s = speed * 0.7;
      stopDist = 160; // stay far away — well outside melee
    }
    if (mob.isRare) s *= 0.7;

    // Ranged: strafe at distance, retreat if too close
    if (mob.behavior === 'ranged') {
      const perpX = -toPlayerY / (dist || 1);
      const perpY = toPlayerX / (dist || 1);
      const strafeDir = ((mob.mobId % 2) === 0) ? 1 : -1;

      if (dist < stopDist * 0.6) {
        // Too close — run away from player
        const fleeX = -(toPlayerX / dist) * s * 1.2;
        const fleeY = -(toPlayerY / dist) * s * 1.2;
        mob.vx += (fleeX - mob.vx) * 4 * dt;
        mob.vy += (fleeY - mob.vy) * 4 * dt;
      } else if (dist < stopDist) {
        // At range — orbit/strafe
        const moveX = perpX * s * 0.8 * strafeDir;
        const moveY = perpY * s * 0.8 * strafeDir;
        mob.vx += (moveX - mob.vx) * 4 * dt;
        mob.vy += (moveY - mob.vy) * 4 * dt;
      } else {
        // Too far — approach but slowly
        const moveX = (toPlayerX / dist) * s * 0.5;
        const moveY = (toPlayerY / dist) * s * 0.5;
        mob.vx += (moveX - mob.vx) * 4 * dt;
        mob.vy += (moveY - mob.vy) * 4 * dt;
      }

      // Apply separation for ranged too
      for (const other of mobs) {
        if (other === mob || other.dead) continue;
        const sepX = mob.x - other.x;
        const sepY = mob.y - other.y;
        const sepDist = Math.sqrt(sepX * sepX + sepY * sepY);
        if (sepDist < MOB_SEPARATION && sepDist > 0.1) {
          const pushForce = (MOB_SEPARATION - sepDist) / MOB_SEPARATION * 60;
          mob.vx += (sepX / sepDist) * pushForce * dt;
          mob.vy += (sepY / sepDist) * pushForce * dt;
        }
      }

      mob.x += mob.vx * dt;
      mob.y += mob.vy * dt;
      continue; // skip the normal movement below
    }

    if (dist > stopDist) {
      let moveX = (toPlayerX / dist) * s;
      let moveY = (toPlayerY / dist) * s;

      // Mob-to-mob separation (stronger, with hard collision)
      for (const other of mobs) {
        if (other === mob || other.dead) continue;
        const sepX = mob.x - other.x;
        const sepY = mob.y - other.y;
        const sepDist = Math.sqrt(sepX * sepX + sepY * sepY);
        if (sepDist < MOB_SEPARATION && sepDist > 0.1) {
          // Soft push scales with overlap
          const pushForce = (MOB_SEPARATION - sepDist) / MOB_SEPARATION * 60;
          moveX += (sepX / sepDist) * pushForce;
          moveY += (sepY / sepDist) * pushForce;
        }
        // Hard collision — snap apart if overlapping
        if (sepDist < MOB_HARD_SEPARATION && sepDist > 0.01) {
          const overlap = MOB_HARD_SEPARATION - sepDist;
          mob.x += (sepX / sepDist) * overlap * 0.5;
          mob.y += (sepY / sepDist) * overlap * 0.5;
        }
      }

      mob.vx += (moveX - mob.vx) * 4 * dt;
      mob.vy += (moveY - mob.vy) * 4 * dt;
      mob.x += mob.vx * dt;
      mob.y += mob.vy * dt;
    }
  }
}

// ── Player Dash ──

/** Dash the player forward in facing direction. Clamps to world bounds. */
export function dashPlayerForward(state: ArenaState, distance: number = 100): void {
  state.player.x += state.playerFacing.x * distance;
  state.player.y += state.playerFacing.y * distance;
  state.player.x = Math.max(state.playerRadius, Math.min(state.worldWidth - state.playerRadius, state.player.x));
  state.player.y = Math.max(state.playerRadius, Math.min(state.worldHeight - state.playerRadius, state.player.y));
}

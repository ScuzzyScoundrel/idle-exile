// ============================================================
// Arena Traps — Trap placement, detonation, proximity checks
// ============================================================

import type { ArenaState, ArenaMob, ArenaTrap } from './arenaTypes';
import { SPLASH_RADIUS_AOE } from './arenaTypes';
import { spawnDeathParticles, logCombat } from './arenaCombatFeedback';

// ── Trap Constants ──

const TRAP_ARM_TIME = 1.5;
export const TRAP_TRIGGER_RADIUS = 30;    // mobs within this distance trigger detonation
export const TRAP_AOE_RADIUS = 100;       // damage radius on detonation

// ── Trap Functions ──

/** Place a persistent spinning trap at a world position. */
export function placeArenaTrap(state: ArenaState, x: number, y: number): void {
  state.traps.push({
    id: state.nextTrapId++,
    x, y,
    armTimer: TRAP_ARM_TIME,
    armed: false,
    age: 0,
    detonated: false,
    detonateTimer: 0,
    rotation: 0,
  });
}

/** Detonate the oldest armed trap (visual only — engine handles damage). */
export function detonateOldestArenaTrap(state: ArenaState): void {
  const trap = state.traps.find(t => t.armed && !t.detonated);
  if (!trap) return;
  trap.detonated = true;
  trap.detonateTimer = 0;
  // AoE explosion splash
  state.splashes.push({
    x: trap.x, y: trap.y,
    maxRadius: SPLASH_RADIUS_AOE,
    age: 0, maxAge: 0.4,
    color: 'rgb(249, 115, 22)',
  });
  spawnDeathParticles(state, { x: trap.x, y: trap.y } as ArenaMob, '#f97316');
}

/** Check armed traps for mob proximity. Detonates on contact, returns trap positions + nearby mob packIndices. */
export function checkTrapProximityDetonations(state: ArenaState): Array<{ trap: ArenaTrap; hitMobs: ArenaMob[] }> {
  const results: Array<{ trap: ArenaTrap; hitMobs: ArenaMob[] }> = [];
  for (const trap of state.traps) {
    if (!trap.armed || trap.detonated) continue;
    // Check trigger: any mob touching the trap?
    let triggered = false;
    for (const mob of state.mobs) {
      if (mob.dead) continue;
      const dx = mob.x - trap.x;
      const dy = mob.y - trap.y;
      if (Math.sqrt(dx * dx + dy * dy) <= TRAP_TRIGGER_RADIUS + mob.radius) {
        triggered = true;
        break;
      }
    }
    if (!triggered) continue;

    // Detonate — collect all mobs in AoE radius
    trap.detonated = true;
    trap.detonateTimer = 0;
    state.splashes.push({
      x: trap.x, y: trap.y,
      maxRadius: SPLASH_RADIUS_AOE,
      age: 0, maxAge: 0.4,
      color: 'rgb(249, 115, 22)',
    });
    spawnDeathParticles(state, { x: trap.x, y: trap.y } as ArenaMob, '#f97316');

    const hitMobs: ArenaMob[] = [];
    for (const mob of state.mobs) {
      if (mob.dead) continue;
      const dx = mob.x - trap.x;
      const dy = mob.y - trap.y;
      if (Math.sqrt(dx * dx + dy * dy) <= TRAP_AOE_RADIUS) {
        hitMobs.push(mob);
      }
    }
    results.push({ trap, hitMobs });
    logCombat(state, `Trap detonation → ${hitMobs.length} hit`, '#f97316');
  }
  return results;
}

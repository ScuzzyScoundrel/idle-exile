// ============================================================
// Arena Combat Feedback — Visual effects, floaters, particles,
// skill visuals, screen shake, gems, knockback
// ============================================================

import type { ArenaState, ArenaMob, Vec2, SkillVisualType } from './arenaTypes';
import { FLOATER_MAX_AGE } from './arenaTypes';
import { ARENA_AFFIX_DEFS } from './arenaAffixes';

// ── Combat Log ──

const COMBAT_LOG_MAX = 50;

/** Add a timestamped entry to the combat log. */
export function logCombat(state: ArenaState, text: string, color: string = '#d4d4d8'): void {
  const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const ts = `${mins}:${secs.toString().padStart(2, '0')}`;
  state.combatLog.push({ time: elapsed, text: `[${ts}] ${text}`, color });
  if (state.combatLog.length > COMBAT_LOG_MAX) {
    state.combatLog = state.combatLog.slice(-COMBAT_LOG_MAX);
  }
}

// ── Screen Shake ──

export function triggerShake(state: ArenaState, intensity: number): void {
  state.shakeIntensity = Math.max(state.shakeIntensity, intensity);
  state.shakeTimer = 0.15;
}

// ── I-Frames ──

/** Trigger i-frames (player invincibility after taking damage). */
export function triggerIFrames(state: ArenaState): void {
  state.iFrameTimer = 0.3;
}

// ── Knockback ──

export const KNOCKBACK_FORCE = 30;

/** Push a mob away from the player on hit. */
export function applyKnockback(state: ArenaState, mob: ArenaMob): void {
  const dx = mob.x - state.player.x;
  const dy = mob.y - state.player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  mob.knockbackVx = (dx / dist) * KNOCKBACK_FORCE * 8;
  mob.knockbackVy = (dy / dist) * KNOCKBACK_FORCE * 8;
}

// ── Hit Flash ──

/** Mark a mob as hit (for white flash). */
export function markMobHit(state: ArenaState, mob: ArenaMob): void {
  mob.lastHitTime = state.totalTime;
}

// ── Death Particles ──

/** Spawn 5-8 particles on mob death, colored by mob color. */
export function spawnDeathParticles(state: ArenaState, mob: ArenaMob, color?: string): void {
  const count = 5 + Math.floor(Math.random() * 4);
  const c = color || mob.color;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    state.particles.push({
      x: mob.x,
      y: mob.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color: c,
      age: 0,
      maxAge: 0.4 + Math.random() * 0.3,
    });
  }
}

// ── XP Gems ──

const GEM_PICKUP_RADIUS = 70;      // gems drift toward player within this range
const GEM_DRIFT_SPEED = 300;        // px/sec when being collected
export const GEM_COLLECT_ANIM = 0.2;       // seconds for collect flash (also used by rendering)

const GEM_COLORS = ['#818cf8', '#a78bfa', '#c084fc'];  // purple/indigo shades
const GOLD_GEM_COLOR = '#fbbf24';

export function spawnGems(state: ArenaState, pos: Vec2, count: number, isGold: boolean = false): void {
  for (let i = 0; i < count; i++) {
    state.gems.push({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y + (Math.random() - 0.5) * 20,
      color: isGold ? GOLD_GEM_COLOR : GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)],
      size: isGold ? 4 : 3 + Math.random() * 2,
      age: 0,
      collected: false,
      collectTimer: 0,
    });
  }
}

export function updateGems(state: ArenaState, dt: number): void {
  for (const gem of state.gems) {
    gem.age += dt;

    if (gem.collected) {
      gem.collectTimer += dt;
      continue;
    }

    // Check pickup proximity
    const dx = state.player.x - gem.x;
    const dy = state.player.y - gem.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < GEM_PICKUP_RADIUS) {
      // Drift toward player
      const speed = GEM_DRIFT_SPEED * (1 - dist / GEM_PICKUP_RADIUS + 0.3);
      gem.x += (dx / dist) * speed * dt;
      gem.y += (dy / dist) * speed * dt;

      // Collected when close enough
      if (dist < state.playerRadius + 5) {
        gem.collected = true;
        gem.collectTimer = 0;
      }
    }
  }

  // Remove finished collect animations
  state.gems = state.gems.filter(g => !g.collected || g.collectTimer < GEM_COLLECT_ANIM);
}

// ── Skill Cast Tracking ──

export function markSkillCast(state: ArenaState, skillId: string): void {
  state.lastCastSkillId = skillId;
  state.lastCastTimer = 0.4;
}

// ── Skill Visuals ──

/** Determine skill visual type from skill tags. */
function skillTagsToVisualType(tags: string[]): SkillVisualType {
  if (tags.includes('Trap')) return 'trap';
  if (tags.includes('Movement')) return 'dash';
  if (tags.includes('Chain')) return 'chain';
  if (tags.includes('Projectile') && tags.includes('AoE')) return 'fan';
  if (tags.includes('Projectile')) return 'projectile';
  if (tags.includes('AoE')) return 'ring';
  if (tags.includes('Melee')) return 'cone';
  return 'slash';
}

/** Determine visual color from skill tags. */
function skillTagsToColor(tags: string[]): string {
  if (tags.includes('Fire')) return '#f97316';
  if (tags.includes('Cold')) return '#22d3ee';
  if (tags.includes('Lightning')) return '#facc15';
  if (tags.includes('Chaos')) return '#4ade80';
  return 'rgba(200, 200, 220, 0.8)'; // physical
}

/** Spawn a skill visual effect. Call when a skill fires. */
export function spawnSkillVisual(
  state: ArenaState,
  tags: string[],
  target?: ArenaMob | null,
  chainTargets?: ArenaMob[],
): void {
  const type = skillTagsToVisualType(tags);
  const color = skillTagsToColor(tags);

  switch (type) {
    case 'slash': {
      const angle = Math.atan2(state.playerFacing.y, state.playerFacing.x);
      state.skillVisuals.push({
        type: 'slash',
        x: state.player.x + state.playerFacing.x * 25,
        y: state.player.y + state.playerFacing.y * 25,
        angle,
        color,
        age: 0,
        maxAge: 0.2,
      });
      break;
    }
    case 'cone': {
      // Directed cone — 45° half-angle, 50px reach, snappy 0.12s
      const angle = target
        ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
        : Math.atan2(state.playerFacing.y, state.playerFacing.x);
      state.skillVisuals.push({
        type: 'cone',
        x: state.player.x,
        y: state.player.y,
        angle,
        halfAngle: Math.PI / 4,   // 45° half = 90° total
        length: 50,
        color,
        age: 0,
        maxAge: 0.12,
      });
      break;
    }
    case 'fan': {
      // 5 projectiles in 90° spread
      const baseAngle = target
        ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
        : Math.atan2(state.playerFacing.y, state.playerFacing.x);
      const spread = Math.PI / 2; // 90°
      const count = 5;
      const fanDirs: Array<{ dx: number; dy: number }> = [];
      for (let i = 0; i < count; i++) {
        const a = baseAngle - spread / 2 + (spread / (count - 1)) * i;
        fanDirs.push({ dx: Math.cos(a), dy: Math.sin(a) });
      }
      state.skillVisuals.push({
        type: 'fan',
        x: state.player.x,
        y: state.player.y,
        dx: Math.cos(baseAngle),
        dy: Math.sin(baseAngle),
        fanDirs,
        color,
        age: 0,
        maxAge: 0.3,
      });
      break;
    }
    case 'dash': {
      // Afterimage trail — aim at target mob if available, else facing direction
      const dashEndX = target ? target.x : state.player.x + state.playerFacing.x * 80;
      const dashEndY = target ? target.y : state.player.y + state.playerFacing.y * 80;
      state.skillVisuals.push({
        type: 'dash',
        x: dashEndX,
        y: dashEndY,
        startX: state.player.x,
        startY: state.player.y,
        color,
        age: 0,
        maxAge: 0.3,
      });
      break;
    }
    case 'projectile': {
      state.skillVisuals.push({
        type: 'projectile',
        x: state.player.x,
        y: state.player.y,
        dx: state.playerFacing.x,
        dy: state.playerFacing.y,
        dist: 0,
        color,
        age: 0,
        maxAge: 0.35,
      });
      break;
    }
    case 'ring': {
      state.skillVisuals.push({
        type: 'ring',
        x: state.player.x,
        y: state.player.y,
        color,
        age: 0,
        maxAge: 0.35,
      });
      break;
    }
    case 'chain': {
      const targets: Vec2[] = [];
      if (target) targets.push({ x: target.x, y: target.y });
      if (chainTargets) {
        for (const ct of chainTargets) targets.push({ x: ct.x, y: ct.y });
      }
      state.skillVisuals.push({
        type: 'chain',
        x: state.player.x,
        y: state.player.y,
        targets,
        color,
        age: 0,
        maxAge: 0.3,
      });
      break;
    }
    case 'trap': {
      // Place trap at player position
      state.skillVisuals.push({
        type: 'trap',
        x: state.player.x,
        y: state.player.y,
        color,
        age: 0,
        maxAge: 1.5, // longer — trap lingers
      });
      break;
    }
  }
}

// ── Kill Streak / Frenzy ──

export const FRENZY_KILL_THRESHOLD = 50;
export const FRENZY_DURATION = 5;

/** Track kills for frenzy mode — call with kill count each tick. */
export function trackKillStreak(state: ArenaState, kills: number): void {
  if (kills > 0) {
    state.killStreakCount += kills;
    if (state.killStreakCount >= FRENZY_KILL_THRESHOLD && state.frenzyTimer <= 0) {
      state.frenzyTimer = FRENZY_DURATION; // 5 seconds of frenzy
      state.killStreakCount = 0;
      triggerShake(state, 5);
    }
  }
}

/** Track multi-kill within a tick window. */
export function trackMultiKill(state: ArenaState, kills: number): void {
  if (kills >= 2) {
    state.multiKillCount = kills;
    state.multiKillTimer = 1.2;
  }
}

// ── Phase Transition ──

/** Call each frame with current combatPhase to detect boss entrance.
 *  Optionally pass bossName/bossColor from store for the visual entity. */
export function checkPhaseTransition(
  state: ArenaState,
  phase: string,
  bossInfo?: { name: string; color: string; maxHp: number },
): void {
  if (phase === 'boss_fight' && state.lastCombatPhase !== 'boss_fight') {
    state.bossEntranceTimer = 1.5;
    triggerShake(state, 6);
    // Spawn boss mob entity above viewport
    if (bossInfo) {
      state.bossMob = {
        x: state.player.x,
        y: state.camera.y - 60, // above viewport
        radius: 45,
        hp: bossInfo.maxHp,
        maxHp: bossInfo.maxHp,
        color: bossInfo.color,
        name: bossInfo.name,
        vx: 0, vy: 0,
        lastHitTime: -1,
        knockbackVx: 0, knockbackVy: 0,
        deathTimer: 0,
        dead: false,
        entranceTimer: 1.5,
      };
    }
  }
  state.lastCombatPhase = phase;
}

/** Massive death particles for boss kill. */
export function spawnBossDeathParticles(state: ArenaState, pos: Vec2, color: string): void {
  const count = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    state.particles.push({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 5,
      color: i % 3 === 0 ? '#fbbf24' : color,
      age: 0,
      maxAge: 0.6 + Math.random() * 0.5,
    });
  }
}

// ── Floater Factories ──

export function addDamageFloater(state: ArenaState, damage: number, isCrit: boolean, pos: Vec2): void {
  state.floaters.push({
    x: pos.x + (Math.random() - 0.5) * 24,
    y: pos.y - 20,
    text: isCrit ? `${Math.round(damage)}!` : `${Math.round(damage)}`,
    color: isCrit ? '#fbbf24' : '#e5e7eb',
    age: 0,
    maxAge: FLOATER_MAX_AGE,
    isCrit,
    vy: -70,
  });
}

export function addDotFloater(state: ArenaState, damage: number, pos: Vec2): void {
  state.floaters.push({
    x: pos.x + (Math.random() - 0.5) * 20,
    y: pos.y - 15,
    text: `${Math.round(damage)}`,
    color: '#86efac',
    age: 0,
    maxAge: 1.0,
    isCrit: false,
    vy: -50,
  });
}

export function addProcFloater(state: ArenaState, label: string, pos: Vec2): void {
  state.floaters.push({
    x: pos.x + (Math.random() - 0.5) * 30,
    y: pos.y - 30,
    text: label,
    color: '#c4b5fd',
    age: 0,
    maxAge: 1.2,
    isCrit: false,
    vy: -55,
  });
}

export function addKillFloater(state: ArenaState, pos: Vec2): void {
  state.floaters.push({
    x: pos.x,
    y: pos.y - 10,
    text: 'KILL',
    color: '#fca5a5',
    age: 0,
    maxAge: 0.7,
    isCrit: false,
    vy: -45,
  });
}

// ── Death Hazards (explosive/toxic on-death pools) ──

/** Spawn fire/poison ground hazards when a mob with explosive/toxic affixes dies. */
export function spawnDeathHazards(state: ArenaState, mob: ArenaMob, zoneBand: number): void {
  if (!mob.arenaAffixes || mob.arenaAffixes.length === 0) return;
  for (const affixId of mob.arenaAffixes) {
    const def = ARENA_AFFIX_DEFS[affixId];
    if (!def.hazardType) continue;
    // Scale DPS slightly with zone band
    const dps = (def.hazardDps ?? 6) * (1 + (zoneBand - 1) * 0.15);
    state.hazards.push({
      id: state.nextHazardId++,
      x: mob.x, y: mob.y,
      radius: def.hazardRadius ?? 40,
      type: def.hazardType,
      age: 0,
      maxAge: def.hazardDuration ?? 3,
      damagePerSec: dps,
      lastDamageTick: 0,
    });
    // Visual particles at spawn
    const pColor = def.hazardType === 'fire' ? '#f97316' : '#4ade80';
    for (let i = 0; i < 4; i++) {
      const pa = Math.random() * Math.PI * 2;
      state.particles.push({
        x: mob.x, y: mob.y,
        vx: Math.cos(pa) * 30, vy: Math.sin(pa) * 30,
        size: 2 + Math.random() * 2,
        color: pColor,
        age: 0, maxAge: 0.4,
      });
    }
  }
}

export function addPlayerHitFloater(state: ArenaState, damage: number, dodged: boolean, blocked: boolean): void {
  const pos = state.player;
  if (dodged) {
    state.floaters.push({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y - 25,
      text: 'DODGE',
      color: '#67e8f9',
      age: 0,
      maxAge: 0.9,
      isCrit: false,
      vy: -55,
    });
  } else if (blocked) {
    state.floaters.push({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y - 25,
      text: 'BLOCK',
      color: '#93c5fd',
      age: 0,
      maxAge: 0.9,
      isCrit: false,
      vy: -55,
    });
  } else {
    state.floaters.push({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y - 25,
      text: `-${Math.round(damage)}`,
      color: '#f87171',
      age: 0,
      maxAge: 1.0,
      isCrit: false,
      vy: -60,
    });
  }
}

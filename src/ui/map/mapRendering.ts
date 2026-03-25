// ============================================================
// Map Rendering — Room walls, floors, mobs, hazards, loot, HUD
// Reuses arena rendering patterns for mobs/particles/loot.
// ============================================================

import type { MapState } from './mapTypes';
import type { SkillCooldownInfo, ArenaRenderOpts } from '../arena/arenaTypes';
import { PLAYER_ATTACK_RANGE, SPLASH_RADIUS_AOE } from '../arena/arenaTypes';
import { GEM_COLLECT_ANIM } from '../arena/arenaCombatFeedback';
import { ARENA_AFFIX_DEFS } from '../arena/arenaAffixes';
import { anyMapMobInRange, mobCanAttackMapPlayer, GROUND_ITEM_COLLECT_ANIM } from './mapEngine';

export interface MapHudExtra {
  mapFragments?: number;
  mapsCompleted?: number;
  mapsBeforeBoss?: number;
  isDownfarmed?: boolean;
  selectedZoneName?: string;
  corruptedTier?: number;
  modifierLabels?: string[];
  timerRemaining?: number | null;
}

export function renderMap(
  ctx: CanvasRenderingContext2D,
  state: MapState,
  playerHp: number,
  playerMaxHp: number,
  playerEs: number,
  _killCount: number,
  _skillCooldowns?: SkillCooldownInfo[],
  _opts?: ArenaRenderOpts,
  _mapHud?: MapHudExtra,
): void {
  const { width, height, totalTime } = state;

  // ── Background ──
  ctx.fillStyle = '#06060a';
  ctx.fillRect(0, 0, width, height);

  // ── Screen Shake + Camera ──
  ctx.save();
  if (state.shakeTimer > 0) {
    const t = state.shakeTimer / 0.15;
    const intensity = state.shakeIntensity * t;
    ctx.translate((Math.random() - 0.5) * 2 * intensity, (Math.random() - 0.5) * 2 * intensity);
  }
  ctx.translate(-state.camera.x, -state.camera.y);

  // ── Fog of War — fill entire world with darkness, punch out entered rooms ──
  const fogPad = 200; // extra padding around world bounds
  ctx.fillStyle = '#08080e';
  ctx.fillRect(
    -fogPad, -fogPad,
    state.layout.worldWidth + fogPad * 2,
    state.layout.worldHeight + fogPad * 2,
  );

  // ── Room Floors (entered rooms punched out of the fog) ──
  const isCorrupted = state.corruptedTier > 0;
  for (const room of state.layout.rooms) {
    if (!room.entered) continue; // stays dark — fog covers it

    // Explored room floor — corrupted maps get purple tint
    const isCurrentRoom = room.id === state.currentRoomId;
    if (isCorrupted) {
      ctx.fillStyle = isCurrentRoom ? '#140f1e' : '#0e0a16';
    } else {
      ctx.fillStyle = isCurrentRoom ? '#0f0f18' : '#0a0a12';
    }
    ctx.fillRect(room.x, room.y, room.width, room.height);
    // Purple vignette overlay for corrupted maps
    if (isCorrupted) {
      ctx.fillStyle = 'rgba(88, 28, 135, 0.06)';
      ctx.fillRect(room.x, room.y, room.width, room.height);
    }

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let gx = room.x; gx < room.x + room.width; gx += gridSize) {
      ctx.beginPath(); ctx.moveTo(gx, room.y); ctx.lineTo(gx, room.y + room.height); ctx.stroke();
    }
    for (let gy = room.y; gy < room.y + room.height; gy += gridSize) {
      ctx.beginPath(); ctx.moveTo(room.x, gy); ctx.lineTo(room.x + room.width, gy); ctx.stroke();
    }

    // Room cleared indicator
    if (room.cleared && room.type !== 'corridor') {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.03)';
      ctx.fillRect(room.x, room.y, room.width, room.height);
    }
  }

  // ── Walls (only for explored rooms — unexplored stay hidden) ──
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 3;
  for (const room of state.layout.rooms) {
    if (!room.entered) continue;
    for (const wall of room.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
  }
  // Wall glow for visibility (explored rooms only)
  ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
  ctx.lineWidth = 6;
  for (const room of state.layout.rooms) {
    if (!room.entered) continue;
    for (const wall of room.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
  }

  // ── Chests ──
  for (const room of state.layout.rooms) {
    if (!room.entered) continue;
    for (const chest of room.chests) {
      if (chest.opened) continue;
      const cPulse = 0.6 + Math.sin(totalTime * 2 + chest.id) * 0.2;
      const cColor = chest.tier === 'rare' ? '#fbbf24' : '#a78bfa';
      // Glow
      const cGlow = ctx.createRadialGradient(chest.x, chest.y, 3, chest.x, chest.y, 20);
      cGlow.addColorStop(0, cColor + Math.round(cPulse * 60).toString(16).padStart(2, '0'));
      cGlow.addColorStop(1, cColor + '00');
      ctx.beginPath();
      ctx.arc(chest.x, chest.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = cGlow;
      ctx.fill();
      // Body (square)
      ctx.fillStyle = cColor;
      ctx.globalAlpha = cPulse;
      ctx.fillRect(chest.x - 8, chest.y - 6, 16, 12);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(chest.x - 8, chest.y - 6, 16, 12);
      ctx.globalAlpha = 1;
    }
  }

  // ── Player Trail ──
  for (const dot of state.trail) {
    const alpha = Math.max(0, 0.25 * (1 - dot.age / 0.25));
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, state.playerRadius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59, 130, 246, ${alpha.toFixed(3)})`;
    ctx.fill();
  }

  // ── Skill Visuals ──
  for (const sv of state.skillVisuals) {
    const t = sv.age / sv.maxAge;
    const alpha = Math.max(0, 1 - t);
    ctx.globalAlpha = alpha;
    switch (sv.type) {
      case 'slash': {
        const ang = sv.angle ?? 0;
        const r = 30 + t * 20;
        // Primary arc
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r, ang - 0.8, ang + 0.8);
        ctx.lineWidth = 4 * (1 - t);
        ctx.strokeStyle = sv.color;
        ctx.stroke();
        // Secondary arc at offset angle
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r * 0.85, ang - 0.6, ang + 0.6);
        ctx.lineWidth = 2 * (1 - t);
        ctx.strokeStyle = sv.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        // Spark particles at the tip
        for (let si = 0; si < 4; si++) {
          const sparkAng = ang - 0.8 + (1.6 / 3) * si;
          const sx = sv.x + Math.cos(sparkAng) * r;
          const sy = sv.y + Math.sin(sparkAng) * r;
          ctx.beginPath();
          ctx.arc(sx, sy, 2 * (1 - t), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.7;
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
        break;
      }
      case 'ring': {
        const r = SPLASH_RADIUS_AOE * Math.min(1, t * 3);
        // Ground pulse effect (expanding circle that fades)
        if (t < 0.5) {
          const pulseR = r * (1 + t * 0.6);
          ctx.beginPath();
          ctx.arc(sv.x, sv.y, pulseR, 0, Math.PI * 2);
          ctx.fillStyle = sv.color + '15';
          ctx.fill();
        }
        // Main ring — thicker stroke
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 4 * (1 - t);
        ctx.stroke();
        // Inner ring glow
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 1.5 * (1 - t);
        ctx.globalAlpha = alpha * 0.4;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        break;
      }
      case 'cone': {
        const ang = sv.angle ?? 0;
        const half = sv.halfAngle ?? Math.PI / 4;
        const len = (sv.length ?? 50) * Math.min(1, t * 5);
        // Brighter fill
        ctx.beginPath();
        ctx.moveTo(sv.x, sv.y);
        ctx.arc(sv.x, sv.y, len, ang - half, ang + half);
        ctx.closePath();
        ctx.fillStyle = sv.color + '50';
        ctx.fill();
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 2 * (1 - t);
        ctx.stroke();
        // Shockwave ring at the edge
        if (t < 0.6) {
          ctx.beginPath();
          ctx.arc(sv.x, sv.y, len, ang - half * 0.8, ang + half * 0.8);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5 * (1 - t);
          ctx.globalAlpha = alpha * 0.4;
          ctx.stroke();
          ctx.globalAlpha = alpha;
        }
        break;
      }
      case 'projectile': {
        // Brighter glow core
        const projGlow = ctx.createRadialGradient(sv.x, sv.y, 0, sv.x, sv.y, 10);
        projGlow.addColorStop(0, '#ffffff');
        projGlow.addColorStop(0.3, sv.color);
        projGlow.addColorStop(1, sv.color + '00');
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = projGlow;
        ctx.fill();
        // Solid core
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        // Longer trail (5 dots)
        if (sv.dx !== undefined && sv.dy !== undefined) {
          for (let ti = 1; ti <= 5; ti++) {
            const tx = sv.x - sv.dx * 400 * 0.02 * ti;
            const ty = sv.y - sv.dy * 400 * 0.02 * ti;
            ctx.beginPath();
            ctx.arc(tx, ty, 3 - ti * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = sv.color;
            ctx.globalAlpha = alpha * (1 - ti * 0.18);
            ctx.fill();
          }
          ctx.globalAlpha = alpha;
        }
        break;
      }
      case 'chain': {
        // Thicker lines
        ctx.lineWidth = 4 * (1 - t);
        ctx.strokeStyle = sv.color;
        let prev = { x: sv.x, y: sv.y };
        for (const tgt of sv.targets ?? []) {
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
          // Small explosion at each target point
          const expR = 8 * (1 - t);
          const expGlow = ctx.createRadialGradient(tgt.x, tgt.y, 0, tgt.x, tgt.y, expR);
          expGlow.addColorStop(0, '#ffffff');
          expGlow.addColorStop(0.4, sv.color);
          expGlow.addColorStop(1, sv.color + '00');
          ctx.beginPath(); ctx.arc(tgt.x, tgt.y, expR, 0, Math.PI * 2);
          ctx.fillStyle = expGlow; ctx.fill();
          prev = tgt;
        }
        break;
      }
      case 'fan': {
        const dirs = sv.fanDirs ?? [];
        const travel = 120 * Math.min(1, t * 3);
        for (const dir of dirs) {
          const px = sv.x + dir.dx * travel;
          const py = sv.y + dir.dy * travel;
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fillStyle = sv.color; ctx.fill();
        }
        break;
      }
      case 'dash': {
        const sx = sv.startX ?? sv.x, sy = sv.startY ?? sv.y;
        for (let i = 0; i < 5; i++) {
          const frac = i / 5;
          ctx.globalAlpha = alpha * (1 - frac) * 0.5;
          ctx.beginPath();
          ctx.arc(sx + (sv.x - sx) * frac, sy + (sv.y - sy) * frac, state.playerRadius * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = sv.color;
          ctx.fill();
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Particles ──
  for (const p of state.particles) {
    const alpha = Math.max(0, 1 - p.age / p.maxAge);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 - p.age / p.maxAge * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Ground Hazards ──
  for (const h of state.hazards) {
    const ht = h.age / h.maxAge;
    const hAlpha = Math.max(0, ht < 0.1 ? ht / 0.1 : ht > 0.8 ? (1 - ht) / 0.2 : 1) * 0.6;
    const isFire = h.type === 'fire';
    const c1 = isFire ? 'rgba(249, 115, 22,' : 'rgba(74, 222, 128,';
    const c2 = isFire ? 'rgba(239, 68, 68,' : 'rgba(34, 197, 94,';
    const hGlow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
    hGlow.addColorStop(0, `${c1} ${(hAlpha * 0.5).toFixed(3)})`);
    hGlow.addColorStop(0.6, `${c2} ${(hAlpha * 0.25).toFixed(3)})`);
    hGlow.addColorStop(1, `${c1} 0)`);
    ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fillStyle = hGlow; ctx.fill();
    const pulse = 0.5 + Math.sin(totalTime * 5 + h.id) * 0.3;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.5 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `${c1} ${(hAlpha * 0.7).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // ── Traps ──
  for (const trap of state.traps) {
    if (trap.detonated) {
      const t = trap.detonateTimer / 0.5;
      const alpha = Math.max(0, 1 - t);
      ctx.beginPath(); ctx.arc(trap.x, trap.y, 20 + t * SPLASH_RADIUS_AOE * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${(alpha * 0.8).toFixed(2)})`; ctx.lineWidth = 3 * (1 - t); ctx.stroke();
      continue;
    }
    const trapR = trap.armed ? 18 : 14;
    ctx.lineWidth = trap.armed ? 2.5 : 1.5;
    ctx.strokeStyle = trap.armed ? '#fb923c' : '#9ca3af';
    for (let i = 0; i < 3; i++) {
      const ang = trap.rotation + (Math.PI * 2 / 3) * i;
      ctx.beginPath();
      ctx.moveTo(trap.x + Math.cos(ang) * trapR, trap.y + Math.sin(ang) * trapR);
      ctx.lineTo(trap.x - Math.cos(ang) * trapR, trap.y - Math.sin(ang) * trapR);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(trap.x, trap.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = trap.armed ? '#f97316' : '#6b7280'; ctx.fill();
  }

  // ── Projectiles ──
  for (const proj of state.projectiles) {
    if (proj.hit) continue;
    const t = proj.age / proj.maxAge;
    const alpha = Math.max(0, 1 - t * 0.5);
    // Trail
    const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
    for (let i = 1; i <= 3; i++) {
      const tx = proj.x - (proj.vx / speed) * 8 * i;
      const ty = proj.y - (proj.vy / speed) * 8 * i;
      ctx.beginPath(); ctx.arc(tx, ty, 2 - i * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = proj.color; ctx.globalAlpha = alpha * (0.5 - i * 0.12); ctx.fill();
    }
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.radius * 2);
    glow.addColorStop(0, proj.color + 'cc'); glow.addColorStop(0.5, proj.color + '44'); glow.addColorStop(1, proj.color + '00');
    ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius * 2, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#dbeafe'; ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Mobs ──
  for (const mob of state.mobs) {
    // Only render mobs in entered rooms
    const mobRoom = state.layout.rooms.find(r => r.mobIds.includes(mob.mobId));
    if (mobRoom && !mobRoom.entered) continue;

    if (mob.dead) {
      const t = mob.deathTimer / 0.6;
      const alpha = Math.max(0, 1 - t);
      ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius + t * 25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${(alpha * 0.4).toFixed(2)})`; ctx.fill();
      if (t < 0.3) {
        ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius * (1 - t * 3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.6 - t * 2).toFixed(2)})`; ctx.fill();
      }
      continue;
    }

    // Rare glow
    if (mob.isRare) {
      const pulse = 0.4 + Math.sin(totalTime * 3) * 0.15;
      const glow = ctx.createRadialGradient(mob.x, mob.y, 0, mob.x, mob.y, mob.radius * 2.2);
      glow.addColorStop(0, `rgba(245, 158, 11, ${pulse.toFixed(2)})`);
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius * 2.2, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    }

    // Body
    if (mob.behavior === 'ranged') {
      ctx.beginPath();
      ctx.moveTo(mob.x, mob.y - mob.radius); ctx.lineTo(mob.x + mob.radius, mob.y);
      ctx.lineTo(mob.x, mob.y + mob.radius); ctx.lineTo(mob.x - mob.radius, mob.y);
      ctx.closePath(); ctx.fillStyle = '#60a5fa'; ctx.fill();
      ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (mob.behavior === 'fast') {
      const ang = Math.atan2(state.player.y - mob.y, state.player.x - mob.x);
      const r = mob.radius * 0.85;
      ctx.beginPath();
      ctx.moveTo(mob.x + Math.cos(ang) * r * 1.3, mob.y + Math.sin(ang) * r * 1.3);
      ctx.lineTo(mob.x + Math.cos(ang + 2.4) * r, mob.y + Math.sin(ang + 2.4) * r);
      ctx.lineTo(mob.x + Math.cos(ang - 2.4) * r, mob.y + Math.sin(ang - 2.4) * r);
      ctx.closePath(); ctx.fillStyle = '#f97316'; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius, 0, Math.PI * 2);
      ctx.fillStyle = mob.color; ctx.fill();
      ctx.strokeStyle = mob.isRare ? '#fcd34d' : '#7f1d1d';
      ctx.lineWidth = mob.isRare ? 2.5 : 1.5; ctx.stroke();
    }

    // Ailment body tints — colored overlays on the mob
    if (mob.activeDebuffs && mob.activeDebuffs.length > 0) {
      const ailmentTints: Record<string, string> = {
        poisoned: 'rgba(74, 222, 128, 0.3)',
        bleeding: 'rgba(248, 113, 113, 0.25)',
        burning:  'rgba(249, 115, 22, 0.3)',
        shocked:  'rgba(250, 204, 21, 0.3)',
        chilled:  'rgba(34, 211, 238, 0.3)',
        plague_link: 'rgba(167, 139, 252, 0.3)',
        vulnerable: 'rgba(248, 113, 113, 0.2)',
        cursed:   'rgba(192, 132, 252, 0.25)',
      };
      const drawn = new Set<string>();
      for (const dId of mob.activeDebuffs) {
        if (drawn.has(dId)) continue;
        const tint = ailmentTints[dId];
        if (!tint) continue;
        drawn.add(dId);
        ctx.beginPath();
        ctx.arc(mob.x, mob.y, mob.radius + 1, 0, Math.PI * 2);
        ctx.fillStyle = tint;
        ctx.fill();
      }
      // Poison drip particles
      if (mob.activeDebuffs.includes('poisoned')) {
        const dripPhase = (totalTime * 2 + mob.x * 0.1) % 1;
        ctx.globalAlpha = 0.5 * (1 - dripPhase);
        ctx.beginPath();
        ctx.arc(mob.x + Math.sin(totalTime * 3 + mob.y) * 4, mob.y + mob.radius + dripPhase * 8, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80'; ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Hit flash
    if (mob.lastHitTime >= 0 && totalTime - mob.lastHitTime < 0.05) {
      ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.fill();
    }

    // HP bar
    const barW = mob.radius * 3;
    const barH = 4;
    const barX = mob.x - barW / 2;
    const barY = mob.y - mob.radius - 10;
    const hpPct = Math.max(0, mob.hp / mob.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Debuff indicator dots below HP bar
    if (mob.activeDebuffs && mob.activeDebuffs.length > 0) {
      const dotY = barY + barH + 3;
      const dotSpacing = 6;
      const dotStartX = mob.x - ((mob.activeDebuffs.length - 1) * dotSpacing) / 2;
      const debuffColors: Record<string, string> = {
        poisoned: '#4ade80', poison: '#4ade80',
        bleeding: '#f87171', bleed: '#f87171',
        burning: '#f97316', ignite: '#f97316',
        chilled: '#22d3ee', frozen: '#60a5fa',
        shocked: '#facc15',
      };
      const seen = new Set<string>();
      for (const dId of mob.activeDebuffs) {
        if (seen.has(dId)) continue;
        seen.add(dId);
        const c = debuffColors[dId] ?? '#c4b5fd';
        const dx = dotStartX + seen.size * dotSpacing - dotSpacing;
        const pulse = 0.6 + Math.sin(totalTime * 4 + mob.x) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(dx, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Affix visuals
    if (mob.arenaAffixes && mob.arenaAffixes.length > 0) {
      // Shielding aura
      if (mob.arenaAffixes.includes('shielding')) {
        const sPulse = 0.3 + Math.sin(totalTime * 2 + mob.mobId) * 0.1;
        ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.shieldAuraRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(96, 165, 250, ${sPulse.toFixed(3)})`; ctx.lineWidth = 2; ctx.stroke();
      }
      // Teleporter shimmer
      if (mob.arenaAffixes.includes('teleporter')) {
        const tPulse = 0.3 + Math.sin(totalTime * 6 + mob.mobId * 0.7) * 0.2;
        ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(167, 139, 252, ${tPulse.toFixed(3)})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
      // Explosive flame arcs
      if (mob.arenaAffixes.includes('explosive')) {
        for (let fi = 0; fi < 4; fi++) {
          const fAng = totalTime * 4 + (Math.PI / 2) * fi + mob.mobId;
          ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius + 4, fAng, fAng + 0.6);
          ctx.strokeStyle = `rgba(249, 115, 22, ${(0.5 + Math.sin(totalTime * 6 + fi) * 0.2).toFixed(3)})`;
          ctx.lineWidth = 2; ctx.stroke();
        }
      }
      // Toxic drips
      if (mob.arenaAffixes.includes('toxic')) {
        for (let ti = 0; ti < 3; ti++) {
          const tPhase = (totalTime * 1.5 + ti * 0.33 + mob.mobId * 0.1) % 1;
          ctx.globalAlpha = 0.6 * (1 - tPhase);
          ctx.beginPath();
          ctx.arc(mob.x + Math.sin(totalTime * 2 + ti * 2) * (mob.radius * 0.5), mob.y + mob.radius + tPhase * 12, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#4ade80'; ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      // Mortar orbiting dots
      if (mob.arenaAffixes.includes('mortar')) {
        for (let mi = 0; mi < 3; mi++) {
          const mAng = totalTime * 3 + (Math.PI * 2 / 3) * mi;
          ctx.beginPath();
          ctx.arc(mob.x + Math.cos(mAng) * (mob.radius + 5), mob.y + Math.sin(mAng) * (mob.radius + 5), 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fb923c'; ctx.fill();
        }
      }
      // Affix labels
      const labelY = barY - 12;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 10px monospace';
      const labelText = mob.arenaAffixes.map(a => ARENA_AFFIX_DEFS[a]?.label ?? a).join(' · ');
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillText(labelText, mob.x + 1, labelY + 1);
      ctx.fillStyle = mob.isRare ? '#fbbf24' : '#e5e7eb'; ctx.fillText(labelText, mob.x, labelY);
    }

    // Mob threat ring
    if (mobCanAttackMapPlayer(state, mob)) {
      ctx.beginPath(); ctx.arc(mob.x, mob.y, mob.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${(0.3 + Math.sin(totalTime * 5) * 0.15).toFixed(2)})`;
      ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  // ── Shrines ──
  for (const shrine of state.shrines) {
    if (shrine.collected) continue;
    const sPulse = 0.7 + Math.sin(totalTime * 3 + shrine.id) * 0.3;
    const sColors: Record<string, string> = { damage: '#ef4444', speed: '#60a5fa', magnet: '#c084fc', bomb: '#f97316' };
    const sColor = sColors[shrine.type] ?? '#fbbf24';
    const sGlow = ctx.createRadialGradient(shrine.x, shrine.y, 5, shrine.x, shrine.y, 30);
    sGlow.addColorStop(0, sColor + Math.round(sPulse * 100).toString(16).padStart(2, '0'));
    sGlow.addColorStop(1, sColor + '00');
    ctx.beginPath(); ctx.arc(shrine.x, shrine.y, 30, 0, Math.PI * 2); ctx.fillStyle = sGlow; ctx.fill();
    ctx.beginPath(); ctx.arc(shrine.x, shrine.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = sColor; ctx.globalAlpha = sPulse; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff'; ctx.fillText(shrine.type.toUpperCase(), shrine.x, shrine.y + 20);
  }

  // ── Player ──
  const { player, playerRadius } = state;
  const engaged = anyMapMobInRange(state, PLAYER_ATTACK_RANGE);

  if (engaged) {
    const rp = 0.15 + Math.sin(totalTime * 4) * 0.05;
    ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER_ATTACK_RANGE, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(59, 130, 246, ${rp.toFixed(3)})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.03)'; ctx.fill();
  }

  const iFrameVisible = state.iFrameTimer <= 0 || Math.floor(totalTime * 20) % 2 === 0;
  if (iFrameVisible) {
    const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, playerRadius * 3);
    glow.addColorStop(0, 'rgba(59, 130, 246, 0.25)'); glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.beginPath(); ctx.arc(player.x, player.y, playerRadius * 3, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6'; ctx.fill(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
    const fx = player.x + state.playerFacing.x * playerRadius * 0.7;
    const fy = player.y + state.playerFacing.y * playerRadius * 0.7;
    ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fillStyle = '#dbeafe'; ctx.fill();
  }

  // ── Player Debuff Visuals ──
  if (state.playerDebuffs.length > 0 && iFrameVisible) {
    for (const deb of state.playerDebuffs) {
      switch (deb.type) {
        case 'slow':
        case 'chill': {
          // Blue tint overlay on player body
          ctx.beginPath();
          ctx.arc(player.x, player.y, playerRadius + 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
          ctx.fill();
          break;
        }
        case 'poison': {
          // Green pulsing particles around player
          const pPhase = (totalTime * 3 + deb.remainingTime) % 1;
          for (let pi = 0; pi < 3; pi++) {
            const pAngle = (Math.PI * 2 / 3) * pi + totalTime * 2;
            const pr = playerRadius + 6 + Math.sin(totalTime * 4 + pi) * 3;
            ctx.beginPath();
            ctx.arc(player.x + Math.cos(pAngle) * pr, player.y + Math.sin(pAngle) * pr, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(74, 222, 128, ${(0.6 + pPhase * 0.3).toFixed(2)})`;
            ctx.fill();
          }
          break;
        }
        case 'bleed': {
          // Red drip particles when moving
          if (state.playerMoving) {
            const bPhase = (totalTime * 2.5) % 1;
            ctx.globalAlpha = 0.6 * (1 - bPhase);
            ctx.beginPath();
            ctx.arc(player.x + Math.sin(totalTime * 3) * 4, player.y + playerRadius + bPhase * 10, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#f87171';
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          break;
        }
        case 'curse': {
          // Purple aura ring
          const cPulse = 0.3 + Math.sin(totalTime * 3) * 0.1;
          ctx.beginPath();
          ctx.arc(player.x, player.y, playerRadius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(192, 132, 252, ${cPulse.toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          break;
        }
      }
    }
  }

  // ── Rare Mob Ability Telegraphs ──
  for (const [mobId, ability] of state.rareAbilityStates) {
    const mob = state.mobs.find(m => m.mobId === mobId);
    if (!mob || mob.dead) continue;

    if (ability.telegraphTimer > 0) {
      switch (ability.type) {
        case 'charge': {
          // Draw a line from mob to target position
          ctx.beginPath();
          ctx.moveTo(mob.x, mob.y);
          ctx.lineTo(ability.targetX, ability.targetY);
          const chgAlpha = 0.3 + (1 - ability.telegraphTimer / 0.8) * 0.4;
          ctx.strokeStyle = `rgba(239, 68, 68, ${chgAlpha.toFixed(3)})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'leap': {
          // Red circle at target position (80px radius)
          const leapPct = 1 - ability.telegraphTimer / 1.0;
          const leapAlpha = 0.15 + leapPct * 0.35;
          ctx.beginPath();
          ctx.arc(ability.targetX, ability.targetY, 80 * leapPct, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${leapAlpha.toFixed(3)})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ability.targetX, ability.targetY, 80, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${(0.5 * leapPct).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case 'spin': {
          // Mob glows bright
          const spinAlpha = 0.4 + (1 - ability.telegraphTimer / 0.5) * 0.4;
          ctx.beginPath();
          ctx.arc(mob.x, mob.y, mob.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(249, 115, 22, ${spinAlpha.toFixed(3)})`;
          ctx.fill();
          break;
        }
      }
    }

    if (ability.activeTimer > 0) {
      switch (ability.type) {
        case 'charge': {
          // Speed trail behind charging mob
          for (let ci = 1; ci <= 3; ci++) {
            const cdx = ability.targetX - mob.x;
            const cdy = ability.targetY - mob.y;
            const cLen = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cLen < 1) break;
            const tx = mob.x - (cdx / cLen) * 12 * ci;
            const ty = mob.y - (cdy / cLen) * 12 * ci;
            ctx.beginPath();
            ctx.arc(tx, ty, mob.radius * (0.7 - ci * 0.15), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239, 68, 68, ${(0.3 - ci * 0.08).toFixed(2)})`;
            ctx.fill();
          }
          break;
        }
        case 'spin': {
          // Spinning damage ring
          const spinR = 60;
          const spinAngle = totalTime * 12;
          ctx.beginPath();
          ctx.arc(mob.x, mob.y, spinR, spinAngle, spinAngle + Math.PI * 1.5);
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
          ctx.lineWidth = 4;
          ctx.stroke();
          // Inner glow
          ctx.beginPath();
          ctx.arc(mob.x, mob.y, spinR * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
          ctx.fill();
          break;
        }
      }
    }
  }

  // ── Portal ──
  if (state.portal && state.portal.active) {
    const px = state.portal.x;
    const py = state.portal.y;
    const portalR = 30;
    const portalPulse = 0.8 + Math.sin(totalTime * 3) * 0.2;

    // Swirling blue/purple gradient circle
    const portalGrad = ctx.createRadialGradient(px, py, 0, px, py, portalR);
    portalGrad.addColorStop(0, 'rgba(96, 165, 250, 0.8)');
    portalGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)');
    portalGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.beginPath();
    ctx.arc(px, py, portalR, 0, Math.PI * 2);
    ctx.fillStyle = portalGrad;
    ctx.fill();

    // Pulsing glow ring
    ctx.beginPath();
    ctx.arc(px, py, portalR * portalPulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(147, 197, 253, ${(0.6 + Math.sin(totalTime * 5) * 0.2).toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Small orbiting particles
    for (let oi = 0; oi < 4; oi++) {
      const oAngle = totalTime * 4 + (Math.PI * 2 / 4) * oi;
      const oR = portalR + 5;
      ctx.beginPath();
      ctx.arc(px + Math.cos(oAngle) * oR, py + Math.sin(oAngle) * oR, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#93c5fd';
      ctx.fill();
    }

    // "EXIT" label below
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('EXIT', px, py + portalR + 6);
  }

  // Player HP bar
  const pBarW = 48, pBarH = 6;
  const pBarX = player.x - pBarW / 2, pBarY = player.y - playerRadius - 16;
  const pHpPct = Math.max(0, playerHp / playerMaxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(pBarX - 1, pBarY - 1, pBarW + 2, pBarH + 2);
  ctx.fillStyle = pHpPct > 0.5 ? '#22c55e' : pHpPct > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(pBarX, pBarY, pBarW * pHpPct, pBarH);
  if (playerEs > 0 && playerMaxHp > 0) {
    ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
    ctx.fillRect(pBarX, pBarY, pBarW * Math.min(1, playerEs / playerMaxHp), pBarH);
  }

  // ── Gems ──
  for (const gem of state.gems) {
    if (gem.collected) {
      const t = gem.collectTimer / GEM_COLLECT_ANIM;
      const alpha = Math.max(0, 1 - t);
      ctx.beginPath(); ctx.arc(gem.x, gem.y, gem.size + t * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.7).toFixed(2)})`; ctx.lineWidth = 1; ctx.stroke();
      continue;
    }
    const gemPulse = 0.5 + Math.sin(totalTime * 4 + gem.x) * 0.2;
    ctx.globalAlpha = gemPulse + 0.5;
    ctx.beginPath(); ctx.arc(gem.x, gem.y, gem.size, 0, Math.PI * 2);
    ctx.fillStyle = gem.color; ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Boss (world-space) ──
  if (state.bossMob) {
    const boss = state.bossMob;

    // Slam telegraph (pulsing red circle on ground)
    if (boss.slamTelegraph > 0) {
      const telegraphPct = 1 - boss.slamTelegraph / 1.0; // 0→1 as slam approaches
      const telegraphRadius = 80 * telegraphPct;
      const telegraphAlpha = 0.15 + telegraphPct * 0.35;
      // Filled warning area
      ctx.beginPath(); ctx.arc(boss.slamX, boss.slamY, telegraphRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${telegraphAlpha.toFixed(3)})`; ctx.fill();
      // Pulsing ring
      const ringPulse = 0.5 + Math.sin(totalTime * 12) * 0.3;
      ctx.beginPath(); ctx.arc(boss.slamX, boss.slamY, 80, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${(ringPulse * telegraphPct).toFixed(3)})`;
      ctx.lineWidth = 2 + telegraphPct * 2; ctx.stroke();
    }

    if (boss.dead) {
      // Death animation
      const dt = boss.deathTimer / 2.0;
      const alpha = Math.max(0, 1 - dt);
      ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.radius + dt * 60, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${(alpha * 0.5).toFixed(2)})`; ctx.fill();
      if (dt < 0.3) {
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.radius * (1 - dt * 3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.8 - dt * 2.5).toFixed(2)})`; ctx.fill();
      }
    } else {
      // Glow aura
      const auraPulse = 0.3 + Math.sin(totalTime * 2) * 0.1;
      const auraGlow = ctx.createRadialGradient(boss.x, boss.y, boss.radius * 0.5, boss.x, boss.y, boss.radius * 2.5);
      auraGlow.addColorStop(0, boss.color + Math.round(auraPulse * 80).toString(16).padStart(2, '0'));
      auraGlow.addColorStop(1, boss.color + '00');
      ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.radius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = auraGlow; ctx.fill();

      // Boss body (large circle)
      ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
      ctx.fillStyle = boss.color; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();

      // Inner detail — phase indicator rings
      for (let i = 0; i < boss.phase; i++) {
        const ringR = boss.radius * (0.3 + i * 0.15);
        ctx.beginPath(); ctx.arc(boss.x, boss.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.3 - i * 0.05).toFixed(2)})`;
        ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Hit flash
      if (boss.lastHitTime >= 0 && totalTime - boss.lastHitTime < 0.05) {
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fill();
      }

      // Name label above boss
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(boss.name, boss.x + 1, boss.y - boss.radius - 18 + 1);
      ctx.fillStyle = boss.color; ctx.fillText(boss.name, boss.x, boss.y - boss.radius - 18);
    }
  }

  // ── Ground Items ──
  const GROUND_ITEM_MAX_AGE = 30;
  const RARITY_BEAM: Record<string, number> = {
    common: 0, uncommon: 0, rare: 70, epic: 100, legendary: 140, unique: 140,
  };
  const RARITY_IS_HIGH: Record<string, boolean> = {
    legendary: true, unique: true,
  };

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const gi of state.groundItems) {
    if (gi.collected) {
      // Collect animation: float up + fade
      const t = gi.collectTimer / GROUND_ITEM_COLLECT_ANIM;
      const alpha = Math.max(0, 1 - t);
      const yOff = -t * 20;
      ctx.globalAlpha = alpha;
      const cFontSize = gi.kind === 'equipment' || gi.kind === 'trophy' ? 11 : 9;
      ctx.font = `bold ${cFontSize}px monospace`;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(gi.label, gi.x + 1, gi.y + yOff + 1);
      ctx.fillStyle = gi.color;
      ctx.fillText(gi.label, gi.x, gi.y + yOff);
      ctx.globalAlpha = 1;
      continue;
    }

    // Fade in/out
    const fadeIn = Math.min(1, gi.age / 0.3);
    const fadeOut = gi.age > GROUND_ITEM_MAX_AGE - 3 ? (GROUND_ITEM_MAX_AGE - gi.age) / 3 : 1;
    const baseFade = fadeIn * fadeOut;

    // ── Loot beam for rare+ drops ──
    const dRarity = gi.displayRarity ?? gi.rarity ?? 'common';
    const beamH = gi.kind === 'trophy' ? 100 : (RARITY_BEAM[dRarity] ?? 0);
    if (beamH > 0) {
      const isHighBeam = gi.kind === 'trophy' || (RARITY_IS_HIGH[dRarity] ?? false);
      const beamAlpha = baseFade * (0.3 + Math.sin(totalTime * 2 + gi.id) * 0.1);
      const beamGrad = ctx.createLinearGradient(gi.x, gi.y, gi.x, gi.y - beamH);
      const beamColor = gi.kind === 'trophy' ? '#ffffff' : gi.color;
      beamGrad.addColorStop(0, beamColor + Math.round(beamAlpha * 180).toString(16).padStart(2, '0'));
      beamGrad.addColorStop(1, beamColor + '00');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(gi.x - 2, gi.y - beamH, 4, beamH);
      // Wider glow for rare+ drops
      ctx.globalAlpha = beamAlpha * 0.35;
      ctx.fillRect(gi.x - 6, gi.y - beamH, 12, beamH);
      ctx.globalAlpha = 1;
      // Extra-wide glow for legendary/unique/trophy
      if (isHighBeam) {
        ctx.globalAlpha = beamAlpha * 0.2;
        ctx.fillRect(gi.x - 10, gi.y - beamH, 20, beamH);
        ctx.globalAlpha = 1;
      }
    }

    // ── Pill rendering for ALL drop types ──
    const isEquipOrTrophy = gi.kind === 'equipment' || gi.kind === 'trophy';
    const isHigh = RARITY_IS_HIGH[dRarity] ?? false;
    const fontSize = isEquipOrTrophy ? 11 : isHigh ? 13 : 9;
    ctx.font = `bold ${fontSize}px monospace`;
    const textW = ctx.measureText(gi.label).width;
    const padX = isEquipOrTrophy ? 8 : 6;
    const padY = isEquipOrTrophy ? 4 : 3;
    const pillW = textW + padX * 2;
    const pillH = fontSize + padY * 2;
    const px = gi.x - pillW / 2;
    const py = gi.y - pillH / 2;

    // Subtle pulse
    const pulse = 0.85 + Math.sin(totalTime * 3 + gi.id) * 0.1;

    ctx.globalAlpha = baseFade;

    // Background
    const bgAlpha = gi.hovered ? 0.9 : 0.75;
    ctx.fillStyle = `rgba(15, 15, 25, ${(bgAlpha * pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, 4);
    ctx.fill();

    // Border + glow
    const borderColor = gi.kind === 'trophy' ? '#fbbf24' : gi.color;
    if (gi.hovered || gi.kind === 'trophy') {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = gi.kind === 'trophy' ? 12 : 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (isHigh) {
      ctx.strokeStyle = gi.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowColor = gi.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Text
    ctx.fillStyle = gi.kind === 'trophy' ? '#ffffff' : gi.color;
    ctx.globalAlpha = baseFade * pulse;
    ctx.fillText(gi.label, gi.x, gi.y);
    ctx.globalAlpha = 1;
  }

  // ── Floaters ──
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of state.floaters) {
    const alpha = Math.max(0, 1 - f.age / f.maxAge);
    ctx.globalAlpha = alpha;
    const size = f.isCrit ? 20 : f.text.length > 5 ? 13 : 15;
    ctx.font = f.isCrit ? `bold ${size}px monospace` : `${size}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Restore from camera
  ctx.restore();

  // ── HUD (screen-space) ──

  // Low HP warning
  if (playerMaxHp > 0) {
    const hpRatio = playerHp / playerMaxHp;
    if (hpRatio < 0.3) {
      const intensity = hpRatio < 0.15 ? 0.35 + Math.sin(totalTime * 6) * 0.15 : 0.15 + Math.sin(totalTime * 3) * 0.08;
      const vig = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.7);
      vig.addColorStop(0, 'rgba(220, 38, 38, 0)');
      vig.addColorStop(1, `rgba(220, 38, 38, ${intensity.toFixed(3)})`);
      ctx.fillStyle = vig; ctx.fillRect(0, 0, width, height);
    }
  }

  // Room progress
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '12px monospace'; ctx.fillStyle = '#9ca3af';
  ctx.fillText(`Rooms: ${state.roomsCleared}/${state.totalRooms}`, 8, 8);
  ctx.fillText(`Kills: ${state.totalKills}`, 8, 24);

  const elapsed = Math.floor((Date.now() - state.mapStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, 8, 40);

  // ── Player Debuff HUD Icons (below room/kills/time) ──
  if (state.playerDebuffs.length > 0) {
    let debHudY = 58;
    const debuffColors: Record<string, string> = {
      slow: '#22d3ee', poison: '#4ade80', bleed: '#f87171', chill: '#22d3ee', curse: '#c084fc',
    };
    const debuffLabels: Record<string, string> = {
      slow: 'SLOW', poison: 'POISON', bleed: 'BLEED', chill: 'CHILL', curse: 'CURSE',
    };
    for (const deb of state.playerDebuffs) {
      const c = debuffColors[deb.type] ?? '#e5e7eb';
      // Small colored square
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(8, debHudY, 10, 10);
      ctx.globalAlpha = 1;
      // Label + remaining time
      ctx.font = '10px monospace';
      ctx.fillStyle = c;
      ctx.fillText(`${debuffLabels[deb.type] ?? deb.type} ${deb.remainingTime.toFixed(1)}s`, 22, debHudY + 8);
      debHudY += 14;
    }
  }

  // Boss HP bar (wide, top of screen)
  if (state.bossMob && !state.bossMob.dead) {
    const boss = state.bossMob;
    const bossBarW = Math.min(400, width * 0.6);
    const bossBarH = 12;
    const bossBarX = (width - bossBarW) / 2;
    const bossBarY = 56;
    const bossHpPct = Math.max(0, boss.hp / boss.maxHp);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(bossBarX - 2, bossBarY - 2, bossBarW + 4, bossBarH + 4);
    // HP fill
    const bossHpColor = bossHpPct > 0.5 ? boss.color : bossHpPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = bossHpColor;
    ctx.fillRect(bossBarX, bossBarY, bossBarW * bossHpPct, bossBarH);
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bossBarX - 1, bossBarY - 1, bossBarW + 2, bossBarH + 2);
    // Boss name above bar
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = boss.color;
    ctx.fillText(boss.name, width / 2, bossBarY - 5);
    // Phase indicator
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = '10px monospace'; ctx.fillStyle = '#9ca3af';
    ctx.fillText(`Phase ${boss.phase}`, bossBarX + bossBarW, bossBarY + bossBarH + 14);
    // HP text
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '10px monospace'; ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, width / 2, bossBarY + bossBarH / 2);
  }

  // Boss defeated banner
  if (state.bossDefeatedBanner > 0) {
    const bannerAlpha = Math.min(1, state.bossDefeatedBanner / 0.5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = bannerAlpha;
    ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#fbbf24';
    ctx.fillText('BOSS DEFEATED', width / 2, height * 0.3);
    ctx.font = '16px monospace'; ctx.fillStyle = '#fde68a';
    ctx.fillText('Loot dropped!', width / 2, height * 0.3 + 40);
    ctx.globalAlpha = 1;
  }

  // Map complete banner
  if (state.phase === 'complete') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#60a5fa';
    ctx.fillText('MAP COMPLETE', width / 2, height * 0.35);
    ctx.font = '16px monospace'; ctx.fillStyle = '#93c5fd';
    ctx.fillText(`${state.totalKills} kills · ${state.roomsCleared} rooms`, width / 2, height * 0.35 + 40);
    if (Math.floor(totalTime * 2) % 2 === 0) {
      ctx.font = '13px monospace'; ctx.fillStyle = '#6b7280';
      ctx.fillText('Press ENTER to continue', width / 2, height * 0.35 + 70);
    }
  }

  // Failed banner
  if (state.phase === 'failed') {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.5)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#fca5a5';
    ctx.fillText('DEFEATED', width / 2, height * 0.35);
    ctx.font = '14px monospace'; ctx.fillStyle = '#d4d4d8';
    ctx.fillText('Map failed', width / 2, height * 0.35 + 40);
    if (Math.floor(totalTime * 2) % 2 === 0) {
      ctx.font = '13px monospace'; ctx.fillStyle = '#6b7280';
      ctx.fillText('Press ENTER to return', width / 2, height * 0.35 + 70);
    }
  }

  // ── Map HUD extras (fragments, map counter, downfarm) ──
  if (_mapHud) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    let hudY = 8;

    // Zone name
    if (_mapHud.selectedZoneName) {
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#60a5fa';
      ctx.fillText(_mapHud.selectedZoneName, width - 8, hudY);
      hudY += 16;
    }

    // Map counter (X/5 → BOSS READY)
    if (_mapHud.mapsCompleted !== undefined && _mapHud.mapsBeforeBoss !== undefined) {
      const count = _mapHud.mapsCompleted % _mapHud.mapsBeforeBoss;
      const bossReady = count === 0 && _mapHud.mapsCompleted > 0;
      ctx.font = '12px monospace';
      if (bossReady || state.isBossMap) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(state.isBossMap ? 'BOSS MAP' : 'BOSS READY', width - 8, hudY);
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(`Map ${count}/${_mapHud.mapsBeforeBoss}`, width - 8, hudY);
      }
      hudY += 16;
    }

    // Map fragments
    if (_mapHud.mapFragments !== undefined) {
      ctx.font = '12px monospace'; ctx.fillStyle = '#c084fc';
      ctx.fillText(`Fragments: ${_mapHud.mapFragments}`, width - 8, hudY);
      hudY += 16;
    }

    // Corrupted tier
    if (_mapHud.corruptedTier && _mapHud.corruptedTier > 0) {
      ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#c084fc';
      ctx.fillText(`CORRUPTED T${_mapHud.corruptedTier}`, width - 8, hudY);
      hudY += 16;

      // Modifier badges
      if (_mapHud.modifierLabels && _mapHud.modifierLabels.length > 0) {
        ctx.font = '10px monospace'; ctx.fillStyle = '#a78bfa';
        for (const label of _mapHud.modifierLabels) {
          ctx.fillText(label, width - 8, hudY);
          hudY += 13;
        }
      }
    }

    // Temporal timer
    if (_mapHud.timerRemaining !== undefined && _mapHud.timerRemaining !== null) {
      const mins = Math.floor(_mapHud.timerRemaining / 60);
      const secs = Math.floor(_mapHud.timerRemaining % 60);
      const urgent = _mapHud.timerRemaining < 30;
      ctx.font = `bold 14px monospace`;
      ctx.fillStyle = urgent ? '#ef4444' : '#fbbf24';
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, width - 8, hudY);
      hudY += 18;
    }

    // Downfarm warning
    if (_mapHud.isDownfarmed) {
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ef4444';
      ctx.fillText('DOWNFARMED (-50% XP)', width - 8, hudY);
    }
  }

  // Crit flash
  if (state.critFlashTimer > 0) {
    const cf = state.critFlashTimer / 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${(cf * 0.1).toFixed(3)})`; ctx.fillRect(0, 0, width, height);
  }

  // ── Skill Cooldown Bar (bottom center) ──
  if (_skillCooldowns && _skillCooldowns.length > 0) {
    const slotW = 64;
    const slotH = 32;
    const gap = 4;
    const totalW = _skillCooldowns.length * (slotW + gap) - gap;
    const barX = (width - totalW) / 2;
    const barY = height - slotH - 12;

    for (let i = 0; i < _skillCooldowns.length; i++) {
      const sk = _skillCooldowns[i];
      const sx = barX + i * (slotW + gap);

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(sx, barY, slotW, slotH);

      // Cooldown overlay (fills from top)
      if (sk.cooldownPct > 0) {
        const cdH = slotH * sk.cooldownPct;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sx, barY, slotW, cdH);
        ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
        ctx.fillRect(sx, barY, slotW, cdH);
      }

      // Active cast highlight
      const isCasting = sk.skillId === state.lastCastSkillId && state.lastCastTimer > 0;
      if (isCasting) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, barY, slotW, slotH);
      } else {
        ctx.strokeStyle = sk.cooldownPct > 0 ? 'rgba(100,100,120,0.4)' : 'rgba(150,150,170,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, barY, slotW, slotH);
      }

      // Skill name
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '10px monospace';
      ctx.fillStyle = sk.cooldownPct > 0 ? '#6b7280' : '#d1d5db';
      const displayName = sk.name.length > 8 ? sk.name.slice(0, 7) + '.' : sk.name;
      ctx.fillText(displayName, sx + slotW / 2, barY + slotH / 2);

      // Ready glow
      if (sk.cooldownPct <= 0 && !sk.isOnGcd) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(sx, barY, slotW, slotH);
      }
    }
  }
}

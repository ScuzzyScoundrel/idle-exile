// ============================================================
// Map Rendering — Room walls, floors, mobs, hazards, loot, HUD
// Reuses arena rendering patterns for mobs/particles/loot.
// ============================================================

import type { MapState } from './mapTypes';
import type { SkillCooldownInfo, ArenaRenderOpts } from '../arena/arenaTypes';
import { PLAYER_ATTACK_RANGE, SPLASH_RADIUS_AOE } from '../arena/arenaTypes';
import { GEM_COLLECT_ANIM } from '../arena/arenaCombatFeedback';
import { ARENA_AFFIX_DEFS } from '../arena/arenaAffixes';
import { anyMapMobInRange, mobCanAttackMapPlayer } from './mapEngine';

export function renderMap(
  ctx: CanvasRenderingContext2D,
  state: MapState,
  playerHp: number,
  playerMaxHp: number,
  playerEs: number,
  _killCount: number,
  _skillCooldowns?: SkillCooldownInfo[],
  _opts?: ArenaRenderOpts,
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

  // ── Room Floors ──
  for (const room of state.layout.rooms) {
    if (!room.entered) {
      // Unexplored: dark silhouette
      ctx.fillStyle = 'rgba(15, 15, 25, 0.95)';
      ctx.fillRect(room.x, room.y, room.width, room.height);
      continue;
    }

    // Explored room floor
    const isCurrentRoom = room.id === state.currentRoomId;
    ctx.fillStyle = isCurrentRoom ? '#0f0f18' : '#0a0a12';
    ctx.fillRect(room.x, room.y, room.width, room.height);

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

  // ── Walls ──
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 3;
  for (const room of state.layout.rooms) {
    for (const wall of room.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
  }
  // Wall glow for visibility
  ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
  ctx.lineWidth = 6;
  for (const room of state.layout.rooms) {
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
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r, ang - 0.8, ang + 0.8);
        ctx.lineWidth = 4 * (1 - t);
        ctx.strokeStyle = sv.color;
        ctx.stroke();
        break;
      }
      case 'ring': {
        const r = SPLASH_RADIUS_AOE * Math.min(1, t * 3);
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 3 * (1 - t);
        ctx.stroke();
        break;
      }
      case 'cone': {
        const ang = sv.angle ?? 0;
        const half = sv.halfAngle ?? Math.PI / 4;
        const len = (sv.length ?? 50) * Math.min(1, t * 5);
        ctx.beginPath();
        ctx.moveTo(sv.x, sv.y);
        ctx.arc(sv.x, sv.y, len, ang - half, ang + half);
        ctx.closePath();
        ctx.fillStyle = sv.color + '30';
        ctx.fill();
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 2 * (1 - t);
        ctx.stroke();
        break;
      }
      case 'projectile': {
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = sv.color;
        ctx.fill();
        break;
      }
      case 'chain': {
        ctx.lineWidth = 2 * (1 - t);
        ctx.strokeStyle = sv.color;
        let prev = { x: sv.x, y: sv.y };
        for (const tgt of sv.targets ?? []) {
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
          ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 5 * (1 - t), 0, Math.PI * 2); ctx.fillStyle = sv.color; ctx.fill();
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

  // Map complete banner
  if (state.phase === 'complete') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px monospace'; ctx.fillStyle = '#60a5fa';
    ctx.fillText('MAP COMPLETE', width / 2, height * 0.35);
    ctx.font = '14px monospace'; ctx.fillStyle = '#93c5fd';
    ctx.fillText(`${state.totalKills} kills · ${state.roomsCleared} rooms`, width / 2, height * 0.35 + 35);
  }

  // Crit flash
  if (state.critFlashTimer > 0) {
    const cf = state.critFlashTimer / 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${(cf * 0.1).toFixed(3)})`; ctx.fillRect(0, 0, width, height);
  }
}

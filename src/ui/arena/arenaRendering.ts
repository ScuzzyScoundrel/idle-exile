// ============================================================
// Arena Rendering — The renderArena function (~1300 lines)
// Pure Canvas2D rendering, zero dependencies on game engine.
// ============================================================

import type { ArenaState, SkillCooldownInfo, ArenaRenderOpts, ArenaAffixId } from './arenaTypes';
import { ARENA_AFFIX_DEFS } from './arenaAffixes';
import { PLAYER_ATTACK_RANGE, SPLASH_RADIUS_AOE } from './arenaTypes';
import { GEM_COLLECT_ANIM } from './arenaCombatFeedback';
import { anyMobInRange, mobCanAttackPlayer } from './arenaEngine';
import { GROUND_ITEM_COLLECT_ANIM, PROJECTILE_SPEED } from './arenaEngine';
import { formatAffix } from '../../engine/items';

// ── Ground Item Constants (used only for rendering expiry fade) ──
const GROUND_ITEM_MAX_AGE = 30;

export function renderArena(
  ctx: CanvasRenderingContext2D,
  state: ArenaState,
  playerHp: number,
  playerMaxHp: number,
  playerEs: number,
  killCount: number,
  skillCooldowns?: SkillCooldownInfo[],
  opts?: ArenaRenderOpts,
): void {
  const { width, height, totalTime } = state;

  // ── Background ──
  ctx.fillStyle = '#08080e';
  ctx.fillRect(0, 0, width, height);

  // Zone background image
  if (opts?.bgImage && opts.bgImage.complete) {
    ctx.globalAlpha = 0.35; // darken for readability
    ctx.drawImage(opts.bgImage, 0, 0, width, height);
    ctx.globalAlpha = 1;
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
  }

  // ── Screen shake + camera ──
  ctx.save();
  if (state.shakeTimer > 0) {
    const t = state.shakeTimer / 0.15;
    const intensity = state.shakeIntensity * t;
    const sx = (Math.random() - 0.5) * 2 * intensity;
    const sy = (Math.random() - 0.5) * 2 * intensity;
    ctx.translate(sx, sy);
  }
  // Camera offset — all world-space rendering below is offset
  ctx.translate(-state.camera.x, -state.camera.y);

  // Subtle grid (camera-relative)
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  const gridSize = 48;
  const gridStartX = Math.floor(state.camera.x / gridSize) * gridSize;
  const gridStartY = Math.floor(state.camera.y / gridSize) * gridSize;
  for (let x = gridStartX; x < state.camera.x + width + gridSize; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, state.camera.y); ctx.lineTo(x, state.camera.y + height); ctx.stroke();
  }
  for (let y = gridStartY; y < state.camera.y + height + gridSize; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(state.camera.x, y); ctx.lineTo(state.camera.x + width, y); ctx.stroke();
  }

  // World boundary visual
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, state.worldWidth, state.worldHeight);

  // ── Player trail (afterimages) ──
  for (const dot of state.trail) {
    const alpha = Math.max(0, 0.25 * (1 - dot.age / 0.25));
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, state.playerRadius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59, 130, 246, ${alpha.toFixed(3)})`;
    ctx.fill();
  }

  // ── Skill visuals ──
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
      case 'projectile': {
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = sv.color;
        ctx.fill();
        // Small trail
        ctx.beginPath();
        ctx.arc(sv.x - (sv.dx ?? 0) * 12, sv.y - (sv.dy ?? 0) * 12, 2, 0, Math.PI * 2);
        ctx.fillStyle = sv.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.fill();
        break;
      }
      case 'ring': {
        const r = SPLASH_RADIUS_AOE * Math.min(1, t * 3);
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 3 * (1 - t);
        ctx.stroke();
        ctx.fillStyle = sv.color.includes('rgba') ? sv.color : sv.color + '15';
        ctx.fill();
        break;
      }
      case 'chain': {
        ctx.lineWidth = 2 * (1 - t);
        ctx.strokeStyle = sv.color;
        let prev = { x: sv.x, y: sv.y };
        for (const tgt of sv.targets ?? []) {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(tgt.x, tgt.y);
          ctx.stroke();
          // Hit spark at target
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, 5 * (1 - t), 0, Math.PI * 2);
          ctx.fillStyle = sv.color;
          ctx.fill();
          prev = tgt;
        }
        break;
      }
      case 'cone': {
        // Directed cone — fills from player toward target
        const ang = sv.angle ?? 0;
        const half = sv.halfAngle ?? Math.PI / 4;
        const len = (sv.length ?? 50) * Math.min(1, t * 5); // expand fast
        ctx.beginPath();
        ctx.moveTo(sv.x, sv.y);
        ctx.arc(sv.x, sv.y, len, ang - half, ang + half);
        ctx.closePath();
        // Bright edge, dark fill
        ctx.fillStyle = sv.color.includes('rgba') ? sv.color : sv.color + '30';
        ctx.fill();
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = 2 * (1 - t);
        ctx.stroke();
        break;
      }
      case 'fan': {
        // Multiple projectiles in a spread
        const dirs = sv.fanDirs ?? [];
        const travel = 120 * Math.min(1, t * 3);
        for (const dir of dirs) {
          const px = sv.x + dir.dx * travel;
          const py = sv.y + dir.dy * travel;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = sv.color;
          ctx.fill();
          // Trail
          ctx.beginPath();
          ctx.arc(px - dir.dx * 8, py - dir.dy * 8, 1.5, 0, Math.PI * 2);
          ctx.globalAlpha = alpha * 0.4;
          ctx.fill();
          ctx.globalAlpha = alpha;
        }
        break;
      }
      case 'dash': {
        // Afterimage trail — 5 fading copies along dash path
        const sx = sv.startX ?? sv.x;
        const sy = sv.startY ?? sv.y;
        const copies = 5;
        for (let i = 0; i < copies; i++) {
          const frac = i / copies;
          const cx = sx + (sv.x - sx) * frac;
          const cy = sy + (sv.y - sy) * frac;
          const copyAlpha = alpha * (1 - frac) * 0.5;
          ctx.globalAlpha = copyAlpha;
          ctx.beginPath();
          ctx.arc(cx, cy, state.playerRadius * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = sv.color;
          ctx.fill();
        }
        break;
      }
      case 'trap': {
        const armed = sv.age > 0.3;
        const pulse = armed ? 0.4 + Math.sin(totalTime * 8) * 0.3 : 0.2;
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, armed ? 22 : 16, 0, Math.PI * 2);
        ctx.strokeStyle = sv.color;
        ctx.lineWidth = armed ? 2 : 1;
        ctx.setLineDash(armed ? [] : [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = sv.color.includes('rgba')
          ? sv.color.replace(/[\d.]+\)$/, `${pulse.toFixed(2)})`)
          : sv.color + Math.round(pulse * 40).toString(16).padStart(2, '0');
        ctx.fill();
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

  // ── Arena Traps (persistent spinning blades) ──
  for (const trap of state.traps) {
    const t = trap.detonated ? trap.detonateTimer / 0.5 : 0;

    if (trap.detonated) {
      // Detonation: expanding orange ring
      const detR = 20 + t * SPLASH_RADIUS_AOE * 0.6;
      const alpha = Math.max(0, 1 - t);
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, detR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${(alpha * 0.8).toFixed(2)})`;
      ctx.lineWidth = 3 * (1 - t);
      ctx.stroke();
      ctx.fillStyle = `rgba(249, 115, 22, ${(alpha * 0.1).toFixed(2)})`;
      ctx.fill();
      continue;
    }

    const armPulse = trap.armed ? 0.6 + Math.sin(totalTime * 6) * 0.3 : 0.3;
    const trapRadius = trap.armed ? 18 : 14;
    const bladeCount = 3;

    // Glow ring when armed
    if (trap.armed) {
      const glow = ctx.createRadialGradient(trap.x, trap.y, 0, trap.x, trap.y, trapRadius * 2.5);
      glow.addColorStop(0, `rgba(249, 115, 22, ${armPulse.toFixed(2)})`);
      glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, trapRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    // Spinning blades (3 lines through center)
    ctx.lineWidth = trap.armed ? 2.5 : 1.5;
    ctx.strokeStyle = trap.armed ? '#fb923c' : '#9ca3af';
    for (let i = 0; i < bladeCount; i++) {
      const ang = trap.rotation + (Math.PI * 2 / bladeCount) * i;
      ctx.beginPath();
      ctx.moveTo(
        trap.x + Math.cos(ang) * trapRadius,
        trap.y + Math.sin(ang) * trapRadius,
      );
      ctx.lineTo(
        trap.x - Math.cos(ang) * trapRadius,
        trap.y - Math.sin(ang) * trapRadius,
      );
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(trap.x, trap.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = trap.armed ? '#f97316' : '#6b7280';
    ctx.fill();

    // Outer circle
    ctx.beginPath();
    ctx.arc(trap.x, trap.y, trapRadius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = trap.armed ? `rgba(251, 146, 60, ${armPulse.toFixed(2)})` : 'rgba(156, 163, 175, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash(trap.armed ? [] : [3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Ground Hazards (fire/poison pools) ──
  for (const h of state.hazards) {
    const ht = h.age / h.maxAge;
    const hAlpha = Math.max(0, ht < 0.1 ? ht / 0.1 : ht > 0.8 ? (1 - ht) / 0.2 : 1) * 0.6;
    const isFire = h.type === 'fire';
    const hColor1 = isFire ? 'rgba(249, 115, 22,' : 'rgba(74, 222, 128,';
    const hColor2 = isFire ? 'rgba(239, 68, 68,' : 'rgba(34, 197, 94,';

    // Outer glow
    const hGlow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
    hGlow.addColorStop(0, `${hColor1} ${(hAlpha * 0.5).toFixed(3)})`);
    hGlow.addColorStop(0.6, `${hColor2} ${(hAlpha * 0.25).toFixed(3)})`);
    hGlow.addColorStop(1, `${hColor1} 0)`);
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fillStyle = hGlow;
    ctx.fill();

    // Pulsing inner ring
    const pulse = 0.5 + Math.sin(totalTime * 5 + h.id) * 0.3;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius * 0.5 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `${hColor1} ${(hAlpha * 0.7).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ── Projectiles (ranged mob attacks) ──
  for (const proj of state.projectiles) {
    if (proj.hit) continue;
    const t = proj.age / proj.maxAge;
    const alpha = Math.max(0, 1 - t * 0.5);

    // Trail: 3 fading dots behind projectile
    const trailSpacing = 8;
    for (let i = 1; i <= 3; i++) {
      const tx = proj.x - (proj.vx / PROJECTILE_SPEED) * trailSpacing * i;
      const ty = proj.y - (proj.vy / PROJECTILE_SPEED) * trailSpacing * i;
      ctx.beginPath();
      ctx.arc(tx, ty, 2 - i * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.globalAlpha = alpha * (0.5 - i * 0.12);
      ctx.fill();
    }

    // Glowing orb body
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.radius * 2);
    glow.addColorStop(0, proj.color + 'cc');
    glow.addColorStop(0.5, proj.color + '44');
    glow.addColorStop(1, proj.color + '00');
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Solid core
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#dbeafe';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Mobs ──
  for (const mob of state.mobs) {
    if (mob.dead) {
      // Death: expanding fading circle
      const t = mob.deathTimer / 0.6;
      const alpha = Math.max(0, 1 - t);
      const r = mob.radius + t * 25;
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${(alpha * 0.4).toFixed(2)})`;
      ctx.fill();

      // Inner flash
      if (t < 0.3) {
        ctx.beginPath();
        ctx.arc(mob.x, mob.y, mob.radius * (1 - t * 3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.6 - t * 2).toFixed(2)})`;
        ctx.fill();
      }
      continue;
    }

    // Rare mob glow
    if (mob.isRare) {
      const pulse = 0.4 + Math.sin(totalTime * 3) * 0.15;
      const glow = ctx.createRadialGradient(mob.x, mob.y, 0, mob.x, mob.y, mob.radius * 2.2);
      glow.addColorStop(0, `rgba(245, 158, 11, ${pulse.toFixed(2)})`);
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, mob.radius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    // Body — shape varies by behavior
    if (mob.behavior === 'ranged') {
      // Ranged: diamond shape
      ctx.beginPath();
      ctx.moveTo(mob.x, mob.y - mob.radius);
      ctx.lineTo(mob.x + mob.radius, mob.y);
      ctx.lineTo(mob.x, mob.y + mob.radius);
      ctx.lineTo(mob.x - mob.radius, mob.y);
      ctx.closePath();
      ctx.fillStyle = '#60a5fa'; // blue-tinted
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (mob.behavior === 'fast') {
      // Fast: smaller, pointed (triangle facing player)
      const ang = Math.atan2(state.player.y - mob.y, state.player.x - mob.x);
      const r = mob.radius * 0.85;
      ctx.beginPath();
      ctx.moveTo(mob.x + Math.cos(ang) * r * 1.3, mob.y + Math.sin(ang) * r * 1.3);
      ctx.lineTo(mob.x + Math.cos(ang + 2.4) * r, mob.y + Math.sin(ang + 2.4) * r);
      ctx.lineTo(mob.x + Math.cos(ang - 2.4) * r, mob.y + Math.sin(ang - 2.4) * r);
      ctx.closePath();
      ctx.fillStyle = '#f97316'; // orange — aggressive
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Melee: standard circle
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, mob.radius, 0, Math.PI * 2);
      ctx.fillStyle = mob.color;
      ctx.fill();
      ctx.strokeStyle = mob.isRare ? '#fcd34d' : '#7f1d1d';
      ctx.lineWidth = mob.isRare ? 2.5 : 1.5;
      ctx.stroke();
    }

    // Ailment body tints — colored overlays on the mob circle
    if (mob.activeDebuffs && mob.activeDebuffs.length > 0) {
      const ailmentTints: Record<string, string> = {
        poisoned: 'rgba(74, 222, 128, 0.3)',   // green
        bleeding: 'rgba(248, 113, 113, 0.25)',  // red
        burning:  'rgba(249, 115, 22, 0.3)',    // orange
        shocked:  'rgba(250, 204, 21, 0.3)',    // yellow
        chilled:  'rgba(34, 211, 238, 0.3)',    // cyan
        plague_link: 'rgba(167, 139, 252, 0.3)', // purple
        vulnerable: 'rgba(248, 113, 113, 0.2)', // faint red
        cursed:   'rgba(192, 132, 252, 0.25)',  // purple
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
      // Poison drip particles (subtle)
      if (mob.activeDebuffs.includes('poisoned')) {
        const dripPhase = (totalTime * 2 + mob.x * 0.1) % 1;
        ctx.globalAlpha = 0.5 * (1 - dripPhase);
        ctx.beginPath();
        ctx.arc(mob.x + Math.sin(totalTime * 3 + mob.y) * 4, mob.y + mob.radius + dripPhase * 8, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Hit flash — white overlay for 0.05s after taking damage
    if (mob.lastHitTime >= 0 && totalTime - mob.lastHitTime < 0.05) {
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, mob.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
    }

    // HP bar
    const barW = mob.radius * 3;
    const barH = 4;
    const barX = mob.x - barW / 2;
    const barY = mob.y - mob.radius - 10;
    const hpPct = Math.max(0, mob.hp / mob.maxHp);

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Debuff indicators — small colored dots below HP bar
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
        // Pulsing dot
        const pulse = 0.6 + Math.sin(totalTime * 4 + mob.x) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(dx, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }


    // ── Arena Affix Visuals ──
    if (mob.arenaAffixes && mob.arenaAffixes.length > 0) {
      // Shielding aura ring
      if (mob.arenaAffixes.includes('shielding')) {
        const sPulse = 0.3 + Math.sin(totalTime * 2 + mob.mobId) * 0.1;
        ctx.beginPath();
        ctx.arc(mob.x, mob.y, mob.shieldAuraRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(96, 165, 250, ${sPulse.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = `rgba(96, 165, 250, ${(sPulse * 0.08).toFixed(3)})`;
        ctx.fill();
      }

      // Teleporter shimmer
      if (mob.arenaAffixes.includes('teleporter')) {
        const tPulse = 0.3 + Math.sin(totalTime * 6 + mob.mobId * 0.7) * 0.2;
        ctx.beginPath();
        ctx.arc(mob.x, mob.y, mob.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(167, 139, 252, ${tPulse.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Mortar orange dots orbiting
      if (mob.arenaAffixes.includes('mortar')) {
        for (let mi = 0; mi < 3; mi++) {
          const mAng = totalTime * 3 + (Math.PI * 2 / 3) * mi;
          const mOx = mob.x + Math.cos(mAng) * (mob.radius + 5);
          const mOy = mob.y + Math.sin(mAng) * (mob.radius + 5);
          ctx.beginPath();
          ctx.arc(mOx, mOy, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#fb923c';
          ctx.fill();
        }
      }

      // Affix name labels above HP bar
      const labelY = barY - 10;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 8px monospace';
      const affixLabels = mob.arenaAffixes.map(a => ARENA_AFFIX_DEFS[a]?.label ?? a);
      const labelText = affixLabels.join(' · ');
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(labelText, mob.x + 1, labelY + 1);
      ctx.fillStyle = mob.isRare ? '#fbbf24' : '#d4d4d8';
      ctx.fillText(labelText, mob.x, labelY);
    }
  }

  // Ambient mob rendering removed — all mobs now in state.mobs

  // ── Boss Mob ──
  if (state.bossMob) {
    const boss = state.bossMob;
    const bossAlive = !boss.dead;
    const deathFade = boss.dead ? Math.max(0, 1 - boss.deathTimer / 0.6) : 1;

    if (deathFade > 0) {
      ctx.globalAlpha = deathFade;

      // Pulsing glow ring
      const glowPulse = 1 + Math.sin(totalTime * 2) * 0.15;
      const glowR = boss.radius * 2.5 * glowPulse;
      const bossGlow = ctx.createRadialGradient(boss.x, boss.y, boss.radius * 0.5, boss.x, boss.y, glowR);
      bossGlow.addColorStop(0, boss.color + '40');
      bossGlow.addColorStop(0.6, boss.color + '15');
      bossGlow.addColorStop(1, boss.color + '00');
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = bossGlow;
      ctx.fill();

      // Boss body
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius * (boss.dead ? 1 + boss.deathTimer * 2 : 1), 0, Math.PI * 2);
      // White flash on hit
      const hitFlash = bossAlive && boss.lastHitTime > 0 && (totalTime - boss.lastHitTime) < 0.08;
      ctx.fillStyle = hitFlash ? '#ffffff' : boss.color;
      ctx.fill();

      // Boss border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Name label above
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(boss.name, boss.x, boss.y - boss.radius - 22);

      // Mini HP bar below
      if (bossAlive) {
        const bBarW = 60;
        const bBarH = 5;
        const bBarX = boss.x - bBarW / 2;
        const bBarY = boss.y + boss.radius + 8;
        const bHpPct = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bBarX - 1, bBarY - 1, bBarW + 2, bBarH + 2);
        ctx.fillStyle = bHpPct > 0.5 ? '#ef4444' : bHpPct > 0.25 ? '#f97316' : '#fbbf24';
        ctx.fillRect(bBarX, bBarY, bBarW * bHpPct, bBarH);
      }

      ctx.globalAlpha = 1;
    }

    // Remove boss entity after death animation
    if (boss.dead && boss.deathTimer > 0.6) {
      state.bossMob = null;
    }
  }

  // ── Splash effects ──
  for (const s of state.splashes) {
    const t = s.age / s.maxAge;
    const currentRadius = s.maxRadius * Math.min(1, t * 2.5);  // expand fast
    const alpha = Math.max(0, 1 - t);
    // Outer ring
    ctx.beginPath();
    ctx.arc(s.x, s.y, currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = s.color.replace(')', `, ${(alpha * 0.6).toFixed(2)})`).replace('rgb(', 'rgba(');
    ctx.lineWidth = 3 * (1 - t);
    ctx.stroke();
    // Inner fill
    ctx.fillStyle = s.color.replace(')', `, ${(alpha * 0.08).toFixed(2)})`).replace('rgb(', 'rgba(');
    ctx.fill();
  }

  // ── Player ──
  const { player, playerRadius } = state;
  const engaged = anyMobInRange(state);

  // Attack range circle — bright when engaged, dim when idle
  if (engaged) {
    const rangePulse = 0.15 + Math.sin(totalTime * 4) * 0.05;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_ATTACK_RANGE, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(59, 130, 246, ${rangePulse.toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Filled range zone
    ctx.fillStyle = `rgba(59, 130, 246, 0.03)`;
    ctx.fill();
  } else {
    // Dim dashed circle when nothing in range
    ctx.beginPath();
    ctx.setLineDash([6, 8]);
    ctx.arc(player.x, player.y, PLAYER_ATTACK_RANGE, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mob threat rings — show which mobs are close enough to attack YOU
  for (const mob of state.mobs) {
    if (mob.dead) continue;
    if (mobCanAttackPlayer(state, mob)) {
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, mob.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${(0.3 + Math.sin(totalTime * 5) * 0.15).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // I-frame blink: toggle visibility at 20Hz
  const iFrameVisible = state.iFrameTimer <= 0 || Math.floor(totalTime * 20) % 2 === 0;

  if (iFrameVisible) {
    // Glow
    const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, playerRadius * 3);
    glow.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.beginPath();
    ctx.arc(player.x, player.y, playerRadius * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Facing indicator
    const fx = player.x + state.playerFacing.x * playerRadius * 0.7;
    const fy = player.y + state.playerFacing.y * playerRadius * 0.7;
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#dbeafe';
    ctx.fill();
  }

  // Player HP bar (above player)
  const pBarW = 48;
  const pBarH = 6;
  const pBarX = player.x - pBarW / 2;
  const pBarY = player.y - playerRadius - 16;
  const pHpPct = Math.max(0, playerHp / playerMaxHp);

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(pBarX - 1, pBarY - 1, pBarW + 2, pBarH + 2);
  ctx.fillStyle = pHpPct > 0.5 ? '#22c55e' : pHpPct > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(pBarX, pBarY, pBarW * pHpPct, pBarH);

  // Energy shield overlay on HP bar
  if (playerEs > 0 && playerMaxHp > 0) {
    const esPct = Math.min(1, playerEs / playerMaxHp);
    ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
    ctx.fillRect(pBarX, pBarY, pBarW * esPct, pBarH);
  }

  // ── XP Gems ──
  for (const gem of state.gems) {
    if (gem.collected) {
      // Collect flash — expanding white ring
      const t = gem.collectTimer / GEM_COLLECT_ANIM;
      const alpha = Math.max(0, 1 - t);
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, gem.size + t * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.7).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      continue;
    }
    // Gem glow
    const pulse = 0.5 + Math.sin(totalTime * 4 + gem.x) * 0.2;
    const gemGlow = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, gem.size * 3);
    gemGlow.addColorStop(0, gem.color + Math.round(pulse * 80).toString(16).padStart(2, '0'));
    gemGlow.addColorStop(1, gem.color + '00');
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, gem.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = gemGlow;
    ctx.fill();
    // Gem body
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, gem.size, 0, Math.PI * 2);
    ctx.fillStyle = gem.color;
    ctx.fill();
  }

  // ── Shrines ──
  for (const shrine of state.shrines) {
    if (shrine.collected) continue;
    const sPulse = 0.7 + Math.sin(totalTime * 3 + shrine.id) * 0.3;
    const shrineColors: Record<string, string> = {
      damage: '#ef4444', speed: '#60a5fa', magnet: '#c084fc', bomb: '#f97316',
    };
    const sColor = shrineColors[shrine.type] ?? '#fbbf24';
    // Glow ring
    const shrGlow = ctx.createRadialGradient(shrine.x, shrine.y, 5, shrine.x, shrine.y, 30);
    shrGlow.addColorStop(0, sColor + Math.round(sPulse * 100).toString(16).padStart(2, '0'));
    shrGlow.addColorStop(1, sColor + '00');
    ctx.beginPath();
    ctx.arc(shrine.x, shrine.y, 30, 0, Math.PI * 2);
    ctx.fillStyle = shrGlow;
    ctx.fill();
    // Shrine body
    ctx.beginPath();
    ctx.arc(shrine.x, shrine.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = sColor;
    ctx.globalAlpha = sPulse;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(shrine.type.toUpperCase(), shrine.x, shrine.y + 20);
  }

  // ── Dodge roll trail ──
  if (state.dodgeRollTimer > 0) {
    const rollAlpha = state.dodgeRollTimer / 0.15;
    ctx.globalAlpha = rollAlpha * 0.5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.playerRadius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Ground Items (Phase 7 + Loot Filter Visuals) ──
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Rarity order for beam sizing
  const RARITY_BEAM: Record<string, number> = {
    common: 0, uncommon: 0, rare: 70, epic: 100, legendary: 140, unique: 140,
  };
  const RARITY_IS_HIGH: Record<string, boolean> = {
    legendary: true, unique: true,
  };

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
      const isHigh = gi.kind === 'trophy' || (RARITY_IS_HIGH[dRarity] ?? false);
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
      if (isHigh) {
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
      ctx.lineWidth = gi.kind === 'trophy' ? 1.5 : 1.5;
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

    // ── Hover tooltip for equipment ──
    if (gi.hovered && gi.item) {
      const ttFontSize = 10;
      ctx.font = `${ttFontSize}px monospace`;
      ctx.textAlign = 'left';

      const lines: { text: string; color: string }[] = [];
      const rarityLabel = gi.item.rarity.charAt(0).toUpperCase() + gi.item.rarity.slice(1);
      const slotLabel = gi.item.slot.replace(/_/g, ' ');
      lines.push({ text: `${rarityLabel} ${slotLabel}`, color: gi.color });
      if (gi.item.iLvl) lines.push({ text: `iLvl ${gi.item.iLvl}`, color: '#9ca3af' });
      if (gi.item.baseDamageMin != null && gi.item.baseDamageMax != null) {
        lines.push({ text: `Damage: ${gi.item.baseDamageMin}-${gi.item.baseDamageMax}`, color: '#e5e7eb' });
      }
      for (const [stat, val] of Object.entries(gi.item.baseStats)) {
        if (val && val !== 0) {
          const sign = val > 0 ? '+' : '';
          lines.push({ text: `${sign}${val} ${stat.replace(/_/g, ' ')}`, color: '#86efac' });
        }
      }
      for (const affix of [...gi.item.prefixes, ...gi.item.suffixes]) {
        lines.push({ text: formatAffix(affix), color: '#c4b5fd' });
      }

      let maxLineW = 0;
      for (const l of lines) {
        const w = ctx.measureText(l.text).width;
        if (w > maxLineW) maxLineW = w;
      }
      const ttPadX = 8;
      const ttPadY = 6;
      const ttLineH = ttFontSize + 3;
      const ttW = maxLineW + ttPadX * 2;
      const ttH = lines.length * ttLineH + ttPadY * 2;
      const ttX = gi.x - ttW / 2;
      const ttY = py + pillH + 4;

      ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttW, ttH, 4);
      ctx.fill();
      ctx.strokeStyle = gi.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let li = 0; li < lines.length; li++) {
        ctx.fillStyle = lines[li].color;
        ctx.fillText(lines[li].text, ttX + ttPadX, ttY + ttPadY + li * ttLineH + ttFontSize);
      }
      ctx.textAlign = 'center';
    }
  }

  // ── Damage floaters ──
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of state.floaters) {
    const alpha = Math.max(0, 1 - f.age / f.maxAge);
    ctx.globalAlpha = alpha;
    const size = f.isCrit ? 20 : f.text.length > 5 ? 13 : 15;
    ctx.font = f.isCrit ? `bold ${size}px monospace` : `${size}px monospace`;

    // Shadow for readability
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Restore from shake transform
  ctx.restore();

  // ── Low HP warning (red edge vignette) ──
  if (playerMaxHp > 0) {
    const hpRatio = playerHp / playerMaxHp;
    if (hpRatio < 0.3) {
      const intensity = hpRatio < 0.15
        ? 0.35 + Math.sin(totalTime * 6) * 0.15
        : 0.15 + Math.sin(totalTime * 3) * 0.08;
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.7,
      );
      vignette.addColorStop(0, 'rgba(220, 38, 38, 0)');
      vignette.addColorStop(1, `rgba(220, 38, 38, ${intensity.toFixed(3)})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // ── Wave announcement banner ──
  if (state.waveAnnouncementTimer > 0) {
    const wt = state.waveAnnouncementTimer / 1.5;
    const bannerAlpha = Math.min(1, wt * 3) * Math.min(1, (1 - wt) * 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = bannerAlpha;
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`WAVE ${state.currentWave}`, width / 2, height * 0.35);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`${state.waveKillTarget} kills to clear`, width / 2, height * 0.35 + 35);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Multi-kill feedback ──
  if (state.multiKillTimer > 0 && state.multiKillCount >= 2) {
    const mt = state.multiKillTimer / 1.2;
    const label = state.multiKillCount >= 5 ? 'MASSACRE!'
      : state.multiKillCount >= 3 ? 'TRIPLE KILL!'
      : 'DOUBLE KILL!';
    const mColor = state.multiKillCount >= 5 ? '#f97316'
      : state.multiKillCount >= 3 ? '#fbbf24'
      : '#d4d4d8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = Math.min(1, mt * 4) * Math.min(1, mt);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = mColor;
    ctx.fillText(label, width / 2, height * 0.45);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Crit flash ──
  if (state.critFlashTimer > 0) {
    const cf = state.critFlashTimer / 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${(cf * 0.1).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Death screen overlay ──
  if (opts?.combatPhase === 'zone_defeat' || opts?.combatPhase === 'boss_defeat') {
    // Red vignette
    ctx.fillStyle = 'rgba(127, 29, 29, 0.6)';
    ctx.fillRect(0, 0, width, height);
    // "DEFEATED" text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('DEFEATED', width / 2, height / 2 - 20);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#d4d4d8';
    ctx.fillText('Recovering...', width / 2, height / 2 + 25);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Boss entrance flash ──
  if (state.bossEntranceTimer > 0) {
    const t = state.bossEntranceTimer / 1.5;
    // White flash that fades
    if (t > 0.8) {
      const flashAlpha = (t - 0.8) / 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${(flashAlpha * 0.5).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
    // Boss name banner
    if (t < 0.9) {
      const bannerAlpha = Math.min(1, (0.9 - t) / 0.3) * Math.min(1, t / 0.1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = bannerAlpha;
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`BOSS: ${opts?.bossName ?? 'Unknown'}`, width / 2, height * 0.3);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }
  }

  // ── Invasion overlay ──
  if (opts?.isInvaded) {
    // Dark purple tint
    ctx.fillStyle = 'rgba(88, 28, 135, 0.15)';
    ctx.fillRect(0, 0, width, height);
    // Banner
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = `rgba(192, 132, 252, ${(0.7 + Math.sin(totalTime * 3) * 0.2).toFixed(2)})`;
    ctx.fillText('INVASION', width / 2, height - 80);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Frenzy mode ──
  if (state.frenzyTimer > 0) {
    const fAlpha = Math.min(1, state.frenzyTimer / 0.5) * 0.12;
    ctx.fillStyle = `rgba(250, 204, 21, ${fAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = `rgba(250, 204, 21, ${(0.6 + Math.sin(totalTime * 6) * 0.3).toFixed(2)})`;
    ctx.fillText('FRENZY!', width / 2, 60);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Combo state icons (near player, screen-space) ──
  if (opts?.comboStates && opts.comboStates.length > 0) {
    const comboX = 8;
    let comboY = 160;
    ctx.font = '11px monospace';
    for (const cs of opts.comboStates) {
      const label = cs.stateId.replace(/_/g, ' ');
      const dur = cs.remainingDuration.toFixed(1);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(comboX, comboY, 140, 18);
      ctx.fillStyle = cs.stateId === 'exposed' ? '#fbbf24'
        : cs.stateId === 'deep_wound' ? '#f87171'
        : cs.stateId === 'shadow_momentum' ? '#a78bfa' : '#d4d4d8';
      ctx.fillText(`${label} ${dur}s`, comboX + 4, comboY + 3);
      comboY += 22;
    }
  }

  // ── Class resource visual ──
  if (opts?.classResourceType && (opts.classResourceStacks ?? 0) > 0) {
    const resX = width - 140;
    const resY = height - 80;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(resX, resY, 130, 22);
    ctx.font = '11px monospace';
    const stacks = opts.classResourceStacks ?? 0;
    switch (opts.classResourceType) {
      case 'momentum':
        ctx.fillStyle = '#818cf8';
        ctx.fillText(`Momentum: ${stacks}`, resX + 6, resY + 5);
        break;
      case 'rage':
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`Rage: ${stacks}`, resX + 6, resY + 5);
        break;
      case 'charges':
        ctx.fillStyle = '#60a5fa';
        ctx.fillText(`Charges: ${stacks}`, resX + 6, resY + 5);
        break;
      case 'tracking':
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Tracking: ${stacks}`, resX + 6, resY + 5);
        break;
      default:
        ctx.fillStyle = '#d4d4d8';
        ctx.fillText(`${opts.classResourceType}: ${stacks}`, resX + 6, resY + 5);
    }
  }

  // ── Death streak skulls ──
  if (opts?.deathStreak && opts.deathStreak > 0) {
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const skullCount = Math.min(opts.deathStreak, 10);
    const skullW = skullCount * 18 + 8;
    ctx.fillRect(8, 106, skullW, 22);
    ctx.fillStyle = '#f87171';
    let skulls = '';
    for (let i = 0; i < skullCount; i++) skulls += '\u2620';
    ctx.fillText(skulls, 12, 109);
  }

  // ── HUD overlay (not affected by shake) ──
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Kill counter
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(8, 8, 120, 28);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(`Kills: ${killCount}`, 16, 14);

  // HP readout
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(8, 42, 160, 28);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#86efac';
  ctx.fillText(`HP: ${Math.round(playerHp)} / ${Math.round(playerMaxHp)}`, 16, 48);

  // Combat status
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(8, 76, 120, 24);
  ctx.font = '12px monospace';
  if (engaged) {
    ctx.fillStyle = '#f87171';
    ctx.fillText('COMBAT', 16, 82);
  } else {
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Out of range', 16, 82);
  }

  // ── Dodge roll cooldown indicator ──
  {
    const dodgeCd = state.dodgeRollCooldown;
    const dodgeReady = dodgeCd <= 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, 106, 120, 18);
    ctx.font = '11px monospace';
    if (dodgeReady) {
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('DODGE [Space] Ready', 12, 109);
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`DODGE ${dodgeCd.toFixed(1)}s`, 12, 109);
      // Cooldown bar
      const cdPct = Math.min(1, dodgeCd / 4);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(8, 124, 120 * (1 - cdPct), 2);
    }
  }

  // ── Active shrine effects ──
  if (state.activeShrineEffects.length > 0) {
    let seY = 130;
    ctx.font = 'bold 11px monospace';
    for (const eff of state.activeShrineEffects) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(8, seY, 120, 18);
      const effColor = eff.type === 'damage' ? '#ef4444' : '#60a5fa';
      ctx.fillStyle = effColor;
      const effLabel = eff.type === 'damage' ? '\u2694 2x DMG' : '\u26A1 SPEED';
      ctx.fillText(`${effLabel} ${eff.remainingTime.toFixed(1)}s`, 12, seY + 3);
      seY += 20;
    }
  }

  // ── Zone info (top-right) ──
  if (opts?.zoneName) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const ziW = 200;
    ctx.fillRect(width - ziW - 8, 8, ziW, opts.zoneILvl ? 44 : 28);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(opts.zoneName, width - 16, 14);
    if (opts.zoneBand !== undefined || opts.zoneILvl) {
      ctx.font = '11px monospace';
      ctx.fillStyle = '#9ca3af';
      const info = `Band ${opts.zoneBand ?? '?'} · iLvl ${opts.zoneILvl ?? '?'}`;
      ctx.fillText(info, width - 16, 32);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Boss HP bar (top-center) ──
  if (opts?.combatPhase === 'boss_fight' && opts.bossName && opts.bossMaxHp) {
    const bBarW = Math.min(400, width * 0.5);
    const bBarH = 14;
    const bBarX = (width - bBarW) / 2;
    const bBarY = 10;
    const bHpPct = Math.max(0, (opts.bossHp ?? 0) / opts.bossMaxHp);

    // Boss name
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(opts.bossName, width / 2, bBarY - 1);

    // Bar background
    const bLabelY = bBarY + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bBarX - 1, bLabelY - 1, bBarW + 2, bBarH + 2);

    // HP fill
    ctx.fillStyle = bHpPct > 0.5 ? '#dc2626' : bHpPct > 0.25 ? '#f97316' : '#ef4444';
    ctx.fillRect(bBarX, bLabelY, bBarW * bHpPct, bBarH);

    // HP text
    ctx.font = '10px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      `${Math.round(opts.bossHp ?? 0)} / ${Math.round(opts.bossMaxHp)}`,
      width / 2,
      bLabelY + 1,
    );
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Skill Cooldown Bar (bottom center) ──
  if (skillCooldowns && skillCooldowns.length > 0) {
    const slotW = 64;
    const slotH = 32;
    const gap = 4;
    const totalW = skillCooldowns.length * (slotW + gap) - gap;
    const barX = (width - totalW) / 2;
    const barY = height - slotH - 12;

    for (let i = 0; i < skillCooldowns.length; i++) {
      const sk = skillCooldowns[i];
      const sx = barX + i * (slotW + gap);

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(sx, barY, slotW, slotH);

      // Cooldown overlay (fills from bottom)
      if (sk.cooldownPct > 0) {
        const cdH = slotH * sk.cooldownPct;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sx, barY, slotW, cdH);
        // Tint
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
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '10px monospace';
      ctx.fillStyle = sk.cooldownPct > 0 ? '#6b7280' : '#d1d5db';
      // Truncate name
      const displayName = sk.name.length > 8 ? sk.name.slice(0, 7) + '.' : sk.name;
      ctx.fillText(displayName, sx + slotW / 2, barY + slotH / 2);

      // "READY" or cooldown remaining visual
      if (sk.cooldownPct <= 0 && !sk.isOnGcd) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(sx, barY, slotW, slotH);
      }
    }
  }

  // ── Big HP/ES Bar (bottom-left) ──
  {
    const bigBarW = 220;
    const bigBarH = 18;
    const bigBarX = 8;
    const bigBarY = height - 54;
    const bigHpPct = playerMaxHp > 0 ? Math.max(0, playerHp / playerMaxHp) : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bigBarX - 1, bigBarY - 1, bigBarW + 2, bigBarH + 2);
    // HP fill
    ctx.fillStyle = bigHpPct > 0.5 ? '#22c55e' : bigHpPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(bigBarX, bigBarY, bigBarW * bigHpPct, bigBarH);
    // ES overlay
    if (playerEs > 0 && playerMaxHp > 0) {
      const esPct = Math.min(1, playerEs / playerMaxHp);
      ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
      ctx.fillRect(bigBarX, bigBarY, bigBarW * esPct, bigBarH);
    }
    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#fff';
    const hpText = playerEs > 0
      ? `${Math.round(playerHp)} + ${Math.round(playerEs)} ES`
      : `${Math.round(playerHp)} / ${Math.round(playerMaxHp)}`;
    ctx.fillText(hpText, bigBarX + bigBarW / 2, bigBarY + bigBarH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── XP Progress Bar (top of screen) ──
  if (opts?.playerXpToNext && opts.playerXpToNext > 0) {
    const xpBarH = 4;
    const xpPct = Math.max(0, Math.min(1, (opts.playerXp ?? 0) / opts.playerXpToNext));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, width, xpBarH);
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(0, 0, width * xpPct, xpBarH);
    // Level number
    ctx.font = '10px monospace';
    ctx.fillStyle = '#c4b5fd';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv ${opts.playerLevel ?? 1}`, 4, xpBarH + 2);
  }

  // ── Wave Counter ──
  {
    const waveText = `Wave ${state.currentWave} — ${state.waveKillCount}/${state.waveKillTarget}`;
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, 134, 140, 20);
    ctx.fillStyle = '#d4d4d8';
    ctx.fillText(waveText, 14, 138);
  }

  // ── Minimap (top-right, below zone info) ──
  {
    const mmSize = 100;
    const mmX = width - mmSize - 8;
    const mmY = 56;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmSize, mmSize);
    // Player dot (mapped from world coords)
    const scaleX = mmSize / state.worldWidth;
    const scaleY = mmSize / state.worldHeight;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(mmX + state.player.x * scaleX, mmY + state.player.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
    // Mob dots
    for (const mob of state.mobs) {
      if (mob.dead) continue;
      ctx.fillStyle = mob.isRare ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mmX + mob.x * scaleX, mmY + mob.y * scaleY, mob.isRare ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // All mobs now rendered from state.mobs (no separate ambient dots)
  }

  // ── Stats Panel (Tab toggle) ──
  if (state.showStats) {
    const panelW = 240;
    const panelH = 160;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2 - 40;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.fillText('Session Stats', panelX + panelW / 2, panelY + 16);
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#d4d4d8';
    const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const lines = [
      `Kills: ${killCount}`,
      `Time: ${mins}m ${secs.toString().padStart(2, '0')}s`,
      `Deaths: ${state.sessionDeaths}`,
      `Level: ${opts?.playerLevel ?? '?'}`,
    ];
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], panelX + 16, panelY + 38 + i * 22);
    }
    ctx.font = '10px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Press Tab to close', panelX + panelW / 2, panelY + panelH - 14);
    ctx.textAlign = 'left';
  }

  // ── Pause Overlay (Escape toggle) ──
  if (state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText('PAUSED', width / 2, height / 2 - 40);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Press Escape to resume', width / 2, height / 2 + 10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ── Combat Log (right side) ──
  {
    const logVisible = Math.min(12, state.combatLog.length);
    if (logVisible > 0) {
      const logW = 260;
      const logLineH = 14;
      const logH = logVisible * logLineH + 8;
      const logX = width - logW - 8;
      const logY = height - logH - 60;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(logX, logY, logW, logH);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(logX, logY, logW, logH);

      // Entries (newest at bottom)
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const startIdx = Math.max(0, state.combatLog.length - logVisible);
      for (let i = 0; i < logVisible; i++) {
        const entry = state.combatLog[startIdx + i];
        const lineY = logY + 4 + i * logLineH;
        // Fade older entries
        const age = (logVisible - i) / logVisible;
        ctx.globalAlpha = 0.4 + age * 0.6;
        ctx.fillStyle = entry.color;
        // Truncate long lines
        const txt = entry.text.length > 38 ? entry.text.slice(0, 37) + '\u2026' : entry.text;
        ctx.fillText(txt, logX + 4, lineY);
      }
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }

  // Controls hint (bottom-right)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('WASD move · Tab stats · Esc pause', width - 16, height - 52);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

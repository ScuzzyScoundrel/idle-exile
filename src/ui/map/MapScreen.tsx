// ============================================================
// Map Screen — PoE-style room-based active play mode
// WASD + mouse aim + auto-cast through room-based dungeons.
// ============================================================

import { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { resolveStats } from '../../engine/character';
import { ZONE_DEFS } from '../../data/zones';
import { rollZoneAttack, calcZoneAccuracy, calcLevelDamageMult } from '../../engine/zones';
import { getUnifiedSkillDef } from '../../data/skills';

import type { MapState } from './mapTypes';
import { createMapState, updateMap, getMapMobsInRange, mobCanAttackMapPlayer } from './mapEngine';
import { renderMap } from './mapRendering';
import { rollArenaLoot } from '../arena/arenaLoot';
import { calcXpScale } from '../../engine/zones/scaling';
import { PLAYER_ATTACK_RANGE } from '../arena/arenaTypes';
import {
  addDamageFloater, addKillFloater,
  addPlayerHitFloater, spawnDeathParticles, spawnGems, markMobHit,
  applyKnockback, triggerShake, triggerIFrames, markSkillCast,
  spawnSkillVisual, trackKillStreak, trackMultiKill, logCombat,
  spawnDeathHazards,
} from '../arena/arenaCombatFeedback';

// ── Constants ──

const SPATIAL_ATTACK_INTERVAL = 2.0;
const SPATIAL_DMG_BASE = 9;
const SPATIAL_DMG_ILVL_SCALE = 1.2;
const RANGED_ATTACK_INTERVAL = 2.5;
const PROJECTILE_SPEED = 200;
const PROJECTILE_RADIUS = 6;
const PROJECTILE_MAX_AGE = 2.0;
const MAP_XP_MULTIPLIER = 2.5;
// MAP_LOOT_QUALITY_BOOST will be used in Phase 2 for rarity weight adjustment

export default function MapScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MapState | null>(null);
  const keysRef = useRef(new Set<string>());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const killCountRef = useRef(0);

  const currentZoneId = useGameStore(s => s.currentZoneId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (stateRef.current) {
        stateRef.current.width = canvas.width;
        stateRef.current.height = canvas.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Init map state
    const gs0 = useGameStore.getState();
    const zone = ZONE_DEFS.find(z => z.id === gs0.currentZoneId);
    if (zone) {
      stateRef.current = createMapState(canvas.width, canvas.height, zone.band, 1, false);
    }
    killCountRef.current = 0;
    lastTimeRef.current = 0;

    // Spatial damage helper (ES absorption + death detection)
    const applySpatialDamage = (mapState: MapState, rawDamage: number, source: string) => {
      const s = useGameStore.getState();
      let remaining = rawDamage;
      if ((s.currentEs ?? 0) > 0) {
        const esAbsorbed = Math.min(s.currentEs ?? 0, remaining);
        remaining -= esAbsorbed;
        useGameStore.setState({ currentEs: (s.currentEs ?? 0) - esAbsorbed });
      }
      if (remaining > 0) {
        const newHp = Math.max(0, s.currentHp - remaining);
        useGameStore.setState({ currentHp: newHp });
        if (newHp <= 0) {
          logCombat(mapState as any, 'DEFEATED', '#fca5a5');
          mapState.phase = 'failed';
        }
      }
      logCombat(mapState as any, `${source} → ${Math.round(rawDamage)}`, '#f87171');
    };

    // ── Game Loop ──
    const loop = (time: number) => {
      if (!stateRef.current || !canvasRef.current) return;

      const dt = lastTimeRef.current
        ? Math.min((time - lastTimeRef.current) / 1000, 0.1)
        : 0.016;
      lastTimeRef.current = time;

      const map = stateRef.current;
      const gs = useGameStore.getState();

      if (!gs.currentZoneId) {
        ctx.fillStyle = '#08080e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '18px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Select a zone to enter a map', canvas.width / 2, canvas.height / 2);
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!map.paused && map.phase !== 'complete' && map.phase !== 'failed') {
        // Update spatial simulation
        updateMap(map, dt, keysRef.current);

        const zoneData = ZONE_DEFS.find(z => z.id === gs.currentZoneId);
        if (!zoneData) { animFrameRef.current = requestAnimationFrame(loop); return; }

        // ── Hazard DPS to player ──
        if (map.hazards.length > 0 && map.iFrameTimer <= 0) {
          for (const h of map.hazards) {
            const hdx = map.player.x - h.x;
            const hdy = map.player.y - h.y;
            if (Math.sqrt(hdx * hdx + hdy * hdy) < h.radius + map.playerRadius) {
              if (map.totalTime - h.lastDamageTick >= 0.5) {
                h.lastDamageTick = map.totalTime;
                const dmg = h.damagePerSec * 0.5;
                applySpatialDamage(map, dmg, h.type === 'fire' ? 'Fire Pool' : 'Poison Cloud');
                addPlayerHitFloater(map as any, dmg, false, false);
              }
            }
          }
        }

        // ── Ranged Mob Projectile Spawning ──
        let projStats: ReturnType<typeof resolveStats> | null = null;
        try { projStats = resolveStats(gs.character); } catch { /* */ }

        for (const mob of map.mobs) {
          if (mob.dead || mob.behavior !== 'ranged') continue;
          mob.attackTimer -= dt;
          if (mob.attackTimer > 0) continue;
          mob.attackTimer = RANGED_ATTACK_INTERVAL * (0.8 + Math.random() * 0.4);

          const dx = map.player.x - mob.x;
          const dy = map.player.y - mob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1 || dist > 500) continue;

          const variance = 0.8 + Math.random() * 0.4;
          const levelMult = calcLevelDamageMult(gs.character.level, zoneData.iLvlMin);
          const rawDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * levelMult * variance;

          map.projectiles.push({
            id: map.nextProjectileId++,
            x: mob.x, y: mob.y,
            vx: (dx / dist) * PROJECTILE_SPEED, vy: (dy / dist) * PROJECTILE_SPEED,
            radius: PROJECTILE_RADIUS, color: '#60a5fa',
            age: 0, maxAge: PROJECTILE_MAX_AGE,
            damage: rawDmg, sourceMobId: mob.mobId, hit: false,
          });
        }

        // ── Projectile-Player Collision ──
        if (projStats) {
          const zoneAccuracy = calcZoneAccuracy(zoneData.band, gs.character.level, zoneData.iLvlMin);
          for (const proj of map.projectiles) {
            if (proj.hit || proj.isMortar) continue;
            const pdx = map.player.x - proj.x;
            const pdy = map.player.y - proj.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) > proj.radius + map.playerRadius) continue;
            proj.hit = true;
            if (map.iFrameTimer > 0) continue;
            const roll = rollZoneAttack(proj.damage, 0.7, zoneAccuracy, projStats!, undefined, undefined, zoneData.band);
            addPlayerHitFloater(map as any, Math.round(roll.damage), roll.isDodged, roll.isBlocked);
            if (!roll.isDodged && !roll.isBlocked && roll.damage > 0) {
              triggerIFrames(map as any);
              applySpatialDamage(map, roll.damage, 'Projectile');
            }
          }
        }

        // ── Melee Mob Attacks ──
        if (projStats) {
          const levelMult = calcLevelDamageMult(gs.character.level, zoneData.iLvlMin);
          const zoneAccuracy = calcZoneAccuracy(zoneData.band, gs.character.level, zoneData.iLvlMin);
          for (const mob of map.mobs) {
            if (mob.dead || mob.behavior === 'ranged') continue;
            mob.attackTimer -= dt;
            if (mob.attackTimer > 0) continue;
            if (!mobCanAttackMapPlayer(map, mob)) { mob.attackTimer = 0; continue; }
            mob.attackTimer = SPATIAL_ATTACK_INTERVAL * (0.8 + Math.random() * 0.4);
            const dmgMult = mob.behavior === 'fast' ? 0.6 : 1.0;
            const variance = 0.8 + Math.random() * 0.4;
            const rawDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * levelMult * variance * dmgMult;
            const roll = rollZoneAttack(rawDmg, 0.7, zoneAccuracy, projStats!, undefined, undefined, zoneData.band);
            addPlayerHitFloater(map as any, Math.round(roll.damage), roll.isDodged, roll.isBlocked);
            if (!roll.isDodged && !roll.isBlocked && roll.damage > 0) {
              triggerIFrames(map as any);
              applySpatialDamage(map, roll.damage, 'Melee');
            }
          }
        }

        // ── Combat Ticks (auto-cast skill rotation) ──
        while (map.tickAccumulator >= 0.25) {
          map.tickAccumulator -= 0.25;

          const tickGs = useGameStore.getState();
          const mobsInRange = getMapMobsInRange(map, PLAYER_ATTACK_RANGE);
          if (mobsInRange.length === 0) continue;

          // Build a temporary pack from in-range mobs for the engine
          const now = Date.now();
          const tempPack: import('../../types/combat').MobInPack[] = mobsInRange.map(m => ({
            hp: m.hp,
            maxHp: m.maxHp,
            rare: m.isRare ? {
              affixes: [] as import('../../types/combat').RareAffixId[],
              combinedHpMult: 1, combinedLootMult: 1, combinedDamageMult: 1,
              combinedAtkSpeedMult: 1, combinedDamageTakenMult: 1, combinedRegenPerSec: 0,
            } : null,
            damageElement: 'physical' as const,
            physRatio: 1,
            debuffs: [] as import('../../types/combat').ActiveDebuff[],
            nextAttackAt: now + 5000,
          }));

          // Set store to temp pack, tick combat, read results
          useGameStore.setState({ packMobs: tempPack, currentPackSize: tempPack.length });
          const result = tickGs.tickCombat(0.25);
          const postPack = useGameStore.getState().packMobs;

          // Count kills and sync HP back to visual mobs
          let kills = 0;
          for (let i = 0; i < mobsInRange.length; i++) {
            const visMob = mobsInRange[i];
            if (i < postPack.length) {
              const prevHp = visMob.hp;
              visMob.hp = postPack[i].hp;
              visMob.maxHp = postPack[i].maxHp;
              const hpDelta = prevHp - postPack[i].hp;

              if (hpDelta > 0 && postPack[i].hp > 0) {
                markMobHit(map as any, visMob);
                applyKnockback(map as any, visMob);
                addDamageFloater(map as any, hpDelta, result.isCrit, visMob);
              }
              if (postPack[i].hp <= 0 && prevHp > 0) {
                visMob.dead = true;
                visMob.deathTimer = 0;
                kills++;
                addKillFloater(map as any, visMob);
                spawnDeathParticles(map as any, visMob);
                spawnDeathHazards(map as any, visMob, zoneData.band);
                spawnGems(map as any, visMob, 2 + Math.floor(Math.random() * 3));
                if (Math.random() < 0.3) spawnGems(map as any, visMob, 1, true);
              }
            } else {
              // Engine killed this mob (popped from front)
              if (!visMob.dead) {
                visMob.dead = true;
                visMob.deathTimer = 0;
                kills++;
                addKillFloater(map as any, visMob);
                spawnDeathParticles(map as any, visMob);
                spawnDeathHazards(map as any, visMob, zoneData.band);
                spawnGems(map as any, visMob, 2 + Math.floor(Math.random() * 3));
              }
            }
          }

          // Skill visual feedback
          if (result.skillFired && result.skillId) {
            markSkillCast(map as any, result.skillId);
            const visDef = getUnifiedSkillDef(result.skillId);
            const visTarget = mobsInRange.find(m => !m.dead) ?? null;
            if (visDef?.tags) spawnSkillVisual(map as any, visDef.tags, visTarget as any);
          }

          // Crit feedback
          if (result.isCrit && result.damageDealt > 0) {
            triggerShake(map as any, 4);
            map.critFlashTimer = 0.03;
            map.hitStopTimer = 0.03;
          }

          // Kill rewards
          if (kills > 0) {
            killCountRef.current += kills;
            map.totalKills += kills;
            trackKillStreak(map as any, kills);
            trackMultiKill(map as any, kills);

            // XP (with map multiplier)
            const xpScale = Math.max(0.1, calcXpScale(gs.character.level, zoneData.iLvlMin));
            const xpGrant = Math.max(1, Math.round(10 * zoneData.band * kills * xpScale * MAP_XP_MULTIPLIER));
            const latestGs = useGameStore.getState();
            latestGs.grantIdleXp(xpGrant);
            map.floaters.push({
              x: map.player.x + (Math.random() - 0.5) * 20,
              y: map.player.y - 30,
              text: `+${xpGrant} XP`, color: '#818cf8',
              age: 0, maxAge: 1.2, isCrit: false, vy: -55,
            });

            // Loot (with map quality boost — roll more frequently)
            const lootGs = useGameStore.getState();
            const groundLoot = rollArenaLoot(kills, map.player, lootGs.character, zoneData);
            if (groundLoot.length > 0) {
              map.groundItems.push(...groundLoot);
              for (const gi of groundLoot) {
                if (gi.kind === 'equipment') logCombat(map as any, `DROP: ${gi.label}`, gi.color);
              }
            }

            // Zone progression (map kills count toward idle clears too)
            map.killAccumForClears += kills;
            while (map.killAccumForClears >= 5) {
              map.killAccumForClears -= 5;
              const clearGs = useGameStore.getState();
              clearGs.processNewClears(1);
            }
          }
        }
      }

      // ── Render ──
      const renderGs = useGameStore.getState();
      const rZone = ZONE_DEFS.find(z => z.id === renderGs.currentZoneId);
      let renderMaxHp = 100;
      try { renderMaxHp = resolveStats(renderGs.character).maxLife; } catch { /* */ }
      renderMap(ctx, map, renderGs.currentHp, renderMaxHp, renderGs.currentEs ?? 0, killCountRef.current, undefined, {
        zoneName: rZone?.name,
        zoneBand: rZone?.band,
        combatPhase: renderGs.combatPhase,
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    // ── Input Handlers ──
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      // Dodge roll on space
      if (e.key === ' ' && stateRef.current) {
        const s = stateRef.current;
        if (s.dodgeRollCooldown <= 0 && s.dodgeRollTimer <= 0) {
          let rdx = 0, rdy = 0;
          if (keysRef.current.has('w')) rdy -= 1;
          if (keysRef.current.has('s')) rdy += 1;
          if (keysRef.current.has('a')) rdx -= 1;
          if (keysRef.current.has('d')) rdx += 1;
          if (rdx === 0 && rdy === 0) { rdx = s.playerFacing.x; rdy = s.playerFacing.y; }
          const len = Math.sqrt(rdx * rdx + rdy * rdy);
          if (len > 0.01) {
            s.dodgeRollDir = { x: rdx / len, y: rdy / len };
            s.dodgeRollTimer = 0.15;
            s.dodgeRollCooldown = 4.0;
            s.iFrameTimer = 0.2;
            triggerShake(s as any, 2);
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const onMouseMove = (e: MouseEvent) => {
      if (!stateRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      stateRef.current.mouseWorldPos = {
        x: e.clientX - rect.left + stateRef.current.camera.x,
        y: e.clientY - rect.top + stateRef.current.camera.y,
      };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [currentZoneId]);

  return (
    <div className="w-full h-[calc(100vh-120px)] bg-gray-950 rounded-lg overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

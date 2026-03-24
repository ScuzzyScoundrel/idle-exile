// ============================================================
// Arena Screen — ARPG mode: real-time Canvas2D visualization
// over the existing combat engine tick loop.
// ============================================================

import { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { resolveStats } from '../../engine/character';
import { ZONE_DEFS } from '../../data/zones';
import {
  createArenaState,
  updateArena,
  syncMobsFromPack,
  renderArena,
  addDotFloater,
  addProcFloater,
  addPlayerHitFloater,
  getClosestMobInRange,
  triggerShake,
  markSkillCast,
  spawnSkillVisual,
  triggerIFrames,
  checkPhaseTransition,
  trackKillStreak,
  tryPickupGroundItem,
  spawnArenaPack,
  mergeAfterTick,
  tickArenaSpawns,
  tickOutOfRangeDoTs,
  tickRangedProjectiles,
  tickMeleeAttacks,
  placeArenaTrap,
  detonateOldestArenaTrap,
  dashPlayerForward,
  checkTrapProximityDetonations,
  logCombat,
  advanceWave,
  trackMultiKill,
  spawnBossDeathParticles,
  triggerDodgeRoll,
  checkShrineSpawn,
  KILLS_PER_CLEAR,
  type ArenaState,
  type SkillCooldownInfo,
} from './arenaEngine';
import { buildSpatialSlice } from './spatialTargeting';
import type { MobInPack } from '../../types/combat';
import { rollArenaLoot, rollBossArenaLoot } from './arenaLoot';
import { calcXpScale } from '../../engine/zones/scaling';
import { BOSS_INTERVAL } from '../../data/balance';
import { getUnifiedSkillDef } from '../../data/skills';
import { getNextRotationSkill, getSkillGraphModifier } from '../../engine/unifiedSkills';

export default function ArenaScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ArenaState | null>(null);
  const keysRef = useRef(new Set<string>());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const killCountRef = useRef(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const cursorRef = useRef<string>('default');

  const currentZoneId = useGameStore(s => s.currentZoneId);
  const idleStartTime = useGameStore(s => s.idleStartTime);

  // Zone list for the picker
  const zones = ZONE_DEFS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to container
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

    // Init arena state
    stateRef.current = createArenaState(canvas.width, canvas.height);
    killCountRef.current = 0;
    lastTimeRef.current = 0;

    // Load zone background image
    const gs0 = useGameStore.getState();
    if (gs0.currentZoneId) {
      const img = new Image();
      img.src = `/images/zones/${gs0.currentZoneId}.webp`;
      bgImageRef.current = img;
    } else {
      bgImageRef.current = null;
    }

    // Spatial damage helper: ES absorption + death detection
    const applySpatialDamage = (arena: ArenaState, rawDamage: number, source: string) => {
      const s = useGameStore.getState();
      let remaining = rawDamage;
      // Absorb with ES first
      if ((s.currentEs ?? 0) > 0) {
        const esAbsorbed = Math.min(s.currentEs ?? 0, remaining);
        remaining -= esAbsorbed;
        useGameStore.setState({ currentEs: (s.currentEs ?? 0) - esAbsorbed });
      }
      if (remaining > 0) {
        const newHp = Math.max(0, s.currentHp - remaining);
        useGameStore.setState({ currentHp: newHp });
        if (newHp <= 0 && s.combatPhase === 'clearing') {
          logCombat(arena, 'DEFEATED', '#fca5a5');
          useGameStore.setState({
            combatPhase: 'zone_defeat' as never,
            combatPhaseStartedAt: Date.now(),
          });
          arena.sessionDeaths++;
        }
      }
      logCombat(arena, `${source} → ${Math.round(rawDamage)}`, '#f87171');
    };

    // Game loop
    const loop = (time: number) => {
      if (!stateRef.current || !canvasRef.current) return;

      const dt = lastTimeRef.current
        ? Math.min((time - lastTimeRef.current) / 1000, 0.1)
        : 0.016;
      lastTimeRef.current = time;

      const arena = stateRef.current;
      const gs = useGameStore.getState();

      // Only run if idle combat is active
      if (!gs.idleStartTime || !gs.currentZoneId) {
        // Render empty arena with message
        ctx.fillStyle = '#08080e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Select a zone to enter the arena', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Skip simulation when paused (still render below)
      if (!arena.paused) {
      const currentPhase = gs.combatPhase ?? 'clearing';

      // Handle defeat/victory recovery — call engine's recovery ticker
      if (currentPhase === 'zone_defeat' || currentPhase === 'boss_defeat' ||
          currentPhase === 'boss_victory') {
        gs.checkRecoveryComplete();
        const afterRecovery = useGameStore.getState();
        if (afterRecovery.combatPhase === 'clearing') {
          // Recovery completed — re-init arena pack next frame
          arena.arenaInitialized = false;
        }
        updateArena(arena, dt, keysRef.current);
      } else {
      // ── Normal clearing / boss_fight simulation ──

      // Sync visual mobs from engine state (skip during boss — packMobs is empty)
      if (currentPhase !== 'boss_fight') {
        syncMobsFromPack(arena, gs.packMobs);
      }

      // Arena pack initialization — replace engine's small 1-5 pack with arena-sized pack
      if (!arena.arenaInitialized && gs.currentZoneId && currentPhase !== 'boss_fight') {
        arena.arenaInitialized = true;
        const initZone = ZONE_DEFS.find(z => z.id === gs.currentZoneId);
        if (initZone) {
          const arenaPack = spawnArenaPack(arena, initZone, 1, 1, 20);
          useGameStore.setState({ packMobs: arenaPack, currentPackSize: arenaPack.length });
        }
      }

      // Update spatial simulation
      updateArena(arena, dt, keysRef.current);

      // ── Hazard DPS to player (fire/poison pools) ──
      if (arena.hazards.length > 0 && arena.iFrameTimer <= 0 && currentPhase === 'clearing') {
        for (const h of arena.hazards) {
          const hdx = arena.player.x - h.x;
          const hdy = arena.player.y - h.y;
          const hDist = Math.sqrt(hdx * hdx + hdy * hdy);
          if (hDist < h.radius + arena.playerRadius) {
            // Tick damage every 0.5s
            if (arena.totalTime - h.lastDamageTick >= 0.5) {
              h.lastDamageTick = arena.totalTime;
              const hazardDmg = h.damagePerSec * 0.5;
              applySpatialDamage(arena, hazardDmg, h.type === 'fire' ? 'Fire Pool' : 'Poison Cloud');
              addPlayerHitFloater(arena, hazardDmg, false, false);
            }
          }
        }
      }

      // Tick ranged mob projectiles (per-frame, not per-tick)
      try {
        if (currentPhase === 'clearing') {
          const projZone = ZONE_DEFS.find(z => z.id === gs.currentZoneId);
          if (projZone) {
            let projStats: ReturnType<typeof resolveStats> | null = null;
            try { projStats = resolveStats(gs.character); } catch { /* */ }
            if (projStats) {
              const projHits = tickRangedProjectiles(
                arena, dt, projZone.band, projZone.iLvlMin,
                gs.character.level, projStats,
              );
              for (const hit of projHits) {
                addPlayerHitFloater(arena, hit.damage, hit.isDodged, hit.isBlocked);
                if (!hit.isDodged && !hit.isBlocked && hit.damage > 0) {
                  triggerIFrames(arena);
                  applySpatialDamage(arena, hit.damage, 'Projectile');
                } else if (hit.isDodged) {
                  logCombat(arena, 'DODGE projectile', '#67e8f9');
                  const ds = useGameStore.getState();
                  useGameStore.setState({ pendingSpatialDodges: (ds.pendingSpatialDodges ?? 0) + 1 });
                } else if (hit.isBlocked) {
                  logCombat(arena, 'BLOCK projectile', '#93c5fd');
                  const bs = useGameStore.getState();
                  useGameStore.setState({ pendingSpatialBlocks: (bs.pendingSpatialBlocks ?? 0) + 1 });
                }
              }
            }
          }
        }
      } catch (e) { console.error('[arena] projectile tick error:', e); }

      // Tick melee mob attacks (per-frame, proximity-based)
      try {
        if (currentPhase === 'clearing') {
          const meleeZone = ZONE_DEFS.find(z => z.id === gs.currentZoneId);
          if (meleeZone) {
            let meleeStats: ReturnType<typeof resolveStats> | null = null;
            try { meleeStats = resolveStats(gs.character); } catch { /* */ }
            if (meleeStats) {
              const meleeHits = tickMeleeAttacks(
                arena, dt, meleeZone.band, meleeZone.iLvlMin,
                gs.character.level, meleeStats,
              );
              for (const hit of meleeHits) {
                addPlayerHitFloater(arena, hit.damage, hit.isDodged, hit.isBlocked);
                if (!hit.isDodged && !hit.isBlocked && hit.damage > 0) {
                  triggerIFrames(arena);
                  applySpatialDamage(arena, hit.damage, 'Melee');
                } else if (hit.isDodged) {
                  logCombat(arena, 'DODGE melee', '#67e8f9');
                  const ds = useGameStore.getState();
                  useGameStore.setState({ pendingSpatialDodges: (ds.pendingSpatialDodges ?? 0) + 1 });
                } else if (hit.isBlocked) {
                  logCombat(arena, 'BLOCK melee', '#93c5fd');
                  const bs = useGameStore.getState();
                  useGameStore.setState({ pendingSpatialBlocks: (bs.pendingSpatialBlocks ?? 0) + 1 });
                }
              }
            }
          }
        }
      } catch (e) { console.error('[arena] melee tick error:', e); }

      // Trap proximity detonation — visual only, engine handles damage
      if (arena.traps.length > 0) {
        try {
          checkTrapProximityDetonations(arena);
        } catch (e) { console.error('[arena] trap detonation error:', e); }
      }

      // ── Combat ticks ──
      while (arena.tickAccumulator >= 0.25) {
        arena.tickAccumulator -= 0.25;

        const tickGs = useGameStore.getState();

        // ── Boss fight path: always tick, no packMobs filtering ──
        if (currentPhase === 'boss_fight') {
          const result = tickGs.tickCombat(0.25);

          // Sync boss HP to visual entity
          const bossCheckGs = useGameStore.getState();
          if (arena.bossMob && bossCheckGs.bossState) {
            const prevHp = arena.bossMob.hp;
            arena.bossMob.hp = bossCheckGs.bossState.bossCurrentHp;
            arena.bossMob.maxHp = bossCheckGs.bossState.bossMaxHp;
            // Flash on hit
            if (bossCheckGs.bossState.bossCurrentHp < prevHp) {
              arena.bossMob.lastHitTime = arena.totalTime;
              // Knockback away from player
              const bkdx = arena.bossMob.x - arena.player.x;
              const bkdy = arena.bossMob.y - arena.player.y;
              const bkDist = Math.sqrt(bkdx * bkdx + bkdy * bkdy);
              if (bkDist > 1) {
                arena.bossMob.knockbackVx = (bkdx / bkDist) * 80;
                arena.bossMob.knockbackVy = (bkdy / bkDist) * 80;
              }
            }
          }

          // Boss victory/defeat detection
          if (bossCheckGs.bossState && bossCheckGs.bossState.bossCurrentHp <= 0) {
            logCombat(arena, 'BOSS DEFEATED!', '#fbbf24');
            // Death explosion
            if (arena.bossMob && !arena.bossMob.dead) {
              arena.bossMob.dead = true;
              arena.bossMob.deathTimer = 0;
              spawnBossDeathParticles(arena, arena.bossMob, arena.bossMob.color);
              triggerShake(arena, 8);
            }
            // Loot explosion around boss position
            const bossResult = bossCheckGs.handleBossVictory();
            if (bossResult && arena.bossMob) {
              const loot = rollBossArenaLoot(bossResult, { x: arena.bossMob.x, y: arena.bossMob.y });
              arena.groundItems.push(...loot);
            }
            // Clean up boss entity after short delay handled in updateArena
          } else if (bossCheckGs.currentHp <= 0) {
            logCombat(arena, 'DEFEATED by boss', '#fca5a5');
            bossCheckGs.handleBossDefeat();
            arena.bossMob = null;
          }

          // Boss attack feedback
          if (result.bossAttack) {
            addPlayerHitFloater(arena, result.bossAttack.damage, result.bossAttack.isDodged, result.bossAttack.isBlocked);
            if (!result.bossAttack.isDodged && !result.bossAttack.isBlocked && result.bossAttack.damage > 0) {
              triggerIFrames(arena);
              logCombat(arena, `Boss hit → ${Math.round(result.bossAttack.damage)}`, '#f87171');
            } else if (result.bossAttack.isDodged) {
              logCombat(arena, 'DODGE boss attack', '#67e8f9');
            } else if (result.bossAttack.isBlocked) {
              logCombat(arena, 'BLOCK boss attack', '#93c5fd');
            }
          }
          if (result.isCrit && result.damageDealt > 0) {
            triggerShake(arena, 4);
            arena.critFlashTimer = 0.03;
          }
          if (result.skillFired && result.skillId) {
            markSkillCast(arena, result.skillId);
          }
          continue;
        }

        // ── Clearing path: spatial combat slice ──
        const fullPack = tickGs.packMobs;
        if (fullPack.length === 0) continue;

        // Predict next skill for spatial targeting (defensive — fallback to null skill)
        let skillDef: import('../../types/skills').SkillDef | null = null;
        let graphMod: ReturnType<typeof getSkillGraphModifier> | null = null;
        try {
          const nextSkill = getNextRotationSkill(
            tickGs.skillBar,
            tickGs.skillTimers ?? [],
            Date.now(),
            tickGs.skillProgress,
          );
          skillDef = nextSkill?.skill ?? null;
          graphMod = skillDef && tickGs.skillProgress
            ? getSkillGraphModifier(skillDef, tickGs.skillProgress[skillDef.id])
            : null;
        } catch (e) { console.error('[arena] skill prediction error:', e); }

        const { slice, slicePackIndices, targetMobs, strategyUsed } = buildSpatialSlice(
          arena, fullPack, skillDef, graphMod,
        );
        // Allow Movement/Trap skills to fire even with no mobs in range
        const isUtilitySkill = skillDef && (
          skillDef.tags.includes('Movement') || skillDef.tags.includes('Trap')
        );
        if (slice.length === 0 && !isUtilitySkill) continue;

        // Swap store to combat slice (engine only sees nearby mobs)
        useGameStore.setState({ packMobs: slice, currentPackSize: slice.length });

        // Engine combat tick — full pipeline on in-range mobs only
        const result = useGameStore.getState().tickCombat(0.25);
        const postSlice = useGameStore.getState().packMobs;

        // Merge results back into full pack
        const mergeZone = ZONE_DEFS.find(z => z.id === gs.currentZoneId);
        const newFullPack = mergeAfterTick(
          arena, fullPack, slicePackIndices,
          postSlice, result.mobKills, result.isCrit,
          mergeZone?.band ?? 1,
        );

        // Detect engine auto-respawn (killed all slice mobs → engine spawned tiny pack)
        if (result.mobKills >= slice.length && postSlice.length > 0) {
          // Discard engine's respawned pack — arena spawns its own via tickArenaSpawns
          // newFullPack already has the out-of-range survivors; just use it
        }
        useGameStore.setState({ packMobs: newFullPack, currentPackSize: newFullPack.length });

        // ── Visual feedback + combat log: consume ALL result fields ──
        // Use spatially-resolved targets for visuals (fallback to closest)
        const visTarget = targetMobs[0] ?? getClosestMobInRange(arena);

        // Skill fired
        if (result.skillFired && result.skillId) {
          markSkillCast(arena, result.skillId);
          const visDef = getUnifiedSkillDef(result.skillId);

          // Shadow Dash: always dash in facing direction, even with no targets
          if (result.skillId === 'dagger_shadow_dash') {
            if (visDef?.tags) spawnSkillVisual(arena, visDef.tags, null, []);
            dashPlayerForward(arena, 100);
            triggerShake(arena, 3);
          } else if (result.skillId === 'dagger_blade_trap') {
            // Blade Trap: place persistent spinning trap in front of player
            const trapX = arena.player.x + arena.playerFacing.x * 40;
            const trapY = arena.player.y + arena.playerFacing.y * 40;
            placeArenaTrap(arena, trapX, trapY);
            if (visDef?.tags) spawnSkillVisual(arena, visDef.tags, visTarget, targetMobs.slice(1));
          } else {
            if (visDef?.tags) spawnSkillVisual(arena, visDef.tags, visTarget, targetMobs.slice(1));
          }

          const dmgStr = result.damageDealt > 0 ? ` → ${Math.round(result.damageDealt)}` : '';
          const critStr = result.isCrit ? ' CRIT!' : '';
          const stratStr = targetMobs.length > 1 ? ` [${strategyUsed} ×${targetMobs.length}]` : '';
          logCombat(arena, `${visDef?.name ?? result.skillId}${dmgStr}${critStr}${stratStr}`, result.isCrit ? '#fbbf24' : '#e5e7eb');
        }

        // DoT damage (poison + burning ticks)
        if (result.dotDamage && result.dotDamage > 0 && visTarget) {
          addDotFloater(arena, result.dotDamage, { x: visTarget.x + 15, y: visTarget.y });
          logCombat(arena, `DoT tick → ${Math.round(result.dotDamage)}`, '#86efac');
        }

        // Bleed trigger damage (fires when enemy attacks)
        if (result.bleedTriggerDamage && result.bleedTriggerDamage > 0 && visTarget) {
          addDotFloater(arena, result.bleedTriggerDamage, { x: visTarget.x - 15, y: visTarget.y - 5 });
          logCombat(arena, `Bleed trigger → ${Math.round(result.bleedTriggerDamage)}`, '#f87171');
        }

        // Shatter damage (cold overkill burst)
        if (result.shatterDamage && result.shatterDamage > 0 && visTarget) {
          addProcFloater(arena, `SHATTER ${Math.round(result.shatterDamage)}`, visTarget);
          logCombat(arena, `Shatter → ${Math.round(result.shatterDamage)}`, '#22d3ee');
        }

        // Counter-hit damage (dagger weapon module)
        if (result.counterHitDamage && result.counterHitDamage > 0 && visTarget) {
          addProcFloater(arena, `COUNTER ${Math.round(result.counterHitDamage)}`, visTarget);
          logCombat(arena, `Counter-hit → ${Math.round(result.counterHitDamage)}`, '#c4b5fd');
        }

        // Trap detonation damage (trap weapon module)
        if (result.trapDetonationDamage && result.trapDetonationDamage > 0 && visTarget) {
          detonateOldestArenaTrap(arena);
          addProcFloater(arena, `TRAP ${Math.round(result.trapDetonationDamage)}`, visTarget);
          logCombat(arena, `Trap detonate → ${Math.round(result.trapDetonationDamage)}`, '#f97316');
        }

        // Structured proc events (talent procs, on-hit effects)
        if (result.procEvents && result.procEvents.length > 0) {
          for (const pe of result.procEvents) {
            if (pe.damage > 0 && visTarget) {
              addProcFloater(arena, `${pe.label} ${Math.round(pe.damage)}`, visTarget);
            } else if (pe.label && visTarget) {
              addProcFloater(arena, pe.label, visTarget);
            }
            const peDmg = pe.damage > 0 ? ` → ${Math.round(pe.damage)}` : '';
            logCombat(arena, `${pe.label}${peDmg}`, '#c4b5fd');
          }
        } else if (result.procDamage && result.procDamage > 0 && visTarget) {
          addProcFloater(arena, result.procLabel || 'PROC', visTarget);
          logCombat(arena, `${result.procLabel || 'Proc'} → ${Math.round(result.procDamage)}`, '#c4b5fd');
        }

        // Debuff spread events (on-kill spread to new mob)
        if (result.spreadEvents && result.spreadEvents.length > 0 && visTarget) {
          addProcFloater(arena, 'SPREAD', visTarget);
          for (const se of result.spreadEvents) {
            logCombat(arena, `Spread ${se.debuffId} ×${se.stacks}`, '#a78bfa');
          }
        } else if (result.didSpreadDebuffs && visTarget) {
          addProcFloater(arena, 'SPREAD', visTarget);
          logCombat(arena, 'Debuffs spread', '#a78bfa');
        }

        // Cooldown reset indicator
        if (result.gcdWasReset) {
          arena.floaters.push({
            x: arena.player.x, y: arena.player.y - 40,
            text: 'INSTANT', color: '#60a5fa',
            age: 0, maxAge: 0.8, isCrit: false, vy: -50,
          });
          logCombat(arena, 'Instant cast!', '#60a5fa');
        }
        if (result.cooldownWasReset) {
          arena.floaters.push({
            x: arena.player.x + (Math.random() - 0.5) * 30, y: arena.player.y - 45,
            text: 'CD RESET', color: '#34d399',
            age: 0, maxAge: 1.0, isCrit: false, vy: -55,
          });
          logCombat(arena, 'Cooldown reset!', '#34d399');
        }

        // Player-received damage (engine zone attacks)
        if (result.zoneAttack) {
          addPlayerHitFloater(arena, result.zoneAttack.damage, result.zoneAttack.isDodged, result.zoneAttack.isBlocked);
          if (!result.zoneAttack.isDodged && !result.zoneAttack.isBlocked && result.zoneAttack.damage > 0) {
            triggerIFrames(arena);
            logCombat(arena, `Hit for ${Math.round(result.zoneAttack.damage)}`, '#f87171');
          } else if (result.zoneAttack.isDodged) {
            logCombat(arena, 'DODGE', '#67e8f9');
          } else if (result.zoneAttack.isBlocked) {
            logCombat(arena, 'BLOCK', '#93c5fd');
          }
        }

        // Player death from zone attacks
        if (result.zoneDeath) {
          logCombat(arena, 'DEFEATED', '#fca5a5');
          const deathGs = useGameStore.getState();
          if (deathGs.combatPhase === 'clearing') {
            useGameStore.setState({
              combatPhase: 'zone_defeat' as never,
              combatPhaseStartedAt: Date.now(),
            });
          }
        }

        // Crit feedback + hit-stop
        if (result.isCrit && result.damageDealt > 0) {
          triggerShake(arena, 4);
          arena.critFlashTimer = 0.03;
          arena.hitStopTimer = 0.03; // 2-frame freeze for impact
        }

        // Count kills
        const actualKills = result.mobKills;
        if (actualKills > 0) {
            if (actualKills >= 3) logCombat(arena, `${actualKills}× MULTI-KILL!`, '#fbbf24');
            else if (actualKills > 0) logCombat(arena, `Kill ×${actualKills}`, '#fca5a5');
            killCountRef.current += actualKills;
            trackKillStreak(arena, actualKills);
            trackMultiKill(arena, actualKills);
            checkShrineSpawn(arena, actualKills);

            // Wave progression
            arena.waveKillCount += actualKills;
            if (arena.waveKillCount >= arena.waveKillTarget) {
              advanceWave(arena);

              // Every BOSS_INTERVAL waves: trigger boss
              if ((arena.currentWave - 1) % BOSS_INTERVAL === 0 && arena.currentWave > 1) {
                const bossGs = useGameStore.getState();
                if (bossGs.combatPhase === 'clearing') {
                  bossGs.startBossFight();
                }
              }
            }

            // XP grant
            const latestGs = useGameStore.getState();
            const rz = ZONE_DEFS.find(z => z.id === latestGs.currentZoneId);
            if (rz) {
              const xpScale = Math.max(0.1, calcXpScale(latestGs.character.level, rz.iLvlMin));
              const xpGrant = Math.max(1, Math.round(10 * rz.band * actualKills * xpScale));
              latestGs.grantIdleXp(xpGrant);
              arena.floaters.push({
                x: arena.player.x + (Math.random() - 0.5) * 20,
                y: arena.player.y - 30,
                text: `+${xpGrant} XP`,
                color: '#818cf8',
                age: 0, maxAge: 1.2, isCrit: false, vy: -55,
              });
            }

            // Ground loot — roll per kill for visual drops
            const lootGs = useGameStore.getState();
            const lootZone = ZONE_DEFS.find(z => z.id === lootGs.currentZoneId);
            if (lootZone) {
              const groundLoot = rollArenaLoot(actualKills, arena.player, lootGs.character, lootZone);
              if (groundLoot.length > 0) {
                arena.groundItems.push(...groundLoot);
                for (const gi of groundLoot) {
                  if (gi.kind === 'equipment') logCombat(arena, `DROP: ${gi.label}`, gi.color);
                }
              }
            }

            // Zone progression (clear counting toward boss) — no loot, just progression
            arena.killAccumForClears += actualKills;
            while (arena.killAccumForClears >= KILLS_PER_CLEAR) {
              arena.killAccumForClears -= KILLS_PER_CLEAR;
              const clearGs = useGameStore.getState();
              clearGs.processNewClears(1);
            }
          }
        }

      // Spawn replacement mobs (clearing phase only)
      if (currentPhase === 'clearing') {
        const spawnGs = useGameStore.getState();
        const spawnZone = ZONE_DEFS.find(z => z.id === spawnGs.currentZoneId);
        if (spawnZone) {
          const newMobs = tickArenaSpawns(arena, dt, spawnZone, 1, 1);
          if (newMobs.length > 0) {
            const curGs = useGameStore.getState();
            useGameStore.setState({
              packMobs: [...curGs.packMobs, ...newMobs],
              currentPackSize: curGs.packMobs.length + newMobs.length,
            });
          }
        }

        // Tick DoTs on out-of-range mobs (poison-and-run)
        const dotGs = useGameStore.getState();
        const dotKills = tickOutOfRangeDoTs(arena, dotGs.packMobs as MobInPack[], dt);
        if (dotKills > 0) {
          killCountRef.current += dotKills;
          trackKillStreak(arena, dotKills);
          arena.waveKillCount += dotKills;
          if (arena.waveKillCount >= arena.waveKillTarget) {
            advanceWave(arena);
          }
          // Remove dead mobs from pack
          const cleanGs = useGameStore.getState();
          const cleanPack = cleanGs.packMobs.filter(m => m.hp > 0);
          // Reindex visual mobs
          const oldToNew = new Map<number, number>();
          let newIdx = 0;
          for (let i = 0; i < cleanGs.packMobs.length; i++) {
            if (cleanGs.packMobs[i].hp > 0) { oldToNew.set(i, newIdx++); }
          }
          for (const vm of arena.mobs) {
            if (vm.dead) continue;
            const mapped = oldToNew.get(vm.packIndex);
            if (mapped !== undefined) vm.packIndex = mapped;
          }
          arena.lastKnownPackLength = cleanPack.length;
          arena.pendingSpawns += dotKills;
          useGameStore.setState({ packMobs: cleanPack, currentPackSize: cleanPack.length });
        }
      }
      } // end clearing/boss_fight branch
      } // end pause guard

      // Resolve stats for HP display + spatial attacks
      const currentState = useGameStore.getState();

      // Detect boss entrance transition + boss defeat → wave reset
      const phase = currentState.combatPhase ?? 'clearing';
      const bossInfo = currentState.bossState ? {
        name: currentState.bossState.bossName ?? 'Boss',
        color: '#ef4444',
        maxHp: currentState.bossState.bossMaxHp ?? 1000,
      } : undefined;
      checkPhaseTransition(arena, phase, bossInfo);
      if (arena.currentCombatPhase === 'boss_fight' && phase === 'clearing') {
        // Boss defeated — reset waves, clean up boss entity
        arena.currentWave = 1;
        arena.waveKillCount = 0;
        arena.waveKillTarget = 10;
        arena.waveAnnouncementTimer = 1.5;
        arena.bossMob = null;
      }
      arena.currentCombatPhase = phase;

      let maxHp = 100;
      let resolvedStats: ReturnType<typeof resolveStats> | null = null;
      try {
        resolvedStats = resolveStats(currentState.character);
        maxHp = resolvedStats.maxLife;
      } catch { /* fallback */ }

      // Mob→player damage handled by engine via result.zoneAttack (displayed in tick loop above)
      // Engine applies HP reduction, dodge/block, bleed triggers, counter-hits internally

      // Build skill cooldown info
      const now = Date.now();
      const cooldowns: SkillCooldownInfo[] = [];
      if (currentState.skillBar) {
        for (let i = 0; i < currentState.skillBar.length; i++) {
          const slot = currentState.skillBar[i];
          if (!slot) continue;
          const def = getUnifiedSkillDef(slot.skillId);
          if (!def || !('baseDamage' in def)) continue; // only active skills
          const timer = currentState.skillTimers?.[i];
          let cooldownPct = 0;
          if (timer?.cooldownUntil && timer.cooldownUntil > now && def.cooldown > 0) {
            const remaining = (timer.cooldownUntil - now) / 1000;
            cooldownPct = Math.min(1, remaining / def.cooldown);
          }
          const isOnGcd = currentState.nextActiveSkillAt > now;
          cooldowns.push({
            skillId: slot.skillId,
            name: def.name,
            cooldownPct,
            isActive: slot.skillId === arena.lastCastSkillId,
            isOnGcd,
          });
        }
      }

      // Zone info for HUD
      const zoneDef = currentState.currentZoneId
        ? ZONE_DEFS.find(z => z.id === currentState.currentZoneId)
        : undefined;

      // Render
      renderArena(
        ctx,
        arena,
        currentState.currentHp,
        maxHp,
        currentState.currentEs ?? 0,
        killCountRef.current,
        cooldowns,
        {
          bgImage: bgImageRef.current,
          zoneName: zoneDef?.name,
          zoneBand: zoneDef?.band,
          zoneILvl: zoneDef ? `${zoneDef.iLvlMin}-${zoneDef.iLvlMax}` : undefined,
          combatPhase: currentState.combatPhase,
          bossName: currentState.bossState?.bossName,
          bossHp: currentState.bossState?.bossCurrentHp,
          bossMaxHp: currentState.bossState?.bossMaxHp,
          deathStreak: currentState.deathStreak,
          playerLevel: currentState.character.level,
          playerXp: currentState.character.xp,
          playerXpToNext: currentState.character.xpToNext,
          zoneClearCount: currentState.currentZoneId
            ? (currentState.zoneClearCounts?.[currentState.currentZoneId] ?? 0)
            : 0,
          isInvaded: false,
          comboStates: currentState.comboStates?.map(cs => ({
            stateId: cs.stateId,
            remainingDuration: cs.remainingDuration,
            stacks: cs.stacks,
          })),
          classResourceType: currentState.classResource?.type,
          classResourceStacks: currentState.classResource?.stacks,
        },
      );

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    // Mouse handlers for ground item interaction
    const onMouseMove = (e: MouseEvent) => {
      if (!stateRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      stateRef.current.mouseWorldPos = {
        x: screenX + stateRef.current.camera.x,
        y: screenY + stateRef.current.camera.y,
      };
      const hasHovered = stateRef.current.groundItems.some(gi => gi.hovered && !gi.autoPickup);
      const newCursor = hasHovered ? 'pointer' : 'default';
      if (cursorRef.current !== newCursor) {
        cursorRef.current = newCursor;
        canvas.style.cursor = newCursor;
      }
    };
    const onMouseClick = (e: MouseEvent) => {
      if (!stateRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) + stateRef.current.camera.x;
      const worldY = (e.clientY - rect.top) + stateRef.current.camera.y;
      tryPickupGroundItem(stateRef.current, worldX, worldY);
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onMouseClick);

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab', ' '].includes(key)) {
        e.preventDefault();
      }
      if (key === 'tab' && stateRef.current) {
        stateRef.current.showStats = !stateRef.current.showStats;
      }
      if (key === 'escape' && stateRef.current) {
        stateRef.current.paused = !stateRef.current.paused;
      }
      // Spacebar: dodge roll
      if (key === ' ' && stateRef.current) {
        triggerDodgeRoll(stateRef.current, keysRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onMouseClick);
    };
  }, [currentZoneId, idleStartTime]);

  const startIdleRun = useGameStore(s => s.startIdleRun);

  return (
    <div className="w-full h-[calc(100vh-8rem)] relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        tabIndex={0}
      />

      {/* Zone picker overlay when no zone is active */}
      {!currentZoneId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Enter the Arena</h2>
            <p className="text-gray-400 text-sm mb-4">Choose a zone to fight in:</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {zones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => {
                    startIdleRun(zone.id);
                  }}
                  className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg
                             border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  <span className="text-gray-100 font-medium">{zone.name}</span>
                  <span className="text-gray-500 text-xs ml-2">Band {zone.band} · iLvl {zone.iLvlMin}-{zone.iLvlMax}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

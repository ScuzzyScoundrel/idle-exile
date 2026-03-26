// ============================================================
// Map Screen — PoE-style room-based active play mode
// WASD + mouse aim + auto-cast through room-based dungeons.
// Phase 3: Zone selection, map fragments, downfarm penalty,
//          per-zone map completion tracking.
// ============================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { resolveStats } from '../../engine/character';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { rollZoneAttack, calcZoneAccuracy, calcLevelDamageMult } from '../../engine/zones';
import { getUnifiedSkillDef } from '../../data/skills';
import { tickDebuffDoT } from '../../engine/combat/helpers';

import type { MapState, MapModifier } from './mapTypes';
import { createMapState, updateMap, getMapMobsInRange, mobCanAttackMapPlayer,
  spawnMapBoss, bossCanAttackMapPlayer,
  BOSS_SLAM_DAMAGE_MULT, BOSS_BARRAGE_DAMAGE_MULT, BOSS_HAZARD_DPS_MULT,
  tryPickupMapGroundItem } from './mapEngine';
import { rollMapModifiers, hasModifier } from './mapGeneration';
import { renderMap } from './mapRendering';
import type { MapHudExtra, MapSprites } from './mapRendering';
import { rollArenaLoot, rollBossArenaLoot } from '../arena/arenaLoot';
import { calcXpScale } from '../../engine/zones/scaling';
import { PLAYER_ATTACK_RANGE } from '../arena/arenaTypes';
import { addDotFloater, addProcFloater } from '../arena/arenaCombatFeedback';
import { placeArenaTrap, detonateOldestArenaTrap } from '../arena/arenaTraps';
import { dashPlayerForward } from '../arena/arenaMovement';
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
const MAPS_BEFORE_BOSS = 5;       // complete 5 normal maps, then boss map
const BOSS_MELEE_INTERVAL = 1.5;  // seconds between boss melee swings
const DOWNFARM_ZONE_GAP = 5;      // zone index gap for downfarm penalty
const DOWNFARM_XP_MULT = 0.5;     // 50% XP reduction when downfarming
const FRAGMENT_RARE_DROP_CHANCE = 0.5;  // 50% chance from rare mob kills
const FRAGMENT_BOSS_MIN = 3;
const FRAGMENT_BOSS_MAX = 5;

// Corrupted map constants
const CORRUPTED_BASE_COST = 3;         // tier 1 costs 3 fragments
const CORRUPTED_COST_PER_TIER = 1;     // +1 per tier
const CORRUPTED_MAX_COST = 10;         // cap at 10 fragments

/** Fragment cost to enter a corrupted map at the given tier. */
function corruptedMapCost(tier: number): number {
  return Math.min(CORRUPTED_MAX_COST, CORRUPTED_BASE_COST + (tier - 1) * CORRUPTED_COST_PER_TIER);
}

/** Check if player has beaten the last zone (unlocks corrupted maps). */
function hasBeatenLastZone(bossKillCounts: Record<string, number>): boolean {
  const lastZone = ZONE_DEFS[ZONE_DEFS.length - 1];
  return (bossKillCounts[lastZone.id] ?? 0) >= 1;
}

// ── Helpers ──

/** Get the ordered index of a zone in the ZONE_DEFS array. */
function getZoneIndex(zoneId: string): number {
  return ZONE_DEFS.findIndex(z => z.id === zoneId);
}

/** Determine the highest unlocked zone index based on boss kills. */
function getHighestUnlockedZoneIndex(bossKillCounts: Record<string, number>): number {
  let highest = 0; // zone 0 is always unlocked
  for (let i = 1; i < ZONE_DEFS.length; i++) {
    const zone = ZONE_DEFS[i];
    if (!zone.unlockRequirement) { highest = Math.max(highest, i); continue; }
    if ((bossKillCounts[zone.unlockRequirement] ?? 0) >= 1) {
      highest = Math.max(highest, i);
    } else {
      break; // linear progression — once one is locked, all after are too
    }
  }
  return highest;
}

/** Check if a zone is unlocked. */
function isZoneUnlocked(zoneId: string, bossKillCounts: Record<string, number>): boolean {
  const zone = ZONE_DEFS.find(z => z.id === zoneId);
  if (!zone) return false;
  if (!zone.unlockRequirement) return true; // first zone
  return (bossKillCounts[zone.unlockRequirement] ?? 0) >= 1;
}

// ── Zone Picker Component ──

function ZonePicker({ onSelectZone, onSelectCorrupted }: {
  onSelectZone: (zoneId: string) => void;
  onSelectCorrupted: (tier: number) => void;
}) {
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const mapCompletedCounts = useGameStore(s => s.mapCompletedCounts);
  const mapFragments = useGameStore(s => s.mapFragments);
  const highestCorruptedTier = useGameStore(s => s.highestCorruptedTier);
  const highestIdx = getHighestUnlockedZoneIndex(bossKillCounts);
  const corruptedUnlocked = hasBeatenLastZone(bossKillCounts);

  // Group unlocked zones by band
  const unlockedZones = ZONE_DEFS.filter(z => isZoneUnlocked(z.id, bossKillCounts));
  const bandGroups = new Map<number, typeof unlockedZones>();
  for (const z of unlockedZones) {
    const list = bandGroups.get(z.band) ?? [];
    list.push(z);
    bandGroups.set(z.band, list);
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-100 mb-1 text-center">Select a Zone</h2>
        <p className="text-xs text-gray-500 mb-4 text-center">Choose where to run your next map</p>

        {/* ── Corrupted Maps Section ── */}
        {corruptedUnlocked && (() => {
          const nextTier = highestCorruptedTier + 1;
          const cost = corruptedMapCost(nextTier);
          const canAfford = mapFragments >= cost;
          const previewMods = rollMapModifiers(nextTier);
          return (
            <div className="mb-5">
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 border-b border-purple-800 pb-1">
                Corrupted Maps
              </div>
              <div className="bg-purple-950/30 border border-purple-700/50 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-purple-300">Tier {nextTier}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      (Highest cleared: T{highestCorruptedTier})
                    </span>
                  </div>
                  <div className="text-xs text-purple-300">
                    Cost: <span className={canAfford ? 'text-green-400' : 'text-red-400'}>{cost}</span> Fragments
                    <span className="text-gray-500 ml-1">({mapFragments} owned)</span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 mb-1">
                  Mob HP +{Math.round(nextTier * 8)}% · Mob DMG +{Math.round(nextTier * 5)}%
                  {nextTier % 5 === 0 && <span className="text-yellow-400 ml-1">· BOSS TIER</span>}
                </div>
                <div className="text-[11px] text-purple-300 mb-2">
                  Modifiers: {previewMods.map(m => m.label).join(', ')}
                </div>
                <button
                  onClick={() => canAfford && onSelectCorrupted(nextTier)}
                  disabled={!canAfford}
                  className={`w-full px-3 py-1.5 rounded text-sm font-bold transition-colors
                    ${canAfford
                      ? 'bg-purple-700/60 hover:bg-purple-600/70 text-purple-100 border border-purple-500/50'
                      : 'bg-gray-800/50 text-gray-600 border border-gray-700/30 cursor-not-allowed'}
                  `}
                >
                  Enter Corrupted Map (T{nextTier})
                </button>
              </div>
            </div>
          );
        })()}

        {Array.from(bandGroups.entries()).sort((a, b) => b[0] - a[0]).map(([band, zones]) => (
          <div key={band} className="mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 border-b border-gray-800 pb-1">
              Band {band} — {BAND_NAMES[band] ?? '???'}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {zones.map(zone => {
                const idx = getZoneIndex(zone.id);
                const isRecommended = idx === highestIdx;
                const mapsForZone = mapCompletedCounts[zone.id] ?? 0;
                const bossKills = bossKillCounts[zone.id] ?? 0;

                return (
                  <button
                    key={zone.id}
                    onClick={() => onSelectZone(zone.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded text-left transition-colors
                      ${isRecommended
                        ? 'bg-blue-900/40 border border-blue-500/50 hover:bg-blue-900/60'
                        : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/80'}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isRecommended ? 'text-blue-300' : 'text-gray-200'}`}>
                          {zone.name}
                        </span>
                        {isRecommended && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/40 text-blue-300 rounded font-bold">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        iLvl {zone.iLvlMin}–{zone.iLvlMax} · Boss: {zone.bossName}
                        {bossKills > 0 && <span className="text-green-500 ml-2">({bossKills}x killed)</span>}
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        {mapsForZone} maps cleared
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Map Screen ──

export default function MapScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MapState | null>(null);
  const keysRef = useRef(new Set<string>());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const killCountRef = useRef(0);
  const bossSpawnedRef = useRef(false);  // prevent double-spawning boss
  const bossMeleeTimerRef = useRef(0);   // boss melee attack cooldown
  const oorDotTimerRef = useRef(0);      // out-of-range DoT tick accumulator
  const selectedZoneRef = useRef<string | null>(null);  // zone chosen for current map session
  const downfarmedRef = useRef(false);
  const corruptedTierRef = useRef(0);       // 0 = normal map, 1+ = corrupted
  const corruptedModsRef = useRef<MapModifier[]>([]);
  const mobDebuffsRef = useRef<Map<number, import('../../types/combat').ActiveDebuff[]>>(new Map());
  const bossDebuffsRef = useRef<import('../../types/combat').ActiveDebuff[]>([]);
  const spritesRef = useRef<MapSprites>({ mobSprites: [], propSprites: [] });

  const [picking, setPicking] = useState(true); // start in zone-picker mode

  // ── Sprite preloader — loads zone-specific sprites ──
  const loadZoneSprites = useCallback((zoneId: string) => {
    const sprites: MapSprites = { mobSprites: [], propSprites: [] };
    const load = (src: string): HTMLImageElement => {
      const img = new Image();
      img.src = src;
      return img;
    };

    // Zone sprite mappings (add more zones as art is audited)
    const ZONE_SPRITES: Record<string, {
      floor: string; background?: string;
      mobs: string[]; boss: string;
      props?: string[];
    }> = {
      ashwood_thicket: {
        floor: '/images/map/floors/bogmire_marsh_00002_.png',
        background: '/images/map/backgrounds/forest_clearing_00001_.png',
        mobs: [
          '/images/map/mobs/ashwood_thicket/bark_beetle_00001_.png',
          '/images/map/mobs/ashwood_thicket/canopy_bat_00001_.png',
          '/images/map/mobs/ashwood_thicket/thicket_crawler_00001_.png',
        ],
        boss: '/images/map/bosses/ashwood_thicket/elder_brambleback_00001_.png',
        props: [
          '/images/map/props/mossy_boulder_00001_.png',
          '/images/map/props/dead_tree_00001_.png',
          '/images/map/props/rock_cluster_00001_.png',
          '/images/map/props/broken_pillar_00001_.png',
          '/images/map/props/fallen_log_00001_.png',
          '/images/map/props/thorn_bush_00001_.png',
          '/images/map/props/crumbled_wall_00001_.png',
          '/images/map/props/bone_pile_00001_.png',
        ],
      },
    };

    const zoneDef = ZONE_SPRITES[zoneId];
    if (zoneDef) {
      sprites.floorTile = load(zoneDef.floor);
      if (zoneDef.background) {
        const bgImg = load(zoneDef.background);
        sprites.roomBackground = bgImg;
        // When background loads, build collision grid from pixel brightness
        bgImg.onload = () => {
          const state = stateRef.current;
          if (!state || !bgImg.complete) return;
          const cellSize = 8; // 8 world-px per grid cell (less noise-sensitive)
          const gw = Math.ceil(bgImg.naturalWidth / cellSize);
          const gh = Math.ceil(bgImg.naturalHeight / cellSize);
          const offscreen = new OffscreenCanvas(gw, gh);
          const octx = offscreen.getContext('2d')!;
          octx.drawImage(bgImg, 0, 0, gw, gh);
          const imgData = octx.getImageData(0, 0, gw, gh);
          const grid = new Uint8Array(gw * gh);
          for (let i = 0; i < gw * gh; i++) {
            const r = imgData.data[i * 4];
            const g = imgData.data[i * 4 + 1];
            const b = imgData.data[i * 4 + 2];
            // Brightness threshold: only dense tree canopy (<35) is blocked
            // Dirt (~70-120), shadows (~50-70), rocks (~60-90) are all walkable
            const brightness = (r + g + b) / 3;
            grid[i] = brightness > 35 ? 1 : 0;
          }
          state.collisionGrid = grid;
          state.collisionGridW = gw;
          state.collisionGridH = gh;
          state.collisionCellSize = cellSize;
          state.collisionBgW = bgImg.naturalWidth;
          state.collisionBgH = bgImg.naturalHeight;
        };
      }
      sprites.mobSprites = zoneDef.mobs.map(load);
      sprites.boss = load(zoneDef.boss);
      if (zoneDef.props) sprites.propSprites = zoneDef.props.map(load);
    }
    // Player sprite (always loaded)
    sprites.player = load('/images/map/player/adventurer_00001_.png');

    spritesRef.current = sprites;
  }, []);

  const handleSelectZone = useCallback((zoneId: string) => {
    selectedZoneRef.current = zoneId;
    corruptedTierRef.current = 0;
    corruptedModsRef.current = [];
    loadZoneSprites(zoneId);

    // Compute downfarm status
    const gs = useGameStore.getState();
    const highestIdx = getHighestUnlockedZoneIndex(gs.bossKillCounts);
    const selectedIdx = getZoneIndex(zoneId);
    downfarmedRef.current = (highestIdx - selectedIdx) >= DOWNFARM_ZONE_GAP;

    setPicking(false);
  }, []);

  const handleSelectCorrupted = useCallback((tier: number) => {
    const gs = useGameStore.getState();
    const cost = corruptedMapCost(tier);
    if (gs.mapFragments < cost) return;

    // Deduct fragments
    useGameStore.setState({ mapFragments: gs.mapFragments - cost });

    // Use last zone as base
    const lastZone = ZONE_DEFS[ZONE_DEFS.length - 1];
    selectedZoneRef.current = lastZone.id;
    loadZoneSprites(lastZone.id);
    corruptedTierRef.current = tier;
    corruptedModsRef.current = rollMapModifiers(tier);
    downfarmedRef.current = false;

    setPicking(false);
  }, []);

  // When picking changes from true→false, start a map
  useEffect(() => {
    if (picking) return;
    const zoneId = selectedZoneRef.current;
    if (!zoneId) { setPicking(true); return; }

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

    // Init map state for selected zone
    const zone = ZONE_DEFS.find(z => z.id === zoneId);
    if (!zone) { setPicking(true); return; }

    const cTier = corruptedTierRef.current;
    const cMods = corruptedModsRef.current;
    // Every map has a boss at the end (1 boss per map)
    stateRef.current = createMapState(canvas.width, canvas.height, zone.band, 1, true, cTier, cMods);
    killCountRef.current = 0;
    lastTimeRef.current = 0;
    bossSpawnedRef.current = false;
    bossMeleeTimerRef.current = 0;
    oorDotTimerRef.current = 0;
    mobDebuffsRef.current.clear();
    bossDebuffsRef.current = [];

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
      logCombat(mapState as any, `${source} -> ${Math.round(rawDamage)}`, '#f87171');
    };

    // Helper: grant map fragments
    const grantFragments = (count: number) => {
      const cur = useGameStore.getState().mapFragments;
      useGameStore.setState({ mapFragments: cur + count });
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
      const zoneData = zone; // captured from outer scope — always the selected zone

      const isDownfarmed = downfarmedRef.current;
      const xpMult = isDownfarmed ? DOWNFARM_XP_MULT : 1.0;
      const corruptedDmgMult = map.corruptedTier > 0 ? (1 + map.corruptedTier * 0.05) : 1;

      if (!map.paused && map.phase !== 'complete' && map.phase !== 'failed') {
       try { // ── Master try/catch: prevents game loop freeze from any combat error ──
        // Update spatial simulation
        updateMap(map, dt, keysRef.current);

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

        // ── Player Debuff DPS (poison + bleed) ──
        if (map.playerDebuffs.length > 0) {
          for (const deb of map.playerDebuffs) {
            if (deb.type === 'poison') {
              // Poison: deal magnitude DPS every frame (scaled by dt)
              const poisonDmg = deb.magnitude * dt;
              if (poisonDmg > 0.1) {
                applySpatialDamage(map, poisonDmg, 'Poison');
                // Floater every 0.5s approximately
                if (Math.random() < dt * 2) {
                  addPlayerHitFloater(map as any, Math.round(deb.magnitude * 0.5), false, false);
                }
              }
            } else if (deb.type === 'bleed' && map.playerMoving) {
              // Bleed: deal magnitude * 0.5 DPS when moving
              const bleedDmg = deb.magnitude * 0.5 * dt;
              if (bleedDmg > 0.05) {
                applySpatialDamage(map, bleedDmg, 'Bleed');
                if (Math.random() < dt * 2) {
                  addPlayerHitFloater(map as any, Math.round(deb.magnitude * 0.25), false, false);
                }
              }
            }
          }
        }

        // ── Rare Mob Ability Damage ── (copy entries to avoid Map iteration crash)
        for (const [mobId, ability] of [...map.rareAbilityStates]) {
          const mob = map.mobs.find(m => m.mobId === mobId);
          if (!mob || mob.dead) continue;

          // Charge: damage if mob reaches melee range during charge
          if (ability.type === 'charge' && ability.activeTimer > 0 && map.iFrameTimer <= 0) {
            const cdx = map.player.x - mob.x;
            const cdy = map.player.y - mob.y;
            const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cDist < 35 + map.playerRadius + mob.radius) {
              const chargeDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * 2 * corruptedDmgMult;
              applySpatialDamage(map, chargeDmg, 'Rare Charge');
              addPlayerHitFloater(map as any, Math.round(chargeDmg), false, false);
              triggerIFrames(map as any);
              triggerShake(map as any, 5);
            }
          }

          // Leap: AoE damage on landing (telegraphTimer just crossed 0 → activeTimer just started)
          if (ability.type === 'leap' && ability.activeTimer > 0 && ability.activeTimer < 0.1 && map.iFrameTimer <= 0) {
            const ldx = map.player.x - ability.targetX;
            const ldy = map.player.y - ability.targetY;
            const lDist = Math.sqrt(ldx * ldx + ldy * ldy);
            if (lDist < 80 + map.playerRadius) {
              const leapDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * 2.5 * corruptedDmgMult;
              applySpatialDamage(map, leapDmg, 'Rare Leap');
              addPlayerHitFloater(map as any, Math.round(leapDmg), false, false);
              triggerIFrames(map as any);
            }
          }

          // Spin: continuous damage in 60px radius during activeTimer
          if (ability.type === 'spin' && ability.activeTimer > 0 && map.iFrameTimer <= 0) {
            const sdx = map.player.x - mob.x;
            const sdy = map.player.y - mob.y;
            const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sDist < 60 + map.playerRadius) {
              const spinDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * 1.5 * dt * corruptedDmgMult;
              if (spinDmg > 0.1) {
                applySpatialDamage(map, spinDmg, 'Rare Spin');
                if (Math.random() < dt * 4) {
                  addPlayerHitFloater(map as any, Math.round(spinDmg / dt), false, false);
                }
                triggerIFrames(map as any);
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
          const rawDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * levelMult * variance * corruptedDmgMult;

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
              // Roll ailment from projectile source mob
              const srcMob = map.mobs.find(m => m.mobId === proj.sourceMobId);
              if (srcMob) {
                const ailmentChance = srcMob.isRare ? 0.6 : (srcMob.color === '#60a5fa' ? 0.3 : 0);
                if (ailmentChance > 0 && Math.random() < ailmentChance) {
                  const duration = srcMob.isRare ? 3 : 2;
                  map.playerDebuffs.push({ type: 'slow', remainingTime: duration, magnitude: 0.5 });
                }
              }
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
            const rawDmg = (SPATIAL_DMG_BASE * zoneData.band + SPATIAL_DMG_ILVL_SCALE * zoneData.iLvlMin) * levelMult * variance * dmgMult * corruptedDmgMult;
            const roll = rollZoneAttack(rawDmg, 0.7, zoneAccuracy, projStats!, undefined, undefined, zoneData.band);
            addPlayerHitFloater(map as any, Math.round(roll.damage), roll.isDodged, roll.isBlocked);
            if (!roll.isDodged && !roll.isBlocked && roll.damage > 0) {
              triggerIFrames(map as any);
              applySpatialDamage(map, roll.damage, 'Melee');
              // Roll ailment from melee mob
              const ailmentChance = mob.isRare ? 0.6 : (mob.color === '#60a5fa' ? 0.3 : 0);
              if (ailmentChance > 0 && Math.random() < ailmentChance) {
                const duration = mob.isRare ? 3 : 2;
                if (mob.color === '#22d3ee') {
                  map.playerDebuffs.push({ type: 'slow', remainingTime: duration, magnitude: 0.5 });
                } else if (mob.color === '#4ade80' || mob.arenaAffixes?.includes('toxic')) {
                  map.playerDebuffs.push({ type: 'poison', remainingTime: duration + 1, magnitude: roll.damage * 0.15 });
                } else {
                  map.playerDebuffs.push({ type: 'bleed', remainingTime: duration, magnitude: roll.damage * 0.15 });
                }
              }
            }
          }
        }

        // ── Boss Spawn (when engine sets phase to boss_fight) ──
        if (map.phase === 'boss_fight' && !bossSpawnedRef.current && !map.bossMob) {
          bossSpawnedRef.current = true;
          const bossName = zoneData.bossName ?? `${zoneData.name} Guardian`;
          spawnMapBoss(map, zoneData.band, bossName);
          // Set hazard DPS for any boss-spawned ground hazards
          for (const h of map.hazards) {
            if (h.damagePerSec === 0) {
              h.damagePerSec = SPATIAL_DMG_BASE * zoneData.band * BOSS_HAZARD_DPS_MULT;
            }
          }
        }

        // ── Boss Hazard DPS Fixup (set DPS on newly spawned boss hazards) ──
        if (map.bossMob && !map.bossMob.dead) {
          for (const h of map.hazards) {
            if (h.damagePerSec === 0) {
              h.damagePerSec = SPATIAL_DMG_BASE * zoneData.band * BOSS_HAZARD_DPS_MULT;
            }
          }
        }

        // ── Boss Damage to Player ──
        if (map.bossMob && !map.bossMob.dead && projStats && map.iFrameTimer <= 0) {
          const boss = map.bossMob;
          const levelMult = calcLevelDamageMult(gs.character.level, zoneData.iLvlMin);
          const zoneAccuracy = calcZoneAccuracy(zoneData.band, gs.character.level, zoneData.iLvlMin);

          // Boss slam damage (check if slam just landed)
          if (boss.slamTelegraph <= 0 && boss.slamTelegraph > -dt * 2) {
            const sdx = map.player.x - boss.slamX;
            const sdy = map.player.y - boss.slamY;
            const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sDist < 80 + map.playerRadius) {
              const slamDmg = SPATIAL_DMG_BASE * zoneData.band * BOSS_SLAM_DAMAGE_MULT * levelMult * corruptedDmgMult;
              const roll = rollZoneAttack(slamDmg, 0.7, zoneAccuracy, projStats!, undefined, undefined, zoneData.band);
              addPlayerHitFloater(map as any, Math.round(roll.damage), roll.isDodged, roll.isBlocked);
              if (!roll.isDodged && !roll.isBlocked && roll.damage > 0) {
                triggerIFrames(map as any);
                applySpatialDamage(map, roll.damage, 'Boss Slam');
                // Boss slam ailment: 80% chance, 4s slow
                if (Math.random() < 0.8) {
                  map.playerDebuffs.push({ type: 'slow', remainingTime: 4, magnitude: 0.5 });
                }
              }
            }
          }

          // Boss barrage projectile damage (sourceMobId === -999)
          for (const proj of map.projectiles) {
            if (proj.hit || proj.sourceMobId !== -999) continue;
            const pdx = map.player.x - proj.x;
            const pdy = map.player.y - proj.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) > proj.radius + map.playerRadius) continue;
            proj.hit = true;
            if (map.iFrameTimer > 0) continue;
            const barrageDmg = SPATIAL_DMG_BASE * zoneData.band * BOSS_BARRAGE_DAMAGE_MULT * levelMult * corruptedDmgMult;
            const roll = rollZoneAttack(barrageDmg, 0.7, zoneAccuracy, projStats!, undefined, undefined, zoneData.band);
            addPlayerHitFloater(map as any, Math.round(roll.damage), roll.isDodged, roll.isBlocked);
            if (!roll.isDodged && !roll.isBlocked && roll.damage > 0) {
              triggerIFrames(map as any);
              applySpatialDamage(map, roll.damage, 'Boss Barrage');
              // Boss barrage ailment: 80% chance, 4s poison
              if (Math.random() < 0.8) {
                map.playerDebuffs.push({ type: 'poison', remainingTime: 4, magnitude: roll.damage * 0.1 });
              }
            }
          }

          // Boss melee attacks
          bossMeleeTimerRef.current -= dt;
          if (bossMeleeTimerRef.current <= 0 && bossCanAttackMapPlayer(map)) {
            bossMeleeTimerRef.current = BOSS_MELEE_INTERVAL;
            const meleeDmg = SPATIAL_DMG_BASE * zoneData.band * 1.5 * levelMult * (0.8 + Math.random() * 0.4) * corruptedDmgMult;
            const roll = rollZoneAttack(meleeDmg, 0.7, zoneAccuracy, projStats!, undefined, undefined, zoneData.band);
            addPlayerHitFloater(map as any, Math.round(roll.damage), roll.isDodged, roll.isBlocked);
            if (!roll.isDodged && !roll.isBlocked && roll.damage > 0) {
              triggerIFrames(map as any);
              applySpatialDamage(map, roll.damage, 'Boss Melee');
              // Boss melee ailment: 80% chance, 4s bleed
              if (Math.random() < 0.8) {
                map.playerDebuffs.push({ type: 'bleed', remainingTime: 4, magnitude: roll.damage * 0.12 });
              }
            }
          }
        }

        // ── Boss Combat (player skills damage boss) ──
        if (map.bossMob && !map.bossMob.dead) {
          const boss = map.bossMob;
          const bossDistX = map.player.x - boss.x;
          const bossDistY = map.player.y - boss.y;
          const bossDist = Math.sqrt(bossDistX * bossDistX + bossDistY * bossDistY);

          if (bossDist <= PLAYER_ATTACK_RANGE + boss.radius) {
            // Boss is in player attack range — tick combat against boss
            // Use local budget so boss doesn't consume ticks needed by normal mobs
            let bossTickBudget = map.tickAccumulator;
            while (bossTickBudget >= 0.25) {
              bossTickBudget -= 0.25;

              const tickGs = useGameStore.getState();
              // Create a single-mob pack representing the boss
              const now = Date.now();
              const bossPack: import('../../types/combat').MobInPack[] = [{
                hp: boss.hp,
                maxHp: boss.maxHp,
                rare: {
                  affixes: [] as import('../../types/combat').RareAffixId[],
                  combinedHpMult: 1, combinedLootMult: 1, combinedDamageMult: 1,
                  combinedAtkSpeedMult: 1, combinedDamageTakenMult: 1, combinedRegenPerSec: 0,
                },
                damageElement: (zoneData.bossDamageElement ?? 'physical') as any,
                physRatio: zoneData.bossPhysRatio ?? 1,
                debuffs: bossDebuffsRef.current.length > 0 ? bossDebuffsRef.current : [] as import('../../types/combat').ActiveDebuff[],
                nextAttackAt: now + 10000,
              }];

              useGameStore.setState({ packMobs: bossPack, currentPackSize: 1 });
              const result = tickGs.tickCombat(0.25);
              const postPack = useGameStore.getState().packMobs;

              // Restore store so engine doesn't accumulate ghost packs
              useGameStore.setState({ packMobs: [], currentPackSize: 0 });

              // Sync boss HP + debuffs
              // Key: if engine killed the boss (mobKills > 0), don't sync HP from postPack
              // because the engine may have auto-spawned a fresh mob in the pack
              const bossWasKilled = result.mobKills > 0;

              if (!bossWasKilled && postPack.length > 0) {
                bossDebuffsRef.current = postPack[0].debuffs ?? [];
                const prevBossHp = boss.hp;
                boss.hp = postPack[0].hp;
                const hpDelta = prevBossHp - postPack[0].hp;

                if (hpDelta > 0) {
                  boss.lastHitTime = map.totalTime;
                  if (bossDist > 1) {
                    const kbForce = 30;
                    boss.knockbackVx = (bossDistX / bossDist) * -kbForce;
                    boss.knockbackVy = (bossDistY / bossDist) * -kbForce;
                  }
                  map.floaters.push({
                    x: boss.x + (Math.random() - 0.5) * 30,
                    y: boss.y - boss.radius - 5,
                    text: result.isCrit ? `${Math.round(hpDelta)}!` : `${Math.round(hpDelta)}`,
                    color: result.isCrit ? '#fbbf24' : '#ffffff',
                    age: 0, maxAge: 0.8, isCrit: result.isCrit, vy: -60,
                  });
                }
              }

              // Boss death — engine killed it OR HP dropped to 0
              if (bossWasKilled || (boss.hp <= 0 && !boss.dead)) {
                  boss.dead = true;
                  boss.deathTimer = 0;
                  map.bossDefeatedBanner = 3.0;

                  // Screen shake + particles
                  map.shakeIntensity = 15;
                  map.shakeTimer = 0.5;
                  for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    map.particles.push({
                      x: boss.x, y: boss.y,
                      vx: Math.cos(angle) * (100 + Math.random() * 120),
                      vy: Math.sin(angle) * (100 + Math.random() * 120),
                      size: 3 + Math.random() * 4,
                      color: boss.color,
                      age: 0, maxAge: 0.8 + Math.random() * 0.5,
                    });
                  }

                  // Handle boss victory in store — save/restore idle combat phase
                  // so handleBossVictory doesn't trigger the idle recovery timer.
                  const bossVictoryGs = useGameStore.getState();
                  const prevPhase = bossVictoryGs.combatPhase;
                  const prevPhaseStart = bossVictoryGs.combatPhaseStartedAt;
                  bossVictoryGs.startBossFight(); // set combatPhase to boss_fight (needed for handleBossVictory)
                  const bossResult = useGameStore.getState().handleBossVictory();
                  // Restore idle combat phase so the idle state machine isn't disrupted
                  useGameStore.setState({ combatPhase: prevPhase as any, combatPhaseStartedAt: prevPhaseStart });

                  // Ensure boss kill count is incremented (handleBossVictory does this,
                  // but we also set it explicitly to guarantee zone unlock)
                  const bkGs = useGameStore.getState();
                  const newBossKills = { ...(bkGs.bossKillCounts ?? {}) };
                  if ((newBossKills[zoneId] ?? 0) < 1 || !bossResult) {
                    // handleBossVictory may not have run — ensure kill count is set
                    newBossKills[zoneId] = (newBossKills[zoneId] ?? 0) + (bossResult ? 0 : 1);
                    useGameStore.setState({ bossKillCounts: newBossKills });
                  }

                  if (bossResult) {
                    const loot = rollBossArenaLoot(bossResult, { x: boss.x, y: boss.y });
                    map.groundItems.push(...loot);
                    for (const gi of loot) {
                      logCombat(map as any, `BOSS DROP: ${gi.label}`, gi.color);
                    }
                  }

                  // Boss kill: guaranteed map fragments (3-5, + modifier bonus)
                  const bossModFragBonus = 1 + map.modifiers.reduce((s, m) => s + m.fragMult, 0);
                  const bossFrags = Math.round((FRAGMENT_BOSS_MIN + Math.floor(Math.random() * (FRAGMENT_BOSS_MAX - FRAGMENT_BOSS_MIN + 1))) * bossModFragBonus);
                  grantFragments(bossFrags);
                  map.floaters.push({
                    x: boss.x + 30, y: boss.y - boss.radius - 50,
                    text: `+${bossFrags} Fragments`, color: '#c084fc',
                    age: 0, maxAge: 1.5, isCrit: false, vy: -50,
                  });

                  // XP bonus for boss kill (with downfarm penalty + modifier bonus)
                  const bossModXpBonus = 1 + map.modifiers.reduce((s, m) => s + m.xpMult, 0);
                  const xpScale = Math.max(0.1, calcXpScale(gs.character.level, zoneData.iLvlMin));
                  const bossXp = Math.max(1, Math.round(50 * zoneData.band * xpScale * MAP_XP_MULTIPLIER * xpMult * bossModXpBonus));
                  useGameStore.getState().grantIdleXp(bossXp);
                  map.floaters.push({
                    x: boss.x, y: boss.y - boss.radius - 30,
                    text: `+${bossXp} XP`, color: '#fbbf24',
                    age: 0, maxAge: 1.5, isCrit: true, vy: -70,
                  });

                  // Reset map completion counter for this zone after boss kill
                  const bossMapCounts = { ...useGameStore.getState().mapCompletedCounts };
                  bossMapCounts[zoneId] = 0;
                  useGameStore.setState({ mapCompletedCounts: bossMapCounts });

                  // Gem explosion
                  for (let g = 0; g < 15; g++) {
                    const gAngle = Math.random() * Math.PI * 2;
                    const gDist = 20 + Math.random() * 40;
                    map.gems.push({
                      x: boss.x + Math.cos(gAngle) * gDist,
                      y: boss.y + Math.sin(gAngle) * gDist,
                      color: g < 5 ? '#fbbf24' : '#60a5fa',
                      size: 4 + Math.random() * 3,
                      age: 0, collected: false, collectTimer: 0,
                    });
                  }

                  logCombat(map as any, `${boss.name} DEFEATED!`, '#fbbf24');

                  // Spawn exit portal SOUTH of boss so loot isn't overlapped
                  map.portal = { x: boss.x, y: boss.y + 150, active: true };
              }

              // Skill visuals
              if (result.skillFired && result.skillId) {
                markSkillCast(map as any, result.skillId);
                const visDef = getUnifiedSkillDef(result.skillId);
                // Target the boss for skill visuals
                if (visDef?.tags) spawnSkillVisual(map as any, visDef.tags, { x: boss.x, y: boss.y, radius: boss.radius } as any);
              }
              if (result.isCrit && result.damageDealt > 0) {
                triggerShake(map as any, 4);
                map.critFlashTimer = 0.03;
                map.hitStopTimer = 0.03;
              }
            }
          }
        }

        // ── Combat Ticks (auto-cast skill rotation — normal mobs) ──
        while (map.tickAccumulator >= 0.25) {
          map.tickAccumulator -= 0.25;

          const mobsInRange = getMapMobsInRange(map, PLAYER_ATTACK_RANGE);

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
            debuffs: mobDebuffsRef.current.get(m.mobId) ?? [],
            nextAttackAt: now + 5000,
          }));

          if (mobsInRange.length === 0) {
            continue;
          }

          // Set store to temp pack with proper sequential indices
          useGameStore.setState({ packMobs: tempPack, currentPackSize: tempPack.length });

          // Engine combat tick — full pipeline on in-range mobs
          const result = useGameStore.getState().tickCombat(0.25);
          const postPack = useGameStore.getState().packMobs;

          // Restore store so engine doesn't accumulate ghost packs
          useGameStore.setState({ packMobs: [], currentPackSize: 0 });

          // Engine pops dead mobs from the FRONT of the pack.
          // result.mobKills = number of mobs popped from front.
          let kills = result.mobKills;
          let rareKills = 0;

          // Capture visTarget BEFORE kill processing (mobs may all become .dead)
          const visTarget = mobsInRange.find(m => !m.dead) ?? (mobsInRange.length > 0 ? mobsInRange[0] : null);

          // Mark killed mobs (front-popped from tempPack → sequential mobsInRange)
          for (let i = 0; i < kills && i < mobsInRange.length; i++) {
            const visMob = mobsInRange[i];
            if (!visMob.dead) {
              visMob.dead = true;
              visMob.deathTimer = 0;
              rareKills += visMob.isRare ? 1 : 0;
              mobDebuffsRef.current.delete(visMob.mobId);
              addKillFloater(map as any, visMob);
              spawnDeathParticles(map as any, visMob);
              spawnDeathHazards(map as any, visMob, zoneData.band);
              spawnGems(map as any, visMob, 2 + Math.floor(Math.random() * 3));
              if (Math.random() < 0.3) spawnGems(map as any, visMob, 1, true);
              // Volatile modifier: fire pool on every mob death
              if (hasModifier(map.modifiers, 'volatile')) {
                map.hazards.push({
                  id: map.nextHazardId++,
                  x: visMob.x, y: visMob.y,
                  radius: 30, type: 'fire',
                  age: 0, maxAge: 2,
                  damagePerSec: 8 + zoneData.band * 2,
                  lastDamageTick: 0,
                });
              }
            }
          }

          // Sync surviving mobs (postPack[j] → mobsInRange[kills + j])
          for (let j = 0; j < postPack.length && kills + j < mobsInRange.length; j++) {
            const visMob = mobsInRange[kills + j];
            const prevHp = visMob.hp;
            visMob.hp = postPack[j].hp;
            visMob.maxHp = postPack[j].maxHp;
            visMob.activeDebuffs = postPack[j].debuffs?.map(d => d.debuffId) ?? [];
            mobDebuffsRef.current.set(visMob.mobId, postPack[j].debuffs ?? []);
            const hpDelta = prevHp - postPack[j].hp;

            if (hpDelta > 0 && postPack[j].hp > 0) {
              markMobHit(map as any, visMob);
              applyKnockback(map as any, visMob);
              addDamageFloater(map as any, hpDelta, result.isCrit, visMob);
            }
            if (postPack[j].hp <= 0 && prevHp > 0) {
              visMob.dead = true;
              visMob.deathTimer = 0;
              kills++;
              rareKills += visMob.isRare ? 1 : 0;
              mobDebuffsRef.current.delete(visMob.mobId);
              addKillFloater(map as any, visMob);
              spawnDeathParticles(map as any, visMob);
              spawnDeathHazards(map as any, visMob, zoneData.band);
              spawnGems(map as any, visMob, 2 + Math.floor(Math.random() * 3));
              if (Math.random() < 0.3) spawnGems(map as any, visMob, 1, true);
              // Volatile modifier: fire pool on every mob death
              if (hasModifier(map.modifiers, 'volatile')) {
                map.hazards.push({
                  id: map.nextHazardId++,
                  x: visMob.x, y: visMob.y,
                  radius: 30, type: 'fire',
                  age: 0, maxAge: 2,
                  damagePerSec: 8 + zoneData.band * 2,
                  lastDamageTick: 0,
                });
              }
            }
          }

          // ── Visual feedback + combat log: consume ALL result fields ──

          // Skill fired
          if (result.skillFired && result.skillId) {
            markSkillCast(map as any, result.skillId);
            const visDef = getUnifiedSkillDef(result.skillId);

            // Shadow Dash: always dash in facing direction, even with no targets
            if (result.skillId === 'dagger_shadow_dash') {
              if (visDef?.tags) spawnSkillVisual(map as any, visDef.tags, null, []);
              dashPlayerForward(map as any, 100);
              triggerShake(map as any, 3);
            } else if (result.skillId === 'dagger_blade_trap') {
              // Blade Trap: place persistent spinning trap in front of player
              const trapX = map.player.x + map.playerFacing.x * 40;
              const trapY = map.player.y + map.playerFacing.y * 40;
              placeArenaTrap(map as any, trapX, trapY);
              if (visDef?.tags) spawnSkillVisual(map as any, visDef.tags, visTarget as any, []);
            } else {
              if (visDef?.tags) spawnSkillVisual(map as any, visDef.tags, visTarget as any, []);
            }

            const dmgStr = result.damageDealt > 0 ? ` -> ${Math.round(result.damageDealt)}` : '';
            const critStr = result.isCrit ? ' CRIT!' : '';
            logCombat(map as any, `${visDef?.name ?? result.skillId}${dmgStr}${critStr}`, result.isCrit ? '#fbbf24' : '#e5e7eb');
          }

          // DoT damage (poison + burning ticks)
          if (result.dotDamage && result.dotDamage > 0 && visTarget) {
            addDotFloater(map as any, result.dotDamage, { x: visTarget.x + 15, y: visTarget.y });
            logCombat(map as any, `DoT tick -> ${Math.round(result.dotDamage)}`, '#86efac');
          }

          // Bleed trigger damage (fires when enemy attacks)
          if (result.bleedTriggerDamage && result.bleedTriggerDamage > 0 && visTarget) {
            addDotFloater(map as any, result.bleedTriggerDamage, { x: visTarget.x - 15, y: visTarget.y - 5 });
            logCombat(map as any, `Bleed trigger -> ${Math.round(result.bleedTriggerDamage)}`, '#f87171');
          }

          // Shatter damage (cold overkill burst)
          if (result.shatterDamage && result.shatterDamage > 0 && visTarget) {
            addProcFloater(map as any, `SHATTER ${Math.round(result.shatterDamage)}`, visTarget);
            logCombat(map as any, `Shatter -> ${Math.round(result.shatterDamage)}`, '#22d3ee');
          }

          // Counter-hit damage (dagger weapon module)
          if (result.counterHitDamage && result.counterHitDamage > 0 && visTarget) {
            addProcFloater(map as any, `COUNTER ${Math.round(result.counterHitDamage)}`, visTarget);
            logCombat(map as any, `Counter-hit -> ${Math.round(result.counterHitDamage)}`, '#c4b5fd');
          }

          // Trap detonation damage (trap weapon module)
          if (result.trapDetonationDamage && result.trapDetonationDamage > 0 && visTarget) {
            detonateOldestArenaTrap(map as any);
            addProcFloater(map as any, `TRAP ${Math.round(result.trapDetonationDamage)}`, visTarget);
            logCombat(map as any, `Trap detonate -> ${Math.round(result.trapDetonationDamage)}`, '#f97316');
          }

          // Structured proc events (talent procs, on-hit effects)
          if (result.procEvents && result.procEvents.length > 0) {
            for (const pe of result.procEvents) {
              if (pe.damage > 0 && visTarget) {
                addProcFloater(map as any, `${pe.label} ${Math.round(pe.damage)}`, visTarget);
              } else if (pe.label && visTarget) {
                addProcFloater(map as any, pe.label, visTarget);
              }
              const peDmg = pe.damage > 0 ? ` -> ${Math.round(pe.damage)}` : '';
              logCombat(map as any, `${pe.label}${peDmg}`, '#c4b5fd');
            }
          } else if (result.procDamage && result.procDamage > 0 && visTarget) {
            addProcFloater(map as any, result.procLabel || 'PROC', visTarget);
            logCombat(map as any, `${result.procLabel || 'Proc'} -> ${Math.round(result.procDamage)}`, '#c4b5fd');
          }

          // Debuff spread events (on-kill spread to new mob)
          if (result.spreadEvents && result.spreadEvents.length > 0 && visTarget) {
            addProcFloater(map as any, 'SPREAD', visTarget);
            for (const se of result.spreadEvents) {
              logCombat(map as any, `Spread ${se.debuffId} x${se.stacks}`, '#a78bfa');
            }
          } else if (result.didSpreadDebuffs && visTarget) {
            addProcFloater(map as any, 'SPREAD', visTarget);
            logCombat(map as any, 'Debuffs spread', '#a78bfa');
          }

          // Cooldown reset indicator
          if (result.gcdWasReset) {
            map.floaters.push({
              x: map.player.x, y: map.player.y - 40,
              text: 'INSTANT', color: '#60a5fa',
              age: 0, maxAge: 0.8, isCrit: false, vy: -50,
            });
            logCombat(map as any, 'Instant cast!', '#60a5fa');
          }
          if (result.cooldownWasReset) {
            map.floaters.push({
              x: map.player.x + (Math.random() - 0.5) * 30, y: map.player.y - 45,
              text: 'CD RESET', color: '#34d399',
              age: 0, maxAge: 1.0, isCrit: false, vy: -55,
            });
            logCombat(map as any, 'Cooldown reset!', '#34d399');
          }

          // Player-received damage (engine zone attacks)
          if (result.zoneAttack) {
            addPlayerHitFloater(map as any, result.zoneAttack.damage, result.zoneAttack.isDodged, result.zoneAttack.isBlocked);
            if (!result.zoneAttack.isDodged && !result.zoneAttack.isBlocked && result.zoneAttack.damage > 0) {
              triggerIFrames(map as any);
              logCombat(map as any, `Hit for ${Math.round(result.zoneAttack.damage)}`, '#f87171');
            } else if (result.zoneAttack.isDodged) {
              logCombat(map as any, 'DODGE', '#67e8f9');
              const ds = useGameStore.getState();
              useGameStore.setState({ pendingSpatialDodges: (ds.pendingSpatialDodges ?? 0) + 1 });
            } else if (result.zoneAttack.isBlocked) {
              logCombat(map as any, 'BLOCK', '#93c5fd');
              const bs = useGameStore.getState();
              useGameStore.setState({ pendingSpatialBlocks: (bs.pendingSpatialBlocks ?? 0) + 1 });
            }
          }

          // Player death from zone attacks
          if (result.zoneDeath) {
            logCombat(map as any, 'DEFEATED', '#fca5a5');
            const deathGs = useGameStore.getState();
            if (deathGs.combatPhase === 'clearing') {
              useGameStore.setState({
                combatPhase: 'zone_defeat' as never,
                combatPhaseStartedAt: Date.now(),
              });
              map.phase = 'failed';
            }
          }

          // Crit feedback + hit-stop
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

            // Map fragment drops from rare kills (50% chance each, + modifier bonus)
            if (rareKills > 0) {
              const modFragBonus = 1 + map.modifiers.reduce((s, m) => s + m.fragMult, 0);
              let fragDrops = 0;
              for (let r = 0; r < rareKills; r++) {
                if (Math.random() < FRAGMENT_RARE_DROP_CHANCE) fragDrops++;
              }
              fragDrops = Math.round(fragDrops * modFragBonus);
              if (fragDrops > 0) {
                grantFragments(fragDrops);
                map.floaters.push({
                  x: map.player.x + (Math.random() - 0.5) * 30,
                  y: map.player.y - 45,
                  text: `+${fragDrops} Fragment${fragDrops > 1 ? 's' : ''}`, color: '#c084fc',
                  age: 0, maxAge: 1.0, isCrit: false, vy: -50,
                });
              }
            }

            // XP (with map multiplier + downfarm penalty + modifier bonuses)
            const modXpBonus = 1 + map.modifiers.reduce((s, m) => s + m.xpMult, 0);
            const xpScale = Math.max(0.1, calcXpScale(gs.character.level, zoneData.iLvlMin));
            const xpGrant = Math.max(1, Math.round(10 * zoneData.band * kills * xpScale * MAP_XP_MULTIPLIER * xpMult * modXpBonus));
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

        // ── Out-of-range DoT ticking — uses engine's tickDebuffDoT for identical behavior ──
        {
          const oorToDelete: number[] = [];
          // Get player stats for DoT multipliers (effectBonus, incDoTDamage)
          let oorEffectBonus = 1;
          let oorIncDoTDmg = 0;
          try {
            const oorStats = resolveStats(gs.character);
            oorIncDoTDmg = oorStats.incDoTDamage ?? 0;
          } catch { /* fallback to 0 */ }

          for (const [mobId, debuffs] of mobDebuffsRef.current) {
            if (debuffs.length === 0) { oorToDelete.push(mobId); continue; }
            const mob = map.mobs.find(m => m.mobId === mobId);
            if (!mob || mob.dead) { oorToDelete.push(mobId); continue; }

            // Skip mobs in combat range (already handled by tickCombat)
            const ddx = map.player.x - mob.x;
            const ddy = map.player.y - mob.y;
            if (Math.sqrt(ddx * ddx + ddy * ddy) <= PLAYER_ATTACK_RANGE) continue;

            // Use the EXACT same engine function as idle combat
            const dotResult = tickDebuffDoT(debuffs, dt, oorEffectBonus, oorIncDoTDmg, mob.maxHp);
            mobDebuffsRef.current.set(mobId, dotResult.updatedDebuffs);
            if (dotResult.updatedDebuffs.length === 0) oorToDelete.push(mobId);

            // Update mob visual debuff indicators
            mob.activeDebuffs = dotResult.updatedDebuffs.map(d => d.debuffId);

            if (dotResult.damage > 0) {
              mob.hp -= dotResult.damage;
              addDotFloater(map as any, dotResult.damage, { x: mob.x, y: mob.y });

              if (mob.hp <= 0) {
                mob.dead = true;
                mob.deathTimer = 0;
                map.totalKills++;
                killCountRef.current++;
                spawnDeathParticles(map as any, mob);
                spawnGems(map as any, mob, 2);
                oorToDelete.push(mobId);
              }
            }
          }
          for (const id of oorToDelete) mobDebuffsRef.current.delete(id);
        }

       } catch (e) { console.error('[map] simulation error:', e); } // ── End master try/catch ──
      }

      // ── Map Completion — wait for ENTER or 5s auto-advance ──
      if (map.phase === 'complete' && map.completedAt > 0) {
        const sinceComplete = Date.now() - map.completedAt;
        if (sinceComplete > 5000 || keysRef.current.has('enter')) {
          keysRef.current.delete('enter');
          const completionGs = useGameStore.getState();

          if (map.corruptedTier > 0) {
            const prevHighest = completionGs.highestCorruptedTier;
            if (map.corruptedTier > prevHighest) {
              useGameStore.setState({ highestCorruptedTier: map.corruptedTier });
            }
            stateRef.current = null;
            setPicking(true);
            return;
          }

          // Normal map: increment maps completed for this zone in store
          const newCounts = { ...completionGs.mapCompletedCounts };
          newCounts[zoneId] = (newCounts[zoneId] ?? 0) + 1;
          useGameStore.setState({ mapCompletedCounts: newCounts });

          bossSpawnedRef.current = false;
          bossMeleeTimerRef.current = 0;

          // Every map has a boss
          stateRef.current = createMapState(canvas.width, canvas.height, zoneData.band, 1, true);
          killCountRef.current = 0;
        }
      }

      // ── Failed — wait for ENTER or 5s to return to picker ──
      if (map.phase === 'failed') {
        if (map.completedAt === 0) map.completedAt = Date.now(); // reuse field for failed timing
        const sinceFailed = Date.now() - map.completedAt;
        if (sinceFailed > 5000 || keysRef.current.has('enter')) {
          keysRef.current.delete('enter');
          stateRef.current = null;
          setPicking(true);
          return;
        }
      }

      // ── Render ──
      const renderGs = useGameStore.getState();
      let renderMaxHp = 100;
      try { renderMaxHp = resolveStats(renderGs.character).maxLife; } catch { /* */ }

      const mapHud: MapHudExtra = {
        mapFragments: renderGs.mapFragments,
        mapsCompleted: renderGs.mapCompletedCounts[zoneId] ?? 0,
        mapsBeforeBoss: MAPS_BEFORE_BOSS,
        isDownfarmed: downfarmedRef.current,
        selectedZoneName: map.corruptedTier > 0 ? `Corrupted ${zoneData.name}` : zoneData.name,
        corruptedTier: map.corruptedTier,
        modifierLabels: map.modifiers.map(m => m.label),
        timerRemaining: map.timerRemaining,
      };

      // Build skill cooldown info
      const skillCooldowns: import('../arena/arenaTypes').SkillCooldownInfo[] = [];
      if (renderGs.skillBar) {
        const now = Date.now();
        for (let i = 0; i < renderGs.skillBar.length; i++) {
          const slot = renderGs.skillBar[i];
          if (!slot) continue;
          const def = getUnifiedSkillDef(slot.skillId);
          if (!def || !('baseDamage' in def)) continue;
          const timer = renderGs.skillTimers?.[i];
          let cooldownPct = 0;
          if (timer?.cooldownUntil && timer.cooldownUntil > now && def.cooldown > 0) {
            cooldownPct = Math.min(1, (timer.cooldownUntil - now) / 1000 / def.cooldown);
          }
          skillCooldowns.push({
            skillId: slot.skillId,
            name: def.name,
            cooldownPct,
            isActive: slot.skillId === map.lastCastSkillId,
            isOnGcd: (renderGs.nextActiveSkillAt ?? 0) > now,
          });
        }
      }

      try {
        renderMap(ctx, map, renderGs.currentHp, renderMaxHp, renderGs.currentEs ?? 0, killCountRef.current, skillCooldowns, {
          zoneName: zoneData.name,
          zoneBand: zoneData.band,
          combatPhase: renderGs.combatPhase,
        }, mapHud, spritesRef.current);
      } catch (e) { console.error('[map] render error:', e); }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    // ── Input Handlers ──
    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent default for game keys (space scrolls page, arrows scroll too)
      if (['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
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

    const onMouseClick = (e: MouseEvent) => {
      if (!stateRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) + stateRef.current.camera.x;
      const worldY = (e.clientY - rect.top) + stateRef.current.camera.y;
      tryPickupMapGroundItem(stateRef.current, worldX, worldY);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onMouseClick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onMouseClick);
    };
  }, [picking]);

  // ESC key returns to zone picker from active map
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !picking) {
        stateRef.current = null;
        setPicking(true);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [picking]);

  return picking ? (
    <div className="w-full h-[calc(100vh-120px)] bg-gray-950 rounded-lg overflow-hidden relative">
      <ZonePicker onSelectZone={handleSelectZone} onSelectCorrupted={handleSelectCorrupted} />
    </div>
  ) : (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

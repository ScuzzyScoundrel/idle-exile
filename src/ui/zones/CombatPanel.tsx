import { useState, useEffect, useRef } from 'react';
import { useGameStore, useHasHydrated, calcFortifyDR, isTabHidden } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { calcXpScale } from '../../engine/zones';
import { Rarity, Gem } from '../../types';
import { calcBagCapacity } from '../../data/items';
import { getUnifiedSkillDef } from '../../data/skills';
import { BOSS_INTERVAL } from '../../data/balance';
import { getMobTypeDef } from '../../data/mobTypes';
import { resolveStats } from '../../engine/character';

import Tooltip from '../components/Tooltip';
import { PROFESSION_ICONS } from './zoneConstants';
import { emptySession, accumulateSession } from './zoneHelpers';
import type { SessionSummary } from './zoneHelpers';
import BossVictoryOverlay from './BossVictoryOverlay';
import BossDefeatOverlay from './BossDefeatOverlay';
import ZoneDefeatOverlay from './ZoneDefeatOverlay';
import SessionSummaryPanel from './SessionSummary';
import BagStatus from './BagStatus';
import PlayerHpBar from './PlayerHpBar';
import MobDisplay from './MobDisplay';
import BossFightDisplay from './BossFightDisplay';

const BUFF_DISPLAY: Record<string, { label: string; color: string; description: string }> = {
  // ── Shared / cross-skill buffs ──
  predator:           { label: 'PREDATOR',     color: 'text-yellow-300 bg-yellow-900/60', description: '+25% critical multiplier' },
  venomFrenzy:        { label: 'VENOM FRENZY', color: 'text-green-300 bg-green-900/60',   description: '+25% attack speed' },
  venomSurge:         { label: 'VENOM SURGE',  color: 'text-green-300 bg-green-900/60',   description: '+25% damage, bonus poison per hit' },

  // ── Stab ──
  honedInstincts:     { label: 'HONED',        color: 'text-yellow-300 bg-yellow-900/60', description: '+4% critical multiplier on crit' },
  st_opportunist:     { label: 'FIRST BLOOD',  color: 'text-yellow-300 bg-yellow-900/60', description: '+60% damage on kill' },
  st_deep_wounds:     { label: 'FRENZY',       color: 'text-green-300 bg-green-900/60',   description: '+30% attack speed at 8+ poison stacks' },
  st_ghost_step_form: { label: 'SHADOW',       color: 'text-violet-300 bg-violet-900/60', description: '+30% defense on dodge' },
  st_evasive_recovery:{ label: 'EVASION+',     color: 'text-teal-300 bg-teal-900/60',     description: '+10% damage on dodge' },
  st_reactive:        { label: 'REACT',        color: 'text-blue-300 bg-blue-900/60',     description: '+15% damage on dodge' },
  st_secondwind:      { label: 'SECOND WIND',  color: 'text-teal-300 bg-teal-900/60',     description: '+10% defense on dodge' },

  // ── Blade Flurry ──
  bf_flurry_of_steel: { label: 'FLURRY',       color: 'text-yellow-300 bg-yellow-900/60', description: '+8% critical multiplier per crit in cast' },
  stormState:         { label: 'STORM',        color: 'text-blue-300 bg-blue-900/60',     description: '+20% critical multiplier' },
  precisionCuts:      { label: 'PRECISION',    color: 'text-yellow-300 bg-yellow-900/60', description: '+2% critical multiplier per hit (stacking)' },
  cascadeKiller:      { label: 'CASCADE',      color: 'text-red-300 bg-red-900/60',       description: '+30% damage, +2 extra hits on kill' },
  crimsonBarrage:     { label: 'BARRAGE',      color: 'text-red-300 bg-red-900/60',       description: 'Guaranteed critical hits' },
  flickerCharge:      { label: 'FLICKER',      color: 'text-violet-300 bg-violet-900/60', description: 'Enables dodge counter-attack' },
  phantomEdge:        { label: 'PHANTOM',      color: 'text-violet-300 bg-violet-900/60', description: '+1 hit, applies Blind, +15% evasion' },
  bladeShield:        { label: 'BLADE SHLD',   color: 'text-teal-300 bg-teal-900/60',     description: '+15% damage on dodge' },
  bf_mirage_flurry:   { label: 'MIRAGE',       color: 'text-violet-300 bg-violet-900/60', description: 'Heal per recent hit, +5% evasion' },

  // ── Frost Fan ──
  glacialFocus:       { label: 'GLACIAL',      color: 'text-cyan-300 bg-cyan-900/60',     description: '+60% critical multiplier (one shot)' },
  frozenCarnage:      { label: 'FROZEN',       color: 'text-cyan-300 bg-cyan-900/60',     description: 'Double projectiles on kill' },
  miasma:             { label: 'MIASMA',       color: 'text-green-300 bg-green-900/60',   description: '+2 poison per hit, 15% tick spread' },
  mistVeil:           { label: 'MIST VEIL',    color: 'text-teal-300 bg-teal-900/60',     description: '+25% defense on dodge' },
  evasiveScatter:     { label: 'EVASIVE',      color: 'text-teal-300 bg-teal-900/60',     description: '+15% damage on dodge' },
  iceBarrier:         { label: 'ICE BARRIER',  color: 'text-cyan-300 bg-cyan-900/60',     description: '+25% damage reduction on dodge' },
  ff_aurora_shield:   { label: 'AURORA',       color: 'text-cyan-300 bg-cyan-900/60',     description: '+10% damage, heal 3%, Frost Fortify bonus' },

  // ── Viper Strike ──
  serpentClarity:     { label: 'CLARITY',      color: 'text-green-300 bg-green-900/60',   description: '+40% critical multiplier, +30% poison' },
  cobrasMomentum:     { label: 'COBRA',        color: 'text-green-300 bg-green-900/60',   description: '2x damage, guaranteed crit, 2x poison per hit' },
  serpentForm:        { label: 'SERPENT',       color: 'text-teal-300 bg-teal-900/60',     description: '+25% defense, applies Blind on hit' },
  serpentDodge:       { label: 'SERPENT DG',    color: 'text-teal-300 bg-teal-900/60',     description: '+15% damage, applies poison on dodge' },
  lethalFocus:        { label: 'LETHAL',       color: 'text-red-300 bg-red-900/60',       description: '+40% critical multiplier' },
  vs_serpent_patience_mult: { label: 'PATIENCE', color: 'text-green-300 bg-green-900/60', description: '+3% critical multiplier per stack (max 10)' },
  vs_shedding_scales: { label: 'SHEDDING',     color: 'text-teal-300 bg-teal-900/60',     description: '+10% damage, heal 2%, evasion per poison' },

  // ── Shadow Step ──
  ghostPredator:      { label: 'GHOST PRED',   color: 'text-violet-300 bg-violet-900/60', description: '+15% damage on kill' },
  phantomStealth:     { label: 'STEALTH',      color: 'text-violet-300 bg-violet-900/60', description: '+50% damage after consuming charges' },
  shadowVenomFrenzy:  { label: 'SHADOW FRNZ',  color: 'text-green-300 bg-green-900/60',   description: '+25% attack speed, +2 poison per hit' },
  umbralForm:         { label: 'UMBRAL',       color: 'text-violet-300 bg-violet-900/60', description: '+25% defense, -50% cooldown' },
  shadowCounter:      { label: 'COUNTER',      color: 'text-orange-300 bg-orange-900/60', description: '+25% damage on dodge' },
  flickeringShadow:   { label: 'FLICKER',      color: 'text-violet-300 bg-violet-900/60', description: '+15% damage on dodge' },
  vanishingAct:       { label: 'VANISH',       color: 'text-violet-300 bg-violet-900/60', description: '+20% damage reduction on dodge' },
  ss_penumbral_grace_cast: { label: 'PENUMBRAL', color: 'text-violet-300 bg-violet-900/60', description: '+10% damage, +10% evasion (stacking)' },

  // ── Assassinate ──
  executionMomentum:  { label: 'MOMENTUM',     color: 'text-red-300 bg-red-900/60',       description: '+10% critical multiplier (escalating)' },
  deathsOpportunity:  { label: 'DEATH OPP',    color: 'text-red-300 bg-red-900/60',       description: '+15% damage on kill' },
  executionChain:     { label: 'EXEC CHAIN',   color: 'text-red-300 bg-red-900/60',       description: '+40% damage per kill (chains up to 3)' },
  venomApex:          { label: 'VENOM APEX',   color: 'text-green-300 bg-green-900/60',   description: '+50% damage at 10+ poison stacks' },
  coiledPatience:     { label: 'COILED',       color: 'text-teal-300 bg-teal-900/60',     description: '+5% defense per dodge (stacking)' },
  assassinsShroud:    { label: 'SHROUD',       color: 'text-violet-300 bg-violet-900/60', description: '+25% defense on dodge' },
  patientCounter:     { label: 'PATIENT',      color: 'text-orange-300 bg-orange-900/60', description: '+10% damage on dodge' },
  shadowCharge:       { label: 'SHADOW CHG',   color: 'text-violet-300 bg-violet-900/60', description: '+12% damage per charge (max 6)' },
  as_inevitable_end:  { label: 'INEVITABLE',   color: 'text-red-300 bg-red-900/60',       description: '+30% critical multiplier, extends debuffs' },
  as_patience_shadows:{ label: 'PATIENCE',     color: 'text-violet-300 bg-violet-900/60', description: '+10% damage, heal 3%, +15% evasion' },

  // ── Lightning Lunge ──
  stormcaller:        { label: 'STORMCALL',    color: 'text-blue-300 bg-blue-900/60',     description: '+22% critical multiplier' },
  conductingCharge:   { label: 'CONDUCTING',   color: 'text-blue-300 bg-blue-900/60',     description: '+4% crit, +8% critical multiplier per chain' },
  flickeringChains:   { label: 'CHAINS',       color: 'text-blue-300 bg-blue-900/60',     description: 'Enables chain counter-attack on dodge' },
  shadowForm:         { label: 'SHADOW FM',    color: 'text-violet-300 bg-violet-900/60', description: '+25% defense on dodge' },
  evasiveLunge:       { label: 'EVASIVE LG',   color: 'text-teal-300 bg-teal-900/60',    description: '+15% damage on dodge' },
  stormTempo:         { label: 'TEMPO',        color: 'text-blue-300 bg-blue-900/60',     description: '+10% attack speed on dodge' },
  stormweaveGuard:    { label: 'STORMWEAVE',   color: 'text-blue-300 bg-blue-900/60',     description: '+3% defense per chain target (max 5)' },
  chainDamageStack:   { label: 'CHAIN DMG',    color: 'text-blue-300 bg-blue-900/60',     description: '+5% damage per hit (stacking)' },
  ll_surge_overcharge:{ label: 'SURGE',        color: 'text-blue-300 bg-blue-900/60',     description: '+60% damage for final target explosion' },
};

export default function CombatPanel() {
  const {
    character, inventory, bagSlots,
    currentZoneId, idleStartTime, idleMode,
    selectedGatheringProfession,
    stopIdleRun, processNewClears, grantIdleXp,
    currentHp, currentEs, combatPhase, bossState, zoneClearCounts,
    startBossFight, handleBossVictory, handleBossDefeat, checkRecoveryComplete,
    classResource, tickClassResource, tickAutoCast,
    clearStartedAt, currentClearTime,
    lastClearResult,
    tickCombat,
    targetedMobId, currentMobTypeId,
    activeDebuffs, fortifyStacks, fortifyExpiresAt, fortifyDRPerStack,
    tickInvasions,
    tempBuffs, rampingStacks,
    packMobs,
    hasSeenCraftingHint, dismissCraftingHint,
  } = useGameStore();

  const hydrated = useHasHydrated();
  const isRunning = idleStartTime !== null;

  // Derived
  const runningZone = currentZoneId ? ZONE_DEFS.find(z => z.id === currentZoneId) ?? null : null;
  const resolvedStats = resolveStats(character);
  const maxHp = resolvedStats.maxLife;
  const maxEs = resolvedStats.energyShield;
  const inventoryCapacity = calcBagCapacity(bagSlots);
  const displayHp = currentHp;
  const fortifyDR = calcFortifyDR(fortifyStacks, fortifyExpiresAt, fortifyDRPerStack, Date.now());

  // Local state
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState<SessionSummary>(emptySession);
  const lastClearCount = useRef(0);
  const [salvageTally, setSalvageTally] = useState({ count: 0, essence: 0 });
  const lastTickTimeRef = useRef(Date.now());
  const [bossLootItems, setBossLootItems] = useState<{ name: string; rarity: Rarity }[]>([]);
  const [bossGemDrops, setBossGemDrops] = useState<Gem[]>([]);
  const [bossPatternDrops, setBossPatternDrops] = useState<string[]>([]);
  const [bossUniquePatternDrops, setBossUniquePatternDrops] = useState<string[]>([]);
  const [bossTrophyDrops, setBossTrophyDrops] = useState<Record<string, number>>({});
  const [bossFightStats, setBossFightStats] = useState<{ duration: number; playerDps: number; bossDps: number; bossMaxHp: number } | null>(null);

  // Visual feedback state — "Last Hit" dashboard (replaces scrolling combat log)
  const [lastFiredSkillId, setLastFiredSkillId] = useState<string | null>(null);
  const lastFiredTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [lastHits, setLastHits] = useState<Record<string, {
    skillName: string;
    damage: number;
    isCrit: boolean;
    isHit: boolean;
    procDamage: number;
    isFree: boolean;
    timestamp: number;
    perHitDamages?: number[];
  }>>({});
  const [events, setEvents] = useState<Array<{
    id: number;
    type: 'shatter' | 'spread' | 'heal';
    label: string;
    damage: number;
    timestamp: number;
  }>>([]);
  const eventIdRef = useRef(0);
  const [incoming, setIncoming] = useState<Array<{
    id: number;
    damage: number;
    isDodged: boolean;
    isBlocked: boolean;
    isCrit: boolean;
    timestamp: number;
  }>>([]);
  const incomingIdRef = useRef(0);
  const nextCastIsFreeRef = useRef(false);

  // --- Main tick effect ---
  useEffect(() => {
    if (!isRunning || !idleStartTime) return;
    lastTickTimeRef.current = Date.now();
    const interval = setInterval(() => {
      // Skip ticks while tab is hidden — headless sim handles catchup on return
      if (isTabHidden()) { lastTickTimeRef.current = Date.now(); return; }
      const now = Date.now();
      const phase = useGameStore.getState().combatPhase;
      const dtSec = Math.min((now - lastTickTimeRef.current) / 1000, 2);
      tickClassResource(dtSec);
      tickAutoCast();
      tickInvasions();

      if (phase === 'clearing') {
        setElapsed((now - idleStartTime) / 1000);
        const storeState = useGameStore.getState();
        if (storeState.idleMode === 'combat') {
          const combatResult = tickCombat(dtSec);
          if (combatResult.skillFired) {
            setLastFiredSkillId(combatResult.skillId);
            clearTimeout(lastFiredTimerRef.current);
            lastFiredTimerRef.current = setTimeout(() => setLastFiredSkillId(null), 400);
            const skillId = combatResult.skillId ?? '__unknown__';
            const skillName = combatResult.skillId
              ? (getUnifiedSkillDef(combatResult.skillId)?.name ?? '???')
              : '???';
            const isFree = nextCastIsFreeRef.current;
            nextCastIsFreeRef.current = false;
            // Sum proc damage for this cast
            let procTotal = 0;
            if (combatResult.procEvents && combatResult.procEvents.length > 0) {
              for (const pe of combatResult.procEvents) {
                if (pe.type === 'damage' && pe.damage > 0) procTotal += pe.damage;
                if (pe.type === 'heal') {
                  setEvents(prev => [...prev, {
                    id: eventIdRef.current++, type: 'heal' as const,
                    label: `+${pe.label}`, damage: 0, timestamp: now,
                  }].slice(-6));
                }
              }
            } else if (combatResult.procDamage && combatResult.procDamage > 0) {
              procTotal = combatResult.procDamage;
            }
            // Update per-skill "last hit" row
            setLastHits(prev => ({...prev, [skillId]: {
              skillName,
              damage: combatResult.damageDealt,
              isCrit: combatResult.isCrit,
              isHit: combatResult.isHit,
              procDamage: procTotal,
              perHitDamages: combatResult.perHitDamages,
              isFree,
              timestamp: now,
            }}));
            // Shatter → events feed (frost overkill burst to next mob)
            if (combatResult.shatterDamage && combatResult.shatterDamage > 0) {
              setEvents(prev => [...prev, {
                id: eventIdRef.current++, type: 'shatter' as const,
                label: `Frost shatter`, damage: combatResult.shatterDamage!, timestamp: now,
              }].slice(-6));
            }
            // CD reset flash
            if (combatResult.gcdWasReset) {
              nextCastIsFreeRef.current = true;
            }
            // Spread → events feed (debuffs jumping to next mob on kill)
            if (combatResult.spreadEvents && combatResult.spreadEvents.length > 0) {
              for (const se of combatResult.spreadEvents) {
                const debuffName = se.debuffId.charAt(0).toUpperCase() + se.debuffId.slice(1);
                setEvents(prev => [...prev, {
                  id: eventIdRef.current++, type: 'spread' as const,
                  label: `${debuffName} x${se.stacks} spread`, damage: 0, timestamp: now,
                }].slice(-6));
              }
            } else if (combatResult.didSpreadDebuffs) {
              setEvents(prev => [...prev, {
                id: eventIdRef.current++, type: 'spread' as const,
                label: 'Poison spread', damage: 0, timestamp: now,
              }].slice(-6));
            }
          }
          if (combatResult.mobKills > 0) {
            const rz = ZONE_DEFS.find(z => z.id === storeState.currentZoneId);
            if (rz) {
              const runXpScale = calcXpScale(storeState.character.level, rz.iLvlMin);
              grantIdleXp(Math.round(10 * rz.band * combatResult.mobKills * runXpScale));
            }
            const clearResult = processNewClears(combatResult.mobKills, combatResult.encounterLootMult);
            if (clearResult) {
              setSession(prev => accumulateSession(prev, clearResult, combatResult.mobKills));
              if (clearResult.overflowCount > 0) {
                setSalvageTally(prev => ({
                  count: prev.count + clearResult.overflowCount,
                  essence: prev.essence + clearResult.dustGained,
                }));
              }
            }
            const afterState = useGameStore.getState();
            if (afterState.combatPhase === 'clearing' && afterState.currentZoneId) {
              const counts = afterState.zoneClearCounts;
              const zoneCount = counts[afterState.currentZoneId] || 0;
              // Use >= and floor division to catch multi-kill ticks that skip past exact modulo
              const prevCount = zoneCount - combatResult.mobKills;
              if (zoneCount >= BOSS_INTERVAL && Math.floor(zoneCount / BOSS_INTERVAL) > Math.floor(prevCount / BOSS_INTERVAL)) {
                startBossFight();
              }
            }
          }
          if (combatResult.zoneAttack) {
            const za = combatResult.zoneAttack;
            // Include ALL attacks in incoming — dodges, blocks, and hits
            setIncoming(prev => [...prev, {
              id: incomingIdRef.current++,
              damage: za.damage,
              isDodged: za.isDodged,
              isBlocked: za.isBlocked,
              isCrit: false,
              timestamp: now,
            }].slice(-3));
          }
          if (combatResult.zoneDeath) {
            // Keep lastHits across mobs so damage stays visible
            setEvents([]);
            setIncoming([]);
          }
        }
      } else if (phase === 'boss_fight') {
        const bossResult = tickCombat(dtSec);
        if (bossResult.skillFired) {
          setLastFiredSkillId(bossResult.skillId);
          clearTimeout(lastFiredTimerRef.current);
          lastFiredTimerRef.current = setTimeout(() => setLastFiredSkillId(null), 400);
          const skillId = bossResult.skillId ?? '__unknown__';
          const skillName = bossResult.skillId
            ? (getUnifiedSkillDef(bossResult.skillId)?.name ?? '???')
            : '???';
          // Sum proc damage
          let procTotal = 0;
          if (bossResult.procEvents && bossResult.procEvents.length > 0) {
            for (const pe of bossResult.procEvents) {
              if (pe.type === 'damage' && pe.damage > 0) procTotal += pe.damage;
              if (pe.type === 'heal') {
                setEvents(prev => [...prev, {
                  id: eventIdRef.current++, type: 'heal' as const,
                  label: `+${pe.label}`, damage: 0, timestamp: now,
                }].slice(-6));
              }
            }
          } else if (bossResult.procDamage && bossResult.procDamage > 0) {
            procTotal = bossResult.procDamage;
          }
          setLastHits(prev => ({...prev, [skillId]: {
            skillName,
            damage: bossResult.damageDealt,
            isCrit: bossResult.isCrit,
            isHit: bossResult.isHit,
            procDamage: procTotal,
            isFree: false,
            timestamp: now,
          }}));
        }
        if (bossResult.bossAttack) {
          const ba = bossResult.bossAttack;
          setIncoming(prev => [...prev, {
            id: incomingIdRef.current++,
            damage: ba.damage,
            isDodged: ba.isDodged,
            isBlocked: ba.isBlocked,
            isCrit: ba.isCrit,
            timestamp: now,
          }].slice(-3));
        }
        if (bossResult.bossOutcome === 'victory') {
          const bState = useGameStore.getState().bossState;
          if (bState) {
            const duration = (Date.now() - bState.startedAt) / 1000;
            setBossFightStats({
              duration,
              playerDps: duration > 0 ? bState.bossMaxHp / duration : 0,
              bossDps: bState.bossDps,
              bossMaxHp: bState.bossMaxHp,
            });
          }
          const lootResult = handleBossVictory();
          if (lootResult) {
            setBossLootItems(lootResult.items);
            setBossGemDrops(lootResult.gemDrops ?? []);
            setBossPatternDrops(lootResult.patternDrops ?? []);
            setBossUniquePatternDrops(lootResult.uniquePatternDrops ?? []);
            setBossTrophyDrops(lootResult.trophyDrops ?? {});
            setSession(prev => accumulateSession(prev, lootResult, 0));
          }
        } else if (bossResult.bossOutcome === 'defeat') {
          handleBossDefeat();
        }
      } else if (phase === 'boss_victory' || phase === 'boss_defeat' || phase === 'zone_defeat') {
        const done = checkRecoveryComplete();
        if (done) {
          const state = useGameStore.getState();
          if (state.idleStartTime) {
            setElapsed(0);
            lastClearCount.current = 0;
            setBossLootItems([]);
            setLastHits({});
            setEvents([]);
            setIncoming([]);
            useGameStore.setState({ idleStartTime: Date.now() });
          }
        }
      }
      lastTickTimeRef.current = now;
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning, idleStartTime, handleBossVictory, handleBossDefeat, checkRecoveryComplete, tickClassResource, tickAutoCast, tickInvasions, tickCombat, grantIdleXp, processNewClears, startBossFight]);

  // Auto-expire events feed entries after 5 seconds
  useEffect(() => {
    if (events.length === 0) return;
    const timer = setInterval(() => {
      const cutoff = Date.now() - 5000;
      setEvents(prev => prev.filter(e => e.timestamp > cutoff));
    }, 1000);
    return () => clearInterval(timer);
  }, [events.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gathering mode loot processing
  useEffect(() => {
    if (!isRunning || !runningZone) return;
    if (combatPhase !== 'clearing') return;
    if (idleMode !== 'gathering') return;

    const state = useGameStore.getState();
    const now = Date.now();
    const timeSinceClearStart = now - state.clearStartedAt;
    const clearDurationMs = state.currentClearTime * 1000;
    if (clearDurationMs <= 0) return;

    const completedClears = Math.floor(timeSinceClearStart / clearDurationMs);
    if (completedClears <= 0) return;

    const result = processNewClears(completedClears);
    if (result) {
      setSession(prev => accumulateSession(prev, result, completedClears));
      if (result.overflowCount > 0) {
        setSalvageTally(prev => ({
          count: prev.count + result.overflowCount,
          essence: prev.essence + result.dustGained,
        }));
      }
    }
  }, [elapsed, isRunning, runningZone, idleMode, combatPhase, processNewClears]);

  const handleStop = () => {
    stopIdleRun();
  };

  // Computed for render
  const currentClears = session.totalClears;
  const nowMs = Date.now();
  const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1000;
  const clearProgress = clearDurationMs > 0
    ? Math.min(1, Math.max(0, (nowMs - clearStartedAt) / clearDurationMs))
    : 0;

  // Read skillBar for the "last hit" dashboard
  const skillBar = useGameStore(s => s.skillBar);
  const skillTimers = useGameStore(s => s.skillTimers);

  return (
    <div className="space-y-2">
      {/* Player status: buffs + HP + ES + class resource + skills */}
      {idleMode === 'combat' && hydrated && (combatPhase === 'clearing' || combatPhase === 'boss_fight') && (
        <PlayerHpBar
          currentHp={displayHp} maxHp={maxHp}
          fortifyStacks={fortifyStacks} fortifyDR={fortifyDR}
          currentEs={currentEs} maxEs={maxEs}
          classResource={classResource} charClass={character.class}
          buffs={tempBuffs} buffDisplay={BUFF_DISPLAY} rampingStacks={rampingStacks}
          hideHpBars={combatPhase === 'boss_fight'}
          lastFiredSkillId={lastFiredSkillId}
        />
      )}

      {/* Combat Phase Display */}
      {idleMode === 'combat' && combatPhase === 'boss_fight' && bossState && (
        <BossFightDisplay
          bossName={bossState.bossName}
          bossHp={bossState.bossCurrentHp}
          bossMaxHp={bossState.bossMaxHp}
          playerHp={currentHp}
          maxHp={maxHp}
          startedAt={bossState.startedAt}
          nextBossAttackAt={bossState.bossNextAttackAt}
          bossAtkIntervalMs={bossState.bossAttackInterval * 1000}
          bossDamageElement={bossState.bossDamageElement}
          activeDebuffs={activeDebuffs}
          fortifyStacks={fortifyStacks}
          playerEs={currentEs}
          maxEs={maxEs}
          fortifyDR={fortifyDR}
        />
      )}

      {idleMode === 'combat' && combatPhase === 'boss_victory' && bossState && (
        <BossVictoryOverlay
          bossName={bossState.bossName}
          items={bossLootItems}
          gemDrops={bossGemDrops}
          patternDrops={bossPatternDrops}
          uniquePatternDrops={bossUniquePatternDrops}
          trophyDrops={bossTrophyDrops}
          fightDuration={bossFightStats?.duration ?? 0}
          playerDps={bossFightStats?.playerDps ?? 0}
          bossDps={bossFightStats?.bossDps ?? 0}
          bossMaxHp={bossFightStats?.bossMaxHp ?? 0}
        />
      )}

      {idleMode === 'combat' && combatPhase === 'boss_defeat' && bossState && (
        <BossDefeatOverlay bossName={bossState.bossName} currentHp={currentHp} maxHp={maxHp} />
      )}

      {idleMode === 'combat' && combatPhase === 'zone_defeat' && runningZone && (
        <ZoneDefeatOverlay
          mobName={targetedMobId ? (getMobTypeDef(targetedMobId)?.name ?? runningZone.mobName) : runningZone.mobName}
          zoneName={runningZone.name}
          currentHp={currentHp}
          maxHp={maxHp}
          showCraftingHint={!hasSeenCraftingHint && runningZone.band === 1}
          onDismissCraftingHint={dismissCraftingHint}
        />
      )}

      {/* Normal progress (clearing phase or gathering) */}
      {(combatPhase === 'clearing' || idleMode === 'gathering') && (
        <>
          {/* Mob display (combat) or progress bar (gathering) */}
          {idleMode === 'combat' && runningZone ? (
            <div
              className="rounded-lg overflow-hidden relative border border-gray-700/50"
              style={{ height: '15rem' }}
            >
              {/* Zone background image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(/images/zones/${runningZone.id}.webp)`,
                  opacity: 0.3,
                }}
              />
              {/* Gradient overlay: dark top for readability, image shows through bottom half */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.3) 100%)`,
                }}
              />
              {/* Accent glow */}
              <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 30px 8px rgb(var(--theme-accent) / 0.06)`,
                }}
              />
              <div className="relative z-10 p-0.5">
                <MobDisplay
                  mobName={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.name ?? runningZone.mobName) : runningZone.mobName}
                  mobs={packMobs}
                  bossIn={BOSS_INTERVAL - ((zoneClearCounts[currentZoneId!] || 0) % BOSS_INTERVAL)}
                  signatureDrop={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.drops.find(d => d.rarity === 'rare') ?? getMobTypeDef(currentMobTypeId)?.drops[0]) : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">
                  {runningZone?.name}
                  {idleMode === 'gathering' && selectedGatheringProfession && (
                    <span className="text-green-400 ml-2 text-xs">
                      {PROFESSION_ICONS[selectedGatheringProfession]} Gathering
                    </span>
                  )}
                </span>
                <span className="text-yellow-400 font-mono">{Math.floor(elapsed)}s</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-200"
                  style={{ width: `${clearProgress * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">
                Clears: <span className="text-white font-semibold">{currentClears}</span>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            Clears: <span className="text-white font-semibold">{currentClears}</span>
            <span className="mx-2">&bull;</span>
            <span className="font-mono">{Math.floor(elapsed)}s</span>
          </div>
        </>
      )}

      {/* Combat stats from last clear */}
      {idleMode === 'combat' && combatPhase === 'clearing' && lastClearResult && (
        <div className="text-xs text-gray-400 text-center space-x-3">
          <span>{lastClearResult.totalCasts} casts</span>
          <span className="text-green-400">{lastClearResult.hits} hits</span>
          <span className="text-yellow-400">{lastClearResult.crits} crits</span>
          {lastClearResult.misses > 0 && (
            <span className="text-red-400">{lastClearResult.misses} miss</span>
          )}
          <span>{lastClearResult.clearTime.toFixed(1)}s</span>
        </div>
      )}

      {/* Last Hit Dashboard — fixed-height: skills + incoming | events */}
      {idleMode === 'combat' && (combatPhase === 'clearing' || combatPhase === 'boss_fight') && (
        <div className="text-[11px] bg-gray-900/50 rounded px-2 py-1.5 font-mono min-h-[7rem]">
          <div className="grid grid-cols-[1fr_auto] gap-x-3">
            {/* Left column: skill rows */}
            <div className="space-y-0.5">
              <div className="text-gray-600 text-[10px]">Last Hits</div>
              {skillBar.map((slot) => {
                if (!slot) return null;
                const def = getUnifiedSkillDef(slot.skillId);
                if (!def) return null;
                const hit = lastHits[slot.skillId];
                const timer = skillTimers.find(t => t.skillId === slot.skillId);
                const isOnCd = timer?.cooldownUntil ? timer.cooldownUntil > Date.now() : false;
                const cdRemaining = isOnCd && timer?.cooldownUntil
                  ? Math.max(0, (timer.cooldownUntil - Date.now()) / 1000)
                  : 0;
                return (
                  <div key={slot.skillId} className="flex items-center gap-1.5">
                    <span className={`w-24 truncate ${hit?.isFree ? 'text-blue-300' : 'text-gray-400'}`}>
                      {hit?.isFree ? 'FREE ' : ''}{def.name}
                    </span>
                    {/* Always show last hit damage (persists across mobs) */}
                    {hit ? (
                      <span className="flex items-center gap-1">
                        {hit.isHit ? (
                          <>
                            <span
                              key={hit.timestamp}
                              className={`animate-pop ${hit.isCrit ? 'text-yellow-300 font-bold' : 'text-white'}`}
                            >
                              {hit.perHitDamages && hit.perHitDamages.length > 1
                                ? hit.perHitDamages.map((d, i) => (
                                    <span key={i}>{i > 0 && <span className="text-gray-500 mx-0.5">{'\u2192'}</span>}{Math.round(d)}</span>
                                  ))
                                : Math.round(hit.damage)
                              }
                            </span>
                            {hit.isCrit && <span className="text-yellow-400 text-[10px]">CRIT</span>}
                            {hit.procDamage > 0 && (
                              <span className="text-purple-400">+{Math.round(hit.procDamage)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-red-400">MISS</span>
                        )}
                        {isOnCd && <span className="text-gray-600 ml-1">cd {cdRemaining.toFixed(0)}s</span>}
                      </span>
                    ) : (
                      <span className="text-gray-700">--{isOnCd ? <span className="text-gray-600 ml-1">cd {cdRemaining.toFixed(0)}s</span> : ''}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Right column: incoming attacks */}
            <div className="space-y-0.5 border-l border-gray-700/40 pl-2 min-w-[5.5rem]">
              <div className="text-gray-600 text-[10px]">Incoming</div>
              {incoming.length > 0 ? incoming.map(entry => (
                <div key={entry.id} className={
                  entry.isDodged ? 'text-blue-400'
                  : entry.isBlocked ? 'text-orange-400'
                  : 'text-red-400'
                }>
                  {entry.isDodged ? 'Dodged!'
                    : entry.isBlocked ? `Blocked ${Math.round(entry.damage)}`
                    : `${combatPhase === 'boss_fight' ? 'Boss' : 'Mob'} ${Math.round(entry.damage)}`}
                  {entry.isCrit && !entry.isDodged && <span className="text-red-300 ml-1">!</span>}
                </div>
              )) : (
                <div className="text-gray-700">--</div>
              )}
            </div>
          </div>
          {/* Events feed (below, full width) — fixed height to prevent layout shift */}
          <div className="border-t border-gray-700/40 mt-1.5 pt-1 space-y-0.5 min-h-[3.5rem]">
            <div className="text-gray-600 text-[10px]">Events</div>
            {events.length > 0 ? events.slice(-3).map(evt => {
                const evtTooltip = evt.type === 'shatter'
                  ? 'Chill shatter: when a Chilled mob dies, a % of overkill damage carries to the next mob as cold burst damage'
                  : evt.type === 'spread'
                  ? 'Debuff spread: when a mob dies, its active debuffs (poison, bleed, etc.) jump to the next mob in the pack'
                  : evt.type === 'heal'
                  ? 'Proc heal: a skill or talent triggered a heal effect'
                  : '';
                return (
                  <Tooltip key={evt.id} content={<span className="text-[11px]">{evtTooltip}</span>}>
                    <div className={`cursor-help ${
                      evt.type === 'shatter' ? 'text-cyan-300'
                      : evt.type === 'spread' ? 'text-teal-400'
                      : 'text-green-400'
                    }`}>
                      {evt.label}{evt.damage > 0 ? ` ${Math.round(evt.damage)}` : ''}
                    </div>
                  </Tooltip>
                );
              }) : (
                <div className="text-gray-700 text-[10px]">No recent events</div>
              )}
          </div>
        </div>
      )}

      {/* Bags status + overflow warning */}
      <BagStatus inventoryCount={inventory.length} capacity={inventoryCapacity} salvageTally={salvageTally} />

      {/* Session Summary */}
      <SessionSummaryPanel session={session} />

      <button
        onClick={handleStop}
        className="w-full py-2 bg-red-800 hover:bg-red-700 text-red-200 font-semibold rounded-lg text-sm transition-all"
      >
        Stop Run
      </button>
    </div>
  );
}

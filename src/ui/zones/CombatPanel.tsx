import { useState, useEffect, useRef } from 'react';
import { useGameStore, useHasHydrated, calcFortifyDR, isTabHidden } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { calcXpScale } from '../../engine/zones';
import { Rarity } from '../../types';
import { calcBagCapacity } from '../../data/items';
import SkillBar from '../components/SkillBar';
import { DamageFloaters, FloaterEntry } from '../components/DamageFloater';
import { getUnifiedSkillDef } from '../../data/skills';
import { BOSS_INTERVAL } from '../../data/balance';
import { getMobTypeDef } from '../../data/mobTypes';
import { resolveStats } from '../../engine/character';

import Tooltip from '../components/Tooltip';
import { PROFESSION_ICONS } from './zoneConstants';
import { emptySession, accumulateSession } from './zoneHelpers';
import type { SessionSummary } from './zoneHelpers';
import ClassResourceBar from './ClassResourceBar';
import BossVictoryOverlay from './BossVictoryOverlay';
import BossDefeatOverlay from './BossDefeatOverlay';
import ZoneDefeatOverlay from './ZoneDefeatOverlay';
import SessionSummaryPanel from './SessionSummary';
import BagStatus from './BagStatus';
import PlayerHpBar from './PlayerHpBar';
import MobDisplay from './MobDisplay';
import BossFightDisplay from './BossFightDisplay';
import SkillPicker from './SkillPicker';

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
  const [bossFightStats, setBossFightStats] = useState<{ duration: number; playerDps: number; bossDps: number; bossMaxHp: number } | null>(null);

  // Visual feedback state
  const [floaters, setFloaters] = useState<FloaterEntry[]>([]);
  const [lastFiredSkillId, setLastFiredSkillId] = useState<string | null>(null);
  const floaterIdRef = useRef(0);
  const lastFiredTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [combatLog, setCombatLog] = useState<Array<{
    id: number; type: 'skill' | 'shatter' | 'enemy' | 'proc' | 'spread' | 'free' | 'heal' | 'cdReset';
    label: string; damage: number; isCrit?: boolean; isHit?: boolean;
  }>>([]);
  const logIdRef = useRef(0);
  const [cdResetSkillId, setCdResetSkillId] = useState<string | null>(null);
  const cdResetTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
            setFloaters(prev => [...prev, {
              id: floaterIdRef.current++,
              damage: combatResult.damageDealt,
              isCrit: combatResult.isCrit,
              isHit: combatResult.isHit,
            }].slice(-5));
            setLastFiredSkillId(combatResult.skillId);
            clearTimeout(lastFiredTimerRef.current);
            lastFiredTimerRef.current = setTimeout(() => setLastFiredSkillId(null), 400);
            const skillName = combatResult.skillId
              ? (getUnifiedSkillDef(combatResult.skillId)?.name ?? '???')
              : '???';
            const isFree = nextCastIsFreeRef.current;
            nextCastIsFreeRef.current = false;
            setCombatLog(prev => [...prev, {
              id: logIdRef.current++, type: isFree ? 'free' as const : 'skill' as const,
              label: isFree ? `FREE ${skillName}` : skillName,
              damage: combatResult.damageDealt,
              isCrit: combatResult.isCrit,
              isHit: combatResult.isHit,
            }].slice(-20));
            if (combatResult.shatterDamage && combatResult.shatterDamage > 0) {
              setCombatLog(prev => [...prev, {
                id: logIdRef.current++, type: 'shatter' as const,
                label: `Shatter → next`, damage: combatResult.shatterDamage!,
              }].slice(-20));
            }
            // Proc events: use structured data when available, fall back to legacy
            if (combatResult.procEvents && combatResult.procEvents.length > 0) {
              for (const pe of combatResult.procEvents) {
                const srcName = getUnifiedSkillDef(pe.sourceSkillId)?.name ?? '???';
                if (pe.type === 'damage' && pe.damage > 0) {
                  setCombatLog(prev => [...prev, {
                    id: logIdRef.current++, type: 'proc' as const,
                    label: `${srcName} → ${pe.label}`,
                    damage: pe.damage,
                  }].slice(-20));
                } else if (pe.type === 'heal') {
                  setCombatLog(prev => [...prev, {
                    id: logIdRef.current++, type: 'heal' as const,
                    label: `+${pe.label}`,
                    damage: 0,
                  }].slice(-20));
                }
                // buff/debuff/cdReset/cast procs → icon feedback only (no log line)
              }
              // Floater for total proc damage
              if (combatResult.procDamage && combatResult.procDamage > 0) {
                setFloaters(prev => [...prev, {
                  id: floaterIdRef.current++,
                  damage: combatResult.procDamage!,
                  isCrit: false, isHit: true, isProc: true,
                }].slice(-8));
              }
            } else if (combatResult.procDamage && combatResult.procDamage > 0) {
              // Legacy fallback
              setCombatLog(prev => [...prev, {
                id: logIdRef.current++, type: 'proc' as const,
                label: combatResult.procLabel ?? 'Proc',
                damage: combatResult.procDamage!,
              }].slice(-20));
              setFloaters(prev => [...prev, {
                id: floaterIdRef.current++,
                damage: combatResult.procDamage!,
                isCrit: false, isHit: true, isProc: true,
              }].slice(-8));
            }
            // CD reset flash — use specific skill ID when available
            if (combatResult.cooldownResets && combatResult.cooldownResets.length > 0) {
              setCdResetSkillId(combatResult.cooldownResets[0]);
              clearTimeout(cdResetTimerRef.current);
              cdResetTimerRef.current = setTimeout(() => setCdResetSkillId(null), 500);
            } else if (combatResult.cooldownWasReset) {
              setCdResetSkillId('__all__');
              clearTimeout(cdResetTimerRef.current);
              cdResetTimerRef.current = setTimeout(() => setCdResetSkillId(null), 500);
            }
            if (combatResult.gcdWasReset) {
              nextCastIsFreeRef.current = true;
            }
            // Spread events: use structured data when available
            if (combatResult.spreadEvents && combatResult.spreadEvents.length > 0) {
              for (const se of combatResult.spreadEvents) {
                const debuffName = se.debuffId.charAt(0).toUpperCase() + se.debuffId.slice(1);
                setCombatLog(prev => [...prev, {
                  id: logIdRef.current++, type: 'spread' as const,
                  label: `${debuffName} (x${se.stacks}) → next`,
                  damage: 0,
                }].slice(-20));
              }
            } else if (combatResult.didSpreadDebuffs) {
              setCombatLog(prev => [...prev, {
                id: logIdRef.current++, type: 'spread' as const,
                label: 'Poison spread', damage: 0,
              }].slice(-20));
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
            setFloaters(prev => [...prev, {
              id: floaterIdRef.current++,
              damage: za.damage,
              isCrit: false,
              isHit: !za.isDodged,
              isEnemyAttack: true,
              isDodged: za.isDodged,
              isBlocked: za.isBlocked,
            }].slice(-8));
            if (!za.isDodged) {
              setCombatLog(prev => [...prev, {
                id: logIdRef.current++, type: 'enemy' as const,
                label: 'Mob swing', damage: za.damage,
              }].slice(-20));
            }
          }
          if (combatResult.zoneDeath) {
            setFloaters([]);
            setCombatLog([]);
          }
        }
      } else if (phase === 'boss_fight') {
        const bossResult = tickCombat(dtSec);
        if (bossResult.skillFired) {
          setFloaters(prev => [...prev, {
            id: floaterIdRef.current++,
            damage: bossResult.damageDealt,
            isCrit: bossResult.isCrit,
            isHit: bossResult.isHit,
          }].slice(-5));
          setLastFiredSkillId(bossResult.skillId);
          clearTimeout(lastFiredTimerRef.current);
          lastFiredTimerRef.current = setTimeout(() => setLastFiredSkillId(null), 400);
          const skillName = bossResult.skillId
            ? (getUnifiedSkillDef(bossResult.skillId)?.name ?? '???')
            : '???';
          setCombatLog(prev => [...prev, {
            id: logIdRef.current++, type: 'skill' as const,
            label: skillName,
            damage: bossResult.damageDealt,
            isCrit: bossResult.isCrit,
            isHit: bossResult.isHit,
          }].slice(-20));
          // Proc events: use structured data when available
          if (bossResult.procEvents && bossResult.procEvents.length > 0) {
            for (const pe of bossResult.procEvents) {
              const srcName = getUnifiedSkillDef(pe.sourceSkillId)?.name ?? '???';
              if (pe.type === 'damage' && pe.damage > 0) {
                setCombatLog(prev => [...prev, {
                  id: logIdRef.current++, type: 'proc' as const,
                  label: `${srcName} → ${pe.label}`,
                  damage: pe.damage,
                }].slice(-20));
              }
            }
            if (bossResult.procDamage && bossResult.procDamage > 0) {
              setFloaters(prev => [...prev, {
                id: floaterIdRef.current++,
                damage: bossResult.procDamage!,
                isCrit: false, isHit: true, isProc: true,
              }].slice(-8));
            }
          } else if (bossResult.procDamage && bossResult.procDamage > 0) {
            setCombatLog(prev => [...prev, {
              id: logIdRef.current++, type: 'proc' as const,
              label: bossResult.procLabel ?? 'Proc',
              damage: bossResult.procDamage!,
            }].slice(-20));
            setFloaters(prev => [...prev, {
              id: floaterIdRef.current++,
              damage: bossResult.procDamage!,
              isCrit: false, isHit: true, isProc: true,
            }].slice(-8));
          }
          if (bossResult.cooldownResets && bossResult.cooldownResets.length > 0) {
            setCdResetSkillId(bossResult.cooldownResets[0]);
            clearTimeout(cdResetTimerRef.current);
            cdResetTimerRef.current = setTimeout(() => setCdResetSkillId(null), 500);
          } else if (bossResult.cooldownWasReset) {
            setCdResetSkillId('__all__');
            clearTimeout(cdResetTimerRef.current);
            cdResetTimerRef.current = setTimeout(() => setCdResetSkillId(null), 500);
          }
        }
        if (bossResult.bossAttack) {
          const ba = bossResult.bossAttack;
          setFloaters(prev => [...prev, {
            id: floaterIdRef.current++,
            damage: ba.damage,
            isCrit: false,
            isHit: !ba.isDodged,
            isEnemyAttack: true,
            isDodged: ba.isDodged,
            isBlocked: ba.isBlocked,
            isBossCrit: ba.isCrit,
          }].slice(-8));
          if (!ba.isDodged) {
            setCombatLog(prev => [...prev, {
              id: logIdRef.current++, type: 'enemy' as const,
              label: 'Boss swing', damage: ba.damage,
            }].slice(-20));
          }
        }
        if (bossResult.bossOutcome === 'victory') {
          const bState = useGameStore.getState().bossState;
          if (bState) {
            const duration = (Date.now() - bState.startedAt) / 1000;
            setBossFightStats({
              duration,
              playerDps: bState.playerDps,
              bossDps: bState.bossDps,
              bossMaxHp: bState.bossMaxHp,
            });
          }
          const lootResult = handleBossVictory();
          if (lootResult) {
            setBossLootItems(lootResult.items);
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
            setFloaters([]);
            setCombatLog([]);
            useGameStore.setState({ idleStartTime: Date.now() });
          }
        }
      }
      lastTickTimeRef.current = now;
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning, idleStartTime, handleBossVictory, handleBossDefeat, checkRecoveryComplete, tickClassResource, tickAutoCast, tickInvasions, tickCombat, grantIdleXp, processNewClears, startBossFight]);

  // Auto-remove floaters
  useEffect(() => {
    if (floaters.length === 0) return;
    const timer = setTimeout(() => {
      setFloaters(prev => prev.slice(1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [floaters]);

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

  const bossSwingProgress = bossState?.bossNextAttackAt
    ? 1 - Math.max(0, Math.min(1, (bossState.bossNextAttackAt - nowMs) / (bossState.bossAttackInterval * 1000)))
    : 0;

  return (
    <div className="space-y-2">
      {/* Combat Phase Display */}
      {idleMode === 'combat' && combatPhase === 'boss_fight' && bossState && (
        <div className="relative">
          <BossFightDisplay
            bossName={bossState.bossName}
            bossHp={bossState.bossCurrentHp}
            bossMaxHp={bossState.bossMaxHp}
            playerHp={currentHp}
            maxHp={maxHp}
            bossDps={bossState.bossDps}
            swingProgress={bossSwingProgress}
            activeDebuffs={activeDebuffs}
            fortifyStacks={fortifyStacks}
            playerEs={currentEs}
            maxEs={maxEs}
            fortifyDR={fortifyDR}
          />
          <DamageFloaters floaters={floaters} />
        </div>
      )}

      {idleMode === 'combat' && combatPhase === 'boss_victory' && bossState && (
        <BossVictoryOverlay
          bossName={bossState.bossName}
          items={bossLootItems}
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
          {/* Player HP Bar (combat only, clearing) */}
          {idleMode === 'combat' && hydrated && (
            <PlayerHpBar currentHp={displayHp} maxHp={maxHp} fortifyStacks={fortifyStacks} fortifyDR={fortifyDR} currentEs={currentEs} maxEs={maxEs} />
          )}

          {/* Class Resource Bar (combat only) */}
          {idleMode === 'combat' && (
            <ClassResourceBar resource={classResource} charClass={character.class} />
          )}

          {/* Buff / ramping indicator strip */}
          {idleMode === 'combat' && (tempBuffs.length > 0 || rampingStacks > 0) && (
            <div className="flex flex-wrap gap-1 justify-center">
              {tempBuffs.filter(b => b.expiresAt > Date.now()).map(buff => {
                const remaining = Math.max(0, (buff.expiresAt - Date.now()) / 1000);
                const meta = BUFF_DISPLAY[buff.id] ?? {
                  label: buff.id.replace(/^[a-z]+_/, '').replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase()).slice(0, 12),
                  color: 'text-gray-300 bg-gray-700/60',
                  description: '',
                };
                const tooltipContent = (
                  <div className="space-y-0.5">
                    <div className="font-bold">{meta.label}</div>
                    {meta.description && <div className="text-gray-400">{meta.description}</div>}
                    <div>Remaining: {remaining.toFixed(1)}s</div>
                  </div>
                );
                return (
                  <Tooltip key={buff.id} content={tooltipContent}>
                    <span className={`rounded-full px-1.5 text-[10px] font-mono font-semibold ${meta.color}`}>
                      {meta.label} {remaining.toFixed(0)}s
                    </span>
                  </Tooltip>
                );
              })}
              {rampingStacks > 0 && (
                <span className="rounded-full px-1.5 text-[10px] font-mono font-semibold bg-amber-900/60 text-amber-300"
                      title={`Ramping damage: ${rampingStacks} stacks`}>
                  RHYTHM x{rampingStacks}
                </span>
              )}
            </div>
          )}

          {/* Mob display (combat) or progress bar (gathering) */}
          {idleMode === 'combat' && runningZone ? (
            <div className="relative">
              <MobDisplay
                mobName={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.name ?? runningZone.mobName) : runningZone.mobName}
                mobs={packMobs}
                bossIn={BOSS_INTERVAL - ((zoneClearCounts[currentZoneId!] || 0) % BOSS_INTERVAL)}
                signatureDrop={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.drops.find(d => d.rarity === 'rare') ?? getMobTypeDef(currentMobTypeId)?.drops[0]) : undefined}
              />
              <DamageFloaters floaters={floaters} />
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

      {/* Combat log — two columns: outgoing | incoming */}
      {idleMode === 'combat' && combatLog.length > 0 && (() => {
        const outgoing = combatLog.filter(e => e.type !== 'enemy').slice(-8).reverse();
        const incoming = combatLog.filter(e => e.type === 'enemy').slice(-8).reverse();
        return (
          <div className="grid grid-cols-2 gap-1 text-[11px] bg-gray-900/50 rounded px-2 py-1 font-mono max-h-40 overflow-y-auto">
            {/* Left: your damage */}
            <div className="space-y-0.5 border-r border-gray-700/50 pr-1">
              <div className="text-gray-600 text-[10px]">Your damage</div>
              {outgoing.map(entry => (
                <div key={entry.id} className="text-gray-400">
                  {entry.type === 'skill' || entry.type === 'free' ? (
                    <>
                      <span className={entry.type === 'free' ? 'text-blue-300' : 'text-gray-500'}>{entry.label}</span>
                      {entry.isHit
                        ? <> <span className={entry.isCrit ? 'text-yellow-300 font-bold' : 'text-white'}>{Math.round(entry.damage)}</span>
                            {entry.isCrit && <span className="text-yellow-400 ml-1">CRIT</span>}</>
                        : <span className="text-red-400 ml-1">MISS</span>
                      }
                    </>
                  ) : entry.type === 'spread' ? (
                    <span className="text-teal-400">{entry.label}</span>
                  ) : entry.type === 'heal' ? (
                    <span className="text-green-400">{entry.label}</span>
                  ) : (
                    <>
                      <span className={
                        entry.type === 'proc' ? 'text-purple-400' : 'text-cyan-300'
                      }>{entry.label}</span>
                      {' '}<span className="text-gray-300">{Math.round(entry.damage)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            {/* Right: incoming */}
            <div className="space-y-0.5 pl-1">
              <div className="text-gray-600 text-[10px]">Incoming</div>
              {incoming.map(entry => (
                <div key={entry.id} className="text-orange-400">
                  {entry.label} <span className="text-gray-300">{Math.round(entry.damage)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Skill Bar + Picker (combat mode only) */}
      {idleMode === 'combat' && (combatPhase === 'clearing' || combatPhase === 'boss_fight') && (
        <>
          <SkillBar lastFiredSkillId={lastFiredSkillId} cdResetSkillId={cdResetSkillId} />
          <SkillPicker />
        </>
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

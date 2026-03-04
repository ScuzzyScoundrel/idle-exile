import { useState, useEffect, useRef } from 'react';
import { useGameStore, useHasHydrated, calcFortifyDR } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { calcXpScale } from '../../engine/zones';
import { canGatherInZone, getGatheringSkillRequirement } from '../../engine/gathering';
import { Rarity } from '../../types';
import { calcBagCapacity } from '../../data/items';
import SkillBar from '../components/SkillBar';
import { DamageFloaters, FloaterEntry } from '../components/DamageFloater';
import { getUnifiedSkillDef } from '../../data/unifiedSkills';
import { BOSS_INTERVAL, ZONE_ATTACK_INTERVAL } from '../../data/balance';
import { getMobTypeDef } from '../../data/mobTypes';
import { resolveStats } from '../../engine/character';

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

interface CombatPanelProps {
  selectedZone: string;
  onSwitchZone: () => void;
}

export default function CombatPanel({ selectedZone, onSwitchZone }: CombatPanelProps) {
  const {
    character, inventory, bagSlots,
    currentZoneId, idleStartTime, idleMode,
    selectedGatheringProfession, gatheringSkills,
    stopIdleRun, processNewClears, grantIdleXp,
    currentHp, currentEs, combatPhase, bossState, zoneClearCounts,
    startBossFight, handleBossVictory, handleBossDefeat, checkRecoveryComplete,
    classResource, tickClassResource, tickAutoCast,
    clearStartedAt, currentClearTime,
    lastClearResult,
    tickCombat, currentMobHp, maxMobHp, zoneNextAttackAt,
    targetedMobId, currentMobTypeId,
    activeDebuffs, fortifyStacks, fortifyExpiresAt, fortifyDRPerStack,
    tickInvasions,
  } = useGameStore();

  const hydrated = useHasHydrated();
  const isRunning = idleStartTime !== null;

  // Derived
  const runningZone = currentZoneId ? ZONE_DEFS.find(z => z.id === currentZoneId) ?? null : null;
  const selectedZoneDef = ZONE_DEFS.find(z => z.id === selectedZone);
  const resolvedStats = resolveStats(character);
  const maxHp = resolvedStats.maxLife;
  const maxEs = resolvedStats.energyShield;
  const inventoryCapacity = calcBagCapacity(bagSlots);
  const displayHp = currentHp;
  const fortifyDR = calcFortifyDR(fortifyStacks, fortifyExpiresAt, fortifyDRPerStack, Date.now());
  const currentGatheringLevel = selectedGatheringProfession
    ? gatheringSkills[selectedGatheringProfession].level
    : 0;

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
    id: number; skill: string; damage: number; isCrit: boolean; isHit: boolean;
  }>>([]);
  const logIdRef = useRef(0);

  // --- Main tick effect ---
  useEffect(() => {
    if (!isRunning || !idleStartTime) return;
    lastTickTimeRef.current = Date.now();
    const interval = setInterval(() => {
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
            setCombatLog(prev => [...prev, {
              id: logIdRef.current++,
              skill: skillName,
              damage: combatResult.damageDealt,
              isCrit: combatResult.isCrit,
              isHit: combatResult.isHit,
            }].slice(-20));
          }
          if (combatResult.mobKills > 0) {
            const rz = ZONE_DEFS.find(z => z.id === storeState.currentZoneId);
            if (rz) {
              const runXpScale = calcXpScale(storeState.character.level, rz.iLvlMin);
              grantIdleXp(Math.round(10 * rz.band * combatResult.mobKills * runXpScale));
            }
            const clearResult = processNewClears(combatResult.mobKills);
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
              if (zoneCount > 0 && zoneCount % BOSS_INTERVAL === 0) {
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
            id: logIdRef.current++,
            skill: skillName,
            damage: bossResult.damageDealt,
            isCrit: bossResult.isCrit,
            isHit: bossResult.isHit,
          }].slice(-20));
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

  const zoneSwingProgress = zoneNextAttackAt > 0
    ? 1 - Math.max(0, Math.min(1, (zoneNextAttackAt - nowMs) / (ZONE_ATTACK_INTERVAL * 1000)))
    : 0;
  const bossSwingProgress = bossState?.bossNextAttackAt
    ? 1 - Math.max(0, Math.min(1, (bossState.bossNextAttackAt - nowMs) / (bossState.bossAttackInterval * 1000)))
    : 0;

  return (
    <div className="space-y-2">
      {/* Switch zone button */}
      {selectedZone !== currentZoneId && selectedZoneDef && (() => {
        const canSwitch = !(idleMode === 'gathering' && selectedGatheringProfession && !canGatherInZone(currentGatheringLevel, selectedZoneDef));
        return (
          <button
            onClick={onSwitchZone}
            disabled={!canSwitch}
            className={`w-full py-2 font-bold rounded-lg text-sm transition-all ${
              canSwitch ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canSwitch
              ? `Switch to ${selectedZoneDef.name}`
              : `Requires ${selectedGatheringProfession!.charAt(0).toUpperCase() + selectedGatheringProfession!.slice(1)} Lv.${getGatheringSkillRequirement(selectedZoneDef.band)}`}
          </button>
        );
      })()}

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
        <ZoneDefeatOverlay mobName={targetedMobId ? (getMobTypeDef(targetedMobId)?.name ?? runningZone.mobName) : runningZone.mobName} zoneName={runningZone.name} currentHp={currentHp} maxHp={maxHp} />
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

          {/* Mob display (combat) or progress bar (gathering) */}
          {idleMode === 'combat' && runningZone ? (
            <div className="relative">
              <MobDisplay
                mobName={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.name ?? runningZone.mobName) : runningZone.mobName}
                mobCurrentHp={currentMobHp}
                mobMaxHp={maxMobHp}
                bossIn={BOSS_INTERVAL - ((zoneClearCounts[currentZoneId!] || 0) % BOSS_INTERVAL)}
                swingProgress={zoneSwingProgress}
                signatureDrop={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.drops.find(d => d.rarity === 'rare') ?? getMobTypeDef(currentMobTypeId)?.drops[0]) : undefined}
                activeDebuffs={activeDebuffs}
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

      {/* Combat log */}
      {idleMode === 'combat' && combatLog.length > 0 && (
        <div className="max-h-16 overflow-y-auto text-xs space-y-0.5 bg-gray-900/50 rounded px-2 py-1 font-mono">
          {combatLog.slice(-5).map(entry => (
            <div key={entry.id} className="text-gray-400">
              <span className="text-gray-500">{entry.skill}</span>
              {entry.isHit
                ? <> <span className={entry.isCrit ? 'text-yellow-300 font-bold' : 'text-white'}>{Math.round(entry.damage)}</span>
                    {entry.isCrit && <span className="text-yellow-400 ml-1">CRIT</span>}</>
                : <span className="text-red-400 ml-1">MISS</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Skill Bar + Picker (combat mode only) */}
      {idleMode === 'combat' && (combatPhase === 'clearing' || combatPhase === 'boss_fight') && (
        <>
          <SkillBar lastFiredSkillId={lastFiredSkillId} />
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

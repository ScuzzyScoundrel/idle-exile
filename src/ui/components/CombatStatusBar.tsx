import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { BOSS_INTERVAL } from '../../data/balance';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { calcGatheringXpRequired } from '../../engine/gathering';
import { resolveStats } from '../../engine/character';

export default function CombatStatusBar() {
  const idleStartTime = useGameStore(s => s.idleStartTime);
  const currentZoneId = useGameStore(s => s.currentZoneId);
  const currentHp = useGameStore(s => s.currentHp);
  const combatPhase = useGameStore(s => s.combatPhase);
  const bossState = useGameStore(s => s.bossState);
  const clearStartedAt = useGameStore(s => s.clearStartedAt);
  const currentClearTime = useGameStore(s => s.currentClearTime);
  const zoneClearCounts = useGameStore(s => s.zoneClearCounts);
  const idleMode = useGameStore(s => s.idleMode);
  const selectedGatheringProfession = useGameStore(s => s.selectedGatheringProfession);
  const character = useGameStore(s => s.character);
  const gatheringSkills = useGameStore(s => s.gatheringSkills);

  // Tick for smooth progress bar animation
  const [, setTick] = useState(0);
  useEffect(() => {
    if (idleStartTime === null) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [idleStartTime]);

  // Don't render when no run is active
  if (idleStartTime === null || !currentZoneId) return null;

  const zone = ZONE_DEFS.find(z => z.id === currentZoneId);
  if (!zone) return null;

  const maxHp = resolveStats(character).maxLife;

  // --- Gathering mode ---
  if (idleMode === 'gathering' && selectedGatheringProfession) {
    const profDef = GATHERING_PROFESSION_DEFS.find(p => p.id === selectedGatheringProfession);
    const skill = gatheringSkills[selectedGatheringProfession];
    const xpNeeded = calcGatheringXpRequired(skill.level);
    const xpPct = xpNeeded > 0 ? Math.min(100, (skill.xp / xpNeeded) * 100) : 0;

    // Gathering clear progress
    const nowMs = Date.now();
    const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1;
    const gatherProgress = clearDurationMs > 0
      ? Math.min(100, Math.max(0, ((nowMs - clearStartedAt) / clearDurationMs) * 100))
      : 0;

    return (
      <div className="fixed top-[41px] left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 px-3 py-1.5">
        <div className="flex items-center gap-3 max-w-4xl xl:max-w-7xl mx-auto text-xs">
          {/* Zone */}
          <span className="text-gray-300 font-semibold truncate shrink-0">{zone.name}</span>

          {/* Profession + Level */}
          <span className="text-emerald-400 shrink-0">
            {profDef?.icon} {profDef?.name} Lv.{skill.level}
          </span>

          {/* XP bar */}
          <div className="flex-1 min-w-0">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                   style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          {/* Gather progress */}
          <div className="w-16 shrink-0">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full"
                   style={{ width: `${gatherProgress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Combat mode ---
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const hpColor = hpPct > 60 ? 'bg-green-500' : hpPct > 30 ? 'bg-yellow-500' : 'bg-red-500';

  // Clear progress (mob HP)
  const nowMs = Date.now();
  const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1;
  const clearProgress = combatPhase === 'clearing' && clearDurationMs > 0
    ? Math.min(100, Math.max(0, ((nowMs - clearStartedAt) / clearDurationMs) * 100))
    : 0;

  // Boss countdown
  const zoneClears = zoneClearCounts[currentZoneId] || 0;
  const bossIn = BOSS_INTERVAL - (zoneClears % BOSS_INTERVAL);

  // Phase badge
  const phaseBadge = (() => {
    switch (combatPhase) {
      case 'boss_fight': return { text: 'BOSS', color: 'bg-red-600 text-white' };
      case 'boss_victory': return { text: 'VICTORY', color: 'bg-yellow-600 text-white' };
      case 'boss_defeat': return { text: 'DEFEAT', color: 'bg-red-800 text-red-200' };
      case 'zone_defeat': return { text: 'DEAD', color: 'bg-red-900 text-red-300' };
      default: return null;
    }
  })();

  // Boss HP bar (during boss_fight)
  const bossHpPct = bossState && bossState.bossMaxHp > 0
    ? Math.max(0, Math.min(100, (bossState.bossCurrentHp / bossState.bossMaxHp) * 100))
    : 0;

  return (
    <div className="fixed top-[41px] left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 px-3 py-1.5">
      <div className="flex items-center gap-3 max-w-4xl xl:max-w-7xl mx-auto text-xs">
        {/* Zone name */}
        <span className="text-gray-300 font-semibold truncate shrink-0">{zone.name}</span>

        {/* Player HP bar */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-gray-400 shrink-0">HP</span>
          <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${hpColor} rounded-full transition-all duration-150`}
                 style={{ width: `${hpPct}%` }} />
          </div>
          <span className="text-gray-400 font-mono shrink-0">{Math.ceil(currentHp)}/{maxHp}</span>
        </div>

        {/* Mob progress OR Boss HP */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {combatPhase === 'boss_fight' && bossState ? (
            <>
              <span className="text-red-400 shrink-0 truncate">{bossState.bossName}</span>
              <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-150"
                     style={{ width: `${bossHpPct}%` }} />
              </div>
            </>
          ) : combatPhase === 'clearing' ? (
            <>
              <span className="text-gray-400 shrink-0">Mob</span>
              <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full"
                     style={{ width: `${100 - clearProgress}%` }} />
              </div>
            </>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Boss countdown or phase badge */}
        {phaseBadge ? (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${phaseBadge.color} shrink-0`}>
            {phaseBadge.text}
          </span>
        ) : (
          <span className="text-gray-500 shrink-0">Boss in {bossIn}</span>
        )}
      </div>
    </div>
  );
}

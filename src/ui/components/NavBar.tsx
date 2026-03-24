import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CharacterClass } from '../../types';
import { ZONE_DEFS } from '../../data/zones';
import { BOSS_INTERVAL } from '../../data/balance';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { calcGatheringXpRequired } from '../../engine/gathering';
import { resolveStats } from '../../engine/character';

interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tutorialStep?: number;
}

const CLASS_HERO_ICONS: Record<CharacterClass, string> = {
  warrior: '\u2694\uFE0F',
  mage: '\u2728',
  ranger: '\uD83C\uDFF9',
  rogue: '\uD83D\uDDE1\uFE0F',
};

const TABS = [
  { id: 'world', label: 'World', icon: '\uD83E\uDDED' },
  { id: 'map', label: 'Map', icon: '\uD83D\uDDFA\uFE0F' },
  { id: 'arena', label: 'Arena', icon: '\uD83C\uDFAE' },
  { id: 'hero', label: 'Hero', icon: null as string | null },
  { id: 'crafting', label: 'Forge', icon: '\uD83D\uDD28' },
];

const PULSE_MAP: Record<number, string> = {
  1: 'hero',
  2: 'world',
  5: 'crafting',
};

function CombatStrip() {
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
  const currentEs = useGameStore(s => s.currentEs);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (idleStartTime === null) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [idleStartTime]);

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
    const nowMs = Date.now();
    const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1;
    const gatherProgress = clearDurationMs > 0
      ? Math.min(100, Math.max(0, ((nowMs - clearStartedAt) / clearDurationMs) * 100))
      : 0;

    return (
      <div className="flex items-center gap-2 px-4 py-2 text-[11px] border-b border-white/5">
        <span className="text-gray-400 truncate shrink-0">{zone.name}</span>
        <span className="text-emerald-400 shrink-0">
          {profDef?.icon} Lv.{skill.level}
        </span>
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-150"
               style={{ width: `${xpPct}%` }} />
        </div>
        <div className="w-12 h-2 bg-gray-800 rounded-full overflow-hidden shrink-0">
          <div className="h-full bg-cyan-500 rounded-full"
               style={{ width: `${gatherProgress}%` }} />
        </div>
      </div>
    );
  }

  // --- Combat mode ---
  const maxEs = resolveStats(character).energyShield;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const hpColor = hpPct > 60 ? 'bg-green-500' : hpPct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const esPct = maxEs > 0 ? Math.max(0, Math.min(100, (currentEs / maxEs) * 100)) : 0;

  const nowMs = Date.now();
  const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1;
  const clearProgress = combatPhase === 'clearing' && clearDurationMs > 0
    ? Math.min(100, Math.max(0, ((nowMs - clearStartedAt) / clearDurationMs) * 100))
    : 0;

  const zoneClears = zoneClearCounts[currentZoneId] || 0;
  const bossIn = BOSS_INTERVAL - (zoneClears % BOSS_INTERVAL);

  const phaseBadge = (() => {
    switch (combatPhase) {
      case 'boss_fight': return { text: 'BOSS', color: 'bg-red-600 text-white' };
      case 'boss_victory': return { text: 'WIN', color: 'bg-yellow-600 text-white' };
      case 'boss_defeat': return { text: 'DEFEAT', color: 'bg-red-800 text-red-200' };
      case 'zone_defeat': return { text: 'DEAD', color: 'bg-red-900 text-red-300' };
      default: return null;
    }
  })();

  const bossHpPct = bossState && bossState.bossMaxHp > 0
    ? Math.max(0, Math.min(100, (bossState.bossCurrentHp / bossState.bossMaxHp) * 100))
    : 0;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-[11px] border-b border-white/5">
      <span className="text-gray-400 truncate shrink-0">{zone.name}</span>

      {/* HP */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${hpColor} rounded-full transition-all duration-150`}
                 style={{ width: `${hpPct}%` }} />
          </div>
          {maxEs > 0 && (
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-150"
                   style={{ width: `${esPct}%` }} />
            </div>
          )}
        </div>
        <span className="text-gray-500 font-mono shrink-0">
          {Math.ceil(currentHp)}/{maxHp}
        </span>
      </div>

      {/* Mob / Boss */}
      {combatPhase === 'boss_fight' && bossState ? (
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-red-400 shrink-0 truncate">{bossState.bossName}</span>
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all duration-150"
                 style={{ width: `${bossHpPct}%` }} />
          </div>
        </div>
      ) : combatPhase === 'clearing' ? (
        <div className="flex items-center gap-1 min-w-0 flex-[0.6]">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full"
                 style={{ width: `${100 - clearProgress}%` }} />
          </div>
        </div>
      ) : null}

      {/* Badge / countdown */}
      {phaseBadge ? (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${phaseBadge.color} shrink-0`}>
          {phaseBadge.text}
        </span>
      ) : (
        <span className="text-gray-600 shrink-0">{bossIn}</span>
      )}
    </div>
  );
}

export default function NavBar({ activeTab, onTabChange, tutorialStep = 0 }: NavBarProps) {
  const characterClass = useGameStore(s => s.character.class);
  const pulseTabId = PULSE_MAP[tutorialStep];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50
      bg-gray-950/90 backdrop-blur-md border-t border-white/10">
      <CombatStrip />
      <div className="flex max-w-4xl xl:max-w-7xl mx-auto">
        {TABS.map((tab) => {
          const shouldPulse = tab.id === pulseTabId && activeTab !== tab.id;
          const isActive = activeTab === tab.id;
          const icon = tab.id === 'hero' ? (CLASS_HERO_ICONS[characterClass] ?? '\u2694\uFE0F') : tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center py-2 text-xs transition-all
                ${isActive
                  ? 'text-theme-text-accent border-t-2 border-theme-accent'
                  : 'text-gray-400 hover:text-gray-200 border-t-2 border-transparent'}
                ${shouldPulse ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
              `}
            >
              <span className="text-lg mb-0.5">{icon}</span>
              <span className="font-semibold tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

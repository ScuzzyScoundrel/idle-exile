import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { canGatherInZone, getGatheringSkillRequirement, calcGatheringXpRequired } from '../../engine/gathering';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { IdleMode } from '../../types';
import DailyQuestPanel from '../components/DailyQuestPanel';
import WorldMap from '../zones/WorldMap';
import InvasionTracker from '../zones/InvasionTracker';
import SkillPicker from '../zones/SkillPicker';
import CombatPanel from '../zones/CombatPanel';
import StatsTicker from '../zones/StatsTicker';
import { PROFESSION_ICONS } from '../zones/zoneConstants';

export default function WorldScreen() {
  const {
    currentZoneId, idleStartTime, idleMode,
    gatheringSkills, selectedGatheringProfession,
    startIdleRun, stopIdleRun,
    setIdleMode, setGatheringProfession,
    tutorialStep,
    targetedMobId, setTargetedMob, mobKillCounts,
    totalZoneClears, zoneMasteryClaimed, invasionState,
  } = useGameStore();

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [selectedBand, setSelectedBand] = useState<number>(() => {
    if (currentZoneId) {
      const z = ZONE_DEFS.find(z => z.id === currentZoneId);
      return z?.band ?? 1;
    }
    return 1;
  });
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const isRunning = idleStartTime !== null;
  const zone = ZONE_DEFS.find((z) => z.id === selectedZone)!;

  const handleStart = () => { startIdleRun(selectedZone); };

  const handleModeSwitch = (mode: IdleMode) => {
    if (mode === idleMode) return;
    stopIdleRun();
    setIdleMode(mode);
  };

  const handleTravel = (zoneId: string) => {
    setSelectedZone(zoneId);
    setExpandedZone(null);
    if (isRunning) startIdleRun(zoneId);
  };

  // Gathering state
  const currentGatheringLevel = selectedGatheringProfession ? gatheringSkills[selectedGatheringProfession].level : 0;
  const currentGatheringXp = selectedGatheringProfession ? gatheringSkills[selectedGatheringProfession].xp : 0;
  const gatheringXpToNext = selectedGatheringProfession ? calcGatheringXpRequired(gatheringSkills[selectedGatheringProfession].level) : 100;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="xl:grid xl:grid-cols-[1fr_380px] xl:gap-4">
        {/* LEFT COLUMN: World Map + mode controls */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-yellow-400 heading-fantasy">World</h2>

          {/* Combat / Gathering Toggle */}
          <div className="flex gap-1 panel-stone p-1">
            <button
              onClick={() => handleModeSwitch('combat')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                idleMode === 'combat' ? 'bg-red-600 text-white' : 'bg-stone-mid text-gray-400 hover:bg-stone-dark'
              }`}
            >
              {'\u2694\uFE0F'} Combat
            </button>
            <button
              onClick={() => handleModeSwitch('gathering')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                idleMode === 'gathering' ? 'bg-green-600 text-white' : 'bg-stone-mid text-gray-400 hover:bg-stone-dark'
              } ${tutorialStep === 4 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
            >
              {'\u26CF\uFE0F'} Gathering
            </button>
          </div>

          {/* Gathering Profession Selector */}
          {idleMode === 'gathering' && (
            <div className="space-y-2">
              <div className="flex gap-1 panel-inset p-1">
                {GATHERING_PROFESSION_DEFS.map(prof => {
                  const skill = gatheringSkills[prof.id];
                  const isActive = selectedGatheringProfession === prof.id;
                  return (
                    <button
                      key={prof.id}
                      onClick={() => setGatheringProfession(prof.id)}
                      className={`flex-1 py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
                        isActive ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                      title={prof.description}
                    >
                      <span className="block text-center">
                        <span className="text-sm">{PROFESSION_ICONS[prof.id]}</span>
                        <span className="block text-xs mt-0.5">{prof.name}</span>
                        <span className="block text-xs opacity-70">Lv.{skill.level}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedGatheringProfession && (
                <div className="panel-stone px-3 py-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-400 font-semibold">
                      {PROFESSION_ICONS[selectedGatheringProfession]} {selectedGatheringProfession.charAt(0).toUpperCase() + selectedGatheringProfession.slice(1)} Lv.{currentGatheringLevel}
                    </span>
                    <span className="text-gray-500">{currentGatheringXp}/{gatheringXpToNext} XP</span>
                  </div>
                  <div className="h-1.5 bar-track overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${(currentGatheringXp / gatheringXpToNext) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Void Invasion Tracker */}
          {idleMode === 'combat' && (
            <InvasionTracker invasionState={invasionState} selectedBand={selectedBand} />
          )}

          {/* World Map */}
          <WorldMap
            currentZoneId={currentZoneId}
            selectedZone={selectedZone}
            selectedBand={selectedBand}
            totalZoneClears={totalZoneClears}
            zoneMasteryClaimed={zoneMasteryClaimed}
            invasionState={invasionState}
            onSelectZone={setSelectedZone}
            onSelectBand={setSelectedBand}
            onTravel={handleTravel}
            expandedZone={expandedZone}
            onExpandZone={setExpandedZone}
            targetedMobId={targetedMobId}
            mobKillCounts={mobKillCounts}
            onTargetMob={setTargetedMob}
          />

          {/* Daily Quests (combat mode) — mob selector now lives inside ZoneDetail */}
          {idleMode === 'combat' && (
            <DailyQuestPanel currentZoneId={selectedZone} />
          )}
        </div>

        {/* RIGHT COLUMN: stats + combat */}
        <div className="xl:sticky xl:top-[88px] xl:self-start xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto space-y-1.5 mt-3 xl:mt-0">
          <StatsTicker selectedZone={selectedZone} />
          {!isRunning && idleMode === 'combat' && <SkillPicker />}
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={idleMode === 'gathering' && (!selectedGatheringProfession || !canGatherInZone(currentGatheringLevel, zone))}
              className={`w-full py-3 font-bold rounded-lg text-lg transition-all ${
                idleMode === 'gathering' && (!selectedGatheringProfession || !canGatherInZone(currentGatheringLevel, zone))
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              } ${tutorialStep === 3 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
            >
              {idleMode === 'gathering' && selectedGatheringProfession && !canGatherInZone(currentGatheringLevel, zone)
                ? `Requires ${selectedGatheringProfession.charAt(0).toUpperCase() + selectedGatheringProfession.slice(1)} Lv.${getGatheringSkillRequirement(zone.band)}`
                : idleMode === 'gathering' ? 'Start Gathering' : 'Start Idle Run'}
            </button>
          ) : (
            <CombatPanel key={idleStartTime} />
          )}
        </div>
      </div>
    </div>
  );
}

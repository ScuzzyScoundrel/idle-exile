import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { calcXpScale } from '../../engine/zones';
import { canGatherInZone, getGatheringSkillRequirement, calcGatheringXpRequired } from '../../engine/gathering';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { IdleMode } from '../../types';
import DailyQuestPanel from '../components/DailyQuestPanel';
import ZoneCardGrid from '../zones/ZoneCardGrid';

import {
  BAND_GRADIENTS, BAND_EMOJIS,
  HAZARD_ICONS, HAZARD_STAT_MAP,
  PROFESSION_ICONS,
} from '../zones/zoneConstants';
import { formatClearTime } from '../zones/zoneHelpers';
import InvasionTracker from '../zones/InvasionTracker';
import SkillPicker from '../zones/SkillPicker';
import MobSelector from '../zones/MobSelector';
import CombatPanel from '../zones/CombatPanel';

export default function ZoneScreen() {
  const {
    character,
    currentZoneId, idleStartTime, idleMode,
    gatheringSkills, selectedGatheringProfession,
    startIdleRun, stopIdleRun,
    setIdleMode, setGatheringProfession, getEstimatedClearTime,
    tutorialStep,
    totalKills, fastestClears,
    targetedMobId, setTargetedMob, mobKillCounts, bossKillCounts,
    totalZoneClears,
    zoneMasteryClaimed,
    invasionState,
  } = useGameStore();

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [selectedBand, setSelectedBand] = useState<number>(() => {
    if (currentZoneId) {
      const z = ZONE_DEFS.find(z => z.id === currentZoneId);
      return z?.band ?? 1;
    }
    return 1;
  });

  const isRunning = idleStartTime !== null;
  const zone = ZONE_DEFS.find((z) => z.id === selectedZone)!;
  const clearTime = getEstimatedClearTime(selectedZone);

  // XP scaling for selected zone
  const xpScale = calcXpScale(character.level, zone.iLvlMin);

  const handleStart = () => {
    startIdleRun(selectedZone);
  };

  const handleModeSwitch = (mode: IdleMode) => {
    if (mode === idleMode) return;
    stopIdleRun();
    setIdleMode(mode);
  };

  // Band zones
  const bands = [1, 2, 3, 4, 5, 6];
  const bandZones = ZONE_DEFS.filter(z => z.band === selectedBand);
  const gridZones = bandZones.filter((_, i) => i < 4);
  const bossZone = bandZones[4] ?? null;

  // Current gathering skill level for selected profession
  const currentGatheringLevel = selectedGatheringProfession
    ? gatheringSkills[selectedGatheringProfession].level
    : 0;
  const currentGatheringXp = selectedGatheringProfession
    ? gatheringSkills[selectedGatheringProfession].xp
    : 0;
  const gatheringXpToNext = selectedGatheringProfession
    ? calcGatheringXpRequired(gatheringSkills[selectedGatheringProfession].level)
    : 100;

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="xl:grid xl:grid-cols-[1fr_380px] xl:gap-4">
        {/* LEFT COLUMN: zone browser */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-yellow-400">Zones</h2>

          {/* Combat / Gathering Toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleModeSwitch('combat')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                idleMode === 'combat'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {'\u2694\uFE0F'} Combat
            </button>
            <button
              onClick={() => handleModeSwitch('gathering')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                idleMode === 'gathering'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              } ${tutorialStep === 4 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
            >
              {'\u26CF\uFE0F'} Gathering
            </button>
          </div>

          {/* Gathering Profession Selector */}
          {idleMode === 'gathering' && (
            <div className="space-y-2">
              <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
                {GATHERING_PROFESSION_DEFS.map(prof => {
                  const skill = gatheringSkills[prof.id];
                  const isActive = selectedGatheringProfession === prof.id;
                  return (
                    <button
                      key={prof.id}
                      onClick={() => setGatheringProfession(prof.id)}
                      className={`flex-1 py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
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

              {/* Gathering skill XP bar */}
              {selectedGatheringProfession && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-400 font-semibold">
                      {PROFESSION_ICONS[selectedGatheringProfession]} {selectedGatheringProfession.charAt(0).toUpperCase() + selectedGatheringProfession.slice(1)} Lv.{currentGatheringLevel}
                    </span>
                    <span className="text-gray-500">{currentGatheringXp}/{gatheringXpToNext} XP</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${(currentGatheringXp / gatheringXpToNext) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Band Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {bands.map(band => (
              <button
                key={band}
                onClick={() => setSelectedBand(band)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedBand === band
                    ? `${BAND_GRADIENTS[band]} text-white ring-1 ring-yellow-400/50`
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                {BAND_EMOJIS[band]} Band {band}
                {invasionState.activeInvasions[band] && (
                  <span className="ml-1 inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" title="Void Invasion active!" />
                )}
              </button>
            ))}
          </div>

          {/* Band Name */}
          <div className="text-xs text-gray-500 -mt-1 px-1">
            {BAND_NAMES[selectedBand]}
            <span className="text-gray-600 ml-2">iLvl {bandZones[0]?.iLvlMin}-{bandZones[bandZones.length - 1]?.iLvlMax}</span>
          </div>

          {/* Void Invasion Tracker */}
          {idleMode === 'combat' && (
            <InvasionTracker
              invasionState={invasionState}
              selectedBand={selectedBand}
            />
          )}

          {/* Zone Cards */}
          <ZoneCardGrid
            gridZones={gridZones}
            bossZone={bossZone}
            selectedBand={selectedBand}
            selectedZone={selectedZone}
            isRunning={isRunning}
            currentZoneId={currentZoneId}
            idleMode={idleMode}
            characterStats={character.stats}
            charLevel={character.level}
            selectedProfession={selectedGatheringProfession}
            gatheringSkillLevel={currentGatheringLevel}
            totalZoneClears={totalZoneClears}
            zoneMasteryClaimed={zoneMasteryClaimed}
            invasionState={invasionState}
            bossKillCounts={bossKillCounts}
            onSelectZone={setSelectedZone}
          />

          {/* Clear Time Estimate + Stats */}
          <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2 space-y-1">
            <div>
              Est. clear time: <span className={`font-mono ${clearTime > 3600 ? 'text-red-400' : clearTime > 300 ? 'text-yellow-400' : 'text-white'}`}>{formatClearTime(clearTime)}</span>
              {' '}&bull;{' '}iLvl: <span className="text-white">{zone.iLvlMin}-{zone.iLvlMax}</span>
              {idleMode === 'combat' && zone.hazards.length > 0 && (
                <span className="ml-2">
                  {zone.hazards.map((h, i) => {
                    const playerResist = (character.stats as Record<string, number>)[HAZARD_STAT_MAP[h.type]] ?? 0;
                    const belowThreshold = playerResist < h.threshold;
                    return (
                      <span key={i} className={`ml-1 ${belowThreshold ? 'text-red-400' : 'text-green-400'}`}>
                        {HAZARD_ICONS[h.type]} {Math.floor(playerResist)}/{h.threshold}
                      </span>
                    );
                  })}
                </span>
              )}
              {idleMode === 'gathering' && selectedGatheringProfession && (
                <span className="ml-2 text-green-400">
                  {PROFESSION_ICONS[selectedGatheringProfession]} Skill: {currentGatheringLevel}
                  {!canGatherInZone(currentGatheringLevel, zone) && (
                    <span className="text-red-400 ml-1">(need {getGatheringSkillRequirement(zone.band)})</span>
                  )}
                </span>
              )}
            </div>
            {idleMode === 'combat' && (
              <div className="flex flex-wrap gap-3 text-gray-500">
                <span>{'\u{1F480}'} Kills: <span className="text-white font-semibold">{totalKills.toLocaleString()}</span></span>
                {fastestClears[selectedZone] != null && (
                  <span>{'\u26A1'} Best: <span className="text-yellow-400 font-mono">{formatClearTime(fastestClears[selectedZone])}</span></span>
                )}
                {xpScale < 1.0 && (
                  <span className="text-yellow-500">
                    XP: {Math.round(xpScale * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Daily Quest Panel */}
          {idleMode === 'combat' && <DailyQuestPanel currentZoneId={selectedZone} />}

          {/* Mob Type Selector (combat mode) */}
          {idleMode === 'combat' && (
            <MobSelector zoneId={zone.id} targetedMobId={targetedMobId} mobKillCounts={mobKillCounts} onTargetMob={setTargetedMob} />
          )}
        </div>

        {/* RIGHT COLUMN: combat panel / start controls */}
        <div className="xl:sticky xl:top-[88px] xl:self-start xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto space-y-2 mt-3 xl:mt-0">
          {/* Ability Picker (combat, before starting) */}
          {!isRunning && idleMode === 'combat' && <SkillPicker />}

          {/* Start / Running State */}
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
            <CombatPanel
              key={idleStartTime}
              selectedZone={selectedZone}
              onSwitchZone={handleStart}
            />
          )}
        </div>
      </div>
    </div>
  );
}

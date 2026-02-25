import { useState, useEffect, useRef } from 'react';
import { useGameStore, ProcessClearsResult } from '../../store/gameStore';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { checkZoneMastery } from '../../engine/zones';
import { canGatherInZone, getGatheringSkillRequirement, calcGatheringXpRequired } from '../../engine/gathering';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { ZoneDef, Rarity, IdleMode, GatheringProfession } from '../../types';
import { calcBagCapacity } from '../../data/items';
import AbilityBar from '../components/AbilityBar';
import { getRareMaterialDef } from '../../data/rareMaterials';

// Band visual theming
const BAND_GRADIENTS: Record<number, string> = {
  1: 'bg-gradient-to-br from-emerald-900 via-green-800 to-lime-900',
  2: 'bg-gradient-to-br from-sky-900 via-cyan-800 to-teal-900',
  3: 'bg-gradient-to-br from-red-900 via-orange-800 to-yellow-900',
  4: 'bg-gradient-to-br from-slate-900 via-gray-800 to-purple-900',
  5: 'bg-gradient-to-br from-indigo-900 via-violet-800 to-blue-900',
  6: 'bg-gradient-to-br from-black via-red-950 to-purple-950',
};

const BAND_BORDERS: Record<number, string> = {
  1: 'border-emerald-700',
  2: 'border-cyan-700',
  3: 'border-red-700',
  4: 'border-slate-600',
  5: 'border-indigo-700',
  6: 'border-red-900',
};

const BAND_EMOJIS: Record<number, string> = {
  1: '\u{1F332}',
  2: '\u{26F0}\uFE0F',
  3: '\u2694\uFE0F',
  4: '\u{1F480}',
  5: '\u26A1',
  6: '\u{1F311}',
};

// Hazard display config
const HAZARD_COLORS: Record<string, string> = {
  fire: 'text-red-400',
  cold: 'text-blue-400',
  lightning: 'text-yellow-400',
  poison: 'text-green-400',
  chaos: 'text-purple-400',
};
const HAZARD_ICONS: Record<string, string> = {
  fire: '\u{1F525}',
  cold: '\u2744\uFE0F',
  lightning: '\u26A1',
  poison: '\u{1F40D}',
  chaos: '\u{1F480}',
};

const HAZARD_STAT_MAP: Record<string, string> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  poison: 'poisonResist',
  chaos: 'chaosResist',
};

// Rarity color classes
const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

// Gathering profession icons
const PROFESSION_ICONS: Record<GatheringProfession, string> = {
  mining: '\u26CF\uFE0F',
  herbalism: '\uD83C\uDF3F',
  skinning: '\uD83E\uDE93',
  logging: '\uD83E\uDEB5',
  fishing: '\uD83C\uDFA3',
};

/** Format seconds into a human-readable duration. */
function formatClearTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 365) return `${Math.floor(d / 365)}y ${d % 365}d`;
  return `${d}d ${h}h`;
}

// --- Session Summary ---
interface SessionSummary {
  totalClears: number;
  goldEarned: number;
  materials: Record<string, number>;
  rareMaterials: Record<string, number>;
  currencies: Record<string, number>;
  itemsByRarity: Record<Rarity, number>;
  itemsSalvaged: number;
  dustEarned: number;
  gatheringXp: number;
}

function emptySession(): SessionSummary {
  return {
    totalClears: 0,
    goldEarned: 0,
    materials: {},
    rareMaterials: {},
    currencies: {},
    itemsByRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    itemsSalvaged: 0,
    dustEarned: 0,
    gatheringXp: 0,
  };
}

function accumulateSession(session: SessionSummary, result: ProcessClearsResult, clearCount: number): SessionSummary {
  const s = { ...session };
  s.totalClears += clearCount;
  s.goldEarned += result.goldGained;
  s.dustEarned += result.dustGained;
  s.itemsSalvaged += result.overflowCount;
  s.gatheringXp += result.gatheringXpGained ?? 0;

  s.materials = { ...s.materials };
  for (const [k, v] of Object.entries(result.materialDrops)) {
    s.materials[k] = (s.materials[k] || 0) + v;
  }

  if (result.rareMaterialDrops) {
    s.rareMaterials = { ...s.rareMaterials };
    for (const [k, v] of Object.entries(result.rareMaterialDrops)) {
      s.rareMaterials[k] = (s.rareMaterials[k] || 0) + v;
    }
  }

  s.currencies = { ...s.currencies };
  for (const [k, v] of Object.entries(result.currencyDrops)) {
    if (v > 0) s.currencies[k] = (s.currencies[k] || 0) + v;
  }

  s.itemsByRarity = { ...s.itemsByRarity };
  for (const it of result.items) {
    s.itemsByRarity[it.rarity] = (s.itemsByRarity[it.rarity] || 0) + 1;
  }

  return s;
}

// --- Zone Card Component ---
interface ZoneCardProps {
  zone: ZoneDef;
  band: number;
  isBoss: boolean;
  isSelected: boolean;
  isActive: boolean;
  isUnlocked: boolean;
  hasMastery: boolean;
  playerStats: Record<string, number>;
  charLevel: number;
  idleMode: IdleMode;
  selectedProfession: GatheringProfession | null;
  gatheringSkillLevel: number;
  onSelect: () => void;
}

function ZoneCard({
  zone, band, isBoss, isSelected, isActive, isUnlocked, hasMastery,
  playerStats, charLevel, idleMode, selectedProfession, gatheringSkillLevel, onSelect,
}: ZoneCardProps) {
  const underleveled = charLevel < zone.recommendedLevel;
  const skillReq = getGatheringSkillRequirement(zone.band);
  const skillTooLow = idleMode === 'gathering' && selectedProfession && gatheringSkillLevel < skillReq;
  const hasMatchingProfession = idleMode === 'gathering' && selectedProfession
    ? zone.gatheringTypes.includes(selectedProfession)
    : true;

  return (
    <button
      onClick={onSelect}
      disabled={!isUnlocked}
      className={`
        relative w-full text-left rounded-lg border overflow-hidden transition-all
        ${isBoss ? 'h-44 border-2' : 'h-36'}
        ${!isUnlocked
          ? 'border-gray-700 opacity-40 cursor-not-allowed'
          : isSelected
            ? 'border-yellow-400 ring-2 ring-yellow-400/50'
            : `${BAND_BORDERS[band]} hover:brightness-125`}
        ${idleMode === 'gathering' && !hasMatchingProfession ? 'opacity-30' : ''}
      `}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 ${BAND_GRADIENTS[band]}`} />
      {/* Dark overlay for readability */}
      <div className={`absolute inset-0 ${skillTooLow ? 'bg-red-950/50' : 'bg-black/30'}`} />

      {/* Card content */}
      <div className="relative h-full flex flex-col justify-between p-3">
        {/* Top: name + hazards + mastery + level badge */}
        <div>
          <div className="flex items-center gap-1.5">
            {isBoss && <span className="text-base" title="Boss Zone">{'\u{1F451}'}</span>}
            {isActive && <span className="text-green-400 text-sm" title="Running">{'\u26A1'}</span>}
            <span className={`font-bold text-sm flex-1 ${isBoss ? 'text-yellow-300' : 'text-white'}`}>
              {zone.name}
            </span>
            {/* Level badge */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              underleveled ? 'bg-red-900/60 text-red-300' : 'bg-black/30 text-gray-400'
            }`}>
              Lv.{zone.recommendedLevel}
            </span>
            {hasMastery && idleMode === 'combat' && (
              <span className="text-green-400 text-xs font-bold px-1 bg-green-400/10 rounded" title="Zone Mastery">{'\u2713'}</span>
            )}
            {idleMode === 'combat' && zone.hazards.map((h, i) => {
              const resist = playerStats[HAZARD_STAT_MAP[h.type]] ?? 0;
              const below = resist < h.threshold;
              return (
                <span
                  key={i}
                  className={`text-sm ${below ? HAZARD_COLORS[h.type] + ' animate-pulse' : 'opacity-40'}`}
                  title={`${h.type} ${h.threshold}% (you: ${Math.floor(resist)}%)`}
                >
                  {HAZARD_ICONS[h.type]}
                </span>
              );
            })}
          </div>
          {underleveled && (
            <div className="text-[10px] text-red-400 mt-0.5">Underleveled</div>
          )}
          {skillTooLow && (
            <div className="text-[10px] text-red-400 mt-0.5">Skill too low (need {skillReq})</div>
          )}
        </div>

        {/* Middle: description */}
        <div className="text-xs text-gray-300/80 leading-snug">{zone.description}</div>

        {/* Bottom: iLvl + materials + gathering types */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="bg-black/30 rounded px-1.5 py-0.5">iLvl {zone.iLvlMin}-{zone.iLvlMax}</span>
          {idleMode === 'gathering' ? (
            <span className="flex gap-1">
              {zone.gatheringTypes.map(gt => (
                <span key={gt} className={selectedProfession === gt ? 'text-yellow-300' : ''} title={gt}>
                  {PROFESSION_ICONS[gt]}
                </span>
              ))}
            </span>
          ) : (
            <span className="truncate">{zone.materialDrops.join(', ')}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ZoneScreen() {
  const {
    character, inventory, bagSlots,
    currentZoneId, idleStartTime, idleMode,
    gatheringSkills, selectedGatheringProfession,
    startIdleRun, processNewClears, stopIdleRun, grantIdleXp, getEstimatedClearTime,
    setIdleMode, setGatheringProfession,
  } = useGameStore();

  const inventoryCapacity = calcBagCapacity(bagSlots);

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [elapsed, setElapsed] = useState(0);
  const [selectedBand, setSelectedBand] = useState<number>(() => {
    if (currentZoneId) {
      const z = ZONE_DEFS.find(z => z.id === currentZoneId);
      return z?.band ?? 1;
    }
    return 1;
  });
  const [session, setSession] = useState<SessionSummary>(emptySession);
  const lastClearCount = useRef(0);
  const [salvageTally, setSalvageTally] = useState({ count: 0, dust: 0 });

  const isRunning = idleStartTime !== null;
  const zone = ZONE_DEFS.find((z) => z.id === selectedZone)!;
  const clearTime = getEstimatedClearTime(selectedZone);
  const runningClearTime = isRunning
    ? getEstimatedClearTime(currentZoneId!)
    : clearTime;
  const runningZone = isRunning ? ZONE_DEFS.find(z => z.id === currentZoneId) : null;

  // Timer tick
  useEffect(() => {
    if (!isRunning || !idleStartTime) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - idleStartTime) / 1000);
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning, idleStartTime]);

  // Real-time loot processing
  useEffect(() => {
    if (!isRunning || !runningZone) return;
    const currentClears = Math.floor(elapsed / runningClearTime);
    if (currentClears > lastClearCount.current) {
      const newClears = currentClears - lastClearCount.current;

      // Grant character XP only in combat mode
      if (idleMode === 'combat') {
        grantIdleXp(10 * runningZone.band * newClears);
      }

      // Process drops (branches on idleMode internally)
      const result = processNewClears(newClears);
      if (result) {
        setSession(prev => accumulateSession(prev, result, newClears));
        if (result.overflowCount > 0) {
          setSalvageTally(prev => ({
            count: prev.count + result.overflowCount,
            dust: prev.dust + result.dustGained,
          }));
        }
      }
      lastClearCount.current = currentClears;
    }
  }, [elapsed, runningClearTime, isRunning, runningZone, idleMode, grantIdleXp, processNewClears]);

  // Check if a zone is unlocked
  const isZoneUnlocked = (_z: ZoneDef): boolean => {
    return true; // Future: track completion
  };

  const handleStart = () => {
    setSession(emptySession());
    lastClearCount.current = 0;
    setSalvageTally({ count: 0, dust: 0 });
    startIdleRun(selectedZone);
  };

  const handleStop = () => {
    stopIdleRun();
    setElapsed(0);
    lastClearCount.current = 0;
  };

  const handleModeSwitch = (mode: IdleMode) => {
    if (mode === idleMode) return;
    setSession(emptySession());
    lastClearCount.current = 0;
    setSalvageTally({ count: 0, dust: 0 });
    setElapsed(0);
    setIdleMode(mode);
  };

  const currentClears = isRunning ? Math.floor(elapsed / runningClearTime) : 0;

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
          }`}
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
                    <span className="block text-[10px] mt-0.5">{prof.name}</span>
                    <span className="block text-[9px] opacity-70">Lv.{skill.level}</span>
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
          </button>
        ))}
      </div>

      {/* Band Name */}
      <div className="text-xs text-gray-500 -mt-1 px-1">
        {BAND_NAMES[selectedBand]}
        <span className="text-gray-600 ml-2">iLvl {bandZones[0]?.iLvlMin}-{bandZones[bandZones.length - 1]?.iLvlMax}</span>
      </div>

      {/* Zone Cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gridZones.map((z) => (
            <ZoneCard
              key={z.id}
              zone={z}
              band={selectedBand}
              isBoss={false}
              isSelected={selectedZone === z.id}
              isActive={isRunning && currentZoneId === z.id}
              isUnlocked={isZoneUnlocked(z)}
              hasMastery={z.hazards.length > 0 && checkZoneMastery(character.stats, z)}
              playerStats={character.stats as Record<string, number>}
              charLevel={character.level}
              idleMode={idleMode}
              selectedProfession={selectedGatheringProfession}
              gatheringSkillLevel={currentGatheringLevel}
              onSelect={() => isZoneUnlocked(z) && setSelectedZone(z.id)}
            />
          ))}
        </div>

        {bossZone && (
          <ZoneCard
            zone={bossZone}
            band={selectedBand}
            isBoss={true}
            isSelected={selectedZone === bossZone.id}
            isActive={isRunning && currentZoneId === bossZone.id}
            isUnlocked={isZoneUnlocked(bossZone)}
            hasMastery={bossZone.hazards.length > 0 && checkZoneMastery(character.stats, bossZone)}
            playerStats={character.stats as Record<string, number>}
            charLevel={character.level}
            idleMode={idleMode}
            selectedProfession={selectedGatheringProfession}
            gatheringSkillLevel={currentGatheringLevel}
            onSelect={() => isZoneUnlocked(bossZone) && setSelectedZone(bossZone.id)}
          />
        )}
      </div>

      {/* Clear Time Estimate */}
      <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2">
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

      {/* Start / Running State */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          disabled={idleMode === 'gathering' && !selectedGatheringProfession}
          className={`w-full py-3 font-bold rounded-lg text-lg transition-all ${
            idleMode === 'gathering' && !selectedGatheringProfession
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : idleMode === 'gathering'
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {idleMode === 'gathering' ? 'Start Gathering' : 'Start Idle Run'}
        </button>
      ) : (
        <div className="space-y-2">
          {/* Switch zone button */}
          {selectedZone !== currentZoneId && (
            <button
              onClick={handleStart}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-all"
            >
              Switch to {ZONE_DEFS.find((z) => z.id === selectedZone)?.name}
            </button>
          )}
          {/* Progress */}
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
                className={`h-full rounded-full transition-all duration-200 ${
                  idleMode === 'gathering' ? 'bg-green-500' : 'bg-green-500'
                }`}
                style={{ width: `${((elapsed % runningClearTime) / runningClearTime) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              Clears: <span className="text-white font-semibold">{currentClears}</span>
            </div>
          </div>

          {/* Ability Bar (combat mode only) */}
          {idleMode === 'combat' && <AbilityBar />}

          {/* Bags status + overflow warning */}
          {isRunning && (
            <div className={`rounded-lg px-3 py-2 text-xs ${
              inventory.length >= inventoryCapacity
                ? 'bg-amber-950 border border-amber-700'
                : 'bg-gray-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className={inventory.length >= inventoryCapacity ? 'text-amber-300 font-semibold' : 'text-gray-400'}>
                  {'\u{1F392}'} Bags: {inventory.length}/{inventoryCapacity}
                  {inventory.length >= inventoryCapacity && ' — FULL'}
                </span>
                {salvageTally.count > 0 && (
                  <span className="text-amber-400">
                    {salvageTally.count} salvaged &rarr; +{salvageTally.dust} dust
                  </span>
                )}
              </div>
              {inventory.length >= inventoryCapacity && (
                <div className="text-amber-400/80 text-[10px] mt-0.5">
                  Gear drops are being auto-salvaged. Upgrade bags or disenchant items.
                </div>
              )}
            </div>
          )}

          {/* Session Summary */}
          {session.totalClears > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 space-y-2">
              <div className="text-xs font-bold text-gray-300">Session Summary</div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-500">Clears</span>
                <span className="text-white font-semibold">{session.totalClears}</span>

                {session.goldEarned > 0 && (
                  <>
                    <span className="text-gray-500">Gold</span>
                    <span className="text-yellow-400">+{session.goldEarned}</span>
                  </>
                )}

                {session.gatheringXp > 0 && (
                  <>
                    <span className="text-gray-500">Gathering XP</span>
                    <span className="text-green-400">+{session.gatheringXp}</span>
                  </>
                )}
              </div>

              {/* Materials */}
              {Object.keys(session.materials).length > 0 && (
                <div className="text-xs">
                  <span className="text-gray-500">Materials:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(session.materials).map(([mat, count]) => (
                      <span key={mat} className="bg-gray-800 rounded px-1.5 py-0.5 text-[10px] text-gray-300">
                        {mat.replace(/_/g, ' ')} <span className="text-white">x{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rare Materials */}
              {Object.keys(session.rareMaterials).length > 0 && (
                <div className="text-xs">
                  <span className="text-purple-400 font-semibold">Rare Finds:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(session.rareMaterials).map(([matId, count]) => {
                      const def = getRareMaterialDef(matId);
                      const rarityColor = def ? RARITY_TEXT[def.rarity as Rarity] ?? 'text-gray-300' : 'text-gray-300';
                      return (
                        <span key={matId} className={`bg-gray-800 rounded px-1.5 py-0.5 text-[10px] ${rarityColor} animate-pulse`}>
                          {def?.icon ?? ''} {def?.name ?? matId.replace(/_/g, ' ')} <span className="text-white">x{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Currencies */}
              {Object.keys(session.currencies).length > 0 && (
                <div className="text-xs">
                  <span className="text-gray-500">Currencies:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(session.currencies).map(([curr, count]) => (
                      <span key={curr} className="bg-gray-800 rounded px-1.5 py-0.5 text-[10px] text-purple-300">
                        {curr} <span className="text-white">x{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Items by rarity */}
              {Object.values(session.itemsByRarity).some(v => v > 0) && (
                <div className="text-xs">
                  <span className="text-gray-500">Items:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as Rarity[]).map(r => {
                      const count = session.itemsByRarity[r];
                      if (count === 0) return null;
                      return (
                        <span key={r} className={`${RARITY_TEXT[r]} text-[10px]`}>
                          {count} {r}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {session.itemsSalvaged > 0 && (
                <div className="text-[10px] text-amber-400">
                  {session.itemsSalvaged} items auto-salvaged (+{session.dustEarned} dust)
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleStop}
            className="w-full py-2 bg-red-800 hover:bg-red-700 text-red-200 font-semibold rounded-lg text-sm transition-all"
          >
            Stop Run
          </button>
        </div>
      )}
    </div>
  );
}

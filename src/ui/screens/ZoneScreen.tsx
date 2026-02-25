import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { checkZoneMastery } from '../../engine/zones';
import { ZoneDef, Rarity, CurrencyType } from '../../types';
import { BAG_UPGRADE_DEFS, calcBagCapacity } from '../../data/items';

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

// Rarity color classes for item names in loot feed
const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

// A single clear entry for the loot feed
interface ClearEntry {
  id: number;
  clearNumber: number;
  items: { name: string; rarity: Rarity }[];
  hadCurrency: boolean;
  hadMaterial: boolean;
  hadBag: boolean;
  overflow: boolean;
  timestamp: number;
}

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

let clearIdCounter = 0;

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
  onSelect: () => void;
}

function ZoneCard({ zone, band, isBoss, isSelected, isActive, isUnlocked, hasMastery, playerStats, onSelect }: ZoneCardProps) {
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
      `}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 ${BAND_GRADIENTS[band]}`} />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Card content */}
      <div className="relative h-full flex flex-col justify-between p-3">
        {/* Top: name + hazards + mastery */}
        <div>
          <div className="flex items-center gap-1.5">
            {isBoss && <span className="text-base" title="Boss Zone">{'\u{1F451}'}</span>}
            {isActive && <span className="text-green-400 text-sm" title="Running">{'\u26A1'}</span>}
            <span className={`font-bold text-sm flex-1 ${isBoss ? 'text-yellow-300' : 'text-white'}`}>
              {zone.name}
            </span>
            {hasMastery && (
              <span className="text-green-400 text-xs font-bold px-1 bg-green-400/10 rounded" title="Zone Mastery — all thresholds met">{'\u2713'} Mastery</span>
            )}
            {zone.hazards.map((h, i) => {
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
        </div>

        {/* Middle: description */}
        <div className="text-xs text-gray-300/80 leading-snug">{zone.description}</div>

        {/* Bottom: iLvl + materials */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="bg-black/30 rounded px-1.5 py-0.5">iLvl {zone.iLvlMin}-{zone.iLvlMax}</span>
          <span className="truncate">{zone.materialDrops.join(', ')}</span>
        </div>
      </div>
    </button>
  );
}

export default function ZoneScreen() {
  const {
    character, pendingLoot, inventory, bagSlots,
    currentZoneId, idleStartTime,
    startIdleRun, processNewClears, collectIdleResults, stopIdleRun, grantIdleXp, getEstimatedClearTime,
  } = useGameStore();

  const inventoryCapacity = calcBagCapacity(bagSlots);

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [elapsed, setElapsed] = useState(0);
  const [lastResults, setLastResults] = useState<{ gold: number; clears: number; bagDrops: Record<string, number> } | null>(null);
  const [lootFeed, setLootFeed] = useState<ClearEntry[]>([]);
  const [bankedMsg, setBankedMsg] = useState<string | null>(null);
  const [expandedBand, setExpandedBand] = useState<number | null>(1);
  const lastClearCount = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const bankedMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Real-time loot processing: call processNewClears when new clears detected
  useEffect(() => {
    if (!isRunning || !runningZone) return;
    const currentClears = Math.floor(elapsed / runningClearTime);
    if (currentClears > lastClearCount.current) {
      const newClears = currentClears - lastClearCount.current;
      // Grant XP
      grantIdleXp(10 * runningZone.band * newClears);
      // Process real drops — items go into bags immediately
      const result = processNewClears(newClears);
      // Build feed entries (one per clear batch)
      if (result) {
        const hasCurrency = Object.values(result.currencyDrops).some(v => v > 0);
        const hasBag = Object.keys(result.bagDrops).length > 0;
        const entry: ClearEntry = {
          id: clearIdCounter++,
          clearNumber: currentClears,
          items: result.items,
          hadCurrency: hasCurrency,
          hadMaterial: true,
          hadBag: hasBag,
          overflow: result.overflowCount > 0,
          timestamp: Date.now(),
        };
        setLootFeed((prev) => [entry, ...prev].slice(0, 50));
        // Accumulate salvage tally
        if (result.overflowCount > 0) {
          setSalvageTally(prev => ({
            count: prev.count + result.overflowCount,
            dust: prev.dust + result.dustGained,
          }));
        }
      }
      lastClearCount.current = currentClears;
      if (feedRef.current) feedRef.current.scrollTop = 0;
    }
  }, [elapsed, runningClearTime, isRunning, runningZone, grantIdleXp, processNewClears]);

  useEffect(() => {
    return () => { if (bankedMsgTimer.current) clearTimeout(bankedMsgTimer.current); };
  }, []);

  const showBankedMsg = (clears: number) => {
    if (clears <= 0) return;
    setBankedMsg(`${clears} clears banked — press Collect Resources to claim`);
    if (bankedMsgTimer.current) clearTimeout(bankedMsgTimer.current);
    bankedMsgTimer.current = setTimeout(() => setBankedMsg(null), 3000);
  };

  const toggleBand = (band: number) => {
    setExpandedBand(prev => prev === band ? null : band);
  };

  // Check if a zone is unlocked (all previous zones accessible)
  const isZoneUnlocked = (z: ZoneDef): boolean => {
    if (!z.unlockRequirement) return true;
    // For now, all zones are unlocked (future: track completion)
    return true;
  };

  const handleStart = () => {
    setLastResults(null);
    setLootFeed([]);
    lastClearCount.current = 0;
    setSalvageTally({ count: 0, dust: 0 });
    const prev = startIdleRun(selectedZone);
    if (prev) showBankedMsg(prev.bankedClears);
  };

  const handleCollect = () => {
    const results = collectIdleResults();
    if (results) {
      setLastResults({
        gold: results.gold,
        clears: results.clearsCompleted,
        bagDrops: results.bagDrops,
      });
      setLootFeed([]);
      lastClearCount.current = 0;
      setSalvageTally({ count: 0, dust: 0 });
      setElapsed(0);
    }
  };

  const handleStop = () => {
    const results = stopIdleRun();
    if (results) {
      setLastResults({
        gold: results.gold,
        clears: results.clearsCompleted,
        bagDrops: results.bagDrops,
      });
    }
    setLootFeed([]);
    lastClearCount.current = 0;
    setSalvageTally({ count: 0, dust: 0 });
    setElapsed(0);
  };

  const currentClears = isRunning ? Math.floor(elapsed / runningClearTime) : 0;
  const totalPendingClears = currentClears + pendingLoot.clearsCompleted;

  // Group zones by band
  const bands = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-yellow-400">Zones</h2>

      {/* Band-grouped zone grid */}
      {bands.map((band) => {
        const bandZones = ZONE_DEFS.filter(z => z.band === band);
        const isExpanded = expandedBand === band;
        const gridZones = bandZones.filter((_, i) => i < 4);
        const bossZone = bandZones[4] ?? null;

        return (
          <div key={band} className="rounded-lg overflow-hidden">
            {/* Band header */}
            <button
              onClick={() => toggleBand(band)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-colors ${BAND_GRADIENTS[band]} hover:brightness-110`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{BAND_EMOJIS[band]}</span>
                <span className="text-yellow-300">Band {band}</span>
                <span className="text-white/70">{BAND_NAMES[band]}</span>
                <span className="text-white/40 text-xs">iLvl {bandZones[0]?.iLvlMin}-{bandZones[bandZones.length - 1]?.iLvlMax}</span>
              </span>
              <span className="text-white/50 text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
            </button>

            {/* Zone cards */}
            {isExpanded && (
              <div className="bg-gray-900/50 p-3 space-y-3">
                {/* 2x2 grid for first 4 zones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gridZones.map((z) => (
                    <ZoneCard
                      key={z.id}
                      zone={z}
                      band={band}
                      isBoss={false}
                      isSelected={selectedZone === z.id}
                      isActive={isRunning && currentZoneId === z.id}
                      isUnlocked={isZoneUnlocked(z)}
                      hasMastery={z.hazards.length > 0 && checkZoneMastery(character.stats, z)}
                      playerStats={character.stats as Record<string, number>}
                      onSelect={() => isZoneUnlocked(z) && setSelectedZone(z.id)}
                    />
                  ))}
                </div>

                {/* Boss zone — full width */}
                {bossZone && (
                  <ZoneCard
                    zone={bossZone}
                    band={band}
                    isBoss={true}
                    isSelected={selectedZone === bossZone.id}
                    isActive={isRunning && currentZoneId === bossZone.id}
                    isUnlocked={isZoneUnlocked(bossZone)}
                    hasMastery={bossZone.hazards.length > 0 && checkZoneMastery(character.stats, bossZone)}
                    playerStats={character.stats as Record<string, number>}
                    onSelect={() => isZoneUnlocked(bossZone) && setSelectedZone(bossZone.id)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Clear Time Estimate */}
      <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2">
        Est. clear time: <span className={`font-mono ${clearTime > 3600 ? 'text-red-400' : clearTime > 300 ? 'text-yellow-400' : 'text-white'}`}>{formatClearTime(clearTime)}</span>
        {' '}&bull;{' '}iLvl: <span className="text-white">{zone.iLvlMin}-{zone.iLvlMax}</span>
        {zone.hazards.length > 0 && (
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
      </div>

      {/* Start / Running State */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-lg transition-all"
        >
          Start Idle Run
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
              </span>
              <span className="text-yellow-400 font-mono">{Math.floor(elapsed)}s</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-200"
                style={{ width: `${((elapsed % runningClearTime) / runningClearTime) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              Clears: <span className="text-white font-semibold">{currentClears}</span>
              {pendingLoot.clearsCompleted > 0 && (
                <span className="text-yellow-500 ml-1">(+{pendingLoot.clearsCompleted} banked)</span>
              )}
            </div>
          </div>

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
                  Gear drops are being auto-salvaged into materials. Upgrade your bags or disenchant items to make room.
                </div>
              )}
            </div>
          )}

          {/* Live Loot Feed */}
          {lootFeed.length > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-2 py-1 bg-gray-800 border-b border-gray-700 flex items-center gap-1">
                <span className="text-xs font-semibold text-gray-300">{'\u{1F392}'} Loot Feed</span>
                <span className="text-[10px] text-gray-500 ml-auto">{lootFeed.length} entries</span>
              </div>
              <div
                ref={feedRef}
                className="max-h-40 overflow-y-auto p-1 space-y-0.5"
              >
                {lootFeed.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs"
                  >
                    <span className="text-gray-500 font-mono text-[10px] w-8 flex-shrink-0">
                      #{entry.clearNumber}
                    </span>
                    <span className="flex gap-1 items-center flex-1 min-w-0">
                      {entry.items.length > 0 ? (
                        entry.items.map((it, i) => (
                          <span key={i} className={`${RARITY_TEXT[it.rarity]} truncate text-[11px]`}>
                            {'\u{1F6E1}\uFE0F'}{it.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 text-[10px]">mats + xp</span>
                      )}
                      {entry.hadCurrency && <span title="Currency drop">{'\u{1F48E}'}</span>}
                      {entry.hadBag && <span title="Bag drop!" className="text-yellow-400">{'\u{1F392}'}</span>}
                    </span>
                    {entry.overflow && (
                      <span className="text-amber-400 text-[10px] flex-shrink-0">(bags full)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCollect}
            disabled={pendingLoot.clearsCompleted === 0}
            className={`
              w-full py-3 font-bold rounded-lg text-lg transition-all
              ${pendingLoot.clearsCompleted > 0
                ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            Collect Resources ({pendingLoot.clearsCompleted} clears)
          </button>

          <button
            onClick={handleStop}
            className="w-full py-2 bg-red-800 hover:bg-red-700 text-red-200 font-semibold rounded-lg text-sm transition-all"
          >
            Stop Run
          </button>
        </div>
      )}

      {/* Banked Loot Notification */}
      {bankedMsg && (
        <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-2 text-xs text-yellow-300 animate-pulse">
          {bankedMsg}
        </div>
      )}

      {/* Last Collection Results */}
      {lastResults && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-green-400">Resources Collected!</h3>
            <button
              onClick={() => setLastResults(null)}
              className="text-gray-500 hover:text-white text-lg leading-none px-1"
              title="Dismiss"
            >&times;</button>
          </div>
          <div className="text-xs text-gray-300">
            +{lastResults.gold} Gold from {lastResults.clears} clears
          </div>
          {Object.keys(lastResults.bagDrops).length > 0 && (
            <div className="text-xs text-yellow-300">
              {Object.entries(lastResults.bagDrops).map(([id, count]) => {
                const def = BAG_UPGRADE_DEFS.find(b => b.id === id);
                return <div key={id}>+{count} {def?.name ?? id} (check Inventory &rarr; Consumables)</div>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { checkZoneMastery } from '../../engine/zones';
import { Item, ZoneDef } from '../../types';
import ItemCard from '../components/ItemCard';

// Hazard display config
const HAZARD_COLORS: Record<string, string> = {
  fire: 'text-red-400',
  cold: 'text-blue-400',
  lightning: 'text-yellow-400',
  poison: 'text-green-400',
  chaos: 'text-purple-400',
};
const HAZARD_ICONS: Record<string, string> = {
  fire: '🔥',
  cold: '❄️',
  lightning: '⚡',
  poison: '🐍',
  chaos: '💀',
};

const HAZARD_STAT_MAP: Record<string, string> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  poison: 'poisonResist',
  chaos: 'chaosResist',
};

// A single clear entry for the loot feed
interface ClearEntry {
  id: number;
  clearNumber: number;
  hadItem: boolean;
  hadCurrency: boolean;
  hadMaterial: boolean;
  timestamp: number;
}

let clearIdCounter = 0;

function rollClearSummary(clearNumber: number): ClearEntry {
  const itemChance = 0.25;
  // Combined currency chance (augment 6%, chaos 3%, divine 1.5%, annul 1.5%, exalt 0.8%, socket 2%)
  const noCurrProb = (1 - 0.06) * (1 - 0.03) * (1 - 0.015) * (1 - 0.015) * (1 - 0.008) * (1 - 0.02);

  return {
    id: clearIdCounter++,
    clearNumber,
    hadItem: Math.random() < itemChance,
    hadCurrency: Math.random() > noCurrProb,
    hadMaterial: true,
    timestamp: Date.now(),
  };
}

export default function ZoneScreen() {
  const {
    character, pendingLoot,
    currentZoneId, idleStartTime,
    startIdleRun, collectIdleResults, stopIdleRun, grantIdleXp, getEstimatedClearTime,
  } = useGameStore();

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [elapsed, setElapsed] = useState(0);
  const [lastResults, setLastResults] = useState<{ items: Item[]; xp: number; gold: number } | null>(null);
  const [lootFeed, setLootFeed] = useState<ClearEntry[]>([]);
  const [bankedMsg, setBankedMsg] = useState<string | null>(null);
  const [collapsedBands, setCollapsedBands] = useState<Set<number>>(new Set());
  const lastClearCount = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const bankedMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Generate clear summaries + auto-grant XP
  useEffect(() => {
    if (!isRunning || !runningZone) return;
    const currentClears = Math.floor(elapsed / runningClearTime);
    if (currentClears > lastClearCount.current) {
      const newClears = currentClears - lastClearCount.current;
      grantIdleXp(10 * runningZone.band * newClears);
      const newEntries: ClearEntry[] = [];
      for (let i = 0; i < newClears; i++) {
        const clearNum = lastClearCount.current + i + 1;
        newEntries.push(rollClearSummary(clearNum));
      }
      lastClearCount.current = currentClears;
      setLootFeed((prev) => [...newEntries, ...prev].slice(0, 50));
      if (feedRef.current) feedRef.current.scrollTop = 0;
    }
  }, [elapsed, runningClearTime, isRunning, runningZone, grantIdleXp]);

  useEffect(() => {
    return () => { if (bankedMsgTimer.current) clearTimeout(bankedMsgTimer.current); };
  }, []);

  const showBankedMsg = (clears: number) => {
    if (clears <= 0) return;
    setBankedMsg(`${clears} clears banked — press Collect Loot to claim`);
    if (bankedMsgTimer.current) clearTimeout(bankedMsgTimer.current);
    bankedMsgTimer.current = setTimeout(() => setBankedMsg(null), 3000);
  };

  const toggleBand = (band: number) => {
    setCollapsedBands(prev => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
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
    const prev = startIdleRun(selectedZone);
    if (prev) showBankedMsg(prev.bankedClears);
  };

  const handleCollect = () => {
    const results = collectIdleResults();
    if (results) {
      setLastResults({ items: results.items, xp: 0, gold: results.goldGained });
      setLootFeed([]);
      lastClearCount.current = 0;
      setElapsed(0);
    }
  };

  const handleStop = () => {
    const results = stopIdleRun();
    if (results) {
      setLastResults({ items: results.items, xp: 0, gold: results.goldGained });
    }
    setLootFeed([]);
    lastClearCount.current = 0;
    setElapsed(0);
  };

  const currentClears = isRunning ? Math.floor(elapsed / runningClearTime) : 0;
  const totalPendingClears = currentClears + pendingLoot.clearsCompleted;

  // Group zones by band
  const bands = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-yellow-400">Zones</h2>

      {/* Band-grouped zone list */}
      {bands.map((band) => {
        const bandZones = ZONE_DEFS.filter(z => z.band === band);
        const isCollapsed = collapsedBands.has(band);

        return (
          <div key={band} className="bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleBand(band)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <span>
                <span className="text-yellow-500">Band {band}</span>
                <span className="text-gray-400 ml-2">{BAND_NAMES[band]}</span>
                <span className="text-gray-500 text-xs ml-2">iLvl {bandZones[0]?.iLvlMin}-{bandZones[bandZones.length - 1]?.iLvlMax}</span>
              </span>
              <span className="text-xs text-gray-500">{isCollapsed ? '▼' : '▲'}</span>
            </button>

            {!isCollapsed && (
              <div className="px-2 pb-2 space-y-1">
                {bandZones.map((z) => {
                  const isActive = isRunning && currentZoneId === z.id;
                  const isSelected = selectedZone === z.id;
                  const unlocked = isZoneUnlocked(z);
                  const hasMastery = checkZoneMastery(character.stats, z);
                  const stats = character.stats as Record<string, number>;

                  return (
                    <button
                      key={z.id}
                      onClick={() => unlocked && setSelectedZone(z.id)}
                      disabled={!unlocked}
                      className={`
                        w-full text-left p-2 rounded-lg border text-xs transition-all
                        ${!unlocked
                          ? 'border-gray-700 bg-gray-900 opacity-40 cursor-not-allowed'
                          : isSelected
                            ? 'border-yellow-500 bg-yellow-950'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-500'}
                      `}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-white flex-1">
                          {z.name}
                          {isActive && <span className="ml-1 text-green-400 text-[10px]">Running</span>}
                        </span>
                        {/* Mastery badge */}
                        {z.hazards.length > 0 && hasMastery && (
                          <span className="text-green-400 text-xs" title="Zone Mastery — all thresholds met">✓</span>
                        )}
                        {/* Hazard icons */}
                        {z.hazards.map((h, i) => {
                          const playerResist = stats[HAZARD_STAT_MAP[h.type]] ?? 0;
                          const belowThreshold = playerResist < h.threshold;
                          return (
                            <span
                              key={i}
                              className={`text-xs ${belowThreshold ? HAZARD_COLORS[h.type] + ' animate-pulse' : 'opacity-40'}`}
                              title={`${h.type} ${h.threshold}% (you: ${Math.floor(playerResist)}%)`}
                            >
                              {HAZARD_ICONS[h.type]}
                            </span>
                          );
                        })}
                      </div>
                      <div className="text-gray-500 mt-0.5">{z.description}</div>
                      <div className="flex gap-2 mt-0.5 text-gray-600">
                        <span>iLvl {z.iLvlMin}-{z.iLvlMax}</span>
                        <span>•</span>
                        <span>{z.materialDrops.join(', ')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Clear Time Estimate */}
      <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2">
        Est. clear time: <span className="text-white font-mono">{clearTime.toFixed(1)}s</span>
        {' '}•{' '}iLvl: <span className="text-white">{zone.iLvlMin}-{zone.iLvlMax}</span>
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

          {/* Live Loot Feed */}
          {lootFeed.length > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-2 py-1 bg-gray-800 border-b border-gray-700 flex items-center gap-1">
                <span className="text-xs font-semibold text-gray-300">🎒 Loot Feed</span>
                <span className="text-[10px] text-gray-500 ml-auto">{lootFeed.length} clears</span>
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
                    <span className="flex gap-1 text-sm">
                      {entry.hadItem && <span title="Item drop">🛡️</span>}
                      {entry.hadCurrency && <span title="Currency drop">💎</span>}
                      {entry.hadMaterial && <span title="Materials">🪨</span>}
                      <span className="text-yellow-500" title="XP + Gold">⭐</span>
                    </span>
                    {!entry.hadItem && !entry.hadCurrency && (
                      <span className="text-gray-600 text-[10px]">mats + xp</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCollect}
            disabled={totalPendingClears === 0}
            className={`
              w-full py-3 font-bold rounded-lg text-lg transition-all
              ${totalPendingClears > 0
                ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            Collect Loot ({totalPendingClears} clears)
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
          <h3 className="text-sm font-bold text-green-400">Loot Collected!</h3>
          <div className="text-xs text-gray-300">
            +{lastResults.gold} Gold
          </div>
          {lastResults.items.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400">{lastResults.items.length} item(s) added to inventory</div>
              {lastResults.items.slice(0, 5).map((item) => (
                <ItemCard key={item.id} item={item} compact />
              ))}
              {lastResults.items.length > 5 && (
                <div className="text-xs text-gray-500">+{lastResults.items.length - 5} more in inventory...</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

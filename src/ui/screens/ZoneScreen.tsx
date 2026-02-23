import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { GatheringFocus, IdleRunResult } from '../../types';
import ItemCard from '../components/ItemCard';

const FOCUS_OPTIONS: { id: GatheringFocus; label: string; icon: string; desc: string }[] = [
  { id: 'combat', label: 'Combat', icon: '\u2694\uFE0F', desc: 'Balanced drops' },
  { id: 'harvesting', label: 'Harvest', icon: '\uD83C\uDF3F', desc: 'More materials' },
  { id: 'prospecting', label: 'Prospect', icon: '\uD83D\uDC8E', desc: 'More currency' },
  { id: 'scavenging', label: 'Scavenge', icon: '\uD83D\uDD0D', desc: 'More items' },
];

export default function ZoneScreen() {
  const {
    currentZoneId, currentZoneTier, currentFocus, idleStartTime,
    startIdleRun, collectIdleResults, getEstimatedClearTime,
  } = useGameStore();

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [selectedTier, setSelectedTier] = useState(currentZoneTier || 1);
  const [selectedFocus, setSelectedFocus] = useState<GatheringFocus>(currentFocus || 'combat');
  const [elapsed, setElapsed] = useState(0);
  const [lastResults, setLastResults] = useState<IdleRunResult | null>(null);

  const isRunning = idleStartTime !== null;
  const zone = ZONE_DEFS.find((z) => z.id === selectedZone)!;
  const clearTime = getEstimatedClearTime(selectedZone, selectedTier);

  // Timer tick
  useEffect(() => {
    if (!isRunning || !idleStartTime) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - idleStartTime) / 1000);
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, idleStartTime]);

  const handleStart = () => {
    setLastResults(null);
    startIdleRun(selectedZone, selectedTier, selectedFocus);
  };

  const handleCollect = () => {
    const results = collectIdleResults();
    if (results) {
      setLastResults(results);
      setElapsed(0);
    }
  };

  const clearsCompleted = isRunning ? Math.floor(elapsed / clearTime) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-yellow-400">Zones</h2>

      {/* Zone Selection */}
      <div className="grid grid-cols-2 gap-2">
        {ZONE_DEFS.map((z) => (
          <button
            key={z.id}
            onClick={() => !isRunning && setSelectedZone(z.id)}
            disabled={isRunning}
            className={`
              text-left p-2 rounded-lg border text-xs transition-all
              ${selectedZone === z.id
                ? 'border-yellow-500 bg-yellow-950'
                : 'border-gray-700 bg-gray-800 hover:border-gray-500'}
              ${isRunning ? 'opacity-50' : ''}
            `}
          >
            <div className="font-semibold text-white">{z.name}</div>
            <div className="text-gray-400">{z.region}</div>
            <div className="text-gray-500 mt-0.5">{z.materialDrops.join(', ')}</div>
          </button>
        ))}
      </div>

      {/* Tier Selection */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Difficulty Tier</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].filter((t) => t <= zone.maxTier).map((t) => (
            <button
              key={t}
              onClick={() => !isRunning && setSelectedTier(t)}
              disabled={isRunning}
              className={`
                px-3 py-1 rounded text-sm font-semibold transition-all
                ${selectedTier === t
                  ? 'bg-yellow-600 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                ${isRunning ? 'opacity-50' : ''}
              `}
            >
              T{t}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Selection */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Gathering Focus</label>
        <div className="grid grid-cols-4 gap-1">
          {FOCUS_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => !isRunning && setSelectedFocus(f.id)}
              disabled={isRunning}
              className={`
                p-1.5 rounded text-center text-xs transition-all
                ${selectedFocus === f.id
                  ? 'bg-yellow-600 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                ${isRunning ? 'opacity-50' : ''}
              `}
            >
              <div>{f.icon}</div>
              <div className="font-semibold">{f.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Clear Time Estimate */}
      <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2">
        Est. clear time: <span className="text-white font-mono">{clearTime.toFixed(1)}s</span>
        {' '}\u2022{' '}iLvl: <span className="text-white">{zone.iLvlByTier[selectedTier]}</span>
      </div>

      {/* Start / Collect Button */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-lg transition-all"
        >
          Start Idle Run
        </button>
      ) : (
        <div className="space-y-2">
          {/* Progress */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">
                {ZONE_DEFS.find((z) => z.id === currentZoneId)?.name} (T{currentZoneTier})
              </span>
              <span className="text-yellow-400 font-mono">{Math.floor(elapsed)}s</span>
            </div>
            {/* Clear progress bar */}
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${((elapsed % clearTime) / clearTime) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              Clears completed: <span className="text-white font-semibold">{clearsCompleted}</span>
            </div>
          </div>

          <button
            onClick={handleCollect}
            disabled={clearsCompleted === 0}
            className={`
              w-full py-3 font-bold rounded-lg text-lg transition-all
              ${clearsCompleted > 0
                ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            Collect Loot ({clearsCompleted} clears)
          </button>
        </div>
      )}

      {/* Last Results */}
      {lastResults && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <h3 className="text-sm font-bold text-green-400">Loot Collected!</h3>
          <div className="text-xs text-gray-300 space-y-0.5">
            <div>+{lastResults.xpGained} XP \u2022 +{lastResults.goldGained} Gold</div>
            {Object.entries(lastResults.currencyDrops).filter(([, v]) => v > 0).map(([k, v]) => (
              <span key={k} className="mr-2">+{v} {k}</span>
            ))}
            {Object.entries(lastResults.materials).filter(([, v]) => v > 0).map(([k, v]) => (
              <span key={k} className="mr-2 text-gray-400">+{v} {k.replace(/_/g, ' ')}</span>
            ))}
          </div>
          {lastResults.items.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400">{lastResults.items.length} item(s) added to inventory</div>
              {lastResults.items.map((item) => (
                <ItemCard key={item.id} item={item} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

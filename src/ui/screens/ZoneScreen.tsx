import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { GatheringFocus, Item, CurrencyType, GearSlot } from '../../types';
import { generateItem } from '../../engine/items';
import ItemCard from '../components/ItemCard';

const GEAR_SLOTS: GearSlot[] = ['weapon', 'chest', 'boots', 'ring'];

const FOCUS_OPTIONS: {
  id: GatheringFocus;
  label: string;
  icon: string;
  desc: string;
  detail: string;
}[] = [
  {
    id: 'combat',
    label: 'Combat',
    icon: '\u2694\uFE0F',
    desc: 'Balanced drops',
    detail: 'Normal clear speed. Equal chance for gear, currency, and materials. Good all-around choice.',
  },
  {
    id: 'harvesting',
    label: 'Harvest',
    icon: '\uD83C\uDF3F',
    desc: 'More materials',
    detail: 'Slightly slower clears. 2x material drops, but fewer gear and currency drops. Best for stocking up crafting materials.',
  },
  {
    id: 'prospecting',
    label: 'Prospect',
    icon: '\uD83D\uDC8E',
    desc: 'More currency',
    detail: 'Normal clear speed. 2x currency drop rates, but fewer materials. Best when you need crafting shards.',
  },
  {
    id: 'scavenging',
    label: 'Scavenge',
    icon: '\uD83D\uDD0D',
    desc: 'More items',
    detail: 'Slightly slower clears. 50% more gear drops. Best for hunting upgrades and items to craft on.',
  },
];

// A single loot feed entry
interface LootDrop {
  id: number;
  type: 'item' | 'currency' | 'material' | 'xp';
  label: string;
  rarity?: string;
  icon: string;
  timestamp: number;
}

const CURRENCY_ICONS: Record<string, string> = {
  transmute: '\u26AA', augment: '\uD83D\uDFE2', chaos: '\uD83D\uDD34',
  alchemy: '\uD83D\uDFE1', divine: '\uD83D\uDFE0', annul: '\u26AB',
  exalt: '\uD83D\uDFE3', regal: '\uD83D\uDD35',
};

let dropIdCounter = 0;

function generateDropsForClear(
  zoneId: string,
  tier: number,
  focus: GatheringFocus,
): LootDrop[] {
  const zone = ZONE_DEFS.find((z) => z.id === zoneId);
  if (!zone) return [];

  const drops: LootDrop[] = [];
  const iLvl = zone.iLvlByTier[tier] ?? 1;
  const now = Date.now();

  // Item drop
  const itemChance = focus === 'scavenging' ? 0.45 : 0.30;
  if (Math.random() < itemChance) {
    const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
    const item = generateItem(slot, iLvl);
    const rarityIcon = { normal: '\u26AA', magic: '\uD83D\uDD35', rare: '\uD83D\uDFE1', unique: '\uD83D\uDFE0' };
    drops.push({
      id: dropIdCounter++,
      type: 'item',
      label: item.name,
      rarity: item.rarity,
      icon: rarityIcon[item.rarity] || '\u26AA',
      timestamp: now,
    });
  }

  // Materials
  const matMin = focus === 'harvesting' ? 2 : 1;
  const matMax = focus === 'harvesting' ? 4 : 2;
  const matCount = matMin + Math.floor(Math.random() * (matMax - matMin + 1));
  for (let m = 0; m < matCount; m++) {
    const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
    drops.push({
      id: dropIdCounter++,
      type: 'material',
      label: mat.replace(/_/g, ' '),
      icon: '\uD83E\uDEA8',
      timestamp: now,
    });
  }

  // Currency
  const currMult = focus === 'prospecting' ? 2 : 1;
  const currencyRolls: [CurrencyType, number][] = [
    ['transmute', 0.10], ['augment', 0.05], ['chaos', 0.02],
    ['divine', 0.01], ['annul', 0.01], ['exalt', 0.005],
  ];
  for (const [curr, chance] of currencyRolls) {
    if (Math.random() < chance * currMult) {
      drops.push({
        id: dropIdCounter++,
        type: 'currency',
        label: curr,
        icon: CURRENCY_ICONS[curr] || '\u26AA',
        timestamp: now,
      });
    }
  }

  // XP + Gold always
  drops.push({
    id: dropIdCounter++,
    type: 'xp',
    label: `+${10 * tier} XP, +${5 * tier} Gold`,
    icon: '\u2B50',
    timestamp: now,
  });

  return drops;
}

const RARITY_COLORS: Record<string, string> = {
  normal: 'text-gray-400',
  magic: 'text-blue-400',
  rare: 'text-yellow-400',
  unique: 'text-orange-400',
};

export default function ZoneScreen() {
  const {
    currentZoneId, currentZoneTier, currentFocus, idleStartTime,
    startIdleRun, collectIdleResults, getEstimatedClearTime,
  } = useGameStore();

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [selectedTier, setSelectedTier] = useState(currentZoneTier || 1);
  const [selectedFocus, setSelectedFocus] = useState<GatheringFocus>(currentFocus || 'combat');
  const [elapsed, setElapsed] = useState(0);
  const [lastResults, setLastResults] = useState<{ items: Item[]; xp: number; gold: number } | null>(null);
  const [lootFeed, setLootFeed] = useState<LootDrop[]>([]);
  const [hoveredFocus, setHoveredFocus] = useState<GatheringFocus | null>(null);
  const lastClearCount = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const isRunning = idleStartTime !== null;
  const zone = ZONE_DEFS.find((z) => z.id === selectedZone)!;
  const clearTime = getEstimatedClearTime(selectedZone, selectedTier);

  // Timer tick
  useEffect(() => {
    if (!isRunning || !idleStartTime) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - idleStartTime) / 1000);
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning, idleStartTime]);

  // Generate loot drops when a new clear completes
  useEffect(() => {
    if (!isRunning) return;
    const currentClears = Math.floor(elapsed / clearTime);
    if (currentClears > lastClearCount.current) {
      const newClears = currentClears - lastClearCount.current;
      const newDrops: LootDrop[] = [];
      for (let i = 0; i < newClears; i++) {
        newDrops.push(
          ...generateDropsForClear(
            currentZoneId || selectedZone,
            currentZoneTier || selectedTier,
            currentFocus || selectedFocus,
          )
        );
      }
      lastClearCount.current = currentClears;
      setLootFeed((prev) => [...newDrops, ...prev].slice(0, 50)); // keep last 50
      // Auto-scroll feed
      if (feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    }
  }, [elapsed, clearTime, isRunning, currentZoneId, currentZoneTier, currentFocus, selectedZone, selectedTier, selectedFocus]);

  const handleStart = () => {
    setLastResults(null);
    setLootFeed([]);
    lastClearCount.current = 0;
    startIdleRun(selectedZone, selectedTier, selectedFocus);
  };

  const handleCollect = () => {
    const results = collectIdleResults();
    if (results) {
      setLastResults({ items: results.items, xp: results.xpGained, gold: results.goldGained });
      setLootFeed([]);
      lastClearCount.current = 0;
      setElapsed(0);
    }
  };

  const clearsCompleted = isRunning ? Math.floor(elapsed / clearTime) : 0;
  const activeFocusInfo = hoveredFocus
    ? FOCUS_OPTIONS.find((f) => f.id === hoveredFocus)
    : FOCUS_OPTIONS.find((f) => f.id === selectedFocus);

  return (
    <div className="space-y-3">
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

      {/* Focus Selection with descriptions */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Gathering Focus</label>
        <div className="grid grid-cols-4 gap-1">
          {FOCUS_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => !isRunning && setSelectedFocus(f.id)}
              onMouseEnter={() => setHoveredFocus(f.id)}
              onMouseLeave={() => setHoveredFocus(null)}
              disabled={isRunning}
              className={`
                p-1.5 rounded text-center text-xs transition-all
                ${selectedFocus === f.id
                  ? 'bg-yellow-600 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                ${isRunning ? 'opacity-50' : ''}
              `}
            >
              <div className="text-base">{f.icon}</div>
              <div className="font-semibold">{f.label}</div>
              <div className="text-[10px] opacity-70">{f.desc}</div>
            </button>
          ))}
        </div>
        {/* Focus detail tooltip */}
        {activeFocusInfo && (
          <div className="text-xs text-gray-400 mt-1.5 bg-gray-800 rounded p-2 border border-gray-700">
            <span className="text-white font-semibold">{activeFocusInfo.icon} {activeFocusInfo.label}:</span>{' '}
            {activeFocusInfo.detail}
          </div>
        )}
      </div>

      {/* Clear Time Estimate */}
      <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2">
        Est. clear time: <span className="text-white font-mono">{clearTime.toFixed(1)}s</span>
        {' '}\u2022{' '}iLvl: <span className="text-white">{zone.iLvlByTier[selectedTier]}</span>
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
                className="h-full bg-green-500 rounded-full transition-all duration-200"
                style={{ width: `${((elapsed % clearTime) / clearTime) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              Clears: <span className="text-white font-semibold">{clearsCompleted}</span>
            </div>
          </div>

          {/* Live Loot Feed */}
          {lootFeed.length > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-2 py-1 bg-gray-800 border-b border-gray-700 flex items-center gap-1">
                <span className="text-xs font-semibold text-gray-300">\uD83C\uDF92 Loot Feed</span>
                <span className="text-[10px] text-gray-500 ml-auto">{lootFeed.length} drops</span>
              </div>
              <div
                ref={feedRef}
                className="max-h-40 overflow-y-auto p-1 space-y-0.5"
              >
                {lootFeed.map((drop) => (
                  <div
                    key={drop.id}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs animate-pulse-once"
                  >
                    <span className="text-sm flex-shrink-0">{drop.icon}</span>
                    <span
                      className={`truncate ${
                        drop.type === 'item'
                          ? RARITY_COLORS[drop.rarity || 'normal']
                          : drop.type === 'currency'
                            ? 'text-purple-300'
                            : drop.type === 'xp'
                              ? 'text-gray-500'
                              : 'text-gray-400'
                      }`}
                    >
                      {drop.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* Last Collection Results */}
      {lastResults && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <h3 className="text-sm font-bold text-green-400">Loot Collected!</h3>
          <div className="text-xs text-gray-300">
            +{lastResults.xp} XP \u2022 +{lastResults.gold} Gold
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

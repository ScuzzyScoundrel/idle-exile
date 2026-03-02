import { useGameStore } from '../../store/gameStore';
import type { Rarity, CurrencyType } from '../../types';
import { CURRENCY_DEFS } from '../../data/items';
import { getBagDef } from '../../data/items';

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-gray-700',
  uncommon: 'bg-green-900/50',
  rare: 'bg-blue-900/50',
  epic: 'bg-purple-900/50',
  legendary: 'bg-yellow-900/50',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function OfflineProgressModal() {
  const progress = useGameStore((s) => s.offlineProgress);
  const claimOfflineProgress = useGameStore((s) => s.claimOfflineProgress);

  if (!progress) return null;

  // Count items by rarity
  const rarityBreakdown: Partial<Record<Rarity, number>> = {};
  for (const item of progress.items) {
    rarityBreakdown[item.rarity] = (rarityBreakdown[item.rarity] || 0) + 1;
  }

  // Non-zero currencies
  const currencyEntries = Object.entries(progress.currencyDrops)
    .filter(([, val]) => val > 0) as [CurrencyType, number][];

  // Non-zero materials
  const materialEntries = Object.entries(progress.materials)
    .filter(([, val]) => val > 0);

  // Bag drops
  const bagEntries = Object.entries(progress.bagDrops)
    .filter(([, val]) => val > 0);

  const hasResources = currencyEntries.length > 0 || materialEntries.length > 0
    || bagEntries.length > 0 || progress.autoSalvagedDust > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-xl border border-indigo-500/30 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 px-6 py-5 text-center">
          <h2 className="text-2xl font-bold text-white">Welcome Back, Exile!</h2>
          <p className="text-indigo-200 mt-1">
            You were away for <span className="font-semibold text-white">{formatDuration(progress.elapsedSeconds)}</span>
          </p>
          <p className="text-indigo-300 text-sm mt-0.5">
            Farming <span className="font-medium text-indigo-100">{progress.zoneName}</span>
          </p>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Clears" value={formatNumber(progress.clearsCompleted)} icon={'\u2694\uFE0F'} />
            <StatCard label="Gold" value={formatNumber(progress.goldGained)} icon={'\u{1FA99}'} />
            <StatCard label="XP" value={formatNumber(progress.xpGained)} icon={'\u2B50'} />
          </div>

          {/* Best drop highlight */}
          {progress.bestItem && (
            <div className={`rounded-lg border ${
              progress.bestItem.rarity === 'legendary' ? 'border-yellow-500/50 bg-yellow-950/30' :
              progress.bestItem.rarity === 'epic' ? 'border-purple-500/50 bg-purple-950/30' :
              progress.bestItem.rarity === 'rare' ? 'border-blue-500/50 bg-blue-950/30' :
              'border-gray-600/50 bg-gray-800/30'
            } p-3`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Best Drop</p>
              <p className={`font-semibold ${RARITY_COLORS[progress.bestItem.rarity]}`}>
                {progress.bestItem.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                iLvl {progress.bestItem.iLvl} &middot; {progress.bestItem.rarity} &middot; {
                  progress.bestItem.prefixes.length + progress.bestItem.suffixes.length
                } affixes
              </p>
            </div>
          )}

          {/* Items found */}
          {progress.items.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-sm text-gray-300 mb-2">
                <span className="font-semibold text-white">{progress.items.length}</span> items found
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as Rarity[])
                  .filter(r => rarityBreakdown[r])
                  .map(r => (
                    <span key={r} className={`text-xs px-2 py-0.5 rounded-full ${RARITY_BG[r]} ${RARITY_COLORS[r]}`}>
                      {rarityBreakdown[r]} {r}
                    </span>
                  ))
                }
              </div>
              {progress.autoSalvagedCount > 0 && (
                <p className="text-xs text-amber-400/80 mt-2">
                  ~{progress.autoSalvagedCount} will be auto-salvaged on claim (+{progress.autoSalvagedDust} essence)
                </p>
              )}
            </div>
          )}

          {/* Resources */}
          {hasResources && (
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Resources</p>

              {/* Materials */}
              {materialEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {materialEntries.map(([mat, count]) => (
                    <span key={mat} className="text-xs text-gray-300 bg-gray-700 px-2 py-0.5 rounded">
                      {mat.replace(/_/g, ' ')}: {count}
                    </span>
                  ))}
                </div>
              )}

              {/* Currencies */}
              {currencyEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currencyEntries.map(([type, count]) => {
                    const def = CURRENCY_DEFS.find(c => c.id === type);
                    return (
                      <span key={type} className="text-xs text-gray-300 bg-gray-700 px-2 py-0.5 rounded">
                        {def?.icon ?? ''} {def?.name ?? type}: {count}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Bag drops */}
              {bagEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bagEntries.map(([bagId, count]) => {
                    const def = getBagDef(bagId);
                    return (
                      <span key={bagId} className="text-xs text-cyan-300 bg-cyan-900/30 px-2 py-0.5 rounded">
                        {def.name} x{count}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Salvage dust from auto-salvage */}
              {progress.autoSalvagedDust > 0 && (
                <p className="text-xs text-gray-400">
                  +{progress.autoSalvagedDust} enchanting essence from overflow
                </p>
              )}
            </div>
          )}
        </div>

        {/* Claim button */}
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-700">
          <button
            onClick={claimOfflineProgress}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg transition-all active:scale-[0.98]"
          >
            Claim Rewards
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className="text-lg">{icon}</div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

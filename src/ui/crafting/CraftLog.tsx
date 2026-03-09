import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { RARITY_TEXT } from './craftingConstants';

export default function CraftLog() {
  const craftLog = useGameStore(s => s.craftLog);
  const clearCraftLog = useCraftingStore(s => s.clearCraftLog);

  if (craftLog.length === 0) return null;

  // Show last 5 entries
  const visible = craftLog.slice(0, 5);

  return (
    <div className="bg-gray-800/60 rounded-lg px-2 py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400">Craft Log</span>
        <button
          onClick={clearCraftLog}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Clear
        </button>
      </div>
      <div className="space-y-0.5 max-h-28 overflow-y-auto">
        {visible.map(entry => {
          const ago = formatTimeAgo(entry.timestamp);
          const rarityClass = entry.itemRarity ? RARITY_TEXT[entry.itemRarity] : 'text-gray-300';
          return (
            <div key={entry.id} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-600 w-10 shrink-0 text-right">{ago}</span>
              <span className="text-gray-500">
                {entry.type === 'refine' ? '\u2697\uFE0F' : entry.type === 'pattern' ? '\uD83D\uDCDC' : '\uD83D\uDD28'}
              </span>
              <span className={rarityClass}>
                {entry.count > 1 ? `${entry.count}x ` : ''}{entry.itemName ?? entry.recipeName}
              </span>
              {entry.xpGained > 0 && (
                <span className="text-green-500">+{entry.xpGained} XP</span>
              )}
              {entry.wasSalvaged && (
                <span className="text-amber-500">(salvaged)</span>
              )}
              {entry.batchSalvaged && entry.batchSalvaged > 0 && (
                <span className="text-amber-500">({entry.batchSalvaged} salvaged)</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return 'now';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

export default function ZoneDefeatOverlay({ mobName, zoneName, currentHp, maxHp, showCraftingHint, onDismissCraftingHint }: {
  mobName: string; zoneName: string; currentHp: number; maxHp: number;
  showCraftingHint?: boolean; onDismissCraftingHint?: () => void;
}) {
  const pct = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  return (
    <div className="bg-gradient-to-br from-red-950 via-gray-900 to-red-950 rounded-lg border-2 border-red-800 p-4 text-center space-y-2">
      <div className="text-2xl">{'\u{1F480}'}</div>
      <div className="text-red-400 font-bold text-sm">Defeated!</div>
      <div className="text-gray-400 text-xs">The {mobName} of {zoneName} overwhelmed you!</div>
      <div className="text-xs text-yellow-500 font-semibold">Boss progress reset</div>
      <div className="mt-2">
        <div className="text-xs text-gray-500 mb-1">Recovering...</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-200"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
      {showCraftingHint && (
        <div className="mt-3 bg-yellow-950/60 border border-yellow-700 rounded-lg p-3 space-y-2">
          <div className="text-yellow-300 text-xs font-bold">Getting owned? Try crafting a better weapon!</div>
          <div className="text-gray-400 text-[11px]">Check the Craft tab to forge stronger gear.</div>
          <button
            onClick={onDismissCraftingHint}
            className="px-3 py-1 text-xs rounded bg-yellow-800 hover:bg-yellow-700 text-yellow-200 font-semibold"
          >
            Got it!
          </button>
        </div>
      )}
    </div>
  );
}

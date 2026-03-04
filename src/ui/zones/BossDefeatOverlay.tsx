export default function BossDefeatOverlay({ bossName, currentHp, maxHp }: { bossName: string; currentHp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  return (
    <div className="bg-gradient-to-br from-red-950 via-gray-900 to-red-950 rounded-lg border-2 border-red-800 p-4 text-center space-y-2">
      <div className="text-2xl">{'\u{1F480}'}</div>
      <div className="text-red-400 font-bold text-sm">Defeated!</div>
      <div className="text-gray-400 text-xs">{bossName} was too strong. Gear up and try again!</div>
      <div className="mt-2">
        <div className="text-xs text-gray-500 mb-1">Recovering...</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-200"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

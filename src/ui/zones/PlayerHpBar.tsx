export default function PlayerHpBar({ currentHp, maxHp, trailHp, fortifyStacks, fortifyDR, currentEs, maxEs }: {
  currentHp: number; maxHp: number; trailHp?: number;
  fortifyStacks?: number; fortifyDR?: number;
  currentEs?: number; maxEs?: number;
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const trailPct = trailHp != null && maxHp > 0
    ? Math.max(0, Math.min(100, (trailHp / maxHp) * 100))
    : pct;
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const hasFortify = (fortifyDR ?? 0) > 0;
  const hasEs = (maxEs ?? 0) > 0;
  const esPct = hasEs ? Math.max(0, Math.min(100, ((currentEs ?? 0) / maxEs!) * 100)) : 0;

  return (
    <div
      className={`bg-gray-800/50 rounded-lg border p-2 ${hasFortify ? 'border-amber-500/40' : 'border-gray-700'}`}
      style={hasFortify ? { animation: 'fortify-glow 2s ease-in-out infinite' } : undefined}
    >
      <div className="flex justify-between text-xs mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-300 font-semibold">HP</span>
          {hasFortify && (
            <span className="text-[10px] font-mono text-amber-300">
              FORT {fortifyStacks} ({Math.round((fortifyDR ?? 0) * 100)}% DR)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasEs && (
            <span className="text-blue-400 font-mono text-[11px]">
              ES: {Math.ceil(currentEs ?? 0)}/{maxEs}
            </span>
          )}
          <span className="text-white font-mono">{Math.ceil(currentHp)}/{maxHp}</span>
        </div>
      </div>
      {/* ES bar (above HP) */}
      {hasEs && (
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden mb-0.5">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-150"
               style={{ width: `${esPct}%` }} />
        </div>
      )}
      {/* HP bar */}
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative">
        {/* Damage trail — shows where HP was, fades to reveal damage taken */}
        {trailPct > pct && (
          <div className="absolute h-full bg-red-800/60 rounded-full transition-all duration-500"
               style={{ width: `${trailPct}%` }} />
        )}
        {/* Current interpolated HP */}
        <div className={`absolute h-full ${color} rounded-full transition-all duration-150`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

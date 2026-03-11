import type { ActiveDebuff } from '../../types';
import DebuffBadge from './DebuffBadge';

export default function BossFightDisplay({ bossName, bossHp, bossMaxHp, playerHp, maxHp, startedAt, nextBossAttackAt, bossAtkIntervalMs, activeDebuffs, fortifyStacks, fortifyDR, playerEs, maxEs }: {
  bossName: string; bossHp: number; bossMaxHp: number;
  playerHp: number; maxHp: number; startedAt: number;
  nextBossAttackAt: number; bossAtkIntervalMs: number;
  activeDebuffs: ActiveDebuff[]; fortifyStacks: number; fortifyDR: number;
  playerEs?: number; maxEs?: number;
}) {
  const bossPct = bossMaxHp > 0 ? Math.max(0, (bossHp / bossMaxHp) * 100) : 0;
  const elapsedSec = Math.max(0.1, (Date.now() - startedAt) / 1000);
  const damageDealt = bossMaxHp - bossHp;
  const playerDps = damageDealt / elapsedSec;
  const playerPct = maxHp > 0 ? Math.max(0, (playerHp / maxHp) * 100) : 0;
  const playerColor = playerPct > 60 ? 'bg-green-500' : playerPct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const hasDebuffs = activeDebuffs.length > 0;
  const hasFortify = fortifyDR > 0;
  const hasEs = (maxEs ?? 0) > 0;
  const esPct = hasEs ? Math.max(0, Math.min(100, ((playerEs ?? 0) / maxEs!) * 100)) : 0;

  return (
    <div className="bg-gradient-to-br from-red-950 via-gray-900 to-red-950 rounded-lg border-2 border-red-700 p-3 space-y-2">
      <div className="text-center text-red-400 font-bold text-xs uppercase tracking-wider">Boss Fight</div>
      <div className="text-center text-white font-bold text-sm">{bossName}</div>
      {hasDebuffs && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {activeDebuffs.map(d => <DebuffBadge key={d.debuffId} debuff={d} />)}
        </div>
      )}
      {/* Boss HP */}
      <div
        className={hasDebuffs ? 'rounded-lg p-1 -m-1' : undefined}
        style={hasDebuffs ? { animation: 'debuff-glow 2s ease-in-out infinite' } : undefined}
      >
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-red-300 font-semibold">Boss HP</span>
          <span className="text-white font-mono">{Math.ceil(bossHp)}/{bossMaxHp}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 rounded-full transition-all duration-100"
               style={{ width: `${bossPct}%` }} />
        </div>
      </div>
      {/* Boss swing timer (CSS animation for 60fps smoothness) */}
      <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          key={nextBossAttackAt}
          className="h-full bg-orange-500/80 rounded-full"
          style={{
            animation: nextBossAttackAt > 0
              ? `swing-fill ${bossAtkIntervalMs}ms linear forwards`
              : 'none',
            width: '100%',
          }}
        />
      </div>
      {/* Player HP */}
      <div
        className={hasFortify ? 'rounded-lg p-1 -m-1' : undefined}
        style={hasFortify ? { animation: 'fortify-glow 2s ease-in-out infinite' } : undefined}
      >
        <div className="flex justify-between text-xs mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 font-semibold">Your HP</span>
            {hasFortify && (
              <span className="text-[10px] font-mono text-amber-300">
                FORT {fortifyStacks} ({Math.round(fortifyDR * 100)}% DR)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasEs && (
              <span className="text-blue-400 font-mono text-[11px]">
                ES: {Math.ceil(playerEs ?? 0)}/{maxEs}
              </span>
            )}
            <span className="text-white font-mono">{Math.ceil(playerHp)}/{maxHp}</span>
          </div>
        </div>
        {/* Player ES bar */}
        {hasEs && (
          <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden mb-0.5">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-100"
                 style={{ width: `${esPct}%` }} />
          </div>
        )}
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${playerColor} rounded-full transition-all duration-100`}
               style={{ width: `${playerPct}%` }} />
        </div>
      </div>
      <div className="text-xs text-gray-400 text-center space-x-3">
        <span>Your DPS: <span className="text-green-400 font-mono">{playerDps.toFixed(1)}</span></span>
        <span className="font-mono">{elapsedSec.toFixed(0)}s</span>
      </div>
    </div>
  );
}

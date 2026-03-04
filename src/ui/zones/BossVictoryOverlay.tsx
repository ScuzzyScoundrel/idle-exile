import type { Rarity } from '../../types';
import { RARITY_TEXT } from './zoneConstants';

interface BossVictoryProps {
  bossName: string;
  items: { name: string; rarity: Rarity }[];
  fightDuration: number;
  playerDps: number;
  bossDps: number;
  bossMaxHp: number;
}

export default function BossVictoryOverlay({ bossName, items, fightDuration, playerDps, bossDps, bossMaxHp }: BossVictoryProps) {
  return (
    <div className="bg-gradient-to-br from-yellow-950 via-gray-900 to-yellow-950 rounded-lg border-2 border-yellow-500 p-4 text-center space-y-3">
      <div className="text-2xl">{'\u{1F451}'}</div>
      <div className="text-yellow-400 font-bold text-sm">Boss Defeated!</div>
      <div className="text-white text-xs">{bossName} has been slain!</div>

      {/* Fight Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Fight Time</div>
          <div className="text-white font-bold font-mono">{fightDuration < 1 ? `${(fightDuration * 1000).toFixed(0)}ms` : `${fightDuration.toFixed(1)}s`}</div>
        </div>
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Boss HP</div>
          <div className="text-white font-bold font-mono">{bossMaxHp.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Your DPS</div>
          <div className="text-green-400 font-bold font-mono">{playerDps.toFixed(1)}</div>
        </div>
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Boss DPS</div>
          <div className="text-red-400 font-bold font-mono">{bossDps.toFixed(1)}</div>
        </div>
      </div>

      {/* Loot */}
      {items.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Loot</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {items.map((it, i) => (
              <span key={i} className={`${RARITY_TEXT[it.rarity]} text-xs bg-gray-800 rounded px-2 py-0.5`}>
                {it.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="text-gray-500 text-xs">Resuming shortly...</div>
    </div>
  );
}

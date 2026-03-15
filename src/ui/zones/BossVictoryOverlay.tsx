import type { Rarity, Gem } from '../../types';
import { RARITY_TEXT } from './zoneConstants';
import { getGemDef, GEM_TIER_NAMES, GEM_TIER_COLORS } from '../../data/gems';
import { getBossTrophyDef } from '../../data/bossTrophies';
import { getPatternDef } from '../../data/craftingPatterns';

interface BossVictoryProps {
  bossName: string;
  items: { name: string; rarity: Rarity }[];
  gemDrops?: Gem[];
  patternDrops?: string[];
  uniquePatternDrops?: string[];
  trophyDrops?: Record<string, number>;
  fightDuration: number;
  playerDps: number;
  bossDps: number;
  bossMaxHp: number;
}

export default function BossVictoryOverlay({ bossName, items, gemDrops, patternDrops, uniquePatternDrops, trophyDrops, fightDuration, playerDps, bossDps, bossMaxHp }: BossVictoryProps) {
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

      {/* Gem Drops */}
      {gemDrops && gemDrops.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Gems</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {gemDrops.map((gem, i) => (
              <span key={i} className={`text-xs bg-gray-800 border border-cyan-700/50 rounded-md px-2 py-0.5 ${GEM_TIER_COLORS[gem.tier]}`}>
                {getGemDef(gem.type).icon} {GEM_TIER_NAMES[gem.tier]} {getGemDef(gem.type).name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trophy Drops */}
      {trophyDrops && Object.keys(trophyDrops).length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Trophies</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {Object.entries(trophyDrops).map(([trophyId, count]) => {
              const trophy = getBossTrophyDef(trophyId);
              return (
                <span key={trophyId} className="text-xs bg-gray-800 border border-orange-600/50 rounded-md px-2 py-0.5 text-orange-300">
                  {trophy?.icon ?? ''} {trophy?.name ?? trophyId}{count > 1 ? ` x${count}` : ''}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Pattern Drops */}
      {patternDrops && patternDrops.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Patterns</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {patternDrops.map((patId, i) => {
              const pat = getPatternDef(patId);
              return (
                <span key={i} className="text-xs bg-gray-800 border border-amber-700/50 rounded-md px-2 py-0.5 text-amber-400">
                  {'\uD83D\uDCDC'} {pat?.name ?? patId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Unique Pattern Drops */}
      {uniquePatternDrops && uniquePatternDrops.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Unique Patterns</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {uniquePatternDrops.map((patId, i) => {
              const pat = getPatternDef(patId);
              return (
                <span key={i} className="text-xs bg-gray-800 border border-amber-500 rounded-md px-2 py-0.5 text-amber-300 font-bold animate-pulse">
                  {'\u2B50'} {pat?.name ?? patId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-gray-500 text-xs">Resuming shortly...</div>
    </div>
  );
}

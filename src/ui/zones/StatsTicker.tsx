import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { calcXpScale } from '../../engine/zones';
import { formatClearTime } from './zoneHelpers';

interface StatsTickerProps {
  selectedZone: string;
}

export default function StatsTicker({ selectedZone }: StatsTickerProps) {
  const { character, totalKills, bossKillCounts, fastestClears, idleMode } = useGameStore();

  const zone = ZONE_DEFS.find(z => z.id === selectedZone);
  if (!zone) return null;

  const totalBosses = Object.values(bossKillCounts).reduce((sum, n) => sum + n, 0);
  const bestTime = fastestClears[selectedZone];
  const xpScale = calcXpScale(character.level, zone.iLvlMin);

  return (
    <div className="bg-gray-800/80 rounded-lg px-3 py-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-sm">
        {idleMode === 'combat' && (
          <>
            <span className="text-gray-400">
              {'\u{1F480}'} <span className="text-white font-bold">{totalKills.toLocaleString()}</span>
            </span>
            <span className="text-gray-400">
              {'\u2694\uFE0F'} <span className="text-white font-bold">{totalBosses}</span>
              <span className="text-gray-500 text-xs ml-0.5">bosses</span>
            </span>
            {bestTime != null && (
              <span className="text-gray-400">
                {'\u26A1'} <span className="text-yellow-400 font-bold font-mono">{formatClearTime(bestTime)}</span>
                <span className="text-gray-500 text-xs ml-0.5">best</span>
              </span>
            )}
          </>
        )}
        <span className="text-gray-400 text-xs">
          Band {zone.band} {'\u00B7'} iLvl {zone.iLvlMin}-{zone.iLvlMax}
        </span>
        {idleMode === 'combat' && xpScale < 1.0 && (
          <span className="text-yellow-500 text-xs font-semibold">
            XP: {Math.round(xpScale * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

import { ZONE_DEFS } from '../../data/zones';
import { formatTimeRemaining } from './zoneHelpers';

export default function InvasionTracker({
  invasionState,
  selectedBand,
}: {
  invasionState: {
    activeInvasions: Record<number, { zoneId: string; startTime: number; endTime: number }>;
    bandCooldowns: Record<number, number>;
  };
  selectedBand: number;
}) {
  const now = Date.now();
  const activeInvasion = invasionState.activeInvasions[selectedBand];
  const cooldownEnd = invasionState.bandCooldowns[selectedBand] ?? 0;
  const cooldownRemaining = Math.max(0, cooldownEnd - now);
  const hasActiveInvasion = !!activeInvasion;
  const invasionRemaining = hasActiveInvasion ? Math.max(0, activeInvasion.endTime - now) : 0;
  const invadedZone = hasActiveInvasion ? ZONE_DEFS.find(z => z.id === activeInvasion.zoneId) : null;

  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${
      hasActiveInvasion
        ? 'bg-purple-950/60 border border-purple-700/50'
        : 'bg-gray-800/40 border border-gray-700/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-bold ${hasActiveInvasion ? 'text-purple-300' : 'text-gray-500'}`}>
            {hasActiveInvasion ? '\u{1F30C}' : '\u{1F311}'} Void Invasion
          </span>
          {hasActiveInvasion && invadedZone && (
            <span className="text-purple-400">
              <span className="font-semibold">{invadedZone.name}</span>
              <span className="text-purple-500 ml-1.5">{formatTimeRemaining(invasionRemaining)} remaining</span>
              <span className="text-purple-600 ml-1.5">+30% HP</span>
            </span>
          )}
          {!hasActiveInvasion && cooldownRemaining > 0 && (
            <span className="text-gray-500">
              Next possible in {formatTimeRemaining(cooldownRemaining)}
            </span>
          )}
          {!hasActiveInvasion && cooldownRemaining <= 0 && (
            <span className="text-gray-600 italic">
              Void rift could open any moment...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { getZoneMobTypes } from '../../data/mobTypes';
import { MOB_DROP_RARITY_COLOR } from './zoneConstants';
import { formatMatName } from './zoneHelpers';

export default function MobSelector({ zoneId, targetedMobId, mobKillCounts, onTargetMob }: {
  zoneId: string;
  targetedMobId: string | null;
  mobKillCounts: Record<string, number>;
  onTargetMob: (id: string | null) => void;
}) {
  const zoneMobs = getZoneMobTypes(zoneId);
  if (zoneMobs.length === 0) return null;

  return (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-2 space-y-1">
      <div className="text-xs text-gray-400 font-semibold mb-1">Target Mob</div>
      <button
        onClick={() => onTargetMob(null)}
        className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
          !targetedMobId ? 'bg-green-800/60 text-green-300 border border-green-600' : 'bg-gray-700/40 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <span className="font-semibold">Random</span>
        <span className="text-gray-500 ml-1">(all mob types)</span>
      </button>
      {zoneMobs.map(mob => {
        const isSelected = targetedMobId === mob.id;
        const kills = mobKillCounts[mob.id] || 0;
        return (
          <button
            key={mob.id}
            onClick={() => onTargetMob(isSelected ? null : mob.id)}
            className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
              isSelected ? 'bg-amber-800/60 text-amber-200 border border-amber-600' : 'bg-gray-700/40 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold">{mob.name}</span>
                {mob.hpMultiplier && mob.hpMultiplier !== 1.0 && (
                  <span className={`ml-1 ${mob.hpMultiplier > 1 ? 'text-red-400' : 'text-green-400'}`}>
                    ({mob.hpMultiplier > 1 ? '+' : ''}{Math.round((mob.hpMultiplier - 1) * 100)}% HP)
                  </span>
                )}
              </div>
              {kills > 0 && <span className="text-gray-500">{kills.toLocaleString()}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 mt-0.5">
              {mob.drops.map(drop => (
                <span key={drop.materialId} className={`${MOB_DROP_RARITY_COLOR[drop.rarity]} text-[10px]`}>
                  {formatMatName(drop.materialId)} ({Math.round(drop.chance * 100)}%)
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

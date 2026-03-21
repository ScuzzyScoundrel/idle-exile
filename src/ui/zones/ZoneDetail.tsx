import type { ZoneDef } from '../../types';
import { MASTERY_ICONS } from './zoneConstants';
import MobSelector from './MobSelector';

interface ZoneDetailProps {
  zone: ZoneDef;
  isCurrent: boolean;
  masteryTier: number;
  zoneClears: number;
  onTravel: (zoneId: string) => void;
  targetedMobId: string | null;
  mobKillCounts: Record<string, number>;
  onTargetMob: (id: string | null) => void;
}

export default function ZoneDetail({ zone, isCurrent, masteryTier, zoneClears, onTravel, targetedMobId, mobKillCounts, onTargetMob }: ZoneDetailProps) {
  return (
    <div className="p-3 space-y-2 animate-fade-in">
      {/* Stats row */}
      <div className="flex gap-2 text-xs">
        <div className="panel-inset px-2 py-1 flex-1 text-center">
          <div className="text-gray-500">iLvl</div>
          <div className="text-white font-semibold">{zone.iLvlMin}-{zone.iLvlMax}</div>
        </div>
        <div className="panel-inset px-2 py-1 flex-1 text-center">
          <div className="text-gray-500">Clears</div>
          <div className="text-white font-semibold">{zoneClears}</div>
        </div>
        <div className="panel-inset px-2 py-1 flex-1 text-center">
          <div className="text-gray-500">Mastery</div>
          <div className="flex justify-center gap-0.5">
            {(['bronze', 'silver', 'gold'] as const).map((tier, i) => {
              const meta = MASTERY_ICONS[tier];
              return (
                <span key={tier} className={`text-sm ${masteryTier > i ? meta.cls : 'opacity-20'}`}>
                  {meta.icon}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Material drops */}
      {zone.materialDrops.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {zone.materialDrops.map(m => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
              {m.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Mob selector */}
      <MobSelector zoneId={zone.id} targetedMobId={targetedMobId} mobKillCounts={mobKillCounts} onTargetMob={onTargetMob} />

      {/* Actions */}
      <div className="flex gap-2">
        {isCurrent ? (
          <div className="flex-1 py-2 text-center text-xs font-bold text-theme-text-accent panel-inset rounded-lg">
            Currently Here
          </div>
        ) : (
          <button
            onClick={() => onTravel(zone.id)}
            className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition-all"
          >
            Travel Here
          </button>
        )}
      </div>
    </div>
  );
}

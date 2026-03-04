import type { ActiveDebuff, MobDrop } from '../../types';
import DebuffBadge from './DebuffBadge';
import { MOB_DROP_RARITY_COLOR } from './zoneConstants';
import { formatMatName } from './zoneHelpers';

export default function MobDisplay({ mobName, mobCurrentHp, mobMaxHp, bossIn, swingProgress, signatureDrop, activeDebuffs }: {
  mobName: string; mobCurrentHp: number; mobMaxHp: number; bossIn: number; swingProgress: number;
  signatureDrop?: MobDrop; activeDebuffs: ActiveDebuff[];
}) {
  const mobHpPct = mobMaxHp > 0 ? Math.max(0, Math.min(100, (mobCurrentHp / mobMaxHp) * 100)) : 0;
  const hasDebuffs = activeDebuffs.length > 0;
  return (
    <div
      className={`bg-gray-800/60 rounded-lg border p-2 ${hasDebuffs ? 'border-red-500/40' : 'border-gray-700'}`}
      style={hasDebuffs ? { animation: 'debuff-glow 2s ease-in-out infinite' } : undefined}
    >
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-200 font-semibold">{mobName}</span>
        <div className="flex items-center gap-2">
          {signatureDrop && (
            <span className={`${MOB_DROP_RARITY_COLOR[signatureDrop.rarity]} text-[10px]`}
                  title={`Drops: ${formatMatName(signatureDrop.materialId)} (${Math.round(signatureDrop.chance * 100)}%)`}>
              {formatMatName(signatureDrop.materialId)}
            </span>
          )}
          <span className="text-gray-400">Boss in {bossIn}</span>
        </div>
      </div>
      {hasDebuffs && (
        <div className="flex flex-wrap gap-0.5 mb-0.5">
          {activeDebuffs.map(d => <DebuffBadge key={d.debuffId} debuff={d} />)}
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full transition-all duration-200"
             style={{ width: `${mobHpPct}%` }} />
      </div>
      {/* Enemy swing timer */}
      <div className="mt-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500/80 rounded-full transition-all duration-200"
             style={{ width: `${Math.max(0, Math.min(1, swingProgress)) * 100}%` }} />
      </div>
    </div>
  );
}

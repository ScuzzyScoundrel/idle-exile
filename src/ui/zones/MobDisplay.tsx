import type { ActiveDebuff, MobDrop, RareAffixId } from '../../types';
import DebuffBadge from './DebuffBadge';
import { MOB_DROP_RARITY_COLOR } from './zoneConstants';
import { formatMatName } from './zoneHelpers';
import { RARE_AFFIX_DEFS } from '../../data/rareAffixes';

export default function MobDisplay({ mobName, mobCurrentHp, mobMaxHp, bossIn, swingProgress, signatureDrop, activeDebuffs, packSize, rareAffixes }: {
  mobName: string; mobCurrentHp: number; mobMaxHp: number; bossIn: number; swingProgress: number;
  signatureDrop?: MobDrop; activeDebuffs: ActiveDebuff[];
  packSize?: number; rareAffixes?: RareAffixId[];
}) {
  const mobHpPct = mobMaxHp > 0 ? Math.max(0, Math.min(100, (mobCurrentHp / mobMaxHp) * 100)) : 0;
  const hasDebuffs = activeDebuffs.length > 0;
  const isRare = rareAffixes && rareAffixes.length > 0;
  const displayPackSize = packSize ?? 1;

  // Build display name
  const namePrefix = isRare ? '\u2605 ' : '';
  const packSuffix = displayPackSize > 1 ? ` x${displayPackSize}` : '';
  const displayName = `${namePrefix}${mobName}${packSuffix}`;

  // Border style: rare > debuff > normal
  const borderClass = isRare
    ? 'border-yellow-500/60 shadow-lg shadow-yellow-500/20'
    : hasDebuffs ? 'border-red-500/40' : 'border-gray-700';

  return (
    <div
      className={`bg-gray-800/60 rounded-lg border p-2 ${borderClass}`}
      style={hasDebuffs && !isRare ? { animation: 'debuff-glow 2s ease-in-out infinite' } : undefined}
    >
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-semibold ${isRare ? 'text-yellow-300' : 'text-gray-200'}`}>{displayName}</span>
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
      {/* Rare affix badges */}
      {isRare && (
        <div className="flex flex-wrap gap-1 mb-0.5">
          {rareAffixes!.map(id => {
            const def = RARE_AFFIX_DEFS[id];
            return (
              <span key={id} className={`${def.color} text-[9px] font-semibold bg-gray-900/60 rounded-full px-1.5`}
                    title={def.description}>
                {def.name}
              </span>
            );
          })}
        </div>
      )}
      {hasDebuffs && (
        <div className="flex flex-wrap gap-0.5 mb-0.5">
          {activeDebuffs.map(d => <DebuffBadge key={d.debuffId} debuff={d} />)}
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-200 ${isRare ? 'bg-yellow-500' : 'bg-red-500'}`}
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

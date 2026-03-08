import type { MobInPack, MobDrop } from '../../types';
import DebuffBadge from './DebuffBadge';
import { MOB_DROP_RARITY_COLOR } from './zoneConstants';
import { formatMatName } from './zoneHelpers';
import { RARE_AFFIX_DEFS } from '../../data/rareAffixes';
import { ZONE_ATTACK_INTERVAL } from '../../data/balance';

export default function MobDisplay({ mobName, mobs, bossIn, signatureDrop }: {
  mobName: string;
  mobs: MobInPack[];
  bossIn: number;
  signatureDrop?: MobDrop;
}) {
  const packSize = mobs.length;
  const hasAnyRare = mobs.some(m => m.rare !== null);
  const hasAnyDebuffs = mobs.some(m => m.debuffs.length > 0);

  // Build display name — show pack count, star if any rare
  const namePrefix = hasAnyRare ? '\u2605 ' : '';
  const packCount = packSize > 1 ? ` (${packSize})` : '';
  const displayName = `${namePrefix}${mobName}${packCount}`;

  // Border style: rare > debuff > normal
  const borderClass = hasAnyRare
    ? 'border-yellow-500/60 shadow-lg shadow-yellow-500/20'
    : hasAnyDebuffs ? 'border-red-500/40' : 'border-gray-700';

  const nowMs = Date.now();

  return (
    <div
      className={`bg-gray-800/60 rounded-lg border p-2 ${borderClass}`}
      style={hasAnyDebuffs && !hasAnyRare ? { animation: 'debuff-glow 2s ease-in-out infinite' } : undefined}
    >
      {/* Header row */}
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-semibold ${hasAnyRare ? 'text-yellow-300' : 'text-gray-200'}`}>{displayName}</span>
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

      {/* Per-mob cards */}
      <div className="space-y-1">
        {mobs.map((mob, i) => {
          const isFront = i === 0;
          const isRare = mob.rare !== null;
          const pct = mob.maxHp > 0 ? Math.max(0, Math.min(100, (mob.hp / mob.maxHp) * 100)) : 0;
          const barColor = isRare ? (isFront ? 'bg-yellow-500' : 'bg-yellow-500/70') : (isFront ? 'bg-red-500' : 'bg-red-500/70');

          // Per-mob swing timer
          const mobAtkInterval = ZONE_ATTACK_INTERVAL * (mob.rare?.combinedAtkSpeedMult ?? 1) * 1000;
          const swingProgress = mob.nextAttackAt > 0
            ? 1 - Math.max(0, Math.min(1, (mob.nextAttackAt - nowMs) / mobAtkInterval))
            : 0;

          return (
            <div key={i} className={isRare && packSize > 1 ? 'border-l-2 border-yellow-500/40 pl-1' : ''}>
              {/* Row 1: marker + affix badges */}
              <div className="flex items-center gap-1 flex-wrap">
                {packSize > 1 && (
                  <span className="text-[9px] w-3 text-right shrink-0">
                    {isFront
                      ? <span className="text-yellow-400" title="Targeted">{'\u25B6'}</span>
                      : <span className="text-gray-600">{'\u00B7'}</span>}
                  </span>
                )}
                {isRare && (
                  <>
                    <span className="text-yellow-300 text-[9px]">{'\u2605'}</span>
                    {mob.rare!.affixes.map(id => {
                      const adef = RARE_AFFIX_DEFS[id];
                      return (
                        <span key={id} className={`${adef.color} text-[9px] font-semibold bg-gray-900/60 rounded-full px-1`}
                              title={adef.description}>
                          {adef.name}
                        </span>
                      );
                    })}
                  </>
                )}
              </div>
              {/* Row 2: debuff badges (own row for readability) */}
              {mob.debuffs.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap ml-0">
                  {packSize > 1 && <span className="w-3 shrink-0" />}
                  {mob.debuffs.map(d => (
                    <DebuffBadge key={d.debuffId} debuff={d} />
                  ))}
                </div>
              )}
              {/* HP bar */}
              <div className="flex items-center gap-1">
                {packSize > 1 && <span className="w-3 shrink-0" />}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex-1">
                  <div className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                       style={{ width: `${pct}%` }} />
                </div>
              </div>
              {/* Per-mob swing timer */}
              <div className="flex items-center gap-1">
                {packSize > 1 && <span className="w-3 shrink-0" />}
                <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden flex-1">
                  <div className="h-full bg-orange-500/80 rounded-full transition-all duration-200"
                       style={{ width: `${Math.max(0, Math.min(1, swingProgress)) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

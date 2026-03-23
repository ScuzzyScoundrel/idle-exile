import type { ZoneDef } from '../../types';
import { BAND_BORDERS, MASTERY_ICONS } from './zoneConstants';

interface ZoneNodeProps {
  zone: ZoneDef;
  isUnlocked: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  masteryTier: number;
  isInvaded: boolean;
  onSelect: (zoneId: string) => void;
}

const MASTERY_TIERS = [
  { key: 'bronze', threshold: 1 },
  { key: 'silver', threshold: 2 },
  { key: 'gold', threshold: 3 },
] as const;

export default function ZoneNode({ zone, isUnlocked, isCurrent, isSelected, masteryTier, isInvaded, onSelect }: ZoneNodeProps) {
  const isBoss = zone.bandIndex === 4;
  const size = isBoss ? 'w-[72px] h-[72px]' : 'w-14 h-14';
  const borderColor = BAND_BORDERS[zone.band] ?? 'border-gray-600';

  return (
    <div className="flex flex-col items-center gap-1 w-20">
      <button
        onClick={() => isUnlocked && onSelect(zone.id)}
        disabled={!isUnlocked}
        className={`
          ${size} rounded-full border-[3px] transition-all relative overflow-hidden shrink-0
          ${borderColor}
          ${!isUnlocked ? 'grayscale brightness-[0.4] cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110 active:scale-95'}
          ${isCurrent ? 'ring-[3px] ring-yellow-400 animate-zone-current' : ''}
          ${isSelected && !isCurrent ? 'ring-2 ring-yellow-400/70' : ''}
          ${isInvaded ? 'ring-2 ring-purple-500 animate-invasion-node' : ''}
        `}
      >
        {/* Zone image as background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(/images/zones/${zone.id}.webp)` }}
        />
        {/* Boss crown badge */}
        {isBoss && isUnlocked && (
          <span className="absolute -top-1 -right-0.5 text-xs drop-shadow-lg z-10">{'\uD83D\uDC51'}</span>
        )}
        {/* "You are here" diamond */}
        {isCurrent && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-yellow-400 rotate-45 border border-black/60 z-10" />
        )}
      </button>

      {/* Zone name */}
      <span className={`text-[9px] font-semibold text-center leading-tight
        ${isCurrent ? 'text-yellow-400' : isUnlocked ? 'text-gray-300' : 'text-gray-600'}`}>
        {zone.name}
      </span>

      {/* Mastery pips */}
      {isUnlocked && masteryTier > 0 && (
        <div className="flex gap-0.5 -mt-0.5">
          {MASTERY_TIERS.map(t => {
            const earned = masteryTier >= t.threshold;
            const meta = MASTERY_ICONS[t.key];
            return (
              <span key={t.key} className={`text-[9px] ${earned ? meta.cls : 'opacity-20'}`}>
                {meta.icon}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

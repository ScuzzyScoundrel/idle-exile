import { useRef, useEffect } from 'react';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { BAND_GRADIENTS, BAND_EMOJIS, BAND_BORDERS, MASTERY_ICONS } from './zoneConstants';
import { getZoneInvasion } from '../../engine/invasions';
import type { InvasionState } from '../../engine/invasions';
import ZoneDetail from './ZoneDetail';

interface WorldMapProps {
  currentZoneId: string | null;
  selectedZone: string;
  selectedBand: number;
  totalZoneClears: Record<string, number>;
  zoneMasteryClaimed: Record<string, number>;
  invasionState: InvasionState;
  onSelectZone: (zoneId: string) => void;
  onSelectBand: (band: number) => void;
  onTravel: (zoneId: string) => void;
  expandedZone: string | null;
  onExpandZone: (zoneId: string | null) => void;
  targetedMobId: string | null;
  mobKillCounts: Record<string, number>;
  onTargetMob: (id: string | null) => void;
}

export default function WorldMap({
  currentZoneId, selectedBand,
  totalZoneClears, zoneMasteryClaimed, invasionState,
  onSelectZone, onSelectBand, onTravel,
  expandedZone, onExpandZone,
  targetedMobId, mobKillCounts, onTargetMob,
}: WorldMapProps) {
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentRef.current) currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const bands = [1, 2, 3, 4, 5, 6];
  const bandZones = ZONE_DEFS.filter(z => z.band === selectedBand);
  const borderCls = BAND_BORDERS[selectedBand] ?? 'border-gray-600';

  const isZoneUnlocked = (zone: typeof ZONE_DEFS[0]) => {
    if (!zone.unlockRequirement) return true;
    return (totalZoneClears[zone.unlockRequirement] ?? 0) > 0;
  };

  return (
    <div className="space-y-2">
      {/* Band filter pills */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {bands.map(band => (
          <button
            key={band}
            onClick={() => onSelectBand(band)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedBand === band
                ? `${BAND_GRADIENTS[band]} text-white ring-1 ring-yellow-400/50`
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {BAND_EMOJIS[band]} Band {band}
          </button>
        ))}
      </div>

      {/* Selected band header */}
      <div className={`rounded-lg px-3 py-2 ${BAND_GRADIENTS[selectedBand]}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{BAND_EMOJIS[selectedBand]}</span>
          <div>
            <div className="text-sm font-bold text-white heading-fantasy">{BAND_NAMES[selectedBand]}</div>
            <div className="text-[10px] text-gray-300">
              iLvl {bandZones[0]?.iLvlMin}&ndash;{bandZones[bandZones.length - 1]?.iLvlMax}
            </div>
          </div>
        </div>
      </div>

      {/* Zone rows for selected band only */}
      <div className="space-y-1.5">
        {bandZones.map(zone => {
          const unlocked = isZoneUnlocked(zone);
          const isCurrent = currentZoneId === zone.id;
          const isSelected = expandedZone === zone.id;
          const isInvaded = !!getZoneInvasion(invasionState, zone.id, zone.band);
          const isBoss = zone.bandIndex === 4;
          const mastery = zoneMasteryClaimed[zone.id] ?? 0;
          const clears = totalZoneClears[zone.id] ?? 0;

          return (
            <div key={zone.id} ref={isCurrent ? currentRef : undefined}
              className={`rounded-lg ${isSelected && unlocked
                ? 'panel-stone'
                : 'bg-gray-950/60 backdrop-blur-sm border border-white/5'}`}>
              {/* Zone row */}
              <button
                onClick={() => {
                  if (!unlocked) return;
                  onSelectZone(zone.id);
                  onExpandZone(isSelected ? null : zone.id);
                }}
                disabled={!unlocked}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all
                  ${!unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}
                  ${isCurrent
                    ? 'bg-yellow-900/20 ring-1 ring-yellow-500/40'
                    : isInvaded
                      ? 'bg-purple-950/20'
                      : ''
                  }
                `}
              >
                {/* Zone thumbnail */}
                <div className={`shrink-0 ${isBoss ? 'w-14 h-14' : 'w-11 h-11'} rounded-lg overflow-hidden border-2 ${borderCls}
                  ${!unlocked ? 'grayscale' : ''}`}>
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(/images/zones/${zone.id}.webp)` }}
                  />
                </div>

                {/* Zone info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold truncate
                      ${isCurrent ? 'text-yellow-400' : unlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                      {zone.name}
                    </span>
                    {isBoss && <span className="text-xs">{'\uD83D\uDC51'}</span>}
                    {isInvaded && <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse inline-block" />}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    iLvl {zone.iLvlMin}&ndash;{zone.iLvlMax}
                    {clears > 0 && <span className="ml-2">{clears} clears</span>}
                  </div>
                </div>

                {/* Right side: mastery + current badge */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {mastery > 0 && (
                    <div className="flex gap-0.5">
                      {(['bronze', 'silver', 'gold'] as const).map((tier, i) => (
                        <span key={tier} className={`text-[10px] ${mastery > i ? MASTERY_ICONS[tier].cls : 'opacity-20'}`}>
                          {MASTERY_ICONS[tier].icon}
                        </span>
                      ))}
                    </div>
                  )}
                  {isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-800/60 text-yellow-300 font-bold">HERE</span>
                  )}
                </div>
              </button>

              {/* Expanded detail — inline below zone row */}
              {isSelected && unlocked && (
                <ZoneDetail
                  zone={zone}
                  isCurrent={isCurrent}
                  masteryTier={mastery}
                  zoneClears={clears}
                  onTravel={onTravel}
                  targetedMobId={targetedMobId}
                  mobKillCounts={mobKillCounts}
                  onTargetMob={onTargetMob}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

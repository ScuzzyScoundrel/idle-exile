import { ZONE_DEFS } from '../../data/zones';
import { getGatheringSkillRequirement } from '../../engine/gathering';
import { MASTERY_MILESTONES } from '../../data/balance';
import type { ZoneDef, IdleMode, GatheringProfession } from '../../types';
import {
  BAND_GRADIENTS, BAND_BORDERS,
  HAZARD_COLORS, HAZARD_ICONS, HAZARD_STAT_MAP,
  PROFESSION_ICONS, MASTERY_ICONS,
} from './zoneConstants';

export interface ZoneCardProps {
  zone: ZoneDef;
  band: number;
  isBoss: boolean;
  isSelected: boolean;
  isActive: boolean;
  isUnlocked: boolean;
  hasMastery: boolean;
  playerStats: Record<string, number>;
  charLevel: number;
  idleMode: IdleMode;
  selectedProfession: GatheringProfession | null;
  gatheringSkillLevel: number;
  zoneClears: number;
  zoneMasteryTier: number;
  isInvaded: boolean;
  invasionEndTime: number;
  onSelect: () => void;
}

export default function ZoneCard({
  zone, band, isBoss, isSelected, isActive, isUnlocked, hasMastery,
  playerStats, charLevel, idleMode, selectedProfession, gatheringSkillLevel,
  zoneClears, zoneMasteryTier, isInvaded, invasionEndTime, onSelect,
}: ZoneCardProps) {
  const underleveled = charLevel < zone.recommendedLevel;
  const skillReq = getGatheringSkillRequirement(zone.band);
  const skillTooLow = idleMode === 'gathering' && selectedProfession && gatheringSkillLevel < skillReq;
  return (
    <button
      onClick={onSelect}
      disabled={!isUnlocked}
      className={`
        relative w-full text-left rounded-lg border overflow-hidden transition-all
        h-36 ${isBoss ? 'border-2' : ''}
        ${!isUnlocked
          ? 'border-gray-700 opacity-40 cursor-not-allowed'
          : isInvaded
            ? 'border-purple-500 ring-2 ring-purple-500/50'
            : isSelected
              ? 'border-yellow-400 ring-2 ring-yellow-400/50'
              : `${BAND_BORDERS[band]} hover:brightness-125`}
      `}
      style={isInvaded && isUnlocked ? { animation: 'invasion-glow 2s ease-in-out infinite' } : undefined}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 ${BAND_GRADIENTS[band]}`} />
      {/* Zone background image (falls back gracefully if missing) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
        style={{ backgroundImage: `url(/images/zones/${zone.id}.webp)` }}
      />
      {/* Dark overlay for readability */}
      <div className={`absolute inset-0 ${skillTooLow ? 'bg-red-950/50' : 'bg-black/30'}`} />

      {/* Card content */}
      <div className="relative h-full flex flex-col justify-between p-3">
        {/* Top: name + hazards + mastery + level badge */}
        <div>
          <div className="flex items-center gap-1.5">
            {isBoss && <span className="text-base" title="Boss Zone">{'\u{1F451}'}</span>}
            {isActive && <span className="text-green-400 text-sm" title="Running">{'\u26A1'}</span>}
            <span className={`font-bold text-sm flex-1 ${isBoss ? 'text-yellow-300' : 'text-white'}`}>
              {zone.name}
            </span>
            {/* Level badge */}
            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
              underleveled ? 'bg-red-900/60 text-red-300' : 'bg-black/30 text-gray-400'
            }`}>
              Lv.{zone.recommendedLevel}
            </span>
            {hasMastery && idleMode === 'combat' && (
              <span className="text-green-400 text-xs font-bold px-1 bg-green-400/10 rounded" title="Zone Mastery">{'\u2713'}</span>
            )}
            {idleMode === 'combat' && zone.hazards.map((h, i) => {
              const resist = playerStats[HAZARD_STAT_MAP[h.type]] ?? 0;
              const below = resist < h.threshold;
              return (
                <span
                  key={i}
                  className={`text-sm ${below ? HAZARD_COLORS[h.type] + ' animate-pulse' : 'opacity-40'}`}
                  title={`${h.type} ${h.threshold}% (you: ${Math.floor(resist)}%)`}
                >
                  {HAZARD_ICONS[h.type]}
                </span>
              );
            })}
          </div>
          {underleveled && (
            <div className="text-xs text-red-400 mt-0.5">Underleveled</div>
          )}
          {skillTooLow && (
            <div className="text-xs text-red-400 mt-0.5">Skill too low (need {skillReq})</div>
          )}
          {!isUnlocked && zone.unlockRequirement && (
            <div className="text-xs text-gray-400 mt-0.5">
              Defeat the boss of {ZONE_DEFS.find(z => z.id === zone.unlockRequirement)?.name ?? zone.unlockRequirement} to unlock
            </div>
          )}
        </div>

        {/* Middle: description or invasion flavor */}
        {isInvaded && isUnlocked ? (
          <div className="text-xs text-purple-300 leading-snug italic">
            Void energies surge through this zone...
            <span className="block text-purple-400 font-semibold mt-0.5">
              {(() => {
                const remaining = Math.max(0, invasionEndTime - Date.now());
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                return `${mins}:${secs.toString().padStart(2, '0')} remaining`;
              })()}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-300/80 leading-snug">{!isUnlocked ? '???' : zone.description}</div>
        )}

        {/* Mastery milestones */}
        {isUnlocked && idleMode === 'combat' && (
          <div className="flex items-center gap-1.5">
            {MASTERY_MILESTONES.map(m => {
              const claimed = zoneMasteryTier >= m.threshold;
              const nextTarget = !claimed && zoneClears < m.threshold;
              return (
                <span
                  key={m.threshold}
                  className={`text-xs ${claimed ? MASTERY_ICONS[m.tier].cls : 'text-gray-600'}`}
                  title={`${m.tier}: ${m.threshold} clears${claimed ? ' (claimed!)' : ` (${zoneClears}/${m.threshold})`}`}
                >
                  {MASTERY_ICONS[m.tier].icon}
                  {nextTarget && <span className="text-[9px] text-gray-500 ml-0.5">{zoneClears}/{m.threshold}</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* Bottom: iLvl + materials + gathering types */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="bg-black/30 rounded px-1.5 py-0.5">iLvl {zone.iLvlMin}-{zone.iLvlMax}</span>
          {idleMode === 'gathering' ? (
            <span className="flex gap-1">
              {zone.gatheringTypes.map(gt => (
                <span key={gt} className={selectedProfession === gt ? 'text-yellow-300' : ''} title={gt}>
                  {PROFESSION_ICONS[gt]}
                </span>
              ))}
            </span>
          ) : (
            <span className="truncate text-xs">{zone.materialDrops.map(m => m.replace(/_/g, ' ')).join(', ')}</span>
          )}
        </div>
      </div>
    </button>
  );
}

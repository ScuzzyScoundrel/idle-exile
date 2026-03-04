import { useState } from 'react';
import type { ZoneDef, IdleMode, GatheringProfession, ResolvedStats } from '../../types';
import { checkZoneMastery } from '../../engine/zones';
import type { InvasionState } from '../../engine/invasions';
import { getZoneInvasion } from '../../engine/invasions';
import { BAND_GRADIENTS, BAND_EMOJIS } from './zoneConstants';
import ZoneCard from './ZoneCard';

export interface ZoneCardGridProps {
  gridZones: ZoneDef[];
  bossZone: ZoneDef | null;
  selectedBand: number;
  selectedZone: string;
  isRunning: boolean;
  currentZoneId: string | null;
  idleMode: IdleMode;
  characterStats: ResolvedStats;
  charLevel: number;
  selectedProfession: GatheringProfession | null;
  gatheringSkillLevel: number;
  totalZoneClears: Record<string, number>;
  zoneMasteryClaimed: Record<string, number>;
  invasionState: InvasionState;
  bossKillCounts: Record<string, number>;
  onSelectZone: (id: string) => void;
}

export default function ZoneCardGrid({
  gridZones, bossZone, selectedBand, selectedZone, isRunning, currentZoneId,
  idleMode, characterStats, charLevel, selectedProfession, gatheringSkillLevel,
  totalZoneClears, zoneMasteryClaimed, invasionState, bossKillCounts, onSelectZone,
}: ZoneCardGridProps) {
  const [expanded, setExpanded] = useState(true);

  const isZoneUnlocked = (z: ZoneDef): boolean => {
    if (!z.unlockRequirement) return true;
    return (bossKillCounts[z.unlockRequirement] ?? 0) >= 1;
  };

  // Auto-collapse: when running, show a compact bar with active zone + expand toggle
  if (isRunning && !expanded) {
    const activeZone = [...gridZones, bossZone].find(z => z && z.id === currentZoneId);
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${BAND_GRADIENTS[selectedBand]} text-white/90 hover:brightness-110`}
      >
        <span>{BAND_EMOJIS[selectedBand]}</span>
        <span className="truncate">{activeZone?.name ?? 'Zone'}</span>
        <span className="ml-auto text-xs opacity-70">tap to expand</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {isRunning && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full text-xs text-gray-500 hover:text-gray-300 text-right pr-1 transition-colors"
        >
          collapse zones
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {gridZones.map((z) => (
          <ZoneCard
            key={z.id}
            zone={z}
            band={selectedBand}
            isBoss={false}
            isSelected={selectedZone === z.id}
            isActive={isRunning && currentZoneId === z.id}
            isUnlocked={isZoneUnlocked(z)}
            hasMastery={z.hazards.length > 0 && checkZoneMastery(characterStats, z)}
            playerStats={characterStats as Record<string, number>}
            charLevel={charLevel}
            idleMode={idleMode}
            selectedProfession={selectedProfession}
            gatheringSkillLevel={gatheringSkillLevel}
            zoneClears={totalZoneClears[z.id] ?? 0}
            zoneMasteryTier={zoneMasteryClaimed[z.id] ?? 0}
            isInvaded={!!getZoneInvasion(invasionState, z.id, z.band)}
            invasionEndTime={getZoneInvasion(invasionState, z.id, z.band)?.endTime ?? 0}
            onSelect={() => isZoneUnlocked(z) && onSelectZone(z.id)}
          />
        ))}
      </div>

      {bossZone && (
        <ZoneCard
          zone={bossZone}
          band={selectedBand}
          isBoss={true}
          isSelected={selectedZone === bossZone.id}
          isActive={isRunning && currentZoneId === bossZone.id}
          isUnlocked={isZoneUnlocked(bossZone)}
          hasMastery={bossZone.hazards.length > 0 && checkZoneMastery(characterStats, bossZone)}
          playerStats={characterStats}
          charLevel={charLevel}
          idleMode={idleMode}
          selectedProfession={selectedProfession}
          gatheringSkillLevel={gatheringSkillLevel}
          zoneClears={totalZoneClears[bossZone.id] ?? 0}
          zoneMasteryTier={zoneMasteryClaimed[bossZone.id] ?? 0}
          isInvaded={!!getZoneInvasion(invasionState, bossZone.id, bossZone.band)}
          invasionEndTime={getZoneInvasion(invasionState, bossZone.id, bossZone.band)?.endTime ?? 0}
          onSelect={() => isZoneUnlocked(bossZone) && onSelectZone(bossZone.id)}
        />
      )}
    </div>
  );
}

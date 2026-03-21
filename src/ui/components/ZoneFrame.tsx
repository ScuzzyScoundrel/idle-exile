/**
 * ZoneFrame — Renders transparent PNG header/footer overlays
 * that sit ABOVE all content, creating a 3D border effect.
 *
 * Uses biome kit assets: 8 kits × 2 strips = 16 PNGs total.
 * Per-zone variation via CSS hue-rotate + brightness filters.
 */

import { useMemo } from 'react';
import { useGameStore } from '../../store';


// Zone → biome kit mapping
const ZONE_TO_KIT: Record<string, string> = {
  // Forest
  ashwood_thicket: 'forest', stillwater_meadow: 'forest', mossback_creek: 'forest',
  thistlewood_grove: 'forest', silkveil_canopy: 'forest',
  // Cave
  dustvein_hollow: 'cave', glintstone_caverns: 'cave', dreadmaw_caverns: 'cave',
  // Swamp
  bogmire_marsh: 'swamp', shimmerfen_bog: 'swamp', rothollow_thicket: 'swamp',
  // Mountain
  ironcrest_ridge: 'mountain', windsworn_steppe: 'mountain',
  thornwall_basin: 'mountain', stormveil_heights: 'mountain',
  // Volcanic
  emberpeak_caldera: 'volcanic', obsidian_forge: 'volcanic',
  scorched_plateau: 'volcanic', ashenmaw_crater: 'volcanic',
  // Ice
  frostmere_depths: 'ice', wraithwood: 'ice', drowned_abyss: 'ice',
  // Crystal
  celestine_spire: 'crystal', starfall_basin: 'crystal', hollow_throne: 'crystal',
  // Void
  venomspire_ruins: 'void', consuming_dark: 'void', titans_graveyard: 'void',
  eternal_storm: 'void', worlds_edge: 'void',
};

// Per-zone hue/brightness tweaks within a kit for variety
const ZONE_TWEAKS: Record<string, { hue: number; brightness: number }> = {
  // Forest variations — deeper/lighter greens
  ashwood_thicket:    { hue: 0,   brightness: 1.0 },
  stillwater_meadow:  { hue: 10,  brightness: 1.1 },
  mossback_creek:     { hue: -10, brightness: 0.9 },
  thistlewood_grove:  { hue: -20, brightness: 0.85 },
  silkveil_canopy:    { hue: 15,  brightness: 1.05 },
  // Cave variations
  dustvein_hollow:    { hue: 0,   brightness: 0.9 },
  glintstone_caverns: { hue: 30,  brightness: 1.2 },  // bluer, crystal glow
  dreadmaw_caverns:   { hue: -15, brightness: 0.7 },  // darker
  // Swamp variations
  bogmire_marsh:      { hue: 0,   brightness: 1.0 },
  shimmerfen_bog:     { hue: 20,  brightness: 1.15 }, // more luminescent
  rothollow_thicket:  { hue: -30, brightness: 0.8 },  // decayed, darker
  // Mountain
  ironcrest_ridge:    { hue: 0,   brightness: 1.0 },
  windsworn_steppe:   { hue: 15,  brightness: 1.1 },
  thornwall_basin:    { hue: -10, brightness: 0.9 },
  stormveil_heights:  { hue: 30,  brightness: 1.15 }, // stormier blue
  // Volcanic
  emberpeak_caldera:  { hue: 0,   brightness: 1.0 },
  obsidian_forge:     { hue: -20, brightness: 0.8 },  // darker, more obsidian
  scorched_plateau:   { hue: 15,  brightness: 1.2 },  // sun-blasted
  ashenmaw_crater:    { hue: -10, brightness: 0.9 },
  // Ice
  frostmere_depths:   { hue: 0,   brightness: 1.0 },
  wraithwood:         { hue: -20, brightness: 0.85 }, // haunted, colder
  drowned_abyss:      { hue: 10,  brightness: 0.8 },  // deep water
  // Crystal
  celestine_spire:    { hue: 0,   brightness: 1.1 },
  starfall_basin:     { hue: 30,  brightness: 1.2 },  // starlit, brighter
  hollow_throne:      { hue: -20, brightness: 0.75 }, // darker, corrupted
  // Void
  venomspire_ruins:   { hue: 20,  brightness: 0.9 },  // poison green tint
  consuming_dark:     { hue: 0,   brightness: 0.6 },  // darkest
  titans_graveyard:   { hue: -15, brightness: 0.85 },
  eternal_storm:      { hue: 40,  brightness: 1.1 },  // electric blue
  worlds_edge:        { hue: 10,  brightness: 0.7 },
};

export function ZoneFrame() {
  const currentZoneId = useGameStore((s) => s.currentZoneId);
  const idleStartTime = useGameStore((s) => s.idleStartTime);

  const frameData = useMemo(() => {
    if (!currentZoneId || !idleStartTime) return null;

    const kit = ZONE_TO_KIT[currentZoneId];
    if (!kit) return null;

    const tweaks = ZONE_TWEAKS[currentZoneId] ?? { hue: 0, brightness: 1.0 };
    const filter = `hue-rotate(${tweaks.hue}deg) brightness(${tweaks.brightness})`;

    return {
      headerSrc: `/images/zones/frames/processed/${kit}_header.png`,
      footerSrc: `/images/zones/frames/processed/${kit}_footer.png`,
      filter,
      kit,
    };
  }, [currentZoneId, idleStartTime]);

  if (!frameData) return null;

  return (
    <>
      {/* Header overlay — sits above EVERYTHING */}
      <div
        className="zone-frame-header"
        style={{
          backgroundImage: `url(${frameData.headerSrc})`,
          filter: frameData.filter,
        }}
      />
      {/* Footer overlay — sits above content, behind nav buttons */}
      <div
        className="zone-frame-footer"
        style={{
          backgroundImage: `url(${frameData.footerSrc})`,
          filter: frameData.filter,
        }}
      />
    </>
  );
}

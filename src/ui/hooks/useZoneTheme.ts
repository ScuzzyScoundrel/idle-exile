import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';

/**
 * Band palettes — RGB channel triplets for CSS custom property injection.
 * 18 properties per band: 5 theme + 13 panel/body/decorative.
 */
interface BandPalette {
  // Existing theme vars
  accent: string;
  accentMuted: string;
  bgTint: string;
  progress: string;
  textAccent: string;
  // Panel chrome
  panelBg1: string;
  panelBg2: string;
  panelBg3: string;
  panelBorder: string;
  panelBorderLight: string;
  panelBorderDark: string;
  panelHighlight: string;
  panelShadow: string;
  // Body atmosphere
  bodyBg: string;
  bodyRadial1: string;
  bodyRadial2: string;
  // Decorative
  glowAmbient: string;
  dividerColor: string;
}

// @ts-ignore — kept for future use when per-band theming is re-enabled
const _BAND_PALETTES: Record<number, BandPalette> = {
  1: { // Greenlands — bright forest, warm sunlit canopy
    accent:      '34 197 94',
    accentMuted: '22 101 52',
    bgTint:      '8 32 18',
    progress:    '74 222 128',
    textAccent:  '134 239 172',
    panelBg1:    '30 42 34',
    panelBg2:    '22 34 26',
    panelBg3:    '16 26 20',
    panelBorder: '48 72 52',
    panelBorderLight: '68 100 72',
    panelBorderDark:  '18 30 20',
    panelHighlight:   '140 200 130',
    panelShadow:      '6 12 8',
    bodyBg:       '10 18 12',
    bodyRadial1:  '18 42 22',
    bodyRadial2:  '8 22 10',
    glowAmbient:  '74 222 128',
    dividerColor: '52 80 56',
  },
  2: { // Frontier — slate blue, cold steel
    accent:      '14 165 233',
    accentMuted: '21 94 117',
    bgTint:      '8 51 68',
    progress:    '34 211 238',
    textAccent:  '103 232 249',
    panelBg1:    '30 34 52',
    panelBg2:    '24 28 44',
    panelBg3:    '18 22 38',
    panelBorder: '46 52 72',
    panelBorderLight: '60 68 92',
    panelBorderDark:  '22 26 40',
    panelHighlight:   '100 140 200',
    panelShadow:      '6 8 16',
    bodyBg:       '8 10 16',
    bodyRadial1:  '18 24 50',
    bodyRadial2:  '10 14 30',
    glowAmbient:  '103 232 249',
    dividerColor: '50 58 80',
  },
  3: { // Contested — scorched red-brown, ember
    accent:      '239 68 68',
    accentMuted: '154 52 18',
    bgTint:      '69 10 10',
    progress:    '249 115 22',
    textAccent:  '252 165 165',
    panelBg1:    '48 28 22',
    panelBg2:    '38 20 16',
    panelBg3:    '28 14 10',
    panelBorder: '72 40 28',
    panelBorderLight: '90 52 34',
    panelBorderDark:  '34 18 12',
    panelHighlight:   '200 100 60',
    panelShadow:      '14 6 2',
    bodyBg:       '14 6 4',
    bodyRadial1:  '50 18 8',
    bodyRadial2:  '30 10 5',
    glowAmbient:  '249 115 22',
    dividerColor: '80 44 28',
  },
  4: { // Dark Reaches — violet-stone, void purple
    accent:      '148 163 184',
    accentMuted: '55 65 81',
    bgTint:      '23 8 53',
    progress:    '168 85 247',
    textAccent:  '203 213 225',
    panelBg1:    '32 24 52',
    panelBg2:    '24 18 42',
    panelBg3:    '18 12 34',
    panelBorder: '50 38 72',
    panelBorderLight: '64 48 90',
    panelBorderDark:  '24 16 38',
    panelHighlight:   '140 100 200',
    panelShadow:      '10 4 20',
    bodyBg:       '8 6 18',
    bodyRadial1:  '22 12 48',
    bodyRadial2:  '12 6 28',
    glowAmbient:  '168 85 247',
    dividerColor: '55 42 78',
  },
  5: { // Shattered Realm — deep indigo, electric
    accent:      '129 140 248',
    accentMuted: '67 56 202',
    bgTint:      '30 27 75',
    progress:    '139 92 246',
    textAccent:  '165 180 252',
    panelBg1:    '26 26 56',
    panelBg2:    '20 20 46',
    panelBg3:    '14 14 38',
    panelBorder: '42 42 76',
    panelBorderLight: '56 56 96',
    panelBorderDark:  '18 18 36',
    panelHighlight:   '100 110 220',
    panelShadow:      '6 6 18',
    bodyBg:       '6 6 16',
    bodyRadial1:  '20 18 55',
    bodyRadial2:  '10 10 35',
    glowAmbient:  '129 140 248',
    dividerColor: '46 46 82',
  },
  6: { // Endlands — near-black, bone white accent
    accent:      '220 38 38',
    accentMuted: '69 10 10',
    bgTint:      '10 5 5',
    progress:    '168 85 247',
    textAccent:  '248 113 113',
    panelBg1:    '22 18 18',
    panelBg2:    '16 13 13',
    panelBg3:    '10 8 8',
    panelBorder: '38 30 30',
    panelBorderLight: '52 42 42',
    panelBorderDark:  '16 12 12',
    panelHighlight:   '180 160 150',
    panelShadow:      '4 2 2',
    bodyBg:       '4 3 3',
    bodyRadial1:  '14 8 8',
    bodyRadial2:  '8 4 4',
    glowAmbient:  '180 160 150',
    dividerColor: '42 34 34',
  },
};

// Default palette (idle / not running) — warm dark brown, candlelight
const DEFAULT_PALETTE: BandPalette = {
  accent:      '250 204 21',
  accentMuted: '55 65 81',
  bgTint:      '3 7 18',
  progress:    '168 85 247',
  textAccent:  '250 204 21',
  panelBg1:    '42 34 28',
  panelBg2:    '32 26 20',
  panelBg3:    '24 18 14',
  panelBorder: '62 48 36',
  panelBorderLight: '78 60 44',
  panelBorderDark:  '30 22 16',
  panelHighlight:   '180 140 80',
  panelShadow:      '12 8 4',
  bodyBg:       '12 10 8',
  bodyRadial1:  '30 22 12',
  bodyRadial2:  '16 10 6',
  glowAmbient:  '250 204 21',
  dividerColor: '68 54 38',
};

function applyPalette(palette: BandPalette) {
  const root = document.documentElement.style;
  // Existing theme vars
  root.setProperty('--theme-accent', palette.accent);
  root.setProperty('--theme-accent-muted', palette.accentMuted);
  root.setProperty('--theme-bg-tint', palette.bgTint);
  root.setProperty('--theme-progress', palette.progress);
  root.setProperty('--theme-text-accent', palette.textAccent);
  // Panel chrome
  root.setProperty('--panel-bg-1', palette.panelBg1);
  root.setProperty('--panel-bg-2', palette.panelBg2);
  root.setProperty('--panel-bg-3', palette.panelBg3);
  root.setProperty('--panel-border', palette.panelBorder);
  root.setProperty('--panel-border-light', palette.panelBorderLight);
  root.setProperty('--panel-border-dark', palette.panelBorderDark);
  root.setProperty('--panel-highlight', palette.panelHighlight);
  root.setProperty('--panel-shadow', palette.panelShadow);
  // Body atmosphere
  root.setProperty('--body-bg', palette.bodyBg);
  root.setProperty('--body-radial-1', palette.bodyRadial1);
  root.setProperty('--body-radial-2', palette.bodyRadial2);
  // Decorative
  root.setProperty('--glow-ambient', palette.glowAmbient);
  root.setProperty('--divider-color', palette.dividerColor);
}

// Zone ID → material texture mapping
const ZONE_MATERIAL: Record<string, string> = {
  // Band 1 — forest/nature
  ashwood_thicket:    'warm-wood',
  dustvein_hollow:    'mossy-stone',
  stillwater_meadow:  'warm-wood',
  mossback_creek:     'mossy-stone',
  thistlewood_grove:  'warm-wood',
  // Band 2 — frontier
  ironcrest_ridge:    'cold-iron',
  bogmire_marsh:      'toxic-stone',
  windsworn_steppe:   'cold-iron',
  glintstone_caverns: 'crystal-void',
  rothollow_thicket:  'blight-bark',
  // Band 3 — contested
  emberpeak_caldera:  'scorched-stone',
  silkveil_canopy:    'spider-silk',
  frostmere_depths:   'frozen-ice',
  thornwall_basin:    'blight-bark',
  shimmerfen_bog:     'toxic-stone',
  // Band 4 — dark reaches
  obsidian_forge:     'scorched-stone',
  wraithwood:         'blight-bark',
  venomspire_ruins:   'toxic-stone',
  drowned_abyss:      'deep-water',
  scorched_plateau:   'scorched-stone',
  // Band 5 — shattered realm
  celestine_spire:    'crystal-void',
  dreadmaw_caverns:   'dark-obsidian',
  stormveil_heights:  'cold-iron',
  hollow_throne:      'dark-obsidian',
  ashenmaw_crater:    'scorched-stone',
  // Band 6 — endlands
  starfall_basin:     'crystal-void',
  consuming_dark:     'dark-obsidian',
  titans_graveyard:   'bone-ash',
  eternal_storm:      'cold-iron',
  worlds_edge:        'bone-ash',
};

// Zone ID → biome kit (for header frame overlays)
const ZONE_BIOME: Record<string, string> = {
  ashwood_thicket: 'forest', stillwater_meadow: 'forest', mossback_creek: 'forest',
  thistlewood_grove: 'forest', silkveil_canopy: 'forest',
  dustvein_hollow: 'cave', glintstone_caverns: 'cave', dreadmaw_caverns: 'cave',
  bogmire_marsh: 'swamp', shimmerfen_bog: 'swamp', rothollow_thicket: 'swamp',
  ironcrest_ridge: 'mountain', windsworn_steppe: 'mountain',
  thornwall_basin: 'mountain', stormveil_heights: 'mountain',
  emberpeak_caldera: 'volcanic', obsidian_forge: 'volcanic',
  scorched_plateau: 'volcanic', ashenmaw_crater: 'volcanic',
  frostmere_depths: 'ice', wraithwood: 'ice', drowned_abyss: 'ice',
  celestine_spire: 'crystal', starfall_basin: 'crystal', hollow_throne: 'crystal',
  venomspire_ruins: 'void', consuming_dark: 'void', titans_graveyard: 'void',
  eternal_storm: 'void', worlds_edge: 'void',
};

/**
 * Sets CSS custom properties on :root based on the current zone.
 * Returns the current band number (1-6) or 0 if not running.
 */
export function useZoneTheme(): number {
  const currentZoneId = useGameStore(s => s.currentZoneId);
  const idleStartTime = useGameStore(s => s.idleStartTime);

  const isRunning = idleStartTime !== null && currentZoneId !== null;
  const zone = isRunning ? ZONE_DEFS.find(z => z.id === currentZoneId) : undefined;
  const band = zone?.band ?? 0;

  useEffect(() => {
    applyPalette(DEFAULT_PALETTE);

    // Set panel material texture based on current zone
    const root = document.documentElement.style;
    const material = currentZoneId ? ZONE_MATERIAL[currentZoneId] ?? 'warm-wood' : 'warm-wood';
    root.setProperty('--panel-material', `url(/images/textures/materials/${material}.png)`);
    // Per-zone header frame overlay — biome kit transparent PNGs
    const biome = currentZoneId ? ZONE_BIOME[currentZoneId] ?? 'forest' : 'forest';
    root.setProperty('--fg-top', `url(/images/zones/frames/processed/${biome}_header.png)`);
  }, [band, currentZoneId]);

  return band;
}

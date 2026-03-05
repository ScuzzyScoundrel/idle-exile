import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';

/**
 * Band palettes — RGB channel triplets for CSS custom property injection.
 * Keys: accent, accentMuted, bgTint, progress, textAccent
 */
const BAND_PALETTES: Record<number, {
  accent: string;
  accentMuted: string;
  bgTint: string;
  progress: string;
  textAccent: string;
}> = {
  1: { // Greenlands — emerald
    accent:      '16 185 129',   // emerald-500
    accentMuted: '6 95 70',      // emerald-800
    bgTint:      '2 44 34',      // emerald-950
    progress:    '34 197 94',    // green-500
    textAccent:  '52 211 153',   // emerald-400
  },
  2: { // Frontier — sky/cyan
    accent:      '14 165 233',   // sky-500
    accentMuted: '21 94 117',    // cyan-800
    bgTint:      '8 51 68',      // cyan-950
    progress:    '34 211 238',   // cyan-400
    textAccent:  '103 232 249',  // cyan-300
  },
  3: { // Contested — red/orange
    accent:      '239 68 68',    // red-500
    accentMuted: '154 52 18',    // orange-800
    bgTint:      '69 10 10',     // red-950
    progress:    '249 115 22',   // orange-500
    textAccent:  '252 165 165',  // red-300
  },
  4: { // Dark Reaches — slate/purple
    accent:      '148 163 184',  // slate-400
    accentMuted: '55 65 81',     // gray-700
    bgTint:      '23 8 53',      // purple-950 (approx)
    progress:    '168 85 247',   // purple-500
    textAccent:  '203 213 225',  // slate-300
  },
  5: { // Shattered Realm — indigo
    accent:      '129 140 248',  // indigo-400
    accentMuted: '67 56 202',    // indigo-700
    bgTint:      '30 27 75',     // indigo-950
    progress:    '139 92 246',   // violet-500
    textAccent:  '165 180 252',  // indigo-300
  },
  6: { // Endlands — dark red/black
    accent:      '220 38 38',    // red-600
    accentMuted: '69 10 10',     // red-950
    bgTint:      '10 5 5',       // near-black
    progress:    '168 85 247',   // purple-500
    textAccent:  '248 113 113',  // red-400
  },
};

// Default palette (idle / not running)
const DEFAULT_PALETTE = {
  accent:      '250 204 21',    // yellow-400
  accentMuted: '55 65 81',      // gray-700
  bgTint:      '3 7 18',        // gray-950
  progress:    '168 85 247',    // purple-500
  textAccent:  '250 204 21',    // yellow-400
};

function applyPalette(palette: typeof DEFAULT_PALETTE) {
  const root = document.documentElement.style;
  root.setProperty('--theme-accent', palette.accent);
  root.setProperty('--theme-accent-muted', palette.accentMuted);
  root.setProperty('--theme-bg-tint', palette.bgTint);
  root.setProperty('--theme-progress', palette.progress);
  root.setProperty('--theme-text-accent', palette.textAccent);
}

/**
 * Sets CSS custom properties on :root based on the current zone's band.
 * Returns the current band number (1-6) or 0 if not running.
 */
export function useZoneTheme(): number {
  const currentZoneId = useGameStore(s => s.currentZoneId);
  const idleStartTime = useGameStore(s => s.idleStartTime);

  const isRunning = idleStartTime !== null && currentZoneId !== null;
  const zone = isRunning ? ZONE_DEFS.find(z => z.id === currentZoneId) : undefined;
  const band = zone?.band ?? 0;

  useEffect(() => {
    if (band > 0 && BAND_PALETTES[band]) {
      applyPalette(BAND_PALETTES[band]);
    } else {
      applyPalette(DEFAULT_PALETTE);
    }
  }, [band]);

  return band;
}

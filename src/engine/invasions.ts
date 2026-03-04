// ============================================================
// Idle Exile — Void Invasion Engine
// Pure functions: no React, no store imports, no side effects.
// ============================================================

import type { Affix, ZoneDef } from '../types';
import {
  INVASION_MIN_COOLDOWN_MS,
  INVASION_DURATION_MIN_MS,
  INVASION_DURATION_MAX_MS,
  INVASION_ROLL_CHANCE,
  CORRUPTION_DROP_CHANCE,
} from '../data/balance';
import { rollCorruptionImplicit } from '../data/corruptionAffixes';

// --- Types ---

export interface InvasionEntry {
  zoneId: string;
  startTime: number;
  endTime: number;
}

export interface InvasionState {
  activeInvasions: Record<number, InvasionEntry>;  // band → active invasion
  bandCooldowns: Record<number, number>;            // band → cooldown expiry timestamp
}

// --- Core Functions ---

/**
 * Tick the invasion system: expire old invasions, roll for new ones.
 * Pure function — returns new state without mutating input.
 */
export function tickInvasions(
  state: InvasionState,
  now: number,
  zoneDefs: ZoneDef[],
): InvasionState {
  const newActive = { ...state.activeInvasions };
  const newCooldowns = { ...state.bandCooldowns };

  // Group zones by band
  const bandZones: Record<number, ZoneDef[]> = {};
  for (const z of zoneDefs) {
    if (!bandZones[z.band]) bandZones[z.band] = [];
    bandZones[z.band].push(z);
  }

  // Process each band
  for (const bandStr of Object.keys(bandZones)) {
    const band = Number(bandStr);

    // Expire finished invasions
    const active = newActive[band];
    if (active && now >= active.endTime) {
      delete newActive[band];
      // Set cooldown from end of invasion
      newCooldowns[band] = active.endTime + INVASION_MIN_COOLDOWN_MS;
    }

    // Skip if invasion is active
    if (newActive[band]) continue;

    // Skip if cooldown hasn't expired
    if ((newCooldowns[band] ?? 0) > now) continue;

    // Roll for new invasion
    if (Math.random() < INVASION_ROLL_CHANCE) {
      const zones = bandZones[band];
      if (zones.length > 0) {
        const picked = zones[Math.floor(Math.random() * zones.length)];
        const duration = INVASION_DURATION_MIN_MS + Math.random() * (INVASION_DURATION_MAX_MS - INVASION_DURATION_MIN_MS);
        newActive[band] = {
          zoneId: picked.id,
          startTime: now,
          endTime: now + duration,
        };
      }
    }
  }

  return { activeInvasions: newActive, bandCooldowns: newCooldowns };
}

/** Check if a zone is currently invaded. */
export function isZoneInvaded(state: InvasionState, zoneId: string, band: number): boolean {
  const invasion = state.activeInvasions[band];
  return !!invasion && invasion.zoneId === zoneId;
}

/** Get the invasion entry for a zone, or null. */
export function getZoneInvasion(state: InvasionState, zoneId: string, band: number): InvasionEntry | null {
  const invasion = state.activeInvasions[band];
  if (invasion && invasion.zoneId === zoneId) return invasion;
  return null;
}

/** Roll for a corruption implicit on an item. Returns Affix or null. */
export function rollCorruption(band: number): Affix | null {
  if (Math.random() < CORRUPTION_DROP_CHANCE) {
    return rollCorruptionImplicit(band);
  }
  return null;
}

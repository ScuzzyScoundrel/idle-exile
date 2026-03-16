// ============================================================
// Idle Exile — Trap System (Dagger v2)
// Handles: place → arm (delay) → detonate on enemy attack → AoE
// Stub implementation — full system deferred to v2.1.
// ============================================================

export interface TrapState {
  trapId: string;
  sourceSkillId: string;
  placedAt: number;           // timestamp
  armDelay: number;           // seconds until armed (default 1.5)
  isArmed: boolean;
  damage: number;             // snapshot damage for detonation
  duration: number;           // max lifetime in seconds
  remainingDuration: number;
}

/** Tick active traps: arm after delay, expire when duration runs out. */
export function tickTraps(traps: TrapState[], dtSec: number, now: number): TrapState[] {
  return traps
    .map(trap => {
      const updated = { ...trap, remainingDuration: trap.remainingDuration - dtSec };
      if (!updated.isArmed && (now - trap.placedAt) / 1000 >= trap.armDelay) {
        updated.isArmed = true;
      }
      return updated;
    })
    .filter(trap => trap.remainingDuration > 0);
}

/** Check if any armed trap should detonate (called on enemy attack). */
export function detonateTrap(traps: TrapState[]): { detonated: TrapState | null; remaining: TrapState[] } {
  const armedIdx = traps.findIndex(t => t.isArmed);
  if (armedIdx < 0) return { detonated: null, remaining: traps };
  const detonated = traps[armedIdx];
  return {
    detonated,
    remaining: [...traps.slice(0, armedIdx), ...traps.slice(armedIdx + 1)],
  };
}

// ============================================================
// Weapon Module Registry — maps weaponType to its module
// ============================================================

import type { WeaponModule } from './weaponModule';

const modules: Record<string, WeaponModule> = {};

/** Register a weapon module. Called at import time by each weapon file. */
export function registerWeaponModule(mod: WeaponModule): void {
  modules[mod.weaponType] = mod;
}

/** Look up the weapon module for a given weaponType. Returns null for generic/unregistered weapons. */
export function getWeaponModule(weaponType: string | undefined): WeaponModule | null {
  if (!weaponType) return null;
  return modules[weaponType] ?? null;
}

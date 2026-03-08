// ============================================================
// Idle Exile — Rare Mob Affix Definitions
// ============================================================

import type { RareAffixDef, RareAffixId } from '../types';

export const RARE_AFFIX_DEFS: Record<RareAffixId, RareAffixDef> = {
  mighty: {
    id: 'mighty',
    name: 'Mighty',
    description: '+25% damage dealt',
    hpMultiplier: 1.5,
    damageMultiplier: 1.25,
    lootMultiplier: 1.5,
    color: 'text-red-400',
  },
  frenzied: {
    id: 'frenzied',
    name: 'Frenzied',
    description: '+40% attack speed',
    hpMultiplier: 1.2,
    attackSpeedMultiplier: 0.6, // lower interval = faster attacks
    lootMultiplier: 1.5,
    color: 'text-orange-400',
  },
  armored: {
    id: 'armored',
    name: 'Armored',
    description: 'Takes 20% less damage',
    hpMultiplier: 1.6,
    damageTakenMultiplier: 0.8,
    lootMultiplier: 1.8,
    color: 'text-gray-300',
  },
  empowered: {
    id: 'empowered',
    name: 'Empowered',
    description: '+50% damage dealt',
    hpMultiplier: 1.3,
    damageMultiplier: 1.5,
    lootMultiplier: 1.8,
    color: 'text-yellow-400',
  },
  regenerating: {
    id: 'regenerating',
    name: 'Regenerating',
    description: 'Regens 2% maxHP/sec',
    hpMultiplier: 1.25,
    regenPerSec: 0.02,
    lootMultiplier: 1.6,
    color: 'text-green-400',
  },
};

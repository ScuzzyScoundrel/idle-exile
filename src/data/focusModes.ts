// ============================================================
// Idle Exile — Focus Mode Definitions
// 4 modes that modify drop rates and clear speed.
// ============================================================

import type { FocusModeDef, FocusMode } from '../types';

export const FOCUS_MODE_DEFS: FocusModeDef[] = [
  {
    id: 'combat',
    name: 'Combat',
    description: 'Balanced mode. Standard drop rates and clear speed.',
    icon: '\u2694\uFE0F',
    clearSpeedMult: 1.0,
    itemDropMult: 1.0,
    materialDropMult: 1.0,
    currencyDropMult: 1.0,
  },
  {
    id: 'harvesting',
    name: 'Harvesting',
    description: 'No item drops, 2.5x materials. Slightly slower clears.',
    icon: '\u{1F33F}',
    clearSpeedMult: 0.85,
    itemDropMult: 0,
    materialDropMult: 2.5,
    currencyDropMult: 0.5,
  },
  {
    id: 'prospecting',
    name: 'Prospecting',
    description: '2x currency drops. Fewer items and materials.',
    icon: '\uD83D\uDC8E',
    clearSpeedMult: 1.0,
    itemDropMult: 0.5,
    materialDropMult: 0.5,
    currencyDropMult: 2.0,
  },
  {
    id: 'scavenging',
    name: 'Scavenging',
    description: '1.5x item drops with higher rarity weight. Slightly slower.',
    icon: '\uD83D\uDD0D',
    clearSpeedMult: 0.85,
    itemDropMult: 1.5,
    materialDropMult: 0.5,
    currencyDropMult: 0.5,
    rarityWeightBoost: 1.2,
  },
];

/** Look up a focus mode definition by ID. */
export function getFocusModeDef(id: FocusMode): FocusModeDef {
  return FOCUS_MODE_DEFS.find(f => f.id === id) ?? FOCUS_MODE_DEFS[0];
}

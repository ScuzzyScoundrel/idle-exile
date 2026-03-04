// ============================================================
// Idle Exile — Void Corruption Implicit Pool
// Applied to items dropped during void invasions.
// ============================================================

import type { Affix, AffixTier } from '../types';

interface CorruptionDef {
  id: string;
  stat: string;
  displayTemplate: string;
  weight: number;
  // Per-band value ranges: [min, max] for bands 1-6
  bandValues: [number, number][];
}

const CORRUPTION_DEFS: CorruptionDef[] = [
  {
    id: 'void_flat_life',
    stat: 'flatMaxLife',
    displayTemplate: '+{value} Life (Void)',
    weight: 20,
    bandValues: [[5, 10], [10, 20], [15, 30], [20, 40], [30, 55], [40, 70]],
  },
  {
    id: 'void_phys_damage',
    stat: 'flatPhysDamage',
    displayTemplate: '+{value} Physical Damage (Void)',
    weight: 15,
    bandValues: [[1, 3], [2, 5], [3, 8], [5, 12], [8, 16], [12, 22]],
  },
  {
    id: 'void_fire_damage',
    stat: 'flatAtkFireDamage',
    displayTemplate: '+{value} Fire Damage (Void)',
    weight: 12,
    bandValues: [[1, 3], [2, 5], [3, 8], [5, 12], [8, 16], [12, 22]],
  },
  {
    id: 'void_cold_damage',
    stat: 'flatAtkColdDamage',
    displayTemplate: '+{value} Cold Damage (Void)',
    weight: 12,
    bandValues: [[1, 3], [2, 5], [3, 8], [5, 12], [8, 16], [12, 22]],
  },
  {
    id: 'void_lightning_damage',
    stat: 'flatAtkLightningDamage',
    displayTemplate: '+{value} Lightning Damage (Void)',
    weight: 12,
    bandValues: [[1, 3], [2, 5], [3, 8], [5, 12], [8, 16], [12, 22]],
  },
  {
    id: 'void_all_resist',
    stat: 'allResist',
    displayTemplate: '+{value}% All Resistances (Void)',
    weight: 10,
    bandValues: [[2, 4], [3, 6], [5, 8], [6, 10], [8, 13], [10, 16]],
  },
  {
    id: 'void_attack_speed',
    stat: 'attackSpeed',
    displayTemplate: '+{value}% Attack Speed (Void)',
    weight: 10,
    bandValues: [[1, 3], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12]],
  },
  {
    id: 'void_crit_chance',
    stat: 'critChance',
    displayTemplate: '+{value}% Critical Strike Chance (Void)',
    weight: 8,
    bandValues: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [4, 8]],
  },
  {
    id: 'void_crit_multi',
    stat: 'critMultiplier',
    displayTemplate: '+{value}% Critical Strike Multiplier (Void)',
    weight: 8,
    bandValues: [[3, 6], [5, 10], [8, 15], [10, 20], [15, 25], [18, 30]],
  },
  {
    id: 'void_spell_power',
    stat: 'spellPower',
    displayTemplate: '+{value} Spell Power (Void)',
    weight: 10,
    bandValues: [[2, 5], [4, 10], [8, 16], [12, 24], [18, 32], [24, 42]],
  },
];

/** Roll a random corruption implicit scaled to band (1-6). */
export function rollCorruptionImplicit(band: number): Affix {
  const bandIdx = Math.max(0, Math.min(band - 1, 5));

  // Weighted random pick
  const totalWeight = CORRUPTION_DEFS.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = CORRUPTION_DEFS[0];
  for (const def of CORRUPTION_DEFS) {
    roll -= def.weight;
    if (roll <= 0) { picked = def; break; }
  }

  const [min, max] = picked.bandValues[bandIdx];
  const value = min + Math.floor(Math.random() * (max - min + 1));

  // Map to affix tier based on band: band 1 = T10, band 6 = T5
  const tier = Math.max(5, 11 - band) as AffixTier;

  return {
    defId: picked.id,
    tier,
    value,
  };
}

/** Get display text for a corruption affix. */
export function formatCorruptionAffix(affix: Affix): string {
  const def = CORRUPTION_DEFS.find(d => d.id === affix.defId);
  if (!def) return `+${affix.value} ???`;
  return def.displayTemplate.replace('{value}', String(affix.value));
}

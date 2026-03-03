import type { SetBonusDef, ArmorType } from '../types';

export const SET_BONUS_DEFS: Record<ArmorType, SetBonusDef> = {
  plate: {
    armorType: 'plate',
    name: 'Juggernaut',
    thresholds: {
      2: { flatPhysDamage: 8, armor: 10 },
      4: { maxLife: 20 },
      6: { flatPhysDamage: 12, maxLife: 15 },
    },
  },
  leather: {
    armorType: 'leather',
    name: 'Stalker',
    thresholds: {
      2: { evasion: 40, critChance: 3 },
      4: { attackSpeed: 5, critMultiplier: 10 },
      6: { evasion: 60, critChance: 4, critMultiplier: 10 },
    },
  },
  cloth: {
    armorType: 'cloth',
    name: 'Rapid Caster',
    thresholds: {
      2: { abilityHaste: 6, energyShield: 40 },
      4: { critChance: 3 },
      6: { abilityHaste: 10, critMultiplier: 5, energyShield: 80, esRecharge: 3 },
    },
  },
};

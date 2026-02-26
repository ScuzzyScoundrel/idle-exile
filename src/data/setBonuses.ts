import type { SetBonusDef, ArmorType } from '../types';

export const SET_BONUS_DEFS: Record<ArmorType, SetBonusDef> = {
  plate: {
    armorType: 'plate',
    name: 'Juggernaut',
    thresholds: {
      2: { damage: 8, armor: 10 },
      4: { life: 20 },
      6: { damage: 12, life: 15 },
    },
  },
  leather: {
    armorType: 'leather',
    name: 'Stalker',
    thresholds: {
      2: { dodgeChance: 4, critChance: 3 },
      4: { attackSpeed: 5, critDamage: 10 },
      6: { dodgeChance: 6, critChance: 4, critDamage: 10 },
    },
  },
  cloth: {
    armorType: 'cloth',
    name: 'Rapid Caster',
    thresholds: {
      2: { abilityHaste: 6 },
      4: { critChance: 3 },
      6: { abilityHaste: 10, critDamage: 5 },
    },
  },
};

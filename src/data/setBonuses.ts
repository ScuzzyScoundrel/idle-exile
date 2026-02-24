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
  mail: {
    armorType: 'mail',
    name: 'Sharpshooter',
    thresholds: {
      2: { critChance: 5 },
      4: { critDamage: 15 },
      6: { critChance: 5, critDamage: 15 },
    },
  },
  leather: {
    armorType: 'leather',
    name: 'Phantom',
    thresholds: {
      2: { dodgeChance: 5 },
      4: { attackSpeed: 5 },
      6: { dodgeChance: 8, critChance: 3 },
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

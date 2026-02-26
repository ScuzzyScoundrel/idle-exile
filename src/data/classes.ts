import type { ClassDef } from '../types';

export const CLASS_DEFS: Record<string, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Tanky and consistent. Favors heavy armor and raw durability.',
    baseStatBonuses: {
      maxLife: 25,
      armor: 30,
      flatPhysDamage: 5,
      critMultiplier: 10,
    },
    armorAffinity: 'plate',
  },
};

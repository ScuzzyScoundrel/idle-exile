import type { ClassDef } from '../types';

export const CLASS_DEFS: Record<string, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Tanky and consistent. Favors heavy armor and raw durability.',
    baseStatBonuses: {
      life: 25,
      armor: 10,
      damage: 3,
      critDamage: 10,
    },
    armorAffinity: 'plate',
  },
};

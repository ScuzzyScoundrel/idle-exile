import type { SetBonusDef, ArmorType } from '../types';

export const SET_BONUS_DEFS: Record<ArmorType, SetBonusDef> = {
  plate: {
    armorType: 'plate',
    name: 'Juggernaut',
    thresholds: {
      2: { flatPhysDamage: 8, lifeLeechPercent: 1, armorToElemental: 10 },
      4: { incMaxLife: 15, armorToElemental: 25 },
      6: { damageTakenReduction: 10, lifeRecoveryPerHit: 0.8 },
    },
  },
  leather: {
    armorType: 'leather',
    name: 'Stalker',
    thresholds: {
      2: { evasion: 40, critChance: 3 },
      4: { evasion: 40 },
      6: { lifeOnDodgePercent: 1, critMultiplier: 20 },
    },
  },
  cloth: {
    armorType: 'cloth',
    name: 'Arcane Weaver',
    thresholds: {
      2: { castSpeed: 6, energyShield: 40 },
      4: { incEnergyShield: 30, esRecharge: 2 },
      6: { esCombatRecharge: 40, maxLife: 200, allResist: 20, critChance: 3, critMultiplier: 5 },
    },
  },
};

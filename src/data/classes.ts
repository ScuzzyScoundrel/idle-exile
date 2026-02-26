import type { ClassDef, CharacterClass } from '../types';

export const CLASS_DEFS: Record<CharacterClass, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Tanky and consistent. Heavy armor, raw durability, and building rage.',
    baseStatBonuses: {
      incMaxLife: 15,
      armor: 30,
    },
    armorAffinity: 'plate',
    resourceType: 'rage',
    resourceMax: 20,
    resourcePerClear: 1,
    resourceDecayRate: 1 / 30,  // 1 stack per 30 seconds
    resourceDecayOnZoneSwitch: false,
    resourceDecayOnStop: false,
    resourceDecayOnGearSwap: false,
    resourceDescription: 'Rage builds per clear (+1), decays while idle. +2% damage per stack.',
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Arcane mastery. Charges build on ability use, discharging for bonus clears.',
    baseStatBonuses: {
      spellPower: 15,
      castSpeed: 10,
    },
    armorAffinity: 'cloth',
    resourceType: 'arcane_charges',
    resourceMax: 10,
    resourcePerClear: 0,          // Mage gains charges from ability activation, not clears
    resourceDecayRate: 0,
    resourceDecayOnZoneSwitch: false,
    resourceDecayOnStop: false,
    resourceDecayOnGearSwap: false,
    resourceDescription: 'Charges build on ability use. At max (10), discharge for bonus clears. +5% spell damage, +3% ability haste per charge.',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    description: 'Patient tracker. Builds stacks in the same zone for better loot.',
    baseStatBonuses: {
      evasion: 30,
      movementSpeed: 10,
    },
    armorAffinity: 'leather',
    resourceType: 'tracking',
    resourceMax: 100,
    resourcePerClear: 1,
    resourceDecayRate: 0,
    resourceDecayOnZoneSwitch: true,   // resets on zone switch
    resourceDecayOnStop: false,
    resourceDecayOnGearSwap: false,
    resourceDescription: 'Tracking builds per clear in the same zone. Resets on zone switch. +0.5% rare find, +0.3% material yield per stack.',
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'Momentum-driven. The longer you run uninterrupted, the faster you clear.',
    baseStatBonuses: {
      attackSpeed: 15,
      critChance: 10,
    },
    armorAffinity: 'leather',
    resourceType: 'momentum',
    resourceMax: null,                  // uncapped
    resourcePerClear: 1,
    resourceDecayRate: 0,
    resourceDecayOnZoneSwitch: true,
    resourceDecayOnStop: true,
    resourceDecayOnGearSwap: true,
    resourceDescription: 'Momentum builds per clear (+1), no cap. Resets on stop, zone change, or gear swap. +1% clear speed per stack.',
  },
};

/** Get class definition by ID. */
export function getClassDef(classId: CharacterClass): ClassDef {
  return CLASS_DEFS[classId];
}

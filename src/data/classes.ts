import type { ClassDef, CharacterClass } from '../types';

// §15.4 rename 2026-05-04: warrior→berserker, mage→sorcerer, ranger→hunter; rogue absorbed into assassin.
export const CLASS_DEFS: Record<CharacterClass, ClassDef> = {
  berserker: {
    id: 'berserker',
    name: 'Berserker',
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
    resourceDescription: 'FURY — flail strikes build it and hits you TAKE feed it (max 8). Crushing Blow spends the whole pool; full Fury opens a Rampage. Berserkers use no mana.',
  },
  sorcerer: {
    id: 'sorcerer',
    name: 'Sorcerer',
    description: 'Arcane mastery. Charges build on ability use, discharging for bonus clears.',
    baseStatBonuses: {
      spellPower: 15,
      castSpeed: 10,
    },
    armorAffinity: 'cloth',
    resourceType: 'arcane_charges',
    resourceMax: 10,
    resourcePerClear: 0,          // Sorcerer gains charges from ability activation, not clears
    resourceDecayRate: 0,
    resourceDecayOnZoneSwitch: false,
    resourceDecayOnStop: false,
    resourceDecayOnGearSwap: false,
    resourceDescription: 'ATTUNEMENT — elemental bolts build it (max 5); Void Blast consumes ALL stacks, Perfect at 5. Mana paces casting (8/s regen + on-crit chunks).',
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
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
    resourceDescription: 'QUIVER — Arrow Shot +1, Rapid Fire +3 (max 6); Snipe consumes ALL stacks, guaranteed-crit Perfect at 6. Hunters use no mana.',
  },
  // MVP launch classes. Legacy resource fields are placeholders until Phase 2d
  // replaces the per-class resource system with universal Mana + class-flavored regen.
  witchdoctor: {
    id: 'witchdoctor',
    name: 'Witchdoctor',
    description: 'Chaos DoT + minion specialist. Pandemic spread propagates damage across targets.',
    baseStatBonuses: {
      spellPower: 10,
      incChaosDamage: 10,
    },
    armorAffinity: 'cloth',
    resourceType: 'arcane_charges',
    resourceMax: 10,
    resourcePerClear: 0,
    resourceDecayRate: 0,
    resourceDecayOnZoneSwitch: false,
    resourceDecayOnStop: false,
    resourceDecayOnGearSwap: false,
    resourceDescription: 'SOULS — Soul Harvest banks 2 per cast (max 6); Bouncing Skull spends the pool, Perfect at 6. Mana paces casting (6/s regen + big on-kill chunks).',
    startingAttributes: { strength: 0, dexterity: 0, intelligence: 3, spirit: 4 },
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    description: 'Dex + Spirit crit/poison/stealth specialist. Culling Strike executes low-HP targets.',
    baseStatBonuses: {
      critChance: 8,
      attackSpeed: 10,
    },
    armorAffinity: 'leather',
    resourceType: 'momentum',
    resourceMax: null,
    resourcePerClear: 1,
    resourceDecayRate: 0,
    resourceDecayOnZoneSwitch: true,
    resourceDecayOnStop: true,
    resourceDecayOnGearSwap: true,
    resourceDescription: 'MOMENTUM — builders stack it (max 5); Assassinate consumes ALL stacks, Perfect at 5. Crits open 3s Openings. Assassins use no mana.',
    startingAttributes: { strength: 0, dexterity: 4, intelligence: 0, spirit: 3 },
  },
};

/** Get class definition by ID. */
export function getClassDef(classId: CharacterClass): ClassDef {
  return CLASS_DEFS[classId];
}

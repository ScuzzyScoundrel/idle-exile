// ============================================================
// Idle Exile — Character & Stats Engine (v16 overhaul)
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Character, CharacterClass, ResolvedStats, StatKey, GearSlot, Item } from '../types';
import { getAffixDef } from './items';
import { CLASS_DEFS } from '../data/classes';
import { calcSetBonuses } from './setBonus';
import { WEAPON_TYPE_META } from '../data/weapons';
import {
  BASE_STATS, PHYS_DAMAGE_PER_LEVEL, MAX_LIFE_PER_LEVEL, ACCURACY_PER_LEVEL,
  XP_BASE, XP_GROWTH, ACCURACY_DIVISOR,
} from '../data/balance';

// --- Functions ---

/** Calculate XP required to reach the next level. */
export function calcXpToNext(level: number): number {
  return Math.floor(XP_BASE * Math.pow(XP_GROWTH, level - 1));
}

/** Create a fresh level 1 character with the given name and class. */
export function createCharacter(name: string, charClass: CharacterClass = 'warrior'): Character {
  const char: Character = {
    name,
    class: charClass,
    level: 1,
    xp: 0,
    xpToNext: calcXpToNext(1),
    equipment: {},
    stats: { ...BASE_STATS },
  };
  char.stats = resolveStats(char);
  return char;
}

/**
 * Resolve the final stats for a character, combining base stats,
 * class bonuses, per-level bonuses, equipment base stats, and all affix bonuses.
 *
 * Only maxLife gets pre-multiplied by incMaxLife. All offensive % stats
 * (incPhysDamage, incAttackDamage, incSpellDamage, incElementalDamage, etc.)
 * stay as raw values — the DPS formula uses them directly.
 */
export function resolveStats(char: Character): ResolvedStats {
  const stats: ResolvedStats = { ...BASE_STATS };

  // Apply class base stat bonuses
  const classDef = CLASS_DEFS[char.class];
  if (classDef) {
    for (const [key, val] of Object.entries(classDef.baseStatBonuses)) {
      if (typeof val === 'number') {
        stats[key as StatKey] += val;
      }
    }
  }

  // Per-level bonuses (level 1 gets no bonus)
  const bonusLevels = char.level - 1;
  stats.flatPhysDamage += PHYS_DAMAGE_PER_LEVEL * bonusLevels;
  stats.maxLife += MAX_LIFE_PER_LEVEL * bonusLevels;
  stats.accuracy += ACCURACY_PER_LEVEL * bonusLevels;

  // Loop through all equipped items
  const slots = Object.keys(char.equipment) as GearSlot[];
  for (const slot of slots) {
    const item = char.equipment[slot];
    if (!item) continue;

    // Add base stats from the item
    for (const [key, val] of Object.entries(item.baseStats)) {
      if (typeof val === 'number') {
        stats[key as StatKey] += val;
      }
    }

    // Process all affixes (prefixes + suffixes)
    const allAffixes = [...item.prefixes, ...item.suffixes];
    for (const affix of allAffixes) {
      const def = getAffixDef(affix.defId);
      if (!def) continue;
      // Each affix def has a direct `stat` field now
      stats[def.stat] += affix.value;
    }
  }

  // Apply set bonuses (flat additions)
  const setBonuses = calcSetBonuses(char.equipment);
  for (const setBonus of setBonuses) {
    for (const { stats: bonusStats } of setBonus.bonuses) {
      for (const [key, val] of Object.entries(bonusStats)) {
        if (typeof val === 'number') {
          stats[key as StatKey] += val;
        }
      }
    }
  }

  // Apply incMaxLife as a multiplier on maxLife (only maxLife gets pre-multiplied)
  if (stats.incMaxLife > 0) {
    stats.maxLife = Math.floor(stats.maxLife * (1 + stats.incMaxLife / 100));
  }

  // Apply incEnergyShield as a multiplier on energyShield
  if (stats.incEnergyShield > 0) {
    stats.energyShield = Math.floor(stats.energyShield * (1 + stats.incEnergyShield / 100));
  }

  // Apply incArmor as a multiplier on armor
  if (stats.incArmor > 0) {
    stats.armor = Math.floor(stats.armor * (1 + stats.incArmor / 100));
  }

  // Apply incEvasion as a multiplier on evasion
  if (stats.incEvasion > 0) {
    stats.evasion = Math.floor(stats.evasion * (1 + stats.incEvasion / 100));
  }

  // Add weapon base stats to pool, then apply % multipliers
  stats.attackSpeed += stats.baseAttackSpeed;
  if (stats.incAttackSpeed > 0) {
    stats.attackSpeed = Math.floor(stats.attackSpeed * (1 + stats.incAttackSpeed / 100));
  }

  stats.critChance += stats.baseCritChance;
  if (stats.incCritChance > 0) {
    stats.critChance = Math.floor(stats.critChance * (1 + stats.incCritChance / 100));
  }

  return stats;
}

// --- DPS Calculation Functions ---

/** Hit chance from accuracy: accuracy / (accuracy + 500). */
export function calcHitChance(accuracy: number): number {
  return accuracy / (accuracy + ACCURACY_DIVISOR);
}

/** Get weapon damage info from equipped mainhand. */
export function getWeaponDamageInfo(equipment: Partial<Record<GearSlot, Item>>): { avgDamage: number; spellPower: number; speedMod: number } {
  const mainhand = equipment.mainhand;
  if (!mainhand) return { avgDamage: 0, spellPower: 0, speedMod: 1.0 };

  let avgDamage = 0;
  if (mainhand.baseDamageMin != null && mainhand.baseDamageMax != null) {
    avgDamage = (mainhand.baseDamageMin + mainhand.baseDamageMax) / 2;
  }

  const spellPower = mainhand.baseSpellPower ?? 0;
  const speedMod = mainhand.weaponType ? WEAPON_TYPE_META[mainhand.weaponType]?.speedModifier ?? 1.0 : 1.0;

  return { avgDamage, spellPower, speedMod };
}

/**
 * Physical Attack DPS:
 * (weaponBaseDmgAvg + flatPhys) × (1 + incPhys%/100) × (1 + incAtk%/100) × (1 + atkSpd%/100) × hitChance
 */
export function calcPhysicalAttackDps(stats: ResolvedStats, weaponBaseDmgAvg: number): number {
  const baseDmg = weaponBaseDmgAvg + stats.flatPhysDamage;
  if (baseDmg <= 0) return 0;
  return baseDmg
    * (1 + stats.incPhysDamage / 100)
    * (1 + stats.incAttackDamage / 100)
    * (1 + stats.attackSpeed / 100)
    * calcHitChance(stats.accuracy);
}

/**
 * Elemental Attack DPS:
 * Sum of each element: flatAtkEle × (1 + incEle%/100) × (1 + incSpecific%/100) × (1 + atkSpd%/100) × hitChance
 */
export function calcElementalAttackDps(stats: ResolvedStats): number {
  const hitChance = calcHitChance(stats.accuracy);
  const spdMult = 1 + stats.attackSpeed / 100;
  const eleMult = 1 + stats.incElementalDamage / 100;

  let total = 0;
  total += stats.flatAtkFireDamage * eleMult * (1 + stats.incFireDamage / 100) * spdMult * hitChance;
  total += stats.flatAtkColdDamage * eleMult * (1 + stats.incColdDamage / 100) * spdMult * hitChance;
  total += stats.flatAtkLightningDamage * eleMult * (1 + stats.incLightningDamage / 100) * spdMult * hitChance;
  total += stats.flatAtkChaosDamage * (1 + stats.incAttackDamage / 100) * spdMult * hitChance;

  return total;
}

/**
 * Spell DPS:
 * (weaponSP + spellPower) × (1 + incSpell%/100) × (1 + incEle%/100) × (1 + castSpd%/100)
 * + elemental spell components
 */
export function calcSpellDps(stats: ResolvedStats, weaponBaseSpellPower: number): number {
  const baseSP = weaponBaseSpellPower + stats.spellPower;
  if (baseSP <= 0 && stats.flatSpellFireDamage <= 0 && stats.flatSpellColdDamage <= 0
    && stats.flatSpellLightningDamage <= 0 && stats.flatSpellChaosDamage <= 0) return 0;

  const castMult = 1 + stats.castSpeed / 100;
  const spellMult = 1 + stats.incSpellDamage / 100;
  const eleMult = 1 + stats.incElementalDamage / 100;

  let total = baseSP * spellMult * eleMult * castMult;
  total += stats.flatSpellFireDamage * spellMult * (1 + stats.incFireDamage / 100) * castMult;
  total += stats.flatSpellColdDamage * spellMult * (1 + stats.incColdDamage / 100) * castMult;
  total += stats.flatSpellLightningDamage * spellMult * (1 + stats.incLightningDamage / 100) * castMult;
  total += stats.flatSpellChaosDamage * spellMult * castMult;

  return total;
}

/**
 * Total DPS = (Phys + Ele + Spell) × (1 + critChance/100 × (critMultiplier - 100)/100)
 */
export function calcTotalDps(stats: ResolvedStats, weaponBaseDmgAvg: number, weaponBaseSpellPower: number): number {
  const phys = calcPhysicalAttackDps(stats, weaponBaseDmgAvg);
  const ele = calcElementalAttackDps(stats);
  const spell = calcSpellDps(stats, weaponBaseSpellPower);
  const baseDps = phys + ele + spell;

  const critMult = 1 + (stats.critChance / 100) * ((stats.critMultiplier - 100) / 100);
  return baseDps * critMult;
}

/**
 * Add XP to a character and handle level-ups.
 * Returns a NEW character object (does not mutate the original).
 */
export function addXp(char: Character, amount: number): Character {
  let newChar: Character = {
    ...char,
    xp: char.xp + amount,
    equipment: { ...char.equipment },
  };

  while (newChar.xp >= newChar.xpToNext) {
    newChar = {
      ...newChar,
      xp: newChar.xp - newChar.xpToNext,
      level: newChar.level + 1,
      xpToNext: calcXpToNext(newChar.level + 1),
    };
  }

  newChar.stats = resolveStats(newChar);
  return newChar;
}

// ============================================================
// Gear Evaluation — Score items by DPS + EHP with weights
// ============================================================

import type { Character, Item, GearSlot, ResolvedStats } from '../src/types';
import { resolveStats, getWeaponDamageInfo, calcTotalDps } from '../src/engine/character';
import { ARMOR_COEFFICIENT, ARMOR_FLAT_DR_RATIO, ARMOR_FLAT_DR_CAP, DODGE_DAMAGE_FLOOR } from '../src/data/balance';
import type { GearWeights, ArmorPreference } from './strategies/types';

/** Estimate armor mitigation fraction against a reference damage value. */
function armorMitigation(stats: ResolvedStats): number {
  // PoE-style: armor / (armor + coefficient * refDmg)
  // Use a reference hit of 50 (mid-range zone hit)
  const refDmg = 50;
  const percentDR = stats.armor / (stats.armor + ARMOR_COEFFICIENT * refDmg);
  const flatDR = Math.min(stats.armor / ARMOR_FLAT_DR_RATIO / 100, ARMOR_FLAT_DR_CAP);
  return (1 - percentDR) * (1 - flatDR);
}

/** Estimate resist mitigation (average of all 4 resists, capped at 75). */
function resistMitigation(stats: ResolvedStats): number {
  const avgResist = (
    Math.min(stats.fireResist, 75) +
    Math.min(stats.coldResist, 75) +
    Math.min(stats.lightningResist, 75) +
    Math.min(stats.chaosResist, 75)
  ) / 4;
  return 1 - avgResist / 100;
}

/** Calculate EHP (effective HP pool considering armor + resists + dodge). */
export function calcEhp(stats: ResolvedStats): number {
  const armorMult = armorMitigation(stats);
  const resistMult = resistMitigation(stats);
  // Model dodge: reduces effective incoming damage
  const rawDodge = stats.evasion / (stats.evasion + 200); // approximate zone accuracy
  const dodgeChance = Math.min(Math.pow(rawDodge, 1.2), 0.75);
  // With dodge floor, effective dodge reduction = dodgeChance * (1 - DODGE_DAMAGE_FLOOR)
  const dodgeMult = 1 - dodgeChance * (1 - DODGE_DAMAGE_FLOOR);
  const rawMult = armorMult * resistMult * dodgeMult;
  return rawMult > 0 ? stats.maxLife / rawMult : stats.maxLife;
}

/** Calculate DPS from a character's resolved stats. */
export function calcCharDps(char: Character): number {
  const { avgDamage, spellPower } = getWeaponDamageInfo(char.equipment);
  return calcTotalDps(char.stats, avgDamage, spellPower);
}

/** Score a character by weighted DPS + EHP. */
export function scoreCharacter(char: Character, weights: GearWeights): number {
  const dps = calcCharDps(char);
  const ehp = calcEhp(char.stats);
  return dps * weights.dps + ehp * weights.ehp;
}

/** Temporarily equip an item and return a new character (for comparison). */
function equipTemporarily(char: Character, item: Item): Character {
  const newEquipment = { ...char.equipment, [item.slot]: item };
  const newChar: Character = { ...char, equipment: newEquipment };
  newChar.stats = resolveStats(newChar);
  return newChar;
}

/**
 * Check if a candidate item is an upgrade over current equipment.
 * Uses weighted DPS+EHP scoring with a 1% threshold to avoid churn.
 * If armorPreference is set (not 'any'), reject items with non-matching armorType.
 */
export function isUpgrade(char: Character, candidate: Item, weights: GearWeights, armorPreference: ArmorPreference = 'any'): boolean {
  // Filter by armor type if preference is set
  if (armorPreference !== 'any' && candidate.armorType && candidate.armorType !== armorPreference) {
    return false;
  }
  const currentScore = scoreCharacter(char, weights);
  const withCandidate = equipTemporarily(char, candidate);
  const newScore = scoreCharacter(withCandidate, weights);
  return newScore > currentScore * 1.01;
}

/** Equip an item on a character (returns new Character with updated stats). */
export function equipItem(char: Character, item: Item): Character {
  const newEquipment = { ...char.equipment, [item.slot]: item };
  const newChar: Character = { ...char, equipment: newEquipment };
  newChar.stats = resolveStats(newChar);
  return newChar;
}

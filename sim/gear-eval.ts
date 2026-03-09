// ============================================================
// Gear Evaluation — Score items by DPS + EHP with weights
// ============================================================

import type { Character, Item, GearSlot, ResolvedStats, EquippedSkill, SkillProgress, ZoneDef } from '../src/types';
import { resolveStats } from '../src/engine/character';
import { calcPlayerDps, calcEhp, calcZoneRefDamage, calcZoneAccuracy } from '../src/engine/zones';
import type { GearWeights, ArmorPreference } from './strategies/types';

// Re-export for existing imports
export { calcEhp, calcZoneRefDamage, calcZoneAccuracy } from '../src/engine/zones';

/** Calculate DPS from a character using skill-based rotation (or default weapon skill fallback). */
export function calcCharDps(
  char: Character,
  skillBar?: (EquippedSkill | null)[],
  skillProgress?: Record<string, SkillProgress>,
): number {
  return calcPlayerDps(char, undefined, undefined, skillBar, skillProgress);
}

/** Score a character by weighted DPS + EHP. Zone-aware EHP when zone is provided. */
export function scoreCharacter(
  char: Character, weights: GearWeights,
  skillBar?: (EquippedSkill | null)[],
  skillProgress?: Record<string, SkillProgress>,
  refDamage?: number, refAccuracy?: number,
): number {
  const dps = calcCharDps(char, skillBar, skillProgress);
  const ehp = calcEhp(char.stats, refDamage, refAccuracy);
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
 * When zone is provided, EHP is scored against zone-specific damage/accuracy.
 */
export function isUpgrade(
  char: Character, candidate: Item, weights: GearWeights, armorPreference: ArmorPreference = 'any',
  skillBar?: (EquippedSkill | null)[], skillProgress?: Record<string, SkillProgress>,
  refDamage?: number, refAccuracy?: number,
): boolean {
  // Soft armor preference filter:
  // - Empty slot → accept ANY armor type (prevents slot-fill failures)
  // - Filled with wrong type + candidate matches preference → allow upgrade comparison
  // - Candidate doesn't match preference on an already-filled slot → reject
  if (armorPreference !== 'any' && candidate.armorType) {
    const currentItem = char.equipment[candidate.slot];
    const candidateMatchesPreference = candidate.armorType === armorPreference;
    if (!currentItem) {
      // Empty slot: accept any armor to fill the gap
    } else if (currentItem.armorType && currentItem.armorType !== armorPreference && candidateMatchesPreference) {
      // Current item is wrong type, candidate is right type: allow upgrade
    } else if (!candidateMatchesPreference) {
      return false;
    }
  }
  const currentScore = scoreCharacter(char, weights, skillBar, skillProgress, refDamage, refAccuracy);
  const withCandidate = equipTemporarily(char, candidate);
  const newScore = scoreCharacter(withCandidate, weights, skillBar, skillProgress, refDamage, refAccuracy);
  return newScore > currentScore * 1.01;
}

/** Equip an item on a character (returns new Character with updated stats). */
export function equipItem(char: Character, item: Item): Character {
  const newEquipment = { ...char.equipment, [item.slot]: item };
  const newChar: Character = { ...char, equipment: newEquipment };
  newChar.stats = resolveStats(newChar);
  return newChar;
}

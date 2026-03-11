// ============================================================
// Idle Exile — Pack & Rare Mob Engine
// Pure TS, no React dependencies.
// ============================================================

import type { RareAffixId, RareMobState, MobInPack, EquippedSkill, SkillProgress, ZoneDef } from '../types';
import { PACK_SIZE_WEIGHTS, RARE_CHANCE_BY_BAND, RARE_AFFIX_COUNT, ZONE_ATTACK_INTERVAL } from '../data/balance';
import { RARE_AFFIX_DEFS } from '../data/rareAffixes';
import { getUnifiedSkillDef } from '../data/skills';
import { getSkillGraphModifier, calcMobHp } from '../engine/unifiedSkills';

// ─── Pack Size ───

/** Roll a pack size (1-5) based on zone band using weighted random. */
export function rollPackSize(band: number): number {
  const tier = band <= 2 ? 'early' : band <= 4 ? 'mid' : 'late';
  const weights = PACK_SIZE_WEIGHTS[tier];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i + 1;
  }
  return 1;
}

// ─── AoE Detection ───

/** Check if the currently-casting skill is AoE (via base tags or convertToAoE talent). */
export function isSkillAoE(
  _skillBar: (EquippedSkill | null)[],
  currentSkillId: string | null,
  skillProgress: Record<string, SkillProgress>,
): boolean {
  if (!currentSkillId) return false;
  const skillDef = getUnifiedSkillDef(currentSkillId);
  if (!skillDef) return false;
  // Check base tags
  if (skillDef.tags.includes('AoE')) return true;
  // Check talent/graph mods for convertToAoE
  const progress = skillProgress[currentSkillId];
  const graphMod = getSkillGraphModifier(skillDef, progress);
  if (graphMod?.convertToAoE) return true;
  return false;
}

// ─── Rare Mobs ───

/** Roll whether this encounter is a rare mob. */
export function rollIsRare(band: number): boolean {
  const chance = RARE_CHANCE_BY_BAND[Math.min(band, 6)] ?? 0.05;
  return Math.random() < chance;
}

/** Roll unique affixes for a rare mob based on band. */
export function rollRareAffixes(band: number): RareAffixId[] {
  const config = RARE_AFFIX_COUNT[Math.min(band, 6)] ?? { min: 1, max: 1 };
  const count = config.min + Math.floor(Math.random() * (config.max - config.min + 1));
  const allAffixes: RareAffixId[] = ['mighty', 'frenzied', 'armored', 'empowered', 'regenerating'];
  // Fisher-Yates shuffle then take first `count`
  const shuffled = [...allAffixes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ─── Pack Spawning ───

/** Spawn a full pack of mobs, each with independent rare rolls, HP, and staggered attack timers.
 *  @param zone     Zone definition (for band, HP scaling)
 *  @param hpMult   Mob-type HP multiplier (e.g. from mob def)
 *  @param invMult  Invasion difficulty multiplier (1.0 if not invaded)
 *  @param startAttackAt  Timestamp (ms) for initial attack window start
 */
export function spawnPack(zone: ZoneDef, hpMult: number, invMult: number, startAttackAt: number): MobInPack[] {
  const packSize = rollPackSize(zone.band);
  const baseInterval = ZONE_ATTACK_INTERVAL * 1000; // ms
  const mobs: MobInPack[] = [];

  for (let i = 0; i < packSize; i++) {
    // Each mob independently rolls rare + affixes
    let rare: RareMobState | null = null;
    let rareMult = 1;
    if (rollIsRare(zone.band)) {
      const affixes = rollRareAffixes(zone.band);
      rare = resolveRareMods(affixes);
      rareMult = rare.combinedHpMult;
    }

    const mobHp = calcMobHp(zone, hpMult * invMult * rareMult);

    // Stagger attack timers evenly across the base interval
    const atkSpeedMult = rare?.combinedAtkSpeedMult ?? 1;
    const staggerOffset = baseInterval * atkSpeedMult * (i + 1) / packSize;

    mobs.push({
      hp: mobHp,
      maxHp: mobHp,
      debuffs: [],
      nextAttackAt: startAttackAt + staggerOffset,
      rare,
    });
  }

  return mobs;
}

/** Resolve combined modifiers from a set of affixes (multiplicative stacking). */
export function resolveRareMods(affixes: RareAffixId[]): RareMobState {
  let combinedHpMult = 1;
  let combinedLootMult = 1;
  let combinedDamageMult = 1;
  let combinedAtkSpeedMult = 1;
  let combinedDamageTakenMult = 1;
  let combinedRegenPerSec = 0;

  for (const id of affixes) {
    const def = RARE_AFFIX_DEFS[id];
    combinedHpMult *= def.hpMultiplier;
    combinedLootMult *= def.lootMultiplier;
    if (def.damageMultiplier) combinedDamageMult *= def.damageMultiplier;
    if (def.attackSpeedMultiplier) combinedAtkSpeedMult *= def.attackSpeedMultiplier;
    if (def.damageTakenMultiplier) combinedDamageTakenMult *= def.damageTakenMultiplier;
    if (def.regenPerSec) combinedRegenPerSec += def.regenPerSec;
  }

  return {
    affixes,
    combinedHpMult,
    combinedLootMult,
    combinedDamageMult,
    combinedAtkSpeedMult,
    combinedDamageTakenMult,
    combinedRegenPerSec,
  };
}

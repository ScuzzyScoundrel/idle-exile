// ============================================================
// Zone Defense — dodge, block, armor, resist, EHP pipeline
// Extracted from engine/zones.ts (Phase C2)
// ============================================================

import type { ResolvedStats, ZoneDef } from '../../types';
import {
  BLOCK_CAP, BLOCK_REDUCTION, DODGE_CAP, EVASION_MIN_HIT_CHANCE, EVASION_DR_EXPONENT,
  ARMOR_COEFFICIENT, ARMOR_FLAT_DR_RATIO, ARMOR_FLAT_DR_CAP,
  ZONE_PHYS_RATIO, ZONE_ATTACK_INTERVAL, ZONE_DMG_BASE, ZONE_DMG_ILVL_SCALE,
  CLEAR_REGEN_RATIO, LEECH_PERCENT, BASE_REGEN_CAP_RATIO, REGEN_CAP_PER_MITIGATED, MAX_REGEN_CAP_RATIO,
  UNDERLEVEL_MIN_NET_DAMAGE,
  DODGE_DAMAGE_FLOOR,
} from '../../data/balance';
import { calcLevelDamageMult, calcZoneAccuracy } from './scaling';

/** POE-style entropy evasion roll. Deterministic over N attacks. */
export function rollEntropicEvasion(
  hitChance: number, entropy: number,
): { isEvaded: boolean; newEntropy: number } {
  const newEntropy = entropy + hitChance;
  if (newEntropy >= 100) {
    return { isEvaded: false, newEntropy: newEntropy - 100 };
  }
  return { isEvaded: true, newEntropy };
}

/**
 * Roll one incoming attack through the defense pipeline:
 *   1. Dodge (evasion vs accuracy, entropy-based with diminishing returns)
 *   2. Block (chance, blocked hits deal 25% damage)
 *   3. Armor mitigation (PoE-style, physical portion only)
 *   4. Resist mitigation (elemental portion, average of capped resists)
 */
export function rollZoneAttack(
  rawDamage: number,
  physRatio: number,
  zoneAccuracy: number,
  stats: ResolvedStats,
  dodgeEntropy?: number,
): { damage: number; isDodged: boolean; isBlocked: boolean; newDodgeEntropy: number } {
  // 1. Dodge check — entropy-based with diminishing returns
  const rawDodge = stats.evasion / (stats.evasion + zoneAccuracy);
  const dodgeChance = Math.min(
    Math.pow(rawDodge, EVASION_DR_EXPONENT), DODGE_CAP / 100
  );
  const hitChance = Math.max(EVASION_MIN_HIT_CHANCE, (1 - dodgeChance) * 100);
  const currentEntropy = dodgeEntropy ?? Math.floor(Math.random() * 100);
  const evasionRoll = rollEntropicEvasion(hitChance, currentEntropy);

  if (evasionRoll.isEvaded) {
    // Dodged hits still deal reduced damage (not full avoidance)
    const dodgedDamage = rawDamage * DODGE_DAMAGE_FLOOR;
    return { damage: dodgedDamage, isDodged: true, isBlocked: false, newDodgeEntropy: evasionRoll.newEntropy };
  }

  let physDmg = rawDamage * physRatio;
  let eleDmg = rawDamage * (1 - physRatio);

  // 2. Block check
  const blockChance = Math.min(stats.blockChance, BLOCK_CAP) / 100;
  const isBlocked = Math.random() < blockChance;
  if (isBlocked) {
    physDmg *= (1 - BLOCK_REDUCTION);
    eleDmg *= (1 - BLOCK_REDUCTION);
  }

  // 3. Armor mitigation (PoE-style, physical only — improved coefficient)
  if (physDmg > 0) {
    const armorReduction = stats.armor / (stats.armor + ARMOR_COEFFICIENT * physDmg);
    physDmg *= (1 - armorReduction);
  }

  // 4. Resist mitigation (elemental, average of capped resists)
  if (eleDmg > 0) {
    const avgResist = (
      Math.min(stats.fireResist, 75) +
      Math.min(stats.coldResist, 75) +
      Math.min(stats.lightningResist, 75) +
      Math.min(stats.chaosResist, 75)
    ) / 4;
    eleDmg *= (1 - avgResist / 100);
  }

  // 5. Flat DR from armor (applied to total damage after all other mitigation)
  let totalDmg = physDmg + eleDmg;
  if (stats.armor > 0) {
    const flatDR = Math.min(stats.armor / ARMOR_FLAT_DR_RATIO / 100, ARMOR_FLAT_DR_CAP);
    totalDmg *= (1 - flatDR);
  }

  // 6. Generic damage taken reduction (set bonuses, fortify, etc.)
  if (stats.damageTakenReduction > 0) {
    totalDmg *= (1 - stats.damageTakenReduction / 100);
  }

  return { damage: Math.max(0, totalDmg), isDodged: false, isBlocked, newDodgeEntropy: evasionRoll.newEntropy };
}

/**
 * Estimate effective HP considering armor, resists, dodge, and block.
 * Mirrors rollZoneAttack's exact mitigation pipeline (dodge → block → armor → resist → flatDR)
 * so the sim and engine always agree on defensive value.
 *
 * refDamage: reference hit size (armor is hit-size-dependent). Default 50 = mid-range zone hit.
 * refAccuracy: reference zone accuracy for dodge calc. Default 200 = mid-band zone.
 */
export function calcEhp(stats: ResolvedStats, refDamage: number = 50, refAccuracy: number = 200): number {
  // Dodge (expected value of entropy-based system)
  const rawDodge = stats.evasion / (stats.evasion + refAccuracy);
  const dodgeChance = Math.min(Math.pow(rawDodge, EVASION_DR_EXPONENT), DODGE_CAP / 100);

  const blockChance = Math.min(stats.blockChance, BLOCK_CAP) / 100;

  const physDmg = refDamage * ZONE_PHYS_RATIO;
  const eleDmg = refDamage * (1 - ZONE_PHYS_RATIO);

  // Mitigation helper: armor (phys only) → resist (ele only) → flat DR (total)
  function mitigate(rawPhys: number, rawEle: number): number {
    const armorRed = rawPhys > 0 ? stats.armor / (stats.armor + ARMOR_COEFFICIENT * rawPhys) : 0;
    const physAfter = rawPhys * (1 - armorRed);
    const avgResist = (
      Math.min(stats.fireResist, 75) +
      Math.min(stats.coldResist, 75) +
      Math.min(stats.lightningResist, 75) +
      Math.min(stats.chaosResist, 75)
    ) / 4;
    const eleAfter = rawEle * (1 - avgResist / 100);
    const total = physAfter + eleAfter;
    const flatDR = Math.min(stats.armor / ARMOR_FLAT_DR_RATIO / 100, ARMOR_FLAT_DR_CAP);
    return total * (1 - flatDR);
  }

  // Dodged hits bypass block/armor/resist — just DODGE_DAMAGE_FLOOR of raw
  const dodgedDmg = refDamage * DODGE_DAMAGE_FLOOR;
  // Blocked hits reduce phys+ele before armor/resist
  const blockedDmg = mitigate(physDmg * (1 - BLOCK_REDUCTION), eleDmg * (1 - BLOCK_REDUCTION));
  // Normal hits
  const normalDmg = mitigate(physDmg, eleDmg);

  const expectedDmg =
    dodgeChance * dodgedDmg +
    (1 - dodgeChance) * (blockChance * blockedDmg + (1 - blockChance) * normalDmg);

  const dmgRatio = expectedDmg / refDamage;
  return dmgRatio > 0 ? stats.maxLife / dmgRatio : stats.maxLife;
}

/**
 * Simulate all incoming zone attacks during one clear.
 * Returns new HP after damage and regen/leech.
 */
export function simulateClearDefense(
  currentHp: number, maxHp: number, stats: ResolvedStats,
  zone: ZoneDef, playerLevel: number, clearTime: number,
  playerDamageDealt: number,
  packMods?: { damageMult: number; hitCountMult: number },
): { newHp: number; totalDamage: number; dodges: number; blocks: number; hits: number; totalMitigated: number; regenCapUsed: number } {
  const levelMult = calcLevelDamageMult(playerLevel, zone.iLvlMin);
  const hitsPerClear = Math.min(50, Math.max(1, Math.floor(clearTime / ZONE_ATTACK_INTERVAL * (packMods?.hitCountMult ?? 1))));
  const baseDmgPerHit = (ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin) * levelMult * (packMods?.damageMult ?? 1);
  const zoneAccuracy = calcZoneAccuracy(zone.band, playerLevel, zone.iLvlMin);
  const physRatio = ZONE_PHYS_RATIO;

  let totalDamage = 0;
  let totalRawDamage = 0;
  let dodges = 0, blocks = 0, hits = 0;
  let dodgeEntropy = Math.floor(Math.random() * 100);
  const maxEs = stats.energyShield ?? 0;
  let currentEs = maxEs;
  const esRecoverPct = stats.esCombatRecharge ?? 0;
  let dodgeHealing = 0;
  let hitTakenHealing = 0;
  const lifeOnDodgePct = stats.lifeOnDodgePercent ?? 0;
  const lifeRecoverPct = stats.lifeRecoveryPerHit ?? 0;

  for (let i = 0; i < hitsPerClear; i++) {
    const variance = 0.8 + Math.random() * 0.4; // 80%-120%
    const rawHit = baseDmgPerHit * variance;
    const roll = rollZoneAttack(rawHit, physRatio, zoneAccuracy, stats, dodgeEntropy);
    dodgeEntropy = roll.newDodgeEntropy;
    if (roll.isDodged) {
      dodges++;
      totalRawDamage += rawHit;
      totalDamage += roll.damage;
      hits++;
      if (lifeOnDodgePct > 0) {
        dodgeHealing += maxHp * lifeOnDodgePct / 100;
      }
      continue;
    }
    if (roll.isBlocked) blocks++;
    hits++;
    totalRawDamage += rawHit;

    // ES absorbs damage before HP (mirrors tick.ts:258-270)
    let dmgAfterEs = roll.damage;
    if (currentEs > 0 && dmgAfterEs > 0) {
      const esAbsorbed = Math.min(currentEs, dmgAfterEs);
      currentEs -= esAbsorbed;
      dmgAfterEs -= esAbsorbed;
    }
    totalDamage += dmgAfterEs;

    // Cloth 6pc: recover % of max ES per hit taken
    if (esRecoverPct > 0 && maxEs > 0) {
      currentEs = Math.min(maxEs, currentEs + maxEs * esRecoverPct / 100);
    }
    // Plate 6pc: recover % of maxLife per hit taken
    if (lifeRecoverPct > 0) {
      hitTakenHealing += maxHp * lifeRecoverPct / 100;
    }
  }

  // Calculate total mitigated damage (pre-mitigation minus post-mitigation for non-dodged hits)
  const totalMitigated = totalRawDamage - totalDamage;

  // Dynamic regen cap: defense investment earns more regen
  const dynamicCapRatio = Math.min(
    BASE_REGEN_CAP_RATIO + totalMitigated * REGEN_CAP_PER_MITIGATED / maxHp,
    MAX_REGEN_CAP_RATIO,
  );

  // Regen: passive + leech (capped at dynamic ratio of maxHP per clear)
  const passiveRegen = maxHp * CLEAR_REGEN_RATIO + stats.lifeRegen * clearTime;
  const gearLeechRate = stats.lifeLeechPercent ? stats.lifeLeechPercent / 100 : 0;
  const leechHeal = playerDamageDealt * (LEECH_PERCENT + gearLeechRate);
  const totalRegen = Math.min(passiveRegen + leechHeal, maxHp * dynamicCapRatio);

  // Underlevel minimum net damage (prevents immortality via regen stacking)
  const totalHealing = totalRegen + dodgeHealing + hitTakenHealing;
  let netDamage = totalDamage - totalHealing;
  const levelDelta = zone.iLvlMin - playerLevel;
  if (levelDelta > 0) {
    const minNet = maxHp * UNDERLEVEL_MIN_NET_DAMAGE * levelDelta;
    netDamage = Math.max(netDamage, minNet);
  }

  const newHp = Math.max(0, Math.min(maxHp, currentHp - netDamage));
  return { newHp, totalDamage, dodges, blocks, hits, totalMitigated, regenCapUsed: dynamicCapRatio };
}

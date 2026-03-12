// ============================================================
// Gem Engine — gem creation, drops, upgrades
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Gem, GemType, GemTier, StatKey } from '../types';
import { generateId } from './items';
import { getGemDef, ALL_GEM_TYPES } from '../data/gems';
import {
  GEM_DROP_CHANCE, GEM_DROP_BAND_MULT,
  GEM_TIER_WEIGHTS_BY_BAND, BOSS_GEM_MIN_TIER,
} from '../data/balance';

/** Create a gem instance with a unique ID. */
export function createGem(type: GemType, tier: GemTier): Gem {
  return { id: generateId(), type, tier };
}

/** Pick a random tier using weighted probabilities for a given band. */
function rollGemTier(band: number): GemTier {
  const weights = GEM_TIER_WEIGHTS_BY_BAND[band] ?? GEM_TIER_WEIGHTS_BY_BAND[1];
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [tier, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return Number(tier) as GemTier;
  }
  return 5; // fallback
}

/** Roll a gem drop for a zone clear. Returns null if no drop. */
export function rollGemDrop(band: number): Gem | null {
  const dropChance = GEM_DROP_CHANCE * (GEM_DROP_BAND_MULT[band] ?? 1);
  if (Math.random() >= dropChance) return null;

  const tier = rollGemTier(band);
  const type = ALL_GEM_TYPES[Math.floor(Math.random() * ALL_GEM_TYPES.length)];
  return createGem(type, tier);
}

/** Guaranteed gem drop for boss kills, with minimum tier by band. */
export function rollGemForBoss(band: number): Gem {
  const minTier = BOSS_GEM_MIN_TIER[band] ?? 5;
  let tier = rollGemTier(band);
  // Ensure minimum tier (lower number = better)
  if (tier > minTier) tier = minTier;

  const type = ALL_GEM_TYPES[Math.floor(Math.random() * ALL_GEM_TYPES.length)];
  return createGem(type, tier);
}

/** Check if 3 gems of the same type+tier exist for upgrading. */
export function canUpgradeGem(gems: Gem[], type: GemType, tier: GemTier): boolean {
  if (tier <= 1) return false; // T1 is max, can't upgrade further
  const count = gems.filter(g => g.type === type && g.tier === tier).length;
  return count >= 3;
}

/** Consume 3 gems of same type+tier, produce 1 of tier-1 (better). */
export function upgradeGem(
  gems: Gem[],
  type: GemType,
  tier: GemTier,
): { newGem: Gem; remainingGems: Gem[] } {
  const outputTier = (tier - 1) as GemTier;
  const remainingGems = [...gems];
  let consumed = 0;
  for (let i = remainingGems.length - 1; i >= 0 && consumed < 3; i--) {
    if (remainingGems[i].type === type && remainingGems[i].tier === tier) {
      remainingGems.splice(i, 1);
      consumed++;
    }
  }
  const newGem = createGem(type, outputTier);
  return { newGem, remainingGems };
}

/** Get the stat key and value for a socketed gem. */
export function getGemStat(gem: Gem): { stat: StatKey; value: number } {
  const def = getGemDef(gem.type);
  return { stat: def.stat, value: def.tiers[gem.tier] };
}

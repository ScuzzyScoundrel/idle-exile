// ============================================================
// Idle Exile — Currency Crafting Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, CurrencyType, CraftResult, Affix, AffixTier, GearSlot, WeaponType, OffhandType, ArmorType } from '../types';
import { SOCKETABLE_SLOTS } from '../types';
import { rollAffixes, rollAffixCount, rollAffixValue, getAffixDef, classifyRarity, buildItemName, getWeightedTiers } from './items';
import { getAffixesForSlot } from '../data/affixes';
import { AFFIX_TIER_FLOOR_BY_ILVL } from '../data/balance';

// --- Helpers ---

/** Get all existing affix defIds on an item (both prefixes and suffixes). */
function existingDefIds(item: Item): string[] {
  return [
    ...item.prefixes.map((a) => a.defId),
    ...item.suffixes.map((a) => a.defId),
  ];
}

/** Create a shallow copy of an item (non-mutating). */
function cloneItem(item: Item): Item {
  return {
    ...item,
    prefixes: [...item.prefixes],
    suffixes: [...item.suffixes],
    baseStats: { ...item.baseStats },
    sockets: item.sockets ? [...item.sockets] : undefined,
  };
}

/** Reclassify an item's rarity and rebuild its name after affix changes. */
function reclassify(item: Item): void {
  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);
}

/**
 * Pick a random affix def from the given slot, respecting excludes.
 */
function pickRandomAffixDef(
  slot: 'prefix' | 'suffix',
  gearSlot: GearSlot,
  weaponType?: WeaponType,
  offhandType?: OffhandType,
  exclude: string[] = [],
  armorType?: ArmorType,
) {
  const available = getAffixesForSlot(gearSlot, weaponType, offhandType, slot, armorType)
    .filter((d) => !exclude.includes(d.id));
  if (available.length === 0) return null;

  const totalWeight = available.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = available[0];
  for (const def of available) {
    roll -= def.weight;
    if (roll <= 0) { chosen = def; break; }
  }
  return chosen;
}

/**
 * Roll a single affix with a biased tier distribution.
 * Uses the natural iLvl-weighted tier curve but applies a power-law bias
 * that shifts weight toward better (lower-numbered) tiers.
 *   bias=1  → natural distribution (Augment)
 *   bias=3  → moderate high-tier bias (Exalt)
 *   bias=8  → strong high-tier bias (Greater Exalt)
 *   bias=20 → massive T1 bias but can still hit T10 (Perfect Exalt)
 * All tiers remain possible — nothing is hard-capped.
 */
function rollBiasedTierAffix(
  slot: 'prefix' | 'suffix',
  iLvl: number,
  gearSlot: GearSlot,
  weaponType?: WeaponType,
  offhandType?: OffhandType,
  exclude: string[] = [],
  bias: number = 1,
  armorType?: ArmorType,
): Affix | null {
  const chosen = pickRandomAffixDef(slot, gearSlot, weaponType, offhandType, exclude, armorType);
  if (!chosen) return null;

  const weights = getWeightedTiers(iLvl);

  // Apply hard floor (same as rollAffixTier)
  let minTier = 1;
  for (const [maxILvl, floor] of AFFIX_TIER_FLOOR_BY_ILVL) {
    if (iLvl <= maxILvl) { minTier = floor; break; }
  }

  // Build biased weights: multiply each tier's weight by (11 - tier)^bias
  // This makes T1 dramatically more likely at high bias values
  const entries: { tier: AffixTier; weight: number }[] = [];
  for (let i = 1; i <= 10; i++) {
    const tier = i as AffixTier;
    const baseWeight = tier < minTier ? 0 : weights[tier];
    // (11 - tier) gives T1=10, T2=9, ... T10=1, then raise to bias power
    const biasMultiplier = Math.pow(11 - tier, bias);
    entries.push({ tier, weight: baseWeight * biasMultiplier });
  }

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let tier: AffixTier = 10 as AffixTier;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) { tier = entry.tier; break; }
  }

  const tierData = chosen.tiers[tier];
  const value = rollAffixValue(tierData.min, tierData.max);
  return { defId: chosen.id, tier, value };
}

// --- Main Crafting Function ---

/**
 * Apply a currency orb to an item.
 * Always returns a NEW item object (never mutates the original).
 * Returns { success, item, message }.
 */
export function applyCurrency(item: Item, currency: CurrencyType): CraftResult {
  switch (currency) {
    // -----------------------------------------------------------------
    // CHAOS: Completely re-roll all affixes (2-6 mods), like PoE chaos.
    // Respects item level for tier selection.
    // -----------------------------------------------------------------
    case 'chaos': {
      const newItem = cloneItem(item);

      // Wipe existing affixes
      newItem.prefixes = [];
      newItem.suffixes = [];

      // Roll fresh affix count (2-6) and split into prefixes/suffixes (max 3 each)
      const totalAffixes = rollAffixCount();
      let prefixCount = Math.min(Math.floor(totalAffixes / 2), 3);
      let suffixCount = Math.min(totalAffixes - prefixCount, 3);
      if (prefixCount + suffixCount < totalAffixes) {
        prefixCount = Math.min(totalAffixes - suffixCount, 3);
      }
      // Add some variance to prefix/suffix split
      if (prefixCount > 1 && suffixCount < 3 && Math.random() < 0.5) {
        prefixCount--;
        suffixCount++;
      } else if (suffixCount > 1 && prefixCount < 3 && Math.random() < 0.5) {
        suffixCount--;
        prefixCount++;
      }

      // Roll new affixes respecting item level
      const prefixes = rollAffixes('prefix', prefixCount, item.iLvl, item.slot, item.weaponType, item.offhandType, [], item.armorType);
      const excludeIds = prefixes.map(a => a.defId);
      const suffixes = rollAffixes('suffix', suffixCount, item.iLvl, item.slot, item.weaponType, item.offhandType, excludeIds, item.armorType);

      newItem.prefixes = prefixes;
      newItem.suffixes = suffixes;

      reclassify(newItem);
      return { success: true, item: newItem, message: `Chaos rerolled all affixes (${prefixes.length + suffixes.length} mods).` };
    }

    // -----------------------------------------------------------------
    // DIVINE: Reroll all affix values within their tier ranges.
    // No reclassification needed (tiers don't change).
    // -----------------------------------------------------------------
    case 'divine': {
      const totalAffixes = item.prefixes.length + item.suffixes.length;
      if (totalAffixes === 0) {
        return { success: false, item, message: 'Item has no affixes to reroll.' };
      }

      const newItem = cloneItem(item);

      newItem.prefixes = newItem.prefixes.map((affix) => {
        const def = getAffixDef(affix.defId);
        if (!def) return affix;
        const tierData = def.tiers[affix.tier];
        return { ...affix, value: rollAffixValue(tierData.min, tierData.max) };
      });

      newItem.suffixes = newItem.suffixes.map((affix) => {
        const def = getAffixDef(affix.defId);
        if (!def) return affix;
        const tierData = def.tiers[affix.tier];
        return { ...affix, value: rollAffixValue(tierData.min, tierData.max) };
      });

      return { success: true, item: newItem, message: 'Divine rerolled all affix values.' };
    }

    // -----------------------------------------------------------------
    // ANNUL: Remove one random affix. Floor at 2 affixes.
    // -----------------------------------------------------------------
    case 'annul': {
      const totalAffixes = item.prefixes.length + item.suffixes.length;
      if (totalAffixes <= 2) {
        return { success: false, item, message: 'Cannot annul below 2 affixes.' };
      }

      const newItem = cloneItem(item);

      const allAffixes: { slot: 'prefix' | 'suffix'; index: number }[] = [];
      newItem.prefixes.forEach((_, i) => allAffixes.push({ slot: 'prefix', index: i }));
      newItem.suffixes.forEach((_, i) => allAffixes.push({ slot: 'suffix', index: i }));

      const picked = allAffixes[Math.floor(Math.random() * allAffixes.length)];

      if (picked.slot === 'prefix') {
        newItem.prefixes.splice(picked.index, 1);
      } else {
        newItem.suffixes.splice(picked.index, 1);
      }

      reclassify(newItem);
      return { success: true, item: newItem, message: `Annulled a ${picked.slot}.` };
    }

    // -----------------------------------------------------------------
    // EXALT: Add one random affix (natural tier distribution)
    // -----------------------------------------------------------------
    case 'exalt': {
      const canPrefix = item.prefixes.length < 3;
      const canSuffix = item.suffixes.length < 3;
      if (!canPrefix && !canSuffix) {
        return { success: false, item, message: 'Item has no open affix slots.' };
      }

      const newItem = cloneItem(item);
      let addSlot: 'prefix' | 'suffix';
      if (canPrefix && canSuffix) {
        addSlot = Math.random() < 0.5 ? 'prefix' : 'suffix';
      } else {
        addSlot = canPrefix ? 'prefix' : 'suffix';
      }

      const exclude = existingDefIds(newItem);
      const newAffixes = rollAffixes(addSlot, 1, item.iLvl, item.slot, item.weaponType, item.offhandType, exclude, item.armorType);
      if (newAffixes.length === 0) {
        return { success: false, item, message: 'No available affixes to add.' };
      }

      if (addSlot === 'prefix') {
        newItem.prefixes.push(newAffixes[0]);
      } else {
        newItem.suffixes.push(newAffixes[0]);
      }

      reclassify(newItem);
      return { success: true, item: newItem, message: `Exalted a T${newAffixes[0].tier} ${addSlot}.` };
    }

    // -----------------------------------------------------------------
    // GREATER EXALT: Add one affix, biased toward high tiers
    // -----------------------------------------------------------------
    case 'greater_exalt': {
      const canPrefix = item.prefixes.length < 3;
      const canSuffix = item.suffixes.length < 3;
      if (!canPrefix && !canSuffix) {
        return { success: false, item, message: 'Item has no open affix slots.' };
      }

      const newItem = cloneItem(item);
      let addSlot: 'prefix' | 'suffix';
      if (canPrefix && canSuffix) {
        addSlot = Math.random() < 0.5 ? 'prefix' : 'suffix';
      } else {
        addSlot = canPrefix ? 'prefix' : 'suffix';
      }

      const exclude = existingDefIds(newItem);
      const newAffix = rollBiasedTierAffix(addSlot, item.iLvl, item.slot, item.weaponType, item.offhandType, exclude, 3, item.armorType);
      if (!newAffix) {
        return { success: false, item, message: 'No available affixes to add.' };
      }

      if (addSlot === 'prefix') {
        newItem.prefixes.push(newAffix);
      } else {
        newItem.suffixes.push(newAffix);
      }

      reclassify(newItem);
      return { success: true, item: newItem, message: `Greater Exalted a T${newAffix.tier} ${addSlot}.` };
    }

    // -----------------------------------------------------------------
    // PERFECT EXALT: Add one affix, strongly biased toward top tiers
    // -----------------------------------------------------------------
    case 'perfect_exalt': {
      const canPrefix = item.prefixes.length < 3;
      const canSuffix = item.suffixes.length < 3;
      if (!canPrefix && !canSuffix) {
        return { success: false, item, message: 'Item has no open affix slots.' };
      }

      const newItem = cloneItem(item);
      let addSlot: 'prefix' | 'suffix';
      if (canPrefix && canSuffix) {
        addSlot = Math.random() < 0.5 ? 'prefix' : 'suffix';
      } else {
        addSlot = canPrefix ? 'prefix' : 'suffix';
      }

      const exclude = existingDefIds(newItem);
      const newAffix = rollBiasedTierAffix(addSlot, item.iLvl, item.slot, item.weaponType, item.offhandType, exclude, 12, item.armorType);
      if (!newAffix) {
        return { success: false, item, message: 'No available affixes to add.' };
      }

      if (addSlot === 'prefix') {
        newItem.prefixes.push(newAffix);
      } else {
        newItem.suffixes.push(newAffix);
      }

      reclassify(newItem);
      return { success: true, item: newItem, message: `Perfect Exalted a T${newAffix.tier} ${addSlot}!` };
    }

    // -----------------------------------------------------------------
    // SOCKET: Add an empty socket to a socketable item
    // -----------------------------------------------------------------
    case 'socket': {
      if (!SOCKETABLE_SLOTS.includes(item.slot)) {
        return { success: false, item, message: 'This item cannot have sockets.' };
      }
      const currentSockets = item.sockets?.length ?? 0;
      const maxSockets = 1; // MVP: 1 socket per item
      if (currentSockets >= maxSockets) {
        return { success: false, item, message: 'Item already has a socket.' };
      }
      const newItem = cloneItem(item);
      newItem.sockets = [...(item.sockets ?? []), null];
      return { success: true, item: newItem, message: 'Added a socket to the item.' };
    }

    default:
      return { success: false, item, message: `Unknown currency: ${currency}` };
  }
}

// ============================================================
// Idle Exile — Currency Crafting Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, CurrencyType, CraftResult, Affix, AffixTier, GearSlot, WeaponType, OffhandType, ArmorType } from '../types';
import { SOCKETABLE_SLOTS } from '../types';
import { rollAffixes, rollAffixCount, rollAffixValue, getAffixDef, classifyRarity, buildItemName, getBestTierForILvl } from './items';
import { getAffixesForSlot } from '../data/affixes';

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
 * Roll a single affix from the top N realistic tiers for the item's iLvl.
 * topN=3: Exalt (15% best, 35% 2nd, 50% 3rd)
 * topN=2: Greater Exalt (40% best, 60% 2nd)
 */
function rollForcedHighTierAffix(
  slot: 'prefix' | 'suffix',
  iLvl: number,
  gearSlot: GearSlot,
  weaponType?: WeaponType,
  offhandType?: OffhandType,
  exclude: string[] = [],
  topN: 2 | 3 = 3,
  armorType?: ArmorType,
): Affix | null {
  const chosen = pickRandomAffixDef(slot, gearSlot, weaponType, offhandType, exclude, armorType);
  if (!chosen) return null;

  const bestTier = getBestTierForILvl(iLvl);
  const tiers: AffixTier[] = [];
  for (let t = bestTier; t <= 10 && tiers.length < topN; t++) {
    tiers.push(t as AffixTier);
  }

  let tier: AffixTier;
  if (tiers.length === 1) {
    tier = tiers[0];
  } else if (topN === 2 || tiers.length === 2) {
    // Greater Exalt: 40% best, 60% second-best
    tier = Math.random() < 0.40 ? tiers[0] : tiers[1];
  } else {
    // Exalt: 15% best, 35% second-best, 50% third-best
    const tierRoll = Math.random();
    if (tierRoll < 0.15) tier = tiers[0];
    else if (tierRoll < 0.50) tier = tiers[1];
    else tier = tiers[2];
  }

  const tierData = chosen.tiers[tier];
  const value = rollAffixValue(tierData.min, tierData.max);
  return { defId: chosen.id, tier, value };
}

/**
 * Roll a single affix at the best tier for the item's iLvl.
 * Low-iLvl items get their best realistic tier, not guaranteed T1.
 */
function rollPerfectAffix(
  slot: 'prefix' | 'suffix',
  iLvl: number,
  gearSlot: GearSlot,
  weaponType?: WeaponType,
  offhandType?: OffhandType,
  exclude: string[] = [],
  armorType?: ArmorType,
): Affix | null {
  const chosen = pickRandomAffixDef(slot, gearSlot, weaponType, offhandType, exclude, armorType);
  if (!chosen) return null;

  const tier = getBestTierForILvl(iLvl);
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
    // AUGMENT: Add 1 random affix to any item with <6 affixes
    // -----------------------------------------------------------------
    case 'augment': {
      const canPrefix = item.prefixes.length < 3;
      const canSuffix = item.suffixes.length < 3;
      const totalAffixes = item.prefixes.length + item.suffixes.length;

      if (totalAffixes >= 6 || (!canPrefix && !canSuffix)) {
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
      return { success: true, item: newItem, message: `Added a ${addSlot} to the item.` };
    }

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
    // EXALT: Add one random affix guaranteed T1-T3.
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
      const newAffix = rollForcedHighTierAffix(addSlot, item.iLvl, item.slot, item.weaponType, item.offhandType, exclude, 3, item.armorType);
      if (!newAffix) {
        return { success: false, item, message: 'No available affixes to add.' };
      }

      if (addSlot === 'prefix') {
        newItem.prefixes.push(newAffix);
      } else {
        newItem.suffixes.push(newAffix);
      }

      reclassify(newItem);
      return { success: true, item: newItem, message: `Exalted a T${newAffix.tier} ${addSlot}.` };
    }

    // -----------------------------------------------------------------
    // GREATER EXALT: Add one affix from top 2 tiers (40/60 weight)
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
      const newAffix = rollForcedHighTierAffix(addSlot, item.iLvl, item.slot, item.weaponType, item.offhandType, exclude, 2, item.armorType);
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
    // PERFECT EXALT: Add one guaranteed T1 affix
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
      const newAffix = rollPerfectAffix(addSlot, item.iLvl, item.slot, item.weaponType, item.offhandType, exclude, item.armorType);
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

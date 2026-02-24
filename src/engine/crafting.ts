// ============================================================
// Idle Exile — Currency Crafting Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, CurrencyType, CraftResult, Affix, AffixTier } from '../types';
import { rollAffixes, rollAffixValue, getAffixDef, classifyRarity, buildItemName } from './items';
import { AFFIX_DEFS } from '../data/affixes';

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
  };
}

/** Reclassify an item's rarity and rebuild its name after affix changes. */
function reclassify(item: Item): void {
  item.rarity = classifyRarity(item);
  item.name = buildItemName(item);
}

/** Roll a single affix forced T1-T3 (weighted: T3=50%, T2=35%, T1=15%). */
function rollForcedHighTierAffix(
  slot: 'prefix' | 'suffix',
  iLvl: number,
  exclude: string[],
): Affix | null {
  const available = AFFIX_DEFS.filter(
    (d) => d.slot === slot && !exclude.includes(d.id),
  );
  if (available.length === 0) return null;

  // Weighted random pick
  const totalWeight = available.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = available[0];
  for (const def of available) {
    roll -= def.weight;
    if (roll <= 0) {
      chosen = def;
      break;
    }
  }

  // Forced high tier: T3=50%, T2=35%, T1=15%
  const tierRoll = Math.random();
  let tier: AffixTier;
  if (tierRoll < 0.15) { tier = 1; }
  else if (tierRoll < 0.50) { tier = 2; }
  else { tier = 3; }

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
      const newAffixes = rollAffixes(addSlot, 1, item.iLvl, exclude);
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
    // CHAOS: Remove one random affix, add one of the same slot type.
    // -----------------------------------------------------------------
    case 'chaos': {
      const totalAffixes = item.prefixes.length + item.suffixes.length;
      if (totalAffixes === 0) {
        return { success: false, item, message: 'Item has no affixes to reroll.' };
      }

      const newItem = cloneItem(item);

      // Pick a random affix from combined list
      const allAffixes: { affix: Affix; slot: 'prefix' | 'suffix'; index: number }[] = [];
      newItem.prefixes.forEach((a, i) => allAffixes.push({ affix: a, slot: 'prefix', index: i }));
      newItem.suffixes.forEach((a, i) => allAffixes.push({ affix: a, slot: 'suffix', index: i }));

      const picked = allAffixes[Math.floor(Math.random() * allAffixes.length)];

      // Remove the picked affix
      if (picked.slot === 'prefix') {
        newItem.prefixes.splice(picked.index, 1);
      } else {
        newItem.suffixes.splice(picked.index, 1);
      }

      // Add one random affix of the same slot type
      const exclude = existingDefIds(newItem);
      const replacement = rollAffixes(picked.slot, 1, item.iLvl, exclude);
      if (replacement.length > 0) {
        if (picked.slot === 'prefix') {
          newItem.prefixes.push(replacement[0]);
        } else {
          newItem.suffixes.push(replacement[0]);
        }
      }

      reclassify(newItem);
      return { success: true, item: newItem, message: `Chaos rerolled a ${picked.slot}.` };
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
      const newAffix = rollForcedHighTierAffix(addSlot, item.iLvl, exclude);
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
    // SOCKET: Placeholder — coming soon
    // -----------------------------------------------------------------
    case 'socket': {
      return { success: false, item, message: 'Socket crafting coming soon!' };
    }

    default:
      return { success: false, item, message: `Unknown currency: ${currency}` };
  }
}

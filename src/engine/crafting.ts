// ============================================================
// Idle Exile — Currency Crafting Engine
// Pure functions: no React, no side effects, no DOM.
// ============================================================

import type { Item, CurrencyType, CraftResult, Affix, AffixTier } from '../types';
import { rollAffixes, rollAffixValue, getAffixDef } from './items';
import { AFFIX_DEFS } from '../data/affixes';
import { ITEM_BASE_DEFS } from '../data/items';

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

/** Roll a single affix with a forced tier (T1 or T2, 50/50). */
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

  // Forced T1 or T2 (50/50)
  const tier: AffixTier = Math.random() < 0.5 ? 1 : 2;
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
    // TRANSMUTE: Normal -> Magic. Roll 1 prefix + 0-1 suffix.
    // -----------------------------------------------------------------
    case 'transmute': {
      if (item.rarity !== 'normal') {
        return { success: false, item, message: 'Transmute only works on Normal items.' };
      }
      const newItem = cloneItem(item);
      newItem.rarity = 'magic';
      newItem.prefixes = rollAffixes('prefix', 1, item.iLvl);
      const suffixCount = Math.random() < 0.5 ? 1 : 0;
      newItem.suffixes = suffixCount > 0
        ? rollAffixes('suffix', suffixCount, item.iLvl, existingDefIds(newItem))
        : [];
      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: 'Item transmuted to Magic.' };
    }

    // -----------------------------------------------------------------
    // ALCHEMY: Normal -> Rare. Roll 1-3 prefixes + 1-3 suffixes (min 3).
    // -----------------------------------------------------------------
    case 'alchemy': {
      if (item.rarity !== 'normal') {
        return { success: false, item, message: 'Alchemy only works on Normal items.' };
      }
      const newItem = cloneItem(item);
      newItem.rarity = 'rare';

      let prefixCount = rollAffixValue(1, 3);
      let suffixCount = rollAffixValue(1, 3);
      while (prefixCount + suffixCount < 3) {
        if (Math.random() < 0.5) {
          prefixCount = Math.min(prefixCount + 1, 3);
        } else {
          suffixCount = Math.min(suffixCount + 1, 3);
        }
      }

      newItem.prefixes = rollAffixes('prefix', prefixCount, item.iLvl);
      newItem.suffixes = rollAffixes('suffix', suffixCount, item.iLvl, existingDefIds(newItem));
      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: 'Item alchemized to Rare.' };
    }

    // -----------------------------------------------------------------
    // REGAL: Magic -> Rare. Add 1-2 more random affixes.
    // -----------------------------------------------------------------
    case 'regal': {
      if (item.rarity !== 'magic') {
        return { success: false, item, message: 'Regal only works on Magic items.' };
      }
      const newItem = cloneItem(item);
      newItem.rarity = 'rare';

      const addCount = rollAffixValue(1, 2);
      const exclude = existingDefIds(newItem);

      for (let i = 0; i < addCount; i++) {
        // Decide prefix or suffix, respecting max 3 each
        const canPrefix = newItem.prefixes.length < 3;
        const canSuffix = newItem.suffixes.length < 3;
        if (!canPrefix && !canSuffix) break;

        let addSlot: 'prefix' | 'suffix';
        if (canPrefix && canSuffix) {
          addSlot = Math.random() < 0.5 ? 'prefix' : 'suffix';
        } else {
          addSlot = canPrefix ? 'prefix' : 'suffix';
        }

        const currentExclude = existingDefIds(newItem);
        const newAffixes = rollAffixes(addSlot, 1, item.iLvl, currentExclude);
        if (newAffixes.length > 0) {
          if (addSlot === 'prefix') {
            newItem.prefixes.push(newAffixes[0]);
          } else {
            newItem.suffixes.push(newAffixes[0]);
          }
        }
      }

      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: 'Item regaled to Rare.' };
    }

    // -----------------------------------------------------------------
    // AUGMENT: Add 1 random affix to an open slot.
    // Magic: max 1 prefix + 1 suffix. Rare: max 3 prefix + 3 suffix.
    // -----------------------------------------------------------------
    case 'augment': {
      if (item.rarity !== 'magic' && item.rarity !== 'rare') {
        return { success: false, item, message: 'Augment only works on Magic or Rare items.' };
      }

      const maxPrefixes = item.rarity === 'magic' ? 1 : 3;
      const maxSuffixes = item.rarity === 'magic' ? 1 : 3;
      const canPrefix = item.prefixes.length < maxPrefixes;
      const canSuffix = item.suffixes.length < maxSuffixes;

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
      const newAffixes = rollAffixes(addSlot, 1, item.iLvl, exclude);
      if (newAffixes.length === 0) {
        return { success: false, item, message: 'No available affixes to add.' };
      }

      if (addSlot === 'prefix') {
        newItem.prefixes.push(newAffixes[0]);
      } else {
        newItem.suffixes.push(newAffixes[0]);
      }

      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: `Added a ${addSlot} to the item.` };
    }

    // -----------------------------------------------------------------
    // CHAOS: Remove one random affix, add one of the same slot type.
    // -----------------------------------------------------------------
    case 'chaos': {
      if (item.rarity !== 'magic' && item.rarity !== 'rare') {
        return { success: false, item, message: 'Chaos only works on Magic or Rare items.' };
      }
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

      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: `Chaos rerolled a ${picked.slot}.` };
    }

    // -----------------------------------------------------------------
    // DIVINE: Reroll all affix values within their tier ranges.
    // -----------------------------------------------------------------
    case 'divine': {
      if (item.rarity !== 'magic' && item.rarity !== 'rare') {
        return { success: false, item, message: 'Divine only works on Magic or Rare items.' };
      }
      const totalAffixes = item.prefixes.length + item.suffixes.length;
      if (totalAffixes === 0) {
        return { success: false, item, message: 'Item has no affixes to reroll.' };
      }

      const newItem = cloneItem(item);

      // Reroll all prefix values
      newItem.prefixes = newItem.prefixes.map((affix) => {
        const def = getAffixDef(affix.defId);
        if (!def) return affix;
        const tierData = def.tiers[affix.tier];
        return { ...affix, value: rollAffixValue(tierData.min, tierData.max) };
      });

      // Reroll all suffix values
      newItem.suffixes = newItem.suffixes.map((affix) => {
        const def = getAffixDef(affix.defId);
        if (!def) return affix;
        const tierData = def.tiers[affix.tier];
        return { ...affix, value: rollAffixValue(tierData.min, tierData.max) };
      });

      return { success: true, item: newItem, message: 'Divine rerolled all affix values.' };
    }

    // -----------------------------------------------------------------
    // ANNUL: Remove one random affix.
    // -----------------------------------------------------------------
    case 'annul': {
      if (item.rarity !== 'magic' && item.rarity !== 'rare') {
        return { success: false, item, message: 'Annul only works on Magic or Rare items.' };
      }
      const totalAffixes = item.prefixes.length + item.suffixes.length;
      if (totalAffixes === 0) {
        return { success: false, item, message: 'Item has no affixes to remove.' };
      }

      const newItem = cloneItem(item);

      // Pick a random affix from combined list
      const allAffixes: { slot: 'prefix' | 'suffix'; index: number }[] = [];
      newItem.prefixes.forEach((_, i) => allAffixes.push({ slot: 'prefix', index: i }));
      newItem.suffixes.forEach((_, i) => allAffixes.push({ slot: 'suffix', index: i }));

      const picked = allAffixes[Math.floor(Math.random() * allAffixes.length)];

      if (picked.slot === 'prefix') {
        newItem.prefixes.splice(picked.index, 1);
      } else {
        newItem.suffixes.splice(picked.index, 1);
      }

      // Rare stays rare even if below 3 total affixes
      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: `Annulled a ${picked.slot}.` };
    }

    // -----------------------------------------------------------------
    // EXALT: Rare only. Add one random affix forced T1 or T2.
    // -----------------------------------------------------------------
    case 'exalt': {
      if (item.rarity !== 'rare') {
        return { success: false, item, message: 'Exalt only works on Rare items.' };
      }

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

      newItem.name = buildItemName(newItem);
      return { success: true, item: newItem, message: `Exalted a T${newAffix.tier} ${addSlot}.` };
    }

    default:
      return { success: false, item, message: `Unknown currency: ${currency}` };
  }
}

// --- Name Builder ---

/**
 * Build a display name for an item based on its rarity and affixes.
 * Normal: just the base name. Magic/Rare: prefix name + base name + suffix name.
 */
function buildItemName(item: Item): string {
  // Look up the base def to get the original base name
  const baseDef = ITEM_BASE_DEFS.find(
    (b) => b.id === item.baseId,
  );
  const baseName = baseDef?.name ?? 'Unknown';

  if (item.rarity === 'normal') return baseName;

  const parts: string[] = [];
  if (item.prefixes.length > 0) {
    const def = getAffixDef(item.prefixes[0].defId);
    if (def) parts.push(def.name);
  }
  parts.push(baseName);
  if (item.suffixes.length > 0) {
    const def = getAffixDef(item.suffixes[0].defId);
    if (def) parts.push(def.name);
  }

  return parts.join(' ');
}

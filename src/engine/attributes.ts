// ============================================================
// Attributes — derived stats from Str/Dex/Int/Spirit
// ============================================================
//
// Design reference: docs/design/CLASS_SYSTEM_PLAN.md §4
//
// Current implementation deviation from design doc: attribute % bonuses
// land in the SAME additive pool as affix `incX` stats. The design doc
// specifies attribute = "more" pool (multiplicative) + affix = "increased"
// pool (additive) for runaway-stacking protection. Separating the pools
// requires damage-calc refactor deferred to Phase 4. For MVP stats feel
// correct at expected endgame attribute totals (~500 points = reasonable,
// non-explosive scaling).

import type { AttributeAllocation, Character, Item, ResolvedStats } from '../types';
import { CLASS_DEFS } from '../data/classes';

/** Per-point scaling factors per attribute. */
export const ATTRIBUTE_SCALING = {
  strength: {
    maxLife: 3,
    incArmorPct: 0.2,
    incMeleeDamagePct: 0.5,
  },
  dexterity: {
    accuracy: 2,
    evasion: 0.5,
    incAttackSpeedPct: 0.3,
  },
  intelligence: {
    // maxMana: 3 — wired when the universal Mana schema lands (Phase 2c).
    energyShield: 2,
    incSpellDamagePct: 0.5,
  },
  spirit: {
    chaosResist: 1,
    incDoTDamagePct: 0.5,
    ailmentPotencyPct: 0.3,
  },
} as const;

/**
 * Compute a character's total attribute values.
 * Total = class starting baseline + allocated points (+ gear bonuses — Phase 2e).
 */
export function getTotalAttributes(char: Character): AttributeAllocation {
  const classDef = CLASS_DEFS[char.class];
  const classBase = classDef?.startingAttributes ?? {
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    spirit: 0,
  };
  const a = char.attributes.allocated;
  return {
    strength: classBase.strength + a.strength,
    dexterity: classBase.dexterity + a.dexterity,
    intelligence: classBase.intelligence + a.intelligence,
    spirit: classBase.spirit + a.spirit,
  };
}

/**
 * Apply attribute-derived bonuses to ResolvedStats in place.
 * Call AFTER class baseStatBonuses + per-level bonuses, BEFORE equipment stats.
 */
export function applyAttributeBonuses(stats: ResolvedStats, attrs: AttributeAllocation): void {
  const s = ATTRIBUTE_SCALING;
  stats.maxLife          += attrs.strength * s.strength.maxLife;
  stats.incArmor         += attrs.strength * s.strength.incArmorPct;
  stats.incMeleeDamage   += attrs.strength * s.strength.incMeleeDamagePct;

  stats.accuracy         += attrs.dexterity * s.dexterity.accuracy;
  stats.evasion          += attrs.dexterity * s.dexterity.evasion;
  stats.incAttackSpeed   += attrs.dexterity * s.dexterity.incAttackSpeedPct;

  stats.energyShield     += attrs.intelligence * s.intelligence.energyShield;
  stats.incSpellDamage   += attrs.intelligence * s.intelligence.incSpellDamagePct;

  stats.chaosResist      += attrs.spirit * s.spirit.chaosResist;
  stats.incDoTDamage     += attrs.spirit * s.spirit.incDoTDamagePct;
  stats.ailmentPotency   += attrs.spirit * s.spirit.ailmentPotencyPct;
}

/**
 * Check whether a character meets an item's attribute requirement.
 * Items without `attributeRequirement` are always equippable (returns true).
 * Design: docs/design/CLASS_SYSTEM_PLAN.md §6.
 */
export function meetsAttributeRequirement(char: Character, item: Item): boolean {
  const req = item.attributeRequirement;
  if (!req) return true;
  const total = getTotalAttributes(char);
  if (req.strength     !== undefined && total.strength     < req.strength)     return false;
  if (req.dexterity    !== undefined && total.dexterity    < req.dexterity)    return false;
  if (req.intelligence !== undefined && total.intelligence < req.intelligence) return false;
  if (req.spirit       !== undefined && total.spirit       < req.spirit)       return false;
  return true;
}

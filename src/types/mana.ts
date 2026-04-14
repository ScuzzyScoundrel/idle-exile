// ============================================================
// Mana — universal resource name, class-flavored regen dynamics
// ============================================================
//
// Design reference: docs/design/CLASS_SYSTEM_PLAN.md §Mana Resource System
//
// ONE player-facing resource ("Mana") with per-class FLAVOR rules that
// change HOW it regenerates. Multiclass-safe (flavors merge at 75%
// contribution from each class, per design plan).
//
// Engine rules (per-flavor generation/consumption) land in Phase 6 with
// the combat-timing rework. Phase 2c only lands the data schema; the
// simulator ignores mana cost until Phase 6.

import type { CharacterClass } from './character';

/** Runtime mana state on Character. */
export interface ManaState {
  current: number;
  max: number;
  /** Passive regen per second (mage-style flavors mostly). */
  regenPerSec: number;
}

/**
 * How a class's mana generates. Multiple flavors stack on the same class
 * (e.g. Witchdoctor has passive regen AND chunk-on-kill).
 *
 * - `passive`      — regen per second while out of combat
 * - `onKill`       — chunk gained when an enemy dies
 * - `onHitDealt`   — gained per hit landed (rage-flavored)
 * - `onHitTaken`   — gained per hit received (rage-flavored)
 * - `onCrit`       — gained per critical hit (energy-flavored)
 */
export interface ManaConfig {
  maxMana: number;
  /** If true, new characters start at full mana; if false, empty. */
  startFull: boolean;
  passiveRegenPerSec: number;
  onKillGain: number;
  onHitDealtGain: number;
  onHitTakenGain: number;
  onCritGain: number;
}

/**
 * Per-class mana configuration. MVP classes fully specified;
 * legacy classes get sensible defaults until Phase 2g cleanup removes them.
 */
export const CLASS_MANA_CONFIG: Record<CharacterClass, ManaConfig> = {
  // MVP classes (per CLASS_SYSTEM_PLAN §Mana)
  witchdoctor: {
    maxMana: 150,
    startFull: true,
    passiveRegenPerSec: 2,
    onKillGain: 15,
    onHitDealtGain: 0,
    onHitTakenGain: 0,
    onCritGain: 0,
  },
  assassin: {
    maxMana: 50,
    startFull: true,
    passiveRegenPerSec: 8,
    onKillGain: 0,
    onHitDealtGain: 0,
    onHitTakenGain: 0,
    onCritGain: 5,
  },

  // Legacy classes — will be removed in Phase 2g once multi-class content
  // exists for MVP. Values kept sensible in case they're played today.
  warrior: {
    maxMana: 40,
    startFull: false,
    passiveRegenPerSec: 0,
    onKillGain: 3,
    onHitDealtGain: 2,
    onHitTakenGain: 4,
    onCritGain: 0,
  },
  mage: {
    maxMana: 120,
    startFull: true,
    passiveRegenPerSec: 6,
    onKillGain: 0,
    onHitDealtGain: 0,
    onHitTakenGain: 0,
    onCritGain: 0,
  },
  ranger: {
    maxMana: 60,
    startFull: true,
    passiveRegenPerSec: 7,
    onKillGain: 0,
    onHitDealtGain: 0,
    onHitTakenGain: 0,
    onCritGain: 4,
  },
  rogue: {
    maxMana: 50,
    startFull: true,
    passiveRegenPerSec: 8,
    onKillGain: 2,
    onHitDealtGain: 0,
    onHitTakenGain: 0,
    onCritGain: 3,
  },
};

/** Create initial ManaState for a new character of the given class. */
export function createInitialManaState(classId: CharacterClass): ManaState {
  const cfg = CLASS_MANA_CONFIG[classId];
  return {
    current: cfg.startFull ? cfg.maxMana : 0,
    max: cfg.maxMana,
    regenPerSec: cfg.passiveRegenPerSec,
  };
}

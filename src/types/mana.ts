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
  /** E20 (owner decision 2026-07-12): martial classes pace on class
   *  ledgers + cooldowns and do NOT use mana — no cast gate, no cost,
   *  no mana bar. Casters keep mana as sustained-output pacing. */
  usesMana: boolean;
}

/**
 * Per-class mana configuration. MVP classes fully specified;
 * legacy classes get sensible defaults until Phase 2g cleanup removes them.
 */
export const CLASS_MANA_CONFIG: Record<CharacterClass, ManaConfig> = {
  // MVP classes (per CLASS_SYSTEM_PLAN §Mana)
  witchdoctor: {
    usesMana: true,
    maxMana: 150,
    startFull: true,
    passiveRegenPerSec: 6,
    onKillGain: 20,
    onHitDealtGain: 0.5,
    onHitTakenGain: 0,
    onCritGain: 0,
  },
  assassin: {
    usesMana: false,
    maxMana: 50,
    startFull: true,
    passiveRegenPerSec: 10,
    onKillGain: 3,
    onHitDealtGain: 1,
    onHitTakenGain: 0,
    onCritGain: 6,
  },

  // Phase B classes (§15.4 rename 2026-05-04: warrior→berserker, mage→sorcerer, ranger→hunter; rogue absorbed into assassin).
  berserker: {
    usesMana: false,
    maxMana: 100,
    startFull: false,
    passiveRegenPerSec: 0,
    onKillGain: 10,
    onHitDealtGain: 5,
    onHitTakenGain: 8,
    onCritGain: 0,
  },
  sorcerer: {
    usesMana: true,
    maxMana: 130,
    startFull: true,
    passiveRegenPerSec: 8,
    onKillGain: 8,
    onHitDealtGain: 0,
    onHitTakenGain: 0,
    onCritGain: 4,
  },
  hunter: {
    usesMana: false,
    maxMana: 80,
    startFull: true,
    passiveRegenPerSec: 9,
    onKillGain: 5,
    onHitDealtGain: 0.5,
    onHitTakenGain: 0,
    onCritGain: 6,
  },
};

/** E20: does this class pay/gate on mana at all? */
export function classUsesMana(classId: CharacterClass): boolean {
  return CLASS_MANA_CONFIG[classId]?.usesMana ?? true;
}

/** Create initial ManaState for a new character of the given class. */
export function createInitialManaState(classId: CharacterClass): ManaState {
  const cfg = CLASS_MANA_CONFIG[classId];
  return {
    current: cfg.startFull ? cfg.maxMana : 0,
    max: cfg.maxMana,
    regenPerSec: cfg.passiveRegenPerSec,
  };
}

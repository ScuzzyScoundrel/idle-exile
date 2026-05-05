// ============================================================
// Barrel export — All weapon skill-graph registries
// Merges per-weapon maps into a single ALL_SKILL_GRAPHS record.
// ============================================================

import type { SkillGraph } from '../../types';
import { WAND_SKILL_GRAPHS } from './wand';
import { SWORD_SKILL_GRAPHS } from './sword';
import { AXE_SKILL_GRAPHS } from './axe';
import { DAGGER_SKILL_GRAPHS } from './dagger';
import { MACE_SKILL_GRAPHS } from './mace';
import { BOW_SKILL_GRAPHS } from './bow';
import { STAFF_SKILL_GRAPHS } from './staff';
import { CROSSBOW_SKILL_GRAPHS } from './crossbow';
import { GREATSWORD_SKILL_GRAPHS } from './greatsword';
import { GREATAXE_SKILL_GRAPHS } from './greataxe';
import { MAUL_SKILL_GRAPHS } from './maul';
import { SCEPTER_SKILL_GRAPHS } from './scepter';
import { GAUNTLET_SKILL_GRAPHS } from './gauntlet';
import { TOME_SKILL_GRAPHS } from './tome';

/** Every skill graph in the game, keyed by skill ID. */
export const ALL_SKILL_GRAPHS: Record<string, SkillGraph> = {
  ...WAND_SKILL_GRAPHS,
  ...SWORD_SKILL_GRAPHS,
  ...AXE_SKILL_GRAPHS,
  ...DAGGER_SKILL_GRAPHS,
  ...MACE_SKILL_GRAPHS,
  ...BOW_SKILL_GRAPHS,
  ...STAFF_SKILL_GRAPHS,
  ...CROSSBOW_SKILL_GRAPHS,
  ...GREATSWORD_SKILL_GRAPHS,
  ...GREATAXE_SKILL_GRAPHS,
  ...MAUL_SKILL_GRAPHS,
  ...SCEPTER_SKILL_GRAPHS,
  ...GAUNTLET_SKILL_GRAPHS,
  ...TOME_SKILL_GRAPHS,
};

// Re-export individual weapon maps for direct access
export { WAND_SKILL_GRAPHS } from './wand';
export { SWORD_SKILL_GRAPHS } from './sword';
export { AXE_SKILL_GRAPHS } from './axe';
export { DAGGER_SKILL_GRAPHS } from './dagger';
export { MACE_SKILL_GRAPHS } from './mace';
export { BOW_SKILL_GRAPHS } from './bow';
export { STAFF_SKILL_GRAPHS } from './staff';
export { CROSSBOW_SKILL_GRAPHS } from './crossbow';
export { GREATSWORD_SKILL_GRAPHS } from './greatsword';
export { GREATAXE_SKILL_GRAPHS } from './greataxe';
export { MAUL_SKILL_GRAPHS } from './maul';
export { SCEPTER_SKILL_GRAPHS } from './scepter';
export { GAUNTLET_SKILL_GRAPHS } from './gauntlet';
export { TOME_SKILL_GRAPHS } from './tome';

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

/** Every skill graph in the game, keyed by skill ID. */
export const ALL_SKILL_GRAPHS: Record<string, SkillGraph> = {
  ...WAND_SKILL_GRAPHS,
  ...SWORD_SKILL_GRAPHS,
  ...AXE_SKILL_GRAPHS,
  ...DAGGER_SKILL_GRAPHS,
  ...MACE_SKILL_GRAPHS,
  ...BOW_SKILL_GRAPHS,
};

// Re-export individual weapon maps for direct access
export { WAND_SKILL_GRAPHS } from './wand';
export { SWORD_SKILL_GRAPHS } from './sword';
export { AXE_SKILL_GRAPHS } from './axe';
export { DAGGER_SKILL_GRAPHS } from './dagger';
export { MACE_SKILL_GRAPHS } from './mace';
export { BOW_SKILL_GRAPHS } from './bow';

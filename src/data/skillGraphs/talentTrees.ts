// ============================================================
// Barrel export — All talent tree registries
// Keyed by skill ID for lookup in unifiedSkills.ts
// ============================================================

import type { TalentTree } from '../../types';
import {
  STAB_TALENT_TREE, BLADE_FLURRY_TALENT_TREE, FROST_FAN_TALENT_TREE,
  VIPER_STRIKE_TALENT_TREE, SHADOW_STEP_TALENT_TREE,
  ASSASSINATE_TALENT_TREE, LIGHTNING_LUNGE_TALENT_TREE,
  BLADE_WARD_TALENT_TREE, BLADE_TRAP_TALENT_TREE, SHADOW_DASH_TALENT_TREE,
} from './dagger_talents';

export const ALL_TALENT_TREES: Record<string, TalentTree> = {
  dagger_stab: STAB_TALENT_TREE,
  dagger_blade_dance: BLADE_FLURRY_TALENT_TREE,          // temporary: replaced when JSON transpiled
  dagger_fan_of_knives: FROST_FAN_TALENT_TREE,
  dagger_viper_strike: VIPER_STRIKE_TALENT_TREE,
  dagger_shadow_mark: SHADOW_STEP_TALENT_TREE,           // temporary: replaced when JSON transpiled
  dagger_assassinate: ASSASSINATE_TALENT_TREE,
  dagger_chain_strike: LIGHTNING_LUNGE_TALENT_TREE,       // temporary: replaced when JSON transpiled
  dagger_blade_ward: BLADE_WARD_TALENT_TREE,
  dagger_blade_trap: BLADE_TRAP_TALENT_TREE,
  dagger_shadow_dash: SHADOW_DASH_TALENT_TREE,
};

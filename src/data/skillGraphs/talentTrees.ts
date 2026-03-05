// ============================================================
// Barrel export — All talent tree registries
// Keyed by skill ID for lookup in unifiedSkills.ts
// ============================================================

import type { TalentTree } from '../../types';
import {
  STAB_TALENT_TREE, BLADE_FLURRY_TALENT_TREE, FROST_FAN_TALENT_TREE,
  VIPER_STRIKE_TALENT_TREE, SHADOW_STEP_TALENT_TREE,
  ASSASSINATE_TALENT_TREE, LIGHTNING_LUNGE_TALENT_TREE,
} from './dagger_talents';

export const ALL_TALENT_TREES: Record<string, TalentTree> = {
  dagger_stab: STAB_TALENT_TREE,
  dagger_blade_flurry: BLADE_FLURRY_TALENT_TREE,
  dagger_fan_of_knives: FROST_FAN_TALENT_TREE,
  dagger_viper_strike: VIPER_STRIKE_TALENT_TREE,
  dagger_smoke_screen: SHADOW_STEP_TALENT_TREE,
  dagger_assassinate: ASSASSINATE_TALENT_TREE,
  dagger_lightning_lunge: LIGHTNING_LUNGE_TALENT_TREE,
};

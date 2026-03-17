// ============================================================
// Barrel export — All talent tree registries
// Keyed by skill ID for lookup in unifiedSkills.ts
// ============================================================

import type { TalentTree } from '../../types';
import {
  STAB_TALENT_TREE, BLADE_DANCE_TALENT_TREE, FAN_OF_KNIVES_TALENT_TREE,
  VIPER_STRIKE_TALENT_TREE, SHADOW_MARK_TALENT_TREE,
  ASSASSINATE_TALENT_TREE, CHAIN_STRIKE_TALENT_TREE,
  BLADE_WARD_TALENT_TREE, BLADE_TRAP_TALENT_TREE, SHADOW_DASH_TALENT_TREE,
} from './dagger_talents';

export const ALL_TALENT_TREES: Record<string, TalentTree> = {
  dagger_stab: STAB_TALENT_TREE,
  dagger_blade_dance: BLADE_DANCE_TALENT_TREE,
  dagger_fan_of_knives: FAN_OF_KNIVES_TALENT_TREE,
  dagger_viper_strike: VIPER_STRIKE_TALENT_TREE,
  dagger_shadow_mark: SHADOW_MARK_TALENT_TREE,
  dagger_assassinate: ASSASSINATE_TALENT_TREE,
  dagger_chain_strike: CHAIN_STRIKE_TALENT_TREE,
  dagger_blade_ward: BLADE_WARD_TALENT_TREE,
  dagger_blade_trap: BLADE_TRAP_TALENT_TREE,
  dagger_shadow_dash: SHADOW_DASH_TALENT_TREE,
};

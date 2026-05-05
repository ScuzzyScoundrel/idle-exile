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
import { STAFF_MASS_SACRIFICE_TALENT_TREE } from './staff_mass_sacrifice_talents';
import { STAFF_HAUNT_TALENT_TREE } from './staff_haunt_talents';
import { STAFF_SOUL_HARVEST_TALENT_TREE } from './staff_soul_harvest_talents';
import { STAFF_ZOMBIE_DOGS_TALENT_TREE } from './staff_zombie_dogs_talents';
import { STAFF_FETISH_SWARM_TALENT_TREE } from './staff_fetish_swarm_talents';
import { STAFF_SPIRIT_BARRAGE_TALENT_TREE } from './staff_spirit_barrage_talents';
import { STAFF_PLAGUE_OF_TOADS_TALENT_TREE } from './staff_plague_of_toads_talents';
import { STAFF_BOUNCING_SKULL_TALENT_TREE } from './staff_bouncing_skull_talents';
import { STAFF_HEX_TALENT_TREE } from './staff_hex_talents';
import { STAFF_LOCUST_SWARM_TALENT_TREE } from './staff_locust_swarm_talents';

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
  // Staff v2
  staff_mass_sacrifice: STAFF_MASS_SACRIFICE_TALENT_TREE,
  staff_haunt: STAFF_HAUNT_TALENT_TREE,
  staff_soul_harvest: STAFF_SOUL_HARVEST_TALENT_TREE,
  staff_zombie_dogs: STAFF_ZOMBIE_DOGS_TALENT_TREE,
  staff_fetish_swarm: STAFF_FETISH_SWARM_TALENT_TREE,
  staff_spirit_barrage: STAFF_SPIRIT_BARRAGE_TALENT_TREE,
  staff_plague_of_toads: STAFF_PLAGUE_OF_TOADS_TALENT_TREE,
  staff_bouncing_skull: STAFF_BOUNCING_SKULL_TALENT_TREE,
  staff_hex: STAFF_HEX_TALENT_TREE,
  staff_locust_swarm: STAFF_LOCUST_SWARM_TALENT_TREE,
};

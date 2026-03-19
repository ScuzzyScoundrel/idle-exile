// ============================================================
// Skill Definitions Barrel — merges per-weapon files into
// ACTIVE_SKILL_DEFS, ABILITY_DEFS, SKILL_DEFS + lookup functions
// ============================================================

import type { SkillDef, SkillKind, WeaponType, ActiveSkillDef, AbilityDef } from '../../types';
import { ALL_SKILL_GRAPHS } from '../skillGraphs/index';
import { ALL_TALENT_TREES } from '../skillGraphs/talentTrees';

// Per-weapon imports
import { SWORD_ACTIVE_SKILLS, SWORD_ABILITIES } from './sword';
import { DAGGER_ACTIVE_SKILLS, DAGGER_ABILITIES } from './dagger';
import { STAFF_ACTIVE_SKILLS, STAFF_ABILITIES } from './staff';
import { BOW_ACTIVE_SKILLS, BOW_ABILITIES } from './bow';
import { SECONDARY_ACTIVE_SKILLS, SECONDARY_ABILITIES } from './secondary';

// ============================================================
// Merged arrays (preserve original export names)
// ============================================================

export const ACTIVE_SKILL_DEFS: ActiveSkillDef[] = [
  ...SWORD_ACTIVE_SKILLS,
  ...DAGGER_ACTIVE_SKILLS,
  ...STAFF_ACTIVE_SKILLS,
  ...BOW_ACTIVE_SKILLS,
  ...SECONDARY_ACTIVE_SKILLS,
];

export const ABILITY_DEFS: AbilityDef[] = [
  ...SWORD_ABILITIES,
  ...DAGGER_ABILITIES,
  ...STAFF_ABILITIES,
  ...BOW_ABILITIES,
  ...SECONDARY_ABILITIES,
];

// ============================================================
// UNIFIED SKILL CONVERSION LOGIC
// ============================================================

// IDs that exist in both active skills and abilities -- abilities get '_buff' suffix
const CONFLICTING_ABILITY_IDS = new Set([
  'axe_cleave',
  'mace_shockwave',
  'crossbow_explosive_bolt',
  'bow_rapid_fire',
  'wand_chain_lightning',
]);

/** Map from old ability ID -> unified ID (for migration in 10G). */
export const ABILITY_ID_MIGRATION: Record<string, string> = {};

// Dagger v2: active skill ID renames
ABILITY_ID_MIGRATION['dagger_blade_flurry'] = 'dagger_blade_dance';
ABILITY_ID_MIGRATION['dagger_lightning_lunge'] = 'dagger_chain_strike';
ABILITY_ID_MIGRATION['dagger_smoke_screen'] = 'dagger_shadow_mark';

// Convert ActiveSkillDefs -> SkillDefs (kind: 'active')
const convertedActiveSkills: SkillDef[] = ACTIVE_SKILL_DEFS.map(s => ({
  id: s.id,
  name: s.name,
  description: s.description,
  weaponType: s.weaponType,
  kind: 'active' as SkillKind,
  tags: s.tags,
  icon: s.icon,
  levelRequired: s.levelRequired,
  baseDamage: s.baseDamage,
  weaponDamagePercent: s.weaponDamagePercent,
  spellPowerRatio: s.spellPowerRatio,
  castTime: s.castTime,
  cooldown: s.cooldown,
  hitCount: s.hitCount,
  chainCount: s.chainCount,
  dotDuration: s.dotDuration,
  dotDamagePercent: s.dotDamagePercent,
  baseConversion: s.baseConversion,
  // Wire graph tree for all weapons
  skillGraph: ALL_SKILL_GRAPHS[s.id],
  talentTree: ALL_TALENT_TREES[s.id],
}));

// Convert AbilityDefs -> SkillDefs (keep original kind)
const convertedAbilities: SkillDef[] = ABILITY_DEFS.map(a => {
  const needsRename = CONFLICTING_ABILITY_IDS.has(a.id);
  const newId = needsRename ? `${a.id}_buff` : a.id;

  // Track all ability ID mappings (even unchanged ones) for migration
  ABILITY_ID_MIGRATION[a.id] = newId;

  // Check if this ability has a graph tree (replaces old skillTree)
  const graph = ALL_SKILL_GRAPHS[newId];

  return {
    id: newId,
    name: a.name,
    description: a.description,
    weaponType: a.weaponType,
    kind: a.kind as SkillKind,
    tags: [],
    icon: a.icon,
    levelRequired: 1,
    // Damage fields zeroed for non-active skills
    baseDamage: 0,
    weaponDamagePercent: 0,
    spellPowerRatio: 0,
    castTime: 0,
    cooldown: a.cooldown ?? 0,
    // Buff/utility fields
    duration: a.duration,
    effect: a.effect,
    // Graph tree replaces old skillTree for wand abilities
    skillTree: graph ? undefined : a.skillTree,
    skillGraph: graph,
  };
});

/** All unified skill definitions (135). */
export const SKILL_DEFS: SkillDef[] = [
  ...convertedActiveSkills,
  ...convertedAbilities,
];

// --- Unified Lookup Maps ---

const skillsByWeapon = new Map<WeaponType, SkillDef[]>();
const skillById = new Map<string, SkillDef>();

for (const skill of SKILL_DEFS) {
  skillById.set(skill.id, skill);
  if (!skillsByWeapon.has(skill.weaponType)) skillsByWeapon.set(skill.weaponType, []);
  skillsByWeapon.get(skill.weaponType)!.push(skill);
}

/** Get all unified skills for a weapon type. */
export function getUnifiedSkillsForWeapon(weaponType: WeaponType): SkillDef[] {
  return skillsByWeapon.get(weaponType) ?? [];
}

/** Get a single unified skill definition by ID. */
export function getUnifiedSkillDef(id: string): SkillDef | undefined {
  return skillById.get(id);
}

/** Get all skills of a specific kind. */
export function getSkillsByKind(kind: SkillKind): SkillDef[] {
  return SKILL_DEFS.filter(s => s.kind === kind);
}

/** Get all skills of a specific kind for a weapon type. */
export function getSkillsByKindForWeapon(kind: SkillKind, weaponType: WeaponType): SkillDef[] {
  return (skillsByWeapon.get(weaponType) ?? []).filter(s => s.kind === kind);
}

// ============================================================
// LEGACY LOOKUP RE-EXPORTS
// ============================================================

const activeSkillsByWeapon = new Map<WeaponType, ActiveSkillDef[]>();
const activeSkillById = new Map<string, ActiveSkillDef>();

for (const skill of ACTIVE_SKILL_DEFS) {
  activeSkillById.set(skill.id, skill);
  if (!activeSkillsByWeapon.has(skill.weaponType)) activeSkillsByWeapon.set(skill.weaponType, []);
  activeSkillsByWeapon.get(skill.weaponType)!.push(skill);
}

/** Get all active skills available for a weapon type (legacy). */
export function getSkillsForWeapon(weaponType: WeaponType): ActiveSkillDef[] {
  return activeSkillsByWeapon.get(weaponType) ?? [];
}

/** Get a single active skill definition by ID (legacy). */
export function getSkillDef(id: string): ActiveSkillDef | undefined {
  return activeSkillById.get(id);
}

/** Get all abilities for a given weapon type (legacy). */
export function getAbilitiesForWeapon(weaponType: WeaponType): AbilityDef[] {
  return ABILITY_DEFS.filter(a => a.weaponType === weaponType);
}

/** Look up an ability definition by ID (legacy). */
export function getAbilityDef(id: string): AbilityDef | undefined {
  return ABILITY_DEFS.find(a => a.id === id);
}

// ============================================================
// Skill Definitions Barrel — merges per-weapon files into
// ACTIVE_SKILL_DEFS, ABILITY_DEFS, SKILL_DEFS + lookup functions
// ============================================================

import type { SkillDef, SkillKind, WeaponType, ActiveSkillDef, AbilityDef } from '../../types';
// 2026-05-04 archive sweep: per-skill `skillGraphs/` + per-ability `classTalents.ts`
// retired in favor of the JSON class-tree registry (`src/data/classTrees/`).
// Originals preserved at `src/data/_archive/` for historical reference.

// Per-weapon imports
import { SWORD_ACTIVE_SKILLS, SWORD_ABILITIES } from './sword';
import { DAGGER_ACTIVE_SKILLS, DAGGER_ABILITIES } from './dagger';
import { STAFF_ACTIVE_SKILLS, STAFF_ABILITIES } from './staff';
import { BOW_ACTIVE_SKILLS, BOW_ABILITIES } from './bow';
// Phase C3 step 1 (2026-05-04): Berserker + Witchdoctor default weapons.
import { FLAIL_ACTIVE_SKILLS, FLAIL_ABILITIES } from './flail';
import { CLAWS_ACTIVE_SKILLS, CLAWS_ABILITIES } from './claws';
import { SCYTHE_ACTIVE_SKILLS, SCYTHE_ABILITIES } from './scythe';
// Phase C3 step 2 (2026-05-04): extracted from secondary.ts + rebuilt to v2 quality bar.
import { WAND_ACTIVE_SKILLS, WAND_ABILITIES } from './wand';
import { GAUNTLET_ACTIVE_SKILLS, GAUNTLET_ABILITIES } from './gauntlet';
import { GREATSWORD_ACTIVE_SKILLS, GREATSWORD_ABILITIES } from './greatsword';
import { CROSSBOW_ACTIVE_SKILLS, CROSSBOW_ABILITIES } from './crossbow';
// Legacy "secondary" pool — remaining weapon types not yet extracted/rebuilt:
// axe, mace, greataxe, maul, scepter, tome (6 types × 7 actives + 3 abilities each).
// Future Phase C3 steps will extract these into per-weapon files as needed.
import { SECONDARY_ACTIVE_SKILLS, SECONDARY_ABILITIES } from './secondary';

// ============================================================
// Merged arrays (preserve original export names)
// ============================================================

export const ACTIVE_SKILL_DEFS: ActiveSkillDef[] = [
  ...SWORD_ACTIVE_SKILLS,
  ...DAGGER_ACTIVE_SKILLS,
  ...STAFF_ACTIVE_SKILLS,
  ...BOW_ACTIVE_SKILLS,
  ...FLAIL_ACTIVE_SKILLS,
  ...CLAWS_ACTIVE_SKILLS,
  ...SCYTHE_ACTIVE_SKILLS,
  ...WAND_ACTIVE_SKILLS,
  ...GAUNTLET_ACTIVE_SKILLS,
  ...GREATSWORD_ACTIVE_SKILLS,
  ...CROSSBOW_ACTIVE_SKILLS,
  ...SECONDARY_ACTIVE_SKILLS,
];

export const ABILITY_DEFS: AbilityDef[] = [
  ...SWORD_ABILITIES,
  ...DAGGER_ABILITIES,
  ...STAFF_ABILITIES,
  ...BOW_ABILITIES,
  ...FLAIL_ABILITIES,
  ...CLAWS_ABILITIES,
  ...SCYTHE_ABILITIES,
  ...WAND_ABILITIES,
  ...GAUNTLET_ABILITIES,
  ...GREATSWORD_ABILITIES,
  ...CROSSBOW_ABILITIES,
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
// Bow v2 (Phase C3 2026-05-04): id ↔ name alignment
ABILITY_ID_MIGRATION['bow_multi_shot'] = 'bow_ice_barrage';
ABILITY_ID_MIGRATION['bow_smoke_arrow'] = 'bow_shock_arrow';

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
  // Phase A Change 1: carry timing/kind fields through conversion
  skillKind: s.skillKind,
  recoveryTime: s.recoveryTime,
  channelTickInterval: s.channelTickInterval,
  manaCost: s.manaCost,
  // Phase A Change 3: carry ailment trigger chance
  baseAilmentChance: s.baseAilmentChance,
  // Per-skill talent graphs retired 2026-05-04 — class trees in src/data/classTrees/ are the new authoring layer.
}));

// Convert AbilityDefs -> SkillDefs (keep original kind)
const convertedAbilities: SkillDef[] = ABILITY_DEFS.map(a => {
  const needsRename = CONFLICTING_ABILITY_IDS.has(a.id);
  const newId = needsRename ? `${a.id}_buff` : a.id;

  // Track all ability ID mappings (even unchanged ones) for migration
  ABILITY_ID_MIGRATION[a.id] = newId;

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

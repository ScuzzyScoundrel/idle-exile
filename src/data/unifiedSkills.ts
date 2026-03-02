// ============================================================
// Idle Exile — Unified Skill Definitions (10F)
// Merges ActiveSkillDefs (51) + AbilityDefs (24) = 75 SkillDefs.
// Old data/skills.ts and data/abilities.ts kept alive until 10J cleanup.
// ============================================================

import type { SkillDef, SkillKind, WeaponType } from '../types';
import { ACTIVE_SKILL_DEFS } from './skills';
import { ABILITY_DEFS } from './abilities';

// IDs that exist in both active skills and abilities — abilities get '_buff' suffix
const CONFLICTING_ABILITY_IDS = new Set([
  'axe_cleave',
  'mace_shockwave',
  'crossbow_explosive_bolt',
  'bow_rapid_fire',
  'wand_chain_lightning',
]);

/** Map from old ability ID → unified ID (for migration in 10G). */
export const ABILITY_ID_MIGRATION: Record<string, string> = {};

// Convert ActiveSkillDefs → SkillDefs (kind: 'active')
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
  dotDuration: s.dotDuration,
  dotDamagePercent: s.dotDamagePercent,
}));

// Convert AbilityDefs → SkillDefs (keep original kind)
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
    skillTree: a.skillTree,
  };
});

/** All unified skill definitions (75). */
export const SKILL_DEFS: SkillDef[] = [
  ...convertedActiveSkills,
  ...convertedAbilities,
];

// --- Lookup Maps ---

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

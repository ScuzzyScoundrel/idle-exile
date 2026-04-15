// ============================================================
// Class-Skill Adjustment resolver + registry
// ============================================================
//
// Looks up morphs for a given (class, skill) pair. Natural-archetype
// pairs (Witchdoctor × Staff, Assassin × Dagger) need NO entry — the
// base skill already matches the class fantasy. Only cross-archetype
// cells carry morphs, where we override damage type / flavor to make
// the off-class weapon feel like the class is still the class.
//
// Phase 3a populates MVP scope: Witchdoctor × Dagger + Assassin × Staff.
// Additional classes/weapons extend this table additively as Phase 3b+
// authors new morphs against implemented skills.

import type { CharacterClass, ClassSkillAdjustment, SkillDef } from '../types';
import type { DamageTag, DamageType, ConversionSpec } from '../types/skills';

/**
 * Registry of authored morphs. Keyed by skillId, each entry is a list
 * of adjustments (one per class cell).
 */
export const CLASS_SKILL_ADJUSTMENTS: Record<string, ClassSkillAdjustment[]> = {
  // ── Witchdoctor × Dagger (voodoo bladesman — chaos DoT bias) ────────
  dagger_stab: [
    { skillId: 'dagger_stab', classIds: ['witchdoctor'],
      damageTypeOverride: 'chaos', flavorName: 'Ritual Gouge' },
  ],
  dagger_blade_dance: [
    { skillId: 'dagger_blade_dance', classIds: ['witchdoctor'],
      damageTypeOverride: 'chaos', flavorName: 'Spirit Whirl' },
  ],
  dagger_fan_of_knives: [
    { skillId: 'dagger_fan_of_knives', classIds: ['witchdoctor'],
      damageTypeOverride: 'chaos', flavorName: 'Curse of Blades' },
  ],
  dagger_viper_strike: [
    // Viper Strike is already chaos — WD adopts it, flavor rename only.
    { skillId: 'dagger_viper_strike', classIds: ['witchdoctor'],
      flavorName: 'Pox Jab' },
  ],
  dagger_shadow_mark: [
    // Shadow Mark is already chaos — WD flavor only.
    { skillId: 'dagger_shadow_mark', classIds: ['witchdoctor'],
      flavorName: 'Hexmark' },
  ],
  dagger_assassinate: [
    { skillId: 'dagger_assassinate', classIds: ['witchdoctor'],
      damageTypeOverride: 'chaos', flavorName: 'Soul Reaping Strike' },
  ],
  dagger_chain_strike: [
    // Chain Strike is lightning by default — WD retheme to chaos.
    { skillId: 'dagger_chain_strike', classIds: ['witchdoctor'],
      damageTypeOverride: 'chaos', flavorName: 'Chaos Arc' },
  ],
  dagger_blade_trap: [
    { skillId: 'dagger_blade_trap', classIds: ['witchdoctor'],
      damageTypeOverride: 'chaos', flavorName: 'Voodoo Snare' },
  ],

  // ── Assassin × Staff (shadow priest — physical/poison bias) ─────────
  staff_zombie_dogs: [
    { skillId: 'staff_zombie_dogs', classIds: ['assassin'],
      flavorName: 'Shade Acolytes' },
  ],
  staff_locust_swarm: [
    // Locust is already chaos — Assassin keeps chaos, flavors as poison.
    { skillId: 'staff_locust_swarm', classIds: ['assassin'],
      flavorName: 'Venom Cloud' },
  ],
  staff_haunt: [
    // Haunt is cold — Assassin overrides to physical (blade strikes).
    { skillId: 'staff_haunt', classIds: ['assassin'],
      damageTypeOverride: 'physical', flavorName: 'Shadow Strike',
      castTimeMult: 0.85 },
  ],
  staff_hex: [
    // Hex is already chaos (poison-adjacent) — flavor rename only.
    { skillId: 'staff_hex', classIds: ['assassin'],
      flavorName: 'Poison Hex' },
  ],
  staff_spirit_barrage: [
    // Spirit Barrage is cold projectile — Assassin reskins as thrown needles.
    { skillId: 'staff_spirit_barrage', classIds: ['assassin'],
      damageTypeOverride: 'physical', flavorName: 'Needle Volley',
      castTimeMult: 0.9 },
  ],
  staff_plague_of_toads: [
    { skillId: 'staff_plague_of_toads', classIds: ['assassin'],
      flavorName: 'Poison Bolts' },
  ],
  staff_fetish_swarm: [
    { skillId: 'staff_fetish_swarm', classIds: ['assassin'],
      flavorName: 'Shadow Minions' },
  ],
  staff_soul_harvest: [
    // Already chaos — flavor rename.
    { skillId: 'staff_soul_harvest', classIds: ['assassin'],
      flavorName: 'Soul Drain' },
  ],
  staff_bouncing_skull: [
    // Fire by default — Assassin reskins as thrown bouncing blade.
    { skillId: 'staff_bouncing_skull', classIds: ['assassin'],
      damageTypeOverride: 'physical', flavorName: 'Bouncing Dagger' },
  ],
  staff_mass_sacrifice: [
    { skillId: 'staff_mass_sacrifice', classIds: ['assassin'],
      damageTypeOverride: 'physical', flavorName: 'Blade Detonation' },
  ],
};

/**
 * Resolve the class morph for a skill+class pair. Returns null if no
 * authored adjustment exists (use raw skill definition).
 */
export function getClassSkillAdjustment(
  skillId: string,
  classId: CharacterClass,
): ClassSkillAdjustment | null {
  const entries = CLASS_SKILL_ADJUSTMENTS[skillId];
  if (!entries) return null;
  for (const entry of entries) {
    if (entry.classIds.includes(classId)) return entry;
  }
  return null;
}

/**
 * Multiclass variant — returns ALL adjustments that apply to ANY of the
 * given class IDs. Phase 5 consumer merges these using additive-math /
 * multiplicative-tag rules per the design plan.
 */
export function getClassSkillAdjustmentsForClasses(
  skillId: string,
  classIds: CharacterClass[],
): ClassSkillAdjustment[] {
  const entries = CLASS_SKILL_ADJUSTMENTS[skillId];
  if (!entries) return [];
  return entries.filter(e => e.classIds.some(c => classIds.includes(c)));
}

/**
 * Get the player-facing name for a skill, applying class morph's flavorName
 * override if one exists. Falls back to the skill's base name.
 *
 * Example: Assassin casting staff_haunt shows "Shadow Strike" instead of "Haunt".
 */
export function getDisplayedSkillName(skill: SkillDef, classId: CharacterClass): string {
  const morph = getClassSkillAdjustment(skill.id, classId);
  return morph?.flavorName ?? skill.name;
}

// ── getEffectiveSkillDef (Phase 4 sub-phase 1) ──────────────────────
//
// Returns a fully-morphed SkillDef for the given class. Single source of
// truth for every UI + DPS preview + combat consumer that wants to see
// the skill the way the player sees it.
//
// Fast path: no morph → returns the original skill (reference equality).
// Morphed path: returns a new object with name/description/tags/castTime/
// manaCost/baseConversion all rewritten per the ClassSkillAdjustment.

const ELEMENT_TAGS: ReadonlySet<DamageTag> = new Set<DamageTag>([
  'Physical', 'Fire', 'Cold', 'Lightning', 'Chaos',
]);

const DAMAGE_TYPE_TO_TAG: Record<DamageType, DamageTag> = {
  physical: 'Physical',
  fire: 'Fire',
  cold: 'Cold',
  lightning: 'Lightning',
  chaos: 'Chaos',
};

function swapElementTag(tags: DamageTag[], newType: DamageType): DamageTag[] {
  const newTag = DAMAGE_TYPE_TO_TAG[newType];
  const hadElement = tags.some(t => ELEMENT_TAGS.has(t));
  const stripped = tags.filter(t => !ELEMENT_TAGS.has(t));
  if (hadElement || !tags.includes(newTag)) stripped.push(newTag);
  return stripped;
}

/**
 * Minimal shape the resolver touches. `SkillDef` and `ActiveSkillDef` (both
 * in tick.ts scope) satisfy this, so callers pass either without casting.
 */
interface MorphableSkill {
  id: string;
  name: string;
  description: string;
  tags: DamageTag[];
  castTime: number;
  manaCost?: number;
  baseConversion?: ConversionSpec;
}

export function getEffectiveSkillDef<T extends MorphableSkill>(
  skill: T,
  classId: CharacterClass,
): T {
  const morph = getClassSkillAdjustment(skill.id, classId);
  if (!morph) return skill;

  const next: T = { ...skill };

  if (morph.flavorName) next.name = morph.flavorName;
  if (morph.flavorDescription) next.description = morph.flavorDescription;

  if (morph.tagOverride) {
    next.tags = [...morph.tagOverride];
  } else if (morph.damageTypeOverride) {
    next.tags = swapElementTag(skill.tags, morph.damageTypeOverride);
  }

  if (morph.castTimeMult && morph.castTimeMult > 0) {
    next.castTime = skill.castTime * morph.castTimeMult;
  }
  if (morph.manaCostMult && morph.manaCostMult > 0 && skill.manaCost !== undefined) {
    next.manaCost = skill.manaCost * morph.manaCostMult;
  }

  if (morph.damageTypeOverride) {
    if (morph.damageTypeOverride === 'physical') {
      delete next.baseConversion;
    } else {
      next.baseConversion = {
        from: 'physical',
        to: morph.damageTypeOverride,
        percent: 100,
      };
    }
  }

  return next;
}

// ============================================================
// Engine Skills Barrel — re-exports all skill engine functions
// Replaces engine/unifiedSkills.ts (Phase B7)
// ============================================================

// Resolution (leaf: mergeEffect, formula eval, tree resolution)
export {
  mergeEffect,
  EMPTY_EFFECT,
  evaluateFormula,
  getAllTreeNodes,
  resolveAbilityEffect,
  resolveAbilityEffectLegacy,
  getSkillGraphModifier,
  resolveSkillEffect,
} from './resolution';
export type { ResolvedSkillModifier } from './resolution';

// Timers (duration, cooldown, buff checks, proc/bonus)
export {
  getEffectiveDuration,
  getEffectiveDurationLegacy,
  getEffectiveCooldown,
  getSkillEffectiveDuration,
  getSkillEffectiveCooldown,
  getSkillSpeedStat,
  isAbilityActive,
  isAbilityOnCooldown,
  getRemainingCooldown,
  getRemainingBuff,
  isSkillActive,
  isSkillOnCooldown,
  calcBonusClears,
  rollProc,
} from './timers';

// Effects (aggregation: ability, skill bar, graph global, temp buffs)
export {
  aggregateTempBuffEffects,
  aggregateAbilityEffects,
  aggregateSkillBarEffects,
  aggregateGraphGlobalEffects,
} from './effects';

// Progression (XP, leveling, tree allocation, respec)
export {
  getIncompatibleAbilities,
  getUnlockedSlotCount,
  getAbilityXpForLevel,
  addAbilityXp,
  getAbilityXpPerClear,
  canAllocateNode,
  allocateNode,
  respecAbility,
  getRespecCost,
  createAbilityProgress,
} from './progression';

// DPS (damage calculation, cast intervals, combat rolls)
export {
  calcSkillDamagePerCast,
  calcSkillDps,
  calcSkillCastInterval,
  rollSkillCast,
  calcUnifiedDps,
  calcUnifiedDamagePerCast,
} from './dps';

// Rotation (rotation DPS, skill selection, mob HP)
export {
  calcRotationDps,
  getPrimaryDamageSkill,
  getNextRotationSkill,
  getDefaultSkillForWeapon,
  calcMobHp,
} from './rotation';

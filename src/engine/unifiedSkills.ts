// ============================================================
// BACKWARD COMPAT SHIM — re-exports from engine/skills/*
// All functions moved to engine/skills/ modules (Phase B).
// This file exists only so existing imports keep working.
// New code should import from '../engine/skills' directly.
// ============================================================

export {
  // resolution
  mergeEffect,
  EMPTY_EFFECT,
  evaluateFormula,
  getAllTreeNodes,
  resolveAbilityEffect,
  resolveAbilityEffectLegacy,
  getSkillGraphModifier,
  resolveSkillEffect,

  // timers
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

  // effects
  aggregateTempBuffEffects,
  aggregateAbilityEffects,
  aggregateSkillBarEffects,
  aggregateGraphGlobalEffects,

  // progression
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

  // dps
  calcSkillDamagePerCast,
  calcSkillDps,
  calcSkillCastInterval,
  rollSkillCast,
  calcUnifiedDps,
  calcUnifiedDamagePerCast,

  // rotation
  calcRotationDps,
  getPrimaryDamageSkill,
  getNextRotationSkill,
  getDefaultSkillForWeapon,
  calcMobHp,
} from './skills';

export type { ResolvedSkillModifier } from './skills';

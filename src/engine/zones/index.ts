// ============================================================
// Engine Zones Barrel — re-exports all zone engine functions
// Replaces engine/zones.ts (Phase C6)
// ============================================================

// Scaling (leaf: hazard, level, accuracy, damage multipliers)
export {
  GEAR_SLOTS,
  HAZARD_STAT_MAP,
  applyAbilityResists,
  calcHazardPenalty,
  checkZoneMastery,
  calcXpScale,
  calcLevelDamageMult,
  calcOutgoingDamageMult,
  calcZoneAccuracy,
  calcZoneRefDamage,
} from './scaling';

// Defense (dodge, block, armor, resist, EHP pipeline)
export {
  rollEntropicEvasion,
  rollZoneAttack,
  calcEhp,
  simulateClearDefense,
} from './defense';

// DPS (player DPS, clear time, combat simulation)
export {
  calcPlayerDps,
  calcClearTime,
  simulateCombatClear,
} from './dps';

// Drops (mob drops, single/idle/gathering clear loot)
export {
  rollMobDrops,
  simulateIdleRun,
  getClaimableMilestones,
  getMasteryBonus,
  simulateSingleClear,
  simulateGatheringClear,
} from './drops';
export type { SingleClearResult, GatheringClearResult } from './drops';

// Boss (HP, attack profile, encounters, loot, death penalty)
export {
  calcBossMaxHp,
  calcBossAttackProfile,
  createBossEncounter,
  generateBossLoot,
  calcDeathPenalty,
} from './boss';

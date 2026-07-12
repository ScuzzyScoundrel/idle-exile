// ============================================================
// Weapon Module Interface — hook-based weapon-specific combat logic
// tick.ts calls optional hooks at 6 pipeline points.
// Each hook receives focused context and returns a partial patch.
// ============================================================

import type {
  GameState,
  CombatPhase,
  ActiveDebuff,
  ResolvedStats,
  SkillDef,
  ActiveSkillDef,
  ComboState,
  DamageType,
} from '../../../types';
import type { ResolvedSkillModifier } from '../../skillGraph';
import type { ConditionContext } from '../../combatHelpers';
import type { TrapState } from '../traps';
import type { MinionState } from '../minions';
import type { TalentEffect } from '../../../types';

// ── Shared context available to all weapon hooks ──

export interface WeaponTickContext {
  state: GameState;
  skill: SkillDef | ActiveSkillDef;
  graphMod: ResolvedSkillModifier | null;
  effectiveStats: ResolvedStats;
  effectiveMaxLife: number;
  dtSec: number;
  now: number;
  phase: CombatPhase;
  avgDamage: number;
  spellPower: number;
  targetDebuffs: ActiveDebuff[];
  /** Phase F F2 (2026-05-06): pre-collected scaled talent effects so
   *  weapon hooks (e.g. minion-event procs in staff.tickMaintenance) can
   *  dispatch event procs without re-resolving the tree. Optional so
   *  legacy hook callers don't need to be updated; staff.ts treats
   *  missing as no-procs. */
  talentEffects?: TalentEffect[];
  /** Phase F F2 follow-on (2026-05-06): mutable mana ref for
   *  refundMana actions fired during weapon-maintenance procs (e.g.
   *  wd_sw_soul_ration — minion hits restoring player mana).
   *  tick.ts writes this back to state.character.mana.current after
   *  the hook returns. Optional — when missing, refundMana no-ops. */
  mana?: { current: number; max: number };
}

// ── Hook-specific context extensions ──

export interface PreRollContext extends WeaponTickContext {
  comboStates: ComboState[];
  damageMult: number;
  activeMinions: MinionState[];
}

export interface PostCastContext extends WeaponTickContext {
  roll: { damage: number; isHit: boolean; isCrit: boolean };
  comboStates: ComboState[];
  bladeWardExpiresAt: number;
  bladeWardHits: number;
  activeTraps: TrapState[];
  activeMinions: MinionState[];
  ailmentSnapshot: number;
}

export interface EnemyAttackContext extends WeaponTickContext {
  attackResult: { damage: number; isDodged: boolean; isBlocked: boolean; isCrit?: boolean } | null;
  comboStates: ComboState[];
  bladeWardExpiresAt: number;
  bladeWardHits: number;
  activeTraps: TrapState[];
  activeMinions: MinionState[];
  comboCounterDamageMult: number;
  /** The target taking damage — boss HP for boss phase, mob for clearing. */
  isBossPhase: boolean;
}

export interface KillContext extends WeaponTickContext {
  comboStates: ComboState[];
  mobKills: number;
}

// ── Hook result types ──

export interface MaintenanceResult {
  comboStates?: ComboState[];
  activeTraps?: TrapState[];
  bladeWardExpiresAt?: number;
  bladeWardHits?: number;
  activeMinions?: MinionState[];
  /** Total damage dealt by minions this tick — tick.ts applies to current front mob or boss. */
  minionAttackDamage?: number;
  /** Debuffs to apply to the minion-attack target (front mob or boss) this tick. */
  minionDebuffs?: { debuffId: string; stacks: number; duration: number; skillId: string; snapshotDamage: number }[];
  /** Heal to apply to player this tick (lifesteal, soulTether, dogRegen heal aura). */
  healAmount?: number;
  /** AoE damage from minion death events (dogDeathPulsePercent, fetishDeathPoisonCloud). Applies to front mob + pack. */
  minionDeathAoe?: { damage: number; element: DamageType; sourceSkillId: string; debuffOnHit?: { debuffId: string; duration: number; stacks: number } }[];
  /** Pack-wide debuffs (plagueCourtAllPlagued, witchingHour) to refresh on all mobs. */
  packDebuffs?: { debuffId: string; stacks: number; duration: number; skillId: string; snapshotDamage: number }[];
}

export interface PreRollResult {
  comboStates: ComboState[];
  /** Additive damage multiplier adjustments (applied as damageMult *= value). */
  damageMult: number;
  critChanceBonus: number;
  critMultiplierBonus: number;
  guaranteedCrit: boolean;
  ailmentPotency: number;
  cdRefundPercent: number;
  splashPercent: number;
  extraChains: number;
  burstDamage: number;
  focusBurst: boolean;
  counterDamageMult: number;
  markPassthrough: boolean;
  cdAcceleration: number;
  /** E10 capBonus.advanceOthersSec — Perfect spend advances all OTHER
   *  skill cooldowns by this many seconds (self-excluded). */
  advanceOtherCooldownsSec?: number;
  consumedStateIds: string[];
  healAmount: number;
  contagionSpreadCount: number;
  /** Staff: Plague of Toads consuming Plagued → spread all active DoTs from front target to all pack enemies. */
  pandemicSpread: boolean;
  /** Staff: updated minion list after spirit_link detonation (Mass Sacrifice). */
  activeMinions?: MinionState[];
  /** Staff: reset cooldown for these skill IDs (cross-skill CD reset from Resurgent Swarm / similar). */
  skillsToResetCd?: string[];
}

export interface PostCastResult {
  comboStates: ComboState[];
  bladeWardExpiresAt: number;
  bladeWardHits: number;
  activeTraps: TrapState[];
  /** Staff: updated minion list after summon (zombie dogs / fetishes). */
  activeMinions?: MinionState[];
}

export interface EnemyAttackResult {
  /** Counter-hit damage dealt to the attacking enemy. */
  counterDamage: number;
  /** Trap detonation damage (boss: to boss only, clearing: AoE to all mobs). */
  trapDamage: number;
  comboStates: ComboState[];
  bladeWardHits: number;
  activeTraps: TrapState[];
  /** Ward DR multiplier for incoming damage (1 = no reduction). */
  wardDamageMult: number;
  healAmount: number;
  /** Temp buffs created by object-trigger procs (ward/detonation/dash triggers). */
  newTempBuffs: { id: string; effect: Record<string, any>; duration: number; stacks: number; maxStacks: number }[];
  /** Staff: updated minion list after incoming-damage absorption. */
  activeMinions?: MinionState[];
  /** Staff: flat damage subtracted from the enemy attack by minions intercepting. */
  damageAbsorbedByMinions?: number;
}

export interface KillResult {
  comboStates: ComboState[];
}

// ── Weapon Module Interface ──

export interface WeaponModule {
  readonly weaponType: string;

  /** Every tick, before skill resolution. Tick timers, expire states. */
  tickMaintenance?(ctx: WeaponTickContext): MaintenanceResult;

  /** Before conditionalMod evaluation. Return extra fields for ConditionContext. */
  extendConditionContext?(ctx: WeaponTickContext): Partial<ConditionContext>;

  /** After stats resolved, before rollSkillCast. Consume combo states → bonuses. */
  preRoll?(ctx: PreRollContext): PreRollResult;

  /** After roll + damage calc. Create combo states, activate ward, place traps. */
  postCast?(ctx: PostCastContext): PostCastResult;

  /** When mob/boss attack resolves. Ward DR, counter-hits, trap detonation. */
  onEnemyAttack?(ctx: EnemyAttackContext): EnemyAttackResult;

  /** Per mob death. Combo state creation on kill. */
  onKill?(ctx: KillContext): KillResult;
}

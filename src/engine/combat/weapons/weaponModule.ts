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
} from '../../../types';
import type { ResolvedSkillModifier } from '../../skillGraph';
import type { ConditionContext } from '../../combatHelpers';
import type { TrapState } from '../traps';
import type { MinionState } from '../minions';

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

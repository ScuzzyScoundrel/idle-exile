// ============================================================
// Data-Driven Weapon Module (Effect IR Wave 4, EFFECT_IR_DESIGN.md D27)
//
// ONE generic WeaponModule for weapons whose mechanics are authored as
// data (SkillDef.effects + TRAP_DEFS) instead of a bespoke engine file.
// Bow is the first registrant — Gate 3 is "Hunter's Mark + Bear Trap
// working entirely from data, no bow.ts engine file ever exists."
//
// Hooks implemented:
//   tickMaintenance — tick combo states + arm/expire traps (dagger parity)
//   postCast        — place a TrapState when the casting skill has a
//                     TRAP_DEFS_BY_SKILL entry
//   onEnemyAttack   — generic trap detonation: damage + trap-event
//                     talent procs (procOnTrapDetonate/Chain — hoisted
//                     from dagger.ts so Hnt Trapper talents fire for ANY
//                     weapon with traps) + the TrapDef's onDetonate
//                     actions (Snare, Mark, …) via executeAction.
//
// Skill on-hit/on-crit effects (e.g. Hunter's Mark applying 'mark') do
// NOT live here — they dispatch at the tick.ts cast site alongside
// talent effects (D17), so they work for module-less weapons too.
// ============================================================

import type {
  WeaponModule, WeaponTickContext, MaintenanceResult,
  PostCastContext, PostCastResult, EnemyAttackContext, EnemyAttackResult,
} from './weaponModule';
import { tickComboStates } from '../combo';
import { tickTraps, detonateTrap } from '../traps';
import { TRAP_DEFS_BY_SKILL } from '../../../data/trapDefs';
import {
  dispatchProcOnTrapDetonate, dispatchProcOnTrapChain, executeAction,
  type TalentProcContext,
} from '../../classTalentDispatcher';

export const dataDrivenModule: WeaponModule = {
  weaponType: 'data-driven', // overridden per registration (see registerDataDriven)

  tickMaintenance(ctx: WeaponTickContext): MaintenanceResult {
    const comboStates = tickComboStates([...ctx.state.comboStates], ctx.dtSec);
    const activeTraps = tickTraps([...ctx.state.activeTraps], ctx.dtSec, ctx.now);
    return { comboStates, activeTraps };
  },

  postCast(ctx: PostCastContext): PostCastResult {
    const { skill, roll, now } = ctx;
    const activeTraps = [...ctx.activeTraps];
    const trapDef = TRAP_DEFS_BY_SKILL[skill.id];
    if (trapDef && (roll.isHit || !trapDef.requiresHit)) {
      activeTraps.push({
        trapId: `trap_${now}`,
        sourceSkillId: skill.id,
        placedAt: now,
        armDelay: trapDef.armDelaySec,
        isArmed: false,
        damage: roll.damage * trapDef.damageMult,
        duration: trapDef.durationSec,
        remainingDuration: trapDef.durationSec,
      });
    }
    return {
      comboStates: [...ctx.comboStates],
      bladeWardExpiresAt: ctx.bladeWardExpiresAt,
      bladeWardHits: ctx.bladeWardHits,
      activeTraps,
    };
  },

  onEnemyAttack(ctx: EnemyAttackContext): EnemyAttackResult {
    const comboStates = [...ctx.comboStates];
    let activeTraps = [...ctx.activeTraps];
    let trapDamage = 0;

    const noop: EnemyAttackResult = {
      counterDamage: 0, trapDamage: 0, comboStates,
      bladeWardHits: ctx.bladeWardHits, activeTraps,
      wardDamageMult: 1, healAmount: 0, newTempBuffs: [],
    };
    if (!ctx.attackResult || activeTraps.length === 0) return noop;

    const trapsBefore = activeTraps.length;
    const { detonated, remaining } = detonateTrap(activeTraps);
    if (!detonated) return noop;
    activeTraps = remaining;

    let detDmg = detonated.damage;
    const trapDef = TRAP_DEFS_BY_SKILL[detonated.sourceSkillId];

    // Shared proc context: talent trap-procs AND the TrapDef's own
    // detonation actions run through it (same refs, same broadcast).
    const trapProcCtx: TalentProcContext = {
      targetDebuffs: ctx.targetDebuffs,
      life: { value: ctx.state.currentHp, max: ctx.effectiveMaxLife },
      sourceSkillId: detonated.sourceSkillId,
      bonusDamageRef: { value: 0, baseDamage: detDmg },
      mana: ctx.mana,
      effects: ctx.talentEffects,
      broadcastDebuffLists: ctx.isBossPhase
        ? [ctx.targetDebuffs]
        : ctx.state.packMobs.map(m => m.debuffs),
    };

    // Hnt Trapper talent procs — fire for ANY trap-placing weapon.
    if (ctx.talentEffects && ctx.talentEffects.length > 0) {
      dispatchProcOnTrapDetonate(ctx.talentEffects, trapProcCtx);
      if (trapsBefore > 1) dispatchProcOnTrapChain(ctx.talentEffects, trapProcCtx);
      if (trapProcCtx.bonusDamageRef && trapProcCtx.bonusDamageRef.value > 0) {
        detDmg += trapProcCtx.bonusDamageRef.value;
      }
    }

    // TrapDef detonation payload (Snare, Mark, charges…) — pure data.
    if (trapDef) {
      for (const action of trapDef.onDetonate) executeAction(action, trapProcCtx);
    }

    // Boss phase: detonations can crit (dagger parity).
    if (ctx.isBossPhase) {
      const detCrit = Math.random() < (ctx.effectiveStats.critChance / 100);
      if (detCrit) detDmg *= ctx.effectiveStats.critMultiplier / 100;
    }
    trapDamage = detDmg;

    return {
      counterDamage: 0, trapDamage, comboStates,
      bladeWardHits: ctx.bladeWardHits, activeTraps,
      wardDamageMult: 1, healAmount: 0, newTempBuffs: [],
    };
  },
};

/** Register the shared data-driven module for a weapon type. Returns a
 *  per-type facade so `weaponType` reads correctly in diagnostics. */
export function dataDrivenFor(weaponType: string): WeaponModule {
  return { ...dataDrivenModule, weaponType };
}

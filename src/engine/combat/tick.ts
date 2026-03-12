// ============================================================
// Pure combat tick — extracted from gameStore.tickCombat (Phase C3)
// Takes a readonly state snapshot + dtSec, returns { patch, result }.
// ZERO store imports — no circular deps.
// ============================================================

import type {
  GameState,
  CombatTickResult,
  CombatPhase,
  ActiveDebuff,
  ResolvedStats,
  SkillDef,
  ActiveSkillDef,
  TriggerCondition,
} from '../../types';

import { resolveStats, getWeaponDamageInfo } from '../character';
import {
  rollZoneAttack,
  applyAbilityResists,
  calcLevelDamageMult,
  calcZoneAccuracy,
  calcOutgoingDamageMult,
} from '../zones';
import {
  calcSkillCastInterval,
  rollSkillCast,
  getNextRotationSkill,
  getDefaultSkillForWeapon,
  getSkillGraphModifier,
  aggregateTempBuffEffects,
  mergeEffect,
} from '../unifiedSkills';
import { getClassDamageModifier } from '../classResource';
import {
  evaluateConditionalMods,
  evaluateProcs,
  type ConditionContext,
  type ProcContext,
} from '../combatHelpers';
import {
  prettifyProcId,
  tickDebuffDoT,
  calcEnemyDebuffMods,
  calcBleedTriggerDamage,
  calcFortifyDR,
  getFullEffect,
  applyDebuffToList,
  spreadDebuffsToTarget,
  mergeProcTempBuff,
  type SpreadResult,
} from './helpers';
import { isSkillAoE, spawnPack } from '../packs';
import { isZoneInvaded } from '../invasions';
import {
  BOSS_CRIT_CHANCE,
  BOSS_CRIT_MULTIPLIER,
  BOSS_MAX_DMG_RATIO,
  LEECH_PERCENT,
  ZONE_ATTACK_INTERVAL,
  ZONE_DMG_BASE,
  ZONE_DMG_ILVL_SCALE,
  FORTIFY_MAX_STACKS,
  INVASION_DIFFICULTY_MULT,
  DEATH_STREAK_WINDOW,
} from '../../data/balance';
import { ZONE_DEFS } from '../../data/zones';
import { getClassDef } from '../../data/classes';
import { getDebuffDef } from '../../data/debuffs';
import { getUnifiedSkillDef } from '../../data/skills';
import { getMobTypeDef } from '../../data/mobTypes';
import { pickCurrentMob } from '../zones/helpers';

// ── Subsystem imports ──
import { applyBossDamage } from './bossAttack';
import { applyZoneDamage } from './zoneAttack';
import { noResult } from './types';
import type { CombatTickOutput } from './types';
export type { CombatTickOutput } from './types';

// ── Structured proc event type (mirrors CombatTickResult.procEvents element) ──
type ProcEvent = {
  procId: string;
  label: string;
  damage: number;
  sourceSkillId: string;
  type: 'damage' | 'buff' | 'debuff' | 'heal' | 'cdReset' | 'cast';
};

import type { ProcResult } from '../combatHelpers';

/** Build structured ProcEvent entries from an evaluateProcs result. */
function buildProcEvents(pr: ProcResult, sourceSkillId: string): ProcEvent[] {
  const events: ProcEvent[] = [];
  for (const procId of pr.procsFired) {
    const label = prettifyProcId(procId);
    // Classify: damage procs get damage type, others get the most specific type
    if (pr.bonusDamage > 0) {
      events.push({ procId, label, damage: pr.bonusDamage, sourceSkillId, type: 'damage' });
    } else if (pr.healAmount > 0) {
      events.push({ procId, label, damage: 0, sourceSkillId, type: 'heal' });
    } else if (pr.cooldownResets.length > 0) {
      events.push({ procId, label, damage: 0, sourceSkillId, type: 'cdReset' });
    } else if (pr.newTempBuffs.length > 0) {
      events.push({ procId, label, damage: 0, sourceSkillId, type: 'buff' });
    } else if (pr.newDebuffs.length > 0) {
      events.push({ procId, label, damage: 0, sourceSkillId, type: 'debuff' });
    } else {
      events.push({ procId, label, damage: 0, sourceSkillId, type: 'cast' });
    }
  }
  return events;
}

// ── Main pure function ──

export function runCombatTick(
  state: GameState,
  dtSec: number,
  now: number = Date.now(),
): CombatTickOutput {
  const phase = state.combatPhase;
  if (phase !== 'clearing' && phase !== 'boss_fight') return { patch: {}, result: noResult };
  if (!state.currentZoneId || !state.idleStartTime) return { patch: {}, result: noResult };
  if (state.idleMode !== 'combat') return { patch: {}, result: noResult };

  const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
  if (!zone) return { patch: {}, result: noResult };

  // For clearing, debuffs are per-mob (front mob); for boss, shared state
  const targetDebuffs: ActiveDebuff[] = (phase === 'clearing' && state.packMobs.length > 0)
    ? state.packMobs[0].debuffs
    : state.activeDebuffs;
  // Front mob HP / maxHP convenience aliases for clearing phase
  const frontMobHp = state.packMobs.length > 0 ? state.packMobs[0].hp : 0;
  const frontMobMaxHp = state.packMobs.length > 0 ? state.packMobs[0].maxHp : 1;

  // GCD check: can we fire any active skill yet?
  if (now < state.nextActiveSkillAt) {
    if (phase === 'clearing') return applyZoneDamage(state, dtSec, now, zone);
    return applyBossDamage(state, dtSec, now);
  }

  // Find next ready skill from rotation (slot-priority order)
  const rotationResult = getNextRotationSkill(state.skillBar ?? [], state.skillTimers, now);

  // Fallback: if no rotation skill ready, check why
  let skill: SkillDef | ActiveSkillDef | null = rotationResult?.skill ?? null;
  if (!skill) {
    // Check if any active skills are equipped
    const hasActiveSkill = (state.skillBar ?? []).some(eq => {
      if (!eq) return false;
      const def = getUnifiedSkillDef(eq.skillId);
      return def?.kind === 'active';
    });
    if (hasActiveSkill) {
      // Active skills exist but all on CD — idle until one comes back
      if (phase === 'clearing') return applyZoneDamage(state, dtSec, now, zone);
      return applyBossDamage(state, dtSec, now);
    }
    // No active skills equipped at all — fall back to default weapon skill
    skill = getDefaultSkillForWeapon(
      state.character.equipment.mainhand?.weaponType ?? 'sword',
      state.character.level,
    );
  }

  // If still no skill, idle (enemies still damage)
  if (!skill) {
    if (phase === 'clearing') return applyZoneDamage(state, dtSec, now, zone);
    return applyBossDamage(state, dtSec, now);
  }

  const stats = resolveStats(state.character);
  const abilityEffect = getFullEffect(state, now, false);

  // Expire old temp buffs and fold active ones into ability effect
  let activeTempBuffs = state.tempBuffs.filter(b => b.expiresAt > now);
  const tempBuffEffect = aggregateTempBuffEffects(activeTempBuffs, now);
  const combinedAbilityEffect = mergeEffect(abilityEffect, tempBuffEffect);

  // Apply ability stat bonuses to effective stats
  const effectiveStats = { ...stats };
  if (combinedAbilityEffect.critChanceBonus) effectiveStats.critChance += combinedAbilityEffect.critChanceBonus;
  if (combinedAbilityEffect.critMultiplierBonus) effectiveStats.critMultiplier += combinedAbilityEffect.critMultiplierBonus;

  const classDef = getClassDef(state.character.class);
  const atkSpeedMult = combinedAbilityEffect.attackSpeedMult ?? 1;

  // Resolve graph modifier for active skills (before damageMult so berserk can fold in)
  const skillProgress = state.skillProgress[skill.id];
  const skillDef = getUnifiedSkillDef(skill.id);
  const graphMod = skillDef ? getSkillGraphModifier(skillDef, skillProgress) : null;

  // Fold graph multiplicative offense stats into effectiveStats.
  // Penetration is handled in resolveDamageBuckets (reads graphMod directly).
  // dotMultiplier, weaponMastery, ailmentDuration need to be on effectiveStats
  // because they're read from stats in various combat paths.
  if (graphMod) {
    if (graphMod.dotMultiplier) effectiveStats.dotMultiplier += graphMod.dotMultiplier;
    if (graphMod.weaponMastery) effectiveStats.weaponMastery += graphMod.weaponMastery;
    if (graphMod.ailmentDuration) effectiveStats.ailmentDuration += graphMod.ailmentDuration;
  }

  // Effective max life (reducedMaxLife keystone) — hoisted for condition evaluation
  const effectiveMaxLife = graphMod?.reducedMaxLife
    ? stats.maxLife * (1 - graphMod.reducedMaxLife / 100)
    : stats.maxLife;

  // executeOnly: skip cast entirely if target HP% above threshold (e.g. DEATHBLOW)
  if (graphMod?.executeOnly) {
    const targetHpPct = phase === 'boss_fight' && state.bossState
      ? (state.bossState.bossCurrentHp / state.bossState.bossMaxHp) * 100
      : (frontMobHp / frontMobMaxHp) * 100;
    if (targetHpPct > graphMod.executeOnly.hpThreshold) {
      // Target too healthy — skip this skill, let zone/boss damage proceed
      if (phase === 'clearing') return applyZoneDamage(state, dtSec, now, zone);
      return applyBossDamage(state, dtSec, now);
    }
  }

  // Charge system: per-charge bonuses BEFORE roll
  let newSkillCharges = { ...state.skillCharges };
  let chargeSpendDamage = 0;
  const chargeConfig = graphMod?.chargeConfig ?? null;
  if (chargeConfig) {
    const key = skill.id;
    if (!newSkillCharges[key]) {
      newSkillCharges[key] = { current: 0, max: chargeConfig.maxCharges, chargeId: chargeConfig.chargeId };
    }
    const currentCharges = newSkillCharges[key].current;
    // Per-charge crit bonus (before roll)
    if (chargeConfig.perChargeCritChance && currentCharges > 0) {
      effectiveStats.critChance += chargeConfig.perChargeCritChance * currentCharges;
    }
  }

  // Berserk: bonus damage scaling with missing HP
  let berserkMult = 1;
  if (graphMod?.berserk) {
    const missingHpPct = 1 - (state.currentHp / stats.maxLife);
    if (missingHpPct > 0) {
      berserkMult = 1 + (graphMod.berserk.damageBonus / 100) * missingHpPct;
    }
  }

  // Per-charge damage bonus
  const chargeDamageMult = (chargeConfig?.perChargeDamage && newSkillCharges[skill.id])
    ? 1 + (chargeConfig.perChargeDamage / 100) * newSkillCharges[skill.id].current : 1;
  const outgoingDmgMult = calcOutgoingDamageMult(state.character.level, zone.iLvlMin);
  let damageMult = (combinedAbilityEffect.damageMult ?? 1) * getClassDamageModifier(state.classResource, classDef) * berserkMult * chargeDamageMult * outgoingDmgMult;

  // executeOnly bonus damage when target is below threshold
  if (graphMod?.executeOnly) {
    damageMult *= (1 + graphMod.executeOnly.bonusDamage / 100);
  }

  // Pre-roll conditional modifiers (while conditions)
  let condSpeedBonus = 0;
  if (graphMod?.conditionalMods?.length) {
    const condCtx: ConditionContext = {
      isHit: false, isCrit: false, phase,
      currentHp: state.currentHp, effectiveMaxLife,
      consecutiveHits: state.consecutiveHits,
      activeDebuffs: targetDebuffs,
      lastBlockAt: state.lastBlockAt, lastDodgeAt: state.lastDodgeAt,
      lastOverkillDamage: state.lastOverkillDamage, now,
      activeTempBuffIds: activeTempBuffs.map(b => b.id),
      killStreak: state.killStreak,
    };
    const preRoll = evaluateConditionalMods(graphMod.conditionalMods, condCtx, 'pre-roll');
    if (preRoll.incCritChance) effectiveStats.critChance += preRoll.incCritChance;
    if (preRoll.incCritMultiplier) effectiveStats.critMultiplier += preRoll.incCritMultiplier;
    if (preRoll.incDamage) damageMult *= (1 + preRoll.incDamage / 100);
    if (preRoll.damageMult !== 1) damageMult *= preRoll.damageMult;
    condSpeedBonus = preRoll.incCastSpeed;
  }

  // Apply graph + conditional cast speed bonus
  const graphSpeedMult = graphMod?.incCastSpeed
    ? (1 + (graphMod.incCastSpeed + condSpeedBonus) / 100)
    : condSpeedBonus ? (1 + condSpeedBonus / 100) : 1;
  const castInterval = calcSkillCastInterval(skill, effectiveStats, atkSpeedMult * graphSpeedMult);

  // Shocked: +crit chance on target per stack (applied pre-roll)
  for (const debuff of targetDebuffs) {
    const debuffDef = getDebuffDef(debuff.debuffId);
    if (debuffDef?.effect.incCritChanceTaken) {
      effectiveStats.critChance += debuffDef.effect.incCritChanceTaken * debuff.stacks;
    }
  }

  // Fire skill
  const { avgDamage, spellPower, weaponConversion } = getWeaponDamageInfo(state.character.equipment);
  const roll = rollSkillCast(skill, effectiveStats, avgDamage, spellPower, damageMult, graphMod ?? undefined, weaponConversion);

  // Post-roll conditional modifiers (on conditions)
  if (graphMod?.conditionalMods?.length && roll.isHit) {
    const postCtx: ConditionContext = {
      isHit: roll.isHit, isCrit: roll.isCrit, phase,
      currentHp: state.currentHp, effectiveMaxLife,
      consecutiveHits: state.consecutiveHits,
      activeDebuffs: targetDebuffs,
      lastBlockAt: state.lastBlockAt, lastDodgeAt: state.lastDodgeAt,
      lastOverkillDamage: state.lastOverkillDamage, now,
      activeTempBuffIds: activeTempBuffs.map(b => b.id),
      killStreak: state.killStreak,
    };
    const postRoll = evaluateConditionalMods(graphMod.conditionalMods, postCtx, 'post-roll');
    if (postRoll.incDamage || postRoll.flatDamage || postRoll.damageMult !== 1) {
      let bonusMult = 1;
      if (postRoll.incDamage) bonusMult *= (1 + postRoll.incDamage / 100);
      if (postRoll.damageMult !== 1) bonusMult *= postRoll.damageMult;
      (roll as { damage: number }).damage = roll.damage * bonusMult + postRoll.flatDamage;
    }
  }

  // Charge gain after roll
  if (chargeConfig) {
    const charges = newSkillCharges[skill.id];
    const shouldGain = (chargeConfig.gainOn === 'onHit' && roll.isHit)
      || (chargeConfig.gainOn === 'onCrit' && roll.isCrit);
    if (shouldGain) charges.current = Math.min(charges.current + chargeConfig.gainAmount, charges.max);
  }

  // Charge spend-all mechanic
  if (chargeConfig?.spendAll) {
    const charges = newSkillCharges[skill.id];
    if (charges.current > 0) {
      const shouldSpend = chargeConfig.spendAll.trigger === 'onCast'
        || (chargeConfig.spendAll.trigger === 'onCrit' && roll.isCrit);
      if (shouldSpend) {
        chargeSpendDamage = chargeConfig.spendAll.damagePerCharge * charges.current;
        charges.current = 0;
      }
    }
  }

  // Charge decay per tick
  if (chargeConfig?.decayRate && chargeConfig.decayRate > 0) {
    const charges = newSkillCharges[skill.id];
    if (charges.current > 0) {
      charges.current = Math.max(0, Math.floor(charges.current - chargeConfig.decayRate * dtSec));
    }
  }

  // Apply debuff damage amplification (incDamageTaken + reducedResists + incCritDamageTaken)
  // debuffEffectBonus scales debuff effects when reading them
  const effectBonus = graphMod?.debuffInteraction?.debuffEffectBonus
    ? (1 + graphMod.debuffInteraction.debuffEffectBonus / 100) : 1;
  let debuffDamageMult = 1;
  let debuffCritBonusMult = 1;
  for (const debuff of targetDebuffs) {
    const debuffDef = getDebuffDef(debuff.debuffId);
    if (!debuffDef) continue;
    if (debuffDef.effect.incDamageTaken) {
      debuffDamageMult += (debuffDef.effect.incDamageTaken * debuff.stacks * effectBonus) / 100;
    }
    if (debuffDef.effect.reducedResists) {
      debuffDamageMult += (debuffDef.effect.reducedResists * debuff.stacks * effectBonus) / 100;
    }
    if (debuffDef.effect.incCritDamageTaken && roll.isCrit) {
      debuffCritBonusMult += (debuffDef.effect.incCritDamageTaken * debuff.stacks * effectBonus) / 100;
    }
  }
  // bonusDamageVsDebuffed: extra damage when specific debuff is active
  let consumeMarkId: string | null = null;
  if (graphMod?.debuffInteraction?.bonusDamageVsDebuffed) {
    const bdv = graphMod.debuffInteraction.bonusDamageVsDebuffed;
    if (targetDebuffs.some(d => d.debuffId === bdv.debuffId)) {
      debuffDamageMult += bdv.incDamage / 100;
      if (bdv.consumeOnHit) consumeMarkId = bdv.debuffId;
    }
  }
  if (roll.isHit) {
    (roll as { damage: number }).damage *= debuffDamageMult * debuffCritBonusMult;
  }

  // Execute threshold: double damage when target below HP%
  if (graphMod?.executeThreshold && roll.isHit) {
    const targetHp = phase === 'boss_fight' && state.bossState
      ? state.bossState.bossCurrentHp / state.bossState.bossMaxHp
      : frontMobHp / frontMobMaxHp;
    if (targetHp * 100 < graphMod.executeThreshold) {
      (roll as { damage: number }).damage *= 2;
    }
  }

  // Ramping damage: global combat momentum stacks
  let newRampingStacks = state.rampingStacks;
  let newRampingLastHitAt = state.rampingLastHitAt;
  if (graphMod?.rampingDamage && roll.isHit) {
    const rd = graphMod.rampingDamage;
    if (now - state.rampingLastHitAt > rd.decayAfter * 1000) newRampingStacks = 0;
    if (newRampingStacks > 0) {
      (roll as { damage: number }).damage *= (1 + rd.perHit / 100 * newRampingStacks);
    }
    newRampingStacks = Math.min(newRampingStacks + 1, rd.maxStacks);
    newRampingLastHitAt = now;
  } else if (!roll.isHit && graphMod?.rampingDamage) {
    newRampingStacks = 0;  // miss resets momentum
  }

  // Fortify on hit: accumulate stacks, refresh duration
  let newFortifyStacks = state.fortifyStacks;
  let newFortifyExpiresAt = state.fortifyExpiresAt;
  let newFortifyDRPerStack = state.fortifyDRPerStack;
  if (now > state.fortifyExpiresAt) newFortifyStacks = 0;
  if (graphMod?.fortifyOnHit && roll.isHit) {
    newFortifyStacks = Math.min(newFortifyStacks + graphMod.fortifyOnHit.stacks, FORTIFY_MAX_STACKS);
    newFortifyExpiresAt = now + graphMod.fortifyOnHit.duration * 1000;
    newFortifyDRPerStack = graphMod.fortifyOnHit.damageReduction;
  }

  // Apply new debuffs from graph modifier
  let newDebuffs = [...targetDebuffs];
  // consumeOnHit: remove the mark debuff after its bonus was applied
  if (consumeMarkId) {
    const idx = newDebuffs.findIndex(d => d.debuffId === consumeMarkId);
    if (idx >= 0) newDebuffs.splice(idx, 1);
  }
  if (roll.isHit && graphMod) {
    for (const debuffInfo of graphMod.debuffs) {
      if (Math.random() < debuffInfo.chance) {
        // debuffDurationBonus: scale duration (graph + gear ailmentDuration)
        let duration = debuffInfo.duration;
        if (graphMod.debuffInteraction?.debuffDurationBonus) {
          duration *= (1 + graphMod.debuffInteraction.debuffDurationBonus / 100);
        }
        if (effectiveStats.ailmentDuration > 0) {
          duration *= (1 + effectiveStats.ailmentDuration / 100);
        }
        applyDebuffToList(newDebuffs, debuffInfo.debuffId, 1, duration, skill.id, roll.damage);
      }
    }
  }

  // debuffOnCrit: apply guaranteed debuff on crit
  if (graphMod?.debuffInteraction?.debuffOnCrit && roll.isCrit) {
    const doc = graphMod.debuffInteraction.debuffOnCrit;
    let duration = doc.duration;
    if (graphMod.debuffInteraction.debuffDurationBonus) {
      duration *= (1 + graphMod.debuffInteraction.debuffDurationBonus / 100);
    }
    if (effectiveStats.ailmentDuration > 0) {
      duration *= (1 + effectiveStats.ailmentDuration / 100);
    }
    applyDebuffToList(newDebuffs, doc.debuffId, doc.stacks, duration, skill.id, roll.damage);
  }

  // consumeDebuff: consume all stacks, deal burst damage
  let consumeBurstDamage = 0;
  if (graphMod?.debuffInteraction?.consumeDebuff && roll.isHit) {
    const cd = graphMod.debuffInteraction.consumeDebuff;
    const idx = newDebuffs.findIndex(d => d.debuffId === cd.debuffId);
    if (idx >= 0) {
      consumeBurstDamage = cd.damagePerStack * newDebuffs[idx].stacks;
      newDebuffs.splice(idx, 1);
    }
  }

  // Tick debuff durations + apply DoT (type-aware + incDoTDamage scaling)
  const enemyMaxHp = (phase === 'boss_fight' && state.bossState)
    ? state.bossState.bossMaxHp
    : (frontMobMaxHp > 0 ? frontMobMaxHp : 1);
  const dotResult = tickDebuffDoT(newDebuffs, dtSec, effectBonus, stats.incDoTDamage, enemyMaxHp);
  const debuffDotDamage = dotResult.damage;
  const mainPoisonInstanceCount = dotResult.poisonInstanceCount;
  newDebuffs = dotResult.updatedDebuffs;

  // Proc evaluation (onHit + onCrit triggers)
  let procDamage = 0;
  let procHeal = 0;
  let procCooldownResets: string[] = [];
  let procGcdWasReset = false;
  const allProcsFired: string[] = [];
  const allProcEvents: ProcEvent[] = [];
  let newLastProcTriggerAt = { ...state.lastProcTriggerAt };
  if (graphMod?.skillProcs?.length) {
    const procCtx: ProcContext = {
      isHit: roll.isHit, isCrit: roll.isCrit,
      skillId: skill.id, effectiveMaxLife,
      stats: effectiveStats,
      weaponAvgDmg: avgDamage, weaponSpellPower: spellPower,
      damageMult, now,
      lastProcTriggerAt: newLastProcTriggerAt,
      weaponConversion,
    };

    const triggers: TriggerCondition[] = ['onCast', 'onCastComplete'];
    if (roll.isHit) triggers.push('onHit');
    if (roll.isCrit) triggers.push('onCrit');

    for (const trigger of triggers) {
      const pr = evaluateProcs(graphMod.skillProcs, trigger, procCtx);
      procDamage += pr.bonusDamage;
      procHeal += pr.healAmount;
      procCooldownResets.push(...pr.cooldownResets);
      allProcsFired.push(...pr.procsFired);
      allProcEvents.push(...buildProcEvents(pr, skill.id));
      Object.assign(newLastProcTriggerAt, pr.procTriggeredAt);

      // Merge proc temp buffs (stack or add)
      for (const buff of pr.newTempBuffs) {
        activeTempBuffs = mergeProcTempBuff(activeTempBuffs, buff);
      }

      // Merge proc debuffs
      for (const pd of pr.newDebuffs) {
        applyDebuffToList(newDebuffs, pd.debuffId, pd.stacks, pd.duration, pd.skillId, roll.damage);
      }
    }
  }

  // onDebuffApplied conditionals — after all debuff application
  if (graphMod?.conditionalMods?.length) {
    const debuffsAppliedThisTick = newDebuffs.length > targetDebuffs.length;
    if (debuffsAppliedThisTick) {
      for (const cm of graphMod.conditionalMods) {
        if (cm.condition !== 'onDebuffApplied') continue;
        if (cm.modifier.incDamage && roll.isHit) {
          (roll as { damage: number }).damage *= (1 + cm.modifier.incDamage / 100);
        }
      }
    }
  }

  // Life leech: base + flag bonus + graph bonus + gear bonus (cannotLeech overrides all)
  const flagLeech = graphMod?.flags.includes('lifeLeech') ? LEECH_PERCENT : 0;
  const graphLeech = graphMod?.leechPercent ? graphMod.leechPercent / 100 : 0;
  const gearLeech = effectiveStats.lifeLeechPercent ? effectiveStats.lifeLeechPercent / 100 : 0;
  const totalLeech = graphMod?.cannotLeech ? 0 : (LEECH_PERCENT + flagLeech + graphLeech + gearLeech);

  // Update GCD: next active skill can fire after castInterval (already includes GCD floor)
  let nextActiveSkillAt = now + castInterval * 1000;

  // Update per-skill cooldown timer (if skill has a cooldown)
  // Apply graph CDR + ability haste for effective cooldown
  let newTimers = state.skillTimers;
  if (skill.cooldown > 0) {
    let effectiveCD = skill.cooldown * (1 - (graphMod?.cooldownReduction ?? 0) / 100);
    if (effectiveStats.abilityHaste > 0) {
      effectiveCD = effectiveCD / (1 + effectiveStats.abilityHaste / 100);
    }
    if (effectiveStats.cooldownRecovery > 0) {
      effectiveCD = effectiveCD / (1 + effectiveStats.cooldownRecovery / 100);
    }
    effectiveCD = Math.max(1, effectiveCD);
    const cdMs = effectiveCD * 1000;

    const timerIdx = state.skillTimers.findIndex(t => t.skillId === skill!.id);
    if (timerIdx >= 0) {
      newTimers = state.skillTimers.map((t, i) =>
        i === timerIdx
          ? { ...t, cooldownUntil: now + cdMs }
          : t,
      );
    } else {
      // Defensive: create timer entry if missing
      newTimers = [...state.skillTimers, {
        skillId: skill!.id,
        activatedAt: null,
        cooldownUntil: now + cdMs,
      }];
    }
  }

  // Proc cooldown resets
  if (procCooldownResets.length > 0) {
    newTimers = newTimers.map(t =>
      procCooldownResets.includes(t.skillId) ? { ...t, cooldownUntil: null } : t,
    );
  }

  // ── Ephemeral state tracking ──
  // Same-target consecutive hit tracking: reset if mob type changed
  const mobTypeChanged = state.currentMobTypeId !== state.lastHitMobTypeId && state.lastHitMobTypeId !== null;
  const newConsecutiveHits = roll.isHit ? (mobTypeChanged ? 1 : state.consecutiveHits + 1) : 0;
  const newLastCritAt = roll.isCrit ? now : state.lastCritAt;
  const newLastSkillsCast = [...state.lastSkillsCast.slice(-3), skill.id];
  let newKillStreak = state.killStreak;
  let newLastOverkillDamage = state.lastOverkillDamage;
  let newLastBlockAt = state.lastBlockAt;
  let newLastDodgeAt = state.lastDodgeAt;

  // ── Boss fight path ──
  if (phase === 'boss_fight' && state.bossState) {
    const bs = state.bossState;
    let totalDamage = 0;
    let bleedTriggerDamage = 0;
    let newBossHp = bs.bossCurrentHp;

    if (roll.isHit) {
      newBossHp -= roll.damage;
      totalDamage = roll.damage;
    }

    // Apply debuff DoT to boss
    if (debuffDotDamage > 0) {
      newBossHp -= debuffDotDamage;
      totalDamage += debuffDotDamage;
    }

    // Charge spend-all bonus damage to boss
    if (chargeSpendDamage > 0) {
      newBossHp -= chargeSpendDamage;
      totalDamage += chargeSpendDamage;
    }

    // consumeDebuff burst damage to boss
    if (consumeBurstDamage > 0) {
      newBossHp -= consumeBurstDamage;
      totalDamage += consumeBurstDamage;
    }

    // Proc bonus damage to boss
    if (procDamage > 0) {
      newBossHp -= procDamage;
      totalDamage += procDamage;
    }

    // Boss per-hit attack (if attack timer is due)
    let playerHp = state.currentHp;
    let nextAttack = bs.bossNextAttackAt;
    let bossAttackResult: CombatTickResult['bossAttack'] = null;
    const mainEnemyMods = calcEnemyDebuffMods(state.activeDebuffs);
    if (now >= nextAttack) {
      // Bleed trigger: boss attacked (hit or miss — boss still swung)
      const mainBleedDmg = calcBleedTriggerDamage(newDebuffs, effectBonus, stats.incDoTDamage);
      if (mainBleedDmg > 0) {
        newBossHp -= mainBleedDmg;
        totalDamage += mainBleedDmg;
        bleedTriggerDamage += mainBleedDmg;
      }

      // Miss chance from debuffs (e.g. Blinded)
      if (Math.random() * 100 < mainEnemyMods.missChance) {
        bossAttackResult = { damage: 0, isDodged: true, isBlocked: false, isCrit: false };
        nextAttack = now + bs.bossAttackInterval * mainEnemyMods.atkSpeedSlowMult * 1000;
      } else {
        // Boss damage smoothing: variance + crit
        const isBossCrit = Math.random() < BOSS_CRIT_CHANCE;
        const bossVariance = 0.6 + Math.random() * 0.4; // 60%-100% normal
        const rawBossDmg = bs.bossDamagePerHit * (isBossCrit ? BOSS_CRIT_MULTIPLIER : bossVariance);

        const bossRoll = rollZoneAttack(rawBossDmg, bs.bossPhysRatio, bs.bossAccuracy, effectiveStats, bs.dodgeEntropy, bs.bossDamageElement, zone.band);
        bs.dodgeEntropy = bossRoll.newDodgeEntropy;

        // Incoming damage multiplier (increasedDamageTaken keystone + berserk)
        let incomingMult = mainEnemyMods.damageMult;
        if (graphMod?.increasedDamageTaken) incomingMult *= (1 + graphMod.increasedDamageTaken / 100);
        if (graphMod?.berserk) incomingMult *= (1 + graphMod.berserk.damageTakenIncrease / 100);

        // Damage cap: never exceed BOSS_MAX_DMG_RATIO of maxHP per hit
        let cappedBossDmg = Math.min(bossRoll.damage * incomingMult, stats.maxLife * BOSS_MAX_DMG_RATIO);
        // Fortify DR (current tick values)
        const mainBossFortifyDR = calcFortifyDR(newFortifyStacks, newFortifyExpiresAt, newFortifyDRPerStack, now, effectiveStats.fortifyEffect);
        if (mainBossFortifyDR > 0) cappedBossDmg *= (1 - mainBossFortifyDR);
        if (effectiveStats.damageTakenReduction > 0) cappedBossDmg *= (1 - effectiveStats.damageTakenReduction / 100);
        playerHp -= cappedBossDmg;
        bossAttackResult = { damage: cappedBossDmg, isDodged: bossRoll.isDodged, isBlocked: bossRoll.isBlocked, isCrit: isBossCrit };
        nextAttack = now + bs.bossAttackInterval * mainEnemyMods.atkSpeedSlowMult * 1000;
      }
    }

    // Track block/dodge from boss attack
    if (bossAttackResult?.isBlocked) newLastBlockAt = now;
    if (bossAttackResult?.isDodged) newLastDodgeAt = now;
    if (bossAttackResult && bossAttackResult.damage > 0) newKillStreak = 0;

    // Defensive proc evaluation (onDodge + onBlock triggers)
    if (graphMod?.skillProcs?.length && bossAttackResult) {
      const defenseTriggers: TriggerCondition[] = [];
      if (bossAttackResult.isDodged) defenseTriggers.push('onDodge');
      if (bossAttackResult.isBlocked) defenseTriggers.push('onBlock');
      if (defenseTriggers.length > 0) {
        const defProcCtx: ProcContext = {
          isHit: roll.isHit, isCrit: roll.isCrit,
          skillId: skill.id, effectiveMaxLife,
          stats: effectiveStats,
          weaponAvgDmg: avgDamage, weaponSpellPower: spellPower,
          damageMult, now,
          lastProcTriggerAt: newLastProcTriggerAt,
        };
        for (const trigger of defenseTriggers) {
          const pr = evaluateProcs(graphMod.skillProcs, trigger, defProcCtx);
          Object.assign(newLastProcTriggerAt, pr.procTriggeredAt);
          allProcsFired.push(...pr.procsFired);
          // Apply defensive proc damage directly to boss (onHit/onCrit proc damage was already applied)
          if (pr.bonusDamage > 0) {
            newBossHp -= pr.bonusDamage;
            totalDamage += pr.bonusDamage;
          }
          procHeal += pr.healAmount;
          procCooldownResets.push(...pr.cooldownResets);
          for (const buff of pr.newTempBuffs) {
            activeTempBuffs = mergeProcTempBuff(activeTempBuffs, buff);
          }
          for (const pd of pr.newDebuffs) {
            applyDebuffToList(newDebuffs, pd.debuffId, pd.stacks, pd.duration, pd.skillId);
          }
        }
      }
    }

    // Passive regen per tick
    playerHp = Math.min(effectiveMaxLife, playerHp + stats.lifeRegen * dtSec);

    // Life leech from player's attack
    if (roll.isHit && totalLeech > 0) {
      playerHp = Math.min(effectiveMaxLife, playerHp + roll.damage * totalLeech);
    }

    // Life on hit (graph + gear)
    {
      const totalLifeOnHit = (graphMod?.lifeOnHit ?? 0) + (effectiveStats.lifeOnHit ?? 0);
      if (roll.isHit && totalLifeOnHit > 0) {
        playerHp = Math.min(effectiveMaxLife, playerHp + totalLifeOnHit);
      }
    }

    // Proc heal
    if (procHeal > 0) {
      playerHp = Math.min(effectiveMaxLife, playerHp + procHeal);
    }

    // Self-damage on cast
    if (graphMod?.selfDamagePercent) {
      playerHp -= effectiveMaxLife * (graphMod.selfDamagePercent / 100);
    }

    const trackingBoss = {
      consecutiveHits: newConsecutiveHits,
      lastSkillsCast: newLastSkillsCast,
      lastOverkillDamage: newLastOverkillDamage,
      killStreak: newKillStreak,
      lastCritAt: newLastCritAt,
      lastBlockAt: newLastBlockAt,
      lastDodgeAt: newLastDodgeAt,
      rampingStacks: newRampingStacks, rampingLastHitAt: newRampingLastHitAt,
      fortifyStacks: newFortifyStacks, fortifyExpiresAt: newFortifyExpiresAt, fortifyDRPerStack: newFortifyDRPerStack,
      lastHitMobTypeId: state.currentMobTypeId,
      lastProcTriggerAt: newLastProcTriggerAt,
    };

    const updatedBoss = { ...bs, bossCurrentHp: newBossHp, bossNextAttackAt: nextAttack };

    const bossResult: CombatTickResult = {
      mobKills: 0, skillFired: true, damageDealt: totalDamage,
      skillId: skill.id, isCrit: roll.isCrit, isHit: roll.isHit,
      bossAttack: bossAttackResult,
      dotDamage: debuffDotDamage, bleedTriggerDamage,
      poisonInstanceCount: mainPoisonInstanceCount,
      procDamage: procDamage > 0 ? procDamage : undefined,
      procLabel: allProcsFired.length > 0 ? (prettifyProcId(allProcsFired[0])) : undefined,
      cooldownWasReset: procCooldownResets.length > 0,
      // Structured events
      procEvents: allProcEvents.length > 0 ? allProcEvents : undefined,
      cooldownResets: procCooldownResets.length > 0 ? procCooldownResets : undefined,
    };

    // Check outcomes
    if (newBossHp <= 0) {
      return {
        patch: {
          ...trackingBoss,
          bossState: { ...updatedBoss, bossCurrentHp: 0 },
          currentHp: Math.max(1, playerHp),
          dodgeEntropy: Math.floor(Math.random() * 100),
          nextActiveSkillAt,
          skillTimers: newTimers,
          activeDebuffs: [], // Clear debuffs on boss death
          tempBuffs: [], // Clear temp buffs on boss death
          skillCharges: newSkillCharges,
        },
        result: { ...bossResult, bossOutcome: 'victory' },
      };
    }
    if (playerHp <= 0) {
      return {
        patch: {
          ...trackingBoss,
          bossState: updatedBoss,
          currentHp: 0,
          dodgeEntropy: Math.floor(Math.random() * 100),
          nextActiveSkillAt,
          skillTimers: newTimers,
          activeDebuffs: [], // Clear debuffs on death
          tempBuffs: [], // Clear temp buffs on death
          skillCharges: newSkillCharges,
        },
        result: { ...bossResult, bossOutcome: 'defeat' },
      };
    }

    return {
      patch: {
        ...trackingBoss,
        bossState: updatedBoss,
        currentHp: playerHp,
        nextActiveSkillAt,
        skillTimers: newTimers,
        activeDebuffs: newDebuffs,
        tempBuffs: activeTempBuffs,
        skillCharges: newSkillCharges,
      },
      result: { ...bossResult, bossOutcome: 'ongoing' },
    };
  }

  // ── Normal clearing path (per-mob pack system) ──
  let updatedPackMobs = state.packMobs.map(m => ({ ...m, debuffs: [...m.debuffs] }));
  let mobKills = 0;
  let totalDamage = 0;
  let bleedTriggerDamage = 0;
  let shatterDamage = 0;
  let didSpreadDebuffs = false;
  const allSpreadEvents: SpreadResult[] = [];
  const skillIsAoE = isSkillAoE(state.skillBar, skill.id, state.skillProgress);

  // Compute total damage to apply (before per-mob DR)
  let rawSkillDamage = 0;
  if (roll.isHit) rawSkillDamage += roll.damage;
  if (debuffDotDamage > 0) rawSkillDamage += debuffDotDamage;
  if (chargeSpendDamage > 0) rawSkillDamage += chargeSpendDamage;
  if (consumeBurstDamage > 0) rawSkillDamage += consumeBurstDamage;
  if (procDamage > 0) rawSkillDamage += procDamage;

  // Apply damage to front mob (index 0) with its per-mob DR + regen
  if (updatedPackMobs.length > 0 && rawSkillDamage > 0) {
    const front = updatedPackMobs[0];
    const frontDR = front.rare?.combinedDamageTakenMult ?? 1;
    const effectiveDmg = rawSkillDamage * frontDR;
    front.hp -= effectiveDmg;
    totalDamage = effectiveDmg;
    // Apply debuffs to front mob (single-target or AoE)
    front.debuffs = newDebuffs;
  }

  // AoE splash: apply to ALL mobs (including front, but front already took damage above)
  if (skillIsAoE && updatedPackMobs.length > 1 && rawSkillDamage > 0) {
    for (let i = 1; i < updatedPackMobs.length; i++) {
      const mob = updatedPackMobs[i];
      const mobDR = mob.rare?.combinedDamageTakenMult ?? 1;
      mob.hp -= rawSkillDamage * mobDR;
      // AoE debuff application: apply same debuffs to back mobs
      for (const debuffInfo of newDebuffs) {
        const existingIdx = mob.debuffs.findIndex(d => d.debuffId === debuffInfo.debuffId);
        if (existingIdx >= 0) {
          mob.debuffs[existingIdx] = { ...debuffInfo };
        } else {
          mob.debuffs.push({ ...debuffInfo });
        }
      }
    }
  }

  // Per-mob regen (Regenerating)
  for (const mob of updatedPackMobs) {
    const regenRate = mob.rare?.combinedRegenPerSec ?? 0;
    if (regenRate > 0 && mob.maxHp > 0) {
      mob.hp = Math.min(mob.maxHp, mob.hp + mob.maxHp * regenRate * dtSec);
    }
  }

  // Move playerHp before death loop for lifeOnKill
  let playerHp = state.currentHp;
  let newCurrentEs = state.currentEs;

  // Count and remove dead back mobs (killed by AoE splash)
  let packMobKills = 0;
  if (skillIsAoE && updatedPackMobs.length > 1) {
    const beforeCount = updatedPackMobs.length;
    // Keep front mob separate, filter dead back mobs
    const aliveBacks = updatedPackMobs.slice(1).filter(m => m.hp > 0);
    packMobKills = (beforeCount - 1) - aliveBacks.length;
    updatedPackMobs = [updatedPackMobs[0], ...aliveBacks];
  }

  // Check for front mob death(s) — cap at 10 kills per tick for safety
  let newMobTypeId = state.currentMobTypeId;
  let newCurrentPackSize = state.currentPackSize;
  let encounterLootMult = 1;
  // Compute max loot mult from current pack's rare mobs
  for (const m of updatedPackMobs) {
    if (m.rare) encounterLootMult = Math.max(encounterLootMult, m.rare.combinedLootMult);
  }
  const preDeathDebuffs = updatedPackMobs.length > 0 ? [...updatedPackMobs[0].debuffs] : [...newDebuffs];
  while (updatedPackMobs.length > 0 && updatedPackMobs[0].hp <= 0 && mobKills < 10) {
    mobKills++;
    newKillStreak++;

    // Life on kill (graph + gear)
    {
      const totalLifeOnKill = (graphMod?.lifeOnKill ?? 0) + (effectiveStats.lifeOnKill ?? 0);
      if (totalLifeOnKill > 0) {
        playerHp = Math.min(effectiveMaxLife, playerHp + totalLifeOnKill);
      }
    }

    // Charge gain on kill
    if (chargeConfig?.gainOn === 'onKill') {
      const charges = newSkillCharges[skill.id];
      if (charges) charges.current = Math.min(charges.current + chargeConfig.gainAmount, charges.max);
    }

    // onKill procs
    let killProcDebuffs: { debuffId: string; stacks: number; duration: number; skillId: string }[] = [];
    if (graphMod?.skillProcs?.length) {
      const killProcCtx: ProcContext = {
        isHit: roll.isHit, isCrit: roll.isCrit,
        skillId: skill.id, effectiveMaxLife,
        stats: effectiveStats,
        weaponAvgDmg: avgDamage, weaponSpellPower: spellPower,
        damageMult, now,
        lastProcTriggerAt: newLastProcTriggerAt,
      };
      const killPr = evaluateProcs(graphMod.skillProcs, 'onKill', killProcCtx);
      Object.assign(newLastProcTriggerAt, killPr.procTriggeredAt);
      allProcsFired.push(...killPr.procsFired);
      allProcEvents.push(...buildProcEvents(killPr, skill.id));
      procDamage += killPr.bonusDamage;
      procHeal += killPr.healAmount;
      procCooldownResets.push(...killPr.cooldownResets);
      for (const buff of killPr.newTempBuffs) {
        activeTempBuffs = [...activeTempBuffs, buff];
      }
      if (killPr.cooldownResets.length > 0) {
        newTimers = newTimers.map(t =>
          killPr.cooldownResets.includes(t.skillId) ? { ...t, cooldownUntil: null } : t,
        );
      }
      if (killPr.gcdWasReset) {
        nextActiveSkillAt = now;
        procGcdWasReset = true;
      }
      killProcDebuffs = killPr.newDebuffs;
    }

    // Overkill damage carry + bonus
    const overkillAmount = Math.abs(updatedPackMobs[0].hp);
    newLastOverkillDamage = overkillAmount;
    const overkillBonus = graphMod?.overkillDamage ? overkillAmount * (graphMod.overkillDamage / 100) : 0;

    // Chilled shatter: deal % of overkill to next mob as cold damage
    const chilledDebuff = preDeathDebuffs.find(d => d.debuffId === 'chilled');
    const shatterDmg = chilledDebuff
      ? overkillAmount * ((getDebuffDef('chilled')?.effect.shatterOverkillPercent ?? 0) / 100)
      : 0;
    if (shatterDmg > 0) shatterDamage += shatterDmg;

    // Remove dead front mob
    updatedPackMobs.shift();

    // Pack progression: if mobs remain, carry overkill + shatter to new front
    if (updatedPackMobs.length > 0) {
      updatedPackMobs[0].hp -= (overkillAmount + overkillBonus + shatterDmg);
      if (updatedPackMobs[0].hp <= 0 && updatedPackMobs[0].hp > -updatedPackMobs[0].maxHp) {
        // Will loop again to kill this mob too
      }

      // spreadDebuffOnKill: re-apply matching debuffs to new front mob
      if (graphMod?.debuffInteraction?.spreadDebuffOnKill) {
        const spreads = spreadDebuffsToTarget(updatedPackMobs[0].debuffs, preDeathDebuffs, graphMod.debuffInteraction.spreadDebuffOnKill);
        if (spreads.length > 0) {
          didSpreadDebuffs = true;
          allSpreadEvents.push(...spreads);
        }
      }

      // Apply onKill proc debuffs to new front mob
      for (const pd of killProcDebuffs) {
        applyDebuffToList(updatedPackMobs[0].debuffs, pd.debuffId, pd.stacks, pd.duration, pd.skillId);
      }
    } else {
      // Pack fully dead — roll NEW encounter (new mob type, new pack)
      newMobTypeId = pickCurrentMob(zone.id, state.targetedMobId);
      const tickMobDef = newMobTypeId ? getMobTypeDef(newMobTypeId) : undefined;
      const hpMult = tickMobDef?.hpMultiplier ?? 1.0;
      const invHpMult = isZoneInvaded(state.invasionState, zone.id, zone.band) ? INVASION_DIFFICULTY_MULT : 1.0;

      updatedPackMobs = spawnPack(zone, hpMult, invHpMult, now, tickMobDef?.damageElement, tickMobDef?.physRatio);
      newCurrentPackSize = updatedPackMobs.length;

      // Compute new encounter loot mult
      encounterLootMult = 1;
      for (const m of updatedPackMobs) {
        if (m.rare) encounterLootMult = Math.max(encounterLootMult, m.rare.combinedLootMult);
      }

      // Apply overkill + shatter to new front mob
      if (updatedPackMobs.length > 0) {
        updatedPackMobs[0].hp -= (overkillAmount + overkillBonus + shatterDmg);
        if (updatedPackMobs[0].hp <= 0) updatedPackMobs[0].hp = updatedPackMobs[0].maxHp; // safety
      }

      // spreadDebuffOnKill: apply to new pack's front mob
      if (graphMod?.debuffInteraction?.spreadDebuffOnKill && updatedPackMobs.length > 0) {
        const spreads = spreadDebuffsToTarget(updatedPackMobs[0].debuffs, preDeathDebuffs, graphMod.debuffInteraction.spreadDebuffOnKill);
        if (spreads.length > 0) {
          didSpreadDebuffs = true;
          allSpreadEvents.push(...spreads);
        }
      }

      // Apply onKill proc debuffs to new front mob
      if (updatedPackMobs.length > 0) {
        for (const pd of killProcDebuffs) {
          applyDebuffToList(updatedPackMobs[0].debuffs, pd.debuffId, pd.stacks, pd.duration, pd.skillId);
        }
      }
    }
  }

  // Add pack back-mob kills (AoE splash kills)
  mobKills += packMobKills;
  // On-kill effects for pack mob kills (life on kill, charge gain, onKill procs)
  for (let i = 0; i < packMobKills; i++) {
    newKillStreak++;
    {
      const totalLifeOnKill = (graphMod?.lifeOnKill ?? 0) + (effectiveStats.lifeOnKill ?? 0);
      if (totalLifeOnKill > 0) {
        playerHp = Math.min(effectiveMaxLife, playerHp + totalLifeOnKill);
      }
    }
    if (chargeConfig?.gainOn === 'onKill') {
      const charges = newSkillCharges[skill.id];
      if (charges) charges.current = Math.min(charges.current + chargeConfig.gainAmount, charges.max);
    }
    // onKill procs for AoE back-mob kills
    if (graphMod?.skillProcs?.length) {
      const aoeKillCtx: ProcContext = {
        isHit: roll.isHit, isCrit: roll.isCrit,
        skillId: skill.id, effectiveMaxLife,
        stats: effectiveStats,
        weaponAvgDmg: avgDamage, weaponSpellPower: spellPower,
        damageMult, now,
        lastProcTriggerAt: newLastProcTriggerAt,
      };
      const aoeKillPr = evaluateProcs(graphMod.skillProcs, 'onKill', aoeKillCtx);
      Object.assign(newLastProcTriggerAt, aoeKillPr.procTriggeredAt);
      allProcsFired.push(...aoeKillPr.procsFired);
      allProcEvents.push(...buildProcEvents(aoeKillPr, skill.id));
      procDamage += aoeKillPr.bonusDamage;
      procHeal += aoeKillPr.healAmount;
      procCooldownResets.push(...aoeKillPr.cooldownResets);
      for (const buff of aoeKillPr.newTempBuffs) {
        activeTempBuffs = mergeProcTempBuff(activeTempBuffs, buff);
      }
      if (aoeKillPr.cooldownResets.length > 0) {
        newTimers = newTimers.map(t =>
          aoeKillPr.cooldownResets.includes(t.skillId) ? { ...t, cooldownUntil: null } : t,
        );
      }
      if (aoeKillPr.gcdWasReset) {
        nextActiveSkillAt = now;
        procGcdWasReset = true;
      }
    }
  }

  // Zone attack check: per-mob attack timers during skill-fired tick
  let zoneAttackResult: CombatTickResult['zoneAttack'] = null;
  let currentDodgeEntropy = state.dodgeEntropy;
  const packDmgScale = updatedPackMobs.length > 1 ? 1 / Math.sqrt(updatedPackMobs.length) : 1;
  for (const mob of updatedPackMobs) {
    if (mob.nextAttackAt <= 0 || now < mob.nextAttackAt) continue;
    const mobEnemyMods = calcEnemyDebuffMods(mob.debuffs);

    // Bleed trigger: mob attacked
    const clearBleedDmg = calcBleedTriggerDamage(mob.debuffs, effectBonus, stats.incDoTDamage);
    if (clearBleedDmg > 0) {
      mob.hp -= clearBleedDmg;
      totalDamage += clearBleedDmg;
      bleedTriggerDamage += clearBleedDmg;
    }

    const mobRareAtkMult = mob.rare?.combinedAtkSpeedMult ?? 1;

    if (Math.random() * 100 < mobEnemyMods.missChance) {
      zoneAttackResult = { damage: 0, isDodged: true, isBlocked: false };
      mob.nextAttackAt = now + ZONE_ATTACK_INTERVAL * mobEnemyMods.atkSpeedSlowMult * mobRareAtkMult * 1000;
    } else {
      const defStats = applyAbilityResists(stats, abilityEffect);
      const buffedStats: ResolvedStats = abilityEffect.defenseMult
        ? { ...defStats, armor: defStats.armor * abilityEffect.defenseMult, evasion: defStats.evasion * abilityEffect.defenseMult }
        : defStats;

      const levelMult = calcLevelDamageMult(state.character.level, zone.iLvlMin);
      const zoneAccuracy = calcZoneAccuracy(zone.band, state.character.level, zone.iLvlMin);
      const variance = 0.8 + Math.random() * 0.4;
      const mobRareDmgMult = mob.rare?.combinedDamageMult ?? 1;
      const rawDmg = (ZONE_DMG_BASE * zone.band + ZONE_DMG_ILVL_SCALE * zone.iLvlMin) * levelMult * variance * mobRareDmgMult * packDmgScale;

      const zoneRoll = rollZoneAttack(rawDmg, mob.physRatio, zoneAccuracy, buffedStats, currentDodgeEntropy, mob.damageElement, zone.band);
      currentDodgeEntropy = zoneRoll.newDodgeEntropy;

      let clearIncomingMult = mobEnemyMods.damageMult;
      if (graphMod?.increasedDamageTaken) clearIncomingMult *= (1 + graphMod.increasedDamageTaken / 100);
      if (graphMod?.berserk) clearIncomingMult *= (1 + graphMod.berserk.damageTakenIncrease / 100);

      let clearZoneDmg = zoneRoll.damage * clearIncomingMult;
      const mainClearFortifyDR = calcFortifyDR(newFortifyStacks, newFortifyExpiresAt, newFortifyDRPerStack, now, effectiveStats.fortifyEffect);
      if (mainClearFortifyDR > 0) clearZoneDmg *= (1 - mainClearFortifyDR);
      if (effectiveStats.damageTakenReduction > 0) clearZoneDmg *= (1 - effectiveStats.damageTakenReduction / 100);
      if (newCurrentEs > 0 && clearZoneDmg > 0) {
        const esAbs = Math.min(newCurrentEs, clearZoneDmg);
        newCurrentEs -= esAbs;
        clearZoneDmg -= esAbs;
      }
      playerHp -= clearZoneDmg;
      zoneAttackResult = zoneRoll;
      mob.nextAttackAt = now + ZONE_ATTACK_INTERVAL * mobEnemyMods.atkSpeedSlowMult * mobRareAtkMult * 1000;
    }
  }

  // Passive regen per tick
  playerHp = Math.min(effectiveMaxLife, playerHp + stats.lifeRegen * dtSec);

  // Life leech from player's attack
  if (roll.isHit && totalLeech > 0) {
    playerHp = Math.min(effectiveMaxLife, playerHp + roll.damage * totalLeech);
  }

  // Life on hit (graph + gear)
  {
    const totalLifeOnHit = (graphMod?.lifeOnHit ?? 0) + (effectiveStats.lifeOnHit ?? 0);
    if (roll.isHit && totalLifeOnHit > 0) {
      playerHp = Math.min(effectiveMaxLife, playerHp + totalLifeOnHit);
    }
  }

  // Proc heal
  if (procHeal > 0) {
    playerHp = Math.min(effectiveMaxLife, playerHp + procHeal);
  }

  // Self-damage on cast
  if (graphMod?.selfDamagePercent) {
    playerHp -= effectiveMaxLife * (graphMod.selfDamagePercent / 100);
  }

  // Track block/dodge from zone attack
  if (zoneAttackResult?.isBlocked) newLastBlockAt = now;
  if (zoneAttackResult?.isDodged) newLastDodgeAt = now;
  if (zoneAttackResult && zoneAttackResult.damage > 0) newKillStreak = 0;

  // Defensive proc evaluation (onDodge + onBlock triggers)
  if (graphMod?.skillProcs?.length && zoneAttackResult) {
    const defenseTriggers: TriggerCondition[] = [];
    if (zoneAttackResult.isDodged) defenseTriggers.push('onDodge');
    if (zoneAttackResult.isBlocked) defenseTriggers.push('onBlock');
    if (defenseTriggers.length > 0) {
      const defProcCtx: ProcContext = {
        isHit: roll.isHit, isCrit: roll.isCrit,
        skillId: skill.id, effectiveMaxLife,
        stats: effectiveStats,
        weaponAvgDmg: avgDamage, weaponSpellPower: spellPower,
        damageMult, now,
        lastProcTriggerAt: newLastProcTriggerAt,
      };
      for (const trigger of defenseTriggers) {
        const pr = evaluateProcs(graphMod.skillProcs, trigger, defProcCtx);
        Object.assign(newLastProcTriggerAt, pr.procTriggeredAt);
        allProcsFired.push(...pr.procsFired);
        allProcEvents.push(...buildProcEvents(pr, skill.id));
        if (pr.bonusDamage > 0 && updatedPackMobs.length > 0) {
          updatedPackMobs[0].hp -= pr.bonusDamage;
          totalDamage += pr.bonusDamage;
        }
        procHeal += pr.healAmount;
        procCooldownResets.push(...pr.cooldownResets);
        for (const buff of pr.newTempBuffs) {
          activeTempBuffs = mergeProcTempBuff(activeTempBuffs, buff);
        }
        if (updatedPackMobs.length > 0) {
          for (const pd of pr.newDebuffs) {
            applyDebuffToList(updatedPackMobs[0].debuffs, pd.debuffId, pd.stacks, pd.duration, pd.skillId);
          }
        }
      }
    }
  }

  const trackingClear = {
    consecutiveHits: newConsecutiveHits,
    lastSkillsCast: newLastSkillsCast,
    lastOverkillDamage: newLastOverkillDamage,
    killStreak: newKillStreak,
    lastCritAt: newLastCritAt,
    lastBlockAt: newLastBlockAt,
    lastDodgeAt: newLastDodgeAt,
    dodgeEntropy: currentDodgeEntropy,
    rampingStacks: newRampingStacks, rampingLastHitAt: newRampingLastHitAt,
    fortifyStacks: newFortifyStacks, fortifyExpiresAt: newFortifyExpiresAt, fortifyDRPerStack: newFortifyDRPerStack,
    lastHitMobTypeId: state.currentMobTypeId,
    lastProcTriggerAt: newLastProcTriggerAt,
  };

  // ES recharge per tick
  if (stats.esRecharge > 0) {
    newCurrentEs = Math.min(stats.energyShield, newCurrentEs + stats.esRecharge * dtSec);
  }

  const clearResult: CombatTickResult = {
    mobKills,
    skillFired: true,
    damageDealt: totalDamage,
    skillId: skill.id,
    isCrit: roll.isCrit,
    isHit: roll.isHit,
    zoneAttack: zoneAttackResult,
    dotDamage: debuffDotDamage, bleedTriggerDamage, shatterDamage,
    poisonInstanceCount: mainPoisonInstanceCount,
    procDamage: procDamage > 0 ? procDamage : undefined,
    procLabel: allProcsFired.length > 0 ? (prettifyProcId(allProcsFired[0])) : undefined,
    cooldownWasReset: procCooldownResets.length > 0,
    gcdWasReset: procGcdWasReset,
    didSpreadDebuffs,
    packSize: newCurrentPackSize,
    encounterLootMult,
    // Structured events
    procEvents: allProcEvents.length > 0 ? allProcEvents : undefined,
    spreadEvents: allSpreadEvents.length > 0 ? allSpreadEvents : undefined,
    cooldownResets: procCooldownResets.length > 0 ? procCooldownResets : undefined,
  };

  // Zone death check
  if (playerHp <= 0) {
    const deathNow2 = now;
    const streakReset2 = deathNow2 - state.lastDeathTime > DEATH_STREAK_WINDOW * 1000;
    const newStreak2 = streakReset2 ? 0 : state.deathStreak + 1;
    return {
      patch: {
        ...trackingClear,
        dodgeEntropy: Math.floor(Math.random() * 100),
        currentHp: 0,
        currentEs: 0,
        currentMobTypeId: newMobTypeId,
        nextActiveSkillAt,
        skillTimers: newTimers,
        combatPhase: 'zone_defeat' as CombatPhase,
        combatPhaseStartedAt: deathNow2,
        activeDebuffs: [],
        tempBuffs: [],
        skillCharges: newSkillCharges,
        packMobs: updatedPackMobs,
        currentPackSize: newCurrentPackSize,
        deathStreak: newStreak2,
        lastDeathTime: deathNow2,
      },
      result: { ...clearResult, zoneDeath: true },
    };
  }

  return {
    patch: {
      ...trackingClear,
      currentMobTypeId: newMobTypeId,
      nextActiveSkillAt,
      skillTimers: newTimers,
      currentHp: playerHp,
      currentEs: newCurrentEs,
      tempBuffs: activeTempBuffs,
      skillCharges: newSkillCharges,
      packMobs: updatedPackMobs,
      currentPackSize: newCurrentPackSize,
    },
    result: clearResult,
  };
}

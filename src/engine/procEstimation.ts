// ============================================================
// Idle Exile — Proc DPS Estimation (Steady-State Expected Value)
// Pure functions: no simulation, no RNG, no store dependency.
// ============================================================

import type {
  SkillProcEffect, ConditionalModifier, ResolvedStats,
  TriggerCondition,
} from '../types';
import type { DebuffInteraction } from '../types/skills';
import {
  ZONE_ATTACK_INTERVAL, DODGE_CAP, EVASION_DR_EXPONENT,
} from '../data/balance';
import { getDebuffDef } from '../data/debuffs';

// ─── Public Types ───

/** Optional zone context for more accurate estimation. */
export interface CombatContext {
  mobAttackInterval: number;   // seconds between mob attacks
  zoneAccuracy: number;        // mob accuracy value for dodge calculation
}

/** Result of steady-state proc DPS estimation. */
export interface ProcDpsEstimate {
  instantDamageDps: number;    // flat DPS from instant-damage procs
  debuffTickDps: number;       // flat DPS from ongoing debuff ticks (poison, etc.)
  buffDpsMult: number;         // multiplicative factor from buff uptimes
  conditionalDpsMult: number;  // multiplicative factor from conditional mods
  debuffInteractionMult: number; // multiplicative factor from debuff interactions
}

// ─── Defaults ───

const DEFAULT_MOB_ATTACK_INTERVAL = ZONE_ATTACK_INTERVAL; // 2.0s
const DEFAULT_ZONE_ACCURACY = 100;
const KILL_RATE = 0.25; // heuristic: 1 kill per 4s

// ─── Trigger Rate Calculation ───

function calcDodgeChance(evasion: number, zoneAccuracy: number): number {
  const rawDodge = evasion / (evasion + zoneAccuracy);
  return Math.min(Math.pow(rawDodge, EVASION_DR_EXPONENT), DODGE_CAP / 100);
}

interface TriggerRateCtx {
  hitChance: number;       // 0-1
  critRate: number;        // 0-1
  avgCycleTime: number;    // seconds
  dodgeChance: number;     // 0-1
  blockChance: number;     // 0-1
  mobAttackInterval: number;
}

function calcTriggerRate(trigger: TriggerCondition, ctx: TriggerRateCtx): number {
  switch (trigger) {
    case 'onHit':
      return ctx.hitChance / ctx.avgCycleTime;
    case 'onCrit':
      return ctx.critRate * ctx.hitChance / ctx.avgCycleTime;
    case 'onCast':
    case 'onCastComplete':
      return 1 / ctx.avgCycleTime;
    case 'onDodge':
      return ctx.dodgeChance / ctx.mobAttackInterval;
    case 'onBlock':
      return (1 - ctx.dodgeChance) * ctx.blockChance / ctx.mobAttackInterval;
    case 'onKill':
      return KILL_RATE;
    default:
      return 0;
  }
}

// ─── scaleStat Resolution ───

function resolveScaleStat(
  scaleStat: string,
  weaponAvgDmg: number,
  stats: ResolvedStats,
): number {
  if (scaleStat === 'weaponDamage') return weaponAvgDmg;
  if (scaleStat === 'debuffDamage') {
    return weaponAvgDmg
      * (1 + (stats.incChaosDamage ?? 0) / 100)
      * (1 + (stats.dotMultiplier ?? 0) / 100);
  }
  const raw = stats[scaleStat as keyof ResolvedStats];
  return typeof raw === 'number' ? raw : 0;
}

// ─── Main Estimation ───

export function estimateProcDps(
  allProcs: SkillProcEffect[],
  conditionalMods: ConditionalModifier[],
  debuffInteraction: DebuffInteraction | null,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  avgCycleTime: number,
  combatCtx?: CombatContext,
  baseIncDamage: number = 0,
  graphCritChance: number = 0,
  graphCritMult: number = 0,
): ProcDpsEstimate {
  const mobAttackInterval = combatCtx?.mobAttackInterval ?? DEFAULT_MOB_ATTACK_INTERVAL;
  const zoneAccuracy = combatCtx?.zoneAccuracy ?? DEFAULT_ZONE_ACCURACY;

  // Pre-compute combat stats (with graph-modified crit when available)
  const hitChance = stats.accuracy / (stats.accuracy + 50); // ACCURACY_DIVISOR = 50
  const critRate = Math.min(stats.critChance * (1 + graphCritChance / 100), 100) / 100;
  const critMult = 1 + critRate * ((stats.critMultiplier + graphCritMult - 100) / 100);
  const dodgeChance = calcDodgeChance(stats.evasion, zoneAccuracy);
  const blockChance = Math.min(stats.blockChance, 75) / 100; // BLOCK_CAP = 75

  const triggerCtx: TriggerRateCtx = {
    hitChance, critRate, avgCycleTime, dodgeChance, blockChance, mobAttackInterval,
  };

  // ─── Dedup procs by id: each unique proc fires at most once per trigger event ───
  const uniqueProcs = new Map<string, SkillProcEffect>();
  for (const proc of allProcs) {
    if (!uniqueProcs.has(proc.id)) uniqueProcs.set(proc.id, proc);
  }

  // ─── Instant Damage Procs ───
  let instantDamageDps = 0;

  // ─── Buff Uptimes ───
  // Track buff durations/uptimes for whileBuffActive conditional lookup
  const buffUptimes = new Map<string, number>(); // buffId → uptime (0-1)
  let totalDamageMult = 1;
  let totalAtkSpeedMult = 1;
  let totalCritMultBonus = 0;

  for (const proc of uniqueProcs.values()) {
    const baseTriggerRate = calcTriggerRate(proc.trigger, triggerCtx);
    if (baseTriggerRate <= 0) continue;

    // Apply chance and ICD cap
    let effectiveRate = baseTriggerRate * proc.chance;
    if (proc.internalCooldown && proc.internalCooldown > 0) {
      effectiveRate = Math.min(effectiveRate, 1 / proc.internalCooldown);
    }

    // --- Instant damage ---
    if (proc.instantDamage) {
      let dmg = proc.instantDamage.flatDamage ?? 0;
      if (proc.instantDamage.scaleStat && proc.instantDamage.scaleRatio) {
        dmg += resolveScaleStat(proc.instantDamage.scaleStat, weaponAvgDmg, stats)
          * proc.instantDamage.scaleRatio;
      }
      // onDodge procs don't need hitChance (they fire from being attacked)
      const procHitFactor = proc.trigger === 'onDodge' ? 1 : hitChance;
      instantDamageDps += dmg * effectiveRate * procHitFactor * critMult;
    }

    // --- Buff uptime ---
    if (proc.applyBuff) {
      const uptime = Math.min(1.0, effectiveRate * proc.applyBuff.duration);
      const effect = proc.applyBuff.effect;

      // Track by buffId for whileBuffActive conditionals
      if (proc.applyBuff.buffId) {
        buffUptimes.set(proc.applyBuff.buffId, Math.max(
          buffUptimes.get(proc.applyBuff.buffId) ?? 0, uptime,
        ));
      }

      if (effect.damageMult && effect.damageMult !== 1) {
        totalDamageMult *= 1 + uptime * (effect.damageMult - 1);
      }
      if (effect.attackSpeedMult && effect.attackSpeedMult !== 1) {
        totalAtkSpeedMult *= 1 + uptime * (effect.attackSpeedMult - 1);
      }
      if (effect.critMultiplierBonus) {
        totalCritMultBonus += uptime * effect.critMultiplierBonus;
      }
    }
  }

  // Crit multiplier bonus from buffs: weighted contribution
  const buffCritMult = critRate > 0 ? 1 + critRate * totalCritMultBonus / 100 : 1;
  const buffDpsMult = totalDamageMult * totalAtkSpeedMult * buffCritMult;

  // ─── Debuff Tick DPS (snapshot-based DoTs like poison) ───
  let debuffTickDps = 0;

  for (const proc of uniqueProcs.values()) {
    if (!proc.applyDebuff) continue;

    const debuffDef = getDebuffDef(proc.applyDebuff.debuffId);
    // Only continuous-tick snapshot debuffs (e.g., poisoned with dotTickInterval)
    if (!debuffDef?.effect.snapshotPercent || !debuffDef.dotTickInterval) continue;

    const baseTriggerRate = calcTriggerRate(proc.trigger, triggerCtx);
    if (baseTriggerRate <= 0) continue;

    let effectiveRate = baseTriggerRate * proc.chance;
    if (proc.internalCooldown && proc.internalCooldown > 0) {
      effectiveRate = Math.min(effectiveRate, 1 / proc.internalCooldown);
    }

    // Snapshot = expected hit damage (weapon base × incDamage × crit expectation)
    // onHit procs imply the hit already landed, so no hitChance factor on snapshot
    const avgSnapshot = weaponAvgDmg * (1 + baseIncDamage / 100) * critMult;

    // Duration with debuff interaction bonus
    let duration = proc.applyDebuff.duration;
    if (debuffInteraction?.debuffDurationBonus) {
      duration *= (1 + debuffInteraction.debuffDurationBonus / 100);
    }

    // Steady-state active instances = applicationRate × stacksPerProc × duration
    const steadyStateInstances = effectiveRate * (proc.applyDebuff.stacks ?? 1) * duration;

    // Tick DPS per instance = snapshot × snapshotPercent/100 (per second)
    // Scaled by debuff effect bonus and increased DoT damage
    const effectBonus = 1 + (debuffInteraction?.debuffEffectBonus ?? 0) / 100;
    const incDoTMult = 1 + (stats.incDoTDamage ?? 0) / 100;
    const tickDpsPerInstance = avgSnapshot * debuffDef.effect.snapshotPercent / 100
      * effectBonus * incDoTMult;

    debuffTickDps += steadyStateInstances * tickDpsPerInstance;
  }

  // ─── Conditional Mods ───
  let conditionalIncDamage = 0;
  let conditionalIncCastSpeed = 0;

  for (const cm of conditionalMods) {
    const uptime = estimateConditionUptime(cm, critRate, buffUptimes);
    if (uptime <= 0) continue;

    if (cm.modifier.incDamage) conditionalIncDamage += cm.modifier.incDamage * uptime;
    if (cm.modifier.incCastSpeed) conditionalIncCastSpeed += cm.modifier.incCastSpeed * uptime;
  }

  const conditionalSpeedMult = conditionalIncCastSpeed > 0
    ? (1 + conditionalIncCastSpeed / 100) : 1;

  const conditionalDpsMult = (baseIncDamage > 0
    ? (100 + baseIncDamage + conditionalIncDamage) / (100 + baseIncDamage)
    : 1 + conditionalIncDamage / 100) * conditionalSpeedMult;

  // ─── Debuff Interaction ───
  let debuffInteractionMult = 1;
  if (debuffInteraction?.bonusDamageVsDebuffed) {
    const targetDebuffId = debuffInteraction.bonusDamageVsDebuffed.debuffId;
    let debuffUptime = 0.5; // fallback if no matching proc found
    for (const proc of uniqueProcs.values()) {
      if (proc.applyDebuff?.debuffId === targetDebuffId) {
        const rate = calcTriggerRate(proc.trigger, triggerCtx) * proc.chance;
        const icdRate = proc.internalCooldown ? Math.min(rate, 1 / proc.internalCooldown) : rate;
        debuffUptime = Math.min(1.0, icdRate * proc.applyDebuff.duration);
        break;
      }
    }
    debuffInteractionMult = 1 + debuffUptime * debuffInteraction.bonusDamageVsDebuffed.incDamage / 100;
  }

  return { instantDamageDps, debuffTickDps, buffDpsMult, conditionalDpsMult, debuffInteractionMult };
}

// ─── Condition Uptime Heuristics ───

function estimateConditionUptime(
  cm: ConditionalModifier,
  critRate: number,
  buffUptimes: Map<string, number>,
): number {
  switch (cm.condition) {
    case 'whileDebuffActive':
      return 0.80;
    case 'whileBuffActive':
      if (cm.buffId) return buffUptimes.get(cm.buffId) ?? 0;
      return 0;
    case 'whileLowHp':
      return 0.15;
    case 'onHit':
      return 1.0;
    case 'onCrit':
      return critRate;
    case 'afterConsecutiveHits':
      return 0.60;
    case 'onKill':
      return 1.0; // on-kill bonuses assumed active during clearing
    case 'whileFullHp':
      return 0.50;
    default:
      return 0;
  }
}

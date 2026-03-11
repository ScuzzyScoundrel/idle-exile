import { ActiveDebuff, GameState, AbilityEffect, EquippedSkill, SkillProgress, SkillTimerState, PoisonInstance, TempBuff } from '../../types';
import { getDebuffDef } from '../../data/debuffs';
import { FORTIFY_MAX_DR } from '../../data/balance';
import { aggregateSkillBarEffects, aggregateGraphGlobalEffects, mergeEffect } from '../../engine/unifiedSkills';

/**
 * Unified debuff stacking — handles all 3 paths:
 *   1. Instance-based (poison): push N independent instances, each with own snapshot + duration
 *   2. Stackable: increment stacks (up to maxStacks), FIFO snapshot array if snapshot debuff
 *   3. Non-stackable: refresh duration only
 *
 * Mutates `debuffs` array in-place and returns it (for chaining / reassignment).
 * `stacks` = how many stacks to add (1 for single-hit, N for multi-stack procs).
 * `snapshotDamage` = hit damage to record per stack (0 or omit if not a snapshot debuff).
 */
export function applyDebuffToList(
  debuffs: ActiveDebuff[],
  debuffId: string,
  stacks: number,
  duration: number,
  skillId: string,
  snapshotDamage: number = 0,
): ActiveDebuff[] {
  const debuffDef = getDebuffDef(debuffId);
  const existingIdx = debuffs.findIndex(d => d.debuffId === debuffId);
  const isSnapshotDebuff = debuffDef?.dotType === 'snapshot';

  // Path 1: Instance-based (poison) — each stack is an independent instance
  if (debuffDef?.instanceBased) {
    const newInstances: PoisonInstance[] = Array.from({ length: stacks }, () => ({
      snapshot: snapshotDamage,
      remainingDuration: duration,
      appliedBySkillId: skillId,
    }));
    if (existingIdx >= 0) {
      const d = debuffs[existingIdx];
      const instances = [...(d.instances ?? []), ...newInstances];
      debuffs[existingIdx] = {
        ...d,
        instances,
        stacks: instances.length,
        remainingDuration: Math.max(duration, d.remainingDuration),
        appliedBySkillId: skillId,
        stackSnapshots: instances.map(i => i.snapshot),
      };
    } else {
      debuffs.push({
        debuffId, stacks, remainingDuration: duration,
        appliedBySkillId: skillId,
        stackSnapshots: newInstances.map(i => i.snapshot),
        instances: newInstances,
        dotTickAccumulator: 0,
      });
    }
    return debuffs;
  }

  // Path 2: Stackable — increment stacks, FIFO snapshots at maxStacks
  if (existingIdx >= 0 && debuffDef?.stackable) {
    const d = debuffs[existingIdx];
    const newStacks = Math.min(d.stacks + stacks, debuffDef.maxStacks);
    let snapshots = d.stackSnapshots ? [...d.stackSnapshots] : undefined;
    if (isSnapshotDebuff) {
      snapshots = snapshots ?? [];
      for (let i = 0; i < stacks; i++) {
        if (snapshots.length >= debuffDef.maxStacks) snapshots.shift(); // FIFO
        snapshots.push(snapshotDamage);
      }
    }
    debuffs[existingIdx] = {
      ...d,
      stacks: newStacks,
      remainingDuration: duration,
      appliedBySkillId: skillId,
      stackSnapshots: snapshots,
    };
    return debuffs;
  }

  // Path 3: Non-stackable existing — refresh duration
  if (existingIdx >= 0) {
    debuffs[existingIdx] = {
      ...debuffs[existingIdx],
      remainingDuration: duration,
      appliedBySkillId: skillId,
    };
    return debuffs;
  }

  // Path 4: New debuff (first application)
  debuffs.push({
    debuffId, stacks, remainingDuration: duration,
    appliedBySkillId: skillId,
    stackSnapshots: isSnapshotDebuff ? Array(stacks).fill(snapshotDamage) as number[] : undefined,
  });
  return debuffs;
}

/**
 * Merge a proc-generated temp buff into the active buff list.
 * If buff already exists, refresh expiry and increment stacks (up to max).
 * Otherwise, append it. Returns the updated array.
 */
export function mergeProcTempBuff(
  buffs: TempBuff[],
  newBuff: TempBuff,
): TempBuff[] {
  const existingIdx = buffs.findIndex(b => b.id === newBuff.id);
  if (existingIdx >= 0) {
    const existing = buffs[existingIdx];
    return [
      ...buffs.slice(0, existingIdx),
      { ...existing, expiresAt: newBuff.expiresAt, stacks: Math.min(existing.stacks + 1, existing.maxStacks) },
      ...buffs.slice(existingIdx + 1),
    ];
  }
  return [...buffs, newBuff];
}

/** Human-readable labels for proc IDs (used in combat log / floaters). */
export const PROC_LABEL: Record<string, string> = {
  st_venomburst: 'Venom Burst',
  st_counter: 'Counter Stab',
  st_toxic_burst: 'Toxic Burst',
  st_volatile_toxins: 'Toxic Detonate',
  st_precision_killer: 'Precision Kill',
  st_death_mark: 'Death Mark',
  st_counter_stance: 'Counter Stance',
  st_ghost_step_heal: 'Ghost Step',
};

/** Auto-prettify proc IDs: manual overrides first, then strip prefix + title-case. */
export function prettifyProcId(id: string): string {
  if (PROC_LABEL[id]) return PROC_LABEL[id];
  return id.replace(/^[a-z]+_/, '').replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Tick debuff durations and calculate DoT damage (poison/burning/legacy).
 *  Returns updated debuffs (expired removed) and total DoT damage dealt.
 *  Instance-based debuffs (poison) use batched tick intervals and independent instance durations.
 *  Reused by applyZoneDamage, applyBossDamage, and the main skill-cast tick. */
export function tickDebuffDoT(
  debuffs: ActiveDebuff[],
  dtSec: number,
  effectBonus: number,
  incDoTDamage: number,
  enemyMaxHp: number,
): { damage: number; updatedDebuffs: ActiveDebuff[]; poisonInstanceCount?: number } {
  const incDoTMult = 1 + (incDoTDamage ?? 0) / 100;
  let damage = 0;
  let poisonInstanceCount: number | undefined;
  const updated: ActiveDebuff[] = [];

  for (const debuff of debuffs) {
    const debuffDef = getDebuffDef(debuff.debuffId);
    if (!debuffDef) continue;

    // Instance-based path (poison)
    if (debuffDef.instanceBased && debuff.instances) {
      // Decrement each instance's duration independently, filter expired
      const livingInstances = debuff.instances
        .map(inst => ({ ...inst, remainingDuration: inst.remainingDuration - dtSec }))
        .filter(inst => inst.remainingDuration > 0);
      if (livingInstances.length === 0) continue; // all expired, drop debuff

      // Accumulate tick timer
      const tickInterval = debuffDef.dotTickInterval ?? 0.5;
      let accumulator = (debuff.dotTickAccumulator ?? 0) + dtSec;

      // When accumulator >= tickInterval, emit batched damage
      if (accumulator >= tickInterval) {
        const snapSum = livingInstances.reduce((a, inst) => a + inst.snapshot, 0);
        damage += snapSum * (debuffDef.effect.snapshotPercent ?? 0) / 100 * effectBonus * incDoTMult * accumulator;
        poisonInstanceCount = livingInstances.length;
        accumulator -= tickInterval;
        // Prevent drift: if still over interval, clamp to remainder
        if (accumulator >= tickInterval) accumulator = accumulator % tickInterval;
      }

      // Sync legacy fields so talent threshold logic works unchanged
      updated.push({
        ...debuff,
        instances: livingInstances,
        stacks: livingInstances.length,
        remainingDuration: Math.max(...livingInstances.map(i => i.remainingDuration)),
        stackSnapshots: livingInstances.map(i => i.snapshot),
        dotTickAccumulator: accumulator,
      });
      continue;
    }

    // Legacy path (bleed/burning/flat) — unchanged
    const d = { ...debuff, remainingDuration: debuff.remainingDuration - dtSec };
    if (d.remainingDuration <= 0) continue;

    if (debuffDef.dotType === 'snapshot' && debuff.debuffId !== 'bleeding') {
      // Legacy snapshot (shouldn't hit for poison anymore, but kept for safety)
      const snapSum = d.stackSnapshots?.reduce((a, b) => a + b, 0) ?? 0;
      damage += snapSum * (debuffDef.effect.snapshotPercent ?? 0) / 100 * effectBonus * incDoTMult * dtSec;
    } else if (debuffDef.dotType === 'percentMaxHp') {
      damage += enemyMaxHp * (debuffDef.effect.percentMaxHp ?? 0) / 100 * effectBonus * incDoTMult * dtSec;
    } else if (debuffDef.effect.dotDps) {
      damage += debuffDef.effect.dotDps * d.stacks * effectBonus * incDoTMult * dtSec;
    }
    updated.push(d);
  }

  return { damage, updatedDebuffs: updated, poisonInstanceCount };
}

/** Compute enemy debuff modifiers from active debuffs (Weakened/Blinded/Slowed). */
export function calcEnemyDebuffMods(activeDebuffs: ActiveDebuff[]): {
  damageMult: number;       // multiply incoming enemy damage (< 1 = less damage)
  missChance: number;       // 0-100, roll before attack
  atkSpeedSlowMult: number; // multiply attack interval (> 1 = slower attacks)
} {
  let damageMult = 1;
  let missChance = 0;
  let atkSpeedSlowMult = 1;
  for (const debuff of activeDebuffs) {
    const def = getDebuffDef(debuff.debuffId);
    if (!def) continue;
    if (def.effect.reducedDamageDealt) {
      damageMult -= (def.effect.reducedDamageDealt * debuff.stacks) / 100;
    }
    if (def.effect.missChance) {
      missChance += def.effect.missChance * debuff.stacks;
    }
    if (def.effect.reducedAttackSpeed) {
      atkSpeedSlowMult += (def.effect.reducedAttackSpeed * debuff.stacks) / 100;
    }
  }
  return { damageMult: Math.max(0.1, damageMult), missChance: Math.min(missChance, 75), atkSpeedSlowMult };
}

/** Compute bleed trigger damage from active bleed debuff (triggers on enemy attack). */
export function calcBleedTriggerDamage(activeDebuffs: ActiveDebuff[], debuffEffectBonus: number, incDoTDamage: number): number {
  const bleed = activeDebuffs.find(d => d.debuffId === 'bleeding');
  if (!bleed?.stackSnapshots?.length) return 0;
  const def = getDebuffDef('bleeding');
  if (!def?.effect.snapshotPercent) return 0;
  const snapSum = bleed.stackSnapshots.reduce((a, b) => a + b, 0);
  const incDoTMult = 1 + (incDoTDamage ?? 0) / 100;
  return snapSum * (def.effect.snapshotPercent / 100) * debuffEffectBonus * incDoTMult;
}

/** Compute fortify damage reduction from stacks. Returns 0 if expired or no stacks.
 *  fortifyEffectBonus: gear stat that increases fortify DR per stack (default 0). */
export function calcFortifyDR(fortifyStacks: number, fortifyExpiresAt: number, fortifyDRPerStack: number, now: number, fortifyEffectBonus: number = 0): number {
  if (fortifyStacks <= 0 || now > fortifyExpiresAt) return 0;
  const effectiveDRPerStack = fortifyDRPerStack * (1 + fortifyEffectBonus / 100);
  return Math.min(fortifyStacks * effectiveDRPerStack / 100, FORTIFY_MAX_DR);
}

/**
 * Aggregate skill bar effects + class talent effects into one AbilityEffect.
 * When no talents are allocated, talent effect is {} (identity under mergeEffect).
 */
export function getFullEffect(
  state: GameState,
  now: number,
  offlineMode: boolean,
  overrides?: {
    skillBar?: (EquippedSkill | null)[];
    skillProgress?: Record<string, SkillProgress>;
    skillTimers?: SkillTimerState[];
  },
): AbilityEffect {
  const skillEffect = aggregateSkillBarEffects(
    overrides?.skillBar ?? state.skillBar,
    overrides?.skillProgress ?? state.skillProgress,
    overrides?.skillTimers ?? state.skillTimers,
    now,
    offlineMode,
  );
  const talentEffect: AbilityEffect = {};
  const graphGlobalEffect = aggregateGraphGlobalEffects(
    overrides?.skillBar ?? state.skillBar,
    overrides?.skillProgress ?? state.skillProgress,
  );
  return mergeEffect(mergeEffect(skillEffect, talentEffect), graphGlobalEffect);
}

export interface SpreadResult {
  debuffId: string;
  stacks: number;
}

/**
 * Spread matching debuffs from a dead mob to a target mob's debuff list.
 * Instance-based debuffs copy instances with refreshed durations; others just copy.
 * Returns array of spread details (empty if nothing spread).
 */
export function spreadDebuffsToTarget(
  targetDebuffs: ActiveDebuff[],
  sourceDebuffs: ActiveDebuff[],
  config: { debuffIds: string[]; refreshDuration: number },
): SpreadResult[] {
  const matching = config.debuffIds.includes('all')
    ? sourceDebuffs
    : sourceDebuffs.filter(d => config.debuffIds.includes(d.debuffId));
  if (matching.length === 0) return [];

  const results: SpreadResult[] = [];
  for (const srcDebuff of matching) {
    const spreadDef = getDebuffDef(srcDebuff.debuffId);
    if (spreadDef?.instanceBased && srcDebuff.instances) {
      const spreadInstances = srcDebuff.instances.map(inst => ({
        ...inst,
        remainingDuration: config.refreshDuration > 0 ? config.refreshDuration : inst.remainingDuration,
      }));
      targetDebuffs.push({
        ...srcDebuff,
        instances: spreadInstances,
        stacks: spreadInstances.length,
        remainingDuration: Math.max(...spreadInstances.map(i => i.remainingDuration)),
        stackSnapshots: spreadInstances.map(i => i.snapshot),
        dotTickAccumulator: 0,
      });
      results.push({ debuffId: srcDebuff.debuffId, stacks: spreadInstances.length });
    } else {
      targetDebuffs.push({
        ...srcDebuff,
        remainingDuration: config.refreshDuration > 0 ? config.refreshDuration : srcDebuff.remainingDuration,
      });
      results.push({ debuffId: srcDebuff.debuffId, stacks: srcDebuff.stacks });
    }
  }
  return results;
}

// ============================================================
// Class Talent Dispatcher (Phase 4 sub-phase 5)
// ============================================================
//
// Processes TalentEffect[] from allocated class talent nodes. Plugs
// into existing combat event surfaces in engine/combat/tick.ts:
//   • pre-roll    → fold whileTag + perStack into effectiveStats
//   • post-hit    → procOnHit triggers
//   • post-crit   → procOnCrit triggers
//   • on-kill     → procOnKill triggers
//   • on-applyTag → procOnTag triggers (hooked via applyDebuffToList)
//
// Action handlers:
//   • applyTag   → maps TalentTag → debuff id, adds stacks to target
//   • healSelf   → increments state.life (clamped to maxLife)
//   • summon     → STUB (Phase 4.1 — needs minion slot)
//   • triggerSkill → STUB (Phase 4.1 — needs free-cast path)
//   • grantBuff  → STUB

import type {
  CharacterClass, TalentEffect, TalentAction, TalentTag, DamageTag,
  ActiveDebuff, ResolvedStats,
} from '../types';
import { CLASS_TALENT_TREES } from '../data/classTalents';
import { applyDebuffToList } from './combat/helpers';

/** Map TalentTag → debuff id registered in data/debuffs.ts. */
const TALENT_TAG_TO_DEBUFF: Record<TalentTag, string> = {
  hex: 'hexed',
  curse: 'cursed',
  mark: 'marked',       // Registered below as a lightweight debuff.
  poison: 'poisoned',
  bleed: 'bleeding',
  ignite: 'burning',
  chill: 'chilled',
  shock: 'shocked',
  frozen: 'frostbite',
  stun: 'stunned',      // Placeholder — no matching debuff yet.
  taunt: 'taunted',     // Placeholder — no matching debuff yet.
};

/** Extract all talent effects from allocated nodes for a class. */
export function collectTalentEffects(
  charClass: CharacterClass,
  allocatedNodeIds: string[],
): TalentEffect[] {
  if (allocatedNodeIds.length === 0) return [];
  const tree = CLASS_TALENT_TREES[charClass];
  if (!tree) return [];
  const result: TalentEffect[] = [];
  for (const path of tree.paths) {
    for (const node of path.nodes) {
      if (!allocatedNodeIds.includes(node.id)) continue;
      if (node.effects && node.effects.length > 0) result.push(...node.effects);
    }
  }
  return result;
}

/** Count stacks of a debuff (by id) on a target. */
function countStacksById(debuffs: ActiveDebuff[], debuffId: string): number {
  let total = 0;
  for (const d of debuffs) if (d.debuffId === debuffId) total += d.stacks;
  return total;
}

function targetHasTag(debuffs: ActiveDebuff[], tag: TalentTag): boolean {
  const did = TALENT_TAG_TO_DEBUFF[tag];
  if (!did) return false;
  return debuffs.some(d => d.debuffId === did);
}

/** Folds whileTag + perStack modifiers into effectiveStats
 *  based on current target-debuff state. Legacy `stat` / `statMult` also
 *  handled so authors can use either effect shape. */
export function applyConditionalTalentEffects(
  effects: TalentEffect[],
  stats: ResolvedStats,
  targetDebuffs: ActiveDebuff[],
): { damageMult: number } {
  let damageMult = 1;
  for (const eff of effects) {
    switch (eff.kind) {
      case 'stat':
        // Folded into stats in-place. Unknown stats silently ignored.
        if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] += eff.delta;
        }
        break;
      case 'statMult':
        if (eff.stat === 'damageMult') damageMult *= eff.mult;
        else if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] *= eff.mult;
        }
        break;
      case 'whileTag':
        if (targetHasTag(targetDebuffs, eff.tag)) {
          if (eff.stat === 'damageMult') damageMult *= eff.mult;
          else if (typeof (stats as any)[eff.stat] === 'number') {
            (stats as any)[eff.stat] *= eff.mult;
          }
        }
        break;
      case 'perStack': {
        const did = TALENT_TAG_TO_DEBUFF[eff.stack as TalentTag];
        if (!did) break;
        const stacks = countStacksById(targetDebuffs, did);
        if (stacks <= 0) break;
        const raw = stacks * eff.perStackDelta;
        const bonus = eff.cap ? Math.min(raw, eff.cap) : raw;
        if (eff.stat === 'damageMult') damageMult *= (1 + bonus);
        else if (typeof (stats as any)[eff.stat] === 'number') {
          (stats as any)[eff.stat] += bonus;
        }
        break;
      }
      // Event-driven triggers handled by dispatchProc* below.
      case 'procOnHit':
      case 'procOnKill':
      case 'procOnCrit':
      case 'procOnTag':
      case 'grantTagOnSkill':
        break;
    }
  }
  return { damageMult };
}

export interface TalentProcContext {
  /** Target debuffs at proc time. New debuffs from this proc append here. */
  targetDebuffs: ActiveDebuff[];
  /** Current player life — handlers may mutate to apply heals. */
  life: { value: number; max: number };
  /** Source skill id for applyDebuffToList attribution. */
  sourceSkillId: string;
  /** Skill tag (from the hit that triggered) for procOnHit/Kill filters. */
  hitDamageTag?: DamageTag;
}

/** Roll chance and dispatch action. chance is 0-100 (not 0-1). */
function rollAndFire(action: TalentAction, chance: number, ctx: TalentProcContext): void {
  if (Math.random() * 100 >= chance) return;
  executeAction(action, ctx);
}

function executeAction(action: TalentAction, ctx: TalentProcContext): void {
  switch (action.kind) {
    case 'applyTag': {
      const did = TALENT_TAG_TO_DEBUFF[action.tag];
      if (!did) return;
      applyDebuffToList(ctx.targetDebuffs, did, action.stacks ?? 1, action.duration ?? 4, ctx.sourceSkillId);
      break;
    }
    case 'healSelf':
      ctx.life.value = Math.min(ctx.life.max, ctx.life.value + action.amount);
      break;
    // Deferred (Phase 4.1):
    case 'summon':
    case 'triggerSkill':
    case 'grantBuff':
      break;
  }
}

export function dispatchProcOnHit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnHit') continue;
    if (eff.tag && eff.tag !== ctx.hitDamageTag) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnCrit(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnCrit') continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnKill(effects: TalentEffect[], ctx: TalentProcContext): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnKill') continue;
    if (eff.tag && eff.tag !== ctx.hitDamageTag) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

export function dispatchProcOnTag(
  effects: TalentEffect[],
  appliedTag: TalentTag,
  ctx: TalentProcContext,
): void {
  for (const eff of effects) {
    if (eff.kind !== 'procOnTag') continue;
    if (eff.tag !== appliedTag) continue;
    rollAndFire(eff.action, eff.chance, ctx);
  }
}

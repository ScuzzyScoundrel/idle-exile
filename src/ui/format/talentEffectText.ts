// Phase F (2026-05-07): talent-effect formatter for the UI talent
// picker. Reads NODE_EFFECTS, scales each effect by current rank via
// scaleTalentEffectByRank, returns short human-readable strings.
// Engine-spec drift is acceptable here — this is a hover/inline
// summary, not a precise tooltip.

import { NODE_EFFECTS } from '../../data/classTrees/effects';
import { scaleTalentEffectByRank } from '../../engine/classTalentDispatcher';
import type { TalentEffect, TalentAction } from '../../types';

const STAT_LABEL: Record<string, string> = {
  damageMult: 'damage',
  damageTakenReduction: 'damage reduction',
  attackSpeed: 'attack speed',
  cooldownRecovery: 'cooldown recovery',
  critChance: 'crit chance',
  critMultiplier: 'crit damage',
  maxLife: 'max life',
  lifeLeechPercent: 'lifesteal',
  ailmentDuration: 'ailment duration',
  aoeRadius: 'AoE radius',
  aoeTargetCount: 'AoE bonus targets',
  companionDamage: 'companion damage',
  companionHp: 'companion HP',
  companionAttackSpeed: 'companion attack speed',
};

function statText(stat: string): string {
  return STAT_LABEL[stat] ?? stat;
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(0)}%`;
}

function actionText(action: TalentAction): string {
  switch (action.kind) {
    case 'applyTag':    return `apply ${action.tag}${action.stacks ? ` (${action.stacks} stacks)` : ''}`;
    case 'applyTagAll': return `apply ${action.tag} to all enemies`;
    case 'healSelf':    return `heal ${action.amount}`;
    case 'refundCooldown': return `refund cooldown${action.percent ? ` ${action.percent}%` : ''}`;
    case 'refundMana':  return `+${action.amount} mana`;
    case 'addCritStack': return `+1 Crit Cascade stack`;
    case 'addResonanceCharge': return `+${action.amount ?? 1} Resonance${action.element ? ` (${action.element})` : ''}`;
    case 'grantBuff':   return `gain ${action.buffId} for ${action.duration}s`;
    case 'summon':      return `summon ${action.minionType}`;
    case 'triggerSkill': return `trigger ${action.skillId}`;
    case 'bonusDamage': return `${pct(action.percent)} bonus damage`;
  }
}

function effectText(eff: TalentEffect): string {
  switch (eff.kind) {
    case 'stat':
      return `${pct(eff.delta)} ${statText(eff.stat)}`;
    case 'statMult':
      return `${statText(eff.stat)} ×${eff.mult.toFixed(2)}`;
    case 'whileTag':
      return `vs ${eff.tag}: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileSelfHpBelow':
      return `<${(eff.threshold * 100).toFixed(0)}% HP: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileSelfHpAbove':
      return `≥${(eff.threshold * 100).toFixed(0)}% HP: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileTargetHpBelow':
      return `vs <${(eff.threshold * 100).toFixed(0)}% HP enemy: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileCompanionAlive':
      return `companion alive: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileFrenzied':
      return `Frenzied: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileOffhandAbsent':
      return `no offhand: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileCritStacksAtLeast':
      return `≥${eff.threshold} Crit stacks: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileResonanceChargesAtLeast':
      return `≥${eff.threshold} Resonance: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whileMinionCountAtLeast':
      return `≥${eff.threshold} minions: ${eff.delta !== undefined ? pct(eff.delta) : `×${eff.mult.toFixed(2)}`} ${statText(eff.stat)}`;
    case 'whilePauseDebuffDecay':
      return `pause ${eff.debuffId} decay while target ${eff.tag}`;
    case 'perCritStack':
      return `+${eff.perStackDelta.toFixed(1)} ${statText(eff.stat)} per Crit stack${eff.cap ? ` (cap ${eff.cap})` : ''}`;
    case 'perResonanceCharge':
      return `+${eff.perStackDelta.toFixed(1)} ${statText(eff.stat)} per Resonance charge${eff.cap ? ` (cap ${eff.cap})` : ''}`;
    case 'perEnemyCount':
      return `+${(eff.perEnemyDelta * 100).toFixed(1)}% ${statText(eff.stat)} per enemy${eff.cap ? ` (cap ${(eff.cap * 100).toFixed(0)}%)` : ''}`;
    case 'perStack':
      return `+${(eff.perStackDelta).toFixed(1)} ${statText(eff.stat)} per ${eff.stack} stack${eff.cap ? ` (cap ${eff.cap})` : ''}`;
    case 'procOnHit':
      return `${eff.chance.toFixed(0)}% on hit${eff.tag ? ` (${eff.tag})` : ''}${eff.targetTag ? ` to ${eff.targetTag}` : ''}: ${actionText(eff.action)}`;
    case 'procOnCrit':
      return `${eff.chance.toFixed(0)}% on crit${eff.tag ? ` (${eff.tag})` : ''}${eff.targetTag ? ` to ${eff.targetTag}` : ''}: ${actionText(eff.action)}`;
    case 'procOnKill':
      return `${eff.chance.toFixed(0)}% on kill${eff.tag ? ` (${eff.tag})` : ''}${eff.targetTag ? ` of ${eff.targetTag}` : ''}: ${actionText(eff.action)}`;
    case 'procOnTag':
      return `${eff.chance.toFixed(0)}% on ${eff.tag} apply: ${actionText(eff.action)}`;
    case 'procOnHitTaken':
      return `${eff.chance.toFixed(0)}% on hit taken${eff.critTaken === true ? ' (crit)' : eff.critTaken === false ? ' (non-crit)' : ''}: ${actionText(eff.action)}`;
    case 'procOnMinionHit':
      return `${eff.chance.toFixed(0)}% on${eff.minionType ? ` ${eff.minionType}` : ' minion'} hit: ${actionText(eff.action)}`;
    case 'procOnMinionCrit':
      return `${eff.chance.toFixed(0)}% on${eff.minionType ? ` ${eff.minionType}` : ' minion'} crit: ${actionText(eff.action)}`;
    case 'procOnMinionDeath':
      return `${eff.chance.toFixed(0)}% on${eff.minionType ? ` ${eff.minionType}` : ' minion'} death: ${actionText(eff.action)}`;
    case 'procOnCompanionHit':
      return `${eff.chance.toFixed(0)}% on companion hit: ${actionText(eff.action)}`;
    case 'procOnCompanionCrit':
      return `${eff.chance.toFixed(0)}% on companion crit: ${actionText(eff.action)}`;
    case 'procOnCompanionDeath':
      return `${eff.chance.toFixed(0)}% on companion death: ${actionText(eff.action)}`;
    case 'procOnTrapDetonate':
      return `${eff.chance.toFixed(0)}% on trap detonation: ${actionText(eff.action)}`;
    case 'procOnTrapChain':
      return `${eff.chance.toFixed(0)}% on trap chain: ${actionText(eff.action)}`;
    case 'procOnMultiKillChain':
      return `${eff.chance.toFixed(0)}% per chained kill: ${actionText(eff.action)}`;
    case 'procOnResonanceChargeGain':
      return `${eff.chance.toFixed(0)}% on Resonance gain${eff.element ? ` (${eff.element})` : ''}: ${actionText(eff.action)}`;
    case 'procOnConvergenceCast':
      return `${eff.chance.toFixed(0)}% on Convergence cast: ${actionText(eff.action)}`;
    case 'procOnBulwarkConsume':
      return `${eff.chance.toFixed(0)}% on Bulwark consume: ${actionText(eff.action)}`;
    case 'grantPandemic':
      return `Pandemic — DoTs spread on enemy death`;
    case 'grantDotCrit':
      return `${eff.debuffId ?? 'all DoTs'} can crit (+${eff.chanceBonus.toFixed(0)}% chance)`;
    case 'grantCompanion':
      return `summons a permanent companion${eff.minionType ? ` (${eff.minionType})` : ''}`;
    case 'grantTagOnSkill':
      return `${eff.skillTag} skills also gain ${eff.addTag} tag`;
    case 'companionProcInheritance':
      return `${eff.percent.toFixed(0)}% of player procs inherit to companion attacks`;
    case 'precisionPayoff':
      return `+${eff.bonusPercent.toFixed(0)}% damage on Mark consumed by different skill`;
  }
}

/** Format the effects of a talent node at a given rank. Returns one
 *  string per TalentEffect — empty array if no effects registered (a
 *  forward-compat seed). */
export function formatTalentEffects(nodeId: string, rank: number): string[] {
  const effects = NODE_EFFECTS[nodeId];
  if (!effects || effects.length === 0) return [];
  const r = Math.max(1, rank);
  return effects.map(e => effectText(scaleTalentEffectByRank(e, r)));
}

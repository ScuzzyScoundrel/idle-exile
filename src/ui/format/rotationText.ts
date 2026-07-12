// ============================================================
// Human-readable text for gambit rotation rules (RotationPanel v1).
// Covers the full Condition union (types/conditions.ts) so any
// authored policy renders, though shipped presets only use the E13
// live-leaf set (stateCountAtLeast/Below, skillReady, targetHpBelow,
// enemyCountAtLeast, targetLacksTag, inBossFight, minMana).
// ============================================================

import type { Condition } from '../../types/conditions';
import type { RotationRule } from '../../types/rotation';
import { getUnifiedSkillDef } from '../../data/skills';

function skillName(skillId: string): string {
  return getUnifiedSkillDef(skillId)?.name ?? skillId;
}

/** 'shadow_mark' → 'Shadow Mark' */
function stateLabel(id: string): string {
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

export function formatCondition(c: Condition): string {
  if ('all' in c) return c.all.map(formatCondition).join(' AND ');
  if ('any' in c) return c.any.map(formatCondition).join(' OR ');
  if ('not' in c) return `NOT (${formatCondition(c.not)})`;
  if ('targetHasTag' in c) return `Target has ${stateLabel(c.targetHasTag)}`;
  if ('targetLacksTag' in c) return `Target lacks ${stateLabel(c.targetLacksTag)}`;
  if ('targetHasState' in c) {
    const { stateId, minStacks } = c.targetHasState;
    return minStacks && minStacks > 1
      ? `Target ${stateLabel(stateId)} ≥ ${minStacks}`
      : `Target has ${stateLabel(stateId)}`;
  }
  if ('stateActive' in c) return `${stateLabel(c.stateActive)} active`;
  if ('stateMissing' in c) return `${stateLabel(c.stateMissing)} missing`;
  if ('stateCountAtLeast' in c) {
    const { stateId, count } = c.stateCountAtLeast;
    return count <= 1 ? `${stateLabel(stateId)} active` : `${stateLabel(stateId)} ≥ ${count}`;
  }
  if ('stateCountBelow' in c) {
    const { stateId, count } = c.stateCountBelow;
    return `${stateLabel(stateId)} < ${count}`;
  }
  if ('selfHpBelow' in c) return `Your HP < ${pct(c.selfHpBelow)}`;
  if ('selfHpAbove' in c) return `Your HP ≥ ${pct(c.selfHpAbove)}`;
  if ('targetHpBelow' in c) return `Target HP < ${pct(c.targetHpBelow)}`;
  if ('targetHpAbove' in c) return `Target HP ≥ ${pct(c.targetHpAbove)}`;
  if ('manaPctAtLeast' in c) return `Mana ≥ ${c.manaPctAtLeast}%`;
  if ('manaPctBelow' in c) return `Mana < ${c.manaPctBelow}%`;
  if ('enemyCountAtLeast' in c) return `${c.enemyCountAtLeast}+ enemies`;
  if ('minionCountAtLeast' in c) {
    const { count, minionType } = c.minionCountAtLeast;
    return `${count}+ ${minionType ? stateLabel(minionType) : 'minion'}${count === 1 ? '' : 's'}`;
  }
  if ('companionAlive' in c) return 'Companion alive';
  if ('inBossFight' in c) return 'In boss fight';
  if ('offhandAbsent' in c) return 'No offhand equipped';
  if ('weaponType' in c) return `Wielding ${stateLabel(c.weaponType)}`;
  if ('skillHasTag' in c) return `Skill has ${c.skillHasTag}`;
  if ('hitDamageTag' in c) return `Hit deals ${c.hitDamageTag}`;
  if ('skillIdIs' in c) return `Skill is ${skillName(c.skillIdIs)}`;
  if ('skillReady' in c) return `${skillName(c.skillReady)} ready`;
  if ('buffActive' in c) return `${stateLabel(c.buffActive)} buff active`;
  if ('buffMissing' in c) return `${stateLabel(c.buffMissing)} buff missing`;
  if ('appliedByDifferentSkill' in c) {
    return `${stateLabel(c.appliedByDifferentSkill.stateId)} applied by another skill`;
  }
  return 'Unknown condition';
}

/** e.g. "While Opening active AND Momentum ≥ 3 AND Assassinate ready → cast Assassinate" */
export function formatRotationRule(r: RotationRule): string {
  const cond = r.when ? `While ${formatCondition(r.when)}` : 'Always';
  let act: string;
  switch (r.action.kind) {
    case 'castSkill':
      act = `cast ${skillName(r.action.skillId)}`;
      if (r.action.minMana !== undefined) act += ` (needs ≥ ${r.action.minMana} mana)`;
      break;
    case 'autoAttackOnly':
      act = 'auto-attack only';
      break;
    case 'idle':
      act = 'do nothing';
      break;
  }
  return `${cond} → ${act}`;
}

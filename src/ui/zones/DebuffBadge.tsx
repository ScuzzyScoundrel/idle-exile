import type { ActiveDebuff } from '../../types';
import { DEBUFF_META } from './zoneConstants';
import { getDebuffDef } from '../../data/debuffs';
import { getUnifiedSkillDef } from '../../data/skills';
import Tooltip from '../components/Tooltip';

/** Compute inline DPS/damage text for DoT debuffs */
function dotInlineText(debuff: ActiveDebuff): string | null {
  const def = getDebuffDef(debuff.debuffId);
  if (!def) return null;

  // Poison: instance-based snapshot DoT → sum(snapshots) * snapshotPercent / 100
  if (debuff.debuffId === 'poisoned' && def.effect.snapshotPercent && debuff.instances) {
    const total = debuff.instances.reduce((sum, inst) => sum + inst.snapshot, 0);
    const dps = Math.round(total * def.effect.snapshotPercent / 100);
    return `${dps}/s`;
  }

  // Bleed: stack-based snapshot → sum(stackSnapshots) * snapshotPercent / 100
  if (debuff.debuffId === 'bleeding' && def.effect.snapshotPercent && debuff.stackSnapshots?.length) {
    const total = debuff.stackSnapshots.reduce((a, b) => a + b, 0);
    const dmg = Math.round(total * def.effect.snapshotPercent / 100);
    return `${dmg}/trg`;
  }

  // Frostbite: stack-based snapshot DoT (cold) → tick damage per second
  if (debuff.debuffId === 'frostbite' && def.effect.snapshotPercent && debuff.stackSnapshots?.length) {
    const total = debuff.stackSnapshots.reduce((a, b) => a + b, 0);
    const dps = Math.round(total * def.effect.snapshotPercent / 100);
    return `${dps}/s`;
  }

  // Staff v2 skill-native DoTs: stack-based snapshot, single-stack refresh
  if (SKILL_NATIVE_DOTS.has(debuff.debuffId) && def.effect.snapshotPercent && debuff.stackSnapshots?.length) {
    const total = debuff.stackSnapshots.reduce((a, b) => a + b, 0);
    const dps = Math.round(total * def.effect.snapshotPercent / 100);
    return `${dps}/s`;
  }

  // Burning: percentMaxHp
  if (debuff.debuffId === 'burning' && def.effect.percentMaxHp) {
    return `${def.effect.percentMaxHp}%/s`;
  }

  return null;
}

const SKILL_NATIVE_DOTS = new Set(['locust_swarm_dot', 'haunt_dot', 'toads_dot']);

// Element-themed color overrides for skill-native DoTs (depends on debuff.damageElement)
function skillNativeColor(element: string | undefined): { text: string; bg: string } | null {
  switch (element) {
    case 'fire':      return { text: 'text-orange-300', bg: 'bg-orange-900/50' };
    case 'cold':      return { text: 'text-sky-300',    bg: 'bg-sky-900/50' };
    case 'lightning': return { text: 'text-yellow-300', bg: 'bg-yellow-900/50' };
    case 'chaos':     return { text: 'text-purple-300', bg: 'bg-purple-900/50' };
    case 'physical':  return { text: 'text-red-300',    bg: 'bg-red-900/50' };
    default: return null;
  }
}

/** Is this a DoT debuff that should pulse? */
function isDot(debuffId: string): boolean {
  return debuffId === 'poisoned' || debuffId === 'bleeding' || debuffId === 'burning'
    || debuffId === 'frostbite' || SKILL_NATIVE_DOTS.has(debuffId);
}

export default function DebuffBadge({ debuff }: { debuff: ActiveDebuff }) {
  const meta = DEBUFF_META[debuff.debuffId];
  const def = getDebuffDef(debuff.debuffId);
  const isSkillNative = SKILL_NATIVE_DOTS.has(debuff.debuffId);

  // Source skill: surface which skill applied this debuff (so staff DoTs feel skill-specific)
  const sourceSkill = debuff.appliedBySkillId ? getUnifiedSkillDef(debuff.appliedBySkillId) : null;

  // Skill-native DoTs show skill icon only on the badge — element via tint color,
  // full name + element in the tooltip (keeps row tight in busy fights).
  const elementTint = isSkillNative ? skillNativeColor(debuff.damageElement as string | undefined) : null;
  const label = isSkillNative && sourceSkill
    ? sourceSkill.icon
    : (meta?.label ?? debuff.debuffId.slice(0, 3).toUpperCase());
  const text = elementTint?.text ?? meta?.text ?? 'text-gray-300';
  const bg = elementTint?.bg ?? meta?.bg ?? 'bg-gray-700/60';

  const isInstanceBased = def?.instanceBased && debuff.instances;
  const inline = dotInlineText(debuff);
  const hasPulse = isDot(debuff.debuffId);

  const tooltipContent = (
    <div className="space-y-0.5">
      <div className="font-bold">{meta?.fullName ?? def?.name ?? debuff.debuffId}</div>
      {sourceSkill && (
        <div className="text-cyan-300 text-[11px]">from {sourceSkill.icon} {sourceSkill.name}</div>
      )}
      <div className="text-gray-400">{meta?.description ?? def?.description ?? ''}</div>
      {isInstanceBased ? (
        <>
          <div>Instances: {debuff.instances!.length}</div>
          <div>Duration: {Math.min(...debuff.instances!.map(i => i.remainingDuration)).toFixed(1)}s – {Math.max(...debuff.instances!.map(i => i.remainingDuration)).toFixed(1)}s</div>
        </>
      ) : (
        <>
          {def?.stackable && <div>Stacks: {debuff.stacks}/{def.maxStacks}</div>}
          <div>Duration: {debuff.remainingDuration.toFixed(1)}s</div>
        </>
      )}
      {debuff.stackSnapshots?.length && def?.effect.snapshotPercent ? (
        <div className="text-yellow-300">
          ~{Math.round(debuff.stackSnapshots.reduce((a, b) => a + b, 0) * def.effect.snapshotPercent / 100)}
          {debuff.debuffId === 'bleeding' ? '/trigger' : '/s'}
        </div>
      ) : null}
      {def?.dotType === 'percentMaxHp' && def.effect.percentMaxHp ? (
        <div className="text-yellow-300">
          {def.effect.percentMaxHp}% max HP/s
        </div>
      ) : null}
    </div>
  );

  // Build display: LABEL x{count} {dps}
  const countText = debuff.stacks > 1 ? ` x${debuff.stacks}` : '';
  const inlineText = inline ? ` ${inline}` : '';

  return (
    <Tooltip content={tooltipContent}>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold ${bg} ${text}`}
        style={hasPulse ? { animation: 'dot-pulse 2s ease-in-out infinite' } : undefined}
      >
        {label}{countText}{inlineText}
      </span>
    </Tooltip>
  );
}

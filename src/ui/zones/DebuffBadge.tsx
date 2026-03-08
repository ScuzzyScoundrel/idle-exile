import type { ActiveDebuff } from '../../types';
import { DEBUFF_META } from './zoneConstants';
import { getDebuffDef } from '../../data/debuffs';
import Tooltip from '../components/Tooltip';

export default function DebuffBadge({ debuff }: { debuff: ActiveDebuff }) {
  const meta = DEBUFF_META[debuff.debuffId];
  const def = getDebuffDef(debuff.debuffId);
  const label = meta?.label ?? debuff.debuffId.slice(0, 3).toUpperCase();
  const text = meta?.text ?? 'text-gray-300';
  const bg = meta?.bg ?? 'bg-gray-700/60';

  const isInstanceBased = def?.instanceBased && debuff.instances;
  const tooltipContent = (
    <div className="space-y-0.5">
      <div className="font-bold">{def?.name ?? debuff.debuffId}</div>
      {def?.description && <div className="text-gray-400">{def.description}</div>}
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

  return (
    <Tooltip content={tooltipContent}>
      <span className={`rounded-full px-1.5 text-[10px] font-mono font-semibold ${bg} ${text}`}>
        {label}{debuff.stacks > 1 ? ` x${debuff.stacks}` : ''}
      </span>
    </Tooltip>
  );
}

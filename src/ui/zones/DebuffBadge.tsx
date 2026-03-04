import type { ActiveDebuff } from '../../types';
import { DEBUFF_META } from './zoneConstants';

export default function DebuffBadge({ debuff }: { debuff: ActiveDebuff }) {
  const meta = DEBUFF_META[debuff.debuffId];
  const label = meta?.label ?? debuff.debuffId.slice(0, 3).toUpperCase();
  const text = meta?.text ?? 'text-gray-300';
  const bg = meta?.bg ?? 'bg-gray-700/60';
  return (
    <span className={`rounded-full px-1.5 text-[10px] font-mono font-semibold ${bg} ${text}`}>
      {label}{debuff.stacks > 1 ? ` x${debuff.stacks}` : ''}
    </span>
  );
}

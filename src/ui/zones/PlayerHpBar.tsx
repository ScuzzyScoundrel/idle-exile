import type { ClassResourceState, TempBuff } from '../../types';
import { getClassDef } from '../../data/classes';
import Tooltip from '../components/Tooltip';

interface BuffMeta { label: string; color: string; description: string }

export default function PlayerHpBar({ currentHp, maxHp, trailHp, fortifyStacks, fortifyDR, currentEs, maxEs, classResource, charClass, buffs, buffDisplay, rampingStacks }: {
  currentHp: number; maxHp: number; trailHp?: number;
  fortifyStacks?: number; fortifyDR?: number;
  currentEs?: number; maxEs?: number;
  classResource?: ClassResourceState; charClass?: string;
  buffs?: TempBuff[]; buffDisplay?: Record<string, BuffMeta>;
  rampingStacks?: number;
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const trailPct = trailHp != null && maxHp > 0
    ? Math.max(0, Math.min(100, (trailHp / maxHp) * 100))
    : pct;
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const hasFortify = (fortifyDR ?? 0) > 0;
  const hasEs = (maxEs ?? 0) > 0;
  const esPct = hasEs ? Math.max(0, Math.min(100, ((currentEs ?? 0) / maxEs!) * 100)) : 0;

  // Active buffs
  const activeBuffs = (buffs ?? []).filter(b => b.expiresAt > Date.now());

  // Class resource
  const classDef = charClass ? getClassDef(charClass as 'warrior' | 'mage' | 'ranger' | 'rogue') : null;
  const resourceStacks = classResource ? Math.floor(classResource.stacks) : 0;
  const resourceMax = classDef?.resourceMax ?? 0;

  return (
    <div
      className={`bg-gray-800/50 rounded-lg border p-2 space-y-1 ${hasFortify ? 'border-amber-500/40' : 'border-gray-700'}`}
      style={hasFortify ? { animation: 'fortify-glow 2s ease-in-out infinite' } : undefined}
    >
      {/* Buff squares (WoW-style) — fixed row */}
      <div className="flex flex-wrap gap-0.5 min-h-[1.25rem]">
        {activeBuffs.map(buff => {
          const meta = (buffDisplay ?? {})[buff.id] ?? {
            label: buff.id.replace(/^[a-z]+_/, '').replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase()).slice(0, 12),
            color: 'text-gray-300 bg-gray-700/60',
            description: '',
          };
          const remaining = Math.max(0, (buff.expiresAt - Date.now()) / 1000);
          const tooltipContent = (
            <div className="space-y-0.5">
              <div className="font-bold">{meta.label}</div>
              {meta.description && <div className="text-gray-400">{meta.description}</div>}
              <div>Remaining: {remaining.toFixed(1)}s</div>
            </div>
          );
          return (
            <Tooltip key={buff.id} content={tooltipContent}>
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold leading-none ${meta.color} cursor-help`}>
                <div className="text-center">
                  <div className="truncate max-w-[1.4rem]">{meta.label.slice(0, 3)}</div>
                  <div className="text-[7px] opacity-70">{remaining.toFixed(0)}</div>
                </div>
              </div>
            </Tooltip>
          );
        })}
        {(rampingStacks ?? 0) > 0 && (
          <div className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold leading-none bg-amber-900/60 text-amber-300"
               title={`Ramping damage: ${rampingStacks} stacks`}>
            <div className="text-center">
              <div>RHY</div>
              <div className="text-[7px] opacity-70">x{rampingStacks}</div>
            </div>
          </div>
        )}
      </div>

      {/* HP header */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-300 font-semibold">HP</span>
          {hasFortify && (
            <span className="text-[10px] font-mono text-amber-300">
              FORT {fortifyStacks} ({Math.round((fortifyDR ?? 0) * 100)}% DR)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasEs && (
            <span className="text-blue-400 font-mono text-[11px]">
              ES: {Math.ceil(currentEs ?? 0)}/{maxEs}
            </span>
          )}
          <span className="text-white font-mono">{Math.ceil(currentHp)}/{maxHp}</span>
        </div>
      </div>
      {/* ES bar */}
      {hasEs && (
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-150"
               style={{ width: `${esPct}%` }} />
        </div>
      )}
      {/* HP bar */}
      <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden relative">
        {trailPct > pct && (
          <div className="absolute h-full bg-red-800/60 rounded-full transition-all duration-500"
               style={{ width: `${trailPct}%` }} />
        )}
        <div className={`absolute h-full ${color} rounded-full transition-all duration-150`}
             style={{ width: `${pct}%` }} />
      </div>

      {/* Class resource (compact inline) */}
      {classDef && classResource && <CompactResource classDef={classDef} stacks={resourceStacks} max={resourceMax} />}
    </div>
  );
}

function CompactResource({ classDef, stacks, max }: {
  classDef: { resourceType: string; resourceMax: number | null };
  stacks: number; max: number;
}) {
  if (classDef.resourceType === 'rage') {
    const pct = max ? Math.min(100, (stacks / max) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-[10px] font-semibold w-10 shrink-0">Rage</span>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex-1">
          <div className="h-full bg-red-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-white font-mono text-[10px] w-14 text-right">{stacks}/{max} <span className="text-red-300">+{Math.floor(stacks * 2)}%</span></span>
      </div>
    );
  }
  if (classDef.resourceType === 'arcane_charges') {
    const pips = max || 10;
    return (
      <div className="flex items-center gap-2">
        <span className="text-blue-400 text-[10px] font-semibold w-10 shrink-0">Arcane</span>
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: pips }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-200 ${
              i < stacks ? 'bg-blue-500' : 'bg-gray-700'
            }`} />
          ))}
        </div>
        <span className="text-white font-mono text-[10px] w-14 text-right">{stacks}/{pips} <span className="text-blue-300">+{stacks * 5}%</span></span>
      </div>
    );
  }
  if (classDef.resourceType === 'tracking') {
    const pct = max ? Math.min(100, (stacks / max) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <span className="text-green-400 text-[10px] font-semibold w-10 shrink-0">Track</span>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex-1">
          <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-white font-mono text-[10px] w-14 text-right">{stacks}/{max} <span className="text-green-300">+{(stacks * 0.5).toFixed(0)}%</span></span>
      </div>
    );
  }
  if (classDef.resourceType === 'momentum') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-purple-400 text-[10px] font-semibold w-10 shrink-0">Mntm</span>
        <span className="text-white font-mono text-[10px]">{stacks} <span className="text-purple-300">+{stacks}% spd</span></span>
      </div>
    );
  }
  return null;
}

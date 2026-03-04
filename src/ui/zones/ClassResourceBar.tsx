import type { ClassResourceState } from '../../types';
import { getClassDef } from '../../data/classes';

export default function ClassResourceBar({ resource, charClass }: { resource: ClassResourceState; charClass: string }) {
  const classDef = getClassDef(charClass as 'warrior' | 'mage' | 'ranger' | 'rogue');
  if (!classDef) return null;

  const stacks = Math.floor(resource.stacks);
  const max = classDef.resourceMax;

  if (classDef.resourceType === 'rage') {
    const pct = max ? Math.min(100, (resource.stacks / max) * 100) : 0;
    const dmgBonus = Math.floor(stacks * 2);
    return (
      <div className="bg-gray-800/50 rounded-lg border border-red-900/50 p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-red-400 font-semibold">Rage</span>
          <span className="text-white font-mono">{stacks}/{max} <span className="text-red-300 text-xs">+{dmgBonus}% dmg</span></span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 rounded-full transition-all duration-300"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (classDef.resourceType === 'arcane_charges') {
    const pips = max ?? 10;
    return (
      <div className="bg-gray-800/50 rounded-lg border border-blue-900/50 p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-400 font-semibold">Arcane Charges</span>
          <span className="text-white font-mono">{stacks}/{pips} <span className="text-blue-300 text-xs">+{stacks * 5}% spell dmg</span></span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: pips }).map((_, i) => (
            <div key={i} className={`flex-1 h-2.5 rounded-full transition-all duration-200 ${
              i < stacks ? 'bg-blue-500 shadow-sm shadow-blue-400/50' : 'bg-gray-700'
            }`} />
          ))}
        </div>
        {stacks === pips && (
          <div className="text-xs text-blue-300 text-center mt-1 animate-pulse font-semibold">MAX — Discharge on next clear!</div>
        )}
      </div>
    );
  }

  if (classDef.resourceType === 'tracking') {
    const pct = max ? Math.min(100, (resource.stacks / max) * 100) : 0;
    const rareBonus = (stacks * 0.5).toFixed(1);
    return (
      <div className="bg-gray-800/50 rounded-lg border border-green-900/50 p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-green-400 font-semibold">Tracking</span>
          <span className="text-white font-mono">{stacks}/{max} <span className="text-green-300 text-xs">+{rareBonus}% rare find</span></span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-300"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (classDef.resourceType === 'momentum') {
    const speedBonus = stacks;
    return (
      <div className="bg-gray-800/50 rounded-lg border border-purple-900/50 p-2">
        <div className="flex justify-between text-xs">
          <span className="text-purple-400 font-semibold">Momentum</span>
          <span className="text-white font-mono text-sm">{stacks} <span className="text-purple-300 text-xs">+{speedBonus}% clear speed</span></span>
        </div>
      </div>
    );
  }

  return null;
}

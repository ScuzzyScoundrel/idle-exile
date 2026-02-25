import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAbilityDef } from '../../data/abilities';
import {
  isAbilityActive,
  isAbilityOnCooldown,
  getRemainingCooldown,
  getRemainingBuff,
} from '../../engine/abilities';

export default function AbilityBar() {
  const { equippedAbilities, abilityTimers, activateAbility } = useGameStore();
  const [now, setNow] = useState(Date.now());

  // Refresh every 250ms for smooth countdown display
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const hasAbilities = equippedAbilities.some(ea => ea !== null);
  if (!hasAbilities) return null;

  return (
    <div className="flex gap-2 justify-center">
      {equippedAbilities.map((equipped, idx) => {
        if (!equipped) {
          return (
            <div
              key={idx}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50 flex items-center justify-center opacity-40"
            >
              <span className="text-gray-600 text-lg">+</span>
            </div>
          );
        }

        const def = getAbilityDef(equipped.abilityId);
        if (!def) return null;

        if (def.kind === 'passive') {
          return (
            <div
              key={idx}
              className="w-16 h-16 rounded-lg border-2 border-blue-600 bg-blue-950 flex flex-col items-center justify-center relative"
              title={`${def.name}: ${def.description}`}
            >
              <span className="text-xl">{def.icon}</span>
              <span className="text-[8px] text-blue-400 font-bold mt-0.5">PASSIVE</span>
            </div>
          );
        }

        // Active ability
        const timer = abilityTimers.find(t => t.abilityId === equipped.abilityId);
        const active = timer ? isAbilityActive(timer, equipped, now) : false;
        const onCooldown = timer ? isAbilityOnCooldown(timer, now) : false;
        const remainingCd = timer ? getRemainingCooldown(timer, now) : 0;
        const remainingBuff = timer ? getRemainingBuff(timer, equipped, now) : 0;
        const ready = !active && !onCooldown;

        return (
          <button
            key={idx}
            onClick={() => ready && activateAbility(equipped.abilityId)}
            disabled={!ready}
            className={`
              w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center relative transition-all
              ${active
                ? 'border-yellow-400 bg-yellow-950 ring-2 ring-yellow-400/50 animate-pulse'
                : onCooldown
                  ? 'border-gray-600 bg-gray-900 opacity-60 cursor-not-allowed'
                  : 'border-green-600 bg-green-950 hover:brightness-125 cursor-pointer'
              }
            `}
            title={`${def.name}: ${def.description}${active ? ` (${remainingBuff.toFixed(1)}s)` : onCooldown ? ` (CD: ${remainingCd.toFixed(0)}s)` : ' (Ready!)'}`}
          >
            <span className="text-xl">{def.icon}</span>
            {active && (
              <span className="text-[9px] text-yellow-300 font-bold">{remainingBuff.toFixed(1)}s</span>
            )}
            {!active && onCooldown && (
              <span className="text-[9px] text-gray-400 font-mono">{remainingCd.toFixed(0)}s</span>
            )}
            {ready && (
              <span className="text-[8px] text-green-400 font-bold">READY</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

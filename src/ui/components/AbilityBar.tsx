import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAbilityDef } from '../../data/abilities';
import {
  isAbilityActive,
  isAbilityOnCooldown,
  getRemainingCooldown,
  getRemainingBuff,
  getUnlockedSlotCount,
  getAbilityXpForLevel,
} from '../../engine/abilities';
import { ABILITY_SLOT_UNLOCKS } from '../../types';

// Kind-specific border colors
const KIND_BORDER: Record<string, string> = {
  passive: 'border-gray-500',
  buff: 'border-blue-600',
  instant: 'border-orange-600',
  proc: 'border-purple-600',
  toggle: 'border-green-600',
  ultimate: 'border-yellow-500',
};

const KIND_BG: Record<string, string> = {
  passive: 'bg-gray-900',
  buff: 'bg-blue-950',
  instant: 'bg-orange-950',
  proc: 'bg-purple-950',
  toggle: 'bg-green-950',
  ultimate: 'bg-yellow-950',
};

export default function AbilityBar() {
  const { equippedAbilities, abilityTimers, abilityProgress, activateAbility, character } = useGameStore();
  const [now, setNow] = useState(Date.now());

  // Refresh every 250ms for smooth countdown display
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const unlockedSlots = getUnlockedSlotCount(character.level);

  return (
    <div className="flex gap-2 justify-center">
      {equippedAbilities.map((equipped, idx) => {
        // Locked slot
        if (idx >= unlockedSlots) {
          const unlockLevel = ABILITY_SLOT_UNLOCKS[idx] ?? 99;
          return (
            <div
              key={idx}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50 flex flex-col items-center justify-center opacity-40"
              title={`Unlocks at level ${unlockLevel}`}
            >
              <span className="text-gray-600 text-sm">{'\uD83D\uDD12'}</span>
              <span className="text-gray-600 text-xs">Lv.{unlockLevel}</span>
            </div>
          );
        }

        // Empty slot
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

        const progress = abilityProgress[equipped.abilityId];
        const xpNeeded = progress ? getAbilityXpForLevel(progress.level) : 100;
        const xpPct = progress ? (progress.level >= 10 ? 100 : (progress.xp / xpNeeded) * 100) : 0;

        // Passive ability
        if (def.kind === 'passive') {
          return (
            <div
              key={idx}
              className={`w-16 h-16 rounded-lg border-2 ${KIND_BORDER.passive} ${KIND_BG.passive} flex flex-col items-center justify-center relative`}
              title={`${def.name}: ${def.description}`}
            >
              <span className="text-xl">{def.icon}</span>
              <span className="text-xs text-gray-400 font-bold mt-0.5">PASSIVE</span>
              {/* XP bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          );
        }

        // Proc ability
        if (def.kind === 'proc') {
          return (
            <div
              key={idx}
              className={`w-16 h-16 rounded-lg border-2 ${KIND_BORDER.proc} ${KIND_BG.proc} flex flex-col items-center justify-center relative`}
              title={`${def.name}: ${def.description}`}
            >
              <span className="text-xl">{def.icon}</span>
              <span className="text-xs text-purple-400 font-bold mt-0.5">PROC</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          );
        }

        // Toggle ability
        if (def.kind === 'toggle') {
          const timer = abilityTimers.find(t => t.abilityId === equipped.abilityId);
          const isOn = timer && timer.activatedAt !== null;
          return (
            <button
              key={idx}
              onClick={() => activateAbility(equipped.abilityId)}
              className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center relative transition-all cursor-pointer
                ${isOn
                  ? 'border-green-400 bg-green-950 ring-2 ring-green-400/50'
                  : `${KIND_BORDER.toggle} ${KIND_BG.toggle} hover:brightness-125`
                }
              `}
              title={`${def.name}: ${def.description} (${isOn ? 'ON' : 'OFF'})`}
            >
              <span className="text-xl">{def.icon}</span>
              <span className={`text-xs font-bold mt-0.5 ${isOn ? 'text-green-300' : 'text-gray-500'}`}>
                {isOn ? 'ON' : 'OFF'}
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
              </div>
            </button>
          );
        }

        // Buff / Instant / Ultimate ability
        const timer = abilityTimers.find(t => t.abilityId === equipped.abilityId);
        const active = timer ? isAbilityActive(timer, def, progress, now) : false;
        const onCooldown = timer ? isAbilityOnCooldown(timer, now) : false;
        const remainingCd = timer ? getRemainingCooldown(timer, now) : 0;
        const remainingBuff = timer ? getRemainingBuff(timer, def, progress, now) : 0;
        const ready = !active && !onCooldown;

        const kindBorder = KIND_BORDER[def.kind] ?? KIND_BORDER.buff;
        const kindBg = KIND_BG[def.kind] ?? KIND_BG.buff;

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
                  : `${kindBorder} ${kindBg} hover:brightness-125 cursor-pointer`
              }
            `}
            title={`${def.name}: ${def.description}${active ? ` (${remainingBuff.toFixed(1)}s)` : onCooldown ? ` (CD: ${remainingCd.toFixed(0)}s)` : ' (Ready!)'}`}
          >
            <span className="text-xl">{def.icon}</span>
            {active && (
              <span className="text-xs text-yellow-300 font-bold">{remainingBuff.toFixed(1)}s</span>
            )}
            {!active && onCooldown && (
              <span className="text-xs text-gray-400 font-mono">{remainingCd.toFixed(0)}s</span>
            )}
            {ready && (
              <span className={`text-xs font-bold ${def.kind === 'instant' ? 'text-orange-400' : def.kind === 'ultimate' ? 'text-yellow-400' : 'text-green-400'}`}>READY</span>
            )}
            {/* XP bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
              <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSkillStore } from '../../store/skillStore';
import { getUnifiedSkillDef } from '../../data/skills';
import { getSkillEffectiveDuration, getSkillEffectiveCooldown } from '../../engine/unifiedSkills';
import { getAbilityXpForLevel, getUnlockedSlotCount } from '../../engine/unifiedSkills';
import { SKILL_MAX_LEVEL } from '../../data/balance';
import { ABILITY_SLOT_UNLOCKS } from '../../types';

// Kind-specific border colors
const KIND_BORDER: Record<string, string> = {
  active: 'border-yellow-600',
  passive: 'border-gray-500',
  proc: 'border-purple-600',
  toggle: 'border-green-600',
  buff: 'border-blue-600',
  instant: 'border-orange-600',
  ultimate: 'border-yellow-500',
};

const KIND_BG: Record<string, string> = {
  active: 'bg-yellow-950',
  passive: 'bg-gray-900',
  proc: 'bg-purple-950',
  toggle: 'bg-green-950',
  buff: 'bg-blue-950',
  instant: 'bg-orange-950',
  ultimate: 'bg-yellow-950',
};

export default function SkillBar({ lastFiredSkillId, cdResetSkillId }: { lastFiredSkillId?: string | null; cdResetSkillId?: string | null }) {
  const skillBar = useGameStore(s => s.skillBar);
  const skillProgress = useGameStore(s => s.skillProgress);
  const skillTimers = useGameStore(s => s.skillTimers);
  const character = useGameStore(s => s.character);
  const activateSkillBarSlot = useSkillStore(s => s.activateSkillBarSlot);
  const toggleSkillAutoCast = useSkillStore(s => s.toggleSkillAutoCast);
  const [now, setNow] = useState(Date.now());
  const flashKeyRef = useRef(0);
  const cdResetKeyRef = useRef(0);
  const prevFiredRef = useRef<string | null | undefined>(undefined);
  const prevCdResetRef = useRef<string | null | undefined>(undefined);

  // Refresh every 250ms for smooth countdown display
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  // Increment flash key each time a new skill fires (re-triggers CSS animation)
  if (lastFiredSkillId !== prevFiredRef.current) {
    prevFiredRef.current = lastFiredSkillId;
    if (lastFiredSkillId) flashKeyRef.current++;
  }

  // Increment CD reset key when cdResetSkillId transitions to a value (re-triggers blue flash)
  if (cdResetSkillId && cdResetSkillId !== prevCdResetRef.current) {
    cdResetKeyRef.current++;
  }
  prevCdResetRef.current = cdResetSkillId ?? null;

  const unlockedSlots = getUnlockedSlotCount(character.level);

  return (
    <div className="flex gap-1.5 justify-center">
      {skillBar.map((equipped, idx) => {
        // Slots 0-4: slot 0 always unlocked (active skill), slots 1-4 use ABILITY_SLOT_UNLOCKS
        // unlockedSlots is the count of ability slots (0-4 map to slots 1-4)
        // Slot 0 is always unlocked; slots 1-4 need idx <= unlockedSlots
        if (idx > 0 && idx > unlockedSlots) {
          const unlockLevel = ABILITY_SLOT_UNLOCKS[idx - 1] ?? 99;
          return (
            <div
              key={idx}
              className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50 flex flex-col items-center justify-center opacity-40"
              title={`Unlocks at level ${unlockLevel}`}
            >
              <span className="text-gray-600 text-xs">{'\uD83D\uDD12'}</span>
              <span className="text-gray-600 text-xs">Lv.{unlockLevel}</span>
            </div>
          );
        }

        // Empty slot
        if (!equipped) {
          return (
            <div
              key={idx}
              className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50 flex items-center justify-center opacity-40"
            >
              <span className="text-gray-600 text-lg">+</span>
            </div>
          );
        }

        const def = getUnifiedSkillDef(equipped.skillId);
        if (!def) return null;

        const progress = skillProgress[equipped.skillId];
        const xpNeeded = progress ? getAbilityXpForLevel(progress.level) : 100;
        const xpPct = progress ? (progress.level >= SKILL_MAX_LEVEL ? 100 : (progress.xp / xpNeeded) * 100) : 0;

        // Timer state for this skill
        const timer = skillTimers.find(t => t.skillId === equipped.skillId);
        const duration = getSkillEffectiveDuration(def, progress);
        const isActive = timer?.activatedAt != null && now < timer.activatedAt + duration * 1000;
        const isOnCooldown = timer?.cooldownUntil != null && now < timer.cooldownUntil;
        const remainingBuff = isActive && timer?.activatedAt != null
          ? Math.max(0, (timer.activatedAt + duration * 1000 - now) / 1000)
          : 0;
        const remainingCd = isOnCooldown && timer?.cooldownUntil != null
          ? Math.max(0, (timer.cooldownUntil - now) / 1000)
          : 0;

        const border = KIND_BORDER[def.kind] ?? 'border-gray-600';
        const bg = KIND_BG[def.kind] ?? 'bg-gray-900';

        // Active (damage) skill — non-interactive, shows cooldown sweep
        if (def.kind === 'active') {
          const shortName = def.name.length > 6 ? def.name.slice(0, 6) + '..' : def.name;
          const isFlashing = equipped.skillId === lastFiredSkillId;
          const effectiveActiveCd = getSkillEffectiveCooldown(def, progress, character.stats.abilityHaste);
          const activeCdPct = isOnCooldown && effectiveActiveCd > 0
            ? Math.max(0, Math.min(1, remainingCd / effectiveActiveCd))
            : 0;
          const showCdResetFlash = !isOnCooldown && !isFlashing &&
            (cdResetSkillId === equipped.skillId || cdResetSkillId === '__all__');
          return (
            <div
              key={isFlashing ? `${idx}-f${flashKeyRef.current}` : showCdResetFlash ? `${idx}-r${cdResetKeyRef.current}` : idx}
              className={`w-14 h-14 rounded-lg border-2 ${border} ${bg} flex flex-col items-center justify-center relative overflow-hidden ${
                isOnCooldown ? 'opacity-60' : ''
              }`}
              style={isFlashing
                ? { animation: 'skill-flash 0.4s ease-out' }
                : showCdResetFlash
                  ? { animation: 'cd-reset-flash 0.5s ease-out' }
                  : undefined
              }
              title={`${def.name}: ${def.description}${isOnCooldown ? ` (CD: ${remainingCd.toFixed(0)}s)` : ''}`}
            >
              {/* Cooldown sweep overlay */}
              {isOnCooldown && activeCdPct > 0 && (
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none z-[1]"
                  style={{
                    background: `conic-gradient(rgba(0,0,0,0.6) ${activeCdPct * 360}deg, transparent ${activeCdPct * 360}deg)`,
                  }}
                />
              )}
              {/* Level badge */}
              {progress && progress.level > 0 && (
                <span className="absolute top-0 right-0.5 text-[9px] font-bold text-purple-300 z-10 select-none">
                  {progress.level >= SKILL_MAX_LEVEL ? 'MAX' : `Lv.${progress.level}`}
                </span>
              )}
              <span className="text-lg relative z-[2]">{def.icon}</span>
              {isOnCooldown ? (
                <span className="text-xs text-gray-400 font-mono relative z-[2]">{remainingCd.toFixed(0)}s</span>
              ) : (
                <span className="text-xs text-yellow-300 font-bold truncate w-full text-center px-0.5 relative z-[2]">{shortName}</span>
              )}
              {progress && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden z-[3]">
                  <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
                </div>
              )}
            </div>
          );
        }

        // Passive — non-interactive
        if (def.kind === 'passive') {
          return (
            <div
              key={idx}
              className={`w-14 h-14 rounded-lg border-2 ${border} ${bg} flex flex-col items-center justify-center relative`}
              title={`${def.name}: ${def.description}`}
            >
              {progress && progress.level > 0 && (
                <span className="absolute top-0 right-0.5 text-[9px] font-bold text-purple-300 z-10 select-none">
                  {progress.level >= SKILL_MAX_LEVEL ? 'MAX' : `Lv.${progress.level}`}
                </span>
              )}
              <span className="text-lg">{def.icon}</span>
              <span className="text-xs text-gray-400 font-bold">PASSIVE</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          );
        }

        // Proc — non-interactive
        if (def.kind === 'proc') {
          return (
            <div
              key={idx}
              className={`w-14 h-14 rounded-lg border-2 ${border} ${bg} flex flex-col items-center justify-center relative`}
              title={`${def.name}: ${def.description}`}
            >
              {progress && progress.level > 0 && (
                <span className="absolute top-0 right-0.5 text-[9px] font-bold text-purple-300 z-10 select-none">
                  {progress.level >= SKILL_MAX_LEVEL ? 'MAX' : `Lv.${progress.level}`}
                </span>
              )}
              <span className="text-lg">{def.icon}</span>
              <span className="text-xs text-purple-400 font-bold">PROC</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          );
        }

        // Toggle — interactive
        if (def.kind === 'toggle') {
          const isOn = timer && timer.activatedAt !== null;
          return (
            <button
              key={idx}
              onClick={() => activateSkillBarSlot(idx)}
              className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center relative transition-all cursor-pointer
                ${isOn
                  ? 'border-green-400 bg-green-950 ring-2 ring-green-400/50'
                  : `${border} ${bg} hover:brightness-125`
                }
              `}
              title={`${def.name}: ${def.description} (${isOn ? 'ON' : 'OFF'})`}
            >
              {/* Auto-cast indicator */}
              <span
                className={`absolute top-0 left-0.5 text-[9px] font-bold cursor-pointer z-10 select-none
                  ${equipped.autoCast ? 'text-green-400' : 'text-gray-600'}`}
                onClick={(e) => { e.stopPropagation(); toggleSkillAutoCast(idx); }}
                title={equipped.autoCast ? 'Auto-cast ON (click to disable)' : 'Auto-cast OFF (click to enable)'}
              >
                A
              </span>
              {progress && progress.level > 0 && (
                <span className="absolute top-0 right-0.5 text-[9px] font-bold text-purple-300 z-10 select-none">
                  {progress.level >= SKILL_MAX_LEVEL ? 'MAX' : `Lv.${progress.level}`}
                </span>
              )}
              <span className="text-lg">{def.icon}</span>
              <span className={`text-xs font-bold ${isOn ? 'text-green-300' : 'text-gray-500'}`}>
                {isOn ? 'ON' : 'OFF'}
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
              </div>
            </button>
          );
        }

        // Buff / Instant / Ultimate — interactive
        const ready = !isActive && !isOnCooldown;
        const isFlashingBtn = equipped.skillId === lastFiredSkillId;

        // Cooldown sweep: compute percentage for conic-gradient overlay
        const cooldown = getSkillEffectiveCooldown(def, progress, character.stats.abilityHaste);
        const totalCdMs = def.kind === 'buff'
          ? (duration + cooldown) * 1000
          : cooldown * 1000;
        const cdPct = isOnCooldown && totalCdMs > 0
          ? Math.max(0, Math.min(1, remainingCd / (totalCdMs / 1000)))
          : 0;
        const buffPct = isActive && duration > 0
          ? Math.max(0, Math.min(1, remainingBuff / duration))
          : 0;

        return (
          <button
            key={isFlashingBtn ? `${idx}-${flashKeyRef.current}` : idx}
            onClick={() => ready && activateSkillBarSlot(idx)}
            style={isFlashingBtn ? { animation: 'skill-flash 0.4s ease-out' } : undefined}
            disabled={!ready}
            className={`
              w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center relative transition-all overflow-hidden
              ${isActive
                ? 'border-yellow-400 bg-yellow-950 ring-2 ring-yellow-400/50 animate-pulse'
                : isOnCooldown
                  ? 'border-gray-600 bg-gray-900 opacity-60 cursor-not-allowed'
                  : `${border} ${bg} hover:brightness-125 cursor-pointer`
              }
            `}
            title={`${def.name}: ${def.description}${isActive ? ` (${remainingBuff.toFixed(1)}s)` : isOnCooldown ? ` (CD: ${remainingCd.toFixed(0)}s)` : ' (Ready!)'}`}
          >
            {/* Cooldown sweep overlay */}
            {isOnCooldown && cdPct > 0 && (
              <div
                className="absolute inset-0 rounded-lg pointer-events-none z-[1]"
                style={{
                  background: `conic-gradient(rgba(0,0,0,0.6) ${cdPct * 360}deg, transparent ${cdPct * 360}deg)`,
                }}
              />
            )}
            {/* Active buff duration sweep overlay */}
            {isActive && buffPct > 0 && (
              <div
                className="absolute inset-0 rounded-lg pointer-events-none z-[1]"
                style={{
                  background: `conic-gradient(transparent ${(1 - buffPct) * 360}deg, rgba(250,204,21,0.2) ${(1 - buffPct) * 360}deg)`,
                }}
              />
            )}
            {/* Auto-cast indicator */}
            <span
              className={`absolute top-0 left-0.5 text-[9px] font-bold cursor-pointer z-10 select-none
                ${equipped.autoCast ? 'text-green-400' : 'text-gray-600'}`}
              onClick={(e) => { e.stopPropagation(); toggleSkillAutoCast(idx); }}
              title={equipped.autoCast ? 'Auto-cast ON (click to disable)' : 'Auto-cast OFF (click to enable)'}
            >
              A
            </span>
            {progress && progress.level > 0 && (
              <span className="absolute top-0 right-0.5 text-[9px] font-bold text-purple-300 z-10 select-none">
                {progress.level >= SKILL_MAX_LEVEL ? 'MAX' : `Lv.${progress.level}`}
              </span>
            )}
            <span className="text-lg relative z-[2]">{def.icon}</span>
            {isActive && (
              <span className="text-xs text-yellow-300 font-bold relative z-[2]">{remainingBuff.toFixed(1)}s</span>
            )}
            {!isActive && isOnCooldown && (
              <span className="text-xs text-gray-400 font-mono relative z-[2]">{remainingCd.toFixed(0)}s</span>
            )}
            {ready && (
              <span className={`text-xs font-bold relative z-[2] ${
                def.kind === 'instant' ? 'text-orange-400'
                : def.kind === 'ultimate' ? 'text-yellow-400'
                : 'text-green-400'
              }`}>READY</span>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-lg overflow-hidden z-[3]">
              <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPct}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

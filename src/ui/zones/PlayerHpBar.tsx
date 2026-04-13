import { useState, useEffect } from 'react';
import type { ClassResourceState, TempBuff } from '../../types';
import type { MinionState } from '../../engine/combat/minions';
import { getClassDef } from '../../data/classes';
import Tooltip from '../components/Tooltip';
import { useGameStore } from '../../store/gameStore';
import { useSkillStore } from '../../store/skillStore';
import { getUnifiedSkillDef } from '../../data/skills';
import { getSkillEffectiveDuration, getSkillEffectiveCooldown, getSkillSpeedStat } from '../../engine/unifiedSkills';

// Visual metadata for each minion type
const MINION_META: Record<string, { icon: string; label: string; color: string }> = {
  zombie_dog:  { icon: '\uD83D\uDC15', label: 'Zombie Dog', color: 'border-emerald-500/50 bg-emerald-950/60' },
  fetish:      { icon: '\uD83C\uDFAD', label: 'Fetish',     color: 'border-amber-500/50 bg-amber-950/60' },
  spirit:      { icon: '\uD83D\uDC7B', label: 'Spirit',     color: 'border-cyan-400/50 bg-cyan-950/60' },
  spirit_temp: { icon: '\uD83D\uDC7B', label: 'Spirit',     color: 'border-sky-400/50 bg-sky-950/60' },
};

interface BuffMeta { label: string; color: string; description: string }

const COMBO_STATE_META: Record<string, { label: string; abbr: string; color: string; description: string }> = {
  exposed:          { label: 'Exposed',          abbr: 'EXP', color: 'text-red-300 bg-red-900/70',        description: 'Next non-Stab skill: +25% damage' },
  dance_momentum:   { label: 'Dance Momentum',   abbr: 'MOM', color: 'text-purple-300 bg-purple-900/70',  description: 'Next skill splashes to 1 adjacent enemy' },
  saturated:        { label: 'Saturated',         abbr: 'SAT', color: 'text-green-300 bg-green-900/70',    description: 'Targets take +15% DoT damage' },
  deep_wound:       { label: 'Deep Wound',        abbr: 'DPW', color: 'text-emerald-300 bg-emerald-900/70', description: 'Assassinate consumes as instant burst' },
  chain_surge:      { label: 'Chain Surge',       abbr: 'CHN', color: 'text-cyan-300 bg-cyan-900/70',      description: 'Next skill chains to +1 enemy' },
  shadow_mark:      { label: 'Shadow Mark',       abbr: 'MRK', color: 'text-violet-300 bg-violet-900/70',  description: 'Next skill on target gets per-skill bonus' },
  guarded:          { label: 'Guarded',           abbr: 'GRD', color: 'text-sky-300 bg-sky-900/70',        description: 'Next skill: +20% damage' },
  primed:           { label: 'Primed',            abbr: 'PRM', color: 'text-orange-300 bg-orange-900/70',  description: 'Next trap is instant + 25% bonus' },
  shadow_momentum:  { label: 'Shadow Momentum',   abbr: 'SPD', color: 'text-indigo-300 bg-indigo-900/70',  description: 'Next skill CD starts 2s earlier' },
};

export default function PlayerHpBar({ currentHp, maxHp, trailHp, fortifyStacks, fortifyDR, currentEs, maxEs, classResource, charClass, buffs, buffDisplay, rampingStacks, hideHpBars, lastFiredSkillId }: {
  currentHp: number; maxHp: number; trailHp?: number;
  fortifyStacks?: number; fortifyDR?: number;
  currentEs?: number; maxEs?: number;
  classResource?: ClassResourceState; charClass?: string;
  buffs?: TempBuff[]; buffDisplay?: Record<string, BuffMeta>;
  rampingStacks?: number;
  hideHpBars?: boolean;
  lastFiredSkillId?: string | null;
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
  const allComboStates = useGameStore(s => s.comboStates);
  // Only show player-side combo states here (target-side shown on mob/boss)
  const TARGET_STATES = new Set(['exposed', 'deep_wound', 'shadow_mark', 'saturated']);
  const comboStates = allComboStates.filter(cs => !TARGET_STATES.has(cs.stateId));

  // Class resource
  const classDef = charClass ? getClassDef(charClass as 'warrior' | 'mage' | 'ranger' | 'rogue') : null;
  const resourceStacks = classResource ? Math.floor(classResource.stacks) : 0;
  const resourceMax = classDef?.resourceMax ?? 0;

  return (
    <div
      className={`panel-iron p-2 space-y-1 ${hasFortify && !hideHpBars ? '!border-amber-500/40' : ''}`}
      style={hasFortify && !hideHpBars ? { animation: 'fortify-glow 2s ease-in-out infinite' } : undefined}
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
          <Tooltip content={
            <div className="space-y-0.5">
              <div className="font-bold">Lethal Rhythm</div>
              <div className="text-gray-400">Each consecutive hit builds momentum, increasing damage per stack. Resets on miss or after a short delay.</div>
              <div>Stacks: {rampingStacks}</div>
            </div>
          }>
            <div className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold leading-none bg-amber-900/60 text-amber-300 cursor-help">
              <div className="text-center">
                <div>RHY</div>
                <div className="text-[7px] opacity-70">x{rampingStacks}</div>
              </div>
            </div>
          </Tooltip>
        )}
        {comboStates.map(cs => {
          const meta = COMBO_STATE_META[cs.stateId];
          if (!meta) return null;
          const remaining = cs.remainingDuration;
          return (
            <Tooltip key={cs.stateId} content={
              <div className="space-y-0.5">
                <div className="font-bold">{meta.label}</div>
                <div className="text-gray-400">{meta.description}</div>
                <div>Remaining: {remaining.toFixed(1)}s</div>
              </div>
            }>
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold leading-none ${meta.color} cursor-help ring-1 ring-white/20`}>
                <div className="text-center">
                  <div>{meta.abbr}</div>
                  <div className="text-[7px] opacity-70">{remaining.toFixed(0)}</div>
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* HP/ES bars — hidden during boss fight (BossFightDisplay has its own) */}
      {!hideHpBars && (
        <>
          {/* ES bar with value inside */}
          {hasEs && (
            <div className="h-3.5 bg-gray-700 rounded-full overflow-hidden relative">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-150"
                   style={{ width: `${esPct}%` }} />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono text-white"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,1), 0 0 6px rgba(0,0,0,0.8)' }}>
                ES {Math.ceil(currentEs ?? 0)}/{maxEs}
              </span>
            </div>
          )}
          {/* HP bar with value inside */}
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden relative">
            {trailPct > pct && (
              <div className="absolute h-full bg-red-800/60 rounded-full transition-all duration-500"
                   style={{ width: `${trailPct}%` }} />
            )}
            <div className={`absolute h-full ${color} rounded-full transition-all duration-150`}
                 style={{ width: `${pct}%` }} />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-mono"
                 style={{ textShadow: '0 1px 3px rgba(0,0,0,1), 0 0 6px rgba(0,0,0,0.8)' }}>
              <span className="text-amber-300">
                {hasFortify ? `FORT ${fortifyStacks} (${Math.round((fortifyDR ?? 0) * 100)}%)` : ''}
              </span>
              <span className="text-white font-bold">{Math.ceil(currentHp)}/{maxHp}</span>
            </div>
          </div>
        </>
      )}

      {/* Active minions (Witch Doctor staff: dogs / fetishes / spirits) */}
      <ActiveMinionsRow />

      {/* Class resource (compact inline) */}
      {classDef && classResource && <CompactResource classDef={classDef} stacks={resourceStacks} max={resourceMax} />}

      {/* Compact skill icons */}
      <CompactSkills lastFiredSkillId={lastFiredSkillId} />
    </div>
  );
}

function ActiveMinionsRow() {
  const minions = useGameStore(s => s.activeMinions);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(id);
  }, []);
  if (!minions || minions.length === 0) return null;
  const totalDealt = minions.reduce((sum, m) => sum + (m.damageDealt ?? 0), 0);
  return (
    <div className="pt-0.5 border-t border-gray-700/40 mt-0.5">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] uppercase tracking-wide text-emerald-300/80 font-semibold">Minions ({minions.length})</span>
        <span className="text-[9px] font-mono text-yellow-300/80">Σ dealt: {Math.floor(totalDealt)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {minions.map(m => <MinionBadge key={m.id} minion={m} now={now} />)}
      </div>
    </div>
  );
}

function MinionBadge({ minion, now }: { minion: MinionState; now: number }) {
  const meta = MINION_META[minion.type] ?? { icon: '\u2753', label: minion.type, color: 'border-gray-500/50 bg-gray-800/60' };
  const hpPct = minion.maxHp > 0 ? Math.max(0, Math.min(100, (minion.hp / minion.maxHp) * 100)) : 0;
  const remaining = Math.max(0, (minion.expiresAt - now) / 1000);
  const hpBarColor = hpPct > 60 ? 'bg-emerald-500' : hpPct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  // Attack timer: fills up from 0→100% between attacks. Near 100% = about to bite.
  const intervalMs = Math.max(1, minion.attackInterval * 1000);
  const msUntilAttack = Math.max(0, minion.nextAttackAt - now);
  const atkProgressPct = Math.max(0, Math.min(100, (1 - msUntilAttack / intervalMs) * 100));
  const atkSecUntil = msUntilAttack / 1000;
  // Color: element-themed to make the bar read at a glance
  const atkBarColor =
    minion.element === 'chaos' ? 'bg-purple-400' :
    minion.element === 'cold' ? 'bg-sky-300' :
    minion.element === 'fire' ? 'bg-orange-400' :
    minion.element === 'lightning' ? 'bg-yellow-300' :
    'bg-red-400';
  const elementAilment =
    minion.element === 'chaos' ? 'Poisoned' :
    minion.element === 'cold' ? 'Frostbite' :
    minion.element === 'fire' ? 'Ignite' :
    minion.element === 'lightning' ? 'Shocked' :
    'Bleeding';
  const totalDealt = minion.damageDealt ?? 0;
  const tooltipContent = (
    <div className="space-y-0.5 text-[11px]">
      <div className="font-bold">{meta.icon} {meta.label}</div>
      <div className="text-gray-300">HP: {Math.ceil(minion.hp)}/{Math.ceil(minion.maxHp)}</div>
      <div className="text-gray-400">Damage: {minion.damage.toFixed(0)} every {minion.attackInterval.toFixed(1)}s ({minion.element})</div>
      <div className="text-yellow-300">Total dealt: {Math.floor(totalDealt)}</div>
      <div className="text-gray-400">Next attack in {atkSecUntil.toFixed(1)}s</div>
      <div className="text-gray-400">On hit: applies {elementAilment}</div>
      <div className="text-gray-400">Expires in {remaining.toFixed(1)}s</div>
      {minion.createsComboStateOnHit && (
        <div className="text-cyan-300">Also creates combo state: {minion.createsComboStateOnHit}</div>
      )}
    </div>
  );
  return (
    <Tooltip content={tooltipContent}>
      <div className={`flex items-center gap-1 px-1 py-0.5 rounded border ${meta.color} cursor-help`}>
        <span className="text-[14px] leading-none">{meta.icon}</span>
        <div className="flex flex-col gap-0.5 w-14">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden" title="HP">
            <div className={`h-full ${hpBarColor} rounded-full transition-all duration-200`} style={{ width: `${hpPct}%` }} />
          </div>
          <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden" title={`Attack in ${atkSecUntil.toFixed(1)}s`}>
            <div className={`h-full ${atkBarColor} rounded-full transition-all duration-100`} style={{ width: `${atkProgressPct}%` }} />
          </div>
          <span className="text-[8px] font-mono text-gray-300 leading-none">{remaining.toFixed(0)}s</span>
        </div>
      </div>
    </Tooltip>
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

function CompactSkills({ lastFiredSkillId }: { lastFiredSkillId?: string | null }) {
  const skillBar = useGameStore(s => s.skillBar);
  const skillTimers = useGameStore(s => s.skillTimers);
  const skillProgress = useGameStore(s => s.skillProgress);
  const charStats = useGameStore(s => s.character.stats);
  const activateSkillBarSlot = useSkillStore(s => s.activateSkillBarSlot);
  const now = Date.now();

  return (
    <div className="flex gap-1 justify-center">
      {skillBar.map((equipped, idx) => {
        if (!equipped) return null;
        const def = getUnifiedSkillDef(equipped.skillId);
        if (!def) return null;

        const progress = skillProgress[equipped.skillId];
        const timer = skillTimers.find(t => t.skillId === equipped.skillId);
        const duration = getSkillEffectiveDuration(def, progress);
        const cooldown = getSkillEffectiveCooldown(def, progress, getSkillSpeedStat(def, charStats));

        const isActive = timer?.activatedAt != null && now < timer.activatedAt + duration * 1000;
        const isOnCd = timer?.cooldownUntil != null && now < timer.cooldownUntil;
        const cdRemaining = isOnCd && timer?.cooldownUntil ? Math.max(0, (timer.cooldownUntil - now) / 1000) : 0;

        const totalCd = def.kind === 'buff' ? (duration + cooldown) : cooldown;
        const cdPct = isOnCd && totalCd > 0 ? Math.max(0, Math.min(1, cdRemaining / totalCd)) : 0;

        const isToggleOn = def.kind === 'toggle' && timer?.activatedAt != null;
        const isFlashing = equipped.skillId === lastFiredSkillId;

        // Interactive: toggle always clickable, buff/instant/ultimate when ready
        const isInteractive = def.kind === 'toggle' || def.kind === 'buff' || def.kind === 'instant' || def.kind === 'ultimate';
        const canClick = isInteractive && (def.kind === 'toggle' || (!isActive && !isOnCd));

        return (
          <div
            key={idx}
            onClick={canClick ? () => activateSkillBarSlot(idx) : undefined}
            className={`w-8 h-8 rounded border flex items-center justify-center relative overflow-hidden
              ${isActive ? 'border-yellow-500/70 bg-yellow-950/60'
                : isToggleOn ? 'border-green-500/70 bg-green-950/60'
                : isOnCd ? 'border-gray-700 bg-gray-900/80 opacity-50'
                : 'border-gray-700 bg-gray-900/80'}
              ${canClick ? 'cursor-pointer active:scale-95' : ''}`}
            style={isFlashing ? { animation: 'skill-flash 0.4s ease-out' } : undefined}
            title={`${def.name}${isOnCd ? ` (${cdRemaining.toFixed(0)}s)` : isActive ? ' (Active)' : ''}`}
          >
            {isOnCd && cdPct > 0 && (
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background: `conic-gradient(rgba(0,0,0,0.55) ${cdPct * 360}deg, transparent ${cdPct * 360}deg)` }} />
            )}
            <span className="relative z-[1] text-sm leading-none">{def.icon}</span>
            {isOnCd && (
              <span className="absolute bottom-0 inset-x-0 text-center text-[7px] font-mono text-gray-300 z-[2] leading-none pb-px">
                {Math.ceil(cdRemaining)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

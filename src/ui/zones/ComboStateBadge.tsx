import Tooltip from '../components/Tooltip';
import type { ComboState } from '../../types';

interface ComboMeta {
  label: string;
  abbr: string;
  text: string;
  bg: string;
  description: string;
}

/** Target-side combo states — shown as debuff pills on enemies */
export const TARGET_COMBO_STATES: Record<string, ComboMeta> = {
  exposed:     { label: 'Exposed',     abbr: 'EXP', text: 'text-red-300',     bg: 'bg-red-900/70',     description: 'Next non-Stab skill deals +25% damage' },
  deep_wound:  { label: 'Deep Wound',  abbr: 'DPW', text: 'text-emerald-300', bg: 'bg-emerald-900/70', description: 'Assassinate consumes as instant burst' },
  shadow_mark: { label: 'Shadow Mark', abbr: 'MRK', text: 'text-violet-300',  bg: 'bg-violet-900/70',  description: 'Next skill on target gets per-skill bonus' },
  saturated:   { label: 'Saturated',   abbr: 'SAT', text: 'text-green-300',   bg: 'bg-green-900/70',   description: '+15% DoT damage on this target' },
};

/** Player-side combo states — shown as buff badges on HP bar */
export const PLAYER_COMBO_STATES: Record<string, ComboMeta> = {
  dance_momentum:  { label: 'Dance Momentum',  abbr: 'MOM', text: 'text-purple-300', bg: 'bg-purple-900/70', description: 'Next skill splashes to 1 adjacent enemy' },
  chain_surge:     { label: 'Chain Surge',      abbr: 'CHN', text: 'text-cyan-300',   bg: 'bg-cyan-900/70',   description: 'Next skill chains to +1 enemy' },
  guarded:         { label: 'Guarded',          abbr: 'GRD', text: 'text-sky-300',    bg: 'bg-sky-900/70',    description: 'Next skill: +20% damage' },
  primed:          { label: 'Primed',           abbr: 'PRM', text: 'text-orange-300', bg: 'bg-orange-900/70', description: 'Next trap is instant + 25% bonus' },
  shadow_momentum: { label: 'Shadow Momentum',  abbr: 'SPD', text: 'text-indigo-300', bg: 'bg-indigo-900/70', description: 'Next skill CD starts 2s earlier' },
};

/** Debuff-style pill for target-side combo states (renders alongside DebuffBadge) */
export function ComboStatePill({ state }: { state: ComboState }) {
  const meta = TARGET_COMBO_STATES[state.stateId] ?? PLAYER_COMBO_STATES[state.stateId];
  if (!meta) return null;

  return (
    <Tooltip content={
      <div className="space-y-0.5">
        <div className="font-bold">{meta.label}</div>
        <div className="text-gray-400">{meta.description}</div>
        <div>Remaining: {state.remainingDuration.toFixed(1)}s</div>
      </div>
    }>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold ${meta.bg} ${meta.text}`}>
        {meta.abbr} {state.remainingDuration.toFixed(0)}s
      </span>
    </Tooltip>
  );
}

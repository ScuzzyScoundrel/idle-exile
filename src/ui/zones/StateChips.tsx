// ============================================================
// StateChips — generic charge-economy telegraphy (E16)
// ============================================================
//
// Renders player-side combo states straight from COMBO_STATE_SPECS
// metadata — the same registry the engine and gambits read — so any
// future class charge state renders for free (E2 grammar):
//   • category 'stack'  → labeled pip row (momentum, soul_stack, frenzy);
//                         glows at cap, flicks when an at-cap builder
//                         cast wastes a stack (U7 overcap).
//   • category 'self'   → prominent pulsing window chip (opening,
//                         chain_surge, shadow_momentum) while live.
// Target-side / aura / fusion states keep their existing render paths
// (DebuffBadge on mobs, minions row, etc.).
//
// Replaces the dead ClassResourceBar.tsx per COMBAT_ECONOMY_DESIGN E16.

import { useEffect, useRef, useState } from 'react';
import type { ComboState } from '../../types';
import { getComboStateSpec } from '../../data/comboStates';
import Tooltip from '../components/Tooltip';

/** True when StateChips owns rendering for this state (player-side
 *  stack/window states with a registry spec). Callers with legacy
 *  badge rows should exclude these to avoid double-rendering. */
export function isStateChipState(stateId: string): boolean {
  const spec = getComboStateSpec(stateId);
  return !!spec && spec.side === 'player'
    && (spec.category === 'stack' || spec.category === 'self');
}

export default function StateChips({ comboStates }: { comboStates: ComboState[] }) {
  const chips = comboStates.filter(cs => isStateChipState(cs.stateId));
  if (chips.length === 0) return null;
  const stackStates = chips.filter(cs => getComboStateSpec(cs.stateId)!.category === 'stack');
  const windowStates = chips.filter(cs => getComboStateSpec(cs.stateId)!.category === 'self');

  return (
    <div className="space-y-0.5">
      {stackStates.map(cs => <StackPips key={cs.stateId} state={cs} />)}
      {windowStates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {windowStates.map(cs => <WindowChip key={cs.stateId} state={cs} />)}
        </div>
      )}
    </div>
  );
}

/** Stack-category charge state: labeled pip row, glow at cap, overcap flick. */
function StackPips({ state }: { state: ComboState }) {
  const spec = getComboStateSpec(state.stateId)!;
  const max = state.maxStacks || spec.maxStacks;
  const atCap = state.stacks >= max;

  // Overcap flick (U7): refresh-on-gain bumps remainingDuration while
  // stacks stay pinned at cap — an at-cap builder cast just wasted a
  // stack. Detected purely from pre/post render data, no engine plumbing.
  const prevRef = useRef({ stacks: state.stacks, remaining: state.remainingDuration });
  const [flickKey, setFlickKey] = useState(0);
  useEffect(() => {
    const prev = prevRef.current;
    if (atCap && prev.stacks >= max && state.remainingDuration > prev.remaining + 0.25) {
      setFlickKey(k => k + 1);
    }
    prevRef.current = { stacks: state.stacks, remaining: state.remainingDuration };
  }, [state.stacks, state.remainingDuration, atCap, max]);

  return (
    <Tooltip content={
      <div className="space-y-0.5">
        <div className="font-bold">{spec.name}</div>
        <div className="text-gray-400">{spec.description}</div>
        <div>Stacks: {state.stacks}/{max}{atCap ? ' — FULL' : ''}</div>
        <div>Remaining: {state.remainingDuration.toFixed(1)}s</div>
      </div>
    }>
      <div
        className={`flex items-center gap-2 rounded px-1 py-0.5 cursor-help ${atCap ? 'ring-1 ring-amber-400/60' : ''}`}
        style={atCap ? { animation: 'statechip-cap-glow 1.2s ease-in-out infinite' } : undefined}
      >
        <span className={`text-[10px] font-semibold w-16 shrink-0 truncate ${atCap ? 'text-amber-300' : 'text-purple-300'}`}>
          {spec.name}
        </span>
        <div
          key={flickKey}
          className="flex gap-0.5 flex-1"
          style={flickKey > 0 ? { animation: 'statechip-overcap-flick 0.35s ease-out' } : undefined}
        >
          {Array.from({ length: max }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-150 ${
              i < state.stacks
                ? (atCap ? 'bg-amber-400 shadow-sm shadow-amber-300/60' : 'bg-purple-500')
                : 'bg-gray-700'
            }`} />
          ))}
        </div>
        <span className="text-white font-mono text-[10px] w-8 text-right shrink-0">{state.stacks}/{max}</span>
      </div>
    </Tooltip>
  );
}

/** Self-category window state: prominent chip that pulses while live. */
function WindowChip({ state }: { state: ComboState }) {
  const spec = getComboStateSpec(state.stateId)!;
  if (state.remainingDuration <= 0) return null;

  return (
    <Tooltip content={
      <div className="space-y-0.5">
        <div className="font-bold">{spec.name}</div>
        <div className="text-gray-400">{spec.description}</div>
        <div>Remaining: {state.remainingDuration.toFixed(1)}s</div>
      </div>
    }>
      <div className="flex items-center gap-1.5 rounded px-1.5 py-0.5 bg-cyan-900/50 ring-1 ring-cyan-300/60 animate-pulse cursor-help">
        <span className="text-cyan-200 text-[11px] font-bold uppercase tracking-wide">{spec.name}!</span>
        <span className="text-cyan-100 font-mono text-[10px]">{state.remainingDuration.toFixed(1)}s</span>
      </div>
    </Tooltip>
  );
}

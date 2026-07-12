// ============================================================
// RotationPanel v1 — gambit preset picker + rule list (unblocked by
// GATE E1, COMBAT_ECONOMY_DESIGN §2.3 / SESSION_HANDOFF top block).
//
// v1 scope: pick a shipped preset, toggle/reorder its rules, reset to
// pristine. NO free-form condition editor — that UX is a later owner
// decision. tick.ts reads state.rotationPolicy every decision, so any
// change here applies on the next combat tick automatically.
// ============================================================

import { useGameStore } from '../../store/gameStore';
import { ROTATION_PRESETS, getRotationPreset } from '../../data/rotationPresets';
import type { RotationPresetDef } from '../../data/rotationPresets';
import type { RotationPolicy } from '../../types/rotation';
import { getEquippedWeaponType } from '../../engine/items';
import { getUnifiedSkillDef } from '../../data/skills';
import { formatRotationRule } from '../format/rotationText';

/** RotationPolicy is pure JSON data (no functions/Dates), so a JSON
 *  round-trip is a safe deep clone (same idiom as offlineSim.ts). */
const clonePolicy = (p: RotationPolicy): RotationPolicy => JSON.parse(JSON.stringify(p));

/** Order-insensitive rule-id fingerprint. RotationPolicy has no preset
 *  id field (and must not grow one), so the active preset is inferred
 *  by matching rule-id sets — toggles and reorders keep the match, and
 *  deep-equality against the pristine preset flags "modified". */
const ruleIdKey = (p: RotationPolicy) => p.rules.map(r => r.id).sort().join('|');

export default function RotationPanel() {
  const character = useGameStore(s => s.character);
  const rotationPolicy = useGameStore(s => s.rotationPolicy);
  const setRotationPolicy = useGameStore(s => s.setRotationPolicy);

  const weaponType = getEquippedWeaponType(character.equipment);
  const presets = ROTATION_PRESETS.filter(
    p => p.weaponType === null || p.weaponType === weaponType,
  );

  const activePreset: RotationPresetDef | null = rotationPolicy === null
    ? getRotationPreset('slot_order') ?? null
    : ROTATION_PRESETS.find(
        p => p.policy !== null && ruleIdKey(p.policy) === ruleIdKey(rotationPolicy),
      ) ?? null;
  const isModified = activePreset?.policy != null && rotationPolicy != null
    && JSON.stringify(activePreset.policy) !== JSON.stringify(rotationPolicy);

  const applyPreset = (preset: RotationPresetDef) => {
    setRotationPolicy(preset.policy ? clonePolicy(preset.policy) : null);
  };

  const updateRules = (mutate: (draft: RotationPolicy) => void) => {
    if (!rotationPolicy) return;
    const draft = clonePolicy(rotationPolicy);
    mutate(draft);
    setRotationPolicy(draft);
  };

  const toggleRule = (idx: number) => {
    updateRules(d => { d.rules[idx].enabled = !d.rules[idx].enabled; });
  };

  const moveRule = (idx: number, dir: -1 | 1) => {
    if (!rotationPolicy) return;
    const j = idx + dir;
    if (j < 0 || j >= rotationPolicy.rules.length) return;
    updateRules(d => {
      [d.rules[idx], d.rules[j]] = [d.rules[j], d.rules[idx]];
    });
  };

  return (
    <div className="panel-stone p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-300 heading-fantasy">Combat Rotation</h3>
        <span className="text-xs text-gray-500">Changes apply next combat tick</span>
      </div>

      {/* Preset picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presets.map(preset => {
          const isActive = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`text-left rounded-lg border p-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-yellow-600 bg-yellow-950/20'
                  : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-white">{preset.name}</span>
                {isActive && (
                  <span className="text-xs px-1 rounded bg-yellow-900 text-yellow-300">
                    ACTIVE{isModified ? ' · modified' : ''}
                  </span>
                )}
                {preset.weaponType && (
                  <span className="text-xs px-1 rounded bg-gray-700 text-gray-400">{preset.weaponType}</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{preset.blurb}</div>
            </button>
          );
        })}
      </div>

      {/* Rule list — only for a custom (non-slot-order) policy */}
      {rotationPolicy !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">
              First matching rule wins each tick — a rule's position IS its priority.
            </span>
            {activePreset?.policy && isModified && (
              <button
                onClick={() => applyPreset(activePreset)}
                className="text-xs px-2 py-0.5 bg-red-900 hover:bg-red-800 text-red-300 rounded shrink-0"
              >
                Reset to preset
              </button>
            )}
          </div>

          {rotationPolicy.rules.map((rule, idx) => {
            const icon = rule.action.kind === 'castSkill'
              ? getUnifiedSkillDef(rule.action.skillId)?.icon ?? null
              : null;
            return (
              <div
                key={rule.id}
                className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
                  rule.enabled
                    ? 'border-gray-700 bg-gray-900/50'
                    : 'border-gray-800 bg-gray-900/30 opacity-50'
                }`}
              >
                <span className="text-xs text-gray-500 w-4 text-right shrink-0">{idx + 1}</span>
                <button
                  onClick={() => toggleRule(idx)}
                  className={`text-xs px-1.5 py-0.5 rounded shrink-0 transition-all ${
                    rule.enabled
                      ? 'bg-green-900 text-green-300 hover:bg-green-800'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {rule.enabled ? 'On' : 'Off'}
                </button>
                {icon && <span className="text-sm shrink-0">{icon}</span>}
                <span className="text-xs text-gray-300 flex-1 min-w-0">
                  {formatRotationRule(rule)}
                </span>
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => moveRule(idx, -1)}
                    disabled={idx === 0}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 leading-none px-1"
                    aria-label="Move rule up"
                  >
                    {'▲'}
                  </button>
                  <button
                    onClick={() => moveRule(idx, 1)}
                    disabled={idx === rotationPolicy.rules.length - 1}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 leading-none px-1"
                    aria-label="Move rule down"
                  >
                    {'▼'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-gray-600 italic">Custom rule authoring coming later.</div>
    </div>
  );
}

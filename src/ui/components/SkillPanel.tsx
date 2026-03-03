import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getUnifiedSkillsForWeapon, getUnifiedSkillDef } from '../../data/unifiedSkills';
import { calcSkillDps, getAbilityXpForLevel, getRespecCost, getUnlockedSlotCount, canAllocateNode } from '../../engine/unifiedSkills';
import { SKILL_MAX_LEVEL } from '../../data/balance';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { getEquippedWeaponType } from '../../engine/items';
import { getAbilityDef } from '../../data/unifiedSkills';
import { ABILITY_ID_MIGRATION } from '../../data/unifiedSkills';
import { ABILITY_SLOT_UNLOCKS } from '../../types';
import type { SkillDef, SkillKind, SkillProgress, AbilityProgress } from '../../types';
import SkillGraphView from './SkillGraphView';

const TAG_COLORS: Record<string, string> = {
  Attack: 'bg-red-900/60 text-red-300',
  Spell: 'bg-blue-900/60 text-blue-300',
  Physical: 'bg-gray-700 text-gray-300',
  Fire: 'bg-orange-900/60 text-orange-300',
  Cold: 'bg-cyan-900/60 text-cyan-300',
  Lightning: 'bg-yellow-900/60 text-yellow-300',
  Chaos: 'bg-purple-900/60 text-purple-300',
  Melee: 'bg-gray-700 text-gray-400',
  Projectile: 'bg-gray-700 text-gray-400',
  AoE: 'bg-gray-700 text-gray-400',
  DoT: 'bg-green-900/60 text-green-300',
  Channel: 'bg-teal-900/60 text-teal-300',
};

const KIND_BADGE_COLORS: Record<string, string> = {
  active: 'bg-yellow-900 text-yellow-300',
  passive: 'bg-gray-700 text-gray-300',
  buff: 'bg-blue-900 text-blue-300',
  instant: 'bg-orange-900 text-orange-300',
  proc: 'bg-purple-900 text-purple-300',
  toggle: 'bg-green-900 text-green-300',
  ultimate: 'bg-yellow-900 text-yellow-300',
};

function formatDps(dps: number): string {
  if (dps >= 1000) return `${(dps / 1000).toFixed(1)}k`;
  return dps.toFixed(1);
}

// Build reverse map: unified ID → old ability ID (for canAllocateNode which uses AbilityDef)
const REVERSE_MIGRATION: Record<string, string> = {};
for (const [oldId, newId] of Object.entries(ABILITY_ID_MIGRATION)) {
  REVERSE_MIGRATION[newId] = oldId;
}

type KindFilter = 'all' | SkillKind;

export default function SkillPanel() {
  const character = useGameStore(s => s.character);
  const skillBar = useGameStore(s => s.skillBar);
  const skillProgress = useGameStore(s => s.skillProgress);
  const equipToSkillBar = useGameStore(s => s.equipToSkillBar);
  const unequipSkillBarSlot = useGameStore(s => s.unequipSkillBarSlot);
  const allocateAbilityNode = useGameStore(s => s.allocateAbilityNode);
  const respecAbility = useGameStore(s => s.respecAbility);
  const gold = useGameStore(s => s.gold);

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const weaponType = getEquippedWeaponType(character.equipment);

  if (!weaponType) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300">Skills</h3>
        <div className="text-xs text-gray-500 mt-2">Equip a weapon to use skills</div>
      </div>
    );
  }

  const stats = resolveStats(character);
  const { avgDamage, spellPower } = getWeaponDamageInfo(character.equipment);
  const allSkills = getUnifiedSkillsForWeapon(weaponType);
  const unlockedSlots = getUnlockedSlotCount(character.level);

  // Find equipped active skill's DPS for comparison
  const equippedActiveSkill = skillBar.find(s => {
    if (!s) return false;
    const def = getUnifiedSkillDef(s.skillId);
    return def?.kind === 'active';
  });
  const equippedActiveDef = equippedActiveSkill ? getUnifiedSkillDef(equippedActiveSkill.skillId) : null;
  const equippedDps = equippedActiveDef ? calcSkillDps(equippedActiveDef, stats, avgDamage, spellPower) : 0;

  // Determine which kind filters to show
  const presentKinds = new Set(allSkills.map(s => s.kind));
  const filterOptions: { label: string; value: KindFilter }[] = [
    { label: 'All', value: 'all' },
  ];
  if (presentKinds.has('active')) filterOptions.push({ label: 'Active', value: 'active' });
  if (presentKinds.has('buff')) filterOptions.push({ label: 'Buff', value: 'buff' });
  if (presentKinds.has('passive')) filterOptions.push({ label: 'Passive', value: 'passive' });
  if (presentKinds.has('toggle')) filterOptions.push({ label: 'Toggle', value: 'toggle' });
  if (presentKinds.has('instant')) filterOptions.push({ label: 'Instant', value: 'instant' });

  const filteredSkills = kindFilter === 'all'
    ? allSkills
    : allSkills.filter(s => s.kind === kindFilter);

  // Check if a skill is equipped in any slot
  const equippedSkillIds = new Set(skillBar.filter(Boolean).map(s => s!.skillId));

  const handleEquip = (skillId: string) => {
    if (selectedSlot !== null) {
      equipToSkillBar(skillId, selectedSlot);
      setSelectedSlot(null);
    } else {
      // Find first empty unlocked slot
      for (let i = 0; i < 5; i++) {
        if (i > 0 && i > unlockedSlots) continue;
        if (!skillBar[i]) {
          equipToSkillBar(skillId, i);
          return;
        }
      }
      // All slots full — do nothing (could flash message but keeping simple)
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-3">
      {/* Header */}
      <h3 className="text-sm font-bold text-gray-300">Skills</h3>

      {/* Section 1: Equipped Skill Bar (compact overview) */}
      <div className="flex gap-1">
        {skillBar.slice(0, 5).map((equipped, idx) => {
          // Locked slots
          if (idx > 0 && idx > unlockedSlots) {
            const unlockLevel = ABILITY_SLOT_UNLOCKS[idx - 1] ?? 99;
            return (
              <div key={idx} className="flex-1 h-8 rounded border-2 border-dashed border-gray-700 flex items-center justify-center opacity-40">
                <span className="text-gray-600 text-xs">{'\uD83D\uDD12'} Lv.{unlockLevel}</span>
              </div>
            );
          }

          const isSelected = selectedSlot === idx;

          if (!equipped) {
            return (
              <button
                key={idx}
                onClick={() => setSelectedSlot(isSelected ? null : idx)}
                className={`flex-1 h-8 rounded border-2 border-dashed flex items-center justify-center transition-all cursor-pointer ${
                  isSelected ? 'border-white ring-2 ring-white/50 bg-gray-800' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <span className="text-gray-600 text-xs">Slot {idx + 1}</span>
              </button>
            );
          }

          const def = getUnifiedSkillDef(equipped.skillId);
          if (!def) return null;

          return (
            <button
              key={idx}
              onClick={() => setSelectedSlot(isSelected ? null : idx)}
              className={`flex-1 h-8 rounded border flex items-center gap-1 px-1 transition-all cursor-pointer ${
                isSelected
                  ? 'border-white ring-2 ring-white/50 bg-gray-800'
                  : 'border-yellow-700 bg-yellow-950/30 hover:border-yellow-500'
              }`}
            >
              <span className="text-sm">{def.icon}</span>
              <span className="text-xs text-yellow-300 truncate">{def.name}</span>
            </button>
          );
        })}
      </div>

      {/* Unequip button for selected occupied slot */}
      {selectedSlot !== null && skillBar[selectedSlot] && (
        <button
          onClick={() => {
            unequipSkillBarSlot(selectedSlot);
            setSelectedSlot(null);
          }}
          className="text-xs px-3 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded"
        >
          Unequip from Slot {selectedSlot + 1}
        </button>
      )}

      {/* Section 2: Kind Filter Tabs */}
      <div className="flex gap-1 flex-wrap">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setKindFilter(opt.value)}
            className={`text-xs px-2 py-1 rounded-full transition-all ${
              kindFilter === opt.value
                ? 'bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Section 3: Available Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredSkills.map(skill => {
          const isEquipped = equippedSkillIds.has(skill.id);
          const isLocked = character.level < skill.levelRequired;
          const isExpanded = expandedSkill === skill.id;

          // For active skills, show DPS comparison
          const isActive = skill.kind === 'active';
          const dps = isActive ? calcSkillDps(skill, stats, avgDamage, spellPower) : 0;
          const delta = isActive && equippedDps > 0 ? ((dps - equippedDps) / equippedDps) * 100 : 0;

          return (
            <div
              key={skill.id}
              className={`rounded-lg border p-2 transition-all ${
                isEquipped
                  ? 'border-yellow-600 bg-yellow-950/20'
                  : isLocked
                    ? 'border-gray-700 bg-gray-900/30 opacity-50'
                    : 'border-gray-700 bg-gray-900/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{isLocked ? '\uD83D\uDD12' : skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-bold ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                      {skill.name}
                    </span>
                    <span className={`text-xs px-1 rounded ${KIND_BADGE_COLORS[skill.kind] ?? 'bg-gray-700 text-gray-300'}`}>
                      {skill.kind}
                    </span>
                    {isLocked && (
                      <span className="text-xs text-gray-500">Lv.{skill.levelRequired}</span>
                    )}
                    {skill.duration != null && skill.duration > 0 && (
                      <span className="text-xs text-gray-500">{skill.duration}s{skill.cooldown > 0 ? ` / ${skill.cooldown}s CD` : ''}</span>
                    )}
                    {isActive && skill.cooldown > 0 && (
                      <span className="text-xs text-gray-500">{skill.castTime}s cast / {skill.cooldown}s CD</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{skill.description}</div>
                  {/* Tags for active skills */}
                  {isActive && skill.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {skill.tags.map(tag => (
                        <span key={tag} className={`text-xs px-1 py-0.5 rounded ${TAG_COLORS[tag] ?? 'bg-gray-700 text-gray-400'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {/* DPS for active skills */}
                  {isActive && (
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isLocked ? 'text-gray-600' : 'text-white'}`}>
                        {formatDps(dps)}
                      </div>
                      {!isEquipped && !isLocked && equippedDps > 0 && (
                        <div className={`text-xs font-semibold ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  )}
                  {/* Equip / manage buttons */}
                  {!isLocked && (
                    <div className="flex gap-1">
                      {isEquipped ? (
                        <>
                          {(skill.skillGraph || (skill.kind !== 'active' && skill.skillTree)) && (
                            <button
                              onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                              className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                            >
                              {isExpanded ? 'Close' : 'Tree'}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleEquip(skill.id)}
                          className="text-xs px-2 py-0.5 bg-green-900 hover:bg-green-800 text-green-300 rounded"
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* XP bar for equipped skills */}
              {isEquipped && (() => {
                const progress = skillProgress[skill.id];
                if (!progress) return null;
                return (
                  <div className="mt-1.5 ml-8">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-purple-400 font-semibold">Lv.{progress.level}{progress.level >= SKILL_MAX_LEVEL ? ' MAX' : ''}</span>
                      <span className="text-gray-500">
                        {progress.level < SKILL_MAX_LEVEL ? `${progress.xp}/${getAbilityXpForLevel(progress.level)} XP` : 'Max Level'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress.level >= SKILL_MAX_LEVEL ? 100 : (progress.xp / getAbilityXpForLevel(progress.level)) * 100}%` }}
                      />
                    </div>
                    {(skill.skillGraph || (skill.kind !== 'active' && skill.skillTree)) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Points: {progress.level - progress.allocatedNodes.length} available / {progress.level} total
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Skill Graph Tree — expanded view (new graph system) */}
              {isEquipped && isExpanded && skill.skillGraph && (
                <SkillGraphView
                  skill={skill}
                  progress={skillProgress[skill.id]}
                  gold={gold}
                  onAllocate={(nodeId) => {
                    allocateAbilityNode(skill.id, nodeId);
                  }}
                  onRespec={() => {
                    respecAbility(skill.id);
                  }}
                />
              )}

              {/* Old Skill Tree — expanded view (non-graph skills) */}
              {isEquipped && isExpanded && !skill.skillGraph && skill.skillTree && (
                <SkillTreeView
                  skill={skill}
                  progress={skillProgress[skill.id]}
                  gold={gold}
                  onAllocate={(nodeId) => {
                    const oldId = REVERSE_MIGRATION[skill.id] ?? skill.id;
                    allocateAbilityNode(oldId, nodeId);
                  }}
                  onRespec={() => {
                    const oldId = REVERSE_MIGRATION[skill.id] ?? skill.id;
                    respecAbility(oldId);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillTreeView({ skill, progress, gold, onAllocate, onRespec }: {
  skill: SkillDef;
  progress: SkillProgress | undefined;
  gold: number;
  onAllocate: (nodeId: string) => void;
  onRespec: () => void;
}) {
  const [selectedPath, setSelectedPath] = useState<'A' | 'B' | 'C'>('A');

  if (!skill.skillTree || !progress) return null;

  // Convert SkillProgress → AbilityProgress for reuse of engine functions
  const abilityProgress: AbilityProgress = {
    abilityId: progress.skillId,
    xp: progress.xp,
    level: progress.level,
    allocatedNodes: progress.allocatedNodes,
  };

  const respecCost = getRespecCost(abilityProgress);
  const availablePoints = progress.level - progress.allocatedNodes.length;

  // Get the old ability def for canAllocateNode
  const oldId = REVERSE_MIGRATION[skill.id] ?? skill.id;
  const abilityDef = getAbilityDef(oldId);

  const currentPath = skill.skillTree.paths.find(p => p.id === selectedPath)!;

  return (
    <div className="mt-2 ml-8 space-y-2">
      {/* Path Tabs */}
      <div className="flex gap-1">
        {skill.skillTree.paths.map((path) => {
          const allocatedInPath = path.nodes.filter(n => progress.allocatedNodes.includes(n.id)).length;
          return (
            <button
              key={path.id}
              onClick={() => setSelectedPath(path.id)}
              className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition-all ${
                selectedPath === path.id
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {path.name} {allocatedInPath > 0 && <span className="text-purple-300">({allocatedInPath})</span>}
            </button>
          );
        })}
      </div>

      {/* Path Description */}
      <div className="text-xs text-gray-500">{currentPath.description}</div>

      {/* Nodes */}
      <div className="space-y-1">
        {currentPath.nodes.map((node) => {
          const isAllocated = progress.allocatedNodes.includes(node.id);
          const canAlloc = abilityDef ? !isAllocated && canAllocateNode(abilityDef, abilityProgress, node.id) : false;

          const effectParts: string[] = [];
          if (node.durationBonus) effectParts.push(`+${node.durationBonus}s duration`);
          if (node.cooldownReduction) effectParts.push(`-${node.cooldownReduction}% CD`);
          const eff = node.effect;
          if (eff.damageMult && eff.damageMult !== 1) effectParts.push(`${eff.damageMult > 1 ? '+' : ''}${Math.round((eff.damageMult - 1) * 100)}% damage`);
          if (eff.attackSpeedMult && eff.attackSpeedMult !== 1) effectParts.push(`${eff.attackSpeedMult > 1 ? '+' : ''}${Math.round((eff.attackSpeedMult - 1) * 100)}% attack speed`);
          if (eff.defenseMult && eff.defenseMult !== 1) effectParts.push(`${Math.round((eff.defenseMult - 1) * 100)}% defense`);
          if (eff.clearSpeedMult && eff.clearSpeedMult !== 1) effectParts.push(`${Math.round((eff.clearSpeedMult - 1) * 100)}% clear speed`);
          if (eff.critChanceBonus) effectParts.push(`+${eff.critChanceBonus}% crit`);
          if (eff.critMultiplierBonus) effectParts.push(`+${eff.critMultiplierBonus}% crit dmg`);
          if (eff.xpMult && eff.xpMult !== 1) effectParts.push(`+${Math.round((eff.xpMult - 1) * 100)}% XP`);
          if (eff.itemDropMult && eff.itemDropMult !== 1) effectParts.push(`+${Math.round((eff.itemDropMult - 1) * 100)}% items`);
          if (eff.materialDropMult && eff.materialDropMult !== 1) effectParts.push(`+${Math.round((eff.materialDropMult - 1) * 100)}% materials`);
          if (eff.resistBonus) effectParts.push(`+${eff.resistBonus} resist`);
          if (eff.ignoreHazards) effectParts.push('Ignore hazards');
          if (eff.doubleClears !== undefined) effectParts.push(eff.doubleClears ? 'Double clears' : 'No double clears');

          return (
            <button
              key={node.id}
              onClick={() => canAlloc && onAllocate(node.id)}
              disabled={!canAlloc && !isAllocated}
              className={`w-full text-left rounded-lg border p-2 transition-all ${
                isAllocated
                  ? 'border-purple-500 bg-purple-950/50'
                  : canAlloc
                    ? 'border-green-600 bg-green-950/30 hover:bg-green-950/50 cursor-pointer'
                    : 'border-gray-700 bg-gray-900/30 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isAllocated ? 'bg-purple-600 text-white' : canAlloc ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-500'
                }`}>
                  {isAllocated ? '\u2713' : node.tier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isAllocated ? 'text-purple-300' : 'text-white'}`}>{node.name}</span>
                    {node.isPathPayoff && <span className="text-xs text-yellow-500 font-bold">PAYOFF</span>}
                  </div>
                  <div className="text-xs text-gray-400">{node.description}</div>
                  {effectParts.length > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">{effectParts.join(', ')}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Available points + Respec */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700">
        <span className="text-xs text-gray-400">
          Available: <span className="text-white font-bold">{availablePoints}</span> pts
        </span>
        {progress.level > 0 && (
          <button
            onClick={onRespec}
            disabled={gold < respecCost || progress.allocatedNodes.length === 0}
            className={`text-xs px-2 py-1 rounded ${
              gold >= respecCost && progress.allocatedNodes.length > 0
                ? 'bg-red-900 hover:bg-red-800 text-red-300'
                : 'bg-gray-700 text-gray-600 cursor-not-allowed'
            }`}
            title={`Reset tree + XP. Cost: ${respecCost} gold`}
          >
            Respec ({respecCost}g)
          </button>
        )}
      </div>
    </div>
  );
}

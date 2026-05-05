import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSkillStore } from '../../store/skillStore';
import { getUnifiedSkillsForWeapon, getUnifiedSkillDef } from '../../data/skills';
import { calcSkillDps, getAbilityXpForLevel, getUnlockedSlotCount } from '../../engine/unifiedSkills';
import { SKILL_MAX_LEVEL } from '../../data/balance';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { getEquippedWeaponType } from '../../engine/items';
import { ABILITY_SLOT_UNLOCKS } from '../../types';
import type { SkillKind } from '../../types';
import { getEffectiveSkillDef } from '../../engine/classAdjustment';
// 2026-05-04 archive sweep: SkillGraphView + TalentTreeView retired.
// Per-skill talent graphs are no longer rendered; class trees in
// `src/data/classTrees/` (rendered by ClassTalentPanel) are the new
// authoring layer.

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

type KindFilter = 'all' | SkillKind;

export default function SkillPanel() {
  const character = useGameStore(s => s.character);
  const skillBar = useGameStore(s => s.skillBar);
  const skillProgress = useGameStore(s => s.skillProgress);
  const equipToSkillBar = useSkillStore(s => s.equipToSkillBar);
  const unequipSkillBarSlot = useSkillStore(s => s.unequipSkillBarSlot);

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const weaponType = getEquippedWeaponType(character.equipment);

  if (!weaponType) {
    return (
      <div className="text-xs text-gray-500">Equip a weapon to use skills</div>
    );
  }

  const stats = resolveStats(character);
  const { avgDamage, spellPower, weaponConversion } = getWeaponDamageInfo(character.equipment);
  const allSkills = getUnifiedSkillsForWeapon(weaponType);
  const unlockedSlots = getUnlockedSlotCount(character.level);

  // Find equipped active skill's DPS for comparison
  const equippedActiveSkill = skillBar.find(s => {
    if (!s) return false;
    const def = getUnifiedSkillDef(s.skillId);
    return def?.kind === 'active';
  });
  const equippedActiveDef = equippedActiveSkill ? getUnifiedSkillDef(equippedActiveSkill.skillId) : null;
  const equippedMorphedDef = equippedActiveDef ? getEffectiveSkillDef(equippedActiveDef, character.class) : null;
  const equippedDps = equippedMorphedDef ? calcSkillDps(equippedMorphedDef, stats, avgDamage, spellPower, undefined, 1.0, weaponConversion) : 0;

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
    <div className="panel-stone p-3 space-y-3">
      {/* Section 1: Equipped Skill Bar (compact overview) */}
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
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

          // For active skills, show DPS comparison. Resolve class morph so
          // name/description/tags/castTime reflect what the player sees in combat.
          const displayedSkill = getEffectiveSkillDef(skill, character.class);
          const isActive = skill.kind === 'active';
          const dps = isActive ? calcSkillDps(displayedSkill, stats, avgDamage, spellPower, undefined, 1.0, weaponConversion) : 0;
          const delta = isActive && equippedDps > 0 ? ((dps - equippedDps) / equippedDps) * 100 : 0;

          return (
            <div
              key={skill.id}
              className={`rounded-lg border p-2 transition-all overflow-hidden ${
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
                    <span className={`text-xs font-bold truncate ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                      {displayedSkill.name}
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
                      <span className="text-xs text-gray-500">{skill.cooldown}s CD</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{displayedSkill.description}</div>
                  {/* Tags for active skills */}
                  {isActive && displayedSkill.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {displayedSkill.tags.map(tag => (
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
                  {/* Equip button (per-skill talent UI archived 2026-05-04) */}
                  {!isLocked && !isEquipped && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEquip(skill.id)}
                        className="text-xs px-2 py-0.5 bg-green-900 hover:bg-green-800 text-green-300 rounded"
                      >
                        Equip
                      </button>
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
                  </div>
                );
              })()}

              {/* Per-skill talent UI removed 2026-05-04 — class trees handle progression now. */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Inline SkillTreeView function archived 2026-05-04. Original kept at:
//   src/data/_archive/skillGraphs/  (data)
//   git history pre-archive-sweep   (renderer)
// Kept stub to avoid breaking any deep imports during the transition.

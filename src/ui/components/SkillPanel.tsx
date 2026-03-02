import { useGameStore } from '../../store/gameStore';
import { getSkillsForWeapon, getSkillDef } from '../../data/skills';
import { calcSkillDps } from '../../engine/skills';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { getEquippedWeaponType } from '../../engine/items';
import type { ActiveSkillDef } from '../../types';

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

function formatDps(dps: number): string {
  if (dps >= 1000) return `${(dps / 1000).toFixed(1)}k`;
  return dps.toFixed(1);
}

export default function SkillPanel() {
  const character = useGameStore(s => s.character);
  const equippedSkills = useGameStore(s => s.equippedSkills);
  const equipSkill = useGameStore(s => s.equipSkill);

  const weaponType = getEquippedWeaponType(character.equipment);

  if (!weaponType) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300">Active Skill</h3>
        <div className="text-xs text-gray-500 mt-2">Equip a weapon to use skills</div>
      </div>
    );
  }

  const stats = resolveStats(character);
  const { avgDamage, spellPower } = getWeaponDamageInfo(character.equipment);
  const allSkills = getSkillsForWeapon(weaponType);

  const equippedSkillId = equippedSkills[0];
  const equippedDef = equippedSkillId ? getSkillDef(equippedSkillId) : null;
  const equippedDps = equippedDef ? calcSkillDps(equippedDef, stats, avgDamage, spellPower) : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-3">
      {/* Header */}
      <h3 className="text-sm font-bold text-gray-300">Active Skill</h3>

      {/* Currently equipped skill */}
      {equippedDef ? (
        <div className="rounded-lg border-2 border-yellow-600 bg-yellow-950/20 p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{equippedDef.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">{equippedDef.name}</span>
                <span className="text-xs text-yellow-400 font-semibold">Equipped</span>
              </div>
              <div className="text-xs text-gray-400">{equippedDef.description}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-yellow-300">{formatDps(equippedDps)}</div>
              <div className="text-xs text-gray-500">DPS</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {equippedDef.tags.map(tag => (
              <span key={tag} className={`text-xs px-1.5 py-0.5 rounded ${TAG_COLORS[tag] ?? 'bg-gray-700 text-gray-400'}`}>
                {tag}
              </span>
            ))}
          </div>
          <SkillStats skill={equippedDef} />
        </div>
      ) : (
        <div className="text-xs text-gray-500">No skill equipped</div>
      )}

      {/* Available skills */}
      <div className="text-xs text-gray-500 uppercase tracking-wider">Available Skills</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {allSkills.map(skill => {
          const isEquipped = skill.id === equippedSkillId;
          const isLocked = character.level < skill.levelRequired;
          const dps = calcSkillDps(skill, stats, avgDamage, spellPower);
          const delta = equippedDps > 0 ? ((dps - equippedDps) / equippedDps) * 100 : 0;

          return (
            <button
              key={skill.id}
              onClick={() => !isLocked && !isEquipped && equipSkill(skill.id)}
              disabled={isLocked || isEquipped}
              className={`text-left rounded-lg border p-2 transition-all ${
                isEquipped
                  ? 'border-yellow-600 bg-yellow-950/20'
                  : isLocked
                    ? 'border-gray-700 bg-gray-900/30 opacity-50 cursor-not-allowed'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-500 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{isLocked ? '\uD83D\uDD12' : skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                      {skill.name}
                    </span>
                    {isEquipped && (
                      <span className="text-xs text-yellow-400 font-semibold">Equipped</span>
                    )}
                    {isLocked && (
                      <span className="text-xs text-gray-500">Lv.{skill.levelRequired}</span>
                    )}
                  </div>
                </div>
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
              </div>
              {/* Compact tags */}
              <div className="flex flex-wrap gap-1 mt-1">
                {skill.tags.map(tag => (
                  <span key={tag} className={`text-xs px-1 py-0.5 rounded ${TAG_COLORS[tag] ?? 'bg-gray-700 text-gray-400'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkillStats({ skill }: { skill: ActiveSkillDef }) {
  return (
    <div className="flex gap-3 text-xs text-gray-400">
      <span>Cast: {skill.castTime}s</span>
      {skill.cooldown > 0 && <span>CD: {skill.cooldown}s</span>}
      {(skill.hitCount ?? 1) > 1 && <span>Hits: {skill.hitCount}</span>}
      {skill.dotDuration && <span>DoT: {skill.dotDuration}s</span>}
    </div>
  );
}

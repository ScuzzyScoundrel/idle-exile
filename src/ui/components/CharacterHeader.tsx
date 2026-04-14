import { useGameStore } from '../../store/gameStore';
import { CLASS_DEFS } from '../../data/classes';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { calcRotationDps, calcSkillDps, getDefaultSkillForWeapon } from '../../engine/unifiedSkills';
import { getEquippedWeaponType } from '../../engine/items';
import { CharacterClass } from '../../types';
import ClassSilhouette from './ClassSilhouette';

const CLASS_TEXT_COLORS: Record<CharacterClass, string> = {
  warrior: 'text-red-400',
  mage: 'text-blue-400',
  ranger: 'text-green-400',
  rogue: 'text-purple-400',
  witchdoctor: 'text-pink-400',
  assassin: 'text-teal-400',
};

export default function CharacterHeader() {
  const character = useGameStore(s => s.character);
  const skillBar = useGameStore(s => s.skillBar);
  const skillProgress = useGameStore(s => s.skillProgress);

  const stats = resolveStats(character);
  const weaponType = getEquippedWeaponType(character.equipment);
  const { avgDamage, spellPower, weaponConversion } = getWeaponDamageInfo(character.equipment);

  const dps = (() => {
    const rotDps = calcRotationDps(skillBar, skillProgress, stats, avgDamage, spellPower, 1.0, weaponConversion);
    if (rotDps > 0) return rotDps;
    const defaultSkill = weaponType ? getDefaultSkillForWeapon(weaponType, character.level) : null;
    return defaultSkill ? calcSkillDps(defaultSkill, stats, avgDamage, spellPower, undefined, 1.0, weaponConversion) : 0;
  })();

  const formatStat = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.floor(v).toString();

  const keyStats = [
    { label: 'HP', value: formatStat(stats.maxLife), icon: '\u2764\uFE0F' },
    { label: 'DPS', value: formatStat(dps), icon: '\u2694\uFE0F' },
    { label: 'Armor', value: formatStat(stats.armor), icon: '\uD83D\uDEE1\uFE0F' },
    { label: 'Crit', value: `${stats.critChance.toFixed(1)}%`, icon: '\uD83C\uDFAF' },
  ];

  return (
    <div className="panel-leather p-3">
      <div className="flex items-center gap-3">
        {/* Class silhouette in a circle */}
        <div className="w-16 h-16 rounded-full bg-gray-900/80 border-2 border-theme-text-accent/40 flex items-center justify-center overflow-hidden shrink-0">
          <ClassSilhouette characterClass={character.class} className="w-12 h-14" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold text-white heading-fantasy truncate">{character.name}</div>
          <div className="text-sm text-gray-400">
            Level {character.level} <span className={CLASS_TEXT_COLORS[character.class]}>{CLASS_DEFS[character.class]?.name ?? 'Exile'}</span>
          </div>
        </div>
      </div>

      {/* Key stat badges */}
      <div className="flex gap-1.5 mt-2">
        {keyStats.map(s => (
          <div key={s.label} className="flex-1 panel-iron rounded-md px-2 py-1 text-center">
            <div className="text-xs text-gray-500">{s.icon} {s.label}</div>
            <div className="text-sm font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Class resource description */}
      {CLASS_DEFS[character.class] && (
        <div className="mt-2 panel-inset p-2 text-xs text-gray-300">
          <span className={`font-semibold ${CLASS_TEXT_COLORS[character.class]}`}>
            {CLASS_DEFS[character.class].resourceType.replace(/_/g, ' ').toUpperCase()}
          </span>
          <span className="text-gray-500"> &mdash; </span>
          {CLASS_DEFS[character.class].resourceDescription}
        </div>
      )}
    </div>
  );
}

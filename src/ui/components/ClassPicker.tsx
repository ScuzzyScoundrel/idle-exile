import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLASS_DEFS } from '../../data/classes';
import { DEV_WEAPON_KITS, isDevMode } from '../../data/devKits';
import { getRotationPreset } from '../../data/rotationPresets';
import type { CharacterClass, ClassDef, StatKey, WeaponType } from '../../types';

const CLASS_ORDER: CharacterClass[] = ['witchdoctor', 'assassin', 'berserker', 'sorcerer', 'hunter'];

const CLASS_ICONS: Record<CharacterClass, string> = {
  berserker: '\u2694\uFE0F',
  sorcerer: '\u2728',
  hunter: '\uD83C\uDFF9',
  witchdoctor: '\uD83C\uDFAD',
  assassin: '\uD83E\uDD77',
};

const CLASS_COLORS: Record<CharacterClass, { border: string; bg: string; text: string; ring: string }> = {
  berserker: { border: 'border-red-600', bg: 'bg-red-950/40', text: 'text-red-400', ring: 'ring-red-500/50' },
  sorcerer: { border: 'border-blue-600', bg: 'bg-blue-950/40', text: 'text-blue-400', ring: 'ring-blue-500/50' },
  hunter: { border: 'border-green-600', bg: 'bg-green-950/40', text: 'text-green-400', ring: 'ring-green-500/50' },
  witchdoctor: { border: 'border-pink-600', bg: 'bg-pink-950/40', text: 'text-pink-400', ring: 'ring-pink-500/50' },
  assassin: { border: 'border-teal-600', bg: 'bg-teal-950/40', text: 'text-teal-400', ring: 'ring-teal-500/50' },
};

const RESOURCE_COLORS: Record<CharacterClass, string> = {
  berserker: 'text-red-400',
  sorcerer: 'text-blue-400',
  hunter: 'text-green-400',
  witchdoctor: 'text-pink-400',
  assassin: 'text-teal-400',
};

const STAT_LABELS: Partial<Record<StatKey, string>> = {
  incMaxLife: '% Max Life',
  armor: 'Armor',
  spellPower: 'Spell Power',
  castSpeed: 'Cast Speed',
  evasion: 'Evasion',
  movementSpeed: 'Move Speed',
  attackSpeed: 'Attack Speed',
  critChance: 'Crit Chance',
};

function ClassCard({ classDef, isSelected, onSelect }: {
  classDef: ClassDef;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const colors = CLASS_COLORS[classDef.id];
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left rounded-xl border-2 p-4 transition-all
        ${isSelected
          ? `${colors.border} ${colors.bg} ring-2 ${colors.ring} scale-[1.02]`
          : 'border-iron bg-stone-dark/50 hover:border-gray-500 hover:bg-stone-dark'}
      `}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{CLASS_ICONS[classDef.id]}</span>
        <div>
          <div className={`text-lg font-bold ${isSelected ? colors.text : 'text-white'}`}>
            {classDef.name}
          </div>
          <div className="text-xs text-gray-400">{classDef.armorAffinity} affinity</div>
        </div>
      </div>

      <div className="text-xs text-gray-300 mb-2">{classDef.description}</div>

      {/* Base stat bonuses */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Object.entries(classDef.baseStatBonuses).map(([key, val]) => (
          <span key={key} className="bg-gray-900/60 text-gray-300 rounded px-1.5 py-0.5 text-xs">
            +{val} {STAT_LABELS[key as StatKey] ?? key}
          </span>
        ))}
      </div>

      {/* Resource mechanic */}
      <div className={`text-xs ${RESOURCE_COLORS[classDef.id]} bg-gray-900/40 rounded-lg p-2`}>
        <span className="font-semibold">{classDef.resourceType.replace(/_/g, ' ').toUpperCase()}</span>
        <span className="text-gray-400"> &mdash; </span>
        {classDef.resourceDescription}
      </div>
    </button>
  );
}

export default function ClassPicker() {
  const selectClass = useGameStore(s => s.selectClass);
  const devStartKit = useGameStore(s => s.devStartKit);
  const [selected, setSelected] = useState<CharacterClass>('berserker');
  const [devKit, setDevKit] = useState<WeaponType | null>(null);

  const handleConfirm = () => {
    selectClass(selected);
    if (isDevMode() && devKit) {
      devStartKit(devKit);
    }
  };

  const colors = CLASS_COLORS[selected];

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-2xl space-y-5 my-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-400 mb-1">Choose Your Class</h1>
          <p className="text-sm text-gray-400">Each class has a unique resource mechanic that shapes your playstyle.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CLASS_ORDER.map(id => (
            <ClassCard
              key={id}
              classDef={CLASS_DEFS[id]}
              isSelected={selected === id}
              onSelect={() => setSelected(id)}
            />
          ))}
        </div>

        {isDevMode() && (
          <div className="rounded-xl border-2 border-dashed border-amber-700/60 bg-amber-950/20 p-3 space-y-2">
            <div className="text-xs font-semibold text-amber-400">
              DEV — start with a weapon kit (starter weapon + skill bar + rotation preset)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDevKit(null)}
                className={`px-3 py-1.5 rounded-lg border text-xs ${
                  devKit === null
                    ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                    : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                None
              </button>
              {DEV_WEAPON_KITS.map(kit => (
                <button
                  key={kit.weaponType}
                  onClick={() => setDevKit(kit.weaponType)}
                  title={`${kit.skills.length} skills + ${getRotationPreset(kit.presetId)?.name ?? kit.presetId}`}
                  className={`px-3 py-1.5 rounded-lg border text-xs ${
                    devKit === kit.weaponType
                      ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                      : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {kit.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleConfirm}
          className={`
            w-full py-3 rounded-xl text-lg font-bold transition-all
            ${colors.bg} ${colors.border} border-2 text-white
            hover:brightness-125
          `}
        >
          Begin as {CLASS_DEFS[selected].name}
        </button>
      </div>
    </div>
  );
}

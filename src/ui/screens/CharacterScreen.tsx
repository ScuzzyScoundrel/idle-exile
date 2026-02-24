import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { StatKey, GearSlot, Item, ArmorType, Rarity } from '../../types';
import { slotIcon, slotLabel } from '../slotConfig';
import { formatAffix } from '../../engine/items';
import { CLASS_DEFS } from '../../data/classes';
import { calcSetBonuses, calcDefensiveEfficiency } from '../../engine/setBonus';
import { SET_BONUS_DEFS } from '../../data/setBonuses';
import { ZONE_DEFS } from '../../data/zones';

const STAT_TOOLTIPS: Record<StatKey, string> = {
  damage: 'Base damage. Contributes to clear power.',
  attackSpeed: 'Increases attacks per second. Power = damage \u00d7 (1 + atkSpd/100).',
  critChance: '% chance to crit. Power includes (1 + critChance/100 \u00d7 critDmg/100).',
  critDamage: 'Multiplier on critical hits. Scales with Crit Chance.',
  life: 'Health pool. Higher = more survivable.',
  armor: 'Physical damage reduction.',
  dodgeChance: '% chance to avoid attacks entirely.',
  abilityHaste: 'Reduces ability cooldowns (future system).',
  fireResist: 'Reduces fire hazard penalty. Need \u2265 zone threshold for mastery.',
  coldResist: 'Reduces cold hazard penalty. Need \u2265 zone threshold for mastery.',
  lightningResist: 'Reduces lightning hazard penalty. Need \u2265 zone threshold for mastery.',
  poisonResist: 'Reduces poison hazard penalty. Need \u2265 zone threshold for mastery.',
  chaosResist: 'Reduces chaos hazard penalty. Need \u2265 zone threshold for mastery.',
};

const STAT_CONFIG: { key: StatKey; label: string; icon: string; format?: (v: number) => string }[] = [
  { key: 'damage', label: 'Damage', icon: '\u2694\uFE0F' },
  { key: 'attackSpeed', label: 'Attack Speed', icon: '\u26A1', format: (v) => v.toFixed(1) },
  { key: 'critChance', label: 'Crit Chance', icon: '\uD83C\uDFAF', format: (v) => `${v.toFixed(1)}%` },
  { key: 'critDamage', label: 'Crit Damage', icon: '\uD83D\uDCA5', format: (v) => `${v.toFixed(0)}%` },
  { key: 'life', label: 'Life', icon: '\u2764\uFE0F' },
  { key: 'armor', label: 'Armor', icon: '\uD83D\uDEE1\uFE0F' },
  { key: 'dodgeChance', label: 'Dodge', icon: '\uD83D\uDCA8', format: (v) => `${v.toFixed(1)}%` },
  { key: 'abilityHaste', label: 'Ability Haste', icon: '\u23F1\uFE0F', format: (v) => `${v.toFixed(0)}%` },
  { key: 'fireResist', label: 'Fire Resist', icon: '\uD83D\uDD25', format: (v) => `${v.toFixed(0)}%` },
  { key: 'coldResist', label: 'Cold Resist', icon: '\u2744\uFE0F', format: (v) => `${v.toFixed(0)}%` },
  { key: 'lightningResist', label: 'Lightning Resist', icon: '\u26A1', format: (v) => `${v.toFixed(0)}%` },
  { key: 'poisonResist', label: 'Poison Resist', icon: '\uD83D\uDC0D', format: (v) => `${v.toFixed(0)}%` },
  { key: 'chaosResist', label: 'Chaos Resist', icon: '\uD83D\uDC80', format: (v) => `${v.toFixed(0)}%` },
];

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
};

const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-green-950',
  uncommon: 'bg-blue-950',
  rare: 'bg-yellow-950',
  epic: 'bg-purple-950',
  legendary: 'bg-orange-950',
};

const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-orange-400',
  2: 'text-purple-400',
  3: 'text-yellow-400',
  4: 'text-blue-400',
  5: 'text-blue-400',
  6: 'text-blue-300',
  7: 'text-green-400',
  8: 'text-green-300',
  9: 'text-gray-400',
  10: 'text-gray-500',
};

// WoW-style layout: left column, right column, bottom row
const LEFT_SLOTS: GearSlot[] = ['helmet', 'neck', 'shoulders', 'cloak', 'chest', 'bracers'];
const RIGHT_SLOTS: GearSlot[] = ['gloves', 'belt', 'pants', 'boots', 'ring1', 'ring2'];
const BOTTOM_SLOTS: GearSlot[] = ['mainhand', 'offhand', 'trinket1', 'trinket2'];

const ASCII_SILHOUETTE = `    O
   /|\\
  / | \\
    |
   / \\
  /   \\`;

export default function CharacterScreen() {
  const { character, resetGame, unequipSlot, currentZoneId } = useGameStore();
  const [hoveredSlot, setHoveredSlot] = useState<GearSlot | null>(null);
  const hoveredItem = hoveredSlot ? character.equipment[hoveredSlot] ?? null : null;

  return (
    <div className="space-y-4">
      {/* Character Header */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl border-2 border-yellow-600">
            {'\u2694\uFE0F'}
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-white">{character.name}</div>
            <div className="text-sm text-gray-400">Level {character.level} {CLASS_DEFS[character.class]?.name ?? 'Exile'}</div>
            <div className="mt-1">
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>XP</span>
                <span>{character.xp} / {character.xpToNext}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Doll — WoW-style layout with wider gear cards */}
      <div className="bg-gray-800 rounded-lg p-3 overflow-hidden">
        <h3 className="text-sm font-bold text-gray-300 mb-2">Equipment</h3>

        <div className="flex gap-1.5">
          {/* Left column */}
          <div className="flex flex-col gap-1.5 w-36 flex-shrink-0">
            {LEFT_SLOTS.map((slot) => (
              <GearSlotCard
                key={slot}
                slot={slot}
                hoveredSlot={hoveredSlot}
                onHover={setHoveredSlot}
                onUnequip={unequipSlot}
              />
            ))}
          </div>

          {/* Center — ASCII character silhouette */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <div className="w-full h-full min-h-[280px] bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
              <div className="text-center">
                <pre className="font-mono text-gray-600 text-lg leading-tight select-none">{ASCII_SILHOUETTE}</pre>
                <div className="text-xs text-gray-500 mt-2 font-semibold">{character.name}</div>
                <div className="text-[10px] text-gray-600">Lv {character.level} {CLASS_DEFS[character.class]?.name ?? 'Exile'}</div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-1.5 w-36 flex-shrink-0">
            {RIGHT_SLOTS.map((slot) => (
              <GearSlotCard
                key={slot}
                slot={slot}
                hoveredSlot={hoveredSlot}
                onHover={setHoveredSlot}
                onUnequip={unequipSlot}
              />
            ))}
          </div>
        </div>

        {/* Bottom row — weapons + trinkets */}
        <div className="flex gap-1.5 justify-center mt-1.5">
          {BOTTOM_SLOTS.map((slot) => (
            <GearSlotCard
              key={slot}
              slot={slot}
              hoveredSlot={hoveredSlot}
              onHover={setHoveredSlot}
              onUnequip={unequipSlot}
              className="w-36"
            />
          ))}
        </div>
      </div>

      {/* Item Tooltip — shown below paper doll when hovering/tapping */}
      {hoveredItem && (
        <div>
          <ItemTooltip item={hoveredItem} />
          <div className="text-center text-[10px] text-gray-500 mt-1">Tap slot again to unequip</div>
        </div>
      )}
      {hoveredSlot && !hoveredItem && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 text-center text-xs text-gray-500">
          {slotLabel(hoveredSlot)} — Empty
        </div>
      )}

      {/* Stats Grid */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300 mb-2">Stats</h3>
        <div className="grid grid-cols-2 gap-2">
          {STAT_CONFIG.map(({ key, label, icon, format }) => (
            <div key={key} className="flex items-center gap-2" title={STAT_TOOLTIPS[key]}>
              <span className="text-sm">{icon}</span>
              <div className="flex-1">
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-sm font-semibold text-white">
                  {format ? format(character.stats[key]) : Math.floor(character.stats[key])}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Defense & Set Bonuses */}
      <DefensePanel />

      {/* Reset */}
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={() => {
            if (confirm('Reset all progress? This cannot be undone!')) {
              resetGame();
            }
          }}
          className="w-full py-2 bg-red-900 hover:bg-red-800 text-red-300 text-sm rounded-lg"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}

const ARMOR_TYPE_COLORS: Record<ArmorType, string> = {
  plate: 'text-gray-300',
  mail: 'text-green-400',
  leather: 'text-amber-400',
  cloth: 'text-purple-400',
};

const STAT_LABELS: Partial<Record<StatKey, string>> = {
  damage: 'Damage',
  armor: 'Armor',
  life: 'Life',
  attackSpeed: 'Atk Speed',
  critChance: 'Crit Chance',
  critDamage: 'Crit Damage',
  dodgeChance: 'Dodge',
  abilityHaste: 'Ability Haste',
  fireResist: 'Fire Resist',
  coldResist: 'Cold Resist',
  lightningResist: 'Lightning Resist',
  poisonResist: 'Poison Resist',
  chaosResist: 'Chaos Resist',
};

function DefensePanel() {
  const { character, currentZoneId } = useGameStore();
  const currentZone = currentZoneId ? ZONE_DEFS.find(z => z.id === currentZoneId) : null;
  const band = currentZone?.band ?? 1;
  const defEff = calcDefensiveEfficiency(character.stats, band);
  const setBonuses = calcSetBonuses(character.equipment);

  const zonePressure = 50 * Math.pow(2, band - 1);
  const physReduction = Math.round((character.stats.armor / (character.stats.armor + zonePressure)) * 100);

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-3">
      <h3 className="text-sm font-bold text-gray-300">Defense</h3>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">Defensive Efficiency (Band {band})</div>
        <div className={`text-sm font-bold ${defEff >= 0.9 ? 'text-green-400' : defEff >= 0.8 ? 'text-yellow-400' : 'text-red-400'}`}>
          {(defEff * 100).toFixed(1)}%
        </div>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${defEff >= 0.9 ? 'bg-green-500' : defEff >= 0.8 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${((defEff - 0.7) / 0.3) * 100}%` }}
        />
      </div>

      <div className="text-[10px] text-gray-500">
        Armor reduces {physReduction}% physical damage at Band {band}
      </div>

      {setBonuses.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-gray-700">
          <div className="text-xs font-semibold text-gray-400">Set Bonuses</div>
          {setBonuses.map((sb) => {
            const fullDef = SET_BONUS_DEFS[sb.armorType];
            return (
              <div key={sb.armorType} className="space-y-0.5">
                <div className={`text-xs font-bold ${ARMOR_TYPE_COLORS[sb.armorType]}`}>
                  {sb.name} ({sb.count}/6 {sb.armorType})
                </div>
                {([2, 4, 6] as const).map((t) => {
                  const active = sb.count >= t;
                  const thresholdStats = fullDef.thresholds[t];
                  return (
                    <div key={t} className={`text-[10px] ml-2 ${active ? 'text-green-400' : 'text-gray-600'}`}>
                      ({t}pc) {Object.entries(thresholdStats).map(([k, v]) => `+${v} ${STAT_LABELS[k as StatKey] ?? k}`).join(', ')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** WoW-style gear slot card — wider with item name + rarity color. */
function GearSlotCard({
  slot,
  hoveredSlot,
  onHover,
  onUnequip,
  className,
}: {
  slot: GearSlot;
  hoveredSlot: GearSlot | null;
  onHover: (slot: GearSlot | null) => void;
  onUnequip: (slot: GearSlot) => void;
  className?: string;
}) {
  const { character } = useGameStore();
  const item = character.equipment[slot];
  const isShowingTooltip = hoveredSlot === slot;

  const handleClick = () => {
    if (!item) {
      onHover(isShowingTooltip ? null : slot);
      return;
    }
    if (isShowingTooltip) {
      onUnequip(slot);
    } else {
      onHover(slot);
    }
  };

  if (!item) {
    return (
      <div
        className={`
          rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50
          flex items-center gap-2 px-2 py-2 cursor-pointer
          hover:border-gray-500 transition-all
          ${isShowingTooltip ? 'ring-2 ring-yellow-400' : ''}
          ${className ?? 'w-full'}
        `}
        onMouseEnter={() => onHover(slot)}
        onMouseLeave={() => onHover(null)}
        onClick={handleClick}
        title={`${slotLabel(slot)} \u2014 empty`}
      >
        <span className="text-lg opacity-25">{slotIcon(slot)}</span>
        <span className="text-[10px] text-gray-600">{slotLabel(slot)}</span>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-lg border-2 px-2 py-1.5 cursor-pointer transition-all
        flex items-center gap-2 min-w-0
        ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} hover:brightness-125
        ${isShowingTooltip ? 'ring-2 ring-yellow-400' : ''}
        ${className ?? 'w-full'}
      `}
      onMouseEnter={() => onHover(slot)}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
      title={isShowingTooltip ? `Tap to unequip ${item.name}` : `Tap to inspect ${item.name}`}
    >
      <span className="text-base leading-none flex-shrink-0">{slotIcon(slot)}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-semibold truncate ${RARITY_TEXT[item.rarity]}`}>{item.name}</div>
        <div className="text-[9px] text-gray-500">iLvl {item.iLvl} {'\u2022'} {item.rarity}</div>
      </div>
    </div>
  );
}

/** Tooltip showing full item details */
function ItemTooltip({ item }: { item: Item }) {
  return (
    <div className={`rounded-lg border-2 p-3 space-y-1.5 ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{slotIcon(item.slot)}</span>
        <div>
          <div className="font-bold text-white text-sm">{item.name}</div>
          <div className="text-[10px] text-gray-400">
            iLvl {item.iLvl} {'\u2022'} {item.rarity} {'\u2022'} {item.prefixes.length + item.suffixes.length} affixes
          </div>
        </div>
      </div>

      {Object.entries(item.baseStats).length > 0 && (
        <div className="text-xs text-gray-500">
          {Object.entries(item.baseStats).map(([k, v]) => (
            <span key={k} className="mr-2">{v} base {k}</span>
          ))}
        </div>
      )}

      <div className="space-y-0.5">
        {item.prefixes.map((a, i) => (
          <div key={`p-${i}`} className={`text-xs ${TIER_COLORS[a.tier]}`}>
            {formatAffix(a)} <span className="text-gray-600">(T{a.tier} prefix)</span>
          </div>
        ))}
        {item.suffixes.map((a, i) => (
          <div key={`s-${i}`} className={`text-xs ${TIER_COLORS[a.tier]}`}>
            {formatAffix(a)} <span className="text-gray-600">(T{a.tier} suffix)</span>
          </div>
        ))}
        {item.prefixes.length + item.suffixes.length === 0 && (
          <div className="text-xs text-gray-600 italic">No affixes</div>
        )}
      </div>
    </div>
  );
}

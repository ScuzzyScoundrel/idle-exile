import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { StatKey, GearSlot, Item, ArmorType, Rarity, CharacterClass } from '../../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { slotLabel } from '../slotConfig';
import { ItemIcon, SlotIcon } from '../itemIcon';
import { formatAffix, getEquippedWeaponType } from '../../engine/items';
import { formatCorruptionAffix } from '../../data/corruptionAffixes';
import { CLASS_DEFS } from '../../data/classes';
import { calcSetBonuses, calcDefensiveEfficiency } from '../../engine/setBonus';
import SkillPanel from '../components/SkillPanel';
// ClassTalentPanel removed (Skill Tree Overhaul Phase 0)
import { calcSkillDps, calcRotationDps, getDefaultSkillForWeapon } from '../../engine/unifiedSkills';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { SET_BONUS_DEFS } from '../../data/setBonuses';
import { BAND_RESIST_PENALTY } from '../../data/balance';
import { ZONE_DEFS } from '../../data/zones';

const CLASS_ICONS_HERO: Record<CharacterClass, string> = {
  warrior: '\u2694\uFE0F',
  mage: '\u2728',
  ranger: '\uD83C\uDFF9',
  rogue: '\uD83D\uDDE1\uFE0F',
};

const CLASS_TEXT_COLORS: Record<CharacterClass, string> = {
  warrior: 'text-red-400',
  mage: 'text-blue-400',
  ranger: 'text-green-400',
  rogue: 'text-purple-400',
};

const STAT_TOOLTIPS: Partial<Record<StatKey, string>> = {
  // Attack
  flatPhysDamage: 'Flat physical damage added to attacks.',
  flatAtkFireDamage: 'Flat fire damage added to attacks.',
  flatAtkColdDamage: 'Flat cold damage added to attacks.',
  flatAtkLightningDamage: 'Flat lightning damage added to attacks.',
  flatAtkChaosDamage: 'Flat chaos damage added to attacks.',
  attackSpeed: 'Increases attacks per second.',
  accuracy: 'Chance to hit. Higher = fewer misses.',
  incPhysDamage: '% increased physical damage.',
  incAttackDamage: '% increased attack damage.',
  // Spell
  spellPower: 'Base spell power for spell skills.',
  castSpeed: 'Increases casts per second.',
  incSpellDamage: '% increased spell damage.',
  // Shared Offensive
  incElementalDamage: '% increased elemental damage.',
  critChance: '% chance to critically strike.',
  critMultiplier: 'Multiplier on critical hits.',
  abilityHaste: 'Reduces all skill cooldowns. Diminishing returns: CDR% = haste / (100 + haste).',
  // Defensive
  maxLife: 'Maximum health pool.',
  incMaxLife: '% increased maximum life.',
  lifeRegen: 'Life regenerated per second.',
  armor: 'Physical damage reduction.',
  armorToElemental: '% of armor applied to elemental damage mitigation (plate exclusive).',
  evasion: 'Chance to evade attacks.',
  blockChance: 'Chance to block with shield.',
  fireResist: 'Reduces fire damage from mobs (cap 75%).',
  coldResist: 'Reduces cold damage from mobs (cap 75%).',
  lightningResist: 'Reduces lightning damage from mobs (cap 75%).',
  chaosResist: 'Reduces chaos damage from mobs (cap 75%).',
  // Utility
  movementSpeed: 'Increases movement speed.',
  itemQuantity: '% increased item quantity from drops.',
  itemRarity: '% increased item rarity from drops.',
};

interface StatSection {
  label: string;
  stats: { key: StatKey; label: string; icon: string; format?: (v: number) => string }[];
}

const STAT_SECTIONS: StatSection[] = [
  {
    label: 'Attack',
    stats: [
      { key: 'flatPhysDamage', label: 'Phys Damage', icon: '\u2694\uFE0F' },
      { key: 'flatAtkFireDamage', label: 'Fire Atk', icon: '\uD83D\uDD25' },
      { key: 'flatAtkColdDamage', label: 'Cold Atk', icon: '\u2744\uFE0F' },
      { key: 'flatAtkLightningDamage', label: 'Lightning Atk', icon: '\u26A1' },
      { key: 'flatAtkChaosDamage', label: 'Chaos Atk', icon: '\uD83D\uDC80' },
      { key: 'attackSpeed', label: 'Attack Speed', icon: '\u26A1', format: (v) => v.toFixed(1) },
      { key: 'accuracy', label: 'Accuracy', icon: '\uD83C\uDFAF' },
      { key: 'incPhysDamage', label: '% Phys Damage', icon: '\u2694\uFE0F', format: (v) => `${v.toFixed(0)}%` },
      { key: 'incAttackDamage', label: '% Attack Damage', icon: '\u2694\uFE0F', format: (v) => `${v.toFixed(0)}%` },
    ],
  },
  {
    label: 'Spell',
    stats: [
      { key: 'spellPower', label: 'Spell Power', icon: '\u2728' },
      { key: 'castSpeed', label: 'Cast Speed', icon: '\u2728', format: (v) => v.toFixed(1) },
      { key: 'incSpellDamage', label: '% Spell Damage', icon: '\u2728', format: (v) => `${v.toFixed(0)}%` },
    ],
  },
  {
    label: 'Critical',
    stats: [
      { key: 'critChance', label: 'Crit Chance', icon: '\uD83C\uDFAF', format: (v) => `${v.toFixed(1)}%` },
      { key: 'critMultiplier', label: 'Crit Multiplier', icon: '\uD83D\uDCA5', format: (v) => `${v.toFixed(0)}%` },
    ],
  },
  {
    label: 'Defense',
    stats: [
      { key: 'maxLife', label: 'Max Life', icon: '\u2764\uFE0F' },
      { key: 'incMaxLife', label: '% Max Life', icon: '\u2764\uFE0F', format: (v) => `${v.toFixed(0)}%` },
      { key: 'lifeRegen', label: 'Life Regen', icon: '\u2764\uFE0F', format: (v) => v.toFixed(1) },
      { key: 'armor', label: 'Armor', icon: '\uD83D\uDEE1\uFE0F' },
      { key: 'armorToElemental', label: 'Armor→Ele', icon: '\uD83D\uDEE1\uFE0F', format: (v) => `${v.toFixed(0)}%` },
      { key: 'evasion', label: 'Evasion', icon: '\uD83D\uDCA8' },
      { key: 'blockChance', label: 'Block', icon: '\uD83D\uDEE1\uFE0F', format: (v) => `${v.toFixed(1)}%` },
    ],
  },
  {
    label: 'Resistances',
    stats: [
      { key: 'fireResist', label: 'Fire Resist', icon: '\uD83D\uDD25', format: (v) => `${v.toFixed(0)}%` },
      { key: 'coldResist', label: 'Cold Resist', icon: '\u2744\uFE0F', format: (v) => `${v.toFixed(0)}%` },
      { key: 'lightningResist', label: 'Lightning Resist', icon: '\u26A1', format: (v) => `${v.toFixed(0)}%` },
      { key: 'chaosResist', label: 'Chaos Resist', icon: '\uD83D\uDC80', format: (v) => `${v.toFixed(0)}%` },
    ],
  },
  {
    label: 'Utility',
    stats: [
      { key: 'abilityHaste', label: 'Ability Haste', icon: '\u23F1\uFE0F', format: (v) => {
        const cdr = v / (100 + v) * 100;
        return v > 0 ? `${v.toFixed(0)} (${cdr.toFixed(1)}% CDR)` : '0';
      }},
      { key: 'movementSpeed', label: 'Move Speed', icon: '\uD83D\uDC5F', format: (v) => `${v.toFixed(0)}%` },
      { key: 'itemQuantity', label: 'Item Quantity', icon: '\uD83D\uDCE6', format: (v) => `${v.toFixed(0)}%` },
      { key: 'itemRarity', label: 'Item Rarity', icon: '\u2B50', format: (v) => `${v.toFixed(0)}%` },
    ],
  },
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
  const { character, resetGame, unequipSlot } = useGameStore();
  const skillBar = useGameStore(s => s.skillBar);
  const skillProgress = useGameStore(s => s.skillProgress);
  const isMobile = useIsMobile();
  const [hoveredSlot, setHoveredSlot] = useState<GearSlot | null>(null);
  const hoveredItem = hoveredSlot ? character.equipment[hoveredSlot] ?? null : null;

  // Compute rotation DPS across all equipped active skills
  const weaponType = getEquippedWeaponType(character.equipment);
  const skillDps = (() => {
    const stats = resolveStats(character);
    const { avgDamage, spellPower, weaponConversion } = getWeaponDamageInfo(character.equipment);
    // Try full rotation DPS first
    const rotDps = calcRotationDps(skillBar, skillProgress, stats, avgDamage, spellPower, 1.0, weaponConversion);
    if (rotDps > 0) return rotDps;
    // Fallback to default weapon skill
    const defaultSkill = weaponType ? getDefaultSkillForWeapon(weaponType, character.level) : null;
    return defaultSkill ? calcSkillDps(defaultSkill, stats, avgDamage, spellPower, undefined, 1.0, weaponConversion) : 0;
  })();

  return (
    <div className="max-w-4xl xl:max-w-7xl mx-auto space-y-4">
      {/* Character Header */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl border-2 border-yellow-600">
            {CLASS_ICONS_HERO[character.class] ?? '\u2694\uFE0F'}
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

        {/* Class resource mechanic description */}
        {CLASS_DEFS[character.class] && (
          <div className="mt-2 bg-gray-900/50 rounded-lg p-2 text-xs text-gray-300">
            <span className={`font-semibold ${CLASS_TEXT_COLORS[character.class] ?? 'text-gray-400'}`}>
              {CLASS_DEFS[character.class].resourceType.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className="text-gray-500"> &mdash; </span>
            {CLASS_DEFS[character.class].resourceDescription}
          </div>
        )}
      </div>

      {/* Class Talent Tree removed (Skill Tree Overhaul Phase 0) */}

      {/* Paper Doll — icon grid layout */}
      <div className="bg-gray-800 rounded-lg p-3 overflow-hidden">
        <h3 className="text-sm font-bold text-gray-300 mb-2">Equipment</h3>

        <div className="flex gap-1.5">
          {/* Left column */}
          <div className="flex flex-col gap-1.5 w-16 flex-shrink-0">
            {LEFT_SLOTS.map((slot) => (
              <GearSlotCard
                key={slot}
                slot={slot}
                hoveredSlot={hoveredSlot}
                onHover={setHoveredSlot}
                onUnequip={unequipSlot}
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* Center — ASCII character silhouette */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <div className="w-full h-full bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
              <div className="text-center">
                <pre className="font-mono text-gray-600 text-lg leading-tight select-none">{ASCII_SILHOUETTE}</pre>
                <div className="text-xs text-gray-500 mt-2 font-semibold">{character.name}</div>
                <div className="text-xs text-gray-600">Lv {character.level} {CLASS_DEFS[character.class]?.name ?? 'Exile'}</div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-1.5 w-16 flex-shrink-0">
            {RIGHT_SLOTS.map((slot) => (
              <GearSlotCard
                key={slot}
                slot={slot}
                hoveredSlot={hoveredSlot}
                onHover={setHoveredSlot}
                onUnequip={unequipSlot}
                isMobile={isMobile}
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
              className="w-16"
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      {/* Item Tooltip — shown below paper doll when hovering/tapping */}
      {hoveredItem && hoveredSlot && (
        <div>
          <ItemTooltip item={hoveredItem} />
          <button
            onClick={() => {
              unequipSlot(hoveredSlot);
              setHoveredSlot(null);
            }}
            className="w-full mt-1 py-2 bg-yellow-700 hover:bg-yellow-600 text-white text-sm rounded-lg font-semibold"
          >
            Unequip {hoveredItem.name}
          </button>
        </div>
      )}
      {hoveredSlot && !hoveredItem && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 text-center text-xs text-gray-500">
          {slotLabel(hoveredSlot)} — Empty
        </div>
      )}

      {/* Stats Grid */}
      <div className="bg-gray-800 rounded-lg p-3 space-y-3">
        <h3 className="text-sm font-bold text-gray-300">Stats</h3>
        {/* Skill DPS summary */}
        {skillDps > 0 && (
          <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
            <span className="text-sm">{'\u2694\uFE0F'}</span>
            <div className="flex-1">
              <div className="text-xs text-gray-400">Rotation DPS</div>
              <div className="text-sm font-bold text-yellow-300">
                {skillDps >= 1000 ? `${(skillDps / 1000).toFixed(1)}k` : skillDps.toFixed(1)}
              </div>
            </div>
          </div>
        )}
        {STAT_SECTIONS.map((section) => {
          const visibleStats = section.stats.filter(({ key }) => character.stats[key] > 0);
          if (visibleStats.length === 0) return null;
          return (
            <div key={section.label}>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{section.label}</div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                {visibleStats.map(({ key, label, icon, format }) => (
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
          );
        })}
      </div>

      {/* Skill Panel (handles both active skills + abilities) */}
      <SkillPanel />

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
  leather: 'text-amber-400',
  cloth: 'text-purple-400',
};

const STAT_LABELS: Partial<Record<StatKey, string>> = {
  flatPhysDamage: 'Phys Damage',
  flatAtkFireDamage: 'Fire Atk',
  flatAtkColdDamage: 'Cold Atk',
  flatAtkLightningDamage: 'Lightning Atk',
  flatAtkChaosDamage: 'Chaos Atk',
  attackSpeed: 'Atk Speed',
  accuracy: 'Accuracy',
  incPhysDamage: '% Phys Damage',
  incAttackDamage: '% Attack Damage',
  spellPower: 'Spell Power',
  flatSpellFireDamage: 'Fire Spell',
  flatSpellColdDamage: 'Cold Spell',
  flatSpellLightningDamage: 'Lightning Spell',
  flatSpellChaosDamage: 'Chaos Spell',
  castSpeed: 'Cast Speed',
  incSpellDamage: '% Spell Damage',
  incElementalDamage: '% Elemental',
  incFireDamage: '% Fire',
  incColdDamage: '% Cold',
  incLightningDamage: '% Lightning',
  incChaosDamage: '% Chaos',
  baseAttackSpeed: 'Base Atk Speed',
  incAttackSpeed: '% Atk Speed',
  baseCritChance: 'Base Crit',
  incCritChance: '% Crit Chance',
  firePenetration: 'Fire Pen',
  coldPenetration: 'Cold Pen',
  lightningPenetration: 'Lightning Pen',
  chaosPenetration: 'Chaos Pen',
  dotMultiplier: 'DoT Multi',
  weaponMastery: 'Weapon Mastery',
  critChance: 'Crit Chance',
  critMultiplier: 'Crit Multi',
  abilityHaste: 'Ability Haste',
  maxLife: 'Max Life',
  incMaxLife: '% Max Life',
  lifeRegen: 'Life Regen',
  armor: 'Armor',
  armorToElemental: 'Armor→Ele',
  incArmor: '% Armor',
  evasion: 'Evasion',
  incEvasion: '% Evasion',
  blockChance: 'Block',
  fireResist: 'Fire Resist',
  coldResist: 'Cold Resist',
  lightningResist: 'Lightning Resist',
  chaosResist: 'Chaos Resist',
  movementSpeed: 'Move Speed',
  itemQuantity: 'Item Quantity',
  itemRarity: 'Item Rarity',
};

function DefensePanel() {
  const { character, currentZoneId } = useGameStore();
  const currentZone = currentZoneId ? ZONE_DEFS.find(z => z.id === currentZoneId) : null;
  const band = currentZone?.band ?? 1;
  const defEff = calcDefensiveEfficiency(character.stats, band, currentZone?.iLvlMin);
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

      <div className="text-xs text-gray-500">
        Armor reduces {physReduction}% physical damage at Band {band}
      </div>

      {/* Band resist penalty + effective resists */}
      {(() => {
        const penalty = BAND_RESIST_PENALTY[band] ?? 0;
        const resists = [
          { label: 'Fire', icon: '\uD83D\uDD25', raw: character.stats.fireResist, color: 'text-red-400' },
          { label: 'Cold', icon: '\u2744\uFE0F', raw: character.stats.coldResist, color: 'text-blue-400' },
          { label: 'Lightning', icon: '\u26A1', raw: character.stats.lightningResist, color: 'text-yellow-400' },
          { label: 'Chaos', icon: '\uD83D\uDC80', raw: character.stats.chaosResist, color: 'text-purple-400' },
        ];
        return (
          <div className="space-y-1">
            {penalty < 0 && (
              <div className="text-xs text-red-400">
                Band {band} resist penalty: {penalty}%
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {resists.map(r => {
                const effective = Math.min(Math.max(0, r.raw + penalty), 75);
                return (
                  <div key={r.label} className="flex items-center gap-1 text-xs">
                    <span>{r.icon}</span>
                    <span className={r.color}>{r.label}</span>
                    <span className="text-gray-500 ml-auto">
                      {Math.floor(r.raw)}{penalty < 0 ? <span className="text-red-400">{penalty}</span> : ''}
                      {' = '}
                      <span className={effective >= 50 ? 'text-green-400' : effective >= 25 ? 'text-yellow-400' : 'text-red-400'}>
                        {effective}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                    <div key={t} className={`text-xs ml-2 ${active ? 'text-green-400' : 'text-gray-600'}`}>
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
  isMobile,
}: {
  slot: GearSlot;
  hoveredSlot: GearSlot | null;
  onHover: (slot: GearSlot | null) => void;
  onUnequip: (slot: GearSlot) => void;
  className?: string;
  isMobile: boolean;
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
      // On mobile, unequip is handled by explicit button below tooltip
      if (isMobile) {
        onHover(null);
      } else {
        onUnequip(slot);
      }
    } else {
      onHover(slot);
    }
  };

  if (!item) {
    return (
      <div
        className={`
          aspect-square rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50
          flex items-center justify-center cursor-pointer
          hover:border-gray-500 transition-all
          ${isShowingTooltip ? 'ring-2 ring-yellow-400' : ''}
          ${className ?? 'w-full'}
        `}
        onMouseEnter={isMobile ? undefined : () => onHover(slot)}
        onMouseLeave={isMobile ? undefined : () => onHover(null)}
        onClick={handleClick}
        title={`${slotLabel(slot)} \u2014 empty`}
      >
        <SlotIcon slot={slot} size="md" className="opacity-25" />
      </div>
    );
  }

  return (
    <div
      className={`
        aspect-square rounded-lg border-2 cursor-pointer transition-all
        flex items-center justify-center min-w-0
        ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} hover:brightness-125
        ${item.isCorrupted ? 'ring-1 ring-fuchsia-500/40' : ''}
        ${isShowingTooltip ? 'ring-2 ring-yellow-400' : ''}
        ${className ?? 'w-full'}
      `}
      onMouseEnter={isMobile ? undefined : () => onHover(slot)}
      onMouseLeave={isMobile ? undefined : () => onHover(null)}
      onClick={handleClick}
      title={isShowingTooltip ? `Tap to unequip ${item.name}` : `Tap to inspect ${item.name}`}
    >
      <ItemIcon item={item} size="lg" />
    </div>
  );
}

/** Tooltip showing full item details */
function ItemTooltip({ item }: { item: Item }) {
  return (
    <div className={`rounded-lg border-2 p-3 space-y-1.5 ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} ${item.isCorrupted ? 'bg-gradient-to-br from-transparent to-fuchsia-950/60 ring-1 ring-fuchsia-500/40' : ''}`}>
      <div className="text-center">
        <div className="font-bold text-white text-sm flex items-center justify-center gap-1.5">
          <span className={item.isCorrupted ? 'text-fuchsia-300' : ''}>{item.name}</span>
          {item.isCorrupted && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-fuchsia-800 text-fuchsia-200 font-bold shrink-0">VOID</span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          iLvl {item.iLvl} {'\u2022'} {item.rarity} {'\u2022'} {item.prefixes.length + item.suffixes.length} affixes
        </div>
      </div>
      <div className="flex justify-center">
        <ItemIcon item={item} size="lg" className="!w-20 !h-20" />
      </div>

      {Object.entries(item.baseStats).length > 0 && (
        <div className="text-xs text-gray-500">
          {Object.entries(item.baseStats).map(([k, v]) => (
            <span key={k} className="mr-2">{v} base {k}</span>
          ))}
        </div>
      )}

      {item.implicit && (
        <div className="text-xs text-fuchsia-400 border-t border-fuchsia-800 pt-1 pb-0.5">
          {formatCorruptionAffix(item.implicit)}
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

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { StatKey, GearSlot, Item, ArmorType, Rarity, WeaponType, CharacterClass } from '../../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { slotLabel } from '../slotConfig';
import { ItemIcon, SlotIcon } from '../itemIcon';
import { formatAffix, getEquippedWeaponType } from '../../engine/items';
import { CLASS_DEFS } from '../../data/classes';
import { calcSetBonuses, calcDefensiveEfficiency } from '../../engine/setBonus';
import SkillPanel from '../components/SkillPanel';
import { calcSkillDps } from '../../engine/skills';
import { resolveStats, getWeaponDamageInfo } from '../../engine/character';
import { getSkillDef } from '../../data/skills';
import { getDefaultSkillForWeapon } from '../../engine/skills';
import { SET_BONUS_DEFS } from '../../data/setBonuses';
import { ZONE_DEFS } from '../../data/zones';
import { getAbilitiesForWeapon, getAbilityDef } from '../../data/abilities';
import { getUnlockedSlotCount, getAbilityXpForLevel, canAllocateNode, getRespecCost } from '../../engine/abilities';
import { ABILITY_SLOT_UNLOCKS, AbilityProgress, AbilityDef } from '../../types';

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
  abilityHaste: 'Reduces ability cooldowns.',
  // Defensive
  maxLife: 'Maximum health pool.',
  incMaxLife: '% increased maximum life.',
  lifeRegen: 'Life regenerated per second.',
  armor: 'Physical damage reduction.',
  evasion: 'Chance to evade attacks.',
  blockChance: 'Chance to block with shield.',
  fireResist: 'Reduces fire hazard penalty.',
  coldResist: 'Reduces cold hazard penalty.',
  lightningResist: 'Reduces lightning hazard penalty.',
  chaosResist: 'Reduces chaos hazard penalty.',
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
      { key: 'abilityHaste', label: 'Ability Haste', icon: '\u23F1\uFE0F', format: (v) => `${v.toFixed(0)}%` },
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
  const { character, resetGame, unequipSlot } = useGameStore();
  const equippedSkills = useGameStore(s => s.equippedSkills);
  const isMobile = useIsMobile();
  const [hoveredSlot, setHoveredSlot] = useState<GearSlot | null>(null);
  const hoveredItem = hoveredSlot ? character.equipment[hoveredSlot] ?? null : null;

  // Compute skill-based DPS for stats display
  const weaponType = getEquippedWeaponType(character.equipment);
  const equippedSkillId = equippedSkills[0];
  const equippedSkillDef = equippedSkillId ? getSkillDef(equippedSkillId) : null;
  const activeSkill = equippedSkillDef ?? (weaponType ? getDefaultSkillForWeapon(weaponType, character.level) : null);
  const skillDps = (() => {
    if (!activeSkill) return 0;
    const stats = resolveStats(character);
    const { avgDamage, spellPower } = getWeaponDamageInfo(character.equipment);
    return calcSkillDps(activeSkill, stats, avgDamage, spellPower);
  })();

  return (
    <div className="space-y-4">
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
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* Center — ASCII character silhouette */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <div className="w-full h-full min-h-[280px] bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
              <div className="text-center">
                <pre className="font-mono text-gray-600 text-lg leading-tight select-none">{ASCII_SILHOUETTE}</pre>
                <div className="text-xs text-gray-500 mt-2 font-semibold">{character.name}</div>
                <div className="text-xs text-gray-600">Lv {character.level} {CLASS_DEFS[character.class]?.name ?? 'Exile'}</div>
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
              className="w-36"
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
            <span className="text-sm">{activeSkill?.icon ?? '\u2694\uFE0F'}</span>
            <div className="flex-1">
              <div className="text-xs text-gray-400">Skill DPS ({activeSkill?.name ?? 'None'})</div>
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

      {/* Skill Panel */}
      <SkillPanel />

      {/* Abilities Panel */}
      <AbilityPanel />

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

const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
  sword: 'Sword', axe: 'Axe', mace: 'Mace', dagger: 'Dagger',
  staff: 'Staff', wand: 'Wand', bow: 'Bow', crossbow: 'Crossbow',
  greatsword: 'Greatsword', greataxe: 'Greataxe', maul: 'Maul',
  scepter: 'Scepter', gauntlet: 'Gauntlet', tome: 'Tome',
};

const WEAPON_TYPE_ICONS: Record<WeaponType, string> = {
  sword: '\u2694\uFE0F', axe: '\uD83E\uDE93', mace: '\uD83D\uDD28', dagger: '\uD83D\uDDE1\uFE0F',
  staff: '\uD83E\uDE84', wand: '\u2728', bow: '\uD83C\uDFF9', crossbow: '\uD83C\uDFAF',
  greatsword: '\u2694\uFE0F', greataxe: '\uD83E\uDE93', maul: '\uD83D\uDD28',
  scepter: '\uD83E\uDE84', gauntlet: '\uD83E\uDD4A', tome: '\uD83D\uDCD6',
};

const KIND_BADGE_COLORS: Record<string, string> = {
  passive: 'bg-gray-700 text-gray-300',
  buff: 'bg-blue-900 text-blue-300',
  instant: 'bg-orange-900 text-orange-300',
  proc: 'bg-purple-900 text-purple-300',
  toggle: 'bg-green-900 text-green-300',
  ultimate: 'bg-yellow-900 text-yellow-300',
};

function AbilityPanel() {
  const {
    character, equippedAbilities, abilityProgress,
    equipAbility, unequipAbility,
    allocateAbilityNode, respecAbility: respecAbilityAction,
  } = useGameStore();
  const weaponType = getEquippedWeaponType(character.equipment);
  const availableAbilities = weaponType ? getAbilitiesForWeapon(weaponType) : [];
  const unlockedSlots = getUnlockedSlotCount(character.level);
  const [expandedAbility, setExpandedAbility] = useState<string | null>(null);

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-3">
      <h3 className="text-sm font-bold text-gray-300">Abilities</h3>

      {/* Weapon Type indicator */}
      {weaponType ? (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-base">{WEAPON_TYPE_ICONS[weaponType]}</span>
          <span>Equipped: <span className="text-white font-semibold">{WEAPON_TYPE_LABELS[weaponType]}</span></span>
        </div>
      ) : (
        <div className="text-xs text-gray-500">No mainhand weapon equipped</div>
      )}

      {/* Equipped Ability Slots — show all 4 with lock state */}
      <div className="flex gap-2">
        {equippedAbilities.map((ea, idx) => {
          const isLocked = idx >= unlockedSlots;
          if (isLocked) {
            const unlockLevel = ABILITY_SLOT_UNLOCKS[idx] ?? 99;
            return (
              <div key={idx} className="flex-1 h-10 rounded border-2 border-dashed border-gray-700 flex items-center justify-center opacity-40">
                <span className="text-gray-600 text-xs">{'\uD83D\uDD12'} Lv.{unlockLevel}</span>
              </div>
            );
          }
          if (!ea) {
            return (
              <div key={idx} className="flex-1 h-10 rounded border-2 border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-gray-600 text-xs">Slot {idx + 1}</span>
              </div>
            );
          }
          const def = getAbilityDef(ea.abilityId);
          if (!def) return null;
          const progress = abilityProgress[ea.abilityId];
          return (
            <div key={idx} className="flex-1 h-10 rounded border border-yellow-700 bg-yellow-950/30 flex items-center justify-center gap-1 px-1 relative">
              <span className="text-sm">{def.icon}</span>
              <span className="text-xs text-yellow-300 truncate">{def.name}</span>
              {progress && (
                <span className="absolute -top-1 -right-1 text-xs bg-purple-700 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {progress.level}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Available abilities for current weapon */}
      {availableAbilities.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Available Abilities</div>
          {availableAbilities.map((ability) => {
            const equippedSlotIdx = equippedAbilities.findIndex(ea => ea?.abilityId === ability.id);
            const isEquipped = equippedSlotIdx !== -1;
            const progress = abilityProgress[ability.id];
            const isExpanded = expandedAbility === ability.id;

            return (
              <div
                key={ability.id}
                className={`rounded-lg border p-2 ${
                  isEquipped ? 'border-yellow-600 bg-yellow-950/30' : 'border-gray-700 bg-gray-900/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ability.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{ability.name}</span>
                      <span className={`text-xs px-1 rounded ${KIND_BADGE_COLORS[ability.kind] ?? 'bg-gray-700 text-gray-300'}`}>
                        {ability.kind}
                      </span>
                      {ability.duration && (
                        <span className="text-xs text-gray-500">{ability.duration}s / {ability.cooldown}s CD</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{ability.description}</div>
                  </div>
                  {isEquipped ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExpandedAbility(isExpanded ? null : ability.id)}
                        className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                      >
                        {isExpanded ? 'Close' : 'Tree'}
                      </button>
                      <button
                        onClick={() => unequipAbility(equippedSlotIdx)}
                        className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const isLocked = slotIdx >= unlockedSlots;
                        const occupied = equippedAbilities[slotIdx] !== null;
                        if (isLocked) return (
                          <div key={slotIdx} className="w-6 h-6 rounded text-xs bg-gray-800 text-gray-600 flex items-center justify-center">{'\uD83D\uDD12'}</div>
                        );
                        return (
                          <button
                            key={slotIdx}
                            onClick={() => equipAbility(slotIdx, ability.id)}
                            className={`w-6 h-6 rounded text-xs font-bold ${
                              occupied
                                ? 'bg-gray-700 text-gray-500 hover:bg-yellow-900 hover:text-yellow-300'
                                : 'bg-green-900 text-green-300 hover:bg-green-800'
                            }`}
                            title={`Equip to slot ${slotIdx + 1}${occupied ? ' (replace)' : ''}`}
                          >
                            {slotIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* XP Bar when equipped */}
                {isEquipped && progress && (
                  <div className="mt-1.5 ml-8">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-purple-400 font-semibold">Lv.{progress.level}{progress.level >= 10 ? ' MAX' : ''}</span>
                      <span className="text-gray-500">
                        {progress.level < 10 ? `${progress.xp}/${getAbilityXpForLevel(progress.level)} XP` : 'Max Level'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress.level >= 10 ? 100 : (progress.xp / getAbilityXpForLevel(progress.level)) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Points: {progress.level - progress.allocatedNodes.length} available / {progress.level} total
                    </div>
                  </div>
                )}

                {/* Skill Tree — expanded view */}
                {isEquipped && isExpanded && ability.skillTree && progress && (
                  <SkillTreeView
                    ability={ability}
                    progress={progress}
                    onAllocate={(nodeId) => allocateAbilityNode(ability.id, nodeId)}
                    onRespec={() => respecAbilityAction(ability.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkillTreeView({ ability, progress, onAllocate, onRespec }: {
  ability: AbilityDef;
  progress: AbilityProgress;
  onAllocate: (nodeId: string) => void;
  onRespec: () => void;
}) {
  if (!ability.skillTree) return null;
  const { gold } = useGameStore();
  const [selectedPath, setSelectedPath] = useState<'A' | 'B' | 'C'>('A');
  const respecCost = getRespecCost(progress);
  const availablePoints = progress.level - progress.allocatedNodes.length;

  const currentPath = ability.skillTree.paths.find(p => p.id === selectedPath)!;

  return (
    <div className="mt-2 ml-8 space-y-2">
      {/* Path Tabs */}
      <div className="flex gap-1">
        {ability.skillTree.paths.map((path) => {
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
          const def = getAbilityDef(ability.id)!;
          const canAlloc = !isAllocated && canAllocateNode(def, progress, node.id);

          // Build effect description
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
  critChance: 'Crit Chance',
  critMultiplier: 'Crit Multi',
  abilityHaste: 'Ability Haste',
  maxLife: 'Max Life',
  incMaxLife: '% Max Life',
  lifeRegen: 'Life Regen',
  armor: 'Armor',
  evasion: 'Evasion',
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
          rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50
          flex items-center gap-2 px-2 py-2 cursor-pointer
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
        <span className="text-xs text-gray-600">{slotLabel(slot)}</span>
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
      onMouseEnter={isMobile ? undefined : () => onHover(slot)}
      onMouseLeave={isMobile ? undefined : () => onHover(null)}
      onClick={handleClick}
      title={isShowingTooltip ? `Tap to unequip ${item.name}` : `Tap to inspect ${item.name}`}
    >
      <ItemIcon item={item} size="md" className="flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold truncate ${RARITY_TEXT[item.rarity]}`}>{item.name}</div>
        <div className="text-xs text-gray-500">iLvl {item.iLvl} {'\u2022'} {item.rarity}</div>
      </div>
    </div>
  );
}

/** Tooltip showing full item details */
function ItemTooltip({ item }: { item: Item }) {
  return (
    <div className={`rounded-lg border-2 p-3 space-y-1.5 ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]}`}>
      <div className="flex items-center gap-2">
        <ItemIcon item={item} size="lg" />
        <div>
          <div className="font-bold text-white text-sm">{item.name}</div>
          <div className="text-xs text-gray-400">
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

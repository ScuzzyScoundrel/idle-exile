import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GearSlot, Item, Rarity, StatKey, CurrencyType } from '../../types';
import { slotLabel } from '../slotConfig';
import { ItemIcon, SlotIcon } from '../itemIcon';
import { formatAffix } from '../../engine/items';
import { formatCorruptionAffix } from '../../data/corruptionAffixes';
import { getGemDef, GEM_TIER_NAMES, GEM_TIER_COLORS } from '../../data/gems';
import { calcBagCapacity, CURRENCY_DEFS } from '../../data/items';
import CharacterHeader from '../components/CharacterHeader';
import ClassSilhouette from '../components/ClassSilhouette';
import SkillPanel from '../components/SkillPanel';
import AttributePanel from '../components/AttributePanel';
import ClassTalentPanel from '../components/ClassTalentPanel';
import InventoryScreen from './InventoryScreen';

/* ── Constants ── */
const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-green-600', uncommon: 'border-blue-500', rare: 'border-yellow-500',
  epic: 'border-purple-500', legendary: 'border-orange-500', unique: 'border-amber-500',
};
const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-green-950', uncommon: 'bg-blue-950', rare: 'bg-yellow-950',
  epic: 'bg-purple-950', legendary: 'bg-orange-950', unique: 'bg-amber-950',
};
const TIER_COLORS: Record<number, string> = {
  1: 'text-orange-400', 2: 'text-purple-400', 3: 'text-yellow-400',
  4: 'text-blue-400', 5: 'text-blue-400', 6: 'text-blue-300',
  7: 'text-green-400', 8: 'text-green-300', 9: 'text-gray-400', 10: 'text-gray-500',
};

/* WoW-style layout: left/right columns + bottom row */
const LEFT_SLOTS: GearSlot[] = ['helmet', 'neck', 'shoulders', 'cloak', 'chest', 'bracers'];
const RIGHT_SLOTS: GearSlot[] = ['gloves', 'belt', 'pants', 'boots', 'ring1', 'ring2'];
const BOTTOM_SLOTS: GearSlot[] = ['mainhand', 'offhand', 'trinket1', 'trinket2'];

/* ── Stat Sections ── */
interface StatRow { key: StatKey; label: string; icon: string; format?: (v: number) => string }
const STAT_SECTIONS: { label: string; stats: StatRow[] }[] = [
  { label: 'Attack', stats: [
    { key: 'flatPhysDamage', label: 'Phys Damage', icon: '\u2694\uFE0F' },
    { key: 'flatAtkFireDamage', label: 'Fire Atk', icon: '\uD83D\uDD25' },
    { key: 'flatAtkColdDamage', label: 'Cold Atk', icon: '\u2744\uFE0F' },
    { key: 'flatAtkLightningDamage', label: 'Lightning Atk', icon: '\u26A1' },
    { key: 'flatAtkChaosDamage', label: 'Chaos Atk', icon: '\uD83D\uDC80' },
    { key: 'attackSpeed', label: 'Attack Speed', icon: '\u26A1', format: v => {
      const cdr = v / (100 + v) * 100; return v > 0 ? `${v.toFixed(0)} (${cdr.toFixed(1)}% CDR)` : '0';
    }},
    { key: 'accuracy', label: 'Accuracy', icon: '\uD83C\uDFAF' },
    { key: 'incPhysDamage', label: '% Phys Damage', icon: '\u2694\uFE0F', format: v => `${v.toFixed(0)}%` },
    { key: 'incAttackDamage', label: '% Attack Damage', icon: '\u2694\uFE0F', format: v => `${v.toFixed(0)}%` },
  ]},
  { label: 'Spell', stats: [
    { key: 'spellPower', label: 'Spell Power', icon: '\u2728' },
    { key: 'castSpeed', label: 'Cast Speed', icon: '\u2728', format: v => {
      const cdr = v / (100 + v) * 100; return v > 0 ? `${v.toFixed(0)} (${cdr.toFixed(1)}% CDR)` : '0';
    }},
    { key: 'incSpellDamage', label: '% Spell Damage', icon: '\u2728', format: v => `${v.toFixed(0)}%` },
  ]},
  { label: 'Critical', stats: [
    { key: 'critChance', label: 'Crit Chance', icon: '\uD83C\uDFAF', format: v => `${v.toFixed(1)}%` },
    { key: 'critMultiplier', label: 'Crit Multiplier', icon: '\uD83D\uDCA5', format: v => `${v.toFixed(0)}%` },
  ]},
  { label: 'Defense', stats: [
    { key: 'maxLife', label: 'Max Life', icon: '\u2764\uFE0F' },
    { key: 'incMaxLife', label: '% Max Life', icon: '\u2764\uFE0F', format: v => `${v.toFixed(0)}%` },
    { key: 'lifeRegen', label: 'Life Regen', icon: '\u2764\uFE0F', format: v => v.toFixed(1) },
    { key: 'armor', label: 'Armor', icon: '\uD83D\uDEE1\uFE0F' },
    { key: 'armorToElemental', label: 'Armor→Ele', icon: '\uD83D\uDEE1\uFE0F', format: v => `${v.toFixed(0)}%` },
    { key: 'evasion', label: 'Evasion', icon: '\uD83D\uDCA8' },
    { key: 'blockChance', label: 'Block', icon: '\uD83D\uDEE1\uFE0F', format: v => `${v.toFixed(1)}%` },
  ]},
  { label: 'Resistances', stats: [
    { key: 'fireResist', label: 'Fire Resist', icon: '\uD83D\uDD25', format: v => `${v.toFixed(0)}%` },
    { key: 'coldResist', label: 'Cold Resist', icon: '\u2744\uFE0F', format: v => `${v.toFixed(0)}%` },
    { key: 'lightningResist', label: 'Lightning Resist', icon: '\u26A1', format: v => `${v.toFixed(0)}%` },
    { key: 'chaosResist', label: 'Chaos Resist', icon: '\uD83D\uDC80', format: v => `${v.toFixed(0)}%` },
  ]},
  { label: 'Utility', stats: [
    { key: 'movementSpeed', label: 'Move Speed', icon: '\uD83D\uDC5F', format: v => `${v.toFixed(0)}%` },
    { key: 'itemQuantity', label: 'Item Quantity', icon: '\uD83D\uDCE6', format: v => `${v.toFixed(0)}%` },
    { key: 'itemRarity', label: 'Item Rarity', icon: '\u2B50', format: v => `${v.toFixed(0)}%` },
  ]},
];

/* ── Main Component ── */
export default function HeroScreen() {
  const { character, unequipSlot, resetGame, inventory, bagSlots, gold, currencies, craft } = useGameStore();
  const [selectedSlot, setSelectedSlot] = useState<GearSlot | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);
  const [bagsOpen, setBagsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const selectedItem = selectedSlot ? character.equipment[selectedSlot] ?? null : null;
  const bagCapacity = calcBagCapacity(bagSlots);
  const hasCurrencies = Object.values(currencies).some(v => v > 0);

  const handleCraft = () => {
    if (!selectedCurrency || !selectedItem) return;
    const result = craft(selectedItem.id, selectedCurrency);
    if (result?.success) {
      // Item stays selected — re-read from equipment on next render
    }
  };

  const glassPanel = 'bg-gray-950/60 backdrop-blur-sm rounded-lg border border-white/5 p-3';

  return (
    <div className="max-w-5xl mx-auto space-y-3">
      {/* Character Header */}
      <CharacterHeader />

      {/* Attributes + Class Talents (Phase 2f + 3a.5) */}
      <AttributePanel />
      <ClassTalentPanel />

      {/* Top row: Equipment (left) | Stats (right) */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3">
        {/* Equipment — narrower paper doll */}
        <div className={`${glassPanel} md:w-80`}>
          <h3 className="text-sm font-bold text-gray-300 heading-fantasy mb-2">Equipment</h3>

          <div className="flex gap-1.5">
            <div className="flex flex-col gap-1.5 w-14 shrink-0">
              {LEFT_SLOTS.map(slot => (
                <EquipSlot key={slot} slot={slot} item={character.equipment[slot] ?? null}
                  isSelected={selectedSlot === slot}
                  onSelect={s => { setSelectedSlot(selectedSlot === s ? null : s); setSelectedCurrency(null); }} />
              ))}
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <div className="w-full h-full panel-inset rounded-lg flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <ClassSilhouette characterClass={character.class} className="w-16 h-24 mx-auto mb-2" />
                  <div className="text-xs text-gray-500 font-semibold">{character.name}</div>
                  <div className="text-[10px] text-gray-600">Lv.{character.level}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-14 shrink-0">
              {RIGHT_SLOTS.map(slot => (
                <EquipSlot key={slot} slot={slot} item={character.equipment[slot] ?? null}
                  isSelected={selectedSlot === slot}
                  onSelect={s => { setSelectedSlot(selectedSlot === s ? null : s); setSelectedCurrency(null); }} />
              ))}
            </div>
          </div>

          <div className="flex gap-1.5 justify-center mt-1.5">
            {BOTTOM_SLOTS.map(slot => (
              <EquipSlot key={slot} slot={slot} item={character.equipment[slot] ?? null}
                isSelected={selectedSlot === slot}
                onSelect={s => { setSelectedSlot(selectedSlot === s ? null : s); setSelectedCurrency(null); }}
                className="w-14" />
            ))}
          </div>

          {/* Selected item detail — inline like inventory */}
          {selectedItem && selectedSlot && (
            <div className="mt-2 space-y-2">
              <ItemTooltip item={selectedItem} />
              <div className="flex gap-2">
                <button
                  onClick={() => { unequipSlot(selectedSlot); setSelectedSlot(null); setSelectedCurrency(null); }}
                  className="flex-1 py-2 bg-yellow-700 hover:bg-yellow-600 text-white text-sm rounded-lg font-semibold"
                >
                  Unequip
                </button>
                {selectedCurrency && (
                  <button
                    onClick={handleCraft}
                    className="flex-1 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded-lg font-semibold"
                  >
                    Apply {CURRENCY_DEFS.find(c => c.id === selectedCurrency)?.name}
                  </button>
                )}
              </div>
              {hasCurrencies && (
                <div className="flex gap-1.5 flex-wrap">
                  {CURRENCY_DEFS.filter(c => (currencies[c.id] ?? 0) > 0).map(cur => (
                    <button
                      key={cur.id}
                      onClick={() => setSelectedCurrency(selectedCurrency === cur.id ? null : cur.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all
                        ${selectedCurrency === cur.id
                          ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                      title={cur.description}
                    >
                      <span>{cur.icon}</span>
                      <span>{cur.name}</span>
                      <span className="text-gray-500">x{currencies[cur.id]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {selectedSlot && !selectedItem && (
            <div className="panel-inset p-3 mt-2 text-center text-xs text-gray-500">
              {slotLabel(selectedSlot)} — Empty
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={glassPanel}>
          <h3 className="text-sm font-bold text-gray-300 heading-fantasy mb-2">Stats</h3>
          <StatsGrid />
        </div>
      </div>

      {/* Bags — collapsible with currency */}
      <div className={glassPanel}>
        <button onClick={() => setBagsOpen(o => !o)} className="w-full flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-300 heading-fantasy">
            {'\uD83C\uDF92'} Bags
          </h3>
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="text-xs text-theme-text-accent font-semibold shrink-0">{gold}g</span>
            <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-thin">
              {Object.entries(currencies).map(([id, count]) => (
                count > 0 && <span key={id} className="text-xs text-gray-400 shrink-0">{id} x{count}</span>
              ))}
            </div>
            <span className="text-xs text-gray-400 shrink-0">{inventory.length}/{bagCapacity}</span>
            <span className="text-xs text-gray-500 shrink-0">{bagsOpen ? '\u25BC' : '\u25B6'}</span>
          </div>
        </button>
        {bagsOpen && (
          <div className="mt-2">
            <InventoryScreen embedded />
          </div>
        )}
      </div>

      {/* Skills — collapsible */}
      <div className={glassPanel}>
        <button onClick={() => setSkillsOpen(o => !o)} className="w-full flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-300 heading-fantasy">Skills</h3>
          <span className="text-xs text-gray-500">{skillsOpen ? '\u25BC' : '\u25B6'}</span>
        </button>
        {skillsOpen && (
          <div className="mt-2">
            <SkillPanel />
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="pt-4">
        <button
          onClick={() => { if (confirm('Reset all progress? This cannot be undone!')) resetGame(); }}
          className="w-full py-2 bg-red-900 hover:bg-red-800 text-red-300 text-sm rounded-lg"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}

/* ── Equipment Slot ── */
function EquipSlot({ slot, item, isSelected, onSelect, className }: {
  slot: GearSlot; item: Item | null; isSelected: boolean;
  onSelect: (slot: GearSlot) => void;
  className?: string;
}) {
  if (!item) {
    return (
      <div
        className={`aspect-square rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50
          flex items-center justify-center cursor-pointer hover:border-gray-500 transition-all
          ${isSelected ? 'ring-2 ring-yellow-400' : ''} ${className ?? 'w-full'}`}
        onClick={() => onSelect(slot)}
        title={`${slotLabel(slot)} — empty`}
      >
        <SlotIcon slot={slot} size="md" className="opacity-25" />
      </div>
    );
  }

  return (
    <div
      className={`aspect-square rounded-lg border-2 cursor-pointer transition-all
        flex items-center justify-center
        ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} hover:brightness-125
        ${item.isCorrupted ? 'ring-1 ring-fuchsia-500/40' : ''}
        ${isSelected ? 'ring-2 ring-yellow-400' : ''} ${className ?? 'w-full'}`}
      onClick={() => onSelect(slot)}
      title={item.name}
    >
      <ItemIcon item={item} size="lg" />
    </div>
  );
}

/* ── Item Tooltip ── */
function ItemTooltip({ item }: { item: Item }) {
  return (
    <div className={`rounded-lg border-2 p-3 space-y-1.5 ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]}
      ${item.isCorrupted ? 'bg-gradient-to-br from-transparent to-fuchsia-950/60 ring-1 ring-fuchsia-500/40' : ''}`}>
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
        <ItemIcon item={item} size="lg" className="!w-16 !h-16" />
      </div>
      {Object.entries(item.baseStats).length > 0 && (
        <div className="text-xs text-gray-500">
          {Object.entries(item.baseStats).map(([k, v]) => <span key={k} className="mr-2">{v} base {k}</span>)}
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
      {item.sockets && item.sockets.length > 0 && (
        <div className="border-t border-gray-700 pt-1 space-y-0.5">
          {item.sockets.map((gem, i) => (
            <div key={i} className="text-xs flex items-center gap-1">
              {gem ? (
                <>
                  <span>{getGemDef(gem.type).icon}</span>
                  <span className={GEM_TIER_COLORS[gem.tier]}>{GEM_TIER_NAMES[gem.tier]} {getGemDef(gem.type).name}</span>
                  <span className="text-gray-500">(+{getGemDef(gem.type).tiers[gem.tier]} {getGemDef(gem.type).description})</span>
                </>
              ) : (
                <span className="text-gray-500 italic">Empty Socket</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stats Grid ── */
function StatsGrid() {
  const character = useGameStore(s => s.character);
  return (
    <div className="space-y-3">
      {STAT_SECTIONS.map(section => {
        const visible = section.stats.filter(({ key }) => character.stats[key] > 0);
        if (visible.length === 0) return null;
        return (
          <div key={section.label}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{section.label}</div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
              {visible.map(({ key, label, icon, format }) => (
                <div key={key} className="flex items-center gap-2">
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
  );
}


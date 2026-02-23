import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item, GearSlot } from '../../types';
import ItemCard from '../components/ItemCard';
import { calcItemPower, formatAffix, getAffixDef } from '../../engine/items';

const SLOT_ORDER: GearSlot[] = ['weapon', 'chest', 'boots', 'ring'];

const SLOT_ICONS: Record<GearSlot, string> = {
  weapon: '\u2694\uFE0F',
  chest: '\uD83D\uDEE1\uFE0F',
  boots: '\uD83E\uDD7E',
  ring: '\uD83D\uDC8D',
};

const RARITY_BG: Record<string, string> = {
  normal: 'bg-gray-800 border-gray-600',
  magic: 'bg-blue-950 border-blue-600',
  rare: 'bg-yellow-950 border-yellow-600',
  unique: 'bg-orange-950 border-orange-600',
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-blue-400',
  3: 'text-gray-400',
};

export default function InventoryScreen() {
  const { character, inventory, equipItem, unequipSlot, disenchantItem } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [filter, setFilter] = useState<GearSlot | 'all'>('all');
  const [sort, setSort] = useState<'power' | 'rarity' | 'ilvl'>('power');

  const filteredInventory = inventory
    .filter((i) => filter === 'all' || i.slot === filter)
    .sort((a, b) => {
      if (sort === 'power') return calcItemPower(b) - calcItemPower(a);
      if (sort === 'rarity') {
        const order = { unique: 4, rare: 3, magic: 2, normal: 1 };
        return order[b.rarity] - order[a.rarity];
      }
      return b.iLvl - a.iLvl;
    });

  const handleEquip = (item: Item) => {
    equipItem(item);
    setSelectedItem(null);
  };

  const handleDisenchant = (item: Item) => {
    disenchantItem(item.id);
    setSelectedItem(null);
  };

  const equipped = character.equipment[selectedItem?.slot || 'weapon'];

  return (
    <div className="space-y-3">
      {/* Equipped Gear - compact row */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 mb-1">Equipped</h2>
        <div className="flex gap-1.5">
          {SLOT_ORDER.map((slot) => {
            const item = character.equipment[slot];
            return (
              <div
                key={slot}
                onClick={() => item && unequipSlot(slot)}
                className={`
                  flex-1 rounded-lg border p-1.5 text-center min-h-[52px] transition-all
                  ${item
                    ? `${RARITY_BG[item.rarity]} cursor-pointer hover:brightness-125`
                    : 'bg-gray-900 border-gray-700 border-dashed'}
                `}
                title={item ? item.name : `${slot} - empty`}
              >
                <div className="text-base">{SLOT_ICONS[slot]}</div>
                {item ? (
                  <div className="text-[9px] truncate text-gray-300 mt-0.5">{item.name.split(' ')[0]}</div>
                ) : (
                  <div className="text-[9px] text-gray-600 mt-0.5">empty</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Header + Filters */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-yellow-400">\uD83C\uDF92 Bags ({inventory.length})</h2>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', ...SLOT_ORDER] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-xs ${
                filter === f ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {f === 'all' ? 'All' : `${SLOT_ICONS[f]} ${f}`}
            </button>
          ))}
          <div className="flex-1" />
          {(['power', 'rarity', 'ilvl'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2 py-0.5 rounded text-xs ${
                sort === s ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Item Grid */}
      {filteredInventory.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-gray-900 rounded-lg border border-gray-800 border-dashed">
          <div className="text-2xl mb-1">\uD83C\uDF92</div>
          No items. Start an idle run to collect loot!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              className={`
                rounded-lg border p-1.5 cursor-pointer transition-all text-center
                ${RARITY_BG[item.rarity]}
                ${selectedItem?.id === item.id ? 'ring-2 ring-white scale-105' : 'hover:brightness-125'}
              `}
            >
              <div className="text-lg">{SLOT_ICONS[item.slot]}</div>
              <div className="text-[10px] font-semibold truncate text-gray-200">{item.name}</div>
              <div className="text-[9px] text-gray-500">
                P{item.iLvl} \u2022 {item.prefixes.length + item.suffixes.length}mod
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Item Detail Panel */}
      {selectedItem && (
        <div className={`rounded-lg border-2 p-3 space-y-2 ${RARITY_BG[selectedItem.rarity]}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{SLOT_ICONS[selectedItem.slot]}</span>
            <div>
              <div className="font-bold text-white">{selectedItem.name}</div>
              <div className="text-xs text-gray-400">
                iLvl {selectedItem.iLvl} \u2022 {selectedItem.rarity} \u2022 Power: {calcItemPower(selectedItem)}
                {equipped && (
                  <span className={
                    calcItemPower(selectedItem) > calcItemPower(equipped)
                      ? ' text-green-400' : ' text-red-400'
                  }>
                    {' '}({calcItemPower(selectedItem) > calcItemPower(equipped) ? '+' : ''}
                    {calcItemPower(selectedItem) - calcItemPower(equipped)} vs equipped)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Base stats */}
          {Object.entries(selectedItem.baseStats).length > 0 && (
            <div className="text-xs text-gray-500">
              {Object.entries(selectedItem.baseStats).map(([k, v]) => (
                <span key={k} className="mr-2">{v} base {k}</span>
              ))}
            </div>
          )}

          {/* Affixes */}
          <div className="space-y-0.5">
            {selectedItem.prefixes.map((a, i) => (
              <div key={`p-${i}`} className={`text-xs ${TIER_COLORS[a.tier]}`}>
                {formatAffix(a)} <span className="text-gray-600">(T{a.tier} prefix)</span>
              </div>
            ))}
            {selectedItem.suffixes.map((a, i) => (
              <div key={`s-${i}`} className={`text-xs ${TIER_COLORS[a.tier]}`}>
                {formatAffix(a)} <span className="text-gray-600">(T{a.tier} suffix)</span>
              </div>
            ))}
            {selectedItem.prefixes.length + selectedItem.suffixes.length === 0 && (
              <div className="text-xs text-gray-600 italic">No affixes (Normal item)</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleEquip(selectedItem)}
              className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg font-semibold"
            >
              Equip
            </button>
            <button
              onClick={() => handleDisenchant(selectedItem)}
              className="flex-1 py-2 bg-red-900 hover:bg-red-800 text-red-300 text-sm rounded-lg font-semibold"
            >
              Disenchant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

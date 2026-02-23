import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item, GearSlot } from '../../types';
import ItemCard from '../components/ItemCard';
import { calcItemPower } from '../../engine/items';

const SLOT_ORDER: GearSlot[] = ['weapon', 'chest', 'boots', 'ring'];
const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: '\u2694\uFE0F Weapon',
  chest: '\uD83D\uDEE1\uFE0F Chest',
  boots: '\uD83E\uDD7E Boots',
  ring: '\uD83D\uDC8D Ring',
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-yellow-400">Equipment</h2>

      {/* Equipped Gear */}
      <div className="grid grid-cols-2 gap-2">
        {SLOT_ORDER.map((slot) => {
          const equipped = character.equipment[slot];
          return (
            <div key={slot} className="bg-gray-800 rounded-lg p-2 min-h-[60px]">
              <div className="text-xs text-gray-500 mb-1">{SLOT_LABELS[slot]}</div>
              {equipped ? (
                <div onClick={() => unequipSlot(slot)} className="cursor-pointer">
                  <ItemCard item={equipped} compact />
                </div>
              ) : (
                <div className="text-xs text-gray-600 italic">Empty</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inventory Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yellow-400">Inventory ({inventory.length})</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {(['all', ...SLOT_ORDER] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded text-xs ${
              filter === f ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <div className="flex-1" />
        {(['power', 'rarity', 'ilvl'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-2 py-1 rounded text-xs ${
              sort === s ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      {filteredInventory.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No items. Start an idle run to collect loot!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filteredInventory.map((item) => (
            <div key={item.id}>
              <ItemCard
                item={item}
                selected={selectedItem?.id === item.id}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                comparison={character.equipment[item.slot] || null}
              />
              {/* Action buttons */}
              {selectedItem?.id === item.id && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleEquip(item)}
                    className="flex-1 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded font-semibold"
                  >
                    Equip
                  </button>
                  <button
                    onClick={() => handleDisenchant(item)}
                    className="flex-1 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded font-semibold"
                  >
                    Disenchant
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

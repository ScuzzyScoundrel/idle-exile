import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item, CurrencyType, CraftResult } from '../../types';
import { CURRENCY_DEFS } from '../../data/items';
import ItemCard from '../components/ItemCard';

export default function CraftingScreen() {
  const { inventory, currencies, craft } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);
  const [lastResult, setLastResult] = useState<CraftResult | null>(null);

  const handleCraft = () => {
    if (!selectedItem || !selectedCurrency) return;
    const result = craft(selectedItem.id, selectedCurrency);
    if (result) {
      setLastResult(result);
      if (result.success) {
        // Update selected item reference to the new version
        setSelectedItem(result.item);
      }
    }
  };

  // Find the current version of the selected item (it may have changed from crafting)
  const currentItem = selectedItem
    ? inventory.find((i) => i.id === selectedItem.id) || selectedItem
    : null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-yellow-400">Crafting Bench</h2>

      {/* Currency Selection */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Select Currency</label>
        <div className="grid grid-cols-4 gap-1">
          {CURRENCY_DEFS.map((cur) => {
            const count = currencies[cur.id];
            return (
              <button
                key={cur.id}
                onClick={() => setSelectedCurrency(cur.id)}
                disabled={count === 0}
                className={`
                  p-2 rounded-lg text-center transition-all
                  ${selectedCurrency === cur.id
                    ? 'bg-yellow-600 text-black ring-2 ring-yellow-400'
                    : count > 0
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-900 text-gray-600 cursor-not-allowed'}
                `}
              >
                <div className="text-lg">{cur.icon}</div>
                <div className="text-xs font-semibold truncate">{cur.name.replace(' Shard', '')}</div>
                <div className="text-xs text-gray-400">x{count}</div>
              </button>
            );
          })}
        </div>
        {selectedCurrency && (
          <div className="text-xs text-gray-400 mt-1 bg-gray-800 rounded p-2">
            {CURRENCY_DEFS.find((c) => c.id === selectedCurrency)?.description}
          </div>
        )}
      </div>

      {/* Item Selection */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Select Item to Craft On</label>
        {inventory.length === 0 ? (
          <div className="text-center text-gray-500 py-4 bg-gray-800 rounded-lg">
            No items in inventory. Go farm some loot!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
            {inventory.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                selected={currentItem?.id === item.id}
                onClick={() => setSelectedItem(item)}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Craft Preview */}
      {currentItem && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Selected Item</div>
          <ItemCard item={currentItem} />
        </div>
      )}

      {/* Craft Button */}
      <button
        onClick={handleCraft}
        disabled={!currentItem || !selectedCurrency || currencies[selectedCurrency!] === 0}
        className={`
          w-full py-3 font-bold rounded-lg text-lg transition-all
          ${currentItem && selectedCurrency && currencies[selectedCurrency] > 0
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
        `}
      >
        {selectedCurrency && currentItem
          ? `Apply ${CURRENCY_DEFS.find((c) => c.id === selectedCurrency)?.name}`
          : 'Select item & currency'}
      </button>

      {/* Result */}
      {lastResult && (
        <div className={`rounded-lg p-3 ${lastResult.success ? 'bg-green-950 border border-green-700' : 'bg-red-950 border border-red-700'}`}>
          <div className={`text-sm font-semibold ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {lastResult.success ? 'Craft Successful!' : 'Craft Failed'}
          </div>
          <div className="text-xs text-gray-300 mt-1">{lastResult.message}</div>
          {lastResult.success && <ItemCard item={lastResult.item} />}
        </div>
      )}
    </div>
  );
}

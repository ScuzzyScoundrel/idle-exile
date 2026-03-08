import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCraftingStore } from '../../store/craftingStore';
import { CRAFT_OUTPUT_BUFFER_SIZE } from '../../data/balance';
import ItemCard from '../components/ItemCard';

export default function CraftOutputPanel() {
  const buffer = useGameStore(s => s.craftOutputBuffer);
  const claimCraftOutput = useCraftingStore(s => s.claimCraftOutput);
  const claimAllCraftOutput = useCraftingStore(s => s.claimAllCraftOutput);
  const salvageCraftOutput = useCraftingStore(s => s.salvageCraftOutput);
  const salvageAllCraftOutput = useCraftingStore(s => s.salvageAllCraftOutput);
  const [collapsed, setCollapsed] = useState(false);

  if (buffer.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700/70 transition-colors text-left"
      >
        <span className="text-xs text-gray-500">{collapsed ? '\u25B6' : '\u25BC'}</span>
        <span className="text-sm font-bold text-yellow-400">
          Craft Output ({buffer.length}/{CRAFT_OUTPUT_BUFFER_SIZE})
        </span>
        <div className="ml-auto flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); claimAllCraftOutput(); }}
            className="px-2 py-0.5 rounded text-xs font-bold bg-green-700 hover:bg-green-600 text-green-200"
          >
            Stash All
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); salvageAllCraftOutput(); }}
            className="px-2 py-0.5 rounded text-xs font-bold bg-red-800 hover:bg-red-700 text-red-200"
          >
            Salvage All
          </button>
        </div>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {buffer.map(item => (
            <div key={item.id} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <ItemCard item={item} compact />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => claimCraftOutput(item.id)}
                  className="px-2 py-1 rounded text-xs font-bold bg-green-700 hover:bg-green-600 text-green-200"
                >
                  Stash
                </button>
                <button
                  onClick={() => salvageCraftOutput(item.id)}
                  className="px-2 py-1 rounded text-xs font-bold bg-red-800 hover:bg-red-700 text-red-200"
                >
                  Salvage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

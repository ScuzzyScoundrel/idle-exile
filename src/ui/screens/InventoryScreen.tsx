import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item, Affix, GearSlot, CurrencyType, Rarity } from '../../types';
import { CURRENCY_DEFS } from '../../data/items';
import ItemCard from '../components/ItemCard';
import { formatAffix, getAffixDef } from '../../engine/items';
import { slotIcon, slotLabel, DROPPABLE_SLOTS } from '../slotConfig';

const SLOT_ORDER: GearSlot[] = DROPPABLE_SLOTS;

const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-green-950 border-green-600',
  uncommon: 'bg-blue-950 border-blue-600',
  rare: 'bg-yellow-950 border-yellow-600',
  epic: 'bg-purple-950 border-purple-600',
  legendary: 'bg-orange-950 border-orange-600',
};

const RARITY_ORDER: Record<Rarity, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
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

const RARITY_TOOLTIP_BG: Record<Rarity, string> = {
  common: 'bg-green-950 border-green-600',
  uncommon: 'bg-blue-950 border-blue-500',
  rare: 'bg-yellow-950 border-yellow-500',
  epic: 'bg-purple-950 border-purple-500',
  legendary: 'bg-orange-950 border-orange-500',
};

const RARITY_BORDER_RING: Record<Rarity, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
};

const AUTO_SALVAGE_OPTIONS: { value: Rarity; label: string }[] = [
  { value: 'common', label: 'None' },
  { value: 'uncommon', label: 'Common' },
  { value: 'rare', label: '≤ Uncommon' },
  { value: 'epic', label: '≤ Rare' },
];

export default function InventoryScreen() {
  const {
    character, inventory, materials, currencies,
    equipItem, unequipSlot, disenchantItem, craft,
    autoSalvageMinRarity, setAutoSalvageRarity,
  } = useGameStore();
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);
  const [filter, setFilter] = useState<GearSlot | 'all'>('all');
  const [sort, setSort] = useState<'rarity' | 'ilvl'>('ilvl');
  const [disenchantMsg, setDisenchantMsg] = useState<string | null>(null);
  const [craftMsg, setCraftMsg] = useState<string | null>(null);
  const [equippedOpen, setEquippedOpen] = useState(true);

  const [tooltip, setTooltip] = useState<{ item: Item; slot: GearSlot; x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [craftDiff, setCraftDiff] = useState<{
    itemId: string;
    added: Affix[];
    removed: Affix[];
    addedKeys: Set<string>;
  } | null>(null);
  const craftDiffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (craftDiffTimer.current) clearTimeout(craftDiffTimer.current); };
  }, []);

  const showTooltip = (e: React.MouseEvent, item: Item, slot: GearSlot) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ item, slot, x: rect.left + rect.width / 2, y: rect.top });
  };
  const hideTooltip = () => setTooltip(null);

  const filteredInventory = inventory
    .filter((i) => filter === 'all' || i.slot === filter)
    .sort((a, b) => {
      if (sort === 'rarity') {
        return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      }
      return b.iLvl - a.iLvl;
    });

  const formatReward = (
    currencies: Partial<Record<CurrencyType, number>>,
    materials: Record<string, number>,
  ) => {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(materials)) {
      if (v > 0) parts.push(`+${v} ${k.replace(/_/g, ' ')}`);
    }
    for (const [k, v] of Object.entries(currencies)) {
      if (v && v > 0) parts.push(`+${v} ${k}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'nothing';
  };

  const showFeedback = (type: 'disenchant' | 'craft', msg: string) => {
    if (type === 'disenchant') {
      setDisenchantMsg(msg);
      setCraftMsg(null);
    } else {
      setCraftMsg(msg);
      setDisenchantMsg(null);
    }
  };

  const handleEquip = (item: Item) => {
    equipItem(item);
    setSelectedItem(null);
  };

  const handleDisenchant = (item: Item) => {
    const idx = filteredInventory.findIndex((i) => i.id === item.id);
    const result = disenchantItem(item.id);
    const rewardText = result ? formatReward(result.currencies, result.materials) : 'nothing';
    showFeedback('disenchant', `Disenchanted ${item.name} — ${rewardText}`);
    const remaining = useGameStore.getState().inventory
      .filter((i) => filter === 'all' || i.slot === filter)
      .sort((a, b) => {
        if (sort === 'rarity') return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        return b.iLvl - a.iLvl;
      });
    if (remaining.length > 0) {
      const nextIdx = Math.min(idx, remaining.length - 1);
      setSelectedItem(remaining[nextIdx]);
    } else {
      setSelectedItem(null);
    }
  };

  const handleDisenchantAll = () => {
    if (!confirm(`Disenchant all ${filteredInventory.length} items? This cannot be undone!`)) return;
    const items = [...filteredInventory];
    let totalCurr: Partial<Record<CurrencyType, number>> = {};
    let totalMats: Record<string, number> = {};
    let count = 0;
    for (const item of items) {
      const result = disenchantItem(item.id);
      if (result) {
        for (const [k, v] of Object.entries(result.currencies)) {
          totalCurr[k as CurrencyType] = (totalCurr[k as CurrencyType] || 0) + (v || 0);
        }
        for (const [k, v] of Object.entries(result.materials)) {
          totalMats[k] = (totalMats[k] || 0) + v;
        }
      }
      count++;
    }
    showFeedback('disenchant', `Disenchanted ${count} items — ${formatReward(totalCurr, totalMats)}`);
    setSelectedItem(null);
  };

  const handleCraft = (item: Item) => {
    if (!selectedCurrency) return;
    const affixKey = (a: Affix) => `${a.defId}:${a.tier}:${a.value}`;
    const beforeAll = [...item.prefixes, ...item.suffixes];
    const beforeKeys = new Set(beforeAll.map(affixKey));
    const result = craft(item.id, selectedCurrency);
    if (result) {
      if (result.success) {
        showFeedback('craft', `${result.message}`);
        setSelectedItem(result.item);
        const afterAll = [...result.item.prefixes, ...result.item.suffixes];
        const afterKeys = new Set(afterAll.map(affixKey));
        const added = afterAll.filter(a => !beforeKeys.has(affixKey(a)));
        const removed = beforeAll.filter(a => !afterKeys.has(affixKey(a)));
        const addedKeys = new Set(added.map(affixKey));
        setCraftDiff({ itemId: result.item.id, added, removed, addedKeys });
        if (craftDiffTimer.current) clearTimeout(craftDiffTimer.current);
        craftDiffTimer.current = setTimeout(() => setCraftDiff(null), 4000);
      } else {
        showFeedback('craft', result.message);
      }
    }
  };

  const isSelectedEquipped = selectedItem
    ? !inventory.some((i) => i.id === selectedItem.id)
    : false;
  const selectedEquipSlot = isSelectedEquipped && selectedItem
    ? (Object.entries(character.equipment).find(([, i]) => i?.id === selectedItem.id)?.[0] as GearSlot | undefined)
    : undefined;

  const equippedForComparison: Item | null = (() => {
    if (!selectedItem || isSelectedEquipped) return null;
    const equipped = character.equipment[selectedItem.slot];
    if (equipped) return equipped;
    if (selectedItem.slot === 'ring1') return character.equipment['ring2'] ?? null;
    if (selectedItem.slot === 'ring2') return character.equipment['ring1'] ?? null;
    return null;
  })();

  const handlePaperDollSelect = (item: Item, _slot: GearSlot) => {
    if (selectedCurrency) {
      handleCraft(item);
    } else {
      setSelectedItem(selectedItem?.id === item.id ? null : item);
    }
  };

  const handleItemTileClick = (item: Item) => {
    if (selectedCurrency) {
      handleCraft(item);
    } else {
      setSelectedItem(selectedItem?.id === item.id ? null : item);
    }
  };

  const selectedCurrencyDef = selectedCurrency
    ? CURRENCY_DEFS.find((c) => c.id === selectedCurrency)
    : null;

  const hasCurrencies = Object.values(currencies).some((v) => v > 0);

  const renderDetailPanel = () => {
    if (!selectedItem) return null;

    return (
      <div className="space-y-3">
        <div className={`rounded-lg border-2 p-3 space-y-2 ${RARITY_BG[selectedItem.rarity]}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{slotIcon(selectedItem.slot)}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white">{selectedItem.name}</div>
              <div className="text-xs text-gray-400">
                iLvl {selectedItem.iLvl} • {selectedItem.rarity} • {selectedItem.prefixes.length + selectedItem.suffixes.length} affixes
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-500 hover:text-white text-lg leading-none px-1"
              title="Deselect"
            >✕</button>
          </div>

          {Object.entries(selectedItem.baseStats).length > 0 && (
            <div className="text-xs text-gray-500">
              {Object.entries(selectedItem.baseStats).map(([k, v]) => (
                <span key={k} className="mr-2">{v} base {k}</span>
              ))}
            </div>
          )}

          <div className="space-y-0.5">
            {(() => {
              const diff = craftDiff?.itemId === selectedItem.id ? craftDiff : null;
              const affixKey = (a: Affix) => `${a.defId}:${a.tier}:${a.value}`;

              const renderAffix = (a: Affix, slot: string, i: number) => {
                const isNew = diff?.addedKeys.has(affixKey(a));
                return (
                  <div key={`${slot}-${i}`} className={`text-xs ${isNew ? 'text-green-400 animate-pulse' : TIER_COLORS[a.tier]} transition-colors`}>
                    {isNew && '+ '}{formatAffix(a)} <span className="text-gray-600">(T{a.tier} {slot})</span>
                  </div>
                );
              };

              return (
                <>
                  {diff?.removed.map((a, i) => (
                    <div key={`rm-${i}`} className="text-xs text-red-500/70 line-through animate-pulse">
                      − {formatAffix(a)} <span className="text-gray-600">(T{a.tier})</span>
                    </div>
                  ))}
                  {selectedItem.prefixes.map((a, i) => renderAffix(a, 'prefix', i))}
                  {selectedItem.suffixes.map((a, i) => renderAffix(a, 'suffix', i))}
                  {selectedItem.prefixes.length + selectedItem.suffixes.length === 0 && !diff?.removed.length && (
                    <div className="text-xs text-gray-600 italic">No affixes</div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex gap-2 pt-1">
            {isSelectedEquipped ? (
              <button
                onClick={() => {
                  if (selectedEquipSlot) {
                    unequipSlot(selectedEquipSlot);
                    setSelectedItem(null);
                  }
                }}
                className="flex-1 py-2 bg-yellow-700 hover:bg-yellow-600 text-white text-sm rounded-lg font-semibold"
              >
                Unequip
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>

          {selectedCurrency && selectedCurrencyDef && currencies[selectedCurrency] > 0 && (
            <button
              onClick={() => handleCraft(selectedItem)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg font-semibold transition-all"
            >
              Apply {selectedCurrencyDef.name}
            </button>
          )}
        </div>

        {equippedForComparison && (
          <ComparisonPanel selected={selectedItem} equipped={equippedForComparison} />
        )}
      </div>
    );
  };

  const renderInventoryColumn = () => (
    <div className="space-y-3">
      {/* Equipped Gear */}
      <div className="bg-gray-800 rounded-lg">
        <button
          onClick={() => setEquippedOpen(!equippedOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors rounded-t-lg"
        >
          <span>⚔️ Equipped Gear</span>
          <span className="text-xs text-gray-500">{equippedOpen ? '▲' : '▼'}</span>
        </button>

        {equippedOpen && (
          <div className="px-2 pb-2">
            <div className="flex gap-1.5">
              <div className="flex-1 flex flex-col gap-1">
                {(['helmet', 'neck', 'shoulders', 'cloak', 'chest', 'bracers'] as GearSlot[]).map((s) => (
                  <EquipSlotCard key={s} slot={s} item={character.equipment[s] ?? null}
                    selectedItemId={selectedItem?.id} selectedCurrency={selectedCurrency}
                    onSelect={handlePaperDollSelect} onHover={showTooltip} onLeave={hideTooltip} />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                {(['gloves', 'belt', 'pants', 'boots', 'ring1', 'ring2'] as GearSlot[]).map((s) => (
                  <EquipSlotCard key={s} slot={s} item={character.equipment[s] ?? null}
                    selectedItemId={selectedItem?.id} selectedCurrency={selectedCurrency}
                    onSelect={handlePaperDollSelect} onHover={showTooltip} onLeave={hideTooltip} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {(['mainhand', 'offhand', 'trinket1', 'trinket2'] as GearSlot[]).map((s) => (
                <EquipSlotCard key={s} slot={s} item={character.equipment[s] ?? null}
                  selectedItemId={selectedItem?.id} selectedCurrency={selectedCurrency}
                  onSelect={handlePaperDollSelect} onHover={showTooltip} onLeave={hideTooltip} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Currency Bar */}
      {hasCurrencies && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setCurrencyOpen(!currencyOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <span>💎 Currency</span>
            <span className="text-xs text-gray-500">{currencyOpen ? '▲' : '▼'}</span>
          </button>

          {!currencyOpen && (
            <div className="flex gap-2 px-3 pb-2 flex-wrap">
              {CURRENCY_DEFS.filter((c) => currencies[c.id] > 0).map((cur) => (
                <button
                  key={cur.id}
                  onClick={() => setSelectedCurrency(selectedCurrency === cur.id ? null : cur.id)}
                  className={`
                    flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all
                    ${selectedCurrency === cur.id
                      ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-700'}
                  `}
                >
                  <span>{cur.icon}</span>
                  <span className="font-semibold">{currencies[cur.id]}</span>
                </button>
              ))}
            </div>
          )}

          {currencyOpen && (
            <div className="grid grid-cols-3 gap-1 px-3 pb-3">
              {CURRENCY_DEFS.map((cur) => {
                const count = currencies[cur.id];
                return (
                  <button
                    key={cur.id}
                    onClick={() => setSelectedCurrency(selectedCurrency === cur.id ? null : cur.id)}
                    disabled={count === 0}
                    title={cur.description}
                    className={`
                      p-2 rounded-lg text-center transition-all
                      ${selectedCurrency === cur.id
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : count > 0
                          ? 'bg-gray-900 text-gray-300 hover:bg-gray-700'
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
          )}

          {selectedCurrencyDef && (
            <div className="text-xs text-purple-300 px-3 pb-2 space-y-1">
              <div className="bg-purple-950/50 rounded p-2">{selectedCurrencyDef.description}</div>
              <div className="text-gray-500 text-[10px]">Click an item to apply. Click the orb again to cancel.</div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Toast */}
      {disenchantMsg && (
        <div className="bg-purple-950 border border-purple-700 rounded-lg p-2 text-xs text-purple-300">
          {disenchantMsg}
        </div>
      )}
      {craftMsg && (
        <div className="bg-purple-950 border border-purple-700 rounded-lg p-2 text-xs text-purple-300">
          {craftMsg}
        </div>
      )}

      {/* Inventory Header + Filters */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-yellow-400">🎒 Bags ({inventory.length}/60)</h2>
          <div className="flex items-center gap-2">
            {/* Auto-salvage dropdown */}
            <label className="text-[10px] text-gray-500">Auto-salvage:</label>
            <select
              value={autoSalvageMinRarity}
              onChange={(e) => setAutoSalvageRarity(e.target.value as Rarity)}
              className="text-[10px] bg-gray-800 text-gray-300 border border-gray-600 rounded px-1 py-0.5"
            >
              {AUTO_SALVAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {filteredInventory.length > 0 && (
              <button
                onClick={handleDisenchantAll}
                className="px-2 py-0.5 rounded text-[10px] bg-red-900 hover:bg-red-800 text-red-300 font-semibold"
              >
                Disenchant All ({filteredInventory.length})
              </button>
            )}
          </div>
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
              {f === 'all' ? 'All' : `${slotIcon(f)} ${slotLabel(f)}`}
            </button>
          ))}
          <div className="flex-1" />
          {(['rarity', 'ilvl'] as const).map((s) => (
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
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
        {filteredInventory.map((item) => (
          <div
            key={item.id}
            className={`
              rounded-lg border p-1.5 cursor-pointer transition-all text-center
              ${RARITY_BG[item.rarity]}
              ${selectedItem?.id === item.id ? 'ring-2 ring-white scale-105' : ''}
              ${selectedCurrency ? 'hover:ring-2 hover:ring-purple-400' : 'hover:brightness-125'}
            `}
            onClick={() => handleItemTileClick(item)}
            onMouseEnter={(e) => showTooltip(e, item, item.slot)}
            onMouseLeave={hideTooltip}
          >
            <div className="text-lg">{slotIcon(item.slot)}</div>
            <div className="text-[10px] font-semibold truncate text-gray-200">{item.name}</div>
            <div className="text-[9px] text-gray-500">
              iLvl {item.iLvl} • {item.prefixes.length + item.suffixes.length}mod
            </div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 12 - filteredInventory.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/30 p-1.5 text-center flex flex-col items-center justify-center min-h-[64px]"
          >
            <div className="text-lg opacity-15">🎒</div>
          </div>
        ))}
      </div>

      {/* Materials */}
      {Object.keys(materials).length > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setMaterialsOpen(!materialsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <span>🪨 Materials</span>
            <span className="text-xs text-gray-500">{materialsOpen ? '▲' : '▼'}</span>
          </button>
          {materialsOpen && (
            <div className="grid grid-cols-2 gap-1 px-3 pb-3">
              {Object.entries(materials).filter(([, v]) => v > 0).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs bg-gray-900 rounded px-2 py-1">
                  <span className="text-gray-400">🪨 {key.replace(/_/g, ' ')}</span>
                  <span className="text-white font-semibold">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="hidden lg:grid lg:grid-cols-[1fr_2fr] lg:gap-4">
        <div className="lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {selectedItem ? renderDetailPanel() : (
            <div className="bg-gray-900 rounded-lg border border-gray-800 border-dashed p-6 text-center text-gray-500 text-sm">
              Select an item to see details
            </div>
          )}
        </div>
        {renderInventoryColumn()}
      </div>

      <div className="lg:hidden space-y-3">
        {renderInventoryColumn()}
        {selectedItem && renderDetailPanel()}
      </div>

      {/* Fixed-position hover tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className={`fixed z-[9999] w-56 rounded-lg border p-3 shadow-xl pointer-events-none text-left ${RARITY_TOOLTIP_BG[tooltip.item.rarity]}`}
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%) translateY(-8px)',
          }}
        >
          <div className="font-bold text-white text-sm">{tooltip.item.name}</div>
          <div className="text-[10px] text-gray-400 mb-1.5">
            iLvl {tooltip.item.iLvl} • {tooltip.item.rarity} • {slotLabel(tooltip.slot)}
          </div>

          {Object.entries(tooltip.item.baseStats).length > 0 && (
            <div className="text-[11px] text-gray-500 mb-1">
              {Object.entries(tooltip.item.baseStats).map(([k, v]) => (
                <span key={k} className="mr-2">{v} base {k}</span>
              ))}
            </div>
          )}

          {(tooltip.item.prefixes.length > 0 || tooltip.item.suffixes.length > 0) ? (
            <div className="space-y-0.5 border-t border-gray-700 pt-1">
              {tooltip.item.prefixes.map((a, i) => (
                <div key={`p-${i}`} className={`text-[11px] ${TIER_COLORS[a.tier]}`}>
                  {formatAffix(a)} <span className="text-gray-600">(T{a.tier} prefix)</span>
                </div>
              ))}
              {tooltip.item.suffixes.map((a, i) => (
                <div key={`s-${i}`} className={`text-[11px] ${TIER_COLORS[a.tier]}`}>
                  {formatAffix(a)} <span className="text-gray-600">(T{a.tier} suffix)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-600 italic">No affixes</div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonPanel({ selected, equipped }: { selected: Item; equipped: Item }) {
  const getStatMap = (item: Item): Record<string, number> => {
    const stats: Record<string, number> = {};
    for (const [k, v] of Object.entries(item.baseStats)) {
      if (typeof v === 'number') stats[k] = (stats[k] ?? 0) + v;
    }
    for (const affix of [...item.prefixes, ...item.suffixes]) {
      const def = getAffixDef(affix.defId);
      if (def) stats[def.category] = (stats[def.category] ?? 0) + affix.value;
    }
    return stats;
  };

  const selectedStats = getStatMap(selected);
  const equippedStats = getStatMap(equipped);
  const allKeys = [...new Set([...Object.keys(selectedStats), ...Object.keys(equippedStats)])];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 space-y-2">
      <div className="text-xs font-semibold text-gray-400">vs Equipped ({slotLabel(equipped.slot)})</div>
      {allKeys.length > 0 && (
        <div className="space-y-0.5">
          {allKeys.map((key) => {
            const selVal = selectedStats[key] ?? 0;
            const eqVal = equippedStats[key] ?? 0;
            const d = selVal - eqVal;
            if (d === 0) return null;
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                <span className={d > 0 ? 'text-green-400' : 'text-red-400'}>
                  {d > 0 ? '+' : ''}{d}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EquipSlotCard({
  slot, item, selectedItemId, selectedCurrency, onSelect, onHover, onLeave,
}: {
  slot: GearSlot;
  item: Item | null;
  selectedItemId?: string;
  selectedCurrency: CurrencyType | null;
  onSelect: (item: Item, slot: GearSlot) => void;
  onHover: (e: React.MouseEvent, item: Item, slot: GearSlot) => void;
  onLeave: () => void;
}) {
  const isSelected = item != null && item.id === selectedItemId;

  if (!item) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/40 flex flex-col items-center justify-center py-1.5">
        <span className="text-xl opacity-20">{slotIcon(slot)}</span>
        <span className="text-[8px] text-gray-600 mt-0.5">{slotLabel(slot)}</span>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-lg border-2 p-1.5 cursor-pointer transition-all
        flex flex-col items-center justify-center text-center
        ${RARITY_BG[item.rarity]} ${RARITY_BORDER_RING[item.rarity]}
        ${isSelected ? 'ring-2 ring-white scale-105' : ''}
        ${selectedCurrency ? 'hover:ring-2 hover:ring-purple-400' : 'hover:brightness-125'}
      `}
      onClick={() => onSelect(item, slot)}
      onMouseEnter={(e) => onHover(e, item, slot)}
      onMouseLeave={onLeave}
    >
      <span className="text-xl leading-none">{slotIcon(slot)}</span>
      <div className="text-[9px] font-semibold text-gray-200 truncate w-full mt-0.5 px-0.5">{item.name}</div>
      <div className="text-[8px] text-gray-400">iLvl {item.iLvl}</div>
    </div>
  );
}

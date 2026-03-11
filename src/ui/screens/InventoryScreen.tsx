import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useGameStore, SELL_GOLD } from '../../store/gameStore';
import { Item, Affix, GearSlot, CurrencyType, Rarity, StatKey, ArmorType } from '../../types';
import { CURRENCY_DEFS, calcBagCapacity, getBagDef } from '../../data/items';
import { formatAffix, getBestTierForILvl, isUpgradeOver, getComparisonTarget, calcItemStatContribution } from '../../engine/items';
import { formatCorruptionAffix } from '../../data/corruptionAffixes';
import { slotLabel, DROPPABLE_SLOTS } from '../slotConfig';
import { ItemIcon, SlotIcon, getSlotEmoji } from '../itemIcon';
import { CraftIcon } from '../craftIcon';
import { useIsMobile } from '../hooks/useIsMobile';

const SLOT_ORDER: GearSlot[] = DROPPABLE_SLOTS;

/** All 16 gear slots for the mobile compact strip (DROPPABLE_SLOTS is only 14). */
const ALL_GEAR_SLOTS: GearSlot[] = [
  'helmet', 'neck', 'shoulders', 'cloak', 'chest', 'bracers',
  'gloves', 'belt', 'pants', 'boots', 'ring1', 'ring2',
  'mainhand', 'offhand', 'trinket1', 'trinket2',
];

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

const RARITY_TILE_BORDER: Record<Rarity, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
};

const RARITY_GRADIENT: Record<Rarity, string> = {
  common: 'from-green-900/50',
  uncommon: 'from-blue-900/50',
  rare: 'from-yellow-900/50',
  epic: 'from-purple-900/50',
  legendary: 'from-orange-900/50',
};

/** Corrupted item tile: gradient from rarity color into fuchsia */
const CORRUPTED_TILE_GRADIENT: Record<Rarity, string> = {
  common: 'from-green-900/50 via-fuchsia-900/40',
  uncommon: 'from-blue-900/50 via-fuchsia-900/40',
  rare: 'from-yellow-900/50 via-fuchsia-900/40',
  epic: 'from-purple-900/50 via-fuchsia-900/40',
  legendary: 'from-orange-900/50 via-fuchsia-900/40',
};

const ARMOR_TYPE_BADGE: Record<ArmorType, { label: string; cls: string }> = {
  plate:   { label: 'Plate',   cls: 'bg-gray-600 text-gray-200' },
  leather: { label: 'Leather', cls: 'bg-amber-900 text-amber-200' },
  cloth:   { label: 'Cloth',   cls: 'bg-purple-900 text-purple-200' },
};

const WEAPON_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  sword:      { label: '1H Sword',      cls: 'bg-red-900 text-red-200' },
  axe:        { label: '1H Axe',        cls: 'bg-red-900 text-red-200' },
  mace:       { label: '1H Mace',       cls: 'bg-red-900 text-red-200' },
  dagger:     { label: '1H Dagger',     cls: 'bg-yellow-900 text-yellow-200' },
  scepter:    { label: '1H Scepter',    cls: 'bg-yellow-900 text-yellow-200' },
  wand:       { label: '1H Wand',       cls: 'bg-blue-900 text-blue-200' },
  gauntlet:   { label: '1H Gauntlet',   cls: 'bg-blue-900 text-blue-200' },
  greatsword: { label: '2H Greatsword', cls: 'bg-red-900 text-red-200' },
  greataxe:   { label: '2H Greataxe',   cls: 'bg-red-900 text-red-200' },
  maul:       { label: '2H Maul',       cls: 'bg-red-900 text-red-200' },
  bow:        { label: '2H Bow',        cls: 'bg-green-900 text-green-200' },
  crossbow:   { label: '2H Crossbow',   cls: 'bg-green-900 text-green-200' },
  staff:      { label: '2H Staff',      cls: 'bg-blue-900 text-blue-200' },
  tome:       { label: '2H Tome',       cls: 'bg-blue-900 text-blue-200' },
};

const OFFHAND_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  shield: { label: 'Shield', cls: 'bg-gray-600 text-gray-200' },
  focus:  { label: 'Focus',  cls: 'bg-blue-900 text-blue-200' },
  quiver: { label: 'Quiver', cls: 'bg-green-900 text-green-200' },
};

const AUTO_SALVAGE_OPTIONS: { value: Rarity; label: string }[] = [
  { value: 'common', label: 'None' },
  { value: 'uncommon', label: 'Common' },
  { value: 'rare', label: '≤ Uncommon' },
  { value: 'epic', label: '≤ Rare' },
];

export default function InventoryScreen() {
  const {
    character, inventory, currencies, gold,
    bagSlots, bagStash, equipBag, sellBag, salvageBag,
    equipItem, unequipSlot, disenchantItem, sellItem, craft,
    autoSalvageMinRarity, setAutoSalvageRarity,
    autoDisposalAction, setAutoDisposalAction,
    tutorialStep,
  } = useGameStore();
  const isMobile = useIsMobile();
  const inventoryCapacity = calcBagCapacity(bagSlots);
  const detailRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);
  const [filter, setFilter] = useState<GearSlot | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [sort, setSort] = useState<'rarity' | 'ilvl'>('ilvl');
  const [disenchantMsg, setDisenchantMsg] = useState<string | null>(null);
  const [craftMsg, setCraftMsg] = useState<string | null>(null);
  const [equippedOpen, setEquippedOpen] = useState(true);
  const [bagsExpanded, setBagsExpanded] = useState(false);
  const [currencyTip, setCurrencyTip] = useState<CurrencyType | null>(null);

  const [tooltip, setTooltip] = useState<{ item: Item; slot: GearSlot; x: number; y: number; rectHeight: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; visible: boolean }>({ left: 0, top: 0, visible: false });

  const upgradeSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of inventory) {
      const target = getComparisonTarget(item.slot, character.equipment);
      if (target && isUpgradeOver(item, target)) set.add(item.id);
    }
    return set;
  }, [inventory, character.equipment]);

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
    setTooltip({ item, slot, x: rect.left + rect.width / 2, y: rect.top, rectHeight: rect.height });
  };
  const hideTooltip = () => { setTooltip(null); setTooltipPos({ left: 0, top: 0, visible: false }); };

  // Position tooltip after render to avoid viewport clipping
  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) {
      return;
    }
    const ttRect = tooltipRef.current.getBoundingClientRect();
    const ttWidth = ttRect.width;
    const ttHeight = ttRect.height;
    const pad = 8;

    // Default: above the item
    let left = tooltip.x - ttWidth / 2;
    let top = tooltip.y - ttHeight - pad;

    // If clipping above viewport, flip below
    if (top < pad) {
      top = tooltip.y + tooltip.rectHeight + pad;
    }
    // Clamp left/right
    left = Math.max(pad, Math.min(left, window.innerWidth - ttWidth - pad));

    setTooltipPos({ left, top, visible: true });
  }, [tooltip]);

  const filteredInventory = inventory
    .filter((i) => filter === 'all' || i.slot === filter)
    .filter((i) => rarityFilter === 'all' || i.rarity === rarityFilter)
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

  const equipProfessionGear = useGameStore.getState().equipProfessionGear;
  const handleEquip = (item: Item) => {
    if (item.isProfessionGear) {
      equipProfessionGear(item.id);
    } else {
      equipItem(item);
    }
    setSelectedItem(null);
    setSelectedCurrency(null);
  };

  const advanceSelection = (idx: number) => {
    const remaining = useGameStore.getState().inventory
      .filter((i) => filter === 'all' || i.slot === filter)
      .sort((a, b) => {
        if (sort === 'rarity') return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        return b.iLvl - a.iLvl;
      });
    if (remaining.length > 0) {
      setSelectedItem(remaining[Math.min(idx, remaining.length - 1)]);
    } else {
      setSelectedItem(null);
      setSelectedCurrency(null);
    }
  };

  const handleDisenchant = (item: Item) => {
    const idx = filteredInventory.findIndex((i) => i.id === item.id);
    const result = disenchantItem(item.id);
    const rewardText = result ? formatReward(result.currencies, result.materials) : 'nothing';
    showFeedback('disenchant', `Disenchanted ${item.name} — ${rewardText}`);
    advanceSelection(idx);
  };

  const calcSellValue = (item: Item) => SELL_GOLD[item.rarity] + Math.floor(item.iLvl / 5);

  const handleSell = (item: Item) => {
    const idx = filteredInventory.findIndex((i) => i.id === item.id);
    const goldGained = sellItem(item.id);
    if (goldGained !== null) {
      showFeedback('disenchant', `Sold ${item.name} for ${goldGained}g`);
    }
    advanceSelection(idx);
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
    setSelectedCurrency(null);
  };

  const handleSellAll = () => {
    if (!confirm(`Sell all ${filteredInventory.length} items? This cannot be undone!`)) return;
    let totalGold = 0;
    let count = 0;
    for (const item of [...filteredInventory]) {
      const g = sellItem(item.id);
      if (g !== null) { totalGold += g; count++; }
    }
    showFeedback('disenchant', `Sold ${count} items for ${totalGold}g`);
    setSelectedItem(null);
    setSelectedCurrency(null);
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
        // Keep currency selected so player can spam-apply
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
        <div className={`rounded-lg border-2 p-3 space-y-2 ${RARITY_BG[selectedItem.rarity]} ${selectedItem.isCorrupted ? 'bg-gradient-to-br from-transparent to-fuchsia-950/60 ring-1 ring-fuchsia-500/40' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className={selectedItem.isCorrupted ? 'text-fuchsia-300' : ''}>{selectedItem.name}</span>
                {selectedItem.isCorrupted && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-fuchsia-800 text-fuchsia-200 font-bold shrink-0">VOID</span>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                <span>iLvl {selectedItem.iLvl} • {selectedItem.rarity} • {selectedItem.prefixes.length + selectedItem.suffixes.length} affixes • <span className="text-gray-500">T{getBestTierForILvl(selectedItem.iLvl)}+</span></span>
                {selectedItem.armorType && ARMOR_TYPE_BADGE[selectedItem.armorType] && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${ARMOR_TYPE_BADGE[selectedItem.armorType].cls}`}>
                    {ARMOR_TYPE_BADGE[selectedItem.armorType].label}
                  </span>
                )}
                {selectedItem.weaponType && WEAPON_TYPE_BADGE[selectedItem.weaponType] && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${WEAPON_TYPE_BADGE[selectedItem.weaponType].cls}`}>
                    {WEAPON_TYPE_BADGE[selectedItem.weaponType].label}
                  </span>
                )}
                {selectedItem.offhandType && OFFHAND_TYPE_BADGE[selectedItem.offhandType] && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${OFFHAND_TYPE_BADGE[selectedItem.offhandType].cls}`}>
                    {OFFHAND_TYPE_BADGE[selectedItem.offhandType].label}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => { setSelectedItem(null); setSelectedCurrency(null); }}
              className="text-gray-500 hover:text-white text-lg leading-none px-1 flex-shrink-0"
              title="Deselect"
            >✕</button>
          </div>
          <div className="flex justify-center">
            <ItemIcon item={selectedItem} size="lg" className="!w-20 !h-20" />
          </div>

          {Object.entries(selectedItem.baseStats).length > 0 && (
            <div className="text-xs text-gray-500">
              {Object.entries(selectedItem.baseStats).map(([k, v]) => (
                <span key={k} className="mr-2">{v} base {k}</span>
              ))}
            </div>
          )}

          {selectedItem.implicit && (
            <div className="text-sm text-fuchsia-400 border-t border-fuchsia-800 pt-1 pb-0.5">
              {formatCorruptionAffix(selectedItem.implicit)}
            </div>
          )}

          <div className="space-y-0.5">
            {(() => {
              const diff = craftDiff?.itemId === selectedItem.id ? craftDiff : null;
              const affixKey = (a: Affix) => `${a.defId}:${a.tier}:${a.value}`;

              const bestTier = getBestTierForILvl(selectedItem.iLvl);
              const renderAffix = (a: Affix, slot: string, i: number) => {
                const isNew = diff?.addedKeys.has(affixKey(a));
                const isBest = a.tier === bestTier;
                return (
                  <div key={`${slot}-${i}`} className={`text-xs ${isNew ? 'text-green-400 animate-pulse' : TIER_COLORS[a.tier]} transition-colors`}>
                    {isNew && '+ '}{formatAffix(a)} <span className="text-gray-600">(T{a.tier} {slot})</span>
                    {isBest && <span className="text-yellow-500 ml-1" title="Best tier for this item level">★</span>}
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
                    setSelectedCurrency(null);
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
                  className={`flex-1 py-2 ${selectedItem.isProfessionGear ? 'bg-teal-700 hover:bg-teal-600' : 'bg-green-700 hover:bg-green-600'} text-white text-sm rounded-lg font-semibold`}
                >
                  {selectedItem.isProfessionGear ? 'Equip (Prof)' : 'Equip'}
                </button>
                <button
                  onClick={() => handleSell(selectedItem)}
                  className="py-2 px-3 bg-yellow-800 hover:bg-yellow-700 text-yellow-200 text-sm rounded-lg font-semibold"
                  title="Sell to vendor for gold"
                >
                  {calcSellValue(selectedItem)}g
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

          {/* Inline currency selector (inside detail panel) */}
          {hasCurrencies && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {CURRENCY_DEFS.filter((c) => currencies[c.id] > 0).map((cur) => (
                <button
                  key={cur.id}
                  onClick={() => setSelectedCurrency(selectedCurrency === cur.id ? null : cur.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all
                    ${selectedCurrency === cur.id
                      ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                      : 'bg-gray-800 text-gray-400'}`}
                >
                  <CraftIcon category="currency" id={cur.id} fallback={cur.icon} size="sm" />
                  <span className="font-semibold">{currencies[cur.id]}</span>
                </button>
              ))}
            </div>
          )}

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

  const renderEquippedGear = () => (
    <div className="bg-gray-800 rounded-lg">
      {isMobile ? (
        <>
          <button
            onClick={() => setEquippedOpen(!equippedOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors rounded-t-lg"
          >
            <span>Equipped Gear</span>
            <span className="text-xs text-gray-500">{equippedOpen ? '\u25B2' : '\u25BC'}</span>
          </button>
          {equippedOpen && (
            <div className="px-2 pb-2">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {ALL_GEAR_SLOTS.map((s) => {
                  const item = character.equipment[s] ?? null;
                  return (
                    <div
                      key={s}
                      className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition-all
                        ${item ? `border-2 ${RARITY_BG[item.rarity]} ${RARITY_BORDER_RING[item.rarity]}` : 'border-2 border-dashed border-gray-700 bg-gray-900/40'}
                        ${selectedItem?.id === item?.id ? 'ring-2 ring-white' : ''}
                        ${selectedCurrency ? 'hover:ring-2 hover:ring-purple-400' : ''}`}
                      onClick={() => item && handlePaperDollSelect(item, s)}
                    >
                      {item ? <ItemIcon item={item} size="md" /> : <SlotIcon slot={s} size="md" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-2 space-y-1.5">
          <div className="text-sm font-bold text-gray-300 px-1">Equipped Gear</div>
          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              {(['helmet', 'neck', 'shoulders', 'cloak', 'chest', 'bracers'] as GearSlot[]).map((s) => (
                <EquipSlotCard key={s} slot={s} item={character.equipment[s] ?? null}
                  selectedItemId={selectedItem?.id} selectedCurrency={selectedCurrency}
                  onSelect={handlePaperDollSelect} onHover={showTooltip} onLeave={hideTooltip} isMobile={isMobile} />
              ))}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              {(['gloves', 'belt', 'pants', 'boots', 'ring1', 'ring2'] as GearSlot[]).map((s) => (
                <EquipSlotCard key={s} slot={s} item={character.equipment[s] ?? null}
                  selectedItemId={selectedItem?.id} selectedCurrency={selectedCurrency}
                  onSelect={handlePaperDollSelect} onHover={showTooltip} onLeave={hideTooltip} isMobile={isMobile} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(['mainhand', 'offhand', 'trinket1', 'trinket2'] as GearSlot[]).map((s) => (
              <EquipSlotCard key={s} slot={s} item={character.equipment[s] ?? null}
                selectedItemId={selectedItem?.id} selectedCurrency={selectedCurrency}
                onSelect={handlePaperDollSelect} onHover={showTooltip} onLeave={hideTooltip} isMobile={isMobile} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLootColumn = () => (
    <div className="space-y-3">
      {/* Currency Summary Strip */}
      <div className="flex flex-wrap gap-2 bg-gray-800 rounded-lg px-3 py-2 items-center">
        <span className="text-xs font-semibold text-yellow-400">{'\uD83D\uDCB0'} {gold}g</span>
        {CURRENCY_DEFS.map((cur) => (
          <div
            key={cur.id}
            className="relative group"
            onClick={isMobile ? () => setCurrencyTip(currencyTip === cur.id ? null : cur.id) : undefined}
          >
            <div className={`text-xs flex items-center gap-1 cursor-default ${currencies[cur.id] > 0 ? 'text-gray-300' : 'text-gray-600 opacity-40'}`}>
              <CraftIcon category="currency" id={cur.id} fallback={cur.icon} size="sm" />
              <span className="font-semibold">{currencies[cur.id]}</span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">{cur.name.replace(' Shard', '').replace('Greater ', 'G.').replace('Perfect ', 'P.')}</span>
            </div>
            {/* Tooltip: hover on desktop, tap on mobile */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-gray-900 border border-gray-600 rounded-lg p-2 shadow-xl z-50 pointer-events-none text-left
              ${isMobile ? (currencyTip === cur.id ? 'block' : 'hidden') : 'hidden group-hover:block'}`}>
              <div className="text-xs font-bold text-white">{cur.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{cur.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Header + Filters */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setBagsExpanded(!bagsExpanded)}
            className={`text-sm font-bold flex items-center gap-1 ${inventory.length >= inventoryCapacity ? 'text-red-400' : inventory.length >= inventoryCapacity * 0.8 ? 'text-yellow-400' : 'text-yellow-400'}`}
          >
            <span className={`text-xs transition-transform ${bagsExpanded ? 'rotate-90' : ''}`}>{'\u25B6'}</span>
            {'\u{1F392}'} Bags ({inventory.length}/{inventoryCapacity})
          </button>
          {filteredInventory.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={handleSellAll}
                className="px-2 py-0.5 rounded text-xs bg-yellow-900 hover:bg-yellow-800 text-yellow-300 font-semibold"
              >
                Sell All ({filteredInventory.length})
              </button>
              <button
                onClick={handleDisenchantAll}
                className="px-2 py-0.5 rounded text-xs bg-red-900 hover:bg-red-800 text-red-300 font-semibold"
              >
                Disenchant All ({filteredInventory.length})
              </button>
            </div>
          )}
        </div>
        {/* Collapsible bag management panel */}
        {bagsExpanded && (
          <div className="bg-gray-800/60 rounded-lg p-2 mb-2 space-y-2">
            {/* Equipped bag slots */}
            <div className="flex gap-1">
              {bagSlots.map((slotId, i) => {
                const def = getBagDef(slotId);
                const tierBorder = ['border-gray-500', 'border-green-500', 'border-blue-500', 'border-purple-500', 'border-orange-500'][def.tier - 1] ?? 'border-gray-500';
                return (
                  <div key={i} className={`flex-1 bg-gray-900 rounded border ${tierBorder} p-1.5 text-center`}>
                    <div className="text-[10px] text-gray-300 font-semibold truncate">{def.name}</div>
                    <div className="text-xs text-gray-500">[{def.capacity}]</div>
                  </div>
                );
              })}
            </div>
            {/* Stashed bags */}
            {Object.keys(bagStash).length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-semibold">Stash</div>
                {Object.entries(bagStash).filter(([, count]) => count > 0).map(([bagId, count]) => {
                  const def = getBagDef(bagId);
                  const tierColor = ['text-gray-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-orange-400'][def.tier - 1] ?? 'text-gray-400';
                  return (
                    <div key={bagId} className="flex items-center gap-2 bg-gray-900/60 rounded px-2 py-1">
                      <span className={`text-xs font-semibold flex-1 ${tierColor}`}>
                        {def.name} [{def.capacity}] {count > 1 && <span className="text-gray-500">x{count}</span>}
                      </span>
                      <button
                        onClick={() => {
                          // Find weakest equipped slot (lowest tier/capacity) and equip there
                          let weakestIdx = 0;
                          let weakestCap = Infinity;
                          bagSlots.forEach((sid, idx) => {
                            const c = getBagDef(sid).capacity;
                            if (c < weakestCap) { weakestCap = c; weakestIdx = idx; }
                          });
                          equipBag(bagId, weakestIdx);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-green-900 hover:bg-green-800 text-green-300 font-semibold"
                      >
                        Equip
                      </button>
                      <button
                        onClick={() => sellBag(bagId)}
                        className="px-2 py-0.5 rounded text-[10px] bg-yellow-900 hover:bg-yellow-800 text-yellow-300 font-semibold"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => salvageBag(bagId)}
                        className="px-2 py-0.5 rounded text-[10px] bg-purple-900 hover:bg-purple-800 text-purple-300 font-semibold"
                      >
                        Salvage
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-gray-500 shrink-0">Auto:</label>
          <div className="flex rounded overflow-hidden border border-gray-600 shrink-0">
            <button
              onClick={() => setAutoDisposalAction('salvage')}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                autoDisposalAction === 'salvage'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >Salvage</button>
            <button
              onClick={() => setAutoDisposalAction('sell')}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                autoDisposalAction === 'sell'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >Sell</button>
          </div>
          <select
            value={autoSalvageMinRarity}
            onChange={(e) => setAutoSalvageRarity(e.target.value as Rarity)}
            className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1"
          >
            {AUTO_SALVAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Feedback Toast (near actions so visible on mobile) */}
        {disenchantMsg && (
          <div className="bg-purple-950 border border-purple-700 rounded-lg p-2 text-xs text-purple-300 mb-1">
            {disenchantMsg}
          </div>
        )}
        {craftMsg && (
          <div className="bg-purple-950 border border-purple-700 rounded-lg p-2 text-xs text-purple-300 mb-1">
            {craftMsg}
          </div>
        )}
        {inventory.length >= inventoryCapacity && (
          <div className="text-xs text-amber-400 bg-amber-950/50 rounded px-2 py-1 mb-1">
            Bags full — gear drops from zones will be auto-salvaged into materials.
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as GearSlot | 'all')}
            className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1"
          >
            <option value="all">All Slots</option>
            {SLOT_ORDER.map((s) => (
              <option key={s} value={s}>{getSlotEmoji(s)} {slotLabel(s)}</option>
            ))}
          </select>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as Rarity | 'all')}
            className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1"
          >
            <option value="all">All Rarities</option>
            <option value="legendary">Legendary</option>
            <option value="epic">Epic</option>
            <option value="rare">Rare</option>
            <option value="uncommon">Uncommon</option>
            <option value="common">Common</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'rarity' | 'ilvl')}
            className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1"
          >
            <option value="ilvl">Sort: iLvl</option>
            <option value="rarity">Sort: Rarity</option>
          </select>
        </div>
      </div>

      {/* Item Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
        {filteredInventory.map((item) => (
          <div
            key={item.id}
            className={`
              relative aspect-square rounded-lg border-2 cursor-pointer transition-all
              flex items-center justify-center overflow-hidden bg-gray-900
              ${RARITY_TILE_BORDER[item.rarity]}
              ${item.isCorrupted && selectedItem?.id !== item.id ? 'ring-2 ring-fuchsia-500/60' : ''}
              ${selectedItem?.id === item.id ? 'ring-2 ring-white scale-105' : ''}
              ${selectedCurrency ? 'hover:ring-2 hover:ring-purple-400' : 'hover:brightness-125'}
              ${tutorialStep === 1 && item.slot === 'mainhand' ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
            `}
            onClick={() => handleItemTileClick(item)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (item.isProfessionGear) {
                equipProfessionGear(item.id);
              } else {
                equipItem(item);
              }
              setSelectedItem(null);
              setSelectedCurrency(null);
            }}
            onMouseEnter={isMobile ? undefined : (e) => showTooltip(e, item, item.slot)}
            onMouseLeave={isMobile ? undefined : hideTooltip}
          >
            {/* Rarity gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t ${item.isCorrupted ? CORRUPTED_TILE_GRADIENT[item.rarity] : RARITY_GRADIENT[item.rarity]} to-transparent pointer-events-none`} />
            {/* Icon */}
            <ItemIcon item={item} size="lg" />
            {/* Badges */}
            {upgradeSet.has(item.id) && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-lg z-10"
                title="Upgrade for equipped slot"
              >{'\u25B2'}</div>
            )}
            {item.isCrafted && !item.isProfessionGear && (
              <div
                className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-lg z-10 ring-1 ring-amber-400/60"
                title="Crafted item"
              >{'\uD83D\uDD28'}</div>
            )}
            {item.isProfessionGear && (
              <div
                className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-teal-600 rounded-full flex items-center justify-center text-white text-[7px] font-bold shadow-lg z-10 ring-1 ring-teal-400/60"
                title="Profession gear"
              >{'\u2699\uFE0F'}</div>
            )}
            {item.armorType && (
              <div className={`absolute bottom-0 right-0 px-0.5 py-px rounded-tl text-[7px] font-bold z-10 ${ARMOR_TYPE_BADGE[item.armorType].cls}`}>
                {item.armorType === 'plate' ? 'P' : item.armorType === 'leather' ? 'L' : 'C'}
              </div>
            )}
            {item.weaponType && WEAPON_TYPE_BADGE[item.weaponType] && (
              <div className={`absolute bottom-0 right-0 px-0.5 py-px rounded-tl text-[7px] font-bold z-10 ${WEAPON_TYPE_BADGE[item.weaponType].cls}`}>
                {WEAPON_TYPE_BADGE[item.weaponType].label}
              </div>
            )}
            {item.offhandType && OFFHAND_TYPE_BADGE[item.offhandType] && (
              <div className={`absolute bottom-0 right-0 px-0.5 py-px rounded-tl text-[7px] font-bold z-10 ${OFFHAND_TYPE_BADGE[item.offhandType].cls}`}>
                {OFFHAND_TYPE_BADGE[item.offhandType].label}
              </div>
            )}
            {item.isCorrupted && (
              <div
                className="absolute bottom-0 left-0 px-0.5 py-px rounded-tr text-[7px] font-bold z-10 bg-fuchsia-800 text-fuchsia-200"
                title="Void Corrupted"
              >VOID</div>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 10 - filteredInventory.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/30 flex items-center justify-center"
          >
            <span className="text-lg opacity-15">{'\uD83C\uDF92'}</span>
          </div>
        ))}
      </div>

      {/* Inline detail panel below grid (desktop only) */}
      {!isMobile && selectedItem && renderDetailPanel()}
    </div>
  );

  return (
    <div className="max-w-4xl xl:max-w-7xl mx-auto overflow-x-hidden">
      {/* Desktop: two-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-4">
        {/* Left: equipped gear (sticky) */}
        <div className="lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {renderEquippedGear()}
        </div>
        {/* Right: loot grid + inline detail */}
        {renderLootColumn()}
      </div>

      {/* Mobile / small screen: stacked */}
      <div className="lg:hidden space-y-3">
        {renderEquippedGear()}
        {renderLootColumn()}
      </div>

      {/* Mobile bottom sheet overlay */}
      {isMobile && selectedItem && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-[9998] flex flex-col max-h-[60vh]">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => { setSelectedItem(null); setSelectedCurrency(null); }}
          />
          <div
            ref={detailRef}
            className="relative bg-gray-900 border-t border-gray-600 rounded-t-2xl overflow-y-auto p-3 shadow-2xl"
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-2" />
            {renderDetailPanel()}
          </div>
        </div>
      )}

      {/* Fixed-position hover tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className={`fixed z-[9999] w-64 rounded-lg border p-3 shadow-xl pointer-events-none text-left ${RARITY_TOOLTIP_BG[tooltip.item.rarity]} ${tooltip.item.isCorrupted ? 'bg-gradient-to-br from-transparent to-fuchsia-950/60 ring-1 ring-fuchsia-500/40' : ''}`}
          style={{
            left: `${tooltipPos.left}px`,
            top: `${tooltipPos.top}px`,
            visibility: tooltipPos.visible ? 'visible' : 'hidden',
          }}
        >
          <div className="font-bold text-white text-sm flex items-center gap-1.5">
            <span className={tooltip.item.isCorrupted ? 'text-fuchsia-300' : ''}>{tooltip.item.name}</span>
            {tooltip.item.isCorrupted && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-fuchsia-800 text-fuchsia-200 font-bold shrink-0">VOID</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1 flex-wrap">
            <span>iLvl {tooltip.item.iLvl} • {tooltip.item.rarity} • {slotLabel(tooltip.slot)} • <span className="text-gray-500">T{getBestTierForILvl(tooltip.item.iLvl)}+</span></span>
            {tooltip.item.armorType && ARMOR_TYPE_BADGE[tooltip.item.armorType] && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${ARMOR_TYPE_BADGE[tooltip.item.armorType].cls}`}>
                {ARMOR_TYPE_BADGE[tooltip.item.armorType].label}
              </span>
            )}
            {tooltip.item.weaponType && WEAPON_TYPE_BADGE[tooltip.item.weaponType] && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${WEAPON_TYPE_BADGE[tooltip.item.weaponType].cls}`}>
                {WEAPON_TYPE_BADGE[tooltip.item.weaponType].label}
              </span>
            )}
            {tooltip.item.offhandType && OFFHAND_TYPE_BADGE[tooltip.item.offhandType] && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${OFFHAND_TYPE_BADGE[tooltip.item.offhandType].cls}`}>
                {OFFHAND_TYPE_BADGE[tooltip.item.offhandType].label}
              </span>
            )}
          </div>

          {Object.entries(tooltip.item.baseStats).length > 0 && (
            <div className="text-sm text-gray-500 mb-1">
              {Object.entries(tooltip.item.baseStats).map(([k, v]) => (
                <span key={k} className="mr-2">{v} base {k}</span>
              ))}
            </div>
          )}

          {tooltip.item.implicit && (
            <div className="text-sm text-fuchsia-400 border-t border-fuchsia-800 pt-1 pb-0.5">
              {formatCorruptionAffix(tooltip.item.implicit)}
            </div>
          )}

          {(tooltip.item.prefixes.length > 0 || tooltip.item.suffixes.length > 0) ? (
            <div className="space-y-0.5 border-t border-gray-700 pt-1">
              {(() => {
                const best = getBestTierForILvl(tooltip.item.iLvl);
                return (
                  <>
                    {tooltip.item.prefixes.map((a, i) => (
                      <div key={`p-${i}`} className={`text-sm ${TIER_COLORS[a.tier]}`}>
                        {formatAffix(a)} <span className="text-gray-600">(T{a.tier} prefix)</span>
                        {a.tier === best && <span className="text-yellow-500 ml-1">★</span>}
                      </div>
                    ))}
                    {tooltip.item.suffixes.map((a, i) => (
                      <div key={`s-${i}`} className={`text-sm ${TIER_COLORS[a.tier]}`}>
                        {formatAffix(a)} <span className="text-gray-600">(T{a.tier} suffix)</span>
                        {a.tier === best && <span className="text-yellow-500 ml-1">★</span>}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-sm text-gray-600 italic">No affixes</div>
          )}

          {/* Inline stat comparison for inventory items */}
          {(() => {
            const isInInventory = inventory.some(i => i.id === tooltip.item.id);
            if (!isInInventory) return null;
            const equipped = getComparisonTarget(tooltip.item.slot, character.equipment);
            if (!equipped) return null;
            const candStats = calcItemStatContribution(tooltip.item);
            const eqStats = calcItemStatContribution(equipped);
            const allKeys = [...new Set([...Object.keys(candStats), ...Object.keys(eqStats)])] as StatKey[];
            const deltas = allKeys
              .map(k => ({ key: k, delta: (candStats[k] ?? 0) - (eqStats[k] ?? 0) }))
              .filter(d => d.delta !== 0);
            if (deltas.length === 0) return null;
            return (
              <div className="border-t border-gray-700 pt-1 mt-1 space-y-0.5">
                <div className="text-xs text-gray-500">vs {equipped.name}</div>
                {deltas.map(d => (
                  <div key={d.key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{STAT_LABELS[d.key] ?? d.key}</span>
                    <span className={d.delta > 0 ? 'text-green-400' : 'text-red-400'}>
                      {d.delta > 0 ? '+' : ''}{d.delta}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


const STAT_LABELS: Record<StatKey, string> = {
  flatPhysDamage: 'Phys Damage',
  flatAtkFireDamage: 'Fire Atk',
  flatAtkColdDamage: 'Cold Atk',
  flatAtkLightningDamage: 'Lightning Atk',
  flatAtkChaosDamage: 'Chaos Atk',
  attackSpeed: 'Attack Speed',
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
  incMeleeDamage: '% Melee',
  incProjectileDamage: '% Projectile',
  incAoEDamage: '% AoE',
  incDoTDamage: '% DoT',
  incChannelDamage: '% Channel',
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
  incArmor: '% Armor',
  evasion: 'Evasion',
  incEvasion: '% Evasion',
  blockChance: 'Block',
  fireResist: 'Fire Resist',
  coldResist: 'Cold Resist',
  lightningResist: 'Lightning Resist',
  chaosResist: 'Chaos Resist',
  allResist: 'All Resist',
  energyShield: 'Energy Shield',
  incEnergyShield: '% Energy Shield',
  esRecharge: 'ES Recharge',
  esCombatRecharge: 'ES Combat Recharge',
  movementSpeed: 'Move Speed',
  itemQuantity: 'Item Quantity',
  itemRarity: 'Item Rarity',
  ailmentDuration: 'Ailment Duration',
  lifeLeechPercent: 'Life Leech',
  lifeOnHit: 'Life on Hit',
  lifeOnKill: 'Life on Kill',
  lifeOnDodgePercent: 'Life on Dodge',
  lifeRecoveryPerHit: 'Life per Hit Taken',
  cooldownRecovery: 'CD Recovery',
  fortifyEffect: 'Fortify Effect',
  damageTakenReduction: 'Damage Reduction',
};

function ComparisonPanel({ selected, equipped }: { selected: Item; equipped: Item }) {
  const selectedStats = calcItemStatContribution(selected);
  const equippedStats = calcItemStatContribution(equipped);
  const allKeys = [...new Set([...Object.keys(selectedStats), ...Object.keys(equippedStats)])] as StatKey[];

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
                <span className="text-gray-500">{STAT_LABELS[key] ?? key}</span>
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
  slot, item, selectedItemId, selectedCurrency, onSelect, onHover, onLeave, isMobile,
}: {
  slot: GearSlot;
  item: Item | null;
  selectedItemId?: string;
  selectedCurrency: CurrencyType | null;
  onSelect: (item: Item, slot: GearSlot) => void;
  onHover: (e: React.MouseEvent, item: Item, slot: GearSlot) => void;
  onLeave: () => void;
  isMobile: boolean;
}) {
  const isSelected = item != null && item.id === selectedItemId;

  if (!item) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/40 flex flex-col items-center justify-center py-1.5 min-w-0">
        <SlotIcon slot={slot} size="lg" className="opacity-20" />
        <span className="text-xs text-gray-600 mt-0.5 truncate w-full text-center px-0.5">{slotLabel(slot)}</span>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-lg border-2 p-1.5 cursor-pointer transition-all min-w-0
        flex flex-col items-center justify-center text-center
        ${RARITY_BG[item.rarity]} ${RARITY_BORDER_RING[item.rarity]}
        ${item.isCorrupted ? 'ring-1 ring-fuchsia-500/40' : ''}
        ${isSelected ? 'ring-2 ring-white scale-105' : ''}
        ${selectedCurrency ? 'hover:ring-2 hover:ring-purple-400' : 'hover:brightness-125'}
      `}
      onClick={() => onSelect(item, slot)}
      onMouseEnter={isMobile ? undefined : (e) => onHover(e, item, slot)}
      onMouseLeave={isMobile ? undefined : onLeave}
    >
      <ItemIcon item={item} size="md" />
      <div className="text-xs font-semibold text-gray-200 truncate w-full mt-0.5 px-0.5">{item.name}</div>
      <div className="text-xs text-gray-400">iLvl {item.iLvl}</div>
    </div>
  );
}

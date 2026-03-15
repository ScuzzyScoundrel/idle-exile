import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUiStore } from '../../store/uiStore';
import { getBankTabCost, BANK_MAX_TABS, BANK_TAB_CAPACITY } from '../../data/balance';
import type { Item, Rarity } from '../../types';
import { ItemIcon } from '../itemIcon';

const RARITY_TILE_BORDER: Record<Rarity, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
  unique: 'border-amber-500',
};

const RARITY_GRADIENT: Record<Rarity, string> = {
  common: 'from-green-900/50',
  uncommon: 'from-blue-900/50',
  rare: 'from-yellow-900/50',
  epic: 'from-purple-900/50',
  legendary: 'from-orange-900/50',
  unique: 'from-amber-900/50',
};

interface BankPanelProps {
  onSelectBankItem: (item: Item, tabIndex: number, slotIndex: number) => void;
  selectedBankSlot: { tabIndex: number; slotIndex: number } | null;
  activeBankTab: number;
  setActiveBankTab: (tab: number) => void;
}

export default function BankPanel({ onSelectBankItem, selectedBankSlot, activeBankTab, setActiveBankTab }: BankPanelProps) {
  const bank = useGameStore(s => s.bank);
  const gold = useGameStore(s => s.gold);
  const buyBankTab = useUiStore(s => s.buyBankTab);
  const [expanded, setExpanded] = useState(false);

  const tabCount = bank.tabs.length;
  const totalItems = bank.tabs.reduce((sum, tab) => sum + tab.items.filter(Boolean).length, 0);
  const totalSlots = tabCount * BANK_TAB_CAPACITY;
  const canBuyMore = tabCount < BANK_MAX_TABS;
  const nextCost = canBuyMore ? getBankTabCost(tabCount) : 0;
  const canAfford = gold >= nextCost;

  // No tabs yet — show buy prompt
  if (tabCount === 0) {
    return (
      <div className="mt-2 bg-gray-800/60 rounded-lg p-3 text-center space-y-2">
        <p className="text-sm text-gray-400">Buy your first bank tab to start storing items</p>
        <button
          onClick={buyBankTab}
          disabled={!canAfford}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            canAfford
              ? 'bg-cyan-800 hover:bg-cyan-700 text-cyan-200'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Buy Bank Tab ({nextCost.toLocaleString()}g)
        </button>
      </div>
    );
  }

  const activeTab = bank.tabs[activeBankTab] ?? bank.tabs[0];
  const activeTabIdx = bank.tabs[activeBankTab] ? activeBankTab : 0;

  return (
    <div className="mt-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-bold flex items-center gap-1 text-cyan-400 mb-1"
      >
        <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>{'\u25B6'}</span>
        Bank ({totalItems}/{totalSlots})
      </button>

      {expanded && (
        <div className="bg-gray-800/60 rounded-lg p-2 space-y-2">
          {/* Tab strip */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {bank.tabs.map((tab, i) => {
              const count = tab.items.filter(Boolean).length;
              const isActive = i === activeTabIdx;
              return (
                <button
                  key={i}
                  onClick={() => setActiveBankTab(i)}
                  className={`shrink-0 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-800 text-cyan-200 ring-1 ring-cyan-500'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {tab.label} ({count}/{BANK_TAB_CAPACITY})
                </button>
              );
            })}
            {/* Buy tab button */}
            {canBuyMore && (
              <button
                onClick={buyBankTab}
                disabled={!canAfford}
                className={`shrink-0 px-2.5 py-1 rounded text-xs font-semibold ${
                  canAfford
                    ? 'bg-cyan-900 hover:bg-cyan-800 text-cyan-300'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                + Buy Tab ({nextCost.toLocaleString()}g)
              </button>
            )}
          </div>

          {/* Item grid */}
          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
            {activeTab.items.map((item, slotIdx) => {
              if (item) {
                const isSelected = selectedBankSlot?.tabIndex === activeTabIdx && selectedBankSlot?.slotIndex === slotIdx;
                return (
                  <div
                    key={slotIdx}
                    className={`
                      relative aspect-square rounded-lg border-2 cursor-pointer transition-all
                      flex items-center justify-center overflow-hidden bg-gray-900
                      ${RARITY_TILE_BORDER[item.rarity]}
                      ${isSelected ? 'ring-2 ring-white scale-105' : 'hover:brightness-125'}
                    `}
                    onClick={() => onSelectBankItem(item, activeTabIdx, slotIdx)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-t ${RARITY_GRADIENT[item.rarity]} to-transparent pointer-events-none`} />
                    <ItemIcon item={item} size="lg" />
                  </div>
                );
              }
              return (
                <div
                  key={slotIdx}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/30"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

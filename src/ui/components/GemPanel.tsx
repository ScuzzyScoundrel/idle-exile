// ============================================================
// GemPanel — Gem inventory, socketing interaction, and upgrade UI
// ============================================================

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Gem, GemType, GemTier, GearSlot, Item } from '../../types';
import { SOCKETABLE_SLOTS } from '../../types';
import { getGemDef, GEM_TIER_NAMES, GEM_TIER_COLORS, isGemValidForSlot } from '../../data/gems';
import { GEM_UPGRADE_GOLD_COST, GEM_INVENTORY_CAP } from '../../data/balance';
import { canUpgradeGem } from '../../engine/gems';

interface GemPanelProps {
  collapsed?: boolean;
}

/** Group gems by type+tier and return sorted stacks. */
function groupGems(gems: Gem[]): { type: GemType; tier: GemTier; count: number; indices: number[] }[] {
  const map = new Map<string, { type: GemType; tier: GemTier; count: number; indices: number[] }>();
  gems.forEach((gem, idx) => {
    const key = `${gem.type}_${gem.tier}`;
    const entry = map.get(key);
    if (entry) {
      entry.count++;
      entry.indices.push(idx);
    } else {
      map.set(key, { type: gem.type, tier: gem.tier, count: 1, indices: [idx] });
    }
  });
  // Sort: by tier (best first), then by type name
  return Array.from(map.values()).sort((a, b) => a.tier - b.tier || a.type.localeCompare(b.type));
}

type SocketTarget = { slot: GearSlot; socketIndex: number; item: Item };

export default function GemPanel({ collapsed: initialCollapsed }: GemPanelProps) {
  const gemInventory = useGameStore(s => s.gemInventory);
  const equipment = useGameStore(s => s.character.equipment);
  const gold = useGameStore(s => s.gold);
  const socketGem = useGameStore(s => s.socketGem);
  const upgradeGems = useGameStore(s => s.upgradeGems);

  const [collapsed, setCollapsed] = useState(initialCollapsed ?? true);
  const [socketTarget, setSocketTarget] = useState<SocketTarget | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ gemIndex: number; gem: Gem } | null>(null);

  const grouped = groupGems(gemInventory);

  // Find all equipped items with sockets
  const socketableItems: { slot: GearSlot; item: Item }[] = [];
  for (const slot of SOCKETABLE_SLOTS) {
    const item = equipment[slot];
    if (item?.sockets && item.sockets.length > 0) {
      socketableItems.push({ slot, item });
    }
  }

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  const handleSocketGem = (gemIndex: number, gem: Gem) => {
    if (!socketTarget) return;
    if (!isGemValidForSlot(gem.type, socketTarget.slot)) {
      showFeedback(`${getGemDef(gem.type).name} gems can't go in ${socketTarget.slot}!`);
      return;
    }
    // Always require confirmation before socketing
    setConfirmOverwrite({ gemIndex, gem });
  };

  const doSocketGem = (gemIndex: number, gem: Gem) => {
    if (!socketTarget) return;
    const success = socketGem(socketTarget.slot, gemIndex, socketTarget.socketIndex);
    if (success) {
      showFeedback(`Socketed ${GEM_TIER_NAMES[gem.tier]} ${getGemDef(gem.type).name}!`);
      setSocketTarget(null);
      setConfirmOverwrite(null);
    }
  };

  const handleUpgrade = (type: GemType, tier: GemTier) => {
    const success = upgradeGems(type, tier);
    if (success) {
      const outputTier = (tier - 1) as GemTier;
      showFeedback(`Upgraded to ${GEM_TIER_NAMES[outputTier]} ${getGemDef(type).name}!`);
    } else {
      showFeedback('Not enough gold or gems!');
    }
  };

  if (gemInventory.length === 0 && socketableItems.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header / toggle */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-750 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="flex items-center gap-2">
          <span>{'💎'}</span>
          <span>Gems</span>
          <span className="text-xs text-gray-500">({gemInventory.length}/{GEM_INVENTORY_CAP})</span>
        </span>
        <span className="text-gray-500 text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {/* Feedback message */}
          {feedbackMsg && (
            <div className="text-xs text-center py-1 px-2 rounded bg-gray-700 text-yellow-300 animate-pulse">
              {feedbackMsg}
            </div>
          )}

          {/* Socketed Items Overview */}
          {socketableItems.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">Socketed Gear</div>
              <div className="space-y-1">
                {socketableItems.map(({ slot, item }) => (
                  <div key={slot} className="flex items-center gap-2 text-xs bg-gray-900 rounded px-2 py-1.5">
                    <span className="text-gray-400 w-20 shrink-0 capitalize">{slot.replace(/\d/, '')}</span>
                    {item.sockets!.map((gem, si) => (
                      <div key={si} className="flex items-center gap-1">
                        {gem ? (
                          <button
                            className={`flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors
                              ${socketTarget?.slot === slot && socketTarget?.socketIndex === si
                                ? 'bg-blue-800 ring-1 ring-blue-400'
                                : 'hover:bg-gray-700'}`}
                            title="Click to select socket (overwrites gem)"
                            onClick={() => setSocketTarget(
                              socketTarget?.slot === slot && socketTarget?.socketIndex === si
                                ? null
                                : { slot, socketIndex: si, item }
                            )}
                          >
                            <span>{getGemDef(gem.type).icon}</span>
                            <span className={GEM_TIER_COLORS[gem.tier]}>
                              {GEM_TIER_NAMES[gem.tier]} {getGemDef(gem.type).name}
                            </span>
                          </button>
                        ) : (
                          <button
                            className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors
                              ${socketTarget?.slot === slot && socketTarget?.socketIndex === si
                                ? 'bg-blue-800 ring-1 ring-blue-400 text-blue-300'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-400'}`}
                            onClick={() => setSocketTarget(
                              socketTarget?.slot === slot && socketTarget?.socketIndex === si
                                ? null
                                : { slot, socketIndex: si, item }
                            )}
                          >
                            <span className="text-gray-500">{'◇'}</span>
                            <span>Empty Socket</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Socket target hint */}
          {socketTarget && !confirmOverwrite && (
            <div className="text-xs text-blue-400 text-center py-1 bg-blue-900/30 rounded">
              {socketTarget.item.sockets?.[socketTarget.socketIndex]
                ? `Select a gem below to replace the gem in ${socketTarget.slot} (old gem will be destroyed)`
                : `Select a gem below to socket into ${socketTarget.slot}`}
            </div>
          )}

          {/* Socket confirmation dialog */}
          {confirmOverwrite && socketTarget && (() => {
            const oldGem = socketTarget.item.sockets?.[socketTarget.socketIndex];
            const newDef = getGemDef(confirmOverwrite.gem.type);
            const isOverwrite = !!oldGem;
            return (
              <div className={`text-xs rounded-lg p-2.5 space-y-2 ${isOverwrite ? 'bg-red-950/60 border border-red-700/60' : 'bg-blue-950/60 border border-blue-700/60'}`}>
                <div className={`font-semibold text-center ${isOverwrite ? 'text-red-300' : 'text-blue-300'}`}>
                  {isOverwrite ? 'Overwrite Gem?' : 'Socket Gem?'}
                </div>
                <div className="text-gray-300 text-center">
                  {isOverwrite && oldGem && (
                    <>
                      <span className={GEM_TIER_COLORS[oldGem.tier]}>
                        {getGemDef(oldGem.type).icon} {GEM_TIER_NAMES[oldGem.tier]} {getGemDef(oldGem.type).name}
                      </span>
                      <span className="text-gray-500 mx-1.5">{'\u2192'}</span>
                    </>
                  )}
                  <span className={GEM_TIER_COLORS[confirmOverwrite.gem.tier]}>
                    {newDef.icon} {GEM_TIER_NAMES[confirmOverwrite.gem.tier]} {newDef.name}
                  </span>
                  <span className="text-gray-500 ml-1.5">{'\u2192'} {socketTarget.slot}</span>
                </div>
                {isOverwrite && <div className="text-red-400/80 text-center">The old gem will be destroyed.</div>}
                <div className="flex gap-2 justify-center">
                  <button
                    className={`px-3 py-1 rounded transition-colors ${isOverwrite
                      ? 'bg-red-800 hover:bg-red-700 text-red-100'
                      : 'bg-blue-800 hover:bg-blue-700 text-blue-100'}`}
                    onClick={() => doSocketGem(confirmOverwrite.gemIndex, confirmOverwrite.gem)}
                  >
                    {isOverwrite ? 'Overwrite' : 'Socket'}
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                    onClick={() => setConfirmOverwrite(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Gem Inventory Grid */}
          {grouped.length > 0 ? (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">Gem Stash</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {grouped.map(({ type, tier, count, indices }) => {
                  const def = getGemDef(type);
                  const value = def.tiers[tier];
                  const canUpgrade = canUpgradeGem(gemInventory, type, tier);
                  const outputTier = (tier - 1) as GemTier;
                  const upgradeCost = tier > 1 ? GEM_UPGRADE_GOLD_COST[outputTier] : 0;
                  const canAffordUpgrade = gold >= upgradeCost;

                  return (
                    <div
                      key={`${type}_${tier}`}
                      className={`bg-gray-900 rounded-lg p-2 border transition-colors
                        ${socketTarget ? 'cursor-pointer hover:border-blue-500 hover:bg-gray-800' : ''}
                        ${isGemValidForSlot(type, socketTarget?.slot ?? 'mainhand') || !socketTarget ? 'border-gray-700' : 'border-gray-800 opacity-40'}`}
                      onClick={socketTarget ? () => handleSocketGem(indices[0], gemInventory[indices[0]]) : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{def.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-semibold ${GEM_TIER_COLORS[tier]} truncate`}>
                            {GEM_TIER_NAMES[tier]} {def.name}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            +{value} {def.description}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 shrink-0">
                          x{count}
                        </span>
                      </div>
                      {/* Upgrade button */}
                      {canUpgrade && tier > 1 && (
                        <button
                          className={`mt-1.5 w-full text-[10px] py-0.5 rounded transition-colors
                            ${canAffordUpgrade
                              ? 'bg-yellow-900/50 hover:bg-yellow-800/70 text-yellow-300 border border-yellow-700'
                              : 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canAffordUpgrade) handleUpgrade(type, tier);
                          }}
                          disabled={!canAffordUpgrade}
                        >
                          3→1 Upgrade ({upgradeCost}g)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-600 italic text-center py-2">
              No gems yet. Gems drop from zone clears and bosses.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

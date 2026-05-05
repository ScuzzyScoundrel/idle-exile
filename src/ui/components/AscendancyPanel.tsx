// ============================================================
// Ascendancy Panel — Phase E (2026-05-05)
// ============================================================
//
// Three states:
//   • Pre-level 25:        "Locked" placeholder.
//   • Level 25, no pick:   3 ascendancy options for the current class.
//   • Level 25, picked:    8-node compact tree, multi-rank allocation.

import { useGameStore } from '../../store/gameStore';
import { useSkillStore } from '../../store/skillStore';
import { CharacterClass } from '../../types';
import {
  getAscendancyTree, getAvailableAscendanciesForClass,
} from '../../data/ascendancies';
import {
  canAllocateAscendancyNode, getAvailableAscendancyPoints, getAscendancyRespecCost,
  getTotalAllocatedAscendancyRanks, ASCENDANCY_UNLOCK_LEVEL,
} from '../../engine/ascendancy';

const CLASS_ACCENT: Record<CharacterClass, { tab: string; allocated: string; border: string; badge: string }> = {
  berserker:   { tab: 'bg-red-700',  allocated: 'border-red-500 bg-red-950/50',  border: 'border-red-400',  badge: 'bg-red-600' },
  sorcerer:    { tab: 'bg-blue-700', allocated: 'border-blue-500 bg-blue-950/50', border: 'border-blue-400', badge: 'bg-blue-600' },
  hunter:      { tab: 'bg-green-700',allocated: 'border-green-500 bg-green-950/50',border:'border-green-400',badge: 'bg-green-600' },
  witchdoctor: { tab: 'bg-pink-700', allocated: 'border-pink-500 bg-pink-950/50', border: 'border-pink-400', badge: 'bg-pink-600' },
  assassin:    { tab: 'bg-teal-700', allocated: 'border-teal-500 bg-teal-950/50', border: 'border-teal-400', badge: 'bg-teal-600' },
};

export default function AscendancyPanel() {
  const character = useGameStore(s => s.character);
  const ascendancyId = useGameStore(s => s.ascendancyId);
  const ascendancyRanks = useGameStore(s => s.ascendancyRanks);
  const gold = useGameStore(s => s.gold);
  const pickAscendancy = useSkillStore(s => s.pickAscendancy);
  const allocateAscendancyNode = useSkillStore(s => s.allocateAscendancyNode);
  const respecAscendancy = useSkillStore(s => s.respecAscendancy);

  const charClass = character.class;
  const accent = CLASS_ACCENT[charClass];

  // ── State 1: locked ──────────────────────────────────────────────
  if (character.level < ASCENDANCY_UNLOCK_LEVEL) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-500">
          Ascendancy
          <span className="text-xs text-gray-600 font-normal ml-2">
            Locked — unlocks at level {ASCENDANCY_UNLOCK_LEVEL}
          </span>
        </h3>
      </div>
    );
  }

  // ── State 2: unlocked, no pick ───────────────────────────────────
  if (!ascendancyId) {
    const options = getAvailableAscendanciesForClass(charClass);
    return (
      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
        <h3 className="text-sm font-bold text-yellow-400">
          Choose Your Ascendancy
          <span className="text-xs text-gray-500 font-normal ml-2">
            Permanent commitment — pick carefully
          </span>
        </h3>
        <div className="space-y-2">
          {options.map(asc => (
            <button
              key={asc.id}
              onClick={() => pickAscendancy(asc.id)}
              className={`w-full text-left rounded-lg border-2 p-2 transition-all ${accent.border} bg-gray-900/40 hover:bg-gray-900/60 cursor-pointer`}
            >
              <div className="text-sm font-bold text-white">{asc.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{asc.theme}</div>
              <div className="text-xs text-gray-500 mt-1">{asc.totalNodes} nodes</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── State 3: picked, render the chosen tree ──────────────────────
  const tree = getAscendancyTree(ascendancyId);
  if (!tree) {
    // Defensive: stored id refers to an ascendancy not authored yet.
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-400">Ascendancy: {ascendancyId}</h3>
        <div className="text-xs text-gray-500">Tree authoring pending.</div>
      </div>
    );
  }

  const totalAllocated = getTotalAllocatedAscendancyRanks(ascendancyRanks);
  const availablePoints = getAvailableAscendancyPoints(character.level, totalAllocated);
  const respecCost = getAscendancyRespecCost(character.level);

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold text-gray-300">
        Ascendancy: <span className="text-yellow-300">{tree.name}</span>
        <span className="text-xs text-gray-500 font-normal ml-2">
          {totalAllocated} allocated
          {availablePoints > 0 && <span className="text-yellow-400 ml-1">({availablePoints} available)</span>}
        </span>
      </h3>
      <div className="text-xs text-gray-500">{tree.theme}</div>

      <div className="space-y-1">
        {tree.nodes.map(node => {
          const currentRank = ascendancyRanks[node.id] ?? 0;
          const isAllocated = currentRank > 0;
          const isMaxed = currentRank >= node.ranks;
          const canAlloc = canAllocateAscendancyNode(ascendancyId, ascendancyRanks, node.id, character.level);
          const isCapstone = !!node.isCapstone;

          return (
            <button
              key={node.id}
              onClick={() => canAlloc && allocateAscendancyNode(node.id)}
              disabled={!canAlloc}
              className={`w-full text-left rounded-lg border p-2 transition-all ${
                isMaxed
                  ? accent.allocated
                  : isAllocated
                    ? `${accent.allocated} hover:bg-opacity-75 cursor-pointer`
                    : canAlloc
                      ? 'border-yellow-700 bg-yellow-950/20 hover:bg-yellow-950/40 cursor-pointer'
                      : 'border-gray-700 bg-gray-900/30 opacity-50'
              } ${isCapstone ? 'ring-1 ring-yellow-500' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isMaxed ? `${accent.badge} text-white` : isAllocated ? 'bg-yellow-700 text-yellow-100' : canAlloc ? 'bg-yellow-800 text-yellow-200' : 'bg-gray-700 text-gray-500'
                }`}>
                  {isMaxed ? '✓' : node.tier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-bold ${isAllocated ? 'text-white' : canAlloc ? 'text-white' : 'text-gray-400'}`}>
                      {node.name}
                    </span>
                    {isCapstone && (
                      <span className="text-xs text-yellow-400 font-bold">KEYSTONE</span>
                    )}
                    {node.ranks > 1 && (
                      <span className={`text-xs font-mono ${isAllocated ? 'text-yellow-300' : 'text-gray-500'}`}>
                        {currentRank}/{node.ranks}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{node.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-700">
        <span className="text-xs text-gray-400">
          Points: <span className="text-white font-bold">{availablePoints}</span> / {Math.max(0, character.level - (ASCENDANCY_UNLOCK_LEVEL - 1))}
        </span>
        <button
          onClick={respecAscendancy}
          disabled={gold < respecCost || totalAllocated === 0}
          className={`text-xs px-2 py-1 rounded ${
            gold >= respecCost && totalAllocated > 0
              ? 'bg-red-900 hover:bg-red-800 text-red-300'
              : 'bg-gray-700 text-gray-600 cursor-not-allowed'
          }`}
          title={`Reset ascendancy ranks (keeps your chosen ascendancy). Cost: ${respecCost} gold`}
        >
          Respec ({respecCost}g)
        </button>
      </div>
    </div>
  );
}

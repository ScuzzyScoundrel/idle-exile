// Phase C step 2 (2026-05-04): cutover to JSON class-tree registry.
// Reads tree structure + node descriptions directly from
// `src/data/classTrees/*.json` via the registry. Path ids are now JSON
// strings (e.g. "plague_priest") rather than the legacy 'A'/'B'/'C' literals.
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSkillStore } from '../../store/skillStore';
import { CharacterClass } from '../../types';
import { getClassTree } from '../../data/classTrees';
import { formatTalentEffects } from '../format/talentEffectText';
import {
  canAllocateTalentNode, getAvailableTalentPoints, getTalentRespecCost,
  getTotalAllocatedRanks,
} from '../../engine/classTalents';

const CLASS_ACCENT: Record<CharacterClass, { tab: string; allocated: string; border: string; badge: string }> = {
  berserker: { tab: 'bg-red-700', allocated: 'border-red-500 bg-red-950/50', border: 'border-red-400', badge: 'bg-red-600' },
  sorcerer:  { tab: 'bg-blue-700', allocated: 'border-blue-500 bg-blue-950/50', border: 'border-blue-400', badge: 'bg-blue-600' },
  hunter:    { tab: 'bg-green-700', allocated: 'border-green-500 bg-green-950/50', border: 'border-green-400', badge: 'bg-green-600' },
  witchdoctor: { tab: 'bg-pink-700', allocated: 'border-pink-500 bg-pink-950/50', border: 'border-pink-400', badge: 'bg-pink-600' },
  assassin: { tab: 'bg-teal-700', allocated: 'border-teal-500 bg-teal-950/50', border: 'border-teal-400', badge: 'bg-teal-600' },
};

export default function ClassTalentPanel() {
  const character = useGameStore(s => s.character);
  const talentRanks = useGameStore(s => s.talentRanks);
  const gold = useGameStore(s => s.gold);
  const allocateTalentNode = useSkillStore(s => s.allocateTalentNode);
  const respecTalents = useSkillStore(s => s.respecTalents);

  const charClass = character.class;
  const tree = getClassTree(charClass);
  const accent = CLASS_ACCENT[charClass];
  const totalAllocated = getTotalAllocatedRanks(talentRanks);
  const availablePoints = getAvailableTalentPoints(character.level, totalAllocated);
  const respecCost = getTalentRespecCost(character.level);

  // Phase C step 2: path id is now a JSON string (e.g. "plague_priest").
  // Default to first path of current class tree on mount + on class change.
  const [selectedPathId, setSelectedPathId] = useState<string>(tree.paths[0]?.id ?? '');
  const [collapsed, setCollapsed] = useState(false);

  // Guard against class change leaving stale path selection.
  const currentPath = tree.paths.find(p => p.id === selectedPathId) ?? tree.paths[0];
  if (!currentPath) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-bold text-gray-300">
          Class Talents
          <span className="text-xs text-gray-500 font-normal ml-2">
            {totalAllocated} allocated
            {availablePoints > 0 && <span className="text-yellow-400 ml-1">({availablePoints} available)</span>}
          </span>
        </h3>
        <span className="text-gray-500 text-xs">{collapsed ? '\u25B6' : '\u25BC'}</span>
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {/* Path Tabs */}
          <div className="flex gap-1">
            {tree.paths.map((path) => {
              const allocatedInPath = path.nodes.reduce(
                (sum, n) => sum + (talentRanks[n.id] ?? 0),
                0,
              );
              return (
                <button
                  key={path.id}
                  onClick={() => setSelectedPathId(path.id)}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    selectedPathId === path.id
                      ? `${accent.tab} text-white`
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {path.name} {allocatedInPath > 0 && <span className="opacity-75">({allocatedInPath})</span>}
                </button>
              );
            })}
          </div>

          {/* Path Theme (JSON `theme` field \u2014 Phase B authoring) */}
          <div className="text-xs text-gray-500">{currentPath.theme}</div>

          {/* Nodes */}
          <div className="space-y-1">
            {currentPath.nodes.map((node) => {
              const currentRank = talentRanks[node.id] ?? 0;
              const isAllocated = currentRank > 0;
              const isMaxed = currentRank >= node.ranks;
              const canAlloc = canAllocateTalentNode(charClass, talentRanks, node.id, character.level);
              const isCapstone = node.kind === 'capstone' || node.kind === 'capstone_supporting';
              const isIdentity = node.category === 'identity';

              return (
                <button
                  key={node.id}
                  onClick={() => canAlloc && allocateTalentNode(node.id)}
                  disabled={!canAlloc}
                  className={`w-full text-left rounded-lg border p-2 transition-all ${
                    isMaxed
                      ? accent.allocated
                      : isAllocated
                        ? `${accent.allocated} hover:bg-opacity-75 cursor-pointer`
                        : canAlloc
                          ? 'border-green-600 bg-green-950/30 hover:bg-green-950/50 cursor-pointer'
                          : 'border-gray-700 bg-gray-900/30 opacity-50'
                  } ${isCapstone ? 'ring-1 ring-yellow-600/70' : isIdentity ? 'ring-1 ring-yellow-600/30' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isMaxed ? `${accent.badge} text-white` : isAllocated ? 'bg-yellow-700 text-yellow-100' : canAlloc ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isMaxed ? '\u2713' : node.tier}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold ${isAllocated ? 'text-white' : canAlloc ? 'text-white' : 'text-gray-400'}`}>
                          {node.name}
                        </span>
                        {isCapstone && (
                          <span className="text-xs text-yellow-400 font-bold">CAPSTONE</span>
                        )}
                        {isIdentity && !isCapstone && (
                          <span className="text-xs text-yellow-500 font-bold">IDENTITY</span>
                        )}
                        {node.ranks > 1 && (
                          <span className={`text-xs font-mono ${isAllocated ? 'text-yellow-300' : 'text-gray-500'}`}>
                            {currentRank}/{node.ranks}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{node.description}</div>
                      {/* Phase F (2026-05-07): formatted talent effects
                          (engine-introspected). Rank-1 preview when
                          unallocated, current-rank value when allocated. */}
                      {(() => {
                        const lines = formatTalentEffects(node.id, currentRank > 0 ? currentRank : 1);
                        if (lines.length === 0) return null;
                        return (
                          <ul className="mt-0.5 text-[10px] text-emerald-400/80 leading-tight font-mono">
                            {lines.map((line, i) => (
                              <li key={i}>• {line}</li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Points + Respec */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-700">
            <span className="text-xs text-gray-400">
              Points: <span className="text-white font-bold">{availablePoints}</span> / {character.level}
            </span>
            <button
              onClick={respecTalents}
              disabled={gold < respecCost || totalAllocated === 0}
              className={`text-xs px-2 py-1 rounded ${
                gold >= respecCost && totalAllocated > 0
                  ? 'bg-red-900 hover:bg-red-800 text-red-300'
                  : 'bg-gray-700 text-gray-600 cursor-not-allowed'
              }`}
              title={`Reset all talents. Cost: ${respecCost} gold`}
            >
              Respec ({respecCost}g)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

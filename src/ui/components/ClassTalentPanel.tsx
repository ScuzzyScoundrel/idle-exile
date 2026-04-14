import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSkillStore } from '../../store/skillStore';
import { CharacterClass, SkillTreeNode } from '../../types';
import { CLASS_TALENT_TREES } from '../../data/classTalents';
import { canAllocateTalentNode, getAvailableTalentPoints, getTalentRespecCost } from '../../engine/classTalents';

const CLASS_ACCENT: Record<CharacterClass, { tab: string; allocated: string; border: string; badge: string }> = {
  warrior: { tab: 'bg-red-700', allocated: 'border-red-500 bg-red-950/50', border: 'border-red-400', badge: 'bg-red-600' },
  mage:    { tab: 'bg-blue-700', allocated: 'border-blue-500 bg-blue-950/50', border: 'border-blue-400', badge: 'bg-blue-600' },
  ranger:  { tab: 'bg-green-700', allocated: 'border-green-500 bg-green-950/50', border: 'border-green-400', badge: 'bg-green-600' },
  rogue:   { tab: 'bg-purple-700', allocated: 'border-purple-500 bg-purple-950/50', border: 'border-purple-400', badge: 'bg-purple-600' },
  witchdoctor: { tab: 'bg-pink-700', allocated: 'border-pink-500 bg-pink-950/50', border: 'border-pink-400', badge: 'bg-pink-600' },
  assassin: { tab: 'bg-teal-700', allocated: 'border-teal-500 bg-teal-950/50', border: 'border-teal-400', badge: 'bg-teal-600' },
};

function formatEffect(node: SkillTreeNode): string {
  const parts: string[] = [];
  const eff = node.effect;
  if (eff.damageMult && eff.damageMult !== 1) parts.push(`${eff.damageMult > 1 ? '+' : ''}${Math.round((eff.damageMult - 1) * 100)}% damage`);
  if (eff.defenseMult && eff.defenseMult !== 1) parts.push(`${eff.defenseMult > 1 ? '+' : ''}${Math.round((eff.defenseMult - 1) * 100)}% defense`);
  if (eff.clearSpeedMult && eff.clearSpeedMult !== 1) parts.push(`+${Math.round((eff.clearSpeedMult - 1) * 100)}% clear speed`);
  if (eff.critChanceBonus) parts.push(`+${eff.critChanceBonus}% crit`);
  if (eff.critMultiplierBonus) parts.push(`+${eff.critMultiplierBonus}% crit dmg`);
  if (eff.xpMult && eff.xpMult !== 1) parts.push(`+${Math.round((eff.xpMult - 1) * 100)}% XP`);
  if (eff.itemDropMult && eff.itemDropMult !== 1) parts.push(`+${Math.round((eff.itemDropMult - 1) * 100)}% items`);
  if (eff.materialDropMult && eff.materialDropMult !== 1) parts.push(`+${Math.round((eff.materialDropMult - 1) * 100)}% materials`);
  if (eff.resistBonus) parts.push(`+${eff.resistBonus} resist`);
  if (eff.ignoreHazards) parts.push('Ignore hazards');
  if (eff.doubleClears) parts.push('Double clears');
  return parts.join(', ');
}

export default function ClassTalentPanel() {
  const character = useGameStore(s => s.character);
  const talentAllocations = useGameStore(s => s.talentAllocations);
  const gold = useGameStore(s => s.gold);
  const allocateTalentNode = useSkillStore(s => s.allocateTalentNode);
  const respecTalents = useSkillStore(s => s.respecTalents);

  const [selectedPath, setSelectedPath] = useState<'A' | 'B' | 'C'>('A');
  const [collapsed, setCollapsed] = useState(false);

  const charClass = character.class;
  const tree = CLASS_TALENT_TREES[charClass];
  const accent = CLASS_ACCENT[charClass];
  const availablePoints = getAvailableTalentPoints(character.level, talentAllocations.length);
  const respecCost = getTalentRespecCost(character.level);

  const currentPath = tree.paths.find(p => p.id === selectedPath)!;

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-bold text-gray-300">
          Class Talents
          <span className="text-xs text-gray-500 font-normal ml-2">
            {talentAllocations.length} allocated
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
              const allocatedInPath = path.nodes.filter(n => talentAllocations.includes(n.id)).length;
              return (
                <button
                  key={path.id}
                  onClick={() => setSelectedPath(path.id)}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    selectedPath === path.id
                      ? `${accent.tab} text-white`
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {path.name} {allocatedInPath > 0 && <span className="opacity-75">({allocatedInPath})</span>}
                </button>
              );
            })}
          </div>

          {/* Path Description */}
          <div className="text-xs text-gray-500">{currentPath.description}</div>

          {/* Nodes */}
          <div className="space-y-1">
            {currentPath.nodes.map((node) => {
              const isAllocated = talentAllocations.includes(node.id);
              const canAlloc = canAllocateTalentNode(charClass, talentAllocations, node.id, character.level);
              const effectStr = formatEffect(node);

              return (
                <button
                  key={node.id}
                  onClick={() => canAlloc && allocateTalentNode(node.id)}
                  disabled={!canAlloc && !isAllocated}
                  className={`w-full text-left rounded-lg border p-2 transition-all ${
                    isAllocated
                      ? accent.allocated
                      : canAlloc
                        ? 'border-green-600 bg-green-950/30 hover:bg-green-950/50 cursor-pointer'
                        : 'border-gray-700 bg-gray-900/30 opacity-50'
                  } ${node.isPathPayoff ? 'ring-1 ring-yellow-600/50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isAllocated ? `${accent.badge} text-white` : canAlloc ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isAllocated ? '\u2713' : node.tier}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isAllocated ? 'text-white' : canAlloc ? 'text-white' : 'text-gray-400'}`}>
                          {node.name}
                        </span>
                        {node.isPathPayoff && (
                          <span className="text-xs text-yellow-500 font-bold">KEYSTONE</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{node.description}</div>
                      {effectStr && (
                        <div className="text-xs text-gray-500 mt-0.5">{effectStr}</div>
                      )}
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
              disabled={gold < respecCost || talentAllocations.length === 0}
              className={`text-xs px-2 py-1 rounded ${
                gold >= respecCost && talentAllocations.length > 0
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

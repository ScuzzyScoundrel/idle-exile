import { useState, useMemo } from 'react';
import type { SkillDef, SkillProgress, SkillGraphNode, SkillModifier } from '../../types';
import { canAllocateGraphNode, getGraphRespecCost } from '../../engine/skillGraph';

const NODE_COLORS = {
  start: { bg: 'bg-gray-600', border: 'border-gray-400', text: 'text-gray-200' },
  minor: { bg: 'bg-gray-700', border: 'border-gray-500', text: 'text-gray-300' },
  notable: { bg: 'bg-blue-900', border: 'border-blue-400', text: 'text-blue-200' },
  keystone: { bg: 'bg-yellow-900', border: 'border-yellow-400', text: 'text-yellow-200' },
};

const ALLOCATED_COLORS = {
  start: { bg: 'bg-green-800', border: 'border-green-400', text: 'text-green-200' },
  minor: { bg: 'bg-purple-900', border: 'border-purple-400', text: 'text-purple-200' },
  notable: { bg: 'bg-purple-800', border: 'border-purple-300', text: 'text-purple-100' },
  keystone: { bg: 'bg-yellow-700', border: 'border-yellow-300', text: 'text-yellow-100' },
};

const AVAILABLE_COLORS = {
  bg: 'bg-green-950', border: 'border-green-500', text: 'text-green-200',
};

function formatModifier(mod: SkillModifier | undefined): string[] {
  if (!mod) return [];
  const parts: string[] = [];

  if (mod.incDamage) parts.push(`${mod.incDamage > 0 ? '+' : ''}${mod.incDamage}% damage`);
  if (mod.flatDamage) parts.push(`+${mod.flatDamage} flat damage`);
  if (mod.incCritChance) parts.push(`${mod.incCritChance > 0 ? '+' : ''}${mod.incCritChance}% crit`);
  if (mod.incCritMultiplier) parts.push(`${mod.incCritMultiplier > 0 ? '+' : ''}${mod.incCritMultiplier}% crit dmg`);
  if (mod.incCastSpeed) parts.push(`${mod.incCastSpeed > 0 ? '+' : ''}${mod.incCastSpeed}% cast speed`);
  if (mod.extraHits) parts.push(`+${mod.extraHits} extra hits`);
  if (mod.durationBonus) parts.push(`+${mod.durationBonus}s duration`);
  if (mod.cooldownReduction) parts.push(`-${mod.cooldownReduction}% cooldown`);
  if (mod.convertToAoE) parts.push('Converts to AoE');
  if (mod.convertElement) parts.push(`Convert ${mod.convertElement.from}\u2192${mod.convertElement.to}`);
  if (mod.applyDebuff) parts.push(`${Math.round(mod.applyDebuff.chance * 100)}% chance: ${mod.applyDebuff.debuffId}`);
  if (mod.flags?.includes('lifeLeech')) parts.push('Life leech');
  if (mod.flags?.includes('alwaysCrit')) parts.push('Always crit');
  if (mod.flags?.includes('cannotCrit')) parts.push('Cannot crit');
  if (mod.flags?.includes('ignoreResists')) parts.push('Ignore resists');

  // AbilityEffect passthrough
  if (mod.abilityEffect) {
    const ae = mod.abilityEffect;
    if (ae.damageMult && ae.damageMult !== 1) parts.push(`${ae.damageMult > 1 ? '+' : ''}${Math.round((ae.damageMult - 1) * 100)}% damage`);
    if (ae.attackSpeedMult && ae.attackSpeedMult !== 1) parts.push(`${Math.round((ae.attackSpeedMult - 1) * 100)}% atk speed`);
    if (ae.clearSpeedMult && ae.clearSpeedMult !== 1) parts.push(`${Math.round((ae.clearSpeedMult - 1) * 100)}% clear speed`);
    if (ae.critChanceBonus) parts.push(`+${ae.critChanceBonus}% crit`);
    if (ae.critMultiplierBonus) parts.push(`+${ae.critMultiplierBonus}% crit dmg`);
    if (ae.xpMult && ae.xpMult !== 1) parts.push(`+${Math.round((ae.xpMult - 1) * 100)}% XP`);
    if (ae.itemDropMult && ae.itemDropMult !== 1) parts.push(`+${Math.round((ae.itemDropMult - 1) * 100)}% items`);
    if (ae.materialDropMult && ae.materialDropMult !== 1) parts.push(`+${Math.round((ae.materialDropMult - 1) * 100)}% materials`);
    if (ae.defenseMult && ae.defenseMult !== 1) parts.push(`${Math.round((ae.defenseMult - 1) * 100)}% defense`);
    if (ae.resistBonus) parts.push(`+${ae.resistBonus} resist`);
  }

  return parts;
}

interface LayoutNode {
  node: SkillGraphNode;
  x: number;
  y: number;
}

function layoutNodes(nodes: SkillGraphNode[]): LayoutNode[] {
  // Group by tier
  const tiers: Record<number, SkillGraphNode[]> = {};
  for (const n of nodes) {
    if (!tiers[n.tier]) tiers[n.tier] = [];
    tiers[n.tier].push(n);
  }

  const maxTier = Math.max(...Object.keys(tiers).map(Number));
  const result: LayoutNode[] = [];

  // Layout params
  const width = 500;
  const rowHeight = 80;
  const padding = 30;

  for (let tier = 0; tier <= maxTier; tier++) {
    const tierNodes = tiers[tier] ?? [];
    const y = padding + tier * rowHeight;
    const spacing = width / (tierNodes.length + 1);
    for (let i = 0; i < tierNodes.length; i++) {
      result.push({
        node: tierNodes[i],
        x: spacing * (i + 1),
        y,
      });
    }
  }

  return result;
}

export default function SkillGraphView({ skill, progress, gold, onAllocate, onRespec }: {
  skill: SkillDef;
  progress: SkillProgress | undefined;
  gold: number;
  onAllocate: (nodeId: string) => void;
  onRespec: () => void;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const graph = skill.skillGraph;
  if (!graph || !progress) return null;

  const layout = useMemo(() => layoutNodes(graph.nodes), [graph]);
  const layoutMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const ln of layout) m.set(ln.node.id, ln);
    return m;
  }, [layout]);

  const availablePoints = progress.level - progress.allocatedNodes.length;
  const respecCost = getGraphRespecCost(progress.level);

  // Group nodes by tier for list view
  const tiers = useMemo(() => {
    const t: Record<number, SkillGraphNode[]> = {};
    for (const n of graph.nodes) {
      if (!t[n.tier]) t[n.tier] = [];
      t[n.tier].push(n);
    }
    return t;
  }, [graph]);
  const maxTier = Math.max(...Object.keys(tiers).map(Number));

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = (maxTier + 1) * 80 + 60;

  // Node size by type
  const nodeRadius = (type: string) => {
    switch (type) {
      case 'start': return 12;
      case 'minor': return 10;
      case 'notable': return 14;
      case 'keystone': return 16;
      default: return 10;
    }
  };

  return (
    <div className="mt-2 ml-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Graph Tree: <span className="text-white font-bold">{availablePoints}</span> pts available / {progress.level} total
        </div>
      </div>

      {/* SVG Graph Visualization */}
      <div className="relative overflow-x-auto bg-gray-900/60 rounded-lg border border-gray-700" style={{ minHeight: Math.min(svgHeight, 400) }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ maxHeight: 400 }}
        >
          {/* Connection lines */}
          {layout.map(ln =>
            ln.node.connections.map(connId => {
              const target = layoutMap.get(connId);
              if (!target) return null;
              // Only draw line from lower tier to higher (avoid duplicates)
              if (ln.node.tier > target.node.tier) return null;
              const bothAllocated = progress.allocatedNodes.includes(ln.node.id) && progress.allocatedNodes.includes(connId);
              const oneAllocated = progress.allocatedNodes.includes(ln.node.id) || progress.allocatedNodes.includes(connId);
              return (
                <line
                  key={`${ln.node.id}-${connId}`}
                  x1={ln.x} y1={ln.y}
                  x2={target.x} y2={target.y}
                  stroke={bothAllocated ? '#a855f7' : oneAllocated ? '#6b21a8' : '#374151'}
                  strokeWidth={bothAllocated ? 2 : 1.5}
                  strokeDasharray={bothAllocated ? undefined : '4,4'}
                />
              );
            })
          )}

          {/* Nodes */}
          {layout.map(ln => {
            const isAllocated = progress.allocatedNodes.includes(ln.node.id);
            const canAlloc = !isAllocated && canAllocateGraphNode(graph, progress.allocatedNodes, ln.node.id, progress.level);
            const r = nodeRadius(ln.node.nodeType);

            let fill = '#374151';
            let stroke = '#6b7280';
            if (isAllocated) {
              fill = ln.node.nodeType === 'keystone' ? '#854d0e' : '#581c87';
              stroke = ln.node.nodeType === 'keystone' ? '#fbbf24' : '#a855f7';
            } else if (canAlloc) {
              fill = '#052e16';
              stroke = '#22c55e';
            }

            // Keystone shape: diamond
            const isKeystone = ln.node.nodeType === 'keystone';
            const isNotable = ln.node.nodeType === 'notable';

            return (
              <g
                key={ln.node.id}
                onClick={() => canAlloc && onAllocate(ln.node.id)}
                onMouseEnter={() => setHoveredNode(ln.node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: canAlloc ? 'pointer' : 'default' }}
              >
                {isKeystone ? (
                  <rect
                    x={ln.x - r} y={ln.y - r}
                    width={r * 2} height={r * 2}
                    fill={fill} stroke={stroke} strokeWidth={2}
                    transform={`rotate(45, ${ln.x}, ${ln.y})`}
                    rx={2}
                  />
                ) : (
                  <circle
                    cx={ln.x} cy={ln.y} r={r}
                    fill={fill} stroke={stroke}
                    strokeWidth={isNotable ? 2.5 : 2}
                  />
                )}
                {/* Icon/text for allocated */}
                {isAllocated && (
                  <text x={ln.x} y={ln.y + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
                    {'\u2713'}
                  </text>
                )}
                {/* Plus for available */}
                {canAlloc && !isAllocated && (
                  <text x={ln.x} y={ln.y + 4} textAnchor="middle" fill="#22c55e" fontSize={12} fontWeight="bold">
                    +
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredNode && (() => {
          const ln = layoutMap.get(hoveredNode);
          if (!ln) return null;
          const node = ln.node;
          const modParts = formatModifier(node.modifier);
          const isAllocated = progress.allocatedNodes.includes(node.id);
          const canAlloc = !isAllocated && canAllocateGraphNode(graph, progress.allocatedNodes, node.id, progress.level);

          return (
            <div
              className="absolute z-10 bg-gray-900 border border-gray-600 rounded-lg p-2 shadow-lg pointer-events-none"
              style={{
                left: Math.min(ln.x, svgWidth - 180),
                top: ln.y + 20,
                maxWidth: 200,
              }}
            >
              <div className="flex items-center gap-1">
                <span className={`text-xs font-bold ${
                  node.nodeType === 'keystone' ? 'text-yellow-300' :
                  node.nodeType === 'notable' ? 'text-blue-300' : 'text-white'
                }`}>
                  {node.name}
                </span>
                <span className="text-xs text-gray-500 uppercase">{node.nodeType}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{node.description}</div>
              {modParts.length > 0 && (
                <div className="text-xs text-green-400 mt-1">{modParts.join(', ')}</div>
              )}
              {isAllocated && <div className="text-xs text-purple-400 mt-1">Allocated</div>}
              {canAlloc && <div className="text-xs text-green-400 mt-1">Click to allocate</div>}
            </div>
          );
        })()}
      </div>

      {/* Tier-based list view (mobile-friendly) */}
      <div className="space-y-1">
        {Array.from({ length: maxTier + 1 }, (_, tier) => {
          const tierNodes = tiers[tier] ?? [];
          const allocatedCount = tierNodes.filter(n => progress.allocatedNodes.includes(n.id)).length;
          const isOpen = selectedTier === tier;

          return (
            <div key={tier}>
              <button
                onClick={() => setSelectedTier(isOpen ? null : tier)}
                className="w-full flex justify-between items-center text-xs py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 transition-all"
              >
                <span className="text-gray-400">
                  {tier === 0 ? 'Start' : `Tier ${tier}`}
                  <span className="text-gray-600 ml-1">({tierNodes.length} nodes)</span>
                </span>
                <span className="text-purple-400">{allocatedCount > 0 && `${allocatedCount} allocated`}</span>
              </button>
              {isOpen && (
                <div className="space-y-1 mt-1 ml-2">
                  {tierNodes.map(node => {
                    const isAllocated = progress.allocatedNodes.includes(node.id);
                    const canAlloc = !isAllocated && canAllocateGraphNode(graph, progress.allocatedNodes, node.id, progress.level);
                    const modParts = formatModifier(node.modifier);
                    const colors = isAllocated ? ALLOCATED_COLORS[node.nodeType] : canAlloc ? AVAILABLE_COLORS : NODE_COLORS[node.nodeType];

                    return (
                      <button
                        key={node.id}
                        onClick={() => canAlloc && onAllocate(node.id)}
                        disabled={!canAlloc && !isAllocated}
                        className={`w-full text-left rounded border p-1.5 transition-all ${colors.border} ${
                          isAllocated ? colors.bg : canAlloc ? `${colors.bg} hover:brightness-125 cursor-pointer` : `${colors.bg} opacity-50`
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={`w-4 h-4 flex items-center justify-center text-xs font-bold rounded-full ${
                            node.nodeType === 'keystone' ? 'rotate-45 rounded-sm' : ''
                          } ${isAllocated ? 'bg-purple-600 text-white' : canAlloc ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-500'}`}>
                            {isAllocated ? '\u2713' : node.nodeType === 'keystone' ? '\u2666' : '\u2022'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-bold ${colors.text}`}>{node.name}</span>
                              {node.nodeType === 'keystone' && <span className="text-xs text-yellow-500 font-bold">KEY</span>}
                              {node.nodeType === 'notable' && <span className="text-xs text-blue-400 font-bold">NOT</span>}
                            </div>
                            {modParts.length > 0 && (
                              <div className="text-xs text-gray-500">{modParts.join(', ')}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Points + Respec */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700">
        <span className="text-xs text-gray-400">
          Available: <span className="text-white font-bold">{availablePoints}</span> pts
        </span>
        {progress.level > 0 && (
          <button
            onClick={onRespec}
            disabled={gold < respecCost || progress.allocatedNodes.length === 0}
            className={`text-xs px-2 py-1 rounded ${
              gold >= respecCost && progress.allocatedNodes.length > 0
                ? 'bg-red-900 hover:bg-red-800 text-red-300'
                : 'bg-gray-700 text-gray-600 cursor-not-allowed'
            }`}
            title={`Reset tree. Cost: ${respecCost} gold (preserves XP/level)`}
          >
            Respec ({respecCost}g)
          </button>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import type { SkillDef, SkillProgress, SkillGraphNode, SkillGraph, SkillModifier } from '../../types';
import { canAllocateGraphNode, getGraphRespecCost } from '../../engine/skillGraph';
import { useIsMobile } from '../hooks/useIsMobile';

// ─── Color Palettes ───

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

// ─── Modifier Formatting ───

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

  // Phase 1: expanded fields
  if (mod.leechPercent) parts.push(`${mod.leechPercent}% life leech`);
  if (mod.lifeOnHit) parts.push(`+${mod.lifeOnHit} life on hit`);
  if (mod.lifeOnKill) parts.push(`+${mod.lifeOnKill} life on kill`);
  if (mod.damageFromArmor) parts.push(`+${mod.damageFromArmor}% armor as damage`);
  if (mod.damageFromEvasion) parts.push(`+${mod.damageFromEvasion}% evasion as damage`);
  if (mod.damageFromMaxLife) parts.push(`+${mod.damageFromMaxLife}% max life as damage`);
  if (mod.chainCount) parts.push(`+${mod.chainCount} chain`);
  if (mod.forkCount) parts.push(`+${mod.forkCount} fork`);
  if (mod.pierceCount) parts.push(`+${mod.pierceCount} pierce`);
  if (mod.executeThreshold) parts.push(`Execute below ${mod.executeThreshold}% HP`);
  if (mod.overkillDamage) parts.push(`${mod.overkillDamage}% overkill carried`);
  if (mod.selfDamagePercent) parts.push(`Self-damage: ${mod.selfDamagePercent}% max life`);
  if (mod.cannotLeech) parts.push('Cannot leech');
  if (mod.reducedMaxLife) parts.push(`-${mod.reducedMaxLife}% max life`);
  if (mod.increasedDamageTaken) parts.push(`+${mod.increasedDamageTaken}% damage taken`);
  if (mod.fortifyOnHit) parts.push(`Fortify on hit (${mod.fortifyOnHit.damageReduction}% DR)`);
  if (mod.berserk) parts.push(`Berserk: +${mod.berserk.damageBonus}% dmg, +${mod.berserk.damageTakenIncrease}% taken`);
  if (mod.rampingDamage) parts.push(`Ramping: +${mod.rampingDamage.perHit}%/hit (max ${mod.rampingDamage.maxStacks})`);
  if (mod.conditionalMods?.length) {
    for (const cm of mod.conditionalMods) {
      const cond = cm.condition === 'whileDebuffActive'
        ? (cm.threshold && cm.threshold > 1 ? `while ${cm.threshold}+ debuffs` : 'while debuffed')
        : cm.condition === 'whileLowHp' ? 'while low HP'
        : cm.condition === 'whileFullHp' ? 'while full HP'
        : cm.condition === 'onCrit' ? 'on crit'
        : cm.condition === 'onHit' ? 'on hit'
        : cm.condition === 'afterConsecutiveHits' ? `after ${cm.threshold ?? 5} hits`
        : cm.condition === 'onBossPhase' ? 'vs boss'
        : cm.condition;
      const effects: string[] = [];
      if (cm.modifier.incDamage) effects.push(`${cm.modifier.incDamage > 0 ? '+' : ''}${cm.modifier.incDamage}% dmg`);
      if (cm.modifier.flatDamage) effects.push(`+${cm.modifier.flatDamage} flat`);
      if (cm.modifier.incCritChance) effects.push(`+${cm.modifier.incCritChance}% crit`);
      if (cm.modifier.incCritMultiplier) effects.push(`+${cm.modifier.incCritMultiplier}% crit dmg`);
      if (cm.modifier.incCastSpeed) effects.push(`+${cm.modifier.incCastSpeed}% speed`);
      parts.push(`${effects.join(', ')} ${cond}`);
    }
  }
  if (mod.procs?.length) {
    for (const proc of mod.procs) {
      const pct = Math.round(proc.chance * 100);
      const trig = proc.trigger === 'onHit' ? 'on hit' : proc.trigger === 'onCrit' ? 'on crit'
        : proc.trigger === 'onKill' ? 'on kill' : proc.trigger === 'onDodge' ? 'on dodge' : proc.trigger;
      if (proc.bonusCast) parts.push(`${pct}% ${trig}: re-cast`);
      else if (proc.applyDebuff) parts.push(`${pct}% ${trig}: ${proc.applyDebuff.debuffId}`);
      else if (proc.castSkill) parts.push(`${pct}% ${trig}: cast ${proc.castSkill}`);
      else if (proc.instantDamage) parts.push(`${pct}% ${trig}: ${proc.instantDamage.flatDamage} ${proc.instantDamage.element} dmg`);
      else if (proc.healPercent) parts.push(`${pct}% ${trig}: heal ${proc.healPercent}%`);
      else parts.push(`${pct}% ${trig}: proc`);
    }
  }
  if (mod.debuffInteraction) {
    const di = mod.debuffInteraction;
    if (di.bonusDamageVsDebuffed) parts.push(`+${di.bonusDamageVsDebuffed.incDamage}% vs ${di.bonusDamageVsDebuffed.debuffId}`);
    if (di.consumeDebuff) parts.push(`Consume ${di.consumeDebuff.debuffId}: ${di.consumeDebuff.damagePerStack} dmg/stack`);
    if (di.debuffOnCrit) parts.push(`Crit \u2192 ${di.debuffOnCrit.debuffId} (${di.debuffOnCrit.stacks} stacks)`);
    if (di.debuffEffectBonus) parts.push(`Debuffs ${di.debuffEffectBonus}% stronger`);
    if (di.debuffDurationBonus) parts.push(`Debuffs last ${di.debuffDurationBonus}% longer`);
    if (di.spreadDebuffOnKill) parts.push(`Kill spreads: ${di.spreadDebuffOnKill.debuffIds.join(', ')}`);
  }
  if (mod.chargeConfig) parts.push(`Charges: ${mod.chargeConfig.chargeId} (max ${mod.chargeConfig.maxCharges})`);
  if (mod.splitDamage?.length) {
    for (const s of mod.splitDamage) parts.push(`${s.percent}% as ${s.element}`);
  }
  if (mod.addTag) parts.push(`+${mod.addTag} tag`);
  if (mod.removeTag) parts.push(`-${mod.removeTag} tag`);

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

  // Cross-skill globalEffect (buffs all equipped skills)
  if (mod.globalEffect) {
    const ge = mod.globalEffect;
    if (ge.damageMult && ge.damageMult !== 1) parts.push(`+${Math.round((ge.damageMult - 1) * 100)}% damage (all skills)`);
    if (ge.attackSpeedMult && ge.attackSpeedMult !== 1) parts.push(`+${Math.round((ge.attackSpeedMult - 1) * 100)}% speed (all skills)`);
    if (ge.defenseMult && ge.defenseMult !== 1) parts.push(`+${Math.round((ge.defenseMult - 1) * 100)}% defense (all skills)`);
    if (ge.clearSpeedMult && ge.clearSpeedMult !== 1) parts.push(`+${Math.round((ge.clearSpeedMult - 1) * 100)}% clear speed (all skills)`);
    if (ge.critChanceBonus) parts.push(`+${ge.critChanceBonus}% crit (all skills)`);
    if (ge.critMultiplierBonus) parts.push(`+${ge.critMultiplierBonus}% crit dmg (all skills)`);
    if (ge.xpMult && ge.xpMult !== 1) parts.push(`+${Math.round((ge.xpMult - 1) * 100)}% XP (all skills)`);
    if (ge.itemDropMult && ge.itemDropMult !== 1) parts.push(`+${Math.round((ge.itemDropMult - 1) * 100)}% items (all skills)`);
    if (ge.materialDropMult && ge.materialDropMult !== 1) parts.push(`+${Math.round((ge.materialDropMult - 1) * 100)}% materials (all skills)`);
    if (ge.resistBonus) parts.push(`+${ge.resistBonus} resist (all skills)`);
  }

  return parts;
}

// ─── SVG Layout ───

interface LayoutNode {
  node: SkillGraphNode;
  x: number;
  y: number;
}

function layoutNodes(nodes: SkillGraphNode[]): LayoutNode[] {
  const tiers: Record<number, SkillGraphNode[]> = {};
  for (const n of nodes) {
    if (!tiers[n.tier]) tiers[n.tier] = [];
    tiers[n.tier].push(n);
  }

  const maxTier = Math.max(...Object.keys(tiers).map(Number));
  const result: LayoutNode[] = [];
  const width = 500;
  const rowHeight = 95; // Increased for labels
  const padding = 35;

  for (let tier = 0; tier <= maxTier; tier++) {
    const tierNodes = tiers[tier] ?? [];
    const y = padding + tier * rowHeight;
    const spacing = width / (tierNodes.length + 1);
    for (let i = 0; i < tierNodes.length; i++) {
      result.push({ node: tierNodes[i], x: spacing * (i + 1), y });
    }
  }

  return result;
}

// ─── Mobile Branch Derivation ───

interface Branch {
  label: string;
  nodes: SkillGraphNode[];
}

function deriveBranches(graph: SkillGraph): Branch[] {
  const nodeMap = new Map<string, SkillGraphNode>();
  for (const n of graph.nodes) nodeMap.set(n.id, n);

  const startNode = graph.nodes.find(n => n.nodeType === 'start');
  if (!startNode) return [];

  // BFS from each start connection toward keystones
  const branches: Branch[] = [];
  const usedInBranch = new Set<string>();

  for (const startConn of startNode.connections) {
    const branch: SkillGraphNode[] = [startNode];
    const visited = new Set<string>([startNode.id]);
    const queue = [startConn];
    let keystoneName = '';

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = nodeMap.get(id);
      if (!node) continue;
      branch.push(node);
      usedInBranch.add(id);

      if (node.nodeType === 'keystone') {
        keystoneName = node.name;
        continue; // Don't BFS past keystones
      }

      // Continue BFS toward higher tiers (forward progress)
      for (const conn of node.connections) {
        const connNode = nodeMap.get(conn);
        if (connNode && !visited.has(conn) && connNode.tier >= node.tier) {
          queue.push(conn);
        }
      }
    }

    // Sort by tier then by position in original array
    branch.sort((a, b) => a.tier - b.tier);
    branches.push({ label: keystoneName || `Branch ${branches.length + 1}`, nodes: branch });
  }

  // Find cross-connect nodes (in multiple branches or not in any)
  const crossNodes = graph.nodes.filter(n =>
    n.nodeType !== 'start' && !usedInBranch.has(n.id)
  );
  if (crossNodes.length > 0) {
    branches.push({ label: 'Cross-Connects', nodes: crossNodes.sort((a, b) => a.tier - b.tier) });
  }

  return branches;
}

// ─── Detail Panel (shared) ───

function NodeDetailPanel({ node, isAllocated, canAlloc, onAllocate }: {
  node: SkillGraphNode;
  isAllocated: boolean;
  canAlloc: boolean;
  onAllocate: (nodeId: string) => void;
}) {
  const modParts = formatModifier(node.modifier);
  const connNames = node.connections;

  return (
    <div className="bg-gray-800/90 border border-gray-600 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${
          node.nodeType === 'keystone' ? 'text-yellow-300' :
          node.nodeType === 'notable' ? 'text-blue-300' : 'text-white'
        }`}>
          {node.name}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
          node.nodeType === 'keystone' ? 'bg-yellow-900/60 text-yellow-400' :
          node.nodeType === 'notable' ? 'bg-blue-900/60 text-blue-400' :
          node.nodeType === 'start' ? 'bg-gray-700 text-gray-400' :
          'bg-gray-700 text-gray-400'
        }`}>
          {node.nodeType.toUpperCase()}
        </span>
        {isAllocated && <span className="text-xs text-purple-400 font-bold">ALLOCATED</span>}
      </div>
      <div className="text-xs text-gray-400 mt-1">{node.description}</div>
      {modParts.length > 0 && (
        <div className="text-xs text-green-400 mt-1.5">{modParts.join(' \u2022 ')}</div>
      )}
      {connNames.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">{'\u2192'} connects to: {connNames.join(', ')}</div>
      )}
      {canAlloc && (
        <button
          onClick={() => onAllocate(node.id)}
          className="mt-2 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 text-xs font-bold rounded transition-colors"
        >
          Allocate Point
        </button>
      )}
    </div>
  );
}

// ─── Node Type Indicator ───

function NodeTypeIndicator({ nodeType, isAllocated, canAlloc }: {
  nodeType: string; isAllocated: boolean; canAlloc: boolean;
}) {
  const base = 'w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0';
  const shape = nodeType === 'keystone' ? 'rotate-45 rounded-sm' : 'rounded-full';
  const color = isAllocated ? 'bg-purple-600 text-white' : canAlloc ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-500';
  const icon = isAllocated ? '\u2713' : nodeType === 'keystone' ? '\u2666' : nodeType === 'notable' ? '\u25C6' : '\u2022';

  return <div className={`${base} ${shape} ${color}`}>{icon}</div>;
}

// ─── Main Component ───

export default function SkillGraphView({ skill, progress, gold, onAllocate, onRespec }: {
  skill: SkillDef;
  progress: SkillProgress | undefined;
  gold: number;
  onAllocate: (nodeId: string) => void;
  onRespec: () => void;
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [lastAllocatedNode, setLastAllocatedNode] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState(0);
  const isMobile = useIsMobile();

  const graph = skill.skillGraph;
  if (!graph || !progress) return null;

  const layout = useMemo(() => layoutNodes(graph.nodes), [graph]);
  const layoutMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const ln of layout) m.set(ln.node.id, ln);
    return m;
  }, [layout]);

  const branches = useMemo(() => deriveBranches(graph), [graph]);

  const availablePoints = progress.level - progress.allocatedNodes.length;
  const respecCost = getGraphRespecCost(progress.level);

  // SVG dimensions
  const tiers = useMemo(() => {
    const t: Record<number, SkillGraphNode[]> = {};
    for (const n of graph.nodes) {
      if (!t[n.tier]) t[n.tier] = [];
      t[n.tier].push(n);
    }
    return t;
  }, [graph]);
  const maxTier = Math.max(...Object.keys(tiers).map(Number));
  const svgWidth = 500;
  const svgHeight = (maxTier + 1) * 95 + 70;

  const nodeRadius = (type: string) => {
    switch (type) {
      case 'start': return 12;
      case 'minor': return 10;
      case 'notable': return 14;
      case 'keystone': return 16;
      default: return 10;
    }
  };

  const handleAllocate = useCallback((nodeId: string) => {
    setLastAllocatedNode(nodeId);
    setSelectedNode(null);
    onAllocate(nodeId);
    // Clear flash after animation
    setTimeout(() => setLastAllocatedNode(null), 400);
  }, [onAllocate]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(prev => prev === nodeId ? null : nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string, canAlloc: boolean) => {
    if (canAlloc) handleAllocate(nodeId);
  }, [handleAllocate]);

  const selectedNodeData = selectedNode ? graph.nodes.find(n => n.id === selectedNode) : null;
  const selectedIsAllocated = selectedNode ? progress.allocatedNodes.includes(selectedNode) : false;
  const selectedCanAlloc = selectedNode ? !selectedIsAllocated && canAllocateGraphNode(graph, progress.allocatedNodes, selectedNode, progress.level) : false;

  return (
    <div className="mt-2 ml-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Graph Tree: <span className="text-white font-bold">{availablePoints}</span> pts available / {progress.level} total
        </div>
      </div>

      {/* ─── Desktop: SVG Graph ─── */}
      {!isMobile && (
        <>
          <div className="relative overflow-x-auto bg-gray-900/60 rounded-lg border border-gray-700" style={{ minHeight: Math.min(svgHeight, 500) }}>
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full"
              style={{ maxHeight: 500 }}
              onClick={(e) => {
                // Click SVG background to deselect
                if ((e.target as SVGElement).tagName === 'svg') setSelectedNode(null);
              }}
            >
              {/* Connection lines */}
              {layout.map(ln =>
                ln.node.connections.map(connId => {
                  const target = layoutMap.get(connId);
                  if (!target) return null;
                  if (ln.node.tier > target.node.tier) return null;
                  const bothAllocated = progress.allocatedNodes.includes(ln.node.id) && progress.allocatedNodes.includes(connId);
                  const oneAllocated = progress.allocatedNodes.includes(ln.node.id) || progress.allocatedNodes.includes(connId);
                  const isSelectedConn = selectedNode === ln.node.id || selectedNode === connId;
                  // Unallocated notable paths get faint blue
                  const targetNode = target.node;
                  const isNotablePath = !bothAllocated && (ln.node.nodeType === 'notable' || targetNode.nodeType === 'notable' || ln.node.nodeType === 'keystone' || targetNode.nodeType === 'keystone');

                  return (
                    <line
                      key={`${ln.node.id}-${connId}`}
                      x1={ln.x} y1={ln.y}
                      x2={target.x} y2={target.y}
                      stroke={
                        bothAllocated ? '#a855f7' :
                        isSelectedConn ? '#60a5fa' :
                        oneAllocated ? '#6b21a8' :
                        isNotablePath ? '#1e3a5f' :
                        '#374151'
                      }
                      strokeWidth={bothAllocated ? 2.5 : isSelectedConn ? 2 : 1.5}
                      strokeDasharray={bothAllocated ? undefined : '4,4'}
                      strokeLinecap="round"
                    />
                  );
                })
              )}

              {/* Nodes */}
              {layout.map(ln => {
                const isAllocated = progress.allocatedNodes.includes(ln.node.id);
                const canAlloc = !isAllocated && canAllocateGraphNode(graph, progress.allocatedNodes, ln.node.id, progress.level);
                const r = nodeRadius(ln.node.nodeType);
                const isSelected = selectedNode === ln.node.id;
                const isFlashing = lastAllocatedNode === ln.node.id;

                let fill = '#374151';
                let stroke = '#6b7280';
                if (isAllocated) {
                  fill = ln.node.nodeType === 'keystone' ? '#854d0e' : '#581c87';
                  stroke = ln.node.nodeType === 'keystone' ? '#fbbf24' : '#a855f7';
                } else if (canAlloc) {
                  fill = '#052e16';
                  stroke = '#22c55e';
                }

                const isKeystone = ln.node.nodeType === 'keystone';
                const isNotable = ln.node.nodeType === 'notable';

                // Animation style
                let animStyle: React.CSSProperties = { cursor: canAlloc || !isAllocated ? 'pointer' : 'default' };
                if (isFlashing) {
                  animStyle.animation = 'node-allocate 400ms ease-out';
                } else if (isSelected) {
                  animStyle.animation = 'node-selected 2s ease-in-out infinite';
                } else if (canAlloc) {
                  animStyle.animation = 'node-pulse 2s ease-in-out infinite';
                }

                return (
                  <g
                    key={ln.node.id}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(ln.node.id); }}
                    onDoubleClick={() => handleNodeDoubleClick(ln.node.id, canAlloc)}
                    style={animStyle}
                  >
                    {/* Selected outer ring */}
                    {isSelected && (
                      isKeystone ? (
                        <rect
                          x={ln.x - r - 4} y={ln.y - r - 4}
                          width={(r + 4) * 2} height={(r + 4) * 2}
                          fill="none" stroke="#60a5fa" strokeWidth={1.5}
                          transform={`rotate(45, ${ln.x}, ${ln.y})`}
                          rx={2} opacity={0.6}
                        />
                      ) : (
                        <circle
                          cx={ln.x} cy={ln.y} r={r + 4}
                          fill="none" stroke="#60a5fa" strokeWidth={1.5} opacity={0.6}
                        />
                      )
                    )}

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

                    {/* Check for allocated */}
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

                    {/* Labels for notables and keystones */}
                    {(isNotable || isKeystone) && (
                      <text
                        x={ln.x} y={ln.y + r + 12}
                        textAnchor="middle"
                        fill={isKeystone ? '#fbbf24' : '#93c5fd'}
                        fontSize={8}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {ln.node.name.length > 16 ? ln.node.name.slice(0, 14) + '..' : ln.node.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Desktop detail panel */}
          {selectedNodeData && (
            <NodeDetailPanel
              node={selectedNodeData}
              isAllocated={selectedIsAllocated}
              canAlloc={selectedCanAlloc}
              onAllocate={handleAllocate}
            />
          )}
        </>
      )}

      {/* ─── Mobile: Branch Path View ─── */}
      {isMobile && branches.length > 0 && (
        <div className="space-y-2">
          {/* Branch tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {branches.map((branch, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveBranch(idx); setSelectedNode(null); }}
                className={`text-xs px-2 py-1 rounded whitespace-nowrap flex-shrink-0 transition-colors ${
                  activeBranch === idx
                    ? 'bg-purple-800 text-purple-200 font-bold'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {branch.label}
              </button>
            ))}
          </div>

          {/* Active branch path */}
          <div className="space-y-0">
            {branches[activeBranch]?.nodes.map((node, idx, arr) => {
              const isAllocated = progress.allocatedNodes.includes(node.id);
              const canAlloc = !isAllocated && canAllocateGraphNode(graph, progress.allocatedNodes, node.id, progress.level);
              const isSelected = selectedNode === node.id;
              const modParts = formatModifier(node.modifier);
              const colors = isAllocated ? ALLOCATED_COLORS[node.nodeType] : canAlloc ? AVAILABLE_COLORS : NODE_COLORS[node.nodeType];

              // Connection line between cards
              const nextNode = arr[idx + 1];
              const nextAllocated = nextNode ? progress.allocatedNodes.includes(nextNode.id) : false;
              const showLine = idx < arr.length - 1;
              const bothAllocForLine = isAllocated && nextAllocated;
              const oneAllocForLine = isAllocated || nextAllocated;

              return (
                <div key={node.id}>
                  {/* Node card */}
                  <button
                    onClick={() => setSelectedNode(prev => prev === node.id ? null : node.id)}
                    className={`w-full text-left rounded border p-2 transition-all ${colors.border} ${
                      isSelected ? 'ring-2 ring-blue-400 brightness-110' :
                      isAllocated ? colors.bg :
                      canAlloc ? `${colors.bg} hover:brightness-125` :
                      `${colors.bg} opacity-60`
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <NodeTypeIndicator nodeType={node.nodeType} isAllocated={isAllocated} canAlloc={canAlloc} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold ${colors.text}`}>{node.name}</span>
                          {node.nodeType === 'keystone' && <span className="text-xs bg-yellow-900/60 text-yellow-400 px-1 rounded font-bold">KEY</span>}
                          {node.nodeType === 'notable' && <span className="text-xs bg-blue-900/60 text-blue-400 px-1 rounded font-bold">NOT</span>}
                        </div>
                        {modParts.length > 0 && (
                          <div className="text-xs text-green-400 mt-0.5">{modParts.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Allocate button when selected */}
                  {isSelected && canAlloc && (
                    <div className="ml-7 mt-1 mb-1">
                      <button
                        onClick={() => handleAllocate(node.id)}
                        className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 text-xs font-bold rounded transition-colors"
                      >
                        Allocate Point
                      </button>
                    </div>
                  )}

                  {/* Selected detail */}
                  {isSelected && (
                    <div className="ml-7 text-xs text-gray-500 mt-0.5 mb-1">
                      {node.description}
                      {node.connections.length > 0 && (
                        <span className="block mt-0.5">{'\u2192'} connects to: {node.connections.join(', ')}</span>
                      )}
                    </div>
                  )}

                  {/* Connection line */}
                  {showLine && (
                    <div className="flex justify-start ml-4 my-0">
                      <div
                        className="w-0.5 h-3"
                        style={{
                          backgroundColor: bothAllocForLine ? '#a855f7' : oneAllocForLine ? '#581c87' : '#374151',
                          borderStyle: bothAllocForLine ? 'solid' : 'dashed',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

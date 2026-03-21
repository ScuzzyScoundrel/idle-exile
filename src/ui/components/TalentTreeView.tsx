import { useState, useMemo, useCallback, type ReactNode } from 'react';
import type { SkillDef, SkillProgress, SkillModifier, TalentNode, TalentBranch } from '../../types';
import {
  canAllocateTalentRank,
  getTalentRespecCost,
  getTotalAllocatedPoints,
  getBranchPoints,
} from '../../engine/talentTree';
import { TALENT_TIER_GATES } from '../../data/balance';
import Tooltip from './Tooltip';

// ─── Color Palettes ───

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  behavior:       { bg: 'bg-gray-800',     border: 'border-gray-600',   text: 'text-gray-200',  badge: 'bg-gray-700 text-gray-400' },
  notable:        { bg: 'bg-blue-900/60',  border: 'border-blue-500',   text: 'text-blue-200',  badge: 'bg-blue-900/60 text-blue-400' },
  keystoneChoice: { bg: 'bg-amber-900/40', border: 'border-amber-500',  text: 'text-amber-200', badge: 'bg-amber-900/60 text-amber-400' },
  keystone:       { bg: 'bg-yellow-900/40',border: 'border-yellow-500', text: 'text-yellow-200',badge: 'bg-yellow-900/60 text-yellow-400' },
};

const ALLOCATED_BG = 'bg-purple-900/50';
const ALLOCATED_BORDER = 'border-purple-500';
const AVAILABLE_BORDER = 'border-green-500';

// ─── Proc Name Formatting ───

function formatProcName(id: string): string {
  const stripped = id.replace(/^[a-z]{2}_/, '');
  return stripped.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Debuff Display Names ───

const DEBUFF_DISPLAY: Record<string, string> = {
  poisoned: 'Poison', bleeding: 'Bleed', burning: 'Ignite',
  chilled: 'Chill', shocked: 'Shock', vulnerable: 'Vulnerable',
  cursed: 'Curse', weakened: 'Weaken', blinded: 'Blind',
  slowed: 'Slow', corroded: 'Corrode',
};

// ─── Modifier Formatting (adapted from SkillGraphView) ───

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
  if (mod.applyDebuff) {
    const debuffName = DEBUFF_DISPLAY[mod.applyDebuff.debuffId] ?? mod.applyDebuff.debuffId;
    const pct = Math.round(mod.applyDebuff.chance * 100);
    const dur = mod.applyDebuff.duration ? ` (${mod.applyDebuff.duration}s)` : '';
    parts.push(pct >= 100 ? `Always applies ${debuffName}${dur}` : `${pct}% to apply ${debuffName}${dur}`);
  }
  if (mod.flags?.includes('lifeLeech')) parts.push('Life leech');
  if (mod.flags?.includes('alwaysCrit')) parts.push('Always crit');
  if (mod.flags?.includes('cannotCrit')) parts.push('Cannot crit');
  if (mod.flags?.includes('ignoreResists')) parts.push('Ignore resists');

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
        : cm.condition === 'whileBuffActive' ? 'while buffed'
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
      else if (proc.applyDebuff) {
        const name = DEBUFF_DISPLAY[proc.applyDebuff.debuffId] ?? formatProcName(proc.applyDebuff.debuffId);
        const dur = proc.applyDebuff.duration ? ` (${proc.applyDebuff.duration}s)` : '';
        parts.push(`${pct}% ${trig}: apply ${name}${dur}`);
      }
      else if (proc.castSkill) parts.push(`${pct}% ${trig}: cast ${proc.castSkill}`);
      else if (proc.instantDamage) {
        const flat = proc.instantDamage.flatDamage;
        const scale = proc.instantDamage.scaleRatio;
        const ele = proc.instantDamage.element;
        if (flat) parts.push(`${pct}% ${trig}: ${flat} ${ele} dmg`);
        else if (scale) parts.push(`${pct}% ${trig}: ${Math.round(scale * 100)}% as ${ele}`);
        else parts.push(`${pct}% ${trig}: ${ele} dmg`);
      }
      else if (proc.healPercent) parts.push(`${pct}% ${trig}: heal ${proc.healPercent}%`);
      else if (proc.applyBuff) {
        const name = formatProcName(proc.applyBuff.buffId ?? proc.id);
        const dur = proc.applyBuff.duration ? ` ${proc.applyBuff.duration}s` : '';
        parts.push(`${pct}% ${trig}: ${name}${dur}`);
      }
      else parts.push(`${pct}% ${trig}: ${formatProcName(proc.id)}`);
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

// ─── Tier Gate Label ───

function tierGateLabel(tier: number): string | null {
  const gate = TALENT_TIER_GATES[tier - 1];
  if (gate === undefined || gate === 0) return null;
  return `Requires ${gate} points in branch`;
}

// ─── Rank Display ───

function rankDisplay(node: TalentNode, currentRank: number): string {
  return `${currentRank}/${node.maxRank}`;
}

// ─── Node Type Badge ───

function nodeTypeBadge(nodeType: string): string {
  switch (nodeType) {
    case 'behavior': return '';
    case 'notable': return 'Notable';
    case 'keystoneChoice': return 'Choice';
    case 'keystone': return 'Keystone';
    case 'conditional': return 'Cond';
    case 'support': return 'Support';
    default: return '';
  }
}

// ─── Per-Rank Modifier Description ───

function getRankModDescription(node: TalentNode, currentRank: number): string[] {
  if (node.maxRank <= 1) return formatModifier(node.modifier);

  // Show current rank effects
  if (currentRank === 0) {
    // Show rank 1 preview
    const rank1Mod = node.perRankModifiers?.[1] ?? node.modifier;
    return formatModifier(rank1Mod);
  }

  // Show current effective modifier
  if (node.perRankModifiers?.[currentRank]) {
    return formatModifier(node.perRankModifiers[currentRank]);
  }

  // Fallback: scaled modifier
  return formatModifier(node.modifier);
}

// ─── Stat Glossary ───

const STAT_GLOSSARY: Record<string, string> = {
  // Full forms (post-Sprint 3)
  'weapon mastery':             'Increases base weapon damage scaling',
  'weapon counter-attack':      'A free counter-attack triggered after dodging',
  'fire penetration':           'Ignores a portion of enemy fire resistance',
  'cold penetration':           'Ignores a portion of enemy cold resistance',
  'lightning penetration':      'Ignores a portion of enemy lightning resistance',
  'chaos penetration':          'Ignores a portion of enemy chaos resistance',
  'damage over time multiplier':'Multiplies all damage-over-time effects (poison, bleed, burn)',
  'ailment duration':           'How long poison, bleed, and burn effects last',
  'critical hit chance':        'Chance for attacks to deal bonus damage based on critical multiplier',
  'critical multiplier':        'Bonus damage multiplier on critical hits (base is +50%)',
  'damage reduction':           'Flat percentage reduction to all incoming damage',
  'life on hit':                'Restores a flat amount of life each time you hit an enemy',
  'life leech':                 'Restores life equal to a percentage of damage dealt',
  'cast speed':                 'Reduces Spell skill cooldowns — higher is faster',
  'attack speed':               'Reduces Attack skill cooldowns — higher is faster',
  'execute threshold':          'Instantly kills enemies below this HP percentage',
  'energy shield':              'Absorbs damage before life; recharges after not taking damage',
  // Abbreviated forms (pre-Sprint 3)
  'wpn mastery':                'Increases base weapon damage scaling',
  'wpn counter':                'A free counter-attack triggered after dodging',
  'fire pen':                   'Ignores a portion of enemy fire resistance',
  'cold pen':                   'Ignores a portion of enemy cold resistance',
  'lightning pen':              'Ignores a portion of enemy lightning resistance',
  'chaos pen':                  'Ignores a portion of enemy chaos resistance',
  'dot mult':                   'Multiplies all damage-over-time effects (poison, bleed, burn)',
  'dot multiplier':             'Multiplies all damage-over-time effects (poison, bleed, burn)',
  'ailment dur':                'How long poison, bleed, and burn effects last',
  'crit mult':                  'Bonus damage multiplier on critical hits (base is +50%)',
  'crit chance':                'Chance for attacks to deal bonus damage based on critical multiplier',
  // Mechanics
  'fortify':                    'Grants damage reduction per stack, earned by hitting enemies',
  'evasion':                    'Chance to completely avoid incoming attacks',
  'overkill':                   'Damage exceeding the lethal hit — can carry to the next enemy',
  'spread':                     'Transfers debuff stacks from a dying enemy to the next target',
  'icd':                        'Internal cooldown — minimum time between proc activations',
  // Ailments
  'poison':                     'Chaos DoT — 15% of hit damage per second per instance. No stack cap. Scales with YOUR damage.',
  'poisoned':                   'Chaos DoT — 15% of hit damage per second per instance. No stack cap.',
  'poisons':                    'Chaos DoT — 15% of hit damage per second per instance. No stack cap.',
  'bleed':                      'Physical spike — 30% of snapshot damage triggers each time the enemy attacks. Max 5 stacks.',
  'bleeding':                   'Physical spike — 30% of snapshot damage triggers each time the enemy attacks. Max 5 stacks.',
  'ignite':                     'Fire DoT — burns for 1% of enemy max HP per second per stack. Max 5 stacks (5%/s cap).',
  'burn':                       'Fire DoT — burns for 1% of enemy max HP per second per stack. Max 5 stacks.',
  'burning':                    'Fire DoT — burns for 1% of enemy max HP per second per stack. Max 5 stacks.',
  'chill':                      'Cold debuff — reduces enemy attack speed by 20%.',
  'chilled':                    'Cold debuff — reduces enemy attack speed by 20%.',
  'shock':                      'Lightning debuff — enemy takes 8% increased damage per stack. Max 3 stacks (24%).',
  'shocked':                    'Lightning debuff — enemy takes 8% increased damage per stack. Max 3 stacks.',
  'vulnerable':                 'Target takes 20% more damage from all sources.',
  'cursed':                     'Target resists reduced by 15 per stack. Max 3 stacks.',
  'weakened':                   'Target deals 10% less damage.',
  // Combo States
  'exposed':                    'Created by Stab crits. Consumed by Assassinate for +25% damage.',
  'deep wound':                 'Created by Viper Strike. Consumed by Chain Strike for burst chaos damage.',
  'shadow momentum':            'Created by Shadow Dash. Next skill cooldown starts 2 seconds earlier.',
  'mark':                       'Applies a debuff to the target that amplifies damage taken or triggers special effects.',
  // Skill Mechanics
  'counter':                    'A reactive attack triggered when an enemy hits you during a defensive stance.',
  'sequential':                 'Hits target different enemies in order — hit 1 on mob 1, hit 2 on mob 2, etc.',
  'chain':                      'Bounces to nearby enemies after hitting the primary target.',
  'trap':                       'Placed on the ground; arms after a delay, then detonates when enemies attack.',
};

// Pre-build regex from glossary keys (longest first to avoid partial matches)
const _glossaryTerms = Object.keys(STAT_GLOSSARY).sort((a, b) => b.length - a.length);
const _glossaryPattern = new RegExp(
  `\\b(${_glossaryTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi',
);

function renderDescription(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const seen = new Set<string>();
  // Reset regex state for each call
  _glossaryPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = _glossaryPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const term = match[1];
    const termLower = term.toLowerCase();
    const desc = STAT_GLOSSARY[termLower];
    if (desc && !seen.has(desc)) {
      // Deduplicate by description content (handles abbreviated + full forms)
      seen.add(desc);
      parts.push(
        <Tooltip key={match.index} content={desc}>
          <span className="underline decoration-dotted decoration-gray-500 cursor-help">{term}</span>
        </Tooltip>,
      );
    } else {
      parts.push(term);
    }
    lastIndex = _glossaryPattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  if (parts.length === 0) return text;
  return <>{parts}</>;
}

// ─── Nodes grouped by tier ───

function groupByTier(nodes: TalentNode[]): Map<number, TalentNode[]> {
  const tiers = new Map<number, TalentNode[]>();
  for (const node of nodes) {
    const list = tiers.get(node.tier) ?? [];
    list.push(node);
    tiers.set(node.tier, list);
  }
  // Sort nodes within each tier by position
  for (const [, list] of tiers) {
    list.sort((a, b) => a.position - b.position);
  }
  return tiers;
}

// ─── Main Component ───

export default function TalentTreeView({ skill, progress, gold, onAllocate, onRespec }: {
  skill: SkillDef;
  progress: SkillProgress | undefined;
  gold: number;
  onAllocate: (nodeId: string) => void;
  onRespec: () => void;
}) {
  const [activeBranch, setActiveBranch] = useState(0);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const tree = skill.talentTree;
  if (!tree || !progress) return null;

  const ranks = progress.allocatedRanks ?? {};
  const totalAllocated = getTotalAllocatedPoints(ranks);
  const availablePoints = progress.level - totalAllocated;
  const respecCost = getTalentRespecCost(progress.level);

  const branch: TalentBranch = tree.branches[activeBranch];
  const branchPoints = getBranchPoints(tree, activeBranch, ranks);

  const tierGroups = useMemo(() => groupByTier(branch.nodes), [branch]);
  const sortedTiers = useMemo(() => [...tierGroups.keys()].sort((a, b) => a - b), [tierGroups]);

  const handleAllocate = useCallback((nodeId: string) => {
    onAllocate(nodeId);
  }, [onAllocate]);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNode(prev => prev === nodeId ? null : nodeId);
  }, []);

  return (
    <div className="mt-2 ml-2 space-y-2">
      {/* Branch Tabs */}
      <div className="flex gap-1">
        {tree.branches.map((b, idx) => {
          const pts = getBranchPoints(tree, idx, ranks);
          return (
            <button
              key={b.id}
              onClick={() => { setActiveBranch(idx); setExpandedNode(null); }}
              className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition-all ${
                activeBranch === idx
                  ? 'bg-amber-800 text-amber-200'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {b.name}
              {pts > 0 && <span className="ml-1 text-amber-400">({pts})</span>}
            </button>
          );
        })}
      </div>

      {/* Branch description + points bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{branch.description}</div>
      </div>
      <div className="text-xs text-gray-400">
        Branch: <span className="text-white font-bold">{branchPoints}</span> pts
        {' \u2022 '}
        Available: <span className="text-white font-bold">{availablePoints}</span> / {progress.level}
      </div>

      {/* Node List by Tier */}
      <div className="space-y-1">
        {sortedTiers.map(tier => {
          const nodes = tierGroups.get(tier)!;
          const gateLabel = tierGateLabel(tier);
          const gateUnlocked = gateLabel === null || branchPoints >= (TALENT_TIER_GATES[tier - 1] ?? 0);

          return (
            <div key={tier}>
              {/* Tier gate label */}
              {gateLabel && (
                <div className={`text-xs px-2 py-0.5 mb-0.5 rounded ${
                  gateUnlocked ? 'text-green-400 bg-green-900/20' : 'text-gray-500 bg-gray-800/40'
                }`}>
                  T{tier} \u2014 {gateLabel}
                </div>
              )}

              {/* Nodes in this tier */}
              {nodes.map(node => {
                const currentRank = ranks[node.id] ?? 0;
                const isAllocated = currentRank > 0;
                const canAlloc = canAllocateTalentRank(tree, ranks, node.id, progress.level);
                const isExpanded = expandedNode === node.id;
                const colors = TYPE_COLORS[node.nodeType] ?? TYPE_COLORS.behavior;
                const badge = nodeTypeBadge(node.nodeType);
                const modParts = getRankModDescription(node, currentRank);

                // Exclusive partner info for keystoneChoice
                const exclusivePartner = node.exclusiveWith?.length
                  ? node.exclusiveWith.map(exId => {
                      // Find the partner node name
                      for (const b of tree.branches) {
                        const partner = b.nodes.find(n => n.id === exId);
                        if (partner) return partner.name;
                      }
                      return exId;
                    })
                  : null;

                const isExcluded = node.exclusiveWith?.some(exId => (ranks[exId] ?? 0) > 0) ?? false;

                return (
                  <div key={node.id} className="mb-1">
                    <button
                      onClick={() => toggleExpand(node.id)}
                      className={`w-full text-left rounded border p-2 transition-all ${
                        isAllocated
                          ? `${ALLOCATED_BG} ${ALLOCATED_BORDER}`
                          : canAlloc
                            ? `${colors.bg} ${AVAILABLE_BORDER} hover:brightness-125`
                            : isExcluded
                              ? `${colors.bg} border-red-800/50 opacity-40`
                              : `${colors.bg} ${colors.border} opacity-60`
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Rank indicator */}
                        <div className={`w-8 h-5 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${
                          isAllocated
                            ? 'bg-purple-700 text-purple-200'
                            : canAlloc
                              ? 'bg-green-800 text-green-300'
                              : 'bg-gray-700 text-gray-500'
                        }`}>
                          {rankDisplay(node, currentRank)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-bold ${isAllocated ? 'text-purple-300' : colors.text}`}>
                              {node.name}
                            </span>
                            {badge && (
                              <span className={`text-xs px-1 rounded font-bold ${colors.badge}`}>
                                {badge}
                              </span>
                            )}
                          </div>
                          {modParts.length > 0 && (
                            <div className="text-xs text-green-400 mt-0.5">{modParts.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="panel-iron p-3 mt-1 ml-2">
                        <div className="text-xs text-gray-400">{renderDescription(node.description)}</div>

                        {/* Rank-specific info for multi-rank nodes */}
                        {node.maxRank > 1 && node.perRankModifiers && (
                          <div className="mt-2 space-y-1">
                            {Array.from({ length: node.maxRank }, (_, i) => i + 1).map(r => {
                              const rankMod = node.perRankModifiers![r] ?? node.modifier;
                              const rankParts = formatModifier(rankMod);
                              const isCurrent = r === currentRank;
                              return (
                                <div key={r} className={`text-xs ${isCurrent ? 'text-purple-300 font-bold' : 'text-gray-500'}`}>
                                  Rank {r}: {rankParts.join(', ') || 'base modifier'}
                                  {isCurrent && ' (current)'}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Mutual exclusion warning */}
                        {exclusivePartner && (
                          <div className={`text-xs mt-1.5 ${isExcluded ? 'text-red-400' : 'text-amber-400'}`}>
                            {isExcluded
                              ? `Locked: exclusive with ${exclusivePartner.join(', ')}`
                              : `Choose one: exclusive with ${exclusivePartner.join(', ')}`
                            }
                          </div>
                        )}

                        {/* Allocate / Rank Up button */}
                        {canAlloc && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAllocate(node.id); }}
                            className="mt-2 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 text-xs font-bold rounded transition-colors"
                          >
                            {currentRank > 0 ? `Rank Up (${currentRank} \u2192 ${currentRank + 1})` : 'Allocate'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer: Respec */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700">
        <span className="text-xs text-gray-400">
          Total: <span className="text-white font-bold">{totalAllocated}</span> / {progress.level} pts
        </span>
        {totalAllocated > 0 && (
          <button
            onClick={onRespec}
            disabled={gold < respecCost}
            className={`text-xs px-2 py-1 rounded ${
              gold >= respecCost
                ? 'bg-red-900 hover:bg-red-800 text-red-300'
                : 'bg-gray-700 text-gray-600 cursor-not-allowed'
            }`}
            title={`Reset talent tree. Cost: ${respecCost} gold (preserves XP/level)`}
          >
            Respec ({respecCost}g)
          </button>
        )}
      </div>
    </div>
  );
}

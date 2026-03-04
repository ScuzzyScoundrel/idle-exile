import { useState, useEffect, useRef } from 'react';
import { useGameStore, ProcessClearsResult, useHasHydrated, calcFortifyDR } from '../../store/gameStore';
import { ZONE_DEFS, BAND_NAMES } from '../../data/zones';
import { checkZoneMastery, calcXpScale } from '../../engine/zones';
// calcDefensiveEfficiency removed — defense is now real-time
import { canGatherInZone, getGatheringSkillRequirement, calcGatheringXpRequired } from '../../engine/gathering';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { ZoneDef, Rarity, IdleMode, GatheringProfession, ClassResourceState, ActiveDebuff } from '../../types';
import { calcBagCapacity } from '../../data/items';
import SkillBar from '../components/SkillBar';
import { DamageFloaters, FloaterEntry } from '../components/DamageFloater';
import { getUnifiedSkillsForWeapon, getUnifiedSkillDef } from '../../data/unifiedSkills';
import { getEquippedWeaponType } from '../../engine/items';
import { getUnlockedSlotCount } from '../../engine/unifiedSkills';
import { WeaponType } from '../../types';
import { getRareMaterialDef } from '../../data/rareMaterials';
import { BOSS_INTERVAL, ZONE_ATTACK_INTERVAL, MASTERY_MILESTONES } from '../../data/balance';
import { getZoneMobTypes, getMobTypeDef } from '../../data/mobTypes';
import DailyQuestPanel from '../components/DailyQuestPanel';
import { resolveStats } from '../../engine/character';
import { getClassDef } from '../../data/classes';
import { getZoneInvasion } from '../../engine/invasions';

// Band visual theming
const BAND_GRADIENTS: Record<number, string> = {
  1: 'bg-gradient-to-br from-emerald-900 via-green-800 to-lime-900',
  2: 'bg-gradient-to-br from-sky-900 via-cyan-800 to-teal-900',
  3: 'bg-gradient-to-br from-red-900 via-orange-800 to-yellow-900',
  4: 'bg-gradient-to-br from-slate-900 via-gray-800 to-purple-900',
  5: 'bg-gradient-to-br from-indigo-900 via-violet-800 to-blue-900',
  6: 'bg-gradient-to-br from-black via-red-950 to-purple-950',
};

const BAND_BORDERS: Record<number, string> = {
  1: 'border-emerald-700',
  2: 'border-cyan-700',
  3: 'border-red-700',
  4: 'border-slate-600',
  5: 'border-indigo-700',
  6: 'border-red-900',
};

const BAND_EMOJIS: Record<number, string> = {
  1: '\u{1F332}',
  2: '\u{26F0}\uFE0F',
  3: '\u2694\uFE0F',
  4: '\u{1F480}',
  5: '\u26A1',
  6: '\u{1F311}',
};

// Hazard display config
const HAZARD_COLORS: Record<string, string> = {
  fire: 'text-red-400',
  cold: 'text-blue-400',
  lightning: 'text-yellow-400',
  chaos: 'text-purple-400',
};
const HAZARD_ICONS: Record<string, string> = {
  fire: '\u{1F525}',
  cold: '\u2744\uFE0F',
  lightning: '\u26A1',
  chaos: '\u{1F480}',
};

const HAZARD_STAT_MAP: Record<string, string> = {
  fire: 'fireResist',
  cold: 'coldResist',
  lightning: 'lightningResist',
  chaos: 'chaosResist',
};

// Debuff badge color/label mapping
const DEBUFF_META: Record<string, { text: string; bg: string; label: string }> = {
  chilled:    { text: 'text-cyan-300',   bg: 'bg-cyan-900/60',   label: 'CHI' },
  shocked:    { text: 'text-yellow-300', bg: 'bg-yellow-900/60', label: 'SHK' },
  burning:    { text: 'text-orange-400', bg: 'bg-orange-900/60', label: 'BRN' },
  poisoned:   { text: 'text-green-400',  bg: 'bg-green-900/60',  label: 'PSN' },
  bleeding:   { text: 'text-red-400',    bg: 'bg-red-900/60',    label: 'BLD' },
  weakened:   { text: 'text-gray-300',   bg: 'bg-gray-700/60',   label: 'WKN' },
  blinded:    { text: 'text-violet-300', bg: 'bg-violet-900/60', label: 'BLN' },
  vulnerable: { text: 'text-pink-400',   bg: 'bg-pink-900/60',   label: 'VLN' },
  cursed:     { text: 'text-purple-400', bg: 'bg-purple-900/60', label: 'CRS' },
  slowed:     { text: 'text-teal-300',   bg: 'bg-teal-900/60',   label: 'SLO' },
};

function DebuffBadge({ debuff }: { debuff: ActiveDebuff }) {
  const meta = DEBUFF_META[debuff.debuffId];
  const label = meta?.label ?? debuff.debuffId.slice(0, 3).toUpperCase();
  const text = meta?.text ?? 'text-gray-300';
  const bg = meta?.bg ?? 'bg-gray-700/60';
  return (
    <span className={`rounded-full px-1.5 text-[10px] font-mono font-semibold ${bg} ${text}`}>
      {label}{debuff.stacks > 1 ? ` x${debuff.stacks}` : ''}
    </span>
  );
}

// Format material ID to display name (snake_case → Title Case)
function formatMatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Mob drop rarity colors
import type { MobDropRarity, MobDrop } from '../../types';

const MOB_DROP_RARITY_COLOR: Record<MobDropRarity, string> = {
  common: 'text-amber-400/80',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-300',
};

// Rarity color classes
const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-orange-600',
};

const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-gray-700/50',
  uncommon: 'bg-green-900/40',
  rare: 'bg-blue-900/40',
  epic: 'bg-purple-900/40',
  legendary: 'bg-orange-900/40',
};

// Gathering profession icons
const PROFESSION_ICONS: Record<GatheringProfession, string> = {
  mining: '\u26CF\uFE0F',
  herbalism: '\uD83C\uDF3F',
  skinning: '\uD83E\uDE93',
  logging: '\uD83E\uDEB5',
  fishing: '\uD83C\uDFA3',
};

/** Format seconds into a human-readable duration. */
function formatClearTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 365) return `${Math.floor(d / 365)}y ${d % 365}d`;
  return `${d}d ${h}h`;
}

// --- Session Summary ---
interface SessionSummary {
  totalClears: number;
  goldEarned: number;
  materials: Record<string, number>;
  rareMaterials: Record<string, number>;
  currencies: Record<string, number>;
  itemsByRarity: Record<Rarity, number>;
  itemsSalvaged: number;
  dustEarned: number;
  gatheringXp: number;
}

function emptySession(): SessionSummary {
  return {
    totalClears: 0,
    goldEarned: 0,
    materials: {},
    rareMaterials: {},
    currencies: {},
    itemsByRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    itemsSalvaged: 0,
    dustEarned: 0,
    gatheringXp: 0,
  };
}

function accumulateSession(session: SessionSummary, result: ProcessClearsResult, clearCount: number): SessionSummary {
  const s = { ...session };
  s.totalClears += clearCount;
  s.goldEarned += result.goldGained;
  s.dustEarned += result.dustGained;
  s.itemsSalvaged += result.overflowCount;
  s.gatheringXp += result.gatheringXpGained ?? 0;

  s.materials = { ...s.materials };
  for (const [k, v] of Object.entries(result.materialDrops)) {
    s.materials[k] = (s.materials[k] || 0) + v;
  }

  if (result.rareMaterialDrops) {
    s.rareMaterials = { ...s.rareMaterials };
    for (const [k, v] of Object.entries(result.rareMaterialDrops)) {
      s.rareMaterials[k] = (s.rareMaterials[k] || 0) + v;
    }
  }

  s.currencies = { ...s.currencies };
  for (const [k, v] of Object.entries(result.currencyDrops)) {
    if (v > 0) s.currencies[k] = (s.currencies[k] || 0) + v;
  }

  s.itemsByRarity = { ...s.itemsByRarity };
  for (const it of result.items) {
    s.itemsByRarity[it.rarity] = (s.itemsByRarity[it.rarity] || 0) + 1;
  }

  return s;
}

// --- Player HP Bar ---
function PlayerHpBar({ currentHp, maxHp, trailHp, fortifyStacks, fortifyDR }: {
  currentHp: number; maxHp: number; trailHp?: number;
  fortifyStacks?: number; fortifyDR?: number;
}) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const trailPct = trailHp != null && maxHp > 0
    ? Math.max(0, Math.min(100, (trailHp / maxHp) * 100))
    : pct;
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const hasFortify = (fortifyDR ?? 0) > 0;
  return (
    <div
      className={`bg-gray-800/50 rounded-lg border p-2 ${hasFortify ? 'border-amber-500/40' : 'border-gray-700'}`}
      style={hasFortify ? { animation: 'fortify-glow 2s ease-in-out infinite' } : undefined}
    >
      <div className="flex justify-between text-xs mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-300 font-semibold">HP</span>
          {hasFortify && (
            <span className="text-[10px] font-mono text-amber-300">
              FORT {fortifyStacks} ({Math.round((fortifyDR ?? 0) * 100)}% DR)
            </span>
          )}
        </div>
        <span className="text-white font-mono">{Math.ceil(currentHp)}/{maxHp}</span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative">
        {/* Damage trail — shows where HP was, fades to reveal damage taken */}
        {trailPct > pct && (
          <div className="absolute h-full bg-red-800/60 rounded-full transition-all duration-500"
               style={{ width: `${trailPct}%` }} />
        )}
        {/* Current interpolated HP */}
        <div className={`absolute h-full ${color} rounded-full transition-all duration-150`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// --- Mob Display (during clearing) ---
function MobDisplay({ mobName, mobCurrentHp, mobMaxHp, bossIn, swingProgress, signatureDrop, activeDebuffs }: {
  mobName: string; mobCurrentHp: number; mobMaxHp: number; bossIn: number; swingProgress: number;
  signatureDrop?: MobDrop; activeDebuffs: ActiveDebuff[];
}) {
  // Real-time mob HP bar (10K-A)
  const mobHpPct = mobMaxHp > 0 ? Math.max(0, Math.min(100, (mobCurrentHp / mobMaxHp) * 100)) : 0;
  const hasDebuffs = activeDebuffs.length > 0;
  return (
    <div
      className={`bg-gray-800/60 rounded-lg border p-2 ${hasDebuffs ? 'border-red-500/40' : 'border-gray-700'}`}
      style={hasDebuffs ? { animation: 'debuff-glow 2s ease-in-out infinite' } : undefined}
    >
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-200 font-semibold">{mobName}</span>
        <div className="flex items-center gap-2">
          {signatureDrop && (
            <span className={`${MOB_DROP_RARITY_COLOR[signatureDrop.rarity]} text-[10px]`}
                  title={`Drops: ${formatMatName(signatureDrop.materialId)} (${Math.round(signatureDrop.chance * 100)}%)`}>
              {formatMatName(signatureDrop.materialId)}
            </span>
          )}
          <span className="text-gray-400">Boss in {bossIn}</span>
        </div>
      </div>
      {hasDebuffs && (
        <div className="flex flex-wrap gap-0.5 mb-0.5">
          {activeDebuffs.map(d => <DebuffBadge key={d.debuffId} debuff={d} />)}
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full transition-all duration-200"
             style={{ width: `${mobHpPct}%` }} />
      </div>
      {/* Enemy swing timer */}
      <div className="mt-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500/80 rounded-full transition-all duration-200"
             style={{ width: `${Math.max(0, Math.min(1, swingProgress)) * 100}%` }} />
      </div>
    </div>
  );
}

// --- Boss Fight Display ---
function BossFightDisplay({ bossName, bossHp, bossMaxHp, playerHp, maxHp, bossDps, swingProgress, activeDebuffs, fortifyStacks, fortifyDR }: {
  bossName: string; bossHp: number; bossMaxHp: number;
  playerHp: number; maxHp: number; bossDps: number; swingProgress: number;
  activeDebuffs: ActiveDebuff[]; fortifyStacks: number; fortifyDR: number;
}) {
  const bossPct = bossMaxHp > 0 ? Math.max(0, (bossHp / bossMaxHp) * 100) : 0;
  const playerPct = maxHp > 0 ? Math.max(0, (playerHp / maxHp) * 100) : 0;
  const playerColor = playerPct > 60 ? 'bg-green-500' : playerPct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const hasDebuffs = activeDebuffs.length > 0;
  const hasFortify = fortifyDR > 0;
  return (
    <div className="bg-gradient-to-br from-red-950 via-gray-900 to-red-950 rounded-lg border-2 border-red-700 p-3 space-y-2">
      <div className="text-center text-red-400 font-bold text-xs uppercase tracking-wider">Boss Fight</div>
      <div className="text-center text-white font-bold text-sm">{bossName}</div>
      {hasDebuffs && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {activeDebuffs.map(d => <DebuffBadge key={d.debuffId} debuff={d} />)}
        </div>
      )}
      {/* Boss HP */}
      <div
        className={hasDebuffs ? 'rounded-lg p-1 -m-1' : undefined}
        style={hasDebuffs ? { animation: 'debuff-glow 2s ease-in-out infinite' } : undefined}
      >
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-red-300 font-semibold">Boss HP</span>
          <span className="text-white font-mono">{Math.ceil(bossHp)}/{bossMaxHp}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 rounded-full transition-all duration-100"
               style={{ width: `${bossPct}%` }} />
        </div>
      </div>
      {/* Boss swing timer */}
      <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500/80 rounded-full transition-all duration-200"
             style={{ width: `${Math.max(0, Math.min(1, swingProgress)) * 100}%` }} />
      </div>
      {/* Player HP */}
      <div
        className={hasFortify ? 'rounded-lg p-1 -m-1' : undefined}
        style={hasFortify ? { animation: 'fortify-glow 2s ease-in-out infinite' } : undefined}
      >
        <div className="flex justify-between text-xs mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 font-semibold">Your HP</span>
            {hasFortify && (
              <span className="text-[10px] font-mono text-amber-300">
                FORT {fortifyStacks} ({Math.round(fortifyDR * 100)}% DR)
              </span>
            )}
          </div>
          <span className="text-white font-mono">{Math.ceil(playerHp)}/{maxHp}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${playerColor} rounded-full transition-all duration-100`}
               style={{ width: `${playerPct}%` }} />
        </div>
      </div>
      <div className="text-xs text-gray-400 text-center">
        <span>Boss DPS: <span className="text-red-400 font-mono">{bossDps.toFixed(1)}</span></span>
      </div>
    </div>
  );
}

// --- Boss Victory Overlay ---
interface BossVictoryProps {
  bossName: string;
  items: { name: string; rarity: Rarity }[];
  fightDuration: number;
  playerDps: number;
  bossDps: number;
  bossMaxHp: number;
}

function BossVictoryOverlay({ bossName, items, fightDuration, playerDps, bossDps, bossMaxHp }: BossVictoryProps) {
  return (
    <div className="bg-gradient-to-br from-yellow-950 via-gray-900 to-yellow-950 rounded-lg border-2 border-yellow-500 p-4 text-center space-y-3">
      <div className="text-2xl">{'\u{1F451}'}</div>
      <div className="text-yellow-400 font-bold text-sm">Boss Defeated!</div>
      <div className="text-white text-xs">{bossName} has been slain!</div>

      {/* Fight Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Fight Time</div>
          <div className="text-white font-bold font-mono">{fightDuration < 1 ? `${(fightDuration * 1000).toFixed(0)}ms` : `${fightDuration.toFixed(1)}s`}</div>
        </div>
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Boss HP</div>
          <div className="text-white font-bold font-mono">{bossMaxHp.toLocaleString()}</div>
        </div>
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Your DPS</div>
          <div className="text-green-400 font-bold font-mono">{playerDps.toFixed(1)}</div>
        </div>
        <div className="bg-black/30 rounded px-2 py-1.5">
          <div className="text-gray-500">Boss DPS</div>
          <div className="text-red-400 font-bold font-mono">{bossDps.toFixed(1)}</div>
        </div>
      </div>

      {/* Loot */}
      {items.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Loot</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {items.map((it, i) => (
              <span key={i} className={`${RARITY_TEXT[it.rarity]} text-xs bg-gray-800 rounded px-2 py-0.5`}>
                {it.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="text-gray-500 text-xs">Resuming shortly...</div>
    </div>
  );
}

// --- Boss Defeat Overlay ---
function BossDefeatOverlay({ bossName, currentHp, maxHp }: { bossName: string; currentHp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  return (
    <div className="bg-gradient-to-br from-red-950 via-gray-900 to-red-950 rounded-lg border-2 border-red-800 p-4 text-center space-y-2">
      <div className="text-2xl">{'\u{1F480}'}</div>
      <div className="text-red-400 font-bold text-sm">Defeated!</div>
      <div className="text-gray-400 text-xs">{bossName} was too strong. Gear up and try again!</div>
      <div className="mt-2">
        <div className="text-xs text-gray-500 mb-1">Recovering...</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-200"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// --- Zone Defeat Overlay (death during normal clears) ---
function ZoneDefeatOverlay({ mobName, zoneName, currentHp, maxHp }: { mobName: string; zoneName: string; currentHp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  return (
    <div className="bg-gradient-to-br from-red-950 via-gray-900 to-red-950 rounded-lg border-2 border-red-800 p-4 text-center space-y-2">
      <div className="text-2xl">{'\u{1F480}'}</div>
      <div className="text-red-400 font-bold text-sm">Defeated!</div>
      <div className="text-gray-400 text-xs">The {mobName} of {zoneName} overwhelmed you!</div>
      <div className="text-xs text-yellow-500 font-semibold">Boss progress reset</div>
      <div className="mt-2">
        <div className="text-xs text-gray-500 mb-1">Recovering...</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-200"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// --- Class Resource Bar ---
function ClassResourceBar({ resource, charClass }: { resource: ClassResourceState; charClass: string }) {
  const classDef = getClassDef(charClass as 'warrior' | 'mage' | 'ranger' | 'rogue');
  if (!classDef) return null;

  const stacks = Math.floor(resource.stacks);
  const max = classDef.resourceMax;

  if (classDef.resourceType === 'rage') {
    // Red bar 0-20
    const pct = max ? Math.min(100, (resource.stacks / max) * 100) : 0;
    const dmgBonus = Math.floor(stacks * 2);
    return (
      <div className="bg-gray-800/50 rounded-lg border border-red-900/50 p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-red-400 font-semibold">Rage</span>
          <span className="text-white font-mono">{stacks}/{max} <span className="text-red-300 text-xs">+{dmgBonus}% dmg</span></span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 rounded-full transition-all duration-300"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (classDef.resourceType === 'arcane_charges') {
    // Blue pips 0-10
    const pips = max ?? 10;
    return (
      <div className="bg-gray-800/50 rounded-lg border border-blue-900/50 p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-400 font-semibold">Arcane Charges</span>
          <span className="text-white font-mono">{stacks}/{pips} <span className="text-blue-300 text-xs">+{stacks * 5}% spell dmg</span></span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: pips }).map((_, i) => (
            <div key={i} className={`flex-1 h-2.5 rounded-full transition-all duration-200 ${
              i < stacks ? 'bg-blue-500 shadow-sm shadow-blue-400/50' : 'bg-gray-700'
            }`} />
          ))}
        </div>
        {stacks === pips && (
          <div className="text-xs text-blue-300 text-center mt-1 animate-pulse font-semibold">MAX — Discharge on next clear!</div>
        )}
      </div>
    );
  }

  if (classDef.resourceType === 'tracking') {
    // Green bar 0-100
    const pct = max ? Math.min(100, (resource.stacks / max) * 100) : 0;
    const rareBonus = (stacks * 0.5).toFixed(1);
    return (
      <div className="bg-gray-800/50 rounded-lg border border-green-900/50 p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-green-400 font-semibold">Tracking</span>
          <span className="text-white font-mono">{stacks}/{max} <span className="text-green-300 text-xs">+{rareBonus}% rare find</span></span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-300"
               style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (classDef.resourceType === 'momentum') {
    // Purple counter (uncapped)
    const speedBonus = stacks;
    return (
      <div className="bg-gray-800/50 rounded-lg border border-purple-900/50 p-2">
        <div className="flex justify-between text-xs">
          <span className="text-purple-400 font-semibold">Momentum</span>
          <span className="text-white font-mono text-sm">{stacks} <span className="text-purple-300 text-xs">+{speedBonus}% clear speed</span></span>
        </div>
      </div>
    );
  }

  return null;
}

// --- Zone Card Component ---
interface ZoneCardProps {
  zone: ZoneDef;
  band: number;
  isBoss: boolean;
  isSelected: boolean;
  isActive: boolean;
  isUnlocked: boolean;
  hasMastery: boolean;
  playerStats: Record<string, number>;
  charLevel: number;
  idleMode: IdleMode;
  selectedProfession: GatheringProfession | null;
  gatheringSkillLevel: number;
  zoneClears: number;
  zoneMasteryTier: number;
  isInvaded: boolean;
  invasionEndTime: number;
  onSelect: () => void;
}

const MASTERY_ICONS: Record<string, { icon: string; cls: string }> = {
  bronze: { icon: '\u{1F944}', cls: 'text-amber-600' },
  silver: { icon: '\u{1FA99}', cls: 'text-gray-300' },
  gold:   { icon: '\u{1F3C6}', cls: 'text-yellow-400' },
};

function ZoneCard({
  zone, band, isBoss, isSelected, isActive, isUnlocked, hasMastery,
  playerStats, charLevel, idleMode, selectedProfession, gatheringSkillLevel,
  zoneClears, zoneMasteryTier, isInvaded, invasionEndTime, onSelect,
}: ZoneCardProps) {
  const underleveled = charLevel < zone.recommendedLevel;
  const skillReq = getGatheringSkillRequirement(zone.band);
  const skillTooLow = idleMode === 'gathering' && selectedProfession && gatheringSkillLevel < skillReq;
  const hasMatchingProfession = idleMode === 'gathering' && selectedProfession
    ? zone.gatheringTypes.includes(selectedProfession)
    : true;

  return (
    <button
      onClick={onSelect}
      disabled={!isUnlocked}
      className={`
        relative w-full text-left rounded-lg border overflow-hidden transition-all
        ${isBoss ? 'h-44 border-2' : 'h-36'}
        ${!isUnlocked
          ? 'border-gray-700 opacity-40 cursor-not-allowed'
          : isInvaded
            ? 'border-purple-500 ring-2 ring-purple-500/50'
            : isSelected
              ? 'border-yellow-400 ring-2 ring-yellow-400/50'
              : `${BAND_BORDERS[band]} hover:brightness-125`}
        ${idleMode === 'gathering' && !hasMatchingProfession ? 'opacity-30' : ''}
      `}
      style={isInvaded && isUnlocked ? { animation: 'invasion-glow 2s ease-in-out infinite' } : undefined}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 ${BAND_GRADIENTS[band]}`} />
      {/* Zone background image (falls back gracefully if missing) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
        style={{ backgroundImage: `url(/images/zones/${zone.id}.webp)` }}
      />
      {/* Dark overlay for readability */}
      <div className={`absolute inset-0 ${skillTooLow ? 'bg-red-950/50' : 'bg-black/30'}`} />

      {/* Card content */}
      <div className="relative h-full flex flex-col justify-between p-3">
        {/* Top: name + hazards + mastery + level badge */}
        <div>
          <div className="flex items-center gap-1.5">
            {isBoss && <span className="text-base" title="Boss Zone">{'\u{1F451}'}</span>}
            {isActive && <span className="text-green-400 text-sm" title="Running">{'\u26A1'}</span>}
            <span className={`font-bold text-sm flex-1 ${isBoss ? 'text-yellow-300' : 'text-white'}`}>
              {zone.name}
            </span>
            {/* Level badge */}
            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
              underleveled ? 'bg-red-900/60 text-red-300' : 'bg-black/30 text-gray-400'
            }`}>
              Lv.{zone.recommendedLevel}
            </span>
            {hasMastery && idleMode === 'combat' && (
              <span className="text-green-400 text-xs font-bold px-1 bg-green-400/10 rounded" title="Zone Mastery">{'\u2713'}</span>
            )}
            {idleMode === 'combat' && zone.hazards.map((h, i) => {
              const resist = playerStats[HAZARD_STAT_MAP[h.type]] ?? 0;
              const below = resist < h.threshold;
              return (
                <span
                  key={i}
                  className={`text-sm ${below ? HAZARD_COLORS[h.type] + ' animate-pulse' : 'opacity-40'}`}
                  title={`${h.type} ${h.threshold}% (you: ${Math.floor(resist)}%)`}
                >
                  {HAZARD_ICONS[h.type]}
                </span>
              );
            })}
          </div>
          {underleveled && (
            <div className="text-xs text-red-400 mt-0.5">Underleveled</div>
          )}
          {skillTooLow && (
            <div className="text-xs text-red-400 mt-0.5">Skill too low (need {skillReq})</div>
          )}
          {!isUnlocked && zone.unlockRequirement && (
            <div className="text-xs text-gray-400 mt-0.5">
              Clear {ZONE_DEFS.find(z => z.id === zone.unlockRequirement)?.name ?? zone.unlockRequirement} to unlock
            </div>
          )}
        </div>

        {/* Middle: description or invasion flavor */}
        {isInvaded && isUnlocked ? (
          <div className="text-xs text-purple-300 leading-snug italic">
            Void energies surge through this zone...
            <span className="block text-purple-400 font-semibold mt-0.5">
              {(() => {
                const remaining = Math.max(0, invasionEndTime - Date.now());
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                return `${mins}:${secs.toString().padStart(2, '0')} remaining`;
              })()}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-300/80 leading-snug">{!isUnlocked ? '???' : zone.description}</div>
        )}

        {/* Mastery milestones */}
        {isUnlocked && idleMode === 'combat' && (
          <div className="flex items-center gap-1.5">
            {MASTERY_MILESTONES.map(m => {
              const claimed = zoneMasteryTier >= m.threshold;
              const nextTarget = !claimed && zoneClears < m.threshold;
              return (
                <span
                  key={m.threshold}
                  className={`text-xs ${claimed ? MASTERY_ICONS[m.tier].cls : 'text-gray-600'}`}
                  title={`${m.tier}: ${m.threshold} clears${claimed ? ' (claimed!)' : ` (${zoneClears}/${m.threshold})`}`}
                >
                  {MASTERY_ICONS[m.tier].icon}
                  {nextTarget && <span className="text-[9px] text-gray-500 ml-0.5">{zoneClears}/{m.threshold}</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* Bottom: iLvl + materials + gathering types */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="bg-black/30 rounded px-1.5 py-0.5">iLvl {zone.iLvlMin}-{zone.iLvlMax}</span>
          {idleMode === 'gathering' ? (
            <span className="flex gap-1">
              {zone.gatheringTypes.map(gt => (
                <span key={gt} className={selectedProfession === gt ? 'text-yellow-300' : ''} title={gt}>
                  {PROFESSION_ICONS[gt]}
                </span>
              ))}
            </span>
          ) : (
            <span className="truncate text-xs">{zone.materialDrops.map(m => m.replace(/_/g, ' ')).join(', ')}</span>
          )}
        </div>
      </div>
    </button>
  );
}

const WEAPON_ICONS: Partial<Record<WeaponType, string>> = {
  sword: '\u2694\uFE0F', axe: '\uD83E\uDE93', mace: '\uD83D\uDD28', dagger: '\uD83D\uDDE1\uFE0F',
  staff: '\uD83E\uDE84', wand: '\u2728', bow: '\uD83C\uDFF9', crossbow: '\uD83C\uDFAF',
  greatsword: '\u2694\uFE0F', greataxe: '\uD83E\uDE93', maul: '\uD83D\uDD28',
  scepter: '\uD83E\uDE84', gauntlet: '\uD83E\uDD4A', tome: '\uD83D\uDCD6',
};

const KIND_BADGE_COLORS: Record<string, string> = {
  active: 'bg-yellow-900 text-yellow-300',
  passive: 'bg-gray-700 text-gray-300', buff: 'bg-blue-900 text-blue-300',
  instant: 'bg-orange-900 text-orange-300', proc: 'bg-purple-900 text-purple-300',
  toggle: 'bg-green-900 text-green-300', ultimate: 'bg-yellow-900 text-yellow-300',
};

function SkillPicker() {
  const {
    character, skillBar,
    equipToSkillBar, unequipSkillBarSlot,
  } = useGameStore();
  const [open, setOpen] = useState(false);
  const weaponType = getEquippedWeaponType(character.equipment);
  const available = weaponType ? getUnifiedSkillsForWeapon(weaponType) : [];
  const unlockedSlots = getUnlockedSlotCount(character.level);

  if (!weaponType) return null;

  const equippedIds = new Set(skillBar.filter(Boolean).map(s => s!.skillId));

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <span>{WEAPON_ICONS[weaponType]} Skills</span>
        <span className="text-xs text-gray-500">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {available.map(skill => {
            const isEquipped = equippedIds.has(skill.id);
            const isLocked = character.level < skill.levelRequired;
            const equippedSlotIdx = skillBar.findIndex(s => s?.skillId === skill.id);

            return (
              <div
                key={skill.id}
                className={`rounded-lg border p-2 ${
                  isEquipped ? 'border-yellow-600 bg-yellow-950/30' : isLocked ? 'border-gray-700 bg-gray-900/30 opacity-50' : 'border-gray-700 bg-gray-900/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{isLocked ? '\uD83D\uDD12' : skill.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isLocked ? 'text-gray-500' : 'text-white'}`}>{skill.name}</span>
                      <span className={`text-xs px-1 rounded ${KIND_BADGE_COLORS[skill.kind] ?? 'bg-gray-700 text-gray-300'}`}>
                        {skill.kind}
                      </span>
                      {isLocked && (
                        <span className="text-xs text-gray-500">Lv.{skill.levelRequired}</span>
                      )}
                    </div>
                  </div>
                  {isEquipped ? (
                    <button
                      onClick={() => unequipSkillBarSlot(equippedSlotIdx)}
                      className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded flex-shrink-0"
                    >
                      Remove
                    </button>
                  ) : !isLocked ? (
                    <div className="flex gap-1 flex-shrink-0">
                      {[0, 1, 2, 3, 4].map(slotIdx => {
                        if (slotIdx > 0 && slotIdx > unlockedSlots) {
                          return (
                            <div key={slotIdx} className="w-6 h-6 rounded text-xs bg-gray-800 text-gray-600 flex items-center justify-center">
                              {'\uD83D\uDD12'}
                            </div>
                          );
                        }
                        const occupied = skillBar[slotIdx] !== null;
                        return (
                          <button
                            key={slotIdx}
                            onClick={() => equipToSkillBar(skill.id, slotIdx)}
                            className={`w-6 h-6 rounded text-xs font-bold ${
                              occupied
                                ? 'bg-gray-700 text-gray-500 hover:bg-yellow-900 hover:text-yellow-300'
                                : 'bg-green-900 text-green-300 hover:bg-green-800'
                            }`}
                            title={`Slot ${slotIdx + 1}${occupied ? ' (replace)' : ''}`}
                          >
                            {slotIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ZoneScreen() {
  const {
    character, inventory, bagSlots,
    currentZoneId, idleStartTime, idleMode,
    gatheringSkills, selectedGatheringProfession,
    startIdleRun, processNewClears, stopIdleRun, grantIdleXp, getEstimatedClearTime,
    setIdleMode, setGatheringProfession,
    currentHp, combatPhase, bossState, zoneClearCounts,
    startBossFight, handleBossVictory, handleBossDefeat, checkRecoveryComplete,
    tutorialStep,
    classResource, tickClassResource, tickAutoCast,
    clearStartedAt, currentClearTime,
    totalKills, fastestClears,
    lastClearResult,
    tickCombat, currentMobHp, maxMobHp, zoneNextAttackAt,
    targetedMobId, setTargetedMob, mobKillCounts,
    currentMobTypeId,
    activeDebuffs, fortifyStacks, fortifyExpiresAt, fortifyDRPerStack,
    totalZoneClears,
    zoneMasteryClaimed,
    invasionState,
    tickInvasions,
  } = useGameStore();

  const hydrated = useHasHydrated();
  const inventoryCapacity = calcBagCapacity(bagSlots);

  const [selectedZone, setSelectedZone] = useState(currentZoneId || ZONE_DEFS[0].id);
  const [elapsed, setElapsed] = useState(0);
  const [selectedBand, setSelectedBand] = useState<number>(() => {
    if (currentZoneId) {
      const z = ZONE_DEFS.find(z => z.id === currentZoneId);
      return z?.band ?? 1;
    }
    return 1;
  });
  const [session, setSession] = useState<SessionSummary>(emptySession);
  const lastClearCount = useRef(0);
  const [salvageTally, setSalvageTally] = useState({ count: 0, essence: 0 });
  const modeSwitchingRef = useRef(false);
  const lastTickTimeRef = useRef(Date.now());
  const [bossLootItems, setBossLootItems] = useState<{ name: string; rarity: Rarity }[]>([]);
  const [bossFightStats, setBossFightStats] = useState<{ duration: number; playerDps: number; bossDps: number; bossMaxHp: number } | null>(null);

  // Visual feedback state (10K-B2)
  const [floaters, setFloaters] = useState<FloaterEntry[]>([]);
  const [lastFiredSkillId, setLastFiredSkillId] = useState<string | null>(null);
  const floaterIdRef = useRef(0);
  const lastFiredTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [combatLog, setCombatLog] = useState<Array<{
    id: number; skill: string; damage: number; isCrit: boolean; isHit: boolean;
  }>>([]);
  const logIdRef = useRef(0);

  const isRunning = idleStartTime !== null;
  const zone = ZONE_DEFS.find((z) => z.id === selectedZone)!;
  const clearTime = getEstimatedClearTime(selectedZone);
  // When running, use tracked currentClearTime from state (no re-query that could shift)
  const runningClearTime = isRunning && currentClearTime > 0
    ? currentClearTime
    : clearTime;
  const runningZone = isRunning ? ZONE_DEFS.find(z => z.id === currentZoneId) : null;

  // Compute maxHp for display
  const maxHp = resolveStats(character).maxLife;

  // XP scaling for selected zone
  const xpScale = calcXpScale(character.level, zone.iLvlMin);

  // Timer tick — combat-phase-aware
  useEffect(() => {
    if (!isRunning || !idleStartTime) return;
    lastTickTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const phase = useGameStore.getState().combatPhase;

      // Tick class resource decay (Warrior rage) every 250ms
      const dtSec = Math.min((now - lastTickTimeRef.current) / 1000, 2);
      tickClassResource(dtSec);
      tickAutoCast();
      tickInvasions();

      if (phase === 'clearing') {
        setElapsed((now - idleStartTime) / 1000);

        // Real-time combat tick (10K-A): fire skills + track mob kills
        const storeState = useGameStore.getState();
        if (storeState.idleMode === 'combat') {
          const combatResult = tickCombat(dtSec);
          // Visual feedback (10K-B2)
          if (combatResult.skillFired) {
            setFloaters(prev => [...prev, {
              id: floaterIdRef.current++,
              damage: combatResult.damageDealt,
              isCrit: combatResult.isCrit,
              isHit: combatResult.isHit,
            }].slice(-5));
            setLastFiredSkillId(combatResult.skillId);
            clearTimeout(lastFiredTimerRef.current);
            lastFiredTimerRef.current = setTimeout(() => setLastFiredSkillId(null), 400);
            const skillName = combatResult.skillId
              ? (getUnifiedSkillDef(combatResult.skillId)?.name ?? '???')
              : '???';
            setCombatLog(prev => [...prev, {
              id: logIdRef.current++,
              skill: skillName,
              damage: combatResult.damageDealt,
              isCrit: combatResult.isCrit,
              isHit: combatResult.isHit,
            }].slice(-20));
          }
          if (combatResult.mobKills > 0) {
            // Grant XP
            const rz = ZONE_DEFS.find(z => z.id === storeState.currentZoneId);
            if (rz) {
              const runXpScale = calcXpScale(storeState.character.level, rz.iLvlMin);
              grantIdleXp(Math.round(10 * rz.band * combatResult.mobKills * runXpScale));
            }
            // Process drops
            const clearResult = processNewClears(combatResult.mobKills);
            if (clearResult) {
              setSession(prev => accumulateSession(prev, clearResult, combatResult.mobKills));
              if (clearResult.overflowCount > 0) {
                setSalvageTally(prev => ({
                  count: prev.count + clearResult.overflowCount,
                  essence: prev.essence + clearResult.dustGained,
                }));
              }
            }
            // Boss check
            const afterState = useGameStore.getState();
            if (afterState.combatPhase === 'clearing' && afterState.currentZoneId) {
              const counts = afterState.zoneClearCounts;
              const zoneCount = counts[afterState.currentZoneId] || 0;
              if (zoneCount > 0 && zoneCount % BOSS_INTERVAL === 0) {
                startBossFight();
              }
            }
          }
          // Enemy attack floaters (zone defense)
          if (combatResult.zoneAttack) {
            const za = combatResult.zoneAttack;
            setFloaters(prev => [...prev, {
              id: floaterIdRef.current++,
              damage: za.damage,
              isCrit: false,
              isHit: !za.isDodged,
              isEnemyAttack: true,
              isDodged: za.isDodged,
              isBlocked: za.isBlocked,
            }].slice(-8));
          }
          // Zone death from real-time defense
          if (combatResult.zoneDeath) {
            setFloaters([]);
            setCombatLog([]);
          }
        }
      } else if (phase === 'boss_fight') {
        // Boss uses same tickCombat — skill-based hits instead of flat DPS
        const bossResult = tickCombat(dtSec);
        // Visual feedback (10K-B2)
        if (bossResult.skillFired) {
          setFloaters(prev => [...prev, {
            id: floaterIdRef.current++,
            damage: bossResult.damageDealt,
            isCrit: bossResult.isCrit,
            isHit: bossResult.isHit,
          }].slice(-5));
          setLastFiredSkillId(bossResult.skillId);
          clearTimeout(lastFiredTimerRef.current);
          lastFiredTimerRef.current = setTimeout(() => setLastFiredSkillId(null), 400);
          const skillName = bossResult.skillId
            ? (getUnifiedSkillDef(bossResult.skillId)?.name ?? '???')
            : '???';
          setCombatLog(prev => [...prev, {
            id: logIdRef.current++,
            skill: skillName,
            damage: bossResult.damageDealt,
            isCrit: bossResult.isCrit,
            isHit: bossResult.isHit,
          }].slice(-20));
        }
        // Boss attack floaters (damage smoothing — shows dodge/block/crit)
        if (bossResult.bossAttack) {
          const ba = bossResult.bossAttack;
          setFloaters(prev => [...prev, {
            id: floaterIdRef.current++,
            damage: ba.damage,
            isCrit: false,
            isHit: !ba.isDodged,
            isEnemyAttack: true,
            isDodged: ba.isDodged,
            isBlocked: ba.isBlocked,
            isBossCrit: ba.isCrit,
          }].slice(-8));
        }
        if (bossResult.bossOutcome === 'victory') {
          // Capture fight stats before handleBossVictory modifies state
          const bState = useGameStore.getState().bossState;
          if (bState) {
            const duration = (Date.now() - bState.startedAt) / 1000;
            setBossFightStats({
              duration,
              playerDps: bState.playerDps,
              bossDps: bState.bossDps,
              bossMaxHp: bState.bossMaxHp,
            });
          }
          const lootResult = handleBossVictory();
          if (lootResult) {
            setBossLootItems(lootResult.items);
            setSession(prev => accumulateSession(prev, lootResult, 0));
          }
        } else if (bossResult.bossOutcome === 'defeat') {
          handleBossDefeat();
        }
      } else if (phase === 'boss_victory' || phase === 'boss_defeat' || phase === 'zone_defeat') {
        const done = checkRecoveryComplete();
        if (done) {
          // Resume clearing — reset elapsed and lastClearCount
          const state = useGameStore.getState();
          if (state.idleStartTime) {
            setElapsed(0);
            lastClearCount.current = 0;
            setBossLootItems([]);
            setFloaters([]);
            setCombatLog([]);
            // Reset idleStartTime to now so elapsed restarts from 0
            useGameStore.setState({ idleStartTime: Date.now() });
          }
        }
      }
      lastTickTimeRef.current = now;
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning, idleStartTime, handleBossVictory, handleBossDefeat, checkRecoveryComplete, tickClassResource, tickAutoCast, tickInvasions, tickCombat, grantIdleXp, processNewClears, startBossFight]);

  // Auto-remove floaters after animation completes (10K-B2)
  useEffect(() => {
    if (floaters.length === 0) return;
    const timer = setTimeout(() => {
      setFloaters(prev => prev.slice(1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [floaters]);

  // Gathering mode loot processing — time-based (combat uses tickCombat in tick loop)
  useEffect(() => {
    if (!isRunning || !runningZone || modeSwitchingRef.current) return;
    if (combatPhase !== 'clearing') return;
    if (idleMode !== 'gathering') return; // Combat handled by tickCombat (10K-A)

    const state = useGameStore.getState();
    const now = Date.now();
    const timeSinceClearStart = now - state.clearStartedAt;
    const clearDurationMs = state.currentClearTime * 1000;

    if (clearDurationMs <= 0) return;

    // Count completed clears since clearStartedAt
    const completedClears = Math.floor(timeSinceClearStart / clearDurationMs);
    if (completedClears <= 0) return;

    // Process drops (also updates clearStartedAt and currentClearTime in store)
    const result = processNewClears(completedClears);
    if (result) {
      setSession(prev => accumulateSession(prev, result, completedClears));
      if (result.overflowCount > 0) {
        setSalvageTally(prev => ({
          count: prev.count + result.overflowCount,
          essence: prev.essence + result.dustGained,
        }));
      }
    }
  }, [elapsed, isRunning, runningZone, idleMode, combatPhase, processNewClears]);

  // Check if a zone is unlocked (must clear prerequisite zone at least once)
  const isZoneUnlocked = (z: ZoneDef): boolean => {
    if (!z.unlockRequirement) return true;
    return (totalZoneClears[z.unlockRequirement] ?? 0) >= 1;
  };

  const handleStart = () => {
    setSession(emptySession());
    lastClearCount.current = 0;
    setSalvageTally({ count: 0, essence: 0 });
    setBossLootItems([]);
    setBossFightStats(null);
    setFloaters([]);
    setCombatLog([]);
    startIdleRun(selectedZone);
  };

  const handleStop = () => {
    stopIdleRun();
    setElapsed(0);
    lastClearCount.current = 0;
    setFloaters([]);
    setCombatLog([]);
  };

  const handleModeSwitch = (mode: IdleMode) => {
    if (mode === idleMode) return;
    modeSwitchingRef.current = true;
    stopIdleRun();
    setSession(emptySession());
    lastClearCount.current = 0;
    setSalvageTally({ count: 0, essence: 0 });
    setElapsed(0);
    setIdleMode(mode);
    requestAnimationFrame(() => { modeSwitchingRef.current = false; });
  };

  const currentClears = session.totalClears;

  // Progress within current clear using per-clear tracking (no modulo)
  const nowMs = Date.now();
  const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : runningClearTime * 1000;
  const clearProgress = isRunning && clearDurationMs > 0
    ? Math.min(1, Math.max(0, (nowMs - clearStartedAt) / clearDurationMs))
    : 0;
  // HP is now updated in real-time by tickCombat — no interpolation needed
  const displayHp = currentHp;
  const fortifyDR = calcFortifyDR(fortifyStacks, fortifyExpiresAt, fortifyDRPerStack, Date.now());

  // Zone enemy swing timer progress (0→1 as attack approaches)
  const zoneSwingProgress = zoneNextAttackAt > 0
    ? 1 - Math.max(0, Math.min(1, (zoneNextAttackAt - nowMs) / (ZONE_ATTACK_INTERVAL * 1000)))
    : 0;

  // Boss swing timer progress
  const bossSwingProgress = bossState?.bossNextAttackAt
    ? 1 - Math.max(0, Math.min(1, (bossState.bossNextAttackAt - nowMs) / (bossState.bossAttackInterval * 1000)))
    : 0;

  // Band zones
  const bands = [1, 2, 3, 4, 5, 6];
  const bandZones = ZONE_DEFS.filter(z => z.band === selectedBand);
  const gridZones = bandZones.filter((_, i) => i < 4);
  const bossZone = bandZones[4] ?? null;

  // Current gathering skill level for selected profession
  const currentGatheringLevel = selectedGatheringProfession
    ? gatheringSkills[selectedGatheringProfession].level
    : 0;
  const currentGatheringXp = selectedGatheringProfession
    ? gatheringSkills[selectedGatheringProfession].xp
    : 0;
  const gatheringXpToNext = selectedGatheringProfession
    ? calcGatheringXpRequired(gatheringSkills[selectedGatheringProfession].level)
    : 100;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-yellow-400">Zones</h2>

      {/* Combat / Gathering Toggle */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => handleModeSwitch('combat')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
            idleMode === 'combat'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {'\u2694\uFE0F'} Combat
        </button>
        <button
          onClick={() => handleModeSwitch('gathering')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
            idleMode === 'gathering'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          } ${tutorialStep === 4 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
        >
          {'\u26CF\uFE0F'} Gathering
        </button>
      </div>

      {/* Gathering Profession Selector */}
      {idleMode === 'gathering' && (
        <div className="space-y-2">
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
            {GATHERING_PROFESSION_DEFS.map(prof => {
              const skill = gatheringSkills[prof.id];
              const isActive = selectedGatheringProfession === prof.id;
              return (
                <button
                  key={prof.id}
                  onClick={() => setGatheringProfession(prof.id)}
                  className={`flex-1 py-1.5 px-1 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                  title={prof.description}
                >
                  <span className="block text-center">
                    <span className="text-sm">{PROFESSION_ICONS[prof.id]}</span>
                    <span className="block text-xs mt-0.5">{prof.name}</span>
                    <span className="block text-xs opacity-70">Lv.{skill.level}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Gathering skill XP bar */}
          {selectedGatheringProfession && (
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400 font-semibold">
                  {PROFESSION_ICONS[selectedGatheringProfession]} {selectedGatheringProfession.charAt(0).toUpperCase() + selectedGatheringProfession.slice(1)} Lv.{currentGatheringLevel}
                </span>
                <span className="text-gray-500">{currentGatheringXp}/{gatheringXpToNext} XP</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${(currentGatheringXp / gatheringXpToNext) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Band Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {bands.map(band => (
          <button
            key={band}
            onClick={() => setSelectedBand(band)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedBand === band
                ? `${BAND_GRADIENTS[band]} text-white ring-1 ring-yellow-400/50`
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {BAND_EMOJIS[band]} Band {band}
          </button>
        ))}
      </div>

      {/* Band Name */}
      <div className="text-xs text-gray-500 -mt-1 px-1">
        {BAND_NAMES[selectedBand]}
        <span className="text-gray-600 ml-2">iLvl {bandZones[0]?.iLvlMin}-{bandZones[bandZones.length - 1]?.iLvlMax}</span>
      </div>

      {/* Zone Cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {gridZones.map((z) => (
            <ZoneCard
              key={z.id}
              zone={z}
              band={selectedBand}
              isBoss={false}
              isSelected={selectedZone === z.id}
              isActive={isRunning && currentZoneId === z.id}
              isUnlocked={isZoneUnlocked(z)}
              hasMastery={z.hazards.length > 0 && checkZoneMastery(character.stats, z)}
              playerStats={character.stats as Record<string, number>}
              charLevel={character.level}
              idleMode={idleMode}
              selectedProfession={selectedGatheringProfession}
              gatheringSkillLevel={currentGatheringLevel}
              zoneClears={totalZoneClears[z.id] ?? 0}
              zoneMasteryTier={zoneMasteryClaimed[z.id] ?? 0}
              isInvaded={!!getZoneInvasion(invasionState, z.id, z.band)}
              invasionEndTime={getZoneInvasion(invasionState, z.id, z.band)?.endTime ?? 0}
              onSelect={() => isZoneUnlocked(z) && setSelectedZone(z.id)}
            />
          ))}
        </div>

        {bossZone && (
          <ZoneCard
            zone={bossZone}
            band={selectedBand}
            isBoss={true}
            isSelected={selectedZone === bossZone.id}
            isActive={isRunning && currentZoneId === bossZone.id}
            isUnlocked={isZoneUnlocked(bossZone)}
            hasMastery={bossZone.hazards.length > 0 && checkZoneMastery(character.stats, bossZone)}
            playerStats={character.stats as Record<string, number>}
            charLevel={character.level}
            idleMode={idleMode}
            selectedProfession={selectedGatheringProfession}
            gatheringSkillLevel={currentGatheringLevel}
            zoneClears={totalZoneClears[bossZone.id] ?? 0}
            zoneMasteryTier={zoneMasteryClaimed[bossZone.id] ?? 0}
            isInvaded={!!getZoneInvasion(invasionState, bossZone.id, bossZone.band)}
            invasionEndTime={getZoneInvasion(invasionState, bossZone.id, bossZone.band)?.endTime ?? 0}
            onSelect={() => isZoneUnlocked(bossZone) && setSelectedZone(bossZone.id)}
          />
        )}
      </div>

      {/* Clear Time Estimate + Stats */}
      <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2 space-y-1">
        <div>
          Est. clear time: <span className={`font-mono ${clearTime > 3600 ? 'text-red-400' : clearTime > 300 ? 'text-yellow-400' : 'text-white'}`}>{formatClearTime(clearTime)}</span>
          {' '}&bull;{' '}iLvl: <span className="text-white">{zone.iLvlMin}-{zone.iLvlMax}</span>
          {idleMode === 'combat' && zone.hazards.length > 0 && (
            <span className="ml-2">
              {zone.hazards.map((h, i) => {
                const playerResist = (character.stats as Record<string, number>)[HAZARD_STAT_MAP[h.type]] ?? 0;
                const belowThreshold = playerResist < h.threshold;
                return (
                  <span key={i} className={`ml-1 ${belowThreshold ? 'text-red-400' : 'text-green-400'}`}>
                    {HAZARD_ICONS[h.type]} {Math.floor(playerResist)}/{h.threshold}
                  </span>
                );
              })}
            </span>
          )}
          {idleMode === 'gathering' && selectedGatheringProfession && (
            <span className="ml-2 text-green-400">
              {PROFESSION_ICONS[selectedGatheringProfession]} Skill: {currentGatheringLevel}
              {!canGatherInZone(currentGatheringLevel, zone) && (
                <span className="text-red-400 ml-1">(need {getGatheringSkillRequirement(zone.band)})</span>
              )}
            </span>
          )}
        </div>
        {idleMode === 'combat' && (
          <div className="flex flex-wrap gap-3 text-gray-500">
            <span>{'\u{1F480}'} Kills: <span className="text-white font-semibold">{totalKills.toLocaleString()}</span></span>
            {fastestClears[selectedZone] != null && (
              <span>{'\u26A1'} Best: <span className="text-yellow-400 font-mono">{formatClearTime(fastestClears[selectedZone])}</span></span>
            )}
            {/* XP penalty for overleveled zones */}
            {xpScale < 1.0 && (
              <span className="text-yellow-500">
                XP: {Math.round(xpScale * 100)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Daily Quest Panel */}
      {idleMode === 'combat' && <DailyQuestPanel currentZoneId={selectedZone} />}

      {/* Mob Type Selector (combat mode) */}
      {idleMode === 'combat' && (() => {
        const zoneMobs = getZoneMobTypes(zone.id);
        if (zoneMobs.length === 0) return null;
        return (
          <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-2 space-y-1">
            <div className="text-xs text-gray-400 font-semibold mb-1">Target Mob</div>
            <button
              onClick={() => setTargetedMob(null)}
              className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                !targetedMobId ? 'bg-green-800/60 text-green-300 border border-green-600' : 'bg-gray-700/40 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="font-semibold">Random</span>
              <span className="text-gray-500 ml-1">(all mob types)</span>
            </button>
            {zoneMobs.map(mob => {
              const isSelected = targetedMobId === mob.id;
              const kills = mobKillCounts[mob.id] || 0;
              return (
                <button
                  key={mob.id}
                  onClick={() => setTargetedMob(isSelected ? null : mob.id)}
                  className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                    isSelected ? 'bg-amber-800/60 text-amber-200 border border-amber-600' : 'bg-gray-700/40 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{mob.name}</span>
                      {mob.hpMultiplier && mob.hpMultiplier !== 1.0 && (
                        <span className={`ml-1 ${mob.hpMultiplier > 1 ? 'text-red-400' : 'text-green-400'}`}>
                          ({mob.hpMultiplier > 1 ? '+' : ''}{Math.round((mob.hpMultiplier - 1) * 100)}% HP)
                        </span>
                      )}
                    </div>
                    {kills > 0 && <span className="text-gray-500">{kills.toLocaleString()}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0 mt-0.5">
                    {mob.drops.map(drop => (
                      <span key={drop.materialId} className={`${MOB_DROP_RARITY_COLOR[drop.rarity]} text-[10px]`}>
                        {formatMatName(drop.materialId)} ({Math.round(drop.chance * 100)}%)
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Ability Picker (combat, before starting) */}
      {!isRunning && idleMode === 'combat' && <SkillPicker />}

      {/* Start / Running State */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          disabled={idleMode === 'gathering' && (!selectedGatheringProfession || !canGatherInZone(currentGatheringLevel, zone))}
          className={`w-full py-3 font-bold rounded-lg text-lg transition-all ${
            idleMode === 'gathering' && (!selectedGatheringProfession || !canGatherInZone(currentGatheringLevel, zone))
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : idleMode === 'gathering'
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
          } ${tutorialStep === 3 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
        >
          {idleMode === 'gathering' && selectedGatheringProfession && !canGatherInZone(currentGatheringLevel, zone)
            ? `Requires ${selectedGatheringProfession.charAt(0).toUpperCase() + selectedGatheringProfession.slice(1)} Lv.${getGatheringSkillRequirement(zone.band)}`
            : idleMode === 'gathering' ? 'Start Gathering' : 'Start Idle Run'}
        </button>
      ) : (
        <div className="space-y-2">
          {/* Switch zone button */}
          {selectedZone !== currentZoneId && (() => {
            const canSwitch = !(idleMode === 'gathering' && selectedGatheringProfession && !canGatherInZone(currentGatheringLevel, zone));
            return (
              <button
                onClick={handleStart}
                disabled={!canSwitch}
                className={`w-full py-2 font-bold rounded-lg text-sm transition-all ${
                  canSwitch ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canSwitch
                  ? `Switch to ${ZONE_DEFS.find((z) => z.id === selectedZone)?.name}`
                  : `Requires ${selectedGatheringProfession!.charAt(0).toUpperCase() + selectedGatheringProfession!.slice(1)} Lv.${getGatheringSkillRequirement(zone.band)}`}
              </button>
            );
          })()}
          {/* Combat Phase Display */}
          {idleMode === 'combat' && combatPhase === 'boss_fight' && bossState && (
            <div className="relative">
              <BossFightDisplay
                bossName={bossState.bossName}
                bossHp={bossState.bossCurrentHp}
                bossMaxHp={bossState.bossMaxHp}
                playerHp={currentHp}
                maxHp={maxHp}
                bossDps={bossState.bossDps}
                swingProgress={bossSwingProgress}
                activeDebuffs={activeDebuffs}
                fortifyStacks={fortifyStacks}
                fortifyDR={fortifyDR}
              />
              <DamageFloaters floaters={floaters} />
            </div>
          )}

          {idleMode === 'combat' && combatPhase === 'boss_victory' && bossState && (
            <BossVictoryOverlay
              bossName={bossState.bossName}
              items={bossLootItems}
              fightDuration={bossFightStats?.duration ?? 0}
              playerDps={bossFightStats?.playerDps ?? 0}
              bossDps={bossFightStats?.bossDps ?? 0}
              bossMaxHp={bossFightStats?.bossMaxHp ?? 0}
            />
          )}

          {idleMode === 'combat' && combatPhase === 'boss_defeat' && bossState && (
            <BossDefeatOverlay bossName={bossState.bossName} currentHp={currentHp} maxHp={maxHp} />
          )}

          {idleMode === 'combat' && combatPhase === 'zone_defeat' && runningZone && (
            <ZoneDefeatOverlay mobName={targetedMobId ? (getMobTypeDef(targetedMobId)?.name ?? runningZone.mobName) : runningZone.mobName} zoneName={runningZone.name} currentHp={currentHp} maxHp={maxHp} />
          )}

          {/* Normal progress (clearing phase or gathering) */}
          {(combatPhase === 'clearing' || idleMode === 'gathering') && (
            <>
              {/* Player HP Bar (combat only, clearing) */}
              {idleMode === 'combat' && hydrated && (
                <PlayerHpBar currentHp={displayHp} maxHp={maxHp} fortifyStacks={fortifyStacks} fortifyDR={fortifyDR} />
              )}

              {/* Class Resource Bar (combat only) */}
              {idleMode === 'combat' && (
                <ClassResourceBar resource={classResource} charClass={character.class} />
              )}

              {/* Mob display (combat) or progress bar (gathering) */}
              {idleMode === 'combat' && runningZone ? (
                <div className="relative">
                  <MobDisplay
                    mobName={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.name ?? runningZone.mobName) : runningZone.mobName}
                    mobCurrentHp={currentMobHp}
                    mobMaxHp={maxMobHp}
                    bossIn={BOSS_INTERVAL - ((zoneClearCounts[currentZoneId!] || 0) % BOSS_INTERVAL)}
                    swingProgress={zoneSwingProgress}
                    signatureDrop={currentMobTypeId ? (getMobTypeDef(currentMobTypeId)?.drops.find(d => d.rarity === 'rare') ?? getMobTypeDef(currentMobTypeId)?.drops[0]) : undefined}
                    activeDebuffs={activeDebuffs}
                  />
                  <DamageFloaters floaters={floaters} />
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">
                      {runningZone?.name}
                      {idleMode === 'gathering' && selectedGatheringProfession && (
                        <span className="text-green-400 ml-2 text-xs">
                          {PROFESSION_ICONS[selectedGatheringProfession]} Gathering
                        </span>
                      )}
                    </span>
                    <span className="text-yellow-400 font-mono">{Math.floor(elapsed)}s</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-200"
                      style={{ width: `${clearProgress * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    Clears: <span className="text-white font-semibold">{currentClears}</span>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 text-center">
                Clears: <span className="text-white font-semibold">{currentClears}</span>
                <span className="mx-2">&bull;</span>
                <span className="font-mono">{Math.floor(elapsed)}s</span>
              </div>
            </>
          )}

          {/* Combat stats from last clear */}
          {idleMode === 'combat' && combatPhase === 'clearing' && lastClearResult && (
            <div className="text-xs text-gray-400 text-center space-x-3">
              <span>{lastClearResult.totalCasts} casts</span>
              <span className="text-green-400">{lastClearResult.hits} hits</span>
              <span className="text-yellow-400">{lastClearResult.crits} crits</span>
              {lastClearResult.misses > 0 && (
                <span className="text-red-400">{lastClearResult.misses} miss</span>
              )}
              <span>{lastClearResult.clearTime.toFixed(1)}s</span>
            </div>
          )}

          {/* Combat log (10K-B2) */}
          {idleMode === 'combat' && combatLog.length > 0 && (
            <div className="max-h-16 overflow-y-auto text-xs space-y-0.5 bg-gray-900/50 rounded px-2 py-1 font-mono">
              {combatLog.slice(-5).map(entry => (
                <div key={entry.id} className="text-gray-400">
                  <span className="text-gray-500">{entry.skill}</span>
                  {entry.isHit
                    ? <> <span className={entry.isCrit ? 'text-yellow-300 font-bold' : 'text-white'}>{Math.round(entry.damage)}</span>
                        {entry.isCrit && <span className="text-yellow-400 ml-1">CRIT</span>}</>
                    : <span className="text-red-400 ml-1">MISS</span>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Skill Bar + Picker (combat mode only) */}
          {idleMode === 'combat' && (combatPhase === 'clearing' || combatPhase === 'boss_fight') && (
            <>
              <SkillBar lastFiredSkillId={lastFiredSkillId} />
              <SkillPicker />
            </>
          )}

          {/* Bags status + overflow warning */}
          {isRunning && (
            <div className={`rounded-lg px-3 py-2 text-xs ${
              inventory.length >= inventoryCapacity
                ? 'bg-amber-950 border border-amber-700'
                : 'bg-gray-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className={inventory.length >= inventoryCapacity ? 'text-amber-300 font-semibold' : 'text-gray-400'}>
                  {'\u{1F392}'} Bags: {inventory.length}/{inventoryCapacity}
                  {inventory.length >= inventoryCapacity && ' — FULL'}
                </span>
                {salvageTally.count > 0 && (
                  <span className="text-amber-400">
                    {salvageTally.count} salvaged &rarr; +{salvageTally.essence} essence
                  </span>
                )}
              </div>
              {inventory.length >= inventoryCapacity && (
                <div className="text-amber-400/80 text-xs mt-0.5">
                  Gear drops are being auto-salvaged. Upgrade bags or disenchant items.
                </div>
              )}
            </div>
          )}

          {/* Session Summary */}
          {session.totalClears > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 space-y-2">
              {/* Clear count — prominent */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{session.totalClears}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Clears</div>
              </div>

              {/* Stat row — gold / XP / items */}
              <div className="grid grid-cols-3 gap-2">
                {session.goldEarned > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center">
                    <div className="text-xs font-bold text-yellow-400">{session.goldEarned.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Gold</div>
                  </div>
                )}
                {session.gatheringXp > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center">
                    <div className="text-xs font-bold text-green-400">+{session.gatheringXp.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Gather XP</div>
                  </div>
                )}
                {Object.values(session.itemsByRarity).some(v => v > 0) && (
                  <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center">
                    <div className="text-xs font-bold text-white">
                      {Object.values(session.itemsByRarity).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-xs text-gray-500">Items</div>
                  </div>
                )}
              </div>

              {/* Materials */}
              {Object.keys(session.materials).length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Materials</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(session.materials).map(([mat, count]) => (
                      <span key={mat} className="bg-gray-800 rounded px-1.5 py-0.5 text-xs text-gray-300">
                        {mat.replace(/_/g, ' ')} <span className="text-white font-semibold">x{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rare Materials — highlighted cards */}
              {Object.keys(session.rareMaterials).length > 0 && (
                <div>
                  <div className="text-xs text-purple-400 font-semibold mb-1">Rare Finds</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(session.rareMaterials).map(([matId, count]) => {
                      const def = getRareMaterialDef(matId);
                      const rarityColor = def ? RARITY_TEXT[def.rarity as Rarity] ?? 'text-gray-300' : 'text-gray-300';
                      const rarityBorder = def ? RARITY_BORDER[def.rarity as Rarity] ?? 'border-gray-600' : 'border-gray-600';
                      return (
                        <span key={matId} className={`bg-gray-800/80 border ${rarityBorder} rounded-md px-2 py-1 text-xs ${rarityColor} animate-pulse`}>
                          {def?.icon ?? ''} {def?.name ?? matId.replace(/_/g, ' ')} <span className="text-white font-semibold">x{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Currencies — golden highlight */}
              {Object.keys(session.currencies).length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Currencies</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(session.currencies).map(([curr, count]) => (
                      <span key={curr} className="bg-yellow-900/30 border border-yellow-700/50 rounded px-2 py-0.5 text-xs text-yellow-300">
                        {curr} <span className="text-white font-semibold">x{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Items by rarity — colored badges */}
              {Object.values(session.itemsByRarity).some(v => v > 0) && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Items by Rarity</div>
                  <div className="flex flex-wrap gap-1">
                    {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as Rarity[]).map(r => {
                      const count = session.itemsByRarity[r];
                      if (count === 0) return null;
                      return (
                        <span key={r} className={`${RARITY_BG[r]} ${RARITY_TEXT[r]} px-2 py-0.5 rounded-full text-xs font-semibold`}>
                          {count} {r}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Auto-salvage tally */}
              {session.itemsSalvaged > 0 && (
                <div className="bg-amber-900/20 border border-amber-700/40 rounded px-2 py-1 flex items-center justify-between">
                  <span className="text-xs text-amber-400">
                    {session.itemsSalvaged} auto-salvaged
                  </span>
                  <span className="text-xs text-amber-300 font-semibold">
                    +{session.dustEarned.toLocaleString()} essence
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleStop}
            className="w-full py-2 bg-red-800 hover:bg-red-700 text-red-200 font-semibold rounded-lg text-sm transition-all"
          >
            Stop Run
          </button>
        </div>
      )}
    </div>
  );
}

import type { Rarity, Gem } from '../../types';
import type { ProcessClearsResult } from '../../store/gameStore';

/** Format seconds into a human-readable duration. */
export function formatClearTime(seconds: number): string {
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

/** Format material ID to display name (snake_case -> Title Case). */
export function formatMatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Format milliseconds into m:ss. */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- Session Summary ---
export interface SessionSummary {
  totalClears: number;
  goldEarned: number;
  materials: Record<string, number>;
  rareMaterials: Record<string, number>;
  currencies: Record<string, number>;
  itemsByRarity: Record<Rarity, number>;
  itemsSalvaged: number;
  dustEarned: number;
  gatheringXp: number;
  patternDrops: string[];
  gemDrops: Gem[];
}

export function emptySession(): SessionSummary {
  return {
    totalClears: 0,
    goldEarned: 0,
    materials: {},
    rareMaterials: {},
    currencies: {},
    itemsByRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, unique: 0 },
    itemsSalvaged: 0,
    dustEarned: 0,
    gatheringXp: 0,
    patternDrops: [],
    gemDrops: [],
  };
}

export function accumulateSession(session: SessionSummary, result: ProcessClearsResult, clearCount: number): SessionSummary {
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

  if (result.patternDrops && result.patternDrops.length > 0) {
    s.patternDrops = [...s.patternDrops, ...result.patternDrops];
  }

  if (result.gemDrops && result.gemDrops.length > 0) {
    s.gemDrops = [...s.gemDrops, ...result.gemDrops];
  }

  return s;
}

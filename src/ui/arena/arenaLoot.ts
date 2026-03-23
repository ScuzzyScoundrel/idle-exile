// ============================================================
// Arena Loot Bridge — converts engine clear results to ground items
// Zero engine modifications: only imports + calls existing functions.
// ============================================================

import { simulateSingleClear, type SingleClearResult } from '../../engine/zones/drops';
import type { ProcessClearsResult } from '../../engine/zones/lootProcessor';
import { useGameStore } from '../../store/gameStore';
import type { Item, Rarity, Gem } from '../../types/items';
import type { CurrencyType } from '../../types/currencies';
import type { Character } from '../../types/character';
import type { ZoneDef } from '../../types/zones';
import type { Vec2 } from './arenaEngine';
import { CURRENCY_DEFS } from '../../data/items';

// ── Types ──

export type GroundItemKind = 'equipment' | 'material' | 'currency' | 'gold' | 'gem' | 'trophy';

export interface ArenaGroundItem {
  id: number;
  kind: GroundItemKind;
  x: number;
  y: number;
  label: string;
  color: string;           // rarity or kind hex color
  rarity: Rarity | null;
  displayRarity?: string | null;  // rarity tier for rendering (equipment uses .rarity, others set explicitly)
  autoPickup: boolean;     // true for mats/currency/gold/gems
  hovered: boolean;
  collected: boolean;
  collectTimer: number;
  age: number;
  visualOnly?: boolean;    // true for boss loot (already applied by handleBossVictory)
  // Payload (one set per kind)
  item?: Item;
  materials?: Record<string, number>;
  currencies?: Partial<Record<CurrencyType, number>>;
  gold?: number;
  gemDrop?: Gem;
  trophyId?: string;
  trophyName?: string;
}

// ── Rarity Colors ──

export const RARITY_HEX: Record<Rarity, string> = {
  common: '#4ade80',
  uncommon: '#60a5fa',
  rare: '#facc15',
  epic: '#c084fc',
  legendary: '#fb923c',
  unique: '#fbbf24',
};

const MATERIAL_COLOR = '#9ca3af';
const GOLD_COLOR = '#fbbf24';

// Per-currency color: map each CurrencyType to its rarity color
const CURRENCY_COLOR_MAP: Record<string, string> = {};
for (const def of CURRENCY_DEFS) {
  CURRENCY_COLOR_MAP[def.id] = RARITY_HEX[def.rarity as Rarity] ?? '#fbbf24';
}
const CURRENCY_COLOR_FALLBACK = '#fbbf24';

/** Get highest rarity among currencies in a bundle */
function highestCurrencyRarity(currencies: Partial<Record<CurrencyType, number>>): string {
  const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique'];
  let best = 0;
  for (const [key, val] of Object.entries(currencies)) {
    if (!val || val <= 0) continue;
    const def = CURRENCY_DEFS.find(d => d.id === key);
    if (def) {
      const idx = order.indexOf(def.rarity as Rarity);
      if (idx > best) best = idx;
    }
  }
  return order[best];
}

/** Get color for highest-rarity currency in a bundle */
function currencyBundleColor(currencies: Partial<Record<CurrencyType, number>>): string {
  const rarity = highestCurrencyRarity(currencies);
  return RARITY_HEX[rarity as Rarity] ?? CURRENCY_COLOR_FALLBACK;
}
const GEM_COLOR_MAP: Record<string, string> = {
  fire: '#f97316',
  cold: '#22d3ee',
  lightning: '#facc15',
  chaos: '#4ade80',
  physical: '#e5e7eb',
};

// ── Scatter Helper ──

function scatterPos(center: Vec2, minDist: number, maxDist: number): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  const dist = minDist + Math.random() * (maxDist - minDist);
  return {
    x: center.x + Math.cos(angle) * dist,
    y: center.y + Math.sin(angle) * dist,
  };
}

// ── Roll Arena Loot ──

let _nextId = 1;

export function rollArenaLoot(
  clearCount: number,
  playerPos: Vec2,
  character: Character,
  zone: ZoneDef,
): ArenaGroundItem[] {
  const items: ArenaGroundItem[] = [];

  for (let i = 0; i < clearCount; i++) {
    let result: SingleClearResult;
    try {
      result = simulateSingleClear(character, zone);
    } catch {
      continue;
    }

    // Equipment drop
    if (result.item) {
      const pos = scatterPos(playerPos, 30, 60);
      items.push({
        id: _nextId++,
        kind: 'equipment',
        x: pos.x,
        y: pos.y,
        label: result.item.name,
        color: RARITY_HEX[result.item.rarity] ?? RARITY_HEX.common,
        rarity: result.item.rarity,
        displayRarity: result.item.rarity,
        autoPickup: false,
        hovered: false,
        collected: false,
        collectTimer: 0,
        age: 0,
        item: result.item,
      });
    }

    // Profession gear drop
    if (result.professionGearDrop) {
      const pos = scatterPos(playerPos, 30, 60);
      items.push({
        id: _nextId++,
        kind: 'equipment',
        x: pos.x,
        y: pos.y,
        label: result.professionGearDrop.name,
        color: RARITY_HEX[result.professionGearDrop.rarity] ?? RARITY_HEX.common,
        rarity: result.professionGearDrop.rarity,
        displayRarity: result.professionGearDrop.rarity,
        autoPickup: false,
        hovered: false,
        collected: false,
        collectTimer: 0,
        age: 0,
        item: result.professionGearDrop,
      });
    }

    // Materials
    const matEntries = Object.entries(result.materials).filter(([, v]) => v > 0);
    if (matEntries.length > 0) {
      const pos = scatterPos(playerPos, 20, 45);
      const label = matEntries.map(([k, v]) => `${v}x ${k.replace(/_/g, ' ')}`).join(', ');
      items.push({
        id: _nextId++,
        kind: 'material',
        x: pos.x,
        y: pos.y,
        label,
        color: MATERIAL_COLOR,
        rarity: null,
        displayRarity: 'common',
        autoPickup: true,
        hovered: false,
        collected: false,
        collectTimer: 0,
        age: 0,
        materials: result.materials,
      });
    }

    // Currency
    const currEntries = Object.entries(result.currencyDrops).filter(([, v]) => v > 0);
    if (currEntries.length > 0) {
      const pos = scatterPos(playerPos, 20, 45);
      const label = currEntries.map(([k, v]) => `${v}x ${k.replace(/_/g, ' ')}`).join(', ');
      const bundleRarity = highestCurrencyRarity(result.currencyDrops);
      items.push({
        id: _nextId++,
        kind: 'currency',
        x: pos.x,
        y: pos.y,
        label,
        color: currencyBundleColor(result.currencyDrops),
        rarity: null,
        displayRarity: bundleRarity,
        autoPickup: true,
        hovered: false,
        collected: false,
        collectTimer: 0,
        age: 0,
        currencies: result.currencyDrops,
      });
    }

    // Gold
    if (result.goldGained > 0) {
      const pos = scatterPos(playerPos, 15, 35);
      items.push({
        id: _nextId++,
        kind: 'gold',
        x: pos.x,
        y: pos.y,
        label: `${result.goldGained}g`,
        color: GOLD_COLOR,
        rarity: null,
        displayRarity: 'common',
        autoPickup: true,
        hovered: false,
        collected: false,
        collectTimer: 0,
        age: 0,
        gold: result.goldGained,
      });
    }

    // Gem drop
    if (result.gemDrop) {
      const pos = scatterPos(playerPos, 25, 50);
      const gemColor = GEM_COLOR_MAP[result.gemDrop.type] ?? '#e5e7eb';
      items.push({
        id: _nextId++,
        kind: 'gem',
        x: pos.x,
        y: pos.y,
        label: `T${result.gemDrop.tier} ${result.gemDrop.type}`,
        color: gemColor,
        rarity: null,
        displayRarity: 'uncommon',
        autoPickup: true,
        hovered: false,
        collected: false,
        collectTimer: 0,
        age: 0,
        gemDrop: result.gemDrop,
      });
    }
  }

  return items;
}

// ── Apply Pickup (mutates store) ──

export function applyGroundItemPickup(gItem: ArenaGroundItem): void {
  // Boss loot is visual-only — already applied by handleBossVictory()
  if (gItem.visualOnly) return;

  const store = useGameStore.getState();

  switch (gItem.kind) {
    case 'equipment': {
      if (gItem.item) {
        store.addToInventory([gItem.item]);
      }
      break;
    }
    case 'material': {
      if (gItem.materials) {
        const newMaterials = { ...store.materials };
        for (const [key, val] of Object.entries(gItem.materials)) {
          newMaterials[key] = (newMaterials[key] || 0) + val;
        }
        useGameStore.setState({ materials: newMaterials });
      }
      break;
    }
    case 'currency': {
      if (gItem.currencies) {
        const newCurrencies = { ...store.currencies };
        for (const [key, val] of Object.entries(gItem.currencies)) {
          if (val && val > 0) {
            newCurrencies[key as CurrencyType] = (newCurrencies[key as CurrencyType] ?? 0) + val;
          }
        }
        useGameStore.setState({ currencies: newCurrencies });
      }
      break;
    }
    case 'gold': {
      if (gItem.gold && gItem.gold > 0) {
        useGameStore.setState({ gold: store.gold + gItem.gold });
      }
      break;
    }
    case 'gem': {
      if (gItem.gemDrop) {
        store.addGemToInventory(gItem.gemDrop);
      }
      break;
    }
  }
}

// ── Boss Loot → Ground Items (Phase 3) ──

/** Convert ProcessClearsResult from handleBossVictory into visual ground items.
 *  All items are visualOnly since the store already applied them. */
export function rollBossArenaLoot(
  result: ProcessClearsResult,
  bossPos: Vec2,
): ArenaGroundItem[] {
  const items: ArenaGroundItem[] = [];

  // Equipment items (click-to-collect visual)
  for (const it of result.items) {
    const pos = scatterPos(bossPos, 30, 80);
    items.push({
      id: _nextId++,
      kind: 'equipment',
      x: pos.x, y: pos.y,
      label: it.name,
      color: RARITY_HEX[it.rarity] ?? RARITY_HEX.common,
      rarity: it.rarity,
      displayRarity: it.rarity,
      autoPickup: false,
      hovered: false, collected: false, collectTimer: 0, age: 0,
      visualOnly: true,
    });
  }

  // Trophy drops (white + gold border)
  if (result.trophyDrops) {
    for (const [tId, count] of Object.entries(result.trophyDrops)) {
      if (!count || count <= 0) continue;
      const pos = scatterPos(bossPos, 20, 60);
      items.push({
        id: _nextId++,
        kind: 'trophy',
        x: pos.x, y: pos.y,
        label: tId.replace(/_/g, ' '),
        color: '#ffffff',
        rarity: null,
        displayRarity: 'legendary',
        autoPickup: false,
        hovered: false, collected: false, collectTimer: 0, age: 0,
        visualOnly: true,
        trophyId: tId,
        trophyName: tId.replace(/_/g, ' '),
      });
    }
  }

  // Currency
  const currEntries = Object.entries(result.currencyDrops).filter(([, v]) => v > 0);
  if (currEntries.length > 0) {
    const pos = scatterPos(bossPos, 25, 65);
    const label = currEntries.map(([k, v]) => `${v}x ${k.replace(/_/g, ' ')}`).join(', ');
    items.push({
      id: _nextId++,
      kind: 'currency',
      x: pos.x, y: pos.y,
      label,
      color: currencyBundleColor(result.currencyDrops),
      rarity: null,
      displayRarity: highestCurrencyRarity(result.currencyDrops),
      autoPickup: true,
      hovered: false, collected: false, collectTimer: 0, age: 0,
      visualOnly: true,
      currencies: result.currencyDrops,
    });
  }

  // Materials
  const matEntries = Object.entries(result.materialDrops).filter(([, v]) => v > 0);
  if (matEntries.length > 0) {
    const pos = scatterPos(bossPos, 20, 55);
    const label = matEntries.map(([k, v]) => `${v}x ${k.replace(/_/g, ' ')}`).join(', ');
    items.push({
      id: _nextId++,
      kind: 'material',
      x: pos.x, y: pos.y,
      label,
      color: MATERIAL_COLOR,
      rarity: null,
      displayRarity: 'common',
      autoPickup: true,
      hovered: false, collected: false, collectTimer: 0, age: 0,
      visualOnly: true,
      materials: result.materialDrops,
    });
  }

  // Gold
  if (result.goldGained > 0) {
    const pos = scatterPos(bossPos, 15, 50);
    items.push({
      id: _nextId++,
      kind: 'gold',
      x: pos.x, y: pos.y,
      label: `${result.goldGained}g`,
      color: GOLD_COLOR,
      rarity: null,
      displayRarity: 'common',
      autoPickup: true,
      hovered: false, collected: false, collectTimer: 0, age: 0,
      visualOnly: true,
      gold: result.goldGained,
    });
  }

  // Gems
  if (result.gemDrops) {
    for (const gem of result.gemDrops) {
      const pos = scatterPos(bossPos, 25, 60);
      const gemColor = GEM_COLOR_MAP[gem.type] ?? '#e5e7eb';
      items.push({
        id: _nextId++,
        kind: 'gem',
        x: pos.x, y: pos.y,
        label: `T${gem.tier} ${gem.type}`,
        color: gemColor,
        rarity: null,
        displayRarity: 'uncommon',
        autoPickup: true,
        hovered: false, collected: false, collectTimer: 0, age: 0,
        visualOnly: true,
        gemDrop: gem,
      });
    }
  }

  return items;
}

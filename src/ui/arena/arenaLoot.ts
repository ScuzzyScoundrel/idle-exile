// ============================================================
// Arena Loot Bridge — converts engine clear results to ground items
// Zero engine modifications: only imports + calls existing functions.
// ============================================================

import { simulateSingleClear, type SingleClearResult } from '../../engine/zones/drops';
import { useGameStore } from '../../store/gameStore';
import type { Item, Rarity, Gem } from '../../types/items';
import type { CurrencyType } from '../../types/currencies';
import type { Character } from '../../types/character';
import type { ZoneDef } from '../../types/zones';
import type { Vec2 } from './arenaEngine';

// ── Types ──

export type GroundItemKind = 'equipment' | 'material' | 'currency' | 'gold' | 'gem';

export interface ArenaGroundItem {
  id: number;
  kind: GroundItemKind;
  x: number;
  y: number;
  label: string;
  color: string;           // rarity or kind hex color
  rarity: Rarity | null;
  autoPickup: boolean;     // true for mats/currency/gold/gems
  hovered: boolean;
  collected: boolean;
  collectTimer: number;
  age: number;
  // Payload (one set per kind)
  item?: Item;
  materials?: Record<string, number>;
  currencies?: Partial<Record<CurrencyType, number>>;
  gold?: number;
  gemDrop?: Gem;
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
const CURRENCY_COLOR = '#fbbf24';
const GOLD_COLOR = '#fbbf24';
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
      items.push({
        id: _nextId++,
        kind: 'currency',
        x: pos.x,
        y: pos.y,
        label,
        color: CURRENCY_COLOR,
        rarity: null,
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

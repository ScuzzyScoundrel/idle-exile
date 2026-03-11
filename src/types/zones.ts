// ============================================================
// Zones — hazards, mobs, zone definitions, idle/offline results
// ============================================================

import type { Item } from './items';
import type { CurrencyType } from './currencies';
import type { GatheringProfession } from './crafting';

export type HazardType = 'fire' | 'cold' | 'lightning' | 'chaos';

export interface ZoneHazard {
  type: HazardType;
  threshold: number;
}

export type MobDropRarity = 'common' | 'uncommon' | 'rare';

export interface MobDrop {
  materialId: string;
  chance: number;        // 0-1 independent roll per clear
  minQty: number;
  maxQty: number;
  rarity: MobDropRarity; // for UI color coding
}

export interface MobTypeDef {
  id: string;              // globally unique, e.g. 'thicket_crawler'
  name: string;            // "Thicket Crawler"
  weight: number;          // spawn weight when farming whole zone
  drops: MobDrop[];        // 2-5 drops with independent roll chances
  hpMultiplier?: number;   // 0.8-1.2, defaults 1.0
  description?: string;    // flavor text
}

export interface ZoneDef {
  id: string;
  name: string;
  band: number;
  bandIndex: number;
  description: string;
  baseClearTime: number; // seconds at power parity
  iLvlMin: number;
  iLvlMax: number;
  recommendedLevel: number;
  materialDrops: string[];
  gatheringTypes: GatheringProfession[];
  hazards: ZoneHazard[];
  unlockRequirement?: string; // id of zone that must be accessible first
  mobName: string;
  bossName: string;
}

export interface IdleRunResult {
  items: Item[];
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  bagDrops: Record<string, number>;
  xpGained: number;
  goldGained: number;
  clearsCompleted: number;
  elapsed: number;
  autoSalvaged?: { itemsSalvaged: number; dustGained: number };
}

export interface OfflineProgressSummary {
  zoneId: string;
  zoneName: string;
  elapsedSeconds: number;
  clearsCompleted: number;
  items: Item[];
  autoSalvagedCount: number;
  autoSalvagedDust: number;
  autoSoldCount: number;
  autoSoldGold: number;
  goldGained: number;
  xpGained: number;
  materials: Record<string, number>;
  currencyDrops: Record<CurrencyType, number>;
  bagDrops: Record<string, number>;
  bestItem: Item | null;
  totalDeaths?: number;
  bossVictories?: number;
  deathLoopDetected?: boolean;
}

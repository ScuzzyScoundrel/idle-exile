// ============================================================
// Quests — daily quest types and progress
// ============================================================

import type { CurrencyType } from './currencies';

export type QuestObjectiveType = 'kill_mob' | 'clear_zone' | 'defeat_boss';

export interface QuestObjective {
  type: QuestObjectiveType;
  targetId: string;       // mobTypeId or zoneId
  targetName: string;
  required: number;
}

export interface QuestReward {
  gold?: number;
  xp?: number;
  materials?: Record<string, number>;
  currencies?: Partial<Record<CurrencyType, number>>;
}

export interface QuestDef {
  id: string;
  band: number;
  objective: QuestObjective;
  reward: QuestReward;
}

export interface QuestProgress {
  questId: string;
  current: number;
  claimed: boolean;
}

export interface DailyQuestState {
  questDate: string;  // 'YYYY-MM-DD' UTC
  quests: QuestDef[];
  progress: Record<string, QuestProgress>;
}

/**
 * questStore.ts — Quest action logic extracted from gameStore.
 *
 * STATE stays in gameStore (for save compatibility).
 * This store holds ONLY the quest-specific actions.
 * Actions read/write gameStore via useGameStore.getState() / useGameStore.setState().
 * UI components import actions from here, state from gameStore.
 */
import { create } from 'zustand';
import type { CurrencyType } from '../types';
import { useGameStore } from './gameStore';
import { addXp } from '../engine/character';
import { ZONE_DEFS } from '../data/zones';
import { getZoneMobTypes } from '../data/mobTypes';
import {
  generateDailyQuests, getUtcDateString, shouldResetDailyQuests,
  createInitialProgress, isQuestComplete,
} from '../engine/dailyQuests';

interface QuestActions {
  checkDailyQuestReset: () => void;
  claimQuestReward: (questId: string) => boolean;
}

export const useQuestStore = create<QuestActions>()(() => ({

  checkDailyQuestReset: () => {
    const state = useGameStore.getState();
    const now = new Date();
    if (!shouldResetDailyQuests(state.dailyQuests, now) && state.dailyQuests.quests.length > 0) return;

    const dateStr = getUtcDateString(now);
    // Determine accessible bands (any zone the player has reached)
    const accessibleBands = new Set<number>();
    for (const zoneId of Object.keys(state.totalZoneClears)) {
      const zone = ZONE_DEFS.find(z => z.id === zoneId);
      if (zone) accessibleBands.add(zone.band);
    }
    // Always include band 1
    accessibleBands.add(1);
    const bands = Array.from(accessibleBands).sort((a, b) => a - b);

    // Build zone/mob lookups
    const zonesByBand: Record<number, typeof ZONE_DEFS> = {};
    for (const z of ZONE_DEFS) {
      if (!zonesByBand[z.band]) zonesByBand[z.band] = [];
      zonesByBand[z.band].push(z);
    }
    const mobTypesByZone: Record<string, ReturnType<typeof getZoneMobTypes>> = {};
    for (const z of ZONE_DEFS) {
      mobTypesByZone[z.id] = getZoneMobTypes(z.id);
    }

    const quests = generateDailyQuests(dateStr, bands, zonesByBand, mobTypesByZone);
    const progress = createInitialProgress(quests);
    useGameStore.setState({ dailyQuests: { questDate: dateStr, quests, progress } });
  },

  claimQuestReward: (questId: string) => {
    const state = useGameStore.getState();
    const quest = state.dailyQuests.quests.find(q => q.id === questId);
    const progress = state.dailyQuests.progress[questId];
    if (!quest || !progress || progress.claimed) return false;
    if (!isQuestComplete(quest, progress)) return false;

    const reward = quest.reward;
    const newGold = state.gold + (reward.gold ?? 0);
    const xpResult = addXp(state.character, reward.xp ?? 0);

    const newMaterials = { ...state.materials };
    if (reward.materials) {
      for (const [matId, qty] of Object.entries(reward.materials)) {
        newMaterials[matId] = (newMaterials[matId] ?? 0) + qty;
      }
    }

    const newCurrencies = { ...state.currencies };
    if (reward.currencies) {
      for (const [cur, qty] of Object.entries(reward.currencies)) {
        if (qty) newCurrencies[cur as CurrencyType] = (newCurrencies[cur as CurrencyType] ?? 0) + qty;
      }
    }

    const newProgress = {
      ...state.dailyQuests.progress,
      [questId]: { ...progress, claimed: true },
    };

    useGameStore.setState({
      gold: newGold,
      character: { ...state.character, ...xpResult },
      materials: newMaterials,
      currencies: newCurrencies,
      dailyQuests: { ...state.dailyQuests, progress: newProgress },
    });
    return true;
  },

}));

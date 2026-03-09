/**
 * dispatch.ts — Command dispatcher for the game engine.
 *
 * Routes typed GameCommand objects to the appropriate store action.
 * Frame-loop ticks (tickCombat, tickAutoCast, etc.) are NOT commands —
 * they stay as direct method calls on the stores.
 */

import { useGameStore } from '../store/gameStore';
import { useCraftingStore } from '../store/craftingStore';
import { useSkillStore } from '../store/skillStore';
import { useQuestStore } from '../store/questStore';
import { useUiStore } from '../store/uiStore';
import type { GameCommand, CommandResult } from '../types';

export function dispatch(command: GameCommand): CommandResult {
  switch (command.type) {
    // ── Character ──────────────────────────────────────────

    case 'SELECT_CLASS':
      useGameStore.getState().selectClass(command.classId);
      return { success: true };

    case 'EQUIP_ITEM':
      useGameStore.getState().equipItem(command.item);
      return { success: true };

    case 'UNEQUIP_SLOT':
      useGameStore.getState().unequipSlot(command.slot);
      return { success: true };

    // ── Inventory ─────────────────────────────────────────

    case 'ADD_TO_INVENTORY':
      useGameStore.getState().addToInventory(command.items);
      return { success: true };

    case 'REMOVE_FROM_INVENTORY':
      useGameStore.getState().removeFromInventory(command.itemId);
      return { success: true };

    case 'DISENCHANT_ITEM': {
      const result = useGameStore.getState().disenchantItem(command.itemId);
      return { success: result !== null, data: result };
    }

    case 'SELL_ITEM': {
      const gold = useGameStore.getState().sellItem(command.itemId);
      return { success: gold !== null, data: gold };
    }

    // ── Zone / Idle ───────────────────────────────────────

    case 'START_IDLE_RUN':
      useGameStore.getState().startIdleRun(command.zoneId);
      return { success: true };

    case 'STOP_IDLE_RUN':
      useGameStore.getState().stopIdleRun();
      return { success: true };

    case 'GRANT_IDLE_XP':
      useGameStore.getState().grantIdleXp(command.xp);
      return { success: true };

    case 'SET_TARGETED_MOB':
      useGameStore.getState().setTargetedMob(command.mobTypeId);
      return { success: true };

    case 'SET_IDLE_MODE':
      useGameStore.getState().setIdleMode(command.mode);
      return { success: true };

    case 'SET_GATHERING_PROFESSION':
      useGameStore.getState().setGatheringProfession(command.profession);
      return { success: true };

    // ── Bags (uiStore) ────────────────────────────────────

    case 'EQUIP_BAG': {
      const result = useUiStore.getState().equipBag(command.bagDefId, command.slotIndex);
      return { success: result !== null, data: result };
    }

    case 'SELL_BAG': {
      const ok = useUiStore.getState().sellBag(command.bagDefId);
      return { success: ok };
    }

    case 'SALVAGE_BAG': {
      const ok = useUiStore.getState().salvageBag(command.bagDefId);
      return { success: ok };
    }

    case 'BUY_BAG': {
      const ok = useUiStore.getState().buyBag(command.bagDefId);
      return { success: ok };
    }

    // ── Crafting (gameStore — currency application) ───────

    case 'CRAFT_CURRENCY': {
      const result = useGameStore.getState().craft(command.itemId, command.currency);
      return { success: result !== null, data: result };
    }

    // ── Crafting (craftingStore) ──────────────────────────

    case 'REFINE_MATERIAL': {
      const ok = useCraftingStore.getState().refineMaterial(command.recipeId);
      return { success: ok };
    }

    case 'REFINE_MATERIAL_BATCH': {
      const count = useCraftingStore.getState().refineMaterialBatch(command.recipeId, command.count);
      return { success: count > 0, data: count };
    }

    case 'DECONSTRUCT_MATERIAL': {
      const ok = useCraftingStore.getState().deconstructMaterial(command.refinedId);
      return { success: ok };
    }

    case 'CRAFT_RECIPE': {
      const result = useCraftingStore.getState().craftRecipe(command.recipeId, command.catalystId, command.affixCatalystId);
      return { success: result !== null, data: result };
    }

    case 'CRAFT_RECIPE_BATCH': {
      const result = useCraftingStore.getState().craftRecipeBatch(command.recipeId, command.count, command.catalystId, command.affixCatalystId);
      return { success: result !== null, data: result };
    }

    case 'CRAFT_FROM_PATTERN': {
      const result = useCraftingStore.getState().craftFromPattern(command.patternIndex);
      return { success: result !== null, data: result };
    }

    // ── Craft Log (craftingStore) ────────────────────────

    case 'ADD_CRAFT_LOG_ENTRY':
      useCraftingStore.getState().addCraftLogEntry(command.entry);
      return { success: true };

    case 'CLEAR_CRAFT_LOG':
      useCraftingStore.getState().clearCraftLog();
      return { success: true };

    case 'CLAIM_CRAFT_OUTPUT':
      useCraftingStore.getState().claimCraftOutput(command.itemId);
      return { success: true };

    case 'CLAIM_ALL_CRAFT_OUTPUT':
      useCraftingStore.getState().claimAllCraftOutput();
      return { success: true };

    case 'SALVAGE_CRAFT_OUTPUT':
      useCraftingStore.getState().salvageCraftOutput(command.itemId);
      return { success: true };

    case 'SALVAGE_ALL_CRAFT_OUTPUT':
      useCraftingStore.getState().salvageAllCraftOutput();
      return { success: true };

    // ── Skills (skillStore) ──────────────────────────────

    case 'EQUIP_SKILL':
      useSkillStore.getState().equipSkill(command.skillId, command.slot);
      return { success: true };

    case 'EQUIP_TO_SKILL_BAR':
      useSkillStore.getState().equipToSkillBar(command.skillId, command.slotIndex);
      return { success: true };

    case 'UNEQUIP_SKILL_BAR_SLOT':
      useSkillStore.getState().unequipSkillBarSlot(command.slotIndex);
      return { success: true };

    case 'TOGGLE_SKILL_AUTO_CAST':
      useSkillStore.getState().toggleSkillAutoCast(command.slotIndex);
      return { success: true };

    case 'REORDER_SKILL_BAR':
      useSkillStore.getState().reorderSkillBar(command.fromSlot, command.toSlot);
      return { success: true };

    case 'ACTIVATE_SKILL_BAR_SLOT':
      useSkillStore.getState().activateSkillBarSlot(command.slotIndex);
      return { success: true };

    case 'ALLOCATE_ABILITY_NODE':
      useSkillStore.getState().allocateAbilityNode(command.abilityId, command.nodeId);
      return { success: true };

    case 'RESPEC_ABILITY':
      useSkillStore.getState().respecAbility(command.abilityId);
      return { success: true };

    case 'ALLOCATE_TALENT_NODE':
      useSkillStore.getState().allocateTalentNode(command.nodeId);
      return { success: true };

    case 'RESPEC_TALENTS':
      useSkillStore.getState().respecTalents();
      return { success: true };

    // ── Combat ────────────────────────────────────────────

    case 'START_BOSS_FIGHT':
      useGameStore.getState().startBossFight();
      return { success: true };

    case 'HANDLE_BOSS_VICTORY': {
      const result = useGameStore.getState().handleBossVictory();
      return { success: result !== null, data: result };
    }

    case 'HANDLE_BOSS_DEFEAT':
      useGameStore.getState().handleBossDefeat();
      return { success: true };

    case 'CHECK_RECOVERY_COMPLETE': {
      const done = useGameStore.getState().checkRecoveryComplete();
      return { success: done, data: done };
    }

    // ── World ─────────────────────────────────────────────

    case 'FORCE_INVASION':
      useGameStore.getState().forceInvasion(command.band);
      return { success: true };

    // ── Meta (uiStore) ────────────────────────────────────

    case 'CLAIM_OFFLINE_PROGRESS':
      useUiStore.getState().claimOfflineProgress();
      return { success: true };

    case 'ADVANCE_TUTORIAL':
      useUiStore.getState().advanceTutorial(command.step);
      return { success: true };

    case 'EQUIP_PROFESSION_GEAR':
      useUiStore.getState().equipProfessionGear(command.itemId);
      return { success: true };

    case 'UNEQUIP_PROFESSION_SLOT':
      useUiStore.getState().unequipProfessionSlot(command.slot);
      return { success: true };

    // ── Settings (gameStore) ──────────────────────────────

    case 'SET_AUTO_SALVAGE_RARITY':
      useGameStore.getState().setAutoSalvageRarity(command.rarity);
      return { success: true };

    case 'SET_AUTO_DISPOSAL_ACTION':
      useGameStore.getState().setAutoDisposalAction(command.action);
      return { success: true };

    case 'SET_CRAFT_AUTO_SALVAGE_RARITY':
      useCraftingStore.getState().setCraftAutoSalvageRarity(command.rarity);
      return { success: true };

    // ── Quests (questStore) ──────────────────────────────

    case 'CHECK_DAILY_QUEST_RESET':
      useQuestStore.getState().checkDailyQuestReset();
      return { success: true };

    case 'CLAIM_QUEST_REWARD': {
      const ok = useQuestStore.getState().claimQuestReward(command.questId);
      return { success: ok };
    }

    // ── Reset ─────────────────────────────────────────────

    case 'RESET_GAME':
      useGameStore.getState().resetGame();
      return { success: true };

    // ── Exhaustive check ──────────────────────────────────

    default: {
      const _exhaustive: never = command;
      throw new Error(`Unknown command: ${(_exhaustive as any).type}`);
    }
  }
}

/**
 * Dispatch multiple commands in sequence.
 * Returns an array of results, one per command.
 */
export function dispatchBatch(commands: GameCommand[]): CommandResult[] {
  return commands.map(dispatch);
}

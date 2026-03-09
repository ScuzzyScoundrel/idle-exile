// ============================================================
// Commands — discriminated union for all user-initiated mutations
// ============================================================
// Phase D1: replay / testing / undo capability foundation.
// Frame-loop ticks (tickCombat, tickAutoCast, etc.) are EXCLUDED —
// they stay as direct method calls.
// ============================================================

import type { CharacterClass } from './character';
import type { GearSlot, Item, Rarity } from './items';
import type { CurrencyType } from './currencies';
import type { IdleMode } from './skills';
import type { GatheringProfession } from './crafting';
import type { CraftLogEntry } from './state';

// ── Character ───────────────────────────────────────────────

export interface SelectClassCommand {
  type: 'SELECT_CLASS';
  classId: CharacterClass;
}

export interface EquipItemCommand {
  type: 'EQUIP_ITEM';
  item: Item;
}

export interface UnequipSlotCommand {
  type: 'UNEQUIP_SLOT';
  slot: GearSlot;
}

// ── Inventory ───────────────────────────────────────────────

export interface AddToInventoryCommand {
  type: 'ADD_TO_INVENTORY';
  items: Item[];
}

export interface RemoveFromInventoryCommand {
  type: 'REMOVE_FROM_INVENTORY';
  itemId: string;
}

export interface DisenchantItemCommand {
  type: 'DISENCHANT_ITEM';
  itemId: string;
}

export interface SellItemCommand {
  type: 'SELL_ITEM';
  itemId: string;
}

// ── Zone / Idle ─────────────────────────────────────────────

export interface StartIdleRunCommand {
  type: 'START_IDLE_RUN';
  zoneId: string;
}

export interface StopIdleRunCommand {
  type: 'STOP_IDLE_RUN';
}

export interface GrantIdleXpCommand {
  type: 'GRANT_IDLE_XP';
  xp: number;
}

export interface SetTargetedMobCommand {
  type: 'SET_TARGETED_MOB';
  mobTypeId: string | null;
}

export interface SetIdleModeCommand {
  type: 'SET_IDLE_MODE';
  mode: IdleMode;
}

export interface SetGatheringProfessionCommand {
  type: 'SET_GATHERING_PROFESSION';
  profession: GatheringProfession;
}

// ── Bags ────────────────────────────────────────────────────

export interface EquipBagCommand {
  type: 'EQUIP_BAG';
  bagDefId: string;
  slotIndex: number;
}

export interface SellBagCommand {
  type: 'SELL_BAG';
  bagDefId: string;
}

export interface SalvageBagCommand {
  type: 'SALVAGE_BAG';
  bagDefId: string;
}

export interface BuyBagCommand {
  type: 'BUY_BAG';
  bagDefId: string;
}

// ── Crafting ────────────────────────────────────────────────

export interface CraftCurrencyCommand {
  type: 'CRAFT_CURRENCY';
  itemId: string;
  currency: CurrencyType;
}

export interface RefineMaterialCommand {
  type: 'REFINE_MATERIAL';
  recipeId: string;
}

export interface RefineMaterialBatchCommand {
  type: 'REFINE_MATERIAL_BATCH';
  recipeId: string;
  count: number;
}

export interface DeconstructMaterialCommand {
  type: 'DECONSTRUCT_MATERIAL';
  refinedId: string;
}

export interface CraftRecipeCommand {
  type: 'CRAFT_RECIPE';
  recipeId: string;
  catalystId?: string;
  affixCatalystId?: string;
}

export interface CraftRecipeBatchCommand {
  type: 'CRAFT_RECIPE_BATCH';
  recipeId: string;
  count: number;
  catalystId?: string;
  affixCatalystId?: string;
}

export interface CraftFromPatternCommand {
  type: 'CRAFT_FROM_PATTERN';
  patternIndex: number;
}

// ── Craft Log ───────────────────────────────────────────────

export interface AddCraftLogEntryCommand {
  type: 'ADD_CRAFT_LOG_ENTRY';
  entry: Omit<CraftLogEntry, 'id' | 'timestamp'>;
}

export interface ClearCraftLogCommand {
  type: 'CLEAR_CRAFT_LOG';
}

export interface ClaimCraftOutputCommand {
  type: 'CLAIM_CRAFT_OUTPUT';
  itemId: string;
}

export interface ClaimAllCraftOutputCommand {
  type: 'CLAIM_ALL_CRAFT_OUTPUT';
}

export interface SalvageCraftOutputCommand {
  type: 'SALVAGE_CRAFT_OUTPUT';
  itemId: string;
}

export interface SalvageAllCraftOutputCommand {
  type: 'SALVAGE_ALL_CRAFT_OUTPUT';
}

// ── Skills ──────────────────────────────────────────────────

export interface EquipSkillCommand {
  type: 'EQUIP_SKILL';
  skillId: string;
  slot?: number;
}

export interface EquipToSkillBarCommand {
  type: 'EQUIP_TO_SKILL_BAR';
  skillId: string;
  slotIndex: number;
}

export interface UnequipSkillBarSlotCommand {
  type: 'UNEQUIP_SKILL_BAR_SLOT';
  slotIndex: number;
}

export interface ToggleSkillAutoCastCommand {
  type: 'TOGGLE_SKILL_AUTO_CAST';
  slotIndex: number;
}

export interface ReorderSkillBarCommand {
  type: 'REORDER_SKILL_BAR';
  fromSlot: number;
  toSlot: number;
}

export interface ActivateSkillBarSlotCommand {
  type: 'ACTIVATE_SKILL_BAR_SLOT';
  slotIndex: number;
}

export interface AllocateAbilityNodeCommand {
  type: 'ALLOCATE_ABILITY_NODE';
  abilityId: string;
  nodeId: string;
}

export interface RespecAbilityCommand {
  type: 'RESPEC_ABILITY';
  abilityId: string;
}

export interface AllocateTalentNodeCommand {
  type: 'ALLOCATE_TALENT_NODE';
  nodeId: string;
}

export interface RespecTalentsCommand {
  type: 'RESPEC_TALENTS';
}

// ── Combat ──────────────────────────────────────────────────

export interface StartBossFightCommand {
  type: 'START_BOSS_FIGHT';
}

export interface HandleBossVictoryCommand {
  type: 'HANDLE_BOSS_VICTORY';
}

export interface HandleBossDefeatCommand {
  type: 'HANDLE_BOSS_DEFEAT';
}

export interface CheckRecoveryCompleteCommand {
  type: 'CHECK_RECOVERY_COMPLETE';
}

// ── World ───────────────────────────────────────────────────

export interface ForceInvasionCommand {
  type: 'FORCE_INVASION';
  band: number;
}

// ── Meta ────────────────────────────────────────────────────

export interface ClaimOfflineProgressCommand {
  type: 'CLAIM_OFFLINE_PROGRESS';
}

export interface AdvanceTutorialCommand {
  type: 'ADVANCE_TUTORIAL';
  step: number;
}

export interface EquipProfessionGearCommand {
  type: 'EQUIP_PROFESSION_GEAR';
  itemId: string;
}

export interface UnequipProfessionSlotCommand {
  type: 'UNEQUIP_PROFESSION_SLOT';
  slot: GearSlot;
}

export interface SetAutoSalvageRarityCommand {
  type: 'SET_AUTO_SALVAGE_RARITY';
  rarity: Rarity;
}

export interface SetAutoDisposalActionCommand {
  type: 'SET_AUTO_DISPOSAL_ACTION';
  action: 'salvage' | 'sell';
}

export interface SetCraftAutoSalvageRarityCommand {
  type: 'SET_CRAFT_AUTO_SALVAGE_RARITY';
  rarity: Rarity;
}

export interface CheckDailyQuestResetCommand {
  type: 'CHECK_DAILY_QUEST_RESET';
}

export interface ClaimQuestRewardCommand {
  type: 'CLAIM_QUEST_REWARD';
  questId: string;
}

export interface ResetGameCommand {
  type: 'RESET_GAME';
}

// ── Discriminated Union ─────────────────────────────────────

export type GameCommand =
  // Character
  | SelectClassCommand
  | EquipItemCommand
  | UnequipSlotCommand
  // Inventory
  | AddToInventoryCommand
  | RemoveFromInventoryCommand
  | DisenchantItemCommand
  | SellItemCommand
  // Zone / Idle
  | StartIdleRunCommand
  | StopIdleRunCommand
  | GrantIdleXpCommand
  | SetTargetedMobCommand
  | SetIdleModeCommand
  | SetGatheringProfessionCommand
  // Bags
  | EquipBagCommand
  | SellBagCommand
  | SalvageBagCommand
  | BuyBagCommand
  // Crafting
  | CraftCurrencyCommand
  | RefineMaterialCommand
  | RefineMaterialBatchCommand
  | DeconstructMaterialCommand
  | CraftRecipeCommand
  | CraftRecipeBatchCommand
  | CraftFromPatternCommand
  // Craft Log
  | AddCraftLogEntryCommand
  | ClearCraftLogCommand
  | ClaimCraftOutputCommand
  | ClaimAllCraftOutputCommand
  | SalvageCraftOutputCommand
  | SalvageAllCraftOutputCommand
  // Skills
  | EquipSkillCommand
  | EquipToSkillBarCommand
  | UnequipSkillBarSlotCommand
  | ToggleSkillAutoCastCommand
  | ReorderSkillBarCommand
  | ActivateSkillBarSlotCommand
  | AllocateAbilityNodeCommand
  | RespecAbilityCommand
  | AllocateTalentNodeCommand
  | RespecTalentsCommand
  // Combat
  | StartBossFightCommand
  | HandleBossVictoryCommand
  | HandleBossDefeatCommand
  | CheckRecoveryCompleteCommand
  // World
  | ForceInvasionCommand
  // Meta
  | ClaimOfflineProgressCommand
  | AdvanceTutorialCommand
  | EquipProfessionGearCommand
  | UnequipProfessionSlotCommand
  | SetAutoSalvageRarityCommand
  | SetAutoDisposalActionCommand
  | SetCraftAutoSalvageRarityCommand
  | CheckDailyQuestResetCommand
  | ClaimQuestRewardCommand
  | ResetGameCommand;

// ── Command Result ──────────────────────────────────────────
// Commands that return data (disenchant, sell, craft, etc.)
// use this envelope so the dispatch layer can surface results.

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

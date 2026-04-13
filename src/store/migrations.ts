import {
  Item,
  CharacterClass,
  EquippedSkill,
  SkillProgress,
  SkillTimerState,
  GameState,
} from '../types';
import { BAG_UPGRADE_DEFS, getBagDef, BAG_SLOT_COUNT, ITEM_BASE_DEFS } from '../data/items';
import { createDefaultGatheringSkills } from '../engine/gathering';
import { createDefaultCraftingSkills } from '../data/craftingProfessions';
import { createResourceState } from '../engine/classResource';
import { getDefaultSkillForWeapon } from '../engine/unifiedSkills';
import { getUnifiedSkillDef, ABILITY_ID_MIGRATION } from '../data/skills';
import { generateId } from '../engine/items';

/**
 * Run all save-data migrations from `version` up to the current schema.
 *
 * @param persisted  The raw deserialized state object from localStorage.
 * @param version    The persisted schema version number.
 * @param createInitialState  Factory for a fresh GameState (used by full-wipe migrations).
 * @returns The migrated state object, ready to be used as GameState.
 */
export function runMigrations(
  persisted: unknown,
  version: number,
  createInitialState: () => GameState,
): unknown {
  const old = persisted as Record<string, unknown>;
  const state = { ...old } as unknown as GameState & Record<string, any>;
  const raw = state as unknown as Record<string, unknown>;

  if (version < 7) {
    // v7: Add bag system fields
    raw.bagSlots = Array(BAG_SLOT_COUNT).fill('tattered_satchel');
    raw.bagStash = {};
  }

  if (version < 8) {
    // v8: Replace inventoryCapacity/consumables with bagSlots/bagStash
    const oldCap = (old.inventoryCapacity as number) ?? 30;
    const oldConsumables = (old.consumables as Record<string, number>) ?? {};

    const bagSlots = Array(BAG_SLOT_COUNT).fill('tattered_satchel') as string[];
    const upgradeCount = Math.min(Math.floor((oldCap - 30) / 6), 5);
    const tierOrder = BAG_UPGRADE_DEFS.map(b => b.id);
    for (let i = 0; i < upgradeCount; i++) {
      const slotIdx = i % BAG_SLOT_COUNT;
      const currentDef = getBagDef(bagSlots[slotIdx]);
      const nextTierIdx = tierOrder.indexOf(currentDef.id) + 1;
      if (nextTierIdx < tierOrder.length) {
        bagSlots[slotIdx] = tierOrder[nextTierIdx];
      }
    }

    state.bagSlots = bagSlots;
    state.bagStash = { ...oldConsumables };

    delete raw.inventoryCapacity;
    delete raw.consumables;
  }

  if (version < 9) {
    state.offlineProgress = null;
  }

  if (version < 10) {
    old.equippedAbilities = [null, null, null, null];
    old.abilityTimers = [];
    if (state.character?.equipment?.mainhand) {
      (state.character.equipment.mainhand as Item).weaponType = 'sword';
    }
    for (const item of (state.inventory ?? [])) {
      if (item.slot === 'mainhand' && !item.weaponType) {
        (item as Item).weaponType = 'sword';
      }
    }
  }

  if (version < 11) {
    // v11: Gathering system + auto-apply resources
    state.idleMode = 'combat';
    state.gatheringSkills = createDefaultGatheringSkills();
    state.gatheringEquipment = {};
    state.selectedGatheringProfession = null;

    // Flush any remaining pendingLoot into state
    const pendingLoot = raw.pendingLoot as {
      currencyDrops?: Record<string, number>;
      materials?: Record<string, number>;
      goldGained?: number;
      bagDrops?: Record<string, number>;
    } | undefined;

    if (pendingLoot) {
      if (pendingLoot.currencyDrops) {
        const currencies = (state.currencies ?? {}) as Record<string, number>;
        for (const [key, val] of Object.entries(pendingLoot.currencyDrops)) {
          currencies[key] = (currencies[key] || 0) + val;
        }
      }
      if (pendingLoot.materials) {
        const materials = (state.materials ?? {}) as Record<string, number>;
        for (const [key, val] of Object.entries(pendingLoot.materials)) {
          materials[key] = (materials[key] || 0) + val;
        }
      }
      if (pendingLoot.goldGained) {
        state.gold = (state.gold || 0) + pendingLoot.goldGained;
      }
      if (pendingLoot.bagDrops) {
        const bagStash = (state.bagStash ?? {}) as Record<string, number>;
        for (const [key, val] of Object.entries(pendingLoot.bagDrops)) {
          bagStash[key] = (bagStash[key] || 0) + val;
        }
      }
    }

    // Remove old fields
    delete raw.pendingLoot;
    delete raw.focusMode;
  }

  if (version < 12) {
    // v12: Crafting professions
    state.craftingSkills = createDefaultCraftingSkills();
  }

  if (version < 13) {
    // v13: Independent craft auto-salvage threshold
    state.craftAutoSalvageMinRarity = 'common';
  }

  if (version < 15) {
    // v15: Combat HP + Boss system
    raw.zoneClearCounts = {};
    raw.currentHp = 0;
    raw.combatPhase = 'clearing';
    raw.bossState = null;
    raw.combatPhaseStartedAt = null;
  }

  if (version < 16) {
    // v16: Stat system + affix overhaul — clean wipe required
    return createInitialState();
  }

  if (version < 17) {
    // v17: Tutorial system + starter weapon for existing saves
    const hasMainhand = !!(state.character?.equipment?.mainhand);
    const hasMainhandInBag = (state.inventory ?? []).some(
      (i: Item) => i.slot === 'mainhand'
    );

    // Inject starter weapon if player has no mainhand at all
    if (!hasMainhand && !hasMainhandInBag) {
      const starterWeapon: Item = {
        id: generateId(),
        baseId: 'rusty_shortsword',
        name: 'Rusty Shortsword',
        slot: 'mainhand',
        rarity: 'common',
        iLvl: 1,
        prefixes: [],
        suffixes: [],
        weaponType: 'sword',
        baseStats: { flatPhysDamage: 5 },
        baseDamageMin: 4,
        baseDamageMax: 8,
      };
      state.inventory = [...(state.inventory ?? []), starterWeapon];
    }

    // Set tutorial step based on progress
    if (!hasMainhand) {
      raw.tutorialStep = 1; // Equip weapon
    } else if (!state.idleStartTime && !state.currentZoneId) {
      // Never started a run (or not currently running)
      // Check if they've ever gathered
      const skills = state.gatheringSkills;
      const neverGathered = skills && Object.values(skills).every(
        (s: { level: number; xp: number }) => s.level === 1 && s.xp === 0
      );
      if (neverGathered) {
        raw.tutorialStep = 2; // Guide to zones
      } else {
        raw.tutorialStep = 0; // Done
      }
    } else {
      // Has a run going — check gathering
      const skills = state.gatheringSkills;
      const neverGathered = skills && Object.values(skills).every(
        (s: { level: number; xp: number }) => s.level === 1 && s.xp === 0
      );
      if (neverGathered) {
        raw.tutorialStep = 4; // Try gathering
      } else {
        raw.tutorialStep = 0; // Done
      }
    }
  }

  if (version < 14) {
    // v14: Crafting overhaul — add leatherworker, remove mail armor
    // Add leatherworker skill
    if (state.craftingSkills && !('leatherworker' in state.craftingSkills)) {
      (state.craftingSkills as Record<string, { level: number; xp: number }>).leatherworker = { level: 1, xp: 0 };
    }
    // Convert mail items to leather equivalents
    const mailToLeather: Record<string, string> = {
      // Helmet
      chain_coif: 'rawhide_cap', linked_visor: 'studded_headband', riveted_helm: 'nightstalker_hood',
      mithril_coif: 'mithril_headband', runic_visor: 'runic_hood', void_visor: 'void_hood', starforged_coif: 'starforged_headband',
      // Shoulders
      chain_spaulders: 'hide_shoulderpads', linked_pauldrons: 'studded_shoulderguards', riveted_shoulders: 'nightstalker_shoulders',
      mithril_spaulders: 'mithril_shoulderpads', runic_spaulders: 'runic_shoulderpads', void_spaulders: 'void_shoulderpads', starforged_spaulders: 'starforged_shoulderpads',
      // Chest
      chain_vest: 'rawhide_tunic', chain_hauberk: 'studded_jerkin', linked_haubergeon: 'nightstalker_vest',
      mithril_hauberk: 'mithril_vest', runic_hauberk: 'runic_vest', void_hauberk: 'void_vest', starforged_hauberk: 'starforged_vest',
      // Gloves
      chain_gloves: 'hide_gloves', linked_gauntlets: 'studded_gloves', riveted_gauntlets: 'nightstalker_gloves',
      mithril_chain_gloves: 'mithril_hide_gloves', runic_chain_gloves: 'runic_hide_gloves', void_chain_gloves: 'void_hide_gloves', starforged_chain_gloves: 'starforged_hide_gloves',
      // Pants
      chain_leggings: 'rawhide_pants', linked_chausses: 'studded_leggings', riveted_leggings: 'nightstalker_pants',
      mithril_chausses: 'mithril_leggings', runic_chausses: 'runic_leggings', void_chausses: 'void_leggings', starforged_chausses: 'starforged_leggings',
      // Boots
      chain_boots: 'leather_boots', linked_boots: 'studded_boots', riveted_treads: 'nightstalker_boots',
      mithril_boots: 'mithril_treads', runic_boots: 'runic_treads_leather', void_boots: 'void_treads', starforged_boots: 'starforged_treads',
    };
    const convertItem = (item: Record<string, unknown>) => {
      if (item && item.armorType === 'mail') {
        const newBaseId = mailToLeather[item.baseId as string];
        if (newBaseId) {
          item.baseId = newBaseId;
        }
        item.armorType = 'leather';
      }
    };
    // Convert equipped items
    if (state.character?.equipment) {
      for (const slot of Object.keys(state.character.equipment)) {
        const item = (state.character.equipment as Record<string, unknown>)[slot];
        if (item) convertItem(item as Record<string, unknown>);
      }
    }
    // Convert inventory items
    if (state.inventory) {
      for (const item of state.inventory) {
        convertItem(item as unknown as Record<string, unknown>);
      }
    }
    // Prep potionSlots for Phase 2
    (raw as Record<string, unknown>).potionSlots = [null, null, null];
  }

  if (version < 18) {
    // v18: Class resource system + class selection
    // Existing saves default to Warrior, skip class picker
    if (!state.character?.class || state.character.class === 'warrior') {
      raw.classResource = createResourceState('warrior');
    } else {
      raw.classResource = createResourceState(state.character.class as CharacterClass);
    }
    raw.classSelected = true;  // Skip picker for existing saves
  }

  if (version < 19) {
    // v19: Ability system overhaul — skill trees, XP, per-clear tracking
    raw.abilityProgress = {};
    raw.clearStartedAt = 0;
    raw.currentClearTime = 0;
    // Clear old mutator selections (players re-pick via tree)
    if (old.equippedAbilities) {
      old.equippedAbilities = (old.equippedAbilities as Array<{ abilityId: string; selectedMutatorId: string | null } | null>).map(
        (ea: { abilityId: string; selectedMutatorId: string | null } | null) => ea ? { abilityId: ea.abilityId, selectedMutatorId: null } : null,
      );
    }
  }

  if (version < 20) {
    // v20: Kill counter + fastest clear tracking
    raw.totalKills = 0;
    raw.fastestClears = {};
  }

  if (version < 21) {
    // v21: Greater Exalt + Perfect Exalt currencies
    const currencies = (state.currencies ?? {}) as Record<string, number>;
    if (currencies.greater_exalt === undefined) currencies.greater_exalt = 0;
    if (currencies.perfect_exalt === undefined) currencies.perfect_exalt = 0;
  }

  if (version < 22) {
    // v22: Rename salvage_dust → enchanting_essence
    const materials = (state.materials ?? {}) as Record<string, number>;
    if (materials.salvage_dust !== undefined) {
      materials.enchanting_essence = (materials.enchanting_essence ?? 0) + materials.salvage_dust;
      delete materials.salvage_dust;
    }
  }

  if (version < 23) {
    // v23: Auto-disposal action (salvage vs sell toggle)
    raw.autoDisposalAction = 'salvage';
  }

  if (version < 24) {
    // v24: Active skills system — auto-assign default skill for equipped weapon
    const weaponType = state.character?.equipment?.mainhand?.weaponType;
    if (weaponType) {
      const defaultSkill = getDefaultSkillForWeapon(weaponType, state.character.level);
      raw.equippedSkills = [defaultSkill?.id ?? null, null, null, null];
    } else {
      raw.equippedSkills = [null, null, null, null];
    }
  }

  if (version < 25) {
    // v25: Unified skill bar — migrate equippedSkills + equippedAbilities → skillBar
    const skillBar: (EquippedSkill | null)[] = [null, null, null, null, null, null, null, null];
    const skillProgress: Record<string, SkillProgress> = {};
    const skillTimers: SkillTimerState[] = [];

    // Slot 0: active skill from equippedSkills[0]
    const activeId = (old.equippedSkills as (string | null)[] | undefined)?.[0];
    if (activeId) {
      skillBar[0] = { skillId: activeId, autoCast: true };
    }

    // Slots 1-4: abilities from equippedAbilities[0-3] with ID migration
    const abilities = (old.equippedAbilities ?? []) as ({ abilityId: string; selectedMutatorId: string | null } | null)[];
    const abilityProg = (state.abilityProgress ?? {}) as Record<string, { abilityId: string; xp: number; level: number; allocatedNodes: string[] }>;

    for (let i = 0; i < 4; i++) {
      const ea = abilities[i];
      if (!ea) continue;
      const unifiedId = ABILITY_ID_MIGRATION[ea.abilityId] ?? ea.abilityId;
      const sDef = getUnifiedSkillDef(unifiedId);
      const autoCast = sDef ? (sDef.kind === 'passive' || sDef.kind === 'proc') : false;
      skillBar[i + 1] = { skillId: unifiedId, autoCast };

      // Migrate ability progress to skill progress
      const oldProg = abilityProg[ea.abilityId];
      if (oldProg) {
        skillProgress[unifiedId] = {
          skillId: unifiedId,
          xp: oldProg.xp,
          level: oldProg.level,
          allocatedNodes: [...oldProg.allocatedNodes],
        };
      } else {
        skillProgress[unifiedId] = { skillId: unifiedId, xp: 0, level: 0, allocatedNodes: [] };
      }

      // Init timers for buff/toggle/instant/ultimate kinds
      if (sDef && (sDef.kind === 'buff' || sDef.kind === 'toggle' || sDef.kind === 'instant' || sDef.kind === 'ultimate')) {
        skillTimers.push({ skillId: unifiedId, activatedAt: null, cooldownUntil: null });
      }
    }

    raw.skillBar = skillBar;
    raw.skillProgress = skillProgress;
    raw.skillTimers = skillTimers;
  }

  if (version < 26) {
    // v26: Remove legacy fields, truncate skillBar to 5 slots
    delete old.equippedAbilities;
    delete old.abilityTimers;
    delete old.equippedSkills;
    // Truncate skillBar from 8 to 5 slots
    const bar = (old.skillBar ?? state.skillBar ?? []) as (EquippedSkill | null)[];
    if (bar.length > 5) {
      raw.skillBar = bar.slice(0, 5);
    }
  }

  if (version < 27) {
    // v27: Rotation engine — rename lastSkillCastAt → nextActiveSkillAt (ephemeral, just init to 0)
    delete old.lastSkillCastAt;
    raw.nextActiveSkillAt = 0;

    // Ensure all equipped active skills have SkillTimerState entries
    const skillBar27 = (old.skillBar ?? []) as (EquippedSkill | null)[];
    const timers27 = [...((old.skillTimers ?? []) as SkillTimerState[])];
    const timerSkillIds = new Set(timers27.map(t => t.skillId));
    for (const equipped of skillBar27) {
      if (!equipped) continue;
      const sDef = getUnifiedSkillDef(equipped.skillId);
      if (sDef && sDef.kind === 'active' && !timerSkillIds.has(equipped.skillId)) {
        timers27.push({ skillId: equipped.skillId, activatedAt: null, cooldownUntil: null });
      }
    }
    raw.skillTimers = timers27;
  }

  if (version < 28) {
    // v28: Class talent tree
    raw.talentAllocations = [];
  }

  if (version < 29) {
    // v29: Skill graph trees — clear wand skill allocations (preserve XP/level)
    raw.activeDebuffs = [];
    const sp = (state.skillProgress ?? {}) as Record<string, SkillProgress>;
    const wandSkillIds = [
      'wand_magic_missile', 'wand_chain_lightning', 'wand_frostbolt',
      'wand_searing_ray', 'wand_essence_drain', 'wand_void_blast',
      'wand_chain_lightning_buff', 'wand_time_warp', 'wand_mystic_insight',
    ];
    for (const id of wandSkillIds) {
      if (sp[id]) {
        sp[id] = { ...sp[id], allocatedNodes: [] };
      }
    }
    // Also clear old abilityProgress for wand abilities
    const ap = (state.abilityProgress ?? {}) as Record<string, { abilityId: string; xp: number; level: number; allocatedNodes: string[] }>;
    const wandAbilityIds = ['wand_chain_lightning', 'wand_time_warp', 'wand_mystic_insight'];
    for (const id of wandAbilityIds) {
      if (ap[id]) {
        ap[id] = { ...ap[id], allocatedNodes: [] };
      }
    }
  }

  if (version < 30) {
    // v30: Mob types & targeted farming
    raw.targetedMobId = null;
    raw.mobKillCounts = {};
    raw.bossKillCounts = {};
    raw.totalZoneClears = {};
  }

  if (version < 31) {
    // v31: Enhanced mob drop tables — no state shape change needed.
    // MobTypeDef.drops replaces .uniqueDrops (code-only, not persisted).
    // New crafting materials just appear as they drop into existing materials dict.
  }

  if (version < 32) {
    // v32: Daily quest system
    raw.dailyQuests = { questDate: '', quests: [], progress: {} };
  }

  if (version < 33) {
    // v33: Component crafting system — no state shape change.
    // Components are stored as materials (comp_*) in existing materials dict.
    // Existing gear recipes gain componentCost fields (code-only, not persisted).
  }

  if (version < 34) {
    // v34: Craft output buffer (persisted staging area for crafted gear).
    // craftLog is ephemeral (reset on rehydrate), no migration needed.
    (state as any).craftOutputBuffer = [];
  }

  if (version < 35) {
    // v35: Profession gear system.
    // Initialize profession equipment.
    (state as any).professionEquipment = {};
    // Wipe old gatheringEquipment (bonuses were never applied, safe to drop).
    (state as any).gatheringEquipment = {};
    // Re-tag any isGatheringGear items in inventory as isProfessionGear.
    for (const item of ((state as any).inventory ?? [])) {
      if (item.isGatheringGear) {
        item.isProfessionGear = true;
        delete item.isGatheringGear;
      }
    }
    // Also check craft output buffer.
    for (const item of ((state as any).craftOutputBuffer ?? [])) {
      if (item.isGatheringGear) {
        item.isProfessionGear = true;
        delete item.isGatheringGear;
      }
    }
  }

  if (version < 36) {
    // v36: Chain Lightning tree redesign (51 nodes → 15 nodes, cross-skill synergy).
    // Node IDs changed — reset CL allocatedNodes. Players keep XP/level.
    const sp36 = (state.skillProgress ?? {}) as Record<string, SkillProgress>;
    if (sp36['wand_chain_lightning']) {
      sp36['wand_chain_lightning'] = { ...sp36['wand_chain_lightning'], allocatedNodes: [] };
    }
  }

  if (version < 38) {
    // v38: Full account wipe — fresh start for progression testing
    return createInitialState() as unknown as Record<string, unknown>;
  }

  if (version < 39) {
    // v39: Zone mastery milestones + void invasions
    raw.zoneMasteryClaimed = {};
    raw.invasionState = { activeInvasions: {}, bandCooldowns: {} };
    // Auto-claim mastery milestones for existing players
    const clears = (raw.totalZoneClears ?? {}) as Record<string, number>;
    const claimed: Record<string, number> = {};
    for (const [zoneId, count] of Object.entries(clears)) {
      if (count >= 500) claimed[zoneId] = 500;
      else if (count >= 100) claimed[zoneId] = 100;
      else if (count >= 25) claimed[zoneId] = 25;
    }
    raw.zoneMasteryClaimed = claimed;
  }

  if (version < 56) {
    // v56: Remove augment currency — convert existing augments to exalts
    const currencies = raw.currencies as Record<string, number> | undefined;
    if (currencies && 'augment' in currencies) {
      currencies.exalt = (currencies.exalt ?? 0) + (currencies.augment ?? 0);
      delete currencies.augment;
    }
  }

  if (version < 55) {
    // v55: Socket gem system — add gemInventory
    raw.gemInventory = [];
  }

  if (version < 54) {
    // v54: Dagger buff skill rework — remap old skill IDs to new archetype buffs.
    // dagger_flurry → dagger_venom_covenant, dagger_shadow_strike → dagger_predators_mark,
    // dagger_lethality → dagger_shadow_covenant
    const SKILL_REMAP: Record<string, string> = {
      'dagger_flurry': 'dagger_venom_covenant',
      'dagger_shadow_strike': 'dagger_predators_mark',
      'dagger_lethality': 'dagger_shadow_covenant',
    };
    // Remap skill bar
    const bar54 = (raw.skillBar ?? []) as (Record<string, unknown> | null)[];
    for (let i = 0; i < bar54.length; i++) {
      const slot = bar54[i];
      if (slot && typeof slot.skillId === 'string' && SKILL_REMAP[slot.skillId]) {
        slot.skillId = SKILL_REMAP[slot.skillId];
      }
    }
    // Remap skill timers
    const timers54 = (raw.skillTimers ?? []) as Record<string, unknown>[];
    for (const t of timers54) {
      if (typeof t.skillId === 'string' && SKILL_REMAP[t.skillId]) {
        t.skillId = SKILL_REMAP[t.skillId];
      }
    }
    // Remap skill progress (transfer XP/level, reset allocations)
    const sp54 = (raw.skillProgress ?? {}) as Record<string, Record<string, unknown>>;
    for (const [oldId, newId] of Object.entries(SKILL_REMAP)) {
      if (sp54[oldId]) {
        sp54[newId] = { ...sp54[oldId], skillId: newId, allocatedNodes: [], allocatedRanks: {} };
        delete sp54[oldId];
      }
    }
  }

  if (version < 53) {
    // v53: Level 60 cap + zone iLvl compression (1-95 → 1-60)
    // Clamp existing characters above level 60 to 60, reset XP.
    const char53 = raw.character as Record<string, unknown> | undefined;
    if (char53 && typeof char53.level === 'number' && char53.level > 60) {
      char53.level = 60;
      char53.xp = 0;
      char53.xpToNext = 0;
    }
  }

  if (version < 52) {
    // v52: Multiplicative offense stats (penetration, dotMultiplier, weaponMastery)
    // No-op: new stats default to 0 via BASE_STATS, no existing items have these affixes.
  }

  if (version < 51) {
    // v51: Weapon base attack speed + crit chance
    // Add baseAttackSpeed/baseCritChance to existing weapon items from base defs
    const baseLookup = new Map(ITEM_BASE_DEFS.map(d => [d.id, d.baseStats]));
    const migrateWeaponStats = (item: Record<string, unknown>) => {
      if (!item.weaponType || !item.baseId) return;
      const bs = (item.baseStats ?? {}) as Record<string, unknown>;
      // Rename dagger critChance → baseCritChance
      if (item.weaponType === 'dagger' && 'critChance' in bs) {
        bs.baseCritChance = bs.critChance;
        delete bs.critChance;
      }
      // Add missing baseAttackSpeed/baseCritChance from base def
      const defStats = baseLookup.get(item.baseId as string) as Record<string, unknown> | undefined;
      if (defStats) {
        if (bs.baseAttackSpeed === undefined && defStats.baseAttackSpeed !== undefined) {
          bs.baseAttackSpeed = defStats.baseAttackSpeed;
        }
        if (bs.baseCritChance === undefined && defStats.baseCritChance !== undefined) {
          bs.baseCritChance = defStats.baseCritChance;
        }
      }
      item.baseStats = bs;
    };
    const equip51 = ((raw.character as Record<string, unknown>)?.equipment ?? {}) as Record<string, Record<string, unknown>>;
    for (const item of Object.values(equip51)) { if (item) migrateWeaponStats(item); }
    const inv51 = (raw.inventory ?? []) as Record<string, unknown>[];
    for (const item of inv51) migrateWeaponStats(item);
  }

  if (version < 50) {
    // v50: Death penalty — add streak tracking fields
    raw.deathStreak = 0;
    raw.lastDeathTime = 0;
  }

  if (version < 49) {
    // v49: Skill bar 5→4, affix overhaul, resist rebalance
    const bar = (raw.skillBar ?? []) as (unknown | null)[];
    if (bar.length > 4) {
      const dropped = bar[4];
      raw.skillBar = bar.slice(0, 4);
      // Remove timer for dropped skill
      if (dropped && typeof dropped === 'object' && (dropped as Record<string, unknown>).skillId) {
        const timers = (raw.skillTimers ?? []) as Record<string, unknown>[];
        raw.skillTimers = timers.filter(t => t.skillId !== (dropped as Record<string, unknown>).skillId);
      }
    }
    raw.dodgeEntropy = Math.floor(Math.random() * 100);
    // New stats default to 0 via resolveStats() — no item migration needed
  }

  if (version < 48) {
    // v48: Entropy-based evasion — add dodgeEntropy to player state
    raw.dodgeEntropy = Math.floor(Math.random() * 100);
  }

  if (version < 47) {
    // v47: Poison instance-based debuff refactor — clear ephemeral debuffs
    state.activeDebuffs = [];
    const mobs = (raw.packMobs ?? []) as Array<{ debuffs?: unknown[] }>;
    for (const m of mobs) {
      if (m.debuffs) m.debuffs = [];
    }
  }

  if (version < 46) {
    // v46: Per-mob pack state — remove old encounter-level fields, add packMobs
    delete raw.currentMobHp;
    delete raw.maxMobHp;
    delete raw.zoneNextAttackAt;
    delete raw.packBackMobHps;
    delete raw.packSingleMobMaxHp;
    delete raw.currentRareMob;
    if (!raw.packMobs) raw.packMobs = [];
    if (!raw.currentPackSize) raw.currentPackSize = 1;
  }

  if (version < 44) {
    // v44: Unique dagger skill notables/keystones — reset allocations
    const sp = (raw.skillProgress ?? {}) as Record<string, Record<string, unknown>>;
    for (const sid of Object.keys(sp)) {
      if (sid.startsWith('dagger_')) {
        sp[sid] = { ...sp[sid], allocatedRanks: {} };
      }
    }
  }

  if (version < 43) {
    // v43: Skill Tree Overhaul — initialize talent tree allocations
    // Reset talentAllocations (class talent tree disabled)
    raw.talentAllocations = [];
    // Add allocatedRanks to all skill progress entries
    const sp = (raw.skillProgress ?? {}) as Record<string, Record<string, unknown>>;
    for (const sid of Object.keys(sp)) {
      sp[sid] = { ...sp[sid], allocatedRanks: {} };
    }
    // Remove dagger_lethality from skill bar (skill removed)
    const bar = (raw.skillBar ?? []) as (Record<string, unknown> | null)[];
    for (let i = 0; i < bar.length; i++) {
      if (bar[i] && (bar[i] as Record<string, unknown>).skillId === 'dagger_lethality') {
        bar[i] = null;
      }
    }
  }

  if (version < 42) {
    // v42: Remove legacy flatPhysDamage from item baseStats
    // Weapon damage now comes solely from baseDamageMin/Max; flat phys only from affixes
    const stripFlatPhys = (item: Record<string, unknown>) => {
      const bs = item.baseStats as Record<string, unknown> | undefined;
      if (bs && 'flatPhysDamage' in bs) delete bs.flatPhysDamage;
    };
    const equip = ((raw.character as Record<string, unknown>)?.equipment ?? {}) as Record<string, Record<string, unknown>>;
    for (const item of Object.values(equip)) { if (item) stripFlatPhys(item); }
    const inv = (raw.inventory ?? []) as Record<string, unknown>[];
    for (const item of inv) stripFlatPhys(item);
  }

  if (version < 41) {
    // v41: Debuff overhaul — reset active debuffs (structure changed: stackSnapshots, new mechanics)
    raw.activeDebuffs = [];
  }

  if (version < 40) {
    // v40: Crafting patterns — remove component materials, init pattern inventory
    const mats = (raw.materials ?? {}) as Record<string, number>;
    for (const key of Object.keys(mats)) {
      if (key.startsWith('comp_')) delete mats[key];
    }
    raw.ownedPatterns = [];
  }

  if (version < 57) {
    // v57: Bank system — purchasable item stash tabs
    raw.bank = { tabs: [] };
  }

  if (version < 37) {
    // v37: All-weapon skill-tree rollout (compact 16-node trees).
    // Reset allocatedNodes for all skills with new graph trees.
    // Players keep XP/level.
    const sp37 = (state.skillProgress ?? {}) as Record<string, SkillProgress>;
    const newTreeSkills = [
      // Sword
      'sword_slash', 'sword_double_strike', 'sword_whirlwind', 'sword_flame_slash',
      'sword_blade_ward', 'sword_mortal_strike', 'sword_ice_thrust',
      'sword_blade_fury', 'sword_riposte', 'sword_keen_edge',
      // Axe
      'axe_chop', 'axe_frenzy', 'axe_cleave', 'axe_searing_axe',
      'axe_rend', 'axe_decapitate', 'axe_frost_rend',
      'axe_cleave_buff', 'axe_berserker_rage', 'axe_heavy_blows',
      // Dagger
      'dagger_stab', 'dagger_blade_flurry', 'dagger_fan_of_knives', 'dagger_viper_strike',
      'dagger_smoke_screen', 'dagger_assassinate', 'dagger_lightning_lunge',
      'dagger_flurry', 'dagger_shadow_strike', 'dagger_lethality',
      // Mace
      'mace_crush', 'mace_rapid_strikes', 'mace_shockwave', 'mace_glacial_hammer',
      'mace_concussive_blow', 'mace_pulverise',
      'mace_shockwave_buff', 'mace_fortify', 'mace_crushing_force',
      // Bow
      'bow_arrow_shot', 'bow_rapid_fire', 'bow_multi_shot', 'bow_burning_arrow',
      'bow_smoke_arrow', 'bow_snipe',
      'bow_rapid_fire_buff', 'bow_piercing_shot', 'bow_eagle_eye',
      // Staff
      'staff_arcane_bolt', 'staff_spark', 'staff_fireball', 'staff_ice_shard',
      'staff_arcane_shield', 'staff_meteor',
      'staff_arcane_blast', 'staff_elemental_ward', 'staff_wisdom',
      // Crossbow
      'crossbow_bolt_shot', 'crossbow_burst_fire', 'crossbow_explosive_bolt',
      'crossbow_frost_bolt', 'crossbow_net_shot', 'crossbow_siege_shot',
      'crossbow_power_shot', 'crossbow_explosive_bolt_buff', 'crossbow_steady_aim',
      // Greatsword
      'greatsword_cleave', 'greatsword_wide_sweep', 'greatsword_flame_arc',
      'greatsword_frost_wave', 'greatsword_thunder_crash', 'greatsword_bleeding_edge',
      'greatsword_annihilate',
      'greatsword_momentum', 'greatsword_iron_will', 'greatsword_heavy_impact',
      // Greataxe
      'greataxe_hew', 'greataxe_double_chop', 'greataxe_searing_cleave',
      'greataxe_glacial_rend', 'greataxe_shock_split', 'greataxe_hemorrhage',
      'greataxe_skull_splitter',
      'greataxe_bloodrage', 'greataxe_savage_roar', 'greataxe_butchery',
      // Maul
      'maul_slam', 'maul_ground_pound', 'maul_molten_strike', 'maul_permafrost',
      'maul_thunder_slam', 'maul_seismic_wave', 'maul_cataclysm',
      'maul_earthquake', 'maul_stone_skin', 'maul_crushing_weight',
      // Scepter
      'scepter_smite', 'scepter_holy_strike', 'scepter_flame_brand',
      'scepter_frost_judgment', 'scepter_divine_bolt', 'scepter_chaos_curse',
      'scepter_wrath',
      'scepter_divine_favor', 'scepter_zealotry', 'scepter_consecration',
      // Gauntlet
      'gauntlet_arcane_fist', 'gauntlet_rapid_bolts', 'gauntlet_flame_palm',
      'gauntlet_frost_grip', 'gauntlet_shock_pulse', 'gauntlet_void_grasp',
      'gauntlet_elemental_burst',
      'gauntlet_power_surge', 'gauntlet_arcane_shield', 'gauntlet_spell_fist',
      // Tome
      'tome_incantation', 'tome_eldritch_barrage', 'tome_inferno_page',
      'tome_glacial_tome', 'tome_thunderscript', 'tome_curse_of_decay',
      'tome_apocalypse',
      'tome_forbidden_knowledge', 'tome_eldritch_ward', 'tome_ancient_wisdom',
      // Wand rework (existing IDs, new compact trees)
      'wand_magic_missile', 'wand_frostbolt', 'wand_searing_ray',
      'wand_essence_drain', 'wand_void_blast',
      'wand_chain_lightning_buff', 'wand_time_warp', 'wand_mystic_insight',
    ];
    for (const sid of newTreeSkills) {
      if (sp37[sid]) {
        sp37[sid] = { ...sp37[sid], allocatedNodes: [] };
      }
    }
  }

  // v58: Unique item system — all new fields are optional on Item, no data migration needed.
  // Boss trophies stored in materials bag (same as other materials).
  // Unique patterns stored in ownedPatterns (same as other patterns).
  // Version bump only.

  if (version < 59) {
    // v59: Dagger v2 — rename active skills, remove compact graphs
    const DAGGER_V2_REMAP: Record<string, string> = {
      'dagger_blade_flurry': 'dagger_blade_dance',
      'dagger_lightning_lunge': 'dagger_chain_strike',
      'dagger_smoke_screen': 'dagger_shadow_mark',
    };
    // Remap skill bar
    const bar59 = (raw.skillBar ?? []) as (Record<string, unknown> | null)[];
    for (let i = 0; i < bar59.length; i++) {
      const slot = bar59[i];
      if (slot && typeof slot.skillId === 'string' && DAGGER_V2_REMAP[slot.skillId]) {
        slot.skillId = DAGGER_V2_REMAP[slot.skillId];
      }
    }
    // Remap skill timers
    const timers59 = (raw.skillTimers ?? []) as Record<string, unknown>[];
    for (const t of timers59) {
      if (typeof t.skillId === 'string' && DAGGER_V2_REMAP[t.skillId]) {
        t.skillId = DAGGER_V2_REMAP[t.skillId];
      }
    }
    // Remap skill progress + reset compact graph allocations for renamed skills
    const sp59 = (raw.skillProgress ?? {}) as Record<string, Record<string, unknown>>;
    for (const [oldId, newId] of Object.entries(DAGGER_V2_REMAP)) {
      if (sp59[oldId]) {
        sp59[newId] = { ...sp59[oldId], skillId: newId, allocatedNodes: [] };
        delete sp59[oldId];
      }
    }
    // Reset compact graph allocations for all remaining dagger skills
    for (const sid of Object.keys(sp59)) {
      if (sid.startsWith('dagger_')) {
        sp59[sid] = { ...sp59[sid], allocatedNodes: [] };
      }
    }
    // Initialize Dagger v2 state fields
    if (!raw.comboStates) raw.comboStates = [];
    if (!raw.elementTransforms) raw.elementTransforms = {};
  }

  if (version < 60) {
    // v60: Remove abilityHaste — convert to castSpeed on all items.
    // Attack speed reduces Attack cooldowns, cast speed reduces Spell cooldowns.
    const convertItem = (item: Record<string, any>) => {
      if (item?.stats?.abilityHaste) {
        item.stats.castSpeed = (item.stats.castSpeed ?? 0) + item.stats.abilityHaste;
        delete item.stats.abilityHaste;
      }
      // Convert affixes
      if (item?.affixes) {
        for (const affix of item.affixes) {
          if (affix.stat === 'abilityHaste') {
            affix.stat = 'castSpeed';
            affix.id = affix.id?.replace('ability_haste', 'cast_speed');
            affix.category = affix.category?.replace('ability_haste', 'cast_speed');
          }
        }
      }
    };
    // Equipment
    const equip60 = (raw.character as any)?.equipment;
    if (equip60) {
      for (const item of Object.values(equip60)) {
        if (item) convertItem(item as Record<string, any>);
      }
    }
    // Inventory
    const inv60 = raw.inventory as any[];
    if (inv60) {
      for (const item of inv60) {
        if (item) convertItem(item);
      }
    }
    // Stash
    const stash60 = raw.stashItems as any[];
    if (stash60) {
      for (const item of stash60) {
        if (item) convertItem(item);
      }
    }
    // Active traps init
    if (!raw.activeTraps) raw.activeTraps = [];
    // Active minions init (Staff v2)
    if (!raw.activeMinions) raw.activeMinions = [];
  }

  if (version < 61) {
    // v61: Map fragments currency + per-zone map completion tracking
    if (raw.mapFragments === undefined) raw.mapFragments = 0;
    if (!raw.mapCompletedCounts) raw.mapCompletedCounts = {};
  }

  if (version < 62) {
    // v62: Corrupted maps — highest tier tracking
    if (raw.highestCorruptedTier === undefined) raw.highestCorruptedTier = 0;
  }

  return state;
}

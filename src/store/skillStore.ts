/**
 * skillStore.ts — Skill/talent action logic extracted from gameStore.
 *
 * STATE stays in gameStore (for save compatibility + combat tick reads at 60fps).
 * This store holds ONLY the skill/talent-specific actions.
 * Actions read/write gameStore via useGameStore.getState() / useGameStore.setState().
 * UI components import actions from here, state from gameStore.
 */
import { create } from 'zustand';
import type {
  EquippedSkill,
  GameState,
} from '../types';
import { useGameStore } from './gameStore';
import { getUnifiedSkillDef, getSkillDef } from '../data/skills';
import {
  getSkillEffectiveDuration, getSkillEffectiveCooldown,
} from '../engine/unifiedSkills';
import { ZONE_DEFS } from '../data/zones';
import { SKILL_GCD } from '../data/balance';
import { resolveStats } from '../engine/character';
import { getClassDef } from '../data/classes';
import {
  getClassDamageModifier, getClassClearSpeedModifier,
} from '../engine/classResource';
import { getFullEffect } from '../engine/combat/helpers';
import { computeNextClear } from '../engine/zones/helpers';

interface SkillActions {
  // Class talent tree (currently disabled — class trees in src/data/classTrees/
  // are the active layer; allocation wiring lands in Phase D)
  allocateTalentNode: (nodeId: string) => void;
  respecTalents: () => void;

  // Active skill equip (internal — slot 0)
  equipSkill: (skillId: string, slot?: number) => void;

  // Unified Skill Bar
  equipToSkillBar: (skillId: string, slotIndex: number) => void;
  unequipSkillBarSlot: (slotIndex: number) => void;
  toggleSkillAutoCast: (slotIndex: number) => void;
  reorderSkillBar: (fromSlot: number, toSlot: number) => void;
  activateSkillBarSlot: (slotIndex: number) => void;
  tickAutoCast: () => void;
}

export const useSkillStore = create<SkillActions>()((_set, _get) => ({

  // Class talent tree allocation (no-op — Phase D wiring pending)
  allocateTalentNode: (_nodeId: string) => {
    useGameStore.setState((state) => {
      return state; // Class talent trees disabled (Skill Tree Overhaul Phase 0)
    });
  },

  respecTalents: () => {
    useGameStore.setState((state) => {
      return state; // Class talent trees disabled (Skill Tree Overhaul Phase 0)
    });
  },

  // ─── Active Skill Equip (internal — slot 0) ──────────────

  equipSkill: (skillId: string, _slot?: number) => {
    const state = useGameStore.getState();

    // Validate skill exists
    const skillDef = getSkillDef(skillId);
    if (!skillDef) return;

    // Validate weapon type matches equipped weapon
    const mainhand = state.character.equipment.mainhand;
    if (!mainhand?.weaponType || skillDef.weaponType !== mainhand.weaponType) return;

    // Validate level requirement
    if (state.character.level < skillDef.levelRequired) return;

    // Set skill in skillBar[0]
    const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
    newSkillBar[0] = { skillId, autoCast: true };

    const updates: Partial<GameState> = { skillBar: newSkillBar };

    // Mid-clear recalculation
    if (state.idleStartTime && state.currentZoneId && state.currentClearTime > 0) {
      const now = Date.now();
      const oldClearTime = state.currentClearTime;
      const progress = (now - state.clearStartedAt) / (oldClearTime * 1000);
      const clampedProgress = Math.min(Math.max(progress, 0), 0.99);

      const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
      if (zone) {
        const cDef = getClassDef(state.character.class);
        const abilityEffect = getFullEffect(state, now, false, { skillBar: newSkillBar });
        const classDmgMult = getClassDamageModifier(state.classResource, cDef);
        const classSpdMult = getClassClearSpeedModifier(state.classResource, cDef);
        const tempState = { ...state, skillBar: newSkillBar };
        const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
          tempState, zone, abilityEffect, classDmgMult, classSpdMult,
        );
        updates.clearStartedAt = now - clampedProgress * newClearTime * 1000;
        updates.currentClearTime = newClearTime;
        updates.lastClearResult = newClearResult;
      }
    }

    useGameStore.setState(updates);
  },

  // ─── Unified Skill Bar Actions ────────────────────────────

  equipToSkillBar: (skillId: string, slotIndex: number) => {
    const state = useGameStore.getState();
    if (slotIndex < 0 || slotIndex >= 8) return;

    const skillDef = getUnifiedSkillDef(skillId);
    if (!skillDef) return;

    // Validate weapon compatibility
    const mainhand = state.character.equipment.mainhand;
    if (mainhand?.weaponType && skillDef.weaponType !== mainhand.weaponType) return;

    // Validate level requirement
    if (state.character.level < skillDef.levelRequired) return;

    const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];

    // If skill already in another slot, clear that slot
    const existingIdx = newSkillBar.findIndex(s => s?.skillId === skillId);
    if (existingIdx !== -1 && existingIdx !== slotIndex) {
      newSkillBar[existingIdx] = null;
    }

    const autoCast = true; // All skills auto-cast by default (idle game)
    newSkillBar[slotIndex] = { skillId, autoCast };

    const updates: Partial<GameState> = { skillBar: newSkillBar };

    // Init skillProgress if missing
    const newProgress = { ...state.skillProgress };
    if (!newProgress[skillId]) {
      newProgress[skillId] = { skillId, xp: 0, level: 0 };
      updates.skillProgress = newProgress;
    }

    // Init skillTimers entry for all skill kinds that need timers
    if (skillDef.kind === 'active' || skillDef.kind === 'buff' || skillDef.kind === 'toggle' || skillDef.kind === 'instant' || skillDef.kind === 'ultimate') {
      const newTimers = state.skillTimers.filter(t => t.skillId !== skillId);
      newTimers.push({ skillId, activatedAt: null, cooldownUntil: null });
      updates.skillTimers = newTimers;
    }

    // Mid-clear recalc if running
    if (state.idleStartTime && state.currentZoneId && state.currentClearTime > 0) {
      const now = Date.now();
      const progress = (now - state.clearStartedAt) / (state.currentClearTime * 1000);
      const clampedProgress = Math.min(Math.max(progress, 0), 0.99);
      const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
      if (zone) {
        const abilityEffect = getFullEffect(state, now, false, {
          skillBar: newSkillBar,
          skillProgress: updates.skillProgress ?? state.skillProgress,
          skillTimers: updates.skillTimers ?? state.skillTimers,
        });
        const cDef = getClassDef(state.character.class);
        const classDmgMult = getClassDamageModifier(state.classResource, cDef);
        const classSpdMult = getClassClearSpeedModifier(state.classResource, cDef);
        const tempState = { ...state, skillBar: newSkillBar };
        const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
          tempState, zone, abilityEffect, classDmgMult, classSpdMult,
        );
        updates.clearStartedAt = now - clampedProgress * newClearTime * 1000;
        updates.currentClearTime = newClearTime;
        updates.lastClearResult = newClearResult;
      }
    }

    useGameStore.setState(updates);
  },

  unequipSkillBarSlot: (slotIndex: number) => {
    useGameStore.setState((state) => {
      if (slotIndex < 0 || slotIndex >= 5) return state;
      const equipped = state.skillBar[slotIndex];
      if (!equipped) return state;

      const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
      newSkillBar[slotIndex] = null;

      // Remove from skillTimers but preserve skillProgress
      const newTimers = state.skillTimers.filter(t => t.skillId !== equipped.skillId);

      return { skillBar: newSkillBar, skillTimers: newTimers };
    });
  },

  toggleSkillAutoCast: (slotIndex: number) => {
    useGameStore.setState((state) => {
      if (slotIndex < 0 || slotIndex >= 5) return state;
      const equipped = state.skillBar[slotIndex];
      if (!equipped) return state;

      const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
      newSkillBar[slotIndex] = { ...equipped, autoCast: !equipped.autoCast };
      return { skillBar: newSkillBar };
    });
  },

  reorderSkillBar: (fromSlot: number, toSlot: number) => {
    useGameStore.setState((state) => {
      if (fromSlot < 0 || fromSlot >= 5 || toSlot < 0 || toSlot >= 5) return state;
      if (fromSlot === toSlot) return state;

      const newSkillBar = [...state.skillBar] as (EquippedSkill | null)[];
      const temp = newSkillBar[fromSlot];
      newSkillBar[fromSlot] = newSkillBar[toSlot];
      newSkillBar[toSlot] = temp;
      return { skillBar: newSkillBar };
    });
  },

  activateSkillBarSlot: (slotIndex: number) => {
    useGameStore.setState((state) => {
      const equipped = state.skillBar[slotIndex];
      if (!equipped) return state;
      const def = getUnifiedSkillDef(equipped.skillId);
      if (!def) return state;
      if (def.kind === 'active' || def.kind === 'passive' || def.kind === 'proc') return state;

      const now = Date.now();

      const progress = state.skillProgress[equipped.skillId];
      const stIdx = state.skillTimers.findIndex(t => t.skillId === equipped.skillId);
      if (stIdx === -1) return state;
      const timer = state.skillTimers[stIdx];

      const newSkillTimers = [...state.skillTimers];
      const updates: Partial<GameState> = {};

      // === TOGGLE (no GCD — set-and-forget) ===
      if (def.kind === 'toggle') {
        const newActivatedAt = timer.activatedAt !== null ? null : now;
        newSkillTimers[stIdx] = { skillId: equipped.skillId, activatedAt: newActivatedAt, cooldownUntil: null };
        updates.skillTimers = newSkillTimers;

        return updates;
      }

      // === BUFF / INSTANT / ULTIMATE ===
      // GCD check (only for non-toggle skills)
      if (state.lastSkillActivation && now - state.lastSkillActivation < SKILL_GCD * 1000) return state;

      // Cooldown check
      if (timer.cooldownUntil && now < timer.cooldownUntil) return state;

      const duration = getSkillEffectiveDuration(def, progress);
      const charStats = resolveStats(state.character);
      const speedStat = def.tags.includes('Spell') ? charStats.castSpeed : charStats.attackSpeed;
      const cooldown = getSkillEffectiveCooldown(def, progress, speedStat);

      if (def.kind === 'buff') {
        newSkillTimers[stIdx] = {
          skillId: equipped.skillId,
          activatedAt: now,
          cooldownUntil: now + (duration + cooldown) * 1000,
        };
      } else {
        // instant / ultimate: fire immediately, go on CD
        newSkillTimers[stIdx] = {
          skillId: equipped.skillId,
          activatedAt: null,
          cooldownUntil: now + cooldown * 1000,
        };
      }
      updates.skillTimers = newSkillTimers;
      updates.lastSkillActivation = now;

      // Mage: increment arcane charges on ability activation
      const cDef = getClassDef(state.character.class);
      if (cDef.resourceType === 'arcane_charges') {
        let newStacks = state.classResource.stacks + 1;
        if (cDef.resourceMax !== null) newStacks = Math.min(newStacks, cDef.resourceMax);
        updates.classResource = { ...state.classResource, stacks: newStacks };
      }

      // Mid-clear recalculation (preserve progress % but adjust timing)
      if (state.idleStartTime && state.currentZoneId && state.currentClearTime > 0) {
        const oldClearTime = state.currentClearTime;
        const prog = (now - state.clearStartedAt) / (oldClearTime * 1000);
        const clampedProgress = Math.min(Math.max(prog, 0), 0.99);
        const zone = ZONE_DEFS.find(z => z.id === state.currentZoneId);
        if (zone) {
          const newAbilityEffect = getFullEffect(state, now, false, {
            skillTimers: updates.skillTimers ?? state.skillTimers,
          });
          const classDmgMult = getClassDamageModifier(updates.classResource ?? state.classResource, cDef);
          const classSpdMult = getClassClearSpeedModifier(updates.classResource ?? state.classResource, cDef);
          const { clearTime: newClearTime, clearResult: newClearResult } = computeNextClear(
            state, zone, newAbilityEffect, classDmgMult, classSpdMult,
          );
          updates.clearStartedAt = now - clampedProgress * newClearTime * 1000;
          updates.currentClearTime = newClearTime;
          updates.lastClearResult = newClearResult;
        }
      }

      return updates;
    });
  },

  tickAutoCast: () => {
    const state = useGameStore.getState();
    // Only during active combat
    if (!state.idleStartTime || !state.currentZoneId) return;
    const phase = state.combatPhase;
    if (phase !== 'clearing' && phase !== 'boss_fight') return;

    const now = Date.now();

    for (let i = 0; i < state.skillBar.length; i++) {
      const equipped = state.skillBar[i];
      if (!equipped || !equipped.autoCast) continue;

      const def = getUnifiedSkillDef(equipped.skillId);
      if (!def) continue;
      if (def.kind === 'active' || def.kind === 'passive' || def.kind === 'proc') continue;

      const timer = state.skillTimers.find(t => t.skillId === equipped.skillId);
      if (!timer) continue;

      // Toggle: auto-activate if OFF (no GCD)
      if (def.kind === 'toggle') {
        if (timer.activatedAt === null) {
          useSkillStore.getState().activateSkillBarSlot(i);
        }
        continue;
      }

      // Buff/Instant/Ultimate: check readiness + GCD
      const freshState = useGameStore.getState(); // Re-read after possible prior activation
      if (freshState.lastSkillActivation && now - freshState.lastSkillActivation < SKILL_GCD * 1000) break;

      const progress = freshState.skillProgress[equipped.skillId];
      const duration = getSkillEffectiveDuration(def, progress);
      const freshTimer = freshState.skillTimers.find(t => t.skillId === equipped.skillId);
      const isActive = freshTimer?.activatedAt != null && now < freshTimer.activatedAt + duration * 1000;
      const isOnCooldown = freshTimer?.cooldownUntil != null && now < freshTimer.cooldownUntil;

      if (!isActive && !isOnCooldown) {
        useSkillStore.getState().activateSkillBarSlot(i);
      }
    }
  },

}));

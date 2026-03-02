# Combat Overhaul Roadmap (Sprints 10J → 10N)

> **Machine-readable sprint doc.** Each sprint has exact file paths, function names, and checklists.
> At the start of any session, read this file to pick up where the last session left off.
> Last updated: 2026-03-02

## Current Sprint: **10J — Cleanup Old Systems** ✅ COMPLETE

---

## Sprint 10J: Cleanup Old Systems
**Goal:** Remove all legacy ability/skill code. Only unified system remains.
**Status:** COMPLETE

### What was done:
- [x] Reroute imports in gameStore.ts from engine/abilities, engine/skills, data/abilities, data/skills → engine/unifiedSkills, data/unifiedSkills
- [x] Reroute imports in SkillBar.tsx, SkillPanel.tsx, ZoneScreen.tsx, CharacterScreen.tsx, engine/zones.ts
- [x] `npm run build` passes after reroute
- [x] Remove REVERSE_ABILITY_MAP from gameStore.ts (module-scope, lines 96-100)
- [x] Remove old actions from GameActions interface: equipAbility, unequipAbility, selectMutator, activateAbility, toggleAbility
- [x] Remove old action implementations from store (~240 lines)
- [x] Remove bridge-to-abilityTimers code in activateSkillBarSlot
- [x] Remove bridge writes in equipItem (equippedAbilities, abilityTimers, equippedSkills)
- [x] Remove bridge writes in unequipSlot (equippedSkills)
- [x] Remove bridge writes in equipSkill (equippedSkills → just use skillBar)
- [x] Remove bridge writes in equipToSkillBar (equippedSkills)
- [x] Remove equippedAbilities XP iteration in processNewClears (skillBar iteration + bridge-back covers it)
- [x] Remove equippedAbilities, abilityTimers, equippedSkills from initial state
- [x] Migrate computeNextClear to use skillBar instead of equippedSkills fallback
- [x] Migrate startBossFight to use skillBar instead of equippedSkills
- [x] Migrate getEstimatedClearTime to not reference equippedSkills
- [x] Update resetGame to not set legacy fields
- [x] Update rehydrate to remove legacy field handling
- [x] Remove equippedAbilities, abilityTimers, equippedSkills from GameState type (types/index.ts)
- [x] `npm run build` passes after bridge removal
- [x] Delete engine/abilities.ts, engine/skills.ts, data/abilities.ts, data/skills.ts, ui/components/AbilityBar.tsx
- [x] `npm run build` passes after deletion
- [x] Reduce skillBar from 8 to 5 slots (remove "Soon" slots)
- [x] Create v26 migration: strip equippedAbilities/abilityTimers/equippedSkills, truncate skillBar to 5
- [x] Final `npm run build` passes

### Key decisions:
- `abilityProgress` KEPT in GameState — still needed by allocateAbilityNode/respecAbility actions + skill tree UI in SkillPanel
- XP for abilities still flows through skillBar iteration → bridge-back to abilityProgress (processNewClears)
- Legacy types (AbilityDef, AbilityProgress, etc.) KEPT in types/index.ts — still used by engine/unifiedSkills.ts and data/unifiedSkills.ts internally

---

## Sprint 10K: Real-Time Combat Triggers
**Goal:** Replace passive timer model with real-time skill activation during combat.
**Status:** NOT STARTED

### Checklist:
- [ ] Replace `calcClearTime()` passive model with real-time combat loop
- [ ] Skills fire on their cast time intervals during clears
- [ ] Mob HP drains in real-time based on actual skill casts (not pre-calculated DPS)
- [ ] Active skill rotation: auto-cast fires highest-priority ready skill each tick
- [ ] Cooldown-based skills wait for CD, then fire
- [ ] Spammable skills (0 CD) fire on cast time cadence
- [ ] Visual feedback: skill slots flash on activation
- [ ] Boss fights use same real-time model
- [ ] `npm run build` passes
- [ ] Manual test: skills visually fire during combat

### Files to modify:
- `engine/unifiedSkills.ts` — new real-time combat tick function
- `store/gameStore.ts` — integrate real-time combat into tick loop
- `ui/components/SkillBar.tsx` — activation flash effects
- `ui/screens/ZoneScreen.tsx` — wire real-time tick
- `data/balance.ts` — combat tick interval constant

---

## Sprint 10L: Skill Cooldown UI + Visual Polish
**Goal:** Show cooldown sweeps, cast bars, and skill activation feedback.
**Status:** NOT STARTED

### Checklist:
- [ ] Cooldown sweep overlay on skill bar slots (radial or linear)
- [ ] Cast bar during channeled skills
- [ ] Damage numbers floating up from mob display on skill hits
- [ ] Skill activation particle/glow effect
- [ ] Combat log (compact, scrolling) showing recent skill casts + damage
- [ ] `npm run build` passes

### Files to modify:
- `ui/components/SkillBar.tsx` — cooldown sweep CSS, cast bar
- `ui/screens/ZoneScreen.tsx` — damage numbers, combat log
- `index.css` — new animations

---

## Sprint 10M: Multi-Skill Rotation
**Goal:** Players equip multiple active skills and they rotate automatically.
**Status:** NOT STARTED

### Checklist:
- [ ] Allow multiple active skills in skill bar (currently only slot 0)
- [ ] Rotation logic: fire skills in priority order, respect individual CDs
- [ ] Primary skill (slot 0) is spammable filler between CD skills
- [ ] DPS tooltip shows rotation DPS (not single-skill DPS)
- [ ] Skill priority reordering via drag or arrows
- [ ] `npm run build` passes

### Files to modify:
- `store/gameStore.ts` — rotation logic in tick
- `engine/unifiedSkills.ts` — rotation DPS calc
- `ui/components/SkillBar.tsx` — multi-active visual treatment
- `ui/components/SkillPanel.tsx` — allow equipping multiple active skills

---

## Sprint 10N: Skill Discovery + Unlocks
**Goal:** Skills unlock through gameplay, not all available from start.
**Status:** NOT STARTED

### Checklist:
- [ ] Skills locked by default, unlock through level + weapon mastery
- [ ] Skill discovery on first equip (notification + collection)
- [ ] Skill collection UI in SkillPanel (discovered vs undiscovered)
- [ ] Weapon mastery XP: using a weapon type levels up mastery, unlocking skills
- [ ] Mastery milestones grant skill unlocks
- [ ] `npm run build` passes

### Files to modify:
- `types/index.ts` — weapon mastery state, discovered skills set
- `data/unifiedSkills.ts` — unlock requirements per skill
- `store/gameStore.ts` — mastery XP tracking, skill unlock logic
- `ui/components/SkillPanel.tsx` — collection UI
- Save migration for new state fields

---

## Architecture Notes

### Unified Skill System (post-10J):
```
data/unifiedSkills.ts    — 75 SkillDefs (51 active + 24 ability), all lookup functions
engine/unifiedSkills.ts  — ALL engine functions (DPS calc, ability resolution, aggregation, XP, skill trees)
store/gameStore.ts       — skillBar (5 slots), skillProgress, skillTimers, allocateAbilityNode, respecAbility
types/index.ts           — SkillDef, SkillKind, EquippedSkill, SkillProgress, SkillTimerState + legacy types for internal use
```

### Legacy types still in types/index.ts (used internally by unified modules):
- `AbilityKind`, `AbilityEffect`, `AbilityDef`, `AbilityProgress`, `AbilityTimerState`, `EquippedAbility`
- `ActiveSkillDef`, `DamageTag`
- `ScalingFormula`, `ScalingTerm`, `SkillTreeNode`, `SkillTreePath`, `AbilitySkillTree`, `MutatorDef`

### State fields:
- `skillBar: (EquippedSkill | null)[]` — 5 unified slots (slot 0 = active skill, slots 1-4 = abilities)
- `skillProgress: Record<string, SkillProgress>` — unified XP/level/nodes by skill ID
- `skillTimers: SkillTimerState[]` — activation/cooldown state
- `abilityProgress: Record<string, AbilityProgress>` — still used by allocateAbilityNode/respecAbility (keyed by OLD ability IDs)

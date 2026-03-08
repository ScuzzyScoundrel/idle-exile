# Dagger Talent Tree — Implementation Plan

> Full 3-sprint implementation plan for per-skill talent trees.
> Reference doc that persists across context clears.
> Last updated: 2026-03-05

## Overview

Each of the 7 active dagger skills gets its own talent tree (3 branches × 7 tiers × ~10 nodes = ~19 capacity per branch). Buff skills (Stealth, Flurry) do NOT get trees. `dagger_lethality` was removed entirely (save v43 migration handles cleanup).

### Architecture

- **Engine**: `src/engine/talentTree.ts` — allocation/resolution (pure TS, no React)
- **Types**: `src/types/index.ts` — `TalentNode`, `TalentBranch`, `TalentTree`, `SkillDef.talentTree`, `SkillProgress.allocatedRanks`
- **Data**: `src/data/skillGraphs/dagger_talents.ts` — all 7 skill trees
- **Builder**: `src/data/skillGraphs/talentTreeBuilder.ts` — factory pattern
- **Barrel**: `src/data/skillGraphs/talentTrees.ts` — `ALL_TALENT_TREES` export
- **Wiring**: `src/data/unifiedSkills.ts:2487` — `talentTree: ALL_TALENT_TREES[s.id]`
- **Store**: `src/store/gameStore.ts` — `allocateAbilityNode` + `respecAbility` talent paths
- **Balance**: `src/data/balance.ts` — `SKILL_MAX_LEVEL=30`, `TALENT_TIER_GATES=[0,2,4,7,10,11,12]`

### 7 Active Skills Getting Trees

| ID | Name | Archetype |
|----|------|-----------|
| `dagger_stab` | Stab | single-hit, fast-cd |
| `dagger_blade_flurry` | Blade Flurry | multi-hit, combo |
| `dagger_fan_of_knives` | Frost Fan | aoe, projectile, cold |
| `dagger_viper_strike` | Viper Strike | dot, chaos, melee |
| `dagger_smoke_screen` | Shadow Step | chaos, melee, stealth-synergy |
| `dagger_assassinate` | Assassinate | single-hit, long-cd, big-hit |
| `dagger_lightning_lunge` | Lightning Lunge | chain, lightning, fast-cast |

### 3 Branch Themes

| Branch | Index | Theme | Core Mechanic |
|--------|-------|-------|---------------|
| Assassination | 0 | Crit, burst, execute | Crit scaling → Vulnerable → execute payoffs |
| Venomcraft | 1 | Poison, DoT, debuffs | Poison → debuff stacking → DoT payoffs |
| Shadow Dance | 2 | Evasion, defense, combos | Defense → dodge/block procs → rhythm triggers |

---

## Sprint 1: Engine Foundation — COMPLETE

**Goal**: All engine infrastructure for talent trees. No data authoring.

### What Was Built

| File | What | Status |
|------|------|--------|
| `src/engine/talentTree.ts` | `canAllocateTalentRank`, `resolveTalentModifiers`, allocation/respec logic | Done |
| `src/types/index.ts` | `TalentNode`, `TalentBranch`, `TalentTree` interfaces + `SkillDef.talentTree` + `SkillProgress.allocatedRanks` | Done |
| `src/data/balance.ts` | `SKILL_MAX_LEVEL=30`, `TALENT_TIER_GATES=[0,2,4,7,10,11,12]` | Done |
| `src/engine/unifiedSkills.ts` | `getSkillGraphModifier` (line ~102) + `aggregateGraphGlobalEffects` (line ~524) check `talentTree` first | Done |
| `src/store/gameStore.ts` | `allocateAbilityNode` + `respecAbility` talent tree paths, save v43 | Done |
| `src/engine/combatHelpers.ts` | P1 mechanics: `whileBuffActive`, ICD, `executeOnly`, etc. | Done |

### Phase 0 Cleanup (also done in Sprint 1)

- Class talent trees disabled (allocate/respec return early)
- `classTalents` import removed from gameStore
- `dagger_lethality` removed from skill bar on save migration v43
- `talentAllocations` reset on migration

### Verification

- `npm run build` passes
- Game fully playable
- Save version: v43

---

## Sprint 2: Dagger Data — COMPLETE

**Goal**: Author all 7 dagger skill talent trees using builder pattern.

### What Was Built

| File | What | Status |
|------|------|--------|
| `src/data/skillGraphs/talentTreeBuilder.ts` | Builder factory — `TalentBranchConfig`, `TalentTreeConfig`, `createTalentTree()` | Done |
| `src/data/skillGraphs/dagger_talents.ts` | All 7 skill talent trees (147 behavior nodes + per-skill notables + T5-T7) | Done |
| `src/types/index.ts` | Removed `shared` field from `TalentNode` interface | Done |
| `src/ui/components/TalentTreeView.tsx` | Removed SHARED badge rendering | Done |
| `docs/SKILL_TREE_OVERHAUL.md` | Updated to reflect no-shared architecture | Done |

### Architecture Decision: All Nodes Inline Per Skill

Originally planned to use shared constants and factory functions for notables/keystones that repeat across all 7 skills. **Refactored to fully inline** — each skill's branch configs are self-contained with unique proc IDs (e.g., `st_blade_sense` for Stab, `bf_blade_sense` for Blade Flurry). This means:
- No shared constants or factory functions
- No `shared` field on `TalentNode`
- Easier to customize notables per-skill in the future
- Each tree is fully readable without jumping to shared definitions

### Builder Pattern

`createTalentTree(cfg)` takes a `TalentTreeConfig` and generates:
- Node IDs: `{prefix}_{branchIndex}_{tier}_{position}` (e.g., `st_0_1_0`)
- Auto-wires T5 `exclusiveWith` between t5a and t5b
- Fills `id`, `tier`, `branchIndex`, `position` from config structure

### 7 Trees with Prefixes

| Skill | Prefix | castSkill (Precision Killer) |
|-------|--------|-----------------------------|
| Stab | `st` | `dagger_stab` |
| Blade Flurry | `bf` | `dagger_blade_flurry` |
| Frost Fan | `ff` | `dagger_fan_of_knives` |
| Viper Strike | `vs` | `dagger_viper_strike` |
| Shadow Step | `ss` | `dagger_smoke_screen` |
| Assassinate | `as` | `dagger_assassinate` |
| Lightning Lunge | `ll` | `dagger_lightning_lunge` |

### Per-Branch Structure (13 nodes each)

| Slot | Tier | Position | Type |
|------|------|----------|------|
| T1a | 1 | 0 | behavior (maxRank: 2) |
| T1b | 1 | 1 | behavior (maxRank: 2) |
| T2 Notable | 2 | 0 | notable (maxRank: 1) |
| T2b | 2 | 1 | behavior (maxRank: 2) |
| T3a | 3 | 0 | behavior (maxRank: 2) |
| T3b | 3 | 1 | behavior (maxRank: 2) |
| T3c | 3 | 2 | behavior (maxRank: 2) |
| T4 Notable | 4 | 0 | notable (maxRank: 1) |
| T4b | 4 | 1 | behavior (maxRank: 2) |
| T5a | 5 | 0 | keystoneChoice (maxRank: 1) |
| T5b | 5 | 1 | keystoneChoice (maxRank: 1) |
| T6 Notable | 6 | 0 | notable (maxRank: 1) |
| T7 Keystone | 7 | 0 | keystone (maxRank: 1) |

### Verification

- [x] `npm run build` passes
- [x] No shared constants, factory functions, or `shared` field remain
- [x] All 7 Precision Killer castSkill values match their skillId
- [x] All 21 tensionWith values use correct `{prefix}_{branchIdx}_6_0` format

---

## Sprint 3: UI + Integration — COMPLETE

**Goal**: Talent tree UI panel + full combat integration.

### What Was Built

| File | What | Status |
|------|------|--------|
| `src/data/skillGraphs/talentTrees.ts` | Barrel export `ALL_TALENT_TREES` (keyed by skillId) | Done |
| `src/data/unifiedSkills.ts:2489` | Wiring: `talentTree: ALL_TALENT_TREES[s.id]` | Done |
| `src/ui/components/TalentTreeView.tsx` | Talent tree visualization UI | Done |
| `src/ui/components/SkillPanel.tsx` | Integration — talent tree access from skill panel | Done |

### Combat Integration

- Talent tree modifiers flow through `resolveTalentModifiers()` → merged with skill graph modifiers
- `getSkillGraphModifier()` checks `talentTree` first (Sprint 1 wiring)
- P1 mechanics from `combatHelpers.ts` (ICD, executeOnly, etc.) activate when talent nodes grant them
- Dodge-within-window counting
- `resetCooldown: 'self'` resolution
- Venom Frenzy buff application
- Death Mark debuff type
- DEATHBLOW execute-only + auto-fire
- `removeEffect` (keystone removing another node's effect)
- `overrideProc` (keystone modifying another node's proc)

### Verification

- [ ] Talent tree UI renders for all 7 dagger skills
- [ ] Allocating/deallocating nodes works
- [ ] Talent modifiers apply in combat
- [ ] P1 mechanics work (ICD, execute, etc.)
- [ ] Respec costs correct gold
- [ ] `npm run build` passes
- [ ] Mobile-responsive

---

## Appendix: File Reference

### Pre-Existing Files (read-only reference)

| File | Relevance |
|------|-----------|
| `docs/weapon-designs/dagger.md` | Canonical design doc (v3.2) — all node specs |
| `docs/SKILL_TREE_OVERHAUL.md` | Architecture overview, engine changes tracker |
| `src/engine/skillGraph.ts` | Existing skill graph engine (talent tree follows same patterns) |
| `src/data/skillGraphs/index.ts` | `ALL_SKILL_GRAPHS` barrel — pattern to follow for talent trees |
| `src/data/skillGraphs/wand.ts` | Reference skill graph implementation |
| `src/data/skillGraphs/dagger.ts` | Existing dagger skill graphs (separate from talent trees) |

### Save Version History

| Version | Change |
|---------|--------|
| v42 | Damage Bucket Fix (flatPhysDamage cleanup) |
| v43 | Skill Tree Overhaul Phase 0 (class talents disabled, dagger_lethality removed, talentAllocations reset) |

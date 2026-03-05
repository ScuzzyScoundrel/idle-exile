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

## Sprint 2: Dagger Data — NOT STARTED

**Goal**: Author all 7 dagger skill talent trees using builder pattern.

### New Files

| File | Purpose |
|------|---------|
| `src/data/skillGraphs/talentTreeBuilder.ts` | Builder factory — `TalentBranchConfig`, `TalentTreeConfig`, `createTalentTree()` |
| `src/data/skillGraphs/dagger_talents.ts` | All 7 skill talent trees (147 behavior nodes + shared notables + T5-T7) |
| `src/data/skillGraphs/talentTrees.ts` | Barrel export: `ALL_TALENT_TREES` record |

### Modified Files

| File | Change |
|------|--------|
| `src/data/unifiedSkills.ts:2487` | Add `talentTree: ALL_TALENT_TREES[s.id]` alongside existing `skillGraph:` |

### Builder Pattern

```typescript
interface TalentBranchConfig {
  name: string;
  description: string;
  t2Notable: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  t4Notable: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  behaviorNodes: {
    t1a: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t1b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t2b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t3a: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t3b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t3c: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t4b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  };
  t5a: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position' | 'exclusiveWith'>;
  t5b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position' | 'exclusiveWith'>;
  t6Notable: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  t7Keystone: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
}

interface TalentTreeConfig {
  skillId: string;
  prefix: string;  // e.g. 'st' for Stab
  branches: [TalentBranchConfig, TalentBranchConfig, TalentBranchConfig];
}

function createTalentTree(cfg: TalentTreeConfig): TalentTree
```

**ID format**: `{prefix}_{branchIndex}_{tier}_{position}`
- Example: `st_0_1_0` = Stab, Assassination branch (0), T1, first node (position 0)
- Example: `st_1_5_1` = Stab, Venomcraft branch (1), T5, choice B (position 1)

Auto-behaviors:
- Fills `id`, `tier`, `branch`, `position` from config position
- Auto-wires T5 `exclusiveWith` between t5a and t5b

### Shared Data (reusable across all 7 skills)

**6 Shared Notables** (Section 5 of dagger.md):
| Branch | T2 Notable | T4 Notable |
|--------|------------|------------|
| Assassination | Blade Sense (escalating proc → Predator state) | Exploit Weakness (crits apply Vulnerable) |
| Venomcraft | Envenom (guaranteed poison + Toxic Burst) | Deep Wounds (+25% poison dmg, Venom Frenzy at 8+ stacks) |
| Shadow Dance | Shadow Guard (fortify on hit, dodge → CD reset) | Ghost Step (dodge heal + Shadow Form at 3 dodges) |

**T5-T7 per Branch** (Section 7 of dagger.md):
| Branch | T5a | T5b | T6 | T7 |
|--------|-----|-----|----|----|
| Assassination | Precision Killer (consistent) | Opportunist (risky) | Death Mark | DEATHBLOW |
| Venomcraft | Toxic Mastery (consistent) | Volatile Toxins (risky) | Pandemic | PLAGUE LORD |
| Shadow Dance | Evasive Recovery (consistent) | Counter Stance (risky) | Phantom Stride | SHADOW SOVEREIGN |

### Per-Skill Behavior Nodes

Each skill has 7 unique behavior nodes per branch (21 per skill, 147 total across 7 skills).
Full specs in dagger.md Section 8.

| Slot | Tier | Position | Type |
|------|------|----------|------|
| T1a | 1 | 0 | behavior (maxRank: 2) |
| T1b | 1 | 1 | behavior (maxRank: 2) |
| T2b | 2 | 1 | behavior (maxRank: 2) |
| T3a | 3 | 0 | behavior (maxRank: 2) |
| T3b | 3 | 1 | behavior (maxRank: 2) |
| T3c | 3 | 2 | behavior (maxRank: 2) |
| T4b | 4 | 1 | behavior (maxRank: 2) |

### Execution Order (8 steps)

See `docs/SPRINT_2_PLAN.md` for the full micro-sprint breakdown.

1. Builder factory (`talentTreeBuilder.ts`)
2. Shared data helpers (6 notables + T5-T7)
3. Stab tree (reference implementation)
4. Blade Flurry + Frost Fan trees
5. Viper Strike + Shadow Step trees
6. Assassinate + Lightning Lunge trees
7. Barrel export + wiring to `unifiedSkills.ts`
8. Verification

### Data Source

All behavior node specs come from `docs/weapon-designs/dagger.md`:
- **Section 5** (lines ~225-393): Shared notables
- **Section 6** (lines ~397-627): Full Stab/Assassination reference tree
- **Section 7** (lines ~630-833): T5-T7 per branch
- **Section 8** (lines ~835-1113): All behavior nodes per skill per branch

### Verification Checklist

- [ ] All 7 dagger skills have `talentTree` populated
- [ ] T1 nodes allocatable at skill level 1 (gate: 0 pts)
- [ ] T2 gate requires 2 pts invested in branch
- [ ] T5 exclusiveWith correctly prevents both being allocated
- [ ] `npm run build` passes
- [ ] Game playable, no regressions
- [ ] Save version unchanged (no migration needed — talent trees are data-only)

---

## Sprint 3: UI + Integration — NOT STARTED

**Goal**: Talent tree UI panel + full combat integration.

### UI Work

| Component | Purpose |
|-----------|---------|
| `TalentTreeView.tsx` | SVG/canvas talent tree visualization (3 branches, 7 tiers) |
| `TalentTreePanel.tsx` | Panel wrapper (skill selector, points display, respec button) |
| Integration into `SkillPanel.tsx` | "Talent" button alongside existing "Tree" button for skill graphs |

### Combat Integration

- Talent tree modifiers flow through `resolveTalentModifiers()` → merged with skill graph modifiers
- `getSkillGraphModifier()` already checks `talentTree` (Sprint 1 wiring)
- New P1 mechanics from `combatHelpers.ts` (ICD, executeOnly, etc.) activate when talent nodes grant them

### Engine Extensions (P1 — Dagger-Specific)

From `docs/SKILL_TREE_OVERHAUL.md` P1 checklist:
- Per-debuff stack threshold (`{ debuffId: 'poisoned', threshold: 3 }`)
- ICD system (`lastProcTriggerAt` + `internalCooldown`)
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

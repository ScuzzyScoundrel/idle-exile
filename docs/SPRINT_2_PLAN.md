# Sprint 2: Dagger Talent Tree Data — Micro-Sprint Plan

> 8-step breakdown for authoring all 7 dagger skill talent trees.
> Each step is self-contained and safe to execute after a context clear.
> Last updated: 2026-03-05

## Prerequisites

- Sprint 1 (Engine Foundation) COMPLETE
- `src/engine/talentTree.ts` exists with `canAllocateTalentRank`, `resolveTalentModifiers`
- `src/types/index.ts` has `TalentNode`, `TalentBranch`, `TalentTree` interfaces
- `src/data/balance.ts` has `SKILL_MAX_LEVEL=30`, `TALENT_TIER_GATES=[0,2,4,7,10,11,12]`
- `npm run build` passes, save version v43

## Data Source

All specs from `docs/weapon-designs/dagger.md`:
- **Section 5** (~lines 225-393): 6 shared notables (2 per branch)
- **Section 6** (~lines 397-627): Full Stab/Assassination reference tree
- **Section 7** (~lines 630-833): T5-T7 per branch (3 branches x 4 nodes each)
- **Section 8** (~lines 835-1113): All behavior nodes (7 skills x 3 branches x 7 slots)

---

## Step 1: Builder Factory

**File**: `src/data/skillGraphs/talentTreeBuilder.ts` (NEW)

**What**: Create the builder that converts config objects into `TalentTree` instances.

**Pattern**: Follow `src/data/skillGraphs/index.ts` style (pure data, no React).

**Interfaces**:
```typescript
interface TalentBranchConfig {
  name: string;
  description: string;
  // Shared notables (identical across all skills in this branch)
  t2Notable: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  t4Notable: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  // Skill-specific behavior nodes (7 per branch)
  behaviorNodes: {
    t1a: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t1b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t2b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t3a: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t3b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t3c: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
    t4b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  };
  // T5 keystone choices (auto-wired exclusiveWith)
  t5a: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position' | 'exclusiveWith'>;
  t5b: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position' | 'exclusiveWith'>;
  // T6-T7 (branch-specific, not skill-specific for shared; skill-specific for T6)
  t6Notable: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
  t7Keystone: Omit<TalentNode, 'id' | 'tier' | 'branch' | 'position'>;
}

interface TalentTreeConfig {
  skillId: string;
  prefix: string;  // Short prefix for IDs (e.g., 'st' for Stab)
  branches: [TalentBranchConfig, TalentBranchConfig, TalentBranchConfig];
}
```

**`createTalentTree(cfg: TalentTreeConfig): TalentTree`**:
- Generates IDs as `{prefix}_{branchIndex}_{tier}_{position}`
  - e.g., `st_0_1_0` = Stab, Assassination (branch 0), T1, position 0
- Auto-fills `tier`, `branch`, `position` from config structure
- Auto-wires T5 `exclusiveWith` between t5a and t5b
- Node layout per branch:
  - T1: `[t1a (pos 0), t1b (pos 1)]`
  - T2: `[t2Notable (pos 0), t2b (pos 1)]`
  - T3: `[t3a (pos 0), t3b (pos 1), t3c (pos 2)]`
  - T4: `[t4Notable (pos 0), t4b (pos 1)]`
  - T5: `[t5a (pos 0), t5b (pos 1)]`
  - T6: `[t6Notable (pos 0)]`
  - T7: `[t7Keystone (pos 0)]`

**Build after**: `npm run build`

**Estimated size**: ~80-100 lines

---

## Step 2: Shared Data Helpers

**File**: `src/data/skillGraphs/dagger_talents.ts` (NEW — start of file)

**What**: Define the 6 shared notables and 3 branch T5-T7 configs as reusable objects.

**Shared Notables** (from Section 5):

| Branch | T2 | T4 |
|--------|----|----|
| Assassination | `BLADE_SENSE` — 10% on hit → Predator (+50% crit mult, 3s), escalating +4%/hit | `EXPLOIT_WEAKNESS` — crits apply Vulnerable (2s), +15% crit vs Vulnerable |
| Venomcraft | `ENVENOM` — guaranteed poison on hit, Toxic Burst at 3+ stacks | `DEEP_WOUNDS` — +25% poison dmg, Venom Frenzy at 8+ stacks (ICD 20s) |
| Shadow Dance | `SHADOW_GUARD` — fortify on hit, dodge → 35% CD reset, +5 resist | `GHOST_STEP` — dodge heal 5%, Shadow Form at 3 dodges/6s (ICD 15s) |

**Branch T5-T7** (from Section 7):

| Branch | T5a | T5b | T6 | T7 |
|--------|-----|-----|----|----|
| Assassination | Precision Killer | Opportunist | Death Mark | DEATHBLOW |
| Venomcraft | Toxic Mastery | Volatile Toxins | Pandemic | PLAGUE LORD |
| Shadow Dance | Evasive Recovery | Counter Stance | Phantom Stride | SHADOW SOVEREIGN |

These are defined as partial objects (without `id`/`tier`/`branch`/`position`) so the builder fills those in.

**Build after**: `npm run build`

**Estimated size**: ~200-250 lines (modifier objects are verbose)

---

## Step 3: Stab Tree (Reference Implementation)

**File**: `src/data/skillGraphs/dagger_talents.ts` (append)

**What**: First complete talent tree using the builder. Stab is the reference skill from Section 6.

**Prefix**: `st`

**Behavior nodes per branch** (from Section 8):

| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Puncture | Tunnel Vision | Honed Instincts | Backstab Setup | Relentless Pursuit | Lethal Rhythm | Predator's Mark |
| Venomcraft | Envenomed Blade | Toxic Strikes | Lingering Venom | Virulent Threshold | Toxic Transfer | Venom Burst | Frenzy Strikes |
| Shadow Dance | Defensive Instinct | Combat Leech | Reactive Footwork | Counter Stab | Second Wind | Combat Flow | Shadow Strikes |

**Result**: `export const STAB_TALENT_TREE = createTalentTree({ skillId: 'dagger_stab', prefix: 'st', branches: [...] })`

**Build after**: `npm run build`

**Estimated size**: ~150-200 lines (most verbose step — establishes the pattern)

---

## Step 4: Blade Flurry + Frost Fan Trees

**File**: `src/data/skillGraphs/dagger_talents.ts` (append)

**What**: Two more trees following the Stab pattern.

**Blade Flurry** — prefix: `bf`
| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Accelerating Cuts | Blade Dance | Precision Cuts | Full Flurry | Whirlwind Combo | Escalating Cuts | Predator's Flurry |
| Venomcraft | Toxic Flurry | Corroding Cuts | Accelerating Toxin | Overwhelming Venom | Hemorrhagic Poison | Chain Reaction | Venom Whirlwind |
| Shadow Dance | Guarded Flurry | Momentum Leech | Blade Shield | Whirling Counter | Defensive Rhythm | Rapid Recovery | Shadow Flurry |

**Frost Fan** — prefix: `ff`
| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Spreading Chill | Piercing Toxin | Frozen Focus | Shatter Point | Crossfire | Blizzard Barrage | Predator's Frost |
| Venomcraft | Toxic Frost | Plague Scatter | Festering Chill | Noxious Cloud | Pandemic Breeze | Toxic Detonation | Venom Gale |
| Shadow Dance | Frost Ward | Chilling Defense | Evasive Scatter | Frozen Counter | Ice Barrier | Blizzard Step | Shadow Frost |

**Build after each tree**: `npm run build`

---

## Step 5: Viper Strike + Shadow Step Trees

**File**: `src/data/skillGraphs/dagger_talents.ts` (append)

**Viper Strike** — prefix: `vs`
| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Toxic Precision | Venom Surge | Critical Infection | Lethal Dose | Toxic Detonation | Festering Wounds | Predator's Venom |
| Venomcraft | Deep Injection | Concentrated Toxin | Venomous Mastery | Virulent Cascade | Toxic Inheritance | Venom Eruption | Venomous Frenzy |
| Shadow Dance | Venomous Defense | Toxic Resilience | Serpent's Dodge | Venomous Counter | Regenerative Toxin | Serpent Flow | Serpent's Shadow |

**Shadow Step** — prefix: `ss`
| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Shadow Surge | Lurking Death | Unseen Blade | Ambush Protocol | Ghost Predator | Patient Shadow | Predator's Cloak |
| Venomcraft | Shadow Venom | Insidious Strike | Creeping Darkness | Toxic Ambush | Plague Assassin | Festering Shadow | Shadow Frenzy |
| Shadow Dance | Phase Shift | Shadow Counter | Flickering Shadow | Phantom Strike | Vanishing Act | Shadow Tempo | Spectral Shadow |

**Build after each tree**: `npm run build`

---

## Step 6: Assassinate + Lightning Lunge Trees

**File**: `src/data/skillGraphs/dagger_talents.ts` (append)

**Assassinate** — prefix: `as`
| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Finishing Blow | Patient Predator | Executioner's Focus | Charged Execution | Death's Opportunity | Mercy Threshold | Predator's Judgment |
| Venomcraft | Toxic Execution | Venom Amplifier | Envenom Strike | Lethal Dose | Plague Finisher | Toxic Overload | Venomous Judgment |
| Shadow Dance | Calculated Strike | Fortified Execution | Patient Counter | Executioner's Counter | Death's Reprieve | Shadow Execution | Shadow Executioner |

**Lightning Lunge** — prefix: `ll`
| Branch | T1a | T1b | T2b | T3a | T3b | T3c | T4b |
|--------|-----|-----|-----|-----|-----|-----|-----|
| Assassination | Voltaic Precision | Overload | Storm's Edge | Cascading Strikes | Arc Return | Galvanic Surge | Predator's Current |
| Venomcraft | Voltaic Venom | Corrosive Current | Conducting Toxin | Galvanic Poison | Chain Infection | Voltaic Burst | Storm Frenzy |
| Shadow Dance | Lightning Reflex | Storm Dodge | Evasive Lunge | Voltaic Counter | Grounding Step | Storm Tempo | Shadow Lightning |

**Build after each tree**: `npm run build`

---

## Step 7: Barrel Export + Wiring

### 7A: Create Barrel

**File**: `src/data/skillGraphs/talentTrees.ts` (NEW)

```typescript
import { TalentTree } from '../../types';
import {
  STAB_TALENT_TREE, BLADE_FLURRY_TALENT_TREE, FROST_FAN_TALENT_TREE,
  VIPER_STRIKE_TALENT_TREE, SHADOW_STEP_TALENT_TREE,
  ASSASSINATE_TALENT_TREE, LIGHTNING_LUNGE_TALENT_TREE,
} from './dagger_talents';

export const ALL_TALENT_TREES: Record<string, TalentTree> = {
  dagger_stab: STAB_TALENT_TREE,
  dagger_blade_flurry: BLADE_FLURRY_TALENT_TREE,
  dagger_fan_of_knives: FROST_FAN_TALENT_TREE,
  dagger_viper_strike: VIPER_STRIKE_TALENT_TREE,
  dagger_smoke_screen: SHADOW_STEP_TALENT_TREE,
  dagger_assassinate: ASSASSINATE_TALENT_TREE,
  dagger_lightning_lunge: LIGHTNING_LUNGE_TALENT_TREE,
};
```

### 7B: Wire to unifiedSkills.ts

**File**: `src/data/unifiedSkills.ts` (line ~2487)

**Before**:
```typescript
  skillGraph: ALL_SKILL_GRAPHS[s.id],
}));
```

**After**:
```typescript
  skillGraph: ALL_SKILL_GRAPHS[s.id],
  talentTree: ALL_TALENT_TREES[s.id],
}));
```

Add import at top:
```typescript
import { ALL_TALENT_TREES } from './skillGraphs/talentTrees';
```

**Build after**: `npm run build`

---

## Step 8: Verification

**Checks**:
1. All 7 dagger skills have `talentTree` property populated
2. Non-dagger skills have `talentTree: undefined` (record miss returns undefined)
3. T1 nodes are allocatable at skill level 1 (gate: 0 points)
4. T2 gate correctly requires 2 points in branch
5. T5 `exclusiveWith` prevents allocating both choices
6. `npm run build` passes with zero errors
7. Game loads and is fully playable
8. No save migration needed (talent tree data is populated at runtime from code)

**Quick verification code** (can run in browser console):
```javascript
// Check all 7 dagger skills have talent trees
const daggers = ['dagger_stab', 'dagger_blade_flurry', 'dagger_fan_of_knives',
  'dagger_viper_strike', 'dagger_smoke_screen', 'dagger_assassinate', 'dagger_lightning_lunge'];
const store = /* zustand store ref */;
const skills = store.getState().skillDefs || [];
daggers.forEach(id => {
  const s = skills.find(s => s.id === id);
  console.log(id, s?.talentTree ? `${s.talentTree.branches.length} branches` : 'NO TREE');
});
```

---

## Summary

| Step | Description | New/Modified Files | Est. Lines |
|------|-------------|-------------------|------------|
| 1 | Builder factory | `talentTreeBuilder.ts` (NEW) | ~80-100 |
| 2 | Shared data helpers | `dagger_talents.ts` (NEW, start) | ~200-250 |
| 3 | Stab tree (reference) | `dagger_talents.ts` (append) | ~150-200 |
| 4 | Blade Flurry + Frost Fan | `dagger_talents.ts` (append) | ~250-300 |
| 5 | Viper Strike + Shadow Step | `dagger_talents.ts` (append) | ~250-300 |
| 6 | Assassinate + Lightning Lunge | `dagger_talents.ts` (append) | ~250-300 |
| 7 | Barrel + wiring | `talentTrees.ts` (NEW) + `unifiedSkills.ts` (mod) | ~25 |
| 8 | Verification | none | 0 |
| **Total** | | **3 new + 1 modified** | **~1200-1500** |

**Each step builds and verifies independently.**
**Each step can be done in a separate context window.**
**Steps 3-6 follow identical patterns — only the behavior node data differs.**

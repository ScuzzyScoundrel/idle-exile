# Skill Tree Overhaul: v3.1 Talent Trees

> Architecture plan for replacing the current 16-node adjacency-graph skill trees with
> deep talent trees: behavioral filler nodes, proc-forward notables, tensioned keystones,
> and non-uniform tier gating.
>
> **Framework version:** v3.1
> **First weapon:** Dagger (see `docs/weapon-designs/dagger.md` — also serves as template for all weapons)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Design Philosophy (v3.1)](#design-philosophy-v31)
3. [Tree Architecture](#tree-architecture)
4. [Node Types & Specification Format](#node-types--specification-format)
5. [Per-Weapon Design Template](#per-weapon-design-template)
6. [Engine Changes Tracker](#engine-changes-tracker)
7. [Phase 0: Disable Class Talent Trees](#phase-0-disable-class-talent-trees)
8. [Phase 1: Engine Infrastructure](#phase-1-engine-infrastructure)
9. [Phase 2+: Per-Weapon Implementation](#phase-2-per-weapon-implementation)
10. [Backward Compatibility](#backward-compatibility)
11. [Files Modified/Created](#files-modifiedcreated)

---

## Problem Statement

The current weapon skill trees are overtuned:
- **Flat damage nodes** (+3 flat, +5% crit) give more power than gear
- **+5% crit chance** is enormous in our crit system (shocked gives +10% per stack)
- **Keystones claim tradeoffs** ("-35% skill damage") but negate them with global bonuses
  (+15% attack speed to all skills, +5% crit to all skills)
- **Identical templates** across all skills — every B1 is "crit + cast companion on crit",
  every B2 is "poison + cursed", every B3 is "dodge + fortify"
- **Buff skills float** — no branch ownership, so every build takes Lethality
- **Class talent trees** are pure multiplicative power with zero mechanics
  (1.25x damage, `doubleClears: true`)

Trees feel like stat sticks rather than build-defining choices.

## Goal

Replace the 16-node compact trees with v3.1 talent trees that:
1. Use **behavior nodes** as point sinks (2 ranks, conditional mechanics per rank)
2. Gate deeper tiers behind **non-uniform cumulative investment**
3. Create genuine build diversity (specialist vs dual-spec vs generalist)
4. Make notables **proc-forward** (events, not spreadsheet entries)
5. Make keystones **tension with notables** (not extend them)
6. **Assign buffs to branches** (no floating passives)
7. **Remove pure-stat passives** (Lethality → redistributed into notables)
8. Use conditional mechanics, combo enablers, and buff interactions
9. Make each weapon's trees feel unique (no copy-paste templates)
10. Disable class talent trees entirely (they add nothing interesting)

---

## Design Philosophy (v3.1)

### Behavior Nodes: How You Play

Fillers (T1-T4) are **behavioral**. They reference the skill's own hit pattern,
cooldown, cast time, DoT state, or movement. No raw stat sticks. A behavior node
must answer: *"What does the player have to do differently to get value from this?"*

**maxRank: 2.** Rank 1 introduces the mechanic. Rank 2 changes the mechanic qualitatively
(e.g., "max stacks drops from 3→2" or "window extends from 2s→3s"), not just the number.

### Notables: Proc-Forward Anchors

Notables are the mechanical identity of the branch. They lead with a **proc chance or
conditional trigger**, with stats as secondary riders.

The question a notable should answer: *"What exciting thing just happened?"* not
*"What number went up?"*

**Proc pattern types:**

| Pattern | Description | Feel |
|---|---|---|
| **Escalating** | Low base chance, increases per stack/hit | Build momentum, uptime fishing |
| **Gated** | 100% chance, strict condition required | Setup rewards, discipline |
| **Catastrophic** | Very low chance (5-15%), massive payoff | Chase moments, lottery feel |
| **Cooldown** | Resets or reduces a cooldown on condition | Combo enabler, rhythm |
| **State-shift** | Enters a temporary empowered state | Feast/famine, high variance |

### Keystones: Tension, Not Extension

The T7 keystone must **not** be a stronger version of the T6 notable. They should be
in tension — the keystone either weaponizes the notable's mechanic in an unexpected
direction, or replaces it entirely with something more extreme.

**The test:** If you could describe the keystone as "T6 but more," it needs a rewrite.

**Good tension examples:**
- T6 gives Death Mark (+100% next hit) → T7 removes crit damage entirely, crits only
  deliver Marks, Assassinate becomes execute-only finisher
- T6 heals on dodge → T7 removes dodge heal entirely, doubles counter-attack damage
- T6 spreads debuffs on kill → T7 constrains to single debuff type but 3x effect

### Buff Skills Belong to Branches

Each weapon has exactly **2 buff skills** and **0 floating passives**. Each buff belongs
to one branch. Players who invest in a branch naturally want that branch's buff equipped.
The old "Lethality passive" design (stat stick every build takes) is eliminated.

**Rule:** A buff should feel weak or wasted if you haven't invested in its branch.

### Pathing Taxes: Minor Nodes Gate Major Ones

Not every node in the tree should be exciting. Some nodes are **intentional taxes**
— small, unspectacular effects that exist to create meaningful pathing decisions and
prevent players from skipping straight to the powerful stuff.

A tax node isn't punishing if it's neutral-to-ignorable for off-build players and
mildly useful for on-build players. It becomes punishing only if it actively works
against your playstyle.

**Tax node rules:**
- Always a behavior node, never a notable or keystone
- Effect is small but not zero (+1 life on hit, +3% cast speed, minor DoT extension)
- Thematically consistent with the branch even if not powerful
- Never actively hurts an off-build player (boring is fine, anti-synergy is not)

**Example of good vs bad tax:**

| Node | Branch | Off-build player | Verdict |
|---|---|---|---|
| +5 all resist | Shadow Dance | Boring but free defense | Good tax |
| +2% cast speed | Venomcraft | Slightly helpful always | Good tax |
| +3% damage while poisoned | Assassination | Does nothing (no poison) | Acceptable — dead points |
| -10% damage, +20% DoT | Assassination | Actively hurts burst builds | Bad tax |

**Gate structure using taxes:**

T3 has 3 behavior nodes — player picks 2. The unpicked one is effectively a skipped
tax. The T3→T4 gate requires 7 pts, meaning you must invest across T1-T3 before
reaching the T4 notable. You can't skip tiers by cherry-picking only the exciting
nodes — some filler investment is required.

Two players who both reach T4's notable took different paths through T1-T3 and have
slightly different minor bonuses as a result. The tax nodes are what make the paths
feel distinct even before the notable fires.

### The 3-Mechanic Rule

Each skill tree (one skill, one branch) introduces **no more than 3 distinct mechanics**
across its full T1-T7 span. A mechanic is any new concept a player tracks — a stack,
a state, a proc condition, a buff, a threshold.

**Why:** The behavior node system can generate extremely complex trees if unchecked.
A player looking at a Viper Strike / Venomcraft tree shouldn't have to track: poison
stacks, bleed stacks, Venom Frenzy state, DoT tick procs, Toxic Burst procs, AND
a separate execute threshold. That's 6 things. Nobody will engage with that.

**Example (Stab / Assassination):**
1. Puncture stacks (behavior node T1)
2. Predator state (notable T2 — Blade Sense proc)
3. Death Mark (notable T6)

Everything else in the tree either feeds one of those three or is a simple conditional
(+X vs Vulnerable) that doesn't require active tracking.

**Validation rule:** Before finalizing any tree, list its mechanics. If the count
exceeds 3, consolidate — either merge two mechanics or remove one and redistribute
its effect onto an existing mechanic.

### T5 Forced Choice

T5 offers two mutually exclusive keystone choices (`exclusiveWith`):
- **Choice A:** Consistent/controlled — reliable, capped, predictable
- **Choice B:** Risky/high-variance — kill chains, detonations, feast/famine

Both lead to the same T6 and T7. Neither should be obviously dominant.

---

## Tree Architecture

### Points & Budget

```
Points available at level cap:    30
Average per branch (3 branches):  10  (but players can go 14/10/6 or 18/6/6 etc.)
Branch capacity (all nodes):      19
Target fill rate:                 ~53%  ← you cannot have everything
```

### Tier Layout (per branch, per skill)

```
T1  ──  Behavior Node A (0/2)  +  Behavior Node B (0/2)           [gate: 0 pts]
         ↓ requires 2 pts in branch
T2  ──  Notable (0/1)          +  Behavior Node C (0/2)           [gate: 2 pts]
         ↓ requires 4 pts in branch
T3  ──  Behavior Node D (0/2)  +  Behavior Node E (0/2)
     +  Behavior Node F (0/2)  [3 nodes, pick any — divergence]   [gate: 4 pts]
         ↓ requires 7 pts in branch
T4  ──  Notable (0/1)          +  Behavior Node G (0/2)           [gate: 7 pts]
         ↓ requires 10 pts in branch
T5  ──  Keystone Choice A (0/1)  OR  Keystone Choice B (0/1)      [gate: 10 pts]
         ↓ requires 11 pts in branch
T6  ──  Notable (0/1)                                             [gate: 11 pts]
         ↓ requires 12 pts in branch
T7  ──  Keystone (0/1)                                            [gate: 12 pts]
```

### Capacity Math

| Component | Points |
|-----------|--------|
| T1 behavior nodes (2 x 2) | 4 |
| T2 notable + behavior (1 + 2) | 3 |
| T3 behavior nodes (3 x 2) | 6 |
| T4 notable + behavior (1 + 2) | 3 |
| T5 keystone choice (pick 1) | 1 |
| T6 notable | 1 |
| T7 keystone | 1 |
| **Branch capacity** | **19** |
| **Per tree (3 branches)** | **57** |

### Non-Uniform Tier Gates

| Tier | Gate (pts in branch) | Rationale |
|------|---------------------|-----------|
| T1 | 0 | Free entry |
| T2 | 2 | Minimum T1 investment |
| T3 | 4 | T1 full OR T1 partial + T2 notable — real choice |
| T4 | 7 | Spread across T1-T3, forces meaningful T3 investment |
| T5 | 10 | Deep investment before identity fork |
| T6 | 11 | T5 choice + 1 more |
| T7 | 12 | Nearly half total budget — full commitment |

Gate table constant: `TALENT_TIER_GATES = [0, 2, 4, 7, 10, 11, 12]`

### Build Diversity (30 points across 57 capacity)

| Build Style | Split | Depth |
|-------------|-------|-------|
| **Specialist** | 14/10/6 | T7 keystone + T4 + T2 |
| **Dual-spec** | 12/12/6 | T5 in two branches |
| **Generalist** | 10/10/10 | T4 in all three |
| **Hyper-deep** | 18/6/6 | T7 + maxed behavior + T2 splash |

To reach T7 in any branch requires **13 pts** committed (12 for gate + 1 for node).
Two T7 keystones (13+13=26) leaves only 4 points for the third branch — T1 only.
This is intentional: keystone builds are deep, not wide.

All nodes are skill-specific. No nodes are shared between skills.

---

## Node Types & Specification Format

### Behavior Node

```yaml
id: "{skillPrefix}_{branchIndex}_{tier}_{position}"
name: "Node Name"
type: behavior
maxRank: 2
description: "Plain language description"
archetype: "single-hit"     # skill archetype this node was designed for
modifier:
  condition: "onHit | onCrit | onKill | onDodge | whileBuffActive
              | whileDebuffActive | afterConsecutiveHits | vsLowHpEnemy
              | onFirstHit | onDotTick | onChainJump | onStealthChargeConsumed"
  conditionParam: {}         # e.g. { sameTarget: true } or { threshold: 3 }
  effect: {}                 # ONE effect per node
  perRank:
    rank1: {}                # rank 1 introduces the mechanic
    rank2: {}                # rank 2 changes it qualitatively
```

### Notable

```yaml
id: "{skillPrefix}_{branchIndex}_{tier}_{position}"
name: "Notable Name"
type: notable
maxRank: 1
procPattern: "escalating | gated | catastrophic | cooldown | state-shift"
description: "Proc or state-shift leads the description"
modifier:
  procs:                     # LEAD with procs
    - trigger: "onCrit | onHit | onKill | onDodge | ..."
      chance: 0.0
      conditionParam: {}
      effect: {}
  stats: {}                  # secondary riders only
  debuffInteraction: {}
  conditionalMods: []
```

### Keystone Choice (T5)

```yaml
id: "{skillPrefix}_{branchIndex}_5_{position}"
name: "Choice Name"
type: keystoneChoice
maxRank: 1
description: "Sub-identity within branch"
modifier: {}
exclusiveWith: ["{other_choice_id}"]
# One choice: consistent/controlled
# Other choice: risky/high-variance
# Both lead to same T6 and T7
```

### Keystone (T7)

```yaml
id: "{skillPrefix}_{branchIndex}_7_0"
name: "KEYSTONE NAME"
type: keystone
maxRank: 1
description: "Build-defining identity shift"
tradeoff: "Permanent, meaningful cost"
tensionWith: "{t6_notable_id}"
modifier: {}
antiSynergy: []    # node IDs or mechanics this conflicts with
synergy: []        # node IDs or mechanics this rewards
```

---

## Per-Weapon Design Template

`[TEMPLATE]` — What each weapon design doc (`docs/weapon-designs/{weapon}.md`) must contain:

1. **Current skill reference table** — IDs, stats, tags from engine
2. **Skill behavior archetypes** — archetype tags per skill
3. **3 branch themes** — identity, fantasy, core mechanic, progression arc
4. **Buff assignments** — which branch owns which buff, with rationale
5. **Passive removal/redistribution** — if applicable, what was removed and where effects went
6. **Branch notables (T2 + T4)** — with procPattern tags and YAML specs
7. **Full reference tree for 1 skill** — complete T1-T7 for the most representative skill
8. **T5-T7 branch definitions** — keystone choices, T6 notables, T7 keystones with tension docs
9. **Behavior node template selections** — per skill x branch template mapping
10. **Build path examples** — at least 3 showing specialist/dual-spec/generalist
11. **3-mechanic rule validation** — per skill x branch
12. **Behavior node template library** — reference section
13. **Validation checklist** — per-node checklist

Items 12-13 are identical across all weapon docs (copy from dagger.md).

---

## Engine Changes Tracker

Comprehensive list of every engine addition needed, organized by priority. Updated as
new weapons introduce new mechanics.

### P0 — Required for ANY talent tree to work

These must be implemented before any weapon can use the talent tree system.

| Mechanic | Description | Effort | Location |
|----------|-------------|--------|----------|
| **TalentNode type** | `nodeType: 'behavior' \| 'notable' \| 'keystoneChoice' \| 'keystone'` | Types only | `src/types/index.ts` |
| **TalentBranch type** | Branch container with nodes array | Types only | `src/types/index.ts` |
| **TalentTree type** | Tree container with 3 branches | Types only | `src/types/index.ts` |
| **allocatedRanks** | `Record<string, number>` on SkillProgress | Types + migration | `src/types/index.ts` |
| **talentTree.ts engine** | Pure functions: allocation, gating, resolution | ~200 lines | `src/engine/talentTree.ts` (NEW) |
| **Non-uniform tier gates** | Gate table `[0, 2, 4, 7, 10, 11, 12]` instead of uniform 3-per-tier | ~20 lines | `src/engine/talentTree.ts` |
| **Mutual exclusion** | `exclusiveWith?: string[]` on TalentNode, validate in `canAllocateTalentRank` | ~10 lines | `src/engine/talentTree.ts` |
| **Rank-specific modifiers** | `perRankModifiers?: { [rank: number]: SkillModifier }` — look up rank, don't multiply | ~50 lines | `src/engine/talentTree.ts` |
| **whileBuffActive condition** | Check `buffId` in `activeTempBuffIds` in `evaluateCondition()` | ~10 lines | `src/engine/combatHelpers.ts` |
| **consumeBuff condition** | Remove matching buff + apply bonus in combat tick | ~20 lines | `src/engine/combatHelpers.ts` |
| **Save migration v43** | Reset allocations, remove Lethality from skillBar, init allocatedRanks | ~30 lines | `src/store/gameStore.ts` |
| **TalentTreeView UI** | 3-column layout, tier rows, rank indicators, gate locks | ~300 lines | `src/ui/components/TalentTreeView.tsx` (NEW) |
| **Wire into skill system** | `getSkillGraphModifier()` checks `talentTree` first, falls back to graph | ~20 lines | `src/engine/unifiedSkills.ts` |

### P1 — Required for Dagger (first weapon)

These are needed for mechanics referenced in the dagger talent trees.

| Mechanic | Description | Effort | Used By |
|----------|-------------|--------|---------|
| **Same-target consecutive hits** | `lastHitMobTypeId: string` in GameState, compare before incrementing `consecutiveHits` | ~15 lines in tickCombat | Tunnel Vision, Blade Sense, Lethal Rhythm |
| **critsDoNoBonusDamage** | `boolean` on SkillModifier, crit mult set to 0 in damage calc | ~5 lines | DEATHBLOW |
| **critChanceCap** | `number` on SkillModifier, clamp in `calcSkillDps` | ~5 lines | Precision Killer |
| **executeOnly** | `boolean` + `hpThreshold` on SkillModifier, prevents skill activation above threshold | ~20 lines | DEATHBLOW (Assassinate) |
| **castPriority** | `'execute' \| 'normal'` on skill, execute-priority skills jump queue in auto-cast | ~30 lines in `rollSkillCast` | DEATHBLOW |
| **Internal cooldowns (ICD)** | `lastProcTriggerAt: Record<string, number>` in GameState, check ICD before proc fires | ~60 lines | Deep Wounds (Venom Frenzy), Ghost Step (Shadow Form) |
| **Per-debuff stack threshold** | `debuffId` + `threshold` on `whileDebuffActive` condition | ~10 lines | Envenom (Toxic Burst), Deep Wounds |
| **resetCooldown: 'self'** | Resolve `'self'` to current skill ID in proc evaluation | ~5 lines | Shadow Guard |
| **On-kill free cast** | `freeCastUntil` state per skill — next cast costs no CD within window | ~40 lines | Relentless Pursuit |

### P2 — Required for specific skill archetypes (implement when specced)

These are needed when those skills' unique T5-T7 tiers are fully designed.

| Mechanic | Description | Effort | Skills Needing It |
|----------|-------------|--------|-------------------|
| **Per-individual-hit proc** | Procs roll once per hit in multi-hit skills (loop over hitCount) | ~80 lines | Blade Flurry |
| **DoT tick proc triggers** | Hook into DoT tick loop to fire proc evaluation | ~100 lines | Viper Strike |
| **DoT expiry burst** | Track DoT expiration, fire burst event | ~80 lines | Viper Strike |
| **Per-chain-jump effects** | Track per-jump damage/effect modifications | ~60 lines | Lightning Lunge |
| **AoE target count** | Count enemies hit in AoE cast | ~40 lines | Frost Fan |
| **Buff lifecycle triggers** | onApply/onExpire events for buff state changes | ~80 lines | Flurry → Momentum payoff |
| **Dodge-within-window counting** | `consecutiveDodges` counter + window tracking | ~50 lines | Ghost Step (Shadow Form) |
| **Cast-time investment scaling** | Bonus scales with cast time before release | ~40 lines | Assassinate |
| **Combo state tracking** | Cast within Xs of last cast detection | ~40 lines | Blade Flurry |
| **Stack detonation** | Consume all stacks of a debuff for instant burst damage | ~60 lines | Volatile Toxins (T5) |
| **Single debuff slot constraint** | Only one debuff type active per target | ~40 lines | PLAGUE LORD (T7) |

### Engine Feasibility Summary

| Category | Count | Lines (est.) |
|----------|-------|-------------|
| **Works today** (no changes) | 11 mechanics | 0 |
| **P0** (any tree) | 13 items | ~660 lines |
| **P1** (dagger) | 9 items | ~190 lines |
| **P2** (deferred) | 11 items | ~670 lines |

**What works today with zero engine changes:**
- Conditional mods (onCrit, onKill, whileDebuffActive)
- Proc evaluation (castSkill, resetCooldown, applyBuff/Debuff)
- Debuff interactions (bonusDamageVsDebuffed, spread, consume)
- Fortify on hit, leech, life on hit/kill
- Temp buffs with duration
- Cooldown resets via procs
- Ramping damage with decay
- Charge system (gain/spend/decay)
- Extra hits / chain / pierce / fork
- Execute threshold (existing `executeThreshold` field)
- Consecutive hits (global, not per-target)

---

## Phase 0: Disable Class Talent Trees

### 0.1 Remove UI rendering
- `src/ui/screens/CharacterScreen.tsx` — Remove `ClassTalentPanel` import and render

### 0.2 Neutralize effect resolution
- `src/store/gameStore.ts` — In `getFullEffect()`, replace
  `aggregateClassTalentEffect(state.character.class, state.talentAllocations)` with `{}`

### 0.3 Disable allocation actions
- `src/store/gameStore.ts` — Add early returns to `allocateTalentNode` and `respecTalents`

### 0.4 Save migration v43
- Bump version 42→43
- `raw.talentAllocations = []`

---

## Phase 1: Engine Infrastructure

### 1.1 New Types (`src/types/index.ts`)

```ts
interface TalentNode {
  id: string;
  name: string;
  description: string;
  nodeType: 'behavior' | 'notable' | 'keystoneChoice' | 'keystone';
  maxRank: number;              // 1 or 2
  tier: number;                 // 1-7
  branchIndex: number;          // 0-2
  position: number;             // 0-2 (within tier)
  modifier: SkillModifier;      // base modifier
  perRankModifiers?: {          // rank-specific effects (behavior nodes)
    [rank: number]: SkillModifier;
  };
  exclusiveWith?: string[];     // T5 mutual exclusion
  requiresNodeId?: string;      // specific prereq at maxRank
  procPattern?: string;         // escalating | gated | catastrophic | cooldown | state-shift
  tensionWith?: string;         // T7 → T6 notable ID
  antiSynergy?: string[];       // nodes this conflicts with
  synergy?: string[];           // nodes this rewards
}

interface TalentBranch {
  id: string;
  name: string;
  description: string;
  nodes: TalentNode[];          // 10 nodes per branch (T1-T7)
}

interface TalentTree {
  skillId: string;
  branches: [TalentBranch, TalentBranch, TalentBranch];
  maxPoints: number;            // 30
}
```

Additions to existing types:
- Add `talentTree?: TalentTree` to `SkillDef`
- Add `allocatedRanks?: Record<string, number>` to `SkillProgress`
- Add `'whileBuffActive' | 'consumeBuff'` to `TriggerCondition` union
- Add `buffId?: string` to `ConditionalModifier`
- Add `critsDoNoBonusDamage?: boolean` to `SkillModifier`
- Add `critChanceCap?: number` to `SkillModifier`
- Add `executeOnly?: { hpThreshold: number; bonusDamage: number }` to `SkillModifier`
- Add `castPriority?: 'execute' | 'normal'` to `SkillDef`
- Add `internalCooldown?: number` to `SkillProcEffect`

### 1.2 Balance Constants (`src/data/balance.ts`)

- `SKILL_MAX_LEVEL`: 20 → 30
- `TALENT_TIER_GATES = [0, 2, 4, 7, 10, 11, 12]` (non-uniform)
- XP curve `100 * 1.15^(level-1)` extends naturally — no formula change

### 1.3 Talent Tree Engine (NEW: `src/engine/talentTree.ts`)

Pure functions (follows `src/engine/skillGraph.ts` pattern):

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getBranchPoints` | `(tree, branchIdx, ranks) → number` | Total points spent in a branch |
| `getTotalAllocatedPoints` | `(ranks) → number` | Total points across all branches |
| `canAllocateTalentRank` | `(tree, ranks, nodeId, level) → boolean` | Tier gating + prereq + rank + level + exclusion checks |
| `allocateTalentRank` | `(ranks, nodeId) → Record<string, number>` | Returns new ranks record |
| `respecTalentRanks` | `() → {}` | Returns empty record |
| `getTalentRespecCost` | `(level) → number` | `50 * level^2` |
| `resolveTalentModifiers` | `(tree, ranks) → ResolvedSkillModifier` | Same output type as graph resolver |

**Resolver rules:**
- **Behavior nodes (maxRank: 2):** If `perRankModifiers` exists, look up `perRankModifiers[currentRank]` — NOT `modifier * rank`. This enables qualitative rank differences.
- **Fallback:** If no `perRankModifiers`, additive fields `+= modifier.field * rank`
- **Notables/keystones (maxRank: 1):** Apply modifier directly (no rank multiplication)
- **Binary mechanics** (procs, conditionals): applied once (maxRank: 1 only)
- Returns same `ResolvedSkillModifier` → existing combat pipeline unchanged

**Gate validation in `canAllocateTalentRank`:**
```
1. Node exists in tree
2. Current rank < maxRank
3. Player level >= total allocated + 1
4. Branch points >= TALENT_TIER_GATES[node.tier - 1]
5. If requiresNodeId: that node is at maxRank
6. If exclusiveWith: no exclusive node has rank > 0
```

### 1.4 Talent Tree Builder (NEW: `src/data/skillGraphs/talentTreeBuilder.ts`)

Factory: `createTalentTree(config)` — generates node IDs from prefix + branch/tier/position.

Config supports:
- Per-skill branch configs (notables + behavior nodes)
- Per-skill behavior nodes (tiers 1-4)
- Per-skill unique nodes (tiers 5-7)
- Same compositional pattern as existing `createCompactTree()` but for v3.1 layout

### 1.5 Wire Into Skill System

- `src/engine/unifiedSkills.ts` — `getSkillGraphModifier()` checks `skill.talentTree` +
  `progress.allocatedRanks` first, falls back to `skill.skillGraph` + `progress.allocatedNodes`
- `src/engine/unifiedSkills.ts` — `aggregateGraphGlobalEffects()` same pattern
- `src/data/unifiedSkills.ts` — Wire `ALL_TALENT_TREES[s.id]` into `talentTree` field

**Key insight:** Both systems produce `ResolvedSkillModifier`, so ALL combat code
(`tickCombat`, conditionals, procs, debuffs, fortify, ramping, etc.) works unchanged.

### 1.6 P1 Engine Additions (Dagger-specific)

These are the P1 items from the engine tracker, implemented alongside the core:

**In `src/store/gameStore.ts` (tickCombat):**
- Same-target consecutive hit tracking: `lastHitMobTypeId` comparison
- `freeCastUntil` state per skill: on-kill free cast window
- `castPriority: 'execute'` queue jump in `rollSkillCast`

**In `src/engine/combatHelpers.ts`:**
- `critsDoNoBonusDamage` check: crit mult → 0 when flag set
- `critChanceCap` clamp: cap crit chance before roll
- `executeOnly` validation: prevent skill use above HP threshold
- Per-debuff stack threshold: `{ debuffId, threshold }` in `whileDebuffActive`
- `resetCooldown: 'self'` resolution

**In `src/store/gameStore.ts` (proc evaluation):**
- Internal cooldowns: `lastProcTriggerAt` check before firing

### 1.7 Store Actions (`src/store/gameStore.ts`)

- `allocateAbilityNode`: Add talent tree path — check `talentTree`,
  call `canAllocateTalentRank`/`allocateTalentRank`, update `progress.allocatedRanks`
- `respecAbility`: Add talent tree respec path — reset `allocatedRanks`, keep XP/level

### 1.8 Save Migration v43

```
version 42 → 43:
- talentAllocations = []              (disable class trees)
- For all skillProgress entries:
  - allocatedNodes = []               (reset old graphs — node IDs invalid)
  - allocatedRanks = {}               (init new talent tracking)
  - Keep xp + level                   (no progress lost)
- Scan skillBar: null any slot containing 'dagger_lethality'
```

### 1.9 UI: TalentTreeView (NEW: `src/ui/components/TalentTreeView.tsx`)

Replaces `SkillGraphView.tsx` for skills with `talentTree`. Old component stays for
unmigrated weapons.

**Layout:**
- 3-column layout (one per branch), branch name at top
- 7 tier rows per column, 1-3 nodes per row
- Node visuals: rank indicator ("1/2"), color by type:
  - Gray: behavior node
  - Blue: notable
  - Purple: keystone choice
  - Gold: keystone
- Tier gate lock icons when insufficient branch points
- T3: show all 3 nodes with "pick 2 of 3" hint
- T5: show mutual exclusion indicator
- Header: branch name, points spent / capacity
- Footer: total spent / skill level, respec button
- Tooltip: full description, requirements, current/max rank, proc patterns

**Integration:**
- `src/ui/components/SkillPanel.tsx` — Render `TalentTreeView` when `skill.talentTree` exists

---

## Phase 2+: Per-Weapon Implementation

Each weapon is its own sprint. First weapon: **Dagger**.

### Per-Weapon Deliverables

1. Design doc: `docs/weapon-designs/{weapon}.md` (following template in section 5)
2. Implementation: `src/data/skillGraphs/{weapon}_talents.ts`
3. Register in `src/data/skillGraphs/talentTrees.ts`

### Dagger-Specific Notes

- Implement from `docs/weapon-designs/dagger.md` (v3.1 aligned)
- Full Stab/Assassination tree specced — others use template selections
- Remove `dagger_lethality` from skill definitions
- Buff assignments: Stealth → Assassination, Flurry → Shadow Dance
- Need full T5-T7 specs for remaining 6 skills before implementing those trees

### Execution Order

```
DONE: Dagger design doc (docs/weapon-designs/dagger.md) — v3.1 aligned
NEXT: Spec remaining 6 dagger skills' T5-T7 (iteratively, one per archetype first)
THEN: Phase 0 (disable class trees)
THEN: Phase 1 (engine infrastructure + P1 dagger mechanics)
THEN: Phase 2 (implement dagger talent trees from design doc)
THEN: Next weapon design docs (sword, axe, etc.)
```

### Deferred Engine Work (implement when needed)

| Mechanic | Needed For | Priority |
|----------|-----------|----------|
| DoT tick procs | Viper Strike trees | P2 |
| DoT expiry bursts | Viper Strike trees | P2 |
| Per-chain-jump effects | Lightning Lunge trees | P2 |
| AoE target count | Frost Fan trees | P2 |
| Buff lifecycle triggers | Flurry → Momentum payoff | P2 |
| Dodge-within-window counting | Shadow Form (Ghost Step) | P2 |
| Per-individual-hit procs | Blade Flurry trees | P2 |
| Cast-time investment scaling | Assassinate trees | P2 |
| Combo state tracking | Blade Flurry trees | P2 |

---

## Backward Compatibility

- Old `SkillGraph` + `allocatedNodes` stays intact
- Skills without `talentTree` use old system (all non-Dagger weapons at first)
- `getSkillGraphModifier()` checks talent tree first, falls back to graph
- Migration resets all allocations (players keep XP/level, same as v29, v36 migrations)
- Zero combat engine changes — both systems produce `ResolvedSkillModifier`

---

## Files Modified/Created

| File | Action |
|------|--------|
| `src/types/index.ts` | Add TalentNode/Branch/Tree types, update SkillDef/SkillProgress/TriggerCondition/SkillModifier |
| `src/data/balance.ts` | SKILL_MAX_LEVEL 20→30, add TALENT_TIER_GATES |
| `src/engine/talentTree.ts` | **NEW** — talent tree pure functions |
| `src/engine/combatHelpers.ts` | Add whileBuffActive/consumeBuff, critsDoNoBonusDamage, critChanceCap, per-debuff threshold |
| `src/engine/unifiedSkills.ts` | Update getSkillGraphModifier + aggregateGraphGlobalEffects for talent tree path |
| `src/data/skillGraphs/talentTreeBuilder.ts` | **NEW** — v3.1 tree factory |
| `src/data/skillGraphs/talentTrees.ts` | **NEW** — barrel export |
| `src/data/skillGraphs/dagger_talents.ts` | **NEW** — first weapon implementation |
| `src/data/unifiedSkills.ts` | Wire talentTree field |
| `src/store/gameStore.ts` | Allocation actions, P1 mechanics (ICD, executeOnly, castPriority, freeCast), migration v43 |
| `src/ui/components/TalentTreeView.tsx` | **NEW** — v3.1 tree UI |
| `src/ui/components/SkillPanel.tsx` | Route TalentTreeView vs SkillGraphView |
| `src/ui/screens/CharacterScreen.tsx` | Remove ClassTalentPanel |

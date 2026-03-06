# Dagger Weapon — Talent Tree Design (v4.0)

> Canonical design document for all dagger skill talent trees.
> Uses the v3.1 framework. See `docs/SKILL_TREE_OVERHAUL.md` for architecture overview.
>
> **v4.0 migration:** Branch-level notables and keystones have been replaced with
> **per-skill unique versions**. Each skill's full tree (39 nodes) lives in its own
> JSON file in this directory. This README contains the shared framework, themes,
> build examples, templates, and validation rules.
>
> **Changelog:** v2 -> v3 (proc-forward notables, tensioned keystones, 53% fill rate) ->
> v3.1 (buff branch ownership, Lethality removed, 3-mechanic rule, pathing taxes) ->
> v3.2 (gate progression fix `[0,2,4,7,10,11,12]`, DEATHBLOW reworked to 25% HP execute,
> full behavior node specs for all 7 skills x 3 branches, Counter Stance revision) ->
> v4.0 (per-skill unique notables/keystones, JSON file structure, directory migration).

---

## Table of Contents

1. [Current Dagger Skills (Reference)](#1-current-dagger-skills-reference)
2. [Branch Themes](#2-branch-themes)
3. [Buff & Passive Assignments](#3-buff--passive-assignments)
4. [Tree Structure](#4-tree-structure)
5. [File Structure](#5-file-structure)
6. [JSON Schema](#6-json-schema)
7. [Build Path Examples](#7-build-path-examples)
8. [3-Mechanic Rule Validation](#8-3-mechanic-rule-validation)
9. [Behavior Node Template Library (Reference)](#9-behavior-node-template-library-reference)
10. [Validation Checklist](#10-validation-checklist)
11. [Generation Instructions](#11-generation-instructions)

---

## 1. Current Dagger Skills (Reference)

`[TEMPLATE]` -- Every weapon doc starts with the current skill table from the engine.

### Active Skills

| ID | Name | Base Dmg | Wpn% | CD | Cast | Tags | Special |
|----|------|----------|------|----|------|------|---------|
| `dagger_stab` | Stab | 0 | 1.0 | 3s | 0.8s | Phys, Melee | Basic attack |
| `dagger_blade_flurry` | Blade Flurry | 0 | 0.4 | 4s | 0.9s | Phys, Melee | 3 hits |
| `dagger_fan_of_knives` | Frost Fan | 4 | 0.6 | 5s | 1.0s | Cold, AoE, Proj | -- |
| `dagger_viper_strike` | Viper Strike | 2 | 0.7 | 5s | 0.9s | Chaos, Melee, DoT | DoT: 5s, 25% |
| `dagger_smoke_screen` | Shadow Step | 2 | 0.7 | 5s | 1.0s | Chaos, Melee | -- |
| `dagger_assassinate` | Assassinate | 12 | 2.2 | 8s | 1.4s | Phys, Melee | Big hit |
| `dagger_lightning_lunge` | Lightning Lunge | 3 | 0.65 | 4s | 0.7s | Lightning, Melee | Fastest |

### Skill Behavior Archetypes

| Skill | Archetype(s) | Natural Mechanics |
|---|---|---|
| **Stab** | `single-hit`, `fast-cd` | Per-hit stacks, consecutive hit state |
| **Blade Flurry** | `multi-hit`, `combo` | Per-hit-within-cast scaling, hit count threshold |
| **Frost Fan** | `aoe`, `projectile`, `cold` | Target count, pierce count, chill state |
| **Viper Strike** | `dot`, `chaos`, `melee` | DoT stack count, DoT tick events |
| **Shadow Step** | `chaos`, `melee`, `stealth-synergy` | Stealth charge state, buff consumption |
| **Assassinate** | `single-hit`, `long-cd`, `big-hit` | Cooldown duration, cast time, HP thresholds |
| **Lightning Lunge** | `chain`, `lightning`, `fast-cast` | Chain count, shock state, movement |

### Buff Skills

| ID | Name | Branch Owner | Duration | CD | Effect |
|----|------|-------------|----------|----|--------|
| `dagger_shadow_strike` | Stealth | Assassination | 15s (or 3 charges) | 50s | +40% damage, +25% crit chance per charge |
| `dagger_flurry` | Flurry | Shadow Dance | 8s | 40s | 2x attack speed; Momentum stacks on expire (+8% dmg/stack) |

### Removed Skills

| ID | Name | Status | Reason |
|----|------|--------|--------|
| `dagger_lethality` | Lethality | **REMOVED** | Effects redistributed into branch notables. A passive every build takes is a tax, not a choice. |

---

## 2. Branch Themes

`[TEMPLATE]` -- 3 branch themes with identity, fantasy, and core mechanic.

| Branch | Theme | Fantasy | Core Mechanic |
|--------|-------|---------|---------------|
| **Assassination** | Crit, burst, execute | "Set up the kill, one perfect strike" | Crit scaling -> Vulnerable exploitation -> execute payoffs |
| **Venomcraft** | Poison, DoT, debuffs | "Death by a thousand cuts, slow inevitable doom" | Poison application -> debuff stacking -> DoT payoffs |
| **Shadow Dance** | Evasion, defense, combos | "In and out unseen, every dodge is an opportunity" | Sustain + defense -> dodge/block procs -> rhythm triggers |

### Branch Progression Arcs

**Assassination:** T1-T2 build crit stats + skill-specific hit setup -> T3-T4 add
Vulnerable application and exploitation -> T5 consistent vs risky crit fork ->
T6 skill-specific catastrophic proc -> T7 transforms skill identity with meaningful tradeoff.

**Venomcraft:** T1-T2 build poison application + DoT state awareness -> T3-T4 add
stack thresholds and state-shift -> T5 poison ceiling vs poison spread fork ->
T6 skill-specific debuff spread/detonation -> T7 constraining keystone that tensions with T6.

**Shadow Dance:** T1-T2 build defense + sustain baseline -> T3-T4 add dodge-triggered
mechanics + empowered state -> T5 burst recovery vs sustained counter fork ->
T6 skill-specific dodge counter-attack -> T7 removes defense for offense, tensions with T6.

### Notable -> Keystone Tension Pattern

| Branch | T6 Role | T7 Tension Pattern |
|---|---|---|
| **Assassination** | Catastrophic proc -- dramatic "thing happened" moment | Removes a comfort, weaponizes T6's proc in unexpected direction |
| **Venomcraft** | Gated debuff spread/detonation on kill/threshold | Constrains to depth over breadth, tensions with T6's spread |
| **Shadow Dance** | Cooldown proc for counter-attack on dodge | Removes defensive heal, doubles offensive dodge power |

**The pattern:** T6 gives you a new tool. T7 takes away a comfort and makes the tool
your only source of that power. Players who take T7 are committing to a specific
mechanical loop, not just getting more damage.

---

## 3. Buff & Passive Assignments

`[TEMPLATE]` -- Which branch owns which buff, why, and what was removed.

### Design Rule

Each weapon has exactly **2 buff skills** and **0 floating passives**. Each buff
belongs to one of the 3 branches. A buff should feel weak or wasted if you haven't
invested in its branch. A player deep in that branch should feel like the buff was
designed specifically for them.

### Stealth -> Assassination Branch

**Current ID:** `dagger_shadow_strike`

**Effect:** Gain Stealth (3 charges, 15s duration). Next 3 attacks from Stealth deal
+40% damage and have +25% crit chance. Each attack consumes 1 charge. When all charges
consumed, Stealth ends.

**Why Assassination:** Stealth is deeply integrated with crit, burst, and charge
consumption patterns. Assassination behavior nodes reference
`whileBuffActive: 'dagger_shadow_strike'` and `onStealthChargeConsumed` conditions.
Taking Stealth without Assassination investment wastes its crit synergy.

### Flurry -> Shadow Dance Branch

**Current ID:** `dagger_flurry`

**Effect:** 2x attack speed for 8s. Each hit during Flurry stacks Momentum (max 5).
When Flurry expires, next skill cast consumes all Momentum stacks for +8% damage per
stack.

**Why Shadow Dance:** Attack speed as a dodge/combo rhythm tool fits the defensive
identity. Shadow Dance behavior nodes reference `whileBuffActive: 'dagger_flurry'`
for rhythm windows. The Momentum-on-expire payoff rewards timing your buff around
dodge windows.

### Lethality (Passive) -> REMOVED

**Old effect:** +25% crit damage. Crits vs poisoned enemies apply +2 extra poison stacks.

**Why removed:** A passive every build takes is a tax, not a choice. Effects
redistributed:
- +crit damage -> Assassination behavior nodes (Honed Instincts at T2)
- Crits vs poisoned -> Venomcraft notable
- Execute aura -> Assassination T6 system

**Migration note:** Save v42 must scan `skillBar` for `dagger_lethality` and null
those slots.

---

## 4. Tree Structure

`[TEMPLATE]` -- Identical structure for all weapons. Included here for completeness.

### Tier Layout (per branch, per skill)

```
T1  --  Behavior Node A (0/2)  +  Behavior Node B (0/2)           [gate: 0 pts]
         | requires 2 pts in branch
T2  --  Notable (0/1)          +  Behavior Node C (0/2)           [gate: 2 pts]
         | requires 4 pts in branch
T3  --  Behavior Node D (0/2)  +  Behavior Node E (0/2)
     +  Behavior Node F (0/2)  [3 nodes, pick any -- divergence]   [gate: 4 pts]
         | requires 7 pts in branch
T4  --  Notable (0/1)          +  Behavior Node G (0/2)           [gate: 7 pts]
         | requires 10 pts in branch
T5  --  Keystone Choice A (0/1)  OR  Keystone Choice B (0/1)      [gate: 10 pts]
         | requires 11 pts in branch
T6  --  Notable (0/1)                                             [gate: 11 pts]
         | requires 12 pts in branch
T7  --  Keystone (0/1)                                            [gate: 12 pts]
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
| **Player points (avg per branch)** | **10** |
| **Fill rate** | **~53%** |
| **Points per full tree (3 branches)** | **57 capacity / 30 available** |

### Non-Uniform Gates

| Gate | Points Required | Why |
|------|----------------|-----|
| T1 | 0 | Free entry |
| T2 | 2 | One T1 node at rank 1 minimum |
| T3 | 4 | T1 full OR T1 partial + T2 notable -- real choice |
| T4 | 7 | Spread across T1-T3, forces meaningful T3 investment |
| T5 | 10 | Deep investment before identity fork |
| T6 | 11 | T5 choice + 1 more |
| T7 | 12 | Full commitment -- nearly half total budget |

Gates enforce **minimum investment thresholds**, not tier exhaustion. You can skip
the T2 notable and still reach T3 (pure behavior-node path), or skip T2 behavior
and just take the notable (notable-first path). Two players reaching T4 may have
taken genuinely different routes through T1-T3.

### Node Types

| Type | maxRank | Role |
|------|---------|------|
| `behavior` | 2 | Behavioral filler -- changes HOW you play. Rank 2 changes the mechanic, not just numbers. |
| `notable` | 1 | Proc-forward anchor -- proc or state-shift leads the description. |
| `keystoneChoice` | 1 | T5 fork -- one consistent/controlled, one risky/high-variance. Mutually exclusive (`exclusiveWith`). |
| `keystone` | 1 | T7 build-definer -- tensions with T6 notable, permanent meaningful tradeoff. |

---

## 5. File Structure

Each skill's complete 39-node tree (3 branches x 13 nodes) is stored in its own JSON file:

```
docs/weapon-designs/dagger/
  README.md                   # This file -- framework, themes, validation rules
  stab.json                   # 39 nodes (Stab -- single-hit, fast-cd)
  blade-flurry.json           # 39 nodes (Blade Flurry -- multi-hit, combo)
  frost-fan.json              # 39 nodes (Frost Fan -- aoe, projectile, cold)
  viper-strike.json           # 39 nodes (Viper Strike -- dot, chaos, melee)
  shadow-step.json            # 39 nodes (Shadow Step -- chaos, melee, stealth)
  assassinate.json            # 39 nodes (Assassinate -- single-hit, long-cd, big-hit)
  lightning-lunge.json        # 39 nodes (Lightning Lunge -- chain, lightning, fast-cast)
```

### What lives where

| Content | Location |
|---------|----------|
| Branch themes, buff assignments, tree structure | This README |
| Build path examples, validation rules, templates | This README |
| Per-skill behavior nodes (T1a, T1b, T2b, T3a-c, T4b) | `{skill}.json` |
| Per-skill notables (T2, T4, T6) | `{skill}.json` |
| Per-skill keystone choices (T5A, T5B) | `{skill}.json` |
| Per-skill keystones (T7) | `{skill}.json` |

### Why per-skill files?

The v3.2 framework stated every node should be unique per skill, but the actual
content only defined notables/keystones once per branch -- shared identically across
all 7 skills. This meant all skills shared the same Blade Sense, Exploit Weakness,
Death Mark, DEATHBLOW, etc., defeating build diversity.

With per-skill files:
- Each skill's notables interact with its natural mechanics (hit pattern, DoT, chains, etc.)
- No two skills share the same notable/keystone name or effect within a branch
- Build identity comes from BOTH your skill choice AND your branch investment

---

## 6. JSON Schema

### Per-Skill File

```json
{
  "skillId": "dagger_stab",
  "skillName": "Stab",
  "archetypes": ["single-hit", "fast-cd"],
  "branches": [
    {
      "branchIndex": 0,
      "branchName": "Assassination",
      "nodes": [ /* 13 nodes: T1a, T1b, T2, T2b, T3a, T3b, T3c, T4, T4b, T5A, T5B, T6, T7 */ ]
    },
    {
      "branchIndex": 1,
      "branchName": "Venomcraft",
      "nodes": [ /* 13 nodes */ ]
    },
    {
      "branchIndex": 2,
      "branchName": "Shadow Dance",
      "nodes": [ /* 13 nodes */ ]
    }
  ]
}
```

### Behavior Node Schema

```json
{
  "id": "st_0_1_0",
  "name": "Puncture",
  "slot": "T1a",
  "tier": 1,
  "position": 0,
  "type": "behavior",
  "maxRank": 2,
  "description": "Each Stab hit adds a Puncture stack (max 3). At 3 stacks: next Stab is a guaranteed crit. Resets on stack use.",
  "rank2": "Max stacks reduced to 2 (faster cycle, less setup).",
  "modifier": {
    "condition": "onHit",
    "effect": { "addStack": "puncture", "maxStacks": 3, "atMax": { "guaranteedCrit": true } },
    "perRank": {
      "1": { "maxStacks": 3 },
      "2": { "maxStacks": 2 }
    }
  },
  "designNotes": "STACK_BUILDER template. Rewards patient stacking with guaranteed crit payoff."
}
```

### Notable Schema (T2, T4, T6)

```json
{
  "id": "st_0_2_0",
  "name": "Blade Sense",
  "slot": "T2",
  "tier": 2,
  "position": 0,
  "type": "notable",
  "maxRank": 1,
  "procPattern": "escalating",
  "description": "10% chance on hit to enter Predator state: +50% crit mult for 3s. Chance increases by 4% per consecutive hit on same target (max 30%). Resets on target switch.",
  "statsRider": "+10% crit chance.",
  "modifier": {
    "procs": [
      {
        "trigger": "onHit",
        "chance": 0.10,
        "conditionParam": { "sameTarget": true, "perStack": 0.04, "maxChance": 0.30 },
        "applyBuff": {
          "buffId": "predator",
          "effect": { "incCritMultiplier": 50 },
          "duration": 3
        }
      }
    ],
    "stats": { "incCritChance": 10 }
  },
  "designNotes": "Escalating proc rewards Stab's fast consecutive hits."
}
```

### Keystone Choice Schema (T5)

```json
{
  "id": "st_0_5_0",
  "name": "Precision Killer",
  "slot": "T5A",
  "tier": 5,
  "position": 0,
  "type": "keystoneChoice",
  "maxRank": 1,
  "style": "consistent",
  "description": "Crits on Vulnerable targets have 30% chance to cast a free Stab instantly. Your crit chance cannot exceed 60% (cap -- reliability ceiling).",
  "modifier": {
    "procs": [
      {
        "trigger": "onCrit",
        "chance": 0.30,
        "conditionParam": { "whileDebuffActive": "vulnerable" },
        "castSkill": "dagger_stab"
      }
    ],
    "critChanceCap": 60
  },
  "exclusiveWith": ["st_0_5_1"]
}
```

### Keystone Schema (T7)

```json
{
  "id": "st_0_7_0",
  "name": "DEATHBLOW",
  "slot": "T7",
  "tier": 7,
  "position": 0,
  "type": "keystone",
  "maxRank": 1,
  "description": "Assassinate transforms into an execute-only finisher: 500% weapon damage to enemies below 25% HP. Assassinate has highest cast priority. Assassinate CANNOT be used above 25% HP. Crits no longer deal bonus damage -- crits ONLY trigger Death Mark. -20% base Stab damage.",
  "modifier": {
    "executeOnly": { "hpThreshold": 25, "bonusDamage": 500 },
    "castPriority": "execute",
    "critsDoNoBonusDamage": true,
    "incDamage": -20
  },
  "tensionWith": "st_0_6_0",
  "tensionDescription": "T6 makes Death Mark a +100% damage amplifier on next hit. T7 removes crit damage and transforms Assassinate into a pure execute finisher. Crits become a Mark delivery system.",
  "antiSynergy": ["st_0_2_0"],
  "antiSynergyNotes": "Blade Sense (T2) -- crit mult bonus has no value when crits don't deal bonus damage.",
  "synergy": ["st_0_4_0", "st_0_4_1", "st_0_5_0"],
  "synergyNotes": "Exploit Weakness (T4) -- crits on Vulnerable = reliable Mark delivery. Predator's Mark (T4b) -- double strikes = more Mark chances. Precision Killer (T5A) -- free Stabs = more crits = more Marks."
}
```

### Node ID Convention

Format: `{skillPrefix}_{branchIndex}_{tier}_{position}`

| Skill | Prefix |
|-------|--------|
| Stab | `st` |
| Blade Flurry | `bf` |
| Frost Fan | `ff` |
| Viper Strike | `vs` |
| Shadow Step | `ss` |
| Assassinate | `as` |
| Lightning Lunge | `ll` |

Branch indices: 0 = Assassination, 1 = Venomcraft, 2 = Shadow Dance

Examples:
- `st_0_1_0` = Stab, Assassination, T1, Position 0 (Puncture)
- `st_0_7_0` = Stab, Assassination, T7, Position 0 (DEATHBLOW)
- `bf_1_2_1` = Blade Flurry, Venomcraft, T2, Position 1 (behavior node)

---

## 7. Build Path Examples

`[TEMPLATE]` -- Include at least 3 build paths showing different investment strategies.

### Build 1: "Deathblow Assassin" (Stab focused, deep Assassination)

**Split:** Assassination 13 / Venomcraft 11 / Shadow Dance 6

**Assassination (13 pts -> T7):**
- T1: Puncture 2/2, Tunnel Vision 2/2 (4 pts)
- T2: Blade Sense 1/1, Honed Instincts 1/2 (2 pts) -- running total: 6
- T3: Backstab Setup 1/2, Lethal Rhythm 1/2 (2 pts) -- running total: 8
- T4: Exploit Weakness 1/1, Predator's Mark 1/2 (2 pts) -- running total: 10
- T5: Precision Killer 1/1 (1 pt) -- running total: 11
- T6: Death Mark 1/1 (1 pt) -- running total: 12
- T7: DEATHBLOW 1/1 (1 pt) -- running total: 13

**Venomcraft (11 pts -> T5):**
- T1: both nodes 2/2 (4 pts)
- T2: Envenom 1/1, behavior 2/2 (3 pts) -- running total: 7
- T3: 2 of 3 nodes at rank 1 (2 pts) -- running total: 9
- T4: Deep Wounds 1/1 (1 pt) -- running total: 10
- T5: Toxic Mastery 1/1 (1 pt) -- running total: 11

**Shadow Dance (6 pts -> T2+):**
- T1: both nodes 2/2 (4 pts)
- T2: Shadow Guard 1/1, behavior 1/2 (2 pts) -- running total: 6

**Total: 13 + 11 + 6 = 30**

**Result:** Full assassination pipeline. Stab -> Puncture stacks -> crits -> Death Mark ->
Assassinate auto-fires at 25% HP for 500% weapon damage. Precision Killer's
crit cap (60%) doesn't matter because crits only deliver Marks, not damage.

### Build 2: "Poison Master" (Viper Strike focused, deep Venomcraft)

**Split:** Venomcraft 13 / Assassination 10 / Shadow Dance 7

**Venomcraft (13 pts -> T7):**
- T1: both nodes 2/2 (4 pts)
- T2: notable 1/1, behavior 1/2 (2 pts) -- running total: 6
- T3: 2 of 3 nodes at rank 1 (2 pts) -- running total: 8
- T4: notable 1/1, behavior 1/2 (2 pts) -- running total: 10
- T5: keystone choice 1/1 (1 pt) -- running total: 11
- T6: notable 1/1 (1 pt) -- running total: 12
- T7: keystone 1/1 (1 pt) -- running total: 13

**Assassination (10 pts -> T4):**
- T1: 4, T2: 3, T3: 2, T4: 1 -- total: 10

**Shadow Dance (7 pts -> T3):**
- T1: 4, T2: 2, T3: 1 (one rank 1 behavior) -- total: 7

**Total: 13 + 10 + 7 = 30**

**Result:** Deep poison scaling with skill-specific Venomcraft notables. The exact
flavor depends on which skill -- Viper Strike gets DoT-specific notables, while
Blade Flurry gets per-hit poison application notables.

### Build 3: "Shadow Duelist" (dual-spec, no keystones)

**Split:** Assassination 10 / Shadow Dance 10 / Venomcraft 10

> **Scope:** This split describes one skill's allocation. Your other equipped skills
> have no tree investment in this build.

**Each branch at T5:**
- T1: 4 pts
- T2: 2 pts (notable + 0 behavior) -- running total: 6
- T3: 1 pt (one node rank 1) -- running total: 7
- T4: 2 pts (notable + 1 rank behavior) -- running total: 9
- T5: 1 pt (keystone choice) -- running total: 10

**Total: 10 + 10 + 10 = 30**

**Result:** Jack of all trades with T5 access in all 3 branches. Gets meaningful
sub-identity choices in every branch. Lacks T6-T7 power but
gets flexibility. Good for players who want versatility or are still learning.

### Build 4: "Glass Cannon" (hyper-deep single branch)

**Split:** Assassination 18 / Venomcraft 6 / Shadow Dance 6

**Assassination (18 pts -> T7 with maxed nodes):**
- T1-T4 nearly fully maxed, T5-T7 all taken

**Other branches (6 pts each):**
- T1: 4 pts, T2: 2 pts (notable + 0 behavior, or 0 notable + 1 rank behavior)

**Total: 18 + 6 + 6 = 30**

**Result:** Maximum branch power. Nearly all behavior nodes maxed, full T5-T7.
Extremely focused. Very squishy with minimal defensive investment.

---

## 8. 3-Mechanic Rule Validation

`[TEMPLATE]` -- Before finalizing any skill x branch tree, list its mechanics. If count
exceeds 3, consolidate.

### Validation Template

For each skill x branch, list the 3 tracked mechanics:

| Skill | Branch | Mechanic 1 (Skill-specific) | Mechanic 2 (T2 Notable) | Mechanic 3 (T6 Notable) |
|-------|--------|-----------|-----------|-----------|
| Stab | Assassination | Puncture stacks | Predator state | Death Mark |
| Stab | Venomcraft | Poison stacks | Venom Frenzy | Debuff spread |
| Stab | Shadow Dance | Fortify stacks | Shadow Form | Dodge counter |
| Blade Flurry | Assassination | Hit-in-cast ramp | *skill-specific T2* | *skill-specific T6* |
| Blade Flurry | Venomcraft | Poison per hit | *skill-specific T2* | *skill-specific T6* |
| Blade Flurry | Shadow Dance | Fortify stacks | *skill-specific T2* | *skill-specific T6* |
| Frost Fan | Assassination | Target count | *skill-specific T2* | *skill-specific T6* |
| Frost Fan | Venomcraft | AoE poison | *skill-specific T2* | *skill-specific T6* |
| Frost Fan | Shadow Dance | Fortify stacks | *skill-specific T2* | *skill-specific T6* |
| Viper Strike | Assassination | DoT stacks -> crit | *skill-specific T2* | *skill-specific T6* |
| Viper Strike | Venomcraft | Poison stacks | *skill-specific T2* | *skill-specific T6* |
| Viper Strike | Shadow Dance | Fortify stacks | *skill-specific T2* | *skill-specific T6* |
| Shadow Step | Assassination | Stealth charges | *skill-specific T2* | *skill-specific T6* |
| Shadow Step | Venomcraft | Stealth poison | *skill-specific T2* | *skill-specific T6* |
| Shadow Step | Shadow Dance | Fortify stacks | *skill-specific T2* | *skill-specific T6* |
| Assassinate | Assassination | CD investment | *skill-specific T2* | *skill-specific T6* |
| Assassinate | Venomcraft | Heavy poison | *skill-specific T2* | *skill-specific T6* |
| Assassinate | Shadow Dance | Fortify stacks | *skill-specific T2* | *skill-specific T6* |
| Lightning Lunge | Assassination | Chain count | *skill-specific T2* | *skill-specific T6* |
| Lightning Lunge | Venomcraft | Chain poison | *skill-specific T2* | *skill-specific T6* |
| Lightning Lunge | Shadow Dance | Fortify stacks | *skill-specific T2* | *skill-specific T6* |

**Pattern:** Mechanic 2 and 3 are always the branch notables (T2 + T6). Mechanic 1
is the skill-specific behavior node interaction. The branch notables define the branch
identity, the behavior nodes define the skill.

**Rule:** Each skill's JSON file must include a `mechanicCheck` section validating
that no branch exceeds 3 tracked mechanics.

---

## 9. Behavior Node Template Library (Reference)

`[TEMPLATE]` -- Full template library from v3.1. Included as reference for speccing
behavior nodes. Select templates based on skill archetype tags.

### `single-hit` / `fast-cd`

```yaml
- template: STACK_BUILDER
  description: Builds stacks on hit. At max stacks, triggers guaranteed bonus + resets.
  example: { name: "Puncture", stacks: 3, atMax: { guaranteedCrit: true } }

- template: COOLDOWN_EMPOWERED
  description: Damage scales with time spent on cooldown. Rewards deliberate pacing.
  example: { name: "Charged Strike", perSecond: 8, max: 40 }

- template: CONSECUTIVE_TARGET
  description: Scales per consecutive hit on same target. Resets on switch.
  example: { name: "Tunnel Vision", perHit: { incCritChance: 5 }, maxStacks: 4 }

- template: LETHAL_RHYTHM
  description: Every Nth hit on same target triggers a bonus effect.
  example: { name: "Lethal Rhythm", everyNthHit: 3, effect: { incDamage: 30 } }
```

### `multi-hit` / `combo`

```yaml
- template: PER_HIT_RAMP
  description: Each hit within the cast scales the next hit. Rewards landing all hits.
  example: { name: "Accelerating Cuts", perHitInCast: { incCritChance: 4 } }

- template: HIT_COUNT_THRESHOLD
  description: If cast lands N+ hits total, final hit triggers a bonus.
  example: { name: "Full Flurry", threshold: 3, onFinalHit: { applyDebuff: 'vulnerable' } }

- template: COMBO_STATE
  description: Casting this skill within Xs of last cast enters a Combo state with bonus.
  example: { name: "Blade Dance", window: 2.0, comboBonus: { incDamage: 20 } }
```

### `dot` / `chaos`

```yaml
- template: DOT_STATE_CONDITIONAL
  description: Bonus while target has N+ DoT stacks from this skill.
  example: { name: "Toxic Reflex", minStacks: 3, bonus: { incCritChance: 10 } }

- template: DOT_TICK_PROC
  description: Each DoT tick has chance to trigger secondary effect.
  example: { name: "Festering Wound", chance: 0.20, effect: { addPoisonStack: 1 } }

- template: DOT_EXPIRY_BURST
  description: When DoT expires naturally (not cleansed), triggers a burst effect.
  example: { name: "Toxic Detonation", onExpire: { aoePoison: true, radius: 'small' } }
```

### `aoe` / `projectile`

```yaml
- template: TARGET_COUNT_SCALING
  description: Scales with number of enemies hit in one cast.
  example: { name: "Spreading Chill", perTarget: { incDamage: 5 }, max: 25 }

- template: PIERCE_CHAIN_PROC
  description: After piercing N targets, final target gets bonus effect.
  example: { name: "Piercing Toxin", threshold: 2, finalTarget: { applyDebuff: 'cursed' } }

- template: AOE_OVERLAP
  description: Enemies hit by 2+ projectiles in same cast take bonus effect.
  example: { name: "Crossfire", onDoubleHit: { guaranteedCrit: true } }
```

### `chain` / `lightning`

```yaml
- template: CHAIN_RAMP
  description: Each chain jump increases damage on the next target.
  example: { name: "Voltaic Chain", perJump: { incDamage: 8 } }

- template: SHOCK_STATE_CONDITIONAL
  description: Bonus when hitting a Shocked target.
  example: { name: "Overload", onShocked: { incCritMultiplier: 12 } }

- template: CHAIN_RETURN
  description: If chain reaches max targets, returns to first target for a bonus hit.
  example: { name: "Arc Return", onMaxChain: { bonusHit: true, incDamage: 40 } }
```

### `long-cd` / `big-hit`

```yaml
- template: CAST_TIME_EMPOWERED
  description: Bonus scales with cast time committed before release.
  example: { name: "Patient Predator", perSecondCasting: { incCritChance: 15 }, max: 30 }

- template: HP_THRESHOLD_CONDITIONAL
  description: Different effects based on enemy HP when skill lands.
  example: { name: "Finishing Blow", below40pct: { incDamage: 25 } }

- template: COOLDOWN_INVESTMENT
  description: Pair node -- one builds bonus per second on CD, other reduces CD per event.
  example:
    node1: { name: "Charged Strike", perSecondOnCD: { incDamage: 8 }, max: 40 }
    node2: { name: "Hunter's Patience", onAnyCrit: { reduceCooldown: 1 }, max: 10 }
```

### `stealth-synergy`

```yaml
- template: STEALTH_CHARGE_CONSUMER
  description: Consuming a Stealth charge triggers bonus beyond default attack.
  example: { name: "Shadow Surge", onChargeConsumed: { chance: 0.50, applyBuff: 'haste' } }

- template: STEALTH_UPTIME_RAMP
  description: Bonus scales with seconds in Stealth before casting.
  example: { name: "Lurking Death", perSecondInStealth: { incDamage: 15 }, max: 45 }

- template: STEALTH_REENTRY
  description: On kill while using Stealth charges: regain 1 charge.
  example: { name: "Ghost Predator", onKillFromStealth: { regainCharge: 1 } }
```

---

## 10. Validation Checklist

`[TEMPLATE]` -- Run this checklist against every node before finalizing.

### Behavior Nodes
- [ ] Has a conditional (condition + conditionParam)?
- [ ] References skill's own natural mechanic (hit pattern, CD, DoT, movement)?
- [ ] Rank 2 feels meaningfully different, not just +numbers?
- [ ] Skippable without breaking the build?
- [ ] Changes how player plays, not just what numbers they have?

### Notables
- [ ] Proc or state-shift leads the description?
- [ ] procPattern is identified (escalating/gated/catastrophic/cooldown/state-shift)?
- [ ] Stats are riders, not headline?
- [ ] Sets up something T5+ can reference?

### Keystone Choices (T5)
- [ ] One choice rewards consistent/controlled play?
- [ ] One choice rewards high-variance/risky play?
- [ ] Both lead to the same T6 and T7?
- [ ] Neither is obviously dominant?

### Keystones (T7)
- [ ] T7 tensions with T6 (not extends)?
- [ ] Tradeoff is permanent and meaningful?
- [ ] antiSynergy list is populated?
- [ ] "Not just T6 but more" test passes?
- [ ] Player who takes this feels clearly different from player who doesn't?

### Tree-Level Checks
- [ ] 3-mechanic rule: no more than 3 tracked mechanics per skill x branch?
- [ ] Branch capacity = 19 pts?
- [ ] Gate progression: 0, 2, 4, 7, 10, 11, 12?
- [ ] T3 has 3 behavior nodes (pick-2-of-3 divergence)?
- [ ] No behavior node is a raw stat stick (must have condition)?
- [ ] Buff assignment is documented (which branch owns which buff)?
- [ ] Passive removal is documented (if applicable)?

### Per-Skill File Checks
- [ ] 3 branches x 13 nodes = 39 nodes total?
- [ ] No notable/keystone name duplicated from another skill's file?
- [ ] Every notable/keystone references the skill's archetype mechanics?
- [ ] T7 tensions with T6 (not extends) for every branch?
- [ ] T5 choices are consistent vs risky for every branch?

---

## 11. Generation Instructions

`[TEMPLATE]` -- Process for speccing nodes per skill, per branch. Used to
produce the full node selections in each JSON file.

### Per Skill, Per Branch:

1. **Tag lookup** -- get skill's archetype tags from Section 1
2. **Select 4-5 behavior templates** from library (Section 9) matching those tags
3. **Place templates** into T1 (2 nodes), T2 behavior (1 node), T3 (3 nodes -- player
   picks 2), T4 behavior (1 node)
4. **Tune values** to skill's natural stats:
   - Fast CD (Stab, Lightning Lunge): lower proc %, higher uptime assumptions
   - Long CD (Assassinate): higher proc %, timing/threshold conditionals
   - DoT (Viper Strike): condition on DoT state, tick events, stack counts
   - Multi-hit (Blade Flurry): per-hit-within-cast scaling, hit count thresholds
   - AoE/Projectile (Frost Fan): target count, pierce count, overlap
   - Stealth-synergy (Shadow Step): stealth charge consumption, buff windows
5. **Name each node thematically** -- name should evoke the skill's fantasy, not the
   template name. "Voltaic Chain" not "CHAIN_RAMP for Lightning Lunge."
6. **Define rank 2 qualitative difference** -- rank 2 must change the mechanic, not
   just increase a number.

### Notable/Keystone Design (per skill, per branch):

7. **Design T2 notable** -- escalating or gated proc that rewards the skill's natural
   hit pattern. Must interact with the skill's archetype mechanics, not be generic.
8. **Design T4 notable** -- gated proc or state-shift involving Vulnerable/debuffs,
   specific to how the skill lands damage.
9. **Design T5 choice pair** -- one consistent/controlled, one risky/high-variance.
   Both lead to the same T6 and T7.
10. **Design T6 notable** (skill-specific) -- proc-forward, pick a procPattern from
    the 5 types. Must be a dramatic "thing happened" moment specific to the skill.
11. **Design T7 keystone** -- must tension with T6, must have real permanent tradeoff,
    must pass the "not just T6 but more" test. Populate antiSynergy and synergy lists.

### Per-Branch Design Constraints

**Assassination (crit/burst/execute):**
- T2: Escalating proc that rewards the skill's natural hit pattern -> crit scaling
- T4: Gated proc involving Vulnerable, specific to how the skill lands damage
- T5A: Consistent crit payoff tuned to skill's rhythm
- T5B: Risky crit/kill-chain tuned to skill's rhythm
- T6: Catastrophic proc -- dramatic moment specific to skill
- T7: Tensions with T6, transforms skill identity with meaningful tradeoff

**Venomcraft (poison/DoT/debuffs):**
- T2: Gated proc for poison application, specific to skill's delivery method
- T4: State-shift triggered by skill-specific poison interaction
- T5A: Consistent poison scaling for the skill
- T5B: Risky detonation/burst for the skill
- T6: Gated debuff spread specific to skill's hit pattern
- T7: Constraining keystone that tensions with T6

**Shadow Dance (evasion/defense/combos):**
- T2: Cooldown proc for defense, specific to skill's cast/hit timing
- T4: State-shift triggered by dodge in skill-specific context
- T5A: Consistent sustain/defense for the skill
- T5B: Risky offense-from-defense for the skill
- T6: Cooldown proc for counter-attack specific to skill
- T7: Removes defense for offense, tensions with T6

### Validation:

12. Run the 3-mechanic rule check (Section 8): list tracked mechanics, consolidate
    if count exceeds 3.
13. Run the validation checklist (Section 10) against every node.

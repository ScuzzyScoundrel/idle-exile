# Dagger Weapon — Talent Tree Design (v2.0)

> Canonical design document for the dagger weapon system.
> This is the GOLD STANDARD — all other weapons will follow this pattern.
>
> **v2.0 changes from v4:**
> - Element transforms as a separate choice layer (see ELEMENT_SYSTEM.md)
> - Archetypes renamed: Assassination→Predator, Venomcraft→Plague, Shadow Dance→Ghost
> - Compact 16-node skill graphs REMOVED — only 39-node talent trees remain
> - 10 skills (7 reworked + 3 new: Blade Ward, Blade Trap, Shadow Dash)
> - Combo state system (skills create/consume states for rotation depth)
> - Ailment rework (Bleed/Ignite/Chill/Shock/Poison — see ELEMENT_SYSTEM.md)
> - T3 nodes simplified to conditional stats (no procs)
> - T4b behavior nodes support T4 notable (no new proc systems)

---

## Table of Contents

1. [Document Map](#1-document-map)
2. [Current Dagger Skills](#2-current-dagger-skills)
3. [Branch Themes](#3-branch-themes)
4. [Buff Assignments](#4-buff-assignments)
5. [Tree Structure](#5-tree-structure)
6. [File Structure](#6-file-structure)
7. [JSON Schema](#7-json-schema)
8. [Build Path Examples](#8-build-path-examples)
9. [3-Mechanic Rule](#9-3-mechanic-rule)
10. [Validation Checklist](#10-validation-checklist)
11. [Generation Instructions](#11-generation-instructions)

---

## 1. Document Map

| Document | Purpose |
|----------|---------|
| **README.md** (this file) | Master spec — framework, tree structure, schemas, validation |
| **ELEMENT_SYSTEM.md** | Element transforms, ailments, damage types, gear scaling |
| **SKILL_ROSTER.md** | All 10 skills — mechanics, combos, rotations, buffs |
| **ARCHETYPE_GUIDE.md** | 3 archetypes — per-skill constraints, combo modifications, anti-duplication |
| **ENGINE_CHANGES.md** | Code/engine changes needed for implementation |
| **VALIDATION_LOG.md** | Anti-duplication — pattern registry, flagged/blocked patterns, audit results |
| **CHECKLIST_RESULTS.md** | Per-skill validation checklists (all 10 skills) |
| **{skill}.json** | Per-skill talent tree data (39 nodes each) |

### Reading Order for New Contributors

1. ELEMENT_SYSTEM.md (understand damage types and transforms)
2. SKILL_ROSTER.md (understand what each skill does)
3. ARCHETYPE_GUIDE.md (understand how branches work per skill)
4. README.md (understand tree structure and JSON schema)
5. VALIDATION_LOG.md (check before designing new nodes)

---

## 2. Current Dagger Skills

### Active Skills (10)

| ID | Name | Role | WD% | CD | Special |
|----|------|------|-----|----|---------|
| `dagger_stab` | Stab | Filler | 100% | 3s | Consecutive hit rewards |
| `dagger_blade_dance` | Blade Dance | Sequential AoE | 30%×3 | 5s | 3 hits on 3 different enemies |
| `dagger_fan_of_knives` | Fan of Knives | AoE | 60% | 5s | Hits all enemies |
| `dagger_viper_strike` | Viper Strike | DoT Specialist | 70% | 5s | +50% ailment potency |
| `dagger_assassinate` | Assassinate | Burst/Execute | 220% | 8s | Combo consumer |
| `dagger_chain_strike` | Chain Strike | Chain | 65% | 4s | Chains to 2 nearby |
| `dagger_shadow_mark` | Shadow Mark | Setup/Utility | 50% | 6s | Empowers next skill |
| `dagger_blade_ward` | Blade Ward | Defensive | 60% | 7s | 15% DR + counter-hits |
| `dagger_blade_trap` | Blade Trap | Trap/Delayed | 150% | 10s | Detonates on enemy attack |
| `dagger_shadow_dash` | Shadow Dash | Movement | 80% | 5s | Next skill CD -2s |

### Buff Skills (3)

| ID | Name | Archetype | Duration | CD | Effect |
|----|------|-----------|----------|----|--------|
| `dagger_predators_mark` | Predator's Mark | Predator | 10s | 45s | +40% crit damage, extends on crit |
| `dagger_venom_covenant` | Venom Covenant | Plague | 12s | 50s | +3% speed per ailment, burst on expire |
| `dagger_shadow_covenant` | Shadow Covenant | Ghost | 8s | 55s | Counter on dodge, extends on dodge |

### Skill Behavior Archetypes

| Skill | Tags | Natural Mechanics |
|-------|------|-------------------|
| Stab | `single-hit`, `fast-cd` | Consecutive hits, fast cycle, single-target |
| Blade Dance | `sequential-aoe`, `melee` | Per-target distribution, kill-chain redirects, pack-size scaling |
| Fan of Knives | `aoe`, `projectile` | Target count, pack interactions |
| Viper Strike | `dot`, `melee` | Ailment potency, snapshot, deep wound |
| Assassinate | `heavy`, `long-cd` | Cooldown investment, execute threshold, combo consumption |
| Chain Strike | `chain`, `melee` | Chain count, chain jump, sequential targeting |
| Shadow Mark | `utility`, `melee` | Mark duration, per-skill empowerment, setup |
| Blade Ward | `defensive`, `melee` | Ward duration, counter-hits, DR, hit count during ward |
| Blade Trap | `trap`, `aoe` | Arm time, detonation trigger, delayed damage |
| Shadow Dash | `movement`, `melee` | CD acceleration, first-strike, mobility |

---

## 3. Branch Themes

| Branch | Name | Fantasy | Core Loop |
|--------|------|---------|-----------|
| 0 | **Predator** | "Set up the kill, one perfect strike" | Momentum → exploit opening → burst payoff |
| 1 | **Plague** | "Inevitable doom, everything rots" | Apply ailments → threshold → cascade |
| 2 | **Ghost** | "Untouchable, every miss is punished" | Evade → counter → survive → outlast |

See ARCHETYPE_GUIDE.md for full archetype definitions, per-skill constraints,
and combo state modifications.

### Branch Progression Arc

```
T1: Foundation — behavioral loop (MODERATE complexity)
T2: Escalation — first proc/state-shift (HIGH)
T3: Breathing room — conditional stats (LOW — no procs)
T4: Payoff — gated reward + support behavior (HIGH + LOW)
T5: Identity fork — consistent vs risky (HIGH)
T6: Dramatic moment — catastrophic proc (HIGH)
T7: Commitment — permanent tradeoff (HIGH)
```

---

## 4. Buff Assignments

### Design Rule

Each weapon has exactly **3 buff skills** and **0 floating passives**. Each buff
belongs to one archetype. A buff should feel weak without its archetype's investment.

| Buff | Archetype | Why |
|------|-----------|-----|
| Predator's Mark | Predator | Crit window — extends on crits, synergizes with burst |
| Venom Covenant | Plague | Ailment frenzy — speed ramps on ailment application, burst on expire |
| Shadow Covenant | Ghost | Dodge window — counter on dodge, extends on dodge, reward for untouched |

See SKILL_ROSTER.md section 7 for full buff details.

---

## 5. Tree Structure

### Tier Layout (per branch, per skill)

```
T1  --  Behavior Node A (0/2)  +  Behavior Node B (0/2)           [gate: 0 pts]
         | requires 2 pts in branch
T2  --  Notable (0/1)          +  Behavior Node C (0/2)           [gate: 2 pts]
         | requires 4 pts in branch
T3  --  Conditional A (0/2)    +  Conditional B (0/2)
     +  Conditional C (0/2)    [3 nodes, pick 2 — no procs]       [gate: 4 pts]
         | requires 7 pts in branch
T4  --  Notable (0/1)          +  Support Behavior (0/2)          [gate: 7 pts]
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
| T1 behavior nodes (2 × 2) | 4 |
| T2 notable + behavior (1 + 2) | 3 |
| T3 conditional nodes (3 × 2) | 6 |
| T4 notable + support behavior (1 + 2) | 3 |
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
| T3 | 4 | T1 full OR T1 partial + T2 notable |
| T4 | 7 | Spread across T1-T3, forces T3 investment |
| T5 | 10 | Deep investment before identity fork |
| T6 | 11 | T5 choice + 1 more |
| T7 | 12 | Full commitment — nearly half total budget |

### Node Types

| Type | maxRank | Tier | Role |
|------|---------|------|------|
| `behavior` | 2 | T1, T2b | Behavioral — changes HOW you play. Rank 2 changes the mechanic. |
| `conditional` | 2 | T3 | Conditional stat — simple bonus with a condition. No procs. Rank 2 upgrades the condition or value. |
| `support` | 2 | T4b | Supports the T4 notable's state — extends/enhances it. No new proc system. |
| `notable` | 1 | T2, T4, T6 | Proc-forward anchor — proc or state-shift leads the description. |
| `keystoneChoice` | 1 | T5 | Identity fork — one consistent, one risky. Mutually exclusive. |
| `keystone` | 1 | T7 | Build-definer — permanent tradeoff, tensions with T6. |

---

## 6. File Structure

```
docs/weapon-designs/dagger-v2/
  README.md                    # This file — framework, structure, schemas
  ELEMENT_SYSTEM.md            # Element transforms, ailments, scaling
  SKILL_ROSTER.md              # All 10 skills, combos, rotations, buffs
  ARCHETYPE_GUIDE.md           # 3 archetypes, per-skill constraints
  ENGINE_CHANGES.md            # Code changes needed for implementation
  VALIDATION_LOG.md            # Anti-duplication — patterns, flags, audit
  CHECKLIST_RESULTS.md         # Per-skill validation checklists
  stab.json                    # 39 nodes (Stab — filler, fast-cd)
  blade-dance.json              # 39 nodes (Blade Dance — sequential-aoe)
  fan-of-knives.json           # 39 nodes (Fan of Knives — aoe)
  viper-strike.json            # 39 nodes (Viper Strike — dot)
  assassinate.json             # 39 nodes (Assassinate — burst)
  chain-strike.json            # 39 nodes (Chain Strike — chain)
  shadow-mark.json             # 39 nodes (Shadow Mark — setup)
  blade-ward.json              # 39 nodes (Blade Ward — defensive)
  blade-trap.json              # 39 nodes (Blade Trap — trap)
  shadow-dash.json             # 39 nodes (Shadow Dash — movement)
```

---

## 7. JSON Schema

### Per-Skill File

```json
{
  "skillId": "dagger_stab",
  "skillName": "Stab",
  "version": "2.0",
  "tags": ["single-hit", "fast-cd"],
  "branches": [
    {
      "branchIndex": 0,
      "branchName": "Predator",
      "mechanicCheck": {
        "mechanics": ["...", "...", "..."],
        "verdict": "3 mechanics. PASS."
      },
      "comboModifications": [],
      "nodes": [ /* 13 nodes */ ]
    },
    {
      "branchIndex": 1,
      "branchName": "Plague",
      "mechanicCheck": { ... },
      "comboModifications": [],
      "nodes": [ /* 13 nodes */ ]
    },
    {
      "branchIndex": 2,
      "branchName": "Ghost",
      "mechanicCheck": { ... },
      "comboModifications": [],
      "nodes": [ /* 13 nodes */ ]
    }
  ]
}
```

### Behavior Node (T1, T2b)

```json
{
  "id": "st_0_1_0",
  "name": "Puncture",
  "slot": "T1a",
  "tier": 1,
  "position": 0,
  "type": "behavior",
  "maxRank": 2,
  "description": "Full rank 1 description.",
  "rank2": "How rank 2 changes the mechanic (not just numbers).",
  "modifier": { ... },
  "designNotes": "Which template was used and why."
}
```

### Conditional Node (T3)

```json
{
  "id": "st_0_3_0",
  "name": "Exploit Opening",
  "slot": "T3a",
  "tier": 3,
  "position": 0,
  "type": "conditional",
  "maxRank": 2,
  "description": "+15% crit chance vs targets below 50% HP.",
  "rank2": "Threshold raised to 60% HP. +3% weapon mastery.",
  "modifier": {
    "conditionalMods": [{ "condition": "whileTargetBelowHp", "threshold": 50, "modifier": { "incCritChance": 15 } }]
  },
  "designNotes": "Simple conditional stat. No proc, no state tracking."
}
```

### Support Node (T4b)

```json
{
  "id": "st_0_4_1",
  "name": "Extended Focus",
  "slot": "T4b",
  "tier": 4,
  "position": 1,
  "type": "support",
  "maxRank": 2,
  "description": "While Predator state is active: +15% damage.",
  "rank2": "+25% damage and Predator duration extended by 1s.",
  "modifier": {
    "conditionalMods": [{ "condition": "whileBuffActive", "buffId": "predator", "modifier": { "incDamage": 15 } }]
  },
  "designNotes": "Supports T4 notable's Predator state. No new proc."
}
```

### Notable (T2, T4, T6)

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
  "description": "Full description with proc leading.",
  "statsRider": "+10% crit chance.",
  "modifier": { ... },
  "designNotes": "Escalating proc rewards Stab's fast consecutive hits."
}
```

### Keystone Choice (T5)

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
  "description": "Full description.",
  "modifier": { ... },
  "exclusiveWith": ["st_0_5_1"]
}
```

### Keystone (T7)

```json
{
  "id": "st_0_7_0",
  "name": "DEATHBLOW",
  "slot": "T7",
  "tier": 7,
  "position": 0,
  "type": "keystone",
  "maxRank": 1,
  "description": "Full description with tradeoff.",
  "modifier": { ... },
  "tensionWith": "st_0_6_0",
  "tensionDescription": "How T7 tensions with T6.",
  "antiSynergy": [],
  "synergy": []
}
```

### Combo Modification Schema

```json
{
  "comboModifications": [
    {
      "tier": "T3",
      "type": "replace",
      "defaultState": "exposed",
      "newState": "festering_mark",
      "description": "Stab crits create Festering Mark instead of Exposed."
    }
  ]
}
```

### Node ID Convention

Format: `{skillPrefix}_{branchIndex}_{tier}_{position}`

| Skill | Prefix |
|-------|--------|
| Stab | `st` |
| Blade Dance | `bd` |
| Fan of Knives | `fk` |
| Viper Strike | `vs` |
| Assassinate | `as` |
| Chain Strike | `cs` |
| Shadow Mark | `sm` |
| Blade Ward | `bw` |
| Blade Trap | `bt` |
| Shadow Dash | `sd` |

Branch indices: 0 = Predator, 1 = Plague, 2 = Ghost

---

## 8. Build Path Examples

See SKILL_ROSTER.md section 6 for full rotation examples.

### Point Allocation Examples

**Build 1: "Deathblow Assassin"** (deep Predator)
- Predator 13 / Plague 11 / Ghost 6
- T7 keystone unlocked in Predator
- T5 keystone in Plague
- T2 notable only in Ghost

**Build 2: "Plague Master"** (deep Plague)
- Plague 13 / Predator 10 / Ghost 7
- T7 keystone in Plague
- T5 in Predator
- T3 in Ghost

**Build 3: "Balanced Duelist"** (spread)
- Predator 10 / Plague 10 / Ghost 10
- T5 in all three branches
- No T7 keystone — trades peak power for versatility

**Build 4: "Glass Cannon"** (hyper-deep)
- Predator 18 / Plague 6 / Ghost 6
- Nearly all Predator nodes maxed
- Minimal investment elsewhere — very fragile

---

## 9. 3-Mechanic Rule

Each skill × branch combination tracks at most 3 mechanics:

1. **Skill-specific mechanic** (from T1 behavior nodes)
2. **Branch proc/state** (from T2 or T4 notable)
3. **Dramatic proc** (from T6 notable)

T3 conditional stats, T4b support behaviors, and T5 choices are NOT
counted as separate mechanics — they enhance/modify the 3 core mechanics.

### Validation

Each skill JSON must include a `mechanicCheck` section per branch:

```json
"mechanicCheck": {
  "mechanics": [
    "Puncture stacks (T1 — stack builder → guaranteed crit)",
    "Predator state (T2 notable — escalating proc → crit mult window)",
    "Death Mark (T6 notable — catastrophic proc → consume for burst)"
  ],
  "nonTracked": [
    "+X% vs condition — T3 conditional stats, no tracking",
    "Predator duration extension — T4b support, enhances tracked mechanic"
  ],
  "verdict": "3 mechanics. PASS."
}
```

---

## 10. Validation Checklist

### Per Node

**Behavior (T1, T2b):**
- [ ] Has a condition (not a raw stat stick)?
- [ ] References skill's natural mechanic (hit pattern, CD, chain count)?
- [ ] Rank 2 changes the mechanic, not just +numbers?
- [ ] Skippable without breaking the build?

**Conditional (T3):**
- [ ] Simple conditional stat with clear trigger?
- [ ] NO procs, NO state-shifts, NO new tracking?
- [ ] Condition references skill-specific behavior?
- [ ] Rank 2 upgrades condition threshold or adds weapon mastery?

**Support (T4b):**
- [ ] Directly supports T4 notable's state?
- [ ] NO new proc system?
- [ ] Enhances/extends/conditionally bonuses the T4 state?

**Notable (T2, T4, T6):**
- [ ] Proc or state-shift leads the description?
- [ ] procPattern identified (escalating/gated/catastrophic/state-shift)?
- [ ] Stats are riders, not headline?

**Keystone Choice (T5):**
- [ ] One choice is consistent/controlled?
- [ ] One choice is risky/high-variance?
- [ ] Both lead to same T6 and T7?
- [ ] Neither is obviously dominant?

**Keystone (T7):**
- [ ] Tensions with T6 (not extends)?
- [ ] Permanent meaningful tradeoff?
- [ ] antiSynergy list populated?
- [ ] Player who takes this feels clearly different?

### Per Branch

- [ ] 3-mechanic rule passes?
- [ ] 13 nodes total (T1a, T1b, T2, T2b, T3a, T3b, T3c, T4, T4b, T5A, T5B, T6, T7)?
- [ ] Branch capacity = 19 pts?
- [ ] Gate progression: 0, 2, 4, 7, 10, 11, 12?
- [ ] T3 has 3 conditional nodes (no procs)?
- [ ] T4b supports T4 notable (no new procs)?
- [ ] No node name duplicated from another skill in same branch?

### Per Skill

- [ ] 3 branches × 13 nodes = 39 nodes total?
- [ ] All mechanics registered in VALIDATION_LOG.md?
- [ ] Every notable/keystone references skill's natural mechanics?
- [ ] comboModifications documented per branch?
- [ ] mechanicCheck included per branch?

---

## 11. Generation Instructions

### Per Skill, Per Branch

1. **Read SKILL_ROSTER.md** for the skill's tags, mechanics, combos
2. **Read ARCHETYPE_GUIDE.md** for the archetype's per-skill identity
3. **Check VALIDATION_LOG.md** for existing mechanics in this archetype
4. **Design T1 nodes** (2 behavior nodes matching skill tags + archetype)
5. **Design T2** (notable with escalating/gated proc + behavior node)
6. **Design T3** (3 conditional stat nodes — simple, no procs)
7. **Design T4** (notable state-shift + support behavior that enhances it)
8. **Design T5** (consistent vs risky keystone choice pair)
9. **Design T6** (catastrophic/dramatic proc specific to skill)
10. **Design T7** (keystone that tensions with T6, permanent tradeoff)
11. **Register ALL mechanics** in VALIDATION_LOG.md
12. **Run validation checklist** (section 10)
13. **Write mechanicCheck** section for the branch
14. **Document comboModifications** if any defaults are changed

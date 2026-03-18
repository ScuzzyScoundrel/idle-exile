# Validation Log — Dagger v2.0

> Anti-duplication system. Search THIS file before designing any new node.
> Per-skill checklists are in CHECKLIST_RESULTS.md.
> Each skill JSON contains `mechanicCheck` per branch (3-mechanic rule).

---

## Rules

1. **Same mechanic in same branch across 2 skills** → FLAGGED (must justify)
2. **Same pattern in same branch across 3+ skills** → BLOCKED (redesign)
3. **Check this file before every new node design**
4. **Patterns track abstract SHAPE, not exact mechanics** (see section 3)
5. Cross-BRANCH duplication is allowed (Predator T1 can echo Plague T1 thematically)

---

## 1. BLOCKED Patterns (Do NOT Use)

| Pattern | Branch | Count | Skills | Why Blocked |
|---------|--------|-------|--------|-------------|
| `skills-cast-since-last` | Predator | 4 | VS T1a, FoK T2b, + 2 others (per VS designNotes) | Hit hard cap at 4. Any new Predator node using "bonus per skill cast since last X" is blocked. |

---

## 2. FLAGGED Patterns (2+ Uses — Justified But Watched)

### Predator Branch

| Pattern | Description | Skills | Count | Justification |
|---------|-------------|--------|-------|---------------|
| `kill-reduces-own-cd` | Kill → reduce this skill's cooldown | Stab T3b (direct kill), CS T3c (chain kills, multi), BW T3b (counter-hit kill, passive), BT T3b (detonation kill, delayed AoE) | 4 | Different TRIGGER conditions: direct hit, chain target, passive counter-hit, delayed AoE detonation. Kill-CD is fundamental to Predator's "kill chain" identity. **WATCH — do not add a 5th.** |
| `multi-kill-free-echo` | 2-3+ kills in one cast → free second cast/echo | BD T6 (3+ kills → AoE), FoK T6 (3+ kills → free FoK), CS T6 (2+ chain kills → free CS), BT T6 (2+ detonation kills → free detonation) | 4 | All at T6 (catastrophic tier). Different kill contexts: sequential-target, AoE, chain, delayed detonation. **AT THRESHOLD — the next Predator T6 MUST NOT be a multi-kill echo. SD's T6 (crit+kill echo) is different enough (gated on crit AND kill, echoes the EMPOWERED skill not itself).** |
| `empower-next-skill-damage` | After this skill → next skill gets +X% damage | BD T3c, CS T3b, BW T1b, BT T3c, SD T3c | 5 | Structural to Predator's setup→payoff loop. Different conditions (targets hit, chain count, hits received, detonation, momentum). **Accepted as archetype-structural.** |

### Plague Branch

| Pattern | Description | Skills | Count | Justification |
|---------|-------------|--------|-------|---------------|
| `kill-spreads-ailments` | Kill with ailments → spread to nearby/range | Stab T6, BD T6, CS T6, SM T6, BT T6, SD T6 | 6 | **Archetype-structural.** Plague T6 is defined as "cascade on kill with ailments." Spread MECHANISM differs: nearby radius, linked targets, chain path, marked targets, detonation AoE, pass-through range. BW T6 is the exception (triggered by enemy ATTACKING, not kill). |
| `combo-enhance-ailment-potency` | Combo state enhanced with ailment potency bonus | BW T3b (Guarded → +potency), SD T3b (Momentum → +potency) | 2 | Different combo states enhanced. Both at T3 (conditional tier). Acceptable. |

### Ghost Branch

| Pattern | Description | Skills | Count | Justification |
|---------|-------------|--------|-------|---------------|
| `per-hit-grants-dodge` | Each hit/target grants stacking dodge chance | Stab T1a (per Stab hit, same target), CS T1a (per chain target, different targets) | 2 | Different hit patterns: repetitive same-target vs sequential different-target. Acceptable. |
| `dodge-triggers-free-skill-counter` | X% on dodge → free skill-themed counter | Stab T6, BD T6, CS T6, SM T6, BT T6, SD T6 | 6 | **Archetype-structural.** Ghost T6 is defined as "counter-attack proc on defensive event." Each counter uses the skill's unique mechanics: single 200% hit, multi-target BD, chain from attacker, mark attacker, trap detonation at attacker, dash to enemy. |
| `every-dodge-fires-T6-reduced` | T7 makes T6 fire on every dodge at reduced power | Stab T7, BD T7, CS T7, SM T7, BT T7, SD T7 | 6 | **Archetype-structural.** Ghost T7 is defined as "commitment — T6 fires constantly with tradeoff." Power/tradeoff differs per skill. |
| `post-dodge-state-with-DR` | Dodge count → defensive state (DR, Fortify, Weakened) | Stab T4 (2 dodges → Shadow Form), BD T4 (2 dodges after BD → form), CS T4 (2 dodges after CS → Flash Step), BW T4 (2 dodges during ward → Iron Guard), SD T4 (2 dodges after dash → Phantom Dash) | 5 | **Archetype-structural.** Ghost T4 is defined as "defensive state-shift." Gate is always 2 dodges but context differs (general, after-cast, during-ward, after-dash). SM T4 uses 3 dodges while mark active — slightly different. |

---

## 3. Structural Patterns (Archetype-Mandated)

These patterns appear across many/all skills because the archetype DEFINITION requires them.
They are NOT duplication — they are the framework. But the CONTENT must differ per skill.

| Tier | Branch | Structural Shape | Rule |
|------|--------|-----------------|------|
| T4b | All | "+X% during [T4 state], extension mechanism" | Every T4b supports its T4 notable. The STATE differs per skill. |
| T6 | Ghost | "dodge → free skill-themed counter" | Ghost T6 IS a dodge counter. The COUNTER differs per skill. |
| T7 | Ghost | "T6 fires every dodge, reduced power, tradeoff" | Ghost T7 IS "T6 always-on." The TRADEOFF differs per skill. |
| T6 | Plague | "kill with ailments → spread via [skill range]" | Plague T6 IS ailment cascade. The RANGE/METHOD differs per skill. |
| T7 | Plague | "all-in ailment, direct damage penalty" | Plague T7 IS depth-over-breadth. The PENALTY differs per skill. |
| T7 | Predator | "amplify core mechanic, permanent tradeoff" | Predator T7 IS commitment. The TRADEOFF differs per skill. |

---

## 4. Unique Patterns — High-Impact Tiers (T1, T2, T6, T7)

> These are the tiers where duplication matters most. Every entry below is
> confirmed unique within its branch. If you're designing a new weapon's
> skill, check that your T1/T2/T6/T7 doesn't match any of these.

### Predator T1a (Foundation Behavior)

| Skill | Pattern | Why Unique |
|-------|---------|-----------|
| Stab | Consecutive-hit crit stack builder | Fast single-target hit streak |
| BD | Mid-cast kill redirects remaining hits | Sequential multi-target |
| FoK | +dmg per enemy hit (target count scaling) | True AoE |
| AS | +dmg per second on cooldown (CD investment) | Long-CD heavy hit |
| VS | +ailment potency per skill cast since last VS | DoT spacing |
| CS | Each chain jump deals more damage (escalating) | Chain mechanic |
| SM | Re-marking amplifies per-skill bonus | Setup/utility |
| BW | Counter-hits gain crit per counter (ward) | Defensive counter |
| BT | +dmg per second trap has been armed | Delayed/trap |
| SD | First-encounter guaranteed crit | Movement opener |

### Predator T2 (Notable — Escalating/Gated Proc)

| Skill | Pattern | Why Unique |
|-------|---------|-----------|
| Stab | On-hit escalating → Predator state | Hit-frequency |
| BD | 2+ kills in cast → Slaughter state | Multi-kill in cast |
| FoK | 4+ enemies → Knife Storm state | Target count |
| AS | Below HP threshold → guaranteed crit execute | HP gate |
| VS | Crit on 3+ stacks → extend ailment durations | Ailment timer manipulation |
| CS | 3+ chains + 2 crits → Chain Lightning | Chain count + crit count |
| SM | Mark on <50% HP → Hunter's Mark (doubled bonuses) | Mark upgrade on HP |
| BW | Counter-hit crit → Riposte Fury (100% WD counters) | Counter-hit crit |
| BT | Detonation crit + 3s armed → Primed (instant next) | Detonation + arm time |
| SD | Dash + follow-up crit → Rush (CD reduction) | Two-skill chain |

### Predator T6 (Catastrophic)

| Skill | Pattern | Why Unique |
|-------|---------|-----------|
| Stab | 15% on crit → Death Mark (consumed for +100%) | Chance-based mark |
| BD | 3+ kills in cast → AoE to remaining | Multi-kill echo (AoE) |
| FoK | 3+ kills → free second FoK | Multi-kill echo (self-recast) |
| AS | Exposed + Deep Wound consumed → massive bonus hit | Dual-combo consumption |
| VS | Crit on 8+ stacks → detonate half + reapply | Stack detonation |
| CS | 2+ chain kills → free CS with +2 chains | Multi-kill echo (chain) |
| SM | Assassinate consumes mark on <25% HP → 200% hit | Setup-execute chain |
| BW | 4+ hits + 2+ counter crits → 250% WD counter | Hit-count + crit-count gate |
| BT | 2+ detonation kills → free detonation | Multi-kill echo (trap) |
| SD | Empowered crit + kill → echo at 150% | Three-gate (dash→crit→kill) |

> **NOTE:** BD/FoK/CS/BT T6 share `multi-kill-free-echo` pattern (4 uses, FLAGGED above).
> Stab/BW/SM/SD T6 are genuinely distinct (chance-based, hit-count-gated, setup-chain, three-gate).
> **VS T6 is also distinct** (stack detonation, not kill-echo).
> AS T6 is distinct (dual-combo consumption).

### Ghost T1a (Foundation Defensive Behavior)

| Skill | Pattern | Why Unique |
|-------|---------|-----------|
| Stab | Per-hit dodge stacking (same target) | Fast hit → dodge ramp |
| BD | Pack-size DR (weakens per kill) | Multi-target defense |
| FoK | AoE miss-chance debuff on targets | AoE crowd control |
| AS | Dodge stores Shadow Charge (guaranteed next crit) | Dodge → offensive setup |
| VS | Dodge → ailment application to ALL nearby | Dodge → AoE ailment |
| CS | Per-chain-target dodge stacking | Chain reach → defense |
| SM | Marked targets deal less damage to you | Mark as defensive debuff |
| BW | Ward DR increased (+5-8%) | Modify built-in DR |
| BT | Dodge → instant trap arm (no 1.5s delay) | Dodge → trap acceleration |
| SD | 100% dodge for 0.5-0.8s (invulnerability window) | Guaranteed dodge burst |

### Plague T1a (Foundation Ailment Behavior)

| Skill | Pattern | Why Unique |
|-------|---------|-----------|
| Stab | Consecutive hits extend ailment duration | Fast hit → duration ramp |
| BD | Ailment potency per unique target hit | Multi-target potency |
| FoK | AoE ailment potency per target hit | Mass application scaling |
| AS | +potency per skill cast since last AS | Spacing reward |
| VS | +50% base potency → +75% vs 3+ stacks | Conditional potency |
| CS | Chain jumps carry ailments at 30-40% potency | Chain propagation |
| SM | Marked targets: all ailments +15-20% potency | Mark as potency amplifier |
| BW | Counter-hits apply ailments at +25-40% potency | Counter-hit ailment |
| BT | Detonation ailments at 2-2.5x potency | Delayed AoE potency |
| SD | Pass-through ailment to ALL enemies in path | Movement ailment trail |

---

## 5. Cross-Skill Audit Results (2026-03-15)

### Summary

| Check | Result |
|-------|--------|
| Predator T1 uniqueness (10 skills) | **ALL UNIQUE** ✓ |
| Predator T2 uniqueness (10 skills) | **ALL UNIQUE** ✓ |
| Predator T6 uniqueness (10 skills) | **4 share `multi-kill-free-echo`** — FLAGGED, at threshold |
| Plague T1 uniqueness (10 skills) | **ALL UNIQUE** ✓ |
| Plague T6 structural pattern | **6 share `kill-spreads-ailments`** — archetype-structural, accepted |
| Ghost T1 uniqueness (10 skills) | **2 share `per-hit-grants-dodge`** — FLAGGED, justified |
| Ghost T6 structural pattern | **6 share `dodge-triggers-counter`** — archetype-structural, accepted |
| Predator `kill-reduces-cd` | **4 skills** — FLAGGED, at threshold |
| `skills-cast-since-last` | **4 in Predator** — HARD BLOCKED |

### Critical Finding: Predator T6 `multi-kill-free-echo`

BD, FoK, CS, BT all have "2-3+ kills in one cast → free second cast/echo" at T6.
This is **AT the 3-skill threshold** (4 uses = over threshold).

**Why it's borderline acceptable:**
- T6 is the "catastrophic moment" tier — limited design space for dramatic payoffs
- Kill contexts differ: sequential (BD), AoE (FoK), chain (CS), delayed detonation (BT)
- The 6 OTHER skills' T6s are genuinely different (chance-based, combo-gated, hit-count-gated)

**Mitigation:**
- **No future dagger skill may use `multi-kill-free-echo` at T6 Predator.**
- When designing other weapons, treat this as a FLAGGED pattern from daggers.

### Critical Finding: Predator T3 `kill-reduces-cd`

4 skills use "kill → reduce own CD" as a T3 conditional. All have different kill sources,
but the abstract shape is shared.

**Mitigation:**
- **No future dagger skill may use `kill-reduces-cd` at T3 Predator.**
- SD's T3b (empowered-skill kill → SD CD) is distinct because the KILLING is done by another skill.

---

## 6. Quick Lookup — "Does This Pattern Exist?"

**Before designing a new node, describe it as:**
> "When [trigger], [effect] for [skill]"

**Then check:**
1. Is the TRIGGER the same as an existing node in this branch? (Section 4 tables)
2. Is the abstract SHAPE flagged or blocked? (Sections 1-2)
3. Is it a structural pattern? (Section 3 — allowed but content must differ)

**If designing for a NEW WEAPON:**
- Daggers own all patterns in section 4. Your weapon can use similar SHAPES
  if the skill's natural mechanics make them feel different.
- BLOCKED patterns (section 1) are blocked for daggers only. Other weapons
  start fresh but should avoid the same accumulation.

# Archetype Guide — Dagger v2.0

> Defines the 3 talent tree archetypes (branches) for daggers.
> Archetypes determine PLAYSTYLE. Elements determine DAMAGE TYPE.
> These are independent choices — any element works with any archetype.
>
> **Reference:** See ELEMENT_SYSTEM.md for element transforms.
> **Reference:** See SKILL_ROSTER.md for skill mechanics and combos.
> **Reference:** See ENGINE_CHANGES.md for implementation details.

---

## Table of Contents

1. [Archetype Philosophy](#1-archetype-philosophy)
2. [Predator (Branch 0)](#2-predator-branch-0)
3. [Plague (Branch 1)](#3-plague-branch-1)
4. [Ghost (Branch 2)](#4-ghost-branch-2)
5. [Archetype × Element Interactions](#5-archetype--element-interactions)
6. [Combo State Modifications by Archetype](#6-combo-state-modifications-by-archetype)
7. [Per-Skill Design Constraints](#7-per-skill-design-constraints)
8. [Anti-Duplication Rules](#8-anti-duplication-rules)
9. [Node Design Process](#9-node-design-process)

---

## 1. Archetype Philosophy

### The Two Axes of Build Identity

```
          ELEMENT (damage type)
          Physical | Fire | Cold | Lightning | Chaos
         ┌─────────┬──────┬──────┬───────────┬───────┐
Predator │ phys    │ fire │ cold │ lightning │ chaos │
         │ burst   │ burst│ burst│ burst     │ burst │
         ├─────────┼──────┼──────┼───────────┼───────┤
Plague   │ phys    │ fire │ cold │ lightning │ chaos │
         │ ramp    │ ramp │ ramp │ ramp      │ ramp  │
         ├─────────┼──────┼──────┼───────────┼───────┤
Ghost    │ phys    │ fire │ cold │ lightning │ chaos │
         │ react   │react │react │ react     │ react │
         └─────────┴──────┴──────┴───────────┴───────┘

= 15 distinct build identities per skill
= 150 distinct identities across 10 skills
```

**Element** answers: "What damage do I deal? What ailment do I apply? What gear do I chase?"
**Archetype** answers: "How do I play? Am I burst? Sustained? Reactive?"

### The Three Archetypes

| Archetype | Fantasy | Core Loop | Reward Pattern |
|-----------|---------|-----------|----------------|
| **Predator** | "Set up the kill, one perfect strike" | Build momentum → exploit opening → devastating payoff | Front-loaded burst, kill chains, tempo |
| **Plague** | "Inevitable doom, everything rots" | Apply ailments → reach threshold → trigger cascade | Ramp-up, threshold payoffs, sustained pressure |
| **Ghost** | "Untouchable, every miss is punished" | Evade → counter → survive → outlast | Reactive damage, defensive value, endurance |

### Archetype Progression Arc (Universal)

Every skill's archetype branch follows the same STRUCTURAL progression,
but with UNIQUE mechanics at every tier:

```
T1 (2 nodes): Foundation — establish the archetype's basic loop
T2 (notable + behavior): Escalation — first proc/state-shift, rewards the loop
T3 (3 nodes, pick 2): Breathing room — conditional stats that change play, NOT procs
T4 (notable + behavior): Payoff — gated reward; behavior node SUPPORTS the notable
T5 (choice A or B): Identity fork — consistent vs risky variant
T6 (notable): Dramatic moment — catastrophic/state-shift proc
T7 (keystone): Commitment — permanent tradeoff, tensions with T6
```

The STRUCTURE is shared. The CONTENT of each node is unique per skill.

### Tree Rhythm: Dramatic → Simple → Dramatic

The tree alternates between HIGH-IMPACT tiers (procs, state-shifts) and
LOW-COMPLEXITY tiers (conditional stats, support nodes):

```
T1: MODERATE — behavioral foundation (proc-like but simple)
T2: HIGH    — notable proc + behavior node
T3: LOW     — conditional stats, no new proc systems
T4: HIGH    — notable state-shift + support behavior
T5: HIGH    — identity fork (keystone choices)
T6: HIGH    — catastrophic proc
T7: HIGH    — commitment keystone
```

T3 and T4b are the "calm" tiers. They make meaningful choices without adding
cognitive load. Players should feel "I'm stronger in this situation" not
"I have another proc to track."

---

## 2. Predator (Branch 0)

### Identity

**"The perfect kill."** Predator is about TIMING and TEMPO. You set up your
damage window, then unleash everything in a short burst. Kill chains refund
cooldowns, crits extend windows, and momentum snowballs.

### Core Mechanics (Universal to Predator)

| Mechanic | How It Appears |
|----------|---------------|
| **Crit scaling** | Crit chance, crit multiplier, crit-triggered effects |
| **Momentum** | Consecutive hits, kill chains, snowballing bonuses |
| **Execute** | Bonus damage below HP thresholds |
| **Burst windows** | Timed states (Predator buff) that reward aggressive play |
| **Cooldown manipulation** | Kill resets, crit resets, CD refunds |

### Predator Buff: PREDATOR'S MARK

Predator branch talents can reference `whileBuffActive: 'predator'` for
conditional bonuses that only fire during the Predator's Mark buff window.

### Per-Skill Predator Identity

Every skill's Predator branch must feel different because each skill
BURSTS differently:

| Skill | Predator Fantasy | WHY It's Different |
|-------|-----------------|-------------------|
| **Stab** | "Consecutive precision" | Fast skill → rewards consecutive hit STREAKS. Momentum stacks, guaranteed crits at milestones. |
| **Blade Dance** | "Kill chain dancer" | Sequential AoE → each hit targets a different enemy. Kills during cast redirect remaining hits. Pack-clearing momentum. |
| **Fan of Knives** | "Mass execution" | AoE → rewards hitting MORE targets. Target count scaling, overkill chains through pack. |
| **Viper Strike** | "Detonation artist" | DoT → rewards CONSUMING ailments for burst. Stack ailments then detonate. Quality over quantity. |
| **Assassinate** | "Patient executioner" | Long CD → rewards WAITING. Cooldown investment, execute thresholds, the one perfect hit. |
| **Chain Strike** | "Chain lightning" | Chains → rewards SPREADING crits. Each chain can independently crit, chain count increases on crit. |
| **Shadow Mark** | "Architect of death" | Setup → rewards PLANNING. Mark empowerment scales with Predator investment, mark duration extends. |
| **Blade Ward** | "Counter-striker" | Defense → rewards PUNISHING attacks. Counter-hits from ward can crit, crits during ward extend it. |
| **Blade Trap** | "Calculated trap" | Delayed → rewards TIMING. Trap damage scales with time since last skill cast, crit chance on detonation. |
| **Shadow Dash** | "Ambush predator" | Movement → rewards OPENING. First skill after dash has guaranteed crit, dash CD resets on kill. |

### T-Level Design Constraints (Predator)

| Tier | Role | Constraint |
|------|------|-----------|
| T1 | Foundation | Must reference skill's NATURAL hit pattern for crit building. No generic "+X% crit." |
| T2 Notable | Escalating proc | Must be a proc that ESCALATES with the skill's hit rhythm. Fast skills = low chance scaling up. Slow skills = high chance on condition. |
| T3 | Conditional stats | Three SIMPLE conditional stat choices (no procs). E.g., "+15% crit vs targets below 50% HP", "+10% damage per consecutive hit (max 5)", "kills reduce cooldown by 0.5s". Player picks 2 of 3. Must reference skill-specific conditions. |
| T4 Notable | Gated proc | Must require a SETUP condition specific to this skill (e.g., "while target is Exposed" for Stab, "all 3 targets hit" for Blade Dance). |
| T4b | Support behavior | SUPPORTS the T4 notable's state — enhances it, extends it, or adds a conditional bonus while the state is active. No new proc system. |
| T5A | Consistent | Reliable crit payoff tuned to skill's rhythm. Ceiling exists but floor is high. |
| T5B | Risky | High-variance crit/kill payoff. Feast or famine. |
| T6 Notable | Catastrophic | Dramatic "the stars aligned" moment. Low chance, massive payoff, specific to skill. |
| T7 Keystone | Commitment | Removes a comfort (e.g., can't crit normally, crits only do X). Weaponizes T6's proc. Permanent tradeoff. |

---

## 3. Plague (Branch 1)

### Identity

**"Inevitable doom."** Plague is about PATIENCE and ACCUMULATION. You apply
ailments, reach stack thresholds, trigger cascading effects. The longer the
fight, the stronger you get. Everything dies eventually.

### Core Mechanics (Universal to Plague)

| Mechanic | How It Appears |
|----------|---------------|
| **Ailment application** | Apply more ailments, stronger ailments, faster ailments |
| **Stack thresholds** | "At X+ stacks, trigger Y" — gated payoffs |
| **Ailment interaction** | Different ailment types boosting each other |
| **Spread** | Ailments jumping to new targets on kill |
| **Duration manipulation** | Longer ailments, refresh mechanics, eternal pressure |

### Plague Buff: VENOM COVENANT

Plague branch talents can reference `whileBuffActive: 'covenant'` for
conditional bonuses that fire during the Venom Covenant buff window.
The covenant's expiry burst rewards ailment stacking during the window.

### Per-Skill Plague Identity

Every skill's Plague branch must feel different because each skill
APPLIES AILMENTS differently:

| Skill | Plague Fantasy | WHY It's Different |
|-------|---------------|-------------------|
| **Stab** | "Rapid injection" | Fast → quantity over quality. Many weak instances. Threshold reached through VOLUME. |
| **Blade Dance** | "Plague spreader" | Sequential AoE → ailments land on 3 different enemies per cast. Mass application across the pack, not deep stacking. |
| **Fan of Knives** | "Plague wind" | AoE → spreads ailments to ENTIRE PACK simultaneously. Mass application, not deep stacking. |
| **Viper Strike** | "Deep venom" | DoT specialist → FEWEST but STRONGEST ailment instances. One cast = one devastating application. |
| **Assassinate** | "Venom detonator" | Burst → CONSUMES ailment stacks for instant burst. Spends what others build. Anti-synergy with own ailments. |
| **Chain Strike** | "Contagion chain" | Chains → ailments SPREAD via chains. Each chain jump carries ailments to new target. |
| **Shadow Mark** | "Curse weaver" | Setup → mark applies CURSE in addition to skill ailment. Double debuff application. |
| **Blade Ward** | "Toxic counter" | Defense → counter-hits during ward apply EXTRA ailment stacks. Getting hit = more ailments on attacker. |
| **Blade Trap** | "Plague mine" | Delayed → trap detonation applies ailments at DOUBLE potency. One big AoE ailment burst. |
| **Shadow Dash** | "Drive-by infection" | Movement → dash applies ailment to target AND all enemies passed through. |

### T-Level Design Constraints (Plague)

| Tier | Role | Constraint |
|------|------|-----------|
| T1 | Foundation | Must establish how THIS SKILL applies ailments differently. Not "applies 1 poison" — that's the element transform's job. Instead: "each hit's ailment duration is 0.3s longer than the last" (Stab), "ailments applied to 3 different targets gain +10% potency per unique target hit" (Blade Dance). |
| T2 Notable | Gated proc | Must trigger at a STACK THRESHOLD specific to this skill's ailment application rate. Fast skills = low threshold. Slow skills = high threshold with bigger payoff. |
| T3 | Conditional stats | Three SIMPLE conditional stat choices (no procs). E.g., "+20% ailment potency vs targets with 3+ stacks", "+10% DoT damage per ailment type on target", "ailments last 0.5s longer per enemy in pack". Player picks 2 of 3. Must reference skill-specific conditions. |
| T4 Notable | State-shift | Must create a temporary STATE that changes how the skill applies ailments (e.g., Venom Frenzy for Stab, Saturation Burst for Fan of Knives). |
| T4b | Support behavior | SUPPORTS the T4 notable's state — extends duration, adds conditional bonus while state is active, or amplifies the state's effect. No new proc system. |
| T5A | Consistent | Reliable ailment scaling. More potency, more duration, higher floor. |
| T5B | Risky | Detonation/consumption mechanic. Spend stacks for burst. High ceiling, resets progress. |
| T6 Notable | Cascade | Ailment-triggered cascade specific to skill. Kill with ailments → spread/amplify. |
| T7 Keystone | Commitment | Constrains to depth over breadth. Tensions with T6's spread. E.g., "only one ailment type but at 3x power." |

### CRITICAL: Plague T1 Anti-Duplication Rule

The v1 system's biggest failure was 5/7 skills having "applies 1 poison on hit"
as their Plague T1. The new rule:

**Plague T1 must describe HOW the skill's ailment application differs, not WHAT
ailment is applied.** The element transform already handles WHAT ailment. The talent
handles HOW it's applied differently for this specific skill.

| Skill | BAD T1 (v1 pattern) | GOOD T1 (v2 pattern) |
|-------|--------------------|--------------------|
| Stab | "Applies 1 poison" | "Each consecutive Stab hit's ailment lasts 0.3s longer (max +1.5s)" |
| Blade Dance | "Applies 1 poison to each target" | "Ailments on 3 different targets gain +10% potency per unique target hit in cast" |
| Fan of Knives | "Applies 1 poison to all" | "Ailments applied to 3+ targets simultaneously deal 20% more damage" |
| Viper Strike | "Applies 2 poison" | "Viper Strike's base +50% potency increased to +75% while target has 3+ ailment stacks" |
| Chain Strike | "Applies 1 poison per chain" | "Each chain jump increases ailment duration by 0.5s on the next target" |

The ailment APPLICATION is automatic (from element transform). The talent
MODIFIES how that application behaves for this specific skill.

---

## 4. Ghost (Branch 2)

### Identity

**"Untouchable."** Ghost is about REACTION and SURVIVAL. You evade attacks,
counter when missed, and outlast enemies through superior defense. The
longer you survive, the more counter-damage you deal.

### Core Mechanics (Universal to Ghost)

| Mechanic | How It Appears |
|----------|---------------|
| **Defensive value** | Damage reduction, life leech, life on hit, sustain |
| **Reactive procs** | On-dodge, on-block, on-hit-taken triggers |
| **Counter damage** | Dealing damage as a result of DEFENSIVE events |
| **Fortify** | Stacking damage reduction that rewards sustained combat |
| **Endurance** | Better the longer the fight goes, anti-burst |

### Ghost Buff: SHADOW COVENANT

Ghost branch talents can reference `whileBuffActive: 'shadow'` for
conditional bonuses during Shadow Covenant. The covenant's expiry bonus
(double damage if untouched) rewards maximum evasion investment.

### Per-Skill Ghost Identity

Every skill's Ghost branch must feel different because each skill
DEFENDS differently:

| Skill | Ghost Fantasy | WHY It's Different |
|-------|-------------|-------------------|
| **Stab** | "Riposte duelist" | Fast → counter-attacks on dodge are FREE STABS. Consecutive counters ramp damage. |
| **Blade Dance** | "Evasive dancer" | Sequential AoE → each target hit grants dodge chance. Hitting 3 targets = large defensive window. |
| **Fan of Knives** | "Smoke screen" | AoE → Fan of Knives cast creates a miss-chance debuff on all enemies hit. Defensive AoE. |
| **Viper Strike** | "Serpent reflexes" | DoT → dodge triggers ailment application to ALL nearby enemies (not just attacker). Defensive = offensive. |
| **Assassinate** | "Shadow ambush" | Burst → dodge stores a "Shadow Charge." Next Assassinate with Shadow Charge has guaranteed crit. Dodge = setup. |
| **Chain Strike** | "Flash step" | Chains → each dodge increases next Chain Strike's chain count by +1. More dodges = wider chains. |
| **Shadow Mark** | "Death sentence" | Setup → Shadow Mark applied during Ghost branch has extended duration and applies Weakened curse. |
| **Blade Ward** | "Perfect guard" | Defense → Blade Ward IS the Ghost skill. Ghost talents extend ward duration, add more DR, counter-hits heal. |
| **Blade Trap** | "Mirror trap" | Delayed → dodge arms the trap instantly (no 1.5s delay). Trap detonation grants Fortify stacks. |
| **Shadow Dash** | "Phase shift" | Movement → Shadow Dash grants a brief 100% dodge chance window (0.5s). Untouchable during dash. |

### T-Level Design Constraints (Ghost)

| Tier | Role | Constraint |
|------|------|-----------|
| T1 | Foundation | Must establish a DEFENSIVE mechanic specific to this skill. Not generic "+life on hit." Instead: "each Stab hit grants +2% dodge chance for 1s" (Stab), "each Blade Dance target hit grants +3% dodge chance" (Blade Dance). |
| T2 Notable | Reactive proc | Must trigger on a DEFENSIVE EVENT (dodge/block/hit-taken) with a payoff specific to this skill. |
| T3 | Conditional stats | Three SIMPLE conditional stat choices (no procs). E.g., "+3% life leech while below 50% HP", "+10% damage for 2s after dodging", "+5 all resist per Fortify stack". Player picks 2 of 3. Must reference skill-specific defensive conditions. |
| T4 Notable | State-shift | Must create a defensive STATE triggered by this skill's interaction with defensive events (e.g., Shadow Form for Stab, Evasive Dance for Blade Dance). |
| T4b | Support behavior | SUPPORTS the T4 notable's defensive state — extends duration, adds sustain while active, or enhances the state's defensive value. No new proc system. |
| T5A | Consistent | Reliable sustain. Higher floor, always healing/mitigating. |
| T5B | Risky | Offense-from-defense. Sacrifice sustain for counter-damage. Risk/reward. |
| T6 Notable | Counter proc | Skill-specific counter-attack triggered by defensive event. Dramatic "you missed, now you die" moment. |
| T7 Keystone | Commitment | Removes defensive comfort for offensive power. Tensions with T6. E.g., "counters deal 200% damage but you can no longer heal from this skill." |

---

## 5. Archetype × Element Interactions

Archetypes don't change based on element, but some combinations are naturally
stronger or create unique playstyles:

### Natural Synergies

| Combo | Why It Works |
|-------|-------------|
| **Predator + Lightning** | Shock (+8% dmg taken per stack) amplifies burst windows. Crit → more Shock → more damage. |
| **Predator + Physical** | Bleed spike-on-enemy-action works with burst timing. Big bleeds on burst windows. |
| **Plague + Chaos** | Poison stacks infinitely, perfect for Plague's threshold mechanics. |
| **Plague + Fire** | Ignite ramps on refresh, perfect for sustained pressure. Plague's ailment potency makes Ignite massive. |
| **Ghost + Cold** | Chill slows enemy attacks = more time to dodge = more counter-procs. Defensive synergy. |
| **Ghost + Physical** | Bleed spike on enemy attack. Counter-hits apply Bleed, enemy attacks trigger Bleed spikes. Double punishment. |

### Anti-Synergies (Viable but Harder)

| Combo | Challenge |
|-------|-----------|
| **Predator + Cold** | Chill is defensive (slow), Predator is offensive (burst). No damage amp from ailment. Player must get value from Freeze (advanced, deep investment). |
| **Plague + Lightning** | Shock doesn't stack infinitely like Poison. Plague threshold mechanics have lower ceiling with 3-stack cap. |
| **Ghost + Chaos** | Poison rewards fast hits, Ghost rewards patience/evasion. Fewer hits = fewer stacks. Works but slower ramp. |

These anti-synergies should NOT be non-functional — just require more creative
talent investment to make work. A Predator + Cold build exists, it's just not
the obvious choice.

---

## 6. Combo State Modifications by Archetype

Default combo states (from SKILL_ROSTER.md) can be modified by archetype
talent investment. This is where builds TRULY diverge.

### Predator Combo Modifications (Examples)

| Default Combo | Predator Modification | Tier |
|--------------|----------------------|------|
| Exposed (from Stab) | "Exposed consumed by Assassinate deals +40% instead of +25%" | T4 |
| Deep Wound (from Viper Strike) | "Deep Wound detonation also resets Assassinate cooldown" | T6 |
| Shadow Mark (from Shadow Mark) | "Shadow Mark's guaranteed crit also applies Exposed" | T3 |
| Shadow Momentum (from Shadow Dash) | "Shadow Momentum also grants +25% crit for the empowered skill" | T4 |

### Plague Combo Modifications (Examples)

| Default Combo | Plague Modification | Tier |
|--------------|---------------------|------|
| Exposed (from Stab) | REPLACED: "Stab crits create Festering Mark — next skill's ailment potency doubled" | T3 |
| Deep Wound (from Viper Strike) | "Deep Wound is no longer consumed. Instead, while active, ALL ailments on target deal +20% damage" | T4 |
| Saturated (from Fan of Knives) | "Saturated targets' ailments spread to nearby enemies on death" | T6 |
| Chain Surge (from Chain Strike) | REPLACED: "Chain Strike chains now carry all ailments from primary target to chain targets" | T3 |

### Ghost Combo Modifications (Examples)

| Default Combo | Ghost Modification | Tier |
|--------------|---------------------|------|
| Exposed (from Stab) | REPLACED: "Stab crits create Riposte Ready — next dodge triggers a free Stab" | T3 |
| Guarded (from Blade Ward) | "Guarded now requires only 2 hits instead of 3 and also heals 5% HP" | T4 |
| Shadow Momentum (from Shadow Dash) | "Shadow Momentum also grants 100% dodge chance for 0.5s" | T4 |
| Deep Wound (from Viper Strike) | DISABLED: "Viper Strike no longer creates Deep Wound. Instead, +30% ailment potency always (no combo needed)" | T7 Keystone |

### Modification Types

| Type | Description | When to Use |
|------|-------------|-------------|
| **Enhance** | Same combo, stronger effect | T3-T4 (moderate investment) |
| **Replace** | Different combo state entirely | T3-T5 (redirects the skill's role) |
| **Extend** | Combo gains additional effects | T4-T6 (layered complexity) |
| **Disable** | Combo removed, raw power instead | T7 Keystone (trades ceiling for floor) |

---

## 7. Per-Skill Design Constraints

### The Master Rule

**No two skills may share the same node mechanic within the same archetype branch.**

This means: if Stab's Predator T1a is "consecutive hits grant guaranteed crit at
3 stacks," then NO OTHER SKILL can have "consecutive hits grant guaranteed crit"
in their Predator branch. They need a DIFFERENT mechanic.

### Constraint Matrix

For each skill × archetype combination, the node must reference the skill's
NATURAL MECHANICS:

| Skill | Natural Mechanics Available |
|-------|---------------------------|
| **Stab** | Consecutive hits, fast cycle, single-target focus |
| **Blade Dance** | Per-target distribution, kill-chain redirects, pack-size scaling |
| **Fan of Knives** | Target count, AoE, projectile, pack interactions |
| **Viper Strike** | Ailment potency, DoT, snapshot, deep wound |
| **Assassinate** | Cooldown investment, execute threshold, big hit, combo consumption |
| **Chain Strike** | Chain count, chain jump, sequential targeting |
| **Shadow Mark** | Mark duration, per-skill empowerment, setup timing |
| **Blade Ward** | Ward duration, counter-hits, damage reduction, hit count during ward |
| **Blade Trap** | Arm time, detonation trigger, trap persistence, delayed damage |
| **Shadow Dash** | Cooldown acceleration, first-strike bonus, mobility |

### Template-to-Skill Mapping

Use these templates from the v4 README behavior node library, but ONLY the
templates that match the skill's tags:

| Skill Tags | Allowed Templates |
|-----------|------------------|
| `single-hit, fast-cd` | STACK_BUILDER, COOLDOWN_EMPOWERED, CONSECUTIVE_TARGET, LETHAL_RHYTHM |
| `multi-hit, combo` | PER_HIT_RAMP, HIT_COUNT_THRESHOLD, COMBO_STATE |
| `aoe, projectile` | TARGET_COUNT_SCALING, PIERCE_CHAIN_PROC, AOE_OVERLAP |
| `dot` | DOT_STATE_CONDITIONAL, DOT_TICK_PROC, DOT_EXPIRY_BURST |
| `heavy, long-cd` | CAST_TIME_EMPOWERED, HP_THRESHOLD_CONDITIONAL, COOLDOWN_INVESTMENT |
| `chain` | CHAIN_RAMP, SHOCK_STATE_CONDITIONAL, CHAIN_RETURN |
| `utility` | SETUP_EMPOWERED, MARK_DURATION, COMBO_ENHANCEMENT |
| `defensive` | COUNTER_ATTACK, WARD_EXTENSION, DAMAGE_REDUCTION_SCALING |
| `trap` | ARM_TIME_MANIPULATION, DETONATION_SCALING, TRAP_PERSISTENCE |
| `movement` | FIRST_STRIKE, CD_ACCELERATION, PASS_THROUGH_DAMAGE |

A Stab Predator node MUST use `single-hit/fast-cd` templates.
A Blade Dance Plague node MUST use `sequential-aoe/melee` templates.
This ensures every node is skill-appropriate.

---

## 8. Anti-Duplication Rules

### Two Layers of Duplication Prevention

**Layer 1: Mechanic-Level (hard block)**
Every node mechanic is registered in `VALIDATION_LOG.md`. If two nodes
in the same archetype branch have the SAME mechanic, the second is blocked.

**Layer 2: Pattern-Level (soft warning)**
Patterns describe the SHAPE of a node — not what it does, but HOW it works.
Patterns are tracked in the Pattern Registry (VALIDATION_LOG.md). This layer
prevents "same node with different numbers" across skills.

### Pattern Registry Rules

| Count | Status | Action |
|-------|--------|--------|
| 1 skill using a pattern | Clean | No action needed |
| 2 skills using same pattern in same branch | **FLAGGED** | Review — may be acceptable if skill context makes it feel genuinely different. Document WHY it's justified. |
| 3+ skills using same pattern in same branch | **BLOCKED** | Pattern has become a template. Redesign all but the original. |

**What is a "pattern"?**
A pattern is the abstract SHAPE of a node, stripped of numbers and skill-specific nouns:
- "each hit grants dodge chance" = pattern `per-hit-grants-dodge`
- "after dodge, gain damage buff" = pattern `post-dodge-self-damage-buff`
- "+X% damage vs targets below Y% HP" = pattern `execute-threshold-damage`

Two nodes are the "same pattern" if you could describe them the same way
after removing the skill name and specific numbers.

**Important: Patterns CAN be shared if genuinely justified.** Sometimes
two skills legitimately need the same pattern because the pattern is
fundamental to the archetype (e.g., "Fortify on dodge" might appear on
multiple Ghost branches because Fortify IS the Ghost defensive mechanic).
But when a pattern appears twice, it MUST be flagged and documented with
a justification for why it's not lazy duplication.

### Mechanic-Level Validation

The Validation Log tracks exact mechanics. Before designing a new node:
1. Describe the mechanic in one sentence
2. Search VALIDATION_LOG.md mechanics table for identical mechanics
3. If a match exists, REDESIGN the node
4. If unique, add to log

**DUPLICATE (not allowed):**
- Stab Plague T1: "applies 1 additional ailment per hit"
- Blade Dance Plague T1: "applies 1 additional ailment per target"
→ Same mechanic, different skill. NOT ALLOWED.

**NOT DUPLICATE (allowed):**
- Stab Plague T1: "consecutive hits extend ailment duration by 0.3s"
- Blade Dance Plague T1: "ailments on 3 different targets gain +10% potency per unique target"
→ Both enhance ailment application, but through DIFFERENT mechanics
tied to each skill's natural rhythm. ALLOWED.

### What Counts as "Same Mechanic"

Two nodes have the "same mechanic" if swapping them between skills would
make no difference to gameplay. If the node references the skill's specific
behavior (hit count, chain jumps, ward duration, etc.), it's unique.

### Cross-Branch Duplication

Duplication is checked WITHIN an archetype across all skills, not between
archetypes. Stab's Predator T1 and Blade Dance's Predator T1 must differ.
But Stab's Predator T1 and Stab's Plague T1 CAN be thematically similar
(both reference consecutive hits) as long as the EFFECT differs (crit vs ailment).

---

## 9. Node Design Process

### Step-by-Step (Per Skill, Per Branch)

1. **Identify skill's natural mechanics** (from constraint matrix, section 7)
2. **Select 2 templates** for T1 nodes matching skill tags + archetype theme
3. **Design T2 notable** — escalating/gated proc using skill's hit rhythm
4. **Select 1 template** for T2 behavior node
5. **Design 3 T3 nodes** — divergence options within archetype (pick 2 of 3)
6. **Design T4 notable** — gated state-shift using skill + archetype interaction
7. **Design 1 T4 behavior node** — enhances T4 notable's state
8. **Design T5 choice pair** — consistent (A) vs risky (B)
9. **Design T6 notable** — dramatic proc moment, skill-specific
10. **Design T7 keystone** — tensions with T6, permanent tradeoff
11. **Register ALL mechanics in VALIDATION_LOG.md**
12. **Run validation checklist** (from v4 README section 10)

### Combo Modification Placement

Combo state modifications should appear at:
- **T3** for Replace type (early enough to redirect the build)
- **T4** for Enhance/Extend type (requires investment to amplify)
- **T6** for cascade/dramatic modifications
- **T7** for Disable type (keystone tradeoff)

### 3-Mechanic Rule

Each skill × branch combination tracks at most 3 mechanics:
1. **Skill-specific mechanic** (from T1 behavior nodes)
2. **Branch proc/state** (from T2 or T4 notable)
3. **Dramatic proc** (from T6 notable)

If a design exceeds 3 tracked mechanics, consolidate. T3 behavior nodes
and T4 behavior nodes should SUPPORT the 3 core mechanics, not add new ones.

---

## Appendix: Quick Reference Card

### Predator (Branch 0) — Burst/Tempo
- **T1**: Skill-specific crit/momentum building (behavioral)
- **T2**: Escalating proc → crit scaling window + behavior node
- **T3**: Conditional stats — deeper crits / kill chains / execute (simple, no procs)
- **T4**: Gated proc (requires setup state) + support behavior (enhances T4 state)
- **T5**: Consistent crit vs risky kill-chain
- **T6**: Catastrophic "stars aligned" moment
- **T7**: Removes comfort, weaponizes T6

### Plague (Branch 1) — Ramp/Sustain
- **T1**: Skill-specific ailment MODIFICATION (not application, behavioral)
- **T2**: Gated proc → stack threshold payoff + behavior node
- **T3**: Conditional stats — potency / duration / interaction (simple, no procs)
- **T4**: State-shift triggered by ailment thresholds + support behavior (extends state)
- **T5**: Consistent scaling vs risky detonation
- **T6**: Cascade on kill with ailments
- **T7**: Constrains to depth over breadth

### Ghost (Branch 2) — React/Survive
- **T1**: Skill-specific defensive mechanic (behavioral)
- **T2**: Reactive proc → on-dodge/block/hit payoff + behavior node
- **T3**: Conditional stats — sustain / counter-damage / Fortify (simple, no procs)
- **T4**: Defensive state-shift + support behavior (enhances defensive state)
- **T5**: Consistent sustain vs risky offense-from-defense
- **T6**: Counter-attack proc on defensive event
- **T7**: Removes defense for offense, tensions with T6

# Dagger Skill Roster (v2.1)

> Defines all 10 dagger active skills + 3 buff skills.
> Each skill has a unique mechanical identity INDEPENDENT of element choice.
> Element transforms change damage type and ailment, not the skill's core mechanic.
>
> **Reference:** See ELEMENT_SYSTEM.md for how transforms work.
> **Reference:** See ENGINE_CHANGES.md for GCD/speed stat rework.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [How Skills Cast](#2-how-skills-cast)
3. [Skill Roster Overview](#3-skill-roster-overview)
4. [Skill Details](#4-skill-details)
5. [Combo State System](#5-combo-state-system)
6. [Rotation Examples](#6-rotation-examples)
7. [Buff Skills](#7-buff-skills)
8. [Removed / Reworked Skills](#8-removed--reworked-skills)
9. [Skill Slot Strategy](#9-skill-slot-strategy)

---

## 1. Design Principles

### Every Skill Must Answer Three Questions

1. **"Why would I slot this over another skill?"** — There must be a clear, unique reason.
2. **"What does this skill do that no other skill does?"** — Zero mechanical overlap.
3. **"How does this interact with my other 3 skills?"** — Combo potential, rotation role.

### Dagger Role Coverage

These are the roles the dagger kit covers. Other weapons will cover different
role combinations that fit their identity — this is NOT a universal template.

| Role | Skill | Why Daggers Have It |
|------|-------|-------------------|
| Filler | Stab | Fast weapon needs a spammable baseline |
| Sequential AoE | Blade Dance | Targeted strikes across pack = dagger agility |
| AoE | Fan of Knives | Thrown knives = projectile dagger fantasy |
| DoT Specialist | Viper Strike | Poison/bleed = assassin fantasy |
| Burst / Execute | Assassinate | The perfect kill = assassin fantasy |
| Chain | Chain Strike | Quick dash between targets = dagger agility |
| Setup / Utility | Shadow Mark | Mark for death = assassin fantasy |
| Defensive | Blade Ward | Parry/riposte = duelist fantasy |
| Trap / Delayed | Blade Trap | Hidden blade trap = assassin fantasy |
| Movement | Shadow Dash | Shadow step = rogue fantasy |

### Element Neutrality

No skill has a baked-in damage type. All skills start with a default element and
can be transformed to any element at skill level 5. The skill's MECHANIC is what
defines it, not its element.

See ELEMENT_SYSTEM.md for full transform rules.

---

## 2. How Skills Cast

### The Idle Rotation

Skills are equipped in 4 slots and **auto-cast left to right**:
1. Engine checks slot 1 — if off cooldown, cast it, apply GCD
2. After GCD, check slot 2 — if off cooldown, cast it, apply GCD
3. Continue through slots 3, 4, then loop back to slot 1
4. If a skill is on cooldown, skip to next slot

### Timing Stats

There are NO cast times. All skills are instant. The pacing comes from:

| Stat | What It Does | Example |
|------|-------------|---------|
| **GCD** | Minimum time between ANY two skill casts | Base 1.0s, compressed by action speed |
| **Skill Cooldown** | Per-skill timer before it can fire again | Stab 3s, Assassinate 8s |
| **Attack Speed** | Reduces cooldown recovery for Attack-tagged skills | +20% = Stab's 3s CD recovers in 2.5s |

See ENGINE_CHANGES.md for full speed stat rework proposal.

### Future: Manual Cast Mode

A toggle for "manual cast" where players click abilities in any order is planned
but not yet implemented. Some skill designs (like combo ordering) will shine more
in manual mode, but everything must work in auto-cast first.

---

## 3. Skill Roster Overview

| # | ID | Name | Role | Hits | WD% | CD | Mechanic Summary |
|---|-----|------|------|------|-----|----|------------------|
| 1 | `dagger_stab` | Stab | Filler | 1 | 100% | 3s | Fast, cheap, consecutive hit rewards |
| 2 | `dagger_blade_dance` | Blade Dance | Sequential AoE | 3 | 30%/hit | 5s | Hits 3 different enemies (1 per hit) |
| 3 | `dagger_fan_of_knives` | Fan of Knives | AoE | 1 (all mobs) | 60% | 5s | Hits all enemies, target count scaling |
| 4 | `dagger_viper_strike` | Viper Strike | DoT Specialist | 1 | 70% | 5s | Deep wound, +50% ailment potency |
| 5 | `dagger_assassinate` | Assassinate | Burst / Execute | 1 | 220% | 8s | Massive single hit, combo consumer |
| 6 | `dagger_chain_strike` | Chain Strike | Chain | 1+chains | 65% | 4s | Primary + chains to nearby enemies |
| 7 | `dagger_shadow_mark` | Shadow Mark | Setup / Utility | 1 | 50% | 6s | Marks target, empowers next skill |
| 8 | `dagger_blade_ward` | Blade Ward | Defensive | 1 | 60% | 7s | Damage + 15% DR window + counter-hits |
| 9 | `dagger_blade_trap` | Blade Trap | Trap / Delayed | 1 (AoE) | 150% | 10s | Place trap, detonates on enemy attack |
| 10 | `dagger_shadow_dash` | Shadow Dash | Movement | 1 | 80% | 5s | Dash + empowers next skill |

---

## 4. Skill Details

### Skill 1: STAB

**Role:** Filler — always castable, lowest cooldown, bread-and-butter

| Property | Value |
|----------|-------|
| Base Damage | 0 (weapon scaling only) |
| Weapon Damage % | 100% |
| Cooldown | 3s |
| Hit Count | 1 |
| Tags | Attack, Melee, Single-Target |

**Core Mechanic:** Fast single-target hit. The skill you cast when everything else
is on cooldown. Rewards consecutive use — talent trees enhance consecutive hit
bonuses, guaranteed crits on streaks, and momentum building.

**Why Slot It:** Reliable damage, shortest cooldown, combo opener. Creates the
Exposed state that other skills consume.

**What Makes It Unique:** Fastest cycle time. Best at building and maintaining
consecutive hit stacks. No other skill rewards staying on one target as much.

**Default Combo State Created:** EXPOSED
> Stab crits apply Exposed (3s). The next NON-STAB skill that hits an Exposed
> target consumes it for +25% damage. Stab itself cannot consume Exposed.

---

### Skill 2: BLADE DANCE

**Role:** Sequential AoE — targeted multi-enemy strikes

| Property | Value |
|----------|-------|
| Base Damage | 2 |
| Weapon Damage % | 30% per hit (90% total if 3 targets) |
| Cooldown | 5s |
| Hit Count | 3 (each hits a DIFFERENT enemy) |
| Tags | Attack, Melee, Sequential-AoE |

**Core Mechanic:** 3 rapid strikes, each targeting a DIFFERENT enemy in the pack.
Hit 1 strikes front mob, Hit 2 strikes 2nd mob, Hit 3 strikes 3rd mob. If fewer
than 3 mobs exist, remaining hits DON'T fire — making Blade Dance naturally weak
on single targets and strong on packs of 3+.

**Why Slot It:** Best skill for 2-3 mob encounters. Fan of Knives hits everything
but at moderate damage. Blade Dance focuses on exactly 3 targets with individual
ailment application per target. Also enables "Plague Link" and kill-chain mechanics
via talent trees.

**What Makes It Unique:** Only sequential-target skill. Each hit targets a different
enemy — no other skill distributes damage this way. Natural single-target penalty
(1 mob = only 30% WD) means it's never a Stab replacement. Creates interesting
pack-size decisions: slot it for pack content, bench it for boss fights.

**Default Combo State Created:** DANCE MOMENTUM
> If all 3 hits land on 3 different targets, gain Dance Momentum (4s):
> your next single-target skill also hits 1 adjacent enemy for 50% of its
> damage. Consumed on next skill cast.

**Design Notes:**
- The 30% WD per hit is deliberately low. On a single boss, Blade Dance does
  30% WD total vs Stab's 100%. This is the cost of multi-target utility.
- Ailment application: each hit applies one ailment to its target independently.
  3 targets each get 1 ailment at 30% WD snapshot — individually weak, but
  3 targets are now ailmented simultaneously.
- Talent trees can modify targeting (Predator: kills redirect hits to new targets,
  Plague: link targets together, Ghost: hits prioritize enemies attacking you).

---

### Skill 3: FAN OF KNIVES

**Role:** AoE — pack clear, multi-target

| Property | Value |
|----------|-------|
| Base Damage | 4 |
| Weapon Damage % | 60% |
| Cooldown | 5s |
| Hit Count | 1 (hits all enemies in pack) |
| Tags | Attack, Projectile, AoE |

**Core Mechanic:** Throws knives that hit ALL enemies in the current encounter.
Damage scales with target count via talent nodes. Applies ailment to every
target hit.

**Why Slot It:** The only true AoE skill. Essential for pack clearing. Applies
ailments to the entire pack at once.

**What Makes It Unique:** Hits every mob simultaneously. No other skill touches
more than the front mob (+ chain targets). AoE-specific talent nodes scale
damage per target hit.

**Default Combo State Created:** SATURATED (conditional, passive)
> If Fan of Knives hits 3+ enemies that already have an active ailment, those
> enemies become Saturated (4s). Saturated enemies take +15% DoT damage.
> Not consumed — benefits all skills for the duration.

---

### Skill 4: VIPER STRIKE

**Role:** DoT Specialist — highest ailment potency per hit

| Property | Value |
|----------|-------|
| Base Damage | 2 |
| Weapon Damage % | 70% |
| Cooldown | 5s |
| Hit Count | 1 |
| Tags | Attack, Melee, DoT |
| Special | +50% ailment potency (ailments snapshot at 1.5x) |

**Core Mechanic:** Single heavy strike that applies ailments at **150% potency**.
The ailment snapshot from Viper Strike is 50% stronger than from any other skill.
This makes it the best skill for applying HIGH-VALUE ailment instances.

**Why Slot It:** If your build cares about ailment damage (poison, bleed, ignite),
Viper Strike applies the strongest instances. One Viper Strike poison instance
out-damages three Blade Dance poison instances (each at 30% WD snapshot).

**What Makes It Unique:** +50% ailment potency is exclusive to this skill. No other
skill enhances its own ailment snapshot. Talent trees can push this further.

**Default Combo State Created:** DEEP WOUND
> Viper Strike's ailment is flagged as a Deep Wound. When a target with an active
> Deep Wound is hit by Assassinate, the Deep Wound's remaining duration is consumed
> instantly as burst damage (all remaining ticks fire at once).

---

### Skill 5: ASSASSINATE

**Role:** Burst / Execute — biggest single hit, finisher

| Property | Value |
|----------|-------|
| Base Damage | 12 |
| Weapon Damage % | 220% |
| Cooldown | 8s |
| Hit Count | 1 |
| Tags | Attack, Melee, Single-Target, Heavy |

**Core Mechanic:** Massive single hit with the highest base damage and weapon
scaling of any dagger skill. Longest cooldown — the "spend everything on one
big hit" skill.

**Why Slot It:** Raw burst damage. Execute scaling via talents. Consumes combo
states (Exposed, Deep Wound) for massive payoffs. The capstone of any rotation.

**What Makes It Unique:** Highest damage per cast by far (220% WD + 12 flat).
Talent trees add execute thresholds, cooldown resets on kill, and combo
consumption mechanics.

**Default Combo States Consumed:** EXPOSED (from Stab), DEEP WOUND (from Viper Strike)
> - Exposed: +25% damage (consumed)
> - Deep Wound: consumes remaining ailment duration as instant burst damage
> - Both can stack: Stab (expose) -> Viper Strike (deep wound) -> Assassinate
>   (consume both for massive burst)

---

### Skill 6: CHAIN STRIKE (rework of Lightning Lunge)

**Role:** Chain — sequential multi-target, spreading

| Property | Value |
|----------|-------|
| Base Damage | 3 |
| Weapon Damage % | 65% |
| Cooldown | 4s |
| Hit Count | 1 + 2 chains (default) |
| Tags | Attack, Melee, Chain |

**Core Mechanic:** Strikes the primary target, then chains to 2 nearby enemies.
Each chain hit applies ailments independently. Chain count can be increased
via talent nodes.

**Why Slot It:** Multi-target damage without being full AoE. Good for spreading
ailments to 2-3 targets. Short cooldown for frequent chaining.

**What Makes It Unique:** Only chain skill. Chains are sequential (not simultaneous
like Fan of Knives AoE). Talent nodes can make chains ramp damage per jump
or spread specific debuffs.

**Default Combo State Created:** CHAIN SURGE
> If Chain Strike chains to 3+ enemies total, your next single-target skill
> also chains to 1 additional enemy (the skill temporarily becomes multi-target).

**Design Notes:** Reworked from "Static Chain (+20% damage)" to a more unique
mechanic — making a single-target skill chain is something no flat damage bonus
can replicate.

---

### Skill 7: SHADOW MARK (rework of Smoke Screen)

**Role:** Setup / Utility — debuff applicator, next-skill empowerment

| Property | Value |
|----------|-------|
| Base Damage | 0 |
| Weapon Damage % | 50% |
| Cooldown | 6s |
| Hit Count | 1 |
| Tags | Attack, Melee, Utility |

**Core Mechanic:** Low-damage strike that applies **Shadow Mark** to the target.
Shadow Mark empowers the next skill used against the marked target. The
empowerment depends on what skill follows.

**Why Slot It:** Pure setup skill. Shadow Mark makes your next skill significantly
better. Trade one GCD of low damage for a big payoff on the follow-up.

**What Makes It Unique:** The only dedicated setup skill. Its entire value is in
the Mark it applies. No other skill creates a "next skill is empowered" state.

**Default Combo State Created:** SHADOW MARK (debuff on target, 5s)
> The next skill that hits this target gains a bonus:
> - Stab: guaranteed crit
> - Blade Dance: all 3 hits target the SAME enemy (focused burst instead of spread)
> - Fan of Knives: +30% AoE damage
> - Viper Strike: +50% additional ailment potency (stacks with base +50%)
> - Assassinate: cooldown refunded by 50%
> - Chain Strike: +2 additional chains
> - Blade Ward: counter-hits during ward deal double damage
> - Blade Trap: +50% trap detonation damage
> - Shadow Dash: next skill AFTER dash also benefits from the mark (double dip)
>
> Consumed on use. Only one mark active at a time.

---

### Skill 8: BLADE WARD (NEW — defensive active)

**Role:** Defensive — damage reduction window with counter-attacks

| Property | Value |
|----------|-------|
| Base Damage | 3 |
| Weapon Damage % | 60% |
| Cooldown | 7s |
| Hit Count | 1 |
| Tags | Attack, Melee, Defensive |

**Core Mechanic:** Strike the target for moderate damage and gain **Blade Ward
(3s)**: 15% damage reduction. While Blade Ward is active, any time you are hit,
dodge, or block, the attacker takes a counter-hit for 50% weapon damage.

**Why Slot It:** Survivability. You're trading a damage slot for a 3s defensive
window with counter-attack damage. Builds pushing content above their gear level
want this. Builds farming easy content don't need it.

**What Makes It Unique:** Only defensive active skill. The damage reduction window
is unique — no other skill provides DR. Counter-hits work with all armor types
(dodge, block, OR taking damage all trigger them).

**Default Combo State Created:** GUARDED (conditional)
> If you receive 3+ hits (hit/dodged/blocked) during a single Blade Ward window,
> your next skill gains +20% damage. Rewards surviving sustained pressure.

**Armor Type Interaction:**
- **Plate:** Gets hit through armor, triggers counter-hits reliably, reaches GUARDED easily
- **Leather:** Dodges trigger counter-hits frequently, but 3-hit GUARDED threshold is harder
  (Ghost talents can extend ward duration to compensate)
- **Cloth:** Takes big hits, triggers counter-hits, reaches GUARDED easily, but NEEDS the 15% DR

---

### Skill 9: BLADE TRAP (NEW — delayed burst)

**Role:** Trap / Delayed — area denial, burst on trigger

| Property | Value |
|----------|-------|
| Base Damage | 8 |
| Weapon Damage % | 150% |
| Cooldown | 10s |
| Hit Count | 1 (AoE on detonation) |
| Arm Time | 1.5s after placement |
| Tags | Attack, AoE, Trap |

**Core Mechanic:** Place a blade trap. After a 1.5s arm time, the trap detonates
on the next enemy attack, dealing 150% weapon damage as AoE to all enemies.
Applies ailment to all targets hit.

**Why Slot It:** Set-and-forget burst AoE. Place it, keep fighting with other skills.
When it detonates, it's a massive AoE hit. Great for boss fights (bosses attack
frequently so detonation is reliable) and pack clear.

**What Makes It Unique:** Only delayed-damage skill. Damage happens LATER, triggered
by enemy behavior. Longest cooldown (10s) but highest single-instance AoE damage.

**Default Combo State Interaction:**
> Blade Trap deals +50% damage to Shadow Marked targets. If the target has
> Shadow Mark when the trap detonates, the mark is consumed and trap damage
> becomes 225% WD instead of 150%.

**Design Notes:**
- Arm time (1.5s) prevents it from being strictly better than Fan of Knives.
- In idle auto-rotation, trap is placed and detonates naturally as mobs attack.
- Talent trees can add: "trap persists between encounters", "trap applies 2x
  ailment stacks", "place 2 traps", "no arm time."

---

### Skill 10: SHADOW DASH (NEW — movement/accelerator)

**Role:** Movement / Gap-closer — reposition + next-skill empowerment

| Property | Value |
|----------|-------|
| Base Damage | 3 |
| Weapon Damage % | 80% |
| Cooldown | 5s |
| Hit Count | 1 |
| Tags | Attack, Melee, Movement |

**Core Mechanic:** Dash to the target dealing 80% weapon damage. The next skill
cast has its cooldown start recovering 2s earlier (effectively -2s cooldown on
the follow-up skill).

**Why Slot It:** Rotation accelerator. Shadow Dash -> Assassinate means Assassinate's
8s cooldown effectively becomes 6s. Over a long fight, this significantly increases
burst frequency.

**What Makes It Unique:** Only movement skill. The cooldown acceleration on next
skill is exclusive to Shadow Dash. No other skill speeds up your rotation this way.

**Default Combo State Created:** SHADOW MOMENTUM (2s)
> Next skill's cooldown starts recovering 2s earlier. Consumed on next skill cast.

**Design Notes:**
- In idle auto-rotation, Shadow Dash fires in its slot order and the next skill
  in rotation gets the cooldown benefit automatically.
- The -2s cooldown benefit is strongest on long-CD skills:
  Assassinate 8s -> 6s (25% faster), Blade Trap 10s -> 8s (20% faster),
  Stab 3s -> 1s (66% faster — Stab becomes nearly instant cycle).
- Talent trees can add: "Shadow Dash resets on kill", "Shadow Dash grants
  +20% crit for 2s", "+1 chain on dash target."

---

## 5. Combo State System

### Overview

Skills create **Combo States** — temporary buffs or debuffs that other skills can
consume for bonuses. Combos are REWARDING but NOT REQUIRED. A skill works fine
without a combo state active; the combo just makes it better.

### Core Combo Table (Defaults)

| State | Created By | Duration | Type | Effect |
|-------|-----------|----------|------|--------|
| **Exposed** | Stab (on crit) | 3s | Consumed by next non-Stab skill | +25% damage |
| **Dance Momentum** | Blade Dance (all 3 hits on 3 targets) | 4s | Consumed by next skill | Next single-target skill also hits 1 adjacent enemy for 50% damage |
| **Saturated** | Fan of Knives (3+ ailmented targets) | 4s | Passive (not consumed) | Affected targets take +15% DoT |
| **Deep Wound** | Viper Strike (ailment applied) | Ailment duration | Consumed by Assassinate | Remaining ticks fire as instant burst |
| **Chain Surge** | Chain Strike (3+ targets chained) | 3s | Consumed by next single-target skill | That skill also chains to +1 enemy |
| **Shadow Mark** | Shadow Mark (on target) | 5s | Consumed by next skill on target | Per-skill bonus (see Skill 7) |
| **Guarded** | Blade Ward (3+ hits during ward) | 3s | Consumed by next skill | +20% damage |
| **Shadow Momentum** | Shadow Dash (on cast) | 2s | Consumed by next skill | Next skill's CD starts 2s earlier |

*Note: Blade Trap does not create a combo state. It consumes Shadow Mark for +50% damage.*

### Combo Modification by Talents

**These combo states are the DEFAULTS** — what you get with zero talent investment.
Talent trees can **redirect, replace, or disable** combo states:

**Redirect:** Change what triggers or consumes the combo.
> Example: Predator T4 — "Assassinate now also consumes Exposed from Chain Strike crits,
> not just Stab crits."

**Replace:** Swap the combo state for a different one entirely.
> Example: Plague T3 — "Stab no longer creates Exposed. Instead, Stab crits create
> Festering Mark — next skill's ailment potency is doubled."

**Disable:** Remove the combo for raw power.
> Example: Predator T7 keystone — "Assassinate no longer consumes combo states.
> Instead, always deals +40% damage. (Trades combo ceiling for consistency.)"

This is where archetype branches create truly different builds from the same skills.
See ARCHETYPE_GUIDE.md for how each archetype modifies combo states.

### Combo Design Rules

1. **No skill consumes its own combo state.** Stab creates Exposed but can't consume it.
2. **Combo states are bonus damage, not required damage.** A skill without a combo
   state active still deals its full base damage.
3. **Only one instance of each state at a time.** Refreshes on reapplication, doesn't stack.
4. **Passive states (Saturated) aren't consumed.** They benefit everything for their duration.
5. **Combo states work with ANY element.** Exposed from Physical Stab benefits
   Cold Assassinate just the same.
6. **Talent trees can modify combo states.** See section above.

### Combo Chains (Multi-State Stacking)

Some combos layer:
- **Stab (Exposed) -> Viper Strike (Deep Wound) -> Assassinate (consumes BOTH)**
  = +25% from Exposed + instant burst from Deep Wound.
- **Shadow Mark -> Shadow Dash -> Assassinate**
  = Mark gives -50% CD refund. Dash gives -2s CD recovery.
  Result: Assassinate fires faster AND refunds half its cooldown.
- **Chain Strike (Chain Surge) -> Stab (Exposed) -> Assassinate**
  = Assassinate chains to +1 target AND gets +25% from Exposed.

---

## 6. Rotation Examples

### Rotation A: "Combo Assassin" (Burst focused)

**Skills:** Stab, Viper Strike, Assassinate, Shadow Mark
**Element:** Physical (bleed) or Chaos (poison)

**Auto-rotation flow:**
1. Shadow Mark → marks target (empowers next skill)
2. Stab → guaranteed crit (from mark), creates Exposed
3. Viper Strike → Deep Wound applied, mark gives +50% potency
4. Assassinate → consumes Exposed (+25%) + Deep Wound (instant burst)
5. Stab filler until Assassinate returns

**Identity:** Setup-heavy, huge burst windows, weaker sustained DPS.

---

### Rotation B: "Ailment Ramper" (DoT focused)

**Skills:** Blade Dance, Viper Strike, Fan of Knives, Shadow Dash
**Element:** Chaos (poison) or Fire (ignite)

**Auto-rotation flow:**
1. Blade Dance → ailments on 3 different targets, gain Dance Momentum
2. Viper Strike → high-potency ailment on front, Dance Momentum splashes to adjacent
3. Fan of Knives → spread ailments to full pack, apply Saturated
4. Shadow Dash → hit + next cycle's Blade Dance gets -2s CD
5. Repeat — ailments spreading across pack, Saturated amplifies DoTs

**Identity:** Pure sustained DPS. No burst, but everything melts to ailments.

---

### Rotation C: "Speed Blitzer" (fast kill chain)

**Skills:** Stab, Chain Strike, Shadow Dash, Assassinate
**Element:** Lightning (shock amp) or Physical (bleed)

**Auto-rotation flow:**
1. Stab → crit = Exposed
2. Chain Strike → chains to 3 targets, gain Chain Surge
3. Shadow Dash → hit + Shadow Momentum (-2s CD on next)
4. Assassinate → +25% from Exposed + chains to +1 target from Chain Surge + faster CD
5. If kill: repeat at speed

**Identity:** Speed. Chaining kills, spreading to multiple targets, fast rotation.

---

### Rotation D: "Fortress" (defensive, sustained)

**Skills:** Blade Ward, Viper Strike, Fan of Knives, Blade Trap
**Element:** Cold (chill defense) or Fire (ignite ramp)

**Auto-rotation flow:**
1. Blade Ward → 60% WD hit + 15% DR for 3s + counter-hits
2. Viper Strike → deep wound on front
3. Fan of Knives → AoE + Saturated if 3+ ailmented
4. Blade Trap → placed, detonates for 150% AoE during next cycle
5. Guarded procs if 3+ hits during ward → next Viper Strike gets +20%

**Identity:** Methodical. Survive, apply ailments, let them work. Blade Trap provides
burst you don't have to think about.

---

## 7. Buff Skills

### Design Rule

Each weapon has exactly **3 buff skills**. Each buff belongs to one archetype
(Predator, Plague, Ghost). A buff should feel weak if you haven't invested in
its archetype's talent branch.

Buff skills are equippable in the 4-slot skill bar alongside active skills.
They auto-cast on cooldown during idle rotation. Slotting a buff means
sacrificing an active skill slot — a real tradeoff.

### Buff 1: PREDATOR'S MARK (Predator archetype)

| Property | Value |
|----------|-------|
| Duration | 10s |
| Cooldown | 45s |

**Effect:** Mark yourself as a predator. During Predator's Mark:
- Crits deal +40% damage
- Each crit extends duration by 1s (max +5s extension)
- If the current target dies during Predator's Mark, cooldown reduced by 50%

**Archetype Synergy:** Predator branch talents reference `whileBuffActive: predator`
for conditional bonuses. Without Predator branch investment, the buff is just
+40% crit damage — decent but not build-defining.

---

### Buff 2: VENOM COVENANT (Plague archetype)

| Property | Value |
|----------|-------|
| Duration | 12s |
| Cooldown | 50s |

**Effect:** Enter a toxic frenzy. During Venom Covenant:
- Each ailment application grants +3% attack speed (max 10 stacks = +30%)
- When Venom Covenant expires, all enemies with 5+ ailment stacks take burst
  damage equal to 40% of total stacked snapshot damage

**Archetype Synergy:** Plague branch talents reference `whileBuffActive: covenant`
for ailment potency bonuses. The expiry burst rewards stacking ailments during
the window — Plague builds with fast ailment application get massive payoff.

---

### Buff 3: SHADOW COVENANT (Ghost archetype)

| Property | Value |
|----------|-------|
| Duration | 8s |
| Cooldown | 55s |

**Effect:** Enter Shadow Form. During Shadow Covenant:
- Each dodge triggers a counter-attack dealing 100% weapon damage
- Each successful counter extends duration by 0.5s (max +4s)
- If Shadow Form expires without you taking a hit, next skill deals double damage

**Archetype Synergy:** Ghost branch talents reference `whileBuffActive: shadow`
for defensive bonuses. The "no damage taken" expiry condition rewards evasion
investment — Ghost builds with high dodge get both counter-attacks AND
the double damage payoff.

---

## 8. Removed / Reworked Skills

| Old Skill | New Skill | Reason |
|-----------|-----------|--------|
| Smoke Screen (`dagger_smoke_screen`) | Shadow Mark (`dagger_shadow_mark`) | Identity overlapped with Viper Strike (both chaos, similar stats). Reworked into pure setup/utility with unique mark mechanic. |
| Lightning Lunge (`dagger_lightning_lunge`) | Chain Strike (`dagger_chain_strike`) | Removed baked-in lightning element. Core "chain" mechanic preserved. Renamed for element neutrality. |
| Frost Fan (`dagger_fan_of_knives`) | Fan of Knives (element removed) | Removed baked-in cold. AoE mechanic preserved. |
| Lethality (passive) | REMOVED (v3.1) | Effects redistributed into branch notables. |
| Lacerate (channel, planned) | Blade Ward (`dagger_blade_ward`) | Channeling doesn't work in idle auto-cast rotation. Replaced with defensive active that works in left-to-right casting. |

---

## 9. Skill Slot Strategy

### 4 Active Skill Slots

Players equip 4 of the 10 active skills (+ optionally 1 buff instead of an active).
With 10 skills available, 6 are benched. This creates real build identity.

### Key Tradeoffs

- **Slotting Shadow Mark** = sacrificing a damage skill for setup utility. Worth it
  if your rotation benefits from the per-skill empowerment.
- **Slotting Blade Ward** = sacrificing a damage skill for survivability. Worth it
  if you're pushing hard content.
- **Slotting Blade Trap** = 10s CD skill that's amazing when it fires but a dead slot
  while on cooldown. Worth it for big AoE burst.
- **Slotting a buff** = one less active skill, but buffs can be very strong with
  archetype investment.
- **Not slotting Stab** = no Exposed combo state. Is the burst loss worth the slot?
- **Slotting both Stab AND Chain Strike** = great filler coverage but sacrifices a
  damage or utility slot.

### Build Diversity Check

With 10 active skills and 4 slots, there are **210 possible combinations**.
Each combination has a different feel because:
1. Different combo states available (based on what's slotted)
2. Different filler coverage (Stab vs Chain Strike vs neither)
3. Different AoE capability (Fan of Knives vs Blade Trap vs neither)
4. Different burst capability (Assassinate vs Blade Trap vs neither)
5. Different survivability (Blade Ward or no Blade Ward)

No combination should feel non-functional. Some are optimal for bosses, some for
packs, some for speed, some for survival.

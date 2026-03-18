# Element Transform System (v1.0)

> Defines how damage types, ailments, and element transforms work across all weapons.
> This is a UNIVERSAL system — daggers are the first implementation, but the rules
> apply to every weapon type.

---

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Damage Types](#2-damage-types)
3. [Element Transforms](#3-element-transforms)
4. [Ailment System](#4-ailment-system)
5. [Advanced Ailments](#5-advanced-ailments)
6. [Element + Talent Interaction](#6-element--talent-interaction)
7. [Weapon Base Damage](#7-weapon-base-damage)
8. [Gear Stat Scaling](#8-gear-stat-scaling)
9. [Mob Resistances (Future)](#9-mob-resistances-future)
10. [Design Rules](#10-design-rules)

---

## 1. Core Concept

Every active skill starts with a **default damage type**. At **skill level 5**,
the player unlocks the **Element Transform** selector — a separate choice from the talent tree.

The transform changes:
- The skill's **damage type** (Physical -> Cold, Fire, Lightning, Chaos)
- The skill's **signature ailment** (auto-applied on hit)
- The skill's **display name** (Stab -> Frost Stab, Searing Stab, etc.)
- A small set of **element-specific passive bonuses** (2-3 per transform)

The transform does NOT change:
- The skill's **base mechanics** (Stab is still fast single-target, Blade Dance still hits 3 targets)
- The skill's **talent tree structure** (same 3 branches, same 39 nodes)
- The skill's **archetype** (Predator/Plague/Ghost investment is independent)

### Why Transforms Instead of Conversion

Conversion (30% physical -> cold) is math that players must calculate to understand.
Transforms are a clear binary choice: "My Stab IS a cold skill now." The skill changes
name, damage type, and ailment. No partial math, no stacking conversion sources.

### Respeccing

- Changing element resets the skill to **level 5** (not level 1)
- Costs **gold** (same as talent respec)
- Talent points are NOT reset (tree stays the same)
- Players keep their earned talent investment, just redirect the element

---

## 2. Damage Types

Five damage types (Holy planned as sixth):

| Type | Identity | Gear Stats | Signature Ailment |
|------|----------|-----------|-------------------|
| **Physical** | Raw weapon damage, direct | +phys damage, +phys%, phys pen | Bleed |
| **Fire** | Ramping pressure, inevitability | +fire damage, +fire%, fire pen | Ignite |
| **Cold** | Control, survival, shatter | +cold damage, +cold%, cold pen | Chill |
| **Lightning** | Amplification, burst windows | +lightning damage, +lightning%, lightning pen | Shock |
| **Chaos** | Sustained DoT, stacking | +chaos damage, +chaos%, chaos pen | Poison |
| **Holy** (future) | Utility, anti-debuff | +holy damage, +holy%, holy pen | Blind |

### Damage Type Fantasy

- **Physical**: "I hit hard. My weapon IS the build."
- **Fire**: "Everything burns. The longer you live, the worse it gets."
- **Cold**: "I control the fight. You're slow, I'm safe."
- **Lightning**: "You take more damage from everything. I enable combos."
- **Chaos**: "Death by a thousand cuts. Inevitable, stacking doom."

---

## 3. Element Transforms

### Transform Structure

Each transform provides:

```
1. Damage type change (all damage dealt by this skill becomes X)
2. Signature ailment (auto-applied on hit, no talent required)
3. 2-3 element-specific passive bonuses (small, flavorful)
4. Name change (cosmetic)
```

### Example: Stab Transforms

| Transform | Name | Damage | Signature Ailment | Passive Bonuses |
|-----------|------|--------|-------------------|-----------------|
| Physical (default) | Stab | Physical | Bleed (100%) | +5% crit chance, +3 flat phys |
| Fire | Searing Stab | Fire | Ignite (100%) | +8% vs Ignited, ignite refreshes on hit |
| Cold | Frost Stab | Cold | Chill (100%) | +10% vs Chilled, +5% attack speed vs chilled |
| Lightning | Shock Stab | Lightning | Shock (100%) | +8% damage to shocked, shock extends on hit |
| Chaos | Venom Stab | Chaos | Poison (1 stack) | +10% vs Poisoned, +5% ailment duration |

### Design Rules for Transforms

1. **All transforms grant 100% signature ailment.** Every element choice immediately
   changes how the skill feels. Physical = guaranteed bleed, Cold = guaranteed chill, etc.
2. **Passive bonuses are small and self-reinforcing** (damage vs your own ailment,
   duration extension, etc.). They shouldn't be build-defining — that's the talent tree's job.
4. **Every skill has all 5 transforms.** No skill is "locked" to an element.
5. **The default (Physical) is always viable.** Never a trap choice.

### Transform Naming Convention

`{Element Prefix} {Base Skill Name}` or a thematic rename:

| Element | Prefix Pattern | Examples |
|---------|---------------|----------|
| Physical | (no prefix, base name) | Stab, Assassinate, Blade Dance |
| Fire | Searing, Ember, Infernal | Searing Stab, Ember Flurry, Infernal Strike |
| Cold | Frost, Glacial, Frozen | Frost Stab, Glacial Flurry, Frozen Fangs |
| Lightning | Shock, Voltaic, Thunder | Shock Stab, Voltaic Flurry, Thunder Strike |
| Chaos | Venom, Blight, Nether | Venom Stab, Blight Flurry, Nether Strike |

---

## 4. Ailment System

All ailments snapshot from hit damage and scale with gear. The **delivery mechanic**
is what makes each ailment unique, not the scaling source.

### Signature Ailments (5)

#### Bleed (Physical)
- **Delivery**: Stacking DoT. Each stack ticks passively, but **spikes when the enemy
  attacks or casts** (each enemy action triggers bonus damage equal to 50% of one
  stack's tick value).
- **Stacking**: Up to 5 stacks (stackable, FIFO snapshots)
- **Scaling**: Snapshot from hit damage. Scales with DoT multiplier, ailment duration,
  physical damage%.
- **Identity**: Best vs bosses (fast-attacking enemies trigger more spikes). Punishes
  aggressive enemies.
- **Duration**: 4s per stack, refreshed on reapplication

#### Ignite (Fire)
- **Delivery**: Single strong DoT that **ramps on refresh**. Each hit that re-applies
  Ignite adds the new snapshot to the existing Ignite (they merge, not stack separately).
  The longer you maintain Ignite, the stronger it gets.
- **Stacking**: Not stack-based. Single debuff with accumulating damage value.
- **Scaling**: Snapshot from hit damage. Scales with DoT multiplier, ailment duration,
  fire damage%.
- **Identity**: Best for sustained pressure on one target. Rewards continuous hitting.
  Falls off if you switch targets (resets accumulation).
- **Duration**: 4s, refreshed on each hit (resets timer, adds damage)

#### Chill (Cold)
- **Delivery**: **Not a DoT.** Reduces enemy attack speed by 20%.
- **Stacking**: Non-stackable. Single debuff, refreshes duration.
- **Scaling**: Duration scales with ailment duration%. Effect (attack speed reduction)
  is flat 20% baseline, can be enhanced by talent nodes.
- **Identity**: Defensive ailment. You survive better. Enemies deal less DPS to you.
  Enables Freeze (advanced ailment) on deeply chilled targets.
- **Duration**: 3s, refreshed on hit

#### Shock (Lightning)
- **Delivery**: **Not a DoT.** Target takes 8% increased damage from ALL sources.
- **Stacking**: Stackable to 3. Each stack adds +8% damage taken (24% at max).
- **Scaling**: Stack count scales with hit frequency. Effect per stack can be enhanced
  by talent nodes.
- **Identity**: Offensive amplifier. Doesn't deal damage itself but multiplies everything
  else. Best when combined with high-damage skills or party members (future).
- **Duration**: 3s per stack, refreshed independently

#### Poison (Chaos)
- **Delivery**: Instance-based stacking DoT. Each application creates an independent
  poison instance with its own snapshot and duration. Stacks infinitely.
- **Stacking**: Unlimited instances, each independent
- **Scaling**: Each instance snapshots hit damage. Scales with DoT multiplier, ailment
  duration, chaos damage%.
- **Identity**: Best for sustained single-target DPS. Rewards fast hits (more instances).
  The classic "death by a thousand cuts."
- **Duration**: 3s per instance (each independent)

### Ailment Stack Counting Rule

When a talent or mechanic references "X+ ailment stacks," it counts ALL active
ailment instances across ALL types on the target:

- 3x Poison + 1x Chill + 1x Shock = **5 ailment stacks**
- 5x Poison = **5 ailment stacks**
- 1x Bleed + 1x Ignite = **2 ailment stacks**

This rewards diverse ailment application (multiple elements/skills contributing)
AND deep single-ailment stacking equally. A mono-poison build and a multi-element
build can both reach the same thresholds, just through different means.

**Exception:** If a talent specifies a NAMED ailment (e.g., "at 5+ poison stacks"),
it only counts that specific ailment type.

### Ailment Comparison Matrix

| Property | Bleed | Ignite | Chill | Shock | Poison |
|----------|-------|--------|-------|-------|--------|
| Deals damage? | Yes (DoT) | Yes (DoT) | No | No | Yes (DoT) |
| Snapshots hit dmg? | Yes | Yes | N/A | N/A | Yes |
| Stacks? | 5 max | No (ramps) | No | 3 max | Unlimited |
| Best vs bosses? | Yes (spike) | Yes (ramp) | Yes (slow) | Yes (amp) | Yes (sustain) |
| Best vs packs? | No | No (resets) | Some | Some | No |
| Defensive? | No | No | YES | No | No |
| Offensive amp? | No | No | No | YES | No |
| Scales with speed? | Moderate | Low | Low | High | High |

---

## 5. Advanced Ailments

Advanced ailments are NOT granted automatically by element choice. They come from
**multiple sources** and represent deep build investment:

### Sources of Advanced Ailments

| Source | Example | Rarity |
|--------|---------|--------|
| Specific talent nodes (T5+) | "Stab Predator T5: Crits on chilled targets Freeze for 0.5s" | 1-2 skills per weapon may have access |
| Unique items | "Frostbite Loop: Hits always Freeze chilled enemies below 30% HP" | Build-defining chase items |
| Skill combos | "Crit a Chilled target with Assassinate -> Freeze for 1s" | Rotation reward |
| Archetype keystones (T7) | "Ghost T7: Dodge triggers Freeze nova around you" | Deep investment capstone |

### Advanced Ailment Definitions

#### Freeze (Cold advanced)
- **Effect**: Target is stunned (cannot act) for duration
- **Trigger**: Varies by source (crit on chilled, HP threshold, etc.)
- **Duration**: 0.5-1.5s depending on source
- **Scaling**: Duration scales with cold damage dealt (higher hit = longer freeze)
- **Shatter**: If a frozen target dies, deals 50% of overkill as cold AoE to nearby enemies

#### Scorch (Fire advanced)
- **Effect**: Target's fire resistance reduced by 15 per stack (max 3 stacks)
- **Trigger**: Maintaining Ignite above a damage threshold
- **Duration**: Lasts while Ignite is active

#### Overload (Lightning advanced)
- **Effect**: When shock reaches 3 stacks, next hit chains to 2 nearby enemies
- **Trigger**: Reaching max shock stacks
- **Duration**: One-time proc, resets shock to 1 stack after triggering

#### Wither (Chaos advanced)
- **Effect**: Target takes 5% increased damage from ALL sources per stack (max 5)
- **Trigger**: Maintaining 5+ poison instances on target
- **Duration**: Lasts while poison count stays above threshold

#### Rupture (Physical advanced)
- **Effect**: When bleed reaches 5 stacks, next enemy action triggers massive burst
  (200% of total bleed snapshot) and removes all stacks
- **Trigger**: Reaching max bleed stacks
- **Duration**: One-time proc, resets bleed to 0 after triggering

### Design Rule for Advanced Ailments

Advanced ailments should feel like **"I built for this"** moments, not checkboxes.
A frost build that gets Freeze should feel like an achievement. A chaos build that
triggers Wither should feel like reaching critical mass.

NOT every weapon or skill should have easy access to every advanced ailment.
Some are rare and build-defining. That's the point.

---

## 6. Element + Talent Interaction

### Core Rule: Talent Trees Do NOT Change Based on Element

The talent tree is identical regardless of which element you picked. A player with
Frost Stab sees the same 39 nodes as a player with Venom Stab.

### How Elements Make Nodes Feel Different

Nodes reference generic mechanics (damage, ailment duration, hit effects) that
naturally interact with the active element:

**Example node: "Relentless Pressure" (T3 behavior)**
> "Each consecutive hit extends active ailment duration by 0.3s (max +2s)."

- **With Frost Stab**: Extends Chill duration — enemy stays slowed longer
- **With Venom Stab**: Extends Poison duration — each instance ticks longer = more total damage
- **With Fire Stab**: Extends Ignite duration — more time to ramp before it falls off

Same node, same mechanic, different VALUE depending on element context.

### Element-Conditional Bonuses (Rare, T5+ Only)

A small number of deep nodes (T5-T7) may have **element-conditional riders**:

```
"If this skill deals cold damage, also apply Chill to nearby enemies on crit."
"If this skill deals chaos damage, poison instances deal 10% more per stack over 5."
```

These are:
- **Rare** (1-2 per skill maximum, only at T5+)
- **Additive bonuses** (they add to the node, not replace it)
- **Never required** (the node works without them, they're gravy)
- **Documented in the JSON** as `elementConditional` field

### Element-Conditional Schema

```json
{
  "id": "st_0_5_0",
  "name": "Precision Killer",
  "modifier": { ... },
  "elementConditional": {
    "cold": { "description": "Crits on chilled targets Freeze for 0.5s", "effect": { ... } },
    "fire": { "description": "Crits on ignited targets extend Ignite by 1s", "effect": { ... } }
  }
}
```

---

## 7. Weapon Base Damage

### The Problem

Currently, weapons have typed base damage (`baseDamageMin/Max` as physical, `baseSpellPower`
as generic). If a player transforms Stab to cold, does the weapon's physical base damage
become cold? What about a wand's spell power?

### The Solution: Element-Neutral Base Damage

Weapons provide **element-neutral base values** that the skill's element transform colors:

- **Attack weapons** (daggers, swords, axes, etc.): `baseDamageMin` / `baseDamageMax`
  This is raw weapon damage — NOT physical damage. When a skill hits, the transform
  converts this base into the skill's active element.
- **Spell weapons** (wands, staves, tomes, etc.): `baseSpellPower`
  This is raw spell power — NOT any specific element. The transform colors it.
- **Hybrid weapons** (daggers, scepters, gauntlets): Have BOTH base damage AND spell power.
  The transform colors whichever the skill uses.

### How It Works

```
Player has a dagger with baseDamage 15-30.
Stab (Physical transform): 15-30 physical damage
Frost Stab (Cold transform): 15-30 cold damage
Venom Stab (Chaos transform): 15-30 chaos damage
```

The weapon itself is element-neutral. The SKILL determines what element the damage becomes.

### Gear Affixes Add Typed Damage ON TOP

Flat elemental affixes on gear (`+5 fire damage`, `+8 cold damage`) add TYPED damage
on top of the base. These only benefit skills of that element:

```
Dagger: baseDamage 15-30 (neutral)
Ring: +8 cold damage (affix)

Frost Stab total: 15-30 cold (from weapon) + 8 cold (from ring) = 23-38 cold
Venom Stab total: 15-30 chaos (from weapon) + 0 (ring cold doesn't apply) = 15-30 chaos
```

This is what creates the gear chase: once you pick an element, you want gear with
matching flat damage affixes. The weapon base always works, but affixes specialize.

### % Damage Affixes

Percentage damage affixes (`+15% cold damage`) multiply ONLY damage of that type:

```
Frost Stab: 23-38 cold × 1.15 = 26.5-43.7 cold
Venom Stab: 15-30 chaos × 1.0 = 15-30 chaos (cold% doesn't apply)
```

### Implementation Note

This is a DESIGN change, not necessarily a code change. The current `baseDamageMin/Max`
fields are already element-neutral in the data — they just get labeled "physical" in the
damage pipeline. The transform system needs to intercept the damage type assignment
so the base damage takes on the skill's active element instead of always being physical.

---

## 8. Gear Stat Scaling

### How Gear Stats Map to Elements

| Stat | What It Does | Who Wants It |
|------|-------------|--------------|
| `flatPhysDamage` | +X physical damage | Physical builds |
| `flatAtkFireDamage` | +X fire damage | Fire builds |
| `flatAtkColdDamage` | +X cold damage | Cold builds |
| `flatAtkLightningDamage` | +X lightning damage | Lightning builds |
| `flatAtkChaosDamage` | +X chaos damage | Chaos builds |
| `incPhysDamage` | +X% physical damage | Physical builds |
| `incFireDamage` | +X% fire damage | Fire builds |
| `incColdDamage` | +X% cold damage | Cold builds |
| `incLightningDamage` | +X% lightning damage | Lightning builds |
| `incChaosDamage` | +X% chaos damage | Chaos builds |
| `firePenetration` | Ignore X% fire resist | Fire builds |
| `coldPenetration` | Ignore X% cold resist | Cold builds |
| `lightningPenetration` | Ignore X% lightning resist | Lightning builds |
| `chaosPenetration` | Ignore X% chaos resist | Chaos builds |
| `dotMultiplier` | +X% DoT damage | Bleed/Ignite/Poison (NOT Chill/Shock) |
| `ailmentDuration` | +X% ailment duration | All ailment builds |
| `incDoTDamage` | +X% damage over time | Bleed/Ignite/Poison |

### The Gear Chase

When a player commits to an element, EVERY piece of gear becomes interesting through
the lens of "does this have my element's stats?"

A frost dagger player wants:
- Weapons with +cold damage
- Armor with cold resist (defensive) AND cold penetration (offensive)
- Rings/amulets with +cold%, ailment duration
- Unique items with cold-specific effects (Frostbite Loop)

This creates a natural gear treadmill where players are always looking for
element-specific upgrades, not just "highest iLvl."

---

## 9. Mob Resistances (Future)

When mob resistances are implemented:

- Each mob type has resistances to 1-2 elements (e.g. fire mobs resist fire)
- Players must either penetrate the resistance (gear investment) or use off-element
  skills for resistant mobs
- Zone hazards already exist — these could be tied to mob resistance themes
- This creates a reason to have 1-2 off-element skills in your rotation

### Design Consideration

Mob resistances should be a SPEEDBUMP, not a WALL. A fire build facing fire-resistant
mobs should be slower, not impossible. Penetration gear should be enough to push through.
Players shouldn't need to respec elements per zone.

---

## 10. Design Rules

### Universal Rules

1. **Every skill has all 5 element transforms.** No exceptions.
2. **Physical is always the default.** Skills start physical before level 5.
3. **All transforms grant 100% signature ailment.** No exceptions.
4. **Transform passives are small and self-reinforcing.** Not build-defining.
5. **Talent trees are element-agnostic.** Same tree regardless of element choice.
6. **Element-conditional bonuses are rare** (T5+ only, 1-2 per skill max).
7. **Advanced ailments come from multiple sources** (items, combos, deep talents).
8. **All DoT ailments snapshot from hit damage** and scale with the same gear stats.
9. **Respec costs gold and resets skill to level 5.** Talent points preserved.
10. **The transform selector is a SEPARATE UI element** from the talent tree.

### Per-Weapon Design Checklist

When designing a new weapon's element transforms:

- [ ] All 5 transforms defined for every active skill
- [ ] All transforms have 100% signature ailment
- [ ] Elemental transforms have 100% signature ailment
- [ ] Each transform has 2-3 small passive bonuses
- [ ] Transform names follow naming convention
- [ ] No transform is strictly worse than another (all viable)
- [ ] Transforms documented in SKILL_ROSTER.md per-skill section

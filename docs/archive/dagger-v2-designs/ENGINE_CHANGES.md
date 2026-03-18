# Engine Changes Required (v2 Skill System)

> Tracks mechanical/code changes needed to support the v2 skill and element system.
> These are changes to the ENGINE, not to skill data or talent trees.
>
> **Status:** Design phase. No code changes yet.

---

## Table of Contents

1. [Element Transform System](#1-element-transform-system)
2. [Speed Stat Rework](#2-speed-stat-rework)
3. [Weapon Base Damage Rework](#3-weapon-base-damage-rework)
4. [Ailment System Rework](#4-ailment-system-rework)
5. [Sequential Hit Resolution](#5-sequential-hit-resolution)
6. [Combo State Engine](#6-combo-state-engine)
7. [Compact Skill Graph Removal](#7-compact-skill-graph-removal)
8. [Skill Rename / ID Migration](#8-skill-rename--id-migration)
9. [UI Changes](#9-ui-changes)

---

## 1. Element Transform System

### What Needs to Change

**New state per skill:** Each skill needs an `elementTransform` field in the save state.

```typescript
// Per-skill element choice
elementTransform?: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';
```

**Unlock gate:** Transform selector appears at skill level 5.

**Respec behavior:**
- Changing element resets skill level to 5
- Costs gold (same formula as talent respec)
- Talent point allocation is NOT reset

### Engine Impact

**Damage pipeline (`damageBuckets.ts`):**
- Currently, skill damage type comes from `skill.tags` (Physical, Cold, etc.) and
  `skill.baseConversion` (ConversionSpec).
- Change: If skill has an active element transform, OVERRIDE the damage type entirely.
  All base damage becomes the transform's element. No partial conversion — full override.
- Flat elemental affixes from gear only apply if they match the skill's active element.

**Ailment application:**
- Currently, ailments are applied via talent tree procs (`applyDebuff` on hit/crit).
- Change: Element transform auto-applies the signature ailment on every hit (100%).
  This bypasses the talent tree — it's built into the transform, not a talent node.

**Affected files:**
- `src/engine/damageBuckets.ts` — damage type resolution
- `src/engine/combat/tick.ts` — ailment auto-application
- `src/types/skills.ts` — element transform type
- `src/types/state.ts` — per-skill element state
- `src/store/gameStore.ts` — element respec action
- `src/store/migrations.ts` — save migration for new field

---

## 2. Speed Stat Rework

### Current System (Confusing)

| Stat | Current Behavior |
|------|-----------------|
| `attackSpeed` | Compresses GCD for attack skills |
| `castSpeed` | Compresses GCD for spell skills |
| `abilityHaste` | Reduces individual skill cooldowns |
| `incAttackSpeed` | % increase to attack speed |
| `baseAttackSpeed` | Flat base from weapon |

Multiple overlapping stats, unclear to players.

### Proposed System (Clean)

| Stat | What It Does | Affects |
|------|-------------|---------|
| **Action Speed** (rename `attackSpeed`) | Compresses GCD between ALL skill casts | Universal — how fast your rotation cycles |
| **Attack Cooldown Recovery** (new or rename `abilityHaste`) | Reduces cooldown of Attack-tagged skills | Stab 3s → 2.5s, Assassinate 8s → 6.5s |
| **Spell Cooldown Recovery** (new or rename `castSpeed`) | Reduces cooldown of Spell-tagged skills | Future wand/staff/tome skills |

**Remove:**
- `abilityHaste` — split into Attack CDR and Spell CDR
- `incAttackSpeed` — fold into Action Speed
- `baseAttackSpeed` — becomes base Action Speed from weapon

### Migration Complexity

This affects:
- `src/types/stats.ts` — StatKey changes
- `src/data/balance.ts` — BASE_STATS defaults
- `src/data/affixes.ts` — affix stat mappings
- `src/engine/combat/tick.ts` — GCD and cooldown calculations
- `src/engine/character.ts` — resolveStats
- `src/ui/` — stat display labels
- All existing items in player saves that have attack speed affixes

**Recommendation:** This is a BIG migration. Consider doing it as a separate sprint
after the element/skill rework, not bundled with it.

---

## 3. Weapon Base Damage Rework

### Current System

Weapons have `baseDamageMin/Max` that is treated as physical in the damage pipeline.
Spell weapons have `baseSpellPower` that is type-neutral.

### Proposed System

Weapon `baseDamageMin/Max` is **element-neutral**. The damage type is determined
by the SKILL's active element transform, not the weapon.

### Engine Impact

**Minimal code change.** The `baseDamageMin/Max` fields are already just numbers.
The damage type assignment happens in `damageBuckets.ts` when the physical bucket
is created. The change is: instead of always assigning base damage to the physical
bucket, assign it to the skill's active element bucket.

**Affected files:**
- `src/engine/damageBuckets.ts` — bucket assignment logic (primary change)
- Possibly `src/engine/skills/dps.ts` — DPS calculation display

**Gear affixes (`flatAtkFireDamage`, etc.) remain typed.** They add ON TOP of the
element-neutral base, but only to matching-element skills.

---

## 4. Ailment System Rework

### Current Ailments

| Ailment | Current Behavior | Status |
|---------|-----------------|--------|
| Poisoned | Instance-based DoT, snapshots hit damage | KEEP, works well |
| Bleeding | Snapshot DoT, FIFO stacks | REWORK — add spike-on-enemy-action |
| Burning | % max HP per second | REWORK — change to snapshot ramp-on-refresh |
| Chilled | Shatter on kill (overkill to next mob) | REWORK — change to attack speed slow |
| Shocked | +crit chance taken per stack | REWORK — change to % damage taken |
| Vulnerable | +damage taken | EVALUATE — may overlap with Shock rework |
| Cursed | Resist reduction per stack | KEEP for now |

### Proposed Ailment Changes

**Bleed:** Add "spike on enemy action" mechanic. Each time the enemy attacks or
casts, each bleed stack triggers bonus damage equal to 50% of one tick's value.
Existing snapshot/FIFO logic stays, just add the spike trigger.

**Ignite (rename from Burning):** Change from `percentMaxHp` to snapshot-based.
On hit, snapshot damage creates an Ignite DoT. Re-applying Ignite ADDS the new
snapshot to the existing value (ramps up). Duration refreshes. Not instance-based
like poison — single debuff that accumulates.

**Chill:** Remove shatter-on-kill. Replace with -20% enemy attack speed (flat).
Shatter becomes an advanced ailment (Freeze) available via deep talents/uniques.

**Shock:** Change from +crit chance taken to +8% damage taken per stack (max 3 = 24%).
This makes Shock a universal damage amplifier, not just a crit enabler.

**Vulnerable:** Reclassified as a **curse** (like Cursed), NOT an ailment.
- Vulnerable is applied by talent procs, skill mechanics, and unique items
- Shock is applied by the lightning element (signature ailment)
- They are different categories: Vulnerable = curse, Shock = ailment
- They stack multiplicatively for players who invest in both
- Curses come from MECHANICS (talents, combos). Ailments come from ELEMENTS.

| Category | Applied By | Examples |
|----------|-----------|---------|
| **Ailment** | Element transform (auto, 100%) | Bleed, Ignite, Chill, Shock, Poison |
| **Curse** | Talents, mechanics, uniques, combos | Vulnerable, Cursed, Weakened, Blinded |

### Affected files
- `src/data/debuffs.ts` — debuff definitions
- `src/engine/combat/helpers.ts` — `tickDebuffDoT` (bleed spike, ignite ramp)
- `src/engine/combat/tick.ts` — shock damage amp, chill attack speed slow
- `src/engine/combat/zoneAttack.ts` — chill affecting mob attack timers
- `src/engine/combat/bossAttack.ts` — chill affecting boss attack timer

---

## 5. Sequential Hit Resolution

### What Needs to Change

Currently, multi-hit skills (like the old Blade Flurry) resolve all hits simultaneously
in a single tick. Blade Dance requires **sequential hit resolution** — hits must fire
1 → 2 → 3 with kill checks between each hit.

### Why This Matters

Without sequential resolution, these mechanics can't work:
- **Kill Redirect** (Predator T1a): if hit 1 kills, hit 2 retargets to new enemy
- **Mid-cast kill tracking**: talent nodes that trigger on "kill during cast"
- **Per-hit targeting**: each hit must select a DIFFERENT enemy
- **Escalating effects**: some talent nodes apply different effects per hit number

### Implementation Approach

In `tick.ts`, when a sequential-AoE skill fires:

```
1. Select target 1 (front mob or smart-targeted)
2. Resolve hit 1: damage, ailment, crit roll, kill check
3. If target 1 died: update pack, shift mobs
4. Select target 2 (next mob, or retarget if kill redirect active)
5. If no target 2 exists (pack empty or <2 mobs): stop, remaining hits don't fire
6. Resolve hit 2: damage, ailment, crit roll, kill check
7. Repeat for hit 3
```

This is different from AoE (Fan of Knives) which hits ALL targets simultaneously.
Sequential-AoE is a new damage delivery type.

### Affected files
- `src/engine/combat/tick.ts` — new sequential hit resolution path
- `src/types/skills.ts` — add `sequential-aoe` tag / hit delivery type
- `src/engine/skills/dps.ts` — DPS calculation for sequential skills

---

## 6. Combo State Engine

### New System Needed

Currently there is no "combo state" system. Procs cast skills and apply buffs,
but there's no concept of "Stab creates Exposed which Assassinate consumes."

### Implementation Approach

Combo states can be implemented as **specialized TempBuffs** or as a new
lightweight state system.

**Option A: Extend TempBuff**
- Add a `comboState` field to TempBuff
- Combo states are TempBuffs with special consumption logic
- Pro: reuses existing buff expiry/aggregation code
- Con: TempBuff is getting overloaded

**Option B: New ComboState system**
- Separate `comboStates: ComboState[]` on GameState
- Each ComboState has: `id`, `sourceSkillId`, `expiresAt`, `effect`, `consumedBy`
- Pro: clean separation, purpose-built
- Con: new state field, new save migration, new tick logic

**Recommendation:** Option B. Combo states are conceptually different from buffs
(consumed on use, per-skill interactions, talent-moddable). A clean system is
worth the extra code.

```typescript
interface ComboState {
  id: string;                    // 'exposed', 'deep_wound', etc.
  sourceSkillId: string;         // which skill created it
  expiresAt: number;             // ms timestamp
  targetBased: boolean;          // true = on enemy, false = on player
  consumedBy?: string[];         // skill IDs that can consume (null = any)
  effect: ComboStateEffect;      // what happens when consumed
}

interface ComboStateEffect {
  bonusDamage?: number;          // % bonus damage
  bonusCooldownRecovery?: number; // seconds of CD to skip
  extraChains?: number;          // +N chain targets
  instantBurst?: boolean;        // consume remaining DoT as burst
  guaranteedCrit?: boolean;
  // ... extensible
}
```

### Affected files
- `src/types/combat.ts` or new `src/types/combo.ts` — ComboState types
- `src/types/state.ts` — add `comboStates: ComboState[]` to GameState
- `src/engine/combat/tick.ts` — create combo states on skill cast, consume on follow-up
- `src/store/migrations.ts` — add empty comboStates array

---

## 7. Compact Skill Graph Removal

### What to Remove

The 16-node compact skill graph system (defined in `src/data/skillGraphs/dagger.ts`
via `createCompactTree()`) is DEPRECATED. Only the 39-node talent tree system
(defined in `src/data/skillGraphs/dagger_talents.ts`) should remain.

### Files to Clean Up
- `src/data/skillGraphs/dagger.ts` — DELETE or gut (keep only skill graph ID mapping)
- `src/engine/unifiedSkills.ts` — remove compact graph resolution code
- `src/data/skillGraphs/talentTreeBuilder.ts` — may need updates
- `src/ui/` — remove compact graph rendering if any exists

### Migration
- Players with points in compact graph nodes need those points refunded
- Save migration resets `allocatedNodes` for compact graph entries

---

## 8. Skill Rename / ID Migration

### ID Changes

| Old ID | New ID | Reason |
|--------|--------|--------|
| `dagger_lightning_lunge` | `dagger_chain_strike` | Element neutrality |
| `dagger_smoke_screen` | `dagger_shadow_mark` | Complete rework |
| (new) | `dagger_blade_ward` | New defensive skill |
| (new) | `dagger_blade_trap` | New trap skill |
| (new) | `dagger_shadow_dash` | New movement skill |

### Migration Impact

- `skillBar` slots referencing old IDs need remapping
- `skillProgress` entries need key migration
- `skillTimers` entries need key migration
- `ownedPatterns` — no impact (patterns reference item bases, not skills)

---

## 9. UI Changes

### Element Transform Selector

New UI element on the skill detail/tree screen:
- Dropdown or button row showing 5 element options
- Grayed out until skill level 5
- Shows element icon, name, signature ailment
- Respec confirmation dialog with gold cost

### Skill Bar

- Skill icons may need element-colored borders or overlays
- Skill names update to reflect transform (Stab → Frost Stab)

### Combo State Display

- Small icons above the skill bar showing active combo states
- Expiry timer on each
- Highlight which skill will consume the state

### Speed Stat Display (if reworked)

- Character screen stat labels need updating
- Tooltip descriptions need updating

---

## 10. Required New Mechanics

> Mechanics surfaced during skill/talent design that don't currently exist in the engine.
> Each must be implemented before the talent nodes that reference them can function.

### 10.1 Kill Attribution

**Needed by:** Annihilation (FoK T6), Plague Executioner (Assassinate T6), Extinction
Event (FoK Plague T6), any "when this skill kills" talent node.

**Problem:** Currently kills are attributed to whatever dealt the final damage tick.
If FoK applies poison and poison ticks kill the target, that's an "ailment kill,"
not a "FoK kill." Talent nodes gated on "FoK kills a target" wouldn't trigger.

**Solution:** Track `lastSkillSource` on each ailment instance. When an ailment kills,
the kill is attributed to the skill that APPLIED the ailment. FoK applies poison →
poison kills → kill credited to FoK → Annihilation triggers.

**Affected:** `src/engine/combat/helpers.ts` (ailment tracking), `src/engine/combat/tick.ts`
(kill attribution in death loop).

### 10.2 Keystone Ailment Snapshot Override (PLAGUE STORM Only)

**Needed by:** PLAGUE STORM (FoK Plague T7) — 0 direct damage + 3x ailment potency.

**Problem:** Currently ailment snapshot = hit damage × potency. If hit damage is 0,
snapshot is 0 regardless of potency multiplier.

**Important:** Ailment snapshotting from hit damage is the CORRECT default. It makes
gear progression unified ("weapon got better → poisons got better") and creates
meaningful skill differentiation (220% WD Assassinate ailments > 30% WD Blade Dance
ailments). DO NOT change the default system.

**Solution:** PLAGUE STORM is a KEYSTONE that breaks rules — that's what keystones do.
The keystone itself has a special snapshot rule: "Ailment snapshot uses the skill's
FULL weapon damage % as if it dealt damage, ignoring the 0 direct damage override."

**Implementation:** When a skill has `directDamageOverride: 0` AND an ailment potency
modifier, calculate ailment snapshot as:
`skillWeaponDamagePercent × resolvedWeaponDamage × potencyMult`
instead of `actualDamageDealt × potencyMult`.

This is a NARROW exception, not a system redesign. Only skills with both
`directDamageOverride: 0` AND ailment application trigger this path.

**Result for PLAGUE STORM:** FoK 60% WD × 3x potency = 180% WD ailment snapshot.
Strong DoT, zero direct damage. Enemies die to ticks, not hits.

**Affected:** `src/engine/combat/tick.ts` (snapshot calculation, add conditional path
for 0-damage skills with ailment modifiers). Minimal code change.

### 10.3 Cooldown Increase (Stat/Modifier)

**Needed by:** Patient Predator (Assassinate Predator T1a) synergy, potential unique
items, keystone tradeoffs (DEATH SENTENCE +4s CD, etc.).

**Problem:** The engine can REDUCE cooldowns (ability haste, attack speed) but there's
no mechanism to INCREASE a skill's cooldown as a deliberate tradeoff or buff enabler.

**Solution:** Add `cooldownIncrease` as a modifier on talent nodes and items. Applied
AFTER base cooldown and BEFORE cooldown reduction stats. Stacks additively.

**Affected:** `src/engine/combat/tick.ts` (cooldown calculation), `src/types/skills.ts`
(SkillModifier).

### 10.4 Ailment Potency as Unified Concept

**Needed by:** All Plague branch nodes that reference "ailment potency."

**Problem:** "Potency" is used throughout the design docs but isn't a single engine
concept. It currently maps to different things:
- DoT ailments: snapshot damage multiplier
- Chill: attack speed slow amount
- Shock: damage taken amp amount

**Solution:** Define `ailmentPotency` as a unified multiplier that scales WHATEVER
the ailment's effect is. For DoTs, it multiplies snapshot. For Chill, it multiplies
the slow%. For Shock, it multiplies the amp%. One stat, one concept, applies universally.

**New stat:** `ailmentPotency` in `StatKey` (percentage, default 0). Stacks additively
from all sources (gear, talents, buffs), then applied multiplicatively to the ailment
effect at application time.

**Affected:** `src/types/stats.ts`, `src/data/balance.ts`, `src/engine/combat/helpers.ts`.

### 10.5 Ailment Tick Speed Multiplier

**Needed by:** Plague Wave (FoK Plague T2) — "all ailments tick at 2x speed for 3s."

**Problem:** Currently ailments tick at fixed intervals (`dotTickInterval` in debuff def).
There's no mechanism to temporarily speed up tick rate.

**Solution:** Add `ailmentTickSpeedMult` as a TempBuff effect. When active, all ailment
tick accumulators advance at `dt × tickSpeedMult` instead of just `dt`. Doubling tick
speed means ailments deal their total damage in half the time (same total, faster delivery).

**Important:** This does NOT increase total ailment damage — it just delivers it faster.
A 3s poison at 2x speed deals all its damage in 1.5s, then expires. This is a DPS
increase (same damage in less time) but not a total damage increase.

**Affected:** `src/engine/combat/helpers.ts` (tickDebuffDoT accumulator logic).

### 10.6 AoE Splash on Single-Target Skills (Temporary)

**Needed by:** Toxic Storm (FoK Plague T4) — "all skills splash to +1 target for 4s."

**Problem:** Currently single-target skills only hit the front mob. There's no mechanism
to temporarily make them hit adjacent targets.

**Solution:** When a TempBuff with `allSkillsSplash: N` is active, after each single-target
skill hit resolves, deal `splashPercent` of the damage to N adjacent mobs. Splash hits
apply ailments but do NOT trigger procs or combo states (prevents infinite loops).

**Affected:** `src/engine/combat/tick.ts` (post-hit splash resolution).

### 10.7 Retaliation Damage (Storm Shelter)

**Needed by:** Storm Shelter (FoK Ghost T4) — "enemies that attack you take 30% of
FoK damage as retaliation."

**Problem:** No mechanism for "when enemy attacks, deal damage back to them."

**Solution:** Add `retaliationDamage` as a TempBuff effect. When active, each time an
enemy hits/misses/is-blocked, they take flat damage equal to
`retaliationPercent × skillBaseDamage`. Uses the SOURCE skill's fully-scaled damage
as the base.

**Affected:** `src/engine/combat/zoneAttack.ts` and `src/engine/combat/bossAttack.ts`
(add retaliation check after each enemy attack resolution).

### 10.8 Execute-Lock (Skill Cast Restriction)

**Needed by:** DEATH SENTENCE (Assassinate Predator T7) — "can only cast below 35% HP."

**Problem:** Currently all skills fire whenever they're off cooldown in rotation order.
There's no mechanism to restrict a skill to only firing under a condition.

**Solution:** Add `castCondition` to SkillModifier. When set, the rotation check
(`getNextRotationSkill`) skips this skill unless the condition is met. For execute-lock:
`castCondition: { targetBelowHp: 35 }`.

**Affected:** `src/engine/skills/rotation.ts` (getNextRotationSkill condition check),
`src/types/skills.ts` (castCondition on SkillModifier).

---

## 11. Balance Notes

> Global tuning flags surfaced during design. Apply during implementation balance pass.

- **All crit values are DESIGN VALUES subject to tuning.** Crit is multiplicative and
  compounds fast. Expect 20-30% reduction across the board on crit chance/multiplier
  nodes during implementation.
- **Executioner's Focus (Assassinate Predator T2b):** +5-8% global crit with ~85%
  uptime is too high. Tune to +3-4%.
- **`skills-cast-since-last` pattern:** BLOCKED at 3 skills (Blade Dance Tempo,
  Assassinate Predator's Patience, FoK Fan Mastery). Future skills must use different
  spacing-reward patterns.
- **Cooldown investment scaling:** Patient Predator's +8-10% per second needs careful
  tuning with potential cooldown-increase items. Monitor for degenerate stacking.

---

## Implementation Priority

Suggested order to minimize risk and maximize testability:

1. **Compact graph removal + skill renames** (cleanup, no new features)
2. **Ailment rework** (change existing debuffs, testable immediately)
3. **Element transform system** (new feature, builds on ailment rework)
4. **Combo state engine** (new feature, independent of element)
5. **Weapon base damage rework** (small change in damage pipeline)
6. **Speed stat rework** (big migration, do last or separate sprint)
7. **UI changes** (after engine is stable)

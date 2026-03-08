# Damage Type System Overhaul
# Elemental Conversion + Flat Damage Pooling

> Fundamental change to how damage types, flat damage affixes, and elemental
> conversion interact across all skills (attacks and spells).
>
> **Implement this before finalizing weapon talent trees.**
> All weapon designs assume this system is in place.

---

## Problem Statement

Physical damage dominates because:
1. Flat physical damage affixes exist on more item slots than elemental affixes
2. % physical damage affixes are more common and higher value
3. Elemental skills (Frost Fan, Lightning Lunge, chaos skills) cannot benefit
   from physical affixes even though they use weapon damage as their base
4. Slotting an elemental skill is an opportunity cost — it occupies a slot
   that could hold a physical skill with better affix coverage
5. Result: optimal loadouts are always majority physical regardless of player intent

---

## Design Goals

1. Flat damage of ANY type contributes to a hit regardless of skill tags
2. Elemental skills partially convert physical scaling into their element —
   physical affixes are never wasted on elemental builds
3. Specializing into an element (stacking % cold, % lightning) is meaningfully
   rewarded over ignoring it
4. Ailments (Chill, Shock, Burn, Poison, Bleed) apply based on the damage type
   composition of the hit — mixed hits can proc mixed ailments at reduced chance
5. Spells follow the same rules as attacks — no separate spell damage system
6. The math is readable — players can reason about it without a spreadsheet

---

## Core Model: Damage Buckets

Every hit resolves into one or more **damage type buckets**. Each bucket is scaled
independently by matching % modifiers, then summed for total damage.

### Buckets

| Bucket | Scaled By |
|--------|-----------|
| Physical | % physical damage, % increased damage (global) |
| Cold | % cold damage, % elemental damage, % increased damage (global) |
| Lightning | % lightning damage, % elemental damage, % increased damage (global) |
| Fire | % fire damage, % elemental damage, % increased damage (global) |
| Chaos | % chaos damage, % increased damage (global) |

**% elemental damage** scales all three elemental buckets (cold, lightning, fire).
**% increased damage** scales everything (global).
**% physical damage** scales physical only.
**% cold / % lightning / % fire** scale their specific bucket only.

---

## Flat Damage Pooling

**Rule: All flat damage affixes contribute to the hit regardless of skill tags.**

Flat damage is added to its own bucket before % scaling. A skill does not need
to have a matching tag to receive flat damage of a given type.

### Example

Weapon affixes: +15 flat lightning, +10 flat physical
Skill: Stab (physical, melee)

```
Physical bucket: 100 (weapon base) + 10 (flat phys affix) = 110
Lightning bucket: 15 (flat lightning affix)

Apply % modifiers:
  +20% physical → physical bucket: 110 × 1.20 = 132
  +15% lightning → lightning bucket: 15 × 1.15 = 17.25

Total hit: 132 + 17.25 = 149.25
```

The flat lightning contributes a small amount even on a physical skill. Not
build-defining, but never wasted. A physical build with flat lightning on gear
simply deals a tiny bit of extra lightning damage.

---

## Elemental Conversion

**Rule: Conversion transforms a portion of physical base damage into the target
element BEFORE % scaling. Physical % modifiers apply to the pre-conversion
physical damage only. Elemental % modifiers apply to the converted portion.**

### Conversion Field on Skills

```ts
convertElement?: {
  from: 'physical'      // always physical for now
  to: 'cold' | 'lightning' | 'fire' | 'chaos'
  percent: number       // 0-100
}
```

### Conversion Math

For a skill with 70% phys→cold conversion:

```
Base weapon damage: 100 physical

Step 1 — Split by conversion:
  Converted:     100 × 0.70 = 70  → goes to cold bucket
  Unconverted:   100 × 0.30 = 30  → stays in physical bucket

Step 2 — Add flat damage to buckets:
  Physical bucket: 30 + (flat phys affixes)
  Cold bucket:     70 + (flat cold affixes)
  Lightning bucket: 0 + (flat lightning affixes)  ← flat still applies

Step 3 — Apply % modifiers per bucket:
  Physical bucket × (1 + sum of % phys modifiers)
  Cold bucket     × (1 + sum of % cold + % elemental modifiers)
  Lightning bucket × (1 + sum of % lightning + % elemental modifiers)

Step 4 — Sum all buckets = final hit damage
```

### Full Example

Skill: Frost Fan (70% phys→cold)
Weapon base: 100 physical
Affixes: +15 flat lightning, +10 flat cold, +20% physical, +25% cold

```
Step 1 — Conversion split:
  Physical remaining: 30
  Cold from conversion: 70

Step 2 — Add flat:
  Physical bucket: 30 + 0 = 30
  Cold bucket:     70 + 10 = 80
  Lightning bucket: 0 + 15 = 15

Step 3 — Apply %:
  Physical: 30 × 1.20 = 36
  Cold:     80 × 1.25 = 100
  Lightning: 15 × 1.00 = 15  (no lightning % affix on this build)

Step 4 — Total: 36 + 100 + 15 = 151
```

Compare to a physical Stab on same gear (no conversion):
```
Physical bucket: 100 + 0 = 100
Cold bucket: 0 + 10 = 10
Lightning bucket: 0 + 15 = 15

Apply %:
  Physical: 100 × 1.20 = 120
  Cold: 10 × 1.25 = 12.5
  Lightning: 15 × 1.00 = 15

Total: 147.5
```

Frost Fan (151) vs Stab (147.5) — nearly identical on the same gear. But if the
player adds +30% cold to their build (belt, ring), Frost Fan scales significantly
better than Stab. Elemental specialization is rewarded without being mandatory.

---

## Conversion Values by Skill Type

Suggested default conversion percentages. These are tunable but establish the
baseline feel of each damage type.

### Attacks

| Skill Type | Conversion % | Rationale |
|---|---|---|
| Pure physical | 0% | No conversion — full phys scaling |
| Elemental melee | 50-60% | Partial — phys affixes still meaningful |
| Elemental ranged/proj | 60-70% | More elemental identity, weaker phys base |
| Full elemental (keystone) | 100% | Niche — phys affixes useless, max elemental ceiling |
| Chaos | 40-50% | Chaos has fewer affixes — keep phys relevance higher |

### Spells

Spells follow identical rules. The difference is their base damage comes from
spell power / intelligence scaling rather than weapon damage. Flat physical affixes
on weapons do NOT contribute to spells unless the spell explicitly has `scaleStat:
'weaponDamage'`. Flat elemental affixes on all slots (rings, amulets) DO contribute.

```ts
// Spell that scales with spell power, not weapon
scaleStat: 'spellPower'
convertElement: { from: 'physical', to: 'fire', percent: 80 }

// Spell that scales with weapon (rare — wand melee-style skills)
scaleStat: 'weaponDamage'
convertElement: { from: 'physical', to: 'cold', percent: 70 }
```

---

## Ailment Application

Ailments apply based on the **damage type composition of the hit**.

### Ailment Trigger Rules

| Ailment | Triggered By | Base Chance Source |
|---|---|---|
| Bleed | Physical damage | % of physical portion of hit |
| Chill | Cold damage | % of cold portion of hit |
| Shock | Lightning damage | % of lightning portion of hit |
| Burn | Fire damage | % of fire portion of hit |
| Poison | Physical or Chaos damage | % of physical + chaos portion |

### Mixed Hit Ailment Chance

For a hit that deals multiple damage types, each ailment rolls independently
based on the proportion of that damage type in the total hit.

```
Hit composition: 36 physical / 100 cold / 15 lightning (total 151)

Physical portion: 36/151 = 24%
Cold portion:     100/151 = 66%
Lightning portion: 15/151 = 10%

Base ailment proc chance from skill: 20%

Bleed chance:  20% × 0.24 = 4.8%   ← low, this is a cold skill
Chill chance:  20% × 0.66 = 13.2%  ← moderate, cold dominant
Shock chance:  20% × 0.10 = 2.0%   ← very low, just the flat lightning
```

**Result:** The elemental skill primarily applies its own ailment. Flat damage
affixes of other types create small background ailment chances — interesting as
a minor effect but not build-defining.

### Ailment Chance Affixes

```
+ % chance to Chill    → multiplied into Chill base chance after proportion calc
+ % chance to Shock    → same
+ guaranteed Chill     → bypasses proportion calc entirely (talent tree notables)
```

Talent tree nodes that say "guaranteed poison on hit" or "guaranteed Shocked" are
still meaningful because they bypass the proportion-based chance system.

---

## Dagger Impact

### Conversion Values for Dagger Skills

| Skill | Current Tags | Conversion | Notes |
|---|---|---|---|
| Stab | Phys, Melee | 0% | Pure physical — no change |
| Blade Flurry | Phys, Melee | 0% | Pure physical — no change |
| Frost Fan | Cold, AoE, Proj | 65% phys→cold | Moderate — phys affixes still ~35% useful |
| Viper Strike | Chaos, Melee, DoT | 45% phys→chaos | Chaos has fewer affixes — keep phys relevance |
| Shadow Step | Chaos, Melee | 45% phys→chaos | Same as Viper Strike |
| Assassinate | Phys, Melee | 0% | Pure physical — no change |
| Lightning Lunge | Lightning, Melee | 60% phys→lightning | Moderate — phys still relevant |

### What Changes for Dagger Builds

**Physical builds (Stab / Blade Flurry / Assassinate focus):**
No change. Pure physical skills get 0% conversion. Flat lightning/cold on gear
adds small extra damage but doesn't change the build.

**Mixed builds (1-2 elemental skills):**
Frost Fan and Lightning Lunge now benefit meaningfully from the physical affixes
already on the build. A player running 3 phys + Frost Fan + Lightning Lunge no
longer feels like they wasted two slots. The elemental skills convert 60-65% of
the physical base into their element, scaling with existing phys affixes at 35-40%
efficiency while the elemental affixes provide upside.

**Ailment builds (Shadow Step / Viper Strike focus):**
Chaos conversion makes Viper Strike's DoT and Shadow Step's debuff application
scale with the weapon's physical base. The DoT damage is still chaos-typed and
scales with chaos affixes when present, but phys affixes provide the baseline.

---

## Talent Tree Impact

### convertElement Modifier

The existing `convertElement` field in talent tree keystones (FROZEN EXECUTION,
STORM RUSH, KING COBRA) now uses the same resolution system as base skill
conversion. A keystone that says 100% phys→cold converts ALL physical including
flat phys affixes into cold.

```yaml
# FROZEN EXECUTION keystone
convertElement:
  from: physical
  to: cold
  percent: 100   # stacks with base 65% — effectively 100% (capped)
```

**Stacking rule:** Base skill conversion + keystone conversion cannot exceed 100%.
`effectiveConversion = min(baseConversion + keystoneConversion, 100)`

### New Talent Node Modifier Fields Needed

```ts
// On SkillModifier — already partially exists, needs formal typing
convertElement?: {
  from: 'physical'
  to: DamageType
  percent: number
}

// New — for nodes that add flat damage of a specific type
addFlatDamage?: {
  type: DamageType
  amount: number
  perRank?: number
}

// New — for ailment chance riders on notables
ailmentChanceBonus?: {
  ailment: AilmentType
  bonus: number       // additive to proportion-scaled chance
}
```

---

## Engine Changes Required

### New Types (`src/types/index.ts`)

```ts
type DamageType = 'physical' | 'cold' | 'lightning' | 'fire' | 'chaos'
type AilmentType = 'bleed' | 'chill' | 'shock' | 'burn' | 'poison'

interface DamageBucket {
  type: DamageType
  amount: number
}

interface ConversionSpec {
  from: 'physical'
  to: DamageType
  percent: number     // 0-100
}

// Add to SkillDef
baseConversion?: ConversionSpec

// Add to SkillModifier
convertElement?: ConversionSpec    // already exists — formalize
addFlatDamage?: { type: DamageType; amount: number }
ailmentChanceBonus?: { ailment: AilmentType; bonus: number }
```

### New Damage Resolution Function (`src/engine/combatHelpers.ts`)

```ts
// Replace current single-value damage calc with bucket-based resolution
function resolveDamageBuckets(
  baseDamage: number,           // weapon damage or spell power
  flatAffixes: DamageBucket[],  // all flat damage from gear
  conversion: ConversionSpec[],  // base + talent tree conversions
  percentModifiers: Record<DamageType | 'elemental' | 'global', number>
): DamageBucket[]

// Ailment chance resolver
function resolveAilmentChances(
  buckets: DamageBucket[],
  totalDamage: number,
  baseAilmentChance: number,
  ailmentBonuses: Record<AilmentType, number>
): Record<AilmentType, number>
```

### Affix System (`src/data/affixes.ts` or equivalent)

Add `damageType` field to flat damage affixes:

```ts
interface FlatDamageAffix {
  type: DamageType    // which bucket this flat damage goes into
  min: number
  max: number
  slot: ItemSlot[]    // which slots this can roll on
}
```

Add elemental % affixes to rings, amulets, belts if not already present:
- `% cold damage` — rings, amulets
- `% lightning damage` — rings, amulets
- `% fire damage` — rings, amulets
- `% elemental damage` — amulets, belts (scales all three)
- `% chaos damage` — rings

### Migration

No save migration needed — this is a calculation change, not a data change.
Existing gear retains all affixes. Flat damage affixes that previously had no
`damageType` field default to `'physical'` for backward compatibility.

---

## Implementation Order

```
1. Add DamageType, AilmentType, DamageBucket types
2. Add damageType field to flat damage affixes (default: 'physical' for existing)
3. Add baseConversion to skill definitions (dagger skills first)
4. Implement resolveDamageBuckets() replacing current damage calc
5. Implement resolveAilmentChances() using bucket proportions
6. Add elemental % affixes to rings/amulets/belts affix tables
7. Test with dagger skills — verify Frost Fan + Lightning Lunge scale correctly
8. Apply to spells — verify scaleStat routing works correctly
```

---

## Validation Tests

Before shipping, verify these scenarios produce expected outputs:

| Scenario | Expected |
|---|---|
| Stab + pure phys gear | Same output as current system |
| Frost Fan + pure phys gear | ~65% of damage is cold, ~35% phys |
| Frost Fan + mixed phys/cold gear | Cold portion scales higher, phys portion scales with phys % |
| Frost Fan + flat lightning on ring | Small lightning bucket added, small Shock chance |
| Lightning Lunge + %elemental amulet | Lightning bucket scales, cold + fire unaffected |
| FROZEN EXECUTION keystone (100% convert) | All physical converts to cold, flat phys affixes also convert |
| Viper Strike DoT | DoT damage uses chaos bucket, duration/stacks unchanged |
| Spell (spell power scale) | Flat weapon phys does NOT contribute |
| Spell (weapon damage scale) | Flat weapon phys DOES contribute |

---

## Dagger Doc Changes Required After Implementation

Once this system is in place, update `dagger.md`:

1. **Section 1 skill table** — add `baseConversion` column
2. **Section 5 shared notables** — Envenom's guaranteed poison now triggers via
   ailment system (chaos/physical portion → poison chance bypassed by guaranteed flag)
3. **Section 7 keystones** — FROZEN EXECUTION / STORM RUSH / KING COBRA conversion
   values now reference `effectiveConversion = min(base + keystone, 100)`
4. **Section 8 behavior nodes** — any node that references damage type now uses
   bucket terminology (e.g. "cold portion of hit" not "cold damage")
5. **Section 11 template library** — add `addFlatDamage` as a valid behavior
   node effect type for future weapons with flat-damage-granting nodes

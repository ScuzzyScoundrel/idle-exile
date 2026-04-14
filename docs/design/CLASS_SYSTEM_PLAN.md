# Class System & Combat Identity — Design Plan

> Session handoff doc. Captures the design consensus reached 2026-04-14
> before the code migration starts. Read this FIRST in the next session.

## The problem we're solving

- Universal Lv5 element picker made every skill feel interchangeable.
  No successful ARPG does this for good reason.
- Classes (mage/warrior/ranger/rogue) currently exist as enum values
  but mean nothing mechanically.
- Staff skills are currently authored AS witchdoctor skills, coupling
  weapon archetype to class identity. User wants the Witch Doctor
  playstyle accessible through any weapon, not locked to staves.
- Affix system is too generic — every affix is "+X stat," no axes
  that let players chase class/build identity through gearing.
- No attribute/stat-point system. Characters have no per-level
  allocation, so classes have nothing to differentiate at creation.

## Core design decisions (user-ratified)

### 1. Skills morph per class at the BASE, tree resolves against the morphed skill

NOT: one talent tree branch is "optimal for class X."
YES: the skill's BASE BEHAVIOR subtly changes per class, and the
SAME talent tree resolves against that morphed base.

Example — `staff_haunt` on three classes:
- **WD:** base behavior = chaos DoT, 35% snapshot → all tree nodes
  apply on top of a chaos-DoT base.
- **Mage:** base behavior = cold DoT + slight cast-speed bonus → same
  tree nodes, but they shape a frost caster.
- **Warrior:** base behavior = physical DoT + crit-multi bonus →
  same tree, different expression.

Implementation: `ClassSkillAdjustment` table. Sparse, ~5 lines per
(class, skill) cell. Modifier applies BEFORE talent tree resolution.

### 2. Talent trees remain per-skill, single authored version

No per-class rewrites. Every (skill, class) combination uses the
same 39-node tree. Class adjusts the SKILL, the tree applies normally.

Preserves ALL Session 2-3 investment in the 9 staff trees.

### 3. Class trees — POE-style passive tree per class

~60 nodes per class. Different starting point for each. Clusters of
thematic passives (minion, DoT, crit, defense, etc.). Some nodes are
**game-changing** — scaling fundamentally differently based on armor
type worn or weapon equipped.

Ascendancy classes (specializations) unlocked mid-progression. 2-3
per class. Ascendancies bring ~8 powerful nodes that dramatically
reshape playstyle. Model: POE ascendancies / Last Epoch masteries.

### 4. Attributes & stat points (PREREQUISITE — doesn't exist yet)

Four core attributes per character:
- **Strength** — weapon damage, max life, armor
- **Dexterity** — attack speed, crit chance, evasion
- **Intelligence** — spell power, mana, energy shield
- **Chaos** (or similar 4th axis — TBD) — DoT damage, chaos resist,
  ailment potency

Classes start with different baselines:
- Mage: high Int, low Str
- Warrior: high Str, low Int
- Ranger: high Dex, moderate Str
- Witchdoctor: high Chaos + Int

Per-level stat points (~5 per level) the player allocates. Gear
affixes grant attributes too. Attributes drive skill scaling —
so gear becomes universally usable but **differently valuable**
per build (see §5).

### 5. Affixes — universal items, stat-driven value

REJECTED: class-specific affixes, weapon-skill-specific affixes.
RATIFIED: any item usable by anyone. Items are more or less
beneficial based on your BUILD, not based on what the affix says.

Affix families (to design in detail next session):
- Flat attribute (+X Str, +X Int, etc.)
- Stat percent (+X% crit, +X% cast speed)
- Damage-type scaling (+X% fire damage, +X% chaos damage) — chased
  by element-matching builds
- Talent-effect amplifiers (+X% DoT, +X% minion damage, +X%
  ailment effect) — chased by mechanic-matching builds
- Defense (armor, evasion, ES, resists)

A mage finds a "+40 Str" ring and can still equip it — it's just
less useful for them than "+40 Int." That's the design.

### 6. Multiclass — designed for but built later

At endgame, unlock secondary class. Combo of 2 classes changes how
skills function AND talent trees resolve. Adjustment table merge
rule: additive math, multiplicative tags. Class affixes from both
apply at reduced rate (~75% each, not 100%).

Don't build now. Architect the `ClassSkillAdjustment` as a LIST of
class ids applied to a skill, not a single class — that makes the
multiclass merge trivial later.

## Weapons — 12 total

All class-neutral archetypes. Any class can use any weapon.

| Weapon | Archetype | Primary Scaling |
|---|---|---|
| Staff | AoE caster, slow cast | Int (spellPower, cast speed) |
| Wand | Fast caster, single target | Int (spellPower, crit) |
| Scepter | Hybrid cast-melee | Int + Str |
| Sword (1H) | Balanced melee | Str + Dex |
| 2H Sword | Heavy impact | Str (crit multi) |
| Dagger | Fast crit | Dex (attack speed, crit) |
| Mace | Stun/impact | Str (armor break) |
| Axe | Bleed/cleave | Str (bleed) |
| Polearm | Reach/sweep | Str (AoE) |
| Bow | Ranged precision | Dex (projectile + crit) |
| Crossbow | Ranged burst | Dex + Str |
| Fist weapons | Unarmed combo (claws/knuckles) | Dex + Str |

## Classes — 4 at launch, 8+ planned

### Phase 2 launch (4 classes)

**Mage** — Int-based spell caster
- Signature: Spell Echo (cast twice, second is % damage)
- Affinity: fire / cold / lightning
- Starting attributes: +5 Int, +2 Dex

**Witchdoctor** — Int+Chaos DoT/minion specialist
- Signature: Pandemic spread (DoTs propagate on death)
- Affinity: chaos
- Starting attributes: +3 Int, +4 Chaos

**Warrior** — Str-based heavy bruiser
- Signature: Berserk (rage stacks → damage amp)
- Affinity: physical, sometimes fire
- Starting attributes: +5 Str, +2 Dex

**Ranger** — Dex-based crit/projectile
- Signature: Hunter's Mark (mark spreads on kill)
- Affinity: lightning / cold
- Starting attributes: +5 Dex, +2 Str

### Phase 3+ expansion (add 2-3 per patch)
- Paladin (Str+Int, holy/fire, aura support)
- Necromancer (Int+Chaos, pure minion, bone)
- Assassin (Dex+Chaos, stealth, poison)
- Druid (balanced, elemental, transform)
- Bard (Dex+Int, songs/debuffs)
- Monk (Str+Dex, combo/stance)

## Ascendancies (Phase 3)

Each class has 2-3 ascendancy specializations unlocked at ~level 30.
Example — Witchdoctor ascendancies:
- **Plague Doctor** — pandemic goes wider, DoTs compound on transfer
- **Spirit Caller** — minion count cap +N, minions gain aura auras
- **Voodoo Hexer** — hex infinite duration, hexed deals % max HP

Ascendancies grant ~8 game-changing nodes, not stat boosts. Heavy
flavor, clear identity.

## Archetype grid (samples — full grid in Phase 2)

Just to prove the class×weapon combinations produce clear playstyles:

| Class | Staff | Dagger | Bow | Axe |
|---|---|---|---|---|
| Mage | Elementalist | Frost Assassin | Arcane Archer | Battle Mage |
| Witchdoctor | Plague Doctor | Plague Cutter | Witch Hunter | Chaos Axe |
| Warrior | Bonk Mage | Shadow Brute | Hunter | Berserker |
| Ranger | Storm Druid | Skirmisher | Sniper | Duelist |

Each cell: 1-line playstyle name + sparse adjustment block. ~5 mechanical
lines per cell. 4 × 12 = 48 cells at launch; adding a class later = 12
new adjustment blocks, not 10 new skills per weapon.

## Migration phases

### Phase 1 — Stop the bleeding (next session, early)
- Remove universal Lv5 element picker from UI
- Default each skill to its natural element (Haunt=cold, Locust=chaos,
  Toads=chaos, Hex=chaos, etc.)
- Convert element transforms from global feature → optional talent
  tree branch per skill
- Existing element-transform state field stays for backward compat,
  but UI stops surfacing it

### Phase 2 — Attributes + Class system scaffolding
- Design `AttributeState` with Str/Dex/Int/Chaos + per-level allocation
- Design `ClassSkillAdjustment` schema (sparse table)
- Build class adjustment resolver (applies BEFORE talent tree resolution)
- Build class talent tree component (reuse per-skill tree UI)
- UI: character sheet shows attributes, per-level allocation, class
  talent points separate from skill talent points

### Phase 3 — Author class content
- 4 classes × 12 weapons × 10 skills = 480 adjustment blocks
- Each ~5 mechanical lines. Systematic grinding with QA bot validation
  after each class batch.
- Class talent trees (~60 nodes × 4 = 240 passive nodes)
- Ascendancy selection UI + 2-3 ascendancies per class

### Phase 4 — Affix system revamp
- Delete class-specific / weapon-skill affixes (none exist yet, but
  don't add them)
- Add attribute affixes (+X Str/Dex/Int/Chaos)
- Add talent-effect amplifier affixes (+X% DoT, +X% minion damage)
- Rebalance existing affixes to fit attribute-driven scaling

### Phase 5 — Multiclass + expansion classes

## What stays from Session 2-3

- All 9 staff talent trees (39 nodes each)
- All rawBehavior wiring across hook surfaces
- Proc system, combo state system, minion subsystem
- `qa-staff-interactions.ts` end-to-end player-perspective bot
- NaN guards, defensive parsing, front-load absorb, etc.

The talent trees are the CONTENT layer. Class system is a
multiplicative layer on top of them, not a replacement.

## What gets removed

- Universal Lv5 element picker (UI + engine path)
- Per-skill `elementTransform` surfaced to user (keep the state field
  as a private engine field for talent-driven conversion)
- Coupling of "witchdoctor playstyle" to the staff weapon

## Open questions for next session

1. **4th attribute name.** "Chaos" is weird as a stat name (it's
   both a damage type and an attribute). Alternatives: Spirit?
   Willpower? Cunning? Zeal?
2. **Attribute point allocation:** 5 per level as proposed, or more/less?
   Can you refund? Respec cost?
3. **Ascendancy unlock mechanic:** level-gate, quest, or boss trophy?
4. **Class talent points:** separate budget vs shared with skill points.
   Recommendation: SEPARATE — ~1 class point per level, 1 skill point
   per skill level (current).
5. **Weapon proficiency:** any class any weapon (POE), or off-class
   weapon penalty? Recommendation: any class any weapon, but class
   adjustment makes off-archetype weapons feel clunkier (no bonus,
   not a penalty).
6. **Affix detail pass** — needs its own design session once class
   + attribute system lands.

## Reading order for the next session

1. This doc.
2. `docs/weapon-designs/staff-v2/SESSION_2_HANDOFF.md` (staff
   implementation reality + runtime-pending rawBehaviors).
3. `sim/qa-staff-interactions.ts` — understand the player-perspective
   QA pattern so we validate class system changes against it.
4. `src/types/character.ts` — current class enum, add attributes here.
5. `src/data/classes.ts` — current class defs, minimal.

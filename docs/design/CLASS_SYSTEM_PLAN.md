# Class System & Combat Identity — Design Plan

> Session handoff doc. Captures the design consensus reached 2026-04-14
> across five design rounds. Read this FIRST in the next session.
>
> **STATUS:** All core design questions ratified. Ready to begin Phase 1.
> **Last updated:** 2026-04-14

---

## Status at a glance

| System | Status |
|---|---|
| Class identity model | Ratified |
| Attribute system (4-axis) | Ratified |
| Morph rules (can/cannot change) | Ratified |
| Weapon proficiency (any-class, no penalty) | Ratified |
| Attribute-affix stacking math | Ratified |
| Attribute requirements on equipment | Ratified |
| Affix simplification (delete 5, add ~15) | Ratified |
| Combat timing model (4 skill kinds) | Ratified |
| Mana resource system | Ratified |
| Rotation logic (idle auto-sequence) | Ratified |
| Handedness / offhand / dual-wield rules | Ratified |
| MVP scope (2 classes × 2 weapons) | Ratified |
| **Phase 1** | **✅ COMPLETE + MERGED** (commits 9af84919, 36f85e84) |
| **Phase 2** | **✅ COMPLETE + MERGED** (commits 05c21cd5, a40e23cf, 53719558, bea9bb26, b057aaaf, 11b555c2, 6dcb1a02) |
| **Phase 3a.1-5** | **✅ COMPLETE + MERGED** (a464b1c4, aa09fdf5, c8b49864, 52c863ed, 02654bb4, e0530d9d, 446d28f1) |
| **Phase 4 (REDESIGNED)** | **Trigger-effect engine + full-morph resolver + class tree re-authoring** — see §Session 4 findings |
| Phase 4.5 | Affix system revamp (was Phase 4; pushed back) |
| Phase 3a.6 Ascendancies | Pending — needs engine framework (not just data) |
| Phase 3a.7 Per-skill timing field authoring | Pending — fields exist, values unauthored |
| Phase 3b+ | Weapons/classes added as trees become implemented |
| Phase 5 | Multiclass + uniques + flasks |
| Phase 6 | Cast-time + auto-attack + resource engine rework |
| Phase 7 | Rotation priority system |

---

## The problem we're solving

- Universal Lv5 element picker made every skill feel interchangeable. No successful ARPG does this for good reason.
- Classes (mage/warrior/ranger/rogue) currently exist as enum values but mean nothing mechanically.
- Staff skills are currently authored AS witchdoctor skills, coupling weapon archetype to class identity.
- Affix system is too generic — every affix is "+X stat," no axes that let players chase class/build identity through gearing.
- No attribute/stat-point system — classes have nothing to differentiate at creation.
- Attack speed / cast speed affect only cooldowns today — everything is instant damage on press, robbing speed stats of meaning.
- No resource system — skills fire on CD with no gating beyond timing, removing a full layer of build expression.

---

## Core design decisions (ratified)

### 1. Skills morph per class at the BASE, tree resolves against the morphed skill

NOT: one talent tree branch is "optimal for class X."
YES: the skill's BASE BEHAVIOR subtly changes per class, and the SAME talent tree resolves against that morphed base.

Example — `staff_locust` on three classes:
- **WD:** base = chaos DoT, Locust Swarm flavor → tree nodes apply on top of chaos DoT.
- **Warrior:** base = physical DoT, "Whirling Razors" flavor → same tree, different expression.
- **Mage:** base = cold DoT, "Frost Pestilence" flavor → same tree again.

Implementation: `ClassSkillAdjustment` table. Sparse, ~5 lines per (class, skill) cell. Modifier applies BEFORE talent tree resolution.

**Morph rules — CAN change:**
- Damage type (chaos → physical, fire → cold, etc.)
- Flavor name + visual (Locust Swarm → Whirling Razors)
- Secondary proc (add bleed on crit, add chill on hit)
- Scaling ratio weights within the delivery tag

**Morph rules — CANNOT change:**
- Delivery tag (spell stays spell, attack stays attack) — breaking this destroys the affix economy
- Skill ID — breaks talent trees
- Mechanic kind (DoT stays DoT, projectile stays projectile, channel stays channel) — breaks tree node meaning
- AoE shape / duration / base values — those live on the skill def, not the morph

If morphs cross delivery-tag or mechanic-kind boundaries, you've authored a new skill. The talent tree resolves against the wrong base and the whole system breaks.

### 2. Talent trees remain per-skill, single authored version

No per-class rewrites. Every (skill, class) combination uses the same 39-node tree. Class adjusts the SKILL, the tree applies normally.

**Trees authored in MECHANIC terms, not damage-type terms.** Existing staff trees already follow this (verified: `incDamage`, `incCritChance`, `damageMult` — no `incFireDamage`-style nodes). A class morph converting chaos → physical leaves tree value intact.

Preserves ALL Session 2-3 investment in the 9 staff trees.

### 3. Class trees — POE-style passive tree per class

~60 nodes per class. Different starting point for each. Clusters of thematic passives (minion, DoT, crit, defense, resource).

**Budget:** 1 class point per level, SEPARATE from skill talent points. At level 100 = 100 class points on a ~60-node tree. Room to full-build one thematic cluster + dip another.

**Ascendancies** (specializations) unlocked via **two-stage boss trophy**:
- Level 30: defeat class-specific trial boss → ascendancy SELECTION + 2 of 8 points
- Level 55: defeat harder variant → remaining 6 points

2-3 ascendancies per class. Each brings ~8 powerful nodes that dramatically reshape playstyle. Model: POE ascendancies / Last Epoch masteries.

### 4. Attributes — four-axis system with Spirit as 4th

| Attribute | Per point (scaling) |
|---|---|
| **Strength** | +3 max life, +0.2% armor, +0.5% melee physical damage |
| **Dexterity** | +2 accuracy, +0.5 evasion, +0.3% attack speed |
| **Intelligence** | +3 max mana, +2 energy shield, +0.5% spell damage |
| **Spirit** | +1 chaos resist, +0.5% DoT damage, +0.3% ailment potency |

- **5 attribute points per level** (tunable, but this is the shape)
- **Respec:** free under level 10, escalating gold cost thereafter (formula shape: `level² × 100`). Full-reset consumable drops from ascendancy bosses.
- **Starting baselines:**
  - Mage: +5 Int, +2 Dex
  - Witchdoctor: +3 Int, +4 Spirit
  - Warrior: +5 Str, +2 Dex
  - Ranger: +5 Dex, +2 Str

### 5. Attribute ↔ affix stacking math (load-bearing)

POE-style "increased" vs "more" distinction:

- **Attribute % damage = "more" (multiplicative pool)** — capped by attribute budget
- **Affix `incX` prefixes = "increased" (additive pool within a tag)**

```
finalDamage = base
            × (1 + sum(matching_increased_affixes))   // additive pool
            × (1 + sum(matching_more_multipliers))    // multiplicative pool
```

Example: Warrior-Locust (physical DoT) with 500 Str + 40% `incPhysDamage` + 30% `incDoTDamage`:
- increased pool = 40 + 30 = 70%
- more pool = 500 × 0.5 = 250%
- final = base × 1.70 × 3.50 = **5.95× base**

Without this separation, stacking becomes runaway. With it, attributes feel powerful but not game-breaking.

### 6. Attribute requirements on equipment

**Weapons:** gated by primary attribute.
- Attack melee (sword/axe/mace/greatsword/greataxe/maul) → Strength
- Ranged + dagger → Dexterity
- Spell (staff/wand/tome/gauntlet) → Intelligence
- Scepter (hybrid) → split requirement: half Str, half Int

Rough scaling: `weapon_level × 1.5` for primary attribute. Lvl 40 greatsword = 60 Str to equip.

**Armor:** gated by armor type.
- Plate → Strength
- Leather → Dexterity
- Cloth → Intelligence
- Cloaks / bracers / belt / accessories → no requirement

**Spirit intentionally gates no equipment at launch.** Pure power stat — DoT/ailment/chaos scaling only. Revisit in Phase 3+ if "spirit-gated ritual gear" becomes thematic.

**Respec violation handling:** respecing below an equipped item's requirement auto-unequips into inventory. No destruction, no respec lock.

**Unique items** may ignore attribute requirements as an explicit unique mod — design space for cross-class enablers.

**The "dead gear" fix:** a +80 Strength amulet is no longer useless to a Witchdoctor — it enables equipping an otherwise-gated 2H sword for hybrid builds.

### 7. Affixes — universal items, stat-driven value

Items usable by anyone (subject to attribute requirements). Value to a build varies by class, stats, and playstyle — not by class-lock flags.

### 8. Multiclass — designed for, built later

At endgame, unlock secondary class. Combo changes how skills function AND talent trees resolve. Adjustment table merge: additive math, multiplicative tags. Class affixes from both apply at reduced rate (~75% each).

Don't build now. Architect `ClassSkillAdjustment` with **LIST of class ids**, not single — makes multiclass merge trivial later.

---

## Combat model — timing, casts, auto-attacks

**Current tech debt:** all skills fire instantly on auto-sequence. Attack/cast speed affect cooldowns only. No visual texture.

**Target state:** four skill kinds with real timing. Auto-attacks fill gaps between abilities.

### Skill kinds

| Kind | Examples | Damage timing | Cost timing |
|---|---|---|---|
| **Instant** | Heal, dash, buff | On press | On press |
| **Cast** | Most spells, nukes | On cast completion | On press (refunded on cancel) |
| **Channel** | Whirlwind, beam, drain | Per tick while active | Per tick |
| **Auto** | Weapon auto-attack | Per swing/cast | Free (always) |

### Auto-attacks as pseudo-skills

Implement AAs as real skills (`staff_auto`, `sword_auto`, `bow_auto`, etc.), not bolted-on special cases:
- Go through the same rawBehavior pipeline as skills
- Can be class-morphed (Warrior-staff-auto = physical zap instead of chaos)
- Can have talent tree interactions
- Benefit from affixes normally

**Firing rule:** AA fires on its weapon timer ONLY when no player-selected skill is executing or ready-to-fire-this-tick. Gap-filler behavior.

**AA DPS target:** 30-50% of full-rotation DPS. Strong enough to matter, not strong enough to replace skills.

**AAs are always free** — never cost mana. A mana-dry character must have something on screen.

### Speed stats

| Stat | Affects |
|---|---|
| Attack speed | Attack AA rate, attack-skill cast time, attack channel tick rate |
| Cast speed | Spell AA rate, spell cast time, spell channel tick rate |
| Weapon speedModifier | Baseline interval (values in `weapons.ts` already correct) |

**Stacking (additive %):**
```
effectiveInterval = weaponBaseInterval
                  × (1 / (1 + attackSpeedPct + castSpeedPct))  // matching type only
                  × skillSpeedModifier                           // per-skill override
```

### Timing conventions

- **Cast interruption from damage:** NO (ARPG standard — casters unplayable otherwise)
- **Cast cancellation:** yes, by firing a new skill or player override (future manual mode)
- **Resource cost timing:** paid on cast START, refunded on cancel, not refunded on complete
- **Cooldown timing:** CD starts on cast START (not completion). A 2s cast + 5s CD skill → 2s cast, 3s more before reuse.
- **Cast time floor:** no baseline cast > 1.5s except designated "ultimate" skills. Cast-speed scaling compresses ceiling; don't author near the ceiling at base.

### Proc surface expansion (Phase 6)

Current procs fire on a single event. New surfaces needed:
- `onCastStart` — cast begins
- `onDeliver` — damage lands (replaces today's implicit `onHit`)
- `onChannelTick` — per tick during channel
- `onAutoAttack` — per AA fire
- `onCastCancel` — refund/cleanup logic

Migration: 30-50% of existing rawBehaviors need light re-categorization. 10% need rewrites. QA bot with time-simulation validates.

---

## Mana resource system

**Universal name: "Mana"** — avoids multiclass-merge complexity, instantly familiar.

### Class-flavored regen dynamics (same resource, different rules)

| Class | Max pool | Starts at | Regen model |
|---|---|---|---|
| Mage | High | Full | Fast passive regen |
| Witchdoctor | Very high | Full | Slow passive regen + chunk on kill |
| Warrior | Low | **Empty** | Gains mana on hit dealt/taken (rage-flavored) |
| Ranger | Small | Full | Very fast regen + gain on crit (energy-flavored) |

Multiclass resolves cleanly: average regen rules at 75% each.

### Resource-driven rotation rule

**"Fire first skill that is (off-CD) AND (affordable) left-to-right. Skip if either fails. Never stall."**

- Unaffordable skills skip their turn, don't block rotation
- Resource cost tunes USE FREQUENCY, not all-or-nothing gating
- Expensive nukes fire every few rotations; cheap fillers every rotation

### Mana lifecycle

- **Zone transition:** full mana refill + full flask charges + minor heal
- **Death:** full refill on respawn
- **Combat start:** no change (persists)

### Class tree interactions

Class trees include resource nodes:
- Warrior tree: "+50 max mana" / "gain 5 mana per kill"
- Mage tree: "+20% mana regen" / "5% of damage dealt returns as mana"

Class tree IS the resource personalization layer. Reinforces class identity.

---

## Rotation logic (idle auto-sequence)

**Current model:** left-to-right, first off-CD skill fires. No player input.

**New model (post-Phase 6):** left-to-right, first off-CD AND affordable skill fires. Auto-attack fills gaps.

**Known limitation:** players converge on "longest-CD nuke leftmost, fast fillers rightmost." Build diversity collapses.

**Phase 7 mitigation:** conditional firing rules per skill slot:
- "Fire only if target HP < 50%"
- "Fire only if buff X not active"
- "Fire only if Y stacks on target"
- "Always fire"

Adds rotation strategy without manual input. Engine hook for `firingCondition` reserved in Phase 6 architecture.

**Manual cast mode (optional, future):** player-clickable abilities. Resource management and cast-time commitment matter more in this mode. Design engine to gracefully support both.

---

## Affix system — simplified post-rework

### Deletions (Phase 4)

| Affix | Reason |
|---|---|
| `dot_multiplier` (Malignant) | Redundant with `inc_dot_damage` |
| `ailment_duration` (of Lingering) | Duration is a skill property, not a gear stat |
| `inc_channel_damage` (Focused) | Covered by spell damage + cast speed |
| `weapon_mastery` (of Mastery) | Vague, redundant |
| `fortify_effect` (of Steadfastness) | Overlaps with `damage_taken_reduction` |

### Additions (Phase 4)

**Attribute affixes (4 types × 10 tiers = 40 rolls):**
- `flat_strength` — rings, amulets, gloves, belts, plate armor
- `flat_dexterity` — rings, amulets, gloves, belts, leather armor
- `flat_intelligence` — rings, amulets, gloves, belts, cloth armor
- `flat_spirit` — rings, amulets, cloaks, trinkets
- `all_attributes` (rare hybrid) — amulets only

**Resource affixes (5 types × 10 tiers = 50 rolls):**
- `flat_max_mana` — focus, amulet, rings, chest
- `inc_max_mana` — chest, amulet
- `mana_regen` — all armor, rings
- `reduced_mana_cost` — amulet, gloves
- `mana_on_kill` — amulet, rings, weapon

**Mechanic amplifiers (1 new type):**
- `inc_minion_damage` — all weapons, amulets, gloves

**Skill scaling (1 type):**
- `+N to skill level [weapon_family]` — e.g. "+1 to all staff skills"

### Player mental model (post-simplification)

Six affix categories:
1. **Damage** — flat, percent by type, percent by mechanic
2. **Speed** — attack speed, cast speed
3. **Crit** — chance, multi
4. **Defense** — armor, evasion, ES, resists, block, DR
5. **Sustain** — life, mana, regen, leech, life on hit/kill
6. **Attributes** — Str/Dex/Int/Spirit

Plus penetration as high-end chase.

New player reads every affix tooltip and understands the system within an hour. No wiki required. Depth lives in combining affixes with class morphs, trees, and uniques — not tooltip minutiae.

---

## Weapons — 14 total

All class-neutral archetypes. Any class can use any weapon (subject to attribute requirement).

| Weapon | Scaling | Attribute req | Archetype |
|---|---|---|---|
| Sword (1H) | attack | Str | Balanced melee |
| Greatsword (2H) | attack | Str | Heavy impact |
| Axe (1H) | attack | Str | Bleed/cleave |
| Greataxe (2H) | attack | Str | Heavy cleave |
| Mace (1H) | attack | Str | Stun/impact |
| Maul (2H) | attack | Str | Reach/sweep |
| **Dagger** | **attack** (was hybrid — Phase 1 fix) | Dex | Fast crit |
| Bow (2H) | attack | Dex | Ranged precision |
| Crossbow (2H) | attack | Dex | Ranged burst |
| Scepter (1H) | hybrid | Str + Int | Cast-melee (genuine) |
| Staff (2H) | spell | Int | AoE caster |
| Wand (1H) | spell | Int | Fast single-target cast |
| Gauntlet (1H) | spell | Int | Close-cast |
| Tome (2H) | spell | Int | 2H caster |

**Phase 1 fix:** `dagger: { scaling: 'hybrid', ... }` → `scaling: 'attack'` in `weapons.ts:31`. This drops dagger from the `spell_weapons` affix pool automatically via the existing slot-group map.

**Weapon scaling locked:** each weapon's scaling type is FIXED regardless of class. A Warrior using a staff is still casting spells, just with class-morphed damage types. Class identity under off-archetype weapons comes from class tree + unique items, NOT from re-weighting weapon scaling.

**2H affix scale multiplier:** add a field to `WEAPON_TYPE_META`:

```ts
export interface WeaponTypeMeta {
  scaling: WeaponScalingType;
  speedModifier: number;
  handedness: '1h' | '2h';
  category: 'melee' | 'ranged' | 'spell';
  affixScaleMultiplier: number;  // NEW: 1.0 for 1H, 2.0 for 2H (Phase 1)
}
```

Damage-scaling affix rolls multiply by this. Speed/crit/utility affixes unchanged. A 2H greatsword "Brutal" T1 rolls at 34-50 flat phys instead of 17-25. Compensates for the opportunity cost of losing the offhand slot.

---

## Handedness / offhand / dual-wield rules

### Slot occupancy by weapon type

| Weapon | Slots occupied | Offhand compatibility |
|---|---|---|
| 1H attack (sword, axe, mace, dagger) | Mainhand only | Shield, 1H attack (DW), 1H spell (cross-DW) |
| 1H spell (wand, gauntlet) | Mainhand only | Focus, 1H spell (DW), 1H attack (cross-DW) |
| 1H hybrid (scepter) | Mainhand only | Shield, focus, any 1H (DW) |
| 2H attack (greatsword, greataxe, maul) | Both hands | None |
| 2H spell (staff, tome) | Both hands | None |
| Bow / Crossbow (2H ranged) | Both hands | **Quiver** (special exception) |

### Offhand types

- **Shield** — defense (armor, block, life, resists). Str-flavored. Legal only with 1H attack/hybrid mainhand.
- **Focus** — caster offhand (spell damage, mana, spell-specific stats). Int-flavored. Legal only with 1H spell/hybrid mainhand.
- **Quiver** — ranged offhand (projectile damage, crit, attack speed). Dex-flavored. Legal only with bow/crossbow (2H exception).

### Equip validation logic (Phase 2 implementation)

On equip attempt:
1. Attribute requirement met (see §6)
2. Handedness check: 2H mainhand force-unequips offhand; equipping offhand while 2H held → reject
3. Offhand compatibility: shield rejects on spell mainhand; focus rejects on attack mainhand; quiver rejects on non-bow/crossbow
4. Dual-wield check: both slots must be 1H (cross-type allowed — dagger + wand is legal, just weird)

Conflict resolution matches respec-violation rule: auto-unequip blocker into inventory, no destruction.

### Dual-wield mechanics (Phase 6 engine work)

- Both weapons' stats apply (damage, affixes, speed)
- **Attack behavior (recommendation):** alternating swings, each uses that weapon's stats. Deferred to Phase 6 for final decision.
- Base DW bonus: +10% attack speed (compensates for complexity)
- Cross-type DW allowed (legal but no bonus)

### Design space (Phase 5+)

Uniques and ascendancies open up:
- Unique 2H: "Counts as 1H for offhand purposes" — 2H + shield fantasy
- Warrior ascendancy: "May equip shield with 2H weapons"
- Ranger ascendancy: "Dual-wielding grants +30% attack speed, +50% damage"
- Unique dagger pair: "+X% damage per matching dagger equipped"
- Unique focus: "Counts as shield for block purposes"
- Unique staff/tome: "Allows equipping offhand focus" — dual-caster design

All deferred, not blocking launch.

---

## Classes — phased rollout (not "4 at once")

Content authored against IMPLEMENTED weapon trees. MVP ships when 2 classes × 2 weapons are complete — not when a pre-declared roster is fully authored. Each class joins live play as its natural weapons' trees are ready.

### MVP class roster (Phase 3a — v1.0)

Chosen because their natural weapons (Staff, Dagger) are the only ones with implemented trees today. Promoting both to launch proves the class morph pipeline across divergent fantasies on both weapons.

**Witchdoctor** — Int+Spirit DoT/minion specialist.
- Signature: Pandemic spread (DoTs propagate on death)
- Affinity: chaos
- Starting attributes: +3 Int, +4 Spirit
- Mana: very high pool, full start, slow regen + chunk on kill
- Natural weapons: Staff (confirmed), Tome (when tree lands)

**Assassin** — Dex+Spirit stealth/poison/crit specialist. **Promoted from Phase 3+ expansion on 2026-04-14** because Dagger is implemented and Assassin is the native dagger class.
- Signature: Culling Strike (kills targets below 10% HP, spreads poison on kill — synergizes with WD Pandemic)
- Affinity: chaos (poison) + physical (stealth strikes)
- Starting attributes: +4 Dex, +3 Spirit
- Mana: small pool, full start, very fast regen + mana on crit (energy-flavored)
- Natural weapons: Dagger (confirmed), Claw/Fist-weapons (when tree lands)

### Near-term launch roster (Phase 3b-d — v1.x)

Add as their natural weapon trees become implemented:

**Mage** — Int-based spell caster. Add when wand or tome tree lands.
- Signature: Spell Echo (cast twice, second is % damage)
- Affinity: fire / cold / lightning
- Starting attributes: +5 Int, +2 Dex
- Mana: high pool, full start, fast regen
- Natural weapons: Wand, Tome

**Warrior** — Str-based heavy bruiser. Add when sword/axe/mace tree lands.
- Signature: Berserk (mana builds with action → damage amp)
- Affinity: physical, sometimes fire
- Starting attributes: +5 Str, +2 Dex
- Mana: low pool, **empty start**, builds on hit dealt/taken
- Natural weapons: Sword, Greatsword, Axe, Greataxe, Mace, Maul

**Ranger** — Dex-based crit/projectile. Add when bow or crossbow tree lands.
- Signature: Hunter's Mark (mark spreads on kill)
- Affinity: lightning / cold
- Starting attributes: +5 Dex, +2 Str
- Mana: small pool, full start, very fast regen + crit gain
- Natural weapons: Bow, Crossbow

### Post-launch expansion (Phase 5+)

- Paladin (Str+Int, holy/fire, aura support)
- Necromancer (Int+Spirit, pure minion, bone)
- Druid (balanced, elemental, transform)
- Bard (Dex+Int, songs/debuffs)
- Monk (Str+Dex, combo/stance)

---

## Ascendancies (Phase 3a for MVP classes)

2-3 per class, unlocked via two-stage boss trophy (levels 30 & 55). ~8 game-changing nodes each. Heavy flavor, clear identity — NOT stat boosts.

### Witchdoctor ascendancies (Phase 3a)
- **Plague Doctor** — Pandemic goes wider, DoTs compound on transfer
- **Spirit Caller** — Minion count cap +N, minions gain auras
- **Voodoo Hexer** — Hex infinite duration, hexed deals % max HP

### Assassin ascendancies (Phase 3a — new authoring)
- **Nightblade** — Stealth on skill use, first attack from stealth crits guaranteed + poison stacks double-apply
- **Venomlord** — Poison stacks can exceed cap; poison detonates on target death dealing % of remaining DoT as AoE chaos
- **Ghostblade** — Dual-wield masters; swings alternate auto-crit + auto-poison; movement speed permanently buffed

### Future class ascendancies
Authored when each class ships (Phase 3c). Approx 2-3 per class following the same template.

---

## Archetype grid (samples)

Proof that class × weapon combinations produce clear playstyles. **Bold cells = MVP scope (Phase 3a).** Others are aspirational, authored as classes/trees land.

| Class | **Staff** | **Dagger** | Bow | Axe | Wand | Sword |
|---|---|---|---|---|---|---|
| **Witchdoctor** | **Plague Doctor** ⭐ | **Plague Cutter** ⭐ | Witch Hunter | Chaos Axe | Hex Caster | Voodoo Blade |
| **Assassin** | **Voodoo Shaman** ⭐ | **Nightblade** ⭐ | Poison Hunter | Reaper | Shadow Mage | Duelist |
| Mage | Elementalist | Frost Bladedancer | Arcane Archer | Battle Mage | Pyromancer | Spellblade |
| Warrior | Bonk Mage | Shadow Brute | Hunter | Berserker | Rune Warden | Champion |
| Ranger | Storm Druid | Skirmisher | Sniper | Tempest | Shocker | Blade Dancer |

**⭐ = Phase 3a MVP cell.** 2 classes × 2 weapons = 4 cells × ~10 skills = **~40 morph entries for launch.**

Each cell: ~5 mechanical lines + 1 flavor name. Full aspirational matrix (all classes × 14 weapons × ~10 skills) ≈ 700+ entries — authored incrementally over v1.x and beyond.

**Authoring strategy:** systematically by (class, weapon) pair as weapon trees become implemented. Each new tree unlocks morph authoring for ALL launched classes against that weapon. Each new class unlocks morph authoring against all implemented-tree weapons. Data-only work; parallel to engine work.

---

## Forward-compatible data fields (author NOW, engine implements in Phase 6)

Every skill definition gets these fields during Phase 3 authoring. Engine ignores until Phase 6 — zero data migration when engine catches up.

```ts
interface SkillDef {
  // existing fields...
  skillKind: 'instant' | 'cast' | 'channel' | 'auto';
  castTime: number;            // seconds; 0 = instant
  channelTickInterval?: number;
  recoveryTime?: number;
  manaCost: number;
}

interface ClassSkillAdjustment {
  skillId: string;
  classIds: string[];          // LIST not single — multiclass-ready
  damageTypeOverride?: DamageType;
  flavorName?: string;
  visualOverride?: string;
  secondaryProc?: ProcDef;
  castTimeMult?: number;
  // skillKindOverride?: SkillKind;  // rare, use sparingly
}
```

---

## Session 4 Findings (2026-04-14, live-test) — why Phase 4 was redesigned

After Phase 1 + 2 + 3a.1-5 were merged to master and live-tested, two core issues surfaced that the original phase plan didn't anticipate:

### Finding 1: Morph layer is only half-wired

**Symptom:** Assassin casting `staff_haunt` deals physical damage in combat (correct), and SkillPanel shows the name "Shadow Strike" (correct), but UI still displays the skill's original `tags` (Cold/DoT/Spell), the tooltip's damage-type preview, and the flavor description unchanged.

**Root cause:** the UI and DPS-preview pipelines read `skill.tags`, `skill.description`, `skill.castTime` etc. **directly from the raw skill def**. The class-morph override is only applied inside `tick.ts`'s combat resolution — every other consumer is blind to it.

**Fix (Phase 4 sub-phase 1):** introduce `getEffectiveSkillDef(skill, classId): SkillDef` as the single morph-aware resolver. Retrofit every consumer (`SkillPanel`, `calcSkillDps`, tooltip renderers, etc.) to read through this helper. Combat tick also consumes the resolved skill directly, simplifying the current elementTransform threading.

**Schema additions needed:** `flavorDescription?: string` and `tagOverride?: DamageTag[]` on ClassSkillAdjustment so morphs can explicitly rewrite description and tag array when the auto-rewrite from `damageTypeOverride` isn't sufficient.

### Finding 2: Class tree nodes are stat-sticks because the effect schema only supports stats

**Symptom:** the 48 class tree nodes authored in Phase 3a.5 have flavorful names ("Pack Hunter", "Widow's Kiss", "Pandemic Bloom") but mechanics reduce to `{ damageMult: 1.15, clearSpeedMult: 1.08 }` — generic stat buffs. Flavor descriptions promise mechanics the engine can't deliver.

**Root cause:** the existing `SkillTreeNode.effect` shape (`damageMult`, `defenseMult`, `clearSpeedMult`, `xpMult`, `itemDropMult`, `materialDropMult`, `critChanceBonus`, `critMultiplierBonus`, `resistBonus`, `ignoreHazards`, `doubleClears`) is **legacy** — it was designed for the OLD passive tree system where nodes modified zone-clear performance metrics, not active-combat identity.

**Fix (Phase 4 sub-phases 3-5):** replace the flat `effect` object with a typed `effects: TalentEffect[]` union supporting triggers (`procOnTag`, `procOnKill`, `procOnHit`, `procOnCrit`), conditional modifiers (`whileTag`, `perStack`), cross-skill synergies (`grantTagOnSkill`), and action payloads (`summon`, `applyTag`, `triggerSkill`, `healSelf`, `grantBuff`).

**Key insight:** the same trigger-effect schema powers:
- Class tree keystones (Phase 4)
- Ascendancy nodes (Phase 3a.6 when it lands)
- Per-skill class overlays (Phase 4 sub-phase 7 — "Path B" from Session 4 design conversation)
- Unique item effects (Phase 5)
- Future combat procs from Phase 6

Invest once, reuse everywhere.

### Finding 3: Class tree UI was invisible — wrong screen

**Symptom:** the WD Voodoo/Spirits/Plague and Assassin Shadow/Venom/Blades trees authored in Phase 3a.5 didn't appear anywhere in-game.

**Root cause:** CharacterScreen.tsx (where I originally mounted AttributePanel + ClassTalentPanel) is dead code — never imported. App.tsx routes the "Hero" tab to HeroScreen.tsx. `ClassTalentPanel` had been explicitly unmounted in a prior "Skill Tree Overhaul Phase 0" cleanup.

**Fix (already live, commits `e0530d9d` + `446d28f1`):** re-mounted both panels on HeroScreen right below `<CharacterHeader />`. Class tree is now visible in production. CharacterScreen.tsx remains dead code — should be removed in a future cleanup pass.

### Finding 4: Per-skill trees share across classes by design — can't alone express class-weapon uniqueness

**Context:** user's design goal is that a Witchdoctor wielding a dagger should have dagger-skill talent trees that offer WD-flavored branches (chaos DoT / hex / pandemic paths) distinct from an Assassin wielding that same dagger (stealth / venom / dual-wield branches), without duplicating 20+ skill trees per class.

**Resolution (Phase 4 sub-phase 7):** add `classOverlays?: Record<CharacterClass, SkillTreeNode[]>` to per-skill tree data. Per-skill shared tree remains the mechanical backbone (damage scaling, crit, DoT duration — damage-type-agnostic). Overlay cluster per class adds class-thematic keystones (auto-hidden when a different class picks up the skill). Authoring cost linear (not combinatorial) in class × skill count.

### Phase 4 scope (revised)

The original Phase 4 ("affix simplification — delete 5, add ~15") is postponed to **Phase 4.5** as smaller scope. Phase 4 now delivers the three architectural fixes above plus class-tree re-authoring with the new schema. Estimated ~8-12 commits, one focused session. Branch: `class-system-phase-4`.

**Hard reject in Phase 4:** keep legacy effect keys "for compatibility". The keys describe zone-clear modifiers that have no place on class-identity trees. Every remaining consumer of those keys (if any) should either move to the new schema or be removed.

### What stays valid from earlier design

- MVP class roster (Witchdoctor + Assassin) — unchanged
- Morph rules (can change damage type, flavor name, secondary proc, cast/mana muts; cannot change delivery tag, skill ID, mechanic kind, base values) — unchanged
- Shared per-skill trees with mechanic-neutral nodes — still the right architecture, now augmented with class overlays
- Attributes, mana, equip requirements, weapon affixScaleMultiplier, 7-phase overall sequencing — all unchanged

---

## Migration phases (7 total)

### Phase 1 — Stop the bleeding + foundational audits (start here)
- Fix `dagger: 'hybrid'` → `'attack'` in `src/data/weapons.ts:31`
- Add `affixScaleMultiplier: number` field to `WeaponTypeMeta` interface + populate (1.0 for 1H, 2.0 for 2H) across all 14 weapon entries
- Remove universal Lv5 element picker from UI
- Default each skill to its natural element (Haunt=cold, Locust=chaos, Toads=chaos, Hex=chaos, etc.)
- Convert element transforms from global feature → optional talent tree branch per skill
- Existing `elementTransform` state field stays (private engine field) for backward compat; UI stops surfacing it
- **Audit: minion damage tag routing** — verify damage pipeline can tag minion damage as a distinct source for affix pooling. Gates Phase 2 resolver design.
- **Audit: offhand slot schema** — verify the equip model has a separate `offhand` slot and handedness awareness. Confirm whether to build validation in Phase 2 or just wire into existing infra.

### Phase 2 — Attributes + class scaffolding + mana schema
- `AttributeState` with Str/Dex/Int/Spirit + per-level allocation (5/level)
- Attribute → stat resolver (see §4 numbers)
- Attribute requirement field on weapons + armor + equip validation
- `ClassSkillAdjustment` schema (sparse table, LIST of class ids)
- Class adjustment resolver (applies BEFORE talent tree resolution)
- Class talent tree component (reuse per-skill tree UI)
- Mana schema (`maxMana`, `currentMana`, `regenPerSec`, `startingValue`)
- UI: character sheet shows attributes, per-level allocation, class talent points separate from skill talent points

### Phase 3a — MVP class content (Witchdoctor + Assassin × Staff + Dagger)

**This is the v1.0 launch scope.** Proves the class-morph pipeline end-to-end on a tight surface before scaling.

- 2 classes × 2 weapons × ~10 skills = **~40 adjustment blocks**
- Each ~5 mechanical lines + 1 flavor name
- 2 class talent trees (~60 nodes each = ~120 nodes)
- Ascendancy selection UI + 2-3 ascendancies per class (8 nodes each) = 32-48 ascendancy nodes total
- **Author `skillKind`, `castTime`, `manaCost` on every skill** (forward-compat — engine ignores until Phase 6)
- QA bot validation pass after each class (2 full passes)

**Assassin content to author from scratch** (class def, 60-node tree, 2-3 ascendancies, starting mana, signature ability Culling Strike).

### Phase 3b — Expand horizontally (new weapon trees added)

When a weapon tree is implemented (e.g. Sword tree lands):
- Author morphs for that weapon across all launched classes
- 2 classes × 1 new weapon × ~10 skills = ~20 entries per weapon drop
- Off-archetype cells (e.g. Witchdoctor × Sword) still get morphs — fantasy stays consistent

### Phase 3c — Expand vertically (new classes added)

When a new class launches (e.g. Mage added after Wand tree lands):
- Author morphs for that class across all implemented weapons
- 1 new class × N implemented weapons × ~10 skills
- New class talent tree (~60 nodes) + 2-3 ascendancies (8 nodes each)

### Phase 3d — Full matrix completion

Target state: all launched classes × all launched weapons fully morphed. Incremental; no hard ship date on matrix completion.

### Phase 4 — Trigger-effect engine + full-morph resolver + class-tree re-authoring (REDESIGNED)

See §Session 4 Findings below for why this replaces the original "affix revamp" Phase 4.

**Sub-phases:**

1. **`getEffectiveSkillDef(skill, classId)` resolver** — single helper that returns a fully-morphed SkillDef (name, tags, description, castTime × mult, manaCost × mult, baseConversion.to = damageTypeOverride). Retrofit all UI + DPS preview + combat call sites to read through it instead of raw `skill.name` / `skill.tags`. Fixes "morph is half-wired" — tag badges, tooltips, descriptions all reflect class morph.

2. **Morph schema extensions** — add `flavorDescription?: string` and `tagOverride?: DamageTag[]` to ClassSkillAdjustment so morph cells can also rewrite description + tag array explicitly when the auto-rewrite from damageTypeOverride isn't enough.

3. **Trigger-effect engine for class talents.** Replace the flat `effect: { damageMult, defenseMult, clearSpeedMult, ... }` shape on SkillTreeNode with a typed `effects: TalentEffect[]` union:

   ```ts
   type TalentEffect =
     | { kind: 'stat', stat: StatKey, delta: number }
     | { kind: 'statMult', stat: StatKey, mult: number }
     | { kind: 'procOnTag', tag: 'hex'|'curse'|'mark'|'poison'|'bleed'|'ignite'|'chill',
         chance: number, action: TalentAction }
     | { kind: 'procOnKill', tag?: DamageTag, chance: number, action: TalentAction }
     | { kind: 'procOnHit',  tag?: DamageTag, chance: number, action: TalentAction }
     | { kind: 'procOnCrit', chance: number, action: TalentAction }
     | { kind: 'whileTag', tag: string, stat: StatKey, mult: number }
     | { kind: 'perStack', stack: string, stat: StatKey, perStackDelta: number, cap?: number }
     | { kind: 'grantTagOnSkill', skillTag: string, addTag: string };

   type TalentAction =
     | { kind: 'summon', minionType: string, count?: number, durationSec?: number }
     | { kind: 'applyTag', tag: string, stacks?: number, duration?: number }
     | { kind: 'triggerSkill', skillId: string }
     | { kind: 'healSelf', amount: number }
     | { kind: 'grantBuff', buffId: string, duration: number };
   ```

4. **Delete vestigial effect keys:** `clearSpeedMult`, `doubleClears`, `ignoreHazards`, `xpMult`, `itemDropMult`, `materialDropMult` from talent node effects. These are legacy from when passive trees were zone-clear modifiers; inappropriate for class identity.

5. **Engine dispatcher** — wire `procOnTag` / `procOnKill` / `procOnHit` / `procOnCrit` into the damage pipeline's existing event surfaces (or expand proc surfaces if needed). Implement `TalentAction` handlers: summon, applyTag, triggerSkill, grantBuff, healSelf. `whileTag` / `perStack` integrate into `resolveStats` as conditional modifiers.

6. **Re-author class trees** — replace the 48 stat-stick class tree nodes I wrote in Phase 3a.5 with nodes that use the new schema. Each path: 2-3 keystones (mechanical identity) + 5-6 stat-sticks (scaling backbone). Example: "Pack Hunter — Applying hex/curse/mark has 25% chance to summon a zombie dog."

7. **Per-skill class overlays (Path B from Session 4 discussion)** — add `classOverlays?: Record<CharacterClass, SkillTreeNode[]>` to per-skill tree data. UI resolver concatenates `sharedNodes + (classOverlays[char.class] ?? [])`. Author ~4-5 overlay nodes per (class × skill) cell for MVP coverage: ~80 overlay nodes.

8. **UI updates** — render new effect types in tooltips, visual keystone badge, overlay section separator in tree UI.

**Scope estimate:** full focused session, ~8-12 commits. Worth its own branch (`class-system-phase-4`).

**Unlocks:** same trigger-effect schema powers ascendancy keystones (Phase 3a.6), unique item effects (Phase 5), and potentially Phase 6 combat procs. Invest once, reuse everywhere.

### Phase 4.5 — Affix system revamp (pushed back from original Phase 4)
- Delete 5 affixes (see Affix Deletions)
- Add ~15 affix types (4 attributes + 5 resources + minion damage + skill-level + hybrids)
- Rebalance existing affix tier values against attribute-driven scaling
- Attribute requirement enforcement on all items (weapons + armor)
- Populate `attributeRequirement` field on ItemBaseDef entries (iLvl × 1.5 per design §6)

### Phase 5 — Multiclass + uniques + flasks
- Multiclass enablement (secondary class unlock at endgame)
- Unique item design (including "ignore attribute requirement" / "scale with different attribute" archetypes)
- POE-style flask system (equippable slots, charge-refill on kill/zone, auto-fire rules)

### Phase 6 — Cast time + auto-attack + resource engine rework
- Skill engine state machine (idle → casting → delivering → recovery)
- Auto-attack pseudo-skills per weapon (staff_auto, sword_auto, bow_auto, etc.)
- Time-based tick simulator (~100ms granularity)
- Proc surface expansion (`onCastStart`, `onDeliver`, `onChannelTick`, `onAutoAttack`, `onCastCancel`)
- **QA bot rewrite** — time simulation, not event sequence. **BUDGET A FULL SESSION FOR THIS ALONE.**
- Existing rawBehavior audit (30-50% need light re-categorization, 10% need rewrites)
- Resource engine (mana spend, regen ticks, per-class generation rules)
- Resource-gated rotation logic (skip unaffordable, never stall)

### Phase 7 — Rotation priority system
- Conditional firing rules per skill slot (HP %, buff presence, debuff absence, stacks)
- Engine hook reserved in Phase 6 architecture
- Manual cast mode consideration (optional)

---

## What stays from Session 2-3

- All 9 staff talent trees (39 nodes each)
- All rawBehavior wiring across hook surfaces (audit required in Phase 6)
- Proc system, combo state system, minion subsystem
- `sim/qa-staff-interactions.ts` end-to-end player-perspective bot (rewrite required in Phase 6 for time simulation)
- NaN guards, defensive parsing, front-load absorb, etc.

Talent trees are the CONTENT layer. Class system is a multiplicative layer ON TOP, not a replacement.

---

## What gets removed

- Universal Lv5 element picker (UI + engine path)
- Per-skill `elementTransform` surfaced to user (keep state field as private engine field for talent-driven conversion)
- Coupling of "witchdoctor playstyle" to the staff weapon
- Dagger's hybrid scaling
- 5 redundant/niche affixes (`dot_multiplier`, `ailment_duration`, `inc_channel_damage`, `weapon_mastery`, `fortify_effect`)

---

## Rejected designs (documented so we don't regress)

- **Class-specific / weapon-skill-specific affixes** — gear becomes build-coupled, inventory bloat, unclear value to players.
- **Off-archetype weapon penalty for classes** — use positive signaling (bonus) not punishment; unbonused weapons feel different via missing class morph.
- **Per-class resource TYPES (mana / rage / energy / essence as separate systems)** — multiclass merge nightmare; over-engineered for idle auto-play where resource isn't actively managed.
- **Gold-gated auto-potions as login mechanic** — predatory F2P pattern, punishes logged-off time, creates negative association with logging off. Use POE-style flasks instead (charge refill on kill/zone).
- **Class-based weapon scaling shifts (e.g., Warrior-staff = 80% spell / 20% phys)** — breaks the "spell weapons are spell, attack weapons are attack" clarity. Let class trees and uniques handle off-archetype identity instead.
- **Cast interruption from damage taken** — casters unplayable; balance complexity with no gameplay benefit.
- **Ailment-effect and DoT-multiplier as separate affix stats** — wiki-bait complexity. Collapses into `inc_dot_damage` cleanly.
- **Class morphs changing delivery tag (spell → attack) or mechanic kind (DoT → hit)** — breaks talent tree resolution AND affix economy.
- **Instant-damage-on-press for all skills** — renders attack/cast speed cosmetic, robs idle sim of visual texture.

---

## Open questions deferred to later phases

- **Advanced affix tuning pass** (Phase 4, once attributes live)
- **Flask affix pool design** (Phase 5)
- **Minion damage tag routing audit** — verify before Phase 2 that minion damage can be a taggable damage source for affix pooling
- **DoT vs ailment distinction documented precisely in code** (Phase 4 prereq)
- **Idle progression cadence tuning** — publish target "time to kill" curve per level tier. Author skills + mob HP against that curve (Phase 6 tuning)

---

## Reading order for the next session

1. **This doc** — canonical design source.
2. `docs/weapon-designs/staff-v2/SESSION_2_HANDOFF.md` — staff implementation reality + runtime-pending rawBehaviors.
3. `sim/qa-staff-interactions.ts` — player-perspective QA pattern. Will need time-simulation rewrite in Phase 6.
4. `src/types/character.ts` — current class enum; attributes added here in Phase 2.
5. `src/data/classes.ts` — current class defs; expanded in Phase 2.
6. `src/data/weapons.ts` — dagger fix in Phase 1 (line 31).
7. `src/data/affixes.ts` — deletions + additions in Phase 4.

---

## Glossary

- **Morph** — class-specific variant of a (weapon, skill) pair. Changes theme / damage-type / secondary-proc. Cannot change delivery tag, skill ID, mechanic kind, or skill base values.
- **Delivery tag** — spell vs attack. Determined by weapon + skill authoring, never by class.
- **Mechanic kind** — DoT / projectile / AoE / channel / instant. Set by skill, invariant across morphs.
- **Increased pool** — additive % from affixes (`inc_X` prefixes). Stacks additively within a damage-type or mechanic tag.
- **More pool** — multiplicative % from attributes and rare affixes. Stacks multiplicatively.
- **Skill kind** — instant / cast / channel / auto. Determines timing behavior in Phase 6 engine.
- **Auto-sequence** — idle rotation firing order, left-to-right. Currently unconditional. Phase 6: resource-aware. Phase 7: condition-aware.
- **Class adjustment** — sparse table entry defining how a (class, skill) pair differs from base skill. `ClassSkillAdjustment` row.
- **Pseudo-skill** — auto-attacks implemented as first-class skill entries (e.g. `staff_auto`), going through the full rawBehavior / tree / affix pipeline.
- **Forward-compatible field** — data field authored now that the engine ignores until a later phase. Enables parallel data authoring alongside engine work with zero migration cost.
- **Handedness** — `1h` / `2h`. 1H occupies mainhand only, allowing offhand. 2H occupies both hand slots, blocking offhand (bow/crossbow excepted via quiver).
- **Offhand** — non-mainhand equipment slot. Shield (attack), focus (spell), or quiver (bow/crossbow). Mutually exclusive with 2H mainhand.
- **Dual-wield (DW)** — equipping 1H weapons in both mainhand and offhand. Any 1H pairs legal (cross-type too). Attack behavior TBD in Phase 6 (lean: alternating swings).
- **`affixScaleMultiplier`** — per-weapon-type numeric factor on damage-scaling affix rolls. 1.0 for 1H, 2.0 for 2H. Compensates 2H for the lost offhand slot.
- **MVP** — Phase 3a launch scope: 2 classes (Witchdoctor, Assassin) × 2 weapons (Staff, Dagger). First playable v1.0.

---

## Status summary — ready to start Phase 1

All core design questions ratified across 5 design rounds (2026-04-14). Forward-compatible data fields defined. Phase sequencing keeps each phase shippable without requiring downstream engine work. Rollback path preserved at every phase boundary.

**Next session action:** execute Phase 1 (dagger affix fix + element picker removal + natural element defaults + transform-to-tree-branches). See Phase 1 checklist above.

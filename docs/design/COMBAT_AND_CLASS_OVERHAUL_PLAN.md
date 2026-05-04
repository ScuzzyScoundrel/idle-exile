# Combat Foundation & Class System Overhaul

**Date:** 2026-04-22
**Status:** Design committed. Engineering pending.
**Supersedes / extends:** `docs/design/CLASS_SYSTEM_PLAN.md`

---

## 1. Executive Summary

A unified plan to rework Idle Exile's class, weapon, ailment, and combat-timing systems so that character builds feel *fluid, fantastical, and distinct* without combinatorial content bloat.

**Core decisions locked:**

- 5 classes with punchy signature fantasies (Witchdoctor, Assassin, Sorcerer, Berserker, Hunter).
- 10 weapons with stable mechanical paradigms; classes flavor, never overwrite.
- WoW-Classic-style class talent trees: **level cap 60, talents start at level 10, 1 point/level = 51 points total. 3 paths × ~30 nodes × 7 tiers, tier-gated, capstones require deep commitment.**
- Per-skill talent trees archived (not deleted); their best content migrates up to class trees and skill-base mechanics.
- Offhands v1 = defensive or offensive stat multipliers only, with some skills *requiring* a specific offhand type (e.g. Shield Bash requires shield). Deeper offhand mechanics deferred.
- Combo states become first-class data and can propagate cross-weapon via class-tree nodes (the core "fluid" mechanic).
- Ailments become earned: `baseAilmentChance` per skill + gear + talents replace the current hardcoded-on-every-hit trigger.
- Combat gets real timing: working `instant` / `cast` / `channel` / `auto` skill kinds + auto-attacks between skills + speed stats that visibly reshape play.
- Ascendancies follow the foundation. Dual-classing is the last layer.

**Engineering-before-content rule:** the combat foundation (speed decoupling, skill-kind branching, auto-attacks, ailment rework, mana) lands before any content authoring. Class trees and fantasy briefs are meaningless if built on a broken combat loop.

---

## 2. Design Philosophy

### Principles

1. **Weapon = mechanical paradigm. Class = flavor within the paradigm.** Staff always does DoT + Minion; Witchdoctor staff does chaos DoTs and voodoo minions, Assassin staff does shadow DoTs and shade minions, Sorcerer staff does elemental DoTs and elementals. The weapon's core identity survives every class swap.
2. **Class identity is carried by signature mechanics, not stat sticks.** Every class has at least one mechanic that no gear, affix, or cross-class tree can grant to any other class. That mechanic IS the class.
3. **Ailments are earned, not automatic.** Damage type determines what ailment COULD be applied; skills, gear, and talents determine whether it IS applied. No more "physical hit = always bleed."
4. **Combo states are shared vocabulary.** Haunted, Exposed, Hexed, etc. are skill-authored but class-extensible — cross-weapon propagation is the fluidity mechanism.
5. **Foundation before content.** Engineering (timing, autos, ailment rework) precedes all content authoring (briefs, skills, tree nodes).

### Anti-principles (things we will NOT do)

- Will not delete archived per-skill talent content — it's a mining resource.
- Will not ship offhands with "flavor-only" rolls that feel like inconvenience layers.
- Will not author 14 weapon types; will not author 84 class×weapon morph cells. Scope is disciplined.
- Will not rely on "+1% damage" stat-stick nodes to carry class identity.
- Will not let dual-classing happen before ascendancies are live and tuned.

---

## 3. Class System

### 3.1 Class Roster

| Class | Core Axis | One-Line Fantasy |
|---|---|---|
| **Witchdoctor** | Chaos DoT + Minion + Pandemic | Death-cultist who oozes plague and commands spirits — your magic spreads, festers, and compounds. |
| **Assassin** | Crit + Poison + Cascade | Shadow that kills faster than the eye can track; strikes compound and crits empower further crits. |
| **Sorcerer** | Elemental + Conversion + Resonance | Element-warper; your spells resonate, cascade, and transform each other. |
| **Berserker** | Rage + Heavy 2H + Risk/Reward | Commit-and-strike reaver; the harder you push, the deadlier you become. |
| **Hunter** | Projectile + Precision + Traps | Patient predator; setup, execute, punish from range or close. |

Deprecated classes (superseded by renames): Warrior (→ Berserker), Mage (→ Sorcerer), Ranger (→ Hunter), Rogue (absorbed into Assassin + Hunter depending on flavor).

### 3.2 Signature Mechanic Rule

Every class has exactly one signature mechanic that **cannot be replicated on another class by any gear, affix, talent, or dual-class combination.**

| Class | Signature Mechanic (draft — finalized in fantasy brief) |
|---|---|
| Witchdoctor | **Pandemic** — when a target with a DoT dies, all DoTs transfer to nearest enemy with full duration. |
| Assassin | **Crit Cascade** — crits have a chance to re-mark targets, and marked targets' crits compound. |
| Sorcerer | **Resonance** — each element you deal stacks a Resonance charge; at max charge, next cast consumes them for a converted mega-hit. |
| Berserker | **Rage Threshold** — below X% HP, all skills gain execute bonus + increased damage; self-damage from own skills can trigger this deliberately. |
| Hunter | **Mark & Execute** — your first hit on any target applies Mark; follow-up from a different skill on a marked target triggers Precision payoff. |

These are drafts. Fantasy briefs will finalize.

### 3.3 Class Details — Fantasy Briefs (authored 2026-04-26)

Each class has a ~1.5-page design brief covering core fantasy, signature mechanic, aha moment, weapon-fantasy expression, talent paths, ascendancies, and dual-class horizons. See:

**`docs/design/CLASS_FANTASY_BRIEFS.md`** — all 5 MVP classes (Witchdoctor, Assassin, Berserker, Sorcerer, Hunter).

**Multi-class pair design:**

**`docs/design/MULTI_CLASS_PAIRS.md`** — 10 dual-class pair briefs using the §11 4-Layer Multi-Class Identity Model. **4/10 pairs authored** (Blood Cultist, Seer, Deathwalker, Soul Trapper — all WD pairs complete); 6 pending across Phase F.

**Class talent trees:**

**`src/data/classTrees/*.json`** — JSON source-of-truth, one file per class. **✅ 5/5 authored 2026-05-03** (404 total nodes across `witchdoctor.json` 80, `assassin.json` 81, `sorcerer.json` 81, `berserker.json` 81, `hunter.json` 81). All 15 capstones reshape signature mechanics; 5 cross-weapon nodes (one per class); 6 buff migrations absorbed (WD+Asn pools); zero weapon-conditional nodes; zero idle-incompatible mechanics. Cross-class consistency check 10/10 PASSED 2026-05-03 (see `CLASS_TREES.md` for full table). Phase B step 8 ✅ COMPLETE.

**`docs/design/CLASS_TREES.md`** — README + spec recap + JSON schema + cross-class consistency checklist (no per-class content; that lives in JSON).

**Skill audit:**

**`docs/design/SKILL_FANTASY_AUDIT.md`** — 4-axis audit of WD staff + Asn dagger pools (20 actives + 6 buffs). All audit recommendations applied to skill data 2026-04-26 (3 staff chaos-reworks + 4 dagger reworks). All 6 buff migration targets absorbed into class trees (3 in `witchdoctor.json` 2026-04-27, 3 in `assassin.json` 2026-04-27).

**REVISION PENDING:** The class fantasy briefs were authored before the §4.2 Model B + §11 4-layer multi-class lock. They use "primary weapon" framing that contradicts the class-first principle (class IS the fantasy; weapons morph to express it). Pending rewrite to drop that framing while preserving the signature-mechanic + mana-flavor + ascendancy content (which are unaffected). Skill-fantasy synergy audit for WD staff + Asn dagger is the precursor (Phase B step 9b).

---

## 4. Weapon System

### 4.1 Weapon Roster & Paradigms

10 weapons. Each has a stable mechanical paradigm. Classes flavor; classes do not overwrite paradigm.

| Weapon | 1H/2H | Paradigm | Paradigm examples |
|---|---|---|---|
| **Staff** | 2H | **DoT + Minion** | Channels, sustained-damage spells, summons. LOCKED. |
| **Dagger** | 1H | **Fast Strike + Combo State + Burst** | Setup strikes create combo states; burst consumes them. |
| **Wand** | 1H | **Fast Cast + Low Mana + Spam** | High-frequency low-cost spells; burst via resonance/chain. |
| **Gauntlets** | 1H | **Spell-Fist + Close-Range Cast** | Melee-cadence spells; uppercut channels. |
| **Claws** | 1H | **Dual-Hit + Bleed + Attack-Speed Stacking** | Frenzy-paced, compounding speed. |
| **Flail** | 1H | **Arc Sweep + AoE + Disarm/Stun** | Chain-weapon crowd control. |
| **Scythe** | 2H | **Reach + Reaper + Life-Drain** | Midrange swipe; life-on-kill; DoT crossover. |
| **Greatsword** | 2H | **Heavy Slow + Big Numbers + Wind-Up** | Commit-and-strike; execute thresholds; stagger. |
| **Bow** | 2H | **Projectile + Ranged + Precision** | Aim windows; chained shots; elemental arrows. |
| **Crossbow** | 2H | **Slow Ranged + Heavy Bolt + Piercing** | Reload tempo; piercing shots; explosive payloads. |

Weapons removed from current `data/weapons.ts` roster: sword, axe, mace, greataxe, maul, scepter, tome. These were flavor variants of kept weapons with no distinct gameplay paradigm. `tool` (profession-only) stays.

### 4.2 Class × Default Weapon Map (Model B — class-first, multi-class-expandable; LOCKED 2026-04-26)

**Class-First Principle:** Class IS the fantasy. Every weapon's MECHANICAL PARADIGM is preserved (§4.3 LOCKED), but FLAVOR re-expresses through the wielding class. Wand stays fast-cast regardless of who picks it up; what changes is whether the projectile is an "elemental spark" (Sorcerer) or a "magic projectile arrow" (Hunter via multi-class).

Each class has **3 default weapons** that fully express the class's signature. Multi-classing unlocks the secondary class's 3 defaults — the multi-class identity payoff per §11.

| Class | 3 default weapons | Weapons accessible after picking 2nd class (max 6) |
|---|---|---|
| **Witchdoctor** | Staff, Dagger, Scythe | +secondary's 3 defaults |
| **Assassin** | Dagger, Wand, Claws | +secondary's 3 |
| **Sorcerer** | Wand, Staff, Gauntlets | +secondary's 3 |
| **Berserker** | Greatsword, Flail, Claws | +secondary's 3 |
| **Hunter** | Bow, Crossbow, Dagger | +secondary's 3 |

**No weapon-class exclusivity.** Greatsword and Flail are Berserker-default but accessible to any multi-class with Berserker secondary. Same for Bow/Crossbow (Hunter-default).

**Default-weapon morphs (15 cells):** each (class × default-weapon) cell needs a flavor morph that expresses the class fantasy through the weapon's preserved paradigm. Phase C scope.

**Multi-class unlock morphs (~35 additional cells):** authored per pair as part of Phase F multi-class authoring (see §11.4).

**Worked scenario — "Sorcerer + sword + shield = battle mage":**
- Sorcerer's defaults: Wand, Staff, Gauntlets — none are 1H melee blade.
- To play battle-mage Sorcerer: multi-class with Berserker (unlocks Claws + Flail + Greatsword). Resulting "Spellreaver" pair (§11.2) IS the battle-mage archetype.
- Battle-mage becomes a **late-game build that earned its identity**, not a level-1 default. More satisfying because it's unlocked.

**Worked scenario — "Hunter + dual wands + magical projectile arrows + summoned beasts":**
- Hunter's defaults: Bow, Crossbow, Dagger — no wand.
- Multi-class with Sorcerer unlocks Wand. Resulting "Arcane Archer" pair (§11.2) IS this build.
- Magic-projectile-arrow Hunter is the canonical Hunter+Sorcerer endgame achievement.

### 4.3 Weapon Paradigm Preservation Rule

**Morphs change:** damage type, flavor name, flavor description, visual, combo state created/consumed (new — see §8), cast-time feel (within ±20%).

**Morphs do NOT change:** skill's fundamental shape (single-target vs AoE vs channel), skill's delivery tag family (Melee/Projectile/Spell), skill's paradigm role (setup vs burst vs DoT).

**Assassin×Staff morphs retuned 2026-04-26** (Phase B step 9 — `engine/classAdjustment.ts:70-104`):
- ✅ `staff_haunt → Shadow Plague` — dropped `damageTypeOverride: physical` + `castTimeMult: 0.85` (paradigm break). DoT shape preserved; flavor renamed from "Shadow Strike" to "Shadow Plague" reflecting post-audit chaos base damage.
- ✅ `staff_spirit_barrage → Needle Volley` — dropped `damageTypeOverride: physical`. Kept `castTimeMult: 0.9` (within §4.3 ±20% allowance — Asn tempo distinction). Chaos projectile DoT preserved; flavor name unchanged (still scans for Asn).
- ✅ `staff_bouncing_skull → Bouncing Dagger` — dropped `damageTypeOverride: physical`. Chain shape preserved; chaos base now flows through. Flavor name unchanged (iconic Asn).

**Outstanding morph concern (not in original §4.3 retune list, flagged for future review):**
- `staff_mass_sacrifice → Blade Detonation` — still carries `damageTypeOverride: 'physical'`. Mass Sacrifice is a heavy chaos AoE nuke; forcing physical doesn't break DoT or Minion paradigms (the §4.3 retune trigger), but it does fight the chaos-AoE-nuke fantasy. Consider retune in a future morph audit pass.

---

## 5. Offhands v1

### 5.1 Scope

- **Defensive offhand slot or offensive stat multiplier slot.** Roll standard affixes from existing pool (armor/spell power/crit/etc.). No parallel affix system.
- **Some mainhand skills REQUIRE a specific offhand type to be slotted.** Example: `Shield Bash` requires shield; `Dual Strike` requires second weapon. If required offhand isn't equipped, skill is greyed out.
- **Handedness gating:** 1H mainhand = any offhand. 2H mainhand = back-slot offhands only (banner/totem/quiver).

### 5.2 Offhand Types (v1)

- **Shield** — defensive stats. Requires 1H mainhand. Unlocks shield-gated skills.
- **Focus / Orb** — spell-power stats. 1H or floats beside 2H casters.
- **Second weapon** — dual-wield. Matching mainhand type required (dagger+dagger, claws+claws). Unlocks dual-wield-gated skills.
- **Quiver** — projectile-damage stats. Requires bow or crossbow.

### 5.3 Schema Addition

```typescript
// types/skills.ts
export interface ActiveSkillDef {
  ...existing fields...
  requiresOffhand?: 'shield' | 'second_weapon' | 'focus' | 'quiver' | 'none';
}
```

Engine check at rotation-time: if `requiresOffhand` is set and equipped offhand doesn't match, skill is skipped (greyed in UI).

### 5.4 Deferred to v2+

- Mechanical affixes on offhands (conversion, proc, tag injection) — the five-layer model discussed then cut.
- Bound offhand abilities — shield bash as an offhand-granted skill rather than a mainhand skill gated on shield.
- Unique offhands with build-enabling mechanics.
- Class-tree nodes keyed to offhand type tags.

These return when v1 is proven playful and content-stable.

---

## 6. Class Talent Trees

### 6.1 Shape

Modeled on WoW Classic talent trees:

| Parameter | Value |
|---|---|
| Paths per class | **3** |
| Nodes per path | **~30** |
| Total nodes per class | **~90** |
| Level cap | **60** (locked) |
| Talents start | **level 10** (locked) |
| Points total | **51** — 1 point per level from level 10 through 60 (locked) |
| Tiers per path | **7** |
| Tier gating rule | **Must spend (N-1) × 5 points in a path to unlock tier N** |
| Capstone requirement | Tier-7 payoff requires ~31 points invested in that path |
| Multi-rank nodes | ~70% of content, authored as 5-rank passives (1%/2%/3%/4%/5% progression) |
| Identity/keystone nodes | ~30% of content; real authoring work |

**Point-budget enforces commitment:** 51 points total, full tree needs ~40, so you cannot max one and ignore the others — 41/10/0 (pure) vs 31/20/0 (hybrid) is a real choice. Same principle as WoW Classic.

**Authoring direction (locked 2026-04-27):**

- **JSON source-of-truth.** Each class tree authored as `src/data/classTrees/<class>.json` — code-friendly, modular, directly importable for engine consumption. Markdown design docs (`docs/design/CLASS_TREES.md`) are README-style pointers + cross-class consistency notes, not 1000-line content stores. JSON schema documented in `CLASS_TREES.md`.
- **Multi-rank flavor directive.** Multi-rank passives prefer procs / conditionals / state-interactions over flat stat scaling. Pure stat-stick nodes ("+5/10/15/20/25% damage") are acceptable as foundation/pacing nodes but should be the EXCEPTION (~15-20% of multi-rank), not the rule. Preferred examples: "DoT ticks have +X% chance to refresh duration"; "Crits have +X% chance to apply additional Hex stack"; "On-kill, +X% chance to spawn temporary minion."
- **Idle-game context.** No standing/walking/movement mechanics; no tile concept (idle version of game has only per-zone encounter combat). Express AoEs as "all enemies in encounter" or "in zone," not "within X tiles."
- **Class-first weapon-agnosticism.** Class tree nodes are weapon-agnostic by default per §4.2 Class-First Principle. Weapon-conditional nodes ("while wielding staff, +X") fight the principle and are removed. Offhand-conditional nodes (per §6.3) remain acceptable as playstyle sliders. Skill-level weapon requirements (per §5 — Shield Bash requires shield) are different and unaffected.
- **Base-mechanic dependencies tracked per-node.** Each JSON node lists `dependencies` for any base game mechanics required (poison stack cap, healing potions, minion cap, etc.). Phase C engineering can grep these to know which mechanics block which nodes.

### 6.2 Keystone / Capstone Rule

Tier-7 capstones are **signature-mechanic-reshaping**, not stat-stick ultimates. Example Witchdoctor Plague-path capstone:

> **Pandemic** — When an enemy with an active DoT dies, all DoTs transfer to the nearest enemy with full duration. Propagates across weapons.

A tier-7 capstone must pass this test: *"If you removed this node, would the class fantasy collapse?"* If no, it's not a capstone — it's a big stat node.

### 6.3 Loadout-Conditional Nodes (offhand-only by default)

**Class trees are weapon-agnostic per §4.2 Class-First Principle.** Loadout-conditional class-tree nodes gate on **offhand type** (the playstyle slider), NOT on mainhand weapon (which is class identity).

Some class-tree nodes gate on equipped offhand type (shield/focus/quiver/second_weapon). Example node text:

> **Shieldbearer's Resolve** — *While holding a Shield:* skills deal +20% damage to the enemy currently attacking you, and you take 15% less damage from all sources.

These nodes provide loadout-specific build depth WITHOUT authoring separate trees per loadout. Gate is on offhand type tag (stable equipment slot), not mainhand weapon (class identity) and not affix content (variable).

**Weapon-conditional class tree nodes** ("while wielding staff, +15% chaos damage") fight the Class-First Principle and are removed by default. If a future case demands one (e.g., a class has a tightly-tied "natural-fit" weapon synergy that can't otherwise be expressed), use sparingly and only when the gate is specifically tied to one of the class's default weapons per §4.2. Default: prefer a weapon-agnostic alternative.

**Skill-level weapon/offhand requirements** (per §5 — e.g., "Shield Bash requires shield equipped" or "Dual Strike requires second_weapon offhand") are SEPARATE from class trees. Those live on `ActiveSkillDef.requiresOffhand` and gate skill availability, not talent nodes.

### 6.4 Free-respec Policy

- **Main class tree respec:** gold cost, scaling with level. Not free but not punishing.
- **Loadout-gated nodes:** free respec when you swap the relevant gear. Encourages experimentation with offhand/weapon loadouts.

### 6.5 Content Authoring Budget

5 classes × 90 nodes = 450 nodes total.
- ~70% multi-rank passive (template-authored — cheap)
- ~30% identity/keystone (real design — ~125 nodes total)

Many of these 125 identity nodes already exist in archived per-skill talent trees (`dagger_talents.ts` 4044 lines, `staff_*_talents.ts` ~2500 lines) and just need to be promoted/adapted.

---

## 7. Per-Skill Tree Legacy (BOTH systems archived)

### 7.1 Archive, Do Not Delete

**Both per-skill tree systems get archived. Exactly ONE tree system (class tree) is canonical during the rebuild.** Post-playtest, either archived system can be thawed back if combat feels thin, but the rebuild happens with one tree, not three.

Files to move to `src/data/_archive/skillGraphs/`:

**Per-skill Talent Trees (30-pt branched trees):**
- `dagger_talents.ts` (4044 lines)
- `staff_bouncing_skull_talents.ts`
- `staff_fetish_swarm_talents.ts`
- `staff_haunt_talents.ts`
- `staff_hex_talents.ts`
- `staff_locust_swarm_talents.ts`
- `staff_mass_sacrifice_talents.ts`
- `staff_plague_of_toads_talents.ts`
- `staff_soul_harvest_talents.ts`
- `staff_spirit_barrage_talents.ts`
- `staff_zombie_dogs_talents.ts`

**Per-weapon SkillGraphs (20-pt passive ring graphs):**
- `axe.ts`, `bow.ts`, `crossbow.ts`, `dagger.ts`, `gauntlet.ts`, `greataxe.ts`, `greatsword.ts`, `mace.ts`, `maul.ts`, `scepter.ts`, `staff.ts`, `sword.ts`, `tome.ts`, `wand.ts` (all in `data/skillGraphs/`)

**Barrel files:**
- `data/skillGraphs/index.ts` — empty after archive.
- `data/skillGraphs/talentTrees.ts` — empty after archive.
- `data/skillGraphs/talentTreeBuilder.ts` + `treeBuilder.ts` — archive helpers, archive with their data.

**Engine files that consume these trees (gut or stub):**
- `engine/skillGraph.ts` (655 lines) — SkillGraph resolver. Becomes a no-op stub returning empty modifiers until decision to revive.
- `engine/talentTree.ts` (418 lines) — per-skill TalentTree resolver. Same: no-op stub.
- `getSkillGraphModifier` in `engine/skills/resolution.ts:105-114` — returns null.
- `SkillDef.skillGraph` and `SkillDef.talentTree` fields in `types/skills.ts:498-499` — kept in type but populated as undefined.

After archive, `SKILL_DEFS` at module load still works (graphs/talents just undefined). All skill XP / level progression still functions via `SkillProgress.level`. Only the tree-allocation UI dies.

### 7.2 Content Mining Strategy

Every archived talent node gets audited against this decision tree:

1. Does this node describe a **class identity mechanic**? (e.g. "Predator state", "Vulnerable curse", combo-state bonuses) → **PROMOTE** to class tree, reflavor if needed.
2. Does this node describe a **skill-intrinsic mechanic** that should be part of the skill's base behavior? (e.g. "crits refund 50% cooldown on this skill") → **PROMOTE** to skill's baseline kit, retire the node.
3. Is this node a **pure stat stick**? (e.g. "+15% damage") → **DISCARD**, don't need it.
4. Does this node describe mechanics that **depend on systems we're removing** (per-skill trees, specific legacy affixes)? → **DISCARD**.

Expected distribution: ~30% promote to class trees, ~20% promote to skill-base, ~50% discard. Audit runs after the class tree structure is authored so we know what slots we're filling.

### 7.3 Revival Gate

Post-playtest of Phase D, either archived system can be thawed back:

- **If class trees feel thin** → revive SkillGraph as per-weapon mastery passives (not per-skill). A single 10-20 pt graph per weapon type, earned through playing that weapon.
- **If specific skills feel too samey** → revive per-skill TalentTree for select signature skills only (not all skills).

Neither revival is planned. Both are escape hatches. Default outcome: both systems stay archived and class trees carry the full weight.

---

## 8. Combo System

### 8.1 Combo States Become First-Class Data

Currently combo states (Haunted, Exposed, Hexed, Soul Stack, etc.) live in skill descriptions + hardcoded weapon-module logic. Promote them:

```typescript
// types/skills.ts additions
export interface ActiveSkillDef {
  ...existing fields...
  createsComboState?: ComboStateSpec;   // what this skill applies
  consumesComboState?: ComboStateSpec;  // what this skill consumes (and bonus gained)
}

export interface ComboStateSpec {
  stateId: string;         // 'haunted' | 'exposed' | 'hexed' | etc.
  duration: number;        // seconds
  maxStacks?: number;
  consumeBonus?: {         // only on consumesComboState
    damageMult?: number;
    applyDebuff?: { ... };
    refundCooldown?: number;
  };
}
```

Morphs can alter these fields per class, enabling e.g. "Witchdoctor Stab creates Hexed (not Exposed)."

### 8.2 Cross-Weapon Propagation

Class-tree nodes can grant combo-state pollination across weapon pools:

> **Voodoo Mark (Witchdoctor, Voodoo path tier-5)** — All your skills, regardless of weapon, apply Hexed on crit.

This means a dual-class Witchdoctor/Assassin with dagger-mainhand can apply Hex via dagger crits, then pick up a staff skill (from secondary class's pool) that consumes Hexed for a burst. **This IS the fluid dual-class identity mechanism.**

Engine support: a `grantComboStateOnSkill` variant already exists as `TalentEffect.grantTagOnSkill` in `types/skills.ts`. Extend to combo states properly.

### 8.3 Ailment-Baseline Rule (already live in game, lock as design rule)

Damage type → default ailment mapping (no re-authoring required):

| Damage Type | Default Ailment |
|---|---|
| Physical | Bleed |
| Cold | Chill / Frostbite |
| Lightning | Shock |
| Fire | Ignite |
| Chaos | Poison |

**Rule:** Granting the default ailment of a skill's damage type is **redundant and forbidden** in class tree / morph authoring. Only *cross-grain* ailments (chaos + bleed, physical + chill, etc.) count as identity content. Audit must flag redundant nodes for deletion.

**BUT see §9.4** — the *chance* of ailment application needs reworking. Default mapping stays; 100%-on-every-hit trigger goes.

---

## 9. Combat Foundation Engineering

Five changes land before content authoring begins. Ordered by dependency.

**Stat philosophy lock:** `attackSpeed` and `castSpeed` are the ONLY timing stats. No `abilityHaste`. Both continue to compress castInterval AND reduce cooldowns. The "feels minimal" complaint is solved by **Change 2 (auto-attacks filling dead air)** — speed stat becomes visceral because swing cadence is visible, not because we added another stat.

### 9.1 Change 1 — Implement `skillKind` Branching (+ channels + per-kind GCD floor)

**STATUS: Core landed 2026-04-22. Strict build passes. See below for what's done + deferred.**

**DONE:**
- `ChannelState` type in `src/types/combat.ts` (after `ComboState`)
- `channelState: ChannelState | null` + `nextAutoAttackAt: number` on `GameState` (`types/state.ts`)
- Initial state factory values: `channelState: null`, `nextAutoAttackAt: 0` (`gameStore.ts`, near `nextActiveSkillAt: 0`)
- Save migration v64 → v65 (`migrations.ts`), version constant bumped to 65
- `skillKind` / `recoveryTime` / `channelTickInterval` / `manaCost` promoted from `SkillDef` to `ActiveSkillDef` (`types/skills.ts`) — data files can now declare them directly
- Converter in `data/skills/index.ts` carries the four new fields through to `SkillDef`
- `calcSkillCastInterval` (`engine/skills/dps.ts:95-132`) branches on `skillKind`:
  - `'instant'` → `recoveryTime/speed`, floor 0.1s, bypasses GCD_FLOOR
  - `'channel'` → `channelTickInterval/speed`, floor 0.05s, bypasses GCD_FLOOR
  - `'cast'` / `'auto'` / undefined → legacy `max(castTime/speed, GCD/speed, GCD_FLOOR)`
- `tick.ts` channel-state tracking at line ~1222: enters channelState on channel cast, breaks on non-channel cast, emits `channelState` in both boss-path and clearing-path patch returns

**DEFERRED (finish in Change 1 follow-up OR fold into Change 2):**
- **Channel duration expiry enforcement** — `expiresAt` is tracked but not acted on; when it passes, rotation currently keeps firing the channel tick. Needs a check in tick.ts before skill-select: if `channelState && now >= channelState.expiresAt`, null channelState and allow normal rotation.
- **Channel rotation priority** — active channelState doesn't yet force rotation to keep picking the channel skill. When the channel is in rotation AND off-cooldown it happens naturally, but this is fragile. Should add: if `channelState` exists and not expired, `getNextRotationSkill` returns the channel skill directly.
- **Mana-per-tick for channels** — channels should deduct `manaCost` per tick; currently only deducted on the cast-fire event. Depends on Change 4.
- **Smoke test** — no data skill currently has `skillKind: 'channel'` or `'instant'` populated. Test by adding `skillKind: 'instant'` + `recoveryTime: 0.3` to `dagger_assassinate` and verifying faster cadence in combat log. Test channel by temporarily patching `staff_locust_swarm` with `skillKind: 'channel'` + `channelTickInterval: 0.5` + `duration: 4`.

**ORIGINAL SCOPE (retained for reference):**

**Problem:** `skillKind` field exists in types but is never consumed; all skills collapse through `castTime + GCD_FLOOR` pipeline.

**Fix (per kind):**

| skillKind | Behavior |
|---|---|
| `instant` | Fires immediately. Sets GCD to `recoveryTime` (short, ~0.2s). No `castTime` use. |
| `cast` | Current behavior. `castTime`-gated. GCD_FLOOR applies. |
| `channel` | Ticks every `channelTickInterval` for `duration`. Can break channel to cast another skill. Mana deducted per tick. No GCD during channel. |
| `auto` | Replaces the weapon's default auto-attack while slotted. Fires at weapon's `speedModifier` rate. |

**Files touched:**
- `src/engine/skills/dps.ts` — `calcSkillCastInterval` branches on `skillKind`
- `src/engine/combat/tick.ts` — new `channelState` in `GameState`; instant path uses `recoveryTime`; channel tick path
- `src/types/combat.ts` — `channelState` state fields

**Effort:** 2 sessions (channels are the tricky part).

### 9.2 Change 2 — Auto-Attack System

**STATUS: MVP landed 2026-04-23. Strict build passes. See below for what's done + deferred.**

**DONE:**
- `AUTO_ATTACK_BASE_DMG_COEF = 0.6`, `AUTO_ATTACK_MIN_INTERVAL = 0.2`, `AUTO_ATTACK_BASE_INTERVAL = 1.0` in `data/balance.ts`
- New module `src/engine/combat/autoAttack.ts` — pure functions:
  - `computeAutoAttackInterval(weaponType, stats)` — uses `WEAPON_TYPE_META[w].speedModifier` × `(1 + attackSpeed/100)` (or castSpeed for caster weapons).
  - `shouldFireAutoAttack(state, now)` — gates: weapon equipped, no active channel, timer due.
  - `rollAutoAttack(state, stats)` — flat damage via weapon avg × `AUTO_ATTACK_BASE_DMG_COEF` × (1 + incPhysDamage/incSpellDamage/100) × hit-chance. ±10% variance.
  - `applyNonSkillTickWithAuto(state, dtSec, now, zone, phase)` — wrapper: rolls auto, applies damage to front mob (clearing) or boss (boss fight), bumps `nextAutoAttackAt`, delegates to `applyZoneDamage`/`applyBossDamage`.
- All 5 non-skill-tick early-return sites in `tick.ts` now route through the wrapper:
  1. GCD blocked (line 256)
  2. All skills on CD (`hasActiveSkill && !rotationResult`)
  3. No skill at all (`!skill`)
  4. Execute-only threshold (`graphMod.executeOnly.hpThreshold`)
  5. ExecuteLocked threshold (`graphMod.executeLocked + executeThreshold`)
- Unused `applyBossDamage` / `applyZoneDamage` imports stripped from tick.ts (now only imported by `autoAttack.ts`).

**DEFERRED (MVP → full integration pass):**
- **Crit roll on autos** — use stats.critChance / critMultiplier. Trivial addition inside `rollAutoAttack`.
- **On-hit talent procs** — dispatch `dispatchProcOnHit` with a synthetic damage tag (Physical for melee, element for caster). Wire class-talent trees to see autos.
- **Ailment chance** — wire into Change 3's `resolveAilmentChances` with `baseAilmentChance = 5-15%` for autos. Autos become a primary ailment vector.
- **Combat log entries** — autos currently have no visibility in CombatTickResult. Add entries so players can see them fire.
- **Auto-attack balance tuning** — `AUTO_ATTACK_BASE_DMG_COEF = 0.6` is a guess; target 5-8% of total DPS at equal gear. Verify after Change 5 skill audit lands real damage numbers.
- **Zone/phase transition reset** — `nextAutoAttackAt` doesn't reset on zone switch / death; may result in immediate auto-fire after re-entry (likely fine but worth confirming).

**ORIGINAL SCOPE (retained for reference):**

**Problem:** No auto-attacks between skills. Attack speed feels minimal. No filler damage source. Dead air between cooldowns.

**Fix:**
- New state field `state.nextAutoAttackAt: number`.
- New tick phase in `tick.ts` AFTER skill phase, BEFORE enemy phase:
  ```ts
  if (now >= state.nextAutoAttackAt && !skillCastThisTick) {
    rollAutoAttack(weapon, stats, targetDebuffs);
    state.nextAutoAttackAt = now + autoInterval * 1000;
  }
  autoInterval = (1 / WEAPON_TYPE_META[weapon].speedModifier) / (1 + attackSpeed/100);
  ```
- Auto-attack damage: weapon base dmg × (1 + incPhysDamage/100) × hitChance. Routes through `resolveDamageBuckets` with synthetic "auto" skill def.
- Auto can crit, apply ailments (via §9.3 system), trigger on-hit talent procs.
- Auto does NOT create/consume combo states.
- Caster weapons (staff, wand, tome, scythe): auto is a ranged spell bolt using `spellPower` base.

**Files touched:**
- `src/engine/combat/tick.ts` — new auto-attack phase
- `src/types/combat.ts` — `nextAutoAttackAt: number`
- `src/engine/skills/dps.ts` — `rollAutoAttack` helper
- `src/data/balance.ts` — auto-attack base damage coefficient

**Effort:** 2 sessions.

**Balance risk:** auto-attacks shift damage economy. Start conservative (target 5-8% of total DPS at equal gear) and tune up. Weapon base-damage affixes gain value — good for gearing meta.

### 9.3 Change 3 — Ailment Trigger Rework

**STATUS: Core landed 2026-04-23. Strict build passes. Deliberate runtime behavior change — see "⚠ Behavior Shift" below.**

**DONE:**
- 7 new stat keys on `ResolvedStats`: `ailmentChanceAll`, `ailmentChance{Bleed,Burn,Chill,Shock,Poison}`, `ailmentChanceOnCrit` (all initialized to 0 in `BASE_STATS`).
- `baseAilmentChance?: number` on `ActiveSkillDef` AND `SkillDef` (converter carries through).
- `STAT_LABELS` in `InventoryScreen.tsx` updated with display strings for all 7 new keys.
- Tick.ts `ELEMENT_AILMENT` block replaced with `resolveAilmentChances` call in the else branch at line ~862-920:
  - Staff-native DoT bypass (`staff_locust_swarm`, `staff_haunt`, `staff_plague_of_toads`) **preserved intact**.
  - `dagger_viper_strike` +50% potency bonus **preserved**.
  - `skill.dotDamagePercent` scaling vs `STANDARD_DOT_RATE` **preserved**.
  - Gear bonuses apply via `ailmentChance*` stats.
  - Crit bonus applies via `ailmentChanceOnCrit` when `roll.isCrit`.
  - Ailment applied via per-key chance roll against `resolveAilmentChances` output.
- `AilmentType` + `resolveAilmentChances` imported into tick.ts.

**⚠ BEHAVIOR SHIFT (intentional, per design):**
- Before Change 3: every hit applied mapped element ailment at 100% chance.
- After Change 3: no skill applies ailments until `baseAilmentChance` is set on its data def (Change 5 territory), OR the player has gear/talents granting flat `ailmentChance*` bonuses.
- **Until Change 5 skill audit runs, ailments are effectively OFF** except for staff-native DoTs (locust/haunt/toads) and skill-authored paths (hex, soul stacks, combo states).
- **Tuning recommendation when Change 5 lands:** Assassin signature skills (Viper Strike, Fan of Knives) → 50-75%. Generic attacks → 15-25%. Auto-attacks → 5-10%. Sorcerer elemental skills → 30-40%. Witchdoctor Plague/Locust already use native DoTs (bypass).

**DEFERRED:**
- **Wire `resolveAilmentChances` into auto-attacks** (Change 2 MVP doesn't apply ailments). Add chance resolution to `rollAutoAttack` with `baseAilmentChance` defaulting to ~5-10% for autos.
- **Author ailment-chance gear affixes** — add `+X% chance to bleed on hit`, `+X% global ailment chance`, etc., to `data/affixes.ts`. Scope: 15-20 new affix defs.
- **Author ailment-chance class talent nodes** — now that stats exist, talent nodes can grant them via `TalentEffect.stat` / `statMult` kinds.
- **Smoke test** — patch `dagger_stab` with `baseAilmentChance: 50` to verify chance-gated bleed rolls in combat.

**ORIGINAL SCOPE (retained for reference):**

**Problem:** `tick.ts:845` `ELEMENT_AILMENT` map applies an ailment on EVERY hit at 100% chance. Ailment chance affixes, ailment-granting talents, and ailment signature builds are all meaningless because ailments are already free.

**Fix:**
- Add `baseAilmentChance?: number` (0-100) to `ActiveSkillDef`. Default 0. Ailment-signature skills (Viper Strike, Plague of Toads, Locust Swarm) get 25-50%. Auto-attacks get 5-15% baseline.
- Add stats to `ResolvedStats`: `ailmentChanceAll`, `ailmentChanceBleed`, `ailmentChanceBurn`, `ailmentChanceChill`, `ailmentChanceShock`, `ailmentChancePoison`, `ailmentChanceOnCrit`.
- **Delete** hardcoded `ELEMENT_AILMENT` block at `tick.ts:845-869`.
- **Wire** existing `resolveAilmentChances` from `damageBuckets.ts:267` into tick loop:
  ```ts
  const chances = resolveAilmentChances(
    dmgResult.buckets,
    dmgResult.total,
    skill.baseAilmentChance ?? 0,
    {
      bleed: effectiveStats.ailmentChanceBleed + effectiveStats.ailmentChanceAll,
      burn:  effectiveStats.ailmentChanceBurn  + effectiveStats.ailmentChanceAll,
      ...
    },
  );
  for (const [ailment, chance] of Object.entries(chances)) {
    if (Math.random() * 100 < chance) applyDebuffToList(...);
  }
  ```
- Keep staff-native DoT bypass (`locust_swarm_dot`, `haunt_dot`) — these are skill-scoped custom DoTs, orthogonal to the generic ailment roll.
- Add new gear affixes: "+X% chance to bleed on hit", "+X% ailment chance", etc.
- Class-tree `TalentEffect.procOnHit` already supports ailment-chance bumps via `applyTag` action — just author nodes that use them.

**Files touched:**
- `src/types/skills.ts` — add `baseAilmentChance` to `ActiveSkillDef`
- `src/types/stats.ts` — new ailment-chance stat keys
- `src/engine/combat/tick.ts:845-869` — replace block with resolver call
- `src/data/affixes.ts` — new affix defs
- `src/data/skills/*.ts` — audit pass to set `baseAilmentChance` per skill (see §9.5)

**Effort:** 2 sessions (engineering small; affix + skill authoring is bulk).

### 9.4 Change 4 — Wire `manaCost` Consumption

**STATUS: Core landed 2026-04-23. Class Mana Calibration Matrix landed 2026-04-24 (regen + flavor dials on all 6 class entries in `types/mana.ts`). Strict build clean (`tsc -b --force`). NOTE: Change 5 populated real `manaCost` values on 20 staff+dagger skills, so the original "zero runtime behavior change" note no longer holds — players now feel mana gates. See calibration matrix below.**

**Class Mana Calibration Matrix (landed 2026-04-24 — `types/mana.ts:52-108`):**

The `ManaConfig` schema IS the 3-resource system (mana/rage/energy) in disguise — `passive` is mana, `onHitDealt`/`onHitTaken` is rage, `onCrit` is energy. Per-class dial weights encode the fantasy:

| Class (current → future per §15.4) | maxMana | startFull | passive/s | onKill | onHitDealt | onHitTaken | onCrit | Flavor identity |
|---|---|---|---|---|---|---|---|---|
| **witchdoctor** | 150 | ✓ | 6 | 20 | 0.5 | 0 | 0 | Big-pool caster + kill-chunk refill + minion tank |
| **assassin** | 50 | ✓ | 10 | 3 | 1 | 0 | 6 | Quick-recover + crit feedback + combo momentum |
| **warrior → berserker** | 100 | ✗ (start 0) | 0 | 10 | 5 | 8 | 0 | PURE rage — 0 passive, start empty, earn via combat |
| **mage → sorcerer** | 130 | ✓ | 8 | 8 | 0 | 0 | 4 | Sustained caster + Resonance crit loop |
| **ranger → hunter** | 80 | ✓ | 9 | 5 | 0.5 | 0 | 6 | Energy-archer — passive floor + crit bonus + shot trickle |
| rogue | 50 | ✓ | 8 | 2 | 0 | 0 | 3 | (absorbed into assassin per §15.4; values unchanged this pass) |

**Two engineering gaps block the matrix from being fully live:**
1. **Type union missing new names.** `CharacterClass` in `types/character.ts:10` is `'warrior' | 'mage' | 'ranger' | 'rogue' | 'witchdoctor' | 'assassin'`. Values for berserker/sorcerer/hunter live in the legacy `warrior`/`mage`/`ranger` entries as bridge data. §15.4 rename pass will carry them over.
2. **Proc handlers NOT wired** (confirmed 2026-04-24 via engine grep — zero consumers in `src/engine/` or `src/store/`). `onKillGain` / `onHitDealtGain` / `onHitTakenGain` / `onCritGain` are **dormant schema data** — only `passiveRegenPerSec` has observable effect today. Wiring is queued as Phase A cleanup: handlers need to fire in `tick.ts` (onHit at successful hit resolution, onCrit at crit roll payout, onKill on enemy death event, onHitTaken in `zoneAttack`/`bossAttack` paths).

**Observable change today (passive-only):** witchdoctor 2→6/sec (boss-gate grace pushed from 9.4s → 12.5s), assassin 8→10/sec, legacy mage 6→8/sec, legacy ranger 7→9/sec. Dormant flavor values will click on as Phase 6 wiring lands without requiring a second tuning pass.

**DONE:**
- New module `src/engine/combat/manaTick.ts` with pure helpers:
  - `regenMana(mana, dtSec)` — passive regen, caps at max
  - `deductMana(mana, cost)` — floors at 0
  - `canAffordManaCost(mana, dtSec, cost)` — accounts for this-tick regen
  - `tickManaWithCost(mana, dtSec, cost)` — regen then deduct (standard cast path)
- `autoAttack.ts` `applyNonSkillTickWithAuto` calls `regenMana` each non-skill tick; emits `character` in patch only when mana actually changed.
- `tick.ts` mana gate after `getEffectiveSkillDef` morph resolution: if `skillManaCost > 0 && !canAffordManaCost(...)`, fall through to `applyNonSkillTickWithAuto` (autos still fire, mana still regens, cooldown NOT consumed).
- `tick.ts` both patch returns (boss fight + clearing) emit `character: { ...state.character, mana: tickManaWithCost(...) }`.
- Channels naturally deduct per tick because they re-enter the cast path at `channelTickInterval` (same deduct site).

**DEFERRED (Phase 6 territory per-class flavor gen):**
- **Per-class mana generation flavors** — `onKill` / `onCrit` / `onHitDealt` / `onHitTaken` gains (the `ManaConfig` in `types/mana.ts` already defines the schema). These plug into talent-dispatcher hook points.
- **Channel mana-starvation break** — currently a channel whose per-tick cost exceeds available mana just fails the gate and drops to autos, which correctly ends the channel via `newChannelState = null` on non-channel cast... but edge case: what if the gate fails during a channel-tick? Need to verify channelState is cleared. Add follow-up check.
- **UI mana-bar visibility during combat** — currently mana regens invisibly. Should surface in combat log or stat bar.

**ORIGINAL SCOPE (retained for reference):**

**Problem:** `manaCost` field exists but no skill deducts mana. Channels can't cost mana per tick (core design for `skillKind: 'channel'`).

**Fix:**
- In `tick.ts` skill-cast path: check `state.mana.current >= skill.manaCost`, abort cast if insufficient, else deduct.
- Channels deduct `manaCost` per `channelTickInterval` tick.
- Mana regen already live via `types/mana.ts`.

**Files touched:**
- `src/engine/combat/tick.ts` — mana check + deduct at skill-cast path
- `src/engine/combat/tick.ts` — mana check + deduct at channel-tick path

**Effort:** 1 session.

### 9.5 Change 5 — Skill Audit Pass

**STATUS: Staff + Dagger audits complete 2026-04-23 (20/20 actives in truly fleshed-out pools). Bow reclassified to Phase C3 rebuild — 6 actives + duplicate `bow_rapid_fire` id + stale `bow_multi_shot`/`bow_smoke_arrow` ids make it rework scope, not audit scope. Change 5 complete for all true audit targets. Strict build clean (`tsc -b --force`).**

**Staff audit results — `src/data/skills/staff.ts`:**

| Skill | skillKind | manaCost | baseAilmentChance | Note |
|---|---|---|---|---|
| Zombie Dogs | cast | 25 | 0 | Heavy summon, no direct hits |
| Locust Swarm | cast | 14 | 0 | Native chaos DoT — poison redundant per §8.3 |
| Haunt | cast | 12 | 0 | Native cold DoT — frostbite redundant per §8.3 |
| Hex | cast | 8 | 0 | Utility curse, low damage |
| Spirit Barrage | cast | 16 | 25 | 3-hit cold projectile, frostbite vector |
| Plague of Toads | cast | 18 | 0 | Native chaos DoT — poison redundant |
| Fetish Swarm | cast | 30 | 0 | Heavy summon |
| Soul Harvest | cast | 14 | 30 | Chaos hit, poison vector on payoff |
| Bouncing Skull | cast | 16 | 25 | Fire chain, ignite vector |
| Mass Sacrifice | cast | 40 | 40 | Heavy AoE nuke, big poison spread |

**Issues flagged during audit (no code change required this pass):**
1. **No `'channel'` candidates in staff pool.** Per §9.5 hint, Locust Swarm was a candidate, but its on-death-transfer mechanic is built around the snapshot-DoT system (`dotDuration` + `dotDamagePercent`), not a channel tick loop. Refactoring to channel would break transfer; keep as `'cast'`. Channels likely arrive in Phase C3 weapon design (e.g. wand drain, gauntlet flame stream).
2. **No `'instant'` candidates in staff pool.** All staff skills have meaningful cast time fantasy. Hex (8 mana, utility) is the closest but already low-friction at 1.0s castTime; instant designation would unbalance combo-state generation cadence.
3. **Combo state wiring lives in `engine/combat/combo.ts`**, not in skill data. When ComboStateSpec schema (§8.1) lands, migrate the per-skill spec into `staff.ts` defs. Until then, behavior is preserved by engine table.
4. **Spirit Walk buff** — description says "Dodge effect pending engine extension." Known gap; not Change 5 scope.
5. **Grave Injustice passive** — onKill hook for ability defs not yet wired (talent-tree allocation handles it indirectly). Known gap; not Change 5 scope.
6. **Assassin morphs** — all 10 staff skills have Assassin morph entries in `engine/classAdjustment.ts:61-109`. Per §4.3 Paradigm Preservation Rule, staff identity (DoT+Minion) is **LOCKED**. Phase B5 morph retune deferred — out of Change 5 scope.
7. **Mana economy untested.** Average ~18 mana per cast at ~1s cadence = ~18 mana/sec drain. Default regen (`ManaState.regenPerSec`) needs validation against this curve once dagger audit lands and we can run combat smoke tests. (Dagger audit landed 2026-04-23; combined mana-sec estimate in dagger issues block below.)

**Dagger audit results — `src/data/skills/dagger.ts`:**

| Skill | skillKind | manaCost | baseAilmentChance | Note |
|---|---|---|---|---|
| Stab | instant | 6 | 0 | Combo-state tap (Exposed). `recoveryTime: 0.25`. Bleed auto per §8.3 |
| Blade Dance | cast | 12 | 0 | 3-target multi-hit. Phys bleed auto per §8.3 |
| Fan of Knives | cast | 14 | 40 | AoE ailment applier — signature "every target hit" |
| Viper Strike | cast | 14 | 0 | Native chaos DoT — poison redundant per §8.3 |
| Shadow Mark | cast | 8 | 0 | Utility setup; mirrors staff Hex cost |
| Assassinate | cast | 30 | 35 | Heavy nuke burst, big proc window |
| Chain Strike | cast | 12 | 30 | Lightning chain — shock vector |
| Blade Ward | cast | 14 | 0 | Defensive strike, phys bleed auto per §8.3 |
| Blade Trap | cast | 18 | 40 | AoE trap — signature ailment spread |
| Shadow Dash | instant | 10 | 0 | Movement dash. `recoveryTime: 0.25`. Creates Shadow Momentum |

**Issues flagged during dagger audit (no code change required this pass):**
1. **Two `'instant'` candidates confirmed** (Stab, Shadow Dash) — contrast with staff pool which had zero. Dagger paradigm (speed + combo-state generation) naturally wants short-recovery taps. Both use `recoveryTime: 0.25` (per-§9.1 default 0.2, nudged up for balance vs cast skills).
2. **No `'channel'` candidates in dagger pool.** Per §9.5 hint, Blade Trap (arm → detonate) was considered, but the arm-then-detonate mechanic is a scripted two-phase instant, not a tick loop. Refactoring to channel would break the trap fantasy; keep as `'cast'`. Channel candidates still expected in Phase C3 wand/gauntlet design.
3. **No `'auto'` candidates** — auto-attacks are engine-level per §9.2, not in skill-data form.
4. **Combo-state specs pending.** Exposed / Deep Wound / Shadow Mark / Shadow Momentum currently live in `engine/combat/combo.ts`. Per §8.1 ComboStateSpec schema, migration into `dagger.ts` deferred until schema lands (same deferral as staff).
5. **`baseAilmentChance` calibration** — dagger has 4 explicit ailment-vector skills (Fan 40, Trap 40, Assassinate 35, Chain Strike 30) versus staff's 5. Dagger vectors trend slightly higher because phys→element conversion routes funnel hits through §8.3 Ailment-Baseline automatically, so explicit chance stacks on top. Validate once combat smoke test runs.
6. **Viper Strike "+50% ailment potency" snapshot** — description references a 1.5× snapshot multiplier for native chaos DoT. Current `dotDamagePercent: 0.25` lands the baseline; the potency modifier is a gear/talent-facing mechanic not yet wired. Known gap; not Change 5 scope.
7. **Blade Ward counter-attack** — description says "counter-attack enemies that hit you for 60% weapon damage." Counter-attack hook for ability defs not yet wired (similar to staff Grave Injustice gap). Known gap; not Change 5 scope.
8. **Mana economy — dagger sample.** Total manaCost across 10 actives = 138, mean ≈ 13.8/cast. Cadence blends 8 casts (~0.9s avg castTime) with 2 instants (~0.3s effective) → ~15 mana/sec drain. Combined with staff ~18 mana/sec, `ManaState.regenPerSec` target window is 12-20. Validate via combat smoke test (Phase A cleanup, post-Change 5).
9. **Assassin morphs** — all 10 dagger skills have morph entries in `engine/classAdjustment.ts` (Assassin is primary class for dagger). Per §4.3 Paradigm Preservation Rule, dagger identity (chain-attack + crit + combo-states) is **LOCKED**. Phase B5 morph retune deferred — out of Change 5 scope.

**Bow pre-rebuild inventory — `src/data/skills/bow.ts` (reclassified to Phase C3; kept here as snapshot before rewrite):**

*Not an audit — this is the state of bow.ts at the moment it was reclassified. The `skillKind`/`manaCost`/`baseAilmentChance` fields were added during the misclassified audit pass and are harmless (they parse clean; Phase C3 rebuild will overwrite the whole file). Use this table to steer the Phase C3 Hunter/bow rewrite: what's already drafted, what the paradigm gap is, what ids collide.*


| Skill | skillKind | manaCost | baseAilmentChance | Note |
|---|---|---|---|---|
| Arrow Shot | cast | 4 | 0 | Basic phys shot, bleed auto per §8.3. Prime `'auto'` candidate once §9.2 lands |
| Rapid Fire (active) | cast | 8 | 0 | Speed-fire stream. Channel candidate but duplicate-ID bug blocks refactor |
| Ice Barrage (`bow_multi_shot`) | cast | 12 | 30 | AoE cold, 65% phys→cold conversion — chill/frostbite vector |
| Burning Arrow | cast | 10 | 25 | 65% phys→fire conversion — ignite vector |
| Shock Arrow (`bow_smoke_arrow`) | cast | 10 | 25 | 65% phys→lightning conversion — shock vector |
| Snipe | cast | 25 | 0 | Heavy phys nuke, bleed auto per §8.3 |

**Issues flagged during bow audit (no code change required this pass):**
1. **Under-populated pool.** Only 6 actives — §9.5 target is 12-15. Expansion to parity with staff/dagger (10-active pools) is **content authoring**, not Change 5. Flagged for Phase C3 bow expansion; gap is ~4-6 skills. Natural fills: Explosive Arrow (fire AoE), Poison Arrow (chaos DoT), Trick Shot (mobility), Barrage (channel candidate), Hunter's Mark (setup buff active), Ricochet (chain).
2. **Duplicate ID bug — `bow_rapid_fire` collision.** The string `bow_rapid_fire` serves as both an `ActiveSkillDef.id` (line 19) and an `AbilityDef.id` (line 95). If unified-skill indexing ever resolves skills by id across both arrays, this collides. Not introduced by audit; pre-existing. Known gap — out of Change 5 scope.
3. **Stale IDs on two skills.** `id: 'bow_multi_shot'` with `name: 'Ice Barrage'`, and `id: 'bow_smoke_arrow'` with `name: 'Shock Arrow'`. Renaming would cascade into save-state/talent-tree references; defer to a dedicated migration pass.
4. **Zero `'instant'` candidates in bow pool.** All bow skills have meaningful wind-up/draw-time fantasy. Arrow Shot (castTime 1.0) is the closest, but §9.2 flags it as the prime `'auto'` promotion candidate instead. Final classification deferred until §9.2 auto-attack system lands.
5. **Rapid Fire channel refactor blocked.** Description "loose arrows with incredible speed" + 0.7s castTime + 50% weaponDamagePercent fits the channel pattern perfectly. But the duplicate-ID bug (issue #2) plus the lack of `duration` field blocks migration to `'channel'`. Known gap.
6. **No `'auto'` classifications issued.** Per §9.2, auto-attacks are engine-level wiring, not skill-data classifications. Arrow Shot waits for §9.2 to promote it (or to explicitly leave it as `'cast'` and designate a separate auto).
7. **`baseAilmentChance` calibration — cold/fire/lightning converters.** Ice Barrage 30, Burning Arrow 25, Shock Arrow 25. These stack on top of §8.3 Ailment-Baseline, which already proc-rolls chill/ignite/shock from elemental damage buckets. Net chance per hit is (baseline proc) + (baseAilmentChance), so calibration needs combat smoke test once Change 4 mana consumption + Change 3 ailment triggers are both live.
8. **Mana economy — bow sample.** Total 4+8+12+10+10+25 = 69, mean ≈ 11.5/cast. Cadence ~1.1s avg castTime → ~10 mana/sec drain. Lowest of the three pools (staff ~18, dagger ~15, bow ~10). `ManaState.regenPerSec` target window for all three pools: **10-20**. Validate via combat smoke test post-Change 4.
9. **Hunter morphs not yet authored.** Bow's primary class is Hunter. `engine/classAdjustment.ts` has no Hunter entries; Hunter morph set was deferred during class-system Phase 4. Per §4.3 Paradigm Preservation Rule, bow identity (projectile + elemental conversion + precision payoff) is **LOCKED**. Phase B5 morph authoring + Phase C3 bow expansion deferred — out of Change 5 scope.

**NARROWED SCOPE from original.**

**Important re-framing:** The original plan implied Change 5 audits all ~135 existing skills. Reality: most non-staff/dagger skills live lumped in `data/skills/secondary.ts` as placeholders for weapon types that are being **dropped** (sword/axe/mace/greataxe/maul/scepter/tome per §4.1) or **rebuilt from scratch** (wand/gauntlet/greatsword/crossbow/flail/scythe/claws). Auditing those is wasted work because they'll be wholly replaced in Phase C3.

**Revised Change 5 scope — audit ONLY weapons with real pools (post-execution correction 2026-04-23):**
- **Staff** — 10 actives + 3 buffs. Full audit: combo states, damage types, morphs, procs, skillKind/manaCost/baseAilmentChance, channel candidates (e.g. Locust Swarm could be `'channel'`).
- **Dagger** — 10 actives + 3 buffs. Full audit: same fields + combo-state refinement (Exposed/Deep Wound/Shadow Mark).
- ~~**Bow** — ~162 lines, lighter pool. Audit + may need expansion to hit 12-15 target.~~ **Reclassified to Phase C3 rebuild** — content state (6 actives, duplicate `bow_rapid_fire` id between active + ability, two stale ids `bow_multi_shot`/`bow_smoke_arrow`) is rework territory, not audit territory. See bow pre-rebuild inventory below for the snapshot before rewrite.

**Fields to assign per skill during audit:**
- `skillKind` (instant / cast / channel / auto)
- `recoveryTime` (instants, 0.2-0.3s typical)
- `channelTickInterval` (channels, 0.4-0.6s typical)
- `baseAilmentChance` (0 default; 25-50% for signature ailment skills)
- `manaCost` (tuning pass — small skills 10-15, heavy 30-50, channels per-tick)
- Verify `duration` (channels need it; set if missing)

**Weapons NOT audited here** (handled by Phase C3 design):
- **Bow** (moved from audit scope 2026-04-23 — see STATUS note) — has 6 actives + id bugs; rewrite to 10-12 actives alongside Hunter fantasy brief
- Wand, Gauntlets, Greatsword, Crossbow (lumped-in placeholders → fresh design)
- Claws, Flail, Scythe (new weapon types → add to `WEAPON_TYPE_META` + design from scratch)

**Narrowed effort:** ~1-2 sessions for staff + dagger audit (as executed). Bow rebuild is Phase C3 content-authoring effort, counted there.

**Weapon type cleanup** (blocking design phase — should happen together with Change 5):
- Remove dead entries from `data/weapons.ts WEAPON_TYPE_META`: `sword`, `axe`, `mace`, `greataxe`, `maul`, `scepter`, `tome`. Migration needed for characters holding those weapons (convert to closest survivor or refund as currency).
- Add entries for `claws`, `flail`, `scythe`.
- Migration for save state referencing dropped weapon types.

**Fix:** For every `ActiveSkillDef` in `data/skills/*.ts`:

- Assign `skillKind` ('instant' | 'cast' | 'channel' | 'auto')
- Assign `recoveryTime` for instants (0.2-0.3s typical)
- Assign `channelTickInterval` for channels
- Assign `baseAilmentChance` (0 for non-ailment, 25-50% for signature ailment skills)
- Assign `manaCost`

Pure data editing; can run incrementally per weapon pool.

**Effort:** ~1 session per weapon pool × 10 weapons = 4-5 sessions total. Can be parallelized with design work.

---

## 10. Ascendancy System (deferred — post-foundation)

Authored AFTER combat foundation + class trees + weapon pools are live and tuned.

- 3 ascendancies per class (one per loadout archetype).
- Each is a small compact tree (~8 nodes).
- Unlocked at mid-game (level ~25-30, exact TBD).
- Deepens primary class fantasy along one axis.
- Separate from class tree budget; does not compete for points.

### 10.1 Ascendancy Drafts (15 total — one-line concepts)

All subject to revision during fantasy-brief phase. Preserved here so intent isn't lost.

**Witchdoctor:**
- **Plague Priest** — Poison stack cap +15. Pandemic spreads DoTs to 2 targets on death instead of 1.
- **Spirit Whisperer** — Minion count +2. Minions inherit your on-hit procs and combo-state creation.
- **Voodoo Sovereign** — Hex can crit. Skills that consume Hexed deal 2× damage.

**Assassin:**
- **Blademaster** — Crits have 30% chance to refund the skill's cooldown. While dual-wielding, chain attacks gain +1 hit.
- **Venomcraft** — Poison can crit. Your poison stacks no longer decay while you have Shadow Mark active.
- **Shadowdancer** — Mark applies on first hit regardless of skill. Hits on marked targets generate Shadow Momentum.

**Sorcerer:**
- **Elementalist** — Conversion effects stack to 150% instead of 100%. Your element-swap procs also reset the Resonance counter.
- **Arcanist** — Resonance charges cap +5. Spending Resonance grants a brief cast-speed burst.
- **Pyromancer-Cryomancer-Stormcaller** (pick one dominant element) — choose at ascendancy time; locked-in element gains +50% damage, other elements gain +25%.

**Berserker:**
- **Warlord** — Rage threshold raises to 50% HP. Execute-range skills gain +100% damage instead of +50%.
- **Reaver** — Each kill during low-HP extends low-HP window by 2s. Cannot die while Rage is active.
- **Juggernaut** — All damage taken reduced by 30% while wielding 2H. Flail sweep cone widens.

**Hunter:**
- **Marksman** — First hit on any new target always crits. Precision payoffs deal +50% damage.
- **Beastmaster** — Summon a permanent animal companion (wolf / hawk / panther, pick one) that inherits your on-hit procs.
- **Trapper** — Traps gain +2 arming count. Multi-trap chains deal escalating damage per hit.

Scope: 5 classes × 3 ascendancies × ~8 nodes = ~120 ascendancy nodes. Significant but focused.

---

## 11. Multi-Class System (deferred last; design locked 2026-04-26)

Authored AFTER ascendancies ship and playtest. Multi-classing adds **mechanical depth, not just flavor expansion** — every pair has a unique gameplay loop that no solo class can replicate.

- Unlocks mid-late game (specific gate TBD — see §13).
- Named archetype per pair (10 pairs total — see §11.2).
- Does NOT grant: secondary ascendancy. Primary ascendancy is canon.

### 11.1 The 4-Layer Multi-Class Identity Model (LOCKED 2026-04-26)

Multi-classing is NOT just "second class's skills + weapons." Each of the 10 pairs gets four mechanical layers that combine into a unique playstyle DNA. WD+Berserker plays nothing like WD+Sorcerer even though both share the WD primary.

| Layer | What it is | Player-facing effect | Phase F authoring per pair |
|---|---|---|---|
| **1. Pair Identity** | Named archetype + 1-line fantasy (§11.2) | UI title; lore | Already drafted (10 pairs) |
| **2. Fusion Signature Mechanic** | ONE unique mechanic combining both class signatures. Cannot exist on any solo class. | A new gameplay loop unique to that pair | 1 mechanic spec per pair (10 total) |
| **3. Skill Toggle Morphs** | 3-5 of your existing skills get a TOGGLE (UI checkbox) to swap to a secondary-class-flavored variant. Per-skill player choice. | Active build decisions per skill | 3-5 morph cells per pair (~40 total) |
| **4. Weapon Unlocks** | Secondary class's 3 default weapons (per §4.2) become accessible | Playstyle expansion via new weapon paradigms | Free (already covered by §4.2 default-weapon model) |

**Why 4 layers and not just weapon unlocks:**
- Weapon unlocks alone made multi-class feel like flavor expansion, not a real progression payoff.
- Layers 2 and 3 give EVERY PAIR distinct mechanical DNA. The Pandemic+Rage Threshold combo (Deathwalker) plays differently from Pandemic+Resonance (Seer) plays differently from Pandemic+Mark (Soul Trapper).
- This makes multi-classing the meaningful endgame identity payoff, not just "more weapons + more talents."

#### Worked example — Witchdoctor + Berserker → "Deathwalker"

**Layer 1 — Identity:** "Deathwalker." Rage-fueled plaguebearer; wades into blood, leaves disease.

**Layer 2 — Fusion Signature: Bloodied Pandemic**
- Your DoTs deal +50% damage to enemies below 50% HP.
- On Pandemic transfer, if the dying target was Bloodied (Berserker state), the transfer **doubles** — DoTs land on TWO nearest enemies instead of one.
- *No solo class can replicate this.* WD has Pandemic without Bloodied; Berserker has Bloodied without Pandemic.

**Layer 3 — Skill Toggle Morphs (4 examples):**

| Default WD skill | Default behavior | Toggle (Deathwalker only) |
|---|---|---|
| Zombie Dogs | 2 dogs, bite applies Haunted | **Rage Zombies** — dogs gain attack speed as YOU take damage; frenzy + double damage below 50% HP |
| Locust Swarm | Chaos DoT, transfers on death | **Blood Swarm** — damage scales with your missing HP; applies Bloodied |
| Mass Sacrifice | Sacrifice minions for AoE | **Berserker's Sacrifice** — sacrifice YOUR HP instead; pushes you below threshold for Rage |
| Hex | Curse target | **Bloodcurse** — Hex also applies Bloodied; doubles damage if you're below 50% HP |

Player picks toggle state per skill. All 4 toggled = full Deathwalker fantasy. None toggled = pure WD with Berserker weapons unlocked. Mix = your build.

**Layer 4 — Weapon Unlocks:** Greatsword, Flail, Claws (Berserker's defaults per §4.2).

#### Counter-example — Witchdoctor + Sorcerer → "Seer" (entirely different feel from same WD primary)

**Layer 2 — Fusion Signature: Elemental Pandemic** — DoTs apply Resonance charges (one per element type); on Pandemic transfer, all charges transfer with the DoTs. At 4 charges, your next Pandemic triggers a Convergence on the receiving target (4 ailments + 4-bucket damage).

**Layer 3 — Toggle Morphs (different set):**
- Locust Swarm → **Frost Locusts** (cold conversion, chill stacks)
- Haunt → **Ember Haunt** (fire conversion, ignite stacks)
- Spirit Barrage → **Storm Barrage** (lightning, shock vector)
- Zombie Dogs → **Element Sprites** (cycling-element minions, contribute Resonance)

**Layer 4 — Weapon Unlocks:** Wand, Gauntlets (Staff overlap doesn't unlock new).

Same WD core. Completely different gameplay. THAT's what multi-class should feel like.

### 11.2 Pair Identity Roster (10 pairs)

Primary class is the first listed; name applies regardless of order but fantasy leans on primary's flavor. Detailed pair briefs live in `docs/design/MULTI_CLASS_PAIRS.md`.

| Pairing | Combined Archetype | One-Line Fantasy | Detailed pair brief |
|---|---|---|---|
| Witchdoctor + Assassin | **Blood Cultist** | Ritual dagger work; shadows that ooze hex and poison. | ✅ authored 2026-04-26 |
| Witchdoctor + Sorcerer | **Seer** | Elemental voodoo; weather as curse, curse as weather. | ✅ authored 2026-04-27 (`MULTI_CLASS_PAIRS.md` §2) |
| Witchdoctor + Berserker | **Deathwalker** | Rage-fueled plaguebearer; wade into blood, leave disease. | ✅ authored 2026-04-27 (`MULTI_CLASS_PAIRS.md` §3) |
| Witchdoctor + Hunter | **Soul Trapper** | Spirit-bound traps; tracking souls as they flee their bodies. | ✅ authored 2026-04-27 (`MULTI_CLASS_PAIRS.md` §4) |
| Assassin + Sorcerer | **Arcane Blade** | Spell-edge crits; every strike carries stored magic. | pending |
| Assassin + Berserker | **Dark Reaver** | Lethal rage; crits feed frenzy, frenzy feeds crits. | pending |
| Assassin + Hunter | **Nightstalker** | Stealth hunter; shadow-marked targets die from nowhere. | pending |
| Sorcerer + Berserker | **Spellreaver** | Fury channeled through element; rage tempers spell. | pending |
| Sorcerer + Hunter | **Arcane Archer** | Elemental arrows, conversion on projectiles, spell-level range. | pending |
| Berserker + Hunter | **Warden** | Committed melee with ranged backup; trap-and-execute. | pending |

### 11.3 Pre-Wired Architecture

Already in place for layers 1 + 4, no new schema needed:

- `classIds: CharacterClass[]` on `ClassSkillAdjustment` (`types/classAdjustment.ts:25`) supports multi-class merge.
- `getClassSkillAdjustmentsForClasses` (`engine/classAdjustment.ts:132`) already defined.
- `Character.class` (`types/character.ts:42`) needs upgrade to `classes: [primary, secondary?]`.
- `resolveStats` (`engine/character.ts:55-63`) iterates class — trivial extension to iterate a list.
- `collectTalentEffects` (`engine/classTalentDispatcher.ts:43`) takes one class — extend to accept a list.

**New schema needed for layers 2 + 3 (Phase F engineering):**

- **`SkillToggleMorph` array on `ActiveSkillDef`** — per-skill toggle options gated by class-pair eligibility.
- **`Character.skillToggles: Record<skillId, toggleId>`** — per-character active toggle state. Save migration v66+.
- **`getEffectiveSkillDef` extension** — apply toggle morph if active and pair-eligibility checks pass.
- **`PairFusionMechanic` schema** — register fusion mechanic spec per pair; engine pair-detection at character init.
- **UI** — toggle checkboxes per skill in skill-bar config screen, only visible when multi-class active and toggle eligible.

Phase F engineering: ~1-2 sessions for schema + resolver. UI is bigger (~1-2 sessions on its own).

### 11.4 Phase F Authoring Scope

| Item | Per pair | × 10 pairs | Total |
|---|---|---|---|
| Pair identity name + 1-line fantasy | already drafted (§11.2) | 10 | done |
| Fusion signature mechanic spec | 1 | 10 | **10 mechanics** |
| Toggle morphs (3-5 per pair) | 4 avg | 40 | **40 toggle morphs** |
| Weapon unlocks (free per §4.2) | 0 | 0 | 0 |

**~50 design cells for full multi-class authoring.** Comparable to Phase C class-tree authoring (~125 identity nodes per class).

---

## 12. Execution Order

### Phase A — Foundation Engineering (~8 sessions)
1. Change 1 — skillKind branching + channels + per-kind GCD floor
2. Change 2 — Auto-attack system
3. Change 3 — Ailment trigger rework
4. Change 4 — manaCost wiring
5. Change 5 — Skill audit pass (parallel with design)

### Phase B — Design Lock (2-3 sessions)
7. ✅ Fantasy briefs (5 classes × ~1.5 pages each) — landed 2026-04-26 in `CLASS_FANTASY_BRIEFS.md` (rewrite to drop "primary weapon" framing pending — see §3.3)
7b. ✅ 4-Layer Multi-Class Identity Model + Class-First Default-Weapon Model — locked 2026-04-26 (§4.2 + §11)
7c. ✅ Multi-class pair authoring kicked off — Blood Cultist (WD+Asn) authored as first pair in `MULTI_CLASS_PAIRS.md` 2026-04-26
8. **✅ Class tree structure design COMPLETE** — All 5 class trees authored as JSON: `witchdoctor.json` 2026-04-27 (80 nodes), `assassin.json` 2026-04-27 (81 nodes), `sorcerer.json`/`berserker.json`/`hunter.json` 2026-05-03 (81 nodes each). 404 total nodes; 15 capstones reshape signature mechanics; 5 cross-weapon nodes; 6 buff migrations absorbed; zero weapon-conditional nodes; zero idle-incompatible mechanics. Cross-class consistency check 10/10 PASSED 2026-05-03 — full results table in `CLASS_TREES.md`.
9. ✅ Morph retune pass for Assassin×Staff paradigm fights (§4.3) — landed 2026-04-26 (`engine/classAdjustment.ts`); 3 morphs detoxified (Haunt/Spirit Barrage/Bouncing Skull); Mass Sacrifice flagged for future review.
9b. ✅ Skill-fantasy synergy audit for WD staff + Asn dagger — landed 2026-04-26 in `SKILL_FANTASY_AUDIT.md` (20 actives across 4 axes; 6 buffs flagged for migration; all audit recommendations applied to skill data 2026-04-26).

### Phase C — Content Authoring (multi-session, incremental)
10. Archive per-skill talent trees; build content-mining audit
11. Author class trees (5 classes × ~90 nodes, ~125 real-design nodes)
12. Expand weapon skill pools to 12-15 skills each with real combo states, buffs, procs, channels
13. Implement combo-state first-class schema (`createsComboState` / `consumesComboState`)
14. Author class × weapon morph cells (20 pairs)
15. Implement cross-weapon combo propagation (engine + class-tree nodes)

### Phase D — Integration & Playtest (multi-session)
16. Full-loop playtest: is each class fantasy punching? Do autos fill dead air? Does speed feel visceral? Are ailments earned?
17. Iterate on tree node impact (too stat-sticky? too OP?) and auto-attack damage economy.

### Phase E — Ascendancy (deferred)
18. Ascendancy design & authoring (§10)

### Phase F — Dual-Class (deferred last)
19. Multi-class schema migration
20. Named-combo flavor pass
21. Dual-class playtest

---

## 13. Open Decisions (pending user lock)

| Decision | Options | Recommendation |
|---|---|---|
| ~~Level cap~~ | **LOCKED: 60** | |
| ~~Talent point budget~~ | **LOCKED: 51 pts, 1/level starting at level 10** | |
| ~~Ability haste stat~~ | **LOCKED: No. Only `attackSpeed` + `castSpeed` are timing stats.** | |
| Class tree respec cost | Free / Gold / Per-node | Gold per-respec for main tree; free for loadout-gated |
| Skill graph per-weapon passive | Keep / Retire | Defer decision to post-content-audit |
| Auto-attack damage target % | 5-8% / 10-15% / 20%+ | Start at 5-8%, tune up if autos feel pointless |
| Ascendancy unlock level | 20 / 25 / 30 | 25 (mid-game, prior to dual-class gate) |
| Dual-class unlock | Level gate / Quest gate / Ascendancy-complete gate | Ascendancy-complete gate (earn it) |

---

## 14. Glossary

- **Paradigm (weapon)** — the mechanical identity of a weapon (DoT+Minion for staff, Fast-Strike+Combo+Burst for dagger). Preserved across classes.
- **Morph (class×weapon)** — per-class flavor overlay on a skill: name, damage type, combo state, cast feel. Never changes paradigm.
- **Signature mechanic (class)** — the one mechanic only THIS class has, unreplicable by any other means.
- **Combo state** — a target-side tag (Haunted, Hexed, Exposed, etc.) created by a skill and consumable by another skill for a bonus.
- **Combo-state propagation** — class-tree nodes that let a class apply its signature combo states via weapons it wouldn't naturally have (dual-class fluidity).
- **Capstone / Keystone** — tier-7 class-tree node requiring deep commitment; reshapes class fantasy.
- **Loadout-gated node** — class-tree node that activates only while a specific offhand or weapon type is equipped.
- **Ailment** — a damage-over-time or stat-modifying status (Bleed, Burn, Chill, Shock, Poison, Frostbite). Applied via chance roll post-hit.
- **skillKind** — per-skill delivery mode: instant / cast / channel / auto.

---

---

## 15. Session Handoff — Current Codebase State

**READ THIS FIRST when starting a new session.** Line numbers below were accurate as of 2026-04-22 **but will have drifted after the Changes 1-4 edits of 2026-04-23.** Use the function/identifier names as the real anchors, not line numbers.

### 15.0 NEW FILES SHIPPED 2026-04-23 (not in pre-change line-number index)

- `src/engine/combat/autoAttack.ts` — auto-attack subsystem (Change 2). Exports `rollAutoAttack`, `computeAutoAttackInterval`, `shouldFireAutoAttack`, `applyNonSkillTickWithAuto`.
- `src/engine/combat/manaTick.ts` — mana regen + deduct helpers (Change 4). Exports `regenMana`, `deductMana`, `canAffordManaCost`, `tickManaWithCost`.

**DATA POPULATED 2026-04-23:**
- `src/data/skills/staff.ts` — all 10 actives carry `skillKind: 'cast'`, `manaCost` (8-40), `baseAilmentChance` (0/25/30/40). Buffs/passive (`AbilityDef`) untouched. Per §9.5 audit table.
- `src/data/skills/dagger.ts` — **PENDING AUDIT** (next session Option A).
- `src/data/skills/bow.ts` — **PENDING AUDIT** (after dagger).

### 15.-1 NEW FIELDS SHIPPED 2026-04-23

- `ChannelState` interface in `types/combat.ts` (after `ComboState`)
- `channelState: ChannelState | null` + `nextAutoAttackAt: number` on `GameState` (near `nextActiveSkillAt`)
- `skillKind`, `recoveryTime`, `channelTickInterval`, `manaCost`, `baseAilmentChance` on `ActiveSkillDef` AND `SkillDef` (converter carries through)
- 7 ailment-chance stats on `ResolvedStats`: `ailmentChanceAll`, `ailmentChanceBleed/Burn/Chill/Shock/Poison`, `ailmentChanceOnCrit`
- Save version bumped 64 → 65 with migration
- `AUTO_ATTACK_BASE_DMG_COEF`, `AUTO_ATTACK_MIN_INTERVAL`, `AUTO_ATTACK_BASE_INTERVAL` in `data/balance.ts`

### 15.-2 ORIGINAL HANDOFF SECTION (line numbers stale — use as directory)

### 15.1 Key Files

**Combat loop (the tick):**
- `src/engine/combat/tick.ts` (2607 lines) — THE combat tick, one big function. GCD check at line 255; cooldown logic; debuff/ailment application; enemy phase; kill handling. Where Changes 1, 2, 3, 4 all converge.
- `src/engine/combat/helpers.ts` — `applyDebuffToList`, `tickDebuffDoT`, `calcEnemyDebuffMods`, `calcBleedTriggerDamage`, etc.
- `src/engine/combat/weapons/weaponModule.ts` (174 lines) — `WeaponModule` interface: 6 hooks (`tickMaintenance`, `extendConditionContext`, `preRoll`, `postCast`, `onEnemyAttack`, `onKill`).
- `src/engine/combat/weapons/staff.ts` (1302 lines) — staff module. Rich DoT/minion/combo-state logic.
- `src/engine/combat/weapons/dagger.ts` (625 lines) — dagger module. Combo-state + burst.
- `src/engine/combat/weapons/registry.ts` — weapon module registry.

**Skill pipeline:**
- `src/engine/skills/dps.ts` (189 lines) — `calcSkillDps`, `calcSkillCastInterval`, `rollSkillCast`. **Change 1 primary target.**
- `src/engine/skills/timers.ts` (220 lines) — `getSkillEffectiveCooldown`, `getSkillEffectiveDuration`, buff/CD checks.
- `src/engine/skills/rotation.ts` (152 lines) — `getNextRotationSkill`, `calcRotationDps`, `getDefaultSkillForWeapon`.
- `src/engine/skills/resolution.ts` (141 lines) — `mergeEffect`, `resolveAbilityEffect`, `getSkillGraphModifier`.
- `src/engine/skills/effects.ts` (168 lines) — effect resolution.

**Damage system:**
- `src/engine/damageBuckets.ts` (334 lines) — `resolveDamageBuckets` (full bucket pipeline). **`resolveAilmentChances` at line 267 — PRE-BUILT, UNUSED, target of Change 3.**
- `src/engine/character.ts` (296 lines) — `resolveStats`, `calcHitChance`, DPS math.

**Data definitions:**
- `src/data/weapons.ts` (60 lines) — `WEAPON_TYPE_META`: 14 types (to be trimmed to 10 per §4.1). Has `speedModifier` field — used by damage math, NOT YET used for auto-attack cadence.
- `src/data/classes.ts` (121 lines) — `CLASS_DEFS`: 6 class defs (4 legacy, 2 MVP). Needs rename pass per §3.1.
- `src/data/classTalents.ts` (354 lines) — current per-class talent trees. 3 paths × 8 nodes × 6 classes. WD + Assassin use new `TalentEffect` union; others still on legacy flat `effect`.
- `src/data/skills/index.ts` — `SKILL_DEFS` barrel (~135 skills).
- `src/data/skills/{sword,dagger,staff,bow,secondary}.ts` — per-weapon skill files.
- `src/data/skillGraphs/{weapon}.ts` — current 10F passive skill graphs.
- `src/data/skillGraphs/{dagger,staff_*}_talents.ts` — **per-skill talent trees to archive per §7.1.**
- `src/data/skillGraphs/talentTrees.ts` — `ALL_TALENT_TREES` barrel; retire when archive lands.
- `src/data/debuffs.ts` (218 lines) — `DEBUFF_DEFS`: ailment DoT defs (bleeding, poisoned, burning, shocked, chilled, frostbite, + staff-native locust_swarm_dot, haunt_dot).
- `src/data/balance.ts` — `BASE_GCD = 1.0`, `GCD_FLOOR = 0.4`, `POWER_DIVISOR = 25`. Auto-attack base damage coefficient lands here.
- `src/data/affixes.ts` — gear affix pool. New ailment-chance affixes land here.

**Type definitions:**
- `src/types/skills.ts` (530 lines) — `SkillDef`, `ActiveSkillDef`, `AbilityDef`, `TalentEffect` union, `DamageTag`, combo-state-related types. **Forward-compat fields at lines 500-509 (`skillKind`, `recoveryTime`, `channelTickInterval`, `manaCost`) — typed, unused by engine.**
- `src/types/stats.ts` — `ResolvedStats`. Change 3 adds ailment-chance stats here.
- `src/types/character.ts:42` — `Character.class: CharacterClass`. Dual-class upgrades to array here.
- `src/types/classAdjustment.ts` (46 lines) — `ClassSkillAdjustment`: morph schema. `classIds: CharacterClass[]` already list-typed.
- `src/types/combat.ts` — `GameState`, `SkillTimerState`. New fields for channel state + auto-attack land here.

**Class talent dispatcher:**
- `src/engine/classTalentDispatcher.ts` (198 lines) — `collectTalentEffects`, `applyConditionalTalentEffects`, `dispatchProcOnHit/Crit/Kill/Tag`. **Working. Hooks: `summon` / `triggerSkill` / `grantBuff` are STUB'd pending Phase 4.1.**
- `src/engine/classAdjustment.ts` (234 lines) — `getEffectiveSkillDef`, `getClassSkillAdjustment`, `getClassSkillAdjustmentsForClasses`. **Multi-class merge function already defined but has no consumer.**

**Store:**
- `src/store/gameStore.ts` (1515 lines) — main zustand store, contains `tickCombat` delegator.
- `src/store/skillStore.ts` (439 lines) — skill progression + talent allocation.
- `src/store/migrations.ts` (915 lines) — save migrations, current version v58.

### 15.2 Change-Site Landmarks (for engineering changes)

**Change 1 — skillKind branching:**
- `src/engine/skills/dps.ts:95-112` (`calcSkillCastInterval`) — branch on `skill.skillKind`
- `src/engine/combat/tick.ts:255-260` (GCD check + skill cast path) — branch on `skillKind`
- `src/types/combat.ts` — add `channelState` field
- `src/types/skills.ts:500-509` — `skillKind`, `recoveryTime`, `channelTickInterval`, `manaCost` already typed

**Change 2 — auto-attack system:**
- `src/engine/combat/tick.ts` — add new tick phase after skill phase
- `src/types/combat.ts` — add `nextAutoAttackAt: number` to `GameState`
- `src/engine/skills/dps.ts` — add `rollAutoAttack(weaponType, stats, ...)` helper
- `src/data/balance.ts` — add `AUTO_ATTACK_BASE_DMG_COEF`
- `src/data/weapons.ts` — `speedModifier` field already defined per-weapon, consumed by new auto code

**Change 3 — ailment trigger rework:**
- `src/engine/combat/tick.ts:845-869` — DELETE `ELEMENT_AILMENT` block, REPLACE with `resolveAilmentChances` call
- `src/engine/damageBuckets.ts:267-316` (`resolveAilmentChances`) — PRE-BUILT, just wire it
- `src/types/skills.ts` (`ActiveSkillDef`) — add `baseAilmentChance?: number`
- `src/types/stats.ts` (`ResolvedStats`) — add `ailmentChanceAll`, `ailmentChance{Bleed,Burn,Chill,Shock,Poison}`, `ailmentChanceOnCrit`
- `src/data/affixes.ts` — new ailment-chance affix defs

**Change 4 — mana cost:**
- `src/engine/combat/tick.ts` skill-cast path — add mana check + deduct
- Channel tick path (new in Change 1) — per-tick mana deduct
- `src/types/mana.ts` — already defines mana state; `createInitialManaState` per class

**Change 5 — skill audit:**
- `src/data/skills/staff.ts` (218 lines, 10 actives + 3 buffs)
- `src/data/skills/dagger.ts` (183 lines, 10 actives + 3 buffs)
- `src/data/skills/sword.ts` (179 lines)
- `src/data/skills/bow.ts` (162 lines)
- `src/data/skills/secondary.ts` (1750 lines — all other weapons dump here)
- For each skill: assign `skillKind`, `recoveryTime` (instants), `channelTickInterval` (channels), `baseAilmentChance`, `manaCost`

### 15.3 Currently Working Systems (do not break)

- Snapshot-based DoT system (bleeding, poisoned, burning) with stacking instances — sophisticated, don't simplify.
- WeaponModule hook pipeline — staff and dagger modules are mature. Hook order in `tick.ts`: `tickMaintenance` → `extendConditionContext` → `preRoll` → `rollSkillCast` → `postCast` → (enemy phase) → `onEnemyAttack` → (kill phase) → `onKill`.
- Staff-native DoT override (`locust_swarm_dot`, `haunt_dot`, etc.) — debuffs.ts entries that bypass the generic `ELEMENT_AILMENT`. Keep this pattern working after Change 3; skill-authored DoTs should still fire regardless of `baseAilmentChance`.
- Class talent dispatcher for procOnHit/Kill/Crit/Tag. Class-tree `TalentEffect` union handles identity mechanics.
- `getEffectiveSkillDef` morph resolver — single source of truth for per-class skill flavor. Already lets Witchdoctor×Dagger read "Ritual Gouge" etc.
- Save migration system. Any new state fields (channelState, nextAutoAttackAt, ailmentChance stats) need a migration entry bumping version past v58.

### 15.4 Legacy Cruft to Ignore / Eventually Clean

- Legacy `AbilityDef` + `AbilityEffect` + `AbilitySkillTree` — parallel to `SkillDef`/`SkillGraph`. Merged at module load via `skills/index.ts` conversion. Don't extend; `SkillDef` is canonical.
- Legacy classes `warrior/mage/ranger/rogue` in `CLASS_DEFS` — not MVP. Eventually rename per §3.1 (warrior → berserker, mage → sorcerer, ranger → hunter; rogue absorbed into assassin).
- Legacy resource system (rage/arcane_charges/tracking/momentum). Phase 2g already "neutralized" this — placeholder fields remain in `ClassDef` but engine uses universal mana now. Full removal eventually.
- `mutators` field on `AbilityDef` — DEPRECATED, kept for migration only.

### 15.5 Save Migration Plan

Changes 1-4 each bump the save version. Expected bumps:
- v59: add `channelState: null` to GameState, add `recoveryTime`/`channelTickInterval` defaults to SkillProgress
- v60: add `nextAutoAttackAt: 0` to GameState
- v61: add ailment-chance stats to ResolvedStats (auto-zero from existing resolve)
- v62: `Character.class` → `Character.classes: [class]` (if dual-class lands; single-value at migration)

Each migration is a small function in `store/migrations.ts` following existing patterns.

### 15.6 What's Pre-Wired for Future Phases

These exist today and don't need re-engineering when their phase lands:

- **Multi-class morph merge** — `getClassSkillAdjustmentsForClasses` exists, awaits consumer.
- **TalentEffect union** — all 8 variants live (stat, statMult, procOnTag/Kill/Hit/Crit, whileTag, perStack, grantTagOnSkill).
- **Class tree structure** — 3-path × N-tier shape exists, just needs expansion from 8 nodes to ~30.
- **Morph axes** — `damageTypeOverride`, `flavorName`, `castTimeMult`, `manaCostMult`, `visualOverride`, `tagOverride` all work.
- **Weapon-speed field** — `speedModifier` exists in `WEAPON_TYPE_META`, consumed by DPS, not yet by autos.
- **Combo state debuffs** — `haunted`, `plagued`, `hexed`, `exposed`, `deep_wound`, `shadow_mark`, `soul_stack` are live debuffs. Need formal promotion to `createsComboState`/`consumesComboState` schema (§8.1) but the runtime substrate exists.
- **Debuff snapshot pipeline** — `snapshotDamage` carried through `ActiveDebuff`, makes ailment scaling rigorous.

---

## Status Log

- **2026-04-22** — Plan committed. Decisions locked: 5 classes, 10 weapons, 51-pt trees @ level 60, attackSpeed/castSpeed only timing stats, 5 engineering changes, **BOTH per-skill tree systems archived (SkillGraph + per-skill TalentTree), class tree is canonical**. Phase A engineering next session.
- **2026-04-23** — Phase A Changes 1-4 all landed in one session. Strict build clean on every validation. Change 5 narrowed to staff/dagger/bow audit only (other weapons get fresh design in Phase C3, field assignment baked in). Session closed at ~420k/1000k context.
- **2026-04-23 (cont.)** — Phase A Change 5 **staff audit** landed: 10/10 actives carry `skillKind: 'cast'` + `manaCost` (8-40 range) + `baseAilmentChance` (0/25/30/40 per §8.3). Strict build clean. 7 issues flagged. Dagger + Bow audits remain.
- **2026-04-23 (cont.)** — Phase A Change 5 **dagger audit** landed: 10/10 actives audited (2 instants + 8 casts). **Bow reclassified to Phase C3 rebuild** (6 actives + duplicate id bug + stale ids — under-populated for audit scope). Change 5 considered complete for in-scope pools.
- **2026-04-24** — **Class Mana Calibration Matrix locked** (`types/mana.ts:52-108`): per-class passive/onKill/onHit/onCrit dials encode the 3-resource (mana/rage/energy) vision. Only `passiveRegenPerSec` engine-wired; onKill/onHit/onCrit dormant schema awaiting Phase A cleanup proc handlers. WD passive bumped 2→6, Asn 8→10, legacy mage/ranger updated as bridge data for §15.4 rename.
- **2026-04-26** — **Major Phase B push.** Locked: Class-First Principle (§4.2 Model B), 4-Layer Multi-Class Identity Model (§11), Class Fantasy Briefs (5/5 in `CLASS_FANTASY_BRIEFS.md`), Skill Fantasy Audit (`SKILL_FANTASY_AUDIT.md` — 20 actives + 6 buffs across 4 axes), audit recommendations applied to skill data (3 staff chaos-reworks + 4 dagger reworks/replaces), Asn×Staff morph retune (3 morphs detoxified — `engine/classAdjustment.ts:70-104`), first multi-class pair brief (Blood Cultist WD+Asn in `MULTI_CLASS_PAIRS.md`).
- **2026-04-27** — **Witchdoctor class tree authored** as JSON (`src/data/classTrees/witchdoctor.json` — 80 nodes, 3 paths). User feedback applied: 10 specific node fixes + idle-game context corrections (no movement/tiles) + multi-rank flavor directive (procs over flat stats; "double-strike" example exactly matched in Hex Spike + Pack Mastery) + Class-First weapon-agnosticism (weapon-conditional nodes removed). Markdown `CLASS_TREES.md` slimmed to README. **3 more pair briefs authored** in `MULTI_CLASS_PAIRS.md` (Seer WD+Sor, Deathwalker WD+Brs, Soul Trapper WD+Hnt) — all WD pairs complete. Session closed at ~530k/1000k for fresh chat handoff. **`SESSION_HANDOFF.md` created as the comprehensive resume doc.**
- **2026-04-27 (cont.)** — **Assassin class tree authored** as JSON (`src/data/classTrees/assassin.json` — 81 nodes, 27/27/27 across Blademaster/Venomcraft/Shadowdancer). All 3 Asn buff migrations absorbed (Predator's Mark / Venom Covenant / Shadow Covenant). Cross-Weapon Cascade node added. All 3 capstones (Bladestorm / Toxic Saint / Untouchable) reshape Crit Cascade signature.
- **2026-05-03** — **Phase B step 8 COMPLETE.** Sorcerer / Berserker / Hunter class trees authored as JSON (81 nodes each — `sorcerer.json` Elementalist/Arcanist/Specialist, `berserker.json` Warlord/Reaver/Juggernaut, `hunter.json` Marksman/Beastmaster/Trapper). 404 total nodes across 5 classes. **Cross-class consistency check 10/10 PASSED** (see `CLASS_TREES.md` results table). All 15 tier-7 capstones reshape signatures (Pandemic / Crit Cascade / Resonance / Rage Threshold / Mark & Execute); 5 cross-weapon nodes; zero weapon-conditional nodes; zero idle-incompatible mechanics. Strict TS build clean.

---

## NEXT SESSION START HERE

**Current state as of 2026-05-03 close:** Phase A complete (all 5 changes core landed); **Phase B ~95% complete (5/5 fantasy briefs ✅, 4/10 multi-class pair briefs, 5/5 class trees authored ✅, cross-class consistency check 10/10 PASSED ✅, audit applied, morph retune done).** Only remaining Phase B work: 6 multi-class pair briefs (Arcane Blade / Dark Reaver / Nightstalker / Spellreaver / Arcane Archer / Warden).

**Paste this prompt to start fresh session:**

> "Read `/home/jerris/idle-exile/docs/design/SESSION_HANDOFF.md` to refresh context on the idle-exile combat-and-class overhaul. Phase B step 8 is COMPLETE (5/5 class trees authored 2026-05-03; cross-class consistency check 10/10 PASSED). Then proceed with [PICK ONE]: (a) authoring the 6 remaining multi-class pair briefs in `MULTI_CLASS_PAIRS.md` (Arcane Blade Asn+Sor / Dark Reaver Asn+Brs / Nightstalker Asn+Hnt / Spellreaver Sor+Brs / Arcane Archer Sor+Hnt / Warden Brs+Hnt) — closes Phase B at 100%; OR (b) Phase A cleanup — wire `onKillGain`/`onHitDealtGain`/`onHitTakenGain`/`onCritGain` proc handlers in `tick.ts` so the §9.4 calibration matrix becomes fully live; OR (c) §15.4 `CharacterClass` type rename (warrior→berserker, mage→sorcerer, ranger→hunter, absorb rogue into assassin); OR (d) Phase C engine wiring for the 5 new class JSON trees (set `resolveJsonModule: true` in `tsconfig.app.json` + upgrade `engine/classTalentDispatcher.ts` to read JSON instead of legacy `classTalents.ts`). **My recommendation: (a)** — closes Phase B at 100% and unlocks the multi-class engineering work; pair-brief sessions are well-scoped (~1-2 pairs per session at the depth set by Blood Cultist / Seer / Deathwalker / Soul Trapper)."

**Recommended next-session order** (also in `SESSION_HANDOFF.md` §"How to resume"):
1. **6 remaining multi-class pair briefs** in `MULTI_CLASS_PAIRS.md` — closes Phase B fully
2. **Phase A cleanup** — wire onKill/onHitDealt/onHitTaken/onCrit proc handlers in `tick.ts` (§9.4 matrix becomes fully live)
3. **§15.4 `CharacterClass` type rename** — warrior→berserker, mage→sorcerer, ranger→hunter, rogue→absorbed into assassin
4. **Phase C engine wiring for class JSON trees** — `resolveJsonModule: true` + `classTalentDispatcher.ts` upgrade + deprecate legacy `classTalents.ts`
5. **Phase C3 weapon-pool rebuilds** — bow expansion + 7 other weapon pools authored from scratch + skill expansion to 15-20/class
6. **§8.1 ComboStateSpec schema migration** — combo states currently hardcoded in `engine/combat/combo.ts`
7. **Phase E ascendancies** — 5 classes × 3 ascendancies × ~8 nodes = ~120 ascendancy nodes

**Known deferred items that are NOT blocking Phase B closeout** (do not interleave unless pair briefs finish early):
- Phase A cleanup — proc handlers (onKill/onHit/onCrit/onHitTaken)
- §9.1 channel duration enforcement + rotation priority
- §15.4 `CharacterClass` type rename (warrior→berserker, mage→sorcerer, ranger→hunter; rogue absorbed into assassin)
- §8.1 ComboStateSpec schema migration (combo states currently hardcoded)
- Phase C3 weapon-pool rebuilds (8 weapons + skill expansion)

**Phase B step 8 ✅ DONE 2026-05-03.** Next major milestone: Phase B 100% close (6 pair briefs), then Phase A cleanup, then Phase C content authoring + Phase F multi-class engineering.

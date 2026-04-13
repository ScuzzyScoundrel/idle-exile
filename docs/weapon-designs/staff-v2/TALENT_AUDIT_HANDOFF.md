# Staff v2 Talent Tree Quality Audit — Session Handoff

> Purpose of this doc: drop into a fresh Claude session alongside the question
> "audit and upgrade staff v2 talent trees" and it should have everything
> needed to start work immediately.

## TL;DR — Current State (2026-04-13)

- **10 skills × 39 nodes = 390 talent nodes shipped live** (commit `b369609`)
- **34 new engine fields** in `ResolvedSkillModifier`, wired in `staff.ts`
- **99/99 staff mechanics QA** passing; **524/780** full talent sweep PASS, **0 FAIL**, **0 BROKEN**
- **Staff is playable on the live Vercel site**, dogs render, DoTs work, combo states flow

## How We Got Here — Process Failure (read this first)

**The IMPLEMENTATION_GUIDE.md explicitly covers how to avoid this exact problem.**
Re-read it end-to-end before starting the audit — key rules I violated:

1. **Phase 1 deliverable is ONE JSON PER SKILL** (`docs/weapon-designs/{weapon}-v2/{skill-name}.json`).
   I wrote `mass_sacrifice.json` and then shortcut the other 9 skills by authoring
   TypeScript directly with the `bh()` helper. Without a JSON design doc that forced
   me to think about each node individually, it became trivial to copy behavior-slot
   patterns across skills.
2. **Rule 3 — "No flavor-only nodes"**: Spirit of the rule is that every node should
   *do something distinct*. Three behavior slots in one branch all reading
   `+dotMultiplier` technically maps to an engine field (satisfies the letter) but
   violates the intent.
3. **Rule 4 — proc node structure**: By elevating procs to a mandatory first-class
   design concern, the guide implicitly expects procs throughout the tree, not just
   as decoration on the occasional notable.
4. **Dagger post-mortem opening**: Guide opens by saying dagger v2 shipped 200+
   broken nodes from procedural shortcuts. Staff v2 shipped 210 working-but-samey
   nodes from a different procedural shortcut — same category of failure.

**Remedy for the audit**: write the missing 9 JSON design docs FIRST, then transpile.
Do NOT author TypeScript directly from head without a JSON design step. The JSON is
the forcing function for per-node design.

## The Problem

Too many behavior nodes are near-duplicates of each other:

```ts
// Seen on 60%+ of branches across 10 trees:
t1a: bh('Name A', '+15/30% dotMultiplier',   { dotMultiplier: 15 })
t1b: bh('Name B', '+10/20% ailmentPotency',  { ailmentPotency: 10 })
t2b: bh('Name C', '+15/30% dotMultiplier',   { dotMultiplier: 15 })  ← same field as t1a
t4b: bh('Name D', '+15/30% dotMultiplier',   { dotMultiplier: 15 })  ← again
```

The T7 keystones and most T2/T4 Notables ARE decent — unique mechanics, build-defining.
The T5 keystoneChoices mostly work — meaningful A-vs-B tradeoffs.
**The problem is specifically the 7 behavior nodes per branch (T1a, T1b, T2b, T3a, T3b, T3c, T4b).** That's 7 × 3 branches × 10 skills = **210 nodes** that are mostly lifeless stat stacks.

## What "Good" Looks Like (dagger reference)

Open `src/data/skillGraphs/dagger_talents.ts` and look at Blade Sense (Stab T2):

```ts
t2Notable: {
  name: 'Blade Sense',
  description: '10% chance on Stab hit to enter Predator state (+50% crit multiplier for 3s). Chance increases by 4% per consecutive Stab hit on the same target (max 30%). Resets on target switch.',
  modifier: {
    procs: [{
      id: 'st_blade_sense',
      trigger: 'onHit',
      chance: 0.1,
      conditionParam: { perConsecutiveHit: 0.04, maxChance: 0.3, sameTarget: true },
      applyBuff: { buffId: 'predator', effect: { critMultiplierBonus: 50 }, duration: 3 },
    }],
    incCritChance: 10,
  },
},
```

That's one node with: a proc trigger, a conditional chance modifier, a scaling mechanic, a buff with duration, AND a raw stat. It's a MECHANIC, not a stat bump.

## What the Engine Already Supports

### Procs (SkillProcEffect — `src/types/skills.ts`)

```ts
procs: [{
  id: string,              // unique ID
  trigger: TriggerCondition,
  chance: number,          // 0-1
  internalCooldown?: number,
  conditionParam?: Record<string, any>,  // gating logic
  applyBuff?: { buffId, effect, duration, stacks, maxStacks },
  applyDebuff?: { debuffId, stacks, duration, snapshot? },
  bonusDamage?: number,    // direct damage
  healAmount?: number,
  cooldownReset?: string[],  // skill IDs to reset
  // + more fields — see interface in src/types/skills.ts
}]
```

### TriggerConditions available (full list, pick what fits)

From `src/types/skills.ts:151-185`:

```
Event-based:
  onHit, onCrit, onKill, onBlock, onDodge
  onCast, onCastComplete, onFirstHit, onOverkill
  onBossPhase, onDebuffApplied
  onKillInCast, onMultiKillInCast, onTripleKillInCast
  onAilmentApplied, onAilmentExpire, onAilmentKill, onAilmentTick

State-based:
  whileLowHp, whileFullHp, whileAboveHp
  whileDebuffActive, whileBuffActive, consumeBuff
  whileTargetBelowHp, whileTargetAilmentCount, whileTargetSaturated
  whileWardActive, whileDeepWoundActive, whileFortifyStacks
  whilePackSize, whileTargetsHit, whileSkillOnCooldown
  whileMinionsAlive  ← NEW for staff
  targetHasActiveAilment, whileTargetLinked

Per-unit scaling:
  perAilmentStackOnTarget, perEnemyInPack, perFortifyStack
  perTargetInLastCast, perOwnAilmentOnTarget
  perOtherSkillOnCooldown, perSecondOnCooldown
  perHitReceivedDuringWard

Temporal/sequence:
  afterConsecutiveHits, afterCastWithoutKill
  afterCast, afterCastOnMultipleTargets
  afterDodge, afterDodgeOrBlock, afterDash
  firstSkillInEncounter, skillsCastSinceLast
  previousSkillWas, lastSkillInCycle
```

### Conditional modifiers (conditionalMods)

```ts
conditionalMods: [{
  condition: TriggerCondition,
  threshold?: number,
  buffId?: string,     // for whileBuffActive
  debuffId?: string,   // for whileDebuffActive
  modifier: SkillModifier  // any fields to apply when condition true
}]
```

### SkillModifier field surface (all fields usable in talent nodes)

Existing (from dagger v2):
- incDamage, flatDamage, incCritChance, incCritMultiplier, incCastSpeed
- extraHits, durationBonus, cooldownReduction, cooldownIncrease
- dotMultiplier, weaponMastery, ailmentPotency, ailmentDuration
- firePenetration, coldPenetration, lightningPenetration, chaosPenetration, allResist
- leechPercent, lifeOnHit, lifeOnKill
- chainCount, forkCount, pierceCount, splitDamage
- executeThreshold, overkillDamage, selfDamagePercent
- postCastDodgeWindow, counterHitDamage, counterCanCrit
- guardedEnhancement, detonationDamageBonus

Staff v2 (34 new, see `src/engine/skillGraph.ts`):
- minionHpMult, minionDurationMult, minionDamageMult
- extraZombieDogCount, extraFetishCount, zombieDogAttackIntervalReduction
- damagePerMinionAlive, damagePerSoulStackActive
- detonationPerSoulStackBonus, detonationUsesMaxHp, detonationPerMinionMult
- burstDamagePerDebuffOnTarget, cdRefundPerStateConsumed
- hauntedTargetHauntBonus, hexedTargetDamageAmp
- soulHarvestCritBonusStacks, soulStackConsumeHealsMinions, soulHarvestDamageHealPercent
- massSacrificePandemic, pandemicFullDuration
- resummonOnMassSacrifice, hauntedConsumeSummonsSpirit, critRefreshesCombatStates
- cannotMiss, firstCastGuaranteedCrit, resetAllCooldownsOnCast
- hauntIsAoe, hauntKillSpawnsMinion, hauntChainDamageCompound, hauntedExecuteThreshold
- hexedConsumeMassSacrificeBonus, plaguedConsumePoisonStacks
- soulStackDamagePerStack, soulStackCapOverride

### rawBehaviors (passthrough)

Any field not in `ResolvedSkillModifier` gets captured in `rawBehaviors: Record<string, any>`.
Read in weapon hooks via `graphMod?.rawBehaviors?.myField`. Good for complex objects
(`{ percent, duration }`). No interface change required — just use the field name.

## The Ask for the Audit Session

For each of the 10 staff talent trees, replace ~50% of the 7 behavior-node slots with:
- **Procs** (chance-based onHit/onCrit/onKill/onAilmentTick/etc. effects)
- **Conditional modifiers with flavor** (not just "+damage while X" but trigger procs)
- **Cross-skill interactions** (e.g., "Locust tick has 5% chance to cast Haunt on a random pack enemy")
- **Stacking / buildup mechanics** (e.g., "every consecutive hit on same target grants +3% crit, resets on target switch")

Keep ~50% of nodes as raw stat stacks (players do like numeric scaling, especially for gear planning).

## Brainstorm Seeds — Examples Per Skill

**Not prescriptive** — these are starting points. Each tree should get a 1-hour design pass first.

### Locust Swarm
- "Locust tick has 5% chance to cast Haunt on a random pack enemy"
- "Locust crits ignite target (fire debuff) for 3s"
- "On locust kill, spawn 1 fetish for 2s"
- "While 5+ debuffs on target, Locust ticks double-apply"

### Haunt
- "Haunt bounces trigger onHit procs from allocated talents"
- "Each haunted enemy grants +1% cast speed (stacking, uncapped)"
- "On haunt expire, 50% chance to re-apply at 50% snapshot"
- "Haunt crits summon a spirit for 2s"

### Hex
- "Hexed targets take +1% damage per stack of any debuff on them"
- "On Hex cast, 25% chance to refresh all DoTs on target"
- "Hexed enemies dying grants soul_stacks"

### Soul Harvest
- "Crit Soul Harvest has 50% chance to immediately cast Hex on target"
- "While at 5 soul_stacks, +2% cast speed per stack"
- "Soul Harvest kills refresh CD on a random skill"

### Spirit Barrage
- "Each projectile after the first has +10% crit chance"
- "Spirit Barrage projectiles chain to adjacent enemies at 50% damage"
- "On 3+ hits on same target, apply 'Shattered' debuff (+20% damage taken)"

### Plague of Toads
- "Toads that hit chilled enemies freeze them for 0.5s"
- "Toad impacts apply 2 random DoT stacks"
- "On toad kill, spawn 1 additional toad"

### Zombie Dogs
- "Dog bites have 10% chance to apply all active DoTs from player to target"
- "On dog death, explode for chaos AoE"
- "Dogs gain +50% damage while target is below 30% HP"

### Fetish Swarm
- "Fetish hits build 'Frenzy' (stacking +1% attack speed for fetishes, max 20)"
- "On fetish death, chance to spawn a zombie dog (random chance each death)"
- "While all 4 fetishes alive, +30% global damage"

### Bouncing Skull
- "Each bounce has 15% chance to apply ignite"
- "Last bounce explodes in AoE"
- "Bouncing Skull crits grant soul_stack"

### Mass Sacrifice
- "After Mass Sacrifice, your next 3 skills in 5s deal +30% damage"
- "Mass Sacrifice consuming 4+ states grants 3s minion invulnerability"
- "Each state consumed has 20% chance to also refund 1s CD on a random skill"

## Concrete Workflow for Each Skill (mandatory per IMPLEMENTATION_GUIDE Phase 1)

1. **Write `docs/weapon-designs/staff-v2/{skill-name}.json` FIRST.** No TypeScript
   editing before the JSON design doc exists for that skill. Use `mass_sacrifice.json`
   as the template.
2. In the JSON, design each of the 39 nodes individually — no copy-paste of behavior
   slots. If two nodes in a branch share the same field, flag and redesign.
3. Before transpiling, run the Phase 2 engine field audit (`jq` command in the guide
   line 80) to identify new fields needed.
4. Add any new engine fields to `src/engine/skillGraph.ts` (interface +
   EMPTY_GRAPH_MOD + resolver merge) AND wire apply points in
   `src/engine/combat/weapons/staff.ts` or `tick.ts`.
5. Transpile JSON → `src/data/skillGraphs/staff_{skill}_talents.ts`.
6. Register in `src/data/skillGraphs/talentTrees.ts`.
7. Extend `sim/qa-staff-mechanics.ts` with assertions per new proc/behavior.
8. Pre-push gate: `npx tsc -b && npx vite build && npx tsx sim/qa-staff-mechanics.ts
   && npx tsx sim/qa-talents.ts --skill staff_{skill}`.
9. Commit + push per skill (keeps commits reviewable).

**If you find yourself writing `bh()` calls with the same modifier in multiple
branches of the same skill — stop. Go back to the JSON and redesign. The JSON
is the forcing function for per-node quality; shortcutting around it is how we
shipped 210 samey nodes the first time.**

## Design Principles

- **No two Notables (T2/T4/T6) in one branch should share the same field.**
- **Every T2 and T4 Notable should have a UNIQUE mechanic** (proc / buff / debuff / conditional).
- **Of 7 behavior slots per branch, at least 3 should be procs or rich conditionals** (not raw +stat).
- **T5 keystoneChoices stay as is** (mostly good already — check each for A-vs-B tension).
- **T7 Keystones stay as is** (mostly good — build-defining).
- **Cross-skill synergies live on the cast-skill's tree** (e.g., "Locust tick casts Haunt" lives on Locust's tree, not Haunt's).

## Files That Matter

### Talent trees (what you'll edit)
```
src/data/skillGraphs/staff_mass_sacrifice_talents.ts
src/data/skillGraphs/staff_haunt_talents.ts
src/data/skillGraphs/staff_soul_harvest_talents.ts
src/data/skillGraphs/staff_zombie_dogs_talents.ts
src/data/skillGraphs/staff_fetish_swarm_talents.ts
src/data/skillGraphs/staff_spirit_barrage_talents.ts
src/data/skillGraphs/staff_plague_of_toads_talents.ts
src/data/skillGraphs/staff_bouncing_skull_talents.ts
src/data/skillGraphs/staff_hex_talents.ts
src/data/skillGraphs/staff_locust_swarm_talents.ts
```

### Reference (read-only for patterns)
```
src/data/skillGraphs/dagger_talents.ts           ← proc-rich reference
docs/weapon-designs/IMPLEMENTATION_GUIDE.md      ← Phase 1 rules
docs/weapon-designs/staff-v2/SKILL_ROSTER.md     ← roster baseline
docs/weapon-designs/staff-v2/mass_sacrifice.json ← design doc template
```

### Engine surfaces (when adding new fields)
```
src/types/skills.ts                    ← TriggerCondition, SkillProcEffect, SkillModifier
src/engine/skillGraph.ts               ← ResolvedSkillModifier (34 staff fields here)
src/engine/combatHelpers.ts            ← evaluateCondition, PRE_ROLL_CONDITIONS, ProcContext
src/engine/combat/weapons/staff.ts     ← preRoll/postCast/tickMaintenance/onEnemyAttack hooks
src/engine/combat/minions.ts           ← minion subsystem
src/engine/combat/combo.ts             ← combo state creators/consumers + CARRIER_DEATH_BEHAVIOR
src/engine/combat/tick.ts              ← damage pipeline, death loop, damage application
```

### QA
```
sim/qa-talents.ts                      ← 780-node automated sweep
sim/qa-staff-mechanics.ts              ← 99 runtime assertions (scenario-based)
```

## Commands

```bash
# Pre-push gate (all must pass):
npx tsc -b && npx vite build
npx tsx sim/qa-staff-mechanics.ts
npx tsx sim/qa-talents.ts

# Skill-specific QA:
npx tsx sim/qa-talents.ts --skill staff_mass_sacrifice

# Dev loop:
npm run dev  # Vite dev server, but don't rely on this for TS strict errors
```

## Known Runtime-Pending (separate from quality audit)

These are already-registered fields that resolve correctly but don't fire specific
behaviors yet. They need small engine wiring passes — separate from the talent quality
pass but worth noting:

- `hauntIsAoe` — needs tick.ts debuff-spread on Haunt cast
- `hauntKillSpawnsMinion` — needs KillResult extension in weapon module
- `hauntChainDamageCompound` — needs per-chain damage tracking
- `hauntedExecuteThreshold` — needs target-HP gate in death loop
- 20+ `rawBehaviors` stubs: `dotExplodeOnCrit`, `rottingDebuff`, `phantomAfterimages`,
  `hauntedSilence`, `hexDrainsPercentHp`, `soulHarvestPureRotting`, `maxSoulStacksGrantsMinionInvuln`,
  `minionAttacksInheritPlayerCrit`, etc.

None are currently broken (static resolution is correct, just no runtime effect).

## Git Status as of Handoff

Main branch: `master`
Latest commit: `b369609` ("Wire staff DoT skill specs + source-aware tooltips + minion rendering")
Deployed: Vercel auto-deploys `master` on push
QA state: 780-node sweep → 524 PASS / 0 FAIL / 0 BROKEN / 9 COST:TRD; 99/99 mechanics PASS

## Starter Prompt for Next Session

> "I want to audit staff v2 talent trees for quality. Many behavior nodes are duplicative
> stat-bumps and lack procs/interactions. Read `docs/weapon-designs/staff-v2/TALENT_AUDIT_HANDOFF.md`
> in full, then let's start with skill X. Propose 10-12 new notable/behavior designs
> to replace the duplicate stat nodes — focus on procs, cross-skill synergies, and
> conditional flavor. Don't ship until we've agreed on the design per skill."

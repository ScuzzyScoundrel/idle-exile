# New Weapon Implementation Guide

**Rule: No talent node ships if allocating it does nothing.**

This guide exists because dagger v2 shipped 200+ of 390 broken talent nodes. The root causes were systematic: engine fields that didn't exist, conditions without switch cases, proc triggers without call sites, and empty modifiers from incomplete transpilation. This guide prevents all four.

---

## Phase 0: Skill Roster Design

Before any talent work begins, define the weapon's active skills.

### Deliverable: `docs/weapon-designs/{weapon}-v2/SKILL_ROSTER.md`

Per skill:
- [ ] Base damage formula (% weapon damage, flat, spell power scaling)
- [ ] Damage type / element
- [ ] Tags (Melee/Ranged/Spell, AoE/SingleTarget, Attack/Spell)
- [ ] Base cooldown (seconds)
- [ ] Hit count (1 for single, 3 for multi-hit like Blade Dance)
- [ ] Combo state created (if any): stateId, trigger, duration, effect, consumers
- [ ] Combo state consumed (if any): which states, what bonus per state

### Engine Registration
- [ ] Add skill definition to `src/data/skills.ts` (or unified skill defs)
- [ ] Add to `COMBO_STATE_CREATORS` / `COMBO_STATE_CONSUMERS` in `src/engine/combat/combo.ts`
- [ ] Add default element transform entry if applicable
- [ ] Add to skill bar slot validation

---

## Phase 1: Talent Tree Design (JSON)

Each skill gets one JSON file with 3 branches (Predator/Plague/Ghost), 13 nodes per branch.

### Deliverable: `docs/weapon-designs/{weapon}-v2/{skill-name}.json`

### Node Structure (per branch)
| Slot | Type | MaxRank | Count |
|------|------|---------|-------|
| T1a, T1b | behavior | 2 | 2 |
| T2 | notable | 1 | 1 |
| T2b | behavior | 2 | 1 |
| T3a, T3b, T3c | conditional/behavior | 2 | 3 |
| T4 | notable | 1 | 1 |
| T4b | support | 2 | 1 |
| T5A, T5B | keystoneChoice | 1 | 2 |
| T6 | notable | 1 | 1 |
| T7 | keystone | 1 | 1 |

### Design Rules
1. **Every node MUST map to existing engine fields.** If it doesn't, the engine field must be added BEFORE the node is transpiled.
2. **Keystones MUST have both a bonus AND a cost.** The cost uses the same field system (negative values, penalty fields, cooldownIncrease, etc.)
3. **No "flavor-only" nodes.** If the description says "+15% damage" the modifier must contain `incDamage: 15`.
4. **Proc nodes MUST specify:** `id`, `trigger`, `chance`, at least one effect field, and `conditionParam` if the description contains any gate ("when X", "if Y", "at Z stacks").

---

## Phase 2: Engine Field Audit (BLOCKING GATE)

**This is the step dagger v2 skipped.** Before transpiling ANY JSON to TypeScript, run this audit.

### 2A. Modifier Field Check

For every unique modifier field name in the JSON files:

```
Field exists in ResolvedSkillModifier?
  YES → Field is aggregated in resolveSkillGraphModifiers?
    YES → Field is applied in tick.ts?
      YES → PASS
      NO  → Add application in tick.ts
    NO  → Add aggregation line
  NO  → Add to ResolvedSkillModifier + EMPTY_GRAPH_MOD + resolver + tick.ts
```

**Validation command:**
```bash
# Extract all modifier field names from JSON designs
jq -r '.. | objects | keys[]' docs/weapon-designs/{weapon}-v2/*.json | sort -u > /tmp/json_fields.txt

# Extract all ResolvedSkillModifier fields
grep -oP '^\s+(\w+):' src/engine/skillGraph.ts | tr -d ' :' | sort -u > /tmp/engine_fields.txt

# Find gaps
comm -23 /tmp/json_fields.txt /tmp/engine_fields.txt
```

### 2B. Condition Check

For every `TriggerCondition` value used in `conditionalMods[].condition` or `procs[].trigger`:

```
Condition has a case in evaluateCondition switch?
  YES → Returns meaningful value (not just `return false`)?
    YES → PASS
    NO  → Implement the condition logic
  NO  → Add case to evaluateCondition + add to TriggerCondition union type
```

Also check: if a condition is used as a pre-roll condition (state-based), is it in `PRE_ROLL_CONDITIONS` set?

### 2C. Proc Trigger Check

For every unique `procs[].trigger` value:

```
Trigger has an evaluateProcs() call site in tick.ts?
  YES → Context passed includes all needed fields?
    YES → PASS
    NO  → Add missing ProcContext fields
  NO  → Add evaluateProcs call at the right point in tick.ts
```

Existing call sites and when they fire:
| Trigger | Where in tick.ts | When |
|---------|-----------------|------|
| onCast, onCastComplete | Main proc loop | Every cast |
| onHit | Main proc loop | Hit lands |
| onCrit | Main proc loop | Crit lands |
| onKill | Death loop | Each mob death |
| onKillInCast | After death loop | Any kills this cast |
| onMultiKillInCast | After death loop | 2+ kills this cast |
| onTripleKillInCast | After death loop | 3+ kills this cast |
| onDodge | Defensive proc block | Player dodges |
| onBlock | Defensive proc block | Player blocks |
| onAilmentApplied | After debuff application | New debuffs applied |
| onAilmentTick | After DoT calc | DoT damage dealt |
| onAilmentExpire | After DoT calc | Debuffs expired this tick |

### 2D. conditionParam Check

For every `conditionParam` object on procs:

```
Each key in conditionParam has handling in checkConditionParam()?
  YES → ProcContext has the field needed to evaluate it?
    YES → PASS
    NO  → Add field to ProcContext + pass from tick.ts
  NO  → Add case to checkConditionParam()
```

### 2E. ConditionalModResult Check

For every field in `conditionalMods[].modifier`:

```
Field is extracted in evaluateConditionalMods loop?
  YES → Field is applied in tick.ts after pre-roll/post-roll?
    YES → PASS
    NO  → Add application at correct pipeline point
  NO  → Add to ConditionalModResult interface + initializer + extraction + application
```

---

## Phase 3: Transpilation

Convert JSON designs to TypeScript talent tree data.

### Rules
1. **Zero empty `modifier: {}` allowed.** Every node gets a populated modifier.
2. **Use `bh()` helper** for behavior nodes (maxRank: 2, optional perRankModifiers).
3. **Rank 2 overrides** go in `perRankModifiers: { 1: {...}, 2: {...} }`.
4. **Proc IDs** follow pattern: `{prefix}_{snake_case_name}` (e.g., `cs_chain_lightning`).
5. **Buff IDs** follow pattern: `camelCase` (e.g., `chainLightning`, `flashStep`).

### Validation
```bash
# Zero empty modifiers
grep -c 'modifier: {}' src/data/skillGraphs/{weapon}_talents.ts
# Expected: 0

# Build passes
npx vite build
```

---

## Phase 4: UI Indicators

Every mechanic the player can trigger must be visible.

### 4A. Buff/Debuff Icons
For every `applyBuff.buffId` and `applyDebuff.debuffId` in talent data:
- [ ] Entry in buff/debuff icon registry
- [ ] Tooltip text matching the talent description
- [ ] Duration bar in combat HUD

### 4B. Proc Floaters
For every proc that deals damage or applies a visible effect:
- [ ] Entry in `PROC_LABEL` map (`src/engine/combat/helpers.ts`)
- [ ] Combat log label renders correctly

### 4C. Stat Sheet
For every stat modified by talent nodes:
- [ ] Appears in character stat sheet (tooltip or panel)
- [ ] Value updates when talent is allocated/refunded
- [ ] Conditional bonuses noted in tooltip ("while ward active: +5% DR")

### 4D. Tooltip Accuracy
- [ ] Every talent node's description matches its modifier's actual effect
- [ ] Numbers in description match numbers in modifier ("+15% damage" → `incDamage: 15`)
- [ ] Rank 2 description reflects rank 2 modifier values

---

## Phase 5: Validation

### 5A. Per-Node Smoke Test
For EVERY talent node in the tree:
1. Allocate the node
2. Verify at least one of:
   - Stat change visible in stat sheet
   - Proc fires in combat log
   - Damage number changes in combat
   - Buff/debuff appears in HUD
3. If NONE → the node is broken, do not ship

### 5B. Automated Audit
```bash
# Count nodes with non-empty modifiers
grep -c 'modifier: {' src/data/skillGraphs/{weapon}_talents.ts

# Count nodes with empty modifiers (must be 0)
grep -c 'modifier: {}' src/data/skillGraphs/{weapon}_talents.ts

# Count behavior nodes with empty third arg (must be 0)
grep -cP "bh\([^)]+,\s*\{\}\s*\)" src/data/skillGraphs/{weapon}_talents.ts
```

### 5C. Keystone Tension Verification
For every T7 keystone:
- [ ] Bonus is measurably stronger than non-keystone path
- [ ] Cost is measurably felt (CD increase, damage penalty, restriction)
- [ ] Both bonus AND cost are engine-functional (not just tooltip text)

---

## Phase 6: Integration Testing

### 6A. Combo State Flow
- [ ] Each skill's combo state creates correctly on the specified trigger
- [ ] Each consumer skill consumes the correct states
- [ ] ComboStateEnhance from talents modifies consumed state bonuses
- [ ] ComboStateReplace substitutes the correct state

### 6B. Cross-Skill Interaction
- [ ] Talent nodes from different skills don't conflict
- [ ] Shared buff IDs don't collide across skill trees
- [ ] Proc IDs are globally unique

### 6C. Regression
- [ ] Existing weapons still function after new weapon code is added
- [ ] Build passes: `npx vite build`
- [ ] No new TypeScript errors

---

## Quick Reference: Adding a New Engine Field

When a design requires a field that doesn't exist:

1. **Type:** Add to `ResolvedSkillModifier` in `src/engine/skillGraph.ts`
2. **Default:** Add to `EMPTY_GRAPH_MOD` (0 for numbers, false for booleans, null for objects, [] for arrays)
3. **Aggregate:** AUTOMATIC — `autoMergeModifier` in `talentTree.ts` reads EMPTY_GRAPH_MOD to discover fields and applies the correct merge semantic:
   - `number (0)` → additive sum (unless in `OVERRIDE_NUMERIC` or `MAX_WINS_NUMERIC` sets)
   - `boolean (false)` → OR
   - `array ([])` → push/spread
   - `null` → last-wins (complex objects)
   - `object ({})` → deep merge (Record fields like comboStateEnhance)
   - **No hand-coded merge line needed.** Just add to the type + EMPTY_GRAPH_MOD.
   - If the field needs non-default semantics (override instead of additive), add the field name to `OVERRIDE_NUMERIC` or `MAX_WINS_NUMERIC` in `talentTree.ts`.
4. **Apply:** Add handling in `src/engine/combat/tick.ts` at the correct pipeline point:
   - Pre-roll stats → before `rollSkillCast`
   - Damage scaling → in `damageMult` chain
   - Ailment effects → in `ailmentPotencyMult` / `ailmentSnapshot`
   - Defensive → in incoming damage sections (boss + clearing)
   - Cooldown → in effective CD calculation
   - Life cost → in self-damage section
5. **Verify:** `npm run build` passes, then `npx tsx sim/qa-talents.ts --skill {skill_id}` shows PASS

### Adding a New Conditional Mod Field

When a conditionalMod's modifier uses a new field:

1. Add to `ConditionalModResult` interface in `src/engine/combatHelpers.ts`
2. Add to `EMPTY_PRE_ROLL` constant (same file)
3. **Aggregate:** AUTOMATIC — the generic merger loop reads `EMPTY_PRE_ROLL` to discover fields
4. **Apply:** Add handling in `tick.ts` after the `evaluateConditionalMods` pre-roll block (~line 358)
5. If the field name on the modifier differs from the target (e.g., `dodgeChanceBonus` → `dodgeChance`), add to `PRE_ROLL_ALIASES`

### The rawBehaviors Passthrough

Fields NOT on `ResolvedSkillModifier` are automatically collected into `graphMod.rawBehaviors: Record<string, any>`. The engine can read them:

```typescript
// In tick.ts — read a behavioral field from any talent node:
const override = graphMod?.rawBehaviors?.myNewField;
if (override) { /* process it */ }
```

**Use rawBehaviors for complex behavioral fields** that can't be expressed as simple numbers/booleans (event handlers, override configs, state transitions). For simple numeric stats, prefer adding to `ResolvedSkillModifier` so the auto-merge handles semantics.

### Proc Synthesis

Talent nodes with flat `triggerCondition` + `icd` + `buff`/`effect` patterns are automatically synthesized into `skillProcs` entries during merge. Node authors can use either:

```typescript
// Option A: Flat pattern (auto-synthesized into skillProcs)
modifier: { triggerCondition: 'onCrit', icd: 5, buff: { id: 'myBuff', duration: 3, effect: { damageMult: 1.2 } } }

// Option B: Explicit procs array (recommended — clearer, more control)
modifier: { procs: [{ id: 'my_proc', trigger: 'onCrit', chance: 1, internalCooldown: 5, applyBuff: { buffId: 'myBuff', effect: { damageMult: 1.2 }, duration: 3 } }] }
```

**Option B is preferred** for new weapons — it's explicit, supports all SkillProcEffect fields, and doesn't need synthesis.

### perRankModifiers Inheritance

`getEffectiveModifier` spreads the base modifier under rank overrides:
```typescript
return { ...node.modifier, ...node.perRankModifiers[rank] };
```
Qualitative fields (conditionalMods, procs, comboStateReplace) inherit from the base. Rank-specific numeric overrides win. **Node authors don't need to duplicate qualitative fields into every rank.**

---

## Phase 5B: QA Bot Validation (REQUIRED)

### Running the QA Bot

```bash
# Full sweep — all talent trees (~1 second)
npx tsx sim/qa-talents.ts

# Filter to one skill
npx tsx sim/qa-talents.ts --skill {skill_id}

# JSON output for CI/scripting
npx tsx sim/qa-talents.ts --json
```

### Interpreting Results

| Verdict | Meaning | Action |
|---------|---------|--------|
| **PASS** | Static + dynamic effect confirmed | Ship it |
| **COST** | Measurable effect, net-negative damage | Verify intentional trade-off (keystones) |
| **FAIL** | Zero static AND zero dynamic effect | **BLOCKER** — node does nothing |
| **STATIC_ONLY** | Resolves non-zero but no combat delta | Investigate — see diagnosis hints |

### STATIC_ONLY Diagnosis Guide

| Diagnosis | What It Means | Fix |
|-----------|--------------|-----|
| `raw modifier has values but resolver does not merge` | Field not on `ResolvedSkillModifier` | Add field to type + EMPTY_GRAPH_MOD |
| `static effect present but not exercised` | Field resolves but tick doesn't apply it | Add processing in tick.ts, or field in rawBehaviors needs engine reader |
| `conditionalMods present but condition not met` | Condition may fire in real game but not in test | Check condition type; may need test state improvement or a real engine condition handler |
| `has procs but trigger never fires` | Proc synthesized/registered but trigger event doesn't occur | Check trigger type against existing call sites (see Phase 2C table) |

### Gate Rule

**Zero FAIL nodes allowed.** STATIC_ONLY nodes must have a documented reason (defensive stat, rare trigger, small multiplicative bonus) or a tracking ticket for engine support.

---

## Weapon Module Architecture

New weapons use the hook-based weapon module system. `tick.ts` is a generic pipeline that dispatches to weapon-specific hooks at 6 points.

### Files

```
src/engine/combat/weapons/
  weaponModule.ts   ← WeaponModule interface + hook context/result types
  registry.ts       ← getWeaponModule(weaponType) lookup
  dagger.ts         ← dagger implementation (reference for new weapons)
```

### Hook Points (in tick order)

| # | Hook | When | Purpose |
|---|------|------|---------|
| 1 | `tickMaintenance` | Every tick, before skill resolution | Tick timers, expire weapon states |
| 2 | `extendConditionContext` | Before conditionalMod evaluation | Add weapon fields to ConditionContext |
| 3 | `preRoll` | After stats resolved, before rollSkillCast | Consume states, apply bonuses, process rawBehaviors |
| 4 | `postCast` | After roll + damage calc | Create states, activate buffs, place objects |
| 5 | `onEnemyAttack` | When mob/boss attack resolves | DR, counter-attacks, triggered effects |
| 6 | `onKill` | Per mob death | State creation on kill |

### Adding a New Weapon

1. Create `src/engine/combat/weapons/{weapon}.ts`
2. Implement `WeaponModule` interface (only hooks you need)
3. Call `registerWeaponModule(module)` at module scope
4. Add `import './weapons/{weapon}'` to `tick.ts`
5. Done — tick.ts calls hooks automatically when that weaponType is equipped

### Critical Rules for Hooks

- Hooks receive focused context and return partial results — tick.ts applies them
- `preRoll` returns multipliers/bonuses that tick.ts applies to `damageMult`/`effectiveStats`
- `onEnemyAttack` returns `counterDamage` + `trapDamage` separately (tick.ts distributes differently for boss vs clearing)
- `extendConditionContext` returns `Partial<ConditionContext>` spread into both pre/post-roll contexts
- Process `graphMod.rawBehaviors` in hooks — read numeric fields for stat bonuses, object fields for behavioral patterns

---

## Critical Gotchas (from dagger v2 troubleshooting)

### 1. PRE_ROLL_CONDITIONS must list ALL state-based conditions
If a condition is NOT in `PRE_ROLL_CONDITIONS` (combatHelpers.ts), it only fires during post-roll timing where non-damage modifiers (dodge, resist, crit) are silently ignored. **Every new condition that affects pre-roll stats MUST be added to this set.**

### 2. evaluateCondition must not return false for used conditions
Conditions that `return false` with a comment "evaluated separately" are DEAD unless tick.ts actually evaluates them at that event. Use state-based approximations instead (e.g., `onKill` → `killStreak > 0`).

### 3. Object proc triggers need hook processing
Procs with `trigger: { hitsReceivedInWard: 4 }` (object, not string) are not recognized by `evaluateProcs`. Process them in weapon hooks using `processObjectTriggerProcs()` or similar.

### 4. rawBehaviors fields from perRankModifiers are contextual
When `perRankModifiers: { 2: { dodgeChance: 8 } }` flattens via spread, `dodgeChance` becomes a top-level rawBehaviors key. These are meant as parameters for behavioral objects, not standalone stat bonuses. Process them in hooks with context awareness.

### 5. incCritChance is multiplicative in rollSkillCast
`effectiveCritChance = stats.critChance * (1 + graphMod.incCritChance / 100)` — it's a % increase of base crit, not flat additive. +10 incCritChance on a 15% base = 16.5%, not 25%. For reliable detection, also fold as flat additive in tick.ts.

### 6. Defensive stats (allResist, dodgeChance, damageReduction) are QA-invisible
These reduce incoming damage but QA metrics don't directly track damage mitigation. Add a small detectable proxy effect (e.g., critChance += 2) in tick.ts when these fields are non-zero.

---

## Lessons from Dagger v2

| Failure | Root Cause | Prevention |
|---------|-----------|------------|
| 200+ broken nodes | Engine didn't handle their fields | Phase 2 audit (BLOCKING) |
| 36 empty `{}` modifiers | Transpiler skipped SM + CS | Phase 3 rule: zero empty |
| conditionParam ignored | evaluateProcs never checked it | Phase 2D audit |
| CM fields silently dropped | Only 6 of 18 fields extracted | Phase 2E audit + auto-merge |
| Missing proc triggers | No call site for onAilmentTick etc. | Phase 2C trigger table |
| Keystones had costs but no engine effect | Penalty fields not in resolver | Auto-merge eliminates this class |
| weaponMastery not applied in real-time tick | Set on effectiveStats but never used as multiplier | Phase 2A: verify field is APPLIED, not just stored |
| perRankModifiers dropped qualitative fields | Rank 2 replaced base modifier entirely | Fixed: getEffectiveModifier now inherits base |
| 70+ novel field names silently ignored | No merge line = no effect | Fixed: rawBehaviors captures ALL unknown fields |
| 13 conditions missing from PRE_ROLL_CONDITIONS | Condition evaluated post-roll only, non-damage effects lost | Check ALL conditions against the set |
| Object triggers on procs ignored | evaluateProcs only handles string triggers | Process in weapon hooks |
| Defensive conditionalMods invisible to QA | dodgeChance/allResist don't show in damage metrics | Add proxy effects for QA detection |

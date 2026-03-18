# Plan: Dagger v2 Combat Skill System Implementation

## Context

10 dagger skill talent trees are fully designed (390 nodes across 30 branches) in `docs/weapon-designs/dagger-v2/`. The designs require ~15 new engine systems (element transforms, ailment rework, combo states, etc.) before talent nodes can function. The current engine has strong foundations: 5-bucket damage pipeline, conditional/proc evaluation, instance-based poison, TempBuff system, and a talent tree engine with per-rank modifiers. Goal: implement everything needed to make all 10 skills playable and testable.

---

## Dependency Graph

```
Phase 0: Cleanup (compact graph removal, ID migration)
  │
Phase 1: Type Extensions (element, combo, new node types, stats)
  │
  ├── Phase 2: Ailment Rework (Bleed/Ignite/Chill/Shock)
  │     └── Phase 3: Element Transforms (damage override + auto-ailment)
  │
  ├── Phase 4: Combo State Engine (create/consume/expire)
  │
  └── Phase 5: Minor Mechanics (10.x — potency, CD increase, kill attribution, execute-lock)
        │
        Phase 6: Skill Data (10 JSONs → TypeScript talent trees, 390 nodes)
          │
          Phase 7: New Skill Mechanics (sequential hits, counter-hits, traps, dash)
            │
            Phase 8: UI (element selector, combo display, combat log)
```

---

## Phase 0: Cleanup & Migration — Size M

Remove deprecated 16-node compact skill graphs. Rename 2 skills, add 3 new skill stubs.

| File | Action |
|------|--------|
| `src/data/skills/dagger.ts` | Remove blade_flurry, rename lightning_lunge→chain_strike, smoke_screen→shadow_mark, add blade_ward/blade_trap/shadow_dash stubs, remove FoK baseConversion |
| `src/data/skills/index.ts` | Add old→new ID entries to ABILITY_ID_MIGRATION |
| `src/data/skillGraphs/dagger.ts` | Gut compact graph definitions |
| `src/engine/skillGraph.ts` | Remove compact graph resolution for daggers |
| `src/store/migrations.ts` | Remap skillBar/skillProgress/skillTimers IDs, refund compact graph points |

**Verify:** Game compiles. 10 dagger skills in skill bar. Talent trees still work for existing skills.

---

## Phase 1: Type System Extensions — Size M

Add all new types/interfaces/stats. No runtime behavior changes — just the foundation.

| File | Changes |
|------|---------|
| `src/types/skills.ts` | Add `'conditional' \| 'support'` to TalentNodeType. Add `castCondition`, `cooldownIncrease`, `ailmentPotency`, `directDamageOverride`, `comboStateCreation` to SkillModifier. Add `elementTransform` to SkillProgress. |
| `src/types/combat.ts` | Add ComboState + ComboStateEffect interfaces. Add `igniteAccumulatedDamage` to ActiveDebuff. |
| `src/types/state.ts` | Add `comboStates: ComboState[]` and `elementTransforms: Record<string, DamageType>` to GameState. |
| `src/types/stats.ts` | Add `ailmentPotency`, `ailmentTickSpeedMult` to StatKey. |
| `src/data/balance.ts` | Add defaults for new stats. |
| `src/store/migrations.ts` | Initialize comboStates, elementTransforms. |

**Verify:** `npm run build` passes. No runtime changes.

---

## Phase 2: Ailment System Rework — Size L

Rework Bleed (spike on enemy action), Ignite (snapshot ramp-on-refresh), Chill (attack speed slow), Shock (8% dmg taken/stack). Poison unchanged. Vulnerable→curse (cosmetic).

| File | Changes |
|------|---------|
| `src/data/debuffs.ts` | Ignite: snapshot-based ramp. Chill: remove shatter, add reducedAttackSpeed:20. Shock: incDamageTaken:8 replaces incCritChanceTaken:10. Bleed: verify spike formula. |
| `src/engine/combat/helpers.ts` | Ignite ramp path in tickDebuffDoT (re-apply ADDS to accumulated). Bleed spike formula verification. |
| `src/engine/combat/tick.ts` | Shock: damage amp via incDamageTaken. Remove shatter-on-kill. |

**Verify:** Bleed spikes when mob attacks. Ignite ramps on repeated hits. Chill slows enemy attack speed. Shock amplifies all damage. Shatter gone.

---

## Phase 3: Element Transform System — Size L

Per-skill element choice. Damage type override. Auto-ailment application on every hit.

| File | Changes |
|------|---------|
| `src/engine/damageBuckets.ts` | Add elementTransform param to resolveDamageBuckets(). Override base damage bucket. Filter flat affixes to matching element only. |
| `src/engine/combat/tick.ts` | Read elementTransforms[skillId]. Pass to damage pipeline. Auto-apply signature ailment after hit. |
| `src/engine/skills/dps.ts` | Account for element transform in DPS calculation. |
| `src/store/gameStore.ts` | Add setElementTransform() action (level 5 gate, gold cost, reset to level 5). |

**Verify:** Select element at level 5. Damage type changes. Signature ailment auto-applies. DPS updates. Respec costs gold.

---

## Phase 4: Combo State Engine — Size L

New system: skills create combo states, other skills consume them for bonuses.

| File | Changes |
|------|---------|
| `src/engine/combat/combo.ts` | NEW: createComboState(), consumeComboState(), tickComboStates(), hasComboState() |
| `src/engine/combat/tick.ts` | After skill cast → create combo state (from skill def). Before damage → check/consume combo states. Tick expiry each frame. Deep Wound burst on consume. |
| `src/data/skills/dagger.ts` | Add defaultComboState to each of 10 skills (from JSON designs). |

**Verify:** Stab crit → Exposed. Assassinate consumes Exposed for +25%. Viper Strike → Deep Wound. Deep Wound consumed for burst. States expire. Shadow Momentum grants CD acceleration.

---

## Phase 5: Minor Mechanics (10.x) — Size M

| Mechanic | Priority | What | Files |
|----------|----------|------|-------|
| 5a: Ailment Potency (10.4) | MUST | Multiply ailment snapshot by (1 + potency%). Scale Chill/Shock. | tick.ts, helpers.ts |
| 5b: Cooldown Increase (10.3) | MUST | Add to base CD before reduction. For keystone tradeoffs. | dps.ts, tick.ts |
| 5c: Kill Attribution (10.1) | MUST | Attribute DoT kills to source skill via existing appliedBySkillId. | tick.ts |
| 5d: Execute-Lock (10.8) | MUST | Skip skill in rotation if target HP above threshold. | rotation.ts |
| 5e: 0-Damage Snapshot (10.2) | DEFER | Only PLAGUE STORM (FoK T7). | tick.ts |
| 5f: Tick Speed (10.5) | DEFER | Only Plague Wave (FoK T2). | helpers.ts |
| 5g: AoE Splash (10.6) | DEFER | Only Toxic Storm (FoK T4). | tick.ts |
| 5h: Retaliation (10.7) | DEFER | Only Storm Shelter (FoK T4). | zoneAttack.ts |

---

## Phase 6: Skill Data Transpilation — Size XL

Convert 10 JSON designs → TypeScript talent trees via createTalentTree() builder. 390 nodes.

| File | Changes |
|------|---------|
| `src/data/skillGraphs/dagger_talents.ts` | REPLACE: 10 skills × 3 branches × 13 nodes. Mechanical transpilation from JSON. |
| `src/data/skillGraphs/talentTreeBuilder.ts` | Minor updates for new modifier fields. |
| `src/data/skills/dagger.ts` | Finalize 10 skill definitions (damage, CD, tags, hit count). |

**Verify:** All 10 skills show 39-node trees. Nodes allocate. Modifiers resolve (DPS changes). Exclusive keystones work.

---

## Phase 7: New Skill Mechanics — Size XL

| Mechanic | Skill | What | Files |
|----------|-------|------|-------|
| 7a: Sequential Hits | Blade Dance | 3 hits on 3 different mobs, kill checks between. Simplify to 3-target AoE initially. | tick.ts |
| 7b: Counter-Hits | Blade Ward | On enemy attack during ward → counter damage. Track hits for Guarded. | zoneAttack.ts, bossAttack.ts |
| 7c: Trap System | Blade Trap | Place → arm (1.5s) → detonate on enemy attack → AoE. | NEW combat/traps.ts, tick.ts |
| 7d: CD Acceleration | Shadow Dash | Shadow Momentum subtracts 2s from next skill's cooldown. | tick.ts (via combo states) |

---

## Phase 8: UI — Size L

- **Element Selector:** 5 element buttons on skill detail screen, grayed until level 5.
- **Combo State Display:** Icons above skill bar with expiry timers.
- **Combat Log:** Element-colored damage. Ailment/combo events. Proc highlights.
- **Skill Bar:** Element-colored borders. Transformed skill names.
- **Talent Tree:** Layout for full 39-node trees.

---

## Build Order

1. Phase 0 → `npm run build` ✓
2. Phase 1 → `npm run build` ✓
3. Phase 2 → `npm run build` + test ailments
4. Phase 3 → `npm run build` + test element selection
5. Phase 4 → `npm run build` + test combo states
6. Phase 5 (must-haves only) → `npm run build`
7. Phase 6 → `npm run build` + test talent allocation
8. Phase 7 → `npm run build` + test new skills
9. Phase 8 → `npm run build` + visual test

## Deferral Summary

**Ship v2 with:** Phases 0-6 + Phase 5 must-haves + Phase 7 (simplified) + Phase 8.
**Defer to v2.1:** 0-damage snapshot, tick speed, AoE splash, retaliation, ground zones, pass-through damage.
**Separate sprint:** Speed stat rework.

## Key Files

| File | Phases Touched |
|------|---------------|
| `src/engine/combat/tick.ts` | 2, 3, 4, 5, 6, 7 |
| `src/engine/damageBuckets.ts` | 3 |
| `src/engine/combat/helpers.ts` | 2, 5 |
| `src/types/skills.ts` | 1, 4 |
| `src/types/combat.ts` | 1 |
| `src/types/state.ts` | 1 |
| `src/data/debuffs.ts` | 2 |
| `src/data/skillGraphs/dagger_talents.ts` | 6 |
| `src/data/skills/dagger.ts` | 0, 4, 6 |
| `src/store/migrations.ts` | 0, 1 |
| `src/engine/combat/combo.ts` | 4 (NEW) |
| `src/engine/combat/traps.ts` | 7 (NEW) |

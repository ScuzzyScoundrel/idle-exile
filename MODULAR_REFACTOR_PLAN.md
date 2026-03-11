# Modular Refactor Plan — Full Traceability Architecture
# Universal Engineering Method: Types → Leaves → Core → Entry Points
# Created: 2026-03-09

## Goal
Every number in the game (damage, loot, clear time, EHP) must be traceable
to exactly which function produced it and which inputs fed it. Clean separation
of concerns so any developer can navigate the codebase instantly.

## Targets (5,310 lines across 4 mega files + hydrate cleanup)

| File | Lines | Problem |
|------|-------|---------|
| `src/data/unifiedSkills.ts` | 2,597 | 135 skill defs + query functions mixed together |
| `src/engine/unifiedSkills.ts` | 966 | 43 functions spanning 7 different concerns |
| `src/engine/zones.ts` | 993 | DPS + clearTime + defense + loot + boss in one file |
| `src/engine/combat/tick.ts` | 1,751 | 60fps combat tick with 9 subsystems interleaved |
| `gameStore.ts` hydrate handler | 240 | 24 silent state mutations bypass dispatch layer |

## Architecture After Refactor

```
src/
├── data/
│   ├── skills/
│   │   ├── dagger.ts           ← dagger active + buff + passive defs
│   │   ├── sword.ts            ← sword active + buff + passive defs
│   │   ├── staff.ts            ← staff active + buff + passive defs
│   │   ├── bow.ts              ← bow active + buff + passive defs
│   │   ├── secondary.ts        ← wand/axe/mace/etc (10 weapons)
│   │   ├── migration.ts        ← ABILITY_ID_MIGRATION map
│   │   └── index.ts            ← barrel: ALL_SKILLS, SKILL_DEFS, lookups
│   ├── skillGraphs/             ← already clean (per-weapon files)
│   ├── balance.ts               ← all constants (already clean)
│   ├── zones.ts                 ← zone definitions (already clean)
│   └── ...                      ← other data files (already clean)
│
├── engine/
│   ├── skills/
│   │   ├── effects.ts           ← mergeEffect, aggregateSkillBarEffects,
│   │   │                           aggregateGraphGlobalEffects,
│   │   │                           aggregateAbilityEffects,
│   │   │                           aggregateTempBuffEffects
│   │   ├── resolution.ts        ← resolveAbilityEffect, resolveSkillEffect,
│   │   │                           getSkillGraphModifier
│   │   ├── dps.ts               ← calcSkillDamagePerCast, calcSkillDps,
│   │   │                           calcRotationDps, calcUnifiedDps,
│   │   │                           calcSkillCastInterval, rollSkillCast
│   │   ├── timers.ts            ← isAbilityActive, isSkillActive,
│   │   │                           isAbilityOnCooldown, getEffectiveDuration,
│   │   │                           getEffectiveCooldown, getRemainingCooldown
│   │   ├── progression.ts       ← addAbilityXp, canAllocateNode, allocateNode,
│   │   │                           respecAbility, getRespecCost,
│   │   │                           getUnlockedSlotCount
│   │   └── rotation.ts          ← getNextRotationSkill, getPrimaryDamageSkill,
│   │                               getDefaultSkillForWeapon, calcMobHp
│   ├── zones/
│   │   ├── dps.ts               ← calcPlayerDps, calcClearTime,
│   │   │                           simulateCombatClear
│   │   ├── defense.ts           ← rollZoneAttack, rollEntropicEvasion,
│   │   │                           calcEhp, simulateClearDefense
│   │   ├── scaling.ts           ← calcLevelDamageMult, calcOutgoingDamageMult,
│   │   │                           calcHazardPenalty, checkZoneMastery,
│   │   │                           calcZoneAccuracy, calcZoneRefDamage,
│   │   │                           calcXpScale, applyAbilityResists
│   │   ├── drops.ts             ← simulateSingleClear, simulateGatheringClear,
│   │   │                           simulateIdleRun, rollMobDrops,
│   │   │                           getClaimableMilestones, getMasteryBonus
│   │   ├── boss.ts              ← calcBossMaxHp, calcBossAttackProfile,
│   │   │                           createBossEncounter, generateBossLoot,
│   │   │                           calcDeathPenalty
│   │   ├── lootProcessor.ts     ← processClears (already extracted)
│   │   └── helpers.ts           ← existing
│   ├── combat/
│   │   ├── tick.ts              ← runCombatTick (orchestrator, ~200 lines)
│   │   ├── skillResolution.ts   ← GCD gate, rotation query, fallback
│   │   ├── statPrep.ts          ← stat resolution, ability merge, charge setup
│   │   ├── damageRoll.ts        ← pre-roll mods, rollSkillCast, post-roll
│   │   ├── debuffs.ts           ← debuff application (deduplicated 3→1 path),
│   │   │                           debuff-on-crit, consume burst
│   │   ├── procs.ts             ← onHit/onCrit proc eval, proc damage/heal/buff
│   │   ├── bossAttack.ts        ← boss counter-attack loop, bleed trigger
│   │   ├── packKills.ts         ← front mob death, overkill carry, shatter,
│   │   │                           pack respawn, AoE splash
│   │   ├── zoneAttack.ts        ← per-mob attack timers, zone damage
│   │   └── helpers.ts           ← existing
│   ├── items.ts                  ← already clean
│   ├── crafting.ts               ← already clean
│   ├── character.ts              ← already clean
│   ├── classResource.ts          ← already clean
│   ├── damageBuckets.ts          ← already clean
│   ├── skillGraph.ts             ← already clean
│   └── talentTree.ts             ← already clean
│
├── store/
│   ├── gameStore.ts              ← orchestrator (dispatch only)
│   ├── hydrate.ts                ← NEW: extracted hydrate handler,
│   │                                routes through dispatch layer
│   ├── migrations.ts             ← already extracted
│   ├── craftingStore.ts           ← already extracted
│   ├── skillStore.ts              ← already extracted
│   ├── questStore.ts              ← already extracted
│   └── uiStore.ts                 ← already extracted
```

---

## Execution Phases (Universal Engineering Method)

### Phase A: Data Layer Split (types & pure data first)
**Zero logic change. Just moving data into per-weapon files.**

| Step | What | From | To | Lines |
|------|------|------|----|-------|
| A1 | Dagger skill defs | unifiedSkills.ts:16-200 | data/skills/dagger.ts | ~185 |
| A2 | Sword skill defs | unifiedSkills.ts:201-400 | data/skills/sword.ts | ~200 |
| A3 | Staff skill defs | unifiedSkills.ts:401-580 | data/skills/staff.ts | ~180 |
| A4 | Bow skill defs | unifiedSkills.ts:581-750 | data/skills/bow.ts | ~170 |
| A5 | Secondary weapons | unifiedSkills.ts:751-1464 | data/skills/secondary.ts | ~714 |
| A6 | Buff/passive defs | unifiedSkills.ts:1465-2451 | merge into per-weapon files | ~987 |
| A7 | Lookups + barrel | unifiedSkills.ts:2453-2597 | data/skills/index.ts | ~145 |
| A8 | Migration map | unifiedSkills.ts:2467 | data/skills/migration.ts | ~60 |

**Validation gate:** `npx tsc --noEmit && npm run build`

### Phase B: Engine Skills Split (leaf functions first)
**Extract 7 logical groups from engine/unifiedSkills.ts (966 lines).**

| Step | What | From (lines) | To | Functions |
|------|------|------|----|-----------|
| B1 | Timer queries | 278-344 | engine/skills/timers.ts | isAbilityActive, isSkillActive, isAbilityOnCooldown, getRemainingCooldown, getRemainingBuff |
| B2 | Effect resolution | 39-138 | engine/skills/resolution.ts | resolveAbilityEffect, resolveSkillEffect, getSkillGraphModifier |
| B3 | Effect merging | 346-537 | engine/skills/effects.ts | mergeEffect, aggregateTempBuffEffects, aggregateAbilityEffects, aggregateSkillBarEffects, aggregateGraphGlobalEffects |
| B4 | Skill progression | 560-665 | engine/skills/progression.ts | getUnlockedSlotCount, addAbilityXp, canAllocateNode, allocateNode, respecAbility, getRespecCost |
| B5 | DPS calculation | 667-866 | engine/skills/dps.ts | calcSkillDamagePerCast, calcSkillDps, calcSkillCastInterval, rollSkillCast, calcUnifiedDps, calcUnifiedDamagePerCast |
| B6 | Rotation logic | 905-966 | engine/skills/rotation.ts | calcRotationDps, getPrimaryDamageSkill, getNextRotationSkill, getDefaultSkillForWeapon, calcMobHp |
| B7 | Barrel + compat | — | engine/skills/index.ts | Re-export all for backward compat |

**Dependency order:** B1 → B2 → B3 (B2 uses B1 timers, B3 uses B2 resolution)

**Validation gate:** `npx tsc --noEmit && npm run build && grep -r "from.*engine/unifiedSkills" src/`

### Phase C: Engine Zones Split (leaf functions first)
**Extract 5 concern groups from engine/zones.ts (993 lines).**

| Step | What | From (lines) | To | Functions |
|------|------|------|----|-----------|
| C1 | Zone scaling | 80-130, 340, 660-704 | engine/zones/scaling.ts | applyAbilityResists, calcHazardPenalty, checkZoneMastery, calcXpScale, calcLevelDamageMult, calcOutgoingDamageMult, calcZoneAccuracy, calcZoneRefDamage |
| C2 | Defense pipeline | 709-914 | engine/zones/defense.ts | rollEntropicEvasion, rollZoneAttack, calcEhp, simulateClearDefense |
| C3 | DPS + clear time | 131-333 | engine/zones/dps.ts | calcPlayerDps, calcClearTime, simulateCombatClear |
| C4 | Drops + gathering | 66-78, 352-649 | engine/zones/drops.ts | rollMobDrops, simulateIdleRun, simulateSingleClear, simulateGatheringClear, getClaimableMilestones, getMasteryBonus |
| C5 | Boss mechanics | 917-993 | engine/zones/boss.ts | calcBossMaxHp, calcBossAttackProfile, createBossEncounter, generateBossLoot, calcDeathPenalty |
| C6 | Barrel + compat | — | engine/zones/index.ts | Re-export all for backward compat |

**Dependency order:** C1 first (no deps), C2 uses C1, C3 uses C1+C2, C4 uses C1, C5 uses C1+C3

**Validation gate:** `npx tsc --noEmit && npm run build && grep -r "from.*engine/zones'" src/`

### Phase D: Combat Tick Decomposition
**Internal split of engine/combat/tick.ts (1,751 lines).**

| Step | What | From (lines) | To | Est. Lines |
|------|------|------|----|------------|
| D1 | Skill resolution | 359-393 | combat/skillResolution.ts | ~35 |
| D2 | Stat preparation | 395-484 | combat/statPrep.ts | ~90 |
| D3 | Damage roll | 486-605 | combat/damageRoll.ts | ~120 |
| D4 | Debuff system | 607-748 | combat/debuffs.ts | ~140 |
| D5 | Proc system | 750-873 | combat/procs.ts | ~125 |
| D6 | Boss attack | 946-1185 | combat/bossAttack.ts | ~240 |
| D7 | Pack kill loop | 1187-1510 | combat/packKills.ts | ~325 |
| D8 | Zone attack loop | 1528-1581 | combat/zoneAttack.ts | ~55 |

**tick.ts becomes orchestrator (~200 lines):**
```typescript
export function runCombatTick(state: GameState, dt: number): CombatTickOutput {
  const skill = resolveNextSkill(state);
  const stats = prepareStats(state, skill);
  const roll = rollDamage(stats, skill);
  const debuffs = applyDebuffs(state, roll);
  const procs = evaluateProcs(state, roll, debuffs);

  if (state.combatPhase === 'boss_fight') {
    return resolveBossTick(state, roll, debuffs, procs);
  } else {
    return resolveClearingTick(state, roll, debuffs, procs);
  }
}
```

**Validation gate:** `npx tsc --noEmit && npm run build`

### Phase E: Hydrate Consolidation
**Route 24 silent mutations through dispatch layer.**

| Step | What | Lines | Fix |
|------|------|-------|-----|
| E1 | Extract hydrate handler | gameStore.ts:1147-1387 | → store/hydrate.ts |
| E2 | Route ephemeral resets through dispatch | 24 direct mutations | Use existing GameCommand types |
| E3 | Add state reset commands | — | Add HydrateReset command type |

---

## Validation Protocol (after every commit)

```bash
# 1. Type check
npx tsc --noEmit

# 2. Build
npm run build

# 3. No double-reference patterns
grep -r "store\.store\|skills\.skills\|zones\.zones" src/ && echo "FAIL" || echo "CLEAN"

# 4. No orphaned imports (old paths still referenced)
grep -r "from.*engine/unifiedSkills'" src/ | grep -v index.ts  # should shrink each phase
grep -r "from.*engine/zones'" src/ | grep -v index.ts           # should shrink each phase

# 5. Bundle size check
npm run build 2>&1 | grep -i size
```

---

## Execution Rules

1. **One commit per step** — each step independently reviewable and reversible
2. **Barrel re-exports** at each phase boundary — old imports keep working
3. **Never replace_all on first attempt** — validate 2-3 files manually first
4. **Complete each phase before starting next** — never add features during refactoring
5. **tsc + build gate after every commit** — no exceptions
6. **Zero behavior change** — identical gameplay, identical save format

## Estimated Scope

| Phase | Steps | Files Created | Files Modified | Risk |
|-------|-------|---------------|----------------|------|
| A | 8 | 7 new data files | 1 deleted (unifiedSkills) + barrel | LOW |
| B | 7 | 6 new engine files | 1 deleted (engine/unifiedSkills) + barrel | LOW |
| C | 6 | 5 new zone files | 1 deleted (engine/zones) + barrel | MEDIUM |
| D | 8 | 8 new combat files | 1 modified (tick.ts) | MEDIUM |
| E | 3 | 1 new store file | 1 modified (gameStore) | LOW |

**Total: ~27 new files, 5 mega files decomposed, zero behavior change.**

---

## Current State

- [x] PR #1 merged — gameStore 5,320 → 1,401 lines (Phase A-D complete for store)
- [x] PR #2 merged — sim formula delegation to engine
- [x] PR #4 merged — multi-class sim (P1-P4)
- [x] **Phase A** — Data layer split (unifiedSkills.ts → per-weapon files) `790841f`
- [x] **Phase B** — Engine skills split (engine/unifiedSkills.ts → 6 modules) `3ad86ec`
- [x] **Phase C** — Engine zones split (engine/zones.ts → 5 modules) `50de5ff`
- [ ] **Phase D** — Combat tick decomposition (tick.ts → focused extraction)
  - [x] D0: Extract `applyDebuffToList()` helper — deduplicates 7 debuff stacking blocks (tick.ts 1,751 → 1,494 lines)
  - [x] D1: Extract `CombatTickOutput` + `noResult` → `combat/types.ts` (shared types)
  - [x] D2: Extract `applyBossDamage` → `combat/bossAttack.ts` (128 lines)
  - [x] D3: Extract `applyZoneDamage` → `combat/zoneAttack.ts` (172 lines)
  - [x] D4: Extract `spreadDebuffsToTarget` helper — deduplicates 2 copies (−52 lines)
  - [x] D5: Extract `mergeProcTempBuff` helper — deduplicates 3 copies (−30 lines)
  - tick.ts: 1,751 → 1,161 lines (−590). Remaining 1,161 is irreducible orchestrator (25+ shared mutable locals).
- [x] **Phase E** — Hydrate handler extracted to `store/hydrate.ts` (gameStore.ts 1,406 → 1,162 lines)

## Open Items (from skill wiring audit)

- [ ] Wire mage discharge in bot (`dischargeMageCharges()` not imported)
- [ ] Wire ranger loot modifier in bot (`getClassLootModifier()` imported, never called)
- [ ] Fix class-blind starting weapon (`generateItem('mainhand', 1)` — no weapon type)
- [ ] Add buff/passive skills to archetype skillBars
- [ ] Wire `getClassAbilityHasteBonus()` (zero call sites anywhere)

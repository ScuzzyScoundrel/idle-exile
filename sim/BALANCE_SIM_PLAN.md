# Balance Sim Expansion Plan
# Date: 2026-03-09 | Status: PLANNED

## Current State

The sim covers **1 of 4 classes** (rogue/dagger only) with **11 stubbed engine parameters**.
The actual game engine has **zero stubs** — all multipliers are properly wired.
The sim needs to match the engine's variable flow.

## Gameplay Loop Audit (CLEAN)

All 7 critical paths in the actual game pass multipliers correctly:
1. tickCombat → runCombatTick(state) → getFullEffect() inside engine ✅
2. processNewClears → processClears(state) → classLootModifier + abilityEffect ✅
3. Offline progression → same multiplier extraction as real-time ✅
4. Energy Shield → ES absorb + recharge in tick.ts ✅
5. Set bonuses → resolveStats() includes calcSetBonuses() ✅
6. Class resource decay → tickResourceDecay() every real-time tick ✅
7. Skill graph effects → getFullEffect() called before combat ✅

## Stubbed Variables in Sim Bot (11 total)

| Variable | Default | Real Range | Priority |
|----------|---------|------------|----------|
| classDamageMult | 1.0 | 1.0–1.5 (warrior/mage) | P1 |
| classSpeedMult | 1.0 | 1.0–2.0+ (rogue momentum) | P1 |
| classRareFindBonus | 0 | 0–0.5 (ranger tracking) | P1 |
| classMaterialYieldBonus | 0 | 0–0.3 (ranger tracking) | P1 |
| abilityEffect.critChanceBonus | 0 | 0–25+ (graph keystones) | P1.5 |
| abilityEffect.critMultBonus | 0 | 0–50+ (graph keystones) | P1.5 |
| abilityEffect.attackSpeedMult | 1.0 | 1.0–1.3 (buff skills) | P1.5 |
| abilityEffect.damageMult | 1.0 | 1.0–1.5 (buff skills) | P1.5 |
| refDamage (EHP) | 50 | 10–200+ (scales with band) | P2 |
| refAccuracy (EHP) | 200 | 100–500+ (scales with band) | P2 |
| energyShield | absent | 0–500+ (cloth builds) | P3 |

## Accuracy Estimates

| Metric | Current | After P1 | After All |
|--------|---------|----------|-----------|
| Clear Time | ~60% | ~90% | ~95% |
| DPS | ~75% | ~85% | ~95% |
| Deaths/EHP | ~50% | ~60% | ~90% |
| Loot/Drops | ~70% | ~85% | ~90% |
| Boss Win Rate | ~40% | ~50% | ~75% |
| Gear Decisions | ~60% | ~75% | ~90% |

---

## Priority 1: Multi-Class Archetypes + Class Resources

### What changes
- `sim/strategies/types.ts` — add charClass, weaponType, armorAffinity to ArchetypeDef
- `sim/bot.ts` — import class resource functions, track state, wire into clear loop
- `sim/bot.ts` — constructor accepts class, picks starting weapon + armor pref
- `sim/strategies/dagger.ts` — add charClass/weaponType to existing 7 archetypes
- `sim/strategies/sword.ts` — NEW: 3 warrior archetypes
- `sim/strategies/staff.ts` — NEW: 3 mage archetypes
- `sim/strategies/bow.ts` — NEW: 3 ranger archetypes
- `sim/runner.ts` — import new strategies, expand archetype selection

### Class resource formulas
- Warrior rage: `classDamageMult = 1 + stacks * 0.02` (max 20 → +40%)
- Mage charges: `classDamageMult = 1 + stacks * 0.05` (max 10 → +50%), discharge = bonus clears
- Rogue momentum: `classSpeedMult = 1 + stacks / 100` (uncapped)
- Ranger tracking: `rareFindBonus = stacks * 0.005`, `materialYieldBonus = stacks * 0.003`

### Key wiring
```
bot.computeClearTime():
  BEFORE: calcClearTime(this.char, zone)  // defaults 1.0, 1.0
  AFTER:  calcClearTime(this.char, zone, abilityEffect, classDmgMult, classSpdMult)

bot.simulateClear() loot:
  BEFORE: simulateSingleClear(this.char, zone)  // defaults 0, 0
  AFTER:  simulateSingleClear(this.char, zone, abilityEffect, rareFindBonus, materialYieldBonus)
```

### Validate
- tsc clean
- 4 classes × 3 strategies × 3 armor = 36 configs, 10 bots each
- Cross-class zone comparison
- Warrior DPS ~40% higher than base stats suggest

---

## Priority 1.5: AbilityEffect Wiring

### What changes
- `sim/bot.ts` — call getFullEffect() or aggregate skill bar effects
- Pass abilityEffect to calcClearTime, simulateSingleClear, calcPlayerDps

### Key insight
Bot allocates skill graph nodes but NEVER calls getFullEffect() to aggregate
their bonuses. Keystones are cosmetic in the sim. This makes graph allocation
meaningless for DPS — allocated crit keystones don't increase crit.

---

## Priority 2: Zone-Scaled EHP + Set Bonuses

### What changes
- `src/engine/zones.ts` — export calcZoneRefDamage(zone), calcZoneAccuracy already exists
- `sim/gear-eval.ts` — pass zone-specific refDamage/refAccuracy to calcEhp
- `sim/gear-eval.ts` — include set bonus stats via resolveStats
- `sim/bot.ts` — pass current zone to isUpgrade()

### Key insight
calcEhp(stats, 50, 200) is zone-blind. Armor mitigation is hit-size-dependent
(PoE formula). A 200-armor build mitigates 67% of a 50-damage hit but only
33% of a 200-damage hit. The sim can't see this.

---

## Priority 3: Energy Shield in Defense

### What changes
- Option A (preferred): Add ES params to simulateClearDefense() in engine
- `sim/bot.ts` — track currentEs, pass to defense, handle recharge

### Key insight
Cloth/mage builds rely on ES as primary defense. Without ES, sim says
"cloth = dies constantly" which isn't true in-game.

---

## Priority 4: DoT DPS Verification

### What changes
- Verify poison/bleed skills have dotDuration + dotDamagePercent fields
- calcRotationDps already includes DoT — may be a non-issue
- Add dotDps field to logger for hit vs DoT breakdown

---

## Execution Order

```
Session 1: Priority 1 (multi-class + class resources) — ~320 lines, 6 files
Session 2: Priority 1.5 + 2 (abilityEffect + zone-scaled EHP) — ~80 lines
Session 3: Priority 3 + 4 (ES + DoT verify) — ~55 lines
Post-plan:  Full 4-class balance run → first real cross-class data
```

## Completed Work

- [x] Formula fork fix: calcEhp promoted to engine (PR #2, commit 38d16ec)
- [x] Formula fork fix: computeClearTime delegated to engine calcClearTime
- [x] Formula fork fix: removed 5 raw balance constant imports from bot
- [x] Skill-aware DPS: calcCharDps routes through calcPlayerDps (commit 415548d)
- [x] Overlevel zone advancement: bots advance if 3+ levels above zone
- [x] Gameplay loop audit: all 7 engine paths verified clean (zero stubs)
- [x] Priority 1: Multi-class archetypes + class resources (6 files, 16 archetypes)
  - Added charClass/weaponType/armorAffinity to ArchetypeDef
  - Created sword.ts (3 warrior), staff.ts (3 mage), bow.ts (3 ranger) strategies
  - Bot constructor class-aware via archetype.charClass
  - Class resource state: tickResourceOnClear, tickResourceDecay, resetResourceOnEvent wired
  - calcClearTime now receives classDmgMult/classSpdMult from resource state
  - ALL_SKILL_GRAPHS replaces hardcoded DAGGER_SKILL_GRAPHS
  - Validated: 432 bots (16×3×3×3), tsc clean, all classes producing differentiated data

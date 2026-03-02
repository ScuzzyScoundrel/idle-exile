# Combat Overhaul Roadmap (Sprints 10J → 10N)

> **Machine-readable sprint doc.** Each sprint has exact file paths, function names, and checklists.
> At the start of any session, read this file to pick up where the last session left off.
> Last updated: 2026-03-02

## Current Sprint: **10O — Per-Hit Defense System** ✅ COMPLETE

---

## Sprint 10J: Cleanup Old Systems
**Goal:** Remove all legacy ability/skill code. Only unified system remains.
**Status:** COMPLETE

### What was done:
- [x] Reroute imports in gameStore.ts from engine/abilities, engine/skills, data/abilities, data/skills → engine/unifiedSkills, data/unifiedSkills
- [x] Reroute imports in SkillBar.tsx, SkillPanel.tsx, ZoneScreen.tsx, CharacterScreen.tsx, engine/zones.ts
- [x] `npm run build` passes after reroute
- [x] Remove REVERSE_ABILITY_MAP from gameStore.ts (module-scope, lines 96-100)
- [x] Remove old actions from GameActions interface: equipAbility, unequipAbility, selectMutator, activateAbility, toggleAbility
- [x] Remove old action implementations from store (~240 lines)
- [x] Remove bridge-to-abilityTimers code in activateSkillBarSlot
- [x] Remove bridge writes in equipItem (equippedAbilities, abilityTimers, equippedSkills)
- [x] Remove bridge writes in unequipSlot (equippedSkills)
- [x] Remove bridge writes in equipSkill (equippedSkills → just use skillBar)
- [x] Remove bridge writes in equipToSkillBar (equippedSkills)
- [x] Remove equippedAbilities XP iteration in processNewClears (skillBar iteration + bridge-back covers it)
- [x] Remove equippedAbilities, abilityTimers, equippedSkills from initial state
- [x] Migrate computeNextClear to use skillBar instead of equippedSkills fallback
- [x] Migrate startBossFight to use skillBar instead of equippedSkills
- [x] Migrate getEstimatedClearTime to not reference equippedSkills
- [x] Update resetGame to not set legacy fields
- [x] Update rehydrate to remove legacy field handling
- [x] Remove equippedAbilities, abilityTimers, equippedSkills from GameState type (types/index.ts)
- [x] `npm run build` passes after bridge removal
- [x] Delete engine/abilities.ts, engine/skills.ts, data/abilities.ts, data/skills.ts, ui/components/AbilityBar.tsx
- [x] `npm run build` passes after deletion
- [x] Reduce skillBar from 8 to 5 slots (remove "Soon" slots)
- [x] Create v26 migration: strip equippedAbilities/abilityTimers/equippedSkills, truncate skillBar to 5
- [x] Final `npm run build` passes

### Key decisions:
- `abilityProgress` KEPT in GameState — still needed by allocateAbilityNode/respecAbility actions + skill tree UI in SkillPanel
- XP for abilities still flows through skillBar iteration → bridge-back to abilityProgress (processNewClears)
- Legacy types (AbilityDef, AbilityProgress, etc.) KEPT in types/index.ts — still used by engine/unifiedSkills.ts and data/unifiedSkills.ts internally

---

## Sprint 10K-A: Real-Time Combat Engine
**Goal:** Replace passive timer-based clears with real-time skill-based damage in combat mode. Mob HP tracked live, skills fire on cast interval, mob death triggers clear.
**Status:** COMPLETE

### What was done:
- [x] New `CombatTickResult` interface in `types/index.ts`
- [x] 3 ephemeral GameState fields: `currentMobHp`, `maxMobHp`, `lastSkillCastAt`
- [x] `calcSkillCastInterval()` engine function (speed-adjusted cast time)
- [x] `rollSkillCast()` engine function (per-hit roll with hit/miss/crit/variance)
- [x] `COMBAT_TICK_INTERVAL = 250` constant in `data/balance.ts`
- [x] `tickCombat(dt)` store action: fires skill, tracks mob HP, returns kills
- [x] `startIdleRun` initializes mob HP from `calcMobHp(zone)`
- [x] `checkRecoveryComplete` resets mob HP when resuming after boss
- [x] Ephemeral fields reset on rehydrate
- [x] ZoneScreen tick loop calls `tickCombat` during clearing (combat mode only)
- [x] MobDisplay uses real mob HP bar (`currentMobHp / maxMobHp`)
- [x] Gathering mode unchanged (keeps time-based model)
- [x] `npm run build` passes

### What does NOT change (deferred):
- Offline progression (still uses `simulateIdleRun()` deterministic model)
- Visual feedback (skill slot flash, damage numbers) → 10K-B2
- Multi-skill rotation → 10M

---

## Sprint 10K-B1: Boss Unification into tickCombat
**Goal:** Unify boss fights into the same per-hit skill model as normal clearing. Remove old flat-DPS `tickBoss`/`tickBossFight`.
**Status:** COMPLETE

### What was done:
- [x] Extended `CombatTickResult` with `isHit: boolean` and `bossOutcome?: 'ongoing' | 'victory' | 'defeat'`
- [x] Removed `BossTickResult` interface and `tickBossFight()` function from `engine/zones.ts`
- [x] Widened `tickCombat` guard from `clearing`-only to `clearing || boss_fight`
- [x] Boss fight path: player attacks via `rollSkillCast()`, boss deals continuous `bossDps * dtSec`
- [x] Boss outcomes: HP <= 0 → victory, player HP <= 0 → defeat
- [x] Removed `tickBoss` from `GameActions` interface and implementation
- [x] `startBossFight` now sets `lastSkillCastAt: Date.now()` for immediate first cast
- [x] ZoneScreen tick loop: `boss_fight` block calls `tickCombat(dtSec)` instead of `tickBoss(dt)`
- [x] Removed `tickBoss` from store destructuring and dependency arrays
- [x] `npm run build` passes

### Key decisions:
- Boss still deals flat continuous DPS to player (no per-hit rolls for boss attacks). Only player attacks become skill-based.
- `BossState.playerDps` kept as snapshot for victory overlay stats. Not used for damage calc.
- `dtSec` parameter now meaningful: used for boss damage application.
- Between skill casts, boss still damages player (handled in the "not ready to cast" early return).

---

## Sprint 10K-B2: Combat Visual Feedback
**Goal:** Visual feedback for combat ticks.
**Status:** COMPLETE

### What was done:
- [x] CSS keyframe animations: `skill-flash` (gold glow) and `float-damage` (float-up + fade) in `index.css`
- [x] Skill slot flash: `SkillBar` accepts `lastFiredSkillId` prop, active skill div gets `skill-flash` animation. Uses React key trick (flashKeyRef counter) to re-trigger on repeat fires.
- [x] Damage floaters: New `DamageFloater.tsx` component renders absolutely-positioned numbers. White=hit, yellow+large=crit, gray="MISS". Random horizontal offset (20-80%). Capped at 5 active floaters, auto-removed after 1s.
- [x] Combat log: Inline in ZoneScreen, shows last 5 entries (stores 20). Format: `SkillName damage [CRIT]` or `SkillName MISS`. Compact `max-h-16` with monospace font.
- [x] BossFightDisplay cleanup: Removed "Your DPS" line (now meaningless with skill-based combat), show only "Boss DPS" centered. Removed unused `playerDps` prop.
- [x] Floaters + log display during both clearing and boss_fight phases
- [x] Floaters + log cleared on: stop run, start run, boss victory/defeat recovery
- [x] `npm run build` passes

### Files changed:
- `src/index.css` — 2 keyframe animations
- `src/ui/components/SkillBar.tsx` — `lastFiredSkillId` prop, flash logic
- `src/ui/components/DamageFloater.tsx` — NEW, FloaterEntry interface + DamageFloaters component
- `src/ui/screens/ZoneScreen.tsx` — floater/log state, tick loop integration, MobDisplay/BossFightDisplay wrappers, combat log render, BossFightDisplay cleanup

---

## Sprint 10L: Skill Cooldown UI + Visual Polish
**Goal:** Show cooldown sweeps and fix 10K-B2 floater bugs.
**Status:** COMPLETE

### What was done:
- [x] **Floater bug fix (10K-B2 followup)**: Damage floaters centered at `left: 50%` with `translateX(-50%)` — no longer scattered across HP bar. Staggered vertically by index to prevent overlap.
- [x] **Damage rounding**: Floaters and combat log now show `Math.round(damage)` — no more raw decimals like `23.012839`.
- [x] **FloaterEntry cleanup**: Removed `left` field from interface and random `left` generation in ZoneScreen.
- [x] **Cooldown sweep overlay**: Buff/instant/ultimate skill slots show a `conic-gradient` dark wedge during cooldown. The wedge shrinks clockwise as cooldown expires, revealing the slot.
- [x] **Active buff duration sweep**: Active buffs show a golden tint sweep (`rgba(250,204,21,0.2)`) that shrinks as buff duration expires, giving "time remaining" feedback.
- [x] **Z-index layering**: Sweep overlays at z-1, icon/text at z-2, XP bar at z-3, auto-cast indicator at z-10.
- [x] **No new CSS**: Sweeps use inline `conic-gradient` styles — no keyframes needed.
- [x] **Cast bar deferred**: No channeled skill `kind` exists yet. Will revisit when channel mechanics are added (10M+).
- [x] **Enhanced glow deferred**: Current `skill-flash` animation is sufficient. Can polish further in a future pass.
- [x] `npm run build` passes

### Files changed:
- `src/ui/components/DamageFloater.tsx` — centered positioning, removed `left` field, rounded damage
- `src/ui/components/SkillBar.tsx` — imported `getSkillEffectiveCooldown`, added cooldown/buff sweep overlays
- `src/ui/screens/ZoneScreen.tsx` — removed random `left` from floater creation, rounded combat log damage

---

## Sprint 10M: Multi-Skill Rotation (Foundation)
**Goal:** Replace single-skill combat with cooldown-based rotation. All active skills have individual cooldowns, fire in slot-priority order, separated by 1s GCD.
**Status:** COMPLETE

### Checklist:
- [x] `ACTIVE_SKILL_GCD` constant (1.0s) — independent from buff auto-cast GCD
- [x] `nextActiveSkillAt` replaces `lastSkillCastAt` — pre-computed GCD timestamp
- [x] `getNextRotationSkill()` — iterates slots 0-4, returns first active skill off CD
- [x] `tickCombat()` rewritten — GCD check → rotation pick → fire → per-skill CD + GCD update
- [x] Active skills get `SkillTimerState` entries on equip (was only buff/toggle/instant/ultimate)
- [x] v27 migration — renames ephemeral field, ensures active skill timers exist
- [x] Cooldowns assigned to all 43 spammable active skills (3s basic → 6s specialist, finishers 8-12s unchanged)
- [x] Active skill cooldown sweep overlay in SkillBar (conic-gradient, same pattern as buffs)
- [x] Active skills show remaining CD text when on cooldown
- [x] Any skill kind can be equipped to any slot (no slot-kind restrictions)
- [x] SkillPanel shows cast time + cooldown for active skills
- [x] `npm run build` passes (502 kB)

### Deferred (future sprints):
- Combo system (debuffs/empowerment based on cast order)
- Rotation DPS display (shows combined rotation DPS estimate)
- Skill priority reordering via drag/arrows
- Rotation-aware offline DPS estimation (offline still uses single-skill model)

### Files modified:
- `data/balance.ts` — `ACTIVE_SKILL_GCD` constant
- `types/index.ts` — `nextActiveSkillAt` replaces `lastSkillCastAt`
- `engine/unifiedSkills.ts` — `getNextRotationSkill()`, updated `getDefaultSkillForWeapon()`
- `store/gameStore.ts` — `tickCombat()` rewrite, equip timer init, v27 migration
- `data/unifiedSkills.ts` — cooldowns for all 43 active skills
- `ui/components/SkillBar.tsx` — active skill cooldown sweep + CD text
- `ui/components/SkillPanel.tsx` — cast time/cooldown display for active skills

---

## Sprint 10N: Skill XP + Passive Points
**Goal:** All equipped skills earn XP from clears. Raise skill level cap to 20 with quadratic XP curve. Display level on all skill bar slots. Foundation for future skill passive trees.
**Status:** COMPLETE

### Checklist:
- [x] Active skills earn XP from clears (removed `kind === 'active'` filter in processNewClears)
- [x] `SKILL_MAX_LEVEL = 20` constant in `data/balance.ts`
- [x] Quadratic XP curve: `100 * (level + 1) * (1 + level * 0.1)` — Lv1→2: 200 XP, Lv19→20: 6,000 XP
- [x] Level badge (`Lv.X`) on all skill bar slots (top-right corner, purple text)
- [x] XP bar displays for active skills in SkillPanel browse view
- [x] Skill tree points line hidden for active skills (no trees yet)
- [x] `npm run build` passes

### Files modified:
- `data/balance.ts` — `SKILL_MAX_LEVEL` constant
- `engine/unifiedSkills.ts` — quadratic XP formula, SKILL_MAX_LEVEL import
- `store/gameStore.ts` — removed active skill XP filter
- `ui/components/SkillBar.tsx` — level badges on all skill kinds
- `ui/components/SkillPanel.tsx` — XP bar for all equipped skills

### No save migration needed:
`skillProgress` entries are created on-the-fly when missing. Active skills start at level 0, XP 0. Existing saves work seamlessly.

---

## Sprint 10O: Per-Hit Defense System
**Goal:** Replace abstract `calcDefensiveEfficiency()` combat math with per-hit defense rolls mirroring the offense pipeline. Each incoming attack rolls: dodge → block → armor → resist.
**Status:** COMPLETE

### Checklist:
- [x] `rollZoneAttack()` — single hit through dodge/block/armor/resist pipeline
- [x] `simulateClearDefense()` — N zone attacks per clear with regen/leech
- [x] `calcBossAttackProfile()` — per-hit boss stats (replaces `calcBossDps`)
- [x] BossState expanded: `bossDamagePerHit`, `bossAttackInterval`, `bossNextAttackAt`, `bossAccuracy`, `bossPhysRatio`
- [x] `processNewClears()` uses `simulateClearDefense` instead of `applyNormalClearHp`
- [x] `tickCombat()` boss path: per-hit attacks at intervals + regen + leech (replaces `bossDps * dtSec`)
- [x] `applyBossDamage()` helper: per-hit boss attacks with `bossNextAttackAt` tracking
- [x] 7 new balance constants, 4 old constants removed
- [x] `calcDefensiveEfficiency()` kept for UI display only
- [x] ZoneScreen HP interpolation updated (deterministic estimate for smooth preview)
- [x] `npm run build` passes (~504 kB)

### Files modified:
- `data/balance.ts` — new constants (ZONE_ATTACK_INTERVAL, ZONE_DMG_BASE, ZONE_PHYS_RATIO, BOSS_DMG_PER_HIT_BASE, BOSS_ATTACK_INTERVAL, LEECH_PERCENT, MAX_REGEN_RATIO), removed CLEAR_DAMAGE_RATIO/BOSS_DPS_BASE/BOSS_DPS_ZONE_FACTOR/BOSS_DAMAGE_MULTIPLIER
- `types/index.ts` — BossState interface expanded with per-hit fields
- `engine/zones.ts` — rollZoneAttack, simulateClearDefense, calcBossAttackProfile, updated createBossEncounter, removed applyNormalClearHp/calcDamagePerClear/calcRegenPerClear/calcBossDps
- `store/gameStore.ts` — processNewClears HP section + tickCombat boss path + applyBossDamage helper
- `ui/screens/ZoneScreen.tsx` — removed applyNormalClearHp import, deterministic HP interpolation

### No save migration needed:
BossState is ephemeral (created fresh each boss fight). Per-clear defense applied immediately on existing saves.

---

## Architecture Notes

### Unified Skill System (post-10J):
```
data/unifiedSkills.ts    — 75 SkillDefs (51 active + 24 ability), all lookup functions
engine/unifiedSkills.ts  — ALL engine functions (DPS calc, ability resolution, aggregation, XP, skill trees)
store/gameStore.ts       — skillBar (5 slots), skillProgress, skillTimers, allocateAbilityNode, respecAbility
types/index.ts           — SkillDef, SkillKind, EquippedSkill, SkillProgress, SkillTimerState + legacy types for internal use
```

### Legacy types still in types/index.ts (used internally by unified modules):
- `AbilityKind`, `AbilityEffect`, `AbilityDef`, `AbilityProgress`, `AbilityTimerState`, `EquippedAbility`
- `ActiveSkillDef`, `DamageTag`
- `ScalingFormula`, `ScalingTerm`, `SkillTreeNode`, `SkillTreePath`, `AbilitySkillTree`, `MutatorDef`

### State fields:
- `skillBar: (EquippedSkill | null)[]` — 5 unified slots (slot 0 = active skill, slots 1-4 = abilities)
- `skillProgress: Record<string, SkillProgress>` — unified XP/level/nodes by skill ID
- `skillTimers: SkillTimerState[]` — activation/cooldown state
- `abilityProgress: Record<string, AbilityProgress>` — still used by allocateAbilityNode/respecAbility (keyed by OLD ability IDs)

---

## Skill Passive Tree System (Design — Future Sprint)

### Core Concept
Every skill (active, buff, passive, etc.) has its own passive tree. Leveling a skill
grants 1 passive point per level. Points are spent in the skill's tree to customize it.

### Key Numbers (rough, subject to tuning)
- Max skill level: 20
- Tree size: ~30 nodes per skill
- Points available: 20 (at max level)
- Points needed to fill tree: ~30
- Result: Players specialize — can't take everything, must choose a build path

### What Trees Include
- **Damage scaling**: +% damage, +flat damage, +% crit chance/multi
- **Cooldown reduction**: -% cooldown, -% cast time
- **Element conversion**: Change skill damage type (lightning -> fire, etc.)
- **Utility**: AoE radius, projectile count, duration bonuses
- **Keystones**: Major build-defining nodes (e.g., "Skill now channels instead of casting",
  "Converts all damage to chaos", "Skill chains to nearby enemies")

### Progression
- All equipped skills earn XP equally from mob clears
- Must be equipped in skill bar to earn XP
- XP curve is quadratic — early levels fast, late levels slow
- Skill XP is permanent (persists even when unequipped)

### Respec
- TBD: Full respec vs partial (per-node refund)
- Cost: Gold or currency

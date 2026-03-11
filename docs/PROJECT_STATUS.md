# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-03-11 (Dagger Rework Phase 2: ALL 5 SPRINTS COMPLETE)

## Current Phase
**Dagger Rework Phase 2 — COMPLETE.** All talent trees now have unique per-skill identity with new multiplicative stats. Ready for templating to other weapons. See `docs/DAGGER_REWORK_PLAN.md` for full plan.

- **Sprint 1 COMPLETE**: Added 7 multiplicative offense stats to `SkillModifier` (`firePenetration`, `coldPenetration`, `lightningPenetration`, `chaosPenetration`, `dotMultiplier`, `weaponMastery`, `ailmentDuration`). Wired into `ResolvedSkillModifier`, `resolveDamageBuckets`, `calcSkillDps`, and `effectiveStats` in tick.ts.
- **Sprint 2 COMPLETE**: Replaced 3 legacy buff/passive skills with archetype-themed buffs: `dagger_predators_mark` (Assassination), `dagger_venom_covenant` (Venomcraft), `dagger_shadow_covenant` (Shadow Dance). Save migration v54.
- **Sprint 3 COMPLETE**: Reworked Venomcraft branch (branch index 1) across all 7 dagger active skills. Each skill now has unique per-skill identity with new stats. Stab=ailmentDuration, Blade Flurry=dotMultiplier, Frost Fan=coldPenetration, Viper Strike=dotMultiplier+chaosPenetration+ailmentDuration, Shadow Step=chaosPenetration, Assassinate=dotMultiplier+weaponMastery, Lightning Lunge=lightningPenetration. T3 nodes renamed for differentiation. ~60 nodes changed.
- **Sprint 4 COMPLETE**: Reworked Assassination branch (branch index 0) across all 7 dagger active skills. Added per-skill penetration/mastery stats: Stab=weaponMastery, Blade Flurry=weaponMastery, Frost Fan=coldPenetration, Viper Strike=chaosPenetration, Shadow Step=chaosPenetration, Assassinate=weaponMastery, Lightning Lunge=lightningPenetration. Key fixes: Assassinate T3a "Toxic Concentration" (copy of Viper Strike) replaced with unique "Executioner's Mastery". T3 renames: Stab→Relentless Edge, BF→Surgical Cascade, FF→Frozen Precision/Glacial Crossfire, VS→Critical Venom/Venomous Precision, LL→Voltaic Cascade. ~50 nodes changed.
- **Sprint 5 COMPLETE**: Reworked Shadow Dance branch (branch index 2) across all 7 dagger active skills. Added per-skill penetration/mastery stats: Stab=weaponMastery, Blade Flurry=weaponMastery, Frost Fan=coldPenetration, Viper Strike=chaosPenetration, Shadow Step=chaosPenetration, Assassinate=weaponMastery, Lightning Lunge=lightningPenetration. Updated all branch descriptions from generic 'Defensive mastery and evasion-based combat' to skill-specific descriptions. ~77 nodes changed.
- **Save version**: v54 (no save migration needed — data-only changes to talent node definitions)
- **DAGGER REWORK PHASE 2 COMPLETE** — All 5 sprints done. All 273 dagger talent nodes now have unique per-skill identity with new multiplicative stats across all 3 branches (Assassination, Venomcraft, Shadow Dance).

**Previous: Balance v3.0 — COMPLETE.** Multiplicative offense affixes, economy rebalancing, XP hard cutoff, and bot crafting.

- **What was built**: 6 multiplicative offensive stats (element penetration, DoT multiplier, weapon mastery) with 6 new affixes. Economy fixes: XP hard cutoff at 5+ levels over zone, per-band affix count scaling (band 5-6 always 4+ affixes), currency band multiplier, exponential gold scaling, clear time floor halved (0.20→0.10). Bot simulator now tracks and spends crafting currency.
- **Key changes**:
  - `StatKey` gains `firePenetration`, `coldPenetration`, `lightningPenetration`, `chaosPenetration`, `dotMultiplier`, `weaponMastery`
  - Penetration applied in `damageBuckets.ts` as "more" multiplier per element
  - DoT multiplier in both `unifiedSkills.ts` (DPS display) and `zones.ts` (combat sim)
  - Weapon mastery as "more" multiplier on total DPS in both callers
  - `AFFIX_COUNT_WEIGHTS_BY_BAND` — band 5-6 items always have 4+ affixes
  - `CURRENCY_BAND_MULTIPLIER` — band 6 gives 1.5x currency drop chance
  - Gold formula: `round(3 * band^1.4)` — band 6 goes from 24→47 per clear
  - `calcXpScale` now returns 0 at 5+ levels over zone (was 10% floor)
  - Bot crafting: augment/chaos/exalt/divine every 25 clears on weakest item
- **Modified files**: `src/types/index.ts`, `src/data/balance.ts`, `src/data/affixes.ts`, `src/engine/damageBuckets.ts`, `src/engine/unifiedSkills.ts`, `src/engine/zones.ts`, `src/engine/items.ts`, `src/store/gameStore.ts`, `src/ui/screens/InventoryScreen.tsx`, `src/ui/screens/CharacterScreen.tsx`, `sim/bot.ts`, `sim/logger.ts`, `sim/strategies/types.ts`
- **Save version**: v52
- **Next**: Run sim comparison (`npx tsx sim/runner.ts --bots 5 --max-clears 5000 --verbose`) and compare with v2.1 baseline

**Previous: Per-Mob State Engine Refactor — COMPLETE.** Encounter state moved from flat fields to `packMobs: MobInPack[]` array.

- **What was built**: Refactored encounter state so each mob in a pack carries its own HP, debuffs, and combat state inside a `MobInPack` object. Old encounter-level fields (`currentMobHp`, `currentMobMaxHp`, `debuffs`, `currentMobIsRare`, etc.) replaced by `packMobs` array. Front mob accessed via `packMobs[0]`. Engine (`packs.ts`) gains `rollFullPack()` to produce fully-initialized `MobInPack[]`. Save migration v46 rebuilds pack state from zone/band context.
- **Key changes**:
  - `MobInPack` type holds `hp`, `maxHp`, `debuffs`, `isRare`, `rareAffixes`, `resolvedMods`, `dotTimers`
  - `packMobs: MobInPack[]` replaces ~8 flat encounter fields on game state
  - `rollFullPack()` in `packs.ts` creates complete pack arrays (rolls size, rare status, affixes, HP)
  - Store combat tick reads/writes per-mob state from `packMobs[0]` (front mob)
  - UI components (`CombatPanel`, `MobDisplay`) read from `packMobs` array
  - Save migration v45→v46: clears encounter, rebuilds from zone/band
- **Modified files**: `src/types/index.ts`, `src/engine/packs.ts`, `src/store/gameStore.ts`, `src/ui/zones/CombatPanel.tsx`, `src/ui/zones/MobDisplay.tsx`
- **Save version**: v46
- **Next**: TBD — see roadmap in `docs/SPRINT_PLAN.md`

**Previous: Multi-Mob Packs & Rare Mobs — COMPLETE.** All 4 sprints done (Types/Data/Engine, Store Packs, Store Rares, UI).

- **What was built**: Combat now spawns packs of 1-5 mobs per encounter. AoE skills damage all mobs simultaneously, single-target only hits front mob. Rare mobs (5-18% chance by band) with 1-4 Diablo-style affixes that multiplicatively stack HP/loot. 5 affixes: Mighty (+25% dmg), Frenzied (+40% atk speed), Armored (20% DR), Empowered (+50% dmg), Regenerating (2% maxHP/sec).
- **Key mechanics**:
  - Pack progression: front mob death shifts next back mob to front (overkill carries); pack fully dead → new encounter roll
  - AoE detection checks both base skill tags and `convertToAoE` talent mods
  - Rare mob loot multiplier flows through `CombatTickResult.encounterLootMult` → `processNewClears`
- **New files**: `src/data/rareAffixes.ts` (5 affix defs), `src/engine/packs.ts` (rollPackSize, isSkillAoE, rollIsRare, rollRareAffixes, resolveRareMods)
- **Modified files**: `src/types/index.ts`, `src/data/balance.ts`, `src/store/gameStore.ts`, `src/ui/zones/MobDisplay.tsx`, `src/ui/zones/CombatPanel.tsx`

**Previous: Skill Tree Overhaul — COMPLETE.** All 3 sprints done (Engine, Data, UI).

- Per-skill talent trees for all 7 dagger active skills. 273 nodes (7 trees × 3 branches × 13 nodes).
- **Key files**: `src/engine/talentTree.ts`, `src/data/skillGraphs/talentTreeBuilder.ts`, `src/data/skillGraphs/dagger_talents.ts`, `src/data/skillGraphs/talentTrees.ts`, `src/ui/components/TalentTreeView.tsx`

**Previous: Skill Tree Overhaul — Sprint 3: UI + Integration** — COMPLETE.

- **Purpose**: Wire talent trees into live game with barrel export, unifiedSkills wiring, and TalentTreeView UI.
- **Files**: `src/data/skillGraphs/talentTrees.ts` (barrel `ALL_TALENT_TREES`), `src/data/unifiedSkills.ts:2489` (wiring), `src/ui/components/TalentTreeView.tsx` + `SkillPanel.tsx` (UI)

**Previous: Skill Tree Overhaul — Sprint 2: Dagger Data** — COMPLETE.

- **Purpose**: Author all 7 dagger skill talent trees using builder pattern + inline configs. 147 behavior nodes + per-skill notables + T5-T7 keystones.
- **Architecture**: All nodes defined inline per skill — no shared constants or factory functions. Each skill's 3 branches are self-contained `TalentBranchConfig` objects.
- **New files**: `src/data/skillGraphs/talentTreeBuilder.ts` (builder), `src/data/skillGraphs/dagger_talents.ts` (7 trees × 3 branches × 13 nodes = 273 total nodes)
- **Key refactoring**: Removed shared constants, factory functions, `T5NC` type alias, and `shared` field from `TalentNode`. All notables/keystones are now per-skill with unique proc IDs (e.g., `st_blade_sense`, `bf_blade_sense`).
- **Modified files**: `src/types/index.ts` (removed `shared` from `TalentNode`), `src/ui/components/TalentTreeView.tsx` (removed SHARED badge), `docs/SKILL_TREE_OVERHAUL.md` (updated to reflect no-shared architecture)
- **Data source**: `docs/weapon-designs/dagger.md` (Sections 5-8)
- **Save version**: v43 (unchanged — data-only, no migration needed)

**Previous: Skill Tree Overhaul — Sprint 1: Engine Foundation** — COMPLETE.

- **Purpose**: Build all engine infrastructure for per-skill talent trees. Phase 0 cleanup (disable class talent trees, remove dagger_lethality). No data authoring yet.
- **Engine changes**:
  - **`src/engine/talentTree.ts`** (NEW): `canAllocateTalentRank()`, `resolveTalentModifiers()`, allocation/respec logic. Pure TS, no React. Enforces tier gates `[0,2,4,7,10,11,12]`, exclusiveWith for T5 choices, maxRank per node.
  - **`src/types/index.ts`**: `TalentNode`, `TalentBranch`, `TalentTree` interfaces. `TalentNodeType = 'behavior' | 'notable' | 'keystoneChoice' | 'keystone'`. `SkillDef.talentTree?: TalentTree`. `SkillProgress.allocatedRanks: Record<string, number>`.
  - **`src/data/balance.ts`**: `SKILL_MAX_LEVEL = 30`, `TALENT_TIER_GATES = [0,2,4,7,10,11,12]`.
  - **`src/engine/unifiedSkills.ts`**: `getSkillGraphModifier()` (line ~102) and `aggregateGraphGlobalEffects()` (line ~524) check `talentTree` first, falling back to `skillGraph`.
  - **`src/store/gameStore.ts`**: `allocateAbilityNode` and `respecAbility` branch into talent tree paths. Save migration v43.
  - **`src/engine/combatHelpers.ts`**: P1 mechanics (`whileBuffActive`, ICD, `executeOnly`, etc.) ready for talent node modifiers.
- **Phase 0 cleanup**:
  - Class talent trees disabled (allocate/respec return early with comment)
  - `classTalents` import removed from gameStore
  - Save migration v43: resets `talentAllocations`, removes `dagger_lethality` from skill bar
- **Modified files**: `src/engine/talentTree.ts` (new), `src/types/index.ts`, `src/data/balance.ts`, `src/engine/unifiedSkills.ts`, `src/store/gameStore.ts`, `src/engine/combatHelpers.ts`
- **New docs**: `docs/archive/TALENT_TREE_IMPLEMENTATION.md`, `docs/archive/SPRINT_2_PLAN.md`
- **Save version**: v42 → v43
- **Next**: Sprint 2 — Dagger Data (see `docs/archive/SPRINT_2_PLAN.md`)

**Previous: Dagger Doc Review — Feedback Implementation** — COMPLETE.

- **Purpose**: Implement all feedback from `docs/dagger-review-feedback.md` and merge unique content from `docs/dagger-schema-v3.1.md` into `docs/weapon-designs/dagger.md`. Resolves 3 blockers, 3 important issues, and 2 minor issues.
- **Changes**:
  - **Gate progression fix** (BLOCKER): Old `[0,2,5,8,11,12,13]` → new `[0,2,4,7,10,11,12]` across all 3 docs. New gates enforce minimum investment thresholds, not tier exhaustion. Enables real pathing choices (can skip T2 notable and still reach T3). Minimum T7 drops from 14→13 pts.
  - **Section 8 full expansion** (BLOCKER): Expanded all 3 branch tables from generic template descriptions to full per-skill behavior node specs for all 7 skills × 3 branches (~126 named nodes with rank 2 differentiation). Venomcraft T1b differentiated per skill (Issue 3): Blade Flurry extends poison duration, Frost Fan spreads stacks, Lightning Lunge applies Corroded. Shadow Dance T1a/T1b differentiated for movement skills (Issue 4): Lightning Lunge gets evasion-on-lunge + dodge-reduces-CD, Shadow Step cast counts as dodge.
  - **Counter Stance revision** (IMPORTANT): 75% wpn dmg (225% below 40% HP), Ghost Step heal REMOVED, +10% damage taken. Added balance note for pre-conversion estimates.
  - **DEATHBLOW engine notes** (BLOCKER): Assassinate must be equipped for auto-fire. Auto-fire treats as normal Assassinate cast (own tree modifiers apply). UI warning recommended. antiSynergy note for non-Assassination tree investment.
  - **Build examples recalculated**: All 4 builds verified at 30 total points with new gates. Build 1 adjusted to 13/11/6 (freed point reaches T5 Toxic Mastery). Build 3 gains T5 access in all branches at 10/10/10. Build 4 cleaned up (removed failed math attempts).
  - **Schema merge**: Added Generation Instructions (Section 13) and v2→v3→v3.1→v3.2 changelog to dagger.md header.
  - **Save version fix**: All v42 references in SKILL_TREE_OVERHAUL.md → v43 (v42 taken by Damage Bucket Fix).
  - **Schema sync**: Fixed old DEATHBLOW (35% instant kill → 25% execute 500% wpn dmg) and gate values in dagger-schema-v3.1.md.
  - **Doc consolidation**: Deleted `docs/dagger-schema-v3.1.md` (all unique content merged into dagger.md + SKILL_TREE_OVERHAUL.md). Deleted `docs/dagger-review-feedback.md` (all issues resolved). Two-file system: SKILL_TREE_OVERHAUL.md (architecture + principles) + weapon-designs/dagger.md (implementation template).
- **Modified files**: `docs/weapon-designs/dagger.md`, `docs/SKILL_TREE_OVERHAUL.md`, `docs/PROJECT_STATUS.md`
- **Deleted files**: `docs/dagger-schema-v3.1.md`, `docs/dagger-review-feedback.md`
- **Save version**: v42 (unchanged, docs only)
- **Next**: Skill Tree Overhaul Phase 0 engine implementation (disable class talent trees).

**Previous: Damage Bucket Fix — Flat Phys Conversion + Item Data Cleanup** — COMPLETE.

- **Purpose**: Fix critical balance bug where `flatPhysDamage` bypassed skill conversion splits and was double-counted on all weapons/accessories.
- **Two bugs fixed**:
  - **Conversion bypass**: In `resolveDamageBuckets()`, flat phys was added to the physical bucket AFTER conversion (Step 3), so Thunder Crash (55% phys→lightning) dealt ~80% physical. Fix: moved `flatPhysDamage` into `physBase` BEFORE conversion (Step 1) for attack skills. Elemental flat affixes (fire/cold/lightning/chaos) stay in Step 3 as intended.
  - **Double-counting**: Every weapon had both `baseDamageMin/Max` (feeds `weaponAvgDmg`) AND `baseStats.flatPhysDamage` (same value). Weapon damage entered `physBase` twice. Fix: removed `flatPhysDamage` from ALL base item `baseStats` — weapons, quivers, amulets, trinkets. Weapon damage now comes solely from `baseDamageMin/Max`. Flat phys is only available through affixes (rolled on items).
- **Save migration v42**: Strips `flatPhysDamage` from `baseStats` on all existing equipped and inventory items on load.
- **Modified files**: `src/engine/damageBuckets.ts`, `src/data/items.ts`, `src/store/gameStore.ts`
- **Save version**: v41 → v42
- **Next**: Tune affix scaling if damage numbers are still off after fix. Then Skill Tree Overhaul Phase 0 engine implementation.

**Previous: Skill Tree Overhaul — v3.1 Documentation** — COMPLETE.

- **Purpose**: Rewrite talent tree design docs to align with v3.1 framework. Establish reusable templates for all future weapons.
- **Changes**:
  - **`docs/weapon-designs/dagger.md`**: Full rewrite — v3.1 tree structure (7 tiers, 19-capacity branches, non-uniform gates), behavior nodes (maxRank:2, conditional mechanics), proc-forward shared notables (Blade Sense, Exploit Weakness, Envenom, Deep Wounds, Shadow Guard, Ghost Step), DEATHBLOW v3.2 redesign (25% HP execute-only, cast priority, 500% weapon damage), T5 keystone choices per branch, behavior template selections for all 7 skills, build path examples, 3-mechanic rule validation, validation checklist. Serves as template for all future weapon docs.
  - **`docs/SKILL_TREE_OVERHAUL.md`**: Full rewrite — v3.1 architecture (node types: behavior/notable/keystoneChoice/keystone), design philosophy (behavior-first fillers, proc-forward notables, T6→T7 tension, buff branch ownership, 3-mechanic rule), comprehensive engine changes tracker (P0: 13 items for any tree, P1: 9 items for dagger, P2: 11 items deferred), updated Phase 0 + Phase 1 specs with v3.1 types and mechanics.
  - **Key design decisions**: Lethality passive removed (effects redistributed), Stealth→Assassination branch, Flurry→Shadow Dance branch, DEATHBLOW changed from instant-kill to 500% execute damage at 25% HP threshold
- **Modified files**: `docs/weapon-designs/dagger.md`, `docs/SKILL_TREE_OVERHAUL.md`
- **Save version**: v41 (unchanged, docs only)

**Previous: Sprint: Debuff Overhaul — Sprint 2 (Combat Log & Debuff UX)** — COMPLETE.

- **Purpose**: Surface debuff damage in the combat log so players can see their debuffs working. Add tooltips to debuff badges.
- **Changes**:
  - **CombatTickResult extended**: 3 new optional fields (`dotDamage`, `bleedTriggerDamage`, `shatterDamage`) tracked and returned from all main tick paths.
  - **Combat log overhaul**: New entry types (`skill`/`dot`/`bleed`/`shatter`), color-coded rendering (green DoT, red bleed, cyan shatter), 12 entries reversed (newest first), bigger container.
  - **Debuff badge tooltips**: `<Tooltip>` wrapper with name, description, stacks/maxStacks, remaining duration, snapshot DPS estimate (bleed per trigger, poison per second), burn rate for %maxHP.
- **Modified files**: `src/types/index.ts`, `src/store/gameStore.ts`, `src/ui/zones/CombatPanel.tsx`, `src/ui/zones/DebuffBadge.tsx`
- **Save version**: v41 (unchanged, no migration needed)
- **Next**: Sprint 3 (Skill Tree Debuff Integration)

**Previous: Sprint: Debuff Overhaul — Sprint 1 (Core Engine)** — COMPLETE.

- **Purpose**: Redesign each debuff to have a distinct, interesting identity instead of flat DPS/damage-taken mechanics. Fix `incDoTDamage` gear stat bug (never applied to DoT calculations).
- **Debuff changes**:
  - **Bleeding**: Flat 8 DPS → snapshot-based. Each stack records hit damage. 30% of total snapshot triggers when enemy attacks (not per-tick). Max 5 stacks.
  - **Poisoned**: Flat 2 DPS → snapshot-based. Each stack records hit damage. 15% of total snapshot as DoT/sec. Max 10 stacks.
  - **Burning**: Flat 5 DPS → 2% of enemy max HP/sec. Scales with content difficulty.
  - **Shocked**: +15% damage taken/stack → +10% crit chance on target per stack. Max 3 stacks.
  - **Chilled**: +10% damage taken → Shatter on Kill: 50% of overkill damage to next enemy.
  - **Vulnerable**: +30% crit damage taken → flat +20% more damage from all sources.
  - **Slowed, Weakened, Blinded, Cursed**: Unchanged.
- **Engine work**: Snapshot application on debuff apply (3 paths: normal, debuffOnCrit, proc), DoT tick rework (snapshot/percentMaxHp/flat + incDoTDamage bug fix), bleed-on-enemy-attack at all 4 attack sites (helper boss, helper zone, main boss, main clearing), shocked +crit pre-roll, chilled shatter on kill in death loop.
- **Bug fix**: `incDoTDamage` gear stat now actually scales all DoT damage.
- **Modified files**: `src/types/index.ts`, `src/data/debuffs.ts`, `src/store/gameStore.ts`
- **New files**: `docs/archive/DEBUFF_OVERHAUL_PLAN.md`
- **Save version**: v40 → v41

**Previous: Sprint: Crafting Overhaul** — COMPLETE.

- **Purpose**: Replace the component-crafting system with a pattern-based system. Patterns drop from zone clears, boss kills, and void invasions. Each pattern guarantees specific affixes and minimum rarity, consuming charges on use. Milestone rework ties profession leveling to pattern bonuses.
- **6 phases**:
  - **Phase 1 (Remove Components)**: Done in previous session — removed component recipes, panels, and store actions.
  - **Phase 2 (Reduce Gold Costs)**: Done in previous session — rebalanced crafting gold costs.
  - **Phase 3 (Crafting Patterns)**: Data definitions (35 patterns across zone/boss/invasion sources, bands 1-3), engine functions (`canCraftPattern`, `executePatternCraft`, `getPatternMaterialCost`), drop integration in `simulateSingleClear` and `processNewClears`/`handleBossVictory`, invasion bonus drops, PatternPanel UI, session summary notifications.
  - **Phase 4 (Milestone Rework)**: Level 10 milestone changed from `-10% gold cost` to `+1 pattern charge`. Level 100 mastery now includes `+3 pattern charges`. Bonus charges applied when patterns are created.
  - **Phase 5 (Save Migration v40)**: Removes `comp_*` materials from inventory, initializes `ownedPatterns: []`.
- **New files**: `src/data/craftingPatterns.ts`, `src/ui/crafting/PatternPanel.tsx`
- **Modified files**: `src/types/index.ts`, `src/data/balance.ts`, `src/data/craftingProfessions.ts`, `src/engine/zones.ts`, `src/engine/craftingProfessions.ts`, `src/store/gameStore.ts`, `src/ui/screens/CraftingScreen.tsx`, `src/ui/screens/ZoneScreen.tsx`
- **Save version**: v39 → v40

**Previous: Sprint: Zone Progression** — COMPLETE.

- **Purpose**: Zones within a band felt interchangeable — no gating, no farming rewards, no dynamic events. This sprint added three systems to give zones identity and progression.
- **3 features**:
  - **Zone Unlock Chain**: Boss kill gating via `bossKillCounts` + "Defeat the boss of X to unlock" text. Players must beat a zone's boss before progressing to the next zone in a band.
  - **Zone Mastery Milestones**: 3 tiers (Bronze 25 / Silver 100 / Gold 500 clears). One-time rewards (gold + XP + item) per tier. Permanent zone bonuses (+5% / +10% / +15% drop rate & material yield). Trophy UI on zone cards.
  - **Void Invasions**: Random 30-60min events, 30min cooldown per band. Invasion mobs (1.5x HP + 1.3x difficulty mult). 25% corruption chance on drops. Purple glow + timer UI. InvasionTracker panel with "Summon Void" button.
- **New files**: `src/data/corruptionAffixes.ts`, `src/data/invasionMobs.ts`, `src/engine/invasions.ts`
- **Modified files**: `src/types/index.ts`, `src/data/balance.ts`, `src/engine/zones.ts`, `src/store/gameStore.ts`, `src/ui/screens/ZoneScreen.tsx`, `src/ui/components/ItemCard.tsx`, `src/index.css`
- **Save version**: v38 → v39

**Previous: Sprint: Chain Lightning Skill Tree Redesign — Cross-Skill Synergy** — COMPLETE.

- **Purpose**: Replace the self-contained 51-node CL damage tree with a 15-node rotation engine. CL weaker solo, but creates conditions/triggers that make companion skills matter. Sets the design template for ALL future skill trees.
- **Tree redesign**: 51 nodes / 5 branches / 20 maxPoints → 19 nodes (15 + start + 3 bridges) / 3 branches / 10 maxPoints.
  - **B1 Voltaic Trigger**: Crit spellslinger. CL crits → cast Frostbolt/Void Blast. Kill → reset Frostbolt CD.
  - **B2 Tempest Weaver**: Debuff overload. CL paints 4-5 debuffs. All rotation skills benefit. Kill → reset Essence Drain CD.
  - **B3 Stormshield**: Reactive counter-attacker. Fortify stacking. Dodge → cast Void Blast. Block → cast Frostbolt.
  - **3 cross-connect bridges**: Voltaic Storm, Elemental Shield, Storm Recovery.
- **Engine work**: Wired `onDodge`/`onBlock` proc evaluation in `tickCombat` after boss attack and zone attack resolution (~30 lines each, 2 locations). Defensive procs apply damage directly to enemy, merge temp buffs/debuffs using same patterns as `onHit`/`onCrit`.
- **Save migration v36**: Resets CL `allocatedNodes` (node IDs changed). Players keep XP/level.
- **Save version**: v35 → v36
- **Files modified**: `src/data/skillGraphs/wand.ts` (complete CL tree rewrite), `src/store/gameStore.ts` (onDodge/onBlock procs + save migration v36), `docs/PROJECT_STATUS.md`, `docs/SKILL_TREE_DESIGN.md`

**Previous: Sprint: Combat Status Feedback — Debuff Badges + Fortify Indicators** — COMPLETE.

- **Purpose**: Add visual status indicators so players can see their build systems working during combat. Debuff badges on mobs, fortify indicator on player HP, subtle glow effects.
- **Debuff badges**: 10 debuff types (chilled, shocked, burning, poisoned, bleeding, weakened, blinded, vulnerable, cursed, slowed) with color-coded compact badges (3-letter labels + stack counts) on MobDisplay and BossFightDisplay.
- **Fortify indicator**: Shows "FORT {stacks} ({DR}% DR)" on PlayerHpBar and BossFightDisplay player HP section when fortify is active.
- **Glow effects**: Subtle pulsing `debuff-glow` (red) on debuffed mobs, `fortify-glow` (amber) on fortified player HP bars.
- **No new files. No new types. No save migration.**
- **Save version**: v34 (unchanged)
- **Files modified**: `src/store/gameStore.ts` (export calcFortifyDR), `src/ui/screens/ZoneScreen.tsx` (DebuffBadge component, wired debuff/fortify props to MobDisplay/PlayerHpBar/BossFightDisplay), `src/index.css` (debuff-glow + fortify-glow keyframes), `docs/PROJECT_STATUS.md`

**Previous: Phase 3: Chain Lightning 5-Branch Skill Tree Showcase** — COMPLETE.

- **Purpose**: Replace the boring 3-branch, 34-node Chain Lightning graph with a 51-node, 5-branch showcase tree that exercises all Phase 2 modifier systems. Establishes the pattern for all future weapon skill trees.
- **5 branches**:
  - **B1 Overcharge**: Raw power + shock exploitation. Guaranteed Shock, ramping damage, consume debuff stacks.
  - **B2 Storm Cascade**: Chain/multi-hit + AoE. Extra chains, extra hits, ramping momentum.
  - **B3 Voltaic Precision**: Crit + crit-triggered procs. Bonus casts on crit, debuff on crit.
  - **B4 Tempest Weaver**: Multi-element + debuff mastery. Apply 5+ debuff types, +80% at 4 unique debuffs.
  - **B5 Stormshield**: Defensive lightning. Life leech, fortify stacking, armor-to-damage, resist bonuses.
- **Cross-connect ring**: 5 bridge minors (tier 2) form B1↔B2↔B3↔B4↔B5↔B1, letting players dip into adjacent branches.
- **5 keystones**: SUPERCONDUCTOR, STORM TEMPEST, LIGHTNING SAVANT, PRISMATIC STORM, EYE OF THE STORM — each with meaningful tradeoffs and globalEffect.
- **Engine tweak**: `whileDebuffActive` in `combatHelpers.ts` now supports threshold (count unique debuff types). Needed for Elemental Overload's "+80% when 4+ unique debuffs active".
- **Tooltip enhancement**: `formatModifier()` in `SkillGraphView.tsx` upgraded — conditionalMods show per-condition descriptions, procs show trigger/chance/effect, debuffInteraction shows sub-fields.
- **Modifier systems exercised**: conditionalMods (pre-roll & post-roll), procs (bonusCast, applyDebuff), debuffInteraction (bonusDamageVsDebuffed, consumeDebuff, debuffDurationBonus, debuffEffectBonus, debuffOnCrit), rampingDamage, fortifyOnHit, damageFromArmor, leechPercent, lifeOnHit, lifeOnKill, splitDamage, chainCount, extraHits, convertToAoE, globalEffect.
- **No new types. No save migration. No new files.**
- **Save version**: v34 (unchanged)
- **Files modified**: `src/engine/combatHelpers.ts`, `src/data/skillGraphs/wand.ts`, `src/ui/components/SkillGraphView.tsx`, `docs/PROJECT_STATUS.md`, `docs/SKILL_TREE_DESIGN.md`
- **Next**: TBD — Apply showcase pattern to more skill trees, or UI/balance work.

**Previous: Sprint 13B-Phase2B-2: Evaluation Systems** — COMPLETE.

- **Purpose**: Wire the three evaluation systems that depend on Phase 2B-1's state-tracking: conditional modifiers, proc effects, and debuff interactions. Most complex combat wiring phase yet.
- **3 systems wired**:
  - **Conditional Modifiers**: Two-timing system. Pre-roll "while" conditions (`whileLowHp`, `whileFullHp`, `whileDebuffActive`, `afterConsecutiveHits`, `onBossPhase`) modify `effectiveStats`/`damageMult`/`castSpeed`. Post-roll "on" conditions (`onHit`, `onCrit`, `onBlock`, `onDodge`, etc.) modify `roll.damage`.
  - **Proc Effects**: `evaluateProcs()` runs for `onHit`/`onCrit`/`onKill` triggers. Supports `castSkill` (fires another skill), `bonusCast` (re-casts current skill), `instantDamage` (with stat scaling), `healPercent`, `applyBuff` (creates TempBuffs), `applyDebuff`, `resetCooldown`. Max 1 level — no recursive procs.
  - **Debuff Interactions**: 6 sub-systems — `bonusDamageVsDebuffed` (extra damage vs specific debuff), `debuffEffectBonus` (scales all debuff effects), `debuffDurationBonus` (scales debuff durations), `debuffOnCrit` (guaranteed debuff on crit), `consumeDebuff` (consume stacks for burst damage), `spreadDebuffOnKill` (re-apply debuffs to new mob).
- **New file**: `src/engine/combatHelpers.ts` (~160 lines) — 3 pure functions + interfaces
- **New balance constant**: `BLOCK_DODGE_RECENCY_WINDOW = 3000` (ms)
- **Variable lifetime changes**: `activeTempBuffs` const→let, `damageMult` const→let, `effectiveMaxLife` hoisted
- **Safety**: All guards use `if (graphMod?.field)`. No existing skill graphs use these fields, so behavior is 100% identical.
- **No save migration. No new persisted state. No UI changes.**
- **Save version**: v34 (unchanged)
- **Files modified**: `src/data/balance.ts`, `src/engine/combatHelpers.ts` (new), `src/store/gameStore.ts`, `docs/PROJECT_STATUS.md`, `docs/SKILL_TREE_DESIGN.md`
- **Next**: TBD — Content authoring (create skill graphs that use these systems), or UI work.

**Previous: Sprint 14: Crafting UI Refinement** — COMPLETE.

- **Purpose**: Decompose the 1203-line CraftingScreen.tsx monolith, add search/filters/collapsed recipes, craft log, craft output buffer, and material traceability.
- **Phase 1 — File Decomposition + UI Polish**: Split into `src/ui/crafting/` directory with 12 files: `craftingConstants.ts`, `craftingHelpers.ts`, `MaterialPill.tsx`, `ProfessionSelector.tsx`, `XpBar.tsx`, `MaterialsPanel.tsx`, `RefinePanel.tsx`, `ComponentCraftPanel.tsx`, `CraftPanel.tsx`, `CraftingSearchBar.tsx`, `CraftLog.tsx`, `CraftOutputPanel.tsx`, `MaterialDetailModal.tsx`. CraftingScreen.tsx reduced to ~65 lines. Typography bumped (`text-[8px]` → `text-[10px] sm:text-xs`), mobile grid improved (`grid-cols-4 sm:grid-cols-5 md:grid-cols-6`), profession selector gains `flex-wrap`, catalyst dropdowns stack on mobile.
- **Phase 2 — Search, Filters, Collapsed Recipes**: `CraftingSearchBar` with text search + "Have Mats" toggle + count display. Recipes collapsed by default (click to expand). Expand All/Collapse All buttons. Green/red craftable dot on collapsed headers. Level-locked recipes show "Lv.X" badge instead of opacity-50.
- **Phase 3 — Craft Log + Craft Output Panel**: `CraftLogEntry` type (ephemeral, reset on rehydrate). All 6 craft store actions (`refineMaterial`, `refineMaterialBatch`, `craftComponent`, `craftComponentBatch`, `craftRecipe`, `craftRecipeBatch`) populate the log. `craftOutputBuffer: Item[]` (persisted, max 8 slots) — crafted gear lands here first; overflow goes to inventory with auto-salvage. Claim/Salvage actions for individual or all items. `CraftOutputPanel` renders at top of Craft tab with ItemCard compact view.
- **Phase 4 — Material Traceability**: `materialTraceability.ts` builds static reverse indexes from all data files (zones, mob types, refinement, component, gear recipes). `MaterialDetailModal` opens on any material click — shows drop sources (zones + mobs), produced by, and used in recipes. Wired through all panels via `onMaterialClick` prop.
- **Save version**: v33 → v34 (migration adds `craftOutputBuffer: []`)
- **New files**: `src/ui/crafting/` (12 files), `src/data/materialTraceability.ts`
- **Modified files**: `src/ui/screens/CraftingScreen.tsx`, `src/store/gameStore.ts`, `src/types/index.ts`, `src/data/balance.ts`

**Previous: Sprint 13B-Phase2B-1: State-Tracking Combat Systems** — COMPLETE.

- **Purpose**: Wire the complex state-tracking combat mechanics into `tickCombat`. These are self-contained systems that track ephemeral state across ticks (ramping stacks, fortify stacks, temp buffs, charges). Foundation for Phase 2B-2 (evaluation systems: conditionals, procs, debuff interactions).
- **4 systems wired**:
  - **Ramping Damage**: Global combat momentum — stacks accumulate on hits, reset on miss. Damage bonus scales with `perHit * stacks`. Decays after `decayAfter` seconds idle.
  - **Fortify on Hit**: Defensive stacks accumulate on hit, all expire together. `calcFortifyDR()` module-level helper computes DR capped at 75%. Applied at all 4 incoming damage sites (helper + main path, boss + clearing).
  - **Temp Buffs**: `aggregateTempBuffEffects()` helper in `unifiedSkills.ts`. Filters expired buffs, stack-scales multiplicative fields (`1 + (mult-1)*stacks`), merges with ability effect. Nothing creates TempBuffs yet (2B-2 procs will).
  - **Charge System**: Per-skill charges via `skillCharges`. Pre-roll: `perChargeCritChance`, `perChargeDamage`. Post-roll: gain on hit/crit/kill, spend-all mechanic (burst damage per charge), decay per tick. `chargeSpendDamage` applied to both boss and clearing paths.
- **5 new GameState fields**: `rampingStacks`, `rampingLastHitAt`, `fortifyStacks`, `fortifyExpiresAt`, `fortifyDRPerStack`
- **2 new helpers**: `aggregateTempBuffEffects()` (unifiedSkills.ts), `calcFortifyDR()` (gameStore.ts module-level)
- **2 new balance constants**: `FORTIFY_MAX_STACKS=20`, `FORTIFY_MAX_DR=0.75`
- **Safety**: All changes guarded by `if (graphMod?.field)`. No existing graphs use these fields, so behavior is identical.
- **No save migration**: All new fields are ephemeral (reset on rehydrate).
- **Save version**: v33 (unchanged)
- **Files modified**: `src/types/index.ts`, `src/data/balance.ts`, `src/engine/unifiedSkills.ts`, `src/store/gameStore.ts`, `docs/PROJECT_STATUS.md`, `docs/SKILL_TREE_DESIGN.md`
- **Also fixed**: Pre-existing unused import errors in `MaterialPill.tsx` and `MaterialsPanel.tsx`.
- **Next**: Phase 2B-2 — Evaluation systems (conditionals, procs, debuff interactions).

**Previous: Sprint 13B-Phase2A: Wire Phase 1 Types Into Combat** — COMPLETE.

- **Purpose**: Make the ~25 new `SkillModifier` fields and 6 new debuffs from Sprint 13A-Phase1 actually DO things in real-time combat. All fields were type-only; now they modify the combat tick.
- **Damage pipeline** (`unifiedSkills.ts`): `damageFromArmor/Evasion/MaxLife` add flat damage from stats; `chainCount/pierceCount/forkCount` add bonus hits (idle simplification: full damage per bounce).
- **Enemy debuff helper**: `calcEnemyDebuffMods()` computes `damageMult`, `missChance`, `atkSpeedSlowMult` from active debuffs (Weakened/Blinded/Slowed). Applied at all 4 incoming damage sites (applyBossDamage helper, applyZoneDamage helper, boss main path, clearing main path).
- **Post-roll outgoing modifiers**: Expanded debuff damage amp to include `reducedResists` (Cursed) and `incCritDamageTaken` (Vulnerable). Added execute threshold (2x damage below HP%). Added berserk damage bonus (scales with missing HP%).
- **Leech rework**: Replaced flag-based `hasLifeLeech` with unified `totalLeech = base + flag + graphMod.leechPercent`. `cannotLeech` overrides all. Added `effectiveMaxLife` for `reducedMaxLife` keystone. Added `lifeOnHit`, `lifeOnKill`, `selfDamagePercent`.
- **Incoming damage modifiers**: `increasedDamageTaken` keystone and berserk `damageTakenIncrease` multiply incoming damage at both boss and clearing sites.
- **Overkill bonus**: `overkillDamage` graph field amplifies overkill carry to next mob.
- **Ephemeral state tracking**: 7 fields now tracked per tick — `consecutiveHits`, `lastSkillsCast`, `killStreak`, `lastOverkillDamage`, `lastCritAt`, `lastBlockAt`, `lastDodgeAt`. Spread into all 5 `set()` calls in the main combat path. Foundation for Phase 2B conditionals.
- **Safety**: All changes guarded by `if (graphMod?.field)` or `if (debuffDef?.effect.field)` — existing graphs with none of these fields produce identical behavior.
- **No save migration**: No new persisted state. Ephemeral fields reset on rehydrate.
- **Save version**: v33 (unchanged)
- **Files modified**: `src/engine/unifiedSkills.ts`, `src/store/gameStore.ts`, `docs/PROJECT_STATUS.md`, `docs/SKILL_TREE_DESIGN.md`
- **Deferred to Phase 2B**: Conditional modifiers, proc system, charge system, debuff interactions, temp buffs, fortify, ramping damage.

**Previous: Sprint 13B: Component Crafting System** — COMPLETE.

- **Purpose**: Bridge combat drops into the crafting pipeline. Previously, 90 mob-specific drops + 18 band-tiered generic drops + 5 cross-band rares had zero crafting uses. Components create an intermediary layer: Gather → Refine + Kill Mobs → Craft Components → Craft Gear.
- **65 new component recipes**: 30 general (5 professions × 6 bands), 30 specialist (5 professions × 6 bands), 5 masterwork (alchemist)
- **Mob drop curation**: All 90 mob-specific drops curated into 5 profession groups per band (WS=sharp/offensive, AR=protective/rigid, LW=flexible/organic, TA=fine/magical, JE=exotic/crystalline)
- **General components**: Use common generic mob drops + refined materials. Cheap, mass-producible.
- **Specialist components**: Use mob-specific drops (anyOf 3) + refined materials + uncommon generics. Targeted farming.
- **Masterwork components** (alchemist): Use cross-band rares. Premium substitutes for T5-T6 specialist components.
- **All existing gear recipes modified**: T1=1 general, T2-T3=1 general+1 specialist, T4-T5=2 specialist, T6=2 specialist+1 general
- **New UI**: "Components" sub-tab in Crafting (between Refine and Craft). Profession selector → band-grouped recipe cards → mob drop picker for specialists. Materials panel shows component section. Craft panel shows component costs as teal pills.
- **New types**: `ComponentRecipeDef`, `ComponentVariant`, `componentCost` field on `CraftingRecipeDef`
- **New files**: `src/data/componentRecipes.ts`, `src/engine/componentCrafting.ts`
- **Modified files**: `src/types/index.ts`, `src/data/balance.ts`, `src/data/craftingRecipes.ts`, `src/engine/craftingProfessions.ts`, `src/store/gameStore.ts`, `src/ui/screens/CraftingScreen.tsx`
- **Save version**: v32 → v33 (no-op migration, components stored as materials in existing dict)

**Previous: Sprint 13A-Phase1: Skill Tree Types & Engine Expansion** — COMPLETE.

- **Purpose**: Lay the type foundation for the Skill Tree Design Framework (`docs/SKILL_TREE_DESIGN.md`). All new interfaces, expanded existing types, new debuffs, and ephemeral combat state. No gameplay changes yet (Phase 2 wires these into the combat tick).
- **6 new types**: `TriggerCondition`, `ConditionalModifier`, `SkillProcEffect`, `DebuffInteraction`, `SkillChargeConfig`, `TempBuff`
- **~25 new SkillModifier fields**: Conditional/proc (`conditionalMods`, `procs`, `debuffInteraction`, `chargeConfig`), defensive-offensive (`damageFromArmor/Evasion/MaxLife`, `leechPercent`, `lifeOnHit/Kill`, `fortifyOnHit`), conversion/transform (`chainCount`, `forkCount`, `pierceCount`, `splitDamage`, `addTag/removeTag`), momentum (`rampingDamage`, `executeThreshold`, `overkillDamage`), risk/reward (`selfDamagePercent`, `cannotLeech`, `reducedMaxLife`, `increasedDamageTaken`, `berserk`)
- **6 new debuffs**: Bleeding (DoT, stacks 5), Weakened (reduced damage dealt), Blinded (miss chance), Vulnerable (increased crit damage taken), Cursed (resist reduction, stacks 3), Slowed (reduced attack speed)
- **5 new DebuffDef.effect fields**: `reducedDamageDealt`, `missChance`, `incCritDamageTaken`, `reducedResists`, `reducedAttackSpeed`
- **9 ephemeral GameState fields**: `consecutiveHits`, `lastSkillsCast`, `lastOverkillDamage`, `killStreak`, `lastCritAt/BlockAt/DodgeAt`, `tempBuffs`, `skillCharges`
- **Resolver expansion**: `ResolvedSkillModifier` + `EMPTY_GRAPH_MOD` + `resolveSkillGraphModifiers` all expanded to handle new fields with proper resolution strategies (additive, max-wins, boolean OR, array collectors, last-wins)
- **Tooltip support**: `formatModifier()` in SkillGraphView displays all new fields
- **No save migration needed**: All new GameState fields are ephemeral (reset on rehydrate)
- **No gameplay changes**: All new fields are optional, existing 9 wand skill graphs continue working unchanged
- **Save version**: v32 (unchanged)
- **Edited files**: `src/types/index.ts`, `src/store/gameStore.ts`, `src/engine/skillGraph.ts`, `src/data/debuffs.ts`, `src/ui/components/SkillGraphView.tsx`

**Previous: Sprint 13A: Cooldown-Aware Combat Stats** — COMPLETE.

- **Problem**: Three stats were broken or meaningless after the skill-based cooldown rework:
  1. Attack/Cast Speed was a raw DPS multiplier (`dps = (dmg/castTime) * speed`) that didn't interact with cooldowns — mathematically identical to %increased damage.
  2. Ability Haste existed on gear but was never used in any cooldown calculation — completely dead stat.
  3. Offline DPS only used skill slot 1, ignoring skills 2-5. Real-time rotation worked but offline was wrong.
  4. Real-time cooldown timer used raw `skill.cooldown`, ignoring graph CDR nodes.
- **Core formula change**: DPS is now cooldown-aware: `dps = dmgPerCast / max(castInterval, effectiveCooldown)`. Speed compresses cast time & GCD (orthogonal to cooldowns). Ability haste compresses cooldowns with LoL-style diminishing returns: `cd / (1 + haste/100)`.
- **New constants**: `BASE_GCD = 1.0` (base GCD before speed), `GCD_FLOOR = 0.4` (absolute minimum interval).
- **`getSkillEffectiveCooldown()`**: Now accepts `abilityHaste` param. Applies haste after graph CDR.
- **`calcSkillCastInterval()`**: Returns `max(castTime/speed, BASE_GCD/speed, GCD_FLOOR)` — speed compresses the GCD too.
- **`calcSkillDps()`**: Rewritten. Computes `cycleTime = max(castInterval, effectiveCooldown)` as denominator. Accepts `graphMod` for CDR/crit bonuses and `atkSpeedMult` for ability multipliers.
- **`calcRotationDps()`**: New function. Sums individual DPS across all equipped active skills.
- **`calcPlayerDps()`**: Now accepts full skill bar + progress for rotation DPS. All 5 skill slots contribute.
- **Real-time combat fixes**: Cooldown timer applies graph CDR + ability haste. GCD uses `castInterval` directly (already includes floor logic). Removed redundant `ACTIVE_SKILL_GCD` usage.
- **UI**: Ability Haste stat shows effective CDR% (e.g. `50 (33.3% CDR)`). SkillBar cooldown sweep uses effective cooldown. CharacterScreen shows "Rotation DPS" across all skills.
- **Stat fantasy**: Speed = "I swing/cast faster" (cast animation bottleneck). Haste = "Skills recharge faster" (cooldown bottleneck). Early game: haste > speed. Late game: both matter.
- **Edited files**: `src/data/balance.ts` (+6), `src/engine/unifiedSkills.ts` (+40 net), `src/engine/zones.ts` (refactored), `src/store/gameStore.ts` (timer fixes), `src/ui/components/SkillBar.tsx` (cooldown display), `src/ui/screens/CharacterScreen.tsx` (rotation DPS + haste CDR%).
- **No save migration needed**: All changes are to combat formulas and display (no persisted state changes).
- **Save version**: v32 (unchanged).

**Previous: Sprint 12B/12C/12D + hotfix: Enhanced Drops + Daily Quests** — COMPLETE.
- **Bug**: Random mob mode always displayed the zone's default mob name and never changed between kills. Mob kills in random mode didn't count toward daily kill quests.
- **Root cause**: No ephemeral state tracked which mob was actually being fought. `processNewClears` called `simulateSingleClear` which picked its own independent random mob, disconnected from the visual mob and quest tracking.
- **Fix**: Added `currentMobTypeId` ephemeral state. On each mob death, a new weighted-random mob is picked (or targeted mob reused). MobDisplay shows the actual mob name/drops. `processNewClears` passes `currentMobTypeId` to `simulateSingleClear` so drops + quest progress match the mob being fought. HP multipliers now correctly apply in random mode too.

- **Enhanced drop tables**: Each mob now has 2-5 drops with independent roll chances instead of 1 flat 25% unique drop. Drops have `common`/`uncommon`/`rare` rarity tiers with color-coded UI. ~25 new band-tiered crafting materials (frayed_cloth, woven_sinew, spectral_thread, etc.) plus 5 cross-band rares.
- **Drop table builder**: `buildMobDropTable()` helper generates drops based on mob's unique material, band, spawn weight, and theme (beast/insectoid/construct/elemental/undead/humanoid). Common mobs get 3-4 drops, rare mobs get 4-5 with better chances.
- **Drop engine**: `rollMobDrops(mob)` helper rolls each drop independently. Replaces flat `MOB_UNIQUE_DROP_CHANCE` in both `simulateSingleClear` and `simulateIdleRun`.
- **Daily quest system**: 3 quests per accessible band (kill_mob, clear_zone, defeat_boss). Quests reset daily at midnight UTC with seeded RNG (same quests for all players). Progress tracks mob kills, zone clears, and boss defeats in real-time and offline.
- **Quest rewards**: Gold + XP per quest, scaled by band. Kill quests get 1.5x, boss quests get 2x. Band 3+ adds augment orbs, Band 5+ adds chaos orbs.
- **Quest UI**: Collapsible DailyQuestPanel on ZoneScreen with progress bars, claim buttons (green glow/pulse), reward preview, countdown to reset. Quests grouped by band.
- **Balance**: Kill quests 150-500 kills, clear quests 100-300 clears, boss quests 5-20 kills (30-90 min per band). Targeted farming synergizes with kill quests.
- **New files**: `src/data/mobDropHelpers.ts`, `src/engine/dailyQuests.ts`, `src/ui/components/DailyQuestPanel.tsx`
- **Edited files**: `src/types/index.ts` (+50 lines: MobDrop, MobDropRarity, quest types, DailyQuestState), `src/data/balance.ts` (+15 lines: quest constants), `src/data/mobTypes.ts` (90 mobs → drops[]), `src/engine/zones.ts` (+15 lines: rollMobDrops), `src/store/gameStore.ts` (+100 lines: quest actions, progress tracking, migration), `src/ui/screens/ZoneScreen.tsx` (+15 lines: drop table UI, quest panel)
- **Save version**: v30 → v32

**Previous: Sprint 12A: Mob Types + Targeted Farming** — COMPLETE.

- **Mob type system**: Each zone now has 3 distinct mob types with spawn weights (50/35/15), hpMultipliers (1.0/0.9/1.15), unique drop materials, and flavor text. ~90 mob types across 30 zones.
- **Targeted farming**: Players can select a specific mob type to farm (guaranteed that mob spawns) or farm randomly (weighted selection). Mob selector panel on ZoneScreen shows all mob types with kill counts and unique drops.
- **Mob-unique drops**: Each mob type has 1 unique material drop at 25% chance per clear (`MOB_UNIQUE_DROP_CHANCE`). Materials flow into the same `materials` pool.
- **Kill tracking**: `mobKillCounts`, `bossKillCounts`, `totalZoneClears` persisted in GameState. Kill counts shown in mob selector UI.
- **hpMultiplier**: `calcMobHp()` now accepts optional `hpMultiplier`. Targeted mob's HP multiplier applied on run start, mob respawn, target switch, and recovery.
- **Engine changes**: `simulateSingleClear` resolves mob type (targeted or weighted random), rolls unique drops, returns `mobTypeId` in `SingleClearResult`. `simulateIdleRun` also rolls mob-unique drops per clear.
- **Store changes**: `setTargetedMob` action (recalculates mob HP mid-run), `processNewClears` passes `targetedMobId` and tracks mob/zone kill counts, `handleBossVictory` increments `bossKillCounts`.
- **UI changes**: Mob type selector panel on ZoneScreen (below stats, above Start). MobDisplay shows targeted mob name + unique drop indicator. ZoneDefeatOverlay uses targeted mob name.
- **New files**: `src/data/mobTypes.ts` (~840 lines)
- **Edited files**: `src/types/index.ts` (+13 lines), `src/data/balance.ts` (+8 lines), `src/engine/zones.ts` (+30 lines), `src/engine/unifiedSkills.ts` (+1 line), `src/store/gameStore.ts` (+35 lines), `src/ui/screens/ZoneScreen.tsx` (+55 lines)
- **Save version**: v29 → v30

**Previous: Sprint 11B-Polish: Skill Graph Tree — Cooler Nodes + Better UX** — COMPLETE.

**Previous: Sprint 11B: Per-Skill Graph Trees (Wand Prototype)** — COMPLETE.

- **Branching graph skill trees**: Replaced linear 3-path skill trees with PoE-style branching graph trees. Prototype with all 9 wand skills (6 active + 3 buff/passive). ~35 nodes per tree, ~315 total nodes.
- **3 node types**: Minor (small stat bumps), Notable (medium bonuses), Keystone (build-defining mechanics). Start node auto-available, must path through connected nodes.
- **Points**: 1 point per skill level, max 20 points, ~35 nodes per tree (~57% fillable). Points = `level - allocatedNodes.length`.
- **New SkillModifier system**: Richer than old `Partial<AbilityEffect>`. Supports: `incDamage`, `flatDamage`, `incCritChance`, `incCritMultiplier`, `incCastSpeed`, `extraHits`, `durationBonus`, `cooldownReduction`, element conversion, AoE conversion, debuff application, proc on hit, flags (pierce/fork/alwaysCrit/cannotCrit/lifeLeech/ignoreResists).
- **Debuff system**: 4 debuff types (chilled +10% dmg taken, shocked +15% dmg/stack x3, burning fire DoT, poisoned chaos DoT x10 stacks). Applied via keystone/notable graph nodes. Debuffs tick in real-time combat, cleared on mob/boss death.
- **Element conversion**: Keystones can convert skill elements (e.g., Cold→Fire), changing which %increased stats apply to the skill.
- **AoE conversion**: Keystones can add AoE tag to single-target skills, enabling %incAoEDamage scaling.
- **Cross-skill synergy**: Debuffs from one skill increase damage from all skills (e.g., Frostbolt chill → Chain Lightning deals more damage).
- **Wand skill tree themes**: Magic Missile (raw dmg/crit/speed), Chain Lightning (shock/lightning), Frostbolt (chill/cold/crit), Searing Ray (burn/fire/DoT), Essence Drain (poison/chaos/leech), Void Blast (raw dmg/conversion/crit), Chain Lightning Buff (duration/loot), Time Warp (duration/clear speed), Mystic Insight (XP/items/materials).
- **Coexistence**: `skill.skillGraph` → new graph system. `skill.skillTree` (no skillGraph) → old 3-path system. Non-wand weapons unchanged.
- **Engine**: `src/engine/skillGraph.ts` (pure functions: resolve modifiers, can-allocate adjacency check, allocate, respec, respec cost). `calcSkillDamagePerCast` and `rollSkillCast` accept optional `ResolvedSkillModifier` for graph bonuses. `resolveSkillEffect`, `getSkillEffectiveDuration`, `getSkillEffectiveCooldown` branch on graph vs old tree.
- **Store**: `allocateAbilityNode` and `respecAbility` branch for graph trees (use `skillProgress` directly, not `abilityProgress`). `tickCombat` resolves graph modifier, applies debuff damage amp, applies new debuffs on hit, ticks debuff durations/DoT, handles life leech flag. Graph respec preserves XP/level (cost: `50 * level^2`).
- **UI**: `SkillGraphView.tsx` — SVG visualization with tiered layout, connection lines, diamond keystones, circle minors/notables. Color coding: gray=locked, green=available, purple=allocated, gold=keystone. Collapsible tier-based list view for mobile. Tooltip on hover. `SkillPanel.tsx` branches to `SkillGraphView` for graph skills, old `SkillTreeView` for non-graph skills. "Tree" button now shows for active skills with graph trees too.
- **New files**: `src/engine/skillGraph.ts`, `src/data/debuffs.ts`, `src/data/skillGraphs/wand.ts`, `src/ui/components/SkillGraphView.tsx`.
- **Edited files**: `src/types/index.ts` (+80 lines: SkillGraphNode, SkillGraph, SkillModifier, DebuffDef, ActiveDebuff, etc.), `src/engine/unifiedSkills.ts` (+80 lines), `src/data/unifiedSkills.ts` (+10 lines), `src/store/gameStore.ts` (+100 lines), `src/ui/components/SkillPanel.tsx` (+5 lines).
- **Save version**: v28 → v29 (migration clears wand skill allocations, preserves XP/level, inits activeDebuffs).
- **Zero-allocation identity**: With 0 nodes allocated on a graph tree, behavior identical to pre-sprint.

**Previous: Sprint 11A: Class Talent Trees** — COMPLETE.

- **Class-wide passive talent trees**: Each of the 4 classes (Warrior, Mage, Ranger, Rogue) gets a talent tree with 3 thematic paths and 8 nodes each (96 total nodes). Tier 4 nodes are build-defining keystones (`isPathPayoff`).
- **Warrior paths**: Blood (sustain/defense), Iron (armor/resist), Fury (damage/crits).
- **Mage paths**: Arcane (burst/charges), Elements (elemental damage/resist), Mind (XP/knowledge).
- **Ranger paths**: Predator (damage/crits), Warden (evasion/defense), Pathfinder (loot/materials).
- **Rogue paths**: Shadow (crit/burst), Swiftness (clear speed), Cunning (item find/utility).
- **Points**: 1 talent point per character level. Available = `level - allocated`.
- **Respec**: Full respec costs `25 * level` gold. Clears all allocations.
- **Keystones**: `doubleClears`, `ignoreHazards`, large damage/defense multipliers (1.25-1.50x), combined stat bonuses.
- **Integration**: `getFullEffect()` helper merges skill bar effects + class talent effects via `mergeEffect()`. Replaced all 12 `aggregateSkillBarEffects()` call sites in gameStore, including offline progression.
- **UI**: `ClassTalentPanel` on CharacterScreen (collapsible, 3-path tabs, class-themed colors, keystone highlighting, points counter, respec button).
- **New files**: `src/data/classTalents.ts` (96 node definitions), `src/engine/classTalents.ts` (pure functions), `src/ui/components/ClassTalentPanel.tsx`.
- **Edited files**: `src/types/index.ts` (added `talentAllocations`), `src/store/gameStore.ts` (actions, helper, migration), `src/ui/screens/CharacterScreen.tsx` (panel integration).
- **Save version**: v27 → v28 (migration adds `talentAllocations: []`).
- **Zero-allocation identity**: When no talents allocated, behavior is identical to pre-sprint.

**Next sprint TBD.** Potential: per-skill graph trees for non-wand weapons, skill discovery/unlocks, zone mastery, crafting expansion.

**Sprint 10R: Boss Damage Smoothing — Prevent One-Shots** — COMPLETE (previous).

- **Problem**: Boss damage scaled with `band²` while player HP scaled linearly. At-level boss fights were coin-flip one-shots (72 raw damage vs ~200 HP).
- **Boss damage variance**: Normal hits roll `0.6x–1.0x` base damage (avg 80%). Replaces flat damage per hit.
- **Boss crits**: 15% chance per attack, deals `1.5x` base damage. Provides danger spikes without constant lethality.
- **Damage cap**: `BOSS_MAX_DMG_RATIO = 0.40` — no single boss hit can exceed 40% of player maxHP after defense pipeline. Guarantees 3+ hits to kill even with zero defense.
- **Base damage reduced**: `BOSS_DMG_PER_HIT_BASE` 8→6. Combined with 80% avg variance, effective base drops from 72→43.2 at band 3.
- **Boss attack floaters**: Boss hits now show damage floaters during boss fights (same pattern as zone attack floaters from 10Q). Boss crits render in bright red + larger text (`text-base`).
- **New balance constants**: `BOSS_CRIT_CHANCE = 0.15`, `BOSS_CRIT_MULTIPLIER = 1.5`, `BOSS_MAX_DMG_RATIO = 0.40`.
- **CombatTickResult extended**: New field `bossAttack?: { damage, isDodged, isBlocked, isCrit }`.
- **FloaterEntry extended**: New `isBossCrit?: boolean` for distinct boss crit styling.
- **Both boss attack paths updated**: `applyBossDamage` helper (GCD/idle ticks) and boss_fight skill-fire path both apply variance + crit + cap.
- **No save migration needed**: All changes are to combat mechanics (ephemeral state).
- **Save version**: v27 (unchanged).

**Next sprint TBD.** Potential: mob type differentiation, skill discovery/unlocks, zone mastery system.

**Sprint 10Q: Real-Time Zone Defense + Swing Timer** — COMPLETE (previous).

- **Real-time zone defense**: Zone attacks now happen via `tickCombat()` every `ZONE_ATTACK_INTERVAL` (2.0s), replacing batched `simulateClearDefense()` that ran at clear completion. Uses `rollZoneAttack()` pipeline (dodge/block/armor/resist). Wired into all 4 clearing code paths (GCD gap, all skills on CD, no skill found, normal clearing).
- **New ephemeral state**: `zoneNextAttackAt: number`. Init in `startIdleRun`, reset on stop/rehydrate/boss start, re-init on recovery complete.
- **Balance retuning**: `ZONE_ATTACK_INTERVAL` 1.0→2.0s, `ZONE_DMG_BASE` 8→6, `MAX_REGEN_RATIO` 0.40→0.50, `LEECH_PERCENT` 0.03→0.04. ~62% less total zone damage per clear.
- **Enemy swing timer**: Orange progress bar on MobDisplay and BossFightDisplay. Fills over attack interval, resets on attack.
- **Enemy damage floaters**: "DODGE" (blue), blocked damage (orange), hit damage (red). Extended `FloaterEntry` with `isEnemyAttack`, `isDodged`, `isBlocked`.
- **CombatTickResult extended**: `zoneAttack?: { damage, isDodged, isBlocked }` and `zoneDeath?: boolean`.

**Sprint 10O: Per-Hit Defense System** — COMPLETE (previous).

- **Per-hit defense pipeline**: `rollZoneAttack()` rolls each incoming attack through dodge→block→armor→resist. `simulateClearDefense()` for offline/batched. `calcBossAttackProfile()` computes per-hit boss stats.
- **BossState expanded**: `bossDamagePerHit`, `bossAttackInterval`, `bossNextAttackAt`, `bossAccuracy`, `bossPhysRatio`.
- **Boss per-hit attacks**: `applyBossDamage()` helper in `tickCombat()` checks `bossNextAttackAt` timestamp, fires through `rollZoneAttack()`. Life leech (`LEECH_PERCENT`), regen cap (`MAX_REGEN_RATIO`).
- **7 new balance constants**: `ZONE_ATTACK_INTERVAL`, `ZONE_DMG_BASE`, `ZONE_PHYS_RATIO`, `BOSS_DMG_PER_HIT_BASE`, `BOSS_ATTACK_INTERVAL`, `LEECH_PERCENT`, `MAX_REGEN_RATIO`.
- **Removed**: `applyNormalClearHp`, `calcDamagePerClear`, `calcRegenPerClear`, `calcBossDps`, `CLEAR_DAMAGE_RATIO`, `BOSS_DPS_BASE`, `BOSS_DPS_ZONE_FACTOR`, `BOSS_DAMAGE_MULTIPLIER`.

**Sprint 10N: Skill XP + Passive Points** — COMPLETE (previous).

- All skills earn XP (removed `kind === 'active'` filter). Max level 10→20. Quadratic XP curve. Level badges on all skill bar slots. SkillPanel XP display for active skills.

**Sprint 10M: Multi-Skill Rotation (Foundation)** — COMPLETE (previous).

- **Cooldown-based rotation**: All active skills have individual cooldowns (3s basic → 6s specialist, 8-12s finishers). `getNextRotationSkill()` iterates skill bar in slot-priority order, fires first off-CD skill.
- **`ACTIVE_SKILL_GCD` (1.0s)**: Independent from buff auto-cast GCD. `nextActiveSkillAt` replaces `lastSkillCastAt`.
- **Active skill CD overlay**: `conic-gradient` sweep + remaining CD text on SkillBar slots.
- **v27 migration**: Renames ephemeral field, ensures active skill timer entries exist.

**Sprint 10L: Cooldown UI + Visual Polish** — COMPLETE (previous).

- **Floater bug fixes (10K-B2 followup)**: Damage floaters centered above mob display (`left: 50%` + `translateX(-50%)`), no longer scattered randomly across HP bar. Staggered vertically by index to prevent overlap.
- **Damage rounding**: Floaters and combat log show whole numbers (`Math.round`), not raw decimals.
- **Cooldown sweep overlay**: Buff/instant/ultimate skill slots show a dark `conic-gradient` wedge during cooldown. Wedge shrinks clockwise as CD expires.
- **Active buff sweep**: Active buffs show golden tint sweep that shrinks as duration expires.
- **Cast bar deferred**: No channeled skill `kind` exists yet. Revisit when channel mechanics added.
- **No new CSS/animations needed**: Sweeps use inline `conic-gradient` styles.
- **No store/engine/type changes**: Pure UI changes, no save migration.
- **Bundle size**: ~500 kB.

**Sprint 10K-B2: Combat Visual Feedback** — COMPLETE (previous).

- **Skill slot flash**: Active skill slot glows gold on each cast via CSS `skill-flash` animation (0.4s). Uses React key trick to re-trigger on repeat fires.
- **Damage floaters**: Numbers float up from mob/boss display area. White=hit, yellow+large=crit, gray="MISS". Capped at 5 active, auto-removed after 1s.
- **Combat log**: Shows last 5 entries (stores 20). Format: `SkillName damage [CRIT]` or `SkillName MISS`. Compact monospace display between combat stats and skill bar.
- **BossFightDisplay cleanup**: Removed "Your DPS" line (obsolete with skill-based combat). Shows only "Boss DPS" centered.
- **New file**: `src/ui/components/DamageFloater.tsx` — `FloaterEntry` interface + `DamageFloaters` component.
- **All visual state is ephemeral React state** — no store changes, no save migration.
- **Bundle size**: ~500 kB.

**Sprint 10K-B1: Boss Unification into tickCombat** — COMPLETE (previous).

- **Boss fights now use per-hit skill model**: `tickCombat()` handles both `clearing` and `boss_fight` phases. Player attacks boss via `rollSkillCast()` (same accuracy/crit/variance as normal mobs). Boss deals continuous `bossDps * dtSec` damage to player.
- **Dead code removed**: `tickBossFight()`, `BossTickResult` interface (engine/zones.ts), `tickBoss` store action — all deleted.
- **CombatTickResult extended**: New fields `isHit: boolean` and `bossOutcome?: 'ongoing' | 'victory' | 'defeat'`.
- **Boss damage between casts**: Even when skill isn't ready to fire, boss still damages player each tick (handled in early return path).
- **`startBossFight` sets `lastSkillCastAt`**: Ensures first skill cast fires immediately when boss fight begins.
- **ZoneScreen updated**: `boss_fight` block calls `tickCombat(dtSec)` and checks `bossOutcome` instead of old `tickBoss(dt)` + `result.outcome`.
- **Bundle size**: 497 kB.

**Sprint 10K-A: Real-Time Combat Engine** — COMPLETE (previous).

- **Real-time combat tick**: New `tickCombat()` store action fires active skill on cast interval, tracks mob HP, returns kills per tick. Called every 250ms from ZoneScreen timer loop.
- **Engine functions**: `calcSkillCastInterval()` computes speed-adjusted cast time, `rollSkillCast()` rolls hit/miss/crit with +/-10% variance. Both in `engine/unifiedSkills.ts`.
- **3 ephemeral state fields**: `currentMobHp`, `maxMobHp`, `lastSkillCastAt` — reset on rehydrate, no save migration needed.
- **Mob HP bar is real**: MobDisplay now shows actual HP draining per skill cast (was time-based progress approximation).
- **Combat mode only**: Gathering mode untouched (keeps time-based model). Offline progression untouched. Boss fights untouched.
- **Safety cap**: 10 kills/tick maximum to prevent infinite loops on very fast clears.
- **New type**: `CombatTickResult` interface. New constant: `COMBAT_TICK_INTERVAL = 250`.
- **Bundle size**: 497 kB.

**Sprint 10J: Cleanup Old Systems** — COMPLETE (previous).

**Sprint 10I: Auto-Cast Engine + Priority** — COMPLETE (previous).

**Sprint 10H: Skill Bar UI** — COMPLETE (previous).

- **New `SkillBar.tsx` component**: 8-slot horizontal bar replacing old `AbilityBar`. Reads from unified `skillBar`/`skillProgress`/`skillTimers`. Smaller slots (w-14 h-14) for mobile fit. Kind-based border colors (active=yellow, passive=gray, buff=blue, toggle=green, instant=orange, ultimate=yellow, proc=purple). Timer display with 250ms refresh. XP bars at bottom. Slots 5-7 show locked "Soon". Slots 1-4 use `ABILITY_SLOT_UNLOCKS` progression.
- **Rewritten `SkillPanel.tsx`**: Unified skill browser showing all skill kinds. Equipped bar overview (compact 5-slot strip with select-to-target). Kind filter tabs (All/Active/Buff/Passive/Toggle/Instant). Available skills grid with DPS comparison for active skills. Inline skill tree management via `SkillTreeView` local component. Equip/unequip via unified `equipToSkillBar`/`unequipSkillBarSlot`.
- **ZoneScreen updated**: `AbilityBar` → `SkillBar`, `AbilityPicker` → `SkillPicker`. Old `AbilityPicker` (~135 lines) and `ZoneSkillTreeView` (~75 lines) removed. New `SkillPicker` is simpler (~80 lines) — shows available skills with slot equip buttons, no tree management. SkillBar now visible during boss fights too.
- **CharacterScreen updated**: Removed `AbilityPanel` (~170 lines), `SkillTreeView` (~120 lines), `KIND_BADGE_COLORS`, `WEAPON_TYPE_LABELS`, `WEAPON_TYPE_ICONS`. Updated `SkillPanel` handles everything.
- **Bundle size reduced**: 496 kB (was 502 kB) — net reduction despite new components.
- **Old `AbilityBar.tsx` still exists**: Not imported anywhere. Will be removed in Sprint 10J cleanup.

**Sprint 10G: Skill Bar Store + Migration v25** — COMPLETE (previous).

- **3 new GameState fields**: `skillBar: (EquippedSkill | null)[]` (8 unified slots), `skillProgress: Record<string, SkillProgress>`, `skillTimers: SkillTimerState[]`
- **4 new store actions**: `equipToSkillBar`, `unequipSkillBarSlot`, `toggleSkillAutoCast`, `reorderSkillBar` — with full validation, weapon/level checks, mid-clear recalc
- **Engine reads switched**: All 8 `aggregateAbilityEffects` calls replaced with `aggregateSkillBarEffects`. `computeNextClear` now uses `getPrimaryDamageSkill` with fallback to legacy `equippedSkills`
- **Ability XP bridged**: `processNewClears` writes XP to both `skillProgress` (unified) and `abilityProgress` (legacy) via reverse ID mapping
- **Old actions bridged**: `equipAbility`, `unequipAbility`, `toggleAbility`, `activateAbility`, `equipSkill`, `equipItem` (weapon change), `unequipSlot` (mainhand) all mirror writes to unified `skillBar`/`skillTimers`/`skillProgress`
- **v25 migration**: Populates `skillBar[0]` from `equippedSkills[0]`, `skillBar[1-4]` from `equippedAbilities[0-3]` with `ABILITY_ID_MIGRATION` ID remapping. Migrates progress, creates timers.
- **Rehydrate safety**: Null guards for all 3 new fields + stale skill timer cleanup
- Slot mapping: 0=active skill, 1-4=former abilities, 5-7=empty (future)

**Sprint 10A: Active Skills & Damage Tags (Foundation)** — COMPLETE (previous).
- **DamageTag type + ActiveSkillDef interface**: New `DamageTag` union (Attack/Spell/Melee/Projectile/AoE/DoT/Channel/Physical/Fire/Cold/Lightning/Chaos). `ActiveSkillDef` with baseDamage, weaponDamagePercent, spellPowerRatio, castTime, cooldown, hitCount, dotDuration, dotDamagePercent.
- **48 active skill definitions**: `src/data/skills.ts` — 6 skills per weapon type × 8 weapons (sword, axe, mace, dagger, staff, wand, bow, crossbow). Each weapon: 1 basic spammable, 1 fast/multi-hit, 1 AoE, 1 elemental variant, 1 utility, 1 cooldown nuke. Exports `ACTIVE_SKILL_DEFS`, `getSkillsForWeapon()`, `getSkillDef()`.
- **Tag-based DPS engine**: `src/engine/skills.ts` — `calcSkillDps()` uses PoE-style ADDITIVE `%increased`. Tag matching: Attack→incAttackDamage, Spell→incSpellDamage, Physical→incPhysDamage, Fire→incFireDamage+incElementalDamage, etc. Chaos intentionally has no incElementalDamage. DoT bonus: `(hitDmg * dotDmgPct * dotDuration) / castTime`. Also exports `getDefaultSkillForWeapon()`, `calcMobHp()`.
- **Wired into combat engine**: `calcPlayerDps()` in `engine/zones.ts` now uses `calcSkillDps()` when equippedSkills[0] set, auto-assigns default skill for weapon type if no skill set, falls back to legacy formula only if no weapon. All `calcClearTime` and `createBossEncounter` callers pass `equippedSkills`.
- **State + v24 migration**: `equippedSkills: (string | null)[]` added to GameState. `equipItem` auto-assigns default skill on weapon equip. `unequipSlot` clears skills on mainhand removal. Save v23→v24 migration auto-assigns default skill. Rehydrate auto-assigns if weapon equipped but skill missing.
- **Balance**: %increased is now ADDITIVE (PoE-style), not multiplicative. ~10-15% lower DPS at mid-game vs old formula. Mob HP model: `mobHp = baseClearTime * POWER_DIVISOR` (mathematically equivalent to old formula).
- **Next: Sprint 10B** — Full combat sim per clear (crits, dodges, misses, DoT ticks). See SPRINT_PLAN.md for detailed spec.

**Sprint 9D: Crafting Screen Polish** — COMPLETE (previous).
- **Material tooltips on recipe cards**: Material pills in recipe cards now wrapped in `<Tooltip>` with `getMatTooltip()`. Shows formatted material name + gathering source + zone locations on hover/tap. Gold pill also has tooltip.
- **Zone source info in tooltips**: Static reverse lookup `materialToZones` built from `ZONE_DEFS`. Raw material tooltips show "Found in: Zone1, Zone2". Refined material tooltips show "Source: Zone1, Zone2" (zones where the raw ingredient drops).
- **Formatted material names on zone cards**: Zone cards in combat mode now show "emberwood logs, ragged pelts" instead of raw IDs "emberwood_logs, ragged_pelts".
- **Batch crafting**: New `craftRecipeBatch` store action (follows `refineMaterialBatch` pattern). Loops up to N crafts, consumes materials/gold/catalysts per iteration, adds XP per craft, collects all items, single `addItemsWithOverflow()` call at end. "All" button on every recipe card (same style as Refine panel's "All" button). Flash message: "Crafted 5x Iron Sword (2 salvaged)" or "Brewed 10x Whetstone".
- Previous icon sprint + 9A/9B/9C changes still active.
- Next: Additional UX/UI polish or new features per SPRINT_PLAN.md

**Graphic Item Icons: Integration Sprint** — COMPLETE (previous).
- Previous 9A/9B/9C changes still active.

**Sprint 9C: Combat Difficulty Overhaul** — COMPLETE.
- **Level-based damage multiplier**: New `calcLevelDamageMult()` in `engine/zones.ts`. Underleveled: exponential damage increase (`1.12^delta`). Overleveled: linear reduction (`1 - delta*0.06`, floor 0.30). Applied to both normal clear damage and boss DPS.
- **Minimum unavoidable damage when underleveled**: When zone iLvl > player level, enforces minimum net damage per clear (`maxHp * 0.02 * levelDelta`). Prevents capped-resist immortality. 5 levels under = minimum 10% maxHp net loss per clear.
- **`lifeRegen` stat now functional in combat**: `calcRegenPerClear()` now adds `lifeRegen * clearTime` bonus regen from gear. Faster clears = less regen from lifeRegen (natural balance). The `lifeRegen` affix on gear finally does something.
- **Intra-band zone pressure scaling**: `calcDefensiveEfficiency()` now accepts optional `zoneILvlMin` to refine pressure within a band. Last zone in a band has ~40% more pressure than first zone. Band base iLvls: [1, 11, 21, 31, 41, 51].
- **Boss level scaling**: `calcBossDps()` multiplied by `calcLevelDamageMult()`. Underleveled boss fights are genuinely dangerous, overleveled are quick wins.
- **5 new balance constants**: `LEVEL_DAMAGE_BASE`, `OVERLEVEL_DAMAGE_REDUCTION`, `OVERLEVEL_DAMAGE_FLOOR`, `UNDERLEVEL_MIN_NET_DAMAGE`, `ZONE_ILVL_PRESSURE_SCALE`.
- Previous 9A/9B changes still active.

## What Is Working Right Now
The game is live on Vercel and playable locally at `http://localhost:5173/`. Core loop:
- Pick a zone from 30 zones displayed in horizontal band tabs (one band visible at a time)
- Start idle run — items drop into bags in real-time, gold/currencies/materials/bags auto-apply to state immediately
- When bags are full, gear drops auto-salvage into materials with a running tally displayed
- Session summary shows running totals: materials, currencies, items by rarity, gold, gathering XP, rare material finds
- Equip items (click Equip or right-click), sell gear for gold, disenchant for materials, craft with 6 currencies
- Auto-salvage filters items below chosen rarity threshold
- Band 3+ zones have hazard warnings requiring specific resists
- Mastery badge when all zone thresholds met
- Bag slot system: 5 equippable bag slots (6/8/10/12/14 capacity per tier)
- Cannot unequip gear when bags are full
- **Player HP system**: HP bar drains/regens during normal clears based on defensive efficiency. Can't die to normal mobs (floor at 1 HP). Shows zone difficulty visually.
- **Mob display**: Each zone has named mobs. Progress bar shows mob HP draining per clear instead of plain progress bar. Boss countdown shown.
- **Boss encounters**: Every 10 clears, a named boss spawns with its own HP pool. Both player and boss HP bars visible, DPS stats shown. Victory = bonus loot at boosted iLvl. Defeat = no boss loot, 5s recovery period. Stop mid-boss preserves clear counter.
- **Boss loot**: Drops at zone.iLvlMax + 5 (Band 1 bosses can drop T6 affixes). 1-2 items per boss kill.
- **4 playable classes**: Warrior (Rage: +2% dmg/stack, decays idle), Mage (Arcane Charges: build on ability use, discharge for bonus clears), Ranger (Tracking: +0.5% rare find/stack in same zone), Rogue (Momentum: +1% clear speed/stack, uncapped).
- **Class picker**: New game shows 4-class selection grid with descriptions, stat bonuses, resource mechanic preview. Reset game shows picker again.
- **Class resource bars**: Visible on zone screen during combat — Warrior red rage bar, Mage blue charge pips, Ranger green tracking bar, Rogue purple momentum counter.
- **Class stat bonuses**: Warrior (+15% max life, +30 armor, plate affinity), Mage (+15 spell power, +10 cast speed, cloth affinity), Ranger (+30 evasion, +10 move speed, leather affinity), Rogue (+15 attack speed, +10 crit chance, leather affinity).
- **Offline progression**: Close the app, reopen later → "Welcome Back, Exile!" modal. Works for both combat and gathering modes. Bosses skipped during offline.
- **8 weapon types**: Sword, Axe, Mace, Dagger, Staff, Wand, Bow, Crossbow. 56 mainhand bases.
- **24 abilities**: Each weapon has 2 buff + 1 passive ability. Skill tree system (3 paths per ability, 2 nodes each). Ability XP gains per clear. Slot unlock progression at Lv.1/5/12/20. Respec costs gold.
- **Ability bar**: 4 equip slots on ZoneScreen (combat mode only).
- **Combat/Gathering toggle**: Two-button toggle at top of zone screen. Switching modes stops current run.
- **5 gathering professions**: Mining, Herbalism, Skinning, Logging, Fishing. Each has independent skill level (1-100) with XP progression and milestones at 10/25/50/75/100.
- **Gathering mode**: Select a profession → zones show which professions can gather there + skill requirements. Gathering drops only profession-relevant materials + gathering XP. Small chance for gathering-specific gear drops. Rare material drops with rarity-tiered rates.
- **6 refinement tracks**: Ore, Cloth, Leather, Wood, Herb, Fish. Each has 6-tier chain (T1 raw → refined, T2+ requires previous refined + new raw + gold). Deconstruct 1 refined → 2 of previous tier.
- **6 crafting professions**: Weaponsmith, Armorer, Leatherworker, Tailor, Alchemist, Jeweler. Each has independent skill level (1-100) with XP progression. 205 recipes across all professions. 3 armor types (plate, leather, cloth) with full slot coverage (6 slots × 6 tiers per armor profession). Stalker set bonus on leather. Offhand crafting (Weaponsmith). Alchemist produces affix catalysts. Jeweler crafts rings, belts, neck, trinkets.
- **Catalyst system**: Optional affix catalysts guarantee specific affixes. Rare material catalysts guarantee minimum output rarity + 1 boosted affix (breaks iLvl tier cap). Unique recipes require specific rare materials.
- **Boosted affix mechanic**: When a rare catalyst is used, one random affix is forced to a tier better than the item's iLvl normally allows (common→T6, uncommon→T5, rare→T3, epic→T2, legendary→T1).
- **25 rare materials**: 5 per gathering profession × 5 rarity tiers (common→legendary). Drop during gathering with band-scaled rates. Used as crafting catalysts.
- **Craft tab**: Materials sub-panel (organized by refinement track with tooltips). Refine sub-panel (track selector → T1-T6 chain with refine/deconstruct buttons). Craft sub-panel (profession selector with level/XP → recipe list with catalyst info summaries, catalyst dropdowns, craft button).

## UI State (4 Tabs)
- **Zones tab**: 30 zones shown via horizontal band tab pills. Combat/Gathering toggle. Profession selector + XP bar in gathering mode. Zone cards with level badges, gathering type icons, hazard icons, mastery badges. Session summary with rare material find notifications. 5-slot SkillBar in combat mode (visible during clearing + boss fights). SkillPicker for equip/unequip.
- **Inventory tab ("Loot")**: Two-panel layout with equipped gear + bag grid. Square icon-only tiles (5-10 cols) with rarity borders + gradient overlays. Name/stats on hover/tap only. Graphic icon support with emoji fallback. Bag slots section. Right-click to equip. Hover tooltips with stat comparison. Currency crafting UI. Auto-salvage filter. 5-tier rarity colors.
- **Craft tab**: Materials/Refine/Craft toggle. Materials: organized by refinement track with rarity borders and icon pills, tooltips on hover. Refine: 6 track pills → T1-T6 recipe chain. Craft: 6 profession pills with level/XP bar → collapsible category sections with 2-column compact recipe cards, material icon pills, tier badges, catalyst dropdowns.
- **Character tab ("Hero")**: Paper doll (16 gear slots), 13 stats including poison/chaos resist, unified SkillPanel (all skill kinds + skill tree management), defense panel.

All 4 screens stay mounted (CSS hidden) for state persistence across tab switches.

## 16 Gear Slots (WoW-style)
Left: helmet, neck, shoulders, cloak, chest, bracers
Right: gloves, belt, pants, boots, ring1, ring2
Bottom: mainhand, offhand, trinket1, trinket2

345 item bases defined across 15 slots (56 mainhand with 8 weapon types, no trinket bases yet). 3 armor types: plate, leather, cloth (mail removed).

## Engine Details
- **Rarity**: Common (2 affixes, T7+), Uncommon (3, T4-T6), Rare (4, T3), Epic (5, T2), Legendary (6, T1+/2×T2)
- **Affix tiers**: T1 (best) through T10 (worst). All tiers can drop at any iLvl via smooth weight interpolation (low iLvl: T10 dominates, high iLvl: equal chance). `getWeightedTiers(iLvl)` in `engine/items.ts`.
- **Combat clear speed**: `baseClearTime / (charPower / 50)` then `* 1.12^levelDelta`. Power = `playerDps * hazardMult` (defense removed in 8E). No upper cap. Floor at 20% of baseClearTime.
- **Gathering clear speed**: `baseClearTime * 2 / (1 + skillLevel / 25)`. Scales with profession skill level.
- **Level scaling**: Exponential penalty for being under-leveled: each level below zone iLvlMin = 12% longer.
- **Hazards**: Quadratic penalty per hazard, multiplicative across all hazards.
- **Gathering professions**: 5 professions. XP curve: `50 * 1.35^(level-1)`. Milestones at 10/25/50/75/100. Band skill requirements: 1/15/30/50/75/90.
- **Rare material drops**: 25 defs (5 professions × 5 rarities). Per-clear roll, highest rarity first. Rates scale with band (common ~8-18%, legendary 0-0.3%). `rareFindBonus` from milestones + gear.
- **Refinement**: 36 recipes (6 tracks × 6 tiers). T1: 5 raw + gold → 1 refined. T2+: 5 raw + 2 previous refined + gold → 1 refined. Deconstruct: 1 refined → 2 previous tier (T2+ only).
- **Crafting professions**: 6 professions, level 1-100. XP curve: `50 * 1.10^(level-1)` (softened from 1.35 in 8G). Gold costs: T1=10, T2=25, T3=35, T4=70, T5=200, T6=500. 205 recipes (table-driven armor generation). Catalyst system: optional affix catalyst → guaranteed affix; optional rare mat → guaranteed minimum rarity + 1 boosted affix. `executeCraft()` generates item with reroll loop + boosted affix upgrade.
- **Combat HP (real-time per-hit)**: Zone attacks fire every `ZONE_ATTACK_INTERVAL` (2.0s) during normal clears via `tickCombat()`. Each attack: `ZONE_DMG_BASE * band * levelMult * variance(0.8-1.2)` → `rollZoneAttack()` pipeline (dodge→block→armor→resist). Regen: `lifeRegen * dt` per tick, capped at `MAX_REGEN_RATIO` (50%) of maxHP per clear. Life leech: `LEECH_PERCENT` (4%) of player damage dealt. `calcLevelDamageMult()`: underleveled = `1.12^delta` exponential, overleveled = `1 - delta*0.10` linear (floor 0.30). **Death possible**: HP can reach 0, triggering `zone_defeat` recovery phase (5s, resets boss counter). Ability `resistBonus` applied via `applyAbilityResists()`.
- **Boss mechanics**: Every 10 clears (count resets on new run or zone death). `calcBossMaxHp(zone)` = `150 * band^2`. `calcBossAttackProfile()`: base damage = `BOSS_DMG_PER_HIT_BASE(6) * band^2 * levelMult` + hazard bonus (15% per unresisted hazard). Boss attacks every `BOSS_ATTACK_INTERVAL` (1.5s) via `bossNextAttackAt` timestamp. **Boss damage smoothing (10R)**: normal hits roll 0.6x–1.0x variance (avg 80%), boss crits (15% chance) deal 1.5x, damage capped at 40% maxHP per hit (`BOSS_MAX_DMG_RATIO`). Player attacks boss via `rollSkillCast()` (same skill rotation as normal clearing). `generateBossLoot()` at iLvlMax + 5. Victory/defeat/zone_defeat phases with timed recovery.
- **Auto-apply resources**: `processNewClears()` immediately applies all drops to state. Session summary tracked in UI local state.
- **Ability system**: 6 ability kinds (passive/buff/instant/proc/toggle/ultimate). Per-ability skill trees with 3 paths x 2 nodes. Ability XP: `10 + floor(band*2)` per clear. XP per level: `100*(level+1)`. Max level 10. Respec cost: `50*level^2` gold. Slot unlock at character Lv.1/5/12/20.
- **Per-clear tracking**: `clearStartedAt` + `currentClearTime` replace modulo-based progress. Mid-clear ability activation preserves progress % but adjusts remaining time.
- **Bag system**: 5 equippable bag slots (T1:6→T5:14). Start 30 total, max 70.
- **Crafting (currencies)**: `applyCurrency(item, type)` — augment, chaos, divine, annul, exalt, greater_exalt (top-2 tiers), perfect_exalt (T1 guaranteed)
- **Active skills**: 51 skills (6-8 per weapon × 8 weapons). Tag-based DPS: `calcSkillDps()` computes base damage → additive %increased (including delivery tag stats: Melee/Projectile/AoE/DoT/Channel) → speed → hit chance → crit → hits → per-second → DoT bonus. Attack skills use weapon damage + flat phys/ele. Spell skills use spell power + flat spell ele. Default skill auto-assigned on weapon equip. Every weapon has elemental variety (Physical/Fire/Cold/Lightning/Chaos choices).
- **Save**: Zustand persist v27. v26→v27 renames ephemeral combat field + ensures active skill timer entries. v25→v26 strips legacy `equippedAbilities`/`abilityTimers`/`equippedSkills`, truncates `skillBar` to 5. v24→v25 adds unified `skillBar`/`skillProgress`/`skillTimers`. v23→v24 adds `equippedSkills`. v22→v23 adds `autoDisposalAction: 'salvage'`. v21→v22 renames `materials.salvage_dust` → `materials.enchanting_essence`. v20→v21 adds `greater_exalt` + `perfect_exalt` currencies. Earlier migrations: v11→v15 adds crafting/combat fields, v17→v19 adds classes/abilities/per-clear tracking.

## Architecture
```
src/
  types/index.ts            — All TypeScript interfaces
  data/
    balance.ts              — Centralized balance config (drop rates, combat formulas, crafting XP, catalyst rarity map, boosted affix tiers)
    affixes.ts              — 15 combat affix definitions (7 prefix, 8 suffix, T1-T10)
    gatheringAffixes.ts     — 8 gathering affix definitions (4 prefix, 4 suffix, T1-T10)
    gatheringProfessions.ts — 5 gathering profession defs, milestones, band skill requirements
    craftingProfessions.ts  — 6 crafting profession defs, milestones, createDefaultCraftingSkills()
    craftingRecipes.ts      — 205 crafting recipes (table-driven armor generation), getCraftingRecipe(), getRecipesForProfession()
    affixCatalysts.ts       — 9 affix catalyst defs, getAffixCatalystDef()
    refinement.ts           — 36 refinement recipes (6 tracks × 6 tiers), lookup helpers, getDeconstructOutput()
    rareMaterials.ts        — 25 rare material defs, drop rates by band, getRareMaterialDef()
    zones.ts                — 30 zones with material names, recommendedLevel, gatheringTypes
    items.ts                — 345 item bases (56 mainhand w/ 8 weapon types) + 6 currency defs + 5 bag upgrade defs
    unifiedSkills.ts        — 75 unified SkillDefs (51 active + 24 ability), all lookup helpers, ID migration map
    classes.ts              — 4 class definitions with resource config (warrior, mage, ranger, rogue)
    setBonuses.ts           — 4 armor-type set bonus definitions
  engine/                   — Pure TypeScript (no React)
    items.ts                — Item generation, affix rolling, rarity classification, generateGatheringItem()
    zones.ts                — Clear speed calc, idle simulation, hazards, mastery, simulateGatheringClear() with rare drops
    gathering.ts            — Gathering XP curve, level-ups, yield calc, milestones, skill requirements
    rareMaterials.ts        — rollRareMaterialDrop(), calcRareFindBonus()
    refinement.ts           — canRefine(), refine(), canDeconstruct(), deconstruct(), getRefinementChain()
    craftingProfessions.ts  — addCraftingXp(), canCraftRecipe(), executeCraft(), getCraftingXpForTier()
    unifiedSkills.ts        — ALL skill/ability engine functions: DPS calc, ability resolution, aggregation, XP, skill trees
    classResource.ts        — Class resource pure functions (create, tick, decay, reset, modifiers)
    character.ts            — Stats resolution (13 stats), XP/leveling
    crafting.ts             — 6 currency crafting operations
    setBonus.ts             — Set bonus resolution
  store/
    gameStore.ts            — Zustand store (state + actions + persistence + v27 migration). Actions: selectClass, tickClassResource, tickAutoCast, tickCombat, startBossFight, handleBossVictory, handleBossDefeat, checkRecoveryComplete, allocateAbilityNode, respecAbility, equipToSkillBar, unequipSkillBarSlot, toggleSkillAutoCast, reorderSkillBar, activateSkillBarSlot + all previous.
  ui/
    slotConfig.ts           — Shared gear slot icons/labels
    components/
      NavBar.tsx            — Bottom navigation (Zones/Loot/Craft/Hero — 4 tabs)
      TopBar.tsx            — Character info, XP bar, currency counts
      CombatStatusBar.tsx   — Persistent combat/gathering status bar (visible during runs)
      OfflineProgressModal.tsx — "Welcome Back" modal
      SkillBar.tsx          — 8-slot unified skill bar (reads skillBar/skillTimers/skillProgress)
      SkillPanel.tsx        — Unified skill browser (all kinds + DPS comparison + skill trees)
      Tooltip.tsx           — Reusable hover tooltip component
      DamageFloater.tsx     — FloaterEntry interface + DamageFloaters component (player/enemy/boss crit floaters)
      ClassPicker.tsx       — 4-class selection screen (new game / reset)
    screens/
      ZoneScreen.tsx        — Band tabs, Combat/Gathering toggle, profession selector, session summary with rare finds
      InventoryScreen.tsx   — Bag grid + currency crafting UI + auto-salvage + detail panel
      CraftingScreen.tsx    — Materials/Refine/Craft toggle. Materials: track-grouped panel with rarity borders + tooltips. Refine: track pills → T1-T6 chain. Craft: profession pills → collapsible categories with 2-col compact recipe grid, material icon pills, catalyst dropdowns.
      CharacterScreen.tsx   — Paper doll (16 slots), stats with skill DPS, skill panel, ability management
  App.tsx                   — Main app shell with CSS-hidden tab routing (4 tabs)
  main.tsx                  — Entry point
  index.css                 — Tailwind directives + base styles
```

## Known Issues & Technical Debt
- [ ] `simulateIdleRun()` doesn't pass equippedSkills (offline uses auto-assign fallback — correct behavior)
- [ ] Socket currency defined but no crafting logic
- [ ] No trinket item bases (trinket1/trinket2 slots empty)
- [ ] Set bonus UI not shown on character screen
- [ ] Zone familiarity passive not implemented
- [ ] `simulateIdleRun()` and `simulateSingleClear()` share drop logic — could refactor
- [ ] ItemCard component exists but is no longer imported anywhere (orphaned)
- [ ] Offline gathering doesn't use rareFindBonus (rare drops only during real-time)

## What's Next
**See `SPRINT_PLAN.md` for the full roadmap with detailed implementation notes.**

Combat overhaul sprints 10J→10R are complete. See `COMBAT_OVERHAUL.md` for detailed sprint history.

Potential next sprints: mob type differentiation, skill discovery/unlocks, zone mastery system, passive skill trees.

## How to Run
```bash
cd /home/jerris/idle-exile
npx vite --host
# Open http://localhost:5173/
```

## Deployment
- **GitHub:** https://github.com/ScuzzyScoundrel/idle-exile (branch: `master`)
- **Vercel:** Auto-deploys on `git push origin master`. Connected via `idle-exile` repo.
- **Second repo:** `ScuzzyScoundrel/scuzzy-idle-exile` also exists. Push with `git push vercel master:main`.
- **No backend:** Each browser gets own localStorage save. No server, no database.

## Tech Stack
- Node 18 / TypeScript 5.6
- React 18 + Vite 5
- Zustand 5 (state management + localStorage persistence with migrations)
- Tailwind CSS 3
- No backend (client-only)

## Key Decisions Made
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-23 | Browser-first (PWA later) | Fastest iteration, zero code change to convert |
| 2026-02-23 | Tailwind CSS v3 (not v4) | Node 18 compatibility |
| 2026-02-23 | Engine/UI separation | Engines testable without React, portable |
| 2026-02-23 | Zustand + localStorage | Simple persistence, no backend needed yet |
| 2026-02-23 | 16 WoW-style gear slots | Future-proof layout |
| 2026-02-23 | CSS hidden tabs (not conditional) | Preserves component state across tab switches |
| 2026-02-24 | Phase 1 Foundation rework | Align engine with updated GDD |
| 2026-02-24 | Merge crafting into Inventory tab | Reduces tabs from 4→3 |
| 2026-02-24 | Real-time loot (items to bags immediately) | More engaging than batch collect |
| 2026-02-24 | Bag capacity 30 start, +6 per tier | Steady progression unlocks |
| 2026-02-24 | 5-bag-slot system (v8) | Per-slot capacity creates gear-like progression |
| 2026-02-24 | Vendor capped at T2 bags | T3+ from drops/crafting only |
| 2026-02-24 | Sell gear for gold | Gold economy sink |
| 2026-02-24 | GOLD_PER_BAND 8→3→4 | Selling gear meaningful; bumped in 8G to ease mid-game gold wall |
| 2026-02-24 | Offline >60s threshold | Short reloads handled by real-time tick |
| 2026-02-24 | Items stored in summary, not applied | Player can free bag space before claiming |
| 2026-02-24 | Vercel deploy (no backend) | Each browser = own character |
| 2026-02-25 | Replace focus modes with Combat/Gathering toggle | Old modes didn't match evolution doc vision |
| 2026-02-25 | Auto-apply resources (remove collect button) | Unnecessary friction since items already go to bags |
| 2026-02-25 | Band tabs (replace accordion) | Less vertical space, faster band switching |
| 2026-02-25 | Gathering skill gates as soft warnings | Let players attempt, just warn them |
| 2026-02-25 | 4-tab NavBar (add Craft tab) | Crafting professions need dedicated space |
| 2026-02-25 | Rare materials into same materials pool | Simplest storage — no separate inventory needed |
| 2026-02-25 | Catalyst → minimum rarity guarantee | Makes rare materials feel valuable without RNG elimination |

## Sprint History (Detailed Changes)

### Sprint 1–4 (Summary)
Foundation → item/affix engine → zone overhaul → real-time loot/bags → loot tuning → bag slots → offline progression → weapon types + abilities. See git history for details.

### Sprint 5 Changes (Zone Stabilization + Gathering System)
Replaced focus modes with Combat/Gathering toggle. 5 gathering professions with skill leveling, milestones, gathering gear. Auto-apply resources. Session summary. Band tabs. All 30 zones updated. Save v11.

### Sprint 6 Changes (Material Refinement + Crafting Professions + Rare Materials)
- **6 refinement tracks**: Ore, Cloth, Leather, Wood, Herb, Fish — each with 6-tier chain (36 recipes total)
- **5 crafting professions**: Weaponsmith, Armorer, Tailor, Alchemist, Jeweler — each with independent skill level (1-100)
- **~140+ standard recipes**: Weapons: 2 per tier per type. Armor: 6 slots × 6 tiers per profession (table-driven). Alchemist/Jeweler: 2 per tier.
- **8 unique catalyst recipes**: Require specific rare materials (Prismatic Ring needs Flawless Gem, Fangblade needs Primordial Fang, etc.)
- **25 rare materials**: 5 per gathering profession × 5 rarity tiers. Drop during gathering clears with band-scaled rates.
- **Catalyst system**: Optional rare mat on catalystSlot recipes → guaranteed minimum item rarity. Required rare mat on unique recipes.
- **Craft tab (new)**: 4th NavBar tab. Refine sub-panel with 6 track pills → T1-T6 chain. Craft sub-panel with 5 profession pills + XP bar → recipe list.
- **Rare find notifications**: Gathering session summary shows rare material drops with rarity-colored text + pulse animation.
- **Store actions**: `refineMaterial()`, `deconstructMaterial()`, `craftRecipe()` with catalyst support + overflow handling.
- **Files added**: `craftingProfessions.ts`, `craftingRecipes.ts`, `rareMaterials.ts`, `refinement.ts` (data), `craftingProfessions.ts`, `rareMaterials.ts`, `refinement.ts` (engine), `CraftingScreen.tsx`
- **Save v12 migration**: Adds `craftingSkills`

### Sprint 6 QoL Iteration (Crafting UX + Boosted Affixes + UI Overhaul)
- **Boosted affix mechanic**: Rare catalysts force 1 random affix to break iLvl tier cap (CATALYST_BEST_TIER: common→T6, uncommon→T5, rare→T3, epic→T2, legendary→T1). Implemented in `executeCraft()`.
- **Catalyst cost 10x increase**: Alchemist catalyst recipes 10g/5mats → 100g/13mats.
- **Material panel organized by track**: Materials sub-panel now groups raw/refined by Ore/Cloth/Leather/Wood/Herb/Fish with track icons. Separate sections for Affix Catalysts, Rare Materials, Misc.
- **Catalyst info broadcasting**: Affix catalyst cards show guaranteed affix. Rare material cards show rarity + catalyst description. Recipe cards show selected catalyst summary below materials.
- **Reusable Tooltip component**: `src/ui/components/Tooltip.tsx` — hover info on all materials (raw: gather source + refine target; refined: source material; affix catalyst: guaranteed affix; rare: description + boosted affix info).
- **UI size bump**: Root font-size 16px→18px (`html { font-size: 18px }`). All pixel-based font sizes (`text-[8px]` through `text-[11px]`) migrated to rem-based Tailwind classes (`text-xs`, `text-sm`). Padding increased on recipe/material cards. Applied across CraftingScreen, CharacterScreen, InventoryScreen, ZoneScreen, AbilityBar.
- **Files changed**: `balance.ts`, `craftingRecipes.ts`, `craftingProfessions.ts`, `Tooltip.tsx` (new), `CraftingScreen.tsx`, `CharacterScreen.tsx`, `InventoryScreen.tsx`, `ZoneScreen.tsx`, `AbilityBar.tsx`, `index.css`

### Recipe Balancing + Crafting UI Overhaul
- **73 new armor recipes**: Table-driven `generateArmorRecipes()` produces 6 slots × 6 tiers = 36 recipes per armor profession. Armorer (plate), Leatherworker (leather), Tailor (cloth) now have full slot coverage. Plus bracer/cloak extras.
- **Collapsible category UI**: Flat filter tabs replaced with collapsible section headers per category (Helmets, Chest, Swords, etc.). Click to expand/collapse.
- **2-column compact recipe grid**: Full-width horizontal cards replaced with `grid-cols-1 sm:grid-cols-2` compact cards. Tier badges, material icon pills, abbreviated catalyst dropdowns.
- **Material icon pills**: Text material lists replaced with compact colored pills showing track icon + have/amount. Green when met, red when short.
- **Materials panel polish**: Rarity-colored borders on rare material cards, cyan left border on affix catalyst cards, tighter grid (gap-1.5, p-2), better section headers.
- **Rare catalyst tier-colored text**: Catalyst summary text color matches affix tier quality (T1=orange, T2=purple, T3=blue, T5=green, T6=gray).
- **"god-tier" → "boosted"**: All user-facing text cleaned up.
- **Files changed**: `craftingRecipes.ts`, `CraftingScreen.tsx`, `PROJECT_STATUS.md`

### Combat Overhaul (HP System + Boss Encounters)
- **Player HP system**: HP bar during combat. Damage per clear scales with defensive efficiency (0 damage at defEff=1.0, 15% maxHp at defEff=0.7). Regen 8% maxHp per clear. Floor at 1 HP.
- **Mob display**: 30 zones updated with `mobName` + `bossName`. Progress bar replaced with mob name + HP bar (inverted clear progress). Boss countdown shown.
- **Boss encounters**: Every 10 clears per zone. Boss HP = baseClearTime * band * 8. Real-time fight simulation with player DPS vs boss DPS. Tab-throttle-safe using Date.now() delta.
- **Boss loot**: 1-2 items at iLvlMax + 5 on victory. No loot on defeat. Band 1 bosses can drop T6 affixes.
- **Victory/defeat phases**: Victory = 2.5s celebration with gold overlay + boss loot display. Defeat = 5s recovery with HP regen animation. Auto-resume to clearing.
- **State machine**: `CombatPhase` type: clearing → boss_fight → boss_victory/boss_defeat → clearing. `BossState` persists DPS values. `zoneClearCounts` persisted across sessions (can't skip bosses by stopping).
- **Edge cases**: Stop mid-boss resets phase but preserves clear count. Zone switch resets HP to full. Offline skips bosses. Gathering mode hides HP/boss UI.
- **New types**: `CombatPhase`, `BossState`. Extended `ZoneDef` (mobName, bossName) + `GameState` (currentHp, combatPhase, bossState, zoneClearCounts, combatPhaseStartedAt).
- **New balance constants**: CLEAR_DAMAGE_RATIO, CLEAR_REGEN_RATIO, BOSS_INTERVAL, BOSS_HP_MULTIPLIER, BOSS_DAMAGE_MULTIPLIER, BOSS_ILVL_BONUS, BOSS_DROP_COUNT, BOSS_VICTORY_DURATION, BOSS_DEFEAT_RECOVERY.
- **New engine functions**: calcDamagePerClear, calcRegenPerClear, applyNormalClearHp, calcBossMaxHp, calcPlayerDps, calcBossDps, createBossEncounter, tickBossFight, generateBossLoot.
- **New store actions**: startBossFight, tickBoss, handleBossVictory, handleBossDefeat, checkRecoveryComplete.
- **New UI components**: PlayerHpBar, MobDisplay, BossFightDisplay, BossVictoryOverlay, BossDefeatOverlay.
- **Save v15 migration**: Adds zoneClearCounts + combat HP fields. Ephemeral combat state reset on rehydrate.
- **Files changed**: types/index.ts, data/balance.ts, data/zones.ts, engine/zones.ts, store/gameStore.ts, ui/screens/ZoneScreen.tsx

### Sprint 7A Changes (Classes + Resource Mechanics)
- **4 playable classes**: Warrior, Mage, Ranger, Rogue — each with unique idle resource mechanic.
- **Class picker**: Full-screen 4-class selection grid on new game. Shows name, icon, description, base stat bonuses, resource mechanic preview. Confirm button starts game. Shown again on `resetGame()`.
- **Warrior Rage**: +1 per clear (max 20), decays 1/30s while idle. +2% damage per stack.
- **Mage Arcane Charges**: +1 on ability activation (max 10). At max, auto-discharge for bonus clears (floor(charges/2)). +5% spell damage, +3% ability haste per charge.
- **Ranger Tracking**: +1 per clear same zone (max 100). Resets on zone switch. +0.5% rare find, +0.3% material yield per stack.
- **Rogue Momentum**: +1 per clear (uncapped). Resets on stop/zone switch/gear swap. +1% clear speed per stack.
- **Class resource bars**: Warrior=red bar, Mage=blue pips with discharge flash, Ranger=green bar, Rogue=purple counter.
- **Class stat bonuses**: Warrior (+15% max life, +30 armor), Mage (+15 spell power, +10 cast speed), Ranger (+30 evasion, +10 move speed), Rogue (+15 attack speed, +10 crit chance).
- **Class modifiers in combat**: Warrior/Mage damage bonus applied to DPS calc. Rogue speed bonus applied to clear time. Ranger loot bonus applied to drop rolls.
- **New types**: `CharacterClass` expanded to 4, `ResourceType`, `ClassResourceState`, `ClassDef` resource config fields.
- **New engine**: `classResource.ts` — pure functions for resource create/tick/decay/reset/modifiers.
- **New UI**: `ClassPicker.tsx`, `ClassResourceBar` component in ZoneScreen, class info in CharacterScreen.
- **Store actions**: `selectClass()`, `tickClassResource()`. Updated: `processNewClears`, `startIdleRun`, `stopIdleRun`, `equipItem`, `activateAbility`.
- **Save v18 migration**: Adds `classResource` + `classSelected`. Existing saves → Warrior + skip picker.
- **Files changed**: types/index.ts, data/classes.ts, engine/classResource.ts (new), engine/zones.ts, store/gameStore.ts, App.tsx, ui/components/ClassPicker.tsx (new), ui/screens/ZoneScreen.tsx, ui/screens/CharacterScreen.tsx

### Sprint 7C-A Changes (Ability System Overhaul)
- **Ability kinds expanded**: `AbilityKind` now: passive, buff, instant, proc, toggle, ultimate. Old 'active' → 'buff'. Old 'passive' unchanged.
- **Skill tree system**: Each ability has 3 paths (A/B/C) with 2 nodes each. Nodes can grant effect bonuses, duration bonuses, or cooldown reductions. Final node in each path is a "payoff" (overrides rather than stacks).
- **Ability XP**: All equipped abilities gain XP per clear: `10 + floor(band * 2)`. XP per level: `100 * (level + 1)`. Max level 10 (5,500 total XP). Each level grants 1 skill point.
- **Slot unlocks**: 4 ability slots unlock at character Lv.1/5/12/20. Locked slots show lock icon + level requirement.
- **Respec**: Reset skill tree + XP to 0. Cost: `50 * level^2` gold.
- **Bug fix: Progress bar jumps**: Replaced modulo-based progress (`elapsed % clearTime`) with explicit per-clear tracking (`clearStartedAt` + `currentClearTime`). Mid-clear ability activation preserves progress % but adjusts remaining time — mob HP drains faster, feels impactful.
- **Mid-clear recalculation**: On ability activate: calculate current progress, recalculate clear time with new effects, adjust clearStartedAt to preserve progress %.
- **New types**: `ScalingFormula`, `ScalingTerm`, `SkillTreeNode`, `SkillTreePath`, `AbilitySkillTree`, `AbilityProgress`, `ABILITY_SLOT_UNLOCKS`.
- **New engine functions**: `evaluateFormula`, `resolveAbilityEffect` (tree-based), `getEffectiveDuration`, `getEffectiveCooldown`, `calcBonusClears`, `rollProc`, `getUnlockedSlotCount`, `getAbilityXpForLevel`, `addAbilityXp`, `getAbilityXpPerClear`, `canAllocateNode`, `allocateNode`, `respecAbility`, `getRespecCost`, `createAbilityProgress`.
- **New store actions**: `allocateAbilityNode`, `respecAbility`, `toggleAbility`.
- **Updated store actions**: `activateAbility` (new kinds + mid-clear recalc), `processNewClears` (ability XP + per-clear tracking), `startIdleRun` (initializes clearStartedAt/currentClearTime), `getEstimatedClearTime` (returns tracked value when running), `equipAbility` (slot unlock check + abilityProgress init).
- **Updated UI**: AbilityBar shows slot locks, ability XP bars, kind-specific colors. CharacterScreen AbilityPanel replaced mutator selection with skill tree picker (3 path tabs, node allocation, respec button).
- **Save v19 migration**: Adds `abilityProgress: {}`, `clearStartedAt: 0`, `currentClearTime: 0`. Clears old mutator selections.
- **Files changed**: types/index.ts, engine/abilities.ts, data/abilities.ts, store/gameStore.ts, ui/components/AbilityBar.tsx, ui/screens/ZoneScreen.tsx, ui/screens/CharacterScreen.tsx

### Sprint 8A Changes (Gathering System Bugs)
- **Fixed profession mid-run exploit**: `setGatheringProfession` (gameStore.ts) now stops the current gathering run and restarts with the new profession's clear time. Previously only swapped the profession ID, allowing fast clear speed to route XP to a low-level profession.
- **Fixed zone skill lock enforcement**: `startIdleRun` (gameStore.ts) now calls `canGatherInZone()` and returns early if the gathering skill is too low. Previously the lock was visual-only.
- **Disabled Start/Switch buttons**: ZoneScreen Start button and Switch Zone button are now disabled + show requirement text when gathering skill is insufficient for the selected zone.
- **Files changed**: `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`

### Sprint 8B Changes (Combat & Ability Bugs)
- **Fixed ability resistBonus not applied**: New `applyAbilityResists()` helper in `engine/zones.ts` creates modified stats with ability resist bonus before passing to `calcDefensiveEfficiency` and `calcHazardPenalty`. Applied in `calcClearTime`, `calcBossDps`, and `processNewClears` HP calculation. Previously, abilities like Crushing Force (+10 all resists), Elemental Ward (+50 resists), and skill tree resist nodes had no actual combat effect.
- **Fixed HP drain constant minimum**: Removed `MIN_CLEAR_NET_DAMAGE_RATIO` (0.02). Damage per clear now has 70-130% variance (was flat). Good defense can fully out-regen damage — no more artificial 2% maxHp drain per clear. HP clamped to [1, maxHp] (can still heal up to full between clears).
- **Exalt currency investigated**: Code is correct — `!canPrefix && !canSuffix` guard already handles one-sided affix distributions. No change needed.
- **Hotfix: Fixed gathering clear stuck at 100%**: `processNewClears` gathering path never advanced `clearStartedAt` or recalculated `currentClearTime` after clears completed. Combat mode did this correctly but gathering mode was missing it. Progress calc `(now - clearStartedAt) / (currentClearTime * 1000)` grew past 100%, triggering infinite clears. Fix: advance `clearStartedAt` by completed clears and recalculate gather clear time with new skill level.
- **Files changed**: `engine/zones.ts`, `data/balance.ts`, `store/gameStore.ts`

### Sprint 8C Changes (Mobile UX Foundation)
- **New `useIsMobile()` hook**: `src/ui/hooks/useIsMobile.ts`. Detects touch-primary devices via `matchMedia('(pointer: coarse)')`. Reactive — listens for media query changes.
- **Tooltip tap support**: `Tooltip.tsx` now uses tap-to-show/tap-outside-to-dismiss on mobile instead of hover. Uses `pointerdown` event listener for outside dismiss. Desktop hover preserved.
- **Inventory bottom sheet**: On mobile, the item detail panel renders as a fixed bottom sheet overlay (`max-h-[60vh]`, rounded top, semi-transparent backdrop). Tap backdrop or close button to dismiss. Non-mobile small screens keep the old inline layout below inventory.
- **Hover suppression**: All `onMouseEnter`/`onMouseLeave` handlers on item tiles, equipped slot cards (InventoryScreen), and gear slot cards (CharacterScreen) are suppressed on mobile. Prevents ghost hover states on touch devices.
- **Files added**: `ui/hooks/useIsMobile.ts`
- **Files changed**: `ui/components/Tooltip.tsx`, `ui/screens/InventoryScreen.tsx`, `ui/screens/CharacterScreen.tsx`

### Sprint 8D Changes (Currency & Equip UX Fixes)
- **Currency one-shot**: `handleCraft()` in InventoryScreen now calls `setSelectedCurrency(null)` after successful currency application. On mobile, `confirm()` dialog before applying. Help text updated.
- **Mobile unequip button**: CharacterScreen shows explicit "Unequip" button below the item tooltip when a gear slot is inspected. Mobile: first tap = inspect, second tap = dismiss tooltip. Desktop: retains click-to-unequip on the slot itself.
- **Multi-tab guard**: New `useTabGuard()` hook in `ui/hooks/useTabGuard.ts`. Uses localStorage heartbeat (2s interval, 5s stale threshold). Cleans up on `beforeunload`. Second tab sees blocking modal in App.tsx with Retry button.
- **Weapon equip restrictions**: New `isTwoHandedWeapon()` in `engine/items.ts`. 2H weapons: greatsword, greataxe, maul, staff, bow, crossbow, tome. `equipItem` in gameStore: 2H mainhand auto-unequips offhand. Offhand blocked if mainhand is 2H. Quiver requires bow/crossbow mainhand.
- **Files added**: `ui/hooks/useTabGuard.ts`
- **Files changed**: `ui/screens/InventoryScreen.tsx`, `ui/screens/CharacterScreen.tsx`, `store/gameStore.ts`, `engine/items.ts`, `App.tsx`

### Sprint 8E Changes (Combat Rebalance)
- **Boss HP rework**: Formula now `BOSS_BASE_HP(150) * band^2`. Band 1: 150 HP, Band 3: 1350 HP, Band 6: 5400 HP. No DPS floor — overgeared players melt bosses fast (intended). Appropriately-geared fights last 10-15s. `BOSS_DAMAGE_MULTIPLIER` 2.5→1.5.
- **Boss victory screen**: Extended from 2.5s to 5s. Now shows fight stats: duration (ms for fast kills), boss HP, your DPS, boss DPS, plus loot. Even a 0.5s kill shows results for 5s.
- **Boss spawn consistency**: `zoneClearCounts` now reset when starting a new run. Boss always spawns after exactly 10 clears. Previously, leftover counts from stopped runs caused bosses after 1/3/5 clears unpredictably.
- **Defense/clear speed philosophy split**: Removed `defEff` from `charPower` in `calcClearTime()`. New formula: `charPower = playerDps * hazardMult`. Defense only affects damage taken (HP drain + boss DPS). `POWER_DIVISOR` 25→50 to compensate for removed defEff factor.
- **XP scaling with zone level**: New `calcXpScale(playerLevel, zoneIlvl)` in `engine/zones.ts`. Each player level above zone iLvlMin = -10% XP (floor at 10%). Applied in `simulateIdleRun`, `simulateSingleClear`, and ZoneScreen real-time XP grant. Prevents farming zone 1 for fast XP.
- **Boss danger indicator**: Zone info panel shows "Boss: Safe/Risky/Deadly" with estimated time-to-kill and time-to-die. Risky = fight is close, Deadly = boss kills you first. Color-coded green/yellow/red.
- **XP penalty display**: When player is overleveled for a zone, shows "XP: X%" in the zone info panel.
- **Files changed**: `data/balance.ts`, `engine/zones.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`

### Sprint 8E-2 Changes (Combat Rebalance Iteration)
- **Boss DPS rework**: Replaced exponential `50 * 2^(band-1)` (Band 3 = 200) with zone-specific formula: `BOSS_DPS_BASE(4) * band^1.5 + baseClearTime * BOSS_DPS_ZONE_FACTOR(0.2)`. Band 3 Shimmerfen(55) = 31.8, Emberpeak(43) = 29.4 — different bosses, different damage. `BOSS_DAMAGE_MULTIPLIER` 1.5→1.0. Result: Band 3 boss fights now ~20-30s instead of 2.7s.
- **Boss hazard bonus**: Each zone hazard adds `basePressure * BOSS_HAZARD_DAMAGE_RATIO(0.15) * (1 - resistReduction)` bonus damage. Resists reduce hazard bonus (resist / threshold*1.5). Fire/cold/lightning/chaos zones feel mechanically distinct.
- **Zone death**: `applyNormalClearHp` floor changed from 1 to 0. HP can reach 0 during normal clears. `processNewClears` detects death → sets `combatPhase = 'zone_defeat'`, resets `zoneClearCounts` (boss counter back to 0). `checkRecoveryComplete` handles recovery (same as boss_defeat: HP regens over 5s, then resumes clearing).
- **Zone defeat overlay**: New `ZoneDefeatOverlay` component shows mob name, zone name, "Boss progress reset" message, HP recovery bar. Similar to `BossDefeatOverlay` but for mob deaths.
- **Removed boss danger indicator**: "Boss: Safe/Risky/Deadly (kill / die times)" removed from zone info panel. Was spoiling outcomes. Removed `calcPlayerDps`, `calcBossMaxHp`, `calcBossDps` imports from ZoneScreen.
- **New CombatPhase**: `'zone_defeat'` added to `CombatPhase` union type.
- **Files changed**: `types/index.ts`, `data/balance.ts`, `engine/zones.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`

### Sprint 8F-1 Changes (Item Level & Affix Rework Part 1)
- **iLvl-scaled affix tier weights**: Replaced `getAvailableTiers()` (hard iLvl breakpoints that blocked tiers entirely) with `getWeightedTiers(iLvl)` (smooth lerp across all 10 tiers). At iLvl 1: T10=50 weight (31%), T1=0.01 weight (0.006%). At iLvl 70: all tiers=5 weight (10% each). Removed `TIER_WEIGHTS` constant, added `TIER_ILVL_CAP(70)`, `TIER_HIGH_WEIGHT(5)`, `TIER_LOW_WEIGHTS` per-tier map.
- **Realistic best tier**: `getBestTierForILvl()` now returns lowest tier with ≥1% total weight probability (replaces old hard cutoff). UI star (★) and "T{n}+" text adapt smoothly.
- **Exalt adapted**: `rollForcedHighTierAffix()` now uses `getBestTierForILvl()` + next 2 tiers (was `getAvailableTiers().slice(0,3)`). Preserves "good tier for item's iLvl" intent.
- **Armor type badges**: Plate (silver), Leather (brown), Cloth (purple) badge shown on item detail panel + hover tooltip in InventoryScreen. Uses existing `item.armorType` field (already on all armor items).
- **Files changed**: `data/balance.ts`, `engine/items.ts`, `engine/crafting.ts`, `ui/screens/InventoryScreen.tsx`

### Sprint 8F-2 Changes (Currency Rework + Catalyst iLvl Bonus)
- **Greater Exalt**: New `greater_exalt` currency (epic rarity, 0.5% drop rate). Adds one affix from top 2 realistic tiers for item's iLvl (40% best, 60% second-best). Refactored `rollForcedHighTierAffix()` to accept `topN` parameter.
- **Perfect Exalt**: New `perfect_exalt` currency (legendary rarity, 0.1% drop rate). Adds one guaranteed T1 affix via new `rollPerfectAffix()` helper. Chase currency — ultra-rare.
- **Catalyst iLvl bonus**: `CATALYST_ILVL_BONUS` in balance.ts (common:+3, uncommon:+6, rare:+10, epic:+15, legendary:+20). Applied in `executeCraft()` BEFORE item generation — item rolls with `effectiveILvl = recipe.outputILvl + bonus`, giving better affix tier weights.
- **Save v21 migration**: Adds `greater_exalt: 0` and `perfect_exalt: 0` to existing save currencies.
- **CurrencyDef rarity extended**: From `'common'|'uncommon'|'rare'` to include `'epic'|'legendary'`.
- **Files changed**: `types/index.ts`, `data/items.ts`, `data/balance.ts`, `engine/crafting.ts`, `engine/craftingProfessions.ts`, `engine/zones.ts`, `store/gameStore.ts`

### Sprint 8G Changes (Crafting & Economy Tuning)
- **8G-1: Crafting XP growth softened**: `CRAFTING_XP_GROWTH` 1.35→1.10 in `engine/craftingProfessions.ts`. Level 50 now 5,850 XP (was 860,000). Level 100 reachable with ~3,800 T6 crafts — serious grind but not exponentially impossible.
- **8G-1: Gold per clear bumped**: `GOLD_PER_BAND` 3→4 in `data/balance.ts`. Band 1: 4g, Band 3: 12g, Band 6: 24g. 33% income boost eases early/mid gold wall.
- **8G-1: T3/T4 crafting gold costs reduced**: `ARMOR_TIER_CONFIG` T3: 50→35, T4: 100→70 in `data/craftingRecipes.ts`. All ~20 manual weapon/offhand/jewelry recipes with T3/T4 gold costs also updated. Combined effect at T3 (Band 3): 5.5 clears/craft → 2.9 clears/craft.
- **8G-2: Salvage dust → enchanting essence**: Material key `salvage_dust` renamed to `enchanting_essence` throughout engine and store. `SALVAGE_DUST` constant renamed to `ESSENCE_REWARD`. All user-facing text updated: "dust" → "essence". Stockpiles for future Enchanting profession.
- **Save v22 migration**: Renames `materials.salvage_dust` → `materials.enchanting_essence` in existing saves.
- **Files changed**: `data/balance.ts`, `data/craftingRecipes.ts`, `engine/craftingProfessions.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`, `ui/screens/CraftingScreen.tsx`, `ui/screens/InventoryScreen.tsx`, `ui/components/OfflineProgressModal.tsx`

### Sprint 9A Changes (Desktop Layout + Persistent Combat Bar)
- **Layout widening (xl breakpoint)**: Added `xl:max-w-7xl` to App.tsx main container, TopBar inner div, NavBar inner div. Added `xl:grid-cols-3` to zone card grid (ZoneScreen), recipe card grid (CraftingScreen), stats grid (CharacterScreen). Added `xl:grid-cols-5` to bag item grid (InventoryScreen). All use `xl:` prefix — zero impact below 1280px.
- **CombatStatusBar component (new)**: Fixed bar between TopBar and main content, visible only when a run is active (`idleStartTime !== null`). Combat mode: shows zone name, player HP bar (green>60%/yellow>30%/red), mob clear progress (inverted orange bar), boss countdown, phase badges (BOSS/VICTORY/DEFEAT/DEAD). Boss fight: swaps mob bar for boss name + HP bar. Gathering mode: shows zone name, profession icon + name + level, XP progress bar, gather clear progress. Uses 100ms interval for smooth progress animation. Auto-hides when run stops.
- **App.tsx conditional padding**: Main content `pt-16` (no run) or `pt-[88px]` (run active) to accommodate the combat bar height.
- **Files added**: `ui/components/CombatStatusBar.tsx`
- **Files changed**: `App.tsx`, `ui/components/TopBar.tsx`, `ui/components/NavBar.tsx`, `ui/screens/ZoneScreen.tsx`, `ui/screens/InventoryScreen.tsx`, `ui/screens/CraftingScreen.tsx`, `ui/screens/CharacterScreen.tsx`

### Sprint 9B Changes (Loot Screen Overhaul)
- **Mobile compact gear strip**: On mobile (`isMobile === true`), equipped gear section renders as a single-row horizontal scroll strip (`overflow-x-auto`) of 16 compact slot tiles (w-11 h-11) instead of the 2-column paper doll. Each tile shows slot icon + rarity-colored bg if equipped, dashed border if empty. Tap = select item (same `handlePaperDollSelect` handler). Selected state: `ring-2 ring-white`. Desktop paper doll unchanged. Uses new `ALL_GEAR_SLOTS` constant (all 16 slots including ring2/trinket2).
- **Auto-sell toggle**: New Salvage/Sell segmented toggle (`autoDisposalAction: 'salvage' | 'sell'`) next to the rarity threshold dropdown. Salvage = auto-salvage for enchanting essence (existing behavior). Sell = auto-sell for gold (`SELL_GOLD[rarity] + floor(iLvl/5)`). Overflow items (bag full) always salvage for essence regardless of toggle. New `setAutoDisposalAction` store action. `addItemsWithOverflow()` updated with `autoDisposalAction` param — returns `autoSoldGold` and `autoSoldCount`. All 6 callers updated. Gold from auto-sell flows into `goldGained` in ProcessClearsResult.
- **Armor type badges on bag tiles**: Small P/L/C badge (absolute positioned, bottom-right) on armor item tiles in the bag grid. Uses existing `ARMOR_TYPE_BADGE` constant for colors: Plate=silver, Leather=brown, Cloth=purple.
- **Mobile currency in bottom sheet**: Compact currency pill selector row inside `renderDetailPanel()`, shown on mobile when item is not equipped and player has currencies. Same compact pill style as collapsed currency bar. Tap currency → "Apply" button appears below. Desktop currency bar in main column unchanged.
- **Offline auto-sell display**: OfflineProgressModal shows "~X will be auto-sold on claim (+Yg)" when `autoSoldCount > 0`. `OfflineProgressSummary` type extended with `autoSoldCount` and `autoSoldGold` fields.
- **Save v23 migration**: Adds `autoDisposalAction: 'salvage'` to existing saves. Bumps version 22→23.
- **New types**: `autoDisposalAction` on GameState, `autoSoldCount`/`autoSoldGold` on ProcessClearsResult + OfflineProgressSummary.
- **Files changed**: `types/index.ts`, `store/gameStore.ts`, `ui/screens/InventoryScreen.tsx`, `ui/components/OfflineProgressModal.tsx`

### Sprint 9C Changes (Combat Difficulty Overhaul)
- **Level-based damage multiplier**: New `calcLevelDamageMult(playerLevel, zoneILvlMin)` in `engine/zones.ts`. Underleveled (zone > player): exponential `LEVEL_DAMAGE_BASE(1.12)^delta`. Overleveled (player > zone): linear `1 - delta * OVERLEVEL_DAMAGE_REDUCTION(0.06)`, floor at `OVERLEVEL_DAMAGE_FLOOR(0.30)`. At-level: 1.0.
- **Minimum unavoidable damage when underleveled**: In `applyNormalClearHp()`, when `zoneILvlMin > playerLevel`, enforces `minNetDamage = maxHp * UNDERLEVEL_MIN_NET_DAMAGE(0.02) * levelDelta` as floor on net change. 5 levels under = min 10% maxHp loss per clear. Prevents capped-resist immortality.
- **`lifeRegen` stat functional in combat**: `calcRegenPerClear(maxHp, clearTime, lifeRegen)` adds `lifeRegen * clearTime` bonus. Faster clears = less regen from gear (natural balance). Slow clears (underleveled) = more regen (small mercy). The `lifeRegen` prefix affix now has combat value.
- **Intra-band zone pressure scaling**: `calcDefensiveEfficiency(stats, band, zoneILvlMin?)` refines `zonePressure *= (1 + (zoneILvlMin - bandBaseILvl) * ZONE_ILVL_PRESSURE_SCALE(0.04))`. Band base iLvls: [1, 11, 21, 31, 41, 51]. Last zone in band has ~40% more pressure than first.
- **Boss level scaling**: `calcBossDps()` multiplied by `calcLevelDamageMult()`. Also uses zone-refined `calcDefensiveEfficiency()` with `zoneILvlMin`.
- **5 new balance constants**: `LEVEL_DAMAGE_BASE(1.12)`, `OVERLEVEL_DAMAGE_REDUCTION(0.06)`, `OVERLEVEL_DAMAGE_FLOOR(0.30)`, `UNDERLEVEL_MIN_NET_DAMAGE(0.02)`, `ZONE_ILVL_PRESSURE_SCALE(0.04)`.
- **Updated callers**: `processNewClears()` in gameStore passes `character.level`, `zone.iLvlMin`, `currentClearTime`, `stats.lifeRegen` to combat functions. ZoneScreen display HP interpolation updated. CharacterScreen DefensePanel passes `zoneILvlMin` for accurate display.
- **Files changed**: `data/balance.ts`, `engine/zones.ts`, `engine/setBonus.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`, `ui/screens/CharacterScreen.tsx`

### Sprint 9D Changes (Crafting Screen Polish)
- **Material tooltips on recipe cards**: Recipe card material pills now wrapped in `<Tooltip>` showing `getMatTooltip()` content (gathering source, refinement target, zone locations). Formatted material name added to pill text. Gold pill wrapped with "Gold cost" tooltip. `cursor-help` class added.
- **Zone source info in material tooltips**: Static `materialToZones` reverse lookup (Map<string, string[]>) built from `ZONE_DEFS` at module scope. Raw material tooltips enhanced: "Gathered via Mining. Refine into Cindite Ingot.\nFound in: Stonefang Quarry, Glintstone Pass". Refined material tooltips show source zones: "Refined from cindite ore. Used in crafting recipes.\nSource: Stonefang Quarry, Glintstone Pass".
- **Formatted material names on zone cards**: `zone.materialDrops.join(', ')` → `.map(m => m.replace(/_/g, ' ')).join(', ')`. Added `text-xs` class for consistency.
- **Batch crafting (`craftRecipeBatch`)**: New store action following `refineMaterialBatch` pattern. Signature: `(recipeId, count, catalystId?, affixCatalystId?) => { crafted, lastItem, salvaged } | null`. Loops up to `count` times: checks `canCraftRecipe`, consumes materials/gold/catalysts, adds XP per iteration. Material recipes: increments output count. Item recipes: accumulates items array, single `addItemsWithOverflow()` at end. Returns summary for flash message.
- **"All" button on recipe cards**: Added next to Craft/Brew button (same style pattern as Refine panel's "All" button). Calculates max craftable from materials/gold/catalysts. Flash message: "Crafted 5x Iron Sword (2 salvaged)" for items, "Crafted 10x Whetstone" for materials.
- **Files changed**: `store/gameStore.ts` (new `craftRecipeBatch` action + interface type), `ui/screens/CraftingScreen.tsx` (tooltips, zone lookup, batch UI), `ui/screens/ZoneScreen.tsx` (material name formatting)

### Sprint 10A Changes (Active Skills & Damage Tags Foundation)
- **DamageTag type**: Union type with 12 tags: Attack, Spell, Melee, Projectile, AoE, DoT, Channel, Physical, Fire, Cold, Lightning, Chaos.
- **ActiveSkillDef interface**: Full skill definition with baseDamage, weaponDamagePercent, spellPowerRatio, castTime, cooldown, levelRequired, icon, hitCount, dotDuration, dotDamagePercent.
- **48 active skill definitions** (`src/data/skills.ts`): 6 per weapon × 8 weapons. Sword (Slash/Double Strike/Whirlwind/Flame Slash/Blade Ward/Mortal Strike), Axe (Chop/Frenzy/Cleave/Searing Axe/Rend/Decapitate), Mace (Crush/Rapid Strikes/Shockwave/Glacial Hammer/Concussive Blow/Pulverise), Dagger (Stab/Blade Flurry/Fan of Knives/Viper Strike/Smoke Screen/Assassinate), Staff (Arcane Bolt/Spark/Fireball/Ice Shard/Arcane Shield/Meteor), Wand (Magic Missile/Chain Lightning/Frostbolt/Searing Ray/Essence Drain/Void Blast), Bow (Arrow Shot/Rapid Fire/Multi-Shot/Burning Arrow/Smoke Arrow/Snipe), Crossbow (Bolt Shot/Burst Fire/Explosive Bolt/Frost Bolt/Net Shot/Siege Shot). Lookup maps: `getSkillsForWeapon()`, `getSkillDef()`.
- **Tag-based DPS engine** (`src/engine/skills.ts`): `calcSkillDps(skill, stats, weaponAvgDmg, weaponSpellPower)`. Base damage: Attack=weapon*weaponDmgPct+flatPhys/ele, Spell=baseDmg+(SP)*ratio+flatSpellEle. %increased ADDITIVE (PoE-style): Attack→incAttackDmg, Spell→incSpellDmg, Physical→incPhysDmg, Fire→incFireDmg+incEleDmg, Cold→incColdDmg+incEleDmg, Lightning→incLtnDmg+incEleDmg, Chaos→nothing extra. Speed: Attack→attackSpeed, Spell→castSpeed. Hit chance: Attack→accuracy formula, Spell→1.0. Crit multiplier applied. Hit count multiplied. Per-second DPS. DoT bonus: `(hitDmg * dotDmgPct * dotDuration) / castTime * speedMult`.
- **Combat engine wired** (`engine/zones.ts`): `calcPlayerDps()` now accepts optional `equippedSkills`. If skill set → `calcSkillDps()`. Else auto-assigns default for weapon type. Else falls back to legacy `calcTotalDps()`. `calcClearTime()` and `createBossEncounter()` pass equippedSkills through. All 4 store call sites updated.
- **State + v24 migration** (`store/gameStore.ts`): `equippedSkills: [null, null, null, null]` added to initial state + GameState type. `equipItem`: auto-assigns default skill on weapon equip, clears on weapon unequip. `unequipSlot`: clears skills when mainhand removed. Migration v23→v24: auto-assigns default skill for equipped weapon. Rehydrate: auto-assigns if weapon equipped but skill[0] is null.
- **Files added**: `src/data/skills.ts`, `src/engine/skills.ts`
- **Files changed**: `src/types/index.ts`, `src/engine/zones.ts`, `src/store/gameStore.ts`, `docs/PROJECT_STATUS.md`

### Sprint 10C Changes (Skill Equip UI + Combat Stats Display)
- **`equipSkill` store action** (`store/gameStore.ts`): New `equipSkill(skillId, slot?)` action on GameActions interface. Validates: skill exists via `getSkillDef()`, weapon type matches mainhand, player level meets `levelRequired`. Sets skill in `equippedSkills[slot]`. Mid-clear recalculation: if currently running combat, preserves progress %, creates temp state with new skills, calls `computeNextClear()` to get updated clear time and combat result.
- **SkillPanel component** (`ui/components/SkillPanel.tsx`): Reads `character`, `equippedSkills`, `equipSkill` from Zustand store. Computes DPS for all skills via `calcSkillDps()`. Shows current equipped skill with yellow border, DPS value, tags, and stats (cast time, cooldown, hit count, DoT). Grid of available skills with DPS comparison (green +X% / red -X%). Level-locked skills show lock icon + "Lv.X", disabled. Tag color map: Attack=red, Spell=blue, Physical=gray, Fire=orange, Cold=cyan, Lightning=yellow, Chaos=purple, DoT=green, Channel=teal.
- **CharacterScreen changes** (`ui/screens/CharacterScreen.tsx`): Imports SkillPanel, calcSkillDps, resolveStats, getWeaponDamageInfo, getSkillDef, getDefaultSkillForWeapon. Computes skill DPS in component body. Stats Grid section now shows "Skill DPS (skill name)" with icon at top. SkillPanel mounted between Stats Grid and Abilities Panel.
- **ZoneScreen combat stats** (`ui/screens/ZoneScreen.tsx`): Destructures `lastClearResult` from store. New compact one-line display between mob progress and AbilityBar: "{totalCasts} casts, {hits} hits (green), {crits} crits (yellow), {misses} miss (red, hidden if 0), {clearTime}s". Only shown during combat clearing phase when `lastClearResult` is not null.
- **No save migration**: `equippedSkills` already in v24 state. `equipSkill` stores different skill ID in existing array.
- **Files added**: `src/ui/components/SkillPanel.tsx`
- **Files changed**: `src/store/gameStore.ts`, `src/ui/screens/CharacterScreen.tsx`, `src/ui/screens/ZoneScreen.tsx`, `docs/PROJECT_STATUS.md`

### Sprint 10D Changes (Delivery Tag Stats + Affixes)
- **5 new StatKey values**: `incMeleeDamage`, `incProjectileDamage`, `incAoEDamage`, `incDoTDamage`, `incChannelDamage` added to `StatKey` union and `AffixCategory` union.
- **5 new affix definitions** (`data/affixes.ts`): `inc_melee_damage` "of the Gladiator" (attack_weapons+gloves+amulets, w60), `inc_projectile_damage` "of Marksmanship" (all_weapons+gloves+amulets, w60), `inc_aoe_damage` "of Cataclysm" (all_weapons+amulets, w50), `inc_dot_damage` "of Affliction" (all_weapons+rings+amulets, w50), `inc_channel_damage` "of Focus" (spell_weapons+amulets, w40). All prefix, T10:3-5% to T1:28-40% (mirrors inc_fire_damage).
- **DPS engine wired** (`engine/skills.ts`): 5 delivery tag checks added to `calcSkillDamagePerCast()` %increased section. Skills with Melee/Projectile/AoE/DoT/Channel tags now scale from gear.
- **BASE_STATS updated** (`data/balance.ts`): 5 new keys initialized to 0.
- **STAT_LABELS updated** (`ui/screens/InventoryScreen.tsx`): Display labels for item comparison.
- **No save migration**: New stats default to 0, new affixes on newly generated items only.
- **Files changed**: `src/types/index.ts`, `src/engine/skills.ts`, `src/data/balance.ts`, `src/data/affixes.ts`, `src/ui/screens/InventoryScreen.tsx`

### Sprint 10E Changes (Elemental Skill Diversity)
- **10 skills changed element**: sword_whirlwind→Cold "Frost Whirl", sword_blade_ward→Lightning "Thunder Guard", axe_cleave→Lightning "Thunder Cleave", mace_shockwave→Lightning "Thunderstrike", mace_concussive_blow→Fire "Molten Blow", dagger_fan_of_knives→Cold "Frost Fan", dagger_smoke_screen→Chaos "Shadow Step", bow_multi_shot→Cold "Ice Barrage", bow_smoke_arrow→Lightning "Shock Arrow", crossbow_net_shot→Lightning "Shock Net". Updated names, descriptions, icons, baseDamage, tags.
- **3 new skills added**: `sword_ice_thrust` (Cold+Melee, Lv12), `axe_frost_rend` (Cold+Melee+DoT, Lv12), `dagger_lightning_lunge` (Lightning+Melee, Lv12).
- **51 total active skills** (was 48). Element distribution per weapon: Sword 2P/1F/2C/1L, Axe 2P/1F/1C/1L, Mace 2P/1F/1C/1L, Dagger 2P/1C/1L/2Ch, Bow 2P/1F/1C/1L, Crossbow 2P/1F/1C/1L, Staff 2P/2F/1C/1L, Wand 1P/1F/1C/1L/2Ch.
- **No save migration**: Skill IDs unchanged, DPS recalculates automatically.
- **Files changed**: `src/data/skills.ts`

### Sprint 10F Changes (Unified SkillDef Type + Data)
- **New unified types** (`types/index.ts`): `SkillKind` ('active'|'passive'|'buff'|'instant'|'proc'|'toggle'|'ultimate'), `SkillDef` (unified interface for damage skills + buff/passive/utility), `EquippedSkill` ({skillId, autoCast}), `SkillProgress`, `SkillTimerState`.
- **Unified skill data** (`data/unifiedSkills.ts`, NEW): Programmatically converts 51 `ActiveSkillDef` + 24 `AbilityDef` = 75 `SkillDef`. Active skills: `kind:'active'`, keep tags/damage fields. Abilities: keep original kind, `tags:[]`, damage fields zeroed. 5 ID conflicts resolved (ability versions get `_buff` suffix): `axe_cleave_buff`, `mace_shockwave_buff`, `crossbow_explosive_bolt_buff`, `bow_rapid_fire_buff`, `wand_chain_lightning_buff`. Exports `ABILITY_ID_MIGRATION` map, `SKILL_DEFS`, `getUnifiedSkillsForWeapon()`, `getUnifiedSkillDef()`, `getSkillsByKind()`, `getSkillsByKindForWeapon()`.
- **Unified skill engine** (`engine/unifiedSkills.ts`, NEW): `calcUnifiedDps()` delegates to `calcSkillDps()` for active skills. `resolveSkillEffect()` delegates to `resolveAbilityEffect()` for non-active skills. `aggregateSkillBarEffects()` replaces `aggregateAbilityEffects()` for 8-slot skill bar. `getPrimaryDamageSkill()` finds first active skill in bar.
- **Old files kept alive**: `data/skills.ts`, `data/abilities.ts`, `engine/abilities.ts` unchanged — removed in Sprint 10J.
- **No save migration**: New types exist alongside old.
- **Files added**: `src/data/unifiedSkills.ts`, `src/engine/unifiedSkills.ts`
- **Files changed**: `src/types/index.ts`

### Sprint 10H Changes (Skill Bar UI)
- **New `SkillBar.tsx` component** (`ui/components/SkillBar.tsx`): 8-slot horizontal bar replacing old `AbilityBar`. Reads from unified `skillBar`/`skillProgress`/`skillTimers` store fields. 56px slots (w-14 h-14, smaller than old 64px for mobile). Kind-based border colors and interactivity: active/passive/proc are display-only, toggle/buff/instant/ultimate are clickable. Timer refresh via 250ms `setInterval`. XP bars at bottom of each slot. Slots 5-7 locked "Soon", slots 1-4 use `ABILITY_SLOT_UNLOCKS`.
- **New `activateSkillBarSlot` store action** (`store/gameStore.ts`): Reads `skillBar[slotIndex]`, returns if null/non-activatable kind (active/passive/proc). Builds reverse map from `ABILITY_ID_MIGRATION` (newId→oldId), delegates to `activateAbility(oldAbilityId)`. Reuses all existing activation logic (toggle/buff/instant handling, mage arcane charges, mid-clear recalc, timer bridge writes).
- **Rewritten `SkillPanel.tsx`** (`ui/components/SkillPanel.tsx`): Unified skill browser for all kinds. Section 1: compact 5-slot equipped bar overview with click-to-select targeting + unequip button. Section 2: kind filter tabs (All/Active/Buff/Passive/Toggle/Instant). Section 3: available skills grid with DPS comparison for active skills, kind badges, equip button. Section 4: inline `SkillTreeView` for equipped non-active skills (skill tree management via old ability IDs using `REVERSE_MIGRATION` map).
- **ZoneScreen updated** (`ui/screens/ZoneScreen.tsx`): Replaced `AbilityBar` import with `SkillBar`, `AbilityPicker` with `SkillPicker`. Removed old `AbilityPicker` (~135 lines), `ZoneSkillTreeView` (~75 lines). New `SkillPicker` (~80 lines): collapsible panel showing available skills with slot equip buttons (1-5), no tree management. SkillBar now visible during boss fights (`combatPhase === 'boss_fight'`). Cleaned old imports (`getAbilitiesForWeapon`, `getAbilityDef`, `getAbilityXpForLevel`, `canAllocateNode`, `getRespecCost`, `AbilityDef`, `AbilityProgress`).
- **CharacterScreen updated** (`ui/screens/CharacterScreen.tsx`): Removed `AbilityPanel` (~170 lines), `SkillTreeView` (~120 lines), `KIND_BADGE_COLORS`, `WEAPON_TYPE_LABELS`, `WEAPON_TYPE_ICONS`. Removed `<AbilityPanel />` mount. Updated `SkillPanel` now handles both active skills and ability management. Cleaned old imports.
- **Bundle size**: 496 kB (reduced from 502 kB despite new components).
- **No save migration**: No state changes. UI-only sprint.
- **Files added**: `src/ui/components/SkillBar.tsx`
- **Files changed**: `src/store/gameStore.ts`, `src/ui/components/SkillPanel.tsx`, `src/ui/screens/ZoneScreen.tsx`, `src/ui/screens/CharacterScreen.tsx`

### Sprint 10I Changes (Auto-Cast Engine + Priority)
- **Click bug fixed**: `activateSkillBarSlot` rewritten from broken delegation to `activateAbility(oldId)` → proper `set()` action working directly from `skillBar`/`skillTimers` state. Handles all kinds: toggle (flip activatedAt, no GCD), buff (set activatedAt + cooldownUntil), instant/ultimate (null activatedAt + cooldownUntil). Bridges to legacy `abilityTimers`. Mage arcane charge increment. Mid-clear recalculation preserving progress %.
- **Auto-cast engine** (`tickAutoCast` store action): Called from 250ms tick in ZoneScreen. Only fires during `clearing`/`boss_fight` phases. Iterates slots 0→7 (priority order). Toggles: auto-ON if OFF, no GCD. Buff/instant/ultimate: checks individual cooldown + GCD, fires if ready. `break` on GCD hit (optimization). Re-reads state via `get()` after each activation since `activateSkillBarSlot` does `set()`.
- **Global Cooldown**: `SKILL_GCD = 1.0` in `data/balance.ts`. `lastSkillActivation: number` added to `GameState` (ephemeral, reset to 0 on rehydrate). Toggles skip GCD. Buff/instant/ultimate respect GCD. Creates rotation feel.
- **Auto-cast defaults**: `equipToSkillBar` now sets `autoCast: true` for ALL skill kinds (was false for buff/toggle/instant/ultimate). Rehydrate fix upgrades existing saves.
- **Auto-cast UI**: Green "A" indicator in top-left of toggle/buff/instant/ultimate SkillBar slots. Click toggles `autoCast` via `toggleSkillAutoCast`. `e.stopPropagation()` prevents manual activation.
- **New engine function**: `getSkillEffectiveCooldown()` in `engine/unifiedSkills.ts` — wraps `getEffectiveCooldown()` with SkillProgress→AbilityProgress conversion.
- **Module-level `REVERSE_ABILITY_MAP`**: Built once from `ABILITY_ID_MIGRATION` at module scope (was rebuilt per click).
- **Files changed**: `src/engine/unifiedSkills.ts`, `src/types/index.ts`, `src/data/balance.ts`, `src/store/gameStore.ts`, `src/ui/screens/ZoneScreen.tsx`, `src/ui/components/SkillBar.tsx`

### Sprint 10J Changes (Cleanup Old Systems)
- **All imports rerouted**: 7 files migrated from `engine/abilities`, `engine/skills`, `data/abilities`, `data/skills` → `engine/unifiedSkills`, `data/unifiedSkills`.
- **5 legacy files deleted**: `engine/abilities.ts`, `engine/skills.ts`, `data/abilities.ts`, `data/skills.ts`, `ui/components/AbilityBar.tsx`. Zero remaining references.
- **5 old store actions removed**: `equipAbility`, `unequipAbility`, `selectMutator`, `activateAbility`, `toggleAbility` (+ `REVERSE_ABILITY_MAP`). ~240 lines of bridge code removed.
- **All legacy bridge code removed**: Dual-writes to `abilityTimers`, `equippedAbilities`, `equippedSkills` eliminated from `activateSkillBarSlot`, `equipItem`, `unequipSlot`, `equipSkill`, `equipToSkillBar`, `processNewClears`.
- **3 legacy state fields removed**: `equippedAbilities`, `abilityTimers`, `equippedSkills` removed from `GameState` type and initial state.
- **Skill bar reduced to 5 slots**: Was 8 (with 3 "Soon" placeholders). Now 5 clean slots.
- **v26 migration**: Strips legacy fields, truncates `skillBar` to 5.
- **Files changed**: `src/types/index.ts`, `src/store/gameStore.ts`, `src/ui/screens/ZoneScreen.tsx`, `src/ui/components/SkillBar.tsx`, `src/ui/components/SkillPanel.tsx`, `src/ui/screens/CharacterScreen.tsx`, `src/engine/zones.ts`
- **Files deleted**: `src/engine/abilities.ts`, `src/engine/skills.ts`, `src/data/abilities.ts`, `src/data/skills.ts`, `src/ui/components/AbilityBar.tsx`

### Sprint 10K-A Changes (Real-Time Combat Engine)
- **`tickCombat(_dt)` store action** (`store/gameStore.ts`): Fires active skill on cast interval using `calcSkillCastInterval()`, rolls hit/crit/damage via `rollSkillCast()`, subtracts from `currentMobHp`. On mob death: resets HP to `maxMobHp`, increments kill count. Safety cap: 10 kills/tick. Returns `CombatTickResult` for UI to process (XP grant, drop processing, boss check).
- **2 new engine functions** (`engine/unifiedSkills.ts`): `calcSkillCastInterval(skill, stats, atkSpeedMult)` returns effective cast time in seconds (accounts for attack/cast speed + ability speed mult). `rollSkillCast(skill, stats, weaponAvgDmg, weaponSpellPower, damageMult)` returns `{damage, isCrit, isHit}` with per-hit accuracy/crit/variance rolls (reuses logic from `simulateCombatClear`).
- **3 ephemeral GameState fields** (`types/index.ts`): `currentMobHp: number`, `maxMobHp: number`, `lastSkillCastAt: number`. Reset to 0 on rehydrate. No save migration needed.
- **New type** (`types/index.ts`): `CombatTickResult` interface: `{mobKills, skillFired, damageDealt, skillId, isCrit}`.
- **New constant** (`data/balance.ts`): `COMBAT_TICK_INTERVAL = 250` (documents tick rate).
- **`startIdleRun` modified**: Initializes `currentMobHp` and `maxMobHp` from `calcMobHp(zone)`, sets `lastSkillCastAt = now`.
- **`checkRecoveryComplete` modified**: Resets mob HP when resuming clearing after boss victory/defeat.
- **ZoneScreen tick loop**: Calls `tickCombat(dtSec)` during clearing phase (combat mode only). On kills: grants XP, calls `processNewClears()`, checks boss spawn.
- **Old time-based loot processing**: Now only active for gathering mode. Combat mode fully driven by `tickCombat`.
- **MobDisplay**: Changed from `clearProgress` (time-based) to `mobCurrentHp/mobMaxHp` (real HP bar).
- **What does NOT change**: Offline progression, boss fights (`tickBoss`), HP balance, gathering mode, save format, `calcClearTime()`.
- **Files changed**: `src/types/index.ts`, `src/engine/unifiedSkills.ts`, `src/data/balance.ts`, `src/store/gameStore.ts`, `src/ui/screens/ZoneScreen.tsx`

### Sprint 10G Changes (Skill Bar Store + Migration v25)
- **3 new GameState fields** (`types/index.ts`): `skillBar: (EquippedSkill | null)[]` (8 unified slots), `skillProgress: Record<string, SkillProgress>`, `skillTimers: SkillTimerState[]`.
- **New imports** (`store/gameStore.ts`): `aggregateSkillBarEffects`, `getPrimaryDamageSkill` from `engine/unifiedSkills.ts`; `getUnifiedSkillDef`, `ABILITY_ID_MIGRATION` from `data/unifiedSkills.ts`. Removed unused `aggregateAbilityEffects` import.
- **4 new store actions**: `equipToSkillBar(skillId, slotIndex)` — validates via `getUnifiedSkillDef()`, weapon match, level req, deduplicates across slots, defaults autoCast by kind, inits progress/timers, mid-clear recalc. `unequipSkillBarSlot(slotIndex)` — clears slot, removes timer, preserves progress. `toggleSkillAutoCast(slotIndex)` — flips autoCast boolean. `reorderSkillBar(from, to)` — swaps two slots.
- **Engine reads switched to unified system**: All 8 `aggregateAbilityEffects()` calls replaced with `aggregateSkillBarEffects(state.skillBar, state.skillProgress, state.skillTimers, ...)`. Affected: `startIdleRun`, `processNewClears` (x2), `getEstimatedClearTime`, `activateAbility`, `equipSkill`, `startBossFight`, rehydrate offline sim. `computeNextClear` now uses `getPrimaryDamageSkill(state.skillBar)` with fallback to legacy `equippedSkills`.
- **Ability XP dual-write**: `processNewClears` writes XP to both `skillProgress` (unified, keyed by migrated ID) and `abilityProgress` (legacy, keyed by old ID) using reverse `ABILITY_ID_MIGRATION` lookup. Both included in `set()` call.
- **Bridge old actions**: `equipAbility` → also writes `skillBar[slotIndex+1]` + init skillTimers/skillProgress. `unequipAbility` → also clears `skillBar[slotIndex+1]` + removes skill timer. `toggleAbility` → also mirrors toggle state to `skillTimers`. `activateAbility` → also mirrors timer changes (toggle, buff, instant branches) to `skillTimers`. `equipSkill` → also sets `skillBar[0] = {skillId, autoCast: true}`. `equipItem` (mainhand) → mirrors default skill to `skillBar[0]`, clears weapon-incompatible skills from slots 1-4. `unequipSlot` (mainhand) → clears `skillBar[0]` + weapon-bound slots 1-4.
- **v25 migration**: `skillBar[0]` from `equippedSkills[0]` (wrapped as `{skillId, autoCast: true}`). `skillBar[1-4]` from `equippedAbilities[0-3]` with `ABILITY_ID_MIGRATION` ID remapping (autoCast: passive/proc = true, others = false). `skillProgress` migrated from `abilityProgress` entries with new IDs. `skillTimers` fresh entries for buff/toggle/instant/ultimate kinds.
- **Rehydrate safety**: Null guards for `skillBar`, `skillProgress`, `skillTimers`. Stale skill timer cleanup (mirror existing abilityTimers cleanup): clear cooldowns/activations, remove timers for skills no longer in bar.
- **Save version**: v24 → v25.
- **Files changed**: `src/types/index.ts`, `src/store/gameStore.ts`

## Micro-Sprint Workflow
Each conversation = one micro-sprint (3-5 related changes):
1. **Read** `docs/PROJECT_STATUS.md` + relevant files only
2. **Execute** 3-5 related changes (same system/area)
3. **Build** `npm run build` (catches unused imports/vars that `tsc --noEmit` misses)
4. **Update** `docs/PROJECT_STATUS.md` with changes made
5. **Commit + push** `git push origin master`

Rules:
- Never try to do more than 5 related changes per session
- Group changes by system (engine OR UI, not both unless tightly coupled)
- If a sprint touches >6 files, it's too big — split it

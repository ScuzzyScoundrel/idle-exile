# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-03-01 (Post-Sprint 9B)

## Current Phase
**Sprint 9B: Loot Screen Overhaul** — COMPLETE.
- **Mobile compact gear strip**: On mobile, the collapsible equipped gear section renders as a single-row horizontal scroll strip of 16 compact slot tiles (44x44px) instead of the 2-column paper doll. Tap = select item. Desktop paper doll unchanged.
- **Auto-sell toggle**: New Salvage/Sell segmented toggle next to the rarity threshold dropdown. Salvage = auto-salvage for essence (existing behavior). Sell = auto-sell for gold (base gold + iLvl/5). Overflow items always salvage regardless. New `autoDisposalAction` state field with save v23 migration.
- **Armor type badges on bag tiles**: Small P/L/C badge in bottom-right corner of armor item tiles in the bag grid. Plate=silver, Leather=brown, Cloth=purple.
- **Mobile currency in bottom sheet**: Compact currency pill selector row inside the item detail panel (bottom sheet) on mobile. Tap currency → "Apply" button appears. Desktop currency bar unchanged.
- **Offline auto-sell display**: Offline progress modal shows "~X will be auto-sold on claim (+Yg)" when auto-sell is active.
- Previous 9A changes still active: desktop layout widening, combat status bar.
- Next: Additional UX/UI improvements or new features

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
- **Zones tab**: 30 zones shown via horizontal band tab pills. Combat/Gathering toggle. Profession selector + XP bar in gathering mode. Zone cards with level badges, gathering type icons, hazard icons, mastery badges. Session summary with rare material find notifications. Ability bar in combat mode.
- **Inventory tab ("Loot")**: Two-panel layout with equipped gear + bag grid. Bag slots section. Right-click to equip. Hover tooltips with stat comparison. Currency crafting UI. Auto-salvage filter. 5-tier rarity colors.
- **Craft tab**: Materials/Refine/Craft toggle. Materials: organized by refinement track with rarity borders and icon pills, tooltips on hover. Refine: 6 track pills → T1-T6 recipe chain. Craft: 6 profession pills with level/XP bar → collapsible category sections with 2-column compact recipe cards, material icon pills, tier badges, catalyst dropdowns.
- **Character tab ("Hero")**: Paper doll (16 gear slots), 13 stats including poison/chaos resist, materials list, ability management panel.

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
- **Combat HP**: `applyNormalClearHp()` per clear. Damage = maxHp * 0.15 * scale(defEff) * variance(0.7-1.3). Regen = maxHp * 0.08. No minimum drain floor — good defense can fully heal. **Death possible**: HP can reach 0, triggering `zone_defeat` recovery phase (5s, resets boss counter). Ability `resistBonus` now applied to defEff and hazard calcs via `applyAbilityResists()`.
- **Boss mechanics**: Every 10 clears (count resets on new run or zone death). `calcBossMaxHp(zone)` = `150 * band^2`. `calcBossDps()` = zone-specific pressure (`BOSS_DPS_BASE * band^1.5 + baseClearTime * 0.2`) + hazard bonus (15% per unresisted hazard) * damageScale * multiplier(1.0). `calcPlayerDps()` drives real-time simulation. `tickBossFight()` resolves frame-by-frame. `generateBossLoot()` at iLvlMax + 5. Victory/defeat/zone_defeat phases with timed recovery.
- **Auto-apply resources**: `processNewClears()` immediately applies all drops to state. Session summary tracked in UI local state.
- **Ability system**: 6 ability kinds (passive/buff/instant/proc/toggle/ultimate). Per-ability skill trees with 3 paths x 2 nodes. Ability XP: `10 + floor(band*2)` per clear. XP per level: `100*(level+1)`. Max level 10. Respec cost: `50*level^2` gold. Slot unlock at character Lv.1/5/12/20.
- **Per-clear tracking**: `clearStartedAt` + `currentClearTime` replace modulo-based progress. Mid-clear ability activation preserves progress % but adjusts remaining time.
- **Bag system**: 5 equippable bag slots (T1:6→T5:14). Start 30 total, max 70.
- **Crafting (currencies)**: `applyCurrency(item, type)` — augment, chaos, divine, annul, exalt, greater_exalt (top-2 tiers), perfect_exalt (T1 guaranteed)
- **Save**: Zustand persist v23. v22→v23 adds `autoDisposalAction: 'salvage'`. v21→v22 renames `materials.salvage_dust` → `materials.enchanting_essence`. v20→v21 adds `greater_exalt` + `perfect_exalt` currencies. Migrations: v11→v12 adds `craftingSkills`, v12→v13 adds leatherworker + jeweler skills, v13→v14 adds `craftAutoSalvageMinRarity`, v14→v15 adds `zoneClearCounts` + combat HP fields, v17→v18 adds `classResource` + `classSelected`, v18→v19 adds `abilityProgress` + `clearStartedAt` + `currentClearTime` (clears old mutator selections).

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
    abilities.ts            — 24 ability defs (8 weapon types x 3) with skill trees
    classes.ts              — 4 class definitions with resource config (warrior, mage, ranger, rogue)
    setBonuses.ts           — 4 armor-type set bonus definitions
  engine/                   — Pure TypeScript (no React)
    items.ts                — Item generation, affix rolling, rarity classification, generateGatheringItem()
    zones.ts                — Clear speed calc, idle simulation, hazards, mastery, simulateGatheringClear() with rare drops
    gathering.ts            — Gathering XP curve, level-ups, yield calc, milestones, skill requirements
    rareMaterials.ts        — rollRareMaterialDrop(), calcRareFindBonus()
    refinement.ts           — canRefine(), refine(), canDeconstruct(), deconstruct(), getRefinementChain()
    craftingProfessions.ts  — addCraftingXp(), canCraftRecipe(), executeCraft(), getCraftingXpForTier()
    abilities.ts            — Ability effect resolution, skill tree, XP, timer management, aggregation
    classResource.ts        — Class resource pure functions (create, tick, decay, reset, modifiers)
    character.ts            — Stats resolution (13 stats), XP/leveling
    crafting.ts             — 6 currency crafting operations
    setBonus.ts             — Set bonus resolution
  store/
    gameStore.ts            — Zustand store (state + actions + persistence + v19 migration). Actions: selectClass, tickClassResource, startBossFight, tickBoss, handleBossVictory, handleBossDefeat, checkRecoveryComplete, allocateAbilityNode, respecAbility, toggleAbility + all previous.
  ui/
    slotConfig.ts           — Shared gear slot icons/labels
    components/
      NavBar.tsx            — Bottom navigation (Zones/Loot/Craft/Hero — 4 tabs)
      TopBar.tsx            — Character info, XP bar, currency counts
      CombatStatusBar.tsx   — Persistent combat/gathering status bar (visible during runs)
      OfflineProgressModal.tsx — "Welcome Back" modal
      AbilityBar.tsx        — 4-slot ability action bar
      Tooltip.tsx           — Reusable hover tooltip component
      ClassPicker.tsx       — 4-class selection screen (new game / reset)
    screens/
      ZoneScreen.tsx        — Band tabs, Combat/Gathering toggle, profession selector, session summary with rare finds
      InventoryScreen.tsx   — Bag grid + currency crafting UI + auto-salvage + detail panel
      CraftingScreen.tsx    — Materials/Refine/Craft toggle. Materials: track-grouped panel with rarity borders + tooltips. Refine: track pills → T1-T6 chain. Craft: profession pills → collapsible categories with 2-col compact recipe grid, material icon pills, catalyst dropdowns.
      CharacterScreen.tsx   — Paper doll (16 slots), 13 stats, materials, ability management
  App.tsx                   — Main app shell with CSS-hidden tab routing (4 tabs)
  main.tsx                  — Entry point
  index.css                 — Tailwind directives + base styles
```

## Known Issues & Technical Debt
- [ ] Socket currency defined but no crafting logic
- [ ] No trinket item bases (trinket1/trinket2 slots empty)
- [ ] Set bonus UI not shown on character screen
- [ ] Zone familiarity passive not implemented
- [ ] `simulateIdleRun()` and `simulateSingleClear()` share drop logic — could refactor
- [ ] ItemCard component exists but is no longer imported anywhere (orphaned)
- [ ] Offline gathering doesn't use rareFindBonus (rare drops only during real-time)

## What's Next
**See `SPRINT_PLAN.md` for the full roadmap with detailed implementation notes.**

Immediate priority:
1. Phase 3 (UX/UI Overhaul) or additional economy tuning — see SPRINT_PLAN.md

Then Phase 4 (New Features) — all detailed in SPRINT_PLAN.md.

Unfinished from original GDD scope (integrated into roadmap):
- Talent tree (30-50 nodes per class) — not yet scheduled
- Specialization system (one per character) — not yet scheduled
- Socket crafting logic — not yet scheduled
- More affix variety (slot-specific affixes) — not yet scheduled
- Gathering gear equip/swap UI + dual loadout — Sprint 10I
- Full ability population (50+ abilities, 10 per weapon type) — not yet scheduled

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

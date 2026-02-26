# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-26 (Sprint 7C-A: Ability System Overhaul)

## Current Phase
**Sprint 7C-A: Ability System Overhaul** — COMPLETE. Ability kinds expanded (passive/buff/instant/proc/toggle/ultimate), per-ability skill trees (3 paths x 2 nodes each), ability XP/leveling (0-10), slot unlock progression (Lv.1/5/12/20), per-clear tracking bug fix (no more progress bar jumps), respec system. Save v19.

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
- **Affix tiers**: T1 (best) through T10 (worst), weighted drop rates favor lower tiers
- **Combat clear speed**: `baseClearTime / (charPower / 50)` then `* 1.12^levelDelta`. Power = `offensivePower * defEff * hazardMult`. No upper cap. Floor at 20% of baseClearTime.
- **Gathering clear speed**: `baseClearTime * 2 / (1 + skillLevel / 25)`. Scales with profession skill level.
- **Level scaling**: Exponential penalty for being under-leveled: each level below zone iLvlMin = 12% longer.
- **Hazards**: Quadratic penalty per hazard, multiplicative across all hazards.
- **Gathering professions**: 5 professions. XP curve: `50 * 1.35^(level-1)`. Milestones at 10/25/50/75/100. Band skill requirements: 1/15/30/50/75/90.
- **Rare material drops**: 25 defs (5 professions × 5 rarities). Per-clear roll, highest rarity first. Rates scale with band (common ~8-18%, legendary 0-0.3%). `rareFindBonus` from milestones + gear.
- **Refinement**: 36 recipes (6 tracks × 6 tiers). T1: 5 raw + gold → 1 refined. T2+: 5 raw + 2 previous refined + gold → 1 refined. Deconstruct: 1 refined → 2 previous tier (T2+ only).
- **Crafting professions**: 6 professions, level 1-100. XP curve matches gathering. 205 recipes (table-driven armor generation). Catalyst system: optional affix catalyst → guaranteed affix; optional rare mat → guaranteed minimum rarity + 1 boosted affix. `executeCraft()` generates item with reroll loop + boosted affix upgrade.
- **Combat HP**: `applyNormalClearHp()` per clear. Damage = maxHp * 0.15 * scale(defEff). Regen = maxHp * 0.08. Floor at 1 HP (can't die to mobs).
- **Boss mechanics**: Every 10 clears via `zoneClearCounts`. `calcBossMaxHp()` = baseClearTime * band * 8. `calcPlayerDps()` and `calcBossDps()` drive real-time simulation. `tickBossFight()` resolves frame-by-frame. `generateBossLoot()` at iLvlMax + 5. Victory/defeat phases with timed recovery.
- **Auto-apply resources**: `processNewClears()` immediately applies all drops to state. Session summary tracked in UI local state.
- **Ability system**: 6 ability kinds (passive/buff/instant/proc/toggle/ultimate). Per-ability skill trees with 3 paths x 2 nodes. Ability XP: `10 + floor(band*2)` per clear. XP per level: `100*(level+1)`. Max level 10. Respec cost: `50*level^2` gold. Slot unlock at character Lv.1/5/12/20.
- **Per-clear tracking**: `clearStartedAt` + `currentClearTime` replace modulo-based progress. Mid-clear ability activation preserves progress % but adjusts remaining time.
- **Bag system**: 5 equippable bag slots (T1:6→T5:14). Start 30 total, max 70.
- **Crafting (currencies)**: `applyCurrency(item, type)` — augment, chaos, divine, annul, exalt
- **Save**: Zustand persist v19. Migrations: v11→v12 adds `craftingSkills`, v12→v13 adds leatherworker + jeweler skills, v13→v14 adds `craftAutoSalvageMinRarity`, v14→v15 adds `zoneClearCounts` + combat HP fields, v17→v18 adds `classResource` + `classSelected`, v18→v19 adds `abilityProgress` + `clearStartedAt` + `currentClearTime` (clears old mutator selections).

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

## Known Issues / Next Iteration TODO
- [ ] Socket currency not yet implemented (defined but no crafting logic)
- [ ] No trinket item bases (trinket1/trinket2 slots empty)
- [x] Class selection implemented (4 classes with unique resource mechanics)
- [ ] Talent tree not built
- [ ] Set bonus UI not shown on character screen
- [ ] Zone familiarity passive not implemented
- [ ] `simulateIdleRun()` and `simulateSingleClear()` share drop logic — could refactor
- [ ] ItemCard component exists but is no longer imported anywhere (orphaned)
- [ ] Gathering gear equip/swap UI not built (gatheringEquipment in state but no UI yet)
- [ ] Dual loadout system (combat set / gathering set) not built yet
- [ ] Offline gathering doesn't use rareFindBonus (rare drops only during real-time)

## What Has NOT Been Built Yet (from GDD MVP scope)
- [x] Class selection (GDD Section 3) — 4 classes with resource mechanics
- [ ] Talent tree (30-50 nodes per class)
- [ ] Specialization system (one per character)
- [ ] Socket crafting logic
- [ ] More affix variety (slot-specific affixes)
- [ ] Gathering gear equip/swap UI + dual loadout

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
| 2026-02-24 | GOLD_PER_BAND 8→3 | Selling gear meaningful |
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

## Priority for Next Session
See `SPRINT_PLAN.md` for full roadmap. Next sprints:
1. **Sprint 7C-B: Full Ability Population** — 50+ abilities from PDF spec (10 per weapon type)
2. **Sprint 7B: Talent Trees** — 30-50 nodes per class
3. **Sprint 8: Gold Economy**
4. **Sprint 9: Gathering Gear UI + Dual Loadout**

# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-25 (Sprint 6 complete)

## Current Phase
**Sprint 6: Material Refinement + Crafting Professions + Rare Materials** — COMPLETE. Added 6 refinement tracks (36 recipes), 5 crafting professions (68 recipes), 25 rare gathering materials with rarity-tiered drop rates, catalyst system for guaranteed minimum item rarity. New Craft tab with Refine/Craft sub-panels. 4-tab NavBar. Rare drop notifications in gathering sessions. Save v12.

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
- **Offline progression**: Close the app, reopen later → "Welcome Back, Exile!" modal. Works for both combat and gathering modes.
- **8 weapon types**: Sword, Axe, Mace, Dagger, Staff, Wand, Bow, Crossbow. 56 mainhand bases.
- **24 abilities**: Each weapon has 2 active + 1 passive ability. Mutator system for customization.
- **Ability bar**: 4 equip slots on ZoneScreen (combat mode only).
- **Combat/Gathering toggle**: Two-button toggle at top of zone screen. Switching modes stops current run.
- **5 gathering professions**: Mining, Herbalism, Skinning, Logging, Fishing. Each has independent skill level (1-100) with XP progression and milestones at 10/25/50/75/100.
- **Gathering mode**: Select a profession → zones show which professions can gather there + skill requirements. Gathering drops only profession-relevant materials + gathering XP. Small chance for gathering-specific gear drops. Rare material drops with rarity-tiered rates.
- **6 refinement tracks**: Ore, Cloth, Leather, Wood, Herb, Fish. Each has 6-tier chain (T1 raw → refined, T2+ requires previous refined + new raw + gold). Deconstruct 1 refined → 2 of previous tier.
- **5 crafting professions**: Weaponsmith, Armorer, Tailor, Alchemist, Jeweler. Each has independent skill level (1-100) with XP progression. 68 standard recipes + 8 unique catalyst recipes across all professions.
- **Catalyst system**: Optional rare material catalysts on standard recipes guarantee minimum output rarity (common→uncommon+, uncommon→rare+, etc.). Unique recipes require specific rare materials.
- **25 rare materials**: 5 per gathering profession × 5 rarity tiers (common→legendary). Drop during gathering with band-scaled rates. Used as crafting catalysts.
- **Craft tab**: Refine sub-panel (track selector → T1-T6 chain with refine/deconstruct buttons). Craft sub-panel (profession selector with level/XP → recipe list grouped by tier with material counts, catalyst dropdown, craft button).

## UI State (4 Tabs)
- **Zones tab**: 30 zones shown via horizontal band tab pills. Combat/Gathering toggle. Profession selector + XP bar in gathering mode. Zone cards with level badges, gathering type icons, hazard icons, mastery badges. Session summary with rare material find notifications. Ability bar in combat mode.
- **Inventory tab ("Loot")**: Two-panel layout with equipped gear + bag grid. Bag slots section. Right-click to equip. Hover tooltips with stat comparison. Currency crafting UI. Auto-salvage filter. 5-tier rarity colors.
- **Craft tab**: Refine/Craft toggle. Refine: 6 track pills → T1-T6 recipe chain with material counts + refine/deconstruct. Craft: 5 profession pills with level/XP bar → recipes grouped by tier with material requirements, catalyst dropdowns, unique recipe indicators.
- **Character tab ("Hero")**: Paper doll (16 gear slots), 13 stats including poison/chaos resist, materials list, ability management panel.

All 4 screens stay mounted (CSS hidden) for state persistence across tab switches.

## 16 Gear Slots (WoW-style)
Left: helmet, neck, shoulders, cloak, chest, bracers
Right: gloves, belt, pants, boots, ring1, ring2
Bottom: mainhand, offhand, trinket1, trinket2

345 item bases defined across 15 slots (56 mainhand with 8 weapon types, no trinket bases yet).

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
- **Crafting professions**: 5 professions, level 1-100. XP curve matches gathering. 68 standard recipes + 8 unique recipes. Catalyst system: optional rare mat → guaranteed minimum rarity. `executeCraft()` generates item with reroll loop if below minimum.
- **Auto-apply resources**: `processNewClears()` immediately applies all drops to state. Session summary tracked in UI local state.
- **Bag system**: 5 equippable bag slots (T1:6→T5:14). Start 30 total, max 70.
- **Crafting (currencies)**: `applyCurrency(item, type)` — augment, chaos, divine, annul, exalt
- **Save**: Zustand persist v12. Migration v11→v12: adds `craftingSkills`.

## Architecture
```
src/
  types/index.ts            — All TypeScript interfaces
  data/
    balance.ts              — Centralized balance config (drop rates, combat formulas, crafting XP, catalyst rarity map)
    affixes.ts              — 15 combat affix definitions (7 prefix, 8 suffix, T1-T10)
    gatheringAffixes.ts     — 8 gathering affix definitions (4 prefix, 4 suffix, T1-T10)
    gatheringProfessions.ts — 5 gathering profession defs, milestones, band skill requirements
    craftingProfessions.ts  — 5 crafting profession defs, milestones, createDefaultCraftingSkills()
    craftingRecipes.ts      — 68 standard + 8 unique crafting recipes, getCraftingRecipe(), getRecipesForProfession()
    refinement.ts           — 36 refinement recipes (6 tracks × 6 tiers), lookup helpers, getDeconstructOutput()
    rareMaterials.ts        — 25 rare material defs, drop rates by band, getRareMaterialDef()
    zones.ts                — 30 zones with material names, recommendedLevel, gatheringTypes
    items.ts                — 345 item bases (56 mainhand w/ 8 weapon types) + 6 currency defs + 5 bag upgrade defs
    abilities.ts            — 24 ability defs (8 weapon types x 3) with mutators
    classes.ts              — Class definitions (placeholder)
    setBonuses.ts           — 4 armor-type set bonus definitions
  engine/                   — Pure TypeScript (no React)
    items.ts                — Item generation, affix rolling, rarity classification, generateGatheringItem()
    zones.ts                — Clear speed calc, idle simulation, hazards, mastery, simulateGatheringClear() with rare drops
    gathering.ts            — Gathering XP curve, level-ups, yield calc, milestones, skill requirements
    rareMaterials.ts        — rollRareMaterialDrop(), calcRareFindBonus()
    refinement.ts           — canRefine(), refine(), canDeconstruct(), deconstruct(), getRefinementChain()
    craftingProfessions.ts  — addCraftingXp(), canCraftRecipe(), executeCraft(), getCraftingXpForTier()
    abilities.ts            — Ability effect resolution, timer management, aggregation
    character.ts            — Stats resolution (13 stats), XP/leveling
    crafting.ts             — 6 currency crafting operations
    setBonus.ts             — Set bonus resolution
  store/
    gameStore.ts            — Zustand store (state + actions + persistence + v12 migration). Actions: refineMaterial, deconstructMaterial, craftRecipe + all previous.
  ui/
    slotConfig.ts           — Shared gear slot icons/labels
    components/
      NavBar.tsx            — Bottom navigation (Zones/Loot/Craft/Hero — 4 tabs)
      TopBar.tsx            — Character info, XP bar, currency counts
      OfflineProgressModal.tsx — "Welcome Back" modal
      AbilityBar.tsx        — 4-slot ability action bar
    screens/
      ZoneScreen.tsx        — Band tabs, Combat/Gathering toggle, profession selector, session summary with rare finds
      InventoryScreen.tsx   — Bag grid + currency crafting UI + auto-salvage + detail panel
      CraftingScreen.tsx    — Refine/Craft toggle. Refine: track pills → T1-T6 chain. Craft: profession pills → recipe list with catalysts.
      CharacterScreen.tsx   — Paper doll (16 slots), 13 stats, materials, ability management
  App.tsx                   — Main app shell with CSS-hidden tab routing (4 tabs)
  main.tsx                  — Entry point
  index.css                 — Tailwind directives + base styles
```

## Known Issues / Next Iteration TODO
- [ ] Socket currency not yet implemented (defined but no crafting logic)
- [ ] No trinket item bases (trinket1/trinket2 slots empty)
- [ ] Class selection not implemented (everyone is generic "Exile")
- [ ] Talent tree not built
- [ ] Set bonus UI not shown on character screen
- [ ] Zone familiarity passive not implemented
- [ ] `simulateIdleRun()` and `simulateSingleClear()` share drop logic — could refactor
- [ ] ItemCard component exists but is no longer imported anywhere (orphaned)
- [ ] Gathering gear equip/swap UI not built (gatheringEquipment in state but no UI yet)
- [ ] Dual loadout system (combat set / gathering set) not built yet
- [ ] Offline gathering doesn't use rareFindBonus (rare drops only during real-time)

## What Has NOT Been Built Yet (from GDD MVP scope)
- [ ] Class selection (GDD Section 3)
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
- **68 standard recipes**: 2 per tier per profession, using cross-track refined materials (weapons need ingots + planks, armor needs ingots + leather, etc.)
- **8 unique catalyst recipes**: Require specific rare materials (Prismatic Ring needs Flawless Gem, Fangblade needs Primordial Fang, etc.)
- **25 rare materials**: 5 per gathering profession × 5 rarity tiers. Drop during gathering clears with band-scaled rates.
- **Catalyst system**: Optional rare mat on catalystSlot recipes → guaranteed minimum item rarity. Required rare mat on unique recipes.
- **Craft tab (new)**: 4th NavBar tab. Refine sub-panel with 6 track pills → T1-T6 chain. Craft sub-panel with 5 profession pills + XP bar → recipe list.
- **Rare find notifications**: Gathering session summary shows rare material drops with rarity-colored text + pulse animation.
- **Store actions**: `refineMaterial()`, `deconstructMaterial()`, `craftRecipe()` with catalyst support + overflow handling.
- **Files added**: `craftingProfessions.ts`, `craftingRecipes.ts`, `rareMaterials.ts`, `refinement.ts` (data), `craftingProfessions.ts`, `rareMaterials.ts`, `refinement.ts` (engine), `CraftingScreen.tsx`
- **Save v12 migration**: Adds `craftingSkills`

## Priority for Next Session
See `SPRINT_PLAN.md` for full roadmap. Next sprints:
1. **Sprint 7: Class Mechanics** — 4 classes with unique passive mechanics + talent trees
2. **Sprint 8: Gold Economy**
3. **Sprint 9: Gathering Gear UI + Dual Loadout**

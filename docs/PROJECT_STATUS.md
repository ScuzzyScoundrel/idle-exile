# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-24 (Sprint 4 complete)

## Current Phase
**Sprint 4: Weapon Types + Abilities + Focus Modes** — COMPLETE. 8 weapon types (56 mainhand bases), 24 abilities with mutators, 4 focus modes. Active players clicking abilities = 30-50% faster clears. Passive abilities always contribute. Focus modes trade clear speed for specific drop types. Save v10.

## What Changed (Phase 1 Rework Summary)
The entire game engine was rewritten to match the updated GDD. Key changes:

**Added:**
- 30 zones across 6 bands (The Greenlands → The Endlands), iLvl 1–60
- 5-tier rarity system: Common (2 affixes), Uncommon (3), Rare (4), Epic (5), Legendary (6)
- Rarity classified by affix quality: Legendary needs T1+ or 2×T2, Epic needs T2, etc.
- T1–T10 affix tiers with interpolated value ranges (15 affixes: 7 prefix, 8 suffix)
- Zone hazards (fire/cold/lightning/poison/chaos) starting at Band 3
- Zone mastery (binary: meet all hazard thresholds)
- Band-based clear time formula (no tier multiplier)
- Poison resist + chaos resist (13 total character stats)
- 4 armor-type set bonuses (Juggernaut/Sharpshooter/Phantom/Rapid Caster)
- Auto-salvage by minimum rarity filter
- Crafting integrated into Inventory screen
- 296 item bases across 15 gear slots
- Save v6 with full wipe migration

**Removed:**
- Abilities system (4 slots, mutators)
- Focus modes (combat/harvesting/prospecting/scavenging)
- Tier selector (T1–T5 level-gated)
- 3 old currencies (transmute, alchemy, regal)
- CraftingScreen (separate tab)

**6 active currencies:** augment, chaos, divine, annul, exalt, socket (50 each at start)

## What Is Working Right Now
The game is live on Vercel and playable locally at `http://localhost:5173/`. Core loop:
- Pick a zone from 30 zones grouped by 6 bands
- Start idle run — items drop into bags in real-time as clears happen (visible in loot feed with rarity-colored item names)
- When bags are full, gear drops auto-salvage into materials with a running tally displayed
- "Collect Resources" button picks up currencies, materials, gold, and bag consumable drops (items are already in bags)
- Equip items (click Equip or right-click), sell gear for gold, disenchant for materials, craft with 6 currencies
- Auto-salvage filters items below chosen rarity threshold
- Band 3+ zones have hazard warnings requiring specific resists
- Mastery badge when all zone thresholds met
- Bag slot system: 5 equippable bag slots (6/8/10/12/14 capacity per tier). Buy, equip, sell, salvage bags. Start at 5x Tattered Satchel (30 total), max 5x Void-Touched (70 total)
- Cannot unequip gear when bags are full
- **Offline progression**: Close the app, reopen later → "Welcome Back, Exile!" modal shows time away, clears completed, gold/XP/items found, best drop highlight, resource breakdown. "Claim Rewards" processes items into bags (overflow auto-salvaged at claim time). Short absences (<60s) handled by real-time tick instead.
- **8 weapon types**: Sword (balanced), Axe (high damage), Mace (tanky), Dagger (crit), Staff (ability-focused), Wand (utility), Bow (speed), Crossbow (burst). 56 mainhand bases total.
- **24 abilities**: Each weapon has 2 active + 1 passive ability. Active abilities have cooldowns and buff durations. Passive abilities always contribute. Each has 2-3 mutators for customization.
- **Ability bar**: 4 equip slots on ZoneScreen. Click to activate active abilities. Buff timer + cooldown countdown display. Passive abilities show as static "PASSIVE" indicators.
- **Focus modes**: 4-button toggle: Combat (balanced), Harvesting (no items, 2.5x mats), Prospecting (2x currency), Scavenging (1.5x items). Affects clear speed and drop rates.
- **Weapon compatibility**: Equipping a new weapon type auto-removes abilities from the old type. Ability panel on Hero tab shows available abilities based on equipped weapon.

## UI State (3 Tabs)
- **Zones tab**: 30 zones in 6 band groups displayed as visual card grid (2x2 + boss). Band-themed CSS gradients, single-accordion (one band open at a time). Hazard icons with pulse animation, mastery badges, running indicator. Clear time shown in human-readable format (seconds/minutes/hours/days/years) with color coding (white/yellow/red). Real-time loot feed shows actual item names with rarity colors. Bags status bar shows current fill level and running salvage tally when full. "Collect Resources" button for currencies/materials/gold only (items go to bags immediately).
- **Inventory tab ("Bags")**: Two-panel layout with equipped gear + bag grid. Bag slots section above loot grid with 5 slot cards, stash, and vendor (T1-T2 only). Dynamic capacity display (30-70, color-coded when full). Right-click to equip items. Hover tooltips show inline stat comparison vs equipped gear. Sell gear for gold (button shows value). Crafting UI built in (currency selector + apply). Auto-salvage filter. 5-tier rarity colors. Gold ★ on affixes at best tier for item's iLvl. `T7+` indicator on item info lines. Rarity Guide + Item Level & Tier Gating reference table. Tooltips flip below items when they would clip above viewport. Warning banner when bags are full.
- **Character tab ("Hero")**: Paper doll (16 gear slots), 13 stats including poison/chaos resist, materials list

All 3 screens stay mounted (CSS hidden) for state persistence across tab switches.

## 16 Gear Slots (WoW-style)
Left: helmet, neck, shoulders, cloak, chest, bracers
Right: gloves, belt, pants, boots, ring1, ring2
Bottom: mainhand, offhand, trinket1, trinket2

345 item bases defined across 15 slots (56 mainhand with 8 weapon types, no trinket bases yet).

## Engine Details
- **Rarity**: Common (2 affixes, T7+), Uncommon (3, T4-T6), Rare (4, T3), Epic (5, T2), Legendary (6, T1+/2×T2)
- **Affix tiers**: T1 (best) through T10 (worst), weighted drop rates favor lower tiers
- **Clear speed**: `baseClearTime / (charPower / 50)` then `* 1.12^levelDelta`. Power = `offensivePower * defEff * hazardMult`. No upper cap — undergeared zones show absurd times (days/years). Floor at 20% of baseClearTime.
- **Level scaling**: Exponential penalty for being under-leveled: each level below zone iLvlMin = 12% longer. 10 levels below = 3.5x, 50 below = 289x.
- **Hazards**: Quadratic penalty per hazard, multiplicative across all hazards. At threshold: 1.0. At 0 resist: 0.05 (95% slower per hazard). Two hazards at 0 resist = 0.25% effectiveness.
- **Hazard progression**: Band 1-2 gentle intro (0-1 single hazards), Band 3 single→dual, Band 4 dual→triple (boss), Band 5 dual/triple→quad (boss), Band 6 triple/quad→ALL FIVE (World's Edge boss, 75 all resists).
- **Mastery**: All hazard thresholds met = mastery badge (binary check)
- **Real-time loot**: `simulateSingleClear(char, zone)` generates drops for one clear (item, materials, currencies, gold, bag drop). Called by `processNewClears()` in the store. Items go directly into inventory with overflow auto-salvage.
- **Bag system**: 5 equippable bag slots. Each slot holds a bag with a per-tier capacity (T1:6, T2:8, T3:10, T4:12, T5:14). Start with 5x Tattered Satchel (30 total). Max capacity: 5x Void-Touched (70 total). Bags drop from zones, go to stash. Equip from stash auto-targets weakest slot; old bag returns to stash. Sell bags for gold, salvage for dust. Purchase with gold goes to stash (not auto-equip). Cannot equip smaller bag if it would overflow inventory.
- **Loot flow**: Items go to bags immediately on clear (real-time). Resources (currencies, materials, gold, bag drops) accumulate in `pendingLoot` and are collected via button. Auto-salvage applies both rarity threshold AND overflow capacity check.
- **Crafting**: `applyCurrency(item, type)` — augment (add affix), chaos (remove+add), divine (reroll values), annul (remove), exalt (add top 3 available tiers for item's iLvl)
- **iLvl tier gating**: iLvl 1-10: T7 best, 11-20: T5, 21-30: T4, 31-40: T3, 41-50: T2, 51-60: T1. Crafting (including Exalt) respects iLvl.
- **Stats**: `resolveStats(char)` aggregates base + level + gear + affixes, applies % multipliers last
- **Set bonuses**: 4 armor sets with 2/4/6-piece thresholds
- **Offline progression**: On rehydrate, if `currentZoneId` + `idleStartTime` exist and elapsed > 60s, runs `simulateIdleRun()` and builds `OfflineProgressSummary`. Modal blocks UI until claimed. Items stored in summary (not applied) so player can free bag space first. Race condition prevented by resetting `idleStartTime = Date.now()` before React renders.
- **Save**: Zustand persist v10. Migration v9→v10: adds `equippedAbilities`, `abilityTimers`, `focusMode`, tags existing mainhand as swords. `onRehydrateStorage` detects offline time, builds summary with passive-only ability effects + focus mode, cleans stale timers.

## Architecture
```
src/
  types/index.ts            — All TypeScript interfaces (GearSlot, ZoneDef, AffixDef, etc.)
  data/
    balance.ts              — Centralized balance config (drop rates, combat formulas, progression, item gen)
    affixes.ts              — 15 affix definitions (7 prefix, 8 suffix, T1-T10)
    zones.ts                — 30 zones across 6 bands, hazard definitions
    items.ts                — 345 item bases (56 mainhand w/ 8 weapon types) + 6 currency defs + 5 bag upgrade defs
    abilities.ts            — 24 ability defs (8 weapon types x 3) with mutators + helpers
    focusModes.ts           — 4 focus mode defs (combat/harvesting/prospecting/scavenging)
    classes.ts              — Class definitions (placeholder for future)
    setBonuses.ts           — 4 armor-type set bonus definitions
  engine/                   — Pure TypeScript (no React)
    items.ts                — Item generation, affix rolling, rarity classification, pickBestItem(), getEquippedWeaponType()
    zones.ts                — Clear speed calc, idle simulation, hazards, mastery, simulateSingleClear() — now accepts AbilityEffect + FocusModeDef
    abilities.ts            — Ability effect resolution, timer management, aggregation, weapon compatibility
    character.ts            — Stats resolution (13 stats), XP/leveling
    crafting.ts             — 6 currency crafting operations
    setBonus.ts             — Set bonus resolution
  store/
    gameStore.ts            — Zustand store (state + actions + persistence + v10 migration). processNewClears() with ability/focus integration. 5 new ability actions. Weapon swap clears incompatible abilities. onRehydrateStorage with passive-only offline.
  ui/
    slotConfig.ts           — Shared gear slot icons/labels for all 16 slots
    components/
      ItemCard.tsx          — Item display with T1-T10 affix colors + 5-tier rarity
      MiniPaperDoll.tsx     — Compact equipped gear grid
      NavBar.tsx            — Bottom navigation (Zones/Bags/Hero — 3 tabs)
      TopBar.tsx            — Character info, XP bar, currency counts
      OfflineProgressModal.tsx — "Welcome Back" modal with offline loot summary + claim button
      AbilityBar.tsx          — 4-slot ability action bar with cooldown/buff timers
      FocusModeSelector.tsx   — 4-mode segmented toggle (combat/harvesting/prospecting/scavenging)
    screens/
      ZoneScreen.tsx        — Zone selection by band, hazards, mastery, idle runs + AbilityBar + FocusModeSelector
      InventoryScreen.tsx   — Bag grid + crafting UI + auto-salvage + detail panel
      CharacterScreen.tsx   — Paper doll (16 slots), 13 stats, materials, ability management panel
  App.tsx                   — Main app shell with CSS-hidden tab routing (3 tabs)
  main.tsx                  — Entry point
  index.css                 — Tailwind directives + base styles
```

## Known Issues / Next Iteration TODO
- [ ] Socket currency not yet implemented (defined but no crafting logic)
- [ ] No trinket item bases (trinket1/trinket2 slots empty)
- [x] ~~No offline progression~~ — DONE (Sprint 3)
- [ ] Class selection not implemented (everyone is generic "Exile")
- [ ] Talent tree not built
- [ ] Set bonus UI not shown on character screen
- [x] ~~Active play / ability buttons not implemented~~ — DONE (Sprint 4)
- [ ] Zone familiarity passive not implemented
- [ ] `simulateIdleRun()` and `simulateSingleClear()` share drop logic but are separate functions — could be refactored to share a core loop
- [ ] ItemCard component exists but is no longer imported anywhere (orphaned)
- [x] ~~Gold economy rebalancing~~ — DONE (GOLD_PER_BAND 8→3, selling gear now meaningful)

## What Has NOT Been Built Yet (from GDD MVP scope)
- [ ] Class selection (GDD Section 3)
- [x] ~~Abilities system~~ — DONE (Sprint 4: 24 abilities, 8 weapon types, mutators, focus modes)
- [ ] Talent tree (30-50 nodes per class)
- [ ] Profession crafting Track B (patterns, materials, profession leveling)
- [ ] Specialization system (one per character)
- [ ] Socket crafting logic
- [ ] More affix variety (slot-specific affixes)

## How to Run
```bash
cd /home/jerris/idle-exile
npx vite --host
# Open http://localhost:5173/
```

## Deployment
- **GitHub:** https://github.com/ScuzzyScoundrel/idle-exile (branch: `master`)
- **Vercel:** Auto-deploys on `git push origin master`. Connected via `idle-exile` repo.
- **Second repo:** `ScuzzyScoundrel/scuzzy-idle-exile` also exists (Vercel originally created it). Push to both with `git push vercel master:main` if needed.
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
| 2026-02-24 | Phase 1 Foundation rework | Align engine with updated GDD: 30 zones, T1-T10, 5 rarities, hazards |
| 2026-02-24 | Merge crafting into Inventory tab | Reduces tabs from 4→3, crafting more accessible |
| 2026-02-24 | Save v6 wipe migration | Too many schema changes to migrate incrementally |
| 2026-02-24 | Real-time loot (items to bags immediately) | Items dropping in real-time feels more engaging than batch collect |
| 2026-02-24 | Collect button = resources only | Items already in bags; button picks up currencies/materials/gold/bag drops |
| 2026-02-24 | Bag capacity 30 start, +6 per tier | Progression feels good; 5 tiers gives steady unlocks |
| 2026-02-24 | Save v7 non-destructive migration | Adds new fields, drops pendingLoot.items (acceptable alpha-stage loss) |
| 2026-02-24 | 5-bag-slot system (v8) | Per-slot capacity creates gear-like progression for bags |
| 2026-02-24 | Vendor capped at T2 bags | T3+ from drops/crafting only — creates meaningful loot progression |
| 2026-02-24 | Sell gear for gold | Alternative to disenchant — gold economy sink for bag purchases |
| 2026-02-24 | GOLD_PER_BAND 8→3 | Band 6 was 5,760g/hr, now 2,160g/hr — selling gear meaningful |
| 2026-02-24 | Offline >60s threshold | Short reloads (<60s) handled by real-time tick, not modal |
| 2026-02-24 | Items stored in summary, not applied | Player can free bag space before claiming offline loot |
| 2026-02-24 | Vercel deploy (no backend) | Each browser's localStorage = own character, zero config |

## Sprint 1A Changes (UI Polish)
- **Bug fix:** `collectIdleResults()` and `stopIdleRun()` now return only kept items (not auto-salvaged ones)
- **Auto-salvage feedback:** Loot panel shows "Auto-salvaged N items -> +X salvage dust" when items are filtered
- **Loot dismiss:** X button on "Loot Collected!" panel to close it
- **Rarity guide:** "?" button on Inventory screen toggles a color-coded table explaining rarity tiers
- **Hero page overhaul:** Gear slots widened from 64px to 144px with item name + rarity color
- **ASCII silhouette:** Character silhouette in center of paper doll with name/level
- **Stat tooltips:** All 13 stats have title-attribute tooltips explaining what they do

## Sprint 1B Changes (Zone Overhaul & Scaling)
- **Zone card grid**: Replaced text button list with visual zone cards (2x2 grid + full-width boss). Gradient backgrounds per band, dark overlay for readability. Boss cards taller with crown emoji and yellow name.
- **Band theming**: 6 unique CSS gradients (emerald, sky/cyan, red/orange, slate/purple, indigo/violet, black/red). Emojis per band (tree, mountain, swords, skull, lightning, dark moon).
- **Single-accordion**: Only one band open at a time (was: all bands open simultaneously). Band 1 expanded by default.
- **Clear time scaling overhaul**: Added exponential level penalty (1.12^delta per level below zone iLvlMin). Removed 600s cap. Clear times can now show days/years for undergeared zones.
- **Hazard penalty rework**: Changed from linear (floor 0.6) to quadratic (floor 0.05). Changed from worst-of to multiplicative across all hazards. Stacking hazards is now brutal.
- **Hazard progression redesign**: Progressive hazard count across all 30 zones. Band 2 now introduces single hazards (was: zero). Every boss is hardest in its band. World's Edge (final boss) has all 5 elements at threshold 75.
- **Human-readable clear times**: New `formatClearTime()` shows `23.4s`, `19m 12s`, `5h 30m`, `3d 12h`, `1y 295d`. Color-coded: white (<5min), yellow (5min-1hr), red (>1hr).
- **Exalt iLvl gating fix**: Exalt now respects item level (was: always T1-T3 regardless). Now guarantees top 3 available tiers for the item's iLvl.
- **Best-tier indicator**: Gold ★ on affix lines when affix is at best possible tier for item's iLvl. Shown in detail panel, hover tooltip, and ItemCard.
- **Tier range display**: `T7+` (or appropriate) shown in item info line across detail panel, tooltip, and ItemCard.
- **Item Level Guide**: Added "Item Level & Tier Gating" reference table to Rarity Guide in inventory screen. Shows band→iLvl→best tier mapping. Explains ★ indicator and that crafting respects iLvl.

## Sprint 1C Changes (Real-Time Loot, Bags & Bug Fixes)
- **Real-time loot**: Items now drop into bags as clears happen (not batched at collect). Loot feed shows actual item names with rarity colors instead of cosmetic icons.
- **Bag capacity system**: Start at 30 slots (was hardcoded 60). 5 tiers of bag upgrades (+6 each: 30->36->42->48->54->60). Sources: zone drops (~1.5% per clear, tier capped by band) and gold purchase (50/200/450/800/1250g).
- **Overflow auto-salvage**: When bags hit capacity, new gear drops are auto-salvaged into salvage dust. Running tally shown on ZoneScreen ("X salvaged -> +Y dust"). Amber warning banners on both ZoneScreen and InventoryScreen when full.
- **Collect button change**: Now "Collect Resources" — only picks up currencies, materials, gold, and bag consumable drops. Items are already in bags.
- **Unequip guard**: Cannot unequip gear when bags are full (returns early).
- **Tooltip viewport fix**: Tooltips on equipped gear (helmet, gloves etc.) no longer clip above viewport. Uses `useLayoutEffect` to measure tooltip, flips below item when it would clip. Removed CSS transform in favor of computed absolute positioning.
- **Dynamic capacity display**: Bags header shows `X/30` (or current capacity) with red color when full, yellow when >80%.
- **Bag Upgrade UI**: New section on InventoryScreen below auto-salvage. Shows available bag consumables with "Use" button + gold purchase option for next tier.
- **Type changes**: `PendingLoot` no longer has `items` (removed). Added `bagDrops`. `GameState` gained `inventoryCapacity` + `consumables`. New `BagUpgradeDef` type.
- **Store rewrite**: `processNewClears(count)` is the new core action (called from ZoneScreen on each tick). `collectIdleResults`/`stopIdleRun` return resources-only. `addItemsWithOverflow()` handles rarity threshold + capacity overflow. Save migrated to v7.
- **Engine addition**: `simulateSingleClear(char, zone)` — per-clear drop generation extracted from `simulateIdleRun`. Returns item, materials, currencies, gold, bagDrop.

## Sprint 2 Changes (Loot Rarity & Volume Tuning)
- **Balance config**: New `src/data/balance.ts` centralizes all tunable constants (drop rates, combat formulas, progression, item generation weights). No more inline magic numbers in engine files.
- **Drop rate reduction**: Item drop chance reduced from 25% to 8% per clear. ~1 item every 3-4 clears instead of ~1 per clear. 20-min sessions produce ~15-20 items instead of 60+.
- **Richer resource drops**: Material drops increased from 1-2 to 2-4 per clear. Currency drop rates ~60-80% higher across the board. Gold per band increased from 5 to 8.
- **Upgrade indicators**: Green triangle badge on bag items that are a net stat upgrade over currently equipped gear. Uses `calcItemStatContribution()` to sum base stats + affix values mapped to StatKey, then `isUpgradeOver()` for net delta comparison. Handles paired slots (ring1/ring2, trinket1/trinket2).
- **ComparisonPanel refactor**: Now uses shared `calcItemStatContribution()` from engine instead of duplicated inline logic. Shows readable stat labels ("Damage", "Life") instead of affix category names ("flat_damage", "percent_damage"). Merges flat + percent damage/life into single row.
- **Engine exports**: `AFFIX_STAT_MAP` now exported from `character.ts` for use by item comparison functions.

## Sprint 2B Changes (Bag Slots, Hover Comparison & Right-Click Equip)
- **5-bag-slot system**: Replaced flat `inventoryCapacity` with 5 equippable bag slots (`bagSlots: string[]`). Each bag has its own capacity (T1:6, T2:8, T3:10, T4:12, T5:14). Starting capacity 5x6=30, max 5x14=70.
- **Bag stash**: Bags from zone drops go to `bagStash` (not auto-equipped). Players choose when to equip.
- **Equip/sell/salvage bags**: Equip auto-targets weakest slot, old bag returns to stash. Sell for gold (`sellValue`), salvage for dust (`salvageValue`). Safety check prevents equipping smaller bags that would overflow inventory.
- **Vendor capped at T2**: Vendor always shows T1 (50g) and T2 (200g) bags for purchase. T3-T5 bags only from zone drops or crafting. Hint text on bag section explains this.
- **Bag Slot UI**: 5 horizontal slot cards showing bag name, capacity, tier-colored borders. Weakest slot highlighted when stash has upgrades. Stash section with Equip/Sell/Salvage buttons. **Bag slots appear above loot grid** (not below).
- **Right-click to equip**: `onContextMenu` on inventory item tiles instantly equips the item. Works alongside left-click (select) and currency mode (left-click = craft).
- **Hover tooltip comparison**: Inventory item tooltips now show inline stat deltas vs equipped gear (green/red +/- values). Uses `calcItemStatContribution()` and `getComparisonTarget()`. Only shown for inventory items (not equipped items in paper doll). Tooltip width increased from `w-56` to `w-64`.
- **Sell gear for gold**: New `sellItem` store action + Sell button in detail panel (between Equip and Disenchant). Sell value = rarity base (1/3/8/20/50g) + iLvl/5. Exported `SELL_GOLD` constant for UI preview.
- **Type changes**: `BagUpgradeDef` gains `capacity` (replaces `capacityIncrease`), `sellValue`, `salvageValue`. `GameState` replaces `inventoryCapacity`/`consumables` with `bagSlots`/`bagStash`.
- **Data helpers**: `getBagDef()`, `calcBagCapacity()`, `BAG_SLOT_COUNT` added to `data/items.ts`.
- **Store actions**: Replaced `useBagUpgrade`/`buyBagUpgrade` with `equipBag`/`sellBag`/`salvageBag`/`buyBag`. Added `sellItem`. Internal `getInventoryCapacity()` helper derives capacity from bag slots.
- **Save v8 migration**: Converts old `inventoryCapacity`/`consumables` to `bagSlots`/`bagStash`. Round-robin upgrades old capacity surplus into slot tier bumps.

## Sprint 3 Changes (Offline Progression + Gold Fix)
- **Gold economy fix**: `GOLD_PER_BAND` reduced from 8 to 3. Band 6 income drops from 5,760g/hr to 2,160g/hr. Selling gear now feels meaningful as a gold source.
- **Offline progression**: On app reopen, detects elapsed time since last save. If >60s and an idle run was active, simulates all clears via `simulateIdleRun()` and presents a full-screen "Welcome Back, Exile!" modal.
- **OfflineProgressModal**: Gradient header with time away + zone name. 3-column stats grid (clears/gold/XP). Best drop highlight card (rarity-colored). Items found breakdown with rarity badges. Resource list (materials, currencies, bag drops, salvage dust). "Claim Rewards" button processes all items at claim time (overflow auto-salvaged).
- **Race condition prevention**: `onRehydrateStorage` resets `idleStartTime = Date.now()` so ZoneScreen's real-time timer sees 0 elapsed (prevents double-processing offline clears through the tick path).
- **simulateIdleRun bag drops**: Added bag drop logic (was missing — `simulateSingleClear` had it but batch simulation didn't). Added `bagDrops` to `IdleRunResult` type.
- **pickBestItem()**: New helper in `engine/items.ts` — picks highest rarity item, tiebreaks by lowest average affix tier.
- **Type additions**: `OfflineProgressSummary` interface, `bagDrops` in `IdleRunResult`, `offlineProgress` in `GameState`.
- **Store changes**: `claimOfflineProgress()` action applies gold, XP, currencies, materials, bag drops, and processes items into bags. `onRehydrateStorage` callback for offline detection. Save v9 migration adds `offlineProgress: null`.
- **Cloud deploy**: GitHub repo + Vercel hosting. Each browser gets own localStorage = own character. No backend needed.

## Sprint 4 Changes (Weapon Types + Abilities + Focus Modes)
- **8 weapon types**: Sword, Axe, Mace, Dagger, Staff, Wand, Bow, Crossbow. Each has distinct stat profiles. 49 new mainhand item bases (7 per type x 7 iLvl tiers), 56 total mainhand bases.
- **24 abilities**: 3 per weapon type (2 active + 1 passive). Active abilities have duration + cooldown (timestamp-based). Passive abilities always contribute.
- **Mutator system**: Each ability has 2-3 mutators that modify its effect (e.g., longer duration, different stat bonus, swapped effect).
- **Ability engine**: Pure TS engine (`src/engine/abilities.ts`) resolves effects, manages timers, aggregates passives + active buffs, checks weapon compatibility.
- **4 focus modes**: Combat (1x all), Harvesting (0x items / 2.5x mats / 0.85x speed), Prospecting (0.5x items / 2x currency), Scavenging (1.5x items / 0.85x speed + rarity boost).
- **Clear speed integration**: `calcClearTime`, `simulateSingleClear`, and `simulateIdleRun` all accept optional `AbilityEffect` and `FocusModeDef` parameters.
- **AbilityBar component**: 4-slot bar below progress bar on ZoneScreen. Active abilities show cooldown/buff timers. Click to activate. Passive shows "PASSIVE" label.
- **FocusModeSelector component**: 4-button segmented toggle above zone grid.
- **CharacterScreen ability panel**: Shows equipped weapon type, lists available abilities, equip to 4 slots, mutator selection per equipped ability.
- **Weapon compatibility**: `equipItem` checks weapon type — swapping to a new weapon type auto-removes incompatible abilities and their timers.
- **Offline progression**: Uses passive-only ability effects (active buffs cleared). Focus mode still applies. Stale ability timers cleaned on rehydrate.
- **Item generation**: `generateItem` propagates `weaponType` from base to item. `getEquippedWeaponType` helper added.
- **Save v10 migration**: Adds `equippedAbilities`, `abilityTimers`, `focusMode` fields. Tags existing mainhand items as swords.
- **Type additions**: `WeaponType`, `AbilityEffect`, `MutatorDef`, `AbilityDef`, `EquippedAbility`, `AbilityTimerState`, `FocusModeDef`, `FocusMode`, `AbilityKind`. Updated `ItemBaseDef`, `Item`, `GameState`.

## Priority for Next Session
See `SPRINT_PLAN.md` for full roadmap. Next sprints:
1. **Sprint 5: Class Mechanics** — 4 classes with unique passive mechanics + talent trees
2. **Sprint 6: Gathering System** — 5 professions, gathering gear, dual loadouts
3. **Sprint 7: Material Refinement & Crafting Professions**

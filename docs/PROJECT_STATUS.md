# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-25 (Sprint 5 complete)

## Current Phase
**Sprint 5: Zone Stabilization + Gathering System** — COMPLETE. Replaced old focus modes with Combat/Gathering toggle. 5 gathering professions (mining/herbalism/skinning/logging/fishing) with skill leveling, milestones, gathering-specific gear. Resources auto-apply (no collect button). Band tabs replace accordion. All 30 zones updated with evolution doc material names + recommended levels + gathering types. Save v11.

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
- Old focus modes (combat/harvesting/prospecting/scavenging) — replaced by Combat/Gathering toggle
- Collect Resources button — resources now auto-apply
- pendingLoot accumulation system

**6 active currencies:** augment, chaos, divine, annul, exalt, socket (50 each at start)

## What Is Working Right Now
The game is live on Vercel and playable locally at `http://localhost:5173/`. Core loop:
- Pick a zone from 30 zones displayed in horizontal band tabs (one band visible at a time)
- Start idle run — items drop into bags in real-time, gold/currencies/materials/bags auto-apply to state immediately
- When bags are full, gear drops auto-salvage into materials with a running tally displayed
- Session summary shows running totals: materials, currencies, items by rarity, gold, gathering XP
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
- **Gathering mode**: Select a profession → zones show which professions can gather there + skill requirements. Gathering drops only profession-relevant materials + gathering XP. Small chance for gathering-specific gear drops (separate affix pool: gather speed, yield bonus, double gather, rare find, etc.).
- **Zone recommended levels**: Each zone shows "Lv.X" badge. "Underleveled" warning when character level is too low.
- **Gathering skill gates**: Band-based requirements (Band 1: 1, Band 2: 15, Band 3: 30, Band 4: 50, Band 5: 75, Band 6: 90). "Skill too low" warning on zone cards (soft gate, not locked).
- **Weapon compatibility**: Equipping a new weapon type auto-removes abilities from the old type.

## UI State (3 Tabs)
- **Zones tab**: 30 zones shown via horizontal band tab pills (one band visible at a time). Combat/Gathering toggle at top. In gathering mode: profession selector with 5 buttons showing icons + current level, XP progress bar. Zone cards show level badges, gathering type icons, hazard icons (combat), mastery badges. Session summary panel shows running totals (replaces old loot feed + collect button). Clear time estimate with color coding. Ability bar in combat mode only.
- **Inventory tab ("Bags")**: Two-panel layout with equipped gear + bag grid. Bag slots section above loot grid. Right-click to equip items. Hover tooltips show inline stat comparison. Crafting UI built in. Auto-salvage filter. 5-tier rarity colors.
- **Character tab ("Hero")**: Paper doll (16 gear slots), 13 stats including poison/chaos resist, materials list, ability management panel

All 3 screens stay mounted (CSS hidden) for state persistence across tab switches.

## 16 Gear Slots (WoW-style)
Left: helmet, neck, shoulders, cloak, chest, bracers
Right: gloves, belt, pants, boots, ring1, ring2
Bottom: mainhand, offhand, trinket1, trinket2

345 item bases defined across 15 slots (56 mainhand with 8 weapon types, no trinket bases yet).

## Engine Details
- **Rarity**: Common (2 affixes, T7+), Uncommon (3, T4-T6), Rare (4, T3), Epic (5, T2), Legendary (6, T1+/2×T2)
- **Affix tiers**: T1 (best) through T10 (worst), weighted drop rates favor lower tiers
- **Combat clear speed**: `baseClearTime / (charPower / 50)` then `* 1.12^levelDelta`. Power = `offensivePower * defEff * hazardMult`. No upper cap. Floor at 20% of baseClearTime.
- **Gathering clear speed**: `baseClearTime * 2 / (1 + skillLevel / 25)`. Scales with profession skill level. No hazard/combat stats involved.
- **Level scaling**: Exponential penalty for being under-leveled: each level below zone iLvlMin = 12% longer.
- **Hazards**: Quadratic penalty per hazard, multiplicative across all hazards.
- **Gathering professions**: 5 professions (mining/herbalism/skinning/logging/fishing). XP curve: `50 * 1.35^(level-1)`. Milestones at 10 (+10% yield), 25 (+5% rare find), 50 (10% double gather), 75 (+25% yield), 100 (mastery: +50% yield + 10% rare find). Band skill requirements: 1/15/30/50/75/90.
- **Gathering gear**: Separate affix pool (8 affixes: gather speed, yield bonus, double gather, prospector's eye, rare find, skill boost, efficiency, zone mastery). 2% drop chance per gathering clear. Uses `isGatheringGear` flag on Item.
- **Auto-apply resources**: `processNewClears()` immediately applies gold, currencies, materials, and bag drops to state. No pendingLoot accumulation. Session summary tracked in UI local state.
- **Real-time loot**: `simulateSingleClear(char, zone)` for combat, `simulateGatheringClear(skillLevel, zone, profession)` for gathering.
- **Bag system**: 5 equippable bag slots (T1:6→T5:14). Start 30 total, max 70.
- **Crafting**: `applyCurrency(item, type)` — augment, chaos, divine, annul, exalt
- **iLvl tier gating**: iLvl 1-10: T7 best, 11-20: T5, 21-30: T4, 31-40: T3, 41-50: T2, 51-60: T1
- **Stats**: `resolveStats(char)` aggregates base + level + gear + affixes, applies % multipliers last
- **Set bonuses**: 4 armor sets with 2/4/6-piece thresholds
- **Offline progression**: On rehydrate, if elapsed > 60s, simulates clears for both combat and gathering modes. Combat uses passive-only ability effects. Gathering applies materials + gathering XP directly. Builds `OfflineProgressSummary` for display modal.
- **Save**: Zustand persist v11. Migration v10→v11: adds gathering fields (`idleMode`, `gatheringSkills`, `gatheringEquipment`, `selectedGatheringProfession`), flushes old `pendingLoot` into state, removes `focusMode` field.

## Architecture
```
src/
  types/index.ts            — All TypeScript interfaces (IdleMode, GatheringProfession, GatheringSkills, etc.)
  data/
    balance.ts              — Centralized balance config (drop rates, combat formulas, progression, item gen)
    affixes.ts              — 15 combat affix definitions (7 prefix, 8 suffix, T1-T10)
    gatheringAffixes.ts     — 8 gathering affix definitions (4 prefix, 4 suffix, T1-T10)
    gatheringProfessions.ts — 5 profession defs, milestones, band skill requirements
    zones.ts                — 30 zones with material names, recommendedLevel, gatheringTypes
    items.ts                — 345 item bases (56 mainhand w/ 8 weapon types) + 6 currency defs + 5 bag upgrade defs
    abilities.ts            — 24 ability defs (8 weapon types x 3) with mutators + helpers
    classes.ts              — Class definitions (placeholder for future)
    setBonuses.ts           — 4 armor-type set bonus definitions
  engine/                   — Pure TypeScript (no React)
    items.ts                — Item generation, affix rolling, rarity classification, generateGatheringItem()
    zones.ts                — Clear speed calc, idle simulation, hazards, mastery, simulateGatheringClear()
    gathering.ts            — Gathering XP curve, level-ups, yield calc, milestones, skill requirements
    abilities.ts            — Ability effect resolution, timer management, aggregation, weapon compatibility
    character.ts            — Stats resolution (13 stats), XP/leveling
    crafting.ts             — 6 currency crafting operations
    setBonus.ts             — Set bonus resolution
  store/
    gameStore.ts            — Zustand store (state + actions + persistence + v11 migration). Auto-apply resources. Mode-branched processNewClears. Gathering state management.
  ui/
    slotConfig.ts           — Shared gear slot icons/labels for all 16 slots
    components/
      ItemCard.tsx          — Item display with T1-T10 affix colors + 5-tier rarity
      MiniPaperDoll.tsx     — Compact equipped gear grid
      NavBar.tsx            — Bottom navigation (Zones/Bags/Hero — 3 tabs)
      TopBar.tsx            — Character info, XP bar, currency counts
      OfflineProgressModal.tsx — "Welcome Back" modal with offline loot summary + claim button
      AbilityBar.tsx          — 4-slot ability action bar with cooldown/buff timers
    screens/
      ZoneScreen.tsx        — Band tabs, Combat/Gathering toggle, profession selector, session summary, zone cards with level badges
      InventoryScreen.tsx   — Bag grid + crafting UI + auto-salvage + detail panel
      CharacterScreen.tsx   — Paper doll (16 slots), 13 stats, materials, ability management panel
  App.tsx                   — Main app shell with CSS-hidden tab routing (3 tabs)
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

## What Has NOT Been Built Yet (from GDD MVP scope)
- [ ] Class selection (GDD Section 3)
- [ ] Talent tree (30-50 nodes per class)
- [ ] Material refinement chains (ore → ingots, etc.)
- [ ] Crafting professions (Weaponsmith, Armorer, etc.)
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

## Sprint History (Detailed Changes)

### Sprint 1A Changes (UI Polish)
- Bug fix: `collectIdleResults()` and `stopIdleRun()` now return only kept items
- Auto-salvage feedback, loot dismiss, rarity guide, hero page overhaul, stat tooltips

### Sprint 1B Changes (Zone Overhaul & Scaling)
- Zone card grid (2x2 + boss), band-themed gradients, single-accordion
- Clear time scaling overhaul: exponential level penalty + quadratic hazard penalty
- Progressive hazard design across all 30 zones, human-readable clear times
- Exalt iLvl gating fix, best-tier ★ indicator, Item Level & Tier Gating guide

### Sprint 1C Changes (Real-Time Loot, Bags & Bug Fixes)
- Real-time loot: items drop into bags as clears happen
- Bag capacity system: 30 start, 5 tiers (+6 each). Overflow auto-salvage
- "Collect Resources" button for currencies/materials/gold only
- Tooltip viewport fix, unequip guard, save v7

### Sprint 2 Changes (Loot Rarity & Volume Tuning)
- Centralized balance config. Item drops 25%→8%. Material drops 1-2→2-4
- Upgrade indicators (green triangle badges). ComparisonPanel refactor

### Sprint 2B Changes (Bag Slots, Hover Comparison & Right-Click Equip)
- 5-bag-slot system (6/8/10/12/14 per tier). Bag stash + equip/sell/salvage
- Vendor capped at T2. Right-click to equip. Hover tooltip comparison
- Sell gear for gold. Save v8 migration

### Sprint 3 Changes (Offline Progression + Gold Fix)
- Gold economy fix (GOLD_PER_BAND 8→3). Offline progression modal
- simulateIdleRun bag drops. pickBestItem(). Save v9 migration. Vercel deploy

### Sprint 4 Changes (Weapon Types + Abilities + Focus Modes)
- 8 weapon types, 24 abilities with mutators, 4 focus modes
- AbilityBar + FocusModeSelector components. Weapon compatibility
- Offline: passive-only effects. Save v10 migration

### Sprint 5 Changes (Zone Stabilization + Gathering System)
- **Replaced focus modes** with Combat/Gathering toggle (IdleMode type)
- **5 gathering professions**: Mining, Herbalism, Skinning, Logging, Fishing
- **Gathering skill system**: Level 1-100, XP curve `50 * 1.35^(level-1)`, milestones at 10/25/50/75/100
- **Gathering gear**: Separate affix pool (8 affixes), 2% drop chance per gathering clear, `isGatheringGear` flag
- **Auto-apply resources**: Gold, currencies, materials, bags applied immediately on clear (removed pendingLoot/collectIdleResults)
- **Session summary**: Replaces loot feed — running totals of materials, currencies, items by rarity, gold, gathering XP
- **Band tabs**: Horizontal pill buttons replace accordion (one band visible at a time)
- **Zone updates**: All 30 zones updated with evolution doc material names, `recommendedLevel` (1-30), `gatheringTypes` (which professions can gather)
- **Zone level badges**: "Lv.X" on zone cards, "Underleveled" warning when character level < recommended
- **Gathering skill gates**: Band-based requirements (1/15/30/50/75/90), "Skill too low" warning on zone cards
- **Offline gathering**: Gathering mode simulates gathering clears when offline, applies materials + gathering XP
- **Files added**: `gatheringProfessions.ts`, `gatheringAffixes.ts`, `engine/gathering.ts`
- **Files deleted**: `focusModes.ts`, `FocusModeSelector.tsx`
- **Save v11 migration**: Adds gathering fields, flushes old pendingLoot, removes focusMode

## Priority for Next Session
See `SPRINT_PLAN.md` for full roadmap. Next sprints:
1. **Sprint 6: Class Mechanics** — 4 classes with unique passive mechanics + talent trees
2. **Sprint 7: Material Refinement & Crafting Professions**
3. **Sprint 8: Gold Economy**

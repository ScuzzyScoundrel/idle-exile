# Idle Exile — Sprint Plan & Roadmap

> **Full development roadmap.** Read `PROJECT_STATUS.md` first for current state.
> Last updated: 2026-03-01 (Post-Sprint 8C)

## Micro-Sprint Workflow

Each conversation = one micro-sprint (3-5 focused changes):
1. **Read** `docs/PROJECT_STATUS.md` + relevant files only
2. **Execute** 3-5 related changes (same system/area)
3. **Build** `npm run build` (catches unused imports/vars that `tsc --noEmit` misses)
4. **Update** `docs/PROJECT_STATUS.md` with changes made
5. **Commit + push** `git push origin master`

**Rules:**
- Never try to do more than 5 related changes per session
- Group changes by system (engine OR UI, not both unless tightly coupled)
- Each sprint should be completable in ~30-50% of context window
- If a sprint touches >6 files, it's too big — split it

---

## Completed Sprints

| Sprint | Summary |
|--------|---------|
| 0 | Foundation: Vite + React + TS + Zustand + Tailwind |
| 1 | Item & affix engine (15 affixes, T1-T10, 296 bases) |
| 1A-1C | UI polish, zone overhaul, real-time loot |
| 2-2B | Loot tuning, bag slots, hover comparison, sell for gold |
| 3 | Offline progression, gold fix, Vercel deploy |
| 4 | 8 weapon types, 24 abilities with mutators |
| 5 | Gathering system (5 professions, skill leveling, milestones) |
| 6 | Refinement (6 tracks), crafting (6 professions, 205 recipes), rare materials (25 defs), catalyst system |
| 6 QoL | Boosted affixes, material panel by track, Tooltip component, UI size bump |
| 6 Recipes | 73 armor recipes, collapsible categories, 2-col compact grid, material pills |
| Combat | HP system, boss encounters (every 10 clears), victory/defeat phases |
| 7A | 4 classes (Warrior/Mage/Ranger/Rogue) with resource mechanics |
| 7C-A | Ability system overhaul: 6 kinds, skill trees (3 paths x 2 nodes), ability XP, slot unlocks, respec |
| **8A** | **Gathering bugs: profession mid-run exploit, zone skill lock enforcement, UI button disable** |
| **8B** | **Combat bugs: ability resistBonus applied to combat calcs, HP drain variance (removed constant floor), exalt code verified correct. Hotfix: gathering clear stuck at 100% (missing clearStartedAt advance)** |
| **8C** | **Mobile UX foundation: useIsMobile hook, Tooltip tap support, inventory bottom sheet on mobile, hover suppression on touch devices** |

See `PROJECT_STATUS.md` Sprint History section for detailed changelogs.

---

## PHASE 1: CRITICAL BUG FIXES

### Sprint 8B: Combat & Ability Bugs
**Status:** COMPLETE
**Files:** `engine/zones.ts`, `engine/abilities.ts`, `store/gameStore.ts`, `data/balance.ts`, `engine/crafting.ts`

1. **Fix weapon passives not affecting clear speed**
   - Trace: passive ability defs -> `aggregateAbilityEffects` (abilities.ts:343) -> `calcClearTime` (zones.ts:108)
   - Verify passives included when `kind === 'passive'` (abilities.ts:359-362)
   - Check store passes `abilityProgress` correctly
   - `resolveAbilityEffect` (abilities.ts:43) needs ability's progress to include skill tree bonuses

2. **Fix exalt currency on crafted items**
   - Trace `applyCurrency` exalt path (crafting.ts:233-263)
   - Current check: `prefixes.length < 3 || suffixes.length < 3`
   - Bug: if all affixes are on one side, exalt fails because one side is full even though other has room
   - Fix: ensure exalt checks BOTH sides and picks the one with room

3. **Fix HP drain feeling wrong**
   - `MIN_CLEAR_NET_DAMAGE_RATIO = 0.02` (balance.ts:222) forces constant 2% drain even with perfect defense
   - Replace with chunky damage: remove min-damage floor, make damage per clear a range (e.g., `baseDmg * (0.7 + Math.random() * 0.6)`)
   - Scale by defEff and zone level vs player level
   - Higher level zones = more damage, better defense = less, but with variance

### Sprint 8C: Mobile UX Foundation
**Status:** COMPLETE
**Files:** `ui/screens/InventoryScreen.tsx`, `ui/components/Tooltip.tsx`, new `ui/hooks/useIsMobile.ts`

1. **Add mobile detection hook**
   - Create `useIsMobile()` using `matchMedia('(pointer: coarse)')` or `maxTouchPoints > 0`
   - Use throughout UI for conditional rendering

2. **Convert inventory interactions to tap-friendly**
   - On mobile: tap item = select + show detail (auto-scroll into view)
   - Long-press = context menu (equip/sell/disenchant)
   - Remove right-click dependency on mobile
   - Use `scrollIntoView({ behavior: 'smooth' })` when detail panel appears

3. **Fix inventory detail panel position on mobile**
   - Move detail panel to fixed bottom sheet or modal overlay on mobile
   - Currently renders below entire inventory list (InventoryScreen.tsx:694)

4. **Convert `onMouseEnter`/`onMouseLeave` tooltips to click/tap on mobile**
   - Mobile tooltips: show on tap, dismiss on tap-outside
   - Affects InventoryScreen.tsx:621-622, CharacterScreen.tsx:807-808, Tooltip.tsx:33

### Sprint 8D: Currency & Equip UX Fixes
**Status:** NOT STARTED
**Files:** `ui/screens/InventoryScreen.tsx`, `store/gameStore.ts`, `ui/screens/CharacterScreen.tsx`

1. **Fix currency application UX**
   - Replace persistent currency selection with one-shot: select currency -> click item -> auto-deselects
   - Add confirmation on mobile ("Apply Chaos Orb to Iron Sword?")
   - Remove accidental mass-application risk

2. **Fix mobile unequip (ring2 issue)**
   - CharacterScreen gear toggle (CharacterScreen.tsx:785-795) uses two-click pattern (inspect then unequip)
   - On mobile this is unreliable
   - Switch to: tap = show detail panel with explicit Unequip button

3. **Fix multi-tab localStorage conflict**
   - Add `BroadcastChannel` or `storage` event listener
   - If second tab detects active session, show warning modal
   - Prevent writes from inactive tab

4. **Add weapon equip restrictions**
   - Enforce 1H/2H rules in `equipItem` (gameStore.ts:303-349)
   - 2H weapons auto-unequip offhand
   - Shields/focuses/quivers require 1H mainhand
   - Show "Requires one-handed weapon" error if incompatible

---

## PHASE 2: BALANCE & SYSTEMS REWORK

### Sprint 8E: Combat Rebalance
**Status:** NOT STARTED
**Files:** `engine/zones.ts`, `engine/character.ts`, `data/balance.ts`

1. **Rebalance boss encounters**
   - Current `BOSS_HP_MULTIPLIER = 8` and `BOSS_DAMAGE_MULTIPLIER = 2.5` are too high
   - Reduce to ~4 and ~1.5
   - Boss HP should be beatable in 10-15s with appropriate gear
   - Add band-scaling difficulty curve (band 1 = easy intro, band 6 = challenging)

2. **Rework defense transparency**
   - Show clear numbers: "You take X damage per hit, you deal Y damage per hit"
   - Display defensive efficiency as percentage on zone card
   - Show "Danger: High/Medium/Low" based on boss survivability

3. **Player XP scaling with zone level**
   - Change XP from flat `XP_PER_BAND * band` to scale with zone iLvl vs player level
   - Underleveled zones = drastically reduced XP
   - Formula: `baseXp * max(0.1, 1 - (playerLevel - zoneIlvl) * 0.1)`
   - Prevents farming zone 1 for fast XP

4. **Clear speed / defense philosophy**
   - Damage = faster clears. Defense = survive harder content + bosses
   - Remove defense from clear speed power calculation
   - Currently `charPower = playerDps * defEff * hazardMult` at zones.ts:121
   - Defense should NOT speed up clears, only reduce damage taken

### Sprint 8F: Item Level & Affix Rework
**Status:** NOT STARTED
**Files:** `engine/items.ts`, `engine/crafting.ts`, `data/balance.ts`, `data/affixes.ts`

1. **iLvl affects affix tier WEIGHTS, not availability**
   - All tiers (T1-T10) can roll at any iLvl, but weights shift dramatically
   - At iLvl 1: T1 weight = 0.01, T10 weight = 50
   - At iLvl 70: T1 weight = 5, T10 weight = 5
   - Smooth sigmoid or linear interpolation
   - Replace `getAvailableTiers` (items.ts:27-41) with `getWeightedTiers(iLvl)`

2. **Currency rework**
   - Keep existing Augment/Chaos/Divine/Annul
   - Rework Exalt tiers: Regular Exalt (current top-3 weighting), Greater Exalt (top-2 tiers, 40/60 weight), Perfect Exalt (always T1)
   - Add Greater/Perfect to currency definitions and drop tables

3. **Crafting material tier affects output iLvl**
   - Any material tier can be used, but higher tier = higher output iLvl
   - T1 materials = iLvl based on recipe
   - T3+ materials = recipe iLvl + bonus
   - Makes rare materials always valuable

4. **Armor type visual classifications**
   - Add visible "Plate/Leather/Cloth" badge on all armor items
   - In inventory, tooltips, and crafting
   - Color-coded: Plate=silver, Leather=brown, Cloth=purple
   - Add to item display name or as separate tag

### Sprint 8G: Crafting & Economy Tuning
**Status:** NOT STARTED
**Files:** `data/balance.ts`, `data/craftingRecipes.ts`, `engine/craftingProfessions.ts`, `engine/character.ts`

1. **Crafting XP curve tuning**
   - Current gathering XP curve `50 * 1.35^(level-1)` grows too fast
   - Evaluate whether crafting uses the same curve and adjust
   - Crafting should feel rewarding but not trivially fast

2. **Gold economy pass**
   - Audit gold sources (selling gear, clear drops) vs sinks (crafting, respec, vendor bags)
   - Ensure early game has enough gold for basic crafting but late game requires farming

3. **Salvage dust usage**
   - Give salvage dust a purpose: universal crafting material substitute (e.g., 10 dust = 1 of any T1 raw material)
   - Or use as currency for re-rolling item affixes

---

## PHASE 3: UX/UI OVERHAUL

### Sprint 9A: Desktop Layout Optimization
**Status:** NOT STARTED
**Files:** `App.tsx`, all screen files, `index.css`

1. **Maximize screen usage on desktop**
   - Use full viewport width on desktop (remove `max-w-4xl` constraint for wider screens)
   - Side-by-side panels where possible (inventory + detail, zone list + session summary)

2. **One-page-per-tab goal**
   - Each tab shows all critical info without scrolling on desktop (1080p minimum)
   - Use collapsible sections, tabbed sub-panels, and compact layouts

3. **Better gear comparison**
   - When hovering/selecting inventory item, show inline stat diff against equipped item
   - Green arrows for upgrades, red for downgrades
   - Show in item tooltip itself, not separate panel

### Sprint 9B: Loot Screen Overhaul
**Status:** NOT STARTED
**Files:** `ui/screens/InventoryScreen.tsx`

1. **Mobile-first inventory layout**
   - Top: compact equipped gear strip (horizontal scroll)
   - Middle: item grid with clear rarity borders
   - Bottom: fixed detail panel (bottom sheet on mobile)

2. **Auto-sell button**
   - Mirror auto-salvage: set rarity floor, items below auto-sell for gold

3. **Add armor type badges**
   - Show Plate/Leather/Cloth classification on every item card

### Sprint 9C: Crafting Screen Polish
**Status:** NOT STARTED
**Files:** `ui/screens/CraftingScreen.tsx`

1. **Material tooltips in recipes**
   - When viewing recipe, each material shows: name, icon, have/need count
   - On hover/tap: which zone(s) to gather the base material from
   - Reuse existing `getMatTooltip()` (CraftingScreen.tsx:217-250) in recipe cards

2. **Zone drop display**
   - Every zone card shows exactly what drops: material names with icons
   - Include zone-specific items and crafting components

3. **Batch crafting with progress bar**
   - Quantity selector (1/5/10/50/max)
   - Progress bar that ticks once per craft
   - Auto-applies results (items to bags, XP gained)

### Sprint 9D: Tutorial System Rework
**Status:** NOT STARTED
**Files:** `ui/components/TutorialOverlay.tsx`, `App.tsx`, `store/gameStore.ts`

1. **New tutorial flow**
   - Step-by-step: Equip weapon -> Start combat run -> Equip weapon skill -> Try gathering -> Refine materials -> Craft gear
   - Each step completable in one short run

2. **Tutorial index**
   - Accessible from help icon in TopBar
   - All tutorial steps with completion checkmarks
   - Can replay any step
   - Brief explanation of each game system

---

## PHASE 4: NEW FEATURES

### Sprint 10A: Zone Mastery System
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/zones.ts`, `engine/zones.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`

1. **5-stage zone mastery**
   - Track clears per zone (combat) and gathers per zone (gathering) separately
   - Mastery tiers at 10/50/200/500/1000 completions
   - Each tier: +X% drop rate, +Y% material yield, +Z% rare find for that zone
   - Show mastery progress on zone cards

2. **Mastery rewards**
   - Cosmetic badge upgrades (bronze -> silver -> gold -> platinum -> diamond)
   - Small permanent bonuses per zone

### Sprint 10B: Mob Loot Tables & Zone Identity
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/zones.ts`, `data/mobLootTables.ts` (new), `engine/zones.ts`

1. **Multiple mob types per zone**
   - Each zone has 2-4 creature types
   - Player can farm specific mob or "farm the zone" (random distribution)

2. **Mob-specific drops**
   - Guaranteed drops (e.g., spiders always drop chitin) + secondary loot table
   - Crafting component drops

3. **Boss unique item pools**
   - Each zone boss has 1-3 exclusive items
   - Makes every zone worth checking out

### Sprint 10C: Crafting Components
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/craftingRecipes.ts`, `data/components.ts` (new), `engine/craftingProfessions.ts`

1. **Component crafting**
   - Intermediate items (hilts, handles, rivets, thread) used as ingredients for final items
   - E.g., Sword = iron + wood + hilt (crafted from iron + leather)
   - Doubles crafting XP opportunities

2. **Component recipes**
   - Each profession gets 3-5 component recipes feeding into main recipes

### Sprint 10D: Health Potions & Death System
**Status:** NOT STARTED
**Files:** `types/index.ts`, `engine/zones.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`

1. **Health potions**
   - Craftable via Alchemy
   - Manual use (click/tap) heals X% HP
   - Cooldown timer (30-60s)
   - Potion button on zone screen during combat

2. **Death penalties**
   - On death: recovery period (5-10s), lose streak bonuses, small gold penalty

3. **Auto-cast toggle**
   - Toggle on ability bar: abilities auto-activate on cooldown
   - Simple interval check in tick loop

### Sprint 10E: Shop Tab
**Status:** NOT STARTED
**Files:** `types/index.ts`, `store/gameStore.ts`, `ui/screens/ShopScreen.tsx` (new), `ui/components/NavBar.tsx`

1. **Shop tab**
   - New 5th tab. Sections: Bags, Common Materials, Weapons, Armor
   - Inventory refreshes every 30 min real-time
   - Prices scale with item quality

2. **Move bag purchasing from inventory to shop**

3. **Rare rotating stock**
   - Small chance for uncommon/rare items in shop rotation

### Sprint 10F: Class Buffs & Auto-Sell
**Status:** NOT STARTED
**Files:** `data/classes.ts`, `engine/classResource.ts`, `store/gameStore.ts`

1. **Class-specific manual buffs**
   - 2-hour duration, long cooldown
   - Warrior: Battle Cry (+20% damage)
   - Mage: Arcane Intellect (+spell damage, +XP)
   - Ranger: Eagle Eye (+rare find)
   - Rogue: Shadow Step (+clear speed, +crit)

2. **Auto-sell by rarity**
   - Same as auto-salvage but sells for gold
   - Dropdown selector for min rarity threshold

### Sprint 10G: Enchanting Profession
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/craftingProfessions.ts`, `data/craftingRecipes.ts`, `engine/craftingProfessions.ts`

1. **Enchanting profession**
   - Disenchanting gear yields enchanting materials (scaled by item rarity)
   - Craft enchantment scrolls that permanently add bonus to gear slot
   - One enchant per slot
   - Higher profession level = better enchants

### Sprint 10H: Cooking Profession
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/craftingProfessions.ts`, `data/craftingRecipes.ts`, `engine/craftingProfessions.ts`

1. **Cooking profession**
   - Uses fish + herbs + mob drops to craft food
   - Food provides timed buffs (1-2 hours): +damage, +defense, +XP, +rare find
   - One food buff active at a time

### Sprint 10I: Gathering/Crafting Gear Sets & Dual Loadout
**Status:** NOT STARTED
**Files:** `types/index.ts`, `store/gameStore.ts`, `ui/screens/CharacterScreen.tsx`

1. **Dual equipment loadout**
   - Combat set and Gathering set
   - Auto-swap when switching modes
   - Separate equipment maps in state

2. **Gathering-specific gear**
   - Gear with gathering affixes (skill XP bonus, rare find, material yield)
   - Only useful in gathering mode

### Sprint 10J: Character System
**Status:** NOT STARTED
**Files:** `types/index.ts`, `store/gameStore.ts`, `ui/components/TopBar.tsx`

1. **Character naming**
   - Name input on class selection and in character screen
   - Displayed in TopBar

2. **Character swapping**
   - Multiple save slots in localStorage (keyed by character name)
   - Character select screen on launch if multiple characters exist

### Sprint 10K: Attack Swing Timer
**Status:** NOT STARTED
**Files:** `engine/zones.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`

1. **Visual swing timer**
   - During boss fights: player attack timer bar + boss attack timer bar
   - Player attacks at `1/attackSpeed` intervals, boss at its own rate
   - Damage applied in chunks on each swing completion

---

## NOT YET SCHEDULED (from GDD / Evolution Doc)

These items from the original GDD and evolution doc haven't been placed into a sprint yet. They should be scheduled when their dependencies are met or when they become priority.

| Feature | Source | Dependencies / Notes |
|---------|--------|---------------------|
| **Talent tree** (30-50 nodes per class) | GDD Section 3 | Needs class system (done). Major feature, likely its own sprint. |
| **Full ability population** (50+ abilities, 10 per weapon type) | Sprint 7C-B plan | Current: 24 abilities (3 per weapon). Need ~56 more. |
| **Specialization system** (one per character) | GDD | Needs talent tree first |
| **Socket crafting logic** | GDD | Socket Shard currency defined but unused |
| **More affix variety** (slot-specific affixes) | GDD | Current: 15 generic combat affixes |
| **Rare currencies** (Fracture, Veiled, Mirror) | Evolution doc | Deterministic endgame crafting |
| **Omen & Catalyst systems** | Evolution doc | Conditional crafting modifiers |
| **PWA + mobile polish** | Evolution doc | Service worker, manifest, installable |
| **Leaderboards & social** | Evolution doc | Fastest clears, highest zone |
| **Trading & auction house** | Evolution doc | Player economy, needs backend |
| **Seasons/leagues** | Evolution doc | Seasonal resets with modifiers |
| **Ascendancy prestige** | Evolution doc | Endgame progression system |

---

## Verification Checklist (Every Sprint)

1. `npm run build` — must pass (stricter than `tsc --noEmit`)
2. Manual browser test of changed functionality
3. Mobile test (responsive dev tools or actual phone)
4. Check browser console for errors
5. Update `docs/PROJECT_STATUS.md` with sprint changes
6. `git add <specific files> && git commit && git push origin master`

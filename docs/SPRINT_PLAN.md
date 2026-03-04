# Idle Exile — Sprint Plan & Roadmap

> **Full development roadmap.** Read `PROJECT_STATUS.md` first for current state.
> Last updated: 2026-03-04 (Post-Sprint: Crafting Overhaul)

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
| **8D** | **Currency & equip UX: one-shot currency application, mobile unequip button, multi-tab localStorage guard, weapon 1H/2H equip restrictions** |
| **8E** | **Combat rebalance: boss HP/DMG reduced, defense removed from clear speed, XP scaling with zone level, boss danger indicator** |
| **8E-2** | **Combat rebalance tuning: adjusted boss HP/DMG scaling, level damage multipliers** |
| **8F** | **Item level & affix rework: weighted tier rolling, exalt tiers, armor type badges** |
| **8G** | **Crafting & economy tuning: XP curves, gold audit, salvage dust usage** |
| **9A** | **Desktop layout optimization: full viewport, side-by-side panels, gear comparison** |
| **9B** | **Loot screen overhaul: mobile-first inventory, auto-sell, armor badges** |
| **9C** | **Crafting screen polish: material tooltips, zone drops, batch crafting** |
| **9D** | **Tutorial system rework: step-by-step flow, tutorial index** |
| **10A** | **Active Skills Foundation: 48 skill defs across 8 weapon types, tag-based DPS engine (calcSkillDps), v24 migration** |
| **10B** | **Per-Clear Combat Sim: simulateCombatClear with per-hit rolls (crits/misses/DoT), variable clear times, CombatClearResult** |
| **10C** | **Skill Equip UI + Combat Stats Display: SkillPanel component, equipSkill action, DPS comparison, combat stats on ZoneScreen** |
| **10D** | **Delivery Tag Stats + Affixes: 5 new StatKeys (Melee/Projectile/AoE/DoT/Channel), 5 new affix defs, wired into DPS engine** |
| **10E** | **Elemental Skill Diversity: 10 skills changed element, 3 new skills, 51 total. Every weapon has meaningful elemental choices** |
| **10F** | **Unified SkillDef Type + Data: SkillDef merges 51 active + 24 abilities = 75 unified defs, new engine with delegation** |
| **10G** | **Skill Bar Store + v25 Migration: 8-slot skillBar in store, engine reads switched, old actions bridged, v24→v25 migration** |
| **10H** | **Skill Bar UI: 8-slot SkillBar component, rewritten SkillPanel, SkillPicker on ZoneScreen, AbilityPanel removed** |
| **10I** | **Auto-Cast Engine + Priority: activateSkillBarSlot rewritten (click bug fix), tickAutoCast with GCD + priority, auto-cast UI toggle** |
| **10J** | **Cleanup Old Systems: 5 legacy files deleted, bridge code removed, skillBar 8→5 slots, v26 migration** |
| **10K-A** | **Real-Time Combat Engine: tickCombat fires skills on cast interval, mob HP drains live, MobDisplay uses real HP bar** |
| **10K-B1** | **Boss Unification: boss fights use tickCombat (per-hit rolls), removed tickBoss/tickBossFight dead code** |
| **10K-B2** | **Combat Visual Feedback: skill slot flash, damage floaters, combat log, BossFightDisplay cleanup** |
| **10L** | **Cooldown UI + Visual Polish: floater centering/rounding fixes, cooldown sweep overlays, active buff sweep** |
| **10M** | **Multi-Skill Rotation: cooldown-based rotation engine, per-skill CDs (3-12s tiers), GCD system, cooldown sweep UI, any-slot equip** |
| **10N** | **Skill XP + Passive Points: all equipped skills earn XP, max level 20, quadratic XP curve, level badges on skill bar** |
| **10O** | **Per-Hit Defense System: rollZoneAttack pipeline (dodge→block→armor→resist), simulateClearDefense, boss per-hit attacks, life leech, regen cap** |
| **10Q** | **Real-Time Zone Defense + Swing Timer: zone attacks in tickCombat (mirrors boss model), enemy swing timer UI, enemy damage floaters, balance retuning, removed batched defense from processNewClears** |
| **11A** | **Class Talent Trees: 4 classes x 3 paths x 8 nodes = 96 talent nodes, keystones, ClassTalentPanel UI** |
| **11B** | **Per-Skill Graph Trees (Wand): 9 wand skills x ~35 nodes, SkillModifier system, debuffs, element/AoE conversion, SkillGraphView** |
| **11B-Polish** | **Skill Graph — Cooler Nodes + Better UX: cross-skill globalEffect on keystones, 2-stat minor combos, select-then-allocate, mobile branch path view, SVG visual polish** |
| **CL Synergy** | **CL Skill Tree Redesign: 51→15 nodes, 3 cross-skill synergy branches, onDodge/onBlock procs** |
| **Zone Progression** | **Zone unlock chain (boss kill gate), mastery milestones (3 tiers), void invasions (corrupted items, invasion mobs)** |
| **Crafting Overhaul** | **Pattern-based crafting (35 patterns, zone/boss/invasion drops), milestone rework (+charges), PatternPanel UI, v40 migration** |

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
**Status:** COMPLETE
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
**Status:** COMPLETE
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

## PHASE 4: ACTIVE SKILLS & COMBAT

### Sprint 10A: Active Skills Foundation
**Status:** COMPLETE
**Files:** `types/index.ts`, `data/skills.ts` (new), `engine/skills.ts` (new), `engine/zones.ts`, `store/gameStore.ts`

1. **48 active skill definitions** across 8 weapon types (6 per weapon)
2. **Tag-based DPS engine** (`calcSkillDps`) with PoE-style additive %increased
3. **Auto-equip default skill** based on weapon type
4. **v24 save migration** for equippedSkills array

### Sprint 10B: Per-Clear Combat Sim
**Status:** COMPLETE
**Files:** `engine/skills.ts`, `types/index.ts`, `engine/zones.ts`, `store/gameStore.ts`

1. **`calcSkillDamagePerCast()`** extracted from `calcSkillDps()` for shared use
2. **`simulateCombatClear()`** — per-hit rolls (hit/crit/miss, DoT stacking, damage variance)
3. **`CombatClearResult`** type with clearTime, hits, crits, misses, damage stats
4. **Variable clear times** — lucky crits = faster, miss streaks = slower
5. **Offline/boss stays deterministic** — expected-value DPS for performance

### Sprint 10C: Skill Equip UI + Combat Stats Display
**Status:** COMPLETE
**Files:** `store/gameStore.ts`, `ui/components/SkillPanel.tsx` (new), `ui/screens/CharacterScreen.tsx`, `ui/screens/ZoneScreen.tsx`

1. **equipSkill store action** — validates skill, weapon match, level req, mid-clear recalc
2. **SkillPanel component** — browse skills, DPS comparison, tag pills, equip on click
3. **Combat stats on ZoneScreen** — lastClearResult display (casts, hits, crits, misses)

### Sprint 10D: Delivery Tag Stats + Affixes
**Status:** COMPLETE
**Files:** `types/index.ts`, `engine/skills.ts`, `data/balance.ts`, `data/affixes.ts`, `ui/screens/InventoryScreen.tsx`

1. **5 new delivery tag StatKeys** — incMeleeDamage, incProjectileDamage, incAoEDamage, incDoTDamage, incChannelDamage
2. **5 new affix definitions** — prefix affixes that scale delivery tags through gear
3. **Wired into DPS engine** — calcSkillDamagePerCast %increased section

### Sprint 10E: Elemental Skill Diversity
**Status:** COMPLETE
**Files:** `data/skills.ts`

1. **10 skills changed element** — meaningful Fire/Cold/Lightning/Chaos choices per weapon
2. **3 new skills** — sword_ice_thrust, axe_frost_rend, dagger_lightning_lunge (51 total)

### Sprint 10F: Unified SkillDef Type + Data
**Status:** COMPLETE
**Files:** `types/index.ts`, `data/unifiedSkills.ts` (new), `engine/unifiedSkills.ts` (new)

1. **Unified SkillDef type** — merges ActiveSkillDef + AbilityDef into one interface
2. **75 unified skill definitions** — converts both systems, handles 5 ID conflicts
3. **Unified engine** — calcUnifiedDps, resolveSkillEffect, aggregateSkillBarEffects

### Sprint 10G: Skill Bar Store + Migration v25
**Status:** COMPLETE
**Files:** `store/gameStore.ts`, `types/index.ts`

1. **New state fields**: `skillBar` (8 slots), `skillProgress`, `skillTimers`
2. **v24→v25 migration**: `equippedSkills[0]` → `skillBar[0]`, `equippedAbilities[0..3]` → `skillBar[1..4]`
3. **New actions**: `equipToSkillBar`, `unequipSkillBarSlot`, `toggleSkillAutoCast`, `reorderSkillBar`
4. **Engine reads switched**: All `aggregateAbilityEffects` → `aggregateSkillBarEffects`, `computeNextClear` uses `getPrimaryDamageSkill`
5. **Old actions bridged**: `equipAbility`, `unequipAbility`, `toggleAbility`, `activateAbility`, `equipSkill`, `equipItem`, `unequipSlot` all mirror to unified skillBar

### Sprint 10H: Skill Bar UI
**Status:** COMPLETE
**Files:** `ui/components/SkillBar.tsx` (new), `ui/components/SkillPanel.tsx`, `ui/screens/ZoneScreen.tsx`, `ui/screens/CharacterScreen.tsx`

1. **8-slot horizontal skill bar** — replaces AbilityBar, kind-colored borders, timer display
2. **Unified SkillPanel** — browse all skills (damage + buff + passive), category filters, inline skill trees
3. **SkillPicker** — simple equip/unequip on ZoneScreen

### Sprint 10I: Auto-Cast Engine + Priority
**Status:** COMPLETE
**Files:** `engine/unifiedSkills.ts`, `types/index.ts`, `data/balance.ts`, `store/gameStore.ts`, `ui/screens/ZoneScreen.tsx`, `ui/components/SkillBar.tsx`

1. **Click bug fixed** — `activateSkillBarSlot` rewritten to work from unified state (not broken legacy path)
2. **Auto-cast engine** — `tickAutoCast` fires skills in bar order (slot 0 = highest priority), 1s GCD between activations
3. **GCD system** — `SKILL_GCD = 1.0`, toggles skip GCD, buff/instant/ultimate respect GCD
4. **Auto-cast UI** — green "A" indicator on activatable slots, click to toggle on/off
5. **Default autoCast: true** — all skills auto-fire by default (idle game), rehydrate fix for old saves

### Sprint 10J: Cleanup Old Systems
**Status:** COMPLETE
**Files:** 5 deleted, 7 edited. See `COMBAT_OVERHAUL.md` for full details.

1. **All imports rerouted** to unified modules
2. **5 legacy files deleted** (engine/abilities, engine/skills, data/abilities, data/skills, AbilityBar.tsx)
3. **5 old store actions removed** + all bridge code
4. **3 legacy state fields removed** from GameState (equippedAbilities, abilityTimers, equippedSkills)
5. **Skill bar reduced** from 8 to 5 slots
6. **v26 migration** strips legacy fields, truncates skillBar

### Sprint 10K: Real-Time Combat Triggers
**Status:** NOT STARTED
See `COMBAT_OVERHAUL.md` for detailed checklist.

### Sprint 10L: Skill Cooldown UI + Visual Polish
**Status:** NOT STARTED
See `COMBAT_OVERHAUL.md` for detailed checklist.

### Sprint 10M: Multi-Skill Rotation (Foundation)
**Status:** COMPLETE
See `COMBAT_OVERHAUL.md` for detailed checklist.

### Sprint 10N: Skill XP + Passive Points
**Status:** COMPLETE
See `COMBAT_OVERHAUL.md` for detailed checklist.

---

## PHASE 5: NEW FEATURES

### Sprint 11A: Zone Mastery System
**Status:** ABSORBED INTO Zone Progression Sprint
**Note:** Implemented as 3-tier system (Bronze 25 / Silver 100 / Gold 500) instead of original 5-tier (10/50/200/500/1000). Added one-time rewards (gold + XP + item) and permanent zone bonuses (+5%/+10%/+15% drop rate & material yield). See Zone Progression sprint in `PROJECT_STATUS.md` for full details.

### Sprint 11B: Mob Loot Tables & Zone Identity
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

### Sprint 11C: Crafting Components
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/craftingRecipes.ts`, `data/components.ts` (new), `engine/craftingProfessions.ts`

1. **Component crafting**
   - Intermediate items (hilts, handles, rivets, thread) used as ingredients for final items
   - E.g., Sword = iron + wood + hilt (crafted from iron + leather)
   - Doubles crafting XP opportunities

2. **Component recipes**
   - Each profession gets 3-5 component recipes feeding into main recipes

### Sprint 11D: Health Potions & Death System
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

### Sprint 11E: Shop Tab
**Status:** NOT STARTED
**Files:** `types/index.ts`, `store/gameStore.ts`, `ui/screens/ShopScreen.tsx` (new), `ui/components/NavBar.tsx`

1. **Shop tab**
   - New 5th tab. Sections: Bags, Common Materials, Weapons, Armor
   - Inventory refreshes every 30 min real-time
   - Prices scale with item quality

2. **Move bag purchasing from inventory to shop**

3. **Rare rotating stock**
   - Small chance for uncommon/rare items in shop rotation

### Sprint 11F: Class Buffs & Auto-Sell
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

### Sprint 11G: Enchanting Profession
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/craftingProfessions.ts`, `data/craftingRecipes.ts`, `engine/craftingProfessions.ts`

1. **Enchanting profession**
   - Disenchanting gear yields enchanting materials (scaled by item rarity)
   - Craft enchantment scrolls that permanently add bonus to gear slot
   - One enchant per slot
   - Higher profession level = better enchants

### Sprint 11H: Cooking Profession
**Status:** NOT STARTED
**Files:** `types/index.ts`, `data/craftingProfessions.ts`, `data/craftingRecipes.ts`, `engine/craftingProfessions.ts`

1. **Cooking profession**
   - Uses fish + herbs + mob drops to craft food
   - Food provides timed buffs (1-2 hours): +damage, +defense, +XP, +rare find
   - One food buff active at a time

### Sprint 11I: Gathering/Crafting Gear Sets & Dual Loadout
**Status:** NOT STARTED
**Files:** `types/index.ts`, `store/gameStore.ts`, `ui/screens/CharacterScreen.tsx`

1. **Dual equipment loadout**
   - Combat set and Gathering set
   - Auto-swap when switching modes
   - Separate equipment maps in state

2. **Gathering-specific gear**
   - Gear with gathering affixes (skill XP bonus, rare find, material yield)
   - Only useful in gathering mode

### Sprint 11J: Character System
**Status:** NOT STARTED
**Files:** `types/index.ts`, `store/gameStore.ts`, `ui/components/TopBar.tsx`

1. **Character naming**
   - Name input on class selection and in character screen
   - Displayed in TopBar

2. **Character swapping**
   - Multiple save slots in localStorage (keyed by character name)
   - Character select screen on launch if multiple characters exist

### Sprint 11K: Attack Swing Timer
**Status:** ABSORBED INTO 10Q
- Enemy swing timers (zone + boss) implemented in Sprint 10Q alongside real-time zone defense.

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

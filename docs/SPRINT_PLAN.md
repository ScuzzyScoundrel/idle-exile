# Idle Exile — Sprint Plan

> Development roadmap broken into focused sprints.
> Each sprint produces a testable, working increment.

## Sprint Philosophy
- **Vertical slices**: Each sprint delivers something playable/testable, not just data
- **Engine first, UI second**: Core math engines before any UI
- **Data-driven**: Game data lives in config files, not hardcoded
- **Test as you go**: Each engine system gets unit tests before moving on

---

## Sprint 0: Foundation (Setup)
**Goal:** Project scaffolding, tooling, core data types.
- [ ] Initialize project (Vite + React + TypeScript)
- [ ] Configure linting (ESLint), formatting (Prettier), testing (Vitest)
- [ ] Define core TypeScript types/interfaces:
  - `Item`, `Affix`, `AffixTier`, `AffixPool`
  - `Character`, `CharacterClass`, `Ability`, `Talent`
  - `Zone`, `ZoneRegion`, `ZoneTier`, `GatheringFocus`
  - `Currency`, `Pattern`, `Profession`, `Specialization`
- [ ] Create game data schema (JSON or TS const objects)
- [ ] Set up save/load skeleton (localStorage)
- [ ] Basic app shell with routing

**Deliverable:** Empty app that builds, lints, tests, with all type definitions in place.

---

## Sprint 1: Item & Affix Engine
**Goal:** The mathematical heart of the game — generate items with proper RNG affixes.
- [ ] Affix database: all affix types, tier ranges (T5-T1), weights, valid slots
- [ ] Item generation engine:
  - Roll base type, rarity, affix count
  - Select affixes from weighted pool (respecting prefix/suffix slots)
  - Roll tier per affix, roll value within tier range
- [ ] Item level gates (which tiers are available at which iLvl)
- [ ] Rarity upgrade logic (Normal → Magic → Rare)
- [ ] Disenchant logic (item → currency shards)
- [ ] Unit tests: verify distribution, tier gating, slot rules

**Deliverable:** `generateItem(params)` that produces valid, interesting items. Testable in console.

---

## Sprint 2: Zone & Idle Loop Engine
**Goal:** The idle core — zones produce loot over time.
- [ ] Zone database: all zones, regions, material tables, tier scaling
- [ ] Clear speed calculator: `calcClearTime(character, zone, tier)`
- [ ] Idle simulation engine: given elapsed time + zone + focus mode, produce:
  - Items (using Sprint 1 engine)
  - Materials (zone-specific, tier-appropriate)
  - Currency drops
  - XP earned
- [ ] Gathering focus mode modifiers (Combat/Harvesting/Prospecting/Scavenging)
- [ ] Offline progression: calculate results for arbitrary time spans
- [ ] Unit tests: verify loot rates, material distribution, time scaling

**Deliverable:** `simulateIdleRun(character, zone, tier, focus, duration)` → full loot results.

---

## Sprint 3: Character System Engine
**Goal:** Classes, stats, abilities, talents — everything that defines a character.
- [ ] Class definitions: base stats, armor affinity, ability pools
- [ ] Stat calculation engine: aggregate gear stats + talent bonuses + ability effects
- [ ] Ability system: 4 slots, mutator selection, synergy detection
- [ ] Talent tree data structure and allocation logic
- [ ] Level-up system: XP curve, stat gains, ability unlocks
- [ ] Respec logic (with cost)
- [ ] Unit tests: stat aggregation, talent application, ability combos

**Deliverable:** Full character model that feeds into clear speed calculator.

---

## Sprint 4: Currency Crafting Engine (Track A)
**Goal:** All PoE-style currency crafting operations.
- [ ] Implement all 9 core currencies:
  - Chaos, Augment, Exalt, Transmute, Alchemy, Divine, Annul, Socket, Regal
- [ ] Implement rare currencies: Fracture, Veiled, Mirror
- [ ] Catalyst system: temporary affix category weighting
- [ ] Omen system: conditional triggers on next craft action
- [ ] Crafting validation (can this currency be used on this item?)
- [ ] Crafting history log (for undo/review)
- [ ] Unit tests: every currency operation, edge cases, fracture locking

**Deliverable:** `applyCurrency(item, currency, options)` → modified item. Full test coverage.

---

## Sprint 5: Profession Crafting Engine (Track B)
**Goal:** Pattern-based item creation from materials.
- [ ] Profession data: all 8 professions, level requirements, material costs
- [ ] Pattern system: rarity tiers (Common/Rare/Epic/Legendary), charges
- [ ] Profession crafting engine:
  - Select pattern + materials → generate item with pattern rules
  - Guaranteed affixes from pattern + random remainder
  - Quality scaling based on profession level
- [ ] Profession leveling: XP from crafting, milestone unlocks
- [ ] Material inventory management
- [ ] Unit tests: pattern charge consumption, level gating, output quality scaling

**Deliverable:** `professionCraft(character, pattern, materials)` → crafted item.

---

## Sprint 6: Specialization System
**Goal:** The one-per-character identity system.
- [ ] Specialization tree data structure (15-20 nodes primary, 8-10 secondary)
- [ ] Specialization mechanics implementation:
  - Sanctified Craft, Twinned Craft, Tempered Craft
  - Illusion Mod, Multi-Craft Proc, Resonance
  - Signature Mark, Deep Combo Nodes
- [ ] Primary vs Secondary spec differences
- [ ] Roll floor bonuses, tier weighting adjustments
- [ ] Spec switching (with cost/reset)
- [ ] Integration with profession crafting engine
- [ ] Unit tests: each mechanic, primary vs secondary differences

**Deliverable:** Specialization modifies profession crafting output. All mechanics testable.

---

## Sprint 7: UI Shell & Navigation
**Goal:** The app frame — responsive layout, screens, navigation.
- [ ] Responsive layout (mobile-first, desktop-friendly)
- [ ] Screen routing: Home, Character, Zones, Inventory, Crafting, Professions
- [ ] Global UI state management (selected character, current screen)
- [ ] Design system: colors, typography, component patterns
- [ ] Item tooltip component (shows affixes, tiers, sockets)
- [ ] Basic notification/toast system

**Deliverable:** Navigable app shell with placeholder content on each screen.

---

## Sprint 8: UI — Inventory & Loot
**Goal:** The loot evaluation experience.
- [ ] Inventory grid display
- [ ] Item card component (rarity colors, affix display, tier indicators)
- [ ] Loot review screen (post-idle results)
- [ ] Equipment panel (character paper doll or slot grid)
- [ ] Equip/unequip flow
- [ ] Disenchant flow (with confirmation)
- [ ] Item comparison (equipped vs candidate)
- [ ] Sort/filter inventory

**Deliverable:** Player can review loot, equip items, disenchant junk.

---

## Sprint 9: UI — Crafting
**Goal:** Both crafting tracks in the UI.
- [ ] Currency crafting UI:
  - Select item + currency → preview → confirm → animated result
  - Catalyst application flow
  - Omen application flow
  - Fracture/Veiled/Mirror special UIs
- [ ] Profession crafting UI:
  - Pattern selection (with charge display)
  - Material requirement check
  - Craft execution → result display
- [ ] Crafting history/log viewer

**Deliverable:** Full crafting experience for both tracks.

---

## Sprint 10: UI — Zones & Character
**Goal:** Zone selection, character sheet, talent tree.
- [ ] Zone map / zone list with region grouping
- [ ] Zone detail: tier selection, gathering focus, estimated clear time
- [ ] "Send to zone" flow → idle timer
- [ ] Character sheet: stats summary, equipped gear, class info
- [ ] Talent tree visual (interactive node graph)
- [ ] Ability loadout editor with mutator selection

**Deliverable:** Full gameplay loop playable in browser.

---

## Sprint 11: Polish & Integration
**Goal:** Save system, offline calc, balance pass, PWA.
- [ ] Save/load to localStorage (auto-save on state change)
- [ ] Offline progression on app open (calculate what was earned)
- [ ] Initial balance pass: drop rates, XP curves, craft costs
- [ ] PWA setup (service worker, manifest, installable)
- [ ] Performance audit (large inventories, long idle calcs)
- [ ] Error boundaries and edge case handling
- [ ] Basic onboarding / tutorial flow

**Deliverable:** MVP — a complete, playable, saveable idle ARPG.

---

## Post-MVP Sprints (Future)
- **Sprint 12:** Sound effects, animations, visual polish
- **Sprint 13:** Trading & auction house
- **Sprint 14:** Group content (dungeons/raids)
- **Sprint 15:** Guild systems
- **Sprint 16:** Seasons/leagues framework
- **Sprint 17:** Ascendancy prestige system
- **Sprint 18:** Mobile native (React Native or PWA optimization)

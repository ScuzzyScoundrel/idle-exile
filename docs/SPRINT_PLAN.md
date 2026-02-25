# Idle Exile — Sprint Plan

> Development roadmap. Updated 2026-02-24.
> References: `idle-exile-evolution.docx` (design source of truth), `PROJECT_STATUS.md` (current state).

## Sprint Philosophy
- **Vertical slices**: Each sprint delivers something playable/testable
- **Engine first, UI second**: Core math before any UI
- **Data-driven**: Game data in config files, not hardcoded
- **Follow evolution doc**: Where it conflicts with original GDD, evolution doc wins

---

## Completed Sprints

### Sprint 0: Foundation — DONE
Project scaffolding, Vite + React + TS + Zustand + Tailwind. Core types defined. Save/load with localStorage. 3-tab app shell (Zones / Bags / Hero).

### Sprint 1: Item & Affix Engine — DONE
15 affix definitions (7 prefix, 8 suffix) with T1-T10 tiers. Weighted tier rolling. iLvl gates tiers (Band 1: T7 best → Band 6: T1). Quality-based rarity (Common→Legendary based on affix quality, not count). 296 item bases across 15 gear slots. 2-6 affixes per item.

### Sprint 1A: UI Polish — DONE
Auto-salvage feedback, loot dismiss, rarity guide, hero page overhaul, paper doll with item names, stat tooltips.

### Sprint 1B: Zone Overhaul & Scaling — DONE
Zone card grid (2x2 + boss), band-themed gradients, single-accordion. Clear time scaling with exponential level penalty + quadratic hazard penalty (multiplicative). Progressive hazard design across all 30 zones (World's Edge = all 5 elements). Exalt iLvl gating fix. Best-tier ★ indicator. Item Level & Tier Gating guide.

### Sprint 1C: Real-Time Loot, Bag System & Bug Fixes — DONE
Real-time loot (items drop into bags as clears happen, not batched). Loot feed shows actual item names with rarity colors. Bag capacity system (30 start, 5 tiers of +6 upgrades to 60, from zone drops or gold purchase). Overflow auto-salvage with running tally. "Collect Resources" button for currencies/materials/gold only. Tooltip viewport clipping fix (useLayoutEffect flip-below). Unequip guard when bags full. Save v7 migration.

### Sprint 2: Loot Rarity & Volume Tuning — DONE
Centralized all balance constants into `src/data/balance.ts`. Reduced item drop chance from 25% to 8% per clear. Increased material drops (2-4 vs 1-2), currency drop rates (+60-80%), and gold per band (8 vs 5). Added upgrade indicators (green triangle badges) on inventory items that are net improvements over equipped gear. Refactored ComparisonPanel to use shared engine logic with readable stat labels.

### Sprint 2B: Bag Slots, Hover Comparison & Right-Click Equip — DONE
Replaced flat bag capacity with WoW-style 5-bag-slot system. Each bag has per-tier capacity (6/8/10/12/14). Bags are equippable items with sell/salvage value. Vendor sells T1-T2 only; T3+ from drops/crafting. Buy bags → stash → equip to weakest slot. Added inline stat comparison on hover tooltips (green/red deltas vs equipped). Right-click to equip items. Sell gear for gold (rarity-based + iLvl/5 bonus). Bag slots section moved above loot grid. Save v8 migration. Tooltip widened to w-64.

### Sprint 3: Offline Progression + Gold Fix — DONE
Gold economy rebalanced (GOLD_PER_BAND 8→3). Offline progression: on app reopen, detects elapsed time, simulates loot via `simulateIdleRun()`, presents "Welcome Back, Exile!" modal with full summary (clears, gold, XP, items, best drop, resources). Items stored in summary until player claims (overflow auto-salvaged at claim time). Race condition prevented by resetting `idleStartTime` in `onRehydrateStorage`. Added bag drops to `simulateIdleRun()`. New `pickBestItem()` helper. Save v9 migration. Deployed to Vercel.

---

## Current Priority: What to Build Next

Based on evolution doc Section 18 (Implementation Priority) and current game state.

### Sprint 4: Weapon Types + Abilities + Focus Modes — DONE
**Goal:** 8 weapon types with 24 abilities (2 active + 1 passive each) + 4 focus modes. Active players clicking abilities = 30-50% faster clears.
- [x] 8 weapon types: sword, axe, mace, dagger, staff, wand, bow, crossbow (49 new item bases, 56 total mainhand)
- [x] 24 abilities (3 per weapon): 16 active abilities with cooldowns + 8 passive abilities
- [x] Mutator system: each ability has 2-3 mutators that modify its effect
- [x] Ability engine: timestamp-based cooldowns, effect resolution, aggregation
- [x] 4 focus modes: Combat (balanced), Harvesting (2.5x mats), Prospecting (2x currency), Scavenging (1.5x items)
- [x] Clear speed integration: abilities + focus modes modify calcClearTime, simulateSingleClear, simulateIdleRun
- [x] AbilityBar UI on ZoneScreen: 4 slots with cooldown/buff timers, click to activate
- [x] FocusModeSelector: segmented toggle above zone grid
- [x] CharacterScreen ability panel: weapon type display, ability list, equip to slots, mutator selection
- [x] Weapon compatibility: equipping new mainhand auto-removes incompatible abilities
- [x] Offline: passive-only effects for offline progression, active buffs cleared on return
- [x] Save v10 migration: existing mainhand items tagged as swords

### Sprint 5: Class Mechanics
**Goal:** 4 classes with unique passive mechanics (evolution doc Section 13).
**Why now:** Builds on weapon abilities to create distinct playstyles.
- [ ] Class selection at character creation (Warrior, Mage, Ranger, Rogue)
- [ ] Warrior: Rage (builds during clears, decays between, boosts damage)
- [ ] Mage: Arcane Charges (build up, discharge for burst, cycle)
- [ ] Ranger: Tracking (stacks in same zone, boosts rare drops)
- [ ] Rogue: Momentum (consecutive clears without stopping, boosts speed)
- [ ] Each mechanic affects idle calculations differently
- [ ] Talent tree: 30-50 nodes per class (modifies class mechanic)

### Sprint 6: Gathering System
**Goal:** Gathering as a separate activity with its own gear (evolution doc Sections 4-5).
**Why now:** Material system is placeholder — gathering creates the real material economy.
- [ ] 5 gathering professions: Mining, Herbalism, Skinning, Logging, Fishing
- [ ] Gathering skill levels (1-100) with XP and zone skill gates
- [ ] Gathering mode toggle on zone screen (combat vs gathering)
- [ ] Gathering gear: separate equipment category with gathering-specific affixes
- [ ] Dual loadout system (combat set / gathering set)
- [ ] Gathering clear speed uses gathering gear stats only

### Sprint 7: Material Refinement & Crafting Professions
**Goal:** New World-style refinement chains + profession crafting (evolution doc Sections 3, 14).
**Why now:** Builds on gathering to create the full crafting loop.
- [ ] 6 refinement tracks (ore, cloth, leather, wood, herb, fish)
- [ ] Chain recipes: T1 raw → refined, T2+ requires previous refined + new raw
- [ ] Refining UI with gold cost
- [ ] Material deconstruction (1:2 ratio downward)
- [ ] 5 crafting professions: Weaponsmith, Armorer, Tailor, Alchemist, Jeweler
- [ ] Pattern-based item creation from refined materials
- [ ] Cross-track recipe dependencies (weapons need ingots + planks, etc.)

### Sprint 8: Gold Economy
**Goal:** Gold as meaningful soft currency (evolution doc Section 15).
- [ ] Gold drops from combat (scales with band)
- [ ] Refining costs gold
- [ ] Respec costs gold (scales with points)
- [ ] Inventory expansion costs gold
- [ ] Vendor recipes for gold

### Sprint 9: Player Feedback & Polish
**Goal:** Make getting stronger feel good (evolution doc Section 12).
- [ ] Kill counter / enemies defeated
- [ ] Clear speed comparison (before/after equipping)
- [ ] Milestone notifications (1000 zones cleared, first T2 found, etc.)
- [ ] Enhanced login screen with offline progress summary
- [ ] Wishlist / stat filter system

---

## Post-Core Sprints (Future)

| Sprint | Feature | Notes |
|--------|---------|-------|
| 10 | Rare currencies (Fracture, Veiled, Mirror) | Deterministic endgame crafting |
| 11 | Socket system | Socket Shard implementation |
| 12 | Specialization system | One per character, modifies crafting |
| 13 | Omen & Catalyst systems | Conditional crafting modifiers |
| 14 | PWA + mobile polish | Service worker, manifest, installable |
| 15 | Leaderboards & social | Fastest clears, highest zone, etc. |
| 16 | Trading & auction house | Player economy |
| 17 | Seasons/leagues | Seasonal resets with modifiers |
| 18 | Ascendancy prestige | Endgame progression system |

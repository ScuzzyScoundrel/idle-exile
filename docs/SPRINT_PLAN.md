# Idle Exile — Sprint Plan

> Development roadmap. Updated 2026-02-25.
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
Real-time loot (items drop into bags as clears happen). Loot feed shows actual item names with rarity colors. Bag capacity system (30 start, 5 tiers of +6 upgrades to 60, from zone drops or gold purchase). Overflow auto-salvage with running tally. "Collect Resources" button. Tooltip viewport clipping fix. Save v7 migration.

### Sprint 2: Loot Rarity & Volume Tuning — DONE
Centralized all balance constants into `src/data/balance.ts`. Item drop 25%→8%. Material drops 2-4 vs 1-2. Currency rates +60-80%. Upgrade indicators (green triangle badges). ComparisonPanel refactor.

### Sprint 2B: Bag Slots, Hover Comparison & Right-Click Equip — DONE
5-bag-slot system (6/8/10/12/14 per tier). Bag stash + equip/sell/salvage. Vendor T1-T2 only. Right-click to equip. Hover tooltip comparison. Sell gear for gold. Save v8 migration.

### Sprint 3: Offline Progression + Gold Fix — DONE
GOLD_PER_BAND 8→3. Offline progression modal with full summary. simulateIdleRun bag drops. pickBestItem(). Save v9. Vercel deploy.

### Sprint 4: Weapon Types + Abilities + Focus Modes — DONE
8 weapon types (56 mainhand bases), 24 abilities with mutators, 4 focus modes. AbilityBar + FocusModeSelector. Weapon compatibility. Passive-only offline effects. Save v10.

### Sprint 5: Zone Stabilization + Gathering System — DONE
Replaced old focus modes with Combat/Gathering toggle. 5 gathering professions (mining/herbalism/skinning/logging/fishing) with skill leveling (1-100), XP curve, milestones. Gathering-specific gear drops with separate affix pool (8 affixes). Auto-apply resources (removed collect button + pendingLoot). Session summary replaces loot feed. Band tabs replace accordion. All 30 zones updated with evolution doc material names, recommendedLevel, gatheringTypes. Zone level badges + underleveled warnings. Gathering skill gates per band (soft warnings). Offline gathering support. Save v11.

---

## Current Priority: What to Build Next

Based on evolution doc Section 18 (Implementation Priority) and current game state.

### Sprint 6: Class Mechanics
**Goal:** 4 classes with unique passive mechanics (evolution doc Section 13).
**Why now:** Builds on weapon abilities to create distinct playstyles.
- [ ] Class selection at character creation (Warrior, Mage, Ranger, Rogue)
- [ ] Warrior: Rage (builds during clears, decays between, boosts damage)
- [ ] Mage: Arcane Charges (build up, discharge for burst, cycle)
- [ ] Ranger: Tracking (stacks in same zone, boosts rare drops)
- [ ] Rogue: Momentum (consecutive clears without stopping, boosts speed)
- [ ] Each mechanic affects idle calculations differently
- [ ] Talent tree: 30-50 nodes per class (modifies class mechanic)

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

### Sprint 9: Gathering Gear UI + Dual Loadout
**Goal:** Complete the gathering gear experience.
- [ ] Gathering gear equip/swap UI (separate from combat equipment)
- [ ] Dual loadout system (combat set / gathering set)
- [ ] Gathering stats affect gathering clear speed
- [ ] Quick-swap between combat and gathering loadouts

### Sprint 10: Player Feedback & Polish
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
| 11 | Rare currencies (Fracture, Veiled, Mirror) | Deterministic endgame crafting |
| 12 | Socket system | Socket Shard implementation |
| 13 | Specialization system | One per character, modifies crafting |
| 14 | Omen & Catalyst systems | Conditional crafting modifiers |
| 15 | PWA + mobile polish | Service worker, manifest, installable |
| 16 | Leaderboards & social | Fastest clears, highest zone, etc. |
| 17 | Trading & auction house | Player economy |
| 18 | Seasons/leagues | Seasonal resets with modifiers |
| 19 | Ascendancy prestige | Endgame progression system |

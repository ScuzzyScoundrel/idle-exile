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
Project scaffolding, Vite + React + TS + Zustand + Tailwind. Core types defined. Save/load with localStorage. 3-tab app shell.

### Sprint 1: Item & Affix Engine — DONE
15 affix definitions with T1-T10 tiers. Weighted tier rolling. iLvl gates tiers. Quality-based rarity. 296 item bases across 15 gear slots.

### Sprint 1A–1C: UI Polish + Zone Overhaul + Real-Time Loot — DONE
Zone card grid, band gradients, scaling overhaul. Real-time loot into bags. Bag capacity system. Tooltip fixes. Save v7.

### Sprint 2–2B: Loot Tuning + Bag Slots + Hover Comparison — DONE
Centralized balance. Item drop 8%. 5-bag-slot system. Right-click equip. Hover comparison. Sell for gold. Save v8.

### Sprint 3: Offline Progression + Gold Fix — DONE
Gold economy fix. Offline modal. Bag drops. Save v9. Vercel deploy.

### Sprint 4: Weapon Types + Abilities — DONE
8 weapon types, 24 abilities with mutators. AbilityBar. Weapon compatibility. Save v10.

### Sprint 5: Gathering System — DONE
Combat/Gathering toggle. 5 gathering professions with skill leveling + milestones + gear. Auto-apply resources. Session summary. Band tabs. 30 zones updated. Save v11.

### Sprint 6: Material Refinement + Crafting Professions + Rare Materials — DONE
6 refinement tracks (36 recipes). 5 crafting professions (68 standard + 8 unique recipes). 25 rare materials with rarity-tiered drop rates. Catalyst system for guaranteed minimum rarity. Craft tab with Refine/Craft sub-panels. 4-tab NavBar. Rare drop notifications. Save v12.

---

## Current Priority: What to Build Next

### Sprint 7: Class Mechanics
**Goal:** 4 classes with unique passive mechanics (evolution doc Section 13).
**Why now:** Builds on weapon abilities to create distinct playstyles.
- [ ] Class selection at character creation (Warrior, Mage, Ranger, Rogue)
- [ ] Warrior: Rage (builds during clears, decays between, boosts damage)
- [ ] Mage: Arcane Charges (build up, discharge for burst, cycle)
- [ ] Ranger: Tracking (stacks in same zone, boosts rare drops)
- [ ] Rogue: Momentum (consecutive clears without stopping, boosts speed)
- [ ] Each mechanic affects idle calculations differently
- [ ] Talent tree: 30-50 nodes per class (modifies class mechanic)

### Sprint 8: Gold Economy
**Goal:** Gold as meaningful soft currency (evolution doc Section 15).
- [ ] Respec costs gold (scales with points)
- [ ] Vendor recipes for gold
- [ ] Gold sinks beyond refinement/crafting

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

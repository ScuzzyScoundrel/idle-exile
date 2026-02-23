# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-23

## Current Phase
**Phase 1: Playable Prototype** — Core loop working and playable.

## Current Sprint
**Sprint 0: Foundation** — COMPLETE. Moving to Sprint 1 (polish + class system).

## What Is Working Right Now
The game is playable at `http://localhost:5173/`. Full core loop:
- Pick a zone (6 zones, 3 regions), set tier (T1-T5), choose gathering focus
- Start idle run — **live loot feed** shows drops in real-time as clears happen
- Collect loot — items, currency, materials, XP, gold added to inventory
- Equip items — **gear directly affects clear speed** (user confirmed this feels great)
- Craft items — all 8 currencies work (Transmute, Augment, Chaos, Alchemy, Divine, Annul, Exalt, Regal)
- Disenchant junk for currency shards
- Save persists in localStorage (auto-save)

## UI State
- **Zones tab**: Zone grid, tier selector, gathering focus with descriptions/tooltips, progress bar, live loot feed, collect button
- **Loot tab ("Bags")**: 3-column item grid, click-to-expand detail panel, equipped gear compact row at top, filter by slot, sort by power/rarity/iLvl
- **Craft tab**: Currency selector with counts, item selector, craft button, result display
- **Hero tab**: Paper doll equipment layout (weapon/chest/ring/boots), full stats grid, materials list, XP bar, reset button

## Known Issues / User Feedback (TO ADDRESS NEXT SESSION)
The user said "I notice a few things we need to change/modify" but did not specify what yet. **Ask the user what they want to change at the start of the next session.**

## What Has NOT Been Built Yet (from GDD MVP scope)
- [ ] Class selection (GDD Section 3) — currently everyone is a generic "Exile"
- [ ] Abilities system (4 slots, mutators, synergies)
- [ ] Talent tree (30-50 nodes per class)
- [ ] Profession crafting Track B (patterns, materials, profession leveling)
- [ ] Specialization system (one per character)
- [ ] More zones (GDD targets 18-20, we have 6)
- [ ] More item bases and affix variety
- [ ] Offline progression (calculate loot when app reopens)
- [ ] Zone familiarity passive
- [ ] Material deconstruction
- [ ] Active play / ability button (user requested this)

## How to Run
```bash
cd /home/jerris/idle-exile
npx vite --host
# Open http://localhost:5173/
```

## Tech Stack
- Node 18 / TypeScript 5.6
- React 18 + Vite 5
- Zustand 5 (state management + localStorage persistence)
- Tailwind CSS 3
- No backend (client-only)

## Architecture
```
src/
  types/index.ts         — All TypeScript interfaces
  data/
    affixes.ts           — 12 affix definitions (6 prefix, 6 suffix, T1-T3)
    zones.ts             — 6 zones across 3 regions
    items.ts             — 12 item bases + 8 currency definitions
  engine/                — Pure TypeScript (no React)
    items.ts             — Item generation, affix rolling, power calc
    zones.ts             — Clear speed calc, idle simulation
    character.ts         — Stats resolution, XP/leveling
    crafting.ts          — All 8 currency crafting operations
  store/
    gameStore.ts         — Zustand store (state + actions + persistence)
  ui/
    components/
      ItemCard.tsx       — Item display with affixes & tiers
      NavBar.tsx         — Bottom navigation (Zones/Loot/Craft/Hero)
      TopBar.tsx         — Character info, XP bar, currency counts
    screens/
      ZoneScreen.tsx     — Zone selection, idle runs, live loot feed
      InventoryScreen.tsx — Bag grid + equipped gear + detail panel
      CraftingScreen.tsx — Currency crafting interface
      CharacterScreen.tsx — Paper doll, stats, materials
  App.tsx               — Main app shell with tab routing
  main.tsx              — Entry point
  index.css             — Tailwind directives + base styles
```

## Key Engine Details (for context when coding)
- **Item generation**: `generateItem(slot, iLvl, forcedRarity?)` in `engine/items.ts`
- **Affix rolling**: Weighted selection, T3 (weight 60), T2 (weight 30, iLvl>=10), T1 (weight 10, iLvl>=20)
- **Clear speed**: `charPower / zoneDifficulty` formula. Power = `damage * (1 + atkSpd/100) * (1 + critChance/100 * critDmg/100)`
- **Idle sim**: `simulateIdleRun()` runs per-clear loop with RNG drops
- **Crafting**: `applyCurrency(item, type)` returns new item (immutable)
- **Stats**: `resolveStats(char)` aggregates base + level + gear + affixes, applies % multipliers last

## Key Decisions Made
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-23 | Browser-first (PWA later) | Fastest iteration, zero code change to convert |
| 2026-02-23 | Tailwind CSS v3 (not v4) | Node 18 compatibility |
| 2026-02-23 | Engine/UI separation | Engines testable without React, portable |
| 2026-02-23 | Placeholder art (emoji) | Gameplay first, skin later |
| 2026-02-23 | Zustand + localStorage | Simple persistence, no backend needed yet |

## Git Log
```
88cabde UI overhaul: live loot feed, paper doll, bag grid, focus descriptions
<hash>  Playable prototype: core idle loop + crafting + UI
<hash>  Initial project scaffold: Vite + React + TS + Zustand + Tailwind
```

## Docs Index
- `docs/PROJECT_STATUS.md` — THIS FILE (read first)
- `docs/SPRINT_PLAN.md` — Full 12-sprint development roadmap
- `docs/ARCHITECTURE.md` — Tech decisions, directory structure, engine interfaces
- `docs/AGENT_STRATEGY.md` — How to use Claude agents for tasks
- `docs/idle-exile-gdd.docx` — Game Design Document v1.0 (source of truth)

## Priority for Next Session
1. Ask user what specific changes they noticed during playtesting
2. Address those fixes
3. Then move to class system + abilities (biggest missing feature)

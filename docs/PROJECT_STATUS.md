# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-23

## Current Phase
**Phase 1: Playable Prototype** — Core loop working.

## Current Sprint
**Sprint 0: Foundation** — COMPLETE. Prototype playable.

## What Was Last Completed
- [x] Game Design Document v1.0 finalized
- [x] Project directory structure created
- [x] Development process & sprint plan documented
- [x] Vite + React + TypeScript + Zustand + Tailwind CSS v3 project
- [x] Core types (Item, Affix, Character, Zone, Currency)
- [x] Game data (12 affixes, 6 zones, 12 item bases, 8 currencies)
- [x] Item generation engine (affix rolling, tier weighting, rarity)
- [x] Zone & idle simulation engine (clear speed, loot drops)
- [x] Character stats engine (equipment aggregation, level-ups)
- [x] Currency crafting engine (all 8 currencies working)
- [x] Zustand store with localStorage persistence
- [x] UI: Zone screen, Inventory, Crafting bench, Character sheet
- [x] Git initialized, initial commits made

## What Is In Progress
- [ ] Playtesting & balancing the prototype
- [ ] Bug fixes from initial testing

## What Is Blocked
- Nothing

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
- No backend (client-only for now)

## Architecture
- `src/engine/` — Pure TypeScript game logic (no React)
- `src/data/` — Static game data (affixes, zones, items, currencies)
- `src/types/` — Shared TypeScript interfaces
- `src/store/` — Zustand store (bridges engine to UI)
- `src/ui/` — React components and screens

## Key Decisions Made
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-23 | Browser-first (PWA later) | Fastest iteration, zero code change to convert |
| 2026-02-23 | Tailwind CSS v3 (not v4) | Node 18 compatibility |
| 2026-02-23 | Engine/UI separation | Engines testable without React, portable |
| 2026-02-23 | Placeholder art (emoji) | Gameplay first, skin later |

## Next Steps (Priority Order)
1. Playtest & fix any bugs in the core loop
2. Balance: clear times, drop rates, XP curve
3. Add more item bases and affix variety
4. Profession crafting (Track B)
5. Talent tree
6. Visual polish (icons, animations, sound)

## File Index
```
idle-exile/
  docs/
    PROJECT_STATUS.md      ← THIS FILE
    SPRINT_PLAN.md         ← Development roadmap
    ARCHITECTURE.md        ← Tech decisions
    AGENT_STRATEGY.md      ← How we use Claude agents
    idle-exile-gdd.docx    ← Game Design Document (source of truth)
  src/
    types/index.ts         ← All TypeScript interfaces
    data/
      affixes.ts           ← 12 affix definitions (6 prefix, 6 suffix)
      zones.ts             ← 6 zones across 3 regions
      items.ts             ← 12 item bases + 8 currency definitions
    engine/
      items.ts             ← Item generation, affix rolling
      zones.ts             ← Clear speed calc, idle simulation
      character.ts         ← Stats resolution, XP/leveling
      crafting.ts          ← All 8 currency crafting operations
    store/
      gameStore.ts         ← Zustand store (state + actions)
    ui/
      components/
        ItemCard.tsx        ← Item display with affixes & tiers
        NavBar.tsx          ← Bottom navigation tabs
        TopBar.tsx          ← Character info, XP bar, currencies
      screens/
        ZoneScreen.tsx      ← Zone selection, idle runs, loot collection
        InventoryScreen.tsx ← Equipment + inventory management
        CraftingScreen.tsx  ← Currency crafting interface
        CharacterScreen.tsx ← Stats, materials, reset
    App.tsx                ← Main app shell
    main.tsx               ← Entry point
    index.css              ← Tailwind + base styles
```

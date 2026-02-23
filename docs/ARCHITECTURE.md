# Idle Exile — Architecture & Technical Decisions

## Tech Stack (Proposed)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript | Type safety critical for complex game data |
| Framework | React 18+ | Component model fits UI-heavy game, huge ecosystem |
| Build | Vite | Fast dev server, HMR, modern defaults |
| State | Zustand | Lightweight, no boilerplate, supports persistence middleware |
| Routing | React Router v6 | Standard, simple |
| Testing | Vitest | Fast, Vite-native, Jest-compatible API |
| Styling | TBD | Tailwind CSS or CSS Modules (decide Sprint 7) |
| Mobile | PWA first | Service worker + manifest, installable, offline-capable |

## Architecture Principles

### 1. Engine / UI Separation
The game logic (engines) is **completely independent** of React. All engines are pure TypeScript functions/classes with zero React imports. This means:
- Engines are testable without any UI framework
- Engines can be reused if we ever port to React Native or another framework
- UI components simply call engine functions and display results

```
src/
  engine/          ← Pure TypeScript, zero React
    items/         ← Item generation, affix rolling
    zones/         ← Zone data, clear speed calc, idle sim
    character/     ← Stats, abilities, talents, leveling
    crafting/      ← Currency crafting (Track A)
    professions/   ← Profession crafting (Track B)
    specialization/← Spec trees, crafting mechanics
    save/          ← Serialization, offline calc
  ui/              ← React components
    components/    ← Reusable UI components
    screens/       ← Full-page screen components
    hooks/         ← Custom React hooks
    store/         ← Zustand stores (thin wrappers around engine)
  data/            ← Static game data (JSON/TS)
    affixes/       ← Affix definitions, tier tables
    zones/         ← Zone definitions, material tables
    classes/       ← Class definitions, ability data
    items/         ← Base type definitions
    professions/   ← Profession recipes, spec trees
    currencies/    ← Currency definitions
  types/           ← Shared TypeScript interfaces
```

### 2. Data-Driven Design
All game content lives in data files, not hardcoded in logic:
- Affix pools, tier ranges, weights → JSON/TS data files
- Zone definitions, material tables → JSON/TS data files
- Class stats, ability definitions → JSON/TS data files
- Currency behaviors are the exception (logic, not data)

This means balancing can happen by editing data files without touching engine code.

### 3. Deterministic RNG
All randomness uses a seeded PRNG (e.g., `mulberry32` or similar). Benefits:
- Reproducible for testing ("this seed should produce this item")
- Enables replay/debug of crafting outcomes
- Required for fair multiplayer (future)

### 4. Immutable State Updates
All engine functions return new objects, never mutate inputs:
```typescript
// Good: returns new item
function applyChaos(item: Item): Item { ... }

// Bad: mutates item in place
function applyChaos(item: Item): void { ... }
```
This makes undo/redo trivial and prevents subtle bugs.

### 5. Save System Architecture
- **Primary:** localStorage (JSON serialization of game state)
- **Auto-save:** On every meaningful state change (equip, craft, zone start)
- **Offline calc:** On app open, compute `Date.now() - lastSaveTimestamp` and run idle simulation for that duration
- **Future:** Cloud save via backend API (when multiplayer/trading is added)
- **Migration:** Save format includes a version number; migrations transform old saves to new format

## Key Engine Interfaces (Preview)

```typescript
// Core item generation
generateItem(params: ItemGenParams): Item
rollAffixes(pool: AffixPool, count: number, iLvl: number): Affix[]

// Idle simulation
simulateIdleRun(char: Character, zone: Zone, tier: number, focus: GatheringFocus, duration: number): IdleResults

// Clear speed
calcClearTime(char: Character, zone: Zone, tier: number): number // seconds

// Currency crafting
applyCurrency(item: Item, currency: CurrencyType, options?: CraftOptions): CraftResult

// Profession crafting
professionCraft(char: Character, pattern: Pattern, materials: MaterialSet): CraftResult

// Character stats
calcTotalStats(char: Character): ResolvedStats
```

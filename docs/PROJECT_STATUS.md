# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-24

## Current Phase
**Phase 1: Foundation Engine Rework** — COMPLETE. All 6 implementation steps done, build passes, ready for playtesting.

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
- Abilities system (4 slots, mutators)
- Focus modes (combat/harvesting/prospecting/scavenging)
- Tier selector (T1–T5 level-gated)
- 3 old currencies (transmute, alchemy, regal)
- CraftingScreen (separate tab)

**6 active currencies:** augment, chaos, divine, annul, exalt, socket (50 each at start)

## What Is Working Right Now
The game is playable at `http://localhost:5173/`. Core loop:
- Pick a zone from 30 zones grouped by 6 bands
- Start idle run — items drop with 2–6 affixes, rarity based on affix quality
- Collect loot, equip items, craft with 6 currencies
- Auto-salvage filters items below chosen rarity threshold
- Band 3+ zones have hazard warnings requiring specific resists
- Mastery badge when all zone thresholds met

## UI State (3 Tabs)
- **Zones tab**: 30 zones in 6 band groups, hazard indicators, mastery badges, progress bar, loot feed
- **Inventory tab ("Bags")**: Two-panel layout with equipped gear + bag grid. Crafting UI built in (currency selector + apply). Auto-salvage filter. 5-tier rarity colors.
- **Character tab ("Hero")**: Paper doll (16 gear slots), 13 stats including poison/chaos resist, materials list

All 3 screens stay mounted (CSS hidden) for state persistence across tab switches.

## 16 Gear Slots (WoW-style)
Left: helmet, neck, shoulders, cloak, chest, bracers
Right: gloves, belt, pants, boots, ring1, ring2
Bottom: mainhand, offhand, trinket1, trinket2

296 item bases defined across 15 slots (no trinket bases yet).

## Engine Details
- **Rarity**: Common (2 affixes, T7+), Uncommon (3, T4-T6), Rare (4, T3), Epic (5, T2), Legendary (6, T1+/2×T2)
- **Affix tiers**: T1 (best) through T10 (worst), weighted drop rates favor lower tiers
- **Clear speed**: `charPower / (zoneDifficulty * bandMultiplier)`. Power = `damage * (1 + atkSpd/100) * (1 + critChance/100 * critDmg/100)`
- **Hazards**: Zone hazard type + threshold. Penalty applied if resist < threshold.
- **Mastery**: All hazard thresholds met = mastery badge (binary check)
- **Crafting**: `applyCurrency(item, type)` — augment (add affix), chaos (remove+add), divine (reroll values), annul (remove), exalt (add T1-T3)
- **Stats**: `resolveStats(char)` aggregates base + level + gear + affixes, applies % multipliers last
- **Set bonuses**: 4 armor sets with 2/4/6-piece thresholds
- **Save**: Zustand persist v6, migrates by wiping old save data

## Architecture
```
src/
  types/index.ts            — All TypeScript interfaces (GearSlot, ZoneDef, AffixDef, etc.)
  data/
    affixes.ts              — 15 affix definitions (7 prefix, 8 suffix, T1-T10)
    zones.ts                — 30 zones across 6 bands, hazard definitions
    items.ts                — 296 item bases (15 slots) + 6 currency definitions
    classes.ts              — Class definitions (placeholder for future)
    setBonuses.ts           — 4 armor-type set bonus definitions
  engine/                   — Pure TypeScript (no React)
    items.ts                — Item generation, affix rolling, rarity classification
    zones.ts                — Clear speed calc, idle simulation, hazards, mastery
    character.ts            — Stats resolution (13 stats), XP/leveling
    crafting.ts             — 6 currency crafting operations
    setBonus.ts             — Set bonus resolution
  store/
    gameStore.ts            — Zustand store (state + actions + persistence + v6 migration)
  ui/
    slotConfig.ts           — Shared gear slot icons/labels for all 16 slots
    components/
      ItemCard.tsx          — Item display with T1-T10 affix colors + 5-tier rarity
      MiniPaperDoll.tsx     — Compact equipped gear grid
      NavBar.tsx            — Bottom navigation (Zones/Bags/Hero — 3 tabs)
      TopBar.tsx            — Character info, XP bar, currency counts
    screens/
      ZoneScreen.tsx        — Zone selection by band, hazards, mastery, idle runs
      InventoryScreen.tsx   — Bag grid + crafting UI + auto-salvage + detail panel
      CharacterScreen.tsx   — Paper doll (16 slots), 13 stats, materials
  App.tsx                   — Main app shell with CSS-hidden tab routing (3 tabs)
  main.tsx                  — Entry point
  index.css                 — Tailwind directives + base styles
```

## Known Issues / Next Iteration TODO
- [ ] Socket currency not yet implemented (defined but no crafting logic)
- [ ] No trinket item bases (trinket1/trinket2 slots empty)
- [ ] No offline progression (calculate loot when app reopens)
- [ ] Class selection not implemented (everyone is generic "Exile")
- [ ] Talent tree not built
- [ ] Set bonus UI not shown on character screen
- [ ] Active play / ability buttons not implemented
- [ ] Zone familiarity passive not implemented

## What Has NOT Been Built Yet (from GDD MVP scope)
- [ ] Class selection (GDD Section 3)
- [ ] Abilities system (simplified from original — GDD still references it)
- [ ] Talent tree (30-50 nodes per class)
- [ ] Profession crafting Track B (patterns, materials, profession leveling)
- [ ] Specialization system (one per character)
- [ ] Offline progression
- [ ] Socket crafting logic
- [ ] More affix variety (slot-specific affixes)

## How to Run
```bash
cd /home/jerris/idle-exile
npx vite --host
# Open http://localhost:5173/
```

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
| 2026-02-24 | Phase 1 Foundation rework | Align engine with updated GDD: 30 zones, T1-T10, 5 rarities, hazards |
| 2026-02-24 | Merge crafting into Inventory tab | Reduces tabs from 4→3, crafting more accessible |
| 2026-02-24 | Save v6 wipe migration | Too many schema changes to migrate incrementally |

## Priority for Next Session
1. Playtest the Phase 1 build — verify all systems work end-to-end
2. Socket currency crafting logic
3. Offline progression (makes it a real idle game)
4. Class selection + basic talent tree

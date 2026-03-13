# Plan: Crafting Workbench UI Overhaul

## Context

The crafting system has a complete backend (gathering, refinement, recipes, catalysts, patterns, profession gear) but the UI is a mess: 5 separate tabs, no tooltips, recipe bloat, no material source guidance, too many clicks, and no compelling reason to craft. Players can progress through the entire campaign just equipping drops.

**Goal:** Replace the 5-tab crafting screen with a single unified "Workbench" organized by player goal ("I want a helmet") not system ("click Refine tab, then Craft tab"). Engine code stays untouched — this is a pure UI overhaul.

**Icon status:** 32/122 crafting_v2 icons generated (26% complete). Not a blocker — `CraftIcon` already has emoji fallbacks. Icons can be completed and dropped in later.

---

## Architecture Overview

### Current Flow (5 tabs)
```
CraftingScreen.tsx
  ├── MaterialsPanel    (inventory browser)
  ├── RefinePanel        (track-based refinement)
  ├── PatternPanel       (pattern crafting)
  ├── CraftPanel         (profession → category → recipe)
  └── ProfessionGearPanel (profession equipment)
```

### New Flow (unified workbench)
```
CraftingScreen.tsx (workbench)
  ├── SlotPicker          (NEW: visual grid of equipment slots)
  ├── WorkbenchRecipeList (NEW: smart-sorted recipes for selected slot)
  │   └── WorkbenchRecipeCard (NEW: self-contained recipe with inline refine + catalyst toggles)
  ├── CraftOutputPanel    (KEEP: output buffer at bottom)
  ├── CraftLog            (KEEP: recent craft history)
  └── Secondary panels (accessible via icon buttons, not tabs):
      ├── MaterialsPanel  (KEEP: opens as overlay/drawer)
      ├── RefinePanel      (KEEP: opens as overlay/drawer for batch refining)
      └── ProfessionGearPanel (KEEP: opens as overlay/drawer)
```

PatternPanel merges into the recipe list — pattern recipes appear in a **pinned "Patterns" section** at the top of the recipe list for the selected slot, with distinct visual treatment (charges, guaranteed affixes). If no patterns exist for a slot, the section doesn't render.

---

## Step-by-Step Implementation

### Step 1: New `SlotPicker` component

**File:** `src/ui/crafting/SlotPicker.tsx` (NEW)

A compact visual grid of **individual** equipment slots grouped by section headers. All slots visible at once — no nesting or sub-menus.

**Layout (~20 buttons in a responsive grid with section labels):**
```
Weapons:    [⚔️Sword] [🗡️Dagger] [🪓Axe] [🔨Mace] [🏹Bow] [🎯Xbow] [🪄Wand] [📖Staff]
Defense:    [🛡️Shield] [⛑️Helm] [👕Chest] [🧤Gloves] [👖Pants] [👢Boots] [🧥Cloak] [🙇Shoulders]
Accessory:  [💍Ring] [🧿Neck] [🔲Belt] [✨Trinket]
Other:      [⚗️Catalysts]
```

Each button is a small square (~40-48px) with icon + tiny label. On mobile: wraps to 4-5 per row. On desktop: fits in 2-3 rows.

**Behavior:**
- Click a slot → filters recipes to only that slot's output
- Auto-detects which profession(s) can craft for that slot
- Shows profession XP bar for the relevant profession
- Selected slot gets highlighted border (yellow/amber glow)
- "All" button at the start to show everything (default on first load)

**Data flow:** Map slot → profession using existing `ITEM_BASE_DEFS` (each base has a `slot` field) + `getRecipesForProfession()`. Build a reverse lookup: `slot → CraftingRecipeDef[]` across all professions.

### Step 2: New `WorkbenchRecipeCard` component

**File:** `src/ui/crafting/WorkbenchRecipeCard.tsx` (NEW)

Replaces the current expandable recipe cards in CraftPanel. Each card is self-contained — no tab-hopping needed.

**Layout (always expanded, no collapse):**
```
┌─────────────────────────────────────────────────────┐
│ [SlotIcon] Recipe Name          T3  Lv.30  [Craft] │
│─────────────────────────────────────────────────────│
│ Materials:                                          │
│ [icon] Ferrite Ingot 2/3  ← "Mining → Refine"  [Refine] │
│ [icon] Cured Hide    1/2  ← "Skinning Lv.15"        │
│ [icon] Gold          150/150  ✓                      │
│─────────────────────────────────────────────────────│
│ Catalysts (optional):                               │
│ [toggle] Whetstone → +Flat Phys Damage  (have 3)   │
│ [toggle] Polished Gem → Rare+, T3 boosted (have 1) │
│─────────────────────────────────────────────────────│
│                              [Craft 1x] [Craft All] │
└─────────────────────────────────────────────────────┘
```

**Key features:**

1. **Material source tags:** Each material shows where it comes from:
   - Refined materials: "Mine → Refine" or "Log → Refine" (gathering profession + refinement)
   - Raw materials: zone name(s) from `materialToZones` map in `craftingHelpers.ts`
   - Rare materials: profession + rarity tier
   - Click material name → opens MaterialDetailModal (existing)

2. **Inline refine button:** If a material is a refined resource and the player has raw materials but not enough refined, show a "Refine" button right on the material line. Clicking it calls `refineMaterial()` / `refineMaterialBatch()` directly — no tab switch needed. Uses existing engine function from `src/engine/refinement.ts`.

3. **Catalyst toggles (not dropdowns):** Replace the current opaque dropdowns with:
   - **Affix catalysts:** Simple toggle buttons showing the catalyst name + what affix it guarantees + count owned. Tooltip explains the effect in plain English.
   - **Rare material catalysts:** Toggle buttons showing name + "Guarantees [Rarity]+ quality, best affix T[X]" + count owned. Color-coded by rarity.
   - Only show catalysts the player actually owns (count > 0)
   - Only one of each type can be active (radio-button behavior)

4. **Smart status indicator:**
   - Green border + "Craft" enabled: all materials + level met
   - Yellow border: level met but missing some materials (show which)
   - Gray/locked: level not met (show "Requires Lv.X")

### Step 3: Smart recipe sorting & bloat fix

**In `WorkbenchRecipeList`** (part of the workbench, not a separate file — can be a section of the rewritten `CraftingScreen.tsx`):

**Sort order:**
1. **Craftable NOW** — have all materials + level (green cards, full opacity)
2. **Close to craftable** — level met, missing 1-2 materials (yellow cards, slight dim)
3. **Locked** — level not met (collapsed/hidden by default, "Show locked recipes" toggle)

**Bloat reduction:**
- For each weapon/armor type within a slot, show the **highest tier the player can craft** prominently
- Lower tiers collapse into a "Show lower tiers" accordion
- If player is level 45, don't show T1-T2 recipes expanded by default

**Pattern recipes (pinned section):**
- Pattern-based recipes (from `craftingPatterns.ts`) appear in a **dedicated "Patterns" section pinned above normal recipes**
- Each pattern card shows: name, charges remaining, guaranteed affixes, material cost, "Pattern" badge with distinct border color (gold/yellow)
- Only shows patterns relevant to the selected slot
- If player has 0 patterns for the slot, section doesn't render
- Patterns feel premium and distinct from normal crafting

### Step 4: Rewrite `CraftingScreen.tsx`

**File:** `src/ui/screens/CraftingScreen.tsx` (MODIFY)

Replace the 5-tab system with the unified workbench layout:

```
┌──────────────────────────────────────────────────┐
│ Crafting Workbench          [Bag] [Refine] [Gear]│  ← secondary panel buttons
│──────────────────────────────────────────────────│
│ [SlotPicker: grid of slot icons]                 │
│──────────────────────────────────────────────────│
│ [XpBar: auto-detected profession]                │
│ [Search bar] [Craftable only toggle]             │
│──────────────────────────────────────────────────│
│ [WorkbenchRecipeCard]                            │
│ [WorkbenchRecipeCard]                            │
│ [WorkbenchRecipeCard]                            │
│ ...                                              │
│──────────────────────────────────────────────────│
│ [CraftOutputPanel]                               │
│ [CraftLog]                                       │
└──────────────────────────────────────────────────┘
```

**Secondary panel buttons** (top-right, small icon buttons):
- **Bag** (backpack icon): Opens MaterialsPanel as a slide-over drawer/modal
- **Refine** (anvil icon): Opens RefinePanel as a slide-over for batch refinement
- **Gear** (gear icon): Opens ProfessionGearPanel as a slide-over

These keep access to the full material inventory, batch refinement, and profession gear without cluttering the main workbench. The existing panel components (`MaterialsPanel`, `RefinePanel`, `ProfessionGearPanel`) are reused inside drawers — minimal changes needed.

### Step 5: Build slot-to-recipe mapping utility

**File:** `src/ui/crafting/craftingHelpers.ts` (MODIFY — add utility functions)

Add a function to build a reverse lookup from equipment slots to recipes across all professions:

```typescript
/** Build slot → recipes map across all professions */
export function getRecipesBySlot(): Map<string, CraftingRecipeDef[]>

/** Get the profession for a recipe */
export function getProfessionForSlot(slot: string): CraftingProfession

/** Get inline refinement availability for a material */
export function getInlineRefineInfo(materialId: string, playerMaterials: Record<string, number>): {
  canRefine: boolean;
  rawMaterialId: string;
  rawHave: number;
  rawNeed: number;
  recipeId: string;
} | null
```

These utilities power the slot picker and inline refine buttons without duplicating logic.

### Step 6: Drawer/overlay wrapper component

**File:** `src/ui/crafting/CraftingDrawer.tsx` (NEW)

A simple slide-over drawer component to wrap existing panels:

```typescript
interface CraftingDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
```

Slides in from the right, dark overlay behind it, close button. Reusable for Bag/Refine/Gear secondary panels.

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/ui/screens/CraftingScreen.tsx` | **REWRITE** | Replace 5-tab system with workbench layout |
| `src/ui/crafting/SlotPicker.tsx` | **NEW** | Slot selection grid |
| `src/ui/crafting/WorkbenchRecipeCard.tsx` | **NEW** | Self-contained recipe card with inline refine + catalyst toggles |
| `src/ui/crafting/CraftingDrawer.tsx` | **NEW** | Slide-over drawer for secondary panels |
| `src/ui/crafting/craftingHelpers.ts` | **MODIFY** | Add slot→recipe mapping, inline refine helpers |
| `src/ui/crafting/CraftPanel.tsx` | **KEEP (unused)** | Don't delete yet — keep as reference until workbench is validated |
| `src/ui/crafting/MaterialsPanel.tsx` | **KEEP** | Reused inside drawer |
| `src/ui/crafting/RefinePanel.tsx` | **KEEP** | Reused inside drawer |
| `src/ui/crafting/ProfessionGearPanel.tsx` | **KEEP** | Reused inside drawer |
| `src/ui/crafting/PatternPanel.tsx` | **KEEP (unused)** | Pattern recipes absorbed into recipe list |
| `src/ui/crafting/MaterialPill.tsx` | **KEEP** | Reused in recipe cards |
| `src/ui/crafting/CraftOutputPanel.tsx` | **KEEP** | Reused at bottom of workbench |
| `src/ui/crafting/CraftLog.tsx` | **KEEP** | Reused at bottom of workbench |
| `src/ui/crafting/XpBar.tsx` | **KEEP** | Reused for auto-detected profession |
| `src/ui/craftIcon.tsx` | **KEEP** | No changes needed |

## Existing Functions to Reuse (Engine — NO changes)

| Function | Location | Purpose |
|----------|----------|---------|
| `getRecipesForProfession()` | `src/data/craftingRecipes.ts` | Load recipes by profession |
| `canCraftRecipe()` | `src/engine/craftingProfessions.ts` | Check if recipe is craftable |
| `craftRecipe()` | `src/store/craftingStore.ts` | Single craft action |
| `craftRecipeBatch()` | `src/store/craftingStore.ts` | Batch craft action |
| `refineMaterial()` | `src/store/craftingStore.ts` | Single refine action |
| `refineMaterialBatch()` | `src/store/craftingStore.ts` | Batch refine action |
| `getRefinementChain()` | `src/data/refinement.ts` | Get refinement chain for inline refine |
| `materialToZones` | `src/ui/crafting/craftingHelpers.ts` | Material source zone lookup |
| `resolveMaterialMeta()` | `src/ui/craftIcon.tsx` | Material display metadata |
| `CATALYST_RARITY_MAP` | `src/data/balance.ts` | Catalyst rarity → output rarity |
| `CATALYST_BEST_TIER` | `src/data/balance.ts` | Catalyst rarity → best affix tier |

---

## Verification

1. **Build check:** `npm run build` — must pass with zero errors after each step
2. **Visual smoke test:** Open crafting screen in browser:
   - Slot picker renders with all equipment categories
   - Clicking a slot filters recipes correctly
   - Profession XP bar auto-updates to match slot's profession
   - Recipe cards show materials with source tags
   - Inline refine button works (refine a material without leaving the screen)
   - Catalyst toggles work and show explanatory tooltips
   - Craft 1x / Craft All work, output appears in buffer
   - Secondary drawers (Bag, Refine, Gear) open and close cleanly
3. **Recipe sorting:** Craftable recipes appear first, locked recipes hidden by default
4. **Pattern integration:** Pattern recipes appear alongside normal recipes with "Pattern" badge
5. **No engine changes:** Verify no files in `src/engine/` or `src/data/` were modified
6. **Mobile responsive:** Test on narrow viewport — slot picker wraps, cards stack, drawers work

---

## Build Order

1. **Step 5** — Helper utilities first (slot mapping, inline refine info)
2. **Step 6** — CraftingDrawer component (simple, needed by Step 4)
3. **Step 1** — SlotPicker component
4. **Step 2** — WorkbenchRecipeCard component (biggest piece)
5. **Step 4** — Rewrite CraftingScreen to wire everything together
6. **Step 3** — Smart sorting tuning (can iterate after seeing real data)

Each step gets a `npm run build` check before proceeding to the next.

# Talent & Combat Readability Overhaul

## Context

After completing the Dagger Rework Phase 2 (all 273 talent nodes differentiated), playtesting with a full venom build + 4 skills reveals:
1. **Combat is overwhelming** — procs, buffs, debuffs, shatters, and spreads fire constantly but the UI shows little of what's actually happening
2. **Talent descriptions are unreadable** — heavy abbreviations (wpn, pen, CD, ICD, R2:), undefined status effects, missing trigger context
3. **Buff/debuff displays lack explanation** — pills show names/duration but don't explain effects
4. **No visual feedback on skill icons** — CD resets, proc triggers, and state changes aren't reflected on the skill bar

**Key discovery:** "On kill" talent procs are **per-skill** (only the skill that kills triggers its own procs). Descriptions should clarify this.

**User preferences:**
- Descriptions: Expanded shorthand (fix abbreviations) + tooltip hovers on stats like "weapon mastery" to explain what they do
- Combat log: Key events (poison burst, shatters, spreads) should be visible. Not every proc needs a log line — use skill icon visual feedback (glows, pulses) for frequent events like CD resets. Prioritize extremely clear UI.
- Buff descriptions: Tooltip on hover/tap is sufficient (no always-visible text needed)

**IMPORTANT: Execute ONE sprint per session.** Each sprint is a self-contained unit of work. Do not attempt multiple sprints in a single context window. After completing a sprint, commit, push, and update the sprint status checkboxes below.

### Sprint Status
- [x] **Sprint 1**: Combat Event System — engine enrichment + combat log + skill icon feedback
- [x] **Sprint 2**: Buff/Debuff Tooltips + Stat Glossary tooltips in talent tree
- [ ] **Sprint 3**: Talent Description Rewrite (all 273 dagger nodes)

---

## How to Resume

**At the start of each session:**
1. Read `docs/READABILITY_OVERHAUL_PLAN.md`
2. Check which sprint is next (first unchecked checkbox)
3. Execute ONLY that sprint
4. On completion: `npm run build`, commit, push, mark checkbox as complete

---

## Sprint 1: Combat Event System

**Goal:** Make combat events visible through a combination of enriched combat log entries and skill icon visual feedback.

### Part A: Engine — Enrich CombatTickResult

**File:** `src/types/combat.ts`

Add new fields to `CombatTickResult` (keep existing fields for backward compat):

```typescript
// NEW — structured event data
procEvents?: Array<{
  procId: string;           // e.g. 'st_venomburst'
  label: string;            // e.g. 'Venom Burst'
  damage: number;           // bonus damage (0 if non-damage proc)
  sourceSkillId: string;    // which skill triggered it
  type: 'damage' | 'buff' | 'debuff' | 'heal' | 'cdReset' | 'cast';
}>;
spreadEvents?: Array<{
  debuffId: string;         // e.g. 'poisoned'
  stacks: number;           // how many stacks spread
}>;
cooldownResets?: string[];  // skill IDs that had CD reset (replaces boolean)
```

Keep `procDamage`/`procLabel`/`cooldownWasReset`/`didSpreadDebuffs` populated for backward compat until UI is fully migrated.

**File:** `src/engine/combat/tick.ts`

Build the new event arrays in result construction.

**File:** `src/engine/combat/helpers.ts`

Modify `spreadDebuffsToTarget()` to return spread details instead of boolean.

### Part B: Combat Log — Key Events

Expand log entry types and process `procEvents` array for rich display.

### Part C: Skill Icon Visual Feedback

Targeted CD reset flash (only the specific skill) + proc flash animation.

### Part D: BUFF_DISPLAY Expansion

Add all ~50+ buff ID mappings for all 7 skill prefixes.

---

## Sprint 2: Buff/Debuff Tooltips + Stat Glossary

**Goal:** Every buff pill, debuff badge, and stat reference understandable by a casual player via tooltips.

### Part A: Debuff Tooltip Enhancement
Add `fullName` and `description` to `DEBUFF_META` in zoneConstants.ts. Enhance DebuffBadge tooltips.

### Part B: Buff Tooltip Enhancement
Add `description` field to `BUFF_DISPLAY`. Wrap buff pills in Tooltip component.

### Part C: Stat Glossary for Talent Tree
Create `STAT_GLOSSARY` map. Add `StatTerm` tooltip component. Wrap recognized stat terms in talent descriptions.

---

## Sprint 3: Talent Description Rewrite

**Goal:** All 273 dagger talent node descriptions readable without abbreviations.

**File:** `src/data/skillGraphs/dagger_talents.ts` (only file modified)

### Rewrite Rules
- Expand all abbreviations (wpn→weapon, pen→penetration, CD→cooldown, etc.)
- Clarify per-skill triggers (On kill→When this skill kills)
- Rank format: R2:→Rank 2:
- Buff/debuff references: In Predator:→While Predator is active:

Work skill-by-skill: Stab → Blade Flurry → Frost Fan → Viper Strike → Shadow Step → Assassinate → Lightning Lunge

---

## Critical Files

| File | Sprint | Changes |
|------|--------|---------|
| `src/types/combat.ts` | 1 | Add procEvents, spreadEvents, cooldownResets to CombatTickResult |
| `src/engine/combat/tick.ts` | 1 | Build new event arrays in result construction |
| `src/engine/combat/helpers.ts` | 1 | spreadDebuffsToTarget returns details instead of boolean |
| `src/ui/zones/CombatPanel.tsx` | 1, 2 | New log types, proc source display, BUFF_DISPLAY expansion + tooltips |
| `src/ui/components/SkillBar.tsx` | 1 | Targeted CD reset flash, proc flash on source skill icon |
| `src/ui/zones/DebuffBadge.tsx` | 2 | Enhanced tooltips with full description |
| `src/ui/zones/zoneConstants.ts` | 2 | fullName + description in DEBUFF_META |
| `src/ui/components/TalentTreeView.tsx` | 2 | STAT_GLOSSARY + StatTerm tooltip component |
| `src/data/skillGraphs/dagger_talents.ts` | 3 | Rewrite all 273 description strings |

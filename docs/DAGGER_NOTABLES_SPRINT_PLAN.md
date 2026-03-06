# Dagger Notables/Keystones Sprint Plan

## Overview
Replace 126 shared notables/keystones with unique per-skill versions from JSON design docs.
Also verify/fix Stab to match its JSON spec.

## Sprint Breakdown

### Sprint 1: Stab + Blade Flurry + Frost Fan (54 nodes) ← START HERE
- Stab: Verify/fix 18 notables/keystones to match stab.json
- Blade Flurry: Replace 18 notables/keystones from blade-flurry.json (lines 311-582)
- Frost Fan: Replace 18 notables/keystones from frost-fan.json (lines 588-856)
- Save migration v43 → v44 (reset dagger allocatedRanks)
- Update header comment

### Sprint 2: Viper Strike + Shadow Step (36 nodes)
- Viper Strike: Replace 18 from viper-strike.json (lines 862-1137)
- Shadow Step: Replace 18 from shadow-step.json (lines 1138-1414)

### Sprint 3: Assassinate + Lightning Lunge (36 nodes)
- Assassinate: Replace 18 from assassinate.json (lines 1415-1694)
- Lightning Lunge: Replace 18 from lightning-lunge.json (lines 1695+)

## Key Files
- `src/data/skillGraphs/dagger_talents.ts` — All talent trees
- `src/store/gameStore.ts` — Save migration (Sprint 1 only)
- `docs/weapon-designs/dagger/*.json` — Source of truth for each skill
- `src/types/index.ts` — SkillModifier type definition (lines ~727-795)

## Translation Pattern (JSON → TS)
- `stats.incCritChance` → `incCritChance` (flat field)
- `stats.resistBonus` → `abilityEffect: { resistBonus }`
- `procs[]` → `procs: [{ id: 'prefix_name', chance, trigger, ... }]`
- `conditionalMods[]` → `conditionalMods: [{ condition, modifier }]`
- `debuffInteraction` → `debuffInteraction: { ... }`
- `tensionWith` → field on node object (not inside modifier)
- `critChanceCap` → `critChanceCap` (flat field on modifier)
- `critsDoNoBonusDamage` → `critsDoNoBonusDamage: true`
- `executeOnly` → `executeOnly: { hpThreshold, bonusDamage }` or `executeThreshold`
- `castPriority` → `castPriority: 'execute'`
- Design-only fields → description string only
- Proc IDs → `{prefix}_{snake_case_name}` format

## Per-Sprint Checklist
- [ ] Read JSON source files for target skills
- [ ] Replace/fix notables+keystones in dagger_talents.ts
- [ ] `npm run build` passes after each skill
- [ ] No shared names remain (except Stab's originals which are now unique to Stab)
- [ ] All proc IDs use correct prefix
- [ ] Game loads in browser, talent trees render

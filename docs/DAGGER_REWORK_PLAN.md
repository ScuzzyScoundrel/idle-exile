# Dagger Skill Tree Rework Phase 2

## Context

Dagger is the first weapon with full per-skill talent trees (7 skills x 3 branches x 13 nodes = 273 nodes). The engine, UI, and wiring are verified working after the Phase 1 audit. However, all 7 skills currently have near-identical talent trees — same effects with different names. The 3 legacy buff/passive skills are outdated and don't synergize with the talent system. New multiplicative stats (penetration, dotMultiplier, etc.) exist in gear but aren't available in talent nodes.

This rework elevates talent tree quality before using dagger as the template for all other weapons.

**IMPORTANT: Execute ONE sprint per session.** Each sprint is a self-contained unit of work. Do not attempt multiple sprints in a single context window. After completing a sprint, commit, push, and update the status below.

### Sprint Status
- [x] **Sprint 1**: Engine — Add new stats to SkillModifier
- [x] **Sprint 2**: Rework 3 legacy buff skills
- [ ] **Sprint 3**: Venomcraft branch rework (all 7 skills)
- [ ] **Sprint 4**: Assassination branch rework (all 7 skills)
- [ ] **Sprint 5**: Shadow Dance branch rework + final polish

---

## Sprint 1: Engine — Add New Stats to SkillModifier

**Why**: Penetration, dotMultiplier, weaponMastery, ailmentDuration exist as gear stats and are already wired into damage/combat pipelines via `ResolvedStats`. But `SkillModifier` and `ResolvedSkillModifier` don't have these fields, so talent nodes can't grant them.

**Files to modify**:
1. `src/types/skills.ts` — Add to `SkillModifier` interface:
   ```
   firePenetration?: number;
   coldPenetration?: number;
   lightningPenetration?: number;
   chaosPenetration?: number;
   dotMultiplier?: number;
   weaponMastery?: number;
   ailmentDuration?: number;
   ```
2. `src/engine/skillGraph.ts` — Add matching fields to `ResolvedSkillModifier` (default 0 in `EMPTY_GRAPH_MOD`), add merge logic in `resolveSkillGraphModifiers()` (additive sum pattern, same as `damageFromArmor` at line ~208)
3. `src/engine/talentTree.ts` — Add merge logic in `resolveTalentModifiers()` (~line 233-246, same additive pattern). Add to `scaleModifier()` (~line 305-324)
4. `src/engine/combat/tick.ts` — Where `graphMod` feeds into combat, add these fields to the effective stats before `rollSkillCast()` runs. Pattern: `effectiveStats.firePenetration += graphMod.firePenetration`

**Existing wiring to reference** (these already work for gear stats):
- `src/engine/damageBuckets.ts:206-214` — Penetration applied as multipliers per element
- `src/engine/skills/dps.ts:73-79` — dotMultiplier and weaponMastery applied in DPS calc
- `src/engine/combat/tick.ts:382-403` — ailmentDuration applied to debuff durations

**Validation**: `npm run build` passes. No data changes yet — no nodes use the new fields.

---

## Sprint 2: Rework 3 Legacy Buff Skills

**Why**: `dagger_flurry` (3x attack speed), `dagger_shadow_strike` (+50% crit +100% crit dmg), `dagger_lethality` (+25% crit passive) are generic and don't connect to the talent tree branch system.

**File**: `src/data/skills/dagger.ts` — Replace all 3 entries in `DAGGER_ABILITIES`

### Design: 3 Archetype Buffs

**Buff ID design**: Each archetype buff has its OWN unique buff ID — separate from the talent tree internal buffs (`predator`/`venomFrenzy`/`shadowForm`). The talent tree's internal procs remain self-contained. This keeps the two systems independent: the archetype buff provides its base bonuses, while talent tree T4b buffs are earned through combat procs (kills/crits/dodges). No automatic cross-wiring — clean separation supports per-skill uniqueness later.

#### A. "Predator's Mark" (replaces dagger_shadow_strike) — Assassination
- **id**: `dagger_predators_mark`, kind: `buff`
- **Duration/CD**: 10s / 45s
- **Effect**: `{ critChanceBonus: 20, critMultiplierBonus: 40 }`
- **Skill tree**: Path A (precision: +crit during buff), Path B (lethality: first hit guaranteed crit), Path C (hunt: kills extend duration)

#### B. "Venom Covenant" (replaces dagger_flurry) — Venomcraft
- **id**: `dagger_venom_covenant`, kind: `buff`
- **Duration/CD**: 12s / 50s
- **Effect**: `{ attackSpeedMult: 1.5, damageMult: 1.15 }`
- **Skill tree**: Path A (toxic haste: poison extends duration), Path B (virulence: +poison damage), Path C (pandemic: kills spread poison)

#### C. "Shadow Covenant" (replaces dagger_lethality) — Shadow Dance
- **id**: `dagger_shadow_covenant`, kind: `buff`
- **Duration/CD**: 8s / 55s
- **Effect**: `{ defenseMult: 1.25, damageMult: 1.10, critMultiplierBonus: 15 }`
- **Skill tree**: Path A (evasion: dodges extend duration), Path B (counter: dodge counters crit), Path C (fortress: fortify = damage)

**Save migration**: Bump save version. Remap old skill IDs → new ones. Reset allocated nodes on replaced skills.

---

## Sprint 3: Venomcraft Branch Rework

**Why**: All 7 skills share identical branch patterns with different names. Each skill has a distinct mechanical identity that its talent tree should amplify.

### Skill Mechanical Identities

| Skill | Identity | Key Mechanic |
|-------|----------|-------------|
| **Stab** | Fast frequency | 0.8s cast, 3s CD — hits most often, consecutive hit chains |
| **Blade Flurry** | Multi-hit combo | 3 hits/cast — per-hit ramping, "all 3 connect" payoffs |
| **Frost Fan** | AoE cold clear | 65% phys→cold, AoE proj — pack density, chill/shatter |
| **Viper Strike** | DoT master | 45% phys→chaos, 5s DoT — poison depth, snapshot scaling |
| **Shadow Step** | Stealth burst | 45% phys→chaos — charge economy, ambush from stealth |
| **Assassinate** | Execute nuke | 2.2x weapon%, 8s CD — one perfect strike, patience payoff |
| **Lightning Lunge** | Chain propagator | 60% phys→lightning, chains — chain count, shock spread |

### Which Tiers Change

| Tier | Change Level | Approach |
|------|-------------|----------|
| **T1** (2 behavior) | LOW | Foundation stats. Minor additions (add element-specific stats where thematic) |
| **T2** (notable + behavior) | MEDIUM | Notables already have some variation. Add new-stat bonuses |
| **T3** (3 behavior) | **HIGH — Primary differentiation tier** | This is where each skill becomes unique |
| **T4** (notable + behavior) | MEDIUM | Notables need per-skill effects. T4b buff-conditional stays |
| **T5** (2 keystoneChoice) | MEDIUM | Add new stats. Adjust mutual-exclusive choices to be skill-specific |
| **T6** (notable) | LOW | Signature mechanics already somewhat unique. Polish |
| **T7** (keystone) | LOW | Power fantasy keystones. Minimal changes |

### Per-Skill Venomcraft Identity Themes

| Skill | Venomcraft Theme | New Stat Usage |
|-------|-----------------|----------------|
| **Stab** | Rapid Injection — frequency = fast stacking | `ailmentDuration` (poisons last longer due to reapplication) |
| **Blade Flurry** | Combo Venom — 3 hits = compound stacking | `dotMultiplier` (compound hits amplify DoT) |
| **Frost Fan** | Frost Plague — cold+poison hybrid debuff | `coldPenetration` (chilled+poisoned = cold pen bonus) |
| **Viper Strike** | Master Poisoner — deepest DoT specialization | `dotMultiplier`, `chaosPenetration`, `ailmentDuration` |
| **Shadow Step** | Lethal Injection — ambush poison burst | `chaosPenetration` (stealth = penetrate defenses) |
| **Assassinate** | Sovereign Venom — single massive poison | `dotMultiplier` (one big snapshot), `weaponMastery` |
| **Lightning Lunge** | Galvanic Plague — chains spread poison | `lightningPenetration` (lightning+poison hybrid) |

For each of the 7 skills, rework the Venomcraft branch (13 nodes each = 91 total nodes, ~60 need changes).

**File**: `src/data/skillGraphs/dagger_talents.ts` — each skill's Venomcraft branch (branch index 1)

---

## Future Sprints (Deferred)

**Sprint 4**: Assassination branch across all 7 skills (~50 node changes)
**Sprint 5**: Shadow Dance branch + final polish (~35 node changes)

---

## Verification

After each sprint:
1. `npm run build` — catches TS errors, unused imports
2. Open TalentTreeView UI — verify each tree renders with correct names/descriptions
3. Allocate nodes in-game — verify stat changes reflect in DPS/character stats
4. Spot-check combat — verify procs fire, buffs apply, debuffs stack correctly

---

## Critical Files

| File | Sprint | What Changes |
|------|--------|-------------|
| `src/types/skills.ts` | 1 | Add 7 new fields to `SkillModifier` |
| `src/engine/skillGraph.ts` | 1 | Add fields to `ResolvedSkillModifier`, `EMPTY_GRAPH_MOD`, merge logic |
| `src/engine/talentTree.ts` | 1 | Add merge logic + `scaleModifier()` for new fields |
| `src/engine/combat/tick.ts` | 1 | Wire graphMod new stats into effective stats before `rollSkillCast()` |
| `src/data/skills/dagger.ts` | 2 | Replace 3 `AbilityDef` entries in `DAGGER_ABILITIES` |
| `src/store/migrations.ts` | 2 | Save migration for renamed skill IDs |
| `src/data/skillGraphs/dagger_talents.ts` | 3 | Venomcraft branch nodes for all 7 skills (~60 nodes) |

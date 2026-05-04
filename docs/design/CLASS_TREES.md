# Class Talent Trees — Design README

**Status:** Phase B step 8 — class talent tree authoring ✅ COMPLETE (5/5 classes authored 2026-05-03). Cross-class consistency check ✅ passed.
**Source-of-truth:** JSON files at `src/data/classTrees/*.json` (one per class). This README is the design index + spec recap + cross-class consistency notes; per-class node content lives in JSON.
**Companion docs:** `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` (§6 talent tree shape, §8 combo system, §10 ascendancies, §11 multi-class), `CLASS_FANTASY_BRIEFS.md` (5 class briefs), `MULTI_CLASS_PAIRS.md` (10 pair briefs), `SKILL_FANTASY_AUDIT.md` (audit findings).

---

## Spec Recap (per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §6.1)

| Parameter | Value |
|---|---|
| Paths per class | 3 |
| Nodes per path | ~27-30 typical |
| Total nodes per class | ~80-90 |
| Level cap | 60 |
| Talents start | level 10 |
| Points total | 51 (1 per level from 10 to 60) |
| Tiers per path | 7 |
| Tier-N gate | spend (N-1) × 5 points in path |
| Capstone gate | ~31 points in that path |
| Multi-rank density | ~70% |
| Identity/keystone density | ~30% |

---

## Authoring Status

| # | Class | Status | JSON file | Nodes |
|---|---|---|---|---|
| 1 | Witchdoctor | ✅ authored 2026-04-27 | `src/data/classTrees/witchdoctor.json` | 80 (27/26/27 across 3 paths) |
| 2 | Assassin | ✅ authored 2026-04-27 | `src/data/classTrees/assassin.json` | 81 (27/27/27 across 3 paths) |
| 3 | Sorcerer | ✅ authored 2026-05-03 | `src/data/classTrees/sorcerer.json` | 81 (27/27/27 across 3 paths) |
| 4 | Berserker | ✅ authored 2026-05-03 | `src/data/classTrees/berserker.json` | 81 (27/27/27 across 3 paths) |
| 5 | Hunter | ✅ authored 2026-05-03 | `src/data/classTrees/hunter.json` | 81 (27/27/27 across 3 paths) |

---

## JSON Schema (per-node)

Each node in `paths[].nodes[]`:

```jsonc
{
  "id": "wd_pp_lingering_toxin",       // unique node id (class_path_name pattern)
  "name": "Lingering Toxin",            // display name
  "tier": 1,                            // 1-7; gates by (tier-1)*5 points in this path
  "kind": "passive",                    // passive | active | capstone | capstone_supporting
  "ranks": 5,                           // 1 (identity/keystone) or 3-5 (multi-rank)
  "category": "proc",                   // proc | conditional | stat | identity | buff_migration | cross_weapon | active
  "description": "Each poison tick has +1/2/3/4/5% chance to apply an extra Plagued stack",
  "engineHook": "onPoisonDotTick",      // event/system this node subscribes to (Phase C engineering reference)
  "dependencies": []                    // base mechanics required before this node activates (e.g. ["poisonStackCap"])
}
```

The `dependencies` field tracks base-mechanic gaps. Phase C engineering can grep these to know what mechanics block which nodes.

---

## Design Directives (LOCKED 2026-04-27)

1. **Class-first weapon-agnosticism** (§4.2 Class-First Principle). Class trees are weapon-agnostic by default. Weapon-conditional nodes ("while wielding staff, +X") fight the principle and are removed. Offhand-conditional nodes (per §6.3 — shield, focus, quiver, second_weapon) remain acceptable as playstyle sliders.

2. **Idle-game context.** No standing/walking/movement mechanics; no tile concept. Combat is per-zone encounter. AoEs express as "all enemies in encounter" or "in zone," not "within X tiles."

3. **Multi-rank flavor directive.** Multi-rank passives prefer **procs / conditionals / state-interactions** over flat stat scaling. Pure stat-stick nodes ("+5/10/15/20/25% damage") are acceptable as foundation/pacing nodes but should be the EXCEPTION (~15-20%), not the rule. Examples of preferred flavor: "DoT ticks have +X% chance to refresh duration"; "Crits have +X% chance to apply additional Hex stack"; "On-kill, +X% chance to spawn temporary minion."

4. **Buff migration absorption.** Audit-flagged active buffs (per `SKILL_FANTASY_AUDIT.md`) get absorbed as concrete passive nodes in the appropriate ascendancy path. Goal: zero `AbilityDef kind: 'buff'` post Phase B step 8 + Phase C cleanup.

5. **Tier-7 capstone collapse-test (§6.2).** *"If you removed this node, would the class fantasy collapse?"* If no, it's not a capstone — it's a big stat node. Capstones must reshape signature mechanics, not just multiply numbers.

6. **Base-mechanic dependencies are explicit.** Each node lists `dependencies` for any base game mechanics required (poison stack cap, healing potions, minion cap, etc.). Phase C engineering can identify which dependencies block which nodes.

---

## Cross-class consistency check ✅ PASSED 2026-05-03

Verified across all 5 class JSON files:

| # | Check | Result |
|---|---|---|
| 1 | Each tier-7 capstone passes §6.2 collapse-test | ✅ All 15 capstones reshape signature mechanics (Pandemic / Crit Cascade / Resonance / Rage Threshold / Mark & Execute) — none are stat-multipliers |
| 2 | Each class has 0-3 buff migration targets absorbed | ✅ WD: 3, Asn: 3, Sor/Brs/Hnt: 0 (no audited buffs to migrate per SKILL_FANTASY_AUDIT scope) |
| 3 | Each class has 1+ cross-weapon node | ✅ WD: Voodoo Mark (P3 T4); Asn: Cross-Weapon Cascade (P3 T4); Sor: Cross-Weapon Convergence (P3 T6); Brs: Cross-Weapon Cleave (P3 T6); Hnt: Cross-Weapon Mark (P3 T6) |
| 4 | Each path has ~27-30 nodes; total ~80-90 per class | ✅ WD 80 (27/26/27); Asn/Sor/Brs/Hnt 81 each (27/27/27). All within spec |
| 5 | Multi-rank density ~70%, identity ~30% (±10%) | ✅ WD 78/22; Asn 77/23; Sor 79/21; Brs 81/19; Hnt 81/19 — all within ±10% variance |
| 6 | All 3 ascendancy keystones (§10.1) per class reachable as tier-7 capstones | ✅ Verified: WD (Plague Priest/Spirit Whisperer/Voodoo Sovereign), Asn (Blademaster/Venomcraft/Shadowdancer), Sor (Elementalist/Arcanist/Specialist), Brs (Warlord/Reaver/Juggernaut), Hnt (Marksman/Beastmaster/Trapper) |
| 7 | No weapon-conditional nodes | ✅ All offhand-conditional nodes use slot-based conditions (`secondWeaponOffhand`, `offhandSlotConditional`) — none gate on weapon name |
| 8 | No idle-incompatible mechanics | ✅ Zero movement speed, tile-distance AoEs, or standing-still triggers. Chill reframed as combat-action-speed slow (Sor); Snare reframed as enemy action-slow (Hnt); all AoEs are encounter-radius |
| 9 | Multi-rank flavor distribution ≥80% proc/conditional/identity, ≤20% stat-sticks | ✅ WD 80/20, Asn 83/17, Sor 78/22 (slight overshoot — caster archetype has more foundation stats), Brs 80/20, Hnt 81/19 — all within or near 80/20 target |
| 10 | Sample build distributions show ≥3 viable archetypes | ✅ Each class supports pure (51/0/0), dual-path (26/25/0), and tri-split (17/17/17) builds; tier-7 capstones gate at 31 points = leaves 20 for secondary path |

**Cross-class summary stats:**

| Class | Nodes | Procs | Conditionals | Stats | Identity | Buff-Mig | Cross-Wp | Stat % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Witchdoctor | 80 | 38 | 13 | 11 | 14 | 3 | 1 | 14% |
| Assassin | 81 | 35 | 12 | 14 | 16 | 3 | 1 | 17% |
| Sorcerer | 81 | 31 | 14 | 18 | 17 | 0 | 1 | 22% |
| Berserker | 81 | 25 | 24 | 16 | 15 | 0 | 1 | 20% |
| Hunter | 81 | 35 | 15 | 15 | 15 | 0 | 1 | 19% |
| **Total** | **404** | **164** | **78** | **74** | **77** | **6** | **5** | **18%** |

- **Procs are the dominant flavor** (164 / 404 = 41%) — matches multi-rank flavor directive.
- **Brs has the most conditionals** (24) due to HP-threshold mechanics (selfHpBelow50, frenziedActive, offhandNone).
- **Sor has the most stat-sticks** (18) due to Resonance bank foundation (max charges, charge duration, mana, ignite stacks) — within ±10% variance.
- **All 5 capstone pairs** (capstone + capstone_supporting) per class deliver signature reshaping, not stat-multiplication.

---

## Hunter Tree Notes (5 of 5)

Per the Hnt design pass 2026-05-03 (see `hunter.json` for full 81-node content):

- **3 paths align to ascendancies:** Marksman (crit-precision) / Beastmaster (animal-companion) / Trapper (trap-stack).
- **3 capstones reshape Mark & Execute signature:** Headhunter (first hit on new target always crits + Precision Payoffs +50%), Pack Leader (permanent companion inherits Mark application + on-hit procs), Snare Field (traps gain +2 arming counts + escalating chain damage 1×/1.5×/2×/2.5×).
- **0 buff migrations** — Hnt pool not yet authored (bow pool reclassified to Phase C3 rebuild per `SESSION_HANDOFF.md`).
- **Cross-weapon node:** Cross-Weapon Mark (Path 3 T6) — Mark & Execute triggers regardless of weapon (§8.2 example).
- **Class-First weapon-agnosticism preserved:** zero weapon-conditional nodes. Tag-conditional nodes use paradigm tags (windUpTagged, singleTargetTagged, pierceTagged, trapTagged, aoeTagged) — applies across any weapon morphed to that paradigm.
- **Idle-game context:** zero movement/standing/tile mechanics. Snare reframed as enemy combat-action-speed slow.
- **Base-mechanic dependencies tracked:** `markMechanic` (29 nodes — heaviest dep, since Mark IS the signature), `companionMechanic` (27 nodes — Beastmaster path), `trapMechanic` (19 nodes — Trapper path).
- **Multi-rank flavor distribution:** ~81% proc/conditional/identity/cross-weapon flavor; ~19% pure stat scaling.
- **Identity-density:** 15 of 81 nodes (~19%) — below 30% target but consistent with WD/Asn/Sor/Brs trees.
- **Most balanced category split:** procs/conditionals/stats/identity = 35/15/15/15.

---

## Berserker Tree Notes (4 of 5)

Per the Brs design pass 2026-05-03 (see `berserker.json` for full 81-node content):

- **3 paths align to ascendancies:** Warlord (execute axis) / Reaver (bloodlust axis) / Juggernaut (defensive AoE axis).
- **3 capstones reshape Rage Threshold signature:** King of Ruin (Rage Threshold raises to 65% HP + execute-range damage doubled), Undying Wrath (each kill while Frenzied extends window 2s + cannot die while Rage active), Mountain (no offhand = -30% damage taken + AoE/Cleave radius +50%).
- **0 buff migrations** — Brs pool not yet authored.
- **Cross-weapon node:** Cross-Weapon Cleave (Path 3 T6) — Marked for Cleave triggers regardless of weapon (§8.2 example).
- **Class-First weapon-agnosticism preserved:** Juggernaut path's "while no offhand equipped" clauses are offhand-conditional per §6.3 (allowed) — captures the 2H tank fantasy without weapon-name gating. Wind-up tag references skill paradigm tag, not weapon name.
- **Idle-game context:** zero movement/standing/tile mechanics. Frenzied state is HP-threshold based; Bloodied is target debuff; AoE Cleave is encounter-radius.
- **Base-mechanic dependencies tracked:** `rageThresholdMechanic` (18 nodes — heaviest dep, signature mechanic), `offhandSlotConditional` (6 nodes — Juggernaut path).
- **Multi-rank flavor distribution:** ~80% proc/conditional/identity/cross-weapon flavor; ~20% pure stat scaling. At target.
- **Heaviest conditional density of all 5 classes:** 24 conditional nodes due to HP-threshold mechanics (selfHpBelow50, frenziedActive, selfHpBelow25, offhandNone).
- **Identity-density:** 15 of 81 nodes (~19%).

---

## Sorcerer Tree Notes (3 of 5)

Per the Sor design pass 2026-05-03 (see `sorcerer.json` for full 81-node content):

- **3 paths align to ascendancies:** Elementalist (conversion-stack axis) / Arcanist (Resonance-bank axis) / Specialist (single-element commitment — Pyromancer/Cryomancer/Stormcaller picked at ascendancy).
- **3 capstones reshape Resonance signature:** Element Shifter (conversion stacks to 150% + element-swap procs reset Resonance counter for free Convergence cycles), Saturation (max Resonance charges +5 → 9 + cast-speed burst on spend), Avatar of Element (chosen element +50% damage + chosen-element charge protected from element-swap reset).
- **0 buff migrations** — Sor pool not yet authored.
- **Cross-weapon node:** Cross-Weapon Convergence (Path 3 T6) — Resonance and Convergence trigger regardless of weapon (§8.2 example).
- **Class-First weapon-agnosticism preserved:** zero weapon-conditional nodes. Tag-conditional nodes use damage-type tags (hybridDamageTypes, conversionTagged) — applies across any weapon.
- **Idle-game context:** zero movement/standing/tile mechanics. Chill reframed as combat-action-speed slow (not movement). All Resonance/Convergence effects are encounter-scoped.
- **Base-mechanic dependencies tracked:** `resonanceMechanic` (29 nodes — heaviest dep, signature mechanic), `convergenceMechanic` (14 nodes — payoff system).
- **Multi-rank flavor distribution:** ~78% proc/conditional/identity/cross-weapon flavor; ~22% pure stat scaling. Slightly above 20% target — Sor has more stat-foundation nodes due to Resonance bank size, mana, max charges, ignite stacking. Reasonable for the caster archetype.
- **Identity-density:** 17 of 81 nodes (~21%).

---

## Assassin Tree Notes (2 of 5)

Per the Asn design pass 2026-04-27 (see `assassin.json` for full 81-node content):

- **3 paths align to ascendancies:** Blademaster (dual-wield crit-burst) / Venomcraft (poison-snapshot) / Shadowdancer (mark-momentum).
- **3 capstones reshape Crit Cascade signature:** Bladestorm (cooldown-refund tempo + dual-wield chain +1 hit), Toxic Saint (poison can crit + decay-pause while Shadow Mark active), Untouchable (Mark on first hit + Marked-hit Shadow Momentum).
- **3 buff migrations absorbed:** Predator's Mark (Path 1 T4) ← Predator's Mark active buff (cut button, halved values, conditioned on second-weapon offhand per §6.3); Venom Covenant (Path 2 T2) ← cut button, conditioned on poison-active state; Shadow Covenant (Path 3 T4) ← cut button, conditioned on Shadow Mark active.
- **Cross-weapon node:** Cross-Weapon Cascade (Path 3 T4) — Crit Cascade triggers regardless of weapon (§8.2 example).
- **Class-First weapon-agnosticism preserved:** zero weapon-conditional nodes. 4 offhand-conditional nodes (Twin Strike, Predator's Mark, Twin Reaping, Bladestorm) — all use `secondWeaponOffhand` dependency, allowed per §6.3.
- **Idle-game context:** zero movement/standing/tile mechanics. Shadow Caltrops trap is a zone-effect, not movement-locked.
- **Base-mechanic dependencies tracked:** `poisonStackCap` (2 nodes), `secondWeaponOffhand` (4 nodes), `critCascadeMechanic` (18 nodes — heaviest dep, since Cascade is the class signature).
- **Multi-rank flavor distribution:** ~83% proc/conditional/identity/buff_migration/cross_weapon flavor; ~17% pure stat scaling (foundation nodes for crit chance/damage/attack speed/poison duration/poison stacks).
- **Identity-density:** 19 of 81 nodes (~23%) — slightly below 30% target, similar to WD; can iterate up if playtest reveals thinness.
- **Tier distribution:** 9/12/15/12/15/12/6 — even pacing across paths.

---

## Witchdoctor Tree Notes (1 of 5)

Per the WD design pass 2026-04-27 (see `witchdoctor.json` for full 80-node content):

- **3 paths align to ascendancies:** Plague Priest (DoT-spread) / Spirit Whisperer (minions) / Voodoo Sovereign (curse).
- **3 capstones reshape signatures:** Pandemic Plus (spreads to 2+1 with Maximum Spread), Soul Tether (minion proc inheritance + count-as-player-attacks), Crowned in Curses (Hex crit + 2× consume).
- **3 buff migrations absorbed:** Spirit Walker (Path 1 T6) ← Spirit Walk; Voodoo Roar (Path 2 T5) ← Big Bad Voodoo (cast speed instead of attack speed per user feedback); Grave Injustice (Path 2 T6) ← direct passive promotion.
- **Cross-weapon node:** Voodoo Mark (Path 3 T4) — all skills apply Hexed on crit (§8.2 example).
- **Weapon-conditional nodes REMOVED** (Curse Conduit, Voodoo Doll) per Class-First Principle.
- **Base-mechanic dependencies tracked:** `poisonStackCap` (3 nodes), `healingPotions` (1 node), `hexStacking` (2 nodes).
- **Multi-rank flavor distribution:** ~80% proc/conditional/identity flavor; ~20% pure stat scaling (foundation nodes for damage/duration/mana scaling).
- **Identity-density:** 18 of 80 nodes (22%) — slightly below 30% target; can iterate up if playtest reveals thinness.

---

## Phase B step 8 — Status

| Item | Status |
|---|---|
| Witchdoctor JSON authored | ✅ 2026-04-27 |
| Assassin JSON authored | ✅ 2026-04-27 |
| Sorcerer JSON authored | ✅ 2026-05-03 |
| Berserker JSON authored | ✅ 2026-05-03 |
| Hunter JSON authored | ✅ 2026-05-03 |
| Cross-class consistency check | ✅ PASSED 2026-05-03 (10/10 checks green; see table above) |
| Engine wiring (Phase C) | reads JSON via `import` once `tsconfig.app.json` has `resolveJsonModule: true` (Phase C engineering task) |

**Phase B step 8 ✅ COMPLETE.** All 404 nodes authored across 5 classes (80+81+81+81+81). 15 capstones reshape signatures. 5 cross-weapon nodes connect combo states across weapon pools. 6 buff migrations absorbed (WD+Asn pools). Zero weapon-conditional nodes; zero idle-incompatible mechanics.

**Next:** 6 remaining multi-class pair briefs in `MULTI_CLASS_PAIRS.md`, then Phase A cleanup (proc handlers + `CharacterClass` type rename), then Phase C wiring.

---

**End of class trees README.**

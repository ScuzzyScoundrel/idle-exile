# Skill Fantasy Audit — Witchdoctor Staff + Assassin Dagger

**Status:** Phase B step 9b — precursor to fantasy-briefs rewrite, multi-class pair authoring, and Phase C3 expansion to 15-20 skills/class.
**Authored:** 2026-04-26.
**Companion docs:** `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` (§8.1 ComboStateSpec, §8.3 Ailment Baseline Rule, §9.3 Ailment Trigger Rework, §9.4 Mana Calibration), `CLASS_FANTASY_BRIEFS.md` (5 MVP class briefs), `MULTI_CLASS_PAIRS.md` (Blood Cultist + 9 stubs).

---

## Audit Methodology

Each skill evaluated on **4 axes**:

1. **Fantasy fit** — does this skill express the class's signature mechanic (§3.2) + mana flavor (§9.4) + ascendancy axes (§10.1)?
2. **Combo state correctness** — do declared `createsComboState` / `consumesComboState` align with §8.1 spec? Names consistent across pools?
3. **Ailment behavior** — does `baseAilmentChance` match the skill's intent and §8.3 baseline rule? Any pre-§9.3 auto-application artifacts?
4. **Buff disposition** (active buffs only) — should this exist at all? If yes, migrate to where (talent passive, ascendancy passive, skill side-effect, or fusion mechanic)?

Per-skill verdict: **KEEP** (on-flavor, no changes), **ADJUST** (minor tuning or combo-state migration), **REWORK** (major change while preserving slot), **REPLACE** (cut and substitute), or **CUT** (remove entirely).

---

## 1. Witchdoctor × Staff

### 1.1 Class Fantasy Recap

**Signature mechanic:** Pandemic — when a target with a DoT dies, all DoTs transfer to the nearest enemy at full duration. Propagates across weapons.

**Mana flavor:** Big-pool caster (max 150) + kill-chunk refill (onKill 20) + light per-hit trickle (0.5). Wants enemies dying.

**Ascendancy axes:** Plague Priest (DoT spread), Spirit Whisperer (minions), Voodoo Sovereign (curse/Hex).

**Element/damage axis:** Chaos primary; poison/Plagued ailment vector. Cold and fire are off-flavor (Sorcerer territory). Physical is acceptable for minion auto-attacks but not WD's caster spells.

### 1.2 Per-Skill Audit Table (10 actives)

| # | Skill | Fantasy fit | Combo state | Ailment | Verdict | Notes |
|---|---|---|---|---|---|---|
| 1 | **Zombie Dogs** | ✓ Strong — Spirit Whisperer enabler; iconic minion fantasy | "Haunted" via dog bites — currently hardcoded in `engine/combat/combo.ts` | 0 ✓ (minion, not direct hit) | **KEEP + ADJUST** | Migrate Haunted spec to §8.1 ComboStateSpec. Consider: minion-bite kills should trigger Pandemic propagation per signature mechanic. |
| 2 | **Locust Swarm** | ✓ Very Strong — IS the Pandemic vector. Native chaos DoT transfers on death. | Creates "Plagued" — hardcoded | 0 ✓ (native chaos DoT redundant per §8.3) | **KEEP + ADJUST** | Centerpiece skill. Migrate Plagued to §8.1 schema. |
| 3 | **Haunt** | ⚠️ Weak — cold DoT. Cold is Sorcerer territory; WD is chaos/poison. | "Haunted" name conflicts with Zombie Dogs' Haunted (different state shapes!) | 0 ✓ (native cold DoT) | **REWORK** | Two paths: (a) convert to chaos-flavored DoT, rename combo state to avoid collision with Zombie Dogs; (b) keep as the Sorcerer×Staff morph and replace this slot with a chaos DoT for WD-pure (e.g., "Curse of the Spirits"). Path (a) is cheaper. |
| 4 | **Hex** | ✓ Strong — Voodoo Sovereign enabler; pure utility curse fits death-cultist fantasy | Creates "Hexed" — hardcoded | 0 ✓ (utility, no damage) | **KEEP + ADJUST** | Consider adding light damage component (~30% spell power chaos) so it isn't dead-air. Migrate Hexed to schema. |
| 5 | **Spirit Barrage** | ⚠️ Mixed — 3-hit cold projectile feels Sorcerer-flavored. Frostbite vector wrong for WD. | None declared | 25 ailment chance for chill/frostbite — but cold isn't WD's element | **REWORK** | Convert to chaos projectile barrage; ailment vector becomes poison or apply Plagued per hit. Preserve "barrage" shape. Move cold variant to Sorcerer×Staff morph. |
| 6 | **Plague of Toads** | ✓ Strong — chaos DoT, on-flavor for Plague Priest | Should create Plagued (currently undeclared) | 0 ✓ (native DoT) | **ADJUST** | Differentiate from Locust Swarm: Toads as ground-AoE multi-target, Locusts as enemy-attached single-target. Add explicit Plagued spec. |
| 7 | **Fetish Swarm** | ✓ Very Strong — heavy minion summon; Spirit Whisperer payoff. Iconic WD spell. | None | 0 ✓ (minion, not direct) | **KEEP** | Consider whether fetish auto-attacks should proc combo states (e.g., apply Plagued on hit). |
| 8 | **Soul Harvest** | ✓ Strong — IS the Soul Stack mechanic. Chaos hit + poison vector. On-flavor. | Consumes Soul stacks (mentioned in WD brief §1.6) | 30 ✓ (poison vector, fits chaos damage type per §8.3) | **KEEP + ADJUST** | Migrate Soul Stack to §8.1 ComboStateSpec when schema lands. |
| 9 | **Bouncing Skull** | ⚠️ Mixed — fire chain feels off-WD. Bouncing mechanic is fine; element is wrong. | None | 25 ignite chance — but fire isn't WD's element | **REWORK** | Convert to chaos chain with poison vector (Plagued application chains). Preserve bouncing mechanic. Move fire variant to Sorcerer×Staff morph. |
| 10 | **Mass Sacrifice** | ✓ Strong — heavy AoE nuke. Plague Priest + Spirit Whisperer crossover. | None — could consume Soul stacks | 40 ✓ (heavy hit warrants strong proc window) | **KEEP + ADJUST** | Add Soul Stack consumption synergy: "consume up to 5 Soul Stacks for +20% damage each." Pair-overlap concern: Deathwalker toggle "Berserker's Sacrifice" already specs this slot; preserve clean default for solo WD play. |

**Pre-§9.3 ailment artifacts found:** None. Audit confirms baseAilmentChance values are sensible after the rework. Skills with native DoTs (Locust Swarm, Haunt, Plague of Toads) correctly carry 0 (per §8.3 redundancy rule). Skills with explicit ailment vectors (Spirit Barrage 25, Soul Harvest 30, Bouncing Skull 25, Mass Sacrifice 40) carry meaningful values.

### 1.3 Active Buff Disposition (3 entries)

Per the "remove active buffs" intent, every WD staff buff/passive gets a migration path:

| Buff | Current effect | Migration path | Reasoning |
|---|---|---|---|
| **Spirit Walk** | +15% damage for 8s; pending dodge effect | **CUT button. Migrate damage% to a class-tree passive node** (e.g., "Spirit Caller path tier-3: +15% damage while a minion is alive"). Dodge effect → Plague Priest ascendancy passive. | Pure stat-stick + unwired mechanic. Active button adds nothing the player isn't already pressing. Conditional passive is more interesting. |
| **Big Bad Voodoo** | +50% attack speed, +30% damage for 10s | **CUT button. Migrate to Spirit Whisperer ascendancy passive** with active condition: "while 3+ minions alive, gain +25% attack speed and +15% damage." | Stat double-buff is the worst kind of button — same value every time. Conditioning on minion count makes Spirit Whisperer feel mechanically distinct. |
| **Grave Injustice** | onKill: -1s cooldown + 2% life heal (passive, not button) | **MIGRATE to class-tree passive node** directly (skip the AbilityDef wrapper). Note already says "wired via talent-tree allocation." | Already passive; the AbilityDef is just a UI surface. Folding into a real talent-tree node removes the orphan-data structure. |

**Goal post-cleanup:** zero `AbilityDef kind: 'buff'` and zero `AbilityDef kind: 'passive'` for staff. All effects migrate into the class-tree / ascendancy authoring (Phase B step 8).

### 1.4 Gap Analysis — what roles are MISSING for 15-20 expansion

Current 10 covers (role distribution):
- Single-target DoT: Locust Swarm, Haunt, Plague of Toads (3 — overcrowded; Haunt rework consolidates)
- Curse/utility: Hex (1)
- Minion summon: Zombie Dogs, Fetish Swarm (2)
- Ranged hit: Spirit Barrage, Bouncing Skull (2)
- Burst hit: Soul Harvest, Mass Sacrifice (2)

Missing roles for the 5-10 skill expansion to reach 15-20:
- **Movement skill** — WD has zero mobility (compare Asn's Shadow Dash). Spirit Walk's "dodge effect" was the failed attempt.
- **Channeled DoT** — channels are flagged as Phase C3 territory; WD has none currently. Natural fit: a pulsing chaos beam ("Plague Channel") that ticks Plagued per second.
- **Single-target boss-burst** — current Mass Sacrifice is AoE; Soul Harvest is medium-target. WD has no dedicated single-target burst for boss fights.
- **Defensive/utility** — life-leech proc, bone shield, brief invulnerability via spirit cover.
- **Pet command/buff** — for Spirit Whisperer builds, minions are passive. A "Rally" or "Frenzy Minions" active that briefly amplifies minion damage would anchor the build.
- **Hex amplifier** — a skill that consumes Hexed for big damage (currently only the implicit "consumed by non-Hex skills for +damage" — needs a dedicated consumer).
- **Curse propagation** — a skill that spreads Hex/Plagued to nearby enemies on cast (manual Pandemic without requiring kill).

**Recommended Phase C3 expansion targets (8 new skills):** Plague Channel, Spirit Step (movement), Soul Lance (single-target burst), Bone Shield (defensive), Rally Minions (pet command), Plague Burst (Hex consumer), Curse Spread (Pandemic-on-demand), Death Pact (life-leech proc).

That brings WD staff to **18 skills** within the 15-20 target.

### 1.5 Audit Summary — Witchdoctor × Staff

| Verdict | Count | Skills |
|---|---|---|
| KEEP (no changes) | 1 | Fetish Swarm |
| KEEP + ADJUST (combo migration / minor tuning) | 5 | Zombie Dogs, Locust Swarm, Hex, Plague of Toads, Soul Harvest, Mass Sacrifice |
| REWORK (major change, preserve slot) | 3 | Haunt (chaos), Spirit Barrage (chaos), Bouncing Skull (chaos) |
| REPLACE | 0 | — |
| CUT | 0 actives; 2 buffs (Spirit Walk, Big Bad Voodoo) | — |

**Net effort:** 6 combo-state migrations (when §8.1 schema lands) + 3 rework cells (chaos-conversion) + 2 buff cuts (with talent-tree migration drafts) + 1 passive promotion (Grave Injustice → talent node).

---

## 2. Assassin × Dagger

### 2.1 Class Fantasy Recap

**Signature mechanic:** Crit Cascade — crits create Shadow Mark; further crits on marked targets re-mark + add Crit Stacks (max 5) for global crit-damage scaling.

**Mana flavor:** Quick-recover (max 50, passive 10) + crit-feedback compounding (onCrit 6) + per-hit trickle (1) + small onKill (3).

**Ascendancy axes:** Blademaster (dual-wield crit-burst), Venomcraft (poison snapshot), Shadowdancer (mark momentum).

**Element/damage axis:** Physical primary (with bleed via §8.3); shadow/chaos secondary (poison vector). Lightning is off-flavor (Sorcerer); fire is off-flavor (Sorcerer); cold is off-flavor (Sorcerer/Hunter).

### 2.2 Per-Skill Audit Table (10 actives)

| # | Skill | Fantasy fit | Combo state | Ailment | Verdict | Notes |
|---|---|---|---|---|---|---|
| 1 | **Stab** | ✓ Very Strong — combo-state generator on crit; fast tap is dagger fantasy core | Creates Exposed on crit — hardcoded | 0 ✓ (phys → bleed auto per §8.3) | **KEEP + ADJUST** | Migrate Exposed spec to §8.1. With Crit Cascade live, Stab also creates Shadow Mark on crit (per signature) — confirm this is engine-side, not duplicated in skill data. |
| 2 | **Blade Dance** | ⚠️ Mixed — multi-target is fine but 30% per hit is anemic; doesn't feel like a Cascade feeder | None | 0 ✓ | **ADJUST** | Either bump per-hit damage to 50%+ (each hit a meaningful crit chance) OR rework to "3 hits each consuming Exposed for bonus." Currently dead-cast in Cascade builds. |
| 3 | **Fan of Knives** | ✓ Strong — AoE clear that hits everyone; signature ailment per-target | None — could create Exposed on all hit | 40 ✓ (signature AoE applier) | **KEEP + ADJUST** | Consider "applies Exposed to all targets hit" for Cascade synergy. Currently Cascade only fires on crit, not per-target. |
| 4 | **Viper Strike** | ✓ Very Strong — IS the Venomcraft enabler; native chaos DoT | Creates Deep Wound — hardcoded | 0 ✓ (native chaos DoT) | **KEEP + ADJUST** | Migrate Deep Wound to §8.1. The "+50% ailment potency" snapshot multiplier is gear/talent-facing and not yet wired — known gap, flagged for engine work. |
| 5 | **Shadow Mark** | ✓ Strong — IS the Shadowdancer enabler; pure utility setup | Creates Shadow Mark | 0 ✓ (utility, no damage) | **KEEP + ADJUST** | Per Crit Cascade signature, crits also create Shadow Mark automatically. This skill is the manual application; roles are clearly separated. Migrate Shadow Mark spec to §8.1. |
| 6 | **Assassinate** | ✓ Very Strong — heavy single-target burst consuming Exposed + Deep Wound | Consumes Exposed + Deep Wound — hardcoded | 35 ✓ (big hit warrants proc window) | **KEEP + ADJUST** | Consider "consumes Crit Stacks for bonus damage" so Cascade builds have a clean payoff. Pair-overlap with Blood Cultist Hexstab toggle is fine — toggle changes Stab's combo state, doesn't touch Assassinate. |
| 7 | **Chain Strike** | ⚠️ Mixed — lightning conversion is off-Asn. Asn is shadow/chaos/physical; lightning is Sorcerer territory. | None | 30 ailment chance for shock — but shock isn't Asn-flavored | **REWORK** | Convert to physical chain (preserves bleed via §8.3) OR shadow-chain (chaos conversion). Preserve chain mechanic; lose lightning element. Move lightning variant to Sorcerer×Dagger morph if/when authored. |
| 8 | **Blade Ward** | ⚠️ Weak — defensive +DR + counter-attack feels off-class. Asn is glass cannon by design. | None | 0 ✓ | **REPLACE** | Asn shouldn't have defensive button bloat; defense comes from stats/ascendancies. Replace options: (a) **Smoke Bomb** — combat reset + crit window for 4s (signature Asn feel); (b) **Shadow Step** — defensive teleport + brief stealth; (c) **Counter Stance** — 2s instant reactive (different from Blade Ward's 3s defensive window). Smoke Bomb is the strongest fantasy fit. |
| 9 | **Blade Trap** | ⚠️ Mixed — traps are Hunter territory. Asn shouldn't be a trap class. | None | 40 chance | **REWORK** | Either: (a) reflavor as "Shadow Caltrops" (still trap mechanic, shadow-themed AoE) preserving the slot; (b) replace with "Death Mark" (ranged Shadow Mark application — Shadowdancer build enabler); (c) lean into trap as Asn-distinct: a trap that explodes into Mark-applying shadow knives. Path (c) preserves the trap mechanic while routing through Asn signature. |
| 10 | **Shadow Dash** | ✓ Very Strong — movement + Shadow Momentum generator | Creates Shadow Momentum | 0 ✓ | **KEEP + ADJUST** | Migrate Shadow Momentum to §8.1 schema. |

**Pre-§9.3 ailment artifacts found:** None. baseAilmentChance values reasonable. Bleed-on-physical is correctly handled by §8.3 baseline (skills with phys primary carry 0 explicit chance — Stab, Blade Dance, Blade Ward, Shadow Dash). Skills with explicit elemental/chaos vectors carry meaningful chances (Fan 40, Viper 0 native, Assassinate 35, Chain Strike 30, Blade Trap 40).

### 2.3 Active Buff Disposition (3 entries)

| Buff | Current effect | Migration path | Reasoning |
|---|---|---|---|
| **Predator's Mark** | +20% crit chance, +40% crit mult for 10s | **CUT button. Migrate to Blademaster ascendancy passive:** "while wielding dagger, +10% crit chance and +20% crit mult permanently" (cut button, halve values, make always-on). | Stat double-buff is dead button. Halving and conditioning on weapon makes Blademaster mechanically distinct. |
| **Venom Covenant** | +50% attack speed, +15% damage for 12s | **CUT button. Migrate to Venomcraft ascendancy passive** with conditional: "+25% attack speed and +10% damage while you have an active poison stack on a target." | Conditional on poison-active makes Venomcraft loop-driven, not button-driven. |
| **Shadow Covenant** | +25% defense, +10% damage, +15% crit mult for 8s | **CUT button. Migrate to Shadowdancer ascendancy keystone:** "while Shadow Mark is active on any target, +15% defense and +10% crit mult." | Conditional on Shadow Mark routes Shadowdancer through its signature combo state. Removes the +damage component (Asn already has plenty of damage). |

**Goal post-cleanup:** zero `AbilityDef kind: 'buff'` for dagger. All effects migrate into ascendancy authoring (Phase B step 8) with conditional triggers tied to Asn signature mechanics.

### 2.4 Gap Analysis — what roles are MISSING for 15-20 expansion

Current 10 covers (after audit recommendations):
- Combo-state generator: Stab (1)
- Combo-state amplifier: Shadow Mark (1)
- Burst payoff: Assassinate (1)
- AoE clear: Blade Dance, Fan of Knives, Blade Trap (3)
- Multi-target chain: Chain Strike (1, post-rework)
- DoT setup: Viper Strike (1)
- Movement: Shadow Dash (1)
- Defensive (post-replace): Smoke Bomb (1)

Missing roles for 5-10 skill expansion to reach 15-20:
- **Stealth/positioning** — vanish, brief invisibility, repositioning that resets combat awareness. Asn signature gap!
- **Channeled bleed/poison stream** — fast-tick channel; per §9.5 channels are Phase C3 territory. Natural fit: "Bleed Stream" or "Poison Lash."
- **Crit-spike single-target** — consume Crit Stacks for guaranteed crit + bonus damage on next hit (different from Assassinate which consumes Exposed/Deep Wound).
- **Counter/parry** — instant reactive (different from defensive Blade Ward / Smoke Bomb).
- **Off-hand activation** — dual-wield specific skill; only fires when second_weapon offhand equipped (per §5.2). Strong Blademaster anchor.
- **Mass Mark consume** — skill that does extra damage on Marked targets across multiple targets at once. Currently Mark consume is single-target only.
- **Poison-stack consumer** — explicit "spend all poison stacks for big single-target hit" payoff (orthogonal to Assassinate which consumes Deep Wound).
- **Crit-cascade direct enabler** — a skill that guarantees a Crit Stack regardless of crit (charge-up or commit-to-crit mechanic).

**Recommended Phase C3 expansion targets (8 new skills):** Vanish (stealth), Poison Lash (channel), Coup de Grâce (Crit Stack consumer), Riposte (counter), Twin Fang (off-hand dual-wield), Mass Reckoning (multi-Mark consumer), Toxic Snap (poison consumer), Killing Edge (crit-stack enabler).

That brings Asn dagger to **18 skills** within the 15-20 target.

### 2.5 Audit Summary — Assassin × Dagger

| Verdict | Count | Skills |
|---|---|---|
| KEEP (no changes) | 0 | — |
| KEEP + ADJUST (combo migration / minor tuning) | 6 | Stab, Fan of Knives, Viper Strike, Shadow Mark, Assassinate, Shadow Dash |
| ADJUST (per-hit damage / mechanical tuning) | 1 | Blade Dance |
| REWORK | 2 | Chain Strike (lightning→phys/shadow), Blade Trap (Asn-route) |
| REPLACE | 1 | Blade Ward → Smoke Bomb (or alternative) |
| CUT | 0 actives; 3 buffs (Predator's Mark, Venom Covenant, Shadow Covenant) | — |

**Net effort:** 7 combo-state migrations (when §8.1 schema lands) + 1 per-hit damage tuning + 2 rework cells + 1 replacement spec + 3 buff cuts (with ascendancy migration drafts).

---

## 3. Cross-Class Consistency Notes

### 3.1 Combo State Migration is Cross-Cutting

Both pools have skills that hardcode combo states in `engine/combat/combo.ts`:

- **Witchdoctor staff combo states:** Hexed (Hex), Plagued (Locust Swarm, Plague of Toads), Haunted (Zombie Dogs bites, Haunt — NAMING COLLISION), Soul Stack (Soul Harvest accrual).
- **Assassin dagger combo states:** Exposed (Stab on crit), Deep Wound (Viper Strike), Shadow Mark (Shadow Mark + Crit Cascade signature), Crit Stack (Cascade re-marks), Shadow Momentum (Shadow Dash).

**Critical issue: "Haunted" is used by both Zombie Dogs AND Haunt with different effect shapes.** The Zombie Dogs Haunted is "applied by minion bite for 5s" (no clear damage modifier); the Haunt Haunted is "cold DoT effect over 5s." These are incompatible state semantics under the same name.

**Resolution options:** 
- Rename Zombie Dogs' state to "Hounded" or fold it into Plagued.
- Rename Haunt's state to "Withered" or "Spirit-Cursed."
- §8.1 ComboStateSpec migration is the natural place to fix this.

§8.1 migration must happen in ONE atomic pass for both pools (and any future pools) to avoid mid-migration breakage.

### 3.2 Element-Flavor Drift

Both pools have skills with elemental flavors that fight class identity:

| Class | Off-flavor skills | Why off-flavor | Audit verdict |
|---|---|---|---|
| WD | Haunt (cold), Spirit Barrage (cold), Bouncing Skull (fire) | WD is chaos primary; cold is Sorcerer, fire is Sorcerer | All 3 → REWORK to chaos |
| Asn | Chain Strike (lightning) | Asn is physical/shadow/chaos primary; lightning is Sorcerer/Hunter | REWORK to phys/shadow |

**Pattern:** Both pools were authored with element-variety-for-its-own-sake. Element should serve class identity, not flavor diversity. Element diversity belongs to the morph layer (Sorcerer×Staff converts WD chaos skills to elements; Hunter×Dagger doesn't change Asn shadow elements).

### 3.3 Ailment Chance Calibration is Sound

Post-§9.3 audit confirms baseAilmentChance values are reasonable across both pools:
- Native DoT skills (chaos/cold DoTs) correctly carry 0 (per §8.3 redundancy).
- Heavy-damage skills (Mass Sacrifice 40, Assassinate 35, Blade Trap 40, Fan of Knives 40) carry meaningful proc windows.
- Single-target small hits (Stab, Blade Dance, Hex, Plague of Toads, Zombie Dogs) correctly rely on §8.3 baseline.

No pre-§9.3 auto-application artifacts found. Combat smoke test still pending to validate live behavior.

### 3.4 Buff Philosophy Fully Convergent

All 6 active buffs (3 staff + 3 dagger) are pure stat-stick "press-button-get-stats" entries. All 6 have clear migration paths to:
- **Talent-tree passive nodes** (Spirit Walk damage%)
- **Ascendancy passive nodes with conditionals** (Big Bad Voodoo while-minions, Predator's Mark while-dagger, Venom Covenant while-poison-active, Shadow Covenant while-Mark-active)
- **Class-tree passive promotion** (Grave Injustice — already passive, just needs structural promotion)

**Goal post-cleanup:** Zero `AbilityDef kind: 'buff'` and zero `AbilityDef kind: 'passive'` in WD staff + Asn dagger pools. All effects migrate into the class-tree / ascendancy authoring (Phase B step 8).

This frees up 3 skill slots per pool from `AbilityDef` UI clutter while preserving every effect via more interesting structures (conditionals + signature-mechanic ties).

### 3.5 Defensive-Skill Pattern (Both Pools Hit It)

Both pools have one defensive skill (staff Spirit Walk pending, dagger Blade Ward). Both flagged for migration/replacement. **Pattern:** pure-DPS classes (which both WD and Asn are) shouldn't have defensive button bloat; defense comes from stats, gear, ascendancies, or proc-flavored skill side-effects.

This holds as a design rule going forward: when authoring Sorcerer/Berserker/Hunter pools (and the 8 new skills per class), no defensive-buff slot. Berserker's defensive layer is its rage/HP mechanic; Sorcerer's is conversion/avoid; Hunter's is range/positioning.

---

## 4. Audit-to-Action Map

### 4.1 Immediate Skill-Data Edits (this session or next)

| Action | Skill | Edit |
|---|---|---|
| Rework element | Haunt (staff) | `baseConversion: { from: 'physical', to: 'cold', percent: 100 }` → `chaos`; rename combo state to avoid Zombie Dogs collision |
| Rework element | Spirit Barrage (staff) | Convert to chaos; ailment vector becomes poison/Plagued |
| Rework element | Bouncing Skull (staff) | Convert to chaos chain; ailment becomes poison/Plagued |
| Rework element | Chain Strike (dagger) | `baseConversion: lightning` → `chaos` (or remove conversion for pure phys+bleed) |
| Rework slot | Blade Trap (dagger) | Reflavor as "Shadow Caltrops" or path (c) shadow-knife trap |
| Replace slot | Blade Ward (dagger) | Replace with Smoke Bomb spec |
| Adjust damage | Blade Dance (dagger) | Bump `weaponDamagePercent: 0.3` → `0.5` per hit OR add Exposed-consume bonus |

### 4.2 Schema-Dependent Edits (after §8.1 ComboStateSpec lands)

13 combo-state migrations across both pools (Hexed, Plagued, Haunted x2 to resolve, Soul Stack, Exposed, Deep Wound, Shadow Mark, Crit Stack, Shadow Momentum). Single atomic pass when ready.

### 4.3 Buff Cuts + Talent-Tree Migration (Phase B step 8)

6 buff cuts total. Each cut paired with a class-tree or ascendancy passive node spec drafted above. Done as part of class-tree authoring, not as a separate skill-data pass.

### 4.4 Phase C3 Expansion Targets (later focused content session)

16 new skills total (8 per pool) to reach 15-20 per class. Specs drafted in §1.4 and §2.4. NOT done now per the "lock fantasy first, then expand" sequencing.

---

## 5. Multi-Class Pair Impact (re-verifying Blood Cultist toggles)

The Blood Cultist (WD+Asn) pair brief in `MULTI_CLASS_PAIRS.md` §1 used existing skills as toggle bases. Re-verify against audit findings:

| Toggle | Base skill | Audit verdict on base skill | Toggle spec impact |
|---|---|---|---|
| Shadow Hex | Hex (WD) | KEEP + ADJUST | ✓ Toggle spec stable; light damage component if added would amplify Shadow Hex damage too |
| Shadow Swarm | Locust Swarm (WD) | KEEP + ADJUST | ✓ Toggle spec stable; combo-state migration affects toggle uniformly |
| Soul Reap | Soul Harvest (WD) | KEEP + ADJUST | ✓ Toggle spec stable |
| Hexstab | Stab (Asn) | KEEP + ADJUST | ✓ Toggle spec stable; Crit Cascade signature already lands Shadow Mark on crit, so Hexstab routes the crit toward Hexed instead — clean substitution |
| Cursed Wound | Viper Strike (Asn) | KEEP + ADJUST | ✓ Toggle spec stable; +50% potency snapshot gap is independent of toggle |

**All 5 Blood Cultist toggles survive the audit unchanged.** No toggle morph rework needed. The audit findings affect the BASE skills (combo migration, element rework, etc.) but the toggles themselves are insulated.

This is the correct outcome: the pair-design layer (toggles) sits ABOVE the skill-fantasy layer (audit findings). Audit changes propagate through bases without disturbing toggle specs.

---

## 6. Phase B Sequencing After Audit

Per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §12 Phase B status:

1. **✅ Step 7 — Fantasy briefs** (CLASS_FANTASY_BRIEFS.md) — landed; rewrite pending per §3.3 note (drop "primary weapon" framing)
2. **✅ Step 7b — 4-Layer Multi-Class Identity Model + Class-First Default-Weapon Model** — locked (§4.2 + §11)
3. **✅ Step 7c — Multi-class pair authoring kicked off** — Blood Cultist authored
4. **🔵 Step 9b — Skill-fantasy synergy audit** — **THIS DOC, landed 2026-04-26**
5. **Next: Step 9** — Morph retune pass for Assassin×Staff paradigm fights (§4.3)
6. **Next: Step 8** — Class tree structure design (path names, keystone specs, node distribution) — folds in the 6 buff migrations as concrete passive nodes
7. **Next: Briefs rewrite** — drop "primary weapon" framing; absorb audit findings (e.g., note WD's element axis is chaos with off-flavor exceptions flagged)
8. **Next: 9 remaining pair briefs** in `MULTI_CLASS_PAIRS.md`
9. **Phase C3 (later): Skill data edits** — apply audit recommendations (rework elements, replace Blade Ward, adjust Blade Dance, migrate combo states when §8.1 lands)
10. **Phase C3 (later): 16-skill expansion** — author the 8-per-pool gap-filler skills to reach 15-20

---

## 7. Audit Verdict Summary

| Pool | KEEP | KEEP+ADJUST | ADJUST | REWORK | REPLACE | Active CUT | Passive promote |
|---|---|---|---|---|---|---|---|
| WD × Staff | 1 | 5 | 0 | 3 | 0 | 2 buffs | 1 (Grave Injustice) |
| Asn × Dagger | 0 | 6 | 1 | 2 | 1 | 3 buffs | 0 |
| **Total** | **1** | **11** | **1** | **5** | **1** | **5 active buffs** | **1 passive promote** |

20 actives audited, 5 active buffs flagged for cut, 1 passive flagged for tree promotion. **Net "no changes needed":** 1 of 20 actives (Fetish Swarm). **Net "minor work":** 12 of 20 (combo migration + minor tuning). **Net "real rework":** 6 of 20 (5 reworks + 1 replacement). **Net "buff cleanup":** 6 of 6 (all migrated to passives).

The audit confirms the pools are mostly in good shape mechanically — the heaviest lift is the chaos-conversion rework (3 WD skills) and the Blade Ward replacement (Asn). Combo-state migration is the largest schema-dependent item but blocks on §8.1.

---

**End of skill fantasy audit.** Ready for application: pick which audit recommendations to apply to skill data first, or proceed to Phase B step 9 (morph retune) / step 8 (class trees with buff-migration passive nodes).

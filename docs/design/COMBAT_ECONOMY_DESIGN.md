# Combat Economy — Phase 3 Design Specification
**Synthesis verdict: adopt Tempo Ledger (P4) as the chassis — consume-all charge spender with a convex at-cap jackpot and spender-CD ≪ build-period, the only Gate-4 lever that survived adversarial re-derivation — grafted with CWS's (P2) wet-window tempo refunds and sizing invariants, Openings' (P3) ICD-throttled stochastic windows / soft-dry rule / execute band, and Deficit-by-Design's (P1) harness fixes, mana guard-rails, and payoff-window-shorter-than-creator-cooldown principle. Mana is demoted to a soft floor (never the Gate-4 lever); the binding currencies are charge stacks and GCD slots.**

> Produced 2026-07-12 by a 4-designer + 3-lens adversarial judging sprint (Phase 3 opener).
> All four proposals scored 18/30; tie broken on *which core mechanism survived its own judges*:
> P4's convex-at-cap consume-all was independently re-derived by its correctness judge to **+13–16% (PASS)**
> after every haircut, and called "structurally slot-order-proof." P1's mana-deficit collapsed to +4–10%
> (auto-displacement accounting refuted), P2's ledger to ~+6% (policy–ledger contradiction), P3's to a
> +11.4% knife-edge floor (renewal-formula and crit-calibration errors). This doc = the JUDGED, BINDING
> decision list. Companion: `docs/design/EFFECT_IR_DESIGN.md` (Phase 2). Gate numbering continues from
> its GATE 4 (gambit ≥ 10% over slot-order in `sim/gambit-ab.ts`).
>
> Owner constraints (binding): ≥10% Gate-4 delta · IR-as-data (engine adds only if small/generic/enumerated)
> · within-spec variation · idle-first (no-gambit player progresses; gambit is upside) · dagger kit first, bow second.

======= ADVERSARIAL VERDICT =======
MERGE with three design-breaking corrections applied. (1) **Linear per-stack scaling is a trap**: with generation-fixed total stacks (Σk is set by builder throughput, not by policy), a linear per-stack payoff pays the *spammer* — the whole anti-slot-order signal lives in the **discontinuous at-cap jackpot** plus the **stochastic window multiplier**, so both are load-bearing and neither may be tuned away independently. (2) **The IR path everyone claimed is not live**: `modifyState` no-ops for every stateId except `crit_stack`/`resonance_charge` (`src/engine/ir/dispatch.ts:287-344`, "Wave 3 wires the generic registry"), `icdSec` is a type with zero consumers, `stateChange{capReached|expire}` is never emitted, and `targetHasState`/`ctx.targetStates` is a dead gambit leaf — therefore v1 ships on the **live combo runtime** (`src/engine/combat/combo.ts` creators/consumers + `COMBO_STATE_SPECS`), which verifiably supports create-on-cast/crit, refresh-on-gain capped stacking (`combo.ts:203-208`), consume-all returning stack counts (`combo.ts:222-248`), and a multiplicative payoff fold (`weapons/dagger.ts:84`); the generic IR runtime lands as its own wave with parity gates. Gambits already see every combo state generically via the `stateCounts` fold (`rotationPolicy.ts:132-133`) — all rules below use `stateCountAtLeast`, never `targetHasState`. (3) **All arithmetic below is model prediction, not measurement**: every proposal was caught presenting paper math as simmed fact, so each number ships with a fair-floor variant, pre-registered tuning dials, and a hard sim gate that decides.

--- DECISIONS ---

* **E1 — CHANGE the binding scarcity from mana to charge stacks + GCD slots; mana becomes a soft floor.** Rationale: P1's 2.2–2.6× mana deficit was triple-refuted — offline sim ignores mana entirely (AFK would out-damage optimal play: disqualifying idle inversion), income is content-density-dependent (deficit balloons on bosses where the default player is weakest, dissolves in packs), and the auto-displacement accounting behind its +25.5% was wrong for this engine (autos fire on GCD-wait ticks, `tick.ts:450-451`). Rejected: P1's deficit ratio as the Gate-4 lever; overdraft/exhaustion states.
* **E2 — KEEP one charge resource per class as a consume-all builder/spender loop, unifying the two already-wired systems (Sorcerer `resonance_charge`, WD `soul_stack`) under one grammar.** Rationale: P4's unification means two classes are numbers-only retunes and claws/scythe prose becomes implementable pattern instances for free. Rejected: five bespoke systems; resurrecting the neutralized `classResource.ts` rage/momentum fields (they stay dead; the *names* are reborn as states).
* **E3 — CHANGE the payoff curve: modest linear per-stack ×(1+0.35k) PLUS a discontinuous Perfect jackpot (×1.8) only when the spend consumes exactly cap stacks.** Rationale: Σk is generation-fixed, so linear-only scaling rewards spam (more spends × base + same stack total — blind wins); the jackpot is what a spender-on-cooldown clock *mathematically cannot reach* (cd 4s × ~0.7 stacks/s ≈ 2.8 ≪ 5). This is the tie-breaking mechanism that survived re-derivation. Rejected: P2's pure per-stack (anti-convex trap); P1/P3's flat wet-multiplier alone (blind uptime captures it pro-rata).
* **E4 — KEEP spender cooldown ≪ build period (4s vs ~6.3s) so "always ready at cap" holds for the smart arm and the blind clock spends sub-cap.** Rationale: r ≈ 1.0 exclusivity on the jackpot without ever hard-gating a cast. Rejected: long spender CDs (re-creates the Viper→Deep-Wound phase-lock that produced dagger +0.5%).
* **E5 — KEEP a short stochastic window (Opening) layered on top: created on crit with an ICD, duration/period ≤ 0.35 at all crit levels, consumed by the spend, wet = ×1.5 + refund 2 stacks.** Rationale: P3's decorrelation rule (crit RNG + ICD can't be phase-locked by any fixed cadence) + P2's tempo-refund making holds cheap (C→0 in the autopsy inequality). Duration 2.5s covers gambit reaction (0.5s tick) + 1.0s cast so mid-cast latency can't eat the window. Rejected: deterministic setup→window (phase-lockable — the original failure); on-crit *charge generation* (see E6); window-only economy (P3's fair floor was +11.4%, too thin to carry the gate alone).
* **E6 — CHANGE charge generation to be flat and crit-independent (+1 per builder cast, +1 extra on authored conditionals like Blade Dance vs 3+ enemies).** Rationale: P4's `+2 on crit` was fataled — high-crit gear drives the blind 4s clock toward cap and collapses the jackpot exclusivity the whole delta rests on. Crit feeds the *window* axis instead, where higher rates are ICD-capped by construction. Rejected: crit/hit-count generation on the reference kit.
* **E7 — KEEP the gate cleared on the stack+jackpot axis alone; the window axis is margin and texture.** Rationale: robustness — if window tuning misses at fixture crit (~13%: 8 class base + 5 crude weapon, the number P3 never calibrated), the jackpot axis still models +12–14% by itself. One axis must carry the bar; two axes compound to the headline. Rejected: designs where the gate needs both axes to land simultaneously.
* **E8 — KEEP soft-dry everywhere (P3): every cast is always legal, a 0-stack spend is still ~1 Stab of damage, dry-at-cap is a designated park skill's job, and blind throughput must be ≥ 100% of today's.** Rationale: idle-first is binding; the gambit is upside, never a tax. The park skill (Viper — zero charge generation, real DoT damage) makes at-cap waiting *productive*, and — resolving P2's fatal "no held-for-X-seconds leaf" — **the park skill's own cooldown is the hold-timer the condition grammar lacks**: park fires once at cap, and when it's on cooldown the cap-dump rule below it fires. Rejected: dry penalties (<0.8×), hard charge gates, punishment states.
* **E9 — CHANGE the implementation path: v1 authors the dagger/staff economy on the live combo runtime; the generic IR StateInstance runtime is a separate, honestly-scoped wave that bow waits for.** Rationale: two feasibility judges independently proved the "pure IR data, zero engine work" claims false at `dispatch.ts:344` (modifyState no-op), `classTalentDispatcher.ts:302` (self-side `per:stateStacks` hardcoded to crit/resonance), and the never-emitted `capReached`/`expire` events. Shipping on the layer that provably runs beats pretending. Rejected: all-EffectRule authoring at launch; blocking dagger on Wave-3 completion.
* **E10 — KEEP all payoffs as generic, table-driven `ComboStateEffect` fields; CUT every per-stateId engine hardcode they replace.** New fields (each read once at the existing consume fold, any creator→consumer pair may use them): `incDamagePerStackConsumed`, `capBonus{incDamage, advanceOthersSec}`, `refundStacks{stateId, amount}`, `detonateDotPercent` (retires the `cs.stateId === 'deep_wound'` special case at `weapons/dagger.ts:92-105`). Rationale: the forbidden pattern is skill-named engine branches; the fold site is already data-driven per pair. Rejected: `assassinate.detonatePercent`-style skill-named RULES ids; new bespoke tick.ts blocks (the Saturated/Guarded/Primed anti-pattern).
* **E11 — KEEP the multiplicative consume fold as the wet/dry vehicle and compute ALL balance math multiplicatively.** Rationale: `damageMult *= (1 + incDamage/100)` per consumed state is verified engine behavior (`weapons/dagger.ts:84`); P1's judge showed additive arithmetic mis-prices full-wet spends by ~50%. Flat `burstDamage` riders (the +50 that measured +0.5%) are retired from the reference kit. Rejected: flat riders as primary payoffs.
* **E12 — KEEP mana guard-rails only: clamp regen credit in `canAffordManaCost` to `min(dtSec, 0.25)` and cap `packProcGain` kill credit at `min(mobKills, 3) × onKillGain`; retune dagger costs so full spam *brushes* the floor (`minMana` texture), and change nothing else.** Rationale: both are verified one-line bug fixes (throttled-tab overdraft `manaTick.ts:45-49`; inverted-difficulty windfall `tick.ts:3256-3260`) worth landing regardless of design; `CLASS_MANA_CONFIG` otherwise unchanged keeps blast radius near zero and avoids P1's boss/pack income swings. Rejected: manaCost stats, spendMana verbs, blood magic, maxMana talents (no StatKey exists — an undeclared moderate ask), costing autos.
* **E13 — KEEP gambit authoring on today's working leaves only: `stateCountAtLeast`/`stateCountBelow` (via the generic `stateCounts` fold), `skillReady`, `enemyCountAtLeast`, `targetHpBelow`, `targetLacksTag`, `minMana`, `inBossFight`.** `targetHasState` is declared DEAD for gambits until `ctx.targetStates` is populated (E2 wave). Ship preset gambits per spec (the E8 park/dump idiom, the wet-spend rule) so non-authors learn the economy from working examples. Rejected: rules written against unpopulated context (three of four proposals shipped at least one permanently-false flagship rule).
* **E14 — KEEP the execute band as a free second decision axis: +75% Assassinate vs `targetHpBelow: 0.30`, authored as a covenant-passive ScopedMod (`scope:{skillId}`, `if:{targetHpBelow}`).** Rationale: P3's one fully-verified zero-engine claim (targetHpFraction is threaded through both the talent fold and `buildRotationCond`), and it finally implements the advertised-but-dead Culling Strike (`classes.ts:83`). Rejected: engine execute mechanics; putting the mod on SkillDef (skills can't carry self-mods yet).
* **E15 — CHANGE the harness before any measurement: reset `combatPhase`/`currentHp` on `zone_defeat` (or score damage-per-alive-second), hold the equipped bar identical across arms, ≥10 seeds with CI, vary encounter shape (ST pack + 3-pack + boss window), and log realized crit rate, mana floor, stack-at-spend and wet-rate histograms per arm.** Rationale: the bow −63% was ~40% death-confound + loadout confound; perpetual 3-packs make `enemyCountAtLeast:3` vacuous and inflate proc income; the histograms are what falsify this doc's model cheaply. Rejected: trusting any single-seed delta < 5%.
* **E16 — KEEP telegraphy in-scope for the reference kit wave: Momentum pips (5-slot bar), Opening flash on the enemy frame + Assassinate button glow, oversized "PERFECT"/"wet" hit floaters, and an overcap flick when a builder cast wastes a stack.** Rationale: all three watchability judges dinged all four proposals for shipping an invisible economy; a 2.5s window is 5+ render ticks — legible only if drawn. `ClassResourceBar.tsx` is dead code; replace with a generic `StateChips` component driven by the same `stateCounts` the gambit sees. Rejected: shipping silent and calling UI "polish."
* **E17 — KEEP within-spec variation as payoff-*shape* talents (one data node each), not knife-edge number tuning.** The optimal gambit must *flip*, not shift: Perfect-at-cap vs flat-at-3 vs DoT-snapshot spend vs overcap-procs (see §4). Rationale: E5's marginal-order critique — a total order admits one solved gambit; changing the payoff shape changes the order itself. Rejected: variation via ±10% number nudges or content splits alone.
* **E18 — KEEP the shipped default slot orderings as specified data (per class), and gate the idle floor against the WORST of three plausible orderings.** Rationale: P4's judge showed builder-first orderings can starve a last-slot spender under saturation; the floor is only real if measured adversarially. Default dagger order: `[assassinate, viper, blade_dance, chain_strike, stab]` (spender-first clusters best for blind play). Rejected: quoting the floor for one favorable ordering.
* **E19 — CUT from this phase (explicitly out of envelope):** `interval` trigger engine support, skill charges, cast-time/recovery manipulation, manaCost-mult stats, cross-resource conversion, enemy scripted phases, per-target ICDs, gear-affix effects. Rationale: all rated medium/expensive in the IR audit and none are needed to clear the gate. Rejected: scope creep disguised as economy design.

## 1. Universal economy layer (all five classes)

Every class runs one loop: **builders → charge state (cap) → consume-all spender**, with a **Perfect jackpot** at cap, a **stochastic Opening window** multiplying wet spends, and a **park skill** for at-cap waiting.

**Sizing invariants** (per-kit design contract, CI-assertable — graft of P2's I1–I6 with corrections):

| # | Invariant | Value |
|---|---|---|
| U1 | Cast supply Σ(1/cd) vs realized cast capacity (per-skill intervals; instants ≈ 0.25s recovery, casts ≥ 1.0s — there is **no** flat GCD budget, per the P4 correctness judge) | supply ≥ 1.25 × capacity; verified per-kit in sim, not by the naive Σ1/cd formula |
| U2 | Spender cd vs build period | cd ≤ 0.65 × (cap ÷ smart gen rate) |
| U3 | Charge generation | flat per-cast, crit-independent (E6) |
| U4 | Blind window uptime | duration ÷ renewal period ≤ 0.35 at ALL crit levels; renewal period = ICD + 1/critRate (the correct formula — P3 divided instead) |
| U5 | Perfect jackpot | reachable only via ≥ cap÷gen seconds of not-spending; blind P(jackpot) ≤ 15% |
| U6 | Idle floor | blind ≥ 100% of pre-redesign throughput AND ≥ 85% of smart, measured on the worst of 3 default orderings |
| U7 | Overcap | silent waste + UI flick; park skill designated per kit |
| U8 | Mana | full-spam drain ∈ 85–105% of income (brushes floor; never the gate) |

**Mechanics vocabulary (v1, combo runtime):** state defs in `COMBO_STATE_SPECS` (`defaultDuration`, `maxStacks`, refresh-on-gain); creation via `COMBO_STATE_CREATORS` (`createOn: 'onCast'|'onCrit'`, `minTargetsHit`) extended per §7; consumption via `COMBO_STATE_CONSUMERS` + the E10 generic payoff fields; gambit visibility free via `stateCounts`.

## 2. Dagger / Assassin — reference redesign

### 2.1 States

```
momentum   { side:'player', maxStacks:5, defaultDuration:10, refresh-on-gain }   // the ledger
opening    { side:'player', maxStacks:1, defaultDuration:2.5,
             createOn:'onCrit' from dagger_stab + dagger_chain_strike, icdSec:6 } // the window
exposed    → RETIRED (folded into opening)
deep_wound → RETIRED at baseline; reborn as Venomcraft talent state (§4)
shadow_mark→ per-skill table KEPT except the dagger_assassinate row (cdRefundPercent:50 retired —
             it would confound the E4 cadence; replaced with { incDamage: 25 })
```
Consumption matrix change (fixes the P2-judge finding that builders eat windows): `opening` and `momentum` are consumed **only** by `dagger_assassinate` and `dagger_fan_of_knives`; cross-skill states (`chain_surge`, `dance_momentum`, `shadow_momentum`) keep current wiring.

### 2.2 Skill table (edits to `src/data/skills/dagger.ts` + `combo.ts` tables)

| Skill | Kind | Mana | CD | Damage | Economy role |
|---|---|---|---|---|---|
| Stab | instant (0.25) | 5 | **2** (was 3) | 1.0×wd | +1 Momentum; crit → Opening (icd 6s shared) |
| Chain Strike | cast 0.7 | 8 | 4 | 0.7×wd chain 2 | +1 Momentum; crit → Opening; keeps Chain Surge |
| Blade Dance | cast 1.2 | 12 | 5 | 3×0.5×wd | +1 Momentum, +1 more if 3+ targets hit (`minTargetsHit`) |
| Viper Strike | cast 0.9 | 12 | 5 | 0.7×wd + poison 5s ×1.5 | **park skill** — zero Momentum, real DoT |
| Shadow Mark | cast 1.0 | 8 | 6 | 0.5×wd | utility line, per-skill table per §2.1 |
| **Assassinate** | cast **1.0** (was 1.4) | **22** (was 30) | **4** (was 8) | **0.85×wd + 5** (was 2.2×wd+12) | consume ALL Momentum: ×(1+0.35/stack); **Perfect** (5 consumed): ×1.8 + advance all *other* CDs 1s (self-excluded — kills the runaway-loop fatal); **wet** (Opening live): consume it, ×1.5 + refund 2 Momentum |
| Fan of Knives | cast 1.0 | 14 | 6 | 0.6×wd+4 all enemies | **AoE spender** on the same pool: ×(1+0.20/stack) to all — ST-vs-AoE arbitration slot-order can't do |
| Shadow Dash | instant | 10 | 5 | 0.8×wd | keeps Shadow Momentum; Dashweaver talent adds 2-stack tempo spend (§4) |
| Shadow Veil / Blade Trap | unchanged | | | | utility |
| *(covenant passive)* | — | — | — | — | Culling: Assassinate +75% vs `targetHpBelow:0.30` (E14) |

Dry-at-0 Assassinate = 56 damage for 22 mana — legal, ~1 Stab (soft-dry, E8). Full stack: Perfect+wet+culling = 56 × 2.75 × 1.8 × 1.5 × 1.75 ≈ **728**, the watchable jackpot moment (multiplicative fold, E11).

### 2.3 Preset gambit (ships as the spec default; every leaf verified live)

```
1. all[stateCountAtLeast(opening,1), stateCountAtLeast(momentum,3), skillReady(dagger_assassinate)]
     → castSkill dagger_assassinate                       # wet spend (reacts to the window)
2. all[targetHpBelow(0.30), stateCountAtLeast(momentum,3)] → castSkill dagger_assassinate   # culling band
3. all[stateCountAtLeast(momentum,5), stateCountBelow(opening,1)] → castSkill dagger_viper_strike  # park at cap
4. all[stateCountAtLeast(momentum,5), skillReady(dagger_assassinate)] → castSkill dagger_assassinate # cap dump
     # rule 3's cooldown IS the hold timer: park once (~1–2s), then rule 4 fires — no time leaf needed (E8)
5. enemyCountAtLeast(3) → castSkill dagger_blade_dance    # +2 gen in packs / FoK variant for AoE builds
6. → castSkill dagger_chain_strike, minMana: 22           # reserve the spend budget
7. → castSkill dagger_stab                                # window farming (crit source)
```

### 2.4 Gate-4 arithmetic (model, 600s ST, fixture: wd≈60, crit 13%, dt 0.5s — falsified/confirmed by E15 histograms)

Generation: blind (default order, spender slot 0) ≈ 0.70 stacks/s; smart (builder priority) ≈ 0.80/s. Build-to-5 = 6.3s > cd 4 ✓ (U2). Windows: crits ≈ 0.17/s → renewal = 6 + 1/0.17 ≈ **11.9s** → ~50 windows; blind uptime 2.5/11.9 = **21%** (at endgame 40% crit: 6+1.9 = 7.9s → 32% ≤ 35% ✓ U4).

| | spends N | k̄ at spend | Perfect % | wet % | spender damage |
|---|---|---|---|---|---|
| **Blind** (fires on the ~4.5s slot clock; k̄ = 420 stacks ÷ 133; Perfect only via pack-variance) | 133 | 3.16 | 8% | 21% | 133 × 56 × (1+0.35·3.16) × (1+0.08·0.8) × (1+0.21·0.5) = **18,440** |
| **Smart** (§2.3: spends only Perfect, wet-at-≥3, or post-park dump; wet refunds add ~45 stacks) | ~100 | 4.7 | 72% | 45% | 60 Perfect-dry ×277 + 25 wet@4 ×202 + 15 Perfect+wet ×416 = **27,900** |

Shared lines (autos + builders + Viper DoT) ≈ 30,500 both arms; smart pays ~−800 park/priority cost; blind pays ~33 extra spender-cast GCDs ≈ −900 of builders (≈ cancels). **Blind ≈ 48,900 (81.5 DPS — ≥ today's 80, U6 ✓); Smart ≈ 57,600–58,300 → Δ ≈ +18–19%.**

**Fair floor** (simultaneous haircuts: blind N 125/k̄ 3.4/Perfect 12%/wet 18%; smart gen 0.78/N 94/Perfect-share 70%): blind ≈ 48,800, smart ≈ 53,900 → **+10.4%** — at the bar, which is why the dials below are pre-registered *in the data*, ordered by safety: (d1) Perfect ×1.8 → ×2.0 (≈ +2.5 pts); (d2) Opening 2.5 → 3.0s (≈ +1.5 pts, smart-heavy); (d3) Assassinate base 0.85 → 0.75×wd (shaves blind spam ≈ +1.2 pts). In the autopsy inequality: T ≈ 6s, D ≈ 81 → need ≥ 48.9/window; delivered (Perfect+wet vs blind-average spend) ≈ 277·0.72 + wet term − park cost ≈ **115/window ≈ 2.3× the bar** before dials. ~100 decisions × ~115 swing ≫ 10-seed noise floor.

## 3. Bow / Hunter — second pass (lands after Wave E2)

- **`quiver` (cap 6, 10s refresh)**: Arrow Shot (cd 3) +1, **+2 vs `mark`-tagged target** — Mark upkeep finally load-bearing; Rapid Fire (cd 4) +1 per hit ×3 = the **overcap trap** (casting above 3 charges wastes gains, U7). Elemental arrows = chargeless park/filler.
- **`vulnerable` window (2.5s, icd 6s)**: created on **crit vs a Marked target** — P2's layered pattern the judges praised: Mark upkeep is table stakes (deterministic), Vulnerable timing is the skill test (stochastic, U4-compliant).
- **Snipe** (cd 10→**6**, mana 25): consume-all, ×(1+0.30/stack); **Perfect@6**: guaranteed crit + ×1.6; **wet**: ×1.4 + refund 2. **Pierce Volley**: AoE spender, ×(1+0.15/stack) + 1 pierce per 2 consumed — second spender on one pool (arbitration axis).
- Execute: Tracking Shot's prose "+100% below 50%" wired as a real conditional mod at 35%.
- Rapid Fire stays **in both arms'** loadout (the −63% was loadout-confound + death-spiral; E15 forbids unslotting).
- Model shape identical to §2.4 with blind k̄ ≈ 3.3/6 and jackpot exclusivity via cd 6 < build 7.5s → projected **+14–18%**; same dials.

## 4. Within-spec variation (each = one data node; each flips the optimal gambit, E17)

| Spec | Node | Payoff-shape change | Resulting gambit |
|---|---|---|---|
| Blademaster | **Perfect Rhythm** | Perfect also refunds 2 Momentum | tighter cap-only cycling, CDR/gen stats |
| Blademaster | **Ruthlessness** (mut. excl.) | replaces per-stack+jackpot with flat ×1.9 at ≥3 consumed | spend-fast on the cd-4 clock; rules 3–4 deleted; values flat damage |
| Venomcraft | **Fester** | Assassinate gains `detonateDotPercent: 150` (E10 field; deep_wound reborn as the license state on Viper crits) | Viper leaves the park role, DoT-snapshot-then-spend timing |
| Venomcraft | **Overflow** | overcapped Momentum gains deal 30 chaos (needs `capReached`, Wave E2) | builder-spam cap-camping, Assassinate optional |
| Shadowdancer | **Dashweaver** | Shadow Dash spends 2 Momentum → advance others 1.5s (partial-consume helper) | many-small-spends tempo loop vs big-spend |
| any | income nodes (P1 graft) | `refundMana` on crit w/ icd vs on kill | flips `minMana` floors and filler priority |

Plus the build-independent axes: builder mix (Stab-window-farming vs Dance-AoE), FoK-vs-Assassinate arbitration by content, culling-band usage, park-skill choice.

## 5. Per-class resource table (sketch)

| Class | Charge (cap) | Builders | Spender / Perfect | Window | Status |
|---|---|---|---|---|---|
| Assassin | `momentum` (5) | Stab/Chain/Dance +1 | Assassinate ×(1+0.35k), Perfect ×1.8; FoK AoE | `opening` (crit, icd 6, 2.5s) | §2, Wave E1 |
| Hunter | `quiver` (6) | Arrow +1 (+2 vs mark), Rapid +1/hit | Snipe / Pierce Volley, Perfect = guaranteed crit ×1.6 | `vulnerable` (crit-vs-marked) | §3, Wave E3 |
| Sorcerer | `resonance_charge` (exists, 5/elem) | existing generators | Void Blast/Elemental Burst: flat +25 → ×(1+0.30 per charge consumed); Perfect = Convergence@cap | Convergence field (exists) | numbers + one fold change in the tick.ts resonance consume path (flagged, not "pure data") — Wave E4 |
| Witchdoctor | `soul_stack` (exists, 5) | Soul Harvest | Bouncing Skull/Mass Sacrifice: keep ×1.5/×2.0 per-state, add +15% per minion detonated; per-stack via existing `extraChains` | 4-of-5-states (exists) | retune, Wave E4 |
| Berserker | `fury_charge` (5) | +1 on hit **and** +2 on hitTaken (blend fixes the overgear-collapse fatal) | flail heavy slam ×(1+0.35k), Perfect ×1.8 + heal 5% | DEFERRED — `frenzied` while-hysteresis is hardcoded (`tick.ts:738-744`); window design waits on E2 emission | Wave E4, generation needs generic runtime |
| Claws / Scythe | Frenzy / Souls | prose → pattern instances of this grammar | free once E2 lands | — | Wave E5+ |

## 6. Implementation waves & hard gates

* **WAVE E0 — measurement + guard-rails** (sim + 2 one-liners): E15 harness fixes in `sim/gambit-ab.ts`; E12 mana clamps. **GATE E0**: 10-seed CI on the *unmodified* game reproduces dagger Δ ≈ 0 ± 2% and bow Δ ∈ [−45%, −30%] alive-DPS (confirms the death-confound decomposition) — the null controls that prove the instrument.
* **WAVE E1 — dagger reference kit** (combo-runtime data + §7 asks 1–4 + StateChips/floaters UI from E16): §2 in full, preset gambit + 3 default orderings shipped. **GATE E1 (= project Gate 4)**: dagger smart-vs-blind ≥ **+10%** total damage, 10-seed CI lower bound (model says +18–19%); blind ≥ 100% of pre-redesign throughput; worst-of-3-orderings blind ≥ 85% of smart; histogram check: blind stack-at-spend k̄ ≤ 3.5 and Perfect ≤ 15%. If CI lower bound < 10%: apply dials d1→d3 in order, re-run; if still < 10% after d3, STOP and re-tune before any further class work.
* **WAVE E2 — engine generics** (§7 asks 5–8): dispatch `icdSec`/`limit`; scoped generic StateInstance runtime (`modifyState add/consume/clear` + `stateChange` emission incl. `capReached`/`expire`); enrich proc/mod ConditionContexts with combo states (mirroring `rotationPolicy.ts:132`); hoist combo create/consume into `dataDriven.ts`. **GATE E2**: legacy-vs-generic parity goldens green; Pass-0 closure rejects unknown stateIds; approve-here/reject-there mana-gate invariant test green.
* **WAVE E3 — bow/hunter** (§3, pure data on E2 surface). **GATE E3**: bow ≥ +10% CI lower bound, matched loadouts.
* **WAVE E4 — sorcerer/WD retunes + berserker fury**. **GATE E4**: each class ≥ +10% OR a documented owner-signed exception; berserker additionally gated on generation staying live when overgeared (zero-hits-taken sim).
* **WAVE E5 — variation + presets**: §4 nodes, per-spec preset gambits, claws/scythe conversion. **GATE E5**: for dagger and bow, two authored same-spec builds each prefer a *different* preset by ≥ 3% (sim cross-check) — the within-spec requirement, measured.

## 7. Engine asks (consolidated, exhaustive — nothing else is requested)

**CHEAP (Wave E0/E1):**
1. `sim/gambit-ab.ts`: death reset (or per-alive-second scoring), matched bars, ≥10 seeds + CI, encounter mix, per-arm histograms (crit, mana floor, k-at-spend, wet rate). Sim-only.
2. `manaTick.ts:45-49`: clamp regen credit to `min(dtSec, 0.25)`. One line.
3. `tick.ts:3256-3260`: kill credit `min(mobKills, 3) * onKillGain`. One line.
4. Combo-layer extensions (all generic, table-driven): (a) `COMBO_STATE_CREATORS` value widened to `ComboStateConfig | ComboStateConfig[]` (Stab needs momentum-on-cast + opening-on-crit); (b) `icdSec?` on `ComboStateConfig` with an ephemeral per-stateId last-created map; (c) `stacksPerGain?` (default 1) for Blade Dance/Rapid Fire; (d) the four E10 `ComboStateEffect` payoff fields read at the `weapons/dagger.ts` fold (deleting the deep_wound hardcode); (e) `consumeStacks(states, stateId, n)` partial-consume helper (Dashweaver only — may slip to E5).
5. UI: generic `StateChips` (pips + window flash + overcap flick) fed by `stateCounts`; PERFECT/wet hit-floater tags. Presentation, enumerated per E16.

**MODERATE (Wave E2 — the one honest big ask, scoped):**
6. Generic StateInstance runtime completing `dispatch.ts:344`: `modifyState add/consume/clear` for any `STATE_DEFS` id + `stateChange{gain|consume|expire|capReached}` emission. (This is planned Wave-3/D31 work — a sequencing dependency, not new architecture.)
7. `dispatchEvent` honors `icdSec` + `limit` (per-rule fire-timestamp store; offline-idempotent).
8. Hoist combo create/consume + the E10 fold out of `weapons/dagger.ts` into the shared `dataDriven.ts` path; populate combo states into proc-time and mod-fold ConditionContexts (and `ctx.targetStates` for gambits) exactly as `buildRotationCond` already does.

**EXPLICITLY NOT REQUESTED (E19):** interval trigger, skill charges, cast-time/cost-stat manipulation, blood magic, maxMana StatKey, per-target ICDs, enemy phases.

## 8. OPEN QUESTIONS (owner)

1. **Gate E1 authority on dials**: if the CI lands at +8–10%, may the design lead apply dials d1–d3 unilaterally, or does each retune need sign-off? (Model floor is +10.4% — this will plausibly matter.)
2. **Wave E2 scope acceptance**: the generic state runtime is the one moderate ask and bow is sequenced behind it. Acceptable for Phase 3, or should bow attempt a combo-layer bridge (uglier, faster)?
3. **Perfect jackpot heat**: ×1.8 base (dial to ×2.0) makes the top hit ~13× a Stab with culling+wet. Comfortable ceiling for damage-number legibility, or cap the stacked multiplier?
4. **Shadow Mark's Assassinate CD-refund retirement** (§2.1) removes today's strongest tempo payoff. Sign off, or should Shadowdancer get it back as a talent (interacts with E4's cadence math — needs a sim check)?
5. **Offline sim fidelity**: offline runs slot-order with infinite mana. Under this design offline ≈ the blind arm (mana is soft, charges simulate fine) — confirm we accept "offline = blind-policy rates" as the spec, and that the gambit's +10–19% applying only online is the intended idle incentive.
6. **Berserker window identity**: `frenzied` hysteresis is hardcoded and its gambit exposure is pinned; do we (a) reuse frenzied as Berserker's window (engine touch), or (b) give it a `capReached` fury window post-E2, or (c) ship Berserker jackpot-only?
7. **Secondary/buff skills are still free** (Blade Fury 2× for 0 mana, no store deduction). This design doesn't touch them; flag for a Phase 3 follow-up wave or accept the leak?
8. **Arena** stays slot-order per D22 — the arena renderer will show Momentum pips but players can't gambit there. Acceptable asymmetry?

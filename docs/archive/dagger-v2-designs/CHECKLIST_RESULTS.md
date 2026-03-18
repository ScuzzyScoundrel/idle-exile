# Validation Checklist Results — Dagger v2.0

> Per-skill validation results. Moved from VALIDATION_LOG.md to keep the
> duplication-checking system lean.
>
> **Reference:** See VALIDATION_LOG.md for anti-duplication rules and pattern registry.
> **Reference:** Each skill JSON contains `mechanicCheck` per branch (3-mechanic rule).

---

## Stab — COMPLETE

**Predator Branch:**
- [x] T1a: Has condition (consecutive hits), references Stab's fast cycle
- [x] T1b: Has condition (consecutive hits same target), R2 changes mechanic
- [x] T2: Proc leads description (Predator state), escalating pattern
- [x] T2b: Has condition (after crit), refreshing buff
- [x] T3a-c: All conditional stats, NO procs
- [x] T4: Gated proc (crit → Vulnerable), enhances combo state
- [x] T4b: Supports T4 state, NO new proc
- [x] T5: Consistent (reliable free resets) vs Risky (kill chain, penalty on sustained)
- [x] T6: Catastrophic (15% on crit → Death Mark)
- [x] T7: Tensions with T6 (crits = mark delivery only, removes crit damage)
- [x] 3-mechanic rule: PASS

**Plague Branch:**
- [x] T1a: NOT "applies 1 poison" — extends ailment duration per consecutive hit. UNIQUE.
- [x] T1b: Per unique ailment type, NOT generic DoT
- [x] T2: Gated proc (3+ stacks → burst), threshold matches hit rate
- [x] T3a-c: All conditional stats, NO procs. T3b combo modification documented.
- [x] T4: State-shift (Venom Frenzy at 5+ stacks), ICD prevents perma-uptime
- [x] T5: Consistent (multiplicative scaling) vs Risky (detonate all, reset to 0)
- [x] T6: Catastrophic (kill with stacks → spread)
- [x] T7: Tensions with T6 (single ailment only vs spread ALL)
- [x] 3-mechanic rule: PASS

**Ghost Branch:**
- [x] T1a: Skill-specific defensive (dodge stacks from hits)
- [x] T1b: Sustain (leech + life on hit), R2 has meaningful change
- [x] T2: Reactive proc (on dodge → counter + Fortify + CD reset)
- [x] T3a-c: All conditional stats, NO procs. T3b combo modification documented.
- [x] T4: State-shift (Shadow Form on 2 dodges), ICD prevents perma-uptime
- [x] T5: Consistent (dodge heals, evasion→damage) vs Risky (counter 2x, +dmg taken)
- [x] T6: Catastrophic (20% on dodge → 200% counter + guaranteed crit)
- [x] T7: Tensions with T6 (doubled procs but no leech, -10% HP)
- [x] 3-mechanic rule: PASS

**Per-Skill:** 39 nodes, all registered, no name duplicates, combo mods documented.

---

## Blade Dance — COMPLETE

**Predator:** Kill redirect, Slaughter state, Reaper's Dance. All sequential-target mechanics. PASS.
**Plague:** Distributed infection, Plague Link, Pandemic Dance. All multi-target linking. PASS.
**Ghost:** Scattered Threat, Defensive Scatter, Phantom Dance. All pack-defense. PASS.
**Per-Skill:** 39 nodes, zero duplication with Stab, combo mods documented.

---

## Fan of Knives — COMPLETE

**Predator:** Target count scaling, Knife Storm, Annihilation. All AoE-specific. PASS.
**Plague:** Mass application, Plague Wave, Toxic Storm. All AoE ailment. PASS.
**Ghost:** Suppressive Fire, Smoke Screen, Retaliating Fan. All AoE defense. PASS.
**Per-Skill:** 39 nodes, mechanicCheck in JSON, combo mods documented.

---

## Assassinate — COMPLETE

**Predator:** Cooldown investment, Killing Intent, Perfect Kill. All heavy-hit/execute. PASS.
**Plague:** Spacing potency, Venom Executioner, Pandemic Execution. All burst-ailment. PASS.
**Ghost:** Shadow Charge, Shadow Strike, Death From Shadows. All dodge-setup burst. PASS.
**Per-Skill:** 39 nodes, mechanicCheck in JSON, combo mods documented.

---

## Viper Strike — COMPLETE

**Predator:** Spacing potency, Venom Crit (FIXED: extend durations), Detonation Strike. All DoT-crit. PASS.
**Plague:** Deep Venom, Venom Mastery, Plague Strike. All potency scaling. PASS.
**Ghost:** Serpent Reflexes, Toxic Counter, Venom Nova. All dodge-ailment. PASS.
**Per-Skill:** 39 nodes, Venom Crit fixed, mechanicCheck in JSON.

---

## Chain Strike — COMPLETE

**Predator:** Escalating Chains, Chain Lightning, Chain Annihilation. All chain-specific. PASS.
**Plague:** Contagion Chains, Plague Chain, Pandemic Chain. All chain-carry ailment. PASS.
**Ghost:** Evasive Chains, Chain Counter, Phantom Chain. All chain-defense. PASS.
**Per-Skill:** 39 nodes, mechanicCheck in JSON, combo mods documented.

---

## Shadow Mark — COMPLETE

**Predator:** Repeated Marks, Hunter's Focus, Death Warrant. All mark-setup. PASS.
**Plague:** Plague Mark, Festering Mark, Pandemic Mark. All mark-ailment. PASS.
**Ghost:** Threat Mark, Shadow Warden, Phantom Mark. All mark-defense. PASS.
**Per-Skill:** 39 nodes, mechanicCheck in JSON, combo mods documented.

---

## Blade Ward — COMPLETE

**Predator Branch:**
- [x] T1a: Counter-hit crit scaling (per counter in ward)
- [x] T1b: Hits received → next skill damage (incoming → offensive ramp)
- [x] T2: Counter-hit crit → Riposte Fury (100% WD counters, crit mult)
- [x] T2b: Counter damage scales with ward TIME REMAINING (front-loaded)
- [x] T3a-c: All conditional stats, NO procs
- [x] T4: Guarded enhanced +35% + Vulnerable + counter-crit bonus
- [x] T4b: Supports Riposte Fury
- [x] T5: Consistent (40% crit floor + extension) vs Risky (120% WD, -DR)
- [x] T6: 4+ hits + 2+ crits → 250% WD mega-counter
- [x] T7: Counters 100% WD, DR=0%, Exposed on crit. Tensions: pure offense, no defense.
- [x] 3-mechanic rule: PASS

**Plague Branch:**
- [x] T1a: Counter-hit ailment potency (unique to BW)
- [x] T1b: Hits received extend ATTACKER's ailments (defense→offense)
- [x] T2: Counter ailment threshold → Toxic Retaliation state
- [x] T2b: Counter-hits apply Weakened
- [x] T3a-c: All conditional stats, NO procs
- [x] T4: Counter ailment stacks → Plague Guard (splash)
- [x] T5: Consistent (2x potency) vs Risky (ward-expiry detonation)
- [x] T6: 5+ stack attacker during ward → burst + spread
- [x] T7: Counters 0 dmg, ALL ailment types. Tensions: pure ailment, no direct.
- [x] 3-mechanic rule: PASS

**Ghost Branch:**
- [x] T1a: Ward DR increase (unique: modifies built-in DR)
- [x] T1b: Counter-hit healing (unique trigger)
- [x] T2: Dodge/block during ward → enhanced counter + Fortify + refresh
- [x] T2b: Ward extension per defensive event
- [x] T3a-c: All conditional stats, NO procs. T3b reduces Guarded threshold.
- [x] T4: 2 dodges during ward → Iron Guard (+25% DR, 100% WD, Weakened)
- [x] T5: Consistent (Fortify + heal) vs Risky (120% WD crit counters, +dmg taken)
- [x] T6: 5+ ward hits → 200% WD AoE + 15% heal + 3 Fortify
- [x] T7: Permanent ward at 10% DR, 30% WD counters. Tensions: always defended, always weaker.
- [x] 3-mechanic rule: PASS

**Per-Skill:** 39 nodes, all registered, no name duplicates.

---

## Blade Trap — COMPLETE

**Predator Branch:**
- [x] T1a: Arm-time damage scaling (unique to traps)
- [x] T1b: Slot position awareness (unique to idle rotation)
- [x] T2: Detonation crit + arm time → Primed state
- [x] T2b: Trigger-enemy bonus damage
- [x] T3a-c: All conditional stats, NO procs
- [x] T4: Mass Exposed + execute threshold on detonation
- [x] T5: Consistent (always-crit, faster arm) vs Risky (+80%, kill/no-kill swing)
- [x] T6: 2+ detonation kills → free second detonation
- [x] T7: 2 trap charges, easier T6. Tensions: longer CD, weaker per-trap, non-trap penalty.
- [x] 3-mechanic rule: PASS

**Plague Branch:**
- [x] T1a: Detonation ailments at 2-2.5x potency
- [x] T1b: Post-detonation Toxic Zone (ground effect, unique)
- [x] T2: Detonation on ailmented target → Plague Trap state
- [x] T2b: Extra ailment instances per detonation target
- [x] T3a-c: All conditional stats, NO procs. T3b auto-applies Saturated.
- [x] T4: Multi-target detonation ailment → Toxic Detonation state
- [x] T5: Consistent (3x potency, doubled zone) vs Risky (detonate existing, lose stacks)
- [x] T6: 5+ stack kill → spread all ailments + re-arm trap
- [x] T7: 0 direct dmg, 4x potency, T6 any kill. Tensions: pure ailment, no direct damage.
- [x] 3-mechanic rule: PASS

**Ghost Branch:**
- [x] T1a: Dodge → instant arm (removes 1.5s delay)
- [x] T1b: Passive dodge while trap is armed
- [x] T2: 2+ detonation targets → Trap Shield (DR + Fortify per target)
- [x] T2b: Dodge → faster trap placement
- [x] T3a-c: All conditional stats, NO procs. T3b grants Guarded from detonation.
- [x] T4: 2 dodges while trap armed → Fortified Blast (enhanced detonation)
- [x] T5: Consistent (always Trap Shield, heal per Fortify) vs Risky (+50% + counter, wasted penalty)
- [x] T6: 15% on dodge → free detonation at attacker
- [x] T7: Mirror Trap every dodge. Tensions: placed traps weaker, dodge traps primary.
- [x] 3-mechanic rule: PASS

**Per-Skill:** 39 nodes, all registered, no name duplicates.

---

## Shadow Dash — COMPLETE

**Predator Branch:**
- [x] T1a: First-encounter guaranteed crit (unique to movement opener)
- [x] T1b: Empowered skill crit bonus
- [x] T2: Dash + follow-up crit → Rush state (CD reset)
- [x] T2b: Damage scales with OTHER skills' CD state (unique rotation awareness)
- [x] T3a-c: All conditional stats, NO procs
- [x] T4: Momentum + crit + kill → Hunter's Dash (SD reset + Vulnerable)
- [x] T5: Consistent (crit/mult + 4s CD) vs Risky (+40%, kill=reset, no-kill=+2s)
- [x] T6: Empowered crit+kill → echo hit at 150%
- [x] T7: Empower 2 skills, 3s CD. Tensions: SD weak, non-empowered penalized.
- [x] 3-mechanic rule: PASS

**Plague Branch:**
- [x] T1a: Pass-through ailment application (unique to movement)
- [x] T1b: Empowered skill ailment potency
- [x] T2: Pass through ailmented enemies → Plague Rush state
- [x] T2b: Pass-through extends ALL global ailments
- [x] T3a-c: All conditional stats, NO procs. T3b combo enhances Momentum.
- [x] T4: 3+ pass-through → Plague Wake ground zone
- [x] T5: Consistent (100% pass-through, refresh all) vs Risky (detonate pass-through, lose stacks)
- [x] T6: Kill → spread to pass-through range at 75%
- [x] T7: Pass-through ALL at 120%, T6 no ICD. Tensions: 0 direct, -15% non-dash.
- [x] 3-mechanic rule: PASS

**Ghost Branch:**
- [x] T1a: 100% dodge window 0.5-0.8s after dash (unique guaranteed invulnerability)
- [x] T1b: Post-dash dodge chance buff
- [x] T2: Dodge within 2s of dash → Shadow Phase (counters + dodge)
- [x] T2b: Momentum grants dodge to empowered skill window
- [x] T3a-c: All conditional stats, NO procs. T3b adds dodge to Momentum.
- [x] T4: 2 dodges after dash → Phantom Dash (+30% dodge, +15% DR, free SD)
- [x] T5: Consistent (Fortify + extended Phase Step + heal) vs Risky (150% counters, crit=reset, +dmg)
- [x] T6: 15% on dodge → free SD + Shadow Momentum
- [x] T7: Phantom Step every dodge. Tensions: SD weak, non-Momentum penalized.
- [x] 3-mechanic rule: PASS

**Per-Skill:** 39 nodes, all registered, no name duplicates.

# Class Fantasy Briefs

**Status:** Phase B step 7 — design lock for the 5 MVP classes. Rewritten 2026-04-26 to drop "primary weapon" framing per the class-first principle (§4.2 Model B + §11 4-Layer Multi-Class Identity Model).
**Original draft:** 2026-04-26.
**Companion docs:** `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` (§3 class roster, §4 weapon map, §6 talent tree shape, §8 combo system, §9.4 mana matrix, §10 ascendancies, §11 multi-class), `MULTI_CLASS_PAIRS.md` (10 pair briefs), `SKILL_FANTASY_AUDIT.md` (audit findings).

---

## Class-First Principle (LOCKED 2026-04-26)

**The class IS the fantasy. Weapons are vehicles that get re-flavored via morphs to express that fantasy.**

- Sorcerer wielding a sword: feels like a battle-mage (multi-class with Berserker — pair name "Spellreaver"). Element conversion overlays the blade; the Resonance loop carries through.
- Hunter wielding wands: feels like a magical-arrow archer (multi-class with Sorcerer — pair name "Arcane Archer"). Wand spam expresses as magical-projectile arrows; Mark & Execute carries through.
- Witchdoctor wielding a dagger: feels like ritual gouge work (chaos conversion). Pandemic still triggers on DoT-host death.

**What's preserved:** weapon's mechanical PARADIGM (§4.3 LOCKED). Wand stays fast-cast, greatsword stays heavy-wind-up, staff stays DoT+Minion.

**What changes:** flavor (visual + name + element + combo state) per wielding class.

Each class has **3 default weapons** that immediately express the class's signature (per §4.2 Model B). Multi-classing unlocks the secondary class's 3 defaults — the multi-class identity payoff per §11.

---

## Brief Template

Each brief follows a 7-section structure:

1. **One-line identity** — the hook in one sentence
2. **Fantasy expression across weapons** — how the class carries through its 3 defaults + how multi-class unlocks expand expression
3. **Signature mechanic** — the one loop no other class can replicate (§3.2)
4. **Mana flavor** — how the §9.4 dial profile manifests in-game
5. **Loadout archetypes (3)** — three build directions, one per ascendancy slot (§10); buffs migrated here per §SKILL_FANTASY_AUDIT
6. **Combo state vocabulary** — what states the class creates/consumes (§8.1 ComboStateSpec)
7. **Multi-class horizon** — what each of the 4 pair combos unlocks; cross-link to `MULTI_CLASS_PAIRS.md`

Briefs ordered: Witchdoctor → Assassin → Berserker → Sorcerer → Hunter (poles first, hybrids second).

---

## 1. Witchdoctor

### 1.1 One-line identity

A death-cultist whose magic spreads, festers, and compounds — you don't kill targets, you condemn them, and the condemnation jumps to whoever stands closest to the corpse.

### 1.2 Fantasy expression across weapons

**Class axis:** chaos + poison + minion + curse. Element is **chaos PRIMARY** (per audit: 3 staff skills reflavored from cold/fire to chaos to enforce this); secondary spread of poison via Plagued ailment vector.

**3 default weapons (§4.2):**
- **Staff** — DoT + Minion paradigm (LOCKED). The "purest" expression: cast Locust Swarm, summon Zombie Dogs, watch Pandemic spread. Most fleshed-out skill pool today.
- **Dagger** — Fast Strike + Combo + Burst paradigm. WD-flavored as **ritual gouge**: physical hits convert to chaos via morph; Stab creates **Hexed** (not Exposed). Personal melee curse-craft.
- **Scythe** — Reach + Reaper + Life-Drain paradigm. WD-flavored as **soul harvest**: life-on-kill becomes mana-on-kill chunk on top of §9.4 onKillGain. Reach + Pandemic transfer is excellent crowd hygiene.

**Multi-class horizon weapons (4 pairs):**
- + Assassin → unlocks Wand, Claws (Dagger overlap)
- + Sorcerer → unlocks Wand, Gauntlets (Staff overlap)
- + Berserker → unlocks Greatsword, Flail, Claws
- + Hunter → unlocks Bow, Crossbow (Dagger overlap)

Every weapon morphed by WD becomes chaos-flavored. The dagger doesn't stop being a dagger; it just curses while it stabs.

### 1.3 Signature mechanic — Pandemic

When an enemy with an active DoT dies, **all DoTs transfer to the nearest enemy at full duration**. Propagates across weapons (a Witchdoctor wielding a dagger still triggers Pandemic). This is the class's identity; no other class can produce it via gear, talent, or dual-class.

The "aha moment": you cast one Locust Swarm, kill a chain of enemies, and watch your single DoT compound into a screen-clear because it never expires while there are targets to jump to.

### 1.4 Mana flavor (§9.4 dials)

`maxMana: 150`, `passive: 6`, `onKill: 20`, `onHitDealt: 0.5` — **big-pool caster + kill-chunk refill + small steady trickle**. In-game feel:

- **Boss fights:** 150 mana grants ~12.5s of full rotation before regen-only mode. Minions tank while you wait.
- **Zone clears:** onKill 20 × ~3 kills/sec = 60+/sec generation. Mana effectively bottomless.
- **Quiet moments:** 0.5/hit trickle keeps you topped during single-target sustain.

Witchdoctor wants enemies dying. Its mana economy *rewards momentum* — the more Pandemic spreads, the more refills.

### 1.5 Loadout archetypes (3 — one per ascendancy)

**Plague Priest (Poison/DoT-spread axis)**
- Build pillar: stack poison/chaos DoTs to maximum depth, then Pandemic spreads them across packs.
- Tier-7 capstone (Plague path): **Pandemic Plus** — Pandemic spreads to 2 targets instead of 1. Poison stack cap +15.
- Identity feel: drop ONE DoT, watch it eat the entire encounter.

**Spirit Whisperer (Minion-army axis)**
- Build pillar: maximize summon count + minion synergy. Your minions inherit your on-hit procs.
- Tier-7 capstone (Spirit path): **Soul Tether** — Minion count +2. Minions inherit your on-hit procs and combo-state creation.
- Identity feel: you don't fight, your court does. You stand back and curse.
- **Buff migration target:** Big Bad Voodoo (cut button) → Spirit Whisperer ascendancy passive: *"while 3+ minions alive, +25% attack speed and +15% damage."* Conditioning on minion count makes the ascendancy feel mechanically distinct vs. a button.

**Voodoo Sovereign (Curse/Hex axis)**
- Build pillar: Hex applied to everything; consumed Hexed = burst payoff. Curse can crit.
- Tier-7 capstone (Voodoo path): **Crowned in Curses** — Hex can crit. Skills that consume Hexed deal 2× damage.
- Identity feel: every enemy is a hexed husk before they're a corpse.
- **Buff migration target:** Spirit Walk (cut button) → split: damage% folds into Spirit Caller path tier-3 passive ("+15% damage while a minion is alive"); dodge effect → Plague Priest ascendancy passive.

### 1.6 Combo state vocabulary

| State | Created by | Consumed by | Effect |
|---|---|---|---|
| **Hexed** | Hex skill, dagger Stab (WD morph), Voodoo Mark (cross-weapon talent) | Skills tagged 'Curse' or burst skills | +2× damage on consumer; required for Voodoo Sovereign payoffs |
| **Plagued** | Locust Swarm, Plague of Toads, post-audit chain skills (Bouncing Skull) | Pandemic transfer | Designates targets in DoT-pool; tracks chaos DoT depth |
| **Haunted** | Haunt (post-audit chaos-flavored), Spirit Barrage payoff | Spirit-tagged consumer | **NAMING COLLISION** — Zombie Dogs bites also create state called "Haunted" with different shape. Resolve in §8.1 ComboStateSpec migration (rename one to "Hounded" or "Withered"). |
| **Soul Stack** | onKill (passive accrual, max 5 stacks) | Soul Harvest, Mass Sacrifice, Bouncing Skull | Class-passive resource; stacks scale up consumer damage |

**Pandemic transfer rule:** when a Plagued, Haunted, or Hexed target dies, **all** active states (not just the killer-skill's) transfer to the nearest enemy. This is what makes Pandemic class-defining instead of skill-defining.

### 1.7 Multi-class horizon (cross-link to `MULTI_CLASS_PAIRS.md`)

Each multi-class pair gives WD a fundamentally different feel via the §11 4-layer model (fusion mechanic + toggle morphs + weapon unlocks):

| Pair | Archetype | Fusion mechanic gist | Pair brief |
|---|---|---|---|
| WD + Assassin | **Blood Cultist** | Hex Cascade — crit on Hexed target builds Crit Stacks AND spawns Pandemic-spread Cursed Cascade | ✅ authored |
| WD + Sorcerer | **Seer** | Elemental Pandemic — DoTs apply Resonance charges; transfer with Pandemic; 4 charges = Convergence on receiver | partial draft |
| WD + Berserker | **Deathwalker** | Bloodied Pandemic — DoTs +50% to <50% HP; Bloodied transfers double on Pandemic | partial draft |
| WD + Hunter | **Soul Trapper** | Spirit Trap — your traps apply Hexed; trapped+Hexed targets that die spawn a tracking spirit | pending |

---

## 2. Assassin

### 2.1 One-line identity

A shadow that kills faster than the eye can track — strikes compound, crits empower further crits, and a marked target is already dead.

### 2.2 Fantasy expression across weapons

**Class axis:** physical primary (with bleed via §8.3); shadow/chaos secondary (poison vector, post-audit Chain Strike chaos-converted). Crit + combo-state momentum is the mechanical core.

**3 default weapons (§4.2):**
- **Dagger** — Fast Strike + Combo + Burst paradigm (LOCKED). The "purest" expression: Stab → crit → Exposed → Assassinate. Most fleshed-out skill pool today.
- **Wand** — Fast Cast + Low Mana + Spam paradigm. Asn-flavored as **shadow projectile**: every cast is "throw a poisoned blade." Spell tag preserved; combo states (Exposed, Shadow Mark) created by spell crits.
- **Claws** — Dual-Hit + Bleed + Attack-Speed Stacking paradigm. Asn-flavored as **shadow-frenzy**: twin shadow blades; bleed paradigm preserved; visual is shadow-bladed. Attack-speed compounding feeds Crit Cascade frequency.

**Multi-class horizon weapons (4 pairs):**
- + Witchdoctor → unlocks Staff, Scythe (Dagger overlap)
- + Sorcerer → unlocks Staff, Gauntlets (Wand overlap)
- + Berserker → unlocks Greatsword, Flail (Claws overlap)
- + Hunter → unlocks Bow, Crossbow (Dagger overlap)

When Asn wields a staff via multi-class with Sorcerer (Arcane Blade pair), DoT/Minion paradigm preserved but minions become **shadow clones** that mirror your strikes.

### 2.3 Signature mechanic — Crit Cascade

**On crit:** the target gains a **Shadow Mark** (5s) regardless of which skill landed the crit. Subsequent crits on a marked target have +25% chance to *re-mark* (refresh + extend), and each refresh adds a **Crit Stack** (max 5) that increases your global crit damage by 6% per stack while the target lives.

The "aha moment": one lucky crit on a tough target snowballs into a frenzy where every follow-up crits harder. Crit Cascade can't exist on other classes — Hunter has Mark, Sorcerer has Resonance, but neither chains the way Cascade does.

### 2.4 Mana flavor (§9.4 dials)

`maxMana: 50`, `passive: 10`, `onCrit: 6`, `onHitDealt: 1`, `onKill: 3` — **quick-recover + crit-feedback loop + per-hit trickle**. In-game feel:

- **Sustained combat:** every hit refunds 1, every crit refunds 6 — the more you swing, the more you cast.
- **Boss fights:** 50 mana drains in ~10s but the Cascade loop kicks in, crit-driven onCrit gains start to outpace drain. Mana economy *embodies* the snowball.
- **Off-rotation moments:** 10/sec passive fully covers low-cost combo-builders (Stab at 6 mana). Heavy nukes (Assassinate at 30 mana) are paced to the cascade tempo.

Assassin's mana shape is "you don't generate mana, you compound it" — every successful hit and crit is a tiny refund, and the Cascade keeps the flywheel spinning.

### 2.5 Loadout archetypes (3)

**Blademaster (Dual-wield crit-burst axis)**
- Build pillar: dagger+dagger; chain attacks fan; crits refund cooldowns.
- Mainhand+offhand: Dagger+Dagger (second_weapon offhand per §5.2).
- Tier-7 capstone (Bladework path): **Bladestorm** — Crits have 30% chance to refund the consumed skill's cooldown. While dual-wielding, chain attacks gain +1 hit.
- Identity feel: rotate forever, never wait for a cooldown.
- **Buff migration target:** Predator's Mark (cut button) → Blademaster ascendancy passive: *"while wielding dagger, +10% crit chance and +20% crit mult permanently."* (cut button, halved values, made always-on.)

**Venomcraft (Poison-snapshot axis)**
- Build pillar: stack poison via Viper Strike + Fan of Knives; ailments snapshot at higher potency.
- Tier-7 capstone (Venom path): **Toxic Saint** — Poison can crit. Your poison stacks no longer decay while you have Shadow Mark active.
- Identity feel: a single Viper Strike is a 30-second sentence.
- **Buff migration target:** Venom Covenant (cut button) → Venomcraft ascendancy passive with conditional: *"+25% attack speed and +10% damage while you have an active poison stack on a target."* Conditional on poison-active makes Venomcraft loop-driven, not button-driven.

**Shadowdancer (Mark-momentum axis)**
- Build pillar: Mark applied on first hit; marked-target follow-ups generate Shadow Momentum.
- Tier-7 capstone (Shadow path): **Untouchable** — Mark applies on first hit regardless of skill. Hits on marked targets generate Shadow Momentum (cooldowns start 2s earlier).
- Identity feel: you never hit a target without it already being marked for death.
- **Buff migration target:** Shadow Covenant (cut button) → Shadowdancer ascendancy keystone: *"while Shadow Mark is active on any target, +15% defense and +10% crit mult."* Conditional routes Shadowdancer through its signature combo state.

### 2.6 Combo state vocabulary

| State | Created by | Consumed by | Effect |
|---|---|---|---|
| **Exposed** | Stab on crit, post-audit Fan of Knives (proposal) | Any non-Stab skill | +25% damage on consumer |
| **Deep Wound** | Viper Strike | Assassinate | Remaining DoT ticks fire instantly on consumer |
| **Shadow Mark** | Shadow Mark skill, **crit (Crit Cascade)**, Shadow Caltrops (post-audit) | Empowers next skill on marked target | Class-signature state — see §2.3 |
| **Crit Stack** | Re-marking a Shadow Marked target via crit | Self-buff (passive) | +6% global crit damage per stack while target lives, max 5 |
| **Shadow Momentum** | Shadow Dash, Shadowdancer marked-target crits | Self-buff (passive, 1 use) | Next skill cooldown starts 2s earlier |

### 2.7 Multi-class horizon (cross-link to `MULTI_CLASS_PAIRS.md`)

| Pair | Archetype | Fusion mechanic gist | Pair brief |
|---|---|---|---|
| Asn + Witchdoctor | **Blood Cultist** | Hex Cascade — crit on Hexed target builds Crit Stacks AND spawns Pandemic-spread Cursed Cascade; Crit Stacks accelerate poison ticks 10%/stack | ✅ authored |
| Asn + Sorcerer | **Arcane Blade** | Resonant Blade — Cascade crits add Resonance charges; Convergence cast becomes a single-target stab payload | pending |
| Asn + Berserker | **Dark Reaver** | Frenzied Cascade — Cascade crit chance scales with missing HP; below 50% HP, Crit Stacks cap raises 5→10 | pending |
| Asn + Hunter | **Nightstalker** | Shadow Mark Cascade — Hunter's Mark + Shadow Mark fuse into "Hunter's Shadow"; first hit creates BOTH; Cascade re-marks via crit, Mark consumed for Precision Payoff | pending |

---

## 3. Berserker

### 3.1 One-line identity

A commit-and-strike reaver who *fights to fight* — no passive regen, no mana, just rage you build by swinging and eating hits, dumped into screen-clearing 2H slams.

### 3.2 Fantasy expression across weapons

**Class axis:** physical primary (with bleed via §8.3); rage-meter mechanic threads through every skill. Element conversions are RARE — Berserker is meaty melee, not elemental.

**3 default weapons (§4.2):**
- **Greatsword** — Heavy Slow + Big Numbers + Wind-Up paradigm (LOCKED). The "purest" expression: commit, slam, execute below threshold. Phase C3 design target.
- **Flail** — Arc Sweep + AoE + Disarm/Stun paradigm. Berserker-flavored as **chain-weapon AoE control**: marked-for-cleave state on first sweep; subsequent sweeps widen.
- **Claws** — Dual-Hit + Bleed + Attack-Speed Stacking paradigm. Berserker-flavored as **dual-grip frenzy**: bleed becomes Bloodied state; attack-speed compounding becomes rage-build compounding.

**Multi-class horizon weapons (4 pairs):**
- + Witchdoctor → unlocks Staff, Dagger, Scythe (Claws overlap)
- + Assassin → unlocks Dagger, Wand (Claws overlap)
- + Sorcerer → unlocks Wand, Staff, Gauntlets (Claws overlap)
- + Hunter → unlocks Bow, Crossbow, Dagger (Claws overlap)

When Berserker wields a wand via multi-class with Sorcerer (Spellreaver pair), it's a **rage-channel storm-rod** — wand spam paradigm preserved, but rage threshold mechanic applies to spell damage.

### 3.3 Signature mechanic — Rage Threshold

Below 50% HP, all your skills enter **Frenzied** state: +25% damage, execute-range bonus on skills with execute keyword, and **self-damage** counts as triggering Rage Threshold (you can deliberately push yourself below 50% via skills tagged 'self-cost'). Above 50% HP, you're *out of rage*; this isn't a buff, it's the *normal state* — Berserker is supposed to spend most encounters in red.

The "aha moment": you take a big hit, drop to 30% HP, and instead of running — you press the attack, slam through three enemies at execute range, and refund your cooldown stack on the kill chain. The class wants to be hurt.

### 3.4 Mana flavor (§9.4 dials)

`maxMana: 100`, `startFull: false` (start at 0!), `passive: 0`, `onHitDealt: 5`, `onHitTaken: 8`, `onKill: 10` — **PURE RAGE — no passive, build by fighting**. In-game feel:

- **Zone start:** 0 rage. You can't cast skills until you start swinging. This is correct — Berserker isn't a caster, it's a fighter who EARNS its skills.
- **Sustained combat:** ~5/sec from swinging + ~5-8/sec from taking hits = 10-13/sec generation in active fights.
- **Boss fights:** the more the boss hits you, the more rage you have. Tanking IS resource generation. Below 50% HP, the Frenzied state lets you spend even faster.
- **Quiet moments:** rage drains slowly when out of combat (engine note: not yet wired; design lock for Phase 6 — `onCombatEnd` decay).

Berserker's mana shape is "you have nothing until you do something." Most distinctive flavor in the roster.

### 3.5 Loadout archetypes (3)

**Warlord (Execute axis)**
- Build pillar: Rage Threshold raised to 50% HP; execute-range skills double-buffed.
- Mainhand: Greatsword.
- Tier-7 capstone (Warlord path): **King of Ruin** — Rage Threshold raises to 50% HP. Execute-range skills gain +100% damage instead of +50%.
- Identity feel: bosses melt the moment they hit half HP. You're not a DPS class, you're a finisher.

**Reaver (Bloodlust axis)**
- Build pillar: stay below 50% HP indefinitely; kills extend the low-HP window; can't die during Rage.
- Mainhand: Greatsword or Claws.
- Tier-7 capstone (Reaver path): **Undying Wrath** — Each kill during low-HP extends low-HP window by 2s. Cannot die while Rage is active.
- Identity feel: you walk into a pack at 1 HP and walk out at 1 HP and 30 corpses.

**Juggernaut (Defensive AoE axis)**
- Build pillar: 2H damage reduction; flail sweep cone widens.
- Mainhand: Flail (or 2H-only).
- Tier-7 capstone (Juggernaut path): **Mountain** — All damage taken reduced by 30% while wielding 2H. Flail sweep cone widens 50%.
- Identity feel: the only Berserker that *sustains* through tankiness instead of execution speed.

### 3.6 Combo state vocabulary

| State | Created by | Consumed by | Effect |
|---|---|---|---|
| **Bloodied** | Greatsword strikes on enemies < 50% HP | Execute skills | +50% damage on consumer; signature execute synergy |
| **Frenzied** | Self-buff while < 50% HP (passive of Rage Threshold) | Self (passive) | +25% damage, execute-range bonus, all skills empowered |
| **Staggered** | Greatsword Heavy Strike, Flail Concussive Blow | Follow-up melee skill | +25% crit chance on consumer (one-shot per stagger) |
| **Marked for Cleave** | First Flail Sweep on a target | Subsequent Flail Sweeps | Each repeat sweep on marked target gains +20% AoE radius |

Berserker's rage (mana) and Frenzied state are *parallel resources* — Frenzied is binary (on/off based on HP), rage is accumulating. They interact: Frenzied skills cost less rage.

### 3.7 Multi-class horizon (cross-link to `MULTI_CLASS_PAIRS.md`)

| Pair | Archetype | Fusion mechanic gist | Pair brief |
|---|---|---|---|
| Brs + Witchdoctor | **Deathwalker** | Bloodied Pandemic — DoTs +50% to <50% HP; Bloodied transfers double on Pandemic | partial draft |
| Brs + Assassin | **Dark Reaver** | Frenzied Cascade — Cascade crit chance scales with missing HP; Crit Stacks cap raises below 50% | pending |
| Brs + Sorcerer | **Spellreaver** | Element Forge — Frenzied state empowers Resonance (charges build 50% faster); Convergence below 50% HP costs no mana. **Canonical "battle mage" pair (per §4.2).** | pending |
| Brs + Hunter | **Warden** | Trap-Execute — traps applied to enemies enter Bloodied state on detonation; Hunter precision payoffs scale with your missing HP | pending |

---

## 4. Sorcerer

### 4.1 One-line identity

An element-warper whose spells resonate, cascade, and transform each other — every cast is a setup for the *next* cast, and at peak charge, four elements collapse into one apocalyptic hit.

### 4.2 Fantasy expression across weapons

**Class axis:** elemental primary (fire / cold / lightning / chaos all valid); conversion + Resonance is the mechanical core. Sorcerer is the ONLY class for whom every weapon becomes an elemental conduit.

**3 default weapons (§4.2):**
- **Wand** — Fast Cast + Low Mana + Spam paradigm (LOCKED). The "purest" expression: cycle elements via fast spam, build Resonance, fire Convergence.
- **Staff** — DoT + Minion paradigm. Sorcerer-flavored as **elemental conduit**: channels become elemental beams; minions become elemental constructs (ice golem, fire elemental, storm sprite). Each minion's auto-attack contributes to Resonance.
- **Gauntlets** — Spell-Fist + Close-Range Cast paradigm. Sorcerer-flavored as **elemental palm strikes**: each combo (jab-jab-cross) cycles fire-cold-lightning automatically — a built-in Resonance ramp.

**Multi-class horizon weapons (4 pairs):**
- + Witchdoctor → unlocks Dagger, Scythe (Staff overlap, Gauntlets pending)
- + Assassin → unlocks Dagger, Claws (Wand overlap)
- + Berserker → unlocks **Greatsword, Flail, Claws** (Spellreaver = battle mage)
- + Hunter → unlocks Bow, Crossbow, Dagger (Arcane Archer = magical-projectile arrows)

When Sorcerer wields a sword via multi-class with Berserker (Spellreaver), it's an **elementally-imbued blade** — the §4.2 worked scenario "battle mage Sorcerer." Melee paradigm preserved; Resonance loop carries through; each strike adds an element to the bank.

### 4.3 Signature mechanic — Resonance

Each unique damage type you deal stacks one **Resonance** charge on yourself (max 4 — fire, cold, lightning, chaos). At 4 charges, your **next cast consumes them all** and converts to a *Convergence* — ALL four elements applied in one hit, dealing weighted damage of all four buckets and applying every elemental ailment (ignite + chill + shock + poison) at once.

The "aha moment": you cycle Burning Arrow → Ice Barrage → Shock Arrow → a chaos-converted skill, then trigger Convergence — and a single follow-up cast applies four ailments and detonates them all together.

No other class can produce Resonance. Hunter's Mark is single-target; WD's Pandemic is propagation; Cascade is feedback; Resonance is *transmutation*.

### 4.4 Mana flavor (§9.4 dials)

`maxMana: 130`, `passive: 8`, `onKill: 8`, `onCrit: 4` — **sustained caster + Resonance crit loop**. In-game feel:

- **Sustained casting:** 8/sec passive covers wand-spam (low-cost). Every crit refunds 4 — keeps Resonance cycle paced.
- **Boss fights:** 130 mana grants ~16s of full cast tempo. Convergence (high cost, ~40 mana) fires roughly every 8-12s as Resonance charges up.
- **Multi-element burst:** Convergence is the spike moment; mana economy is balanced around firing it once per Resonance cycle, not on cooldown.

Sorcerer's mana is less rewarding than Witchdoctor's (no big onKill chunk) but more *steady*. You're not racing for a refill, you're sustaining a rhythm.

### 4.5 Loadout archetypes (3)

**Elementalist (Conversion-stack axis)**
- Build pillar: maximize conversion percentages; element-swap procs reset Resonance counter.
- Mainhand: Wand or Staff.
- Tier-7 capstone (Elementalist path): **Element Shifter** — Conversion effects stack to 150% instead of 100%. Element-swap procs also reset the Resonance counter.
- Identity feel: physical damage barely exists; everything you cast is converted four times before it lands.

**Arcanist (Resonance-bank axis)**
- Build pillar: hold Resonance charges longer; spend grants cast-speed burst.
- Mainhand: Wand or Gauntlets.
- Tier-7 capstone (Arcanist path): **Saturation** — Resonance charges cap +5. Spending Resonance grants a brief cast-speed burst (+50% for 4s).
- Identity feel: massive Convergence detonations; long buildup, devastating release.

**Pyromancer / Cryomancer / Stormcaller (Single-element specialist axis)**
- Build pillar: pick one dominant element at ascendancy time; chosen element gains +50% damage, others gain +25%.
- Mainhand: Wand (chosen element flavor).
- Tier-7 capstone (Specialist path): **Avatar of [Element]** — your chosen element gains +50% damage; others gain +25%. Resonance loop preserved but element bias is hard.
- Identity feel: the "single-color mage" archetype — pure pyro, pure cryo, pure storm.

### 4.6 Combo state vocabulary

| State | Created by | Consumed by | Effect |
|---|---|---|---|
| **Resonance** | Each unique element dealt (max 4 stacks) | Convergence cast | At 4 stacks, next cast applies all 4 elemental ailments + 4-bucket damage |
| **Charged** | Lightning crit on a target | Cold/fire/chaos follow-up within 3s | Follow-up gets +30% damage and Resonance counts double |
| **Conducted** | Lightning hit on enemy in water/blood | Any element follow-up | +50% chain potential; 2-bounce chain on next hit |
| **Frozen Solid** | Chill stacks max → frostbite | Fire skill | Shatters target; AoE cold burst hits adjacent |

Resonance is class-passive (not on enemies); the others are enemy debuffs. Sorcerer is the most *self-state-heavy* class — you track your own status as much as the enemy's.

### 4.7 Multi-class horizon (cross-link to `MULTI_CLASS_PAIRS.md`)

| Pair | Archetype | Fusion mechanic gist | Pair brief |
|---|---|---|---|
| Sor + Witchdoctor | **Seer** | Elemental Pandemic — DoTs apply Resonance charges; transfer with Pandemic; 4 charges = Convergence on receiver | partial draft |
| Sor + Assassin | **Arcane Blade** | Resonant Blade — Cascade crits add Resonance charges; Convergence becomes single-target stab payload | pending |
| Sor + Berserker | **Spellreaver** | Element Forge — Frenzied state empowers Resonance; Convergence below 50% HP costs no mana. **Canonical "battle mage" pair.** | pending |
| Sor + Hunter | **Arcane Archer** | Element-Marked Shot — Hunter's Mark sets element of next cast (cycling); Resonance charges apply to projectile shots. **Canonical "magical-projectile arrow" pair.** | pending |

---

## 5. Hunter

### 5.1 One-line identity

A patient predator who marks before killing — first hit always sets the stage, follow-ups punish the marked, and traps lock prey in place for the inevitable execution.

### 5.2 Fantasy expression across weapons

**Class axis:** physical primary (with bleed via §8.3); precision + setup-and-execute is the mechanical core. Hunter is **not** an elemental class natively — element conversion comes via multi-class.

**3 default weapons (§4.2):**
- **Bow** — Projectile + Ranged + Precision paradigm (LOCKED). The "purest" expression: aim, mark, snipe, payoff. Pool needs Phase C3 rebuild (currently 6 actives + duplicate-id bug per §9.5 reclassification).
- **Crossbow** — Slow Ranged + Heavy Bolt + Piercing paradigm. Hunter-flavored as **siege-precision**: heavy bolts that pierce; reload tempo gates burst pacing. Phase C3 design target.
- **Dagger** — Fast Strike + Combo + Burst paradigm. Hunter-flavored as **execution blade**: close-range backup; Stab creates **Marked** (not Exposed). Combo states route through Mark & Execute payoff.

**Multi-class horizon weapons (4 pairs):**
- + Witchdoctor → unlocks Staff, Scythe (Dagger overlap)
- + Assassin → unlocks Wand, Claws (Dagger overlap)
- + Sorcerer → unlocks **Wand, Staff, Gauntlets** (Arcane Archer = magical arrows)
- + Berserker → unlocks Greatsword, Flail, Claws

When Hunter wields wands via multi-class with Sorcerer (Arcane Archer), wand spam paradigm preserved — but visually, projectiles are **magical arrows** (the §4.2 worked scenario). Mark & Execute carries through; Resonance loop overlays; companion can be a **magical beast** via Beastmaster ascendancy.

### 5.3 Signature mechanic — Mark & Execute

**Your first hit on any target applies Mark** (10s, regardless of skill). A **follow-up skill from a different weapon-skill-id** on a marked target triggers **Precision Payoff**: +50% damage, +25% crit chance, and if the hit kills, refunds the marker skill's cooldown.

The "aha moment": you tag a boss with Arrow Shot (cheap), wait a beat, then fire Snipe (expensive) — Snipe lands at 1.5× damage with a fat crit, and if it kills, your Snipe is already off cooldown for the next target. The class wants you to *combo across skills*, not spam one.

No other class produces Mark & Execute. Assassin's Shadow Mark requires a crit; Sorcerer's Resonance requires elemental cycling; WD's Pandemic requires DoT death — Hunter's Mark is the *only* one that triggers on the very first hit, no setup required.

### 5.4 Mana flavor (§9.4 dials)

`maxMana: 80`, `passive: 9`, `onKill: 5`, `onHitDealt: 0.5`, `onCrit: 6` — **energy-archer hybrid** (passive floor + crit bonus + per-shot trickle). In-game feel:

- **Sustained ranged combat:** 9/sec passive covers Arrow Shot (4 mana) and Burning Arrow (10 mana) with comfortable headroom.
- **Heavy-bolt cycles:** Snipe (25 mana) needs 3-4s of regen — paced exactly to the Mark window.
- **Crit-heavy builds:** onCrit 6 × 30%+ crit rate adds another 2-3/sec. Hunter feels *fastest* during sustained crit chains.

Hunter's mana is the most "balanced" of the five — no extreme dial profile, just a steady flow with crit accelerator. Fits the patient-predator fantasy.

### 5.5 Loadout archetypes (3)

**Marksman (Crit-precision axis)**
- Build pillar: first hit always crits; precision payoffs deal more.
- Mainhand: Bow.
- Tier-7 capstone (Marksman path): **Headhunter** — First hit on any new target always crits. Precision payoffs deal +50% damage.
- Identity feel: every encounter opens with a guaranteed crit, then snowballs.

**Beastmaster (Animal-companion axis)**
- Build pillar: permanent companion (wolf / hawk / panther); inherits your on-hit procs; companion damage scales with your stats.
- Mainhand: Bow or Claws.
- Tier-7 capstone (Beastmaster path): **Pack Leader** — Summon a permanent animal companion (pick wolf/hawk/panther). It inherits your on-hit procs and Mark application.
- Identity feel: 2-vs-1 fights where the companion does the hunting and you do the killing.

**Trapper (Trap-stack axis)**
- Build pillar: traps with multi-arming; chained trap detonations.
- Mainhand: Crossbow or Bow.
- Tier-7 capstone (Trapper path): **Snare Field** — Traps gain +2 arming count. Multi-trap chains deal escalating damage per hit (1×, 1.5×, 2×, 2.5×).
- Identity feel: prep the encounter before it starts — set traps, pull, watch the chain detonate.

### 5.6 Combo state vocabulary

| State | Created by | Consumed by | Effect |
|---|---|---|---|
| **Marked** | First hit of any skill on a target (10s) | Follow-up skill from different skill-id | +50% damage, +25% crit; refunds marker cooldown on kill |
| **Tracked** | Hunter's Mark skill (manual mark, longer duration) | Trap detonations, Snipe | Reveals trap weak points; armor pen on consumer |
| **Snared** | Any trap detonation | Precision payoff (auto-applies on snared target hit) | Movement-locked targets gain +25% take-damage; multi-trap chain trigger |
| **Bleeding Out** | Bow Pierce on physical-damage shots | Follow-up bow skill | Stacking bleed; Hunter's variant of physical DoT |

### 5.7 Multi-class horizon (cross-link to `MULTI_CLASS_PAIRS.md`)

| Pair | Archetype | Fusion mechanic gist | Pair brief |
|---|---|---|---|
| Hnt + Witchdoctor | **Soul Trapper** | Spirit Trap — your traps apply Hexed; trapped+Hexed targets that die spawn a tracking spirit | pending |
| Hnt + Assassin | **Nightstalker** | Shadow Mark Cascade — Hunter's Mark + Shadow Mark fuse; first hit creates BOTH; Cascade re-marks via crit | pending |
| Hnt + Sorcerer | **Arcane Archer** | Element-Marked Shot — Hunter's Mark sets element of next cast; Resonance charges apply to projectile shots. **Canonical "magical-projectile arrow" pair.** | pending |
| Hnt + Berserker | **Warden** | Trap-Execute — traps apply Bloodied on detonation; Hunter precision payoffs scale with your missing HP | pending |

---

## Cross-Class Consistency Check

### Signature mechanics are non-overlapping (§3.2 rule)

| Class | Mechanic | Trigger | Cannot replicate via |
|---|---|---|---|
| Witchdoctor | **Pandemic** | DoT-host death | gear, talent, dual-class — class-only |
| Assassin | **Crit Cascade** | crit on any target | gear, talent, dual-class — class-only |
| Sorcerer | **Resonance** | dealing 4 unique element types | gear, talent, dual-class — class-only |
| Berserker | **Rage Threshold** | self-HP < 50% | gear, talent, dual-class — class-only |
| Hunter | **Mark & Execute** | first hit on a target | gear, talent, dual-class — class-only |

Each signature has a different *trigger axis*: death, crit, element-mix, self-HP, target-novelty. No overlap. Multi-class characters gain BOTH signatures — that's the §11 dual-class identity payoff.

### Mana flavor profiles are mechanically distinct (§9.4 matrix)

| Class | Dominant dial | Flavor identity |
|---|---|---|
| Witchdoctor | onKill (20) | Caster + kill-flash refill |
| Assassin | onCrit (6) + onHit (1) | Crit-feedback compounding |
| Sorcerer | passive (8) + onCrit (4) | Sustained-rhythm caster |
| Berserker | onHitDealt (5) + onHitTaken (8) | PURE rage — earned by combat |
| Hunter | passive (9) + onCrit (6) | Balanced flow + crit accelerator |

No two profiles share a dominant dial. Berserker is the structural opposite of Sorcerer.

### Element axes per class (post-audit)

| Class | Primary element | Secondary | Off-flavor (avoid in skill design) |
|---|---|---|---|
| Witchdoctor | **Chaos** (LOCKED post-audit; 3 staff skills converted from cold/fire) | Poison-vector | Cold, fire, lightning |
| Assassin | **Physical** (with bleed via §8.3) | Shadow/chaos (poison vector; Chain Strike post-audit) | Lightning, fire, cold |
| Sorcerer | **All elements** valid (fire/cold/lightning/chaos) | — | Pure physical |
| Berserker | **Physical** (with bleed) | None native | Elements (rare; only via multi-class) |
| Hunter | **Physical** (with bleed) | None native | Elements (only via multi-class with Sorcerer) |

**Rule going forward:** when authoring new skills (Phase C3 expansion to 15-20), respect the class element axis. Element diversity belongs to the morph layer + multi-class layer, not raw skill data.

### Combo state taxonomy by class

- **Witchdoctor:** target-state primary — Hexed, Plagued, Haunted (collision flagged), + Soul Stack (self).
- **Assassin:** target-state + self-buff hybrid — Exposed, Deep Wound, Shadow Mark, Crit Stack (self), Shadow Momentum (self).
- **Sorcerer:** self-state primary — Resonance (self), + enemy debuffs Charged, Conducted, Frozen Solid.
- **Berserker:** target-state + self-buff hybrid — Bloodied, Frenzied (self), Staggered, Marked for Cleave.
- **Hunter:** target-state primary — Marked, Tracked, Snared, Bleeding Out.

Sorcerer is the only class whose primary combo state is *self-tracking*. Berserker has the most parallel resources (rage + Frenzied). Hunter has the cleanest target-state taxonomy.

### Active buff disposition (post-audit, ALL pools)

Per `SKILL_FANTASY_AUDIT.md`, all 6 active buffs in WD staff + Asn dagger pools are flagged for migration:
- 5 buffs → ascendancy passives with conditional triggers (vs button presses)
- 1 buff → talent-tree passive node
- 1 passive → direct talent-tree node promotion (Grave Injustice)

**Goal post-cleanup:** zero `AbilityDef kind: 'buff'` and zero `AbilityDef kind: 'passive'` in WD staff + Asn dagger pools. Migration targets are drafted in §1.5 and §2.5 above. Class-tree authoring (Phase B step 8) absorbs them as concrete passive nodes.

**Design rule going forward:** new pools (Sorcerer wand, Berserker greatsword, Hunter bow rebuild, etc.) must NOT carry active stat-stick buffs. All buff-shaped effects route through ascendancy or class-tree passives.

### Defensive-skill anti-pattern (post-audit)

Pure-DPS classes (which all 5 MVP classes are) don't carry defensive button bloat. Defense comes from stats, gear, ascendancies, and proc-flavored skill side-effects. The audit replaced dagger Blade Ward with Shadow Veil (offensive-defensive shadow flavor); WD Spirit Walk's defensive component routes to Plague Priest ascendancy.

**Rule going forward:** when authoring new skills, no dedicated defensive-button skills. Defensive layers belong to ascendancy passives and gear.

### Per §4.3 Paradigm Preservation Rule

Verified across all 20 default class×weapon cells (5 classes × 4 mainhand options were the original §4.2 list; reduced to 15 per Model B):
- Staff stays DoT+Minion regardless of wielder (WD authentic, Asn shadow-DoT, Sor elemental-DoT).
- Dagger stays Fast Strike + Combo + Burst regardless (Asn authentic, WD chaos-Hexed, Hunter Mark-converted).
- Claws stay Dual-Hit + Bleed for Asn / Berserker / Hunter, with bleed reflavored per class.
- Wand stays Fast Cast + Spam for Sorcerer / Asn / WD, with element/shadow/chaos overlay.
- Gauntlets stay Spell-Fist for WD / Sorcerer.
- Scythe stays Reach + Reaper for WD / Sorcerer / Berserker.
- Greatsword and Flail are Berserker-default but accessible via multi-class (Spellreaver = battle mage).
- Bow and Crossbow are Hunter-default but accessible via multi-class (Arcane Archer = magical arrows).

---

## Phase B Status (post-rewrite)

After this brief rewrite:

- ✅ Briefs reflect class-first principle (no "primary weapon" framing)
- ✅ Briefs absorb audit findings (element axes locked per class; buff-removal direction confirmed; chaos-rework results referenced)
- ✅ Multi-class horizon section per class (cross-links to `MULTI_CLASS_PAIRS.md`)
- ✅ 6 buff-migration targets explicitly named (Big Bad Voodoo → Spirit Whisperer passive, Spirit Walk → split, Predator's Mark → Blademaster passive, Venom Covenant → Venomcraft passive, Shadow Covenant → Shadowdancer passive, Grave Injustice → talent-tree promotion)

Next phases:

1. **Phase B step 8 — Class tree structure design** (3 paths × 7 tiers per class; folds in 6 buff migrations as concrete passive nodes).
2. **Phase B step 9 — Morph retune pass** for Assassin×Staff paradigm fights (§4.3 list: Shadow Strike, Needle Volley, Bouncing Dagger).
3. **Multi-class pair authoring** — 9 remaining pairs in `MULTI_CLASS_PAIRS.md`.
4. **Phase C3 — Skill data audit follow-through** — combo-state migration when §8.1 ComboStateSpec lands; resolve Haunted naming collision.
5. **Phase C3 — Pool expansion to 15-20 skills/class** — 8 gap-filler skills per class per `SKILL_FANTASY_AUDIT.md` §1.4 + §2.4 specs; respecting per-class element axes locked above.

---

**End of fantasy briefs.** Ready for Phase B step 8 (class tree authoring) — buff-migration passive nodes have concrete migration targets locked in §1.5 / §2.5 above.

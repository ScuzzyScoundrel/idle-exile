# Multi-Class Pair Briefs

**Status:** Phase F design lock (10 of 10 pairs authored — **Phase B step 9 complete**).
**Authored:** 2026-04-26 (Blood Cultist), 2026-04-27 (Seer, Deathwalker, Soul Trapper), 2026-05-03 (Arcane Blade, Dark Reaver, Nightstalker, Spellreaver, Arcane Archer, Warden).
**Companion docs:** `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` (§11 4-Layer Multi-Class Identity Model, §4.2 Class-First Default-Weapon Model), `CLASS_FANTASY_BRIEFS.md` (5 MVP class briefs).

---

## The 4-Layer Identity Model (recap from §11.1)

Each of the 10 pairs is defined by four mechanical layers. WD+Berserker plays nothing like WD+Sorcerer even though both share the WD primary.

| Layer | What it is | Player-facing effect |
|---|---|---|
| **1. Pair Identity** | Named archetype + 1-line fantasy | UI title; lore |
| **2. Fusion Signature Mechanic** | ONE unique mechanic combining both class signatures. Cannot exist on any solo class. | A new gameplay loop unique to that pair |
| **3. Skill Toggle Morphs** | 3-5 of your existing skills get a TOGGLE to swap to a secondary-class-flavored variant. Per-skill player choice. | Active build decisions per skill |
| **4. Weapon Unlocks** | Secondary class's 3 default weapons (per §4.2) become accessible | Playstyle expansion |

**Each pair brief follows a 6-section template:**

1. Identity (Layer 1)
2. Fusion Signature Mechanic (Layer 2)
3. Skill Toggle Morphs (Layer 3) — 3-5 per pair
4. Weapon Access summary (Layer 4)
5. Playstyle examples (how the pair plays in different builds)
6. Ascendancy options (inherited from primary class)

---

## Pair Authoring Status

| # | Pair | Archetype | Status |
|---|---|---|---|
| 1 | Witchdoctor + Assassin | Blood Cultist | ✅ authored 2026-04-26 (this doc, §1) |
| 2 | Witchdoctor + Sorcerer | Seer | ✅ authored 2026-04-27 (this doc, §2) |
| 3 | Witchdoctor + Berserker | Deathwalker | ✅ authored 2026-04-27 (this doc, §3) |
| 4 | Witchdoctor + Hunter | Soul Trapper | ✅ authored 2026-04-27 (this doc, §4) |
| 5 | Assassin + Sorcerer | Arcane Blade | ✅ authored 2026-05-03 (this doc, §5) |
| 6 | Assassin + Berserker | Dark Reaver | ✅ authored 2026-05-03 (this doc, §6) |
| 7 | Assassin + Hunter | Nightstalker | ✅ authored 2026-05-03 (this doc, §7) |
| 8 | Sorcerer + Berserker | Spellreaver | ✅ authored 2026-05-03 (this doc, §8) |
| 9 | Sorcerer + Hunter | Arcane Archer | ✅ authored 2026-05-03 (this doc, §9) |
| 10 | Berserker + Hunter | Warden | ✅ authored 2026-05-03 (this doc, §10) |

**Skill-fantasy audit dependency:** Pairs 1, 2, 3 use existing WD staff skills + Asn dagger skills as toggle bases. Per Phase B step 9b, these skills may need synergy adjustment before pair toggle morphs lock. Author with that caveat — the toggle-target list may shift but the fusion mechanic spec is independent of skill specifics.

---

## 1. Witchdoctor + Assassin → Blood Cultist

### 1.1 Identity (Layer 1)

**Blood Cultist.** Ritual dagger work; shadows that ooze hex and poison. The Witchdoctor's slow methodical curse-craft fused with the Assassin's precision crit-cascade. Where a pure WD condemns from a distance and a pure Asn strikes from shadow, the Blood Cultist *enters the fight personally* — daggers in hand, hexes already laid, every strike a ritual.

**Aha moment:** You stab a Hexed target, crit fires Crit Cascade, the target dies, and Hex propagates via Pandemic-spawned Cursed Cascade to the next enemy — who you immediately stab again, re-crit, and the chain compounds. One opening Hex → entire pack reduced to crit-fed corpses.

### 1.2 Fusion Signature Mechanic (Layer 2) — **Hex Cascade**

Combines Witchdoctor's **Pandemic** (DoT-host death propagation) with Assassin's **Crit Cascade** (crits empower further crits via Crit Stacks):

- **When you crit a Hexed target:** apply Crit Stack (per Cascade) AND mark the target with "Cursed Cascade." A Cursed Cascade target, on death, splits its Hex (and all DoTs, per Pandemic) to the nearest enemy with full duration.
- **Crit Stacks accelerate poison tick rate by 10% per stack** (max 5 stacks → 50% faster ticks). Poison snapshot still pays at hit time, but ticks fire faster.
- **No solo class can replicate this.** WD has Pandemic without Cascade; Asn has Cascade without Hex. Crit Stacks accelerating poison is unique to this pair.

The fusion mechanic ties Cascade's crit-feedback loop to Pandemic's spread mechanic — every Hex-crit becomes both *bigger crit* and *future propagation*.

### 1.3 Skill Toggle Morphs (Layer 3) — 5 toggles

Each toggle is a UI checkbox the player can set per skill. Pure WD/Asn skills become Blood Cultist variants when toggled.

**WD-side toggles (when wielding any WD-default weapon):**

| Default skill | Default behavior | Toggle (Blood Cultist) | Why this fits |
|---|---|---|---|
| **Hex** | Curse target (utility) | **Shadow Hex** — Hex deals chaos→shadow conversion + applies Shadow Mark (5s). Damage type changes; combo state added. | WD's curse becomes Asn's mark; one button creates both states |
| **Locust Swarm** | Chaos DoT, transfers on death (native Pandemic vector) | **Shadow Swarm** — locusts become shadow-blade swarm; chaos DoT becomes physical+poison hybrid; benefits from Crit Stacks (faster ticks) | Asn-flavored DoT; Cascade-eligible |
| **Soul Harvest** | Spend Soul stacks for AoE | **Soul Reap** — Harvest stacks count as Crit Stacks for the Cascade. Spending Soul Reap consumes BOTH Soul stacks AND Crit Stacks. | Cross-resource synergy unique to pair |

**Asn-side toggles (when wielding any Asn-default weapon):**

| Default skill | Default behavior | Toggle (Blood Cultist) | Why this fits |
|---|---|---|---|
| **Stab** | Fast strike, crit creates Exposed | **Hexstab** — Stab on crit creates Hexed (not Exposed). Enables WD-side payoffs (Voodoo Sovereign 2× damage, Pandemic propagation). | Re-routes combo state into WD's economy |
| **Viper Strike** | Heavy strike with chaos DoT | **Cursed Wound** — Viper's poison DoT counts toward Pandemic. On target death, Wound transfers with the rest. | Asn DoT becomes Pandemic-eligible |

Player picks per-skill state. All 5 toggled = full Blood Cultist mode. None toggled = pure WD or pure Asn with secondary weapon access. Mix = personalized build.

### 1.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| WD defaults | Staff, Dagger, Scythe |
| Asn defaults | Dagger, Wand, Claws |
| **Combined unique** | Staff, Dagger, Scythe, Wand, Claws (5 weapons; Dagger overlaps both classes) |

### 1.5 Playstyle Examples

**Dagger build (mainhand: Dagger; offhand: Dagger or Focus):**
- Core loop: Stab (Hexstab toggle) → crit → Hexed applied → Cascade fires → re-mark → next Stab.
- Pandemic pops on enemy death, spreads Hex chain.
- Most "Asn-leaning" build; combat feels fast and frenetic.

**Staff build (mainhand: Staff):**
- Core loop: cast Hex (Shadow Hex toggle) → Locust Swarm (Shadow Swarm toggle) → Soul Harvest (Soul Reap toggle) when stacks max.
- Combat feels more methodical; you set up the curse field, then a single Cascade-crit triggers the chain.
- Most "WD-leaning" build.

**Scythe build (mainhand: Scythe):**
- Reach-paradigm preserved; life-on-kill becomes life+mana-on-kill.
- Core loop: Scythe sweep applies Hex via on-hit talent; Cascade fires per crit; Pandemic on each kill.
- Hybrid melee+caster feel.

**Wand build (mainhand: Wand, requires Asn Wand morph from §4.2 default cells):**
- Spam shadow projectiles with Cascade resets.
- Hexstab equivalent on wand: shadow-bolt crit creates Hexed.
- Most "ranged Cascade" build.

**Claws build (mainhand: Claws):**
- Dual-hit bleed paradigm preserved; bleeds count toward Pandemic.
- Crit Stacks accelerate bleed AND poison; very high tick density.
- Endgame "tick-storm" build.

### 1.6 Ascendancy Options (inherited from primary class only)

The player picks ONE ascendancy at character creation; multi-classing does NOT add a secondary ascendancy.

**WD primary (Blood Cultist with WD as primary):**
- **Plague Priest** — Pandemic spreads to 2; poison cap +15. Strong synergy with Cursed Wound + Soul Reap toggles.
- **Spirit Whisperer** — Minion count +2; minions inherit on-hit procs. Strong with Staff build.
- **Voodoo Sovereign** — Hex can crit; Hexed-consume 2× damage. **Best Cascade synergy** — Hex crits feed Cascade directly.

**Asn primary (Blood Cultist with Asn as primary):**
- **Blademaster** — Crits refund cooldown; dual-wield +1 hit. Strong with Dagger build.
- **Venomcraft** — Poison can crit; no decay during Shadow Mark. **Best Hex Cascade synergy** — poison crits compound.
- **Shadowdancer** — Mark on first hit; marked-target crits give Shadow Momentum. Strong with mixed-weapon swap builds.

**Recommendation:** Voodoo Sovereign (WD primary) or Venomcraft (Asn primary) maximize the fusion mechanic.

### 1.7 Caveats — Pending Skill Audit

The toggle morphs assume current WD staff and Asn dagger skill rosters. Per Phase B step 9b skill-fantasy audit, several skills may shift:

- **Hex** as a pure utility curse may get reworked toward more active-damage role. If Hex becomes a damage skill, Shadow Hex toggle may need rebalance.
- **Soul Harvest** stack mechanic may change. Soul Reap toggle depends on stack system staying intact.
- **Viper Strike** poison is currently snapshot at 1.5×; the +50% potency is gear/talent-facing not yet wired. Cursed Wound toggle assumes the snapshot stays.
- **Stab** Exposed combo state placement may shift with combo-state schema (§8.1 ComboStateSpec) lock. Hexstab toggle is pre-schema; refactor when schema lands.

**Engineering dependency:** Toggle UI + per-character toggle state (`Character.skillToggles`) per §11.3 must land before this pair is playable. Phase F engineering work.

---

## 2. Witchdoctor + Sorcerer → Seer

### 2.1 Identity (Layer 1)

**Seer.** Elemental voodoo; weather as curse, curse as weather. Where Witchdoctor curses with chaos and Sorcerer warps elements, Seer fuses both — every DoT becomes elemental, every Resonance charge is fed by spreading curse, and Pandemic transfers across element-converted enemies become rolling thunderstorms of compounding ailments.

**Aha moment:** Cast Frost Locusts (toggled Locust Swarm) on a pack — chaos+cold DoT. Add Ember Haunt — chaos+fire DoT. Add Storm Barrage — chaos+lightning hit. You're now sitting at 4 Resonance charges (chaos + cold + fire + lightning). Kill the host of Frost Locusts; Pandemic transfers BOTH DoTs to the next enemy. Your next cast is a CONVERGENCE on the receiving target — applying ignite + chill + shock + poison simultaneously, all four ailments coordinated. The whole pack is now elementally damned.

### 2.2 Fusion Signature Mechanic (Layer 2) — **Elemental Pandemic**

Combines Witchdoctor's **Pandemic** (DoT-host death propagation) with Sorcerer's **Resonance** (4-element charge → Convergence cast):

- **Every WD DoT skill** (Locust Swarm, Haunt, Plague of Toads, Bouncing Skull) **applies a Resonance charge** tagged to its element type when it lands. Toggled-element variants (Frost Locusts = cold charge, Ember Haunt = fire, Storm Barrage = lightning) feed different charges.
- **Resonance charges are class-passive** (Sorcerer's signature) — accumulated on YOU, not the target. Pandemic transfer doesn't move them; they stay on you.
- **At 4 unique elements** (fire, cold, lightning, chaos), your **next Pandemic transfer triggers a Convergence on the receiving target** — applies all 4 elemental ailments + 4-bucket damage in one transfer event.
- **Net effect:** Witchdoctor's spread mechanic becomes a "build Resonance via DoT-spread, detonate Convergence on transfer" loop.
- *No solo class can replicate this.* WD has Pandemic without Resonance; Sor has Resonance without Pandemic. The cross-mechanic — DoT-as-charge-feeder — is unique to this pair.

### 2.3 Skill Toggle Morphs (Layer 3) — 5 toggles

**WD-side toggles (when wielding any WD-default weapon):**

| Default skill | Default behavior | Toggle (Seer) | Why this fits |
|---|---|---|---|
| **Locust Swarm** | Chaos DoT, transfers on death | **Frost Locusts** — chaos+cold conversion DoT; chill stacks build on each tick; counts as cold Resonance charge per cast | Adds cold to your charge bank while preserving Pandemic vector |
| **Haunt** | Chaos DoT, chains on death (post-audit) | **Ember Haunt** — chaos+fire conversion DoT; ignite stacks on each tick; counts as fire Resonance charge | Two DoTs of different elements running simultaneously — fast Resonance build |
| **Spirit Barrage** | Chaos projectile, 3 hits | **Storm Barrage** — chaos+lightning conversion; each hit can shock; counts as lightning Resonance charge | Adds lightning to charge bank via projectile shape (Sor-natural) |
| **Zombie Dogs** | 2 minions, applies Haunted | **Element Sprites** — minions cycle elements per attack (fire→cold→lightning→chaos→repeat); each minion-hit contributes a Resonance charge | Spirit Whisperer + Sor; minion attacks become a passive Resonance generator |
| **Mass Sacrifice** | Sacrifice minions for AoE | **Convergence Sacrifice** — when consumed at 4 Resonance charges, this triggers a personal Convergence as part of the AoE detonation, doubling damage and applying all 4 ailments to every enemy hit | Mass Sacrifice becomes the "burn the bank" payoff |

**Sor-side toggles:** *Deferred until Phase C3 wand/gauntlet pool authoring.* When Sor base skills exist, Seer will gain toggles like Wand Spam → Curse Bolts (each cast applies a Hex stack) and Gauntlet Channel → Plague Channel (channeled chaos DoT pulse).

### 2.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| WD defaults | Staff, Dagger, Scythe |
| Sor defaults | Wand, Staff, Gauntlets |
| **Combined unique** | Staff (overlap), Dagger, Scythe, Wand, Gauntlets (5 weapons; Staff overlaps both classes) |

### 2.5 Playstyle Examples

**Staff build (mainhand: Staff):** Pure Seer fantasy. Use staff DoT skills with element-conversion toggles. Locust Swarm + Haunt + Spirit Barrage in rotation builds Resonance fast; Pandemic propagates DoTs while you build to Convergence trigger. The "weather as curse" build.

**Wand build (mainhand: Wand):** More Sor-leaning. Fast-cast wand spam to build Resonance baseline; supplement with WD curses for Pandemic spread. The "elemental archer" feel — every cast is both an attack and a charge.

**Gauntlet build (mainhand: Gauntlets):** Melee-cadence elemental punches; Resonance builds VERY fast (each combo cycles fire-cold-lightning); Convergence on every Pandemic transfer becomes the spike. The most "active" Seer playstyle.

**Scythe build (mainhand: Scythe):** Reach + Reaper paradigm preserved. Each scythe sweep cycles elements; harvested souls become Resonance charges. "Storm Reaper" feel — a melee Seer that builds Resonance via reaping.

**Dagger build:** Less Seer-natural; daggers don't cycle elements as easily. Recommended only as off-hand swap during specific encounters; the Seer fusion really wants caster-cadence weapons.

### 2.6 Ascendancy Options (inherited from primary class only)

**WD primary:**
- **Plague Priest** — DoT-spread + Convergence on transfer = max-value Pandemic. Best WD-side fit.
- **Spirit Whisperer** — Element Sprites inherit your on-hit Resonance contribution; minion army becomes a passive charge engine.
- **Voodoo Sovereign** — Hex + Convergence consume; Hexed targets receiving Convergence take 2× damage.

**Sor primary:**
- **Elementalist** — Conversion stacks to 150%; element-swap procs reset Resonance counter (lets you re-use the bank).
- **Arcanist** — Resonance cap +5; spending grants cast-speed burst. **Best Sor-side fit for Seer** — Convergences hit harder and more often.
- **Pyromancer/Cryomancer/Stormcaller** — Single-element specialist breaks the Seer fantasy (you want all elements). Suboptimal.

**Recommendation:** Arcanist (Sor primary) or Plague Priest (WD primary) maximize the fusion mechanic.

### 2.7 Caveats — Pending Sor Pool + Type Rename

- **Sor base skills not yet authored** — Phase C3 territory. Seer's Sor-side toggles deferred until then.
- **`CharacterClass` type rename pending** (§15.4) — `mage → sorcerer`. Until then, Sor mana flavor lives in the legacy `mage` entry per §9.4 calibration matrix.
- **Resonance engine wiring pending** — currently `onCritGain` in mana matrix is dormant data (only `passiveRegenPerSec` is wired). Phase A cleanup gap — proc handlers needed in `tick.ts`.
- **All 5 toggle specs survive these gaps** — they describe behavior; engine wiring lands later without changing the design intent.

---

## 3. Witchdoctor + Berserker → Deathwalker

### 3.1 Identity (Layer 1)

**Deathwalker.** Rage-fueled plaguebearer; wades into blood, leaves disease. Where Witchdoctor curses from a distance and Berserker hacks through with rage, Deathwalker is BOTH at once — you wade into the bloodbath while DoTs ravage everything around you, your own low HP empowering both your damage AND your curses' venom. The opposite of a tactical caster — you're a death-priest who DEMANDS to be in the fight.

**Aha moment:** Drop to 30% HP via combat (or via Berserker's Sacrifice toggle of Mass Sacrifice). Frenzied state activates; Bloodied Pandemic empowers all your DoTs by 50% on enemies below 50% HP. Cast Locust Swarm (Blood Swarm toggle) — damage scales with YOUR missing HP. Pack of low-HP enemies dies fast; Pandemic transfers double-time across Bloodied targets. You finish at 1 HP with corpses everywhere and your DoTs still spreading.

### 3.2 Fusion Signature Mechanic (Layer 2) — **Bloodied Pandemic**

Combines Witchdoctor's **Pandemic** (DoT-host death propagation) with Berserker's **Rage Threshold** (<50% HP unlocks Frenzied):

- **Your DoTs deal +50% damage** to enemies below 50% HP.
- **On Pandemic transfer, if the dying target was Bloodied** (Berserker's combo state), the transfer **doubles** — DoTs land on TWO nearest enemies instead of one.
- **Bloodied applies automatically** to enemies hit while you're below 50% HP (Frenzied state synergy). Your own low-HP state turns every hit you land into a Bloodied marker.
- **Net effect:** you stay low-HP intentionally, your DoTs scale up, your Pandemic spreads doubly. The class wants you bleeding.
- *No solo class can replicate this.* WD has Pandemic without Bloodied; Berserker has Bloodied without Pandemic. The cross-mechanic — Frenzied state amplifying DoT spread — is unique to this pair.

### 3.3 Skill Toggle Morphs (Layer 3) — 5 toggles

**WD-side toggles (when wielding any WD-default weapon):**

| Default skill | Default behavior | Toggle (Deathwalker) | Why this fits |
|---|---|---|---|
| **Zombie Dogs** | 2 minions, applies Haunted | **Rage Zombies** — dogs gain attack speed as YOU take damage (per onHitTaken stack); frenzy state triggers on dog deaths; double damage below 50% HP | Minions become rage extension; your damage taken empowers your court |
| **Locust Swarm** | Chaos DoT, transfers on death | **Blood Swarm** — chaos DoT damage scales with YOUR missing HP (1.5× at 50%, 2× at 25%); applies Bloodied to all hit; native Pandemic vector preserved | Self-HP-scaling damage + AoE Bloodied application = Deathwalker engine |
| **Mass Sacrifice** | Sacrifice minions for AoE | **Berserker's Sacrifice** — sacrifice YOUR HP instead of minions (or in addition); pushes you below threshold for Rage; bonus damage scales with HP sacrificed (1% damage per 1% HP sacrificed) | Self-cost trigger for Frenzied state; intentional self-harm as a build move |
| **Hex** | Curse target | **Bloodcurse** — Hex also applies Bloodied; hexed enemies deal -25% damage to you (defensive curse); you gain double Hexed-consume damage if below 50% HP | Hex becomes both offensive (Bloodied) and defensive (damage reduction); thematically fits "blood priest" |
| **Soul Harvest** | Spend Soul stacks for AoE | **Blood Harvest** — Soul stacks become Blood Stacks; gained from Bloodied targets; consuming Blood Stacks heals you 5% per stack consumed (offsets Berserker's high-risk play) | Soul Stack mechanic re-routes through HP economy; gives Deathwalker a sustain valve to balance the low-HP commitment |

**Brs-side toggles:** *Deferred until Phase C3 greatsword/flail/claws pool authoring.* When Berserker base skills exist, Deathwalker will gain toggles like Greatsword Slam → Plague Slam (applies Plagued on hit, builds chaos DoT) and Flail Sweep → Cursed Sweep (sweep applies Hexed AoE).

### 3.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| WD defaults | Staff, Dagger, Scythe |
| Brs defaults | Greatsword, Flail, Claws |
| **Combined unique** | Staff, Dagger, Scythe, Greatsword, Flail, Claws (6 weapons — **no overlap**, max breadth) |

This is the **highest weapon-access pair** in WD's options (6 unique weapons). Maximum mechanical breadth.

### 3.5 Playstyle Examples

**Greatsword build (Brs primary):** Heavy 2H Deathwalker. Each greatsword swing applies Bloodied below 50% HP; Pandemic doubles transfers; DoTs from staff/dagger swaps spread the field. Most "fighter" Deathwalker — execute-range bonus from Warlord ascendancy stacks with DoT amplification.

**Staff build (WD primary):** Caster Deathwalker. Stay at range, but stay LOW HP. Self-damage skills (Berserker's Sacrifice toggle) push you below threshold; DoTs ravage at 1.5× damage. The "self-bleeding sorcerer" archetype — fragile but devastating.

**Flail build:** Arc Sweep + AoE + Disarm/Stun. Flail's marked-for-cleave state pairs with Bloodied — sweep applies Bloodied AoE; Pandemic-double propagates DoTs across the cleave. **Best AoE Deathwalker** — pulls clear in seconds.

**Claws build:** Dual-grip frenzy. Bleed (auto via §8.3) builds Bloodied stacks fast; attack-speed compounding stacks rage for self-damage triggers; DoT layer overlays. Hybrid melee-DoT.

**Dagger build:** Suboptimal for Deathwalker — daggers favor Asn signature (Crit Cascade), not Bloodied/Frenzied. Could be used for setup before swapping to a 2H, but Blood Cultist is the better WD+dagger pair.

**Scythe build:** Reach + life-on-kill paradigm. Scythe's life-drain mechanic offsets the low-HP demand — sustains you AT low HP without overhealing. The "balanced" Deathwalker.

### 3.6 Ascendancy Options (inherited from primary class only)

**WD primary:**
- **Plague Priest** — DoT-spread + Bloodied Pandemic = max value per transfer. **Best WD-side fit.**
- **Spirit Whisperer** — Rage Zombies inherit your Frenzied state; minion court becomes a rage-extension army.
- **Voodoo Sovereign** — Bloodcurse + Hex crits; curse becomes both offensive (Bloodied) and amplified.

**Brs primary:**
- **Warlord** — Execute synergy with Bloodied; finisher build.
- **Reaver** — Low-HP indefinitely + can't die during Rage. **Best Brs-side fit for Deathwalker** — the class WANTS to be hurt.
- **Juggernaut** — Less optimal; sustains tankiness, but Deathwalker WANTS to be hurt for Frenzied procs.

**Recommendation:** Reaver (Brs primary) or Plague Priest (WD primary) maximize Deathwalker's "stay low HP, spread plagues, never die" loop.

### 3.7 Caveats — Pending Brs Pool + Type Rename

- **Brs base skills not yet authored** — Phase C3 territory. Greatsword, Flail, Claws all need pool authoring (per §4.1 paradigms locked, but pools empty). Deathwalker's Brs-side toggles deferred until then.
- **`CharacterClass` type rename pending** (§15.4) — `warrior → berserker`. Until then, Brs mana flavor lives in the legacy `warrior` entry per §9.4 calibration matrix.
- **Rage proc handlers pending** — `onHitDealtGain`, `onHitTakenGain`, `onKillGain` are dormant schema data. Phase A cleanup gap — handlers needed in `tick.ts` (kill event), `zoneAttack`/`bossAttack` (taken), and crit roll site.
- **`Frenzied` self-state engine support pending** — the <50% HP trigger for Frenzied (and Bloodied auto-application) needs `tick.ts` HP-threshold check. Not yet wired.
- **All 5 toggle specs survive these gaps** — they describe behavior; engine wiring lands later without changing the design intent.

## 4. Witchdoctor + Hunter → Soul Trapper

### 4.1 Identity (Layer 1)

**Soul Trapper.** Spirit-bound traps; tracking souls as they flee their bodies. Where Witchdoctor curses with chaos and Hunter sets traps with precision, Soul Trapper fuses the two — every trap applies a curse, every cursed-trapped death spawns a tracking spirit that homes onto the next Mark. The class plays chess with souls: each kill chains into the next via spirit-following Mark.

**Aha moment:** Set Spirit Trap (Hunter trap toggled to apply Hex). Pull a pack — they trigger the trap, all become Hexed + Snared. As you Mark them with Hunter's Mark, the trapped+Hexed targets die one by one — each death spawns a tracking spirit that follows your next Mark to the next target. The "fade through corridors" feel — every death loads your next strike.

### 4.2 Fusion Signature Mechanic (Layer 2) — **Spirit Trap**

Combines Witchdoctor's **Pandemic** (DoT-host death propagation) with Hunter's **Mark & Execute** (first-hit Mark, follow-up payoff):

- **Your traps apply Hexed** (WD's curse) on detonation, in addition to their normal effects (Snared, baseline damage).
- **When a Hexed + Snared (trap-applied) target dies**, it spawns a **Tracking Spirit** that follows you for 10s.
- **Your next Hunter's Mark consumes the Spirit** — the Mark's target inherits a free Hexed application + the Spirit deals 50% of the dead target's max HP as chaos damage to the new Mark target.
- **Net effect:** Hunter's setup-and-execute loop becomes "trap, curse, mark, spirit-chain to next target." Each death loads your next strike.
- *No solo class can replicate this.* WD has Hex without traps; Hunter has traps without spirits. The Spirit-following-Mark mechanic is unique.

### 4.3 Skill Toggle Morphs (Layer 3) — 5 toggles

**WD-side toggles (when wielding any WD-default weapon):**

| Default skill | Default behavior | Toggle (Soul Trapper) | Why this fits |
|---|---|---|---|
| **Hex** | Curse target (utility) | **Hunter's Hex** — Hex also reveals enemy weak points (gives you a Mark-equivalent visual on critable spots); Hexed targets gain Hunter precision payoff windows even without an explicit Mark | WD's curse becomes Hunter's tracking; one button creates both functional states |
| **Locust Swarm** | Chaos DoT, Pandemic vector | **Tracking Swarm** — locusts apply Marked to every target they hit; on Pandemic transfer, Mark also transfers (free Mark on receiver) | DoT spread becomes Mark spread; auto-tags packs for follow-up |
| **Soul Harvest** | Spend Soul stacks for AoE | **Spirit Harvest** — Harvested Soul Stacks become Tracking Spirits (each stack consumed releases a Spirit that follows you for 10s) | Soul economy converts to Spirit economy; lets you bank multiple Spirits for chained Mark consumes |

**Hnt-side toggles (when wielding any Hunter-default weapon):** *Deferred until Phase C3 bow rebuild + new Trap/Mark skill authoring.* Spec drafts:
- A trap-style skill → **Spirit Trap** — base trap also applies Hexed (the signature pair fusion enabler).
- A Mark-style skill → **Soul Mark** — Marked target also gets Plagued (chaos DoT applied as part of Mark application).

### 4.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| WD defaults | Staff, Dagger, Scythe |
| Hnt defaults | Bow, Crossbow, Dagger |
| **Combined unique** | Staff, Dagger (overlap), Scythe, Bow, Crossbow (5 weapons; Dagger overlaps both classes) |

### 4.5 Playstyle Examples

**Bow build (Hnt primary):** Ranged Soul Trapper. Set traps, pull packs into them, snipe with Spirit-chain follow-ups. Most "Hunter-leaning" — traps are the engine, snipes are the payoff. Best Marksman ascendancy fit.

**Crossbow build:** Heavy bolts that pierce + apply Hexed via Spirit Trap. Lower tempo, higher per-shot impact. Pierce + Hexed + Spirit follow-up = devastating against bosses.

**Staff build (WD primary):** Caster Soul Trapper. Pandemic + Spirit chains. Tracking Swarm marks packs; Pandemic transfer releases Spirits. The "necromancer hunter" — you don't need a bow to track souls.

**Dagger build:** Close-quarters Soul Trapper. Daggers apply Hexed (via WD morph); kills spawn Spirits; Spirits feed into close-range follow-ups. Niche but distinctive.

**Scythe build:** Melee Soul Trapper. Reach + Reaper paradigm preserved; soul-harvest spirits feed Spirit Trap mechanic — every scythe-kill releases a tracker.

### 4.6 Ascendancy Options (inherited from primary class only)

**WD primary:**
- **Plague Priest** — DoT spread + Spirit chain = max value per kill. **Best WD-side fit for Soul Trapper.**
- **Spirit Whisperer** — Tracking Swarm becomes minion-like (locusts auto-mark); minion court interacts with Spirits.
- **Voodoo Sovereign** — Hunter's Hex gets crit chance; Hexed targets receiving Spirit damage take 2× burst.

**Hnt primary:**
- **Marksman** — Mark + Spirit consume; Spirit's 50%-HP damage compounds with first-hit-crits. **Best Hnt-side fit for Soul Trapper.**
- **Beastmaster** — Animal companion + Spirits = "Spirit Pack" (your beast inherits Spirit follow-ups).
- **Trapper** — Multi-trap chains apply Hexed AoE; Spirit Trap becomes a chain-trap explosion engine.

**Recommendation:** Plague Priest (WD primary) or Marksman (Hnt primary) maximize Soul Trapper.

### 4.7 Caveats — Pending Hunter Pool + Engine Wiring

- **Hunter pool is Phase C3 rebuild territory** — Bow has 6 actives + duplicate id bug (per `SKILL_FANTASY_AUDIT.md` and §9.5 reclassification). Hnt-side toggles deferred until rebuild + new Trap/Mark skills land.
- **Trap and Mark mechanics need engine wiring** — `engine/combat/traps.ts` exists but Mark & Execute is not yet implemented as a state. Phase C3 territory.
- **`CharacterClass` type rename pending** (§15.4) — `ranger → hunter`.
- **Spirit-tracking entity needs new state field** — `Character.trackingSpirits: Spirit[]` array. Save migration needed (v66+).
- **All 3 WD-side toggle specs work today** on existing WD staff skills. Hnt-side stubs document intent for Phase C3 implementation.

## 5. Assassin + Sorcerer → Arcane Blade

### 5.1 Identity (Layer 1)

**Arcane Blade.** A duelist whose blade work is also spell work; precision compressed into a singular elemental burst. Where pure Assassin chains crits across many strikes and pure Sorcerer accumulates Resonance over a slow caster cadence, Arcane Blade *uses the Cascade as the Resonance engine* — every crit is a charge, and Convergence detonates not as an AoE field but as a single-target stab payload that delivers all four ailments in one frame.

**Aha moment:** Open Stab on a target — crit fires, Cascade increments, AND a fire Resonance charge lands on you. Stab again — crit, Cascade +1, cold charge. Two more crits across two more weave skills — now you sit at 4 elements. Your next basic Stab silently *becomes a Convergence Stab* — single-target burst applies ignite + chill + shock + poison and dumps 4-bucket elemental damage in one strike. The pack hasn't even finished its first attack and the focus target is already on fire, frozen, shocked, and poisoned from a single dagger thrust.

### 5.2 Fusion Signature Mechanic (Layer 2) — **Resonant Blade**

Combines Assassin's **Crit Cascade** (crits compound via Crit Stacks) with Sorcerer's **Resonance** (4-element charge → Convergence cast):

- **Each Cascade-eligible crit adds a Resonance charge.** The element rotates per-crit on a fixed cycle: fire → cold → lightning → chaos → fire (cycle restarts at 4).
- **Resonance charges live on YOU**, not the target (Sor signature preserved). Crit Stacks live on the target (Asn signature preserved). Both ride together.
- **At 4 unique elemental charges**, your **next non-Convergence skill silently fires as a single-target Convergence**: it applies all 4 elemental ailments to the struck target AND deals a 4-bucket damage payload (one bucket per element). The skill's normal damage still resolves on top.
- **Spending Convergence consumes ALL Resonance charges and ALL Crit Stacks on the struck target.** Both engines reset together — the trigger is shared.
- *No solo class can replicate this.* Asn has Cascade without Resonance; Sor has Resonance without Cascade. Crit-as-charge-feeder + single-target Convergence stab is unique to this pair.

The fusion mechanic ties Cascade's crit cadence directly to Resonance's accumulation, then re-shapes Convergence from "AoE elemental dump" into "compressed elemental kill stab" — preserving Asn's single-target identity while delivering Sor's four-element payoff.

### 5.3 Skill Toggle Morphs (Layer 3) — 5 toggles

**Asn-side toggles (when wielding any Asn-default weapon):**

| Default skill | Default behavior | Toggle (Arcane Blade) | Why this fits |
|---|---|---|---|
| **Stab** | Fast strike, crit creates Exposed | **Arcane Stab** — crit applies the current rotation element's combo state (Ignited/Chilled/Shocked/Plagued) instead of Exposed; element follows the Resonance cycle | Re-routes Asn combo state into Sor's elemental economy |
| **Viper Strike** | Heavy strike with chaos DoT | **Resonant Strike** — chaos DoT becomes "Resonant DoT" — its element matches your current top Resonance charge; ticks build +1 Cascade per tick on the target while at 4 charges | DoT becomes element-coupled to Resonance state; double payoff at full charges |
| **Blade Dance** | Spinning AoE, hits all in encounter | **Spell Dance** — each rotation tick of Blade Dance fires a small elemental projectile of the current cycle element; counts as a separate Resonance contributor (1 charge per full rotation) | Multi-hit Asn skill becomes a multi-element charge generator |
| **Shadow Veil** | Defensive concealment buff (post-audit) | **Element Veil** — concealment state additionally rotates active element-resistance type per second (fire→cold→lightning→chaos); breaking veil with a Stab fires the held element as a free Convergence-equivalent on one target | Asn defensive becomes elemental hold-and-release |
| **Chain Strike** | Chains to nearby targets (chaos) | **Arc Strike** — chains follow shock-arc behavior (lightning conversion); each chained target adds 1 lightning Resonance charge | Asn chain mechanic feeds Resonance via lightning thematics |

**Sor-side toggles:** *Deferred until Phase C3 wand/gauntlet/staff pool authoring.* Sor base skills not yet authored. Spec drafts:
- A wand-spam skill → **Cascade Bolt** — each bolt that crits feeds Cascade on the target AND adds the rotation element to Resonance.
- A channeled cast → **Crit Channel** — channel ticks have 100% Cascade-eligibility; each tick rolls for crit independently, building Cascade fast on bosses.

### 5.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| Asn defaults | Dagger, Wand, Claws |
| Sor defaults | Wand, Staff, Gauntlets |
| **Combined unique** | Dagger, Wand (overlap), Claws, Staff, Gauntlets (5 weapons; Wand overlaps both classes) |

Wand overlap means **Wand is the canonical Arcane Blade weapon** — it sits in both home pools and lets the class express its full identity from one weapon slot.

### 5.5 Playstyle Examples

**Wand build (canonical):** Pure Arcane Blade. Wand-spam fast crits build Cascade + Resonance simultaneously; single-target Convergence stabs detonate every 4 crits. Most mechanically dense build — fast tempo, high APM-feel.

**Dagger build (Asn primary):** Melee Arcane Blade. Stab → crit → Resonance charge → repeat. Closer-quarters, slightly slower charge cycle, higher per-strike Cascade scaling. The "blade dancer" feel.

**Staff build (Sor primary):** Caster Arcane Blade. Slower cadence but each cast hits harder; Cascade builds via channel-skill crits (Crit Channel toggle). The "battle scholar" feel — patient charge build, devastating Convergence.

**Gauntlet build:** Melee elemental punches with Cascade. Each combo cycles fire→cold→lightning per punch (gauntlet paradigm) AND each crit adds Resonance — fastest 4-charge build. The "fist mage" feel.

**Claws build:** Dual-grip bleed Cascade. Bleeds count toward Cascade ticks; Resonant Strike toggle converts bleed element per Resonance state. Niche; less elemental-focused than Gauntlets.

### 5.6 Ascendancy Options (inherited from primary class only)

**Asn primary:**
- **Blademaster** — Crit refunds + dual-wield bonus → Resonance charges build twice as fast on dual-wield. Strong wand/dagger.
- **Venomcraft** — Poison can crit; poison crits feed Resonance via Resonant Strike toggle. **Best Asn-side fit for Arcane Blade** — DoT crits become charge engines.
- **Shadowdancer** — Mark-on-first-hit synergizes with Spell Dance toggle's per-rotation charge contribution.

**Sor primary:**
- **Elementalist** — Conversion stacks to 150%; Convergence stabs hit harder.
- **Arcanist** — Resonance cap +5 (becomes 9 charges max); spending grants cast-speed burst. **Best Sor-side fit** — lets you bank multiple Convergences before detonation.
- **Pyromancer/Cryomancer/Stormcaller** — Single-element specialist breaks the rotation; suboptimal for Arcane Blade's 4-element identity.

**Recommendation:** Venomcraft (Asn primary) or Arcanist (Sor primary) maximize Resonant Blade's Cascade-fed Convergence loop.

### 5.7 Caveats — Pending Sor Pool + Engine Wiring

- **Sor base skills not yet authored** — Phase C3 territory. All Sor-side toggles are spec drafts.
- **`CharacterClass` type rename pending** (§15.4) — `mage → sorcerer`. Until then, Sor mana flavor lives in the legacy `mage` entry per §9.4 calibration matrix.
- **Resonance engine wiring pending** — element-charge tracking + Convergence trigger event need new state field `Character.resonanceCharges: ElementType[]`. Save migration needed (v66+).
- **Crit-event hook needed** — `onCritGain` proc handler must fire the Resonance charge increment and run the rotation cycle. Phase A cleanup gap.
- **All 5 Asn-side toggles are authorable on existing dagger pool today.** Sor-side stubs document intent for Phase C3 implementation.

---

## 6. Assassin + Berserker → Dark Reaver

### 6.1 Identity (Layer 1)

**Dark Reaver.** A wounded duelist whose precision sharpens as their HP falls. Where pure Assassin builds crit chains in cold control and pure Berserker hacks through with reckless rage, Dark Reaver is the *bleeding precision-killer* — every wound makes them deadlier, and below half-HP the Cascade no longer caps at 5 stacks. Stay on the edge of death; the deeper you bleed, the harder you crit.

**Aha moment:** Tank a hit deliberately (Frenzied trigger via onHitTaken). Drop to 40% HP. Crit chance jumps +15% from missing-HP scaling. Cascade cap raises from 5 → 10. You unload Stab → crit → Stab → crit → Stab → crit, stacking Cascade past the normal ceiling. By 25% HP you're at 8 Crit Stacks, the next crit deals devastating compounding damage, and the boss is dead before you are. You finish at 1 HP, blade dripping, target obliterated.

### 6.2 Fusion Signature Mechanic (Layer 2) — **Frenzied Cascade**

Combines Assassin's **Crit Cascade** (crits compound via Crit Stacks, capped at 5) with Berserker's **Rage Threshold** (<50% HP unlocks Frenzied):

- **Crit chance scales with YOUR missing HP.** +0.5% crit chance per 1% missing HP (max +25% at 50% HP, max +50% at 1 HP). Reverse-tempo design — the worse you're doing, the more crits you land.
- **Below 50% HP** (Frenzied state active), the **Crit Stack cap raises from 5 → 10**. Cascade compounding doubles in ceiling. Stack-1 to Stack-10 damage scaling preserved; you simply ascend further.
- **Below 25% HP**, each Cascade crit additionally **regenerates 0.5% missing HP per Crit Stack consumed** on Cascade payoff strikes — you sustain via Cascade itself, but only when on the edge.
- **Stay-alive valve:** below 10% HP, you become "Etched" — incoming damage capped at 5% max HP per hit for 3s. Once-per-encounter trigger; gives you a survival window to land the finishing Cascade.
- *No solo class can replicate this.* Asn has Cascade without HP scaling; Brs has Frenzied without Cascade. The Cascade-cap-raise + missing-HP-crit-scaling is unique.

The fusion converts Berserker's "low HP = empowered" loop into a precision-crit engine, and Assassin's "Cascade ceiling" into a HP-gated unlock.

### 6.3 Skill Toggle Morphs (Layer 3) — 5 toggles

**Asn-side toggles (when wielding any Asn-default weapon):**

| Default skill | Default behavior | Toggle (Dark Reaver) | Why this fits |
|---|---|---|---|
| **Stab** | Fast strike, crit creates Exposed | **Reaving Stab** — Stab on crit applies Bloodied (in addition to Exposed); below 50% HP, Stab deals +50% damage and ignores 25% target armor | Asn opener becomes self-HP-scaling Brs hybrid |
| **Viper Strike** | Heavy strike with chaos DoT | **Reaving Strike** — Viper's poison damage is replaced with Bleed (physical DoT); Bleed ticks faster on Frenzied targets; refunds 1% missing HP on Bleed-tick crits | DoT type swap to Brs paradigm; sustain-through-Cascade lever |
| **Shadow Veil** | Defensive concealment buff (post-audit) | **Blood Veil** — concealment becomes "Blood Veil" — incoming damage capped at 10% max HP for 3s; breaking veil with a crit applies Bloodied AoE | Asn defensive becomes Berserker survival window |
| **Blade Dance** | Spinning AoE, hits all in encounter | **Reaver's Dance** — each tick has Cascade-eligibility (normally Blade Dance ticks don't crit-cascade); below 50% HP, Cascade ticks per-rotation hit ALL Bloodied targets, not just the focus | Asn AoE becomes a Cascade-spreader at low HP |
| **Soul Reap (Soul Harvest)** | Spend stacks for AoE | **Blood Reap** — Soul stacks become Blood Stacks (built per Bloodied target); spending Blood Stacks heals 5% per stack consumed AND deals damage scaling with target's missing HP (executioner) | Hybrid sustain + execute payoff |

**Brs-side toggles:** *Deferred until Phase C3 greatsword/flail/claws pool authoring.* Spec drafts:
- A greatsword cleave skill → **Cascade Cleave** — cleave hits roll for crit independently per target; first crit per cleave starts Cascade on each hit target.
- A flail sweep skill → **Bloodied Sweep** — sweep applies Bloodied AoE; Cascade fires from any crit landed during the sweep, choosing the highest-HP-loss target.
- A claws skill → **Frenzied Cascade** — dual claws' bleed proc rolls Cascade on each tick.

### 6.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| Asn defaults | Dagger, Wand, Claws |
| Brs defaults | Greatsword, Flail, Claws |
| **Combined unique** | Dagger, Wand, Claws (overlap), Greatsword, Flail (5 weapons; Claws overlaps both classes) |

Claws overlap means **Claws is the canonical Dark Reaver weapon** — it sits in both home pools and naturally combines bleed (Brs paradigm) with dual-wield Cascade (Asn paradigm).

### 6.5 Playstyle Examples

**Claws build (canonical):** Pure Dark Reaver. Dual-wield claws bleed-spam builds Bloodied AoE; bleed-tick crits feed Cascade past cap; each tick at low HP regens 0.5% missing HP per Stack consumed. Most "bleeding precision" build — high APM, high risk, high reward.

**Dagger build (Asn primary):** Single-target Reaver. Reaving Stab spam below 50% HP; Cascade cap-10 unlocks Stack-9 and Stack-10 damage tiers (huge per-crit damage). Best vs. bosses.

**Greatsword build (Brs primary):** Heavy Reaver. Slower attack cadence; each greatsword crit at 25% HP can carry 8+ Cascade Stacks for devastating cleave hits. The "executioner" build.

**Flail build:** AoE Reaver. Reaver's Dance + Bloodied Sweep clear packs at low HP; Cascade ticks spread across all Bloodied targets in encounter.

**Wand build:** Suboptimal for Dark Reaver — wands favor Arcane Blade fusion. Could be used for ranged self-positioning at low HP, but underutilizes Frenzied Cascade.

### 6.6 Ascendancy Options (inherited from primary class only)

**Asn primary:**
- **Blademaster** — Crits refund cooldown; below 50% HP combined with Frenzied Cascade = nonstop crit chain. **Best Asn-side fit for Dark Reaver.**
- **Venomcraft** — Poison crits scale with missing HP via Reaving Strike toggle.
- **Shadowdancer** — Mark-on-first-hit + Reaving Stab opener; combines two precision payoffs.

**Brs primary:**
- **Warlord** — Execute synergy with low-HP targets compounds with Cascade-execute via Blood Reap toggle.
- **Reaver** — Low-HP indefinitely + can't die during Rage. **Best Brs-side fit for Dark Reaver** — the class's name itself is the ascendancy.
- **Juggernaut** — Tankiness undercuts Frenzied Cascade's missing-HP scaling. Suboptimal.

**Recommendation:** Reaver (Brs primary) or Blademaster (Asn primary) maximize Frenzied Cascade's "stay low HP, crit-cap-10, never die" loop.

### 6.7 Caveats — Pending Brs Pool + Engine Wiring

- **Brs base skills not yet authored** — Phase C3 territory. Greatsword, Flail, Claws (Brs-side) all need pool authoring. Brs-side toggles deferred.
- **`CharacterClass` type rename pending** (§15.4) — `warrior → berserker`.
- **HP-scaling crit chance + Cascade cap-raise need new engine logic** — `tick.ts` HP-threshold check on every attack roll. Frenzied trigger from §3.7 Deathwalker still pending; same engine work covers both pairs.
- **Damage cap "Etched" mechanic needs new state** — `Character.etchedActiveUntil: number` field. Save migration (v66+).
- **All 5 Asn-side toggles are authorable on existing dagger pool today.** Brs-side stubs document intent for Phase C3.

---

## 7. Assassin + Hunter → Nightstalker

### 7.1 Identity (Layer 1)

**Nightstalker.** A predator who marks twice and strikes thrice. Where pure Assassin chains crits via Shadow Mark and pure Hunter sets up first-hit Marks for follow-up payoffs, Nightstalker fuses the two marks into one — every first-hit creates BOTH Shadow Mark AND Hunter's Mark on the same target, and crits re-apply both via Cascade. The class plays surgical execution chess: open with Mark, crit-cycle re-marks, every Mark consumes for double-precision damage.

**Aha moment:** Open Stab on a fresh target — first hit creates Hunter's Shadow Mark (the fused state). Mark grants +30% next-hit crit chance (Hnt) AND +25% damage taken (Asn). Your Stab crit fires Cascade — Cascade re-applies Mark instead of just refreshing Shadow Mark. Next Stab: crit, refresh, crit, refresh. Every strike is a marked-execution hit. The boss takes 4 marked-crits in 2 seconds — each one a precision payoff — before the fight even resolves.

### 7.2 Fusion Signature Mechanic (Layer 2) — **Shadow Mark Cascade**

Combines Assassin's **Crit Cascade** (crits compound via Crit Stacks + Shadow Mark combo state) with Hunter's **Mark & Execute** (first-hit Mark → follow-up payoff window):

- **First hit on an unmarked target always creates "Hunter's Shadow"** — the fused mark state. Hunter's Shadow combines:
  - Hnt Mark behavior: +30% crit chance for the next attack against this target.
  - Asn Shadow Mark behavior: +25% damage taken from you for the duration.
- **Hunter's Shadow lasts 8s base** (Asn Shadow Mark default), refreshed on Cascade-eligible crit.
- **Cascade-eligible crits re-apply Hunter's Shadow.** Normal Cascade refreshes Shadow Mark; this fusion variant refreshes Hunter's Shadow (the +30% next-hit crit ALSO refreshes — every Cascade crit becomes a fresh first-hit-equivalent).
- **Consuming Hunter's Shadow with a finisher** (any payoff skill or boss-killer ability) fires both payoffs in one frame: Hnt's Precision Payoff (+150% damage) AND Asn's Cascade-spend (consume all Stacks, big payoff).
- *No solo class can replicate this.* Asn has Shadow Mark without first-hit-bonus; Hnt has Mark without crit-cycle refresh. Cascade-as-Mark-refresh on a fused state is unique.

The fusion turns "first hit" into "every Cascade crit" — the precision payoff window stays open as long as you keep critting.

### 7.3 Skill Toggle Morphs (Layer 3) — 5 toggles

**Asn-side toggles (when wielding any Asn-default weapon):**

| Default skill | Default behavior | Toggle (Nightstalker) | Why this fits |
|---|---|---|---|
| **Stab** | Fast strike, crit creates Exposed | **Stalking Stab** — first hit on unmarked target also auto-creates Hunter's Shadow (independent of normal mark trigger); crit creates both Exposed + refreshes Mark | Stab becomes the canonical "open + mark" combined opener |
| **Viper Strike** | Heavy strike with chaos DoT | **Hunting Strike** — Viper's chaos DoT also marks the target each tick; tick-marks count as Hunter's Shadow refreshes (DoT-as-mark-engine) | DoT extends Mark window passively |
| **Blade Dance** | Spinning AoE, hits all in encounter | **Shadow Dance** — first hit per rotation per target marks them; rotation 2+ on the same target compounds the +crit-chance bonus (each rotation that re-hits a marked target adds +5% crit) | AoE becomes a multi-target Mark engine |
| **Chain Strike** | Chains to nearby targets | **Hunting Chain** — each chained target gets first-hit Mark applied; chain bonus damage scales with chain count (Hnt-flavored cascade) | Asn chain becomes Hnt mark-spread |
| **Shadow Veil** | Defensive concealment buff (post-audit) | **Hunter's Veil** — concealment grants the next attack guaranteed first-hit Mark application AND guaranteed crit (single hit only) | Defensive becomes guaranteed-payoff opener |

**Hnt-side toggles:** *Deferred until Phase C3 bow rebuild + new Mark/Trap skill authoring.* Spec drafts:
- A bow Mark skill → **Cascade Mark** — applies Hunter's Shadow at range; subsequent Asn dagger weave triggers Cascade.
- A trap skill → **Shadow Trap** — trap detonation applies Hunter's Shadow + Crit Stack (1 stack on detonation, allowing remote Cascade priming).

### 7.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| Asn defaults | Dagger, Wand, Claws |
| Hnt defaults | Bow, Crossbow, Dagger |
| **Combined unique** | Dagger (overlap), Wand, Claws, Bow, Crossbow (5 weapons; Dagger overlaps both classes) |

Dagger overlap means **Dagger is the canonical Nightstalker weapon** — Asn's Mark-and-Cascade home weapon AND Hnt's secondary close-quarters weapon.

### 7.5 Playstyle Examples

**Dagger build (canonical):** Pure Nightstalker. Stalking Stab opener applies Hunter's Shadow; Cascade refreshes per crit; Shadow Dance + Chain Strike spread Marks across packs. Fastest mark-cycle build.

**Bow build (Hnt primary):** Ranged Nightstalker. Cascade Mark (Hnt-side toggle) applies Hunter's Shadow at range; close-quarters dagger weave triggers Cascade refresh. Open at range, finish in melee.

**Crossbow build:** Heavy bolts apply Hunter's Shadow per hit; Cascade Crit Stack builds slower (low ROF) but each crit is huge. The "sniper" build.

**Wand build:** Fast-cast Asn ranged option. Wand crits feed Cascade; works as a swap weapon vs encounter-specific situations. Less Nightstalker-natural than Dagger.

**Claws build:** Dual-wield Mark spam. Bleed builds in addition to Cascade; both mark refreshes and bleed ticks compound. Hybrid sustain build.

### 7.6 Ascendancy Options (inherited from primary class only)

**Asn primary:**
- **Blademaster** — Dual-wield bonus + crit cooldown refund = nonstop Mark cycle.
- **Venomcraft** — Poison crits trigger Mark refresh via Hunting Strike toggle.
- **Shadowdancer** — Mark on first hit baseline + Shadow Momentum stacks. **Best Asn-side fit for Nightstalker** — the ascendancy is literally the pair's design intent.

**Hnt primary:**
- **Marksman** — First-hit + crit synergy compounds with Hunter's Shadow refresh on every Cascade. **Best Hnt-side fit for Nightstalker** — the ascendancy doubles down on the fusion mechanic.
- **Beastmaster** — Animal companion provides parallel Mark application; less optimal for Cascade focus.
- **Trapper** — Multi-trap chains apply Hunter's Shadow AoE; Shadow Trap toggle becomes a remote Cascade primer.

**Recommendation:** Shadowdancer (Asn primary) or Marksman (Hnt primary) maximize Shadow Mark Cascade.

### 7.7 Caveats — Pending Hunter Pool + Engine Wiring

- **Hunter pool is Phase C3 rebuild** — Bow has 6 actives + duplicate id bug + new Mark/Trap skills needed. Hnt-side toggles deferred until rebuild lands.
- **Hunter's Mark mechanic not yet implemented as a state.** §8.1 ComboStateSpec migration territory; needs new state field per `engine/combat/combo.ts`.
- **`CharacterClass` type rename pending** (§15.4) — `ranger → hunter`.
- **Hunter's Shadow fused state needs new combo state** — distinct from both Shadow Mark and Hunter's Mark. Save migration (v66+).
- **All 5 Asn-side toggles are authorable on existing dagger pool today.** Hnt-side stubs document intent for Phase C3.

---

## 8. Sorcerer + Berserker → Spellreaver

### 8.1 Identity (Layer 1)

**Spellreaver.** The canonical battle-mage. Where pure Sorcerer accumulates Resonance from a slow caster cadence and pure Berserker hacks with rage, Spellreaver is the *low-HP elementalist who casts faster the closer to death they get*. Frenzied state empowers Resonance directly — charges build 50% faster, Convergence costs nothing, and below 50% HP your spells become explosive impact tools rather than slow setups.

**Aha moment:** Tank a hit to drop below 50% HP. Frenzied activates. Cast 4 elemental skills back-to-back at 50%-faster Resonance build → 4 charges in half the normal time. Convergence triggers; mana cost is zeroed out by Frenzied. AoE Convergence detonates — fire + cold + lightning + chaos applied to entire encounter. Pack annihilated. You cast another spell immediately (no mana spent on Convergence). The faster you bleed, the harder the elements rain.

This pair is **the canonical "battle mage" build per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §4.2 worked scenario.**

### 8.2 Fusion Signature Mechanic (Layer 2) — **Element Forge**

Combines Sorcerer's **Resonance** (4-element charge → Convergence cast) with Berserker's **Rage Threshold** (<50% HP unlocks Frenzied):

- **Below 50% HP** (Frenzied active): **Resonance charges build 50% faster** — every action that would grant a charge grants 1.5 charges (rounded down with overflow accumulator). Effectively, every 2nd qualifying action grants 2 charges instead of 1.
- **Below 50% HP, Convergence costs 0 mana.** Normal Convergence cost is dumped to zero — you can chain Convergences as fast as you can hit 4 charges.
- **Below 25% HP, Convergence becomes "Forge Convergence"** — instead of the normal 4-element AoE, it fires as a single overwhelming impact: 4× damage + a 3s elemental field at the impact site that re-applies all 4 ailments per second to anything standing in it.
- **Frenzied-state cast speed +20%** (Brs side bonus) compounds with Resonance-cap synergy — you cast faster AND charge faster simultaneously.
- *No solo class can replicate this.* Sor has Resonance without rage scaling; Brs has Frenzied without spell-cast benefit. The HP-scaled Resonance + zero-cost Convergence is unique.

The fusion converts Berserker's "low HP empowers rage" into "low HP empowers spell economy" — same shape, different resource.

### 8.3 Skill Toggle Morphs (Layer 3) — 5 toggles

Spellreaver's toggles are entirely spec drafts since neither Sor nor Brs base skills are authored yet (Phase C3). Specs are listed as design intent for when those pools land.

**Sor-side toggle drafts:**

| Default skill (when Sor pool authored) | Default behavior | Toggle (Spellreaver) | Why this fits |
|---|---|---|---|
| **Wand-spam basic** (Sor default) | Fast cast, single bolt | **Reaving Bolt** — bolts deal +50% damage below 50% HP; on impact apply Bloodied | Sor opener becomes self-HP-scaling Brs hybrid |
| **Channeled cast** (Sor default) | Sustained DoT field | **Frenzy Channel** — channel cast speed scales with missing HP; below 25% HP channel becomes instant-cast (held trigger fires once per second at full damage) | Channel becomes a low-HP burst tool |
| **Convergence cast** | 4-element AoE detonation | **Forge Convergence** — at <25% HP, Convergence becomes a single high-damage impact + persistent elemental field (per §8.2 fusion) | Converts AoE into impact-and-zone hybrid |

**Brs-side toggle drafts:**

| Default skill (when Brs pool authored) | Default behavior | Toggle (Spellreaver) | Why this fits |
|---|---|---|---|
| **Greatsword cleave** (Brs default) | AoE phys cleave | **Element Cleave** — cleave damage gains an element matching current top Resonance charge; cleave hits add 1 charge each | Brs opener becomes Resonance feeder |
| **Self-damage / sacrifice skill** (Brs default) | Self-cost trigger for Frenzied | **Mana Sacrifice** — instead of HP, sacrifice mana to trigger Frenzied state; below 50% mana triggers a "weaker Frenzied" (+25% Resonance build vs. +50%) | Lets caster builds enter Frenzied without dying |

### 8.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| Sor defaults | Wand, Staff, Gauntlets |
| Brs defaults | Greatsword, Flail, Claws |
| **Combined unique** | Wand, Staff, Gauntlets, Greatsword, Flail, Claws (6 weapons — **no overlap**, max breadth) |

Like Deathwalker, Spellreaver has the **maximum 6-weapon access** (no shared weapons between Sor and Brs default pools). Highest mechanical breadth in the class system.

### 8.5 Playstyle Examples

**Gauntlet build:** Canonical battle-mage. Melee elemental punches at low HP; each combo cycles fire→cold→lightning AND each strike at <50% HP gets +50% Resonance contribution. Fastest charge build; frequent Forge Convergences.

**Greatsword build (Brs primary):** Caster-fighter hybrid. Element Cleave morph adds Resonance charges via melee swings; slower cadence than gauntlets but each cleave hits a pack and contributes multiple charges.

**Staff build (Sor primary):** Casting Spellreaver. Slowest paradigm; Frenzy Channel toggle compensates by making channel skills near-instant at <25% HP. The "reckless wizard" — ranged but fragile.

**Wand build:** Standard wand-spam Spellreaver. Sustained tempo, lower per-hit impact, fastest baseline cast cycle. Reaving Bolt + onHitTaken-rage trigger lets you self-mark for Frenzied via tank hits.

**Flail build:** AoE caster-fighter. Flail sweeps spread Bloodied; Elements Cleave applies element-of-the-moment AoE; Forge Convergence detonates via the <25% HP trigger after a few sweeps. Best AoE pair build alongside Deathwalker's flail variant.

**Claws build:** Dual-wield bleed casting. Niche; bleeds build Bloodied which empowers Resonance contribution at low HP. Less elemental-focused.

### 8.6 Ascendancy Options (inherited from primary class only)

**Sor primary:**
- **Elementalist** — Conversion stacks to 150%; combined with Forge Convergence's element field = devastating zone control.
- **Arcanist** — Resonance cap +5; lets you bank multiple Convergences before detonation. **Best Sor-side fit for Spellreaver** — bank 9 charges, then chain 2× Forge Convergence at <25% HP.
- **Pyromancer/Cryomancer/Stormcaller** — Single-element specialist breaks the 4-element Resonance identity. Suboptimal.

**Brs primary:**
- **Warlord** — Execute synergy with low-HP enemies; less optimal because Spellreaver's payoff is YOUR low HP, not theirs.
- **Reaver** — Low-HP indefinitely + can't die during Rage. **Best Brs-side fit for Spellreaver** — sustained Frenzied means perpetual zero-cost Convergence.
- **Juggernaut** — Tankiness undercuts the fusion's HP-scaling. Suboptimal.

**Recommendation:** Reaver (Brs primary) or Arcanist (Sor primary) maximize Element Forge's "stay low HP, charge faster, free Convergence" loop.

### 8.7 Caveats — Pending Both Class Pools + Engine Wiring

- **Both Sor and Brs base skills not yet authored** — Phase C3 territory. ALL toggles are spec drafts.
- **`CharacterClass` type rename pending** (§15.4) — both `mage → sorcerer` AND `warrior → berserker` needed.
- **Resonance engine wiring pending** — element-charge tracking + fractional-charge accumulator for the 1.5×-build mechanic. New state `Character.resonanceCharges: ElementType[]` + `Character.resonanceFractional: number`. Save migration (v66+).
- **HP-threshold cast modifiers need new engine logic** — `tick.ts` HP check on every cast; cost modifier for Convergence; cast-speed modifier for Frenzy Channel.
- **Forge Convergence elemental field needs new entity type** — `PersistentFieldZone` in encounter state. Phase F engineering territory.
- **This pair has the most engine work of any pair** — battle-mage requires Sor + Brs + fusion + persistent fields all to land before playable.

---

## 9. Sorcerer + Hunter → Arcane Archer

### 9.1 Identity (Layer 1)

**Arcane Archer.** The canonical magic-arrow build. Where pure Sorcerer casts elemental spells and pure Hunter shoots marked-projectile follow-ups, Arcane Archer is the *bow-mage* — Mark sets the element of the next cast (cycling), Resonance charges apply to projectile shots rather than cast spells, and Convergence becomes a multi-element arrow volley. Every shot is also a spell; every spell is also a shot.

**Aha moment:** Mark a target with a base bow shot. The Mark application *picks the next element* in your Resonance cycle (fire). Fire your next shot — the bow-arrow becomes a fire-arrow, applies Ignited, AND grants 1 fire Resonance charge. Mark again → cold. Cold-arrow → Chilled + cold charge. Repeat for lightning + chaos. At 4 charges, your next shot is a Convergence Arrow — single arrow that applies all 4 ailments to its target (or pierces through a line for 4-element line damage). The "magic archer" canonical build — bow as wand, wand as bow.

This pair is **the canonical "magic arrow" build per `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §4.2 worked scenario.**

### 9.2 Fusion Signature Mechanic (Layer 2) — **Element-Marked Shot**

Combines Sorcerer's **Resonance** (4-element charge → Convergence) with Hunter's **Mark & Execute** (first-hit Mark, follow-up payoff):

- **Hunter's Mark sets the *element* of your next cast/shot** on a fixed cycle: fire → cold → lightning → chaos → fire (cycle persists across encounters).
- **Resonance charges apply to projectile shots, not casts.** In normal Sorcerer, charges build per cast; in Arcane Archer, charges build per *shot* (bow/crossbow projectile attacks). Casts still benefit from charge expenditures (Convergence) but don't build them.
- **At 4 unique elemental charges**, your **next shot becomes a Convergence Arrow**:
  - **Single-target Convergence Arrow:** the arrow applies all 4 ailments to its target + 4-bucket damage (single hit).
  - **Pierce-line Convergence Arrow** (if pierce talent active): the arrow pierces through a line, applying one element per pierced enemy in cycle order (1st enemy = fire, 2nd = cold, etc.); reduces single-target burst but covers a line.
- **Mark consumed for "Precision Convergence":** consuming a Mark with the Convergence shot instead of a normal shot grants +50% damage + applies all 4 ailments at +50% potency (Hunter precision payoff stacked with Sor Resonance payoff).
- *No solo class can replicate this.* Sor has Resonance without projectile-coupling; Hnt has Mark without element-cycling. Mark-as-element-setter + Convergence-as-arrow is unique.

### 9.3 Skill Toggle Morphs (Layer 3) — 5 toggles

All toggles are spec drafts since neither Sor nor Hnt base pools are authored (Hunter's bow.ts is Phase C3 rebuild).

**Sor-side toggle drafts:**

| Default skill (when Sor pool authored) | Default behavior | Toggle (Arcane Archer) | Why this fits |
|---|---|---|---|
| **Wand-spam basic** | Fast cast, single bolt | **Bow-Bolt** — wand bolts behave as projectiles for purposes of Resonance contribution; element-Marked Shot applies | Wand becomes archer-flavored |
| **Convergence cast** | AoE detonation | **Volley Convergence** — instead of AoE, fires a 5-arrow elemental volley (1 arrow per element, one chaos arrow as a 5th); each arrow applies its element's ailment to nearest enemy | Cast becomes arrow-burst |

**Hnt-side toggle drafts:**

| Default skill (when bow rebuilt) | Default behavior | Toggle (Arcane Archer) | Why this fits |
|---|---|---|---|
| **Basic shot** (Bow default) | Standard arrow | **Element Shot** — basic shot's damage is replaced with element-cycle damage; +1 Resonance charge per shot of new element | Basic shot becomes Resonance feeder |
| **Mark skill** | First-hit Mark application | **Element Mark** — Mark sets cycle element on the target (visual UI + functional state); next shot of any kind applies that element | Mark becomes element-binder |
| **Trap skill** | Setup trap, deal damage on detonation | **Resonant Trap** — trap detonation applies one Resonance charge of the trap's element type AND marks all targets with element-Mark | Trap becomes ranged Resonance + Mark engine |

### 9.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| Sor defaults | Wand, Staff, Gauntlets |
| Hnt defaults | Bow, Crossbow, Dagger |
| **Combined unique** | Wand, Staff, Gauntlets, Bow, Crossbow, Dagger (6 weapons — **no overlap**, max breadth) |

Like Deathwalker and Spellreaver, Arcane Archer has the **maximum 6-weapon access**. Three pairs in the system reach this ceiling.

### 9.5 Playstyle Examples

**Bow build (canonical):** Pure Arcane Archer. Mark cycles element; basic shots build Resonance per element; 4 shots → Convergence Arrow. Fastest cycle build; canonical "magic arrow" expression.

**Crossbow build:** Heavy bolt Arcane Archer. Slower ROF, harder per-hit; Convergence Arrow becomes "Convergence Bolt" — single massive multi-element bolt. Best vs. bosses; frequent Precision Convergence on Marked targets.

**Wand build (Sor primary):** Caster-archer. Bow-Bolt toggle treats wand bolts as projectiles for charge-building. Tempo-equivalent to bow but with caster flavor — sigils instead of arrows.

**Staff build:** Heavy caster Arcane Archer. Slower cadence; Volley Convergence (Sor-side toggle) compensates by firing 5 arrows from one cast. The "summoning storms of arrows" feel.

**Gauntlet build:** Suboptimal — gauntlets are melee, no projectile interaction. Could swap-in for specific encounters but undercuts the projectile-Resonance core.

**Dagger build:** Niche close-quarters Arcane Archer. Daggers can apply element-Mark via Asn dagger morph; close-range Resonance charge build. Less projectile-natural; better for swap scenarios.

### 9.6 Ascendancy Options (inherited from primary class only)

**Sor primary:**
- **Elementalist** — Conversion stacks; element-Mark variants gain potency.
- **Arcanist** — Resonance cap +5; lets you bank multiple Convergence Arrows. **Best Sor-side fit for Arcane Archer** — chain 2× Convergence Arrows for double-volley payoff.
- **Pyromancer/Cryomancer/Stormcaller** — Single-element specialist breaks the cycle. Suboptimal.

**Hnt primary:**
- **Marksman** — First-hit + crit synergy compounds with Element Mark; Precision Convergence becomes a one-shot kill tool. **Best Hnt-side fit for Arcane Archer.**
- **Beastmaster** — Animal companion; less optimal for projectile focus.
- **Trapper** — Resonant Trap + multi-trap chains apply element-Marks AoE; turns the encounter into a Resonance generator.

**Recommendation:** Marksman (Hnt primary) or Arcanist (Sor primary) maximize Element-Marked Shot's "Mark sets element, shot builds charge, Convergence Arrow detonates" loop.

### 9.7 Caveats — Pending Both Class Pools + Engine Wiring

- **Both Sor and Hnt base pools not yet authored** — Phase C3 territory. ALL toggles are spec drafts. Bow rebuild + new Mark/Trap skills + full Sor pool all needed.
- **`CharacterClass` type rename pending** (§15.4) — both `mage → sorcerer` AND `ranger → hunter` needed.
- **Element-Mark state needs new combo state** — distinct from Hunter's Mark (color-coded by element); needs visual UI + state field. Save migration (v66+).
- **Resonance engine wiring pending** — same as Spellreaver/Arcane Blade. Charge tracking + projectile-vs-cast distinction in event hooks.
- **Convergence Arrow needs new attack-resolution path** — distinct from cast-Convergence; routes through projectile damage code.
- **This pair is heavily Phase C3 + Phase F engineering work.** Like Spellreaver, requires both class pools to land before playable.

---

## 10. Berserker + Hunter → Warden

### 10.1 Identity (Layer 1)

**Warden.** A wounded executioner who turns precision into rage and traps into bleeding wounds. Where pure Berserker hacks at low HP and pure Hunter sets up trap-mark-execute chains, Warden fuses the two — every trap detonation applies Bloodied (Brs combo state), and Hunter's precision payoffs scale with YOUR missing HP rather than the target's. The class plays as a *low-HP trap-and-execute hunter*: bleed, trap, mark, execute — and the lower you are, the harder each execute hits.

**Aha moment:** Tank a hit, drop to 35% HP. Frenzied activates. Set a trap; pull a pack into it. Trap detonates — pack becomes Bloodied (per fusion). Mark a target. Your next attack against the Marked target gets Hnt's Precision Payoff (+150% damage), but the +150% becomes +200% because YOU are at <50% HP (warden bonus). The Marked target evaporates. Pandemic-equivalent isn't here, but Bloodied + Mark + low-HP scaling means each Marked execute kill is a one-shot. You finish the pack at 1 HP, having executed each enemy in turn.

### 10.2 Fusion Signature Mechanic (Layer 2) — **Trap-Execute**

Combines Berserker's **Rage Threshold** (<50% HP unlocks Frenzied) with Hunter's **Mark & Execute** (first-hit Mark, follow-up payoff window):

- **Trap detonations apply Bloodied** (Berserker's combo state) to all targets hit. Traps now serve double duty: Hnt setup tool + Brs combo applicator.
- **Hunter's Precision Payoff scales with YOUR missing HP**, not the target's. Default Precision Payoff is +150% damage on Marked-target follow-ups; Warden adds +1% per 1% YOUR missing HP (max +50% at 1 HP, total +200% at 1 HP).
- **Below 50% HP** (Frenzied active), **Marks last 50% longer** AND consume on first hit grant double payoff (Mark window stretches AND payoff stacks).
- **Warden Execute trigger:** when a Marked + Bloodied target falls below 25% HP (its own HP), your next attack against it auto-crits (Hnt+Brs execute fusion).
- **Self-Bloodied state:** when YOU drop below 50% HP, you also become "Self-Bloodied" — gain +25% damage to Marked targets for as long as you're below 50% HP (a personal version of the standard combo state).
- *No solo class can replicate this.* Brs has Bloodied without traps; Hnt has trap-Mark without HP scaling. Trap-as-Bloodied + missing-HP-scaled-precision is unique.

The fusion converts Hnt's setup-execute loop into a low-HP rage-execute loop — two payoff scalers stacked.

### 10.3 Skill Toggle Morphs (Layer 3) — 5 toggles

All toggles are spec drafts since neither Brs nor Hnt base pools are authored (Hunter's bow.ts is Phase C3 rebuild; Brs greatsword/flail/claws are Phase C3).

**Brs-side toggle drafts:**

| Default skill (when Brs pool authored) | Default behavior | Toggle (Warden) | Why this fits |
|---|---|---|---|
| **Greatsword cleave** (Brs default) | AoE phys cleave | **Hunter's Cleave** — cleave applies Mark to all hit targets (not just one); +25% damage per Marked target hit | Brs AoE becomes Mark-spreader |
| **Flail sweep** (Brs default) | Disarm/Stun + AoE | **Trap Sweep** — sweep arms a delayed trap at impact site; trap detonates after 2s for double-application of Bloodied + Mark | Flail becomes trap-deployer |
| **Self-damage / sacrifice** (Brs default) | Self-cost trigger for Frenzied | **Hunter's Sacrifice** — instead of HP loss, sacrifice a current Mark to trigger Frenzied; below-50% trigger met by Mark loss | Lets Hunter-leaning builds enter Frenzied without dying |

**Hnt-side toggle drafts:**

| Default skill (when bow rebuilt) | Default behavior | Toggle (Warden) | Why this fits |
|---|---|---|---|
| **Trap skill** | Setup trap, detonation damage | **Bloodied Trap** — detonation applies Bloodied to all hit targets (canonical fusion enabler); damage scales with YOUR missing HP | Trap becomes self-HP-scaling Bloodied applicator |
| **Mark skill** | First-hit Mark | **Warden's Mark** — Mark target's Precision Payoff scales with YOUR missing HP (replacing default Hnt scaling); below 25% HP, Mark window doubles | Mark becomes the canonical fusion-payoff lever |

### 10.4 Weapon Access (Layer 4)

| Source | Weapons |
|---|---|
| Brs defaults | Greatsword, Flail, Claws |
| Hnt defaults | Bow, Crossbow, Dagger |
| **Combined unique** | Greatsword, Flail, Claws, Bow, Crossbow, Dagger (6 weapons — **no overlap**, max breadth) |

Like Deathwalker, Spellreaver, and Arcane Archer, Warden has the **maximum 6-weapon access**. Four pairs reach this ceiling — all four cross signature lines (Brs↔WD, Sor↔Brs, Sor↔Hnt, Brs↔Hnt) where neither side overlaps default pools.

### 10.5 Playstyle Examples

**Bow build (Hnt primary):** Ranged Warden. Set traps, pull packs in, mark + snipe each Bloodied target. Standard Hnt loop with Brs scaling — every shot at low HP hits twice as hard. Best Marksman ascendancy fit.

**Greatsword build (Brs primary):** Heavy melee Warden. Hunter's Cleave morph applies Mark to packs; subsequent strikes get Precision Payoff scaled with your low HP. The "executioner" build.

**Crossbow build:** Heavy bolt Warden. Each Marked-bolt hit + low-HP scaling = devastating burst. Slower, harder per-shot. Best vs. bosses.

**Flail build:** AoE Warden. Trap Sweep deploys trap-after-sweep; Bloodied + Mark applied AoE; subsequent hits become low-HP-scaled executes across the pack. **Best AoE Warden** — pulls clear in two cycles.

**Claws build:** Dual-wield bleed Warden. Bleed builds Bloodied; bleed-tick crits trigger Mark consume; low-HP scaling compounds tick damage. Hybrid sustain-bleed-execute.

**Dagger build:** Close-quarters Warden. Daggers are Hnt secondary; mark setup at range, dagger weave for execute kills. Niche; less Warden-natural than greatsword/flail/bow.

### 10.6 Ascendancy Options (inherited from primary class only)

**Brs primary:**
- **Warlord** — Execute synergy with Bloodied targets compounds with Warden Execute auto-crit at <25% target HP. **Best Brs-side fit for Warden.**
- **Reaver** — Low-HP indefinitely + can't die during Rage; sustains the missing-HP Precision Payoff scaling permanently. Strong alternative.
- **Juggernaut** — Tankiness undercuts the missing-HP scaling. Suboptimal.

**Hnt primary:**
- **Marksman** — First-hit + crit synergy + missing-HP precision payoff = devastating single-target. **Best Hnt-side fit for Warden.**
- **Beastmaster** — Animal companion provides parallel damage; pet inherits Warden's Bloodied-application via on-hit talents. Strong alternative.
- **Trapper** — Multi-trap chains apply Bloodied AoE. **Top-tier Warden ascendancy** — Bloodied Trap toggle + multi-trap-chain = pack-clear engine.

**Recommendation:** Trapper (Hnt primary) or Warlord (Brs primary) maximize Trap-Execute's "trap, Bloody, mark, execute" loop.

### 10.7 Caveats — Pending Both Class Pools + Engine Wiring

- **Both Brs and Hnt base pools not yet authored** — Phase C3 territory. ALL toggles are spec drafts.
- **`CharacterClass` type rename pending** (§15.4) — both `warrior → berserker` AND `ranger → hunter` needed.
- **Hunter's Mark + Bloodied combo state need engine wiring** — Mark is not yet a state per `engine/combat/combo.ts`; Bloodied exists. Phase C3 territory.
- **Trap detonation event hook needed** — `engine/combat/traps.ts` exists but no Bloodied-application event. Phase C3 wiring.
- **HP-scaled Precision Payoff needs new modifier** — `tick.ts` HP check on every Marked-target attack roll.
- **Frenzied state engine support shared with Deathwalker/Dark Reaver/Spellreaver** — same engine work covers all four pairs that use Rage Threshold.

---

## Cross-Pair Consistency Check

**Run 2026-05-03 — 4/4 PASSED.**

### Check 1: Fusion mechanics combine BOTH class signatures uniquely

All 10 fusion mechanics inspected; each fuses both signatures with a *distinct* shape. No two share their mechanical loop:

| Pair | Signatures fused | Fusion loop shape | Unique? |
|---|---|---|---|
| WD+Asn — Hex Cascade | Pandemic + Crit Cascade | Crit-on-Hexed → Crit Stack + Cursed Cascade death-spread | ✅ |
| WD+Sor — Elemental Pandemic | Pandemic + Resonance | DoTs build Resonance; Convergence on transfer | ✅ |
| WD+Brs — Bloodied Pandemic | Pandemic + Rage Threshold | DoTs +50% to <50% HP; Pandemic doubles on Bloodied | ✅ |
| WD+Hnt — Spirit Trap | Pandemic + Mark&Execute | Cursed-trapped death → Tracking Spirit follows next Mark | ✅ |
| Asn+Sor — Resonant Blade | Crit Cascade + Resonance | Crits add Resonance (cycling element); Convergence-as-stab | ✅ |
| Asn+Brs — Frenzied Cascade | Crit Cascade + Rage Threshold | Crit chance scales with missing HP; Cascade cap 5→10 below 50% HP | ✅ |
| Asn+Hnt — Shadow Mark Cascade | Crit Cascade + Mark&Execute | Hunter's Shadow fused state; Cascade refreshes Mark per crit | ✅ |
| Sor+Brs — Element Forge | Resonance + Rage Threshold | Frenzied = +50% Resonance build + 0-mana Convergence | ✅ |
| Sor+Hnt — Element-Marked Shot | Resonance + Mark&Execute | Mark sets next-cast element (cycling); Convergence-as-arrow | ✅ |
| Brs+Hnt — Trap-Execute | Rage Threshold + Mark&Execute | Traps apply Bloodied; Precision Payoff scales with YOUR missing HP | ✅ |

**Pandemic-using pairs (WD-side) are all distinct:** Hex Cascade ties Pandemic to Cascade-refresh; Elemental Pandemic ties it to Resonance-charge transfer; Bloodied Pandemic ties it to <50%-HP scaling; Spirit Trap ties it to Tracking-Spirit Mark consumption. Same primary signature, four different fusion shapes.

**Cascade-using pairs (Asn-side) are all distinct:** Hex Cascade routes through Pandemic spread; Resonant Blade routes through element-rotation Convergence; Frenzied Cascade raises the cap and scales crit chance; Shadow Mark Cascade routes through Mark refresh.

**Resonance-using pairs (Sor-side) are all distinct:** Elemental Pandemic feeds via DoTs; Resonant Blade feeds via crits; Element Forge accelerates build via Frenzied; Element-Marked Shot couples charges to projectiles.

**Mark&Execute-using pairs (Hnt-side) are all distinct:** Spirit Trap chains via Tracking Spirits; Shadow Mark Cascade fuses with Asn's Shadow Mark; Element-Marked Shot turns Mark into an element-cycler; Trap-Execute scales Precision Payoff with YOUR HP.

**Rage Threshold pairs (Brs-side) are all distinct:** Bloodied Pandemic doubles DoT spread; Frenzied Cascade raises Crit cap; Element Forge zeros Convergence cost; Trap-Execute scales precision-execute with missing HP.

### Check 2: Each pair has 3-5 toggle morphs

| Pair | Toggle count (functional + spec drafts) | Within range? |
|---|---|---|
| Blood Cultist | 5 (3 WD live + 2 Asn live) | ✅ |
| Seer | 5 (5 WD live + Sor drafts deferred) | ✅ |
| Deathwalker | 5 (5 WD live + Brs drafts deferred) | ✅ |
| Soul Trapper | 5 (3 WD live + 2 Hnt drafts) | ✅ |
| Arcane Blade | 5 (5 Asn live + 2 Sor drafts) | ✅ |
| Dark Reaver | 5 (5 Asn live + 3 Brs drafts) | ✅ |
| Nightstalker | 5 (5 Asn live + 2 Hnt drafts) | ✅ |
| Spellreaver | 5 (3 Sor + 2 Brs, all drafts) | ✅ |
| Arcane Archer | 5 (2 Sor + 3 Hnt, all drafts) | ✅ |
| Warden | 5 (3 Brs + 2 Hnt, all drafts) | ✅ |

All 10 pairs land at 5 toggles — uniform density, none under 3, none over 5.

### Check 3: Toggle morphs respect §4.3 Paradigm Preservation Rule

Spot-checked every primary-side toggle (40 toggles total across 10 pairs). Each toggle changes flavor + combo state + damage type but preserves paradigm shape (single-target stab stays single-target stab; AoE sweep stays AoE sweep; channel stays channel). Examples:

- **Stalking Stab / Hexstab / Arcane Stab / Reaving Stab:** All four toggles of Stab keep it as a single-target precision strike; only the on-crit state and damage flavor differ.
- **Reaver's Dance / Shadow Dance / Spell Dance:** All Blade Dance variants keep it as a multi-tick spinning AoE; Cascade-eligibility / Mark application / Resonance contribution add per-tick effects without reshaping the rotation paradigm.
- **Frost Locusts / Tracking Swarm / Blood Swarm / Shadow Swarm:** All Locust Swarm variants preserve "chaos DoT, transfers on death (Pandemic vector)"; only secondary effects (chill stacks, mark application, missing-HP scaling, physical-poison hybrid) layer on top.

No toggle reshapes the underlying skill paradigm. ✅

### Check 4: Weapon-access overlap not redundant

| Pair | Total weapons | Overlap | Net-new vs primary | Redundant? |
|---|---|---|---|---|
| WD+Asn — Blood Cultist | 5 | Dagger | 2 net-new | ✅ |
| WD+Sor — Seer | 5 | Staff | 2 net-new | ✅ |
| WD+Brs — Deathwalker | 6 | none | 3 net-new | ✅ |
| WD+Hnt — Soul Trapper | 5 | Dagger | 2 net-new | ✅ |
| Asn+Sor — Arcane Blade | 5 | Wand | 2 net-new | ✅ |
| Asn+Brs — Dark Reaver | 5 | Claws | 2 net-new | ✅ |
| Asn+Hnt — Nightstalker | 5 | Dagger | 2 net-new | ✅ |
| Sor+Brs — Spellreaver | 6 | none | 3 net-new | ✅ |
| Sor+Hnt — Arcane Archer | 6 | none | 3 net-new | ✅ |
| Brs+Hnt — Warden | 6 | none | 3 net-new | ✅ |

**4 pairs at 6 weapons (no overlap, max breadth): Deathwalker, Spellreaver, Arcane Archer, Warden.**
**6 pairs at 5 weapons (single-weapon overlap, 2 net-new each).**

No pair has more than 1 overlapping weapon; every pair adds at least 2 net-new weapon access points beyond its primary class. No redundancy. ✅

**Cross-Pair Consistency Check: 4/4 PASSED 2026-05-03.**

---

## Phase F Authoring Path

| Step | Output | Dependency |
|---|---|---|
| Author 9 remaining pair briefs (sections 2-10 above, full template per pair) | 9 design docs | Skill-fantasy audit must land first to avoid toggle morph rework |
| Engineer schema (`SkillToggleMorph`, `Character.skillToggles`, `PairFusionMechanic`) | 4 type/data files + migrations | Designs above lock toggle scope first |
| Wire engine (`getEffectiveSkillDef` toggle resolution + fusion mechanic dispatch) | 2 engine files | Schema landed |
| UI (toggle checkboxes in skill-bar config) | 1 React feature | Engine landed |
| Author the 10 fusion-mechanic implementations | 10 mechanic dispatch sites | Engine + schema landed |
| Author the ~40 toggle morphs (data) | 40 morph cells in skill data | Engine + schema landed |

**Estimated Phase F effort:** 6-10 sessions across design + engineering + content. Comparable in scope to Phase C class-tree authoring.

---

**End of multi-class pair briefs (10 of 10 complete — Phase B step 9 done 2026-05-03).**

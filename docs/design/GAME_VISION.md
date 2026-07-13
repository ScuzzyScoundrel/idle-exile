# GAME VISION — the north star (owner, 2026-07-12)

> **One line: weapons are the verbs, your class is the language they're
> spoken in, and multiclassing is the accent.**

This document is the OWNER'S intent, captured after the Phase 3 economy
waves shipped. Every future design sprint and wave plan answers to this.
Where current systems conflict with it, this wins (behind the gates —
see §5).

## 1. The stack (bottom to top)

1. **Weapons carry the skills.** Every weapon has a fixed base kit —
   its verbs (Reap, Channel, Guard). Weapons are class-agnostic
   content. A class can use a default set of weapons (e.g. Witch
   Doctor: staff, dagger, scythe).
2. **Classes interpret the skills.** The class is a LENS: Staff's
   "Channel" is a locust swarm for a Witch Doctor, an arcane beam for a
   Sorcerer. One weapon, many identities. The class lens also owns the
   ECONOMY GRAMMAR (which ledger/decision machine the kit runs on, if
   any) and the scaling theme (low-life, poison, crit, execute…).
3. **Talents specialize the class.** Three WoW-Classic-style trees per
   class — multi-pronged, deep capstones vs. wide dipping.
4. **Multiclass layers on top.** Unlocks the secondary class's weapons
   AND attaches the secondary's SIGNATURE RIDER to your primary skills.
   You can also spec into the secondary's trees (capped — see
   guardrails).
5. **Ascendancy anchors identity.** Primary-class-only, build-warping
   nodes (Path of Exile-style). This is the reason your primary class
   always matters.

## 2. Signature riders (the multiclass mechanic)

Every class defines ONE rider. When that class is your SECONDARY, its
rider attaches to all your primary skills.

**THE RIDER BAR (owner refinement, 2026-07-12): a rider must never
GRANT a tool — tool access (poison, bleed, ailments, procs) belongs to
weapons and especially UNIQUES ("granted from uniques if people can't
gain them naturally"). A rider is a RULE that warps how you build and
play, and it gets STRONGER the more tools you stack — a force
multiplier, not an affix.** "Your skills apply poison" fails the bar;
"your DoTs spread on kill" passes it, because a unique that grants
poison suddenly matters twice as much to that pairing.

Rider sketches AT the bar (to be re-judged in the riders wave):

- Witch Doctor — Pandemic: your DoTs/debuffs spread to nearby enemies
  on kill (or detonate on expiry) — multiplies ANY ailment source.
- Berserker — Bloodrage: damage scales as your life drops — changes
  how you gear and where you fight.
- Sorcerer — Conversion: your damage changes type/element — re-wires
  every gear and tree interaction.
- Assassin — Shadow cadence: consuming resources/crits opens echo
  windows — a timing game layered on any kit.
- Hunter — Predator economy: marks + precision payoffs — a target-
  selection game layered on any kit.
- (future) Paladin — Consecrate: kills sanctify ground with standing
  effects — a positioning/uptime game.

Example: Witch Doctor/Paladin with a scythe — Reap detonates poison on
kill (WD lens) and every kill consecrates ground that heals you
(Paladin rider). Flip to Paladin/WD: the Paladin's scythe
interpretation with hexes riding on top. Same pairing, completely
different build. Design cost stays LINEAR: each new class needs its
skill interpretations + one rider; every combo emerges free instead of
hand-authoring N×N hybrids.

## 3. Guardrails (keep builds unique, not mushy)

- SHARED talent point pool across both classes — real tradeoffs.
- Secondary trees are CAPPED — no capstones from the off-class.
- Ascendancy is primary-only.
- Prior art: Grim Dawn dual-mastery.

## 3b. Uniques are the TOOL-ACCESS layer

Placeholder uniques get replaced with designed build-arounds (planned
since Phase 2). Their job in this architecture: grant tools and bend
rules — give poison to a class that lacks it, give a second window
type, break a cap. Riders and lenses then multiply what uniques grant.
This is what makes item hunting matter in an idle game.

## 4. Idle-genre hook

The combinatorial class-pair space is the PRESTIGE loop: "reroll into a
new pairing" is the rebirth hook.

## 5. Reconciliation with what exists (2026-07-12)

| Vision layer | Exists today | Delta |
|---|---|---|
| Weapons carry skills | ✅ per-weapon skill files, data-driven modules, 6 gated kits | Kits are weapon-keyed INCLUDING their economies |
| Class lens | ⚠️ fragments: classAdjustment natural-pairs, CLASS_INNATE_EFFECTS, Phase-B pair briefs, F6 SkillToggleMorph plan | THE missing layer — no per-class skill reinterpretation; ledgers must move INTO the lens (@classCharge sentinel decision already points here) |
| 3 talent trees | ⚠️ trees exist as multi-path JSON (404 nodes) with tier gate | No authored prerequisite edges, dead stats, path count ≠ 3, no point-pool discipline |
| Multiclass + riders | ⚠️ hardware decided (weapon2, sentinels, per-skill routing — sprint doc); 10 Phase-B pair briefs | Riders are a NEW mechanic (cleanly expressible as class-scoped effect packages); no acquisition/prestige flow |
| Ascendancy | ✅ engine exists (ascendancyId/ranks, allocation, respec) | Content + primary-only rule + integration with the pair system |

**What survives as the FLOOR regardless of direction:** the sim gate
battery (six kit smart-vs-blind gates, GATE P cross-kit parity 1.30×,
E5/E5b variation forks, E6 mana recovery, Pass 0 closure). The gates
don't mandate LEDGERS — they mandate that decisions matter and power
stays comparable. Any lens redesign must keep them green or re-gate
with documented rationale.

**Owner concern that triggered this doc:** "the dagger ledger pushes
people to use assassinate and fan of knives rather than other
abilities… just the weapon passives is what is tripping me out."
Resolution direction: the ledger is the CLASS's decision grammar, not
the weapon's identity; weapon kits should read as movesets, and the
funnel intensity (spender damage share, PERFECT prominence) is a dial.

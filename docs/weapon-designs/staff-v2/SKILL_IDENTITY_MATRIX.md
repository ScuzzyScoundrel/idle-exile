# Staff v2 — Per-Skill Identity Matrix

> **Why this exists:** raw stat nodes (T1a, T1b, T3c, T4b) used to be the same boring `+dotMultiplier` / `+ailmentDuration` across every skill, so leveling 4 skills to L5 felt identical. This matrix defines a unique stat pool per skill so that each skill's "default" leveling experience feels different.
>
> **Rule for JSON authors:** raw stat nodes (non-proc, non-conditional behavior slots) MUST pull from the per-skill identity pool below. Notables and procs follow standard cross-skill rules.

## Per-Skill Identity Pool

Each skill has 5-6 stats that are uniquely thematic. Raw stat nodes pull from this pool — never from a generic "DoT skill default" set.

### 1. Zombie Dogs — *tank pack, bite-driven*
- `minionHpMult` (dog HP)
- `extraZombieDogCount` (more dogs)
- `zombieDogAttackIntervalReduction` (faster bites)
- `dogBiteHauntedChance` *(NEW)* — chance dog bite applies haunted
- `dogLifestealPercent` *(NEW)* — dogs heal player on bite
- `dogPackAuraDamage` *(NEW)* — +damage while dogs alive

### 2. Locust Swarm — *transfer-on-kill carrier, AoE chaos*
- `chaosPenetration`
- `swarmTransferDamageBonus` *(NEW)* — +damage to next target on transfer
- `locustTickRate` *(NEW)* — faster ticks
- `locustSpreadRadius` *(NEW)* — initial cast radius
- `swarmExtraTransferTargets` *(NEW)* — chains to N enemies on first kill
- `dotMultiplier` (shared but flavored "swarm density")

### 3. Haunt — *cold chain-on-death, snapshot, haunted-creator*
- `coldPenetration`
- `hauntChainRange` *(NEW)* — chain reach in pack
- `hauntSnapshotBonus` *(NEW)* — +damage to fresh haunts
- `hauntedTargetCritBonus` *(NEW)* — +crit chance vs haunted
- `ailmentDuration` (shared but flavored "lingering spirit")
- `chainCount` (shared but flavored "spirit jumps")

### 4. Hex — *curse debuff, weakening, debuff platform*
- `hexPotency` *(NEW)* — % more damage reduction on Hexed targets
- `hexDuration` *(NEW)* — Hex debuff duration
- `hexSpreadRadius` *(NEW)* — apply Hex to N adjacent enemies
- `hexedTargetDamageAmp` *(EXISTS)* — +damage you deal to hexed targets
- `hexResistShred` *(NEW)* — Hex also reduces target's resist
- `cooldownReduction` (shared but flavored "ritual mastery")

### 5. Spirit Barrage — *multi-hit cold, haunted-consume, projectile chains*
- `extraHits` (extra projectiles)
- `perProjectileDamageBonus` *(NEW)* — each hit after first +%
- `spiritBarrageProjectileCrit` *(NEW)* — +crit per projectile already fired
- `coldPenetration`
- `hauntedConsumeBonus` *(NEW)* — bigger consume payoff
- `incCritMultiplier` (shared "spectral focus")

### 6. Plague of Toads — *AoE leap, pandemic spread, poison stacks*
- `toadCount` *(NEW)* — extra toads spawned
- `toadLeapRange` *(NEW)* — toads reach further
- `pandemicSpreadRadius` *(NEW)* — pandemic hits more enemies
- `poisonStackPerImpact` *(NEW)* — toad impact applies N poison stacks
- `chaosPenetration`
- `toadImpactCritChance` *(NEW)* — impact has crit chance

### 7. Fetish Swarm — *glass cannon DPS, attack speed, fragility tradeoff*
- `extraFetishCount`
- `fetishAttackSpeedMult` *(NEW)* — fetishes attack faster
- `fetishCritChance` *(NEW)* — fetish bites can crit
- `fetishDamageMult` *(NEW)* — pure fetish damage
- `fetishOnDeathSpawnDog` *(NEW)* — chance to spawn dog on death
- `fetishFrenzyStacking` *(NEW)* — kills grant attack speed stacks

### 8. Soul Harvest — *single-target burst, hex-consume, soul stack feeder*
- `soulStackCapOverride` (EXISTS — also used by Mass Sacrifice's Endless Ritual)
- `soulHarvestExecuteBonus` *(NEW)* — +damage on low-HP targets
- `soulHarvestLifeLeech` *(NEW)* — heals on cast
- `hexedConsumeBonus` *(NEW)* — bigger 2x payoff on Hexed
- `soulHarvestCritBonusStacks` (EXISTS)
- `incCritChance` (shared "soul focus")

### 9. Bouncing Skull — *fire chain, soul stack consume, ignite*
- `chainCount` (skull bounces)
- `bouncingSkullDamageCompound` *(NEW)* — each bounce +%
- `firePenetration`
- `igniteChanceOnBounce` *(NEW)* — chance to ignite per bounce
- `bonusBounceDuration` *(NEW)* — skull lingers
- `soulConsumeChainBonus` *(NEW)* — extra bounces per soul stack consumed (beyond +1)

### 10. Mass Sacrifice — *(already designed in mass_sacrifice.json)*
- minionHpMult, damagePerMinionAlive, burstDamagePerDebuffOnTarget, soulStackDamagePerStack, plaguedConsumePoisonStacks, etc.

## Cross-Skill Stats (allowed to repeat — but flavor description distinctly)

These can appear on multiple skills BUT the description must reflect the skill's identity:

- `incDamage` — every skill needs raw scaling. Flavor: "Soul Channel" (Haunt), "Voodoo Power" (Hex), "Fetish Fury" (Fetish), etc.
- `incCritChance` — flavor as "Phantom Edge" / "Hunter's Eye" / "Predator's Sight"
- `cooldownReduction` — flavor as "Ritual Mastery" / "Spectral Velocity" / "Quickdraw Voodoo"
- `dotMultiplier` — flavor as "Swarm Density" / "Ghost Bite" / "Plague Potency"

## Stat-Field Sharing Audit (cross-skill)

To avoid duplication, no two skills should pick the same field for the **same branch's T1a slot**. Quick check matrix:

| Skill           | Plague T1a            | Spirit T1a            | Voodoo T1a            |
|-----------------|----------------------|-----------------------|-----------------------|
| Zombie Dogs     | dotMultiplier (bite poison) | minionHpMult        | dogPackAuraDamage     |
| Locust Swarm    | swarmTransferDamage  | extraTransferTargets  | chaosPenetration      |
| Haunt           | hauntSnapshotBonus   | incDamage (Soul Ch.)  | incCritChance         |
| Hex             | hexPotency           | hexSpreadRadius       | hexedTargetDamageAmp  |
| Spirit Barrage  | dotMultiplier (NA)   | extraHits             | perProjectileDmg      |
| Plague of Toads | poisonStackPerImpact | toadCount             | toadImpactCritChance  |
| Fetish Swarm    | fetishDamageMult     | extraFetishCount      | fetishCritChance      |
| Soul Harvest    | hexedConsumeBonus    | soulStackCapOverride  | incCritChance         |
| Bouncing Skull  | igniteChanceOnBounce | chainCount            | bouncingSkullDmgComp  |
| Mass Sacrifice  | dotMultiplier        | damagePerMinionAlive  | incDamage             |

**No T1a is duplicated within a column.** That's the user-experience guarantee: leveling 4 skills' Plague branches doesn't surface the same node 4 times.

## Notes on New Engine Fields

Most "NEW" fields above are simple numeric `ResolvedSkillModifier` additions that auto-merge. A few are `rawBehaviors` objects (e.g., `dogBiteHauntedChance` could be either; pick numeric for auto-merge unless it has multi-key shape).

Apply points are noted per-skill in the JSON design docs.

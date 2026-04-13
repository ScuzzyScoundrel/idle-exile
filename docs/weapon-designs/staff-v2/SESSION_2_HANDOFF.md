# Staff v2 — Session 2+3 Handoff

> Fresh-context starting point. Updated 2026-04-13. Session 3 wired the
> remaining runtime-pending rawBehaviors — all 9 trees are now live with
> meaningful per-talent combat behavior.

## Current Live State (master: `feca627`)

All **9 staff talent trees** shipped live matching their JSON designs. The
~80 runtime-pending rawBehaviors from the original session-2 punch-list
are now wired across the engine.

| Skill | Live | Commit |
|---|---|---|
| Mass Sacrifice | ✓ | prior session |
| Locust Swarm | ✓ | `98dd1a6` |
| Haunt, Hex, Spirit Barrage | ✓ | `a7e507f` |
| Plague of Toads, Zombie Dogs, Fetish Swarm, Soul Harvest, Bouncing Skull | ✓ | `25138e5` |

**Session 3 rawBehaviors wiring:**
- `0519b0d` — minion-hit rawBehaviors (t1 starter) + talentTree.ts bug fix
- `2e9cbf2` — mass wiring pass across all hook surfaces (~60 behaviors)
- `abdae6a` — second-wave SB/BS variants + death loop extras
- `feca627` — stackers (predatorsMark/huntersEye/spiritResonance) +
  locust burst + bouncing skull pyre trail

**Validation as of handoff:**
- `npx tsc -b` clean
- `npx vite build` clean
- `qa-staff-mechanics` 115/115 PASS
- `qa-talents` 514 PASS, 0 FAIL (up from 510)

## ⚡ Critical bug found this session

**`src/engine/talentTree.ts:84` was DROPPING every explicit `rawBehaviors` object from node modifiers.**

When a talent node was declared like:
```ts
t1a: bh('Rotting Fangs', '...', { rawBehaviors: { dogBitePoisonStacks: 1 } })
```

the `resolveTalentModifiers` merge loop hit `rawBehaviors` in
`EMPTY_GRAPH_MOD`, then the line `if (key === 'rawBehaviors') continue`
skipped it entirely — so the inner fields never made it into
`result.rawBehaviors`.

Fix: spread the object's inner fields instead of skipping. This silently
unlocked dozens of previously-dead behaviors across every talent tree in
the game.

## Engine work shipped in Sessions 2+3

### Infrastructure
- `MinionState`: added `attacksFired`, `forcedCritsRemaining`,
  `killsFired`, `reviveAt`, `lastRegenTickAt`, `lastDamagedAt` fields.
- `MinionAttack`: added `attackNumber`, `minionId`, `forcedCrit` — lets
  the weapon module look up the emitting minion and mutate state.
- `MaintenanceResult`: added `healAmount`, `minionDeathAoe`, `packDebuffs`
  return channels.
- `absorbDamage`: rewrote front-loaded (was split-evenly, chip-damaged
  all minions in lockstep).
- `stepMinions`: increments `attacksFired`, consumes `forcedCritsRemaining`,
  emits `attackNumber` + `minionId` + `forcedCrit`.

### Hook surfaces wired

**`staff.ts tickMaintenance`** — per-minion-attack rawBehaviors, passives,
minion death detection, permanent modes:
- Dog bite procs: BitePoisonStacks, BiteBleedingChance, BiteExtraStackChance,
  CritExtraStacks, BiteLifesteal, BiteSoulStackChance+ICD,
  CritSoulStackChance+ICD, BiteApplyAllDotsChance, BiteAppliesPlagued,
  BiteAppliesHexedHaunted, BiteMaxHpDamagePercent, BiteEveryNHexed,
  PackPowerPerDog, DamagePerSoulStack+Uncapped, BonusDamageVsPlagued/Hexed
- Fetish dart procs: HitPoisonChance, CritBleedingStacks,
  HitSoulStackChance+ICD, CritSoulStackChance+ICD, CritCascadeAttacks,
  EveryNAppliesPlagued, HitAlwaysAppliesPoisonAndBleeding, AttackSplash,
  DamagePerSoulStack+Uncapped, PhysToChaos, CritChance, DamageMult
- Minion death: dogDeathPulsePercent, fetishDeathPoisonCloud,
  fetishOnDeathSpawnDog, dogAutoRevive
- Passives: soulTether, dogRegenPercentPerSecond, permanentColony,
  fetishPermanentMode, dogAuraDamagePerDog, plagueCourtAllPlagued,
  witchingHour, hexAppliesBleedingPerSecond

**`staff.ts postCast`** — summon overrides, AoE, cross-skill buffs:
- Keystone mode restructures: alphaDogMode, fetishKingMode,
  fetishCastSummonsDog
- Cross-skill buff producers: spiritEcho, ghostlyFinale, toadSurge,
  locustSurge, soulSurge
- Stackers: predatorsMark, huntersEye, soulHarvestNextCrit (producer)
- Hex/Haunt/Toads variants: hexCastBuffsMinions,
  spiritBarrageTransfersPlagued/AppliesHaunted, boneTowerSummon,
  permanentToadMinion, eternalHaunt
- Locust cast extras: locustInitialBurstPercent, locustSpreadRadius
- Spirit Barrage extras: spiritBarrageExtendsChilled,
  spiritBarrageConsumeSouleFetish
- Bouncing Skull extras: bouncingSkullBounceSpiritChance,
  bouncingSkullBounceTriggersMinionAttacks, bouncingSkullPyreTrail +
  pyreTrailBonusDurationPercent+DamagePercent

**`staff.ts preRoll`** — cast-time damage modifiers + consume buffs:
- Haunt: hauntSnapshotBonus, hauntedExecuteThreshold,
  damagePerHauntedEnemyInPack, hauntChainDamageCompound read-side
- Hex: puppeteerHexCastDamage (maxHp × soul_stacks)
- Soul Harvest: soulHarvestHexedConsumeBonus/Mult, ConsumesAllStacks,
  ExecuteThreshold
- Toads: toadsExecuteThreshold, frogPrinceChance+Multiplier,
  toadsStackCompounder, toadLeapRange, toadHoppingBounces
- Bouncing Skull: bouncingSkullDamageCompound, FinalBounceBonus,
  soulConsumeChainBonus, ConsumesAllStates, MultiSkull, EndlessBounces,
  FinalAoeBonus, burningWorldFirePool
- Spirit Barrage: ConsumesSoulStacks, PinpointMode, SingleShot,
  ProjectileExtraStack, PerMinionExtraProjectile, MassVolley,
  CritCascade, Split, FinalProjectileBonus
- Cross-skill: compoundingTick, soulStackBuffsMinionsPercent,
  spiritResonance/huntersEye/predatorsMark read-side
- Cross-skill buff consumers: spiritEcho, ghostlyFinale, toadSurge,
  locustSurge, soulSurge, soulHarvestNextCrit

**`tick.ts`** — cast-site AoE + maint consumption:
- Hex spread: hexSpreadRadius, hexAdjacentSpread, hexPackOnCastPotency
- Haunt AoE: hauntIsAoe, spreadHauntAdjacent, hauntApplyHexedOnCast,
  hauntInstantBurst
- Toads AoE: toadCount, toadsApplyHexed
- Locust AoE: locustAoeOnCast
- Maint consumption: healAmount → player HP heal,
  minionDeathAoe → front-3 pack damage + debuff, packDebuffs → pack-wide refresh

**`zoneAttack.ts`** — per-DoT-tick + on-DoT-kill rawBehaviors:
- Per-tick: miniPandemicChance, locustExecuteThreshold,
  locustHealsMinionsPerTick, hauntChainDamageCompound, spiritConduit,
  plagueMarkBuildup+detonation, hexedDecayMark,
  swarmTransferDamageBonus, swarmInfiniteChain
- Death loop: hauntedDeathSpawnsSoulStack, hauntDeathTriggersSoulHarvest,
  locustHexedKillSpawnsSoulStacks, hexedDeathSpreadsHex,
  soulHarvestKillSpreadDots, soulHarvestKillRefundCdPercent,
  bouncingSkullKillRefundsBounces, locustKillSpawnsPermMinion,
  spiritResonance

## Genuinely deferred (not wired)

These behaviors either require infrastructure that doesn't exist yet or
would need a targeted design pass. If a playtester finds one feels dead,
here's what they are:

**Projectile-simulation dependent:**
- `spiritBarragePerHitSpawnsGhost` — per-projectile-hit ghost spawn
- `spiritBarrageSplit` — projectile split after hit (approximated as
  extraChains for now)
- `toadLeapNext` — chained leap chain (approximated as extraChains)
- `toadGodMinionAttacksSpawnToad` — per-minion-attack toad spawn
- `bouncingSkullPerMinionBounce` — per-minion-alive bounce count (only
  damageMult approximation active)

**Complex multi-target infra:**
- `minionBonusDamageVsHexed` / `minionHexedResistShred` / `spiritMarkBonus`
  / `minionHexedKillSummonsSpirit` — cross-skill minion-hit mods wired
  into the generic minion damage branch, but `spiritMarkBonus` and
  `minionHexedResistShred` need per-hit resist recalc which isn't in
  minion pipeline yet.
- `ghostlyCurseCastSpeed` — player castSpeed modifier from minion auras,
  needs stat-resolution hook.
- `soulStackMinionInvuln` — minion HP floor while soul_stacks active,
  would need damage-absorption bypass.
- `vexingDebuffMaxStacks` — requires DEBUFF_DEF.vexing which isn't
  defined yet.

## Known balance dials

- Minion damage scaling (`SUMMON_CONFIGS`) last tuned at `b036e0d`
- Locust/Haunt/Toads snapshotPercent (40/35/30) in `debuffs.ts`
- Fetish cooldown 14s / HP 5% — if they die too fast at higher zones, bump HP

## How to resume

1. Playtest to find what feels off. Most builds should now have real
   talent impact in combat.
2. If a specific talent is dead, grep `rawBehaviors` for its key — if
   it's not in `staff.ts` / `tick.ts` / `zoneAttack.ts`, it's in the
   deferred list above.
3. Pre-push gate:
   ```bash
   npx tsc -b
   npx vite build
   npx tsx sim/qa-staff-mechanics.ts
   npx tsx sim/qa-talents.ts
   ```

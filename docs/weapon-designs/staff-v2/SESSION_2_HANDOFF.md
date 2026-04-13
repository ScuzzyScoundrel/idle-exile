# Staff v2 — Session 2 Handoff

> Fresh-context starting point. Updated 2026-04-13. Supersedes
> `TALENT_AUDIT_HANDOFF.md` for Session 2 state.

## Current Live State (master: `25138e5`)

All **9 staff talent trees** shipped live matching their JSON designs. Each
tree has 39 nodes with ≥50% proc-rich / rich-conditional behavior slots,
skill-identity raw-stat pools (no T1a duplication across skills), and
intentional cross-skill touchpoints at notable + keystone tiers.

| Skill | Live | Commit |
|---|---|---|
| Mass Sacrifice | ✓ | prior session |
| Locust Swarm | ✓ | `98dd1a6` |
| Haunt, Hex, Spirit Barrage | ✓ | `a7e507f` |
| Plague of Toads, Zombie Dogs, Fetish Swarm, Soul Harvest, Bouncing Skull | ✓ | `25138e5` |

**Validation as of handoff:**
- `npx tsc -b` clean
- `qa-staff-mechanics` 111/111 PASS
- `qa-talents` full sweep: 0 FAIL, 11 COST:??? (all intentional keystone tradeoffs)

## Engine work shipped this session

Hook order + file paths. Search these for the actual wiring:

- **Minion subsystem** (`src/engine/combat/minions.ts`)
  - Added `spirit_temp` SUMMON_CONFIG (10% player HP, 25% SP, 1.5s interval, cold)
  - Added `damageDealt` tracking to MinionState
  - Rewrote `absorbDamage` front-loaded (first alive minion takes full hit, overkill cascades — was split-evenly which chip-damaged all minions simultaneously)
  - Tuned: zombie_dog damage 0.6→0.85 SP, interval 3→2.5s; fetish damage 0.25→0.40 SP, interval 1.5→1.25s, HP 10%→5%
- **Proc system** (`src/engine/combatHelpers.ts`)
  - Added `newMinions` + `newComboStates` to ProcResult
  - Handlers for `proc.summonMinion` (constructs MinionState from SUMMON_CONFIGS) and `proc.createComboState`
  - `castSkill` procs use existing `freeCast: { skillId, damageMult }` (no new field needed)
- **Tick pipeline** (`src/engine/combat/tick.ts`)
  - Merges `pr.newMinions` + `pr.newComboStates` at 4 proc sites (onHit/onCast/onCrit main loop, onAilmentTick, onKill, aoeKill)
  - Minion attacks carry element → apply signature ailment (dogs poisoned, fetishes bleeding, spirits frostbite) via new `maint.minionDebuffs[]` return field
  - Skill-native DoT block for staff_locust_swarm / staff_haunt / staff_plague_of_toads: applies `locust_swarm_dot` / `haunt_dot` / `toads_dot` with per-instance `damageElement` from `elementTransform ?? skill.baseConversion.to` (bypasses ELEMENT_AILMENT mapping)
  - Hex cast applies `hexed` debuff on target with hexDuration/hexPotency rawBehaviors
  - `withMaint` merge order reversed so `out.patch.activeMinions` wins over `maintPatch.activeMinions` (was dropping DoT-kill-spawned spirits)
- **DoT kill onKill procs** (`src/engine/combat/zoneAttack.ts`)
  - DoT ticks killing mobs now fire `onKill` procs for every skill that had a DoT on the dying mob (resolved via `getSkillGraphModifier`). Enables Hive Spawn / Echoing Death / Hex Echo / Soul Eater for DoT-killing skills.
  - **DoT transfer between waves**: when DoT wipes a pack and a new one spawns, surviving DoT debuffs (bleeding/poisoned/burning/frostbite) transfer to the front mob of the new pack preserving `appliedBySkillId` + snapshots + remaining duration.
- **Minion absorption wired in idle/boss ticks** (`zoneAttack.ts`, `bossAttack.ts`)
  - Was only absorbing during cast ticks; most mob hits fire between casts. Now absorbs pre-HP subtraction, same position as ES.
- **New debuff defs** (`src/data/debuffs.ts`)
  - `frostbite` (cold snapshot DoT, replaced chilled as cold auto-ailment)
  - `locust_swarm_dot` / `haunt_dot` / `toads_dot` (skill-native DoTs, snapshotPercent 40/35/30)
  - `hexed` (−20% target damage, stackable 1)
- **UI** (`src/ui/zones/PlayerHpBar.tsx`, `DebuffBadge.tsx`, `zoneConstants.ts`)
  - Minion badge: HP + element-tinted attack-timer bar + "Total dealt" counter, tooltip with "next attack in Xs" + "on hit: applies X"
  - MinionsRow gets a "Minions (N)" header + rolling `Σ dealt: X` total
  - Skill-native DoTs render on mobs as `{icon} {dps}/s` with element-tinted badge (orange=fire, sky=cold, purple=chaos, red=phys, yellow=lightning); full name + element in tooltip
  - Frostbite DPS badge path added
- **Element transform** (`src/ui/components/SkillPanel.tsx`)
  - Was gated to `weaponType === 'dagger'`; now any active skill with damage (spellPowerRatio > 0 OR weaponDamagePercent > 0) gets the Lv.5 element picker. Zombie Dogs + Fetish Swarm skipped (0 cast damage).
- **Skill data** (`src/data/skills/staff.ts`)
  - Locust Swarm: removed `AoE` tag (was causing pack-wide application, undermining transfer-on-kill + THE PLAGUE LORD T7)
  - Fetish Swarm: cooldown 10 → 14s (burst window felt too perma-pet)

## Runtime-pending rawBehaviors (WHAT REMAINS)

Nodes allocate + resolve correctly but do nothing at runtime yet. Need
bespoke wiring in `src/engine/combat/weapons/staff.ts` (usually in preRoll,
postCast, or tickMaintenance). Grouped by hook surface:

### staff.ts preRoll (damage modifiers, state reads at cast time)
- `hauntSnapshotBonus` — first 2 ticks of Haunt +%
- `compoundingTick` — per-target consecutive-tick damage buildup
- `damagePerHauntedEnemyInPack` — count haunted in pack, +%
- `hauntedExecuteThreshold` — haunted HP gate, +100% damage below threshold (already in ResolvedSkillModifier, just needs tick.ts damage app)
- `puppeteerHexCastDamage` — hex cast deals %maxHp per soul_stack
- `soulHarvestHexedConsumeBonus` / `soulHarvestHexedConsumeMult` — SH hex consume mults
- `spiritBarrageConsumesSoulStacks` / `spiritBarragePinpointMode` / `spiritBarrageSingleShot`
- `bouncingSkullDamageCompound` / `bouncingSkullFinalBounceBonus` / `soulConsumeChainBonus` / `bouncingSkullConsumesAllStates`
- `soulHarvestConsumesAllStacks` / `soulHarvestExecuteThreshold`
- `toadsLeapMode` / `toadsExecuteThreshold` / `toadsStackCompounder` / `frogPrinceChance+Multiplier`

### staff.ts postCast (combo/debuff/minion state creation after cast)
- `hexPotency` / `hexDuration` — already read in tick.ts hex debuff block via rawBehaviors, verify scaling
- `hexSpreadRadius` / `hexAdjacentSpread` / `hexPackOnCastPotency` / `witchingHour`
- `spreadHauntAdjacent` / `eternalHaunt` / `hauntIsAoe` (already in ResolvedSkillModifier; need tick.ts hook for staff_haunt)
- `hauntApplyHexedOnCast` / `hauntInstantBurst`
- `spiritBarrageTransfersPlagued` / `spiritBarrageAppliesHaunted` / `spiritBarrageExtendsChilled` / `spiritBarrageProjectileExtraStack` / `spiritBarragePerMinionExtraProjectile` / `spiritBarrageMassVolley` / `spiritBarrageCritCascade` / `spiritBarrageSplit` / `spiritBarragePerHitSpawnsGhost` / `spiritBarrageFinalProjectileBonus`
- `locustAoeOnCast` / `locustInitialBurstPercent` / `locustSpreadRadius`
- `toadCount` / `toadLeapRange` / `toadLeapNext` / `toadsApplyHexed` / `toadHoppingBounces` / `permanentToadMinion` / `toadGodMinionAttacksSpawnToad`
- `hexCastBuffsMinions` (proc fires but handler must apply to minions)
- `spiritBarrageConsumeSouleFetish` / `hauntedConsumeSummonsSpirit`
- `bouncingSkullBounceSpiritChance` / `bouncingSkullPerMinionBounce` / `bouncingSkullBounceTriggersMinionAttacks` / `bouncingSkullMultiSkull` / `bouncingSkullEndlessBounces` / `boneTowerSummon`
- `bouncingSkullPyreTrail` / `bouncingSkullFinalAoeBonus` / `burningWorldFirePool` / `pyreTrailBonusDurationPercent+DamagePercent`

### staff.ts tickMaintenance (passive per-tick effects)
- `soulTether` — heal % max HP per Haunted enemy
- `permanentColony` — keep 4 spirit_temp alive always
- `alphaDogMode` / `fetishKingMode` — modify SUMMON_CONFIGS on summon
- `fetishPermanentMode` — auto-resummon fetishes
- `dogRegenPercentPerSecond` — passive dog regen
- `dogAutoReviveSeconds` — timed revive
- `plagueCourtAllPlagued` — keep all mobs Plagued
- `witchingHour` — keep all mobs Hexed
- `hexAppliesBleedingPerSecond` — per-sec bleed on hexed mobs
- `hexedDecayMark` — ramping dmg-taken on hexed mobs
- `soulStackBuffsMinionsPercent` / `soulStackMinionInvuln` — passive stack buffs for minions
- `eternalHaunt` — track LRU, prevent expiry
- `vexingDebuffMaxStacks` (also DEBUFF_DEF.vexing needed if not added)

### tick.ts auto-ailment / debuff tick block
- `hauntChainDamageCompound` (ResolvedSkillModifier) — per-chain damage tracking
- `spiritConduit` — tick-modifies Haunt damage + subtracts minion HP
- `miniPandemicChance` (Locust T5b) — roll per tick, spread Locust to pack
- `locustExecuteThreshold` — low-HP bonus to Locust ticks
- `plagueMarkBuildup` — per-target mark counter, detonation at max
- `swarmTransferDamageBonus` — compound bonus per transfer
- `swarmInfiniteChain` — override transfer cap
- `locustHealsMinionsPerTick` — heal each minion per tick
- `locustKillSpawnsPermMinion` — spawn spirit_temp with override duration on locust kill

### tick.ts minion attack hook
- `dogBitePoisonStacks` / `dogBiteBleedingChance` / `dogBiteExtraStackChance` / `dogCritExtraStacks` / `dogBiteApplyAllDotsChance` / `dogAppliedDotDurationBonus` / `dogBiteAppliesPlagued` / `dogBiteAppliesHexedHaunted` / `dogBiteLifesteal` / `dogBiteSoulStackChance` / `dogBiteMaxHpDamagePercent` / `dogBiteEveryNHexed` / `dogPackPowerPerDog` / `dogsBonusDamageVsPlagued` / `dogsBonusDamageVsHexed` / `dogDamagePerSoulStack` / `dogDamagePerSoulStackUncapped` / `dogAuraDamagePerDog` / `dogCritSoulStackChance` / `dogDeathPulsePercent` / `critHexedTriggersDogPackAttack`
- Same pattern for fetish: `fetishHitPoisonChance` / `fetishCritBleedingStacks` / `fetishPhysToChaosPercent` / `fetishEveryNAppliesPlagued` / `fetishAttackSplashTargets+Percent` / `fetishAppliedDotDurationBonus` / `fetishPlagueConduitSeconds` / `fetishDurationPenaltySeconds` / `fetishDeathPoisonCloud` / `fetishHitAlwaysAppliesPoisonAndBleeding` / `fetishCritChance` / `fetishHitSoulStackChance` / `fetishCritSoulStackChance` / `fetishDamagePerSoulStack` / `fetishDamagePerSoulStackUncapped` / `fetishCritCascadeAttacks` / `playerCritTriggersFetishPackAttack` / `fetishKillSpiritSpawnChance` / `fetishOnDeathSpawnDog` / `fetishFrenzyStacking` / `fetishFrenzyAllMinionKills+MaxOverride` / `fetishAttackSpeedMult` / `fetishDamageMult`
- Minion/Hex interaction: `minionBonusDamageVsHexed` / `minionHexedResistShred` / `spiritMarkBonus` / `ghostlyCurseCastSpeed` / `minionsBecomeColdInheritHexPotency` / `hiveMotherMinionBonus` / `minionLocustSpreadChance` / `minionHexedKillSummonsSpirit`

### Death loop (tick.ts / zoneAttack)
- `hauntedDeathSpawnsSoulStack` / `hauntDeathTriggersSoulHarvest` — post-DoT-kill hooks
- `soulHarvestKillSpreadDots` / `soulHarvestKillRefundCdPercent`
- `bouncingSkullKillRefundsBounces`
- `hexedDeathSpreadsHex`
- `locustHexedKillSpawnsSoulStacks`

### Cross-skill / sequence buffs (buff consume on next-cast)
- `spiritEcho` (consumed on next non-Spirit-Barrage)
- `ghostlyFinale` (consumed on next Spirit Barrage)
- `toadSurge` (consumed on next non-Toads)
- `locustSurge` (consumed on next non-Locust)
- `soulSurge` (consumed on next Mass Sacrifice)
- `soulHarvestNextCrit` (forces next SH crit)
- `spiritResonance` (ASPD stacker per kill)
- `huntersEye` (crit multi stacker per consecutive hit)
- `predatorsMark` (crit chance stacker per consecutive cast)

Implementing all of this is a meaningful chunk of work. Suggest tackling
by playtest priority: allocate a keystone, find it does nothing, wire it.

## Quality-of-life improvements shipped for testing

- **Minion badges** show attack-timer bar + element + next-attack-in-Xs + total-dealt
- **Debuff badges** show skill name + element tint for skill-native DoTs
- **DoTs transfer between waves** on pack wipe (front mob inherits)
- **Minions persist through waves** (state.activeMinions never reset on pack clear)

## How to resume

1. Read this doc + `docs/weapon-designs/staff-v2/TALENT_AUDIT_HANDOFF.md` (prior session).
2. Pick from runtime-pending list above based on playtest pain points.
3. Use existing staff.ts hooks as templates — Mass Sacrifice's detonation, resummon, and pandemic handlers show the patterns.
4. Pre-push gate:
   ```bash
   npx tsc -b
   npx vite build
   npx tsx sim/qa-staff-mechanics.ts
   npx tsx sim/qa-talents.ts
   ```
5. Add QA assertions for any new rawBehavior wired — `sim/qa-staff-mechanics.ts` at line ~1315 has a good proc-effect section to append to.

## Known balance dials

- Minion damage scaling (`SUMMON_CONFIGS`) last tuned at `b036e0d`
- Locust/Haunt/Toads snapshotPercent (40/35/30) in `debuffs.ts` — may be too strong after the skill-native-DoT refactor removed the 0.15×2 dotScale hack
- Fetish cooldown 14s / HP 5% — if they die too fast at higher zones, bump HP slightly

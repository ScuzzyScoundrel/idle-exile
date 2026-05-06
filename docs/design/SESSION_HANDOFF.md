# Session Handoff — READ THIS FIRST

**Last updated:** 2026-05-06 (Phase A + B + C + §15.4 rename + §8.1 + archive sweep + Phase 2 cleanup + classTrees effects.ts pass 1 + Phase D multi-rank + **Phase E ALL 15 ASCENDANCIES** + Combat HUD wire-up + minion HUD pills + Phase F F1a HP-threshold conditionals + Phase F F1b broadcast/refund actions + Phase F F1c combo-state duration stat + Phase F F2 first slice — minion-event proc engine + 9 WD Spirit Whisperer entries + Phase F F3 first slice — trap-event proc engine + 8 Hunter Trapper entries + **Phase F F4 first slice — companion-event proc engine + grantCompanion + 11 Hunter BM entries** all COMPLETE).
**Purpose:** If you're resuming the idle-exile combat-and-class overhaul in a new session, read this doc first to refresh the full picture in <5 minutes. Then dive into whichever detailed doc the next-move section points to.

---

## NEXT SESSION START HERE — Phase F sub-phase queue

Branch is `master` at the latest F1c commit. Phase F's cheap-cluster (F1a + F1b + F1c) is shipped; F2 through F6 are queued in the order below. Each is its own focused session — start with F2.

**Resume order:**

1. **F2 follow-on — full minion-event coverage** (~1-2 days, ~16 more WD SW nodes; Hunter BM is companion-gated so deferred to F4)
   • F2 first slice landed: 3 new `TalentEffect` kinds (procOnMinionHit/Crit/Death), dispatch helpers, hooks into `staff.ts` minion-attack consumer + death-detection loop, 9 WD SW entries authored.
   • Remaining WD SW nodes need: (a) `summon` action wired (currently a stub) so `wd_sw_resilient_spirits` (Spirit Echo on death) and `wd_sw_eternal_court` (revive) work; (b) `grantBuff` action wired so `wd_sw_bone_armor` (DR shield), `wd_sw_spirit_shield` (next-cast bonus), `wd_sw_voodoo_roar` (3+ minions buff) work; (c) `mana` ref threaded into `WeaponTickContext` so `wd_sw_soul_ration` (5 mana on minion hit) actually restores mana; (d) per-source-skill filter on procOnMinion* so `wd_sw_fetish_frenzy` (Fetish-only) doesn't fire for dogs; (e) "double-strike" / "extra minion attack" action so `wd_sw_pack_mastery` and `wd_sw_spectral_edge` get accurate behavior instead of bleed/hex approximations; (f) "Necro Stack" / generic player-side stack mechanic for `wd_sw_death_mastery`.

2. **F3 follow-on — full trap coverage** (~1-2 days, ~12 more Hunter Trapper nodes)
   • F3 first slice landed: 2 new `TalentEffect` kinds (procOnTrapDetonate, procOnTrapChain), dispatch helpers, hook into `dagger.ts` onEnemyAttack trap-detonation site, 8 Hunter Trapper entries (3 live + 4 forward-compat seeds + 1 capstone analog).
   • Remaining nodes need: (a) bow/crossbow trap mechanic so Hnt's primary-weapon traps actually exist (today only dagger's Blade Trap fires the F3 procs); (b) `'snare' / 'snared'` added to TalentTag union + TALENT_TAG_TO_DEBUFF map (currently approximated as `frozen`); (c) `rearmTrap` / "fire twice" action for Multi-Arming / Snare Detonation Mastery / Chain Reaction; (d) `mana` / `skillTimers` refs threaded into onEnemyAttack ctx so Trap-side refundCooldown / refundMana actions actually mutate state; (e) trap-tagged-source filter on procOn* so detonation-only effects don't double-fire on regular hits.

3. **F4 follow-on — companion summon runtime** (~3-5 days, activates Hunter BM nodes for Hunter players)
   • F4 first slice landed: 3 new `TalentEffect` kinds (procOnCompanionHit/Crit/Death) + `grantCompanion` flag-kind + dispatchers + `staff.ts` companion-filtered hooks (when minion type === 'companion', fires the new procs in addition to procOnMinion*) + 11 Hunter BM entries authored + capstone Pack Leader allocates `grantCompanion`.
   • Remaining work to make Hunter actually GET a companion: (a) extract minion-attack-loop + death-detection from `staff.ts` into a generic `tickPlayerMinions` runner in `tick.ts` so non-staff classes also tick their minions; (b) add a per-tick check that spawns a singleton type='companion' MinionState (via `summonMinions` with a new SUMMON_CONFIGS.companion archetype) when `talentEffects.some(e => e.kind === 'grantCompanion')` is true and no companion is already alive; (c) decide companion persistence (likely no expiresAt — the per-tick check re-spawns after death, optionally with a cooldown); (d) add 'companion' MINION_STYLE entry to `CombatStatusBar.tsx` for HUD pill labeling (currently falls back to gray); (e) optionally add `whileCompanionAlive` conditional kind for nodes like Pack Awareness / Pack Synergy / Companion's Fury; (f) `mana` / `skillTimers` refs threaded into tickMaintenance to activate refundMana/refundCooldown on companion events. **Hunter BM nodes already authored will start firing automatically** once (a)+(b) land.

4. **F5 — Signature mechanics × 5** (~1 week each, ~80-100 nodes unlocked across all)
   • F5a Crit Cascade (Assassin) — `state.critStacks: number` (max 5, decay timer); on every crit add 1 stack via existing dispatcher hook; `whileCritStacksAtLeast` and `perCritStack` TalentEffect kinds; consume on Shadow Mark application.
   • F5b Mark & Execute (Hunter) — Mark already exists as a debuff tag. Need "Precision Payoff" mechanic: a separate skill cast that consumes Mark for bonus damage. New combat tick check + cast path.
   • F5c Rage Threshold (Berserker) — Frenzied state when `currentHp / maxLife < threshold`. State enables conditional bonuses. New `state.frenzied: boolean` + `whileFrenzied` TalentEffect kind. Threshold-raise nodes modify the trigger %.
   • F5d Resonance / Convergence (Sorcerer) — `state.resonanceCharges: { fire: number; cold: number; lightning: number; chaos: number }`. Charges added when matching elements deal damage. Convergence skill consumes all charges for 4-element burst. `onResonanceChargeGain` and `onConvergenceCast` proc kinds.
   • F5e Pandemic / Hex-can-crit (Witchdoctor) — Pandemic mechanic on enemy death (transfer DoTs to other enemies). Hex-can-crit changes hex damage roll. Both mechanics need new combat-tick paths.

5. **F6 — Multi-class fusion engineering** (multi-week, new system)
   • Goal: Phase F-locked design (per `docs/design/MULTI_CLASS_PAIRS.md`) — 10 pair archetypes with toggle morphs + fusion mechanics
   • Approach: `SkillToggleMorph` schema in `src/types/skills.ts`. `Character.skillToggles: Record<string, string>` (skill id → morph id). `getEffectiveSkillDef(skill, toggles)` resolves base + morph. Fusion-mechanic dispatch sites in `tick.ts` per-pair. UI: per-skill morph dropdown.
   • The 10 fused combo-state specs already exist in `src/data/comboStates.ts` (Phase C3 §8.1) — engine wiring of those is the bulk of F6.

**Each sub-phase is gated only by the previous one being solid (no compile errors, no broken combat tick).** Start a fresh session for each — context budget per phase is ~200-400k tokens.

---

## Current state at a glance

**Phase A — Foundation Engineering: ALL 5 CHANGES CORE LANDED + proc handlers wired 2026-05-03.** Engine has skillKind branching (cast/channel/instant/auto), auto-attacks, ailment trigger rework, mana consumption gate, skill audit applied to staff + dagger pools, AND **all 4 event-proc mana handlers (`onKillGain`/`onHitDealtGain`/`onHitTakenGain`/`onCritGain`) are now live in `tick.ts`** — `tickManaWithCost(mana, dtSec, cost, procGain=0)` extended with optional proc-gain parameter, both boss path (line ~1730) and pack path (line ~2710) compute per-class event totals from `CLASS_MANA_CONFIG[character.class]` and feed them in. `tsc -b --force` 0 errors. Two Phase A deferrals remain (channel expiry enforcement §9.1; `CharacterClass` type rename §15.4); neither blocks Phase B/C.

**Phase B — Design Lock: 100% COMPLETE 2026-05-03.** Class fantasy briefs (5/5), 4-Layer Multi-Class Identity Model locked, Class-First weapon-default Model B locked, **all 10 multi-class pair briefs authored 2026-05-03 (Cross-Pair Consistency Check 4/4 PASSED)**, skill audit complete + applied, Asn×Staff morph retune complete, **all 5 class trees authored as JSON 2026-05-03 (404 total nodes; cross-class consistency check ✅ passed 10/10)**. **No design-lock work remains.**

**Phase C step 1 — JSON class-tree registry: COMPLETE 2026-05-04.** `tsconfig.app.json` enables `resolveJsonModule`. New typed shape `ClassTreeData` at `src/types/classTree.ts`. New registry at `src/data/classTrees/index.ts` exports `CLASS_TREES` map + helpers (`getClassTree`, `findClassTreeNode`, `getClassTreeAllNodes`, `getClassTreeNodeIds`, `getClassTreeMaxPoints`). **Adding a future class is now a 2-line change in the registry + 1-line union update — designed for the user's stated "classes are just the beginning" growth path.** `src/data/classTalents.ts` carries a deprecation header pointing engineers at the JSON registry; it remains the engine's effect-data source until Phase C step 2.

**§15.4 CharacterClass type rename: COMPLETE 2026-05-04** (commit `69ae2e6a`). Save migration v66 added. CharacterClass union is now `'berserker' | 'sorcerer' | 'hunter' | 'witchdoctor' | 'assassin'`.

**Phase C3 step 1 — new weapon pools: COMPLETE 2026-05-04.** WeaponType union extended with `flail` / `claws` / `scythe` (3 missing Phase B class-default weapons). Three new per-weapon skill files authored at full quality (10 actives + 3 passive abilities each, all with `skillKind` / `manaCost` / `baseAilmentChance` per Phase A schema): `src/data/skills/flail.ts` (Brs AoE-cleave), `src/data/skills/claws.ts` (Brs/Asn dual-wield bleed), `src/data/skills/scythe.ts` (WD reach/reaper). Bow rebuilt 6 → 10 actives with stale ID cleanup (`bow_multi_shot` → `bow_ice_barrage`, `bow_smoke_arrow` → `bow_shock_arrow`) + new pair-fusion enablers (Hunter's Mark / Bear Trap / Pierce Volley / Tracking Shot). `src/data/weapons.ts` extended with new WEAPON_TYPE_META entries.

**Phase C3 step 2 — wand/gauntlet/greatsword/crossbow rebuilds: COMPLETE 2026-05-04.** Extracted from `secondary.ts` (1750 → 1064 lines) into per-weapon files matching the flail/claws/scythe quality bar: `src/data/skills/wand.ts` (10 actives + 3 abilities — Sor/Asn shared, Arcane Blade canonical), `src/data/skills/gauntlet.ts` (10+3 — Sor melee-spell, Spellreaver canonical battle-mage), `src/data/skills/greatsword.ts` (10+3 — Brs flagship cleave), `src/data/skills/crossbow.ts` (10+3 — Hnt heavy ranged). All skills now carry Phase A schema fields (`skillKind`/`manaCost`/`baseAilmentChance`). Each pool got 3-4 new pair-fusion enabler skills (Cascade Bolt, Crit Channel, Volley Convergence, Element Mark on wand; Frenzy Channel, Forge Convergence, Element Combo on gauntlet; Cascade Cleave, Hunter's Cleave, Mana Sacrifice on greatsword; Convergence Bolt, Resonant Trap, Heavy Mark, Pierce Bolt on crossbow). `secondary.ts` retains 6 remaining weapon types (axe/mace/greataxe/maul/scepter/tome) as legacy.

**Phase C step 2 — UI/engine cutover to JSON node ids: COMPLETE 2026-05-04.** Engine (`engine/classTalents.ts` + `engine/classTalentDispatcher.ts`) and UI (`ClassTalentPanel.tsx`) now read class talent trees from the JSON registry (`src/data/classTrees/index.ts`) instead of the legacy 24-point trees in `src/data/classTalents.ts`. Side-table `src/data/classTrees/effects.ts` provides typed `TalentEffect[]` for the subset of nodes whose engine wiring exists today; `getNodeEffects(classId, nodeId)` combines inline JSON `effects?` field + side-table lookups. Save migration v67 cleared legacy `talentAllocations` (different node id space — `wd_voodoo_1` ↔ `wd_pp_lingering_toxin`); players keep all talent points and re-spec into the new JSON tree. UI now renders JSON `theme` for path subtitles, `description` directly for nodes, with capstone/identity/multi-rank badges. Multi-rank engine support deferred (each node treated as 1-point allocate-once until Phase D adds it).

**Archive sweep — per-skill talent system retired: COMPLETE 2026-05-04.** Per-skill talent graphs (`data/skillGraphs/` 28 files) and legacy 24-point trees (`data/classTalents.ts`) moved to `src/data/_archive/` (preserved for history; excluded from tsc via `tsconfig.app.json`). UI components `SkillGraphView.tsx` + `TalentTreeView.tsx` deleted; per-skill talent JSX blocks + inline `SkillTreeView` function stripped from `SkillPanel.tsx`. The class trees in `src/data/classTrees/` are now the sole talent layer.

**Phase F F4 first slice — companion-event proc engine + grantCompanion: COMPLETE 2026-05-06.** Three new `TalentEffect` kinds added: `procOnCompanionHit`, `procOnCompanionCrit`, `procOnCompanionDeath` (mirroring F2 procOnMinion* shape — chance + TalentAction). One new presence-flag kind: `grantCompanion` (no params except optional `minionType`; presence in `talentEffects` marks the player as having companion permission for the future summon runtime). `scaleTalentEffectByRank` and applyConditionalTalentEffects break-cases extended; 3 new `dispatchProcOnCompanion*` helpers + `hasCompanionGrant(effects)` predicate added to `classTalentDispatcher.ts`. **`staff.ts` companion-filtered hooks** added at both F2 sites — minion-attack consumer (after the existing F2 dispatch, looks up `attackingMinion = updatedMinions.find(m => m.id === a.minionId)` and fires procOnCompanion* if `attackingMinion.type === 'companion'`) + death loop (fires procOnCompanionDeath if `prev.type === 'companion'`). Means companion procs work today for any class with a type='companion' minion in `state.activeMinions` (today: only via WD multi-class fusion or future summon runtime). **11 Hunter Beastmaster entries authored**: `hnt_bm_pack_bond` / `hnt_bm_companions_vigor` / `hnt_bm_hunting_tempo` / `hnt_bm_hunters_loyalty` (4 forward-compat seeds for companionDamage/Hp/AttackSpeed/SummonManaCost stats not yet on ResolvedStats), `hnt_bm_pack_hunt` (procOnCompanionHit applyTag mark, 5%), `hnt_bm_hunters_mark_bond` (procOnCompanionHit applyTag mark — focus-targeting analog), `hnt_bm_wild_strike` (procOnCompanionHit applyTag bleed), `hnt_bm_beastmasters_ferocity` (procOnCompanionCrit applyTag bleed — double-crit analog), `hnt_bm_pack_sovereign` (procOnCompanionCrit applyTag bleed — same), `hnt_bm_pack_leader_preview` (grantCompanion flag node). Plus 1 ascendancy capstone: `asc_hnt_bm_pack_leader` (grantCompanion). Companion-summon runtime is the F4 follow-on; entries activate automatically once it lands. tsc EXIT=0.

**Phase F F3 first slice — trap-event proc engine: COMPLETE 2026-05-06.** Two new `TalentEffect` kinds added: `procOnTrapDetonate`, `procOnTrapChain` (mirroring F2 shape). `scaleTalentEffectByRank`, dispatcher break-cases, and 2 new `dispatchProcOnTrap*` helpers wired in `classTalentDispatcher.ts`. **`dagger.ts` hook** added at the existing trap-detonation site (`onEnemyAttack` line ~469): captures `trapsBefore = activeTraps.length`, fires procOnTrapDetonate every detonation, fires procOnTrapChain only when `trapsBefore > 1` (rough chain approximation until real chain-detonation logic lands). Builds TalentProcContext with sourceSkillId `'dagger_blade_trap'`; mana/skillTimers refs not threaded so refundMana/refundCooldown no-op. **8 Hunter Trapper entries authored**: `hnt_tp_quick_reload` (stat:cooldownRecovery delta 2 — broader than design "trap-only" since cooldownRecovery is global), `hnt_tp_snare_cascade` (procOnTrapDetonate applyTagAll frozen — chance 100, AoE freeze on multi-target detonation as snare proxy), `hnt_tp_chain_trap` (procOnTrapChain applyTag bleed — chain damage escalation analog). Plus 4 forward-compat seeds: `hnt_tp_trappers_hand` (incTrapDamage), `hnt_tp_heavy_trap` (trapDetonationDamage), `hnt_tp_trap_stack` (maxActiveTraps), `hnt_tp_trap_reservoir` (maxActiveTraps). Bow/crossbow trap mechanics don't exist yet so today's procs only fire when player has dagger equipped; bow trap nodes (Bear Trap etc.) will inherit the same hooks when those weapon modules adopt traps.ts. tsc EXIT=0.

**Phase F F2 first slice — minion-event proc engine: COMPLETE 2026-05-06.** Three new `TalentEffect` kinds added: `procOnMinionHit`, `procOnMinionCrit`, `procOnMinionDeath` (each: chance + TalentAction). `scaleTalentEffectByRank` extended (chance × rank, capped 100); dispatcher break cases added; 3 new `dispatchProcOnMinion*` helpers in `classTalentDispatcher.ts` mirror the existing procOnHit/Crit pattern. `WeaponTickContext` extended with optional `talentEffects?: TalentEffect[]` (legacy callers default to no procs). `tick.ts` hoists `collectTalentEffects + collectAscendancyEffects` above `tickMaintenance` (was line ~314, now at ~166) and threads through into the maintenance ctx. **`staff.ts` hooks** added at two sites: minion-attack consumer (after `finalDamage` computation, fires procOnMinionHit always + procOnMinionCrit when isCrit) and death-detection loop (before the existing `!drb` filter so death procs fire for any vanished minion regardless of source-skill graphMod presence). Both sites build a TalentProcContext with `targetDebuffs` (front mob in clearing / activeDebuffs in boss), player life ref, and the dying/attacking minion's sourceSkillId; healSelf side-effects accumulate into the existing healAmount return. **9 WD Spirit Whisperer entries authored**: `wd_sw_spirit_bond` (procOnMinionHit applyTag hex, 2% rank-1), `wd_sw_inherited_curse` (procOnMinionCrit applyTag hex, 25% rank-1), `wd_sw_spectral_edge` (procOnMinionCrit applyTag hex, 5% rank-1 — flavor analog for "extra minion attack"), `wd_sw_pack_mastery` (procOnMinionHit applyTag bleed, 1% rank-1 — analog for "double-strike"), `wd_sw_soul_ration` (procOnMinionHit refundMana 5, 5% rank-1 — currently no-ops until mana ref threaded), `wd_sw_pack_sovereign` capstone (procOnMinionCrit applyTagAll hex, 100% — flavor analog for chaos AoE). Plus 3 forward-compat seeds: `wd_sw_spirit_conduit` (minionSummonManaCost), `wd_sw_spirit_vigor` (minionHp), `wd_sw_soul_bind` (minionDuration). Hunter Beastmaster nodes (28) are gated on the F4 companion mechanic (every BM node has `dependencies: ["companionMechanic"]`) so deferred. tsc EXIT=0.

**Phase F F1c — combo-state duration stat: COMPLETE 2026-05-06.** `createComboState` and `createStateFromSpec` in `src/engine/combat/combo.ts` now accept an optional `durationMult: number = 1` final param applied as `duration * durationMult`. All 26 call sites updated: 4 in `tick.ts` (proc-spawned combo state generic creator path), 10 in `staff.ts` (haunted on dog hit, soul_stack ×4, spirit_link, dog_aura, generic creator + Double Harvest crit bonus, Cascading Doom crit refresh), 8 in `dagger.ts` (Shadow Mark passthrough, replace.to/comboConfig in preRoll, FoK Saturated, Blade Ward Guarded, trap Primed, comboModification onDetonation applyDebuff/grantBuff), 3 in `zoneAttack.ts` (DoT-kill proc creator + 2× hauntedDeath/locustHexedKill soul_stack). Each passes `1 + (effectiveStats.ailmentDuration ?? 0) / 100` so combo state durations now scale with the same `+Ailment Duration` stat that already scales DoT debuff durations. **4 buggy existing entries fixed** (`asn_vc_lingering_doom`, `asc_asn_vc_lingering_toxin`, `asc_asn_sd_killers_grace`, `asc_hnt_mm_mark_tracker` — all `delta: 0.5` → `50` to match the `/100` percent scale used in tick.ts). **5 new entries authored**: `wd_pp_pandemic_vector` (delta 5, +25% at rank 5), `wd_vs_branding_iron` (delta 10, +30% at rank 3), `brs_wl_bloodied_mastery` (delta 10, +30% at rank 3), `hnt_mm_mark_master` (delta 15, +45% at rank 3), `hnt_tp_snare_mastery` (delta 8, +40% at rank 5). All values use the global `ailmentDuration` stat as a per-state-specific approximation (broader than design intent — also extends DoTs and other combo states; per-state filtering deferred until later sub-phases). tsc EXIT=0.

**Phase F F1b — multi-target broadcast + cooldown/mana refund actions: COMPLETE 2026-05-05.** Three new `TalentAction` kinds added to the union: `applyTagAll` (broadcast a tag to every enemy in encounter — pack-wide in clearing, boss-side in boss_fight), `refundCooldown` (zero out the consumed skill's `cooldownUntil`, optional `percent` 0-100 default 100), `refundMana` (add flat amount to player mana, capped at max). `TalentProcContext` extended with optional `broadcastDebuffLists`/`skillTimers`/`mana` refs — actions no-op gracefully when refs are missing. `executeAction` handlers in `engine/classTalentDispatcher.ts` mutate via the live refs (skillTimers in-place, mana via ctx.mana ref read back by tick.ts). Combat tick (`engine/combat/tick.ts`) populates the new fields at both proc-context construction sites (skill-cast hit/crit + kill); reads back mana mutations into `state.character.mana.current`. **6 class-tree entries** authored using the new actions: `asn_bm_sharpshot` (procOnCrit refundMana), `asn_bm_eviscerate` (procOnCrit refundCooldown), `asn_sd_stalkers_sigil` (procOnCrit applyTagAll mark), `sor_ar_mana_surge` (procOnCrit refundMana), `sor_sp_storm_crest` (procOnCrit applyTagAll shock), `hnt_mm_snipers_tempo` (procOnCrit refundMana). tsc EXIT=0.

**Phase F F1a — HP-threshold conditionals: COMPLETE 2026-05-05.** New `whileSelfHpBelow` and `whileTargetHpBelow` `TalentEffect` kinds added to the union (each: `threshold: number` 0-1 + `stat: string` + `mult: number`). `applyConditionalTalentEffects` extended with optional `selfHpFraction` + `targetHpFraction` params (default 1 = no fire). `scaleTalentEffectByRank` handles both with the same linear `mult = 1 + (mult - 1) * rank` rule as `whileTag`. Combat tick (`engine/combat/tick.ts:524`) now computes both fractions per skill cast: `state.currentHp / effectiveStats.maxLife` for self, and either `bossState.bossCurrentHp/bossMaxHp` or `frontMobHp/frontMobMaxHp` for target depending on phase. Three Berserker class-tree entries authored: `brs_rv_hunger` (whileSelfHpBelow 50% — Reaver low-HP scaling), `brs_wl_threshold_hunter` (whileTargetHpBelow 50% — Warlord execute tier), `brs_wl_apex_predator` (whileTargetHpBelow 25% — deeper execute). tsc EXIT=0.

**Combat HUD minion-pill follow-up: COMPLETE 2026-05-05.** `CombatStatusBar.tsx` now also renders active-minion pills grouped by type (between the player HP cluster and the mob/boss bar — player-side info clustered together). Reads `state.activeMinions` (engine-tracked since Phase A staff Witchdoctor); groups by `MinionState.type`, shows compact pill `Dogs ×3 12s` (label + count + soonest expiry < 60s). MINION_STYLE map covers 7 known types: zombie_dog / fetish / spirit / zombie / hawk / wolf / panther — fallback gray pill for unknown types so future authoring doesn't need a UI change. No attack animations (the pre-revamp arena-sprite system would need restoring; deferred until after Phase F per scope economy). tsc EXIT=0.

**Combat HUD wire-up: COMPLETE 2026-05-05.** `CombatStatusBar.tsx` now surfaces three engine signals that were emitted silently since Phase A: (1) **mana bar** under HP/ES — slim indigo bar showing `current/max` with text label `M:X/Y` (renders only when `mana.max > 0`); (2) **swing-timer indicator** — small pill on the right of HP showing seconds until next auto-attack swing, green `◉` when ready, gray `1.2s` style label otherwise (reads `state.nextAutoAttackAt - Date.now()`); (3) **ailment stack pills** — inline pills next to phase badge showing the front target's debuffs (`packMobs[0]?.debuffs` in clearing, `state.activeDebuffs` in boss fight) for known ailments (poisoned/bleeding/burning/chilled/shocked/frostbite/hexed/cursed/marked); each pill colored by damage type, shows stacks (`Pois ×3`). Damage feed already provided by existing `DamageFloater` floating numbers — no new component needed. tsc EXIT=0.

**Phase E2e — Hunter ascendancy set + Phase E content authoring COMPLETE 2026-05-05.** Hunter's full 3-ascendancy set authored: Marksman (7 of 8 wired — clean Mark palette: critChance×2 / critMultiplier / ailmentDuration / procOnCrit applyTag(mark) / whileTag(mark) damageMult ×2; Headhunter capstone needs Phase F first-hit-guaranteed-crit), Beastmaster (5 of 8 — companion-stat foundations decorative, player-side stats wireable: critChance / attackSpeed / procOnCrit applyTag(mark) / statMult damageMult / whileTag(mark) damageMult; Pack Leader capstone needs Phase F companion mechanic), Trapper (5 of 8 — bleed/Mark conditionals + cooldown recovery wireable: whileTag(bleed) / cooldownRecovery×2 / critChance / procOnHit applyTag(bleed); Multi-Arming / Heavy Trap / Snare Field capstone need Phase F trap mechanic). **PHASE E CONTENT AUTHORING COMPLETE: 15/15 ascendancies authored, 120 nodes total across all 5 classes, 76 nodes have working effects today (~63% wire-rate), the rest are decorative pending Phase F engine wiring.** tsc EXIT=0.

**Phase E2d — Berserker ascendancy set complete: COMPLETE 2026-05-05.** Berserker's full 3-ascendancy set authored: Warlord (6 of 8 wired — statMult damage / attackSpeed / critMultiplier + 2× whileTag(bleed) damageMult + procOnCrit applyTag(bleed); Threshold Push + King of Ruin capstone decorative pending Rage Threshold mechanic), Reaver (7 of 8 wired — heaviest Berserker wire-rate: maxLife / lifeOnHit / critChance / damageTakenReduction / lifeLeechPercent + procOnCrit applyTag(bleed) + whileTag(bleed); Undying Wrath capstone decorative), Juggernaut (7 of 8 wired — maxLife×2 / damageTakenReduction×2 / incAoEDamage / blockChance + multi-effect node Iron Aegis + whileTag(bleed); Mountain capstone decorative pending offhand-slot conditional). Bloodied combo state approximated via `whileTag(bleed)` since Berserker auto-applies bleed via §8.3 ailment baseline (functional approximation of the signature Bloodied mechanic). Registry now 12/15 ascendancies authored (Witchdoctor 3/3 + Assassin 3/3 + Sorcerer 3/3 + Berserker 3/3); 3 remaining (Hunter only). 20 of 24 new ascendancy nodes have working effects today (83% wire-rate — highest of any class). tsc EXIT=0.

**Phase E2c — Sorcerer ascendancy set complete: COMPLETE 2026-05-05.** Sorcerer's full 3-ascendancy set authored: Elementalist (4 of 8 wired — incElementalDamage / incChaosDamage / procOnCrit applyTag(chill) / whileTag(shock) damageMult; Resonance mechanic + conversion-stack-cap decorative), Arcanist (4 of 8 wired — spellPower / castSpeed / critChance / whileTag(shock) damageMult + 2 forward-compat seeds for maxResonanceCharges/maxMana; Saturation capstone decorative), Specialist (7 of 8 wired — heaviest wire-rate of any ascendancy yet: incFire/Cold/LightningDamage stat-sticks ×3 + whileTag(ignite/chill/shock) damageMult ×3 + critMultiplier; Avatar of Element capstone decorative pending Phase F element-pick UI). Registry now 9/15 ascendancies authored (Witchdoctor 3/3 + Assassin 3/3 + Sorcerer 3/3); 6 remaining (Berserker + Hunter — 3 each). 15 of 24 new ascendancy nodes have working effects today. tsc EXIT=0.

**Phase E2b — Assassin ascendancy set complete: COMPLETE 2026-05-05.** Assassin's full 3-ascendancy set authored: Blademaster (3 of 8 wired — Cascade mechanic + dual-wield offhand + cooldown-refund-on-crit decorative until Phase F), Venomcraft (6 of 8 wired — heaviest wire-rate of the set due to poison palette match: incChaosDamage / ailmentDuration / perStack(poison) / procOnCrit applyTag(poison) / whileTag(poison) damageMult ×2; Toxic Saint capstone decorative), Shadowdancer (6 of 8 wired — critChance / cooldownRecovery / ailmentDuration / whileTag(mark) damageMult ×2 / procOnCrit applyTag(mark); Untouchable capstone decorative). Registry now 6/15 ascendancies authored (Witchdoctor 3/3 + Assassin 3/3); 9 remaining (Sorcerer + Berserker + Hunter — 3 each). 15 of 24 new ascendancy nodes have working effects today. tsc EXIT=0.

**Phase E2a — Witchdoctor ascendancy set complete: COMPLETE 2026-05-05.** Witchdoctor's full 3-ascendancy set authored: Plague Priest (E1), Spirit Whisperer (E2a), Voodoo Sovereign (E2a). Spirit Whisperer is decorative end-to-end pending Phase F minion-event wiring (8 nodes / 21 ranks); Voodoo Sovereign has 5 of 8 nodes wireable today via existing palette (Curse Affinity = whileTag(hex) damageMult; Voodoo Strength = stat:incChaosDamage; Hex Mark = procOnCrit applyTag(hex); Curse Bound = perStack(hex) damageMult; Bloodied Curse = procOnCrit applyTag(hex, 2 stacks)). Capstone "Crowned in Curses" needs Phase F (modifyMechanic:hexCanCrit + onHexConsume hooks). Registry now 3/15 ascendancies authored — 12 remaining (5 Asn + 5 Sor + 5 Brs + 5 Hnt — wait, that's 4 of 5 classes left, each with 3 ascendancies = 12). tsc EXIT=0.

**Phase E1 — ascendancy infrastructure + first authored ascendancy: COMPLETE 2026-05-05.** Full ascendancy system shipped end-to-end: new types (`AscendancyTreeData` / `AscendancyNodeData`) at `src/types/ascendancy.ts`, JSON registry at `src/data/ascendancies/index.ts` with `CLASS_ASCENDANCY_OPTIONS` (15 ascendancies declared, 1 authored — Witchdoctor's Plague Priest at 8 nodes / 3 tiers / 14 total ranks), side-table effects at `src/data/ascendancies/effects.ts` (4 entries authored — Apothecary's Reservoir + Slow Death Bloom + Plague Bearer's Mark + Plague Sovereign capstone), engine API at `src/engine/ascendancy.ts` paralleling Phase D's classTalents.ts shape (`canAllocateAscendancyNode` / `allocateAscendancyNode` / `respecAscendancy` / `getAvailableAscendancyPoints`), `engine/classTalentDispatcher.ts` extended with `collectAscendancyEffects` (concats into the same `talentEffects` pipeline; same per-rank scaling rules as class talents), combat tick (`engine/combat/tick.ts:312`) wired to read both class + ascendancy effects, store actions in `skillStore.ts` (`pickAscendancy` / `allocateAscendancyNode` / `respecAscendancy`), new `AscendancyPanel.tsx` UI with three states (locked pre-25 / 3-option picker at 25 / ranked tree post-pick), wired into both `HeroScreen.tsx` and `CharacterScreen.tsx` adjacent to `ClassTalentPanel`. Save migration v70 initializes `ascendancyId: null` + `ascendancyRanks: {}` for existing saves. Unlock level locked at 25 (per §13). Point pool: 1 ascendancy point per level past 24 → 1 at L25 → 36 at L60. Respec cost: `100 * level` gold (4× class talent respec to discourage churn). 14 of 15 ascendancies remain unauthored — Phase E2-E5 will populate them. tsc EXIT=0.

**Phase D — multi-rank class talent engine: COMPLETE 2026-05-05.** Save shape changed from `talentAllocations: string[]` (flat list, 1 point per id) → `talentRanks: Record<string, number>` (id → current rank, each rank costs 1 point up to `node.ranks`). Engine `canAllocateTalentNode` now checks `currentRank < node.ranks` + prereq at MAX rank (full investment gates the next node — encourages path commitment). `engine/classTalentDispatcher.ts` adds `scaleTalentEffectByRank(effect, rank)` — multiplies numeric fields linearly: `stat.delta * rank`, `statMult.mult = 1 + (mult - 1) * rank`, `whileTag.mult` same, `perStack.perStackDelta * rank` (cap also scales), `procOnHit/Crit/Kill/Tag.chance * rank` capped at 100, `grantTagOnSkill` not scaled. `collectTalentEffects(charClass, ranks)` reads the record and returns rank-scaled effects — combat tick (`engine/combat/tick.ts:312`) feeds this into the existing dispatcher pipeline. `store/skillStore.ts` actions `allocateTalentNode` (increments rank) + `respecTalents` (clears all + charges gold) are now wired (replacing Phase 0 no-op stubs). UI `ClassTalentPanel.tsx` shows `currentRank/maxRank` badge per multi-rank node, hover-cursor on partially-allocated nodes for next-rank clicks, max-rank check mark when fully invested. Save migration v69 converts old single-rank arrays → ranks records (each previously-allocated id gets rank 1). The 34 `effects.ts` entries authored at rank-1 values now scale natively through 5 ranks. tsc EXIT=0.

**Class-tree effects.ts populated: PASS 1 COMPLETE 2026-05-05.** `src/data/classTrees/effects.ts` expanded from 2 seed entries to 34 active entries spanning all 5 classes — 12 stat-sticks against verified `StatKey` fields (critChance / critMultiplier / attackSpeed / cooldownRecovery / spellPower / maxLife / damageTakenReduction / incElementalDamage / incFireDamage / incColdDamage / incLightningDamage / incChaosDamage / ailmentPotency / ailmentDuration), 3× `statMult damageMult` (Warlord +damage stat-foundations), 4× `whileTag damageMult` conditionals (vs hexed/poisoned/marked targets), 2× `perStack damageMult` scalers (per-poison-stack Acrid Concentration, per-shock-stack Shock Mastery), 2× `procOnCrit applyTag` triggers (Voodoo Mark applies hex on every crit; Necrotic Bite applies poison on every crit), plus 8 forward-compat decorative seeds (`maxPoisonStacks`/`maxCritStacks`/`maxResonanceCharges` — silent-no-op until the stat lands on `ResolvedStats`). Header explains engine support audit + authoring conventions; capstones, signature-mechanic identity nodes, summon/trigger/buff procs, and event hooks (onResonanceChargeGain / onMinionDeath / onTrapDetonate / onFrenziedEnter) remain decorative pending Phase F engine wiring. ~370 nodes still empty; pass 2 will land alongside Phase F wiring.

**Phase 2 cleanup — engine field/type strip: COMPLETE 2026-05-05.** Dead `skillGraph`/`skillTree`/`talentTree` fields stripped from `SkillDef`/`AbilityDef`; `allocatedNodes`/`allocatedRanks` stripped from `SkillProgress`/`AbilityProgress`. `engine/talentTree.ts` deleted (resolver+allocators were only consumers of the dead fields). `engine/skillGraph.ts` trimmed to the `ResolvedSkillModifier` ABI + `EMPTY_GRAPH_MOD` constant only (337 lines, down from 656) — kept as the contract between Phase D class-talent resolution and the damage pipeline (50+ field reads in `damageBuckets.ts`/`dps.ts`/`weaponModule.ts`/`combat/weapons/staff.ts`). Dead allocators removed from `engine/skills/progression.ts` (`canAllocateNode`/`allocateNode`/`respecAbility`/`getRespecCost`/`getAllTreeNodes`) and `store/skillStore.ts` (`allocateAbilityNode`/`respecAbility` actions, plus their `gameStore.ts` wrappers, `dispatch.ts` cases, and `commands.ts` types). `aggregateGraphGlobalEffects` reduced to identity. Per-skill `skillTree: { paths: [...] }` blocks (36 total) stripped from 7 active data files (sword/bow/greatsword/crossbow/gauntlet/wand/secondary) via Python regex sweep. Save migration v68 strips persisted `allocatedNodes`/`allocatedRanks` from skill+ability progress entries. Class-talent stubs (`allocateTalentNode`/`respecTalents`) preserved as Phase D wiring endpoints. `tsc -b --force` EXIT=0.

**§8.1 ComboStateSpec migration: COMPLETE 2026-05-04.** Combo states are now first-class typed entities with their own definitions in `src/data/comboStates.ts`. New `ComboStateSpec` type in `src/types/combat.ts` (id / name / description / defaultDuration / maxStacks / defaultEffect / category / side / fusion / carrierDeath / pairArchetype). Registry covers 25 states: 11 legacy (exposed / dance_momentum / deep_wound / shadow_mark / chain_surge / shadow_momentum / plagued / haunted / hexed / soul_stack / spirit_link), 7 Phase C3 weapon-pool states (bloodied / snared / disarmed / frenzy / marked / marked_for_cleave / sundered), 7 Phase F pair-fusion states data-only (crit_stack / resonance_charge / self_bloodied / hunters_shadow / cursed_cascade / element_mark / tracking_spirit). New `createStateFromSpec` helper in `engine/combat/combo.ts` is the modular path for future authoring — looks up spec defaults from the registry. Existing skill creator/consumer wiring (`COMBO_STATE_CREATORS` / `COMBO_STATE_CONSUMERS`) preserved for backwards-compat.

**Phase E / F: NOT STARTED.** Ascendancies, full multi-class engineering all queued. Phase F now has data definitions for all fused states — engine wiring is the remaining work.

---

## Doc map (6 docs, all cross-referenced)

| Doc | Scope | Status |
|---|---|---|
| `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` | **Architecture** — phases, mechanics, schemas, calibration, status log | All locks current as of 2026-04-27 |
| `CLASS_FANTASY_BRIEFS.md` | Per-class fantasies (5 MVP classes) | ✅ All 5 authored (class-first framing applied 2026-04-26) |
| `MULTI_CLASS_PAIRS.md` | Per-pair multi-class identity (10 pairs) | ✅ 10/10 authored 2026-05-03; Cross-Pair Consistency Check 4/4 PASSED |
| `CLASS_TREES.md` | Class-tree README + JSON schema + cross-class consistency results | ✅ 5/5 authored, consistency check 10/10 passed 2026-05-03 |
| `src/data/classTrees/witchdoctor.json` | WD class tree data | ✅ 80 nodes, flavor-lifted 2026-04-27 |
| `src/data/classTrees/assassin.json` | Asn class tree data | ✅ 81 nodes 2026-04-27 |
| `src/data/classTrees/sorcerer.json` | Sor class tree data | ✅ 81 nodes 2026-05-03 |
| `src/data/classTrees/berserker.json` | Brs class tree data | ✅ 81 nodes 2026-05-03 |
| `src/data/classTrees/hunter.json` | Hnt class tree data | ✅ 81 nodes 2026-05-03 |
| `SKILL_FANTASY_AUDIT.md` | 4-axis skill audit (WD staff + Asn dagger) | ✅ Complete; recommendations applied to skill data |
| `SESSION_HANDOFF.md` | This doc — navigation/resume | 2026-04-27 |

---

## Decisions LOCKED this session series (2026-04-22 to 2026-04-27)

### Architecture (all locked in `COMBAT_AND_CLASS_OVERHAUL_PLAN.md`)

1. **Class-First Principle (§4.2 Model B)** — Class IS the fantasy. Weapons morph to express class fantasy. Each class has 3 default weapons; multi-classing unlocks secondary class's 3 defaults. NO weapon-class exclusivity (Greatsword/Flail not Berserker-locked; Bow/Crossbow not Hunter-locked).
2. **4-Layer Multi-Class Identity Model (§11.1)** — Each pair gets: (1) named pair identity, (2) fusion signature mechanic combining both class signatures uniquely, (3) skill toggle morphs (3-5 per pair, player-selectable per skill), (4) weapon unlocks. Layers 2+3 give every pair distinct mechanical DNA.
3. **Class talent trees: 90 nodes / 51 points / 7 tiers / WoW Classic shape (§6.1)** — Locked at this density per 2026-04-27 confirmation. Multi-class layer + ascendancies provide the diversification depth on top.
4. **JSON source-of-truth for class trees** — `src/data/classTrees/*.json`, one file per class. Markdown design docs become README-style pointers, not 1000-line content stores.
5. **Multi-rank flavor directive** — Multi-rank passives prefer procs/conditionals/state-interactions over flat stat scaling. Pure stat-sticks are the EXCEPTION (~15-20%), not the rule. "1-5% chance for double strike" feels better than "+5% damage." SOME stat-sticks are fine as foundation/pacing.
6. **Idle-game context** — No standing/walking/movement mechanics; no tile concept. Combat is per-zone encounter. AoEs express as "all enemies in encounter" or "in zone."
7. **Class-trees are weapon-agnostic** — No weapon-conditional class tree nodes by default. Offhand-conditional nodes acceptable (per §6.3) as playstyle sliders.
8. **Active buff removal direction** — All `AbilityDef kind: 'buff'` migrate to ascendancy/talent-tree passives with conditional triggers (e.g., "while 3+ minions alive" instead of pressed buttons). Goal: zero active buffs in WD staff + Asn dagger pools post-cleanup.

### Class identities (all locked in `CLASS_FANTASY_BRIEFS.md`)

| Class | Signature mechanic | Mana flavor (passive/onKill/onHit/onCrit) | Element axis |
|---|---|---|---|
| Witchdoctor | **Pandemic** (DoT-host death propagation) | 6/20/0.5/0 — caster + kill-flash | Chaos primary |
| Assassin | **Crit Cascade** (crits compound via Crit Stacks) | 10/3/1/6 — crit-feedback | Phys + shadow/chaos |
| Sorcerer | **Resonance** (4-element charge → Convergence) | 8/8/0/4 — sustained caster | All elements |
| Berserker | **Rage Threshold** (<50% HP unlocks Frenzied) | 0/10/5/0 + onHitTaken 8 — pure rage | Physical (no elements native) |
| Hunter | **Mark & Execute** (first-hit Mark, follow-up payoff) | 9/5/0.5/6 — energy-archer | Physical (no elements native) |

### Class default weapons (per §4.2 Model B)

| Class | 3 defaults |
|---|---|
| Witchdoctor | Staff, Dagger, Scythe |
| Assassin | Dagger, Wand, Claws |
| Sorcerer | Wand, Staff, Gauntlets |
| Berserker | Greatsword, Flail, Claws |
| Hunter | Bow, Crossbow, Dagger |

Multi-classing unlocks the secondary class's 3 defaults (max 6 weapons accessible).

### Multi-class fusion mechanics (4/10 designed, 6/10 candidates drafted)

| Pair | Archetype | Fusion mechanic |
|---|---|---|
| WD + Asn | **Blood Cultist** ✅ | Hex Cascade — crit on Hexed builds Crit Stacks + spawns Pandemic-spread Cursed Cascade |
| WD + Sor | **Seer** ✅ | Elemental Pandemic — DoTs feed Resonance; Convergence on transfer at 4 charges |
| WD + Brs | **Deathwalker** ✅ | Bloodied Pandemic — DoTs +50% to <50% HP; Pandemic doubles on Bloodied |
| WD + Hnt | **Soul Trapper** ✅ | Spirit Trap — cursed-trapped death spawns Tracking Spirit; consumed by next Mark |
| Asn + Sor | Arcane Blade (draft) | Resonant Blade — Cascade crits add Resonance; Convergence becomes single-target stab |
| Asn + Brs | Dark Reaver (draft) | Frenzied Cascade — Cascade scales with missing HP; Crit Stack cap raises below 50% |
| Asn + Hnt | Nightstalker (draft) | Shadow Mark Cascade — Hunter's Mark + Shadow Mark fuse; first hit creates BOTH |
| Sor + Brs | Spellreaver (draft) | Element Forge — Frenzied empowers Resonance; Convergence below 50% HP costs 0 mana ("battle mage" canonical) |
| Sor + Hnt | Arcane Archer (draft) | Element-Marked Shot — Mark sets element of next cast; Resonance applies to projectile shots ("magic arrow" canonical) |
| Brs + Hnt | Warden (draft) | Trap-Execute — traps apply Bloodied on detonation; precision payoffs scale with missing HP |

---

## Code state (what's wired in `src/`)

### Engine (`src/engine/`)

- **`combat/tick.ts`** — skill rotation, mana gate (line 304: `canAffordManaCost` aborts cast if underfunded), channel state tracking (line ~1222)
- **`combat/autoAttack.ts`** — MVP auto-attack system (`computeAutoAttackInterval`, `shouldFireAutoAttack`, `rollAutoAttack`, `applyNonSkillTickWithAuto`)
- **`combat/manaTick.ts`** — pure helpers (`regenMana`, `deductMana`, `canAffordManaCost`, `tickManaWithCost`)
- **`skills/dps.ts:95-132`** — `calcSkillCastInterval` branches on `skillKind` (instant/cast/channel/auto)
- **`classAdjustment.ts`** — class×weapon morph table; Asn×Staff morphs detoxified 2026-04-26 (Haunt → Shadow Plague, Spirit Barrage → Needle Volley, Bouncing Skull → Bouncing Dagger; all dropped paradigm-breaking `damageTypeOverride: physical`)
- **`combat/combo.ts`** — combo state hardcoded (Hexed/Plagued/Haunted/Soul Stack/Exposed/Deep Wound/Shadow Mark/Crit Stack/Shadow Momentum); §8.1 ComboStateSpec migration pending

### Data (`src/data/`)

- **`skills/staff.ts`** — 10 actives + 3 buffs/passive. Audit applied 2026-04-26: Haunt/Spirit Barrage/Bouncing Skull all chaos-converted (was cold/cold/fire). All actives have skillKind/manaCost/baseAilmentChance.
- **`skills/dagger.ts`** — 10 actives + 3 buffs. Audit applied 2026-04-26: Chain Strike chaos-converted, Blade Trap → Shadow Caltrops (reflavored + chaos), Blade Ward → Shadow Veil (reflavored), Blade Dance damage 0.3→0.5. All actives have skillKind/manaCost/baseAilmentChance.
- **`skills/bow.ts`** — 6 actives. Reclassified 2026-04-23 from Change 5 audit scope to Phase C3 rebuild (under-populated + duplicate `bow_rapid_fire` id + stale `bow_multi_shot`/`bow_smoke_arrow` ids).
- **`classTrees/witchdoctor.json`** — ✅ 80 nodes, 3 paths, flavor-lifted 2026-04-27. Source-of-truth for WD tree.
- **`classTrees/assassin.json`** — ✅ 81 nodes, 3 paths, authored 2026-04-27. Blademaster/Venomcraft/Shadowdancer.
- **`classTrees/sorcerer.json`** — ✅ 81 nodes, 3 paths, authored 2026-05-03. Elementalist/Arcanist/Specialist.
- **`classTrees/berserker.json`** — ✅ 81 nodes, 3 paths, authored 2026-05-03. Warlord/Reaver/Juggernaut.
- **`classTrees/hunter.json`** — ✅ 81 nodes, 3 paths, authored 2026-05-03. Marksman/Beastmaster/Trapper.
- **`classTalents.ts`** — Legacy class talent file (Phase 4 sub-phase 6); now superseded by JSON trees. Phase C engineering: wire JSON via `resolveJsonModule` and deprecate the legacy TS file.

### Types (`src/types/`)

- **`mana.ts`** — Class Mana Calibration Matrix locked 2026-04-24: per-class dial profiles encoding the 3-resource (mana/rage/energy) vision. **As of 2026-05-03 ALL 5 fields are live** — `passiveRegenPerSec` (since Phase A Change 4) AND `onKillGain`/`onHitDealtGain`/`onHitTakenGain`/`onCritGain` (Phase A cleanup, see `engine/combat/manaTick.ts:gainMana` + `tick.ts` boss/pack mana sites).
- **`character.ts:10`** — `CharacterClass` union still has legacy names (warrior/mage/ranger/rogue) plus MVP names (witchdoctor/assassin). §15.4 rename pending: warrior→berserker, mage→sorcerer, ranger→hunter, rogue→absorbed into assassin.

### Strict build status

`npx tsc -b --force` exits 0 as of 2026-04-27.

---

## Pending work (organized by phase)

### Phase A cleanup

- ✅ **Wire proc handlers** for `onKillGain` / `onHitDealtGain` / `onHitTakenGain` / `onCritGain` in `tick.ts` — **DONE 2026-05-03.** `manaTick.ts` adds `gainMana` primitive + extends `tickManaWithCost(mana, dtSec, cost, procGain=0)`. Both boss path and pack path in `tick.ts` import `CLASS_MANA_CONFIG` and compute event-driven gains from `roll.isHit` / `roll.isCrit` / `mobKills` / `zoneAttackResult.damage > 0`. §9.4 calibration matrix is now fully live; 6 of 10 pair fusion mechanics that depend on rage/energy/kill-flash mana economy are unblocked. `tsc -b --force` exits 0.
- **Channel duration expiry enforcement** (§9.1 deferred item) — currently `expiresAt` is tracked but not acted on. Still queued.
- **`CharacterClass` type rename** (§15.4) — warrior→berserker, mage→sorcerer, ranger→hunter; absorb rogue into assassin. Still queued; clears the rename caveats appearing in 9 of 10 pair briefs.

### Phase B step 8 — class tree authoring ✅ COMPLETE (5/5 done 2026-05-03)

- ✅ `witchdoctor.json` (80 nodes)
- ✅ `assassin.json` (81 nodes)
- ✅ `sorcerer.json` (81 nodes)
- ✅ `berserker.json` (81 nodes)
- ✅ `hunter.json` (81 nodes)
- ✅ Cross-class consistency check 10/10 passed (see `CLASS_TREES.md` for table)

### Phase B step 9 — multi-class pair briefs ✅ COMPLETE (10/10 done 2026-05-03)

- ✅ Blood Cultist (WD+Asn) — 2026-04-26
- ✅ Seer (WD+Sor) — 2026-04-27
- ✅ Deathwalker (WD+Brs) — 2026-04-27
- ✅ Soul Trapper (WD+Hnt) — 2026-04-27
- ✅ Arcane Blade (Asn+Sor) — 2026-05-03
- ✅ Dark Reaver (Asn+Brs) — 2026-05-03
- ✅ Nightstalker (Asn+Hnt) — 2026-05-03
- ✅ Spellreaver (Sor+Brs) — 2026-05-03 — battle-mage canonical
- ✅ Arcane Archer (Sor+Hnt) — 2026-05-03 — magic-arrow canonical
- ✅ Warden (Brs+Hnt) — 2026-05-03
- ✅ Cross-Pair Consistency Check 4/4 PASSED 2026-05-03 (see `MULTI_CLASS_PAIRS.md` "Cross-Pair Consistency Check" section)

**Phase B is now 100% locked. No design-lock work remains.** All Phase B step deliverables (class fantasy briefs, weapon-default model, 4-Layer Multi-Class Identity Model, skill audit, Asn×Staff morph retune, class trees, pair briefs) are complete.

### Phase C — content authoring

- §8.1 ComboStateSpec schema migration (combo states currently hardcoded in `engine/combat/combo.ts`)
- Per-skill talent tree archive (move `dataskillGraphs/*` to `data/_archive/skillGraphs/`) per §7
- Class-tree JSON → engine wiring (resolveJsonModule + `engine/classTalentDispatcher.ts` upgrade)
- Phase C3 weapon-pool rebuilds (8 pools: bow expansion, wand, gauntlets, greatsword, crossbow, claws, flail, scythe — author from scratch)
- Pool expansion to 15-20 skills/class for staff + dagger (16 new skills total per `SKILL_FANTASY_AUDIT.md` §1.4 + §2.4 specs)
- Author 80-100 morph cells per Class-First weapon expression
- Buff cuts + ascendancy passive authoring (6 buffs queued; migration targets named in `CLASS_FANTASY_BRIEFS.md` §1.5 + §2.5)

### Phase E — ascendancies (deferred)

- 5 classes × 3 ascendancies × ~8 nodes = ~120 ascendancy nodes. Drafts in `COMBAT_AND_CLASS_OVERHAUL_PLAN.md` §10.1.

### Phase F — multi-class engineering + content

- Schema: `SkillToggleMorph`, `Character.skillToggles`, `PairFusionMechanic`. Per §11.3.
- Engine: `getEffectiveSkillDef` toggle resolution + fusion mechanic dispatch.
- UI: toggle checkboxes per skill in skill-bar config.
- Content: 10 fusion mechanic implementations + ~40 toggle morphs across pair briefs.

---

## Open questions / pending decisions

**None major.** The user has confirmed:
- Class-First Model B (weapon-agnostic class trees) ✅
- 4-Layer Multi-Class Identity Model ✅
- 90/51 WoW Classic class tree shape ✅
- JSON source-of-truth for class trees ✅
- Multi-rank flavor directive (procs over stat-sticks; SOME stat-sticks ok) ✅
- Buff removal direction ✅
- Idle-game context (no movement, no tiles) ✅

Minor open considerations (not blocking):
- Whether to lock weapon-conditional class tree nodes as "use sparingly" or remove entirely (currently: removed by default; user noted "I'm at a standstill" — pragmatic compromise documented in §6.3)
- Mass Sacrifice morph (Asn×Staff) — not in §4.3 retune list but still has `damageTypeOverride: 'physical'`; flagged as outstanding morph concern in §4.3

---

## How to resume in a new session

**Paste this prompt to start fresh:**

> "Read `/home/jerris/idle-exile/docs/design/SESSION_HANDOFF.md` to refresh context on the idle-exile combat-and-class overhaul. **Phase B is 100% locked, Phase A cleanup is done, §15.4 rename is done, and Phase C step 1 (JSON class-tree registry infrastructure) is done as of 2026-05-04.** The new modular registry lives at `src/data/classTrees/index.ts` — adding a future class is now a 2-line registry change. Proceed with [PICK ONE]: (a) Phase C step 2 — UI/engine cutover to JSON node ids + save migration v67 (save-breaking; needs effect-data planning since JSON nodes only carry `description` + `engineHook` strings, not typed `effects[]` data); OR (b) Phase C3 weapon-pool rebuilds — bow expansion + 7 other weapon pools (greatsword/flail/claws/wand/gauntlets/crossbow/scythe) authored from scratch — unlocks Sor/Brs/Hnt-side pair toggles; OR (c) §8.1 ComboStateSpec schema migration (needed for fused states: Hunter's Shadow, Hunter's Mark, Element-Mark, Self-Bloodied); OR (d) Phase E ascendancies (~120 nodes). My recommendation: (b) — Phase C3 weapon pools unblock the most downstream work (9 of 10 pair brief Sor/Brs/Hnt-side toggle drafts) and are pure additive content."

### Recommended next-session order

1. **Populate `src/data/classTrees/effects.ts`** — author typed `TalentEffect[]` for the ~80-100 stat-stick nodes across 5 classes (currently ships with 2 worked examples + skeleton). Pure data work; no engine changes. Players gain meaningful talent power. Lowest risk, highest player-facing value.
2. **Phase D — multi-rank engine support** — each JSON node has `ranks: 1-5` but allocation is currently 1-point-per-node. Add `talentRanks: Record<string, number>` save field + multi-rank UI (rank badges, multi-click allocation) + multi-rank effect scaling.
3. **Phase E ascendancies** — 5 classes × 3 ascendancies × ~8 nodes (~120 total). Author JSON ascendancy trees alongside the class trees; gate via character-creation choice; engine reads via the JSON registry.
4. **Phase F multi-class engineering** — `SkillToggleMorph` schema, `Character.skillToggles` field, `getEffectiveSkillDef` toggle resolution, fusion-mechanic dispatch sites. Combo state data definitions for all fused states already exist (commit DA7…); engine + UI is the remaining work.
5. **Channel duration expiry enforcement** (§9.1) — last remaining Phase A deferral.
2. **Phase C step 2** — UI/engine cutover to JSON node ids: author inline `effects[]` arrays in JSON nodes (or a side-table), switch `engine/classTalents.ts` lookups to read from the registry, save migration v67 to clear legacy `talentAllocations` (free respec).
3. **§8.1 ComboStateSpec schema migration** — combo states currently hardcoded in `engine/combat/combo.ts` (needed for new fused states: Hunter's Shadow, Hunter's Mark, Element-Mark, Self-Bloodied)
4. **Channel duration expiry enforcement** (§9.1) — last remaining Phase A deferral
5. **Phase E ascendancies** — 5 classes × 3 ascendancies × ~8 nodes
6. **Phase F multi-class engineering** — `SkillToggleMorph` schema, `Character.skillToggles` field, `getEffectiveSkillDef` toggle resolution, fusion mechanic dispatch sites (10 mechanics × ~40 toggle morphs)

---

**End of session handoff. Open the relevant detailed doc next based on what you're working on.**

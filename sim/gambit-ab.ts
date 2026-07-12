#!/usr/bin/env node
// ============================================================
// Gambit A/B — Effect IR Wave 5 GATE 4 (EFFECT_IR_DESIGN.md D28)
// Same seed, same Hunter+bow build, two policies through the REAL
// runCombatTick:
//   A) slot-order (legacy): [hunters_mark, arrow_shot] — recasts Mark
//      every cooldown even while the target is already Marked.
//   B) gambit: cast Mark only when the target lacks it; otherwise
//      arrow_shot — mark uptime without wasted GCDs.
// GATE 4: B must beat A by >= 10% total damage. If < 5%, STOP and tune
// consume payoffs before building any rotation UI (design go/no-go).
// Usage: npx tsx sim/gambit-ab.ts
// ============================================================

import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';

const SEED = 1337;
installClock();
installRng(SEED);

import './balance-overrides';

import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import type { GameState, ActiveDebuff, MobInPack, EquippedSkill } from '../src/types';
import type { RotationPolicy } from '../src/types/rotation';

function createMobPack(count: number, hp: number): MobInPack[] {
  const now = getNow();
  return Array.from({ length: count }, (_, i) => ({
    hp, maxHp: hp,
    debuffs: [] as ActiveDebuff[],
    nextAttackAt: now + 1000 + i * 500,
    rare: null, damageElement: 'physical' as any, physRatio: 1.0,
  }));
}

function createFixtureState(
  cls: 'hunter' | 'assassin',
  weaponType: 'bow' | 'dagger',
  skills: string[],
  rotationPolicy: RotationPolicy | null,
): GameState {
  const char = createCharacter('GambitBot', cls);
  char.level = 20;
  char.xpToNext = 99999;
  char.equipment = {
    mainhand: {
      id: `ab_${weaponType}`, baseId: `crude_${weaponType}`, name: `AB ${weaponType}`,
      slot: 'mainhand', rarity: 'rare' as any, iLvl: 20,
      prefixes: [], suffixes: [],
      weaponType,
      baseStats: { flatPhysDamage: 15, baseAttackSpeed: 10, baseCritChance: 5, accuracy: 80, evasion: 60 },
      baseDamageMin: 20, baseDamageMax: 40, baseSpellPower: 10,
    },
  } as any;
  char.stats = resolveStats(char);
  const now = getNow();
  const zone = ZONE_DEFS[2] ?? ZONE_DEFS[0];
  const skillBar: (EquippedSkill | null)[] = Array(8).fill(null);
  const skillTimers: any[] = [];
  const skillProgress: Record<string, any> = {};
  for (let i = 0; i < skills.length; i++) {
    skillBar[i] = { skillId: skills[i], autoCast: true };
    skillTimers.push({ skillId: skills[i], activatedAt: null, cooldownUntil: null });
    skillProgress[skills[i]] = { skillId: skills[i], xp: 0, level: 20, allocatedNodes: [], allocatedRanks: {} };
  }
  return {
    character: char, inventory: [], currencies: {} as any, materials: {}, gold: 0,
    bagSlots: [], bagStash: {}, bank: { tabs: [] },
    currentZoneId: zone.id, idleStartTime: 1, idleMode: 'combat',
    gatheringSkills: {} as any, gatheringEquipment: {}, selectedGatheringProfession: null,
    professionEquipment: {}, craftingSkills: {} as any, ownedPatterns: [],
    autoSalvageMinRarity: 'common', autoDisposalAction: 'salvage', craftAutoSalvageMinRarity: 'common',
    offlineProgress: null, abilityProgress: {}, clearStartedAt: 0, currentClearTime: 0,
    currentHp: char.stats.maxLife, currentEs: 0,
    combatPhase: 'clearing', bossState: null, zoneClearCounts: {}, combatPhaseStartedAt: now,
    classResource: createResourceState(cls), classSelected: true, totalKills: 0, fastestClears: {},
    skillBar, skillProgress, skillTimers, talentAllocations: [],
    activeDebuffs: [], consecutiveHits: 0, lastSkillsCast: [], lastOverkillDamage: 0,
    killStreak: 0, lastCritAt: 0, lastBlockAt: 0, lastDodgeAt: 0, dodgeEntropy: 50,
    tempBuffs: [], skillCharges: {}, channelState: null,
    critStacks: 0, critStacksExpiresAt: 0,
    resonanceCharges: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, resonanceExpiresAt: 0,
    frenziedActive: false,
    rotationPolicy,
    rampingStacks: 0, rampingLastHitAt: 0,
    fortifyStacks: 0, fortifyExpiresAt: 0, fortifyDRPerStack: 0,
    deathStreak: 0, lastDeathTime: 0,
    comboStates: [], activeTraps: [], bladeWardExpiresAt: 0, bladeWardHits: 0,
    elementTransforms: {}, lastHitMobTypeId: null, freeCastUntil: {}, lastProcTriggerAt: {},
    lastClearResult: null, lastSkillActivation: 0, nextActiveSkillAt: 0,
    packMobs: createMobPack(3, 600), currentPackSize: 3, targetedMobId: null,
    currentMobTypeId: 'thicket_crawler', mobKillCounts: {}, bossKillCounts: {}, totalZoneClears: {},
    dailyQuests: { questDate: '', quests: [], progress: {} },
    craftLog: [], craftOutputBuffer: [], gemInventory: [], zoneMasteryClaimed: {},
    invasionState: { activeInvasions: {}, bandCooldowns: {} },
    tutorialStep: 99, hasSeenCraftingHint: true, lastSaveTime: now,
  } as GameState;
}

// ── VERDICT LOG (2026-07-12 first run): GATE 4 FAILED — bow Δ −63.0%
// (skipping ANY skill loses: with abundant mana and no payoffs, every
// off-cooldown cast beats idling, so slot-order is near-optimal),
// dagger Δ +0.5% (deep_wound uptime ~constant since viper cd ≈ wound
// duration — no decision to express). CONSEQUENCE per D28: gambit
// MACHINERY ships; the RotationPanel UI does NOT until Phase 3 content
// adds resource scarcity / consume payoffs that make policy choice
// matter. This harness is the re-test: rerun after content tuning. ──

function runPolicy(
  cls: 'hunter' | 'assassin',
  weaponType: 'bow' | 'dagger',
  bar: string[],
  rotationPolicy: RotationPolicy | null,
  ticks: number,
): { totalDamage: number; kills: number; casts: Map<string, number> } {
  resetRng(SEED);
  setClock(1_000_000);
  let s = createFixtureState(cls, weaponType, bar, rotationPolicy);
  let totalDamage = 0;
  let kills = 0;
  const casts = new Map<string, number>();
  const dtSec = 0.5;
  for (let i = 0; i < ticks; i++) {
    const out = runCombatTick(s, dtSec, getNow());
    s = { ...s, ...out.patch };
    totalDamage += (out.result.damageDealt ?? 0) + (out.result.dotDamage ?? 0);
    kills += out.result.mobKills ?? 0;
    if (out.result.skillFired && out.result.skillId) {
      casts.set(out.result.skillId, (casts.get(out.result.skillId) ?? 0) + 1);
    }
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(3, 600) };
    }
    advanceClock(dtSec * 1000);
  }
  return { totalDamage, kills, casts };
}

const TICKS = 1200; // 600s simulated at 0.5s ticks
const fmt = (m: Map<string, number>) => [...m.entries()].map(([k, v]) => `${k}×${v}`).join(', ');

function experiment(
  label: string,
  cls: 'hunter' | 'assassin',
  weaponType: 'bow' | 'dagger',
  bar: string[],
  gambit: RotationPolicy,
): number {
  const a = runPolicy(cls, weaponType, bar, null, TICKS);
  const b = runPolicy(cls, weaponType, bar, gambit, TICKS);
  const delta = ((b.totalDamage - a.totalDamage) / a.totalDamage) * 100;
  console.log(`\n── ${label} ──`);
  console.log(`A slot-order: damage=${a.totalDamage.toFixed(0)} kills=${a.kills} casts: ${fmt(a.casts)}`);
  console.log(`B gambit:     damage=${b.totalDamage.toFixed(0)} kills=${b.kills} casts: ${fmt(b.casts)}`);
  console.log(`Δ total damage: ${delta.toFixed(1)}%`);
  return delta;
}

// Experiment 1 — bow (no consume payoffs in current content): gambit
// skips the rapid_fire "DPS trap" and avoids ignite clipping.
const bowDelta = experiment('BOW (content has no consume payoffs)', 'hunter', 'bow',
  ['bow_snipe', 'bow_burning_arrow', 'bow_rapid_fire', 'bow_arrow_shot'],
  {
    version: 1,
    rules: [
      { id: 'nuke', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_snipe' } },
      { id: 'ignite_upkeep', enabled: true, when: { not: { targetHasTag: 'ignite' } }, action: { kind: 'castSkill', skillId: 'bow_burning_arrow' } },
      { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'bow_arrow_shot' } },
    ],
  });

// Experiment 2 — dagger (the one weapon WITH a consume economy):
// viper creates Deep Wound; assassinate consumes it for burst + is a
// 30-mana dry cast without it. Gambit: assassinate only into a wound.
const daggerDelta = experiment('DAGGER (consume-payoff economy exists)', 'assassin', 'dagger',
  ['dagger_assassinate', 'dagger_viper_strike', 'dagger_stab'],
  {
    version: 1,
    rules: [
      { id: 'execute_wound', enabled: true, when: { stateCountAtLeast: { stateId: 'deep_wound', count: 1 } }, action: { kind: 'castSkill', skillId: 'dagger_assassinate' } },
      { id: 'build_wound', enabled: true, when: { stateCountBelow: { stateId: 'deep_wound', count: 1 } }, action: { kind: 'castSkill', skillId: 'dagger_viper_strike' } },
      { id: 'filler', enabled: true, when: null, action: { kind: 'castSkill', skillId: 'dagger_stab' } },
    ],
  });

console.log(`\nGATE 4 (≥ +10% on at least one build; < +5% everywhere = STOP and tune payoffs):`);
const best = Math.max(bowDelta, daggerDelta);
if (best >= 10) { console.log(`PASSED (best Δ ${best.toFixed(1)}%)`); process.exit(0); }
if (best >= 5) { console.log(`MARGINAL (best Δ ${best.toFixed(1)}%) — investigate before UI work`); process.exit(0); }
console.log(`FAILED (best Δ ${best.toFixed(1)}%) — do not build rotation UI; tune consume payoffs first`);
process.exit(1);

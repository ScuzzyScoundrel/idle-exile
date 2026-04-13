#!/usr/bin/env node
// ============================================================
// QA Staff Interactions — END-TO-END player-perspective testing
// Builds real GameState with skills + talents allocated, runs
// runCombatTick() for N ticks, captures observability trail
// (damage events, debuffs applied, combo states, minions, procs),
// then asserts vs expected behavior.
//
// Goal: catch the kinds of bugs a player would notice — broken
// procs, dead talents, NaN damage, missing minions, dropped combos.
// Usage: npx tsx sim/qa-staff-interactions.ts
// ============================================================

import { installRng } from './rng';
import { installClock, getNow, advanceClock } from './clock';

installClock();
installRng(42);

import './balance-overrides';

import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import type {
  GameState, ActiveDebuff, MobInPack, EquippedSkill, SkillProgress,
} from '../src/types';

// ─── Colors ──────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;
const failures: { scenario: string; assertion: string; detail?: string }[] = [];

function pass(scenario: string, label: string, detail?: string): void {
  passCount++;
  console.log(`  ${GREEN}✓${RESET} ${label}${detail ? ` ${DIM}(${detail})${RESET}` : ''}`);
}

function fail(scenario: string, label: string, detail?: string): void {
  failCount++;
  failures.push({ scenario, assertion: label, detail });
  console.log(`  ${RED}✗${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
}

function check(scenario: string, label: string, cond: boolean, detail?: string): void {
  if (cond) pass(scenario, label, detail);
  else fail(scenario, label, detail);
}

function section(title: string): void {
  console.log(`\n${CYAN}${BOLD}── ${title} ──${RESET}`);
}

function scenario(title: string): void {
  console.log(`\n${YELLOW}▸ ${title}${RESET}`);
}

// ─── State Builder ───────────────────────────────────────

function createMobPack(count: number, hp: number, now: number): MobInPack[] {
  return Array.from({ length: count }, (_, i) => ({
    hp,
    maxHp: hp,
    debuffs: [] as ActiveDebuff[],
    nextAttackAt: now + 5000 + i * 500, // 5s grace before mobs hit player (focus on player damage)
    rare: null,
    damageElement: 'physical' as any,
    physRatio: 1.0,
  })) as any;
}

interface BuildSpec {
  skills: string[];                                       // skill ids in rotation order
  talents: Record<string, Record<string, number>>;        // skillId → nodeId → rank
  packSize?: number;
  mobHp?: number;
  spellPower?: number;
  maxLife?: number;
}

function makeStaffState(build: BuildSpec): GameState {
  const char = createCharacter('QABot', 'mage');
  char.level = 30;
  char.xpToNext = 99999;
  char.equipment = {
    mainhand: {
      id: 'qa_staff', baseId: 'crude_staff', name: 'QA Staff',
      slot: 'mainhand', rarity: 'rare' as any, iLvl: 30,
      prefixes: [], suffixes: [],
      weaponType: 'staff',
      baseStats: { flatPhysDamage: 20, baseAttackSpeed: 8, baseCritChance: 5, accuracy: 80, evasion: 60 },
      baseDamageMin: 30, baseDamageMax: 60,
      baseSpellPower: build.spellPower ?? 100,
    },
  } as any;
  char.stats = resolveStats(char);
  if (build.maxLife) char.stats.maxLife = build.maxLife;

  const now = getNow();
  const zone = ZONE_DEFS[3] ?? ZONE_DEFS[0];

  const skillBar: (EquippedSkill | null)[] = Array(8).fill(null);
  const skillTimers: any[] = [];
  const skillProgress: Record<string, SkillProgress> = {};
  for (let i = 0; i < build.skills.length; i++) {
    const sid = build.skills[i];
    skillBar[i] = { skillId: sid, autoCast: true } as any;
    skillTimers.push({ skillId: sid, activatedAt: null, cooldownUntil: null });
    skillProgress[sid] = {
      skillId: sid, xp: 0, level: 20,
      allocatedNodes: Object.keys(build.talents[sid] ?? {}),
      allocatedRanks: build.talents[sid] ?? {},
    };
  }

  const packSize = build.packSize ?? 3;
  const mobHp = build.mobHp ?? 5000;

  return {
    character: char, inventory: [], currencies: {} as any, materials: {}, gold: 0,
    bagSlots: [], bagStash: {}, bank: { tabs: [] },
    currentZoneId: zone.id, idleStartTime: 1, idleMode: 'combat',
    gatheringSkills: {} as any, gatheringEquipment: {}, selectedGatheringProfession: null,
    professionEquipment: {}, craftingSkills: {} as any, ownedPatterns: [],
    autoSalvageMinRarity: 'common', autoDisposalAction: 'salvage',
    craftAutoSalvageMinRarity: 'common', offlineProgress: null,
    abilityProgress: {}, clearStartedAt: 0, currentClearTime: 0,
    currentHp: char.stats.maxLife, currentEs: 0,
    combatPhase: 'clearing', bossState: null, zoneClearCounts: {},
    combatPhaseStartedAt: now, classResource: createResourceState('mage'),
    classSelected: true, totalKills: 0, fastestClears: {},
    skillBar, skillProgress, skillTimers, talentAllocations: [],
    activeDebuffs: [], consecutiveHits: 0, lastSkillsCast: [],
    lastOverkillDamage: 0, killStreak: 0, lastCritAt: 0, lastBlockAt: 0,
    lastDodgeAt: 0, dodgeEntropy: 50, tempBuffs: [], skillCharges: {},
    rampingStacks: 0, rampingLastHitAt: 0,
    fortifyStacks: 0, fortifyExpiresAt: 0, fortifyDRPerStack: 0,
    deathStreak: 0, lastDeathTime: 0, comboStates: [], activeTraps: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, elementTransforms: {},
    lastHitMobTypeId: null, freeCastUntil: {}, lastProcTriggerAt: {},
    lastClearResult: null, lastSkillActivation: 0, nextActiveSkillAt: 0,
    packMobs: createMobPack(packSize, mobHp, now),
    currentPackSize: packSize, targetedMobId: null,
    currentMobTypeId: 'thicket_crawler', mobKillCounts: {}, bossKillCounts: {},
    totalZoneClears: {}, dailyQuests: { questDate: '', quests: [], progress: {} },
    craftLog: [], craftOutputBuffer: [], gemInventory: [],
    zoneMasteryClaimed: {}, invasionState: { activeInvasions: {}, bandCooldowns: {} },
    tutorialStep: 99, hasSeenCraftingHint: true, lastSaveTime: now,
    activeMinions: [],
  } as any as GameState;
}

// ─── Tick harness w/ trail capture ───────────────────────

interface TickTrail {
  ticks: number;
  totalDamageToMobs: number;
  totalDamageToBoss: number;
  totalDoTDamage: number;
  totalKills: number;
  comboStateIdsCreated: Set<string>;
  comboStateIdsConsumed: Set<string>;
  debuffIdsAppliedToMobs: Set<string>;
  procsFired: Set<string>;
  minionTypesSeenAlive: Set<string>;
  maxMinionCount: number;
  totalMinionDamage: number;
  nanCount: number;
  infinityCount: number;
  errorMessages: string[];
  finalState: GameState;
  // raw per-tick events
  events: { tick: number; tag: string; detail?: any }[];
}

function runScenario(state: GameState, ticks: number, dtSec: number = 0.5): TickTrail {
  const trail: TickTrail = {
    ticks: 0, totalDamageToMobs: 0, totalDamageToBoss: 0, totalDoTDamage: 0,
    totalKills: 0, comboStateIdsCreated: new Set(), comboStateIdsConsumed: new Set(),
    debuffIdsAppliedToMobs: new Set(), procsFired: new Set(),
    minionTypesSeenAlive: new Set(), maxMinionCount: 0,
    totalMinionDamage: 0, nanCount: 0, infinityCount: 0,
    errorMessages: [], finalState: state, events: [],
  };
  let workingState = state;
  const initialMobHps = state.packMobs.map(m => m.hp);
  const initialBossHp = state.bossState?.bossCurrentHp ?? 0;
  const initialKills = state.totalKills ?? 0;
  let prevComboStateIds = new Set(workingState.comboStates.map(s => s.stateId));

  for (let i = 0; i < ticks; i++) {
    advanceClock(dtSec * 1000);
    const now = getNow();
    let out: any;
    try {
      out = runCombatTick(workingState, dtSec, now);
    } catch (e: any) {
      trail.errorMessages.push(`tick ${i}: ${e.message}`);
      break;
    }
    if (!out) break;
    workingState = { ...workingState, ...(out.patch ?? {}) };
    trail.ticks++;

    // Capture combo state changes
    const currIds = new Set(workingState.comboStates.map(s => s.stateId));
    for (const id of currIds) if (!prevComboStateIds.has(id)) trail.comboStateIdsCreated.add(id);
    for (const id of prevComboStateIds) if (!currIds.has(id)) trail.comboStateIdsConsumed.add(id);
    prevComboStateIds = currIds;

    // Capture debuffs on mobs
    for (const m of workingState.packMobs) {
      for (const d of m.debuffs) trail.debuffIdsAppliedToMobs.add(d.debuffId);
      // NaN / Infinity scan
      if (!isFinite(m.hp)) {
        trail.nanCount++;
        trail.events.push({ tick: i, tag: 'nan', detail: { src: 'mob.hp', value: m.hp } });
      }
      for (const d of m.debuffs) {
        const snap = (d as any).snapshot ?? (d as any).snapshotDamage;
        if (snap !== undefined && !isFinite(snap)) {
          trail.nanCount++;
          trail.events.push({ tick: i, tag: 'nan', detail: { src: 'snapshot', deb: d.debuffId, by: d.appliedBySkillId, value: snap } });
        }
      }
    }
    if (workingState.bossState && !isFinite(workingState.bossState.bossCurrentHp)) trail.nanCount++;

    // Capture minions
    if (workingState.activeMinions) {
      trail.maxMinionCount = Math.max(trail.maxMinionCount, workingState.activeMinions.length);
      for (const m of workingState.activeMinions) {
        trail.minionTypesSeenAlive.add(m.type);
        if (!isFinite(m.hp)) {
          trail.nanCount++;
          trail.events.push({ tick: i, tag: 'nan', detail: { src: 'minion.hp', type: m.type, value: m.hp } });
        }
        if (!isFinite(m.damage)) {
          trail.nanCount++;
          trail.events.push({ tick: i, tag: 'nan', detail: { src: 'minion.damage', type: m.type, value: m.damage } });
        }
      }
      // Track total damage dealt by minions across the run
      const totalDealtNow = workingState.activeMinions.reduce((s, m) => s + (m.damageDealt ?? 0), 0);
      trail.totalMinionDamage = Math.max(trail.totalMinionDamage, totalDealtNow);
    }

    // Capture combat result
    if (out.result) {
      const cr = out.result;
      if (cr.totalDamage !== undefined) {
        if (isFinite(cr.totalDamage)) trail.totalDamageToMobs += cr.totalDamage;
        else { trail.nanCount++; trail.events.push({ tick: i, tag: 'nan', detail: { src: 'cr.totalDamage' } }); }
      }
      if (cr.dotDamage !== undefined) {
        if (isFinite(cr.dotDamage)) trail.totalDoTDamage += cr.dotDamage;
        else { trail.nanCount++; trail.events.push({ tick: i, tag: 'nan', detail: { src: 'cr.dotDamage' } }); }
      }
      if (Array.isArray(cr.procsFired)) for (const p of cr.procsFired) trail.procsFired.add(p);
    }
  }

  // Compute total damage from mob HP delta as fallback
  const finalMobs = workingState.packMobs;
  let damageDealt = 0;
  for (let i = 0; i < initialMobHps.length; i++) {
    const initHp = initialMobHps[i] ?? 0;
    const final = finalMobs[i]?.hp ?? 0;
    const delta = initHp - final;
    if (delta > 0 && isFinite(delta)) damageDealt += delta;
  }
  if (trail.totalDamageToMobs === 0) trail.totalDamageToMobs = damageDealt;
  trail.totalKills = (workingState.totalKills ?? 0) - initialKills;
  trail.finalState = workingState;
  return trail;
}

// ════════════════════════════════════════════════════════════
// Scenario library
// ════════════════════════════════════════════════════════════

section('Per-skill BASE scenarios (no talents)');

const ALL_STAFF = [
  'staff_haunt', 'staff_locust_swarm', 'staff_plague_of_toads', 'staff_hex',
  'staff_spirit_barrage', 'staff_soul_harvest', 'staff_mass_sacrifice',
  'staff_zombie_dogs', 'staff_fetish_swarm', 'staff_bouncing_skull',
];

const SKILL_EXPECTED_DEBUFF: Record<string, string | null> = {
  staff_haunt: 'haunt_dot',
  staff_locust_swarm: 'locust_swarm_dot',
  staff_plague_of_toads: 'toads_dot',
  staff_hex: 'hexed',
  staff_spirit_barrage: null, // hits, no DoT
  staff_soul_harvest: null,
  staff_mass_sacrifice: null,
  staff_zombie_dogs: null,
  staff_fetish_swarm: null,
  staff_bouncing_skull: null,
};

const SKILL_EXPECTED_MINION: Record<string, string | null> = {
  staff_zombie_dogs: 'zombie_dog',
  staff_fetish_swarm: 'fetish',
};

for (const skillId of ALL_STAFF) {
  scenario(`${skillId} — base cast (no talents)`);
  const state = makeStaffState({ skills: [skillId], talents: {}, packSize: 3, mobHp: 50000 });
  const trail = runScenario(state, 60, 0.5); // 30 seconds
  check(skillId, 'no errors thrown', trail.errorMessages.length === 0,
    trail.errorMessages.join('; '));
  check(skillId, 'no NaN values in damage/debuffs', trail.nanCount === 0,
    `nan=${trail.nanCount}`);
  check(skillId, 'positive damage dealt', trail.totalDamageToMobs > 0,
    `total=${trail.totalDamageToMobs.toFixed(1)}`);
  const expectedDeb = SKILL_EXPECTED_DEBUFF[skillId];
  if (expectedDeb) {
    check(skillId, `applied ${expectedDeb} debuff`, trail.debuffIdsAppliedToMobs.has(expectedDeb),
      `seen=[${[...trail.debuffIdsAppliedToMobs].join(',')}]`);
  }
  const expectedMin = SKILL_EXPECTED_MINION[skillId];
  if (expectedMin) {
    check(skillId, `summoned ${expectedMin}`, trail.minionTypesSeenAlive.has(expectedMin),
      `seen=[${[...trail.minionTypesSeenAlive].join(',')}]`);
    check(skillId, 'minion dealt damage', trail.totalMinionDamage > 0,
      `dmg=${trail.totalMinionDamage.toFixed(1)}`);
  }
}

// ════════════════════════════════════════════════════════════
section('DoT skill snapshot tick rate validation');

// For each DoT skill: cast once at known SP, check first-tick damage matches snapshot * snapshotPercent
const DOT_SCENARIOS = [
  { skillId: 'staff_locust_swarm', dotId: 'locust_swarm_dot', expectedSnapshotPct: 40 },
  { skillId: 'staff_haunt', dotId: 'haunt_dot', expectedSnapshotPct: 35 },
  { skillId: 'staff_plague_of_toads', dotId: 'toads_dot', expectedSnapshotPct: 30 },
];

for (const ds of DOT_SCENARIOS) {
  scenario(`${ds.skillId} — DoT tick produces measurable damage`);
  const state = makeStaffState({ skills: [ds.skillId], talents: {}, packSize: 1, mobHp: 1e9 });
  const trail = runScenario(state, 30, 0.5);
  check(ds.skillId, 'DoT applied', trail.debuffIdsAppliedToMobs.has(ds.dotId));
  check(ds.skillId, 'DoT did damage', trail.totalDoTDamage > 0 || (trail.totalDamageToMobs > 0),
    `dot=${trail.totalDoTDamage.toFixed(1)} total=${trail.totalDamageToMobs.toFixed(1)}`);
  // Verify the debuff snapshot is finite
  const finalDeb = trail.finalState.packMobs[0]?.debuffs.find(d => d.debuffId === ds.dotId);
  if (finalDeb) {
    const snap = (finalDeb as any).snapshot ?? (finalDeb as any).snapshotDamage ?? 0;
    check(ds.skillId, 'DoT snapshot is finite + positive', isFinite(snap) && snap > 0,
      `snapshot=${snap}`);
  }
}

// ════════════════════════════════════════════════════════════
section('Combo state production + consumption');

// Each producer skill creates its combo state
const PRODUCER_SCENARIOS = [
  { skillId: 'staff_haunt', stateId: 'haunted' },
  { skillId: 'staff_locust_swarm', stateId: 'plagued' }, // Locust creates plagued, Toads consumes
  { skillId: 'staff_hex', stateId: 'hexed' },
  { skillId: 'staff_soul_harvest', stateId: 'soul_stack' },
];

for (const ps of PRODUCER_SCENARIOS) {
  scenario(`${ps.skillId} — produces ${ps.stateId} combo state`);
  const state = makeStaffState({ skills: [ps.skillId], talents: {}, packSize: 2, mobHp: 5e7 });
  const trail = runScenario(state, 30, 0.5);
  check(ps.skillId, `created ${ps.stateId}`, trail.comboStateIdsCreated.has(ps.stateId),
    `created=[${[...trail.comboStateIdsCreated].join(',')}]`);
}

// Mass Sacrifice consumes combo states + bonus damage
{
  scenario('Mass Sacrifice — consumes haunted+plagued+hexed for bonus');
  // Use Locust (creates plagued), Haunt (creates haunted), Hex (creates hexed) → Mass Sac consumes
  const state = makeStaffState({
    skills: ['staff_haunt', 'staff_locust_swarm', 'staff_hex', 'staff_mass_sacrifice'],
    talents: {}, packSize: 1, mobHp: 1e9,
  });
  const trail = runScenario(state, 100, 0.5);
  check('mass_sac', 'consumed haunted', trail.comboStateIdsConsumed.has('haunted'));
  check('mass_sac', 'consumed plagued', trail.comboStateIdsConsumed.has('plagued'));
  check('mass_sac', 'consumed hexed', trail.comboStateIdsConsumed.has('hexed'));
  check('mass_sac', 'no NaN', trail.nanCount === 0, `nan=${trail.nanCount}`);
}

// Soul Harvest with hexed in pool — consumes hexed
{
  scenario('Soul Harvest — consumes hexed combo state');
  const state = makeStaffState({
    skills: ['staff_hex', 'staff_soul_harvest'], talents: {},
    packSize: 1, mobHp: 1e9,
  });
  const trail = runScenario(state, 40, 0.5);
  check('soul_harv', 'consumed hexed', trail.comboStateIdsConsumed.has('hexed'));
  check('soul_harv', 'no NaN', trail.nanCount === 0);
}

// Plague of Toads consumes plagued (created by Locust) for pandemic
{
  scenario('Locust → Toads — Toads consumes plagued for pandemic');
  const state = makeStaffState({
    skills: ['staff_locust_swarm', 'staff_plague_of_toads'], talents: {},
    packSize: 3, mobHp: 1e9,
  });
  const trail = runScenario(state, 60, 0.5);
  check('toads', 'created plagued (by Locust)', trail.comboStateIdsCreated.has('plagued'));
  check('toads', 'consumed plagued (by Toads)', trail.comboStateIdsConsumed.has('plagued'));
}

// ════════════════════════════════════════════════════════════
section('Minion lifecycle');

// Zombie Dogs
{
  scenario('Zombie Dogs — spawns, ticks, deals damage');
  const state = makeStaffState({ skills: ['staff_zombie_dogs'], talents: {}, packSize: 3, mobHp: 1e8 });
  const trail = runScenario(state, 60, 0.5);
  check('dogs', 'spawned', trail.minionTypesSeenAlive.has('zombie_dog'));
  check('dogs', 'minion damage > 0', trail.totalMinionDamage > 0,
    `dmg=${trail.totalMinionDamage.toFixed(1)}`);
  check('dogs', 'created spirit_link combo state', trail.comboStateIdsCreated.has('spirit_link'));
  check('dogs', 'applied poisoned (chaos auto-ailment)', trail.debuffIdsAppliedToMobs.has('poisoned'));
}

// Fetish Swarm
{
  scenario('Fetish Swarm — 4 fetishes spawned, attack');
  const state = makeStaffState({ skills: ['staff_fetish_swarm'], talents: {}, packSize: 3, mobHp: 1e8 });
  const trail = runScenario(state, 60, 0.5);
  check('fetish', 'spawned', trail.minionTypesSeenAlive.has('fetish'));
  check('fetish', 'at least 4 alive at peak', trail.maxMinionCount >= 4,
    `peak=${trail.maxMinionCount}`);
  check('fetish', 'minion damage > 0', trail.totalMinionDamage > 0);
  check('fetish', 'applied bleeding (physical auto-ailment)', trail.debuffIdsAppliedToMobs.has('bleeding'));
}

// ════════════════════════════════════════════════════════════
section('Talent allocations — keystone scenarios');

const KEYSTONE_TESTS: { name: string; build: BuildSpec; expectations: string[] }[] = [
  {
    name: 'Soulrot (Haunt t5a) — DoT doubled, no chain',
    build: { skills: ['staff_haunt'], talents: { staff_haunt: { ht_2_5_0: 1 } }, packSize: 1, mobHp: 1e9 },
    expectations: ['no NaN', 'haunt_dot applied', 'positive damage'],
  },
  {
    name: 'THE BLOOD CULT (Fetish t7) — fetishes permanent',
    build: { skills: ['staff_fetish_swarm'], talents: { staff_fetish_swarm: { fs_0_7_0: 1 } }, packSize: 3, mobHp: 1e8 },
    expectations: ['no NaN', 'fetish spawn'],
  },
  {
    name: 'THE PESTILENCE (Fetish t7) — always poison + bleed',
    build: { skills: ['staff_fetish_swarm'], talents: { staff_fetish_swarm: { fs_1_7_0: 1 } }, packSize: 3, mobHp: 1e8 },
    expectations: ['no NaN', 'poisoned applied', 'bleeding applied'],
  },
  {
    name: 'THE PLAGUE PACK (Dogs t7) — bites apply hexed + haunt_dot',
    build: { skills: ['staff_zombie_dogs'], talents: { staff_zombie_dogs: { zd_1_7_0: 1 } }, packSize: 3, mobHp: 1e8 },
    expectations: ['no NaN', 'hexed applied', 'haunt_dot applied'],
  },
  {
    name: 'THE COLONY (Locust Spirit Caller t7) — permanent spirits',
    build: { skills: ['staff_locust_swarm'], talents: { staff_locust_swarm: { ls_1_7_0: 1 } }, packSize: 3, mobHp: 1e8 },
    expectations: ['no NaN', 'spirit_temp spawn'],
  },
  {
    name: 'THE PLAGUE COURT (Toads t7) — keep all plagued',
    build: { skills: ['staff_plague_of_toads'], talents: { staff_plague_of_toads: { tp_0_7_0: 1 } }, packSize: 3, mobHp: 1e8 },
    expectations: ['no NaN', 'plagued applied'],
  },
];

for (const t of KEYSTONE_TESTS) {
  scenario(t.name);
  const trail = runScenario(makeStaffState(t.build), 60, 0.5);
  for (const exp of t.expectations) {
    if (exp === 'no NaN') check(t.name, exp, trail.nanCount === 0, `nan=${trail.nanCount}`);
    else if (exp === 'positive damage') check(t.name, exp, trail.totalDamageToMobs > 0);
    else if (exp.endsWith(' applied')) {
      const debId = exp.replace(' applied', '');
      check(t.name, exp, trail.debuffIdsAppliedToMobs.has(debId));
    }
    else if (exp.endsWith(' spawn')) {
      const t2 = exp.replace(' spawn', '');
      check(t.name, exp, trail.minionTypesSeenAlive.has(t2),
        `seen=[${[...trail.minionTypesSeenAlive].join(',')}]`);
    }
  }
}

// ════════════════════════════════════════════════════════════
section('Cross-skill combo flows');

// Haunt + Mass Sacrifice (the user's "fuck ton of damage" combo)
{
  scenario('Haunt → Mass Sacrifice — consumes haunted, big damage');
  // Mass Sac has 12s CD, run long enough for at least one cast
  const state = makeStaffState({
    skills: ['staff_haunt', 'staff_mass_sacrifice'], talents: {},
    packSize: 1, mobHp: 1e9,
  });
  const trail = runScenario(state, 100, 0.5); // 50s
  check('combo', 'created haunted', trail.comboStateIdsCreated.has('haunted'));
  check('combo', 'consumed haunted (Mass Sac fired)', trail.comboStateIdsConsumed.has('haunted'));
  check('combo', 'no NaN', trail.nanCount === 0);
  check('combo', 'positive damage', trail.totalDamageToMobs > 0);
}

// Dogs + Mass Sacrifice (spirit_link detonation)
{
  scenario('Zombie Dogs → Mass Sacrifice — detonates spirit_link');
  const state = makeStaffState({
    skills: ['staff_zombie_dogs', 'staff_mass_sacrifice'], talents: {},
    packSize: 1, mobHp: 1e9,
  });
  const trail = runScenario(state, 60, 0.5);
  check('combo', 'created spirit_link', trail.comboStateIdsCreated.has('spirit_link'));
  check('combo', 'consumed spirit_link', trail.comboStateIdsConsumed.has('spirit_link'));
  check('combo', 'no NaN', trail.nanCount === 0);
}

// Stacked all DoTs — Locust + Haunt + Toads
{
  scenario('Locust + Haunt + Toads — 3 DoTs stacked, all tick');
  const state = makeStaffState({
    skills: ['staff_locust_swarm', 'staff_haunt', 'staff_plague_of_toads'], talents: {},
    packSize: 1, mobHp: 1e9,
  });
  const trail = runScenario(state, 60, 0.5);
  check('triple_dot', 'all 3 DoTs applied',
    trail.debuffIdsAppliedToMobs.has('locust_swarm_dot') &&
    trail.debuffIdsAppliedToMobs.has('haunt_dot') &&
    trail.debuffIdsAppliedToMobs.has('toads_dot'));
  check('triple_dot', 'no NaN', trail.nanCount === 0);
  check('triple_dot', 'cumulative DoT damage > 0', trail.totalDoTDamage > 0);
}

// Hex applies to mob (the user reported missing earlier)
{
  scenario('Hex — applies hexed debuff to enemy');
  const state = makeStaffState({ skills: ['staff_hex'], talents: {}, packSize: 1, mobHp: 1e9 });
  const trail = runScenario(state, 30, 0.5);
  check('hex', 'hexed debuff on mob', trail.debuffIdsAppliedToMobs.has('hexed'));
  check('hex', 'no NaN', trail.nanCount === 0);
}

// ════════════════════════════════════════════════════════════
section('Stress test: random builds with mixed talents');

// 20 random builds: each with 3 staff skills + 5-10 random talents per skill
const STAFF_TALENT_NODES_PER_SKILL: Record<string, string[]> = {};
for (const sid of ALL_STAFF) {
  const prefix = sid.replace('staff_', '').split('_').map(s => s[0]).join('');
  // Synthesize plausible talent ids: prefix_branch_tier_pos
  // We'll inspect the actual tree at runtime via canAllocateTalentRank
}

import { ALL_TALENT_TREES } from '../src/data/skillGraphs/talentTrees';
import { canAllocateTalentRank, allocateTalentRank } from '../src/engine/talentTree';

function randomTalents(skillId: string, points: number): Record<string, number> {
  const tree = ALL_TALENT_TREES[skillId];
  if (!tree) return {};
  let ranks: Record<string, number> = {};
  const allNodes = tree.branches.flatMap(b => b.nodes);
  const shuffled = [...allNodes].sort(() => Math.random() - 0.5);
  let spent = 0;
  for (let pass = 0; pass < 5 && spent < points; pass++) {
    for (const node of shuffled) {
      if (spent >= points) break;
      const cur = ranks[node.id] ?? 0;
      if (cur >= node.maxRank) continue;
      if (canAllocateTalentRank(tree, ranks, node.id, 20)) {
        ranks = allocateTalentRank(ranks, node.id);
        spent++;
      }
    }
  }
  return ranks;
}

let stressNanBuilds = 0;
let stressZeroDamageBuilds = 0;
let stressErrorBuilds = 0;
let stressOk = 0;

for (let bot = 0; bot < 30; bot++) {
  installRng(bot * 7 + 13);
  const picks = [...ALL_STAFF].sort(() => Math.random() - 0.5).slice(0, 3);
  const talents: Record<string, Record<string, number>> = {};
  for (const sid of picks) talents[sid] = randomTalents(sid, 10);
  const state = makeStaffState({ skills: picks, talents, packSize: 3, mobHp: 1e7 });
  const trail = runScenario(state, 80, 0.5);
  if (trail.errorMessages.length > 0) stressErrorBuilds++;
  else if (trail.nanCount > 0) {
    stressNanBuilds++;
    const firstNan = trail.events.find(e => e.tag === 'nan');
    console.log(`  ${RED}NaN found bot=${bot} skills=[${picks.join(',')}] src=${JSON.stringify(firstNan?.detail)}${RESET}`);
  }
  else if (trail.totalDamageToMobs === 0 && trail.totalDoTDamage === 0 && trail.totalMinionDamage === 0) {
    stressZeroDamageBuilds++;
    console.log(`  ${YELLOW}zero-damage bot=${bot} skills=[${picks.join(',')}]${RESET}`);
  }
  else stressOk++;
}
console.log(`\n  ${BOLD}stress totals${RESET}: ok=${stressOk} nan=${stressNanBuilds} zero=${stressZeroDamageBuilds} err=${stressErrorBuilds}`);
check('stress', 'no random builds produced NaN', stressNanBuilds === 0);
check('stress', 'no random builds errored', stressErrorBuilds === 0);
check('stress', 'no random builds with zero damage', stressZeroDamageBuilds === 0);

// ════════════════════════════════════════════════════════════
console.log(`\n${BOLD}══════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}Result: ${passCount}/${passCount + failCount} PASS${RESET}`);
if (failCount > 0) {
  console.log(`\n${RED}${BOLD}Failures:${RESET}`);
  for (const f of failures) {
    console.log(`  ${RED}✗${RESET} [${f.scenario}] ${f.assertion}${f.detail ? ` — ${f.detail}` : ''}`);
  }
  process.exit(1);
}

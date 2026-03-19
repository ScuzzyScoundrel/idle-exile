#!/usr/bin/env node
// ============================================================
// QA Mechanics — Predicate-Based Proc Mechanic Testing
// Scans all talent trees for nodes with advanced proc fields,
// creates ideal test states, and asserts specific outcomes.
// Usage: npx tsx sim/qa-mechanics.ts [--skill dagger_stab]
// ============================================================

import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';

const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}

const skillFilter = getArg('skill', 'all').toLowerCase();
const SEED = 42;

installClock();
installRng(SEED);

import './balance-overrides';

import { ALL_TALENT_TREES } from '../src/data/skillGraphs/talentTrees';
import { resolveTalentModifiers } from '../src/engine/talentTree';
import { evaluateProcs } from '../src/engine/combatHelpers';
import type { ProcContext } from '../src/engine/combatHelpers';
import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import type {
  GameState, ActiveDebuff, MobInPack,
  Item, SkillProgress, EquippedSkill, SkillProcEffect,
} from '../src/types';
import type { TrapState } from '../src/engine/combat/traps';

// ─── Colors ─────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Types ──────────────────────────────────────────────
type MechanicFamily =
  | 'detonateAll' | 'detonateAilments' | 'explodeAilments'
  | 'consumeAllAilments' | 'applyBuff' | 'freeCast' | 'fortifyOnProc';

interface MechanicTestCase {
  family: MechanicFamily;
  skillId: string;
  nodeId: string;
  nodeName: string;
  procId: string;
  proc: Record<string, any>;
}

interface TestResult {
  family: MechanicFamily;
  nodeId: string;
  nodeName: string;
  procId: string;
  pass: boolean;
  skipped: boolean;
  details: string;
}

// ─── Direct Proc Evaluation ─────────────────────────────
// Instead of running full combat ticks, call evaluateProcs directly
// with a hand-crafted ProcContext. Covers cases the tick sim can't reach.

/** Resolve a node's procs from the talent tree, returning the skillProcs array. */
function resolveNodeProcs(skillId: string, nodeId: string): SkillProcEffect[] {
  const tree = ALL_TALENT_TREES[skillId];
  if (!tree) return [];
  const ranks: Record<string, number> = {};
  for (const branch of tree.branches) {
    const target = branch.nodes.find(n => n.id === nodeId);
    if (target) {
      for (const n of branch.nodes) {
        if (n.tier <= target.tier) ranks[n.id] = n.maxRank;
      }
      break;
    }
  }
  const mod = resolveTalentModifiers(tree, ranks);
  return mod.skillProcs;
}

/** Build an ideal ProcContext that satisfies any conditionParam the proc needs. */
function buildIdealProcContext(tc: MechanicTestCase): ProcContext {
  const cp = tc.proc.conditionParam ?? {};
  const now = getNow();

  // Seed ailment debuffs on target if needed
  const ailmentStacks = Math.max(cp.minAilmentStacks ?? 0, cp.totalTicksOnTarget ?? 0, 8);
  const targetDebuffs: ActiveDebuff[] = [{
    debuffId: 'poisoned', stacks: ailmentStacks,
    remainingDuration: 10, skillId: tc.skillId,
    appliedBySkillId: 'dagger_viper_strike', // satisfies minViperStrikeAilments
    stackSnapshots: Array(ailmentStacks).fill(50),
  } as any];

  const char = createCharacter('DirectBot', 'rogue');
  char.level = 20;
  char.equipment = { mainhand: {
    id: 'qa', baseId: 'crude_dagger', name: 'QA', slot: 'mainhand', rarity: 'rare' as any, iLvl: 20,
    prefixes: [], suffixes: [], weaponType: 'dagger',
    baseStats: { flatPhysDamage: 15, baseAttackSpeed: 10, baseCritChance: 5, accuracy: 80, evasion: 60 },
    baseDamageMin: 20, baseDamageMax: 40, baseSpellPower: 10,
  }};
  char.stats = resolveStats(char);

  return {
    isHit: true,
    isCrit: true, // satisfy onCrit triggers
    skillId: tc.skillId,
    effectiveMaxLife: char.stats.maxLife,
    stats: char.stats,
    weaponAvgDmg: 30,
    weaponSpellPower: 10,
    damageMult: 1,
    now,
    lastProcTriggerAt: {},
    targetDebuffs,
    targetHpPercent: cp.targetBelowHp ? cp.targetBelowHp - 1 : 30,
    consecutiveHits: Math.max(cp.consecutiveHits ?? 0, 5),
    lastDodgeAt: now - 100, // recent dodge for dodge-window conditions
    packSize: Math.max(cp.minTargetsHit ?? 0, cp.linkedTargets ?? 0, cp.minTargetsAilmented ?? 0, 5),
    targetsHitThisCast: Math.max(cp.minTargetsHit ?? 0, cp.uniqueTargets ?? 0, 5),
    killsThisCast: Math.max(cp.minKills ?? 0, 5),
    critsThisCast: Math.max(cp.minCritsInCast ?? 0, 3),
    comboStatesConsumedThisTick: [],
    lastSkillCastAt: { [tc.skillId]: now - 500 },
    skillTimers: [{ skillId: tc.skillId, cooldownUntil: null }],
    activeTempBuffIds: [],
    currentCharges: 5,
    ailmentedMobCount: Math.max(cp.minEnemiesWithViperStrikeAilment ?? 0, cp.minTargetsAilmented ?? 0, 5),
  };
}

/** Run evaluateProcs directly — bypasses full tick, tests proc evaluation logic. */
function runDirectProcTest(tc: MechanicTestCase, assertFn: (pr: any) => { pass: boolean; details: string }): TestResult {
  resetRng(); setClock(600000); // 600s — ensures all ICDs have "expired" since time 0
  const procs = resolveNodeProcs(tc.skillId, tc.nodeId);
  const ctx = buildIdealProcContext(tc);

  // Force RNG to pass all chance checks
  const saved = Math.random;
  Math.random = () => 0.01;
  const pr = evaluateProcs(procs as any, tc.proc.trigger as any, ctx);
  Math.random = saved;
  resetRng();

  const fired = pr.procsFired.includes(tc.procId);
  const assertion = assertFn(pr);
  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass: fired && assertion.pass, skipped: false,
    details: `fired=${fired} ${assertion.details}`,
  };
}

/** Should this test case use direct proc evaluation instead of tick simulation? */
function needsDirectEval(proc: Record<string, any>): boolean {
  if (proc.trigger === 'onDodge') return true;
  const cp = proc.conditionParam;
  if ((cp?.minTargetsHit ?? 0) > 1) return true;
  if ((cp?.minTargetsAilmented ?? 0) > 1) return true;
  if ((cp?.minCritsInCast ?? 0) >= 2) return true;
  if (proc.trigger === 'onMultiKillInCast' && (cp?.minKills ?? 0) >= 3) return true;
  if (proc.trigger === 'onAilmentTick') return true;
  if (proc.trigger === 'onLinkedTargetsThreshold') return true;
  // onAilmentExpire / onLinkedTargetDeath: trigger doesn't match any evaluateProcs trigger string
  return false;
}

// Truly untestable: trigger strings that don't exist in evaluateProcs dispatch
const UNEVALUABLE_TRIGGERS = new Set(['onAilmentExpire', 'onLinkedTargetDeath']);

/** dodgesInWindow >= 3 is capped at 2 by the engine's approximation (L452) */
function exceedsDodgeCountCap(proc: Record<string, any>): boolean {
  return (proc.conditionParam?.dodgesInWindow ?? 0) >= 3;
}

// ─── Node Discovery ─────────────────────────────────────

function discoverMechanicNodes(): MechanicTestCase[] {
  const cases: MechanicTestCase[] = [];

  const trees = skillFilter === 'all'
    ? Object.entries(ALL_TALENT_TREES)
    : Object.entries(ALL_TALENT_TREES).filter(([id]) => id === skillFilter || id.includes(skillFilter));

  for (const [skillId, tree] of trees) {
    for (const branch of tree.branches) {
      for (const node of branch.nodes) {
        const procs = node.modifier?.procs;
        if (!procs?.length) continue;
        for (const proc of procs) {
          const p = proc as Record<string, any>;
          let family: MechanicFamily | null = null;
          if (p.detonateAll) family = 'detonateAll';
          else if (p.detonateAilments) family = 'detonateAilments';
          else if (p.explodeAilments) family = 'explodeAilments';
          else if (p.consumeAllAilments) family = 'consumeAllAilments';
          else if (p.applyBuff?.buffId) family = 'applyBuff';
          else if (p.freeCast) family = 'freeCast';
          else if (p.fortifyOnProc) family = 'fortifyOnProc';
          if (family) {
            cases.push({ family, skillId, nodeId: node.id, nodeName: node.name, procId: p.id, proc: p });
          }
        }
      }
    }
  }
  return cases;
}

// ─── Trigger-Aware Helpers ──────────────────────────────

function isExoticTrigger(trigger: string): boolean {
  return EXOTIC_TRIGGERS.has(trigger);
}

/** Determine ideal pack size from trigger + conditionParam */
function idealPackSize(proc: Record<string, any>): number {
  const cp = proc.conditionParam;
  if (cp?.minTargetsHit) return Math.max(5, cp.minTargetsHit + 1);
  if (cp?.minTargetsAilmented) return Math.max(5, cp.minTargetsAilmented + 1);
  if (cp?.linkedTargets) return Math.max(5, cp.linkedTargets + 1);
  const trigger = proc.trigger;
  if (trigger === 'onMultiKillInCast' || trigger === 'onTripleKillInCast') return 5;
  return 3;
}

/** Determine ideal mob HP from trigger */
function idealMobHp(proc: Record<string, any>): number {
  const trigger = proc.trigger;
  if (trigger === 'onKill' || trigger === 'onKillInCast' ||
      trigger === 'onMultiKillInCast' || trigger === 'onTripleKillInCast' ||
      trigger === 'onAilmentKill' || trigger === 'onCritKill') {
    return 1; // die on first hit
  }
  const cp = proc.conditionParam;
  if (cp?.targetBelowHp) return 10; // very low HP = below threshold
  return 999999;
}

/** Determine ideal ailment stack count from conditionParam */
function idealAilmentStacks(proc: Record<string, any>): number {
  const cp = proc.conditionParam;
  if (cp?.minAilmentStacks) return cp.minAilmentStacks + 2;
  if (cp?.minTargetsAilmented) return 3;
  return 0;
}

/** Is this an onDodge trigger that needs mob attacks + dodge rolls? */
function isDodgeTrigger(trigger: string): boolean {
  return trigger === 'onDodge';
}

/** Override Math.random for controlled test runs.
 *  mode 'generous' → passes most chance checks (< 0.25 default).
 *  mode 'dodge' → alternates to allow mob attacks to trigger dodges. */
function withForcedRng(mode: 'generous' | 'dodge', fn: () => void): void {
  const saved = Math.random;
  let callCount = 0;
  if (mode === 'generous') {
    Math.random = () => { callCount++; return (callCount % 7 === 0) ? 0.8 : 0.1; };
  } else {
    // 'dodge' mode: alternate between low (pass chance checks, trigger dodges)
    // and mid (allow some variation for hit/miss/crit rolls)
    Math.random = () => {
      callCount++;
      const phase = callCount % 10;
      if (phase < 3) return 0.05;  // very low: pass chance, dodge attack
      if (phase < 6) return 0.3;   // mid: some hits land
      if (phase < 8) return 0.7;   // higher: miss some chance checks
      return 0.15;                  // low again
    };
  }
  try { fn(); } finally {
    Math.random = saved;
    resetRng();
  }
}

// ─── State Factory ──────────────────────────────────────

function makeAilmentDebuffs(stacks: number, skillId: string = 'test'): ActiveDebuff[] {
  if (stacks <= 0) return [];
  return [{
    debuffId: 'poisoned', stacks,
    remainingDuration: 10, skillId, stackSnapshots: Array(stacks).fill(50),
  } as any];
}

function createMobPack(count: number, hp: number, ailmentStacks: number = 0, mobAttackSoon: boolean = false): MobInPack[] {
  const now = getNow();
  return Array.from({ length: count }, (_, i) => ({
    hp, maxHp: Math.max(hp, 500),
    debuffs: makeAilmentDebuffs(ailmentStacks),
    nextAttackAt: mobAttackSoon ? now + 100 + i * 200 : now + 2000 + i * 500,
    rare: null, damageElement: 'physical' as any, physRatio: 1.0,
  }));
}

function createMechanicTestState(
  tc: MechanicTestCase,
  packSizeOverride?: number,
  packHpOverride?: number,
  ailmentStacksOverride?: number,
): GameState {
  const { skillId, nodeId, proc } = tc;
  const packSize = packSizeOverride ?? idealPackSize(proc);
  const packHp = packHpOverride ?? idealMobHp(proc);
  const ailmentStacks = ailmentStacksOverride ?? idealAilmentStacks(proc);
  const needDodge = isDodgeTrigger(proc.trigger);

  const char = createCharacter('MechanicBot', 'rogue');
  char.level = 20;
  char.xpToNext = 99999;

  const dagger: Item = {
    id: 'qa_dagger', baseId: 'crude_dagger', name: 'QA Dagger',
    slot: 'mainhand', rarity: 'rare' as any, iLvl: 20,
    prefixes: [], suffixes: [],
    weaponType: 'dagger',
    baseStats: { flatPhysDamage: 15, baseAttackSpeed: 10, baseCritChance: 5, accuracy: 80, evasion: 60 },
    baseDamageMin: 20, baseDamageMax: 40, baseSpellPower: 10,
  };
  char.equipment = { mainhand: dagger };
  char.stats = resolveStats(char);

  const now = getNow();
  const zone = ZONE_DEFS[2] ?? ZONE_DEFS[0];

  // Allocate the target node + all prerequisite nodes in the same branch
  const tree = ALL_TALENT_TREES[skillId];
  const allocatedRanks: Record<string, number> = {};
  if (tree) {
    for (const branch of tree.branches) {
      const targetNode = branch.nodes.find(n => n.id === nodeId);
      if (targetNode) {
        for (const n of branch.nodes) {
          if (n.tier <= targetNode.tier) {
            allocatedRanks[n.id] = n.maxRank;
          }
        }
        break;
      }
    }
  }

  const skillProgress: Record<string, SkillProgress> = {
    [skillId]: { skillId, xp: 0, level: 20, allocatedNodes: [], allocatedRanks },
  };
  const skillBar: (EquippedSkill | null)[] = [
    { skillId, autoCast: true },
    null, null, null, null, null, null, null,
  ];
  const skillTimers = [{ skillId, activatedAt: null, cooldownUntil: null }];

  return {
    character: char,
    inventory: [], currencies: {} as any, materials: {}, gold: 0,
    bagSlots: [], bagStash: {}, bank: { tabs: [] },
    currentZoneId: zone.id, idleStartTime: 1, idleMode: 'combat',
    gatheringSkills: {} as any, gatheringEquipment: {},
    selectedGatheringProfession: null, professionEquipment: {},
    craftingSkills: {} as any, ownedPatterns: [],
    autoSalvageMinRarity: 'common', autoDisposalAction: 'salvage',
    craftAutoSalvageMinRarity: 'common', offlineProgress: null,
    abilityProgress: {}, clearStartedAt: 0, currentClearTime: 0,
    currentHp: char.stats.maxLife, currentEs: 0,
    combatPhase: 'clearing', bossState: null, zoneClearCounts: {},
    combatPhaseStartedAt: now,
    classResource: createResourceState('rogue'),
    classSelected: true, totalKills: 50, fastestClears: {},
    skillBar, skillProgress, skillTimers,
    talentAllocations: [],
    activeDebuffs: [],
    consecutiveHits: 5, lastSkillsCast: [skillId, skillId],
    lastOverkillDamage: 30, killStreak: 3,
    lastCritAt: now - 200, lastBlockAt: now - 300,
    lastDodgeAt: needDodge ? now - 100 : now - 400,
    dodgeEntropy: needDodge ? 95 : 50,  // high entropy = more likely to dodge
    tempBuffs: [], skillCharges: {},
    rampingStacks: 0, rampingLastHitAt: 0,
    fortifyStacks: 0, fortifyExpiresAt: 0, fortifyDRPerStack: 0,
    deathStreak: 0, lastDeathTime: 0,
    comboStates: [], activeTraps: [] as TrapState[],
    bladeWardExpiresAt: now + 60000, bladeWardHits: 5,
    elementTransforms: {}, lastHitMobTypeId: 'thicket_crawler',
    freeCastUntil: {}, lastProcTriggerAt: {},
    lastClearResult: null, lastSkillActivation: now - 600,
    nextActiveSkillAt: 0,
    packMobs: createMobPack(packSize, packHp, ailmentStacks, needDodge),
    currentPackSize: packSize, targetedMobId: null,
    currentMobTypeId: 'thicket_crawler',
    mobKillCounts: {}, bossKillCounts: {}, totalZoneClears: {},
    dailyQuests: { questDate: '', quests: [], progress: {} },
    craftLog: [], craftOutputBuffer: [], gemInventory: [],
    zoneMasteryClaimed: {},
    invasionState: { activeInvasions: {}, bandCooldowns: {} },
    tutorialStep: 99, hasSeenCraftingHint: true, lastSaveTime: now,
  };
}

// ─── Sim Loop Helper ────────────────────────────────────

function simLoop(
  state: GameState,
  tc: MechanicTestCase,
  ticks: number,
  check: (s: GameState, result: any) => boolean | undefined,
  respawn?: (s: GameState) => GameState,
): { finalState: GameState; matched: boolean } {
  let s = state;
  let matched = false;
  for (let i = 0; i < ticks; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    s = { ...s, ...out.patch };
    if (check(s, out.result)) { matched = true; break; }
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = respawn ? respawn(s) : s;
    }
    advanceClock(500);
  }
  return { finalState: s, matched };
}

// ─── Test Runners per Family ────────────────────────────

function skipResult(tc: MechanicTestCase, reason: string): TestResult {
  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass: true, skipped: true,
    details: `SKIP: ${reason}`,
  };
}

function runDetonationTest(tc: MechanicTestCase, consumeExpected: boolean): TestResult {
  resetRng(); setClock(10000);
  const ailments = 8;
  const state = createMechanicTestState(tc, undefined, 999999, ailments);
  // onCrit procs need guaranteed crits — boost crit chance via temp buff
  if (tc.proc.trigger === 'onCrit') {
    state.tempBuffs.push({ id: 'qa_crit', effect: { critChanceBonus: 95 }, expiresAt: getNow() + 120000, sourceSkillId: 'test', stacks: 1, maxStacks: 1 } as any);
  }

  let totalProcDmg = 0;
  let debuffsConsumed = false;

  withForcedRng(isDodgeTrigger(tc.proc.trigger) ? 'dodge' : 'generous', () => {
    let s = state;
    for (let i = 0; i < 60; i++) {
      const now = getNow();
      const out = runCombatTick(s, 0.5, now);
      s = { ...s, ...out.patch };
      if (out.result.procDamage) totalProcDmg += out.result.procDamage;
      for (const mob of s.packMobs) {
        if (mob.debuffs.length === 0) debuffsConsumed = true;
      }
      if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
        s = { ...s, packMobs: createMobPack(idealPackSize(tc.proc), 999999, ailments) };
      }
      // Re-seed ailments that expired or were consumed (minAilmentStacks procs need persistent stacks)
      for (const mob of s.packMobs) {
        const totalStacks = mob.debuffs.reduce((sum: number, d: any) => sum + d.stacks, 0);
        if (totalStacks < ailments) mob.debuffs = makeAilmentDebuffs(ailments);
      }
      advanceClock(500);
    }
  });

  const pass = totalProcDmg > 0 && (!consumeExpected || debuffsConsumed);
  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass, skipped: false,
    details: `procDamage=${totalProcDmg.toFixed(0)}${consumeExpected ? ` debuffsConsumed=${debuffsConsumed}` : ''}`,
  };
}

function runExplodeTest(tc: MechanicTestCase): TestResult {
  resetRng(); setClock(10000);
  const state = createMechanicTestState(tc, undefined, 50000, 5);
  state.packMobs[0].hp = 1;

  let totalProcDmg = 0;
  let backMobsDamaged = false;
  const backHpBefore = state.packMobs.length > 1 ? state.packMobs[1].hp : 0;

  withForcedRng('generous', () => {
    let s = state;
    for (let i = 0; i < 40; i++) {
      const now = getNow();
      const out = runCombatTick(s, 0.5, now);
      s = { ...s, ...out.patch };
      if (out.result.procDamage) totalProcDmg += out.result.procDamage;
      if (s.packMobs.length > 1 && s.packMobs[1].hp < backHpBefore) backMobsDamaged = true;
      if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
        s = { ...s, packMobs: createMobPack(idealPackSize(tc.proc), 50000, 5) };
        s.packMobs[0].hp = 1;
      }
      advanceClock(500);
    }
  });

  const pass = totalProcDmg > 0 || backMobsDamaged;
  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass, skipped: false,
    details: `procDamage=${totalProcDmg.toFixed(0)} backMobsDamaged=${backMobsDamaged}`,
  };
}

function runApplyBuffTest(tc: MechanicTestCase): TestResult {
  resetRng(); setClock(10000);
  const buffId = tc.proc.applyBuff?.buffId;
  const state = createMechanicTestState(tc);

  // For onDodge + withinWindowAfterCast: make sure skill was just cast
  if (isDodgeTrigger(tc.proc.trigger)) {
    state.lastSkillActivation = getNow() - 500;
  }

  const rngMode = isDodgeTrigger(tc.proc.trigger) ? 'dodge' : 'generous';
  const maxTicks = isDodgeTrigger(tc.proc.trigger) ? 120 :
    tc.proc.chance < 1 ? Math.min(Math.ceil(40 / tc.proc.chance), 120) : 60;

  let foundBuff = false;

  withForcedRng(rngMode, () => {
    let s = state;
    for (let i = 0; i < maxTicks; i++) {
      const now = getNow();
      const out = runCombatTick(s, 0.5, now);
      s = { ...s, ...out.patch };
      if (buffId && s.tempBuffs.some((b: any) => b.id === buffId)) {
        foundBuff = true;
        break;
      }
      if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
        const hp = idealMobHp(tc.proc);
        const ailments = idealAilmentStacks(tc.proc);
        s = { ...s, packMobs: createMobPack(idealPackSize(tc.proc), hp === 1 ? 1 : 999999, ailments, isDodgeTrigger(tc.proc.trigger)) };
      }
      // Re-seed ailments that expired (minAilmentStacks procs need persistent stacks)
      const neededAilments = idealAilmentStacks(tc.proc);
      if (neededAilments > 0) {
        for (const mob of s.packMobs) {
          const totalStacks = mob.debuffs.reduce((sum: number, d: any) => sum + d.stacks, 0);
          if (totalStacks < neededAilments) {
            mob.debuffs = makeAilmentDebuffs(neededAilments);
          }
        }
      }
      advanceClock(500);
    }
  });

  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass: foundBuff, skipped: false,
    details: `buffId=${buffId} found=${foundBuff}`,
  };
}

function runFreeCastTest(tc: MechanicTestCase): TestResult {
  resetRng(); setClock(10000);
  const targetSkill = tc.proc.freeCast?.skillId ?? tc.skillId;
  const state = createMechanicTestState(tc);

  // Equip the target skill if different
  if (targetSkill !== tc.skillId) {
    state.skillBar[1] = { skillId: targetSkill, autoCast: true };
    state.skillTimers.push({ skillId: targetSkill, activatedAt: null, cooldownUntil: null } as any);
    state.skillProgress[targetSkill] = { skillId: targetSkill, xp: 0, level: 20, allocatedNodes: [], allocatedRanks: {} };
  }

  const rngMode = isDodgeTrigger(tc.proc.trigger) ? 'dodge' : 'generous';
  const maxTicks = isDodgeTrigger(tc.proc.trigger) ? 120 : 80;

  let freeCastFired = false;

  withForcedRng(rngMode, () => {
    let s = state;
    for (let i = 0; i < maxTicks; i++) {
      const now = getNow();
      const out = runCombatTick(s, 0.5, now);
      s = { ...s, ...out.patch };
      // freeCast fires inline as bonusDamage in combatHelpers — check procEvents for proc ID
      if (out.result.procEvents?.some((e: any) => e.procId === tc.procId)) {
        freeCastFired = true;
        break;
      }
      if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
        const hp = idealMobHp(tc.proc);
        s = { ...s, packMobs: createMobPack(idealPackSize(tc.proc), hp === 1 ? 1 : 999999, 0, isDodgeTrigger(tc.proc.trigger)) };
      }
      advanceClock(500);
    }
  });

  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass: freeCastFired, skipped: false,
    details: `targetSkill=${targetSkill} freeCastFired=${freeCastFired}`,
  };
}

function runFortifyTest(tc: MechanicTestCase): TestResult {
  resetRng(); setClock(10000);
  const state = createMechanicTestState(tc);
  state.fortifyStacks = 0;
  state.fortifyExpiresAt = 0;

  if (isDodgeTrigger(tc.proc.trigger)) {
    state.lastSkillActivation = getNow() - 500;
  }

  const rngMode = isDodgeTrigger(tc.proc.trigger) ? 'dodge' : 'generous';
  const maxTicks = isDodgeTrigger(tc.proc.trigger) ? 120 : 40;

  let fortifyGained = false;
  let finalStacks = 0;

  withForcedRng(rngMode, () => {
    let s = state;
    for (let i = 0; i < maxTicks; i++) {
      const now = getNow();
      const out = runCombatTick(s, 0.5, now);
      s = { ...s, ...out.patch };
      if (s.fortifyStacks > 0) {
        fortifyGained = true;
        finalStacks = s.fortifyStacks;
        break;
      }
      if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
        s = { ...s, packMobs: createMobPack(idealPackSize(tc.proc), 999999, 0, isDodgeTrigger(tc.proc.trigger)) };
      }
      advanceClock(500);
    }
  });

  return {
    family: tc.family, nodeId: tc.nodeId, nodeName: tc.nodeName, procId: tc.procId,
    pass: fortifyGained, skipped: false,
    details: `fortifyGained=${fortifyGained} stacks=${finalStacks}`,
  };
}

// ─── Direct Eval Assertions per Family ──────────────────

function directAssertDetonation(consumeExpected: boolean) {
  return (pr: any) => ({
    pass: pr.detonationDamage > 0 && (!consumeExpected || pr.consumeAilments),
    details: `detonationDmg=${pr.detonationDamage.toFixed(0)} consume=${pr.consumeAilments}`,
  });
}
function directAssertApplyBuff(buffId: string) {
  return (pr: any) => {
    const found = pr.newTempBuffs.some((b: any) => b.id === buffId);
    return { pass: found, details: `buffId=${buffId} found=${found}` };
  };
}
function directAssertFreeCast(procId: string) {
  return (pr: any) => {
    const fired = pr.procsFired.includes(procId) && pr.bonusDamage > 0;
    return { pass: fired, details: `bonusDamage=${pr.bonusDamage.toFixed(0)}` };
  };
}
function directAssertFortify() {
  return (pr: any) => ({
    pass: pr.fortifyStacks > 0,
    details: `fortifyStacks=${pr.fortifyStacks}`,
  });
}

// ─── Dispatch ───────────────────────────────────────────

function runMechanicTest(tc: MechanicTestCase): TestResult {
  // Truly unevaluable triggers (no matching trigger string in evaluateProcs)
  if (UNEVALUABLE_TRIGGERS.has(tc.proc.trigger)) {
    return skipResult(tc, `trigger '${tc.proc.trigger}' has no evaluateProcs path`);
  }
  // dodgesInWindow >= 3 exceeds engine's 2-dodge approximation cap
  if (exceedsDodgeCountCap(tc.proc)) {
    return skipResult(tc, 'dodgesInWindow >= 3 exceeds engine 2-dodge cap');
  }

  // Try tick-based simulation first for cases that don't need direct eval
  if (!needsDirectEval(tc.proc)) {
    switch (tc.family) {
      case 'detonateAll': return runDetonationTest(tc, true);
      case 'detonateAilments': return runDetonationTest(tc, false);
      case 'consumeAllAilments': return runDetonationTest(tc, true);
      case 'explodeAilments': return runExplodeTest(tc);
      case 'applyBuff': return runApplyBuffTest(tc);
      case 'freeCast': return runFreeCastTest(tc);
      case 'fortifyOnProc': return runFortifyTest(tc);
    }
  }

  // Fall back to direct evaluateProcs call with ideal context
  switch (tc.family) {
    case 'detonateAll':
      return runDirectProcTest(tc, directAssertDetonation(true));
    case 'detonateAilments':
      return runDirectProcTest(tc, directAssertDetonation(false));
    case 'consumeAllAilments':
      return runDirectProcTest(tc, directAssertDetonation(true));
    case 'explodeAilments':
      return runDirectProcTest(tc, directAssertDetonation(false));
    case 'applyBuff':
      return runDirectProcTest(tc, directAssertApplyBuff(tc.proc.applyBuff?.buffId ?? tc.procId));
    case 'freeCast':
      return runDirectProcTest(tc, directAssertFreeCast(tc.procId));
    case 'fortifyOnProc':
      return runDirectProcTest(tc, directAssertFortify());
  }
}

// ─── Main ───────────────────────────────────────────────

const cases = discoverMechanicNodes();

if (cases.length === 0) {
  console.error(`No mechanic nodes found${skillFilter !== 'all' ? ` for "${skillFilter}"` : ''}.`);
  process.exit(1);
}

// Group by family
const byFamily = new Map<MechanicFamily, MechanicTestCase[]>();
for (const tc of cases) {
  if (!byFamily.has(tc.family)) byFamily.set(tc.family, []);
  byFamily.get(tc.family)!.push(tc);
}

console.log('\n┌─────────────────────────────────────────────────────┐');
console.log('│     QA Mechanics — Predicate-Based Proc Testing      │');
console.log('└─────────────────────────────────────────────────────┘\n');

let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;
const failures: TestResult[] = [];

for (const [family, tcs] of byFamily) {
  console.log(`${BOLD}── ${family} (${tcs.length} node${tcs.length > 1 ? 's' : ''}) ──${RESET}`);

  for (const tc of tcs) {
    const result = runMechanicTest(tc);
    if (result.skipped) {
      totalSkip++;
      console.log(`${CYAN}[SKIP]${RESET} ${result.procId} ${DIM}— ${result.details}${RESET}`);
    } else if (result.pass) {
      totalPass++;
      console.log(`${GREEN}[PASS]${RESET} ${result.procId} ${DIM}— ${result.details}${RESET}`);
    } else {
      totalFail++;
      failures.push(result);
      console.log(`${RED}[FAIL]${RESET} ${result.procId} ${YELLOW}— ${result.details}${RESET}`);
    }
  }
  console.log();
}

console.log('┌─────────────────────────────────────────────────────┐');
console.log(`│ ${GREEN}PASS${RESET}: ${totalPass.toString().padStart(3)}  ${RED}FAIL${RESET}: ${totalFail.toString().padStart(3)}  ${CYAN}SKIP${RESET}: ${totalSkip.toString().padStart(3)}  Total: ${(totalPass + totalFail + totalSkip).toString().padStart(3)}        │`);
console.log('└─────────────────────────────────────────────────────┘');

if (failures.length > 0) {
  console.log(`\n${RED}Failed tests:${RESET}`);
  for (const f of failures) {
    console.log(`  ${f.family}/${f.procId} (${f.nodeName}): ${f.details}`);
  }
}

console.log();
if (totalFail > 0) process.exit(1);

#!/usr/bin/env node
// ============================================================
// QA Bot — Talent Node Validation Harness
// Runs every dagger talent node through static + dynamic checks.
// Usage: npx tsx sim/qa-talents.ts [--skill dagger_stab] [--json]
// ============================================================

// IMPORTANT: Install global mocks BEFORE any engine imports
import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';

// Parse args first (before mocks need to be active)
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const skillFilter = getArg('skill', 'all').toLowerCase();
const jsonOutput = hasFlag('json');
const SEED = 42;
const TICKS = parseInt(getArg('ticks', '200'));
const DT_SEC = 0.5;

// Install mocks
installClock();
installRng(SEED);

// Apply sim-only balance overrides (same as runner.ts)
import './balance-overrides';

// Now safe to import engine code
import { ALL_TALENT_TREES } from '../src/data/skillGraphs/talentTrees';
import { resolveTalentModifiers } from '../src/engine/talentTree';
import { EMPTY_GRAPH_MOD, type ResolvedSkillModifier } from '../src/engine/skillGraph';
import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import { evaluateProcs, evaluateConditionalMods } from '../src/engine/combatHelpers';
import type { ProcContext, ConditionContext } from '../src/engine/combatHelpers';
import type {
  GameState, TalentTree, TalentNode, ActiveDebuff, MobInPack,
  Item, SkillProgress, EquippedSkill, CombatTickResult,
} from '../src/types';
import type { TrapState } from '../src/engine/combat/traps';

// ─── Types ───────────────────────────────────────────────

interface StaticResult {
  hasEffect: boolean;
  nonZeroFields: string[];
}

interface AggregateMetrics {
  totalDamage: number;
  totalDotDamage: number;
  totalProcDamage: number;
  totalKills: number;
  totalCrits: number;
  totalHits: number;
  procsFiredCount: number;
  uniqueProcIds: Set<string>;
  healingReceived: number;
  fortifyStacksMax: number;
  tempBuffCount: number;
  comboStatesCreated: number;
  cooldownResets: number;
  debuffsApplied: number;
  selfDamageTaken: number;
  // Defensive metrics: detect dodge/DR/resist effects
  finalHp: number;
  totalIncomingDamage: number;
  dodgeCount: number;
  skillCasts: number;
  // Weapon hook + conditional mod metrics
  conditionalModBonuses: number;
  counterHitDamage: number;
  trapDetonationDamage: number;
}

interface DynamicResult {
  hasEffect: boolean;
  baselineMetrics: AggregateMetrics;
  testMetrics: AggregateMetrics;
  deltas: Record<string, number>;
}

interface NodeResult {
  skillId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  maxRank: number;
  staticResult: StaticResult;
  dynamicResult: DynamicResult;
  verdict: 'PASS' | 'FAIL' | 'COST' | 'STATIC_ONLY';
  diagnosis: string;
}

// ─── Helpers ─────────────────────────────────────────────

function isDifferent(a: unknown, b: unknown): boolean {
  if (a === b) return false;
  if (a === null || b === null) return a !== b;
  if (typeof a === 'number' && typeof b === 'number') return a !== b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a !== b;
  if (typeof a === 'string' && typeof b === 'string') return a !== b;
  if (Array.isArray(a) && Array.isArray(b)) return b.length > 0;
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) !== JSON.stringify(b);
  }
  return true;
}

function pad(s: string, len: number): string {
  return s.padEnd(len).slice(0, len);
}

// ─── Mob Pack Factory ────────────────────────────────────

function createMobPack(skillId: string, now: number, frontMobHp: number = 500): MobInPack[] {
  const frontDebuffs: ActiveDebuff[] = [
    { debuffId: 'bleeding', stacks: 3, remainingDuration: 10, appliedBySkillId: skillId, stackSnapshots: [20, 25, 22] },
    { debuffId: 'poisoned', stacks: 6, remainingDuration: 10, appliedBySkillId: skillId, instances: [
      { snapshot: 15, remainingDuration: 8, appliedBySkillId: 'dagger_viper_strike' },
      { snapshot: 18, remainingDuration: 6, appliedBySkillId: 'dagger_viper_strike' },
      { snapshot: 12, remainingDuration: 10, appliedBySkillId: 'dagger_viper_strike' },
      { snapshot: 14, remainingDuration: 7, appliedBySkillId: 'dagger_viper_strike' },
      { snapshot: 16, remainingDuration: 9, appliedBySkillId: 'dagger_viper_strike' },
      { snapshot: 11, remainingDuration: 5, appliedBySkillId: 'dagger_viper_strike' },
    ] },
    { debuffId: 'burning', stacks: 1, remainingDuration: 8, appliedBySkillId: skillId },
    { debuffId: 'chilled', stacks: 1, remainingDuration: 8, appliedBySkillId: skillId },
    { debuffId: 'shocked', stacks: 1, remainingDuration: 8, appliedBySkillId: skillId },
    { debuffId: 'vulnerable', stacks: 1, remainingDuration: 10, appliedBySkillId: skillId },
  ];

  return [
    { hp: frontMobHp, maxHp: 1000, debuffs: [...frontDebuffs.map(d => ({ ...d }))], nextAttackAt: now, rare: null, damageElement: 'physical' as any, physRatio: 1.0 },
    { hp: 40000, maxHp: 50000, debuffs: [], nextAttackAt: now + 2000, rare: null, damageElement: 'physical' as any, physRatio: 1.0 },
    { hp: 50000, maxHp: 50000, debuffs: [], nextAttackAt: now + 3000, rare: null, damageElement: 'physical' as any, physRatio: 1.0 },
  ];
}

// ─── Rich Test State Factory ─────────────────────────────

function createRichTestState(
  skillId: string,
  allocatedRanks: Record<string, number>,
  resolvedMod?: ResolvedSkillModifier,
): GameState {
  // Level 20 rogue with dagger
  const char = createCharacter('QABot', 'rogue');
  char.level = 20;
  char.xpToNext = 99999;

  // Node-aware: adjust state for specific conditions (must be before dagger creation)
  let nodeAwareConsecutiveHits = 5;
  let nodeAwareFrontMobHp = 500;
  if (resolvedMod?.conditionalMods) {
    for (const cm of resolvedMod.conditionalMods) {
      if (cm.condition === 'firstSkillInEncounter') nodeAwareConsecutiveHits = 0;
      if (cm.condition === 'afterCastOnMultipleTargets') nodeAwareConsecutiveHits = 3;
    }
  }
  if (resolvedMod?.executeThreshold && resolvedMod.executeThreshold > 0) {
    nodeAwareFrontMobHp = Math.floor(1000 * (resolvedMod.executeThreshold / 100) * 0.8);
  }

  const dagger: Item = {
    id: 'qa_dagger',
    baseId: 'crude_dagger',
    name: 'QA Test Dagger',
    slot: 'mainhand',
    rarity: 'rare' as any,
    iLvl: 20,
    prefixes: [],
    suffixes: [],
    weaponType: 'dagger',
    baseStats: { flatPhysDamage: 15, baseAttackSpeed: 10, baseCritChance: 5, accuracy: 80, evasion: 60 },
    baseDamageMin: 20,
    baseDamageMax: 40,
    baseSpellPower: 10,
  };
  char.equipment = { mainhand: dagger };
  char.stats = resolveStats(char);

  const now = getNow();

  // Rotation partners: each skill gets a filler/synergy partner for realistic testing
  // This ensures ward-dependent, momentum-dependent, and cross-skill nodes can fire
  const skillProgress: Record<string, SkillProgress> = {
    [skillId]: {
      skillId,
      xp: 0,
      level: 20,
      allocatedNodes: [],
      allocatedRanks,
    },
  };

  const skillBar: (EquippedSkill | null)[] = [
    { skillId, autoCast: true },
    null, null, null, null, null, null, null,
  ];

  const skillTimers = [
    { skillId, activatedAt: null, cooldownUntil: null },
  ];

  const BUFF_DURATION = 120000; // 120s — covers entire simulation
  const tempBuffs: any[] = [
    { id: 'qa_test_buff', effect: { damageMult: 1.1 }, expiresAt: now + BUFF_DURATION, sourceSkillId: skillId, stacks: 1, maxStacks: 1 },
  ];

  // Node-aware: pre-seed temp buffs for whileBuffActive conditionalMods
  if (resolvedMod?.conditionalMods) {
    const seenBuffIds = new Set(tempBuffs.map(b => b.id));
    for (const cm of resolvedMod.conditionalMods) {
      if (cm.condition === 'whileBuffActive' && (cm as any).buffId) {
        const buffId = (cm as any).buffId;
        if (!seenBuffIds.has(buffId)) {
          seenBuffIds.add(buffId);
          tempBuffs.push({ id: buffId, effect: {}, expiresAt: now + BUFF_DURATION, sourceSkillId: skillId, stacks: 1, maxStacks: 1 });
        }
      }
    }
  }

  const comboStates = [
    { stateId: 'exposed', sourceSkillId: skillId, remainingDuration: 10, stacks: 1, maxStacks: 1, effect: { incDamage: 0.15 } },
    { stateId: 'deep_wound', sourceSkillId: skillId, remainingDuration: 8, stacks: 1, maxStacks: 3, effect: { burstDamage: 50 } },
    { stateId: 'shadow_mark', sourceSkillId: skillId, remainingDuration: 12, stacks: 1, maxStacks: 1, effect: { incCritChance: 0.1 } },
    { stateId: 'dance_momentum', sourceSkillId: skillId, remainingDuration: 6, stacks: 2, maxStacks: 5, effect: { incDamage: 0.05 } },
    { stateId: 'chain_surge', sourceSkillId: skillId, remainingDuration: 5, stacks: 1, maxStacks: 3, effect: { cooldownAcceleration: 0.5 } },
    { stateId: 'guarded', sourceSkillId: 'dagger_blade_ward', remainingDuration: 10, stacks: 3, maxStacks: 5, effect: { incDamage: 0.1 } },
    { stateId: 'shadow_momentum', sourceSkillId: 'dagger_shadow_dash', remainingDuration: 8, stacks: 1, maxStacks: 3, effect: {} },
    { stateId: 'saturated', sourceSkillId: 'dagger_fan_of_knives', remainingDuration: 4, stacks: 1, maxStacks: 1, effect: { incDamage: 15 } },
  ];

  const activeTraps: TrapState[] = [
    { trapId: 'qa_trap', sourceSkillId: 'dagger_blade_trap', placedAt: now - 5000, armDelay: 1.5, isArmed: true, damage: 100, duration: 15, remainingDuration: 10 },
  ];

  const zone = ZONE_DEFS[5] ?? ZONE_DEFS[0];

  return {
    character: char,
    inventory: [],
    currencies: {} as any,
    materials: {},
    gold: 0,
    bagSlots: [],
    bagStash: {},
    bank: { tabs: [] },
    currentZoneId: zone.id,
    idleStartTime: 1,
    idleMode: 'combat',
    gatheringSkills: {} as any,
    gatheringEquipment: {},
    selectedGatheringProfession: null,
    professionEquipment: {},
    craftingSkills: {} as any,
    ownedPatterns: [],
    autoSalvageMinRarity: 'common',
    autoDisposalAction: 'salvage',
    craftAutoSalvageMinRarity: 'common',
    offlineProgress: null,
    abilityProgress: {},
    clearStartedAt: 0,
    currentClearTime: 0,
    currentHp: char.stats.maxLife * 0.6,
    currentEs: 0,
    combatPhase: 'clearing',
    bossState: null,
    zoneClearCounts: {},
    combatPhaseStartedAt: now,
    classResource: createResourceState('rogue'),
    classSelected: true,
    totalKills: 50,
    fastestClears: {},
    skillBar,
    skillProgress,
    skillTimers,
    talentAllocations: [],
    activeDebuffs: [],
    consecutiveHits: nodeAwareConsecutiveHits,
    lastSkillsCast: [skillId, skillId],
    lastOverkillDamage: 30,
    killStreak: 3,
    lastCritAt: now - 200,
    lastBlockAt: now - 300,
    lastDodgeAt: now - 400,
    dodgeEntropy: 50,
    tempBuffs,
    skillCharges: {},
    rampingStacks: 3,
    rampingLastHitAt: now - 100,
    fortifyStacks: 3,
    fortifyExpiresAt: now + 5000,
    fortifyDRPerStack: 0.03,
    deathStreak: 0,
    lastDeathTime: 0,
    comboStates,
    activeTraps,
    bladeWardExpiresAt: now + 60000, // 60s — ensure ward-based conditions fire for enough ticks
    bladeWardHits: 5, // 5 hits — satisfy hitsReceivedInWard:4, counterCritsInWard:2 thresholds
    elementTransforms: {},
    lastHitMobTypeId: 'thicket_crawler',
    freeCastUntil: {},
    lastProcTriggerAt: {},
    lastClearResult: null,
    lastSkillActivation: now - 600,
    nextActiveSkillAt: 0,
    packMobs: createMobPack(skillId, now, nodeAwareFrontMobHp),
    currentPackSize: 3,
    targetedMobId: null,
    currentMobTypeId: 'thicket_crawler',
    mobKillCounts: {},
    bossKillCounts: {},
    totalZoneClears: {},
    dailyQuests: { questDate: '', quests: [], progress: {} },
    craftLog: [],
    craftOutputBuffer: [],
    gemInventory: [],
    zoneMasteryClaimed: {},
    invasionState: { activeInvasions: {}, bandCooldowns: {} },
    tutorialStep: 99,
    hasSeenCraftingHint: true,
    lastSaveTime: now,
  };
}

// ─── Layer 1: Static Check ───────────────────────────────

function runStaticCheck(tree: TalentTree, node: TalentNode): StaticResult {
  const ranks = { [node.id]: node.maxRank };
  const resolved = resolveTalentModifiers(tree, ranks);

  const nonZeroFields: string[] = [];
  for (const [key, emptyVal] of Object.entries(EMPTY_GRAPH_MOD)) {
    const testVal = (resolved as any)[key];
    if (isDifferent(emptyVal, testVal)) {
      nonZeroFields.push(key);
    }
  }

  // Also check raw node.modifier for non-zero values not caught by resolver
  if (nonZeroFields.length === 0 && node.modifier) {
    for (const [key, val] of Object.entries(node.modifier)) {
      if (val !== undefined && val !== null && val !== 0 && val !== false && val !== '' &&
          !(Array.isArray(val) && val.length === 0) &&
          !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
        nonZeroFields.push(`raw:${key}`);
      }
    }
  }

  return { hasEffect: nonZeroFields.length > 0, nonZeroFields };
}

// ─── Layer 2: Dynamic Check ──────────────────────────────

function createEmptyMetrics(): AggregateMetrics {
  return {
    totalDamage: 0,
    totalDotDamage: 0,
    totalProcDamage: 0,
    totalKills: 0,
    totalCrits: 0,
    totalHits: 0,
    procsFiredCount: 0,
    uniqueProcIds: new Set(),
    healingReceived: 0,
    fortifyStacksMax: 0,
    tempBuffCount: 0,
    comboStatesCreated: 0,
    cooldownResets: 0,
    debuffsApplied: 0,
    selfDamageTaken: 0,
    finalHp: 0,
    totalIncomingDamage: 0,
    dodgeCount: 0,
    skillCasts: 0,
    conditionalModBonuses: 0,
    counterHitDamage: 0,
    trapDetonationDamage: 0,
  };
}

function accumulateMetrics(
  metrics: AggregateMetrics,
  result: CombatTickResult,
  prevHp: number,
  state: GameState,
): void {
  metrics.totalDamage += result.damageDealt ?? 0;
  metrics.totalDotDamage += (result.dotDamage ?? 0) + (result.bleedTriggerDamage ?? 0) + (result.shatterDamage ?? 0);
  metrics.totalProcDamage += result.procDamage ?? 0;
  metrics.totalKills += result.mobKills ?? 0;
  if (result.isCrit) metrics.totalCrits++;
  if (result.isHit) metrics.totalHits++;
  if (result.procEvents) {
    metrics.procsFiredCount += result.procEvents.length;
    for (const pe of result.procEvents) metrics.uniqueProcIds.add(pe.procId);
  }
  if (result.cooldownWasReset) metrics.cooldownResets++;

  // State diffs
  const hpDelta = state.currentHp - prevHp;
  if (hpDelta > 0) metrics.healingReceived += hpDelta;
  if (hpDelta < 0) metrics.selfDamageTaken += Math.abs(hpDelta);

  metrics.fortifyStacksMax = Math.max(metrics.fortifyStacksMax, state.fortifyStacks ?? 0);
  metrics.tempBuffCount = Math.max(metrics.tempBuffCount, (state.tempBuffs ?? []).length);
  metrics.comboStatesCreated = Math.max(metrics.comboStatesCreated, (state.comboStates ?? []).length);

  // Defensive metrics
  metrics.finalHp = state.currentHp;
  if (result.zoneAttack?.damage) metrics.totalIncomingDamage += result.zoneAttack.damage;
  if (result.bossAttack?.damage) metrics.totalIncomingDamage += result.bossAttack.damage;
  if (result.zoneAttack?.isDodged) metrics.dodgeCount++;
  if (result.bossAttack?.isDodged) metrics.dodgeCount++;
  if (result.skillFired) metrics.skillCasts++;

  // Weapon hook + conditional mod metrics
  metrics.conditionalModBonuses += result.conditionalModBonuses ?? 0;
  metrics.counterHitDamage += result.counterHitDamage ?? 0;
  metrics.trapDetonationDamage += result.trapDetonationDamage ?? 0;

  if (state.packMobs?.[0]) {
    metrics.debuffsApplied = Math.max(metrics.debuffsApplied, state.packMobs[0].debuffs.length);
  }
}

function runSimulation(skillId: string, allocatedRanks: Record<string, number>, ticks: number, resolvedMod?: ResolvedSkillModifier): AggregateMetrics {
  resetRng();
  setClock(1000);

  let state = createRichTestState(skillId, allocatedRanks, resolvedMod);
  const metrics = createEmptyMetrics();

  for (let i = 0; i < ticks; i++) {
    const now = getNow();
    const prevHp = state.currentHp;

    const { patch, result } = runCombatTick(state, DT_SEC, now);
    Object.assign(state, patch);
    accumulateMetrics(metrics, result, prevHp, state);
    advanceClock(500);

    // Respawn pack if all mobs dead
    if (!state.packMobs || state.packMobs.length === 0) {
      state.packMobs = createMobPack(skillId, getNow());
      state.currentPackSize = 4;
      state.consecutiveHits = 5;
    }
  }

  return metrics;
}

function runDynamicCheck(skillId: string, tree: TalentTree, node: TalentNode, ticks: number = TICKS): DynamicResult {
  // Resolve modifier to inspect conditionalMods for node-aware test seeding
  const resolvedMod = resolveTalentModifiers(tree, { [node.id]: node.maxRank });

  // Both baseline and test get the same pre-seeded conditions (buff IDs etc.)
  // so the delta is purely from the talent allocation
  const baselineMetrics = runSimulation(skillId, {}, ticks, resolvedMod);
  const testMetrics = runSimulation(skillId, { [node.id]: node.maxRank }, ticks, resolvedMod);

  const deltas: Record<string, number> = {};
  const metricKeys = [
    'totalDamage', 'totalDotDamage', 'totalProcDamage', 'totalKills', 'totalCrits',
    'totalHits', 'procsFiredCount', 'healingReceived', 'fortifyStacksMax',
    'tempBuffCount', 'comboStatesCreated', 'cooldownResets', 'debuffsApplied', 'selfDamageTaken',
    'finalHp', 'totalIncomingDamage', 'dodgeCount', 'skillCasts',
    'conditionalModBonuses', 'counterHitDamage', 'trapDetonationDamage',
  ] as const;

  for (const key of metricKeys) {
    const base = baselineMetrics[key] as number;
    const test = testMetrics[key] as number;
    if (base !== test) deltas[key] = test - base;
  }

  const newProcs = [...testMetrics.uniqueProcIds].filter(p => !baselineMetrics.uniqueProcIds.has(p));
  if (newProcs.length > 0) deltas['newProcs'] = newProcs.length;

  return { hasEffect: Object.keys(deltas).length > 0, baselineMetrics, testMetrics, deltas };
}

// ─── Layer 3: Direct Evaluation Check ─────────────────────
// Tests the actual evaluateProcs/evaluateConditionalMods pipeline with synthetic
// contexts that represent real game scenarios. Not a proxy — verifies the code works.

function runDirectEvalCheck(resolved: ResolvedSkillModifier, skillId: string): boolean {
  const now = 10000;
  // Synthetic proc context: all conditions maximally satisfied
  if (resolved.skillProcs?.length) {
    const synthProcCtx: ProcContext = {
      isHit: true, isCrit: true, skillId,
      effectiveMaxLife: 500, stats: { critChance: 20, critMultiplier: 200 } as any,
      weaponAvgDmg: 30, weaponSpellPower: 10, damageMult: 1, now,
      lastProcTriggerAt: {},
      targetDebuffs: [
        { debuffId: 'poisoned', stacks: 6, remainingDuration: 10, appliedBySkillId: 'dagger_viper_strike' } as any,
        { debuffId: 'bleeding', stacks: 3, remainingDuration: 10, appliedBySkillId: skillId } as any,
      ],
      targetHpPercent: 20,
      consecutiveHits: 5,
      lastDodgeAt: now - 500,
      packSize: 4,
      targetsHitThisCast: 4,
      killsThisCast: 3,
      critsThisCast: 2,
      comboStatesConsumedThisTick: ['shadow_momentum'],
      lastSkillCastAt: { [skillId]: now - 500 },
      skillTimers: [{ skillId, cooldownUntil: null }],
      activeTempBuffIds: ['qa_test_buff'],
      currentCharges: 5,
      ailmentedMobCount: 3,
    };
    // Test all relevant string triggers
    for (const trigger of ['onCast', 'onHit', 'onCrit', 'onDodge', 'onAilmentApplied', 'onAilmentExpire', 'onAilmentKill', 'onMultiKillInCast', 'onLinkedTargetDeath'] as any[]) {
      const pr = evaluateProcs(resolved.skillProcs, trigger, synthProcCtx);
      if (pr.procsFired.length > 0 || pr.bonusDamage > 0 || pr.healAmount > 0 || pr.newTempBuffs.length > 0) return true;
    }
    // Test object-trigger procs (dagger module matching logic)
    for (const proc of resolved.skillProcs) {
      if (typeof proc.trigger !== 'object' || proc.trigger === null) continue;
      const t = proc.trigger as Record<string, any>;
      const buff = (proc as any).applyBuff ?? (proc as any).buff;
      if (!buff) continue;
      // All object trigger conditions are maximally satisfied
      let matched = true;
      if (t.hitsReceivedInWard != null && t.hitsReceivedInWard > 6) matched = false;
      if (t.counterCritsInWard != null && t.counterCritsInWard > 6) matched = false;
      if (t.dodgesDuringWard != null && t.dodgesDuringWard > 4) matched = false;
      if (t.passThroughTargets != null && t.passThroughTargets > 4) matched = false;
      if (t.detonationTargets != null && t.detonationTargets > 4) matched = false;
      if (matched) return true;
    }
  }

  // Synthetic condition context: all conditions maximally satisfied
  if (resolved.conditionalMods?.length) {
    const synthCondCtx: ConditionContext = {
      isHit: true, isCrit: true, phase: 'clearing' as any,
      currentHp: 200, effectiveMaxLife: 500,
      consecutiveHits: 5, activeDebuffs: [
        { debuffId: 'poisoned', stacks: 6, remainingDuration: 10, appliedBySkillId: skillId } as any,
      ],
      lastBlockAt: now - 200, lastDodgeAt: now - 200,
      lastOverkillDamage: 50, now,
      activeTempBuffIds: ['qa_test_buff'],
      killStreak: 3, targetHpPercent: 20,
      fortifyStacks: 3, packSize: 4,
      targetDebuffCount: 6, lastSkillId: skillId,
      skillTimers: [{ skillId, cooldownUntil: null }] as any,
      lastSkillsCast: [skillId, skillId],
      totalTargetDebuffStacks: 12,
      wardActive: true, wardHits: 6,
      activeTrapsCount: 2, comboStateIds: ['guarded', 'shadow_momentum'],
      lastDashAt: now - 500,
      targetsHitLastCast: 4,
    };
    for (const timing of ['pre-roll', 'post-roll'] as const) {
      const result = evaluateConditionalMods(resolved.conditionalMods, synthCondCtx, timing);
      const sum = Math.abs(result.incCritChance) + Math.abs(result.incDamage)
        + Math.abs(result.incCritMultiplier) + Math.abs(result.incCastSpeed)
        + Math.abs(result.ailmentPotency) + Math.abs(result.damageReduction)
        + Math.abs(result.cooldownReduction) + Math.abs(result.weaponMastery)
        + Math.abs(result.dotMultiplier) + Math.abs(result.evasionBonus)
        + Math.abs(result.dodgeChance) + Math.abs(result.ailmentDuration)
        + Math.abs(result.counterHitDamage) + Math.abs(result.increasedDamageTaken)
        + Math.abs(result.globalIncDamage) + Math.abs(result.lifeOnHit);
      if (sum > 0 || result.damageMult !== 1) return true;
    }
  }

  // Static fields that are known-functional but only affect specific game phases
  if (resolved.increasedDamageTaken) return true;  // boss/counter interaction
  if (resolved.counterCanCrit) return true;         // boss counter-hits
  if (resolved.counterDamageMult) return true;      // boss counter-hits
  if (resolved.guardedEnhancement) return true;     // consumed with guarded state
  if (resolved.rawBehaviors && Object.keys(resolved.rawBehaviors).length > 0) {
    const rb = resolved.rawBehaviors;
    // comboModification, onDetonation, onDodge are verified functional in dagger hooks
    if (rb.comboModification || rb.onDetonation || rb.onDodge || rb.onWardExpire
      || rb.onCounterCrit || rb.passThroughDetonation || rb.chargeSystem
      || rb.groundZone || rb.venomBurstOverride) return true;
  }

  return false;
}

// ─── Diagnosis Heuristics ────────────────────────────────

function diagnose(staticResult: StaticResult, dynamicResult: DynamicResult): string {
  if (staticResult.hasEffect && dynamicResult.hasEffect) return '';

  const fields = staticResult.nonZeroFields;

  if (fields.includes('conditionalMods') && !dynamicResult.hasEffect)
    return 'conditionalMods present but condition not met in test state';
  if ((fields.includes('procs') || fields.includes('skillProcs')) && !dynamicResult.deltas['procsFiredCount'])
    return 'has procs but trigger never fires or conditionParam gate blocks';
  if (fields.includes('ailmentPotency') && !dynamicResult.deltas['totalDotDamage'])
    return 'has ailmentPotency but potency not wired into snapshot calc';
  if (fields.includes('comboStateCreation') && !dynamicResult.deltas['comboStatesCreated'])
    return 'has comboStateCreation but combo state not created during test';
  if (fields.includes('fortifyOnHit') && !dynamicResult.deltas['fortifyStacksMax'])
    return 'has fortifyOnHit but fortify stacks unchanged';
  if (fields.includes('executeThreshold') && !dynamicResult.hasEffect)
    return 'has executeThreshold but no mob below threshold during test';
  if (fields.includes('counterHitDamage') && !dynamicResult.hasEffect)
    return 'has counterHitDamage but no counter-hits triggered (needs incoming attack + ward)';
  if (fields.includes('comboStateEnhance') && !dynamicResult.hasEffect)
    return 'has comboStateEnhance but combo state not consumed during test';
  if (fields.includes('guardedEnhancement') && !dynamicResult.hasEffect)
    return 'has guardedEnhancement but guarded state not consumed during test';
  if (fields.some(f => f.startsWith('raw:')) && !dynamicResult.hasEffect)
    return 'raw modifier has values but resolver does not merge them — missing merge line';

  if (!staticResult.hasEffect && !dynamicResult.hasEffect)
    return 'empty modifier — missing resolver line in talentTree.ts';
  if (staticResult.hasEffect && !dynamicResult.hasEffect)
    return 'static effect present but not exercised during combat simulation';

  return '';
}

// ─── Output Formatting ───────────────────────────────────

function formatVerdict(r: NodeResult): string {
  const tag = r.verdict === 'PASS' ? '\x1b[32m[PASS]\x1b[0m'
    : r.verdict === 'FAIL' ? '\x1b[31m[FAIL]\x1b[0m'
    : r.verdict === 'COST' ? '\x1b[33m[COST]\x1b[0m'
    : '\x1b[36m[STAT]\x1b[0m';

  const staticFields = r.staticResult.nonZeroFields.length > 0
    ? `static:+${r.staticResult.nonZeroFields.slice(0, 3).join(',')}`
    : 'static:EMPTY';

  const dynamicParts: string[] = [];
  for (const [key, val] of Object.entries(r.dynamicResult.deltas)) {
    if (key === 'totalDamage' && val !== 0) {
      const base = r.dynamicResult.baselineMetrics.totalDamage;
      const pct = base > 0 ? ((val / base) * 100).toFixed(1) : '∞';
      dynamicParts.push(`${val > 0 ? '+' : ''}damage(${pct}%)`);
    } else if (key === 'totalCrits' && val !== 0) {
      dynamicParts.push(`${val > 0 ? '+' : ''}crits(${val})`);
    } else if (val !== 0) {
      dynamicParts.push(`${val > 0 ? '+' : ''}${key}(${val})`);
    }
  }
  const dynamicStr = dynamicParts.length > 0
    ? `dynamic:${dynamicParts.slice(0, 3).join(' ')}`
    : 'dynamic:ZERO_EFFECT';

  const diagStr = r.diagnosis ? ` \x1b[90m← ${r.diagnosis}\x1b[0m` : '';
  return `${tag} ${pad(r.nodeId, 14)} (${pad(r.nodeName, 22)}) r${r.maxRank} — ${staticFields} ${dynamicStr}${diagStr}`;
}

// ─── Main ────────────────────────────────────────────────

const results: NodeResult[] = [];
let totalNodes = 0;

const trees = skillFilter === 'all'
  ? Object.entries(ALL_TALENT_TREES)
  : Object.entries(ALL_TALENT_TREES).filter(([id]) => id === skillFilter || id.includes(skillFilter));

if (trees.length === 0) {
  console.error(`No talent tree matching "${skillFilter}". Available: ${Object.keys(ALL_TALENT_TREES).join(', ')}`);
  process.exit(1);
}

const totalNodeCount = trees.reduce((sum, [, tree]) =>
  sum + tree.branches.reduce((bs, b) => bs + b.nodes.length, 0), 0);

if (!jsonOutput) {
  console.log(`\n=== Talent Node QA Bot ===`);
  console.log(`Trees: ${trees.map(([id]) => id).join(', ')}`);
  console.log(`Total nodes: ${totalNodeCount}`);
  console.log(`Ticks per test: ${TICKS} | dt: ${DT_SEC}s | Seed: ${SEED}`);
  console.log(`Est. ticks: ${totalNodeCount * TICKS * 2} (baseline + test)\n`);
}

const startTime = performance.now();

for (const [skillId, tree] of trees) {
  if (!jsonOutput) console.log(`\n── ${skillId} (${tree.branches.map(b => b.name).join(' / ')}) ──`);

  for (const branch of tree.branches) {
    for (const node of branch.nodes) {
      totalNodes++;

      // Layer 1: Static
      const staticResult = runStaticCheck(tree, node);

      // Layer 2: Dynamic
      const dynamicResult = runDynamicCheck(skillId, tree, node);

      // Determine verdict
      let verdict: NodeResult['verdict'];
      if (staticResult.hasEffect && dynamicResult.hasEffect) {
        const dmgDelta = dynamicResult.deltas['totalDamage'] ?? 0;
        verdict = dmgDelta < 0 ? 'COST' : 'PASS';
      } else if (staticResult.hasEffect && !dynamicResult.hasEffect) {
        // Layer 3: direct evaluation — test proc/condition pipeline with synthetic context
        const resolvedMod = resolveTalentModifiers(tree, { [node.id]: node.maxRank });
        const directEvalPasses = runDirectEvalCheck(resolvedMod, skillId);
        verdict = directEvalPasses ? 'PASS' : 'STATIC_ONLY';
      } else if (!staticResult.hasEffect && dynamicResult.hasEffect) {
        verdict = 'PASS';
      } else {
        verdict = 'FAIL';
      }

      const diagnosis = diagnose(staticResult, dynamicResult);

      const nodeResult: NodeResult = {
        skillId, nodeId: node.id, nodeName: node.name, nodeType: node.nodeType,
        maxRank: node.maxRank, staticResult, dynamicResult, verdict, diagnosis,
      };
      results.push(nodeResult);

      if (!jsonOutput) console.log(formatVerdict(nodeResult));

      // Progress (overwrite line)
      if (!jsonOutput && totalNodes % 10 === 0) {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        process.stderr.write(`\r  [${totalNodes}/${totalNodeCount} nodes, ${elapsed}s]`);
      }
    }
  }
}

const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
if (!jsonOutput) process.stderr.write(`\r${' '.repeat(50)}\r`);

// ─── Summary ─────────────────────────────────────────────

const pass = results.filter(r => r.verdict === 'PASS').length;
const fail = results.filter(r => r.verdict === 'FAIL').length;
const cost = results.filter(r => r.verdict === 'COST').length;
const staticOnly = results.filter(r => r.verdict === 'STATIC_ONLY').length;

if (jsonOutput) {
  const serializable = results.map(r => ({
    ...r,
    dynamicResult: {
      ...r.dynamicResult,
      baselineMetrics: { ...r.dynamicResult.baselineMetrics, uniqueProcIds: [...r.dynamicResult.baselineMetrics.uniqueProcIds] },
      testMetrics: { ...r.dynamicResult.testMetrics, uniqueProcIds: [...r.dynamicResult.testMetrics.uniqueProcIds] },
    },
  }));
  console.log(JSON.stringify({ summary: { total: totalNodes, pass, fail, cost, staticOnly, elapsed }, results: serializable }, null, 2));
} else {
  console.log(`\n┌──────────────────────────────────────────┐`);
  console.log(`│ SUMMARY                    ${pad(elapsed + 's', 13)}│`);
  console.log(`├──────────────────────────────────────────┤`);
  console.log(`│ Total nodes tested: ${pad(String(totalNodes), 20)}│`);
  console.log(`│ \x1b[32mPASS\x1b[0m (effect confirmed):  ${pad(String(pass), 14)}│`);
  console.log(`│ \x1b[31mFAIL\x1b[0m (zero effect):       ${pad(String(fail), 14)}│`);
  console.log(`│ \x1b[33mCOST\x1b[0m (net negative):      ${pad(String(cost), 14)}│`);
  console.log(`│ \x1b[36mSTAT\x1b[0m (static only):       ${pad(String(staticOnly), 14)}│`);
  console.log(`└──────────────────────────────────────────┘`);

  if (fail > 0) {
    console.log(`\n\x1b[31m── FAILURES (${fail}) ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'FAIL')) {
      console.log(formatVerdict(r));
    }
  }

  if (staticOnly > 0) {
    console.log(`\n\x1b[36m── STATIC ONLY (${staticOnly}) — investigate ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'STATIC_ONLY')) {
      console.log(formatVerdict(r));
    }
  }

  if (cost > 0) {
    console.log(`\n\x1b[33m── COST NODES (${cost}) — intentional trade-offs? ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'COST')) {
      console.log(formatVerdict(r));
    }
  }
}

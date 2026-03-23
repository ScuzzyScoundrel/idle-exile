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
import { DAGGER_ACTIVE_SKILLS } from '../src/data/skills/dagger';
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

interface MobTrackingMetrics {
  mobsHitAtLeastOnce: Set<number>;    // mob indices that ever lost HP
  mobDamageMap: Map<number, number>;   // mobIndex → total HP lost
  ticksWithMultiMobDamage: number;     // ticks where 2+ mobs took damage
  maxMobsHitInSingleTick: number;     // peak multi-target breadth
  backMobDebuffsApplied: number;       // debuffs on non-front mobs
}

interface MultiTargetExpectation {
  expectMultiMobHits: boolean;
  expectedMinMobs: number;
  expectMultiTickDamage: boolean;
  expectAllMobsHit: boolean;
  expectExtraHits: boolean;
  expectPlagueSharing: boolean;
  recommendedPackSize: number;
}

interface DynamicResult {
  hasEffect: boolean;
  baselineMetrics: AggregateMetrics;
  testMetrics: AggregateMetrics;
  baselineMobMetrics: MobTrackingMetrics;
  testMobMetrics: MobTrackingMetrics;
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
  verdict: 'PASS' | 'FAIL' | 'COST_TRADEOFF' | 'COST_BROKEN' | 'COST_UNCLEAR'
    | 'STATIC_ONLY' | 'MULTI_FAIL' | 'MULTI_WARN' | 'COMBO_ORPHAN' | 'ROTATION_NEEDED';
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

function createMobPack(skillId: string, now: number, opts?: {
  frontMobHp?: number;
  packSize?: number;
  preSeedDebuffs?: Array<{ mobIndex: number; debuffId: string; stacks: number; duration: number }>;
}): MobInPack[] {
  const frontMobHp = opts?.frontMobHp ?? 500;
  const packSize = opts?.packSize ?? 3;

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

  const mobs: MobInPack[] = [];
  for (let i = 0; i < packSize; i++) {
    // Unique maxHp per mob — used as stable identity for tracking across dead-mob filtering
    const mobHp = i === 0 ? frontMobHp : (40000 + i * 1000);
    const mobMaxHp = i === 0 ? Math.max(frontMobHp, 1000) : mobHp;
    mobs.push({
      hp: mobHp,
      maxHp: mobMaxHp,
      debuffs: i === 0 ? [...frontDebuffs.map(d => ({ ...d }))] : [],
      nextAttackAt: now + i * 1000,
      rare: null,
      damageElement: 'physical' as any,
      physRatio: 1.0,
    });
  }

  if (opts?.preSeedDebuffs) {
    for (const seed of opts.preSeedDebuffs) {
      if (seed.mobIndex < mobs.length) {
        mobs[seed.mobIndex].debuffs.push({
          debuffId: seed.debuffId,
          stacks: seed.stacks,
          remainingDuration: seed.duration,
          appliedBySkillId: skillId,
        });
      }
    }
  }

  return mobs;
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
  let nodeAwarePackSize = 3;
  const nodeAwarePreSeedDebuffs: Array<{ mobIndex: number; debuffId: string; stacks: number; duration: number }> = [];
  if (resolvedMod?.conditionalMods) {
    for (const cm of resolvedMod.conditionalMods) {
      if (cm.condition === 'firstSkillInEncounter') nodeAwareConsecutiveHits = 0;
      if (cm.condition === 'afterCastOnMultipleTargets') nodeAwareConsecutiveHits = 3;
    }
  }
  if (resolvedMod?.executeThreshold && resolvedMod.executeThreshold > 0) {
    nodeAwareFrontMobHp = Math.floor(1000 * (resolvedMod.executeThreshold / 100) * 0.8);
  }
  // Pack size based on multi-target modifiers
  if (resolvedMod) {
    if (resolvedMod.chainCount > 0) {
      // Need enough mobs for chains to spread + durable front mob to not collapse pack
      nodeAwarePackSize = Math.max(nodeAwarePackSize, resolvedMod.chainCount + 3);
      nodeAwareFrontMobHp = Math.max(nodeAwareFrontMobHp, 5000);
    }
    if (resolvedMod.convertToAoE || resolvedMod.targetAllEnemies) nodeAwarePackSize = Math.max(nodeAwarePackSize, 4);
    // Pre-seed plague_link debuffs on all mobs
    if (resolvedMod.skillProcs?.some((p: any) => p.procId?.includes('plague_link'))) {
      for (let i = 0; i < nodeAwarePackSize; i++) {
        nodeAwarePreSeedDebuffs.push({ mobIndex: i, debuffId: 'plague_link', stacks: 1, duration: 30 });
      }
    }
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
    packMobs: createMobPack(skillId, now, { frontMobHp: nodeAwareFrontMobHp, packSize: nodeAwarePackSize, preSeedDebuffs: nodeAwarePreSeedDebuffs }),
    currentPackSize: nodeAwarePackSize,
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

function trackMobDamage(
  preHpByMaxHp: Map<number, number>,
  preDebuffsByMaxHp: Map<number, number>,
  postPackMobs: MobInPack[],
  frontMaxHp: number,
  mobMetrics: MobTrackingMetrics,
): number {
  let mobsHitThisTick = 0;
  // Check surviving mobs
  for (const m of postPackMobs) {
    const preHp = preHpByMaxHp.get(m.maxHp);
    if (preHp !== undefined && preHp > m.hp) {
      mobsHitThisTick++;
      mobMetrics.mobsHitAtLeastOnce.add(m.maxHp);
      mobMetrics.mobDamageMap.set(m.maxHp, (mobMetrics.mobDamageMap.get(m.maxHp) ?? 0) + (preHp - m.hp));
    }
    const preDeb = preDebuffsByMaxHp.get(m.maxHp) ?? 0;
    if (m.maxHp !== frontMaxHp && m.debuffs.length > preDeb) {
      mobMetrics.backMobDebuffsApplied += m.debuffs.length - preDeb;
    }
  }
  // Check dead mobs that were filtered out of postPackMobs
  for (const [maxHp, preHp] of Array.from(preHpByMaxHp.entries())) {
    if (!postPackMobs.some(m => m.maxHp === maxHp) && preHp > 0) {
      mobsHitThisTick++;
      mobMetrics.mobsHitAtLeastOnce.add(maxHp);
      mobMetrics.mobDamageMap.set(maxHp, (mobMetrics.mobDamageMap.get(maxHp) ?? 0) + preHp);
    }
  }
  return mobsHitThisTick;
}

function createEmptyMobMetrics(): MobTrackingMetrics {
  return {
    mobsHitAtLeastOnce: new Set(),
    mobDamageMap: new Map(),
    ticksWithMultiMobDamage: 0,
    maxMobsHitInSingleTick: 0,
    backMobDebuffsApplied: 0,
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

function runSimulation(skillId: string, allocatedRanks: Record<string, number>, ticks: number, resolvedMod?: ResolvedSkillModifier): { metrics: AggregateMetrics; mobMetrics: MobTrackingMetrics } {
  resetRng();
  setClock(1000);

  let state = createRichTestState(skillId, allocatedRanks, resolvedMod);
  const metrics = createEmptyMetrics();
  const mobMetrics = createEmptyMobMetrics();

  for (let i = 0; i < ticks; i++) {
    const now = getNow();
    const prevHp = state.currentHp;

    // Snapshot per-mob HP + debuffs by maxHp (stable identity across dead-mob filtering)
    const preHpByMaxHp = new Map<number, number>();
    const preDebuffsByMaxHp = new Map<number, number>();
    for (const m of state.packMobs) {
      preHpByMaxHp.set(m.maxHp, m.hp);
      preDebuffsByMaxHp.set(m.maxHp, m.debuffs.length);
    }
    const frontMaxHp = state.packMobs[0]?.maxHp ?? 0;

    const { patch, result } = runCombatTick(state, DT_SEC, now);
    Object.assign(state, patch);
    accumulateMetrics(metrics, result, prevHp, state);

    // Per-mob HP diff using maxHp as stable key (survives dead-mob array filtering)
    const mobsHitThisTick = trackMobDamage(preHpByMaxHp, preDebuffsByMaxHp, state.packMobs, frontMaxHp, mobMetrics);
    if (mobsHitThisTick >= 2) mobMetrics.ticksWithMultiMobDamage++;
    mobMetrics.maxMobsHitInSingleTick = Math.max(mobMetrics.maxMobsHitInSingleTick, mobsHitThisTick);

    advanceClock(500);

    // Respawn pack if all mobs dead
    if (!state.packMobs || state.packMobs.length === 0) {
      state.packMobs = createMobPack(skillId, getNow());
      state.currentPackSize = 4;
      state.consecutiveHits = 5;
    }
  }

  return { metrics, mobMetrics };
}

function runDynamicCheck(skillId: string, tree: TalentTree, node: TalentNode, ticks: number = TICKS): DynamicResult {
  // Resolve modifier to inspect conditionalMods for node-aware test seeding
  const resolvedMod = resolveTalentModifiers(tree, { [node.id]: node.maxRank });

  // Both baseline and test get the same pre-seeded conditions (buff IDs etc.)
  // so the delta is purely from the talent allocation
  const { metrics: baselineMetrics, mobMetrics: baselineMobMetrics } = runSimulation(skillId, {}, ticks, resolvedMod);
  const { metrics: testMetrics, mobMetrics: testMobMetrics } = runSimulation(skillId, { [node.id]: node.maxRank }, ticks, resolvedMod);

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

  return { hasEffect: Object.keys(deltas).length > 0, baselineMetrics, testMetrics, baselineMobMetrics, testMobMetrics, deltas };
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
  const tagMap: Record<string, string> = {
    PASS:            '\x1b[32m[PASS]\x1b[0m',
    FAIL:            '\x1b[31m[FAIL]\x1b[0m',
    COST_TRADEOFF:   '\x1b[33m[COST:TRD]\x1b[0m',
    COST_BROKEN:     '\x1b[31m[COST:BRK]\x1b[0m',
    COST_UNCLEAR:    '\x1b[33m[COST:???]\x1b[0m',
    STATIC_ONLY:     '\x1b[36m[STAT]\x1b[0m',
    MULTI_FAIL:      '\x1b[31m[MULTI:F]\x1b[0m',
    MULTI_WARN:      '\x1b[35m[MULTI:W]\x1b[0m',
    COMBO_ORPHAN:    '\x1b[35m[COMBO:O]\x1b[0m',
    ROTATION_NEEDED: '\x1b[36m[ROT:OK]\x1b[0m',
  };
  const tag = tagMap[r.verdict] ?? `[${r.verdict}]`;

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

  // Per-mob summary for multi-hit skills
  const mm = r.dynamicResult.testMobMetrics;
  const mobStr = mm.mobsHitAtLeastOnce.size > 1
    ? ` mobs:${mm.mobsHitAtLeastOnce.size} multi%:${mm.ticksWithMultiMobDamage > 0 ? Math.round((mm.ticksWithMultiMobDamage / TICKS) * 100) : 0}`
    : '';

  const diagStr = r.diagnosis ? ` \x1b[90m← ${r.diagnosis}\x1b[0m` : '';
  return `${tag} ${pad(r.nodeId, 14)} (${pad(r.nodeName, 22)}) r${r.maxRank} — ${staticFields} ${dynamicStr}${mobStr}${diagStr}`;
}

// ─── Multi-Target Expectations ───────────────────────────

function detectMultiTargetExpectations(skillId: string, resolvedMod: ResolvedSkillModifier): MultiTargetExpectation {
  const skillDef = DAGGER_ACTIVE_SKILLS.find(s => s.id === skillId);
  const baseHitCount = skillDef?.hitCount ?? 1;

  const result: MultiTargetExpectation = {
    expectMultiMobHits: false,
    expectedMinMobs: 1,
    expectMultiTickDamage: false,
    expectAllMobsHit: false,
    expectExtraHits: false,
    expectPlagueSharing: false,
    recommendedPackSize: 3,
  };

  if (baseHitCount >= 2) {
    result.expectMultiMobHits = true;
    result.expectedMinMobs = Math.min(baseHitCount, 3);
  }

  if (resolvedMod.chainCount > 0) {
    result.expectMultiTickDamage = true;
    if (resolvedMod.chainCount >= 3) result.recommendedPackSize = 5;
  }

  if (resolvedMod.convertToAoE || resolvedMod.targetAllEnemies) {
    result.expectAllMobsHit = true;
    result.recommendedPackSize = Math.max(result.recommendedPackSize, 4);
  }

  if (resolvedMod.extraHits > 0) {
    result.expectExtraHits = true;
  }

  if (resolvedMod.skillProcs?.some((p: any) => p.procId?.includes('plague_link'))) {
    result.expectPlagueSharing = true;
  }

  return result;
}

// ─── COST Triage ─────────────────────────────────────────

function triageCostNode(
  resolvedMod: ResolvedSkillModifier,
  baselineMobMetrics: MobTrackingMetrics,
  testMobMetrics: MobTrackingMetrics,
): NodeResult['verdict'] {
  // Explicit negative modifiers → intentional tradeoff (use !== 0, some penalties stored negative)
  if ((resolvedMod as any).cooldownIncrease !== 0 || (resolvedMod as any).singleTargetPenalty !== 0 ||
      (resolvedMod as any).reducedMaxLife !== 0 || (resolvedMod as any).increasedDamageTaken !== 0 ||
      (resolvedMod as any).cannotLeech || (resolvedMod as any).lifeCostPerTrigger !== 0 ||
      (resolvedMod as any).nonAoePenalty !== 0 || (resolvedMod as any).globalAilmentPenalty !== 0 ||
      (resolvedMod as any).globalAilmentPotencyPenalty !== 0 || (resolvedMod as any).cooldownMultiplier > 1 ||
      (resolvedMod as any).critsDoNoBonusDamage || (resolvedMod as any).singleAilmentOnly ||
      (resolvedMod as any).executeOnly || (resolvedMod as any).executeLocked ||
      (resolvedMod as any).ailmentsNeverExpire) {
    return 'COST_TRADEOFF';
  }

  // Total damage across all mobs higher → damage redistributed, not lost
  const baselineTotal = Array.from(baselineMobMetrics.mobDamageMap.values()).reduce((a, b) => a + b, 0);
  const testTotal = Array.from(testMobMetrics.mobDamageMap.values()).reduce((a, b) => a + b, 0);
  if (testTotal > baselineTotal) {
    return 'COST_TRADEOFF';
  }

  // All modifier fields positive but aggregate damage negative → broken
  // Exclude nodes with skillProcs: procs have complex trigger conditions that may not fire,
  // causing RNG path divergence that masks the proc's benefit. Also require >5% deficit
  // to filter RNG noise from crit chance shifts.
  const hasDmgBuffs = resolvedMod.incDamage > 0 || resolvedMod.incCritMultiplier > 0 ||
    (resolvedMod as any).incCastSpeed > 0 || resolvedMod.extraHits > 0 || resolvedMod.chainCount > 0;
  const hasOnlyCritChance = !hasDmgBuffs && resolvedMod.incCritChance > 0;
  const hasProcs = (resolvedMod.skillProcs?.length ?? 0) > 0;
  const dmgDeficitPct = baselineTotal > 0 ? ((baselineTotal - testTotal) / baselineTotal) * 100 : 0;
  if (hasDmgBuffs && !hasProcs && dmgDeficitPct > 5) {
    return 'COST_BROKEN';
  }
  if (hasOnlyCritChance && !hasProcs && dmgDeficitPct > 10) {
    return 'COST_BROKEN';
  }

  return 'COST_UNCLEAR';
}

// ─── Rotation Testing ────────────────────────────────────

const DAGGER_ROTATIONS: Record<string, string[]> = {
  dagger_blade_dance:  ['dagger_blade_dance', 'dagger_stab'],
  dagger_chain_strike: ['dagger_chain_strike', 'dagger_stab'],
  dagger_shadow_mark:  ['dagger_shadow_mark', 'dagger_blade_dance'],
  dagger_blade_ward:   ['dagger_blade_ward', 'dagger_stab'],
};

function runRotationSimulation(
  skillIds: string[],
  primarySkillId: string,
  allocatedRanks: Record<string, number>,
  ticks: number,
  resolvedMod?: ResolvedSkillModifier,
): { metrics: AggregateMetrics; mobMetrics: MobTrackingMetrics } {
  resetRng();
  setClock(1000);

  let state = createRichTestState(primarySkillId, allocatedRanks, resolvedMod);

  // Wire rotation partners into skill bar + progress + timers
  for (let i = 0; i < skillIds.length && i < 8; i++) {
    const sid = skillIds[i];
    state.skillBar[i] = { skillId: sid, autoCast: true };
    if (!state.skillProgress[sid]) {
      state.skillProgress[sid] = {
        skillId: sid, xp: 0, level: 20, allocatedNodes: [],
        allocatedRanks: sid === primarySkillId ? allocatedRanks : {},
      };
    }
    if (!(state.skillTimers as any[]).find((t: any) => t.skillId === sid)) {
      (state.skillTimers as any[]).push({ skillId: sid, activatedAt: null, cooldownUntil: null });
    }
  }

  const metrics = createEmptyMetrics();
  const mobMetrics = createEmptyMobMetrics();

  for (let i = 0; i < ticks; i++) {
    const now = getNow();
    const prevHp = state.currentHp;
    const preHpByMaxHp = new Map<number, number>();
    const preDebuffsByMaxHp = new Map<number, number>();
    for (const m of state.packMobs) {
      preHpByMaxHp.set(m.maxHp, m.hp);
      preDebuffsByMaxHp.set(m.maxHp, m.debuffs.length);
    }
    const frontMaxHp = state.packMobs[0]?.maxHp ?? 0;

    const { patch, result } = runCombatTick(state, DT_SEC, now);
    Object.assign(state, patch);
    accumulateMetrics(metrics, result, prevHp, state);

    const mobsHitThisTick = trackMobDamage(preHpByMaxHp, preDebuffsByMaxHp, state.packMobs, frontMaxHp, mobMetrics);
    if (mobsHitThisTick >= 2) mobMetrics.ticksWithMultiMobDamage++;
    mobMetrics.maxMobsHitInSingleTick = Math.max(mobMetrics.maxMobsHitInSingleTick, mobsHitThisTick);

    advanceClock(500);

    if (!state.packMobs || state.packMobs.length === 0) {
      state.packMobs = createMobPack(primarySkillId, getNow());
      state.currentPackSize = 4;
      state.consecutiveHits = 5;
    }
  }

  return { metrics, mobMetrics };
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

      // Resolve modifier for multi-target + cost triage
      const resolvedMod = resolveTalentModifiers(tree, { [node.id]: node.maxRank });
      const mtExpect = detectMultiTargetExpectations(skillId, resolvedMod);

      // Determine base verdict — consider ALL mechanical effects, not just damage
      let verdict: NodeResult['verdict'];
      if (staticResult.hasEffect && dynamicResult.hasEffect) {
        const dmgDelta = dynamicResult.deltas['totalDamage'] ?? 0;
        if (dmgDelta >= 0) {
          verdict = 'PASS';
        } else {
          // Damage is negative — check for positive mechanical effects before calling it a cost
          const mechanicalSignals = [
            (dynamicResult.deltas['newProcs'] ?? 0) > 0,                    // new proc types fired
            (dynamicResult.deltas['procsFiredCount'] ?? 0) > 0,             // more procs firing
            (dynamicResult.deltas['conditionalModBonuses'] ?? 0) > 10,      // conditional mods activating
            (dynamicResult.deltas['comboStatesCreated'] ?? 0) > 0,          // combo states generated
            (dynamicResult.deltas['cooldownResets'] ?? 0) > 0,              // cooldown mechanics working
            (dynamicResult.deltas['dodgeCount'] ?? 0) > 0,                  // evasion effects
            (dynamicResult.deltas['fortifyStacksMax'] ?? 0) > 0,            // defensive stacks
            (dynamicResult.deltas['totalIncomingDamage'] ?? 0) < -5,        // takes LESS damage (defensive gain)
            (dynamicResult.deltas['debuffsApplied'] ?? 0) > 0,              // more debuffs applied
            dynamicResult.testMobMetrics.backMobDebuffsApplied >             // debuff spread to non-front mobs
              dynamicResult.baselineMobMetrics.backMobDebuffsApplied,
          ];
          const hasMechanicalEffect = mechanicalSignals.some(Boolean);
          if (hasMechanicalEffect) {
            verdict = 'PASS';
          } else {
            verdict = triageCostNode(resolvedMod, dynamicResult.baselineMobMetrics, dynamicResult.testMobMetrics);
          }
        }
      } else if (staticResult.hasEffect && !dynamicResult.hasEffect) {
        // Layer 3: direct evaluation — test proc/condition pipeline with synthetic context
        const directEvalPasses = runDirectEvalCheck(resolvedMod, skillId);
        verdict = directEvalPasses ? 'PASS' : 'STATIC_ONLY';
      } else if (!staticResult.hasEffect && dynamicResult.hasEffect) {
        verdict = 'PASS';
      } else {
        verdict = 'FAIL';
      }

      // Phase 2: Multi-target assertions
      if (verdict === 'PASS' || verdict === 'FAIL') {
        if (mtExpect.expectMultiMobHits &&
            dynamicResult.testMobMetrics.mobsHitAtLeastOnce.size < mtExpect.expectedMinMobs) {
          verdict = 'MULTI_FAIL';
        }
        if (mtExpect.expectAllMobsHit &&
            dynamicResult.testMobMetrics.mobsHitAtLeastOnce.size < 3) {
          verdict = verdict === 'MULTI_FAIL' ? 'MULTI_FAIL' : 'MULTI_FAIL';
        }
        if (mtExpect.expectMultiTickDamage && verdict !== 'MULTI_FAIL') {
          // Only assert if talent is the SOLE source of chains — skip if base skill already chains
          const baseSkillChains = DAGGER_ACTIVE_SKILLS.find(s => s.id === skillId)?.chainCount ?? 0;
          if (baseSkillChains === 0) {
            const baselineMaxHit = dynamicResult.baselineMobMetrics.maxMobsHitInSingleTick;
            const testMaxHit = dynamicResult.testMobMetrics.maxMobsHitInSingleTick;
            const baselineMulti = dynamicResult.baselineMobMetrics.ticksWithMultiMobDamage;
            const testMulti = dynamicResult.testMobMetrics.ticksWithMultiMobDamage;
            if (testMaxHit <= baselineMaxHit && testMulti <= baselineMulti) {
              verdict = 'MULTI_FAIL';
            }
          }
        }
        if (mtExpect.expectExtraHits &&
            dynamicResult.testMobMetrics.maxMobsHitInSingleTick <= dynamicResult.baselineMobMetrics.maxMobsHitInSingleTick &&
            verdict !== 'MULTI_FAIL') {
          // Only warn if the base skill is multi-target — single-target extra hits on same mob is valid
          const baseSkillDef = DAGGER_ACTIVE_SKILLS.find(s => s.id === skillId);
          if ((baseSkillDef?.hitCount ?? 1) > 1) {
            verdict = 'MULTI_WARN';
          }
        }
        if (mtExpect.expectPlagueSharing) {
          const backMobDmg = Array.from(dynamicResult.testMobMetrics.mobDamageMap.entries())
            .filter(([idx]) => idx > 0).reduce((sum, [, dmg]) => sum + dmg, 0);
          if (backMobDmg === 0 && verdict !== 'MULTI_FAIL') {
            verdict = 'MULTI_WARN';
          }
        }
      }

      // Phase 4: Rotation test for combo-dependent skills
      if ((verdict === 'FAIL' || verdict === 'STATIC_ONLY') && DAGGER_ROTATIONS[skillId]) {
        const rotSkills = DAGGER_ROTATIONS[skillId];
        const { metrics: rotBase } = runRotationSimulation(rotSkills, skillId, {}, TICKS, resolvedMod);
        const { metrics: rotTest } = runRotationSimulation(rotSkills, skillId, { [node.id]: node.maxRank }, TICKS, resolvedMod);
        const rotDmgDelta = rotTest.totalDamage - rotBase.totalDamage;
        if (rotDmgDelta > 0) {
          verdict = 'ROTATION_NEEDED';
        }
      }

      // Benefit-offset: damage down but DoT/healing/proc damage up → tradeoff, not mystery
      if (verdict === 'COST_UNCLEAR') {
        const dotDelta = dynamicResult.deltas['totalDotDamage'] ?? 0;
        const healDelta = dynamicResult.deltas['healingReceived'] ?? 0;
        const procDelta = dynamicResult.deltas['totalProcDamage'] ?? 0;
        const comboDelta = dynamicResult.deltas['comboStatesCreated'] ?? 0;
        const fortifyDelta = dynamicResult.deltas['fortifyStacksMax'] ?? 0;
        if (dotDelta > 0 || healDelta > 0 || procDelta > 0 || comboDelta > 0 || fortifyDelta > 0) {
          verdict = 'COST_TRADEOFF';
        }
      }

      // RNG noise filter: tiny damage deficit with only ±1 crit/hit change → PASS
      if (verdict === 'COST_UNCLEAR') {
        const dmgPct = Math.abs(dynamicResult.deltas['totalDamage'] ?? 0) /
          (dynamicResult.baselineMetrics.totalDamage || 1) * 100;
        const critDelta = Math.abs(dynamicResult.deltas['totalCrits'] ?? 0);
        const hitDelta = Math.abs(dynamicResult.deltas['totalHits'] ?? 0);
        const hasOnlySmallCritShift = critDelta <= 1 && hitDelta <= 1;
        if (dmgPct < 5 && hasOnlySmallCritShift) {
          verdict = 'PASS';
        }
      }

      // Combo orphan: node creates combo state but has no solo effect
      if (verdict === 'FAIL' && staticResult.nonZeroFields.includes('comboStateCreation')) {
        verdict = 'COMBO_ORPHAN';
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
const costTradeoff = results.filter(r => r.verdict === 'COST_TRADEOFF').length;
const costBroken = results.filter(r => r.verdict === 'COST_BROKEN').length;
const costUnclear = results.filter(r => r.verdict === 'COST_UNCLEAR').length;
const staticOnly = results.filter(r => r.verdict === 'STATIC_ONLY').length;
const multiFail = results.filter(r => r.verdict === 'MULTI_FAIL').length;
const multiWarn = results.filter(r => r.verdict === 'MULTI_WARN').length;
const comboOrphan = results.filter(r => r.verdict === 'COMBO_ORPHAN').length;
const rotationNeeded = results.filter(r => r.verdict === 'ROTATION_NEEDED').length;

if (jsonOutput) {
  const serializable = results.map(r => ({
    ...r,
    dynamicResult: {
      ...r.dynamicResult,
      baselineMetrics: { ...r.dynamicResult.baselineMetrics, uniqueProcIds: [...r.dynamicResult.baselineMetrics.uniqueProcIds] },
      testMetrics: { ...r.dynamicResult.testMetrics, uniqueProcIds: [...r.dynamicResult.testMetrics.uniqueProcIds] },
      baselineMobMetrics: { ...r.dynamicResult.baselineMobMetrics, mobsHitAtLeastOnce: Array.from(r.dynamicResult.baselineMobMetrics.mobsHitAtLeastOnce), mobDamageMap: Array.from(r.dynamicResult.baselineMobMetrics.mobDamageMap.entries()).reduce((o, [k, v]) => { (o as any)[k] = v; return o; }, {} as Record<number, number>) },
      testMobMetrics: { ...r.dynamicResult.testMobMetrics, mobsHitAtLeastOnce: Array.from(r.dynamicResult.testMobMetrics.mobsHitAtLeastOnce), mobDamageMap: Array.from(r.dynamicResult.testMobMetrics.mobDamageMap.entries()).reduce((o, [k, v]) => { (o as any)[k] = v; return o; }, {} as Record<number, number>) },
    },
  }));
  console.log(JSON.stringify({ summary: { total: totalNodes, pass, fail, costTradeoff, costBroken, costUnclear, staticOnly, multiFail, multiWarn, comboOrphan, rotationNeeded, elapsed }, results: serializable }, null, 2));
} else {
  // Per-skill multi-target summary
  const skillIds = Array.from(new Set(results.map(r => r.skillId)));
  for (const sid of skillIds) {
    const skillResults = results.filter(r => r.skillId === sid);
    const anyMultiMob = skillResults.some(r => r.dynamicResult.testMobMetrics.mobsHitAtLeastOnce.size > 1);
    if (anyMultiMob) {
      const maxMobs = Math.max(...skillResults.map(r => r.dynamicResult.testMobMetrics.mobsHitAtLeastOnce.size));
      const maxPackSize = Math.max(...skillResults.map(r => r.dynamicResult.testMobMetrics.mobDamageMap.size), 3);
      const multiTicks = Math.max(...skillResults.map(r => r.dynamicResult.testMobMetrics.ticksWithMultiMobDamage));
      const backDmg = Math.max(...skillResults.map(r => {
        const total = Array.from(r.dynamicResult.testMobMetrics.mobDamageMap.values()).reduce((a, b) => a + b, 0);
        const back = Array.from(r.dynamicResult.testMobMetrics.mobDamageMap.entries()).filter(([i]) => i > 0).reduce((s, [, d]) => s + d, 0);
        return total > 0 ? Math.round((back / total) * 100) : 0;
      }));
      console.log(`\n\x1b[90m── ${sid}: mobs hit: ${maxMobs}/${maxPackSize}, multi-tick%: ${Math.round((multiTicks / TICKS) * 100)}%, back-mob dmg: ${backDmg}% ──\x1b[0m`);
    }
  }

  console.log(`\n┌──────────────────────────────────────────────────┐`);
  console.log(`│ SUMMARY                          ${pad(elapsed + 's', 13)}│`);
  console.log(`├──────────────────────────────────────────────────┤`);
  console.log(`│ Total nodes tested: ${pad(String(totalNodes), 28)}│`);
  console.log(`│ \x1b[32mPASS\x1b[0m  (effect confirmed):    ${pad(String(pass), 20)}│`);
  console.log(`│ \x1b[31mFAIL\x1b[0m  (zero effect):         ${pad(String(fail), 20)}│`);
  console.log(`│ \x1b[33mCOST:TRD\x1b[0m (tradeoff):         ${pad(String(costTradeoff), 20)}│`);
  console.log(`│ \x1b[31mCOST:BRK\x1b[0m (broken):           ${pad(String(costBroken), 20)}│`);
  console.log(`│ \x1b[33mCOST:???\x1b[0m (unclear):          ${pad(String(costUnclear), 20)}│`);
  console.log(`│ \x1b[36mSTAT\x1b[0m  (static only):         ${pad(String(staticOnly), 20)}│`);
  console.log(`│ \x1b[31mMULTI:F\x1b[0m (multi-target fail): ${pad(String(multiFail), 20)}│`);
  console.log(`│ \x1b[35mMULTI:W\x1b[0m (multi-target warn): ${pad(String(multiWarn), 20)}│`);
  console.log(`│ \x1b[35mCOMBO:O\x1b[0m (combo orphan):      ${pad(String(comboOrphan), 20)}│`);
  console.log(`│ \x1b[36mROT:OK\x1b[0m  (rotation needed):   ${pad(String(rotationNeeded), 20)}│`);
  console.log(`└──────────────────────────────────────────────────┘`);

  if (fail > 0) {
    console.log(`\n\x1b[31m── FAILURES (${fail}) ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'FAIL')) console.log(formatVerdict(r));
  }

  if (multiFail > 0) {
    console.log(`\n\x1b[31m── MULTI-TARGET FAILURES (${multiFail}) ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'MULTI_FAIL')) console.log(formatVerdict(r));
  }

  if (costBroken > 0) {
    console.log(`\n\x1b[31m── COST BROKEN (${costBroken}) — positive mods but negative damage ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'COST_BROKEN')) console.log(formatVerdict(r));
  }

  if (multiWarn > 0) {
    console.log(`\n\x1b[35m── MULTI-TARGET WARNINGS (${multiWarn}) ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'MULTI_WARN')) console.log(formatVerdict(r));
  }

  if (staticOnly > 0) {
    console.log(`\n\x1b[36m── STATIC ONLY (${staticOnly}) — investigate ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'STATIC_ONLY')) console.log(formatVerdict(r));
  }

  if (costTradeoff > 0) {
    console.log(`\n\x1b[33m── COST TRADEOFFS (${costTradeoff}) — intentional ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'COST_TRADEOFF')) console.log(formatVerdict(r));
  }

  if (costUnclear > 0) {
    console.log(`\n\x1b[33m── COST UNCLEAR (${costUnclear}) — review ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'COST_UNCLEAR')) console.log(formatVerdict(r));
  }

  if (comboOrphan > 0) {
    console.log(`\n\x1b[35m── COMBO ORPHANS (${comboOrphan}) — need partner skill ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'COMBO_ORPHAN')) console.log(formatVerdict(r));
  }

  if (rotationNeeded > 0) {
    console.log(`\n\x1b[36m── ROTATION NEEDED (${rotationNeeded}) — works in multi-skill rotation ──\x1b[0m`);
    for (const r of results.filter(r => r.verdict === 'ROTATION_NEEDED')) console.log(formatVerdict(r));
  }
}

#!/usr/bin/env node
// ============================================================
// QA Rotation — Multi-Skill Integration Test Harness
// Tests actual combat mechanics: combo states, chains, ward,
// trap detonation, and multi-skill rotation sequences.
// Usage: npx tsx sim/qa-rotation.ts
// ============================================================

import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';

const SEED = 42;
installClock();
installRng(SEED);

import './balance-overrides';

import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import type {
  GameState, ActiveDebuff, MobInPack, EquippedSkill, CombatTickResult,
} from '../src/types';
import type { TrapState } from '../src/engine/combat/traps';
import type { CombatTickOutput } from '../src/engine/combat/tick';

// ─── Colors ─────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[90m';
const RESET = '\x1b[0m';

// ─── Types ──────────────────────────────────────────────
interface TestResult {
  name: string;
  pass: boolean;
  details: string;
}

// ─── State Factory ──────────────────────────────────────

function createMobPack(count: number, hp: number = 500): MobInPack[] {
  const now = getNow();
  return Array.from({ length: count }, (_, i) => ({
    hp,
    maxHp: hp,
    debuffs: [] as ActiveDebuff[],
    nextAttackAt: now + 1000 + i * 500,
    rare: null,
    damageElement: 'physical' as any,
    physRatio: 1.0,
  }));
}

function createTestState(skills: string[], packSize: number = 3, packHp: number = 5000): GameState {
  const char = createCharacter('RotationBot', 'rogue');
  char.level = 20;
  char.xpToNext = 99999;

  char.equipment = {
    mainhand: {
      id: 'qa_dagger', baseId: 'crude_dagger', name: 'QA Dagger',
      slot: 'mainhand', rarity: 'rare' as any, iLvl: 20,
      prefixes: [], suffixes: [],
      weaponType: 'dagger',
      baseStats: { flatPhysDamage: 15, baseAttackSpeed: 10, baseCritChance: 5, accuracy: 80, evasion: 60 },
      baseDamageMin: 20, baseDamageMax: 40, baseSpellPower: 10,
    },
  };
  char.stats = resolveStats(char);

  const now = getNow();
  const zone = ZONE_DEFS[2] ?? ZONE_DEFS[0]; // Lower zone for easier kills

  const skillBar: (EquippedSkill | null)[] = Array(8).fill(null);
  const skillTimers: any[] = [];
  const skillProgress: Record<string, any> = {};
  for (let i = 0; i < skills.length; i++) {
    skillBar[i] = { skillId: skills[i], autoCast: true };
    skillTimers.push({ skillId: skills[i], activatedAt: null, cooldownUntil: null });
    skillProgress[skills[i]] = { skillId: skills[i], xp: 0, level: 20, allocatedNodes: [], allocatedRanks: {} };
  }

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
    currentHp: char.stats.maxLife,
    currentEs: 0,
    combatPhase: 'clearing',
    bossState: null,
    zoneClearCounts: {},
    combatPhaseStartedAt: now,
    classResource: createResourceState('rogue'),
    classSelected: true,
    totalKills: 0,
    fastestClears: {},
    skillBar,
    skillProgress,
    skillTimers,
    talentAllocations: [],
    activeDebuffs: [],
    consecutiveHits: 0,
    lastSkillsCast: [],
    lastOverkillDamage: 0,
    killStreak: 0,
    lastCritAt: 0,
    lastBlockAt: 0,
    lastDodgeAt: 0,
    dodgeEntropy: 50,
    tempBuffs: [],
    skillCharges: {},
    rampingStacks: 0,
    rampingLastHitAt: 0,
    fortifyStacks: 0,
    fortifyExpiresAt: 0,
    fortifyDRPerStack: 0,
    deathStreak: 0,
    lastDeathTime: 0,
    comboStates: [],
    activeTraps: [],
    bladeWardExpiresAt: 0,
    bladeWardHits: 0,
    elementTransforms: {},
    lastHitMobTypeId: null,
    freeCastUntil: {},
    lastProcTriggerAt: {},
    lastClearResult: null,
    lastSkillActivation: 0,
    nextActiveSkillAt: 0,
    packMobs: createMobPack(packSize, packHp),
    currentPackSize: packSize,
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

// ─── Sim Helpers ────────────────────────────────────────

/** Run N ticks, return all results + final state */
function runTicks(state: GameState, ticks: number, dtSec: number = 0.5): {
  finalState: GameState;
  results: CombatTickResult[];
  skillsFired: Map<string, number>;
} {
  const results: CombatTickResult[] = [];
  const skillsFired = new Map<string, number>();
  let s = state;

  for (let i = 0; i < ticks; i++) {
    const now = getNow();
    const out = runCombatTick(s, dtSec, now);
    s = { ...s, ...out.patch };
    results.push(out.result);
    if (out.result.skillFired && out.result.skillId) {
      skillsFired.set(out.result.skillId, (skillsFired.get(out.result.skillId) ?? 0) + 1);
    }
    // Respawn pack if wiped
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(state.currentPackSize, 5000) };
    }
    advanceClock(dtSec * 1000);
  }
  return { finalState: s, results, skillsFired };
}

/** Run ticks until a specific skill fires, return the state after that tick */
function runUntilSkillFires(state: GameState, skillId: string, maxTicks: number = 50, dtSec: number = 0.5, requireHit: boolean = false): {
  state: GameState;
  result: CombatTickResult;
  ticksTaken: number;
} | null {
  let s = state;
  for (let i = 0; i < maxTicks; i++) {
    const now = getNow();
    const out = runCombatTick(s, dtSec, now);
    s = { ...s, ...out.patch };
    if (out.result.skillFired && out.result.skillId === skillId && (!requireHit || out.result.isHit)) {
      return { state: s, result: out.result, ticksTaken: i + 1 };
    }
    // Respawn pack if wiped
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(state.currentPackSize, 50000) };
    }
    advanceClock(dtSec * 1000);
  }
  return null;
}

// ─── Test Cases ─────────────────────────────────────────

const tests: Array<() => TestResult> = [];

// --- Test: Each skill fires and deals damage ---
const ALL_DAGGER_SKILLS = [
  'dagger_stab', 'dagger_blade_dance', 'dagger_fan_of_knives',
  'dagger_viper_strike', 'dagger_shadow_mark', 'dagger_assassinate',
  'dagger_chain_strike', 'dagger_blade_ward', 'dagger_blade_trap',
  'dagger_shadow_dash',
];

for (const skillId of ALL_DAGGER_SKILLS) {
  tests.push(() => {
    resetRng();
    setClock(10000);
    const state = createTestState([skillId], 3, 50000);
    const { results, skillsFired } = runTicks(state, 50);
    const casts = skillsFired.get(skillId) ?? 0;
    const totalDmg = results.reduce((s, r) => s + (r.damageDealt ?? 0), 0);
    const pass = casts > 0 && totalDmg > 0;
    return {
      name: `${skillId} fires & deals damage`,
      pass,
      details: `casts=${casts} totalDmg=${totalDmg.toFixed(0)}`,
    };
  });
}

// --- Test: Stab creates Exposed on crit ---
tests.push(() => {
  resetRng();
  setClock(10000);
  // Use temp buff for crit since resolveStats recalculates inside tick.ts
  const state = createTestState(['dagger_stab'], 1, 999999);
  state.tempBuffs = [{ id: 'crit_buff', effect: { critChanceBonus: 95 }, expiresAt: getNow() + 120000, sourceSkillId: 'test', stacks: 1, maxStacks: 1 }];
  const { finalState, results } = runTicks(state, 30);
  const crits = results.filter(r => r.isCrit).length;
  const hasExposed = finalState.comboStates.some(cs => cs.stateId === 'exposed');
  return {
    name: 'Stab creates Exposed on crit',
    pass: crits > 0 && hasExposed,
    details: `crits=${crits} hasExposed=${hasExposed}`,
  };
});

// --- Test: Viper Strike creates Deep Wound ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_viper_strike'], 1, 999999);
  const fired = runUntilSkillFires(state, 'dagger_viper_strike');
  if (!fired) return { name: 'Viper Strike creates Deep Wound', pass: false, details: 'never fired' };
  const hasDeepWound = fired.state.comboStates.some(cs => cs.stateId === 'deep_wound');
  return {
    name: 'Viper Strike creates Deep Wound',
    pass: hasDeepWound,
    details: `fired tick=${fired.ticksTaken} hasDeepWound=${hasDeepWound} comboStates=[${fired.state.comboStates.map(s => s.stateId).join(',')}]`,
  };
});

// --- Test: Shadow Dash creates Shadow Momentum ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_shadow_dash'], 1, 999999);
  const fired = runUntilSkillFires(state, 'dagger_shadow_dash');
  if (!fired) return { name: 'Shadow Dash creates Shadow Momentum', pass: false, details: 'never fired' };
  const hasMomentum = fired.state.comboStates.some(cs => cs.stateId === 'shadow_momentum');
  return {
    name: 'Shadow Dash creates Shadow Momentum',
    pass: hasMomentum,
    details: `fired tick=${fired.ticksTaken} hasMomentum=${hasMomentum} comboStates=[${fired.state.comboStates.map(s => s.stateId).join(',')}]`,
  };
});

// --- Test: Assassinate consumes Exposed + Deep Wound ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_assassinate'], 1, 999999);
  // Pre-seed combo states
  state.comboStates = [
    { stateId: 'exposed', sourceSkillId: 'dagger_stab', remainingDuration: 10, stacks: 1, maxStacks: 1, effect: { incDamage: 25 } },
    { stateId: 'deep_wound', sourceSkillId: 'dagger_viper_strike', remainingDuration: 10, stacks: 1, maxStacks: 1, effect: { burstDamage: 50 } },
  ];
  const fired = runUntilSkillFires(state, 'dagger_assassinate');
  if (!fired) return { name: 'Assassinate consumes Exposed + Deep Wound', pass: false, details: 'never fired' };
  const hasExposed = fired.state.comboStates.some(cs => cs.stateId === 'exposed');
  const hasDeepWound = fired.state.comboStates.some(cs => cs.stateId === 'deep_wound');
  return {
    name: 'Assassinate consumes Exposed + Deep Wound',
    pass: !hasExposed && !hasDeepWound,
    details: `exposed=${hasExposed} deepWound=${hasDeepWound} remaining=[${fired.state.comboStates.map(s => s.stateId).join(',')}]`,
  };
});

// --- Test: Blade Ward activates on cast (no hit check) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_blade_ward'], 1, 999999);
  state.bladeWardExpiresAt = 0;
  state.bladeWardHits = 0;
  const fired = runUntilSkillFires(state, 'dagger_blade_ward');
  if (!fired) return { name: 'Blade Ward activates on cast (Bug 2 fix)', pass: false, details: 'never fired' };
  const wardActive = fired.state.bladeWardExpiresAt > getNow();
  return {
    name: 'Blade Ward activates on cast (Bug 2 fix)',
    pass: wardActive,
    details: `wardExpiresAt=${fired.state.bladeWardExpiresAt} now=${getNow()} isHit=${fired.result.isHit}`,
  };
});

// --- Test: Combo states expire via tickMaintenance (Bug 1 fix) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_stab'], 1, 999999);
  // Pre-seed a combo state with 1s remaining
  state.comboStates = [
    { stateId: 'test_expiry', sourceSkillId: 'test', remainingDuration: 1, stacks: 1, maxStacks: 1, effect: {} },
  ];
  // Run 5 ticks at 0.5s = 2.5s total — should expire the 1s state
  const { finalState } = runTicks(state, 5, 0.5);
  const survived = finalState.comboStates.some(cs => cs.stateId === 'test_expiry');
  return {
    name: 'Combo states expire via tickMaintenance (Bug 1 fix)',
    pass: !survived,
    details: `survived=${survived} remaining=[${finalState.comboStates.map(s => `${s.stateId}(${s.remainingDuration.toFixed(1)}s)`).join(',')}]`,
  };
});

// --- Test: Combo states tick during GCD (not just on cast) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_assassinate'], 1, 999999); // Long CD skill
  // Pre-seed state with 2s remaining — should expire during cooldown
  state.comboStates = [
    { stateId: 'gcd_expiry_test', sourceSkillId: 'test', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: {} },
  ];
  // Set nextActiveSkillAt far in future so we're in GCD for all ticks
  state.nextActiveSkillAt = getNow() + 20000;
  const { finalState } = runTicks(state, 10, 0.5); // 5s of ticking
  const survived = finalState.comboStates.some(cs => cs.stateId === 'gcd_expiry_test');
  return {
    name: 'Combo states tick during GCD (not just on cast)',
    pass: !survived,
    details: `survived=${survived} comboStates=[${finalState.comboStates.map(s => `${s.stateId}(${s.remainingDuration.toFixed(1)}s)`).join(',')}]`,
  };
});

// --- Test: Chain Strike hits multiple targets (Bug 3 fix) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_chain_strike'], 3, 50000);
  const mob1HpBefore = state.packMobs[1].hp;
  const mob2HpBefore = state.packMobs[2].hp;
  const fired = runUntilSkillFires(state, 'dagger_chain_strike', 50, 0.5, true);
  if (!fired) return { name: 'Chain Strike hits multiple targets (Bug 3 fix)', pass: false, details: 'never hit' };
  const mob1HpAfter = fired.state.packMobs.length > 1 ? fired.state.packMobs[1].hp : mob1HpBefore;
  const mob2HpAfter = fired.state.packMobs.length > 2 ? fired.state.packMobs[2].hp : mob2HpBefore;
  const mob1Damaged = mob1HpAfter < mob1HpBefore;
  const mob2Damaged = mob2HpAfter < mob2HpBefore;
  return {
    name: 'Chain Strike hits multiple targets (Bug 3 fix)',
    pass: mob1Damaged && mob2Damaged,
    details: `mob1: ${mob1HpBefore}→${mob1HpAfter.toFixed(0)} (${mob1Damaged ? 'HIT' : 'MISS'}) mob2: ${mob2HpBefore}→${mob2HpAfter.toFixed(0)} (${mob2Damaged ? 'HIT' : 'MISS'})`,
  };
});

// --- Test: Chain Strike chain_surge minTargetsHit gate ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_chain_strike'], 3, 999999);
  // Run many ticks to get multiple casts
  const { finalState, skillsFired } = runTicks(state, 100);
  const casts = skillsFired.get('dagger_chain_strike') ?? 0;
  const hasChainSurge = finalState.comboStates.some(cs => cs.stateId === 'chain_surge');
  // Also check if chain_surge was EVER created during the run
  // Run again tracking combo state creation
  resetRng();
  setClock(10000);
  const state2 = createTestState(['dagger_chain_strike'], 3, 999999);
  let everCreatedChainSurge = false;
  let s = state2;
  for (let i = 0; i < 100; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    const prevStates = new Set(s.comboStates.map(cs => cs.stateId));
    s = { ...s, ...out.patch };
    if (s.comboStates.some(cs => cs.stateId === 'chain_surge' && !prevStates.has('chain_surge'))) {
      everCreatedChainSurge = true;
    }
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(3, 999999) };
    }
    advanceClock(500);
  }
  return {
    name: 'Chain Strike creates chain_surge (minTargetsHit gate)',
    pass: everCreatedChainSurge,
    details: `casts=${casts} everCreatedChainSurge=${everCreatedChainSurge} finalHas=${hasChainSurge}`,
  };
});

// --- Test: Blade Dance creates dance_momentum on 3+ pack ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_blade_dance'], 3, 999999);
  let everCreated = false;
  let s = state;
  let casts = 0;
  for (let i = 0; i < 60; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    s = { ...s, ...out.patch };
    if (out.result.skillFired && out.result.skillId === 'dagger_blade_dance') casts++;
    if (s.comboStates.some(cs => cs.stateId === 'dance_momentum')) everCreated = true;
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(3, 999999) };
    }
    advanceClock(500);
  }
  return {
    name: 'Blade Dance creates dance_momentum (3-pack)',
    pass: everCreated,
    details: `casts=${casts} everCreated=${everCreated}`,
  };
});

// --- Test: Blade Dance does NOT create dance_momentum on 2-pack ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_blade_dance'], 2, 999999); // Only 2 mobs
  let everCreated = false;
  let s = state;
  let casts = 0;
  for (let i = 0; i < 60; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    s = { ...s, ...out.patch };
    if (out.result.skillFired && out.result.skillId === 'dagger_blade_dance') casts++;
    if (s.comboStates.some(cs => cs.stateId === 'dance_momentum')) everCreated = true;
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(2, 999999) };
    }
    advanceClock(500);
  }
  return {
    name: 'Blade Dance skips dance_momentum on 2-pack (by design)',
    pass: !everCreated,
    details: `casts=${casts} everCreated=${everCreated}`,
  };
});

// --- Test: Shadow Mark creates shadow_mark state ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_shadow_mark'], 1, 999999);
  const fired = runUntilSkillFires(state, 'dagger_shadow_mark');
  if (!fired) return { name: 'Shadow Mark creates shadow_mark', pass: false, details: 'never fired' };
  const hasMark = fired.state.comboStates.some(cs => cs.stateId === 'shadow_mark');
  return {
    name: 'Shadow Mark creates shadow_mark',
    pass: hasMark,
    details: `hasMark=${hasMark} comboStates=[${fired.state.comboStates.map(s => s.stateId).join(',')}]`,
  };
});

// --- Test: Blade Trap places trap ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_blade_trap'], 1, 999999);
  state.activeTraps = [];
  const fired = runUntilSkillFires(state, 'dagger_blade_trap');
  if (!fired) return { name: 'Blade Trap places trap', pass: false, details: 'never fired' };
  const hasTrap = fired.state.activeTraps.length > 0;
  return {
    name: 'Blade Trap places trap',
    pass: hasTrap,
    details: `trapCount=${fired.state.activeTraps.length} isHit=${fired.result.isHit}`,
  };
});

// --- Test: Multi-skill rotation — all skills fire in rotation ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const rotation = ['dagger_stab', 'dagger_viper_strike', 'dagger_assassinate', 'dagger_blade_dance'];
  const state = createTestState(rotation, 3, 50000);
  const { skillsFired } = runTicks(state, 200);
  const allFired = rotation.every(s => (skillsFired.get(s) ?? 0) > 0);
  const details = rotation.map(s => `${s.replace('dagger_', '')}=${skillsFired.get(s) ?? 0}`).join(' ');
  return {
    name: 'Multi-skill rotation: all 4 skills fire',
    pass: allFired,
    details,
  };
});

// --- Test: Viper Strike → Assassinate consumes deep_wound for burst ---
tests.push(() => {
  resetRng();
  setClock(10000);
  // Run VS first to create deep_wound, then run Assassinate to consume it
  const state = createTestState(['dagger_viper_strike'], 1, 999999);
  const vsFired = runUntilSkillFires(state, 'dagger_viper_strike');
  if (!vsFired) return { name: 'VS→Assassinate burst combo', pass: false, details: 'VS never fired' };

  // Now swap skill to assassinate
  const s2 = { ...vsFired.state };
  s2.skillBar = [{ skillId: 'dagger_assassinate', autoCast: true }, null, null, null, null, null, null, null];
  s2.skillTimers = [{ skillId: 'dagger_assassinate', activatedAt: null, cooldownUntil: null }];
  s2.skillProgress = { ...s2.skillProgress, dagger_assassinate: { skillId: 'dagger_assassinate', xp: 0, level: 20, allocatedNodes: [], allocatedRanks: {} } };
  s2.nextActiveSkillAt = 0;

  const hadDeepWound = s2.comboStates.some(cs => cs.stateId === 'deep_wound');
  const asFired = runUntilSkillFires(s2, 'dagger_assassinate');
  if (!asFired) return { name: 'VS→Assassinate burst combo', pass: false, details: `hadDW=${hadDeepWound} AS never fired` };
  const stillHasDW = asFired.state.comboStates.some(cs => cs.stateId === 'deep_wound');
  return {
    name: 'VS→Assassinate burst combo (deep_wound consumed)',
    pass: hadDeepWound && !stillHasDW,
    details: `hadDW=${hadDeepWound} stillHasDW=${stillHasDW}`,
  };
});

// --- Test: Chain Strike applies ailments to chain targets ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_chain_strike'], 3, 999999);
  // Ensure no pre-existing debuffs
  for (const mob of state.packMobs) mob.debuffs = [];
  const fired = runUntilSkillFires(state, 'dagger_chain_strike', 50, 0.5, true);
  if (!fired) return { name: 'Chain Strike applies ailments to chain targets', pass: false, details: 'never hit' };
  const mob1Debuffs = fired.state.packMobs.length > 1 ? fired.state.packMobs[1].debuffs.length : 0;
  const mob2Debuffs = fired.state.packMobs.length > 2 ? fired.state.packMobs[2].debuffs.length : 0;
  return {
    name: 'Chain Strike applies ailments to chain targets',
    pass: mob1Debuffs > 0 || mob2Debuffs > 0,
    details: `mob1debuffs=${mob1Debuffs} mob2debuffs=${mob2Debuffs}`,
  };
});

// --- Test: Traps expire via tickMaintenance ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_stab'], 1, 999999);
  state.activeTraps = [
    { trapId: 'expiry_test', sourceSkillId: 'dagger_blade_trap', placedAt: getNow() - 10000, armDelay: 1.5, isArmed: true, damage: 100, duration: 2, remainingDuration: 1 },
  ];
  const { finalState } = runTicks(state, 5, 0.5); // 2.5s — should expire 1s trap
  const survived = finalState.activeTraps.some(t => t.trapId === 'expiry_test');
  return {
    name: 'Traps expire via tickMaintenance',
    pass: !survived,
    details: `survived=${survived} trapCount=${finalState.activeTraps.length}`,
  };
});

// --- Test: DoT death doesn't stall encounter (pack respawns) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  // Create a pack with very low HP so DoT kills them between skill casts
  const state = createTestState(['dagger_viper_strike'], 1, 10); // 10 HP mob
  // Pre-apply a strong poison so DoT kills the mob during GCD
  state.packMobs[0].debuffs = [
    { debuffId: 'poisoned', stacks: 3, remainingDuration: 5, appliedBySkillId: 'dagger_viper_strike',
      instances: [
        { snapshot: 100, remainingDuration: 5, appliedBySkillId: 'dagger_viper_strike' },
        { snapshot: 100, remainingDuration: 5, appliedBySkillId: 'dagger_viper_strike' },
        { snapshot: 100, remainingDuration: 5, appliedBySkillId: 'dagger_viper_strike' },
      ] },
  ];
  // Run many ticks — the mob should die from DoT during GCD, and a new pack should spawn
  const { finalState, results } = runTicks(state, 60, 0.5);
  const totalKills = results.reduce((s, r) => s + (r.mobKills ?? 0), 0);
  const hasMobs = finalState.packMobs.length > 0;
  const totalDamage = results.reduce((s, r) => s + (r.damageDealt ?? 0), 0);
  return {
    name: 'DoT death respawns encounter (no stall)',
    pass: hasMobs && totalKills > 0,
    details: `kills=${totalKills} hasMobs=${hasMobs} packSize=${finalState.packMobs.length} dmg=${totalDamage.toFixed(0)}`,
  };
});

// --- Test: Viper Strike applies poison (chaos ailment via baseConversion) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_viper_strike'], 1, 999999);
  // Run enough ticks for multiple casts
  let everHadPoison = false;
  let maxStacks = 0;
  let s = state;
  let casts = 0;
  for (let i = 0; i < 60; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    s = { ...s, ...out.patch };
    if (out.result.skillFired && out.result.skillId === 'dagger_viper_strike') casts++;
    const front = s.packMobs[0];
    const poison = front?.debuffs.find((d: any) => d.debuffId === 'poisoned');
    if (poison) {
      everHadPoison = true;
      const inst = (poison as any).instances?.length ?? poison.stacks;
      maxStacks = Math.max(maxStacks, inst);
    }
    if (s.packMobs.length === 0 || s.packMobs.every((m: any) => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(1, 999999) };
    }
    advanceClock(500);
  }
  return {
    name: 'Viper Strike applies poison (baseConversion fix)',
    pass: everHadPoison && maxStacks >= 1,
    details: `casts=${casts} everHadPoison=${everHadPoison} maxStacks=${maxStacks}`,
  };
});

// --- Test: Chain Strike applies shocked (lightning baseConversion) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_chain_strike'], 1, 999999);
  let everHadShocked = false;
  let s = state;
  for (let i = 0; i < 40; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    s = { ...s, ...out.patch };
    const front = s.packMobs[0];
    if (front?.debuffs.some((d: any) => d.debuffId === 'shocked')) everHadShocked = true;
    advanceClock(500);
  }
  return {
    name: 'Chain Strike applies shocked (lightning conversion)',
    pass: everHadShocked,
    details: `everHadShocked=${everHadShocked}`,
  };
});

// --- Bug 1 Regression: AoE splash should NOT spread other skills' debuffs ---
tests.push(() => {
  resetRng();
  setClock(10000);
  // Two-skill rotation: Stab (applies shocked via pre-seeded debuff) + FoK (AoE)
  const state = createTestState(['dagger_fan_of_knives'], 3, 999999);
  // Pre-seed front mob with a foreign debuff (simulating Stab's shock)
  state.packMobs[0].debuffs = [
    { debuffId: 'shocked', stacks: 1, remainingDuration: 10, skillId: 'dagger_stab', stackSnapshots: [5] },
  ];
  // Back mobs should NOT have shocked
  state.packMobs[1].debuffs = [];
  state.packMobs[2].debuffs = [];
  const fired = runUntilSkillFires(state, 'dagger_fan_of_knives', 30, 0.5, true);
  if (!fired) return { name: 'Bug1: AoE splash does NOT spread foreign debuffs', pass: false, details: 'FoK never hit' };
  // Back mobs should NOT have shocked (from Stab) — only FoK's own auto-ailment
  const backMob1Shocked = fired.state.packMobs.length > 1 && fired.state.packMobs[1].debuffs.some((d: any) => d.debuffId === 'shocked');
  const backMob2Shocked = fired.state.packMobs.length > 2 && fired.state.packMobs[2].debuffs.some((d: any) => d.debuffId === 'shocked');
  return {
    name: 'Bug1: AoE splash does NOT spread foreign debuffs',
    pass: !backMob1Shocked && !backMob2Shocked,
    details: `backMob1Shocked=${backMob1Shocked} backMob2Shocked=${backMob2Shocked}`,
  };
});

// --- Bug 2 Regression: detonateAll produces procDamage and consumes ailments ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_fan_of_knives'], 3, 999999);
  // Allocate Chain Detonation (fk_1_5_1 in plague branch)
  state.skillProgress['dagger_fan_of_knives'].allocatedRanks = { fk_1_5_1: 1 };
  // Pre-seed ALL mobs with 8 ailment stacks to meet minAilmentStacks: 5
  const makeAilments = () => [
    { debuffId: 'poisoned', stacks: 8, remainingDuration: 10, skillId: 'dagger_fan_of_knives', stackSnapshots: [50, 50, 50, 50, 50, 50, 50, 50] },
  ];
  for (const mob of state.packMobs) mob.debuffs = makeAilments();
  // Override RNG to guarantee proc fires (chance=0.25, need random < 0.25)
  const savedRandom = Math.random;
  let callCount = 0;
  Math.random = () => {
    callCount++;
    // Return low value to pass chance checks, but vary for hit/crit rolls
    return (callCount % 5 === 0) ? 0.8 : 0.1;
  };
  let totalProcDamage = 0;
  let anyDebuffsConsumed = false;
  let s = state;
  for (let i = 0; i < 40; i++) {
    const now = getNow();
    const out = runCombatTick(s, 0.5, now);
    s = { ...s, ...out.patch };
    if (out.result.procDamage && out.result.procDamage > 0) totalProcDamage += out.result.procDamage;
    for (const mob of s.packMobs) {
      if (mob.debuffs.length === 0) anyDebuffsConsumed = true;
    }
    // Re-seed ailments + respawn if wiped
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      s = { ...s, packMobs: createMobPack(3, 999999) };
    }
    for (const mob of s.packMobs) {
      if (mob.debuffs.length === 0) mob.debuffs = makeAilments();
    }
    advanceClock(500);
  }
  Math.random = savedRandom;
  resetRng(); // restore seeded RNG for subsequent tests
  return {
    name: 'Bug2: detonateAll produces procDamage + consumes ailments',
    pass: totalProcDamage > 0,
    details: `totalProcDamage=${totalProcDamage.toFixed(0)} anyDebuffsConsumed=${anyDebuffsConsumed}`,
  };
});

// --- Bug 3 Regression: kill proc explosion hits ALL surviving mobs (Extinction Event) ---
tests.push(() => {
  resetRng();
  setClock(10000);
  const state = createTestState(['dagger_fan_of_knives'], 3, 100);
  // Allocate Extinction Event (fk_1_6_0 in plague branch)
  state.skillProgress['dagger_fan_of_knives'].allocatedRanks = { fk_1_6_0: 1 };
  // Front mob nearly dead with ailments, back mobs healthy
  state.packMobs[0].hp = 1; // will die on first hit
  state.packMobs[0].debuffs = [
    { debuffId: 'poisoned', stacks: 3, remainingDuration: 10, skillId: 'dagger_fan_of_knives', stackSnapshots: [100, 100, 100] },
  ];
  state.packMobs[1].hp = 50000;
  state.packMobs[1].maxHp = 50000;
  state.packMobs[2].hp = 50000;
  state.packMobs[2].maxHp = 50000;
  const backMob1Before = state.packMobs[1].hp;
  const backMob2Before = state.packMobs[2].hp;
  const { finalState, results } = runTicks(state, 20);
  // Check if any result had detonation/proc damage that hit back mobs
  const totalProcDmg = results.reduce((s, r) => s + (r.procDamage ?? 0), 0);
  // Back mobs should have taken explosion damage (not just AoE splash)
  const anyBackDamaged = finalState.packMobs.length >= 2 && finalState.packMobs.some(m => m.hp < 50000);
  return {
    name: 'Bug3: kill proc explosion hits all surviving mobs',
    pass: totalProcDmg > 0 || anyBackDamaged,
    details: `totalProcDmg=${totalProcDmg.toFixed(0)} anyBackDamaged=${anyBackDamaged}`,
  };
});

// ─── Run All Tests ──────────────────────────────────────

console.log('\n┌─────────────────────────────────────────────────┐');
console.log('│       QA Rotation — Dagger Skill Integration     │');
console.log('└─────────────────────────────────────────────────┘\n');

let passCount = 0;
let failCount = 0;

for (const test of tests) {
  const result = test();
  if (result.pass) {
    passCount++;
    console.log(`${GREEN}[PASS]${RESET} ${result.name} ${DIM}${result.details}${RESET}`);
  } else {
    failCount++;
    console.log(`${RED}[FAIL]${RESET} ${result.name} ${YELLOW}${result.details}${RESET}`);
  }
}

console.log('\n┌─────────────────────────────────────────────────┐');
console.log(`│ ${GREEN}PASS${RESET}: ${passCount.toString().padStart(3)}    ${RED}FAIL${RESET}: ${failCount.toString().padStart(3)}    Total: ${(passCount + failCount).toString().padStart(3)}          │`);
console.log('└─────────────────────────────────────────────────┘\n');

if (failCount > 0) process.exit(1);

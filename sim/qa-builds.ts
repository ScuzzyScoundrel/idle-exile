#!/usr/bin/env node
// ============================================================
// QA Builds — Fuzzy Build Testing via Random Skill/Talent Bots
// Each bot picks random skills + talents like a human, then runs
// real runCombatTick() combat and reports anomalies.
// Usage: npx tsx sim/qa-builds.ts [--bots 50] [--ticks 300]
// ============================================================

import { installRng, resetRng } from './rng';
import { installClock, setClock, advanceClock, getNow } from './clock';

// Parse args
const args = process.argv.slice(2);
function getArg(name: string, def: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}
const NUM_BOTS = parseInt(getArg('bots', '50'));
const TICKS_PER_BOT = parseInt(getArg('ticks', '300'));
const DT_SEC = 0.5;
const VERBOSE = args.includes('--verbose');

installClock();
installRng(1);

import './balance-overrides';

import { runCombatTick } from '../src/engine/combat/tick';
import type { CombatTickOutput } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { canAllocateTalentRank, allocateTalentRank } from '../src/engine/talentTree';
import { ALL_TALENT_TREES } from '../src/data/skillGraphs/talentTrees';
import { ZONE_DEFS } from '../src/data/zones';
import type {
  GameState, ActiveDebuff, MobInPack, EquippedSkill,
  TalentTree, TalentNode, SkillProgress, CombatTickResult,
} from '../src/types';
import type { TrapState } from '../src/engine/combat/traps';

// ─── Colors ─────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── All Dagger Skills ──────────────────────────────────
const ALL_SKILLS = [
  'dagger_stab', 'dagger_blade_dance', 'dagger_fan_of_knives',
  'dagger_viper_strike', 'dagger_shadow_mark', 'dagger_assassinate',
  'dagger_chain_strike', 'dagger_blade_ward', 'dagger_blade_trap',
  'dagger_shadow_dash',
];

// ─── Random Helpers ─────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

// ─── Build Generation ───────────────────────────────────

interface BotBuild {
  seed: number;
  skills: string[];
  talentRanks: Record<string, Record<string, number>>; // skillId → nodeId → rank
  talentPointsSpent: number;
}

function generateBuild(seed: number): BotBuild {
  // Pick 3-4 random skills
  const numSkills = 3 + Math.floor(Math.random() * 2); // 3 or 4
  const skills = pickN(ALL_SKILLS, numSkills);

  // Randomly allocate talent points for each skill
  const talentRanks: Record<string, Record<string, number>> = {};
  let totalPoints = 0;

  for (const skillId of skills) {
    const tree = ALL_TALENT_TREES[skillId] as TalentTree | undefined;
    if (!tree) {
      talentRanks[skillId] = {};
      continue;
    }

    let ranks: Record<string, number> = {};
    const skillLevel = 20;
    const targetPoints = 5 + Math.floor(Math.random() * 16); // 5-20 points per skill

    // Collect all nodes, shuffle for random allocation order
    const allNodes: TalentNode[] = [];
    for (const branch of tree.branches) {
      allNodes.push(...branch.nodes);
    }
    const shuffled = shuffle(allNodes);

    // Multiple passes: low-tier nodes first pass, then higher tiers
    for (let pass = 0; pass < 5; pass++) {
      for (const node of shuffled) {
        if (totalPoints >= skillLevel) break;
        const currentRank = ranks[node.id] ?? 0;
        if (currentRank >= node.maxRank) continue;

        if (canAllocateTalentRank(tree, ranks, node.id, skillLevel)) {
          ranks = allocateTalentRank(ranks, node.id);
          totalPoints++;
          if (totalPoints >= targetPoints) break;
        }
      }
      if (totalPoints >= targetPoints) break;
    }

    talentRanks[skillId] = ranks;
  }

  return { seed, skills, talentRanks, talentPointsSpent: totalPoints };
}

// ─── State Factory ──────────────────────────────────────

function createMobPack(count: number, hp: number): MobInPack[] {
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

function createBotState(build: BotBuild): GameState {
  const char = createCharacter('FuzzyBot', 'rogue');
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
  const zone = ZONE_DEFS[3] ?? ZONE_DEFS[0];

  const skillBar: (EquippedSkill | null)[] = Array(8).fill(null);
  const skillTimers: any[] = [];
  const skillProgress: Record<string, SkillProgress> = {};

  for (let i = 0; i < build.skills.length; i++) {
    const sid = build.skills[i];
    skillBar[i] = { skillId: sid, autoCast: true };
    skillTimers.push({ skillId: sid, activatedAt: null, cooldownUntil: null });
    skillProgress[sid] = {
      skillId: sid, xp: 0, level: 20,
      allocatedNodes: Object.keys(build.talentRanks[sid] ?? {}),
      allocatedRanks: build.talentRanks[sid] ?? {},
    };
  }

  // Random pack size: 1-5 mobs
  const packSize = 1 + Math.floor(Math.random() * 5);

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
    packMobs: createMobPack(packSize, 3000),
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

// ─── Per-Build Metrics ──────────────────────────────────

interface SkillMetrics {
  casts: number;
  hits: number;
  totalDamage: number;
  crits: number;
  dotDamage: number;
  counterHitDamage: number;
  trapDetonationDamage: number;
}

interface BuildMetrics {
  totalTicks: number;
  totalKills: number;
  totalDamage: number;
  totalDotDamage: number;
  perSkill: Map<string, SkillMetrics>;
  comboStatesCreated: Set<string>;   // unique stateIds ever observed
  maxComboStatesAtOnce: number;
  wardActivations: number;
  trapsPlaced: number;
  trapsDetonated: number;
  deaths: number;
  errors: string[];                  // runtime errors caught
}

function emptySkillMetrics(): SkillMetrics {
  return { casts: 0, hits: 0, totalDamage: 0, crits: 0, dotDamage: 0, counterHitDamage: 0, trapDetonationDamage: 0 };
}

// ─── Run One Bot ────────────────────────────────────────

function runBot(build: BotBuild): BuildMetrics {
  const metrics: BuildMetrics = {
    totalTicks: 0,
    totalKills: 0,
    totalDamage: 0,
    totalDotDamage: 0,
    perSkill: new Map(),
    comboStatesCreated: new Set(),
    maxComboStatesAtOnce: 0,
    wardActivations: 0,
    trapsPlaced: 0,
    trapsDetonated: 0,
    deaths: 0,
    errors: [],
  };

  for (const sid of build.skills) {
    metrics.perSkill.set(sid, emptySkillMetrics());
  }

  let state = createBotState(build);
  const initialPackSize = state.currentPackSize;
  let prevWardActive = false;
  let prevTrapCount = 0;

  for (let tick = 0; tick < TICKS_PER_BOT; tick++) {
    metrics.totalTicks++;
    const now = getNow();

    let out: CombatTickOutput;
    try {
      out = runCombatTick(state, DT_SEC, now);
    } catch (e: any) {
      metrics.errors.push(`tick ${tick}: ${e.message}`);
      break;
    }

    const prev = state;
    state = { ...state, ...out.patch };
    const r = out.result;

    // Track skill metrics
    if (r.skillFired && r.skillId) {
      const sm = metrics.perSkill.get(r.skillId) ?? emptySkillMetrics();
      sm.casts++;
      if (r.isHit) sm.hits++;
      if (r.isCrit) sm.crits++;
      sm.totalDamage += r.damageDealt ?? 0;
      sm.dotDamage += r.dotDamage ?? 0;
      sm.counterHitDamage += r.counterHitDamage ?? 0;
      sm.trapDetonationDamage += r.trapDetonationDamage ?? 0;
      metrics.perSkill.set(r.skillId, sm);
    }

    metrics.totalDamage += r.damageDealt ?? 0;
    metrics.totalDotDamage += r.dotDamage ?? 0;
    metrics.totalKills += r.mobKills ?? 0;

    // Track combo states
    for (const cs of state.comboStates) {
      metrics.comboStatesCreated.add(cs.stateId);
    }
    metrics.maxComboStatesAtOnce = Math.max(metrics.maxComboStatesAtOnce, state.comboStates.length);

    // Track ward activations
    const wardNowActive = state.bladeWardExpiresAt > now;
    if (wardNowActive && !prevWardActive) metrics.wardActivations++;
    prevWardActive = wardNowActive;

    // Track traps
    if (state.activeTraps.length > prevTrapCount) metrics.trapsPlaced += state.activeTraps.length - prevTrapCount;
    if (state.activeTraps.length < prevTrapCount && r.trapDetonationDamage) metrics.trapsDetonated++;
    prevTrapCount = state.activeTraps.length;

    // Track deaths
    if (state.currentHp <= 0) {
      metrics.deaths++;
      state = { ...state, currentHp: state.character.stats.maxLife };
    }

    // Respawn pack if wiped
    if (state.packMobs.length === 0 || state.packMobs.every(m => m.hp <= 0)) {
      state = { ...state, packMobs: createMobPack(initialPackSize, 3000) };
    }

    advanceClock(DT_SEC * 1000);
  }

  return metrics;
}

// ─── Anomaly Detection ──────────────────────────────────

interface Anomaly {
  severity: 'BUG' | 'WARN';
  message: string;
}

function detectAnomalies(build: BotBuild, metrics: BuildMetrics): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Runtime errors are always bugs
  for (const err of metrics.errors) {
    anomalies.push({ severity: 'BUG', message: `Runtime error: ${err}` });
  }

  // Each equipped skill should fire at least once in 300 ticks
  for (const sid of build.skills) {
    const sm = metrics.perSkill.get(sid);
    if (!sm || sm.casts === 0) {
      anomalies.push({ severity: 'BUG', message: `${sid} never fired (0 casts in ${metrics.totalTicks} ticks)` });
    } else if (sm.hits === 0) {
      anomalies.push({ severity: 'WARN', message: `${sid} fired ${sm.casts}x but never hit` });
    } else if (sm.totalDamage === 0 && sm.dotDamage === 0 && sm.counterHitDamage === 0 && sm.trapDetonationDamage === 0) {
      // Hit but 0 total damage across all damage types
      anomalies.push({ severity: 'BUG', message: `${sid} hit ${sm.hits}x but dealt 0 damage` });
    }
  }

  // Zero total damage is always a bug
  if (metrics.totalDamage === 0 && metrics.totalDotDamage === 0) {
    anomalies.push({ severity: 'BUG', message: `Build dealt 0 total damage` });
  }

  // Zero kills with substantial ticks is suspicious
  if (metrics.totalKills === 0 && metrics.totalTicks >= 100) {
    anomalies.push({ severity: 'WARN', message: `0 kills in ${metrics.totalTicks} ticks` });
  }

  // Blade Ward equipped but never activated
  if (build.skills.includes('dagger_blade_ward')) {
    const bwm = metrics.perSkill.get('dagger_blade_ward');
    if (bwm && bwm.hits > 0 && metrics.wardActivations === 0) {
      anomalies.push({ severity: 'BUG', message: `Blade Ward hit ${bwm.hits}x but ward never activated` });
    }
  }

  // Blade Trap equipped but never placed
  if (build.skills.includes('dagger_blade_trap')) {
    const btm = metrics.perSkill.get('dagger_blade_trap');
    if (btm && btm.hits > 0 && metrics.trapsPlaced === 0) {
      anomalies.push({ severity: 'BUG', message: `Blade Trap hit ${btm.hits}x but no trap placed` });
    }
  }

  // Viper Strike should create deep_wound
  if (build.skills.includes('dagger_viper_strike')) {
    const vsm = metrics.perSkill.get('dagger_viper_strike');
    if (vsm && vsm.hits > 0 && !metrics.comboStatesCreated.has('deep_wound')) {
      anomalies.push({ severity: 'BUG', message: `Viper Strike hit ${vsm.hits}x but deep_wound never created` });
    }
  }

  // Shadow Dash should create shadow_momentum
  if (build.skills.includes('dagger_shadow_dash')) {
    const sdm = metrics.perSkill.get('dagger_shadow_dash');
    if (sdm && sdm.hits > 0 && !metrics.comboStatesCreated.has('shadow_momentum')) {
      anomalies.push({ severity: 'BUG', message: `Shadow Dash hit ${sdm.hits}x but shadow_momentum never created` });
    }
  }

  // Shadow Mark should create shadow_mark
  if (build.skills.includes('dagger_shadow_mark')) {
    const smm = metrics.perSkill.get('dagger_shadow_mark');
    if (smm && smm.hits > 0 && !metrics.comboStatesCreated.has('shadow_mark')) {
      anomalies.push({ severity: 'BUG', message: `Shadow Mark hit ${smm.hits}x but shadow_mark never created` });
    }
  }

  // Combo states should tick down (not accumulate forever)
  if (metrics.maxComboStatesAtOnce > 15) {
    anomalies.push({ severity: 'WARN', message: `${metrics.maxComboStatesAtOnce} simultaneous combo states — possible expiry failure` });
  }

  return anomalies;
}

// ─── Main ───────────────────────────────────────────────

console.log(`\n${BOLD}┌──────────────────────────────────────────────────────┐${RESET}`);
console.log(`${BOLD}│       QA Builds — Fuzzy Random Build Testing          │${RESET}`);
console.log(`${BOLD}│       ${NUM_BOTS} bots × ${TICKS_PER_BOT} ticks = ${(NUM_BOTS * TICKS_PER_BOT * DT_SEC).toFixed(0)}s sim time each   │${RESET}`);
console.log(`${BOLD}└──────────────────────────────────────────────────────┘${RESET}\n`);

let totalBugs = 0;
let totalWarns = 0;
let cleanBots = 0;
const bugSummary = new Map<string, number>(); // message → count

for (let i = 0; i < NUM_BOTS; i++) {
  // Each bot gets a unique seed
  resetRng();
  // Advance RNG state by bot index for unique builds
  for (let j = 0; j < i * 100; j++) Math.random();
  setClock(10000);

  const build = generateBuild(i);
  const metrics = runBot(build);
  const anomalies = detectAnomalies(build, metrics);

  const bugs = anomalies.filter(a => a.severity === 'BUG');
  const warns = anomalies.filter(a => a.severity === 'WARN');
  totalBugs += bugs.length;
  totalWarns += warns.length;

  for (const a of anomalies) {
    bugSummary.set(a.message, (bugSummary.get(a.message) ?? 0) + 1);
  }

  if (bugs.length > 0 || VERBOSE) {
    const skillNames = build.skills.map(s => s.replace('dagger_', '')).join(', ');
    const tag = bugs.length > 0 ? `${RED}[BUG]${RESET}` : warns.length > 0 ? `${YELLOW}[WARN]${RESET}` : `${GREEN}[OK]${RESET}`;
    console.log(`${tag} Bot #${i} [${skillNames}] pts=${build.talentPointsSpent} kills=${metrics.totalKills} dmg=${metrics.totalDamage.toFixed(0)} deaths=${metrics.deaths}`);

    // Per-skill breakdown
    if (bugs.length > 0 || VERBOSE) {
      for (const [sid, sm] of metrics.perSkill) {
        const name = sid.replace('dagger_', '').padEnd(15);
        console.log(`  ${DIM}${name} casts=${sm.casts} hits=${sm.hits} dmg=${sm.totalDamage.toFixed(0)} crits=${sm.crits} dot=${sm.dotDamage.toFixed(0)}${RESET}`);
      }
      if (metrics.comboStatesCreated.size > 0) {
        console.log(`  ${DIM}combo states: [${[...metrics.comboStatesCreated].join(', ')}] ward=${metrics.wardActivations} traps=${metrics.trapsPlaced}/${metrics.trapsDetonated}${RESET}`);
      }
    }

    for (const a of anomalies) {
      const color = a.severity === 'BUG' ? RED : YELLOW;
      console.log(`  ${color}↳ ${a.severity}: ${a.message}${RESET}`);
    }
  }

  if (anomalies.length === 0) cleanBots++;
}

// ─── Summary ────────────────────────────────────────────

console.log(`\n${BOLD}┌──────────────────────────────────────────────────────┐${RESET}`);
console.log(`${BOLD}│ ${GREEN}Clean${RESET}: ${cleanBots.toString().padStart(3)}/${NUM_BOTS}   ${RED}Bugs${RESET}: ${totalBugs.toString().padStart(3)}   ${YELLOW}Warns${RESET}: ${totalWarns.toString().padStart(3)}              ${BOLD}│${RESET}`);
console.log(`${BOLD}└──────────────────────────────────────────────────────┘${RESET}`);

if (bugSummary.size > 0) {
  console.log(`\n${BOLD}Anomaly frequency:${RESET}`);
  const sorted = [...bugSummary.entries()].sort((a, b) => b[1] - a[1]);
  for (const [msg, count] of sorted) {
    const isBug = msg.includes('Runtime') || msg.includes('0 damage') || msg.includes('never fired') || msg.includes('never activated') || msg.includes('never created') || msg.includes('no trap');
    const color = isBug ? RED : YELLOW;
    console.log(`  ${color}${count.toString().padStart(3)}×${RESET} ${msg}`);
  }
}

console.log('');
if (totalBugs > 0) process.exit(1);

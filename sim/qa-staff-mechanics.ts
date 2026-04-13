#!/usr/bin/env node
// ============================================================
// QA Staff Mechanics — Scenario assertions for staff v2 engine
// Validates minion subsystem + combo state create/consume paths
// by calling pure functions and weapon-module hooks directly.
// Usage: npx tsx sim/qa-staff-mechanics.ts
// ============================================================

import { installRng } from './rng';
import { installClock, getNow } from './clock';

installClock();
installRng(42);

import './balance-overrides';

import {
  SUMMON_CONFIGS, summonMinions, stepMinions, absorbDamage, detonateMinions,
  type MinionState,
} from '../src/engine/combat/minions';
import { staffModule } from '../src/engine/combat/weapons/staff';
import { tickComboStates } from '../src/engine/combat/combo';
import { evaluateProcs } from '../src/engine/combatHelpers';
import type { ComboState } from '../src/types';

// ── Output helpers ──
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[90m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passCount++;
    console.log(`${GREEN}[PASS]${RESET} ${label}${detail ? `  ${DIM}(${detail})${RESET}` : ''}`);
  } else {
    failCount++;
    failures.push(label);
    console.log(`${RED}[FAIL]${RESET} ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${CYAN}── ${title} ──${RESET}`);
}

function near(actual: number, expected: number, tol: number = 0.01): boolean {
  return Math.abs(actual - expected) <= tol;
}

// ── Minimal ctx builders for hook calls ──
const PLAYER_MAX_HP = 1000;
const SPELL_POWER = 100;

function mkCtxBase(now: number) {
  return {
    state: {} as any,
    skill: { id: '' } as any,
    graphMod: null,
    effectiveStats: {} as any,
    effectiveMaxLife: PLAYER_MAX_HP,
    dtSec: 0.5,
    now,
    phase: 'clearing' as const,
    avgDamage: 0,
    spellPower: SPELL_POWER,
    targetDebuffs: [],
  };
}

// ════════════════════════════════════════════════════════════
// 1. summonMinions
// ════════════════════════════════════════════════════════════
section('summonMinions');

{
  const now = getNow();
  const fresh = summonMinions([], SUMMON_CONFIGS.zombie_dog, PLAYER_MAX_HP, SPELL_POWER, now);
  assert('Zombie Dogs summon produces 2 minions', fresh.length === 2, `got ${fresh.length}`);
  assert('Each zombie dog has 20% player maxHp', fresh.every(m => near(m.hp, PLAYER_MAX_HP * 0.2)), `hp=${fresh[0]?.hp}`);
  assert('Zombie dog element is chaos', fresh.every(m => m.element === 'chaos'));
  assert('Zombie dog damage = 0.85 × spell power', fresh.every(m => near(m.damage, SPELL_POWER * 0.85)));
  assert('Zombie dog attack interval = 2.5s', fresh.every(m => m.attackInterval === 2.5));
  assert('Zombie dog applies haunted on hit', fresh.every(m => m.createsComboStateOnHit === 'haunted'));
  assert('Attack timers are staggered (not all simultaneous)',
    new Set(fresh.map(m => m.nextAttackAt)).size === fresh.length);
}

{
  const now = getNow();
  const fetish = summonMinions([], SUMMON_CONFIGS.fetish, PLAYER_MAX_HP, SPELL_POWER, now);
  assert('Fetish Swarm summon produces 4 minions', fetish.length === 4, `got ${fetish.length}`);
  assert('Each fetish has 10% player maxHp', fetish.every(m => near(m.hp, PLAYER_MAX_HP * 0.1)));
  assert('Fetish element is physical', fetish.every(m => m.element === 'physical'));
  assert('Fetish attack interval = 1.25s', fetish.every(m => m.attackInterval === 1.25));
  assert('Fetish does NOT apply haunted on hit', fetish.every(m => !m.createsComboStateOnHit));
}

{
  // Roster contract: re-cast while minions alive refreshes duration, does NOT stack count.
  const now = getNow();
  const first = summonMinions([], SUMMON_CONFIGS.zombie_dog, PLAYER_MAX_HP, SPELL_POWER, now);
  // Damage one dog so we can see if refresh preserves hp
  first[0].hp = 50;
  const refreshed = summonMinions(first, SUMMON_CONFIGS.zombie_dog, PLAYER_MAX_HP, SPELL_POWER, now + 5000);
  assert('Re-cast refresh keeps same minion count (no stacking)',
    refreshed.length === 2, `got ${refreshed.length}`);
  assert('Re-cast preserves damaged HP (does not heal)', refreshed.some(m => m.hp === 50));
  assert('Re-cast extends expiresAt', refreshed.every(m => m.expiresAt === now + 5000 + SUMMON_CONFIGS.zombie_dog.duration * 1000));
}

{
  // Mixed types don't collide
  const now = getNow();
  let minions = summonMinions([], SUMMON_CONFIGS.zombie_dog, PLAYER_MAX_HP, SPELL_POWER, now);
  minions = summonMinions(minions, SUMMON_CONFIGS.fetish, PLAYER_MAX_HP, SPELL_POWER, now);
  assert('Dogs + Fetishes coexist (2 + 4 = 6 minions)',
    minions.length === 6, `got ${minions.length}`);
  assert('Correct split by type',
    minions.filter(m => m.type === 'zombie_dog').length === 2 &&
    minions.filter(m => m.type === 'fetish').length === 4);
}

// ════════════════════════════════════════════════════════════
// 2. stepMinions
// ════════════════════════════════════════════════════════════
section('stepMinions');

{
  const now = 10000;
  // 2 dogs whose nextAttackAt is already due
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 50, attackInterval: 3,
      nextAttackAt: now - 100, expiresAt: now + 10000, element: 'chaos',
      sourceSkillId: 'staff_zombie_dogs', createsComboStateOnHit: 'haunted' },
    { id: 'd2', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 50, attackInterval: 3,
      nextAttackAt: now + 2000, expiresAt: now + 10000, element: 'chaos',
      sourceSkillId: 'staff_zombie_dogs', createsComboStateOnHit: 'haunted' },
  ];
  const { minions, attacks } = stepMinions(dogs, 0.5, now);
  assert('Only the due dog attacks (1 attack emitted)', attacks.length === 1, `got ${attacks.length}`);
  assert('Attack damage matches dog damage', attacks[0]?.damage === 50);
  assert('Attack carries haunted trigger', attacks[0]?.createsComboStateOnHit === 'haunted');
  assert('Both dogs still alive post-step', minions.length === 2);
  assert('Due dog\'s nextAttackAt advanced by interval',
    minions.find(m => m.id === 'd1')?.nextAttackAt === (now - 100) + 3000);
}

{
  const now = 10000;
  const expired: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 50, attackInterval: 3,
      nextAttackAt: now + 1000, expiresAt: now - 1, element: 'chaos',
      sourceSkillId: 'staff_zombie_dogs' },
    { id: 'd2', type: 'zombie_dog', hp: 0, maxHp: 100, damage: 50, attackInterval: 3,
      nextAttackAt: now + 1000, expiresAt: now + 10000, element: 'chaos',
      sourceSkillId: 'staff_zombie_dogs' },
  ];
  const { minions, attacks } = stepMinions(expired, 0.5, now);
  assert('Expired + dead minions are dropped', minions.length === 0, `got ${minions.length}`);
  assert('No attacks from expired/dead', attacks.length === 0);
}

// ════════════════════════════════════════════════════════════
// 3. absorbDamage
// ════════════════════════════════════════════════════════════
section('absorbDamage');

{
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const { minions, remainingDamage } = absorbDamage(dogs, 100);
  assert('100 damage split across 2 minions → each takes 50',
    minions[0].hp === 50 && minions[1].hp === 50,
    `hp=[${minions[0].hp}, ${minions[1].hp}]`);
  assert('No damage passes through to player', remainingDamage === 0);
}

{
  // Overkill: 300 damage vs 2 dogs @ 100hp each → kills both, 100 passes through
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const { minions, remainingDamage } = absorbDamage(dogs, 300);
  assert('Overkill: both dogs die',
    minions.every(m => m.hp === 0), `hp=[${minions[0].hp}, ${minions[1].hp}]`);
  assert('Overkill: 100 damage passes to player', remainingDamage === 100);
}

{
  // No minions → no absorption
  const { minions, remainingDamage } = absorbDamage([], 100);
  assert('Zero minions → full damage passes through', remainingDamage === 100 && minions.length === 0);
}

// ════════════════════════════════════════════════════════════
// 4. detonateMinions
// ════════════════════════════════════════════════════════════
section('detonateMinions');

{
  const mixed: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 150, maxHp: 200, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 80, maxHp: 200, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'f1', type: 'fetish', hp: 50, maxHp: 100, damage: 0, attackInterval: 1.5,
      nextAttackAt: 0, expiresAt: 99999, element: 'physical', sourceSkillId: 's' },
  ];
  const det = detonateMinions(mixed);
  assert('Detonate ALL: damage = sum of remaining HP',
    det.damage === 150 + 80 + 50, `got ${det.damage}`);
  assert('Detonate ALL: remaining list empty', det.remaining.length === 0);
}

{
  const mixed: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 150, maxHp: 200, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'f1', type: 'fetish', hp: 50, maxHp: 100, damage: 0, attackInterval: 1.5,
      nextAttackAt: 0, expiresAt: 99999, element: 'physical', sourceSkillId: 's' },
  ];
  const det = detonateMinions(mixed, 'fetish');
  assert('Detonate fetish only: damage = fetish HP', det.damage === 50);
  assert('Detonate fetish only: dog remains', det.remaining.length === 1 && det.remaining[0].type === 'zombie_dog');
}

// ════════════════════════════════════════════════════════════
// 5. staffModule.tickMaintenance — minion step + haunted creation + spirit_link refresh
// ════════════════════════════════════════════════════════════
section('staffModule.tickMaintenance');

{
  const now = 10000;
  const dogs = summonMinions([], SUMMON_CONFIGS.zombie_dog, PLAYER_MAX_HP, SPELL_POWER, now - 4000);
  // Force both dogs to be due this tick
  dogs.forEach(d => { d.nextAttackAt = now - 100; });

  const ctx: any = { ...mkCtxBase(now), state: { activeMinions: dogs, comboStates: [] } };
  const result = staffModule.tickMaintenance!(ctx);

  assert('tickMaintenance returns updated minion list',
    Array.isArray(result.activeMinions) && result.activeMinions!.length === 2);
  assert('tickMaintenance reports total minion damage',
    result.minionAttackDamage === SPELL_POWER * 0.85 * 2,
    `got ${result.minionAttackDamage}`);
  assert('tickMaintenance creates haunted combo state on dog bite',
    (result.comboStates ?? []).some(s => s.stateId === 'haunted'));
  assert('tickMaintenance creates spirit_link while minions alive',
    (result.comboStates ?? []).some(s => s.stateId === 'spirit_link'));
}

{
  // No minions → no spirit_link refresh, no attacks
  const now = 10000;
  const ctx: any = { ...mkCtxBase(now), state: { activeMinions: [], comboStates: [] } };
  const result = staffModule.tickMaintenance!(ctx);
  assert('tickMaintenance with zero minions: no spirit_link created',
    !(result.comboStates ?? []).some(s => s.stateId === 'spirit_link'));
  assert('tickMaintenance with zero minions: no attack damage',
    !result.minionAttackDamage || result.minionAttackDamage === 0);
}

// ════════════════════════════════════════════════════════════
// 6. staffModule.postCast — summon + combo state creation
// ════════════════════════════════════════════════════════════
section('staffModule.postCast');

{
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0,
    bladeWardHits: 0,
    activeTraps: [],
    activeMinions: [],
    ailmentSnapshot: 0,
  };
  const result = staffModule.postCast!(ctx);
  assert('postCast on Zombie Dogs summons 2 dogs',
    (result.activeMinions ?? []).length === 2);
  assert('postCast summons with correct type',
    (result.activeMinions ?? []).every(m => m.type === 'zombie_dog'));
}

{
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_haunt' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
  };
  const result = staffModule.postCast!(ctx);
  assert('postCast on Haunt creates haunted combo state',
    result.comboStates.some(s => s.stateId === 'haunted'));
  assert('postCast on Haunt does NOT summon minions',
    (result.activeMinions ?? []).length === 0);
}

{
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_locust_swarm' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
  };
  const result = staffModule.postCast!(ctx);
  assert('postCast on Locust Swarm creates plagued combo state',
    result.comboStates.some(s => s.stateId === 'plagued'));
}

{
  // Skill miss → no combo state created
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_haunt' },
    roll: { damage: 0, isHit: false, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
  };
  const result = staffModule.postCast!(ctx);
  assert('postCast on missed Haunt does NOT create haunted',
    !result.comboStates.some(s => s.stateId === 'haunted'));
}

// ════════════════════════════════════════════════════════════
// 7. staffModule.preRoll — consume bonuses
// ════════════════════════════════════════════════════════════
section('staffModule.preRoll');

{
  // Spirit Barrage consumes haunted → guaranteed crit + 1.3× damage
  const now = 10000;
  const haunted: ComboState = {
    stateId: 'haunted', sourceSkillId: 'staff_haunt', remainingDuration: 5, stacks: 1,
    maxStacks: 1, effect: { incDamage: 30, guaranteedCrit: true },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_spirit_barrage' },
    comboStates: [haunted],
    damageMult: 1,
    activeMinions: [],
  };
  const result = staffModule.preRoll!(ctx);
  assert('Spirit Barrage consuming haunted: guaranteed crit',
    result.guaranteedCrit === true);
  assert('Spirit Barrage consuming haunted: damageMult = 1.30',
    near(result.damageMult, 1.30), `got ${result.damageMult}`);
  assert('Haunted consumed (removed from list)',
    !result.comboStates.some(s => s.stateId === 'haunted'));
  assert('consumedStateIds reports haunted',
    result.consumedStateIds.includes('haunted'));
}

{
  // Soul Harvest consumes hexed → 2× damage (+100%)
  const now = 10000;
  const hexed: ComboState = {
    stateId: 'hexed', sourceSkillId: 'staff_hex', remainingDuration: 5, stacks: 1,
    maxStacks: 1, effect: { incDamage: 100 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    comboStates: [hexed],
    damageMult: 1,
    activeMinions: [],
  };
  const result = staffModule.preRoll!(ctx);
  assert('Soul Harvest consuming hexed: damageMult = 2.0',
    near(result.damageMult, 2.0), `got ${result.damageMult}`);
}

{
  // Bouncing Skull consumes soul_stack (3 stacks) → +3 extra chains
  const now = 10000;
  const stack: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 'staff_soul_harvest', remainingDuration: 10, stacks: 3,
    maxStacks: 5, effect: { extraChains: 1 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_bouncing_skull' },
    comboStates: [stack],
    damageMult: 1,
    activeMinions: [],
  };
  const result = staffModule.preRoll!(ctx);
  assert('Bouncing Skull consuming 3 soul_stacks: extraChains = 3',
    result.extraChains === 3, `got ${result.extraChains}`);
}

{
  // Plague of Toads consumes plagued → pandemicSpread signal
  const now = 10000;
  const plagued: ComboState = {
    stateId: 'plagued', sourceSkillId: 'staff_locust_swarm', remainingDuration: 6, stacks: 1,
    maxStacks: 1, effect: { incDamage: 0 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_plague_of_toads' },
    comboStates: [plagued],
    damageMult: 1,
    activeMinions: [],
  };
  const result = staffModule.preRoll!(ctx);
  assert('Plague of Toads consuming plagued: pandemicSpread = true',
    result.pandemicSpread === true);
}

{
  // Mass Sacrifice consumes spirit_link → detonateMinions + burst damage
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 'staff_minion_subsystem',
    remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 150, maxHp: 200, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 90, maxHp: 200, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink],
    damageMult: 1,
    activeMinions: dogs,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Mass Sacrifice consuming spirit_link: burstDamage = sum of minion HP',
    result.burstDamage === 240, `got ${result.burstDamage}`);
  assert('Mass Sacrifice consuming spirit_link: minions list emptied',
    result.activeMinions?.length === 0);
}

{
  // Mass Sacrifice with all 4 passive states (haunted+plagued+hexed + 5 soul_stacks)
  // Expected mult: 1.20 × 1.20 × 1.20 × (1 + 0.15×5) = 1.728 × 1.75 = 3.024
  const now = 10000;
  const states: ComboState[] = [
    { stateId: 'haunted', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
    { stateId: 'plagued', sourceSkillId: 's', remainingDuration: 6, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
    { stateId: 'hexed', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
    { stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 5, maxStacks: 5, effect: { extraChains: 1 } },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: states,
    damageMult: 1,
    activeMinions: [],
  };
  const result = staffModule.preRoll!(ctx);
  // Final Sacrifice baseline: 4 states consumed → ×1.5 extra
  const expected = 1.20 * 1.20 * 1.20 * 1.75 * 1.5;
  assert('Mass Sacrifice 4-state consume + Final Sacrifice ×1.5: damageMult',
    near(result.damageMult, expected, 0.001), `got ${result.damageMult} expected ${expected}`);
  assert('Mass Sacrifice consumed all 4 states', result.consumedStateIds.length === 4);
}

{
  // Final Sacrifice 5-state (all combo states including spirit_link): ×2.0
  const now = 10000;
  const states: ComboState[] = [
    { stateId: 'haunted', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
    { stateId: 'plagued', sourceSkillId: 's', remainingDuration: 6, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
    { stateId: 'hexed', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
    { stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 5, maxStacks: 5, effect: { extraChains: 1 } },
    { stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 } },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: states,
    damageMult: 1,
    activeMinions: [],
  };
  const result = staffModule.preRoll!(ctx);
  const expected = 1.20 * 1.20 * 1.20 * 1.75 * 2.0;
  assert('Mass Sacrifice 5-state consume + Final Sacrifice ×2.0: damageMult',
    near(result.damageMult, expected, 0.001), `got ${result.damageMult} expected ${expected}`);
  assert('Mass Sacrifice consumed all 5 states', result.consumedStateIds.length === 5);
}

// ════════════════════════════════════════════════════════════
// 8. staffModule.onEnemyAttack — damage absorption
// ════════════════════════════════════════════════════════════
section('staffModule.onEnemyAttack');

{
  const now = 10000;
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3,
      nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_spark' },
    attackResult: { damage: 100, isDodged: false, isBlocked: false, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: dogs,
    comboCounterDamageMult: 1,
    isBossPhase: false,
  };
  const result = staffModule.onEnemyAttack!(ctx);
  assert('onEnemyAttack absorbs 100 across 2 dogs → 100 absorbed',
    result.damageAbsorbedByMinions === 100, `got ${result.damageAbsorbedByMinions}`);
  assert('onEnemyAttack returns updated minion list with reduced HP',
    result.activeMinions!.every(m => m.hp === 50));
}

{
  // No minions → no absorption
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_spark' },
    attackResult: { damage: 100, isDodged: false, isBlocked: false, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    comboCounterDamageMult: 1,
    isBossPhase: false,
  };
  const result = staffModule.onEnemyAttack!(ctx);
  assert('onEnemyAttack with zero minions: no damage absorbed',
    !result.damageAbsorbedByMinions || result.damageAbsorbedByMinions === 0);
}

// ════════════════════════════════════════════════════════════
// 9. Combo state tick decay (generic, but staff relies on it)
// ════════════════════════════════════════════════════════════
section('combo state decay');

{
  const states: ComboState[] = [
    { stateId: 'haunted', sourceSkillId: 's', remainingDuration: 1, stacks: 1, maxStacks: 1, effect: {} },
    { stateId: 'hexed', sourceSkillId: 's', remainingDuration: 0.3, stacks: 1, maxStacks: 1, effect: {} },
  ];
  const after = tickComboStates(states, 0.5);
  assert('Combo state with duration > dtSec persists', after.some(s => s.stateId === 'haunted'));
  assert('Combo state with duration < dtSec expires', !after.some(s => s.stateId === 'hexed'));
}

// ════════════════════════════════════════════════════════════
// 10. Mass Sacrifice talent tree — behavior verification
// ════════════════════════════════════════════════════════════
section('Mass Sacrifice talents — Plague Doctor');

{
  // Contagion Sacrifice T4: massSacrificePandemic = true → pandemic fires when MS consumes plagued
  const now = 10000;
  const plagued: ComboState = {
    stateId: 'plagued', sourceSkillId: 's', remainingDuration: 6, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [plagued],
    damageMult: 1,
    activeMinions: [],
    graphMod: { massSacrificePandemic: true } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Contagion Sacrifice: MS consuming plagued → pandemicSpread=true',
    result.pandemicSpread === true);
}

{
  // Virulent Explosion T5A: burstDamagePerDebuffOnTarget scales burst with debuffs on front mob
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink],
    damageMult: 1,
    activeMinions: dogs,
    targetDebuffs: [{ debuffId: 'poison', stacks: 1 }, { debuffId: 'chilled', stacks: 1 }, { debuffId: 'bleed', stacks: 1 }],
    graphMod: { burstDamagePerDebuffOnTarget: 8 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // Baseline burst = 100 (one dog at 100hp). +8% × 3 debuffs = ×1.24.
  const expected = 100 * 1.24;
  assert('Virulent Explosion: burst scales with 3 debuffs on target (×1.24)',
    near(result.burstDamage, expected, 0.01), `got ${result.burstDamage} expected ${expected}`);
}

section('Mass Sacrifice talents — Spirit Caller');

{
  // Pack Leader T1a: damagePerMinionAlive scales damageMult
  const now = 10000;
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_bouncing_skull' },  // any staff skill — not a MS-specific bonus
    comboStates: [],
    damageMult: 1,
    activeMinions: dogs,
    graphMod: { damagePerMinionAlive: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // 2 minions × 15% = +30%, so ×1.30
  assert('Pack Leader: 2 minions × 15% = damageMult ×1.30',
    near(result.damageMult, 1.30, 0.001), `got ${result.damageMult}`);
}

{
  // Bone Warden T1b: minionHpMult scales minion HP at summon (via postCast path)
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { minionHpMult: 50 } as any,  // +50% HP
  };
  const result = staffModule.postCast!(ctx);
  const baseHp = PLAYER_MAX_HP * 0.20;
  const expectedHp = baseHp * 1.50;
  assert('Bone Warden: Zombie Dogs summoned with +50% HP',
    (result.activeMinions ?? []).every(m => near(m.hp, expectedHp)),
    `hp=${(result.activeMinions ?? [])[0]?.hp} expected ${expectedHp}`);
}

{
  // Bloodbond T4: detonationUsesMaxHp — detonation uses maxHp not current hp
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 50, maxHp: 200, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink],
    damageMult: 1,
    activeMinions: dogs,
    graphMod: { detonationUsesMaxHp: true } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Bloodbond: detonation uses maxHp (200) not current hp (50)',
    result.burstDamage === 200, `got ${result.burstDamage}`);
}

{
  // Ritual Burst T5A: detonationPerMinionMult — damage multiplied by minion count
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'd2', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
    { id: 'f1', type: 'fetish', hp: 50, maxHp: 50, damage: 0, attackInterval: 1.5, nextAttackAt: 0, expiresAt: 99999, element: 'physical', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink],
    damageMult: 1,
    activeMinions: dogs,
    graphMod: { detonationPerMinionMult: true } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // Base damage = 100+100+50 = 250. ×3 minions = 750.
  assert('Ritual Burst: detonation 250 × 3 minions = 750',
    result.burstDamage === 750, `got ${result.burstDamage}`);
}

{
  // Soul Sacrifice T6: detonationPerSoulStackBonus scales with soul_stack consumed
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const soulStack: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 4, maxStacks: 5, effect: { extraChains: 1 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink, soulStack],
    damageMult: 1,
    activeMinions: dogs,
    graphMod: { detonationPerSoulStackBonus: 25 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // Base 100 × (1 + 0.25 × 4 stacks) = 100 × 2.0 = 200
  assert('Soul Sacrifice: detonation 100 × (1 + 25% × 4 stacks) = 200',
    result.burstDamage === 200, `got ${result.burstDamage}`);
}

{
  // Resurgent Swarm T3a: on spirit_link consume, skillsToResetCd populated
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink],
    damageMult: 1,
    activeMinions: [],
    graphMod: { rawBehaviors: { resurgentSwarmSkills: ['staff_zombie_dogs', 'staff_fetish_swarm'] } } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Resurgent Swarm: skillsToResetCd includes both zombie_dogs + fetish_swarm',
    result.skillsToResetCd?.length === 2 &&
    result.skillsToResetCd.includes('staff_zombie_dogs') &&
    result.skillsToResetCd.includes('staff_fetish_swarm'));
}

{
  // LORD OF THE DEAD T7: resummonOnMassSacrifice after detonation
  const now = 10000;
  const spiritLink: ComboState = {
    stateId: 'spirit_link', sourceSkillId: 's', remainingDuration: 2, stacks: 1, maxStacks: 1, effect: { incDamage: 0 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 100, maxHp: 100, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [spiritLink],
    damageMult: 1,
    activeMinions: dogs,
    graphMod: { resummonOnMassSacrifice: true } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('LORD OF THE DEAD: resummons 2 dogs + 4 fetishes after detonation (6 minions)',
    result.activeMinions?.length === 6, `got ${result.activeMinions?.length}`);
}

{
  // Spectral Pact T2: hauntedConsumeSummonsSpirit — summons spirit on haunted consume
  const now = 10000;
  const haunted: ComboState = {
    stateId: 'haunted', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: { incDamage: 30, guaranteedCrit: true },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [haunted],
    damageMult: 1,
    activeMinions: [],
    graphMod: { hauntedConsumeSummonsSpirit: true } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Spectral Pact: MS consuming haunted summons a spirit',
    (result.activeMinions ?? []).some(m => m.type === 'spirit'));
}

section('Mass Sacrifice talents — Voodoo Master');

{
  // Hexbreaker T2: hexedConsumeMassSacrificeBonus — +50% extra when MS consumes hexed
  const now = 10000;
  const hexed: ComboState = {
    stateId: 'hexed', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: { incDamage: 100 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [hexed],
    damageMult: 1,
    activeMinions: [],
    graphMod: { hexedConsumeMassSacrificeBonus: 50 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // Hexed baseline +100% = ×2.0, MS hexed baseline +20% = ×1.2, Hexbreaker +50% = ×1.5
  // = 2.0 × 1.2 × 1.5 = 3.6 (no Final Sacrifice since only 1 state consumed)
  assert('Hexbreaker: MS + hexed = 2.0 × 1.2 × 1.5 = 3.6',
    near(result.damageMult, 3.6, 0.01), `got ${result.damageMult}`);
}

{
  // Sacrificial Wisdom T4: cdRefundPerStateConsumed
  const now = 10000;
  const states: ComboState[] = [
    { stateId: 'haunted', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: {} },
    { stateId: 'plagued', sourceSkillId: 's', remainingDuration: 6, stacks: 1, maxStacks: 1, effect: {} },
    { stateId: 'hexed', sourceSkillId: 's', remainingDuration: 5, stacks: 1, maxStacks: 1, effect: {} },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: states,
    damageMult: 1,
    activeMinions: [],
    graphMod: { cdRefundPerStateConsumed: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // 3 states × 15% = 45% CD refund
  assert('Sacrificial Wisdom: 3 states × 15% = 45% cdRefund',
    result.cdRefundPercent === 45, `got ${result.cdRefundPercent}`);
}

{
  // Endless Ritual T5A: soulStackDamagePerStack override (30% up from 15%)
  const now = 10000;
  const soulStack: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 5, maxStacks: 10, effect: { extraChains: 1 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_mass_sacrifice' },
    comboStates: [soulStack],
    damageMult: 1,
    activeMinions: [],
    graphMod: { soulStackDamagePerStack: 30 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // 5 stacks × 30% = +150% = ×2.5 (override kicks in, baseline 15%-per-stack code path skipped)
  // No Final Sacrifice since only 1 state consumed.
  assert('Endless Ritual: 5 soul_stacks × 30% = ×2.5',
    near(result.damageMult, 2.5, 0.01), `got ${result.damageMult}`);
}

{
  // Dog Tamer T3c: zombieDogAttackIntervalReduction — dogs attack faster
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { zombieDogAttackIntervalReduction: 1.0 } as any,
  };
  const result = staffModule.postCast!(ctx);
  // Baseline 2.5s - 1s = 1.5s
  assert('Dog Tamer r2: Zombie Dog attack interval reduced to 1.5s',
    (result.activeMinions ?? []).every(m => m.attackInterval === 1.5));
}

{
  // Minion Mastery T4b: minionDamageMult
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { minionDamageMult: 30 } as any,
  };
  const result = staffModule.postCast!(ctx);
  // Baseline damage = 0.85 × 100 = 85. +30% = 110.5.
  assert('Minion Mastery r2: Zombie Dog damage × 1.30',
    (result.activeMinions ?? []).every(m => near(m.damage, 110.5)));
}

// ════════════════════════════════════════════════════════════
// 11. Haunt talent tree — behavior verification
// ════════════════════════════════════════════════════════════
section('Haunt talents — Voodoo Master');

{
  // Weakening Touch T4: hauntedTargetHauntBonus only fires when target already carries Haunt debuff
  const now = 10000;
  const hauntedTarget = [{ debuffId: 'cold_dot', appliedBySkillId: 'staff_haunt', stacks: 1, remainingDuration: 4 }];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_haunt' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    targetDebuffs: hauntedTarget,
    graphMod: { hauntedTargetHauntBonus: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Weakening Touch: Haunt vs already-haunted target → damageMult ×1.15',
    near(result.damageMult, 1.15, 0.01), `got ${result.damageMult}`);
}

{
  // Weakening Touch does NOT fire when target is not haunted
  const now = 10000;
  const cleanTarget = [{ debuffId: 'poison', appliedBySkillId: 'staff_locust_swarm', stacks: 1, remainingDuration: 4 }];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_haunt' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    targetDebuffs: cleanTarget,
    graphMod: { hauntedTargetHauntBonus: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Weakening Touch: Haunt vs unhaunted target → no bonus (damageMult = 1.0)',
    near(result.damageMult, 1.0, 0.01), `got ${result.damageMult}`);
}

{
  // Weakening Touch should NOT fire on other staff skills (only staff_haunt)
  const now = 10000;
  const hauntedTarget = [{ debuffId: 'cold_dot', appliedBySkillId: 'staff_haunt', stacks: 1, remainingDuration: 4 }];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_spirit_barrage' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    targetDebuffs: hauntedTarget,
    graphMod: { hauntedTargetHauntBonus: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Weakening Touch: Spirit Barrage vs haunted target → no bonus (skill-scoped)',
    near(result.damageMult, 1.0, 0.01), `got ${result.damageMult}`);
}

// ════════════════════════════════════════════════════════════
// 12. Soul Harvest talent tree — behavior verification
// ════════════════════════════════════════════════════════════
section('Soul Harvest talents — stack scaling');

{
  // Stackbreaker T5A Voodoo Master: +30% damage per active soul_stack, 3 stacks = ×1.90
  const now = 10000;
  const stacks: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 3, maxStacks: 5, effect: { extraChains: 1 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    comboStates: [stacks],
    damageMult: 1,
    activeMinions: [],
    graphMod: { damagePerSoulStackActive: 30 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // 3 stacks × 30% = +90%, damageMult = 1.90
  assert('Stackbreaker: 3 soul_stacks × 30% → damageMult ×1.90',
    near(result.damageMult, 1.90, 0.001), `got ${result.damageMult}`);
}

{
  // Stackweaver T5A Plague Doctor: +15% damage per active soul_stack, 5 stacks = ×1.75
  const now = 10000;
  const stacks: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 5, maxStacks: 5, effect: { extraChains: 1 },
  };
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    comboStates: [stacks],
    damageMult: 1,
    activeMinions: [],
    graphMod: { damagePerSoulStackActive: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Stackweaver: 5 soul_stacks × 15% → damageMult ×1.75',
    near(result.damageMult, 1.75, 0.001), `got ${result.damageMult}`);
}

{
  // No soul_stacks → no bonus (guard against zero-case)
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    graphMod: { damagePerSoulStackActive: 30 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Stackbreaker with 0 soul_stacks → damageMult = 1.0',
    near(result.damageMult, 1.0, 0.001), `got ${result.damageMult}`);
}

section('Soul Harvest talents — Voodoo Master notables');

{
  // Double Harvest T4: crit Soul Harvest grants bonus stack → total 2 stacks
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    roll: { damage: 0, isHit: true, isCrit: true },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { soulHarvestCritBonusStacks: 1 } as any,
  };
  const result = staffModule.postCast!(ctx);
  const stackState = result.comboStates.find(s => s.stateId === 'soul_stack');
  assert('Double Harvest: crit Soul Harvest creates 2 stacks (1 base + 1 bonus)',
    stackState?.stacks === 2, `got ${stackState?.stacks}`);
}

{
  // Double Harvest: non-crit Soul Harvest doesn't grant bonus
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { soulHarvestCritBonusStacks: 1 } as any,
  };
  const result = staffModule.postCast!(ctx);
  const stackState = result.comboStates.find(s => s.stateId === 'soul_stack');
  assert('Double Harvest: non-crit Soul Harvest creates only 1 stack',
    stackState?.stacks === 1, `got ${stackState?.stacks}`);
}

{
  // Soul Drain T2: heal % of expected damage returned in preRoll
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    avgDamage: 100,
    graphMod: { soulHarvestDamageHealPercent: 10 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  // Expected heal ≈ 10% × 100 × damageMult(1) = 10
  assert('Soul Drain: heal = 10% × avgDamage × damageMult',
    near(result.healAmount ?? 0, 10, 0.5), `got ${result.healAmount}`);
}

section('Soul Harvest talents — Spirit Caller');

{
  // Soul Feast T2: Soul Harvest cast with 3 stacks → each minion heals 15% maxHp (5% per stack)
  const now = 10000;
  const stacks: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 3, maxStacks: 5, effect: { extraChains: 1 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 50, maxHp: 200, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [stacks],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: dogs,
    ailmentSnapshot: 0,
    graphMod: { soulStackConsumeHealsMinions: 5 } as any,
  };
  const result = staffModule.postCast!(ctx);
  // Base hp = 50, heal 5% × 3 = 15% of 200 = 30. New hp = 50 + 30 = 80.
  assert('Soul Feast: minion healed 15% max HP (5% × 3 stacks) → 50 + 30 = 80',
    near((result.activeMinions ?? [])[0]?.hp ?? 0, 80, 0.1),
    `got ${(result.activeMinions ?? [])[0]?.hp}`);
}

{
  // Soul Feast caps at max HP
  const now = 10000;
  const stacks: ComboState = {
    stateId: 'soul_stack', sourceSkillId: 's', remainingDuration: 10, stacks: 5, maxStacks: 5, effect: { extraChains: 1 },
  };
  const dogs: MinionState[] = [
    { id: 'd1', type: 'zombie_dog', hp: 180, maxHp: 200, damage: 0, attackInterval: 3, nextAttackAt: 0, expiresAt: 99999, element: 'chaos', sourceSkillId: 's' },
  ];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [stacks],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: dogs,
    ailmentSnapshot: 0,
    graphMod: { soulStackConsumeHealsMinions: 5 } as any,
  };
  const result = staffModule.postCast!(ctx);
  // 5 stacks × 5% = 25% of 200 = 50 heal. 180 + 50 = 230, capped at 200.
  assert('Soul Feast: heal caps at minion max HP (overflow clamps to 200)',
    near((result.activeMinions ?? [])[0]?.hp ?? 0, 200, 0.1),
    `got ${(result.activeMinions ?? [])[0]?.hp}`);
}

// ════════════════════════════════════════════════════════════
// 13. Zombie Dogs talent tree — behavior verification
// ════════════════════════════════════════════════════════════
section('Zombie Dogs talents');

{
  // Third Dog T4: extraZombieDogCount: 1 → summon 3 dogs instead of 2
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { extraZombieDogCount: 1 } as any,
  };
  const result = staffModule.postCast!(ctx);
  assert('Third Dog: extraZombieDogCount:1 summons 3 zombie dogs',
    (result.activeMinions ?? []).filter(m => m.type === 'zombie_dog').length === 3,
    `got ${(result.activeMinions ?? []).filter(m => m.type === 'zombie_dog').length}`);
}

{
  // Spirit Caller T5A Pack of Nine: +50% HP, +50% duration, +0.9s attack interval (slower)
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { minionHpMult: 50, minionDurationMult: 50, zombieDogAttackIntervalReduction: -0.9 } as any,
  };
  const result = staffModule.postCast!(ctx);
  const dogs = (result.activeMinions ?? []).filter(m => m.type === 'zombie_dog');
  // Base hp = 1000 × 0.2 = 200. +50% = 300.
  assert('Pack of Nine: Zombie Dogs HP ×1.5 (300)',
    dogs.every(m => near(m.hp, 300, 0.1)), `hp=${dogs[0]?.hp}`);
  // Base interval = 2.5s. Reduction = -0.9 → 2.5 - (-0.9) = 3.4s
  assert('Pack of Nine: Zombie Dogs attack interval +0.9s (3.4s)',
    dogs.every(m => near(m.attackInterval, 3.4, 0.01)), `interval=${dogs[0]?.attackInterval}`);
}

{
  // Hellhounds T5B: +100% damage, -50% duration
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { minionDamageMult: 100, minionDurationMult: -50 } as any,
  };
  const result = staffModule.postCast!(ctx);
  const dogs = (result.activeMinions ?? []).filter(m => m.type === 'zombie_dog');
  // Base damage = 100 × 0.85 = 85. +100% = 170.
  assert('Hellhounds: Zombie Dog damage ×2.0 (170)',
    dogs.every(m => near(m.damage, 170, 0.1)), `dmg=${dogs[0]?.damage}`);
}

{
  // Third Dog + Pack Leader stack: 3 dogs, each at base damage + 30% (Pack Leader T1a r2)
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_zombie_dogs' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { extraZombieDogCount: 1, minionDamageMult: 30 } as any,
  };
  const result = staffModule.postCast!(ctx);
  const dogs = (result.activeMinions ?? []).filter(m => m.type === 'zombie_dog');
  // Base damage = 100 × 0.85 = 85. +30% = 110.5.
  assert('Third Dog + Pack Leader combo: 3 dogs at 110.5 damage each',
    dogs.length === 3 && dogs.every(m => near(m.damage, 110.5, 0.1)),
    `count=${dogs.length}, dmg=${dogs[0]?.damage}`);
}

// ════════════════════════════════════════════════════════════
// 14. Fetish Swarm + Hex talents — new engine fields
// ════════════════════════════════════════════════════════════
section('Fetish Swarm + Hex talents');

{
  // Twin Fetish T2: extraFetishCount:1 → summon 5 fetishes instead of 4
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_fetish_swarm' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { extraFetishCount: 1 } as any,
  };
  const result = staffModule.postCast!(ctx);
  assert('Twin Fetish: extraFetishCount:1 summons 5 fetishes',
    (result.activeMinions ?? []).filter(m => m.type === 'fetish').length === 5,
    `got ${(result.activeMinions ?? []).filter(m => m.type === 'fetish').length}`);
}

{
  // FETISH LEGION T7: extraFetishCount:2 → 6 fetishes
  const now = 10000;
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_fetish_swarm' },
    roll: { damage: 0, isHit: true, isCrit: false },
    comboStates: [],
    bladeWardExpiresAt: 0, bladeWardHits: 0, activeTraps: [], activeMinions: [],
    ailmentSnapshot: 0,
    graphMod: { extraFetishCount: 2 } as any,
  };
  const result = staffModule.postCast!(ctx);
  assert('FETISH LEGION: extraFetishCount:2 summons 6 fetishes',
    (result.activeMinions ?? []).filter(m => m.type === 'fetish').length === 6,
    `got ${(result.activeMinions ?? []).filter(m => m.type === 'fetish').length}`);
}

{
  // Amplifying Curse T2: hexedTargetDamageAmp on already-hexed target
  const now = 10000;
  const hexedTarget = [{ debuffId: 'hexed', appliedBySkillId: 'staff_hex', stacks: 1, remainingDuration: 4 }];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_hex' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    targetDebuffs: hexedTarget,
    graphMod: { hexedTargetDamageAmp: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Amplifying Curse: Hex vs hexed target → damageMult ×1.15',
    near(result.damageMult, 1.15, 0.01), `got ${result.damageMult}`);
}

{
  // Amplifying Curse does NOT fire on unhexed target
  const now = 10000;
  const cleanTarget = [{ debuffId: 'poison', appliedBySkillId: 'staff_locust_swarm', stacks: 1, remainingDuration: 4 }];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_hex' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    targetDebuffs: cleanTarget,
    graphMod: { hexedTargetDamageAmp: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Amplifying Curse: Hex vs unhexed target → no bonus (damageMult = 1.0)',
    near(result.damageMult, 1.0, 0.01), `got ${result.damageMult}`);
}

{
  // Amplifying Curse is skill-scoped (only fires for staff_hex, not other skills)
  const now = 10000;
  const hexedTarget = [{ debuffId: 'hexed', appliedBySkillId: 'staff_hex', stacks: 1, remainingDuration: 4 }];
  const ctx: any = {
    ...mkCtxBase(now),
    skill: { id: 'staff_soul_harvest' },
    comboStates: [],
    damageMult: 1,
    activeMinions: [],
    targetDebuffs: hexedTarget,
    graphMod: { hexedTargetDamageAmp: 15 } as any,
  };
  const result = staffModule.preRoll!(ctx);
  assert('Amplifying Curse: Soul Harvest vs hexed target → no bonus (skill-scoped)',
    near(result.damageMult, 1.0, 0.01), `got ${result.damageMult}`);
}

// ════════════════════════════════════════════════════════════
// 10. Proc-spawned minions (summonMinion handler)
// ════════════════════════════════════════════════════════════
section('Proc-spawned minions + combo states');

{
  const procCtx: any = {
    isHit: true, isCrit: false, skillId: 'staff_haunt',
    effectiveMaxLife: PLAYER_MAX_HP, stats: {} as any,
    weaponAvgDmg: 0, weaponSpellPower: SPELL_POWER, damageMult: 1,
    now: 10000, lastProcTriggerAt: {},
  };

  // Spirit's Touch-style proc: summon 1 spirit_temp on cast, duration 3s
  const spiritProc = [{
    id: 'test_spirit_touch', trigger: 'onCast' as const, chance: 1.0,
    summonMinion: { type: 'spirit_temp', duration: 3 },
  }];
  const res = evaluateProcs(spiritProc, 'onCast', procCtx);
  assert("summonMinion proc: spirit_temp adds 1 minion to newMinions",
    res.newMinions.length === 1, `got ${res.newMinions.length}`);
  assert("summonMinion proc: minion HP = 10% player max (spirit_temp config)",
    res.newMinions[0]?.hp === PLAYER_MAX_HP * 0.10, `hp=${res.newMinions[0]?.hp}`);
  assert("summonMinion proc: minion damage = 25% spell power",
    res.newMinions[0]?.damage === SPELL_POWER * 0.25, `dmg=${res.newMinions[0]?.damage}`);
  assert("summonMinion proc: minion expires at now + duration*1000",
    res.newMinions[0]?.expiresAt === procCtx.now + 3000, `expiresAt=${res.newMinions[0]?.expiresAt}`);
  assert("summonMinion proc: minion element = cold (spirit_temp config)",
    res.newMinions[0]?.element === 'cold', `element=${res.newMinions[0]?.element}`);
  assert("summonMinion proc: minion sourceSkillId = proc skill context",
    res.newMinions[0]?.sourceSkillId === 'staff_haunt', `src=${res.newMinions[0]?.sourceSkillId}`);
  assert("summonMinion proc: minion attackInterval = 1.5s (spirit_temp config)",
    res.newMinions[0]?.attackInterval === 1.5, `interval=${res.newMinions[0]?.attackInterval}`);

  // createComboState proc: Soulshatter-style (Haunt crit → soul_stack)
  const comboProc = [{
    id: 'test_soulshatter', trigger: 'onCrit' as const, chance: 1.0,
    createComboState: { stateId: 'soul_stack', stacks: 1 },
  }];
  const critCtx = { ...procCtx, isCrit: true };
  const comboRes = evaluateProcs(comboProc, 'onCrit', critCtx);
  assert("createComboState proc: adds 1 entry to newComboStates",
    comboRes.newComboStates.length === 1, `got ${comboRes.newComboStates.length}`);
  assert("createComboState proc: stateId preserved",
    comboRes.newComboStates[0]?.stateId === 'soul_stack', `stateId=${comboRes.newComboStates[0]?.stateId}`);
  assert("createComboState proc: stacks default to 1",
    comboRes.newComboStates[0]?.stacks === 1, `stacks=${comboRes.newComboStates[0]?.stacks}`);

  // countOverride
  const multiProc = [{
    id: 'test_hive', trigger: 'onKill' as const, chance: 1.0,
    summonMinion: { type: 'spirit_temp', duration: 5, countOverride: 3 },
  }];
  const multiRes = evaluateProcs(multiProc, 'onKill', { ...procCtx, skillId: 'staff_locust_swarm' });
  assert("summonMinion proc: countOverride spawns N minions",
    multiRes.newMinions.length === 3, `got ${multiRes.newMinions.length}`);

  // Unknown minion type fails gracefully (no spawn)
  const badProc = [{
    id: 'test_bad', trigger: 'onCast' as const, chance: 1.0,
    summonMinion: { type: 'nonexistent_minion', duration: 3 },
  }];
  const badRes = evaluateProcs(badProc, 'onCast', procCtx);
  assert("summonMinion proc: unknown minion type spawns nothing (no crash)",
    badRes.newMinions.length === 0, `got ${badRes.newMinions.length}`);
}

// ════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
const total = passCount + failCount;
const color = failCount === 0 ? GREEN : RED;
console.log(`${color}Result: ${passCount}/${total} PASS${RESET}`);
if (failures.length > 0) {
  console.log(`${RED}Failures:${RESET}`);
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(failCount === 0 ? 0 : 1);

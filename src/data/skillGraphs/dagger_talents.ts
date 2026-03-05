// ============================================================
// Idle Exile — Dagger Talent Trees (7 active skills)
// Per-skill talent trees using the builder pattern.
// Data source: docs/weapon-designs/dagger.md v3.2
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree, type TalentBranchConfig } from './talentTreeBuilder';

// Omit helper for node configs
type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
type T5NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position' | 'exclusiveWith'>;

// ════════════════════════════════════════════════════════════
// SHARED NOTABLES (Section 5) — identical across all 7 skills
// ════════════════════════════════════════════════════════════

// --- Assassination Branch ---

const BLADE_SENSE: NC = {
  name: 'Blade Sense',
  description: '10% on hit → Predator (+50% crit mult, 3s). +4%/hit on same target (max 30%). +10% crit chance.',
  nodeType: 'notable', maxRank: 1, shared: true, procPattern: 'escalating',
  modifier: {
    incCritChance: 10,
    procs: [{
      id: 'blade_sense', chance: 0.10, trigger: 'onHit',
      applyBuff: { effect: { critMultiplierBonus: 50 }, duration: 3 },
    }],
  },
};

const EXPLOIT_WEAKNESS: NC = {
  name: 'Exploit Weakness',
  description: 'Crits apply Vulnerable (2s). +15% crit chance vs Vulnerable targets.',
  nodeType: 'notable', maxRank: 1, shared: true, procPattern: 'gated',
  modifier: {
    procs: [{
      id: 'exploit_weakness', chance: 1.0, trigger: 'onCrit',
      applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 },
    }],
    conditionalMods: [{
      condition: 'whileDebuffActive', modifier: { incCritChance: 15 },
    }],
  },
};

// --- Venomcraft Branch ---

const ENVENOM: NC = {
  name: 'Envenom',
  description: 'Guaranteed Poison on hit. At 3+ stacks: 25% Toxic Burst (50% current DoT). +10% poison duration.',
  nodeType: 'notable', maxRank: 1, shared: true, procPattern: 'gated',
  modifier: {
    procs: [
      { id: 'envenom_poison', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } },
      { id: 'envenom_burst', chance: 0.25, trigger: 'onHit' },
    ],
    debuffInteraction: { debuffDurationBonus: 10 },
  },
};

const DEEP_WOUNDS: NC = {
  name: 'Deep Wounds',
  description: 'Poison deals +25% damage. At 8+ stacks: Venom Frenzy (5s, +30% cast speed). ICD 20s.',
  nodeType: 'notable', maxRank: 1, shared: true, procPattern: 'state-shift',
  modifier: {
    debuffInteraction: { debuffEffectBonus: 25 },
    procs: [{
      id: 'deep_wounds_frenzy', chance: 1.0, trigger: 'onHit',
      applyBuff: { effect: { attackSpeedMult: 1.30 }, duration: 5 },
      internalCooldown: 20,
    }],
  },
};

// --- Shadow Dance Branch ---

const SHADOW_GUARD: NC = {
  name: 'Shadow Guard',
  description: 'Fortify on hit (1 stack, 5s, 3% DR). Dodge: 35% CD reset. +5 all resist.',
  nodeType: 'notable', maxRank: 1, shared: true, procPattern: 'cooldown',
  modifier: {
    fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 },
    procs: [{ id: 'shadow_guard_reset', chance: 0.35, trigger: 'onDodge', resetCooldown: 'self' }],
    abilityEffect: { resistBonus: 5 },
  },
};

const GHOST_STEP: NC = {
  name: 'Ghost Step',
  description: 'Dodge: heal 5% max HP. 3 dodges in 6s → Shadow Form (4s, 30% DR, hits Blind). ICD 15s.',
  nodeType: 'notable', maxRank: 1, shared: true, procPattern: 'state-shift',
  modifier: {
    procs: [
      { id: 'ghost_step_heal', chance: 1.0, trigger: 'onDodge', healPercent: 5 },
      {
        id: 'ghost_step_form', chance: 1.0, trigger: 'onDodge',
        applyBuff: { effect: { defenseMult: 1.30 }, duration: 4 },
        internalCooldown: 15,
      },
    ],
  },
};

// ════════════════════════════════════════════════════════════
// T5-T7 PER BRANCH (Section 7) — shared across all 7 skills
// ════════════════════════════════════════════════════════════

// --- Assassination T5-T7 ---

const ASSASSINATION_T5A: T5NC = {
  name: 'Precision Killer',
  description: 'Crits on Vulnerable → 30% free Stab. Crit cap at 60%.',
  nodeType: 'keystoneChoice', maxRank: 1,
  modifier: {
    procs: [{
      id: 'precision_killer', chance: 0.30, trigger: 'onCrit',
      castSkill: 'dagger_stab',
    }],
  },
};

const ASSASSINATION_T5B: T5NC = {
  name: 'Opportunist',
  description: 'On kill: First Blood on next enemy (+60% damage). -15% vs targets hit 3+ times.',
  nodeType: 'keystoneChoice', maxRank: 1,
  modifier: {
    procs: [{
      id: 'opportunist_firstblood', chance: 1.0, trigger: 'onKill',
      applyBuff: { effect: { damageMult: 1.60 }, duration: 10 },
    }],
    conditionalMods: [{
      condition: 'afterConsecutiveHits', threshold: 3,
      modifier: { incDamage: -15 },
    }],
  },
};

const ASSASSINATION_T6: NC = {
  name: 'Death Mark',
  description: 'On crit: 15% Death Mark (10s). Marked: next hit +100% damage, consumes.',
  nodeType: 'notable', maxRank: 1, procPattern: 'catastrophic',
  modifier: {
    procs: [{
      id: 'death_mark', chance: 0.15, trigger: 'onCrit',
      applyDebuff: { debuffId: 'deathMark', stacks: 1, duration: 10 },
    }],
    debuffInteraction: {
      bonusDamageVsDebuffed: { debuffId: 'deathMark', incDamage: 100 },
    },
  },
};

const ASSASSINATION_T7: NC = {
  name: 'DEATHBLOW',
  description: 'Assassinate = execute at 25% HP (500% wpn dmg). Crits = Mark only. -20% base damage.',
  nodeType: 'keystone', maxRank: 1,
  tensionWith: 'Death Mark',
  antiSynergy: ['Blade Sense'],
  synergy: ['Exploit Weakness', 'Precision Killer'],
  modifier: {
    executeThreshold: 25,
    incDamage: -20,
  },
};

// --- Venomcraft T5-T7 ---

const VENOMCRAFT_T5A: T5NC = {
  name: 'Toxic Mastery',
  description: 'Poison +10% per stack (mult. with Deep Wounds). +25% poison duration.',
  nodeType: 'keystoneChoice', maxRank: 1,
  modifier: {
    debuffInteraction: { debuffEffectBonus: 10, debuffDurationBonus: 25 },
  },
};

const VENOMCRAFT_T5B: T5NC = {
  name: 'Volatile Toxins',
  description: 'At 10+ poison stacks: 20% chance to detonate ALL for instant damage. Resets to 0.',
  nodeType: 'keystoneChoice', maxRank: 1,
  modifier: {
    procs: [{
      id: 'volatile_toxins', chance: 0.20, trigger: 'onHit',
    }],
  },
};

const VENOMCRAFT_T6: NC = {
  name: 'Pandemic',
  description: 'On kill: spread all debuffs to next enemy. Retain remaining duration.',
  nodeType: 'notable', maxRank: 1, procPattern: 'gated',
  modifier: {
    procs: [{
      id: 'pandemic', chance: 1.0, trigger: 'onKill',
    }],
    debuffInteraction: {
      spreadDebuffOnKill: { debuffIds: ['all'], refreshDuration: 0 },
    },
  },
};

const VENOMCRAFT_T7: NC = {
  name: 'PLAGUE LORD',
  description: 'Single debuff slot — one type, 3x effect, unlimited stacks. -15% base damage.',
  nodeType: 'keystone', maxRank: 1,
  tensionWith: 'Pandemic',
  antiSynergy: ['Pandemic'],
  synergy: ['Deep Wounds'],
  modifier: {
    debuffInteraction: { debuffEffectBonus: 200 },
    incDamage: -15,
  },
};

// --- Shadow Dance T5-T7 ---

const SHADOW_DANCE_T5A: T5NC = {
  name: 'Evasive Recovery',
  description: 'Dodge: heal 3% HP + 10% evasion→damage (3s). +5 all resist.',
  nodeType: 'keystoneChoice', maxRank: 1,
  modifier: {
    procs: [{
      id: 'evasive_recovery', chance: 1.0, trigger: 'onDodge',
      healPercent: 3,
      applyBuff: { effect: { damageMult: 1.10 }, duration: 3 },
    }],
    abilityEffect: { resistBonus: 5 },
  },
};

const SHADOW_DANCE_T5B: T5NC = {
  name: 'Counter Stance',
  description: 'Dodge: 75% wpn dmg counter. Below 40%: 225%. Ghost Step heal removed. +10% damage taken.',
  nodeType: 'keystoneChoice', maxRank: 1,
  modifier: {
    procs: [
      { id: 'counter_stance', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.75 } },
      { id: 'counter_stance_low', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 2.25 } },
    ],
    increasedDamageTaken: 10,
  },
};

const SHADOW_DANCE_T6: NC = {
  name: 'Phantom Stride',
  description: 'Dodge: 75% wpn dmg counter. Kill on counter: reset skill CD.',
  nodeType: 'notable', maxRank: 1, procPattern: 'cooldown',
  modifier: {
    procs: [
      { id: 'phantom_stride', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.75 } },
      { id: 'phantom_stride_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'self' },
    ],
  },
};

const SHADOW_DANCE_T7: NC = {
  name: 'SHADOW SOVEREIGN',
  description: 'Counter = 200% wpn dmg. No dodge heal. Dodge procs 2x. -10% max life.',
  nodeType: 'keystone', maxRank: 1,
  tensionWith: 'Phantom Stride',
  antiSynergy: ['Ghost Step'],
  synergy: ['Shadow Guard'],
  modifier: {
    reducedMaxLife: 10,
  },
};

// ════════════════════════════════════════════════════════════
// BRANCH FACTORY — assembles shared + skill-specific nodes
// ════════════════════════════════════════════════════════════

/**
 * Create an Assassination branch config with skill-specific behavior nodes.
 */
function assassinationBranch(behavior: TalentBranchConfig['behaviorNodes']): TalentBranchConfig {
  return {
    name: 'Assassination', description: 'Crit, burst, execute',
    t2Notable: BLADE_SENSE, t4Notable: EXPLOIT_WEAKNESS,
    behaviorNodes: behavior,
    t5a: ASSASSINATION_T5A, t5b: ASSASSINATION_T5B,
    t6Notable: ASSASSINATION_T6, t7Keystone: ASSASSINATION_T7,
  };
}

/**
 * Create a Venomcraft branch config with skill-specific behavior nodes.
 */
function venomcraftBranch(behavior: TalentBranchConfig['behaviorNodes']): TalentBranchConfig {
  return {
    name: 'Venomcraft', description: 'Poison, DoT, debuffs',
    t2Notable: ENVENOM, t4Notable: DEEP_WOUNDS,
    behaviorNodes: behavior,
    t5a: VENOMCRAFT_T5A, t5b: VENOMCRAFT_T5B,
    t6Notable: VENOMCRAFT_T6, t7Keystone: VENOMCRAFT_T7,
  };
}

/**
 * Create a Shadow Dance branch config with skill-specific behavior nodes.
 */
function shadowDanceBranch(behavior: TalentBranchConfig['behaviorNodes']): TalentBranchConfig {
  return {
    name: 'Shadow Dance', description: 'Evasion, defense, combos',
    t2Notable: SHADOW_GUARD, t4Notable: GHOST_STEP,
    behaviorNodes: behavior,
    t5a: SHADOW_DANCE_T5A, t5b: SHADOW_DANCE_T5B,
    t6Notable: SHADOW_DANCE_T6, t7Keystone: SHADOW_DANCE_T7,
  };
}

// ════════════════════════════════════════════════════════════
// BEHAVIOR NODE HELPER — shorthand for maxRank:2 behavior nodes
// ════════════════════════════════════════════════════════════

function bh(
  name: string, description: string,
  modifier: NC['modifier'],
  perRankModifiers?: NC['perRankModifiers'],
): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

// ════════════════════════════════════════════════════════════
// STAB TALENT TREE (Section 6 + Section 8)
// ════════════════════════════════════════════════════════════

export const STAB_TALENT_TREE = createTalentTree({
  skillId: 'dagger_stab', prefix: 'st',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Puncture', 'Each hit adds Puncture stack (max 3). At max: guaranteed crit. R2: max 2.',
        { procs: [{ id: 'st_puncture', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t1b: bh('Tunnel Vision', '+5% crit/consecutive hit on same target (max 4). R2: +7%.',
        { incCritChance: 5 },
        { 1: { incCritChance: 5 }, 2: { incCritChance: 7 } }),
      t2b: bh('Honed Instincts', 'After crit: +8% crit mult 2s (stacks 2x). R2: 3s, stacks 3x.',
        { incCritMultiplier: 8 },
        { 1: { incCritMultiplier: 8 }, 2: { incCritMultiplier: 8 } }),
      t3a: bh('Backstab Setup', '+12% crit vs Vulnerable. R2: +18%.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 12 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 12 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 18 } }] } }),
      t3b: bh('Relentless Pursuit', 'On kill: free cast within 3s. R2: 5s window.',
        { procs: [{ id: 'st_relentless', chance: 1.0, trigger: 'onKill' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Lethal Rhythm', 'Every 3rd hit on same target: +30% damage. R2: every 2nd.',
        { incDamage: 30 },
        { 1: { incDamage: 30 }, 2: { incDamage: 30 } }),
      t4b: bh('Predator\'s Mark', 'In Predator: 20% double strike (60% wpn dmg). R2: 35%.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { } }] },
        { 1: { }, 2: { } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Envenomed Blade', 'Each Stab applies 1 poison. R2: every 3rd applies 2.',
        { procs: [{ id: 'st_envblade', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] },
        { 1: { }, 2: { } }),
      t1b: bh('Toxic Strikes', '+10% damage vs poisoned. R2: +15% and +5% crit.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 10 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 10 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 15, incCritChance: 5 } }] } }),
      t2b: bh('Lingering Venom', 'Poison lasts +1s. R2: +2s and 10% spread on tick.',
        { debuffInteraction: { debuffDurationBonus: 10 } },
        { 1: { debuffInteraction: { debuffDurationBonus: 10 } },
          2: { debuffInteraction: { debuffDurationBonus: 20 } } }),
      t3a: bh('Virulent Threshold', 'At 5+ poison stacks: +20% damage. R2: threshold 3.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] } }),
      t3b: bh('Toxic Transfer', 'On kill: transfer 50% poison stacks. R2: 100%.',
        { procs: [{ id: 'st_toxtrans', chance: 1.0, trigger: 'onKill' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Venom Burst', 'At 8+ stacks: consume 4 for 60% DoT as instant. R2: consume 3.',
        { procs: [{ id: 'st_venomburst', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t4b: bh('Frenzy Strikes', 'During Venom Frenzy: +20% attack speed. R2: +1 poison/hit.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incCastSpeed: 20 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incCastSpeed: 20 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incCastSpeed: 20 } }] } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Defensive Instinct', '+2 life on hit. R2: +3% evasion 2s per hit.',
        { lifeOnHit: 2 },
        { 1: { lifeOnHit: 2 }, 2: { lifeOnHit: 2, damageFromEvasion: 3 } }),
      t1b: bh('Combat Leech', '3% damage leeched as life. R2: 5%, persists 1s.',
        { leechPercent: 3 },
        { 1: { leechPercent: 3 }, 2: { leechPercent: 5 } }),
      t2b: bh('Reactive Footwork', 'Dodge after Stab: free cast. R2: +15% damage.',
        { procs: [{ id: 'st_reactive', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3a: bh('Counter Stab', 'Dodge: 30% wpn dmg counter. R2: +20% crit chance.',
        { procs: [{ id: 'st_counter', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.30 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Second Wind', 'Dodge: heal 2% HP. R2: +10% evasion 3s.',
        { procs: [{ id: 'st_secondwind', chance: 1.0, trigger: 'onDodge', healPercent: 2 }] },
        { 1: { procs: [{ id: 'st_secondwind', chance: 1.0, trigger: 'onDodge', healPercent: 2 }] },
          2: { procs: [{ id: 'st_secondwind', chance: 1.0, trigger: 'onDodge', healPercent: 2 }] } }),
      t3c: bh('Combat Flow', 'Dodge: reduce Stab CD 0.5s. R2: reduce 1s.',
        { cooldownReduction: 5 },
        { 1: { cooldownReduction: 5 }, 2: { cooldownReduction: 10 } }),
      t4b: bh('Shadow Strikes', 'In Shadow Form: Stab applies Blind (1s). R2: +1 Fortify/hit.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { } }] },
        { 1: { }, 2: { } }),
    }),
  ],
});

// ════════════════════════════════════════════════════════════
// BLADE FLURRY TALENT TREE (Section 8)
// ════════════════════════════════════════════════════════════

export const BLADE_FLURRY_TALENT_TREE = createTalentTree({
  skillId: 'dagger_blade_flurry', prefix: 'bf',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Accelerating Cuts', '+4% crit per hit in cast. R2: +6%.',
        { incCritChance: 4 },
        { 1: { incCritChance: 4 }, 2: { incCritChance: 6 } }),
      t1b: bh('Blade Dance', 'Cast within 2s of last BF = Combo: +15% crit. R2: +10% crit mult.',
        { incCritChance: 15 },
        { 1: { incCritChance: 15 }, 2: { incCritChance: 15, incCritMultiplier: 10 } }),
      t2b: bh('Precision Cuts', '+4% crit mult per hit for 3s. R2: persists until non-BF cast.',
        { incCritMultiplier: 4 },
        { 1: { incCritMultiplier: 4 }, 2: { incCritMultiplier: 4 } }),
      t3a: bh('Full Flurry', '3+ hits: final hit applies Vulnerable (1s). R2: +25% final hit damage.',
        { procs: [{ id: 'bf_fullflurry', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 1 } }] },
        { 1: { }, 2: { incDamage: 25 } }),
      t3b: bh('Whirlwind Combo', 'Rapid combo (1.5s): +1 bonus hit. R2: bonus hit 80% wpn dmg.',
        { extraHits: 1 },
        { 1: { extraHits: 1 }, 2: { extraHits: 1 } }),
      t3c: bh('Escalating Cuts', '+8% damage per hit in cast. R2: carries to next cast 3s.',
        { rampingDamage: { perHit: 8, maxStacks: 5, decayAfter: 3 } },
        { 1: { rampingDamage: { perHit: 8, maxStacks: 5, decayAfter: 3 } },
          2: { rampingDamage: { perHit: 8, maxStacks: 5, decayAfter: 6 } } }),
      t4b: bh('Predator\'s Flurry', 'In Predator: +1 extra hit. R2: extra hit +20% crit.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { extraHits: 1 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { extraHits: 1 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { extraHits: 1, incCritChance: 20 } }] } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Toxic Flurry', 'Each hit applies 1 poison. R2: all 3 on poisoned = +2 bonus.',
        { procs: [{ id: 'bf_toxflurry', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] },
        { 1: { }, 2: { } }),
      t1b: bh('Corroding Cuts', 'Each hit vs poisoned extends poison +0.5s. R2: +0.3s per extra hit.',
        { debuffInteraction: { debuffDurationBonus: 5 } },
        { 1: { debuffInteraction: { debuffDurationBonus: 5 } },
          2: { debuffInteraction: { debuffDurationBonus: 8 } } }),
      t2b: bh('Accelerating Toxin', '+3% cast speed per poison stack (max +15%). R2: max +25%.',
        { incCastSpeed: 3 },
        { 1: { incCastSpeed: 3 }, 2: { incCastSpeed: 5 } }),
      t3a: bh('Overwhelming Venom', '5+ stacks: final hit Weakened (2s). R2: threshold 3.',
        { procs: [{ id: 'bf_overwhelm', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Hemorrhagic Poison', 'On kill: spread 2 poison stacks. R2: spread 4.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 0 } } },
        { 1: { }, 2: { } }),
      t3c: bh('Chain Reaction', '8+ stacks: +1 extra hit. R2: threshold 6.',
        { extraHits: 1 },
        { 1: { extraHits: 1 }, 2: { extraHits: 1 } }),
      t4b: bh('Venom Whirlwind', 'Venom Frenzy: +1 hit per cast. R2: each extra hit +1 poison.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { extraHits: 1 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { extraHits: 1 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { extraHits: 1 } }] } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Guarded Flurry', '+1 life on hit per hit (3 hits = 3 heals). R2: +2% DR 2s per hit.',
        { lifeOnHit: 1 },
        { 1: { lifeOnHit: 1 }, 2: { lifeOnHit: 1 } }),
      t1b: bh('Momentum Leech', 'Hit vs Blinded: +5% evasion 2s. R2: +3% damage per Blinded hit.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { damageFromEvasion: 5 } }] },
        { 1: { }, 2: { } }),
      t2b: bh('Blade Shield', 'Dodge after BF: next cast +1 hit. R2: extra hit +20% damage.',
        { procs: [{ id: 'bf_bladeshield', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3a: bh('Whirling Counter', 'Dodge: 25% wpn dmg per recent BF hit (max 75%). R2: 15% Blind.',
        { procs: [{ id: 'bf_whirlcounter', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.75 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Defensive Rhythm', 'Dodge: +1 Fortify + 10% DR 2s. R2: Fortify +3s.',
        { procs: [{ id: 'bf_defrhythm', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Rapid Recovery', 'Dodge: reduce BF CD 0.8s. R2: 1.2s.',
        { cooldownReduction: 8 },
        { 1: { cooldownReduction: 8 }, 2: { cooldownReduction: 12 } }),
      t4b: bh('Shadow Flurry', 'Shadow Form: BF cast speed +25%. R2: +10% crit during Shadow Form.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { incCastSpeed: 25 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { incCastSpeed: 25 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { incCastSpeed: 25, incCritChance: 10 } }] } }),
    }),
  ],
});

// ════════════════════════════════════════════════════════════
// FROST FAN TALENT TREE (Section 8)
// ════════════════════════════════════════════════════════════

export const FROST_FAN_TALENT_TREE = createTalentTree({
  skillId: 'dagger_fan_of_knives', prefix: 'ff',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Spreading Chill', '+4% crit per target hit (max +20%). R2: +6%.',
        { incCritChance: 4 },
        { 1: { incCritChance: 4 }, 2: { incCritChance: 6 } }),
      t1b: bh('Piercing Toxin', 'After 2+ pierces: final target +25% crit. R2: threshold 1.',
        { incCritChance: 25 },
        { 1: { incCritChance: 25 }, 2: { incCritChance: 25 } }),
      t2b: bh('Frozen Focus', '+8% crit mult vs Chilled. R2: +12% and crits extend Chill 1s.',
        { incCritMultiplier: 8 },
        { 1: { incCritMultiplier: 8 }, 2: { incCritMultiplier: 12 } }),
      t3a: bh('Shatter Point', '3+ pierces: guaranteed crit on final. R2: 2+ pierces.',
        { incCritChance: 100 },
        { 1: { }, 2: { } }),
      t3b: bh('Crossfire', '2+ projectiles on same enemy: guaranteed crit. R2: +20% damage.',
        { incCritChance: 100 },
        { 1: { }, 2: { incDamage: 20 } }),
      t3c: bh('Blizzard Barrage', '+5% damage per enemy hit. R2: +8%, Chilled count as 2.',
        { incDamage: 5 },
        { 1: { incDamage: 5 }, 2: { incDamage: 8 } }),
      t4b: bh('Predator\'s Frost', 'In Predator: +1 pierce. R2: pierced gain Vulnerable (1s).',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { pierceCount: 1 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { pierceCount: 1 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { pierceCount: 1 } }] } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Toxic Frost', 'Each target hit gains 1 poison. R2: 2+ projectiles = 2 stacks.',
        { procs: [{ id: 'ff_toxfrost', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] },
        { 1: { }, 2: { } }),
      t1b: bh('Plague Scatter', 'AoE vs poisoned spreads 1 stack to adjacent. R2: 2 stacks +0.5s.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 0 } } },
        { 1: { }, 2: { } }),
      t2b: bh('Festering Chill', 'Poisoned hit by Frost Fan = Chilled (2s). R2: 3s, +10% DoT vs Chilled.',
        { procs: [{ id: 'ff_festchill', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] },
        { 1: { }, 2: { } }),
      t3a: bh('Noxious Cloud', '5+ stacks: Frost Fan creates poison zone (3s). R2: 5s.',
        { procs: [{ id: 'ff_noxcloud', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t3b: bh('Pandemic Breeze', 'On kill: spread all poison to same-cast targets. R2: refresh duration.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 0 } } },
        { 1: { }, 2: { } }),
      t3c: bh('Toxic Detonation', '8+ stacks: consume 4 for AoE burst (40% DoT). R2: consume 3, bigger.',
        { procs: [{ id: 'ff_toxdet', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t4b: bh('Venom Gale', 'Venom Frenzy: +1 pierce. R2: pierced get +1 poison.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { pierceCount: 1 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { pierceCount: 1 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { pierceCount: 1 } }] } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Frost Ward', '+3 life on hit. R2: +5 all resist 3s after cast.',
        { lifeOnHit: 3 },
        { 1: { lifeOnHit: 3 }, 2: { lifeOnHit: 3 } }),
      t1b: bh('Chilling Defense', 'Hit enemies deal -5% damage 3s. R2: -8% and -10% attack speed.',
        { incDamage: -5 },
        { 1: { }, 2: { } }),
      t2b: bh('Evasive Scatter', 'Dodge: +10% proj speed +1 pierce 3s. R2: +15% Frost Fan damage.',
        { procs: [{ id: 'ff_evscatter', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3a: bh('Frozen Counter', 'Dodge: mini Frost Fan (50% damage, 1 proj). R2: 2 projectiles.',
        { procs: [{ id: 'ff_frozenctr', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Cold', scaleStat: 'weaponDamage', scaleRatio: 0.50 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Ice Barrier', 'Dodge: +15% cold resist +5% DR 3s. R2: 5s + heal 2%.',
        { procs: [{ id: 'ff_icebarrier', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Blizzard Step', 'Dodge: reduce Frost Fan CD 1s. R2: +1 target count.',
        { cooldownReduction: 10 },
        { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 10 } }),
      t4b: bh('Shadow Frost', 'Shadow Form: Frost Fan guarantees Chill (2s). R2: Chilled take +15%.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { } }] },
        { 1: { }, 2: { } }),
    }),
  ],
});

// ════════════════════════════════════════════════════════════
// VIPER STRIKE TALENT TREE (Section 8)
// ════════════════════════════════════════════════════════════

export const VIPER_STRIKE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_viper_strike', prefix: 'vs',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Toxic Precision', '+8% crit at 3+ poison stacks. R2: threshold 2.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 8 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 8 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 8 } }] } }),
      t1b: bh('Venom Surge', 'Poison tick: 15% → +5% crit 2s (stacks 3x). R2: persists until next skill.',
        { procs: [{ id: 'vs_venomsurge', chance: 0.15, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t2b: bh('Critical Infection', 'Crits vs poisoned: +1 poison stack. R2: also Weakened (1s).',
        { procs: [{ id: 'vs_critinfect', chance: 1.0, trigger: 'onCrit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] },
        { 1: { }, 2: { } }),
      t3a: bh('Lethal Dose', '5+ poison stacks: crits +20% damage. R2: threshold 3.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] } }),
      t3b: bh('Toxic Detonation', 'Poison expiry: 40% remaining DoT as burst. R2: reapply 2 stacks.',
        { procs: [{ id: 'vs_toxdet', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Festering Wounds', '+4% damage per poison stack on target. R2: also applies to DoT ticks.',
        { incDamage: 4 },
        { 1: { incDamage: 4 }, 2: { incDamage: 4 } }),
      t4b: bh('Predator\'s Venom', 'In Predator: poison ticks +30%. R2: extends poison +1s.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { debuffInteraction: { debuffEffectBonus: 30 } } }] },
        { 1: { }, 2: { } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Deep Injection', '+1 extra poison per hit (total 2). R2: +2 extra (total 3).',
        { procs: [{ id: 'vs_deepinj', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 2, duration: 3 } }] },
        { 1: { procs: [{ id: 'vs_deepinj', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 2, duration: 3 } }] },
          2: { procs: [{ id: 'vs_deepinj', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 3, duration: 3 } }] } }),
      t1b: bh('Concentrated Toxin', 'Poison +3% per stack (mult. Deep Wounds). R2: +5%.',
        { debuffInteraction: { debuffEffectBonus: 3 } },
        { 1: { debuffInteraction: { debuffEffectBonus: 3 } },
          2: { debuffInteraction: { debuffEffectBonus: 5 } } }),
      t2b: bh('Venomous Mastery', 'Base DoT 25% → 30%. R2: 35%, 10% tick → +1 stack.',
        { incDamage: 5 },
        { 1: { incDamage: 5 }, 2: { incDamage: 10 } }),
      t3a: bh('Virulent Cascade', '5+ stacks: hits apply Weakened (1s). R2: also Cursed (1s).',
        { procs: [{ id: 'vs_vircascade', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 1 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Toxic Inheritance', 'On kill: transfer ALL poison with full duration. R2: +20% damage.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 1 } } },
        { 1: { }, 2: { } }),
      t3c: bh('Venom Eruption', '10+ stacks: consume 5 for 80% DoT burst. R2: consume 4, apply Vulnerable.',
        { procs: [{ id: 'vs_venerupt', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t4b: bh('Venomous Frenzy', 'Venom Frenzy: DoT% → 40%. R2: 20% tick → +1 stack.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incDamage: 15 } }] },
        { 1: { }, 2: { } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Venomous Defense', '+2 life on hit. R2: +1 per poison stack (max +5).',
        { lifeOnHit: 2 },
        { 1: { lifeOnHit: 2 }, 2: { lifeOnHit: 2 } }),
      t1b: bh('Toxic Resilience', '3+ poison stacks: +5% evasion. R2: +8% evasion +3% DR.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { damageFromEvasion: 5 } }] },
        { 1: { }, 2: { } }),
      t2b: bh('Serpent\'s Dodge', 'Dodge: next VS applies +2 poison. R2: +3, +15% DoT snapshot.',
        { procs: [{ id: 'vs_serpdodge', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3a: bh('Venomous Counter', 'Dodge: 35% wpn dmg counter + 1 poison. R2: 2 poison.',
        { procs: [{ id: 'vs_vencounter', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.35 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Regenerative Toxin', 'Dodge at 5+ stacks: heal 3% HP. R2: threshold 3.',
        { procs: [{ id: 'vs_regentox', chance: 1.0, trigger: 'onDodge', healPercent: 3 }] },
        { 1: { }, 2: { } }),
      t3c: bh('Serpent Flow', 'Dodge: reduce VS CD 0.5s. R2: also extend poison +0.5s.',
        { cooldownReduction: 5 },
        { 1: { cooldownReduction: 5 }, 2: { cooldownReduction: 5 } }),
      t4b: bh('Serpent\'s Shadow', 'Shadow Form: VS DoT ticks Blind (0.5s). R2: DoT +20%.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { } }] },
        { 1: { }, 2: { } }),
    }),
  ],
});

// ════════════════════════════════════════════════════════════
// SHADOW STEP TALENT TREE (Section 8)
// ════════════════════════════════════════════════════════════

export const SHADOW_STEP_TALENT_TREE = createTalentTree({
  skillId: 'dagger_smoke_screen', prefix: 'ss',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Shadow Surge', 'Stealth charge: +15% crit 2s. R2: +10% crit mult per charge.',
        { incCritChance: 15 },
        { 1: { incCritChance: 15 }, 2: { incCritChance: 15, incCritMultiplier: 10 } }),
      t1b: bh('Lurking Death', '+5% damage per second in Stealth (max +25%). R2: max +40%.',
        { rampingDamage: { perHit: 5, maxStacks: 5, decayAfter: 0 } },
        { 1: { rampingDamage: { perHit: 5, maxStacks: 5, decayAfter: 0 } },
          2: { rampingDamage: { perHit: 5, maxStacks: 8, decayAfter: 0 } } }),
      t2b: bh('Unseen Blade', 'From Stealth: +20% crit. R2: guaranteed crit from Stealth.',
        { incCritChance: 20 },
        { 1: { incCritChance: 20 }, 2: { incCritChance: 100 } }),
      t3a: bh('Ambush Protocol', 'Stealth charge: 30% Vulnerable (2s). R2: 50%.',
        { procs: [{ id: 'ss_ambush', chance: 0.30, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] },
        { 1: { procs: [{ id: 'ss_ambush', chance: 0.30, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] },
          2: { procs: [{ id: 'ss_ambush', chance: 0.50, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } }),
      t3b: bh('Ghost Predator', 'Kill from Stealth: regain 1 charge. R2: +15% damage 3s on regain.',
        { procs: [{ id: 'ss_ghostpred', chance: 1.0, trigger: 'onKill' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Patient Shadow', 'Each second in Stealth: +8% crit mult (max +40%). R2: max +60%.',
        { incCritMultiplier: 8 },
        { 1: { incCritMultiplier: 8 }, 2: { incCritMultiplier: 8 } }),
      t4b: bh('Predator\'s Cloak', 'In Predator: Stealth charges 50% slower. R2: restore 1 charge.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { } }] },
        { 1: { }, 2: { } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Shadow Venom', 'Shadow Step applies 2 poison. R2: from Stealth = 4.',
        { procs: [{ id: 'ss_shadvenom', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 2, duration: 3 } }] },
        { 1: { procs: [{ id: 'ss_shadvenom', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 2, duration: 3 } }] },
          2: { procs: [{ id: 'ss_shadvenom', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 4, duration: 3 } }] } }),
      t1b: bh('Insidious Strike', '+12% damage vs poisoned. R2: +18%, crits grant +1 Stealth.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 12 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 12 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 18 } }] } }),
      t2b: bh('Creeping Darkness', 'Poison from SS has +2s duration. R2: +3s, 20% stronger.',
        { debuffInteraction: { debuffDurationBonus: 20 } },
        { 1: { debuffInteraction: { debuffDurationBonus: 20 } },
          2: { debuffInteraction: { debuffDurationBonus: 30 } } }),
      t3a: bh('Toxic Ambush', '5+ stacks: SS from Stealth +30% damage. R2: threshold 3.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 30 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Plague Assassin', 'On kill: spread 3 poison. R2: regain 1 Stealth charge.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 0 } } },
        { 1: { }, 2: { } }),
      t3c: bh('Festering Shadow', '8+ stacks: consume 4 → Vulnerable (3s) + Cursed (3s). R2: consume 3.',
        { procs: [{ id: 'ss_festshad', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t4b: bh('Shadow Frenzy', 'Venom Frenzy: SS CD -1s. R2: +1 Stealth charge per cast.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { cooldownReduction: 10 } }] },
        { 1: { }, 2: { } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Phase Shift', 'SS cast counts as dodge for procs. R2: +15% evasion 2s.',
        { damageFromEvasion: 5 },
        { 1: { }, 2: { } }),
      t1b: bh('Shadow Counter', 'Dodge within 2s of SS: +25% counter damage. R2: +40%, Blind.',
        { procs: [{ id: 'ss_shadcounter', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t2b: bh('Flickering Shadow', 'Dodge within 3s of SS: +1 Stealth charge. R2: +20% damage 2s.',
        { procs: [{ id: 'ss_flickshad', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3a: bh('Phantom Strike', 'Dodge: 40% wpn dmg counter from stealth. R2: guaranteed crit.',
        { procs: [{ id: 'ss_phantstrike', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.40 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Vanishing Act', 'Dodge: +20% evasion +10% DR 3s. R2: 5s duration.',
        { procs: [{ id: 'ss_vanishact', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Shadow Tempo', 'Dodge: reduce SS CD 0.8s. R2: 1.2s.',
        { cooldownReduction: 8 },
        { 1: { cooldownReduction: 8 }, 2: { cooldownReduction: 12 } }),
      t4b: bh('Spectral Shadow', 'Shadow Form: SS costs no CD. R2: +1 Stealth per SS cast.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { cooldownReduction: 100 } }] },
        { 1: { }, 2: { } }),
    }),
  ],
});

// ════════════════════════════════════════════════════════════
// ASSASSINATE TALENT TREE (Section 8)
// ════════════════════════════════════════════════════════════

export const ASSASSINATE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_assassinate', prefix: 'as',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Finishing Blow', '+15% crit vs below 50% HP. R2: threshold 60%.',
        { conditionalMods: [{ condition: 'whileLowHp', modifier: { incCritChance: 15 } }] },
        { 1: { }, 2: { } }),
      t1b: bh('Patient Predator', '+10% crit per second of cast time (max +20%). R2: +15% crit mult/s.',
        { incCritChance: 10 },
        { 1: { incCritChance: 10 }, 2: { incCritChance: 10, incCritMultiplier: 15 } }),
      t2b: bh('Executioner\'s Focus', 'After Assassinate crits: +12% crit mult 4s. R2: 6s, stacks 2x.',
        { incCritMultiplier: 12 },
        { 1: { incCritMultiplier: 12 }, 2: { incCritMultiplier: 12 } }),
      t3a: bh('Charged Execution', '+5% damage per second on CD (max +40%). R2: max +60%.',
        { incDamage: 5 },
        { 1: { incDamage: 5 }, 2: { incDamage: 5 } }),
      t3b: bh('Death\'s Opportunity', 'On kill: reduce Assassinate CD 2s. R2: Vulnerable kill = full reset.',
        { procs: [{ id: 'as_deathsopp', chance: 1.0, trigger: 'onKill' }] },
        { 1: { }, 2: { } }),
      t3c: bh('Mercy Threshold', '+25% damage vs below 40% HP. R2: threshold 50%.',
        { executeThreshold: 40, incDamage: 25 },
        { 1: { executeThreshold: 40, incDamage: 25 },
          2: { executeThreshold: 50, incDamage: 25 } }),
      t4b: bh('Predator\'s Judgment', 'In Predator: 20% faster Assassinate. R2: +0.3 weapon%.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { incCastSpeed: 20 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { incCastSpeed: 20 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { incCastSpeed: 20, incDamage: 30 } }] } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Toxic Execution', 'Assassinate applies 3 poison. R2: 5 stacks.',
        { procs: [{ id: 'as_toxexec', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 3, duration: 3 } }] },
        { 1: { procs: [{ id: 'as_toxexec', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 3, duration: 3 } }] },
          2: { procs: [{ id: 'as_toxexec', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 5, duration: 3 } }] } }),
      t1b: bh('Venom Amplifier', '+15% damage vs poisoned. R2: +25%, +5% per stack (max +25%).',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 15 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 15 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 25 } }] } }),
      t2b: bh('Envenom Strike', 'High weapon%: +15% poison snapshot. R2: +25%.',
        { debuffInteraction: { debuffEffectBonus: 15 } },
        { 1: { debuffInteraction: { debuffEffectBonus: 15 } },
          2: { debuffInteraction: { debuffEffectBonus: 25 } } }),
      t3a: bh('Lethal Dose', '5+ stacks: +20% damage. R2: threshold 3.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incDamage: 20 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Plague Finisher', 'Kill: spread all debuffs to next enemy. R2: refresh duration.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['all'], refreshDuration: 0 } } },
        { 1: { }, 2: { } }),
      t3c: bh('Toxic Overload', '8+ stacks: consume all for +5% per stack. R2: +8% per stack.',
        { procs: [{ id: 'as_toxoverload', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t4b: bh('Venomous Judgment', 'Venom Frenzy: Assassinate CD -2s. R2: +0.2 weapon% during Frenzy.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { cooldownReduction: 20 } }] },
        { 1: { }, 2: { } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Calculated Strike', '+4 life on hit. R2: doubles vs below 50% HP.',
        { lifeOnHit: 4 },
        { 1: { lifeOnHit: 4 }, 2: { lifeOnHit: 4 } }),
      t1b: bh('Fortified Execution', 'Assassinate hit: +2 Fortify (5s). R2: +3, duration +2s.',
        { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 3 } },
        { 1: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 3 } },
          2: { fortifyOnHit: { stacks: 3, duration: 7, damageReduction: 3 } } }),
      t2b: bh('Patient Counter', 'Dodge: +10% Assassinate damage 4s (stacks 2x). R2: stacks 3x.',
        { procs: [{ id: 'as_patcounter', chance: 1.0, trigger: 'onDodge', applyBuff: { effect: { damageMult: 1.10 }, duration: 4 } }] },
        { 1: { }, 2: { } }),
      t3a: bh('Executioner\'s Counter', 'Dodge: 40% wpn dmg counter (+100% vs below 25%). R2: 30%.',
        { procs: [{ id: 'as_execcounter', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Physical', scaleStat: 'weaponDamage', scaleRatio: 0.40 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Death\'s Reprieve', 'Dodge: heal 4% HP +10% DR 2s. R2: heal 6%, reduce Assassinate CD 1s.',
        { procs: [{ id: 'as_deathreprv', chance: 1.0, trigger: 'onDodge', healPercent: 4 }] },
        { 1: { procs: [{ id: 'as_deathreprv', chance: 1.0, trigger: 'onDodge', healPercent: 4 }] },
          2: { procs: [{ id: 'as_deathreprv', chance: 1.0, trigger: 'onDodge', healPercent: 6 }] } }),
      t3c: bh('Shadow Execution', 'Dodge: reduce Assassinate CD 1s. R2: 1.5s.',
        { cooldownReduction: 10 },
        { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 15 } }),
      t4b: bh('Shadow Executioner', 'Shadow Form: Assassinate 20% faster. R2: +0.3 weapon%.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { incCastSpeed: 20 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { incCastSpeed: 20 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { incCastSpeed: 20, incDamage: 30 } }] } }),
    }),
  ],
});

// ════════════════════════════════════════════════════════════
// LIGHTNING LUNGE TALENT TREE (Section 8)
// ════════════════════════════════════════════════════════════

export const LIGHTNING_LUNGE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_lightning_lunge', prefix: 'll',
  branches: [
    // --- Assassination ---
    assassinationBranch({
      t1a: bh('Voltaic Precision', '+4% crit per chain jump (max +12%). R2: max +16%.',
        { incCritChance: 4 },
        { 1: { incCritChance: 4 }, 2: { incCritChance: 4 } }),
      t1b: bh('Overload', '+10% crit vs Shocked. R2: +8% crit mult vs Shocked.',
        { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 10 } }] },
        { 1: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 10 } }] },
          2: { conditionalMods: [{ condition: 'whileDebuffActive', modifier: { incCritChance: 10, incCritMultiplier: 8 } }] } }),
      t2b: bh('Storm\'s Edge', 'Crits during chain: Shocked (1 stack). R2: +1 extra Shock on Shocked.',
        { procs: [{ id: 'll_stormsedge', chance: 1.0, trigger: 'onCrit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 3 } }] },
        { 1: { }, 2: { } }),
      t3a: bh('Cascading Strikes', '+10% damage per chain jump. R2: final target +25% bonus.',
        { incDamage: 10 },
        { 1: { incDamage: 10 }, 2: { incDamage: 10 } }),
      t3b: bh('Arc Return', 'Max chain: return hit to first target +40%. R2: return = guaranteed crit.',
        { chainCount: 1 },
        { 1: { }, 2: { } }),
      t3c: bh('Galvanic Surge', '+6% damage per Shock stack. R2: +1 chain at 3 Shock.',
        { incDamage: 6 },
        { 1: { incDamage: 6 }, 2: { incDamage: 6 } }),
      t4b: bh('Predator\'s Current', 'In Predator: +1 chain target. R2: chain jumps +15% damage.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { chainCount: 1 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { chainCount: 1 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { chainCount: 1, incDamage: 15 } }] } }),
    }),
    // --- Venomcraft ---
    venomcraftBranch({
      t1a: bh('Voltaic Venom', 'Each chain target: 1 poison. R2: first target gets 2.',
        { procs: [{ id: 'll_voltvenom', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] },
        { 1: { }, 2: { } }),
      t1b: bh('Corrosive Current', 'Chain to poisoned: Corroded (+20% taken, 2s). R2: 3s, stacks 2x.',
        { procs: [{ id: 'll_corrcurrent', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t2b: bh('Conducting Toxin', 'Chain to poisoned: +10% damage. R2: +15%, +1 stack per jump.',
        { incDamage: 10 },
        { 1: { incDamage: 10 }, 2: { incDamage: 15 } }),
      t3a: bh('Galvanic Poison', '5+ stacks: +1 chain target. R2: +2 targets.',
        { chainCount: 1 },
        { 1: { chainCount: 1 }, 2: { chainCount: 2 } }),
      t3b: bh('Chain Infection', 'On kill: spread 2 poison to chain range. R2: spread 3.',
        { debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 0 } } },
        { 1: { }, 2: { } }),
      t3c: bh('Voltaic Burst', '8+ stacks: consume 4 for AoE lightning (+50% wpn). R2: consume 3, Shock.',
        { procs: [{ id: 'll_voltburst', chance: 1.0, trigger: 'onHit' }] },
        { 1: { }, 2: { } }),
      t4b: bh('Storm Frenzy', 'Venom Frenzy: +20% cast speed. R2: chain jumps 15% → +1 poison.',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incCastSpeed: 20 } }] },
        { 1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incCastSpeed: 20 } }] },
          2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { incCastSpeed: 20 } }] } }),
    }),
    // --- Shadow Dance ---
    shadowDanceBranch({
      t1a: bh('Lightning Reflex', 'On lunge: +15% evasion 2s. R2: +20%, 3s.',
        { damageFromEvasion: 15 },
        { 1: { damageFromEvasion: 15 }, 2: { damageFromEvasion: 20 } }),
      t1b: bh('Storm Dodge', 'Dodge within 3s of lunge: CD -0.5s. R2: -0.8s.',
        { cooldownReduction: 5 },
        { 1: { cooldownReduction: 5 }, 2: { cooldownReduction: 8 } }),
      t2b: bh('Evasive Lunge', 'Dodge within 3s: next cast +1 chain target. R2: +2.',
        { procs: [{ id: 'll_evaslunge', chance: 1.0, trigger: 'onDodge' }] },
        { 1: { }, 2: { } }),
      t3a: bh('Voltaic Counter', 'Dodge: 35% wpn dmg lightning counter. R2: also Shock (1).',
        { procs: [{ id: 'll_voltcounter', chance: 1.0, trigger: 'onDodge', instantDamage: { flatDamage: 0, element: 'Lightning', scaleStat: 'weaponDamage', scaleRatio: 0.35 } }] },
        { 1: { }, 2: { } }),
      t3b: bh('Grounding Step', 'Dodge: +10 lightning resist, heal 2% HP. R2: +15, heal 3%.',
        { procs: [{ id: 'll_grounding', chance: 1.0, trigger: 'onDodge', healPercent: 2 }] },
        { 1: { procs: [{ id: 'll_grounding', chance: 1.0, trigger: 'onDodge', healPercent: 2 }] },
          2: { procs: [{ id: 'll_grounding', chance: 1.0, trigger: 'onDodge', healPercent: 3 }] } }),
      t3c: bh('Storm Tempo', 'Dodge: reduce LL CD 0.5s. R2: 0.8s +10% cast speed 2s.',
        { cooldownReduction: 5 },
        { 1: { cooldownReduction: 5 }, 2: { cooldownReduction: 8 } }),
      t4b: bh('Shadow Lightning', 'Shadow Form: chain damage doesn\'t decay. R2: chains Blind (1s).',
        { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { } }] },
        { 1: { }, 2: { } }),
    }),
  ],
});

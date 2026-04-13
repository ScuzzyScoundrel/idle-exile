// ============================================================
// Idle Exile — Staff v2 Locust Swarm Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Chaos DoT with transfer-on-kill. Creates plagued combo state.
// Per docs/weapon-designs/staff-v2/locust_swarm.json
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_LOCUST_SWARM_TALENT_TREE = createTalentTree({
  skillId: 'staff_locust_swarm',
  prefix: 'ls',
  branches: [
    // ════ Branch 0 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Endless swarm. Transfer mastery, infinite spread, DoT king.',
      behaviorNodes: {
        t1a: bh('Swarm Density', '+20/40% Locust DoT damage.',
          { dotMultiplier: 20 }, { 1: { dotMultiplier: 20 }, 2: { dotMultiplier: 40 } }),
        t1b: bh('Devouring Tide', 'Locust ticks have 15/30% chance to apply 1 stack of Poisoned (4s).',
          { procs: [{ id: 'ls_devouring', trigger: 'onAilmentTick', chance: 0.15, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] },
          { 1: { procs: [{ id: 'ls_devouring', trigger: 'onAilmentTick', chance: 0.15, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] },
            2: { procs: [{ id: 'ls_devouring', trigger: 'onAilmentTick', chance: 0.30, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] } }),
        t2b: {
          name: 'Plague Pulse', description: '+5/10% damage per debuff on target.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3a: {
          name: 'Compounding Plague', description: '+15/30% Locust damage on Plagued targets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Locust Crit', 'Locust crits apply 1/2 stacks of Poisoned (4s).',
          { procs: [{ id: 'ls_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] },
          { 1: { procs: [{ id: 'ls_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] },
            2: { procs: [{ id: 'ls_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 2 } }] } }),
        t3c: bh('Chaos Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Multiplicity', description: 'On Locust kill, swarm splits and transfers to 2 enemies (instead of 1).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { swarmExtraTransferTargets: 1 } },
      },
      t4Notable: {
        name: 'Plague Carrier', description: 'Locust ticks have 5% chance to instantly cast Hex on the target. ICD 8s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ls_plague_hex', trigger: 'onAilmentTick', chance: 0.05, internalCooldown: 8.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] },
      },
      t5a: {
        name: 'Eternal Swarm', description: 'Locust transfer-on-kill chains infinitely (max 5 hops). +25% Locust damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { dotMultiplier: 25, rawBehaviors: { swarmInfiniteChain: { maxHops: 5 } } },
      },
      t5b: {
        name: 'Pandemic Pulse', description: 'Locust ticks have 8% chance to spread Locust to all pack enemies. Cost: Locust CD +1s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 1, rawBehaviors: { miniPandemicChance: 8 } },
      },
      t6Notable: {
        name: 'Transfer Boost', description: 'Each transfer-on-kill adds +25% damage to the swarm (compounds, resets when swarm dissipates).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { swarmTransferDamageBonus: 25 } },
      },
      t7Keystone: {
        name: 'THE PLAGUE LORD', description: 'Locust applies to ALL pack enemies on initial cast at 60% snapshot. Cost: −50% transfer-on-kill snapshot.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { locustAoeOnCast: 60, locustTransferDamagePenalty: 50 } },
      },
    },

    // ════ Branch 1 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Living swarm — kills spawn temp insects, locust+minion damage cross-buffs.',
      behaviorNodes: {
        t1a: bh('Lockstep Swarm', '+10/20% Locust damage AND +10/20% minion damage.',
          { incDamage: 10, minionDamageMult: 10 },
          { 1: { incDamage: 10, minionDamageMult: 10 }, 2: { incDamage: 20, minionDamageMult: 20 } }),
        t1b: bh('Hive Spawn', 'Locust kills have 25/50% chance to spawn a 3s spirit minion.',
          { procs: [{ id: 'ls_hive_spawn', trigger: 'onKill', chance: 0.25, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
          { 1: { procs: [{ id: 'ls_hive_spawn', trigger: 'onKill', chance: 0.25, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
            2: { procs: [{ id: 'ls_hive_spawn', trigger: 'onKill', chance: 0.50, summonMinion: { type: 'spirit_temp', duration: 3 } }] } }),
        t2b: bh('Lingering Swarm', '+20/40% Locust DoT duration.',
          { ailmentDuration: 20 }, { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 40 } }),
        t3a: {
          name: 'Pack Hunter', description: '+10/20% Locust damage while any minion alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          },
        },
        t3b: bh('Insect Bond', 'Locust ticks 5/10% chance to heal 3% max HP if any minion alive.',
          { procs: [{ id: 'ls_insect_bond', trigger: 'onAilmentTick', chance: 0.05, conditionParam: { minionsAlive: true }, healPercent: 3 }] },
          { 1: { procs: [{ id: 'ls_insect_bond', trigger: 'onAilmentTick', chance: 0.05, conditionParam: { minionsAlive: true }, healPercent: 3 }] },
            2: { procs: [{ id: 'ls_insect_bond', trigger: 'onAilmentTick', chance: 0.10, conditionParam: { minionsAlive: true }, healPercent: 3 }] } }),
        t3c: bh('Swarm Reach', 'Initial Locust cast also hits 1/2 adjacent enemies at 50% snapshot.',
          { rawBehaviors: { locustSpreadRadius: { extraTargets: 1, snapshotPercent: 50 } } },
          { 1: { rawBehaviors: { locustSpreadRadius: { extraTargets: 1, snapshotPercent: 50 } } },
            2: { rawBehaviors: { locustSpreadRadius: { extraTargets: 2, snapshotPercent: 50 } } } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Swarm Lord', description: 'While 3+ minions alive, Locust ticks deal +50% damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { swarmLordThreshold: { minMinions: 3, damageBonus: 50 } } },
      },
      t4Notable: {
        name: 'Minion Carrier', description: 'Each minion attack on a Locust-affected target has 25% chance to spread Locust to a random adjacent enemy.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionLocustSpreadChance: 25 } },
      },
      t5a: {
        name: 'Living Hive', description: 'Locust ticks heal each living minion for 1% of their max HP per tick.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { locustHealsMinionsPerTick: 1 } },
      },
      t5b: {
        name: 'Insect Apocalypse', description: 'Locust kills summon a permanent (8s) swarm minion (max 3 alive). Cost: Locust CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { locustKillSpawnsPermMinion: { duration: 8, maxStacks: 3 } } },
      },
      t6Notable: {
        name: 'Hive Mother', description: 'Your minions deal +30% damage when attacking Locust-affected targets.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hiveMotherMinionBonus: 30 } },
      },
      t7Keystone: {
        name: 'THE COLONY', description: 'Permanently maintain 4 mini-insect minions (revive 5s after death). Cost: −50% Locust DoT.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { dotMultiplier: -50, rawBehaviors: { permanentColony: { count: 4, reviveSeconds: 5, minionType: 'spirit_temp' } } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Locust as setup for Toads burst + soul_stack feeder paired with Hex.',
      behaviorNodes: {
        t1a: bh('Acidic Sting', '+10/20% Locust crit chance.',
          { incCritChance: 10 }, { 1: { incCritChance: 10 }, 2: { incCritChance: 20 } }),
        t1b: bh('Soul Feast', 'Locust ticks on Hexed targets 15/30% chance to gen 1 soul_stack. ICD 1.5s.',
          { procs: [{ id: 'ls_soul_feast', trigger: 'onAilmentTick', chance: 0.15, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
          { 1: { procs: [{ id: 'ls_soul_feast', trigger: 'onAilmentTick', chance: 0.15, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
            2: { procs: [{ id: 'ls_soul_feast', trigger: 'onAilmentTick', chance: 0.30, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] } }),
        t2b: {
          name: 'Hexed Decay', description: '+20/40% Locust damage on Hexed targets.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 40 } }] },
          },
        },
        t3a: bh('Stack Synergy', '+5/10% Locust damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3b: bh('Cursed Tide', 'Locust crits 35/70% chance to instantly cast Hex. ICD 5s.',
          { procs: [{ id: 'ls_cursed_tide', trigger: 'onCrit', chance: 0.35, internalCooldown: 5.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] },
          { 1: { procs: [{ id: 'ls_cursed_tide', trigger: 'onCrit', chance: 0.35, internalCooldown: 5.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] },
            2: { procs: [{ id: 'ls_cursed_tide', trigger: 'onCrit', chance: 0.70, internalCooldown: 5.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] } }),
        t3c: bh('Quickdraw', '−15/30% Locust cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery Support', '+20/40% damage to Curse-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Locust Surge', description: 'On Locust cast: gain Locust Surge (+30% damage to next non-Locust cast in 4s, max 3 stacks).',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ls_surge', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'locustSurge', effect: { damageMult: 1.30 }, duration: 4, stacks: 1, maxStacks: 3 } }] },
      },
      t4Notable: {
        name: 'Toad Resonance', description: 'When Plague of Toads consumes Plagued, immediately refresh Locust cooldown.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsConsumePlaguedRefundsLocust: true } },
      },
      t5a: {
        name: 'Locust Burst', description: 'Locust deals 100% of its first-second-of-DoT damage instantly on cast. Cost: −50% transfer snapshot.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { locustInitialBurstPercent: 100, locustTransferDamagePenalty: 50 } },
      },
      t5b: {
        name: 'Soul Eater', description: 'When a Locust-affected, Hexed enemy dies: gen 2 soul_stacks. Cost: Locust CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { locustHexedKillSpawnsSoulStacks: 2 } },
      },
      t6Notable: {
        name: 'Final Whisper', description: 'Locust ticks deal +100% damage to enemies below 25% HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustExecuteThreshold: { hpPercent: 25, damageBonus: 100 } } },
      },
      t7Keystone: {
        name: 'THE BLACK PLAGUE', description: 'Each Locust tick adds 1 Plague Mark (max 10). At 10, target detonates for 10× tick as AoE chaos. Cost: −25% Locust DoT.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { dotMultiplier: -25, rawBehaviors: { plagueMarkBuildup: { perTick: 1, maxStacks: 10, detonationMultiplier: 10 } } },
      },
    },
  ],
});

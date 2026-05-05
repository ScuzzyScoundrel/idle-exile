// ============================================================
// Idle Exile — Staff v2 Plague of Toads Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Chaos AoE DoT. Consumes plagued for pandemic spread.
// Per docs/weapon-designs/staff-v2/plague_of_toads.json
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_PLAGUE_OF_TOADS_TALENT_TREE = createTalentTree({
  skillId: 'staff_plague_of_toads',
  prefix: 'tp',
  branches: [
    // ════ Branch 0 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Toads as a delivery mechanism for plague. Pandemic mastered.',
      behaviorNodes: {
        t1a: bh('Venomous Impact', 'Toads apply +1/2 extra Poisoned stacks per impact.',
          { rawBehaviors: { poisonStackPerImpact: 1 } },
          { 1: { rawBehaviors: { poisonStackPerImpact: 1 } }, 2: { rawBehaviors: { poisonStackPerImpact: 2 } } }),
        t1b: bh('Toxic Burst', 'Toad impacts 25/50% chance to apply Bleeding (3s).',
          { procs: [{ id: 'tp_toxic_burst', trigger: 'onHit', chance: 0.25, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] },
          { 1: { procs: [{ id: 'tp_toxic_burst', trigger: 'onHit', chance: 0.25, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] },
            2: { procs: [{ id: 'tp_toxic_burst', trigger: 'onHit', chance: 0.50, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] } }),
        t2b: {
          name: 'Disease Catalyst', description: '+5/10% Toads damage per debuff on target.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3a: {
          name: 'Toad Plague', description: '+20/40% Toads damage on Plagued targets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 40 } }] },
          },
        },
        t3b: bh('Crit Splash', 'Toads crits apply 1/2 stacks each of Poisoned + Bleeding.',
          { procs: [
            { id: 'tp_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } },
            { id: 'tp_crit_bleed', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } },
          ] },
          { 1: { procs: [
              { id: 'tp_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } },
              { id: 'tp_crit_bleed', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } },
            ] },
            2: { procs: [
              { id: 'tp_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 2 } },
              { id: 'tp_crit_bleed', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 2 } },
            ] } }),
        t3c: bh('Chaos Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Pandemic Master', description: 'Pandemic spread at 100% snapshot (was 50%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { pandemicFullSnapshot: true } },
      },
      t4Notable: {
        name: 'Pandemic Burst', description: 'Pandemic deals 50% source DoT snapshot as direct chaos damage per target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { pandemicBurstPercent: 50 } },
      },
      t5a: {
        name: 'Eternal Pandemic', description: 'Pandemic-spread DoTs: +100% duration. Cost: −30% Toads direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -30, rawBehaviors: { pandemicSpreadDurationBonus: 100 } },
      },
      t5b: {
        name: 'Toad Storm', description: 'Toads CD becomes 0.5s while Plagued active. Cost: −60% damage per cast.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { toadStormMode: { cooldownOverride: 0.5, damagePenaltyPercent: 60 } } },
      },
      t6Notable: {
        name: 'Stack Compounder', description: '+5% Toads damage per Poisoned/Bleeding stack on target (max +50%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsStackCompounder: { perStackPercent: 5, maxPercent: 50 } } },
      },
      t7Keystone: {
        name: 'THE PLAGUE COURT', description: 'All zone enemies permanently Plagued. Toads pandemic always fires. Cost: Toads CD +3s.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 3, rawBehaviors: { plagueCourtAllPlagued: true, toadsAlwaysPandemic: true } },
      },
    },

    // ════ Branch 1 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Toads are minions. They count, they leap, they spawn more.',
      behaviorNodes: {
        t1a: bh('Extra Toad', '+1/2 toads spawned per cast.',
          { rawBehaviors: { toadCount: 1 } },
          { 1: { rawBehaviors: { toadCount: 1 } }, 2: { rawBehaviors: { toadCount: 2 } } }),
        t1b: bh('Toad Leap', 'Toads 25/50% chance to leap to 2nd target at 50% damage.',
          { procs: [{ id: 'tp_leap', trigger: 'onHit', chance: 0.25 }], rawBehaviors: { toadLeapNext: { damagePercent: 50 } } },
          { 1: { procs: [{ id: 'tp_leap', trigger: 'onHit', chance: 0.25 }] },
            2: { procs: [{ id: 'tp_leap', trigger: 'onHit', chance: 0.50 }] } }),
        t2b: {
          name: 'Bound Power', description: '+10/20% Toads damage while any minion alive.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          },
        },
        t3a: {
          name: 'Pack Hunter', description: '+20/40% Toads damage while 2+ minions alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 40 } }] },
          },
        },
        t3b: bh('Toad Spawn', 'Toad kills 20/40% chance to spawn a 2s spirit.',
          { procs: [{ id: 'tp_toad_spawn', trigger: 'onKill', chance: 0.20, summonMinion: { type: 'spirit_temp', duration: 2 } }] },
          { 1: { procs: [{ id: 'tp_toad_spawn', trigger: 'onKill', chance: 0.20, summonMinion: { type: 'spirit_temp', duration: 2 } }] },
            2: { procs: [{ id: 'tp_toad_spawn', trigger: 'onKill', chance: 0.40, summonMinion: { type: 'spirit_temp', duration: 2 } }] } }),
        t3c: bh('Leap Range', 'Toads leap to +1/2 additional adjacent targets at 50% damage.',
          { rawBehaviors: { toadLeapRange: 1 } },
          { 1: { rawBehaviors: { toadLeapRange: 1 } }, 2: { rawBehaviors: { toadLeapRange: 2 } } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Living Toads', description: 'Toads count as minions for 3s after cast (enables whileMinionsAlive).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsCountAsMinionsSeconds: 3 } },
      },
      t4Notable: {
        name: 'Minion Bond', description: 'Each living minion: +15% Toads damage AND +1 toad count.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsPerMinionBonus: { damagePercentPerMinion: 15, toadCountPerMinion: 1 } } },
      },
      t5a: {
        name: 'Toad Swarm', description: 'Toad count doubled (3→6). Cost: −25% damage per toad.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -25, rawBehaviors: { toadCount: 3 } },
      },
      t5b: {
        name: 'Permanent Toad', description: '1 toad becomes a permanent 10s minion. Cost: −50% Toads on-cast damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -50, rawBehaviors: { permanentToadMinion: { duration: 10 } } },
      },
      t6Notable: {
        name: 'Hopping Death', description: 'Toads bounce 2 extra times at 50% damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadHoppingBounces: { extraBounces: 2, damagePercent: 50 } } },
      },
      t7Keystone: {
        name: 'THE TOAD GOD', description: 'Minion attacks spawn 0.5s mini-toads at impact (25% Toads damage). Cost: −40% minion damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionDamageMult: -40, rawBehaviors: { toadGodMinionAttacksSpawnToad: { duration: 0.5, damagePercent: 25 } } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Toads as crit/burst payoff. Soul stacks empower impacts.',
      behaviorNodes: {
        t1a: bh('Sharp Strike', '+10/20% Toads crit chance.',
          { incCritChance: 10 }, { 1: { incCritChance: 10 }, 2: { incCritChance: 20 } }),
        t1b: bh('Soul Hop', 'Toads crits 25/50% chance to gen 1 soul_stack. ICD 1.5s.',
          { procs: [{ id: 'tp_soul_hop', trigger: 'onCrit', chance: 0.25, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
          { 1: { procs: [{ id: 'tp_soul_hop', trigger: 'onCrit', chance: 0.25, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
            2: { procs: [{ id: 'tp_soul_hop', trigger: 'onCrit', chance: 0.50, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] } }),
        t2b: {
          name: 'Hex Synergy', description: '+20/40% Toads damage on Hexed targets.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 40 } }] },
          },
        },
        t3a: bh('Stack Synergy', '+5/10% Toads damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3b: bh('Soul Volley', 'When Toads consumes Plagued: instantly cast Soul Harvest at 50/100% damage. ICD 6s.',
          { procs: [{ id: 'tp_soul_volley', trigger: 'onCast', chance: 1.0, conditionParam: { consumedComboState: 'plagued' }, internalCooldown: 6.0, freeCast: { skillId: 'staff_soul_harvest', damageMult: 0.5 } }] },
          { 1: { procs: [{ id: 'tp_soul_volley', trigger: 'onCast', chance: 1.0, conditionParam: { consumedComboState: 'plagued' }, internalCooldown: 6.0, freeCast: { skillId: 'staff_soul_harvest', damageMult: 0.5 } }] },
            2: { procs: [{ id: 'tp_soul_volley', trigger: 'onCast', chance: 1.0, conditionParam: { consumedComboState: 'plagued' }, internalCooldown: 6.0, freeCast: { skillId: 'staff_soul_harvest', damageMult: 1.0 } }] } }),
        t3c: bh('Quickdraw', '−15/30% Toads cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Toad Catalyst', description: 'When Toads consumes Plagued: gen 2 soul_stacks.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsConsumePlaguedSoulStacks: 2 } },
      },
      t4Notable: {
        name: 'Toad Surge', description: 'On Toads cast: +30% damage to next non-Toads cast in 4s, max 3 stacks.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'tp_toad_surge', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'toadSurge', effect: { damageMult: 1.30 }, duration: 4, stacks: 1, maxStacks: 3 } }] },
      },
      t5a: {
        name: 'Frog Prince', description: 'Each toad 25% chance to be King Toad (3× damage). Cost: −25% normal toad damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -25, rawBehaviors: { frogPrinceChance: 25, frogPrinceMultiplier: 3.0 } },
      },
      t5b: {
        name: 'Cursed Toads', description: 'Toads apply Hexed (5s) on impact. Cost: Toads CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { toadsApplyHexed: { duration: 5 } } },
      },
      t6Notable: {
        name: 'Final Whisper', description: 'Toads +100% damage to enemies below 25% HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsExecuteThreshold: { hpPercent: 25, damageBonus: 100 } } },
      },
      t7Keystone: {
        name: 'THE LEAP', description: 'Toads fires 1 massive toad (+200% damage). Each soul_stack consumed adds another toad.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { toadsLeapMode: { perSoulStackToad: 1, soloDamagePercent: 200 } } },
      },
    },
  ],
});

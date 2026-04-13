// ============================================================
// Idle Exile — Staff v2 Plague of Toads Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Chaos AoE DoT skill. Consumes plagued for pandemic spread.
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_PLAGUE_OF_TOADS_TALENT_TREE = createTalentTree({
  skillId: 'staff_plague_of_toads',
  prefix: 'pt',
  branches: [
    {
      name: 'Plague Doctor',
      description: 'Primary home. Every toad carries sickness. Pandemic is your playbook.',
      behaviorNodes: {
        t1a: bh('Toxic Payload', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Virulent Leap', '+10/20% ailment potency.', { ailmentPotency: 10 }, { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Chaos Venom', '+10/20% chaos penetration.', { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Infection Amplifier', description: '+10/20% damage while 3+ debuffs on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 20 } }] },
          },
        },
        t3b: {
          name: 'Stack Scaler', description: '+3/6% damage per debuff stack on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Persistent Toxin', '+15/30% ailment duration.', { ailmentDuration: 15 }, { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Plague Support', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Croaking Swarm', description: '+2 additional toads per cast (5 total).',
        nodeType: 'notable', maxRank: 1,
        modifier: { extraHits: 2 },
      },
      t4Notable: {
        name: 'Viral Spread', description: 'Pandemic triggered by Plague of Toads spreads DoTs with FULL remaining duration.',
        nodeType: 'notable', maxRank: 1,
        modifier: { pandemicFullDuration: true },
      },
      t5a: {
        name: 'Desolation', description: 'Plague of Toads automatically triggers pandemic every cast, even without plagued.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { toadsAlwaysTriggersPandemic: true } },
      },
      t5b: {
        name: 'Venom Bloom', description: '+3 additional toads (6 total). Cost: −25% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { extraHits: 3, incDamage: -25 },
      },
      t6Notable: {
        name: 'Pestilent Earth', description: 'Plague of Toads leaves a toxic patch for 3s dealing chaos damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsLeaveDamagePatch: { duration: 3, element: 'chaos' } } },
      },
      t7Keystone: {
        name: 'PLAGUE MASTER', description: 'Plague of Toads damage is multiplied by number of DoTs on target (×1 per DoT).',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { toadsDamagePerTargetDot: 100 } },
      },
    },
    {
      name: 'Spirit Caller',
      description: 'Toads become familiars. Each one leaves a ghost behind.',
      behaviorNodes: {
        t1a: bh('Pack Hopper', '+15/30% damage.', { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t1b: bh('Totemic Skin', '+15/30% minion max HP.', { minionHpMult: 15 }, { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t2b: bh('Persistent Pack', '+20/40% minion duration.', { minionDurationMult: 20 }, { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Amphibious Bond', description: '+5/10% damage while any minion alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: bh('Swamp Walker', '+10/20% damage per active minion.', { damagePerMinionAlive: 10 }, { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t3c: bh('Pond Scum', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t4b: bh('Minion Support', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Spectral Toads', description: 'Each toad that hits a target spawns a 2s spirit that attacks.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadHitsSpawnSpirit: { duration: 2 } } },
      },
      t4Notable: {
        name: 'Frog Familiar', description: 'Plague of Toads grants all minions +20% damage for 5s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsBuffMinions: { damagePercent: 20, duration: 5 } } },
      },
      t5a: {
        name: 'Living Plague', description: 'Plague of Toads also summons a zombie dog for 5s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { toadsCastSummonsDog: { duration: 5 } } },
      },
      t5b: {
        name: 'Toad Mother', description: 'Minion kills spawn an additional toad that attacks once for spell power damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { minionKillSpawnsToad: true } },
      },
      t6Notable: {
        name: 'Amphibian Pact', description: 'While at 3+ minions active, Plague of Toads deals +30% damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsBonusAtMinionCount: { threshold: 3, percent: 30 } } },
      },
      t7Keystone: {
        name: 'SWAMP GOD', description: 'Toads count as minions (active for their DoT duration). +100% damagePerMinionAlive scaling.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { damagePerMinionAlive: 100, rawBehaviors: { toadsCountAsMinions: true } },
      },
    },
    {
      name: 'Voodoo Master',
      description: 'Toads hex. Toads burst. Toads crit.',
      behaviorNodes: {
        t1a: bh('Cursed Croak', '+10/20% damage.', { incDamage: 10 }, { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Sharp Jump', '+8/16% critical strike chance.', { incCritChance: 8 }, { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Venomous Crit', '+10/20% critical strike multiplier.', { incCritMultiplier: 10 }, { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Finisher', description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Swift Toads', '−10/20% cooldown.', { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Cursed Payload', '+20/40% ailment potency.', { ailmentPotency: 20 }, { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Croak', '+20/40% damage.', { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Hexed Toads', description: 'Plague of Toads applies Hexed (4s) on hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsApplyHex: { duration: 4 } } },
      },
      t4Notable: {
        name: 'Toads of Ruin', description: 'Each toad grants 1 soul_stack on cast.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsGrantSoulStackPerToad: 1 } },
      },
      t5a: {
        name: 'Piercing Venom', description: 'Plague of Toads ignores 100% of chaos resistance.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { chaosPenetration: 100 },
      },
      t5b: {
        name: 'Critical Hop', description: 'Toads have +40% critical strike chance. Cost: −20% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incCritChance: 40, incDamage: -20 },
      },
      t6Notable: {
        name: 'Burst Toads', description: 'Plague of Toads critical strikes deal +75% burst damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { toadsCritBurst: 75 } },
      },
      t7Keystone: {
        name: 'TOADS OF RUIN', description: 'Plague of Toads damage scales with active soul_stacks (+25% per stack).',
        nodeType: 'keystone', maxRank: 1,
        modifier: { damagePerSoulStackActive: 25 },
      },
    },
  ],
});

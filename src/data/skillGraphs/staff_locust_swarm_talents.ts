// ============================================================
// Idle Exile — Staff v2 Locust Swarm Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Chaos DoT with transfer-on-kill. Creates plagued combo state.
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
    {
      name: 'Plague Doctor',
      description: 'Primary home. Endless swarm, infinite spread, DoT king.',
      behaviorNodes: {
        t1a: bh('Virulent Swarm', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Deep Poison', '+10/20% ailment potency.', { ailmentPotency: 10 }, { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Chaos Flight', '+10/20% chaos penetration.', { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Infestation', description: '+10/20% damage while 3+ debuffs on target.',
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
        t3c: bh('Eternal Swarm', '+15/30% ailment duration.', { ailmentDuration: 15 }, { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Plague Support', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Locust Growth', description: 'Locust Swarm DoT damage per second increased by 25%.',
        nodeType: 'notable', maxRank: 1,
        modifier: { dotMultiplier: 25 },
      },
      t4Notable: {
        name: 'Spreading Infection', description: 'On carrier death, transfer to 2 additional targets (3 total).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustTransferExtraTargets: 2 } },
      },
      t5a: {
        name: 'Endless Swarm', description: '+100% Locust Swarm duration, -25% Locust cooldown.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { ailmentDuration: 100, cooldownReduction: 25 },
      },
      t5b: {
        name: 'Mass Infestation', description: 'Locust Swarm can stack on same target up to 3 times.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { locustMaxStacks: 3 } },
      },
      t6Notable: {
        name: 'Contagion Lord', description: 'Plagued combo state created by Locust Swarm lasts 50% longer.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { plaguedDurationBonus: 50 } },
      },
      t7Keystone: {
        name: 'BLACK SWARM', description: 'Locust Swarm applies to all pack enemies at once. Cost: +40% cooldown.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 40, rawBehaviors: { locustAoeApplication: true } },
      },
    },
    {
      name: 'Spirit Caller',
      description: 'Locusts are tiny familiars. Each swarm feeds the pack.',
      behaviorNodes: {
        t1a: bh('Pack Swarm', '+15/30% damage.', { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t1b: bh('Minion Mastery', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t2b: bh('Pack Duration', '+20/40% minion duration.', { minionDurationMult: 20 }, { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Spirit Bond', description: '+5/10% damage while any minion alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: bh('Pack Scaling', '+10/20% damage per active minion.', { damagePerMinionAlive: 10 }, { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t3c: bh('Pack Vitality', '+15/30% minion max HP.', { minionHpMult: 15 }, { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t4b: bh('Minion Support', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Feeding Frenzy', description: 'Locust Swarm DoT ticks heal all minions for 2% max HP each tick.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustTickHealsMinions: 2 } },
      },
      t4Notable: {
        name: 'Swarm Familiar', description: 'Casting Locust Swarm summons a temporary fetish (4s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustCastSpawnsFetish: { duration: 4 } } },
      },
      t5a: {
        name: 'Living Plague', description: 'On Locust Swarm kill, summon 1 zombie dog for 5s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { locustKillSpawnsDog: { duration: 5 } } },
      },
      t5b: {
        name: 'Pack Pandemic', description: 'Minion attacks on locust-infected targets spread the swarm to adjacent enemies.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { minionAttacksSpreadLocust: true } },
      },
      t6Notable: {
        name: 'Swarm Shield', description: 'Casting Locust Swarm grants all minions +15% max HP for 6s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustCastBuffsMinionHp: { percent: 15, duration: 6 } } },
      },
      t7Keystone: {
        name: 'SWARM GOD', description: 'Locust Swarm DoTs count as minions for damagePerMinionAlive. +75% damage per minion active.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { damagePerMinionAlive: 75, rawBehaviors: { locustCountAsMinion: true } },
      },
    },
    {
      name: 'Voodoo Master',
      description: 'Locust Swarm as curse amplifier. Crit DoTs, soul synergy.',
      behaviorNodes: {
        t1a: bh('Cursed Flight', '+10/20% damage.', { incDamage: 10 }, { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Keen Swarm', '+8/16% critical strike chance.', { incCritChance: 8 }, { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Vicious Swarm', '+10/20% critical strike multiplier.', { incCritMultiplier: 10 }, { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Finisher', description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Swift Swarm', '−10/20% cooldown.', { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Potent Curse', '+20/40% ailment potency.', { ailmentPotency: 20 }, { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Swarm', '+20/40% damage.', { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Venomous Crit', description: 'Locust Swarm crits apply 2 stacks of poison.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustCritAppliesPoison: 2 } },
      },
      t4Notable: {
        name: 'Soul Swarm', description: 'Each Locust Swarm cast grants 1 soul_stack.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { locustGrantsSoulStack: 1 } },
      },
      t5a: {
        name: 'Piercing Swarm', description: 'Locust Swarm ignores 100% of chaos resistance.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { chaosPenetration: 100 },
      },
      t5b: {
        name: 'Crit Swarm', description: '+30% critical strike chance. Cost: −15% DoT damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incCritChance: 30, dotMultiplier: -15 },
      },
      t6Notable: {
        name: 'DoT Tempo', description: 'Locust DoT ticks have 10% chance to crit (DoT crit).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dotsCanCrit: { chance: 10 } } },
      },
      t7Keystone: {
        name: 'DIVINE SWARM', description: 'Locust damage scales with soul_stacks (+25% per stack). Locust consumes 1 soul_stack per cast.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { damagePerSoulStackActive: 25, rawBehaviors: { locustConsumesSoulStack: 1 } },
      },
    },
  ],
});

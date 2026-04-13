// ============================================================
// Idle Exile — Staff v2 Fetish Swarm Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: 4 fetishes, 1.5s attack interval, 6s duration, physical, spirit_link creator.
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_FETISH_SWARM_TALENT_TREE = createTalentTree({
  skillId: 'staff_fetish_swarm',
  prefix: 'fs',
  branches: [
    {
      name: 'Spirit Caller',
      description: 'Bigger swarm, longer duration, synergy with Zombie Dogs.',
      behaviorNodes: {
        t1a: bh('Fetish Fury', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t1b: bh('Bone Skin', '+15/30% minion max HP.', { minionHpMult: 15 }, { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t2b: bh('Enduring Swarm', '+20/40% minion duration.', { minionDurationMult: 20 }, { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Pack Surge', description: '+5/10% damage while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: {
          name: 'Soul Sustain', description: '+5/10 life on hit while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 10 } }] },
          },
        },
        t3c: bh('Minion March', '+10/20% damage per active minion.', { damagePerMinionAlive: 10 }, { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t4b: bh('Fetish Mastery', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Twin Fetish', description: 'Summon 5 fetishes instead of 4.',
        nodeType: 'notable', maxRank: 1,
        modifier: { extraFetishCount: 1 },
      },
      t4Notable: {
        name: 'Fetish Frenzy', description: '+40% minion damage and +30% minion duration.',
        nodeType: 'notable', maxRank: 1,
        modifier: { minionDamageMult: 40, minionDurationMult: 30 },
      },
      t5a: {
        name: 'Iron Fetish', description: '+100% fetish HP. Cost: −40% fetish duration.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionHpMult: 100, minionDurationMult: -40 },
      },
      t5b: {
        name: 'Glass Fetish', description: '+100% fetish damage. Cost: −50% fetish HP.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionDamageMult: 100, minionHpMult: -50 },
      },
      t6Notable: {
        name: 'Swarm Mother', description: '+15 resistance while any minion is alive.',
        nodeType: 'notable', maxRank: 1,
        modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { allResist: 15 } }] },
      },
      t7Keystone: {
        name: 'FETISH LEGION', description: '+2 fetishes (6 total) and +50% minion HP. Cost: +4s cooldown.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { extraFetishCount: 2, minionHpMult: 50, cooldownIncrease: 40 },
      },
    },
    {
      name: 'Plague Doctor',
      description: 'Corrupted fetishes. Every bite a plague vector.',
      behaviorNodes: {
        t1a: bh('Poison Edge', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Virulent Bite', '+10/20% ailment potency.', { ailmentPotency: 10 }, { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Chaos Channel', '+10/20% chaos penetration.', { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Plague Sense', description: '+10/20% damage while 3+ debuffs on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 20 } }] },
          },
        },
        t3b: {
          name: 'Vile Stacker', description: '+3/6% damage per debuff stack on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Withering Breath', '+15/30% ailment duration.', { ailmentDuration: 15 }, { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Plague Guard', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Venom Coat', description: 'Fetish bites apply 1 stack of poison per hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishBitesApplyPoison: 1 } },
      },
      t4Notable: {
        name: 'Spore Burst', description: 'When a fetish dies, it releases a toxic cloud dealing chaos damage for 2s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishDeathSporeCloud: { duration: 2, element: 'chaos' } } },
      },
      t5a: {
        name: 'Toxic Skins', description: 'Fetishes deal +50% damage vs poisoned targets.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { fetishDamageBonusVsPoisoned: 50 } },
      },
      t5b: {
        name: 'Breeding Swarm', description: 'Fetish kills have 25% chance to spawn a new fetish (3s duration).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { fetishKillSpawnsFetish: { chance: 25, duration: 3 } } },
      },
      t6Notable: {
        name: 'Plague Mind', description: 'Fetish bites inflict all player DoTs on hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishBitesApplyPlayerDots: true } },
      },
      t7Keystone: {
        name: 'ROTTING LEGION', description: 'Fetishes ignore all damage for first 3s of their duration. Cost: −30% fetish damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionDamageMult: -30, rawBehaviors: { fetishesInvulnerableEarly: { duration: 3 } } },
      },
    },
    {
      name: 'Voodoo Master',
      description: 'Totems of war. Fetishes curse and crit like their master.',
      behaviorNodes: {
        t1a: bh('Keen Totem', '+10/20% damage.', { incDamage: 10 }, { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Sharp Spirit', '+8/16% critical strike chance.', { incCritChance: 8 }, { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Vicious Totem', '+10/20% critical strike multiplier.', { incCritMultiplier: 10 }, { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Finisher', description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Totemic Focus', '−10/20% cooldown.', { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Cursed Totems', '+20/40% ailment potency.', { ailmentPotency: 20 }, { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Totem', '+20/40% damage.', { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Vicious Circle', description: 'Fetish attacks inherit your critical strike chance.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishAttacksInheritPlayerCrit: true } },
      },
      t4Notable: {
        name: 'Puppeteer', description: 'Each fetish kill grants 1 soul_stack.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishKillGrantsSoulStack: 1 } },
      },
      t5a: {
        name: 'Witch Doctor\'s Rage', description: 'Fetish hits apply Hexed (4s) to the target.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { fetishHitsApplyHex: { duration: 4 } } },
      },
      t5b: {
        name: 'Totemic Focus', description: 'Fetishes deal +50% damage but cannot move (attack only the front mob).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionDamageMult: 50, rawBehaviors: { fetishesFocusedTarget: true } },
      },
      t6Notable: {
        name: 'Soul Circuit', description: 'When a fetish hits, heal all minions for 1% of their max HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishHitsHealAllMinions: { percent: 1 } } },
      },
      t7Keystone: {
        name: 'GRAND RITUAL', description: 'Fetish Swarm also summons 2 zombie dogs for 5s. Cost: −50% Fetish damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionDamageMult: -50, rawBehaviors: { fetishCastSummonsZombieDogs: { count: 2, duration: 5 } } },
      },
    },
  ],
});

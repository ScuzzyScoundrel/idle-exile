// ============================================================
// Idle Exile — Staff v2 Bouncing Skull Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Fire chain projectile (2 bounces base). Consumes soul_stack for +1 chain per stack.
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_BOUNCING_SKULL_TALENT_TREE = createTalentTree({
  skillId: 'staff_bouncing_skull',
  prefix: 'bs',
  branches: [
    {
      name: 'Voodoo Master',
      description: 'Primary home. Compound bounces, soul synergy, crit cascades.',
      behaviorNodes: {
        t1a: bh('Fiery Impact', '+15/30% damage.', { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t1b: bh('Skull Crit', '+8/16% critical strike chance.', { incCritChance: 8 }, { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Molten Core', '+10/20% critical strike multiplier.', { incCritMultiplier: 10 }, { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Execution Bounce', description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Quick Skull', '−10/20% cooldown.', { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Fire Penetration', '+10/20% fire penetration.', { firePenetration: 10 }, { 1: { firePenetration: 10 }, 2: { firePenetration: 20 } }),
        t4b: bh('Heavy Skull', '+20/40% damage.', { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Grinning Skull', description: '+2 bounces on every Bouncing Skull cast.',
        nodeType: 'notable', maxRank: 1,
        modifier: { chainCount: 2 },
      },
      t4Notable: {
        name: 'Soul Resonance', description: '+10% damage per active soul_stack.',
        nodeType: 'notable', maxRank: 1,
        modifier: { damagePerSoulStackActive: 10 },
      },
      t5a: {
        name: 'Overload', description: '+50% damage and +2 bounces. Cost: +50% cooldown.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: 50, chainCount: 2, cooldownIncrease: 50 },
      },
      t5b: {
        name: 'Soul Fuel', description: 'Bouncing Skull damage scales with active soul_stacks (+20% per stack).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { damagePerSoulStackActive: 20 },
      },
      t6Notable: {
        name: 'Detonator Skull', description: 'Bouncing Skull crits cause the skull to detonate: deal AoE fire damage at the final bounce location.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullCritDetonates: { damageMult: 2.0, radius: 3 } } },
      },
      t7Keystone: {
        name: 'INFERNAL MARCH', description: '+100% damage and +3 bounces. Cost: +2s cooldown.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: 100, chainCount: 3, cooldownIncrease: 20 },
      },
    },
    {
      name: 'Spirit Caller',
      description: 'Each bouncing skull is a hunting spirit. Minion synergy.',
      behaviorNodes: {
        t1a: bh('Spirit Skull', '+15/30% damage.', { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t1b: bh('Minion Support', '+15/30% minion damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t2b: bh('Pack Strike', '+15/30% minion max HP.', { minionHpMult: 15 }, { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t3a: {
          name: 'Wolfpack Boost', description: '+5/10% damage while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: bh('Pack Scaling', '+10/20% damage per active minion.', { damagePerMinionAlive: 10 }, { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t3c: bh('Pack Duration', '+20/40% minion duration.', { minionDurationMult: 20 }, { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t4b: bh('Alpha Bond', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Ghost Bounce', description: 'Each bounce has 25% chance to spawn a 2s spirit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullBounceSpawnsSpirit: { chance: 25, duration: 2 } } },
      },
      t4Notable: {
        name: 'Skull Collector', description: 'On Bouncing Skull kill, heal all minions for 5% of their max HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullKillHealsMinions: 5 } },
      },
      t5a: {
        name: 'Spectral Bounce', description: 'Each bounce deals +15% more damage than the previous.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { hauntChainDamageCompound: 15 },
      },
      t5b: {
        name: 'Pack Bounce', description: '+3 bounces (5 total). Cost: −20% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { chainCount: 3, incDamage: -20 },
      },
      t6Notable: {
        name: 'Soul Eater', description: 'When Bouncing Skull kills a target, the skull summons a fetish for 3s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullKillSpawnsFetish: { duration: 3 } } },
      },
      t7Keystone: {
        name: 'SOUL CASCADE', description: 'Bouncing Skull bounces always return to the caster, granting 1 soul_stack per bounce hit.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { skullBouncesGrantSoulStack: 1 } },
      },
    },
    {
      name: 'Plague Doctor',
      description: 'Ignite the path. Burning bounces spread corruption.',
      behaviorNodes: {
        t1a: bh('Charring DoT', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Burning Core', '+10/20% ailment potency.', { ailmentPotency: 10 }, { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Scorching Sear', '+10/20% fire penetration.', { firePenetration: 10 }, { 1: { firePenetration: 10 }, 2: { firePenetration: 20 } }),
        t3a: {
          name: 'Wildfire', description: '+10/20% damage while 3+ debuffs on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 20 } }] },
          },
        },
        t3b: {
          name: 'Stack Amplifier', description: '+3/6% damage per debuff stack on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Lingering Flame', '+15/30% ailment duration.', { ailmentDuration: 15 }, { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Burn Support', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Igniting Skull', description: 'Each bounce applies 1 stack of burning (fire DoT).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullBouncesApplyBurning: 1 } },
      },
      t4Notable: {
        name: 'Flame Cascade', description: 'Bouncing Skull bounces also spread all DoTs on the carrier.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullBouncesSpreadDots: true } },
      },
      t5a: {
        name: 'Collective Blaze', description: 'Bouncing Skull ignites all pack enemies on first hit.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { skullIgnitesAllPack: true } },
      },
      t5b: {
        name: 'Immolation Skull', description: '+1 bounce per DoT on target (dynamic chainCount). Cost: −15% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -15, rawBehaviors: { skullBouncesPerTargetDot: 1 } },
      },
      t6Notable: {
        name: 'Pandemic Bounce', description: 'Final bounce triggers pandemic spread.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { skullFinalBouncePandemic: true } },
      },
      t7Keystone: {
        name: 'ETERNAL FLAME', description: 'Burning DoTs applied by Bouncing Skull never expire. Cost: +50% Bouncing Skull cooldown.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 50, rawBehaviors: { skullBurningNeverExpires: true } },
      },
    },
  ],
});

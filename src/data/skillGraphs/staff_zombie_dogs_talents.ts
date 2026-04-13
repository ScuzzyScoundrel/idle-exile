// ============================================================
// Idle Exile — Staff v2 Zombie Dogs Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Minion summoner (2 dogs, 10s, 3s attack interval, chaos, haunted-on-bite).
// Branches: Spirit Caller (pack identity) / Plague Doctor (disease bites) / Voodoo Master (crit+soul)
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(
  name: string, description: string,
  modifier: NC['modifier'],
  perRankModifiers?: NC['perRankModifiers'],
): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_ZOMBIE_DOGS_TALENT_TREE = createTalentTree({
  skillId: 'staff_zombie_dogs',
  prefix: 'zd',
  branches: [
    // ════════════════════════════════════════════════════════════
    // Branch 0 — Spirit Caller (primary home)
    // ════════════════════════════════════════════════════════════
    {
      name: 'Spirit Caller',
      description: 'Your pack is an extension of you. Tankier, longer-lasting, more numerous.',
      behaviorNodes: {
        t1a: bh('Pack Leader', '+15/30% minion attack damage.',
          { minionDamageMult: 15 },
          { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t1b: bh('Iron Hide', '+15/30% minion max HP.',
          { minionHpMult: 15 },
          { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t2b: bh('Persistence', '+20/40% minion duration.',
          { minionDurationMult: 20 },
          { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Wolfpack',
          description: '+5/10% damage while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: {
          name: 'Sanguine Bond',
          description: '+5/10 life on hit while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 5 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 10 } }] },
          },
        },
        t3c: bh('Savage Bite', '+15/30% minion attack damage.',
          { minionDamageMult: 15 },
          { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t4b: bh('Kennel Master', '+10/20% damage per active minion.',
          { damagePerMinionAlive: 10 },
          { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
      },
      t2Notable: {
        name: 'Rabid Assault',
        description: 'Zombie Dog attack interval reduced by 1.0s (from 3s to 2s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { zombieDogAttackIntervalReduction: 1.0 },
      },
      t4Notable: {
        name: 'Third Dog',
        description: 'Summon 3 Zombie Dogs instead of 2.',
        nodeType: 'notable', maxRank: 1,
        modifier: { extraZombieDogCount: 1 },
      },
      t5a: {
        name: 'Pack of Nine',
        description: '+50% max HP and +50% duration, but Zombie Dogs attack 30% slower (+0.9s interval).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: {
          minionHpMult: 50,
          minionDurationMult: 50,
          zombieDogAttackIntervalReduction: -0.9,
        },
      },
      t5b: {
        name: 'Hellhounds',
        description: '+100% Zombie Dog damage. Cost: −50% minion duration.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: {
          minionDamageMult: 100,
          minionDurationMult: -50,
        },
      },
      t6Notable: {
        name: 'Alpha Spirit',
        description: '+15 to all resistances while any minion is alive.',
        nodeType: 'notable', maxRank: 1,
        modifier: {
          conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { allResist: 15 } }],
        },
      },
      t7Keystone: {
        name: 'ETERNAL KENNEL',
        description: 'Zombie Dogs never expire (effectively permanent minion duration). Cost: +6s cooldown on Zombie Dogs cast.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          minionDurationMult: 900,
          cooldownIncrease: 60,
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 1 — Plague Doctor
    // ════════════════════════════════════════════════════════════
    {
      name: 'Plague Doctor',
      description: 'Your dogs carry disease. Bites spread DoTs, kills seed new plagues.',
      behaviorNodes: {
        t1a: bh('Venomous Teeth', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Toxic Saliva', '+10/20% ailment potency.',
          { ailmentPotency: 10 },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Chaos Channel', '+10/20% chaos penetration.',
          { chaosPenetration: 10 },
          { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Viral Strike',
          description: '+10/20% damage while 3+ debuffs on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 20 } }] },
          },
        },
        t3b: {
          name: 'Disease Growth',
          description: '+3/6% damage per debuff stack on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Lingering Bites', '+15/30% ailment duration.',
          { ailmentDuration: 15 },
          { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Plague Support', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Plague Fangs',
        description: 'Zombie Dog bites apply 2 stacks of poison per hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionBitesApplyPoison: 2 } },
      },
      t4Notable: {
        name: 'Rotting Bite',
        description: 'When a Zombie Dog kills an enemy, spread all of that enemy\'s DoTs to a nearby target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionKillSpreadsDots: true } },
      },
      t5a: {
        name: 'Miasma Aura',
        description: 'Zombie Dogs deal +30% damage to enemies with any DoT active.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { minionDamageBonusVsDotTarget: 30 } },
      },
      t5b: {
        name: 'Breeding Ground',
        description: 'Killed enemies spawn 1 temporary fetish (3s) that attacks with your pack.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { killSpawnsFetish: { duration: 3 } } },
      },
      t6Notable: {
        name: 'Plague Conduit',
        description: 'Zombie Dog bites also apply 1 stack of your most recent DoT (Locust / Haunt / Hex).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionBitesApplyRecentDot: true } },
      },
      t7Keystone: {
        name: 'ZOMBIE PLAGUE',
        description: 'Zombie Dogs heal from chaos damage and ignore poison damage taken. Cost: +1s attack interval.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          zombieDogAttackIntervalReduction: -1,
          rawBehaviors: { zombieDogsHealFromChaos: true, zombieDogsImmuneToPoison: true },
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 2 — Voodoo Master
    // ════════════════════════════════════════════════════════════
    {
      name: 'Voodoo Master',
      description: 'Control the pack. Crit dogs, stack synergy, puppet mastery.',
      behaviorNodes: {
        t1a: bh('Predatory Curse', '+10/20% damage.',
          { incDamage: 10 },
          { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Keen Senses', '+8/16% critical strike chance.',
          { incCritChance: 8 },
          { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Vicious Edge', '+10/20% critical strike multiplier.',
          { incCritMultiplier: 10 },
          { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Finisher',
          description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Short Leash', '−10/20% cooldown.',
          { cooldownReduction: 10 },
          { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Blood Curse', '+20/40% ailment potency.',
          { ailmentPotency: 20 },
          { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Pack', '+20/40% damage.',
          { incDamage: 20 },
          { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Cursed Alphas',
        description: 'Zombie Dog attacks inherit your critical strike chance and multiplier.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionAttacksInheritPlayerCrit: true } },
      },
      t4Notable: {
        name: 'Soul Harvest Link',
        description: 'Each Zombie Dog kill grants 1 soul_stack.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionKillGrantsSoulStack: 1 } },
      },
      t5a: {
        name: 'Pack Curse',
        description: 'Zombie Dog hits apply Hexed (5s) to the target.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { minionHitsApplyHex: { duration: 5 } } },
      },
      t5b: {
        name: 'Iron Pack',
        description: 'Zombie Dogs gain +50% of your critical strike multiplier as flat damage bonus.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { minionsInheritPlayerCritMult: { ratio: 0.5 } } },
      },
      t6Notable: {
        name: 'Death Curse',
        description: 'When a Zombie Dog dies, it explodes for chaos damage equal to its remaining HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionDeathExplodes: { damageFromRemainingHp: 1.0, element: 'chaos' } } },
      },
      t7Keystone: {
        name: 'PUPPET KING',
        description: 'Zombie Dog attacks consume 1 soul_stack per hit for +100% damage. Without stacks, minion attacks deal only 25% damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { zombieDogsConsumeSoulStackOnHit: { perStackBonus: 100, noStackPenalty: 75 } } },
      },
    },
  ],
});

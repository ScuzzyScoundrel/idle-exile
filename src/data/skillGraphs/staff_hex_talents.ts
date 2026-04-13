// ============================================================
// Idle Exile — Staff v2 Hex Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Curse skill (20% reduced damage debuff) + creates hexed combo state.
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_HEX_TALENT_TREE = createTalentTree({
  skillId: 'staff_hex',
  prefix: 'hx',
  branches: [
    {
      name: 'Voodoo Master',
      description: 'Primary home. Curse mastery, hex amplification, soul synergy.',
      behaviorNodes: {
        t1a: bh('Cursed Edge', '+10/20% damage.', { incDamage: 10 }, { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Sharp Hex', '+8/16% critical strike chance.', { incCritChance: 8 }, { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Vicious Curse', '+10/20% critical strike multiplier.', { incCritMultiplier: 10 }, { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Weakness Strike', description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Swift Curse', '−10/20% cooldown.', { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Potent Curse', '+20/40% ailment potency.', { ailmentPotency: 20 }, { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Curse', '+20/40% damage.', { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Amplifying Curse', description: 'Hex deals +15% damage to already-hexed targets (self-stacking repeat casts).',
        nodeType: 'notable', maxRank: 1,
        modifier: { hexedTargetDamageAmp: 15 },
      },
      t4Notable: {
        name: 'Soul Hex', description: 'Casting Hex grants 1 soul_stack.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexGrantsSoulStack: 1 } },
      },
      t5a: {
        name: 'Deep Hex', description: '+30% hex damage reduction debuff potency (40% reduced damage dealt instead of 20%).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexDebuffPotencyOverride: 40 } },
      },
      t5b: {
        name: 'Multi-Curse', description: 'Hex can be applied to the same target twice (stacks up to 2).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexMaxStacks: 2 } },
      },
      t6Notable: {
        name: 'Curse Mastery', description: 'Hexed enemies take +15% damage from all skills.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexedTargetDamageTakenIncrease: 15 } },
      },
      t7Keystone: {
        name: 'GRAND CURSE', description: 'Hex creates hexed combo state AND applies to all pack enemies at once. Cost: +50% cooldown.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 50, rawBehaviors: { hexAoeApplication: true } },
      },
    },
    {
      name: 'Spirit Caller',
      description: 'Hex marks prey for your minions.',
      behaviorNodes: {
        t1a: bh('Cursed Pack', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t1b: bh('Totemic Skin', '+15/30% minion max HP.', { minionHpMult: 15 }, { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t2b: bh('Persistent Pack', '+20/40% minion duration.', { minionDurationMult: 20 }, { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Hunter\'s Bond', description: '+5/10% damage while any minion alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: bh('Pack Scaling', '+10/20% damage per active minion.', { damagePerMinionAlive: 10 }, { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t3c: bh('Spirit Bond', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t4b: bh('Alpha Support', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Mark of the Hunt', description: 'Minions deal +40% damage to hexed targets.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionDamageBonusVsHexed: 40 } },
      },
      t4Notable: {
        name: 'Hex Guard', description: 'Casting Hex grants all minions +20% damage reduction for 4s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexCastGrantsMinionDR: { percent: 20, duration: 4 } } },
      },
      t5a: {
        name: 'Pack Curse', description: 'Hex marks the target for your minions: next 3 minion attacks crit.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexMarksForMinionCrit: 3 } },
      },
      t5b: {
        name: 'Cursed Pack', description: 'Minions gain +25% damage while player has a hexed target. Cost: −15% hex duration.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { ailmentDuration: -15, rawBehaviors: { minionDamageBonusWhileHexActive: 25 } },
      },
      t6Notable: {
        name: 'Soul Mark', description: 'When Hex is applied, summon a temporary spirit (3s) that attacks the hexed target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexCastSpawnsSpirit: { duration: 3 } } },
      },
      t7Keystone: {
        name: 'CURSED PACK', description: 'While at 2+ minions alive, Hex deals +100% damage. Minions gain +50% damage vs hexed.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 100 } }], rawBehaviors: { minionDamageBonusVsHexed: 50 } },
      },
    },
    {
      name: 'Plague Doctor',
      description: 'Hex is disease. Cursed targets become plague nodes.',
      behaviorNodes: {
        t1a: bh('Withering Touch', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Toxic Curse', '+10/20% ailment potency.', { ailmentPotency: 10 }, { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Chaos Channel', '+10/20% chaos penetration.', { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Disease Sense', description: '+10/20% damage while 3+ debuffs on target.',
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
        t3c: bh('Lingering Curse', '+15/30% ailment duration.', { ailmentDuration: 15 }, { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Plague Support', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Plague Conduit', description: 'Hex applies a stack of poison on cast.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexAppliesPoisonStacks: 1 } },
      },
      t4Notable: {
        name: 'Withering Spread', description: 'When Hex is applied, spread all existing DoTs to the target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexCastSpreadsExistingDots: true } },
      },
      t5a: {
        name: 'Plague Jump', description: 'On target death, Hex jumps to nearest enemy with full duration.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexJumpsOnKill: true } },
      },
      t5b: {
        name: 'DoT Amplifier', description: 'Hexed targets take +50% DoT damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexedTargetDotAmplifier: 50 } },
      },
      t6Notable: {
        name: 'Curse Cascade', description: 'Hex can be applied to all pack enemies on cast (AoE). Cost: −30% hex damage reduction.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexAoeApplication: true, hexDebuffPotencyOverride: 14 } },
      },
      t7Keystone: {
        name: 'WITHERING CURSE', description: 'Hexed enemies lose 2% HP per second while hexed. Cost: −25% direct Hex damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -25, rawBehaviors: { hexDrainsPercentHp: { percentPerSec: 2 } } },
      },
    },
  ],
});

// ============================================================
// Idle Exile — Staff v2 Spirit Barrage Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: 3-hit cold projectile. Consumes haunted for guaranteed crit + 30% bonus damage.
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;

function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_SPIRIT_BARRAGE_TALENT_TREE = createTalentTree({
  skillId: 'staff_spirit_barrage',
  prefix: 'sb',
  branches: [
    {
      name: 'Spirit Caller',
      description: 'Every projectile is a hunting spirit. More hits, more haunts.',
      behaviorNodes: {
        t1a: bh('Spirit Edge', '+15/30% damage.', { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t1b: bh('Cold Resonance', '+10/20% cold penetration.', { coldPenetration: 10 }, { 1: { coldPenetration: 10 }, 2: { coldPenetration: 20 } }),
        t2b: bh('Lingering Ghosts', '+20/40% ailment duration.', { ailmentDuration: 20 }, { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 40 } }),
        t3a: {
          name: 'Haunting Fury', description: '+5/10% damage while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: bh('Pack Projectiles', '+10/20% damage per active minion.', { damagePerMinionAlive: 10 }, { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t3c: bh('Spirit Might', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t4b: bh('Minion Support', '+15/30% minion attack damage.', { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Spirit Shower', description: 'Spirit Barrage fires +2 additional projectiles (5 total).',
        nodeType: 'notable', maxRank: 1,
        modifier: { extraHits: 2 },
      },
      t4Notable: {
        name: 'Haunt Chain', description: 'Each projectile has 15% chance to re-apply haunted to target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageReapplyHaunt: { chance: 15 } } },
      },
      t5a: {
        name: 'Spectral Wave', description: '+3 additional projectiles (6 total). Cost: −20% damage per projectile.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { extraHits: 3, incDamage: -20 },
      },
      t5b: {
        name: 'Spirit Piercing', description: 'Projectiles pierce 2 enemies.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { pierceCount: 2 },
      },
      t6Notable: {
        name: 'Soul Echo', description: 'When Spirit Barrage consumes haunted, refresh haunted at full duration on all pack enemies.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hauntedConsumeRefreshesAllPack: true } },
      },
      t7Keystone: {
        name: 'SPIRIT CASCADE', description: 'Consuming haunted also summons 2 spirits (fetish variant, 3s duration).',
        nodeType: 'keystone', maxRank: 1,
        modifier: { hauntedConsumeSummonsSpirit: true, rawBehaviors: { spiritCascadeCount: 2 } },
      },
    },
    {
      name: 'Plague Doctor',
      description: 'Cold spirits carry plague. Freeze and rot at once.',
      behaviorNodes: {
        t1a: bh('Frozen DoT', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Biting Cold', '+10/20% cold penetration.', { coldPenetration: 10 }, { 1: { coldPenetration: 10 }, 2: { coldPenetration: 20 } }),
        t2b: bh('Potent Frost', '+10/20% ailment potency.', { ailmentPotency: 10 }, { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t3a: {
          name: 'Frost Concentration', description: '+10/20% damage while 3+ debuffs on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 20 } }] },
          },
        },
        t3b: {
          name: 'Ailment Amplifier', description: '+3/6% damage per debuff on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Lingering Frost', '+15/30% ailment duration.', { ailmentDuration: 15 }, { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Frost Support', '+15/30% DoT damage multiplier.', { dotMultiplier: 15 }, { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Chilling Barrage', description: 'Each Spirit Barrage projectile applies 1 stack of chilled.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageAppliesChilled: 1 } },
      },
      t4Notable: {
        name: 'Cold Pandemic', description: 'Consuming haunted also spreads all DoTs to all pack enemies.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hauntedConsumeTriggersPandemic: true } },
      },
      t5a: {
        name: 'Frozen Soul', description: 'Spirit Barrage projectiles have +25% chance to freeze on crit.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageCritFreeze: { chance: 25, duration: 1 } } },
      },
      t5b: {
        name: 'Frost Barrage', description: '+2 additional projectiles (5 total). Each applies chilled.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { extraHits: 2, rawBehaviors: { spiritBarrageAppliesChilled: 1 } },
      },
      t6Notable: {
        name: 'Glacial Amplifier', description: 'Spirit Barrage deals +40% damage vs chilled enemies.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageDamageBonusVsChilled: 40 } },
      },
      t7Keystone: {
        name: 'FROSTBOUND SOUL', description: 'Spirit Barrage crits explode all DoTs on target for 2× their DoT damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { dotExplodeOnCrit: { multiplier: 2 } } },
      },
    },
    {
      name: 'Voodoo Master',
      description: 'Pure burst and precision. Crit stacking, execute patterns.',
      behaviorNodes: {
        t1a: bh('Lethal Intent', '+10/20% damage.', { incDamage: 10 }, { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Sharp Soul', '+8/16% critical strike chance.', { incCritChance: 8 }, { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Vicious Spirit', '+10/20% critical strike multiplier.', { incCritMultiplier: 10 }, { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Weakness Seeker', description: '+15/30% damage vs targets below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Swift Barrage', '−10/20% cooldown.', { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Deadly Shot', '+10/20% damage.', { incDamage: 10 }, { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t4b: bh('Heavy Support', '+20/40% damage.', { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Lethal Barrage', description: '+2 critical strike multiplier per soul_stack active.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageCritMultPerSoulStack: 2 } },
      },
      t4Notable: {
        name: 'Curse Strike', description: 'Spirit Barrage deals +25% damage to hexed targets.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageDamageBonusVsHexed: 25 } },
      },
      t5a: {
        name: 'Perfect Barrage', description: 'Spirit Barrage always crits on first hit. +2 projectiles.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { extraHits: 2, rawBehaviors: { spiritBarrageFirstHitGuaranteedCrit: true } },
      },
      t5b: {
        name: 'Focus Fire', description: 'All projectiles hit the same target. +50% damage per projectile.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: 50, rawBehaviors: { spiritBarrageFocusedTarget: true } },
      },
      t6Notable: {
        name: 'Concentrated Soul', description: 'Spirit Barrage crits ignore 50% of target resistances.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageCritIgnoresResist: 50 } },
      },
      t7Keystone: {
        name: 'EXECUTION BARRAGE', description: 'Spirit Barrage can execute targets below 20% HP (instant kill). Cost: −30% direct damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -30, rawBehaviors: { spiritBarrageExecuteThreshold: 20 } },
      },
    },
  ],
});

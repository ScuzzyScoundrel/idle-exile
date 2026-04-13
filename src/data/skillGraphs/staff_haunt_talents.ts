// ============================================================
// Idle Exile — Staff v2 Haunt Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Branches: Spirit Caller / Plague Doctor / Voodoo Master
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

export const STAFF_HAUNT_TALENT_TREE = createTalentTree({
  skillId: 'staff_haunt',
  prefix: 'ht',
  branches: [
    // ════════════════════════════════════════════════════════════
    // Branch 0 — Spirit Caller
    // ════════════════════════════════════════════════════════════
    {
      name: 'Spirit Caller',
      description: 'Haunt feeds your minion army. Spirits empower spirits.',
      behaviorNodes: {
        t1a: bh('Spectral Edge', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Cold Resonance', '+10/20% cold penetration.',
          { coldPenetration: 10 },
          { 1: { coldPenetration: 10 }, 2: { coldPenetration: 20 } }),
        t2b: bh('Lingering Spirits', '+20/40% ailment duration.',
          { ailmentDuration: 20 },
          { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 40 } }),
        t3a: {
          name: 'Spiritbound',
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
          name: 'Pack Ritual',
          description: '+2/4% damage per debuff stack on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 2 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 2 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 4 } }] },
          },
        },
        t3c: bh('Ethereal Touch', '+10/20% ailment potency.',
          { ailmentPotency: 10 },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t4b: bh('Minion Bond', '+15/30% minion attack damage.',
          { minionDamageMult: 15 },
          { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Phantom Step',
        description: 'On Haunt cast, gain 15% dodge chance for 2s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { postCastDodgeWindow: { duration: 2, dodgeChance: 15 } },
      },
      t4Notable: {
        name: 'Soul Tether',
        description: 'When Haunt kills an enemy, summon a temporary spirit (3s) that attacks with you.',
        nodeType: 'notable', maxRank: 1,
        modifier: { hauntKillSpawnsMinion: true },
      },
      t5a: {
        name: 'Spectral Chain',
        description: 'Haunt chains to 3 additional targets on cast.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { chainCount: 3 },
      },
      t5b: {
        name: 'Persistent Haunt',
        description: '+200% Haunt duration, +100% cooldown.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { durationBonus: 200, cooldownIncrease: 100 },
      },
      t6Notable: {
        name: 'Soul Hunger',
        description: 'Haunt gains +5 life on hit and 10% of hit damage as life leech.',
        nodeType: 'notable', maxRank: 1,
        modifier: { lifeOnHit: 5, leechPercent: 10 },
      },
      t7Keystone: {
        name: 'SPIRIT AWAKENING',
        description: '+100% damage while minions are alive. Cost: +3s cooldown.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 100 } }],
          cooldownIncrease: 60,
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 1 — Plague Doctor
    // ════════════════════════════════════════════════════════════
    {
      name: 'Plague Doctor',
      description: 'Haunt as a DoT engine. Stack, spread, compound.',
      behaviorNodes: {
        t1a: bh('Deep Chill', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Lasting Frost', '+20/40% ailment duration.',
          { ailmentDuration: 20 },
          { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 40 } }),
        t2b: bh('Rotting Cold', '+10/20% chaos penetration.',
          { chaosPenetration: 10 },
          { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Creeping Dread',
          description: '+10/20% damage while 3+ debuffs active on target.',
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
          name: 'Multiplied Curse',
          description: '+3/6% damage per debuff on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Weapon Mastery', '+15/30% weapon mastery (total damage multiplier).',
          { weaponMastery: 15 },
          { 1: { weaponMastery: 15 }, 2: { weaponMastery: 30 } }),
        t4b: bh('Plague Amplifier', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Frostbane',
        description: 'Haunt also applies a stack of chilled to the target on each cast.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hauntAppliesChilled: { stacks: 1, duration: 3 } } },
      },
      t4Notable: {
        name: 'Miasma',
        description: 'Haunt hits ALL enemies in the pack on cast.',
        nodeType: 'notable', maxRank: 1,
        modifier: { hauntIsAoe: true },
      },
      t5a: {
        name: 'Eternal Chill',
        description: '+100% Haunt duration. Cost: −25% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { ailmentDuration: 100, incDamage: -25 },
      },
      t5b: {
        name: 'Deep Freeze',
        description: 'On Haunt crit, all DoTs on target explode for 3× their DoT damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { dotExplodeOnCrit: { multiplier: 3 } } },
      },
      t6Notable: {
        name: 'Pandemic Haunt',
        description: 'On Haunt carrier death, transfer ALL debuffs (not just Haunt\'s) to the next target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { transferAllOnCarrierDeath: true } },
      },
      t7Keystone: {
        name: 'DEATH MARCH',
        description: 'Each Haunt chain hop deals +30% more damage than the previous (compounds).',
        nodeType: 'keystone', maxRank: 1,
        modifier: { hauntChainDamageCompound: 30 },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 2 — Voodoo Master
    // ════════════════════════════════════════════════════════════
    {
      name: 'Voodoo Master',
      description: 'Haunt as curse and control. Target them, break them, execute them.',
      behaviorNodes: {
        t1a: bh('Cursed Mastery', '+10/20% damage.',
          { incDamage: 10 },
          { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Hexed Sight', '+8/16% critical strike chance.',
          { incCritChance: 8 },
          { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Shadow Crit', '+10/20% critical strike multiplier.',
          { incCritMultiplier: 10 },
          { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Vultureclaw',
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
        t3b: bh('Swift Curse', '−10/20% cooldown.',
          { cooldownReduction: 10 },
          { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Potent Hex', '+20/40% ailment potency.',
          { ailmentPotency: 20 },
          { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Curse', '+20/40% damage.',
          { incDamage: 20 },
          { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Hexed Target',
        description: '+30% damage vs targets carrying any debuff stack of 2 or more.',
        nodeType: 'notable', maxRank: 1,
        modifier: {
          conditionalMods: [{ condition: 'whileDebuffActive', threshold: 2, modifier: { incDamage: 30 } }],
        },
      },
      t4Notable: {
        name: 'Weakening Touch',
        description: 'Haunt deals +15% damage to targets already carrying a Haunt debuff (self-scaling repeat casts).',
        nodeType: 'notable', maxRank: 1,
        modifier: { hauntedTargetHauntBonus: 15 },
      },
      t5a: {
        name: 'Piercing Haunt',
        description: 'Haunt ignores cold resistance (+100% cold penetration).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { coldPenetration: 100 },
      },
      t5b: {
        name: 'Shattering Cold',
        description: 'On Haunt crit, detonate all DoTs on target for 3× their DoT damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { dotExplodeOnCrit: { multiplier: 3 } } },
      },
      t6Notable: {
        name: 'Frozen Mind',
        description: 'Haunted enemies are silenced (cannot attack) for 0.5s every 2s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hauntedSilence: { duration: 0.5, interval: 2 } } },
      },
      t7Keystone: {
        name: 'MIND PRISON',
        description: 'Haunted enemies die instantly when their HP drops below 15%.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { hauntedExecuteThreshold: 15 },
      },
    },
  ],
});

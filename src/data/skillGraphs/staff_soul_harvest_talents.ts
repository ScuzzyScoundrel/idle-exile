// ============================================================
// Idle Exile — Staff v2 Soul Harvest Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Generator of soul_stack resource + consumer of hexed for 2× damage.
// Branches: Plague Doctor (DoT spread) / Spirit Caller (minion shield) / Voodoo Master (stack crit nuke)
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

export const STAFF_SOUL_HARVEST_TALENT_TREE = createTalentTree({
  skillId: 'staff_soul_harvest',
  prefix: 'sh',
  branches: [
    // ════════════════════════════════════════════════════════════
    // Branch 0 — Plague Doctor
    // ════════════════════════════════════════════════════════════
    {
      name: 'Plague Doctor',
      description: 'Soul Harvest feeds the plague. Stacks amplify disease — consuming hexed spreads it.',
      behaviorNodes: {
        t1a: bh('Festering Dose', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Deep Poison', '+10/20% ailment potency.',
          { ailmentPotency: 10 },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Chaos Focus', '+10/20% chaos penetration.',
          { chaosPenetration: 10 },
          { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t3a: {
          name: 'Virulent Shred',
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
        t3c: bh('Lingering Harvest', '+15/30% ailment duration.',
          { ailmentDuration: 15 },
          { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 30 } }),
        t4b: bh('Virulent Support', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
      },
      t2Notable: {
        name: 'Plague Harvest',
        description: 'Soul Harvest applies 2 stacks of poison on hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestAppliesPoisonStacks: 2 } },
      },
      t4Notable: {
        name: 'Blight Bloom',
        description: 'When soul_stacks are consumed, spread all DoTs from the target to 1 adjacent enemy per stack consumed.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulStackConsumeSpreadsAilments: { perStack: 1 } } },
      },
      t5a: {
        name: 'Stackweaver',
        description: '+15% damage per active soul_stack.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { damagePerSoulStackActive: 15 },
      },
      t5b: {
        name: 'Eternal Hex',
        description: 'When Soul Harvest consumes Hexed, refresh Hexed on ALL pack enemies for full duration.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexedConsumeRefreshesAllPack: true } },
      },
      t6Notable: {
        name: 'Plague Sentinel',
        description: 'Soul Harvest kills spread all of that target\'s debuffs to a nearby enemy.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestKillSpreadsAilments: true } },
      },
      t7Keystone: {
        name: 'THE WHITE DEATH',
        description: 'Soul Harvest deals no direct damage. Instead, applies 5 stacks of a unique Rotting debuff (7% max HP chaos DoT per stack, 2s each, stacking).',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          weaponDamageOverride: 0,
          directDamageOverride: 0,
          rawBehaviors: { soulHarvestPureRotting: { stacks: 5, maxHpPercent: 7, duration: 2 } },
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 1 — Spirit Caller
    // ════════════════════════════════════════════════════════════
    {
      name: 'Spirit Caller',
      description: 'Soul Harvest is soul energy — it shields, heals, and empowers your minions.',
      behaviorNodes: {
        t1a: bh('Spirit Strike', '+10/20% damage per minion alive.',
          { damagePerMinionAlive: 10 },
          { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t1b: bh('Bone Warden', '+15/30% minion max HP.',
          { minionHpMult: 15 },
          { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t2b: bh('Pack Ritual', '+20/40% minion duration.',
          { minionDurationMult: 20 },
          { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Spiritbound Burst',
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
          name: 'Bloody Pact',
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
        t3c: bh('Minion Might', '+15/30% minion attack damage.',
          { minionDamageMult: 15 },
          { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
        t4b: bh('Pack Master', '+10/20% damage per minion alive.',
          { damagePerMinionAlive: 10 },
          { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
      },
      t2Notable: {
        name: 'Soul Feast',
        description: 'On Soul Harvest cast, each active soul_stack heals all minions for 5% of their max HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { soulStackConsumeHealsMinions: 5 },
      },
      t4Notable: {
        name: 'Soul Absorption',
        description: 'Each Soul Harvest cast grants all minions a shield = 10% of their max HP for 4s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestGrantsMinionShield: { percent: 10, duration: 4 } } },
      },
      t5a: {
        name: 'Stacks Summon Spirits',
        description: 'Consuming soul_stacks also summons 1 temporary spirit per stack consumed.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { soulStackConsumeSpawnsSpirits: { perStack: 1 } } },
      },
      t5b: {
        name: 'Soul Binding',
        description: 'While at 5 soul_stacks, minions cannot be killed (damage reduces HP but never below 1).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { maxSoulStacksGrantsMinionInvuln: true } },
      },
      t6Notable: {
        name: 'Soul Forge',
        description: 'Soul Harvest at max soul_stacks (without consuming them) refreshes minion duration and restores all minions to full HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { maxStacksRefreshesMinions: true } },
      },
      t7Keystone: {
        name: 'LORD OF SOULS',
        description: 'Consuming Hexed with Soul Harvest summons 3 permanent spirits (30s duration, 2× damage).',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { hexedConsumeSummonsPermanentSpirits: { count: 3, duration: 30, damageMult: 2.0 } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 2 — Voodoo Master
    // ════════════════════════════════════════════════════════════
    {
      name: 'Voodoo Master',
      description: 'Soul Harvest is your ammo. Stack, crit, consume — burst escalation through pure stacks.',
      behaviorNodes: {
        t1a: bh('Cursed Bite', '+10/20% damage.',
          { incDamage: 10 },
          { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Sharp Mind', '+8/16% critical strike chance.',
          { incCritChance: 8 },
          { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Vicious Curse', '+10/20% critical strike multiplier.',
          { incCritMultiplier: 10 },
          { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Weakness Seeker',
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
        t3b: bh('Swift Harvest', '−10/20% cooldown.',
          { cooldownReduction: 10 },
          { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Potent Curse', '+20/40% ailment potency.',
          { ailmentPotency: 20 },
          { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 40 } }),
        t4b: bh('Heavy Curse Support', '+20/40% damage.',
          { incDamage: 20 },
          { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Soul Drain',
        description: 'Soul Harvest heals the player for 10% of damage dealt.',
        nodeType: 'notable', maxRank: 1,
        modifier: { soulHarvestDamageHealPercent: 10 },
      },
      t4Notable: {
        name: 'Double Harvest',
        description: 'Critical Soul Harvest casts grant +1 bonus soul_stack (2 stacks instead of 1).',
        nodeType: 'notable', maxRank: 1,
        modifier: { soulHarvestCritBonusStacks: 1 },
      },
      t5a: {
        name: 'Stackbreaker',
        description: '+30% damage per active soul_stack (stacks multiplicatively with other stack bonuses).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { damagePerSoulStackActive: 30 },
      },
      t5b: {
        name: 'Max Potency',
        description: 'At 5 soul_stacks, Soul Harvest always critically strikes.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestMaxStackGuaranteedCrit: true } },
      },
      t6Notable: {
        name: 'Twin Harvest',
        description: 'Soul Harvest critical strikes cast the skill a second time immediately (doubleCast on crit).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestCritDoubleCast: true } },
      },
      t7Keystone: {
        name: 'THE BLOOD MARCH',
        description: 'Soul Harvest consumes all soul_stacks on every cast for +60% damage per stack. Cost: soul_stacks can never exceed 1.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          rawBehaviors: { soulHarvestAlwaysConsumes: { perStack: 60, forceCap: 1 } },
        },
      },
    },
  ],
});

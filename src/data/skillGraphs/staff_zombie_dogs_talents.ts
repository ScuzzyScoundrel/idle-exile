// ============================================================
// Idle Exile — Staff v2 Zombie Dogs Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Tank minion summon. Bites apply haunted + poisoned (chaos).
// Per docs/weapon-designs/staff-v2/zombie_dogs.json
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_ZOMBIE_DOGS_TALENT_TREE = createTalentTree({
  skillId: 'staff_zombie_dogs',
  prefix: 'zd',
  branches: [
    // ════ Branch 0 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Bigger, stronger, more persistent. The pack is a fortress.',
      behaviorNodes: {
        t1a: bh('Bone Warden', '+20/40% dog max HP.',
          { minionHpMult: 20 }, { 1: { minionHpMult: 20 }, 2: { minionHpMult: 40 } }),
        t1b: bh('Pack Spawn', 'On Zombie Dogs cast: 25/50% chance to summon a 3s spirit.',
          { procs: [{ id: 'zd_pack_spawn', trigger: 'onCast', chance: 0.25, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
          { 1: { procs: [{ id: 'zd_pack_spawn', trigger: 'onCast', chance: 0.25, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
            2: { procs: [{ id: 'zd_pack_spawn', trigger: 'onCast', chance: 0.50, summonMinion: { type: 'spirit_temp', duration: 3 } }] } }),
        t2b: bh('Pack Power', '+10/20% dog damage per dog alive.',
          { rawBehaviors: { dogPackPowerPerDog: 10 } },
          { 1: { rawBehaviors: { dogPackPowerPerDog: 10 } }, 2: { rawBehaviors: { dogPackPowerPerDog: 20 } } }),
        t3a: {
          name: 'Pack Hunter', description: '+15/30% damage while 2+ minions alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Lifesteal', 'Dog bites 25/50% chance to heal you 1% max HP.',
          { rawBehaviors: { dogBiteLifesteal: { chance: 25, healPercent: 1 } } },
          { 1: { rawBehaviors: { dogBiteLifesteal: { chance: 25, healPercent: 1 } } },
            2: { rawBehaviors: { dogBiteLifesteal: { chance: 50, healPercent: 1 } } } }),
        t3c: bh('Quick Bite', 'Dog attack interval −0.5/1.0s.',
          { zombieDogAttackIntervalReduction: 0.5 }, { 1: { zombieDogAttackIntervalReduction: 0.5 }, 2: { zombieDogAttackIntervalReduction: 1.0 } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Alpha Pack', description: '+1 extra dog summoned (3 instead of 2).',
        nodeType: 'notable', maxRank: 1,
        modifier: { extraZombieDogCount: 1 },
      },
      t4Notable: {
        name: 'Dog Regen', description: 'Dogs heal 5% max HP/sec while not taking damage (3s safe window).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dogRegenPercentPerSecond: 5, dogRegenSafeWindowSeconds: 3 } },
      },
      t5a: {
        name: 'Pack of Five', description: '+3 extra dogs. Cost: −40% dog max HP.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { extraZombieDogCount: 3, minionHpMult: -40 },
      },
      t5b: {
        name: 'Endless Pack', description: 'Dogs auto-revive 3s after death at 50% HP. Cost: −25% dog max HP.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionHpMult: -25, rawBehaviors: { dogAutoReviveSeconds: 3, dogAutoReviveHpPercent: 50 } },
      },
      t6Notable: {
        name: 'Aura of Death', description: 'Each living dog: +10% all your damage (passive aura).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dogAuraDamagePerDog: 10 } },
      },
      t7Keystone: {
        name: 'THE ALPHA', description: 'Summon only 1 Alpha dog (3× HP, 2× damage, 50% slower attacks).',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { alphaDogMode: { hpMult: 3.0, damageMult: 2.0, intervalMult: 1.5 } } },
      },
    },

    // ════ Branch 1 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Every bite spreads disease. The pack as a debuff distribution system.',
      behaviorNodes: {
        t1a: bh('Rotting Fangs', 'Each dog bite applies 1/2 stacks of Poisoned (3s).',
          { rawBehaviors: { dogBitePoisonStacks: 1 } },
          { 1: { rawBehaviors: { dogBitePoisonStacks: 1 } }, 2: { rawBehaviors: { dogBitePoisonStacks: 2 } } }),
        t1b: bh('Disease Carrier', 'Dog bites 25/50% chance to apply Bleeding (3s).',
          { rawBehaviors: { dogBiteBleedingChance: 25 } },
          { 1: { rawBehaviors: { dogBiteBleedingChance: 25 } }, 2: { rawBehaviors: { dogBiteBleedingChance: 50 } } }),
        t2b: {
          name: 'Pack Plague', description: '+5/10% damage per debuff on target.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3a: bh('Putrid Bite', 'Dog bites +5/10% chance to apply +1 existing debuff stack.',
          { rawBehaviors: { dogBiteExtraStackChance: 5 } },
          { 1: { rawBehaviors: { dogBiteExtraStackChance: 5 } }, 2: { rawBehaviors: { dogBiteExtraStackChance: 10 } } }),
        t3b: bh('Crit Bite', 'Dog crits apply 1/2 stacks each of Poisoned + Bleeding.',
          { rawBehaviors: { dogCritExtraStacks: { poisoned: 1, bleeding: 1 } } },
          { 1: { rawBehaviors: { dogCritExtraStacks: { poisoned: 1, bleeding: 1 } } },
            2: { rawBehaviors: { dogCritExtraStacks: { poisoned: 2, bleeding: 2 } } } }),
        t3c: bh('Chaos Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Plague Hounds', description: 'Dogs deal +50% damage to Plagued targets.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dogsBonusDamageVsPlagued: 50 } },
      },
      t4Notable: {
        name: 'Apply All DoTs', description: 'Dog bites 10% chance to apply ALL your active DoTs to target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dogBiteApplyAllDotsChance: 10 } },
      },
      t5a: {
        name: 'Eternal Plague', description: 'DoTs applied by dogs: +100% duration. Cost: −25% dog damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionDamageMult: -25, rawBehaviors: { dogAppliedDotDurationBonus: 100 } },
      },
      t5b: {
        name: 'Pestilent Pack', description: 'Dogs apply Plagued (5s) on every bite. Cost: dog attack interval +1s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { zombieDogAttackIntervalReduction: -1, rawBehaviors: { dogBiteAppliesPlagued: { duration: 5 } } },
      },
      t6Notable: {
        name: 'Death Pulse', description: 'When a dog dies: explodes for 100% its max HP as chaos AoE.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dogDeathPulsePercent: 100 } },
      },
      t7Keystone: {
        name: 'THE PLAGUE PACK', description: 'All dog bites apply Hexed + Haunted. Cost: −50% dog max HP.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionHpMult: -50, rawBehaviors: { dogBiteAppliesHexedHaunted: true } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Dogs feed soul stacks and hex synergy. Pack as burst-skill fuel.',
      behaviorNodes: {
        t1a: {
          name: 'Pack Aura', description: '+5/10% all your damage while any dog alive.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          },
        },
        t1b: bh('Soul Bite', 'Dog bites 10/20% chance to gen 1 soul_stack. ICD 2s.',
          { rawBehaviors: { dogBiteSoulStackChance: 10, dogBiteSoulStackICD: 2 } },
          { 1: { rawBehaviors: { dogBiteSoulStackChance: 10, dogBiteSoulStackICD: 2 } },
            2: { rawBehaviors: { dogBiteSoulStackChance: 20, dogBiteSoulStackICD: 2 } } }),
        t2b: {
          name: 'Hex Synergy', description: '+15/30% damage on Hexed targets.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 30 } }] },
          },
        },
        t3a: bh('Stack Synergy', '+5/10% dog damage per active soul_stack.',
          { rawBehaviors: { dogDamagePerSoulStack: 5 } },
          { 1: { rawBehaviors: { dogDamagePerSoulStack: 5 } }, 2: { rawBehaviors: { dogDamagePerSoulStack: 10 } } }),
        t3b: bh('Crit Soul', 'Dog crits 50/100% chance to gen soul_stack. ICD 2s.',
          { rawBehaviors: { dogCritSoulStackChance: 50, dogCritSoulStackICD: 2 } },
          { 1: { rawBehaviors: { dogCritSoulStackChance: 50, dogCritSoulStackICD: 2 } },
            2: { rawBehaviors: { dogCritSoulStackChance: 100, dogCritSoulStackICD: 2 } } }),
        t3c: bh('Quickdraw', '−15/30% Zombie Dogs cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Cursed Pack', description: 'Dogs deal +50% damage to Hexed targets.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { dogsBonusDamageVsHexed: 50 } },
      },
      t4Notable: {
        name: 'Pack Catalyst', description: 'On Zombie Dogs cast: gen 2 soul_stacks.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'zd_pack_catalyst', trigger: 'onCast', chance: 1.0, createComboState: { stateId: 'soul_stack', stacks: 2 } }] },
      },
      t5a: {
        name: 'Bloodhounds', description: 'Dog bites +1% target max HP as chaos. Cost: dog max HP −30%.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionHpMult: -30, rawBehaviors: { dogBiteMaxHpDamagePercent: 1 } },
      },
      t5b: {
        name: 'Hex Pack', description: 'Every 3rd dog bite applies Hexed (5s). Cost: −25% dog damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionDamageMult: -25, rawBehaviors: { dogBiteEveryNHexed: { everyN: 3, duration: 5 } } },
      },
      t6Notable: {
        name: 'Pack Resonance', description: 'On crit of Hexed target: all dogs immediately attack (reset timers).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { critHexedTriggersDogPackAttack: true } },
      },
      t7Keystone: {
        name: 'THE PACK LORD', description: 'Each soul_stack: +20% dog damage (uncapped). Cost: dog max HP −50%.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionHpMult: -50, rawBehaviors: { dogDamagePerSoulStackUncapped: 20 } },
      },
    },
  ],
});

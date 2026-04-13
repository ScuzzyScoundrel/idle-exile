// ============================================================
// Idle Exile — Staff v2 Fetish Swarm Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: 4 glass-cannon fetishes, 1.25s interval, 6s duration, physical.
// Per docs/weapon-designs/staff-v2/fetish_swarm.json
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
    // ════ Branch 0 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'More fetishes, faster attacks, frenzy snowballing.',
      behaviorNodes: {
        t1a: bh('Extra Fetish', '+1/2 extra fetishes summoned.',
          { extraFetishCount: 1 }, { 1: { extraFetishCount: 1 }, 2: { extraFetishCount: 2 } }),
        t1b: bh('Frenzy Building', 'Each fetish kill: +1/2% pack attack speed (max 20%).',
          { rawBehaviors: { fetishFrenzyStacking: { perKillPercent: 1, maxPercent: 20 } } },
          { 1: { rawBehaviors: { fetishFrenzyStacking: { perKillPercent: 1, maxPercent: 20 } } },
            2: { rawBehaviors: { fetishFrenzyStacking: { perKillPercent: 2, maxPercent: 20 } } } }),
        t2b: bh('Quick Strike', '+15/30% fetish attack speed.',
          { rawBehaviors: { fetishAttackSpeedMult: 15 } },
          { 1: { rawBehaviors: { fetishAttackSpeedMult: 15 } }, 2: { rawBehaviors: { fetishAttackSpeedMult: 30 } } }),
        t3a: {
          name: 'Pack Hunter', description: '+15/30% damage while 3+ minions alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Spawn Spawn', 'Fetish kills 15/30% chance to spawn 3s spirit.',
          { rawBehaviors: { fetishKillSpiritSpawnChance: 15 } },
          { 1: { rawBehaviors: { fetishKillSpiritSpawnChance: 15 } }, 2: { rawBehaviors: { fetishKillSpiritSpawnChance: 30 } } }),
        t3c: bh('Persistent Pack', '+15/30% fetish max HP.',
          { minionHpMult: 15 }, { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Lingering Pack', description: '+50% fetish duration (6s → 9s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { minionDurationMult: 50 },
      },
      t4Notable: {
        name: 'Dog Spawn', description: 'When a fetish dies: 25% chance to spawn a Zombie Dog (5s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishOnDeathSpawnDog: { chance: 25, duration: 5 } } },
      },
      t5a: {
        name: 'Swarm of Eight', description: '+4 extra fetishes (8 total). Cost: −30% fetish damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { extraFetishCount: 4, rawBehaviors: { fetishDamageMult: -30 } },
      },
      t5b: {
        name: 'All-Frenzy', description: 'Frenzy max 50%, all minion kills grant stacks. Cost: fetish max HP −30%.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionHpMult: -30, rawBehaviors: { fetishFrenzyAllMinionKills: true, fetishFrenzyMaxOverride: 50 } },
      },
      t6Notable: {
        name: 'Brood Mother', description: 'On Fetish Swarm cast: also summon 1 Zombie Dog (5s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishCastSummonsDog: { duration: 5 } } },
      },
      t7Keystone: {
        name: 'THE BLOOD CULT', description: 'Fetishes are permanent (auto-resummon 5s after all dead). Cost: max 2 fetishes.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { extraFetishCount: -2, rawBehaviors: { fetishPermanentMode: { resummonDelay: 5 } } },
      },
    },

    // ════ Branch 1 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Fetishes carry plague — every dart a debuff apply.',
      behaviorNodes: {
        t1a: bh('Venom Darts', '+15/30% fetish damage + 50% phys→chaos conversion.',
          { rawBehaviors: { fetishDamageMult: 15, fetishPhysToChaosPercent: 50 } },
          { 1: { rawBehaviors: { fetishDamageMult: 15, fetishPhysToChaosPercent: 50 } },
            2: { rawBehaviors: { fetishDamageMult: 30, fetishPhysToChaosPercent: 50 } } }),
        t1b: bh('Toxic Hits', 'Fetish hits 15/30% chance to apply Poisoned (3s).',
          { rawBehaviors: { fetishHitPoisonChance: 15 } },
          { 1: { rawBehaviors: { fetishHitPoisonChance: 15 } }, 2: { rawBehaviors: { fetishHitPoisonChance: 30 } } }),
        t2b: {
          name: 'Pack Plague', description: '+5/10% damage per debuff on target.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3a: {
          name: 'Disease Synergy', description: '+15/30% fetish damage on Plagued targets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Bleed Darts', 'Fetish crits apply 1/2 stacks of Bleeding (3s).',
          { rawBehaviors: { fetishCritBleedingStacks: 1 } },
          { 1: { rawBehaviors: { fetishCritBleedingStacks: 1 } }, 2: { rawBehaviors: { fetishCritBleedingStacks: 2 } } }),
        t3c: bh('Chaos Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Plague Darts', description: 'Every 4th fetish hit applies 1 Plagued stack (5s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishEveryNAppliesPlagued: { everyN: 4, duration: 5 } } },
      },
      t4Notable: {
        name: 'Plague Volley', description: 'Each fetish attack also hits 1 adjacent at 50% damage + DoT rolls.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishAttackSplashTargets: 1, fetishSplashPercent: 50 } },
      },
      t5a: {
        name: 'Toxic Bond', description: 'DoTs applied by fetishes: +75% duration. Cost: −20% fetish damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { fetishAppliedDotDurationBonus: 75, fetishDamageMult: -20 } },
      },
      t5b: {
        name: 'Plague Conduit', description: 'Every 5s: fetishes apply ALL your DoTs to target. Cost: fetish duration −2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { fetishPlagueConduitSeconds: 5, fetishDurationPenaltySeconds: 2 } },
      },
      t6Notable: {
        name: 'Death Cloud', description: 'On fetish death: 3s poison cloud dealing 50% its max HP to nearby enemies.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishDeathPoisonCloud: { duration: 3, damagePercent: 50 } } },
      },
      t7Keystone: {
        name: 'THE PESTILENCE', description: 'All fetish hits apply 1 Poisoned + 1 Bleeding. Cost: −50% fetish max HP.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionHpMult: -50, rawBehaviors: { fetishHitAlwaysAppliesPoisonAndBleeding: true } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Crit-driven, soul-stack feeders. Empower your burst skills.',
      behaviorNodes: {
        t1a: bh('Sharp Darts', '+10/20% fetish crit chance.',
          { rawBehaviors: { fetishCritChance: 10 } },
          { 1: { rawBehaviors: { fetishCritChance: 10 } }, 2: { rawBehaviors: { fetishCritChance: 20 } } }),
        t1b: bh('Soul Darts', 'Fetish hits 5/10% chance to gen soul_stack. ICD 1s.',
          { rawBehaviors: { fetishHitSoulStackChance: 5, fetishHitSoulStackICD: 1 } },
          { 1: { rawBehaviors: { fetishHitSoulStackChance: 5, fetishHitSoulStackICD: 1 } },
            2: { rawBehaviors: { fetishHitSoulStackChance: 10, fetishHitSoulStackICD: 1 } } }),
        t2b: {
          name: 'Hex Synergy', description: '+15/30% damage on Hexed targets.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 30 } }] },
          },
        },
        t3a: bh('Stack Synergy', '+5/10% fetish damage per active soul_stack.',
          { rawBehaviors: { fetishDamagePerSoulStack: 5 } },
          { 1: { rawBehaviors: { fetishDamagePerSoulStack: 5 } }, 2: { rawBehaviors: { fetishDamagePerSoulStack: 10 } } }),
        t3b: bh('Crit Soul', 'Fetish crits 35/70% chance to gen soul_stack. ICD 1.5s.',
          { rawBehaviors: { fetishCritSoulStackChance: 35, fetishCritSoulStackICD: 1.5 } },
          { 1: { rawBehaviors: { fetishCritSoulStackChance: 35, fetishCritSoulStackICD: 1.5 } },
            2: { rawBehaviors: { fetishCritSoulStackChance: 70, fetishCritSoulStackICD: 1.5 } } }),
        t3c: bh('Quickdraw', '−15/30% Fetish Swarm cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Pack Catalyst', description: 'On Fetish Swarm cast: gen 2 soul_stacks.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'fs_pack_catalyst', trigger: 'onCast', chance: 1.0, createComboState: { stateId: 'soul_stack', stacks: 2 } }] },
      },
      t4Notable: {
        name: 'Predator Pack', description: 'Fetish crits also crit on next 2 attacks (per fetish).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { fetishCritCascadeAttacks: 2 } },
      },
      t5a: {
        name: 'Glass Cannons', description: 'Fetishes deal +75% damage. Cost: fetish max HP −50%.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { minionHpMult: -50, rawBehaviors: { fetishDamageMult: 75 } },
      },
      t5b: {
        name: 'Soul Bond', description: 'Each soul_stack: +15% fetish damage (uncapped). Cost: Fetish Swarm CD +3s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 3, rawBehaviors: { fetishDamagePerSoulStackUncapped: 15 } },
      },
      t6Notable: {
        name: 'Pack Resonance', description: 'On your skill crit: all fetishes immediately attack target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { playerCritTriggersFetishPackAttack: true } },
      },
      t7Keystone: {
        name: 'THE FETISH KING', description: '1 Fetish King (4× dmg, 4× HP, 50% slower, crits). Cost: only 1 fetish.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { extraFetishCount: -3, rawBehaviors: { fetishKingMode: { damageMult: 4.0, hpMult: 4.0, intervalMult: 1.5 } } },
      },
    },
  ],
});

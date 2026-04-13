// ============================================================
// Idle Exile — Staff v2 Bouncing Skull Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Fire chain projectile (2 base). Consumes soul_stack for +1 bounce per stack.
// Per docs/weapon-designs/staff-v2/bouncing_skull.json
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_BOUNCING_SKULL_TALENT_TREE = createTalentTree({
  skillId: 'staff_bouncing_skull',
  prefix: 'bk',
  branches: [
    // ════ Branch 0 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Soul stack consume goes nuclear. Each bounce hits harder than last.',
      behaviorNodes: {
        t1a: bh('Compounding Bounce', 'Each bounce after first: +10/20% damage (compounds).',
          { rawBehaviors: { bouncingSkullDamageCompound: 10 } },
          { 1: { rawBehaviors: { bouncingSkullDamageCompound: 10 } }, 2: { rawBehaviors: { bouncingSkullDamageCompound: 20 } } }),
        t1b: bh('Soul Bounce', 'BK crits 25/50% chance to gen soul_stack. ICD 2s.',
          { procs: [{ id: 'bk_soul_bounce', trigger: 'onCrit', chance: 0.25, internalCooldown: 2.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
          { 1: { procs: [{ id: 'bk_soul_bounce', trigger: 'onCrit', chance: 0.25, internalCooldown: 2.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
            2: { procs: [{ id: 'bk_soul_bounce', trigger: 'onCrit', chance: 0.50, internalCooldown: 2.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] } }),
        t2b: {
          name: 'Hex Synergy', description: '+15/30% BK damage on Hexed targets.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 30 } }] },
          },
        },
        t3a: bh('Stack Synergy', '+5/10% BK damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3b: bh('Hex Strike', 'BK crits 25/50% chance to apply Hexed (5s). ICD 4s.',
          { procs: [{ id: 'bk_hex_strike', trigger: 'onCrit', chance: 0.25, internalCooldown: 4.0, applyDebuff: { debuffId: 'hexed', duration: 5 } }] },
          { 1: { procs: [{ id: 'bk_hex_strike', trigger: 'onCrit', chance: 0.25, internalCooldown: 4.0, applyDebuff: { debuffId: 'hexed', duration: 5 } }] },
            2: { procs: [{ id: 'bk_hex_strike', trigger: 'onCrit', chance: 0.50, internalCooldown: 4.0, applyDebuff: { debuffId: 'hexed', duration: 5 } }] } }),
        t3c: bh('Quickdraw', '−15/30% Bouncing Skull cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Soul Cannon', description: 'Each soul_stack consumed: +25% damage (on top of +1 bounce).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulConsumeChainBonus: 25 } },
      },
      t4Notable: {
        name: 'Death Cascade', description: 'BK kills refund bounce count (skull continues with reset counter).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullKillRefundsBounces: true } },
      },
      t5a: {
        name: 'Final Whisper', description: 'Last bounce of BK deals +200% damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullFinalBounceBonus: 200 } },
      },
      t5b: {
        name: 'Mass Soul Burst', description: 'Each soul_stack consumed: +2 bounces AND +50% damage. Cost: BK CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { soulConsumeBounceMultiplier: 2, soulConsumeDamagePerStackMultiplier: 50 } },
      },
      t6Notable: {
        name: 'Soul Resonance', description: 'BK crits also generate 1 soul_stack instantly.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullCritGuaranteesSoulStack: true } },
      },
      t7Keystone: {
        name: 'THE FINAL CALL', description: 'BK consumes ALL active combo states: +50% damage per consumed. Cost: BK CD +5s.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 5, rawBehaviors: { bouncingSkullConsumesAllStates: { perStatePercent: 50 } } },
      },
    },

    // ════ Branch 1 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Each bounce manifests a spirit. Skulls become summoning events.',
      behaviorNodes: {
        t1a: bh('Extra Bounce', '+1/2 base bounces.',
          { chainCount: 1 }, { 1: { chainCount: 1 }, 2: { chainCount: 2 } }),
        t1b: bh('Spirit Bounce', 'Each BK bounce 15/30% chance to spawn 2s spirit.',
          { rawBehaviors: { bouncingSkullBounceSpiritChance: 15 } },
          { 1: { rawBehaviors: { bouncingSkullBounceSpiritChance: 15 } }, 2: { rawBehaviors: { bouncingSkullBounceSpiritChance: 30 } } }),
        t2b: {
          name: 'Bound Power', description: '+10/20% BK damage while any minion alive.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          },
        },
        t3a: {
          name: 'Pack Hunter', description: '+20/40% crit chance while 2+ minions alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incCritChance: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incCritChance: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incCritChance: 40 } }] },
          },
        },
        t3b: bh('Bone Echo', 'On BK cast: 25/50% chance to summon 4s spirit immediately.',
          { procs: [{ id: 'bk_bone_echo', trigger: 'onCast', chance: 0.25, summonMinion: { type: 'spirit_temp', duration: 4 } }] },
          { 1: { procs: [{ id: 'bk_bone_echo', trigger: 'onCast', chance: 0.25, summonMinion: { type: 'spirit_temp', duration: 4 } }] },
            2: { procs: [{ id: 'bk_bone_echo', trigger: 'onCast', chance: 0.50, summonMinion: { type: 'spirit_temp', duration: 4 } }] } }),
        t3c: bh('Bounce Linger', 'BK bounces +15/30% slower (lingers, enables minion attacks).',
          { rawBehaviors: { bonusBounceDuration: 15 } },
          { 1: { rawBehaviors: { bonusBounceDuration: 15 } }, 2: { rawBehaviors: { bonusBounceDuration: 30 } } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Pack Skull', description: '+1 bounce per living minion.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullPerMinionBounce: 1 } },
      },
      t4Notable: {
        name: 'Spirit Conduit', description: 'Each BK bounce triggers a free minion attack on bounce target.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullBounceTriggersMinionAttacks: true } },
      },
      t5a: {
        name: 'Skull Storm', description: 'BK cast spawns 3 skulls. Cost: −50% damage per skull.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -50, rawBehaviors: { bouncingSkullMultiSkull: { extraSkulls: 2 } } },
      },
      t5b: {
        name: 'Endless Skulls', description: 'BK bounces forever, but loses 15% damage per bounce after the 3rd.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullEndlessBounces: { decayStartBounce: 3, decayPerBouncePercent: 15 } } },
      },
      t6Notable: {
        name: 'Skull Aura', description: 'While 4+ minions alive: BK always crits.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullCritWhileMinionsThreshold: 4 } },
      },
      t7Keystone: {
        name: 'THE BONE CANNON', description: 'BK cast spawns a permanent 8s Skull Tower minion at impact. Cost: BK bounces −2.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { chainCount: -2, rawBehaviors: { boneTowerSummon: { duration: 8 } } },
      },
    },

    // ════ Branch 2 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Each bounce ignites. The skull is the torch that burns the pack.',
      behaviorNodes: {
        t1a: bh('Ignite Chance', 'Each BK bounce 25/50% chance to apply Burning (3s).',
          { rawBehaviors: { igniteChanceOnBounce: 25 } },
          { 1: { rawBehaviors: { igniteChanceOnBounce: 25 } }, 2: { rawBehaviors: { igniteChanceOnBounce: 50 } } }),
        t1b: bh('Compound Heat', 'BK hits 15/30% chance to apply Bleeding (3s).',
          { procs: [{ id: 'bk_compound_heat', trigger: 'onHit', chance: 0.15, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] },
          { 1: { procs: [{ id: 'bk_compound_heat', trigger: 'onHit', chance: 0.15, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] },
            2: { procs: [{ id: 'bk_compound_heat', trigger: 'onHit', chance: 0.30, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] } }),
        t2b: {
          name: 'Plague Synergy', description: '+5/10% damage per debuff on target.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3a: {
          name: 'Burning Synergy', description: '+15/30% BK damage on Burning targets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'burning', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'burning', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'burning', modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Crit Burn', 'BK crits apply Burning (3s/5s).',
          { procs: [{ id: 'bk_crit_burn', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'burning', duration: 3 } }] },
          { 1: { procs: [{ id: 'bk_crit_burn', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'burning', duration: 3 } }] },
            2: { procs: [{ id: 'bk_crit_burn', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'burning', duration: 5 } }] } }),
        t3c: bh('Fire Mastery', '+10/20% fire penetration.',
          { firePenetration: 10 }, { 1: { firePenetration: 10 }, 2: { firePenetration: 20 } }),
        t4b: bh('Fire Support', '+15/30% damage to Fire-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Pyre Trail', description: 'Each BK bounce leaves 2s fire patch (30% of bounce damage/sec).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullPyreTrail: { duration: 2, tickPercent: 30 } } },
      },
      t4Notable: {
        name: 'Pyre Bloom', description: 'Last bounce emits fire AoE dealing 200% of last-bounce damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullFinalAoeBonus: 200 } },
      },
      t5a: {
        name: 'Pyromancer', description: 'Burning DoT damage from your skills doubled. Cost: −20% BK direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -20, rawBehaviors: { globalBurningMultiplier: 2.0 } },
      },
      t5b: {
        name: 'Inferno Trail', description: 'Pyre Trail duration +200% + tick damage +50%. Cost: BK CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { pyreTrailBonusDurationPercent: 200, pyreTrailBonusDamagePercent: 50 } },
      },
      t6Notable: {
        name: 'Stack Compounder', description: '+5% BK damage per Burning/Bleeding/Poisoned stack on target (max +50%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { bouncingSkullStackCompounder: { perStackPercent: 5, maxPercent: 50 } } },
      },
      t7Keystone: {
        name: 'THE BURNING WORLD', description: 'All BK bounces leave 5s fire pool (100% bounce damage/sec). Cost: −50% BK hit damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -50, rawBehaviors: { burningWorldFirePool: { duration: 5, tickPercent: 100 } } },
      },
    },
  ],
});

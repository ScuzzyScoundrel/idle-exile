// ============================================================
// Idle Exile — Staff v2 Hex Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Chaos curse (-20% target damage). Creates hexed combo state.
// Per docs/weapon-designs/staff-v2/hex.json
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
    // ════ Branch 0 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: "Hex's purpose is to be consumed. Every consume a nuke.",
      behaviorNodes: {
        t1a: bh('Hex Mastery', '+15/30% damage to Hexed targets.',
          { hexedTargetDamageAmp: 15 }, { 1: { hexedTargetDamageAmp: 15 }, 2: { hexedTargetDamageAmp: 30 } }),
        t1b: bh('Soul Curse', 'On Hex cast: 50/100% chance to generate 1 soul_stack.',
          { procs: [{ id: 'hx_soul_curse', trigger: 'onCast', chance: 0.50, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
          { 1: { procs: [{ id: 'hx_soul_curse', trigger: 'onCast', chance: 0.50, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
            2: { procs: [{ id: 'hx_soul_curse', trigger: 'onCast', chance: 1.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] } }),
        t2b: bh('Soul Bond', '+5/10% Hex damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3a: {
          name: 'Soul Synergy', description: '+20/40% Hex damage while you have 3+ soul_stacks.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'soul_stack', threshold: 3, modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'soul_stack', threshold: 3, modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'soul_stack', threshold: 3, modifier: { incDamage: 40 } }] },
          },
        },
        t3b: bh('Hex Catalyst', 'On Hex cast: 35/70% chance to reset Soul Harvest cooldown.',
          { procs: [{ id: 'hx_catalyst', trigger: 'onCast', chance: 0.35, resetCooldown: 'staff_soul_harvest' }] },
          { 1: { procs: [{ id: 'hx_catalyst', trigger: 'onCast', chance: 0.35, resetCooldown: 'staff_soul_harvest' }] },
            2: { procs: [{ id: 'hx_catalyst', trigger: 'onCast', chance: 0.70, resetCooldown: 'staff_soul_harvest' }] } }),
        t3c: bh('Ritual Mastery', '−15/30% Hex cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Curse Support', '+20/40% damage to Curse-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Empowered Hex', description: 'Soul Harvest consuming Hexed: +50% damage on top of 2× consume bonus.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestHexedConsumeBonus: 50 } },
      },
      t4Notable: {
        name: 'Vexing Resonance', description: 'Consecutive Hex on same target stacks Vexing (+10% dmg taken, max 5, 8s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'hx_vexing', trigger: 'onCast', chance: 1.0, conditionParam: { sameTarget: true }, applyDebuff: { debuffId: 'vexing', duration: 8, stacks: 1 } }], rawBehaviors: { vexingDebuffMaxStacks: 5 } },
      },
      t5a: {
        name: 'Hexlord', description: 'Hex potency doubled. Cost: Hex CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { hexPotency: 100 } },
      },
      t5b: {
        name: 'Burst Master', description: 'Soul Harvest hexed-consume becomes 3× (was 2×). Cost: −30% Hex direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -30, rawBehaviors: { soulHarvestHexedConsumeMult: 3.0 } },
      },
      t6Notable: {
        name: 'Final Strike', description: 'Hex crits guarantee the next Soul Harvest within 5s also crits.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'hx_final_strike', trigger: 'onCrit', chance: 1.0, applyBuff: { buffId: 'soulHarvestNextCrit', effect: {}, duration: 5 } }] },
      },
      t7Keystone: {
        name: 'THE PUPPETEER', description: 'Hex cast: target takes 1% max HP per soul_stack. Cost: Hex no longer reduces target damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { puppeteerHexCastDamage: { perSoulStackPercent: 1 }, puppeteerDisablesHexDebuff: true } },
      },
    },

    // ════ Branch 1 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Hex empowers minions — Hexed targets become priority for the pack.',
      behaviorNodes: {
        t1a: bh('Curse Reach', 'Hex also applies to 1/2 random adjacent enemies at full potency.',
          { rawBehaviors: { hexSpreadRadius: 1 } },
          { 1: { rawBehaviors: { hexSpreadRadius: 1 } }, 2: { rawBehaviors: { hexSpreadRadius: 2 } } }),
        t1b: bh('Spirit Bind', 'On Hex cast: minions gain +30/60% damage for 5s.',
          { rawBehaviors: { hexCastBuffsMinions: { damageMultPercent: 30, duration: 5 } } },
          { 1: { rawBehaviors: { hexCastBuffsMinions: { damageMultPercent: 30, duration: 5 } } },
            2: { rawBehaviors: { hexCastBuffsMinions: { damageMultPercent: 60, duration: 5 } } } }),
        t2b: {
          name: 'Bound Power', description: '+10/20% Hex damage while any minion alive.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          },
        },
        t3a: {
          name: 'Pack Hunter', description: '+20/40% Hex damage while 2+ minions alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 40 } }] },
          },
        },
        t3b: bh('Hex Echo', 'On Hexed enemy kill: 25/50% chance to spawn a 3s spirit minion.',
          { procs: [{ id: 'hx_echo', trigger: 'onKill', chance: 0.25, conditionParam: { targetHadDebuff: 'hexed' }, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
          { 1: { procs: [{ id: 'hx_echo', trigger: 'onKill', chance: 0.25, conditionParam: { targetHadDebuff: 'hexed' }, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
            2: { procs: [{ id: 'hx_echo', trigger: 'onKill', chance: 0.50, conditionParam: { targetHadDebuff: 'hexed' }, summonMinion: { type: 'spirit_temp', duration: 3 } }] } }),
        t3c: bh('Spectral Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Pack Curse', description: 'Your minions deal +50% damage to Hexed targets.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionBonusDamageVsHexed: 50 } },
      },
      t4Notable: {
        name: 'Resist Shred', description: 'Minion hits on Hexed: reduce target all-resist by 10% for 4s (max 5).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionHexedResistShred: { perAttackPercent: 10, duration: 4, maxStacks: 5 } } },
      },
      t5a: {
        name: 'Spirit Mark', description: 'Each Haunted+Hexed enemy grants +10% all minion damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritMarkBonus: { perEnemyPercent: 10 } } },
      },
      t5b: {
        name: 'Ghostly Curse', description: 'While minion alive: +30% cast speed on Hexed. Cost: −25% Hex potency.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { ghostlyCurseCastSpeed: { amountPercent: 30, requireMinionsAlive: true, requireHexedTarget: true }, hexPotency: -25 } },
      },
      t6Notable: {
        name: "Death's Mark", description: 'Minion kills on Hexed targets summon a 3s spirit (max 1/sec).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { minionHexedKillSummonsSpirit: { duration: 3, internalCooldown: 1 } } },
      },
      t7Keystone: {
        name: 'BINDER OF SOULS', description: 'All minions deal cold + inherit Hex potency. Cost: −30% minion HP.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { minionHpMult: -30, rawBehaviors: { minionsBecomeColdInheritHexPotency: true } },
      },
    },

    // ════ Branch 2 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Hex spreads disease alongside the curse — every Hexed target rots.',
      behaviorNodes: {
        t1a: bh('Curse Potency', '+15/30% Hex potency.',
          { rawBehaviors: { hexPotency: 15 } },
          { 1: { rawBehaviors: { hexPotency: 15 } }, 2: { rawBehaviors: { hexPotency: 30 } } }),
        t1b: bh('Cursed Spread', 'On Hex cast: 25/50% chance to also apply Hex to adjacent enemy.',
          { procs: [{ id: 'hx_cursed_spread', trigger: 'onCast', chance: 0.25 }], rawBehaviors: { hexAdjacentSpread: { extraTargets: 1 } } },
          { 1: { procs: [{ id: 'hx_cursed_spread', trigger: 'onCast', chance: 0.25 }] },
            2: { procs: [{ id: 'hx_cursed_spread', trigger: 'onCast', chance: 0.50 }] } }),
        t2b: bh('Lingering Curse', '+20/40% Hex duration.',
          { rawBehaviors: { hexDuration: 20 } },
          { 1: { rawBehaviors: { hexDuration: 20 } }, 2: { rawBehaviors: { hexDuration: 40 } } }),
        t3a: {
          name: 'Plague Synergy', description: '+15/30% Hex damage on targets with 2+ debuffs.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 2, modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 2, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 2, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Crit Curse', 'Hex crits apply 2/3 stacks of Poisoned (4s).',
          { procs: [{ id: 'hx_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 2 } }] },
          { 1: { procs: [{ id: 'hx_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 2 } }] },
            2: { procs: [{ id: 'hx_crit_poison', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 3 } }] } }),
        t3c: bh('Chaos Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Pestilent Curse', description: 'Hexed enemies receive 1 Bleeding stack (3s) every second.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexAppliesBleedingPerSecond: { duration: 3, stacks: 1 } } },
      },
      t4Notable: {
        name: 'Plague Mark', description: 'Hexed enemy dies → spread Hex to ALL pack at 50% duration.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexedDeathSpreadsHex: { fullSnapshot: true, durationPercent: 50 } } },
      },
      t5a: {
        name: 'Mass Hex', description: 'Hex applies to entire pack at 50% potency.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { hexPackOnCastPotency: 50 } },
      },
      t5b: {
        name: 'Eternal Curse', description: 'Hex duration doubled. Cost: Hex CD +50%.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 3, rawBehaviors: { hexDuration: 100 } },
      },
      t6Notable: {
        name: 'Decay Mark', description: 'Hexed: +1% dmg taken/sec from all sources (max +30%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hexedDecayMark: { perSecondPercent: 1, maxPercent: 30 } } },
      },
      t7Keystone: {
        name: 'THE WITCHING HOUR', description: 'All enemies in zone are permanently Hexed. Cost: −50% Hex direct damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -50, rawBehaviors: { witchingHour: true } },
      },
    },
  ],
});

// ============================================================
// Idle Exile — Staff v2 Haunt Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Cold DoT with chain-on-death. Creates haunted combo state.
// Per docs/weapon-designs/staff-v2/haunt.json
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_HAUNT_TALENT_TREE = createTalentTree({
  skillId: 'staff_haunt',
  prefix: 'ht',
  branches: [
    // ════ Branch 0 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Haunt is the gateway to the spirit world. Chains spawn minions.',
      behaviorNodes: {
        t1a: bh('Soul Channel', '+15/30% Haunt damage.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t1b: bh("Spirit's Touch", 'On Haunt cast: summon a temporary spirit (3/5s).',
          { procs: [{ id: 'ht_spirits_touch', trigger: 'onCast', chance: 1.0, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
          { 1: { procs: [{ id: 'ht_spirits_touch', trigger: 'onCast', chance: 1.0, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
            2: { procs: [{ id: 'ht_spirits_touch', trigger: 'onCast', chance: 1.0, summonMinion: { type: 'spirit_temp', duration: 5 } }] } }),
        t2b: {
          name: 'Bound Power', description: '+10/20% Haunt damage while any minion alive.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 20 } }] },
          },
        },
        t3a: bh('Echoing Death', 'On Haunted enemy kill: gain spiritResonance (+5/10% cast speed, 4s, 5 stacks).',
          { procs: [{ id: 'ht_echoing_death', trigger: 'onKill', chance: 1.0, conditionParam: { targetHadDebuff: 'haunted' }, applyBuff: { buffId: 'spiritResonance', effect: { castSpeedMult: 1.05 }, duration: 4, stacks: 1, maxStacks: 5 } }] },
          { 1: { procs: [{ id: 'ht_echoing_death', trigger: 'onKill', chance: 1.0, conditionParam: { targetHadDebuff: 'haunted' }, applyBuff: { buffId: 'spiritResonance', effect: { castSpeedMult: 1.05 }, duration: 4, stacks: 1, maxStacks: 5 } }] },
            2: { procs: [{ id: 'ht_echoing_death', trigger: 'onKill', chance: 1.0, conditionParam: { targetHadDebuff: 'haunted' }, applyBuff: { buffId: 'spiritResonance', effect: { castSpeedMult: 1.10 }, duration: 4, stacks: 1, maxStacks: 5 } }] } }),
        t3b: bh('Haunted Pack', '+3/6% Haunt damage per Haunted enemy in pack (max 5).',
          { rawBehaviors: { damagePerHauntedEnemyInPack: { perEnemy: 3, max: 5 } } },
          { 1: { rawBehaviors: { damagePerHauntedEnemyInPack: { perEnemy: 3, max: 5 } } },
            2: { rawBehaviors: { damagePerHauntedEnemyInPack: { perEnemy: 6, max: 5 } } } }),
        t3c: bh('Persistent Spectre', '+20/40% Haunt DoT duration.',
          { ailmentDuration: 20 }, { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 40 } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Phantasmal Echo', description: 'Haunt chain-on-death also spawns a 3s spirit minion.',
        nodeType: 'notable', maxRank: 1,
        modifier: { hauntKillSpawnsMinion: true },
      },
      t4Notable: {
        name: 'Spectral Storm', description: 'Haunt applies to ALL pack enemies on cast.',
        nodeType: 'notable', maxRank: 1,
        modifier: { hauntIsAoe: true },
      },
      t5a: {
        name: 'Chain Lord', description: "Haunt's chain-on-death compounds: each chain +25% damage. +2 chain count.",
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { hauntChainDamageCompound: 25, chainCount: 2 },
      },
      t5b: {
        name: 'Spirit Conduit', description: 'Each living minion adds +20% Haunt tick damage. Cost: minions take 50% of tick damage as self-damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritConduit: { damagePerMinionPercent: 20, minionSelfDamagePercent: 50 } } },
      },
      t6Notable: {
        name: 'Soul Tether', description: 'Heal 1% max HP per second per Haunted enemy (max 5%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulTether: { healPercentPerSecond: 1, maxStacks: 5 } } },
      },
      t7Keystone: {
        name: "DEATH'S HARVEST", description: 'When a Haunted enemy dies, auto-cast Soul Harvest at 100% damage. Cost: Haunt CD +3s.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 3, rawBehaviors: { hauntDeathTriggersSoulHarvest: true } },
      },
    },

    // ════ Branch 1 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Haunt is a contagion — ticks become a stacking, spreading DoT vector.',
      behaviorNodes: {
        t1a: bh('Fresh Snapshot', 'First 2 ticks of Haunt deal +20/40% damage.',
          { rawBehaviors: { hauntSnapshotBonus: 20 } },
          { 1: { rawBehaviors: { hauntSnapshotBonus: 20 } }, 2: { rawBehaviors: { hauntSnapshotBonus: 40 } } }),
        t1b: bh('Frost Bite', 'Haunt ticks 20/40% chance to apply Chilled (1s).',
          { procs: [{ id: 'ht_frost_bite', trigger: 'onAilmentTick', chance: 0.20, applyDebuff: { debuffId: 'chilled', duration: 1 } }] },
          { 1: { procs: [{ id: 'ht_frost_bite', trigger: 'onAilmentTick', chance: 0.20, applyDebuff: { debuffId: 'chilled', duration: 1 } }] },
            2: { procs: [{ id: 'ht_frost_bite', trigger: 'onAilmentTick', chance: 0.40, applyDebuff: { debuffId: 'chilled', duration: 1 } }] } }),
        t2b: bh('Compounding Cold', 'Each consecutive Haunt tick on the same target: +2/4% damage to subsequent ticks (max +50%).',
          { rawBehaviors: { compoundingTick: { perTickPercent: 2, maxPercent: 50, resetOnChain: true } } },
          { 1: { rawBehaviors: { compoundingTick: { perTickPercent: 2, maxPercent: 50, resetOnChain: true } } },
            2: { rawBehaviors: { compoundingTick: { perTickPercent: 4, maxPercent: 50, resetOnChain: true } } } }),
        t3a: {
          name: 'Disease Carrier', description: '+5/10% damage per debuff on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3b: bh('Festering Wounds', 'Haunt crits apply 1/2 stacks of Bleeding (3s).',
          { procs: [{ id: 'ht_festering', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] },
          { 1: { procs: [{ id: 'ht_festering', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 1 } }] },
            2: { procs: [{ id: 'ht_festering', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'bleeding', duration: 3, stacks: 2 } }] } }),
        t3c: bh('Spectral Mastery', '+10/20% cold and chaos penetration.',
          { coldPenetration: 10, chaosPenetration: 10 },
          { 1: { coldPenetration: 10, chaosPenetration: 10 }, 2: { coldPenetration: 20, chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Plague Spreader', description: 'Haunt ticks have 8% chance to apply Haunted to a random adjacent pack enemy at 50% snapshot.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ht_plague_spreader', trigger: 'onAilmentTick', chance: 0.08, internalCooldown: 1.0 }], rawBehaviors: { spreadHauntAdjacent: { snapshotPercent: 50, duration: 6, targetMode: 'adjacentRandom' } } },
      },
      t4Notable: {
        name: 'Pestilence Carrier', description: 'Haunt ticks 5% chance to cast Locust Swarm at 50% damage. ICD 5s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ht_pestilence', trigger: 'onAilmentTick', chance: 0.05, internalCooldown: 5.0, freeCast: { skillId: 'staff_locust_swarm', damageMult: 0.5 } }] },
      },
      t5a: {
        name: 'Soulrot', description: "Haunt's DoT doubled. Cost: no longer chains on death.",
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { dotMultiplier: 100, rawBehaviors: { disableChainOnDeath: true } },
      },
      t5b: {
        name: 'Carrier Pact', description: 'Plague of Toads hits on Haunted enemies refresh Haunt to full. Cost: −15% Haunt damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -15, rawBehaviors: { toadsRefreshHaunt: true } },
      },
      t6Notable: {
        name: 'Final Bloom', description: 'Haunt expires naturally → explodes for 200% of remaining tick damage as cold AoE.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { hauntFinalBloomPercent: 200 } },
      },
      t7Keystone: {
        name: 'ETERNAL HAUNTING', description: 'Haunt has unlimited duration on up to 3 enemies. New casts replace oldest. Cost: −30% Haunt tick damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { dotMultiplier: -30, rawBehaviors: { eternalHaunt: { maxTargets: 3 } } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Haunt as setup for Spirit Barrage / Soul Harvest burst. Crits feed soul_stacks.',
      behaviorNodes: {
        t1a: bh('Phantom Edge', '+10/20% Haunt critical strike chance.',
          { incCritChance: 10 }, { 1: { incCritChance: 10 }, 2: { incCritChance: 20 } }),
        t1b: bh('Cursed Tick', 'Haunt ticks on Hexed targets 15/30% chance to generate 1 soul_stack. ICD 1s.',
          { procs: [{ id: 'ht_cursed_tick', trigger: 'onAilmentTick', chance: 0.15, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
          { 1: { procs: [{ id: 'ht_cursed_tick', trigger: 'onAilmentTick', chance: 0.15, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
            2: { procs: [{ id: 'ht_cursed_tick', trigger: 'onAilmentTick', chance: 0.30, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] } }),
        t2b: {
          name: 'Hex Bond', description: '+20/40% Haunt damage on Hexed targets.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 40 } }] },
          },
        },
        t3a: bh('Stack Synergy', '+5/10% Haunt damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3b: bh('Hex Catalyst', 'Haunt crits 25/50% chance to instantly cast Hex. ICD 6s.',
          { procs: [{ id: 'ht_hex_catalyst', trigger: 'onCrit', chance: 0.25, internalCooldown: 6.0, freeCast: { skillId: 'staff_hex', damageMult: 1.0 } }] },
          { 1: { procs: [{ id: 'ht_hex_catalyst', trigger: 'onCrit', chance: 0.25, internalCooldown: 6.0, freeCast: { skillId: 'staff_hex', damageMult: 1.0 } }] },
            2: { procs: [{ id: 'ht_hex_catalyst', trigger: 'onCrit', chance: 0.50, internalCooldown: 6.0, freeCast: { skillId: 'staff_hex', damageMult: 1.0 } }] } }),
        t3c: bh('Spectral Velocity', '−10/20% Haunt cooldown.',
          { cooldownReduction: 10 }, { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Soulshatter', description: 'Haunt critical strikes generate 1 soul_stack. ICD 1s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ht_soulshatter', trigger: 'onCrit', chance: 1.0, internalCooldown: 1.0, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
      },
      t4Notable: {
        name: "Predator's Mark", description: 'Each consecutive Haunt cast on same target: +5% crit chance (max 5, 8s, resets on switch).',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ht_predators_mark', trigger: 'onCast', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'predatorsMark', effect: { critChanceBonus: 5 }, duration: 8, stacks: 1, maxStacks: 5 } }] },
      },
      t5a: {
        name: 'Final Whisper', description: 'Haunted enemies below 25% HP take +100% damage from all your skills.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { hauntedExecuteThreshold: 25 },
      },
      t5b: {
        name: 'Soul Trap', description: 'Haunted enemies dying generate 1 soul_stack each. Cost: Haunt CD +1s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 1, rawBehaviors: { hauntedDeathSpawnsSoulStack: true } },
      },
      t6Notable: {
        name: 'Ghostly Finale', description: 'After Haunt cast, next Spirit Barrage within 3s deals +50% damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'ht_ghostly_finale', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'ghostlyFinale', effect: { damageMult: 1.5 }, duration: 3 } }] },
      },
      t7Keystone: {
        name: 'DREADBINDER', description: 'Haunt no longer DoTs. Deals all 6s upfront as cold burst + applies Hexed (5s). Cost: Haunt CD +3s.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { cooldownIncrease: 3, rawBehaviors: { hauntInstantBurst: true, hauntApplyHexedOnCast: true } },
      },
    },
  ],
});

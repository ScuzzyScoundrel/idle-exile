// ============================================================
// Idle Exile — Staff v2 Soul Harvest Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: Single-target burst. Consumes Hexed for 2×. Creates soul_stack (max 5).
// Per docs/weapon-designs/staff-v2/soul_harvest.json
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
function bh(name: string, description: string, modifier: NC['modifier'], perRankModifiers?: NC['perRankModifiers']): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

export const STAFF_SOUL_HARVEST_TALENT_TREE = createTalentTree({
  skillId: 'staff_soul_harvest',
  prefix: 'sh',
  branches: [
    // ════ Branch 0 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Each harvest plants disease alongside the burst.',
      behaviorNodes: {
        t1a: bh('Hexed Reaper', 'Consuming Hexed: +25/50% damage on top of 2× bonus.',
          { rawBehaviors: { soulHarvestHexedConsumeBonus: 25 } },
          { 1: { rawBehaviors: { soulHarvestHexedConsumeBonus: 25 } }, 2: { rawBehaviors: { soulHarvestHexedConsumeBonus: 50 } } }),
        t1b: bh("Reaper's Sickness", 'Soul Harvest applies 1/2 Poisoned stacks (4s).',
          { procs: [{ id: 'sh_sickness', trigger: 'onHit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] },
          { 1: { procs: [{ id: 'sh_sickness', trigger: 'onHit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 1 } }] },
            2: { procs: [{ id: 'sh_sickness', trigger: 'onHit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 4, stacks: 2 } }] } }),
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
          name: 'Hex Synergy', description: '+15/30% Soul Harvest damage on Hexed targets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'hexed', modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Crit Hex', 'Soul Harvest crits 50/100% chance to apply Hexed (5s). ICD 4s.',
          { procs: [{ id: 'sh_crit_hex', trigger: 'onCrit', chance: 0.50, internalCooldown: 4.0, applyDebuff: { debuffId: 'hexed', duration: 5 } }] },
          { 1: { procs: [{ id: 'sh_crit_hex', trigger: 'onCrit', chance: 0.50, internalCooldown: 4.0, applyDebuff: { debuffId: 'hexed', duration: 5 } }] },
            2: { procs: [{ id: 'sh_crit_hex', trigger: 'onCrit', chance: 1.0, internalCooldown: 4.0, applyDebuff: { debuffId: 'hexed', duration: 5 } }] } }),
        t3c: bh('Chaos Mastery', '+10/20% chaos penetration.',
          { chaosPenetration: 10 }, { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Soulrot', description: 'Soul Harvest applies unique Soulrot: 5% target max HP as chaos DoT over 4s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestApplySoulrot: { maxHpPercent: 5, duration: 4 } } },
      },
      t4Notable: {
        name: "Reaper's Bloom", description: 'Soul Harvest kills spread all DoTs from target to all pack at 50% snapshot.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestKillSpreadDots: { snapshotPercent: 50 } } },
      },
      t5a: {
        name: 'Soulrot Lord', description: 'Soulrot damage ×3 + duration +50%. Cost: −20% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -20, rawBehaviors: { soulrotMultiplier: 3.0, soulrotDurationBonus: 50 } },
      },
      t5b: {
        name: 'Plague Reaper', description: 'Soul Harvest applies ALL your DoTs at 50% snapshot. Cost: CD +2s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 2, rawBehaviors: { soulHarvestApplyAllDots: { snapshotPercent: 50 } } },
      },
      t6Notable: {
        name: 'Death Bloom', description: '+50% Soul Harvest damage per debuff on target (max +250%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestPerDebuffBonus: { perDebuffPercent: 50, maxPercent: 250 } } },
      },
      t7Keystone: {
        name: 'THE PLAGUE REAPER', description: 'Soul Harvest no direct damage. Applies Soul Decay (25% max HP / 5s). Cost: removes 2× hex consume bonus.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -100, rawBehaviors: { soulHarvestPureRotting: { maxHpPercent: 25, duration: 5 }, soulHarvestDisableHexConsume: true } },
      },
    },

    // ════ Branch 1 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Souls feed the dead. Heal and empower your minion pack.',
      behaviorNodes: {
        t1a: bh('Soul Reservoir', 'Max soul_stack cap +1/2 (5 → 6/7).',
          { soulStackCapOverride: 6 }, { 1: { soulStackCapOverride: 6 }, 2: { soulStackCapOverride: 7 } }),
        t1b: bh('Pack Feast', 'On Soul Harvest cast: heal minions for 10/20% max HP.',
          { rawBehaviors: { soulHarvestHealsMinionsPercent: 10 } },
          { 1: { rawBehaviors: { soulHarvestHealsMinionsPercent: 10 } }, 2: { rawBehaviors: { soulHarvestHealsMinionsPercent: 20 } } }),
        t2b: {
          name: 'Bound Power', description: '+15/30% Soul Harvest damage while any minion alive.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incDamage: 30 } }] },
          },
        },
        t3a: {
          name: 'Bound Crit', description: '+15/30% crit chance while 2+ minions alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incCritChance: 15 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incCritChance: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { incCritChance: 30 } }] },
          },
        },
        t3b: bh('Soul Spark', 'Soul Harvest crits 50/100% chance to summon 4s spirit. ICD 4s.',
          { procs: [{ id: 'sh_soul_spark', trigger: 'onCrit', chance: 0.50, internalCooldown: 4.0, summonMinion: { type: 'spirit_temp', duration: 4 } }] },
          { 1: { procs: [{ id: 'sh_soul_spark', trigger: 'onCrit', chance: 0.50, internalCooldown: 4.0, summonMinion: { type: 'spirit_temp', duration: 4 } }] },
            2: { procs: [{ id: 'sh_soul_spark', trigger: 'onCrit', chance: 1.0, internalCooldown: 4.0, summonMinion: { type: 'spirit_temp', duration: 4 } }] } }),
        t3c: bh('Soul Drain', 'Soul Harvest heals 5/10% of damage dealt (life leech).',
          { leechPercent: 5 }, { 1: { leechPercent: 5 }, 2: { leechPercent: 10 } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Spirit Pact', description: 'On Soul Harvest cast: minions gain +50% dmg + 30% ASPD for 5s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestBuffsMinions: { damagePercent: 50, attackSpeedPercent: 30, duration: 5 } } },
      },
      t4Notable: {
        name: 'Vital Harvest', description: 'Each soul_stack consumed heals ALL minions 5% max HP.',
        nodeType: 'notable', maxRank: 1,
        modifier: { soulStackConsumeHealsMinions: 5 },
      },
      t5a: {
        name: 'Soul Conduit', description: 'Each soul_stack: +5% all minion damage AND HP. Cost: −25% SH direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -25, rawBehaviors: { soulStackBuffsMinionsPercent: 5 } },
      },
      t5b: {
        name: 'Soul Forge', description: 'Consuming Hexed also resummons all minions at full HP. Cost: CD +3s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 3, rawBehaviors: { soulHarvestHexedConsumeResummonsMinions: true } },
      },
      t6Notable: {
        name: 'Soul Bind', description: 'While 4+ soul_stacks active: minions are immune to damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulStackMinionInvuln: { minStacks: 4 } } },
      },
      t7Keystone: {
        name: 'BLOOD PRIEST', description: 'SH can target your minions: heal for 200% damage + pack Frenzy (+50% dmg 4s). Cost: SH cannot crit.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestCanTargetMinions: { healMultiplier: 2.0, frenzyDamagePercent: 50, frenzyDuration: 4 }, soulHarvestCannotCrit: true } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'Pure burst. Hex consume goes nuclear.',
      behaviorNodes: {
        t1a: bh('Soul Focus', '+10/20% Soul Harvest crit chance.',
          { incCritChance: 10 }, { 1: { incCritChance: 10 }, 2: { incCritChance: 20 } }),
        t1b: bh('Soul Trigger', 'SH crits generate +1/2 additional soul_stacks (on top of 1 base).',
          { soulHarvestCritBonusStacks: 1 }, { 1: { soulHarvestCritBonusStacks: 1 }, 2: { soulHarvestCritBonusStacks: 2 } }),
        t2b: bh('Soul Bond', '+5/10% Soul Harvest damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3a: bh("Hunter's Eye", 'Consecutive SH same target: +10/20% crit multiplier per stack (max 5).',
          { procs: [{ id: 'sh_hunters_eye', trigger: 'onCast', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'huntersEye', effect: { critMultiplierBonus: 10 }, duration: 8, stacks: 1, maxStacks: 5 } }] },
          { 1: { procs: [{ id: 'sh_hunters_eye', trigger: 'onCast', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'huntersEye', effect: { critMultiplierBonus: 10 }, duration: 8, stacks: 1, maxStacks: 5 } }] },
            2: { procs: [{ id: 'sh_hunters_eye', trigger: 'onCast', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'huntersEye', effect: { critMultiplierBonus: 20 }, duration: 8, stacks: 1, maxStacks: 5 } }] } }),
        t3b: bh('Hex Catalyst', 'On SH cast: 35/70% chance to instantly cast Hex. ICD 5s.',
          { procs: [{ id: 'sh_hex_catalyst', trigger: 'onCast', chance: 0.35, internalCooldown: 5.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] },
          { 1: { procs: [{ id: 'sh_hex_catalyst', trigger: 'onCast', chance: 0.35, internalCooldown: 5.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] },
            2: { procs: [{ id: 'sh_hex_catalyst', trigger: 'onCast', chance: 0.70, internalCooldown: 5.0, freeCast: { skillId: 'staff_hex', damageMult: 0 } }] } }),
        t3c: bh('Quickdraw', '−15/30% Soul Harvest cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: "Reaper's Edge", description: 'Soul Harvest hexed-consume becomes 3× (up from 2×).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestHexedConsumeMult: 3.0 } },
      },
      t4Notable: {
        name: 'Soul Surge', description: 'On SH cast: +50% damage to next Mass Sacrifice within 8s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'sh_soul_surge', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'soulSurge', effect: { damageMult: 1.50 }, duration: 8 } }] },
      },
      t5a: {
        name: 'Final Whisper', description: 'Soul Harvest +100% damage to enemies below 25% HP.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestExecuteThreshold: { hpPercent: 25, damageBonus: 100 } } },
      },
      t5b: {
        name: 'Greater Reservoir', description: 'Max soul_stacks → 10. Each stack: +20% SH damage. Cost: −20% SH direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { incDamage: -20, soulStackCapOverride: 10, soulStackDamagePerStack: 20 },
      },
      t6Notable: {
        name: 'Soul Refund', description: 'On Soul Harvest kill: refund 50% of its cooldown.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestKillRefundCdPercent: 50 } },
      },
      t7Keystone: {
        name: 'THE SOUL EATER', description: 'SH consumes ALL soul_stacks: +50% damage per consumed. Cost: SH no longer creates soul_stack.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { rawBehaviors: { soulHarvestConsumesAllStacks: { perStackPercent: 50 }, soulHarvestNoCreateStack: true } },
      },
    },
  ],
});

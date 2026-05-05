// ============================================================
// Idle Exile — Staff v2 Spirit Barrage Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Role: 3-hit cold projectile. Consumes haunted for guaranteed crit + 30% bonus damage.
// Per docs/weapon-designs/staff-v2/spirit_barrage.json
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
    // ════ Branch 0 — Spirit Caller ════
    {
      name: 'Spirit Caller',
      description: 'Each projectile is a spirit. More minions = more shots.',
      behaviorNodes: {
        t1a: bh('Extra Salvo', '+1/2 extra Spirit Barrage projectiles.',
          { extraHits: 1 }, { 1: { extraHits: 1 }, 2: { extraHits: 2 } }),
        t1b: bh('Ghost Manifestation', 'Spirit Barrage crits 25/50% chance to summon a 3s spirit.',
          { procs: [{ id: 'sb_ghost_manifest', trigger: 'onCrit', chance: 0.25, internalCooldown: 2.0, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
          { 1: { procs: [{ id: 'sb_ghost_manifest', trigger: 'onCrit', chance: 0.25, internalCooldown: 2.0, summonMinion: { type: 'spirit_temp', duration: 3 } }] },
            2: { procs: [{ id: 'sb_ghost_manifest', trigger: 'onCrit', chance: 0.50, internalCooldown: 2.0, summonMinion: { type: 'spirit_temp', duration: 3 } }] } }),
        t2b: {
          name: 'Bound Power', description: '+10/20% Spirit Barrage damage while any minion alive.',
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
        t3b: bh('Echoing Volley', 'On Spirit Barrage cast: gain Echo (+20/40% damage to next non-SB cast in 4s).',
          { procs: [{ id: 'sb_echo', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'spiritEcho', effect: { damageMult: 1.20 }, duration: 4 } }] },
          { 1: { procs: [{ id: 'sb_echo', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'spiritEcho', effect: { damageMult: 1.20 }, duration: 4 } }] },
            2: { procs: [{ id: 'sb_echo', trigger: 'onCast', chance: 1.0, applyBuff: { buffId: 'spiritEcho', effect: { damageMult: 1.40 }, duration: 4 } }] } }),
        t3c: bh('Spirit Velocity', '+10/20% Spirit Barrage cast speed.',
          { incCastSpeed: 10 }, { 1: { incCastSpeed: 10 }, 2: { incCastSpeed: 20 } }),
        t4b: bh('Minion Mastery Support', '+15/30% minion damage.',
          { minionDamageMult: 15 }, { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Phantasmal Echo', description: 'While 2+ minions alive: Spirit Barrage hits create small AoE (10% to 2 neighbors).',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { phantasmalEcho: { minMinions: 2, aoePercent: 10, extraTargets: 2 } } },
      },
      t4Notable: {
        name: 'Volley Conduit', description: 'Each living minion adds +1 Spirit Barrage projectile.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarragePerMinionExtraProjectile: 1 } },
      },
      t5a: {
        name: 'Spirit Cannon', description: 'Projectiles split on hit to 1 adjacent enemy at 50% damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageSplit: { extraTargets: 1, damagePercent: 50 } } },
      },
      t5b: {
        name: 'Phantasmal Strike', description: 'Consuming Haunted also summons 1 fetish (5s).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageConsumeSummonsFetish: { duration: 5 } } },
      },
      t6Notable: {
        name: 'Mass Volley', description: 'While 5+ minions alive: Spirit Barrage gains +3 projectiles.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageMassVolley: { minMinions: 5, extraProjectiles: 3 } } },
      },
      t7Keystone: {
        name: 'GHOST CHORUS', description: 'Each projectile spawns a 1.5s ghost at impact. Cost: −40% SB damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -40, rawBehaviors: { spiritBarragePerHitSpawnsGhost: { duration: 1.5 } } },
      },
    },

    // ════ Branch 1 — Plague Doctor ════
    {
      name: 'Plague Doctor',
      description: 'Each projectile carries plague — debuff distribution volley.',
      behaviorNodes: {
        t1a: bh('Frostbite', 'Spirit Barrage hits 20/40% chance to apply Chilled (1s).',
          { procs: [{ id: 'sb_frostbite', trigger: 'onHit', chance: 0.20, applyDebuff: { debuffId: 'chilled', duration: 1 } }] },
          { 1: { procs: [{ id: 'sb_frostbite', trigger: 'onHit', chance: 0.20, applyDebuff: { debuffId: 'chilled', duration: 1 } }] },
            2: { procs: [{ id: 'sb_frostbite', trigger: 'onHit', chance: 0.40, applyDebuff: { debuffId: 'chilled', duration: 1 } }] } }),
        t1b: bh('Spirit Density', '+15/30% Spirit Barrage damage.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
        t2b: {
          name: 'Cold Compounding', description: '+5/10% damage per debuff on target.',
          nodeType: 'behavior', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 5 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 10 } }] },
          },
        },
        t3a: {
          name: 'Plague Synergy', description: '+20/40% Spirit Barrage damage on Plagued targets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 20 } }] },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 20 } }] },
            2: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'plagued', modifier: { incDamage: 40 } }] },
          },
        },
        t3b: bh('Crit Cold', 'Spirit Barrage crits 50/100% chance to apply Chilled (3s).',
          { procs: [{ id: 'sb_crit_cold', trigger: 'onCrit', chance: 0.50, applyDebuff: { debuffId: 'chilled', duration: 3 } }] },
          { 1: { procs: [{ id: 'sb_crit_cold', trigger: 'onCrit', chance: 0.50, applyDebuff: { debuffId: 'chilled', duration: 3 } }] },
            2: { procs: [{ id: 'sb_crit_cold', trigger: 'onCrit', chance: 1.0, applyDebuff: { debuffId: 'chilled', duration: 3 } }] } }),
        t3c: bh('Cold Mastery', '+10/20% cold penetration.',
          { coldPenetration: 10 }, { 1: { coldPenetration: 10 }, 2: { coldPenetration: 20 } }),
        t4b: bh('DoT Support', '+15/30% damage to DoT-tagged skills.',
          { incDamage: 15 }, { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Plague Burst', description: 'Each Spirit Barrage projectile applies 1 Poisoned (3s).',
        nodeType: 'notable', maxRank: 1,
        modifier: { procs: [{ id: 'sb_plague_burst', trigger: 'onHit', chance: 1.0, applyDebuff: { debuffId: 'poisoned', duration: 3, stacks: 1 } }] },
      },
      t4Notable: {
        name: 'Spirit Pandemic', description: 'Hits on Plagued targets transfer Plagued to all hit enemies.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageTransfersPlagued: true } },
      },
      t5a: {
        name: 'Frostbreaker', description: '+75% damage to Chilled targets. Cost: −25% vs non-chilled.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'chilled', modifier: { incDamage: 75 } }], rawBehaviors: { spiritBarrageNonChilledPenalty: 25 } },
      },
      t5b: {
        name: 'Eternal Cold', description: 'Each SB hit extends Chilled on target by 1s (max 5s).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageExtendsChilled: { perHitSeconds: 1, maxSeconds: 5 } } },
      },
      t6Notable: {
        name: 'Stacking Salvo', description: 'Each projectile after the first applies +1 existing debuff stack.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageProjectileExtraStack: true } },
      },
      t7Keystone: {
        name: 'THE WHISPER', description: 'SB applies Haunted on every hit; consume keeps the debuff. Cost: −30% SB damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -30, rawBehaviors: { spiritBarrageAppliesHaunted: true, spiritBarrageConsumeKeepsHauntedDebuff: true } },
      },
    },

    // ════ Branch 2 — Voodoo Master ════
    {
      name: 'Voodoo Master',
      description: 'The burst king. Soul stacks empower volleys, crits cascade.',
      behaviorNodes: {
        t1a: bh('Per-Projectile Power', 'Each projectile after first: +10/20% damage.',
          { rawBehaviors: { perProjectileDamageBonus: 10 } },
          { 1: { rawBehaviors: { perProjectileDamageBonus: 10 } }, 2: { rawBehaviors: { perProjectileDamageBonus: 20 } } }),
        t1b: bh('Soul Trigger', 'SB crits 50/100% chance to gen 1 soul_stack. ICD 1.5s.',
          { procs: [{ id: 'sb_soul_trigger', trigger: 'onCrit', chance: 0.50, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
          { 1: { procs: [{ id: 'sb_soul_trigger', trigger: 'onCrit', chance: 0.50, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] },
            2: { procs: [{ id: 'sb_soul_trigger', trigger: 'onCrit', chance: 1.0, internalCooldown: 1.5, createComboState: { stateId: 'soul_stack', stacks: 1 } }] } }),
        t2b: bh('Soul Bond', '+5/10% SB damage per active soul_stack.',
          { damagePerSoulStackActive: 5 }, { 1: { damagePerSoulStackActive: 5 }, 2: { damagePerSoulStackActive: 10 } }),
        t3a: bh("Hunter's Eye", 'Consecutive SB hit same target: +5/10% crit multiplier per stack (max 5, resets on switch).',
          { procs: [{ id: 'sb_hunters_eye', trigger: 'onHit', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'huntersEye', effect: { critMultiplierBonus: 5 }, duration: 6, stacks: 1, maxStacks: 5 } }] },
          { 1: { procs: [{ id: 'sb_hunters_eye', trigger: 'onHit', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'huntersEye', effect: { critMultiplierBonus: 5 }, duration: 6, stacks: 1, maxStacks: 5 } }] },
            2: { procs: [{ id: 'sb_hunters_eye', trigger: 'onHit', chance: 1.0, conditionParam: { sameTarget: true, resetOnTargetSwitch: true }, applyBuff: { buffId: 'huntersEye', effect: { critMultiplierBonus: 10 }, duration: 6, stacks: 1, maxStacks: 5 } }] } }),
        t3b: bh('Hex Strike', 'SB hits on Hexed: 15/30% chance to refresh Hexed. ICD 1s.',
          { procs: [{ id: 'sb_hex_strike', trigger: 'onHit', chance: 0.15, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.0 }], rawBehaviors: { spiritBarrageRefreshesHexed: true } },
          { 1: { procs: [{ id: 'sb_hex_strike', trigger: 'onHit', chance: 0.15, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.0 }] },
            2: { procs: [{ id: 'sb_hex_strike', trigger: 'onHit', chance: 0.30, conditionParam: { targetHasDebuff: 'hexed' }, internalCooldown: 1.0 }] } }),
        t3c: bh('Spectral Velocity', '−15/30% Spirit Barrage cooldown.',
          { cooldownReduction: 15 }, { 1: { cooldownReduction: 15 }, 2: { cooldownReduction: 30 } }),
        t4b: bh('Burst Mastery', '+20/40% damage to Heavy-tagged skills.',
          { incDamage: 20 }, { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Soul Salvo', description: 'SB consumes ALL soul_stacks on cast: +1 projectile per consumed.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageConsumesSoulStacks: { perStackExtraProjectile: 1 } } },
      },
      t4Notable: {
        name: 'Crit Cascade', description: 'If any SB projectile crits, all subsequent projectiles also crit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageCritCascade: true } },
      },
      t5a: {
        name: 'Pinpoint', description: 'SB fires 1 massive projectile (instead of 3) — always crits.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarragePinpointMode: true } },
      },
      t5b: {
        name: 'Soul Cascade', description: 'Each soul_stack consumed by SB adds +20% damage. Cost: SB CD +1s.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { cooldownIncrease: 1, rawBehaviors: { spiritBarrageSoulConsumeDamageBonus: 20 } },
      },
      t6Notable: {
        name: 'Final Volley', description: 'Last projectile in SB cast deals +100% damage.',
        nodeType: 'notable', maxRank: 1,
        modifier: { rawBehaviors: { spiritBarrageFinalProjectileBonus: 100 } },
      },
      t7Keystone: {
        name: 'THE GHOST CANNON', description: 'SB fires 1 massive projectile. On crit: chains to 3 enemies. Cost: −25% damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: { incDamage: -25, rawBehaviors: { spiritBarrageSingleShot: { chainOnCrit: 3 } } },
      },
    },
  ],
});

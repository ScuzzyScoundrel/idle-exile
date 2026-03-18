// ============================================================
// Idle Exile — Dagger Talent Trees (10 active skills)
// Per-skill talent trees using the builder pattern.
// All nodes defined inline per skill — no shared constants.
// Data source: docs/weapon-designs/dagger-v2/ (Full JSON transpilation)
// ============================================================

import type { TalentNode } from '../../types';
import { createTalentTree } from './talentTreeBuilder';

// Omit helper for node configs
type NC = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;




// ════════════════════════════════════════════════════════════
// BEHAVIOR NODE HELPER — shorthand for maxRank:2 behavior nodes
// ════════════════════════════════════════════════════════════

function bh(
  name: string, description: string,
  modifier: NC['modifier'],
  perRankModifiers?: NC['perRankModifiers'],
): NC {
  return { name, description, nodeType: 'behavior', maxRank: 2, modifier, perRankModifiers };
}

// ════════════════════════════════════════════════════════════
// STAB TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const STAB_TALENT_TREE = createTalentTree({
  skillId: 'dagger_stab', prefix: 'st',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Blade Sense',
        description: '10% chance on Stab hit to enter Predator state (+50% crit multiplier for 3s). Chance increases by 4% per consecutive Stab hit on the same target (max 30%). Resets to 10% on target switch.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_blade_sense',
              trigger: 'onHit',
              chance: 0.1,
              conditionParam: { perConsecutiveHit: 0.04, maxChance: 0.3, sameTarget: true },
              applyBuff: { buffId: 'predator', effect: { critMultiplierBonus: 50 }, duration: 3 },
            },
          ],
          incCritChance: 10,
        },
      },
      t4Notable: {
        name: 'Exploit Weakness',
        description: 'Stab crits apply Vulnerable curse (2s). While target is Vulnerable: Exposed bonus increased from +25% to +40%. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_exploit_weakness',
              trigger: 'onCrit',
              chance: 1,
              applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 },
            },
          ],
          conditionalMods: [
            {
              condition: 'whileDebuffActive',
              debuffId: 'vulnerable',
              modifier: { comboStateBonus: { exposed: { bonusDamage: 40 } } },
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Puncture',
          'Each consecutive Stab hit on the same target builds a Puncture stack (max 3). At max stacks: next Stab is a guaranteed crit. Stacks reset after the guaranteed crit fires.',
          {
          conditionalMods: [{ condition: 'afterConsecutiveHits', threshold: 3, modifier: { incCritChance: 100 } }],
        },
          { 1: { threshold: 3 }, 2: { threshold: 2, incCritMultiplier: 15 } }),
        t1b: bh('Tunnel Vision',
          '+5% crit chance per consecutive Stab hit on the same target (max 4 stacks, +20%). Stacks persist through other skill casts. Resets on target death.',
          {
          conditionalMods: [
            {
              condition: 'afterConsecutiveHits',
              conditionParam: { sameTarget: true, persistsThroughOtherSkills: true },
              modifier: { incCritChance: 5 },
              maxStacks: 4,
            },
          ],
        },
          { 1: { incCritChance: 5 }, 2: { incCritChance: 7, weaponMastery: 3 } }),
        t2b: bh('Honed Instincts',
          'After Stab crits: gain +4% crit multiplier for 2s. Refreshes on subsequent crits.',
          {
          procs: [
            {
              id: 'st_honed',
              trigger: 'onCrit',
              chance: 1,
              applyBuff: { buffId: 'honedInstincts', effect: { critMultiplierBonus: 4 }, duration: 2 },
            },
          ],
        },
          { 1: { critMultiplierBonus: 4, duration: 2 }, 2: { critMultiplierBonus: 6, duration: 3 } }),
        t3a: bh('Exploit Opening',
          '+15% crit chance against targets below 50% HP.',
          {
          conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incCritChance: 15 } }],
        },
          { 1: { threshold: 50 }, 2: { threshold: 60, weaponMastery: 3 } }),
        t3b: bh('Kill Momentum',
          'When Stab kills a target, its cooldown is reduced by 0.5s for the next cast.',
          { conditionalMods: [{ condition: 'onKill', modifier: { cooldownReduction: 0.5 } }] },
          { 1: { cooldownReduction: 0.5 }, 2: { cooldownReduction: 1, weaponMastery: 3 } }),
        t3c: bh('Lethal Rhythm',
          '+10% damage for each consecutive Stab hit on the same target (max 5 stacks, +50%). Resets on target death.',
          {
          conditionalMods: [
            {
              condition: 'afterConsecutiveHits',
              conditionParam: { sameTarget: true },
              modifier: { incDamage: 10 },
              maxStacks: 5,
            },
          ],
        },
          {
          '1': { incDamage: 10, maxStacks: 5, requireConsecutive: true },
          '2': { incDamage: 10, maxStacks: 3, requireConsecutive: false, weaponMastery: 3 },
        }),
        t4b: bh('Predator\'s Focus',
          'While Predator state is active: +15% damage with Stab.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predator', modifier: { incDamage: 15 } }],
        },
          { 1: { incDamage: 15 }, 2: { incDamage: 25, durationBonus: 1 } }),
      },
      t5a: {
        name: 'Precision Killer',
        description: 'Stab crits on Vulnerable targets have 30% chance to reset Stab\'s cooldown instantly (free cast). Your crit chance cannot exceed 60% (reliability ceiling). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_precision_killer',
              trigger: 'onCrit',
              chance: 0.3,
              conditionParam: { whileDebuffActive: 'vulnerable' },
              resetCooldown: 'self',
              resetGcd: true,
            },
          ],
          critChanceCap: 0.6,
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Opportunist',
        description: 'When Stab kills a target: gain First Blood (+60% damage on next Stab against a NEW target, 10s). Stab deals -15% damage against targets hit 3+ times.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_opportunist',
              trigger: 'onKill',
              chance: 1,
              applyBuff: { effect: { damageMult: 1.6 }, duration: 10 },
            },
          ],
          conditionalMods: [{ condition: 'afterConsecutiveHits', threshold: 3, modifier: { incDamage: -15 } }],
        },
      },
      t6Notable: {
        name: 'Death Mark',
        description: 'Stab crits have 15% chance to apply Death Mark (10s). The next hit against a Death Marked target deals +100% damage and consumes the mark. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_death_mark',
              trigger: 'onCrit',
              chance: 0.15,
              applyDebuff: { debuffId: 'deathMark', stacks: 1, duration: 10 },
            },
          ],
          debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'deathMark', incDamage: 100, consumeOnHit: true } },
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'DEATHBLOW',
        description: 'Stab becomes an execute-only finisher when target is below 25% HP: deals 500% weapon damage. Above 25% HP, Stab deals -20% base damage. Crits no longer deal bonus crit damage — crits ONLY deliver Death Marks.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          executeOnly: { hpThreshold: 25, bonusDamage: 500 },
          castPriority: 'execute',
          critsDoNoBonusDamage: true,
          incDamage: -20,
        },
        synergy: ['st_0_4_0', 'st_0_5_0', 'st_0_6_0'],
        antiSynergy: ['st_0_2_0'],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Toxic Burst',
        description: 'When Stab hits a target with 3+ ailment stacks: 25% chance to trigger Toxic Burst — instantly deal 50% of all active ailment damage as a single burst hit. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_toxic_burst',
              trigger: 'onHit',
              chance: 0.25,
              conditionParam: { minAilmentStacks: 3 },
              instantDamage: { flatDamage: 0, element: 'matched', scaleStat: 'ailmentDamage', scaleRatio: 0.5 },
            },
          ],
          ailmentDuration: 8,
        },
      },
      t4Notable: {
        name: 'Venom Frenzy',
        description: 'When Stab hits a target with 5+ ailment stacks: enter Venom Frenzy (5s). During Venom Frenzy: +30% attack speed and each Stab hit applies 1 additional ailment stack. 15s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_venom_frenzy',
              trigger: 'onHit',
              chance: 1,
              conditionParam: { minAilmentStacks: 5 },
              applyBuff: { buffId: 'venomFrenzy', effect: { attackSpeedMult: 1.3 }, duration: 5 },
              internalCooldown: 15,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Lingering Cuts',
          'Each consecutive Stab hit on the same target extends active ailment duration by 0.3s (max +1.5s over 5 hits). Resets on target switch.',
          {
          conditionalMods: [
            {
              condition: 'afterConsecutiveHits',
              conditionParam: { sameTarget: true },
              modifier: { ailmentDurationExtension: 0.3 },
              maxStacks: 5,
            },
          ],
        },
          {
          '1': { ailmentDurationExtension: 0.3 },
          '2': { ailmentDurationExtension: 0.5, ailmentPotencyPerHit: 3 },
        }),
        t1b: bh('Toxic Momentum',
          '+8% damage with Stab for each unique ailment type on the target (max 3 types, +24%). Different ailment types: bleed, poison, ignite, chill, shock.',
          {
          conditionalMods: [
            {
              condition: 'whileDebuffActive',
              conditionParam: { countUniqueAilments: true },
              modifier: { incDamage: 8 },
              maxStacks: 3,
            },
          ],
        },
          { 1: { incDamage: 8 }, 2: { incDamage: 12, attackSpeedBonusAt2: 5 } }),
        t2b: bh('Festering Patience',
          'While the target has an active ailment from Stab, Stab\'s ailment applications gain +10% potency.',
          {
          conditionalMods: [
            {
              condition: 'whileDebuffActive',
              conditionParam: { fromSelf: true },
              modifier: { ailmentPotency: 10 },
            },
          ],
        },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 15, ailmentDurationFlat: 0.5 } }),
        t3a: bh('Virulent Pressure',
          '+20% ailment potency against targets with 5+ total ailment stacks.',
          {
          conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 5, modifier: { ailmentPotency: 20 } }],
        },
          { 1: { threshold: 5 }, 2: { threshold: 4, dotMultiplier: 5 } }),
        t3b: bh('Infectious Rhythm',
          'Stab crits create Festering Mark instead of Exposed (3s): next skill\'s ailment potency is doubled.',
          {
          comboStateReplace: { from: 'exposed', to: 'festering_mark', effect: { ailmentPotencyMult: 2 }, duration: 3 },
        },
          { 1: { duration: 3 }, 2: { duration: 5, ailmentDurationBonus: 25 } }),
        t3c: bh('Relentless Infection',
          'Ailments applied by Stab deal +8% more damage for each second they\'ve been active (max +40% at 5s).',
          { conditionalMods: [{ condition: 'ailmentAgeScaling', perSecond: 8, maxBonus: 40, modifier: { dotMultiplier: 24 } }] },
          { 1: { perSecond: 8, maxBonus: 40 }, 2: { perSecond: 10, maxBonus: 50, refreshAtMax: true } }),
        t4b: bh('Frenzy Extension',
          'While Venom Frenzy is active: +15% ailment potency with Stab.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomFrenzy', modifier: { ailmentPotency: 15 } }],
        },
          {
          '1': { ailmentPotency: 15 },
          '2': { ailmentPotency: 25, durationExtensionPerHit: 0.3, maxExtension: 1.5 },
        }),
      },
      t5a: {
        name: 'Toxic Mastery',
        description: 'All ailments applied by Stab gain +10% potency per existing stack on the target (multiplicative). Ailment duration +25%. +10% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { ailmentPotencyPerStack: 10, ailmentDuration: 25, weaponMastery: 10 },
      },
      t5b: {
        name: 'Volatile Toxins',
        description: 'When Stab hits a target with 8+ ailment stacks: 20% chance per hit to detonate ALL stacks — deal 100% of total stacked snapshot damage instantly. Resets stack count to 0.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_volatile_toxins',
              trigger: 'onHit',
              chance: 0.2,
              conditionParam: { minAilmentStacks: 8 },
              instantDamage: { flatDamage: 0, element: 'matched', scaleStat: 'totalAilmentSnapshot', scaleRatio: 1 },
              consumeAllAilments: true,
            },
          ],
        },
      },
      t6Notable: {
        name: 'Pandemic Cascade',
        description: 'When Stab kills a target that has 3+ ailment stacks: all ailments spread to nearby enemies at 75% remaining duration. Spread ailments inherit Stab\'s potency bonuses. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_pandemic',
              trigger: 'onKill',
              chance: 1,
              conditionParam: { minAilmentStacks: 3 },
              spreadAilments: { durationRetain: 0.75, inheritPotency: true },
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'PLAGUE LORD',
        description: 'Stab can only apply ONE ailment type (your element\'s signature ailment). That ailment\'s EFFECT is tripled: DoT ailments (Bleed/Ignite/Poison) deal 3x damage, Chill applies 3x slow (60%), Shock applies 3x amp (24% per stack). Unlimited potency scaling. All other ailment types from Stab are disabled. -15% base Stab damage.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { singleAilmentOnly: true, ailmentEffectMult: 3, incDamage: -15 },
        synergy: ['st_1_1_0', 'st_1_3_2', 'st_1_5_0'],
        antiSynergy: ['st_1_1_1'],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Shadow Guard',
        description: 'When you dodge an attack: 60% chance to counter-attack for 75% of Stab\'s fully-scaled damage and gain 1 Fortify stack (3% damage reduction, 5s). 35% chance to reset Stab cooldown. +5% all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_shadow_guard',
              trigger: 'onDodge',
              chance: 0.6,
              instantDamage: { flatDamage: 0, element: 'matched', scaleStat: 'weaponDamage', scaleRatio: 0.75 },
              fortifyOnProc: { stacks: 1, duration: 5, damageReduction: 3 },
            },
            { id: 'st_shadow_guard_reset', trigger: 'onDodge', chance: 0.35, resetCooldown: 'self' },
          ],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Shadow Form',
        description: 'When you dodge 2 attacks within 4s: enter Shadow Form (4s). During Shadow Form: 30% damage reduction and all Stab hits apply Weakened curse (1s). 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_shadow_form',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { dodgesInWindow: 2, window: 4 },
              applyBuff: { buffId: 'shadowForm', effect: { damageReduction: 30 }, duration: 4 },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Evasive Rhythm',
          'Each Stab hit grants +2% dodge chance for 2s (max 3 stacks, +6%). Refreshes on each Stab hit.',
          {
          procs: [
            {
              id: 'st_evasive_rhythm',
              trigger: 'onHit',
              chance: 1,
              applyBuff: { buffId: 'evasiveRhythm', effect: { evasionBonus: 2 }, duration: 2, maxStacks: 3 },
            },
          ],
        },
          { 1: { evasionBonus: 2, duration: 2 }, 2: { evasionBonus: 3, duration: 3 } }),
        t1b: bh('Combat Leech',
          'Stab heals for 2% of damage dealt (life leech). +1 flat life on hit.',
          { leechPercent: 2, lifeOnHit: 1 },
          {
          '1': { leechPercent: 2, lifeOnHit: 1 },
          '2': {
            leechPercent: 4,
            lifeOnHit: 3,
            conditionalMods: [{ condition: 'whileLowHp', threshold: 50, modifier: { leechPercent: 4 } }],
          },
        }),
        t2b: bh('Reactive Footwork',
          'After dodging: next Stab within 2s gains +15% damage.',
          { conditionalMods: [{ condition: 'afterDodge', window: 2, modifier: { incDamage: 15 } }] },
          { 1: { incDamage: 15, appliesToCounters: false }, 2: { incDamage: 25, appliesToCounters: true } }),
        t3a: bh('Enduring Defense',
          '+3% life leech while you have 2+ Fortify stacks.',
          {
          conditionalMods: [{ condition: 'whileFortifyStacks', threshold: 2, modifier: { leechPercent: 3 } }],
        },
          { 1: { leechPercent: 3 }, 2: { leechPercent: 5, allResistPerStack: 5 } }),
        t3b: bh('Riposte Ready',
          'Stab crits create Riposte Ready (3s) instead of Exposed: next dodge triggers a free Stab counter-attack at 100% weapon damage.',
          {
          comboStateReplace: {
            from: 'exposed',
            to: 'riposte_ready',
            effect: { counterOnDodge: true, counterDamage: 100 },
            duration: 3,
          },
        },
          { 1: { counterDamage: 100, duration: 3 }, 2: { counterDamage: 125, duration: 4 } }),
        t3c: bh('Counter Momentum',
          '+10% damage for 3s after dodging or blocking an attack.',
          { conditionalMods: [{ condition: 'afterDodgeOrBlock', modifier: { incDamage: 10 }, duration: 3 }] },
          {
          '1': { incDamage: 10, duration: 3, maxStacks: 1 },
          '2': { incDamage: 15, duration: 4, maxStacks: 2 },
        }),
        t4b: bh('Shadow Persistence',
          'While Shadow Form is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowForm', modifier: { evasionBonus: 10 } }],
        },
          {
          '1': { evasionBonus: 10 },
          '2': { evasionBonus: 15, durationExtensionPerDodge: 0.5, maxExtension: 2 },
        }),
      },
      t5a: {
        name: 'Evasive Recovery',
        description: 'Each dodge heals 3% of max HP. +10% of evasion added as flat damage to Stab. +5 all resist. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [{ id: 'st_evasive_recovery', trigger: 'onDodge', chance: 1, healPercent: 3 }],
          damageFromEvasion: 10,
          allResist: 5,
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Counter Stance',
        description: 'Dodge counter-attacks (from Shadow Guard and Riposte Ready) deal 150% of Stab\'s fully-scaled damage instead of 75-100%. Counter-attacks can crit. You take +10% increased damage from all sources.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { counterDamageMult: 2, counterCanCrit: true, increasedDamageTaken: 10 },
      },
      t6Notable: {
        name: 'Phantom Strike',
        description: 'When you dodge: 20% chance to trigger Phantom Strike — an invisible counter-attack that deals 200% of Stab\'s fully-scaled damage and guarantees your next Stab crits. 8s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'st_phantom_strike',
              trigger: 'onDodge',
              chance: 0.2,
              instantDamage: { flatDamage: 0, element: 'matched', scaleStat: 'weaponDamage', scaleRatio: 2 },
              applyBuff: { buffId: 'phantomStrike', effect: { guaranteedCrit: true }, duration: 5 },
              internalCooldown: 8,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'SHADOW SOVEREIGN',
        description: 'All dodge counter-attacks (Shadow Guard, Riposte Ready, Phantom Strike) deal 200% of Stab\'s fully-scaled damage. Dodge proc frequency doubled. You can no longer heal from Stab (leech and life-on-hit disabled for this skill). -10% max HP.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          counterDamageMult: 2.67,
          dodgeProcFrequencyMult: 2,
          cannotLeech: true,
          lifeOnHit: -999,
          reducedMaxLife: 10,
        },
        synergy: ['st_2_5_1', 'st_2_6_0', 'st_2_3_1'],
        antiSynergy: ['st_2_1_1', 'st_2_5_0'],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// BLADE DANCE TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const BLADE_DANCE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_blade_dance', prefix: 'bd',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Slaughter Dance',
        description: 'When Blade Dance kills 2+ targets in a single cast: enter Slaughter state (+25% damage, +20% crit chance for 4s). Killing 3 targets extends duration to 6s and adds +15% crit multiplier.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_slaughter_dance',
              trigger: 'onMultiKillInCast',
              chance: 1,
              conditionParam: { minKills: 2 },
              applyBuff: { buffId: 'slaughter', effect: { damageMult: 1.25, critChanceBonus: 20 }, duration: 4 },
              escalation: { atKills: 3, durationOverride: 6, additionalEffect: { critMultiplierBonus: 15 } },
            },
          ],
          incCritChance: 5,
        },
      },
      t4Notable: {
        name: 'Triple Execution',
        description: 'When Blade Dance hits 3 different targets and at least 1 is below 30% HP: that low-HP target takes +50% damage from Blade Dance AND Dance Momentum\'s splash is increased to 75% (can crit). +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_triple_execution',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { uniqueTargets: 3, anyTargetBelowHp: 30 },
              effect: { lowHpTargetDamageBonus: 50 },
            },
          ],
          comboStateEnhance: { dance_momentum: { splashDamage: 75, splashCanCrit: true } },
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Kill Redirect',
          'If a Blade Dance hit kills its target, the next hit in the cast retargets to a new enemy and gains +30% damage.',
          { onMidCastKill: { retarget: true, retargetDamageBonus: 30 } },
          { 1: { retargetDamageBonus: 30 }, 2: { retargetDamageBonus: 45, retargetCritBonus: 10 } }),
        t1b: bh('Opportunistic Strikes',
          '+8% crit chance for each unique target hit by Blade Dance in the current cast. (3 targets = +24% crit on the last hit).',
          { perUniqueTargetInCast: { incCritChance: 8 } },
          { 1: { incCritChance: 8 }, 2: { incCritChance: 12, thirdTargetCrit: { applyDebuff: 'exposed' } } }),
        t2b: bh('Target Selection',
          'Blade Dance prioritizes the lowest-HP enemy for hit 1. If hit 1 kills, the kill redirect bonus (T1a) is more likely to trigger.',
          { targetPriority: 'lowestHp' },
          { 1: { priorityHits: 1 }, 2: { priorityHits: 2, weaponMastery: 3 } }),
        t3a: bh('Pack Hunter',
          '+10% damage with Blade Dance per enemy in the current pack (max +40% at 4+ enemies).',
          { conditionalMods: [{ condition: 'perEnemyInPack', modifier: { incDamage: 10 }, maxStacks: 4 }] },
          { 1: { incDamage: 10, maxStacks: 4 }, 2: { incDamage: 15, maxStacks: 4, weaponMastery: 3 } }),
        t3b: bh('Finishing Dance',
          '+20% crit chance against targets below 40% HP.',
          {
          conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 40, modifier: { incCritChance: 20 } }],
        },
          { 1: { incCritChance: 20, threshold: 40 }, 2: { incCritChance: 30, cdReductionPerKill: 0.5 } }),
        t3c: bh('Sweeping Momentum',
          '+15% damage on the next skill cast after Blade Dance if at least 2 targets were hit.',
          {
          conditionalMods: [{ condition: 'afterCastHitCount', threshold: 2, modifier: { nextSkillDamageBonus: 15 } }],
        },
          {
          '1': { nextSkillDamageBonus: 15, threshold: 2 },
          '2': { nextSkillDamageBonus: 25, at3Targets: { nextSkillCritBonus: 10 } },
        }),
        t4b: bh('Slaughter Extension',
          'While Slaughter state is active: +15% damage with all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'slaughter', modifier: { incDamage: 15 } }],
        },
          { 1: { incDamage: 15 }, 2: { incDamage: 25, durationExtensionPerKill: 1, maxExtension: 3 } }),
      },
      t5a: {
        name: 'Methodical Dancer',
        description: 'Blade Dance always hits 3 targets even if fewer than 3 enemies exist (remaining hits re-hit the same target). All hits gain +10% damage. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { alwaysFire3Hits: true, incDamage: 10, weaponMastery: 8 },
      },
      t5b: {
        name: 'Dance of Death',
        description: 'Each Blade Dance kill during the cast adds +1 hit to the cast (kill mob 1 → hit 4 fires, kill mob 2 → hit 5 fires, etc.). Extra hits deal 30% WD each. If Blade Dance kills 0 targets, its cooldown is increased by 2s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { extraHitPerKill: true, extraHitDamage: 30, onZeroKillsPenalty: { cooldownIncrease: 2 } },
      },
      t6Notable: {
        name: 'Reaper\'s Dance',
        description: 'When Blade Dance kills 3+ targets in a single cast: trigger Reaper\'s Dance — deal 200% of Blade Dance\'s fully-scaled damage as AoE to ALL remaining enemies. 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_reapers_dance',
              trigger: 'onTripleKillInCast',
              chance: 1,
              instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 2, isAoE: true },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'DANCE MACABRE',
        description: 'Blade Dance targets ALL enemies in the pack (becomes full AoE like Fan of Knives) but each hit deals only 15% WD. Reaper\'s Dance (T6) triggers on 2+ kills instead of 3+ but at 150% instead of 200%. -10% damage with all other skills.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          targetAllEnemies: true,
          weaponDamageOverride: 15,
          reapersOverride: { minKills: 2, scaleRatio: 1.5 },
          globalIncDamage: -10,
        },
        synergy: ['bd_0_5_1', 'bd_0_6_0', 'bd_0_3_0'],
        antiSynergy: ['bd_0_5_0'],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Plague Link',
        description: 'When Blade Dance hits 3 different targets: link all 3 with Plague Link (5s). While linked, 15% of damage dealt to any linked target is also dealt to other linked targets. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_plague_link',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { uniqueTargets: 3 },
              applyDebuff: { debuffId: 'plague_link', duration: 5, effect: { sharedDamagePercent: 15 } },
            },
          ],
          ailmentDuration: 8,
        },
      },
      t4Notable: {
        name: 'Plague Web',
        description: 'When 3 Plague-Linked targets all have 3+ ailment stacks simultaneously: enter Plague Web state (5s). During Plague Web: Plague Link damage sharing increased from 15% to 30% and applies to ALL enemies in the pack (not just linked targets). 15s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_plague_web',
              trigger: 'onLinkedTargetsThreshold',
              chance: 1,
              conditionParam: { linkedTargets: 3, minAilmentStacks: 3 },
              applyBuff: { buffId: 'plagueWeb', effect: { sharedDamagePercent: 30, shareToAll: true }, duration: 5 },
              internalCooldown: 15,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Distributed Infection',
          'Ailments applied by Blade Dance gain +10% potency for each unique target hit in the cast. (3 targets = each ailment at +30% potency).',
          { perUniqueTargetInCast: { ailmentPotencyBonus: 10 } },
          { 1: { ailmentPotencyBonus: 10 }, 2: { ailmentPotencyBonus: 15, weaponMastery: 3 } }),
        t1b: bh('Infectious Dance',
          'If Blade Dance hits a target that already has an active ailment, the new ailment gains +15% duration.',
          {
          conditionalMods: [{ condition: 'targetHasActiveAilment', modifier: { ailmentDurationBonus: 15 } }],
        },
          {
          '1': { ailmentDurationBonus: 15 },
          '2': { ailmentDurationBonus: 25, differentSkillBonus: { ailmentPotency: 10 } },
        }),
        t2b: bh('Contagious Steps',
          'Ailments applied to linked targets (from Plague Link damage sharing) have +20% potency.',
          { conditionalMods: [{ condition: 'whileTargetLinked', modifier: { sharedAilmentPotency: 20 } }] },
          {
          '1': { sharedAilmentPotency: 20 },
          '2': { sharedAilmentPotency: 35, sharedDamageAppliesAilments: true },
        }),
        t3a: bh('Mass Infection',
          '+8% ailment potency for Blade Dance per enemy in the current pack (max +32% at 4+).',
          {
          conditionalMods: [{ condition: 'perEnemyInPack', modifier: { ailmentPotency: 8 }, maxStacks: 4 }],
        },
          {
          '1': { ailmentPotency: 8, maxStacks: 4 },
          '2': { ailmentPotency: 12, maxStacks: 4, weaponMastery: 3 },
        }),
        t3b: bh('Plague Spread',
          'Dance Momentum replaced with Plague Spread (4s): next skill\'s ailment also applies to 1 adjacent enemy at 50% potency.',
          {
          comboStateReplace: {
            from: 'dance_momentum',
            to: 'plague_spread',
            effect: { nextAilmentSplash: 1, splashPotency: 50 },
            duration: 4,
          },
        },
          { 1: { splashTargets: 1, splashPotency: 50 }, 2: { splashTargets: 2, splashPotency: 60 } }),
        t3c: bh('Lingering Links',
          'Ailments on Plague-Linked targets last 20% longer.',
          { conditionalMods: [{ condition: 'whileTargetLinked', modifier: { ailmentDuration: 20 } }] },
          { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 30, linkDurationBonus: 1 } }),
        t4b: bh('Web Amplifier',
          'While Plague Web is active: +15% ailment potency for all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'plagueWeb', modifier: { ailmentPotency: 15 } }],
        },
          {
          '1': { ailmentPotency: 15 },
          '2': { ailmentPotency: 25, durationExtensionPerAilment: 0.3, maxExtension: 2 },
        }),
      },
      t5a: {
        name: 'Persistent Links',
        description: 'Plague Link persists until the linked targets die (no duration limit). Plague Link damage sharing increased to 20% baseline. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { plagueLinkOverride: { duration: 'permanent', sharedDamagePercent: 20 }, weaponMastery: 8 },
      },
      t5b: {
        name: 'Detonating Links',
        description: 'When a Plague-Linked target dies: detonate all its ailments as instant burst damage to the other linked targets (100% of remaining ailment damage). Plague Link is removed from all targets after detonation.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_detonating_links',
              trigger: 'onLinkedTargetDeath',
              chance: 1,
              detonateAilments: { scaleRatio: 1, removeLink: true },
            },
          ],
        },
      },
      t6Notable: {
        name: 'Pandemic Dance',
        description: 'When a Plague-Linked target dies: ALL of its ailments spread to the other linked targets at 100% remaining duration and potency. If the dead target had 5+ ailment stacks, also spreads to ALL non-linked enemies in the pack. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_pandemic_dance',
              trigger: 'onLinkedTargetDeath',
              chance: 1,
              spreadAilments: { toLinked: true, potencyRetain: 1, durationRetain: 1 },
              escalation: { at5Stacks: { spreadToAll: true } },
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'PLAGUE DANCER',
        description: 'Plague Link now links ALL enemies hit by Blade Dance (not just 3). Linked enemy ailments deal 3x effect. Blade Dance direct hit damage reduced by -30%. Non-linked enemies take -20% ailment damage from you.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { linkAllTargets: true, linkedAilmentEffectMult: 3, incDamage: -30, nonLinkedAilmentPenalty: -20 },
        synergy: ['bd_1_2_0', 'bd_1_4_0', 'bd_1_6_0'],
        antiSynergy: ['bd_0_3_0'],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Defensive Scatter',
        description: 'If you dodge within 3s of casting Blade Dance: each target that was hit takes a counter-hit for 60% of Blade Dance\'s fully-scaled damage and you gain +1 Fortify stack per target hit (max 3). 5s internal cooldown. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_defensive_scatter',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { withinWindowAfterCast: 3, skillId: 'dagger_blade_dance' },
              counterPerTarget: { damage: 60, fortifyPerTarget: { stacks: 1, duration: 5, damageReduction: 3 } },
              internalCooldown: 5,
            },
          ],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Evasive Dance Form',
        description: 'When you dodge 2 attacks within 4s of casting Blade Dance: enter Evasive Dance Form (4s). During form: Blade Dance cooldown reduced by 50% and all Blade Dance hits apply Weakened curse (2s). 10s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_evasive_dance_form',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { dodgesInWindow: 2, afterCastWindow: 4, skillId: 'dagger_blade_dance' },
              applyBuff: {
                buffId: 'evasiveDanceForm',
                effect: { skillCdReduction: { dagger_blade_dance: 50 } },
                duration: 4,
              },
              internalCooldown: 10,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Scattered Threat',
          'While 3+ enemies are alive in the current encounter, you take 8% less damage. Each enemy killed by Blade Dance reduces this bonus by 2% (defense weakens as the pack shrinks).',
          {
          conditionalMods: [
            { condition: 'whilePackSize', threshold: 3, modifier: { damageReduction: 8, reductionPerKill: 2 } },
          ],
        },
          {
          '1': { damageReduction: 8, reductionPerKill: 2 },
          '2': { damageReduction: 10, reductionPerKill: 1.5, allResist: 5 },
        }),
        t1b: bh('Dancing Recovery',
          'Each unique target hit by Blade Dance heals for 1% max HP. (3 targets = 3% HP).',
          { perUniqueTargetInCast: { healPercent: 1 } },
          {
          '1': { healPercent: 1 },
          '2': { healPercent: 1.5, onFullTargets: { fortify: { stacks: 1, duration: 4, damageReduction: 3 } } },
        }),
        t2b: bh('Scattering Steps',
          'After casting Blade Dance on 3 targets: +10% chance to dodge the next attack.',
          {
          conditionalMods: [{ condition: 'afterCastOnMultipleTargets', threshold: 3, modifier: { dodgeChanceBonus: 10 } }],
        },
          { 1: { dodgeChanceBonus: 10 }, 2: { dodgeChanceBonus: 15, dodgeReducesCd: 1 } }),
        t3a: bh('Scattered Defense',
          '+5% damage reduction for 3s per unique target hit by the most recent Blade Dance (max +15% at 3 targets).',
          {
          conditionalMods: [
            {
              condition: 'perUniqueTargetInLastCast',
              modifier: { damageReduction: 5 },
              maxStacks: 3,
              duration: 3,
            },
          ],
        },
          { 1: { damageReduction: 5 }, 2: { damageReduction: 8, weaponMastery: 3 } }),
        t3b: bh('Evasive Dance',
          'Dance Momentum replaced with Evasive Dance (3s): +15% dodge chance.',
          {
          comboStateReplace: { from: 'dance_momentum', to: 'evasive_dance', effect: { dodgeChance: 15 }, duration: 3 },
        },
          { 1: { dodgeChance: 15, duration: 3 }, 2: { dodgeChance: 20, duration: 4 } }),
        t3c: bh('Retaliation Marks',
          'Each enemy hit by Blade Dance that attacks you within 3s becomes Marked for Retaliation: takes +15% more damage from your next Blade Dance.',
          {
          conditionalMods: [
            {
              condition: 'enemyAttacksAfterBeingHit',
              window: 3,
              modifier: { targetDamageTaken: 15, fromSkill: 'dagger_blade_dance' },
            },
          ],
        },
          {
          '1': { targetDamageTaken: 15, window: 3, fromSkill: 'dagger_blade_dance' },
          '2': { targetDamageTaken: 20, window: 5, globalBonus: 5 },
        }),
        t4b: bh('Form Persistence',
          'While Evasive Dance Form is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'evasiveDanceForm', modifier: { evasionBonus: 10 } }],
        },
          {
          '1': { evasionBonus: 10 },
          '2': { evasionBonus: 15, durationExtensionPerCast: 0.5, maxExtension: 2 },
        }),
      },
      t5a: {
        name: 'Iron Dancer',
        description: 'Each Blade Dance cast grants +1 Fortify stack (3% DR, 6s). At 3+ Fortify stacks: Blade Dance heals 2% max HP per target hit. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_iron_dancer',
              trigger: 'onCast',
              chance: 1,
              fortifyOnProc: { stacks: 1, duration: 6, damageReduction: 3 },
            },
          ],
          conditionalMods: [{ condition: 'whileFortifyStacks', threshold: 3, modifier: { healPerTargetPercent: 2 } }],
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Counter Dancer',
        description: 'Defensive Scatter counter-hits (T2) deal 120% instead of 60% and can crit. Each counter-hit that crits reduces Blade Dance cooldown by 0.5s. You take +10% increased damage from all sources.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          counterDamageOverride: 120,
          counterCanCrit: true,
          counterCritCdReduction: 0.5,
          increasedDamageTaken: 10,
        },
      },
      t6Notable: {
        name: 'Phantom Dance',
        description: 'When you dodge: 20% chance to trigger Phantom Dance — a free Blade Dance counter-attack that prioritizes enemies currently attacking you. Each hit deals 80% of Blade Dance\'s fully-scaled damage. 8s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'bd_phantom_dance',
              trigger: 'onDodge',
              chance: 0.2,
              instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.8, hitCount: 3, targetPriority: 'attackingPlayer' },
              internalCooldown: 8,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'SHADOW DANCER',
        description: 'Phantom Dance (T6) triggers on EVERY dodge (no chance roll, no ICD). Counter-hits deal 50% instead of 80%. Each Phantom Dance trigger costs 1.5% max HP. Blade Dance\'s regular casts deal -15% damage.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          phantomDanceOverride: { chance: 1, icd: 0, damagePerHit: 0.5 },
          lifeCostPerTrigger: 1.5,
          incDamage: -15,
        },
        synergy: ['bd_2_1_0', 'bd_2_5_1', 'bd_2_6_0'],
        antiSynergy: ['bd_2_1_1'],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// FAN OF KNIVES TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const FAN_OF_KNIVES_TALENT_TREE = createTalentTree({
  skillId: 'dagger_fan_of_knives', prefix: 'fk',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Knife Storm',
        description: 'When Fan of Knives hits 4+ enemies: enter Knife Storm state (4s). During Knife Storm: +20% crit chance and +25% crit multiplier with all skills. +8% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_knife_storm',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minTargetsHit: 4 },
              applyBuff: { buffId: 'knifeStorm', effect: { critChanceBonus: 20, critMultiplierBonus: 25 }, duration: 4 },
            },
          ],
          incCritChance: 8,
        },
      },
      t4Notable: {
        name: 'Storm of Steel',
        description: 'When Fan of Knives crits on 3+ targets in one cast: Saturated also grants +10% crit chance against affected targets. All enemies hit gain Exposed (2s). +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          comboStateEnhance: { saturated: { additionalEffect: { incCritChance: 10 } } },
          procs: [
            {
              id: 'fk_storm_of_steel',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minCritsInCast: 3 },
              applyDebuff: { debuffId: 'exposed', duration: 2, toAll: true },
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Widening Arc',
          'Fan of Knives gains +5% damage per enemy hit in the cast (4 enemies = +20%).',
          { perTargetHit: { incDamage: 5 } },
          { 1: { incDamage: 5 }, 2: { incDamage: 8, incCritChancePerTarget: 2 } }),
        t1b: bh('Piercing Throw',
          'Fan of Knives deals +15% damage to the FRONT enemy (primary target) in addition to hitting all targets.',
          { primaryTargetBonus: { incDamage: 15 } },
          { 1: { incDamage: 15 }, 2: { incDamage: 25, incCritChance: 10 } }),
        t2b: bh('Sharpened Edge',
          'Fan of Knives crits deal +15% more damage to non-primary targets (AoE crit bonus).',
          { aoeCritBonus: { incDamage: 15 } },
          {
          '1': { incDamage: 15 },
          '2': { incDamage: 25, onMultiCrit: { applyToFront: { debuffId: 'exposed', duration: 3 } } },
        }),
        t3a: bh('Overwhelming Force',
          '+20% crit multiplier with Fan of Knives when hitting 3+ enemies.',
          {
          conditionalMods: [{ condition: 'whileTargetsHit', threshold: 3, modifier: { incCritMultiplier: 20 } }],
        },
          { 1: { incCritMultiplier: 20 }, 2: { incCritMultiplier: 30, weaponMastery: 3 } }),
        t3b: bh('Overkill Cascade',
          'When Fan of Knives kills an enemy, 30% of overkill damage is dealt to all surviving enemies.',
          { conditionalMods: [{ condition: 'onKill', modifier: { overkillCascadePercent: 30 } }] },
          { 1: { overkillCascadePercent: 30 }, 2: { overkillCascadePercent: 50, overkillCanCrit: true } }),
        t3c: bh('Fan Mastery',
          '+3% weapon mastery per skill cast since the last Fan of Knives (max 3 stacks, +9%).',
          {
          conditionalMods: [{ condition: 'skillsCastSinceLast', modifier: { weaponMastery: 3 }, maxStacks: 3 }],
        },
          {
          '1': { weaponMastery: 3, maxStacks: 3 },
          '2': { weaponMastery: 4, maxStacks: 3, incDamagePerStack: 5 },
        }),
        t4b: bh('Storm Sustain',
          'While Knife Storm is active: +10% damage with Fan of Knives.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'knifeStorm', modifier: { incDamage: 10 } }],
        },
          { 1: { incDamage: 10 }, 2: { incDamage: 15, durationExtensionPerKill: 0.5, maxExtension: 2 } }),
      },
      t5a: {
        name: 'Precision Barrage',
        description: 'Fan of Knives gains +3% crit chance per enemy in the pack (even unhit enemies count). At 5+ enemies: Fan of Knives always crits. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { perEnemyInPack: { incCritChance: 3 }, guaranteedCritAt: 5, weaponMastery: 8 },
      },
      t5b: {
        name: 'Rain of Blades',
        description: 'Fan of Knives fires twice (double cast — two separate volleys). Second volley deals 60% of the first\'s damage. If Fan of Knives kills 0 enemies across both volleys, its cooldown is increased by 2s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { doubleCast: true, secondCastDamageMult: 0.6, onZeroKillsPenalty: { cooldownIncrease: 2 } },
      },
      t6Notable: {
        name: 'Annihilation',
        description: 'When Fan of Knives kills 3+ enemies in a single cast: trigger a free bonus Fan of Knives at 150% damage that hits ALL enemies (including newly spawned pack if the previous pack was cleared). 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_annihilation',
              trigger: 'onMultiKillInCast',
              chance: 1,
              conditionParam: { minKills: 3 },
              freeCast: { skillId: 'dagger_fan_of_knives', damageMult: 1.5, hitsNewPack: true },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'BLADE TEMPEST',
        description: 'Fan of Knives deals +50% damage but its cooldown is doubled (10s). Annihilation (T6) triggers on 2+ kills instead of 3+ and the free cast deals 200% instead of 150%. -15% damage with all single-target skills.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          incDamage: 50,
          cooldownMultiplier: 2,
          annihilationOverride: { minKills: 2, damageMult: 2 },
          singleTargetPenalty: -15,
        },
        synergy: ['fk_0_1_0', 'fk_0_3_1', 'fk_0_6_0'],
        antiSynergy: ['fk_0_1_1'],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Plague Wave',
        description: 'When Fan of Knives hits 3+ enemies that already have active ailments: trigger Plague Wave — all active ailments on hit targets tick at 2x speed for 3s. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_plague_wave',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minAilmentedTargetsHit: 3 },
              applyBuff: { buffId: 'plagueWave', effect: { ailmentTickSpeedMult: 2, appliesToTargets: true }, duration: 3 },
            },
          ],
          ailmentDuration: 8,
        },
      },
      t4Notable: {
        name: 'Toxic Storm',
        description: 'When Fan of Knives applies ailments to 4+ targets simultaneously: enter Toxic Storm (4s). During Toxic Storm: all skills\' ailment applications gain +25% potency AND hit 1 additional target (single-target skills splash to 1 adjacent). 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_toxic_storm',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minTargetsAilmented: 4 },
              applyBuff: { buffId: 'toxicStorm', effect: { globalAilmentPotency: 25, allSkillsSplash: 1 }, duration: 4 },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Toxic Barrage',
          'Fan of Knives\' ailment applications gain +5% potency per target hit in the cast (4 targets = +20% potency on ALL applications).',
          { perTargetHit: { ailmentPotencyBonus: 5 } },
          { 1: { ailmentPotencyBonus: 5 }, 2: { ailmentPotencyBonus: 8, weaponMastery: 3 } }),
        t1b: bh('Saturating Strikes',
          'Enemies already affected by Saturated take +10% more ailment damage from Fan of Knives.',
          { conditionalMods: [{ condition: 'whileTargetSaturated', modifier: { ailmentDamageBonus: 10 } }] },
          { 1: { ailmentDamageBonus: 10 }, 2: { ailmentDamageBonus: 15, saturatedDurationBonus: 1 } }),
        t2b: bh('Lingering Barrage',
          'Ailments applied by Fan of Knives last 20% longer than normal.',
          { ailmentDurationBonus: 20 },
          {
          '1': { ailmentDurationBonus: 20 },
          '2': { ailmentDurationBonus: 30, massDurationBonus: { threshold: 4, potencyBonus: 10 } },
        }),
        t3a: bh('Pandemic Reach',
          '+5% DoT multiplier per enemy hit by the most recent Fan of Knives (max +25% at 5 targets).',
          {
          conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { dotMultiplier: 5 }, maxStacks: 5 }],
        },
          { 1: { dotMultiplier: 5, maxStacks: 5 }, 2: { dotMultiplier: 7, maxStacks: 5, weaponMastery: 3 } }),
        t3b: bh('Enhanced Saturation',
          'Saturated\'s +15% DoT damage increased to +25%. Saturated now also extends active ailment durations by 1s when applied.',
          { comboStateEnhance: { saturated: { dotDamageTaken: 25, ailmentDurationExtension: 1 } } },
          {
          '1': { dotDamageTaken: 25, ailmentDurationExtension: 1 },
          '2': { dotDamageTaken: 30, ailmentDurationExtension: 1.5 },
        }),
        t3c: bh('Festering Cloud',
          'Enemies killed by ailment damage within 3s of being hit by Fan of Knives spread their ailments to all nearby enemies at 50% remaining duration.',
          {
          conditionalMods: [
            {
              condition: 'ailmentKillAfterFoK',
              window: 3,
              modifier: { spreadAilments: { durationRetain: 50 } },
            },
          ],
        },
          {
          '1': { durationRetain: 50, crossPackSpread: false },
          '2': { durationRetain: 75, crossPackSpread: true },
        }),
        t4b: bh('Storm Amplifier',
          'While Toxic Storm is active: +10% ailment duration for all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'toxicStorm', modifier: { ailmentDuration: 10 } }],
        },
          {
          '1': { ailmentDuration: 10 },
          '2': { ailmentDuration: 15, durationExtensionPerCast: 0.3, maxExtension: 1.5 },
        }),
      },
      t5a: {
        name: 'Endless Plague',
        description: 'Fan of Knives permanently gains +2% ailment potency per cast (max 15 stacks, +30%). Stacks persist until zone change. Ailments from FoK can never expire naturally — they persist until the target dies. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          permanentStackPerCast: { stat: 'ailmentPotency', perStack: 2, maxStacks: 15 },
          ailmentsNeverExpire: true,
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Chain Detonation',
        description: 'When Fan of Knives hits an enemy with 5+ ailment stacks: 25% chance to detonate ALL stacks on that target as instant burst (100% of snapshot). Detonation triggers independently per enemy — multiple detonations possible in one cast. Detonated targets have NO ailments after.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_chain_detonation',
              trigger: 'onHit',
              chance: 0.25,
              conditionParam: { minAilmentStacks: 5 },
              detonateAll: true,
              perTarget: true,
            },
          ],
        },
      },
      t6Notable: {
        name: 'Extinction Event',
        description: 'When Fan of Knives kills an enemy that has 3+ ailment stacks: that target\'s ailments EXPLODE, dealing 40% of total remaining ailment damage as AoE to all surviving enemies. Each enemy can only explode once per cast. 10s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_extinction_event',
              trigger: 'onKillInCast',
              chance: 1,
              conditionParam: { minAilmentStacks: 3 },
              explodeAilments: { aoeScaleRatio: 0.4, oncePerTarget: true },
              internalCooldown: 10,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'PLAGUE STORM',
        description: 'Fan of Knives applies ailments at 3x potency but can ONLY apply ailments (deals 0 direct hit damage). Extinction Event (T6) triggers on ANY ailment-kill of a FoK-ailmented target (not just during FoK cast). -20% ailment potency with all non-AoE skills.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          ailmentPotencyMult: 3,
          directDamageOverride: 0,
          extinctionOverride: { triggerOnAnyAilmentKill: true },
          nonAoePenalty: { ailmentPotency: -20 },
        },
        synergy: ['fk_1_1_0', 'fk_1_2_0', 'fk_1_5_0'],
        antiSynergy: ['fk_0_1_0', 'fk_0_3_1'],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Defensive Barrage',
        description: 'When Fan of Knives hits 3+ enemies: gain +1 Fortify stack per enemy hit (max 3 stacks gained). If you dodge within 3s of casting: trigger a counter Fan of Knives at 50% damage. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_defensive_barrage',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minTargetsHit: 3 },
              fortifyPerTarget: { stacks: 1, maxStacks: 3, duration: 5, damageReduction: 3 },
            },
            {
              id: 'fk_defensive_barrage_counter',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { withinWindowAfterCast: 3, skillId: 'dagger_fan_of_knives' },
              freeCast: { skillId: 'dagger_fan_of_knives', damageMult: 0.5 },
            },
          ],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Storm Shelter',
        description: 'When Fan of Knives hits 4+ enemies: enter Storm Shelter (4s). During Storm Shelter: +20% damage reduction and all enemies that attack you take 30% of Fan of Knives\' fully-scaled damage as retaliation. 10s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_storm_shelter',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minTargetsHit: 4 },
              applyBuff: { buffId: 'stormShelter', effect: { damageReduction: 20, retaliationDamage: 30 }, duration: 4 },
              internalCooldown: 10,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Suppressive Fire',
          'Enemies hit by Fan of Knives deal 5% less damage for 3s.',
          { onHitDebuff: { reducedDamageDealt: 5, duration: 3 } },
          { 1: { reducedDamageDealt: 5, duration: 3 }, 2: { reducedDamageDealt: 8, duration: 4 } }),
        t1b: bh('Scattering Throw',
          'Fan of Knives heals for 0.5% max HP per enemy hit.',
          { perTargetHit: { healPercent: 0.5 } },
          {
          '1': { healPercent: 0.5 },
          '2': { healPercent: 0.8, atTargets: 4, fortify: { stacks: 1, duration: 4, damageReduction: 3 } },
        }),
        t2b: bh('Scatter Shield',
          'For 3s after casting Fan of Knives on 3+ targets: +8% chance to dodge attacks.',
          {
          conditionalMods: [
            {
              condition: 'afterCastOnMultipleTargets',
              threshold: 3,
              modifier: { dodgeChance: 8 },
              duration: 3,
            },
          ],
        },
          { 1: { dodgeChance: 8, duration: 3 }, 2: { dodgeChance: 12, duration: 4, allResist: 5 } }),
        t3a: bh('Crowd Control',
          '+3% damage reduction for 3s per enemy hit by the most recent Fan of Knives (max +15% at 5 targets).',
          {
          conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { damageReduction: 3 }, maxStacks: 5, duration: 3 }],
        },
          {
          '1': { damageReduction: 3, maxStacks: 5 },
          '2': { damageReduction: 4, maxStacks: 5, weaponMastery: 3 },
        }),
        t3b: bh('Suppressed State',
          'Saturated replaced with Suppressed (4s): affected enemies deal -10% damage.',
          {
          comboStateReplace: { from: 'saturated', to: 'suppressed', effect: { reducedEnemyDamage: 10 }, duration: 4 },
        },
          { 1: { reducedEnemyDamage: 10 }, 2: { reducedEnemyDamage: 15, reducedEnemyAttackSpeed: 5 } }),
        t3c: bh('Retaliatory Barrage',
          '+10% damage with Fan of Knives for each enemy that attacked you since the last Fan of Knives cast (max 4 stacks, +40%).',
          {
          conditionalMods: [{ condition: 'enemyAttacksSinceLast', modifier: { incDamage: 10 }, maxStacks: 4 }],
        },
          {
          '1': { incDamage: 10, maxStacks: 4 },
          '2': { incDamage: 12, maxStacks: 4, incCritChancePerStack: 5 },
        }),
        t4b: bh('Shelter Extension',
          'While Storm Shelter is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'stormShelter', modifier: { dodgeChance: 10 } }],
        },
          {
          '1': { dodgeChance: 10 },
          '2': { dodgeChance: 15, durationExtensionPerAttack: 0.3, maxExtension: 2 },
        }),
      },
      t5a: {
        name: 'Iron Barrage',
        description: 'Fan of Knives grants +1 Fortify stack per 2 enemies hit (rounded down). At 5+ Fortify stacks: Fan of Knives heals for 1% max HP per enemy hit. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          fortifyPerTargets: { ratio: 2, stacks: 1, duration: 6, damageReduction: 3 },
          conditionalMods: [{ condition: 'whileFortifyStacks', threshold: 5, modifier: { healPerTargetPercent: 1 } }],
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Retribution Barrage',
        description: 'Storm Shelter\'s retaliation damage increased from 30% to 60% of FoK\'s fully-scaled damage. Retaliation hits can crit. You take +12% increased damage from all sources.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          stormShelterOverride: { retaliationDamage: 60, retaliationCanCrit: true },
          increasedDamageTaken: 12,
        },
      },
      t6Notable: {
        name: 'Knife Veil',
        description: 'When you dodge: 20% chance to trigger Knife Veil — a free defensive Fan of Knives that deals 60% damage and applies Weakened curse (2s) to all targets. Does NOT go on cooldown. 8s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'fk_knife_veil',
              trigger: 'onDodge',
              chance: 0.2,
              freeCast: { skillId: 'dagger_fan_of_knives', damageMult: 0.6 },
              applyDebuff: { debuffId: 'weakened', duration: 2, toAll: true },
              internalCooldown: 8,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'STORM FORTRESS',
        description: 'Knife Veil (T6) triggers on EVERY dodge (no chance roll, no ICD). Counter FoK deals 35% instead of 60%. Each Knife Veil trigger costs 1% max HP. Fan of Knives\' regular casts deal -20% damage.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          knifeVeilOverride: { chance: 1, icd: 0, damageMult: 0.35 },
          lifeCostPerTrigger: 1,
          incDamage: -20,
        },
        synergy: ['fk_2_2_1', 'fk_2_5_1', 'fk_2_6_0'],
        antiSynergy: ['fk_2_1_1'],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// VIPER STRIKE TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const VIPER_STRIKE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_viper_strike', prefix: 'vs',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Venom Crit',
        description: 'When Viper Strike crits a target with 3+ ailment stacks: extend ALL existing ailment durations on that target by 1s. Also grants +15% ailment potency for 3s. +8% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_venom_crit',
              trigger: 'onCrit',
              chance: 1,
              conditionParam: { minAilmentStacks: 3 },
              extendAllAilments: 1,
              buff: { ailmentPotency: 15, duration: 3 },
            },
          ],
          incCritChance: 8,
        },
      },
      t4Notable: {
        name: 'Deep Wound Mastery',
        description: 'When Assassinate consumes Deep Wound: the burst also applies a NEW Deep Wound at 50% of the consumed one\'s potency (chain consumption). The new Deep Wound can also be consumed by the next Assassinate. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: { comboStateEnhance: { deep_wound: { onConsume: { reapplyAtPercent: 50 } } }, weaponMastery: 5 },
      },
      behaviorNodes: {
        t1a: bh('Coiled Strike',
          'Viper Strike\'s ailment potency increases by +8% for each skill cast since the last Viper Strike (max 3 stacks, +24%). Resets when VS fires.',
          {
          conditionalMods: [{ condition: 'skillsCastSinceLast', modifier: { ailmentPotency: 8 }, maxStacks: 3 }],
        },
          {
          '1': { ailmentPotency: 8, maxStacks: 3 },
          '2': { ailmentPotency: 12, maxStacks: 3, incCritChancePerStack: 3 },
        }),
        t1b: bh('Venomous Precision',
          'Viper Strike crits apply ailments at +30% potency on top of the base +50% (total +80% on crit).',
          { conditionalMods: [{ condition: 'onCrit', modifier: { ailmentPotencyBonus: 30 } }] },
          { 1: { ailmentPotencyBonus: 30 }, 2: { ailmentPotencyBonus: 40, ailmentDurationOnCrit: 1 } }),
        t2b: bh('Wound Deepening',
          'Each Viper Strike hit on a target that already has a Deep Wound increases Deep Wound\'s burst value by +10% (when Assassinate consumes it).',
          {
          conditionalMods: [{ condition: 'whileDeepWoundActive', modifier: { deepWoundBurstBonus: 10 }, maxStacks: 3 }],
        },
          { 1: { deepWoundBurstBonus: 10, maxStacks: 3 }, 2: { deepWoundBurstBonus: 15, maxStacks: 3 } }),
        t3a: bh('Lethal Dose',
          '+15% crit chance with Viper Strike against targets with 5+ ailment stacks.',
          {
          conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 5, modifier: { incCritChance: 15 } }],
        },
          { 1: { incCritChance: 15 }, 2: { incCritChance: 22, incCritMultiplier: 10 } }),
        t3b: bh('Follow-up Strike',
          '+20% damage with Viper Strike if the previous skill in rotation was Stab.',
          {
          conditionalMods: [{ condition: 'previousSkillWas', skillId: 'dagger_stab', modifier: { incDamage: 20 } }],
        },
          { 1: { incDamage: 20 }, 2: { incDamage: 30, ailmentPotency: 10 } }),
        t3c: bh('Rising Venom',
          '+5% damage with Viper Strike for each active ailment instance you\'ve applied to the current target (max +40% at 8 instances).',
          {
          conditionalMods: [{ condition: 'perOwnAilmentOnTarget', modifier: { incDamage: 5 }, maxStacks: 8 }],
        },
          { 1: { incDamage: 5, maxStacks: 8 }, 2: { incDamage: 6, maxStacks: 8, weaponMastery: 3 } }),
        t4b: bh('Venom Crit Extension',
          'While target has a Deep Wound active: Viper Strike gains +10% crit chance.',
          { conditionalMods: [{ condition: 'whileDeepWoundActive', modifier: { incCritChance: 10 } }] },
          { 1: { incCritChance: 10 }, 2: { incCritChance: 15, deepWoundExtensionOnCrit: 1 } }),
      },
      t5a: {
        name: 'Surgical Venom',
        description: 'Viper Strike\'s base +50% ailment potency increased to +100%. Deep Wound burst value increased by +25% baseline. Crit chance capped at 40%. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { ailmentPotencyOverride: 100, deepWoundBurstBonus: 25, critChanceCap: 0.4, weaponMastery: 8 },
      },
      t5b: {
        name: 'Serpent\'s Gambit',
        description: 'Viper Strike crits deal +80% damage AND apply ailments at +80% potency. Non-crits deal -30% damage and apply ailments at -30% potency. All-in on crits.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          onCrit: { incDamage: 80, ailmentPotencyBonus: 80 },
          onNonCrit: { incDamage: -30, ailmentPotency: -30 },
        },
      },
      t6Notable: {
        name: 'Detonation Strike',
        description: 'When Viper Strike crits a target with 8+ ailment stacks: detonate 50% of all ailment damage as instant burst AND immediately reapply all detonated ailments at 60% potency. 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_detonation_strike',
              trigger: 'onCrit',
              chance: 1,
              conditionParam: { minAilmentStacks: 8 },
              detonateAilments: { percent: 50, reapplyAt: 60 },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'KING COBRA',
        description: 'Viper Strike\'s ailment potency increased to +150% (from +50% base). Each VS cast can only apply ONE ailment instance, but it\'s the strongest possible. Deep Wound burst value doubled. Viper Strike cooldown increased by 2s (7s total). -15% damage with all other skills\' ailments.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          ailmentPotencyOverride: 150,
          singleInstancePerCast: true,
          deepWoundBurstMult: 2,
          cooldownIncrease: 2,
          globalAilmentPenalty: -15,
        },
        synergy: ['vs_0_1_0', 'vs_0_5_0'],
        antiSynergy: ['vs_0_2_0'],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Venom Saturation',
        description: 'When a target has 5+ VS-applied ailment instances: the target becomes Venom Saturated (persists while 5+ VS ailments active). Saturated targets passively deal 10% of total VS ailment damage per second to all nearby enemies as area poison. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_venom_saturation',
              trigger: 'onAilmentApplied',
              chance: 1,
              conditionParam: { minViperStrikeAilments: 5 },
              applyDebuff: {
                debuffId: 'venom_saturated',
                duration: -1, // whileAboveThreshold
                effect: { aoePoison: { percent: 10, radius: 'nearby' } },
              },
            },
          ],
          ailmentDuration: 8,
        },
      },
      t4Notable: {
        name: 'Venom Mastery',
        description: 'When VS ailment damage ticks for 10+ total ticks on a single target: enter Venom Mastery state (5s). During this state: VS ailments tick at 1.5x speed and gain +20% potency. 15s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_venom_mastery',
              trigger: 'onAilmentTick',
              chance: 1,
              conditionParam: { totalTicksOnTarget: 10 },
              applyBuff: {
                buffId: 'venomMastery',
                effect: { viperStrikeTickSpeed: 1.5, viperStrikePotency: 20 },
                duration: 5,
              },
              internalCooldown: 15,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Compounding Venom',
          'Each Viper Strike cast on the same target increases the NEXT VS ailment\'s potency by +10% (max 5 stacks, +50%). Stacks persist on the target, not the player.',
          { perCastOnSameTarget: { ailmentPotencyRamp: 10, maxStacks: 5 } },
          { 1: { ailmentPotencyRamp: 10 }, 2: { ailmentPotencyRamp: 15, durationPerStack: 0.3 } }),
        t1b: bh('Venom Synergy',
          'VS ailments deal +5% more damage for each OTHER skill\'s ailment active on the target (max +20% at 4 other ailments).',
          {
          conditionalMods: [{ condition: 'perOtherSkillAilmentOnTarget', modifier: { ailmentDamageBonus: 5 }, maxStacks: 4 }],
        },
          { 1: { ailmentDamageBonus: 5 }, 2: { ailmentDamageBonus: 8, weaponMastery: 3 } }),
        t2b: bh('Deep Toxin',
          'VS ailments that have been active for 2+ seconds deal +15% more damage.',
          {
          conditionalMods: [{ condition: 'ailmentAge', threshold: 2, modifier: { ailmentDamageBonus: 15 } }],
        },
          { 1: { at2s: 15 }, 2: { at2s: 25, at4s: 10 } }),
        t3a: bh('Concentrated Venom',
          '+10% DoT multiplier for Viper Strike ailments specifically (not all ailments).',
          { viperStrikeDoTMult: 10 },
          { 1: { viperStrikeDoTMult: 10 }, 2: { viperStrikeDoTMult: 15, viperStrikePotency: 5 } }),
        t3b: bh('Persistent Deep Wound',
          'Deep Wound is no longer consumed by Assassinate. Instead, while Deep Wound is active on target, ALL ailments on target deal +20% more damage.',
          {
          comboStateReplace: { disableConsumption: 'deep_wound', whileActive: { allAilmentDamageBonus: 20 } },
        },
          { 1: { allAilmentDamageBonus: 20 }, 2: { allAilmentDamageBonus: 30, ailmentDurationBonus: 15 } }),
        t3c: bh('Venomous Persistence',
          'VS ailments refresh their duration when ANY other skill hits the target.',
          { viperStrikeAilmentRefresh: { onAnySkillHit: true } },
          { 1: { refreshOnly: true }, 2: { potencyPerRefresh: 5, maxRefreshBonus: 25, weaponMastery: 3 } }),
        t4b: bh('Mastery Amplifier',
          'While Venom Mastery is active: +10% ailment duration for VS ailments.',
          {
          conditionalMods: [
            {
              condition: 'whileBuffActive',
              buffId: 'venomMastery',
              modifier: { viperStrikeAilmentDuration: 10 },
            },
          ],
        },
          {
          '1': { viperStrikeAilmentDuration: 10 },
          '2': { viperStrikeAilmentDuration: 15, durationExtensionPerTick: 0.2, maxExtension: 2 },
        }),
      },
      t5a: {
        name: 'Endless Venom',
        description: 'VS ailments gain +3% potency per second they\'ve been active (uncapped). VS ailment duration +50%. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          viperStrikeAilmentAgeScaling: { potencyPerSecond: 3, uncapped: true },
          viperStrikeAilmentDuration: 50,
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Venom Nova',
        description: 'When VS ailment damage kills a target: all VS ailments on that target explode as AoE, dealing 80% of remaining damage to nearby enemies and applying 1 VS ailment instance to each. If VS ailments DON\'T kill the target, VS cooldown +1s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_venom_nova',
              trigger: 'onAilmentKill',
              chance: 1,
              explodeAilments: { aoeScaleRatio: 0.8, applyInstance: 1 },
            },
          ],
          onNonAilmentKillPenalty: { cooldownIncrease: 1 },
        },
      },
      t6Notable: {
        name: 'Eternal Venom',
        description: 'When a VS ailment would expire: 40% chance it persists instead at 50% of its current potency (indefinitely, until target dies). Can only trigger once per ailment instance. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_eternal_venom',
              trigger: 'onAilmentExpire',
              chance: 0.4,
              effect: { persistAtPercent: 50, oncePerInstance: true },
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'VENOM LORD',
        description: 'VS\'s +50% base ailment potency increased to +120%. VS can only apply ailments to ONE target at a time — applying to a new target removes all VS ailments from the previous target. Eternal Venom (T6) chance increased to 60% but persisted ailments only last 10s (not indefinitely). -20% ailment potency with all other skills.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          ailmentPotencyOverride: 120,
          singleTargetAilmentLock: true,
          eternalVenomOverride: { chance: 0.6, maxDuration: 10 },
          globalAilmentPenalty: -20,
        },
        synergy: ['vs_1_1_0', 'vs_1_5_0', 'vs_1_6_0'],
        antiSynergy: ['vs_1_2_0'],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Serpent Reflexes',
        description: 'When you dodge: apply 1 VS ailment instance at 75% potency to ALL nearby enemies (not just the attacker). Gains Fortify (+3% DR, 5s). +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_serpent_reflexes',
              trigger: 'onDodge',
              chance: 1,
              applyAilment: { skillId: 'dagger_viper_strike', potencyMult: 0.75, toAll: true },
              fortifyOnProc: { stacks: 1, duration: 5, damageReduction: 3 },
            },
          ],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Serpent Form',
        description: 'When you dodge while 3+ enemies have VS ailments: enter Serpent Form (4s). During Serpent Form: VS ailment ticks heal you for 1% max HP each AND all dodge counter-attacks apply VS ailments at 100% potency. 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_serpent_form',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { minEnemiesWithViperStrikeAilment: 3 },
              applyBuff: {
                buffId: 'serpentForm',
                effect: { ailmentTickHeal: 1, counterAppliesVSAilment: true },
                duration: 4,
              },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Venomous Shield',
          'Each VS hit grants an absorb shield equal to 3% of the ailment\'s snapshot damage. Shield lasts 4s, refreshes on each VS hit.',
          { onHit: { absorbShield: { percentOfSnapshot: 3, duration: 4 } } },
          { 1: { percentOfSnapshot: 3 }, 2: { percentOfSnapshot: 5, dodgeWhileShielded: 3 } }),
        t1b: bh('Serpent\'s Recovery',
          'While any VS ailment is ticking on an enemy: heal for 0.5% max HP per tick.',
          { onAilmentTick: { healPercent: 0.5 } },
          { 1: { healPercent: 0.5 }, 2: { healPercent: 0.8, at3Ailments: { allResist: 5 } } }),
        t2b: bh('Toxin Endurance',
          'While 3+ enemies have VS ailments active: +8% damage reduction.',
          {
          conditionalMods: [{ condition: 'whileViperStrikeAilmentCount', threshold: 3, modifier: { damageReduction: 8 } }],
        },
          { 1: { damageReduction: 8 }, 2: { damageReduction: 12, dodgeChance: 5 } }),
        t3a: bh('Poison Resilience',
          '+3% damage reduction per VS ailment instance active across all enemies (max +15% at 5 instances).',
          {
          conditionalMods: [{ condition: 'perViperStrikeAilmentGlobal', modifier: { damageReduction: 3 }, maxStacks: 5 }],
        },
          {
          '1': { damageReduction: 3, maxStacks: 5 },
          '2': { damageReduction: 4, maxStacks: 5, weaponMastery: 3 },
        }),
        t3b: bh('Venom Shield',
          'Deep Wound no longer consumed for burst. Instead, while Deep Wound is active on target, you gain +10% dodge chance.',
          { comboStateReplace: { disableConsumption: 'deep_wound', whileActive: { playerDodgeChance: 10 } } },
          { 1: { playerDodgeChance: 10 }, 2: { playerDodgeChance: 15, incDamage: 5 } }),
        t3c: bh('Venom Barrier',
          'Each VS ailment tick generates an absorb shield equal to 2% of the tick\'s damage. Shield stacks up to 10% max HP. Decays at 3% per second when not refreshed.',
          { onAilmentTick: { absorbShieldFromDamage: 2, shieldCap: { percentMaxHP: 10 }, decayRate: 3 } },
          {
          '1': { absorbFromDamage: 2, capPercent: 10, decay: 3 },
          '2': { absorbFromDamage: 3, capPercent: 15, decay: 2 },
        }),
        t4b: bh('Serpent Sustain',
          'While Serpent Form is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'serpentForm', modifier: { dodgeChance: 10 } }],
        },
          { 1: { dodgeChance: 10 }, 2: { dodgeChance: 15, durationExtensionPerTick: 0.15, maxExtension: 2 } }),
      },
      t5a: {
        name: 'Venomous Sanctuary',
        description: 'While any VS ailment is active on any enemy: +10% damage reduction and +5% dodge chance. VS ailment ticks heal 0.5% max HP each. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          whileAnyVSAilmentActive: { damageReduction: 10, dodgeChance: 5 },
          ailmentTickHeal: 0.5,
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Venom Counter',
        description: 'Dodge counter-attacks from Serpent Reflexes (T2) deal damage equal to 20% of ALL active VS ailment snapshot damage combined. Counters can crit. You take +10% increased damage from all sources.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          counterDamageFromAilments: { percentOfTotalSnapshot: 20, canCrit: true },
          increasedDamageTaken: 10,
        },
      },
      t6Notable: {
        name: 'Phantom Venom',
        description: 'When you dodge: 20% chance to trigger Phantom Venom — a counter-attack that deals 120% of VS\'s fully-scaled damage and applies a Deep Wound at 100% potency. 8s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'vs_phantom_venom',
              trigger: 'onDodge',
              chance: 0.2,
              instantDamage: { scaleStat: 'viperStrikeDamage', scaleRatio: 1.2 },
              applyComboState: { id: 'deep_wound', potencyMult: 1 },
              internalCooldown: 8,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'SERPENT SOVEREIGN',
        description: 'Phantom Venom (T6) triggers on EVERY dodge (no chance roll, no ICD). Counter deals 60% instead of 120%. Each trigger applies VS ailment at 50% potency to ALL nearby enemies. VS cooldown increased by 2s (7s total). You can no longer directly cast VS — it only fires via Phantom Venom counters and normal rotation.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          phantomVenomOverride: { chance: 1, icd: 0, scaleRatio: 0.6, aoeAilment: { potency: 50 } },
          cooldownIncrease: 2,
          castRestriction: 'counterOnly',
        },
        synergy: ['vs_2_2_0', 'vs_2_5_1', 'vs_2_6_0'],
        antiSynergy: ['vs_2_1_0'],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// SHADOW MARK TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const SHADOW_MARK_TALENT_TREE = createTalentTree({
  skillId: 'dagger_shadow_mark', prefix: 'sm',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Hunter\'s Focus',
        description: 'When Shadow Mark hits a target below 50% HP: the mark becomes a Hunter\'s Mark — all per-skill bonuses are doubled AND the marked target takes +15% damage from all sources. +5% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_hunters_focus', trigger: 'onHit', chance: 1,
            conditionParam: { targetBelowHp: 50 },
            applyBuff: { buffId: 'huntersMark', effect: { damageMult: 1.15, critChanceBonus: 5 }, duration: 5 },
          }],
          incCritChance: 5,
        },
      },
      t4Notable: {
        name: 'Execute Setup',
        description: 'Shadow Mark\'s Assassinate bonus improved: instead of just -50% CD refund, Assassinate also gets guaranteed crit when consuming Shadow Mark. If target is below 30% HP: Assassinate deals +30% more damage on consume. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          comboStateEnhance: { shadow_mark: { guaranteedCrit: true } },
          conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 30, modifier: { incDamage: 30 } }],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Repeated Marks',
          'If Shadow Mark is cast on a target that already has an active Shadow Mark: the new mark\'s per-skill bonus is increased by +15% (multiplicative with the base bonus).',
          { comboStateEnhance: { shadow_mark: { incDamage: 15 } } },
          { 1: { incDamage: 15 }, 2: { incDamage: 25 } }),
        t1b: bh('Opportunistic Mark',
          'Shadow Mark\'s direct hit damage (50% WD) is increased by +15% for each active combo state on the player (Exposed, Deep Wound, etc.).',
          { conditionalMods: [{ condition: 'whileDeepWoundActive', modifier: { incDamage: 15 } }, { condition: 'shadowMomentumActive', modifier: { incDamage: 15 } }] },
          { 1: { incDamage: 15 }, 2: { incDamage: 20 } }),
        t2b: bh('Mark Precision',
          'While a Shadow Mark is active on any target: all your skills gain +5% crit chance.',
          { incCritChance: 5 },
          { 1: { incCritChance: 5 }, 2: { incCritChance: 8, weaponMastery: 3 } }),
        t3a: bh('Amplified Consume',
          '+20% damage on the skill that consumes Shadow Mark.',
          { comboStateEnhance: { shadow_mark: { incDamage: 20 } } },
          { 1: { incDamage: 20 }, 2: { incDamage: 30, incCritChance: 10 } }),
        t3b: bh('Mark Duration',
          'Shadow Mark duration increased by +2s (7s total).',
          { durationBonus: 2 },
          { 1: { durationBonus: 2 }, 2: { durationBonus: 3, incDamage: 10 } }),
        t3c: bh('Setup Mastery',
          'Shadow Mark\'s cooldown reduced by 1s (5s total).',
          { cooldownIncrease: -1 },
          { 1: { cooldownIncrease: -1 }, 2: { cooldownIncrease: -1.5, weaponMastery: 3 } }),
        t4b: bh('Hunter\'s Patience',
          'While Hunter\'s Mark (T2 upgraded mark) is active: +10% damage with all skills.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'huntersMark', modifier: { incDamage: 10 } }] },
          { 1: { incDamage: 10 }, 2: { incDamage: 15, durationBonus: 1 } }),
      },
      t5a: {
        name: 'Perfect Setup',
        description: 'Shadow Mark\'s per-skill bonuses are ALWAYS at Hunter\'s Mark level (doubled) regardless of target HP. Mark duration +2s. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { comboStateEnhance: { shadow_mark: { incDamage: 100 } }, durationBonus: 2, weaponMastery: 8 },
      },
      t5b: {
        name: 'Double Mark',
        description: 'Shadow Mark can mark 2 targets simultaneously (hits primary + 1 adjacent). If both marks are consumed within 3s of each other: the second consume deals +60% damage. If only 1 is consumed: SM cooldown +2s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { extraHits: 1, comboStateEnhance: { shadow_mark: { incDamage: 30 } } },
      },
      t6Notable: {
        name: 'Death Warrant',
        description: 'When Assassinate consumes Shadow Mark on a target below 25% HP: trigger Death Warrant — Assassinate deals an additional hit for 200% of its fully-scaled damage. 15s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_death_warrant', trigger: 'onHit', chance: 1,
            conditionParam: { targetBelowHp: 25 },
            instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 2 },
            internalCooldown: 15,
          }],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'ARCHITECT OF DEATH',
        description: 'Shadow Mark deals 0 direct damage (was 50% WD). Mark per-skill bonuses tripled. Death Warrant (T6) triggers at 35% HP instead of 25% and bonus hit increased to 300%. SM cooldown increased by 2s (8s total). All non-SM skills deal -10% damage when no mark is active on any target.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { directDamageOverride: 0, comboStateEnhance: { shadow_mark: { incDamage: 200 } }, cooldownIncrease: 2, globalIncDamage: -10 },
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Festering Mark',
        description: 'When Shadow Mark is consumed by any skill: apply a bonus ailment at 3x the consuming skill\'s normal potency. The ailment type matches the consuming skill\'s element. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: { comboStateEnhance: { shadow_mark: { ailmentPotency: 200 } }, ailmentDuration: 8 },
      },
      t4Notable: {
        name: 'Venom Setup',
        description: 'When Shadow Mark is consumed on a target with 5+ ailment stacks: enter Venom Setup state (4s). During this state: all ailment applications from any skill gain +25% potency AND have their duration refreshed to full. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_venom_setup', trigger: 'onHit', chance: 1,
            conditionParam: { minAilmentStacks: 5 },
            applyBuff: { buffId: 'venomSetup', effect: { critChanceBonus: 0 }, duration: 4 },
            internalCooldown: 12,
          }],
          ailmentPotency: 25, weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Plague Mark',
          'While Shadow Mark is active on a target: all ailments applied to that target gain +15% potency.',
          { ailmentPotency: 15 },
          { 1: { ailmentPotency: 15 }, 2: { ailmentPotency: 20, ailmentDuration: 8 } }),
        t1b: bh('Cursing Mark',
          'Shadow Mark also applies Cursed (1 stack, 3s) to the target. Cursed reduces target resists by 15.',
          { procs: [{ id: 'sm_cursing_mark', trigger: 'onHit', chance: 1, applyDebuff: { debuffId: 'cursed', stacks: 1, duration: 3 } }] },
          { 1: { stacks: 1 }, 2: { stacks: 2, applyWeakened: true } }),
        t2b: bh('Mark Amplifier',
          'While a target has Shadow Mark: ailments tick 15% faster on that target.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 20, ailmentPotency: 5 } }),
        t3a: bh('Lingering Curse',
          '+15% ailment duration on marked targets.',
          { ailmentDuration: 15 },
          { 1: { ailmentDuration: 15 }, 2: { ailmentDuration: 25 } }),
        t3b: bh('Potent Consume',
          'All mark consumptions also grant +20% ailment potency on the consuming skill, regardless of which skill consumes.',
          { comboStateEnhance: { shadow_mark: { ailmentPotency: 20 } } },
          { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 30, dotMultiplier: 10 } }),
        t3c: bh('Mark Efficiency',
          'Shadow Mark cooldown reduced by 0.5s for each ailment type active on the target when mark is applied.',
          { cooldownIncrease: -1 },
          { 1: { cooldownIncrease: -1 }, 2: { cooldownIncrease: -1.5, weaponMastery: 3 } }),
        t4b: bh('Setup Extension',
          'While Venom Setup is active: +10% ailment duration for all skills.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomSetup', modifier: { ailmentDuration: 10 } }] },
          { 1: { ailmentDuration: 10 }, 2: { ailmentDuration: 15 } }),
      },
      t5a: {
        name: 'Eternal Mark',
        description: 'Shadow Mark persists indefinitely until consumed (no duration limit). Marked targets take +10% ailment damage from all sources at all times. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { ailmentsNeverExpire: true, dotMultiplier: 10, weaponMastery: 8 },
      },
      t5b: {
        name: 'Explosive Mark',
        description: 'When Shadow Mark expires WITHOUT being consumed: all ailments on the target burst for 50% of remaining damage as instant hit. If mark IS consumed normally: no burst, but consuming skill gets +40% potency.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_explosive_mark', trigger: 'onAilmentExpire', chance: 1,
            detonateAilments: { percent: 50 },
          }],
          comboStateEnhance: { shadow_mark: { ailmentPotency: 40 } },
        },
      },
      t6Notable: {
        name: 'Pandemic Mark',
        description: 'When a Shadow Marked target dies: Shadow Mark spreads to 2 nearby enemies (3s duration) AND all ailments from the dead target spread to marked targets at 75% potency. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_pandemic_mark', trigger: 'onKill', chance: 1,
            spreadAilments: { durationRetain: 0.75, inheritPotency: true },
            internalCooldown: 10,
          }],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'PLAGUE ARCHITECT',
        description: 'Shadow Mark can mark up to 3 targets simultaneously (hits primary + 2 adjacent). All marked targets take +20% ailment damage. Pandemic Mark (T6) triggers on ANY marked target death (no ICD). SM deals 0 direct damage. SM cooldown increased by 3s (9s total). Non-marked targets take -15% ailment damage from you.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { extraHits: 2, directDamageOverride: 0, dotMultiplier: 20, cooldownIncrease: 3, globalAilmentPotencyPenalty: 15 },
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Shadow Warden',
        description: 'When you dodge while Shadow Mark is active on any enemy: trigger a counter-attack on the marked target for 80% of SM\'s fully-scaled damage. Also refreshes Shadow Mark\'s duration. +1 Fortify stack. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_shadow_warden', trigger: 'onDodge', chance: 1,
            instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.8 },
            fortifyOnProc: { stacks: 1, duration: 6, damageReduction: 3 },
          }],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Shadow Sentinel',
        description: 'When you dodge 3 attacks while Shadow Mark is active on an enemy: enter Shadow Sentinel (4s). During this state: +20% DR, all counter-attacks (from any source) also hit the marked target. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_shadow_sentinel', trigger: 'onDodge', chance: 1,
            conditionParam: { dodgesInWindow: 3, window: 5 },
            applyBuff: { buffId: 'shadowSentinel', effect: { damageMult: 1.0 }, duration: 4 },
            internalCooldown: 10,
          }],
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowSentinel', modifier: { damageReduction: 20 } }],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Threat Mark',
          'Shadow Marked targets deal 8% less damage to you.',
          { conditionalMods: [{ condition: 'targetHasActiveAilment', modifier: { damageReduction: 8 } }] },
          { 1: { damageReduction: 8 }, 2: { damageReduction: 12 } }),
        t1b: bh('Warding Presence',
          'While any Shadow Mark is active on an enemy: +5% dodge chance.',
          { conditionalMods: [{ condition: 'afterCast', modifier: { dodgeChance: 5 } }] },
          { 1: { dodgeChance: 5 }, 2: { dodgeChance: 8, allResist: 5 } }),
        t2b: bh('Sentinel\'s Focus',
          'While Shadow Mark is active: +10% damage reduction against the marked target\'s attacks.',
          { conditionalMods: [{ condition: 'afterCast', modifier: { damageReduction: 10 } }] },
          { 1: { damageReduction: 10 }, 2: { damageReduction: 15, incDamage: 5 } }),
        t3a: bh('Warden\'s Shield',
          '+5% damage reduction while any Shadow Mark is active (flat DR from mark presence).',
          { conditionalMods: [{ condition: 'afterCast', modifier: { damageReduction: 5 } }] },
          { 1: { damageReduction: 5 }, 2: { damageReduction: 8, weaponMastery: 3 } }),
        t3b: bh('Dodge Aura',
          'Shadow Mark\'s consumption bonus now also grants +10% dodge chance for 4s (on top of per-skill bonus).',
          { comboStateEnhance: { shadow_mark: { incDamage: 0 } }, conditionalMods: [{ condition: 'afterDodge', modifier: { dodgeChance: 10 } }] },
          { 1: { dodgeChance: 10 }, 2: { dodgeChance: 15 } }),
        t3c: bh('Mark Resilience',
          'Each time you dodge while a mark is active: heal 1.5% max HP.',
          { procs: [{ id: 'sm_mark_resilience', trigger: 'onDodge', chance: 1, healPercent: 1.5 }] },
          { 1: { healPercent: 1.5 }, 2: { healPercent: 2, weaponMastery: 3 } }),
        t4b: bh('Sentinel Extension',
          'While Shadow Sentinel is active: +10% dodge chance.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadowSentinel', modifier: { dodgeChance: 10 } }] },
          { 1: { dodgeChance: 10 }, 2: { dodgeChance: 15 } }),
      },
      t5a: {
        name: 'Eternal Warden',
        description: 'Shadow Mark never expires while you have 2+ Fortify stacks. Marked targets deal 15% less damage to you. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { conditionalMods: [{ condition: 'whileFortifyStacks', threshold: 2, modifier: { damageReduction: 15 } }], weaponMastery: 8 },
      },
      t5b: {
        name: 'Counter Mark',
        description: 'Shadow Warden counter-attacks (T2) deal 150% instead of 80% and can crit. Each counter-crit reduces SM cooldown by 1s. You take +10% damage from non-marked enemies.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { counterDamageMult: 1.5, counterCanCrit: true, increasedDamageTaken: 10 },
      },
      t6Notable: {
        name: 'Phantom Mark',
        description: 'When you dodge: 20% chance to trigger Phantom Mark — a free SM counter that marks the ATTACKER (not your current marked target) for 3s at 70% mark power. Does not replace existing mark. 8s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'sm_phantom_mark', trigger: 'onDodge', chance: 0.2,
            instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.7 },
            internalCooldown: 8,
          }],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'SHADOW WARDEN',
        description: 'Phantom Mark (T6) triggers on EVERY dodge (no chance, no ICD) at 40% mark power. All marked enemies deal 20% less damage to you. Shadow Mark deals 0 direct damage. SM cooldown increased by 2s (8s total). You take +15% damage from non-marked enemies.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { directDamageOverride: 0, counterHitDamage: 40, cooldownIncrease: 2, conditionalMods: [{ condition: 'afterCast', modifier: { damageReduction: 20 } }], increasedDamageTaken: 15 },
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// ASSASSINATE TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const ASSASSINATE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_assassinate', prefix: 'as',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Killing Intent',
        description: 'When Assassinate hits a target below 40% HP: guaranteed crit and +30% crit multiplier. If the target dies, gain Killing Intent (4s): next Assassinate\'s cooldown reduced by 3s.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_killing_intent',
              trigger: 'onHit',
              chance: 1,
              conditionParam: { targetBelowHp: 40 },
              effect: { guaranteedCrit: true, incCritMultiplier: 30 },
            },
            {
              id: 'as_killing_intent_kill',
              trigger: 'onKill',
              chance: 1,
              applyBuff: { buffId: 'killingIntent', effect: { skillCdReduction: { dagger_assassinate: 3 } }, duration: 4 },
            },
          ],
          incCritChance: 8,
        },
      },
      t4Notable: {
        name: 'Mark Exploiter',
        description: 'Exposed consumed by Assassinate grants +40% damage instead of +25%. Consuming Exposed also resets Stab\'s cooldown. If target also has Vulnerable: Assassinate deals +20% more on top. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          comboStateEnhance: { exposed: { bonusDamage: 40, onConsume: { resetCooldown: 'dagger_stab' } } },
          conditionalMods: [{ condition: 'whileDebuffActive', debuffId: 'vulnerable', modifier: { incDamage: 20 } }],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Patient Predator',
          'Assassinate gains +8% damage per second it spends on cooldown (max +64% at full 8s CD). Bonus resets on cast.',
          {
          conditionalMods: [{ condition: 'perSecondOnCooldown', modifier: { incDamage: 8 }, maxStacks: 8 }],
        },
          { 1: { incDamage: 8 }, 2: { incDamage: 10, incCritChancePerSecond: 3 } }),
        t1b: bh('Measured Strike',
          'If Assassinate is the first skill cast against a target (no prior hits from any skill), it deals +25% damage.',
          { conditionalMods: [{ condition: 'onFirstHitVsTarget', modifier: { incDamage: 25 } }] },
          {
          '1': { incDamage: 25 },
          '2': { incDamage: 35, applyOnFirstHit: { debuffId: 'exposed', duration: 3 } },
        }),
        t2b: bh('Executioner\'s Focus',
          'While Assassinate is on cooldown, all other dagger skills gain +3% crit chance. [TUNING: was +5%, reduced due to ~85% uptime]',
          {
          conditionalMods: [
            {
              condition: 'whileSkillOnCooldown',
              skillId: 'dagger_assassinate',
              modifier: { globalCritChance: 3 },
            },
          ],
        },
          { 1: { globalCritChance: 3 }, 2: { globalCritChance: 5, weaponMastery: 3 } }),
        t3a: bh('Coup de Grace',
          '+30% damage with Assassinate against targets below 25% HP.',
          {
          conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 25, modifier: { incDamage: 30 } }],
        },
          { 1: { incDamage: 30, threshold: 25 }, 2: { incDamage: 45, threshold: 30 } }),
        t3b: bh('Reset the Hunt',
          'When Assassinate kills a target, its cooldown is reduced by 2s.',
          { conditionalMods: [{ condition: 'onKill', modifier: { cooldownReduction: 2 } }] },
          { 1: { cooldownReduction: 2 }, 2: { cooldownReduction: 3, onCritKill: { fullReset: true } } }),
        t3c: bh('Predator\'s Patience',
          '+5% crit multiplier for each skill cast between Assassinate casts (max 4 stacks, +20%).',
          {
          conditionalMods: [{ condition: 'skillsCastSinceLast', modifier: { incCritMultiplier: 5 }, maxStacks: 4 }],
        },
          {
          '1': { incCritMultiplier: 5, maxStacks: 4 },
          '2': { incCritMultiplier: 7, maxStacks: 4, weaponMastery: 3 },
        }),
        t4b: bh('Killing Intent Extension',
          'While Killing Intent is active: +10% damage with all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'killingIntent', modifier: { incDamage: 10 } }],
        },
          { 1: { incDamage: 10 }, 2: { incDamage: 15, durationBonus: 2 } }),
      },
      t5a: {
        name: 'Surgical Execution',
        description: 'Assassinate deals +3% more damage for every 1% of target HP missing (at 50% HP = +150%, at 10% HP = +270%). Crit chance capped at 50%. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { executeScaling: { damagePerMissingHpPercent: 3 }, critChanceCap: 0.5, weaponMastery: 8 },
      },
      t5b: {
        name: 'All or Nothing',
        description: 'If Assassinate kills the target: gain All or Nothing (8s) — next Assassinate deals +100% damage and costs no cooldown. If Assassinate does NOT kill: +3s added to Assassinate\'s cooldown.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_all_or_nothing',
              trigger: 'onKill',
              chance: 1,
              applyBuff: { effect: { damageMult: 2, cooldownOverride: 0 }, duration: 8 },
            },
          ],
          onFailPenalty: { cooldownIncrease: 3 },
        },
      },
      t6Notable: {
        name: 'Perfect Kill',
        description: 'When Assassinate consumes BOTH Exposed AND Deep Wound in a single hit: trigger Perfect Kill — an additional hit for 300% of Assassinate\'s fully-scaled damage. 15s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_perfect_kill',
              trigger: 'onHit',
              chance: 1,
              conditionParam: { consumesBothStates: ['exposed', 'deep_wound'] },
              instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 3 },
              internalCooldown: 15,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'DEATH SENTENCE',
        description: 'Assassinate can only be cast when the target is below 35% HP (execute-locked). When it fires: deals 500% weapon damage baseline (replaces normal 220%). Perfect Kill (T6) bonus reduced from 300% to 150%. -25% damage with all other skills.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          executeLocked: { hpThreshold: 35 },
          weaponDamageOverride: 500,
          perfectKillOverride: { scaleRatio: 1.5 },
          globalIncDamage: -25,
        },
        synergy: ['as_0_1_0', 'as_0_3_0', 'as_0_5_0'],
        antiSynergy: ['as_0_1_1'],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Venom Burst',
        description: 'When Assassinate hits a target with 5+ ailment stacks: consume 3 stacks and deal instant damage equal to 60% of consumed stacks\' total snapshot damage. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_venom_burst',
              trigger: 'onHit',
              chance: 1,
              conditionParam: { minAilmentStacks: 5 },
              consumeAilmentStacks: 3,
              instantDamage: { scaleStat: 'consumedAilmentSnapshot', scaleRatio: 0.6 },
            },
          ],
          ailmentDuration: 8,
        },
      },
      t4Notable: {
        name: 'Venom Executioner',
        description: 'When Assassinate hits a target with 8+ ailment stacks: enter Venom Executioner state (5s). During this state: all ailment applications from any skill gain +30% potency AND have their duration refreshed to full. 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_venom_executioner',
              trigger: 'onHit',
              chance: 1,
              conditionParam: { minAilmentStacks: 8 },
              applyBuff: {
                buffId: 'venomExecutioner',
                effect: { globalAilmentPotency: 30, refreshAilmentDuration: true },
                duration: 5,
              },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Venom Reaper',
          'Assassinate deals +4% more damage for each ailment stack on the target. Stacks are NOT consumed — they persist after the hit.',
          { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 4 } }] },
          { 1: { incDamage: 4 }, 2: { incDamage: 6, incCritChancePerStack: 2 } }),
        t1b: bh('Lingering Execution',
          'Assassinate applies its signature ailment at 200% potency (double the normal 100% from element transform).',
          { ailmentPotencyMult: 2 },
          { 1: { ailmentPotencyMult: 2 }, 2: { ailmentPotencyMult: 2.5, ailmentDurationBonus: 50 } }),
        t2b: bh('Toxic Precision',
          'After Assassinate consumes ailment stacks (via Venom Burst), all other skills gain +10% ailment potency for 4s.',
          {
          conditionalMods: [{ condition: 'afterAilmentConsumption', modifier: { globalAilmentPotency: 10 }, duration: 4 }],
        },
          { 1: { globalAilmentPotency: 10, duration: 4 }, 2: { globalAilmentPotency: 15, duration: 5 } }),
        t3a: bh('Finishing Venom',
          '+20% ailment potency with Assassinate against targets below 50% HP.',
          {
          conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { ailmentPotency: 20 } }],
        },
          { 1: { ailmentPotency: 20, threshold: 50 }, 2: { ailmentPotency: 30, threshold: 60 } }),
        t3b: bh('Persistent Wounds',
          'Assassinate no longer consumes Deep Wound. Instead, while Deep Wound is active on target, Assassinate deals +50% more damage. Deep Wound persists.',
          { comboStateReplace: { disableConsumption: 'deep_wound', whileActive: { incDamage: 50 } } },
          { 1: { incDamage: 50 }, 2: { incDamage: 65, extendDuration: 2 } }),
        t3c: bh('Toxic Aftershock',
          'After casting Assassinate, all other skills apply ailments at +15% potency for 3s.',
          {
          conditionalMods: [{ condition: 'afterCast', window: 3, modifier: { globalAilmentPotency: 15 } }],
        },
          {
          '1': { globalAilmentPotency: 15, duration: 3 },
          '2': { globalAilmentPotency: 20, duration: 4, weaponMastery: 3 },
        }),
        t4b: bh('Executioner Sustain',
          'While Venom Executioner is active: +10% DoT multiplier.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'venomExecutioner', modifier: { dotMultiplier: 10 } }],
        },
          {
          '1': { dotMultiplier: 10 },
          '2': { dotMultiplier: 15, durationExtensionPerAilment: 0.4, maxExtension: 2 },
        }),
      },
      t5a: {
        name: 'Toxic Finisher',
        description: 'Assassinate\'s Venom Burst (T2) no longer has a stack threshold — it always consumes 3 stacks and bursts if 3+ exist. Burst damage increased from 60% to 80% of consumed snapshot. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { venomBurstOverride: { minStacks: 3, consumeCount: 3, scaleRatio: 0.8 }, weaponMastery: 8 },
      },
      t5b: {
        name: 'Pandemic Execution',
        description: 'Assassinate\'s Venom Burst consumes ALL ailment stacks (not just 3) and deals 100% of total consumed snapshot as burst. If fewer than 5 stacks consumed, Assassinate\'s cooldown increased by 2s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          venomBurstOverride: { consumeAll: true, scaleRatio: 1, minForNopenalty: 5, penaltyCdIncrease: 2 },
        },
      },
      t6Notable: {
        name: 'Plague Executioner',
        description: 'When Assassinate kills a target that has 5+ ailment stacks: ALL ailments on the dead target explode, dealing 50% of their remaining damage as AoE to all nearby enemies AND applying 1 stack of each ailment type to nearby targets. 12s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_plague_executioner',
              trigger: 'onKill',
              chance: 1,
              conditionParam: { minAilmentStacks: 5 },
              explodeAilments: { aoeScaleRatio: 0.5, applyPerType: 1 },
              internalCooldown: 12,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'PLAGUE REAPER',
        description: 'Assassinate consumes ALL ailment stacks on the target on every hit (always, not just via Venom Burst). Each consumed stack adds +5% to Assassinate\'s damage. Plague Executioner (T6) explosion triggers on EVERY Assassinate kill (no stack threshold). Assassinate\'s cooldown increased by 3s (11s total). All other skills\' ailment potency reduced by -20%.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          alwaysConsumeAllAilments: true,
          damagePerConsumedStack: 5,
          plagueExecutionerOverride: { minStacks: 0 },
          cooldownIncrease: 3,
          globalAilmentPotencyPenalty: -20,
        },
        synergy: ['as_1_1_0', 'as_1_5_1', 'as_1_6_0'],
        antiSynergy: ['as_1_3_1'],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Ambush Setup',
        description: 'If you dodge an attack while Assassinate is off cooldown (ready to fire): enter Ambush state (3s). During Ambush: next Assassinate deals +50% damage and is guaranteed to crit. Ambush is consumed when Assassinate fires. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_ambush_setup',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { whileSkillReady: 'dagger_assassinate' },
              applyBuff: { buffId: 'ambush', effect: { incDamage: 50, guaranteedCrit: true }, duration: 3 },
            },
          ],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Phantom Ambush',
        description: 'When you dodge while Ambush state (T2) is active: Ambush is UPGRADED to Phantom Ambush (3s). Phantom Ambush grants: Assassinate deals +80% damage, guaranteed crit, and Assassinate becomes invisible (cannot be dodged/blocked by enemies). 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_phantom_ambush',
              trigger: 'onDodge',
              chance: 1,
              conditionParam: { whileBuffActive: 'ambush' },
              upgradeBuff: {
                from: 'ambush',
                to: 'phantomAmbush',
                effect: { incDamage: 80, guaranteedCrit: true, cannotBeDodged: true },
                duration: 3,
              },
              internalCooldown: 10,
            },
          ],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Shadow Charge',
          'Each dodge stores 1 Shadow Charge (max 3). When Assassinate fires, consume all charges: +10% damage and +5% crit chance per charge consumed.',
          {
          chargeSystem: {
            gainOn: 'onDodge',
            maxCharges: 3,
            consumeOn: 'dagger_assassinate',
            perCharge: { incDamage: 10, incCritChance: 5 },
          },
        },
          {
          '1': { perCharge: { incDamage: 10, incCritChance: 5 }, maxCharges: 3 },
          '2': { perCharge: { incDamage: 15, incCritChance: 8 }, maxCharges: 4 },
        }),
        t1b: bh('Assassin\'s Resilience',
          'While Assassinate is on cooldown: +5% damage reduction.',
          {
          conditionalMods: [
            {
              condition: 'whileSkillOnCooldown',
              skillId: 'dagger_assassinate',
              modifier: { damageReduction: 5 },
            },
          ],
        },
          { 1: { damageReduction: 5 }, 2: { damageReduction: 8, lifeOnHit: 2 } }),
        t2b: bh('Patient Defender',
          'Each second Assassinate spends on cooldown grants +1% dodge chance (max +8% at full CD).',
          {
          conditionalMods: [{ condition: 'perSecondOnCooldown', modifier: { dodgeChance: 1 }, maxStacks: 8 }],
        },
          { 1: { dodgeChance: 1, maxStacks: 8 }, 2: { dodgeChance: 1.5, maxStacks: 8 } }),
        t3a: bh('Survivor\'s Instinct',
          '+20% damage with Assassinate while you are above 80% HP.',
          { conditionalMods: [{ condition: 'whileAboveHp', threshold: 80, modifier: { incDamage: 20 } }] },
          { 1: { incDamage: 20, threshold: 80 }, 2: { incDamage: 30, threshold: 70 } }),
        t3b: bh('Shadow Preparation',
          'After Assassinate fires, gain Shadow Preparation (3s): next dodge triggers a free Stab counter for 100% of Stab\'s fully-scaled damage.',
          {
          comboStateReplace: {
            afterCast: true,
            newState: 'shadow_preparation',
            effect: { counterOnDodge: true, counterSkill: 'dagger_stab', counterDamage: 100 },
            duration: 3,
          },
        },
          { 1: { counterDamage: 100, duration: 3 }, 2: { counterDamage: 130, duration: 4 } }),
        t3c: bh('Fortified Execution',
          '+5% damage with Assassinate per active Fortify stack (max +25% at 5 stacks).',
          { conditionalMods: [{ condition: 'perFortifyStack', modifier: { incDamage: 5 }, maxStacks: 5 }] },
          {
          '1': { incDamage: 5 },
          '2': { incDamage: 7, fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 } },
        }),
        t4b: bh('Ambush Sustain',
          'While Ambush or Phantom Ambush is active: +10% dodge chance.',
          {
          conditionalMods: [
            {
              condition: 'whileBuffActive',
              buffId: 'ambush', buffIds: ['ambush', 'phantomAmbush'],
              modifier: { dodgeChance: 10 },
            },
          ],
        },
          { 1: { dodgeChance: 10 }, 2: { dodgeChance: 15, durationBonus: 1 } }),
      },
      t5a: {
        name: 'Patient Shadow',
        description: 'Shadow Charges (T1a) also grant +3% damage reduction per charge (max +12% DR at 4 charges). Charges are no longer consumed on Assassinate — instead, each charge adds +8% damage to Assassinate permanently while held. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          shadowChargeOverride: { drPerCharge: 3, notConsumed: true, permanentDamagePerCharge: 8 },
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Shadow Executioner',
        description: 'When Assassinate fires with 3+ Shadow Charges: consume all charges and deal an additional hit for 50% of Assassinate\'s fully-scaled damage per charge consumed. You take +15% more damage for 3s after consuming charges.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_shadow_executioner',
              trigger: 'onCast',
              chance: 1,
              conditionParam: { minCharges: 3 },
              instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.5, perCharge: true },
            },
          ],
          onConsumePenalty: { increasedDamageTaken: 15, duration: 3 },
        },
      },
      t6Notable: {
        name: 'Reaper\'s Shadow',
        description: 'When you dodge while Assassinate is on cooldown: 15% chance to trigger Reaper\'s Shadow — a counter-attack that deals 150% of Assassinate\'s fully-scaled damage. Does NOT put Assassinate on cooldown (it\'s a free echo). 10s internal cooldown. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [
            {
              id: 'as_reapers_shadow',
              trigger: 'onDodge',
              chance: 0.15,
              conditionParam: { whileSkillOnCooldown: 'dagger_assassinate' },
              instantDamage: { scaleStat: 'assassinateDamage', scaleRatio: 1.5 },
              internalCooldown: 10,
            },
          ],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'SHADOW REAPER',
        description: 'Reaper\'s Shadow (T6) triggers on every dodge (no chance roll) but deals 80% instead of 150%. Assassinate\'s cooldown increased by 4s (12s total). You can no longer heal from any source while Assassinate is on cooldown.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          reapersOverride: { chance: 1, icd: 0, scaleRatio: 0.8 },
          cooldownIncrease: 4,
          noHealingWhileOnCooldown: true,
        },
        synergy: ['as_2_1_0', 'as_2_5_1', 'as_2_6_0'],
        antiSynergy: ['as_2_1_1'],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// CHAIN STRIKE TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const CHAIN_STRIKE_TALENT_TREE = createTalentTree({
  skillId: 'dagger_chain_strike', prefix: 'cs',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Chain Lightning',
        description: 'When Chain Strike chains to 3+ targets AND at least 2 chains crit: enter Chain Lightning state (4s). +25% crit mult and +1 chain count on all skills. +5% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_chain_lightning', trigger: 'onHit', chance: 1,
            conditionParam: { minTargetsHit: 3, minCritsInCast: 2 },
            applyBuff: { buffId: 'chainLightning', effect: { critMultiplierBonus: 25 }, duration: 4 },
          }],
          incCritChance: 5,
        },
      },
      t4Notable: {
        name: 'Surge Mastery',
        description: 'When Chain Strike chains to 3+ targets: Chain Surge also grants +15% crit chance for the chained skill. Crits on chained targets apply Exposed (2s). +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          comboStateEnhance: { chain_surge: { incCritChance: 15 } },
          procs: [{
            id: 'cs_surge_exposed', trigger: 'onCrit', chance: 1,
            conditionParam: { minTargetsHit: 3 },
            applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 },
          }],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Escalating Chains',
          'Each chain jump deals +12% more damage than the previous target. (Primary: base, Chain 1: +12%, Chain 2: +24%).',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { incDamage: 12 } }] },
          { 1: { incDamage: 12 }, 2: { incDamage: 18, incCritChance: 5 } }),
        t1b: bh('Chain Precision',
          'Each chain hit that crits increases the next chain\'s crit chance by +8%.',
          { incCritChance: 8 },
          { 1: { incCritChance: 8 }, 2: { incCritChance: 12 } }),
        t2b: bh('Arcing Strikes',
          'Chain Strike\'s primary target hit gains +10% damage for each chain that fires after it.',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { incDamage: 10 } }] },
          { 1: { incDamage: 10 }, 2: { incDamage: 15, incCritChance: 5 } }),
        t3a: bh('Precision Chains',
          '+8% crit multiplier per chain target hit (max +24% at 3 chains).',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { incCritMultiplier: 8 } }] },
          { 1: { incCritMultiplier: 8 }, 2: { incCritMultiplier: 12, weaponMastery: 3 } }),
        t3b: bh('Chain Momentum',
          'When Chain Strike hits 3+ targets: next skill in rotation gains +15% damage.',
          { conditionalMods: [{ condition: 'afterCastOnMultipleTargets', threshold: 3, modifier: { incDamage: 15 } }] },
          { 1: { incDamage: 15 }, 2: { incDamage: 22, cooldownReduction: 5 } }),
        t3c: bh('Relentless Chains',
          'Chain Strike kills reduce its cooldown by 0.5s per kill (kills from any chain target count).',
          { procs: [{ id: 'cs_relentless', trigger: 'onKill', chance: 1, resetCooldown: 'self' }] },
          { 1: { cooldownReduction: 8 }, 2: { cooldownReduction: 13 } }),
        t4b: bh('Chain Lightning Extension',
          'While Chain Lightning is active: +10% damage with all skills.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'chainLightning', modifier: { incDamage: 10 } }] },
          { 1: { incDamage: 10 }, 2: { incDamage: 15 } }),
      },
      t5a: {
        name: 'Perfect Arc',
        description: 'Chain Strike gains +1 permanent chain (3 base → 4). Each chain hit gains +5% crit chance (cumulative: 4th target = +20%). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { chainCount: 1, incCritChance: 10, weaponMastery: 8 },
      },
      t5b: {
        name: 'Chain Explosion',
        description: 'If Chain Strike\'s final chain target dies: the chain CONTINUES to a new target at +50% damage. Can chain indefinitely as long as each final target dies. If chain ends without a kill: +1.5s CD penalty.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_chain_explosion', trigger: 'onKill', chance: 1,
            freeCast: { skillId: 'dagger_chain_strike', damageMult: 1.5 },
          }],
          cooldownIncrease: 1.5,
        },
      },
      t6Notable: {
        name: 'Chain Annihilation',
        description: 'When Chain Strike kills 2+ targets across its chains: trigger a free Chain Strike at 100% damage with +2 bonus chains. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_annihilation', trigger: 'onMultiKillInCast', chance: 1,
            conditionParam: { minKills: 2 },
            freeCast: { skillId: 'dagger_chain_strike', damageMult: 1 },
            internalCooldown: 10,
          }],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'CHAIN MASTER',
        description: 'Chain Strike gains +2 permanent chains (4 base with T5A, or 4 base without). Each chain jump deals +20% more damage than the last (stacks with T1a). Chain Annihilation (T6) triggers on 1+ kills instead of 2+. CS cooldown increased by 2s (6s total). -15% damage with non-chain skills.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { chainCount: 2, conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { incDamage: 20 } }], cooldownIncrease: 2, singleTargetPenalty: 15 },
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Plague Chain',
        description: 'When CS chains through a target that already has 3+ ailment stacks: the chain gains +20% ailment potency for ALL subsequent targets. Stacks per ailmented target in the chain (max +60% at 3 ailmented targets). +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { ailmentPotency: 20 } }],
          ailmentDuration: 8,
        },
      },
      t4Notable: {
        name: 'Plague Highway',
        description: 'When CS carries ailments to 3+ targets via chain: enter Plague Highway (4s). During this state: ALL skills\' ailments are carried to 1 adjacent target at 25% potency on application. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_plague_highway', trigger: 'onHit', chance: 1,
            conditionParam: { minTargetsHit: 3 },
            applyBuff: { buffId: 'plagueHighway', effect: { damageMult: 1.0 }, duration: 4 },
            internalCooldown: 12,
          }],
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'plagueHighway', modifier: { ailmentPotency: 25 } }],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Contagion Chains',
          'Each chain jump CARRIES the previous target\'s ailments to the next target at 30% potency. Ailments accumulate as the chain progresses.',
          { spreadAilments: { durationRetain: 0.75, inheritPotency: true }, ailmentPotency: 10 },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 15, ailmentDuration: 5 } }),
        t1b: bh('Chain Infection',
          'CS ailments applied via chain carry gain +10% potency for each chain jump completed before reaching the target.',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { ailmentPotency: 10 } }] },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 15, ailmentDuration: 10 } }),
        t2b: bh('Viral Path',
          'Ailments carried by chains last 25% longer than directly applied ailments.',
          { ailmentDuration: 25 },
          { 1: { ailmentDuration: 25 }, 2: { ailmentDuration: 40, dotMultiplier: 10 } }),
        t3a: bh('Spreading Toxin',
          '+10% ailment potency per chain target hit by the most recent CS (max +30% at 3 chains).',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { ailmentPotency: 10 } }] },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 15, weaponMastery: 3 } }),
        t3b: bh('Contagion Surge',
          'Chain Surge replaced with Contagion Surge (3s): next skill\'s ailment also applies to 2 adjacent enemies at 40% potency.',
          { comboStateReplace: { from: 'chain_surge', to: 'contagion_surge', effect: { ailmentPotency: 40 }, duration: 3 } },
          { 1: { ailmentPotency: 40 }, 2: { ailmentPotency: 50 } }),
        t3c: bh('Chain Persistence',
          'Ailments applied by CS (directly or via chain carry) refresh ALL existing ailments on the target by 1s.',
          { procs: [{ id: 'cs_persistence', trigger: 'onHit', chance: 1, extendAllAilments: 1 }] },
          { 1: { extendAllAilments: 1 }, 2: { extendAllAilments: 1.5, weaponMastery: 3 } }),
        t4b: bh('Highway Extension',
          'While Plague Highway is active: +10% ailment duration for all skills.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'plagueHighway', modifier: { ailmentDuration: 10 } }] },
          { 1: { ailmentDuration: 10 }, 2: { ailmentDuration: 15 } }),
      },
      t5a: {
        name: 'Infinite Chain',
        description: 'Chain-carried ailments retain 50% potency instead of 30-40%. Carried ailments can themselves be carried on the next CS cast (multi-generation carry). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { ailmentPotencyMult: 50, weaponMastery: 8 },
      },
      t5b: {
        name: 'Detonation Chain',
        description: 'When CS chains through a target with 5+ ailment stacks: detonate 40% of that target\'s ailments as burst. Each target can detonate independently. Detonated targets lose 3 ailment stacks.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_detonation_chain', trigger: 'onHit', chance: 1,
            conditionParam: { minAilmentStacks: 5 },
            detonateAilments: { percent: 40 },
          }],
        },
      },
      t6Notable: {
        name: 'Pandemic Chain',
        description: 'When a chain target dies during CS: ALL of that target\'s ailments are carried to the next chain target at 100% potency (instead of the normal 30-40% carry rate). 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_pandemic_chain', trigger: 'onKill', chance: 1,
            spreadAilments: { durationRetain: 1, inheritPotency: true },
            internalCooldown: 10,
          }],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'PLAGUE CONDUIT',
        description: 'CS carries ALL ailments (from any source, not just CS ailments) between chain targets at 60% potency. Pandemic Chain (T6) triggers on ANY chain target death (no ICD). CS direct damage reduced by -30%. Non-chain skills\' ailment potency reduced by -15%.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: { ailmentPotencyMult: 60, incDamage: -30, globalAilmentPotencyPenalty: 15 },
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Chain Counter',
        description: 'When you dodge within 3s of casting CS: trigger a free chain counter starting from the dodged attacker, chaining to 2 nearby enemies at 70% of CS\'s fully-scaled damage. +1 Fortify per chain. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_chain_counter', trigger: 'onDodge', chance: 1,
            conditionParam: { withinWindowAfterCast: 3, skillId: 'dagger_chain_strike' },
            instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.7 },
            fortifyOnProc: { stacks: 1, duration: 6, damageReduction: 3 },
          }],
          allResist: 5,
        },
      },
      t4Notable: {
        name: 'Flash Step',
        description: 'When you dodge 2 attacks within 4s of casting CS: enter Flash Step (3s). During Flash Step: CS chains grant +5% dodge each AND apply Weakened (1s) to all chain targets. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_flash_step', trigger: 'onDodge', chance: 1,
            conditionParam: { dodgesInWindow: 2, afterCastWindow: 4, skillId: 'dagger_chain_strike' },
            applyBuff: { buffId: 'flashStep', effect: { damageMult: 1.0 }, duration: 3 },
            internalCooldown: 10,
          }],
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'flashStep', modifier: { dodgeChance: 5 } }],
          weaponMastery: 5,
        },
      },
      behaviorNodes: {
        t1a: bh('Evasive Chains',
          'Each chain target hit by CS grants +3% dodge chance for 3s (3 chains = +9%).',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { dodgeChance: 3 } }] },
          { 1: { dodgeChance: 3 }, 2: { dodgeChance: 4 } }),
        t1b: bh('Chain Recovery',
          'Heal for 1% max HP per chain target hit (3 chains = 3% HP).',
          { procs: [{ id: 'cs_recovery', trigger: 'onHit', chance: 1, healPercent: 1 }] },
          { 1: { healPercent: 1 }, 2: { healPercent: 1.5 } }),
        t2b: bh('Reactive Chains',
          'After dodging: next CS cast within 3s gains +1 chain and +10% damage.',
          { conditionalMods: [{ condition: 'afterDodge', modifier: { incDamage: 10 } }], chainCount: 1 },
          { 1: { incDamage: 10 }, 2: { incDamage: 15, cooldownIncrease: -1 } }),
        t3a: bh('Defensive Reach',
          '+4% damage reduction for 3s per chain target hit (max +12% at 3 chains).',
          { conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { damageReduction: 4 } }] },
          { 1: { damageReduction: 4 }, 2: { damageReduction: 5, weaponMastery: 3 } }),
        t3b: bh('Evasion Surge',
          'Chain Surge replaced with Evasion Surge (3s): +12% dodge chance.',
          { comboStateReplace: { from: 'chain_surge', to: 'evasion_surge', effect: { incDamage: 0 }, duration: 3 }, conditionalMods: [{ condition: 'afterCast', modifier: { dodgeChance: 12 } }] },
          { 1: { dodgeChance: 12 }, 2: { dodgeChance: 16 } }),
        t3c: bh('Chain Resilience',
          'While Chain Lightning state (T2 Predator) or Evasion Surge is active: +8% damage with CS.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'chainLightning', modifier: { incDamage: 8 } }] },
          { 1: { incDamage: 8 }, 2: { incDamage: 12, leechPercent: 5 } }),
        t4b: bh('Flash Persistence',
          'While Flash Step is active: +10% dodge chance.',
          { conditionalMods: [{ condition: 'whileBuffActive', buffId: 'flashStep', modifier: { dodgeChance: 10 } }] },
          { 1: { dodgeChance: 10 }, 2: { dodgeChance: 15 } }),
      },
      t5a: {
        name: 'Evasive Arc',
        description: 'Each CS cast grants +1 Fortify (3% DR, 6s). CS chains also grant +2% dodge per target (permanent while in combat, max +10%). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { fortifyOnHit: { stacks: 1, duration: 6, damageReduction: 3 }, conditionalMods: [{ condition: 'perTargetInLastCast', modifier: { dodgeChance: 2 } }], weaponMastery: 8 },
      },
      t5b: {
        name: 'Thunder Counter',
        description: 'Chain Counter (T2) chains to 4 targets instead of 2 at 100% damage (instead of 70%). Counter chain crits deal +30% more. You take +10% increased damage.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { counterDamageMult: 1.43, counterCanCrit: true, incCritMultiplier: 30, increasedDamageTaken: 10 },
      },
      t6Notable: {
        name: 'Phantom Chain',
        description: 'When you dodge: 18% chance to trigger Phantom Chain — a free CS counter that chains from the dodged attacker to 3 nearby enemies at 90% of CS\'s fully-scaled damage. 8s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_phantom_chain', trigger: 'onDodge', chance: 0.18,
            instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.9 },
            internalCooldown: 8,
          }],
          weaponMastery: 5,
        },
      },
      t7Keystone: {
        name: 'CHAIN PHANTOM',
        description: 'Phantom Chain (T6) triggers on EVERY dodge (no chance, no ICD) at 50% damage. Each trigger also grants +1 Fortify stack. CS cooldown increased by 2s (6s total). CS direct casts deal -15% damage.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          procs: [{
            id: 'cs_phantom_every', trigger: 'onDodge', chance: 1,
            instantDamage: { scaleStat: 'weaponDamage', scaleRatio: 0.5 },
            fortifyOnProc: { stacks: 1, duration: 6, damageReduction: 3 },
          }],
          cooldownIncrease: 2, incDamage: -15,
        },
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// BLADE WARD TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const BLADE_WARD_TALENT_TREE = createTalentTree({
  skillId: 'dagger_blade_ward', prefix: 'bw',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Riposte Fury',
        description: 'When a counter-hit during Blade Ward crits: enter Riposte Fury (3s). +30% crit multiplier for all skills. Counter-hits during Riposte Fury deal 100% WD instead of 50%. +5% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: { onCounterCrit: { buff: { id: 'riposte_fury', duration: 3, critMult: 30, counterDamage: 100 } } },
      },
      t4Notable: {
        name: 'Retaliator\'s Mark',
        description: 'Guarded bonus increased from +20% to +35%. When Guarded is consumed: also applies Vulnerable (3s) to the target. If at least 1 counter-hit crit during this ward: Guarded grants +15% crit chance as well. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          guardedEnhancement: {
            bonusDamage: 35,
            onConsume: { applyDebuff: { id: 'vulnerable', duration: 3 } },
            ifCounterCrit: { incCritChance: 15 },
          },
        },
      },
      behaviorNodes: {
        t1a: bh('Punishing Counter',
          'Counter-hits during Blade Ward gain +8% crit chance per counter triggered in this ward window (max 3 stacks, +24%).',
          {
          conditionalMods: [{ condition: 'perCounterHitInWard', modifier: { incCritChance: 8 }, maxStacks: 3 }],
        },
          {
          '1': { incCritChance: 8, maxStacks: 3 },
          '2': { incCritChance: 12, maxStacks: 3, critMultBonus: 20 },
        }),
        t1b: bh('Ward Aggression',
          'Each hit you receive during Blade Ward increases your next non-BW skill\'s damage by +10% (max 3 stacks, +30%).',
          {
          conditionalMods: [{ condition: 'perHitReceivedDuringWard', modifier: { nextSkillDamage: 10 }, maxStacks: 3 }],
        },
          {
          '1': { nextSkillDamage: 10, maxStacks: 3 },
          '2': { nextSkillDamage: 15, maxStacks: 3, nextSkillCritAtMax: 10 },
        }),
        t2b: bh('Calculated Defense',
          'Blade Ward counter-hit damage increases by +15% for each second remaining on Blade Ward\'s duration when the counter fires (3s ward = +45% on first counter, +30% on second, etc.).',
          { conditionalMods: [{ condition: 'perSecondRemainingOnWard', modifier: { incDamage: 15 } }] },
          { 1: { incDamage: 15 }, 2: { incDamage: 20, incCritChancePerSecond: 5 } }),
        t3a: bh('Predatory Ward',
          '+15% crit chance during Blade Ward.',
          { conditionalMods: [{ condition: 'whileWardActive', modifier: { incCritChance: 15 } }] }),
        t3b: bh('Counter Kill Reset',
          'If a counter-hit during Blade Ward kills an enemy: BW cooldown reduced by 1.5s.',
          {
          conditionalMods: [{ condition: 'counterHitKillDuringWard', modifier: { cdReduction: 1.5 }, maxTriggers: 1 }],
        }),
        t3c: bh('Momentum Shift',
          '+12% damage for 3s after Blade Ward expires.',
          { conditionalMods: [{ condition: 'afterWardExpires', modifier: { incDamage: 12 }, duration: 3 }] }),
        t4b: bh('Fury Extension',
          'While Riposte Fury (T2) is active: +12% damage with all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'riposte_fury', modifier: { incDamage: 12 } }],
        }),
      },
      t5a: {
        name: 'Steel Nerves',
        description: 'Counter-hits during Blade Ward always have at least 40% crit chance (floor, stacks with other sources). Counter-hit crits extend BW duration by 0.3s (max +1.5s total). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { counterHitCritFloor: 40, counterCritWardExtension: 0.3, maxExtension: 1.5, weaponMastery: 8 },
      },
      t5b: {
        name: 'Glass Parry',
        description: 'Counter-hits during Blade Ward deal 120% WD (instead of 50%). Each counter-hit that crits grants +10% crit multiplier for the rest of the ward (snowball). Ward DR reduced from 15% to 8%.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { counterHitDamage: 120, perCounterCrit: { critMult: 10 }, wardDROverride: 8 },
      },
      t6Notable: {
        name: 'Lethal Retaliation',
        description: 'When Blade Ward receives 4+ hits in one window AND at least 2 counter-hits crit: trigger Lethal Retaliation — a 250% WD counter-hit to the primary target, guaranteed crit. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { hitsReceivedInWard: 4, counterCritsInWard: 2 },
          effect: { weaponDamage: 250, guaranteedCrit: true, targetCount: 1 },
          icd: 12,
        },
      },
      t7Keystone: {
        name: 'BLADE HURRICANE',
        description: 'Counter-hits deal 100% WD (up from 50%). Lethal Retaliation (T6) triggers at 3+ hits / 1+ crits (instead of 4+/2+). Every counter-hit that crits applies Exposed (2s). BW cooldown increased by 3s (10s total). Ward DR reduced to 0%. -10% damage from non-counter sources.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          counterHitDamage: 100,
          t6Override: { hitsRequired: 3, critsRequired: 1 },
          onCounterCrit: { applyDebuff: { id: 'exposed', duration: 2 } },
          cdIncrease: 3,
          wardDR: 0,
          nonCounterDamagePenalty: -10,
        },
        synergy: [
          'bw_0_5_1 (Glass Parry — already reduces DR, might as well go to 0)',
          'bw_0_6_0 (Lethal Retaliation — easier trigger)',
        ],
        antiSynergy: [
          'bw_2_1_0 (Stalwart Guard — DR scaling is wasted at 0% base)',
          'bw_2_5_0 (Fortress — healing during ward matters less when DR is 0)',
        ],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Toxic Retaliation',
        description: 'When counter-hits during Blade Ward apply 3+ total ailment stacks (across all targets): enter Toxic Retaliation (4s). All ailment applications gain +20% potency. Counter-hits during Toxic Retaliation apply 1 additional ailment instance. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { counterHitAilmentStacksInWard: 3 },
          buff: { id: 'toxic_retaliation', duration: 4, ailmentPotency: 20, counterExtraAilment: 1 },
        },
      },
      t4Notable: {
        name: 'Plague Guard',
        description: 'When counter-hits accumulate 5+ ailment stacks on enemies during a single Blade Ward window: enter Plague Guard (4s). All ailment applications from any skill splash to 1 adjacent target at 30% potency. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { counterHitAilmentStacksInWard: 5 },
          buff: { id: 'plague_guard', duration: 4, ailmentSplash: { targets: 1, potency: 30 } },
          icd: 12,
        },
      },
      behaviorNodes: {
        t1a: bh('Venomous Counter',
          'Counter-hits during Blade Ward apply ailments at +25% potency (snapshots from BW\'s fully-scaled damage × 1.25).',
          { counterHitAilmentPotency: 25 },
          { 1: { ailmentPotencyBonus: 25 }, 2: { ailmentPotencyBonus: 40, ailmentDurationBonus: 1 } }),
        t1b: bh('Reactive Toxins',
          'Each hit you receive during Blade Ward extends all active ailments on the ATTACKER by 0.5s.',
          { perHitReceivedDuringWard: { extendAttackerAilments: 0.5 } },
          {
          '1': { ailmentExtension: 0.5 },
          '2': { ailmentExtension: 0.8, ailmentPotencyPerHit: 5, maxStacks: 3 },
        }),
        t2b: bh('Corrosive Counters',
          'Counter-hits during Blade Ward also apply Weakened (2s): target deals 10% less damage.',
          { counterHitDebuff: { id: 'weakened', duration: 2, damageReduction: 10 } },
          { 1: { weakenedDuration: 2 }, 2: { weakenedDuration: 3, resistReduction: 10 } }),
        t3a: bh('Lingering Venom',
          '+15% ailment duration for 3s after Blade Ward expires.',
          {
          conditionalMods: [{ condition: 'afterWardExpires', modifier: { ailmentDuration: 15 }, duration: 3 }],
        }),
        t3b: bh('Toxic Guard Combo',
          'COMBO ENHANCEMENT: Guarded (from 3+ hits during ward) also grants +25% ailment potency on the consuming skill.',
          { comboModification: { state: 'guarded', additionalEffect: { ailmentPotency: 25 } } }),
        t3c: bh('Counter Persistence',
          'Ailments applied by counter-hits refresh ALL existing ailments on the target by 1s.',
          { conditionalMods: [{ condition: 'onCounterHitAilment', modifier: { refreshAllAilments: 1 } }] }),
        t4b: bh('Guard Amplifier',
          'While Plague Guard is active: +12% ailment potency for all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'plague_guard', modifier: { ailmentPotency: 12 } }],
        }),
      },
      t5a: {
        name: 'Festering Counter',
        description: 'Counter-hit ailments apply at 2x base potency (multiplicative with T1a). Counter-hit ailments always apply regardless of ward state. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { counterHitAilmentMultiplier: 2, counterAilmentsIgnoreWardState: true, weaponMastery: 8 },
      },
      t5b: {
        name: 'Toxic Burst Ward',
        description: 'When Blade Ward expires: detonate 30% of all ailment stacks on enemies that were counter-hit during this ward as instant burst damage. If 0 counter-hits fired during ward: BW cooldown +2s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { onWardExpire: { detonateCounterHitAilments: 30 }, noCounterPenalty: { cdIncrease: 2 } },
      },
      t6Notable: {
        name: 'Plague Retaliation',
        description: 'When an enemy with 5+ ailment stacks attacks you during Blade Ward: all ailments on that enemy burst for 30% of remaining damage AND spread to all nearby enemies at 50% potency. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { attackerAilmentStacks: 5, duringWard: true },
          effect: { burstPercent: 30, spreadToNearby: true, spreadPotency: 50 },
          icd: 10,
        },
      },
      t7Keystone: {
        name: 'TOXIC GUARDIAN',
        description: 'Counter-hits deal 0 direct damage but apply ALL ailment types simultaneously (your element\'s ailment + all other types at 25% potency). Plague Retaliation (T6) triggers at 3+ stacks instead of 5+. Ward DR increased to 25% (from 15%). BW duration +2s (5s total). Direct damage with all skills reduced by -20%.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          counterHitDamage: 0,
          counterAppliesAllAilments: true,
          otherAilmentPotency: 25,
          t6Override: { stacksRequired: 3 },
          wardDR: 25,
          wardDurationBonus: 2,
          directDamagePenalty: -20,
        },
        synergy: [
          'bw_1_1_0 (Venomous Counter — enhanced potency on counter ailments)',
          'bw_1_6_0 (Plague Retaliation — easier trigger at 3+ stacks)',
        ],
        antiSynergy: [
          'bw_0_1_0 (Punishing Counter — counter crits worthless at 0 damage)',
          'bw_0_5_1 (Glass Parry — counter damage is 0, scaling wasted)',
        ],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Warden\'s Stance',
        description: 'When you dodge or block during Blade Ward: counter-hit is enhanced to 80% WD (instead of 50%), gain +1 Fortify stack, and Blade Ward duration refreshed by 1s. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: { duringWardOnDodgeOrBlock: { counterDamage: 80, fortify: 1, wardRefresh: 1 } },
      },
      t4Notable: {
        name: 'Iron Guard',
        description: 'When you dodge 2+ attacks during Blade Ward: enter Iron Guard (4s). +25% DR, counter-hits deal 100% WD, counter-hits apply Weakened (1s). 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { dodgesDuringWard: 2 },
          buff: {
            id: 'iron_guard',
            duration: 4,
            damageReduction: 25,
            counterDamage: 100,
            counterApplies: { debuffId: 'weakened', duration: 1 },
          },
          icd: 10,
        },
      },
      behaviorNodes: {
        t1a: bh('Stalwart Guard',
          'Blade Ward\'s base DR increased by +5% (20% total).',
          { wardDRBonus: 5 },
          { 1: { wardDRBonus: 5 }, 2: { wardDRBonus: 8, onCastFortify: 1 } }),
        t1b: bh('Recovering Blows',
          'Counter-hits during Blade Ward heal for 2% max HP per counter.',
          { counterHitHeal: { percentMaxHP: 2 } },
          { 1: { percentMaxHP: 2 }, 2: { percentMaxHP: 3, bonusHealAt3Counters: 5 } }),
        t2b: bh('Enduring Ward',
          'Each hit/dodge/block during Blade Ward extends its duration by 0.3s.',
          { perDefensiveEvent: { wardExtension: 0.3 } },
          { 1: { wardExtension: 0.3 }, 2: { wardExtension: 0.5, maxExtension: 2 } }),
        t3a: bh('Guarded Resilience',
          '+5% damage reduction for 3s after Blade Ward expires.',
          {
          conditionalMods: [{ condition: 'afterWardExpires', modifier: { damageReduction: 5 }, duration: 3 }],
        }),
        t3b: bh('Easy Guard',
          'COMBO ENHANCEMENT: Guarded threshold reduced from 3 hits to 2 hits. Guarded also heals 5% max HP when consumed.',
          {
          comboModification: { state: 'guarded', thresholdOverride: 2, onConsume: { healPercentMaxHP: 5 } },
        }),
        t3c: bh('Ward Evasion',
          '+10% dodge chance during Blade Ward.',
          { conditionalMods: [{ condition: 'whileWardActive', modifier: { dodgeChance: 10 } }] }),
        t4b: bh('Iron Persistence',
          'While Iron Guard is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'iron_guard', modifier: { dodgeChance: 10 } }],
        }),
      },
      t5a: {
        name: 'Fortress',
        description: 'Blade Ward heals 3% max HP on cast. BW cast grants +2 Fortify stacks. At 3+ Fortify: counter-hits heal for additional 2% max HP each. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          onCast: { healPercent: 3, fortify: 2 },
          atFortifyThreshold: { counterHitHealBonus: 2, threshold: 3 },
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Retaliating Guard',
        description: 'Counter-hits during Blade Ward deal 120% WD and can crit. Each counter-crit extends BW duration by 0.3s. You take +10% increased damage from all sources.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          counterHitDamage: 120,
          counterCanCrit: true,
          counterCritWardExtension: 0.3,
          damageTakenIncrease: 10,
        },
      },
      t6Notable: {
        name: 'Perfect Guard',
        description: 'When Blade Ward receives 5+ hits in one window: trigger Perfect Guard — a 200% WD counter-hit to ALL enemies, guaranteed crit. Heal 15% max HP. Gain 3 Fortify stacks. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { hitsReceivedInWard: 5 },
          effect: { weaponDamage: 200, guaranteedCrit: true, targetCount: 'all', healPercent: 15, fortify: 3 },
          icd: 12,
        },
      },
      t7Keystone: {
        name: 'ETERNAL GUARDIAN',
        description: 'Blade Ward becomes PERMANENT (no duration limit) at 10% DR (instead of 15%). Counter-hits deal 30% WD (instead of 50%). Perfect Guard (T6) triggers at 3+ hits instead of 5+. Cannot cast other defensive buffs (Shadow Covenant excluded). All offensive skill damage reduced by -10%.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          permanentWard: true,
          wardDROverride: 10,
          counterHitDamage: 30,
          t6Override: { hitsRequired: 3 },
          defensiveBuffLimit: true,
          offensiveDamagePenalty: -10,
        },
        synergy: [
          'bw_2_6_0 (Perfect Guard — 3+ hit threshold instead of 5+, fires frequently)',
          'bw_2_1_1 (Recovering Blows — permanent counter-hit healing, always active)',
        ],
        antiSynergy: [
          'bw_0_7_0 (BLADE HURRICANE — 0% DR makes permanent ward pointless for defense)',
          'bw_0_2_1 (Calculated Defense — permanent ward has no \'time remaining\' to scale with)',
        ],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// BLADE TRAP TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const BLADE_TRAP_TALENT_TREE = createTalentTree({
  skillId: 'dagger_blade_trap', prefix: 'bt',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Primed Detonation',
        description: 'When Blade Trap detonation crits AND trap was armed for 3+ seconds: enter Primed state (4s). Next Blade Trap placement is instant (no arm time) and deals +25% damage. +5% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { detonationCrit: true, minArmTime: 3 },
          buff: { id: 'primed', duration: 4, nextTrapInstant: true, trapDamageBonus: 25 },
        },
      },
      t4Notable: {
        name: 'Execution Trap',
        description: 'Blade Trap detonation creates Exposed (3s) on ALL enemies hit. Exposed from trap detonations grants +30% damage (instead of +25%). If the trigger enemy is below 30% HP: detonation deals +40% damage to that enemy. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          onDetonation: { applyToAll: { debuffId: 'exposed', duration: 3, enhancedBonus: 30 } },
          executeThreshold: 30, executeBonus: { hpPercent: 30, bonusDamage: 40 },
        },
      },
      behaviorNodes: {
        t1a: bh('Patience Rewarded',
          'Blade Trap\'s detonation damage increases by +5% for each second the trap has been armed (placed) before detonation. At 10s CD, max +50% if detonation happens just before refresh.',
          { conditionalMods: [{ condition: 'perSecondSinceArmed', modifier: { incDamage: 5 } }] },
          { 1: { incDamage: 5 }, 2: { incDamage: 8, incCritChancePerSecond: 2 } }),
        t1b: bh('Calculated Placement',
          'If Blade Trap is the last skill in your rotation to cast before cycling back, its detonation deals +20% damage.',
          { conditionalMods: [{ condition: 'lastSkillInCycle', modifier: { incDamage: 20 } }] },
          { 1: { incDamage: 20 }, 2: { incDamage: 30, incCritChance: 10 } }),
        t2b: bh('Sharpened Blades',
          'Blade Trap detonation deals +20% damage to the enemy that triggered it (the one that attacked).',
          { triggerTargetBonus: { incDamage: 20 } },
          { 1: { incDamage: 20 }, 2: { incDamage: 30, incCritChance: 10 } }),
        t3a: bh('Lethal Trap',
          '+15% crit chance on Blade Trap detonations.',
          { conditionalMods: [{ condition: 'onDetonation', modifier: { incCritChance: 15 } }] }),
        t3b: bh('Trap Efficiency',
          'If Blade Trap detonation kills an enemy: BT cooldown reduced by 2s.',
          { conditionalMods: [{ condition: 'detonationKill', modifier: { cdReduction: 2 } }] }),
        t3c: bh('Predator\'s Trap',
          '+10% damage on next skill after Blade Trap detonates.',
          {
          conditionalMods: [{ condition: 'afterDetonation', modifier: { nextSkillDamage: 10 }, duration: 3 }],
        }),
        t4b: bh('Primed Extension',
          'While Primed state (T2) is active: +10% damage with all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'primed', modifier: { incDamage: 10 } }],
        }),
      },
      t5a: {
        name: 'Reliable Detonation',
        description: 'Blade Trap detonation always crits. Crit multiplier on detonations reduced to 1.3x (instead of normal). Arm time reduced to 1.0s (from 1.5s). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          detonationGuaranteedCrit: true,
          detonationCritMultOverride: 1.3,
          armTimeOverride: 1,
          weaponMastery: 8,
        },
      },
      t5b: {
        name: 'Volatile Charge',
        description: 'Blade Trap detonation deals +80% damage. If detonation kills 0 enemies: BT cooldown increased by 3s (13s total for next cast). If detonation kills 1+: cooldown reduced by 2s (8s for next cast).',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          detonationDamageBonus: 80,
          onDetonationKill: { cdReduction: 2 },
          onDetonationNoKill: { cdIncrease: 3 },
        },
      },
      t6Notable: {
        name: 'Annihilation Trap',
        description: 'When Blade Trap detonation kills 2+ enemies: trigger a second free detonation at 100% WD (no arm time) hitting all enemies. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { detonationKills: 2 },
          effect: { freeDetonation: true, weaponDamage: 100, noArmTime: true, targetCount: 'all' },
          icd: 12,
        },
      },
      t7Keystone: {
        name: 'DEATH TRAP',
        description: 'Blade Trap can store 2 charges (place 2 traps simultaneously). Detonation hits from both traps stack. Annihilation Trap (T6) triggers on 1+ kills instead of 2+. BT cooldown increased by 4s (14s total per charge). Trap damage reduced by -20%. Non-trap skills deal -10% damage.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          trapCharges: 2,
          t6Override: { killsRequired: 1 },
          cdIncrease: 4,
          trapDamagePenalty: -20,
          nonTrapDamagePenalty: -10,
        },
        synergy: [
          'bt_0_6_0 (Annihilation Trap — easier echo trigger)',
          'bt_0_5_0 (Reliable Detonation — guaranteed crits on both traps)',
        ],
        antiSynergy: [
          'bt_1_7_0 (PLAGUE MINE — different trap identity)',
          'Non-trap skill damage penalty hurts skills-between-traps rotation',
        ],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Plague Trap',
        description: 'When Blade Trap detonates on an enemy with 3+ ailment stacks: enter Plague Trap state (4s). All ailment applications gain +25% potency. Trap ailments also apply Weakened (2s). +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { triggerTargetAilmentStacks: 3 },
          buff: {
            id: 'plague_trap',
            duration: 4,
            ailmentPotency: 25,
            trapAilmentDebuff: { id: 'weakened', duration: 2 },
          },
        },
      },
      t4Notable: {
        name: 'Toxic Detonation',
        description: 'When Blade Trap detonation applies ailments to 3+ enemies: enter Toxic Detonation (4s). During this state: all ailment applications from any source apply 1 extra instance AND ailment ticks deal +15% more damage. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { detonationAilmentTargets: 3 },
          buff: { id: 'toxic_detonation', duration: 4, extraAilmentInstance: 1, ailmentTickDamage: 15 },
          icd: 12,
        },
      },
      behaviorNodes: {
        t1a: bh('Toxic Payload',
          'Blade Trap detonation applies ailments at 2x potency (snapshots from 150% WD × 2.0 for ailment calculation).',
          { detonationAilmentPotencyMultiplier: 2 },
          {
          '1': { ailmentPotencyMultiplier: 2 },
          '2': { ailmentPotencyMultiplier: 2.5, ailmentDurationBonus: 1.5 },
        }),
        t1b: bh('Lingering Trap',
          'Blade Trap leaves a Toxic Zone (3s) after detonation. Enemies in the zone take ailment ticks at 20% of detonation ailment potency per second.',
          { postDetonationZone: { duration: 3, tickPotency: 20 } },
          { 1: { duration: 3, tickPotency: 20 }, 2: { duration: 4, tickPotency: 30 } }),
        t2b: bh('Saturating Blast',
          'Blade Trap detonation applies 1 additional ailment instance to each target hit.',
          { detonationExtraAilments: 1 },
          { 1: { extraAilments: 1 }, 2: { extraAilments: 2 } }),
        t3a: bh('Concentrated Toxin',
          '+20% ailment potency on Blade Trap detonations.',
          { conditionalMods: [{ condition: 'onDetonation', modifier: { ailmentPotency: 20 } }] }),
        t3b: bh('Trap Saturation',
          'COMBO ENHANCEMENT: Blade Trap detonation applies Saturated (4s) to all enemies hit, regardless of prior ailment state.',
          { comboModification: { onDetonation: { applyDebuff: { id: 'saturated', duration: 4 } } } }),
        t3c: bh('Persistent Toxins',
          'Ailments from Blade Trap detonation last 2s longer than normal.',
          { conditionalMods: [{ condition: 'trapAilments', modifier: { ailmentDurationBonus: 2 } }] }),
        t4b: bh('Detonation Amplifier',
          'While Toxic Detonation is active: +10% ailment potency for all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'toxic_detonation', modifier: { ailmentPotency: 10 } }],
        }),
      },
      t5a: {
        name: 'Deep Poison Trap',
        description: 'Blade Trap detonation ailments apply at 3x potency (up from 2-2.5x with T1a). Toxic Zone (T1b) duration doubled. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { detonationAilmentPotencyMultiplier: 3, toxicZoneDurationMultiplier: 2, weaponMastery: 8 },
      },
      t5b: {
        name: 'Plague Mine',
        description: 'Blade Trap detonation detonates ALL existing ailments on targets hit for 25% of remaining damage as instant burst. Detonated targets lose 50% of their ailment stacks. If detonation hits 0 ailmented targets: BT cooldown +3s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { onDetonation: { detonateAllAilments: 25, stackLoss: 50 }, noAilmentPenalty: { cdIncrease: 3 } },
      },
      t6Notable: {
        name: 'Pandemic Trap',
        description: 'When Blade Trap detonation kills an enemy with 5+ ailment stacks: ALL ailments from that enemy spread to ALL other enemies hit by the detonation at 75% potency. The trap also RE-ARMS instantly (1.5s arm time restarts). 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { detonationKillWithStacks: 5 },
          effect: { spreadAllAilments: true, spreadPotency: 75, rearmTrap: true },
          icd: 12,
        },
      },
      t7Keystone: {
        name: 'PLAGUE MINE',
        description: 'Blade Trap deals 0 direct damage. Detonation applies ailments at 4x potency to ALL enemies. Pandemic Trap (T6) triggers on ANY detonation kill (no stack requirement, no ICD). Trap persists between encounters (doesn\'t expire when pack dies). BT cooldown increased by 4s (14s total). All direct damage from non-trap skills reduced by -15%.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          trapDirectDamage: 0,
          detonationAilmentPotencyMultiplier: 4,
          t6Override: { killStacksRequired: 0, removeICD: true },
          trapPersistsBetweenEncounters: true,
          cdIncrease: 4,
          nonTrapDirectDamagePenalty: -15,
        },
        synergy: [
          'bt_1_1_0 (Toxic Payload — stacks with 4x for insane potency)',
          'bt_1_6_0 (Pandemic Trap — always triggers on kill)',
        ],
        antiSynergy: [
          'bt_0_7_0 (DEATH TRAP — different trap identity, direct damage vs ailment)',
          'Any build relying on BT\'s direct AoE damage',
        ],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Trap Shield',
        description: 'When Blade Trap detonation hits 2+ enemies: gain Trap Shield (3s). +15% DR. +1 Fortify per enemy hit by detonation (max 3 Fortify). +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { detonationTargets: 2 },
          buff: { id: 'trap_shield', duration: 3, damageReduction: 15, fortifyPerTarget: 1, maxFortify: 3 },
        },
      },
      t4Notable: {
        name: 'Fortified Blast',
        description: 'When you dodge 2+ attacks while a Blade Trap is armed: enter Fortified Blast (4s after detonation). Detonation damage +30%. Gain 3 Fortify stacks on detonation. All enemies hit are Weakened (2s). 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { dodgesWhileTrapArmed: 2 },
          buff: {
            id: 'fortified_blast',
            duration: 4,
            detonationDamageBonus: 30,
            fortify: 3,
            applyWeakened: { duration: 2 },
          },
          icd: 10,
        },
      },
      behaviorNodes: {
        t1a: bh('Reflex Trap',
          'When you dodge within 2s of placing Blade Trap: the trap arms instantly (no 1.5s delay).',
          { onDodgeAfterPlacement: { instantArm: true, window: 2 } },
          { 1: { instantArm: true }, 2: { instantArm: true, fortify: 1, window: 3 } }),
        t1b: bh('Trap Barrier',
          'While a Blade Trap is armed and waiting to detonate: +5% dodge chance.',
          { whileTrapArmed: { dodgeChance: 5 } },
          { 1: { dodgeChance: 5 }, 2: { dodgeChance: 8, damageReduction: 5 } }),
        t2b: bh('Reactive Placement',
          'After dodging: next Blade Trap placement within 3s has -50% arm time (0.75s instead of 1.5s).',
          { onDodge: { nextTrapArmTimeReduction: 50, window: 3 } },
          { 1: { armTimeReduction: 50 }, 2: { armTimeReduction: 100, detonationDamageBonus: 10 } }),
        t3a: bh('Blast Cover',
          '+8% DR for 3s after Blade Trap detonation.',
          {
          conditionalMods: [{ condition: 'afterDetonation', modifier: { damageReduction: 8 }, duration: 3 }],
        }),
        t3b: bh('Trap Ward',
          'COMBO MODIFICATION: Blade Trap detonation now grants Guarded (3s, +20% damage) to the player, as if you received 3+ hits during a Blade Ward window.',
          {
          comboModification: { onDetonation: { grantBuff: { id: 'guarded', duration: 3, bonusDamage: 20 } } },
        }),
        t3c: bh('Trap Evasion',
          '+8% dodge chance for 3s after placing Blade Trap.',
          {
          conditionalMods: [{ condition: 'afterTrapPlacement', modifier: { dodgeChance: 8 }, duration: 3 }],
        }),
        t4b: bh('Blast Persistence',
          'While Trap Shield (T2) is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'trap_shield', modifier: { dodgeChance: 10 } }],
        }),
      },
      t5a: {
        name: 'Iron Trap',
        description: 'Blade Trap detonation always grants Trap Shield (no 2+ target requirement). Trap Shield also heals 3% max HP per Fortify gained. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { trapShieldAlwaysTriggers: true, perFortifyHeal: 3, weaponMastery: 8 },
      },
      t5b: {
        name: 'Mirror Mine',
        description: 'Blade Trap detonation damage increased by +50%. Detonation also triggers a counter-hit at 80% WD on the enemy that triggered it. If trap detonates with 0 enemies hit (wasted): BT cooldown +3s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          detonationDamageBonus: 50,
          onDetonation: { counterHit: { targetCount: 1, weaponDamage: 80 } },
          noTargetPenalty: { cdIncrease: 3 },
        },
      },
      t6Notable: {
        name: 'Mirror Trap',
        description: 'When you dodge: 15% chance to trigger Mirror Trap — instantly detonate a free trap at the dodged attacker\'s location for 120% WD AoE. Grants +2 Fortify. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          onDodge: { chance: 15, effect: { freeDetonation: true, weaponDamage: 120, aoe: true, fortify: 2 } },
          icd: 10,
        },
      },
      t7Keystone: {
        name: 'TRAP MASTER',
        description: 'Mirror Trap (T6) triggers on EVERY dodge (no chance, no ICD) at 60% WD. Each trigger grants +1 Fortify. Blade Trap arm time increased to 3s (from 1.5s). BT direct placement detonation damage -25%. Trap persists between encounters.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          t6Override: { removeChance: true, removeICD: true, weaponDamage: 60 },
          perTriggerFortify: 1,
          armTimeIncrease: 3,
          placementDetonationPenalty: -25,
          trapPersistsBetweenEncounters: true,
        },
        synergy: [
          'bt_2_6_0 (Mirror Trap — always triggers)',
          'bt_2_3_2 (Trap Evasion — more dodge = more mirror traps)',
        ],
        antiSynergy: [
          'bt_0_1_0 (Patience Rewarded — longer arm time helps BUT placed traps do less damage)',
          'bt_0_7_0 (DEATH TRAP — different trap identity, placement vs reactive)',
        ],
      },
    },
  ],
});


// ════════════════════════════════════════════════════════════
// SHADOW DASH TALENT TREE (Dagger v2)
// ════════════════════════════════════════════════════════════

export const SHADOW_DASH_TALENT_TREE = createTalentTree({
  skillId: 'dagger_shadow_dash', prefix: 'sd',
  branches: [
    // --- Predator ---
    {
      name: 'Predator',
      description: 'Predator',
      t2Notable: {
        name: 'Predator\'s Rush',
        description: 'When Shadow Dash hits a target AND the next skill (empowered by Shadow Momentum) crits: enter Predator\'s Rush (3s). +25% crit multiplier for all skills. Shadow Dash CD reduced by 2s (3s effective for next SD). +5% crit chance.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { dashHit: true, nextSkillCrits: true },
          buff: { id: 'predators_rush', duration: 3, critMult: 25, sdCDReduction: 2 },
        },
      },
      t4Notable: {
        name: 'Hunter\'s Dash',
        description: 'Shadow Momentum enhanced: also grants +25% crit chance on the empowered skill. If the empowered skill crits AND kills: enter Hunter\'s Dash (4s). Next SD deals +50% damage, applies Vulnerable (3s), and has 0 cooldown (instant reset). 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          shadowMomentumEnhancement: { incCritChance: 25 },
          triggerCondition: { empoweredSkillCritAndKill: true },
          buff: { id: 'hunters_dash', duration: 4, nextSDDamage: 50, applyVulnerable: 3, sdCDReset: true },
          icd: 12,
        },
      },
      behaviorNodes: {
        t1a: bh('Ambush Strike',
          'Shadow Dash\'s direct hit gains +15% crit chance. If Shadow Dash is the first skill cast in a new encounter (fresh pack/boss): guaranteed crit.',
          {
          incCritChance: 15,
          conditionalMods: [{ condition: 'firstSkillInEncounter', modifier: { guaranteedCrit: true } }],
        },
          {
          '1': { incCritChance: 15, firstEncounterGuaranteedCrit: true },
          '2': {
            incCritChance: 20,
            firstEncounterGuaranteedCrit: true,
            firstEncounterApply: { debuffId: 'exposed', duration: 3 },
          },
        }),
        t1b: bh('Momentum Builder',
          'The skill cast immediately after Shadow Dash (empowered by Shadow Momentum) gains +12% crit chance.',
          { shadowMomentumCritBonus: 12 },
          { 1: { incCritChance: 12 }, 2: { incCritChance: 18, critMult: 10 } }),
        t2b: bh('Closing Speed',
          'Shadow Dash deals +15% more damage for each of your other skills currently on cooldown when SD is cast (max +45% at 3 other skills on CD).',
          {
          conditionalMods: [{ condition: 'perOtherSkillOnCooldown', modifier: { incDamage: 15 }, maxStacks: 3 }],
        },
          {
          '1': { incDamage: 15, maxStacks: 3 },
          '2': { incDamage: 20, maxStacks: 3, incCritChancePerStack: 3 },
        }),
        t3a: bh('Ambush Mastery',
          '+15% crit chance for 2s after Shadow Dash.',
          { conditionalMods: [{ condition: 'afterDash', modifier: { incCritChance: 15 }, duration: 2 }] }),
        t3b: bh('Kill Rush',
          'If the skill empowered by Shadow Momentum kills an enemy: Shadow Dash cooldown reduced by 2s.',
          { conditionalMods: [{ condition: 'empoweredSkillKill', modifier: { sdCDReduction: 2 } }] }),
        t3c: bh('Aggressive Momentum',
          'Shadow Momentum also grants +10% damage to the empowered skill (on top of CD acceleration).',
          {
          conditionalMods: [{ condition: 'shadowMomentumActive', modifier: { empoweredSkillDamage: 10 } }],
        }),
        t4b: bh('Rush Extension',
          'While Predator\'s Rush (T2) is active: +10% damage with all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'predators_rush', modifier: { incDamage: 10 } }],
        }),
      },
      t5a: {
        name: 'Relentless Pursuit',
        description: 'Shadow Momentum also grants +15% crit chance AND +15% crit multiplier on the empowered skill. Shadow Dash CD reduced by 1s (4s base). +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { shadowMomentumBonus: { incCritChance: 15, critMult: 15 }, sdCDReduction: 1, weaponMastery: 8 },
      },
      t5b: {
        name: 'All-In Rush',
        description: 'Shadow Momentum grants +40% damage to the empowered skill. If the empowered skill kills: Shadow Dash cooldown fully reset (0s). If the empowered skill does NOT kill: Shadow Dash CD increased by 2s (7s total for next cast).',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          shadowMomentumDamageBonus: 40,
          onEmpoweredKill: { sdCDReset: true },
          onEmpoweredNoKill: { sdCDIncrease: 2 },
        },
      },
      t6Notable: {
        name: 'Perfect Ambush',
        description: 'When the skill empowered by Shadow Momentum crits AND kills: that skill\'s damage is repeated as a second free hit at 150% of the original damage. 12s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { empoweredSkillCritAndKill: true },
          effect: { echoHit: true, echoDamagePercent: 150 },
          icd: 12,
        },
      },
      t7Keystone: {
        name: 'SHADOW ASSASSIN',
        description: 'Shadow Dash CD reduced to 3s. Shadow Momentum empowers the next TWO skills (instead of 1) — both get CD acceleration AND Predator bonuses. Perfect Ambush (T6) ICD reduced to 10s. SD direct damage reduced by -30%. Non-empowered skills deal -15% damage.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          sdCDOverride: 3,
          shadowMomentumTargets: 2,
          t6Override: { icd: 10 },
          sdDirectDamagePenalty: -30,
          nonEmpoweredDamagePenalty: -15,
        },
        synergy: [
          'sd_0_6_0 (Perfect Ambush — double chance to trigger from 2 empowered skills)',
          'sd_0_5_1 (All-In Rush — more empowered skills = more kill chances for reset)',
        ],
        antiSynergy: [
          'Rotations with only 2 damage skills (one always unempowered)',
          'sd_0_2_1 (Closing Speed — at 3s CD, fewer skills will be on cooldown when SD fires)',
        ],
      },
    },
    // --- Plague ---
    {
      name: 'Plague',
      description: 'Plague',
      t2Notable: {
        name: 'Plague Rush',
        description: 'When Shadow Dash passes through 2+ enemies that have active ailments: enter Plague Rush (4s). All ailment applications gain +20% potency. SD\'s direct hit also applies 1 extra ailment instance. +8% ailment duration.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { passThroughAilmentedTargets: 2 },
          buff: { id: 'plague_rush', duration: 4, ailmentPotency: 20, sdExtraAilment: 1 },
        },
      },
      t4Notable: {
        name: 'Plague Wake',
        description: 'When Shadow Dash passes through 3+ enemies: leave a Plague Wake ground zone along the dash path (3s). Enemies in the wake take ailment ticks at 25% of SD\'s ailment potency per second. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { passThroughTargets: 3 },
          groundZone: { duration: 3, tickPotencyPercent: 25 },
          icd: 10,
        },
      },
      behaviorNodes: {
        t1a: bh('Toxic Trail',
          'Shadow Dash applies your ailment to ALL enemies between you and the target (pass-through) at 60% of SD\'s ailment potency.',
          { passThroughAilment: { potencyPercent: 60 } },
          { 1: { potencyPercent: 60 }, 2: { potencyPercent: 80, durationBonus: 1 } }),
        t1b: bh('Momentum Infection',
          'The skill empowered by Shadow Momentum gains +20% ailment potency.',
          { shadowMomentumAilmentPotency: 20 },
          { 1: { ailmentPotency: 20 }, 2: { ailmentPotency: 30, ailmentDuration: 1 } }),
        t2b: bh('Infectious Speed',
          'Each unique enemy passed through by Shadow Dash extends all YOUR active ailments on ALL targets by 0.3s.',
          { perPassThroughTarget: { extendAllAilments: 0.3 } },
          {
          '1': { extendAllAilments: 0.3 },
          '2': { extendAllAilments: 0.5, ailmentPotencyPerTarget: 5, maxStacks: 3 },
        }),
        t3a: bh('Toxic Momentum',
          '+15% ailment potency for 3s after Shadow Dash.',
          { conditionalMods: [{ condition: 'afterDash', modifier: { ailmentPotency: 15 }, duration: 3 }] }),
        t3b: bh('Contagion Dash',
          'COMBO ENHANCEMENT: Shadow Momentum also grants +20% ailment potency on the empowered skill.',
          { comboModification: { state: 'shadow_momentum', additionalEffect: { ailmentPotency: 20 } } }),
        t3c: bh('Lingering Speed',
          'Ailments applied by Shadow Dash (direct hit or pass-through) last 2s longer.',
          { conditionalMods: [{ condition: 'sdAilments', modifier: { ailmentDurationBonus: 2 } }] }),
        t4b: bh('Rush Amplifier',
          'While Plague Rush (T2) is active: +10% ailment duration for all skills.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'plague_rush', modifier: { ailmentDuration: 10 } }],
        }),
      },
      t5a: {
        name: 'Persistent Trail',
        description: 'Shadow Dash pass-through ailments apply at full potency (100% instead of 60-80%). Pass-through ailments also refresh ALL existing ailments on each passed enemy by 2s. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { passThroughPotency: 100, passThroughRefreshAllAilments: 2, weaponMastery: 8 },
      },
      t5b: {
        name: 'Detonating Dash',
        description: 'Shadow Dash pass-through detonates 20% of existing ailments on each passed enemy as instant burst damage. Passed enemies lose 1 ailment stack each. If SD passes through 0 enemies: SD cooldown +2s.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          passThroughDetonation: { burstPercent: 20, stackLoss: 1 },
          noPassThroughPenalty: { cdIncrease: 2 },
        },
      },
      t6Notable: {
        name: 'Pandemic Dash',
        description: 'When Shadow Dash kills an enemy (direct hit or pass-through): ALL ailments from the killed enemy spread to ALL enemies within pass-through range at 75% potency. 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { sdKill: true },
          effect: { spreadAllAilments: true, spreadPotency: 75, spreadRange: 'passThroughRange' },
          icd: 10,
        },
      },
      t7Keystone: {
        name: 'PLAGUE RUNNER',
        description: 'Shadow Dash passes through ALL enemies (no limit). Pass-through ailments apply at 120% potency. Pandemic Dash (T6) triggers on ANY SD kill (no ICD). SD direct hit damage reduced to 0. Non-dash skills\' ailment potency reduced by -15%. SD CD increased by 2s (7s total).',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          passThroughUnlimited: true,
          passThroughPotency: 120,
          t6Override: { removeICD: true },
          sdDirectDamage: 0,
          nonDashAilmentPotencyPenalty: -15,
          cdIncrease: 2,
        },
        synergy: [
          'sd_1_1_0 (Toxic Trail — pass-through at 120%)',
          'sd_1_6_0 (Pandemic Dash — always triggers on kill)',
        ],
        antiSynergy: [
          'Builds relying on SD\'s 80% WD direct damage',
          'Non-pass-through heavy rotations (single-target focused)',
        ],
      },
    },
    // --- Ghost ---
    {
      name: 'Ghost',
      description: 'Ghost',
      t2Notable: {
        name: 'Shadow Phase',
        description: 'When you dodge within 2s of Shadow Dash: enter Shadow Phase (3s). +20% dodge chance. Counter-attacks during Shadow Phase deal 80% of SD\'s fully-scaled damage. +1 Fortify. +5 all resist.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { dodgeWithinWindow: { afterSkill: 'shadow_dash', window: 2 } },
          buff: { id: 'shadow_phase', duration: 3, dodgeChance: 20, counterDamage: 80, fortify: 1 },
        },
      },
      t4Notable: {
        name: 'Phantom Dash',
        description: 'When you dodge 2+ attacks within 3s of Shadow Dash: enter Phantom Dash (3s). +30% dodge chance, +15% DR. Next SD cast has 0 CD (instant reset). 10s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          triggerCondition: { dodgesAfterDash: 2, window: 3 },
          buff: { id: 'phantom_dash', duration: 3, dodgeChance: 30, damageReduction: 15, nextSDFree: true },
          icd: 10,
        },
      },
      behaviorNodes: {
        t1a: bh('Phase Step',
          'Shadow Dash grants 100% dodge chance for 0.5s after casting (guaranteed dodge window).',
          { postCastDodgeWindow: { duration: 0.5, dodgeChance: 100 } },
          { 1: { duration: 0.5 }, 2: { duration: 0.8, fortify: 1 } }),
        t1b: bh('Evasive Arrival',
          'After Shadow Dash: +8% dodge chance for 3s.',
          { postDash: { dodgeChance: 8, duration: 3 } },
          { 1: { dodgeChance: 8, duration: 3 }, 2: { dodgeChance: 12, duration: 4, allResist: 5 } }),
        t2b: bh('Phasing Momentum',
          'Shadow Momentum also grants +10% dodge chance to the empowered skill\'s cast window (2s).',
          { shadowMomentumDodge: 10 },
          { 1: { dodgeChance: 10 }, 2: { dodgeChance: 15, onDodgeDuringEmpowered: { sdCDReduction: 1 } } }),
        t3a: bh('Phase Shield',
          '+5% DR for 3s after Shadow Dash.',
          { conditionalMods: [{ condition: 'afterDash', modifier: { damageReduction: 5 }, duration: 3 }] }),
        t3b: bh('Dash Reflex',
          'COMBO ENHANCEMENT: Shadow Momentum also grants +15% dodge chance for 3s on the player.',
          {
          comboModification: { state: 'shadow_momentum', additionalEffect: { dodgeChance: 15, duration: 3 } },
        }),
        t3c: bh('Phasing Recovery',
          'Shadow Dash heals 2% max HP on cast.',
          { conditionalMods: [{ condition: 'onDashCast', modifier: { healPercentMaxHP: 2 } }] }),
        t4b: bh('Phase Persistence',
          'While Shadow Phase (T2) is active: +10% dodge chance.',
          {
          conditionalMods: [{ condition: 'whileBuffActive', buffId: 'shadow_phase', modifier: { dodgeChance: 10 } }],
        }),
      },
      t5a: {
        name: 'Evasive Dasher',
        description: 'Shadow Dash grants +2 Fortify stacks on cast. Phase Step (T1a) window extended to 1.2s. Each dodge during Phase Step window heals 2% max HP. +8% weapon mastery.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: { onDash: { fortify: 2 }, phaseStepDurationOverride: 1.2, phaseStepDodgeHeal: 2, weaponMastery: 8 },
      },
      t5b: {
        name: 'Counter Dash',
        description: 'Shadow Phase counter-attacks (T2) deal 150% WD instead of 80% and can crit. Counter-crits during Shadow Phase reset SD cooldown. You take +10% increased damage outside of Shadow Phase.',
        nodeType: 'keystoneChoice',
        maxRank: 1,
        modifier: {
          shadowPhaseCounterDamage: 150,
          counterCanCrit: true,
          counterCritSDReset: true,
          damageTakenOutsidePhase: 10,
        },
      },
      t6Notable: {
        name: 'Phantom Step',
        description: 'When you dodge: 15% chance to trigger a free Shadow Dash to the nearest enemy at 80% WD. Grants full Shadow Momentum (2s). 8s ICD. +5% weapon mastery.',
        nodeType: 'notable',
        maxRank: 1,
        modifier: {
          onDodge: { chance: 15, effect: { freeDash: true, weaponDamage: 80, grantShadowMomentum: true } },
          icd: 8,
        },
      },
      t7Keystone: {
        name: 'SHADOW STEP',
        description: 'Phantom Step (T6) triggers on EVERY dodge (no chance, no ICD) at 40% WD. Each free dash grants Shadow Momentum. SD direct cast damage -20%. Non-dash skills deal -10% damage without Shadow Momentum active. Phase Step (T1a) window applies to every free dash.',
        nodeType: 'keystone',
        maxRank: 1,
        modifier: {
          t6Override: { removeChance: true, removeICD: true, weaponDamage: 40 },
          freeDashGrantsMomentum: true,
          sdDirectDamagePenalty: -20,
          nonMomentumDamagePenalty: -10,
          phaseStepOnFreeDash: true,
        },
        synergy: [
          'sd_2_6_0 (Phantom Step — always triggers)',
          'sd_2_1_0 (Phase Step — each free dash gets dodge window)',
          'sd_2_5_1 (Counter Dash — counter-crits trigger more free dashes → more momentum)',
        ],
        antiSynergy: [
          'sd_0_2_1 (Closing Speed — frequent dashes mean fewer skills on CD when SD fires)',
          'Slow, infrequent dash rotations (T7 wants constant dodge events)',
        ],
      },
    },
  ],
});

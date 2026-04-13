// ============================================================
// Idle Exile — Staff v2 Mass Sacrifice Talent Tree
// 3 branches × 13 nodes = 39 nodes.
// Source: docs/weapon-designs/staff-v2/mass_sacrifice.json
// Engine fields landed: see src/engine/skillGraph.ts (22 new fields + 2 new trigger conditions)
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

export const STAFF_MASS_SACRIFICE_TALENT_TREE = createTalentTree({
  skillId: 'staff_mass_sacrifice',
  prefix: 'ms',
  branches: [
    // ════════════════════════════════════════════════════════════
    // Branch 0 — Plague Doctor
    // ════════════════════════════════════════════════════════════
    {
      name: 'Plague Doctor',
      description: 'Your diseases are the weapon. Mass Sacrifice doesn\'t end the disease — it amplifies it.',
      behaviorNodes: {
        t1a: bh('Rotting Dose', '+15/30% DoT damage multiplier.',
          { dotMultiplier: 15 },
          { 1: { dotMultiplier: 15 }, 2: { dotMultiplier: 30 } }),
        t1b: bh('Toxic Reserves', '+10/20% ailment potency.',
          { ailmentPotency: 10 },
          { 1: { ailmentPotency: 10 }, 2: { ailmentPotency: 20 } }),
        t2b: bh('Lingering Contagion', '+20/40% ailment duration.',
          { ailmentDuration: 20 },
          { 1: { ailmentDuration: 20 }, 2: { ailmentDuration: 40 } }),
        t3a: {
          name: 'Virulent Strike',
          description: '+10/20% damage while 3+ debuffs active on the target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [
              { condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } },
            ],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 10 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetAilmentCount', threshold: 3, modifier: { incDamage: 20 } }] },
          },
        },
        t3b: {
          name: 'Disease Carrier',
          description: '+3/6% damage per debuff on target.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [
              { condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } },
            ],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 3 } }] },
            2: { conditionalMods: [{ condition: 'perAilmentStackOnTarget', modifier: { incDamage: 6 } }] },
          },
        },
        t3c: bh('Vile Contagion', '+10/20% chaos penetration.',
          { chaosPenetration: 10 },
          { 1: { chaosPenetration: 10 }, 2: { chaosPenetration: 20 } }),
        t4b: bh('Plague Support', '+15/30% damage.',
          { incDamage: 15 },
          { 1: { incDamage: 15 }, 2: { incDamage: 30 } }),
      },
      t2Notable: {
        name: 'Festering Wound',
        description: 'Consuming Plagued with Mass Sacrifice applies 3 stacks of poison to every enemy hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { plaguedConsumePoisonStacks: 3 },
      },
      t4Notable: {
        name: 'Contagion Sacrifice',
        description: 'When Mass Sacrifice consumes Plagued, spread ALL active DoTs to every enemy in the pack (upgrade to baseline pandemic which is Plague of Toads only).',
        nodeType: 'notable', maxRank: 1,
        modifier: { massSacrificePandemic: true },
      },
      t5a: {
        name: 'Virulent Explosion',
        description: 'Each DoT on target at Mass Sacrifice cast time adds +8% burst damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { burstDamagePerDebuffOnTarget: 8 },
      },
      t5b: {
        name: 'Lingering Blight',
        description: 'After Mass Sacrifice, enemies hit reapply their consumed DoTs at 50% snapshot for 4s. Cost: −25% direct damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: {
          rawBehaviors: { dotReapplyOnConsume: { percent: 50, duration: 4 } },
          incDamage: -25,
        },
      },
      t6Notable: {
        name: 'Plague Lord',
        description: 'Pandemic from Mass Sacrifice spreads DoTs with FULL remaining duration (not just snapshots).',
        nodeType: 'notable', maxRank: 1,
        modifier: { pandemicFullDuration: true },
      },
      t7Keystone: {
        name: 'THE ROT',
        description: 'Mass Sacrifice no longer deals direct damage. Instead applies a unique Rotting debuff: 10% of target max HP as chaos damage over 3s, unremovable.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          weaponDamageOverride: 0,
          directDamageOverride: 0,
          rawBehaviors: { rottingDebuff: { maxHpPercent: 10, duration: 3 } },
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 1 — Spirit Caller
    // ════════════════════════════════════════════════════════════
    {
      name: 'Spirit Caller',
      description: 'The dead fight for you. Minions are the core — Mass Sacrifice is their ultimate tribute.',
      behaviorNodes: {
        t1a: bh('Pack Leader', '+10/20% damage per active minion.',
          { damagePerMinionAlive: 10 },
          { 1: { damagePerMinionAlive: 10 }, 2: { damagePerMinionAlive: 20 } }),
        t1b: bh('Bone Warden', '+15/30% minion max HP.',
          { minionHpMult: 15 },
          { 1: { minionHpMult: 15 }, 2: { minionHpMult: 30 } }),
        t2b: bh('Undying Bond', '+20/40% minion duration.',
          { minionDurationMult: 20 },
          { 1: { minionDurationMult: 20 }, 2: { minionDurationMult: 40 } }),
        t3a: {
          name: 'Resurgent Swarm',
          description: 'After Mass Sacrifice consumes spirit_link, Zombie Dogs (r1) / both minion skills (r2) cooldown resets.',
          nodeType: 'conditional', maxRank: 2,
          modifier: { rawBehaviors: { resurgentSwarmSkills: ['staff_zombie_dogs'] } },
          perRankModifiers: {
            1: { rawBehaviors: { resurgentSwarmSkills: ['staff_zombie_dogs'] } },
            2: { rawBehaviors: { resurgentSwarmSkills: ['staff_zombie_dogs', 'staff_fetish_swarm'] } },
          },
        },
        t3b: {
          name: 'Bloody Pact',
          description: '+5/10 life on hit while any minion is alive.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [
              { condition: 'whileMinionsAlive', modifier: { lifeOnHit: 5 } },
            ],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 5 } }] },
            2: { conditionalMods: [{ condition: 'whileMinionsAlive', modifier: { lifeOnHit: 10 } }] },
          },
        },
        t3c: bh('Dog Tamer', 'Zombie Dog attack interval reduced by 0.5/1.0s.',
          { zombieDogAttackIntervalReduction: 0.5 },
          { 1: { zombieDogAttackIntervalReduction: 0.5 }, 2: { zombieDogAttackIntervalReduction: 1.0 } }),
        t4b: bh('Minion Mastery', '+15/30% minion attack damage.',
          { minionDamageMult: 15 },
          { 1: { minionDamageMult: 15 }, 2: { minionDamageMult: 30 } }),
      },
      t2Notable: {
        name: 'Spectral Pact',
        description: 'When Mass Sacrifice consumes Haunted, summon 1 temporary spirit (fetish-type variant) that attacks for 3s.',
        nodeType: 'notable', maxRank: 1,
        modifier: { hauntedConsumeSummonsSpirit: true },
      },
      t4Notable: {
        name: 'Bloodbond',
        description: 'Detonation damage scales with minion MAX HP (not remaining HP).',
        nodeType: 'notable', maxRank: 1,
        modifier: { detonationUsesMaxHp: true },
      },
      t5a: {
        name: 'Ritual Burst',
        description: 'Detonation damage multiplied by number of minions detonated (2 dogs = ×2, 4 fetishes = ×4, both alive = ×6).',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: { detonationPerMinionMult: true },
      },
      t5b: {
        name: 'Phantom Tether',
        description: 'After detonation, spectral afterimages of detonated minions persist 4s dealing 50% of their damage. Cost: +6s cooldown on Zombie Dogs and Fetish Swarm.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: {
          rawBehaviors: {
            phantomAfterimages: { duration: 4, damagePercent: 50 },
            perSkillCooldownIncrease: { staff_zombie_dogs: 6, staff_fetish_swarm: 6 },
          },
        },
      },
      t6Notable: {
        name: 'Soul Sacrifice',
        description: 'Each soul_stack consumed during Mass Sacrifice increases detonation damage by +25%.',
        nodeType: 'notable', maxRank: 1,
        modifier: { detonationPerSoulStackBonus: 25 },
      },
      t7Keystone: {
        name: 'LORD OF THE DEAD',
        description: 'Mass Sacrifice detonates minions, then IMMEDIATELY resummons both Zombie Dogs and Fetish Swarm at full HP. Cost: −40% Mass Sacrifice direct damage.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          resummonOnMassSacrifice: true,
          incDamage: -40,
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // Branch 2 — Voodoo Master
    // ════════════════════════════════════════════════════════════
    {
      name: 'Voodoo Master',
      description: 'Consume everything for power. Pure burst escalation — the more you stack, the harder you hit.',
      behaviorNodes: {
        t1a: bh('Cursed Blade', '+10/20% damage.',
          { incDamage: 10 },
          { 1: { incDamage: 10 }, 2: { incDamage: 20 } }),
        t1b: bh('Sharp Focus', '+8/16% critical strike chance.',
          { incCritChance: 8 },
          { 1: { incCritChance: 8 }, 2: { incCritChance: 16 } }),
        t2b: bh('Biting Curse', '+10/20% critical strike multiplier.',
          { incCritMultiplier: 10 },
          { 1: { incCritMultiplier: 10 }, 2: { incCritMultiplier: 20 } }),
        t3a: {
          name: 'Hunter\'s Ritual',
          description: '+15/30% damage when target is below 50% HP.',
          nodeType: 'conditional', maxRank: 2,
          modifier: {
            conditionalMods: [
              { condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } },
            ],
          },
          perRankModifiers: {
            1: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 15 } }] },
            2: { conditionalMods: [{ condition: 'whileTargetBelowHp', threshold: 50, modifier: { incDamage: 30 } }] },
          },
        },
        t3b: bh('Cooldown Mastery', '−10/20% cooldown.',
          { cooldownReduction: 10 },
          { 1: { cooldownReduction: 10 }, 2: { cooldownReduction: 20 } }),
        t3c: bh('Soul Harvester', 'Soul Harvest cooldown reduced by 1/2 seconds (feeds stack building).',
          { rawBehaviors: { perSkillCooldownIncrease: { staff_soul_harvest: -1 } } },
          {
            1: { rawBehaviors: { perSkillCooldownIncrease: { staff_soul_harvest: -1 } } },
            2: { rawBehaviors: { perSkillCooldownIncrease: { staff_soul_harvest: -2 } } },
          }),
        t4b: bh('Heavy Blow Support', '+20/40% damage.',
          { incDamage: 20 },
          { 1: { incDamage: 20 }, 2: { incDamage: 40 } }),
      },
      t2Notable: {
        name: 'Hexbreaker',
        description: 'Consuming Hexed during Mass Sacrifice increases this cast\'s damage by an additional +50% (stacks with baseline +20%).',
        nodeType: 'notable', maxRank: 1,
        modifier: { hexedConsumeMassSacrificeBonus: 50 },
      },
      t4Notable: {
        name: 'Sacrificial Wisdom',
        description: 'Every combo state consumed by Mass Sacrifice refunds 15% of its cooldown.',
        nodeType: 'notable', maxRank: 1,
        modifier: { cdRefundPerStateConsumed: 15 },
      },
      t5a: {
        name: 'Endless Ritual',
        description: 'Each soul_stack now grants +30% damage on consume (up from +15%). Max cap raised 5 → 10 stacks.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: {
          soulStackDamagePerStack: 30,
          soulStackCapOverride: 10,
        },
      },
      t5b: {
        name: 'Iron Will',
        description: 'Mass Sacrifice cannot miss and the first cast per encounter is a guaranteed crit. Cost: −20% damage.',
        nodeType: 'keystoneChoice', maxRank: 1,
        modifier: {
          cannotMiss: true,
          firstCastGuaranteedCrit: true,
          incDamage: -20,
        },
      },
      t6Notable: {
        name: 'Cascading Doom',
        description: 'If Mass Sacrifice crits, refresh the duration of haunted, plagued, and hexed on all enemies hit.',
        nodeType: 'notable', maxRank: 1,
        modifier: { critRefreshesCombatStates: true },
      },
      t7Keystone: {
        name: 'THE FINAL OFFERING',
        description: 'Mass Sacrifice resets the cooldown of every other skill. Cost: 50% current HP sacrificed per cast.',
        nodeType: 'keystone', maxRank: 1,
        modifier: {
          resetAllCooldownsOnCast: true,
          selfDamagePercent: 50,
        },
      },
    },
  ],
});

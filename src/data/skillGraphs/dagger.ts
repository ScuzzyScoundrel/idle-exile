// ============================================================
// Idle Exile — Dagger Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Assassination — first-hit, crit, burst damage
//   B2 Venomcraft    — poison stacking, debuffs
//   B3 Shadow Dance  — dodge procs, evasion, reactive
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_ASSASSINATION: BranchTemplate = {
  name: 'Assassination',
  root:  { name: 'Precision Strike', desc: '+5% critical hit chance. +3 flat damage.',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Lethality',        desc: '+8% critical hit multiplier. Hits have a 15% chance to apply Vulnerable for 2 seconds.', modifier: { incCritMultiplier: 8, procs: [{ id: 'dg_b1_vuln', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } },
};

const B2_VENOMCRAFT: BranchTemplate = {
  name: 'Venomcraft',
  root:  { name: 'Toxic Edge',  desc: '+3% damage. Hits have a 20% chance to Poison enemies for 3 seconds.', modifier: { incDamage: 3, procs: [{ id: 'dg_b2_poison', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Venom Coat',  desc: 'Always applies Poison on hit. 15% chance to cause Bleeding for 3 seconds. Poisons spread to the next enemy on kill.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 3 }, debuffInteraction: { spreadDebuffOnKill: { debuffIds: ['poisoned'], refreshDuration: 0 } }, procs: [{ id: 'dg_b2_bleed', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 3 } }] } },
};

const B3_SHADOW_DANCE: BranchTemplate = {
  name: 'Shadow Dance',
  root:  { name: 'Nimble Step',    desc: 'Gain 3 life each time you hit. 5% of your evasion is added as bonus damage.', modifier: { lifeOnHit: 3, damageFromEvasion: 5 } },
  minor: { name: 'Shadow Reflex',  desc: 'Hits grant Fortify (3% less damage taken for 5 seconds). +10 to all resistances.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Toxic Crit',       desc: '+3% critical hit chance. Hits have a 10% chance to Poison for 2 seconds.', modifier: { incCritChance: 3, procs: [{ id: 'dg_x12_poison', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Venomous Shadow',  desc: '+5 to all resistances. Hits have a 10% chance to Poison for 2 seconds.', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'dg_x23_poison', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Shadow Strike',    desc: 'Gain 2 life on hit. +3% critical hit chance.',       modifier: { lifeOnHit: 2, incCritChance: 3 } };

const DG_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_ASSASSINATION, B2_VENOMCRAFT, B3_SHADOW_DANCE];
const DG_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)          B2 (debuff/reset)         B3 (onDodge cast)
// Stab        → Assassinate | Poison+Vuln             | onDodge → Viper Strike
// BladeFlurry → Lightning L | Bleed stacking          | onDodge → Stab
// FanOfKnives→ Blade Flurry| Poison AoE, spread      | onDodge → Smoke Screen
// ViperStrike→ Stab         | Poison 2x, Cursed       | onDodge → Fan of Knives
// SmokeScreen→ Fan of Knive| Chill+Blind              | onBlock → Assassinate
// Assassinate→ Viper Strike | Execute, Vulnerable      | onDodge → Blade Flurry
// LightningL → Smoke Screen| Shocked, chain           | onDodge → Stab

// ─── 1. STAB ──────────────────────────────────────────────

const STAB_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Backstab', desc: '+10% critical hit chance. 25% on critical hit: auto-cast Assassinate. Killing blows reset Assassinate\'s cooldown.', modifier: { incCritChance: 10, procs: [{ id: 'st_b1_n1_as', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_assassinate' }, { id: 'st_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'dagger_assassinate' }] } },
    keystone: { name: 'DEATHBLOW', desc: 'Critical hits always trigger Assassinate. +5% critical hit chance to all dagger skills. Stab deals 35% less damage.', modifier: { incDamage: -35, procs: [{ id: 'st_b1_k_as', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_assassinate' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Envenomed Stab', desc: 'Always applies Poison and Vulnerable on hit. Poison lasts 25% longer. Deal 50% more damage to Poisoned enemies.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'poisoned', incDamage: 50 } } } },
    keystone: { name: 'TOXIC IMPALE', desc: 'Poison can stack without limit. Always Curses the target. +15% attack speed to all dagger skills. Stab deals 40% less damage.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Vanishing Act', desc: 'When you dodge, auto-cast Viper Strike. 5% of evasion added as damage. 5% life leech. +15 to all resistances.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'st_b3_n1_vs', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_viper_strike' }] } },
    keystone: { name: 'PHANTOM', desc: 'When you dodge, auto-cast Viper Strike and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Stab deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'st_b3_k_vs', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_viper_strike' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. BLADE FLURRY ──────────────────────────────────────

const BLADE_FLURRY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Storm of Blades', desc: '+10% critical hit chance. +1 extra hit per cast. 25% on critical hit: auto-cast Lightning Lunge.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'bf_b1_n1_ll', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_lightning_lunge' }] } },
    keystone: { name: 'BLADE HURRICANE', desc: 'Critical hits always trigger Lightning Lunge. +2 extra hits per cast. +5% critical hit chance to all dagger skills. Blade Flurry deals 35% less damage.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'bf_b1_k_ll', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_lightning_lunge' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Lacerate', desc: 'Always causes Bleeding on hit. Bleeds last 25% longer. When you kill an enemy, bleeds spread to the next target.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'bf_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'THOUSAND CUTS', desc: 'Bleeding deals double damage. Always Curses the target. +15% attack speed to all dagger skills. Blade Flurry deals 40% less damage.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Evasive Flurry', desc: 'When you dodge, auto-cast Stab. 5% of evasion added as damage. 5% life leech. +15 to all resistances.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'bf_b3_n1_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }] } },
    keystone: { name: 'SHADOW FLURRY', desc: 'When you dodge, auto-cast Stab and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Blade Flurry deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'bf_b3_k_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. FAN OF KNIVES ─────────────────────────────────────

const FAN_OF_KNIVES_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Razor Rain', desc: '+10% critical hit chance. Converts to area damage. 25% on critical hit: auto-cast Blade Flurry.', modifier: { incCritChance: 10, convertToAoE: true, procs: [{ id: 'fk_b1_n1_bf', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_blade_flurry' }] } },
    keystone: { name: 'KNIFE STORM', desc: 'Critical hits always trigger Blade Flurry. +2 extra hits per cast. +5% critical hit chance to all dagger skills. Fan of Knives deals 35% less damage.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'fk_b1_k_bf', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_blade_flurry' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Toxic Barrage', desc: 'Always applies Poison. Converts to area damage for poison spread. Poison lasts 25% longer.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, convertToAoE: true } },
    keystone: { name: 'PLAGUE RAIN', desc: 'Poison can stack without limit. Always Curses the target. +15% attack speed to all dagger skills. Fan of Knives deals 40% less damage.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Smoke Cover', desc: 'When you dodge, auto-cast Smoke Screen. 5% of evasion added as damage. 5% life leech. +15 to all resistances.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'fk_b3_n1_ss', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_smoke_screen' }] } },
    keystone: { name: 'SHADOW VEIL', desc: 'When you dodge, auto-cast Smoke Screen and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Fan of Knives deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'fk_b3_k_ss', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_smoke_screen' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. VIPER STRIKE ──────────────────────────────────────

const VIPER_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Serpent\'s Fang', desc: '+10% critical hit chance. 25% on critical hit: auto-cast Stab. Killing blows reset Stab\'s cooldown.', modifier: { incCritChance: 10, procs: [{ id: 'vs_b1_n1_st', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_stab' }, { id: 'vs_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'dagger_stab' }] } },
    keystone: { name: 'KING COBRA', desc: 'Critical hits always trigger Stab. +5% critical hit chance to all dagger skills. Viper Strike deals 35% less damage.', modifier: { incDamage: -35, procs: [{ id: 'vs_b1_k_st', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_stab' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Neurotoxin', desc: 'Poison deals 50% more damage. Always Curses Poisoned enemies. Poison lasts 25% longer.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'DEATH VENOM', desc: 'Poison can stack without limit. All debuff effects are doubled. +15% attack speed to all dagger skills. Viper Strike deals 40% less damage.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Serpent Dodge', desc: 'When you dodge, auto-cast Fan of Knives. 5% of evasion added as damage. 5% life leech. +15 to all resistances.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'vs_b3_n1_fk', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_fan_of_knives' }] } },
    keystone: { name: 'VIPER\'S SHADOW', desc: 'When you dodge, auto-cast Fan of Knives and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Viper Strike deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'vs_b3_k_fk', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_fan_of_knives' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. SMOKE SCREEN ──────────────────────────────────────

const SMOKE_SCREEN_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Ambush', desc: '+10% critical hit chance. +1 extra hit per cast. 25% on critical hit: auto-cast Fan of Knives.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'ss_b1_n1_fk', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_fan_of_knives' }] } },
    keystone: { name: 'SHADOW AMBUSH', desc: 'Critical hits always trigger Fan of Knives. +5% critical hit chance to all dagger skills. Smoke Screen deals 35% less damage.', modifier: { incDamage: -35, procs: [{ id: 'ss_b1_k_fk', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_fan_of_knives' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Choking Cloud', desc: 'Always applies Chill and Poison. Debuffs last 25% longer. +5% cast speed while 3 or more debuffs are active.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'NOXIOUS CLOUD', desc: 'Always applies Chill and Curse. All debuff effects are doubled. +15% attack speed to all dagger skills. Smoke Screen deals 40% less damage.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Smoke Ward', desc: 'When you block, auto-cast Assassinate. Gain 2 Fortify stacks (4% damage reduction each, 5 seconds). 5% of armor added as damage. +15 to all resistances.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ss_b3_n1_as', chance: 1.0, trigger: 'onBlock', castSkill: 'dagger_assassinate' }] } },
    keystone: { name: 'SMOKE FORTRESS', desc: 'When you block, auto-cast Assassinate and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Smoke Screen deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ss_b3_k_as', chance: 1.0, trigger: 'onBlock', castSkill: 'dagger_assassinate' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. ASSASSINATE ───────────────────────────────────────

const ASSASSINATE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Death Mark', desc: '+10% critical hit chance. Deals triple damage to enemies below 20% life. 25% on critical hit: auto-cast Viper Strike.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'as_b1_n1_vs', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_viper_strike' }] } },
    keystone: { name: 'EXECUTION', desc: 'Critical hits always trigger Viper Strike. Deals triple damage to enemies below 25% life. +5% critical hit chance to all dagger skills. Assassinate deals 35% less damage.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'as_b1_k_vs', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_viper_strike' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Killing Blow', desc: 'Always applies Vulnerable and Curse on hit. Deal 50% more damage to Vulnerable enemies. Deals triple damage to enemies below 25% life.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'COUP DE GRACE', desc: 'Always Curses the target. Deals triple damage to enemies below 30% life. All debuff effects are doubled. +15% attack speed to all dagger skills. Assassinate deals 40% less damage.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Shadow Step', desc: 'When you dodge, auto-cast Blade Flurry. 5% of evasion added as damage. 5% life leech. +15 to all resistances.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'as_b3_n1_bf', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_blade_flurry' }] } },
    keystone: { name: 'DEATH\'S SHADOW', desc: 'When you dodge, auto-cast Blade Flurry and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Assassinate deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'as_b3_k_bf', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_blade_flurry' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 7. LIGHTNING LUNGE ───────────────────────────────────

const LIGHTNING_LUNGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Thunderstrike', desc: '+10% critical hit chance. 25% on critical hit: auto-cast Smoke Screen. Killing blows reset Smoke Screen\'s cooldown.', modifier: { incCritChance: 10, procs: [{ id: 'll_b1_n1_ss', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_smoke_screen' }, { id: 'll_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'dagger_smoke_screen' }] } },
    keystone: { name: 'LIGHTNING EXECUTION', desc: 'Critical hits always trigger Smoke Screen. +5% critical hit chance to all dagger skills. Lightning Lunge deals 35% less damage.', modifier: { incDamage: -35, procs: [{ id: 'll_b1_k_ss', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_smoke_screen' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Lunge', desc: 'Always applies Shocked on hit. Chains to 2 additional targets. Debuffs last 25% longer.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'STORM RUSH', desc: 'Always applies Shocked and Curse. Chains to 4 additional targets. +15% attack speed to all dagger skills. Lightning Lunge deals 40% less damage.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Thunder Dodge', desc: 'When you dodge, auto-cast Stab. 5% of evasion added as damage. 5% life leech. +15 to all resistances.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'll_b3_n1_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }] } },
    keystone: { name: 'LIGHTNING SHADOW', desc: 'When you dodge, auto-cast Stab and gain 3 Fortify stacks (5% damage reduction each, 6 seconds). +10% defense to all dagger skills. Lightning Lunge deals 20% less damage.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'll_b3_k_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── Buff/passive branch templates ─────────────────────────

const BUFF_B1: BranchTemplate = { name: 'Duration', root: { name: 'Extended Focus', desc: 'Buff lasts 2 seconds longer. 5% reduced cooldown.', modifier: { durationBonus: 2, cooldownReduction: 5 } }, minor: { name: 'Steady Pulse', desc: 'Buff lasts 2 seconds longer. +3% cast speed.', modifier: { durationBonus: 2, incCastSpeed: 3 } } };
const BUFF_B2: BranchTemplate = { name: 'Amplification', root: { name: 'Empowered', desc: 'Buff effect increased by 5%. +3% damage.', modifier: { abilityEffect: { damageMult: 1.05 }, incDamage: 3 } }, minor: { name: 'Intensify', desc: 'Buff effect increased by 5%. +3% critical hit chance.', modifier: { abilityEffect: { damageMult: 1.05 }, incCritChance: 3 } } };
const BUFF_B3: BranchTemplate = { name: 'Synergy', root: { name: 'Linked Power', desc: 'All dagger skills deal 3% more damage. Gain 3 life on hit.', modifier: { globalEffect: { damageMult: 1.03 }, lifeOnHit: 3 } }, minor: { name: 'Resonance', desc: 'All dagger skills gain +3% critical hit chance. +5 to all resistances.', modifier: { globalEffect: { critChanceBonus: 3 }, abilityEffect: { resistBonus: 5 } } } };
const BUFF_BR12: BridgeTemplate = { name: 'Sustained Power', desc: 'Buff lasts 1 second longer. Buff effect increased by 3%.', modifier: { durationBonus: 1, abilityEffect: { damageMult: 1.03 } } };
const BUFF_BR23: BridgeTemplate = { name: 'Shared Strength', desc: 'Buff effect increased by 3%. +5 to all resistances.', modifier: { abilityEffect: { damageMult: 1.03, resistBonus: 5 } } };
const BUFF_BR31: BridgeTemplate = { name: 'Enduring Link', desc: 'Buff lasts 1 second longer. Gain 2 life on hit.', modifier: { durationBonus: 1, lifeOnHit: 2 } };
const BUFF_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [BUFF_B1, BUFF_B2, BUFF_B3];
const BUFF_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BUFF_BR12, BUFF_BR23, BUFF_BR31];

const PASSIVE_B1: BranchTemplate = { name: 'Drop Rate', root: { name: 'Scavenger', desc: '+5% item drop rate. +3% material drop rate.', modifier: { abilityEffect: { itemDropMult: 1.05, materialDropMult: 1.03 } } }, minor: { name: 'Prospector', desc: '+5% material drop rate. +3% item drop rate.', modifier: { abilityEffect: { materialDropMult: 1.05, itemDropMult: 1.03 } } } };
const PASSIVE_B2: BranchTemplate = { name: 'XP & Progression', root: { name: 'Quick Learner', desc: '+5% experience gained. +3% item drop rate.', modifier: { abilityEffect: { xpMult: 1.05, itemDropMult: 1.03 } } }, minor: { name: 'Studious', desc: '+5% experience gained. +3% material drop rate.', modifier: { abilityEffect: { xpMult: 1.05, materialDropMult: 1.03 } } } };
const PASSIVE_B3: BranchTemplate = { name: 'Global Power', root: { name: 'Inner Strength', desc: '+3% damage. +3% critical hit chance.', modifier: { incDamage: 3, incCritChance: 3 } }, minor: { name: 'Focus', desc: '+3% cast speed. +3% critical hit multiplier.', modifier: { incCastSpeed: 3, incCritMultiplier: 3 } } };
const PASS_BR12: BridgeTemplate = { name: 'Lucky Find', desc: '+3% item drop rate. +3% experience gained.', modifier: { abilityEffect: { itemDropMult: 1.03, xpMult: 1.03 } } };
const PASS_BR23: BridgeTemplate = { name: 'Enlightened', desc: '+3% experience gained. +3% damage.', modifier: { abilityEffect: { xpMult: 1.03 }, incDamage: 3 } };
const PASS_BR31: BridgeTemplate = { name: 'Power Finds', desc: '+3% item drop rate. +3% critical hit chance.', modifier: { abilityEffect: { itemDropMult: 1.03 }, incCritChance: 3 } };
const PASSIVE_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [PASSIVE_B1, PASSIVE_B2, PASSIVE_B3];
const PASSIVE_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [PASS_BR12, PASS_BR23, PASS_BR31];

// ─── 8. FLURRY (Buff) ─────────────────────────────────────

const FLURRY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Flurry', desc: 'Buff lasts 4 seconds longer. 15% reduced cooldown. On activation, resets Stab\'s cooldown.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'flu_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'dagger_stab' }] } },
    keystone: { name: 'ENDLESS FLURRY', desc: 'Buff lasts 8 seconds longer. 25% reduced cooldown. Buff effect reduced by 30%. All dagger skills gain +5% attack speed.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Speed', desc: 'Speed buff effect increased by 50%. +10% critical hit chance while active.', modifier: { abilityEffect: { attackSpeedMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'BLINDING SPEED', desc: 'Speed buff effect doubled. You take 20% more damage while active. All dagger skills deal 5% more damage.', modifier: { abilityEffect: { attackSpeedMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Flurry Synergy', desc: 'While active, all dagger skills gain +5% critical hit chance. Gain 2 Fortify stacks on hit (4% damage reduction each, 5 seconds).', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'DANCE OF BLADES', desc: 'While active, all dagger skills deal 10% more damage. Duration cut in half. +10% defense to all dagger skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. SHADOW STRIKE (Buff) ──────────────────────────────

const SHADOW_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Shadow', desc: 'Buff lasts 3 seconds longer. 15% reduced cooldown. On activation, resets Assassinate\'s cooldown.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'sst_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'dagger_assassinate' }] } },
    keystone: { name: 'ETERNAL SHADOW', desc: 'Buff lasts 6 seconds longer. 25% reduced cooldown. Critical hit chance bonus reduced by 15%. All dagger skills gain +5% critical hit chance.', modifier: { durationBonus: 6, cooldownReduction: 25, incCritChance: -15, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Deadly Precision', desc: 'Critical hit chance buff effect increased by 50%. +10% critical hit multiplier.', modifier: { abilityEffect: { critChanceBonus: 25 }, incCritMultiplier: 10 } },
    keystone: { name: 'PERFECT STRIKE', desc: 'Critical hit chance buff effect doubled. 20% less damage. All dagger skills gain +5% critical hit chance.', modifier: { abilityEffect: { critChanceBonus: 50 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shadow Synergy', desc: 'While active, auto-cast Stab when you dodge. Gain 2 Fortify stacks on hit (4% damage reduction each, 5 seconds).', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'sst_b3_n1_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }] } },
    keystone: { name: 'SHADOW MASTER', desc: 'While active, all dagger skills gain +15 to all resistances. Duration cut in half. All dagger skills gain +10% attack speed.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. LETHALITY (Passive) ──────────────────────────────

const LETHALITY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sharp Scavenger', desc: '+15% item drop rate. +10% material drop rate.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE HUNTER', desc: '+25% item drops. +25% material drops. 10% less damage. All dagger skills gain +5% item drop rate.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Assassin\'s Wisdom', desc: '+15% experience gained. +5% item drop rate.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'MASTER ASSASSIN', desc: '+30% experience gained. 10% less damage. All dagger skills gain +5% experience.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Dagger Mastery', desc: '+8% damage. +5% critical hit chance. +5% attack speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'SHADOW LORD', desc: 'All dagger skills deal 5% more damage, gain +3% critical hit chance, and attack 5% faster.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const STAB_GRAPH             = createCompactTree({ skillId: 'dagger_stab',             prefix: 'st',  branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: STAB_OVERRIDES, startName: 'Quick Blade' });
const BLADE_FLURRY_GRAPH     = createCompactTree({ skillId: 'dagger_blade_flurry',     prefix: 'dbf', branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: BLADE_FLURRY_OVERRIDES, startName: 'Flurry Core' });
const FAN_OF_KNIVES_GRAPH    = createCompactTree({ skillId: 'dagger_fan_of_knives',    prefix: 'fk',  branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: FAN_OF_KNIVES_OVERRIDES, startName: 'Knife Core' });
const VIPER_STRIKE_GRAPH     = createCompactTree({ skillId: 'dagger_viper_strike',     prefix: 'vs',  branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: VIPER_STRIKE_OVERRIDES, startName: 'Serpent Core' });
const SMOKE_SCREEN_GRAPH     = createCompactTree({ skillId: 'dagger_smoke_screen',     prefix: 'ssc', branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: SMOKE_SCREEN_OVERRIDES, startName: 'Smoke Core' });
const ASSASSINATE_GRAPH      = createCompactTree({ skillId: 'dagger_assassinate',      prefix: 'as',  branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: ASSASSINATE_OVERRIDES, startName: 'Death\'s Point' });
const LIGHTNING_LUNGE_GRAPH  = createCompactTree({ skillId: 'dagger_lightning_lunge',  prefix: 'll',  branches: DG_BRANCHES, bridges: DG_BRIDGES, overrides: LIGHTNING_LUNGE_OVERRIDES, startName: 'Storm Point' });

const FLURRY_GRAPH           = createCompactTree({ skillId: 'dagger_flurry',           prefix: 'flu', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: FLURRY_OVERRIDES, startName: 'Speed Core' });
const SHADOW_STRIKE_BUFF     = createCompactTree({ skillId: 'dagger_shadow_strike',    prefix: 'sst', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: SHADOW_STRIKE_OVERRIDES, startName: 'Shadow Core' });

const LETHALITY_GRAPH        = createCompactTree({ skillId: 'dagger_lethality',        prefix: 'le',  branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: LETHALITY_OVERRIDES, startName: 'Lethal Focus' });

// ─── Export ────────────────────────────────────────────────

export const DAGGER_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'dagger_stab':             STAB_GRAPH,
  'dagger_blade_flurry':     BLADE_FLURRY_GRAPH,
  'dagger_fan_of_knives':    FAN_OF_KNIVES_GRAPH,
  'dagger_viper_strike':     VIPER_STRIKE_GRAPH,
  'dagger_smoke_screen':     SMOKE_SCREEN_GRAPH,
  'dagger_assassinate':      ASSASSINATE_GRAPH,
  'dagger_lightning_lunge':  LIGHTNING_LUNGE_GRAPH,
  'dagger_flurry':           FLURRY_GRAPH,
  'dagger_shadow_strike':    SHADOW_STRIKE_BUFF,
  'dagger_lethality':        LETHALITY_GRAPH,
};

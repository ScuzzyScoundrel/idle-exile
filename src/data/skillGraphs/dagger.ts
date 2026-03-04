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
  root:  { name: 'Precision Strike', desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Lethality',        desc: '+8% crit multiplier. 15% on hit: Vulnerable (2s).', modifier: { incCritMultiplier: 8, procs: [{ id: 'dg_b1_vuln', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } },
};

const B2_VENOMCRAFT: BranchTemplate = {
  name: 'Venomcraft',
  root:  { name: 'Toxic Edge',  desc: '+3% damage. 20% on hit: Poison (3s).', modifier: { incDamage: 3, procs: [{ id: 'dg_b2_poison', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Venom Coat',  desc: 'Guaranteed Poison. 15% on hit: Bleed (3s).', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 3 }, procs: [{ id: 'dg_b2_bleed', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 3 } }] } },
};

const B3_SHADOW_DANCE: BranchTemplate = {
  name: 'Shadow Dance',
  root:  { name: 'Nimble Step',    desc: '+3 life on hit, +5% evasion→damage', modifier: { lifeOnHit: 3, damageFromEvasion: 5 } },
  minor: { name: 'Shadow Reflex',  desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Toxic Crit',       desc: '+3% crit, 10% on hit: Poison (2s).', modifier: { incCritChance: 3, procs: [{ id: 'dg_x12_poison', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Venomous Shadow',  desc: '+5 all resist, 10% on hit: Poison (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'dg_x23_poison', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Shadow Strike',    desc: '+2 life on hit, +3% crit chance',       modifier: { lifeOnHit: 2, incCritChance: 3 } };

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
    notable: { name: 'Backstab', desc: '25% on crit: cast Assassinate. On kill: reset Assassinate CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'st_b1_n1_as', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_assassinate' }, { id: 'st_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'dagger_assassinate' }] } },
    keystone: { name: 'DEATHBLOW', desc: 'Crits always cast Assassinate. -35% Stab damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'st_b1_k_as', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_assassinate' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Envenomed Stab', desc: 'Guaranteed Poison + Vulnerable. +25% poison duration. +50% vs poisoned.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'poisoned', incDamage: 50 } } } },
    keystone: { name: 'TOXIC IMPALE', desc: 'Poison stacks unlimited. Always Cursed. -40% Stab damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Vanishing Act', desc: 'On dodge: cast Viper Strike. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'st_b3_n1_vs', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_viper_strike' }] } },
    keystone: { name: 'PHANTOM', desc: 'On dodge: cast Viper Strike. Fortify 3 stacks. -20% Stab damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'st_b3_k_vs', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_viper_strike' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. BLADE FLURRY ──────────────────────────────────────

const BLADE_FLURRY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Storm of Blades', desc: '25% on crit: cast Lightning Lunge. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'bf_b1_n1_ll', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_lightning_lunge' }] } },
    keystone: { name: 'BLADE HURRICANE', desc: 'Crits always cast Lightning Lunge. +2 extra hits. -35% Blade Flurry damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'bf_b1_k_ll', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_lightning_lunge' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Lacerate', desc: 'Guaranteed Bleed. +25% bleed duration. On kill: spread bleeds.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'bf_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'THOUSAND CUTS', desc: 'Bleeds deal 2x. Always Cursed. -40% Blade Flurry damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Evasive Flurry', desc: 'On dodge: cast Stab. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'bf_b3_n1_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }] } },
    keystone: { name: 'SHADOW FLURRY', desc: 'On dodge: cast Stab. Fortify 3 stacks. -20% Blade Flurry damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'bf_b3_k_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. FAN OF KNIVES ─────────────────────────────────────

const FAN_OF_KNIVES_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Razor Rain', desc: '25% on crit: cast Blade Flurry. Convert to AoE. +10% crit.', modifier: { incCritChance: 10, convertToAoE: true, procs: [{ id: 'fk_b1_n1_bf', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_blade_flurry' }] } },
    keystone: { name: 'KNIFE STORM', desc: 'Crits always cast Blade Flurry. +2 extra hits. -35% Fan of Knives damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'fk_b1_k_bf', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_blade_flurry' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Toxic Barrage', desc: 'Guaranteed Poison. AoE poison spread. +25% poison duration.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, convertToAoE: true } },
    keystone: { name: 'PLAGUE RAIN', desc: 'Poison stacks unlimited. Always Cursed. -40% Fan of Knives damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Smoke Cover', desc: 'On dodge: cast Smoke Screen. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'fk_b3_n1_ss', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_smoke_screen' }] } },
    keystone: { name: 'SHADOW VEIL', desc: 'On dodge: cast Smoke Screen. Fortify 3 stacks. -20% Fan of Knives damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'fk_b3_k_ss', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_smoke_screen' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. VIPER STRIKE ──────────────────────────────────────

const VIPER_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Serpent\'s Fang', desc: '25% on crit: cast Stab. On kill: reset Stab CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'vs_b1_n1_st', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_stab' }, { id: 'vs_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'dagger_stab' }] } },
    keystone: { name: 'KING COBRA', desc: 'Crits always cast Stab. -35% Viper Strike damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'vs_b1_k_st', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_stab' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Neurotoxin', desc: 'Poison deals 2x damage. Guaranteed Cursed on poisoned targets. +25% poison duration.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'DEATH VENOM', desc: 'Poison stacks unlimited. All debuff effects doubled. -40% Viper Strike damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Serpent Dodge', desc: 'On dodge: cast Fan of Knives. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'vs_b3_n1_fk', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_fan_of_knives' }] } },
    keystone: { name: 'VIPER\'S SHADOW', desc: 'On dodge: cast Fan of Knives. Fortify 3 stacks. -20% Viper Strike damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'vs_b3_k_fk', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_fan_of_knives' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. SMOKE SCREEN ──────────────────────────────────────

const SMOKE_SCREEN_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Ambush', desc: '25% on crit: cast Fan of Knives. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'ss_b1_n1_fk', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_fan_of_knives' }] } },
    keystone: { name: 'SHADOW AMBUSH', desc: 'Crits always cast Fan of Knives. -35% Smoke Screen damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ss_b1_k_fk', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_fan_of_knives' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Choking Cloud', desc: 'Guaranteed Chill + Poison. +25% debuff duration. +5% cast speed while 3+ debuffs.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'NOXIOUS CLOUD', desc: 'Always Chill + Cursed. Debuff effects doubled. -40% Smoke Screen damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Smoke Ward', desc: 'On block: cast Assassinate. Fortify 2 stacks. +5% armor→damage. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ss_b3_n1_as', chance: 1.0, trigger: 'onBlock', castSkill: 'dagger_assassinate' }] } },
    keystone: { name: 'SMOKE FORTRESS', desc: 'On block: cast Assassinate. Fortify 3 stacks. -20% Smoke Screen damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ss_b3_k_as', chance: 1.0, trigger: 'onBlock', castSkill: 'dagger_assassinate' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. ASSASSINATE ───────────────────────────────────────

const ASSASSINATE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Death Mark', desc: '25% on crit: cast Viper Strike. Execute: 3x below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'as_b1_n1_vs', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_viper_strike' }] } },
    keystone: { name: 'EXECUTION', desc: 'Crits always cast Viper Strike. Execute below 25%. -35% Assassinate damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'as_b1_k_vs', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_viper_strike' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Killing Blow', desc: 'Apply Vulnerable + Cursed. +50% damage vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'COUP DE GRACE', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Assassinate damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Shadow Step', desc: 'On dodge: cast Blade Flurry. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'as_b3_n1_bf', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_blade_flurry' }] } },
    keystone: { name: 'DEATH\'S SHADOW', desc: 'On dodge: cast Blade Flurry. Fortify 3 stacks. -20% Assassinate damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'as_b3_k_bf', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_blade_flurry' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 7. LIGHTNING LUNGE ───────────────────────────────────

const LIGHTNING_LUNGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Thunderstrike', desc: '25% on crit: cast Smoke Screen. On kill: reset Smoke Screen CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'll_b1_n1_ss', chance: 0.25, trigger: 'onCrit', castSkill: 'dagger_smoke_screen' }, { id: 'll_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'dagger_smoke_screen' }] } },
    keystone: { name: 'LIGHTNING EXECUTION', desc: 'Crits always cast Smoke Screen. -35% Lightning Lunge damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'll_b1_k_ss', chance: 1.0, trigger: 'onCrit', castSkill: 'dagger_smoke_screen' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Lunge', desc: 'Guaranteed Shocked. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'STORM RUSH', desc: 'Always Shocked + Cursed. Chain to 4 targets. -40% Lightning Lunge damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Thunder Dodge', desc: 'On dodge: cast Stab. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'll_b3_n1_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }] } },
    keystone: { name: 'LIGHTNING SHADOW', desc: 'On dodge: cast Stab. Fortify 3 stacks. -20% Lightning Lunge damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'll_b3_k_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── Buff/passive branch templates ─────────────────────────

const BUFF_B1: BranchTemplate = { name: 'Duration', root: { name: 'Extended Focus', desc: '+2s duration, -5% cooldown', modifier: { durationBonus: 2, cooldownReduction: 5 } }, minor: { name: 'Steady Pulse', desc: '+2s duration, +3% cast speed', modifier: { durationBonus: 2, incCastSpeed: 3 } } };
const BUFF_B2: BranchTemplate = { name: 'Amplification', root: { name: 'Empowered', desc: '+5% buff effect, +3% damage', modifier: { abilityEffect: { damageMult: 1.05 }, incDamage: 3 } }, minor: { name: 'Intensify', desc: '+5% buff effect, +3% crit chance', modifier: { abilityEffect: { damageMult: 1.05 }, incCritChance: 3 } } };
const BUFF_B3: BranchTemplate = { name: 'Synergy', root: { name: 'Linked Power', desc: '+3% damage to all skills, +3 life on hit', modifier: { globalEffect: { damageMult: 1.03 }, lifeOnHit: 3 } }, minor: { name: 'Resonance', desc: '+3% crit to all skills, +5 resist', modifier: { globalEffect: { critChanceBonus: 3 }, abilityEffect: { resistBonus: 5 } } } };
const BUFF_BR12: BridgeTemplate = { name: 'Sustained Power', desc: '+1s duration, +3% buff effect', modifier: { durationBonus: 1, abilityEffect: { damageMult: 1.03 } } };
const BUFF_BR23: BridgeTemplate = { name: 'Shared Strength', desc: '+3% buff effect, +5 resist', modifier: { abilityEffect: { damageMult: 1.03, resistBonus: 5 } } };
const BUFF_BR31: BridgeTemplate = { name: 'Enduring Link', desc: '+1s duration, +2 life on hit', modifier: { durationBonus: 1, lifeOnHit: 2 } };
const BUFF_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [BUFF_B1, BUFF_B2, BUFF_B3];
const BUFF_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BUFF_BR12, BUFF_BR23, BUFF_BR31];

const PASSIVE_B1: BranchTemplate = { name: 'Drop Rate', root: { name: 'Scavenger', desc: '+5% item drops, +3% material drops', modifier: { abilityEffect: { itemDropMult: 1.05, materialDropMult: 1.03 } } }, minor: { name: 'Prospector', desc: '+5% material drops, +3% item drops', modifier: { abilityEffect: { materialDropMult: 1.05, itemDropMult: 1.03 } } } };
const PASSIVE_B2: BranchTemplate = { name: 'XP & Progression', root: { name: 'Quick Learner', desc: '+5% XP, +3% item drops', modifier: { abilityEffect: { xpMult: 1.05, itemDropMult: 1.03 } } }, minor: { name: 'Studious', desc: '+5% XP, +3% material drops', modifier: { abilityEffect: { xpMult: 1.05, materialDropMult: 1.03 } } } };
const PASSIVE_B3: BranchTemplate = { name: 'Global Power', root: { name: 'Inner Strength', desc: '+3% damage, +3% crit chance', modifier: { incDamage: 3, incCritChance: 3 } }, minor: { name: 'Focus', desc: '+3% cast speed, +3% crit multiplier', modifier: { incCastSpeed: 3, incCritMultiplier: 3 } } };
const PASS_BR12: BridgeTemplate = { name: 'Lucky Find', desc: '+3% items, +3% XP', modifier: { abilityEffect: { itemDropMult: 1.03, xpMult: 1.03 } } };
const PASS_BR23: BridgeTemplate = { name: 'Enlightened', desc: '+3% XP, +3% damage', modifier: { abilityEffect: { xpMult: 1.03 }, incDamage: 3 } };
const PASS_BR31: BridgeTemplate = { name: 'Power Finds', desc: '+3% items, +3% crit', modifier: { abilityEffect: { itemDropMult: 1.03 }, incCritChance: 3 } };
const PASSIVE_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [PASSIVE_B1, PASSIVE_B2, PASSIVE_B3];
const PASSIVE_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [PASS_BR12, PASS_BR23, PASS_BR31];

// ─── 8. FLURRY (Buff) ─────────────────────────────────────

const FLURRY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Flurry', desc: '+4s duration. -15% cooldown. On activation: reset Stab CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'flu_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'dagger_stab' }] } },
    keystone: { name: 'ENDLESS FLURRY', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Speed', desc: '+50% buff speed effect. +10% crit while active.', modifier: { abilityEffect: { attackSpeedMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'BLINDING SPEED', desc: '+100% buff speed effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { attackSpeedMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Flurry Synergy', desc: 'While active: all dagger skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'DANCE OF BLADES', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. SHADOW STRIKE (Buff) ──────────────────────────────

const SHADOW_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Shadow', desc: '+3s duration. -15% cooldown. On activation: reset Assassinate CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'sst_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'dagger_assassinate' }] } },
    keystone: { name: 'ETERNAL SHADOW', desc: '+6s duration. -25% cooldown. -30% crit bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, incCritChance: -15, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Deadly Precision', desc: '+50% crit buff effect. +10% crit multiplier.', modifier: { abilityEffect: { critChanceBonus: 25 }, incCritMultiplier: 10 } },
    keystone: { name: 'PERFECT STRIKE', desc: '+100% crit buff effect. -20% damage. +5% crit to all skills.', modifier: { abilityEffect: { critChanceBonus: 50 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shadow Synergy', desc: 'While active: on dodge cast Stab. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'sst_b3_n1_st', chance: 1.0, trigger: 'onDodge', castSkill: 'dagger_stab' }] } },
    keystone: { name: 'SHADOW MASTER', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. LETHALITY (Passive) ──────────────────────────────

const LETHALITY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sharp Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE HUNTER', desc: '+25% item drops. +25% materials. -10% damage. +5% item drops to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Assassin\'s Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'MASTER ASSASSIN', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Dagger Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'SHADOW LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
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

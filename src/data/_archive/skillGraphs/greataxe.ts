// ============================================================
// Idle Exile — Greataxe Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Headsman — execute threshold, crit, burst
//   B2 Gore     — bleed stacking, spread, DoT
//   B3 Rampage  — kill streak, overkill, fortify
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_HEADSMAN: BranchTemplate = {
  name: 'Headsman',
  root:  { name: 'Executioner',     desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Killing Blow',    desc: '+8% crit multiplier. Execute bonus below 15%.', modifier: { incCritMultiplier: 8, executeThreshold: 15 } },
};

const B2_GORE: BranchTemplate = {
  name: 'Gore',
  root:  { name: 'Rending Strike',  desc: '+3% damage. 20% on hit: Bleed (3s).', modifier: { incDamage: 3, procs: [{ id: 'ga_b2_bleed', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Gore Coat',       desc: 'Guaranteed Bleed. 15% on hit: Weakened (2s).', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 3 }, procs: [{ id: 'ga_b2_weak', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } },
};

const B3_RAMPAGE: BranchTemplate = {
  name: 'Rampage',
  root:  { name: 'War Cry',         desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Battle Rage',     desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Gory Execution',  desc: '+3% crit, 10% on hit: Bleed (2s).',    modifier: { incCritChance: 3, procs: [{ id: 'ga_x12_bleed', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Raging Gore',     desc: '+5 all resist, 10% on hit: Bleed (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'ga_x23_bleed', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Rampage Strike',  desc: '+2 life on hit, +3% crit chance',       modifier: { lifeOnHit: 2, incCritChance: 3 } };

const GA_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_HEADSMAN, B2_GORE, B3_RAMPAGE];
const GA_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// Hew         → Skull Split | Bleed+Vuln          | onDodge → Glacial Rend
// Double Chop → Hew         | Bleed stack, spread  | onDodge → Searing Cleave
// SearCleave  → Double Chop | Burn always           | onDodge → Shock Split
// GlacialRend → Hemorrhage  | Chill+Weakened        | onDodge → Double Chop
// Shock Split → Glacial Rend| Shocked chain         | onDodge → Hew
// Hemorrhage  → Shock Split | Bleed 2x, spread      | onDodge → Searing Cleave
// SkullSplit  → Hemorrhage  | Vulnerable, execute    | onDodge → Double Chop

// ─── 1. HEW ────────────────────────────────────────────────

const HEW_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Decapitating Hew', desc: '25% on crit: cast Skull Splitter. On kill: reset Skull Splitter CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'ghw_b1_n1_ss', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_skull_splitter' }, { id: 'ghw_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'greataxe_skull_splitter' }] } },
    keystone: { name: 'HEADSMAN\'S AXE', desc: 'Crits always cast Skull Splitter. -35% Hew damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ghw_b1_k_ss', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_skull_splitter' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Goring Hew', desc: 'Guaranteed Bleed + Vulnerable. +25% bleed duration. +50% vs bleeding.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'bleeding', incDamage: 50 } } } },
    keystone: { name: 'BLOODBATH', desc: 'Always Cursed. Debuffs doubled. -40% Hew damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Rampage Hew', desc: 'On dodge: cast Glacial Rend. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ghw_b3_n1_gr', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_glacial_rend' }] } },
    keystone: { name: 'RAMPAGE HEW', desc: 'On dodge: cast Glacial Rend. Fortify 3 stacks. -20% Hew damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ghw_b3_k_gr', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_glacial_rend' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 2. DOUBLE CHOP ────────────────────────────────────────

const DOUBLE_CHOP_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Rapid Chop', desc: '25% on crit: cast Hew. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'gdc_b1_n1_hw', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_hew' }] } },
    keystone: { name: 'WHIRLWIND CHOP', desc: 'Crits always cast Hew. +3 extra hits. -35% Double Chop damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 3, procs: [{ id: 'gdc_b1_k_hw', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_hew' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Gory Chop', desc: 'Guaranteed Bleed. On kill: spread bleeds. +25% bleed duration.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'gdc_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'CRIMSON WHIRL', desc: 'Bleeds deal 2x. Always Cursed. -40% Double Chop damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Evasive Chop', desc: 'On dodge: cast Searing Cleave. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gdc_b3_n1_sc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_searing_cleave' }] } },
    keystone: { name: 'RAMPAGE CHOP', desc: 'On dodge: cast Searing Cleave. Fortify 3 stacks. -20% Double Chop damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gdc_b3_k_sc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_searing_cleave' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 3. SEARING CLEAVE ─────────────────────────────────────

const SEARING_CLEAVE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Blazing Cleave', desc: '25% on crit: cast Double Chop. On kill: reset Double Chop CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gsc_b1_n1_dc', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_double_chop' }, { id: 'gsc_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'greataxe_double_chop' }] } },
    keystone: { name: 'INFERNAL CLEAVE', desc: 'Crits always cast Double Chop. -35% Searing Cleave damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gsc_b1_k_dc', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_double_chop' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Searing Brand', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'HOLOCAUST', desc: 'Burns always Cursed. Burn doubled. -40% Searing Cleave damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Flame Guard', desc: 'On dodge: cast Shock Split. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gsc_b3_n1_ss', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_shock_split' }] } },
    keystone: { name: 'FLAME RAMPAGE', desc: 'On dodge: cast Shock Split. Fortify 3 stacks. -20% Searing Cleave damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gsc_b3_k_ss', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_shock_split' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 4. GLACIAL REND ───────────────────────────────────────

const GLACIAL_REND_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Frozen Rend', desc: '25% on crit: cast Hemorrhage. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'ggr_b1_n1_hm', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_hemorrhage' }] } },
    keystone: { name: 'GLACIAL FURY', desc: 'Crits always cast Hemorrhage. +2 extra hits. -35% Glacial Rend damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'ggr_b1_k_hm', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_hemorrhage' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Frostbitten', desc: 'Guaranteed Chill + Weakened. +25% chill duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'FROSTBITE REND', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Glacial Rend damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Frost Rampage', desc: 'On dodge: cast Double Chop. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ggr_b3_n1_dc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_double_chop' }] } },
    keystone: { name: 'ICE RAMPAGE', desc: 'On dodge: cast Double Chop. Fortify 3 stacks. -20% Glacial Rend damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ggr_b3_k_dc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_double_chop' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 5. SHOCK SPLIT ────────────────────────────────────────

const SHOCK_SPLIT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Lightning Split', desc: '25% on crit: cast Glacial Rend. Chain to 2 targets. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'gss_b1_n1_gr', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_glacial_rend' }] } },
    keystone: { name: 'STORM SPLIT', desc: 'Crits always cast Glacial Rend. Chain to 4. -35% Shock Split damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'gss_b1_k_gr', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_glacial_rend' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shocking Wound', desc: 'Guaranteed Shocked. +25% shock duration. +50% vs shocked.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'shocked', incDamage: 50 } } } },
    keystone: { name: 'THUNDER SPLIT', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Shock Split damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Storm Guard', desc: 'On dodge: cast Hew. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gss_b3_n1_hw', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_hew' }] } },
    keystone: { name: 'STORM RAMPAGE', desc: 'On dodge: cast Hew. Fortify 3 stacks. -20% Shock Split damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gss_b3_k_hw', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_hew' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 6. HEMORRHAGE ─────────────────────────────────────────

const HEMORRHAGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Arterial Strike', desc: '25% on crit: cast Shock Split. On kill: reset Shock Split CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'ghm_b1_n1_ss', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_shock_split' }, { id: 'ghm_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'greataxe_shock_split' }] } },
    keystone: { name: 'EXSANGUINATE', desc: 'Crits always cast Shock Split. -35% Hemorrhage damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ghm_b1_k_ss', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_shock_split' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Deep Hemorrhage', desc: 'Guaranteed Bleed 2x. +25% bleed duration. On kill: spread bleeds.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'CRIMSON TIDE', desc: 'Bleeds deal 2x. Always Cursed. -40% Hemorrhage damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Blood Guard', desc: 'On dodge: cast Searing Cleave. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ghm_b3_n1_sc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_searing_cleave' }] } },
    keystone: { name: 'BLOOD RAMPAGE', desc: 'On dodge: cast Searing Cleave. Fortify 3 stacks. -20% Hemorrhage damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ghm_b3_k_sc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_searing_cleave' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 7. SKULL SPLITTER ─────────────────────────────────────

const SKULL_SPLITTER_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Crushing Skull', desc: '25% on crit: cast Hemorrhage. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'gsk_b1_n1_hm', chance: 0.25, trigger: 'onCrit', castSkill: 'greataxe_hemorrhage' }] } },
    keystone: { name: 'HEADHUNTER', desc: 'Crits always cast Hemorrhage. Execute below 25%. -35% Skull Splitter damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'gsk_b1_k_hm', chance: 1.0, trigger: 'onCrit', castSkill: 'greataxe_hemorrhage' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Marked for Death', desc: 'Apply Vulnerable + Cursed. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'GUILLOTINE', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Skull Splitter damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Skull Guard', desc: 'On dodge: cast Double Chop. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gsk_b3_n1_dc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_double_chop' }] } },
    keystone: { name: 'SKULL RAMPAGE', desc: 'On dodge: cast Double Chop. Fortify 3 stacks. -20% Skull Splitter damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gsk_b3_k_dc', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_double_chop' }], globalEffect: { defenseMult: 1.10 } } } },
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

// ─── 8. BLOODRAGE (Buff) ────────────────────────────────────

const BLOODRAGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Rage', desc: '+4s duration. -15% cooldown. On activation: reset Hew CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'gbr_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'greataxe_hew' }] } },
    keystone: { name: 'ENDLESS RAGE', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Rage', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'BERSERKER', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Rage Synergy', desc: 'While active: all greataxe skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'BLOODLUST', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. SAVAGE ROAR (Buff) ──────────────────────────────────

const SAVAGE_ROAR_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Roar', desc: '+3s duration. -15% cooldown. On activation: reset Skull Splitter CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'gsr_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'greataxe_skull_splitter' }] } },
    keystone: { name: 'ETERNAL ROAR', desc: '+6s duration. -25% cooldown. -30% defense bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Terrifying Roar', desc: '+50% debuff effect. 20% on hit: Weakened (3s).', modifier: { abilityEffect: { damageMult: 1.50 }, procs: [{ id: 'gsr_b2_n1_weak', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 3 } }] } },
    keystone: { name: 'WAR CRY', desc: '+100% roar effect. -20% damage. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, incDamage: -20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Roar Synergy', desc: 'While active: on dodge cast Hew. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'gsr_b3_n1_hw', chance: 1.0, trigger: 'onDodge', castSkill: 'greataxe_hew' }] } },
    keystone: { name: 'SAVAGE FURY', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. BUTCHERY (Passive) ─────────────────────────────────

const BUTCHERY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Butcher\'s Haul', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE BUTCHER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Butcher\'s Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'MASTER BUTCHER', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Greataxe Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'BUTCHER LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const HEW_GRAPH             = createCompactTree({ skillId: 'greataxe_hew',             prefix: 'ghw', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: HEW_OVERRIDES, startName: 'Hew Core' });
const DOUBLE_CHOP_GRAPH     = createCompactTree({ skillId: 'greataxe_double_chop',     prefix: 'gdc', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: DOUBLE_CHOP_OVERRIDES, startName: 'Chop Core' });
const SEARING_CLEAVE_GRAPH  = createCompactTree({ skillId: 'greataxe_searing_cleave',  prefix: 'gsc', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: SEARING_CLEAVE_OVERRIDES, startName: 'Sear Core' });
const GLACIAL_REND_GRAPH    = createCompactTree({ skillId: 'greataxe_glacial_rend',    prefix: 'ggr', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: GLACIAL_REND_OVERRIDES, startName: 'Rend Core' });
const SHOCK_SPLIT_GRAPH     = createCompactTree({ skillId: 'greataxe_shock_split',     prefix: 'gss', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: SHOCK_SPLIT_OVERRIDES, startName: 'Split Core' });
const HEMORRHAGE_GRAPH      = createCompactTree({ skillId: 'greataxe_hemorrhage',      prefix: 'ghm', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: HEMORRHAGE_OVERRIDES, startName: 'Blood Core' });
const SKULL_SPLITTER_GRAPH  = createCompactTree({ skillId: 'greataxe_skull_splitter',  prefix: 'gsk', branches: GA_BRANCHES, bridges: GA_BRIDGES, overrides: SKULL_SPLITTER_OVERRIDES, startName: 'Skull Core' });

const BLOODRAGE_GRAPH       = createCompactTree({ skillId: 'greataxe_bloodrage',       prefix: 'gbr', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: BLOODRAGE_OVERRIDES, startName: 'Rage Core' });
const SAVAGE_ROAR_GRAPH     = createCompactTree({ skillId: 'greataxe_savage_roar',     prefix: 'gsr', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: SAVAGE_ROAR_OVERRIDES, startName: 'Roar Core' });

const BUTCHERY_GRAPH        = createCompactTree({ skillId: 'greataxe_butchery',        prefix: 'gbu', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: BUTCHERY_OVERRIDES, startName: 'Butcher Core' });

// ─── Export ────────────────────────────────────────────────

export const GREATAXE_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'greataxe_hew':             HEW_GRAPH,
  'greataxe_double_chop':     DOUBLE_CHOP_GRAPH,
  'greataxe_searing_cleave':  SEARING_CLEAVE_GRAPH,
  'greataxe_glacial_rend':    GLACIAL_REND_GRAPH,
  'greataxe_shock_split':     SHOCK_SPLIT_GRAPH,
  'greataxe_hemorrhage':      HEMORRHAGE_GRAPH,
  'greataxe_skull_splitter':  SKULL_SPLITTER_GRAPH,
  'greataxe_bloodrage':       BLOODRAGE_GRAPH,
  'greataxe_savage_roar':     SAVAGE_ROAR_GRAPH,
  'greataxe_butchery':        BUTCHERY_GRAPH,
};

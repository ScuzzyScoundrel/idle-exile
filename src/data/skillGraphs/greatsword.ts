// ============================================================
// Idle Exile — Greatsword Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Titan's Strike — huge hit, momentum, crit
//   B2 Sunder         — cursed, ignore resist, debuffs
//   B3 Colossus       — maxLife→dmg, fortify, defense
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_TITANS_STRIKE: BranchTemplate = {
  name: 'Titan\'s Strike',
  root:  { name: 'Heavy Swing',    desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Momentum',       desc: '+8% crit multiplier. +3% attack speed.', modifier: { incCritMultiplier: 8, incCastSpeed: 3 } },
};

const B2_SUNDER: BranchTemplate = {
  name: 'Sunder',
  root:  { name: 'Armor Break',    desc: '+3% damage. 15% on hit: Weakened (3s).', modifier: { incDamage: 3, procs: [{ id: 'gs_b2_weak', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Rend Armor',     desc: 'Guaranteed Weakened. 15% on hit: Vulnerable (2s).', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 3 }, procs: [{ id: 'gs_b2_vuln', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } },
};

const B3_COLOSSUS: BranchTemplate = {
  name: 'Colossus',
  root:  { name: 'Iron Body',      desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Living Fortress', desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Sundering Strike', desc: '+3% crit, 10% on hit: Weakened (2s).',    modifier: { incCritChance: 3, procs: [{ id: 'gs_x12_weak', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Armored Sunder',   desc: '+5 all resist, 10% on hit: Weakened (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'gs_x23_weak', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Titan\'s Guard',   desc: '+2 life on hit, +3% crit chance',          modifier: { lifeOnHit: 2, incCritChance: 3 } };

const GS_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_TITANS_STRIKE, B2_SUNDER, B3_COLOSSUS];
const GS_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)           B2 (debuff)                  B3 (onDodge/Block cast)
// Cleave       → Annihilate  | Weakened+Vuln               | onDodge → Frost Wave
// Wide Sweep   → Cleave      | Weakened AoE                | onDodge → Flame Arc
// Flame Arc    → Wide Sweep  | Burn always, +burn DPS      | onDodge → Thunder Crash
// Frost Wave   → Bleeding Ed | Chill+Weakened              | onDodge → Wide Sweep
// ThunderCrash → Frost Wave  | Shocked chain               | onDodge → Cleave
// BleedingEdge → ThunderCrash| Bleed stack, spread         | onDodge → Flame Arc
// Annihilate   → BleedingEdge| Vulnerable, execute         | onDodge → Wide Sweep

// ─── 1. CLEAVE ──────────────────────────────────────────────

const CLEAVE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Titanic Cleave', desc: '25% on crit: cast Annihilate. On kill: reset Annihilate CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gcl_b1_n1_an', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_annihilate' }, { id: 'gcl_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'greatsword_annihilate' }] } },
    keystone: { name: 'TITAN\'S WRATH', desc: 'Crits always cast Annihilate. -35% Cleave damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gcl_b1_k_an', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_annihilate' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shattering Cleave', desc: 'Guaranteed Weakened + Vulnerable. +25% debuff duration. +50% vs weakened.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } } } },
    keystone: { name: 'WORLD BREAKER', desc: 'Always Cursed. Debuffs doubled. -40% Cleave damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Bulwark Cleave', desc: 'On dodge: cast Frost Wave. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gcl_b3_n1_fw', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_frost_wave' }] } },
    keystone: { name: 'COLOSSUS CLEAVE', desc: 'On dodge: cast Frost Wave. Fortify 3 stacks. -20% Cleave damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gcl_b3_k_fw', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_frost_wave' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. WIDE SWEEP ──────────────────────────────────────────

const WIDE_SWEEP_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Sweeping Force', desc: '25% on crit: cast Cleave. Convert to AoE. +10% crit.', modifier: { incCritChance: 10, convertToAoE: true, procs: [{ id: 'gws_b1_n1_cl', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_cleave' }] } },
    keystone: { name: 'TEMPEST SWEEP', desc: 'Crits always cast Cleave. +2 extra hits. -35% Wide Sweep damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'gws_b1_k_cl', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_cleave' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Weakening Sweep', desc: 'Guaranteed Weakened. AoE debuff spread. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'CRIPPLING SWEEP', desc: 'Weakened unlimited. Always Cursed. -40% Wide Sweep damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Sweeping Guard', desc: 'On dodge: cast Flame Arc. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gws_b3_n1_fa', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_flame_arc' }] } },
    keystone: { name: 'IRON SWEEP', desc: 'On dodge: cast Flame Arc. Fortify 3 stacks. -20% Wide Sweep damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gws_b3_k_fa', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_flame_arc' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. FLAME ARC ───────────────────────────────────────────

const FLAME_ARC_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Blazing Arc', desc: '25% on crit: cast Wide Sweep. On kill: reset Wide Sweep CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gfa_b1_n1_ws', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_wide_sweep' }, { id: 'gfa_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'greatsword_wide_sweep' }] } },
    keystone: { name: 'INFERNAL ARC', desc: 'Crits always cast Wide Sweep. -35% Flame Arc damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gfa_b1_k_ws', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_wide_sweep' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Searing Arc', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'FLAME SUNDER', desc: 'Burns always Cursed. Burn doubled. -40% Flame Arc damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Guard', desc: 'On dodge: cast Thunder Crash. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gfa_b3_n1_tc', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_thunder_crash' }] } },
    keystone: { name: 'FLAME FORTRESS', desc: 'On dodge: cast Thunder Crash. Fortify 3 stacks. -20% Flame Arc damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gfa_b3_k_tc', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_thunder_crash' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. FROST WAVE ──────────────────────────────────────────

const FROST_WAVE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Glacial Wave', desc: '25% on crit: cast Bleeding Edge. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'gfw_b1_n1_be', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_bleeding_edge' }] } },
    keystone: { name: 'AVALANCHE', desc: 'Crits always cast Bleeding Edge. +2 extra hits. -35% Frost Wave damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'gfw_b1_k_be', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_bleeding_edge' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Bitter Cold', desc: 'Guaranteed Chill + Weakened. +25% chill duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'PERMAFROST WAVE', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Frost Wave damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Bulwark', desc: 'On dodge: cast Wide Sweep. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gfw_b3_n1_ws', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_wide_sweep' }] } },
    keystone: { name: 'ICE COLOSSUS', desc: 'On dodge: cast Wide Sweep. Fortify 3 stacks. -20% Frost Wave damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gfw_b3_k_ws', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_wide_sweep' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. THUNDER CRASH ───────────────────────────────────────

const THUNDER_CRASH_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Storm Crash', desc: '25% on crit: cast Frost Wave. Chain to 2 targets. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'gtc_b1_n1_fw', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_frost_wave' }] } },
    keystone: { name: 'THUNDER GOD', desc: 'Crits always cast Frost Wave. Chain to 4. -35% Thunder Crash damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'gtc_b1_k_fw', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_frost_wave' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Crash', desc: 'Guaranteed Shocked. +25% shock duration. +50% vs shocked.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'shocked', incDamage: 50 } } } },
    keystone: { name: 'STORM SUNDER', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Thunder Crash damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Thunder Guard', desc: 'On dodge: cast Cleave. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gtc_b3_n1_cl', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_cleave' }] } },
    keystone: { name: 'THUNDER COLOSSUS', desc: 'On dodge: cast Cleave. Fortify 3 stacks. -20% Thunder Crash damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gtc_b3_k_cl', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_cleave' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. BLEEDING EDGE ───────────────────────────────────────

const BLEEDING_EDGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Razor Edge', desc: '25% on crit: cast Thunder Crash. On kill: reset Thunder Crash CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gbe_b1_n1_tc', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_thunder_crash' }, { id: 'gbe_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'greatsword_thunder_crash' }] } },
    keystone: { name: 'HEMORRHAGE', desc: 'Crits always cast Thunder Crash. -35% Bleeding Edge damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gbe_b1_k_tc', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_thunder_crash' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Deep Wound', desc: 'Guaranteed Bleed. +25% bleed duration. On kill: spread bleeds.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'gbe_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'EXSANGUINATE', desc: 'Bleeds deal 2x. Always Cursed. -40% Bleeding Edge damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Iron Edge', desc: 'On dodge: cast Flame Arc. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gbe_b3_n1_fa', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_flame_arc' }] } },
    keystone: { name: 'IRON COLOSSUS', desc: 'On dodge: cast Flame Arc. Fortify 3 stacks. -20% Bleeding Edge damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gbe_b3_k_fa', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_flame_arc' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 7. ANNIHILATE ──────────────────────────────────────────

const ANNIHILATE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Obliterate', desc: '25% on crit: cast Bleeding Edge. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'gan_b1_n1_be', chance: 0.25, trigger: 'onCrit', castSkill: 'greatsword_bleeding_edge' }] } },
    keystone: { name: 'EXTINCTION', desc: 'Crits always cast Bleeding Edge. Execute below 25%. -35% Annihilate damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'gan_b1_k_be', chance: 1.0, trigger: 'onCrit', castSkill: 'greatsword_bleeding_edge' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Crushing Blow', desc: 'Apply Vulnerable + Cursed. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'WORLD ENDER', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Annihilate damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Titan\'s Guard', desc: 'On dodge: cast Wide Sweep. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gan_b3_n1_ws', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_wide_sweep' }] } },
    keystone: { name: 'IMMORTAL TITAN', desc: 'On dodge: cast Wide Sweep. Fortify 3 stacks. -20% Annihilate damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gan_b3_k_ws', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_wide_sweep' }], globalEffect: { defenseMult: 1.10 } } },
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

// ─── 8. MOMENTUM (Buff) ─────────────────────────────────────

const MOMENTUM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Momentum', desc: '+4s duration. -15% cooldown. On activation: reset Cleave CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'gmo_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'greatsword_cleave' }] } },
    keystone: { name: 'ENDLESS MOMENTUM', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Force', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'UNSTOPPABLE FORCE', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Momentum Synergy', desc: 'While active: all greatsword skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'TITAN\'S FURY', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. IRON WILL (Buff) ─────────────────────────────────────

const IRON_WILL_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Will', desc: '+3s duration. -15% cooldown. On activation: reset Annihilate CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'giw_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'greatsword_annihilate' }] } },
    keystone: { name: 'IRON RESOLVE', desc: '+6s duration. -25% cooldown. -30% defense bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Empowered Will', desc: '+50% defense buff effect. +10 all resist.', modifier: { abilityEffect: { defenseMult: 1.50 }, incCritChance: 5 } },
    keystone: { name: 'INDOMITABLE', desc: '+100% defense buff effect. -20% damage. +5% crit to all skills.', modifier: { abilityEffect: { defenseMult: 2.0 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Will Synergy', desc: 'While active: on dodge cast Cleave. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'giw_b3_n1_cl', chance: 1.0, trigger: 'onDodge', castSkill: 'greatsword_cleave' }] } },
    keystone: { name: 'TITAN\'S WILL', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. HEAVY IMPACT (Passive) ──────────────────────────────

const HEAVY_IMPACT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Titan Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE TITAN', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Titan\'s Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'GRAND TITAN', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Greatsword Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'COLOSSUS LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const CLEAVE_GRAPH         = createCompactTree({ skillId: 'greatsword_cleave',         prefix: 'gcl', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: CLEAVE_OVERRIDES, startName: 'Cleave Core' });
const WIDE_SWEEP_GRAPH     = createCompactTree({ skillId: 'greatsword_wide_sweep',     prefix: 'gws', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: WIDE_SWEEP_OVERRIDES, startName: 'Sweep Core' });
const FLAME_ARC_GRAPH      = createCompactTree({ skillId: 'greatsword_flame_arc',      prefix: 'gfa', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: FLAME_ARC_OVERRIDES, startName: 'Arc Core' });
const FROST_WAVE_GRAPH     = createCompactTree({ skillId: 'greatsword_frost_wave',     prefix: 'gfw', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: FROST_WAVE_OVERRIDES, startName: 'Wave Core' });
const THUNDER_CRASH_GRAPH  = createCompactTree({ skillId: 'greatsword_thunder_crash',  prefix: 'gtc', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: THUNDER_CRASH_OVERRIDES, startName: 'Crash Core' });
const BLEEDING_EDGE_GRAPH  = createCompactTree({ skillId: 'greatsword_bleeding_edge',  prefix: 'gbe', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: BLEEDING_EDGE_OVERRIDES, startName: 'Edge Core' });
const ANNIHILATE_GRAPH     = createCompactTree({ skillId: 'greatsword_annihilate',     prefix: 'gan', branches: GS_BRANCHES, bridges: GS_BRIDGES, overrides: ANNIHILATE_OVERRIDES, startName: 'Ruin Core' });

const MOMENTUM_GRAPH       = createCompactTree({ skillId: 'greatsword_momentum',       prefix: 'gmo', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: MOMENTUM_OVERRIDES, startName: 'Momentum Core' });
const IRON_WILL_GRAPH      = createCompactTree({ skillId: 'greatsword_iron_will',      prefix: 'giw', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: IRON_WILL_OVERRIDES, startName: 'Will Core' });

const HEAVY_IMPACT_GRAPH   = createCompactTree({ skillId: 'greatsword_heavy_impact',   prefix: 'ghi', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: HEAVY_IMPACT_OVERRIDES, startName: 'Impact Core' });

// ─── Export ────────────────────────────────────────────────

export const GREATSWORD_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'greatsword_cleave':         CLEAVE_GRAPH,
  'greatsword_wide_sweep':     WIDE_SWEEP_GRAPH,
  'greatsword_flame_arc':      FLAME_ARC_GRAPH,
  'greatsword_frost_wave':     FROST_WAVE_GRAPH,
  'greatsword_thunder_crash':  THUNDER_CRASH_GRAPH,
  'greatsword_bleeding_edge':  BLEEDING_EDGE_GRAPH,
  'greatsword_annihilate':     ANNIHILATE_GRAPH,
  'greatsword_momentum':       MOMENTUM_GRAPH,
  'greatsword_iron_will':      IRON_WILL_GRAPH,
  'greatsword_heavy_impact':   HEAVY_IMPACT_GRAPH,
};

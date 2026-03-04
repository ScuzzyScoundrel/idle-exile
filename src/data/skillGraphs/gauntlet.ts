// ============================================================
// Idle Exile — Gauntlet Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Arcane Fist   — armor→dmg, spell power, crit
//   B2 Shock Pulse   — AoE, shocked, elemental debuffs
//   B3 Spellguard    — fortify, resist, barrier
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_ARCANE_FIST: BranchTemplate = {
  name: 'Arcane Fist',
  root:  { name: 'Arcane Strike',  desc: '+5% crit chance, +3 flat damage',           modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Spell Weave',    desc: '+8% crit multiplier. +3% cast speed.',      modifier: { incCritMultiplier: 8, incCastSpeed: 3 } },
};

const B2_SHOCK_PULSE: BranchTemplate = {
  name: 'Shock Pulse',
  root:  { name: 'Pulse Strike',   desc: '+3% damage. 15% on hit: Shocked (3s).',     modifier: { incDamage: 3, procs: [{ id: 'gt_b2_shock', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Static Charge',  desc: 'Guaranteed Shocked. 15% on hit: Vulnerable (2s).', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, procs: [{ id: 'gt_b2_vuln', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } },
};

const B3_SPELLGUARD: BranchTemplate = {
  name: 'Spellguard',
  root:  { name: 'Spell Shield',   desc: '+3 life on hit, +5% armor→damage',          modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Arcane Barrier', desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Arcane Pulse',   desc: '+3% crit, 10% on hit: Shocked (2s).',    modifier: { incCritChance: 3, procs: [{ id: 'gt_x12_shock', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Shielded Pulse', desc: '+5 all resist, 10% on hit: Shocked (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'gt_x23_shock', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Spell Strike',   desc: '+2 life on hit, +3% crit chance',         modifier: { lifeOnHit: 2, incCritChance: 3 } };

const GT_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_ARCANE_FIST, B2_SHOCK_PULSE, B3_SPELLGUARD];
const GT_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// B1 (onCrit cast)           B2 (debuff/reset)              B3 (onDodge cast)
// Arcane Fist    → Elem Burst | Shocked+Vuln                | onDodge → Frost Grip
// Rapid Bolts    → Arcane Fist| Shocked chain               | onDodge → Flame Palm
// Flame Palm     → Rapid Bolts| Burn                        | onDodge → Shock Pulse
// Frost Grip     → Void Grasp | Chill                       | onDodge → Rapid Bolts
// Shock Pulse    → Frost Grip | Shocked+AoE, chain          | onDodge → Arcane Fist
// Void Grasp     → Shock Pulse| Cursed+Weakened             | onDodge → Flame Palm
// Elemental Burst→ Void Grasp | Vulnerable+execute          | onDodge → Rapid Bolts

// ─── 1. ARCANE FIST ─────────────────────────────────────────

const ARCANE_FIST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Spell Crit', desc: '25% on crit: cast Elemental Burst. On kill: reset Elemental Burst CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gaf_b1_n1_eb', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_elemental_burst' }, { id: 'gaf_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'gauntlet_elemental_burst' }] } },
    keystone: { name: 'ARCANE MASTER', desc: 'Crits always cast Elemental Burst. -35% Arcane Fist damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gaf_b1_k_eb', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_elemental_burst' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shocking Fist', desc: 'Guaranteed Shocked + Vulnerable. +25% debuff duration. +50% vs debuffed.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'shocked', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'STORM FIST', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Arcane Fist damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Arcane Dodge', desc: 'On dodge: cast Frost Grip. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gaf_b3_n1_fg', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_frost_grip' }] } },
    keystone: { name: 'SPELL PHANTOM', desc: 'On dodge: cast Frost Grip. Fortify 3 stacks. -20% Arcane Fist damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gaf_b3_k_fg', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_frost_grip' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 2. RAPID BOLTS ─────────────────────────────────────────

const RAPID_BOLTS_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Bolt Storm', desc: '25% on crit: cast Arcane Fist. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'grb_b1_n1_af', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_arcane_fist' }] } },
    keystone: { name: 'ARCANE BARRAGE', desc: 'Crits always cast Arcane Fist. +3 extra hits. -35% Rapid Bolts damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 3, procs: [{ id: 'grb_b1_k_af', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_arcane_fist' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Chain Lightning', desc: 'Guaranteed Shocked. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'STORM CHAIN', desc: 'Always Shocked + Cursed. Chain to 4. -40% Rapid Bolts damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Bolt Dodge', desc: 'On dodge: cast Flame Palm. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'grb_b3_n1_fp', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_flame_palm' }] } },
    keystone: { name: 'BOLT SHADOW', desc: 'On dodge: cast Flame Palm. Fortify 3 stacks. -20% Rapid Bolts damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'grb_b3_k_fp', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_flame_palm' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 3. FLAME PALM ──────────────────────────────────────────

const FLAME_PALM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Scorching Strike', desc: '25% on crit: cast Rapid Bolts. On kill: reset Rapid Bolts CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gfp_b1_n1_rb', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_rapid_bolts' }, { id: 'gfp_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'gauntlet_rapid_bolts' }] } },
    keystone: { name: 'INFERNO PALM', desc: 'Crits always cast Rapid Bolts. -35% Flame Palm damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gfp_b1_k_rb', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_rapid_bolts' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Searing Palm', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'CONFLAGRATION', desc: 'Burns always apply Cursed. Burn doubled. -40% Flame Palm damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Flame Dodge', desc: 'On dodge: cast Shock Pulse. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gfp_b3_n1_sp', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_shock_pulse' }] } },
    keystone: { name: 'PHOENIX PALM', desc: 'On dodge: cast Shock Pulse. Fortify 3 stacks. -20% Flame Palm damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gfp_b3_k_sp', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_shock_pulse' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 4. FROST GRIP ──────────────────────────────────────────

const FROST_GRIP_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Frozen Fist', desc: '25% on crit: cast Void Grasp. On kill: reset Void Grasp CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gfg_b1_n1_vg', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_void_grasp' }, { id: 'gfg_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'gauntlet_void_grasp' }] } },
    keystone: { name: 'GLACIER FIST', desc: 'Crits always cast Void Grasp. -35% Frost Grip damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gfg_b1_k_vg', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_void_grasp' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Deep Chill', desc: 'Guaranteed Chill. +25% debuff duration. +50% vs debuffed.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Frost Grip damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Frost Dodge', desc: 'On dodge: cast Rapid Bolts. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gfg_b3_n1_rb', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_rapid_bolts' }] } },
    keystone: { name: 'ICE PHANTOM', desc: 'On dodge: cast Rapid Bolts. Fortify 3 stacks. -20% Frost Grip damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gfg_b3_k_rb', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_rapid_bolts' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 5. SHOCK PULSE ─────────────────────────────────────────

const SHOCK_PULSE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Thunder Crit', desc: '25% on crit: cast Frost Grip. Chain to 2. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'gsp_b1_n1_fg', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_frost_grip' }] } },
    keystone: { name: 'LIGHTNING LORD', desc: 'Crits always cast Frost Grip. Chain to 4. -35% Shock Pulse damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'gsp_b1_k_fg', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_frost_grip' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Electro Wave', desc: 'Guaranteed Shocked. AoE shock spread. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'THUNDERSTORM', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Shock Pulse damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Pulse Dodge', desc: 'On dodge: cast Arcane Fist. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gsp_b3_n1_af', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_arcane_fist' }] } },
    keystone: { name: 'STORM GUARD', desc: 'On dodge: cast Arcane Fist. Fortify 3 stacks. -20% Shock Pulse damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gsp_b3_k_af', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_arcane_fist' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 6. VOID GRASP ──────────────────────────────────────────

const VOID_GRASP_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Void Crit', desc: '25% on crit: cast Shock Pulse. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'gvg_b1_n1_sp', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_shock_pulse' }] } },
    keystone: { name: 'VOID LORD', desc: 'Crits always cast Shock Pulse. -35% Void Grasp damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gvg_b1_k_sp', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_shock_pulse' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Void Curse', desc: 'Guaranteed Cursed + Weakened. +25% debuff duration. +50% vs debuffed.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'cursed', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'VOID CONSUME', desc: 'Always Cursed + Weakened. Debuffs doubled. -40% Void Grasp damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Void Dodge', desc: 'On dodge: cast Flame Palm. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gvg_b3_n1_fp', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_flame_palm' }] } },
    keystone: { name: 'VOID PHANTOM', desc: 'On dodge: cast Flame Palm. Fortify 3 stacks. -20% Void Grasp damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gvg_b3_k_fp', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_flame_palm' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 7. ELEMENTAL BURST ─────────────────────────────────────

const ELEMENTAL_BURST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Burst Crit', desc: '25% on crit: cast Void Grasp. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'geb_b1_n1_vg', chance: 0.25, trigger: 'onCrit', castSkill: 'gauntlet_void_grasp' }] } },
    keystone: { name: 'ELEMENTAL ANNIHILATION', desc: 'Crits always cast Void Grasp. Execute below 25%. -35% Elemental Burst damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'geb_b1_k_vg', chance: 1.0, trigger: 'onCrit', castSkill: 'gauntlet_void_grasp' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Elemental Ruin', desc: 'Apply Vulnerable + Cursed. Execute below 25%. +50% vs debuffed. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, executeThreshold: 25, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'CATACLYSM', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Elemental Burst damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Burst Dodge', desc: 'On dodge: cast Rapid Bolts. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'geb_b3_n1_rb', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_rapid_bolts' }] } },
    keystone: { name: 'ELEMENTAL GUARDIAN', desc: 'On dodge: cast Rapid Bolts. Fortify 3 stacks. -20% Elemental Burst damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'geb_b3_k_rb', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_rapid_bolts' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── Buff/Passive branch templates ─────────────────────────

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

// ─── 8. POWER SURGE (Buff) ──────────────────────────────────

const POWER_SURGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Surge', desc: '+4s duration. -15% cooldown. On activation: reset Arcane Fist CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'gpu_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'gauntlet_arcane_fist' }] } },
    keystone: { name: 'ETERNAL SURGE', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Amplified Surge', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'ARCANE OVERLOAD', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Surge Synergy', desc: 'While active: all gauntlet skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'SURGE COMMAND', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -7, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. ARCANE SHIELD (Buff) ────────────────────────────────

const ARCANE_SHIELD_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Shield', desc: '+5s duration. -15% cooldown. On activation: reset Elemental Burst CD.', modifier: { durationBonus: 5, cooldownReduction: 15, procs: [{ id: 'gas_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'gauntlet_elemental_burst' }] } },
    keystone: { name: 'ETERNAL SHIELD', desc: '+10s duration. -25% cooldown. -30% defense effect. +5% crit to all skills.', modifier: { durationBonus: 10, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Arcane Fortify', desc: '+50% defense buff effect. +10 all resist while active.', modifier: { abilityEffect: { defenseMult: 1.50, resistBonus: 10 } } },
    keystone: { name: 'INVINCIBLE SHIELD', desc: '+100% defense buff effect. -20% damage dealt. +5% defense to all skills.', modifier: { abilityEffect: { defenseMult: 2.0 }, incDamage: -20, globalEffect: { defenseMult: 1.05 } } } },
  { notable: { name: 'Shield Synergy', desc: 'While active: on dodge cast Arcane Fist. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'gas_b3_n1_af', chance: 1.0, trigger: 'onDodge', castSkill: 'gauntlet_arcane_fist' }] } },
    keystone: { name: 'ARCANE BASTION', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -10, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. SPELL FIST (Passive) ───────────────────────────────

const SPELL_FIST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Arcane Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE SEEKER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Spell Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'ARCANE SCHOLAR', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Gauntlet Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'SPELL LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const ARCANE_FIST_GRAPH      = createCompactTree({ skillId: 'gauntlet_arcane_fist',      prefix: 'gaf', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: ARCANE_FIST_OVERRIDES, startName: 'Arcane Core' });
const RAPID_BOLTS_GRAPH      = createCompactTree({ skillId: 'gauntlet_rapid_bolts',      prefix: 'grb', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: RAPID_BOLTS_OVERRIDES, startName: 'Bolt Core' });
const FLAME_PALM_GRAPH       = createCompactTree({ skillId: 'gauntlet_flame_palm',       prefix: 'gfp', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: FLAME_PALM_OVERRIDES, startName: 'Flame Core' });
const FROST_GRIP_GRAPH       = createCompactTree({ skillId: 'gauntlet_frost_grip',       prefix: 'gfg', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: FROST_GRIP_OVERRIDES, startName: 'Frost Core' });
const SHOCK_PULSE_GRAPH      = createCompactTree({ skillId: 'gauntlet_shock_pulse',      prefix: 'gsp', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: SHOCK_PULSE_OVERRIDES, startName: 'Pulse Core' });
const VOID_GRASP_GRAPH       = createCompactTree({ skillId: 'gauntlet_void_grasp',       prefix: 'gvg', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: VOID_GRASP_OVERRIDES, startName: 'Void Core' });
const ELEMENTAL_BURST_GRAPH  = createCompactTree({ skillId: 'gauntlet_elemental_burst',  prefix: 'geb', branches: GT_BRANCHES, bridges: GT_BRIDGES, overrides: ELEMENTAL_BURST_OVERRIDES, startName: 'Burst Core' });

const POWER_SURGE_GRAPH      = createCompactTree({ skillId: 'gauntlet_power_surge',      prefix: 'gpu', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: POWER_SURGE_OVERRIDES, startName: 'Surge Core' });
const ARCANE_SHIELD_GRAPH    = createCompactTree({ skillId: 'gauntlet_arcane_shield',    prefix: 'gas', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: ARCANE_SHIELD_OVERRIDES, startName: 'Shield Core' });

const SPELL_FIST_GRAPH       = createCompactTree({ skillId: 'gauntlet_spell_fist',       prefix: 'gsf', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: SPELL_FIST_OVERRIDES, startName: 'Spell Focus' });

// ─── Export ────────────────────────────────────────────────

export const GAUNTLET_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'gauntlet_arcane_fist':      ARCANE_FIST_GRAPH,
  'gauntlet_rapid_bolts':      RAPID_BOLTS_GRAPH,
  'gauntlet_flame_palm':       FLAME_PALM_GRAPH,
  'gauntlet_frost_grip':       FROST_GRIP_GRAPH,
  'gauntlet_shock_pulse':      SHOCK_PULSE_GRAPH,
  'gauntlet_void_grasp':       VOID_GRASP_GRAPH,
  'gauntlet_elemental_burst':  ELEMENTAL_BURST_GRAPH,
  'gauntlet_power_surge':      POWER_SURGE_GRAPH,
  'gauntlet_arcane_shield':    ARCANE_SHIELD_GRAPH,
  'gauntlet_spell_fist':       SPELL_FIST_GRAPH,
};

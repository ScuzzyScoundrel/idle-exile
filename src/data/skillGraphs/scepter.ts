// ============================================================
// Idle Exile — Scepter Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Divine Wrath    — lightning, shocked, crit
//   B2 Judgement       — weakened+cursed, amplify debuffs
//   B3 Paladin's Shield— block, heal (lifeOnHit), fortify, retribution
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_DIVINE_WRATH: BranchTemplate = {
  name: 'Divine Wrath',
  root:  { name: 'Divine Strike',  desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Holy Fervor',    desc: '+8% crit multiplier. 15% on hit: Shocked (2s).', modifier: { incCritMultiplier: 8, procs: [{ id: 'sc_b1_shock', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 2 } }] } },
};

const B2_JUDGEMENT: BranchTemplate = {
  name: 'Judgement',
  root:  { name: 'Judgment',      desc: '+3% damage. 15% on hit: Weakened (3s).', modifier: { incDamage: 3, procs: [{ id: 'sc_b2_weak', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Condemnation',  desc: 'Guaranteed Weakened. 15% on hit: Cursed (2s).', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 3 }, procs: [{ id: 'sc_b2_curse', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'cursed', stacks: 1, duration: 2 } }] } },
};

const B3_PALADINS_SHIELD: BranchTemplate = {
  name: 'Paladin\'s Shield',
  root:  { name: 'Holy Shield',   desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Sacred Ward',   desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Divine Judgment',  desc: '+3% crit, 10% on hit: Weakened (2s).', modifier: { incCritChance: 3, procs: [{ id: 'sc_x12_weak', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Sacred Judgment',  desc: '+5 all resist, 10% on hit: Weakened (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'sc_x23_weak', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Paladin Strike',   desc: '+2 life on hit, +3% crit chance', modifier: { lifeOnHit: 2, incCritChance: 3 } };

const SC_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_DIVINE_WRATH, B2_JUDGEMENT, B3_PALADINS_SHIELD];
const SC_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// B1 (onCrit cast)           B2 (debuff/reset)           B3 (onDodge cast)
// Smite       → Wrath        | Weakened+Cursed            | onDodge → Frost Judgment
// HolyStrike  → Smite        | Weakened+Cursed            | onDodge → Flame Brand
// FlameBrand  → Holy Strike  | Weakened+Cursed            | onDodge → Divine Bolt
// FrostJudge  → Chaos Curse  | Weakened+Cursed            | onDodge → Holy Strike
// DivineBolt  → Frost Judgm. | Chain, Weakened+Cursed     | onDodge → Smite
// ChaosCurse  → Divine Bolt  | Chaos/Cursed               | onDodge → Flame Brand
// Wrath       → Chaos Curse  | Execute, Weakened+Cursed   | onDodge → Holy Strike

// ─── 1. SMITE ────────────────────────────────────────────────

const SMITE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Thunderous Smite', desc: '25% on crit: cast Wrath. On kill: reset Wrath CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'scm_b1_n1_wr', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_wrath' }, { id: 'scm_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'scepter_wrath' }] } },
    keystone: { name: 'DIVINE THUNDER', desc: 'Crits always cast Wrath. -35% Smite damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'scm_b1_k_wr', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_wrath' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Condemning Smite', desc: 'Guaranteed Weakened. +25% debuff duration. +50% vs weakened.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } } } },
    keystone: { name: 'HOLY CONDEMNATION', desc: 'Always Cursed. Debuffs doubled. -40% Smite damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Shield of Light', desc: 'On dodge: cast Frost Judgment. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'scm_b3_n1_fj', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_frost_judgment' }] } },
    keystone: { name: 'HOLY BASTION', desc: 'On dodge: cast Frost Judgment. Fortify 3 stacks. -20% Smite damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'scm_b3_k_fj', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_frost_judgment' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. HOLY STRIKE ──────────────────────────────────────────

const HOLY_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Radiant Blow', desc: '25% on crit: cast Smite. On kill: reset Smite CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'shs_b1_n1_sm', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_smite' }, { id: 'shs_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'scepter_smite' }] } },
    keystone: { name: 'RADIANT FURY', desc: 'Crits always cast Smite. -35% Holy Strike damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'shs_b1_k_sm', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_smite' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Holy Judgment', desc: 'Guaranteed Weakened. +25% debuff duration. +50% vs weakened.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } } } },
    keystone: { name: 'DIVINE SENTENCE', desc: 'Always Cursed. Debuffs doubled. -40% Holy Strike damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Shielded Strike', desc: 'On dodge: cast Flame Brand. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'shs_b3_n1_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_flame_brand' }] } },
    keystone: { name: 'PALADIN\'S STRIKE', desc: 'On dodge: cast Flame Brand. Fortify 3 stacks. -20% Holy Strike damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'shs_b3_k_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_flame_brand' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. FLAME BRAND ──────────────────────────────────────────

const FLAME_BRAND_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Searing Brand', desc: '25% on crit: cast Holy Strike. On kill: reset Holy Strike CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'sfm_b1_n1_hs', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_holy_strike' }, { id: 'sfm_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'scepter_holy_strike' }] } },
    keystone: { name: 'INFERNAL BRAND', desc: 'Crits always cast Holy Strike. -35% Flame Brand damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sfm_b1_k_hs', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_holy_strike' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Branded Judgment', desc: 'Guaranteed Weakened. +25% debuff duration. +50% vs weakened.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } } } },
    keystone: { name: 'FLAME DECREE', desc: 'Always Cursed. Debuffs doubled. -40% Flame Brand damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Guard', desc: 'On dodge: cast Divine Bolt. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sfm_b3_n1_db', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_divine_bolt' }] } },
    keystone: { name: 'FLAME FORTRESS', desc: 'On dodge: cast Divine Bolt. Fortify 3 stacks. -20% Flame Brand damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sfm_b3_k_db', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_divine_bolt' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. FROST JUDGMENT ───────────────────────────────────────

const FROST_JUDGMENT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Frozen Verdict', desc: '25% on crit: cast Chaos Curse. On kill: reset Chaos Curse CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'sfj_b1_n1_cc', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_chaos_curse' }, { id: 'sfj_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'scepter_chaos_curse' }] } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Crits always cast Chaos Curse. -35% Frost Judgment damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sfj_b1_k_cc', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_chaos_curse' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Frozen Condemnation', desc: 'Guaranteed Weakened. +25% debuff duration. +50% vs weakened.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } } } },
    keystone: { name: 'ICE DECREE', desc: 'Always Cursed. Debuffs doubled. -40% Frost Judgment damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Ward', desc: 'On dodge: cast Holy Strike. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sfj_b3_n1_hs', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_holy_strike' }] } },
    keystone: { name: 'FROST BASTION', desc: 'On dodge: cast Holy Strike. Fortify 3 stacks. -20% Frost Judgment damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sfj_b3_k_hs', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_holy_strike' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. DIVINE BOLT ──────────────────────────────────────────

const DIVINE_BOLT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Lightning Judgment', desc: '25% on crit: cast Frost Judgment. Chain to 2 targets. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'sdb_b1_n1_fj', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_frost_judgment' }] } },
    keystone: { name: 'DIVINE STORM', desc: 'Crits always cast Frost Judgment. Chain to 4. -35% Divine Bolt damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'sdb_b1_k_fj', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_frost_judgment' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Judgment', desc: 'Guaranteed Shocked. Chain to 2. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'CHAIN JUDGMENT', desc: 'Always Shocked + Cursed. Chain to 4. -40% Divine Bolt damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Divine Ward', desc: 'On dodge: cast Smite. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sdb_b3_n1_sm', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_smite' }] } },
    keystone: { name: 'BOLT BASTION', desc: 'On dodge: cast Smite. Fortify 3 stacks. -20% Divine Bolt damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sdb_b3_k_sm', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_smite' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. CHAOS CURSE ──────────────────────────────────────────

const CHAOS_CURSE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Chaotic Crit', desc: '25% on crit: cast Divine Bolt. On kill: reset Divine Bolt CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'scc_b1_n1_db', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_divine_bolt' }, { id: 'scc_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'scepter_divine_bolt' }] } },
    keystone: { name: 'CHAOS STORM', desc: 'Crits always cast Divine Bolt. -35% Chaos Curse damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'scc_b1_k_db', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_divine_bolt' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Dark Condemnation', desc: 'Guaranteed Cursed. +25% debuff duration. +50% vs cursed.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'cursed', incDamage: 50 } } } },
    keystone: { name: 'DARK DECREE', desc: 'Always Cursed. Debuffs doubled. -40% Chaos Curse damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Chaos Ward', desc: 'On dodge: cast Flame Brand. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'scc_b3_n1_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_flame_brand' }] } },
    keystone: { name: 'CHAOS BASTION', desc: 'On dodge: cast Flame Brand. Fortify 3 stacks. -20% Chaos Curse damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'scc_b3_k_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_flame_brand' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 7. WRATH ────────────────────────────────────────────────

const WRATH_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Wrathful Crit', desc: '25% on crit: cast Chaos Curse. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'swr_b1_n1_cc', chance: 0.25, trigger: 'onCrit', castSkill: 'scepter_chaos_curse' }] } },
    keystone: { name: 'DIVINE EXECUTION', desc: 'Crits always cast Chaos Curse. Execute below 25%. -35% Wrath damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'swr_b1_k_cc', chance: 1.0, trigger: 'onCrit', castSkill: 'scepter_chaos_curse' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Final Judgment', desc: 'Apply Weakened + Cursed. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'ABSOLUTE WRATH', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Wrath damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Wrath Ward', desc: 'On dodge: cast Holy Strike. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'swr_b3_n1_hs', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_holy_strike' }] } },
    keystone: { name: 'WRATH BASTION', desc: 'On dodge: cast Holy Strike. Fortify 3 stacks. -20% Wrath damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'swr_b3_k_hs', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_holy_strike' }], globalEffect: { defenseMult: 1.10 } } },
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

// ─── 8. DIVINE FAVOR (Buff) ─────────────────────────────────

const DIVINE_FAVOR_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Favor', desc: '+4s duration. -15% cooldown. On activation: reset Smite CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'sdf_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'scepter_smite' }] } },
    keystone: { name: 'ETERNAL FAVOR', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Amplified Favor', desc: '+50% buff effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'DIVINE OVERFLOW', desc: '+100% buff effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Favor Synergy', desc: 'While active: all scepter skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'DIVINE COMMAND', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -7, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. ZEALOTRY (Buff) ─────────────────────────────────────

const ZEALOTRY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Zealotry', desc: '+3s duration. -15% cooldown. On activation: reset Wrath CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'szl_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'scepter_wrath' }] } },
    keystone: { name: 'ETERNAL ZEALOTRY', desc: '+6s duration. -25% cooldown. -30% defense. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Amplified Zealotry', desc: '+50% defense buff effect. +10 all resist.', modifier: { abilityEffect: { defenseMult: 1.50, resistBonus: 10 } } },
    keystone: { name: 'UNBREAKABLE ZEAL', desc: '+100% defense buff effect. -20% damage. +5% crit to all skills.', modifier: { abilityEffect: { defenseMult: 2.0 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Zealot Synergy', desc: 'While active: on dodge cast Smite. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'szl_b3_n1_sm', chance: 1.0, trigger: 'onDodge', castSkill: 'scepter_smite' }] } },
    keystone: { name: 'ZEALOT COMMAND', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. CONSECRATION (Passive) ──────────────────────────────

const CONSECRATION_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Holy Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'DIVINE HARVEST', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Sacred Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'DIVINE ENLIGHTENMENT', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Scepter Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'DIVINE LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const SMITE_GRAPH           = createCompactTree({ skillId: 'scepter_smite',           prefix: 'scm', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: SMITE_OVERRIDES, startName: 'Smite Focus' });
const HOLY_STRIKE_GRAPH     = createCompactTree({ skillId: 'scepter_holy_strike',     prefix: 'shs', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: HOLY_STRIKE_OVERRIDES, startName: 'Holy Core' });
const FLAME_BRAND_GRAPH     = createCompactTree({ skillId: 'scepter_flame_brand',     prefix: 'sfm', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: FLAME_BRAND_OVERRIDES, startName: 'Brand Core' });
const FROST_JUDGMENT_GRAPH  = createCompactTree({ skillId: 'scepter_frost_judgment',  prefix: 'sfj', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: FROST_JUDGMENT_OVERRIDES, startName: 'Frost Core' });
const DIVINE_BOLT_GRAPH     = createCompactTree({ skillId: 'scepter_divine_bolt',     prefix: 'sdb', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: DIVINE_BOLT_OVERRIDES, startName: 'Bolt Core' });
const CHAOS_CURSE_GRAPH     = createCompactTree({ skillId: 'scepter_chaos_curse',     prefix: 'scc', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: CHAOS_CURSE_OVERRIDES, startName: 'Chaos Core' });
const WRATH_GRAPH           = createCompactTree({ skillId: 'scepter_wrath',           prefix: 'swr', branches: SC_BRANCHES, bridges: SC_BRIDGES, overrides: WRATH_OVERRIDES, startName: 'Wrath Core' });

const DIVINE_FAVOR_GRAPH    = createCompactTree({ skillId: 'scepter_divine_favor',    prefix: 'sdf', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: DIVINE_FAVOR_OVERRIDES, startName: 'Favor Core' });
const ZEALOTRY_GRAPH        = createCompactTree({ skillId: 'scepter_zealotry',        prefix: 'szl', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: ZEALOTRY_OVERRIDES, startName: 'Zealot Core' });

const CONSECRATION_GRAPH    = createCompactTree({ skillId: 'scepter_consecration',    prefix: 'scn', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: CONSECRATION_OVERRIDES, startName: 'Sacred Focus' });

// ─── Export ────────────────────────────────────────────────

export const SCEPTER_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'scepter_smite':           SMITE_GRAPH,
  'scepter_holy_strike':     HOLY_STRIKE_GRAPH,
  'scepter_flame_brand':     FLAME_BRAND_GRAPH,
  'scepter_frost_judgment':  FROST_JUDGMENT_GRAPH,
  'scepter_divine_bolt':     DIVINE_BOLT_GRAPH,
  'scepter_chaos_curse':     CHAOS_CURSE_GRAPH,
  'scepter_wrath':           WRATH_GRAPH,
  'scepter_divine_favor':    DIVINE_FAVOR_GRAPH,
  'scepter_zealotry':        ZEALOTRY_GRAPH,
  'scepter_consecration':    CONSECRATION_GRAPH,
};

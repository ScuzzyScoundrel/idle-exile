// ============================================================
// Idle Exile — Crossbow Skill Graphs (Compact 16-node trees)
// 6 active + 2 buff + 1 passive = 9 trees
// Branch archetypes:
//   B1 Siege Engine    — pierce, penetrate, raw power
//   B2 Explosive Bolts — AoE, burning, detonation
//   B3 Repeater        — chain, fork, extra bolts, evasion
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_SIEGE_ENGINE: BranchTemplate = {
  name: 'Siege Engine',
  root:  { name: 'Piercing Tips',   desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Armor Piercing',  desc: '+8% crit multiplier. Pierce +1.', modifier: { incCritMultiplier: 8, pierceCount: 1 } },
};

const B2_EXPLOSIVE_BOLTS: BranchTemplate = {
  name: 'Explosive Bolts',
  root:  { name: 'Blast Tips',    desc: '+3% damage. 15% on hit: Burn (3s).', modifier: { incDamage: 3, procs: [{ id: 'cb_b2_burn', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Shrapnel',      desc: 'Convert to AoE. 15% on hit: Vulnerable (2s).', modifier: { convertToAoE: true, procs: [{ id: 'cb_b2_vuln', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } },
};

const B3_REPEATER: BranchTemplate = {
  name: 'Repeater',
  root:  { name: 'Quick Load',     desc: '+3 life on hit, +5% evasion→damage', modifier: { lifeOnHit: 3, damageFromEvasion: 5 } },
  minor: { name: 'Rapid Reload',   desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Piercing Blast',  desc: '+3% crit, 10% on hit: Burn (2s).',    modifier: { incCritChance: 3, procs: [{ id: 'cb_x12_burn', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Explosive Volley', desc: '+5 all resist, 10% on hit: Vulnerable (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'cb_x23_vuln', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Steady Repeater',  desc: '+2 life on hit, +3% crit chance',     modifier: { lifeOnHit: 2, incCritChance: 3 } };

const CB_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_SIEGE_ENGINE, B2_EXPLOSIVE_BOLTS, B3_REPEATER];
const CB_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)          B2 (debuff/AoE)             B3 (onDodge cast)
// Bolt Shot    → Siege Shot | Burn+Pierce                | onDodge → Frost Bolt
// Burst Fire   → Bolt Shot  | Shocked chain              | onDodge → Explosive Bolt
// ExplosiveBlt → Burst Fire | Burn AoE, spread           | onDodge → Bolt Shot
// Frost Bolt   → Net Shot   | Chill+Frozen               | onDodge → Burst Fire
// Net Shot     → Frost Bolt | Chill+Cursed, slow         | onBlock → Siege Shot
// Siege Shot   → Explosive  | Vulnerable, execute        | onDodge → Net Shot

// ─── 1. BOLT SHOT ───────────────────────────────────────────

const BOLT_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Precision Bolt', desc: '25% on crit: cast Siege Shot. On kill: reset Siege Shot CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'cbs_b1_n1_ss', chance: 0.25, trigger: 'onCrit', castSkill: 'crossbow_siege_shot' }, { id: 'cbs_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'crossbow_siege_shot' }] } },
    keystone: { name: 'SIEGE MARKSMAN', desc: 'Crits always cast Siege Shot. -35% Bolt Shot damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'cbs_b1_k_ss', chance: 1.0, trigger: 'onCrit', castSkill: 'crossbow_siege_shot' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Incendiary Bolt', desc: 'Guaranteed Burn. Pierce +2. +25% burn duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, pierceCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'HELLFIRE BOLT', desc: 'Burns always Cursed. Burn doubled. -40% Bolt Shot damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Evasive Load', desc: 'On dodge: cast Frost Bolt. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'cbs_b3_n1_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_frost_bolt' }] } },
    keystone: { name: 'PHANTOM BOLT', desc: 'On dodge: cast Frost Bolt. Fortify 3 stacks. -20% Bolt Shot damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'cbs_b3_k_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_frost_bolt' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. BURST FIRE ──────────────────────────────────────────

const BURST_FIRE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Rapid Barrage', desc: '25% on crit: cast Bolt Shot. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'cbf_b1_n1_bs', chance: 0.25, trigger: 'onCrit', castSkill: 'crossbow_bolt_shot' }] } },
    keystone: { name: 'BULLET STORM', desc: 'Crits always cast Bolt Shot. +3 extra hits. -35% Burst Fire damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 3, procs: [{ id: 'cbf_b1_k_bs', chance: 1.0, trigger: 'onCrit', castSkill: 'crossbow_bolt_shot' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Burst', desc: 'Guaranteed Shocked. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'CHAIN BURST', desc: 'Always Shocked + Cursed. Chain to 4. -40% Burst Fire damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Evasive Burst', desc: 'On dodge: cast Explosive Bolt. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'cbf_b3_n1_eb', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_explosive_bolt' }] } },
    keystone: { name: 'SHADOW BURST', desc: 'On dodge: cast Explosive Bolt. Fortify 3 stacks. -20% Burst Fire damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'cbf_b3_k_eb', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_explosive_bolt' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. EXPLOSIVE BOLT ──────────────────────────────────────

const EXPLOSIVE_BOLT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Mega Blast', desc: '25% on crit: cast Burst Fire. On kill: reset Burst Fire CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'ceb_b1_n1_bf', chance: 0.25, trigger: 'onCrit', castSkill: 'crossbow_burst_fire' }, { id: 'ceb_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'crossbow_burst_fire' }] } },
    keystone: { name: 'CARPET BOMB', desc: 'Crits always cast Burst Fire. -35% Explosive Bolt damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ceb_b1_k_bf', chance: 1.0, trigger: 'onCrit', castSkill: 'crossbow_burst_fire' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Napalm Bolt', desc: 'Guaranteed Burn. AoE spread. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'FIRESTORM', desc: 'Burns always Cursed. Burn doubled. -40% Explosive Bolt damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Blast Dodge', desc: 'On dodge: cast Bolt Shot. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ceb_b3_n1_bs', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_bolt_shot' }] } },
    keystone: { name: 'BLAST SHADOW', desc: 'On dodge: cast Bolt Shot. Fortify 3 stacks. -20% Explosive Bolt damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ceb_b3_k_bs', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_bolt_shot' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. FROST BOLT ──────────────────────────────────────────

const FROST_BOLT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Glacial Bolt', desc: '25% on crit: cast Net Shot. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'cfb_b1_n1_ns', chance: 0.25, trigger: 'onCrit', castSkill: 'crossbow_net_shot' }] } },
    keystone: { name: 'FROZEN BARRAGE', desc: 'Crits always cast Net Shot. +2 extra hits. -35% Frost Bolt damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'cfb_b1_k_ns', chance: 1.0, trigger: 'onCrit', castSkill: 'crossbow_net_shot' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Deep Freeze', desc: 'Guaranteed Chill. +25% chill duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'PERMAFROST BOLT', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Frost Bolt damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Dodge', desc: 'On dodge: cast Burst Fire. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'cfb_b3_n1_bf', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_burst_fire' }] } },
    keystone: { name: 'ICE PHANTOM', desc: 'On dodge: cast Burst Fire. Fortify 3 stacks. -20% Frost Bolt damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'cfb_b3_k_bf', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_burst_fire' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. NET SHOT ────────────────────────────────────────────

const NET_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Barbed Net', desc: '25% on crit: cast Frost Bolt. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'cns_b1_n1_fb', chance: 0.25, trigger: 'onCrit', castSkill: 'crossbow_frost_bolt' }] } },
    keystone: { name: 'ENTANGLE', desc: 'Crits always cast Frost Bolt. -35% Net Shot damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'cns_b1_k_fb', chance: 1.0, trigger: 'onCrit', castSkill: 'crossbow_frost_bolt' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Binding Net', desc: 'Guaranteed Chill + Cursed. +25% debuff duration. +5% speed while 3+ debuffs.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'DEATH SNARE', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Net Shot damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Net Trap', desc: 'On block: cast Siege Shot. Fortify 2 stacks. +5% armor→damage. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'cns_b3_n1_ss', chance: 1.0, trigger: 'onBlock', castSkill: 'crossbow_siege_shot' }] } },
    keystone: { name: 'FORTRESS NET', desc: 'On block: cast Siege Shot. Fortify 3 stacks. -20% Net Shot damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'cns_b3_k_ss', chance: 1.0, trigger: 'onBlock', castSkill: 'crossbow_siege_shot' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. SIEGE SHOT ──────────────────────────────────────────

const SIEGE_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Breaching Shot', desc: '25% on crit: cast Explosive Bolt. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'css_b1_n1_eb', chance: 0.25, trigger: 'onCrit', castSkill: 'crossbow_explosive_bolt' }] } },
    keystone: { name: 'SIEGE BREAKER', desc: 'Crits always cast Explosive Bolt. Execute below 25%. -35% Siege Shot damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'css_b1_k_eb', chance: 1.0, trigger: 'onCrit', castSkill: 'crossbow_explosive_bolt' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Vulnerable Breach', desc: 'Apply Vulnerable + Cursed. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'ANNIHILATION', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Siege Shot damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Siege Dodge', desc: 'On dodge: cast Net Shot. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'css_b3_n1_ns', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_net_shot' }] } },
    keystone: { name: 'SIEGE PHANTOM', desc: 'On dodge: cast Net Shot. Fortify 3 stacks. -20% Siege Shot damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'css_b3_k_ns', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_net_shot' }], globalEffect: { defenseMult: 1.10 } } },
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

// ─── 7. POWER SHOT (Buff) ───────────────────────────────────

const POWER_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Power', desc: '+4s duration. -15% cooldown. On activation: reset Bolt Shot CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'cps_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'crossbow_bolt_shot' }] } },
    keystone: { name: 'ENDLESS POWER', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Amplified Shot', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'OVERDRIVE', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Power Synergy', desc: 'While active: all crossbow skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'SIEGE COMMAND', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 8. EXPLOSIVE BOLT BUFF ─────────────────────────────────

const EXPLOSIVE_BOLT_BUFF_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Blast', desc: '+3s duration. -15% cooldown. On activation: reset Explosive Bolt CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'cbb_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'crossbow_explosive_bolt' }] } },
    keystone: { name: 'ETERNAL BLAST', desc: '+6s duration. -25% cooldown. -30% effect. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Empowered Explosions', desc: '+50% blast effect. +10% AoE range.', modifier: { abilityEffect: { damageMult: 1.50 }, convertToAoE: true } },
    keystone: { name: 'MAXIMUM PAYLOAD', desc: '+100% blast effect. -20% damage. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, incDamage: -20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Blast Synergy', desc: 'While active: on dodge cast Bolt Shot. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'cbb_b3_n1_bs', chance: 1.0, trigger: 'onDodge', castSkill: 'crossbow_bolt_shot' }] } },
    keystone: { name: 'SIEGE FORTRESS', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 9. STEADY AIM (Passive) ────────────────────────────────

const STEADY_AIM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Keen Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE HUNTER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Marksman\'s Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'MASTER ENGINEER', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Crossbow Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'SIEGE LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const BOLT_SHOT_GRAPH       = createCompactTree({ skillId: 'crossbow_bolt_shot',       prefix: 'cbs', branches: CB_BRANCHES, bridges: CB_BRIDGES, overrides: BOLT_SHOT_OVERRIDES, startName: 'Bolt Core' });
const BURST_FIRE_GRAPH      = createCompactTree({ skillId: 'crossbow_burst_fire',      prefix: 'cbf', branches: CB_BRANCHES, bridges: CB_BRIDGES, overrides: BURST_FIRE_OVERRIDES, startName: 'Burst Core' });
const EXPLOSIVE_BOLT_GRAPH  = createCompactTree({ skillId: 'crossbow_explosive_bolt',  prefix: 'ceb', branches: CB_BRANCHES, bridges: CB_BRIDGES, overrides: EXPLOSIVE_BOLT_OVERRIDES, startName: 'Blast Core' });
const FROST_BOLT_GRAPH      = createCompactTree({ skillId: 'crossbow_frost_bolt',      prefix: 'cfb', branches: CB_BRANCHES, bridges: CB_BRIDGES, overrides: FROST_BOLT_OVERRIDES, startName: 'Frost Core' });
const NET_SHOT_GRAPH        = createCompactTree({ skillId: 'crossbow_net_shot',        prefix: 'cns', branches: CB_BRANCHES, bridges: CB_BRIDGES, overrides: NET_SHOT_OVERRIDES, startName: 'Net Core' });
const SIEGE_SHOT_GRAPH      = createCompactTree({ skillId: 'crossbow_siege_shot',      prefix: 'css', branches: CB_BRANCHES, bridges: CB_BRIDGES, overrides: SIEGE_SHOT_OVERRIDES, startName: 'Siege Core' });

const POWER_SHOT_GRAPH      = createCompactTree({ skillId: 'crossbow_power_shot',      prefix: 'cps', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: POWER_SHOT_OVERRIDES, startName: 'Power Core' });
const EXPLOSIVE_BUFF_GRAPH  = createCompactTree({ skillId: 'crossbow_explosive_bolt_buff', prefix: 'cbb', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: EXPLOSIVE_BOLT_BUFF_OVERRIDES, startName: 'Payload Core' });

const STEADY_AIM_GRAPH      = createCompactTree({ skillId: 'crossbow_steady_aim',      prefix: 'csa', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: STEADY_AIM_OVERRIDES, startName: 'Aim Core' });

// ─── Export ────────────────────────────────────────────────

export const CROSSBOW_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'crossbow_bolt_shot':           BOLT_SHOT_GRAPH,
  'crossbow_burst_fire':          BURST_FIRE_GRAPH,
  'crossbow_explosive_bolt':      EXPLOSIVE_BOLT_GRAPH,
  'crossbow_frost_bolt':          FROST_BOLT_GRAPH,
  'crossbow_net_shot':            NET_SHOT_GRAPH,
  'crossbow_siege_shot':          SIEGE_SHOT_GRAPH,
  'crossbow_power_shot':          POWER_SHOT_GRAPH,
  'crossbow_explosive_bolt_buff': EXPLOSIVE_BUFF_GRAPH,
  'crossbow_steady_aim':          STEADY_AIM_GRAPH,
};

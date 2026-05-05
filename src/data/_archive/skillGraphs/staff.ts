// ============================================================
// Idle Exile — Staff Skill Graphs (Compact 16-node trees)
// 6 active + 2 buff + 1 passive = 9 trees
// Branch archetypes:
//   B1 Arcane Might      — raw spell power, crit, flat damage
//   B2 Elemental Mastery — tri-element (burn/chill/shock), debuffs
//   B3 Warding           — resist, fortify, defensive
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_ARCANE_MIGHT: BranchTemplate = {
  name: 'Arcane Might',
  root:  { name: 'Arcane Focus',    desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Spell Surge',     desc: '+8% crit multiplier. +3% cast speed.', modifier: { incCritMultiplier: 8, incCastSpeed: 3 } },
};

const B2_ELEMENTAL_MASTERY: BranchTemplate = {
  name: 'Elemental Mastery',
  root:  { name: 'Elemental Infusion', desc: '+3% damage. 15% on hit: Burn (3s).', modifier: { incDamage: 3, procs: [{ id: 'sf_b2_burn', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Tri-Element',        desc: '10% on hit: Chill (3s). 10% on hit: Shocked (3s).', modifier: { procs: [{ id: 'sf_b2_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } }, { id: 'sf_b2_shock', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 3 } }] } },
};

const B3_WARDING: BranchTemplate = {
  name: 'Warding',
  root:  { name: 'Arcane Ward',    desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Spell Shield',   desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Arcane Element',  desc: '+3% crit, 10% on hit: Burn (2s).',   modifier: { incCritChance: 3, procs: [{ id: 'sf_x12_burn', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Elemental Ward',  desc: '+5 all resist, 10% on hit: Chill (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'sf_x23_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Warded Power',    desc: '+2 life on hit, +3% crit chance',    modifier: { lifeOnHit: 2, incCritChance: 3 } };

const SF_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_ARCANE_MIGHT, B2_ELEMENTAL_MASTERY, B3_WARDING];
const SF_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)          B2 (debuff/element)          B3 (onDodge/Block cast)
// Arcane Bolt → Meteor      | Burn+Shocked               | onDodge → Ice Shard
// Spark       → Arcane Bolt | Shocked chain              | onDodge → Fireball
// Fireball    → Spark       | Burn always, +burn DPS     | onDodge → Arcane Bolt
// Ice Shard   → Fireball    | Chill+Frozen               | onDodge → Spark
// ArcShield   → Ice Shard   | Chill+Cursed               | onBlock → Meteor
// Meteor      → ArcShield   | Burn+Vulnerable, execute   | onDodge → Arcane Bolt

// ─── 1. ARCANE BOLT ─────────────────────────────────────────

const ARCANE_BOLT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Empowered Bolt', desc: '25% on crit: cast Meteor. On kill: reset Meteor CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'sab_b1_n1_mt', chance: 0.25, trigger: 'onCrit', castSkill: 'staff_meteor' }, { id: 'sab_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'staff_meteor' }] } },
    keystone: { name: 'ARCANE ANNIHILATION', desc: 'Crits always cast Meteor. -35% Arcane Bolt damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sab_b1_k_mt', chance: 1.0, trigger: 'onCrit', castSkill: 'staff_meteor' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Charged Bolt', desc: 'Guaranteed Burn + Shocked. +25% debuff duration. +50% vs burning.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'burning', incDamage: 50 } } } },
    keystone: { name: 'ELEMENTAL SURGE', desc: 'Always Cursed. Debuffs doubled. -40% Arcane Bolt damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Arcane Barrier', desc: 'On dodge: cast Ice Shard. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sab_b3_n1_is', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_ice_shard' }] } },
    keystone: { name: 'ARCANE FORTRESS', desc: 'On dodge: cast Ice Shard. Fortify 3 stacks. -20% Arcane Bolt damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sab_b3_k_is', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_ice_shard' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. SPARK ────────────────────────────────────────────────

const SPARK_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Arc Spark', desc: '25% on crit: cast Arcane Bolt. Chain to 2 targets. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'spk_b1_n1_ab', chance: 0.25, trigger: 'onCrit', castSkill: 'staff_arcane_bolt' }] } },
    keystone: { name: 'CHAIN LIGHTNING', desc: 'Crits always cast Arcane Bolt. Chain to 4. -35% Spark damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'spk_b1_k_ab', chance: 1.0, trigger: 'onCrit', castSkill: 'staff_arcane_bolt' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Spark', desc: 'Guaranteed Shocked. +25% shock duration. +50% vs shocked.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'shocked', incDamage: 50 } } } },
    keystone: { name: 'STORM CONDUIT', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Spark damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Static Shield', desc: 'On dodge: cast Fireball. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'spk_b3_n1_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_fireball' }] } },
    keystone: { name: 'LIGHTNING WARD', desc: 'On dodge: cast Fireball. Fortify 3 stacks. -20% Spark damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'spk_b3_k_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_fireball' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. FIREBALL ─────────────────────────────────────────────

const FIREBALL_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Pyroblast', desc: '25% on crit: cast Spark. On kill: reset Spark CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'sfb_b1_n1_spk', chance: 0.25, trigger: 'onCrit', castSkill: 'staff_spark' }, { id: 'sfb_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'staff_spark' }] } },
    keystone: { name: 'INFERNO', desc: 'Crits always cast Spark. -35% Fireball damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sfb_b1_k_spk', chance: 1.0, trigger: 'onCrit', castSkill: 'staff_spark' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Searing Flames', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'CONFLAGRATION', desc: 'Burns always apply Cursed. Burn doubled. -40% Fireball damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Shield', desc: 'On dodge: cast Arcane Bolt. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sfb_b3_n1_ab', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_arcane_bolt' }] } },
    keystone: { name: 'FLAME FORTRESS', desc: 'On dodge: cast Arcane Bolt. Fortify 3 stacks. -20% Fireball damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sfb_b3_k_ab', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_arcane_bolt' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. ICE SHARD ────────────────────────────────────────────

const ICE_SHARD_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Glacial Spike', desc: '25% on crit: cast Fireball. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'sis_b1_n1_fb', chance: 0.25, trigger: 'onCrit', castSkill: 'staff_fireball' }] } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Crits always cast Fireball. +2 extra hits. -35% Ice Shard damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'sis_b1_k_fb', chance: 1.0, trigger: 'onCrit', castSkill: 'staff_fireball' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Deep Freeze', desc: 'Guaranteed Chill. +25% chill duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'PERMAFROST', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Ice Shard damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Barrier', desc: 'On dodge: cast Spark. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sis_b3_n1_spk', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_spark' }] } },
    keystone: { name: 'ICE FORTRESS', desc: 'On dodge: cast Spark. Fortify 3 stacks. -20% Ice Shard damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sis_b3_k_spk', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_spark' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. ARCANE SHIELD ────────────────────────────────────────

const ARCANE_SHIELD_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Shield Burst', desc: '25% on crit: cast Ice Shard. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'sas_b1_n1_is', chance: 0.25, trigger: 'onCrit', castSkill: 'staff_ice_shard' }] } },
    keystone: { name: 'ARCANE DETONATION', desc: 'Crits always cast Ice Shard. -35% Arcane Shield damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sas_b1_k_is', chance: 1.0, trigger: 'onCrit', castSkill: 'staff_ice_shard' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Chilling Aura', desc: 'Guaranteed Chill + Cursed. +25% debuff duration. +5% speed while 3+ debuffs.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'NULLIFICATION', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Arcane Shield damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Aegis Pulse', desc: 'On block: cast Meteor. Fortify 2 stacks. +5% armor→damage. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sas_b3_n1_mt', chance: 1.0, trigger: 'onBlock', castSkill: 'staff_meteor' }] } },
    keystone: { name: 'ARCANE AEGIS', desc: 'On block: cast Meteor. Fortify 3 stacks. -20% Arcane Shield damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sas_b3_k_mt', chance: 1.0, trigger: 'onBlock', castSkill: 'staff_meteor' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. METEOR ───────────────────────────────────────────────

const METEOR_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Cataclysm', desc: '25% on crit: cast Arcane Shield. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'smt_b1_n1_as', chance: 0.25, trigger: 'onCrit', castSkill: 'staff_arcane_shield' }] } },
    keystone: { name: 'ARMAGEDDON', desc: 'Crits always cast Arcane Shield. Execute below 25%. -35% Meteor damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'smt_b1_k_as', chance: 1.0, trigger: 'onCrit', castSkill: 'staff_arcane_shield' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Scorched Earth', desc: 'Guaranteed Burn + Vulnerable. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'EXTINCTION', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Meteor damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Impact Ward', desc: 'On dodge: cast Arcane Bolt. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'smt_b3_n1_ab', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_arcane_bolt' }] } },
    keystone: { name: 'METEOR FORTRESS', desc: 'On dodge: cast Arcane Bolt. Fortify 3 stacks. -20% Meteor damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'smt_b3_k_ab', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_arcane_bolt' }], globalEffect: { defenseMult: 1.10 } } },
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

// ─── 7. ARCANE BLAST (Buff) ─────────────────────────────────

const ARCANE_BLAST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Blast', desc: '+4s duration. -15% cooldown. On activation: reset Arcane Bolt CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'sbl_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'staff_arcane_bolt' }] } },
    keystone: { name: 'ENDLESS ARCANA', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Arcana', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'ARCANE OVERLOAD', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Blast Synergy', desc: 'While active: all staff skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'ARCANE SUPREMACY', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 8. ELEMENTAL WARD (Buff) ────────────────────────────────

const ELEMENTAL_WARD_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Ward', desc: '+3s duration. -15% cooldown. On activation: reset Ice Shard CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'sew_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'staff_ice_shard' }] } },
    keystone: { name: 'ETERNAL WARD', desc: '+6s duration. -25% cooldown. -30% resist bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { resistBonus: -15 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Empowered Ward', desc: '+50% resist buff effect. +10 all resist.', modifier: { abilityEffect: { resistBonus: 25 }, incCritChance: 5 } },
    keystone: { name: 'ABSOLUTE WARD', desc: '+100% resist buff effect. -20% damage. +5% crit to all skills.', modifier: { abilityEffect: { resistBonus: 50 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Ward Synergy', desc: 'While active: on dodge cast Arcane Bolt. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'sew_b3_n1_ab', chance: 1.0, trigger: 'onDodge', castSkill: 'staff_arcane_bolt' }] } },
    keystone: { name: 'ELEMENTAL MASTERY', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 9. WISDOM (Passive) ─────────────────────────────────────

const WISDOM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Arcane Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE SEEKER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Sage\'s Insight', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'ARCHMAGE', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Staff Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'GRAND MAGUS', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const ARCANE_BOLT_GRAPH    = createCompactTree({ skillId: 'staff_arcane_bolt',    prefix: 'sab', branches: SF_BRANCHES, bridges: SF_BRIDGES, overrides: ARCANE_BOLT_OVERRIDES, startName: 'Arcane Core' });
const SPARK_GRAPH          = createCompactTree({ skillId: 'staff_spark',          prefix: 'spk', branches: SF_BRANCHES, bridges: SF_BRIDGES, overrides: SPARK_OVERRIDES, startName: 'Spark Core' });
const FIREBALL_GRAPH       = createCompactTree({ skillId: 'staff_fireball',       prefix: 'sfb', branches: SF_BRANCHES, bridges: SF_BRIDGES, overrides: FIREBALL_OVERRIDES, startName: 'Flame Core' });
const ICE_SHARD_GRAPH      = createCompactTree({ skillId: 'staff_ice_shard',      prefix: 'sis', branches: SF_BRANCHES, bridges: SF_BRIDGES, overrides: ICE_SHARD_OVERRIDES, startName: 'Frost Core' });
const ARCANE_SHIELD_GRAPH  = createCompactTree({ skillId: 'staff_arcane_shield',  prefix: 'sas', branches: SF_BRANCHES, bridges: SF_BRIDGES, overrides: ARCANE_SHIELD_OVERRIDES, startName: 'Shield Core' });
const METEOR_GRAPH         = createCompactTree({ skillId: 'staff_meteor',         prefix: 'smt', branches: SF_BRANCHES, bridges: SF_BRIDGES, overrides: METEOR_OVERRIDES, startName: 'Impact Core' });

const ARCANE_BLAST_GRAPH   = createCompactTree({ skillId: 'staff_arcane_blast',   prefix: 'sbl', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: ARCANE_BLAST_OVERRIDES, startName: 'Blast Core' });
const ELEMENTAL_WARD_GRAPH = createCompactTree({ skillId: 'staff_elemental_ward', prefix: 'sew', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: ELEMENTAL_WARD_OVERRIDES, startName: 'Ward Core' });

const WISDOM_GRAPH         = createCompactTree({ skillId: 'staff_wisdom',         prefix: 'swi', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: WISDOM_OVERRIDES, startName: 'Wisdom Core' });

// ─── Export ────────────────────────────────────────────────

export const STAFF_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'staff_arcane_bolt':    ARCANE_BOLT_GRAPH,
  'staff_spark':          SPARK_GRAPH,
  'staff_fireball':       FIREBALL_GRAPH,
  'staff_ice_shard':      ICE_SHARD_GRAPH,
  'staff_arcane_shield':  ARCANE_SHIELD_GRAPH,
  'staff_meteor':         METEOR_GRAPH,
  'staff_arcane_blast':   ARCANE_BLAST_GRAPH,
  'staff_elemental_ward': ELEMENTAL_WARD_GRAPH,
  'staff_wisdom':         WISDOM_GRAPH,
};

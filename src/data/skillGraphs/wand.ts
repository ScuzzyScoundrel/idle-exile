// ============================================================
// Idle Exile — Wand Skill Graphs
// 5 active + 2 buff + 1 passive = 8 compact trees (16-node)
// + 1 Chain Lightning tree (kept as-is, already compact)
// Branch archetypes:
//   B1 Arcane Power    — raw spell power, crit, flat damage
//   B2 Elemental Weave — burn/chill/shock/poison, debuffs
//   B3 Mystic Shield   — resist, fortify, defensive
// ============================================================

import type { SkillGraph, SkillGraphNode } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_ARCANE_POWER: BranchTemplate = {
  name: 'Arcane Power',
  root:  { name: 'Arcane Focus',    desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Spell Surge',     desc: '+8% crit multiplier. +3% cast speed.', modifier: { incCritMultiplier: 8, incCastSpeed: 3 } },
};

const B2_ELEMENTAL_WEAVE: BranchTemplate = {
  name: 'Elemental Weave',
  root:  { name: 'Elemental Tap',   desc: '+3% damage. 15% on hit: Burn (3s).', modifier: { incDamage: 3, procs: [{ id: 'wd_b2_burn', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Prismatic Touch', desc: '10% on hit: Chill (3s). 10% on hit: Shocked (3s).', modifier: { procs: [{ id: 'wd_b2_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } }, { id: 'wd_b2_shock', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 3 } }] } },
};

const B3_MYSTIC_SHIELD: BranchTemplate = {
  name: 'Mystic Shield',
  root:  { name: 'Mystic Ward',     desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Spell Barrier',   desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Arcane Element',  desc: '+3% crit, 10% on hit: Burn (2s).',    modifier: { incCritChance: 3, procs: [{ id: 'wd_x12_burn', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Elemental Shield', desc: '+5 all resist, 10% on hit: Chill (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'wd_x23_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Mystic Power',    desc: '+2 life on hit, +3% crit chance',     modifier: { lifeOnHit: 2, incCritChance: 3 } };

const WD_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_ARCANE_POWER, B2_ELEMENTAL_WEAVE, B3_MYSTIC_SHIELD];
const WD_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)          B2 (debuff)               B3 (onDodge cast)
// Magic Missile→ Void Blast | Burn+Shocked             | onDodge → Frostbolt
// Frostbolt    → MagicMiss  | Chill always, +chill DPS | onDodge → Searing Ray
// Searing Ray  → Frostbolt  | Burn always, +burn DPS   | onDodge → Essence Drain
// Essence Drain→ Searing Ray| Poison+Cursed            | onDodge → Void Blast
// Void Blast   → Ess Drain  | Vulnerable, execute      | onDodge → Magic Missile

// ─── 1. MAGIC MISSILE ───────────────────────────────────────

const MAGIC_MISSILE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Arcane Barrage', desc: '25% on crit: cast Void Blast. On kill: reset Void Blast CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'wmm_b1_n1_vb', chance: 0.25, trigger: 'onCrit', castSkill: 'wand_void_blast' }, { id: 'wmm_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'wand_void_blast' }] } },
    keystone: { name: 'ARCANE OVERLOAD', desc: 'Crits always cast Void Blast. -35% Magic Missile damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'wmm_b1_k_vb', chance: 1.0, trigger: 'onCrit', castSkill: 'wand_void_blast' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Charged Missile', desc: 'Guaranteed Burn + Shocked. +25% debuff duration. +50% vs burning.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'burning', incDamage: 50 } } } },
    keystone: { name: 'ELEMENTAL SURGE', desc: 'Always Cursed. Debuffs doubled. -40% Magic Missile damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Arcane Barrier', desc: 'On dodge: cast Frostbolt. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'wmm_b3_n1_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_frostbolt' }] } },
    keystone: { name: 'ARCANE FORTRESS', desc: 'On dodge: cast Frostbolt. Fortify 3 stacks. -20% Magic Missile damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'wmm_b3_k_fb', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_frostbolt' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. FROSTBOLT ────────────────────────────────────────────

const FROSTBOLT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Glacial Lance', desc: '25% on crit: cast Magic Missile. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'wfb_b1_n1_mm', chance: 0.25, trigger: 'onCrit', castSkill: 'wand_magic_missile' }] } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Crits always cast Magic Missile. +2 extra hits. -35% Frostbolt damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'wfb_b1_k_mm', chance: 1.0, trigger: 'onCrit', castSkill: 'wand_magic_missile' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Deep Freeze', desc: 'Guaranteed Chill. +25% chill duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'PERMAFROST', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Frostbolt damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Shield', desc: 'On dodge: cast Searing Ray. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'wfb_b3_n1_sr', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_searing_ray' }] } },
    keystone: { name: 'ICE FORTRESS', desc: 'On dodge: cast Searing Ray. Fortify 3 stacks. -20% Frostbolt damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'wfb_b3_k_sr', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_searing_ray' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. SEARING RAY ─────────────────────────────────────────

const SEARING_RAY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Pyroblast', desc: '25% on crit: cast Frostbolt. On kill: reset Frostbolt CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'wsr_b1_n1_fb', chance: 0.25, trigger: 'onCrit', castSkill: 'wand_frostbolt' }, { id: 'wsr_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'wand_frostbolt' }] } },
    keystone: { name: 'INFERNO', desc: 'Crits always cast Frostbolt. -35% Searing Ray damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'wsr_b1_k_fb', chance: 1.0, trigger: 'onCrit', castSkill: 'wand_frostbolt' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Searing Flames', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'CONFLAGRATION', desc: 'Burns always Cursed. Burn doubled. -40% Searing Ray damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Shield', desc: 'On dodge: cast Essence Drain. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'wsr_b3_n1_ed', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_essence_drain' }] } },
    keystone: { name: 'FLAME FORTRESS', desc: 'On dodge: cast Essence Drain. Fortify 3 stacks. -20% Searing Ray damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'wsr_b3_k_ed', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_essence_drain' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. ESSENCE DRAIN ────────────────────────────────────────

const ESSENCE_DRAIN_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Dark Barrage', desc: '25% on crit: cast Searing Ray. On kill: reset Searing Ray CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'wed_b1_n1_sr', chance: 0.25, trigger: 'onCrit', castSkill: 'wand_searing_ray' }, { id: 'wed_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'wand_searing_ray' }] } },
    keystone: { name: 'PLAGUE MASTER', desc: 'Crits always cast Searing Ray. -35% Essence Drain damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'wed_b1_k_sr', chance: 1.0, trigger: 'onCrit', castSkill: 'wand_searing_ray' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Virulent Drain', desc: 'Guaranteed Poison + Cursed. +25% poison duration. +50% vs poisoned.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'poisoned', incDamage: 50 } } } },
    keystone: { name: 'DEATH PLAGUE', desc: 'Always Cursed. Debuffs doubled. -40% Essence Drain damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Dark Shield', desc: 'On dodge: cast Void Blast. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'wed_b3_n1_vb', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_void_blast' }] } },
    keystone: { name: 'DARK FORTRESS', desc: 'On dodge: cast Void Blast. Fortify 3 stacks. -20% Essence Drain damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'wed_b3_k_vb', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_void_blast' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. VOID BLAST ───────────────────────────────────────────

const VOID_BLAST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Void Detonation', desc: '25% on crit: cast Essence Drain. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'wvb_b1_n1_ed', chance: 0.25, trigger: 'onCrit', castSkill: 'wand_essence_drain' }] } },
    keystone: { name: 'ANNIHILATION', desc: 'Crits always cast Essence Drain. Execute below 25%. -35% Void Blast damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'wvb_b1_k_ed', chance: 1.0, trigger: 'onCrit', castSkill: 'wand_essence_drain' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Void Corruption', desc: 'Apply Vulnerable + Cursed. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'DIMENSIONAL RIFT', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Void Blast damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Void Ward', desc: 'On dodge: cast Magic Missile. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'wvb_b3_n1_mm', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_magic_missile' }] } },
    keystone: { name: 'VOID FORTRESS', desc: 'On dodge: cast Magic Missile. Fortify 3 stacks. -20% Void Blast damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'wvb_b3_k_mm', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_magic_missile' }], globalEffect: { defenseMult: 1.10 } } },
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

// ─── 6. CHAIN LIGHTNING BUFF ─────────────────────────────────

const CL_BUFF_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Storm', desc: '+4s duration. -15% cooldown. On activation: reset Magic Missile CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'wcb_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'wand_magic_missile' }] } },
    keystone: { name: 'ENDLESS STORM', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Storm', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'OVERCHARGE', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Storm Synergy', desc: 'While active: all wand skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'TEMPEST LORD', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 7. TIME WARP (Buff) ─────────────────────────────────────

const TIME_WARP_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Warp', desc: '+3s duration. -15% cooldown. On activation: reset Void Blast CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'wtw_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'wand_void_blast' }] } },
    keystone: { name: 'ETERNAL WARP', desc: '+6s duration. -25% cooldown. -30% speed bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { attackSpeedMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Empowered Warp', desc: '+50% speed buff effect. +10% crit.', modifier: { abilityEffect: { attackSpeedMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'TIME LORD', desc: '+100% speed buff effect. -20% damage. +5% damage to all skills.', modifier: { abilityEffect: { attackSpeedMult: 2.0 }, incDamage: -20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Warp Synergy', desc: 'While active: on dodge cast Magic Missile. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'wtw_b3_n1_mm', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_magic_missile' }] } },
    keystone: { name: 'TEMPORAL MASTER', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 8. MYSTIC INSIGHT (Passive) ─────────────────────────────

const MYSTIC_INSIGHT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Mystic Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE SEEKER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Sage\'s Insight', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'ARCHMAGE', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Wand Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'GRAND MAGUS', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build compact trees ───────────────────────────────────

const MAGIC_MISSILE_GRAPH   = createCompactTree({ skillId: 'wand_magic_missile',   prefix: 'wmm', branches: WD_BRANCHES, bridges: WD_BRIDGES, overrides: MAGIC_MISSILE_OVERRIDES, startName: 'Arcane Core' });
const FROSTBOLT_GRAPH       = createCompactTree({ skillId: 'wand_frostbolt',       prefix: 'wfb', branches: WD_BRANCHES, bridges: WD_BRIDGES, overrides: FROSTBOLT_OVERRIDES, startName: 'Frost Core' });
const SEARING_RAY_GRAPH     = createCompactTree({ skillId: 'wand_searing_ray',     prefix: 'wsr', branches: WD_BRANCHES, bridges: WD_BRIDGES, overrides: SEARING_RAY_OVERRIDES, startName: 'Flame Core' });
const ESSENCE_DRAIN_GRAPH   = createCompactTree({ skillId: 'wand_essence_drain',   prefix: 'wed', branches: WD_BRANCHES, bridges: WD_BRIDGES, overrides: ESSENCE_DRAIN_OVERRIDES, startName: 'Dark Core' });
const VOID_BLAST_GRAPH      = createCompactTree({ skillId: 'wand_void_blast',      prefix: 'wvb', branches: WD_BRANCHES, bridges: WD_BRIDGES, overrides: VOID_BLAST_OVERRIDES, startName: 'Void Core' });

const CL_BUFF_GRAPH         = createCompactTree({ skillId: 'wand_chain_lightning_buff', prefix: 'wcb', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: CL_BUFF_OVERRIDES, startName: 'Storm Core' });
const TIME_WARP_GRAPH       = createCompactTree({ skillId: 'wand_time_warp',       prefix: 'wtw', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: TIME_WARP_OVERRIDES, startName: 'Warp Core' });

const MYSTIC_INSIGHT_GRAPH  = createCompactTree({ skillId: 'wand_mystic_insight',  prefix: 'wmi', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: MYSTIC_INSIGHT_OVERRIDES, startName: 'Insight Core' });

// ─── Chain Lightning (kept as-is, already compact) ──────────

function minor(id: string, name: string, desc: string, tier: number, connections: string[], modifier: SkillGraphNode['modifier']): SkillGraphNode {
  return { id, name, description: desc, nodeType: 'minor', tier, connections, modifier };
}
function notable(id: string, name: string, desc: string, tier: number, connections: string[], modifier: SkillGraphNode['modifier']): SkillGraphNode {
  return { id, name, description: desc, nodeType: 'notable', tier, connections, modifier };
}
function keystone(id: string, name: string, desc: string, tier: number, connections: string[], modifier: SkillGraphNode['modifier']): SkillGraphNode {
  return { id, name, description: desc, nodeType: 'keystone', tier, connections, modifier };
}

const CHAIN_LIGHTNING_GRAPH: SkillGraph = {
  skillId: 'wand_chain_lightning',
  maxPoints: 10,
  nodes: [
    { id: 'cl_start', name: 'Spark', description: 'Starting node — gateway to all 3 branches.', nodeType: 'start', tier: 0,
      connections: ['cl_b1_root', 'cl_b2_root', 'cl_b3_root'] },
    // Branch 1: Voltaic Trigger
    minor('cl_b1_root', 'Storm Focus', '+5% crit chance, +3 flat damage', 1,
      ['cl_start', 'cl_b1_m1', 'cl_x12', 'cl_x31'],
      { incCritChance: 5, flatDamage: 3 }),
    minor('cl_b1_m1', 'Charged Bolts', '+5% crit multiplier. 15% on hit: Shock (2s). Crits apply Vulnerable (4s).', 2,
      ['cl_b1_root', 'cl_b1_n1', 'cl_x12', 'cl_x31'],
      { incCritMultiplier: 5,
        procs: [
          { id: 'cl_b1_m1_shock', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 2 } },
          { id: 'cl_b1_m1_vuln', chance: 1.0, trigger: 'onCrit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 4 } },
        ] }),
    notable('cl_b1_n1', 'Spellslinger', '25% on crit: cast Frostbolt. On kill: reset Frostbolt CD. Crits guarantee Shock (3s). +10% crit chance.', 3,
      ['cl_b1_m1', 'cl_b1_k'],
      { incCritChance: 10,
        applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 },
        procs: [
          { id: 'cl_b1_n1_fb', chance: 0.25, trigger: 'onCrit', castSkill: 'wand_frostbolt' },
          { id: 'cl_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'wand_frostbolt' },
        ] }),
    keystone('cl_b1_k', 'CHAIN REACTION',
      'Your critical strikes always cast Void Blast. -35% CL base damage. +5% crit to all skills.', 4,
      ['cl_b1_n1'],
      { incDamage: -35,
        procs: [{ id: 'cl_b1_k_vb', chance: 1.0, trigger: 'onCrit', castSkill: 'wand_void_blast' }],
        globalEffect: { critChanceBonus: 5 } }),
    // Branch 2: Tempest Weaver
    minor('cl_b2_root', 'Elemental Spark', '+3% damage. 25% on hit: Burn (3s).', 1,
      ['cl_start', 'cl_b2_m1', 'cl_x12', 'cl_x23'],
      { incDamage: 3,
        procs: [{ id: 'cl_b2_root_burn', chance: 0.25, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 3 } }] }),
    minor('cl_b2_m1', 'Storm Conductor', 'Guaranteed Shock on hit. 20% on hit: Chill (3s). On kill: reset Essence Drain CD.', 2,
      ['cl_b2_root', 'cl_b2_n1', 'cl_x12', 'cl_x23'],
      { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 },
        procs: [
          { id: 'cl_b2_m1_chill', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } },
          { id: 'cl_b2_m1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'wand_essence_drain' },
        ] }),
    notable('cl_b2_n1', 'Prismatic Touch', '25% on hit: Chill. 25% on hit: Poison. +25% debuff duration. +5% cast speed while 3+ debuffs active.', 3,
      ['cl_b2_m1', 'cl_b2_k'],
      { debuffInteraction: { debuffDurationBonus: 25 },
        procs: [
          { id: 'cl_b2_n1_chill', chance: 0.25, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } },
          { id: 'cl_b2_n1_poison', chance: 0.25, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } },
        ],
        conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] }),
    keystone('cl_b2_k', 'PRISMATIC STORM',
      'Your hits always apply Cursed. All debuff effects doubled. -40% CL base damage. +15% attack speed to all skills.', 4,
      ['cl_b2_n1'],
      { incDamage: -40,
        applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 },
        debuffInteraction: { debuffEffectBonus: 100 },
        globalEffect: { attackSpeedMult: 1.15 } }),
    // Branch 3: Stormshield
    minor('cl_b3_root', 'Storm Barrier', '+3 life on hit, +10 all resist', 1,
      ['cl_start', 'cl_b3_m1', 'cl_x23', 'cl_x31'],
      { lifeOnHit: 3, abilityEffect: { resistBonus: 10 } }),
    minor('cl_b3_m1', 'Galvanic Ward', 'Fortify on hit (1 stack, 5s, 3% DR). +5 all resist.', 2,
      ['cl_b3_root', 'cl_b3_n1', 'cl_x23', 'cl_x31'],
      { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 5 } }),
    notable('cl_b3_n1', 'Storm Armor', 'Fortify on hit (2 stacks, 5s, 4% DR). On dodge: cast Void Blast. +5% armor→damage. 5% life leech. +15 all resist.', 3,
      ['cl_b3_m1', 'cl_b3_k'],
      { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 },
        damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 },
        procs: [{ id: 'cl_b3_n1_vb', chance: 1.0, trigger: 'onDodge', castSkill: 'wand_void_blast' }] }),
    keystone('cl_b3_k', 'EYE OF THE STORM',
      'When you block, cast Frostbolt. Fortify on hit (3 stacks, 6s, 5% DR). -20% CL base damage. +10% defense to all skills.', 4,
      ['cl_b3_n1'],
      { incDamage: -20,
        fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 },
        procs: [{ id: 'cl_b3_k_block_fb', chance: 1.0, trigger: 'onBlock', castSkill: 'wand_frostbolt' }],
        globalEffect: { defenseMult: 1.10 } }),
    // Bridges
    minor('cl_x12', 'Voltaic Storm', '+3% crit. 15% on hit: Shock (2s).', 2,
      ['cl_b1_root', 'cl_b1_m1', 'cl_b2_root', 'cl_b2_m1'],
      { incCritChance: 3,
        procs: [{ id: 'cl_x12_shock', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 2 } }] }),
    minor('cl_x23', 'Elemental Shield', '+5 all resist. 15% on hit: Chill (2s).', 2,
      ['cl_b2_root', 'cl_b2_m1', 'cl_b3_root', 'cl_b3_m1'],
      { abilityEffect: { resistBonus: 5 },
        procs: [{ id: 'cl_x23_chill', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] }),
    minor('cl_x31', 'Storm Recovery', '+2 life on hit, +3% crit', 2,
      ['cl_b3_root', 'cl_b3_m1', 'cl_b1_root', 'cl_b1_m1'],
      { lifeOnHit: 2, incCritChance: 3 }),
  ],
};

// ─── Export ────────────────────────────────────────────────

export const WAND_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'wand_magic_missile':        MAGIC_MISSILE_GRAPH,
  'wand_chain_lightning':      CHAIN_LIGHTNING_GRAPH,
  'wand_frostbolt':            FROSTBOLT_GRAPH,
  'wand_searing_ray':          SEARING_RAY_GRAPH,
  'wand_essence_drain':        ESSENCE_DRAIN_GRAPH,
  'wand_void_blast':           VOID_BLAST_GRAPH,
  'wand_chain_lightning_buff': CL_BUFF_GRAPH,
  'wand_time_warp':            TIME_WARP_GRAPH,
  'wand_mystic_insight':       MYSTIC_INSIGHT_GRAPH,
};

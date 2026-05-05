// ============================================================
// Idle Exile — Bow Skill Graphs (Compact 16-node trees)
// 6 active + 2 buff + 1 passive = 9 trees
// Branch archetypes:
//   B1 Sniper          — first-hit, crit, precision
//   B2 Elemental Arrows— conversion, debuffs, DoT
//   B3 Evasion Mastery — dodge→free cast, evasion→damage
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_SNIPER: BranchTemplate = {
  name: 'Sniper',
  root:  { name: 'Steady Aim',    desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Dead Eye',      desc: '+8% crit multiplier. Pierce +1.', modifier: { incCritMultiplier: 8, pierceCount: 1 } },
};

const B2_ELEMENTAL_ARROWS: BranchTemplate = {
  name: 'Elemental Arrows',
  root:  { name: 'Infused Tips',   desc: '+3% damage. 15% on hit: Burn (3s).', modifier: { incDamage: 3, procs: [{ id: 'bw_b2_burn', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Elemental Coat', desc: '15% on hit: Chill (3s). 15% on hit: Shocked (3s).', modifier: { procs: [{ id: 'bw_b2_chill', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } }, { id: 'bw_b2_shock', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 3 } }] } },
};

const B3_EVASION_MASTERY: BranchTemplate = {
  name: 'Evasion Mastery',
  root:  { name: 'Fleet Foot',    desc: '+3 life on hit, +5% evasion→damage', modifier: { lifeOnHit: 3, damageFromEvasion: 5 } },
  minor: { name: 'Dodge Roll',    desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Precise Element', desc: '+3% crit, 10% on hit: Burn (2s).', modifier: { incCritChance: 3, procs: [{ id: 'bw_x12_burn', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Elemental Dodge', desc: '+5 all resist, 10% on hit: Chill (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'bw_x23_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Hunter\'s Reflex', desc: '+2 life on hit, +3% crit chance', modifier: { lifeOnHit: 2, incCritChance: 3 } };

const BW_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_SNIPER, B2_ELEMENTAL_ARROWS, B3_EVASION_MASTERY];
const BW_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// B1 (onCrit cast)        B2 (debuff/reset)          B3 (onDodge cast)
// ArrowShot   → Snipe     | Bleed, spread            | onDodge → Burning Arrow
// RapidFire   → Arrow Shot| Shocked chain            | onDodge → Multi Shot
// MultiShot   → Rapid Fire| Poison AoE               | onDodge → Arrow Shot
// BurningArr  → Multi Shot| Burn always, +burn DPS   | onDodge → Rapid Fire
// SmokeArrow  → Burning A | Chill+Poison, blind      | onDodge → Snipe
// Snipe       → Smoke Arr | Execute, Vulnerable      | onDodge → Burning Arrow

// ─── 1. ARROW SHOT ────────────────────────────────────────

const ARROW_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Precision Shot', desc: '25% on crit: cast Snipe. On kill: reset Snipe CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'ar_b1_n1_sn', chance: 0.25, trigger: 'onCrit', castSkill: 'bow_snipe' }, { id: 'ar_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'bow_snipe' }] } },
    keystone: { name: 'MARKSMAN', desc: 'Crits always cast Snipe. -35% Arrow Shot damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ar_b1_k_sn', chance: 1.0, trigger: 'onCrit', castSkill: 'bow_snipe' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Barbed Tips', desc: 'Guaranteed Bleed. +25% bleed duration. On kill: spread bleeds.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'ar_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'BARRAGE OF THORNS', desc: 'Bleeds deal 2x. Always Cursed. -40% Arrow Shot damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Evasive Shot', desc: 'On dodge: cast Burning Arrow. +5% evasion→damage. 5% leech. +15 resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ar_b3_n1_ba', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_burning_arrow' }] } },
    keystone: { name: 'WIND RUNNER', desc: 'On dodge: cast Burning Arrow. Fortify 3 stacks. -20% Arrow Shot damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ar_b3_k_ba', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_burning_arrow' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 2. RAPID FIRE ────────────────────────────────────────

const RAPID_FIRE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Hail of Arrows', desc: '25% on crit: cast Arrow Shot. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'rf_b1_n1_ar', chance: 0.25, trigger: 'onCrit', castSkill: 'bow_arrow_shot' }] } },
    keystone: { name: 'ARROW STORM', desc: 'Crits always cast Arrow Shot. +3 extra hits. -35% Rapid Fire damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 3, procs: [{ id: 'rf_b1_k_ar', chance: 1.0, trigger: 'onCrit', castSkill: 'bow_arrow_shot' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shocking Volley', desc: 'Guaranteed Shocked. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'CHAIN VOLLEY', desc: 'Always Shocked + Cursed. Chain to 4. -40% Rapid Fire damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Rapid Evasion', desc: 'On dodge: cast Multi Shot. +5% evasion→damage. 5% leech. +15 resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'rf_b3_n1_ms', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_multi_shot' }] } },
    keystone: { name: 'RAPID SHADOW', desc: 'On dodge: cast Multi Shot. Fortify 3 stacks. -20% Rapid Fire damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'rf_b3_k_ms', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_multi_shot' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 3. MULTI SHOT ────────────────────────────────────────

const MULTI_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Scatter Shot', desc: '25% on crit: cast Rapid Fire. Fork +2. +10% crit.', modifier: { incCritChance: 10, forkCount: 2, procs: [{ id: 'mu_b1_n1_rf', chance: 0.25, trigger: 'onCrit', castSkill: 'bow_rapid_fire' }] } },
    keystone: { name: 'RAIN OF ARROWS', desc: 'Crits always cast Rapid Fire. Fork +4. -35% Multi Shot damage. +5% crit to all skills.', modifier: { incDamage: -35, forkCount: 4, procs: [{ id: 'mu_b1_k_rf', chance: 1.0, trigger: 'onCrit', castSkill: 'bow_rapid_fire' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Toxic Rain', desc: 'Guaranteed Poison. AoE poison spread. +25% poison duration.', modifier: { applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'PLAGUE ARROWS', desc: 'Poison unlimited. Always Cursed. -40% Multi Shot damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Evasive Volley', desc: 'On dodge: cast Arrow Shot. +5% evasion→damage. 5% leech. +15 resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'mu_b3_n1_ar', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_arrow_shot' }] } },
    keystone: { name: 'SHADOW VOLLEY', desc: 'On dodge: cast Arrow Shot. Fortify 3 stacks. -20% Multi Shot damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'mu_b3_k_ar', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_arrow_shot' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 4. BURNING ARROW ─────────────────────────────────────

const BURNING_ARROW_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Inferno Arrow', desc: '25% on crit: cast Multi Shot. On kill: reset Multi Shot CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'ba_b1_n1_ms', chance: 0.25, trigger: 'onCrit', castSkill: 'bow_multi_shot' }, { id: 'ba_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'bow_multi_shot' }] } },
    keystone: { name: 'FIRE STORM', desc: 'Crits always cast Multi Shot. -35% Burning Arrow damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ba_b1_k_ms', chance: 1.0, trigger: 'onCrit', castSkill: 'bow_multi_shot' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Searing Tips', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'CONFLAGRATION', desc: 'Burns always apply Cursed. Burn doubled. -40% Burning Arrow damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Flame Dodge', desc: 'On dodge: cast Rapid Fire. +5% evasion→damage. 5% leech. +15 resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ba_b3_n1_rf', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_rapid_fire' }] } },
    keystone: { name: 'PHOENIX ARROW', desc: 'On dodge: cast Rapid Fire. Fortify 3 stacks. -20% Burning Arrow damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ba_b3_k_rf', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_rapid_fire' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 5. SMOKE ARROW ───────────────────────────────────────

const SMOKE_ARROW_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Ambush Arrow', desc: '25% on crit: cast Burning Arrow. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'sa_b1_n1_ba', chance: 0.25, trigger: 'onCrit', castSkill: 'bow_burning_arrow' }] } },
    keystone: { name: 'SHADOW ARCHER', desc: 'Crits always cast Burning Arrow. -35% Smoke Arrow damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sa_b1_k_ba', chance: 1.0, trigger: 'onCrit', castSkill: 'bow_burning_arrow' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Noxious Cloud', desc: 'Guaranteed Chill + Poison. +25% debuff duration. +5% speed while 3+ debuffs.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'MIASMA', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Smoke Arrow damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Smoke Dodge', desc: 'On dodge: cast Snipe. +5% evasion→damage. 5% leech. +15 resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sa_b3_n1_sn', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_snipe' }] } },
    keystone: { name: 'PHANTOM ARCHER', desc: 'On dodge: cast Snipe. Fortify 3 stacks. -20% Smoke Arrow damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sa_b3_k_sn', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_snipe' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 6. SNIPE ─────────────────────────────────────────────

const SNIPE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Headshot', desc: '25% on crit: cast Smoke Arrow. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'sn_b1_n1_sa', chance: 0.25, trigger: 'onCrit', castSkill: 'bow_smoke_arrow' }] } },
    keystone: { name: 'KILLSHOT', desc: 'Crits always cast Smoke Arrow. Execute below 25%. -35% Snipe damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'sn_b1_k_sa', chance: 1.0, trigger: 'onCrit', castSkill: 'bow_smoke_arrow' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Marked Target', desc: 'Apply Vulnerable + Cursed. +50% vs debuffed. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'ASSASSIN\'S ARROW', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Snipe damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Sniper\'s Dodge', desc: 'On dodge: cast Burning Arrow. +5% evasion→damage. 5% leech. +15 resist.', modifier: { damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sn_b3_n1_ba', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_burning_arrow' }] } },
    keystone: { name: 'GHOST SNIPER', desc: 'On dodge: cast Burning Arrow. Fortify 3 stacks. -20% Snipe damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sn_b3_k_ba', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_burning_arrow' }], globalEffect: { defenseMult: 1.10 } } } },
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

// ─── 7. RAPID FIRE BUFF ──────────────────────────────────

const RAPID_FIRE_BUFF_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Barrage', desc: '+4s duration. -15% cooldown. On activation: reset Arrow Shot CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'rfb_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'bow_arrow_shot' }] } },
    keystone: { name: 'ENDLESS BARRAGE', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Amplified Volley', desc: '+50% buff speed effect. +10% crit while active.', modifier: { abilityEffect: { attackSpeedMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'BULLET HELL', desc: '+100% buff speed effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { attackSpeedMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Barrage Synergy', desc: 'While active: all bow skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'VOLLEY COMMAND', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -7, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 8. PIERCING SHOT (Buff) ──────────────────────────────

const PIERCING_SHOT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Pierce', desc: '+3s duration. -15% cooldown. On activation: reset Snipe CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'ps_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'bow_snipe' }] } },
    keystone: { name: 'ETERNAL PIERCE', desc: '+6s duration. -25% cooldown. -30% effect. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Penetrating Force', desc: '+50% pierce effect. Pierce +3.', modifier: { abilityEffect: { damageMult: 1.50 }, pierceCount: 3 } },
    keystone: { name: 'UNSTOPPABLE ARROW', desc: 'Pierce all. -20% damage. +5% damage to all skills.', modifier: { flags: ['pierce'], incDamage: -20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Pierce Synergy', desc: 'While active: on dodge cast Arrow Shot. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'ps_b3_n1_ar', chance: 1.0, trigger: 'onDodge', castSkill: 'bow_arrow_shot' }] } },
    keystone: { name: 'PIERCING WIND', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -6, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 9. EAGLE EYE (Passive) ───────────────────────────────

const EAGLE_EYE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Keen Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE HUNTER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Eagle Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'MASTER ARCHER', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Bow Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'HAWK LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const ARROW_SHOT_GRAPH     = createCompactTree({ skillId: 'bow_arrow_shot',     prefix: 'ar',  branches: BW_BRANCHES, bridges: BW_BRIDGES, overrides: ARROW_SHOT_OVERRIDES, startName: 'Arrow Focus' });
const RAPID_FIRE_GRAPH     = createCompactTree({ skillId: 'bow_rapid_fire',     prefix: 'rf',  branches: BW_BRANCHES, bridges: BW_BRIDGES, overrides: RAPID_FIRE_OVERRIDES, startName: 'Rapid Core' });
const MULTI_SHOT_GRAPH     = createCompactTree({ skillId: 'bow_multi_shot',     prefix: 'mu',  branches: BW_BRANCHES, bridges: BW_BRIDGES, overrides: MULTI_SHOT_OVERRIDES, startName: 'Volley Core' });
const BURNING_ARROW_GRAPH  = createCompactTree({ skillId: 'bow_burning_arrow',  prefix: 'ba',  branches: BW_BRANCHES, bridges: BW_BRIDGES, overrides: BURNING_ARROW_OVERRIDES, startName: 'Ember Core' });
const SMOKE_ARROW_GRAPH    = createCompactTree({ skillId: 'bow_smoke_arrow',    prefix: 'sma', branches: BW_BRANCHES, bridges: BW_BRIDGES, overrides: SMOKE_ARROW_OVERRIDES, startName: 'Smoke Core' });
const SNIPE_GRAPH          = createCompactTree({ skillId: 'bow_snipe',          prefix: 'sn',  branches: BW_BRANCHES, bridges: BW_BRIDGES, overrides: SNIPE_OVERRIDES, startName: 'Sniper Core' });

const RAPID_FIRE_BUFF_GRAPH = createCompactTree({ skillId: 'bow_rapid_fire_buff', prefix: 'rfb', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: RAPID_FIRE_BUFF_OVERRIDES, startName: 'Barrage Core' });
const PIERCING_SHOT_GRAPH   = createCompactTree({ skillId: 'bow_piercing_shot',   prefix: 'ps',  branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: PIERCING_SHOT_OVERRIDES, startName: 'Pierce Core' });

const EAGLE_EYE_GRAPH      = createCompactTree({ skillId: 'bow_eagle_eye',      prefix: 'ee',  branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: EAGLE_EYE_OVERRIDES, startName: 'Eagle Focus' });

// ─── Export ────────────────────────────────────────────────

export const BOW_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'bow_arrow_shot':      ARROW_SHOT_GRAPH,
  'bow_rapid_fire':      RAPID_FIRE_GRAPH,
  'bow_multi_shot':      MULTI_SHOT_GRAPH,
  'bow_burning_arrow':   BURNING_ARROW_GRAPH,
  'bow_smoke_arrow':     SMOKE_ARROW_GRAPH,
  'bow_snipe':           SNIPE_GRAPH,
  'bow_rapid_fire_buff': RAPID_FIRE_BUFF_GRAPH,
  'bow_piercing_shot':   PIERCING_SHOT_GRAPH,
  'bow_eagle_eye':       EAGLE_EYE_GRAPH,
};

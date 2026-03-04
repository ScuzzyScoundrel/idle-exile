// ============================================================
// Idle Exile — Tome Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Forbidden Knowledge — chaos, curse, raw spell power, crit
//   B2 Chronomancy         — CD reset, slowed, debuff duration
//   B3 Sage's Wisdom       — global buffs, support, fortify, resist
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_FORBIDDEN_KNOWLEDGE: BranchTemplate = {
  name: 'Forbidden Knowledge',
  root:  { name: 'Dark Insight',    desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Eldritch Power',  desc: '+8% crit multiplier. +3% cast speed.', modifier: { incCritMultiplier: 8, incCastSpeed: 3 } },
};

const B2_CHRONOMANCY: BranchTemplate = {
  name: 'Chronomancy',
  root:  { name: 'Time Warp',      desc: '+3% damage. 15% on hit: Chilled (3s).', modifier: { incDamage: 3, procs: [{ id: 'tm_b2_chill', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Temporal Bind',   desc: 'Guaranteed Chilled. 15% on hit: Weakened (2s).', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 3 }, procs: [{ id: 'tm_b2_weak', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } },
};

const B3_SAGES_WISDOM: BranchTemplate = {
  name: 'Sage\'s Wisdom',
  root:  { name: 'Ancient Ward',    desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Sage Shield',     desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Dark Chrono',    desc: '+3% crit, 10% on hit: Chilled (2s).',   modifier: { incCritChance: 3, procs: [{ id: 'tm_x12_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Sage Time',      desc: '+5 all resist, 10% on hit: Chilled (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'tm_x23_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Wisdom Strike',  desc: '+2 life on hit, +3% crit chance',    modifier: { lifeOnHit: 2, incCritChance: 3 } };

const TM_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_FORBIDDEN_KNOWLEDGE, B2_CHRONOMANCY, B3_SAGES_WISDOM];
const TM_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// B1 (onCrit cast)              B2 (debuff/reset)              B3 (onDodge cast)
// Incantation   → Apocalypse    | Cursed+Weakened              | onDodge → Glacial Tome
// Eldritch Bar  → Incantation   | Chilled chain                | onDodge → Inferno Page
// Inferno Page  → Eldritch Bar  | Burn always, +burn DPS       | onDodge → Thunderscript
// Glacial Tome  → Curse of Dec  | Chill+Weakened               | onDodge → Eldritch Barrage
// Thunderscript → Glacial Tome  | Shocked chain                | onDodge → Incantation
// Curse of Decay→ Thunderscript | Cursed stacking, poison      | onDodge → Inferno Page
// Apocalypse    → Curse of Dec  | Vulnerable+execute           | onDodge → Eldritch Barrage

// ─── 1. INCANTATION ─────────────────────────────────────────

const INCANTATION_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Dark Invocation', desc: '25% on crit: cast Apocalypse. On kill: reset Apocalypse CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'tin_b1_n1_ap', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_apocalypse' }, { id: 'tin_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'tome_apocalypse' }] } },
    keystone: { name: 'FORBIDDEN CHANT', desc: 'Crits always cast Apocalypse. -35% Incantation damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'tin_b1_k_ap', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_apocalypse' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Temporal Curse', desc: 'Guaranteed Cursed + Weakened. +25% debuff duration. +50% vs cursed.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'cursed', incDamage: 50 } } } },
    keystone: { name: 'CHRONO CURSE', desc: 'Always Cursed. Debuffs doubled. -40% Incantation damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Sage\'s Incantation', desc: 'On dodge: cast Glacial Tome. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'tin_b3_n1_gt', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_glacial_tome' }] } },
    keystone: { name: 'ANCIENT CHANT', desc: 'On dodge: cast Glacial Tome. Fortify 3 stacks. -20% Incantation damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'tin_b3_k_gt', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_glacial_tome' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. ELDRITCH BARRAGE ─────────────────────────────────────

const ELDRITCH_BARRAGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Eldritch Surge', desc: '25% on crit: cast Incantation. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'teb_b1_n1_in', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_incantation' }] } },
    keystone: { name: 'ELDRITCH STORM', desc: 'Crits always cast Incantation. +3 extra hits. -35% Eldritch Barrage damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 3, procs: [{ id: 'teb_b1_k_in', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_incantation' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Chrono Barrage', desc: 'Guaranteed Chilled. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'TIME BARRAGE', desc: 'Always Chilled + Cursed. Chain to 4. -40% Eldritch Barrage damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Sage Barrage', desc: 'On dodge: cast Inferno Page. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'teb_b3_n1_ip', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_inferno_page' }] } },
    keystone: { name: 'ELDRITCH WARD', desc: 'On dodge: cast Inferno Page. Fortify 3 stacks. -20% Eldritch Barrage damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'teb_b3_k_ip', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_inferno_page' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. INFERNO PAGE ─────────────────────────────────────────

const INFERNO_PAGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Blazing Script', desc: '25% on crit: cast Eldritch Barrage. On kill: reset Eldritch Barrage CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'tip_b1_n1_eb', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_eldritch_barrage' }, { id: 'tip_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'tome_eldritch_barrage' }] } },
    keystone: { name: 'INFERNAL TOME', desc: 'Crits always cast Eldritch Barrage. -35% Inferno Page damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'tip_b1_k_eb', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_eldritch_barrage' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Searing Pages', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'CONFLAGRATION', desc: 'Burns always apply Cursed. Burn doubled. -40% Inferno Page damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Ward', desc: 'On dodge: cast Thunderscript. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'tip_b3_n1_ts', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_thunderscript' }] } },
    keystone: { name: 'FLAME FORTRESS', desc: 'On dodge: cast Thunderscript. Fortify 3 stacks. -20% Inferno Page damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'tip_b3_k_ts', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_thunderscript' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. GLACIAL TOME ─────────────────────────────────────────

const GLACIAL_TOME_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Frozen Script', desc: '25% on crit: cast Curse of Decay. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'tgt_b1_n1_cd', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_curse_of_decay' }] } },
    keystone: { name: 'ABSOLUTE FROST', desc: 'Crits always cast Curse of Decay. +2 extra hits. -35% Glacial Tome damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'tgt_b1_k_cd', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_curse_of_decay' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Deep Chill', desc: 'Guaranteed Chill + Weakened. +25% debuff duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'PERMAFROST', desc: 'Always Chilled + Cursed. Debuffs doubled. -40% Glacial Tome damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Ward', desc: 'On dodge: cast Eldritch Barrage. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'tgt_b3_n1_eb', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_eldritch_barrage' }] } },
    keystone: { name: 'ICE FORTRESS', desc: 'On dodge: cast Eldritch Barrage. Fortify 3 stacks. -20% Glacial Tome damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'tgt_b3_k_eb', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_eldritch_barrage' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. THUNDERSCRIPT ────────────────────────────────────────

const THUNDERSCRIPT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Storm Script', desc: '25% on crit: cast Glacial Tome. Chain to 2 targets. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'tts_b1_n1_gt', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_glacial_tome' }] } },
    keystone: { name: 'CHAIN LIGHTNING', desc: 'Crits always cast Glacial Tome. Chain to 4. -35% Thunderscript damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'tts_b1_k_gt', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_glacial_tome' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Shocking Script', desc: 'Guaranteed Shocked. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'STORM CONDUIT', desc: 'Always Shocked + Cursed. Chain to 4. -40% Thunderscript damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Thunder Ward', desc: 'On dodge: cast Incantation. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'tts_b3_n1_in', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_incantation' }] } },
    keystone: { name: 'THUNDER FORTRESS', desc: 'On dodge: cast Incantation. Fortify 3 stacks. -20% Thunderscript damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'tts_b3_k_in', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_incantation' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. CURSE OF DECAY ──────────────────────────────────────

const CURSE_OF_DECAY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Dark Decay', desc: '25% on crit: cast Thunderscript. On kill: reset Thunderscript CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'tcd_b1_n1_ts', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_thunderscript' }, { id: 'tcd_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'tome_thunderscript' }] } },
    keystone: { name: 'DOOM SCRIPT', desc: 'Crits always cast Thunderscript. -35% Curse of Decay damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'tcd_b1_k_ts', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_thunderscript' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Stacking Curse', desc: 'Guaranteed Cursed. Poison on hit. +25% debuff duration. +50% vs cursed.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'cursed', incDamage: 50 } }, procs: [{ id: 'tcd_b2_n1_psn', chance: 1.0, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 4 } }] } },
    keystone: { name: 'ENDLESS DECAY', desc: 'Always Cursed + Poisoned. Debuffs doubled. -40% Curse of Decay damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Decay Ward', desc: 'On dodge: cast Inferno Page. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'tcd_b3_n1_ip', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_inferno_page' }] } },
    keystone: { name: 'DECAY FORTRESS', desc: 'On dodge: cast Inferno Page. Fortify 3 stacks. -20% Curse of Decay damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'tcd_b3_k_ip', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_inferno_page' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 7. APOCALYPSE ───────────────────────────────────────────

const APOCALYPSE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Cataclysm', desc: '25% on crit: cast Curse of Decay. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'tap_b1_n1_cd', chance: 0.25, trigger: 'onCrit', castSkill: 'tome_curse_of_decay' }] } },
    keystone: { name: 'ARMAGEDDON', desc: 'Crits always cast Curse of Decay. Execute below 25%. -35% Apocalypse damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'tap_b1_k_cd', chance: 1.0, trigger: 'onCrit', castSkill: 'tome_curse_of_decay' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Doom Script', desc: 'Guaranteed Vulnerable. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'EXTINCTION', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Apocalypse damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Apocalypse Ward', desc: 'On dodge: cast Eldritch Barrage. +5% armor→damage. 5% leech. +15 resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'tap_b3_n1_eb', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_eldritch_barrage' }] } },
    keystone: { name: 'DOOMSDAY FORTRESS', desc: 'On dodge: cast Eldritch Barrage. Fortify 3 stacks. -20% Apocalypse damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'tap_b3_k_eb', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_eldritch_barrage' }], globalEffect: { defenseMult: 1.10 } } },
  },
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

// ─── 8. FORBIDDEN KNOWLEDGE (Buff) ──────────────────────────

const FORBIDDEN_KNOWLEDGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Knowledge', desc: '+4s duration. -15% cooldown. On activation: reset Incantation CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'tfk_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'tome_incantation' }] } },
    keystone: { name: 'ENDLESS KNOWLEDGE', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Amplified Knowledge', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'DARK ENLIGHTENMENT', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Knowledge Synergy', desc: 'While active: all tome skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'FORBIDDEN MASTERY', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -7, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. ELDRITCH WARD (Buff) ─────────────────────────────────

const ELDRITCH_WARD_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Ward', desc: '+3s duration. -15% cooldown. On activation: reset Apocalypse CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'tew_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'tome_apocalypse' }] } },
    keystone: { name: 'ETERNAL WARD', desc: '+6s duration. -25% cooldown. -30% resist bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { resistBonus: -15 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Empowered Ward', desc: '+50% resist buff effect. +10 all resist.', modifier: { abilityEffect: { resistBonus: 25 }, incCritChance: 5 } },
    keystone: { name: 'ABSOLUTE WARD', desc: '+100% resist buff effect. -20% damage. +5% crit to all skills.', modifier: { abilityEffect: { resistBonus: 50 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Ward Synergy', desc: 'While active: on dodge cast Incantation. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'tew_b3_n1_in', chance: 1.0, trigger: 'onDodge', castSkill: 'tome_incantation' }] } },
    keystone: { name: 'ELDRITCH MASTERY', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. ANCIENT WISDOM (Passive) ────────────────────────────

const ANCIENT_WISDOM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Tome Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE SEEKER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Sage\'s Insight', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'GRAND SCHOLAR', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Tome Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'ARCHSAGE', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const INCANTATION_GRAPH      = createCompactTree({ skillId: 'tome_incantation',       prefix: 'tin', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: INCANTATION_OVERRIDES, startName: 'Chant Core' });
const ELDRITCH_BARRAGE_GRAPH = createCompactTree({ skillId: 'tome_eldritch_barrage',  prefix: 'teb', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: ELDRITCH_BARRAGE_OVERRIDES, startName: 'Barrage Core' });
const INFERNO_PAGE_GRAPH     = createCompactTree({ skillId: 'tome_inferno_page',      prefix: 'tip', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: INFERNO_PAGE_OVERRIDES, startName: 'Flame Core' });
const GLACIAL_TOME_GRAPH     = createCompactTree({ skillId: 'tome_glacial_tome',      prefix: 'tgt', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: GLACIAL_TOME_OVERRIDES, startName: 'Frost Core' });
const THUNDERSCRIPT_GRAPH    = createCompactTree({ skillId: 'tome_thunderscript',     prefix: 'tts', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: THUNDERSCRIPT_OVERRIDES, startName: 'Storm Core' });
const CURSE_OF_DECAY_GRAPH   = createCompactTree({ skillId: 'tome_curse_of_decay',    prefix: 'tcd', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: CURSE_OF_DECAY_OVERRIDES, startName: 'Decay Core' });
const APOCALYPSE_GRAPH       = createCompactTree({ skillId: 'tome_apocalypse',        prefix: 'tap', branches: TM_BRANCHES, bridges: TM_BRIDGES, overrides: APOCALYPSE_OVERRIDES, startName: 'Doom Core' });

const FORBIDDEN_KNOWLEDGE_GRAPH = createCompactTree({ skillId: 'tome_forbidden_knowledge', prefix: 'tfk', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: FORBIDDEN_KNOWLEDGE_OVERRIDES, startName: 'Knowledge Core' });
const ELDRITCH_WARD_GRAPH       = createCompactTree({ skillId: 'tome_eldritch_ward',       prefix: 'tew', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: ELDRITCH_WARD_OVERRIDES, startName: 'Ward Core' });

const ANCIENT_WISDOM_GRAPH     = createCompactTree({ skillId: 'tome_ancient_wisdom',      prefix: 'taw', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: ANCIENT_WISDOM_OVERRIDES, startName: 'Wisdom Core' });

// ─── Export ────────────────────────────────────────────────

export const TOME_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'tome_incantation':        INCANTATION_GRAPH,
  'tome_eldritch_barrage':   ELDRITCH_BARRAGE_GRAPH,
  'tome_inferno_page':       INFERNO_PAGE_GRAPH,
  'tome_glacial_tome':       GLACIAL_TOME_GRAPH,
  'tome_thunderscript':      THUNDERSCRIPT_GRAPH,
  'tome_curse_of_decay':     CURSE_OF_DECAY_GRAPH,
  'tome_apocalypse':         APOCALYPSE_GRAPH,
  'tome_forbidden_knowledge': FORBIDDEN_KNOWLEDGE_GRAPH,
  'tome_eldritch_ward':       ELDRITCH_WARD_GRAPH,
  'tome_ancient_wisdom':      ANCIENT_WISDOM_GRAPH,
};

// ============================================================
// Idle Exile — Axe Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Brutality  — flat damage, overkill, raw power
//   B2 Rend       — bleed DoT, spread, debuffs
//   B3 Berserker  — self-damage, berserk, risk/reward
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_BRUTALITY: BranchTemplate = {
  name: 'Brutality',
  root:  { name: 'Heavy Blow',    desc: '+5% damage, +4 flat damage',    modifier: { incDamage: 5, flatDamage: 4 } },
  minor: { name: 'Savage Force',   desc: '+5% crit multiplier, +3 flat damage. 10% overkill carry.', modifier: { incCritMultiplier: 5, flatDamage: 3, overkillDamage: 10 } },
};

const B2_REND: BranchTemplate = {
  name: 'Rend',
  root:  { name: 'Jagged Edge',   desc: '+3% damage. 20% on hit: Bleed (3s).', modifier: { incDamage: 3, procs: [{ id: 'ax_b2_bleed', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Deep Wound',    desc: 'Guaranteed Bleed. 15% on hit: Poison (3s).', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 3 }, procs: [{ id: 'ax_b2_poison', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 3 } }] } },
};

const B3_BERSERKER: BranchTemplate = {
  name: 'Berserker',
  root:  { name: 'Battle Hunger', desc: '+5 life on kill, +3% damage',    modifier: { lifeOnKill: 5, incDamage: 3 } },
  minor: { name: 'Blood Frenzy',  desc: '+5% damage, 2% self damage per cast. +3 life on hit.', modifier: { incDamage: 5, selfDamagePercent: 2, lifeOnHit: 3 } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Brutal Rend',     desc: '+3% damage, 10% on hit: Bleed (2s).', modifier: { incDamage: 3, procs: [{ id: 'ax_x12_bleed', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Feral Instinct',  desc: '+3 life on kill, 10% on hit: Poison (2s).', modifier: { lifeOnKill: 3, procs: [{ id: 'ax_x23_poison', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'poisoned', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Savage Reflex',   desc: '+3 life on hit, +3% crit chance',    modifier: { lifeOnHit: 3, incCritChance: 3 } };

const AX_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_BRUTALITY, B2_REND, B3_BERSERKER];
const AX_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)       B2 (debuff/reset)          B3 (berserk proc)
// Chop      → Frenzy     | Bleed + spread on kill   | onKill → Decapitate
// Frenzy    → Searing Axe| Vulnerable + speed       | onKill → Chop
// Cleave    → Decapitate | Bleed AoE, spread        | onKill → Frost Rend
// SearingAxe→ Chop       | Burn always, +burn DPS   | onKill → Frenzy
// Rend      → Frost Rend | Bleed stacking, Cursed   | onKill → Searing Axe
// Decapitate→ Rend       | Execute, Vulnerable      | onKill → Cleave
// FrostRend → Cleave     | Chill+Slow, shatter      | onKill → Rend

// ─── 1. CHOP ──────────────────────────────────────────────

const CHOP_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Splitting Blow', desc: '25% on crit: cast Frenzy. On kill: reset Frenzy CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'ch_b1_n1_fr', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_frenzy' }, { id: 'ch_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'axe_frenzy' }] } },
    keystone: { name: 'BUTCHER\'S CLEAVE', desc: 'Crits always cast Frenzy. -35% Chop damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ch_b1_k_fr', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_frenzy' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Rending Chop', desc: 'Guaranteed Bleed. +25% bleed duration. On kill: spread bleeds to next target.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'ch_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'HEMORRHAGE', desc: 'Bleeds deal 2x damage. Always apply Cursed. -40% Chop damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Bloodthirst', desc: 'On kill: cast Decapitate. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 'ch_b3_n1_dec', chance: 1.0, trigger: 'onKill', castSkill: 'axe_decapitate' }] } },
    keystone: { name: 'BLOOD RAGE', desc: 'On kill: always cast Decapitate. Berserk (+50% damage, +25% damage taken). -20% Chop damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 'ch_b3_k_dec', chance: 1.0, trigger: 'onKill', castSkill: 'axe_decapitate' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 2. FRENZY ─────────────────────────────────────────────

const FRENZY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Frantic Strikes', desc: '25% on crit: cast Searing Axe. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'fr_b1_n1_sa', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_searing_axe' }] } },
    keystone: { name: 'WILD FRENZY', desc: 'Crits always cast Searing Axe. +2 extra hits. -35% Frenzy damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'fr_b1_k_sa', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_searing_axe' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Weakening Frenzy', desc: 'Guaranteed Vulnerable. +50% damage vs debuffed. +5% cast speed while 3+ debuffs.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'RAVAGE', desc: 'Always Vulnerable + Cursed. Debuff effects doubled. -40% Frenzy damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Rampage', desc: 'On kill: cast Chop. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 'fr_b3_n1_ch', chance: 1.0, trigger: 'onKill', castSkill: 'axe_chop' }] } },
    keystone: { name: 'UNRELENTING', desc: 'On kill: always cast Chop. Berserk (+50% damage, +25% damage taken). -20% Frenzy damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 'fr_b3_k_ch', chance: 1.0, trigger: 'onKill', castSkill: 'axe_chop' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 3. CLEAVE ─────────────────────────────────────────────

const CLEAVE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Wide Arc', desc: '25% on crit: cast Decapitate. Convert to AoE. +10% crit.', modifier: { incCritChance: 10, convertToAoE: true, procs: [{ id: 'cl_b1_n1_dec', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_decapitate' }] } },
    keystone: { name: 'MASS EXECUTION', desc: 'Crits always cast Decapitate. +2 extra hits. -35% Cleave damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'cl_b1_k_dec', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_decapitate' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Rending Arc', desc: 'Guaranteed Bleed. AoE bleed on hit. +25% bleed duration. On kill: spread.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'cl_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'BLOODBATH', desc: 'Bleeds deal 2x. Always Cursed. -40% Cleave damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Berserk Cleave', desc: 'On kill: cast Frost Rend. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 'cl_b3_n1_frd', chance: 1.0, trigger: 'onKill', castSkill: 'axe_frost_rend' }] } },
    keystone: { name: 'SLAUGHTER', desc: 'On kill: always cast Frost Rend. Berserk (+50% damage, +25% damage taken). -20% Cleave damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 'cl_b3_k_frd', chance: 1.0, trigger: 'onKill', castSkill: 'axe_frost_rend' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 4. SEARING AXE ───────────────────────────────────────

const SEARING_AXE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Molten Edge', desc: '25% on crit: cast Chop. On kill: reset Chop CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'sa_b1_n1_ch', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_chop' }, { id: 'sa_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'axe_chop' }] } },
    keystone: { name: 'INFERNO AXE', desc: 'Crits always cast Chop. -35% Searing Axe damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sa_b1_k_ch', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_chop' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Searing Wound', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'MAGMA REND', desc: 'Burns always apply Cursed. Burn effects doubled. -40% Searing Axe damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Frenzy', desc: 'On kill: cast Frenzy. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 'sa_b3_n1_fr', chance: 1.0, trigger: 'onKill', castSkill: 'axe_frenzy' }] } },
    keystone: { name: 'PYROMANIAC', desc: 'On kill: always cast Frenzy. Berserk (+50% damage, +25% damage taken). -20% Searing Axe damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 'sa_b3_k_fr', chance: 1.0, trigger: 'onKill', castSkill: 'axe_frenzy' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 5. REND ───────────────────────────────────────────────

const REND_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Savage Rend', desc: '25% on crit: cast Frost Rend. On kill: reset Frost Rend CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 're_b1_n1_frd', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_frost_rend' }, { id: 're_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'axe_frost_rend' }] } },
    keystone: { name: 'EVISCERATOR', desc: 'Crits always cast Frost Rend. -35% Rend damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 're_b1_k_frd', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_frost_rend' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Festering Wounds', desc: 'Bleed stacks to 5. Guaranteed Cursed on bleeding targets. +25% bleed duration.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'EXSANGUINATE', desc: 'Infinite bleed stacks. All debuff effects doubled. -40% Rend damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Berserk Rend', desc: 'On kill: cast Searing Axe. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 're_b3_n1_sa', chance: 1.0, trigger: 'onKill', castSkill: 'axe_searing_axe' }] } },
    keystone: { name: 'CARNAGE', desc: 'On kill: always cast Searing Axe. Berserk (+50% damage, +25% damage taken). -20% Rend damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 're_b3_k_sa', chance: 1.0, trigger: 'onKill', castSkill: 'axe_searing_axe' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 6. DECAPITATE ─────────────────────────────────────────

const DECAPITATE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Headhunter', desc: '25% on crit: cast Rend. Execute: 3x below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'dc_b1_n1_re', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_rend' }] } },
    keystone: { name: 'GUILLOTINE', desc: 'Crits always cast Rend. Execute below 25%. -35% Decapitate damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'dc_b1_k_re', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_rend' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Marked for Death', desc: 'Apply Vulnerable + Cursed on hit. +50% damage vs debuffed.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } } } },
    keystone: { name: 'DEATH MARK', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Decapitate damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Bloodlust', desc: 'On kill: cast Cleave. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 'dc_b3_n1_cl', chance: 1.0, trigger: 'onKill', castSkill: 'axe_cleave' }] } },
    keystone: { name: 'BUTCHER', desc: 'On kill: always cast Cleave. Berserk (+50% damage, +25% damage taken). -20% Decapitate damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 'dc_b3_k_cl', chance: 1.0, trigger: 'onKill', castSkill: 'axe_cleave' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 7. FROST REND ─────────────────────────────────────────

const FROST_REND_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Glacial Cleave', desc: '25% on crit: cast Cleave. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'frd_b1_n1_cl', chance: 0.25, trigger: 'onCrit', castSkill: 'axe_cleave' }] } },
    keystone: { name: 'AVALANCHE', desc: 'Crits always cast Cleave. +2 extra hits. -35% Frost Rend damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'frd_b1_k_cl', chance: 1.0, trigger: 'onCrit', castSkill: 'axe_cleave' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Frostbite', desc: 'Guaranteed Chill + Slow. +25% debuff duration. Frozen take 50% more.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'DEEP FREEZE', desc: 'Always Chill + Cursed. Shatter on frozen kill. -40% Frost Rend damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, overkillDamage: 50, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frozen Fury', desc: 'On kill: cast Rend. +10% damage, +5% self damage. +8 life on kill.', modifier: { incDamage: 10, selfDamagePercent: 5, lifeOnKill: 8, procs: [{ id: 'frd_b3_n1_re', chance: 1.0, trigger: 'onKill', castSkill: 'axe_rend' }] } },
    keystone: { name: 'ICE BERSERKER', desc: 'On kill: always cast Rend. Berserk (+50% damage, +25% damage taken). -20% Frost Rend damage. +10% damage to all skills.', modifier: { incDamage: -20, berserk: { damageBonus: 50, damageTakenIncrease: 25, lifeThreshold: 30 }, procs: [{ id: 'frd_b3_k_re', chance: 1.0, trigger: 'onKill', castSkill: 'axe_rend' }], globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 8. CLEAVE BUFF ────────────────────────────────────────
// (Note: ability ID is axe_cleave → renamed to axe_cleave_buff)

// Buff branch templates (reuse from sword pattern)
const BUFF_B1: BranchTemplate = {
  name: 'Duration',
  root:  { name: 'Extended Focus', desc: '+2s duration, -5% cooldown',        modifier: { durationBonus: 2, cooldownReduction: 5 } },
  minor: { name: 'Steady Pulse',   desc: '+2s duration, +3% cast speed',      modifier: { durationBonus: 2, incCastSpeed: 3 } },
};
const BUFF_B2: BranchTemplate = {
  name: 'Amplification',
  root:  { name: 'Empowered',      desc: '+5% buff effect, +3% damage',       modifier: { abilityEffect: { damageMult: 1.05 }, incDamage: 3 } },
  minor: { name: 'Intensify',      desc: '+5% buff effect, +3% crit chance',  modifier: { abilityEffect: { damageMult: 1.05 }, incCritChance: 3 } },
};
const BUFF_B3: BranchTemplate = {
  name: 'Synergy',
  root:  { name: 'Linked Power',   desc: '+3% damage to all skills, +3 life on hit', modifier: { globalEffect: { damageMult: 1.03 }, lifeOnHit: 3 } },
  minor: { name: 'Resonance',      desc: '+3% crit to all skills, +5 resist', modifier: { globalEffect: { critChanceBonus: 3 }, abilityEffect: { resistBonus: 5 } } },
};
const BUFF_BRIDGE_12: BridgeTemplate = { name: 'Sustained Power',  desc: '+1s duration, +3% buff effect',  modifier: { durationBonus: 1, abilityEffect: { damageMult: 1.03 } } };
const BUFF_BRIDGE_23: BridgeTemplate = { name: 'Shared Strength',  desc: '+3% buff effect, +5 resist',     modifier: { abilityEffect: { damageMult: 1.03, resistBonus: 5 } } };
const BUFF_BRIDGE_31: BridgeTemplate = { name: 'Enduring Link',    desc: '+1s duration, +2 life on hit',   modifier: { durationBonus: 1, lifeOnHit: 2 } };
const BUFF_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [BUFF_B1, BUFF_B2, BUFF_B3];
const BUFF_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BUFF_BRIDGE_12, BUFF_BRIDGE_23, BUFF_BRIDGE_31];

const CLEAVE_BUFF_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Duration
    notable: { name: 'Sustained Cleave', desc: '+4s duration. -15% cooldown. On activation: reset Chop CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'clb_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'axe_chop' }] } },
    keystone: { name: 'ENDLESS CLEAVING', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } },
  },
  { // B2 — Amplification
    notable: { name: 'Heightened Cleave', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'MASSACRE', desc: '+100% buff damage effect. +20% self damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } },
  },
  { // B3 — Synergy
    notable: { name: 'Cleave Synergy', desc: 'While active: all axe skills gain +5% crit. Fortify 2 stacks on activation.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'WAR SHOUT', desc: 'While active: all skills gain +10% damage. -50% buff duration. +10% damage to all skills.', modifier: { durationBonus: -10, globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 9. BERSERKER RAGE (Buff) ──────────────────────────────

const BERSERKER_RAGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Duration
    notable: { name: 'Sustained Rage', desc: '+3s duration. -15% cooldown. On activation: reset Frenzy CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'br_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'axe_frenzy' }] } },
    keystone: { name: 'ETERNAL RAGE', desc: '+6s duration. -25% cooldown. -30% buff effect. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2 — Amplification
    notable: { name: 'Maddened', desc: '+50% buff damage effect. +5% self damage. +10 life on kill.', modifier: { abilityEffect: { damageMult: 1.50 }, selfDamagePercent: 5, lifeOnKill: 10 } },
    keystone: { name: 'UNSTOPPABLE RAGE', desc: '+100% buff damage effect. +25% self damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 25, globalEffect: { damageMult: 1.05 } } },
  },
  { // B3 — Synergy
    notable: { name: 'Rage Synergy', desc: 'While active: all skills gain +5% damage. Berserk (+20% damage, +10% taken).', modifier: { berserk: { damageBonus: 20, damageTakenIncrease: 10, lifeThreshold: 30 }, globalEffect: { damageMult: 1.05 } } },
    keystone: { name: 'BLOOD PACT', desc: 'While active: all skills gain +10% damage, +10% life leech. -50% duration. +10% damage to all skills.', modifier: { durationBonus: -6, leechPercent: 10, globalEffect: { damageMult: 1.10 } } },
  },
];

// ─── 10. HEAVY BLOWS (Passive) ─────────────────────────────

const PASSIVE_B1: BranchTemplate = {
  name: 'Drop Rate',
  root:  { name: 'Scavenger',      desc: '+5% item drops, +3% material drops',   modifier: { abilityEffect: { itemDropMult: 1.05, materialDropMult: 1.03 } } },
  minor: { name: 'Prospector',     desc: '+5% material drops, +3% item drops',   modifier: { abilityEffect: { materialDropMult: 1.05, itemDropMult: 1.03 } } },
};
const PASSIVE_B2: BranchTemplate = {
  name: 'XP & Progression',
  root:  { name: 'Quick Learner',  desc: '+5% XP, +3% item drops',              modifier: { abilityEffect: { xpMult: 1.05, itemDropMult: 1.03 } } },
  minor: { name: 'Studious',       desc: '+5% XP, +3% material drops',           modifier: { abilityEffect: { xpMult: 1.05, materialDropMult: 1.03 } } },
};
const PASSIVE_B3: BranchTemplate = {
  name: 'Global Power',
  root:  { name: 'Inner Strength', desc: '+3% damage, +3% crit chance',          modifier: { incDamage: 3, incCritChance: 3 } },
  minor: { name: 'Focus',          desc: '+3% cast speed, +3% crit multiplier',  modifier: { incCastSpeed: 3, incCritMultiplier: 3 } },
};
const PASSIVE_BRIDGE_12: BridgeTemplate = { name: 'Lucky Find',     desc: '+3% items, +3% XP',           modifier: { abilityEffect: { itemDropMult: 1.03, xpMult: 1.03 } } };
const PASSIVE_BRIDGE_23: BridgeTemplate = { name: 'Enlightened',    desc: '+3% XP, +3% damage',          modifier: { abilityEffect: { xpMult: 1.03 }, incDamage: 3 } };
const PASSIVE_BRIDGE_31: BridgeTemplate = { name: 'Power Finds',   desc: '+3% items, +3% crit',         modifier: { abilityEffect: { itemDropMult: 1.03 }, incCritChance: 3 } };
const PASSIVE_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [PASSIVE_B1, PASSIVE_B2, PASSIVE_B3];
const PASSIVE_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [PASSIVE_BRIDGE_12, PASSIVE_BRIDGE_23, PASSIVE_BRIDGE_31];

const HEAVY_BLOWS_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Drop Rate
    notable: { name: 'War Spoils', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'PLUNDER', desc: '+25% item drops. +25% material drops. -10% damage. +5% item drops to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } },
  },
  { // B2 — XP
    notable: { name: 'Battle Hardened', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'VETERAN', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } },
  },
  { // B3 — Global Power
    notable: { name: 'Axe Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'WARLORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } },
  },
];

// ─── Build all trees ───────────────────────────────────────

const CHOP_GRAPH          = createCompactTree({ skillId: 'axe_chop',          prefix: 'ch',  branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: CHOP_OVERRIDES, startName: 'Cleaving Focus' });
const FRENZY_GRAPH        = createCompactTree({ skillId: 'axe_frenzy',        prefix: 'fr',  branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: FRENZY_OVERRIDES, startName: 'Frenzy Core' });
const CLEAVE_GRAPH        = createCompactTree({ skillId: 'axe_cleave',        prefix: 'acl', branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: CLEAVE_OVERRIDES, startName: 'Wide Arc' });
const SEARING_AXE_GRAPH   = createCompactTree({ skillId: 'axe_searing_axe',   prefix: 'sa',  branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: SEARING_AXE_OVERRIDES, startName: 'Ember Core' });
const REND_GRAPH          = createCompactTree({ skillId: 'axe_rend',          prefix: 're',  branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: REND_OVERRIDES, startName: 'Rend Focus' });
const DECAPITATE_GRAPH    = createCompactTree({ skillId: 'axe_decapitate',    prefix: 'dc',  branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: DECAPITATE_OVERRIDES, startName: 'Death\'s Edge' });
const FROST_REND_GRAPH    = createCompactTree({ skillId: 'axe_frost_rend',    prefix: 'frd', branches: AX_BRANCHES, bridges: AX_BRIDGES, overrides: FROST_REND_OVERRIDES, startName: 'Frost Core' });

const CLEAVE_BUFF_GRAPH   = createCompactTree({ skillId: 'axe_cleave_buff',   prefix: 'clb', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: CLEAVE_BUFF_OVERRIDES, startName: 'Cleave Mastery' });
const BERSERKER_RAGE_GRAPH = createCompactTree({ skillId: 'axe_berserker_rage', prefix: 'br',  branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: BERSERKER_RAGE_OVERRIDES, startName: 'Rage Core' });

const HEAVY_BLOWS_GRAPH   = createCompactTree({ skillId: 'axe_heavy_blows',   prefix: 'hb',  branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: HEAVY_BLOWS_OVERRIDES, startName: 'Heavy Focus' });

// ─── Export ────────────────────────────────────────────────

export const AXE_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'axe_chop':           CHOP_GRAPH,
  'axe_frenzy':         FRENZY_GRAPH,
  'axe_cleave':         CLEAVE_GRAPH,
  'axe_searing_axe':    SEARING_AXE_GRAPH,
  'axe_rend':           REND_GRAPH,
  'axe_decapitate':     DECAPITATE_GRAPH,
  'axe_frost_rend':     FROST_REND_GRAPH,
  'axe_cleave_buff':    CLEAVE_BUFF_GRAPH,
  'axe_berserker_rage': BERSERKER_RAGE_GRAPH,
  'axe_heavy_blows':    HEAVY_BLOWS_GRAPH,
};

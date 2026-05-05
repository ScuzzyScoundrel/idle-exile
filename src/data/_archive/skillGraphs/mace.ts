// ============================================================
// Idle Exile — Mace Skill Graphs (Compact 16-node trees)
// 6 active + 2 buff + 1 passive = 9 trees
// Branch archetypes:
//   B1 Concussion   — slow, weakened, stun-like
//   B2 Earthbreaker — AoE, aftershock, extra hits
//   B3 Juggernaut   — armor→damage, fortify, tank
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_CONCUSSION: BranchTemplate = {
  name: 'Concussion',
  root:  { name: 'Heavy Impact',   desc: '+5% damage, +3 flat damage',    modifier: { incDamage: 5, flatDamage: 3 } },
  minor: { name: 'Staggering Blow', desc: '+5% crit mult. 15% on hit: Slowed (2s).', modifier: { incCritMultiplier: 5, procs: [{ id: 'mc_b1_slow', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'slowed', stacks: 1, duration: 2 } }] } },
};

const B2_EARTHBREAKER: BranchTemplate = {
  name: 'Earthbreaker',
  root:  { name: 'Ground Slam',    desc: '+3% damage. Convert to AoE.',   modifier: { incDamage: 3, convertToAoE: true } },
  minor: { name: 'Aftershock',     desc: '+1 extra hit. 15% on hit: Shocked (3s).', modifier: { extraHits: 1, procs: [{ id: 'mc_b2_shock', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 3 } }] } },
};

const B3_JUGGERNAUT: BranchTemplate = {
  name: 'Juggernaut',
  root:  { name: 'Iron Skin',      desc: '+3 life on hit, +10 all resist', modifier: { lifeOnHit: 3, abilityEffect: { resistBonus: 10 } } },
  minor: { name: 'Unyielding',     desc: 'Fortify on hit (1 stack, 5s, 3% DR). +5% armor→damage.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, damageFromArmor: 5 } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Quaking Strike',  desc: '+3% damage, 10% on hit: Slowed (2s).', modifier: { incDamage: 3, procs: [{ id: 'mc_x12_slow', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'slowed', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Tremor Guard',    desc: '+5 all resist, +1 extra hit',           modifier: { abilityEffect: { resistBonus: 5 }, extraHits: 1 } };
const BRIDGE_31: BridgeTemplate = { name: 'Stone Resolve',   desc: '+2 life on hit, +3% crit chance',       modifier: { lifeOnHit: 2, incCritChance: 3 } };

const MC_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_CONCUSSION, B2_EARTHBREAKER, B3_JUGGERNAUT];
const MC_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// B1 (onCrit cast)         B2 (debuff/reset)         B3 (onBlock cast)
// Crush       → Pulverise  | Weakened, slow          | onBlock → Glacial Hammer
// RapidStrikes→ Crush      | Shocked chain           | onBlock → Concussive Blow
// Shockwave   → Rapid Str  | Shocked AoE             | onBlock → Crush
// GlacialHamm→ Shockwave  | Chill + freeze          | onBlock → Rapid Strikes
// ConcBlow   → Glacial H  | Weakened + Vulnerable    | onBlock → Shockwave
// Pulverise  → Concussive | Execute, Cursed          | onBlock → Glacial Hammer

// ─── 1. CRUSH ─────────────────────────────────────────────

const CRUSH_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Crushing Crit', desc: '25% on crit: cast Pulverise. On kill: reset Pulverise CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'cr_b1_n1_pu', chance: 0.25, trigger: 'onCrit', castSkill: 'mace_pulverise' }, { id: 'cr_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'mace_pulverise' }] } },
    keystone: { name: 'SKULL CRUSHER', desc: 'Crits always cast Pulverise. -35% Crush damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'cr_b1_k_pu', chance: 1.0, trigger: 'onCrit', castSkill: 'mace_pulverise' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Weakening Blow', desc: 'Guaranteed Weakened. Guaranteed Slowed. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'CRIPPLING CRUSH', desc: 'Always Weakened + Cursed. Debuffs doubled. -40% Crush damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Stone Guard', desc: 'Fortify 2 stacks. On block: cast Glacial Hammer. +5% armor→damage. 5% leech. +15 resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'cr_b3_n1_gh', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_glacial_hammer' }] } },
    keystone: { name: 'MOUNTAIN', desc: 'On block: cast Glacial Hammer. Fortify 3 stacks. -20% Crush damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'cr_b3_k_gh', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_glacial_hammer' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 2. RAPID STRIKES ─────────────────────────────────────

const RAPID_STRIKES_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Hammering Blows', desc: '25% on crit: cast Crush. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'rs_b1_n1_cr', chance: 0.25, trigger: 'onCrit', castSkill: 'mace_crush' }] } },
    keystone: { name: 'JACKHAMMER', desc: 'Crits always cast Crush. +2 extra hits. -35% Rapid Strikes damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'rs_b1_k_cr', chance: 1.0, trigger: 'onCrit', castSkill: 'mace_crush' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Thunder Chain', desc: 'Guaranteed Shocked. Chain to 2 targets. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, chainCount: 2, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'CHAIN LIGHTNING', desc: 'Always Shocked + Cursed. Chain to 4. -40% Rapid Strikes damage. +15% attack speed to all skills.', modifier: { incDamage: -40, chainCount: 4, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Rapid Guard', desc: 'Fortify 2 stacks. On block: cast Concussive Blow. +5% armor→damage. 5% leech. +15 resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'rs_b3_n1_cb', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_concussive_blow' }] } },
    keystone: { name: 'IRON RAIN', desc: 'On block: cast Concussive Blow. Fortify 3 stacks. -20% Rapid Strikes damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'rs_b3_k_cb', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_concussive_blow' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 3. SHOCKWAVE ─────────────────────────────────────────

const SHOCKWAVE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Quake Crit', desc: '25% on crit: cast Rapid Strikes. Convert to AoE. +10% crit.', modifier: { incCritChance: 10, convertToAoE: true, procs: [{ id: 'sw_b1_n1_rs', chance: 0.25, trigger: 'onCrit', castSkill: 'mace_rapid_strikes' }] } },
    keystone: { name: 'SEISMIC CRIT', desc: 'Crits always cast Rapid Strikes. +2 extra hits. -35% Shockwave damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'sw_b1_k_rs', chance: 1.0, trigger: 'onCrit', castSkill: 'mace_rapid_strikes' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Electro Wave', desc: 'Guaranteed Shocked. AoE shock spread. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'THUNDERQUAKE', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Shockwave damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Tremor Shield', desc: 'Fortify 2 stacks. On block: cast Crush. +5% armor→damage. 5% leech. +15 resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sw_b3_n1_cr', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_crush' }] } },
    keystone: { name: 'EARTHQUAKE WALL', desc: 'On block: cast Crush. Fortify 3 stacks. -20% Shockwave damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sw_b3_k_cr', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_crush' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 4. GLACIAL HAMMER ────────────────────────────────────

const GLACIAL_HAMMER_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Frozen Impact', desc: '25% on crit: cast Shockwave. On kill: reset Shockwave CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'gh_b1_n1_sw', chance: 0.25, trigger: 'onCrit', castSkill: 'mace_shockwave' }, { id: 'gh_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'mace_shockwave' }] } },
    keystone: { name: 'GLACIER STRIKE', desc: 'Crits always cast Shockwave. -35% Glacial Hammer damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'gh_b1_k_sw', chance: 1.0, trigger: 'onCrit', castSkill: 'mace_shockwave' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Deep Freeze', desc: 'Guaranteed Chill. Freeze below 25%. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, executeThreshold: 25, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Always Chill + Cursed. Shatter on frozen kill. -40% Glacial Hammer damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, overkillDamage: 50, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Frost Bulwark', desc: 'Fortify 2 stacks. On block: cast Rapid Strikes. +5% armor→damage. 5% leech. +15 resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'gh_b3_n1_rs', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_rapid_strikes' }] } },
    keystone: { name: 'ICE FORTRESS', desc: 'On block: cast Rapid Strikes. Fortify 3 stacks. -20% Glacial Hammer damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'gh_b3_k_rs', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_rapid_strikes' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 5. CONCUSSIVE BLOW ───────────────────────────────────

const CONCUSSIVE_BLOW_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Concussive Crit', desc: '25% on crit: cast Glacial Hammer. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'cb_b1_n1_gh', chance: 0.25, trigger: 'onCrit', castSkill: 'mace_glacial_hammer' }] } },
    keystone: { name: 'BRAIN CRUSH', desc: 'Crits always cast Glacial Hammer. Execute below 25%. -35% Concussive Blow damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'cb_b1_k_gh', chance: 1.0, trigger: 'onCrit', castSkill: 'mace_glacial_hammer' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Stagger', desc: 'Guaranteed Weakened + Vulnerable. +50% damage vs debuffed. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'DEVASTATE', desc: 'Always Weakened + Cursed. Debuffs doubled. -40% Concussive Blow damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Impact Guard', desc: 'Fortify 2 stacks. On block: cast Shockwave. +5% armor→damage. 5% leech. +15 resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'cb_b3_n1_sw', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_shockwave' }] } },
    keystone: { name: 'STONEWALL', desc: 'On block: cast Shockwave. Fortify 3 stacks. -20% Concussive Blow damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'cb_b3_k_sw', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_shockwave' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 6. PULVERISE ─────────────────────────────────────────

const PULVERISE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Ground Zero', desc: '25% on crit: cast Concussive Blow. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'pu_b1_n1_cb', chance: 0.25, trigger: 'onCrit', castSkill: 'mace_concussive_blow' }] } },
    keystone: { name: 'ANNIHILATION', desc: 'Crits always cast Concussive Blow. -35% Pulverise damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'pu_b1_k_cb', chance: 1.0, trigger: 'onCrit', castSkill: 'mace_concussive_blow' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Armor Shred', desc: 'Guaranteed Weakened. Apply Cursed. +50% damage vs Cursed. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'cursed', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'OBLITERATE', desc: 'Always Cursed + Weakened. Execute below 30%. -40% Pulverise damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Titan Guard', desc: 'Fortify 2 stacks. On block: cast Glacial Hammer. +5% armor→damage. 5% leech. +15 resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'pu_b3_n1_gh', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_glacial_hammer' }] } },
    keystone: { name: 'TITAN', desc: 'On block: cast Glacial Hammer. Fortify 3 stacks. -20% Pulverise damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'pu_b3_k_gh', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_glacial_hammer' }], globalEffect: { defenseMult: 1.10 } } } },
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

// ─── 7. SHOCKWAVE BUFF ───────────────────────────────────

const SHOCKWAVE_BUFF_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Quake', desc: '+4s duration. -15% cooldown. On activation: reset Crush CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'swb_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'mace_crush' }] } },
    keystone: { name: 'ETERNAL TREMOR', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Amplified Quake', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'CATACLYSM', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Quake Synergy', desc: 'While active: all mace skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'SEISMIC COMMAND', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -7, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 8. FORTIFY BUFF ──────────────────────────────────────

const FORTIFY_BUFF_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Fortify', desc: '+5s duration. -15% cooldown. On activation: reset Glacial Hammer CD.', modifier: { durationBonus: 5, cooldownReduction: 15, procs: [{ id: 'fo_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'mace_glacial_hammer' }] } },
    keystone: { name: 'ETERNAL FORTRESS', desc: '+10s duration. -25% cooldown. -30% defense effect. +5% crit to all skills.', modifier: { durationBonus: 10, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Iron Fortify', desc: '+50% defense buff effect. +10 all resist while active.', modifier: { abilityEffect: { defenseMult: 1.50, resistBonus: 10 } } },
    keystone: { name: 'INVINCIBLE', desc: '+100% defense buff effect. -20% damage dealt. +5% defense to all skills.', modifier: { abilityEffect: { defenseMult: 2.0 }, incDamage: -20, globalEffect: { defenseMult: 1.05 } } } },
  { notable: { name: 'Fortify Synergy', desc: 'While active: on block cast Crush. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'fo_b3_n1_cr', chance: 1.0, trigger: 'onBlock', castSkill: 'mace_crush' }] } },
    keystone: { name: 'BASTION AURA', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -10, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 9. CRUSHING FORCE (Passive) ──────────────────────────

const CRUSHING_FORCE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'War Spoils', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'PLUNDER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Battle Hardened', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'VETERAN', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Mace Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'WARDEN', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const CRUSH_GRAPH           = createCompactTree({ skillId: 'mace_crush',           prefix: 'cr',  branches: MC_BRANCHES, bridges: MC_BRIDGES, overrides: CRUSH_OVERRIDES, startName: 'Crushing Core' });
const RAPID_STRIKES_GRAPH   = createCompactTree({ skillId: 'mace_rapid_strikes',   prefix: 'rs',  branches: MC_BRANCHES, bridges: MC_BRIDGES, overrides: RAPID_STRIKES_OVERRIDES, startName: 'Rapid Core' });
const SHOCKWAVE_GRAPH       = createCompactTree({ skillId: 'mace_shockwave',       prefix: 'msw', branches: MC_BRANCHES, bridges: MC_BRIDGES, overrides: SHOCKWAVE_OVERRIDES, startName: 'Quake Core' });
const GLACIAL_HAMMER_GRAPH  = createCompactTree({ skillId: 'mace_glacial_hammer',  prefix: 'gh',  branches: MC_BRANCHES, bridges: MC_BRIDGES, overrides: GLACIAL_HAMMER_OVERRIDES, startName: 'Frost Core' });
const CONCUSSIVE_BLOW_GRAPH = createCompactTree({ skillId: 'mace_concussive_blow', prefix: 'cb',  branches: MC_BRANCHES, bridges: MC_BRIDGES, overrides: CONCUSSIVE_BLOW_OVERRIDES, startName: 'Impact Core' });
const PULVERISE_GRAPH       = createCompactTree({ skillId: 'mace_pulverise',       prefix: 'pu',  branches: MC_BRANCHES, bridges: MC_BRIDGES, overrides: PULVERISE_OVERRIDES, startName: 'Pulverise Core' });

const SHOCKWAVE_BUFF_GRAPH  = createCompactTree({ skillId: 'mace_shockwave_buff',  prefix: 'swb', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: SHOCKWAVE_BUFF_OVERRIDES, startName: 'Quake Mastery' });
const FORTIFY_BUFF_GRAPH    = createCompactTree({ skillId: 'mace_fortify',         prefix: 'fo',  branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: FORTIFY_BUFF_OVERRIDES, startName: 'Fortify Core' });

const CRUSHING_FORCE_GRAPH  = createCompactTree({ skillId: 'mace_crushing_force',  prefix: 'cf',  branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: CRUSHING_FORCE_OVERRIDES, startName: 'Crushing Focus' });

// ─── Export ────────────────────────────────────────────────

export const MACE_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'mace_crush':           CRUSH_GRAPH,
  'mace_rapid_strikes':   RAPID_STRIKES_GRAPH,
  'mace_shockwave':       SHOCKWAVE_GRAPH,
  'mace_glacial_hammer':  GLACIAL_HAMMER_GRAPH,
  'mace_concussive_blow': CONCUSSIVE_BLOW_GRAPH,
  'mace_pulverise':       PULVERISE_GRAPH,
  'mace_shockwave_buff':  SHOCKWAVE_BUFF_GRAPH,
  'mace_fortify':         FORTIFY_BUFF_GRAPH,
  'mace_crushing_force':  CRUSHING_FORCE_GRAPH,
};

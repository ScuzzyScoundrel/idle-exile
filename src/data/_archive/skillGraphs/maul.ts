// ============================================================
// Idle Exile — Maul Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Earthquake     — AoE, extra hits, ground pound
//   B2 Crush          — weakened, armor shred, debuffs
//   B3 Fortification  — armor→dmg, block, fortify
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates ───────────────────────────────

const B1_EARTHQUAKE: BranchTemplate = {
  name: 'Earthquake',
  root:  { name: 'Tremor',         desc: '+5% crit chance, +3 flat damage',  modifier: { incCritChance: 5, flatDamage: 3 } },
  minor: { name: 'Aftershock',     desc: '+8% crit multiplier. Convert to AoE.', modifier: { incCritMultiplier: 8, convertToAoE: true } },
};

const B2_CRUSH: BranchTemplate = {
  name: 'Crush',
  root:  { name: 'Bone Breaker',   desc: '+3% damage. 20% on hit: Weakened (3s).', modifier: { incDamage: 3, procs: [{ id: 'ml_b2_weak', chance: 0.20, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Armor Shatter',  desc: 'Guaranteed Weakened. 15% on hit: Vulnerable (2s).', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 3 }, procs: [{ id: 'ml_b2_vuln', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'vulnerable', stacks: 1, duration: 2 } }] } },
};

const B3_FORTIFICATION: BranchTemplate = {
  name: 'Fortification',
  root:  { name: 'Iron Stance',    desc: '+3 life on hit, +5% armor→damage', modifier: { lifeOnHit: 3, damageFromArmor: 5 } },
  minor: { name: 'Stone Wall',     desc: 'Fortify on hit (1 stack, 5s, 3% DR). +10 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 10 } } },
};

// ─── Shared bridges ────────────────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Quake Crush',     desc: '+3% crit, 10% on hit: Weakened (2s).',    modifier: { incCritChance: 3, procs: [{ id: 'ml_x12_weak', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Fortified Crush',  desc: '+5 all resist, 10% on hit: Weakened (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'ml_x23_weak', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'weakened', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Quake Guard',      desc: '+2 life on hit, +3% crit chance',          modifier: { lifeOnHit: 2, incCritChance: 3 } };

const ML_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_EARTHQUAKE, B2_CRUSH, B3_FORTIFICATION];
const ML_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// Cross-skill reference map:
// Slam        → Cataclysm   | Weakened+Vuln          | onBlock → Seismic Wave
// GroundPound → Slam         | Weakened AoE           | onDodge → Molten Strike
// MoltenStrike→ Ground Pound | Burn always            | onDodge → Thunder Slam
// Permafrost  → Seismic Wave| Chill+Weakened         | onDodge → Ground Pound
// ThunderSlam → Permafrost  | Shocked chain          | onDodge → Slam
// SeismicWave → Thunder Slam| Vulnerable AoE         | onDodge → Molten Strike
// Cataclysm   → Seismic Wave| Vulnerable, execute    | onDodge → Ground Pound

// ─── 1. SLAM ────────────────────────────────────────────────

const SLAM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Earth Slam', desc: '25% on crit: cast Cataclysm. On kill: reset Cataclysm CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'msl_b1_n1_ct', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_cataclysm' }, { id: 'msl_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'maul_cataclysm' }] } },
    keystone: { name: 'WORLD SLAM', desc: 'Crits always cast Cataclysm. -35% Slam damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'msl_b1_k_ct', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_cataclysm' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Crushing Slam', desc: 'Guaranteed Weakened + Vulnerable. +25% debuff duration. +50% vs weakened.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'weakened', incDamage: 50 } } } },
    keystone: { name: 'OBLITERATE', desc: 'Always Cursed. Debuffs doubled. -40% Slam damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Fortress Slam', desc: 'On block: cast Seismic Wave. Fortify 2 stacks. +5% armor→damage. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'msl_b3_n1_sw', chance: 1.0, trigger: 'onBlock', castSkill: 'maul_seismic_wave' }] } },
    keystone: { name: 'IRON SLAM', desc: 'On block: cast Seismic Wave. Fortify 3 stacks. -20% Slam damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'msl_b3_k_sw', chance: 1.0, trigger: 'onBlock', castSkill: 'maul_seismic_wave' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 2. GROUND POUND ────────────────────────────────────────

const GROUND_POUND_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Seismic Pound', desc: '25% on crit: cast Slam. +2 extra hits. +10% crit.', modifier: { incCritChance: 10, extraHits: 2, procs: [{ id: 'mgp_b1_n1_sl', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_slam' }] } },
    keystone: { name: 'EARTHQUAKE', desc: 'Crits always cast Slam. +3 extra hits. -35% Ground Pound damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 3, procs: [{ id: 'mgp_b1_k_sl', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_slam' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shattering Ground', desc: 'Guaranteed Weakened. AoE debuff spread. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'weakened', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'TECTONIC SHIFT', desc: 'Weakened unlimited. Always Cursed. -40% Ground Pound damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Quake Guard', desc: 'On dodge: cast Molten Strike. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'mgp_b3_n1_ms', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_molten_strike' }] } },
    keystone: { name: 'QUAKE FORTRESS', desc: 'On dodge: cast Molten Strike. Fortify 3 stacks. -20% Ground Pound damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'mgp_b3_k_ms', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_molten_strike' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 3. MOLTEN STRIKE ───────────────────────────────────────

const MOLTEN_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Magma Strike', desc: '25% on crit: cast Ground Pound. On kill: reset Ground Pound CD. +10% crit.', modifier: { incCritChance: 10, procs: [{ id: 'mms_b1_n1_gp', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_ground_pound' }, { id: 'mms_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'maul_ground_pound' }] } },
    keystone: { name: 'VOLCANIC STRIKE', desc: 'Crits always cast Ground Pound. -35% Molten Strike damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'mms_b1_k_gp', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_ground_pound' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Searing Crush', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 } } },
    keystone: { name: 'MAGMA CRUSH', desc: 'Burns always Cursed. Burn doubled. -40% Molten Strike damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Molten Guard', desc: 'On dodge: cast Thunder Slam. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'mms_b3_n1_ts', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_thunder_slam' }] } },
    keystone: { name: 'MOLTEN FORTRESS', desc: 'On dodge: cast Thunder Slam. Fortify 3 stacks. -20% Molten Strike damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'mms_b3_k_ts', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_thunder_slam' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 4. PERMAFROST ──────────────────────────────────────────

const PERMAFROST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Glacial Smash', desc: '25% on crit: cast Seismic Wave. +1 extra hit. +10% crit.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'mpf_b1_n1_sw', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_seismic_wave' }] } },
    keystone: { name: 'FROZEN IMPACT', desc: 'Crits always cast Seismic Wave. +2 extra hits. -35% Permafrost damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'mpf_b1_k_sw', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_seismic_wave' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Deep Chill', desc: 'Guaranteed Chill + Weakened. +25% chill duration. +50% vs chilled.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Always Chill + Cursed. Debuffs doubled. -40% Permafrost damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Frost Fort', desc: 'On dodge: cast Ground Pound. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'mpf_b3_n1_gp', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_ground_pound' }] } },
    keystone: { name: 'FROST FORTRESS', desc: 'On dodge: cast Ground Pound. Fortify 3 stacks. -20% Permafrost damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'mpf_b3_k_gp', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_ground_pound' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 5. THUNDER SLAM ────────────────────────────────────────

const THUNDER_SLAM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Storm Slam', desc: '25% on crit: cast Permafrost. Chain to 2 targets. +10% crit.', modifier: { incCritChance: 10, chainCount: 2, procs: [{ id: 'mts_b1_n1_pf', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_permafrost' }] } },
    keystone: { name: 'THUNDER GOD', desc: 'Crits always cast Permafrost. Chain to 4. -35% Thunder Slam damage. +5% crit to all skills.', modifier: { incDamage: -35, chainCount: 4, procs: [{ id: 'mts_b1_k_pf', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_permafrost' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shocking Slam', desc: 'Guaranteed Shocked. +25% shock duration. +50% vs shocked.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'shocked', incDamage: 50 } } } },
    keystone: { name: 'STORM CRUSHER', desc: 'Always Shocked + Cursed. Debuffs doubled. -40% Thunder Slam damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Storm Guard', desc: 'On dodge: cast Slam. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'mts_b3_n1_sl', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_slam' }] } },
    keystone: { name: 'STORM FORTRESS', desc: 'On dodge: cast Slam. Fortify 3 stacks. -20% Thunder Slam damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'mts_b3_k_sl', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_slam' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 6. SEISMIC WAVE ───────────────────────────────────────

const SEISMIC_WAVE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Tidal Wave', desc: '25% on crit: cast Thunder Slam. Convert to AoE. +10% crit.', modifier: { incCritChance: 10, convertToAoE: true, procs: [{ id: 'msw_b1_n1_ts', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_thunder_slam' }] } },
    keystone: { name: 'TSUNAMI', desc: 'Crits always cast Thunder Slam. +2 extra hits. -35% Seismic Wave damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'msw_b1_k_ts', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_thunder_slam' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shattering Wave', desc: 'Guaranteed Vulnerable. AoE debuff spread. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, convertToAoE: true, debuffInteraction: { debuffDurationBonus: 25 } } },
    keystone: { name: 'TECTONIC WAVE', desc: 'Vulnerable unlimited. Always Cursed. -40% Seismic Wave damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Wave Guard', desc: 'On dodge: cast Molten Strike. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'msw_b3_n1_ms', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_molten_strike' }] } },
    keystone: { name: 'WAVE FORTRESS', desc: 'On dodge: cast Molten Strike. Fortify 3 stacks. -20% Seismic Wave damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'msw_b3_k_ms', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_molten_strike' }], globalEffect: { defenseMult: 1.10 } } } },
];

// ─── 7. CATACLYSM ──────────────────────────────────────────

const CATACLYSM_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'World Breaker', desc: '25% on crit: cast Seismic Wave. Execute below 20%. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'mct_b1_n1_sw', chance: 0.25, trigger: 'onCrit', castSkill: 'maul_seismic_wave' }] } },
    keystone: { name: 'ARMAGEDDON', desc: 'Crits always cast Seismic Wave. Execute below 25%. -35% Cataclysm damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'mct_b1_k_sw', chance: 1.0, trigger: 'onCrit', castSkill: 'maul_seismic_wave' }], globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Shattering Impact', desc: 'Apply Vulnerable + Cursed. +50% vs debuffed. Execute bonus below 25%.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 50 } }, executeThreshold: 25 } },
    keystone: { name: 'EXTINCTION', desc: 'Always Cursed. Execute below 30%. Debuffs doubled. -40% Cataclysm damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } } },
  { notable: { name: 'Cataclysm Guard', desc: 'On dodge: cast Ground Pound. +5% armor→damage. 5% leech. +15 all resist.', modifier: { damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'mct_b3_n1_gp', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_ground_pound' }] } },
    keystone: { name: 'CATACLYSM FORTRESS', desc: 'On dodge: cast Ground Pound. Fortify 3 stacks. -20% Cataclysm damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'mct_b3_k_gp', chance: 1.0, trigger: 'onDodge', castSkill: 'maul_ground_pound' }], globalEffect: { defenseMult: 1.10 } } } },
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

// ─── 8. EARTHQUAKE (Buff) ───────────────────────────────────

const EARTHQUAKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Quake', desc: '+4s duration. -15% cooldown. On activation: reset Slam CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'meq_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'maul_slam' }] } },
    keystone: { name: 'ENDLESS QUAKE', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } } },
  { notable: { name: 'Heightened Quake', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'TECTONIC FURY', desc: '+100% buff damage effect. +20% damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } } },
  { notable: { name: 'Quake Synergy', desc: 'While active: all maul skills +5% crit. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'SEISMIC FURY', desc: 'While active: all skills +10% damage. -50% duration. +10% defense to all skills.', modifier: { durationBonus: -5, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } } },
];

// ─── 9. STONE SKIN (Buff) ───────────────────────────────────

const STONE_SKIN_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Sustained Stone', desc: '+3s duration. -15% cooldown. On activation: reset Cataclysm CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'mss_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'maul_cataclysm' }] } },
    keystone: { name: 'ETERNAL STONE', desc: '+6s duration. -25% cooldown. -30% defense bonus. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Empowered Stone', desc: '+50% defense buff effect. +10 all resist.', modifier: { abilityEffect: { defenseMult: 1.50 }, incCritChance: 5 } },
    keystone: { name: 'DIAMOND SKIN', desc: '+100% defense buff effect. -20% damage. +5% crit to all skills.', modifier: { abilityEffect: { defenseMult: 2.0 }, incDamage: -20, globalEffect: { critChanceBonus: 5 } } } },
  { notable: { name: 'Stone Synergy', desc: 'While active: on block cast Slam. Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'mss_b3_n1_sl', chance: 1.0, trigger: 'onBlock', castSkill: 'maul_slam' }] } },
    keystone: { name: 'STONE LORD', desc: 'While active: all skills +15 resist. -50% duration. +10% attack speed to all skills.', modifier: { durationBonus: -4, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } } },
];

// ─── 10. CRUSHING WEIGHT (Passive) ──────────────────────────

const CRUSHING_WEIGHT_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { notable: { name: 'Heavy Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE CRUSHER', desc: '+25% items, +25% materials. -10% damage. +5% items to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } } },
  { notable: { name: 'Crusher\'s Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'GRAND CRUSHER', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } } },
  { notable: { name: 'Maul Mastery', desc: '+8% damage, +5% crit, +5% speed.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'MAUL LORD', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } } },
];

// ─── Build all trees ───────────────────────────────────────

const SLAM_GRAPH           = createCompactTree({ skillId: 'maul_slam',           prefix: 'msl', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: SLAM_OVERRIDES, startName: 'Slam Core' });
const GROUND_POUND_GRAPH   = createCompactTree({ skillId: 'maul_ground_pound',   prefix: 'mgp', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: GROUND_POUND_OVERRIDES, startName: 'Pound Core' });
const MOLTEN_STRIKE_GRAPH  = createCompactTree({ skillId: 'maul_molten_strike',  prefix: 'mms', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: MOLTEN_STRIKE_OVERRIDES, startName: 'Molten Core' });
const PERMAFROST_GRAPH     = createCompactTree({ skillId: 'maul_permafrost',     prefix: 'mpf', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: PERMAFROST_OVERRIDES, startName: 'Frost Core' });
const THUNDER_SLAM_GRAPH   = createCompactTree({ skillId: 'maul_thunder_slam',   prefix: 'mts', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: THUNDER_SLAM_OVERRIDES, startName: 'Thunder Core' });
const SEISMIC_WAVE_GRAPH   = createCompactTree({ skillId: 'maul_seismic_wave',   prefix: 'msw', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: SEISMIC_WAVE_OVERRIDES, startName: 'Wave Core' });
const CATACLYSM_GRAPH      = createCompactTree({ skillId: 'maul_cataclysm',      prefix: 'mct', branches: ML_BRANCHES, bridges: ML_BRIDGES, overrides: CATACLYSM_OVERRIDES, startName: 'Ruin Core' });

const EARTHQUAKE_GRAPH     = createCompactTree({ skillId: 'maul_earthquake',     prefix: 'meq', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: EARTHQUAKE_OVERRIDES, startName: 'Quake Core' });
const STONE_SKIN_GRAPH     = createCompactTree({ skillId: 'maul_stone_skin',     prefix: 'mss', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: STONE_SKIN_OVERRIDES, startName: 'Stone Core' });

const CRUSHING_WEIGHT_GRAPH = createCompactTree({ skillId: 'maul_crushing_weight', prefix: 'mcw', branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: CRUSHING_WEIGHT_OVERRIDES, startName: 'Weight Core' });

// ─── Export ────────────────────────────────────────────────

export const MAUL_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'maul_slam':            SLAM_GRAPH,
  'maul_ground_pound':    GROUND_POUND_GRAPH,
  'maul_molten_strike':   MOLTEN_STRIKE_GRAPH,
  'maul_permafrost':      PERMAFROST_GRAPH,
  'maul_thunder_slam':    THUNDER_SLAM_GRAPH,
  'maul_seismic_wave':    SEISMIC_WAVE_GRAPH,
  'maul_cataclysm':       CATACLYSM_GRAPH,
  'maul_earthquake':      EARTHQUAKE_GRAPH,
  'maul_stone_skin':      STONE_SKIN_GRAPH,
  'maul_crushing_weight': CRUSHING_WEIGHT_GRAPH,
};

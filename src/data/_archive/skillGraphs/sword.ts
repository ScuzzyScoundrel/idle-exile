// ============================================================
// Idle Exile — Sword Skill Graphs (Compact 16-node trees)
// 7 active + 2 buff + 1 passive = 10 trees
// Branch archetypes:
//   B1 Brutality  — damage, execute, crit
//   B2 Runeforged — elemental, debuffs, conversion
//   B3 Iron Guard — block, leech, fortify
// ============================================================

import type { SkillGraph } from '../../types';
import {
  createCompactTree,
  type BranchTemplate,
  type BridgeTemplate,
  type SkillNodeOverride,
} from './treeBuilder';

// ─── Shared branch templates (same for all sword skills) ───

const B1_BRUTALITY: BranchTemplate = {
  name: 'Brutality',
  root:  { name: 'Keen Edge',     desc: '+5% damage, +3 flat damage',   modifier: { incDamage: 5, flatDamage: 3 } },
  minor: { name: 'Deep Cuts',     desc: '+5% crit multiplier. 10% on hit: Bleed (2s).', modifier: { incCritMultiplier: 5, procs: [{ id: 'sw_b1_bleed', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'bleeding', stacks: 1, duration: 2 } }] } },
};

const B2_RUNEFORGED: BranchTemplate = {
  name: 'Runeforged',
  root:  { name: 'Rune Strike',   desc: '+3% damage. 15% on hit: Burn (3s).', modifier: { incDamage: 3, procs: [{ id: 'sw_b2_burn', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'burning', stacks: 1, duration: 3 } }] } },
  minor: { name: 'Elemental Edge', desc: 'Guaranteed Shocked on hit. 15% on hit: Chill (3s).', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, procs: [{ id: 'sw_b2_chill', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 3 } }] } },
};

const B3_IRON_GUARD: BranchTemplate = {
  name: 'Iron Guard',
  root:  { name: 'Iron Stance',   desc: '+3 life on hit, +10 all resist',   modifier: { lifeOnHit: 3, abilityEffect: { resistBonus: 10 } } },
  minor: { name: 'Shield Wall',   desc: 'Fortify on hit (1 stack, 5s, 3% DR). +5 all resist.', modifier: { fortifyOnHit: { stacks: 1, duration: 5, damageReduction: 3 }, abilityEffect: { resistBonus: 5 } } },
};

// ─── Shared bridge templates ───────────────────────────────

const BRIDGE_12: BridgeTemplate = { name: 'Brutal Runes',     desc: '+3% damage, 10% on hit: Shock (2s).', modifier: { incDamage: 3, procs: [{ id: 'sw_x12_shock', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 1, duration: 2 } }] } };
const BRIDGE_23: BridgeTemplate = { name: 'Warded Edge',      desc: '+5 all resist. 10% on hit: Chill (2s).', modifier: { abilityEffect: { resistBonus: 5 }, procs: [{ id: 'sw_x23_chill', chance: 0.10, trigger: 'onHit', applyDebuff: { debuffId: 'chilled', stacks: 1, duration: 2 } }] } };
const BRIDGE_31: BridgeTemplate = { name: 'Tempered Steel',   desc: '+2 life on hit, +3% crit chance',    modifier: { lifeOnHit: 2, incCritChance: 3 } };

const SW_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [B1_BRUTALITY, B2_RUNEFORGED, B3_IRON_GUARD];
const SW_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BRIDGE_12, BRIDGE_23, BRIDGE_31];

// ─── Cross-skill reference map ─────────────────────────────
// B1 (onCrit cast)       B2 (debuff/reset)        B3 (onBlock/onDodge cast)
// Slash      → Double Strike  | Bleed, spread on kill | onBlock → Flame Slash
// DblStrike  → Mortal Strike  | Vulnerable, +vs debuf | onDodge → Ice Thrust
// Whirlwind  → Ice Thrust     | Chill always, freeze  | onBlock → Slash
// FlameSlash → Slash          | Burn always, +burn DPS| onDodge → Double Strike
// BladeWard  → Mortal Strike  | Shocked, chain proc   | onBlock → Whirlwind
// MortalStr  → Flame Slash    | Execute, Cursed       | onBlock → Double Strike
// IceThrust  → Whirlwind      | Chill+Slow, shatter   | onDodge → Flame Slash

// ─── 1. SLASH ──────────────────────────────────────────────

const SLASH_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Brutality
    notable: { name: 'Savage Cuts', desc: '25% on crit: cast Double Strike. On kill: reset Double Strike CD. +10% crit chance.', modifier: { incCritChance: 10, procs: [{ id: 'sl_b1_n1_ds', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_double_strike' }, { id: 'sl_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'sword_double_strike' }] } },
    keystone: { name: 'RELENTLESS BLADE', desc: 'Crits always cast Double Strike. -35% Slash damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'sl_b1_k_ds', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_double_strike' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2 — Runeforged
    notable: { name: 'Crimson Runes', desc: 'Guaranteed Bleed on hit. +25% bleed duration. On kill: spread all bleeds to next target.', modifier: { applyDebuff: { debuffId: 'bleeding', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'sl_b2_n1_spread', chance: 1.0, trigger: 'onKill', applyDebuff: { debuffId: 'bleeding', stacks: 2, duration: 4 } }] } },
    keystone: { name: 'BLOOD RUNE', desc: 'Bleeds deal 2x damage. Always apply Cursed. -40% Slash damage. +15% attack speed to all skills.', modifier: { incDamage: -40, debuffInteraction: { debuffEffectBonus: 100 }, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3 — Iron Guard
    notable: { name: 'Riposte Stance', desc: 'Fortify on hit (2 stacks, 5s, 4% DR). On block: cast Flame Slash. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'sl_b3_n1_fs', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_flame_slash' }] } },
    keystone: { name: 'IRON BASTION', desc: 'On block: cast Flame Slash. Fortify 3 stacks. -20% Slash damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'sl_b3_k_fs', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_flame_slash' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 2. DOUBLE STRIKE ──────────────────────────────────────

const DOUBLE_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Twin Fangs', desc: '25% on crit: cast Mortal Strike. On kill: reset Mortal Strike CD. +10% crit chance.', modifier: { incCritChance: 10, procs: [{ id: 'ds_b1_n1_ms', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_mortal_strike' }, { id: 'ds_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'sword_mortal_strike' }] } },
    keystone: { name: 'DUAL EXECUTION', desc: 'Crits always cast Mortal Strike. -35% Double Strike damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'ds_b1_k_ms', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_mortal_strike' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Weakening Strikes', desc: 'Guaranteed Vulnerable on hit. +100% damage vs debuffed. +5% cast speed while 3+ debuffs active.', modifier: { applyDebuff: { debuffId: 'vulnerable', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'vulnerable', incDamage: 100 } }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'RUNE OF RUIN', desc: 'Always apply Cursed + Vulnerable. Debuff effects doubled. -40% Double Strike damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Evasive Counter', desc: 'Fortify on hit (2 stacks). On dodge: cast Ice Thrust. +5% evasion→damage. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromEvasion: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ds_b3_n1_it', chance: 1.0, trigger: 'onDodge', castSkill: 'sword_ice_thrust' }] } },
    keystone: { name: 'PHANTOM BLADE', desc: 'On dodge: cast Ice Thrust. Fortify 3 stacks. -20% Double Strike damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ds_b3_k_it', chance: 1.0, trigger: 'onDodge', castSkill: 'sword_ice_thrust' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 3. WHIRLWIND ──────────────────────────────────────────

const WHIRLWIND_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Razor Vortex', desc: '25% on crit: cast Ice Thrust. +1 extra hit. +10% crit chance.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'ww_b1_n1_it', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_ice_thrust' }] } },
    keystone: { name: 'BLADE STORM', desc: 'Crits always cast Ice Thrust. +2 extra hits. -35% Whirlwind damage. +5% crit to all skills.', modifier: { incDamage: -35, extraHits: 2, procs: [{ id: 'ww_b1_k_it', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_ice_thrust' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Frozen Cyclone', desc: 'Guaranteed Chill. Freeze enemies below 25% HP. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25 }, executeThreshold: 25 } },
    keystone: { name: 'ABSOLUTE ZERO', desc: 'Always Chill + Slow. Frozen enemies shatter. -40% Whirlwind damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 5 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Cyclone Guard', desc: 'Fortify on hit (2 stacks). On block: cast Slash. +5% armor→damage. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ww_b3_n1_sl', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_slash' }] } },
    keystone: { name: 'WHIRLING FORTRESS', desc: 'On block: cast Slash. Fortify 3 stacks. -20% Whirlwind damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ww_b3_k_sl', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_slash' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 4. FLAME SLASH ────────────────────────────────────────

const FLAME_SLASH_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Inferno Strike', desc: '25% on crit: cast Slash. On kill: reset Slash CD. +10% crit chance.', modifier: { incCritChance: 10, procs: [{ id: 'fs_b1_n1_sl', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_slash' }, { id: 'fs_b1_n1_reset', chance: 1.0, trigger: 'onKill', resetCooldown: 'sword_slash' }] } },
    keystone: { name: 'PYRE BLADE', desc: 'Crits always cast Slash. -35% Flame Slash damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'fs_b1_k_sl', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_slash' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Searing Rune', desc: 'Guaranteed Burn. +50% burn DPS. +25% debuff duration. +5% cast speed while 3+ debuffs.', modifier: { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 50, debuffDurationBonus: 25 }, conditionalMods: [{ condition: 'whileDebuffActive', threshold: 3, modifier: { incCastSpeed: 5 } }] } },
    keystone: { name: 'CONFLAGRATION', desc: 'Burns always apply Cursed. Burn effects doubled. -40% Flame Slash damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Flame Ward', desc: 'Fortify on hit (2 stacks). On dodge: cast Double Strike. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'fs_b3_n1_ds', chance: 1.0, trigger: 'onDodge', castSkill: 'sword_double_strike' }] } },
    keystone: { name: 'PHOENIX GUARD', desc: 'On dodge: cast Double Strike. Fortify 3 stacks. -20% Flame Slash damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'fs_b3_k_ds', chance: 1.0, trigger: 'onDodge', castSkill: 'sword_double_strike' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 5. BLADE WARD ─────────────────────────────────────────

const BLADE_WARD_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Counter-Strike', desc: '25% on crit: cast Mortal Strike. +1 extra hit. +10% crit chance.', modifier: { incCritChance: 10, extraHits: 1, procs: [{ id: 'bw_b1_n1_ms', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_mortal_strike' }] } },
    keystone: { name: 'RETRIBUTION', desc: 'Crits always cast Mortal Strike. -35% Blade Ward damage. +5% crit to all skills.', modifier: { incDamage: -35, procs: [{ id: 'bw_b1_k_ms', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_mortal_strike' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Static Guard', desc: 'Guaranteed Shock. Chain lightning proc on hit: 15%. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'shocked', chance: 1.0, duration: 3 }, debuffInteraction: { debuffDurationBonus: 25 }, procs: [{ id: 'bw_b2_n1_chain', chance: 0.15, trigger: 'onHit', applyDebuff: { debuffId: 'shocked', stacks: 2, duration: 3 } }] } },
    keystone: { name: 'THUNDER WARD', desc: 'Always Shock + Cursed. Debuff effects doubled. -40% Blade Ward damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { debuffEffectBonus: 100 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Bulwark', desc: 'Fortify on hit (2 stacks). On block: cast Whirlwind. +5% armor→damage. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'bw_b3_n1_ww', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_whirlwind' }] } },
    keystone: { name: 'AEGIS OF BLADES', desc: 'On block: cast Whirlwind. Fortify 3 stacks. -20% Blade Ward damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'bw_b3_k_ww', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_whirlwind' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 6. MORTAL STRIKE ──────────────────────────────────────

const MORTAL_STRIKE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Executioner', desc: '25% on crit: cast Flame Slash. Execute: 3x damage below 20% HP. +10% crit.', modifier: { incCritChance: 10, executeThreshold: 20, procs: [{ id: 'ms_b1_n1_fs', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_flame_slash' }] } },
    keystone: { name: 'DEATH SENTENCE', desc: 'Crits always cast Flame Slash. Execute below 25%. -35% Mortal Strike damage. +5% crit to all skills.', modifier: { incDamage: -35, executeThreshold: 25, procs: [{ id: 'ms_b1_k_fs', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_flame_slash' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Doom Mark', desc: 'Apply Cursed on hit. +50% damage vs Cursed. +25% debuff duration.', modifier: { applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, debuffInteraction: { bonusDamageVsDebuffed: { debuffId: 'cursed', incDamage: 50 }, debuffDurationBonus: 25 } } },
    keystone: { name: 'FINAL JUDGMENT', desc: 'Always Cursed + Vulnerable. Execute below 30%. -40% Mortal Strike damage. +15% attack speed to all skills.', modifier: { incDamage: -40, executeThreshold: 30, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 5 }, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Death Guard', desc: 'Fortify on hit (2 stacks). On block: cast Double Strike. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'ms_b3_n1_ds', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_double_strike' }] } },
    keystone: { name: 'UNDYING BLADE', desc: 'On block: cast Double Strike. Fortify 3 stacks. -20% Mortal Strike damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'ms_b3_k_ds', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_double_strike' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 7. ICE THRUST ─────────────────────────────────────────

const ICE_THRUST_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1
    notable: { name: 'Glacial Pierce', desc: '25% on crit: cast Whirlwind. Pierce count +2. +10% crit chance.', modifier: { incCritChance: 10, pierceCount: 2, procs: [{ id: 'it_b1_n1_ww', chance: 0.25, trigger: 'onCrit', castSkill: 'sword_whirlwind' }] } },
    keystone: { name: 'FROZEN EXECUTION', desc: 'Crits always cast Whirlwind. Pierce all. -35% Ice Thrust damage. +5% crit to all skills.', modifier: { incDamage: -35, flags: ['pierce'], procs: [{ id: 'it_b1_k_ww', chance: 1.0, trigger: 'onCrit', castSkill: 'sword_whirlwind' }], globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2
    notable: { name: 'Frostbite', desc: 'Guaranteed Chill + Slow. +25% debuff duration. Frozen enemies take 50% more damage.', modifier: { applyDebuff: { debuffId: 'chilled', chance: 1.0, duration: 4 }, debuffInteraction: { debuffDurationBonus: 25, bonusDamageVsDebuffed: { debuffId: 'chilled', incDamage: 50 } } } },
    keystone: { name: 'PERMAFROST', desc: 'Always Chill + Cursed. Shatter burst on frozen kill. -40% Ice Thrust damage. +15% attack speed to all skills.', modifier: { incDamage: -40, applyDebuff: { debuffId: 'cursed', chance: 1.0, duration: 4 }, overkillDamage: 50, globalEffect: { attackSpeedMult: 1.15 } } },
  },
  { // B3
    notable: { name: 'Frost Armor', desc: 'Fortify on hit (2 stacks). On dodge: cast Flame Slash. +5% armor→damage. 5% leech. +15 all resist.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, damageFromArmor: 5, leechPercent: 5, abilityEffect: { resistBonus: 15 }, procs: [{ id: 'it_b3_n1_fs', chance: 1.0, trigger: 'onDodge', castSkill: 'sword_flame_slash' }] } },
    keystone: { name: 'GLACIAL BASTION', desc: 'On dodge: cast Flame Slash. Fortify 3 stacks. -20% Ice Thrust damage. +10% defense to all skills.', modifier: { incDamage: -20, fortifyOnHit: { stacks: 3, duration: 6, damageReduction: 5 }, procs: [{ id: 'it_b3_k_fs', chance: 1.0, trigger: 'onDodge', castSkill: 'sword_flame_slash' }], globalEffect: { defenseMult: 1.10 } } },
  },
];

// ─── 8. BLADE FURY (Buff) ──────────────────────────────────

const BLADE_FURY_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Duration & Uptime
    notable: { name: 'Sustained Fury', desc: '+4s duration. -15% cooldown. On activation: reset Slash CD.', modifier: { durationBonus: 4, cooldownReduction: 15, procs: [{ id: 'bf_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'sword_slash' }] } },
    keystone: { name: 'ENDLESS FURY', desc: '+8s duration. -25% cooldown. -30% buff effect. +5% attack speed to all skills.', modifier: { durationBonus: 8, cooldownReduction: 25, abilityEffect: { damageMult: 0.70 }, globalEffect: { attackSpeedMult: 1.05 } } },
  },
  { // B2 — Effect Amplification
    notable: { name: 'Heightened Rage', desc: '+50% buff damage effect. +10% crit while active.', modifier: { abilityEffect: { damageMult: 1.50 }, incCritChance: 10 } },
    keystone: { name: 'BERSERKER FURY', desc: '+100% buff damage effect. +20% self damage taken. +5% damage to all skills.', modifier: { abilityEffect: { damageMult: 2.0 }, increasedDamageTaken: 20, globalEffect: { damageMult: 1.05 } } },
  },
  { // B3 — Synergy
    notable: { name: 'Furious Synergy', desc: 'While active: all sword skills gain +5% crit. On activation: Fortify 2 stacks.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, globalEffect: { critChanceBonus: 5 } } },
    keystone: { name: 'WAR CRY', desc: 'While active: all skills gain +10% damage. -50% buff duration. +10% defense to all skills.', modifier: { durationBonus: -7, globalEffect: { damageMult: 1.10, defenseMult: 1.10 } } },
  },
];

// ─── 9. RIPOSTE (Buff) ────────────────────────────────────

const RIPOSTE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Duration & Uptime
    notable: { name: 'Sustained Guard', desc: '+3s duration. -15% cooldown. On activation: reset Blade Ward CD.', modifier: { durationBonus: 3, cooldownReduction: 15, procs: [{ id: 'ri_b1_n1_reset', chance: 1.0, trigger: 'onHit', resetCooldown: 'sword_blade_ward' }] } },
    keystone: { name: 'ETERNAL GUARD', desc: '+6s duration. -25% cooldown. -30% defense effect. +5% crit to all skills.', modifier: { durationBonus: 6, cooldownReduction: 25, abilityEffect: { defenseMult: 0.70 }, globalEffect: { critChanceBonus: 5 } } },
  },
  { // B2 — Effect Amplification
    notable: { name: 'Hardened Riposte', desc: '+50% defense buff effect. +10 all resist while active.', modifier: { abilityEffect: { defenseMult: 1.50, resistBonus: 10 } } },
    keystone: { name: 'UNBREAKABLE', desc: '+100% defense buff effect. -20% damage dealt. +5% defense to all skills.', modifier: { abilityEffect: { defenseMult: 2.0 }, incDamage: -20, globalEffect: { defenseMult: 1.05 } } },
  },
  { // B3 — Synergy
    notable: { name: 'Counter Synergy', desc: 'While active: on block cast Slash. Fortify 2 stacks on activation.', modifier: { fortifyOnHit: { stacks: 2, duration: 5, damageReduction: 4 }, procs: [{ id: 'ri_b3_n1_sl', chance: 1.0, trigger: 'onBlock', castSkill: 'sword_slash' }] } },
    keystone: { name: 'MIRROR GUARD', desc: 'While active: all skills gain +15 resist. -50% buff duration. +10% attack speed to all skills.', modifier: { durationBonus: -5, globalEffect: { resistBonus: 15, attackSpeedMult: 1.10 } } },
  },
];

// ─── 10. KEEN EDGE (Passive) ───────────────────────────────

const KEEN_EDGE_OVERRIDES: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride] = [
  { // B1 — Drop Rate
    notable: { name: 'Sharp Scavenger', desc: '+15% item drops. +10% material drops.', modifier: { abilityEffect: { itemDropMult: 1.15, materialDropMult: 1.10 } } },
    keystone: { name: 'TREASURE BLADE', desc: '+25% item drops. +25% material drops. -10% damage. +5% item drops to all skills.', modifier: { incDamage: -10, abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 }, globalEffect: { itemDropMult: 1.05 } } },
  },
  { // B2 — XP & Progression
    notable: { name: 'Battle Wisdom', desc: '+15% XP. +5% item drops.', modifier: { abilityEffect: { xpMult: 1.15, itemDropMult: 1.05 } } },
    keystone: { name: 'MASTER SWORDSMAN', desc: '+30% XP. -10% damage. +5% XP to all skills.', modifier: { incDamage: -10, abilityEffect: { xpMult: 1.30 }, globalEffect: { xpMult: 1.05 } } },
  },
  { // B3 — Global Power
    notable: { name: 'Sword Mastery', desc: '+8% damage, +5% crit, +5% cast speed to this skill.', modifier: { incDamage: 8, incCritChance: 5, incCastSpeed: 5 } },
    keystone: { name: 'BLADE SAINT', desc: '+5% damage, +3% crit, +5% speed to all skills.', modifier: { globalEffect: { damageMult: 1.05, critChanceBonus: 3, attackSpeedMult: 1.05 } } },
  },
];

// ─── Buff/passive branch templates ─────────────────────────

const BUFF_B1: BranchTemplate = {
  name: 'Duration',
  root:  { name: 'Extended Focus', desc: '+2s duration, -5% cooldown',          modifier: { durationBonus: 2, cooldownReduction: 5 } },
  minor: { name: 'Steady Pulse',   desc: '+2s duration, +3% cast speed',        modifier: { durationBonus: 2, incCastSpeed: 3 } },
};

const BUFF_B2: BranchTemplate = {
  name: 'Amplification',
  root:  { name: 'Empowered',      desc: '+5% buff effect, +3% damage',         modifier: { abilityEffect: { damageMult: 1.05 }, incDamage: 3 } },
  minor: { name: 'Intensify',      desc: '+5% buff effect, +3% crit chance',    modifier: { abilityEffect: { damageMult: 1.05 }, incCritChance: 3 } },
};

const BUFF_B3: BranchTemplate = {
  name: 'Synergy',
  root:  { name: 'Linked Power',   desc: '+3% damage to all skills, +3 life on hit', modifier: { globalEffect: { damageMult: 1.03 }, lifeOnHit: 3 } },
  minor: { name: 'Resonance',      desc: '+3% crit to all skills, +5 resist',   modifier: { globalEffect: { critChanceBonus: 3 }, abilityEffect: { resistBonus: 5 } } },
};

const BUFF_BRIDGE_12: BridgeTemplate = { name: 'Sustained Power',  desc: '+1s duration, +3% buff effect',  modifier: { durationBonus: 1, abilityEffect: { damageMult: 1.03 } } };
const BUFF_BRIDGE_23: BridgeTemplate = { name: 'Shared Strength',  desc: '+3% buff effect, +5 resist',     modifier: { abilityEffect: { damageMult: 1.03, resistBonus: 5 } } };
const BUFF_BRIDGE_31: BridgeTemplate = { name: 'Enduring Link',    desc: '+1s duration, +2 life on hit',   modifier: { durationBonus: 1, lifeOnHit: 2 } };

const BUFF_BRANCHES: [BranchTemplate, BranchTemplate, BranchTemplate] = [BUFF_B1, BUFF_B2, BUFF_B3];
const BUFF_BRIDGES:  [BridgeTemplate, BridgeTemplate, BridgeTemplate] = [BUFF_BRIDGE_12, BUFF_BRIDGE_23, BUFF_BRIDGE_31];

// ─── Passive branch templates ──────────────────────────────

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

// ─── Build all trees ───────────────────────────────────────

const SLASH_GRAPH           = createCompactTree({ skillId: 'sword_slash',          prefix: 'sl',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: SLASH_OVERRIDES, startName: 'Blade Focus' });
const DOUBLE_STRIKE_GRAPH   = createCompactTree({ skillId: 'sword_double_strike',  prefix: 'ds',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: DOUBLE_STRIKE_OVERRIDES, startName: 'Twin Edge' });
const WHIRLWIND_GRAPH       = createCompactTree({ skillId: 'sword_whirlwind',      prefix: 'ww',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: WHIRLWIND_OVERRIDES, startName: 'Vortex Core' });
const FLAME_SLASH_GRAPH     = createCompactTree({ skillId: 'sword_flame_slash',    prefix: 'fs',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: FLAME_SLASH_OVERRIDES, startName: 'Ember Edge' });
const BLADE_WARD_GRAPH      = createCompactTree({ skillId: 'sword_blade_ward',     prefix: 'bw',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: BLADE_WARD_OVERRIDES, startName: 'Guardian Stance' });
const MORTAL_STRIKE_GRAPH   = createCompactTree({ skillId: 'sword_mortal_strike',  prefix: 'ms',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: MORTAL_STRIKE_OVERRIDES, startName: 'Death\'s Edge' });
const ICE_THRUST_GRAPH      = createCompactTree({ skillId: 'sword_ice_thrust',     prefix: 'it',  branches: SW_BRANCHES, bridges: SW_BRIDGES, overrides: ICE_THRUST_OVERRIDES, startName: 'Frost Point' });

const BLADE_FURY_GRAPH      = createCompactTree({ skillId: 'sword_blade_fury',     prefix: 'bfu', branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: BLADE_FURY_OVERRIDES, startName: 'Battle Fury' });
const RIPOSTE_GRAPH         = createCompactTree({ skillId: 'sword_riposte',        prefix: 'ri',  branches: BUFF_BRANCHES, bridges: BUFF_BRIDGES, overrides: RIPOSTE_OVERRIDES, startName: 'Guard Stance' });

const KEEN_EDGE_GRAPH       = createCompactTree({ skillId: 'sword_keen_edge',      prefix: 'ke',  branches: PASSIVE_BRANCHES, bridges: PASSIVE_BRIDGES, overrides: KEEN_EDGE_OVERRIDES, startName: 'Honed Steel' });

// ─── Export ────────────────────────────────────────────────

export const SWORD_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'sword_slash':          SLASH_GRAPH,
  'sword_double_strike':  DOUBLE_STRIKE_GRAPH,
  'sword_whirlwind':      WHIRLWIND_GRAPH,
  'sword_flame_slash':    FLAME_SLASH_GRAPH,
  'sword_blade_ward':     BLADE_WARD_GRAPH,
  'sword_mortal_strike':  MORTAL_STRIKE_GRAPH,
  'sword_ice_thrust':     ICE_THRUST_GRAPH,
  'sword_blade_fury':     BLADE_FURY_GRAPH,
  'sword_riposte':        RIPOSTE_GRAPH,
  'sword_keen_edge':      KEEN_EDGE_GRAPH,
};

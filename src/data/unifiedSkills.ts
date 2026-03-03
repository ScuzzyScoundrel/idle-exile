// ============================================================
// Idle Exile — Unified Skill Definitions (10J consolidated)
// ALL skill/ability data embedded directly — no external deps.
// Merges ActiveSkillDefs (93) + AbilityDefs (42) = 135 SkillDefs.
// ============================================================

import type { SkillDef, SkillKind, WeaponType, ActiveSkillDef, AbilityDef } from '../types';
import { WAND_SKILL_GRAPHS } from './skillGraphs/wand';

// ============================================================
// ACTIVE SKILL DEFINITIONS (93 skills, 10E elemental diversity + 10P weapon coverage)
// 6-8 skills per weapon type x 14 weapon types
// ============================================================

export const ACTIVE_SKILL_DEFS: ActiveSkillDef[] = [
  // ────────────────────────────────────────────
  // SWORD (1H Melee Attack)
  // ────────────────────────────────────────────
  {
    id: 'sword_slash',
    name: 'Slash',
    description: 'A basic sword strike.',
    weaponType: 'sword',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\u2694\uFE0F',
  },
  {
    id: 'sword_double_strike',
    name: 'Double Strike',
    description: 'Two rapid thrusts in quick succession.',
    weaponType: 'sword',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 4,
    levelRequired: 4,
    icon: '\u2694\uFE0F',
    hitCount: 2,
  },
  {
    id: 'sword_whirlwind',
    name: 'Frost Whirl',
    description: 'Spin in a freezing arc, striking all nearby enemies with cold.',
    weaponType: 'sword',
    tags: ['Attack', 'Cold', 'Melee', 'AoE'],
    baseDamage: 5,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'sword_flame_slash',
    name: 'Flame Slash',
    description: 'Imbue your blade with fire, dealing fire damage.',
    weaponType: 'sword',
    tags: ['Attack', 'Fire', 'Melee'],
    baseDamage: 5,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 6,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'sword_blade_ward',
    name: 'Thunder Guard',
    description: 'A defensive stance crackling with lightning that shocks attackers.',
    weaponType: 'sword',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 3,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'sword_mortal_strike',
    name: 'Mortal Strike',
    description: 'A devastating overhead blow. High damage, long cooldown.',
    weaponType: 'sword',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 15,
    weaponDamagePercent: 1.8,
    spellPowerRatio: 0,
    castTime: 1.5,
    cooldown: 8,
    levelRequired: 14,
    icon: '\uD83D\uDDE1\uFE0F',
  },

  {
    id: 'sword_ice_thrust',
    name: 'Ice Thrust',
    description: 'A piercing cold strike that chills the target to the bone.',
    weaponType: 'sword',
    tags: ['Attack', 'Cold', 'Melee'],
    baseDamage: 4,
    weaponDamagePercent: 0.9,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 12,
    icon: '\u2744\uFE0F',
  },

  // ────────────────────────────────────────────
  // AXE (1H Melee Attack)
  // ────────────────────────────────────────────
  {
    id: 'axe_chop',
    name: 'Chop',
    description: 'A basic axe swing.',
    weaponType: 'axe',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83E\uDE93',
  },
  {
    id: 'axe_frenzy',
    name: 'Frenzy',
    description: 'Wild axe swings with increasing ferocity.',
    weaponType: 'axe',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 0.55,
    spellPowerRatio: 0,
    castTime: 0.8,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83D\uDCA2',
  },
  {
    id: 'axe_cleave',
    name: 'Thunder Cleave',
    description: 'A wide electrified swing that shocks everything in front.',
    weaponType: 'axe',
    tags: ['Attack', 'Lightning', 'Melee', 'AoE'],
    baseDamage: 4,
    weaponDamagePercent: 0.9,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u26A1',
  },
  {
    id: 'axe_searing_axe',
    name: 'Searing Axe',
    description: 'Superheat the axe head, adding fire damage to strikes.',
    weaponType: 'axe',
    tags: ['Attack', 'Fire', 'Melee'],
    baseDamage: 6,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 6,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'axe_rend',
    name: 'Rend',
    description: 'Tear into the enemy, causing a bleeding wound over time.',
    weaponType: 'axe',
    tags: ['Attack', 'Physical', 'Melee', 'DoT'],
    baseDamage: 0,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '\uD83E\uDE78',
    dotDuration: 4,
    dotDamagePercent: 0.3,
  },
  {
    id: 'axe_decapitate',
    name: 'Decapitate',
    description: 'A brutal execution strike with massive damage.',
    weaponType: 'axe',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 20,
    weaponDamagePercent: 2.0,
    spellPowerRatio: 0,
    castTime: 1.6,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83D\uDC80',
  },

  {
    id: 'axe_frost_rend',
    name: 'Frost Rend',
    description: 'Tear into the enemy with a frozen blade, causing frostbite over time.',
    weaponType: 'axe',
    tags: ['Attack', 'Cold', 'Melee', 'DoT'],
    baseDamage: 2,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 12,
    icon: '\u2744\uFE0F',
    dotDuration: 4,
    dotDamagePercent: 0.3,
  },

  // ────────────────────────────────────────────
  // MACE (1H Melee Attack)
  // ────────────────────────────────────────────
  {
    id: 'mace_crush',
    name: 'Crush',
    description: 'A heavy mace blow.',
    weaponType: 'mace',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83D\uDD28',
  },
  {
    id: 'mace_rapid_strikes',
    name: 'Rapid Strikes',
    description: 'Quick flurry of mace blows.',
    weaponType: 'mace',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0,
    castTime: 0.75,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83D\uDD28',
  },
  {
    id: 'mace_shockwave',
    name: 'Thunderstrike',
    description: 'Slam the ground with lightning force, shocking all nearby enemies.',
    weaponType: 'mace',
    tags: ['Attack', 'Lightning', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u26A1',
  },
  {
    id: 'mace_glacial_hammer',
    name: 'Glacial Hammer',
    description: 'Channel frost into the mace, dealing cold damage.',
    weaponType: 'mace',
    tags: ['Attack', 'Cold', 'Melee'],
    baseDamage: 4,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 6,
    levelRequired: 6,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'mace_concussive_blow',
    name: 'Molten Blow',
    description: 'A fiery strike that sears the target with molten force.',
    weaponType: 'mace',
    tags: ['Attack', 'Fire', 'Melee'],
    baseDamage: 3,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 10,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'mace_pulverise',
    name: 'Pulverise',
    description: 'An earth-shattering overhead smash.',
    weaponType: 'mace',
    tags: ['Attack', 'Physical', 'Melee', 'AoE'],
    baseDamage: 18,
    weaponDamagePercent: 1.9,
    spellPowerRatio: 0,
    castTime: 1.6,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83D\uDCA5',
  },

  // ────────────────────────────────────────────
  // DAGGER (1H Hybrid Melee)
  // ────────────────────────────────────────────
  {
    id: 'dagger_stab',
    name: 'Stab',
    description: 'A quick piercing strike.',
    weaponType: 'dagger',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 0.8,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83D\uDDE1\uFE0F',
  },
  {
    id: 'dagger_blade_flurry',
    name: 'Blade Flurry',
    description: 'Three rapid stabs in quick succession.',
    weaponType: 'dagger',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 0.4,
    spellPowerRatio: 0,
    castTime: 0.9,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83D\uDDE1\uFE0F',
    hitCount: 3,
  },
  {
    id: 'dagger_fan_of_knives',
    name: 'Frost Fan',
    description: 'Throw a spread of frost-tipped knives that chill all nearby enemies.',
    weaponType: 'dagger',
    tags: ['Attack', 'Cold', 'AoE', 'Projectile'],
    baseDamage: 4,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'dagger_viper_strike',
    name: 'Viper Strike',
    description: 'A venomous strike that poisons the target over time.',
    weaponType: 'dagger',
    tags: ['Attack', 'Chaos', 'Melee', 'DoT'],
    baseDamage: 2,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 0.9,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDC0D',
    dotDuration: 5,
    dotDamagePercent: 0.25,
  },
  {
    id: 'dagger_smoke_screen',
    name: 'Shadow Step',
    description: 'Step through the void, striking from corrupted shadows.',
    weaponType: 'dagger',
    tags: ['Attack', 'Chaos', 'Melee'],
    baseDamage: 2,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '\uD83D\uDC7E',
  },
  {
    id: 'dagger_assassinate',
    name: 'Assassinate',
    description: 'A lethal strike from the shadows. Massive single-target damage.',
    weaponType: 'dagger',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 12,
    weaponDamagePercent: 2.2,
    spellPowerRatio: 0,
    castTime: 1.4,
    cooldown: 8,
    levelRequired: 14,
    icon: '\uD83D\uDDE1\uFE0F',
  },

  {
    id: 'dagger_lightning_lunge',
    name: 'Lightning Lunge',
    description: 'Dash forward with electrified speed, striking with shocking force.',
    weaponType: 'dagger',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 3,
    weaponDamagePercent: 0.65,
    spellPowerRatio: 0,
    castTime: 0.7,
    cooldown: 4,
    levelRequired: 12,
    icon: '\u26A1',
  },

  // ────────────────────────────────────────────
  // STAFF (2H Spell)
  // ────────────────────────────────────────────
  {
    id: 'staff_arcane_bolt',
    name: 'Arcane Bolt',
    description: 'A basic bolt of arcane energy.',
    weaponType: 'staff',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83D\uDD2E',
  },
  {
    id: 'staff_spark',
    name: 'Spark',
    description: 'Release a crackling bolt of lightning.',
    weaponType: 'staff',
    tags: ['Spell', 'Lightning', 'Projectile'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.8,
    castTime: 0.8,
    cooldown: 4,
    levelRequired: 4,
    icon: '\u26A1',
  },
  {
    id: 'staff_fireball',
    name: 'Fireball',
    description: 'Hurl an explosive ball of fire at enemies.',
    weaponType: 'staff',
    tags: ['Spell', 'Fire', 'Projectile', 'AoE'],
    baseDamage: 10,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.1,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'staff_ice_shard',
    name: 'Ice Shard',
    description: 'Launch a shard of ice that pierces through enemies.',
    weaponType: 'staff',
    tags: ['Spell', 'Cold', 'Projectile'],
    baseDamage: 7,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.9,
    castTime: 0.9,
    cooldown: 4,
    levelRequired: 6,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'staff_arcane_shield',
    name: 'Arcane Shield',
    description: 'Channel arcane energy into a protective barrier that deals damage.',
    weaponType: 'staff',
    tags: ['Spell', 'Physical'],
    baseDamage: 4,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.6,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 10,
    icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    id: 'staff_meteor',
    name: 'Meteor',
    description: 'Call down a meteor from the sky. Devastating AoE.',
    weaponType: 'staff',
    tags: ['Spell', 'Fire', 'AoE'],
    baseDamage: 30,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.8,
    castTime: 2.0,
    cooldown: 12,
    levelRequired: 14,
    icon: '\u2604\uFE0F',
  },

  // ────────────────────────────────────────────
  // WAND (1H Spell)
  // ────────────────────────────────────────────
  {
    id: 'wand_magic_missile',
    name: 'Magic Missile',
    description: 'A basic bolt of magical energy.',
    weaponType: 'wand',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 6,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.0,
    castTime: 0.9,
    cooldown: 3,
    levelRequired: 1,
    icon: '\u2728',
  },
  {
    id: 'wand_chain_lightning',
    name: 'Chain Lightning',
    description: 'Lightning that arcs between multiple targets.',
    weaponType: 'wand',
    tags: ['Spell', 'Lightning', 'Projectile'],
    baseDamage: 4,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.7,
    castTime: 0.8,
    cooldown: 4,
    levelRequired: 4,
    icon: '\u26A1',
    hitCount: 2,
  },
  {
    id: 'wand_frostbolt',
    name: 'Frostbolt',
    description: 'A chilling projectile that explodes on impact.',
    weaponType: 'wand',
    tags: ['Spell', 'Cold', 'Projectile', 'AoE'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.95,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'wand_searing_ray',
    name: 'Searing Ray',
    description: 'Channel a beam of fire at enemies.',
    weaponType: 'wand',
    tags: ['Spell', 'Fire', 'Channel'],
    baseDamage: 3,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 0.5,
    cooldown: 6,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'wand_essence_drain',
    name: 'Essence Drain',
    description: 'Drain the life force of enemies, dealing chaos damage over time.',
    weaponType: 'wand',
    tags: ['Spell', 'Chaos', 'Projectile', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.8,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 10,
    icon: '\uD83D\uDC9C',
    dotDuration: 4,
    dotDamagePercent: 0.35,
  },
  {
    id: 'wand_void_blast',
    name: 'Void Blast',
    description: 'Unleash chaotic void energy in a massive explosion.',
    weaponType: 'wand',
    tags: ['Spell', 'Chaos', 'AoE'],
    baseDamage: 25,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.6,
    castTime: 1.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83C\uDF0C',
  },

  // ────────────────────────────────────────────
  // BOW (2H Ranged Attack)
  // ────────────────────────────────────────────
  {
    id: 'bow_arrow_shot',
    name: 'Arrow Shot',
    description: 'A basic arrow shot.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83C\uDFF9',
  },
  {
    id: 'bow_rapid_fire',
    name: 'Rapid Fire',
    description: 'Loose arrows with incredible speed.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0,
    castTime: 0.7,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83C\uDFF9',
  },
  {
    id: 'bow_multi_shot',
    name: 'Ice Barrage',
    description: 'Fire a volley of frost-tipped arrows in a wide spread.',
    weaponType: 'bow',
    tags: ['Attack', 'Cold', 'Projectile', 'AoE'],
    baseDamage: 4,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'bow_burning_arrow',
    name: 'Burning Arrow',
    description: 'Ignite an arrow tip, adding fire damage.',
    weaponType: 'bow',
    tags: ['Attack', 'Fire', 'Projectile'],
    baseDamage: 4,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'bow_smoke_arrow',
    name: 'Shock Arrow',
    description: 'Fire a crackling arrow charged with lightning.',
    weaponType: 'bow',
    tags: ['Attack', 'Lightning', 'Projectile'],
    baseDamage: 3,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'bow_snipe',
    name: 'Snipe',
    description: 'Take careful aim for a devastating long-range shot.',
    weaponType: 'bow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 10,
    weaponDamagePercent: 2.0,
    spellPowerRatio: 0,
    castTime: 1.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83C\uDFAF',
  },

  // ────────────────────────────────────────────
  // CROSSBOW (2H Ranged Attack)
  // ────────────────────────────────────────────
  {
    id: 'crossbow_bolt_shot',
    name: 'Bolt Shot',
    description: 'A basic crossbow bolt.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 1.0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83E\uDE83',
  },
  {
    id: 'crossbow_burst_fire',
    name: 'Burst Fire',
    description: 'Fire two bolts in rapid succession.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 0,
    weaponDamagePercent: 0.55,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83E\uDE83',
    hitCount: 2,
  },
  {
    id: 'crossbow_explosive_bolt',
    name: 'Explosive Bolt',
    description: 'Fire an explosive bolt that detonates on impact.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Fire', 'Projectile', 'AoE'],
    baseDamage: 8,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '\uD83D\uDCA5',
  },
  {
    id: 'crossbow_frost_bolt',
    name: 'Frost Bolt',
    description: 'A freezing bolt that chills enemies.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Cold', 'Projectile'],
    baseDamage: 3,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 6,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'crossbow_net_shot',
    name: 'Shock Net',
    description: 'Fire an electrified net that shocks enemies on contact.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Lightning', 'Projectile'],
    baseDamage: 2,
    weaponDamagePercent: 0.65,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'crossbow_siege_shot',
    name: 'Siege Shot',
    description: 'A heavy armor-piercing bolt with massive impact.',
    weaponType: 'crossbow',
    tags: ['Attack', 'Physical', 'Projectile'],
    baseDamage: 15,
    weaponDamagePercent: 2.1,
    spellPowerRatio: 0,
    castTime: 1.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83E\uDE83',
  },

  // ────────────────────────────────────────────
  // GREATSWORD (2H Melee Attack — wide cleaves)
  // ────────────────────────────────────────────
  {
    id: 'greatsword_cleave',
    name: 'Cleave',
    description: 'A wide sweeping strike with a greatsword.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.2,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 3,
    levelRequired: 1,
    icon: '\u2694\uFE0F',
  },
  {
    id: 'greatsword_wide_sweep',
    name: 'Wide Sweep',
    description: 'A massive horizontal swing that hits twice.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'AoE'],
    baseDamage: 0,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 4,
    levelRequired: 4,
    icon: '\u2694\uFE0F',
    hitCount: 2,
  },
  {
    id: 'greatsword_flame_arc',
    name: 'Flame Arc',
    description: 'Sweep the blade in a fiery arc, scorching everything in range.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Fire', 'Melee', 'AoE'],
    baseDamage: 6,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'greatsword_frost_wave',
    name: 'Frost Wave',
    description: 'Unleash a wave of frost with each swing.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Cold', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'greatsword_thunder_crash',
    name: 'Thunder Crash',
    description: 'Bring the blade down with thunderous force.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 5,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 6,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'greatsword_bleeding_edge',
    name: 'Bleeding Edge',
    description: 'A razor-sharp slash that leaves a deep wound.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee', 'DoT'],
    baseDamage: 3,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 12,
    icon: '\uD83E\uDE78',
    dotDuration: 5,
    dotDamagePercent: 0.3,
  },
  {
    id: 'greatsword_annihilate',
    name: 'Annihilate',
    description: 'A devastating overhead strike that obliterates the target.',
    weaponType: 'greatsword',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 22,
    weaponDamagePercent: 2.2,
    spellPowerRatio: 0,
    castTime: 1.8,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83D\uDCA5',
  },

  // ────────────────────────────────────────────
  // GREATAXE (2H Melee Attack — brutal, bleeds)
  // ────────────────────────────────────────────
  {
    id: 'greataxe_hew',
    name: 'Hew',
    description: 'A brutal chop with a greataxe.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.2,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83E\uDE93',
  },
  {
    id: 'greataxe_double_chop',
    name: 'Double Chop',
    description: 'Two rapid axe swings in quick succession.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 0.55,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83E\uDE93',
    hitCount: 2,
  },
  {
    id: 'greataxe_searing_cleave',
    name: 'Searing Cleave',
    description: 'A wide fiery cleave that scorches all in its path.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Fire', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'greataxe_glacial_rend',
    name: 'Glacial Rend',
    description: 'Tear into the enemy with a frost-covered blade, causing frostbite.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Cold', 'Melee', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
    dotDuration: 4,
    dotDamagePercent: 0.3,
  },
  {
    id: 'greataxe_shock_split',
    name: 'Shock Split',
    description: 'Split the air with a lightning-charged swing.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 6,
    weaponDamagePercent: 0.85,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 6,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'greataxe_hemorrhage',
    name: 'Hemorrhage',
    description: 'A vicious strike that causes severe bleeding.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Physical', 'Melee', 'DoT'],
    baseDamage: 4,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 12,
    icon: '\uD83E\uDE78',
    dotDuration: 5,
    dotDamagePercent: 0.35,
  },
  {
    id: 'greataxe_skull_splitter',
    name: 'Skull Splitter',
    description: 'An earth-shattering overhead blow that splits skulls.',
    weaponType: 'greataxe',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 25,
    weaponDamagePercent: 2.4,
    spellPowerRatio: 0,
    castTime: 1.9,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83D\uDC80',
  },

  // ────────────────────────────────────────────
  // MAUL (2H Melee Attack — ground slams, AoE)
  // ────────────────────────────────────────────
  {
    id: 'maul_slam',
    name: 'Slam',
    description: 'A heavy slam with a maul.',
    weaponType: 'maul',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 0,
    weaponDamagePercent: 1.2,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83D\uDD28',
  },
  {
    id: 'maul_ground_pound',
    name: 'Ground Pound',
    description: 'Smash the ground twice, sending shockwaves outward.',
    weaponType: 'maul',
    tags: ['Attack', 'Physical', 'Melee', 'AoE'],
    baseDamage: 0,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83D\uDD28',
    hitCount: 2,
  },
  {
    id: 'maul_molten_strike',
    name: 'Molten Strike',
    description: 'Slam the ground with molten force, creating a pool of fire.',
    weaponType: 'maul',
    tags: ['Attack', 'Fire', 'Melee', 'AoE'],
    baseDamage: 8,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'maul_permafrost',
    name: 'Permafrost',
    description: 'Shatter the frozen ground, sending ice shards in all directions.',
    weaponType: 'maul',
    tags: ['Attack', 'Cold', 'Melee', 'AoE'],
    baseDamage: 6,
    weaponDamagePercent: 0.7,
    spellPowerRatio: 0,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'maul_thunder_slam',
    name: 'Thunder Slam',
    description: 'Bring the maul down with thunderous impact.',
    weaponType: 'maul',
    tags: ['Attack', 'Lightning', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0,
    castTime: 1.3,
    cooldown: 6,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'maul_seismic_wave',
    name: 'Seismic Wave',
    description: 'Send a seismic wave through the ground, dealing damage over time.',
    weaponType: 'maul',
    tags: ['Attack', 'Physical', 'Melee', 'AoE', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0.75,
    spellPowerRatio: 0,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 12,
    icon: '\uD83C\uDF0B',
    dotDuration: 4,
    dotDamagePercent: 0.25,
  },
  {
    id: 'maul_cataclysm',
    name: 'Cataclysm',
    description: 'An apocalyptic slam that devastates everything nearby.',
    weaponType: 'maul',
    tags: ['Attack', 'Physical', 'Melee', 'AoE'],
    baseDamage: 28,
    weaponDamagePercent: 2.5,
    spellPowerRatio: 0,
    castTime: 2.0,
    cooldown: 12,
    levelRequired: 14,
    icon: '\uD83D\uDCA5',
  },

  // ────────────────────────────────────────────
  // SCEPTER (1H Hybrid — divine smiting)
  // ────────────────────────────────────────────
  {
    id: 'scepter_smite',
    name: 'Smite',
    description: 'A divine strike combining physical and spiritual force.',
    weaponType: 'scepter',
    tags: ['Attack', 'Physical', 'Melee'],
    baseDamage: 3,
    weaponDamagePercent: 0.6,
    spellPowerRatio: 0.4,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83D\uDD31',
  },
  {
    id: 'scepter_holy_strike',
    name: 'Holy Strike',
    description: 'Two rapid strikes of divine lightning.',
    weaponType: 'scepter',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 4,
    weaponDamagePercent: 0.5,
    spellPowerRatio: 0.4,
    castTime: 0.9,
    cooldown: 4,
    levelRequired: 4,
    icon: '\u26A1',
    hitCount: 2,
  },
  {
    id: 'scepter_flame_brand',
    name: 'Flame Brand',
    description: 'Channel fire through the scepter to brand enemies.',
    weaponType: 'scepter',
    tags: ['Spell', 'Fire', 'Melee'],
    baseDamage: 6,
    weaponDamagePercent: 0.4,
    spellPowerRatio: 0.5,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'scepter_frost_judgment',
    name: 'Frost Judgment',
    description: 'Pass frozen judgment on nearby enemies.',
    weaponType: 'scepter',
    tags: ['Spell', 'Cold', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0.3,
    spellPowerRatio: 0.6,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'scepter_divine_bolt',
    name: 'Divine Bolt',
    description: 'Launch a bolt of pure divine energy.',
    weaponType: 'scepter',
    tags: ['Spell', 'Lightning', 'Projectile'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.9,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '\u2728',
  },
  {
    id: 'scepter_chaos_curse',
    name: 'Chaos Curse',
    description: 'Curse the target with chaotic energy that decays over time.',
    weaponType: 'scepter',
    tags: ['Spell', 'Chaos', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.7,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 12,
    icon: '\uD83D\uDC9C',
    dotDuration: 5,
    dotDamagePercent: 0.3,
  },
  {
    id: 'scepter_wrath',
    name: 'Wrath',
    description: 'Unleash the full wrath of the divine upon your foe.',
    weaponType: 'scepter',
    tags: ['Attack', 'Lightning', 'Melee'],
    baseDamage: 18,
    weaponDamagePercent: 0.8,
    spellPowerRatio: 0.8,
    castTime: 1.5,
    cooldown: 8,
    levelRequired: 14,
    icon: '\uD83D\uDD31',
  },

  // ────────────────────────────────────────────
  // GAUNTLET (1H Spell — elemental fists)
  // ────────────────────────────────────────────
  {
    id: 'gauntlet_arcane_fist',
    name: 'Arcane Fist',
    description: 'Channel arcane energy through your fist.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Physical', 'Melee'],
    baseDamage: 7,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83E\uDD4A',
  },
  {
    id: 'gauntlet_rapid_bolts',
    name: 'Rapid Bolts',
    description: 'Fire three quick arcane bolts from your fists.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 3,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 0.8,
    cooldown: 4,
    levelRequired: 4,
    icon: '\u2728',
    hitCount: 3,
  },
  {
    id: 'gauntlet_flame_palm',
    name: 'Flame Palm',
    description: 'Slam your burning palm into the enemy.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Fire', 'Melee'],
    baseDamage: 6,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.85,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'gauntlet_frost_grip',
    name: 'Frost Grip',
    description: 'Grip enemies with freezing force that chills the area.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Cold', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.9,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'gauntlet_shock_pulse',
    name: 'Shock Pulse',
    description: 'Release a pulse of lightning from your fists.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Lightning', 'Melee'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.95,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'gauntlet_void_grasp',
    name: 'Void Grasp',
    description: 'Grasp enemies with void energy that corrodes over time.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Chaos', 'Melee', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.8,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 12,
    icon: '\uD83D\uDC7E',
    dotDuration: 4,
    dotDamagePercent: 0.3,
  },
  {
    id: 'gauntlet_elemental_burst',
    name: 'Elemental Burst',
    description: 'Explode with elemental fury, devastating everything nearby.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Fire', 'Melee', 'AoE'],
    baseDamage: 25,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.7,
    castTime: 1.6,
    cooldown: 10,
    levelRequired: 14,
    icon: '\uD83D\uDCA5',
  },

  // ────────────────────────────────────────────
  // TOME (2H Spell — arcane knowledge, curses)
  // ────────────────────────────────────────────
  {
    id: 'tome_incantation',
    name: 'Incantation',
    description: 'Read an incantation that hurls arcane energy.',
    weaponType: 'tome',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '\uD83D\uDCD6',
  },
  {
    id: 'tome_eldritch_barrage',
    name: 'Eldritch Barrage',
    description: 'Unleash a rapid barrage of eldritch bolts.',
    weaponType: 'tome',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 3,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.45,
    castTime: 0.9,
    cooldown: 4,
    levelRequired: 4,
    icon: '\uD83D\uDCD6',
    hitCount: 3,
  },
  {
    id: 'tome_inferno_page',
    name: 'Inferno Page',
    description: 'Tear a page of fire from the tome, launching a searing projectile.',
    weaponType: 'tome',
    tags: ['Spell', 'Fire', 'Projectile'],
    baseDamage: 7,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.9,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 6,
    icon: '\uD83D\uDD25',
  },
  {
    id: 'tome_glacial_tome',
    name: 'Glacial Tome',
    description: 'Invoke a passage of frost, chilling a wide area.',
    weaponType: 'tome',
    tags: ['Spell', 'Cold', 'Projectile', 'AoE'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.95,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 8,
    icon: '\u2744\uFE0F',
  },
  {
    id: 'tome_thunderscript',
    name: 'Thunderscript',
    description: 'Read the words of thunder, striking with lightning.',
    weaponType: 'tome',
    tags: ['Spell', 'Lightning', 'Projectile'],
    baseDamage: 9,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.0,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 10,
    icon: '\u26A1',
  },
  {
    id: 'tome_curse_of_decay',
    name: 'Curse of Decay',
    description: 'Speak a curse that rots the target from within.',
    weaponType: 'tome',
    tags: ['Spell', 'Chaos', 'DoT'],
    baseDamage: 4,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.7,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 12,
    icon: '\uD83D\uDC9C',
    dotDuration: 5,
    dotDamagePercent: 0.35,
  },
  {
    id: 'tome_apocalypse',
    name: 'Apocalypse',
    description: 'Open the final chapter, raining fire and destruction.',
    weaponType: 'tome',
    tags: ['Spell', 'Fire', 'Projectile', 'AoE'],
    baseDamage: 32,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.9,
    castTime: 2.0,
    cooldown: 12,
    levelRequired: 14,
    icon: '\u2604\uFE0F',
  },
];

// ============================================================
// ABILITY DEFINITIONS (42 abilities)
// 14 weapon types x (2 buff + 1 passive each)
// Now with skill trees (converted from old mutator system)
// ============================================================

export const ABILITY_DEFS: AbilityDef[] = [
  // ==================== Sword — Balanced melee ====================
  {
    id: 'sword_blade_fury', name: 'Blade Fury', description: '2x damage for 15s.',
    weaponType: 'sword', kind: 'buff', icon: '\u2694\uFE0F',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Fury', description: 'Extend the duration of Blade Fury.', nodes: [
          { id: 'sword_bf_a1', name: 'Extended Fury', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'sword_bf_a2', name: 'Sustained Fury', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'sword_bf_a1' },
        ]},
        { id: 'B', name: 'Precision Fury', description: 'Add crit chance to Blade Fury.', nodes: [
          { id: 'sword_bf_b1', name: 'Sharpened Edge', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'sword_bf_b2', name: 'Precision Fury', description: '+10% crit chance', tier: 2, effect: { critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'sword_bf_b1' },
        ]},
        { id: 'C', name: 'Frenzied Fury', description: 'Add attack speed to Blade Fury.', nodes: [
          { id: 'sword_bf_c1', name: 'Quick Strikes', description: '+20% attack speed', tier: 1, effect: { attackSpeedMult: 1.2 } },
          { id: 'sword_bf_c2', name: 'Frenzied Fury', description: '+50% attack speed', tier: 2, effect: { attackSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'sword_bf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'sword_riposte', name: 'Riposte', description: '2x defense for 10s.',
    weaponType: 'sword', kind: 'buff', icon: '\uD83D\uDEE1\uFE0F',
    duration: 10, cooldown: 45,
    effect: { defenseMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Counter Strike', description: 'Add damage while defending.', nodes: [
          { id: 'sword_rip_a1', name: 'Opportunist', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'sword_rip_a2', name: 'Counter Strike', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'sword_rip_a1' },
        ]},
        { id: 'B', name: 'Stalwart Guard', description: 'Extend Riposte duration.', nodes: [
          { id: 'sword_rip_b1', name: 'Hold the Line', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'sword_rip_b2', name: 'Stalwart Guard', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'sword_rip_b1' },
        ]},
        { id: 'C', name: 'Iron Bulwark', description: 'Boost defense further.', nodes: [
          { id: 'sword_rip_c1', name: 'Fortified Stance', description: '+10 all resist', tier: 1, effect: { resistBonus: 10 } },
          { id: 'sword_rip_c2', name: 'Iron Bulwark', description: '+25 all resist', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'sword_rip_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'sword_keen_edge', name: 'Keen Edge', description: '+15% crit chance (passive).',
    weaponType: 'sword', kind: 'passive', icon: '\uD83D\uDDE1\uFE0F',
    effect: { critChanceBonus: 15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lethal Edge', description: 'Convert crit chance to crit damage.', nodes: [
          { id: 'sword_ke_a1', name: 'Keen Blade', description: '+5% crit damage', tier: 1, effect: { critMultiplierBonus: 5 } },
          { id: 'sword_ke_a2', name: 'Lethal Edge', description: 'Swap to +20% crit damage', tier: 2, effect: { critChanceBonus: 0, critMultiplierBonus: 20 }, isPathPayoff: true, requiresNodeId: 'sword_ke_a1' },
        ]},
        { id: 'B', name: 'Balanced Edge', description: 'Mix of crit chance and damage.', nodes: [
          { id: 'sword_ke_b1', name: 'Honed Strike', description: '+3% crit chance', tier: 1, effect: { critChanceBonus: 3 } },
          { id: 'sword_ke_b2', name: 'Balanced Edge', description: '+8% crit chance + 8% crit damage', tier: 2, effect: { critChanceBonus: 8, critMultiplierBonus: 8 }, isPathPayoff: true, requiresNodeId: 'sword_ke_b1' },
        ]},
        { id: 'C', name: 'Razor Focus', description: 'Pure crit chance stacking.', nodes: [
          { id: 'sword_ke_c1', name: 'Sharp Eye', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'sword_ke_c2', name: 'Razor Focus', description: '+10% crit chance', tier: 2, effect: { critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'sword_ke_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Axe — High damage, slow ====================
  {
    id: 'axe_cleave', name: 'Cleave', description: '1.5x damage + double clears for 20s.',
    weaponType: 'axe', kind: 'buff', icon: '\uD83E\uDE93',
    duration: 20, cooldown: 90,
    effect: { damageMult: 1.5, doubleClears: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Relentless Cleave', description: 'Extend Cleave duration.', nodes: [
          { id: 'axe_cl_a1', name: 'Sustained Swings', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'axe_cl_a2', name: 'Relentless Cleave', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'axe_cl_a1' },
        ]},
        { id: 'B', name: 'Brutal Cleave', description: 'More damage, no double clears.', nodes: [
          { id: 'axe_cl_b1', name: 'Heavy Chop', description: '+50% damage', tier: 1, effect: { damageMult: 1.5 } },
          { id: 'axe_cl_b2', name: 'Brutal Cleave', description: '3x damage, no double clears', tier: 2, effect: { damageMult: 3.0, doubleClears: false }, isPathPayoff: true, requiresNodeId: 'axe_cl_b1' },
        ]},
        { id: 'C', name: 'Whirlwind', description: 'Add material drops to Cleave.', nodes: [
          { id: 'axe_cl_c1', name: 'Scattering Blows', description: '+10% material drops', tier: 1, effect: { materialDropMult: 1.1 } },
          { id: 'axe_cl_c2', name: 'Whirlwind', description: '+25% material drops', tier: 2, effect: { materialDropMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'axe_cl_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'axe_berserker_rage', name: 'Berserker Rage', description: '3x damage for 12s.',
    weaponType: 'axe', kind: 'buff', icon: '\uD83D\uDD25',
    duration: 12, cooldown: 60,
    effect: { damageMult: 3.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Frenzied Rage', description: 'Add attack speed to Berserker Rage.', nodes: [
          { id: 'axe_br_a1', name: 'Wild Swings', description: '+25% attack speed', tier: 1, effect: { attackSpeedMult: 1.25 } },
          { id: 'axe_br_a2', name: 'Frenzied Rage', description: '+50% attack speed', tier: 2, effect: { attackSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'axe_br_a1' },
        ]},
        { id: 'B', name: 'Sustained Rage', description: 'Extend Berserker Rage duration.', nodes: [
          { id: 'axe_br_b1', name: 'Lingering Fury', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'axe_br_b2', name: 'Sustained Rage', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'axe_br_b1' },
        ]},
        { id: 'C', name: 'Blood Rage', description: 'Add crit during rage.', nodes: [
          { id: 'axe_br_c1', name: 'Reckless Strikes', description: '+10% crit chance', tier: 1, effect: { critChanceBonus: 10 } },
          { id: 'axe_br_c2', name: 'Blood Rage', description: '+20% crit damage', tier: 2, effect: { critMultiplierBonus: 20 }, isPathPayoff: true, requiresNodeId: 'axe_br_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'axe_heavy_blows', name: 'Heavy Blows', description: '+20% damage (passive).',
    weaponType: 'axe', kind: 'passive', icon: '\uD83D\uDCA2',
    effect: { damageMult: 1.2 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Devastating Blows', description: 'Convert to crit damage.', nodes: [
          { id: 'axe_hb_a1', name: 'Focused Impact', description: '+8% crit damage', tier: 1, effect: { critMultiplierBonus: 8 } },
          { id: 'axe_hb_a2', name: 'Devastating Blows', description: '+15% crit damage, less raw damage', tier: 2, effect: { damageMult: 1.0, critMultiplierBonus: 15 }, isPathPayoff: true, requiresNodeId: 'axe_hb_a1' },
        ]},
        { id: 'B', name: 'Scavenging Blows', description: 'Add material drop bonus.', nodes: [
          { id: 'axe_hb_b1', name: 'Resourceful', description: '+5% material drops', tier: 1, effect: { materialDropMult: 1.05 } },
          { id: 'axe_hb_b2', name: 'Scavenging Blows', description: '+10% damage + 10% materials', tier: 2, effect: { damageMult: 1.1, materialDropMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'axe_hb_b1' },
        ]},
        { id: 'C', name: 'Crushing Blows', description: 'Pure damage increase.', nodes: [
          { id: 'axe_hb_c1', name: 'Power Strikes', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'axe_hb_c2', name: 'Crushing Blows', description: '+30% damage total', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'axe_hb_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Mace — Tanky, consistent ====================
  {
    id: 'mace_shockwave', name: 'Shockwave', description: '1.3x damage + ignore hazards for 15s.',
    weaponType: 'mace', kind: 'buff', icon: '\uD83D\uDCA5',
    duration: 15, cooldown: 75,
    effect: { damageMult: 1.3, ignoreHazards: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lingering Shockwave', description: 'Extend Shockwave duration.', nodes: [
          { id: 'mace_sw_a1', name: 'Aftershock', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'mace_sw_a2', name: 'Lingering Shockwave', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'mace_sw_a1' },
        ]},
        { id: 'B', name: 'Defensive Shockwave', description: 'Add defense to Shockwave.', nodes: [
          { id: 'mace_sw_b1', name: 'Stabilized', description: '+50% defense', tier: 1, effect: { defenseMult: 1.5 } },
          { id: 'mace_sw_b2', name: 'Defensive Shockwave', description: '+2x defense', tier: 2, effect: { defenseMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'mace_sw_b1' },
        ]},
        { id: 'C', name: 'Quake', description: 'Boost Shockwave damage.', nodes: [
          { id: 'mace_sw_c1', name: 'Tremor', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'mace_sw_c2', name: 'Quake', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'mace_sw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'mace_fortify', name: 'Fortify', description: '3x defense for 20s.',
    weaponType: 'mace', kind: 'buff', icon: '\uD83C\uDFF0',
    duration: 20, cooldown: 60,
    effect: { defenseMult: 3.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Elemental Fortify', description: 'Add resist bonus.', nodes: [
          { id: 'mace_fo_a1', name: 'Warded', description: '+12 all resists', tier: 1, effect: { resistBonus: 12 } },
          { id: 'mace_fo_a2', name: 'Elemental Fortify', description: '+25 all resists', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'mace_fo_a1' },
        ]},
        { id: 'B', name: 'Iron Wall', description: 'Extend Fortify duration.', nodes: [
          { id: 'mace_fo_b1', name: 'Steadfast', description: '+5s duration', tier: 1, effect: {}, durationBonus: 5 },
          { id: 'mace_fo_b2', name: 'Iron Wall', description: '+10s duration', tier: 2, effect: {}, durationBonus: 10, isPathPayoff: true, requiresNodeId: 'mace_fo_b1' },
        ]},
        { id: 'C', name: 'Thorns', description: 'Add damage while fortified.', nodes: [
          { id: 'mace_fo_c1', name: 'Retaliate', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'mace_fo_c2', name: 'Thorns', description: '+30% damage while defending', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'mace_fo_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'mace_crushing_force', name: 'Crushing Force', description: '+10% damage + 10 all resists (passive).',
    weaponType: 'mace', kind: 'passive', icon: '\uD83D\uDD28',
    effect: { damageMult: 1.1, resistBonus: 10 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Iron Skin', description: 'Focus on resists.', nodes: [
          { id: 'mace_cf_a1', name: 'Hardened', description: '+5 all resists', tier: 1, effect: { resistBonus: 5 } },
          { id: 'mace_cf_a2', name: 'Iron Skin', description: '+20 resists, no damage', tier: 2, effect: { damageMult: 1.0, resistBonus: 20 }, isPathPayoff: true, requiresNodeId: 'mace_cf_a1' },
        ]},
        { id: 'B', name: 'Crushing Power', description: 'Focus on damage.', nodes: [
          { id: 'mace_cf_b1', name: 'Heavy Hitter', description: '+5% damage', tier: 1, effect: { damageMult: 1.05 } },
          { id: 'mace_cf_b2', name: 'Crushing Power', description: '+20% damage, no resists', tier: 2, effect: { damageMult: 1.2, resistBonus: 0 }, isPathPayoff: true, requiresNodeId: 'mace_cf_b1' },
        ]},
        { id: 'C', name: 'Balanced Force', description: 'Enhance both.', nodes: [
          { id: 'mace_cf_c1', name: 'Steady Force', description: '+5% damage', tier: 1, effect: { damageMult: 1.05 } },
          { id: 'mace_cf_c2', name: 'Balanced Force', description: '+15% damage + 15 resists', tier: 2, effect: { damageMult: 1.15, resistBonus: 15 }, isPathPayoff: true, requiresNodeId: 'mace_cf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Dagger — Fast, crit-focused ====================
  {
    id: 'dagger_flurry', name: 'Flurry', description: '3x attack speed for 10s.',
    weaponType: 'dagger', kind: 'buff', icon: '\u26A1',
    duration: 10, cooldown: 45,
    effect: { attackSpeedMult: 3.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Critical Flurry', description: 'Add crit chance during Flurry.', nodes: [
          { id: 'dagger_fl_a1', name: 'Precise Strikes', description: '+8% crit chance', tier: 1, effect: { critChanceBonus: 8 } },
          { id: 'dagger_fl_a2', name: 'Critical Flurry', description: '+15% crit chance', tier: 2, effect: { critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'dagger_fl_a1' },
        ]},
        { id: 'B', name: 'Extended Flurry', description: 'Extend Flurry duration.', nodes: [
          { id: 'dagger_fl_b1', name: 'Momentum', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'dagger_fl_b2', name: 'Extended Flurry', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'dagger_fl_b1' },
        ]},
        { id: 'C', name: 'Blade Storm', description: 'Add damage to Flurry.', nodes: [
          { id: 'dagger_fl_c1', name: 'Sharp Edges', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'dagger_fl_c2', name: 'Blade Storm', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'dagger_fl_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'dagger_shadow_strike', name: 'Shadow Strike', description: '+50% crit + 100% crit damage for 8s.',
    weaponType: 'dagger', kind: 'buff', icon: '\uD83C\uDF11',
    duration: 8, cooldown: 60,
    effect: { critChanceBonus: 50, critMultiplierBonus: 100 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lingering Shadow', description: 'Extend Shadow Strike.', nodes: [
          { id: 'dagger_ss_a1', name: 'Dark Veil', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'dagger_ss_a2', name: 'Lingering Shadow', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'dagger_ss_a1' },
        ]},
        { id: 'B', name: 'Assassinate', description: 'Add raw damage.', nodes: [
          { id: 'dagger_ss_b1', name: 'Exploit Weakness', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'dagger_ss_b2', name: 'Assassinate', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'dagger_ss_b1' },
        ]},
        { id: 'C', name: 'Death Mark', description: 'Push crit even higher.', nodes: [
          { id: 'dagger_ss_c1', name: 'Marked Target', description: '+25% crit damage', tier: 1, effect: { critMultiplierBonus: 25 } },
          { id: 'dagger_ss_c2', name: 'Death Mark', description: '+50% crit damage', tier: 2, effect: { critMultiplierBonus: 50 }, isPathPayoff: true, requiresNodeId: 'dagger_ss_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'dagger_lethality', name: 'Lethality', description: '+25% crit damage (passive).',
    weaponType: 'dagger', kind: 'passive', icon: '\uD83D\uDDE1\uFE0F',
    effect: { critMultiplierBonus: 25 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Precision', description: 'Convert to crit chance.', nodes: [
          { id: 'dagger_le_a1', name: 'Keen Eye', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'dagger_le_a2', name: 'Precision', description: 'Swap to +10% crit chance', tier: 2, effect: { critMultiplierBonus: 0, critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'dagger_le_a1' },
        ]},
        { id: 'B', name: 'Quick Hands', description: 'Add attack speed.', nodes: [
          { id: 'dagger_le_b1', name: 'Nimble Fingers', description: '+5% attack speed', tier: 1, effect: { attackSpeedMult: 1.05 } },
          { id: 'dagger_le_b2', name: 'Quick Hands', description: '+15% crit dmg + 10% attack speed', tier: 2, effect: { critMultiplierBonus: 15, attackSpeedMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'dagger_le_b1' },
        ]},
        { id: 'C', name: 'Lethality Mastery', description: 'Pure crit damage.', nodes: [
          { id: 'dagger_le_c1', name: 'Deep Cuts', description: '+10% crit damage', tier: 1, effect: { critMultiplierBonus: 10 } },
          { id: 'dagger_le_c2', name: 'Lethality Mastery', description: '+35% crit damage total', tier: 2, effect: { critMultiplierBonus: 35 }, isPathPayoff: true, requiresNodeId: 'dagger_le_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Staff — Magic, elemental ====================
  {
    id: 'staff_arcane_blast', name: 'Arcane Blast', description: '2.5x damage for 12s.',
    weaponType: 'staff', kind: 'buff', icon: '\u2728',
    duration: 12, cooldown: 75,
    effect: { damageMult: 2.5 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Blast', description: 'Extend Arcane Blast.', nodes: [
          { id: 'staff_ab_a1', name: 'Resonance', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'staff_ab_a2', name: 'Sustained Blast', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'staff_ab_a1' },
        ]},
        { id: 'B', name: 'Enlightened Blast', description: 'Add XP bonus.', nodes: [
          { id: 'staff_ab_b1', name: 'Insight', description: '+12% XP', tier: 1, effect: { xpMult: 1.12 } },
          { id: 'staff_ab_b2', name: 'Enlightened Blast', description: '+25% XP', tier: 2, effect: { xpMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'staff_ab_b1' },
        ]},
        { id: 'C', name: 'Overcharge', description: 'Push damage higher.', nodes: [
          { id: 'staff_ab_c1', name: 'Empowered', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'staff_ab_c2', name: 'Overcharge', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'staff_ab_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'staff_elemental_ward', name: 'Elemental Ward', description: '+50 all resists for 15s.',
    weaponType: 'staff', kind: 'buff', icon: '\uD83D\uDD2E',
    duration: 15, cooldown: 60,
    effect: { resistBonus: 50 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lasting Ward', description: 'Extend Elemental Ward.', nodes: [
          { id: 'staff_ew_a1', name: 'Persistent Aura', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'staff_ew_a2', name: 'Lasting Ward', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'staff_ew_a1' },
        ]},
        { id: 'B', name: 'Barrier Ward', description: 'Add defense.', nodes: [
          { id: 'staff_ew_b1', name: 'Shielded', description: '+50% defense', tier: 1, effect: { defenseMult: 1.5 } },
          { id: 'staff_ew_b2', name: 'Barrier Ward', description: '+2x defense', tier: 2, effect: { defenseMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'staff_ew_b1' },
        ]},
        { id: 'C', name: 'Arcane Shield', description: 'Boost resist even higher.', nodes: [
          { id: 'staff_ew_c1', name: 'Enhanced Ward', description: '+15 resists', tier: 1, effect: { resistBonus: 15 } },
          { id: 'staff_ew_c2', name: 'Arcane Shield', description: '+30 resists', tier: 2, effect: { resistBonus: 30 }, isPathPayoff: true, requiresNodeId: 'staff_ew_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'staff_wisdom', name: 'Wisdom', description: '+15% XP gain (passive).',
    weaponType: 'staff', kind: 'passive', icon: '\uD83D\uDCD6',
    effect: { xpMult: 1.15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Scholar\'s Insight', description: 'Convert to item drops.', nodes: [
          { id: 'staff_wi_a1', name: 'Perceptive', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'staff_wi_a2', name: 'Scholar\'s Insight', description: 'Swap to +10% item drops', tier: 2, effect: { xpMult: 1.0, itemDropMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'staff_wi_a1' },
        ]},
        { id: 'B', name: 'Balanced Wisdom', description: 'Mix of XP and drops.', nodes: [
          { id: 'staff_wi_b1', name: 'Quick Learner', description: '+4% XP', tier: 1, effect: { xpMult: 1.04 } },
          { id: 'staff_wi_b2', name: 'Balanced Wisdom', description: '+8% XP + 5% item drops', tier: 2, effect: { xpMult: 1.08, itemDropMult: 1.05 }, isPathPayoff: true, requiresNodeId: 'staff_wi_b1' },
        ]},
        { id: 'C', name: 'Deep Knowledge', description: 'Pure XP stacking.', nodes: [
          { id: 'staff_wi_c1', name: 'Studious', description: '+8% XP', tier: 1, effect: { xpMult: 1.08 } },
          { id: 'staff_wi_c2', name: 'Deep Knowledge', description: '+25% XP total', tier: 2, effect: { xpMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'staff_wi_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Wand — Fast magic, utility ====================
  {
    id: 'wand_chain_lightning', name: 'Chain Lightning', description: '1.8x damage + 1.5x materials for 15s.',
    weaponType: 'wand', kind: 'buff', icon: '\u26A1',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, materialDropMult: 1.5 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Lightning', description: 'Extend Chain Lightning.', nodes: [
          { id: 'wand_cl_a1', name: 'Persistent Charge', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'wand_cl_a2', name: 'Sustained Lightning', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'wand_cl_a1' },
        ]},
        { id: 'B', name: 'Magnetic Lightning', description: 'Convert materials to item drops.', nodes: [
          { id: 'wand_cl_b1', name: 'Attract', description: '+10% item drops', tier: 1, effect: { itemDropMult: 1.1 } },
          { id: 'wand_cl_b2', name: 'Magnetic Lightning', description: 'Swap to +1.3x item drops', tier: 2, effect: { materialDropMult: 1.0, itemDropMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'wand_cl_b1' },
        ]},
        { id: 'C', name: 'Storm Surge', description: 'Boost damage.', nodes: [
          { id: 'wand_cl_c1', name: 'Amplified', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'wand_cl_c2', name: 'Storm Surge', description: '+40% damage', tier: 2, effect: { damageMult: 1.4 }, isPathPayoff: true, requiresNodeId: 'wand_cl_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'wand_time_warp', name: 'Time Warp', description: '2x clear speed for 10s.',
    weaponType: 'wand', kind: 'buff', icon: '\u231B',
    duration: 10, cooldown: 90,
    effect: { clearSpeedMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Extended Warp', description: 'Extend Time Warp.', nodes: [
          { id: 'wand_tw_a1', name: 'Time Dilation', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'wand_tw_a2', name: 'Extended Warp', description: '+5s duration', tier: 2, effect: {}, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'wand_tw_a1' },
        ]},
        { id: 'B', name: 'Temporal Harvest', description: 'Add material drops.', nodes: [
          { id: 'wand_tw_b1', name: 'Time Loot', description: '+15% material drops', tier: 1, effect: { materialDropMult: 1.15 } },
          { id: 'wand_tw_b2', name: 'Temporal Harvest', description: '+30% material drops', tier: 2, effect: { materialDropMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'wand_tw_b1' },
        ]},
        { id: 'C', name: 'Haste', description: 'Push clear speed higher.', nodes: [
          { id: 'wand_tw_c1', name: 'Quickened', description: '+25% clear speed', tier: 1, effect: { clearSpeedMult: 1.25 } },
          { id: 'wand_tw_c2', name: 'Haste', description: '+50% clear speed', tier: 2, effect: { clearSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'wand_tw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'wand_mystic_insight', name: 'Mystic Insight', description: '+10% item drops (passive).',
    weaponType: 'wand', kind: 'passive', icon: '\uD83D\uDC41\uFE0F',
    effect: { itemDropMult: 1.1 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Material Insight', description: 'Convert to material drops.', nodes: [
          { id: 'wand_mi_a1', name: 'Resourceful Eye', description: '+8% material drops', tier: 1, effect: { materialDropMult: 1.08 } },
          { id: 'wand_mi_a2', name: 'Material Insight', description: 'Swap to +15% material drops', tier: 2, effect: { itemDropMult: 1.0, materialDropMult: 1.15 }, isPathPayoff: true, requiresNodeId: 'wand_mi_a1' },
        ]},
        { id: 'B', name: 'Dual Insight', description: 'Mix of items and materials.', nodes: [
          { id: 'wand_mi_b1', name: 'Keen Senses', description: '+3% items', tier: 1, effect: { itemDropMult: 1.03 } },
          { id: 'wand_mi_b2', name: 'Dual Insight', description: '+5% items + 8% materials', tier: 2, effect: { itemDropMult: 1.05, materialDropMult: 1.08 }, isPathPayoff: true, requiresNodeId: 'wand_mi_b1' },
        ]},
        { id: 'C', name: 'Fortune\'s Eye', description: 'Pure item drop stacking.', nodes: [
          { id: 'wand_mi_c1', name: 'Lucky Find', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'wand_mi_c2', name: 'Fortune\'s Eye', description: '+20% item drops total', tier: 2, effect: { itemDropMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'wand_mi_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Bow — Ranged, speed ====================
  {
    id: 'bow_rapid_fire', name: 'Rapid Fire', description: '2x attack speed for 15s.',
    weaponType: 'bow', kind: 'buff', icon: '\uD83C\uDFF9',
    duration: 15, cooldown: 60,
    effect: { attackSpeedMult: 2.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Fire', description: 'Extend Rapid Fire.', nodes: [
          { id: 'bow_rf_a1', name: 'Steady Aim', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'bow_rf_a2', name: 'Sustained Fire', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'bow_rf_a1' },
        ]},
        { id: 'B', name: 'Precise Fire', description: 'Add crit chance.', nodes: [
          { id: 'bow_rf_b1', name: 'Focused Shot', description: '+8% crit chance', tier: 1, effect: { critChanceBonus: 8 } },
          { id: 'bow_rf_b2', name: 'Precise Fire', description: '+15% crit chance', tier: 2, effect: { critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'bow_rf_b1' },
        ]},
        { id: 'C', name: 'Barrage', description: 'Push attack speed further.', nodes: [
          { id: 'bow_rf_c1', name: 'Quick Draw', description: '+25% attack speed', tier: 1, effect: { attackSpeedMult: 1.25 } },
          { id: 'bow_rf_c2', name: 'Barrage', description: '+50% attack speed', tier: 2, effect: { attackSpeedMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'bow_rf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'bow_piercing_shot', name: 'Piercing Shot', description: 'Ignore hazards for 12s.',
    weaponType: 'bow', kind: 'buff', icon: '\u27A1\uFE0F',
    duration: 12, cooldown: 75,
    effect: { ignoreHazards: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Power Shot', description: 'Add damage.', nodes: [
          { id: 'bow_ps_a1', name: 'Heavy Arrow', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'bow_ps_a2', name: 'Power Shot', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'bow_ps_a1' },
        ]},
        { id: 'B', name: 'Sustained Pierce', description: 'Extend Piercing Shot.', nodes: [
          { id: 'bow_ps_b1', name: 'Long Range', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'bow_ps_b2', name: 'Sustained Pierce', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'bow_ps_b1' },
        ]},
        { id: 'C', name: 'Armor Piercing', description: 'Add defense penetration.', nodes: [
          { id: 'bow_ps_c1', name: 'Penetrating', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'bow_ps_c2', name: 'Armor Piercing', description: '+20% damage + ignore hazards', tier: 2, effect: { damageMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'bow_ps_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'bow_eagle_eye', name: 'Eagle Eye', description: '+10% item drops (passive).',
    weaponType: 'bow', kind: 'passive', icon: '\uD83E\uDD85',
    effect: { itemDropMult: 1.1 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Hawk Eye', description: 'Convert to crit chance.', nodes: [
          { id: 'bow_ee_a1', name: 'Sharp Sight', description: '+4% crit chance', tier: 1, effect: { critChanceBonus: 4 } },
          { id: 'bow_ee_a2', name: 'Hawk Eye', description: 'Swap to +8% crit chance', tier: 2, effect: { itemDropMult: 1.0, critChanceBonus: 8 }, isPathPayoff: true, requiresNodeId: 'bow_ee_a1' },
        ]},
        { id: 'B', name: 'Quick Draw', description: 'Add attack speed.', nodes: [
          { id: 'bow_ee_b1', name: 'Nimble', description: '+3% attack speed', tier: 1, effect: { attackSpeedMult: 1.03 } },
          { id: 'bow_ee_b2', name: 'Quick Draw', description: '+5% item drops + 5% attack speed', tier: 2, effect: { itemDropMult: 1.05, attackSpeedMult: 1.05 }, isPathPayoff: true, requiresNodeId: 'bow_ee_b1' },
        ]},
        { id: 'C', name: 'Treasure Hunter', description: 'Pure item drop stacking.', nodes: [
          { id: 'bow_ee_c1', name: 'Keen Finder', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'bow_ee_c2', name: 'Treasure Hunter', description: '+20% item drops total', tier: 2, effect: { itemDropMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'bow_ee_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Crossbow — Heavy ranged, burst ====================
  {
    id: 'crossbow_power_shot', name: 'Power Shot', description: '4x damage for 5s.',
    weaponType: 'crossbow', kind: 'buff', icon: '\uD83D\uDCA3',
    duration: 5, cooldown: 90,
    effect: { damageMult: 4.0 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Power', description: 'Extend Power Shot.', nodes: [
          { id: 'xbow_ps_a1', name: 'Charged Bolt', description: '+2s duration', tier: 1, effect: {}, durationBonus: 2 },
          { id: 'xbow_ps_a2', name: 'Sustained Power', description: '+4s duration', tier: 2, effect: {}, durationBonus: 4, isPathPayoff: true, requiresNodeId: 'xbow_ps_a1' },
        ]},
        { id: 'B', name: 'Guaranteed Crit', description: 'Add massive crit chance.', nodes: [
          { id: 'xbow_ps_b1', name: 'Precision Bolt', description: '+25% crit chance', tier: 1, effect: { critChanceBonus: 25 } },
          { id: 'xbow_ps_b2', name: 'Guaranteed Crit', description: '+50% crit chance', tier: 2, effect: { critChanceBonus: 50 }, isPathPayoff: true, requiresNodeId: 'xbow_ps_b1' },
        ]},
        { id: 'C', name: 'Overkill', description: 'Push damage even higher.', nodes: [
          { id: 'xbow_ps_c1', name: 'Heavy Load', description: '+50% damage', tier: 1, effect: { damageMult: 1.5 } },
          { id: 'xbow_ps_c2', name: 'Overkill', description: '+100% damage (8x total)', tier: 2, effect: { damageMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'xbow_ps_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'crossbow_explosive_bolt', name: 'Explosive Bolt', description: '2x damage + 1.5x materials for 15s.',
    weaponType: 'crossbow', kind: 'buff', icon: '\uD83D\uDCA5',
    duration: 15, cooldown: 75,
    effect: { damageMult: 2.0, materialDropMult: 1.5 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Chain Explosions', description: 'Extend Explosive Bolt.', nodes: [
          { id: 'xbow_eb_a1', name: 'Lingering Fire', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'xbow_eb_a2', name: 'Chain Explosions', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'xbow_eb_a1' },
        ]},
        { id: 'B', name: 'Cluster Bolt', description: 'Add double clears.', nodes: [
          { id: 'xbow_eb_b1', name: 'Scatter Shot', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'xbow_eb_b2', name: 'Cluster Bolt', description: 'Add double clears', tier: 2, effect: { doubleClears: true }, isPathPayoff: true, requiresNodeId: 'xbow_eb_b1' },
        ]},
        { id: 'C', name: 'Incendiary', description: 'Boost material drops.', nodes: [
          { id: 'xbow_eb_c1', name: 'Salvage Blast', description: '+15% material drops', tier: 1, effect: { materialDropMult: 1.15 } },
          { id: 'xbow_eb_c2', name: 'Incendiary', description: '+30% material drops', tier: 2, effect: { materialDropMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'xbow_eb_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'crossbow_steady_aim', name: 'Steady Aim', description: '+20% crit, -10% attack speed (passive).',
    weaponType: 'crossbow', kind: 'passive', icon: '\uD83C\uDFAF',
    effect: { critChanceBonus: 20, attackSpeedMult: 0.9 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Pure Aim', description: 'Remove speed penalty.', nodes: [
          { id: 'xbow_sa_a1', name: 'Improved Mechanism', description: 'Reduce speed penalty', tier: 1, effect: { attackSpeedMult: 1.05 } },
          { id: 'xbow_sa_a2', name: 'Pure Aim', description: '+15% crit, no speed penalty', tier: 2, effect: { critChanceBonus: 15, attackSpeedMult: 1.0 }, isPathPayoff: true, requiresNodeId: 'xbow_sa_a1' },
        ]},
        { id: 'B', name: 'Heavy Bolts', description: 'Add damage, more speed penalty.', nodes: [
          { id: 'xbow_sa_b1', name: 'Weighted Tips', description: '+5% damage', tier: 1, effect: { damageMult: 1.05 } },
          { id: 'xbow_sa_b2', name: 'Heavy Bolts', description: '+10% crit + 10% damage, -15% speed', tier: 2, effect: { critChanceBonus: 10, damageMult: 1.1, attackSpeedMult: 0.85 }, isPathPayoff: true, requiresNodeId: 'xbow_sa_b1' },
        ]},
        { id: 'C', name: 'Marksman', description: 'Pure crit focus.', nodes: [
          { id: 'xbow_sa_c1', name: 'Careful Aim', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'xbow_sa_c2', name: 'Marksman', description: '+30% crit total', tier: 2, effect: { critChanceBonus: 30 }, isPathPayoff: true, requiresNodeId: 'xbow_sa_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Greatsword — Wide cleaves, momentum ====================
  {
    id: 'greatsword_momentum', name: 'Momentum', description: '1.8x damage + 1.3x clear speed for 15s.',
    weaponType: 'greatsword', kind: 'buff', icon: '\u2694\uFE0F',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, clearSpeedMult: 1.3 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Momentum', description: 'Extend Momentum duration.', nodes: [
          { id: 'gs_mom_a1', name: 'Building Speed', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'gs_mom_a2', name: 'Sustained Momentum', description: '+7s duration', tier: 2, effect: {}, durationBonus: 7, isPathPayoff: true, requiresNodeId: 'gs_mom_a1' },
        ]},
        { id: 'B', name: 'Sweeping Momentum', description: 'Add double clears.', nodes: [
          { id: 'gs_mom_b1', name: 'Wide Arc', description: '+10% clear speed', tier: 1, effect: { clearSpeedMult: 1.1 } },
          { id: 'gs_mom_b2', name: 'Sweeping Momentum', description: 'Add double clears', tier: 2, effect: { doubleClears: true }, isPathPayoff: true, requiresNodeId: 'gs_mom_b1' },
        ]},
        { id: 'C', name: 'Unstoppable Force', description: 'Push damage higher.', nodes: [
          { id: 'gs_mom_c1', name: 'Heavy Swings', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'gs_mom_c2', name: 'Unstoppable Force', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'gs_mom_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'greatsword_iron_will', name: 'Iron Will', description: '2.5x defense + 15 all resists for 20s.',
    weaponType: 'greatsword', kind: 'buff', icon: '\uD83D\uDEE1\uFE0F',
    duration: 20, cooldown: 75,
    effect: { defenseMult: 2.5, resistBonus: 15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Enduring Will', description: 'Extend Iron Will duration.', nodes: [
          { id: 'gs_iw_a1', name: 'Steadfast', description: '+5s duration', tier: 1, effect: {}, durationBonus: 5 },
          { id: 'gs_iw_a2', name: 'Enduring Will', description: '+10s duration', tier: 2, effect: {}, durationBonus: 10, isPathPayoff: true, requiresNodeId: 'gs_iw_a1' },
        ]},
        { id: 'B', name: 'Retaliating Will', description: 'Add damage while defending.', nodes: [
          { id: 'gs_iw_b1', name: 'Counter Force', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'gs_iw_b2', name: 'Retaliating Will', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'gs_iw_b1' },
        ]},
        { id: 'C', name: 'Unyielding Will', description: 'Boost defense and resists further.', nodes: [
          { id: 'gs_iw_c1', name: 'Reinforced', description: '+10 all resists', tier: 1, effect: { resistBonus: 10 } },
          { id: 'gs_iw_c2', name: 'Unyielding Will', description: '+25 all resists', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'gs_iw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'greatsword_heavy_impact', name: 'Heavy Impact', description: '+20% damage + 20% crit damage (passive).',
    weaponType: 'greatsword', kind: 'passive', icon: '\u2694\uFE0F',
    effect: { damageMult: 1.2, critMultiplierBonus: 20 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lethal Impact', description: 'Focus on crit damage.', nodes: [
          { id: 'gs_hi_a1', name: 'Deep Wounds', description: '+10% crit damage', tier: 1, effect: { critMultiplierBonus: 10 } },
          { id: 'gs_hi_a2', name: 'Lethal Impact', description: '+30% crit damage, less raw damage', tier: 2, effect: { damageMult: 1.0, critMultiplierBonus: 30 }, isPathPayoff: true, requiresNodeId: 'gs_hi_a1' },
        ]},
        { id: 'B', name: 'Cleaving Impact', description: 'Add clear speed.', nodes: [
          { id: 'gs_hi_b1', name: 'Wide Swings', description: '+8% clear speed', tier: 1, effect: { clearSpeedMult: 1.08 } },
          { id: 'gs_hi_b2', name: 'Cleaving Impact', description: '+15% damage + 15% clear speed', tier: 2, effect: { damageMult: 1.15, clearSpeedMult: 1.15 }, isPathPayoff: true, requiresNodeId: 'gs_hi_b1' },
        ]},
        { id: 'C', name: 'Crushing Impact', description: 'Pure damage increase.', nodes: [
          { id: 'gs_hi_c1', name: 'Heavy Blade', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'gs_hi_c2', name: 'Crushing Impact', description: '+30% damage total', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'gs_hi_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Greataxe — Brutal, bleeds ====================
  {
    id: 'greataxe_bloodrage', name: 'Bloodrage', description: '2x damage + 1.2x attack speed for 15s.',
    weaponType: 'greataxe', kind: 'buff', icon: '\uD83E\uDE78',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0, attackSpeedMult: 1.2 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Prolonged Rage', description: 'Extend Bloodrage duration.', nodes: [
          { id: 'ga_br_a1', name: 'Festering Rage', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'ga_br_a2', name: 'Prolonged Rage', description: '+7s duration', tier: 2, effect: {}, durationBonus: 7, isPathPayoff: true, requiresNodeId: 'ga_br_a1' },
        ]},
        { id: 'B', name: 'Frenzied Rage', description: 'Push attack speed higher.', nodes: [
          { id: 'ga_br_b1', name: 'Wild Strikes', description: '+15% attack speed', tier: 1, effect: { attackSpeedMult: 1.15 } },
          { id: 'ga_br_b2', name: 'Frenzied Rage', description: '+30% attack speed', tier: 2, effect: { attackSpeedMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'ga_br_b1' },
        ]},
        { id: 'C', name: 'Bloodthirsty', description: 'Boost damage further.', nodes: [
          { id: 'ga_br_c1', name: 'Savage Strikes', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'ga_br_c2', name: 'Bloodthirsty', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'ga_br_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'greataxe_savage_roar', name: 'Savage Roar', description: '1.5x damage + double clears for 12s.',
    weaponType: 'greataxe', kind: 'buff', icon: '\uD83D\uDCA2',
    duration: 12, cooldown: 75,
    effect: { damageMult: 1.5, doubleClears: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lingering Roar', description: 'Extend Savage Roar duration.', nodes: [
          { id: 'ga_sr_a1', name: 'Echoing Roar', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'ga_sr_a2', name: 'Lingering Roar', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'ga_sr_a1' },
        ]},
        { id: 'B', name: 'Intimidating Roar', description: 'Add defense bonus.', nodes: [
          { id: 'ga_sr_b1', name: 'Fearsome', description: '+50% defense', tier: 1, effect: { defenseMult: 1.5 } },
          { id: 'ga_sr_b2', name: 'Intimidating Roar', description: '+2x defense', tier: 2, effect: { defenseMult: 2.0 }, isPathPayoff: true, requiresNodeId: 'ga_sr_b1' },
        ]},
        { id: 'C', name: 'Brutal Roar', description: 'Push damage higher.', nodes: [
          { id: 'ga_sr_c1', name: 'Vicious', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'ga_sr_c2', name: 'Brutal Roar', description: '+50% damage, no double clears', tier: 2, effect: { damageMult: 2.0, doubleClears: false }, isPathPayoff: true, requiresNodeId: 'ga_sr_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'greataxe_butchery', name: 'Butchery', description: '+25% damage + 10% crit chance (passive).',
    weaponType: 'greataxe', kind: 'passive', icon: '\uD83E\uDE93',
    effect: { damageMult: 1.25, critChanceBonus: 10 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Execution', description: 'Focus on crit.', nodes: [
          { id: 'ga_bu_a1', name: 'Precise Chop', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'ga_bu_a2', name: 'Execution', description: '+15% crit chance, less raw damage', tier: 2, effect: { damageMult: 1.1, critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'ga_bu_a1' },
        ]},
        { id: 'B', name: 'Scavenging Strikes', description: 'Add material drops.', nodes: [
          { id: 'ga_bu_b1', name: 'Resourceful', description: '+8% material drops', tier: 1, effect: { materialDropMult: 1.08 } },
          { id: 'ga_bu_b2', name: 'Scavenging Strikes', description: '+15% material drops', tier: 2, effect: { materialDropMult: 1.15 }, isPathPayoff: true, requiresNodeId: 'ga_bu_b1' },
        ]},
        { id: 'C', name: 'Merciless', description: 'Pure damage stacking.', nodes: [
          { id: 'ga_bu_c1', name: 'Savage Force', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'ga_bu_c2', name: 'Merciless', description: '+35% damage total', tier: 2, effect: { damageMult: 1.35 }, isPathPayoff: true, requiresNodeId: 'ga_bu_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Maul — Ground slams, tanky ====================
  {
    id: 'maul_earthquake', name: 'Earthquake', description: '2.2x damage + 1.2x clear speed for 12s.',
    weaponType: 'maul', kind: 'buff', icon: '\uD83C\uDF0B',
    duration: 12, cooldown: 60,
    effect: { damageMult: 2.2, clearSpeedMult: 1.2 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Aftershock', description: 'Extend Earthquake duration.', nodes: [
          { id: 'maul_eq_a1', name: 'Tremors', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'maul_eq_a2', name: 'Aftershock', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'maul_eq_a1' },
        ]},
        { id: 'B', name: 'Fissure', description: 'Add material drops.', nodes: [
          { id: 'maul_eq_b1', name: 'Cracked Ground', description: '+10% material drops', tier: 1, effect: { materialDropMult: 1.1 } },
          { id: 'maul_eq_b2', name: 'Fissure', description: '+25% material drops', tier: 2, effect: { materialDropMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'maul_eq_b1' },
        ]},
        { id: 'C', name: 'Tectonic Slam', description: 'Push damage higher.', nodes: [
          { id: 'maul_eq_c1', name: 'Heavy Impact', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'maul_eq_c2', name: 'Tectonic Slam', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'maul_eq_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'maul_stone_skin', name: 'Stone Skin', description: '3x defense + 20 all resists for 20s.',
    weaponType: 'maul', kind: 'buff', icon: '\uD83C\uDFF0',
    duration: 20, cooldown: 75,
    effect: { defenseMult: 3.0, resistBonus: 20 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Enduring Stone', description: 'Extend Stone Skin duration.', nodes: [
          { id: 'maul_ss_a1', name: 'Hardened', description: '+5s duration', tier: 1, effect: {}, durationBonus: 5 },
          { id: 'maul_ss_a2', name: 'Enduring Stone', description: '+10s duration', tier: 2, effect: {}, durationBonus: 10, isPathPayoff: true, requiresNodeId: 'maul_ss_a1' },
        ]},
        { id: 'B', name: 'Retaliating Stone', description: 'Add damage while defended.', nodes: [
          { id: 'maul_ss_b1', name: 'Thorns', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'maul_ss_b2', name: 'Retaliating Stone', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'maul_ss_b1' },
        ]},
        { id: 'C', name: 'Mountain\'s Resolve', description: 'Boost resists and defense further.', nodes: [
          { id: 'maul_ss_c1', name: 'Iron Core', description: '+15 all resists', tier: 1, effect: { resistBonus: 15 } },
          { id: 'maul_ss_c2', name: 'Mountain\'s Resolve', description: '+30 all resists', tier: 2, effect: { resistBonus: 30 }, isPathPayoff: true, requiresNodeId: 'maul_ss_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'maul_crushing_weight', name: 'Crushing Weight', description: '+15% damage + 15% defense (passive).',
    weaponType: 'maul', kind: 'passive', icon: '\uD83D\uDD28',
    effect: { damageMult: 1.15, defenseMult: 1.15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Immovable', description: 'Focus on defense.', nodes: [
          { id: 'maul_cw_a1', name: 'Sturdy', description: '+10% defense', tier: 1, effect: { defenseMult: 1.1 } },
          { id: 'maul_cw_a2', name: 'Immovable', description: '+30% defense, less damage', tier: 2, effect: { damageMult: 1.0, defenseMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'maul_cw_a1' },
        ]},
        { id: 'B', name: 'Weighted Blows', description: 'Focus on damage.', nodes: [
          { id: 'maul_cw_b1', name: 'Heavy Hitter', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'maul_cw_b2', name: 'Weighted Blows', description: '+30% damage, less defense', tier: 2, effect: { damageMult: 1.3, defenseMult: 1.0 }, isPathPayoff: true, requiresNodeId: 'maul_cw_b1' },
        ]},
        { id: 'C', name: 'Balanced Might', description: 'Enhance both equally.', nodes: [
          { id: 'maul_cw_c1', name: 'Steady', description: '+5% damage + 5% defense', tier: 1, effect: { damageMult: 1.05, defenseMult: 1.05 } },
          { id: 'maul_cw_c2', name: 'Balanced Might', description: '+20% damage + 20% defense', tier: 2, effect: { damageMult: 1.2, defenseMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'maul_cw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Scepter — Divine hybrid, phys+ele ====================
  {
    id: 'scepter_divine_favor', name: 'Divine Favor', description: '1.8x damage + 25 all resists for 15s.',
    weaponType: 'scepter', kind: 'buff', icon: '\uD83D\uDD31',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, resistBonus: 25 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lasting Favor', description: 'Extend Divine Favor duration.', nodes: [
          { id: 'scep_df_a1', name: 'Blessed', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'scep_df_a2', name: 'Lasting Favor', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'scep_df_a1' },
        ]},
        { id: 'B', name: 'Righteous Fury', description: 'Add crit chance.', nodes: [
          { id: 'scep_df_b1', name: 'Holy Precision', description: '+8% crit chance', tier: 1, effect: { critChanceBonus: 8 } },
          { id: 'scep_df_b2', name: 'Righteous Fury', description: '+15% crit chance', tier: 2, effect: { critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'scep_df_b1' },
        ]},
        { id: 'C', name: 'Empowered Favor', description: 'Boost damage further.', nodes: [
          { id: 'scep_df_c1', name: 'Inspired', description: '+20% damage', tier: 1, effect: { damageMult: 1.2 } },
          { id: 'scep_df_c2', name: 'Empowered Favor', description: '+40% damage', tier: 2, effect: { damageMult: 1.4 }, isPathPayoff: true, requiresNodeId: 'scep_df_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'scepter_zealotry', name: 'Zealotry', description: '1.5x damage + 1.3x XP for 12s.',
    weaponType: 'scepter', kind: 'buff', icon: '\u2728',
    duration: 12, cooldown: 75,
    effect: { damageMult: 1.5, xpMult: 1.3 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Zeal', description: 'Extend Zealotry duration.', nodes: [
          { id: 'scep_ze_a1', name: 'Devout', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'scep_ze_a2', name: 'Sustained Zeal', description: '+6s duration', tier: 2, effect: {}, durationBonus: 6, isPathPayoff: true, requiresNodeId: 'scep_ze_a1' },
        ]},
        { id: 'B', name: 'Enlightened Zeal', description: 'Push XP bonus higher.', nodes: [
          { id: 'scep_ze_b1', name: 'Studious', description: '+10% XP', tier: 1, effect: { xpMult: 1.1 } },
          { id: 'scep_ze_b2', name: 'Enlightened Zeal', description: '+25% XP', tier: 2, effect: { xpMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'scep_ze_b1' },
        ]},
        { id: 'C', name: 'Fanatical Zeal', description: 'Boost damage higher.', nodes: [
          { id: 'scep_ze_c1', name: 'Fervent', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'scep_ze_c2', name: 'Fanatical Zeal', description: '+50% damage, less XP', tier: 2, effect: { damageMult: 1.5, xpMult: 1.0 }, isPathPayoff: true, requiresNodeId: 'scep_ze_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'scepter_consecration', name: 'Consecration', description: '+12% crit chance + 10 all resists (passive).',
    weaponType: 'scepter', kind: 'passive', icon: '\uD83D\uDD31',
    effect: { critChanceBonus: 12, resistBonus: 10 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Holy Ground', description: 'Focus on resists.', nodes: [
          { id: 'scep_co_a1', name: 'Sacred Ward', description: '+8 all resists', tier: 1, effect: { resistBonus: 8 } },
          { id: 'scep_co_a2', name: 'Holy Ground', description: '+20 resists, less crit', tier: 2, effect: { critChanceBonus: 5, resistBonus: 20 }, isPathPayoff: true, requiresNodeId: 'scep_co_a1' },
        ]},
        { id: 'B', name: 'Divine Judgment', description: 'Focus on crit.', nodes: [
          { id: 'scep_co_b1', name: 'Keen Judgment', description: '+5% crit chance', tier: 1, effect: { critChanceBonus: 5 } },
          { id: 'scep_co_b2', name: 'Divine Judgment', description: '+15% crit + 15% crit damage', tier: 2, effect: { critChanceBonus: 15, critMultiplierBonus: 15 }, isPathPayoff: true, requiresNodeId: 'scep_co_b1' },
        ]},
        { id: 'C', name: 'Balanced Sanctity', description: 'Enhance both equally.', nodes: [
          { id: 'scep_co_c1', name: 'Anointed', description: '+3% crit + 5 resists', tier: 1, effect: { critChanceBonus: 3, resistBonus: 5 } },
          { id: 'scep_co_c2', name: 'Balanced Sanctity', description: '+8% crit + 12 resists', tier: 2, effect: { critChanceBonus: 8, resistBonus: 12 }, isPathPayoff: true, requiresNodeId: 'scep_co_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Gauntlet — Spell fists, elemental ====================
  {
    id: 'gauntlet_power_surge', name: 'Power Surge', description: '2x damage + 1.15x attack speed for 15s.',
    weaponType: 'gauntlet', kind: 'buff', icon: '\uD83E\uDD4A',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0, attackSpeedMult: 1.15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Sustained Surge', description: 'Extend Power Surge duration.', nodes: [
          { id: 'gau_ps_a1', name: 'Flowing Power', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'gau_ps_a2', name: 'Sustained Surge', description: '+7s duration', tier: 2, effect: {}, durationBonus: 7, isPathPayoff: true, requiresNodeId: 'gau_ps_a1' },
        ]},
        { id: 'B', name: 'Critical Surge', description: 'Add crit bonus.', nodes: [
          { id: 'gau_ps_b1', name: 'Focused Strikes', description: '+8% crit chance', tier: 1, effect: { critChanceBonus: 8 } },
          { id: 'gau_ps_b2', name: 'Critical Surge', description: '+15% crit chance', tier: 2, effect: { critChanceBonus: 15 }, isPathPayoff: true, requiresNodeId: 'gau_ps_b1' },
        ]},
        { id: 'C', name: 'Overwhelming Surge', description: 'Push damage higher.', nodes: [
          { id: 'gau_ps_c1', name: 'Empowered Fists', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'gau_ps_c2', name: 'Overwhelming Surge', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'gau_ps_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'gauntlet_arcane_shield', name: 'Arcane Shield', description: '2.5x defense + 15 all resists for 18s.',
    weaponType: 'gauntlet', kind: 'buff', icon: '\uD83D\uDEE1\uFE0F',
    duration: 18, cooldown: 75,
    effect: { defenseMult: 2.5, resistBonus: 15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lasting Shield', description: 'Extend Arcane Shield duration.', nodes: [
          { id: 'gau_as_a1', name: 'Reinforced Barrier', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'gau_as_a2', name: 'Lasting Shield', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'gau_as_a1' },
        ]},
        { id: 'B', name: 'Reflective Shield', description: 'Add damage during defense.', nodes: [
          { id: 'gau_as_b1', name: 'Energy Reflection', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'gau_as_b2', name: 'Reflective Shield', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'gau_as_b1' },
        ]},
        { id: 'C', name: 'Impenetrable Shield', description: 'Boost defense and resists.', nodes: [
          { id: 'gau_as_c1', name: 'Warded Fists', description: '+12 all resists', tier: 1, effect: { resistBonus: 12 } },
          { id: 'gau_as_c2', name: 'Impenetrable Shield', description: '+25 all resists', tier: 2, effect: { resistBonus: 25 }, isPathPayoff: true, requiresNodeId: 'gau_as_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'gauntlet_spell_fist', name: 'Spell Fist', description: '+20% damage + 8% crit chance (passive).',
    weaponType: 'gauntlet', kind: 'passive', icon: '\uD83E\uDD4A',
    effect: { damageMult: 1.2, critChanceBonus: 8 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Elemental Fist', description: 'Convert to crit damage.', nodes: [
          { id: 'gau_sf_a1', name: 'Charged Strikes', description: '+10% crit damage', tier: 1, effect: { critMultiplierBonus: 10 } },
          { id: 'gau_sf_a2', name: 'Elemental Fist', description: '+25% crit damage', tier: 2, effect: { critMultiplierBonus: 25 }, isPathPayoff: true, requiresNodeId: 'gau_sf_a1' },
        ]},
        { id: 'B', name: 'Swift Fist', description: 'Add attack speed.', nodes: [
          { id: 'gau_sf_b1', name: 'Quick Jab', description: '+5% attack speed', tier: 1, effect: { attackSpeedMult: 1.05 } },
          { id: 'gau_sf_b2', name: 'Swift Fist', description: '+10% damage + 10% attack speed', tier: 2, effect: { damageMult: 1.1, attackSpeedMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'gau_sf_b1' },
        ]},
        { id: 'C', name: 'Iron Fist', description: 'Pure damage stacking.', nodes: [
          { id: 'gau_sf_c1', name: 'Heavy Hands', description: '+10% damage', tier: 1, effect: { damageMult: 1.1 } },
          { id: 'gau_sf_c2', name: 'Iron Fist', description: '+30% damage total', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'gau_sf_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // ==================== Tome — Arcane knowledge, curses ====================
  {
    id: 'tome_forbidden_knowledge', name: 'Forbidden Knowledge', description: '2x damage + 1.2x XP for 15s.',
    weaponType: 'tome', kind: 'buff', icon: '\uD83D\uDCD6',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0, xpMult: 1.2 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Deep Study', description: 'Extend Forbidden Knowledge duration.', nodes: [
          { id: 'tome_fk_a1', name: 'Engrossed', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'tome_fk_a2', name: 'Deep Study', description: '+7s duration', tier: 2, effect: {}, durationBonus: 7, isPathPayoff: true, requiresNodeId: 'tome_fk_a1' },
        ]},
        { id: 'B', name: 'Arcane Mastery', description: 'Push XP bonus higher.', nodes: [
          { id: 'tome_fk_b1', name: 'Quick Learner', description: '+10% XP', tier: 1, effect: { xpMult: 1.1 } },
          { id: 'tome_fk_b2', name: 'Arcane Mastery', description: '+25% XP', tier: 2, effect: { xpMult: 1.25 }, isPathPayoff: true, requiresNodeId: 'tome_fk_b1' },
        ]},
        { id: 'C', name: 'Dark Knowledge', description: 'Push damage higher.', nodes: [
          { id: 'tome_fk_c1', name: 'Empowered Pages', description: '+25% damage', tier: 1, effect: { damageMult: 1.25 } },
          { id: 'tome_fk_c2', name: 'Dark Knowledge', description: '+50% damage', tier: 2, effect: { damageMult: 1.5 }, isPathPayoff: true, requiresNodeId: 'tome_fk_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'tome_eldritch_ward', name: 'Eldritch Ward', description: '2x defense + ignore hazards for 18s.',
    weaponType: 'tome', kind: 'buff', icon: '\uD83D\uDD2E',
    duration: 18, cooldown: 90,
    effect: { defenseMult: 2.0, ignoreHazards: true },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lasting Ward', description: 'Extend Eldritch Ward duration.', nodes: [
          { id: 'tome_ew_a1', name: 'Persistent Glyph', description: '+4s duration', tier: 1, effect: {}, durationBonus: 4 },
          { id: 'tome_ew_a2', name: 'Lasting Ward', description: '+8s duration', tier: 2, effect: {}, durationBonus: 8, isPathPayoff: true, requiresNodeId: 'tome_ew_a1' },
        ]},
        { id: 'B', name: 'Fortified Ward', description: 'Add resist bonus.', nodes: [
          { id: 'tome_ew_b1', name: 'Warded Pages', description: '+15 all resists', tier: 1, effect: { resistBonus: 15 } },
          { id: 'tome_ew_b2', name: 'Fortified Ward', description: '+30 all resists', tier: 2, effect: { resistBonus: 30 }, isPathPayoff: true, requiresNodeId: 'tome_ew_b1' },
        ]},
        { id: 'C', name: 'Empowered Ward', description: 'Add damage during defense.', nodes: [
          { id: 'tome_ew_c1', name: 'Retaliating Glyphs', description: '+15% damage', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'tome_ew_c2', name: 'Empowered Ward', description: '+30% damage', tier: 2, effect: { damageMult: 1.3 }, isPathPayoff: true, requiresNodeId: 'tome_ew_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
  {
    id: 'tome_ancient_wisdom', name: 'Ancient Wisdom', description: '+15% XP + 10% item drops (passive).',
    weaponType: 'tome', kind: 'passive', icon: '\uD83D\uDCD6',
    effect: { xpMult: 1.15, itemDropMult: 1.1 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Lore Master', description: 'Focus on XP.', nodes: [
          { id: 'tome_aw_a1', name: 'Studious', description: '+8% XP', tier: 1, effect: { xpMult: 1.08 } },
          { id: 'tome_aw_a2', name: 'Lore Master', description: '+25% XP, less item drops', tier: 2, effect: { xpMult: 1.25, itemDropMult: 1.0 }, isPathPayoff: true, requiresNodeId: 'tome_aw_a1' },
        ]},
        { id: 'B', name: 'Treasure Seeker', description: 'Focus on item drops.', nodes: [
          { id: 'tome_aw_b1', name: 'Keen Eye', description: '+5% item drops', tier: 1, effect: { itemDropMult: 1.05 } },
          { id: 'tome_aw_b2', name: 'Treasure Seeker', description: '+20% item drops, less XP', tier: 2, effect: { xpMult: 1.0, itemDropMult: 1.2 }, isPathPayoff: true, requiresNodeId: 'tome_aw_b1' },
        ]},
        { id: 'C', name: 'Balanced Wisdom', description: 'Enhance both equally.', nodes: [
          { id: 'tome_aw_c1', name: 'Insightful', description: '+5% XP + 3% items', tier: 1, effect: { xpMult: 1.05, itemDropMult: 1.03 } },
          { id: 'tome_aw_c2', name: 'Balanced Wisdom', description: '+12% XP + 8% items', tier: 2, effect: { xpMult: 1.12, itemDropMult: 1.08 }, isPathPayoff: true, requiresNodeId: 'tome_aw_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
];

// ============================================================
// UNIFIED SKILL CONVERSION LOGIC
// ============================================================

// IDs that exist in both active skills and abilities -- abilities get '_buff' suffix
const CONFLICTING_ABILITY_IDS = new Set([
  'axe_cleave',
  'mace_shockwave',
  'crossbow_explosive_bolt',
  'bow_rapid_fire',
  'wand_chain_lightning',
]);

/** Map from old ability ID -> unified ID (for migration in 10G). */
export const ABILITY_ID_MIGRATION: Record<string, string> = {};

// Convert ActiveSkillDefs -> SkillDefs (kind: 'active')
const convertedActiveSkills: SkillDef[] = ACTIVE_SKILL_DEFS.map(s => ({
  id: s.id,
  name: s.name,
  description: s.description,
  weaponType: s.weaponType,
  kind: 'active' as SkillKind,
  tags: s.tags,
  icon: s.icon,
  levelRequired: s.levelRequired,
  baseDamage: s.baseDamage,
  weaponDamagePercent: s.weaponDamagePercent,
  spellPowerRatio: s.spellPowerRatio,
  castTime: s.castTime,
  cooldown: s.cooldown,
  hitCount: s.hitCount,
  dotDuration: s.dotDuration,
  dotDamagePercent: s.dotDamagePercent,
  // Wire graph tree for wand active skills
  skillGraph: WAND_SKILL_GRAPHS[s.id],
}));

// Convert AbilityDefs -> SkillDefs (keep original kind)
const convertedAbilities: SkillDef[] = ABILITY_DEFS.map(a => {
  const needsRename = CONFLICTING_ABILITY_IDS.has(a.id);
  const newId = needsRename ? `${a.id}_buff` : a.id;

  // Track all ability ID mappings (even unchanged ones) for migration
  ABILITY_ID_MIGRATION[a.id] = newId;

  // Check if this wand ability has a graph tree (replaces old skillTree)
  const graph = WAND_SKILL_GRAPHS[newId];

  return {
    id: newId,
    name: a.name,
    description: a.description,
    weaponType: a.weaponType,
    kind: a.kind as SkillKind,
    tags: [],
    icon: a.icon,
    levelRequired: 1,
    // Damage fields zeroed for non-active skills
    baseDamage: 0,
    weaponDamagePercent: 0,
    spellPowerRatio: 0,
    castTime: 0,
    cooldown: a.cooldown ?? 0,
    // Buff/utility fields
    duration: a.duration,
    effect: a.effect,
    // Graph tree replaces old skillTree for wand abilities
    skillTree: graph ? undefined : a.skillTree,
    skillGraph: graph,
  };
});

/** All unified skill definitions (135). */
export const SKILL_DEFS: SkillDef[] = [
  ...convertedActiveSkills,
  ...convertedAbilities,
];

// --- Unified Lookup Maps ---

const skillsByWeapon = new Map<WeaponType, SkillDef[]>();
const skillById = new Map<string, SkillDef>();

for (const skill of SKILL_DEFS) {
  skillById.set(skill.id, skill);
  if (!skillsByWeapon.has(skill.weaponType)) skillsByWeapon.set(skill.weaponType, []);
  skillsByWeapon.get(skill.weaponType)!.push(skill);
}

/** Get all unified skills for a weapon type. */
export function getUnifiedSkillsForWeapon(weaponType: WeaponType): SkillDef[] {
  return skillsByWeapon.get(weaponType) ?? [];
}

/** Get a single unified skill definition by ID. */
export function getUnifiedSkillDef(id: string): SkillDef | undefined {
  return skillById.get(id);
}

/** Get all skills of a specific kind. */
export function getSkillsByKind(kind: SkillKind): SkillDef[] {
  return SKILL_DEFS.filter(s => s.kind === kind);
}

/** Get all skills of a specific kind for a weapon type. */
export function getSkillsByKindForWeapon(kind: SkillKind, weaponType: WeaponType): SkillDef[] {
  return (skillsByWeapon.get(weaponType) ?? []).filter(s => s.kind === kind);
}

// ============================================================
// LEGACY LOOKUP RE-EXPORTS
// (from old data/skills.ts and data/abilities.ts)
// ============================================================

// Legacy lookup maps for ActiveSkillDef consumers
const activeSkillsByWeapon = new Map<WeaponType, ActiveSkillDef[]>();
const activeSkillById = new Map<string, ActiveSkillDef>();

for (const skill of ACTIVE_SKILL_DEFS) {
  activeSkillById.set(skill.id, skill);
  if (!activeSkillsByWeapon.has(skill.weaponType)) activeSkillsByWeapon.set(skill.weaponType, []);
  activeSkillsByWeapon.get(skill.weaponType)!.push(skill);
}

/** Get all active skills available for a weapon type (legacy). */
export function getSkillsForWeapon(weaponType: WeaponType): ActiveSkillDef[] {
  return activeSkillsByWeapon.get(weaponType) ?? [];
}

/** Get a single active skill definition by ID (legacy). */
export function getSkillDef(id: string): ActiveSkillDef | undefined {
  return activeSkillById.get(id);
}

/** Get all abilities for a given weapon type (legacy). */
export function getAbilitiesForWeapon(weaponType: WeaponType): AbilityDef[] {
  return ABILITY_DEFS.filter(a => a.weaponType === weaponType);
}

/** Look up an ability definition by ID (legacy). */
export function getAbilityDef(id: string): AbilityDef | undefined {
  return ABILITY_DEFS.find(a => a.id === id);
}

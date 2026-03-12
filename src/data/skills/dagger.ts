import type { ActiveSkillDef, AbilityDef } from '../../types';

export const DAGGER_ACTIVE_SKILLS: ActiveSkillDef[] = [
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
    levelRequired: 1,
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
    levelRequired: 1,
    icon: '\u2744\uFE0F',
    baseConversion: { from: 'physical', to: 'cold', percent: 65 },
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
    levelRequired: 1,
    icon: '\uD83D\uDC0D',
    dotDuration: 5,
    dotDamagePercent: 0.25,
    baseConversion: { from: 'physical', to: 'chaos', percent: 45 },
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
    levelRequired: 1,
    icon: '\uD83D\uDC7E',
    baseConversion: { from: 'physical', to: 'chaos', percent: 45 },
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
    levelRequired: 1,
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
    levelRequired: 1,
    icon: '\u26A1',
    baseConversion: { from: 'physical', to: 'lightning', percent: 60 },
  },
];

export const DAGGER_ABILITIES: AbilityDef[] = [
  // ==================== Dagger — Archetype Buffs ====================

  // --- Assassination archetype buff ---
  {
    id: 'dagger_predators_mark', name: "Predator's Mark",
    description: 'Mark yourself as a predator. +20% crit chance, +40% crit multiplier for 10s.',
    weaponType: 'dagger', kind: 'buff', icon: '\uD83C\uDF11',
    duration: 10, cooldown: 45,
    effect: { critChanceBonus: 20, critMultiplierBonus: 40 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Precision', description: 'Enhanced crit during the mark.', nodes: [
          { id: 'dagger_pm_a1', name: 'Honed Senses', description: '+10% crit chance during buff', tier: 1, effect: { critChanceBonus: 10 } },
          { id: 'dagger_pm_a2', name: 'Apex Predator', description: '+20% crit multiplier during buff', tier: 2, effect: { critMultiplierBonus: 20 }, isPathPayoff: true, requiresNodeId: 'dagger_pm_a1' },
        ]},
        { id: 'B', name: 'Lethality', description: 'First strike guaranteed crit.', nodes: [
          { id: 'dagger_pm_b1', name: 'Opening Strike', description: '+15% damage during buff', tier: 1, effect: { damageMult: 1.15 } },
          { id: 'dagger_pm_b2', name: 'Death Sentence', description: '+25% crit multiplier during buff', tier: 2, effect: { critMultiplierBonus: 25 }, isPathPayoff: true, requiresNodeId: 'dagger_pm_b1' },
        ]},
        { id: 'C', name: 'Hunt', description: 'Kills extend duration.', nodes: [
          { id: 'dagger_pm_c1', name: 'Blood Scent', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'dagger_pm_c2', name: 'Endless Hunt', description: '+5s duration, -10% cooldown', tier: 2, effect: {}, durationBonus: 5, cooldownReduction: 10, isPathPayoff: true, requiresNodeId: 'dagger_pm_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // --- Venomcraft archetype buff ---
  {
    id: 'dagger_venom_covenant', name: 'Venom Covenant',
    description: 'Invoke a toxic pact. +50% attack speed, +15% damage for 12s.',
    weaponType: 'dagger', kind: 'buff', icon: '\uD83D\uDC0D',
    duration: 12, cooldown: 50,
    effect: { attackSpeedMult: 1.5, damageMult: 1.15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Toxic Haste', description: 'More speed, longer duration.', nodes: [
          { id: 'dagger_vc_a1', name: 'Accelerated Toxins', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'dagger_vc_a2', name: 'Toxic Frenzy', description: '+10% attack speed during buff', tier: 2, effect: { attackSpeedMult: 1.1 }, isPathPayoff: true, requiresNodeId: 'dagger_vc_a1' },
        ]},
        { id: 'B', name: 'Virulence', description: 'Amplify poison damage.', nodes: [
          { id: 'dagger_vc_b1', name: 'Potent Venom', description: '+10% damage during buff', tier: 1, effect: { damageMult: 1.10 } },
          { id: 'dagger_vc_b2', name: 'Virulent Surge', description: '+20% damage during buff', tier: 2, effect: { damageMult: 1.20 }, isPathPayoff: true, requiresNodeId: 'dagger_vc_b1' },
        ]},
        { id: 'C', name: 'Pandemic', description: 'Kills spread the covenant.', nodes: [
          { id: 'dagger_vc_c1', name: 'Spreading Contagion', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'dagger_vc_c2', name: 'Pandemic', description: '+5s duration, -10% cooldown', tier: 2, effect: {}, durationBonus: 5, cooldownReduction: 10, isPathPayoff: true, requiresNodeId: 'dagger_vc_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },

  // --- Shadow Dance archetype buff ---
  {
    id: 'dagger_shadow_covenant', name: 'Shadow Covenant',
    description: 'Embrace the shadows. +25% defense, +10% damage, +15% crit multiplier for 8s.',
    weaponType: 'dagger', kind: 'buff', icon: '\uD83D\uDC7E',
    duration: 8, cooldown: 55,
    effect: { defenseMult: 1.25, damageMult: 1.10, critMultiplierBonus: 15 },
    skillTree: {
      paths: [
        { id: 'A', name: 'Evasion', description: 'Defensive synergy extends duration.', nodes: [
          { id: 'dagger_sc_a1', name: 'Shadow Veil', description: '+3s duration', tier: 1, effect: {}, durationBonus: 3 },
          { id: 'dagger_sc_a2', name: 'Lingering Shadows', description: '+5s duration, +10% defense', tier: 2, effect: { defenseMult: 1.10 }, durationBonus: 5, isPathPayoff: true, requiresNodeId: 'dagger_sc_a1' },
        ]},
        { id: 'B', name: 'Counter', description: 'Dodge triggers counter-crits.', nodes: [
          { id: 'dagger_sc_b1', name: 'Counter Stance', description: '+15% crit multiplier during buff', tier: 1, effect: { critMultiplierBonus: 15 } },
          { id: 'dagger_sc_b2', name: 'Shadow Counter', description: '+10% crit chance during buff', tier: 2, effect: { critChanceBonus: 10 }, isPathPayoff: true, requiresNodeId: 'dagger_sc_b1' },
        ]},
        { id: 'C', name: 'Fortress', description: 'Defense becomes offense.', nodes: [
          { id: 'dagger_sc_c1', name: 'Iron Shadow', description: '+15% defense during buff', tier: 1, effect: { defenseMult: 1.15 } },
          { id: 'dagger_sc_c2', name: 'Shadow Fortress', description: '+15% damage during buff', tier: 2, effect: { damageMult: 1.15 }, isPathPayoff: true, requiresNodeId: 'dagger_sc_c1' },
        ]},
      ],
      maxPoints: 4,
    },
  },
];

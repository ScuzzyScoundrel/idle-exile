// ============================================================
// Gauntlet v2 — Sorcerer melee-spell skill definitions (Phase C3 step 2)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// CLASS_FANTASY_BRIEFS.md §3 (Sorcerer); MULTI_CLASS_PAIRS.md §8
// (Spellreaver — canonical battle-mage build)
// ============================================================
//
// PARADIGM (locked): Spell-melee fist combat. Cycles through fire→cold→
// lightning→chaos elements per combo, building Resonance fast. The
// Sorcerer's "active" weapon — fastest 4-charge build, frequent
// Convergences. Canonical Spellreaver "battle mage" weapon.
//
// SIGNATURE INTERACTIONS:
//   • Per-combo element cycling: each combo step advances the rotation
//     (1st hit fire, 2nd cold, 3rd lightning, 4th chaos), each
//     contributing the matching Resonance charge.
//   • Frenzied state synergy (Spellreaver): below 50% HP, gauntlet
//     combo cycles 50% faster (Resonance charges build at 1.5x rate).
//   • Each gauntlet hit at <25% HP becomes Forge-empowered: per
//     Spellreaver fusion, Convergence cost zeroed.
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Spellreaver (Sor+Brs): canonical pair weapon. gauntlet_arcane_fist
//     → "Reaving Fist" — damage scales with missing HP.
//   - Arcane Blade (Asn+Sor): gauntlet_rapid_bolts → crit-feeds-Cascade
//     loop (each bolt is Cascade-eligible).
//   - Seer (WD+Sor): gauntlet_void_grasp → Pandemic-eligible chaos DoT.
//
// PHASE C3 STEP 2 (2026-05-04):
//   - Extracted from src/data/skills/secondary.ts (was 7 actives + 3
//     abilities pre-audit). Phase A schema fields added.
//   - Pool grew 7 → 10 actives by adding pair-fusion enablers:
//     Frenzy Channel, Forge Convergence, Element Combo Strike.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const GAUNTLET_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Arcane Fist (default basic) ──
  {
    id: 'gauntlet_arcane_fist',
    name: 'Arcane Fist',
    description: 'Channel arcane energy through your fist. Each cast contributes a Resonance charge of cycling element (fire→cold→lightning→chaos).',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Physical', 'Melee'],
    baseDamage: 7,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.0,
    castTime: 1.0,
    cooldown: 3,
    levelRequired: 1,
    icon: '🥊',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
  },
  // ── 2. Rapid Bolts ──
  {
    id: 'gauntlet_rapid_bolts',
    name: 'Rapid Bolts',
    description: 'Fire three quick arcane bolts from your fists. Each bolt rolls crit independently — strong Cascade feed.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 3,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 0.8,
    cooldown: 4,
    levelRequired: 4,
    icon: '✨',
    hitCount: 3,
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 0,
  },
  // ── 3. Flame Palm ──
  {
    id: 'gauntlet_flame_palm',
    name: 'Flame Palm',
    description: 'Slam your burning palm into the enemy. Adds a fire Resonance charge.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Fire', 'Melee'],
    baseDamage: 6,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.85,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 6,
    icon: '🔥',
    baseConversion: { from: 'physical', to: 'fire', percent: 90 },
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 30,
  },
  // ── 4. Frost Grip ──
  {
    id: 'gauntlet_frost_grip',
    name: 'Frost Grip',
    description: 'Grip enemies with freezing force that chills the area. Adds a cold Resonance charge.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Cold', 'Melee', 'AoE'],
    baseDamage: 7,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.9,
    castTime: 1.1,
    cooldown: 5,
    levelRequired: 8,
    icon: '❄️',
    baseConversion: { from: 'physical', to: 'cold', percent: 90 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 30,
  },
  // ── 5. Shock Pulse ──
  {
    id: 'gauntlet_shock_pulse',
    name: 'Shock Pulse',
    description: 'Release a pulse of lightning from your fists. Adds a lightning Resonance charge.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Lightning', 'Melee'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.95,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 10,
    icon: '⚡',
    baseConversion: { from: 'physical', to: 'lightning', percent: 90 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 25,
  },
  // ── 6. Void Grasp ──
  {
    id: 'gauntlet_void_grasp',
    name: 'Void Grasp',
    description: 'Grasp enemies with void energy that corrodes over time. Adds a chaos Resonance charge.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Chaos', 'Melee', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.8,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 12,
    icon: '👾',
    dotDuration: 4,
    dotDamagePercent: 0.3,
    baseConversion: { from: 'physical', to: 'chaos', percent: 90 },
    skillKind: 'cast',
    manaCost: 12,
    baseAilmentChance: 40,
  },
  // ── 7. Elemental Burst (heavy AoE payoff) ──
  {
    id: 'gauntlet_elemental_burst',
    name: 'Elemental Burst',
    description: 'Explode with elemental fury, devastating everything nearby. AoE fire damage. At 4 Resonance charges, all 4 elements detonate (Convergence).',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Fire', 'Melee', 'AoE'],
    baseDamage: 25,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.7,
    castTime: 1.6,
    cooldown: 10,
    levelRequired: 14,
    icon: '💥',
    baseConversion: { from: 'physical', to: 'fire', percent: 90 },
    skillKind: 'cast',
    manaCost: 22,
    baseAilmentChance: 0,
  },
  // ── 8. Frenzy Channel (NEW — Spellreaver fusion) ──
  {
    id: 'gauntlet_frenzy_channel',
    name: 'Frenzy Channel',
    description: 'Channeled spell-melee combo. Cast speed scales with missing HP — at <25% HP, channel ticks become instant. Each tick contributes a Resonance charge.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Melee', 'Channel'],
    baseDamage: 4,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 0.5,
    cooldown: 8,
    levelRequired: 12,
    icon: '🌀',
    skillKind: 'channel',
    channelTickInterval: 0.4,
    manaCost: 16,
    baseAilmentChance: 0,
    hitCount: 5,
  },
  // ── 9. Forge Convergence (NEW — Spellreaver capstone) ──
  {
    id: 'gauntlet_forge_convergence',
    name: 'Forge Convergence',
    description: 'At 4+ Resonance charges, single overwhelming impact. AoE 4-element ailment dump + 3s elemental field at impact site (re-applies all 4 ailments per second). Below 25% HP, costs 0 mana.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Melee', 'AoE', 'Heavy'],
    baseDamage: 8,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.5,
    castTime: 1.5,
    cooldown: 18,
    levelRequired: 16,
    icon: '⚔️',
    skillKind: 'cast',
    manaCost: 24,
    baseAilmentChance: 100,
  },
  // ── 10. Element Combo Strike (NEW — Sor signature combo) ──
  {
    id: 'gauntlet_element_combo',
    name: 'Element Combo Strike',
    description: '4-hit melee combo, each hit different element (fire→cold→lightning→chaos). Builds 4 Resonance charges in a single skill — fastest charge generator.',
    weaponType: 'gauntlet',
    tags: ['Spell', 'Melee'],
    baseDamage: 3,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.55,
    castTime: 1.4,
    cooldown: 12,
    levelRequired: 8,
    icon: '🪐',
    skillKind: 'cast',
    manaCost: 18,
    baseAilmentChance: 50,
    hitCount: 4,
  },
];

export const GAUNTLET_ABILITIES: AbilityDef[] = [
  {
    id: 'gauntlet_power_surge', name: 'Power Surge', description: '2x damage + 1.15x attack speed for 15s.',
    weaponType: 'gauntlet', kind: 'buff', icon: '🥊',
    duration: 15, cooldown: 60,
    effect: { damageMult: 2.0, attackSpeedMult: 1.15 },
  },
  {
    id: 'gauntlet_arcane_shield', name: 'Arcane Shield', description: '2.5x defense + 15 all resists for 18s.',
    weaponType: 'gauntlet', kind: 'buff', icon: '🛡️',
    duration: 18, cooldown: 75,
    effect: { defenseMult: 2.5, resistBonus: 15 },
  },
  {
    id: 'gauntlet_spell_fist', name: 'Spell Fist', description: '+20% damage + 8% crit chance (passive).',
    weaponType: 'gauntlet', kind: 'passive', icon: '🥊',
    effect: { damageMult: 1.2, critChanceBonus: 8 },
  },
];

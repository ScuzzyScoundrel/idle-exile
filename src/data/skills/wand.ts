// ============================================================
// Wand v2 — Sorcerer / Assassin shared skill definitions (Phase C3 step 2)
// 10 active skills + 3 abilities (buffs/passive)
// Per design: COMBAT_AND_CLASS_OVERHAUL_PLAN.md §8.3 weapon paradigms;
// CLASS_FANTASY_BRIEFS.md §3 (Sorcerer — Resonance signature);
// MULTI_CLASS_PAIRS.md §5 (Arcane Blade — canonical Asn+Sor weapon),
// §8 (Spellreaver), §9 (Arcane Archer)
// ============================================================
//
// PARADIGM (locked): Fast 1H spell projectile. Cheap mana cost, high
// cast frequency. The Sorcerer's "tempo" weapon — Resonance charges
// build per-cast, single-element bolts let you commit to one ailment
// or cycle through all four.
//
// SIGNATURE INTERACTIONS:
//   • Per-cast Resonance contribution (Sor signature): 1 charge per
//     elemental wand cast, element matches the bolt type.
//   • High crit feed (Asn shared): wand crits feed Cascade per existing
//     combat/combo.ts machinery — wand is the canonical Asn ranged option.
//   • Element-Mark synergy: Marked targets take +25% damage from the
//     element matching the Mark's cycle position (Arcane Archer fusion).
//
// PAIR CALLOUTS (Phase F toggle morphs reference these IDs):
//   - Arcane Blade (Asn+Sor): wand_cascade_bolt → crit-feeds-Resonance
//     loop; canonical pair weapon (Wand overlaps both home pools).
//   - Spellreaver (Sor+Brs): wand_reaving_bolt (toggle of magic missile)
//     deals +50% damage below 50% HP, applies Bloodied.
//   - Arcane Archer (Sor+Hnt): wand_bow_bolt (toggle) treats bolts as
//     projectiles for Resonance contribution.
//
// PHASE C3 STEP 2 (2026-05-04):
//   - Extracted from src/data/skills/secondary.ts (was 6 actives + 3
//     abilities pre-audit). Existing skills retained verbatim with
//     skillKind/manaCost/baseAilmentChance added per Phase A schema.
//   - Pool grew 6 → 10 actives by adding pair-fusion enablers:
//     Cascade Bolt, Crit Channel, Volley Convergence, Element Mark.

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const WAND_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Magic Missile (default basic) ──
  {
    id: 'wand_magic_missile',
    name: 'Magic Missile',
    description: 'A basic bolt of magical energy. Builds 1 Attunement; crits open an Arcane Surge (3s).',
    weaponType: 'wand',
    tags: ['Spell', 'Physical', 'Projectile'],
    baseDamage: 13.56,
    weaponDamagePercent: 0,
    spellPowerRatio: 4.068,
    castTime: 0.9,
    cooldown: 3,
    levelRequired: 1,
    icon: '✨',
    skillKind: 'cast',
    manaCost: 4,
    baseAilmentChance: 0,
  },
  // ── 2. Chain Lightning ──
  {
    id: 'wand_chain_lightning',
    name: 'Chain Lightning',
    description: 'Lightning that arcs between multiple targets. Each chained target adds a lightning Resonance charge.',
    weaponType: 'wand',
    tags: ['Spell', 'Lightning', 'Projectile'],
    baseDamage: 9.04,
    weaponDamagePercent: 0,
    spellPowerRatio: 3.39,
    castTime: 0.8,
    cooldown: 5,
    levelRequired: 4,
    icon: '⚡',
    hitCount: 2,
    baseConversion: { from: 'physical', to: 'lightning', percent: 90 },
    skillKind: 'cast',
    manaCost: 6,
    baseAilmentChance: 30,
  },
  // ── 3. Frostbolt ──
  {
    id: 'wand_frostbolt',
    name: 'Frostbolt',
    description: 'A chilling projectile that explodes on impact. Adds a cold Resonance charge.',
    weaponType: 'wand',
    tags: ['Spell', 'Cold', 'Projectile', 'AoE'],
    baseDamage: 18.08,
    weaponDamagePercent: 0,
    spellPowerRatio: 3.955,
    castTime: 1.1,
    cooldown: 6,
    levelRequired: 8,
    icon: '❄️',
    baseConversion: { from: 'physical', to: 'cold', percent: 90 },
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 30,
  },
  // ── 4. Searing Ray ──
  {
    id: 'wand_searing_ray',
    name: 'Searing Ray',
    description: 'Channel a beam of fire at enemies. Each tick adds a fire Resonance charge.',
    weaponType: 'wand',
    tags: ['Spell', 'Fire', 'Channel'],
    baseDamage: 6.78,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.13,
    castTime: 0.5,
    cooldown: 6,
    levelRequired: 6,
    icon: '🔥',
    baseConversion: { from: 'physical', to: 'fire', percent: 90 },
    skillKind: 'channel',
    channelTickInterval: 0.4,
    manaCost: 14,
    baseAilmentChance: 25,
    hitCount: 4,
  },
  // ── 5. Essence Drain ──
  {
    id: 'wand_essence_drain',
    name: 'Essence Drain',
    description: 'Drain the life force of enemies, dealing chaos damage over time. Adds a chaos Resonance charge.',
    weaponType: 'wand',
    tags: ['Spell', 'Chaos', 'Projectile', 'DoT'],
    baseDamage: 11.3,
    weaponDamagePercent: 0,
    spellPowerRatio: 3.616,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 10,
    icon: '💜',
    dotDuration: 4,
    dotDamagePercent: 0.35,
    baseConversion: { from: 'physical', to: 'chaos', percent: 90 },
    skillKind: 'cast',
    manaCost: 10,
    baseAilmentChance: 40,
  },
  // ── 6. Void Blast (heavy AoE payoff) ──
  {
    id: 'wand_void_blast',
    name: 'Void Blast',
    description: 'The spender. Consumes ALL Attunement: +30% damage per stack; PERFECT at 5 stacks (×2.5, advances other cooldowns 1s). Inside an Arcane Surge: ×2 and refunds 3 Attunement.',
    weaponType: 'wand',
    tags: ['Spell', 'Chaos', 'AoE'],
    baseDamage: 72.32,
    weaponDamagePercent: 0,
    spellPowerRatio: 3.616,
    castTime: 1.2,
    cooldown: 5,
    levelRequired: 14,
    icon: '🌌',
    baseConversion: { from: 'physical', to: 'chaos', percent: 90 },
    skillKind: 'cast',
    manaCost: 22,
    baseAilmentChance: 0,
  },
  // ── 7. Cascade Bolt (NEW — Arcane Blade pair fusion) ──
  {
    id: 'wand_cascade_bolt',
    name: 'Cascade Bolt',
    description: 'Fast spell-bolt that crits feed Cascade (per Asn signature) AND adds a Resonance charge of cycling element. Canonical Arcane Blade opener.',
    weaponType: 'wand',
    tags: ['Spell', 'Projectile'],
    baseDamage: 9.04,
    weaponDamagePercent: 0,
    spellPowerRatio: 1.582,
    castTime: 0.7,
    cooldown: 3,
    levelRequired: 4,
    icon: '🪄',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
  },
  // ── 8. Crit Channel (NEW — Arcane Blade payoff) ──
  {
    id: 'wand_crit_channel',
    name: 'Crit Channel',
    description: 'Channeled spell — each tick rolls for crit independently. Builds Cascade fast against bosses; each crit-tick contributes Resonance.',
    weaponType: 'wand',
    tags: ['Spell', 'Channel'],
    baseDamage: 4.52,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.904,
    castTime: 0.5,
    cooldown: 8,
    levelRequired: 10,
    icon: '🔮',
    skillKind: 'channel',
    channelTickInterval: 0.3,
    manaCost: 16,
    baseAilmentChance: 0,
    hitCount: 6,
  },
  // ── 9. Volley Convergence (NEW — Spellreaver capstone) ──
  {
    id: 'wand_volley_convergence',
    name: 'Volley Convergence',
    description: 'AoE spender: 5-bolt elemental volley hitting all enemies, consumes ALL Attunement for +15% damage per stack.',
    weaponType: 'wand',
    tags: ['Spell', 'Projectile', 'AoE'],
    baseDamage: 13.56,
    weaponDamagePercent: 0,
    spellPowerRatio: 2.712,
    castTime: 1.4,
    cooldown: 12,
    levelRequired: 16,
    icon: '🌠',
    skillKind: 'cast',
    manaCost: 18,
    baseAilmentChance: 100,
    hitCount: 5,
  },
  // ── 10. Element Mark (NEW — Arcane Archer pair) ──
  {
    id: 'wand_element_mark',
    name: 'Element Mark',
    description: 'Mark a target (8s) with the element of your top Resonance charge. Marked target takes +25% damage from that element. Cycles fire→cold→lightning→chaos per cast.',
    weaponType: 'wand',
    tags: ['Spell', 'Projectile', 'Utility'],
    baseDamage: 4.52,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.678,
    castTime: 0.6,
    cooldown: 6,
    levelRequired: 8,
    icon: '🎯',
    skillKind: 'cast',
    manaCost: 8,
    baseAilmentChance: 0,
  },
];

export const WAND_ABILITIES: AbilityDef[] = [
  {
    id: 'wand_chain_lightning', name: 'Chain Lightning', description: '1.8x damage + 1.5x material drops for 15s.',
    weaponType: 'wand', kind: 'buff', icon: '⚡',
    duration: 15, cooldown: 60,
    effect: { damageMult: 1.8, materialDropMult: 1.5 },
  },
  {
    id: 'wand_time_warp', name: 'Time Warp', description: '2x clear speed for 10s.',
    weaponType: 'wand', kind: 'buff', icon: '⌛',
    duration: 10, cooldown: 90,
    effect: { clearSpeedMult: 2.0 },
  },
  {
    id: 'wand_mystic_insight', name: 'Mystic Insight', description: '+10% item drops (passive).',
    weaponType: 'wand', kind: 'passive', icon: '👁️',
    effect: { itemDropMult: 1.1 },
  },
];

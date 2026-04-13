// ============================================================
// Staff v2 — Witch Doctor skill definitions
// 10 active skills + 3 abilities (buffs/passive)
// Per roster: docs/weapon-designs/staff-v2/SKILL_ROSTER.md
// ============================================================

import type { ActiveSkillDef, AbilityDef } from '../../types';

export const STAFF_ACTIVE_SKILLS: ActiveSkillDef[] = [
  // ── 1. Zombie Dogs ──
  {
    id: 'staff_zombie_dogs',
    name: 'Zombie Dogs',
    description: 'Summon 2 zombie dogs that fight and absorb damage. Dog bites apply Haunted (5s).',
    weaponType: 'staff',
    tags: ['Spell', 'Chaos', 'Minion'],
    baseDamage: 0,
    weaponDamagePercent: 0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 12,
    levelRequired: 1,
    icon: '\uD83D\uDC15',
  },
  // ── 2. Locust Swarm ──
  {
    id: 'staff_locust_swarm',
    name: 'Locust Swarm',
    description: 'Release a swarm of locusts dealing chaos damage over time. On target death: swarm transfers to next enemy with remaining duration. Creates Plagued (6s).',
    weaponType: 'staff',
    tags: ['Spell', 'Chaos', 'DoT', 'AoE'],
    baseDamage: 4,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.4,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 1,
    icon: '\uD83E\uDD97',
    dotDuration: 5,
    dotDamagePercent: 0.30,
    baseConversion: { from: 'physical', to: 'chaos', percent: 100 },
  },
  // ── 3. Haunt ──
  {
    id: 'staff_haunt',
    name: 'Haunt',
    description: 'Send a spirit to haunt the target, dealing cold damage over time. On target death: spirit chains to next enemy with fresh duration. Creates Haunted (5s).',
    weaponType: 'staff',
    tags: ['Spell', 'Cold', 'DoT', 'Chain'],
    baseDamage: 3,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 1,
    icon: '\uD83D\uDC7B',
    dotDuration: 6,
    dotDamagePercent: 0.25,
    baseConversion: { from: 'physical', to: 'cold', percent: 100 },
  },
  // ── 4. Hex ──
  {
    id: 'staff_hex',
    name: 'Hex',
    description: 'Curse the target, reducing their damage by 20%. Creates Hexed (5s) combo state — consumed by Soul Harvest for 2× damage.',
    weaponType: 'staff',
    tags: ['Spell', 'Chaos', 'Utility', 'Curse'],
    baseDamage: 2,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.3,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 1,
    icon: '\uD83E\uDDFF',
    baseConversion: { from: 'physical', to: 'chaos', percent: 100 },
  },
  // ── 5. Spirit Barrage ──
  {
    id: 'staff_spirit_barrage',
    name: 'Spirit Barrage',
    description: 'Unleash 3 rapid spirit blasts. Consumes Haunted for guaranteed crits and +30% bonus damage on all hits.',
    weaponType: 'staff',
    tags: ['Spell', 'Cold', 'Projectile'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.5,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 1,
    icon: '\uD83D\uDC80',
    hitCount: 3,
    baseConversion: { from: 'physical', to: 'cold', percent: 100 },
  },
  // ── 6. Plague of Toads ──
  {
    id: 'staff_plague_of_toads',
    name: 'Plague of Toads',
    description: 'Release toads dealing chaos AoE damage and applying poison. Consumes Plagued for pandemic: all active DoTs spread to ALL enemies in the pack.',
    weaponType: 'staff',
    tags: ['Spell', 'Chaos', 'AoE', 'DoT'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.7,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 1,
    icon: '\uD83D\uDC38',
    dotDuration: 3,
    dotDamagePercent: 0.20,
    baseConversion: { from: 'physical', to: 'chaos', percent: 100 },
  },
  // ── 7. Fetish Swarm ──
  {
    id: 'staff_fetish_swarm',
    name: 'Fetish Swarm',
    description: 'Summon 4 fetish warriors that attack rapidly. Fragile but high DPS.',
    weaponType: 'staff',
    tags: ['Spell', 'Physical', 'Minion', 'AoE'],
    baseDamage: 0,
    weaponDamagePercent: 0,
    spellPowerRatio: 0,
    castTime: 1.0,
    cooldown: 10,
    levelRequired: 1,
    icon: '\uD83C\uDFAD',
  },
  // ── 8. Soul Harvest ──
  {
    id: 'staff_soul_harvest',
    name: 'Soul Harvest',
    description: 'Harvest soul energy from the target. Consumes Hexed for 2× damage. Creates Soul Stack (max 5, 10s, refreshes on new stack).',
    weaponType: 'staff',
    tags: ['Spell', 'Chaos'],
    baseDamage: 6,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.8,
    castTime: 1.0,
    cooldown: 6,
    levelRequired: 1,
    icon: '\uD83D\uDC9C',
    baseConversion: { from: 'physical', to: 'chaos', percent: 100 },
  },
  // ── 9. Bouncing Skull ──
  {
    id: 'staff_bouncing_skull',
    name: 'Bouncing Skull',
    description: 'Hurl a flaming skull that bounces between enemies. Consumes Soul Stacks for +1 bounce per stack consumed (max 5 stacks = up to 7 bounces).',
    weaponType: 'staff',
    tags: ['Spell', 'Fire', 'Chain', 'Projectile'],
    baseDamage: 5,
    weaponDamagePercent: 0,
    spellPowerRatio: 0.7,
    castTime: 1.0,
    cooldown: 5,
    levelRequired: 1,
    icon: '\uD83D\uDD25',
    chainCount: 2,
    baseConversion: { from: 'physical', to: 'fire', percent: 100 },
  },
  // ── 10. Mass Sacrifice ──
  {
    id: 'staff_mass_sacrifice',
    name: 'Mass Sacrifice',
    description: 'Consume ALL active combo states and detonate all minions. Each consumed state adds a damage multiplier. Detonated minions deal their remaining HP as AoE chaos damage. Final Sacrifice: ×1.5 at 4+ states, ×2.0 at 5 states.',
    weaponType: 'staff',
    tags: ['Spell', 'Chaos', 'Heavy'],
    baseDamage: 15,
    weaponDamagePercent: 0,
    spellPowerRatio: 2.0,
    castTime: 1.0,
    cooldown: 12,
    levelRequired: 1,
    icon: '\u2620\uFE0F',
    baseConversion: { from: 'physical', to: 'chaos', percent: 100 },
  },
];

export const STAFF_ABILITIES: AbilityDef[] = [
  // ── Spirit Walk — Spirit Caller buff ──
  {
    id: 'staff_spirit_walk',
    name: 'Spirit Walk',
    description: 'Phase into the spirit realm. +15% damage for 8s. (Dodge effect pending engine extension.)',
    weaponType: 'staff',
    kind: 'buff',
    icon: '\uD83D\uDC7B',
    duration: 8,
    cooldown: 45,
    effect: { damageMult: 1.15 },
  },
  // ── Big Bad Voodoo — Voodoo Master buff ──
  {
    id: 'staff_big_bad_voodoo',
    name: 'Big Bad Voodoo',
    description: 'Channel massive voodoo power. +50% attack speed, +30% damage for 10s.',
    weaponType: 'staff',
    kind: 'buff',
    icon: '\uD83E\uDD41',
    duration: 10,
    cooldown: 60,
    effect: { attackSpeedMult: 1.5, damageMult: 1.3 },
  },
  // ── Grave Injustice — Plague Doctor passive ──
  // On-kill cooldown reduction + on-kill life heal. Engine fields (onKillCDR, onKillHealPercent)
  // are already live — but AbilityEffect doesn't carry them directly. Passive effect is
  // wired via talent-tree allocation on skills that take this node. For now, the ability
  // def registers the skill so UI can surface it; actual numeric passive application arrives
  // when the ability system gains onKill hook support.
  {
    id: 'staff_grave_injustice',
    name: 'Grave Injustice',
    description: 'On kill: reduce all cooldowns by 1s and heal 2% max life. (Passive)',
    weaponType: 'staff',
    kind: 'passive',
    icon: '\u26B0\uFE0F',
    effect: {},
  },
];

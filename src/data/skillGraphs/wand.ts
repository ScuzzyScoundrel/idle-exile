// ============================================================
// Idle Exile — Wand Skill Graph Trees (Sprint 11B)
// 9 wand skills x ~35 nodes each = ~315 total nodes
// ============================================================

import type { SkillGraph, SkillGraphNode } from '../../types';

// Helper: create a node with shorthand
function minor(id: string, name: string, desc: string, tier: number, connections: string[], modifier: SkillGraphNode['modifier']): SkillGraphNode {
  return { id, name, description: desc, nodeType: 'minor', tier, connections, modifier };
}
function notable(id: string, name: string, desc: string, tier: number, connections: string[], modifier: SkillGraphNode['modifier']): SkillGraphNode {
  return { id, name, description: desc, nodeType: 'notable', tier, connections, modifier };
}
function keystone(id: string, name: string, desc: string, tier: number, connections: string[], modifier: SkillGraphNode['modifier']): SkillGraphNode {
  return { id, name, description: desc, nodeType: 'keystone', tier, connections, modifier };
}

// ────────────────────────────────────────────
// 1. MAGIC MISSILE
// Themes: raw damage, crit, speed, utility
// ────────────────────────────────────────────
const MAGIC_MISSILE_GRAPH: SkillGraph = {
  skillId: 'wand_magic_missile',
  maxPoints: 20,
  nodes: [
    // Start
    { id: 'mm_start', name: 'Arcane Focus', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['mm_m1', 'mm_m2', 'mm_m3'] },
    // Tier 1 minors (3 branches)
    minor('mm_m1', 'Missile Force', '+5% damage', 1, ['mm_start', 'mm_m4', 'mm_m5'], { incDamage: 5 }),
    minor('mm_m2', 'Quick Cast', '+5% cast speed', 1, ['mm_start', 'mm_m6', 'mm_m7'], { incCastSpeed: 5 }),
    minor('mm_m3', 'Precision', '+2% crit chance', 1, ['mm_start', 'mm_m8', 'mm_m9'], { incCritChance: 2 }),
    // Tier 1-2 connectors
    minor('mm_m4', 'Arcane Power', '+5% damage', 1, ['mm_m1', 'mm_n1'], { incDamage: 5 }),
    minor('mm_m5', 'Impact', '+3 flat damage', 1, ['mm_m1', 'mm_m10'], { flatDamage: 3 }),
    minor('mm_m6', 'Rapid Fire', '+5% cast speed', 1, ['mm_m2', 'mm_n2'], { incCastSpeed: 5 }),
    minor('mm_m7', 'Efficiency', '-5% cooldown', 1, ['mm_m2', 'mm_m11'], { cooldownReduction: 5 }),
    minor('mm_m8', 'Sharp Focus', '+2% crit chance', 1, ['mm_m3', 'mm_n3'], { incCritChance: 2 }),
    minor('mm_m9', 'Deadly Aim', '+10% crit multiplier', 1, ['mm_m3', 'mm_m12'], { incCritMultiplier: 10 }),
    // Tier 2 minors
    minor('mm_m10', 'Raw Force', '+5 flat damage', 2, ['mm_m5', 'mm_n1'], { flatDamage: 5 }),
    minor('mm_m11', 'Nimble Casting', '-5% cooldown', 2, ['mm_m7', 'mm_n2'], { cooldownReduction: 5 }),
    minor('mm_m12', 'Lethal Precision', '+15% crit multiplier', 2, ['mm_m9', 'mm_n3'], { incCritMultiplier: 15 }),
    // Tier 2 notables (connecting to keystones)
    notable('mm_n1', 'Arcane Surge', '+15% damage', 2, ['mm_m4', 'mm_m10', 'mm_m13'], { incDamage: 15 }),
    notable('mm_n2', 'Spell Echo', '+10% cast speed', 2, ['mm_m6', 'mm_m11', 'mm_m14'], { incCastSpeed: 10 }),
    notable('mm_n3', 'Assassin\'s Mark', '+5% crit, +20% crit dmg', 2, ['mm_m8', 'mm_m12', 'mm_m15'], { incCritChance: 5, incCritMultiplier: 20 }),
    // Tier 3 minors (leading to keystones)
    minor('mm_m13', 'Overcharged', '+8% damage', 3, ['mm_n1', 'mm_k1'], { incDamage: 8 }),
    minor('mm_m14', 'Haste', '+8% cast speed', 3, ['mm_n2', 'mm_k2'], { incCastSpeed: 8 }),
    minor('mm_m15', 'Executioner', '+3% crit chance', 3, ['mm_n3', 'mm_k3'], { incCritChance: 3 }),
    // Tier 3 cross-connects
    minor('mm_m16', 'Power Tap', '+5% damage, +5% cast speed', 3, ['mm_n1', 'mm_n2'], { incDamage: 5, incCastSpeed: 5 }),
    minor('mm_m17', 'Crit Surge', '+3% crit, +8% damage', 3, ['mm_n1', 'mm_n3'], { incCritChance: 3, incDamage: 8 }),
    minor('mm_m18', 'Swift Strikes', '+5% cast speed, +2% crit', 3, ['mm_n2', 'mm_n3'], { incCastSpeed: 5, incCritChance: 2 }),
    // Notables tier 3
    notable('mm_n4', 'Concentrated Force', '+20% damage, +5 flat', 3, ['mm_m13', 'mm_m16'], { incDamage: 20, flatDamage: 5 }),
    notable('mm_n5', 'Blur', '+15% cast speed', 3, ['mm_m14', 'mm_m18'], { incCastSpeed: 15 }),
    // Tier 4 keystones
    keystone('mm_k1', 'Arcane Overload', '+50% damage, -20% cast speed', 4, ['mm_m13', 'mm_n4'], { incDamage: 50, incCastSpeed: -20 }),
    keystone('mm_k2', 'Split Bolt', '+2 extra hits, -15% damage', 4, ['mm_m14', 'mm_n5'], { extraHits: 2, incDamage: -15 }),
    keystone('mm_k3', 'Arcane Crit', 'Always crit, -30% crit multiplier', 4, ['mm_m15'], { flags: ['alwaysCrit'], incCritMultiplier: -30 }),
    // Additional minors for pathing options
    minor('mm_m19', 'Arcane Resilience', '+5% damage', 2, ['mm_m4', 'mm_m6'], { incDamage: 5 }),
    minor('mm_m20', 'Focus Crystal', '+3% crit chance', 2, ['mm_m6', 'mm_m8'], { incCritChance: 3 }),
    minor('mm_m21', 'Missile Barrage', '+3 flat damage', 2, ['mm_m1', 'mm_m3'], { flatDamage: 3 }),
    minor('mm_m22', 'Spell Penetration', '+8% damage', 3, ['mm_n4', 'mm_k1'], { incDamage: 8 }),
    minor('mm_m23', 'Echo Chamber', '+8% cast speed', 3, ['mm_n5', 'mm_k2'], { incCastSpeed: 8 }),
    notable('mm_n6', 'Arcane Mastery', '+10% damage, +5% cast speed, +2% crit', 3, ['mm_m16', 'mm_m17', 'mm_m18'], { incDamage: 10, incCastSpeed: 5, incCritChance: 2 }),
  ],
};

// ────────────────────────────────────────────
// 2. CHAIN LIGHTNING (Active skill)
// Themes: chain count, shock debuff, lightning damage
// ────────────────────────────────────────────
const CHAIN_LIGHTNING_GRAPH: SkillGraph = {
  skillId: 'wand_chain_lightning',
  maxPoints: 20,
  nodes: [
    { id: 'cl_start', name: 'Spark', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['cl_m1', 'cl_m2', 'cl_m3'] },
    minor('cl_m1', 'Voltage', '+5% damage', 1, ['cl_start', 'cl_m4', 'cl_m5'], { incDamage: 5 }),
    minor('cl_m2', 'Conductivity', '+3 flat damage', 1, ['cl_start', 'cl_m6', 'cl_m7'], { flatDamage: 3 }),
    minor('cl_m3', 'Static Charge', '+2% crit chance', 1, ['cl_start', 'cl_m8', 'cl_m9'], { incCritChance: 2 }),
    minor('cl_m4', 'Arc Power', '+5% damage', 1, ['cl_m1', 'cl_n1'], { incDamage: 5 }),
    minor('cl_m5', 'Lightning Speed', '+5% cast speed', 1, ['cl_m1', 'cl_m10'], { incCastSpeed: 5 }),
    minor('cl_m6', 'Charged Bolts', '+4 flat damage', 1, ['cl_m2', 'cl_n2'], { flatDamage: 4 }),
    minor('cl_m7', 'Shock Pulse', '+5% damage', 1, ['cl_m2', 'cl_m11'], { incDamage: 5 }),
    minor('cl_m8', 'Precision Arc', '+3% crit chance', 1, ['cl_m3', 'cl_n3'], { incCritChance: 3 }),
    minor('cl_m9', 'Thunder Clap', '+10% crit multiplier', 1, ['cl_m3', 'cl_m12'], { incCritMultiplier: 10 }),
    minor('cl_m10', 'Rapid Arc', '+5% cast speed', 2, ['cl_m5', 'cl_n1'], { incCastSpeed: 5 }),
    minor('cl_m11', 'Chain Boost', '+5% damage', 2, ['cl_m7', 'cl_n2'], { incDamage: 5 }),
    minor('cl_m12', 'Overcharge', '+15% crit multiplier', 2, ['cl_m9', 'cl_n3'], { incCritMultiplier: 15 }),
    notable('cl_n1', 'Storm Conduit', '+15% damage, +5% cast speed', 2, ['cl_m4', 'cl_m10', 'cl_m13'], { incDamage: 15, incCastSpeed: 5 }),
    notable('cl_n2', 'Ball Lightning', '+10 flat damage', 2, ['cl_m6', 'cl_m11', 'cl_m14'], { flatDamage: 10 }),
    notable('cl_n3', 'Critical Arc', '+5% crit, +25% crit dmg', 2, ['cl_m8', 'cl_m12', 'cl_m15'], { incCritChance: 5, incCritMultiplier: 25 }),
    minor('cl_m13', 'Amplify', '+8% damage', 3, ['cl_n1', 'cl_k1'], { incDamage: 8 }),
    minor('cl_m14', 'Electrocute', '+5% damage', 3, ['cl_n2', 'cl_k2'], { incDamage: 5 }),
    minor('cl_m15', 'Surge', '+3% crit chance', 3, ['cl_n3', 'cl_k3'], { incCritChance: 3 }),
    minor('cl_m16', 'Storm Link', '+5% damage', 3, ['cl_n1', 'cl_n2'], { incDamage: 5 }),
    minor('cl_m17', 'Arc Focus', '+8% damage, +2% crit', 3, ['cl_n1', 'cl_n3'], { incDamage: 8, incCritChance: 2 }),
    minor('cl_m18', 'Charged Crit', '+5% cast speed, +2% crit', 3, ['cl_n2', 'cl_n3'], { incCastSpeed: 5, incCritChance: 2 }),
    notable('cl_n4', 'Lightning Mastery', '+20% damage', 3, ['cl_m13', 'cl_m16'], { incDamage: 20 }),
    notable('cl_n5', 'Thunder Strike', '+5% crit, +15% crit dmg', 3, ['cl_m15', 'cl_m18'], { incCritChance: 5, incCritMultiplier: 15 }),
    keystone('cl_k1', 'Superconductor', 'Shock: +30% damage taken', 4, ['cl_m13', 'cl_n4'], { applyDebuff: { debuffId: 'shocked', chance: 0.5, duration: 5 } }),
    keystone('cl_k2', 'Storm Cascade', 'Convert to AoE, +1 extra hit', 4, ['cl_m14'], { convertToAoE: true, extraHits: 1 }),
    keystone('cl_k3', 'Voltaic Overload', '+40% crit dmg, always crit when shocked', 4, ['cl_m15', 'cl_n5'], { incCritMultiplier: 40, incCritChance: 15 }),
    minor('cl_m19', 'Arc Speed', '+5% cast speed', 2, ['cl_m4', 'cl_m6'], { incCastSpeed: 5 }),
    minor('cl_m20', 'Static Field', '+3% crit', 2, ['cl_m6', 'cl_m8'], { incCritChance: 3 }),
    minor('cl_m21', 'Forked Lightning', '+3 flat damage', 2, ['cl_m1', 'cl_m3'], { flatDamage: 3 }),
    minor('cl_m22', 'Storm Surge', '+8% damage', 3, ['cl_n4', 'cl_k1'], { incDamage: 8 }),
    minor('cl_m23', 'Crackling Energy', '+5% cast speed', 3, ['cl_n5', 'cl_k3'], { incCastSpeed: 5 }),
    notable('cl_n6', 'Tempest', '+10% damage, +5% cast speed, +2% crit', 3, ['cl_m16', 'cl_m17', 'cl_m18'], { incDamage: 10, incCastSpeed: 5, incCritChance: 2 }),
  ],
};

// ────────────────────────────────────────────
// 3. FROSTBOLT
// Themes: cold damage, chill debuff, crit
// ────────────────────────────────────────────
const FROSTBOLT_GRAPH: SkillGraph = {
  skillId: 'wand_frostbolt',
  maxPoints: 20,
  nodes: [
    { id: 'fb_start', name: 'Frost Core', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['fb_m1', 'fb_m2', 'fb_m3'] },
    minor('fb_m1', 'Frozen Touch', '+5% damage', 1, ['fb_start', 'fb_m4', 'fb_m5'], { incDamage: 5 }),
    minor('fb_m2', 'Ice Shard', '+4 flat damage', 1, ['fb_start', 'fb_m6', 'fb_m7'], { flatDamage: 4 }),
    minor('fb_m3', 'Brittle', '+2% crit chance', 1, ['fb_start', 'fb_m8', 'fb_m9'], { incCritChance: 2 }),
    minor('fb_m4', 'Cold Snap', '+5% damage', 1, ['fb_m1', 'fb_n1'], { incDamage: 5 }),
    minor('fb_m5', 'Frostbite', '+3 flat damage', 1, ['fb_m1', 'fb_m10'], { flatDamage: 3 }),
    minor('fb_m6', 'Glacial Force', '+5 flat damage', 1, ['fb_m2', 'fb_n2'], { flatDamage: 5 }),
    minor('fb_m7', 'Permafrost', '+5% damage', 1, ['fb_m2', 'fb_m11'], { incDamage: 5 }),
    minor('fb_m8', 'Ice Lens', '+3% crit chance', 1, ['fb_m3', 'fb_n3'], { incCritChance: 3 }),
    minor('fb_m9', 'Shatter', '+15% crit multiplier', 1, ['fb_m3', 'fb_m12'], { incCritMultiplier: 15 }),
    minor('fb_m10', 'Hypothermia', '+5% damage', 2, ['fb_m5', 'fb_n1'], { incDamage: 5 }),
    minor('fb_m11', 'Frost Nova', '+5% damage', 2, ['fb_m7', 'fb_n2'], { incDamage: 5 }),
    minor('fb_m12', 'Ice Pick', '+10% crit multiplier', 2, ['fb_m9', 'fb_n3'], { incCritMultiplier: 10 }),
    notable('fb_n1', 'Deep Freeze', '+15% damage, chill chance', 2, ['fb_m4', 'fb_m10', 'fb_m13'], { incDamage: 15, applyDebuff: { debuffId: 'chilled', chance: 0.3, duration: 4 } }),
    notable('fb_n2', 'Avalanche', '+10 flat damage', 2, ['fb_m6', 'fb_m11', 'fb_m14'], { flatDamage: 10 }),
    notable('fb_n3', 'Frozen Precision', '+5% crit, +20% crit dmg', 2, ['fb_m8', 'fb_m12', 'fb_m15'], { incCritChance: 5, incCritMultiplier: 20 }),
    minor('fb_m13', 'Glacial Power', '+8% damage', 3, ['fb_n1', 'fb_k1'], { incDamage: 8 }),
    minor('fb_m14', 'Ice Storm', '+5% damage', 3, ['fb_n2', 'fb_k2'], { incDamage: 5 }),
    minor('fb_m15', 'Absolute Zero', '+3% crit', 3, ['fb_n3', 'fb_k3'], { incCritChance: 3 }),
    minor('fb_m16', 'Cold Front', '+5% damage', 3, ['fb_n1', 'fb_n2'], { incDamage: 5 }),
    minor('fb_m17', 'Frozen Core', '+8% damage, +2% crit', 3, ['fb_n1', 'fb_n3'], { incDamage: 8, incCritChance: 2 }),
    minor('fb_m18', 'Crystallize', '+5% cast speed, +3% crit', 3, ['fb_n2', 'fb_n3'], { incCastSpeed: 5, incCritChance: 3 }),
    notable('fb_n4', 'Blizzard', '+20% damage, +5 flat', 3, ['fb_m13', 'fb_m16'], { incDamage: 20, flatDamage: 5 }),
    notable('fb_n5', 'Ice Assassin', '+5% crit, +15% crit dmg', 3, ['fb_m15', 'fb_m18'], { incCritChance: 5, incCritMultiplier: 15 }),
    keystone('fb_k1', 'Flash Freeze', 'Chill = 25% more damage taken', 4, ['fb_m13', 'fb_n4'], { applyDebuff: { debuffId: 'chilled', chance: 0.6, duration: 6 } }),
    keystone('fb_k2', 'Glacial Cascade', 'AoE + 1 extra hit', 4, ['fb_m14'], { convertToAoE: true, extraHits: 1 }),
    keystone('fb_k3', 'Permafrost Crit', '+60% crit dmg vs chilled', 4, ['fb_m15', 'fb_n5'], { incCritMultiplier: 60 }),
    minor('fb_m19', 'Cold Mastery', '+5% cast speed', 2, ['fb_m4', 'fb_m6'], { incCastSpeed: 5 }),
    minor('fb_m20', 'Frost Armor', '+3% crit', 2, ['fb_m6', 'fb_m8'], { incCritChance: 3 }),
    minor('fb_m21', 'Icy Veins', '+3 flat damage', 2, ['fb_m1', 'fb_m3'], { flatDamage: 3 }),
    minor('fb_m22', 'Arctic Blast', '+8% damage', 3, ['fb_n4', 'fb_k1'], { incDamage: 8 }),
    minor('fb_m23', 'Frigid Strikes', '+5% cast speed', 3, ['fb_n5', 'fb_k3'], { incCastSpeed: 5 }),
    notable('fb_n6', 'Winter\'s Grasp', '+10% damage, +5% cast speed, +2% crit', 3, ['fb_m16', 'fb_m17', 'fb_m18'], { incDamage: 10, incCastSpeed: 5, incCritChance: 2 }),
  ],
};

// ────────────────────────────────────────────
// 4. SEARING RAY
// Themes: fire damage, DoT, burn debuff
// ────────────────────────────────────────────
const SEARING_RAY_GRAPH: SkillGraph = {
  skillId: 'wand_searing_ray',
  maxPoints: 20,
  nodes: [
    { id: 'sr_start', name: 'Ignition', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['sr_m1', 'sr_m2', 'sr_m3'] },
    minor('sr_m1', 'Heat Wave', '+5% damage', 1, ['sr_start', 'sr_m4', 'sr_m5'], { incDamage: 5 }),
    minor('sr_m2', 'Ember', '+3 flat damage', 1, ['sr_start', 'sr_m6', 'sr_m7'], { flatDamage: 3 }),
    minor('sr_m3', 'Quick Burn', '+5% cast speed', 1, ['sr_start', 'sr_m8', 'sr_m9'], { incCastSpeed: 5 }),
    minor('sr_m4', 'Blaze', '+5% damage', 1, ['sr_m1', 'sr_n1'], { incDamage: 5 }),
    minor('sr_m5', 'Flame Lick', '+3 flat damage', 1, ['sr_m1', 'sr_m10'], { flatDamage: 3 }),
    minor('sr_m6', 'Kindling', '+4 flat damage', 1, ['sr_m2', 'sr_n2'], { flatDamage: 4 }),
    minor('sr_m7', 'Scorching', '+5% damage', 1, ['sr_m2', 'sr_m11'], { incDamage: 5 }),
    minor('sr_m8', 'Rapid Channel', '+5% cast speed', 1, ['sr_m3', 'sr_n3'], { incCastSpeed: 5 }),
    minor('sr_m9', 'Singe', '+2% crit chance', 1, ['sr_m3', 'sr_m12'], { incCritChance: 2 }),
    minor('sr_m10', 'Fuel', '+5% damage', 2, ['sr_m5', 'sr_n1'], { incDamage: 5 }),
    minor('sr_m11', 'Conflagration', '+5% damage', 2, ['sr_m7', 'sr_n2'], { incDamage: 5 }),
    minor('sr_m12', 'Fire Focus', '+3% crit chance', 2, ['sr_m9', 'sr_n3'], { incCritChance: 3 }),
    notable('sr_n1', 'Pyroclasm', '+15% damage, burn chance', 2, ['sr_m4', 'sr_m10', 'sr_m13'], { incDamage: 15, applyDebuff: { debuffId: 'burning', chance: 0.3, duration: 4 } }),
    notable('sr_n2', 'Firestorm', '+10 flat damage', 2, ['sr_m6', 'sr_m11', 'sr_m14'], { flatDamage: 10 }),
    notable('sr_n3', 'Blazing Speed', '+15% cast speed, +3% crit', 2, ['sr_m8', 'sr_m12', 'sr_m15'], { incCastSpeed: 15, incCritChance: 3 }),
    minor('sr_m13', 'Infernal', '+8% damage', 3, ['sr_n1', 'sr_k1'], { incDamage: 8 }),
    minor('sr_m14', 'Magma Core', '+5% damage', 3, ['sr_n2', 'sr_k2'], { incDamage: 5 }),
    minor('sr_m15', 'Flame Rush', '+8% cast speed', 3, ['sr_n3', 'sr_k3'], { incCastSpeed: 8 }),
    minor('sr_m16', 'Fire Link', '+5% damage', 3, ['sr_n1', 'sr_n2'], { incDamage: 5 }),
    minor('sr_m17', 'Burning Focus', '+8% damage, +2% crit', 3, ['sr_n1', 'sr_n3'], { incDamage: 8, incCritChance: 2 }),
    minor('sr_m18', 'Channeled Fire', '+5% cast speed', 3, ['sr_n2', 'sr_n3'], { incCastSpeed: 5 }),
    notable('sr_n4', 'Volcano', '+20% damage, +5 flat', 3, ['sr_m13', 'sr_m16'], { incDamage: 20, flatDamage: 5 }),
    notable('sr_n5', 'Flame Whip', '+10% cast speed, +10% damage', 3, ['sr_m15', 'sr_m18'], { incCastSpeed: 10, incDamage: 10 }),
    keystone('sr_k1', 'Incinerate', 'Guaranteed burn, +50% burn damage', 4, ['sr_m13', 'sr_n4'], { applyDebuff: { debuffId: 'burning', chance: 1.0, duration: 6 } }),
    keystone('sr_k2', 'Inferno Beam', 'Convert Cold→Fire, +40% fire damage', 4, ['sr_m14'], { convertElement: { from: 'Cold', to: 'Fire', percent: 100 }, incDamage: 40 }),
    keystone('sr_k3', 'Meltdown', '+30% cast speed, +20% damage', 4, ['sr_m15', 'sr_n5'], { incCastSpeed: 30, incDamage: 20 }),
    minor('sr_m19', 'Heat Sink', '+5% cast speed', 2, ['sr_m4', 'sr_m6'], { incCastSpeed: 5 }),
    minor('sr_m20', 'Thermal', '+3% crit', 2, ['sr_m6', 'sr_m8'], { incCritChance: 3 }),
    minor('sr_m21', 'Flame Trail', '+3 flat damage', 2, ['sr_m1', 'sr_m3'], { flatDamage: 3 }),
    minor('sr_m22', 'Hellfire', '+8% damage', 3, ['sr_n4', 'sr_k1'], { incDamage: 8 }),
    minor('sr_m23', 'Rapid Burn', '+5% cast speed', 3, ['sr_n5', 'sr_k3'], { incCastSpeed: 5 }),
    notable('sr_n6', 'Fire Mastery', '+10% damage, +5% cast speed, +2% crit', 3, ['sr_m16', 'sr_m17', 'sr_m18'], { incDamage: 10, incCastSpeed: 5, incCritChance: 2 }),
  ],
};

// ────────────────────────────────────────────
// 5. ESSENCE DRAIN
// Themes: chaos damage, poison debuff, leech
// ────────────────────────────────────────────
const ESSENCE_DRAIN_GRAPH: SkillGraph = {
  skillId: 'wand_essence_drain',
  maxPoints: 20,
  nodes: [
    { id: 'ed_start', name: 'Dark Tap', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['ed_m1', 'ed_m2', 'ed_m3'] },
    minor('ed_m1', 'Corruption', '+5% damage', 1, ['ed_start', 'ed_m4', 'ed_m5'], { incDamage: 5 }),
    minor('ed_m2', 'Venom', '+3 flat damage', 1, ['ed_start', 'ed_m6', 'ed_m7'], { flatDamage: 3 }),
    minor('ed_m3', 'Decay', '+2% crit chance', 1, ['ed_start', 'ed_m8', 'ed_m9'], { incCritChance: 2 }),
    minor('ed_m4', 'Blight', '+5% damage', 1, ['ed_m1', 'ed_n1'], { incDamage: 5 }),
    minor('ed_m5', 'Wither', '+3 flat damage', 1, ['ed_m1', 'ed_m10'], { flatDamage: 3 }),
    minor('ed_m6', 'Toxic Shot', '+4 flat damage', 1, ['ed_m2', 'ed_n2'], { flatDamage: 4 }),
    minor('ed_m7', 'Contagion', '+5% damage', 1, ['ed_m2', 'ed_m11'], { incDamage: 5 }),
    minor('ed_m8', 'Virulence', '+3% crit chance', 1, ['ed_m3', 'ed_n3'], { incCritChance: 3 }),
    minor('ed_m9', 'Necrosis', '+10% crit multiplier', 1, ['ed_m3', 'ed_m12'], { incCritMultiplier: 10 }),
    minor('ed_m10', 'Pestilence', '+5% damage', 2, ['ed_m5', 'ed_n1'], { incDamage: 5 }),
    minor('ed_m11', 'Putrefaction', '+5% damage', 2, ['ed_m7', 'ed_n2'], { incDamage: 5 }),
    minor('ed_m12', 'Dark Precision', '+15% crit multiplier', 2, ['ed_m9', 'ed_n3'], { incCritMultiplier: 15 }),
    notable('ed_n1', 'Plague Bearer', '+15% damage, poison chance', 2, ['ed_m4', 'ed_m10', 'ed_m13'], { incDamage: 15, applyDebuff: { debuffId: 'poisoned', chance: 0.4, duration: 5 } }),
    notable('ed_n2', 'Toxic Blast', '+10 flat damage', 2, ['ed_m6', 'ed_m11', 'ed_m14'], { flatDamage: 10 }),
    notable('ed_n3', 'Lethal Dose', '+5% crit, +20% crit dmg', 2, ['ed_m8', 'ed_m12', 'ed_m15'], { incCritChance: 5, incCritMultiplier: 20 }),
    minor('ed_m13', 'Spreading Rot', '+8% damage', 3, ['ed_n1', 'ed_k1'], { incDamage: 8 }),
    minor('ed_m14', 'Dark Energy', '+5% damage', 3, ['ed_n2', 'ed_k2'], { incDamage: 5 }),
    minor('ed_m15', 'Entropy', '+3% crit', 3, ['ed_n3', 'ed_k3'], { incCritChance: 3 }),
    minor('ed_m16', 'Chaos Link', '+5% damage', 3, ['ed_n1', 'ed_n2'], { incDamage: 5 }),
    minor('ed_m17', 'Void Touch', '+8% damage, +2% crit', 3, ['ed_n1', 'ed_n3'], { incDamage: 8, incCritChance: 2 }),
    minor('ed_m18', 'Toxic Crit', '+5% cast speed, +3% crit', 3, ['ed_n2', 'ed_n3'], { incCastSpeed: 5, incCritChance: 3 }),
    notable('ed_n4', 'Pandemic', '+20% damage', 3, ['ed_m13', 'ed_m16'], { incDamage: 20 }),
    notable('ed_n5', 'Dark Crit', '+5% crit, +15% crit dmg', 3, ['ed_m15', 'ed_m18'], { incCritChance: 5, incCritMultiplier: 15 }),
    keystone('ed_k1', 'Virulent Plague', 'AoE conversion (poison spreads)', 4, ['ed_m13', 'ed_n4'], { convertToAoE: true, applyDebuff: { debuffId: 'poisoned', chance: 0.7, duration: 8 } }),
    keystone('ed_k2', 'Soul Siphon', 'Life leech, +25% damage', 4, ['ed_m14'], { flags: ['lifeLeech'], incDamage: 25 }),
    keystone('ed_k3', 'Withering Touch', '+50% crit dmg, guaranteed poison', 4, ['ed_m15', 'ed_n5'], { incCritMultiplier: 50, applyDebuff: { debuffId: 'poisoned', chance: 1.0, duration: 6 } }),
    minor('ed_m19', 'Dark Flow', '+5% cast speed', 2, ['ed_m4', 'ed_m6'], { incCastSpeed: 5 }),
    minor('ed_m20', 'Malice', '+3% crit', 2, ['ed_m6', 'ed_m8'], { incCritChance: 3 }),
    minor('ed_m21', 'Poison Tip', '+3 flat damage', 2, ['ed_m1', 'ed_m3'], { flatDamage: 3 }),
    minor('ed_m22', 'Noxious', '+8% damage', 3, ['ed_n4', 'ed_k1'], { incDamage: 8 }),
    minor('ed_m23', 'Vile Intent', '+5% cast speed', 3, ['ed_n5', 'ed_k3'], { incCastSpeed: 5 }),
    notable('ed_n6', 'Chaos Mastery', '+10% damage, +5% cast speed, +2% crit', 3, ['ed_m16', 'ed_m17', 'ed_m18'], { incDamage: 10, incCastSpeed: 5, incCritChance: 2 }),
  ],
};

// ────────────────────────────────────────────
// 6. VOID BLAST
// Themes: raw damage, crit, element conversion
// ────────────────────────────────────────────
const VOID_BLAST_GRAPH: SkillGraph = {
  skillId: 'wand_void_blast',
  maxPoints: 20,
  nodes: [
    { id: 'vb_start', name: 'Void Seed', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['vb_m1', 'vb_m2', 'vb_m3'] },
    minor('vb_m1', 'Void Force', '+5% damage', 1, ['vb_start', 'vb_m4', 'vb_m5'], { incDamage: 5 }),
    minor('vb_m2', 'Dark Matter', '+4 flat damage', 1, ['vb_start', 'vb_m6', 'vb_m7'], { flatDamage: 4 }),
    minor('vb_m3', 'Entropy', '+2% crit chance', 1, ['vb_start', 'vb_m8', 'vb_m9'], { incCritChance: 2 }),
    minor('vb_m4', 'Void Power', '+5% damage', 1, ['vb_m1', 'vb_n1'], { incDamage: 5 }),
    minor('vb_m5', 'Collapse', '+5 flat damage', 1, ['vb_m1', 'vb_m10'], { flatDamage: 5 }),
    minor('vb_m6', 'Singularity', '+5 flat damage', 1, ['vb_m2', 'vb_n2'], { flatDamage: 5 }),
    minor('vb_m7', 'Gravitation', '+5% damage', 1, ['vb_m2', 'vb_m11'], { incDamage: 5 }),
    minor('vb_m8', 'Annihilation Focus', '+3% crit', 1, ['vb_m3', 'vb_n3'], { incCritChance: 3 }),
    minor('vb_m9', 'Void Strike', '+10% crit multiplier', 1, ['vb_m3', 'vb_m12'], { incCritMultiplier: 10 }),
    minor('vb_m10', 'Dark Compression', '+5% damage', 2, ['vb_m5', 'vb_n1'], { incDamage: 5 }),
    minor('vb_m11', 'Event Horizon', '+5% damage', 2, ['vb_m7', 'vb_n2'], { incDamage: 5 }),
    minor('vb_m12', 'Unstable Core', '+15% crit multiplier', 2, ['vb_m9', 'vb_n3'], { incCritMultiplier: 15 }),
    notable('vb_n1', 'Void Surge', '+15% damage, +5% cast speed', 2, ['vb_m4', 'vb_m10', 'vb_m13'], { incDamage: 15, incCastSpeed: 5 }),
    notable('vb_n2', 'Dark Explosion', '+12 flat damage', 2, ['vb_m6', 'vb_m11', 'vb_m14'], { flatDamage: 12 }),
    notable('vb_n3', 'Void Precision', '+5% crit, +25% crit dmg', 2, ['vb_m8', 'vb_m12', 'vb_m15'], { incCritChance: 5, incCritMultiplier: 25 }),
    minor('vb_m13', 'Spatial Tear', '+8% damage', 3, ['vb_n1', 'vb_k1'], { incDamage: 8 }),
    minor('vb_m14', 'Dimensional Rift', '+5% damage', 3, ['vb_n2', 'vb_k2'], { incDamage: 5 }),
    minor('vb_m15', 'Chaos Entropy', '+3% crit', 3, ['vb_n3', 'vb_k3'], { incCritChance: 3 }),
    minor('vb_m16', 'Void Link', '+5% damage', 3, ['vb_n1', 'vb_n2'], { incDamage: 5 }),
    minor('vb_m17', 'Dark Focus', '+8% damage, +2% crit', 3, ['vb_n1', 'vb_n3'], { incDamage: 8, incCritChance: 2 }),
    minor('vb_m18', 'Void Crit', '+5% cast speed, +3% crit', 3, ['vb_n2', 'vb_n3'], { incCastSpeed: 5, incCritChance: 3 }),
    notable('vb_n4', 'Abyssal Power', '+20% damage, +8 flat', 3, ['vb_m13', 'vb_m16'], { incDamage: 20, flatDamage: 8 }),
    notable('vb_n5', 'Void Assassin', '+5% crit, +15% crit dmg', 3, ['vb_m15', 'vb_m18'], { incCritChance: 5, incCritMultiplier: 15 }),
    keystone('vb_k1', 'Void Rift', 'AoE conversion, +20% damage', 4, ['vb_m13', 'vb_n4'], { convertToAoE: true, incDamage: 20 }),
    keystone('vb_k2', 'Annihilation', 'Cannot crit, +80% base damage', 4, ['vb_m14'], { flags: ['cannotCrit'], flatDamage: 40, incDamage: 30 }),
    keystone('vb_k3', 'Dimensional Collapse', '+70% crit dmg', 4, ['vb_m15', 'vb_n5'], { incCritMultiplier: 70 }),
    minor('vb_m19', 'Dark Speed', '+5% cast speed', 2, ['vb_m4', 'vb_m6'], { incCastSpeed: 5 }),
    minor('vb_m20', 'Void Shard', '+3% crit', 2, ['vb_m6', 'vb_m8'], { incCritChance: 3 }),
    minor('vb_m21', 'Space Warp', '+4 flat damage', 2, ['vb_m1', 'vb_m3'], { flatDamage: 4 }),
    minor('vb_m22', 'Void Storm', '+8% damage', 3, ['vb_n4', 'vb_k1'], { incDamage: 8 }),
    minor('vb_m23', 'Dark Intent', '+5% cast speed', 3, ['vb_n5', 'vb_k3'], { incCastSpeed: 5 }),
    notable('vb_n6', 'Void Mastery', '+10% damage, +5% cast speed, +2% crit', 3, ['vb_m16', 'vb_m17', 'vb_m18'], { incDamage: 10, incCastSpeed: 5, incCritChance: 2 }),
  ],
};

// ────────────────────────────────────────────
// 7. CHAIN LIGHTNING BUFF (non-active, wand_chain_lightning_buff)
// Themes: duration, lightning boost, shock
// ────────────────────────────────────────────
const CHAIN_LIGHTNING_BUFF_GRAPH: SkillGraph = {
  skillId: 'wand_chain_lightning_buff',
  maxPoints: 20,
  nodes: [
    { id: 'clb_start', name: 'Storm Seed', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['clb_m1', 'clb_m2', 'clb_m3'] },
    minor('clb_m1', 'Extended Storm', '+2s duration', 1, ['clb_start', 'clb_m4', 'clb_m5'], { durationBonus: 2 }),
    minor('clb_m2', 'Storm Power', '+5% damage', 1, ['clb_start', 'clb_m6', 'clb_m7'], { abilityEffect: { damageMult: 1.05 } }),
    minor('clb_m3', 'Material Storm', '+5% materials', 1, ['clb_start', 'clb_m8', 'clb_m9'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('clb_m4', 'Lasting Charge', '+2s duration', 1, ['clb_m1', 'clb_n1'], { durationBonus: 2 }),
    minor('clb_m5', 'Storm Speed', '-5% cooldown', 1, ['clb_m1', 'clb_m10'], { cooldownReduction: 5 }),
    minor('clb_m6', 'Lightning Boost', '+5% damage', 1, ['clb_m2', 'clb_n2'], { abilityEffect: { damageMult: 1.05 } }),
    minor('clb_m7', 'Storm Fury', '+3% crit', 1, ['clb_m2', 'clb_m11'], { abilityEffect: { critChanceBonus: 3 } }),
    minor('clb_m8', 'Rich Harvest', '+5% materials', 1, ['clb_m3', 'clb_n3'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('clb_m9', 'Item Storm', '+5% items', 1, ['clb_m3', 'clb_m12'], { abilityEffect: { itemDropMult: 1.05 } }),
    minor('clb_m10', 'Reduced Cooldown', '-5% cooldown', 2, ['clb_m5', 'clb_n1'], { cooldownReduction: 5 }),
    minor('clb_m11', 'Crackling Power', '+3% crit dmg', 2, ['clb_m7', 'clb_n2'], { abilityEffect: { critMultiplierBonus: 3 } }),
    minor('clb_m12', 'Lucky Storm', '+5% items', 2, ['clb_m9', 'clb_n3'], { abilityEffect: { itemDropMult: 1.05 } }),
    notable('clb_n1', 'Sustained Storm', '+5s duration, -10% CD', 2, ['clb_m4', 'clb_m10', 'clb_m13'], { durationBonus: 5, cooldownReduction: 10 }),
    notable('clb_n2', 'Thunder God', '+15% damage, +5% crit', 2, ['clb_m6', 'clb_m11', 'clb_m14'], { abilityEffect: { damageMult: 1.15, critChanceBonus: 5 } }),
    notable('clb_n3', 'Storm Harvest', '+10% materials, +10% items', 2, ['clb_m8', 'clb_m12', 'clb_m15'], { abilityEffect: { materialDropMult: 1.1, itemDropMult: 1.1 } }),
    minor('clb_m13', 'Eternal Storm', '+3s duration', 3, ['clb_n1', 'clb_k1'], { durationBonus: 3 }),
    minor('clb_m14', 'Wrath', '+5% damage', 3, ['clb_n2', 'clb_k2'], { abilityEffect: { damageMult: 1.05 } }),
    minor('clb_m15', 'Fortune', '+5% items', 3, ['clb_n3', 'clb_k3'], { abilityEffect: { itemDropMult: 1.05 } }),
    minor('clb_m16', 'Storm Bridge', '+3s duration, +5% damage', 3, ['clb_n1', 'clb_n2'], { durationBonus: 3, abilityEffect: { damageMult: 1.05 } }),
    minor('clb_m17', 'Charged Harvest', '+5% materials', 3, ['clb_n1', 'clb_n3'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('clb_m18', 'Power Loot', '+5% damage, +5% items', 3, ['clb_n2', 'clb_n3'], { abilityEffect: { damageMult: 1.05, itemDropMult: 1.05 } }),
    notable('clb_n4', 'Tempest Lord', '+10s duration', 3, ['clb_m13', 'clb_m16'], { durationBonus: 10 }),
    notable('clb_n5', 'Lightning Empowerment', '+20% damage, +8% crit', 3, ['clb_m14', 'clb_m18'], { abilityEffect: { damageMult: 1.2, critChanceBonus: 8 } }),
    keystone('clb_k1', 'Perpetual Storm', '+10s duration, +50% lightning damage', 4, ['clb_m13', 'clb_n4'], { durationBonus: 10, abilityEffect: { damageMult: 1.5 } }),
    keystone('clb_k2', 'Overcharge', 'Shock on every hit via buff', 4, ['clb_m14', 'clb_n5'], { abilityEffect: { damageMult: 1.3, critChanceBonus: 10 } }),
    keystone('clb_k3', 'Magnetic Storm', '+30% items, +20% materials', 4, ['clb_m15'], { abilityEffect: { itemDropMult: 1.3, materialDropMult: 1.2 } }),
    minor('clb_m19', 'Storm Flow', '+2s duration', 2, ['clb_m4', 'clb_m6'], { durationBonus: 2 }),
    minor('clb_m20', 'Spark Harvest', '+5% materials', 2, ['clb_m6', 'clb_m8'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('clb_m21', 'Quick Charge', '-5% cooldown', 2, ['clb_m1', 'clb_m3'], { cooldownReduction: 5 }),
    notable('clb_n6', 'Storm Mastery', '+5s duration, +10% damage, +5% items', 3, ['clb_m16', 'clb_m17', 'clb_m18'], { durationBonus: 5, abilityEffect: { damageMult: 1.1, itemDropMult: 1.05 } }),
  ],
};

// ────────────────────────────────────────────
// 8. TIME WARP (buff)
// Themes: duration, clear speed, cooldown
// ────────────────────────────────────────────
const TIME_WARP_GRAPH: SkillGraph = {
  skillId: 'wand_time_warp',
  maxPoints: 20,
  nodes: [
    { id: 'tw_start', name: 'Temporal Seed', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['tw_m1', 'tw_m2', 'tw_m3'] },
    minor('tw_m1', 'Time Stretch', '+2s duration', 1, ['tw_start', 'tw_m4', 'tw_m5'], { durationBonus: 2 }),
    minor('tw_m2', 'Acceleration', '+10% clear speed', 1, ['tw_start', 'tw_m6', 'tw_m7'], { abilityEffect: { clearSpeedMult: 1.1 } }),
    minor('tw_m3', 'Efficiency', '-5% cooldown', 1, ['tw_start', 'tw_m8', 'tw_m9'], { cooldownReduction: 5 }),
    minor('tw_m4', 'Extended Time', '+2s duration', 1, ['tw_m1', 'tw_n1'], { durationBonus: 2 }),
    minor('tw_m5', 'Quick Recovery', '-5% cooldown', 1, ['tw_m1', 'tw_m10'], { cooldownReduction: 5 }),
    minor('tw_m6', 'Speed Boost', '+10% clear speed', 1, ['tw_m2', 'tw_n2'], { abilityEffect: { clearSpeedMult: 1.1 } }),
    minor('tw_m7', 'Time Loot', '+5% materials', 1, ['tw_m2', 'tw_m11'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('tw_m8', 'Rapid Recharge', '-5% cooldown', 1, ['tw_m3', 'tw_n3'], { cooldownReduction: 5 }),
    minor('tw_m9', 'Time Bonus', '+5% XP', 1, ['tw_m3', 'tw_m12'], { abilityEffect: { xpMult: 1.05 } }),
    minor('tw_m10', 'Quick Cycle', '-5% cooldown', 2, ['tw_m5', 'tw_n1'], { cooldownReduction: 5 }),
    minor('tw_m11', 'Harvest Time', '+5% materials', 2, ['tw_m7', 'tw_n2'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('tw_m12', 'XP Warp', '+5% XP', 2, ['tw_m9', 'tw_n3'], { abilityEffect: { xpMult: 1.05 } }),
    notable('tw_n1', 'Time Lord', '+5s duration, -10% CD', 2, ['tw_m4', 'tw_m10', 'tw_m13'], { durationBonus: 5, cooldownReduction: 10 }),
    notable('tw_n2', 'Haste Aura', '+25% clear speed, +10% materials', 2, ['tw_m6', 'tw_m11', 'tw_m14'], { abilityEffect: { clearSpeedMult: 1.25, materialDropMult: 1.1 } }),
    notable('tw_n3', 'Time Efficiency', '-15% CD, +5% XP', 2, ['tw_m8', 'tw_m12', 'tw_m15'], { cooldownReduction: 15, abilityEffect: { xpMult: 1.05 } }),
    minor('tw_m13', 'Eternal Warp', '+3s duration', 3, ['tw_n1', 'tw_k1'], { durationBonus: 3 }),
    minor('tw_m14', 'Overdrive', '+10% clear speed', 3, ['tw_n2', 'tw_k2'], { abilityEffect: { clearSpeedMult: 1.1 } }),
    minor('tw_m15', 'Time Mastery', '-5% CD', 3, ['tw_n3', 'tw_k3'], { cooldownReduction: 5 }),
    minor('tw_m16', 'Time Bridge', '+3s duration, +10% clear speed', 3, ['tw_n1', 'tw_n2'], { durationBonus: 3, abilityEffect: { clearSpeedMult: 1.1 } }),
    minor('tw_m17', 'Temporal Harvest', '+5% materials', 3, ['tw_n1', 'tw_n3'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('tw_m18', 'Speed XP', '+5% XP, +10% clear speed', 3, ['tw_n2', 'tw_n3'], { abilityEffect: { xpMult: 1.05, clearSpeedMult: 1.1 } }),
    notable('tw_n4', 'Temporal Mastery', '+8s duration', 3, ['tw_m13', 'tw_m16'], { durationBonus: 8 }),
    notable('tw_n5', 'Warp Drive', '+30% clear speed', 3, ['tw_m14', 'tw_m18'], { abilityEffect: { clearSpeedMult: 1.3 } }),
    keystone('tw_k1', 'Temporal Mastery', '+15s duration, -30% CD', 4, ['tw_m13', 'tw_n4'], { durationBonus: 15, cooldownReduction: 30 }),
    keystone('tw_k2', 'Haste Overdrive', '+50% clear speed, +attack speed', 4, ['tw_m14', 'tw_n5'], { abilityEffect: { clearSpeedMult: 1.5, attackSpeedMult: 1.2 } }),
    keystone('tw_k3', 'Time Paradox', '-40% CD, +10% XP, +10% items', 4, ['tw_m15'], { cooldownReduction: 40, abilityEffect: { xpMult: 1.1, itemDropMult: 1.1 } }),
    minor('tw_m19', 'Temporal Flow', '+2s duration', 2, ['tw_m4', 'tw_m6'], { durationBonus: 2 }),
    minor('tw_m20', 'Speed Harvest', '+5% materials', 2, ['tw_m6', 'tw_m8'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('tw_m21', 'Quick Warp', '-5% cooldown', 2, ['tw_m1', 'tw_m3'], { cooldownReduction: 5 }),
    notable('tw_n6', 'Warp Mastery', '+5s duration, +15% clear speed, +5% XP', 3, ['tw_m16', 'tw_m17', 'tw_m18'], { durationBonus: 5, abilityEffect: { clearSpeedMult: 1.15, xpMult: 1.05 } }),
  ],
};

// ────────────────────────────────────────────
// 9. MYSTIC INSIGHT (passive)
// Themes: XP, item drops, material drops
// ────────────────────────────────────────────
const MYSTIC_INSIGHT_GRAPH: SkillGraph = {
  skillId: 'wand_mystic_insight',
  maxPoints: 20,
  nodes: [
    { id: 'mi_start', name: 'Inner Eye', description: 'Starting node.', nodeType: 'start', tier: 0, connections: ['mi_m1', 'mi_m2', 'mi_m3'] },
    minor('mi_m1', 'Keen Eye', '+3% items', 1, ['mi_start', 'mi_m4', 'mi_m5'], { abilityEffect: { itemDropMult: 1.03 } }),
    minor('mi_m2', 'Resource Sense', '+3% materials', 1, ['mi_start', 'mi_m6', 'mi_m7'], { abilityEffect: { materialDropMult: 1.03 } }),
    minor('mi_m3', 'Wisdom', '+3% XP', 1, ['mi_start', 'mi_m8', 'mi_m9'], { abilityEffect: { xpMult: 1.03 } }),
    minor('mi_m4', 'Treasure Hunter', '+3% items', 1, ['mi_m1', 'mi_n1'], { abilityEffect: { itemDropMult: 1.03 } }),
    minor('mi_m5', 'Dual Sense', '+3% items, +3% materials', 1, ['mi_m1', 'mi_m10'], { abilityEffect: { itemDropMult: 1.03, materialDropMult: 1.03 } }),
    minor('mi_m6', 'Material Focus', '+3% materials', 1, ['mi_m2', 'mi_n2'], { abilityEffect: { materialDropMult: 1.03 } }),
    minor('mi_m7', 'Rich Veins', '+5% materials', 1, ['mi_m2', 'mi_m11'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('mi_m8', 'Scholar', '+3% XP', 1, ['mi_m3', 'mi_n3'], { abilityEffect: { xpMult: 1.03 } }),
    minor('mi_m9', 'Quick Study', '+5% XP', 1, ['mi_m3', 'mi_m12'], { abilityEffect: { xpMult: 1.05 } }),
    minor('mi_m10', 'Lucky Find', '+5% items', 2, ['mi_m5', 'mi_n1'], { abilityEffect: { itemDropMult: 1.05 } }),
    minor('mi_m11', 'Deep Dig', '+5% materials', 2, ['mi_m7', 'mi_n2'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('mi_m12', 'Fast Learner', '+5% XP', 2, ['mi_m9', 'mi_n3'], { abilityEffect: { xpMult: 1.05 } }),
    notable('mi_n1', 'Treasure Sense', '+10% items', 2, ['mi_m4', 'mi_m10', 'mi_m13'], { abilityEffect: { itemDropMult: 1.1 } }),
    notable('mi_n2', 'Material Mastery', '+10% materials', 2, ['mi_m6', 'mi_m11', 'mi_m14'], { abilityEffect: { materialDropMult: 1.1 } }),
    notable('mi_n3', 'XP Mastery', '+10% XP', 2, ['mi_m8', 'mi_m12', 'mi_m15'], { abilityEffect: { xpMult: 1.1 } }),
    minor('mi_m13', 'Greed', '+5% items', 3, ['mi_n1', 'mi_k1'], { abilityEffect: { itemDropMult: 1.05 } }),
    minor('mi_m14', 'Abundance', '+5% materials', 3, ['mi_n2', 'mi_k2'], { abilityEffect: { materialDropMult: 1.05 } }),
    minor('mi_m15', 'Enlightened', '+5% XP', 3, ['mi_n3', 'mi_k3'], { abilityEffect: { xpMult: 1.05 } }),
    minor('mi_m16', 'Item Sense', '+5% items, +3% materials', 3, ['mi_n1', 'mi_n2'], { abilityEffect: { itemDropMult: 1.05, materialDropMult: 1.03 } }),
    minor('mi_m17', 'Insight XP', '+5% items, +3% XP', 3, ['mi_n1', 'mi_n3'], { abilityEffect: { itemDropMult: 1.05, xpMult: 1.03 } }),
    minor('mi_m18', 'Material XP', '+3% materials, +3% XP', 3, ['mi_n2', 'mi_n3'], { abilityEffect: { materialDropMult: 1.03, xpMult: 1.03 } }),
    notable('mi_n4', 'Fortune\'s Favor', '+15% items', 3, ['mi_m13', 'mi_m16'], { abilityEffect: { itemDropMult: 1.15 } }),
    notable('mi_n5', 'Deep Knowledge', '+10% XP, +5% materials', 3, ['mi_m15', 'mi_m18'], { abilityEffect: { xpMult: 1.1, materialDropMult: 1.05 } }),
    keystone('mi_k1', 'Enlightenment', '+30% XP', 4, ['mi_m13', 'mi_n4'], { abilityEffect: { xpMult: 1.3 } }),
    keystone('mi_k2', 'Treasure Sense', '+25% items, +25% materials', 4, ['mi_m14'], { abilityEffect: { itemDropMult: 1.25, materialDropMult: 1.25 } }),
    keystone('mi_k3', 'Sage\'s Wisdom', '+20% XP, +15% items, +15% materials', 4, ['mi_m15', 'mi_n5'], { abilityEffect: { xpMult: 1.2, itemDropMult: 1.15, materialDropMult: 1.15 } }),
    minor('mi_m19', 'Dual Focus', '+3% items, +3% XP', 2, ['mi_m4', 'mi_m6'], { abilityEffect: { itemDropMult: 1.03, xpMult: 1.03 } }),
    minor('mi_m20', 'Balanced', '+3% materials, +3% XP', 2, ['mi_m6', 'mi_m8'], { abilityEffect: { materialDropMult: 1.03, xpMult: 1.03 } }),
    minor('mi_m21', 'All Seeing', '+3% items, +3% materials', 2, ['mi_m1', 'mi_m3'], { abilityEffect: { itemDropMult: 1.03, materialDropMult: 1.03 } }),
    notable('mi_n6', 'Insight Mastery', '+5% items, +5% materials, +5% XP', 3, ['mi_m16', 'mi_m17', 'mi_m18'], { abilityEffect: { itemDropMult: 1.05, materialDropMult: 1.05, xpMult: 1.05 } }),
  ],
};

// ────────────────────────────────────────────
// EXPORT: All wand skill graphs
// ────────────────────────────────────────────
export const WAND_SKILL_GRAPHS: Record<string, SkillGraph> = {
  'wand_magic_missile': MAGIC_MISSILE_GRAPH,
  'wand_chain_lightning': CHAIN_LIGHTNING_GRAPH,
  'wand_frostbolt': FROSTBOLT_GRAPH,
  'wand_searing_ray': SEARING_RAY_GRAPH,
  'wand_essence_drain': ESSENCE_DRAIN_GRAPH,
  'wand_void_blast': VOID_BLAST_GRAPH,
  'wand_chain_lightning_buff': CHAIN_LIGHTNING_BUFF_GRAPH,
  'wand_time_warp': TIME_WARP_GRAPH,
  'wand_mystic_insight': MYSTIC_INSIGHT_GRAPH,
};

// ============================================================
// Unique Item Definitions — build-defining uniques crafted from boss patterns
// ============================================================

import type { UniqueItemDef } from '../types';

export const UNIQUE_ITEM_DEFS: UniqueItemDef[] = [
  // ── Band 1 ──────────────────────────────────────────────────

  {
    id: 'unique_adders_fang',
    name: "Adder's Fang",
    lore: 'Each wound festers twice as fast, but the venom is thinned by haste.',
    baseItemId: 'crude_dagger',
    bossZoneId: 'dustvein_hollow',
    band: 1,
    uniqueAffix: {
      slot: 'prefix',
      displayText: 'Poisons apply 2 instances at 50% damage each',
      stats: { doublePoisonHalfDamage: 1 },
    },
    craftCost: {
      trophyId: 'trophy_matriarch',
      trophyAmount: 3,
      materials: [
        { materialId: 'cindite_ore', amount: 15 },
        { materialId: 'rough_shale', amount: 10 },
      ],
      goldCost: 150,
    },
    profession: 'weaponsmith',
  },

  {
    id: 'unique_frostbite_loop',
    name: 'Frostbite Loop',
    lore: 'The band numbs all it touches — friend and foe alike.',
    baseItemId: 'copper_band',
    bossZoneId: 'ashwood_thicket',
    band: 1,
    uniqueAffix: {
      slot: 'suffix',
      displayText: 'Hits always Chill. +10% damage vs Chilled',
      stats: { alwaysChill: 1, incDamageVsChilled: 10 },
    },
    craftCost: {
      trophyId: 'trophy_brambleback',
      trophyAmount: 3,
      materials: [
        { materialId: 'emberwood_logs', amount: 15 },
        { materialId: 'ragged_pelts', amount: 10 },
      ],
      goldCost: 150,
    },
    profession: 'jeweler',
  },

  {
    id: 'unique_brambleback_hide',
    name: "Brambleback's Hide",
    lore: 'Pain becomes power, but the thorns cut inward.',
    baseItemId: 'rawhide_tunic',
    bossZoneId: 'ashwood_thicket',
    band: 1,
    uniqueAffix: {
      slot: 'prefix',
      displayText: 'When hit: +2% inc damage for 5s (max 5 stacks), lose 1% current Life per stack',
      stats: { onHitGainDamagePercent: 2, onHitGainDamageMaxStacks: 5 },
    },
    craftCost: {
      trophyId: 'trophy_brambleback',
      trophyAmount: 3,
      materials: [
        { materialId: 'ragged_pelts', amount: 20 },
        { materialId: 'emberwood_logs', amount: 10 },
      ],
      goldCost: 150,
    },
    profession: 'leatherworker',
  },

  // ── Band 2 ──────────────────────────────────────────────────

  {
    id: 'unique_heartblood_edge',
    name: 'Heartblood Edge',
    lore: 'It drinks deep of the wielder to sharpen its thirst.',
    baseItemId: 'steel_stiletto',
    bossZoneId: 'rothollow_thicket',
    band: 2,
    uniqueAffix: {
      slot: 'prefix',
      displayText: 'Lose 2% current Life on hit. +0.5% inc damage per 1% Life missing',
      stats: { damageOnHitSelfPercent: 2, incDamagePerMissingLifePercent: 0.5 },
    },
    craftCost: {
      trophyId: 'trophy_abomination',
      trophyAmount: 4,
      materials: [
        { materialId: 'ferrite_ore', amount: 20 },
        { materialId: 'slate_chunks', amount: 15 },
      ],
      rareMaterialId: 'polished_gem',
      rareMaterialAmount: 1,
      goldCost: 400,
    },
    profession: 'weaponsmith',
  },

  {
    id: 'unique_marsh_kings_crown',
    name: "Marsh King's Crown",
    lore: 'Its wearer commands the swamp — and the swamp obeys.',
    baseItemId: 'steel_greathelm',
    bossZoneId: 'bogmire_marsh',
    band: 2,
    uniqueAffix: {
      slot: 'prefix',
      displayText: 'Curse effect doubled (-30 resist/stack). +8% more DoT vs Cursed',
      stats: { enhancedCurseEffect: 1, moreDotVsCursed: 8 },
    },
    craftCost: {
      trophyId: 'trophy_marsh_king',
      trophyAmount: 4,
      materials: [
        { materialId: 'ferrite_ore', amount: 25 },
        { materialId: 'marshbloom', amount: 15 },
      ],
      rareMaterialId: 'brilliant_essence',
      rareMaterialAmount: 1,
      goldCost: 400,
    },
    profession: 'armorer',
  },

  {
    id: 'unique_windsworn_greaves',
    name: 'Windsworn Greaves',
    lore: 'The wind rewards those quick enough to ride it.',
    baseItemId: 'studded_boots',
    bossZoneId: 'windsworn_steppe',
    band: 2,
    uniqueAffix: {
      slot: 'suffix',
      displayText: 'Dodge grants +5% attack speed for 3s (max 3 stacks)',
      stats: { dodgeGrantsAttackSpeedPercent: 5, dodgeAttackSpeedMaxStacks: 3 },
    },
    craftCost: {
      trophyId: 'trophy_warchief',
      trophyAmount: 4,
      materials: [
        { materialId: 'galehide', amount: 20 },
        { materialId: 'steppe_flax', amount: 15 },
      ],
      rareMaterialId: 'apex_fang',
      rareMaterialAmount: 1,
      goldCost: 400,
    },
    profession: 'leatherworker',
  },

  // ── Band 3 ──────────────────────────────────────────────────

  {
    id: 'unique_emberheart_pendant',
    name: 'Emberheart Pendant',
    lore: 'Within it burns the heart of the caldera — everything it touches ignites.',
    baseItemId: 'onyx_pendant',
    bossZoneId: 'emberpeak_caldera',
    band: 3,
    uniqueAffix: {
      slot: 'prefix',
      displayText: '40% Phys\u2192Fire conversion. Burning enemies explode on kill for 15% max HP',
      stats: { physToFireConversion: 40, burnExplosionPercent: 15 },
    },
    craftCost: {
      trophyId: 'trophy_infernal',
      trophyAmount: 5,
      materials: [
        { materialId: 'magmaite_ore', amount: 20 },
        { materialId: 'charite', amount: 15 },
      ],
      rareMaterialId: 'polished_gem',
      rareMaterialAmount: 1,
      goldCost: 1000,
    },
    profession: 'jeweler',
  },

  {
    id: 'unique_rothollow_grip',
    name: 'Rothollow Grip',
    lore: 'The rot seeps deeper, but life no longer mends the wound.',
    baseItemId: 'nightstalker_gloves',
    bossZoneId: 'rothollow_thicket',
    band: 3,
    uniqueAffix: {
      slot: 'prefix',
      displayText: 'DoT deals 30% more damage. Cannot Life Leech',
      stats: { moreDotDamage: 30, cannotLeech: 1 },
    },
    craftCost: {
      trophyId: 'trophy_abomination',
      trophyAmount: 5,
      materials: [
        { materialId: 'blight_bark', amount: 25 },
        { materialId: 'sporefern', amount: 20 },
      ],
      rareMaterialId: 'brilliant_essence',
      rareMaterialAmount: 1,
      goldCost: 1000,
    },
    profession: 'leatherworker',
  },

  // ── Band 4 (TBD bosses) ────────────────────────────────────

  {
    id: 'unique_shadowlords_veil',
    name: "Shadowlord's Veil",
    lore: 'Shadows cling to its wearer, bending time around every expiring ward.',
    baseItemId: 'shadowweave_cloak',
    bossZoneId: 'emberpeak_caldera', // placeholder until band 4 boss defined
    band: 3,
    uniqueAffix: {
      slot: 'suffix',
      displayText: '+20% Cooldown Recovery. Buff expiry resets lowest-CD skill',
      stats: { cooldownRecovery: 20, buffExpiryResetCd: 1 },
    },
    craftCost: {
      trophyId: 'trophy_infernal',
      trophyAmount: 5,
      materials: [
        { materialId: 'magmaite_ore', amount: 20 },
        { materialId: 'charite', amount: 20 },
      ],
      rareMaterialId: 'ancient_heartwood',
      rareMaterialAmount: 1,
      goldCost: 1200,
    },
    profession: 'tailor',
  },

  {
    id: 'unique_voidborn_signet',
    name: 'Voidborn Signet',
    lore: 'A fragment of the void made manifest — power at the cost of vitality.',
    baseItemId: 'gold_signet',
    bossZoneId: 'rothollow_thicket', // placeholder until band 4 boss defined
    band: 3,
    uniqueAffix: {
      slot: 'prefix',
      displayText: '8% of all damage as extra Chaos. -10% max Life',
      stats: { extraChaosDamagePercent: 8, maxLifePenaltyPercent: 10 },
    },
    craftCost: {
      trophyId: 'trophy_abomination',
      trophyAmount: 5,
      materials: [
        { materialId: 'blight_bark', amount: 25 },
        { materialId: 'sporefern', amount: 15 },
      ],
      rareMaterialId: 'ancient_heartwood',
      rareMaterialAmount: 1,
      goldCost: 1200,
    },
    profession: 'jeweler',
  },
];

const uniqueById = new Map<string, UniqueItemDef>(
  UNIQUE_ITEM_DEFS.map(u => [u.id, u]),
);

/** Get a unique item definition by ID. */
export function getUniqueItemDef(id: string): UniqueItemDef | undefined {
  return uniqueById.get(id);
}

/** Get all unique item definitions that can drop from a specific zone's boss. */
export function getUniquesForZone(zoneId: string): UniqueItemDef[] {
  return UNIQUE_ITEM_DEFS.filter(u => u.bossZoneId === zoneId);
}

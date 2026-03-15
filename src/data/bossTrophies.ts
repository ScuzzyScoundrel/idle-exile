// ============================================================
// Boss Trophies — materials dropped by bosses, used to craft unique items
// ============================================================

export interface BossTrophyDef {
  id: string;
  name: string;
  icon: string;
  bossZoneId: string;
  description: string;
}

export const BOSS_TROPHY_DEFS: BossTrophyDef[] = [
  // Band 1
  { id: 'trophy_brambleback', name: 'Brambleback Spine', icon: '\uD83E\uDDB4', bossZoneId: 'ashwood_thicket', description: 'A jagged spine torn from the Elder Brambleback.' },
  { id: 'trophy_matriarch', name: 'Matriarch Fang', icon: '\uD83E\uDDB7', bossZoneId: 'dustvein_hollow', description: 'A venomous fang from the Dustvein Matriarch.' },
  { id: 'trophy_fieldwarden', name: 'Fieldwarden Antler', icon: '\uD83E\uDE78', bossZoneId: 'stillwater_meadow', description: 'A massive antler from The Fieldwarden.' },
  { id: 'trophy_mossback', name: 'Ancient Heartwood', icon: '\uD83E\uDEB5', bossZoneId: 'mossback_creek', description: 'Petrified heartwood from the Mossback Ancient.' },
  { id: 'trophy_tyrant', name: 'Tyrant Claw', icon: '\uD83D\uDC3E', bossZoneId: 'thistlewood_grove', description: 'A razor-sharp claw from the Thistlewood Tyrant.' },
  // Band 2
  { id: 'trophy_alpha', name: 'Ironcrest Scale', icon: '\uD83D\uDEE1\uFE0F', bossZoneId: 'ironcrest_ridge', description: 'An impenetrable scale from the Ironcrest Alpha.' },
  { id: 'trophy_marsh_king', name: 'Crown of Mire', icon: '\uD83D\uDC51', bossZoneId: 'bogmire_marsh', description: 'A corroded crown shard from The Marsh King.' },
  { id: 'trophy_warchief', name: 'Warchief Totem', icon: '\u2694\uFE0F', bossZoneId: 'windsworn_steppe', description: 'A battle totem from the Windsworn Warchief.' },
  { id: 'trophy_geode', name: 'Living Crystal', icon: '\uD83D\uDC8E', bossZoneId: 'glintstone_caverns', description: 'A pulsating crystal from The Living Geode.' },
  { id: 'trophy_abomination', name: 'Abomination Core', icon: '\uD83E\uDDA0', bossZoneId: 'rothollow_thicket', description: 'A festering core from the Rothollow Abomination.' },
  // Band 3
  { id: 'trophy_infernal', name: 'Infernal Ember', icon: '\uD83D\uDD25', bossZoneId: 'emberpeak_caldera', description: 'An eternally burning ember from the Emberpeak Infernal.' },
  { id: 'trophy_broodmother', name: 'Broodmother Silk', icon: '\uD83D\uDD78\uFE0F', bossZoneId: 'silkveil_canopy', description: 'Unbreakable silk from The Broodmother.' },
  { id: 'trophy_leviathan', name: 'Leviathan Scale', icon: '\u2744\uFE0F', bossZoneId: 'frostmere_depths', description: 'A frost-rimed scale from the Frostmere Leviathan.' },
];

const trophyById = new Map<string, BossTrophyDef>(
  BOSS_TROPHY_DEFS.map(t => [t.id, t]),
);

const trophyByZone = new Map<string, BossTrophyDef>(
  BOSS_TROPHY_DEFS.map(t => [t.bossZoneId, t]),
);

/** Get a trophy definition by ID. */
export function getBossTrophyDef(id: string): BossTrophyDef | undefined {
  return trophyById.get(id);
}

/** Get the trophy definition for a given zone (boss). */
export function getBossTrophyForZone(zoneId: string): BossTrophyDef | undefined {
  return trophyByZone.get(zoneId);
}

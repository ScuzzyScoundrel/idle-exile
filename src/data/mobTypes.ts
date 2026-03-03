// ============================================================
// Idle Exile — Mob Type Definitions (per zone)
// ============================================================
//
// Each zone has 3 mob types with spawn weights (50 / 35 / 15).
// The first mob in each zone matches the existing zone mobName.
// Each mob has exactly 1 unique drop material ID.
// ============================================================

import type { MobTypeDef } from '../types';

// ---------------------------------------------------------------------------
// Zone Mob Type Registry
// ---------------------------------------------------------------------------

export const ZONE_MOB_TYPES: Record<string, MobTypeDef[]> = {

  // ── Band 1: The Greenlands ──────────────────────────────────

  ashwood_thicket: [
    {
      id: 'ashwood_thicket_crawler',
      name: 'Thicket Crawler',
      weight: 50,
      uniqueDrops: ['thicket_crawler_chitin'],
      description: 'A skittering insectoid that nests among the fallen logs.',
    },
    {
      id: 'ashwood_bark_beetle',
      name: 'Bark Beetle',
      weight: 35,
      uniqueDrops: ['bark_beetle_shell'],
      hpMultiplier: 0.9,
      description: 'Hard-shelled beetle that burrows through rotting ashwood.',
    },
    {
      id: 'ashwood_canopy_bat',
      name: 'Canopy Bat',
      weight: 15,
      uniqueDrops: ['canopy_bat_wing'],
      hpMultiplier: 1.15,
      description: 'Leathery-winged predator that hunts from the treetops.',
    },
  ],

  dustvein_hollow: [
    {
      id: 'dustvein_cave_lurker',
      name: 'Cave Lurker',
      weight: 50,
      uniqueDrops: ['cave_lurker_fang'],
      description: 'Pale arachnid that ambushes from the cave ceiling.',
    },
    {
      id: 'dustvein_dust_mite',
      name: 'Dust Mite',
      weight: 35,
      uniqueDrops: ['dust_mite_husk'],
      hpMultiplier: 0.9,
      description: 'Tiny vermin that swarm in suffocating clouds of dust.',
    },
    {
      id: 'dustvein_stoneback_crab',
      name: 'Stoneback Crab',
      weight: 15,
      uniqueDrops: ['stoneback_crab_carapace'],
      hpMultiplier: 1.15,
      description: 'A boulder-shelled crustacean dwelling in the deepest tunnels.',
    },
  ],

  stillwater_meadow: [
    {
      id: 'stillwater_meadow_stalker',
      name: 'Meadow Stalker',
      weight: 50,
      uniqueDrops: ['meadow_stalker_hide'],
      description: 'Lean predator that glides through the tall grass unseen.',
    },
    {
      id: 'stillwater_pollen_sprite',
      name: 'Pollen Sprite',
      weight: 35,
      uniqueDrops: ['pollen_sprite_dust'],
      hpMultiplier: 0.9,
      description: 'Shimmering fey creature born from wildflower nectar.',
    },
    {
      id: 'stillwater_meadow_boar',
      name: 'Meadow Boar',
      weight: 15,
      uniqueDrops: ['meadow_boar_tusk'],
      hpMultiplier: 1.15,
      description: 'Thick-hided boar that charges recklessly through the fields.',
    },
  ],

  mossback_creek: [
    {
      id: 'mossback_creek_snapper',
      name: 'Creek Snapper',
      weight: 50,
      uniqueDrops: ['creek_snapper_jaw'],
      description: 'Armoured turtle with a bite that can sever bone.',
    },
    {
      id: 'mossback_mud_leech',
      name: 'Mud Leech',
      weight: 35,
      uniqueDrops: ['mud_leech_gland'],
      hpMultiplier: 0.9,
      description: 'Bloated parasite that lurks in the creek shallows.',
    },
    {
      id: 'mossback_river_toad',
      name: 'River Toad',
      weight: 15,
      uniqueDrops: ['river_toad_toxin'],
      hpMultiplier: 1.15,
      description: 'Massive amphibian whose croak rattles the riverbed.',
    },
  ],

  thistlewood_grove: [
    {
      id: 'thistlewood_thornfang',
      name: 'Thornfang',
      weight: 50,
      uniqueDrops: ['thornfang_barb'],
      description: 'Canine beast with quill-like spines lining its back.',
    },
    {
      id: 'thistlewood_briar_imp',
      name: 'Briar Imp',
      weight: 35,
      uniqueDrops: ['briar_imp_claw'],
      hpMultiplier: 0.9,
      description: 'Mischievous creature that weaves traps from living thorns.',
    },
    {
      id: 'thistlewood_grove_guardian',
      name: 'Grove Guardian',
      weight: 15,
      uniqueDrops: ['grove_guardian_heartwood'],
      hpMultiplier: 1.15,
      description: 'Ancient treant that awakens when the grove is threatened.',
    },
  ],

  // ── Band 2: The Frontier ────────────────────────────────────

  ironcrest_ridge: [
    {
      id: 'ironcrest_ridge_prowler',
      name: 'Ridge Prowler',
      weight: 50,
      uniqueDrops: ['ridge_prowler_pelt'],
      description: 'Mountain cat that stalks the rocky crags at dusk.',
    },
    {
      id: 'ironcrest_iron_vulture',
      name: 'Iron Vulture',
      weight: 35,
      uniqueDrops: ['iron_vulture_talon'],
      hpMultiplier: 0.9,
      description: 'Steel-feathered scavenger with razor-edged wings.',
    },
    {
      id: 'ironcrest_crag_golem',
      name: 'Crag Golem',
      weight: 15,
      uniqueDrops: ['crag_golem_core'],
      hpMultiplier: 1.15,
      description: 'A walking pile of ore-veined boulders animated by latent magic.',
    },
  ],

  bogmire_marsh: [
    {
      id: 'bogmire_bog_horror',
      name: 'Bog Horror',
      weight: 50,
      uniqueDrops: ['bog_horror_mucus'],
      description: 'Amorphous mass of rotting vegetation and dark swamp water.',
    },
    {
      id: 'bogmire_marsh_fly',
      name: 'Marsh Fly',
      weight: 35,
      uniqueDrops: ['marsh_fly_proboscis'],
      hpMultiplier: 0.9,
      description: 'Oversized insect that drains blood with a barbed tongue.',
    },
    {
      id: 'bogmire_swamp_troll',
      name: 'Swamp Troll',
      weight: 15,
      uniqueDrops: ['swamp_troll_knuckle'],
      hpMultiplier: 1.15,
      description: 'Hulking brute that regenerates from the mire itself.',
    },
  ],

  windsworn_steppe: [
    {
      id: 'windsworn_steppe_raider',
      name: 'Steppe Raider',
      weight: 50,
      uniqueDrops: ['steppe_raider_token'],
      description: 'Nomadic marauder hardened by endless wind and war.',
    },
    {
      id: 'windsworn_dust_hawk',
      name: 'Dust Hawk',
      weight: 35,
      uniqueDrops: ['dust_hawk_plume'],
      hpMultiplier: 0.9,
      description: 'Raptor that rides the updrafts to strike with blinding speed.',
    },
    {
      id: 'windsworn_gale_bison',
      name: 'Gale Bison',
      weight: 15,
      uniqueDrops: ['gale_bison_horn'],
      hpMultiplier: 1.15,
      description: 'Enormous herd beast whose charge shakes the steppe.',
    },
  ],

  glintstone_caverns: [
    {
      id: 'glintstone_crystal_fiend',
      name: 'Crystal Fiend',
      weight: 50,
      uniqueDrops: ['crystal_fiend_shard'],
      description: 'Jagged elemental born from fractured crystal veins.',
    },
    {
      id: 'glintstone_shard_spider',
      name: 'Shard Spider',
      weight: 35,
      uniqueDrops: ['shard_spider_fang'],
      hpMultiplier: 0.9,
      description: 'Translucent arachnid with legs of living quartz.',
    },
    {
      id: 'glintstone_geode_worm',
      name: 'Geode Worm',
      weight: 15,
      uniqueDrops: ['geode_worm_segment'],
      hpMultiplier: 1.15,
      description: 'Burrowing annelid that leaves tunnels lined with gemstone.',
    },
  ],

  rothollow_thicket: [
    {
      id: 'rothollow_blighted_stalker',
      name: 'Blighted Stalker',
      weight: 50,
      uniqueDrops: ['blighted_stalker_eye'],
      description: 'Fungal-infested predator that sees through spore clouds.',
    },
    {
      id: 'rothollow_sporecap',
      name: 'Sporecap',
      weight: 35,
      uniqueDrops: ['sporecap_membrane'],
      hpMultiplier: 0.9,
      description: 'Ambulatory mushroom that releases toxic spore bursts.',
    },
    {
      id: 'rothollow_rot_bear',
      name: 'Rot Bear',
      weight: 15,
      uniqueDrops: ['rot_bear_claw'],
      hpMultiplier: 1.15,
      description: 'Massive ursine overgrown with parasitic moss and blight.',
    },
  ],

  // ── Band 3: Contested Lands ─────────────────────────────────

  emberpeak_caldera: [
    {
      id: 'emberpeak_magma_hound',
      name: 'Magma Hound',
      weight: 50,
      uniqueDrops: ['magma_hound_fang'],
      description: 'Canine wreathed in molten rock that prowls the lava flows.',
    },
    {
      id: 'emberpeak_cinder_imp',
      name: 'Cinder Imp',
      weight: 35,
      uniqueDrops: ['cinder_imp_ember'],
      hpMultiplier: 0.9,
      description: 'Diminutive fire sprite that hurls globs of magma.',
    },
    {
      id: 'emberpeak_obsidian_drake',
      name: 'Obsidian Drake',
      weight: 15,
      uniqueDrops: ['obsidian_drake_scale'],
      hpMultiplier: 1.15,
      description: 'Winged reptile armoured in cooled volcanic glass.',
    },
  ],

  silkveil_canopy: [
    {
      id: 'silkveil_silkweaver_spider',
      name: 'Silkweaver Spider',
      weight: 50,
      uniqueDrops: ['silkweaver_spinneret'],
      description: 'Enormous spider that weaves traps from near-invisible silk.',
    },
    {
      id: 'silkveil_canopy_viper',
      name: 'Canopy Viper',
      weight: 35,
      uniqueDrops: ['canopy_viper_venom'],
      hpMultiplier: 0.9,
      description: 'Arboreal serpent with camouflage that mirrors the leaves.',
    },
    {
      id: 'silkveil_web_matriarch',
      name: 'Web Matriarch',
      weight: 15,
      uniqueDrops: ['web_matriarch_egg'],
      hpMultiplier: 1.15,
      description: 'Ancient brood-mother whose web stretches between the tallest trees.',
    },
  ],

  frostmere_depths: [
    {
      id: 'frostmere_frost_wraith',
      name: 'Frost Wraith',
      weight: 50,
      uniqueDrops: ['frost_wraith_essence'],
      description: 'Spectral being of condensed cold that drains warmth from the living.',
    },
    {
      id: 'frostmere_ice_crawler',
      name: 'Ice Crawler',
      weight: 35,
      uniqueDrops: ['ice_crawler_mandible'],
      hpMultiplier: 0.9,
      description: 'Chitinous arthropod encased in a shell of perpetual frost.',
    },
    {
      id: 'frostmere_glacial_titan',
      name: 'Glacial Titan',
      weight: 15,
      uniqueDrops: ['glacial_titan_heart'],
      hpMultiplier: 1.15,
      description: 'Towering ice construct that reshapes itself with each blow.',
    },
  ],

  thornwall_basin: [
    {
      id: 'thornwall_brute',
      name: 'Thornwall Brute',
      weight: 50,
      uniqueDrops: ['thornwall_brute_tusk'],
      description: 'Thick-skinned beast covered in wooden barbs and thorny growths.',
    },
    {
      id: 'thornwall_vine_strangler',
      name: 'Vine Strangler',
      weight: 35,
      uniqueDrops: ['vine_strangler_tendril'],
      hpMultiplier: 0.9,
      description: 'Animate vine cluster that coils around prey with crushing force.',
    },
    {
      id: 'thornwall_ironhide_rhino',
      name: 'Ironhide Rhino',
      weight: 15,
      uniqueDrops: ['ironhide_rhino_horn'],
      hpMultiplier: 1.15,
      description: 'Rhinoceros whose hide has calcified into natural plate armour.',
    },
  ],

  shimmerfen_bog: [
    {
      id: 'shimmerfen_fen_lurcher',
      name: 'Fen Lurcher',
      weight: 50,
      uniqueDrops: ['fen_lurcher_tendril'],
      description: 'Shambling swamp creature that drags victims beneath the mire.',
    },
    {
      id: 'shimmerfen_will_o_wisp',
      name: "Will-o'-Wisp",
      weight: 35,
      uniqueDrops: ['wisp_lantern_glow'],
      hpMultiplier: 0.9,
      description: 'Deceptive light that lures travellers deeper into the bog.',
    },
    {
      id: 'shimmerfen_bog_hydra',
      name: 'Bog Hydra',
      weight: 15,
      uniqueDrops: ['bog_hydra_fang'],
      hpMultiplier: 1.15,
      description: 'Multi-headed reptile that regenerates lost heads from the swamp.',
    },
  ],

  // ── Band 4: Dark Reaches ────────────────────────────────────

  obsidian_forge: [
    {
      id: 'obsidian_forge_construct',
      name: 'Forge Construct',
      weight: 50,
      uniqueDrops: ['forge_construct_gear'],
      description: 'Mechanical automaton fuelled by a core of living obsidian.',
    },
    {
      id: 'obsidian_slag_elemental',
      name: 'Slag Elemental',
      weight: 35,
      uniqueDrops: ['slag_elemental_residue'],
      hpMultiplier: 0.9,
      description: 'Molten waste given form, seeping heat and toxic fumes.',
    },
    {
      id: 'obsidian_anvil_guardian',
      name: 'Anvil Guardian',
      weight: 15,
      uniqueDrops: ['anvil_guardian_plate'],
      hpMultiplier: 1.15,
      description: 'Sentinel forged from black iron to protect the ancient smithy.',
    },
  ],

  wraithwood: [
    {
      id: 'wraithwood_shadow_revenant',
      name: 'Shadow Revenant',
      weight: 50,
      uniqueDrops: ['shadow_revenant_wisp'],
      description: 'Undead shade bound to the twisted trees by lingering hatred.',
    },
    {
      id: 'wraithwood_grave_moth',
      name: 'Grave Moth',
      weight: 35,
      uniqueDrops: ['grave_moth_dust'],
      hpMultiplier: 0.9,
      description: 'Ghostly insect that feeds on the residual soul energy of the dead.',
    },
    {
      id: 'wraithwood_dread_treant',
      name: 'Dread Treant',
      weight: 15,
      uniqueDrops: ['dread_treant_heartknot'],
      hpMultiplier: 1.15,
      description: 'Corrupted tree spirit that walks on gnarled root-legs.',
    },
  ],

  venomspire_ruins: [
    {
      id: 'venomspire_cultist',
      name: 'Venomspire Cultist',
      weight: 50,
      uniqueDrops: ['cultist_venom_vial'],
      description: 'Fanatical devotee who weaponises distilled toxins.',
    },
    {
      id: 'venomspire_plague_rat',
      name: 'Plague Rat',
      weight: 35,
      uniqueDrops: ['plague_rat_tail'],
      hpMultiplier: 0.9,
      description: 'Disease-ridden rodent the size of a large dog.',
    },
    {
      id: 'venomspire_toxic_golem',
      name: 'Toxic Golem',
      weight: 15,
      uniqueDrops: ['toxic_golem_sludge'],
      hpMultiplier: 1.15,
      description: 'Alchemical construct oozing corrosive fluid from every joint.',
    },
  ],

  drowned_abyss: [
    {
      id: 'drowned_abyssal_terror',
      name: 'Abyssal Terror',
      weight: 50,
      uniqueDrops: ['abyssal_terror_tentacle'],
      description: 'Deep-sea horror with barbed tentacles and a gaping maw.',
    },
    {
      id: 'drowned_lantern_angler',
      name: 'Lantern Angler',
      weight: 35,
      uniqueDrops: ['lantern_angler_lure'],
      hpMultiplier: 0.9,
      description: 'Bioluminescent predator that dangles a false light to attract prey.',
    },
    {
      id: 'drowned_pressure_kraken',
      name: 'Pressure Kraken',
      weight: 15,
      uniqueDrops: ['pressure_kraken_beak'],
      hpMultiplier: 1.15,
      description: 'Colossal cephalopod adapted to crushing oceanic pressures.',
    },
  ],

  scorched_plateau: [
    {
      id: 'scorched_ashborn_ravager',
      name: 'Ashborn Ravager',
      weight: 50,
      uniqueDrops: ['ashborn_ravager_cinder'],
      description: 'Charred beast reborn from the embers of wildfire.',
    },
    {
      id: 'scorched_heat_viper',
      name: 'Heat Viper',
      weight: 35,
      uniqueDrops: ['heat_viper_scale'],
      hpMultiplier: 0.9,
      description: 'Serpent whose body radiates waves of searing heat.',
    },
    {
      id: 'scorched_ember_colossus',
      name: 'Ember Colossus',
      weight: 15,
      uniqueDrops: ['ember_colossus_core'],
      hpMultiplier: 1.15,
      description: 'Walking volcano that leaves trails of molten footprints.',
    },
  ],

  // ── Band 5: Shattered Realm ─────────────────────────────────

  celestine_spire: [
    {
      id: 'celestine_golem',
      name: 'Celestine Golem',
      weight: 50,
      uniqueDrops: ['celestine_golem_prism'],
      description: 'Construct of living crystal attuned to celestial frequencies.',
    },
    {
      id: 'celestine_starling',
      name: 'Celestine Starling',
      weight: 35,
      uniqueDrops: ['celestine_starling_feather'],
      hpMultiplier: 0.9,
      description: 'Luminous bird that nests among the spire crystal formations.',
    },
    {
      id: 'celestine_prism_sentinel',
      name: 'Prism Sentinel',
      weight: 15,
      uniqueDrops: ['prism_sentinel_lens'],
      hpMultiplier: 1.15,
      description: 'Ancient warden that refracts light into devastating beams.',
    },
  ],

  dreadmaw_caverns: [
    {
      id: 'dreadmaw_devourer',
      name: 'Dreadmaw Devourer',
      weight: 50,
      uniqueDrops: ['dreadmaw_devourer_tooth'],
      description: 'Massive worm with concentric rings of serrated teeth.',
    },
    {
      id: 'dreadmaw_tunnel_creeper',
      name: 'Tunnel Creeper',
      weight: 35,
      uniqueDrops: ['tunnel_creeper_silk'],
      hpMultiplier: 0.9,
      description: 'Multi-legged predator that scuttles silently through tight passages.',
    },
    {
      id: 'dreadmaw_gullet_behemoth',
      name: 'Gullet Behemoth',
      weight: 15,
      uniqueDrops: ['gullet_behemoth_bile'],
      hpMultiplier: 1.15,
      description: 'Bloated subterranean beast that dissolves prey in stomach acid.',
    },
  ],

  stormveil_heights: [
    {
      id: 'stormveil_storm_elemental',
      name: 'Storm Elemental',
      weight: 50,
      uniqueDrops: ['storm_elemental_spark'],
      description: 'Living vortex of wind and lightning raging atop the peaks.',
    },
    {
      id: 'stormveil_thunder_roc',
      name: 'Thunder Roc',
      weight: 35,
      uniqueDrops: ['thunder_roc_pinion'],
      hpMultiplier: 0.9,
      description: 'Enormous bird of prey that summons thunder with each wingbeat.',
    },
    {
      id: 'stormveil_gale_wraith',
      name: 'Gale Wraith',
      weight: 15,
      uniqueDrops: ['gale_wraith_essence'],
      hpMultiplier: 1.15,
      description: 'Spectral wind spirit that howls with the fury of a hurricane.',
    },
  ],

  hollow_throne: [
    {
      id: 'hollow_void_acolyte',
      name: 'Void Acolyte',
      weight: 50,
      uniqueDrops: ['void_acolyte_sigil'],
      description: 'Zealot who channels the emptiness between worlds.',
    },
    {
      id: 'hollow_null_shade',
      name: 'Null Shade',
      weight: 35,
      uniqueDrops: ['null_shade_fragment'],
      hpMultiplier: 0.9,
      description: 'Shadow cast by nothing, existing as pure absence.',
    },
    {
      id: 'hollow_ruined_knight',
      name: 'Ruined Knight',
      weight: 15,
      uniqueDrops: ['ruined_knight_crest'],
      hpMultiplier: 1.15,
      description: 'Armoured revenant still guarding a throne that no longer exists.',
    },
  ],

  ashenmaw_crater: [
    {
      id: 'ashenmaw_drake',
      name: 'Ashenmaw Drake',
      weight: 50,
      uniqueDrops: ['ashenmaw_drake_fang'],
      description: 'Fire-breathing wyrm that nests in the superheated crater.',
    },
    {
      id: 'ashenmaw_pyreling',
      name: 'Ashenmaw Pyreling',
      weight: 35,
      uniqueDrops: ['pyreling_ember_sac'],
      hpMultiplier: 0.9,
      description: 'Juvenile drake that spits volatile fireballs.',
    },
    {
      id: 'ashenmaw_magma_wyrm',
      name: 'Magma Wyrm',
      weight: 15,
      uniqueDrops: ['magma_wyrm_scale'],
      hpMultiplier: 1.15,
      description: 'Serpentine dragon that swims through rivers of liquid rock.',
    },
  ],

  // ── Band 6: The Endlands ────────────────────────────────────

  starfall_basin: [
    {
      id: 'starfall_starborn_aberration',
      name: 'Starborn Aberration',
      weight: 50,
      uniqueDrops: ['starborn_aberration_cortex'],
      description: 'Entity of alien geometry that fell from the heavens.',
    },
    {
      id: 'starfall_cosmic_parasite',
      name: 'Cosmic Parasite',
      weight: 35,
      uniqueDrops: ['cosmic_parasite_tendril'],
      hpMultiplier: 0.9,
      description: 'Extraplanar organism that feeds on ambient starlight.',
    },
    {
      id: 'starfall_nebula_hulk',
      name: 'Nebula Hulk',
      weight: 15,
      uniqueDrops: ['nebula_hulk_fragment'],
      hpMultiplier: 1.15,
      description: 'Enormous astral beast wreathed in clouds of ionised gas.',
    },
  ],

  consuming_dark: [
    {
      id: 'consuming_null_entity',
      name: 'Null Entity',
      weight: 50,
      uniqueDrops: ['null_entity_residue'],
      description: 'A wound in reality that consumes everything it touches.',
    },
    {
      id: 'consuming_void_mite',
      name: 'Void Mite',
      weight: 35,
      uniqueDrops: ['void_mite_husk'],
      hpMultiplier: 0.9,
      description: 'Swarming nothingness that erodes matter at the atomic level.',
    },
    {
      id: 'consuming_entropy_titan',
      name: 'Entropy Titan',
      weight: 15,
      uniqueDrops: ['entropy_titan_shard'],
      hpMultiplier: 1.15,
      description: 'Avatar of decay whose presence accelerates the heat death of all things.',
    },
  ],

  titans_graveyard: [
    {
      id: 'titans_bone_titan',
      name: 'Bone Titan',
      weight: 50,
      uniqueDrops: ['bone_titan_marrow'],
      description: 'Skeletal giant reassembled from the remains of a fallen god.',
    },
    {
      id: 'titans_marrow_worm',
      name: 'Marrow Worm',
      weight: 35,
      uniqueDrops: ['marrow_worm_secretion'],
      hpMultiplier: 0.9,
      description: 'Parasitic worm that burrows through fossilised titan bones.',
    },
    {
      id: 'titans_ossuary_sentinel',
      name: 'Ossuary Sentinel',
      weight: 15,
      uniqueDrops: ['ossuary_sentinel_skull'],
      hpMultiplier: 1.15,
      description: 'Guardian built from the fused bones of a thousand lesser creatures.',
    },
  ],

  eternal_storm: [
    {
      id: 'eternal_tempest_incarnate',
      name: 'Tempest Incarnate',
      weight: 50,
      uniqueDrops: ['tempest_incarnate_eye'],
      description: 'Living storm that has raged since before recorded history.',
    },
    {
      id: 'eternal_lightning_wraith',
      name: 'Lightning Wraith',
      weight: 35,
      uniqueDrops: ['lightning_wraith_arc'],
      hpMultiplier: 0.9,
      description: 'Spectral remnant of a mage struck down by the eternal storm.',
    },
    {
      id: 'eternal_thunder_colossus',
      name: 'Thunder Colossus',
      weight: 15,
      uniqueDrops: ['thunder_colossus_conduit'],
      hpMultiplier: 1.15,
      description: 'Titanic elemental whose footsteps create shockwaves of raw thunder.',
    },
  ],

  worlds_edge: [
    {
      id: 'worlds_edge_walker',
      name: 'Edge Walker',
      weight: 50,
      uniqueDrops: ['edge_walker_echo'],
      description: 'Being that exists at the boundary between existence and oblivion.',
    },
    {
      id: 'worlds_horizon_stalker',
      name: 'Horizon Stalker',
      weight: 35,
      uniqueDrops: ['horizon_stalker_lens'],
      hpMultiplier: 0.9,
      description: 'Predator that phases in and out of reality with each step.',
    },
    {
      id: 'worlds_terminus_guardian',
      name: 'Terminus Guardian',
      weight: 15,
      uniqueDrops: ['terminus_guardian_keystone'],
      hpMultiplier: 1.15,
      description: 'Final sentinel standing watch where the world simply ends.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Returns the mob types for a given zone, or an empty array if unknown. */
export function getZoneMobTypes(zoneId: string): MobTypeDef[] {
  return ZONE_MOB_TYPES[zoneId] ?? [];
}

/** Finds a single mob type definition by its globally unique ID. */
export function getMobTypeDef(mobTypeId: string): MobTypeDef | undefined {
  for (const mobs of Object.values(ZONE_MOB_TYPES)) {
    const found = mobs.find((m) => m.id === mobTypeId);
    if (found) return found;
  }
  return undefined;
}

/** Selects a random mob from the array using spawn weights. */
export function weightedRandomMob(mobs: MobTypeDef[]): MobTypeDef {
  const totalWeight = mobs.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const mob of mobs) {
    roll -= mob.weight;
    if (roll <= 0) return mob;
  }
  // Fallback (should not reach here if weights > 0)
  return mobs[mobs.length - 1];
}

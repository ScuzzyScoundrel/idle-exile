"""
Biome Kit Mapping — 30 zones → 8 biome kits
Each kit gets ONE header + ONE footer strip generated, then bg-removed.
Zones within a kit use CSS hue/brightness shifts for variation.
"""

BIOME_KITS = {
    "forest": {
        "zones": [
            "ashwood_thicket", "stillwater_meadow", "mossback_creek",
            "thistlewood_grove", "silkveil_canopy",
        ],
        "header_prompt": (
            "horizontal seamless banner, hanging jungle vines and branches from above, "
            "lush green leaves, dangling moss, tropical canopy edge, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, painted textures, "
            "isolated on solid black background, no ground, no sky"
        ),
        "footer_prompt": (
            "horizontal seamless banner, dense tropical foliage ground border, "
            "ferns mushrooms moss fallen logs, small flowers, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, painted textures, "
            "isolated on solid black background, no sky, no trees"
        ),
        "css_hue": 120,  # green base
    },
    "cave": {
        "zones": [
            "dustvein_hollow", "glintstone_caverns", "dreadmaw_caverns",
        ],
        "header_prompt": (
            "horizontal seamless banner, stalactites hanging from cave ceiling, "
            "dripping water, small crystal formations, rough stone, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, painted textures, "
            "isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, stalagmites and cave floor rocks, "
            "small crystal clusters, scattered pebbles, underground mushrooms, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, painted textures, "
            "isolated on solid black background"
        ),
        "css_hue": 30,  # earth/brown base
    },
    "swamp": {
        "zones": [
            "bogmire_marsh", "shimmerfen_bog", "rothollow_thicket",
        ],
        "header_prompt": (
            "horizontal seamless banner, gnarled swamp branches hanging down, "
            "spanish moss, dripping water, twisted roots from above, "
            "bioluminescent fungi, dark swamp atmosphere, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, swamp ground border with lily pads, "
            "murky water edge, mushrooms, twisted roots, bog plants, "
            "bioluminescent glow, 3D rendered game UI border, "
            "bottom-up perspective, dark fantasy RPG style, "
            "isolated on solid black background"
        ),
        "css_hue": 90,  # murky green-yellow
    },
    "mountain": {
        "zones": [
            "ironcrest_ridge", "windsworn_steppe", "thornwall_basin",
            "stormveil_heights",
        ],
        "header_prompt": (
            "horizontal seamless banner, rocky cliff edge hanging down, "
            "iron chains, mountain stone formations, wind-swept grass tufts, "
            "rough hewn stone border, 3D rendered game UI border, "
            "top-down perspective, dark fantasy RPG style, "
            "isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, rocky ground border, scattered boulders, "
            "iron ore veins, wind-blown grass, gravel and stone, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "css_hue": 210,  # slate blue
    },
    "volcanic": {
        "zones": [
            "emberpeak_caldera", "obsidian_forge", "scorched_plateau",
            "ashenmaw_crater",
        ],
        "header_prompt": (
            "horizontal seamless banner, volcanic rock hanging formations, "
            "dripping lava streams, obsidian shards, glowing embers, "
            "molten metal drips, scorched stone border, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, volcanic ground border, "
            "cooling lava flows, obsidian shards, ember particles, "
            "cracked molten earth, scorched rocks, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "css_hue": 15,  # red-orange
    },
    "ice": {
        "zones": [
            "frostmere_depths", "wraithwood", "drowned_abyss",
        ],
        "header_prompt": (
            "horizontal seamless banner, icicles hanging from frozen ceiling, "
            "frost crystals, frozen branches, ice formations, "
            "cold blue light, 3D rendered game UI border, "
            "top-down perspective, dark fantasy RPG style, "
            "isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, frozen ground border, "
            "ice shards, frost crystals, frozen water edge, "
            "snow-covered rocks, cold blue glow, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "css_hue": 200,  # ice blue
    },
    "crystal": {
        "zones": [
            "celestine_spire", "starfall_basin", "hollow_throne",
        ],
        "header_prompt": (
            "horizontal seamless banner, crystal formations hanging down, "
            "arcane runes glowing, ethereal energy wisps, "
            "amethyst and celestite crystals, magical sparkles, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, crystal ground border, "
            "glowing crystal clusters, arcane sigils, "
            "ethereal mist, star fragments, magical energy, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "css_hue": 270,  # purple/arcane
    },
    "void": {
        "zones": [
            "venomspire_ruins", "consuming_dark", "titans_graveyard",
            "eternal_storm", "worlds_edge",
        ],
        "header_prompt": (
            "horizontal seamless banner, dark tendrils hanging from above, "
            "ancient bone fragments, void energy wisps, "
            "crumbling dark stone, eldritch formations, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "footer_prompt": (
            "horizontal seamless banner, dark ground border, "
            "bone fragments, cracked ancient stone, void energy, "
            "dark tendrils rising, ruined pillars base, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, isolated on solid black background"
        ),
        "css_hue": 300,  # dark purple/void
    },
}

# Reverse lookup: zone_id → biome_kit
ZONE_TO_KIT = {}
for kit_name, kit in BIOME_KITS.items():
    for zone_id in kit["zones"]:
        ZONE_TO_KIT[zone_id] = kit_name

if __name__ == "__main__":
    print(f"Total biome kits: {len(BIOME_KITS)}")
    print(f"Total zones mapped: {len(ZONE_TO_KIT)}")
    for kit_name, kit in BIOME_KITS.items():
        print(f"  {kit_name}: {len(kit['zones'])} zones")

# Zone Frame Asset Generation Guide

## Quick Start

### 1. Generate images (ComfyUI, FLUX, or any tool)

Key settings:
- **Resolution**: 1024x256 (wide banner, short height)
- **Background**: Solid black (#000000) — NOT transparent
- **Negative prompt**: "white background, gradient background, sky, ground plane, full scene, landscape, horizon"

### 2. File naming convention
Place raw images in `public/images/zones/frames/raw/`:
```
forest_header.png
forest_footer.png
cave_header.png
cave_footer.png
swamp_header.png
swamp_footer.png
mountain_header.png
mountain_footer.png
volcanic_header.png
volcanic_footer.png
ice_header.png
ice_footer.png
crystal_header.png
crystal_footer.png
void_header.png
void_footer.png
```

### 3. Remove backgrounds
```bash
cd /home/jerris/idle-exile
tools/venv/bin/python tools/asset-pipeline/remove_bg.py
```

### 4. Convert to webp (optional, for production)
```bash
for f in public/images/zones/frames/processed/*.png; do
  cwebp -q 90 -alpha_q 90 "$f" -o "${f%.png}.webp"
done
```

## Prompts per Biome Kit

### Forest (header)
> horizontal seamless banner, hanging jungle vines and branches from above, lush green leaves, dangling moss, tropical canopy edge, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, painted textures, isolated on solid black background, no ground, no sky

### Forest (footer)
> horizontal seamless banner, dense tropical foliage ground border, ferns mushrooms moss fallen logs, small flowers, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, painted textures, isolated on solid black background, no sky, no trees

### Cave (header)
> horizontal seamless banner, stalactites hanging from cave ceiling, dripping water, small crystal formations, rough stone, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, painted textures, isolated on solid black background

### Cave (footer)
> horizontal seamless banner, stalagmites and cave floor rocks, small crystal clusters, scattered pebbles, underground mushrooms, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, painted textures, isolated on solid black background

### Swamp (header)
> horizontal seamless banner, gnarled swamp branches hanging down, spanish moss, dripping water, twisted roots from above, bioluminescent fungi, dark swamp atmosphere, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, isolated on solid black background

### Swamp (footer)
> horizontal seamless banner, swamp ground border with lily pads, murky water edge, mushrooms, twisted roots, bog plants, bioluminescent glow, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, isolated on solid black background

### Mountain (header)
> horizontal seamless banner, rocky cliff edge hanging down, iron chains, mountain stone formations, wind-swept grass tufts, rough hewn stone border, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, isolated on solid black background

### Mountain (footer)
> horizontal seamless banner, rocky ground border, scattered boulders, iron ore veins, wind-blown grass, gravel and stone, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, isolated on solid black background

### Volcanic (header)
> horizontal seamless banner, volcanic rock hanging formations, dripping lava streams, obsidian shards, glowing embers, molten metal drips, scorched stone border, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, isolated on solid black background

### Volcanic (footer)
> horizontal seamless banner, volcanic ground border, cooling lava flows, obsidian shards, ember particles, cracked molten earth, scorched rocks, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, isolated on solid black background

### Ice (header)
> horizontal seamless banner, icicles hanging from frozen ceiling, frost crystals, frozen branches, ice formations, cold blue light, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, isolated on solid black background

### Ice (footer)
> horizontal seamless banner, frozen ground border, ice shards, frost crystals, frozen water edge, snow-covered rocks, cold blue glow, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, isolated on solid black background

### Crystal (header)
> horizontal seamless banner, crystal formations hanging down, arcane runes glowing, ethereal energy wisps, amethyst and celestite crystals, magical sparkles, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, isolated on solid black background

### Crystal (footer)
> horizontal seamless banner, crystal ground border, glowing crystal clusters, arcane sigils, ethereal mist, star fragments, magical energy, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, isolated on solid black background

### Void (header)
> horizontal seamless banner, dark tendrils hanging from above, ancient bone fragments, void energy wisps, crumbling dark stone, eldritch formations, 3D rendered game UI border, top-down perspective, dark fantasy RPG style, isolated on solid black background

### Void (footer)
> horizontal seamless banner, dark ground border, bone fragments, cracked ancient stone, void energy, dark tendrils rising, ruined pillars base, 3D rendered game UI border, bottom-up perspective, dark fantasy RPG style, isolated on solid black background

## Zone → Biome Kit Mapping

| Biome Kit | Zones |
|-----------|-------|
| forest | ashwood_thicket, stillwater_meadow, mossback_creek, thistlewood_grove, silkveil_canopy |
| cave | dustvein_hollow, glintstone_caverns, dreadmaw_caverns |
| swamp | bogmire_marsh, shimmerfen_bog, rothollow_thicket |
| mountain | ironcrest_ridge, windsworn_steppe, thornwall_basin, stormveil_heights |
| volcanic | emberpeak_caldera, obsidian_forge, scorched_plateau, ashenmaw_crater |
| ice | frostmere_depths, wraithwood, drowned_abyss |
| crystal | celestine_spire, starfall_basin, hollow_throne |
| void | venomspire_ruins, consuming_dark, titans_graveyard, eternal_storm, worlds_edge |

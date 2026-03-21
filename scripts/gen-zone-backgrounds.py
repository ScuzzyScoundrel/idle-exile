"""Generate a unique background scene for each of the 30 zones via ComfyUI."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/backgrounds"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "people, characters, faces, hands, text, letters, UI, HUD, realistic photo, blurry, low quality, watermark"

ZONES = [
    # Band 1 — The Greenlands
    ("ashwood_thicket",    "gentle sunlit ash tree forest clearing, dappled golden light through canopy, fallen logs covered in moss, wildflowers, peaceful woodland atmosphere"),
    ("dustvein_hollow",    "dusty cave entrance with mineral veins glowing faintly in rock walls, dim warm light filtering in, scattered stones and dust motes in air"),
    ("stillwater_meadow",  "wide open rolling meadow at golden hour, tall grass swaying, distant treeline, scattered wildflowers, calm serene pastoral landscape"),
    ("mossback_creek",     "mossy forest stream with stepping stones, clear water over pebbles, overhanging ferns and ancient trees, soft green light"),
    ("thistlewood_grove",  "dense dark thicket of thorny trees, twisted branches overhead, shafts of light breaking through, mysterious overgrown woodland"),

    # Band 2 — The Frontier
    ("ironcrest_ridge",    "rocky highland ridge at dawn, exposed iron ore veins in cliff face, sparse tough vegetation, cold mountain air, dramatic sky"),
    ("bogmire_marsh",      "fetid dark swampland with twisted dead trees, murky green water, wisps of fog, poisonous mushrooms glowing faintly, oppressive atmosphere"),
    ("windsworn_steppe",   "vast windswept grassland plains under stormy gray sky, bent grass, distant dust clouds, lone standing stones, harsh frontier landscape"),
    ("glintstone_caverns", "underground crystal cavern with sparkling mineral formations, pale blue and white glinting crystals, stalactites, ethereal underground beauty"),
    ("rothollow_thicket",  "decaying blighted forest, blackened tree trunks, fungal growths, sickly yellow-green mist, fallen rotting logs, corrupted woodland"),

    # Band 3 — Contested Lands
    ("emberpeak_caldera",  "volcanic caldera crater with rivers of molten lava, black volcanic rock, orange glow reflecting on smoke clouds, intense heat haze"),
    ("silkveil_canopy",    "enormous spider web-covered forest canopy high above ground, silk strands catching light, massive ancient trees, eerie misty treetop landscape"),
    ("frostmere_depths",   "frozen underground lake cavern, massive ice formations, blue-white crystalline ice walls, frozen waterfalls, cold ethereal light"),
    ("thornwall_basin",    "deep ravine choked with massive thorny vines, dark rocky walls, scattered bones, ominous red-tinged light from above"),
    ("shimmerfen_bog",     "luminescent swamp at night, bioluminescent plants glowing blue and green, toxic bubbling pools, eerie beautiful wetland"),

    # Band 4 — Dark Reaches
    ("obsidian_forge",     "massive ancient dark forge interior, molten metal in channels, obsidian walls, anvils and chains, orange firelight against black stone"),
    ("wraithwood",         "ghostly haunted dead forest in perpetual twilight frost, spectral mist between bare white trees, cold blue moonlight, haunting atmosphere"),
    ("venomspire_ruins",   "collapsed ancient temple overgrown with poisonous vines, dripping green liquid, crumbling stone pillars, dark purple toxic haze"),
    ("drowned_abyss",      "vast submerged cavern with dark water, underwater ruins visible below surface, bioluminescent deep sea creatures, crushing depth atmosphere"),
    ("scorched_plateau",   "sun-blasted barren wasteland plateau, cracked earth, heat shimmer, bleached bones, distant volcanic mountains, merciless burning sky"),

    # Band 5 — Shattered Realm
    ("celestine_spire",    "massive crystalline tower piercing through clouds, floating crystal shards, prismatic light refracting everywhere, otherworldly vertical landscape"),
    ("dreadmaw_caverns",   "organic living cave with fleshy walls and teeth-like stalactites, pulsing veins in rock, bioluminescent slime, horrifying organic cavern"),
    ("stormveil_heights",  "mountain peak in perpetual lightning storm, dark purple clouds crackling with electricity, wind-torn rocks, dramatic thunderstorm landscape"),
    ("hollow_throne",      "ruined throne room of a dead god, massive crumbling stone throne, void energy swirling, broken pillars, cosmic darkness beyond walls"),
    ("ashenmaw_crater",    "enormous smoldering hellpit crater, rivers of fire, black ash falling like snow, red sky, demonic volcanic wasteland"),

    # Band 6 — The Endlands
    ("starfall_basin",     "massive impact crater from a fallen star, glowing meteorite fragments scattered, strange alien crystalline growths, aurora in dark sky"),
    ("consuming_dark",     "pure void darkness made physical, floating rock fragments in absolute black, faint distant stars, reality dissolving at edges, cosmic horror"),
    ("titans_graveyard",   "landscape of enormous ancient giant bones and skulls half-buried in earth, ribcages forming arches, desolate gray wasteland, somber atmosphere"),
    ("eternal_storm",      "impossible eternal storm vortex filling entire sky, lightning in every direction, wind-shattered landscape below, apocalyptic weather phenomenon"),
    ("worlds_edge",        "the literal edge of the world, land crumbling into infinite void below, last twisted dead tree, fading reality, stars visible in the abyss beyond"),
]

def make_workflow(zone_id, scene_prompt, seed):
    full_prompt = f"{scene_prompt}, fantasy RPG concept art, hand-painted style, wide angle establishing shot, atmospheric moody lighting, no people no characters"
    return {
        "3": {"class_type": "KSampler", "inputs": {
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
            "latent_image": ["5", 0], "seed": seed,
            "steps": 8, "cfg": 2.5, "sampler_name": "euler_ancestral",
            "scheduler": "normal", "denoise": 1.0}},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 1344, "height": 768, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": full_prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"zone_{zone_id}"}},
    }

def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFY}/prompt", data=data, headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())["prompt_id"]

def wait_for_prompt(prompt_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        history = json.loads(urllib.request.urlopen(f"{COMFY}/history/{prompt_id}").read())
        if prompt_id in history: return history[prompt_id]
        time.sleep(2)
    raise TimeoutError(f"Timeout: {prompt_id}")

def get_image(filename, subfolder=""):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    return urllib.request.urlopen(f"{COMFY}/view?{params}").read()

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for i, (zone_id, scene_prompt) in enumerate(ZONES):
        seed = 2000 + i
        out_path = os.path.join(OUTPUT_DIR, f"{zone_id}.png")
        if os.path.exists(out_path):
            print(f"[{i+1}/30] {zone_id} — already exists, skipping", flush=True)
            continue
        print(f"[{i+1}/30] {zone_id}...", flush=True)
        prompt_id = queue_prompt(make_workflow(zone_id, scene_prompt, seed))
        result = wait_for_prompt(prompt_id)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved ({len(img_data)//1024}KB)", flush=True)
    print("\nAll 30 zone backgrounds generated!", flush=True)

if __name__ == "__main__":
    main()

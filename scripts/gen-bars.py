"""Generate panoramic bar textures per material — wide single images, not tiling."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/textures/bars"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "text, letters, symbols, people, faces, realistic photo, blurry, bright white, tiling, repeating pattern"

# Each material gets a top bar and bottom bar
BARS = {
    # WARM WOOD
    "warm-wood-top": {
        "prompt": "horizontal dark oak wooden beam with iron rivets and gold trim, ornate fantasy RPG game UI top header bar, iron brackets at edges, warm candlelit wood grain, hand-painted game art style, wide panoramic, black background above and below",
        "seed": 9001,
    },
    "warm-wood-bottom": {
        "prompt": "horizontal dark oak wooden shelf with iron brackets, small scattered coins and a candle, fantasy RPG game UI bottom navigation bar, warm wood grain detail, hand-painted game art style, wide panoramic, black background",
        "seed": 9002,
    },
    # SCORCHED STONE
    "scorched-stone-top": {
        "prompt": "horizontal scorched volcanic basalt beam with glowing orange lava cracks and embers, dark charred stone with molten veins, fantasy RPG game UI header bar, hand-painted game art, wide panoramic, black background above and below",
        "seed": 9011,
    },
    "scorched-stone-bottom": {
        "prompt": "horizontal dark scorched stone ledge with small embers and cooling lava drips hanging from edge, volcanic fantasy RPG game UI bar, hand-painted game art, wide panoramic, black background",
        "seed": 9012,
    },
    # FROZEN ICE
    "frozen-ice-top": {
        "prompt": "horizontal frozen ice beam with long icicles hanging down from bottom edge, frosted blue-white crystalline ice bar, frost patterns, fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9021,
    },
    "frozen-ice-bottom": {
        "prompt": "horizontal frozen ice shelf with frost crystals growing upward from top edge, frozen blue-white ice bar with snowflakes, fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9022,
    },
    # MOSSY STONE
    "mossy-stone-top": {
        "prompt": "horizontal ancient weathered stone beam with moss and small ferns growing along bottom edge, vines hanging down, green-gray mossy stone bar, fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9031,
    },
    "mossy-stone-bottom": {
        "prompt": "horizontal mossy stone shelf with small mushrooms and moss patches growing upward from top edge, roots and tiny plants, fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9032,
    },
    # COLD IRON
    "cold-iron-top": {
        "prompt": "horizontal dark hammered iron plate header bar with rivets and bolts along edges, steel blue-gray metal with forge marks, industrial fantasy RPG game UI, hand-painted game art, wide panoramic, black background",
        "seed": 9041,
    },
    "cold-iron-bottom": {
        "prompt": "horizontal dark iron grate shelf with rivets, scratched steel surface, chains hanging from brackets, industrial fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9042,
    },
    # DARK OBSIDIAN
    "dark-obsidian-top": {
        "prompt": "horizontal polished black obsidian beam with faint purple void energy veins glowing, dark crystalline glass surface, fantasy RPG game UI header bar, hand-painted game art, wide panoramic, black background",
        "seed": 9051,
    },
    "dark-obsidian-bottom": {
        "prompt": "horizontal dark obsidian shelf with purple void energy wisps rising from surface, black glass with violet cracks, fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9052,
    },
    # CRYSTAL VOID
    "crystal-void-top": {
        "prompt": "horizontal dark stone beam with glowing blue crystals embedded and growing downward from bottom edge, electric blue crystal formations, fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9061,
    },
    "crystal-void-bottom": {
        "prompt": "horizontal dark stone shelf with glowing blue crystals growing upward from top edge, electric blue crystal clusters, fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9062,
    },
    # BONE ASH
    "bone-ash-top": {
        "prompt": "horizontal pale bone and ancient skull beam, bleached white bones fused together forming a bar, cracks and ash, desolate fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9071,
    },
    "bone-ash-bottom": {
        "prompt": "horizontal pale bone shelf with small scattered bone fragments and ash, ancient remains forming a ledge, desolate fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9072,
    },
    # BLIGHT BARK
    "blight-bark-top": {
        "prompt": "horizontal dark decaying tree branch beam with sickly yellow-green fungal growths, twisted corrupted bark, dripping dark sap, blighted fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9081,
    },
    "blight-bark-bottom": {
        "prompt": "horizontal dark rotting wood shelf with toxic mushrooms and corrupted vines growing upward, blighted decay, fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9082,
    },
    # TOXIC STONE
    "toxic-stone-top": {
        "prompt": "horizontal dark corroded stone beam with dripping green toxic liquid, poison-stained pitted stone, acid-eaten edges, toxic fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9091,
    },
    "toxic-stone-bottom": {
        "prompt": "horizontal dark stone shelf with green toxic pools and bubbling poison puddles on surface, corroded acid-stained stone, fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9092,
    },
    # SPIDER SILK
    "spider-silk-top": {
        "prompt": "horizontal dark wood beam covered in thick spider web strands hanging down, silk cocoons and web patterns, eerie purple-gray, fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9101,
    },
    "spider-silk-bottom": {
        "prompt": "horizontal dark stone shelf with spider webs stretching upward, silk strands and small wrapped prey, eerie spider web fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9102,
    },
    # DEEP WATER
    "deep-water-top": {
        "prompt": "horizontal dark underwater rock beam with barnacles and seaweed hanging down, deep ocean blue-black, faint bioluminescent glow, abyssal fantasy RPG game UI header, hand-painted game art, wide panoramic, black background",
        "seed": 9111,
    },
    "deep-water-bottom": {
        "prompt": "horizontal dark underwater rock shelf with coral and anemones growing upward, deep sea creatures, bioluminescent glow, abyssal fantasy RPG game UI bottom bar, hand-painted game art, wide panoramic, black background",
        "seed": 9112,
    },
}

def make_workflow(name, cfg):
    return {
        "3": {"class_type": "KSampler", "inputs": {
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
            "latent_image": ["5", 0], "seed": cfg["seed"],
            "steps": 8, "cfg": 2.5, "sampler_name": "euler_ancestral",
            "scheduler": "normal", "denoise": 1.0}},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 1344, "height": 192, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"bar_{name}"}},
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
    total = len(BARS)
    for i, (name, cfg) in enumerate(BARS.items()):
        out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
        if os.path.exists(out_path):
            print(f"[{i+1}/{total}] {name} — exists, skip", flush=True)
            continue
        print(f"[{i+1}/{total}] {name}...", flush=True)
        prompt_id = queue_prompt(make_workflow(name, cfg))
        result = wait_for_prompt(prompt_id)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved ({len(img_data)//1024}KB)", flush=True)
    print(f"\nAll {total} bar textures generated!", flush=True)

if __name__ == "__main__":
    main()

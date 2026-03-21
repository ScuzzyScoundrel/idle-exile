#!/usr/bin/env /home/jerris/comfyui/venv/bin/python
"""Generate foreground scene layers — parallax closest layer with organic edges.
These are the FOREGROUND of the same painting as the zone backgrounds."""
import json, urllib.request, urllib.parse, time, os, sys
sys.path.insert(0, '/home/jerris/comfyui/venv/lib/python3.12/site-packages')
from PIL import Image
import numpy as np

COMFY = "http://127.0.0.1:8188"
RAW_DIR = "/home/jerris/idle-exile/public/images/foreground/raw"
OUT_DIR = "/home/jerris/idle-exile/public/images/foreground"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "text, letters, symbols, people, faces, realistic photo, blurry, UI elements, frame, border, rectangle, contained, flat"

# TOP layers: foreground elements at the TOP of the scene, hanging/draping downward
# BOTTOM layers: foreground elements at the BOTTOM, growing/reaching upward
LAYERS = {
    "warm-wood-top": {
        "prompt": "lush green jungle canopy foreground layer, thick tropical vines hanging down with large leaves, tree branches reaching in from sides, dappled sunlight filtering through, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20001,
    },
    "warm-wood-bottom": {
        "prompt": "forest floor foreground layer, mossy fallen logs, ferns, wildflowers, small mushrooms, tree roots reaching upward, fallen leaves scattered, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20002,
    },
    "mossy-stone-top": {
        "prompt": "cave entrance foreground layer looking inward, rocky stalactites and mossy stone arch overhead, hanging moss and dripping water, ferns growing from cracks, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20003,
    },
    "mossy-stone-bottom": {
        "prompt": "cave floor foreground layer, wet mossy rocks, small pools of water reflecting light, stalagmites growing upward, pebbles and cave moss, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20004,
    },
    "cold-iron-top": {
        "prompt": "fortress interior foreground layer, dark iron beams and stone archway overhead, hanging chains, metal brackets and rivets, cold stone ceiling with frost, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20005,
    },
    "cold-iron-bottom": {
        "prompt": "fortress floor foreground layer, dark stone flagstones, scattered metal debris, iron grating, frost on ground edges, cold blue light on stone floor, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20006,
    },
    "scorched-stone-top": {
        "prompt": "volcanic cave entrance foreground layer looking inward, jagged dark basalt rock arch overhead with bright orange molten lava dripping down, glowing embers, smoke and heat haze rising, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20007,
    },
    "scorched-stone-bottom": {
        "prompt": "volcanic floor foreground layer, cracked dark basalt ground with bright glowing lava flowing in cracks, rising embers and small flames, scorched black rock edges, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20008,
    },
    "frozen-ice-top": {
        "prompt": "ice cave entrance foreground layer looking inward, massive crystalline icicles hanging down from frozen rock ceiling, jagged ice formations, frost crystals catching blue light, frozen stalactites, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20009,
    },
    "frozen-ice-bottom": {
        "prompt": "frozen cave floor foreground layer, sharp ice crystal formations growing upward, frozen ground with frost patterns, ice shards and snow drifts at edges, blue crystalline glow, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20010,
    },
    "dark-obsidian-top": {
        "prompt": "void cavern entrance foreground layer looking inward, black obsidian rock arch with glowing purple energy veins pulsing through cracks, dark crystalline shards hanging down, ethereal purple mist, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20011,
    },
    "dark-obsidian-bottom": {
        "prompt": "void cavern floor foreground layer, black obsidian ground with glowing purple void cracks, dark crystal formations growing upward, purple energy wisps rising, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20012,
    },
    "crystal-void-top": {
        "prompt": "crystal cavern entrance foreground layer looking inward, massive glowing blue crystal formations hanging from dark stone ceiling, luminous crystal clusters, electric blue light, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20013,
    },
    "crystal-void-bottom": {
        "prompt": "crystal cavern floor foreground layer, glowing blue crystals growing upward from dark stone ground, crystal clusters and shards, electric blue luminescence, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20014,
    },
    "bone-ash-top": {
        "prompt": "bone graveyard foreground layer overhead, massive ancient ribcage bones arching overhead forming a canopy, hanging bone fragments, pale skull, bleached white against dark sky, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20015,
    },
    "bone-ash-bottom": {
        "prompt": "bone graveyard floor foreground layer, scattered ancient bones and skulls on ashy ground, partially buried ribcage, pale bone fragments reaching upward, gray ash, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20016,
    },
    "blight-bark-top": {
        "prompt": "corrupted dead forest foreground layer overhead, twisted gnarled dark branches reaching down with sickly yellow-green glowing fungal growths, toxic mushrooms on branches, dripping dark sap, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20017,
    },
    "blight-bark-bottom": {
        "prompt": "corrupted forest floor foreground layer, rotting roots and corrupted plants, toxic glowing mushrooms growing upward, dark fungal growths, sickly green puddles, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20018,
    },
    "toxic-stone-top": {
        "prompt": "toxic ruins foreground layer overhead, corroded stone arch dripping bright green toxic liquid, acid-eaten crumbling edges, poison drips falling, green toxic mist, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20019,
    },
    "toxic-stone-bottom": {
        "prompt": "toxic ruins floor foreground layer, dark corroded stone ground with bubbling green toxic pools, rising poison vapor, acid-stained rocks at edges, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20020,
    },
    "spider-silk-top": {
        "prompt": "spider lair foreground layer overhead, thick web strands and silk curtains hanging down from dark canopy, silk cocoons suspended in webs, web patterns catching faint light, eerie purple-gray, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20021,
    },
    "spider-silk-bottom": {
        "prompt": "spider lair floor foreground layer, web-covered dark ground, silk strands stretching upward, small web clusters, dead leaves caught in webs at edges, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20022,
    },
    "deep-water-top": {
        "prompt": "underwater cave entrance foreground layer looking inward, dark rock arch with hanging seaweed kelp and barnacles, jellyfish drifting past, bioluminescent glow, water caustics, the lower 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20023,
    },
    "deep-water-bottom": {
        "prompt": "underwater cave floor foreground layer, dark seafloor with colorful coral growing upward, sea anemones, bioluminescent creatures, kelp reaching up from edges, bubbles rising, the upper 65 percent is completely solid black, fantasy RPG concept art, hand-painted style, wide panoramic composition",
        "seed": 20024,
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
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 1344, "height": 768, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"fg_{name}"}},
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


def black_to_alpha(input_path, output_path):
    """Hard threshold: dark = transparent, art = fully opaque with boosted color."""
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    lum = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]
    # Hard ramp: below 20=transparent, 20-50=ramp, above 50=fully opaque
    alpha = np.clip((lum - 20) / 30 * 255, 0, 255).astype(np.uint8)
    # Boost RGB so art is vivid
    for c in range(3):
        channel = arr[:,:,c]
        mask = alpha > 30
        if mask.any():
            max_val = np.percentile(channel[mask], 97)
            if max_val > 40:
                boost = min(255 / max_val, 2.0)
                arr[:,:,c] = np.clip(channel * boost, 0, 255)
    arr[:,:,3] = alpha
    Image.fromarray(arr.astype(np.uint8)).save(output_path, "PNG")


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    total = len(LAYERS)

    for i, (name, cfg) in enumerate(LAYERS.items()):
        raw_path = os.path.join(RAW_DIR, f"{name}.png")
        out_path = os.path.join(OUT_DIR, f"{name}.png")
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
                    with open(raw_path, "wb") as f:
                        f.write(img_data)

        black_to_alpha(raw_path, out_path)
        size_kb = os.path.getsize(out_path) // 1024
        print(f"  Saved ({size_kb}KB)", flush=True)

    print(f"\nAll {total} foreground layers generated!", flush=True)


if __name__ == "__main__":
    main()

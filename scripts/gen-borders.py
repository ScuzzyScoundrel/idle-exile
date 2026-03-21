#!/usr/bin/env /home/jerris/comfyui/venv/bin/python
"""Generate transparent top/bottom border strips per material.
Step 1: Generate on black background via ComfyUI
Step 2: Convert dark pixels to alpha using Pillow
"""
import json, urllib.request, urllib.parse, time, os, sys
sys.path.insert(0, '/home/jerris/comfyui/venv/lib/python3.12/site-packages')
from PIL import Image
import numpy as np

COMFY = "http://127.0.0.1:8188"
RAW_DIR = "/home/jerris/idle-exile/public/images/borders/raw"
OUT_DIR = "/home/jerris/idle-exile/public/images/borders"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "text, letters, symbols, people, faces, realistic photo, blurry, tiling, repeating, content in middle, objects in center area"

BORDERS = {
    # TOP borders — things hanging DOWN from top edge, rest is black
    "warm-wood-top": {
        "prompt": "dark oak tree branches with green leaves and hanging vines drooping down from the very top edge only, wooden beam across top with ivy, the bottom 70 percent of image is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12001,
    },
    "mossy-stone-top": {
        "prompt": "ancient stone arch across very top edge with hanging moss ferns and dripping water, roots and vines dangling down, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12002,
    },
    "cold-iron-top": {
        "prompt": "dark industrial iron girder beam across very top edge with hanging chains and bolts, scratched metal, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12003,
    },
    "scorched-stone-top": {
        "prompt": "scorched volcanic rock ledge across very top edge with dripping molten lava and embers falling down, glowing orange cracks, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12004,
    },
    "frozen-ice-top": {
        "prompt": "massive icicles and frozen ice formations hanging down from very top edge, jagged ice crystals and frost, blue-white glacial ice, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12005,
    },
    "dark-obsidian-top": {
        "prompt": "black obsidian rock formation across very top edge with glowing purple void energy cracks and wisps trailing down, dark crystalline, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12006,
    },
    "crystal-void-top": {
        "prompt": "dark stone ledge across very top edge with glowing blue crystal formations hanging down, electric blue luminous crystals, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12007,
    },
    "bone-ash-top": {
        "prompt": "ancient bleached bone arch across very top edge with hanging bone fragments and skull pieces, pale white bones, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12008,
    },
    "blight-bark-top": {
        "prompt": "twisted corrupted dark tree branches across very top edge with toxic yellow-green mushrooms and dripping dark sap hanging down, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12009,
    },
    "toxic-stone-top": {
        "prompt": "corroded dark stone ledge across very top edge with dripping bright green toxic liquid and acid drops falling, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12010,
    },
    "spider-silk-top": {
        "prompt": "thick spider web strands and silk hanging down from very top edge, web curtains and small cocoons dangling, purple-gray, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12011,
    },
    "deep-water-top": {
        "prompt": "underwater dark rock ceiling across very top edge with hanging seaweed kelp and barnacles dangling down, bioluminescent glow, the bottom 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12012,
    },
    # BOTTOM borders — things growing UP from bottom edge
    "warm-wood-bottom": {
        "prompt": "forest floor with small mushrooms ferns and mossy roots growing upward from very bottom edge, fallen leaves, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12101,
    },
    "mossy-stone-bottom": {
        "prompt": "mossy ground with small plants mushrooms and rocks along very bottom edge, puddles and pebbles, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12102,
    },
    "cold-iron-bottom": {
        "prompt": "dark iron grate floor along very bottom edge with sparks and metal debris, riveted steel plates, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12103,
    },
    "scorched-stone-bottom": {
        "prompt": "volcanic floor along very bottom edge with pooling lava cracks and rising embers and small flames, scorched basalt, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12104,
    },
    "frozen-ice-bottom": {
        "prompt": "frozen ice crystal formations growing upward from very bottom edge, frost spikes and ice shards pointing up, blue-white, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12105,
    },
    "dark-obsidian-bottom": {
        "prompt": "black obsidian floor along very bottom edge with purple void energy wisps rising upward, dark crystalline shards, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12106,
    },
    "crystal-void-bottom": {
        "prompt": "dark stone floor along very bottom edge with glowing blue crystals growing upward, luminous crystal clusters, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12107,
    },
    "bone-ash-bottom": {
        "prompt": "ground of scattered bones and pale ash along very bottom edge, small skull fragments and bone shards, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12108,
    },
    "blight-bark-bottom": {
        "prompt": "corrupted forest floor along very bottom edge with toxic mushrooms and rotting roots growing upward, green fungal glow, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12109,
    },
    "toxic-stone-bottom": {
        "prompt": "corroded stone floor along very bottom edge with bubbling green toxic pools and rising poison mist, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12110,
    },
    "spider-silk-bottom": {
        "prompt": "spider web covered ground along very bottom edge with silk strands stretching upward and small spiders, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12111,
    },
    "deep-water-bottom": {
        "prompt": "underwater floor along very bottom edge with coral anemones and bioluminescent sea life growing upward, deep blue, the top 70 percent is completely pure black empty space, fantasy RPG hand-painted style, wide panoramic",
        "seed": 12112,
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
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 1344, "height": 384, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"border_{name}"}},
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


def black_to_alpha(input_path, output_path, threshold=40):
    """Convert dark pixels to transparent. Brighter pixels get more opacity."""
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    # Luminance of RGB channels
    lum = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]
    # Map luminance to alpha: dark=0 (transparent), bright=255 (opaque)
    # Smooth ramp from threshold to 255
    alpha = np.clip((lum - threshold) / (255 - threshold) * 255, 0, 255).astype(np.uint8)
    arr[:,:,3] = alpha
    result = Image.fromarray(arr.astype(np.uint8))
    result.save(output_path, "PNG")


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    total = len(BORDERS)
    for i, (name, cfg) in enumerate(BORDERS.items()):
        raw_path = os.path.join(RAW_DIR, f"{name}.png")
        out_path = os.path.join(OUT_DIR, f"{name}.png")

        if os.path.exists(out_path):
            print(f"[{i+1}/{total}] {name} — exists, skip", flush=True)
            continue

        # Step 1: Generate
        print(f"[{i+1}/{total}] {name} — generating...", flush=True)
        prompt_id = queue_prompt(make_workflow(name, cfg))
        result = wait_for_prompt(prompt_id)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    with open(raw_path, "wb") as f:
                        f.write(img_data)

        # Step 2: Convert black to alpha
        print(f"  Converting to transparent...", flush=True)
        black_to_alpha(raw_path, out_path, threshold=30)
        final_size = os.path.getsize(out_path) // 1024
        print(f"  Saved ({final_size}KB)", flush=True)

    print(f"\nAll {total} transparent borders generated!", flush=True)


if __name__ == "__main__":
    main()

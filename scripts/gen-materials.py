"""Generate tileable material textures per zone type via ComfyUI."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/textures/materials"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "text, letters, symbols, people, faces, objects, weapons, bright, white, realistic photo, blurry, 3d render, uneven lighting, perspective"

MATERIALS = {
    "warm-wood": {
        "prompt": "seamless tileable dark polished oak wood plank surface texture, warm brown tones, visible wood grain pattern, fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8001,
    },
    "mossy-stone": {
        "prompt": "seamless tileable weathered stone surface with patches of green moss growing in cracks, gray-green fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8002,
    },
    "cold-iron": {
        "prompt": "seamless tileable dark hammered iron metal plate surface texture, brushed steel with subtle dents and forge marks, cool blue-gray tones, fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8003,
    },
    "scorched-stone": {
        "prompt": "seamless tileable dark scorched volcanic basalt stone surface texture, hairline cracks glowing faint orange ember, charred black and deep red, fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8004,
    },
    "spider-silk": {
        "prompt": "seamless tileable dark surface covered in fine spider silk web strands, purple-gray tones, delicate web pattern over dark stone, fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8005,
    },
    "frozen-ice": {
        "prompt": "seamless tileable frozen ice crystal surface texture, translucent blue-white frost patterns, crystalline structure visible, cold fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8006,
    },
    "dark-obsidian": {
        "prompt": "seamless tileable polished black obsidian volcanic glass surface texture, faint purple veins of energy running through it, very dark fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8007,
    },
    "toxic-stone": {
        "prompt": "seamless tileable dark stone surface with dripping green toxic residue and poison stains, corroded and pitted, fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8008,
    },
    "crystal-void": {
        "prompt": "seamless tileable dark crystalline surface with glowing indigo and electric blue crystal formations embedded in black stone, fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8009,
    },
    "bone-ash": {
        "prompt": "seamless tileable ancient bone and pale ash surface texture, bleached white fragments mixed with gray ash and dust, desolate fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8010,
    },
    "blight-bark": {
        "prompt": "seamless tileable dark decaying tree bark surface texture, blackened wood with sickly yellow-green fungal growths, corrupted fantasy RPG game panel material, hand-painted style, flat top-down perspective, even soft lighting",
        "seed": 8011,
    },
    "deep-water": {
        "prompt": "seamless tileable dark deep water surface seen from below, dark blue-black with faint caustic light patterns, abyssal fantasy RPG game panel material, hand-painted style, flat perspective, even soft lighting",
        "seed": 8012,
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
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"mat_{name}"}},
    }

def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFY}/prompt", data=data, headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())["prompt_id"]

def wait_for_prompt(prompt_id, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        history = json.loads(urllib.request.urlopen(f"{COMFY}/history/{prompt_id}").read())
        if prompt_id in history: return history[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"Timeout: {prompt_id}")

def get_image(filename, subfolder=""):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    return urllib.request.urlopen(f"{COMFY}/view?{params}").read()

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for name, cfg in MATERIALS.items():
        out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
        if os.path.exists(out_path):
            print(f"{name} — exists, skipping", flush=True)
            continue
        print(f"Generating {name}...", flush=True)
        prompt_id = queue_prompt(make_workflow(name, cfg))
        result = wait_for_prompt(prompt_id)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved ({len(img_data)//1024}KB)", flush=True)
    print("\nAll materials generated!", flush=True)

if __name__ == "__main__":
    main()

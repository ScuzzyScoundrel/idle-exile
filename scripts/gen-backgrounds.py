"""Generate full-page background scenes via ComfyUI API — 1920x1080."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/backgrounds"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"

SCENES = {
    "idle-tavern": {
        "prompt": "interior of a warm cozy medieval fantasy tavern at night, wooden walls and beams, candlelight and fireplace glow, mugs on worn oak table, hanging lanterns, adventurer's map pinned to wall, moody atmospheric lighting, hand-painted fantasy RPG concept art style, wide angle establishing shot, no people no characters",
        "negative": "people, characters, faces, hands, text, letters, UI elements, bright daylight, modern, realistic photo, blurry",
        "seed": 1001,
    },
    "band1-forest": {
        "prompt": "sunlit ancient fantasy forest clearing with mossy stones and ferns, warm golden light filtering through canopy, old stone path winding into distance, wildflowers, peaceful serene atmosphere, hand-painted fantasy RPG concept art style, wide angle landscape, no people no characters",
        "negative": "people, characters, faces, text, letters, dark, scary, night, modern, realistic photo, blurry",
        "seed": 1002,
    },
    "band2-frontier": {
        "prompt": "cold misty frontier mountain pass with ancient stone watchtower, steel gray sky, snow on distant peaks, rocky terrain with sparse pines, cold blue atmospheric lighting, hand-painted fantasy RPG concept art style, wide angle landscape, no people no characters",
        "negative": "people, characters, faces, text, letters, warm, tropical, modern, realistic photo, blurry",
        "seed": 1003,
    },
    "band3-warcamp": {
        "prompt": "dark fantasy battlefield war camp at dusk, smoldering embers and distant fires, scorched earth, tattered banners on spears stuck in ground, red orange sky, smoke and haze, ominous atmosphere, hand-painted fantasy RPG concept art style, wide angle establishing shot, no people no characters",
        "negative": "people, characters, faces, text, letters, peaceful, bright daylight, modern, realistic photo, blurry",
        "seed": 1004,
    },
    "band45-void": {
        "prompt": "deep underground crystal cavern with glowing purple and blue crystals, dark void atmosphere, faint ethereal light from crystal formations, ancient ruined pillars, mysterious and foreboding, hand-painted fantasy RPG concept art style, wide angle establishing shot, no people no characters",
        "negative": "people, characters, faces, text, letters, bright daylight, outdoor, modern, realistic photo, blurry",
        "seed": 1005,
    },
    "band6-desolation": {
        "prompt": "desolate wasteland at the end of the world, cracked obsidian ground stretching to horizon, pale bone-white sky, single dead tree silhouette, faint embers floating, absolute desolation and emptiness, hand-painted fantasy RPG concept art style, wide angle landscape, no people no characters",
        "negative": "people, characters, faces, text, letters, lush, green, colorful, modern, realistic photo, blurry",
        "seed": 1006,
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
        "5": {"class_type": "EmptyLatentImage", "inputs": {
            "width": 1344, "height": 768, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["negative"], "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"bg_{name}"}},
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
    for name, cfg in SCENES.items():
        print(f"Generating {name} (1344x768, 8 steps)...", flush=True)
        prompt_id = queue_prompt(make_workflow(name, cfg))
        result = wait_for_prompt(prompt_id)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved: {out_path} ({len(img_data)//1024}KB)", flush=True)
    print("\nAll backgrounds generated!", flush=True)

if __name__ == "__main__":
    main()

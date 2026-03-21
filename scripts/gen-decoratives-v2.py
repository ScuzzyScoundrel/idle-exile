"""Re-generate decoratives at higher resolution for detail."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/textures"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"

DECORATIVES = {
    "gem-red": {
        "prompt": "a single large polished red ruby gemstone in an ornate gold bezel setting, fantasy RPG game UI icon, centered, hand-painted digital art style, glowing inner light, top-down view, solid black background",
        "negative": "multiple gems, text, letters, realistic photograph, blurry, low quality, white background, person, hand, finger",
        "width": 256, "height": 256, "seed": 3011,
    },
    "gem-blue": {
        "prompt": "a single large polished blue sapphire gemstone in an ornate silver bezel setting, fantasy RPG game UI icon, centered, hand-painted digital art style, glowing inner light, top-down view, solid black background",
        "negative": "multiple gems, text, letters, realistic photograph, blurry, low quality, white background, person, hand, finger",
        "width": 256, "height": 256, "seed": 3021,
    },
    "gem-green": {
        "prompt": "a single large polished green emerald gemstone in an ornate bronze bezel setting, fantasy RPG game UI icon, centered, hand-painted digital art style, glowing inner light, top-down view, solid black background",
        "negative": "multiple gems, text, letters, realistic photograph, blurry, low quality, white background, person, hand, finger",
        "width": 256, "height": 256, "seed": 3031,
    },
    "corner-ornament": {
        "prompt": "ornate fantasy L-shaped corner bracket, intricate gold bronze metallic filigree with scrollwork and leaf motifs, game UI corner decoration piece pointing top-left, hand-painted digital art, solid black background",
        "negative": "text, letters, realistic photo, full frame, blurry, centered composition, symmetrical",
        "width": 256, "height": 256, "seed": 4011,
    },
    "scratch-marks": {
        "prompt": "subtle diagonal scratch marks claw gouges and sword cuts on dark stone surface, battle damage wear texture, faint white gray scratches, seamless tileable overlay texture, hand-painted game art style",
        "negative": "text, letters, bright colors, objects, weapons, realistic photo, deep cuts, 3d",
        "width": 512, "height": 512, "seed": 7011,
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
            "width": cfg["width"], "height": cfg["height"], "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["negative"], "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"decor2_{name}"}},
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
    for name, cfg in DECORATIVES.items():
        print(f"Generating {name} ({cfg['width']}x{cfg['height']}, 8 steps)...", flush=True)
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
    print("\nDone!", flush=True)

if __name__ == "__main__":
    main()

"""Generate decorative UI elements via ComfyUI API — transparent PNGs."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/textures"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"

DECORATIVES = {
    "gem-red": {
        "prompt": "single small red ruby gemstone, fantasy RPG UI element, polished faceted gem with inner glow, gold setting mount, top-down view, black background, game icon style, hand-painted",
        "negative": "multiple gems, text, letters, realistic photo, blurry, low quality, white background",
        "width": 128, "height": 128, "seed": 301,
    },
    "gem-blue": {
        "prompt": "single small blue sapphire gemstone, fantasy RPG UI element, polished faceted gem with inner glow, silver setting mount, top-down view, black background, game icon style, hand-painted",
        "negative": "multiple gems, text, letters, realistic photo, blurry, low quality, white background",
        "width": 128, "height": 128, "seed": 302,
    },
    "gem-green": {
        "prompt": "single small green emerald gemstone, fantasy RPG UI element, polished faceted gem with inner glow, bronze setting mount, top-down view, black background, game icon style, hand-painted",
        "negative": "multiple gems, text, letters, realistic photo, blurry, low quality, white background",
        "width": 128, "height": 128, "seed": 303,
    },
    "corner-ornament": {
        "prompt": "ornate fantasy RPG corner bracket decoration, gold bronze metallic filigree scrollwork, L-shaped corner piece, game UI ornament, hand-painted style, black background",
        "negative": "text, letters, realistic photo, full frame, centered, blurry",
        "width": 128, "height": 128, "seed": 401,
    },
    "border-sword": {
        "prompt": "small horizontal fantasy sword weapon icon, simple worn iron blade, game UI decorative element, side view, hand-painted style, black background",
        "negative": "text, letters, realistic photo, person, hand, blurry, detailed handle",
        "width": 192, "height": 64, "seed": 501,
    },
    "divider-ornate": {
        "prompt": "horizontal ornate fantasy divider bar, gold bronze metallic with center diamond shape and scrollwork flourishes extending left and right, game UI element, hand-painted, black background",
        "negative": "text, letters, realistic photo, thick, tall, blurry",
        "width": 512, "height": 64, "seed": 601,
    },
    "scratch-overlay": {
        "prompt": "subtle scratch marks and gouges on dark surface, worn battle damage texture overlay, diagonal claw marks and sword scratches, transparent feel, game texture, hand-painted, black background",
        "negative": "text, letters, bright colors, deep cuts, realistic photo, blurry",
        "width": 256, "height": 256, "seed": 701,
    },
}

def make_workflow(name: str, cfg: dict) -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
                "latent_image": ["5", 0], "seed": cfg["seed"],
                "steps": 6, "cfg": 2.0, "sampler_name": "euler_ancestral",
                "scheduler": "normal", "denoise": 1.0,
            },
        },
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {
            "width": cfg["width"], "height": cfg["height"], "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": cfg["negative"], "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"decor_{name}"}},
    }

def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFY}/prompt", data=data, headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())["prompt_id"]

def wait_for_prompt(prompt_id, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        resp = urllib.request.urlopen(f"{COMFY}/history/{prompt_id}")
        history = json.loads(resp.read())
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"Timeout: {prompt_id}")

def get_image(filename, subfolder=""):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    return urllib.request.urlopen(f"{COMFY}/view?{params}").read()

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for name, cfg in DECORATIVES.items():
        print(f"Generating {name} ({cfg['width']}x{cfg['height']})...", flush=True)
        workflow = make_workflow(name, cfg)
        prompt_id = queue_prompt(workflow)
        result = wait_for_prompt(prompt_id, timeout=180)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved: {out_path} ({len(img_data)//1024}KB)", flush=True)
    print("\nAll decoratives generated!", flush=True)

if __name__ == "__main__":
    main()

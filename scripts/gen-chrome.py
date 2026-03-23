"""Generate UI chrome textures — header bar, nav bar, viewport frame edges."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/textures"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "people, characters, faces, text, letters, realistic photo, blurry, bright, white background"

CHROME = {
    "header-bar": {
        "prompt": "seamless horizontal dark iron-bound wooden beam bar, ornate fantasy RPG game UI header, dark oak wood with iron metal bands and rivets, gold trim accents, hand-painted game art style, side view, flat perspective",
        "width": 1344, "height": 128, "seed": 5001,
    },
    "nav-bar": {
        "prompt": "seamless horizontal dark stone shelf with iron metal trim, ornate fantasy RPG game UI bottom navigation bar, weathered carved stone with metal brackets, hand-painted game art style, front view, flat perspective",
        "width": 1344, "height": 128, "seed": 5002,
    },
    "frame-left": {
        "prompt": "vertical ornate dark wood and iron frame border, fantasy RPG game UI edge decoration, carved dark oak pillar with iron bands and rivets, hand-painted game art style, black background",
        "width": 128, "height": 768, "seed": 5003,
    },
    "frame-right": {
        "prompt": "vertical ornate dark wood and iron frame border, fantasy RPG game UI edge decoration, carved dark oak pillar with iron bands and rivets, hand-painted game art style, black background",
        "width": 128, "height": 768, "seed": 5004,
    },
    "panel-frame": {
        "prompt": "seamless tileable ornate dark metal and wood panel border frame texture, fantasy RPG game UI, iron studs on dark oak, subtle gold inlay detail, hand-painted style, flat perspective",
        "width": 512, "height": 512, "seed": 5005,
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
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"chrome_{name}"}},
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
    for name, cfg in CHROME.items():
        out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
        print(f"Generating {name} ({cfg['width']}x{cfg['height']})...", flush=True)
        prompt_id = queue_prompt(make_workflow(name, cfg))
        result = wait_for_prompt(prompt_id)
        for node_out in result.get("outputs", {}).values():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved: {out_path} ({len(img_data)//1024}KB)", flush=True)
    print("\nAll chrome textures generated!", flush=True)

if __name__ == "__main__":
    main()

"""Generate full-screen zone frame overlays — art around edges, black center (screen-blended)."""
import json, urllib.request, urllib.parse, time, os

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/frames"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"
NEG = "text, letters, symbols, people, faces, realistic photo, blurry, content in center, objects in center"

# Each frame: material around ALL edges, black void in center
FRAMES = {
    "warm-wood": {
        "prompt": "dark oak wooden frame border around edges of image, thick wooden beams with iron rivets and gold ornamental brackets at corners, carved wood details, vines and leaves creeping in from edges, warm candlelit glow, center of image is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11001,
    },
    "mossy-stone": {
        "prompt": "ancient weathered stone frame border around edges of image, mossy rocks with ferns and small plants growing from cracks, mushrooms on corners, hanging moss and vines from top edge, roots reaching up from bottom, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11002,
    },
    "cold-iron": {
        "prompt": "dark hammered iron metal frame border around edges of image, heavy steel plates with bolts and rivets, industrial brackets at corners, scratched worn metal surface, sparks at joints, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11003,
    },
    "scorched-stone": {
        "prompt": "scorched volcanic rock frame border around edges of image, cracked basalt with glowing orange lava in cracks, embers and small flames at edges, smoke wisps rising from corners, molten glow, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11004,
    },
    "frozen-ice": {
        "prompt": "massive ice crystal frame border around edges of image, thick jagged icicles hanging from top, frozen crystalline formations growing from sides and bottom, frost patterns on edges, blue-white glacial ice, cold mist, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11005,
    },
    "dark-obsidian": {
        "prompt": "polished black obsidian frame border around edges of image, volcanic glass with glowing purple void energy veins, dark crystalline shards jutting inward from edges, ethereal purple mist at corners, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11006,
    },
    "crystal-void": {
        "prompt": "dark stone frame border with glowing blue crystals growing inward from all edges of image, electric blue crystal formations, luminous crystal clusters at corners, magical blue glow, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11007,
    },
    "bone-ash": {
        "prompt": "ancient bone frame border around edges of image, bleached white skull and bone fragments forming the frame, ribcage-like arches at top, scattered bone shards, pale gray ash, desolate atmosphere, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11008,
    },
    "blight-bark": {
        "prompt": "twisted corrupted dark tree branch frame border around edges of image, gnarled rotting wood with sickly yellow-green fungal growths and toxic mushrooms, dripping dark sap, thorny vines, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11009,
    },
    "toxic-stone": {
        "prompt": "corroded stone frame border around edges of image, dark rock dripping with bright green toxic liquid, acid-eaten pitted surface, poison pools at bottom, toxic bubbles and green mist, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11010,
    },
    "spider-silk": {
        "prompt": "dark frame border of thick spider webs and silk around all edges of image, massive web strands stretching across corners, silk cocoons hanging from top, small spiders on web, eerie purple-gray, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11011,
    },
    "deep-water": {
        "prompt": "underwater dark rock frame border around edges of image, coral and barnacles growing on rocks, seaweed and kelp hanging from top, bioluminescent jellyfish at corners, deep blue ocean atmosphere, bubbles, center is completely black empty void, fantasy RPG game UI frame overlay, hand-painted concept art style",
        "seed": 11012,
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
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": f"frame_{name}"}},
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
    total = len(FRAMES)
    for i, (name, cfg) in enumerate(FRAMES.items()):
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
    print(f"\nAll {total} frames generated!", flush=True)

if __name__ == "__main__":
    main()

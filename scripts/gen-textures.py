"""Generate tileable UI textures via ComfyUI API."""
import json, urllib.request, urllib.parse, time, os, sys

COMFY = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/jerris/idle-exile/public/images/textures"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"

TEXTURES = {
    "stone-slab": {
        "prompt": "seamless tileable dark stone slab texture, hand-painted fantasy RPG game UI, slate gray with subtle blue undertones, weathered carved stone surface, fine grain detail, top-down flat perspective, even lighting, no text no symbols",
        "negative": "3d render, photo, bright, colorful, text, letters, symbols, cracks, broken, uneven lighting, perspective distortion",
        "seed": 42,
    },
    "wood-plank": {
        "prompt": "seamless tileable dark wood plank texture, hand-painted fantasy RPG game UI, rich warm brown oak wood grain, polished weathered surface, top-down flat perspective, even lighting, no text no symbols",
        "negative": "3d render, photo, bright, neon, text, letters, symbols, knots, splinters, uneven lighting, perspective distortion",
        "seed": 77,
    },
    "leather-worn": {
        "prompt": "seamless tileable dark weathered leather texture, hand-painted fantasy RPG game UI, rich brown worn leather hide with subtle stitch marks, top-down flat perspective, even lighting, no text no symbols",
        "negative": "3d render, photo, bright, shiny, new, text, letters, symbols, tears, holes, uneven lighting, perspective distortion",
        "seed": 123,
    },
    "parchment": {
        "prompt": "seamless tileable warm parchment paper texture, hand-painted fantasy RPG game UI, aged cream beige vellum with subtle fiber detail, top-down flat perspective, even warm lighting, no text no symbols no writing",
        "negative": "3d render, photo, bright white, text, letters, writing, symbols, wrinkles, torn, stains, dark, uneven lighting, perspective distortion",
        "seed": 256,
    },
}

def make_workflow(name: str, cfg: dict) -> dict:
    return {
        "3": {  # KSampler
            "class_type": "KSampler",
            "inputs": {
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
                "seed": cfg["seed"],
                "steps": 6,
                "cfg": 2.0,
                "sampler_name": "euler_ancestral",
                "scheduler": "normal",
                "denoise": 1.0,
            },
        },
        "4": {  # Checkpoint
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": CKPT},
        },
        "5": {  # Empty latent
            "class_type": "EmptyLatentImage",
            "inputs": {"width": 512, "height": 512, "batch_size": 1},
        },
        "6": {  # Positive prompt
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": cfg["prompt"],
                "clip": ["4", 1],
            },
        },
        "7": {  # Negative prompt
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": cfg["negative"],
                "clip": ["4", 1],
            },
        },
        "8": {  # VAE Decode
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2],
            },
        },
        "9": {  # Save
            "class_type": "SaveImage",
            "inputs": {
                "images": ["8", 0],
                "filename_prefix": f"texture_{name}",
            },
        },
    }


def queue_prompt(workflow: dict) -> str:
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFY}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["prompt_id"]


def wait_for_prompt(prompt_id: str, timeout: int = 120) -> dict:
    start = time.time()
    while time.time() - start < timeout:
        resp = urllib.request.urlopen(f"{COMFY}/history/{prompt_id}")
        history = json.loads(resp.read())
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"Prompt {prompt_id} did not complete in {timeout}s")


def get_image(filename: str, subfolder: str = "") -> bytes:
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    resp = urllib.request.urlopen(f"{COMFY}/view?{params}")
    return resp.read()


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for name, cfg in TEXTURES.items():
        print(f"Generating {name}...", flush=True)
        workflow = make_workflow(name, cfg)
        prompt_id = queue_prompt(workflow)
        print(f"  Queued: {prompt_id}", flush=True)

        result = wait_for_prompt(prompt_id, timeout=180)

        # Find the output image
        outputs = result.get("outputs", {})
        for node_id, node_out in outputs.items():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))
                    out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    print(f"  Saved: {out_path} ({len(img_data)//1024}KB)", flush=True)

    print("\nAll textures generated!", flush=True)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generate zone frame assets via ComfyUI API.

Usage:
  # Generate forest kit (header + footer)
  python generate_frames.py forest

  # Generate all kits
  python generate_frames.py all

  # Generate with custom seed
  python generate_frames.py forest --seed 42
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "public/images/zones/frames/raw"

# DreamShaperXL Turbo settings
CHECKPOINT = "DreamShaperXL_Turbo_v2_1.safetensors"
WIDTH = 1024
HEIGHT = 256
STEPS = 6
CFG = 2.0
SAMPLER = "dpmpp_sde"
SCHEDULER = "karras"

NEGATIVE = (
    "white background, gradient background, sky, ground plane, full scene, "
    "landscape, horizon, text, watermark, signature, blurry, low quality, "
    "photo, realistic, people, characters, UI elements"
)

BIOME_PROMPTS = {
    "forest": {
        "header": (
            "horizontal seamless banner, hanging jungle vines and branches from above, "
            "lush green leaves, dangling moss, tropical canopy edge, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, painted textures, highly detailed, "
            "isolated on solid black background, no ground, no sky"
        ),
        "footer": (
            "horizontal seamless banner, dense tropical foliage ground border, "
            "ferns mushrooms moss fallen logs, small flowers, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, painted textures, highly detailed, "
            "isolated on solid black background, no sky, no trees"
        ),
    },
    "cave": {
        "header": (
            "horizontal seamless banner, stalactites hanging from cave ceiling, "
            "dripping water, small crystal formations, rough stone, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, painted textures, highly detailed, "
            "isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, stalagmites and cave floor rocks, "
            "small crystal clusters, scattered pebbles, underground mushrooms, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, painted textures, highly detailed, "
            "isolated on solid black background"
        ),
    },
    "swamp": {
        "header": (
            "horizontal seamless banner, gnarled swamp branches hanging down, "
            "spanish moss, dripping water, twisted roots from above, "
            "bioluminescent fungi, dark swamp atmosphere, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, swamp ground border with lily pads, "
            "murky water edge, mushrooms, twisted roots, bog plants, "
            "bioluminescent glow, 3D rendered game UI border, "
            "bottom-up perspective, dark fantasy RPG style, highly detailed, "
            "isolated on solid black background"
        ),
    },
    "mountain": {
        "header": (
            "horizontal seamless banner, rocky cliff edge hanging down, "
            "iron chains, mountain stone formations, wind-swept grass tufts, "
            "rough hewn stone border, 3D rendered game UI border, "
            "top-down perspective, dark fantasy RPG style, highly detailed, "
            "isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, rocky ground border, scattered boulders, "
            "iron ore veins, wind-blown grass, gravel and stone, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
    },
    "volcanic": {
        "header": (
            "horizontal seamless banner, volcanic rock hanging formations, "
            "dripping lava streams, obsidian shards, glowing embers, "
            "molten metal drips, scorched stone border, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, volcanic ground border, "
            "cooling lava flows, obsidian shards, ember particles, "
            "cracked molten earth, scorched rocks, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
    },
    "ice": {
        "header": (
            "horizontal seamless banner, icicles hanging from frozen ceiling, "
            "frost crystals, frozen branches, ice formations, "
            "cold blue light, 3D rendered game UI border, "
            "top-down perspective, dark fantasy RPG style, highly detailed, "
            "isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, frozen ground border, "
            "ice shards, frost crystals, frozen water edge, "
            "snow-covered rocks, cold blue glow, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
    },
    "crystal": {
        "header": (
            "horizontal seamless banner, crystal formations hanging down, "
            "arcane runes glowing, ethereal energy wisps, "
            "amethyst and celestite crystals, magical sparkles, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, crystal ground border, "
            "glowing crystal clusters, arcane sigils, "
            "ethereal mist, star fragments, magical energy, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
    },
    "void": {
        "header": (
            "horizontal seamless banner, dark tendrils hanging from above, "
            "ancient bone fragments, void energy wisps, "
            "crumbling dark stone, eldritch formations, "
            "3D rendered game UI border, top-down perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
        "footer": (
            "horizontal seamless banner, dark ground border, "
            "bone fragments, cracked ancient stone, void energy, "
            "dark tendrils rising, ruined pillars base, "
            "3D rendered game UI border, bottom-up perspective, "
            "dark fantasy RPG style, highly detailed, isolated on solid black background"
        ),
    },
}


def build_workflow(prompt: str, filename_prefix: str, seed: int) -> dict:
    """Build a ComfyUI API workflow for SDXL generation."""
    return {
        "3": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": CHECKPOINT},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["3", 1],
            },
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": NEGATIVE,
                "clip": ["3", 1],
            },
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": WIDTH,
                "height": HEIGHT,
                "batch_size": 1,
            },
        },
        "10": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["3", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
                "seed": seed,
                "steps": STEPS,
                "cfg": CFG,
                "sampler_name": SAMPLER,
                "scheduler": SCHEDULER,
                "denoise": 1.0,
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["10", 0],
                "vae": ["3", 2],
            },
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["8", 0],
                "filename_prefix": filename_prefix,
            },
        },
    }


def queue_prompt(workflow: dict) -> str:
    """Send workflow to ComfyUI and return prompt_id."""
    payload = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
    return result["prompt_id"]


def wait_for_completion(prompt_id: str, timeout: int = 120) -> dict:
    """Poll ComfyUI until the prompt completes."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}") as resp:
                history = json.loads(resp.read())
            if prompt_id in history:
                return history[prompt_id]
        except urllib.error.URLError:
            pass
        time.sleep(1)
    raise TimeoutError(f"Prompt {prompt_id} did not complete within {timeout}s")


def download_image(filename: str, subfolder: str, output_path: Path) -> None:
    """Download generated image from ComfyUI."""
    url = f"{COMFYUI_URL}/view?filename={filename}&subfolder={subfolder}&type=output"
    urllib.request.urlretrieve(url, str(output_path))


def generate_kit(kit_name: str, seed: int) -> None:
    """Generate header + footer for a biome kit."""
    if kit_name not in BIOME_PROMPTS:
        print(f"Unknown kit: {kit_name}")
        print(f"Available: {', '.join(BIOME_PROMPTS.keys())}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    prompts = BIOME_PROMPTS[kit_name]

    for part in ("header", "footer"):
        prefix = f"zoneframe_{kit_name}_{part}"
        print(f"\nGenerating {kit_name} {part}...")
        print(f"  Prompt: {prompts[part][:80]}...")

        workflow = build_workflow(prompts[part], prefix, seed)
        prompt_id = queue_prompt(workflow)
        print(f"  Queued: {prompt_id}")

        result = wait_for_completion(prompt_id)
        outputs = result.get("outputs", {})

        # Find the SaveImage node output
        for node_id, node_out in outputs.items():
            if "images" in node_out:
                for img_info in node_out["images"]:
                    out_path = OUTPUT_DIR / f"{kit_name}_{part}.png"
                    download_image(
                        img_info["filename"],
                        img_info.get("subfolder", ""),
                        out_path,
                    )
                    print(f"  Saved: {out_path}")

        # Use a different seed for footer
        seed += 1


def main():
    parser = argparse.ArgumentParser(description="Generate zone frame assets via ComfyUI")
    parser.add_argument("kit", help="Biome kit name (forest, cave, etc.) or 'all'")
    parser.add_argument("--seed", type=int, default=12345, help="Base seed (default: 12345)")
    args = parser.parse_args()

    # Test connection
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
    except urllib.error.URLError:
        print(f"Cannot connect to ComfyUI at {COMFYUI_URL}")
        print("Make sure ComfyUI is running.")
        sys.exit(1)

    if args.kit == "all":
        for kit_name in BIOME_PROMPTS:
            generate_kit(kit_name, args.seed)
            args.seed += 100  # Offset seeds between kits
    else:
        generate_kit(args.kit, args.seed)

    print(f"\n✓ Done! Raw images in: {OUTPUT_DIR}")
    print(f"  Next step: tools/venv/bin/python tools/asset-pipeline/remove_bg.py")


if __name__ == "__main__":
    main()

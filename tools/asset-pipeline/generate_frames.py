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

# DreamShaperXL Turbo settings — exact recipe from forest_header_s0.png metadata
CHECKPOINT = "DreamShaperXL_Turbo_v2_1.safetensors"
WIDTH = 1024
HEIGHT = 512
STEPS = 15
CFG = 5.0
SAMPLER = "dpmpp_sde"
SCHEDULER = "karras"

SPRITE_PREFIX = (
    "game sprite asset, transparent PNG overlay, "
)

NEGATIVE = (
    "background scene, landscape, horizon, sky, environment, room, "
    "gradient background, colored background, fog, mist, atmosphere, depth, "
    "text, watermark, blurry, soft focus, low quality, washed out, "
    "photo, realistic, plants growing upward, ground plants, tree trunk, trees"
)

BIOME_PROMPTS = {
    "forest": {
        "header": (
            "tropical vines and branches hanging DOWN from the very top edge, "
            "large green leaves, curly tendrils, dripping moss strands, "
            "canopy border hanging downward into empty space, vibrant greens, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "cave": {
        "header": (
            "a hanging garland like a vine garland but made of stone and crystals, "
            "stretching left to right along the very top edge, "
            "thin rocky branches with small amber gemstone droplets dangling on fine stone threads, "
            "tiny mushrooms and moss patches growing on the stone vine, curly root tendrils, "
            "earthy browns and warm amber tones, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "swamp": {
        "header": (
            "a hanging garland like a vine garland but made of twisted dark swamp wood, "
            "stretching left to right along the very top edge, "
            "gnarled branches with long spanish moss strands drooping down, "
            "small glowing green mushrooms and toxic droplets dangling on thin threads, "
            "curly dark root tendrils, murky green and dark brown tones, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "mountain": {
        "header": (
            "a hanging garland like a vine garland but made of iron chains and stone, "
            "stretching left to right along the very top edge, "
            "iron chain links with small hanging lanterns and rough stone pieces dangling, "
            "grass tufts and tiny wildflowers growing from cracks, pebble droplets on threads, "
            "cold gray and warm lantern orange tones, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "volcanic": {
        "header": (
            "a hanging garland like a vine garland but made of obsidian rock and dripping lava, "
            "stretching left to right along the very top edge, "
            "dark volcanic stone branches with bright orange lava droplets dangling on thin chains, "
            "glowing ember beads falling, small obsidian shards hanging like leaves, "
            "dark red and bright orange tones, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "ice": {
        "header": (
            "a hanging garland like a vine garland but made of ice and frost, "
            "stretching left to right along the very top edge, "
            "frozen ice branches with translucent blue icicle droplets dangling on frost threads, "
            "snowflake ornaments, small frozen water beads hanging like dewdrops, "
            "icy blue and white tones, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "crystal": {
        "header": (
            "arcane crystal formations and gem chains hanging DOWN from the very top edge, "
            "glowing purple amethyst and blue crystal clusters dangling on delicate chains, "
            "tiny magical sparkles, ethereal energy wisps, floating gem fragments, "
            "crystal border hanging downward into empty space, mystical purples, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
        ),
    },
    "void": {
        "header": (
            "a hanging garland like a vine garland but made of dark bone and purple energy, "
            "stretching left to right along the very top edge, "
            "twisted dark tendrils with purple gemstone droplets dangling on bone chains, "
            "small skull beads, crumbling ancient stone fragments hanging like leaves, "
            "dark purple and bone white tones, "
            "sharp detailed, hand-painted game art style, "
            "isolated object on pure black, black void background, nothing behind"
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

    for part in ("header",):
        prefix = f"zoneframe_{kit_name}_{part}"
        print(f"\nGenerating {kit_name} {part}...")
        print(f"  Prompt: {prompts[part][:80]}...")

        workflow = build_workflow(SPRITE_PREFIX + prompts[part], prefix, seed)
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

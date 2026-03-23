#!/usr/bin/env /home/jerris/comfyui/venv/bin/python
"""Generate per-zone transparent border overlays using FLUX + BiRefNet via Replicate.

Pipeline:
  1. FLUX 1.1 Pro generates high-quality border art on white background
  2. BiRefNet removes background → clean RGBA PNG with true alpha
  3. Output ready for z-40 overlay in-game

Usage:
  python gen-zone-borders-flux.py                       # generate all missing
  python gen-zone-borders-flux.py ashwood_thicket        # one zone
  python gen-zone-borders-flux.py ashwood_thicket --force # regenerate
"""
import os, sys, time, urllib.request
sys.path.insert(0, '/home/jerris/comfyui/venv/lib/python3.12/site-packages')
import replicate
from PIL import Image
import io

API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
RAW_DIR = "/home/jerris/idle-exile/public/images/zone-borders/raw"
OUT_DIR = "/home/jerris/idle-exile/public/images/zone-borders"

client = replicate.Client(api_token=API_TOKEN)

# Shared style suffix for consistency across all 30 zones
STYLE = (
    "on pure white background, isolated object, no environment, "
    "fantasy RPG digital painting style, hand-painted look, "
    "rich painterly textures with visible brushwork, soft warm lighting, "
    "game asset illustration, spanning the full width of the image edge to edge"
)

# ── Zone border definitions ──────────────────────────────────────────────
# Each zone: top (hanging down from top edge) + bottom (growing up from bottom edge)
# bottom entries with "flip": True reuse top-style prompt and flip vertically

ZONES = {
    "ashwood_thicket": {
        "top": {
            "prompt": (
                "A long vine garland stretching from the left edge to the right edge of the image, "
                "hugging the very top of the frame. Thick ancient wooden branches intertwined "
                "with lush green leaves, hanging ivy tendrils drooping down, moss-covered bark, "
                "small fern fronds and tiny flowers. Dense foliage at the top thinning into "
                "dangling vines and leaf clusters below. "
                f"{STYLE}"
            ),
        },
        "bottom": {
            "prompt": (
                "A long mossy forest floor strip stretching from the left edge to the right edge "
                "of the image, hugging the very bottom of the frame. Thick mossy logs, "
                "lush ferns, red-capped mushrooms, wildflowers, small bushes, twisted roots, "
                "and dense leafy ground cover. Dense vegetation at the bottom thinning upward. "
                f"{STYLE}"
            ),
        },
    },
}


def generate_with_flux(prompt, aspect_ratio="16:9"):
    """Generate image using FLUX 1.1 Pro via Replicate."""
    output = client.run(
        "black-forest-labs/flux-1.1-pro",
        input={
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": "png",
            "output_quality": 100,
            "safety_tolerance": 5,
            "prompt_upsampling": True,
        }
    )
    # output is a FileOutput URL
    url = str(output)
    img_data = urllib.request.urlopen(url).read()
    return img_data


def white_to_alpha(input_path, output_path):
    """Convert white/near-white pixels to transparent using color distance."""
    from PIL import ImageFilter
    import numpy as np
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    dist = np.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
    LOW, HIGH = 30, 80
    alpha = np.clip((dist - LOW) / (HIGH - LOW) * 255, 0, 255).astype(np.uint8)
    arr[:, :, 3] = alpha.astype(np.float32)
    result = Image.fromarray(arr.astype(np.uint8))
    r_ch, g_ch, b_ch, a_ch = result.split()
    a_ch = a_ch.filter(ImageFilter.GaussianBlur(radius=0.5))
    result = Image.merge("RGBA", (r_ch, g_ch, b_ch, a_ch))
    result.save(output_path, "PNG")


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    force = "--force" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    filter_zone = args[0] if args else None

    zones = {k: v for k, v in ZONES.items()
             if filter_zone is None or k == filter_zone}

    if not zones:
        print(f"Zone '{filter_zone}' not found. Available: {list(ZONES.keys())}")
        return

    total = sum(len(v) for v in zones.values())
    idx = 0
    for zone_id, sides in zones.items():
        for side, cfg in sides.items():
            idx += 1
            name = f"{zone_id}_{side}"
            raw_path = os.path.join(RAW_DIR, f"{name}.png")
            out_path = os.path.join(OUT_DIR, f"{name}.png")

            if os.path.exists(out_path) and not force:
                print(f"[{idx}/{total}] {name} — exists, skip (use --force)",
                      flush=True)
                continue

            # Step 1: Generate with FLUX
            print(f"[{idx}/{total}] {name} — generating with FLUX...", flush=True)
            t0 = time.time()
            img_data = generate_with_flux(cfg["prompt"])
            with open(raw_path, "wb") as f:
                f.write(img_data)
            gen_time = time.time() - t0
            print(f"  Generated in {gen_time:.1f}s", flush=True)

            # Step 2: White → alpha locally
            print(f"  Converting white to alpha...", flush=True)
            t0 = time.time()
            white_to_alpha(raw_path, out_path)
            bg_time = time.time() - t0

            # Step 3: Flip if needed
            if cfg.get("flip"):
                print(f"  Flipping vertically...", flush=True)
                img = Image.open(out_path)
                img = img.transpose(Image.FLIP_TOP_BOTTOM)
                img.save(out_path, "PNG")

            size_kb = os.path.getsize(out_path) // 1024
            print(f"  Done ({size_kb}KB, bg removed in {bg_time:.1f}s)", flush=True)

    print(f"\nAll done! Output: {OUT_DIR}/", flush=True)


if __name__ == "__main__":
    main()

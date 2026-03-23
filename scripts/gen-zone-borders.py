#!/usr/bin/env /home/jerris/comfyui/venv/bin/python
"""Generate per-zone transparent border overlays — 2D game asset style.

Strategy (v4 — 2D art + white-to-alpha):
  1. Generate 2D game art border elements on white background via ComfyUI
  2. Convert white background → transparent using color distance (not rembg)
  3. Output as RGBA PNG ready for z-40 overlay in-game

rembg doesn't work here because it seeks a single "subject" and removes
everything else — our spread-out vines/foliage get classified as background.
Simple white-to-alpha works perfectly because the art is colorful and the
background is uniformly white.

Usage:
  python gen-zone-borders.py                  # generate all missing
  python gen-zone-borders.py ashwood_thicket   # generate one zone only
  python gen-zone-borders.py ashwood_thicket --force  # regenerate
"""
import json, urllib.request, urllib.parse, time, os, sys
sys.path.insert(0, '/home/jerris/comfyui/venv/lib/python3.12/site-packages')
from PIL import Image, ImageFilter
import numpy as np

COMFY = "http://127.0.0.1:8188"
RAW_DIR = "/home/jerris/idle-exile/public/images/zone-borders/raw"
OUT_DIR = "/home/jerris/idle-exile/public/images/zone-borders"
CKPT = "DreamShaperXL_Turbo_v2_1.safetensors"

# Style keywords — forces 2D game asset look on white background
STYLE = (
    "2D game art asset, vector illustration style, cartoon, "
    "clean lines, vibrant colors, isolated on plain white background, "
    "game UI overlay element, horizontal strip, seamless, "
    "mobile game art, idle game asset, no background, white background"
)

NEG = (
    "realistic, photo, 3D render, painterly, oil painting, watercolor, "
    "scene, landscape, horizon, sky, ground, depth of field, blurry, "
    "text, letters, people, faces, dark, moody, atmospheric, fog, mist, "
    "frame, border, rectangle, contained, tiling pattern"
)

# ── Zone border definitions ──────────────────────────────────────────────
ZONES = {
    "ashwood_thicket": {
        "top": {
            "prompt": (
                "thick wooden vine branch running horizontally across the image "
                "with lush green tropical leaves, hanging ivy, ferns attached to the vine, "
                "small flowering plants growing on the branch, dripping moss, "
                "vine tendrils hanging down, leaf clusters at varied heights, "
                f"{STYLE}"
            ),
            "seed": 40001,
        },
        "bottom": {
            "prompt": (
                "thick wooden vine branch running horizontally across the image "
                "with lush green tropical leaves, hanging ivy, ferns attached to the vine, "
                "small flowering plants growing on the branch, dripping moss, "
                "vine tendrils hanging down, leaf clusters at varied heights, "
                f"{STYLE}"
            ),
            "seed": 40003,
            "flip": True,  # generate as top-style, then flip vertically
        },
    },
}


def make_workflow(name, cfg):
    """Build a ComfyUI API workflow — wide aspect for horizontal strips."""
    return {
        "3": {"class_type": "KSampler", "inputs": {
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
            "latent_image": ["5", 0], "seed": cfg["seed"],
            "steps": 10, "cfg": 5.0, "sampler_name": "euler_ancestral",
            "scheduler": "normal", "denoise": 1.0}},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {
            "width": 1344, "height": 512, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {
            "text": cfg["prompt"], "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {
            "text": NEG, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {
            "samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {
            "images": ["8", 0],
            "filename_prefix": f"zborder_{name}"}},
    }


def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFY}/prompt", data=data,
        headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())["prompt_id"]


def wait_for_prompt(prompt_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        history = json.loads(
            urllib.request.urlopen(f"{COMFY}/history/{prompt_id}").read())
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(2)
    raise TimeoutError(f"Timeout waiting for: {prompt_id}")


def get_image(filename, subfolder=""):
    params = urllib.parse.urlencode({
        "filename": filename, "subfolder": subfolder, "type": "output"})
    return urllib.request.urlopen(f"{COMFY}/view?{params}").read()


def white_to_alpha(input_path, output_path):
    """Convert white/near-white pixels to transparent.

    Uses distance from pure white (255,255,255) in RGB space.
    Close to white → transparent. Far from white → opaque.
    Smooth ramp at the boundary for anti-aliased edges.
    """
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Distance from pure white (Euclidean in RGB)
    dist = np.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
    # Max possible distance = sqrt(255^2 * 3) ≈ 441

    # Alpha ramp:
    #   dist < 30  → fully transparent (pure white / near-white)
    #   dist 30-80 → smooth ramp (anti-aliased edges, light-colored art)
    #   dist > 80  → fully opaque (actual art content)
    LOW = 30
    HIGH = 80
    alpha = np.clip((dist - LOW) / (HIGH - LOW) * 255, 0, 255).astype(np.uint8)

    arr[:, :, 3] = alpha.astype(np.float32)
    result = Image.fromarray(arr.astype(np.uint8))

    # Light blur on alpha for smoother edges
    r_ch, g_ch, b_ch, a_ch = result.split()
    a_ch = a_ch.filter(ImageFilter.GaussianBlur(radius=0.5))
    result = Image.merge("RGBA", (r_ch, g_ch, b_ch, a_ch))
    result.save(output_path, "PNG")

    final_a = np.array(result.split()[3])
    opaque_pct = np.count_nonzero(final_a > 10) / (arr.shape[0] * arr.shape[1]) * 100
    return opaque_pct


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

            # Step 1: Generate via ComfyUI (skip if raw exists and not --force)
            if not os.path.exists(raw_path) or force:
                print(f"[{idx}/{total}] {name} — generating...", flush=True)
                prompt_id = queue_prompt(make_workflow(name, cfg))
                result = wait_for_prompt(prompt_id)
                for node_out in result.get("outputs", {}).values():
                    if "images" in node_out:
                        for img_info in node_out["images"]:
                            img_data = get_image(
                                img_info["filename"],
                                img_info.get("subfolder", ""))
                            with open(raw_path, "wb") as f:
                                f.write(img_data)
            else:
                print(f"[{idx}/{total}] {name} — raw exists, reprocessing...",
                      flush=True)

            # Step 2: White → alpha
            print(f"  Converting white to alpha...", flush=True)
            coverage = white_to_alpha(raw_path, out_path)

            # Step 3: Flip vertically if flagged (for bottom borders)
            if cfg.get("flip"):
                print(f"  Flipping vertically...", flush=True)
                img = Image.open(out_path)
                img = img.transpose(Image.FLIP_TOP_BOTTOM)
                img.save(out_path, "PNG")

            size_kb = os.path.getsize(out_path) // 1024
            print(f"  Saved ({size_kb}KB, {coverage:.0f}% foreground)",
                  flush=True)

    print(f"\nDone! Output: {OUT_DIR}/", flush=True)


if __name__ == "__main__":
    main()

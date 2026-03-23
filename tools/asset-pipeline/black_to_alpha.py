#!/usr/bin/env python3
"""
Black-to-Alpha conversion for zone frame assets.
Much better than rembg for game art on solid black backgrounds.

Converts black pixels → transparent using color distance,
preserving all detail in the foliage/vines/elements.

Usage:
  python black_to_alpha.py                    # Batch process frames/raw/ → frames/processed/
  python black_to_alpha.py path/to/image.png  # Single file
  python black_to_alpha.py --threshold 40     # Adjust sensitivity (default: 30)
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAW_DIR = Path(__file__).resolve().parent.parent.parent / "public/images/zones/frames/raw"
OUT_DIR = Path(__file__).resolve().parent.parent.parent / "public/images/zones/frames/processed"


def black_to_alpha(img: Image.Image, threshold: int = 30, feather: float = 1.5) -> Image.Image:
    """
    Convert black background to transparent.

    Algorithm (GIMP color-to-alpha style):
    1. Calculate distance from pure black for each pixel
    2. Pixels within `threshold` of black → fully transparent
    3. Pixels between threshold and threshold*3 → partial transparency (smooth edge)
    4. Everything else → fully opaque
    5. Optional gaussian feather on the alpha channel
    """
    arr = np.array(img.convert("RGBA"), dtype=np.float32)

    # Distance from black (0,0,0) — max channel value
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Use luminance-weighted distance for better dark color handling
    distance = np.maximum(np.maximum(r, g), b)

    # Build alpha: 0 where black, smooth ramp to 255
    ramp_end = threshold * 3.0
    alpha = np.clip((distance - threshold) / (ramp_end - threshold) * 255, 0, 255)

    # For pixels that ARE colorful, boost alpha to full
    # (prevents semi-transparent leaves that should be opaque)
    saturation = np.max(arr[:, :, :3], axis=2) - np.min(arr[:, :, :3], axis=2)
    color_boost = np.where(saturation > 40, 255, alpha)
    alpha = np.maximum(alpha, color_boost)

    # Also boost bright pixels
    brightness = (r + g + b) / 3
    bright_boost = np.where(brightness > 60, 255, alpha)
    alpha = np.maximum(alpha, bright_boost)

    arr[:, :, 3] = alpha
    result = Image.fromarray(arr.astype(np.uint8), "RGBA")

    # Light feather on alpha edges for smoother compositing
    if feather > 0:
        a = result.split()[3]
        a = a.filter(ImageFilter.GaussianBlur(radius=feather))
        # Only soften edges, don't reduce opacity of solid areas
        orig_a = result.split()[3]
        a = Image.fromarray(np.minimum(np.array(a), np.array(orig_a)))
        result.putalpha(a)

    return result


def process_file(input_path: Path, output_path: Path, threshold: int = 30) -> None:
    """Process a single image."""
    print(f"  Processing: {input_path.name}")
    img = Image.open(input_path)
    result = black_to_alpha(img, threshold=threshold)

    # Trim transparent edges
    bbox = result.getbbox()
    if bbox:
        result = result.crop(bbox)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, "PNG", optimize=True)
    print(f"  → Saved: {output_path.name} ({result.size[0]}x{result.size[1]})")


def process_batch(threshold: int = 30) -> None:
    """Process all images in raw/ directory."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(
        p for p in RAW_DIR.iterdir()
        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")
    )

    if not raw_files:
        print(f"No images found in {RAW_DIR}")
        return

    print(f"Processing {len(raw_files)} images (black → alpha, threshold={threshold})...")
    for raw_path in raw_files:
        out_path = OUT_DIR / f"{raw_path.stem}.png"
        try:
            process_file(raw_path, out_path, threshold=threshold)
        except Exception as e:
            print(f"  ERROR on {raw_path.name}: {e}")

    print(f"\nDone! → {OUT_DIR}")


def main():
    parser = argparse.ArgumentParser(description="Convert black backgrounds to transparent")
    parser.add_argument("input", nargs="?", help="Single file (omit for batch)")
    parser.add_argument("--threshold", type=int, default=30,
                        help="Black detection threshold 0-255 (default: 30, higher = more aggressive)")
    parser.add_argument("--out", type=str, help="Output path (single file mode)")
    args = parser.parse_args()

    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"File not found: {input_path}")
            sys.exit(1)
        out_path = Path(args.out) if args.out else OUT_DIR / f"{input_path.stem}.png"
        process_file(input_path, out_path, threshold=args.threshold)
    else:
        process_batch(threshold=args.threshold)


if __name__ == "__main__":
    main()

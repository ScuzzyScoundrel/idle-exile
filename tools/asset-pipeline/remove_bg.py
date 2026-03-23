#!/usr/bin/env python3
"""
Background Removal Pipeline for Zone Frame Assets

Usage:
  # Process all raw images in frames/raw/ → frames/processed/
  python remove_bg.py

  # Process a single file
  python remove_bg.py path/to/image.png

  # Process with alpha edge feathering (smoother edges)
  python remove_bg.py --feather 3

Output: transparent PNGs ready for use as UI overlays.
"""

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import remove


RAW_DIR = Path(__file__).resolve().parent.parent.parent / "public/images/zones/frames/raw"
OUT_DIR = Path(__file__).resolve().parent.parent.parent / "public/images/zones/frames/processed"


def remove_background(input_path: Path, output_path: Path, feather: int = 2) -> None:
    """Remove background and save as transparent PNG."""
    print(f"  Processing: {input_path.name}")

    with open(input_path, "rb") as f:
        input_data = f.read()

    # rembg does the heavy lifting
    output_data = remove(input_data)

    # Load result for post-processing
    from io import BytesIO
    img = Image.open(BytesIO(output_data)).convert("RGBA")

    # Feather alpha edges for smoother blending
    if feather > 0:
        alpha = img.split()[3]
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=feather))
        img.putalpha(alpha)

    # Trim transparent edges (keep content tight)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG", optimize=True)
    print(f"  → Saved: {output_path.name} ({img.size[0]}x{img.size[1]})")


def process_batch(feather: int = 2) -> None:
    """Process all images in raw/ directory."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(
        p for p in RAW_DIR.iterdir()
        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")
    )

    if not raw_files:
        print(f"No images found in {RAW_DIR}")
        print("Place generated images there with names like:")
        print("  forest_header.png, forest_footer.png")
        print("  cave_header.png, cave_footer.png")
        print("  volcanic_header.png, etc.")
        return

    print(f"Processing {len(raw_files)} images...")
    for raw_path in raw_files:
        out_path = OUT_DIR / f"{raw_path.stem}.png"
        try:
            remove_background(raw_path, out_path, feather=feather)
        except Exception as e:
            print(f"  ERROR on {raw_path.name}: {e}")

    print(f"\nDone! {len(raw_files)} images → {OUT_DIR}")


def main():
    parser = argparse.ArgumentParser(description="Remove backgrounds from zone frame assets")
    parser.add_argument("input", nargs="?", help="Single file to process (or omit for batch)")
    parser.add_argument("--feather", type=int, default=2, help="Alpha edge feather radius (default: 2)")
    parser.add_argument("--out", type=str, help="Output path (single file mode)")
    args = parser.parse_args()

    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"File not found: {input_path}")
            sys.exit(1)
        out_path = Path(args.out) if args.out else OUT_DIR / f"{input_path.stem}.png"
        remove_background(input_path, out_path, feather=args.feather)
    else:
        process_batch(feather=args.feather)


if __name__ == "__main__":
    main()

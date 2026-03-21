#!/usr/bin/env /home/jerris/comfyui/venv/bin/python
"""Re-process border PNGs with hard alpha — art stays fully opaque, black bg becomes transparent."""
import os, sys
sys.path.insert(0, '/home/jerris/comfyui/venv/lib/python3.12/site-packages')
from PIL import Image
import numpy as np

RAW_DIR = "/home/jerris/idle-exile/public/images/borders/raw"
OUT_DIR = "/home/jerris/idle-exile/public/images/borders"

def hard_alpha(input_path, output_path):
    """Hard threshold: dark pixels = fully transparent, everything else = fully opaque."""
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)

    # Luminance
    lum = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]

    # Hard ramp: below 25 = transparent, 25-60 = ramp, above 60 = fully opaque
    alpha = np.clip((lum - 25) / 35 * 255, 0, 255).astype(np.uint8)

    # But keep the RGB channels at FULL brightness (not washed out)
    # Boost the RGB so art that was dimmed by the black bg looks vibrant
    for c in range(3):
        channel = arr[:,:,c]
        # Where there's actual content (alpha > 0), boost it
        mask = alpha > 0
        if mask.any():
            # Normalize: scale the bright parts up so they're vivid
            channel_masked = channel[mask]
            max_val = np.percentile(channel_masked, 98) if len(channel_masked) > 0 else 255
            if max_val > 50:
                boost = min(255 / max_val, 2.5)  # cap boost at 2.5x
                arr[:,:,c] = np.clip(channel * boost, 0, 255)

    arr[:,:,3] = alpha
    result = Image.fromarray(arr.astype(np.uint8))
    result.save(output_path, "PNG")

def main():
    raw_files = [f for f in os.listdir(RAW_DIR) if f.endswith('.png')]
    print(f"Re-processing {len(raw_files)} borders with hard alpha...", flush=True)

    for f in sorted(raw_files):
        raw_path = os.path.join(RAW_DIR, f)
        out_path = os.path.join(OUT_DIR, f)
        hard_alpha(raw_path, out_path)
        size_kb = os.path.getsize(out_path) // 1024
        print(f"  {f} ({size_kb}KB)", flush=True)

    print("Done!", flush=True)

if __name__ == "__main__":
    main()

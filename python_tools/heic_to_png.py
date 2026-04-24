#!/usr/bin/env python3
"""Convert a folder of HEIC files to PNG, keeping output under 5 MB each."""

import sys
from pathlib import Path
from PIL import Image
import pillow_heif

pillow_heif.register_heif_opener()

MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def convert(input_folder, output_folder=None):
    src = Path(input_folder)
    dst = Path(output_folder) if output_folder else src / "png_output"
    dst.mkdir(exist_ok=True)

    files = sorted(src.glob("*.[Hh][Ee][Ii][Cc]"))
    if not files:
        print("No HEIC files found.")
        return

    for heic in files:
        print(f"Converting {heic.name}...")
        img = Image.open(heic)
        out = dst / (heic.stem + ".png")

        # Start at full size with max compression
        scale = 1.0
        current = img
        current.save(out, "PNG", compress_level=9)

        # Scale down if still over 5 MB
        while out.stat().st_size > MAX_BYTES and scale > 0.2:
            scale -= 0.1
            w = int(img.width * scale)
            h = int(img.height * scale)
            current = img.resize((w, h), Image.LANCZOS)
            current.save(out, "PNG", compress_level=9)

        mb = out.stat().st_size / 1024 / 1024
        note = f" (scaled to {scale:.0%})" if scale < 1.0 else ""
        print(f"  -> {out.name}  {mb:.1f} MB{note}")


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else "."
    out = sys.argv[2] if len(sys.argv) > 2 else None
    convert(folder, out)


if __name__ == "__main__":
    main()

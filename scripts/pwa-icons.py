#!/usr/bin/env python3
"""Rasterize Trajectry PWA icons from public/icon.svg.

Any-purpose icons keep the rounded plate. Maskable icons are a full-bleed
#07080F square with the same marks scaled into the center 80% safe zone.

Requires rsvg-convert and Pillow. Output PNGs are committed; the Pages build
does not run this script.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "icon.svg"
BG = "#07080F"
SUPERSAMPLE = 4

MASKABLE_SVG = """\
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="#07080F"/>
  <g transform="translate(12.8 12.8) scale(0.8)">
    <circle cx="36" cy="90" r="11" fill="#F4F1EA"/>
    <circle cx="58" cy="64" r="4" fill="#7DF0FF"/>
    <circle cx="78" cy="46" r="4" fill="#7DF0FF"/>
    <circle cx="100" cy="32" r="11" fill="none" stroke="#F2B62A" stroke-width="4.5"/>
    <circle cx="100" cy="32" r="3.4" fill="#F2B62A"/>
  </g>
</svg>
"""


def render_svg(svg_path: Path, size: int, dest: Path) -> None:
    subprocess.run(
        [
            "rsvg-convert",
            f"--width={size}",
            f"--height={size}",
            "--background-color=none",
            str(svg_path),
            "--output",
            str(dest),
        ],
        check=True,
    )


def downsample(src: Path, dest: Path, size: int) -> None:
    with Image.open(src) as im:
        rgba = im.convert("RGBA")
        out = rgba.resize((size, size), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest, format="PNG", optimize=True)


def write_icon(svg_path: Path, dest: Path, size: int) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        big = Path(tmp) / "super.png"
        render_svg(svg_path, size * SUPERSAMPLE, big)
        downsample(big, dest, size)
    print(f"wrote {dest.relative_to(ROOT)} ({size}x{size})")


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"missing {SOURCE}")

    with tempfile.TemporaryDirectory() as tmp:
        maskable = Path(tmp) / "icon-maskable.svg"
        maskable.write_text(MASKABLE_SVG, encoding="utf-8")

        write_icon(SOURCE, PUBLIC / "icon-192.png", 192)
        write_icon(SOURCE, PUBLIC / "icon-512.png", 512)
        write_icon(SOURCE, PUBLIC / "apple-touch-icon.png", 180)
        write_icon(maskable, PUBLIC / "icon-maskable-192.png", 192)
        write_icon(maskable, PUBLIC / "icon-maskable-512.png", 512)


if __name__ == "__main__":
    main()

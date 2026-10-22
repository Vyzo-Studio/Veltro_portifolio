#!/usr/bin/env python3
"""Optimize two existing GNG photos without modifying the original PNG files."""
from pathlib import Path
from PIL import Image, ImageOps
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PAGE = ROOT / "index.html"
TARGETS = ("gng-corte-01", "gng-corte-02")

def optimize():
    html = PAGE.read_text(encoding="utf-8")
    altered = False
    for name in TARGETS:
        original = ASSETS / f"{name}.png"
        if not original.exists():
            raise FileNotFoundError(original)
        with Image.open(original) as raw:
            img = ImageOps.exif_transpose(raw).convert("RGB")
            width, height = img.size
            full = ASSETS / f"{name}.webp"
            img.save(full, "WEBP", quality=86, method=6)
            small = ASSETS / f"{name}-mobile.webp"
            mobile_width = min(720, width)
            mobile_height = round(height * mobile_width / width)
            resized = img.resize((mobile_width, mobile_height), Image.Resampling.LANCZOS) if mobile_width < width else img
            resized.save(small, "WEBP", quality=84, method=6)
        before, after = original.stat().st_size, full.stat().st_size
        print(f"{name}: {width}x{height}, PNG {before} bytes, WebP {after} bytes "
              f"({(before-after)/before*100:.1f}% smaller), mobile {small.stat().st_size} bytes")
        if after >= before:
            print("Optimized asset is not smaller; keeping PNG references.")
            continue
        from_attr = f'src="assets/{name}.png"'
        to_attr = (
            f'src="assets/{name}.webp"\n'
            f'              srcset="assets/{name}-mobile.webp {mobile_width}w, assets/{name}.webp {width}w"\n'
            f'              sizes="(max-width: 680px) 94vw, (max-width: 1180px) 48vw, 760px"\n'
            f'              width="{width}" height="{height}"'
        )
        count = html.count(from_attr)
        if count not in (0, 2):
            raise RuntimeError(f"Expected two static images or none for {name}, got {count}")
        if count == 2:
            html = html.replace(from_attr, to_attr)
            altered = True
        html = html.replace(f'href="assets/{name}.png"', f'href="assets/{name}.webp"')
    if altered:
        PAGE.write_text(html, encoding="utf-8")

if __name__ == "__main__":
    optimize()

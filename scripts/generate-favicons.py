#!/usr/bin/env python3
"""Generate canonical + legacy NH48 favicon assets from the source logo."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE_CANDIDATES = [ROOT / "nh48API_logo.png", ROOT / "nh48api_logo.png"]
LEGACY_DIR = ROOT / "favicons"


def find_source() -> Path:
    for candidate in SOURCE_CANDIDATES:
        if candidate.exists():
            return candidate
    names = ", ".join(str(path.name) for path in SOURCE_CANDIDATES)
    raise FileNotFoundError(f"No favicon source logo found. Expected one of: {names}")


def trim_transparent_border(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return rgba
    return rgba.crop(bbox)


def center_crop_square(image: Image.Image) -> Image.Image:
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    return image.crop((left, top, left + side, top + side))


def resized(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.Resampling.LANCZOS)


def save_png(image: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resized(image, size).save(path, format="PNG", optimize=True)


def save_ico(image: Image.Image, path: Path, sizes: Iterable[int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ico_sizes = sorted({(size, size) for size in sizes})
    resized(image, max(size for size, _ in ico_sizes)).save(path, format="ICO", sizes=ico_sizes)


def main() -> None:
    source_path = find_source()
    source = Image.open(source_path)
    processed = center_crop_square(trim_transparent_border(source))

    # Canonical root assets
    save_png(processed, ROOT / "favicon.png", 48)
    save_png(processed, ROOT / "icon-192.png", 192)
    save_png(processed, ROOT / "icon-512.png", 512)
    save_png(processed, ROOT / "apple-touch-icon.png", 180)
    save_ico(processed, ROOT / "favicon.ico", [16, 32, 48])

    # Legacy compatibility assets
    save_png(processed, LEGACY_DIR / "favicon-16.png", 16)
    save_png(processed, LEGACY_DIR / "favicon-32.png", 32)
    save_png(processed, LEGACY_DIR / "favicon-48x48.png", 48)
    save_png(processed, LEGACY_DIR / "favicon-96x96.png", 96)
    save_png(processed, LEGACY_DIR / "favicon-48.png", 48)
    save_png(processed, LEGACY_DIR / "favicon-96.png", 96)
    save_png(processed, LEGACY_DIR / "android-chrome-192x192.png", 192)
    save_png(processed, LEGACY_DIR / "android-chrome-512x512.png", 512)
    save_png(processed, LEGACY_DIR / "apple-touch-icon.png", 180)
    save_ico(processed, LEGACY_DIR / "favicon.ico", [16, 32, 48, 96])
    save_ico(processed, LEGACY_DIR / "favicon-16x16.ico", [16])
    save_ico(processed, LEGACY_DIR / "favicon-32x32.ico", [32])
    save_ico(processed, LEGACY_DIR / "favicon-48x48.ico", [48])
    save_ico(processed, LEGACY_DIR / "favicon-96x96.ico", [96])

    print(f"Generated favicon assets from {source_path.name}")


if __name__ == "__main__":
    main()

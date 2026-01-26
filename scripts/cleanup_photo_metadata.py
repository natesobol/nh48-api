#!/usr/bin/env python3
"""Remove redundant photo metadata fields from manifests."""
import argparse
import json
from pathlib import Path
from typing import Dict, Tuple


PHOTO_KEYS_TO_REMOVE = {"caption", "headline", "description", "altText"}
IPTC_KEYS_TO_REMOVE = {"headline", "description", "altText", "extendedDescription"}


def _clean_photo(photo: Dict[str, object]) -> Tuple[int, int]:
    removed_photo_keys = 0
    removed_iptc_keys = 0
    for key in list(photo.keys()):
        if key in PHOTO_KEYS_TO_REMOVE:
            photo.pop(key, None)
            removed_photo_keys += 1
    iptc = photo.get("iptc")
    if isinstance(iptc, dict):
        for key in list(iptc.keys()):
            if key in IPTC_KEYS_TO_REMOVE:
                iptc.pop(key, None)
                removed_iptc_keys += 1
    return removed_photo_keys, removed_iptc_keys


def _clean_manifest(data: Dict[str, object]) -> Tuple[int, int, int]:
    total_photos = 0
    removed_photo_keys = 0
    removed_iptc_keys = 0
    for peak in data.values():
        if not isinstance(peak, dict):
            continue
        photos = peak.get("photos")
        if not isinstance(photos, list):
            continue
        for photo in photos:
            if not isinstance(photo, dict):
                continue
            total_photos += 1
            removed_photo, removed_iptc = _clean_photo(photo)
            removed_photo_keys += removed_photo
            removed_iptc_keys += removed_iptc
    return total_photos, removed_photo_keys, removed_iptc_keys


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove redundant photo metadata fields from manifests.")
    parser.add_argument("input", type=Path, help="Path to the manifest JSON file to clean.")
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional output path. Defaults to overwriting the input file.",
    )
    args = parser.parse_args()

    with args.input.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if not isinstance(data, dict):
        raise SystemExit("Manifest root must be a JSON object.")

    total_photos, removed_photo_keys, removed_iptc_keys = _clean_manifest(data)

    output_path = args.output or args.input
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)

    print(
        f"Cleaned {total_photos} photos. "
        f"Removed {removed_photo_keys} top-level keys and {removed_iptc_keys} IPTC keys."
    )


if __name__ == "__main__":
    main()

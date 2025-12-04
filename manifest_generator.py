import os
import json
import argparse
from typing import List, Dict


def generate_manifest(
    api_json_path: str,
    photos_root: str,
    base_url: str,
    update_only_new: bool = False,
) -> Dict:
    """
    Generate or update the 'photos' arrays for each peak in the NH48 API JSON.

    - Expects the JSON to be a dict keyed by slug, e.g. "mount-washington".
    - Expects photos on disk at: photos/<slug>/<filename>.jpg
    - Constructs URLs as: f"{base_url}/{slug}/{filename}"

    Parameters
    ----------
    api_json_path : str
        Path to the input API JSON file (e.g. data/nh48_api.json).
    photos_root : str
        Root directory containing photo folders named by slug (e.g. "photos").
    base_url : str
        Base URL for public access to photos,
        e.g. "https://cdn.jsdelivr.net/gh/natesobol/nh48-api/photos".
    update_only_new : bool, default False
        If True, keep existing entries in 'photos' and only append new files.
        If False, fully replace 'photos' with whatever is on disk.

    Returns
    -------
    Dict
        Updated JSON data structure.
    """

    # Load existing API JSON
    with open(api_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Iterate each peak (slug is the JSON key)
    for slug, peak in data.items():
        photos_dir = os.path.join(photos_root, slug)
        found_entries: List[Dict] = []

        # If we actually have a directory for this slug, scan it
        if os.path.isdir(photos_dir):
            for entry in sorted(os.listdir(photos_dir)):
                lower = entry.lower()
                # recognize common image extensions
                if lower.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
                    filename = entry
                    # simple photoId: slug + filename stem
                    photo_id = f"{slug}__{os.path.splitext(entry)[0]}"
                    url = f"{base_url}/{slug}/{filename}"

                    # Guess orientation from filename (you can override manually later)
                    orientation = "landscape"
                    name_lower = filename.lower()
                    if "portrait" in name_lower or "vertical" in name_lower:
                        orientation = "portrait"
                    elif "square" in name_lower or "1x1" in name_lower:
                        orientation = "square"

                    found_entries.append(
                        {
                            "photoId": photo_id,
                            "filename": filename,
                            "url": url,
                            "alt": "",  # fill in later for accessibility
                            "caption": "",  # freeform caption later
                            "season": None,  # e.g. "winter", "summer"
                            "timeOfDay": None,  # e.g. "sunrise", "sunset"
                            "orientation": orientation,
                            "tags": [slug],  # can extend with ["summit", "ridge", ...]
                            "isPrimary": False,
                        }
                    )

        # Merge into JSON
        if update_only_new and "photos" in peak:
            # Keep existing, append only new photoIds
            existing_ids = {p.get("photoId") for p in peak.get("photos", [])}
            new_entries = [e for e in found_entries if e["photoId"] not in existing_ids]
            peak.setdefault("photos", []).extend(new_entries)
        else:
            # Replace or initialize the photos array
            peak["photos"] = found_entries

        # Make sure slug and peakName fields exist / are synced
        peak["slug"] = slug
        if "peakName" not in peak and "Peak Name" in peak:
            peak["peakName"] = peak["Peak Name"]

    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate or update photo manifests for NH48 peaks."
    )
    parser.add_argument(
        "--api",
        required=True,
        help="Path to the input API JSON file (e.g. data/nh48_api.json).",
    )
    parser.add_argument(
        "--photos",
        required=True,
        help="Root directory containing photos organised by slug (e.g. photos).",
    )
    parser.add_argument(
        "--base-url",
        required=True,
        help=(
            "Base URL for public access to photos "
            "(e.g. https://cdn.jsdelivr.net/gh/natesobol/nh48-api/photos)"
        ),
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to write the updated API JSON file.",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help=(
            "If set, existing 'photos' arrays are preserved and new photo files "
            "are appended."
        ),
    )
    args = parser.parse_args()

    updated = generate_manifest(
        api_json_path=args.api,
        photos_root=args.photos,
        base_url=args.base_url,
        update_only_new=args.append,
    )

    with open(args.output, "w", encoding="utf-8") as out_file:
        json.dump(updated, out_file, indent=2, ensure_ascii=False)

    print(f"Manifest updated successfully. Output written to {args.output}")


if __name__ == "__main__":
    main()

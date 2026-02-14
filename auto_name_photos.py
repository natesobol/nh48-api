#!/usr/bin/env python3
"""
auto_name_photos.py
===================

This script automates the renaming of image files inside the
White Mountains wiki folder structure.  When you drop photos into
``whitemountains-wiki/<category>/<entry>``, it will scan each entry
folder and ensure that all image files follow a consistent naming
pattern: ``<entry>__001.jpg``, ``<entry>__002.jpg``, etc.  The
three‑digit index increments for each additional image.  The script
never overwrites existing files; if there are already numbered
images, new photos are assigned the next available number.  It also
handles first runs by starting at ``001`` when no numbered files
exist.

Supported image extensions are ``.jpg``, ``.jpeg``, ``.png``,
``.webp`` and ``.gif`` (case‑insensitive).  Files that already
conform to the naming convention are left untouched.  Any other
files (including images with arbitrary names) are considered
unprocessed and will be renamed.

Usage
-----

    python3 auto_name_photos.py [--root whitemountains-wiki]

The optional ``--root`` argument points to the top‑level folder
containing your wiki structure (default: ``whitemountains-wiki``).

Examples
--------

To process the default folder:

    python3 auto_name_photos.py

To process a custom folder:

    python3 auto_name_photos.py --root /path/to/my/wiki
"""

import argparse
import os
import re
from typing import List


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def find_next_index(folder: str, prefix: str) -> int:
    """Return the next available 3‑digit index for files with a given prefix.

    Looks for files matching ``<prefix>__XYZ.<ext>`` where ``XYZ`` is a
    three‑digit integer.  Returns the smallest positive integer not
    currently used.

    Args:
        folder: Absolute path to the directory being scanned.
        prefix: Base name (usually the entry slug).

    Returns:
        Next free integer index (1‑based).
    """
    pattern = re.compile(rf"^{re.escape(prefix)}__(\d{{3}})\.[^.]+$", re.IGNORECASE)
    used: set[int] = set()
    try:
        for fname in os.listdir(folder):
            match = pattern.match(fname)
            if match:
                try:
                    used.add(int(match.group(1)))
                except ValueError:
                    continue
    except FileNotFoundError:
        return 1

    index = 1
    while index in used:
        index += 1
    return index


def rename_images_in_folder(folder: str, entry_slug: str) -> None:
    """Rename images in a single entry folder to sequential names.

    Args:
        folder: Absolute path to the entry folder.
        entry_slug: Slug used as the prefix for renamed files.
    """
    next_index = find_next_index(folder, entry_slug)
    # Sort files to ensure deterministic order (important for reproducibility)
    try:
        files = sorted(os.listdir(folder))
    except FileNotFoundError:
        return

    for fname in files:
        path = os.path.join(folder, fname)
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(fname)[1].lower()
        # Skip non‑image files
        if ext not in IMAGE_EXTENSIONS:
            continue
        # Skip files already following the naming convention
        if re.match(rf"^{re.escape(entry_slug)}__\d{{3}}\.[^.]+$", fname, re.IGNORECASE):
            continue
        # Determine a new filename without overwriting existing files
        while True:
            new_name = f"{entry_slug}__{next_index:03d}{ext}"
            new_path = os.path.join(folder, new_name)
            if not os.path.exists(new_path):
                break
            next_index += 1
        # Rename the file
        os.rename(path, new_path)
        print(f"Renamed {path} -> {new_name}")
        next_index += 1


def process_wiki_root(root: str) -> None:
    """Walk the wiki root and process each entry folder.

    Assumes the directory structure is ``root/<category>/<entry_slug>``.

    Args:
        root: Path to the wiki root directory.
    """
    if not os.path.isdir(root):
        print(f"Error: '{root}' is not a directory or does not exist.")
        return
    for category in os.listdir(root):
        category_path = os.path.join(root, category)
        if not os.path.isdir(category_path):
            continue
        for entry_slug in os.listdir(category_path):
            entry_path = os.path.join(category_path, entry_slug)
            if not os.path.isdir(entry_path):
                continue
            rename_images_in_folder(entry_path, entry_slug)


def main() -> None:
    parser = argparse.ArgumentParser(description="Assign sequential names to photos inside a wiki directory structure.")
    parser.add_argument(
        "--root",
        default="whitemountains-wiki",
        help="Root folder containing category/entry subfolders (default: whitemountains-wiki)",
    )
    args = parser.parse_args()
    process_wiki_root(args.root)


if __name__ == "__main__":
    main()
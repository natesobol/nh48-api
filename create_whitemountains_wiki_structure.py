#!/usr/bin/env python3
"""
create_whitemountains_wiki_structure.py
======================================

This script reads the White Mountains wiki landing page and
automatically generates a local directory tree that mirrors the
hierarchy of categories and entries.  Each category becomes a
top‑level folder under a configurable root (``whitemountains-wiki`` by
default), and each individual entry becomes a subfolder beneath its
category.  You can use the resulting folder structure as a staging
area before uploading images to a Cloudflare R2 bucket or any other
object storage service.

The script makes a single HTTP request to ``https://nh48.info/wiki`` and
parses all internal wiki links.  Any link that matches the pattern
``/wiki/<category>/<slug>`` is interpreted as a wiki entry belonging to
``<category>`` with identifier ``<slug>``.  Categories and slugs are
automatically deduplicated.  For example, a link like
``/wiki/peaks/mt-washington`` will result in the creation of a folder
``whitemountains-wiki/peaks/mt-washington``.

If the directory tree already exists, the script does not overwrite
anything.  You can rerun the script to refresh or extend the tree as
the wiki grows over time.

Dependencies
------------
* requests
* beautifulsoup4

Install the dependencies with:

    pip install requests beautifulsoup4

Usage
-----

    python3 create_whitemountains_wiki_structure.py \
        --url https://nh48.info/wiki \
        --output-root whitemountains-wiki

Both ``--url`` and ``--output-root`` are optional; defaults are shown
above.  On completion, the script prints each directory it created.
"""

import argparse
import os
import sys
from typing import Dict, Set

import requests
from bs4 import BeautifulSoup


def parse_wiki_entries(base_url: str) -> Dict[str, Set[str]]:
    """Fetch the wiki landing page and return a mapping of category to slugs.

    Args:
        base_url: The URL of the wiki landing page (e.g., ``https://nh48.info/wiki``).

    Returns:
        A dictionary where each key is a category (str) and each value is
        a set of slugs (set of str) belonging to that category.

    Raises:
        requests.HTTPError: If the HTTP request fails (non‑200 status).
    """
    resp = requests.get(base_url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    entries: Dict[str, Set[str]] = {}

    # Find all internal wiki links.  They should start with '/wiki/'
    # and have at least two path segments after 'wiki'.
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if not isinstance(href, str):
            continue
        # Only consider relative links within the wiki
        if not href.startswith("/wiki/"):
            continue
        # Drop query strings and fragments
        href = href.split("?")[0].split("#")[0]
        # Split into path parts
        parts = href.strip("/").split("/")
        # We expect parts = ['wiki', 'category', 'slug'] (possibly more segments)
        if len(parts) < 3:
            continue
        _, category, slug = parts[:3]
        # Skip empty slugs or categories
        if not category or not slug:
            continue
        entries.setdefault(category, set()).add(slug)

    return entries


def create_directory_structure(entries: Dict[str, Set[str]], output_root: str) -> None:
    """Create directories for categories and slugs under the output root.

    Args:
        entries: Mapping of category -> set of slugs.
        output_root: Base folder where the tree will be created.
    """
    for category, slugs in entries.items():
        for slug in sorted(slugs):
            dir_path = os.path.join(output_root, category, slug)
            # Use exist_ok=True so reruns do not raise an error
            os.makedirs(dir_path, exist_ok=True)
            print(f"Created {dir_path}")


def main(argv: list) -> int:
    parser = argparse.ArgumentParser(description="Create local folder structure mirroring the White Mountains wiki.")
    parser.add_argument(
        "--url",
        default="https://nh48.info/wiki",
        help="URL of the wiki landing page (default: https://nh48.info/wiki)",
    )
    parser.add_argument(
        "--output-root",
        default="whitemountains-wiki",
        help="Root directory where the category/slug folders will be created",
    )
    args = parser.parse_args(argv)

    try:
        entries = parse_wiki_entries(args.url)
    except requests.HTTPError as e:
        print(f"Failed to fetch {args.url}: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error parsing wiki entries: {e}", file=sys.stderr)
        return 1

    if not entries:
        print("No wiki entries found.  Check the URL or page structure.")
        return 1

    create_directory_structure(entries, args.output_root)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
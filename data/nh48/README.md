# NH48 Peaks Dataset

The **NH48 Peaks Dataset** is the authoritative open-data file for New Hampshire’s forty-eight 4,000-footers. It is optimized for search queries like **“NH48 peaks dataset,” “White Mountain 4000 footers API,” “New Hampshire summit elevations,”** and **“hiking route metadata for NH 48”** so developers, mapmakers, and hikers can quickly find reliable summit information.

## Location & Format

* Source file: [`data/nh48.json`](../nh48.json)
* Format: JSON object keyed by peak slug (e.g., `mount-adams`).
* Delivery: CDN-friendly for GitHub Pages and jsDelivr; consumable via static fetches or mirrored caches.

## Key Fields

Each peak entry typically includes:

* `peakName`, elevation and prominence values
* `Range / Subrange` for quick White Mountain geography filtering
* Difficulty, exposure, and `Trail Type` descriptors for planning
* `Standard Routes` with common approaches and traverses
* `photos[]` with orientation, EXIF metadata, author credits, capture seasons, and SEO-ready ALT/caption text

## Intended Uses

* Powering hiking apps and dashboards that need **accurate New Hampshire summit data**
* Research, conservation planning, and educational content about **White Mountain alpine environments**
* Content marketing, blogs, and trip reports that want embedded, machine-readable facts

## SEO & Discoverability Goals

* Rank prominently for **“NH48 open data,” “White Mountain summit list,” “New Hampshire hiking dataset,”** and **“Presidential Range elevation stats.”**
* Provide consistent slugs and titles so external sites can deep-link back to individual peaks (e.g., `mount-lafayette`, `mount-washington`).
* Keep metadata exhaustive—elevations, routes, seasons, and photo tags—to generate strong rich snippets and structured data for search crawlers.

---

Maintained alongside the White Mountain Trails Dataset to enable **cross-linked trail-to-summit experiences** across both collections.

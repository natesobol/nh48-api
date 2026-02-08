# 🏔️ **NH48 API — A Structured, Open Data & Media System for New Hampshire’s 4000-Footers**

The **NH48 API** is a comprehensive, self-contained dataset and media delivery system centered on the **48 four-thousand-foot peaks of the White Mountain National Forest**. It provides information soley intended :

* A structured peak database
* Trail, terrain, and route metadata
* Photo manifests with EXIF-driven metadata
* A public JSON interface for web apps
* A scalable static CDN-based distribution model
…and can also be consumed by any external application, script, or map tool.

## 🆕 **Latest Site Updates**

* **Dataset schema markup:** Added sitewide JSON-LD for data-centric pages so search engines can reliably index NH48 and WMNF datasets alongside trail downloads.
* **SEO & accessibility:** Improved landmark semantics, focus states, and skip links to keep navigation keyboard-friendly while preserving performance-focused markup.
* **Footer UX:** Sorting controls now have contextual footer options and footer links drop `.html` suffixes for cleaner URLs and canonical consistency.
* **Brand polish:** Updated logo wrapping and border styles to keep identity assets crisp on dark and light backgrounds across landing pages.
* **Navigation + footer parity:** Standardized the site-nav menu and quick-browse footer partial so every live page ships the same link set, CTA ordering, and data-route attributes for analytics and crawlability.


## ✅ Pre-release JSON-LD verification

Before release commits, run:

```bash
node scripts/verify-peak-geography-jsonld.js
```

This lightweight static check scans generated `peaks/<slug>/index.html` pages and `catalog.html` to verify Mountain/TouristAttraction typing, `containedInPlace` target IDs, USFS `landManager`, shared geography node cardinality, and catalog `TouristDestination.includesAttraction` count parity with `data/nh48.json`.

## 🔎 **SEO Implementation & Goals**

We actively structure the project so search engines can surface **New Hampshire 4000-footers**, **White Mountain National Forest trails**, and **hiking route planning data** to the right audiences. Core tactics include:

* **Semantic HTML + ARIA** in every public page, prioritizing accessible, crawlable content.
* **JSON-LD** schemas for datasets, trails, and image objects to improve **Google Dataset Search** visibility.
* **Canonical URLs, OpenGraph, and Twitter cards** on every landing page to prevent duplicate indexing while boosting share previews for hiking keywords.
* **Per-peak redirect pages** under `/peak/` and `/fr/peak/` now use `index, follow` robots directives, OpenGraph/Twitter cards, and the primary summit photo for rich share previews, keeping each mountain indexable even though the interactive UI handles the content. Human visitors are redirected to the live app, while common crawlers (Googlebot, Bingbot, GPTBot, etc.) are allowed to stay on the prerendered HTML via user-agent detection so structured data remains crawlable.
* **Media hygiene:** descriptive filenames, **ALT text**, captions, and `sr-only` SEO sections that pair keywords like *“White Mountain hiking trails”*, *“NH48 summit photos”*, and *“Appalachian alpine routes”* with internal links.
* **Performance + CDN delivery** (jsDelivr + Cloudflare R2) to keep **Largest Contentful Paint** and **Core Web Vitals** in ranking-safe ranges for map-heavy pages.

### Heading hierarchy (H1–H3)

* Ship **one H1 per document** that targets the primary intent (e.g., “NH48 API – Open Trails and Peaks Data” or “NH 4,000-Footers Information”).
* Use **H2** headings for the main content groupings (dataset overview, route planning, WMNF downloads, FAQs) so long-form pages remain scannable and keyword-rich.
* Nest **H3** headings under the relevant H2s for supporting details (e.g., per-range highlights, seasonal cautions, GPX download notes) while avoiding skipped heading levels.
* Keep headings descriptive rather than label-only (“White Mountain Trails dataset coverage” beats “Dataset”). This preserves accessibility and supports SEO snippet extraction.

### Dynamic rendering for peak pages

The prerendered `/peak/` and `/fr/peak/` pages ship both their full structured markup and a guardrail to keep humans on the interactive app:

1. The HTML itself remains a canonical, indexable document with JSON-LD, OpenGraph, Twitter cards, and canonical/alternate hreflang links.
2. A client-side redirect runs only when the visitor is **not** a recognized crawler. User-agent strings for Googlebot, Bingbot, GPTBot, ClaudeBot, DuckDuckBot, BaiduSpider, Yandex, and other well-known bots are exempted from redirection so they can read the prerendered content directly.
3. If you need to adjust crawler coverage, edit the `botSignatures` array in `templates/peak-page-template.html` before rerunning `node scripts/prerender-peaks.js` to regenerate the static files.

This pattern implements Google’s recommended “dynamic rendering” for JS-heavy experiences: humans get forwarded instantly to the live app, while search engines and AI models can crawl the static HTML.

### NH48 Info pillar page

The **NH48 info** experience at `nh-4000-footers-info.html` acts as the long-form **pillar page** for the project. It centralizes unofficial background on the New Hampshire 4,000-footers (ranges, seasonality, safety notes, and how to use the dataset) so search engines can anchor deep-linking on a single authoritative entry point. Keep the following guardrails in place when updating it:

* Preserve the page’s **unofficial** stance and the reminders to verify anything trip-critical with AMC resources; the page is a community guide, not an official list owner.
* Maintain the canonical URL `https://nh48.info/nh-4000-footers-info` and its OpenGraph/Twitter metadata so it remains the primary SEO landing surface for “NH48 info” searches.
* Align its nav/footer with the rest of the site and follow the H1–H3 guidance above so headings reinforce the pillar theme while keeping subtopics (planning tips, data access, FAQs) skimmable.

### Navigation and footer consistency

The live pages share a unified **site-nav** block (see the `<nav class="site-nav">` markup in `index.html`) and the **quick browse footer** component that lives in `css/quick-browse-footer.css` and `js/quick-browse-footer.js`. When adding or updating pages:

1. Copy the existing nav markup (including the `data-route` attributes and the NH48 Pics/Peak Bagger CTAs) so the menu order, hover states, and accessibility labels stay identical across `/`, `/catalog`, `/dataset/*`, and localized pages in `/i18n/`.
2. Include the quick browse footer links and controls so every page exposes the same CTA grid and sort buttons; reuse the existing HTML partial from `index.html` or `nh-4000-footers-info.html` to avoid drift in link text or URL canonicalization.
3. Keep the canonical/hreflang link set consistent between pages that share templates, and update both nav and footer whenever a route is renamed so crawlers and analytics retain stable paths.

This parity keeps the navigation crawlable, preserves UX muscle memory, and reduces SEO regressions from mismatched menus.

To keep the footer unified across all entry points, treat the footer as a single shared component with synchronized sources: `pages/footer.html` (HTML + baseline styles), `css/quick-browse-footer.css` (shared stylesheet), and the JS-driven variants in `js/quick-browse-footer.js` and `js/unified-footer.js`. When adjusting copy or styles, update each source in the same change so the quick browse footer renders identically whether it is injected or hardcoded, and keep the intent of the component focused on shared navigation and discovery rather than page-specific tweaks.

### Only style the live app shells (never the prerendered pages)

All UI/appearance work should be focused on the JavaScript-powered app shells that humans actually see: `/`, `/catalog`, `/trails`, `/long-trails`, `/virtual-hike`, and the `/pages/*` app surfaces (`nh48_catalog.html`, `nh48_peak.html`, `trails_app.html`, `long_trails_app.html`, `virtual_hike.html`). The prerendered redirect/index pages (including everything under `/peak/` and `/fr/peak/`) exist solely for bots and metadata; do **not** spend time restyling them.

### SEO Goals

* Be the canonical open-data result for searches that include **“NH48 peaks dataset,” “White Mountain GPX,” “New Hampshire hiking API,”** and **“WMNF trail network JSON.”**
* Drive long-tail discovery for individual summits (e.g., **“Mount Lafayette elevation prominence”**) and trail sections (e.g., **“Bondcliff traverse White Mountains”**).
* Provide enough structured metadata that map clients, research projects, and hiking blogs can embed authoritative data while preserving backlinks to this repository.

# 🌲 **Project Overview**

This repository contains the authoritative machine-readable definitions for each NH48 peak, including:

### **Peak Attributes**

* Elevation, prominence
* Range and subrange
* Difficulty, exposure, terrain character
* Trail types
* Seasonal considerations
* Access and rescue information
* Nearby features
* Per-peak structured route lists

### **Photo Metadata System**

Each peak should contain one or more photos. The photo entries include:

* Photo URL
* Orientation
* Capture date → season + time-of-day classification
* Camera maker / model
* Lens used
* Exposure settings (ISO, shutter speed, aperture)
* File size, dimensions
* File creation & modification timestamps
* User-defined caption and ALT text placeholders

Metadata is automatically extracted using a custom **Manifest Generator** script.

---

# 🗂️ **Repository Structure**

```
/
 ├── data/
 │    └── nh48.json            # Main API data
 │
 ├── photos/
 │    └── <peak-slug>/         # e.g. mount-adams/
 │         ├── adams_001.jpg
 │         ├── adams_002.jpg
 │         └── ...
 │
 ├── scripts/manifest_generator.py     # EXIF → JSON metadata builder
 ├── catalog/index.html        # Full catalog grid UI
 └── pages/nh48_peak.html      # Per-peak detail view UI
```

The system is static — **no backend required**. Distribution is handled through:

* **GitHub Pages**
* **jsDelivr CDN**
* **Cloudflare R2** for photo storage and delivery

GitHub Pages and jsDelivr serve the JSON and UI assets, while Cloudflare R2
hosts the photo originals via the S3-compatible endpoint.

For dataset-specific details and SEO notes, see:

* `data/nh48/README.md` for the NH48 peaks JSON
* `data/wmnf-trails/readme.md` for the WMNF trail network JSONs

---

# 🗺️ **White Mountain National Forest (WMNF) Trails Dataset**

In addition to the NH48 material, the project now ships a standalone open-data
package for the **White Mountain National Forest**. The WMNF dataset is the
canonical source for the **White Mountain Trails App** and lives in `data/wmnf-trails/`:

* `wmnf-main.json` — normalized WMNF trail network (core New Hampshire coverage)
* `wmnf-pliney.json` — Pliney region trails
* `wmnf-maine.json` — Maine-side WMNF trails
* `NH2000ftpeaks.json` — White Mountain 2,000-foot peak list

These JSON files are the heart of the current WMNF API and are designed to be
directly consumed by mapping tools, Google Dataset Search, or the `/trails`
application. They are maintained independently from the NH48 peaks data so
external consumers can recognize and ingest WMNF as its own dataset.

To help crawlers discover the WMNF data, the `/long-trails/` page now publishes
a `Dataset` JSON-LD block that advertises each WMNF JSON download (core, Pliney,
Maine, normalized variants, and the 2,000-foot peaks list) as canonical data
downloads. This mirrors the SEO intent noted here and surfaces the trail files
in Google Dataset Search.

---

# 📦 **The NH48 JSON Schema**

Each peak entry in `nh48.json` has the following structure:

```json
{
  "mount-madison": {
    "peakName": "Mount Madison",
    "Elevation (ft)": 5367,
    "Prominence (ft)": 466,
    "Range / Subrange": "Northern Presidentials",
    "Difficulty": "Very Difficult",
    "Exposure Level": "High",
    "Trail Type": "Out & back or traverse",
    "Standard Routes": [...],
    "photos": [
      {
        "photoId": "mount-madison__001",
        "url": "...",
        "season": "summer",
        "timeOfDay": "sunset",
        "orientation": "landscape",
        "captureDate": "2023-06-15T18:23:06",
        "cameraMaker": "Canon",
        "cameraModel": "Canon EOS 5D Mark IV",
        "lens": "35mm F1.4 DG HSM | Art 012",
        "fStop": "f/5.0",
        "shutterSpeed": "1/125 sec",
        "iso": 125,
        "author": "NATHAN SOBOL",
        "dimensions": "4746 x 3164",
        "fileSize": "2.90 MB",
        "fileCreateDate": "2025-12-06T23:34:41.9",
        "fileModifiedDate": "2025-12-06T23:34:01.6",
        "isPrimary": false,
        "tags": ["mount-madison", "landscape", "sunset", "summer"]
      }
    ]
  }
}
```

The dataset is **highly granular**, making it useful for developers, photographers, hikers, GIS tools, and mapping applications.

---

# 🔧 **Manifest Generator**

`scripts/manifest_generator.py` automates:

### **1. Photo Discovery**

Scans `/photos/<peak>/` directories for valid image files.

### **2. EXIF Extraction**

Reads:

* Orientation
* Dimensions
* Capture timestamp → derives season + time-of-day
* Camera + lens metadata
* Exposure details
* File system metadata

### **3. JSON Population**

Each image becomes a structured object under `p.photos`.

Photo URL base:

* Default: `https://17380df4e336fd7ae3e254240bba3119.r2.cloudflarestorage.com/nh48-photos`
* Override with `PHOTO_BASE_URL` env var or the `--base-url` CLI argument.

### **4. Tag Inference**

Automatically adds tags based on:

* Peak slug
* Season
* Time of day
* Orientation

### **5. Primary Image Assignment**

Sets the first photo as primary if none are manually flagged.

### **6. Safe Behavior**

If EXIF is missing, the script still infers orientation and filename-based metadata safely.

---

# 🖥️ **Front-End Applications**

Several lightweight, framework-free UI apps consume this API.

---

## 📚 **1. NH48 Catalog**

Features:

* Search with autocomplete
* Filtering (range, difficulty)
* Sorting (name, elevation, prominence)
* Fully responsive layout
* Lazy-loaded thumbnails

Uses the JSON file as its direct data source.

---

## 🏞️ **2. NH48 Peak Details Viewer**

Includes:

* Responsive photo carousel
* Circular countdown timer for slide transitions
* “Current Photo Metadata” panel updated per slide
* “General Peak Info” panel using dotted-line formatting
* Route, terrain, and conditions sections

Everything is populated dynamically from the JSON API.

URL pattern example:

```
nh48_peak.html?slug=mount-madison
```

---

# 🥾 **3. Long-Distance Trails App**

The long-distance trails experience lives in `pages/long_trails_app.html` with supporting styles in `css/long_trails_app.css`. It is a single-page, framework-free Leaflet app that loads trail data, renders segments, and drives both the map and sidebar UI in the same script block.

### **Architecture Overview**

* **Data loading:** `pages/long_trails_app.html` fetches `data/long-trails-full.json`, falling back to relative paths for local/static hosting.
* **Rendering pipeline:**
  * `renderTrailList()` builds the accordion list, section cards, and metadata in the sidebar.
  * `renderMap()` draws trail lines and start/end markers on the Leaflet map.
  * `renderSectionDetails()` updates the detail panel when a section is selected.
* **Deep-linking:** hash URLs like `#trail=appalachian-trail&section=franconia-notch-to-crawford-notch` are parsed in `applyHashSelection()` and keep the single-page app shareable without new routes.
* **Generated geometry merge:** `mergeGeneratedTrails()` pulls optional segment geometry from `data/long-trails/generated/<trail>.sections.generated.json`.
* **Post-generation refresh:** `scripts/autogen-longtrail-geometries.mjs` now runs `scripts/prepare-long-trails.js` and `scripts/prerender-long-trails.js` after geometry generation to keep aggregate data and prerendered pages in sync.

### **Trail JSON Dataset**

Source trail files live in `data/long-trails/` and are assembled into `data/long-trails-full.json`. Each trail object includes:

* `name`, `shortName`, `slug`
* `stats` (official length, endpoints, elevation ranges)
* `sections[]` with:
  * `name`, `slug`, `order`
  * `distance` or `distanceMiles`
  * `difficulty` and `jurisdictions`
  * `start` / `end` waypoint objects

Support files:

* `data/long-trails-index.json` — trail list and counts for quick lookups.
* `data/long-trails-manifest.json` — manifest of trail JSON filenames.
* `data/long-trails/generated/` — optional geometry outputs for sections.

### **SEO Implementation (Single Page)**

Because the app is a single HTML page, SEO content is injected at runtime:

* A visually hidden `<section id="seo-trails" class="sr-only">` is populated by `buildSeoTrailIndex()` with trail/section headings and deep-link anchors.
* A JSON-LD payload is generated by `buildStructuredData()` into `<script id="ld-long-trails" type="application/ld+json">` to describe trails and sections to search engines.
* Metadata (title, description, canonical URL, and OpenGraph tags) is set directly in `pages/long_trails_app.html` for the single-page canonical target.

---

# 🌐 **Public API Access**

The NH48 API is openly accessible:

```
https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json
```

Example fetch:

```js
fetch("https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json")
  .then(r => r.json())
  .then(console.log);
```

This openness encourages developers to create:

* Trail apps
* Educational tools
* Conservation resources
* API-driven hiking dashboards

---

# 🗂️ **R2 Photo Sync**

Photos under `photos/` are synced to Cloudflare R2 via GitHub Actions.

Required GitHub secrets:

* `R2_ACCESS_KEY_ID`
* `R2_SECRET_ACCESS_KEY`
* `R2_ENDPOINT` (e.g. `https://17380df4e336fd7ae3e254240bba3119.r2.cloudflarestorage.com`)
* `R2_BUCKET` (e.g. `nh48-photos`)

The sync job mirrors `photos/` to the bucket and deletes removed files. It also
applies long-lived cache headers for CDN usage.

If you need to retrace how photos are published:

* Workflow: `.github/workflows/sync-r2-photos.yml` (runs on `photos/**` changes)
* Upload command: `aws s3 sync` with the `--endpoint-url` set to the R2 endpoint
* Photo URL base for manifests: `scripts/manifest_generator.py` (`PHOTO_BASE_URL`)
* Bucket contents: `photos/<peak-slug>/` mapped to `s3://$R2_BUCKET/<peak-slug>/`

---

# 🔒 **Privacy & Metadata Considerations**

Because full EXIF metadata is exposed publicly:

* Camera + lens info
* Timestamps
* File dimensions & size
* Author info

…are accessible to anyone.

If desired, the API can be made **privacy-safe** by:

* Stripping EXIF fields
* Hosting full-resolution photos privately
* Generating resized public images
* Adding watermarks
* Serving media behind signed URLs

---

# 🚀 **Roadmap**

Planned improvements include:

* Elevation profiles for each route
* GPX/GeoJSON integration
* AI-powered auto-tagging of images
* REST API wrapper
* PWA offline app version
* Expansion to other peak lists (NH52, NE67, ADK46)

---

# 🙏 **Credits**

Created and maintained by **Nathan Sobol**.

Includes:

* Original White Mountains photography
* Complete data modeling & metadata architecture
* API and UI implementations
* Trail and peak research

---

# 📄 **License**

* **Code and data** → MIT License
* **Photography** → © Nathan Sobol — commercial reuse requires permission

---

# 🧭 Final Notes

The NH48 API aims to be the **authoritative, open, extensible reference** for New Hampshire’s 4000-footers.

Whether you're a developer, hiker, cartographer, or researcher — **welcome to the NH48 API**.

# 🏔️ **NH48 API — A Structured, Open Data & Media System for New Hampshire’s 4000-Footers**

The **NH48 API** is a comprehensive, self-contained dataset and media delivery system centered on the **48 four-thousand-foot peaks of the White Mountain National Forest**. It provides information soley intended :

* A structured peak database
* Trail, terrain, and route metadata
* Photo manifests with EXIF-driven metadata
* A public JSON interface for web apps
* A scalable static CDN-based distribution model
…and can also be consumed by any external application, script, or map tool.

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
 ├── nh48_catalog.html         # Full catalog grid UI
 └── nh48_peak.html            # Per-peak detail view UI
```

The system is static — **no backend required**. Distribution is handled through:

* **GitHub Pages**
* **jsDelivr CDN**
* **Cloudflare R2** for photo storage and delivery

GitHub Pages and jsDelivr serve the JSON and UI assets, while Cloudflare R2
hosts the photo originals via the S3-compatible endpoint.

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

# White Mountain National Forest Trails Dataset

This directory hosts the authoritative **White Mountain National Forest Trails Dataset**, the geospatial backbone for the White Mountain Trails App, map embeds, and external research integrations. Each file is optimized for crawlability so that queries like **“White Mountain National Forest trail network”**, **“New Hampshire hiking GeoJSON”**, **“WMNF trail conditions API”**, and **“Maine White Mountain trails data”** return this repository as a primary open-data source.

## Core Datasets

* `wmnf-main.json` – normalized White Mountain trail network (New Hampshire coverage)
* `wmnf-pliney.json` – Pliney region segments
* `wmnf-maine.json` – Maine-side WMNF trail inventory
* `NH2000ftpeaks.json` – White Mountain 2,000-foot peak list used alongside the trail data

## Schema Highlights

* Trail objects include names, slugs, distances, jurisdiction tags, access notes, and start/end waypoints suited for map clients.
* Geometry is delivered as GeoJSON-aligned coordinate arrays that can be styled directly in Leaflet, Mapbox GL JS, or GIS software.
* Peaks and trails share identifiers with the NH48 dataset to support **cross-linking between trailheads and 4000-footer summits**.

## SEO & Discoverability Goals

* Present clear, keyword-rich summaries that surface for **“WMNF trail network JSON,” “White Mountain hiking map data,”** and **“New England backcountry routes API.”**
* Maintain machine-readable structure so **Google Dataset Search** can index the collection with `Dataset` schema and link to canonical download URLs.
* Encourage backlinks from conservation groups, hiking blogs, and mapping tutorials by keeping documentation concise, stable, and openly licensed.

These JSON files are versioned independently from the NH48 peaks set so they can be indexed as a dedicated WMNF dataset for downstream consumers, search engines, and GIS tooling.

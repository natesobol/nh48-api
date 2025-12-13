# Code Review Notes

## Trails App (`trails_app.html`)
- The GeoJSON loader only fetches from three remote CDN URLs and does not attempt a relative path to the bundled `merged_trails.geojson`, so the app cannot function offline or when CDN access is blocked.
- Trail filtering uses `opacity: 0` to hide non‑matching layers; the invisible geometries remain interactive, so hidden trails can still intercept map clicks and popups.

## Virtual Viewer (`virtual_hike.html`)
- The Cesium viewer calls `Cesium.createWorldTerrain()` without configuring an Ion access token, which usually results in a failed terrain load and runtime console warnings.
- The virtual hike page downloads the entire `merged_trails.geojson` to extract a single trail, which adds unnecessary bandwidth and startup time for users following the virtual hike link.
